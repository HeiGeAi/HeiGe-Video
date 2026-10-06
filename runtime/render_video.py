#!/usr/bin/env python3
"""Deterministic SVG / Canvas to MP4. All paths are executor-local."""
from __future__ import annotations
import argparse
import ast
from bisect import bisect_right
from collections import Counter
from fractions import Fraction
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import shutil
import select
import signal
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
os.environ['XDG_CACHE_HOME'] = os.environ.get('VIDEO_RUNTIME_CACHE', str(HERE / '.cache'))
Path(os.environ['XDG_CACHE_HOME']).mkdir(parents=True, exist_ok=True)
from PIL import Image, ImageDraw, ImageFont, ImageStat
from raster import SvgRasterizer, validate_svg

DEFAULT_SOURCE_DIR = HERE.parent / 'examples' / 'prototypes'
STYLES = ('tech', 'whiteboard', 'ink')
PREVIEW_TIMES = {'tech': [4, 11.8, 21.8, 28.4], 'whiteboard': [3.8, 13.5, 21.5, 29.5], 'ink': [2.75, 10.5, 18, 29.25]}
CUTS = {'tech': [6.8, 13.8, 24.7], 'whiteboard': [4.6, 9.8, 15.3, 20.4, 23, 27.8], 'ink': [4.8, 9.5, 12.2, 14.5, 24]}
CANVAS_PROTOCOL = 'heige-canvas-v1'
LEGACY_SOURCE_DURATION = 30.0  # Undeclared legacy fixtures retain their original timeline.


def positive_duration(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
        raise ValueError('Authored source duration must be a finite positive number')
    return float(value)


def validate_cuts(values, duration):
    if not isinstance(values, (list, tuple)):
        raise ValueError('CUTS/cuts must be an array of source-time boundaries')
    if any(isinstance(t, bool) or not isinstance(t, (int, float)) or not math.isfinite(t) or not 0 < t < duration for t in values):
        raise ValueError('Cut boundaries must be finite and strictly inside the source duration')
    if list(values) != sorted(set(values)):
        raise ValueError('Cut boundaries must be unique and in ascending order')
    return [float(t) for t in values]

def sha(data): return hashlib.sha256(data).hexdigest()
def write_json(path, data): path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def run(args, **kwargs): return subprocess.run(args, check=True, capture_output=True, text=True, **kwargs)


def font_info(family):
    result = run(['fc-match', family, '--format=%{family}\n%{file}\n%{index}\n']).stdout.splitlines()
    actual, path, index = result[:3]
    if family.casefold() not in actual.casefold():
        raise RuntimeError(f'Requested font {family!r} resolved to {actual!r}; install the requested font or use --font-family')
    from fontTools.ttLib import TTFont
    font = TTFont(path, fontNumber=int(index), lazy=True)
    cmap = set((font.getBestCmap() or {}).keys())
    font.close()
    return {'requested_family': family, 'resolved_family': actual, 'path': path, 'face_index': int(index), 'sha256': sha(Path(path).read_bytes()), 'embedded_in_mp4': False, 'provenance_scope': 'selected regular face only; resolved bold/italic/fallback faces are not traced'}, cmap


def source_audit(path):
    """Inspection aid, not a sandbox. Only execute sources you trust."""
    source = path.read_text(encoding='utf-8')
    info = {'path': str(path.resolve()), 'sha256': sha(source.encode()), 'trusted_code_required': True}
    if path.suffix == '.py':
        tree = ast.parse(source)
        info['imports'] = sorted({n.module or '' for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)} | {a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names})
        info['render_entry_found'] = any(isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == 'render' for n in tree.body)
        info['dynamic_execution_calls'] = sorted({n.func.id for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in {'eval', 'exec', 'compile', '__import__'}})
    return info


class SvgSource:
    def __init__(self, path, family, width, height):
        self.path = path.resolve()
        self.raster = None
        # Dataclasses and runtime annotation lookup need a registered module.
        # Keep it registered while this source is live; avoid collisions when
        # multiple independently loaded instances use the same source path.
        base_name = 'video_source_' + sha(str(self.path).encode())[:12]
        self.module_name = base_name
        suffix = 1
        while self.module_name in sys.modules:
            self.module_name = f'{base_name}_{suffix}'
            suffix += 1
        spec = importlib.util.spec_from_file_location(self.module_name, self.path)
        if spec is None or spec.loader is None:
            raise ValueError(f'Cannot load Python source: {self.path}')
        self.module = importlib.util.module_from_spec(spec)
        sys.modules[self.module_name] = self.module
        # Disable pycache writes: authored source stays byte-for-byte untouched.
        previous = sys.dont_write_bytecode
        try:
            sys.dont_write_bytecode = True
            spec.loader.exec_module(self.module)
            if not callable(getattr(self.module, 'render', None)):
                raise ValueError('Python source must define render(time_seconds) -> complete SVG string')
            self.module.FONT = family
            key = next((name for name in ('DURATION', 'duration', 'SECONDS') if hasattr(self.module, name)), None)
            self.duration = positive_duration(getattr(self.module, key) if key else LEGACY_SOURCE_DURATION)
            self.metadata = {'duration': self.duration, 'duration_source': key or 'legacy_default_30s'}
            self.cuts = validate_cuts(getattr(self.module, 'CUTS', getattr(self.module, 'cuts', [])), self.duration)
            self.metadata['cuts'] = self.cuts
            self.raster = SvgRasterizer(width, height)
            self.chars = set()
        except BaseException:
            self.close()
            raise
        finally:
            sys.dont_write_bytecode = previous
    def frame(self, t):
        svg = self.module.render(float(t))
        self.chars.update(validate_svg(svg))
        return self.raster.render(svg), svg
    def close(self):
        if self.raster is not None:
            self.raster.close()
            self.raster = None
        if sys.modules.get(self.module_name) is self.module:
            del sys.modules[self.module_name]


class CanvasSource:
    """Trusted Canvas module with a bounded JSON handshake and bounded raw frames.

    DURATION/duration/SECONDS is required for new films. For compatibility only,
    modules without any duration export use 30 seconds; metadata labels this
    legacy default. No source code is rewritten. POSIX pipes/process groups are
    used so a stuck import, ready(), render(), or descendant cannot hang cleanup.
    """
    def __init__(self, path, family, width, height, font, *, startup_timeout=15, frame_timeout=30):
        self.path, self.chars = path, set()
        self.frame_bytes = width * height * 4
        self.startup_timeout, self.frame_timeout = float(startup_timeout), float(frame_timeout)
        if not all(math.isfinite(t) and t > 0 for t in (self.startup_timeout, self.frame_timeout)):
            raise ValueError('Canvas timeouts must be finite and positive')
        self.process = None
        self._stderr = tempfile.TemporaryFile()
        self._buffer = bytearray()
        # External CommonJS scenes need the same package installation as the
        # worker. Scope this fallback to the child; retain caller search paths.
        # Native ESM imports still use Node's normal source-local resolution.
        worker_env = os.environ.copy()
        module_paths = [str(HERE.parent / "node_modules")]
        if worker_env.get("NODE_PATH"):
            module_paths.append(worker_env["NODE_PATH"])
        worker_env["NODE_PATH"] = os.pathsep.join(module_paths)
        try:
            self.process = subprocess.Popen(
                ['node', '--expose-gc', str(HERE / 'canvas_worker.cjs'), str(path.resolve()), str(width), str(height), font['path'], family],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self._stderr,
                bufsize=0, start_new_session=True, env=worker_env)
            os.set_blocking(self.process.stdin.fileno(), False)
            os.set_blocking(self.process.stdout.fileno(), False)
            deadline = time.monotonic() + self.startup_timeout
            header = bytearray()
            # One bounded line, followed by raw RGBA responses. Source logging is
            # redirected to stderr by the worker before it imports authored code.
            while not header.endswith(b'\n'):
                header.extend(self._read_exact(1, deadline, 'metadata handshake'))
                if len(header) > 65536:
                    raise RuntimeError('Canvas metadata handshake exceeded 64 KiB')
            try:
                metadata = json.loads(header)
            except (ValueError, UnicodeDecodeError) as error:
                raise RuntimeError('Canvas metadata handshake was not valid JSON') from error
            if not isinstance(metadata, dict) or metadata.get('protocol') != CANVAS_PROTOCOL:
                raise RuntimeError('Canvas metadata handshake has an unsupported protocol')
            self.duration = positive_duration(metadata.get('duration'))
            self.cuts = validate_cuts(metadata.get('cuts', []), self.duration)
            strings = metadata.get('text_strings', [])
            if not isinstance(strings, list) or any(not isinstance(s, str) for s in strings):
                raise RuntimeError('Canvas declared text strings must be an array of strings')
            self.chars.update(''.join(strings))
            self.metadata = metadata
        except BaseException:
            self.close()
            raise

    def _error(self, message):
        self._stderr.flush()
        self._stderr.seek(0, 2)
        self._stderr.seek(max(0, self._stderr.tell() - 8192))
        detail = self._stderr.read().decode('utf-8', errors='replace').strip()
        return RuntimeError(message + (f'; worker stderr: {detail}' if detail else ''))

    def _read_exact(self, size, deadline, operation):
        while len(self._buffer) < size:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise self._error(f'Canvas {operation} timed out')
            readable, _, _ = select.select([self.process.stdout], [], [], remaining)
            if not readable:
                raise self._error(f'Canvas {operation} timed out')
            chunk = os.read(self.process.stdout.fileno(), min(262144, max(size - len(self._buffer), 4096)))
            if not chunk:
                raise self._error(f'Canvas worker ended during {operation} ({len(self._buffer)} of {size} bytes)')
            self._buffer.extend(chunk)
        result = bytes(self._buffer[:size])
        del self._buffer[:size]
        return result

    def frame_samples(self, times):
        if self.process is None:
            raise RuntimeError('Canvas source is closed')
        if not 1 <= len(times) <= 16 or any(not math.isfinite(t) or t < 0 or t > self.duration for t in times):
            raise ValueError('Canvas sample times must be 1–16 finite timestamps within the source duration')
        request = (json.dumps({'times': [float(t) for t in times], 'seed': 20261005}) + '\n').encode()
        deadline = time.monotonic() + self.frame_timeout
        try:
            while request:
                remaining = deadline - time.monotonic()
                if remaining <= 0 or not select.select([], [self.process.stdin], [], remaining)[1]:
                    raise self._error('Canvas frame request timed out')
                written = os.write(self.process.stdin.fileno(), request)
                request = request[written:]
            return self._read_exact(self.frame_bytes, deadline, 'frame rendering'), None
        except RuntimeError:
            self.close()
            raise
        except OSError as cause:
            error = self._error('Canvas frame protocol failed')
            self.close()
            raise error from cause

    def frame(self, t):
        return self.frame_samples([float(t)])

    def close(self):
        process = self.process
        if process is not None:
            if process.stdin and not process.stdin.closed:
                process.stdin.close()
            # Terminate the isolated process group, including stuck descendants.
            # Never rely on EOF alone: authored modules can keep timers alive.
            try: os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError: pass
            try: process.wait(timeout=1)
            except subprocess.TimeoutExpired:
                try: os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError: pass
                process.wait(timeout=1)
            # The main worker may have exited before a descendant ignored TERM.
            try: os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            if process.stdout and not process.stdout.closed:
                process.stdout.close()
            self.process = None
        if not self._stderr.closed:
            self._stderr.close()


def create_source(args, font):
    source = args.source or args.source_dir / f'{args.style}.py'
    if not source.is_file(): raise FileNotFoundError(source)
    audit = source_audit(source)
    cls = CanvasSource if args.backend == 'canvas' else SvgSource
    extra = [font] if cls is CanvasSource else []
    kwargs = {'startup_timeout': args.canvas_startup_timeout, 'frame_timeout': args.canvas_frame_timeout} if cls is CanvasSource else {}
    return cls(source, args.font_family, args.width, args.height, *extra, **kwargs), audit


def arguments():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('command', choices=('doctor', 'audit', 'frame', 'render'))
    p.add_argument('--style', choices=STYLES, default='tech')
    p.add_argument('--label', help='Display label only; never used to choose source paths or filenames')
    p.add_argument('--source-dir', type=Path, default=DEFAULT_SOURCE_DIR)
    p.add_argument('--source', type=Path, help='Custom trusted Python render(t) module or Canvas JS module')
    p.add_argument('--backend', choices=('svg', 'canvas'), default='svg')
    p.add_argument('--out', type=Path, help='New output directory; refuses existing nonempty directories')
    p.add_argument('--width', type=int, default=1920)
    p.add_argument('--height', type=int, default=1080)
    p.add_argument('--fps', default='24', help='Integer or rational, e.g. 24 or 30000/1001')
    p.add_argument('--duration', type=float, help='Output seconds; default is remaining source duration')
    p.add_argument('--start', type=float, default=0)
    p.add_argument('--fit-time', action='store_true', help='Fit the remaining full source timeline into --duration; otherwise trim')
    p.add_argument('--time', type=float, default=0, help='Absolute source timestamp for frame command')
    p.add_argument('--font-family', default='Noto Sans CJK SC')
    p.add_argument('--crf', type=int, default=18)
    p.add_argument('--preset', choices=('ultrafast','superfast','veryfast','faster','fast','medium','slow'), default='medium')
    p.add_argument('--cuts', help='Comma-separated hard-cut source times; defaults to source CUTS/cuts or built-in preset boundaries')
    p.add_argument('--canvas-startup-timeout', type=float, default=15, help='Maximum Canvas import/ready/metadata seconds')
    p.add_argument('--canvas-frame-timeout', type=float, default=30, help='Maximum seconds per Canvas output frame, including shutter samples')
    p.add_argument('--shutter-samples', type=int, default=1, help='Canvas only: 1 disables temporal sampling; 2–16 enable cut-clamped global motion blur')
    p.add_argument('--shutter-angle', type=float, default=180, help='Shutter width in degrees of one output frame, 0–360; only used with multiple samples')
    p.add_argument('--no-qa-images', action='store_true', help='Skip contact sheets and cut strips; frame metrics/ffprobe still run')
    return p.parse_args()


def display_label(args):
    supplied = getattr(args, 'label', None)
    label = supplied.strip() if supplied is not None else (args.source.stem if args.source else args.style)
    if not label or len(label) > 120 or any(ord(c) < 32 or ord(c) == 127 for c in label):
        raise ValueError('label must contain 1–120 printable characters without control characters')
    return label


def validate_args(args):
    if not (2 <= args.width <= 7680 and 2 <= args.height <= 7680): raise ValueError('Dimensions must be between 2 and 7680')
    if args.command == 'render' and (args.width % 2 or args.height % 2): raise ValueError('MP4 yuv420p dimensions must be even')
    if not math.isfinite(args.start) or args.start < 0 or not math.isfinite(args.time) or args.time < 0: raise ValueError('Times must be finite and nonnegative')
    fps = Fraction(args.fps)
    if not 0 < fps <= 120: raise ValueError('fps must be > 0 and <= 120')
    if args.duration is not None and (not math.isfinite(args.duration) or args.duration <= 0): raise ValueError('duration must be finite and positive')
    if not 0 <= args.crf <= 51: raise ValueError('crf must be between 0 and 51')
    samples = getattr(args, 'shutter_samples', 1)
    angle = getattr(args, 'shutter_angle', 180)
    if not 1 <= samples <= 16 or not math.isfinite(angle) or not 0 <= angle <= 360:
        raise ValueError('shutter samples must be 1–16 and angle must be finite in 0–360 degrees')
    for key in ('canvas_startup_timeout', 'canvas_frame_timeout'):
        value = getattr(args, key, 1)
        if not math.isfinite(value) or value <= 0:
            raise ValueError('Canvas timeouts must be finite and positive')
    if samples > 1 and getattr(args, 'backend', 'canvas') != 'canvas':
        raise ValueError('Temporal shutter sampling is currently supported only by the Canvas backend')
    return fps


def new_output(path):
    if path is None: raise ValueError('--out is required for frame/render')
    if path.exists() and any(path.iterdir()): raise FileExistsError(f'Output directory is nonempty: {path}')
    path.mkdir(parents=True, exist_ok=True)
    return path.resolve()


def dependency_versions():
    import ctypes
    import ctypes.util
    from importlib.metadata import version
    versions = {'python': sys.version.split()[0], 'Pillow': version('Pillow'), 'fontTools': version('fonttools')}
    if shutil.which('ffmpeg'):
        versions['ffmpeg'] = run(['ffmpeg','-version']).stdout.splitlines()[0]
    try:
        lib = ctypes.CDLL(ctypes.util.find_library('rsvg-2'))
        versions['librsvg'] = '.'.join(str(ctypes.c_uint.in_dll(lib, 'rsvg_'+k+'_version').value) for k in ['major','minor','micro'])
        cairo = ctypes.CDLL(ctypes.util.find_library('cairo'))
        cairo.cairo_version_string.restype = ctypes.c_char_p
        versions['cairo'] = cairo.cairo_version_string().decode()
    except (OSError, ValueError, AttributeError, TypeError):
        versions['raster_version_lookup'] = 'unavailable; doctor checks library availability separately'
    if shutil.which('node'):
        versions['node'] = run(['node','--version']).stdout.strip()
        canvas = subprocess.run(['node','-e',"console.log(require('@napi-rs/canvas/package.json').version)"],capture_output=True,text=True)
        versions['@napi-rs/canvas'] = canvas.stdout.strip() if canvas.returncode == 0 else None
    return versions


def doctor(family='Noto Sans CJK SC'):
    status = {'dependencies': dependency_versions(), 'tools': {}, 'libraries': {}, 'optional_canvas': False}
    for tool in ['ffmpeg', 'ffprobe', 'fc-match', 'node']:
        status['tools'][tool] = shutil.which(tool)
    from raster import ctypes_library
    for lib in ['rsvg-2','cairo','gobject-2.0','glib-2.0']:
        try: status['libraries'][lib] = ctypes_library(lib)
        except RuntimeError: status['libraries'][lib] = None
    if shutil.which('node'):
        result = subprocess.run(['node','-e',"console.log(require('@napi-rs/canvas/package.json').version)"],capture_output=True,text=True)
        status['optional_canvas'] = result.stdout.strip() if result.returncode == 0 else False
    if shutil.which('ffmpeg'): status['ffmpeg_version'] = run(['ffmpeg','-version']).stdout.splitlines()[0]
    status['font'], _ = font_info(family)
    status['svg_ready'] = all(status['libraries'].values()) and all(status['tools'][x] for x in ['ffmpeg','ffprobe','fc-match'])
    print(json.dumps(status, ensure_ascii=False, indent=2))


def contact_sheet(items, out, width=480, columns=4, title='', font=None):
    if not items: return
    tile_h = round(width * items[0][1].height / items[0][1].width)
    gap, caption = 12, 28
    rows = math.ceil(len(items) / columns)
    sheet = Image.new('RGB', (columns*(width+gap)+gap, rows*(tile_h+caption+gap)+gap+32), '#ddd9cf')
    draw = ImageDraw.Draw(sheet)
    draw.text((gap,gap), title, fill='#1b1d1b', font=font)
    for i,(label,img) in enumerate(items):
        x, y = gap + (i%columns)*(width+gap), 40 + (i//columns)*(tile_h+caption+gap)
        sheet.paste(img.convert('RGB').resize((width,tile_h),Image.Resampling.LANCZOS), (x,y))
        draw.text((x,y+tile_h+5),label,fill='#1b1d1b',font=font)
    sheet.save(out)


def probe(path):
    return json.loads(run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(path)]).stdout)


def encoded_images(path, indices, directory):
    directory.mkdir()
    expression = '+'.join(f'eq(n\\,{i})' for i in sorted(indices))
    run(['ffmpeg','-v','error','-i',str(path),'-vf',f'select={expression}','-fps_mode','vfr',str(directory/'frame-%04d.png')],timeout=180)
    images = sorted(directory.glob('*.png'))
    if len(images) != len(indices): raise RuntimeError('Encoded review frame count mismatch')
    return {i: Image.open(file).copy() for i,file in zip(sorted(indices),images)}


def source_cuts(args, source):
    """Custom modules never inherit unrelated preset cut times by accident."""
    if args.cuts is not None:
        values = [float(x) for x in args.cuts.split(',') if x.strip()]
    elif source.cuts:
        values = source.cuts
    else:
        values = [] if args.source else CUTS.get(args.style, [])
    return validate_cuts(values, source.duration)


def shutter_times(t, fps, duration, cuts=(), samples=1, angle=180, time_scale=1):
    """Midpoint box shutter, constrained to the half-open shot containing t.

    Cuts are hard cuts, not overlapping dissolves. Left-edge samples cannot
    reach the next shot; a center exactly on a cut belongs to the new shot.
    Duplicate clamped times intentionally preserve all equal sample weights.
    """
    duration = positive_duration(duration)
    validate_cuts(cuts, duration)
    if isinstance(samples, bool) or not isinstance(samples, int) or not 1 <= samples <= 16:
        raise ValueError('Shutter samples must be an integer in 1–16')
    if not math.isfinite(float(fps)) or fps <= 0 or not math.isfinite(time_scale) or time_scale <= 0:
        raise ValueError('Shutter fps and source time scale must be finite and positive')
    if not math.isfinite(angle) or not 0 <= angle <= 360:
        raise ValueError('Shutter angle must be finite and in 0–360 degrees')
    if not math.isfinite(t) or not 0 <= t <= duration:
        raise ValueError('Frame time must be inside the authored source duration')
    if samples == 1 or angle == 0:
        return [float(t)]
    bounds = [0.0, *cuts, float(duration)]
    position = min(bisect_right(bounds, t) - 1, len(bounds) - 2)
    low, high = bounds[position:position + 2]
    high = math.nextafter(high, -math.inf)
    span = float(time_scale) / float(fps) * angle / 360
    return [max(low, min(high, t + ((i + 0.5) / samples - 0.5) * span)) for i in range(samples)]


def sampled_frame(source, t, fps, args, cuts, time_scale=1):
    times = shutter_times(t, fps, source.duration, cuts, args.shutter_samples, args.shutter_angle, time_scale)
    if len(times) == 1:
        raw, svg = source.frame(times[0])
    else:
        raw, svg = source.frame_samples(times)
    return raw, svg, times


def render(args, fps, source, audit, font, cmap, out):
    cuts = source_cuts(args, source)
    duration = args.duration if args.duration is not None else source.duration - args.start
    if duration <= 0 or args.start >= source.duration: raise ValueError('Start must be before source duration')
    if not args.fit_time and args.start + duration > source.duration + 1e-9:
        raise ValueError('Requested interval exceeds source duration; shorten it or use --fit-time')
    time_scale = (source.duration - args.start) / duration if args.fit_time else 1.0
    count = math.ceil(Fraction(str(duration)) * fps)
    actual_duration = float(count/fps)
    if count > 120*60*60: raise ValueError('Requested render exceeds one hour at 120 fps')
    label = display_label(args)
    output_stem = 'video' if args.source else args.style
    output = out/f'{output_stem}.mp4'
    part = out/f'{output_stem}.partial.mp4'
    cmd = ['ffmpeg','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgba','-video_size',f'{args.width}x{args.height}','-framerate',str(fps),'-i','pipe:0','-an','-c:v','libx264','-preset',args.preset,'-crf',str(args.crf),'-pix_fmt','yuv420p','-threads','1','-map_metadata','-1','-fflags','+bitexact','-flags:v','+bitexact','-movflags','+faststart','-n',str(part)]
    write_json(out/'render-request.json', {'status':'initial_request', 'source':audit, 'command':cmd, 'frames':count, 'source_duration':source.duration, 'source_metadata':source.metadata})
    metrics, previous, begin = [], None, time.monotonic()
    with (out/'ffmpeg.log').open('w') as log:
        encoder = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=log)
        try:
            for i in range(count):
                t = min(source.duration, args.start + float(i/fps) * time_scale)
                raw, svg, sample_times = sampled_frame(source, t, fps, args, cuts, time_scale)
                encoder.stdin.write(raw)
                image = Image.frombytes('RGBA',(args.width,args.height),raw)
                small = image.convert('RGB').resize((64,36),Image.Resampling.BOX)
                pixels = small.tobytes()
                stat = ImageStat.Stat(small.convert('L'))
                delta = sum(abs(a-b) for a,b in zip(pixels,previous))/len(pixels) if previous is not None else 0.0
                metrics.append({'frame':i,'source_time':round(t,9),'raw_sha256':sha(raw),'svg_sha256':sha(svg.encode()) if svg else None,'mean_luma':round(stat.mean[0],4),'luma_stddev':round(stat.stddev[0],4),'mean_delta_64x36':round(delta,4)})
                if args.shutter_samples > 1: metrics[-1]['shutter_source_times'] = sample_times
                previous = pixels
                if i == 0 or (i+1) % max(1,round(float(fps)*5)) == 0:
                    print(json.dumps({'rendered':i+1,'total':count,'elapsed_seconds':round(time.monotonic()-begin,1)}),flush=True)
            encoder.stdin.close()
            code=encoder.wait(timeout=180)
            if code: raise RuntimeError(f'ffmpeg failed ({code}); inspect {out / "ffmpeg.log"}')
        except BaseException:
            if encoder.poll() is None: encoder.terminate()
            encoder.wait(timeout=15)
            raise
    missing=sorted(c for c in source.chars if not c.isspace() and ord(c) not in cmap)
    if missing: raise RuntimeError('Missing selected-font glyphs: '+''.join(missing))
    result=probe(part)
    streams=result['streams']; video=[s for s in streams if s['codec_type']=='video']; audio=[s for s in streams if s['codec_type']=='audio']
    stream=video[0]
    checks={'one_video_stream':len(video)==1,'dimensions':(stream['width'],stream['height'])==(args.width,args.height),'codec_h264':stream['codec_name']=='h264','pixel_format_yuv420p':stream['pix_fmt']=='yuv420p','frame_count':int(stream['nb_read_frames'])==count,'frame_rate':Fraction(stream['avg_frame_rate'])==fps,'duration':abs(float(stream['duration'])-actual_duration)<max(.001,1/float(fps)),'silent_output':not audio}
    if args.backend == 'svg': checks['font_coverage'] = not missing
    elif source.metadata.get('declared_text_source'): checks['declared_text_font_coverage'] = not missing
    if not all(checks.values()):
        write_json(out/'ffprobe.json',result); raise RuntimeError(f'Encoded checks failed: {checks}')
    part.rename(output)
    write_json(out/'ffprobe.json',result)
    cut_groups=[]
    for t in cuts:
        index=math.ceil((t-args.start)/time_scale*float(fps)-1e-9)
        if 0 <= index < count:
            cut_groups.append((t,index,[i for i in range(index-2,index+3) if 0 <= i < count]))
    samples={0,count-1}|{min(count-1,round(i*(count-1)/11)) for i in range(12)}
    for t in ([] if args.source else PREVIEW_TIMES.get(args.style, [])):
        index=round((t-args.start)/time_scale*float(fps))
        if 0<=index<count: samples.add(index)
    review_indices=samples|{i for _,_,group in cut_groups for i in group}
    if not args.no_qa_images:
        sheet_font=ImageFont.truetype(font['path'],16,index=font['face_index'])
        decoded=encoded_images(output,review_indices,out/'review-frames')
        contact_sheet([(f'frame {i} | {metrics[i]["source_time"]:.3f}s source',decoded[i]) for i in sorted(samples)],out/'contact-sheet.jpg',title=f'{label} | decoded MP4 samples | mechanical evidence, not aesthetic approval',font=sheet_font)
        if cut_groups:
            contact_sheet([(f'boundary {t:g}s | frame {i} ({i-center:+d})',decoded[i]) for t,center,group in cut_groups for i in group],out/'cut-strip.jpg',columns=5,title=f'{label} | cut -2/-1/0/+1/+2 decoded frames; review pending',font=sheet_font)
    write_json(out/'frame-metrics.json',metrics)
    warnings=[]
    flat=[m['frame'] for m in metrics if m['luma_stddev']<1]
    if flat: warnings.append({'kind':'nearly_flat_frames','frames':flat,'interpretation':'May be an intentional opening/hold. Requires visual review.'})
    largest=sorted(metrics[1:],key=lambda m:m['mean_delta_64x36'],reverse=True)[:10]
    identical=sum(a['raw_sha256']==b['raw_sha256'] for a,b in zip(metrics,metrics[1:]))
    report={'status':'encoded_and_mechanically_verified','video':output.name,'style':label,'label':label,'source_preset':None if args.source else args.style,'review_preset':args.style,'backend':args.backend,'source':audit,'font':font,'glyphs_checked':len(source.chars),'missing_glyphs':missing,'dimensions':[args.width,args.height],'fps':str(fps),'requested_duration':duration,'encoded_duration':actual_duration,'frame_count':count,'source_start':args.start,'source_duration':source.duration,'source_metadata':source.metadata,'cuts':cuts,'temporal_shutter':{'samples':args.shutter_samples,'angle':args.shutter_angle,'enabled':args.shutter_samples>1 and args.shutter_angle>0,'compositing':'equal-weight box average in linear-light sRGB using 16-bit lookup tables; opaque alpha','cut_policy':'each sample clamped to the half-open hard-cut interval containing the frame center'},'font_coverage_scope':'all SVG text/tspan codepoints against selected font face' if args.backend=='svg' else 'author-declared TEXT_STRINGS/textStrings only; completeness, shaping and rendered text still require visual review','source_time_scale':time_scale,'source_dimensions_policy':('SVG preserveAspectRatio contain' if args.backend=='svg' else 'Canvas receives the requested dimensions; authored geometry controls layout')+'; changing aspect does not itself author a new composition','checks':checks,'render_seconds':round(time.monotonic()-begin,2),'mp4_sha256':sha(output.read_bytes()),'consecutive_identical_frame_pairs':identical,'largest_frame_deltas':largest,'warnings':warnings,'audio':'none; no voice, music or sound effects produced','visual_review':'pending human/agent pixel and temporal review; passing checks is not aesthetic approval','determinism_scope':'source-time functions and frame hashes; same installed libraries/font/platform required for matching pixels','dependencies':dependency_versions(),'qa_images_generated':not args.no_qa_images,'sampled_frame_review':{'status':'pending' if not args.no_qa_images else 'not_generated','video_sha256':sha(output.read_bytes()),'frame_indices':sorted(review_indices) if not args.no_qa_images else [],'full_speed_playback':'not_performed','aesthetic_approval':False}}
    write_json(out/'manifest.json',report)
    print(json.dumps({'video':str(output),'manifest':str(out/'manifest.json'),'checks':checks,'seconds':report['render_seconds']},ensure_ascii=False),flush=True)


def main():
    args=arguments(); fps=validate_args(args); label=display_label(args)
    if args.command=='doctor': doctor(args.font_family); return
    path=args.source or args.source_dir/f'{args.style}.py'
    if args.command=='audit': print(json.dumps(source_audit(path),ensure_ascii=False,indent=2)); return
    out=new_output(args.out)
    font,cmap=font_info(args.font_family)
    source,audit=create_source(args,font)
    try:
        if args.command=='frame':
            raw,svg,sample_times=sampled_frame(source,args.time,fps,args,source_cuts(args,source))
            Image.frombytes('RGBA',(args.width,args.height),raw).convert('RGB').save(out/'frame.png')
            if svg: (out/'frame.svg').write_text(svg,encoding='utf-8')
            missing=sorted(c for c in source.chars if not c.isspace() and ord(c) not in cmap)
            write_json(out/'frame.json',{'source':audit,'label':label,'source_preset':None if args.source else args.style,'time':args.time,'dimensions':[args.width,args.height],'font':font,'raw_sha256':sha(raw),'missing_glyphs':missing,'source_duration':source.duration,'source_metadata':source.metadata,'shutter_source_times':sample_times})
            if missing: raise RuntimeError('Missing glyphs: '+''.join(missing))
            print(out/'frame.png')
        else: render(args,fps,source,audit,font,cmap,out)
    finally: source.close()

if __name__=='__main__':
    try: main()
    except (ValueError,RuntimeError,FileNotFoundError,FileExistsError,subprocess.CalledProcessError) as error:
        print(f'ERROR: {error}',file=sys.stderr); sys.exit(2)

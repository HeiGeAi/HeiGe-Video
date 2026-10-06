#!/usr/bin/env python3
"""Prepare explicit, decoded-MP4 evidence; never grant visual approval.

Cuts are source seconds. Each cut selects the first frame on/after the cut,
plus offsets -2, -1, 0, +1, +2. Actions are half-open source intervals [a,b),
sampled at every frame unless --action-stride explicitly requests otherwise.
No uniform overview or inferred action intervals are added. Without a manifest,
source seconds equal output seconds. Requires installed FFmpeg, FFprobe, Pillow.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageDraw, ImageStat


def rational(value, name):
    """Keep decimal/rational inputs exact and reject NaN/Infinity and booleans."""
    try:
        if isinstance(value, bool):
            raise ValueError
        result = Fraction(str(value))
        if not math.isfinite(float(result)):
            raise ValueError
        return result
    except (ValueError, TypeError, ZeroDivisionError, OverflowError) as exc:
        raise ValueError(f'{name} must be a finite number') from exc


def positive_int(value):
    try:
        result = int(value)
        if isinstance(value, bool) or not str(value).lstrip('+').isdigit() or result <= 0:
            raise ValueError
        return result
    except (ValueError, TypeError, OverflowError) as exc:
        raise ValueError('action stride must be a positive integer') from exc


def parse_requests(cuts, actions):
    boundaries, intervals = [], []
    if cuts is not None:
        for value in cuts.split(','):
            time = rational(value.strip(), 'cut time')
            if time < 0:
                raise ValueError('cut times must be nonnegative')
            boundaries.append(time)
    if actions is not None:
        for value in actions.split(','):
            parts = value.split(':')
            if len(parts) != 2:
                raise ValueError('actions must be comma-separated start:end intervals')
            start, end = (rational(part.strip(), 'action time') for part in parts)
            if start < 0 or end <= start:
                raise ValueError('actions require 0 <= start < end')
            intervals.append((start, end))
    if not boundaries and not intervals:
        raise ValueError('Supply --cuts and/or --actions; no implicit coarse sampling is performed')
    return boundaries, intervals


def run(command):
    return subprocess.run(command, check=True, capture_output=True, text=True, timeout=180)


def file_sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf-8')


def check_output(path):
    if path.exists():
        if not path.is_dir() or any(path.iterdir()):
            raise FileExistsError(f'Output must be a new or empty directory: {path}')


def probe_video(path):
    """Inspect actual presentation timestamps, not just nominal FPS metadata."""
    result = json.loads(run([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_streams', '-show_frames', '-show_entries',
        'stream=index,codec_name,width,height,avg_frame_rate,time_base:frame=best_effort_timestamp',
        '-of', 'json', str(path),
    ]).stdout)
    streams, frames = result.get('streams', []), result.get('frames', [])
    if len(streams) != 1 or not frames:
        raise ValueError('Input must contain a decodable video stream with frames')
    stream = streams[0]
    fps = rational(stream.get('avg_frame_rate'), 'encoded fps')
    time_base = rational(stream.get('time_base'), 'encoded time base')
    if fps <= 0 or time_base <= 0:
        raise ValueError('Encoded fps and time base must be positive')
    try:
        timestamps = [int(frame['best_effort_timestamp']) * time_base for frame in frames]
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError('Every decoded frame must have a presentation timestamp') from exc
    origin = timestamps[0]
    for index, timestamp in enumerate(timestamps):
        if index and timestamp <= timestamps[index - 1]:
            raise ValueError('Video frame timestamps must be strictly increasing')
        if abs(timestamp - origin - Fraction(index, 1) / fps) > time_base:
            raise ValueError('Variable-frame-rate video is unsupported; cannot map source times with a single fps')
    return result, fps, timestamps


@dataclass(frozen=True)
class Timeline:
    fps: Fraction
    source_start: Fraction
    source_time_scale: Fraction
    count: int

    @property
    def source_end(self):
        return self.source_time(self.count)

    def source_time(self, index):
        return self.source_start + Fraction(index, 1) / self.fps * self.source_time_scale

    def first_frame(self, time):
        return math.ceil((time - self.source_start) / self.source_time_scale * self.fps)


def read_timeline(manifest_path, encoded_fps, count, video_hash):
    manifest = None
    start, scale, fps = Fraction(0), Fraction(1), encoded_fps
    if manifest_path is not None:
        manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        if not isinstance(manifest, dict):
            raise ValueError('Manifest must be a JSON object')
        for name in ('source_start', 'source_time_scale', 'fps'):
            if name not in manifest:
                raise ValueError(f'Manifest must contain {name}')
        start = rational(manifest['source_start'], 'manifest source_start')
        scale = rational(manifest['source_time_scale'], 'manifest source_time_scale')
        fps = rational(manifest['fps'], 'manifest fps')
        if start < 0 or scale <= 0 or fps <= 0:
            raise ValueError('Manifest requires source_start >= 0, source_time_scale > 0, fps > 0')
        if fps != encoded_fps:
            raise ValueError('Manifest fps does not match encoded video fps')
        if 'frame_count' in manifest and (
            type(manifest['frame_count']) is not int or manifest['frame_count'] != count
        ):
            raise ValueError('Manifest frame_count does not match decoded video')
        if 'mp4_sha256' in manifest and manifest['mp4_sha256'] != video_hash:
            raise ValueError('Manifest mp4_sha256 does not match the input video')
    timeline = Timeline(fps, start, scale, count)
    rational(timeline.source_end, 'mapped source end')
    return timeline, manifest


def sampling_plan(timeline, cuts, actions, stride):
    groups, selected = [], set()
    for number, time in enumerate(cuts, 1):
        index = timeline.first_frame(time)
        if not timeline.source_start <= time < timeline.source_end or not 0 <= index < timeline.count:
            raise ValueError(f'Cut {time} is outside the available source/frame bounds')
        slots = []
        for offset in (-2, -1, 0, 1, 2):
            target = index + offset
            available = 0 <= target < timeline.count
            slots.append({'offset': offset, 'frame_index': target, 'available': available})
            if available:
                selected.add(target)
        groups.append({
            'id': f'cut-{number:03d}', 'kind': 'cut',
            'source_time': float(time), 'source_time_exact': str(time),
            'center_frame_index': index, 'slots': slots,
            'frame_indices': [slot['frame_index'] for slot in slots if slot['available']],
            'visual_review': 'pending',
        })
    for number, (start, end) in enumerate(actions, 1):
        if not timeline.source_start <= start < end <= timeline.source_end:
            raise ValueError(f'Action {start}:{end} is outside the available source bounds')
        first, stop = timeline.first_frame(start), timeline.first_frame(end)
        if not 0 <= first < stop <= timeline.count:
            raise ValueError(f'Action {start}:{end} contains no frame starts or exceeds frame bounds')
        indices = list(range(first, stop, stride))
        selected.update(indices)
        groups.append({
            'id': f'action-{number:03d}', 'kind': 'action',
            'source_interval': [float(start), float(end)],
            'source_interval_exact': [str(start), str(end)],
            'interval_semantics': '[start,end)', 'stride': stride,
            'dense': stride == 1, 'eligible_frame_count': stop - first,
            'omitted_frame_count': stop - first - len(indices),
            'frame_indices': indices, 'visual_review': 'pending',
        })
    return groups, sorted(selected)


def decode_selected(video, indices, out):
    frames = out / 'frames'
    frames.mkdir()
    # A filter file avoids command-line length limits for dense action intervals.
    # Coalesce consecutive selections without changing which frames are sampled.
    ranges = []
    for index in indices:
        if ranges and index == ranges[-1][1] + 1:
            ranges[-1][1] = index
        else:
            ranges.append([index, index])
    expression = '+'.join(
        f'eq(n\\,{start})' if start == end else f'between(n\\,{start}\\,{end})'
        for start, end in ranges
    )
    selection = out / 'decode-filter.txt'
    selection.write_text(f'select={expression}\n', encoding='ascii')
    run([
        'ffmpeg', '-nostdin', '-v', 'error', '-i', str(video), '-map', '0:v:0',
        '-filter_script:v', str(selection), '-fps_mode', 'passthrough',
        '-start_number', '0', '-n', str(frames / 'decoded-%08d.png'),
    ])
    decoded = sorted(frames.glob('decoded-*.png'))
    if len(decoded) != len(indices):
        raise RuntimeError(f'Decoded {len(decoded)} images, expected {len(indices)}')
    paths = {}
    for index, path in zip(indices, decoded):
        target = frames / f'frame-{index:08d}.png'
        path.rename(target)
        paths[index] = target
    return paths


def sample_record(index, path, out, timeline, timestamps):
    output_time = Fraction(index, 1) / timeline.fps
    source_time = timeline.source_time(index)
    pts = timestamps[index]
    with Image.open(path) as image:
        stats = ImageStat.Stat(image.convert('L'))
        size = list(image.size)
    return {
        'frame_index': index,
        'output_time': float(output_time), 'output_time_exact': str(output_time),
        'source_time': float(source_time), 'source_time_exact': str(source_time),
        'encoded_pts': float(pts), 'encoded_pts_exact': str(pts),
        'decoded_output_time_exact': str(pts - timestamps[0]),
        'image': str(path.relative_to(out)), 'image_sha256': file_sha256(path),
        'decoded_dimensions': size,
        'metrics': {'mean_luma': stats.mean[0], 'luma_stddev': stats.stddev[0]},
        'visual_review': 'pending',
    }


def make_sheet(slots, samples, out, target, title, columns):
    width, image_height, gap, caption = 280, 158, 12, 48
    rows = math.ceil(len(slots) / columns)
    sheet = Image.new('RGB', (columns * (width + gap) + gap, 68 + rows * (image_height + caption + gap)), '#e5e2db')
    draw = ImageDraw.Draw(sheet)
    draw.text((gap, 10), title, fill='#17191b')
    draw.text((gap, 30), 'Decoded evidence only; visual review pending; not aesthetic approval.', fill='#17191b')
    draw.text((gap, 46), 'Full playback not performed. Displayed times rounded; exact times are in review.json.', fill='#17191b')
    for position, slot in enumerate(slots):
        index = slot['frame_index']
        x = gap + position % columns * (width + gap)
        y = 68 + position // columns * (image_height + caption + gap)
        offset = f" | offset {slot['offset']:+d}" if 'offset' in slot else ''
        if not slot.get('available', True):
            draw.rectangle((x, y, x + width, y + image_height), fill='#bbb9b4')
            draw.text((x + 8, y + 60), 'OUT OF RANGE (not sampled)', fill='#17191b')
            draw.text((x, y + image_height + 5), f'target frame {index}{offset}', fill='#17191b')
            continue
        sample = samples[index]
        with Image.open(out / sample['image']) as source:
            thumb = source.convert('RGB')
            thumb.thumbnail((width, image_height), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x + (width - thumb.width) // 2, y + (image_height - thumb.height) // 2))
        draw.text((x, y + image_height + 5), f'frame {index}{offset} | PENDING', fill='#17191b')
        draw.text((x, y + image_height + 19), f"output {sample['output_time']:.6f}s", fill='#17191b')
        draw.text((x, y + image_height + 33), f"source {sample['source_time']:.6f}s", fill='#17191b')
    sheet.save(out / target)


def review(video, out, manifest_path=None, cuts=None, actions=None, action_stride=1):
    video, out = Path(video).resolve(), Path(out).resolve()
    manifest_path = Path(manifest_path).resolve() if manifest_path is not None else None
    check_output(out)
    boundaries, intervals = parse_requests(cuts, actions)
    stride = positive_int(action_stride)
    if not video.is_file():
        raise FileNotFoundError(video)
    video_hash = file_sha256(video)
    probe, fps, timestamps = probe_video(video)
    manifest_hash = file_sha256(manifest_path) if manifest_path else None
    timeline, manifest = read_timeline(manifest_path, fps, len(timestamps), video_hash)
    groups, indices = sampling_plan(timeline, boundaries, intervals, stride)
    out.mkdir(parents=True, exist_ok=True)
    # Recheck immediately before writes to avoid accidental nonempty reuse.
    check_output(out)
    paths = decode_selected(video, indices, out)
    samples = {index: sample_record(index, paths[index], out, timeline, timestamps) for index in indices}
    for group in groups:
        group['sheets'] = []
        if group['kind'] == 'cut':
            pages, columns = [group['slots']], 5
        else:
            slots = [{'frame_index': index} for index in group['frame_indices']]
            pages, columns = [slots[i:i + 16] for i in range(0, len(slots), 16)], 4
        for page, slots in enumerate(pages, 1):
            target = f"{group['id']}-{page:03d}.png"
            title = f"{group['id']} | page {page}/{len(pages)}"
            if group['kind'] == 'action':
                title += f" | stride {stride} | {'dense' if stride == 1 else 'explicitly subsampled'}"
            else:
                title += f" | cut source {group['source_time']:.6f}s | -2 / -1 / center / +1 / +2"
            make_sheet(slots, samples, out, target, title, columns)
            group['sheets'].append(target)
    # Detect replacement/mutation during evidence extraction.
    if file_sha256(video) != video_hash:
        raise RuntimeError('Input video changed during review generation; evidence is invalid')
    if manifest_path and file_sha256(manifest_path) != manifest_hash:
        raise RuntimeError('Manifest changed during review generation; evidence is invalid')
    report = {
        'schema_version': 1, 'status': 'decoded_evidence_generated',
        'video': str(video), 'video_sha256': video_hash,
        'video_stream_index': probe['streams'][0]['index'],
        'manifest': str(manifest_path) if manifest_path else None,
        'manifest_sha256': manifest_hash,
        'manifest_video_hash_verified': manifest is not None and 'mp4_sha256' in manifest,
        'fps': str(timeline.fps), 'frame_count': timeline.count,
        'output_duration_exact': str(Fraction(timeline.count, 1) / timeline.fps),
        'source_start': float(timeline.source_start), 'source_start_exact': str(timeline.source_start),
        'source_time_scale': float(timeline.source_time_scale), 'source_time_scale_exact': str(timeline.source_time_scale),
        'source_end_exclusive_exact': str(timeline.source_end),
        'mapping': 'source_start + frame_index / fps * source_time_scale',
        'mapping_origin': 'manifest' if manifest_path else 'explicit identity assumption: source seconds equal output seconds',
        'sampling': {
            'cut_center': 'first frame on or after requested source time',
            'cut_offsets': [-2, -1, 0, 1, 2],
            'action_interval': '[start,end)', 'action_stride': stride,
            'implicit_uniform_samples': False, 'sample_count': len(indices),
            'unsampled_frame_count': timeline.count - len(indices),
            'scope': 'Only the explicitly requested cuts and action intervals; no full-film visual coverage claim',
        },
        'groups': groups, 'samples': list(samples.values()),
        'visual_review': 'pending', 'full_playback': 'not_performed',
        'aesthetic_approval': 'not_granted',
        'limitations': [
            'Generated sheets and numerical metrics are evidence, not aesthetic approval.',
            'Every sample remains pending actual pixel inspection by a reviewer.',
            'Dense decoded frames do not substitute for full real-time playback or listening.',
            'Only the first video stream is sampled. No audio review is performed.',
            'CFR presentation timestamps are checked within one encoded time-base tick.',
        ],
    }
    write_json(out / 'ffprobe.json', probe)
    write_json(out / 'review.json', report)
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--video', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True, help='New or empty output directory')
    parser.add_argument('--manifest', type=Path, help='Render manifest with source_start, source_time_scale, fps')
    parser.add_argument('--cuts', help='Comma-separated source-time cut boundaries')
    parser.add_argument('--actions', help='Comma-separated source intervals, e.g. 7.6:9.2,19:21; each is [start,end)')
    parser.add_argument('--action-stride', default='1', help='Positive integer; 1 decodes every action frame')
    args = parser.parse_args(argv)
    try:
        report = review(args.video, args.out, args.manifest, args.cuts, args.actions, args.action_stride)
    except (ValueError, RuntimeError, OSError, subprocess.SubprocessError) as error:
        detail = error.stderr.strip() if isinstance(error, subprocess.CalledProcessError) and error.stderr else str(error)
        parser.exit(2, f'ERROR: {detail}\n')
    print(json.dumps({'review': str(args.out.resolve() / 'review.json'), 'samples': len(report['samples']), 'visual_review': 'pending', 'full_playback': 'not_performed'}))


if __name__ == '__main__':
    main()

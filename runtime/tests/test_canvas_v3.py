"""Canvas protocol, duration, readiness, deterministic shutter and cleanup tests."""
import argparse
from contextlib import contextmanager
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import render_video as rv

CANVAS = shutil.which('node') and subprocess.run(['node', '-e', "require('@napi-rs/canvas')"], capture_output=True).returncode == 0
RENDER = "exports.render = (ctx,t,{width,height}) => { ctx.fillStyle = t < 1 ? '#ff0000' : '#0000ff'; ctx.fillRect(0,0,width,height); };"


@unittest.skipUnless(CANVAS, 'optional Canvas dependency unavailable')
class CanvasV3Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.font, cls.cmap = rv.font_info('Noto Sans CJK SC')

    @contextmanager
    def source(self, code, **kwargs):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'scene.cjs'
            path.write_text(code)
            source = rv.CanvasSource(path, 'Noto Sans CJK SC', 20, 20, self.font, **kwargs)
            try:
                yield source
            finally:
                source.close()

    def test_external_commonjs_scene_uses_runtime_local_dependencies_without_node_path(self):
        # Separate runtime installation and scene trees; no global NODE_PATH.
        # Symlinking the installed package avoids a network install in a test.
        package = Path(subprocess.check_output(
            ['node', '-p', "require.resolve('@napi-rs/canvas/package.json')"], text=True).strip()).parent
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            runtime = base / 'installation' / 'runtime'
            runtime.mkdir(parents=True)
            for name in ('canvas_worker.cjs', 'motion.cjs'):
                shutil.copy2(ROOT / name, runtime / name)
            scope = runtime.parent / 'node_modules' / '@napi-rs'
            scope.mkdir(parents=True)
            (scope / 'canvas').symlink_to(package, target_is_directory=True)
            scene = base / 'separate-project' / 'scene.cjs'
            scene.parent.mkdir()
            scene.write_text("const {createCanvas}=require('@napi-rs/canvas'); "
                             "const layer=createCanvas(20,20); const c=layer.getContext('2d'); "
                             "c.fillStyle='#00ff00'; c.fillRect(0,0,20,20); "
                             "exports.DURATION=2; exports.render=ctx=>ctx.drawImage(layer,0,0);")
            with mock.patch.dict(os.environ):
                os.environ.pop('NODE_PATH', None)
                with mock.patch.object(rv, 'HERE', runtime):
                    source = rv.CanvasSource(scene, 'Noto Sans CJK SC', 20, 20, self.font)
                    try:
                        self.assertEqual(source.frame(.5)[0], bytes([0,255,0,255])*400)
                    finally:
                        source.close()
                self.assertNotIn('NODE_PATH', os.environ)

    def test_duration_aliases_declared_text_and_cut_metadata(self):
        for key in ('DURATION', 'duration', 'SECONDS'):
            with self.subTest(key=key), self.source(f"exports.{key} = 40; exports.TEXT_STRINGS = ['确定性画布','Film']; exports.CUTS = [1, 30];\n" + RENDER) as source:
                self.assertEqual(source.duration, 40)
                self.assertEqual(source.metadata['duration_source'], key)
                self.assertEqual(source.cuts, [1, 30])
                self.assertTrue(set('确定性画布Film') <= source.chars)
                self.assertEqual(source.frame(39)[0], bytes([0, 0, 255, 255]) * 400)

    def test_esm_and_legacy_default_are_supported(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'scene.mjs'
            path.write_text("export const DURATION = 40; export default { render(ctx) { ctx.fillStyle = '#00ff00'; ctx.fillRect(0,0,20,20); } };")
            source = rv.CanvasSource(path, 'Noto Sans CJK SC', 20, 20, self.font)
            try:
                self.assertEqual(source.duration, 40)
                self.assertEqual(source.frame(39)[0], bytes([0, 255, 0, 255]) * 400)
            finally:
                source.close()
        with self.source(RENDER) as source:
            self.assertEqual(source.duration, 30)
            self.assertEqual(source.metadata['duration_source'], 'legacy_default_30s')
            self.assertIsNone(source.metadata['declared_text_source'])

    def test_invalid_duration_metadata_fails_and_reaps_worker(self):
        cases = ['0', '-1', 'NaN', 'Infinity', "'40'", 'true', 'undefined', 'null']
        for value in cases:
            with self.subTest(value=value):
                self.assert_failed_source(f'exports.DURATION = {value};\n' + RENDER, 'duration')
        for declaration in ["exports.CUTS = [2, 1];", "exports.CUTS = [1, 1];", "exports.CUTS = [30];", "exports.TEXT_STRINGS = [42];", "exports.ready = 42;"]:
            with self.subTest(declaration=declaration):
                self.assert_failed_source(declaration + RENDER, 'Canvas worker ended')

    def assert_failed_source(self, code, error_pattern, timeout=2):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.cjs'
            path.write_text(code)
            spawned = []
            real_popen = subprocess.Popen
            def track(*args, **kwargs):
                child = real_popen(*args, **kwargs)
                spawned.append(child)
                return child
            start = time.monotonic()
            with mock.patch.object(rv.subprocess, 'Popen', side_effect=track):
                with self.assertRaisesRegex((RuntimeError, ValueError), error_pattern):
                    rv.CanvasSource(path, 'Noto Sans CJK SC', 20, 20, self.font, startup_timeout=timeout)
            self.assertLess(time.monotonic() - start, timeout + 2.5)
            self.assertEqual(len(spawned), 1)
            self.assertIsNotNone(spawned[0].poll())
            self.assertTrue(spawned[0].stdin.closed)
            self.assertTrue(spawned[0].stdout.closed)

    def test_import_failure_missing_render_and_bad_handshake(self):
        self.assert_failed_source("throw Error('expected import failure');", 'expected import failure')
        self.assert_failed_source('exports.DURATION = 40;', 'must export render')
        self.assert_failed_source("process.stdout.write('not-json\\n');" + RENDER, 'not valid JSON')

    def test_stuck_import_ready_and_ignored_termination_are_bounded(self):
        for code in [
            'while (true) {}',
            "exports.ready = () => new Promise(() => {}); setInterval(() => {}, 1000);" + RENDER,
            "process.on('SIGTERM', () => {}); while (true) {}",
        ]:
            with self.subTest(code=code):
                self.assert_failed_source(code, 'timed out', timeout=.4)

    def test_frame_timeout_reaps_worker(self):
        with self.source("exports.DURATION = 2; exports.render = () => { while (true) {} };", frame_timeout=.2) as source:
            process = source.process
            start = time.monotonic()
            with self.assertRaisesRegex(RuntimeError, 'timed out'):
                source.frame(.5)
            self.assertLess(time.monotonic() - start, 2)
            self.assertIsNotNone(process.poll())
            self.assertIsNone(source.process)
            with self.assertRaisesRegex(RuntimeError, 'closed'):
                source.frame(.5)

    def test_ready_state_at_and_logging_preserve_protocol(self):
        code = """
exports.DURATION = 2;
let ready = false;
exports.ready = async () => { await new Promise(resolve => setTimeout(resolve, 10)); ready = true; console.log('prepared'); };
exports.stateAt = async t => { if (!ready) throw Error('not ready'); return {x: Math.round(t * 5)}; };
exports.render = (ctx,t,{state,random}) => {
  console.info('frame',t); ctx.fillStyle = '#101010'; ctx.fillRect(state.x,0,5,20);
  ctx.fillStyle = '#d52b23'; ctx.fillRect(Math.floor(random()*10),10,1,1);
};
"""
        with self.source(code) as source:
            a = source.frame(.5)[0]
            source.frame(1.5)
            self.assertEqual(source.frame(.5)[0], a)
            self.assertTrue(source.metadata['frame_ready'])
            self.assertTrue(source.metadata['state_at'])

    def test_reused_context_resets_clip_transform_style_and_saved_stack(self):
        code = """
exports.DURATION = 2;
exports.render = (ctx,t,{width,height}) => {
  if (t < 1) {
    ctx.save(); ctx.translate(10,0); ctx.globalAlpha = .2;
    ctx.beginPath(); ctx.rect(0,0,2,2); ctx.clip(); ctx.fillStyle='#ff0000';
  }
  ctx.fillRect(0,0,width,height);
};
"""
        with self.source(code) as source:
            expected = source.frame(1.5)[0]
            self.assertEqual(expected, bytes([255, 255, 255, 255]) * 400)
            for _ in range(8):
                source.frame(.5)
                self.assertEqual(source.frame(1.5)[0], expected)

    def test_cut_safe_shutter_pixels_and_order_independence(self):
        with self.source('exports.DURATION = 2; exports.CUTS = [1];\n' + RENDER) as source:
            left_times = rv.shutter_times(.99, 10, 2, [1], samples=8, angle=360)
            right_times = rv.shutter_times(1, 10, 2, [1], samples=8, angle=360)
            left = source.frame_samples(left_times)[0]
            right = source.frame_samples(right_times)[0]
            self.assertEqual(left, bytes([255, 0, 0, 255]) * 400)
            self.assertEqual(right, bytes([0, 0, 255, 255]) * 400)
            self.assertEqual(source.frame_samples(left_times)[0], left)
            # No declared cut: linear-light sRGB gives 188/188, not dark 128/128.
            mixed = source.frame_samples([.99, 1.01])[0]
            self.assertEqual(mixed, bytes([188, 0, 188, 255]) * 400)

    def test_linear_light_black_white_average_and_retained_texture(self):
        code = """
const {createCanvas} = require('@napi-rs/canvas');
const texture = createCanvas(20,20), ink = texture.getContext('2d');
ink.fillStyle = '#000000'; ink.fillRect(0,0,20,20);
exports.DURATION = 2;
exports.render = (ctx,t) => {
  if (typeof global.gc !== 'function') throw Error('isolated worker GC unavailable');
  if (t < 1) ctx.drawImage(texture,0,0);
};
"""
        with self.source(code) as source:
            black = bytes([0, 0, 0, 255]) * 400
            white = bytes([255, 255, 255, 255]) * 400
            self.assertEqual(source.frame(.5)[0], black)
            self.assertEqual(source.frame(1.5)[0], white)
            averaged = source.frame_samples([.5, 1.5])[0]
            self.assertEqual(averaged, bytes([188, 188, 188, 255]) * 400)
            # Repeated reset/collection must not alter an immutable authored cache.
            for _ in range(12):
                self.assertEqual(source.frame(.5)[0], black)
            self.assertEqual(source.frame_samples([1.5, .5])[0], averaged)

    def test_actual_40_second_duration_is_encoded_and_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path, out = root / 'long.cjs', root / 'output'
            path.write_text('exports.DURATION = 40; exports.CUTS = [1]; ' + RENDER)
            result = subprocess.run([sys.executable, str(ROOT / 'render_video.py'), 'render', '--backend', 'canvas', '--source', str(path), '--width', '20', '--height', '20', '--fps', '1', '--preset', 'ultrafast', '--no-qa-images', '--out', str(out)], capture_output=True, text=True, timeout=40)
            self.assertEqual(result.returncode, 0, result.stderr)
            manifest = json.loads((out / 'manifest.json').read_text())
            self.assertEqual(manifest['source_duration'], 40)
            self.assertEqual(manifest['requested_duration'], 40)
            self.assertEqual(manifest['frame_count'], 40)
            self.assertEqual(manifest['source_metadata']['duration_source'], 'DURATION')
            self.assertEqual(manifest['cuts'], [1])
            self.assertTrue(all(manifest['checks'].values()))
            self.assertFalse(manifest['sampled_frame_review']['aesthetic_approval'])

    def test_encoded_shutter_repeat_and_fit_time_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / 'scene.cjs'
            path.write_text('exports.DURATION = 2; exports.CUTS = [1]; ' + RENDER)
            command = [sys.executable, str(ROOT / 'render_video.py'), 'render', '--backend', 'canvas', '--source', str(path), '--width', '20', '--height', '20', '--fps', '10', '--start', '.5', '--duration', '2', '--fit-time', '--shutter-samples', '4', '--shutter-angle', '360', '--preset', 'ultrafast']
            for name in ('first', 'repeat'):
                result = subprocess.run(command + ['--out', str(root / name)], capture_output=True, text=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((root / 'first/video.mp4').read_bytes(), (root / 'repeat/video.mp4').read_bytes())
            report = json.loads((root / 'first/manifest.json').read_text())
            self.assertEqual(report['source_time_scale'], .75)
            self.assertTrue(report['temporal_shutter']['enabled'])
            metrics = json.loads((root / 'first/frame-metrics.json').read_text())
            self.assertTrue(all(t < 1 for t in metrics[6]['shutter_source_times']))
            self.assertTrue(all(t >= 1 for t in metrics[7]['shutter_source_times']))
            review = subprocess.run([sys.executable, str(ROOT / 'review_video.py'), '--video', str(root / 'first/video.mp4'), '--manifest', str(root / 'first/manifest.json'), '--out', str(root / 'review'), '--cuts', '1', '--actions', '.5:2'], capture_output=True, text=True, timeout=30)
            self.assertEqual(review.returncode, 0, review.stderr)
            evidence = json.loads((root / 'review/review.json').read_text())
            self.assertEqual(evidence['groups'][0]['frame_indices'], [5, 6, 7, 8, 9])
            self.assertEqual(len(evidence['samples']), 20)
            self.assertEqual(evidence['visual_review'], 'pending')


class ShutterTimingTests(unittest.TestCase):
    def test_half_open_shots_and_fit_time(self):
        left = rv.shutter_times(.99, 10, 2, [1], 4, 360)
        right = rv.shutter_times(1, 10, 2, [1], 4, 360)
        self.assertTrue(all(0 <= t < 1 for t in left))
        self.assertTrue(all(1 <= t < 2 for t in right))
        self.assertEqual(rv.shutter_times(.5, 10, 2, [], 1, 360), [.5])
        self.assertEqual(rv.shutter_times(.5, 10, 2, [], 4, 0), [.5])
        self.assertAlmostEqual(rv.shutter_times(.5, 10, 2, [], 2, 360, 2)[1] - .5, .05)
        self.assertTrue(all(0 <= t for t in rv.shutter_times(0, 10, 2, [], 4, 360)))
        self.assertTrue(all(t < 2 for t in rv.shutter_times(2, 10, 2, [], 4, 360)))

    def test_custom_sources_do_not_inherit_preset_cuts(self):
        source = argparse.Namespace(cuts=[], duration=40)
        args = argparse.Namespace(cuts=None, source=Path('custom.cjs'), style='tech')
        self.assertEqual(rv.source_cuts(args, source), [])
        args.cuts = '1,2'
        self.assertEqual(rv.source_cuts(args, source), [1, 2])
        args.cuts = '2,1'
        with self.assertRaises(ValueError):
            rv.source_cuts(args, source)


if __name__ == '__main__':
    unittest.main(verbosity=2)

"""Actual missing-dependency, font-face, foreign-cwd and child cleanup checks."""
import argparse
from contextlib import contextmanager, redirect_stdout
from fractions import Fraction
import io
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import render_video as rv


class CompatibilityTests(unittest.TestCase):
    @contextmanager
    def diagnostic_pipe(self, code):
        source = rv.CanvasSource.__new__(rv.CanvasSource)
        source._stderr = tempfile.TemporaryFile()
        source._buffer = bytearray()
        source.process = subprocess.Popen([sys.executable, '-c', code], stdin=subprocess.PIPE,
                                          stdout=subprocess.PIPE, stderr=source._stderr, start_new_session=True)
        try:
            yield source
        finally:
            source.close()

    def test_worker_eof_reports_real_exit_code_and_preserves_stderr(self):
        code = "import os,sys; sys.stderr.write('original worker detail\\n'); sys.stderr.flush(); os._exit(23)"
        with self.diagnostic_pipe(code) as source:
            with self.assertRaises(RuntimeError) as raised:
                source._read_exact(4, time.monotonic() + 3, 'frame rendering')
            message = str(raised.exception)
            self.assertIn('Canvas worker ended during frame rendering (0 of 4 bytes)', message)
            self.assertIn(f'worker_pid={source.process.pid}', message)
            self.assertIn('worker_returncode=23, worker_signal=none', message)
            self.assertIn('worker stderr: original worker detail', message)
            self.assertEqual(source.process.poll(), 23)

    @unittest.skipIf(sys.platform == 'win32', 'Negative signal return codes require POSIX')
    def test_worker_eof_reports_real_signal(self):
        code = "import os,signal,sys; sys.stderr.write('before signal\\n'); sys.stderr.flush(); os.kill(os.getpid(), signal.SIGTERM)"
        with self.diagnostic_pipe(code) as source:
            with self.assertRaises(RuntimeError) as raised:
                source._read_exact(4, time.monotonic() + 3, 'frame rendering')
            self.assertIn(f'worker_returncode={-signal.SIGTERM}, worker_signal=SIGTERM', str(raised.exception))
            self.assertIn('before signal', str(raised.exception))

    @unittest.skipIf(sys.platform == 'win32', 'This stdout-close fixture uses POSIX file descriptors')
    def test_worker_closing_stdout_without_exit_is_reported_running(self):
        code = "import os,time; os.close(1); time.sleep(10)"
        with self.diagnostic_pipe(code) as source:
            started = time.monotonic()
            with self.assertRaises(RuntimeError) as raised:
                source._read_exact(4, time.monotonic() + 3, 'frame rendering')
            self.assertIn('worker_returncode=running, worker_signal=none', str(raised.exception))
            self.assertNotIn('worker_returncode=0', str(raised.exception))
            self.assertIsNone(source.process.poll())
            self.assertLess(time.monotonic() - started, 2)

    def test_render_failure_reports_exact_frame_and_cut_clamped_sample_times(self):
        original = RuntimeError('authored failure; worker stderr: original diagnostic')
        class FailingSource:
            duration = 2
            metadata = {}
            cuts = [.7]
            calls = 0
            def frame_samples(self, times):
                self.calls += 1
                if self.calls == 3:
                    raise original
                return bytes([255, 0, 0, 255]) * 400, None
        args = argparse.Namespace(duration=.5, start=.5, fit_time=False, source=Path('unused.cjs'), style='tech', label=None,
                                  width=20, height=20, preset='ultrafast', crf=18, shutter_samples=3, shutter_angle=180,
                                  backend='canvas', cuts=None)
        encoder = mock.Mock(stdin=io.BytesIO())
        encoder.poll.return_value = None
        encoder.wait.return_value = 0
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.object(rv.subprocess, 'Popen', return_value=encoder):
                with self.assertRaises(RuntimeError) as raised:
                    rv.render(args, Fraction(10), FailingSource(), {}, {}, set(), Path(directory))
        message = str(raised.exception)
        expected_times = rv.shutter_times(.7, Fraction(10), 2, [.7], 3, 180)
        self.assertIn('frame_index=2 (zero-based), source_time=0.7', message)
        self.assertIn('sample_times=' + json.dumps(expected_times), message)
        self.assertTrue(all(t >= .7 for t in expected_times))
        self.assertIn('worker stderr: original diagnostic', message)
        self.assertIs(raised.exception.__cause__, original)
        self.assertTrue(encoder.stdin.closed)

    def test_render_failure_keeps_original_when_sample_diagnostic_fails(self):
        original = RuntimeError('original frame error; worker stderr: keep this')
        source = argparse.Namespace(duration=2, metadata={}, cuts=[])
        args = argparse.Namespace(duration=.5, start=.5, fit_time=False, source=Path('unused.cjs'), style='tech', label=None,
                                  width=20, height=20, preset='ultrafast', crf=18, shutter_samples=3, shutter_angle=180,
                                  backend='canvas', cuts=None)
        encoder = mock.Mock(stdin=io.BytesIO())
        encoder.poll.return_value = None
        encoder.wait.return_value = 0
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.object(rv.subprocess, 'Popen', return_value=encoder), \
                    mock.patch.object(rv, 'sampled_frame', side_effect=original), \
                    mock.patch.object(rv, 'shutter_times', side_effect=ValueError('diagnostic unavailable')):
                with self.assertRaises(RuntimeError) as raised:
                    rv.render(args, Fraction(10), source, {}, {}, set(), Path(directory))
        self.assertIn('frame_index=0 (zero-based), source_time=0.5, sample_times=unavailable', str(raised.exception))
        self.assertIn('worker stderr: keep this', str(raised.exception))
        self.assertIs(raised.exception.__cause__, original)

    def test_missing_pillow_has_actionable_diagnostic_without_traceback(self):
        result = subprocess.run([sys.executable, '-S', str(ROOT / 'render_video.py'), 'doctor'],
                                capture_output=True, text=True, cwd=tempfile.gettempdir())
        self.assertEqual(result.returncode, 2)
        self.assertIn('Pillow is missing', result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_explicit_collection_face_uses_real_cmap_without_fontconfig(self):
        from fontTools.fontBuilder import FontBuilder
        from fontTools.pens.ttGlyphPen import TTGlyphPen
        from fontTools.ttLib import TTCollection
        with tempfile.TemporaryDirectory() as directory:
            collection = TTCollection()
            collection.fonts = []
            for name, character in [('Fixture One', 'A'), ('Fixture Two', 'B')]:
                builder = FontBuilder(1024, isTTF=True)
                builder.setupGlyphOrder(['.notdef', 'letter'])
                builder.setupCharacterMap({ord(character): 'letter'})
                builder.setupGlyf({key: TTGlyphPen(None).glyph() for key in ['.notdef', 'letter']})
                builder.setupHorizontalMetrics({key: (512, 0) for key in ['.notdef', 'letter']})
                builder.setupHorizontalHeader(ascent=800, descent=-200)
                builder.setupNameTable({'familyName': name, 'styleName': 'Regular', 'uniqueFontIdentifier': name, 'fullName': name, 'psName': name.replace(' ', '')})
                builder.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
                builder.setupPost(); builder.setupMaxp()
                collection.fonts.append(builder.font)
            selected = Path(directory) / 'faces.ttc'; collection.save(selected)
            for index, character in enumerate(['A', 'B']):
                with mock.patch.dict(os.environ, {'HEIGE_FONT_PATH': str(selected), 'HEIGE_FONT_INDEX': str(index)}):
                    with mock.patch.object(rv, 'run', side_effect=AssertionError('fc-match must not be called for explicit font')):
                        font, cmap = rv.font_info('A nonexistent requested family')
                self.assertEqual(cmap, {ord(character)})
                self.assertEqual(font['face_index'], index)
                self.assertEqual(font['resolved_family'], ['Fixture One', 'Fixture Two'][index])
            with mock.patch.dict(os.environ, {'HEIGE_FONT_PATH': str(selected), 'HEIGE_FONT_INDEX': '-1'}):
                with self.assertRaisesRegex(RuntimeError, 'non-negative integer'): rv.font_info('unused')
            with mock.patch.dict(os.environ, {'HEIGE_FONT_PATH': str(selected), 'HEIGE_FONT_INDEX': '2'}):
                with self.assertRaisesRegex(RuntimeError, 'Cannot load selected font face'): rv.font_info('unused')

    def test_doctor_reports_selected_backend_not_ready_and_cli_exits_nonzero(self):
        output = io.StringIO()
        with mock.patch.object(rv, 'font_info', side_effect=RuntimeError('missing selected font')):
            with redirect_stdout(output): self.assertFalse(rv.doctor(backend='canvas'))
        report = json.loads(output.getvalue())
        self.assertEqual(report['status'], 'not-ready')
        self.assertFalse(report['canvas_ready'])
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, str(ROOT / 'render_video.py'), 'doctor', '--backend', 'canvas'],
                                    env={**os.environ, 'HEIGE_FONT_PATH': str(Path(directory) / 'missing.ttf')},
                                    cwd=directory, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'], 'not-ready')
        self.assertNotIn('Traceback', result.stderr)

    def test_canvas_dependency_probe_is_relative_to_repository_from_foreign_cwd(self):
        with tempfile.TemporaryDirectory() as directory:
            script = 'import sys,json;sys.path.insert(0,sys.argv[1]);import render_video;print(json.dumps(render_video.dependency_versions()))'
            result = subprocess.run([sys.executable, '-c', script, str(ROOT)], cwd=directory, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIsNotNone(json.loads(result.stdout)['@napi-rs/canvas'])

    @unittest.skipIf(sys.platform == 'win32', 'This real TERM/KILL child regression requires Unix signals')
    def test_encoder_ignoring_term_is_killed_and_reaped_without_masking_source_error(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory); ready = directory / 'ready'
            encoder = directory / 'ffmpeg'
            encoder.write_text('#!' + sys.executable + '\nimport os,signal,time\nsignal.signal(signal.SIGTERM,signal.SIG_IGN)\nopen(os.environ["ENCODER_READY"],"w").write(str(os.getpid()))\nwhile True: time.sleep(.1)\n')
            encoder.chmod(0o755)
            class FailingSource:
                duration = 1
                metadata = {}
                cuts = []
                def frame(self, _time):
                    deadline = time.monotonic() + 5
                    while not ready.exists() and time.monotonic() < deadline: time.sleep(.01)
                    if not ready.exists(): raise AssertionError('real encoder did not start')
                    raise RuntimeError('expected authored frame failure')
            args = argparse.Namespace(duration=1, start=0, fit_time=False, source=Path('unused.py'), style='tech', label=None,
                                      width=20, height=20, preset='ultrafast', crf=18, shutter_samples=1, shutter_angle=180, backend='svg', cuts=None)
            children = []; original = subprocess.Popen
            def launch(*arguments, **kwargs):
                process = original(*arguments, **kwargs); children.append(process); return process
            with mock.patch.dict(os.environ, {'PATH': str(directory) + os.pathsep + os.environ.get('PATH', ''), 'ENCODER_READY': str(ready)}):
                with mock.patch.object(rv.subprocess, 'Popen', side_effect=launch):
                    started = time.monotonic()
                    with self.assertRaisesRegex(RuntimeError, 'expected authored frame failure'):
                        rv.render(args, Fraction(1), FailingSource(), {}, {}, set(), directory)
            self.assertLess(time.monotonic() - started, 7)
            self.assertEqual(len(children), 1)
            self.assertEqual(children[0].returncode, -signal.SIGKILL)
            self.assertTrue(children[0].stdin.closed)
            with self.assertRaises(ProcessLookupError): os.kill(children[0].pid, 0)


if __name__ == '__main__': unittest.main(verbosity=2)

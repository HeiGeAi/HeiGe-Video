"""Actual missing-dependency, font-face, foreign-cwd and child cleanup checks."""
import argparse
from contextlib import redirect_stdout
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

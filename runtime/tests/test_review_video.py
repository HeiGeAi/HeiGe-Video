import hashlib
import json
from fractions import Fraction
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import review_video as review


class SamplingTests(unittest.TestCase):
    def test_rational_mapping_and_off_grid_cut(self):
        timeline = review.Timeline(Fraction(24), Fraction(2), Fraction(3, 2), 48)
        groups, indices = review.sampling_plan(timeline, [Fraction('2.13')], [(Fraction('2.125'), Fraction('2.375'))], 1)
        self.assertEqual(groups[0]['center_frame_index'], 3)
        self.assertEqual(groups[0]['frame_indices'], [1, 2, 3, 4, 5])
        self.assertEqual(groups[1]['frame_indices'], [2, 3, 4, 5])
        self.assertEqual(indices, [1, 2, 3, 4, 5])

    def test_nonfinite_and_malformed_requests_fail(self):
        for cuts, actions in [
            (None, None), ('', None), ('nan', None), ('inf', None), ('-1', None),
            ('0,', None), (None, ''), (None, '0:nan'), (None, '0:inf'),
            (None, '2:1'), (None, '-1:1'), (None, '0:0'), (None, '0:1:2'),
        ]:
            with self.subTest(cuts=cuts, actions=actions), self.assertRaises(ValueError):
                review.parse_requests(cuts, actions)
        for stride in ['0', '-1', '1.5', 'nan', 'inf', '--1', True]:
            with self.subTest(stride=stride), self.assertRaises(ValueError):
                review.positive_int(stride)

    def test_bounds_and_empty_intervals_fail_without_clamping(self):
        timeline = review.Timeline(Fraction(10), Fraction(2), Fraction(1), 10)
        for cuts, actions in [
            ([Fraction('1.9')], []), ([Fraction(3)], []), ([Fraction('2.99')], []),
            ([], [(Fraction('1.9'), Fraction('2.5'))]),
            ([], [(Fraction('2.5'), Fraction('3.1'))]),
            ([], [(Fraction('2.01'), Fraction('2.02'))]),
        ]:
            with self.subTest(cuts=cuts, actions=actions), self.assertRaises(ValueError):
                review.sampling_plan(timeline, cuts, actions, 1)


@unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'FFmpeg/FFprobe unavailable')
class EncodedReviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        cls.root = Path(cls.directory.name)
        cls.video = cls.root / 'synthetic.mp4'
        frames = []
        for index in range(30):
            image = Image.new('RGB', (96, 64), (20 + index * 6, 40, 160 - index * 3))
            ImageDraw.Draw(image).rectangle((index * 2, 12, index * 2 + 12, 50), fill='white')
            frames.append(image.tobytes())
        result = subprocess.run([
            'ffmpeg', '-nostdin', '-v', 'error', '-f', 'rawvideo',
            '-pixel_format', 'rgb24', '-video_size', '96x64', '-framerate', '10',
            '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'ultrafast',
            '-crf', '0', '-pix_fmt', 'yuv420p', '-threads', '1', '-n', str(cls.video),
        ], input=b''.join(frames), capture_output=True)
        if result.returncode:
            raise RuntimeError(result.stderr.decode())
        cls.video_hash = hashlib.sha256(cls.video.read_bytes()).hexdigest()
        cls.manifest_data = {
            'source_start': 10, 'source_time_scale': 2, 'fps': '10',
            'frame_count': 30, 'mp4_sha256': cls.video_hash,
        }
        cls.manifest = cls.root / 'manifest.json'
        cls.manifest.write_text(json.dumps(cls.manifest_data))

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def invoke(self, out, *args):
        return subprocess.run([
            sys.executable, str(ROOT / 'review_video.py'),
            '--video', str(self.video), '--out', str(out), *args,
        ], capture_output=True, text=True)

    def test_cli_encoded_cut_dense_actions_and_pending_status(self):
        out = self.root / 'mapped-review'
        result = self.invoke(out, '--manifest', str(self.manifest), '--cuts', '11', '--actions', '11.2:12.4')
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((out / 'review.json').read_text())
        cut, action = report['groups']
        self.assertEqual(cut['center_frame_index'], 5)
        self.assertEqual(cut['frame_indices'], [3, 4, 5, 6, 7])
        self.assertEqual([slot['offset'] for slot in cut['slots']], [-2, -1, 0, 1, 2])
        self.assertEqual(action['frame_indices'], list(range(6, 12)))
        self.assertEqual(action['interval_semantics'], '[start,end)')
        self.assertEqual(action['stride'], 1)
        self.assertTrue(action['dense'])
        self.assertEqual(action['omitted_frame_count'], 0)
        self.assertEqual(report['sampling']['sample_count'], 9)
        self.assertFalse(report['sampling']['implicit_uniform_samples'])
        self.assertEqual(report['video_sha256'], self.video_hash)
        self.assertTrue(report['manifest_video_hash_verified'])
        self.assertEqual(report['visual_review'], 'pending')
        self.assertEqual(report['full_playback'], 'not_performed')
        self.assertEqual(report['aesthetic_approval'], 'not_granted')
        self.assertIn('not aesthetic approval', report['limitations'][0])
        samples = {sample['frame_index']: sample for sample in report['samples']}
        self.assertEqual(sorted(samples), list(range(3, 12)))
        self.assertEqual(samples[3]['source_time_exact'], '53/5')
        self.assertEqual(samples[3]['output_time_exact'], '3/10')
        self.assertEqual(samples[3]['encoded_pts_exact'], '3/10')
        for sample in samples.values():
            self.assertEqual(sample['visual_review'], 'pending')
            path = out / sample['image']
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), sample['image_sha256'])
            with Image.open(path) as image:
                self.assertEqual(image.size, (96, 64))
        for group in report['groups']:
            self.assertEqual(group['visual_review'], 'pending')
            for name in group['sheets']:
                with Image.open(out / name) as image:
                    self.assertGreater(image.width, 1000)
        # Independently decode a known encoded frame and compare exact pixels.
        decoded = subprocess.run([
            'ffmpeg', '-nostdin', '-v', 'error', '-i', str(self.video),
            '-vf', 'select=eq(n\\,11)', '-fps_mode', 'passthrough',
            '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
        ], capture_output=True, check=True).stdout
        with Image.open(out / samples[11]['image']) as image:
            self.assertEqual(image.convert('RGB').tobytes(), decoded)

    def test_identity_mapping_edges_and_explicit_stride(self):
        out = self.root / 'identity-review'
        result = self.invoke(out, '--cuts', '0,2.9', '--actions', '0:3', '--action-stride', '3')
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads((out / 'review.json').read_text())
        first, last, action = report['groups']
        self.assertEqual(first['frame_indices'], [0, 1, 2])
        self.assertEqual([s['offset'] for s in first['slots'] if not s['available']], [-2, -1])
        self.assertEqual(last['frame_indices'], [27, 28, 29])
        self.assertEqual([s['offset'] for s in last['slots'] if not s['available']], [1, 2])
        self.assertEqual(action['frame_indices'], list(range(0, 30, 3)))
        self.assertFalse(action['dense'])
        self.assertEqual(action['eligible_frame_count'], 30)
        self.assertEqual(action['omitted_frame_count'], 20)
        self.assertIsNone(report['manifest'])
        self.assertIn('identity assumption', report['mapping_origin'])
        for sample in report['samples']:
            self.assertEqual(sample['source_time_exact'], sample['output_time_exact'])

    def test_dense_actions_paginate_without_dropping_frames(self):
        out = self.root / 'paginated-review'
        report = review.review(self.video, out, actions='0:3')
        action = report['groups'][0]
        self.assertEqual(action['frame_indices'], list(range(30)))
        self.assertEqual(len(report['samples']), 30)
        self.assertEqual(len(action['sheets']), 2)
        self.assertEqual(report['sampling']['unsampled_frame_count'], 0)
        self.assertEqual(report['full_playback'], 'not_performed')

    def test_variable_rate_video_is_rejected(self):
        video = self.root / 'variable.mp4'
        subprocess.run([
            'ffmpeg', '-nostdin', '-v', 'error', '-i', str(self.video),
            '-vf', 'select=not(eq(n\\,10))', '-fps_mode', 'vfr',
            '-c:v', 'libx264', '-threads', '1', '-n', str(video),
        ], check=True, capture_output=True)
        with self.assertRaisesRegex(ValueError, 'Variable-frame-rate'):
            review.probe_video(video)

    def test_nonzero_encoded_pts_are_retained_and_normalized(self):
        video = self.root / 'offset.mp4'
        subprocess.run([
            'ffmpeg', '-nostdin', '-v', 'error', '-i', str(self.video),
            '-c', 'copy', '-output_ts_offset', '5', '-n', str(video),
        ], check=True, capture_output=True)
        report = review.review(video, self.root / 'offset-review', cuts='1')
        center = next(sample for sample in report['samples'] if sample['frame_index'] == 10)
        self.assertEqual(center['encoded_pts_exact'], '6')
        self.assertEqual(center['output_time_exact'], '1')
        self.assertEqual(center['decoded_output_time_exact'], '1')
        self.assertEqual(center['source_time_exact'], '1')

    def test_cli_rejects_invalid_requests_without_creating_output(self):
        for number, args in enumerate([
            [], ['--cuts', 'nan'], ['--actions', '0:Infinity'],
            ['--actions', '1:0'], ['--actions', '0:4'],
            ['--cuts', '3'], ['--cuts', '0', '--action-stride', '0'],
            ['--cuts', '0', '--action-stride', '1.5'],
        ]):
            with self.subTest(args=args):
                out = self.root / f'invalid-{number}'
                result = self.invoke(out, *args)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('ERROR:', result.stderr)
                self.assertFalse(out.exists())

    def test_manifest_mismatch_and_invalid_values_fail(self):
        probe, fps, times = review.probe_video(self.video)
        self.assertEqual(len(times), 30)
        for number, changes in enumerate([
            {'source_start': float('nan')}, {'source_start': -1},
            {'source_time_scale': float('inf')}, {'source_time_scale': 0},
            {'source_time_scale': -1}, {'fps': '0'}, {'fps': '0/0'},
            {'fps': 'nan'}, {'fps': '12'}, {'frame_count': 29},
            {'frame_count': 30.0}, {'mp4_sha256': '0' * 64},
        ]):
            with self.subTest(changes=changes):
                manifest = self.root / f'bad-manifest-{number}.json'
                manifest.write_text(json.dumps({**self.manifest_data, **changes}))
                with self.assertRaises(ValueError):
                    review.read_timeline(manifest, fps, len(times), self.video_hash)
        missing = self.root / 'missing-fields.json'
        missing.write_text('{}')
        with self.assertRaisesRegex(ValueError, 'source_start'):
            review.read_timeline(missing, fps, len(times), self.video_hash)

    def test_nonempty_output_is_never_overwritten(self):
        out = self.root / 'nonempty'
        out.mkdir()
        keep = out / 'review.json'
        keep.write_text('preserve original')
        result = self.invoke(out, '--cuts', '1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('new or empty', result.stderr)
        self.assertEqual(keep.read_text(), 'preserve original')
        self.assertEqual(list(out.iterdir()), [keep])
        output_file = self.root / 'existing-file'
        output_file.write_text('also preserve')
        result = self.invoke(output_file, '--cuts', '1')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(output_file.read_text(), 'also preserve')


if __name__ == '__main__':
    unittest.main(verbosity=2)

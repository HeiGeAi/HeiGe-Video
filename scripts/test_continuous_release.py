"""Real local Git/source/hash checks over declared synthetic inventory fixtures.

Fixture MP4 bytes are deliberately not playable. Passing these tests validates
the inventory checker, not rendering, decoding, browser playback or listening.
"""
import copy
import array
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import wave

from validate_continuous_release import (CURRENT_INVENTORY, HISTORICAL_INVENTORY,
                                         compiled_plan, current_engine,
                                         validate as validate_inventory,
                                         validate_inventories)


def validate(root):
    # The original 31 cases deliberately keep their single alpha.2 inventory.
    return validate_inventory(root, inventory_path=HISTORICAL_INVENTORY)


ROOT = Path(__file__).resolve().parents[1]


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def frame(at):
    return {'at': at, 'x': 100, 'y': 100, 'w': 240, 'h': 80,
            'opacity': 1, 'rotation': 0, 'radius': 12}


def project_fixture(ratio):
    return {'schemaVersion': 'heige-video/4', 'title': '连续清单测试',
            'mode': 'promo', 'ratio': ratio, 'theme': 'ledger', 'fps': 30,
            'assets': [{'id': 'voice', 'path': 'voice.wav', 'kind': 'audio',
                        'source': 'original', 'rights': '本测试的文件哈希夹具'}],
            'audio': {'assetId': 'voice', 'kind': 'synthetic', 'subtitles': 'voice.srt'},
            'shots': [{'id': 'intro', 'type': 'beat', 'title': '出现', 'start': 0, 'end': 2},
                      {'id': 'result', 'type': 'beat', 'title': '结果', 'start': 2, 'end': 4}],
            'continuity': {
                'objects': [{'id': 'record', 'semanticIdentity': '同一记录', 'kind': 'text',
                             'text': '归入结果', 'keyframes': [frame(0), frame(4)]}],
                'camera': [{'at': at, 'x': 640, 'y': 360, 'zoom': 1, 'rotation': 0} for at in [0, 4]],
                'boundaries': [{'fromShot': 'intro', 'toShot': 'result', 'carrier': 'record',
                                'cause': '记录移动', 'outcome': '归入结果'}],
                'soundEvents': [{'id': 'touch', 'at': 2, 'objectId': 'record', 'type': 'tick', 'volume': .2}],
                'blur': {'samples': 3, 'shutterAngle': 180}}}


class ContinuousReleaseTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='heige-continuous-release-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.git_env = {**os.environ, 'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': os.devnull}
        self.git('init', '-q')
        for relative in ['package.json', 'package-lock.json', 'tsconfig.json',
                         'studio/CONTRACT.md', 'studio/requirements.txt']:
            self.write(relative, json.dumps({'version': '4.0.0-alpha.2'}) if relative == 'package.json'
                       else ('{}' if relative.endswith('.json') else 'original fixture contract'))
        # Copy only our own local modules needed for the actual compiler.
        for source in (ROOT / 'studio/lib').glob('*.mjs'):
            self.write('studio/lib/' + source.name, source.read_bytes())
        self.write('studio/src/original.tsx', 'export const original = true;')
        self.write('scripts/validate_continuous_release.py', (ROOT / 'scripts/validate_continuous_release.py').read_bytes())
        self.write('scripts/validate_super_release.py', (ROOT / 'scripts/validate_super_release.py').read_bytes())
        self.engine = current_engine(self.root)
        self.git('add', '-A')
        self.git('commit', '-q', '-m', 'Original current-engine fixture')
        self.source_commit = self.git('rev-parse', 'HEAD')
        examples = []
        for index, (ratio, dimensions) in enumerate([('16:9', (1280, 720)), ('9:16', (720, 1280)), ('1:1', (1080, 1080))]):
            directory = 'examples/continuous-' + str(index)
            project_path = directory + '/project.json'
            video_path = 'demos/continuous-' + str(index) + '.mp4'
            self.write(project_path, json.dumps(project_fixture(ratio), ensure_ascii=False))
            self.write(directory + '/voice.wav', b'original contract audio file ' + str(index).encode())
            self.write(directory + '/voice.srt', '1\n00:00:00,000 --> 00:00:04,000\n归入结果。\n')
            self.write(video_path, b'original hash-only encoded fixture ' + str(index).encode())
            video_hash = digest(self.root / video_path)
            examples.append({'id': 'continuous-' + str(index), 'project': project_path,
                             'input': {'project': digest(self.root / project_path),
                                       'assets': {'voice': digest(self.root / (directory + '/voice.wav'))},
                                       'subtitles': digest(self.root / (directory + '/voice.srt')), 'brief': None},
                             'video': video_path, 'mp4Sha256': video_hash,
                             'status': 'validated', 'technical': 'pass',
                             'width': dimensions[0], 'height': dimensions[1], 'fps': 30,
                             'duration': 4, 'frames': 120, 'decodedFrames': 120,
                             'continuity': {'status': 'structural-pass', 'coverage': {
                                 'expectedFrames': 120, 'measuredFrames': 120, 'validFrames': 120,
                                 'complete': True, 'missingFrames': [], 'invalidFrames': [], 'duplicateFrames': []}},
                             'blur': {'samples': 3, 'captures': 360, 'encodedFrames': 120},
                             'audio': {'present': True, 'finite': True, 'peak': .05, 'rms': .01, 'duration': 4.0106666667},
                             'layout': {'errors': 0},
                             'playback': {'status': 'passed', 'mp4Sha256': video_hash, 'droppedFrames': 0},
                             'visualReview': {'status': 'sampled-pass', 'scope': 'Synthetic declaration for inventory regression only'},
                             'audioListening': {'status': 'not-tested', 'scope': 'No listening performed by this fixture'}})
        self.inventory = {'schemaVersion': 'heige-continuous-release/1', 'version': '4.0.0-alpha.2',
                          'date': '2026-10-12', 'engine': self.engine, 'examples': examples}
        self.save()

    def write(self, relative, value):
        file = self.root / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(value if isinstance(value, bytes) else value.encode())
        return file

    def git(self, *args):
        result = subprocess.run(['git', '-c', 'user.name=Continuous fixture',
                                 '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
                                 '-c', 'core.autocrlf=false', *args], cwd=self.root, env=self.git_env,
                                capture_output=True, text=True, check=True)
        return result.stdout.strip()

    def save(self):
        self.write('references/v4-continuity-status.json', json.dumps(self.inventory))

    def item(self):
        return self.inventory['examples'][0]

    def edited_project(self, change, index=0):
        item = self.inventory['examples'][index]
        file = self.root / item['project']
        project = json.loads(file.read_text())
        change(project)
        self.write(item['project'], json.dumps(project, ensure_ascii=False))
        item['input']['project'] = digest(file)
        self.save()

    def reject_edit(self, change, expected):
        saved = copy.deepcopy(self.inventory)
        change(self.inventory)
        self.save()
        with self.assertRaisesRegex(ValueError, expected):
            validate(self.root)
        self.inventory = saved
        self.save()

    def make_forge_inventory(self):
        # Keep the original alpha.2 inputs and hash-only media untouched. The
        # source commit is real Git; only the declared video data is synthetic.
        self.inventory['sourceCommit'] = self.source_commit
        self.save()
        self.write('package.json', json.dumps({'version': '4.0.0-alpha.3'}))
        pattern = array.array('h', [round(16384 * math.sin(index * math.pi / 32))
                                    for index in range(64) for _channel in range(2)])
        samples = pattern * (720000 // 64)
        if sys.byteorder != 'little':
            samples.byteswap()
        wav_path = 'demos/forge/music.wav'
        wav_file = self.root / wav_path
        wav_file.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(wav_file), 'wb') as pcm:
            pcm.setnchannels(2)
            pcm.setsampwidth(2)
            pcm.setframerate(48000)
            pcm.writeframes(samples.tobytes())
        peak = max(abs(sample) for sample in pattern) / 32767
        rms = math.sqrt(sum((sample / 32767) ** 2 for sample in pattern) / len(pattern))
        forge = copy.deepcopy(self.inventory)
        forge.pop('sourceCommit')
        forge.update(version='4.0.0-alpha.3', engine=current_engine(self.root),
                     userFeedback='Previous alpha.2 creative result was rejected; this synthetic fixture makes no aesthetic or listening claim')
        for index, item in enumerate(forge['examples']):
            project = project_fixture(['16:9', '9:16', '1:1'][index])
            project.pop('audio')
            project['assets'] = []
            project['theme'] = 'forge'
            for shot in project['shots']:
                shot.pop('start')
                shot.pop('end')
                shot['duration'] = 7.5
            for obj in project['continuity']['objects']:
                obj['keyframes'][-1]['at'] = 15
            project['continuity']['camera'][-1]['at'] = 15
            project['continuity']['musicScore'] = {'style': 'forge-breakbeat', 'bpm': 128, 'volume': .8}
            project_path = 'examples/forge-' + str(index) + '/project.json'
            self.write(project_path, json.dumps(project, ensure_ascii=False))
            video_path = 'demos/forge-' + str(index) + '.mp4'
            self.write(video_path, b'forge inventory hash fixture, not actual encoded media ' + str(index).encode())
            item.update(id='forge-' + str(index), project=project_path, video=video_path,
                        mp4Sha256=digest(self.root / video_path), duration=15, frames=450, decodedFrames=450)
            item['input'] = {'project': digest(self.root / project_path), 'assets': {}, 'subtitles': None, 'brief': None}
            item['continuity']['coverage'].update(expectedFrames=450, measuredFrames=450, validFrames=450)
            item['blur'].update(captures=1350, encodedFrames=450)
            item['audio']['duration'] = 15.0106666667
            item['playback']['mp4Sha256'] = item['mp4Sha256']
            item['musicScore'] = {**compiled_plan(self.root, self.root / project_path)['musicScore'],
                                  'wav': wav_path, 'wavSha256': digest(wav_file), 'peak': peak, 'rms': rms}
        self.write(CURRENT_INVENTORY, json.dumps(forge))
        return forge

    def test_historical_engine_and_package_are_bound_to_git_not_changed_current_source(self):
        self.inventory['sourceCommit'] = self.source_commit
        self.save()
        self.write('package.json', json.dumps({'version': '4.0.0-alpha.3'}))
        self.write('studio/src/original.tsx', 'export const original = "new alpha.3 source";')
        self.assertNotEqual(current_engine(self.root), self.engine)
        report = validate(self.root)
        self.assertEqual(report['engine'], self.engine)
        self.assertEqual(report['sourceCommit'], self.source_commit)
        self.assertEqual(report['sourceMode'], 'historical')
        self.assertIn('Historical Git source', report['scope'])
        self.reject_edit(lambda inventory: inventory.update(engine=current_engine(self.root)), 'historical sourceCommit')

    def test_missing_historical_commit_invalid_sha_or_required_source_is_rejected(self):
        for commit in [None, '', 'HEAD', '0' * 40]:
            with self.subTest(commit=commit):
                self.reject_edit(lambda inventory: inventory.update(sourceCommit=commit), 'sourceCommit|Historical source commit')
        self.git('rm', '--cached', 'studio/requirements.txt')
        self.git('commit', '-q', '-m', 'Required historical source missing')
        bad_commit = self.git('rev-parse', 'HEAD')
        self.reject_edit(lambda inventory: inventory.update(sourceCommit=bad_commit), 'Historical production file is missing')

    def test_historical_version_cannot_claim_the_current_package_version(self):
        self.inventory['sourceCommit'] = self.source_commit
        self.save()
        self.write('package.json', json.dumps({'version': '4.0.0-alpha.3'}))
        self.reject_edit(lambda inventory: inventory.update(version='4.0.0-alpha.3'), 'Package version differs')

    def test_default_requires_new_current_inventory_instead_of_falling_back_to_old_media(self):
        with self.assertRaisesRegex(ValueError, 'Missing.*v4-forge-status'):
            validate_inventories(self.root)
        self.assertEqual(validate(self.root)['status'], 'pass')

    def test_current_forge_and_historical_alpha2_pass_independently_with_shared_real_pcm(self):
        forge = self.make_forge_inventory()
        report = validate_inventories(self.root)
        self.assertEqual(report['current']['sourceMode'], 'current')
        self.assertEqual(report['current']['frames'], 1350)
        self.assertEqual(report['historical']['sourceMode'], 'historical')
        self.assertEqual(report['historical']['frames'], 360)
        self.assertEqual(len({item['musicScore']['wav'] for item in forge['examples']}), 1)
        command = [sys.executable, str(self.root / 'scripts/validate_continuous_release.py')]
        completed = subprocess.run(command, capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(completed.stdout)['status'], 'pass')

    def test_current_forge_cannot_inherit_wrong_engine_or_use_historical_bypass(self):
        forge = self.make_forge_inventory()
        for change in [lambda value: value.update(engine=self.engine),
                       lambda value: value.update(sourceCommit=self.source_commit)]:
            with self.subTest(change=change):
                changed = copy.deepcopy(forge)
                change(changed)
                self.write(CURRENT_INVENTORY, json.dumps(changed))
                with self.assertRaisesRegex(ValueError, 'current production|current production engine'):
                    validate_inventory(self.root)
        self.write(CURRENT_INVENTORY, json.dumps(forge))
        self.inventory.pop('sourceCommit')
        self.save()
        with self.assertRaisesRegex(ValueError, 'Historical continuous inventory needs sourceCommit'):
            validate_inventories(self.root)

    def test_music_summary_clock_configuration_and_measurements_cannot_be_fabricated(self):
        forge = self.make_forge_inventory()
        for key, value in [('duration', 14.9), ('bpm', 120), ('bars', 7), ('events', 1),
                           ('volume', .7), ('rate', 44100), ('channels', 1),
                           ('peak', .4), ('rms', .2), ('events', True)]:
            with self.subTest(key=key):
                changed = copy.deepcopy(forge)
                changed['examples'][0]['musicScore'][key] = value
                self.write(CURRENT_INVENTORY, json.dumps(changed))
                with self.assertRaisesRegex(ValueError, 'musicScore|original music PCM'):
                    validate_inventory(self.root)
        changed = copy.deepcopy(forge)
        changed['examples'][0].pop('musicScore')
        self.write(CURRENT_INVENTORY, json.dumps(changed))
        with self.assertRaisesRegex(ValueError, 'musicScore'):
            validate_inventory(self.root)

    def test_music_wave_hash_and_actual_pcm_header_clock_are_required(self):
        forge = self.make_forge_inventory()
        score = forge['examples'][0]['musicScore']
        wav_file = self.root / score['wav']
        original = wav_file.read_bytes()
        wav_file.write_bytes(original + b'changed')
        with self.assertRaisesRegex(ValueError, 'music WAV bytes changed'):
            validate_inventory(self.root)
        wav_file.write_bytes(original)
        # Bind each modified WAV's actual bytes so header checks, rather than
        # merely the SHA check, must reject a wrongly timed PCM track.
        for mutation in ['rate', 'channels', 'truncated']:
            with self.subTest(mutation=mutation):
                changed = bytearray(original)
                if mutation == 'rate':
                    changed[24:28] = (44100).to_bytes(4, 'little')
                elif mutation == 'channels':
                    changed[22:24] = (1).to_bytes(2, 'little')
                else:
                    changed = changed[:-4]
                wav_file.write_bytes(changed)
                modified = copy.deepcopy(forge)
                for item in modified['examples']:
                    item['musicScore']['wavSha256'] = digest(wav_file)
                self.write(CURRENT_INVENTORY, json.dumps(modified))
                with self.assertRaisesRegex(ValueError, 'PCM header|PCM frame clock'):
                    validate_inventory(self.root)
        wav_file.write_bytes(original)

    def test_music_metadata_cannot_be_attached_to_a_project_without_a_score(self):
        self.item()['musicScore'] = {'style': 'forge-breakbeat'}
        self.save()
        with self.assertRaisesRegex(ValueError, 'without an authored score'):
            validate(self.root)

    def test_current_git_source_and_three_ratio_declarations_pass_with_explicit_scope(self):
        self.assertEqual(len(self.source_commit), 40)
        report = validate(self.root)
        self.assertEqual(report['continuous_examples_hash_checked'], 3)
        self.assertEqual(report['engine'], self.engine)
        self.assertEqual(report['frames'], 360)
        self.assertEqual(report['seconds'], 12)
        self.assertIn('declared checks verified', report['scope'])
        self.assertIn('No rerender', report['scope'])

    def test_changed_current_source_cannot_inherit_old_engine(self):
        self.write('studio/src/original.tsx', 'export const original = false;')
        self.assertNotEqual(current_engine(self.root), self.engine)
        with self.assertRaisesRegex(ValueError, 'differs from current production'):
            validate(self.root)

    def test_wrong_or_malformed_engine_hash_fails(self):
        for value in ['0' * 64, 'bad', True]:
            with self.subTest(value=value):
                self.reject_edit(lambda inventory: inventory.update(engine=value), 'engine|SHA256')

    def test_schema_version_package_and_date_must_match_release(self):
        for key, value in [('schemaVersion', 'heige-v4-release/1'), ('version', '4.0.0-alpha.1'), ('date', '2026-02-30')]:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory.update({key: value}), 'schema/version|date')
        self.write('package.json', json.dumps({'version': '4.0.0-alpha.1'}))
        with self.assertRaisesRegex(ValueError, 'Package version differs'):
            validate(self.root)

    def test_count_ids_project_and_video_paths_must_be_independent(self):
        cases = [
            (lambda inventory: inventory['examples'].pop(), 'three independent'),
            (lambda inventory: inventory['examples'][1].update(id=inventory['examples'][0]['id']), 'unique'),
            (lambda inventory: inventory['examples'][1].update(project=inventory['examples'][0]['project']), 'independent'),
            (lambda inventory: inventory['examples'][1].update(video=inventory['examples'][0]['video']), 'independent'),
        ]
        for change, expected in cases:
            with self.subTest(expected=expected):
                self.reject_edit(change, expected)

    def test_repeated_project_ratio_is_not_three_layouts(self):
        self.edited_project(lambda project: project.update(ratio='16:9'), 1)
        with self.assertRaisesRegex(ValueError, 'three independent ratios'):
            validate(self.root)

    def test_dimensions_fps_duration_and_decoded_frame_count_bind_compiled_project(self):
        for key, value in [('width', 1279), ('height', 719), ('fps', 25), ('duration', 4.1), ('frames', 119), ('decodedFrames', 119)]:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory['examples'][0].update({key: value}), 'dimensions/fps|quantized|compiled|complete encoded')

    def test_booleans_and_numeric_strings_are_not_frame_counts(self):
        for key, value in [('frames', True), ('decodedFrames', '120'), ('fps', 30.0), ('width', False), ('duration', '4')]:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory['examples'][0].update({key: value}), 'integer|finite number')

    def test_project_and_encoded_bytes_changes_fail_hash_binding(self):
        for key, expected in [('project', 'project bytes changed'), ('video', 'encoded video bytes changed')]:
            with self.subTest(key=key):
                file = self.root / self.item()[key]
                saved = file.read_bytes()
                file.write_bytes(saved + b' ')
                with self.assertRaisesRegex(ValueError, expected):
                    validate(self.root)
                file.write_bytes(saved)

    def test_asset_and_caption_bytes_changes_fail_hash_binding(self):
        directory = Path(self.item()['project']).parent
        for filename, expected in [('voice.wav', 'asset bytes'), ('voice.srt', 'subtitle bytes')]:
            with self.subTest(filename=filename):
                file = self.root / directory / filename
                saved = file.read_bytes()
                file.write_bytes(saved + b' ')
                with self.assertRaisesRegex(ValueError, expected):
                    validate(self.root)
                file.write_bytes(saved)

    def test_input_asset_keys_and_unsupported_brief_cannot_be_invented(self):
        self.reject_edit(lambda inventory: inventory['examples'][0]['input']['assets'].update(invented='0' * 64), 'asset bytes or IDs')
        self.reject_edit(lambda inventory: inventory['examples'][0]['input'].update(brief='0' * 64), 'unsupported brief')

    def test_missing_and_unknown_coverage_fields_are_rejected(self):
        keys = list(self.item()['continuity']['coverage'])
        for key in keys:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory['examples'][0]['continuity']['coverage'].pop(key), 'missing/unknown fields')
        self.reject_edit(lambda inventory: inventory['examples'][0]['continuity']['coverage'].update(observedFrames=120), 'missing/unknown fields')

    def test_structural_status_and_each_coverage_count_are_required(self):
        self.reject_edit(lambda inventory: inventory['examples'][0]['continuity'].update(status='pass'), 'structural-pass')
        for key in ['expectedFrames', 'measuredFrames', 'validFrames']:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory['examples'][0]['continuity']['coverage'].update({key: 119}), 'coverage is incomplete')
                self.reject_edit(lambda inventory: inventory['examples'][0]['continuity']['coverage'].update({key: True}), 'integer')

    def test_missing_invalid_duplicate_and_nonboolean_complete_coverage_fail(self):
        for key in ['missingFrames', 'invalidFrames', 'duplicateFrames']:
            for value in [[5], 0, None, {}]:
                with self.subTest(key=key, value=value):
                    self.reject_edit(lambda inventory: inventory['examples'][0]['continuity']['coverage'].update({key: value}), 'empty list')
        for value in [False, 1, 'true']:
            self.reject_edit(lambda inventory: inventory['examples'][0]['continuity']['coverage'].update(complete=value), 'must be true')

    def test_blur_sample_captures_and_encoded_frames_cannot_be_fabricated(self):
        for key, value in [('samples', 1), ('captures', 120), ('encodedFrames', 119), ('captures', True)]:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory['examples'][0]['blur'].update({key: value}), 'three actual captures|integer')

    def test_project_single_sample_cannot_claim_three_sample_acceptance(self):
        self.edited_project(lambda project: project['continuity']['blur'].update(samples=1))
        with self.assertRaisesRegex(ValueError, 'project must request three-sample'):
            validate(self.root)

    def test_mock_and_draft_cannot_be_promoted_even_with_new_project_hash(self):
        file = self.root / self.item()['project']
        original = file.read_bytes()
        for flag in ['draft', 'mock']:
            with self.subTest(flag=flag):
                if flag == 'draft':
                    self.edited_project(lambda project: project.update(draft=True))
                else:
                    self.edited_project(lambda project: project['audio'].update(kind='mock'))
                with self.assertRaisesRegex(ValueError, 'draft/mock cannot'):
                    validate(self.root)
                file.write_bytes(original)
                self.item()['input']['project'] = digest(file)
                self.save()

    def test_missing_world_and_invalid_camera_are_not_blessed_by_declared_structural_pass(self):
        file = self.root / self.item()['project']
        original = file.read_bytes()
        self.edited_project(lambda project: project.pop('continuity'))
        with self.assertRaisesRegex(ValueError, 'native continuous world'):
            validate(self.root)
        file.write_bytes(original)
        self.edited_project(lambda project: project['continuity']['camera'][0].update(zoom=0))
        with self.assertRaisesRegex(ValueError, 'Project contract failed'):
            validate(self.root)

    def test_preview_or_missing_technical_pass_fails(self):
        for key, value in [('status', 'preview'), ('technical', 'pending')]:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory['examples'][0].update({key: value}), 'production technical pass')

    def test_audio_is_present_finite_nonsilent_bounded_and_clock_aligned(self):
        cases = [('present', False), ('finite', False), ('peak', 0), ('peak', 1.001),
                 ('rms', 0), ('rms', .06), ('duration', 3.8), ('peak', '0.05'), ('finite', 1)]
        for key, value in cases:
            with self.subTest(key=key, value=value):
                self.reject_edit(lambda inventory: inventory['examples'][0]['audio'].update({key: value}), 'finite audio|finite number|duration disagrees')

    def test_extreme_json_integers_are_rejected_without_numeric_overflow(self):
        enormous = 10 ** 400
        for key in ['peak', 'rms', 'duration']:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory['examples'][0]['audio'].update({key: enormous}), 'finite number')
        self.reject_edit(lambda inventory: inventory['examples'][0].update(duration=enormous), 'finite number')

    def test_nonfinite_json_constants_and_duplicate_json_keys_are_rejected(self):
        for bad in [float('nan'), float('inf'), float('-inf')]:
            self.reject_edit(lambda inventory: inventory['examples'][0]['audio'].update(rms=bad), 'Non-finite JSON constant')
        raw = json.dumps(self.inventory)
        duplicated = raw.replace('"version": "4.0.0-alpha.2",', '"version": "4.0.0-alpha.2", "version": "4.0.0-alpha.2",', 1)
        self.write('references/v4-continuity-status.json', duplicated)
        with self.assertRaisesRegex(ValueError, 'Duplicate JSON key'):
            validate(self.root)

    def test_layout_and_playback_pass_cannot_be_claimed_for_other_bytes(self):
        self.reject_edit(lambda inventory: inventory['examples'][0]['layout'].update(errors=1), 'layout has declared errors')
        self.reject_edit(lambda inventory: inventory['examples'][0]['layout'].update(errors=False), 'integer')
        self.reject_edit(lambda inventory: inventory['examples'][0]['playback'].update(mp4Sha256='0' * 64), 'same MP4 bytes')
        self.reject_edit(lambda inventory: inventory['examples'][0]['playback'].update(status='pending'), 'playback must pass')
        for value in [-1, True, 0.5, '0']:
            self.reject_edit(lambda inventory: inventory['examples'][0]['playback'].update(droppedFrames=value), 'integer')

    def test_observed_dropped_frames_are_retained_without_claiming_zero(self):
        self.item()['playback']['droppedFrames'] = 2
        self.save()
        self.assertEqual(validate(self.root)['status'], 'pass')
        self.assertEqual(self.item()['playback']['droppedFrames'], 2)

    def test_visual_and_listening_scope_cannot_disappear_or_become_failed(self):
        for key, value in [('visualReview', 'pending'), ('audioListening', 'failed')]:
            self.reject_edit(lambda inventory: inventory['examples'][0][key].update(status=value), 'unsupported or failed review state')
        for key in ['visualReview', 'audioListening']:
            self.reject_edit(lambda inventory: inventory['examples'][0][key].pop('scope'), 'missing/unknown fields')
            self.reject_edit(lambda inventory: inventory['examples'][0][key].update(scope=''), 'nonempty text')

    def test_required_release_fields_and_unknown_nested_fields_are_strict(self):
        for key in ['continuity', 'blur', 'audio', 'playback', 'input', 'visualReview', 'audioListening']:
            with self.subTest(key=key):
                self.reject_edit(lambda inventory: inventory['examples'][0].pop(key), 'missing/unknown fields')
                self.reject_edit(lambda inventory: inventory['examples'][0][key].update(unmeasured=True), 'missing/unknown fields')
        self.reject_edit(lambda inventory: inventory.update(historicalFallback=True), 'missing/unknown fields')

    def test_malformed_project_audio_is_a_reviewable_error(self):
        self.edited_project(lambda project: project.update(audio=None))
        with self.assertRaisesRegex(ValueError, 'project audio must be an object'):
            validate(self.root)

    def test_local_paths_reject_traversal_urls_absolute_paths_and_symlinks(self):
        for value in ['examples/../project.json', 'https://example.invalid/film.mp4', str(self.root / self.item()['video']), 'demos//film.mp4']:
            with self.subTest(value=value):
                self.reject_edit(lambda inventory: inventory['examples'][0].update(video=value), 'Unsafe inventory path')
        file = self.root / self.item()['video']
        link = file.with_name('link.mp4')
        link.symlink_to(file.name)
        self.reject_edit(lambda inventory: inventory['examples'][0].update(video=str(link.relative_to(self.root))), 'Symlink inventory path')

    def test_asset_symlink_is_not_a_legal_local_input(self):
        directory = Path(self.item()['project']).parent
        self.write(str(directory / 'original.wav'), b'contract-only audio source')
        voice = self.root / directory / 'voice.wav'
        voice.unlink()
        voice.symlink_to('original.wav')
        with self.assertRaisesRegex(ValueError, 'Project contract failed'):
            validate(self.root)

    def test_cli_returns_json_pass_or_failure_without_stack_trace(self):
        command = [sys.executable, str(self.root / 'scripts/validate_continuous_release.py'), '--inventory', HISTORICAL_INVENTORY]
        passed = subprocess.run(command, capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(passed.stdout)['status'], 'pass')
        self.inventory['engine'] = '0' * 64
        self.save()
        failed = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(failed.returncode, 1)
        self.assertEqual(json.loads(failed.stderr)['status'], 'fail')
        self.assertNotIn('Traceback', failed.stderr)

    def test_verification_does_not_rewrite_inputs_media_or_inventory(self):
        files = ['references/v4-continuity-status.json']
        for item in self.inventory['examples']:
            files.extend([item['project'], item['video']])
            directory = str(Path(item['project']).parent)
            files.extend([directory + '/voice.wav', directory + '/voice.srt'])
        before = {name: (self.root / name).read_bytes() for name in files}
        validate(self.root)
        self.assertEqual(before, {name: (self.root / name).read_bytes() for name in files})


if __name__ == '__main__':
    unittest.main(verbosity=2)

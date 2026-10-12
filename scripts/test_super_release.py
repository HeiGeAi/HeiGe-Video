import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from validate_super_release import historical_engine, validate

ROOT = Path(__file__).resolve().parents[1]
INTEGRITY = ROOT / 'studio/lib/integrity.mjs'


def digest(data):
    return hashlib.sha256(data).hexdigest()


class HistoricalReleaseTests(unittest.TestCase):
    """Real Git histories and files; synthetic media bytes test hashes only."""

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='heige-history-test-')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.git_env = {**os.environ, 'GIT_CONFIG_NOSYSTEM': '1',
                        'GIT_CONFIG_GLOBAL': os.devnull}
        self.git('init', '-q')
        for file in ('package.json', 'package-lock.json', 'tsconfig.json',
                     'studio/CONTRACT.md', 'studio/requirements.txt'):
            self.write(file, '{}' if file.endswith('.json') else 'historical contract')
        self.write('studio/lib/integrity.mjs', INTEGRITY.read_text())
        self.write('studio/src/main.tsx', 'export const frame = 1;')
        self.write('studio/src/字形.ts', 'export const label = "真实资料";')
        # JS Array.sort uses UTF-16 units, unlike Python codepoint ordering.
        self.write('studio/src/😀.ts', 'export const face = 1;')
        self.write('studio/src/\ue000.ts', 'export const privateUse = 1;')
        for dir in ('test', 'node_modules', '__pycache__', '.cache'):
            self.write('studio/deep/' + dir + '/excluded.py', 'not engine source')
        self.write('studio/src/readme.md', 'not fingerprinted')
        self.write('studio/src/caps.TS', 'extensions are case sensitive')
        self.engine = self.node_engine()
        self.commit = self.commit_all()
        examples = []
        for index in range(5):
            directory = 'examples/fixture-' + str(index)
            asset = directory + '/assets/image.png'
            video = 'demos/fixture-' + str(index) + '.mp4'
            # These deliberately are not playable files. No decoding or render
            # acceptance is inferred from this inventory-integrity fixture.
            self.write(asset, b'synthetic input ' + str(index).encode())
            self.write(video, b'synthetic encoded bytes ' + str(index).encode())
            project = {'schemaVersion': 'heige-video/4', 'title': '历史样片',
                       'mode': 'explainer', 'theme': 'ledger', 'ratio': '16:9',
                       'assets': [{'id': 'image', 'path': 'assets/image.png'}],
                       'shots': [{'id': 'opening', 'type': 'hook',
                                  'title': '历史事实', 'duration': 3}]}
            project_path = directory + '/project.json'
            self.write(project_path, json.dumps(project, ensure_ascii=False))
            examples.append({'id': 'fixture-' + str(index), 'project': project_path,
                             'video': video, 'mp4Sha256': digest((self.root / video).read_bytes()),
                             'status': 'validated', 'technical': 'pass',
                             'frames': 90, 'decodedFrames': 90, 'duration': 3,
                             'layout': {'errors': 0},
                             'input': {'project': digest((self.root / project_path).read_bytes()),
                                       'assets': {'image': digest((self.root / asset).read_bytes())},
                                       'subtitles': None, 'brief': None},
                             'playback': {'mp4Sha256': digest((self.root / video).read_bytes())}})
        self.inventory = {'schemaVersion': 'heige-v4-release/1',
                          'sourceCommit': self.commit, 'engine': self.engine,
                          'examples': examples}
        self.save_inventory()

    def write(self, relative, content):
        file = self.root / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(content if isinstance(content, bytes) else content.encode())
        return file

    def git(self, *args):
        result = subprocess.run(['git', '-c', 'user.name=Historical fixture',
                                 '-c', 'user.email=fixture@example.invalid',
                                 '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false',
                                 *args], cwd=self.root, env=self.git_env,
                                capture_output=True, text=True, check=True)
        return result.stdout.strip()

    def commit_all(self):
        self.git('add', '-A', '-f')
        self.git('commit', '-q', '-m', 'Immutable historical fixture')
        return self.git('rev-parse', 'HEAD')

    def node_engine(self):
        script = ('import {engineFingerprint} from ' + json.dumps(INTEGRITY.as_uri()) +
                  ';console.log(engineFingerprint(process.argv[1]));')
        result = subprocess.run(['node', '--input-type=module', '-e', script,
                                 str(self.root)], capture_output=True, text=True, check=True)
        return result.stdout.strip()

    def save_inventory(self):
        self.write('references/v4-example-status.json', json.dumps(self.inventory))

    def test_git_blob_fingerprint_matches_actual_node_rules(self):
        self.assertEqual(historical_engine(self.root, self.commit), self.engine)
        result = validate(self.root)
        self.assertEqual(result['sourceCommit'], self.commit)
        self.assertEqual(result['v4_examples_hash_checked'], 5)

    def test_current_engine_edit_does_not_relabel_historical_evidence(self):
        self.write('studio/src/main.tsx', 'export const frame = 999;')
        self.assertNotEqual(self.node_engine(), self.engine)
        result = validate(self.root)
        self.assertEqual(result['engine'], self.engine)
        self.assertEqual(result['sourceCommit'], self.commit)

    def test_changed_fingerprint_is_rejected_even_with_existing_commit(self):
        self.inventory['engine'] = '0' * 64
        self.save_inventory()
        with self.assertRaisesRegex(ValueError, 'engine differs'):
            validate(self.root)

    def test_other_real_commit_cannot_inherit_old_engine(self):
        self.write('studio/src/main.tsx', 'export const frame = 2;')
        second = self.commit_all()
        self.assertNotEqual(second, self.commit)
        self.inventory['sourceCommit'] = second
        self.save_inventory()
        with self.assertRaisesRegex(ValueError, 'engine differs'):
            validate(self.root)

    def test_missing_commit_is_explicit_failure(self):
        self.inventory['sourceCommit'] = 'f' * 40
        self.save_inventory()
        with self.assertRaisesRegex(ValueError, 'Historical source commit is unavailable'):
            validate(self.root)

    def test_missing_git_repository_is_explicit_failure(self):
        shutil.rmtree(self.root / '.git')
        with self.assertRaisesRegex(ValueError, 'Historical source commit is unavailable'):
            validate(self.root)

    def test_commit_must_be_full_sha_not_ref_or_option(self):
        for value in (None, 'HEAD', self.commit[:8], '--all'):
            with self.subTest(value=value):
                self.inventory['sourceCommit'] = value
                self.save_inventory()
                with self.assertRaisesRegex(ValueError, 'full sourceCommit SHA'):
                    validate(self.root)

    def test_old_demo_changed_is_rejected(self):
        self.write(self.inventory['examples'][0]['video'], b'changed old media')
        with self.assertRaisesRegex(ValueError, 'Encoded video changed'):
            validate(self.root)

    def test_old_project_or_asset_changed_is_rejected(self):
        for field, message in (('project', 'Project changed'), ('asset', 'Assets changed')):
            with self.subTest(field=field):
                item = self.inventory['examples'][0]
                relative = item['project'] if field == 'project' else 'examples/fixture-0/assets/image.png'
                file = self.root / relative
                saved = file.read_bytes()
                self.write(relative, saved + b' ')
                with self.assertRaisesRegex(ValueError, message):
                    validate(self.root)
                file.write_bytes(saved)

    def test_historical_required_file_missing_is_rejected(self):
        (self.root / 'studio/CONTRACT.md').unlink()
        incomplete = self.commit_all()
        with self.assertRaisesRegex(ValueError, 'Historical production file is missing'):
            historical_engine(self.root, incomplete)

    def test_hash_still_binds_playback_record(self):
        self.inventory['examples'][0]['playback']['mp4Sha256'] = '0' * 64
        self.save_inventory()
        with self.assertRaisesRegex(ValueError, 'Playback record belongs'):
            validate(self.root)

    def test_draft_and_mock_history_cannot_be_promoted(self):
        original = (self.root / self.inventory['examples'][0]['project']).read_text()
        for flag in ('draft', 'mock'):
            with self.subTest(flag=flag):
                inventory = copy.deepcopy(self.inventory)
                item = inventory['examples'][0]
                file = self.root / item['project']
                project = json.loads(original)
                if flag == 'draft':
                    project['draft'] = True
                else:
                    project['audio'] = {'kind': 'mock'}
                self.write(item['project'], json.dumps(project))
                item['input']['project'] = digest(file.read_bytes())
                self.write('references/v4-example-status.json', json.dumps(inventory))
                with self.assertRaisesRegex(ValueError, 'Draft/mock incorrectly promoted'):
                    validate(self.root)


if __name__ == '__main__':
    unittest.main(verbosity=2)


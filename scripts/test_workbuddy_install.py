"""Black-box project-local WorkBuddy installation and preservation checks."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
NODE = os.environ.get('HEIGE_NODE') or shutil.which('node')


class WorkBuddyInstallTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='heige-workbuddy-')
        self.base = Path(self.temp.name).resolve()
        self.workspace = self.base / '中文 空格工作目录'
        self.workspace.mkdir()
        self.target = self.workspace / '.workbuddy/skills/heige-video'

    def tearDown(self):
        self.temp.cleanup()

    def install(self, *args, source=ROOT / 'scripts/install_workbuddy.mjs'):
        return subprocess.run([NODE, str(source), '--workspace', str(self.workspace), *args],
                              cwd=self.base, capture_output=True, text=True, timeout=20)

    def digest(self):
        return {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                for p in self.target.iterdir() if p.is_file()}

    def test_real_install_locate_from_unrelated_cwd_and_repeat(self):
        result = self.install()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['scope'], 'project-local')
        self.assertEqual(set(self.digest()), {'SKILL.md', 'run.mjs', 'repo.json', 'install-receipt.json'})
        located = subprocess.run([NODE, str(self.target / 'run.mjs'), 'locate'],
                                 cwd=self.base, capture_output=True, text=True, timeout=20)
        self.assertEqual(located.returncode, 0, located.stderr)
        self.assertEqual(Path(json.loads(located.stdout)['repo']), ROOT)
        self.assertEqual(self.install().returncode, 0)

    def test_install_through_real_symlink_repository_path(self):
        alias = self.base / '软链接 仓库'
        alias.symlink_to(ROOT, target_is_directory=True)
        result = self.install(source=alias / 'scripts/install_workbuddy.mjs')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(Path(json.loads((self.target / 'repo.json').read_text())['repo']), ROOT)

    def test_unknown_installation_is_preserved(self):
        self.target.mkdir(parents=True)
        custom = self.target / 'SKILL.md'
        custom.write_text('用户自己的技能', encoding='utf8')
        result = self.install()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('TARGET_CONFLICT', result.stderr)
        self.assertEqual(custom.read_text(), '用户自己的技能')

    def test_edited_owned_installation_is_preserved(self):
        self.assertEqual(self.install().returncode, 0)
        (self.target / 'SKILL.md').write_text('用户修改了技能', encoding='utf8')
        before = self.digest()
        self.assertNotEqual(self.install().returncode, 0)
        self.assertEqual(self.digest(), before)

    def test_additional_user_file_is_preserved(self):
        self.assertEqual(self.install().returncode, 0)
        (self.target / 'my-notes.md').write_text('不要覆盖', encoding='utf8')
        before = self.digest()
        self.assertNotEqual(self.install().returncode, 0)
        self.assertEqual(self.digest(), before)

    def test_symlink_target_is_not_modified(self):
        self.target.parent.mkdir(parents=True)
        external = self.base / 'existing-skill'
        external.mkdir()
        (external / 'SKILL.md').write_text('keep', encoding='utf8')
        self.target.symlink_to(external, target_is_directory=True)
        self.assertNotEqual(self.install().returncode, 0)
        self.assertEqual((external / 'SKILL.md').read_text(), 'keep')

    def test_symlink_parent_is_rejected_before_creating_external_directories(self):
        external = self.base / 'external-config'
        external.mkdir()
        (self.workspace / '.workbuddy').symlink_to(external, target_is_directory=True)
        result = self.install()
        self.assertEqual(result.returncode, 2, result.stdout)
        self.assertIn('symlink', result.stderr)
        self.assertEqual(list(external.iterdir()), [])

    def test_nested_symlink_parent_does_not_modify_an_external_skill(self):
        external = self.base / 'external-skills'
        external.mkdir()
        marker = external / 'keep.txt'
        marker.write_text('keep', encoding='utf8')
        (self.workspace / '.workbuddy').mkdir()
        (self.workspace / '.workbuddy/skills').symlink_to(external, target_is_directory=True)
        result = self.install()
        self.assertEqual(result.returncode, 2, result.stdout)
        self.assertIn('symlink', result.stderr)
        self.assertEqual(list(external.iterdir()), [marker])

    def test_dangling_symlink_parent_is_rejected_without_creating_its_destination(self):
        external = self.base / 'missing-config'
        (self.workspace / '.workbuddy').symlink_to(external, target_is_directory=True)
        result = self.install()
        self.assertEqual(result.returncode, 2, result.stdout)
        self.assertIn('symlink', result.stderr)
        self.assertFalse(external.exists())

    def test_duplicate_flags_are_rejected_without_install(self):
        self.assertNotEqual(self.install('--workspace', str(self.base)).returncode, 0)
        self.assertFalse(self.target.exists())

    def test_stale_pointer_is_a_diagnostic_not_success(self):
        self.assertEqual(self.install().returncode, 0)
        (self.target / 'repo.json').write_text(json.dumps({'schemaVersion': 1, 'repo': str(self.base / 'missing')}))
        result = subprocess.run([NODE, str(self.target / 'run.mjs'), 'locate'],
                                cwd=self.base, capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stderr)['status'], 'error')
        self.assertFalse(result.stdout)


if __name__ == '__main__':
    unittest.main()

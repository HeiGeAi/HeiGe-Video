import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from validate_package import validate_manifest, validate_package

ROOT=Path(__file__).resolve().parents[1]


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((ROOT/'examples/open-shot.json').read_text())
    def check(self,data):
        return validate_manifest(data,ROOT/'examples')
    def rejected(self,modify):
        data=copy.deepcopy(self.data)
        modify(data)
        with self.assertRaises(ValueError):self.check(data)
    def test_valid(self):
        self.assertEqual(self.check(self.data),1)
    def test_schema_types(self):
        for change in [lambda d:d.update(duration=True),lambda d:d.update(seed='uncontrolled'),lambda d:d['shots'][0].update(camera='oops')]:
            self.rejected(change)
    def test_object_fields(self):
        for key in ('identity','meaning'):
            self.rejected(lambda d:d['objects'][0].pop(key))
    def test_timeline_and_ids(self):
        self.rejected(lambda d:d['shots'][0].update(end=3))
        self.rejected(lambda d:d['shots'][0].update(subjects=['unknown']))
    def test_missing_artifact(self):
        def missing(d):
            c=d['shots'][0]['draw_code'];c.pop('inline');c['artifact']='missing.py'
        self.rejected(missing)
    def test_exclusive_code_shape(self):
        self.rejected(lambda d:d['shots'][0]['draw_code'].update(artifact='scene.py'))
    def test_event_audio_times(self):
        self.rejected(lambda d:d.update(events=[{'id':'late','time':999}]))
        self.rejected(lambda d:d.update(events=[{'id':'bad','time':True}]))
        self.rejected(lambda d:d['shots'][0].update(audio=[{'time':5,'duration':3}]))
        self.rejected(lambda d:d.update(events=[{'time':6,'end':3}]))
        self.rejected(lambda d:d['shots'][0].update(audio=[{'start':4,'duration':3}]))
    def test_explicit_gap(self):
        self.data['shots'][0]['end']=3
        self.data['intentional_gaps']=[{'start':3,'end':6,'reason':'Authored blank hold'}]
        self.assertEqual(self.check(self.data),1)


class PackageScopeTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        # Keep the real frontmatter but omit its links to non-fixture documents.
        frontmatter = (ROOT / 'SKILL.md').read_text().split('---', 2)[1].strip()
        self.add_file('SKILL.md', '---\n' + frontmatter + '\n---\n')
        for relative in ('examples/open-shot.json', 'references/research-cases.json', 'references/research-projects.json'):
            target = self.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, target)

    def add_file(self, relative, contents):
        target = self.root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(contents)
        return target

    def test_skips_installed_dependency_docs_and_json(self):
        # Reproduce the packaged Canvas README link that failed GitHub CI.
        for prefix in ('node_modules/@napi-rs/canvas', 'examples/custom/node_modules/dependency'):
            self.add_file(prefix + '/README.md', '[Chinese](./README-zh.md)\n')
            self.add_file(prefix + '/package.json', '{invalid dependency metadata')
        self.assertEqual(validate_package(self.root)['package_structure'], 'pass')

    def test_skips_generated_cache_and_vcs_trees(self):
        for prefix in ('.git', '.hg', '.svn', 'build', 'dist', 'outputs', 'renders',
                       'coverage', 'htmlcov', '.next', '.cache', '__pycache__',
                       '.pytest_cache', '.mypy_cache', '.ruff_cache', '.venv',
                       'venv', '.tox', '.nox', 'runtime/.cache', 'examples/custom/build'):
            self.add_file(prefix + '/README.md', '[Generated](missing.md)\n')
            self.add_file(prefix + '/generated.json', '{invalid generated metadata')
        self.assertEqual(validate_package(self.root)['json_parse'], 'pass')

    def test_rejects_broken_authored_links(self):
        # Exact directory names are excluded, not substrings or all dot folders.
        for relative in ('guide.md', 'references/deep/guide.md',
                         'examples/node_modules-guide/README.md', '.github/docs/guide.md'):
            with self.subTest(relative=relative):
                target = self.add_file(relative, '[Authored link](missing-authored-file.md)\n')
                with self.assertRaisesRegex(ValueError, 'Broken package link'):
                    validate_package(self.root)
                target.unlink()

    def test_rejects_invalid_authored_json(self):
        self.add_file('examples/custom/data.json', '{invalid authored data')
        with self.assertRaises(json.JSONDecodeError):
            validate_package(self.root)

    def test_rejects_private_path_in_authored_markdown(self):
        self.add_file('references/custom.md', 'Nonportable path: /Users/example/source\n')
        with self.assertRaisesRegex(ValueError, 'Nonportable private path'):
            validate_package(self.root)


if __name__=='__main__':unittest.main(verbosity=2)

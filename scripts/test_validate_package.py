import copy
import json
from pathlib import Path
import unittest
from validate_package import validate_manifest

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


if __name__=='__main__':unittest.main(verbosity=2)

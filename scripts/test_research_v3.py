import copy
import json
from pathlib import Path
import unittest
import tempfile
import hashlib
from select_references import load_records, select
from validate_package import validate_research, validate_example_inventory

ROOT=Path(__file__).resolve().parents[1]

class ResearchValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.video=json.loads((ROOT/'references/research-cases.json').read_text())
        cls.project=json.loads((ROOT/'references/research-projects.json').read_text())
    def reject(self, base, change):
        value=copy.deepcopy(base);change(value)
        with self.assertRaises(ValueError):validate_research(value)
    def test_counts_follow_declared_metadata(self):
        self.assertEqual(validate_research(self.video),100)
        self.assertEqual(validate_research(self.project),100)
        # A future truthfully declared smaller dataset is valid; no frozen 58/51 or100 assertion.
        value=copy.deepcopy(self.video);value['cases']=value['cases'][:1];r=value['cases'][0]
        value['metadata'].update(record_count=1,distinct_media_hashes=1,distinct_media_urls=1,categories={r['category']:1},groups={r['research_group']:1},baseline_reinspected=int(r['baseline_reinspected']),new_to_baseline=int(not r['baseline_reinspected']))
        self.assertEqual(validate_research(value),1)
    def test_rejects_duplicates_and_false_counts(self):
        self.reject(self.video,lambda d:d['cases'][1].update(source_sha256=d['cases'][0]['source_sha256']))
        self.reject(self.video,lambda d:d['cases'][1].update(media_url=d['cases'][0]['media_url']))
        self.reject(self.video,lambda d:d['metadata'].update(record_count=101))
        self.reject(self.video,lambda d:d['metadata']['categories'].update({'mechanism-reference':100}))
        self.reject(self.project,lambda d:d['projects'][1].update(canonical_repo=d['projects'][0]['canonical_repo'].upper()))
    def test_rejects_unearned_review_and_execution(self):
        self.reject(self.video,lambda d:d['cases'][0]['coverage'].update(realtime_playback_completed=True))
        self.reject(self.video,lambda d:d['cases'][0]['coverage'].update(audio_listening_completed=True))
        self.reject(self.project,lambda d:d['projects'][0].update(execution_verified=True))
        self.reject(self.video,lambda d:d['metadata'].update(model_benchmark_performed=True))
    def test_requires_coverage_and_license(self):
        self.reject(self.video,lambda d:d['cases'][0]['coverage'].update(dense_sample_timestamps_seconds=[]))
        self.reject(self.video,lambda d:d['cases'][0]['coverage']['dense_sample_timestamps_seconds'].append(99999))
        self.reject(self.video,lambda d:d['cases'][0].update(rights=''))
        self.reject(self.project,lambda d:d['projects'][0].update(license={}))
        self.reject(self.project,lambda d:d['projects'][0].update(source_evidence=[]))
    def test_private_paths_are_rejected(self):
        for private in ('/Users/name/movie.mp4','/workspace/research/a.json','/home/name/a','C:\\Users\\name\\a'):
            self.reject(self.video,lambda d:d['cases'][0]['limits'].append(private))

class ExampleInventoryTests(unittest.TestCase):
    def test_source_or_media_changes_invalidate_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            for path,content in (('film.cjs',b'original source'),('film.mp4',b'fixture bytes'),('verification.json',b'{}')):
                (root/path).write_bytes(content)
            example={'id':'fixture','source':'film.cjs','media':'film.mp4','verification':'verification.json','review_scope':'Fixture integrity only'}
            for field in ('source','media'):example[field+'_sha256']=hashlib.sha256((root/example[field]).read_bytes()).hexdigest()
            data={'schema_version':'heige-example-status/3','examples':[example]}
            self.assertEqual(validate_example_inventory(data,root),1)
            (root/'film.cjs').write_text('changed source')
            with self.assertRaisesRegex(ValueError,'hash mismatch'):validate_example_inventory(data,root)
    def test_rejects_path_escape(self):
        with tempfile.TemporaryDirectory() as directory:
            data={'schema_version':'heige-example-status/3','examples':[{'id':'escape','source':'../secret'}]}
            with self.assertRaisesRegex(ValueError,'package-relative'):validate_example_inventory(data,Path(directory))

class ReferenceSelectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.records=load_records()
    def test_default_packet_is_small_and_excludes_controls(self):
        out=select(self.records)
        self.assertEqual(len(out),4)
        self.assertEqual({r['kind'] for r in out},{'videos','projects'})
        self.assertNotIn('control-or-negative',{r['category'] for r in out})
        self.assertEqual(out,select(self.records))
    def test_controls_require_explicit_request(self):
        out=select(self.records,controls='only',limit=20)
        self.assertEqual(len(out),17)
        self.assertEqual({r['category'] for r in out},{'control-or-negative'})
        self.assertEqual(select(self.records,controls='only',kind='projects'),[])
    def test_query_and_style_are_applied(self):
        out=select(self.records,query='水墨',style='ink',kind='videos',limit=3)
        self.assertTrue(out)
        self.assertTrue(all(r['selection_reason']['matched_terms'] for r in out))
        self.assertTrue(all(r['kind']=='videos' for r in out))
        self.assertEqual(select(self.records,query='no-such-unique-token-zx123'),[])
    def test_invalid_limits_fail(self):
        for limit in (0,21,True,2.5):
            with self.assertRaises(ValueError):select(self.records,limit=limit)
    def test_packet_retains_caveats_and_provenance(self):
        for r in select(self.records,limit=10):
            self.assertTrue(r['limits']);self.assertTrue(r['source_url']);self.assertTrue(r['inspection_level'])
            if r['kind']=='videos':self.assertIn('rights',r)
            else:self.assertTrue(r['source_evidence']);self.assertIn('license',r)

if __name__=='__main__':unittest.main()

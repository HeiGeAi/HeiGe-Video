import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT=Path(__file__).with_name('export_prompt.py')

class PromptExportTests(unittest.TestCase):
    def test_includes_concrete_contract_and_schema(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);brief=d/'brief.txt';brief.write_text('20-second Chinese data explanation, original synthetic data.')
            out=d/'export.json'
            result=subprocess.run([sys.executable,str(SCRIPT),'--style','dataviz','--brief',str(brief),'--out',str(out)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            payload=json.loads(out.read_text());self.assertEqual(len(payload['messages']),2)
            text=payload['messages'][0]['content']
            for name in ('runtime-adapter.md','shot.schema.json','model-harness.md'):
                self.assertIn('SOURCE FILE: references/'+name,text)
            self.assertIn('render(ctx,t,options)',text)
            self.assertEqual(json.loads(result.stdout)['backend'],'canvas')
            self.assertEqual(json.loads(result.stdout)['selected_reference_count'],3)
            self.assertEqual(json.loads(result.stdout)['network_requests'],0)
    def test_refuses_existing_output(self):
        with tempfile.TemporaryDirectory() as d:
            d=Path(d);brief=d/'brief.txt';brief.write_text('Brief');out=d/'keep.json';out.write_text('preserve')
            result=subprocess.run([sys.executable,str(SCRIPT),'--style','ink','--brief',str(brief),'--out',str(out)],capture_output=True,text=True)
            self.assertNotEqual(result.returncode,0);self.assertEqual(out.read_text(),'preserve')

if __name__=='__main__':unittest.main(verbosity=2)

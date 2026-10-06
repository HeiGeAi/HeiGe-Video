import json
from pathlib import Path
import shutil
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which('node'), 'Node unavailable')
class MotionTests(unittest.TestCase):
    def evaluate(self, body):
        script = f'const m = require({json.dumps(str(ROOT / "motion.cjs"))}); const assert = require("node:assert/strict");\n' + body
        result = subprocess.run(['node', '-e', script], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_named_cues_are_half_open_and_random_access(self):
        self.evaluate('''
const cues = m.createCues({enter:[1,2], settle:{start:2,end:4,ease:m.easeOutCubic}});
assert.equal(cues.at('enter',1).active,true); assert.equal(cues.at('enter',2).active,false);
assert.equal(cues.at('enter',2).finished,true); assert.equal(cues.at('enter',0).progress,0);
const a = cues.at('settle',3); cues.at('enter',9); assert.deepEqual(cues.at('settle',3),a);
assert.equal(a.eased,0.875); assert.throws(()=>cues.at('missing',0)); assert.throws(()=>cues.at('toString',0));
assert.throws(()=>m.createCues({bad:[1,1]}));
''')

    def test_closed_form_springs_have_no_step_dependency(self):
        self.evaluate('''
for(const dampingRatio of [0.5,1,2]){
  const opts = {from:4,to:10,frequencyHz:2,dampingRatio,velocity:3};
  assert.equal(m.spring(-1,opts),4); assert.equal(m.spring(0,opts),4);
  const v = m.spring(.27,opts); m.spring(3,opts); assert.equal(m.spring(.27,opts),v);
  assert.ok(Math.abs((m.spring(1e-6,opts)-4)/1e-6-3)<0.01);
  assert.ok(Math.abs(m.spring(10,opts)-10)<1e-8);
}
assert.throws(()=>m.spring(1,{frequencyHz:0}));
''')

    def test_camera_registration_matches_matrix(self):
        self.evaluate('''
const camera = {x:13,y:9,zoom:1.7,rotation:.4}, viewport={width:1920,height:1080};
assert.deepEqual(m.worldToScreen({x:13,y:9},camera,viewport),{x:960,y:540});
let applied; m.applyCamera({transform:(...args)=>applied=args},camera,viewport);
assert.deepEqual(applied,m.cameraMatrix(camera,viewport));
const p={x:30,y:8}, [a,b,c,d,e,f]=applied;
assert.deepEqual(m.worldToScreen(p,camera,viewport),{x:a*p.x+c*p.y+e,y:b*p.x+d*p.y+f});
''')

    def test_seeded_noise_and_geometric_stroke_fronts(self):
        self.evaluate('''
const noise=m.noiseAt(4,'ink/object-a'); m.noiseAt(4,'unrelated'); assert.equal(m.noiseAt(4,'ink/object-a'),noise);
assert.notEqual(noise,m.noiseAt(4,'ink/object-b'));
const a=m.seededRandom(6),b=m.seededRandom(6); for(let i=0;i<10;i++)assert.equal(a(),b());
const path=[{x:0,y:0,pressure:.2},{x:10,y:0,pressure:1},{x:10,y:10,pressure:.5}];
const quarter=m.trimPolyline(path,.25); assert.equal(quarter.at(-1).x,5); assert.equal(quarter.at(-1).y,0); assert.ok(Math.abs(quarter.at(-1).pressure-.6)<1e-12);
assert.equal(m.trimPolyline(path,.75).at(-1).y,5);
assert.deepEqual(m.trimPolyline(path,1),path); assert.equal(path[1].x,10);
const tips=[0,.25,.5,.75,1].map(p=>m.trimPolyline(path,p).at(-1)); assert.equal(new Set(tips.map(p=>`${p.x},${p.y}`)).size,5);
''')


if __name__ == '__main__': unittest.main(verbosity=2)

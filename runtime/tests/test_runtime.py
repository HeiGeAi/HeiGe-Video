import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import render_video as rv
from raster import SvgRasterizer, validate_svg


class RuntimeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.font,cls.cmap=rv.font_info('Noto Sans CJK SC')

    def test_safety_external_resources(self):
        for body in ['<script/>','<foreignObject/>','<animate/>','<style/>','<image href="https://example.test/a.png"/>','<rect fill="url(file:///tmp/a)"/>','<rect onclick="x()"/>']:
            with self.subTest(body=body),self.assertRaises(ValueError):
                validate_svg(f'<svg xmlns="http://www.w3.org/2000/svg">{body}</svg>')
        with self.assertRaises(ValueError): validate_svg('<!DOCTYPE svg><svg/>')

    def test_color_channels_and_viewport(self):
        svg='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="#ff0000"/></svg>'
        with SvgRasterizer(40,40) as raster:
            rgba=raster.render(svg)
        self.assertEqual(rgba,bytes([255,0,0,255])*40*40)

    def test_dimensions_and_fps_rejection(self):
        for width,height,fps in [(99,100,'24'),(100,99,'24'),(100,100,'0'),(100,100,'121')]:
            args=argparse.Namespace(width=width,height=height,command='render',start=0,time=0,fps=fps,duration=1,crf=18)
            with self.assertRaises(ValueError): rv.validate_args(args)

    def test_refuse_nonempty_output(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d);(path/'keep.txt').write_text('preserve')
            with self.assertRaises(FileExistsError):rv.new_output(path)
            self.assertEqual((path/'keep.txt').read_text(),'preserve')

    def test_three_sources_out_of_order_and_raster_repeat(self):
        for style in rv.STYLES:
            with self.subTest(style=style):
                path=rv.DEFAULT_SOURCE_DIR/f'{style}.py';original=path.read_bytes()
                source=rv.SvgSource(path,'Noto Sans CJK SC',320,180)
                try:
                    times=rv.PREVIEW_TIMES[style]
                    first={t:source.module.render(t) for t in times}
                    second={t:source.module.render(t) for t in reversed(times)}
                    self.assertEqual(first,second)
                    a,svg=source.frame(times[1])
                    source.frame(times[3])
                    b,_=source.frame(times[1])
                    self.assertEqual(a,b)
                    self.assertGreater(len(set(a)),20)
                    self.assertNotIn('PingFang',svg)
                    self.assertFalse([c for c in source.chars if not c.isspace() and ord(c) not in self.cmap])
                    self.assertEqual(path.read_bytes(),original)
                finally:source.close()

    def test_custom_dataclass_annotations_and_module_lifetime(self):
        scene = """from __future__ import annotations
from dataclasses import dataclass
from typing import ClassVar, get_type_hints
DURATION = 2
@dataclass
class Marker:
    x: float = 1.0
    scale: ClassVar[float] = 2.0
def render(t):
    assert get_type_hints(Marker)['x'] is float
    assert Marker(t).x == t
    return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#c03020"/></svg>'
"""
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'dataclass_scene.py';path.write_text(scene)
            first=rv.SvgSource(path,'Noto Sans CJK SC',20,20)
            second=rv.SvgSource(path,'Noto Sans CJK SC',20,20)
            try:
                self.assertIs(sys.modules[first.module_name],first.module)
                self.assertIs(sys.modules[second.module_name],second.module)
                self.assertNotEqual(first.module_name,second.module_name)
                self.assertEqual(first.frame(.5)[0],second.frame(.5)[0])
                first.close()
                self.assertNotIn(first.module_name,sys.modules)
                self.assertIs(sys.modules[second.module_name],second.module)
                self.assertEqual(len(second.frame(1)[0]),20*20*4)
                self.assertEqual(path.read_text(),scene)
            finally:
                first.close();second.close()
            self.assertNotIn(second.module_name,sys.modules)
            self.assertFalse((path.parent/'__pycache__').exists())

    def test_failed_custom_import_cleans_module_registration(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'bad_scene.py'
            for code,error in [("raise RuntimeError('expected import failure')",RuntimeError),('VALUE = 1',ValueError)]:
                with self.subTest(code=code):
                    path.write_text(code)
                    before={name for name in sys.modules if name.startswith('video_source_')}
                    old_bytecode=sys.dont_write_bytecode
                    with self.assertRaises(error): rv.SvgSource(path,'Noto Sans CJK SC',20,20)
                    self.assertEqual(before,{name for name in sys.modules if name.startswith('video_source_')})
                    self.assertEqual(sys.dont_write_bytecode,old_bytecode)

    @unittest.skipUnless(shutil.which('node') and subprocess.run(['node','-e',"require('@napi-rs/canvas')"],capture_output=True).returncode == 0, 'optional Canvas dependency unavailable')
    def test_canvas_out_of_order_repeat(self):
        source=rv.CanvasSource(ROOT/'examples/canvas_smoke.cjs','Noto Sans CJK SC',320,180,self.font)
        try:
            a,_=source.frame(.7);source.frame(1.7);b,_=source.frame(.7)
            self.assertEqual(a,b)
            self.assertEqual(len(a),320*180*4)
            self.assertGreater(len(set(a)),20)
        finally:source.close()

    def test_custom_label_is_display_only_and_filename_is_fixed(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);scene=root/'data_scene.py';out=root/'video'
            scene.write_text('DURATION = 1\ndef render(t):\n    return \'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#dd4422"/></svg>\'\n')
            label='数据观察 / ../outside'
            result=subprocess.run([sys.executable,str(ROOT/'render_video.py'),'render','--source',str(scene),'--style','whiteboard','--label',label,'--duration','1','--fps','2','--width','40','--height','20','--out',str(out)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            report=json.loads((out/'manifest.json').read_text())
            self.assertEqual(report['label'],label)
            self.assertEqual(report['style'],label)
            self.assertIsNone(report['source_preset'])
            self.assertEqual(report['review_preset'],'whiteboard')
            self.assertEqual(report['source']['path'],str(scene.resolve()))
            self.assertEqual(report['video'],'video.mp4')
            self.assertTrue((out/'video.mp4').is_file())
            self.assertFalse((out/'whiteboard.mp4').exists())
            self.assertFalse((root/'outside').exists())
            self.assertTrue((out/'contact-sheet.jpg').is_file())
            self.assertIn('bold',report['font']['provenance_scope'])
            args=argparse.Namespace(label=None,source=scene,style='tech')
            self.assertEqual(rv.display_label(args),'data_scene')

    def test_label_rejects_control_characters_and_excessive_length(self):
        for label in ['', '   ', 'line\nline', 'nul\0label', 'x'*121]:
            with self.subTest(label=label),self.assertRaises(ValueError):
                rv.display_label(argparse.Namespace(label=label,source=None,style='tech'))

    def test_encoded_smoke(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'video'
            result=subprocess.run([sys.executable,str(ROOT/'render_video.py'),'render','--style','tech','--duration','1','--fps','6','--width','320','--height','180','--out',str(out)],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            report=json.loads((out/'manifest.json').read_text())
            self.assertEqual(report['frame_count'],6)
            self.assertTrue(all(report['checks'].values()))
            self.assertTrue((out/'contact-sheet.jpg').is_file())
            self.assertIn('not aesthetic approval',report['visual_review'])
            out2=Path(d)/'video-repeat'
            repeated=subprocess.run([sys.executable,str(ROOT/'render_video.py'),'render','--style','tech','--duration','1','--fps','6','--width','320','--height','180','--out',str(out2)],capture_output=True,text=True)
            self.assertEqual(repeated.returncode,0,repeated.stderr)
            self.assertEqual((out/'tech.mp4').read_bytes(),(out2/'tech.mp4').read_bytes())


if __name__=='__main__':unittest.main(verbosity=2)

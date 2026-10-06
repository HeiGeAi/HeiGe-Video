#!/usr/bin/env python3
"""Project-specific factual, manifest, font-bound and actual-raster checks.
This is not a visual-review substitute and does not download anything.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import statistics
import subprocess
import sys
import xml.etree.ElementTree as ET

sys.dont_write_bytecode=True
P=Path(__file__).resolve().parent
ROOT=P.parents[1]
sys.path.insert(0,str(ROOT/'runtime'))
sys.path.insert(0,str(ROOT/'scripts'))
import render_video as rv
from validate_package import validate_manifest
from PIL import ImageFont
import film
from fontTools.ttLib import TTFont


def sha(data):return hashlib.sha256(data).hexdigest()

def assert_data_state(v,t,initial,final):
    values=[v[k] for k in 'ABCDE']
    assert values[:4]==initial[:4]
    assert initial[4]<=v['E']<=final[4]
    assert math.isclose(v['mean'],sum(values)/5,abs_tol=1e-10)
    assert statistics.median(values)==v['median']==10
    if t<=6:
        assert values==initial and v['mean']==statistics.mean(initial), 'Initial settled state disagrees with data'
    if t>=9:
        assert values==final and v['mean']==statistics.mean(final), 'Final settled state disagrees with data'


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--video',type=Path,help='Optional existing encoded file to fully decode and check')
    p.add_argument('--report',type=Path,help='New output JSON report; refuses overwrite')
    a=p.parse_args()
    if a.report and a.report.exists():raise FileExistsError(a.report)
    data=json.loads((P/'data.json').read_text())
    manifest=json.loads((P/'shot-manifest.json').read_text())
    validate_manifest(manifest,P)
    initial=[r['initial'] for r in data['records']];final=[r['final'] for r in data['records']]
    assert initial==[8,9,10,11,12] and final==[8,9,10,11,62]
    assert sum(initial)==50 and sum(final)==100
    assert statistics.mean(initial)==10 and statistics.mean(final)==20
    assert statistics.median(initial)==statistics.median(final)==10
    assert sum(x<20 for x in final)==4
    assert [r['id'] for r in data['records']]==list('ABCDE')
    assert film.DOMAIN==tuple(data['domain'])==(0,65)
    assert [(s['start'],s['end']) for s in manifest['shots']]==[(0,4),(4,6),(6,9),(9,11.7),(11.7,15.5),(15.5,20)]
    font,coverage=rv.font_info(film.FONT)
    faces={False:(font['path'],font['face_index'])}
    bold=subprocess.run(['fc-match',film.FONT+':style=Bold','--format=%{family}\n%{style}\n%{file}\n%{index}\n'],check=True,capture_output=True,text=True).stdout.splitlines()
    assert film.FONT.casefold() in bold[0].casefold() and 'bold' in bold[1].casefold(),bold
    faces[True]=(bold[2],int(bold[3]));fontcache={};bounds=[];allchars=set()
    face_coverage={}
    for key,(path,index) in faces.items():
        face=TTFont(path,fontNumber=index,lazy=True)
        face_coverage[key]=set((face.getBestCmap() or {}).keys());face.close()
    used_by_face={False:set(),True:set()}
    for n in range(480):
        t=n/24;v=film.value_state(t)
        assert_data_state(v,t,initial,final)
        root=ET.fromstring(film.render(t));marks=[e for e in root.iter() if e.get('id','').startswith('mark-')]
        assert {e.get('id') for e in marks}=={'mark-'+k for k in 'ABCDE'}
        for e in marks:
            key=e.get('id')[-1];assert math.isclose(float(e.get('cx')),200+14*v[key],abs_tol=.001)
            assert math.isclose(float(e.get('cy')),244+list('ABCDE').index(key)*56,abs_tol=.001)
        bars={e.get('id')[-1]:e for e in root.iter() if e.get('id','').startswith('bar-')}
        assert set(bars)==set('ABCDE')
        for key,e in bars.items():assert math.isclose(float(e.get('width')),v[key]*14,abs_tol=.001)
        mean_rules=[e for e in root.iter() if e.tag.endswith('line') and e.get('stroke')==film.C['mean'] and e.get('stroke-dasharray')]
        assert len(mean_rules)==int(t>1)
        if mean_rules:
            assert math.isclose(float(mean_rules[0].get('x1')),200+14*v['mean'],abs_tol=.001)
            assert math.isclose(float(mean_rules[0].get('x2')),200+14*v['mean'],abs_tol=.001)
        values={e.get('id')[-1]:''.join(e.itertext()) for e in root.iter() if e.get('id','').startswith('value-')}
        expected_labels={key:('变化中' if key=='E' and 6<t<9 else str(int(v[key]))) for key in 'ABCDE'}
        assert values==expected_labels
        for e in root.iter():
            if not e.tag.endswith('text'):continue
            text=''.join(e.itertext());allchars.update(ord(c) for c in text)
            size=int(e.get('font-size'));isbold=int(e.get('font-weight',400))>=600;key=(size,isbold)
            used_by_face[isbold].update(ord(c) for c in text)
            if key not in fontcache:fontcache[key]=ImageFont.truetype(faces[isbold][0],size,index=faces[isbold][1])
            f=fontcache[key];x=float(e.get('x'));y=float(e.get('y'));length=f.getlength(text);anchor=e.get('text-anchor','start')
            x=x-length/2 if anchor=='middle' else x-length if anchor=='end' else x
            left,top,right,bottom=f.getbbox(text,anchor='ls');box=(x+left,y+top,x+right,y+bottom)
            if box[0]<0 or box[1]<0 or box[2]>1280 or box[3]>720:bounds.append({'frame':n,'text':text,'bounds':box})
    assert not bounds,bounds[:10]
    for key,chars in used_by_face.items():assert chars<=face_coverage[key], chars-face_coverage[key]
    for event in manifest['events']:
        for t in (max(0,event['time']-1/24),event['time'],min(479/24,event['time']+1/24)):
            ET.fromstring(film.render(t))
    source=rv.SvgSource(P/'film.py',film.FONT,1280,720)
    times=[0,1,1.8,2,4,6,6.2,6.5,7.5,8.8,9,11.69,11.7,12.5,15.5,16.2,479/24]
    try:
        first={}
        for t in times[::2]+times[1::2]:
            pix,svg=source.frame(t);first[t]=(sha(pix),sha(svg.encode()))
        for t in reversed(times):
            pix,svg=source.frame(t);assert first[t]==(sha(pix),sha(svg.encode()))
        pix,_=source.frame(18);pixel18=sha(pix)
    finally:source.close()
    result={'status':'pass','source_sha256':sha((P/'film.py').read_bytes()),'data_sha256':sha((P/'data.json').read_bytes()),'manifest_shots':6,'settled_initial_final_states_checked':True,'actual_bar_width_mean_rule_and_value_label_checks':480,'font_coverage_checked_per_used_face':True,'all_frame_data_identity_and_text_bounds':480,'determinism_timestamps':times,'svg_and_raster_repeat_equal':True,'frame18_raw_sha256':pixel18,'font_faces':{('Bold' if k else 'Regular'):{'family':film.FONT,'filename':Path(path).name,'index':index,'sha256':sha(Path(path).read_bytes())} for k,(path,index) in faces.items()},'missing_codepoints':[],'out_of_bounds':[],'visual_review':'not performed by this script','playback':'not tested','audio_listening':'not tested'}
    if a.video:
        subprocess.run(['ffmpeg','-v','error','-i',str(a.video),'-f','null','-'],check=True,capture_output=True)
        probe=json.loads(subprocess.run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(a.video)],check=True,capture_output=True,text=True).stdout)
        assert len(probe['streams'])==1
        video=probe['streams'][0]
        assert video['codec_type']=='video' and int(video['nb_read_frames'])==480
        assert [video['width'],video['height']]==[1280,720] and video['r_frame_rate']=='24/1'
        assert abs(float(video['duration'])-20)<.001
        result['encoded_video']={'sha256':sha(a.video.read_bytes()),'full_decode':'pass','frames':480,'dimensions':[1280,720],'duration':20,'fps':24,'audio_tracks':0}
    if a.report:
        a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':main()

#!/usr/bin/env python3
"""Original Swiss kinetic typography prototype. SVG(t), no runtime state or assets."""
import base64
import html
import json
import math
import subprocess
from pathlib import Path

W, H, DURATION = 1920, 1080, 30
PAPER, BLACK, RED, GRID = '#f4f1e7', '#161816', '#d52b23', '#d5d2c7'
FONT = 'Noto Sans CJK SC'
WORDS = ['灵感', '阅读', '观察', '问题', '草稿', '实验', '图像', '笔记', '片段',
         '概念', '证据', '复盘', '方法', '答案', '原文', '实践', '联系']
SCATTER = [(170,170),(1290,155),(1480,360),(740,200),(1595,800),(190,800),
           (1430,975),(1380,690),(590,870),(195,410),(1590,545),(900,910),
           (420,575),(1640,180),(950,125),(1180,920),(1360,490)]
ORDER = [(200,290),(530,210),(520,450),(850,340),(170,640),(550,700),
         (970,700),(1180,450),(1450,250),(1600,700),(1580,430),(1430,980),
         (910,1000),(1250,680),(1160,200),(1760,940),(1030,490)]
EDGES = [(0,1),(0,4),(1,2),(1,3),(2,5),(3,7),(3,16),(4,5),(5,6),(6,16),
         (7,13),(7,8),(8,9),(8,10),(9,15),(10,11),(11,12),(13,14),(14,9)]

def mix(a, b, p): return a + (b-a)*p
def ramp(t, a, b): return max(0, min(1, (t-a)/(b-a)))
def ease(p): return p*p*(3-2*p)  # monotonic; no spring or overshoot
def txt(x, y, text, size, color=BLACK, weight=600, anchor='start'):
    return (f'<text x="{x:.2f}" y="{y:.2f}" fill="{color}" font-family="{FONT}" '
            f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">'
            f'{html.escape(text)}</text>')
def line(x1,y1,x2,y2,color=BLACK,width=3,opacity=1):
    return f'<path d="M{x1:.2f},{y1:.2f} L{x2:.2f},{y2:.2f}" fill="none" stroke="{color}" stroke-width="{width}" opacity="{opacity}"/>'
def circle(x,y,r,fill=BLACK,stroke='none',width=2):
    return f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'
def grid():
    return ''.join(line(x,0,x,H,GRID,1,.55) for x in range(0,W+1,120)) + ''.join(line(0,y,W,y,GRID,1,.55) for y in range(0,H+1,120))
def nodes(t):
    p=ease(ramp(t,5.2,11.2))
    return [(mix(a[0],b[0],p),mix(a[1],b[1],p)) for a,b in zip(SCATTER,ORDER)]
def camera(t):
    # Isolate the subject, finish the camera move, then introduce readable type.
    if t < 14.25:
        p=ease(ramp(t,6.8,8.0)); return mix(1,.68,p),550*p,160*p
    if t < 24.7:
        p=ease(ramp(t,14.25,15.65)); return mix(.68,.95,p),mix(550,40,p),mix(160,30,p)
    p=ease(ramp(t,24.7,26.25)); return mix(.95,.46,p),mix(40,1010,p),mix(30,310,p)

FOCUS = {3:(340,470),14:(820,270),10:(1350,500),13:(830,790)}
def focus_positions(t):
    p=ease(ramp(t,14.25,15.65))*(1-ease(ramp(t,24.7,26.25)))
    return [(mix(x,FOCUS.get(i,(x,y))[0],p),mix(y,FOCUS.get(i,(x,y))[1],p)) for i,(x,y) in enumerate(ORDER)]

def wipe(content,t,start,end,x,y,w,h,identity,reverse=False):
    p=ease(ramp(t,start,end)); p=1-p if reverse else p
    if p<=0: return ''
    return f'<defs><clipPath id="{identity}"><rect x="{x}" y="{y}" width="{w*p}" height="{h}"/></clipPath></defs><g clip-path="url(#{identity})">{content}</g>'

def route(points,p,color=RED,width=8):
    lengths=[math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(points,points[1:])]
    remaining=sum(lengths)*max(0,min(1,p)); out=[]
    for (a,b),span in zip(zip(points,points[1:]),lengths):
        u=min(1,remaining/span) if span else 1
        if remaining>0: out.append(line(*a,mix(a[0],b[0],u),mix(a[1],b[1],u),color,width))
        remaining-=span
    return ''.join(out)

def graph(t, positions, scale=1, ox=0, oy=0, opacity=1, labels=True, exclude=(), label_opacity=1, draw_nodes=True):
    s=[]
    q=ramp(t,7.3,12.2)
    for i,(a,b) in enumerate(EDGES):
        progress=ease(ramp(q,i/len(EDGES),min(1,(i+5)/len(EDGES))))
        x,y=positions[a]; xx,yy=positions[b]
        s.append(line(x,y,mix(x,xx,progress),mix(y,yy,progress),BLACK,2.5,.7))
    for i,(x,y) in enumerate(positions):
        if draw_nodes: s.append(circle(x,y,10,RED if i in (3,10,13) else BLACK))
        if labels and i not in exclude:
            s.append(f'<g opacity="{label_opacity:.4f}">'+txt(x+20,y-20,WORDS[i],52,RED if i in (3,10,13) else BLACK)+'</g>')
    return f'<g transform="translate({ox},{oy}) scale({scale})" opacity="{opacity}">' + ''.join(s)+'</g>'

def scatter_glyph(t,dx=0):
    strips=[]; letters=[]; landing=ease(ramp(t,0,2.7))
    for i in range(8):
        y=145+i*108; offset=(1-landing)*(170 if i%2 else -260)
        strips.append(f'<clipPath id="slice{i}"><rect x="470" y="{y}" width="900" height="108"/></clipPath>')
        letters.append(f'<g clip-path="url(#slice{i})" transform="translate({offset},0)">'+txt(560,895,'散',850,BLACK,800)+'</g>')
    return '<defs>'+''.join(strips)+'</defs>'+f'<g transform="translate({dx},0)">'+''.join(letters)+'</g>'

def fragments(t):
    p=ease(ramp(t,5.2,8.3)); a=1-ease(ramp(t,4.8,5.4)); s=[]
    for i,(x,y) in enumerate(nodes(t)):
        w=len(WORDS[i])*58+48
        s.append(f'<rect x="{x-15}" y="{y-53}" width="{w}" height="72" fill="{RED if i in (3,10) else PAPER}" stroke="{BLACK}" stroke-width="2" opacity="{1-p:.5f}"/>')
        s.append(f'<g opacity="{p:.5f}">'+circle(x,y,10,RED if i in (3,10,13) else BLACK)+'</g>')
        s.append(f'<g opacity="{a:.5f}">'+txt(x,y,WORDS[i],48,PAPER if i in (3,10) else BLACK)+'</g>')
    z,ox,oy=camera(t)
    return f'<g transform="translate({ox},{oy}) scale({z})">'+''.join(s)+'</g>'

def trace_layer(t):
    """A concrete, explicitly original example travels through the same nodes."""
    z,ox,oy=camera(t); positions=focus_positions(t); s=[]
    detail=1-ease(ramp(t,24.68,24.98))
    expand=ease(ramp(t,15.65,16.05))*detail
    question,source,evidence,answer=[positions[i] for i in (3,14,10,13)]
    if t<24.7:
        routes=[([question,source],16.5,17.65),
                ([source,(evidence[0],source[1]),evidence],18.7,19.95),
                ([evidence,(evidence[0],answer[1]),answer],21.0,22.2)]
    else:
        straighten=ease(ramp(t,24.7,26.25))
        bend1=(mix(evidence[0],(source[0]+evidence[0])/2,straighten),mix(source[1],(source[1]+evidence[1])/2,straighten))
        bend2=(mix(evidence[0],(evidence[0]+answer[0])/2,straighten),mix(answer[1],(evidence[1]+answer[1])/2,straighten))
        routes=[([question,source],16.5,17.65),([source,bend1,evidence],18.7,19.95),([evidence,bend2,answer],21.0,22.2)]
    for pts,a,b in routes: s.append(route(pts,ease(ramp(t,a,b))))
    for i in (3,14,10,13):
        x,y=positions[i]; s.append(circle(x,y,mix(10,178,expand) if i==3 else 10,RED))
    if t<15.65:
        for i in (3,14,10,13):
            x,y=positions[i]
            label=txt(x+20,y-20,WORDS[i],52,RED if i in (3,10,13) else BLACK)
            s.append(wipe(label,t,13.9,14.22,x+15,y-85,160,90,f'old-focus-{i}',True))
    elif t<24.7:
        content=(txt(340,403,'问题',28,PAPER,600,'middle')+
                 txt(340,472,'两条笔记',54,PAPER,700,'middle')+
                 txt(340,534,'共同点在哪？',46,PAPER,700,'middle'))
        content=wipe(content,t,16.02,16.35,155,380,370,175,'question-in')
        s.append(wipe(content,t,24.3,24.65,155,380,370,175,'question-out',True))
        records=[('原文','读书摘录','先问为什么。',820,270,17.72,18.12),
                 ('证据','项目复盘','先确认问题。',1350,500,20.02,20.42),
                 ('答案','共同点','从问题开始。',830,790,22.27,22.67)]
        for n,(category,context,quote,x,y,a,b) in enumerate(records):
            content=(txt(x+28,y-20,category,44,RED,700)+
                     txt(x+28,y+48,context,30,BLACK,500)+
                     txt(x+28,y+121,quote,57,BLACK,700))
            content=wipe(content,t,a,b,x+22,y-80,440,220,f'record-in-{n}')
            s.append(wipe(content,t,24.3,24.65,x+22,y-80,440,220,f'record-out-{n}',True))
    elif t>=26.25:
        for i in (3,14,10,13):
            x,y=positions[i]; s.append(txt(x+20,y-20,WORDS[i],52,RED,600))
    return f'<g transform="translate({ox},{oy}) scale({z})">'+''.join(s)+'</g>'

def render(t):
    """Absolute-time, deterministic SVG. All examples are authored for this film."""
    t=max(0,min(DURATION,t))
    body=[f'<rect width="{W}" height="{H}" fill="{PAPER}"/>',grid()]
    if t<6.8:
        body.append(scatter_glyph(t)); body.append(fragments(t))
        words=txt(95,1000,'信息很多。',62)+txt(95,690,'关系在哪？',62)+txt(95,92,'连线 / 概念产品影片',26,BLACK,500)
        body.append(wipe(words,t,6.35,6.75,70,40,900,1000,'opening-out',True))
    elif t<13.8:
        z,ox,oy=camera(t)
        body.append(graph(t,nodes(t),z,ox,oy,1,False))
        # A short lateral clearing move completes before the red character enters.
        if t<7.3:
            p=ease(ramp(t,6.8,7.3)); body.append(scatter_glyph(t,-1600*p))
        red=txt(55,845,'连',650,RED,800)
        red=wipe(red,t,7.35,7.85,40,240,710,650,'connect-in')
        body.append(wipe(red,t,13.1,13.55,40,240,710,650,'connect-out',True))
        # Labels enter only after geometry and camera have settled.
        labels=[]
        for i,(x,y) in enumerate(nodes(t)):
            labels.append(txt(x+20,y-20,WORDS[i],52,RED if i in (3,10,13) else BLACK))
        label_group=f'<g transform="translate({ox},{oy}) scale({z})">'+''.join(labels)+'</g>'
        body.append(wipe(label_group,t,10.9,11.65,550,190,1310,740,'graph-labels'))
        headline=txt(75,98,'碎片，开始连接。',64)+txt(75,1030,'同一批信息 / 位置重排 / 关系显现',26,BLACK,500)
        headline=wipe(headline,t,7.9,8.3,70,25,1750,1030,'relate-title-in')
        body.append(wipe(headline,t,13.1,13.55,70,25,1750,1030,'relate-title-out',True))
    elif t<24.7:
        z,ox,oy=camera(t); positions=focus_positions(t)
        body.append(graph(t,positions,z,ox,oy,.19,False,(),1,True))
        body.append(trace_layer(t))
        headline=txt(85,142,'把线索，连成答案',84,BLACK,700)
        headline=wipe(headline,t,15.7,16.05,75,45,1500,125,'trace-head-in')
        body.append(wipe(headline,t,24.3,24.65,75,45,1500,125,'trace-head-out',True))
        footer=txt(85,1022,'原创示例 / 两条记录，一条共同线索',31,BLACK,500)
        footer=wipe(footer,t,16.1,16.4,75,970,1500,70,'trace-foot-in')
        body.append(wipe(footer,t,24.3,24.65,75,970,1500,70,'trace-foot-out',True))
    else:
        z,ox,oy=camera(t); positions=focus_positions(t)
        p=ease(ramp(t,24.7,26.25))
        body.append(graph(t,positions,z,ox,oy,mix(.19,1,p),False))
        body.append(trace_layer(t))
        # The map is already parked in its own right-hand lane before branding.
        title=txt(85,720,'连线',430,RED,800)+txt(95,900,'让知识，形成关系。',85)+txt(95,96,'知识工作台 / 原创概念演示',32,BLACK,500)+txt(95,1020,'此片演示信息组织方式；没有产品性能数据。',26,BLACK,400)
        body.append(wipe(title,t,26.35,26.95,70,25,900,1035,'signature-in'))
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'+''.join(body)+'</svg>'

SHOTS=[
 {'id':'scatter','in':0,'out':6.8,'objects':['glyph-scatter','note-00..16'],'camera':'static full bleed','action':'clipped glyph bands enter and land; notes occupy the edges','curve':'monotonic cubic','sound':'one tick per landing; no continuous whoosh','information':'isolated information'},
 {'id':'relate','in':6.8,'out':13.8,'objects':['note-00..16','edge-00..18','glyph-connect'],'camera':'same world; precise translation','action':'same notes move into a graph; edges draw; former glyph exits','curve':'monotonic cubic, no spring','sound':'quiet landing clicks, sustained thin tone','information':'relations preserve object identity'},
 {'id':'trace','in':13.8,'out':24.7,'objects':['note-03','note-14','note-10','note-13'],'camera':'push into a question node; create new focal path','action':'create question→source→evidence→answer relations; old graph remains','curve':'monotonic cubic','sound':'trace pulses; no voice over reveal','information':'two original example notes reveal a shared idea; not a measured retrieval demonstration'},
 {'id':'signature','in':24.7,'out':30,'objects':['note-00..16','edge-00..18','product-signature'],'camera':'pull back from graph','action':'same map contracts into product signature space','curve':'monotonic cubic','sound':'one resolution note then hold','information':'fictive concept product; no measured performance claims'}]

def export():
    out=Path(__file__).with_suffix(''); out.mkdir(exist_ok=True)
    times=[4,11.8,21.8,28.4]
    images=[]
    for t in times:
        stem=f'tech-{t:04.1f}s'
        svg=out/(stem+'.svg'); png=out/(stem+'.png')
        svg.write_text(render(t))
        subprocess.run(['rsvg-convert',str(svg),'-o',str(png)],check=True,timeout=30)
        images.append((t,png))
    # These are original storyboard frames, not extracted completed film evidence.
    sheet=['<rect width="1920" height="1220" fill="#e4e2dc"/>']
    for i,(t,png) in enumerate(images):
        x=(i%2)*960; y=(i//2)*610
        b64=base64.b64encode(png.read_bytes()).decode()
        sheet.append(f'<image x="{x}" y="{y}" width="960" height="540" href="data:image/png;base64,{b64}"/>')
        sheet.append(txt(x+25,y+584,f'原创分镜 / {t:.1f}s / 待连续渲染',30))
    svg=out/'tech-storyboard.svg'; svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1220">'+''.join(sheet)+'</svg>')
    subprocess.run(['rsvg-convert',str(svg),'-o',str(out/'tech-storyboard.png')],check=True,timeout=30)
    (out/'shots.json').write_text(json.dumps({'duration':30,'format':'16:9','style':'swiss kinetic typography','font':FONT,'status':'original storyboard; film not rendered; audio not produced','shots':SHOTS},ensure_ascii=False,indent=2)+'\n')
    print(out)

if __name__=='__main__': export()

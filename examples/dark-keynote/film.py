"""Original concept film: one idea becomes a structured film. No external assets.

Not a recording of a real product. SVG render(t), persistent amber source token.
"""
import math
import html

W,H,DURATION=1920,1080,30.0
FONT='Noto Sans CJK SC'
def clamp(x): return max(0,min(1,x))
def ease(x):
    x=clamp(x); return x*x*(3-2*x)
def ramp(t,a,b): return ease((t-a)/(b-a))
def mix(a,b,u): return a+(b-a)*u
def txt(x,y,s,n=48,c='#eff0f3',w=600,anchor='start',alpha=1):
    return f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{n}" font-weight="{w}" text-anchor="{anchor}" fill="{c}" opacity="{alpha}">{html.escape(s)}</text>'
def group(s,transform='',alpha=1): return f'<g transform="{transform}" opacity="{alpha}">{s}</g>'
def rect(x,y,w,h,fill,rx=0,stroke='none',sw=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def circle(x,y,r,fill,alpha=1): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" opacity="{alpha}"/>'
def path(d,stroke,width=2,alpha=1,fill='none'):
    return f'<path d="{d}" stroke="{stroke}" stroke-width="{width}" opacity="{alpha}" fill="{fill}" stroke-linecap="round" stroke-linejoin="round"/>'
def token(x,y,r,t,alpha=1):
    s=circle(x,y,r*3.5,'url(#aura)',.65)+circle(x,y,r,'url(#gold)')
    s+=path(f'M{x-r*.5},{y-r*.35} Q{x},{y-r*.8} {x+r*.5},{y-r*.3}','#fff3ce',max(1,r*.06),.7)
    return group(s,alpha=alpha)
def note(i,x,y,angle,scale,t,alpha=1):
    labels=['灵感','一句话','镜头','节奏','画面','留白','线索','转折','声音','结尾','素材','主题']
    s=rect(-120,-80,240,160,'url(#surface)',14,'#566070',1.3)
    s+=circle(-86,-45,5,'#e1ae60')+txt(-68,-38,labels[i%12],21,'#c6cfdd',500)
    # Original miniature visual notes; scene families remain different.
    if i%3==0:
        s+=path('M-88,40 L-55,5 L-10,29 L28,-6 L86,40','#708297',2.5)
        s+=circle(60,-15,10,'#d8b879',.7)
    elif i%3==1:
        for j,l in enumerate([150,115,138]): s+=rect(-88,-4+j*19,l,5,'#59687d',2)
    else:
        for j in range(9): s+=rect(-86+j*19,28-(j*13%34),8,10+j*13%34,'#94aaa9',3)
    return group(s,f'translate({x},{y}) rotate({angle}) scale({scale})',alpha)
def orbital_notes(t):
    u=ramp(t,5.6,10.8); s=''
    for i in range(12):
        a=i*math.tau/12+.15*math.sin(i)
        x=960+math.cos(a)*(660+45*math.sin(i*2)); y=530+math.sin(a)*345
        x=mix(x,960,u);y=mix(y,540,u)
        sc=mix(.65+.2*(math.sin(a)+1)/2,.025,u)
        enter=ramp(t,2.4+i*.10,4.1+i*.10)
        alpha=enter*(1-ramp(t,10.2,10.9))
        s+=note(i,x,y,mix(math.sin(i*3)*13,0,u),sc,t,alpha)
    return s
def lens(t):
    show=ramp(t,5.2,6.4)*(1-ramp(t,10.5,11.4));s=''
    for i in range(5):
        r=150+i*22; a=.10+i*.055
        s+=f'<ellipse transform="rotate({math.sin(t)*12},960,540)" cx="960" cy="540" rx="{r}" ry="{r*.87}" fill="none" stroke="url(#rim)" stroke-width="{2 if i<4 else 4}" opacity="{a+show*.3}"/>'
    s+=circle(960,540,140,'url(#lens)')
    # Focus cue closes onto the persistent central idea.
    q=ramp(t,8.8,10.8)
    for i in range(4):
        a=i*math.pi/2;rr=mix(125,72,q)
        x=960+math.cos(a)*rr;y=540+math.sin(a)*rr
        s+=path(f'M{x-9},{y} L{x+9},{y}','#ffd795',2,.7)
    return group(s,alpha=show)
def frame_art(x,y,w,h,kind,t):
    s=rect(x,y,w,h,'#1c2b3d',12,'#8394aa',1)
    if kind==0:
        s+=circle(x+w*.5,y+h*.5,h*(.22+.02*math.sin(t*1.7)),'url(#gold)')
        s+=f'<ellipse cx="{x+w*.5}" cy="{y+h*.5}" rx="{w*.35}" ry="{h*.15}" fill="none" stroke="#aabacc" stroke-width="2"/>'
    elif kind==1:
        for j in range(5):
            xx=x+w*.2+j*w*.15+7*math.sin(t*1.8+j*.7)
            s+=path(f'M{xx},{y+h*.75} Q{xx-30},{y+h*.35} {xx+20},{y+h*.2}','#d0b58a',3)
    else:
        pts=[(x+w*.13,y+h*.7),(x+w*.4,y+h*.42),(x+w*.7,y+h*.58),(x+w*.88,y+h*.23)]
        s+=path('M'+' L'.join(f'{a},{b}' for a,b in pts),'#dfa95f',4)
        q=ramp(t,18.6,20);j=min(2,int(q*3));u=min(1,q*3-j);a,b=pts[j],pts[j+1];s+=token(mix(a[0],b[0],u),mix(a[1],b[1],u),8,t)
        for a,b in pts:s+=circle(a,b,5,'#f9d99b')
    return s
def editing_world(t):
    appear=ramp(t,10.9,12.9); end=1-ramp(t,23.8,25.5)
    # The idea expands into a stage, rather than cutting to an unrelated panel.
    z=mix(.10,1.18,appear);rot=mix(-5,0,appear)
    cx,cy=960.,540.
    poses=[(13.,960,540,1.18),(14.3,586,466,2.1),(15.4,586,466,2.1),(16.5,952,466,2.1),(17.7,952,466,2.1),(18.8,1318,466,2.1),(20.1,1318,466,2.1),(22.0,960,535,1.3),(23.8,960,535,1.3)]
    if t>=13:
        for a,b in zip(poses,poses[1:]):
            if a[0]<=t<b[0]:
                u=ramp(t,a[0],b[0]);cx=mix(a[1],b[1],u);cy=mix(a[2],b[2],u);z=mix(a[3],b[3],u);break
        else:cx,cy,z=poses[-1][1:]
    z*=mix(1,.05,ramp(t,23.8,25.1))
    s=rect(365,210,1190,650,'url(#surface)',28,'#626a79',1.2)
    s+=rect(365,210,1190,58,'#202733',28)
    for i,c in enumerate(['#b7826c','#b4a572','#788d84']):s+=circle(397+i*22,239,6,c)
    s+=txt(960,246,'一束 · 创作空间',19,'#b9c4d2',500,'middle')
    s+=txt(414,317,'01  让想法有顺序',28,'#e9e7e1',600)
    for i in range(3):
        a=ramp(t,12.7+i*.6,13.6+i*.6)
        card=frame_art(415+i*366,354,342,225,i,t)
        card+=txt(429+i*366,614,['起点','展开','落点'][i],23,'#ccd5df',500)
        s+=group(card,f'translate(0,{(1-a)*36})',a)
    # Gold origin travels along the same story slots; it is never replaced.
    for i in range(3):
        x=415+i*366; rev=ramp(t,15.4+i*.7,16.3+i*.7)
        s+=rect(x,691,342*rev,56,['#907145','#657c87','#807077'][i],7)
        s+=txt(x+14,727,['提出问题','看见过程','得到答案'][i],19,'#f0eee8',500,alpha=rev)
    play=ramp(t,18.0,23.3)
    px=415+1074*play
    s+=path(f'M{px},668 L{px},770','#f3d299',2)
    s+=token(px,661,8,t)
    s+=txt(414,813,'同一个想法，贯穿每个镜头。',25,'#c5ceda',500)
    return group(s,f'translate(960,540) rotate({rot}) scale({z}) translate({-cx},{-cy})',appear*end)
def prism_stage(t):
    """The brief becomes a real visual explanation, then the exact scene is edited."""
    reveal=ramp(t,11.0,12.5)
    close=ramp(t,23.0,25.5)
    z=mix(.04,1,reveal)*mix(1,.68,close)
    s=''
    # Measured film-stage geometry, not three generic idea cards.
    ox,oy=300,535
    beam=ramp(t,12.5,14.0)
    ray=ramp(t,15.0,18.0)
    prism='M840,315 L1040,735 L650,735 Z'
    s+=circle(850,575,360,'url(#aura)',.09)
    s+=path(prism,'#b6d0e0',2,.85,'url(#prismglass)')
    s+=path('M840,315 L826,345 L681,717 L650,735','#eff7ff',3,.65)
    s+=path('M840,315 L850,355 L1022,718 L1040,735','#a1b4cd',2,.7)
    # White beam exists first. Color fan visibly grows from the same glass exit.
    s+=path(f'M{ox},535 L{mix(ox,735,beam)},535','#e4eef9',9,.10)
    s+=path(f'M{ox},535 L{mix(ox,735,beam)},535','#eff6ff',3,1)
    if beam>.9:s+=path(f'M735,535 L{mix(735,963,ramp(t,14,15))},{mix(535,575,ramp(t,14,15))}','#f4f8fc',3,.9)
    colors=['#f37362','#eea955','#ebd97b','#85bd92','#6caed1','#8b8bd0','#ba83d3']
    for i,c in enumerate(colors):
        yy=610+i*39;xx=mix(963,1550,ray);endY=mix(575,yy,ray)
        s+=path(f'M963,575 L{xx},{endY}',c,5,.8)
        if ray>.98:s+=circle(xx,endY,4,c,.9)
    s+=token(ox,oy,25,t)
    a=ramp(t,12,13)*(1-ramp(t,21.7,22.5))
    s+=txt(185,198,'白光里，藏着颜色。',73,'#f0f3f7',600,alpha=a)
    a=ramp(t,18,19)
    s+=txt(1540,564,'红光',28,'#f49382',500,'end',a)
    s+=txt(1540,907,'紫光',28,'#ba92db',500,'end',a)
    s+=txt(845,816,'棱镜',30,'#c5d2df',500,'middle',ramp(t,14,15))
    s+=txt(845,940,'不同波长，偏折程度不同。',37,'#c5d2df',400,'middle',ramp(t,19,20))
    # The actual rendered mechanism becomes the preview, preserving every mark.
    output=group(s,f'translate(960,520) scale({z}) translate(-960,-540)',reveal)
    if close>0:
        output+=group(rect(290,155,1340,760,'none',16,'#7b91ac',1.2),alpha=close)
        output+=txt(308,130,'生成预览 / 原创光学示意',24,'#b9c7d7',500,alpha=close)
        for i,label in enumerate(['问题','光路','分色']):
            x=316+i*426;output+=group(rect(x,938,411,50,['#536379','#788a92','#957e75'][i],5)+txt(x+17,971,label,22,'#f3efe7',500),alpha=close)
        px=316+1263*ramp(t,24.3,26.5)
        output+=txt(1600,1030,'镜头结构示意 · 非实时回放',18,'#a2b1c4',400,'end',close)
    return group(output,alpha=1-ramp(t,26.5,27.4))

def render(t):
    t=max(0,min(30,float(t)))
    t=t*11.5/8 if t<8 else 11.5+(t-8)*15.5/19 if t<27 else t
    defs='''<defs>
    <radialGradient id="bg"><stop stop-color="#202c3b"/><stop offset=".58" stop-color="#0c1420"/><stop offset="1" stop-color="#060910"/></radialGradient>
    <radialGradient id="aura"><stop stop-color="#ffcf76" stop-opacity=".7"/><stop offset=".3" stop-color="#e1a34c" stop-opacity=".2"/><stop offset="1" stop-color="#e1a34c" stop-opacity="0"/></radialGradient>
    <radialGradient id="gold" cx="32%" cy="24%"><stop stop-color="#fff6d6"/><stop offset=".36" stop-color="#efc777"/><stop offset=".8" stop-color="#ae7338"/><stop offset="1" stop-color="#634222"/></radialGradient>
    <linearGradient id="surface" x2=".7" y2="1"><stop stop-color="#3a495e"/><stop offset=".48" stop-color="#243348"/><stop offset="1" stop-color="#15243a"/></linearGradient>
    <linearGradient id="rim"><stop stop-color="#f1d99a"/><stop offset=".4" stop-color="#506175"/><stop offset=".8" stop-color="#152333"/><stop offset="1" stop-color="#c6daed"/></linearGradient>
    <linearGradient id="prismglass"><stop stop-color="#9ebbd1" stop-opacity=".12"/><stop offset=".55" stop-color="#365675" stop-opacity=".42"/><stop offset="1" stop-color="#8db2c9" stop-opacity=".18"/></linearGradient><radialGradient id="lens"><stop stop-color="#354757" stop-opacity=".5"/><stop offset=".8" stop-color="#152938" stop-opacity=".2"/><stop offset="1" stop-color="#8093a5" stop-opacity=".3"/></radialGradient>
    </defs>'''
    s=defs+rect(0,0,W,H,'url(#bg)')
    # Stationary grain points, no arbitrary perpetual motion.
    for i in range(65):
        x=(i*733+91)%1920;y=(i*397+51)%1080
        s+=circle(x,y,.7,'#8295af',.07)
    if t<12.8:
        s+=orbital_notes(t)+lens(t)
        s+=token(960,540,mix(10,27,ramp(t,.2,2.0)),t,ramp(t,0,.5)*(1-ramp(t,10.5,11.4)))
        a=ramp(t,.7,1.8)*(1-ramp(t,3.6,4.5))
        s+=txt(960,330,'想法，不该散落。',77,'#f1efe8',600,'middle',a)
        a=ramp(t,6.2,7.2)*(1-ramp(t,8.6,9.1))
        s+=txt(960,887,'把碎片，聚成一束。',55,'#ece8de',500,'middle',a)
    a=ramp(t,8.7,9.3)*(1-ramp(t,10.8,11.2))
    s+=txt(960,840,'创作题目：白光里有什么？',47,'#f0e8d5',500,'middle',a)
    s+=prism_stage(t)
    a=ramp(t,26.8,28.0)
    if a>0:
        s+=token(960,373,46,t,a)
        s+=txt(960,600,'一束',148,'#f3eee3',700,'middle',a)
        s+=txt(960,709,'从一个想法，到一部作品。',48,'#b8c4d4',400,'middle',a)
        s+=txt(960,932,'原创概念影片 · 不代表真实产品功能',20,'#8997aa',400,'middle',a)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{s}</svg>'

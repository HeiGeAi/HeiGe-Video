"""Original 20-second Chinese dataviz; pure absolute-time SVG renderer.
No network, external media, audio, or dependencies beyond Python standard library.
Dataset is synthetic. A-E always identify the same five imaginary orders.
"""
import math
from html import escape
DURATION=20.0
FONT='Noto Sans CJK SC'
WIDTH,HEIGHT=1280,720
ROWS=(('A',8),('B',9),('C',10),('D',11),('E',12))
X0=200.0
SCALE=14.0
DOMAIN=(0,65)
C={'bg':'#101D2A','text':'#F5F1E7','mute':'#A3B4C3','grid':'#293948','bar':'#7396AC','coral':'#FF8A76','mean':'#F2C567','median':'#79DBB4'}

def clamp(x):return max(0,min(1,x))
def ease(x):x=clamp(x);return x*x*(3-2*x)
def progress(t,a,b):return ease((t-a)/(b-a))
def value_state(t):
    p=progress(t,6,9)
    return {'A':8.,'B':9.,'C':10.,'D':11.,'E':12+50*p,'mean':10+10*p,'median':10.}
def render(t):
    t=max(0,min(DURATION,t));v=value_state(t);out=[]
    def add(s):out.append(s)
    def text(x,y,s,size=24,fill=None,weight=400,anchor='start',opacity=1,ident=None):
        extra=f' id="{ident}"' if ident else ''
        add(f'<text{extra} x="{x:.3f}" y="{y:.3f}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" fill="{fill or C["text"]}" text-anchor="{anchor}" opacity="{opacity:.4f}">{escape(str(s))}</text>')
    def line(x1,y1,x2,y2,color,width=1,opacity=1,dash=None):
        ds=f' stroke-dasharray="{dash}"' if dash else ''
        add(f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" stroke="{color}" stroke-width="{width}" opacity="{opacity:.4f}"{ds}/>')
    def rect(x,y,w,h,fill,rx=0,opacity=1,ident=None):
        extra=f' id="{ident}"' if ident else ''
        add(f'<rect{extra} x="{x:.3f}" y="{y:.3f}" width="{max(0,w):.3f}" height="{h:.3f}" rx="{rx}" fill="{fill}" opacity="{opacity:.4f}"/>')
    def circle(x,y,r,fill,opacity=1,stroke='none',sw=0,ident=None):
        extra=f' id="{ident}"' if ident else ''
        add(f'<circle{extra} cx="{x:.3f}" cy="{y:.3f}" r="{r:.3f}" fill="{fill}" opacity="{opacity:.4f}" stroke="{stroke}" stroke-width="{sw}"/>')
    add(f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">')
    rect(0,0,1280,720,C['bg'])
    # A restrained paper-like data lab. No stochastic or global-motion decoration.
    text(64,35,'数据观察室  /  01',18,C['mute'],500)
    rect(1030,17,186,28,'#243647',14)
    text(1123,37,'虚构数据 · 演示',16,C['text'],500,'middle')
    if t<4:
        title='这5单，平均等10分钟'; subtitle='同批5单等待时间，已按从小到大排列'
    elif t<9:
        title='现在，只让最后一单变慢'; subtitle='假设 E 从12分钟变为62分钟（变化示意）'
    elif t<11.7:
        title='一单多等50分钟，平均升到20'; subtitle='同一批5单；A、B、C、D 的等待时间都没变'
    elif t<15.5:
        title='中位数，看排在正中的那一单'; subtitle='5个数排好序，第3个仍然是10分钟'
    else:
        title='平均20分钟，4单却不到20分钟'; subtitle='想知道“通常等多久”？别只看平均数'
    text(64,99,title,44,weight=700)
    text(66,145,subtitle,24,C['mute'])
    # Persistent chart, fixed metric domain; no zoom or quantitative rescaling.
    for tick in range(0,61,10):
        x=X0+tick*SCALE
        line(x,211,x,512,C['grid'],1)
        text(x,547,tick,18,C['mute'],anchor='middle')
    text(X0+65*SCALE,547,'65',18,C['mute'],anchor='middle')
    line(X0,518,X0+65*SCALE,518,C['mute'],1.2)
    line(X0+65*SCALE,512,X0+65*SCALE,523,C['mute'],1.2)
    text(1175,547,'分钟',18,C['mute'],anchor='end')
    text(92,196,'订单',17,C['mute'])
    # A majority bracket marks the same unchanged records after the operation.
    majority=progress(t,15.5,16.2)
    if majority:
        rect(184,220,113*SCALE/10+160,213,'#79DBB4',12,0.065*majority)
    medianp=progress(t,11.7,12.5)
    meanp=progress(t,1,1.8)
    mx=X0+v['mean']*SCALE
    if meanp:
        line(mx,210,mx,518,C['mean'],3,meanp,'7 6')
        circle(mx,518,4,C['mean'],meanp)
        text(mx+12,198,'平均数',20,C['mean'],600,opacity=meanp)
    # Four records remain geometrically invariant; the E endpoint is the protagonist.
    for i,(rid,initial) in enumerate(ROWS):
        y=244+i*56;val=v[rid];x=X0+val*SCALE
        med=(rid=='C')
        color=C['coral'] if rid=='E' else (C['median'] if med and medianp>.3 else C['bar'])
        if med and medianp:
            rect(73,y-26,440,52,C['median'],8,0.08*medianp)
        text(97,y+9,rid,25,color,700,ident=f'label-{rid}')
        if t>=11.7:
            text(145,y+6,str(i+1),17,C['median'] if med else C['mute'],600,'middle',medianp)
        rect(X0,y-12,val*SCALE,24,color,12,ident=f'bar-{rid}')
        circle(x,y,9,color,stroke=C['bg'],sw=3,ident=f'mark-{rid}')
        # Real endpoints only during settled reading holds; tween is explicitly a schematic.
        label=(f'{val:.0f}' if not (rid=='E' and 6<t<9) else '变化中')
        # Mask only the numeric label zone so the mean rule never crosses a glyph.
        label_offset=26 if rid=='E' else 18
        mask_width=20 if len(label)==1 else 34 if len(label)==2 else 80
        if meanp and x+label_offset-4 <= mx <= x+label_offset-4+mask_width:
            rect(x+label_offset-4,y-18,mask_width,36,C['bg'],2)
        text(x+label_offset,y+8,label,24,color,700,ident=f'value-{rid}')
        if rid=='E' and 4<=t<9:
            pulse=progress(t,4,4.6)
            circle(x,y,15+4*pulse,'none',pulse,stroke=C['coral'],sw=1.5)
        if med and medianp:
            circle(x,y,18,'none',medianp,C['median'],2)
            text(635,y+8,'第3个 ＝ 中位数',25,C['median'],600,opacity=medianp)
            line(x+66,y,609,y,C['median'],1.5,medianp)
    if medianp:
        # Same value10 appears independently of mean20; direct rank-selection evidence above.
        text(625,405,'左右各有2个数',20,C['mute'],opacity=medianp)
    if 4<=t<11.7:
        a=progress(t,4,4.5)
        text(845,263,'其余4单不变',24,C['mute'],500,opacity=a)
        if t>=9:
            text(845,302,'只有 E：12 → 62',24,C['coral'],700)
    # Numeric result row is shared over the whole movie rather than reset into cards.
    line(64,575,1216,575,C['grid'],1)
    text(64,620,'平均数',24,C['mean'],600)
    if t<=6:n='10'
    elif t<9:n='…'
    else:n='20'
    text(165,625,n,44,C['mean'],700)
    text(228,622,'分钟',22,C['mean'])
    if t<4:
        text(330,620,'(8＋9＋10＋11＋12) ÷ 5 ＝ 10',25,C['text'])
    elif t<9:
        text(330,620,'总和增加 → 平均数也跟着移动',25,C['text'])
    elif t<11.7:
        text(330,620,'(8＋9＋10＋11＋62) ÷ 5 ＝ 20',25,C['text'])
    else:
        text(360,620,'中位数',24,C['median'],600)
        text(465,625,'10',44,C['median'],700)
        text(528,622,'分钟',22,C['median'])
        if t<15.5:text(655,620,'极端值变大，正中位置没变',25,C['text'])
        else:text(655,620,'一起看中位数，也看分布',25,C['text'],600)
    if t<11.7:
        detail='平均数＝总和÷个数；这里一共5单' if t<6 else ('动画展示 E 数值变化，不代表真实时间推移' if t<9 else 'E 增加50分钟 ÷ 5单 ＝ 平均增加10分钟')
    else:
        detail='本例中位数不变；中位数也不是所有问题的最佳指标'
    text(64,661,detail,19,C['mute'])
    text(64,697,'来源：自建虚构示例  ·  同批5单  ·  单位：分钟  ·  非真实业务数据',16,C['mute'])
    # Discrete chapter ruler adds orientation, not an implied time series.
    for i in range(4):
        active=i== (0 if t<4 else 1 if t<11.7 else 2 if t<15.5 else 3)
        rect(1054+43*i,684,32,3,C['mean'] if active else C['grid'],1)
    add('</svg>');return ''.join(out)

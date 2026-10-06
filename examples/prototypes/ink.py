"""Original ink-paper prototype. Stdlib only; render(t) is a pure time function.

This is an original SVG approximation of pressure strokes, stable bristle gaps and
separate wet/dry layers. It does not reuse Lemo's engine, assets or characters.
Chinese is conventional Noto Serif CJK SC type, never a fake handwritten stroke reveal.
"""
from __future__ import annotations

import argparse
import base64
import functools
import html
import json
import math
from pathlib import Path
import random
import subprocess

W, H, DURATION = 1920, 1080, 30.0
FONT = "Noto Serif CJK SC"
PAPER = "#f2ecdc"
INK = "#20251f"
SEED_COLOR = "#88513c"


def clamp(v: float, a: float = 0.0, b: float = 1.0) -> float:
    return max(a, min(b, v))


def ease(v: float) -> float:
    v = clamp(v)
    return v * v * (3 - 2 * v)


def mix(a: float, b: float, u: float) -> float:
    return a + (b - a) * u


def smooth_path(points: list[tuple[float, float]], count: int = 9):
    out = []
    for i in range(len(points) - 1):
        p0, p1 = points[max(0, i - 1)], points[i]
        p2, p3 = points[i + 1], points[min(len(points) - 1, i + 2)]
        for j in range(count):
            t = j / count
            out.append(tuple(.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in (0, 1)))
    return out + [points[-1]]


def arc_samples(points, spacing=4.0):
    dense = smooth_path(points)
    cumulative = [0.0]
    for a, b in zip(dense, dense[1:]):
        cumulative.append(cumulative[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    total = cumulative[-1] or 1.0
    count = max(3, min(160, math.ceil(total / spacing) + 1))
    result, k = [], 0
    for i in range(count):
        s = total * i / (count - 1)
        while k < len(dense) - 2 and cumulative[k + 1] < s:
            k += 1
        u = (s - cumulative[k]) / max(1e-9, cumulative[k + 1] - cumulative[k])
        result.append((mix(dense[k][0], dense[k + 1][0], u), mix(dense[k][1], dense[k + 1][1], u)))
    return result, total


def noise(s: float, phase: float) -> float:
    # No frame number in the noise. Arc coordinates are fixed for each stroke.
    return .5 + .24 * math.sin(s * .041 + phase) + .17 * math.sin(s * .091 + phase * 2.3) + .07 * math.cos(s * .17 + phase * .4)


def path_string(points, close=False):
    if not points:
        return ""
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in points) + (" Z" if close else "")


def brush(points, width=4.0, opacity=.7, dryness=.3, seed=1, reveal=1.0,
          color=INK, arc_reference=None, wet=.18, taper=True):
    """Pressure centreline, wet halo, ink body and stable broken bristles."""
    if reveal <= 0:
        return ""
    samples, length = arc_samples(points, max(2.0, width * .22))
    normals = []
    for i in range(len(samples)):
        a, b = samples[max(0, i - 1)], samples[min(len(samples) - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        norm = math.hypot(dx, dy) or 1.0
        normals.append((-dy / norm, dx / norm))
    reference = arc_reference if arc_reference is not None else length
    rng = random.Random(seed)
    phase = rng.uniform(0, 20)
    widths = []
    for i in range(len(samples)):
        u = i / (len(samples) - 1)
        profile = (.09 + .91 * math.sin(math.pi * (.015 + u * .98)) ** .58) if taper else .8
        edge = (.77 + .38 * noise(u * reference, phase))
        widths.append(width * profile * edge)
    last = min(len(samples), max(2, math.ceil(len(samples) * clamp(reveal))))
    left = [(x + nx * w / 2, y + ny * w / 2) for (x, y), (nx, ny), w in zip(samples[:last], normals[:last], widths[:last])]
    right = [(x - nx * w / 2, y - ny * w / 2) for (x, y), (nx, ny), w in zip(samples[:last], normals[:last], widths[:last])]
    body = path_string(left + right[::-1], True)
    parts = []
    if wet > 0 and width >= 5:
        parts.append(f'<path d="{body}" fill="{color}" opacity="{opacity*wet:.3f}" filter="url(#wet)"/>')
    dry_bundle = width >= 15 and dryness >= .70
    body_alpha = opacity * (.20 if dry_bundle else (1-dryness*.18)*.96)
    parts.append(f'<path d="{body}" fill="{color}" opacity="{body_alpha:.3f}"/>')
    if dry_bundle:
        parts.append(f'<path d="{body}" fill="{color}" opacity="{opacity:.3f}" filter="url(#inkgrain)"/>')
    bristle_count = 5 if dry_bundle else max(3, min(17, round(width*.7)))
    for j in range(bristle_count):
        lateral = (j + .5 + rng.uniform(-.23,.23)) / bristle_count - .5
        filament_width = rng.uniform(.45, 1.45) if dry_bundle else 1.0
        local_phase = rng.uniform(0, 40)
        load = 1 - dryness * (.22 + .6 * abs(lateral) * 2)
        segment = []
        for i in range(last):
            u = i / (len(samples) - 1)
            ink = noise(u * reference * (.16 if dry_bundle else 1), local_phase) * load - dryness * u * (.10 if dry_bundle else .36)
            if ink > (.12 + dryness*.06 if dry_bundle else .2 + dryness*.23):
                x, y = samples[i]
                nx, ny = normals[i]
                offset = widths[i] * lateral + .28 * math.sin(u * reference * .083 + local_phase)
                if dry_bundle:
                    envelope = width * (.09 + .91*math.sin(math.pi*(.015+u*.98))**.58) * .90
                    offset = envelope*lateral + width*.021*math.sin(u*reference*.012+local_phase)
                segment.append((x + nx * offset, y + ny * offset))
            else:
                if len(segment) > 1:
                    parts.append(f'<path d="{path_string(segment)}" fill="none" stroke="{color}" stroke-width="{max(.24,(min(1.2,width*.022) if dry_bundle else width/bristle_count*.43)*filament_width):.2f}" opacity="{opacity*(.44 if dry_bundle else .6):.3f}"/>')
                segment = []
        if len(segment) > 1:
            parts.append(f'<path d="{path_string(segment)}" fill="none" stroke="{color}" stroke-width="{max(.24,(min(1.2,width*.022) if dry_bundle else width/bristle_count*.43)*filament_width):.2f}" opacity="{opacity*(.44 if dry_bundle else .6):.3f}"/>')
    # Long pale bristle channels actually remove visual density from broad
    # strokes. They share the stroke's arc coordinates, so texture never boils.
    if width >= 7 and dryness > .35:
        for j in range(2 if dry_bundle else max(2, min(7, round(width * .12)))):
            lateral = rng.uniform(-.42, .42)
            start = rng.uniform(.13, .64)
            end = min(.99, start + rng.uniform(.18, .40))
            strand = []
            for i in range(last):
                u = i / (len(samples) - 1)
                if start <= u <= end:
                    xx, yy = samples[i]
                    nx, ny = normals[i]
                    shift = widths[i]*lateral + math.sin(u*17+j)*width*.007
                    strand.append((xx+nx*shift, yy+ny*shift))
            if len(strand)>1:
                parts.append(f'<path d="{path_string(strand)}" fill="none" stroke="{PAPER}" stroke-width="{max(.30,width*.010):.2f}" opacity="{opacity*dryness*.76:.3f}"/>')
    return ''.join(parts)


@functools.lru_cache(maxsize=1)
def landscape():
    out = []
    # Separate value families: low far washes, sculpted middle ridges, and
    # near-black bank gestures. Texture belongs to a face, never floats in air.
    back=[(720,750),(1150,657),(1370,679),(1710,504),(1800,561),(1910,525),(2240,701),(2500,619),(2780,423),(2910,505),(3010,468),(3370,672),(3660,569),(3940,686),(4200,486),(4310,521),(4430,506),(4810,749),(5450,671),(5850,760)]
    mid=[(80,855),(540,796),(910,830),(1200,782),(1390,856),(1710,806),(1960,664),(2110,471),(2170,522),(2260,501),(2480,713),(2690,850),(2840,773),(3100,884),(3310,728),(3490,486),(3570,537),(3660,488),(3940,758),(4090,902),(4310,790),(4550,830),(4780,710),(5200,930),(5660,916)]
    for points,alpha in [(back,.13),(mid,.21)]:
        shape=smooth_path(points,5)+[(points[-1][0],1120),(points[0][0],1120)]
        out.append(f'<path d="{path_string(shape,True)}" fill="url(#mountain)" opacity="{alpha}" filter="url(#wash)"/>')
    # In the opening field the low distant edge is nearly lost in the paper.
    out.append(brush(mid[:7],3.0,.22,.8,402,wet=.4))
    # Two deliberately composed mountain groups anchor the tracking shot. Broad
    # downward strokes connect summits to foot slopes; grouped fine splits are
    # dry rock structure, not evenly spaced decorative hatching.
    for group,(px,py,scale,seed) in enumerate([(2110,471,1.0,500),(3650,493,-1.03,600)]):
        ridge=[(px-260*scale,py+355),(px-116*scale,py+193),(px,py),(px+64*scale,py+51),(px+151*scale,py+30),(px+350*scale,py+280)]
        face=[(px,py+12),(px-85*scale,py+149),(px-262*scale,py+351),(px-40*scale,py+329),(px+180*scale,py+353),(px+93*scale,py+198)]
        out.append(f'<path d="{path_string(face,True)}" fill="url(#mountain)" opacity=".20" filter="url(#wash)"/>')
        out.append(brush(ridge[:3],7.0,.69,.80,seed,wet=.24))
        out.append(brush(ridge[2:4],5.5,.55,.80,seed+1,wet=.16))
        out.append(brush(ridge[4:],6.5,.59,.80,seed+2,wet=.16))
        faces=[
            ([(0,12),(-26,116),(-124,220),(-163,326)],31,.66),
            ([(14,40),(70,141),(125,225),(224,325)],47,.57),
            ([(149,38),(124,115),(178,174),(220,258)],24,.60),
            ([(-37,91),(-116,175),(-182,299),(-274,366)],19,.50),
            ([(100,157),(37,203),(5,280),(-26,349)],25,.47),
            ([(201,114),(254,187),(317,237),(388,322)],20,.44)]
        for j,(local,width,alpha) in enumerate(faces):
            pts=[(px+xx*scale,py+yy) for xx,yy in local]
            out.append(brush(pts,width*abs(scale),alpha,.84,seed+10+j,wet=.27))
            # Aligned parallel slivers on the same sloping rock face.
            for k in range(3):
                shift=(k+1)*5*scale
                out.append(brush([(xx+shift,yy+6*k) for xx,yy in pts],1.3+k*.35,alpha*.64,.86,seed+30+j*4+k,wet=0))
        # Crease dashes follow strata and disappear into the valley mist.
        for j,(dx,dy) in enumerate([(-63,128),(60,163),(165,132),(-171,291),(156,270)]):
            out.append(brush([(px+dx*scale,py+dy),(px+(dx+31)*scale,py+dy-11),(px+(dx+59)*scale,py+dy+5)],5,.34,.85,seed+80+j,wet=.1))
    # Water is left unpainted. Broken narrow edges lead the seed through a long
    # calm ribbon of negative space, rather than enclosing it in a solid tube.
    out.append(brush([(650,1090),(1410,1007),(2020,908),(2500,887),(2950,951),(3440,949),(3840,899),(4190,958),(4780,1044),(5630,1110)],10,.49,.84,711,wet=.2))
    out.append(brush([(1560,1112),(2140,1032),(2600,982),(3040,1021),(3520,1028),(4030,985),(4540,1068)],3,.29,.83,714,wet=.1))
    for i in range(15):
        xx=1590+i*190
        yy=1003+36*math.sin(i*1.91)
        out.append(brush([(xx,yy),(xx+43,yy-3),(xx+110,yy+1)],.85,.22,.74,730+i,wet=0))
    # Soil has weight: tapered dry marks over a pale bleeding lower edge.
    for j,(points,width) in enumerate([
        ([(-600,984),(-30,927),(320,951),(659,1005),(1070,1075)],40),
        ([(3890,1055),(4080,968),(4309,928),(4520,965),(4810,1080)],39)]):
        out.append(brush([(xx,yy+width*.4) for xx,yy in points],width*1.35,.10,.76,800+j,wet=.85))
        out.append(brush(points,width,.67,.88,808+j,wet=.12))
        out.append(brush([(xx,yy-6) for xx,yy in points],3,.56,.64,818+j,wet=0))
    # Unequal local soil accents concentrate ink underneath the landed achene.
    out.append(brush([(4220,947),(4309,931),(4408,947)],19,.73,.85,840,wet=.28))
    out.append(brush([(4004,1004),(4077,977),(4128,967)],12,.44,.80,842,wet=.2))
    return ''.join(out)


def grass_tuft(x, y, size, seed):
    rng = random.Random(seed)
    out = []
    for i in range(5):
        spread = rng.uniform(-.7,.7)*size
        height = rng.uniform(.4,1.0)*size
        out.append(brush([(x,y),(x+spread*.26,y-height*.52),(x+spread,y-height)], 1.9+size*.012, .34+size*.0015, .75, seed*20+i, wet=.1))
    return ''.join(out)


@functools.lru_cache(maxsize=1)
def field_plants():
    out=[]
    for i, (x,y,size) in enumerate([(-180,1010,180),(105,956,82),(390,983,120),(1230,1010,79),(1400,1070,124),(4080,960,72),(4580,1020,90),(4840,1080,170),(5160,1080,215)]):
        out.append(grass_tuft(x,y,size,600+i))
    # Small far seed heads recede in value and scale.
    for j, (x,y,h) in enumerate([(40,867,210),(265,843,240),(443,847,174),(1090,926,238),(4670,990,290),(4925,988,212)]):
        out.append(brush([(x,y),(x+15,y-h*.55),(x-10,y-h)], 2.2,.35,.48,920+j))
        for k in range(11):
            a=k*math.tau/11
            ox,oy=x-10+math.cos(a)*26,y-h+math.sin(a)*24
            out.append(brush([(x-10,y-h),(ox,oy)], .75,.26,.5,930+j*12+k))
            for z in (-1,0,1):
                out.append(brush([(ox,oy),(ox+math.cos(a+z*.4)*14,oy+math.sin(a+z*.4)*14)], .45,.23,.6,1020+j*40+k*3+z))
    return ''.join(out)


@functools.lru_cache(maxsize=8)
def original_plant(t):
    u=ease(t/2.6)
    out=[brush([(657,1050),(712,840),(759,635),(810,485)],10.5,.96,.66,1400,reveal=u,wet=.32)]
    for i,(x,y,flip) in enumerate([(695,964,-1),(723,880,1),(749,785,-1)]):
        leaf_u=ease((t-(.70+i*.35))/.80)
        # Serrated leaves use a soft body and actual vein strokes, not clip art.
        points=[(x,y),(x+flip*58,y-17),(x+flip*118,y-75),(x+flip*159,y-133)]
        # Irregular tapered blade with serrated edges; the stroke is its midrib.
        blade=[]
        for k in range(8):
            q=k/7
            xx=x+flip*159*q
            yy=y-133*q
            breadth=(12 if k%2 else 28)*math.sin(math.pi*q)**.7
            blade.append((xx-flip*breadth*.72,yy-breadth*.7))
        for k in range(7,-1,-1):
            q=k/7
            xx=x+flip*159*q
            yy=y-133*q
            breadth=(23 if k%2 else 10)*math.sin(math.pi*q)**.7
            blade.append((xx+flip*breadth*.72,yy+breadth*.7))
        out.append(f'<path d="{path_string(blade,True)}" fill="#45473f" opacity="{.56*leaf_u:.3f}" filter="url(#wet)"/>')
        out.append(brush(points,39-i*3,.96,.78,1410+i,reveal=leaf_u,wet=.4))
        out.append(brush(points,1.2,.65,.68,1415+i,reveal=leaf_u))
        for j in range(4):
            sx,sy=x+flip*(30+j*24),y-10-j*20
            out.append(brush([(sx,sy),(sx+flip*33,sy-25),(sx+flip*46,sy-57)],1.5,.5,.64,1420+i*9+j,reveal=leaf_u))
    cx,cy=810,485
    head_u=ease((t-2.0)/.60)
    out.append(brush([(cx-16,cy+12),(cx,cy-7),(cx+14,cy+12)],8,.39,.15,1440,reveal=head_u,wet=.6))
    # Attached neighbouring pappi. Hero's top-right sector is intentionally free.
    for k in range(30):
        a=k*math.tau/30
        if -1.25<a- math.tau*round(a/math.tau)<-.25:
            continue
        radius=72+7*math.sin(k*2.3)
        ex,ey=cx+math.cos(a)*radius,cy+math.sin(a)*radius
        out.append(brush([(cx,cy),(ex,ey)],1.2,.54,.72,1500+k,reveal=head_u))
        for j in range(5):
            aa=a+(j-2)*.29
            length=26+4*math.sin(k+j)
            out.append(brush([(ex,ey),(ex+math.cos(aa)*length,ey+math.sin(aa)*length)],.78,.56,.62,1600+k*5+j,reveal=head_u))
    return ''.join(out)


def seed_local(graphic_t, opacity=1.0):
    out=[]
    # Red-brown achene, thin beak and radial pappus. The same local identity is
    # transformed through the whole journey; shape phase moves on twos.
    sway=math.sin(graphic_t*.9)*1.2
    fibre_alpha=1-.94*ease((graphic_t-25.3)/2.1)
    out.append(brush([(0,24),(-5,38),(-3,65),(0,73),(4,59),(5,37),(0,24)],11,.96*opacity,.38,2301,color=SEED_COLOR,arc_reference=105,wet=.3))
    out.append(brush([(0,28),(sway*.3,-2),(sway,-38)],2.2,.88*opacity*fibre_alpha,.42,2303,arc_reference=67,wet=.08))
    # Fine filaments spread from one crown junction to a broad flattened ellipse.
    for k in range(26):
        a=k*math.tau/26
        ex=math.cos(a)*(85+6*math.sin(k*1.72))
        ey=-84+math.sin(a)*21
        bend=math.sin(k*.91)*3+sway
        out.append(brush([(sway,-38),(ex*.52+bend,-59),(ex,ey)],1.10,.80*opacity*fibre_alpha,.58,2350+k,arc_reference=96,wet=.04))
        # Split tips retain distinct botanic fibres even in the macro shot.
        if k%2==0:
            out.append(brush([(ex*.85,-79+(ey+84)*.6),(ex+4,ey-5)],.55,.42*opacity*fibre_alpha,.60,2400+k,arc_reference=20,wet=0))
    out.append(brush([(-61,-92),(-19,-102),(30,-100),(72,-86)],.6,.16*opacity*fibre_alpha,.9,2450,wet=0))
    return ''.join(out)


def subject(t):
    if t<12.2:
        return 853.,416.,.62
    if t<14.5:
        u=ease((t-12.2)/2.3)
        return mix(853,1330,u),mix(416,430,u),mix(.62,-.10,u)
    if t<22.4:
        u=ease((t-14.5)/7.9)
        return mix(1330,4160,u),430+125*math.sin(u*math.pi)+45*math.sin(u*math.tau),-.1+.10*math.sin(u*math.tau)
    u=ease((t-22.4)/2.8)
    # Body tip y = 928 exactly on the soil; it remains visible during growth.
    return mix(4160,4310,u),mix(430,855,u),mix(-.1,.02,u)


def camera(t):
    if t<4.8:
        return 930.,550.,1.0
    if t<9.5:
        u=ease((t-4.8)/4.7)
        return mix(930,853,u),mix(550,408,u),math.exp(mix(0,math.log(3.45),u))
    if t<12.2:
        u=ease((t-9.5)/2.7)
        return 853.,408.,mix(3.45,3.60,u)
    if t<14.5:
        u=ease((t-12.2)/2.3)
        x,y,_=subject(t)
        return mix(853,x+140,u),mix(408,y+85,u),math.exp(mix(math.log(3.60),math.log(1.65),u))
    if t<22.4:
        x,y,_=subject(t)
        return x+140,y+85,1.65
    if t<25.2:
        u=ease((t-22.4)/2.8)
        x,y,_=subject(t)
        return mix(x+140,4300,u),mix(y+85,837,u),math.exp(mix(math.log(1.65),math.log(2.6),u))
    if t<27.4:
        return 4300.,837.,2.6
    u=ease((t-27.4)/1.6)
    zoom=math.exp(mix(math.log(2.6),math.log(.43),u))
    # Interpolate the seed's screen position, not the camera's world position:
    # this avoids the subject swinging against the right border mid-pullback.
    offset=mix(26.,(4310-2690)*.43,u)
    return 4310-offset/zoom,mix(837,701,u),zoom


def wind(t):
    out=[]
    event=ease((t-11.7)/1.2)*(1-ease((t-14.5)/1.5))
    if event>0:
        for i in range(3):
            out.append(brush([(360,590+i*48),(618,574-i*17),(895,369-i*16),(1140,271+i*22),(1510,319+i*38)],2.7-i*.5,.24*event,.78,3100+i,reveal=ease((t-11.7-i*.09)/1.0),arc_reference=1250,wet=.1))
    return ''.join(out)


def text(s,x,y,size=44,color=INK,opacity=1.0,anchor='start',halo=0.0):
    outline=(f' stroke="{PAPER}" stroke-width="{halo:.3f}" stroke-linejoin="round" paint-order="stroke fill"' if halo>0 else '')
    return f'<text x="{x}" y="{y}" font-family="{FONT}, sans-serif" font-size="{size}" fill="{color}" opacity="{opacity:.3f}" text-anchor="{anchor}"{outline}>{html.escape(s)}</text>'


def render(t: float) -> str:
    t=clamp(float(t),0,DURATION)
    camera_t=math.floor(t*24+1e-8)/24
    graphic_t=math.floor(t*12+1e-8)/12
    cx,cy,zoom=camera(camera_t)
    x,y,angle=subject(camera_t)
    # Angle and organic posture change on twos; subject position and camera on ones.
    angle=subject(graphic_t)[2]
    title_alpha=ease((t-.8)/.7)*(1-ease((t-4.1)/.8))
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
    '<defs><filter id="wet" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.9"/></filter><filter id="wash" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>',
    '<filter id="inkgrain" x="-2%" y="-3%" width="104%" height="106%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".58 .95" numOctaves="2" seed="17" result="grain"/><feColorMatrix in="grain" type="luminanceToAlpha" result="alpha"/><feComponentTransfer in="alpha" result="dry"><feFuncA type="linear" slope="1.5" intercept=".23"/></feComponentTransfer><feComposite in="SourceGraphic" in2="dry" operator="in"/></filter><linearGradient id="mountain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#51584e"/><stop offset=".52" stop-color="#7c8073" stop-opacity=".42"/><stop offset="1" stop-color="#aaa68f" stop-opacity="0"/></linearGradient>',
    '<pattern id="rice" patternUnits="userSpaceOnUse" width="241" height="193">']
    rng=random.Random(70011)
    for i in range(70):
        px,py=rng.uniform(0,241),rng.uniform(0,193)
        length=rng.uniform(1,11)
        parts.append(f'<path d="M{px:.2f},{py:.2f} l{length:.2f},{rng.uniform(-5,5):.2f}" stroke="#96896a" opacity="{rng.uniform(.03,.10):.3f}" stroke-width="{rng.uniform(.2,.65):.2f}"/>')
    parts.append('</pattern></defs>')
    parts.append(f'<rect width="{W}" height="{H}" fill="{PAPER}"/>')
    parts.append(f'<g transform="translate({W/2:.3f},{H/2:.3f}) scale({zoom:.5f}) translate({-cx:.3f},{-cy:.3f})">')
    parts.append(f'<rect x="-5000" y="-5000" width="16000" height="14000" fill="url(#rice)" opacity="{clamp(zoom,.30,1):.3f}"/>')
    parts.append(f'<g opacity="{ease(t/1.4):.3f}">{landscape()}{field_plants()}</g>')
    parts.append(original_plant(min(t,2.6)))
    parts.append(wind(graphic_t))
    # Left field's ordinary Chinese title is painted-world typography, no box.
    if title_alpha>.001:
        for i,char in enumerate('一粒种子的旅行'):
            parts.append(text(char,190,170+i*58,48,opacity=title_alpha*.82))
        parts.append(text('风把距离打开',285,665,27,opacity=title_alpha*.56))
    parts.append(f'<g transform="translate({x:.3f},{y:.3f}) rotate({math.degrees(angle):.3f})">{seed_local(graphic_t,ease((t-2.0)/.60))}</g>')
    # A new anchored shoot is the consequence of the same seed's landing.
    growth=ease((t-25.4)/1.25)
    if growth>0:
        parts.append(brush([(4315,924),(4338,903),(4354,854)],5.5,.92,.58,4101,reveal=growth))
        left_growth=ease((t-26.1)/1.15)
        right_growth=ease((t-26.4)/1.15)
        parts.append(brush([(4338,900),(4312,883),(4297,861)],23,.91,.78,4102,reveal=left_growth))
        parts.append(brush([(4346,880),(4370,851),(4396,841)],24,.94,.78,4103,reveal=right_growth))
    parts.append('</g>')
    # Screen-space inscriptions move between intentional negative-space positions.
    if 9.8<t<12.0:
        alpha=ease((t-9.8)/.3)*(1-ease((t-11.7)/.3))
        parts.append(text('停一下。',148,928,44,opacity=.74*alpha))
        parts.append(text('风在靠近。',148,986,44,opacity=.74*alpha))
    if 16.0<t<20.5:
        alpha=ease((t-16)/.4)*(1-ease((t-20.1)/.4))
        parts.append(text('风起，山谷慢慢展开。',1120,927,38,opacity=.75*alpha,anchor='middle'))
    if 25.5<t<=30:
        alpha=ease((t-25.5)/.6)
        parts.append(text('落下，是另一种开始。',125,180,42,opacity=.78*alpha,halo=5*ease((t-26.0)/.3)))
    parts.append('</svg>')
    return ''.join(parts)


def export_review(out: Path):
    if out.exists() and any(out.iterdir()):
        raise FileExistsError(f'Review output is nonempty: {out}')
    out.mkdir(parents=True,exist_ok=True)
    times=[2.75,10.5,18.0,29.25]
    records=[]
    for i,t in enumerate(times,1):
        svg=out/f'keyframe-{i:02d}.svg'
        png=svg.with_suffix('.png')
        svg.write_text(render(t))
        subprocess.run(['rsvg-convert','--output',str(png),str(svg)],check=True,timeout=45)
        records.append({'time':t,'frame_at_24fps':round(t*24),'svg':svg.name,'png':png.name,'subjectId':'seed-redbrown-01','camera':dict(zip(['x','y','zoom'],camera(t)))})
    sheet=['<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1160"><rect width="100%" height="100%" fill="#e9e5db"/>']
    for i,record in enumerate(records):
        x=(i%2)*960;y=(i//2)*580
        data=base64.b64encode((out/record['png']).read_bytes()).decode()
        sheet.append(f'<image href="data:image/png;base64,{data}" x="{x}" y="{y}" width="960" height="540"/>')
        sheet.append(f'<text x="{x+18}" y="{y+568}" font-family="{FONT},sans-serif" font-size="22" fill="#252721">{record["time"]:.2f} s  |  original ink prototype  |  seed-redbrown-01</text>')
    sheet.append('</svg>')
    sheet_path=out/'contact-sheet.svg'
    sheet_path.write_text(''.join(sheet))
    subprocess.run(['rsvg-convert','--output',str(out/'contact-sheet.png'),str(sheet_path)],check=True,timeout=45)
    (out/'keyframes.json').write_text(json.dumps({'duration':DURATION,'dimensions':[W,H],'fps':24,'font':FONT,'kind':'review frames only; no full video or audio rendered','keyframes':records},ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    export_review(args.out)

"""Original 30-second whiteboard treatment, revised for actual cloud rendering.

render(t) is a deterministic, dependency-free SVG time function.  CLI needs the
already installed rsvg-convert and Fontconfig; no network, keys, API or media.
Chinese labels use actual Noto Sans CJK SC glyphs, appearing as typeset text. They are
never wiped across to impersonate handwriting. The pen draws graph paths only.
The optical ray geometry is illustrative, not a Snell-law simulation.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import math
from pathlib import Path
import subprocess

WIDTH, HEIGHT, SECONDS = 1920, 1080, 30.0
BOARD_W, BOARD_H = 6300, 2900
INK = "#28312f"
RED = "#c44e3f"
VIOLET = "#7051a1"
PAPER = "#f5f4ed"
FONT = "Noto Sans CJK SC"
PREVIEW_TIMES = [3.8, 13.5, 21.5, 29.5]
CAMERA_KEYS = [
    (0.0, 1150.0, 1270.0, 0.91),
    (4.6, 1150.0, 1270.0, 0.91),
    (9.8, 2660.0, 1360.0, 0.86),
    (15.3, 2660.0, 1360.0, 0.86),
    (20.4, 4450.0, 1620.0, 0.78),
    (23.0, 4450.0, 1620.0, 0.78),
    (27.0, 3100.0, 1500.0, 0.32),
    (30.0, 3100.0, 1500.0, 0.32),
]


def clamp(value, lo=0.0, hi=1.0):
    return max(lo, min(hi, value))


def progress(t, start, end):
    return clamp((t - start) / (end - start))


def ease(u):
    return 0.5 - 0.5 * math.cos(math.pi * clamp(u))


def camera(t):
    for a, b in zip(CAMERA_KEYS, CAMERA_KEYS[1:]):
        if a[0] <= t <= b[0]:
            u = ease(progress(t, a[0], b[0]))
            cx = a[1] + (b[1] - a[1]) * u
            cy = a[2] + (b[2] - a[2]) * u
            z = 1.0 / ((1.0 - u) / a[3] + u / b[3])
            return cx, cy, z
    return CAMERA_KEYS[-1][1:]


def coord(value):
    return f"{value:.3f}"


def point_list(points):
    return " ".join(f"{coord(x)},{coord(y)}" for x, y in points)


def polyline(points, color=INK, width=8, opacity=1.0):
    return (f'<polyline points="{point_list(points)}" fill="none" '
            f'stroke="{color}" stroke-width="{coord(width)}" '
            f'stroke-linecap="round" stroke-linejoin="round" '
            f'opacity="{coord(opacity)}"/>')


def length(points):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(points, points[1:]))


def partial(points, fraction):
    """Return a true arc-length prefix and the visible nib point."""
    distance = length(points) * clamp(fraction)
    out = [points[0]]
    for a, b in zip(points, points[1:]):
        span = math.hypot(b[0] - a[0], b[1] - a[1])
        if distance >= span:
            out.append(b)
            distance -= span
        else:
            u = distance / span if span else 0.0
            out.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
            break
    return out, out[-1]


def line(a, b, key, wobble=2.0):
    """The wobble is fixed to arc position and stroke identity, never time."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    norm = math.hypot(dx, dy)
    count = max(2, math.ceil(norm / 12.0))
    phase = (int(hashlib.sha256(key.encode()).hexdigest()[:8], 16) % 10000) / 733.0
    normal = (-dy / norm, dx / norm) if norm else (0.0, 0.0)
    result = []
    for i in range(count + 1):
        u = i / count
        offset = wobble * math.sin(math.pi * u) * math.sin(phase + u * 7.7)
        result.append((a[0] + dx * u + normal[0] * offset,
                       a[1] + dy * u + normal[1] * offset))
    return result


def ellipse(cx, cy, rx, ry, key, start=-0.3, turn=2.04 * math.pi):
    phase = (int(hashlib.sha256(key.encode()).hexdigest()[:8], 16) % 1000) / 137.0
    return [(cx + (rx + 1.2 * math.sin(i * .24 + phase)) * math.cos(start + turn * i / 120),
             cy + (ry + 1.2 * math.sin(i * .19 + phase)) * math.sin(start + turn * i / 120))
            for i in range(121)]


def wave(x, y, span, pitch, amplitude):
    return [(x + i * span / 130.0,
             y + amplitude * math.sin((i * span / 130.0) * math.tau / pitch))
            for i in range(131)]


def path_stroke(points, t, start, end, color=INK, width=8):
    if t <= start:
        return "", None
    u = progress(t, start, end)
    prefix, tip = partial(points, ease(u))
    # A narrow core and low-opacity edge create dry marker depth. Width and
    # texture do not evolve on already written sections.
    content = polyline(prefix, color, width + 1.8, .12) + polyline(prefix, color, width, .94)
    if len(prefix) > 3:
        first = prefix[0]
        content += (f'<circle cx="{coord(first[0])}" cy="{coord(first[1])}" '
                    f'r="{coord(width*.35)}" fill="{color}" opacity=".9"/>')
    return content, (tip, color) if u < 1 else None


def marker(tip, color, t, lift=0.0):
    x, y = tip
    # The nib is the local origin. Rotation changes the barrel, never its tip.
    angle = -47 + 2 * math.sin(t * 2.3)
    return (f'<g transform="translate({coord(x)} {coord(y-lift)}) rotate({coord(angle)})">'
            f'<ellipse cx="104" cy="{coord(36+lift)}" rx="{coord(88+lift*.35)}" ry="{coord(16+lift*.12)}" fill="#101715" opacity=".13" filter="url(#penShadow)"/>'
            '<path d="M 0 0 L 32 -12 L 32 12 Z" fill="#28312f"/>'
            '<rect x="27" y="-18" width="179" height="36" rx="14" fill="url(#barrel)" stroke="#c0c5bc" stroke-width="2"/>'
            f'<rect x="162" y="-18" width="39" height="36" rx="9" fill="{color}"/>'
            '<rect x="75" y="-15" width="60" height="30" rx="2" fill="#f9fbf5"/>'
            '<path d="M 86 -6 L 125 -6 M 86 1 L 119 1 M 86 8 L 123 8" stroke="#646e64" stroke-width="1.5"/>'
            '</g>')


def text_width(text, size):
    # Conservative for culling; final raster glyphs use verified Noto Sans CJK SC.
    return sum(size * (1.0 if ord(c) > 127 else .63) for c in text)


def label(text, x, y, size, t, on, camera_pose, color=INK, weight=500):
    if t < on:
        return ""
    cx, cy, z = camera_pose
    width = text_width(text, size)
    sx, sy = WIDTH / 2 + (x - cx) * z, HEIGHT / 2 + (y - cy) * z
    # Labels are wholly visible during a reading hold, or culled as the camera
    # crosses regions. Drawing geometry may still cross the frame edge.
    if sx < 40 or sx + width * z > WIDTH - 40 or sy - size * z < 35 or sy + size * .22 * z > HEIGHT - 40:
        return ""
    return (f'<text x="{coord(x)}" y="{coord(y)}" font-family="{FONT}" '
            f'font-size="{coord(size)}" font-weight="{weight}" fill="{color}">'
            f'{html.escape(text)}</text>')


def strokes():
    """Scheduled graph operations. The same paths survive across camera visits."""
    items = []
    # Original flashlight diagram; no downloaded asset.
    outline = [(260,1145),(670,1145),(825,1180),(922,1250),(922,1340),(825,1425),(670,1460),(260,1460),(235,1435),(235,1170),(260,1145)]
    items.append(("source-outline", outline, .4, 1.5, INK, 10))
    items.append(("source-lens", ellipse(910,1295,55,135,"lens"), 1.55, 2.15, INK, 9))
    for i in range(4):
        items.append((f"source-grip-{i}",line((420+i*55,1170),(400+i*55,1438),f"grip-{i}"),2.2+i*.19,2.36+i*.19,INK,5))
    items.append(("source-switch",line((585,1133),(665,1133),"switch"),3.0,3.12,INK,13))
    items.append(("white-ray",line((976,1290),(2477,1290),"white-ray",1.2),3.15,7.1,INK,14))
    vertices = [(2680,930),(3030,1640),(2280,1640),(2680,930)]
    for i,(a,b) in enumerate(zip(vertices,vertices[1:])):
        items.append((f"prism-edge-{i}",line(a,b,f"prism-edge-{i}",3),7.3+i*1.0,8.2+i*1.0,INK,9))
    items.append(("inside-ray",line((2477,1290),(2868,1312),"inside-ray",.7),10.6,11.3,INK,11))
    # Two limit rays are real arc-length reveals, not box reveals. The smooth
    # ribbon between them is the illustrative continuous spectrum.
    items.append(("ray-red",line((2868,1312),(4700,1450),"ray-red",.6),11.6,15.5,RED,10))
    items.append(("ray-violet",line((2868,1312),(4700,2110),"ray-violet",.6),12.05,16.0,VIOLET,10))
    items.append(("red-leader",line((4700,1450),(4820,1450),"red-leader",1),16.2,16.6,RED,6))
    items.append(("violet-leader",line((4700,2110),(4820,2110),"violet-leader",1),17.1,17.5,VIOLET,6))
    items.append(("long-wave",wave(4800,1610,700,260,36),18.0,19.25,RED,7))
    items.append(("short-wave",wave(4800,2240,700,130,36),19.6,21.0,VIOLET,7))
    items.append(("conclusion-underline",line((750,530),(5400,530),"conclusion-underline",3),25.0,26.8,INK,9))
    return items


STROKES = strokes()


def pen_owner(identity):
    if identity in {"ray-red","red-leader","long-wave"}: return "red"
    if identity in {"ray-violet","violet-leader","short-wave"}: return "violet"
    return "black"


def pen_pose(t, owner):
    """One black construction pen; two colored pens only for the spectrum."""
    jobs=sorted((s for s in STROKES if pen_owner(s[0])==owner),key=lambda s:s[2])
    color={"black":INK,"red":RED,"violet":VIOLET}[owner]
    for job in jobs:
        if job[2] <= t <= job[3]:
            _,tip=partial(job[1],ease(progress(t,job[2],job[3])))
            return tip,color,0.0
    previous=next((s for s in reversed(jobs) if s[3]<t),None)
    upcoming=next((s for s in jobs if s[2]>t),None)
    if previous and upcoming and upcoming[2]-previous[3] <= .3:
        u=ease(progress(t,previous[3],upcoming[2])); a=previous[1][-1]; b=upcoming[1][0]
        return (a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u),color,60*math.sin(math.pi*u)
    # No idle/transit markers on the board. The active tool is shown only while
    # drawing or making a short intentional lift to its next contiguous stroke.
    return None


def render(t: float) -> str:
    """Return one complete 1920 by 1080 SVG without filesystem side effects."""
    if not math.isfinite(t):
        raise ValueError("t must be finite")
    t = clamp(float(t), 0.0, SECONDS)
    pose = camera(t)
    cx, cy, z = pose
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">',
        '<defs><linearGradient id="board" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8f9f1"/><stop offset=".55" stop-color="#f2f4ed"/><stop offset="1" stop-color="#eef0e9"/></linearGradient>',
        '<linearGradient id="barrel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fdfff8"/><stop offset=".5" stop-color="#e2e7df"/><stop offset="1" stop-color="#a4afa4"/></linearGradient>',
        '<linearGradient id="spectrum" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e4654c"/><stop offset=".18" stop-color="#e5ad40"/><stop offset=".36" stop-color="#d0c147"/><stop offset=".52" stop-color="#67a96b"/><stop offset=".7" stop-color="#4ba3a4"/><stop offset=".84" stop-color="#587fba"/><stop offset="1" stop-color="#8b6cb5"/></linearGradient>',
        '<filter id="penShadow" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="9"/></filter>',
        '<filter id="boardShadow" x="-10%" y="-20%" width="130%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>',
        '</defs><rect width="1920" height="1080" fill="#d9ddd1"/>',
        f'<g transform="translate(960 540) scale({coord(z)}) translate({coord(-cx)} {coord(-cy)})">',
        f'<rect x="-15" y="18" width="{BOARD_W+30}" height="{BOARD_H+35}" rx="14" fill="#596256" opacity=".2" filter="url(#boardShadow)"/>',
        f'<rect x="-16" y="-16" width="{BOARD_W+32}" height="{BOARD_H+32}" rx="14" fill="#a6b0a1"/>',
        f'<rect width="{BOARD_W}" height="{BOARD_H}" rx="6" fill="url(#board)"/>']
    # Deterministic very faint old marks, fixed in board coordinates.
    for i in range(32):
        x = 170 + (i * 1373) % 5940
        y = 110 + (i * 787) % 2550
        angle = ((i * 37) % 90) - 45
        parts.append(f'<path d="M {x} {y} q 150 -18 250 10" fill="none" stroke="#657c69" stroke-width="3" opacity=".027" transform="rotate({angle} {x} {y})"/>')
    parts.append('<path d="M 0 510 L 6300 20 L 6300 155 L 0 645 Z" fill="#ffffff" opacity=".17"/>')
    if t > 9.0:
        parts.append(f'<polygon points="2680,930 3030,1640 2280,1640" fill="#dce8e3" opacity="{coord(.32*progress(t,9,10.8))}"/>')
        # Fine diagonal hatching remains on the same glass diagram.
        for i in range(7):
            y=1150+i*57
            x_left=2680-(y-930)*400/710
            x_right=2680+(y-930)*350/710
            parts.append(polyline([(x_left+15,y),(x_right-15,y-30)],"#a0bbb0",3,.22*progress(t,9.5,10.8)))
    ray_u = ease(progress(t, 12.05, 16.0))
    if ray_u > 0:
        end_x=2868+1832*ray_u
        top_y=1312+(1450-1312)*ray_u
        bottom_y=1312+(2110-1312)*ray_u
        parts.append(f'<path d="M 2868 1312 L {coord(end_x)} {coord(top_y)} L {coord(end_x)} {coord(bottom_y)} Z" fill="url(#spectrum)" opacity=".44"/>')
    for identity, pts, start, end, color, width in STROKES:
        content, _ = path_stroke(pts,t,start,end,color,width)
        parts.append(f'<g id="{identity}">{content}</g>')
    # A white inset makes the incident light path legible without a chart bar.
    if t>3.15:
        pts,_=partial(line((976,1290),(2477,1290),"white-ray",1.2),ease(progress(t,3.15,7.1)))
        parts.append(polyline(pts,"#fbfff5",8,.98))
    if t>10.6:
        pts,_=partial(line((2477,1290),(2868,1312),"inside-ray",.7),ease(progress(t,10.6,11.3)))
        parts.append(polyline(pts,"#fbfff5",6,.98))
    labels = [
        ("白光里有什么？",260,900,150,.25,INK,600),
        ("光源",310,1610,98,2.7,INK,500),
        ("白光",1320,1200,116,3.3,INK,500),
        ("棱镜",2430,1780,110,11.0,INK,500),
        ("光路与角度为示意",2270,1900,66,11.0,"#6e7b70",500),
        ("波长不同",3730,1140,135,17.4,INK,600),
        ("偏折程度不同",3730,1300,135,19.6,INK,600),
        ("红光",4820,1430,105,16.6,RED,600),
        ("波长较长",5090,1430,72,19.25,RED,500),
        ("紫光",4820,2100,105,17.5,VIOLET,600),
        ("波长较短",5090,2100,72,21.0,VIOLET,500),
        ("白光里的颜色，被棱镜分开了",750,430,230,26.6,INK,600),
        ("不同波长 → 不同偏折",1850,730,120,27.0,INK,500),
        ("连续光谱示意",3520,2510,100,25.0,"#6e7b70",500),
    ]
    for content,x,y,size,on,color,weight in labels:
        parts.append(label(content,x,y,size,t,on,pose,color,weight))
    for owner in ["black","red","violet"]:
        pen=pen_pose(t,owner)
        if pen:
            parts.append(marker(pen[0],pen[1],t,pen[2]))
    # The actual tray only appears in the complete-board camera view.
    parts.append('<rect x="1750" y="2920" width="2700" height="43" rx="10" fill="#8e998a"/>')
    for i,color in enumerate([INK,RED,VIOLET]):
        parts.append(f'<rect x="{2900+i*210}" y="2915" width="155" height="30" rx="10" fill="#eff1e9"/><rect x="{3015+i*210}" y="2915" width="35" height="30" rx="8" fill="{color}"/>')
    parts.append('</g></svg>')
    return "".join(parts)


def font_preflight():
    result = subprocess.run(["fc-match",FONT,"--format=%{family}\n%{file}\n"],check=True,capture_output=True,text=True)
    family,font_path=result.stdout.strip().splitlines()[:2]
    if "Noto Sans CJK SC" not in family:
        raise RuntimeError(f"Required Noto Sans CJK SC family unavailable: {family}")
    chars=subprocess.run(["fc-query","--format=%{charset}",font_path],check=True,capture_output=True,text=True).stdout
    ranges=[]
    for token in chars.split():
        try:
            values=[int(v,16) for v in token.split("-")]
        except ValueError:
            continue
        ranges.append((values[0],values[-1]))
    all_text="白光里有什么？光源白光棱镜光路与角度为示意波长不同偏折程度不同红光波长较长紫光波长较短白光中原有的颜色，被分开了连续光谱示意"
    missing=sorted(set(c for c in all_text if not any(lo<=ord(c)<=hi for lo,hi in ranges)))
    if missing:
        raise RuntimeError("Missing Chinese glyphs: "+"".join(missing))
    return {"family":family,"font_path":font_path,"missing_glyphs":missing,"font_embedded":False}


def preview(output):
    output.mkdir(parents=True,exist_ok=False)
    font=font_preflight()
    evidence=[]
    tiles=[]
    for i,t in enumerate(PREVIEW_TIMES):
        source=output/f"frame-{i+1:02d}-{t:04.1f}s.svg"
        png=source.with_suffix(".png")
        source.write_text(render(t),encoding="utf-8")
        subprocess.run(["rsvg-convert","--output",str(png),str(source)],check=True)
        evidence.append({"time":t,"svg":source.name,"png":png.name,"svg_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),"camera":camera(t)})
        x=(i%2)*960;y=(i//2)*570
        data=base64.b64encode(png.read_bytes()).decode()
        tiles.append(f'<image href="data:image/png;base64,{data}" x="{x}" y="{y}" width="960" height="540"/><text x="{x+16}" y="{y+561}" font-family="sans-serif" font-size="19" fill="#28312f">{t:.1f} s</text>')
    contact=output/"contact-sheet.svg"
    contact.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1140"><rect width="100%" height="100%" fill="#e3e6dd"/>'+"".join(tiles)+'</svg>',encoding="utf-8")
    subprocess.run(["rsvg-convert","--output",str(contact.with_suffix(".png")),str(contact)],check=True)
    report={"status":"first-stage keyframes, no MP4 encoded","seconds":SECONDS,"dimensions":[WIDTH,HEIGHT],"font":font,"frames":evidence,"audio":"planned only; no audible review or synthesized file","optics":"illustration only; angles not calculated from refractive index","visual_review":"pending actual view_image"}
    (output/"manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",type=Path,default=Path(__file__).with_suffix(""))
    args=parser.parse_args()
    preview(args.out)

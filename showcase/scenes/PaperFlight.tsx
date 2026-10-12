import React from 'react';
import {useCurrentFrame} from 'remotion';

const C = {cream: '#f5f1e6', blue: '#2536e8', red: '#ff3b3b', yellow: '#ffd21e', ink: '#17171f', white: '#ffffff', crease: '#e4dfd0'};
const DISPLAY = '"CandyDisplay", "PingFang SC", "Microsoft YaHei", sans-serif';
const BODY = '"VideoSans", "PingFang SC", "Microsoft YaHei", sans-serif';
type P = {x: number; y: number};
type P3 = P & {z: number};
type Leg = {from: number; to: number; points: [P, P, P, P]};
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const phase = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const out = (v: number) => 1 - (1 - clamp(v)) ** 3;
const smooth = (v: number) => {const p = clamp(v); return p * p * (3 - 2 * p);};
const mix = (a: P, b: P, p: number): P => ({x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p});
const point = (x: number, y: number): P => ({x, y});
const points = (values: P[]) => values.map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
const burst = (t: number, at: number, span = .6) => {const p = phase(t, at, at + span); return p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0;};
const pop = (t: number, at: number) => {const p = phase(t, at, at + .42); return p === 1 ? 1 : 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;};

function cubic(leg: Leg, time: number) {
  const p = phase(time, leg.from, leg.to), q = 1 - p;
  const [a, b, c, d] = leg.points;
  return {
    x: q ** 3 * a.x + 3 * q * q * p * b.x + 3 * q * p * p * c.x + p ** 3 * d.x,
    y: q ** 3 * a.y + 3 * q * q * p * b.y + 3 * q * p * p * c.y + p ** 3 * d.y,
    dx: 3 * q * q * (b.x - a.x) + 6 * q * p * (c.x - b.x) + 3 * p * p * (d.x - c.x),
    dy: 3 * q * q * (b.y - a.y) + 6 * q * p * (c.y - b.y) + 3 * p * p * (d.y - c.y),
  };
}

function route(portrait: boolean): Leg[] {
  const p = portrait ? [
    [point(360, 615), point(518, 590), point(572, 450), point(450, 350)],
    [point(450, 350), point(294, 222), point(78, 390), point(175, 670)],
    [point(175, 670), point(248, 880), point(490, 925), point(517, 833)],
    [point(517, 833), point(566, 666), point(475, 458), point(343, 537)],
    [point(343, 537), point(196, 625), point(162, 774), point(350, 770)],
    [point(350, 770), point(510, 766), point(486, 575), point(552, 575)],
  ] : [
    [point(460, 435), point(600, 275), point(709, 229), point(815, 335)],
    [point(815, 335), point(972, 494), point(800, 628), point(633, 520)],
    [point(633, 520), point(490, 427), point(615, 132), point(841, 260)],
    [point(841, 260), point(1032, 368), point(1059, 532), point(845, 436)],
    [point(845, 436), point(672, 358), point(690, 544), point(785, 400)],
    [point(785, 400), point(848, 304), point(929, 250), point(995, 250)],
  ];
  const times = [3.75, 5.5, 7.5, 9.5, 11.5, 13.75, 15];
  return p.map((values, i) => ({from: times[i], to: times[i + 1], points: values as [P, P, P, P]}));
}

function fly(legs: Leg[], t: number) {
  return cubic(legs.find(leg => t < leg.to) || legs[legs.length - 1], t);
}

function foldAround(value: P, a: P, b: P, angle: number): P3 {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
  const vx = value.x - a.x, vy = value.y - a.y, dot = ux * vx + uy * vy;
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  return {x: a.x + vx * cosine + ux * dot * (1 - cosine), y: a.y + vy * cosine + uy * dot * (1 - cosine), z: (ux * vy - uy * vx) * sine};
}

const project = (value: P3): P => {const perspective = 700 / (700 - value.z); return {x: value.x * perspective, y: value.y * perspective};};
const strip = (values: P[]) => [mix(values[0], values[3], .28), mix(values[1], values[2], .3), mix(values[1], values[2], .58), mix(values[0], values[3], .49)];

function paperFaces(t: number) {
  const nose = point(0, -160), leftSide = point(-130, -30), rightSide = point(130, -30);
  const wing = smooth(phase(t, 2, 3.5));
  const pinch = Math.sin(wing * Math.PI) * .58;
  const deform = (start: P[], end: P[], side: number) => start.map((value, i) => {
    const p = mix(value, end[i], wing);
    const z = Math.abs(p.x) * Math.sin(wing * Math.PI) * .45;
    return project({x: p.x * (1 - pinch), y: p.y, z: z * side});
  });
  const left = deform([nose, leftSide, point(-130, 160), point(0, 160)], [point(0, -164), point(-154, 108), point(-42, 69), point(0, 116)], 1);
  const right = deform([nose, rightSide, point(130, 160), point(0, 160)], [point(0, -164), point(154, 108), point(42, 69), point(0, 116)], -1);
  const foldedLeft = project(foldAround(point(-130, -160), nose, leftSide, Math.PI * smooth(phase(t, .5, 1.25))));
  const foldedRight = project(foldAround(point(130, -160), nose, rightSide, -Math.PI * smooth(phase(t, 1.25, 2))));
  const topLeft = [mix(nose, point(0, -164), wing), mix(foldedLeft, point(-28, 68), wing), mix(leftSide, point(-82, 41), wing)];
  const topRight = [mix(nose, point(0, -164), wing), mix(foldedRight, point(28, 68), wing), mix(rightSide, point(82, 41), wing)];
  return {left, right, topLeft, topRight, wing};
}

function Paper({t, bank}: {t: number; bank: number}) {
  const f = paperFaces(t), facets = [f.left, f.right, f.topLeft, f.topRight];
  const lowerTone = bank < 0 ? '#e4e5ef' : '#eeeade';
  return <g data-paper-entity="idea-sheet">
    <g transform="translate(10 12)" opacity={.32} fill={C.ink} stroke={C.ink} strokeWidth={12} strokeLinejoin="round">
      {facets.map((face, i) => <polygon key={`shadow-${i}`} points={points(face)} />)}
    </g>
    <g fill={C.white} stroke={C.white} strokeWidth={15} strokeLinejoin="round">
      {facets.map((face, i) => <polygon key={`edge-${i}`} points={points(face)} />)}
    </g>
    <polygon points={points(f.left)} fill={C.white} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
    <polygon points={points(f.right)} fill={lowerTone} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
    <polygon points={points(strip(f.left))} fill={C.blue} />
    <polygon points={points(strip(f.right))} fill={C.yellow} />
    <polygon points={points(f.topLeft)} fill={t < 1 ? C.white : '#f0eee6'} stroke={C.ink} strokeWidth={2.8} strokeLinejoin="round" />
    <polygon points={points(f.topRight)} fill={C.white} stroke={C.ink} strokeWidth={2.8} strokeLinejoin="round" />
    <line x1={f.left[0].x} y1={f.left[0].y} x2={f.left[3].x} y2={f.left[3].y} stroke={C.ink} strokeWidth={3} />
    <line x1={mix(f.right[0], f.right[3], .34).x} y1={mix(f.right[0], f.right[3], .34).y} x2={mix(f.right[1], f.right[2], .46).x} y2={mix(f.right[1], f.right[2], .46).y} stroke={C.white} strokeWidth={4} />
    <circle cx={mix(f.left[1], f.left[3], .7).x} cy={mix(f.left[1], f.left[3], .7).y} r={11} fill={t >= 5.25 ? C.red : C.blue} stroke={C.ink} strokeWidth={2} />
    <path d={`M ${f.left[0].x} ${f.left[0].y + 10} l -9 30 h 18 Z`} fill={C.blue} opacity={f.wing} />
  </g>;
}

function flower(radius: number) {
  const vertices = Array.from({length: 48}, (_, i) => {const a = i / 48 * Math.PI * 2; const r = radius * (1 + .13 * Math.cos(a * 6)); return point(Math.cos(a) * r, Math.sin(a) * r);});
  return `M ${vertices.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
}

function star(radius: number, arms = 8) {
  return `M ${Array.from({length: arms * 2}, (_, i) => {const a = i / (arms * 2) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? radius * .67 : radius; return `${Math.cos(a) * r},${Math.sin(a) * r}`;}).join(' L ')} Z`;
}

function Sticker({kind, x, y, r, t, at, peel}: {kind: 'red'|'yellow'|'blue'; x: number; y: number; r: number; t: number; at: number; peel: number}) {
  const d = kind === 'red' ? flower(r) : kind === 'yellow' ? star(r) : `M ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  const tilt = kind === 'red' ? -6 : kind === 'yellow' ? 5 : -4;
  return <g transform={`translate(${x - peel * 16} ${y - peel * 22}) rotate(${tilt * (1 - peel)}) scale(${Math.max(0, pop(t, at)) * (1 + peel * .06)})`}>
    <path d={d} transform={`translate(${8 + peel * 7} ${9 + peel * 7})`} fill={C.ink} stroke={C.ink} strokeWidth={16} strokeLinejoin="round" />
    <path d={d} fill={C.white} stroke={C.white} strokeWidth={16} strokeLinejoin="round" />
    <path d={d} fill={C[kind]} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
    {kind === 'red' ? <g fill="none" stroke={C.ink} strokeWidth={4.5} strokeLinecap="round">
      <path d={`M -28 -8 q 8 -10 16 0 M 15 -9 l 14 0 M -23 18 q 22 23 47 -1`} />
      <circle cx={-29} cy={12} r={6} fill={C.yellow} stroke="none" /><circle cx={31} cy={12} r={6} fill={C.yellow} stroke="none" />
    </g> : kind === 'yellow' ? <path d="M 13 -44 L -28 7 L -3 7 L -16 43 L 31 -11 L 5 -11 Z" fill={C.ink} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" /> : <g fill="none" stroke={C.white} strokeWidth={9} strokeLinecap="round"><path d="M -37 4 C -38 -34 29 -40 32 -3 C 36 29 -19 33 -20 8 C -20 -6 7 -10 10 5" /><circle cx={39} cy={36} r={8} fill={C.yellow} stroke="none" /></g>}
    {peel > 0 ? <path d={`M ${r * .57} ${-r * .7} L ${r * .86} ${-r * .47} L ${r * .46} ${-r * .42} Z`} fill={C.white} stroke={C.ink} strokeWidth={2} /> : null}
  </g>;
}

export const PaperFlight: React.FC<{portrait: boolean}> = ({portrait}) => {
  const frame = useCurrentFrame(), t = frame / 30;
  const width = portrait ? 720 : 1280, height = portrait ? 1280 : 720;
  const legs = route(portrait), position = fly(legs, t);
  const launch = smooth(phase(t, 3.45, 3.75));
  const tangentAngle = Math.atan2(position.dy, position.dx) * 180 / Math.PI + 90;
  const initialAngle = -7 + Math.sin(t * 3) * 1.5;
  const angle = initialAngle * (1 - launch) + tangentAngle * launch;
  const bank = t < 3.75 || t >= 15 ? 0 : Math.sin((t - 3.75) * 2.2) * .32;
  const paperSize = portrait ? .93 : .86;
  const flightSize = .62 + .075 * Math.sin((Math.max(3.75, Math.min(t, 15)) - 3.75) * .75);
  const size = paperSize + (flightSize - paperSize) * launch;
  const headOpacity = t < 4 ? 1 - smooth(phase(t, 3.25, 3.75)) : smooth(phase(t, 13.25, 13.75));
  const captionOpacity = t < 3.75 ? 1 - smooth(phase(t, 3.2, 3.75)) : t < 12.75 ? smooth(phase(t, 4, 4.5)) : smooth(phase(t, 13.25, 13.75));
  const caption = t < 3.75 ? '一张白纸，也有自己的方向。' : t < 13 ? '把想法，带到更远的地方。' : '留下属于自己的印记。';
  const stamp = pop(t, 13.75), stampX = portrait ? 350 : 783, stampY = portrait ? 850 : 463;
  const redCue = cubic(legs[0], 5.25), yellowCue = cubic(legs[1], 6.75), blueCue = cubic(legs[2], 9);
  const stickers = [
    {kind: 'red' as const, x: redCue.x + (portrait ? 90 : 95), y: redCue.y + (portrait ? -8 : 30), r: portrait ? 67 : 68, at: 0},
    {kind: 'yellow' as const, x: yellowCue.x + (portrait ? -76 : 10), y: yellowCue.y + (portrait ? 106 : 66), r: portrait ? 66 : 63, at: .25},
    {kind: 'blue' as const, x: blueCue.x + (portrait ? 65 : -78), y: blueCue.y + (portrait ? 12 : -66), r: portrait ? 70 : 67, at: .5},
  ];
  const path = `M ${legs[0].points[0].x} ${legs[0].points[0].y} ${legs.map(({points: [, b, c, d]}) => `C ${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`).join(' ')}`;
  const textBase: React.CSSProperties = {position: 'absolute', margin: 0, color: C.ink, fontWeight: 400, fontSynthesis: 'none', whiteSpace: 'nowrap', lineHeight: 1.5};
  return <div style={{position: 'absolute', inset: 0, width, height, background: C.cream, overflow: 'hidden'}}>
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}} aria-hidden="true">
      <path d={portrait ? 'M 50 78 h 620 M 50 1182 h 620' : 'M 64 54 h 1152 M 64 650 h 1152'} stroke={C.crease} strokeWidth={2} />
      <g opacity={.5}><circle cx={portrait ? 625 : 1150} cy={portrait ? 1120 : 110} r={8} fill={C.red} /><path d={`M ${portrait ? 69 : 78} ${portrait ? 910 : 390} l 18 -18 m -18 0 l 18 18`} fill="none" stroke={C.blue} strokeWidth={4} strokeLinecap="round" /></g>
      <path d={path} pathLength={1000} fill="none" stroke={C.blue} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${phase(t, 3.75, 15) * 1000} 1000`} opacity={t >= 3.75 ? .18 : 0} />
      {stickers.map(sticker => {
        const distance = Math.hypot(position.x - sticker.x, position.y - sticker.y);
        const peel = t >= 3.75 && t < 13.25 ? clamp(1 - distance / 175) : 0;
        return <Sticker key={sticker.kind} {...sticker} t={t} peel={peel} />;
      })}
      <g transform={`translate(${stampX} ${stampY}) rotate(-4) scale(${Math.max(0, stamp)})`}>
        <rect x={portrait ? -170 : -155} y={-132} width={portrait ? 340 : 310} height={264} rx={36} transform="translate(10 12)" fill={C.ink} stroke={C.ink} strokeWidth={16} />
        <rect x={portrait ? -170 : -155} y={-132} width={portrait ? 340 : 310} height={264} rx={36} fill={C.white} stroke={C.white} strokeWidth={16} />
        <rect x={portrait ? -170 : -155} y={-132} width={portrait ? 340 : 310} height={264} rx={36} fill={C.white} stroke={C.ink} strokeWidth={3} />
        <circle cy={-42} r={62} fill={C.blue} stroke={C.ink} strokeWidth={3} />
        <path d={star(41, 5)} transform="translate(0 -42) rotate(-12)" fill={C.yellow} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        <path d="M -104 98 l 26 0 M 77 98 l 27 0" stroke={C.red} strokeWidth={5} strokeLinecap="round" />
      </g>
      <g transform={`translate(${position.x} ${position.y}) rotate(${angle}) scale(${size * Math.cos(bank)} ${size})`}>
        <Paper t={t} bank={bank} />
      </g>
      {[0, 1, 2, 3, 4].map(i => {
        const p = burst(t, 13.75 + i * .05, .55), a = i * Math.PI * .4 - 1.8;
        return <path key={i} d={`M ${stampX + Math.cos(a) * (90 + p * 50)} ${stampY - 42 + Math.sin(a) * (90 + p * 50)} l ${Math.cos(a) * 22} ${Math.sin(a) * 22}`} stroke={i % 2 ? C.yellow : C.blue} strokeWidth={5} strokeLinecap="round" opacity={p} />;
      })}
    </svg>
    <h1 data-readable="true" style={{...textBase, left: portrait ? 48 : 64, top: portrait ? 115 : 72, fontFamily: DISPLAY, fontSize: portrait ? 108 : 112, letterSpacing: -2, paddingBottom: 12, opacity: headOpacity}}>让点子飞</h1>
    <p data-readable="true" style={{...textBase, left: portrait ? 48 : 68, top: portrait ? (t < 3.75 || t >= 13 ? 302 : 1110) : (t < 3.75 || t >= 13 ? 258 : 600), fontFamily: BODY, fontSize: portrait ? 27 : 26, opacity: captionOpacity, paddingBottom: 8}}>{caption}</p>
    <div data-readable="true" style={{...textBase, left: stampX - 118, top: stampY + 34, width: 236, textAlign: 'center', fontFamily: DISPLAY, fontSize: 46, opacity: phase(t, 14, 14.25), transform: 'rotate(-4deg)', paddingBottom: 8}}>我的点子</div>
    <p data-readable="true" style={{...textBase, left: portrait ? 48 : 64, top: portrait ? 1200 : 666, fontFamily: BODY, fontSize: portrait ? 21 : 20, color: '#63625b'}}>HEIGE VIDEO / LET IDEAS FLY</p>
  </div>;
};


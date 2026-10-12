import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

// Original coffee equipment illustration, extraction, pouring and foam geometry.
const C = {paper: '#efe3d3', surface: '#f7efe1', foam: '#f4ebda', ink: '#3a2a20', muted: '#6f5b48', line: '#dcccb6', accent: '#c17a35', crema: '#d7a869', roast: '#2a1d15', primary: '#4a352a'};
const display = {fontFamily: 'CaseDisplay, PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const body = {fontFamily: 'CaseSans, PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {const q = clamp(x); return q * q * (3 - 2 * q);};
const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const pulse = (t: number, a: number, duration: number) => t >= a && t < a + duration ? Math.sin((t - a) / duration * Math.PI) : 0;
const cupSide = 'M -103 0 Q -101 139 -70 157 Q 0 184 70 157 Q 101 138 103 0 Z';

const Machine: React.FC<{t: number}> = ({t}) => {
  const on = ramp(t, .1, .8), exit = ramp(t, 5.9, 6.75);
  const handle = ramp(t, 1.4, 2);
  return <g data-object-id="coffee-machine" transform={`translate(${-300 * exit} ${60 * (1 - on) - 55 * exit})`} opacity={on * (1 - exit)}>
    <path d="M 208 639 L 194 697 L 530 697 L 517 639 Z" fill={C.primary} stroke={C.ink} strokeWidth="5" />
    <path d="M 217 665 L 507 665 L 515 683 L 210 683 Z" fill={C.line} />
    {Array.from({length: 10}, (_, i) => <path key={i} d={`M ${234 + i * 27} 669 L ${231 + i * 27} 680`} stroke={C.muted} strokeWidth="5" strokeLinecap="round" />)}
    <path d="M 199 449 Q 199 420 228 416 L 497 416 Q 524 420 524 449 L 524 582 Q 520 608 496 609 L 224 609 Q 199 608 199 579 Z" fill={C.line} transform="translate(9 10)" />
    <path d="M 199 449 Q 199 420 228 416 L 497 416 Q 524 420 524 449 L 524 582 Q 520 608 496 609 L 224 609 Q 199 608 199 579 Z" fill={C.surface} stroke={C.ink} strokeWidth="6" />
    <path d="M 214 446 L 511 446" stroke={C.line} strokeWidth="8" />
    <path d="M 227 465 L 227 569" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
    <rect x="301" y="547" width="117" height="64" rx="14" fill={C.primary} stroke={C.ink} strokeWidth="5" />
    <path d="M 313 565 L 406 565 L 400 589 L 319 589 Z" fill={C.line} />
    <circle cx="359" cy="493" r="35" fill={C.crema} stroke={C.ink} strokeWidth="5" />
    <circle cx="359" cy="493" r="26" fill={C.foam} />
    {Array.from({length: 5}, (_, i) => <path key={i} d={`M ${359 + Math.cos((i + 3) * Math.PI / 4) * 19} ${493 + Math.sin((i + 3) * Math.PI / 4) * 19} L ${359 + Math.cos((i + 3) * Math.PI / 4) * 24} ${493 + Math.sin((i + 3) * Math.PI / 4) * 24}`} stroke={C.muted} strokeWidth="3" />)}
    <path d="M 359 493 L 359 472" transform={`rotate(${-52 + 101 * ramp(t, 2, 3.25)} 359 493)`} stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
    <circle cx="359" cy="493" r="4" fill={C.ink} />
    <rect x="463" y="478" width="22" height="30" rx="8" fill={t >= .8 ? C.accent : C.line} stroke={C.ink} strokeWidth="3" />
    <path d="M 507 582 L 533 606 L 533 642" fill="none" stroke={C.ink} strokeWidth="12" strokeLinecap="round" />
    <path d="M 507 582 L 533 606 L 533 642" fill="none" stroke={C.line} strokeWidth="6" strokeLinecap="round" />
    <g data-object-id="coffee-portafilter" transform={`translate(${360 + 175 * (1 - handle)} ${614 + 59 * (1 - handle)}) rotate(${36 * (1 - handle)})`} opacity={ramp(t, 1.15, 1.4)}>
      <path d="M -51 -12 L 51 -12 L 44 13 Q 0 35 -44 13 Z" fill={C.line} stroke={C.ink} strokeWidth="5" />
      <path d="M 42 2 L 93 2" stroke={C.ink} strokeWidth="15" />
      <rect x="84" y="-13" width="112" height="29" rx="13" fill={C.primary} stroke={C.ink} strokeWidth="5" />
      <path d="M 95 -5 L 177 -5" stroke={C.muted} strokeWidth="4" strokeLinecap="round" />
      <path d="M -23 25 L -23 38 M 22 25 L 22 38" stroke={C.ink} strokeWidth="10" strokeLinecap="round" />
    </g>
  </g>;
};

const Latte: React.FC<{amount: number; leaf: number; t: number}> = ({amount, leaf, t}) => <g transform="scale(1 .42)" data-object-id="coffee-latte-art">
  <defs><clipPath id="coffee-liquid-rim"><ellipse rx="91" ry="83" /></clipPath></defs>
  <g clipPath="url(#coffee-liquid-rim)">
    <ellipse rx="91" ry="83" fill={C.roast} />
    <ellipse rx="83" ry="77" fill={C.accent} opacity={ramp(amount, 0, .55)} />
    <path d="M -71 -17 Q -47 -63 -7 -61 Q 58 -71 68 -22" fill="none" stroke={C.crema} strokeWidth="8" strokeLinecap="round" opacity={ramp(amount, .4, .85)} />
    <g opacity={amount} transform={`rotate(${mix(-80, 0, leaf)}) scale(${mix(.1, 1, amount)})`}>
      <path d="M -44 -19 C -45 -52 12 -68 44 -30 C 70 3 29 46 -9 39 C -45 38 -59 6 -27 -13 C -3 -29 24 -5 8 12 C -2 25 -24 15 -11 2" fill="none" stroke={C.foam} strokeWidth="12" strokeLinecap="round" opacity={1 - .75 * leaf} />
    </g>
    <g opacity={leaf}>
      {Array.from({length: 6}, (_, i) => {
        const u = ramp(leaf, i / 9, Math.min(1, .3 + i / 9));
        const y = 40 - i * 18, w = 49 - i * 6;
        return <g key={i} transform={`translate(0 ${y}) scale(${u})`}>
          <path d={`M 0 7 C ${-w} 5 ${-w - 8} -24 -20 -17 Q -5 -13 0 2 C ${w} 5 ${w + 8} -24 20 -17 Q 5 -13 0 2 Z`} fill={C.foam} />
        </g>;
      })}
      <path d="M 0 48 Q -4 13 0 -47" fill="none" stroke={C.foam} strokeWidth="8" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={100 * (1 - leaf)} />
      <path d="M 0 -47 Q -28 -76 -7 -73 Q 0 -79 8 -73 Q 28 -76 0 -47 Z" fill={C.foam} />
    </g>
    {amount > 0 && leaf < .8 ? <ellipse cx={21 * Math.sin(t * 5)} cy={-4 + 15 * Math.cos(t * 5)} rx="13" ry="9" fill={C.foam} opacity={(1 - leaf) * .7} /> : null}
  </g>
</g>;

export const CoffeeWake: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cupEnter = ramp(t, .1, .8), advance = ramp(t, 5.9, 6.75);
  const cupScale = mix(.9, 1.35, advance);
  const hop = -22 * pulse(t, 12.5, .6);
  const bounce = t >= 13.1 && t < 13.6 ? Math.cos((t - 13.1) * 22) * Math.exp(-(t - 13.1) * 10) : 0;
  const cupX = 360, cupY = mix(830, 786, advance) + 300 * (1 - cupEnter) + hop + 5 * bounce;
  const coffee = ramp(t, 2.8, 5.65), milk = ramp(t, 7.75, 9.8), leaf = ramp(t, 9.8, 11.5);
  const brewing = ramp(t, 2.8, 3.25) * (1 - ramp(t, 5.65, 5.85));
  const pour = ramp(t, 7.1, 7.55) * (1 - ramp(t, 11.9, 12.35));
  const steam = ramp(t, 13.35, 13.8);
  const title = t < 2.25 ? '咖啡醒醒' : t < 4 ? '扣上这一拍' : t < 6 ? '香气正在落杯' : t < 7.75 ? '把早晨拉近' : t < 10 ? '让奶香转个圈' : t < 12.5 ? '一片叶子浮起来' : '醒来好好开始';
  const subtitle = t < 2.25 ? '给早晨一点暖色' : t < 4 ? '手柄锁入萃取开始' : t < 6 ? '两股浓缩接进同一只杯' : t < 7.75 ? '主角来到眼前' : t < 10 ? '牛奶和浓缩相遇' : t < 12.5 ? '慢慢收出一片拉花' : '咖啡醒醒';
  const stageAt = t < 2.25 ? 0 : t < 4 ? 2.25 : t < 6 ? 4 : t < 7.75 ? 6 : t < 10 ? 7.75 : t < 12.5 ? 10 : 12.5;
  const titleLift = 9 * (1 - ramp(t, stageAt, stageAt + .24));
  const milkStream = ramp(t, 7.75, 8) * (1 - ramp(t, 11.5, 11.8));
  const pitcherX = 555 + (1 - pour) * 137, pitcherY = 568;

  return <AbsoluteFill style={{backgroundColor: t < 6 ? C.paper : C.surface, overflow: 'hidden'}}>
    <svg width="720" height="1280" viewBox="0 0 720 1280" style={{position: 'absolute', inset: 0}} aria-hidden="true">
      <defs><clipPath id="coffee-cup-side"><path d={cupSide} /></clipPath></defs>
      <path d="M 524 100 C 635 63 694 137 665 219 C 641 286 533 285 508 218 C 489 168 489 119 524 100" stroke={C.accent} strokeWidth="14" fill="none" opacity=".1" />
      <path d="M 551 111 C 622 87 676 149 650 217 C 635 256 576 270 530 227" stroke={C.accent} strokeWidth="5" fill="none" opacity=".08" />
      <path d="M 0 1095 Q 341 1050 720 1092 L 720 1280 L 0 1280 Z" fill={C.line} />
      <path d="M 53 1028 C 84 980 166 984 190 1025 C 209 1062 170 1093 108 1084 C 66 1076 42 1056 53 1028" fill="none" stroke={C.accent} strokeWidth="8" opacity=".13" />
      <Machine t={t} />
      <g data-object-id="coffee-porcelain-cup" transform={`translate(${cupX} ${cupY}) scale(${cupScale * (1 + .025 * bounce)} ${cupScale * (1 - .02 * bounce)})`}>
        <ellipse cx="8" cy="179" rx="145" ry="24" fill={C.primary} opacity=".15" />
        <ellipse cy="165" rx="149" ry="29" fill={C.foam} stroke={C.ink} strokeWidth="4" />
        <path d="M -119 170 Q 2 192 118 169" stroke={C.line} strokeWidth="4" fill="none" />
        <path d="M 89 19 C 189 -12 188 130 105 113 L 101 88 C 155 105 154 28 103 44 Z" fill={C.foam} stroke={C.ink} strokeWidth="5" />
        <path d={cupSide} fill={C.foam} stroke={C.ink} strokeWidth="5" />
        <g clipPath="url(#coffee-cup-side)">
          <rect x="-103" y={mix(157, 14, coffee)} width="206" height="180" fill={C.crema} opacity=".25" />
          <path d="M 70 17 Q 83 111 55 145 Q 20 163 -10 163 L 70 180 L 110 162 L 113 0 Z" fill={C.line} />
          <path d="M -72 27 Q -77 98 -56 123" stroke="#FFFFFF" strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M -19 112 Q 7 123 29 111" stroke={C.line} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
        <ellipse rx="103" ry="43" fill={C.foam} stroke={C.ink} strokeWidth="5" />
        <ellipse rx="91" ry="35" fill={coffee > 0 ? C.roast : C.line} />
        {coffee > 0 ? <g opacity={coffee}><Latte amount={milk} leaf={leaf} t={t} /></g> : null}
        {t >= 2.8 && t < 5.85 ? [-23, 23].map((x, i) => <ellipse key={i} cx={x / cupScale} cy="0" rx={9 + 4 * Math.sin(t * 18 + i)} ry="3" fill="none" stroke={C.crema} strokeWidth="2" opacity=".9" />) : null}
        <path d="M -85 -21 Q -36 -44 14 -36" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
      </g>
      {brewing > 0 ? <g data-object-id="coffee-extraction-streams" opacity={brewing}>
        {[-23, 22].map((dx, i) => <g key={i}>
          <path d={`M ${360 + dx} 653 Q ${360 + dx + Math.sin(t * 9 + i) * 2} 747 ${cupX + (i ? 23 : -23)} ${cupY}`} fill="none" stroke={C.accent} strokeWidth={5 + 2 * brewing} strokeLinecap="round" />
          <path d={`M ${360 + dx} 653 Q ${360 + dx + Math.sin(t * 9 + i) * 2} 747 ${cupX + (i ? 23 : -23)} ${cupY}`} fill="none" stroke={C.crema} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx={mix(360 + dx, cupX + (i ? 23 : -23), ((t - 2.8) * 2.6 + i / 2) % 1)} cy={mix(653, cupY, ((t - 2.8) * 2.6 + i / 2) % 1)} rx="5" ry="8" fill={C.accent} />
        </g>)}
      </g> : null}
      {milkStream > 0 ? <g data-object-id="coffee-milk-stream" opacity={milkStream}>
        <path d={`M 455 603 Q 421 671 ${360 + Math.sin(t * 5) * 22 * (1 - leaf)} ${cupY - 4}`} fill="none" stroke={C.ink} strokeWidth="13" strokeLinecap="round" />
        <path d={`M 455 603 Q 421 671 ${360 + Math.sin(t * 5) * 22 * (1 - leaf)} ${cupY - 4}`} fill="none" stroke={C.foam} strokeWidth="9" strokeLinecap="round" />
      </g> : null}
      <g data-object-id="coffee-milk-pitcher" transform={`translate(${pitcherX} ${pitcherY}) rotate(${-22 * ramp(t, 7.55, 7.75)})`} opacity={pour}>
        <path d="M 39 -26 C 110 -49 111 55 62 65 L 55 42 C 82 31 86 -10 43 -5 Z" fill={C.line} stroke={C.ink} strokeWidth="5" />
        <path d="M -64 -54 L 45 -43 L 56 71 Q -1 106 -56 73 L -62 -18 L -106 -5 L -64 -54 Z" fill={C.line} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />
        <path d="M -61 -42 Q -12 -57 34 -35 L 36 -14 Q -10 -32 -62 -15 L -85 -10 Z" fill={C.foam} />
        <path d="M -39 -5 L -33 61" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        <path d="M 28 -8 L 34 60" stroke={C.muted} strokeWidth="4" opacity=".35" strokeLinecap="round" />
      </g>
      <g data-object-id="coffee-steam" opacity={steam}>
        {[-1, 0, 1].map((i) => {
          const growth = ramp(t, 13.4 + (i + 1) * .12, 14.45);
          const x = 360 + i * 57;
          return <path key={i} d={`M ${x} 719 C ${x - 28} 684 ${x + 31} 663 ${x} 622 C ${x - 26} 592 ${x + 10} 584 ${x + 5} 563`} fill="none" stroke={C.muted} strokeWidth="6" strokeLinecap="round" opacity=".5" strokeDasharray="192" strokeDashoffset={192 * (1 - growth)} />;
        })}
      </g>
      {t >= 12.5 ? <g opacity={ramp(t, 12.5, 13)}>
        <path d="M 82 395 C 64 358 116 331 158 343 C 206 355 221 382 187 401 C 149 423 87 420 77 387" fill="none" stroke={C.accent} strokeWidth="5" strokeLinecap="round" strokeDasharray="300" strokeDashoffset={300 * (1 - ramp(t, 12.5, 13))} />
        <path d="M 202 419 Q 244 436 263 477 M 252 467 L 263 477 L 270 462" fill="none" stroke={C.accent} strokeWidth="4" strokeLinecap="round" />
        <text data-readable="true" x="138" y="383" textAnchor="middle" style={{...display, fontSize: 29}} fill={C.ink}>慢慢来</text>
      </g> : null}
    </svg>
    <div data-readable="true" style={{...body, position: 'absolute', left: 56, top: 64, padding: '9px 19px', fontSize: 23, lineHeight: 1.35, color: C.ink, backgroundColor: C.surface, border: `2px solid ${C.line}`, borderRadius: 999, whiteSpace: 'nowrap'}}>原创概念短片</div>
    <div style={{position: 'absolute', top: 165 + titleLift, left: 56}}>
      <div data-readable="true" style={{...display, fontSize: title.length > 6 ? 58 : title.length > 4 ? 66 : 76, lineHeight: 1.2, color: C.ink, whiteSpace: 'nowrap'}}>{title}</div>
      <div data-readable="true" style={{...body, fontSize: 28, lineHeight: 1.45, marginTop: 21, color: C.muted, whiteSpace: 'nowrap'}}>{subtitle}</div>
      <svg width="244" height="20" viewBox="0 0 244 20" style={{display: 'block', marginTop: 11}} aria-hidden="true"><path d="M 3 8 Q 96 1 237 11" stroke={C.accent} strokeWidth="6" strokeLinecap="round" fill="none" /></svg>
    </div>
    <div data-readable="true" style={{...body, position: 'absolute', left: 56, top: 1120, fontSize: 23, lineHeight: 1.35, color: C.ink, whiteSpace: 'nowrap', opacity: ramp(t, 1, 1.25)}}>HEIGE VIDEO 竖版案例</div>
  </AbsoluteFill>;
};

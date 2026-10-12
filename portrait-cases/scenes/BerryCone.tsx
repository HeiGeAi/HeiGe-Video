import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

// Original vector confectionery, persistent scoops and deterministic toy physics.
const C = {paper: '#FFF6FB', ink: '#2E1A47', pink: '#FF5CA8', mint: '#33D9B2', lemon: '#FFD836', white: '#FFFFFF', cream: '#FFF1BF', berry: '#F53E69', shade: '#C81C68', cone: '#E9AF60', waffle: '#B87735'};
const display = {fontFamily: 'CaseDisplay, PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const body = {fontFamily: 'CaseSans, PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {const q = clamp(x); return q * q * (3 - 2 * q);};
const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const pulse = (t: number, a: number, duration: number) => t >= a && t <= a + duration ? Math.sin((t - a) / duration * Math.PI) : 0;
const impact = (t: number, at: number) => t >= at && t < at + .65 ? Math.cos((t - at) * 22) * Math.exp(-(t - at) * 8) : 0;
const scoopPath = 'M -101 24 C -119 8 -115 -14 -98 -27 C -104 -59 -76 -85 -48 -90 C -19 -112 17 -108 40 -96 C 73 -97 98 -69 98 -40 C 123 -22 118 9 101 23 C 97 48 66 60 45 49 C 20 68 -12 63 -28 49 C -56 64 -88 54 -101 24 Z';

const Strawberry: React.FC<{x: number; y: number; scale: number; angle?: number}> = ({x, y, scale, angle = 0}) => <g data-object-id="berry-strawberry" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
  <path d="M -42 -25 C -63 -14 -61 20 -39 46 L 0 86 Q 11 91 22 76 L 51 39 C 72 4 52 -28 23 -32 Q 0 -45 -22 -31 Z" fill={C.shade} transform="translate(6 7)" />
  <path d="M -42 -25 C -63 -14 -61 20 -39 46 L 0 86 Q 11 91 22 76 L 51 39 C 72 4 52 -28 23 -32 Q 0 -45 -22 -31 Z" fill={C.berry} stroke={C.ink} strokeWidth="6" strokeLinejoin="round" />
  <path d="M -4 -30 Q -33 -70 -47 -39 L -38 -21 Q -5 -30 -4 -30 M -1 -30 Q -1 -73 20 -62 L 16 -31 Q 39 -61 52 -33 L 31 -14 L 6 -25 Q -13 -3 -34 -11 Z" fill={C.mint} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
  {[-24, 0, 25].flatMap((x, i) => [5, 29, 50].filter(y => y < 45 || i === 1).map((y, j) => <ellipse key={`${i}-${j}`} cx={x + (j % 2 ? 6 : 0)} cy={y} rx="3.5" ry="6" fill={C.lemon} transform={`rotate(-12 ${x} ${y})`} />))}
  <path d="M -36 -5 Q -42 14 -26 31" stroke={C.white} strokeWidth="7" fill="none" strokeLinecap="round" />
</g>;

const Scoop: React.FC<{id: string; x: number; y: number; fill: string; squash: number; scale?: number; choco?: number}> = ({id, x, y, fill, squash, scale = 1, choco = 0}) => <g data-object-id={id} transform={`translate(${x} ${y}) scale(${scale * (1 + .13 * squash)} ${scale * (1 - .11 * squash)})`}>
  <path d={scoopPath} fill={C.ink} transform="translate(6 8)" />
  <path d={scoopPath} fill={fill} stroke={C.ink} strokeWidth="6" />
  <path d="M -76 -34 Q -77 -64 -48 -71 M -36 -83 Q -21 -91 -6 -88" fill="none" stroke={C.white} strokeWidth="10" strokeLinecap="round" />
  <path d="M 70 -37 Q 91 -10 77 11 M -80 18 Q -71 30 -56 28 M 10 30 Q 27 39 43 29" fill="none" stroke={C.ink} strokeWidth="3" opacity=".18" strokeLinecap="round" />
  {choco > 0 ? <g>
    <defs><clipPath id="berry-chocolate-growth"><rect x="-130" y="-120" width="260" height={160 * choco} /></clipPath><clipPath id="berry-chocolate-scoop"><path d={scoopPath} /></clipPath></defs>
    <g clipPath="url(#berry-chocolate-scoop)"><g clipPath="url(#berry-chocolate-growth)">
      <path d="M -111 -16 Q -105 -78 -47 -95 Q -10 -122 48 -97 Q 98 -83 109 -15 L 95 21 Q 84 34 77 19 L 67 -2 Q 61 -6 60 15 L 54 51 Q 42 69 31 48 L 22 4 Q 15 -9 4 11 L -10 30 Q -23 41 -32 24 L -42 5 Q -54 -6 -58 17 L -62 46 Q -74 63 -83 43 L -91 15 Z" fill={C.ink} />
      <path d="M -68 -64 Q -20 -99 22 -80" fill="none" stroke="#79524F" strokeWidth="8" strokeLinecap="round" />
    </g></g>
  </g> : null}
</g>;

export const BerryCone: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const coneEnter = ramp(t, .1, .95);
  const bowlOn = ramp(t, 2.75, 3) * (1 - ramp(t, 5.35, 5.8));
  const blend = ramp(t, 3.6, 4.25);
  const v = ramp(t, 1.4, 2.1), b = ramp(t, 4.65, 5.15), m = ramp(t, 6.05, 6.85);
  const hop = -30 * pulse(t, 12.85, .6);
  const bodySquash = impact(t, .95) + .72 * impact(t, 13.45);
  const sy = 1 - .065 * bodySquash, sx = 1 + .075 * bodySquash;
  const coneY = 813 + mix(410, 0, coneEnter) + hop + 227 * (1 - sy);
  const choco = ramp(t, 8.25, 9.65);
  const bottleOn = ramp(t, 7.35, 7.8) * (1 - ramp(t, 9.75, 10.25));
  const title = t < 3 ? '莓好一口' : t < 5.5 ? '把草莓放进来' : t < 8 ? '一球接一球' : t < 10.3 ? '淋上小甜头' : t < 12.5 ? '快乐加点料' : '接住好心情';
  const subtitle = t < 3 ? '从一只香脆甜筒开始' : t < 5.5 ? '鲜红变成草莓粉' : t < 8 ? '香草草莓再加薄荷' : t < 10.3 ? '巧克力顺着弧线流下' : t < 12.5 ? '把彩糖撒进这一口' : '莓好一口';
  const backdrop = t < 5.5 ? C.paper : t < 8 ? '#E1FFF6' : t < 10.3 ? '#FFF3B8' : '#FFE4F0';
  const titleAt = t < 3 ? 0 : t < 5.5 ? 3 : t < 8 ? 5.5 : t < 10.3 ? 8 : t < 12.5 ? 10.3 : 12.5;
  const titleScale = 1 + .05 * pulse(t, titleAt, .4);
  const spoonTurn = t >= 3.5 && t < 4.65 ? 17 * Math.sin((t - 3.5) * 8) : 0;

  return <AbsoluteFill style={{backgroundColor: backdrop, overflow: 'hidden'}}>
    <svg width="720" height="1280" viewBox="0 0 720 1280" style={{position: 'absolute', inset: 0}} aria-hidden="true">
      <defs><clipPath id="berry-cone-waffle"><path d="M -105 0 Q 0 38 105 0 L 15 216 Q 0 245 -15 216 Z" /></clipPath></defs>
      <circle cx="654" cy="436" r="139" fill={C.lemon} />
      <path d="M 0 1120 Q 170 1072 347 1098 Q 560 1146 720 1080 L 720 1280 L 0 1280 Z" fill={t < 8 ? C.mint : C.lemon} />
      <circle cx="60" cy="902" r="96" fill={t < 8 ? '#FFCCE3' : C.mint} />
      <ellipse cx="365" cy="1052" rx="154" ry="22" fill={C.ink} opacity=".13" />
      <g data-object-id="berry-cone" transform={`translate(360 ${coneY}) rotate(${(1 - coneEnter) * 22}) scale(${sx} ${sy})`}>
        <path d="M -105 0 Q 0 38 105 0 L 15 216 Q 0 245 -15 216 Z" fill={C.ink} transform="translate(9 9)" />
        <path d="M -105 0 Q 0 38 105 0 L 15 216 Q 0 245 -15 216 Z" fill={C.cone} stroke={C.ink} strokeWidth="6" strokeLinejoin="round" />
        <g clipPath="url(#berry-cone-waffle)" stroke={C.waffle} strokeWidth="4">
          {Array.from({length: 10}, (_, i) => <g key={i}><path d={`M ${-240 + i * 40} 0 L ${-10 + i * 40} 245`} /><path d={`M ${-120 + i * 40} 0 L ${-350 + i * 40} 245`} /></g>)}
        </g>
        <path d="M -90 18 L -12 212" stroke="#FFE5AC" strokeWidth="7" fill="none" strokeLinecap="round" />
        <ellipse cy="0" rx="105" ry="25" fill={C.cream} stroke={C.ink} strokeWidth="6" />
        <ellipse cy="0" rx="87" ry="14" fill={C.waffle} />
      </g>
      {t >= 1.4 ? <Scoop id="berry-vanilla-scoop" x={mix(169, 360, v)} y={mix(452, 760, v) + hop + -18 * pulse(t, 2.1, .65)} fill={C.cream} squash={impact(t, 2.1) + .35 * impact(t, 5.15) + .4 * impact(t, 6.85) + .3 * bodySquash} /> : null}
      {t >= 4.65 ? <Scoop id="berry-strawberry-scoop" x={mix(540, 360, b)} y={mix(459, 632, b) + hop - 16 * pulse(t, 5.15, .65)} scale={mix(.58, 1, b)} fill={C.pink} squash={impact(t, 5.15) + .45 * impact(t, 6.85) + .4 * bodySquash} /> : null}
      {t >= 6.05 ? <Scoop id="berry-mint-scoop" x={mix(162, 360, m)} y={mix(440, 506, m) + hop - 14 * pulse(t, 6.85, .6)} scale={mix(.75, 1, m)} fill={C.mint} squash={impact(t, 6.85) + .5 * bodySquash} choco={choco} /> : null}
      <g opacity={bowlOn} transform={`translate(${540 + (1 - bowlOn) * 150} 491)`} data-object-id="berry-mixing-bowl">
        <ellipse rx="96" ry="25" cy="10" fill={C.ink} />
        <path d="M -94 0 Q -80 80 0 81 Q 80 79 94 0 Z" fill={C.white} stroke={C.ink} strokeWidth="6" />
        <ellipse rx="93" ry="26" fill={C.white} stroke={C.ink} strokeWidth="6" />
        <ellipse rx="75" ry="17" fill={blend > .25 ? C.pink : C.cream} />
        <path d="M -48 6 Q -5 -11 40 5 Q 10 19 -24 10" stroke={C.berry} strokeWidth={3 + blend * 5} fill="none" opacity={blend} strokeLinecap="round" />
        <g transform={`rotate(${spoonTurn} 0 -5)`}>
          <path d="M 2 6 Q 13 -26 52 -107" stroke={C.ink} strokeWidth="19" strokeLinecap="round" />
          <path d="M 2 6 Q 13 -26 52 -107" stroke={C.lemon} strokeWidth="11" strokeLinecap="round" />
        </g>
        <path d="M -66 25 Q -53 50 -26 57" stroke="#F1D9E8" strokeWidth="7" fill="none" strokeLinecap="round" />
      </g>
      {[3.2, 3.55].map((at, i) => {
        const u = ramp(t, at - .48, at), gone = ramp(t, at, at + .16);
        return <g key={at} opacity={t >= at - .48 && t < at + .16 ? 1 - gone : 0}><Strawberry x={mix(i ? 610 : 464, 540, u)} y={mix(400, 475, u)} scale={.5 * (1 - gone)} angle={mix(i ? 29 : -23, 0, u)} /></g>;
      })}
      <g opacity={bottleOn} transform={`translate(${555 + 115 * (1 - bottleOn)} 395) rotate(${-63 * ramp(t, 7.9, 8.25)})`} data-object-id="berry-chocolate-bottle">
        <path d="M -35 -9 L -27 -80 Q 0 -96 27 -80 L 35 -9 Q 43 38 23 49 L -23 49 Q -42 39 -35 -9 Z" fill={C.ink} stroke={C.ink} strokeWidth="5" />
        <path d="M -11 -103 L 11 -103 L 15 -78 L -15 -78 Z" fill={C.lemon} stroke={C.ink} strokeWidth="4" />
        <ellipse cy="-103" rx="11" ry="5" fill={C.ink} />
        <g opacity={1 - ramp(t, 7.75, 8.05)} transform={`translate(${55 * ramp(t, 7.75, 8.05)} ${-48 * ramp(t, 7.75, 8.05)})`}>
          <rect x="-23" y="-112" width="46" height="25" rx="8" fill={C.lemon} stroke={C.ink} strokeWidth="5" />
        </g>
        <rect x="-31" y="-10" width="62" height="42" rx="10" fill={C.pink} />
        <path d="M -10 -1 Q -23 9 -5 22 Q 12 26 16 7 Q 2 13 -10 -1 Z" fill={C.ink} />
        <path d="M -17 -66 L -20 -35" stroke="#79524F" strokeWidth="7" strokeLinecap="round" />
      </g>
      {t >= 8.25 && t < 9.65 ? <g data-object-id="berry-chocolate-stream">
        <path d="M 463 348 Q 486 419 359 413" stroke={C.ink} strokeWidth="13" fill="none" strokeLinecap="round" />
        <path d="M 464 354 Q 480 416 386 412" stroke="#79524F" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g> : null}
      {Array.from({length: 22}, (_, i) => {
        const at = 10.35 + (i % 6) * .07, u = clamp((t - at) / .5);
        const x = 287 + (i * 43 % 147), targetY = 443 + i % 4 * 17;
        return <g key={i} opacity={t >= at ? 1 : 0} transform={`translate(${x} ${mix(345 - i % 3 * 15, targetY, u) + hop}) rotate(${i * 29})`}>
          <rect x="-3" y="-7" width="6" height="14" rx="3" fill={[C.lemon, C.pink, C.white][i % 3]} />
        </g>;
      })}
      {t >= 11.7 ? <Strawberry x={mix(531, 366, ramp(t, 11.7, 12.25))} y={mix(402, 413, ramp(t, 11.7, 12.25)) + hop - 11 * pulse(t, 12.25, .5)} scale={.51} angle={mix(27, -8, ramp(t, 11.7, 12.25))} /> : null}
      {t >= 12.5 ? <g opacity={ramp(t, 12.5, 12.75)} transform="translate(562 754) rotate(13)">
        <path d="M 0 -53 L 16 -26 L 48 -33 L 41 -4 L 63 15 L 34 29 L 29 57 L 0 42 L -27 57 L -32 28 L -59 11 L -38 -9 L -44 -38 L -14 -27 Z" fill={C.lemon} stroke={C.ink} strokeWidth="5" />
        <path d="M -21 2 L -5 16 L 25 -18" stroke={C.ink} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g> : null}
      <path d="M 106 597 Q 121 568 134 599 M 92 623 L 132 621" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" opacity={ramp(t, 6.85, 7.1)} />
    </svg>
    <div data-readable="true" style={{...body, position: 'absolute', top: 64, left: 56, fontSize: 23, lineHeight: 1.35, padding: '9px 19px', border: `3px solid ${C.ink}`, borderRadius: 999, backgroundColor: C.white, boxShadow: `0 5px 0 ${C.ink}`, whiteSpace: 'nowrap'}}>原创概念短片</div>
    <div style={{position: 'absolute', left: 56, top: 165, transform: `scale(${titleScale})`, transformOrigin: 'left top'}}>
      <div data-readable="true" style={{...display, fontSize: title.length > 5 ? 61 : 76, lineHeight: 1.2, color: C.ink, whiteSpace: 'nowrap'}}>{title}</div>
      <div data-readable="true" style={{...body, fontSize: 29, lineHeight: 1.45, marginTop: 21, color: C.ink, whiteSpace: 'nowrap'}}>{subtitle}</div>
    </div>
    <div data-readable="true" style={{...body, position: 'absolute', left: 56, top: 1120, fontSize: 23, lineHeight: 1.35, color: C.ink, whiteSpace: 'nowrap', opacity: ramp(t, 1, 1.25)}}>HEIGE VIDEO 竖版案例</div>
  </AbsoluteFill>;
};

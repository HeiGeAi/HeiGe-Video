import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

const C = {
  paper: '#ece1cb', plaster: '#f4ebd8', ink: '#2a2018', muted: '#5f5540',
  blue: '#2e6b8f', green: '#4a8b6f', red: '#c8483a', gold: '#b08d3e', line: '#d6c8a8',
};
const DISPLAY = '"SerifDisplay", "Ma Shan Zheng", "KaiTi", "STKaiti", "Noto Serif SC", "Songti SC", serif';
const SANS = '"VideoSans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const progress = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const smooth = (x: number) => {const p = clamp(x); return p * p * (3 - 2 * p);};
const enter = (t: number, a: number, b: number) => ease(progress(t, a, b));
const windowOpacity = (t: number, a: number, b: number) => smooth(progress(t, a, a + .25)) * (1 - smooth(progress(t, b - .25, b)));
const petal = 'M 0 19 C -48 -10 -79 -103 -7 -197 C -3 -204 0 -213 0 -220 C 9 -196 63 -153 61 -91 C 59 -39 26 6 0 19 Z';
const leaf = 'M 0 0 C 36 -61 97 -85 159 -79 C 134 -14 68 19 0 0 Z';
const smallLeaf = 'M 0 0 C -25 -30 -33 -64 0 -92 C 33 -64 25 -30 0 0 Z';
const mineralOrder = [C.blue, C.blue, C.green, C.green, C.blue, C.blue, C.red, C.red, C.red, C.gold, C.gold, C.red];
const lotusAngles = [-72, 72, -54, 54, -36, 36, -18, 18, 0, -27, 27, 0];
const petalSizes = [1.08, 1.08, .99, .99, .94, .94, .85, .85, .88, .67, .67, .65];
const leafCues = [.75, 1.5, 3, 4];

const BrushLine: React.FC<{text: string; x: number; y: number; width: number; size: number; opacity: number; rise?: number}> = ({text, x, y, width, size, opacity, rise = 0}) => (
  <div data-readable="true" style={{position: 'absolute', left: x, top: y, width, opacity, transform: `translateY(${rise}px)`,
    fontFamily: DISPLAY, fontWeight: 400, fontSynthesis: 'none', fontSize: size, lineHeight: 1.34,
    letterSpacing: 2, color: C.ink, whiteSpace: 'nowrap'}}>{text}</div>
);

/** Original mineral-pigment botanical animation. All motion comes from the frame clock. */
export const MineralBloom: React.FC<{portrait: boolean}> = ({portrait}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const width = portrait ? 720 : 1280;
  const height = portrait ? 1280 : 720;
  const id = portrait ? 'mineral-p' : 'mineral-h';
  // The first shoot supplies real displacement in the opening two seconds.
  // The later extension still reaches the same final flower anchor at 5.5s.
  const growth = .64 * enter(t, .5, 2) + .36 * smooth(progress(t, 2, 5.5));
  const gather = smooth(progress(t, 10.5, 12));
  const settle = enter(t, 13.5, 14.5);
  const rootX = portrait ? 344 : 858;
  const groundY = portrait ? 940 : 564;
  const bloomY = portrait ? 735 : 368;
  const cx = mix(rootX, portrait ? 390 : 875, gather);
  const cy = mix(mix(groundY, bloomY, growth), portrait ? 714 : 363, gather);
  const flowerScale = portrait ? 1.02 : 1;
  const motifRadius = portrait ? 272 : 279;
  const plantOpacity = 1 - enter(t, 10.5, 11.5);
  const seedOpacity = 1 - .35 * enter(t, 2, 3);
  const seedDrop = enter(t, 0, .5);
  const seedImpact = Math.sin(progress(t, .5, 1) * Math.PI);
  const ribbonDraw = enter(t, 0, 1.5);
  const ribbonMorph = smooth(progress(t, 9.5, 12));
  const ribbon = portrait
    ? `M 88 395 C 58 598 127 1070 319 1035 C 510 1005 597 ${mix(730, 540, ribbonMorph)} 622 ${mix(549, 408, ribbonMorph)} C 643 283 564 205 514 200`
    : `M 58 595 C 229 663 524 652 713 572 C 1010 446 1190 ${mix(425, 224, ribbonMorph)} 1173 173 C 1156 119 1092 103 1055 113`;
  const titleX = portrait ? 68 : 70;
  const titleY = portrait ? 143 : 193;
  const titleWidth = portrait ? 590 : 548;
  const titleSize = portrait ? 86 : 94;
  const textStages = [
    {text: '一粒种子', a: -.25, b: 2.75},
    {text: '把春天唤醒', a: 3, b: 5.75},
    {text: '花开有声', a: 6, b: 10.25},
    {text: '一花生万象', a: 10.5, b: 14.25},
  ];
  const finalText = enter(t, 14.5, 14.75);
  const petalGather = smooth(progress(t, 10.5, 12));

  return <AbsoluteFill style={{backgroundColor: C.paper, fontFamily: SANS, fontWeight: 400, fontSynthesis: 'none'}}>
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{position: 'absolute', inset: 0}}>
      <defs>
        <pattern id={`${id}-paper`} width="47" height="43" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="9" r=".75" fill={C.muted} opacity=".1"/>
          <circle cx="27" cy="31" r=".55" fill={C.gold} opacity=".2"/>
          <path d="M 17 15 l 2 -.7 M 36 7 l 1.4 1 M 8 37 l 1.7 -.6" stroke={C.ink} strokeWidth=".7" opacity=".06"/>
        </pattern>
        <pattern id={`${id}-pigment`} width="19" height="23" patternUnits="userSpaceOnUse">
          <path d="M 1 5 l 1.5 -.5 M 13 17 l 2 .5" stroke={C.plaster} strokeWidth="1" opacity=".2"/>
          <circle cx="8" cy="11" r=".65" fill={C.ink} opacity=".11"/>
        </pattern>
      </defs>

      {/* Quiet, matte plaster strata. The paper never becomes a dark transition. */}
      <path d={portrait ? 'M 0 0 H 720 V 276 C 491 258 253 345 0 304 Z' : 'M 0 0 H 1280 V 104 C 939 122 706 60 422 100 C 244 125 112 122 0 113 Z'} fill={C.plaster}/>
      <path d={portrait ? 'M 0 1155 C 232 1093 489 1133 720 1077 V 1280 H 0 Z' : 'M 0 680 C 312 635 480 668 757 637 C 967 614 1128 648 1280 635 V 720 H 0 Z'} fill={C.plaster}/>
      <rect width={width} height={height} fill={`url(#${id}-paper)`}/>

      {/* A single continuous apsara-inspired leadline, drawn once and then carried. */}
      <path d={ribbon} pathLength="1" stroke={C.green} strokeWidth={portrait ? 3.3 : 3.5} fill="none" strokeLinecap="round"
        strokeDasharray="1" strokeDashoffset={1 - ribbonDraw} opacity=".76"/>
      <path d={ribbon} pathLength="1" stroke={C.gold} strokeWidth="1.1" fill="none" strokeLinecap="round"
        strokeDasharray="1" strokeDashoffset={1 - ribbonDraw} opacity=".75" transform="translate(0 5)"/>

      {/* Soil, seed, and a growing plant use the same spatial anchor. */}
      <g opacity={plantOpacity}>
        <path d={`M ${rootX - 130} ${groundY + 17} Q ${rootX - 12} ${groundY + 31} ${rootX + 108} ${groundY + 11}`}
          stroke={C.gold} strokeWidth="2" fill="none" opacity=".65"/>
        <path d={`M ${rootX} ${groundY} C ${rootX - 17 * growth} ${groundY - 73 * growth} ${cx + 16 * growth} ${cy + 61 * growth} ${cx} ${cy}`}
          stroke={C.green} strokeWidth={mix(3, 7, growth)} strokeLinecap="round" fill="none" opacity={enter(t, .5, .75)}/>
        <g transform={`translate(${rootX} ${groundY - 7 - 24 * (1 - seedDrop) + 4 * seedImpact}) scale(${1 + .08 * seedImpact} ${1 - .12 * seedImpact})`} opacity={seedOpacity}>
          <path d="M -11 9 C -25 -2 -19 -23 3 -25 C 27 -10 23 9 7 18 C -1 22 -7 19 -11 9 Z" fill={C.red}/>
          <path d="M -10 9 Q -4 -7 9 -15" stroke={C.gold} strokeWidth="2" fill="none"/>
          <path d="M -8 -13 Q -1 -5 -3 9" stroke={C.plaster} strokeWidth="1.5" fill="none" opacity=".7"/>
        </g>
        {[0, 1, 2, 3].map(i => {
          const p = enter(t, leafCues[i], leafCues[i] + .65);
          const side = i % 2 === 0 ? -1 : 1;
          const y = groundY - (i + 1) * (portrait ? 46 : 30) * growth;
          return <g key={i} transform={`translate(${mix(rootX, cx, (i + 1) / 5)} ${y}) scale(${side * p * (.72 + i * .06)} ${p * (.72 + i * .06)}) rotate(${-9 + i * 7})`}>
            <path d={leaf} fill={i % 2 === 0 ? C.green : C.blue}/>
            <path d="M 9 -3 Q 74 -34 149 -73 M 56 -23 l -7 -23 M 87 -39 l 20 7" stroke={C.plaster} strokeWidth="1.6" opacity=".6" fill="none"/>
            <path d={leaf} fill={`url(#${id}-pigment)`}/>
          </g>;
        })}
      </g>

      {/* The square strata arrive from the flower rather than appearing as separate cards. */}
      <g transform={`translate(${cx} ${cy})`}>
        {[0, 1, 2].map(i => {
          const p = enter(t, 11.5 + i * .5, 12.1 + i * .5);
          const r = motifRadius - i * 25;
          const s = r * Math.SQRT2;
          return <g key={i} opacity={p} transform={`rotate(${mix(33 + i * 5, 45 + (i === 1 ? 0 : -2), p)}) scale(${mix(.73, 1, p)})`}>
            <rect x={-s / 2} y={-s / 2} width={s} height={s} fill="none" stroke={[C.blue, C.green, C.gold][i]}
              strokeWidth={[14, 9, 3][i]} strokeLinejoin="miter"/>
            {i < 2 ? <rect x={-s / 2 + 12} y={-s / 2 + 12} width={s - 24} height={s - 24} fill="none" stroke={C.plaster} strokeWidth="2" opacity=".8"/> : null}
          </g>;
        })}

        {/* Eight mineral leaves collect into the lattice on successive quarter-note cues. */}
        {Array.from({length: 8}, (_, i) => {
          const p = enter(t, 11 + i * .25, 11.5 + i * .25);
          const angle = i * 45 + 22.5;
          const distance = mix(150, motifRadius - 15, p);
          return <g key={i} transform={`rotate(${angle}) translate(0 ${-distance}) scale(${p * .44}) rotate(180)`} opacity={p * .87}>
            <path d={smallLeaf} fill={i % 2 === 0 ? C.blue : C.green}/>
            <path d="M 0 -8 V -80 M 0 -33 l -15 -12 M 0 -49 l 13 -13" stroke={C.plaster} strokeWidth="2.1" fill="none" opacity=".78"/>
          </g>;
        })}
        <g opacity={enter(t, 12.5, 13.25)} stroke={C.gold} strokeWidth="1.8" fill="none">
          {Array.from({length: 4}, (_, i) => <g key={i} transform={`rotate(${i * 90 + 45})`}>
            <path d={`M -92 ${-motifRadius + 61} h 184 M -56 ${-motifRadius + 44} h 112 M -31 ${-motifRadius + 27} h 62`}/>
          </g>)}
        </g>
      </g>

      {/* Twelve individually growing petals open as a lotus, then turn into a rosette. */}
      <g transform={`translate(${cx} ${cy}) scale(${flowerScale})`}>
        {mineralOrder.map((color, i) => {
          const p = enter(t, 5.75 + i * .25, 6.5 + i * .25);
          const turn = mix(lotusAngles[i], i * 30 + 15, petalGather);
          const size = petalSizes[i] * mix(1, .73, petalGather);
          const unfurl = mix(.09, size, p);
          const impact = Math.sin(progress(t, 6 + i * .25, 6.5 + i * .25) * Math.PI) * .045;
          return <g key={i} opacity={p} transform={`rotate(${turn}) scale(${unfurl + impact} ${unfurl})`}>
            <path d={petal} fill={color}/>
            <path d={petal} fill={`url(#${id}-pigment)`}/>
            <path d="M 0 9 C -12 -57 -11 -129 0 -199" stroke={C.plaster} strokeWidth="1.75" opacity=".58" fill="none"/>
            <path d="M -27 -39 Q -24 -83 -9 -105 M 28 -54 Q 23 -106 6 -136" stroke={C.ink} strokeWidth=".8" opacity=".13" fill="none"/>
          </g>;
        })}
        <g opacity={enter(t, 5.25, 6)} transform={`scale(${mix(.12, 1, enter(t, 5.25, 6))})`}>
          <path d="M -33 13 C -40 -9 -29 -36 0 -43 C 28 -33 41 -9 33 13 C 13 27 -14 27 -33 13 Z" fill={C.red}/>
          <path d="M -22 7 Q 0 -6 23 7 M -15 -4 Q 0 -16 16 -4 M -9 -16 Q 0 -27 10 -16" stroke={C.gold} strokeWidth="2.5" fill="none"/>
          <path d="M -29 16 Q 0 33 29 16" stroke={C.blue} strokeWidth="4" fill="none" strokeLinecap="round"/>
        </g>
        <g opacity={settle}>
          {[0, 1, 2, 3].map(i => <path key={i} d="M -8 -189 l 8 -10 l 8 10 l -8 10 Z" fill={C.red} transform={`rotate(${i * 90 + 45})`}/>)}
        </g>
      </g>

      {/* A small mineral maker's seal is imagery, not unverified historical lettering. */}
      <g transform={`translate(${portrait ? 606 : 1140} ${portrait ? 118 : 62}) rotate(-4)`}>
        <rect width="44" height="44" rx="2" fill={C.red}/>
        <path d="M 12 22 C 13 8 21 8 22 20 C 23 8 31 8 32 22 C 30 32 24 33 22 29 C 20 34 14 32 12 22 Z" fill="none" stroke={C.plaster} strokeWidth="2"/>
      </g>
    </svg>

    <div data-readable="true" style={{position: 'absolute', left: titleX + 2, top: portrait ? 83 : 81, fontFamily: SANS,
      fontWeight: 400, fontSynthesis: 'none', fontSize: portrait ? 24 : 22, letterSpacing: 3, color: C.muted}}>原创矿彩动画</div>

    {textStages.map(stage => {
      const alpha = windowOpacity(t, stage.a, stage.b);
      return <BrushLine key={stage.text} text={stage.text} x={titleX} y={titleY} width={titleWidth} size={stage.text.length > 4 ? titleSize - 6 : titleSize}
        opacity={alpha} rise={mix(17, 0, enter(t, stage.a, stage.a + .5))}/>;
    })}
    <BrushLine text="花开有声" x={titleX} y={titleY} width={titleWidth} size={titleSize} opacity={finalText}
      rise={mix(15, 0, enter(t, 14.5, 15))}/>

    <div data-readable="true" style={{position: 'absolute', left: titleX + 5, top: titleY + (portrait ? 128 : 145), width: titleWidth - 8,
      fontFamily: SANS, fontWeight: 400, fontSynthesis: 'none', fontSize: portrait ? 26 : 27, color: C.muted, lineHeight: 1.65,
      opacity: windowOpacity(t, -.25, 2.75)}}>一点生机，慢慢醒来。</div>
    <div data-readable="true" style={{position: 'absolute', left: titleX + 5, top: titleY + (portrait ? 128 : 145), width: titleWidth - 8,
      fontFamily: SANS, fontWeight: 400, fontSynthesis: 'none', fontSize: portrait ? 26 : 27, color: C.muted, lineHeight: 1.65,
      opacity: windowOpacity(t, 10.5, 14.25)}}>生长，汇成自己的纹样。</div>

    <div data-readable="true" style={{position: 'absolute', left: titleX + 5, top: portrait ? 1096 : 544,
      fontFamily: SANS, fontWeight: 400, fontSynthesis: 'none', fontSize: portrait ? 28 : 29, letterSpacing: 1.5,
      color: C.ink, opacity: finalText}}>HeiGe Video · 让想法生长</div>
    <div style={{position: 'absolute', left: titleX + 5, top: portrait ? 1167 : 600, width: portrait ? 488 : 409, height: 2,
      backgroundColor: C.blue, transformOrigin: 'left', transform: `scaleX(${finalText})`}}/>
  </AbsoluteFill>;
};

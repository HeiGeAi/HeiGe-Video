import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Original concept illustration and choreography. No external media or audio.
const C = {cotton: '#FFF6FB', ink: '#2E1A47', pink: '#FF5CA8', mint: '#33D9B2', lemon: '#FFD836', white: '#FFFFFF', shade: '#C81C68'};
const display = {fontFamily: 'CandyDisplay, PingFang SC, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const body = {fontFamily: 'VideoSans, PingFang SC, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const ease = (x: number) => {const q = clamp(x); return q * q * (3 - 2 * q);};
const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const window = (t: number, a: number, b: number) => ramp(t, a, a + .16) * (1 - ramp(t, b - .16, b));

const lemonSegments = Array.from({length: 4}, (_, index) => {
  const a = Math.PI + index * Math.PI / 4 + .05;
  const b = Math.PI + (index + 1) * Math.PI / 4 - .05;
  return `M 0 -5 L ${Math.cos(a) * 89} ${Math.sin(a) * 89} A 89 89 0 0 1 ${Math.cos(b) * 89} ${Math.sin(b) * 89} Z`;
});
const canBody = 'M -113 -183 Q -118 -166 -118 -142 L -118 157 Q -118 189 -93 201 Q 0 221 93 201 Q 118 189 118 157 L 118 -142 Q 118 -166 113 -183 Z';

const Lemon: React.FC<{x: number; y: number; scale: number; squeeze: number; hands: number; rotation: number}> = ({x, y, scale, squeeze, hands, rotation}) => (
  <g data-object-id="citrus-lemon" transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
    <g transform={`scale(${1 + squeeze * .2} ${1 - squeeze * .34})`}>
      <path d="M -109 7 A 109 109 0 0 1 109 7 Z" fill={C.ink} transform="translate(8 9)" />
      <path d="M -109 7 A 109 109 0 0 1 109 7 Z" fill={C.lemon} stroke={C.ink} strokeWidth="6" strokeLinejoin="round" />
      <path d="M -97 0 A 97 97 0 0 1 97 0 Z" fill={C.white} />
      {lemonSegments.map((d, i) => <path key={i} d={d} fill={C.lemon} />)}
      <path d="M -104 -13 Q -161 -53 -164 -3 Q -132 17 -104 -13" fill={C.mint} stroke={C.ink} strokeWidth="5" />
      <path d="M -145 -5 L -112 -12" fill="none" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
    </g>
    {[-1, 1].map(side => <g key={side} opacity={hands} transform={`translate(${side * (166 - 39 * squeeze)} -30) scale(${side} 1)`}>
      <rect x="-20" y="-56" width="47" height="87" rx="22" fill={C.mint} stroke={C.ink} strokeWidth="6" />
      <rect x="-39" y="-18" width="52" height="37" rx="18" fill={C.mint} stroke={C.ink} strokeWidth="6" />
      <rect x="19" y="-47" width="67" height="68" rx="24" fill={C.pink} stroke={C.ink} strokeWidth="6" />
    </g>)}
  </g>
);

const Can: React.FC<{x: number; y: number; scaleX: number; scaleY: number; angle: number; fill: number; tab: number; label: number; labelScale: number}> = ({x, y, scaleX, scaleY, angle, fill, tab, label, labelScale}) => (
  <g data-object-id="citrus-can" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scaleX} ${scaleY})`}>
    <defs><clipPath id="citrus-can-front"><path d={canBody} /></clipPath></defs>
    <path d={canBody} fill={C.shade} transform="translate(13 14)" />
    <path d={canBody} fill={C.pink} stroke={C.ink} strokeWidth="7" />
    <g clipPath="url(#citrus-can-front)">
      <rect x="-120" y={mix(223, 34, fill)} width="240" height="200" fill={C.lemon} />
      <path d="M -140 60 L 140 -5 L 140 58 L -140 123 Z" fill={C.mint} />
      <path d="M -91 -150 L -91 146" stroke={C.white} strokeWidth="10" strokeLinecap="round" />
      <path d="M 97 -141 L 97 146" stroke={C.shade} strokeWidth="7" strokeLinecap="round" />
      <circle cx="66" cy="125" r="37" fill={C.white} stroke={C.ink} strokeWidth="5" />
      <path d="M 38 126 A 28 28 0 0 1 94 126 Z" fill={C.lemon} stroke={C.ink} strokeWidth="3" />
      <path d="M 65 104 L 65 126 M 49 111 L 65 126 M 83 111 L 65 126" stroke={C.white} strokeWidth="4" />
    </g>
    <ellipse cx="0" cy="-183" rx="113" ry="22" fill={C.white} stroke={C.ink} strokeWidth="6" />
    <ellipse cx="13" cy="-181" rx="34" ry="12" fill={C.ink} />
    <g transform={`translate(-14 -185) rotate(${-64 * tab})`}>
      <rect x="-21" y="-13" width="42" height="26" rx="13" fill={C.mint} stroke={C.ink} strokeWidth="5" />
      <rect x="-9" y="-6" width="19" height="12" rx="6" fill={C.white} />
    </g>
    <path d="M -87 185 Q 0 205 87 185" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
    <text data-readable="true" opacity={label} x="0" y="-114" textAnchor="middle" fill={C.ink} style={{...body, fontSize: 26, letterSpacing: 2}}>BOING</text>
    <g transform={`scale(${labelScale})`}>
      <text data-readable="true" opacity={label} x="0" y="-40" textAnchor="middle" fill={C.ink} style={{...display, fontSize: 56}}>柠檬</text>
      <text data-readable="true" opacity={label} x="0" y="30" textAnchor="middle" fill={C.ink} style={{...display, fontSize: 56}}>汽水</text>
    </g>
    <text data-readable="true" opacity={label} x="-36" y="151" textAnchor="middle" fill={C.ink} style={{...body, fontSize: 17, letterSpacing: .6}}>LEMON POP</text>
  </g>
);

export const Citrus: React.FC<{portrait: boolean}> = ({portrait}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const baseX = portrait ? 360 : 910, baseY = portrait ? 856 : 428;
  const floor = portrait ? 1072 : 650;
  const landing = ramp(t, .25, 1);
  const impact = t >= 1 && t < 1.7 ? Math.exp(-(t - 1) * 7) * Math.cos((t - 1) * 20) : 0;
  const firstBounce = t >= 1 && t < 1.7 ? -48 * Math.exp(-(t - 1) * 5) * Math.abs(Math.sin((t - 1) * 11)) : 0;
  const flight = t >= 6 && t <= 7.5 ? -152 * Math.sin(Math.PI * (t - 6) / 1.5) : 0;
  const secondImpact = t >= 7.5 && t < 8.2 ? Math.exp(-(t - 7.5) * 7) * Math.cos((t - 7.5) * 20) : 0;
  const groove = t >= 8 && t < 12 ? -16 * Math.pow(Math.sin((t - 8) * Math.PI * 2), 2) : 0;
  // One last pressure release, one hop and one label stamp close the action.
  const sealPrepare = t >= 12.25 && t < 13 ? Math.pow(Math.sin(Math.PI * (t - 12.25) / .75), 2) : 0;
  const sealHop = t >= 13 && t <= 14 ? -64 * Math.sin(Math.PI * (t - 13)) : 0;
  const sealImpact = t >= 14 && t < 14.5 ? (1 - ramp(t, 14, 14.5)) * Math.cos((t - 14) * 18) : 0;
  const stamp = t >= 14 && t < 14.5 ? .08 * Math.sin(Math.PI * (t - 14) / .5) * Math.exp(-(t - 14) * 2.4) : 0;
  const lastFoam = ramp(t, 12.75, 13) * (1 - ramp(t, 13.55, 14.25));
  const endMove = ramp(t, 12, 14);
  const canX = mix(baseX, portrait ? 360 : 919, endMove);
  const canScaleX = 1 + .17 * (impact + secondImpact) + .1 * sealPrepare + .12 * sealImpact;
  const canScaleY = 1 - .13 * (impact + secondImpact) - .07 * sealPrepare - .09 * sealImpact;
  // Squash around the real bottom of the can, so impact cannot lift its foot.
  const canY = mix(-360, baseY, landing) + firstBounce + flight + groove + sealHop + 211 * (1 - canScaleY);
  const angle = (1 - landing) * -24 + (t >= 6 && t <= 7.5 ? Math.sin((t - 6) / 1.5 * Math.PI * 2) * 13 : 0);
  const fill = ramp(t, 3.25, 4.25), tab = ramp(t, 4.5, 4.85);
  const lemonEnter = spring({frame: Math.max(0, frame - 2 * fps), fps, config: {damping: 14, stiffness: 220, mass: .6}, durationInFrames: 18});
  const lemonExit = ramp(t, 4.5, 5.35);
  const squeeze = ramp(t, 3, 3.25) * (1 - ramp(t, 3.8, 4.15));
  const lemonX = mix(baseX + (1 - lemonEnter) * 320, baseX - (portrait ? 156 : 220), lemonExit);
  const lemonY = mix(baseY - 302, baseY + 142, lemonExit);
  const lemonScale = mix(.95, .7, lemonExit);
  const backdrop = t < 5 ? C.cotton : t < 8 ? C.pink : t < 12 ? C.mint : C.lemon;
  const burst = window(t, 5, 6.2);
  const headline = t < 2.8 ? '柠檬汽水' : t < 4.8 ? '挤一下' : t < 7.8 ? '嘭！' : t < 12 ? '酸甜劲头' : '快乐开罐';
  const subtitle = t < 2.8 ? '今天，来点活力。' : t < 4.8 ? '接住这一滴。' : t < 7.8 ? '气泡，接住快乐。' : t < 12 ? '蹦到下一拍。' : '柠檬汽水';
  const titleStart = t < 2.8 ? 0 : t < 4.8 ? 2.8 : t < 7.8 ? 4.8 : t < 12 ? 7.8 : 12;
  const titlePop = t >= 15 ? 1 : spring({frame: Math.max(0, frame - titleStart * fps), fps, config: {damping: 15, stiffness: 230, mass: .6}, durationInFrames: 16});
  const titleX = portrait ? 56 : 80, titleY = portrait ? 162 : 172;
  const titleSize = headline === '嘭！' ? (portrait ? 98 : 116) : (portrait ? 68 : 76);
  const copyWidth = portrait ? 608 : 580;

  return <AbsoluteFill style={{backgroundColor: backdrop, color: C.ink, overflow: 'hidden'}}>
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', inset: 0}} aria-hidden="true">
      {/* A color field follows the same product, rather than swapping scenes. */}
      <circle cx={portrait ? 634 : 1218} cy={portrait ? 373 : 71} r={portrait ? 144 : 183} fill={t < 5 ? C.lemon : C.cotton} />
      <circle cx={portrait ? 90 : 674} cy={portrait ? 957 : 616} r={portrait ? 117 : 105} fill={t < 8 ? C.mint : C.pink} />
      <path d={portrait ? 'M 0 1072 Q 360 1030 720 1072 L 720 1280 L 0 1280 Z' : 'M 0 650 Q 700 601 1280 650 L 1280 720 L 0 720 Z'} fill={t < 8 ? C.mint : t < 12 ? C.lemon : C.pink} />
      <ellipse cx={baseX + 13} cy={floor + 6} rx="139" ry="18" fill={C.ink} />
      <path d={`M ${baseX - 229} ${floor - 29} Q ${baseX - 172} ${floor - 80} ${baseX - 149} ${floor - 30}`} fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
      {burst > 0 ? <g opacity={burst} transform={`translate(${canX} ${canY - 190})`}>
        <path d="M 9 0 Q -26 -150 -159 -230 M 9 0 Q 82 -165 198 -213 M 9 0 Q 41 -127 25 -265" fill="none" stroke={C.lemon} strokeWidth="24" strokeLinecap="round" />
        <path d="M 9 0 Q -26 -150 -159 -230 M 9 0 Q 82 -165 198 -213" fill="none" stroke={C.white} strokeWidth="7" strokeLinecap="round" />
      </g> : null}
      {[5, 9, 11].flatMap((start, batch) => Array.from({length: 17}, (_, i) => {
        const age = t - start - i % 5 * .055;
        const u = clamp(age / 1.55);
        const alpha = age >= 0 && age <= 1.55 ? Math.sin(Math.PI * u) : 0;
        const x = baseX + Math.sin(i * 2.37 + batch) * (28 + u * (portrait ? 228 : 258));
        const y = baseY - 191 - 430 * u + 190 * u * u;
        return <g key={`${batch}-${i}`} opacity={alpha} transform={`translate(${x} ${y})`}>
          <circle r={9 + i % 4 * 5} fill={i % 3 === 0 ? C.lemon : C.white} stroke={C.ink} strokeWidth="3" />
          <circle cx="-3" cy="-4" r="3" fill={C.white} />
        </g>;
      }))}
      {lastFoam > 0 ? <g data-object-id="citrus-last-puff" opacity={lastFoam}
        transform={`translate(${canX + 13 * canScaleX} ${canY - 181 * canScaleY}) scale(${.7 + .3 * lastFoam})`}>
        <path d="M 0 0 Q -47 -71 -37 -115 Q -5 -143 28 -106 Q 68 -118 80 -78 Q 74 -52 33 -31 L 10 0 Z"
          fill={C.white} stroke={C.ink} strokeWidth="4" strokeLinejoin="round" />
        <path d="M 2 -10 Q -12 -53 10 -91" fill="none" stroke={C.lemon} strokeWidth="12" strokeLinecap="round" />
      </g> : null}
      {Array.from({length: 9}, (_, i) => {
        const age = t - 12.75 - i % 5 * .065;
        const u = clamp(age / 1.04);
        const opacity = age >= 0 && age <= 1.04 ? Math.sin(Math.PI * u) : 0;
        return <g key={`seal-${i}`} opacity={opacity}
          transform={`translate(${baseX + 13 + Math.sin(i * 2.6) * (14 + 152 * u)} ${baseY - 181 - 215 * u + 72 * u * u})`}>
          <circle r={10 + i % 3 * 5} fill={i % 3 === 0 ? C.mint : C.white} stroke={C.ink} strokeWidth="3" />
        </g>;
      })}
      {/* Falling juice begins at the squeezed wedge and reaches the opening. */}
      {t >= 3.25 && t < 4.5 ? <g>
        <path d={`M ${baseX} ${baseY - 293} Q ${baseX - 3} ${baseY - 248} ${baseX + 13} ${baseY - 184}`} fill="none" stroke={C.lemon} strokeWidth="13" strokeLinecap="round" />
        {Array.from({length: 4}, (_, i) => {
          const u = ((t - 3.25) * 3 + i / 4) % 1;
          return <ellipse key={i} cx={baseX + 9 * Math.sin(i * 3)} cy={mix(baseY - 293, baseY - 185, u)} rx="8" ry="12" fill={C.lemon} stroke={C.ink} strokeWidth="2" />;
        })}
      </g> : null}
      <Can x={canX} y={canY} scaleX={canScaleX} scaleY={canScaleY} angle={angle} fill={fill} tab={tab} label={t < 1.2 ? 0 : 1} labelScale={1 + stamp} />
      <g opacity={t < 2 ? 0 : 1}>
        <Lemon x={lemonX} y={lemonY} scale={lemonScale} squeeze={squeeze} hands={window(t, 2.55, 4.45)} rotation={mix(-7, -22, lemonExit)} />
      </g>
      {t >= 12 ? <g opacity={ramp(t, 12, 12.25)} transform={`translate(${portrait ? 570 : 1135} ${portrait ? 610 : 172}) rotate(11)`}>
        <path d="M 0 -46 L 13 -17 L 42 -23 L 25 3 L 42 27 L 11 23 L -2 52 L -14 23 L -45 26 L -26 2 L -40 -25 L -13 -18 Z" fill={C.pink} stroke={C.ink} strokeWidth="5" />
      </g> : null}
    </svg>

    <div data-readable="true" style={{...body, position: 'absolute', left: portrait ? 56 : 80, top: portrait ? 58 : 46, padding: '12px 22px', fontSize: 24, lineHeight: 1.3, backgroundColor: C.white, border: `3px solid ${C.ink}`, borderRadius: 999, boxShadow: `0 6px 0 ${C.ink}`, whiteSpace: 'nowrap'}}>原创概念广告</div>
    <div style={{position: 'absolute', left: titleX, top: titleY, width: copyWidth, transform: `translateY(${(1 - titlePop) * 19}px) scale(${.96 + .04 * titlePop})`, transformOrigin: 'left top'}}>
      <div data-readable="true" style={{...display, fontSize: titleSize, lineHeight: 1.2, whiteSpace: 'nowrap', paddingBottom: 10}}>{headline}</div>
      <div data-readable="true" style={{...body, marginTop: 14, fontSize: portrait ? 31 : 34, lineHeight: 1.45, whiteSpace: 'nowrap'}}>{subtitle}</div>
    </div>
    <div data-readable="true" style={{...body, position: 'absolute', left: portrait ? 56 : 80, bottom: portrait ? 42 : 30, fontSize: 23, lineHeight: 1.35, whiteSpace: 'nowrap'}}>HEIGE VIDEO · BOING CANDY</div>
  </AbsoluteFill>;
};

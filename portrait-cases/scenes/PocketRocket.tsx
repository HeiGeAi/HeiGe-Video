import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

// Original gummy toy rocket. The same assembled object completes the entire trip.
const C = {paper: '#FFF3F9', pink: '#D61F76', teal: '#07C4B4', lemon: '#FFCC33', ink: '#2E1A36', white: '#FFFFFF', hairline: '#F6D9E9'};
const display = {fontFamily: 'CaseDisplay, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const sans = {fontFamily: 'CaseSans, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {const u = clamp(v); return u * u * (3 - 2 * u);};
const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const recoil = (t: number, at: number, size: number) => t >= at && t < at + .7 ? size * Math.exp(-(t - at) * 7) * Math.sin((t - at) * 22) : 0;
const pulse = (t: number, at: number, duration: number) => t >= at && t < at + duration ? Math.sin((t - at) / duration * Math.PI) : 0;
const quad = (a: number, b: number, c: number, u: number) => (1 - u) ** 2 * a + 2 * (1 - u) * u * b + u * u * c;
const starPath = 'M 0 -28 L 8 -8 L 29 -7 L 12 6 L 18 27 L 0 15 L -18 27 L -12 6 L -29 -7 L -8 -8 Z';

const Rocket: React.FC<{x: number; y: number; scale: number; angle: number; fin: number; nose: number; window: number; squish: number; thrust: number; t: number}> = ({x, y, scale, angle, fin, nose, window, squish, thrust, t}) => <g data-object-id="pocket-rocket" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale * (1 + squish * .08)} ${scale * (1 - squish * .07)})`}>
  {thrust > 0 ? <g data-object-id="rocket-engine-fire" opacity={thrust}>
    <path d={`M -37 139 Q -57 193 -18 ${224 + 30 * thrust} L 0 ${274 + 25 * thrust} L 19 ${224 + 30 * thrust} Q 57 193 37 139 Z`} fill={C.pink} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />
    <path d={`M -21 150 Q -28 193 0 ${240 + 28 * thrust} Q 28 193 21 150 Z`} fill={C.lemon} />
    <path d="M -8 150 Q -13 178 0 197 Q 13 178 8 150 Z" fill={C.white} />
  </g> : null}
  <g data-object-id="rocket-left-fin" opacity={ramp(t, 1.1, 1.25)} transform={`translate(${-82 - (1 - fin) * 125} ${33 + (1 - fin) * 90}) rotate(${-16 * (1 - fin)})`}>
    <path d="M 0 -42 Q -56 -25 -62 51 L 9 32 Z" fill={C.lemon} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />
    <path d="M -14 -14 Q -40 7 -43 32" fill="none" stroke={C.white} strokeWidth="8" strokeLinecap="round" />
  </g>
  <g data-object-id="rocket-right-fin" opacity={ramp(t, 1.1, 1.25)} transform={`translate(${82 + (1 - fin) * 125} ${33 + (1 - fin) * 90}) rotate(${16 * (1 - fin)})`}>
    <path d="M 0 -42 Q 56 -25 62 51 L -9 32 Z" fill={C.lemon} stroke={C.ink} strokeWidth="5" strokeLinejoin="round" />
    <path d="M 14 -14 Q 40 7 43 32" fill="none" stroke={C.white} strokeWidth="8" strokeLinecap="round" />
  </g>
  <path d="M -81 -120 Q -91 -111 -91 -66 L -79 93 Q -76 123 -49 135 L 49 135 Q 76 123 79 93 L 91 -66 Q 91 -111 81 -120 Z" fill={C.hairline} transform="translate(10 9)" />
  <path d="M -81 -120 Q -91 -111 -91 -66 L -79 93 Q -76 123 -49 135 L 49 135 Q 76 123 79 93 L 91 -66 Q 91 -111 81 -120 Z" fill={C.white} stroke={C.ink} strokeWidth="5" />
  <path d="M -83 14 Q 0 38 83 14 L 79 93 Q 76 123 49 135 L -49 135 Q -76 123 -79 93 Z" fill={C.teal} stroke={C.ink} strokeWidth="5" />
  <path d="M -65 -100 L -65 -38" stroke={C.white} strokeWidth="9" strokeLinecap="round" />
  <path d="M -69 23 Q 0 44 69 23" stroke={C.white} strokeWidth="9" fill="none" strokeLinecap="round" />
  <rect x="-46" y="128" width="92" height="32" rx="11" fill={C.ink} />
  <path d="M -32 137 L -32 151 M -15 137 L -15 151 M 2 137 L 2 151 M 19 137 L 19 151 M 34 137 L 34 151" stroke={C.white} strokeWidth="4" strokeLinecap="round" />
  <g data-object-id="rocket-nose-cone" opacity={ramp(t, 2, 2.1)} transform={`translate(0 ${-(1 - nose) * 95}) rotate(${(1 - nose) * 13})`}>
    <path d="M -84 -118 Q -77 -177 0 -213 Q 77 -177 84 -118 Q 0 -101 -84 -118 Z" fill={C.pink} stroke={C.ink} strokeWidth="5" />
    <path d="M -51 -137 Q -38 -171 -5 -184" stroke={C.white} strokeWidth="10" fill="none" strokeLinecap="round" />
    <path d="M -83 -117 Q 0 -98 83 -117" stroke={C.lemon} strokeWidth="9" fill="none" />
  </g>
  <g data-object-id="rocket-window" transform={`translate(0 -54) scale(${.78 + .22 * window})`} opacity={ramp(t, 2.8, 3)}>
    <circle cx="0" cy="7" r="61" fill={C.hairline} /><circle r="61" fill={C.lemon} stroke={C.ink} strokeWidth="5" />
    <circle r="47" fill={C.ink} /><circle r="36" fill={C.teal} />
    <path d="M -20 -19 Q -7 -34 16 -23" stroke={C.white} strokeWidth="7" fill="none" strokeLinecap="round" />
    <circle cx="-11" cy="1" r="4" fill={C.ink} /><circle cx="11" cy="1" r="4" fill={C.ink} />
    <path d="M -10 12 Q 0 24 10 12" fill="none" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
    {[45, 135, 225, 315].map(a => <circle key={a} cx={Math.sin(a * Math.PI / 180) * 53} cy={Math.cos(a * Math.PI / 180) * 53} r="3" fill={C.ink} />)}
  </g>
  <path d="M 0 70 L 0 115 M -18 81 L 0 62 L 18 81" stroke={C.ink} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
</g>;

const Planet: React.FC<{scale: number; t: number}> = ({scale, t}) => <g data-object-id="gummy-planet" transform={`translate(360 762) scale(${scale})`}>
  <ellipse rx="196" ry="52" fill="none" stroke={C.pink} strokeWidth="27" transform="rotate(-18)" />
  <circle cx="8" cy="13" r="130" fill={C.hairline} />
  <circle r="130" fill={C.teal} stroke={C.ink} strokeWidth="5" />
  <path d="M -108 -57 Q -95 -111 -19 -113 Q 63 -111 48 -61 Q -9 -68 -14 -14 Q -56 11 -90 -10 Z" fill={C.lemon} opacity=".72" style={{mixBlendMode: 'multiply'}} />
  <path d="M -13 22 Q 17 -10 83 17 Q 119 45 96 93 Q 54 112 27 71 Q -20 75 -13 22 Z" fill={C.pink} opacity=".72" style={{mixBlendMode: 'multiply'}} />
  <path d="M -81 -85 Q -43 -120 9 -108" fill="none" stroke={C.white} strokeWidth="13" strokeLinecap="round" opacity=".76" />
  <circle cx="-15" cy="-6" r="5" fill={C.ink} /><circle cx="21" cy="-6" r="5" fill={C.ink} />
  <path d="M -9 16 Q 6 30 20 14" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
  <path d="M -185 21 Q -116 75 26 53 Q 143 33 186 -24" fill="none" stroke={C.pink} strokeWidth="26" strokeLinecap="round" />
  <path d="M -175 21 Q -126 60 -70 58" fill="none" stroke={C.white} strokeWidth="5" strokeLinecap="round" opacity=".8" />
</g>;

export const PocketRocket: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const fin = ramp(t, 1.1, 1.35);
  const nose = ramp(t, 2, 2.25);
  const window = ramp(t, 2.8, 3.25);
  const launch = ramp(t, 5.55, 7.2);
  const orbit = clamp((t - 7.2) / 4);
  const theta = -Math.PI / 4 + orbit * Math.PI * 2;
  const orbitalX = 360 + 205 * Math.cos(theta);
  const orbitalY = 762 + 190 * Math.sin(theta);
  const orbitalAngle = Math.atan2(190 * Math.cos(theta), -205 * Math.sin(theta)) * 180 / Math.PI + 90;
  const returnHome = ramp(t, 11.2, 12.5);
  const squash = pulse(t, 4.25, 1.3);
  const orbitStartX = 360 + 205 / Math.SQRT2;
  const orbitStartY = 762 - 190 / Math.SQRT2;
  const launchX = quad(360, 190, orbitStartX, launch);
  const launchY = quad(730, 340, orbitStartY, launch);
  const launchDX = 2 * (1 - launch) * (190 - 360) + 2 * launch * (orbitStartX - 190);
  const launchDY = 2 * (1 - launch) * (340 - 730) + 2 * launch * (orbitStartY - 340);
  const launchAngle = (Math.atan2(launchDY, launchDX) * 180 / Math.PI + 90) * ramp(t, 5.55, 5.8);
  const x = t < 7.2 ? launchX : mix(orbitalX, 360, returnHome);
  const y = (t < 5.55 ? 730 - (1 - ramp(t, 0, .45)) * 22 + recoil(t, .45, -12) : t < 7.2 ? launchY : mix(orbitalY, 762, returnHome)) - 37 * Math.sin(returnHome * Math.PI);
  const angle = t < 5.55 ? recoil(t, 1.35, -4) + recoil(t, 2.25, 4) : t < 7.2 ? launchAngle : mix(orbitalAngle, -9, returnHome);
  const size = t < 7.2 ? mix(1, .48, launch) : mix(.48, .76, returnHome);
  const thrust = t < 5 ? 0 : t < 5.55 ? .4 + .6 * ramp(t, 5, 5.55) : t < 11.2 ? .78 + .18 * Math.sin(t * Math.PI * 6) : 1 - ramp(t, 11.2, 12.1);
  const planetScale = ramp(t, 6.1, 7.15) * (1 - ramp(t, 11.2, 12.3));
  const badge = ramp(t, 12.25, 12.65);
  const badgeWobble = recoil(t, 12.65, .06);
  const backdrop = t < 5.55 ? C.paper : t < 11.2 ? '#E6FCF7' : '#FFF7D9';
  const headline = t < 1.1 ? '小宇宙发射' : t < 3.25 ? '零件就位' : t < 5.55 ? '准备起飞' : t < 7.2 ? '冲上去' : t < 11.2 ? '绕颗糖果星' : '好奇心有回响';
  const subtitle = t < 1.1 ? '拼出你的探险玩具' : t < 3.25 ? '尾翼鼻锥咔哒归位' : t < 5.55 ? '倒数三个拍点' : t < 7.2 ? '一团火把愿望推远' : t < 11.2 ? '转个弯发现新颜色' : '把小宇宙带回手心';
  const inOrbit = t >= 7.2 && t < 11.2;
  const behindPlanet = inOrbit && Math.sin(theta) < 0;
  const rocket = <Rocket x={x} y={y} scale={size} angle={angle} fin={fin} nose={nose} window={window} squish={squash} thrust={thrust} t={t} />;
  return <AbsoluteFill style={{backgroundColor: backdrop, color: C.ink, overflow: 'hidden'}}>
    <svg width="720" height="1280" viewBox="0 0 720 1280" style={{position: 'absolute', inset: 0}} aria-hidden="true">
      <path d="M 0 1097 Q 315 1065 720 1097 L 720 1280 L 0 1280 Z" fill={t < 5.55 ? C.teal : t < 11.2 ? C.lemon : C.pink} opacity={t < 11.2 ? .22 : .12} />
      <path d="M 92 401 Q 151 363 207 398 Q 261 431 234 491 Q 175 525 112 480 Q 71 453 92 401 Z" fill={C.pink} opacity=".12" />
      <path d="M 503 925 Q 579 877 629 939 Q 650 1022 566 1043 Q 485 1022 503 925 Z" fill={C.teal} opacity=".2" />
      {Array.from({length: 10}, (_, i) => {
        const sx = 83 + i % 5 * 137 + (i % 2) * 15;
        const sy = 445 + Math.floor(i / 5) * 544 + i % 3 * 30;
        const visible = .45 + .32 * Math.sin(t * 2 + i);
        return <g key={i} transform={`translate(${sx} ${sy}) scale(${.2 + i % 3 * .1})`} opacity={t >= 14.5 ? .65 : visible}>
          <path d={starPath} fill={i % 2 ? C.lemon : C.pink} />
        </g>;
      })}
      {t < 5.55 ? <g opacity={1 - ramp(t, 5.25, 5.55)}>
        <ellipse cx="364" cy="960" rx="116" ry="17" fill={C.ink} opacity=".14" />
        {/* The nozzle rests on a real cradle. The arms clear before departure. */}
        <g data-object-id="rocket-launch-cradle" transform={`translate(360 979) scale(${1 + .8 * ramp(t, 5.25, 5.55)} 1) translate(-360 -979)`}>
          <path d="M 311 890 L 311 979 M 409 890 L 409 979" stroke={C.ink} strokeWidth="17" fill="none" strokeLinecap="round" />
          <path d="M 311 895 L 311 970 M 409 895 L 409 970" stroke={C.white} strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M 304 890 L 329 890 M 391 890 L 416 890" stroke={C.ink} strokeWidth="11" fill="none" strokeLinecap="round" />
          <circle cx="311" cy="935" r="10" fill={C.pink} stroke={C.ink} strokeWidth="4" />
          <circle cx="409" cy="935" r="10" fill={C.pink} stroke={C.ink} strokeWidth="4" />
        </g>
        <path d="M 223 979 Q 364 954 497 979" stroke={C.ink} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M 244 981 L 244 1001 M 477 981 L 477 1001" stroke={C.ink} strokeWidth="7" strokeLinecap="round" />
      </g> : null}
      {t >= 6.1 && t < 12.3 ? <g opacity={planetScale}>
        <ellipse cx="360" cy="762" rx="205" ry="190" fill="none" stroke={C.ink} strokeWidth="2.5" strokeDasharray="6 13" opacity=".22" />
        {inOrbit ? <path d={Array.from({length: 16}, (_, i) => {
          const a = theta - i * .065;
          return `${i ? 'L' : 'M'} ${360 + 205 * Math.cos(a)} ${762 + 190 * Math.sin(a)}`;
        }).join(' ')} stroke={C.pink} strokeWidth="11" fill="none" strokeLinecap="round" opacity=".28" /> : null}
      </g> : null}
      {behindPlanet ? rocket : null}
      {planetScale > 0 ? <Planet scale={planetScale} t={t} /> : null}
      {t >= 12.25 ? <g data-object-id="rocket-mission-badge" transform={`translate(360 762) scale(${.86 + .14 * badge + badgeWobble})`} opacity={badge}>
        <circle cx="8" cy="12" r="193" fill={C.hairline} /><circle r="193" fill={C.white} stroke={C.ink} strokeWidth="5" />
        <circle r="178" fill={C.paper} stroke={C.pink} strokeWidth="7" />
        <path d="M -140 -82 Q -90 -154 -24 -150 Q 68 -141 28 -52 Q -7 14 -68 -3 Q -149 -14 -140 -82 Z" fill={C.teal} opacity=".72" style={{mixBlendMode: 'multiply'}} />
        <path d="M -59 -117 Q 18 -161 98 -99 Q 161 -47 82 12 Q 17 56 -27 -5 Q -100 -50 -59 -117 Z" fill={C.pink} opacity=".72" style={{mixBlendMode: 'multiply'}} />
      </g> : null}
      {!behindPlanet ? rocket : null}
      {t >= 4.25 && t < 5.55 ? <g transform={`translate(563 727) scale(${1 + .055 * pulse(t, t < 4.68 ? 4.25 : t < 5.1 ? 4.68 : 5.1, .38)})`}>
        <circle r="52" fill={C.lemon} stroke={C.ink} strokeWidth="4" />
        <text data-readable="true" x="0" y="23" fill={C.ink} textAnchor="middle" style={{...display, fontSize: 66}}>{t < 4.68 ? '3' : t < 5.1 ? '2' : '1'}</text>
      </g> : null}
      {t >= 14 ? <g data-object-id="rocket-complete-star" transform={`translate(559 ${943 - 55 * (1 - ramp(t, 14, 14.25))}) rotate(12) scale(${1 + recoil(t, 14.25, .12) * (1 - ramp(t, 14.25, 14.5))})`} opacity={ramp(t, 14, 14.1)}>
        <path d={starPath} fill={C.ink} transform="translate(5 6) scale(1.9)" />
        <path d={starPath} fill={C.lemon} stroke={C.ink} strokeWidth="2.5" transform="scale(1.9)" />
        <path d="M -14 0 L -3 11 L 18 -13" fill="none" stroke={C.ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g> : null}
    </svg>
    <div data-readable="true" style={{...sans, position: 'absolute', left: 56, top: 64, fontSize: 22, lineHeight: 1.3, backgroundColor: C.lemon, border: `3px solid ${C.ink}`, borderRadius: 999, padding: '10px 18px', whiteSpace: 'nowrap'}}>原创玩具概念</div>
    <div data-readable="true" style={{...display, position: 'absolute', left: 56, top: 157, fontSize: 66, lineHeight: 1.22, whiteSpace: 'nowrap'}}>{headline}</div>
    <div data-readable="true" style={{...sans, position: 'absolute', left: 56, top: 254, fontSize: 29, lineHeight: 1.4, whiteSpace: 'nowrap'}}>{subtitle}</div>
    {t >= 12.6 ? <div data-readable="true" style={{...display, position: 'absolute', left: 56, top: 1030, width: 608, fontSize: 43, lineHeight: 1.2, textAlign: 'center', whiteSpace: 'nowrap', opacity: ramp(t, 12.6, 12.85)}}>把好奇送上天</div> : null}
    <div data-readable="true" style={{...sans, position: 'absolute', left: 56, top: 1124, fontSize: 21, lineHeight: 1.3, whiteSpace: 'nowrap'}}>HEIGE VIDEO  POCKET ROCKET</div>
  </AbsoluteFill>;
};

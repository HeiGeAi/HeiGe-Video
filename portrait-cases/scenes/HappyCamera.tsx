import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

// Original paper-and-enamel toy illustration. All poses use the film frame clock.
const C = {paper: '#f5f1e6', blue: '#2536e8', red: '#ff3b3b', yellow: '#ffd21e', ink: '#17171f', white: '#ffffff', muted: '#63625b'};
const display = {fontFamily: 'CaseDisplay, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const sans = {fontFamily: 'CaseSans, Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 400, fontSynthesis: 'none'} as const;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {const u = clamp(v); return u * u * (3 - 2 * u);};
const ramp = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const pulse = (t: number, at: number, duration: number) => t >= at && t < at + duration ? Math.sin((t - at) / duration * Math.PI) : 0;
const recoil = (t: number, at: number, magnitude: number) => t >= at && t < at + .6 ? magnitude * Math.exp(-(t - at) * 8) * Math.sin((t - at) * 23) : 0;
const flowerPetals = Array.from({length: 8}, (_, i) => i * 45);

const Flower: React.FC<{scale?: number}> = ({scale = 1}) => <g transform={`scale(${scale})`}>
  <path d="M 0 0 Q 8 47 -4 89" fill="none" stroke={C.blue} strokeWidth="11" strokeLinecap="round" />
  <path d="M 1 61 Q -50 27 -35 71 Q -18 93 1 73 M 0 40 Q 39 5 43 40 Q 29 59 0 52" fill={C.yellow} stroke={C.ink} strokeWidth="4" />
  {flowerPetals.map(a => <ellipse key={a} cx="0" cy="-36" rx="18" ry="28" fill={C.yellow} stroke={C.ink} strokeWidth="4" transform={`rotate(${a})`} />)}
  <circle r="30" fill={C.red} stroke={C.ink} strokeWidth="4" />
  <circle cx="-10" cy="-5" r="3.5" fill={C.ink} /><circle cx="10" cy="-5" r="3.5" fill={C.ink} />
  <path d="M -9 9 Q 0 21 11 8" fill="none" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
</g>;

const Sun: React.FC<{scale?: number}> = ({scale = 1}) => <g transform={`scale(${scale})`}>
  {Array.from({length: 8}, (_, i) => <path key={i} d="M 0 -48 L 0 -60" stroke={C.red} strokeWidth="7" strokeLinecap="round" transform={`rotate(${i * 45})`} />)}
  <circle r="36" fill={C.yellow} stroke={C.ink} strokeWidth="5" />
  <circle cx="-10" cy="-4" r="3" fill={C.ink} /><circle cx="10" cy="-4" r="3" fill={C.ink} />
  <path d="M -8 9 Q 0 16 8 9" fill="none" stroke={C.ink} strokeWidth="3.5" strokeLinecap="round" />
</g>;

const Photo: React.FC<{x: number; y: number; angle: number; scale: number; reveal: number; caption: number; peel: number}> = ({x, y, angle, scale, reveal, caption, peel}) => <g data-object-id="camera-physical-photo" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
  <path d="M -124 -144 L 124 -144 L 124 144 L -124 144 Z" fill={C.ink} transform="translate(9 11)" />
  <rect x="-124" y="-144" width="248" height="288" rx="9" fill={C.white} stroke={C.ink} strokeWidth="4" />
  <rect x="-107" y="-127" width="214" height="209" rx="3" fill={C.paper} />
  <g opacity={reveal}>
    <rect x="-107" y="-127" width="214" height="209" rx="3" fill={C.blue} />
    <path d="M -107 28 Q -30 -5 107 44 L 107 82 L -107 82 Z" fill={C.yellow} />
    <path d="M -107 58 Q 6 13 107 66 L 107 82 L -107 82 Z" fill={C.red} />
    <g transform="translate(58 -88)"><Sun scale={.39} /></g>
    <g transform="translate(-26 -17)"><Flower scale={.9} /></g>
  </g>
  <g opacity={1 - reveal}>
    <path d="M -83 -69 Q 0 -120 83 -65 M -76 -17 Q -8 -65 72 -11 M -59 30 Q -4 -5 58 32" stroke={C.white} strokeWidth="13" fill="none" strokeLinecap="round" />
  </g>
  <text data-readable="true" opacity={caption} x="0" y="121" textAnchor="middle" fill={C.ink} style={{...display, fontSize: 28}}>今天超开心</text>
  {/* The same paper corner lifts and returns instead of replacing the photo. */}
  <path d={`M 124 94 L ${124 - 33 * peel} ${144 - 10 * peel} L 124 144 Z`} fill={C.yellow} stroke={C.ink} strokeWidth={peel > 0 ? 3 : 0} opacity={peel} />
</g>;

const Camera: React.FC<{x: number; y: number; scale: number; angle: number; dial: number; lens: number; press: number; t: number}> = ({x, y, scale, angle, dial, lens, press, t}) => <g data-object-id="camera-toy-body" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale * (1 + .055 * press)} ${scale * (1 - .045 * press)})`}>
  <path d="M -212 -120 Q -212 -144 -183 -144 L 173 -144 Q 213 -144 213 -103 L 213 97 Q 213 136 174 136 L -174 136 Q -212 136 -212 100 Z" fill={C.ink} transform="translate(12 12)" />
  <rect x="-216" y="-147" width="435" height="290" rx="44" fill={C.white} stroke={C.ink} strokeWidth="5" />
  <rect x="-203" y="-134" width="409" height="264" rx="34" fill={C.blue} stroke={C.ink} strokeWidth="4" />
  <path d="M -191 -104 L -191 91" stroke={C.white} strokeWidth="8" strokeLinecap="round" />
  <g transform={`translate(-106 -155) rotate(${dial})`}>
    <rect x="-49" y="-20" width="98" height="29" rx="10" fill={C.yellow} stroke={C.ink} strokeWidth="5" />
    {[-30, -15, 0, 15, 30].map(v => <path key={v} d={`M ${v} -17 L ${v} 3`} stroke={C.ink} strokeWidth="3" />)}
    <path d="M 0 -20 L 0 -30" stroke={C.red} strokeWidth="7" strokeLinecap="round" />
  </g>
  <g transform={`translate(134 ${-151 + 14 * press})`}>
    <rect x="-34" y="-22" width="68" height="36" rx="15" fill={C.red} stroke={C.ink} strokeWidth="5" />
    <path d="M -18 -12 L 18 -12" stroke={C.white} strokeWidth="4" strokeLinecap="round" />
  </g>
  <rect x="102" y="-104" width="71" height="46" rx="9" fill={C.white} stroke={C.ink} strokeWidth="5" />
  <rect x="112" y="-96" width="50" height="30" rx="4" fill={C.yellow} />
  <path d="M 123 -91 L 154 -72" stroke={C.white} strokeWidth="5" />
  <g transform={`translate(-35 -17) scale(${1 + .12 * lens})`}>
    <circle cx="0" cy="8" r="89" fill={C.ink} />
    <circle r="89" fill={C.white} stroke={C.ink} strokeWidth="5" />
    <circle r="76" fill={C.yellow} stroke={C.ink} strokeWidth="5" />
    {Array.from({length: 12}, (_, i) => <path key={i} d="M 0 -72 L 0 -65" stroke={C.ink} strokeWidth="3" transform={`rotate(${i * 30})`} />)}
    <circle r="59" fill={C.ink} />
    <circle r="45" fill={C.blue} stroke={C.white} strokeWidth="4" />
    <path d="M -23 -19 Q -7 -40 20 -24" fill="none" stroke={C.white} strokeWidth="10" strokeLinecap="round" />
    <path d="M 11 31 L 26 16" stroke={C.red} strokeWidth="9" strokeLinecap="round" />
    {t >= 3.2 && t < 4.5 ? <g opacity={pulse(t, 3.2, 1.3)}>
      <path d="M -22 -17 L -22 -26 L -13 -26 M 13 -26 L 22 -26 L 22 -17 M 22 17 L 22 26 L 13 26 M -13 26 L -22 26 L -22 17" stroke={C.yellow} strokeWidth="5" fill="none" />
    </g> : null}
  </g>
  <rect x="110" y="-19" width="54" height="47" rx="14" fill={C.red} stroke={C.ink} strokeWidth="4" />
  <circle cx="137" cy="4" r="11" fill={C.white} />
  <text data-readable="true" x="136" y="69" textAnchor="middle" fill={C.white} style={{...sans, fontSize: 20, letterSpacing: 1}}>CLICK</text>
  <rect x="-146" y="104" width="295" height="16" rx="8" fill={C.ink} />
  <path d="M -139 107 L 140 107" stroke={C.white} strokeWidth="3" strokeLinecap="round" />
  <path d="M -203 74 L -203 103 M -211 81 L -193 81 M -211 91 L -193 91" stroke={C.yellow} strokeWidth="4" strokeLinecap="round" />
</g>;

export const HappyCamera: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const entrance = ramp(t, 0, .45);
  const landing = recoil(t, .45, .055);
  const press = pulse(t, 4.4, .34);
  const retreat = ramp(t, 11.5, 12.45);
  const cameraX = mix(360, 492, retreat) + recoil(t, 4.5, 7);
  const cameraY = mix(675, 569, retreat) + (1 - entrance) * -35 + recoil(t, .45, -17);
  const cameraScale = mix(1, .72, retreat) + landing;
  const cameraAngle = mix(-3, 7, retreat) + recoil(t, 4.5, 3);
  const eject = ramp(t, 5.05, 6.6);
  const release = ramp(t, 7.3, 8);
  const finalPlace = ramp(t, 11.5, 12.45);
  const photoX = mix(360, 294, finalPlace) + recoil(t, 8, 5);
  const photoY = mix(785 - 144, 929, eject) - 20 * release - 20 * Math.sin(Math.PI * release) - 20 * finalPlace + recoil(t, 8, 12);
  const photoAngle = -3 * (1 - release) - 7 * Math.sin(Math.PI * release) + 5 * release - 10 * finalPlace + recoil(t, 8, 4);
  const photoScale = 1 + .035 * pulse(t, 14, .45);
  const peel = pulse(t, 10, .9);
  const subjectsExit = ramp(t, 10.8, 11.4);
  const shutterFlash = t >= 4.5 && t <= 4.7 ? 1 - ramp(t, 4.52, 4.7) : 0;
  const headline = t < 1.75 ? '快乐开拍' : t < 4.4 ? '把镜头叫醒' : t < 6 ? '这一秒留住' : t < 8.6 ? '照片出来啦' : t < 11.5 ? '快乐显影中' : '今天超开心';
  const subtitle = t < 1.75 ? '带上会笑的小相机' : t < 4.4 ? '转一转对准好心情' : t < 6 ? '咔嚓接住这一秒' : t < 8.6 ? '一张实体照片慢慢吐出' : t < 11.5 ? '小花和太阳真的留下了' : '把快乐贴进今天';
  const stamp = ramp(t, 12.5, 12.75);
  const stampBounce = recoil(t, 12.75, .13);
  return <AbsoluteFill style={{backgroundColor: C.paper, overflow: 'hidden', color: C.ink}}>
    <svg width="720" height="1280" viewBox="0 0 720 1280" style={{position: 'absolute', inset: 0}} aria-hidden="true">
      <defs><clipPath id="camera-photo-output"><rect x="60" y="785" width="600" height="312" /></clipPath></defs>
      <path d="M 0 1093 Q 343 1055 720 1093 L 720 1280 L 0 1280 Z" fill={C.yellow} />
      <path d="M 52 350 L 668 350" stroke="#e4dfd0" strokeWidth="3" strokeDasharray="5 13" />
      <g opacity={1 - subjectsExit}>
        <g data-object-id="camera-subject-flower" transform={`translate(160 ${444 + 5 * Math.sin(t * Math.PI * 2) * (1 - ramp(t, 4.35, 4.5))}) rotate(${-12 + 5 * pulse(t, 3.6, .5)})`}>
          <path d="M -76 -42 Q -26 -96 35 -69 Q 85 -43 72 24 Q 49 87 -12 80 Q -89 66 -76 -42 Z" fill={C.ink} transform="translate(7 9)" />
          <path d="M -76 -42 Q -26 -96 35 -69 Q 85 -43 72 24 Q 49 87 -12 80 Q -89 66 -76 -42 Z" fill={C.white} stroke={C.ink} strokeWidth="4" />
          <Flower scale={.66} />
        </g>
        <g data-object-id="camera-subject-sun" transform={`translate(553 438) rotate(${12 + recoil(t, 3.6, 12)})`}>
          <circle r="67" fill={C.ink} transform="translate(7 8)" /><circle r="67" fill={C.white} stroke={C.ink} strokeWidth="4" />
          <Sun scale={.82} />
        </g>
      </g>
      <ellipse cx={mix(369, 485, retreat)} cy={mix(834, 682, retreat)} rx={mix(208, 143, retreat)} ry="13" fill={C.ink} opacity=".13" />
      {t >= 5.05 ? <g clipPath={t < 7.3 ? 'url(#camera-photo-output)' : undefined}>
        <Photo x={photoX} y={photoY} angle={photoAngle} scale={photoScale} reveal={ramp(t, 8.6, 9.75)} caption={ramp(t, 6.65, 6.9)} peel={peel} />
      </g> : null}
      <Camera x={cameraX} y={cameraY} scale={cameraScale} angle={cameraAngle} dial={34 * ramp(t, 1.75, 2.05)} lens={ramp(t, 2.4, 2.8)} press={press} t={t} />
      {t >= 4.5 && t < 5 ? <g transform={`translate(${cameraX + 130} ${cameraY - 91})`} opacity={1 - ramp(t, 4.75, 5)}>
        <path d="M 0 -14 L 13 -47 L 20 -15 L 54 -16 L 29 4 L 45 33 L 12 22 L -11 49 L -9 13 L -43 8 L -13 -8 L -26 -38 Z" fill={C.yellow} stroke={C.ink} strokeWidth="4" />
      </g> : null}
      {t >= 12.5 ? <g data-object-id="camera-keepsake-stamp" transform={`translate(536 ${944 + (1 - stamp) * -92}) rotate(13) scale(${.83 + .17 * stamp + stampBounce})`} opacity={stamp}>
        <path d="M 0 -72 L 19 -44 L 53 -52 L 57 -17 L 84 4 L 57 26 L 47 60 L 13 57 L -16 80 L -35 52 L -70 49 L -69 13 L -88 -15 L -58 -33 L -45 -65 L -14 -56 Z" fill={C.ink} transform="translate(7 8)" />
        <path d="M 0 -72 L 19 -44 L 53 -52 L 57 -17 L 84 4 L 57 26 L 47 60 L 13 57 L -16 80 L -35 52 L -70 49 L -69 13 L -88 -15 L -58 -33 L -45 -65 L -14 -56 Z" fill={C.white} stroke={C.ink} strokeWidth="4" />
        <circle r="48" fill={C.red} stroke={C.ink} strokeWidth="3" />
        <path d="M -20 0 L -6 15 L 24 -19" fill="none" stroke={C.ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      </g> : null}
      <rect width="720" height="1280" fill={C.white} opacity={shutterFlash * .65} />
    </svg>
    <div data-readable="true" style={{...sans, position: 'absolute', left: 56, top: 64, fontSize: 22, lineHeight: 1.3, backgroundColor: C.yellow, border: `3px solid ${C.ink}`, borderRadius: 999, padding: '10px 18px', whiteSpace: 'nowrap'}}>原创玩具概念</div>
    <div data-readable="true" style={{...display, position: 'absolute', left: 56, top: 157, fontSize: 66, lineHeight: 1.22, whiteSpace: 'nowrap', transform: `translateY(${-4 * pulse(t, 4.5, .35)}px)`}}>{headline}</div>
    <div data-readable="true" style={{...sans, position: 'absolute', left: 56, top: 254, fontSize: 29, lineHeight: 1.4, whiteSpace: 'nowrap'}}>{subtitle}</div>
    <div data-readable="true" style={{...sans, position: 'absolute', left: 56, top: 1124, fontSize: 21, lineHeight: 1.3, whiteSpace: 'nowrap'}}>HEIGE VIDEO  HAPPY CAMERA</div>
  </AbsoluteFill>;
};

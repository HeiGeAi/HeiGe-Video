import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, Sequence, useCurrentFrame} from 'remotion';
import {inspectLayout} from './inspect';
import {captionText, clamp} from './motion';
import {Block, Text} from './primitives';
import {assertLocalAssetUrl, Scene} from './scenes';
import {fitFont, layoutFor, themeStyle} from './theme';
import type {FilmProps} from './types';
import {ContinuousStage, probeContinuousStage} from './ContinuousStage';
import './styles.css';

function useLocalFont(fontFamily: string, fontUrl?: string) {
  const pendingHandle = useRef<number | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const key = `${fontFamily}\n${fontUrl || ''}`;
  useLayoutEffect(() => {
    // Allocate the latch in the committed layout phase. Strict Effects can
    // clean up and restart this effect without leaking an initializer handle.
    const handle = delayRender(`Local font and committed layout: ${fontFamily}`, {timeoutInMilliseconds: 30000});
    pendingHandle.current = handle;
    let active = true;
    const load = async () => {
      if (fontUrl) {
        const url = assertLocalAssetUrl(fontUrl, true);
        const face = new FontFace(fontFamily, `url(${JSON.stringify(url)})`);
        const loaded = await face.load();
        // TypeScript's older DOM declaration omits FontFaceSet.add; Chromium
        // implements the web-standard method used by Remotion's font recipe.
        (document.fonts as FontFaceSet & {add(face: FontFace): FontFaceSet}).add(loaded);
      }
      await document.fonts.load(`32px "${fontFamily.replace(/["\\]/g, '')}"`);
      await document.fonts.ready;
      if (!document.fonts.check(`32px "${fontFamily.replace(/["\\]/g, '')}"`)) throw new Error(`Local font not available: ${fontFamily}`);
      if (active) {
        // The film's subsequent committed layout effect inspects geometry and
        // releases the latch. Resolving this promise alone cannot release it.
        setLoadedKey(key);
      }
    };
    load().catch(error => {if (active) cancelRender(error);});
    return () => {
      active = false;
      if (pendingHandle.current === handle) {
        pendingHandle.current = null;
        continueRender(handle);
      }
    };
  }, [fontFamily, fontUrl, key]);
  return {fontReady: loadedKey === key, pendingHandle};
}

export const HeigeFilm: React.FC<FilmProps> = ({plan, assetUrls, captions, fontFamily, inspect = false, renderSampling}) => {
  const rawFrame = useCurrentFrame();
  const samples = renderSampling?.samples ?? 1;
  const frame = Math.floor(rawFrame / samples);
  const rootRef = useRef<HTMLDivElement>(null);
  const {fontReady, pendingHandle} = useLocalFont(fontFamily, assetUrls.__font);
  const layout = layoutFor(plan.project.ratio);
  const time = frame / plan.fps;
  const sampleTime = Math.max(0, Math.min(plan.duration, (frame + ((rawFrame % samples + .5) / samples - .5) * ((renderSampling?.shutterAngle ?? 180) / 360)) / plan.fps));
  const cue = captions.find(caption => caption.start <= time && time < caption.end);
  const subtitle = cue ? captionText(cue.text) : '';
  useLayoutEffect(() => {
    if (!fontReady) return;
    try {
      if (!rootRef.current) throw new Error('The committed film root is unavailable for geometry inspection');
      if (inspect) console.debug('HEIGE_LAYOUT:' + JSON.stringify(inspectLayout(rootRef.current, frame, plan.width, plan.height)));
      if (plan.project.continuity && rawFrame % samples === Math.floor(samples / 2)) console.debug('HEIGE_CONTINUITY:' + JSON.stringify(probeContinuousStage(rootRef.current, {frame, fps:plan.fps, time, width:plan.width, height:plan.height})));
      const handle = pendingHandle.current;
      if (handle !== null) {
        pendingHandle.current = null;
        continueRender(handle);
      }
    } catch (error) {
      cancelRender(error);
    }
  }, [inspect, fontReady, pendingHandle, rawFrame, frame, samples, time, plan.fps, plan.project.continuity, plan.width, plan.height, subtitle]);
  return <AbsoluteFill ref={rootRef} className="heige-film" data-heige-engine="controlled-remotion-v4" data-heige-global-frame={frame} style={themeStyle(plan.project.theme, fontFamily)}>
    {plan.project.continuity ? <ContinuousStage plan={plan} time={sampleTime} fontFamily={fontFamily} assetUrls={assetUrls} /> : plan.timeline.map((shot, index) => <Sequence key={shot.id} from={shot.from} durationInFrames={shot.frames} layout="none">
      <Scene plan={plan} assetUrls={assetUrls} shot={shot} index={index} />
    </Sequence>)}
    {subtitle ? <Block id="timed-subtitle" className="heige-caption-wrap" style={{left: layout.pad, right: layout.pad, bottom: 22, minHeight: layout.bottom - 38, padding: '14px 0'}}>
      <Text id="subtitle" className="heige-caption" style={{fontSize: fitFont(subtitle, plan.width - 2 * layout.pad, layout.caption, 2, 24)}}>{subtitle}</Text>
    </Block> : null}
    <div className="heige-progress-track" aria-hidden="true" style={{left: layout.pad, right: layout.pad}}><div className="heige-progress" style={{transform: `scaleX(${clamp((frame + 1) / plan.durationInFrames)})`}} /></div>
  </AbsoluteFill>;
};

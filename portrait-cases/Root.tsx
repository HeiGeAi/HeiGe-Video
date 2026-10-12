import React, {useEffect, useLayoutEffect, useState} from 'react';
import {AbsoluteFill, Composition, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BerryCone} from './scenes/BerryCone';
import {CoffeeWake} from './scenes/CoffeeWake';
import {HappyCamera} from './scenes/HappyCamera';
import {PocketRocket} from './scenes/PocketRocket';

const fonts = ['CaseDisplay', 'CaseSans'];
const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [handle] = useState(() => delayRender('Load local portrait fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all(fonts.map(async name => {
      const face = new FontFace(name, `url(${staticFile(`fonts/${name}.woff`)})`);
      await face.load();
      (document.fonts as FontFaceSet & {add(face: FontFace): FontFaceSet}).add(face);
    })).then(() => {
      if (active) {setReady(true); requestAnimationFrame(() => continueRender(handle));}
    }).catch(cancelRender);
    return () => {active = false;};
  }, [handle]);
  return ready ? <>{children}</> : null;
};
const LayoutProbe: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  useLayoutEffect(() => {
    const root = document.querySelector('[data-film-root]')!;
    const base = root.getBoundingClientRect();
    const errors: string[] = [];
    const texts = Array.from(root.querySelectorAll('[data-readable]')).map((element, index) => {
      const box = element.getBoundingClientRect();
      let opacity = 1;
      let cursor: Element | null = element;
      while (cursor && cursor !== root) {
        const style = getComputedStyle(cursor);
        opacity *= Number(style.opacity);
        if (style.display === 'none' || style.visibility === 'hidden') opacity = 0;
        cursor = cursor.parentElement;
      }
      const text = element.textContent || '';
      const x = (box.left-base.left)*width/base.width, y = (box.top-base.top)*height/base.height;
      const w = box.width*width/base.width, h = box.height*height/base.height;
      if (opacity >= .95 && w > 0 && h > 0 && (x < -1 || y < -1 || x+w > width+1 || y+h > height+1)) errors.push(`Readable text outside frame: ${index}:${text}`);
      return {text, x, y, w, h, opacity};
    });
    const fontsLoaded = fonts.every(name => document.fonts.check(`16px "${name}"`));
    if (!fontsLoaded) errors.push('Local fonts not loaded');
    console.log('PORTRAIT_LAYOUT:'+JSON.stringify({frame,width,height,texts,errors,fontsLoaded}));
  }, [frame, width, height]);
  return null;
};
const Wrap: React.FC<{children: React.ReactNode}> = ({children}) => <FontGate>
  <AbsoluteFill data-film-root style={{overflow:'hidden'}}>
    <div style={{position:'absolute',left:0,top:0,width:720,height:1280,transform:'scale(1.5)',transformOrigin:'left top'}}>{children}</div>
    <LayoutProbe/>
  </AbsoluteFill>
</FontGate>;
const BerryFilm: React.FC = () => <Wrap><BerryCone/></Wrap>;
const CoffeeFilm: React.FC = () => <Wrap><CoffeeWake/></Wrap>;
const CameraFilm: React.FC = () => <Wrap><HappyCamera/></Wrap>;
const RocketFilm: React.FC = () => <Wrap><PocketRocket/></Wrap>;
export const PortraitRoot: React.FC = () => <>
  {([['BerryCone',BerryFilm],['CoffeeWake',CoffeeFilm],['HappyCamera',CameraFilm],['PocketRocket',RocketFilm]] as const).map(([id,component]) =>
    <Composition key={id} id={id} component={component} durationInFrames={480} fps={30} width={1080} height={1920}/>
  )}
</>;

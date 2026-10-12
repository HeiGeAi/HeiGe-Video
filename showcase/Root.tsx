import React, {useEffect, useLayoutEffect, useState} from 'react';
import {AbsoluteFill, Composition, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Citrus} from './scenes/Citrus';
import {PaperFlight} from './scenes/PaperFlight';
import {MineralBloom} from './scenes/MineralBloom';

const fonts = ['CandyDisplay', 'SerifDisplay', 'VideoSans'];
const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [handle] = useState(() => delayRender('Load local showcase fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const faces = fonts.map(name => new FontFace(name, `url(${staticFile(`fonts/${name}.woff`)})`));
    Promise.all(faces.map(async face => {
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
    if (!fonts.every(name => document.fonts.check(`16px "${name}"`))) errors.push('Local fonts not loaded');
    console.log('SHOWCASE_LAYOUT:'+JSON.stringify({frame,width,height,texts,errors,fontsLoaded:errors.every(x=>x!=='Local fonts not loaded')}));
  }, [frame, width, height]);
  return null;
};
const Wrap: React.FC<{children: React.ReactNode}> = ({children}) => <FontGate><AbsoluteFill data-film-root style={{overflow:'hidden'}}>{children}<LayoutProbe/></AbsoluteFill></FontGate>;
const CitrusFilm: React.FC<{portrait: boolean}> = props => <Wrap><Citrus {...props}/></Wrap>;
const PaperFilm: React.FC<{portrait: boolean}> = props => <Wrap><PaperFlight {...props}/></Wrap>;
const MineralFilm: React.FC<{portrait: boolean}> = props => <Wrap><MineralBloom {...props}/></Wrap>;

export const ShowcaseRoot: React.FC = () => <>
  {([['Citrus', CitrusFilm], ['PaperFlight', PaperFilm], ['MineralBloom', MineralFilm]] as const).flatMap(([id, component]) =>
    [false, true].map(portrait => <Composition key={`${id}-${portrait}`} id={`${id}${portrait ? 'Portrait' : 'Horizontal'}`}
      component={component} defaultProps={{portrait}} durationInFrames={480} fps={30}
      width={portrait ? 720 : 1280} height={portrait ? 1280 : 720}/>))}
</>;

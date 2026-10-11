import React from 'react';
import type {CSSProperties, ReactNode} from 'react';
import {fitFont, layoutFor, THEMES} from './theme';
import type {CompiledPlan, ThemeName} from './types';

export const Text: React.FC<{children: string; className?: string; style?: CSSProperties; id?: string}> = ({children, className = '', style, id}) => (
  <div className={`heige-text ${className}`} data-heige-text={children} data-heige-text-id={id} style={style}>{children}</div>
);

export const Block: React.FC<{id: string; children: ReactNode; className?: string; style?: CSSProperties}> = ({id, children, className = '', style}) => (
  <div data-heige-block={id} className={className} style={style}>{children}</div>
);

export const Grid: React.FC<{plan: CompiledPlan}> = ({plan}) => {
  const cols = plan.project.ratio === '9:16' ? 4 : plan.project.ratio === '1:1' ? 8 : 12;
  return <div className={`heige-grid heige-grid-${plan.project.theme}`} aria-hidden="true">
    {Array.from({length: cols - 1}, (_, i) => <div key={i} className="heige-grid-rule" style={{left: `${(i + 1) * 100 / cols}%`}} />)}
    <div className="heige-baseline" style={{top: '14%'}} /><div className="heige-baseline" style={{top: '83%'}} />
  </div>;
};

export const Spotlight: React.FC<{theme: ThemeName; x?: number; y?: number}> = ({theme, x = 68, y = 45}) => theme === 'nocturne' ? (
  <div aria-hidden="true" style={{position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1}}>
    <div className="heige-light-shaft" style={{left: `${x}%`, top: `${y}%`}} />
  </div>
) : null;

export const Rail: React.FC<{plan: CompiledPlan; index: number}> = ({plan, index}) => {
  const layout = layoutFor(plan.project.ratio);
  return <Block id="scene-rail" className="heige-rail" style={{fontSize: layout.rail}}>
    <Text id="brand" className="heige-brand">{plan.project.brand || 'HeiGe Video'}</Text>
    <Text id="scene-index" className="heige-tabular">{`${String(index + 1).padStart(2, '0')} / ${String(plan.timeline.length).padStart(2, '0')}`}</Text>
  </Block>;
};

export const Header: React.FC<{title: string; body?: string; plan: CompiledPlan; opacity?: number; transform?: string}> = ({title, body, plan, opacity = 1, transform}) => {
  const layout = layoutFor(plan.project.ratio);
  const width = plan.width - 2 * layout.pad;
  return <Block id="scene-header" className="heige-header" style={{opacity, transform, marginBottom: layout.gap}}>
    <Text id="shot-title" className="heige-title" style={{fontSize: fitFont(title, width, layout.title, 2, 32), fontWeight: THEMES[plan.project.theme].weight}}>{title}</Text>
    {body ? <Text id="shot-body" className="heige-body" style={{fontSize: fitFont(body, width, layout.body, 3, 20), marginTop: 16}}>{body}</Text> : null}
  </Block>;
};

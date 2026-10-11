import React from 'react';
import {sampleContinuity} from '../lib/continuous-motion.mjs';
import type {ObjectState} from '../lib/continuous-motion.mjs';
import {Grid, Text} from './primitives';
import {THEMES, layoutFor} from './theme';
import type {CompiledPlan, ContinuityColor} from './types';
import {inspectLayout} from './inspect';

type StageProps = {plan: CompiledPlan; time: number; fontFamily: string};
type ProbeContext = {frame: number; fps: number; time: number; width: number; height: number};

function inViewport(object: ObjectState, width: number, height: number) {
  const rect = object.projectedRect;
  return object.opacity >= .015 && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height;
}

function Content({object, readingVisible, ink}: {object: ObjectState; readingVisible: boolean; ink: string}) {
  const textStyle: React.CSSProperties = {
    color: ink, margin: 0, lineHeight: 1.55, paddingTop: 4, paddingBottom: 8,
    whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', flexShrink: 0,
  };
  // Labels leave the reading layer while a card is partially out of view. The
  // object node itself remains mounted and is measured by the world inspector.
  const marker = (text: string, id: string) => ({'data-heige-text': readingVisible ? text : undefined, 'data-heige-text-id': id});
  return <div data-heige-object-content style={{visibility: readingVisible ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', gap: 8, width: '100%', minHeight: 0}}>
    {object.text ? <div {...marker(object.text, `${object.id}:text`)} style={{...textStyle, fontSize: object.kind === 'text' ? 48 : 32, fontWeight: object.kind === 'text' || object.kind === 'ui' ? 700 : 500}}>{object.text}</div> : null}
    {object.rows?.map((row, index) => <div key={`${object.id}:row:${index}`} {...marker(row, `${object.id}:row:${index}`)} style={{...textStyle, fontSize: 28, fontWeight: 400}}>{row}</div>)}
  </div>;
}

export const ContinuousStage: React.FC<StageProps> = ({plan, time, fontFamily}) => {
  if (!plan.project.continuity) throw new Error('ContinuousStage needs a compiled continuity world');
  const state = sampleContinuity(plan.project.continuity, time, plan.width, plan.height);
  const theme = THEMES[plan.project.theme];
  const layout = layoutFor(plan.project.ratio);
  const colors: Record<ContinuityColor, string> = {paper: theme.surface, ink: theme.ink, muted: theme.muted, accent: theme.primary, line: theme.hairline, secondary: theme.subtle};
  const sourceIds = [...new Set(plan.project.continuity.objects.flatMap(object => object.claims?.map(claim => claim.factId) || []))];
  const keyObject = state.objects.find(object => object.color === 'accent') || state.objects[0];
  return <div data-heige-continuous-viewport style={{position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: `"${fontFamily.replace(/["\\]/g, '')}", sans-serif`, background: theme.canvas}}>
    <Grid plan={plan} />
    <div data-heige-continuous-camera style={{position: 'absolute', left: 0, top: 0, width: 1280, height: 720, transformOrigin: '0 0', transform: `matrix(${state.camera.matrix.join(',')})`}}>
      {plan.project.theme === 'nocturne' && keyObject ? <div aria-hidden="true" style={{position: 'absolute', left: keyObject.x + keyObject.w / 2 - 170, top: keyObject.y - 250, width: 340, height: 700, transform: 'rotate(-22deg)', transformOrigin: '50% 0', background: `radial-gradient(ellipse at 50% 40%, ${theme.glow}30, transparent 68%)`, pointerEvents: 'none'}} /> : null}
      {state.objects.map(object => {
        const color = colors[object.color || 'ink'];
        const panel = object.kind === 'surface' || object.kind === 'ui';
        return <div key={object.id} data-heige-object-id={object.id} data-heige-semantic-identity={object.semanticIdentity} data-heige-object-kind={object.kind} style={{
          position: 'absolute', left: object.x, top: object.y, width: object.w, height: object.h,
          opacity: object.opacity, transform: `rotate(${object.rotation}deg)`, transformOrigin: '50% 50%',
          boxSizing: 'border-box', borderRadius: object.kind === 'dot' ? '50%' : object.radius,
          background: panel ? theme.surface : object.kind === 'dot' || object.kind === 'line' ? color : 'transparent',
          border: panel ? `1px solid ${theme.hairline}` : 'none',
          borderTop: panel && object.color === 'accent' ? `3px solid ${theme.primary}` : undefined,
          padding: panel ? 24 : 0, overflow: 'visible',
        }}>
          <Content object={object} readingVisible={inViewport(object, plan.width, plan.height)} ink={object.color === 'accent' ? theme.primary : theme.ink} />
        </div>;
      })}
    </div>
    {plan.project.demoData ? <Text id="continuous-demo-disclosure" style={{position: 'absolute', left: layout.pad, right: layout.pad, top: 18, fontSize: 18, lineHeight: 1.55, paddingBottom: 8, color: theme.muted}}>{'教学示例数据　不代表真实业务'}</Text> : null}
    {sourceIds.length ? <Text id="continuous-sources" style={{position: 'absolute', left: layout.pad, right: layout.pad, bottom: layout.bottom + 12, fontSize: 18, lineHeight: 1.55, paddingBottom: 8, color: theme.muted}}>{`来源 ${sourceIds.join(' · ')}`}</Text> : null}
  </div>;
};

function effectiveOpacity(node: Element, viewport: Element) {
  let opacity = 1;
  let current: Element | null = node;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.visibility === 'hidden' || style.display === 'none') return 0;
    opacity *= Number(style.opacity);
    if (current === viewport) break;
    current = current.parentElement;
  }
  return opacity;
}

// This collector reads the committed DOM. It never reports authored x/y or
// substitutes the sampler's projectedRect for the measured browser bounds.
export function probeContinuousStage(root: HTMLElement, context: ProbeContext) {
  const viewport = root.matches('[data-heige-continuous-viewport]') ? root : root.querySelector<HTMLElement>('[data-heige-continuous-viewport]');
  if (!viewport) throw new Error('Committed continuous viewport is missing');
  const camera = viewport.querySelector<HTMLElement>('[data-heige-continuous-camera]');
  if (!camera) throw new Error('Committed continuous camera is missing');
  const viewportRect = viewport.getBoundingClientRect();
  if (viewportRect.width <= 0 || viewportRect.height <= 0) throw new Error('Continuous viewport has no measured area');
  const sx = context.width / viewportRect.width, sy = context.height / viewportRect.height;
  const computedMatrix = new DOMMatrixReadOnly(window.getComputedStyle(camera).transform);
  const matrix = [computedMatrix.a, computedMatrix.b, computedMatrix.c, computedMatrix.d, computedMatrix.e, computedMatrix.f];
  if (matrix.some(value => !Number.isFinite(value))) throw new Error('Browser camera matrix is nonfinite');
  const errors: {kind: string; id: string; value?: number}[] = [];
  const objects = Array.from(viewport.querySelectorAll<HTMLElement>('[data-heige-object-id]')).map(node => {
    const bounds = node.getBoundingClientRect();
    const opacity = effectiveOpacity(node, viewport);
    const rect = {x: (bounds.left - viewportRect.left) * sx, y: (bounds.top - viewportRect.top) * sy, width: bounds.width * sx, height: bounds.height * sy};
    const left = Math.max(bounds.left, viewportRect.left), right = Math.min(bounds.right, viewportRect.right);
    const top = Math.max(bounds.top, viewportRect.top), bottom = Math.min(bounds.bottom, viewportRect.bottom);
    const visibleArea = Math.max(0, right - left) * Math.max(0, bottom - top);
    const viewportVisibleRatio = bounds.width * bounds.height > 0 ? visibleArea / (bounds.width * bounds.height) : 0;
    let testedPoints = 0, visiblePoints = 0;
    if (visibleArea > 0 && opacity > 0) {
      for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
        const x = left + (col + .5) / 5 * (right - left), y = top + (row + .5) / 5 * (bottom - top);
        testedPoints++;
        const layers = document.elementsFromPoint(x, y);
        // Ignore only fully transparent/hidden elements. A visible foreground
        // layer or HUD is a real obstruction, including another object.
        const first = layers.find(layer => effectiveOpacity(layer, viewport) >= .015);
        if (first && (first === node || node.contains(first))) visiblePoints++;
      }
    }
    const content = node.querySelector<HTMLElement>('[data-heige-object-content]');
    const visibleText = content && effectiveOpacity(content, viewport) >= .015 ? content.textContent || '' : '';
    if (visibleText && viewportVisibleRatio > 0) {
      if (node.scrollWidth > node.clientWidth + 2) errors.push({kind: 'world-content-width-overflow', id: node.dataset.heigeObjectId || '', value: node.scrollWidth - node.clientWidth});
      if (node.scrollHeight > node.clientHeight + 2) errors.push({kind: 'world-content-height-overflow', id: node.dataset.heigeObjectId || '', value: node.scrollHeight - node.clientHeight});
      for (const textNode of Array.from(node.querySelectorAll<HTMLElement>('[data-heige-text]'))) {
        const projectedFontSize = parseFloat(window.getComputedStyle(textNode).fontSize) * Math.hypot(matrix[0], matrix[1]);
        if (projectedFontSize < 24) errors.push({kind: 'world-projected-text-too-small', id: textNode.dataset.heigeTextId || '', value: projectedFontSize});
      }
    }
    return {
      id: node.dataset.heigeObjectId || '', semanticIdentity: node.dataset.heigeSemanticIdentity || '',
      kind: node.dataset.heigeObjectKind || '', present: node.isConnected, rect, opacity, viewportVisibleRatio,
      paintVisibleRatio: testedPoints ? visiblePoints / testedPoints : 0,
      occlusion: {testedPoints, visiblePoints},
      visualIdentity: `${node.dataset.heigeObjectKind || ''}\n${visibleText}`,
      actualText: node.textContent || '',
      contentOverflow: {width: Math.max(0, node.scrollWidth - node.clientWidth), height: Math.max(0, node.scrollHeight - node.clientHeight)},
    };
  });
  return {
    source: 'heige-continuous-dom-v1', frame: context.frame, fps: context.fps, pts: context.time,
    width: context.width, height: context.height, camera: {matrix}, objects, errors:[...errors,...inspectLayout(root,context.frame,context.width,context.height).errors],
    measurement: 'Committed DOM bounds, computed camera matrix and ancestor opacity; 5x5 hit-testing approximates occlusion, not a precise painted-pixel mask.',
  };
}

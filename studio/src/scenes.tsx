import React from 'react';
import {Img, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {at, ease, easeOut, entrance, formatValue, insertionPositions} from './motion';
import {Block, Grid, Header, Rail, Spotlight, Text} from './primitives';
import {fitFont, layoutFor, THEMES} from './theme';
import type {CompiledPlan, Datum, FilmProps, TimelineShot} from './types';

type SceneProps = Pick<FilmProps, 'plan' | 'assetUrls'> & {shot: TimelineShot; index: number};
type ContentProps = SceneProps & {frame: number};

export function assertLocalAssetUrl(url: string, allowFontData = false) {
  if (allowFontData && /^data:(?:font\/|application\/font|application\/octet-stream)/u.test(url)) return url;
  if (!url || /^(?:\/\/|[a-z][a-z\d+.-]*:)/iu.test(url)) {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
      throw new Error('Controlled renderer only accepts served local asset URLs');
    }
  }
  return /^[a-z][a-z\d+.-]*:/iu.test(url) ? url : staticFile(url.replace(/^\//u, ''));
}

const SignalDivider: React.FC<{plan: CompiledPlan; frame: number; height?: string}> = ({plan, frame, height = '84%'}) => {
  const reveal = easeOut(at(frame, 0, plan.fps * 0.6));
  return <div className="heige-divider" aria-hidden="true" style={{right: plan.project.ratio === '9:16' ? '9%' : '24%', top: '8%', height, transform: `scaleY(${reveal})`, transformOrigin: 'top'}}>
    <div className="heige-divider-tick" />
  </div>;
};

const Hero: React.FC<ContentProps> = ({plan, shot, index, frame}) => {
  const layout = layoutFor(plan.project.ratio);
  const ending = shot.type === 'end';
  const statement = shot.type === 'statement';
  const heroWidth = layout.portrait ? '85%' : layout.square ? '78%' : '72%';
  const pixelWidth = (plan.width - 2 * layout.pad) * (layout.portrait ? 0.85 : layout.square ? 0.78 : 0.72);
  const fontSize = fitFont(shot.title, pixelWidth, statement ? layout.hero * .85 : layout.hero, layout.portrait ? 4 : 3, 42);
  const shift = ease(at(frame, plan.fps * .2, plan.fps * .9));
  return <Block id={`action-${shot.id}`} className="heige-stage heige-hero-stage" style={{justifyContent: ending ? 'flex-end' : 'center', paddingBottom: ending ? 40 : 0}}>
    <Spotlight theme={plan.project.theme} x={layout.portrait ? 42 : 38} y={ending ? 62 : 44} />
    <SignalDivider plan={plan} frame={frame} height={statement ? '62%' : '82%'} />
    <div className="heige-index heige-tabular" aria-hidden="true" style={{position: 'absolute', right: layout.portrait ? '11%' : '26%', top: '9%', fontSize: layout.portrait ? 60 : 98, opacity: .3}}>{String(index + 1).padStart(2, '0')}</div>
    <Block id="hero-meaning" style={{width: heroWidth, paddingBottom: 16, transform: `translateX(${(1 - shift) * -20}px)`, opacity: .75 + .25 * easeOut(at(frame, 0, plan.fps * .4))}}>
      <Text id="shot-title" className="heige-hero-title" style={{fontSize, fontWeight: THEMES[plan.project.theme].weight}}>{shot.title}</Text>
      {shot.body ? <Text id="shot-body" className="heige-hero-body" style={{marginTop: layout.portrait ? 40 : 32, fontSize: fitFont(shot.body, pixelWidth, layout.body, 4, 21), ...entrance(frame, plan.fps, .35)}}>{shot.body}</Text> : null}
    </Block>
    <div aria-hidden="true" style={{height: 3, width: heroWidth, background: THEMES[plan.project.theme].ink, marginTop: layout.portrait ? 40 : 32, transform: `scaleX(${shift})`, transformOrigin: 'left'}} />
  </Block>;
};

const Steps: React.FC<ContentProps> = ({plan, shot, frame}) => {
  const layout = layoutFor(plan.project.ratio);
  const items = shot.items as string[];
  const vertical = layout.portrait || layout.square;
  const count = items.length;
  const progress = ease(at(frame, plan.fps * .7, Math.min(shot.frames * .68, plan.fps * (1.2 + count * .6))));
  const active = Math.min(count - 1, Math.floor(progress * (count - 1) + .00001));
  const axisStart = vertical ? 10 : 7;
  const axisEnd = vertical ? 90 : 93;
  const position = axisStart + (axisEnd - axisStart) * progress;
  const numberSize = vertical ? 46 : 40;
  const verticalAxis = (numberSize / 2) / (plan.width - 2 * layout.pad) * 1000;
  return <Block id={`action-${shot.id}`} className="heige-stage" style={{paddingTop: 8}}>
    <Spotlight theme={plan.project.theme} x={vertical ? 26 : 88} y={vertical ? 86 : 26} />
    <svg aria-hidden="true" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
      <line x1={vertical ? verticalAxis : axisStart * 10} y1={vertical ? axisStart * 10 : 220} x2={vertical ? verticalAxis : axisEnd * 10} y2={vertical ? axisEnd * 10 : 220} stroke={THEMES[plan.project.theme].hairline} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1={vertical ? verticalAxis : axisStart * 10} y1={vertical ? axisStart * 10 : 220} x2={vertical ? verticalAxis : position * 10} y2={vertical ? position * 10 : 220} stroke={THEMES[plan.project.theme].ink} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
    {items.map((item, i) => {
      const anchor = axisStart + (axisEnd - axisStart) * i / (count - 1);
      const reached = progress >= i / (count - 1) - .0001;
      const settled = active === i;
      const estimatedWidth = vertical ? plan.width - 2 * layout.pad - 90 : (plan.width - 2 * layout.pad) / count - 18;
      return <Block id={`step-${shot.id}-${i}`} key={`${shot.id}-${i}`} style={vertical ? {position: 'absolute', left: 0, right: 0, top: `${anchor}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 32} : {position: 'absolute', left: `${i * 100 / count}%`, top: 0, width: `${100 / count}%`, height: '100%'}}>
        <div className="heige-step-number" aria-hidden="true" style={vertical ? {width: numberSize, height: numberSize, flexShrink: 0, color: settled ? THEMES[plan.project.theme].primary : THEMES[plan.project.theme].muted, borderColor: reached ? THEMES[plan.project.theme].ink : THEMES[plan.project.theme].hairline} : {position: 'absolute', left: `${(anchor - i * 100 / count) * count}%`, top: '22%', width: numberSize, height: numberSize, transform: 'translate(-50%, -50%)', color: settled ? THEMES[plan.project.theme].primary : THEMES[plan.project.theme].muted, borderColor: reached ? THEMES[plan.project.theme].ink : THEMES[plan.project.theme].hairline}}>{String(i + 1).padStart(2, '0')}</div>
        <Text id={`step-label-${i}`} className="heige-step-label" style={vertical ? {fontSize: fitFont(item, estimatedWidth, layout.data, 2, 22), flex: 1, color: reached ? THEMES[plan.project.theme].ink : THEMES[plan.project.theme].muted} : {position: 'absolute', left: 8, right: 8, top: '43%', fontSize: fitFont(item, estimatedWidth, layout.data, 4, 20), color: reached ? THEMES[plan.project.theme].ink : THEMES[plan.project.theme].muted}}>{item}</Text>
      </Block>;
    })}
    <div className="heige-step-cursor" aria-hidden="true" style={vertical ? {left: numberSize / 2 - 5, top: `${position}%`, transform: 'translateY(-50%)'} : {left: `${position}%`, top: '22%', transform: 'translate(-50%, -50%)'}} />
  </Block>;
};

const Compare: React.FC<ContentProps> = ({plan, shot, frame}) => {
  const layout = layoutFor(plan.project.ratio);
  const stacked = layout.portrait;
  const left = shot.left!;
  const right = shot.right!;
  const changed = right.items.map((item, i) => item !== left.items[i]);
  const firstDifference = changed.findIndex(Boolean);
  const focus = firstDifference < 0 ? right.items.length - 1 : firstDifference;
  const panelWidth = stacked ? plan.width - 2 * layout.pad : (plan.width - 2 * layout.pad) * .44;
  const labelSize = stacked ? 28 : layout.square ? 31 : 26;
  const rowSize = stacked ? 26 : layout.square ? 28 : 24;
  if (stacked) {
    return <Block id={`action-${shot.id}`} className="heige-stage" style={{display: 'flex', flexDirection: 'column', gap: 28}}>
      <Spotlight theme={plan.project.theme} x={58} y={78} />
      {[left, right].map((panel, side) => <Block id={`compare-${side}`} key={side} style={{flex: '0 0 auto'}}>
        <Text id={`compare-heading-${side}`} className="heige-compare-label" style={{fontSize: fitFont(panel.label, panelWidth, labelSize, 2, 23), marginBottom: 12}}>{panel.label}</Text>
        {panel.items.map((item, i) => {
          const reveal = side === 0 ? 1 : easeOut(at(frame, plan.fps * (.5 + i * .2), plan.fps * (1 + i * .2)));
          return <Block id={`compare-row-${side}-${i}`} className="heige-compare-row" key={`${side}-${i}`} style={{padding: '8px 0', ...(!side ? {} : {opacity: reveal, transform: `translateX(${(1 - reveal) * 20}px)`})}}>
            {side === 1 && i === focus ? <div className="heige-compare-signal" aria-hidden="true" /> : null}
            <Text id={`compare-item-${side}-${i}`} style={{fontSize: fitFont(item, panelWidth, rowSize, 2, 21), color: side === 1 && i === focus ? THEMES[plan.project.theme].primary : side === 0 ? THEMES[plan.project.theme].muted : THEMES[plan.project.theme].ink}}>{item}</Text>
          </Block>;
        })}
      </Block>)}
    </Block>;
  }
  return <Block id={`action-${shot.id}`} className="heige-stage">
    <Spotlight theme={plan.project.theme} x={stacked ? 44 : 78} y={stacked ? 74 : 56} />
    <div aria-hidden="true" style={stacked ? {position: 'absolute', left: 0, right: 0, height: 1, top: '47%', background: THEMES[plan.project.theme].hairline} : {position: 'absolute', width: 1, left: '50%', top: 0, bottom: 0, background: THEMES[plan.project.theme].hairline}} />
    {[left, right].map((panel, side) => <Block id={`compare-${side}`} key={side} className="heige-compare-panel" style={stacked ? {left: 0, width: '100%', top: side === 0 ? 0 : '53%'} : {left: side === 0 ? 0 : '56%', width: '44%', top: 0}}>
      <Text id={`compare-heading-${side}`} className="heige-compare-label" style={{fontSize: fitFont(panel.label, panelWidth, labelSize, 2, 23)}}>{panel.label}</Text>
      {panel.items.map((item, i) => {
        const reveal = side === 0 ? 1 : easeOut(at(frame, plan.fps * (.5 + i * .2), plan.fps * (1 + i * .2)));
        return <Block id={`compare-row-${side}-${i}`} className="heige-compare-row" key={`${side}-${i}`} style={{...(!side ? {} : {opacity: reveal, transform: `translateX(${(1 - reveal) * 20}px)`})}}>
          {side === 1 && i === focus ? <div className="heige-compare-signal" aria-hidden="true" /> : null}
          <Text id={`compare-item-${side}-${i}`} style={{fontSize: fitFont(item, panelWidth, rowSize, 2, 21), color: side === 1 && i === focus ? THEMES[plan.project.theme].primary : THEMES[plan.project.theme].ink}}>{item}</Text>
        </Block>;
      })}
    </Block>)}
  </Block>;
};

const Bars: React.FC<ContentProps> = ({plan, shot, frame}) => {
  const layout = layoutFor(plan.project.ratio);
  const rows = shot.data!;
  const maximum = Math.max(...rows.map(row => row.value));
  const focus = rows.findIndex(row => row.value === maximum);
  const labelWidth = layout.portrait ? '30%' : '25%';
  const labelPixels = (plan.width - 2 * layout.pad) * (layout.portrait ? .30 : .25) - 24;
  const grow = ease(at(frame, plan.fps * .35, Math.min(shot.frames * .6, plan.fps * 1.75)));
  return <Block id={`action-${shot.id}`} className="heige-stage" style={{display: 'flex', flexDirection: 'column'}}>
    <Block id="bars-plot" className="heige-stage">
      <Spotlight theme={plan.project.theme} x={82} y={(focus + .5) * 100 / rows.length} />
      {rows.map((row, i) => {
      const fraction = maximum > 0 ? row.value / maximum : 0;
      const width = fraction * 72;
      return <Block id={`bar-${row.id}`} className="heige-bar-row" key={row.id} style={{top: `${i * 100 / rows.length}%`, height: `${100 / rows.length}%`}}>
        <Text id={`bar-label-${row.id}`} className="heige-bar-label" style={{width: labelWidth, paddingRight: 24, fontSize: fitFont(row.label, labelPixels, layout.data, 2, 20)}}>{row.label}</Text>
        <div className="heige-bar-track" data-heige-block={`bar-scale-${row.id}`}>
          <div className="heige-bar-fill" data-heige-object-id={row.id} data-heige-value={row.value} aria-hidden="true" style={{width: `${width}%`, transform: `scaleX(${grow})`, background: i === focus ? THEMES[plan.project.theme].primary : THEMES[plan.project.theme].ink}} />
          <Text id={`bar-value-${row.id}`} className="heige-bar-value heige-tabular" style={{left: `calc(${width * grow}% + 16px)`, fontSize: layout.data + 5, color: i === focus ? THEMES[plan.project.theme].primary : THEMES[plan.project.theme].ink, opacity: easeOut(at(frame, 0, plan.fps * .4))}}>{formatValue(row.value)}</Text>
        </div>
      </Block>;
      })}
    </Block>
    {shot.unit ? <Text id="bar-unit" style={{flex: '0 0 auto', marginTop: 8, marginLeft: labelWidth, fontSize: layout.rail, color: THEMES[plan.project.theme].muted}}>{`单位：${shot.unit}　零基线`}</Text> : null}
  </Block>;
};

const Transform: React.FC<ContentProps> = ({plan, shot, frame}) => {
  const layout = layoutFor(plan.project.ratio);
  const items = shot.items as Datum[];
  const sorted = [...items].sort((a, b) => a.value - b.value || items.indexOf(a) - items.indexOf(b));
  const start = Math.min(plan.fps * .4, shot.frames * .1);
  const finish = Math.min(shot.frames * .60, start + plan.fps * 4);
  const positions = new Map(insertionPositions(items.map(item => item.id), sorted.map(item => item.id), at(frame, start, finish)).map(position => [position.id, position]));
  const middleIds = new Set([sorted[Math.floor((items.length - 1) / 2)].id, sorted[Math.floor(items.length / 2)].id]);
  const expanded = ease(at(frame, finish, shot.frames * .72));
  const stageWidth = plan.width - 2 * layout.pad - 40;
  const cardWidth = stageWidth * (.46 + .54 * expanded);
  const labelPixels = stageWidth * .46 * .88 - (layout.data + 4) * 2.4 - 24;
  const beamRank = [...middleIds].reduce((total, id) => total + positions.get(id)!.rank, 0) / middleIds.size;
  return <Block id={`action-${shot.id}`} className="heige-stage" style={{marginLeft: 16, marginRight: 24}}>
    <Spotlight theme={plan.project.theme} x={78} y={(beamRank + .5) * 100 / items.length} />
    {items.map(item => {
      const {rank, lane} = positions.get(item.id)!;
      const focus = middleIds.has(item.id);
      return <Block id={`object-${item.id}`} key={item.id} className="heige-sort-row" style={{top: `${rank * 100 / items.length}%`, height: `${100 / items.length}%`, width: cardWidth, transform: `translateX(${lane * stageWidth * .54}px)`, zIndex: lane > 0 ? 3 : focus ? 2 : 1}}>
        <span className="heige-sort-rank heige-tabular" aria-hidden="true" style={{visibility: frame >= finish ? 'visible' : 'hidden'}}>{String(Math.round(rank) + 1).padStart(2, '0')}</span>
        {focus ? <div className="heige-sort-signal" aria-hidden="true" /> : null}
        <Text id={`sort-label-${item.id}`} className="heige-sort-label" style={{fontSize: fitFont(item.label, labelPixels, layout.data, 2, 21)}}>{item.label}</Text>
        <div data-heige-object-id={item.id} data-heige-value={item.value} style={{display: 'contents'}}>
          <Text id={`sort-value-${item.id}`} className="heige-sort-value heige-tabular" style={{fontSize: layout.data + 4, color: focus ? THEMES[plan.project.theme].primary : THEMES[plan.project.theme].ink}}>{formatValue(item.value)}</Text>
        </div>
      </Block>;
    })}
  </Block>;
};

const Media: React.FC<ContentProps> = ({plan, shot, assetUrls}) => {
  const layout = layoutFor(plan.project.ratio);
  const asset = plan.project.assets?.find(candidate => candidate.id === shot.assetId);
  if (!asset || !shot.assetId || !assetUrls[shot.assetId]) throw new Error(`Missing compiled media asset: ${shot.assetId}`);
  const src = assertLocalAssetUrl(assetUrls[shot.assetId]);
  const label = asset.source === 'generated' ? '生成素材' : asset.source === 'screenshot' ? '界面截图' : asset.source === 'licensed' ? '授权素材' : '原创素材';
  const caption = shot.caption ? `${label}　${shot.caption}` : label;
  return <Block id={`action-${shot.id}`} className="heige-stage">
    <Block id={`media-${asset.id}`} className="heige-media-frame" style={{borderRadius: THEMES[plan.project.theme].radius}}>
      {asset.kind === 'video' ? <OffthreadVideo src={src} muted style={{display: 'block', width: '100%', height: '100%', objectFit: 'contain'}} /> : <Img src={src} style={{display: 'block', width: '100%', height: '100%', objectFit: 'contain'}} />}
    </Block>
    <Text id="media-caption" className="heige-media-caption" style={{fontSize: fitFont(caption, plan.width - 2 * layout.pad, layout.rail + 2, 2, 16)}}>{caption}</Text>
  </Block>;
};

const COMPONENTS = {steps: Steps, compare: Compare, bars: Bars, transform: Transform, media: Media, hook: Hero, statement: Hero, end: Hero};

export const Scene: React.FC<SceneProps> = (props) => {
  const {plan, shot, index} = props;
  const frame = useCurrentFrame();
  const layout = layoutFor(plan.project.ratio);
  if (shot.type === 'beat') throw new Error('beat requires the persistent continuous world');
  const Component = COMPONENTS[shot.type];
  const isHero = ['hook', 'statement', 'end'].includes(shot.type);
  if (!Component) throw new Error(`Unsupported shot type: ${shot.type}`);
  return <div className={`heige-scene heige-${plan.project.theme} heige-${plan.project.ratio.replace(':', '-')}`} data-heige-shot={shot.id} data-heige-local-frame={frame} style={{padding: `${layout.pad / 2}px ${layout.pad}px ${layout.bottom}px`, gap: 0}}>
    <Grid plan={plan} />
    <Rail plan={plan} index={index} />
    {plan.project.demoData ? <Text id="demo-disclosure" style={{fontSize: layout.rail - 2, color: THEMES[plan.project.theme].muted, marginBottom: 16}}>{'教学示例数据　不代表真实业务'}</Text> : null}
    {!isHero ? <Header title={shot.title} body={shot.body} plan={plan} {...entrance(frame, plan.fps)} /> : null}
    <Component {...props} frame={frame} />
    {shot.claims?.length ? <Block id="fact-evidence" className="heige-claims" style={{fontSize: layout.portrait ? 17 : 15}}>
      {shot.claims.map((claim, i) => <Text key={`${claim.factId}-${i}`} id={`claim-${claim.factId}`} className="heige-claim">{`${claim.text}〔来源 ${claim.factId}〕`}</Text>)}
    </Block> : null}
  </div>;
};

import React from 'react';
import {Composition} from 'remotion';
import {HeigeFilm} from './Film';
import type {CompiledPlan, FilmProps} from './types';

const defaultPlan: CompiledPlan = {
  project: {schemaVersion: 'heige-video/4', title: '让变化清楚可见', mode: 'explainer', ratio: '16:9', theme: 'ledger', draft: true, brand: 'HeiGe Video', shots: [{id: 'preview', type: 'hook', title: '让变化清楚可见', body: '导入已验证的项目 JSON，预览完整的内容与动作', duration: 5}]},
  timeline: [{id: 'preview', type: 'hook', title: '让变化清楚可见', body: '导入已验证的项目 JSON，预览完整的内容与动作', from: 0, frames: 150, start: 0, end: 5}],
  durationInFrames: 150, duration: 5, width: 1280, height: 720, fps: 30, issues: {errors: [], warnings: []}, previewOnly: true,
};

const defaultProps: FilmProps = {plan: defaultPlan, assetUrls: {}, captions: [], fontFamily: 'Arial', inspect: false};

export const RemotionRoot: React.FC = () => <Composition
  id="HeigeFilm"
  component={HeigeFilm}
  defaultProps={defaultProps}
  durationInFrames={defaultPlan.durationInFrames}
  fps={defaultPlan.fps}
  width={defaultPlan.width}
  height={defaultPlan.height}
  calculateMetadata={({props}: {props: FilmProps}) => ({
    durationInFrames: props.plan.durationInFrames,
    fps: props.plan.fps,
    width: props.plan.width,
    height: props.plan.height,
  })}
/>;

export type Ratio = '16:9' | '9:16' | '1:1';
export type ThemeName = 'ledger' | 'nocturne' | 'forge';
export type ShotType = 'hook' | 'statement' | 'steps' | 'compare' | 'bars' | 'transform' | 'media' | 'end' | 'beat';

export type Claim = {text: string; factId: string; quote: string};
export type Datum = {id: string; label: string; value: number};
export type Asset = {
  id: string;
  path: string;
  kind: 'image' | 'video' | 'audio';
  source: 'original' | 'licensed' | 'screenshot' | 'generated';
  rights: string;
};

export type Shot = {
  id: string;
  type: ShotType;
  title: string;
  body?: string;
  duration?: number;
  start?: number;
  end?: number;
  claims?: Claim[];
  intentionalHold?: boolean;
  items?: string[] | Datum[];
  left?: {label: string; items: string[]};
  right?: {label: string; items: string[]};
  data?: Datum[];
  unit?: string;
  operation?: 'sort';
  assetId?: string;
  caption?: string;
};

export type TimelineShot = Shot & {from: number; frames: number; start: number; end: number};
export type ContinuityKind = 'surface' | 'text' | 'dot' | 'line' | 'ui' | 'image';
export type ContinuityColor = 'paper' | 'ink' | 'muted' | 'accent' | 'line' | 'secondary' | 'on-accent' | 'canvas' | 'heat';
export type SegmentEasing = 'linear' | 'ease-out-cubic' | 'ease-in-out-cubic' | 'ease-out-expo' | 'back-out';
export type ObjectKeyframe = {
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  rotation: number;
  radius: number;
  easing?: SegmentEasing;
};
export type CameraKeyframe = {at: number; x: number; y: number; zoom: number; rotation: number; easing?: SegmentEasing};
export type ContinuousObject = {
  id: string;
  semanticIdentity: string;
  kind: ContinuityKind;
  text?: string;
  rows?: string[];
  assetId?: string;
  color?: ContinuityColor;
  claims?: Claim[];
  typography?: {size?: number; weight?: 400|500|600|700|800|900; tracking?: number; align?: 'left'|'center'|'right'; lineHeight?: number};
  appearance?: {fill?: ContinuityColor|'transparent'; stroke?: ContinuityColor; strokeWidth?: number; shadow?: 'none'|'stamp'; pattern?: 'none'|'film-perforation'|'stripe'|'waveform'};
  keyframes: ObjectKeyframe[];
};
export type ContinuityBoundary = {fromShot: string; toShot: string; carrier: string; cause: string; outcome: string};
export type ContinuitySound = {id: string; at: number; objectId: string; type: 'tick' | 'whoosh' | 'impact'; volume: number};
export type Continuity = {
  objects: ContinuousObject[];
  camera: CameraKeyframe[];
  boundaries: ContinuityBoundary[];
  soundEvents?: ContinuitySound[];
  blur?: {samples: 1 | 3; shutterAngle: 180};
  musicScore?: {style: 'forge-breakbeat'; bpm: 128; volume: number};
};
export type Project = {
  schemaVersion: 'heige-video/4';
  title: string;
  mode: 'promo' | 'explainer' | 'lesson' | 'talk';
  ratio: Ratio;
  theme: ThemeName;
  fps?: 24 | 30;
  seed?: number;
  draft?: boolean;
  demoData?: boolean;
  brand?: string;
  facts?: {id: string; text: string; source: string}[];
  assets?: Asset[];
  shots: Shot[];
  audio?: {assetId: string; kind: 'recording' | 'synthetic' | 'mock'; subtitles?: string};
  music?: {assetId: string; volume?: number};
  continuity?: Continuity;
};

export type CompiledPlan = {
  project: Project;
  timeline: TimelineShot[];
  durationInFrames: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  issues: {errors: {path: string; message: string}[]; warnings: {path: string; message: string}[]};
  previewOnly: boolean;
};

export type CaptionCue = {start: number; end: number; text: string};
export type FilmProps = {
  plan: CompiledPlan;
  assetUrls: Record<string, string>;
  captions: CaptionCue[];
  fontFamily: string;
  inspect?: boolean;
  renderSampling?: {samples: 1 | 3; shutterAngle: 180};
};

export type Ratio = '16:9' | '9:16' | '1:1';
export type ThemeName = 'ledger' | 'nocturne';
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
export type ContinuityKind = 'surface' | 'text' | 'dot' | 'line' | 'ui';
export type ContinuityColor = 'paper' | 'ink' | 'muted' | 'accent' | 'line' | 'secondary';
export type ObjectKeyframe = {
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  rotation: number;
  radius: number;
};
export type CameraKeyframe = {at: number; x: number; y: number; zoom: number; rotation: number};
export type ContinuousObject = {
  id: string;
  semanticIdentity: string;
  kind: ContinuityKind;
  text?: string;
  rows?: string[];
  color?: ContinuityColor;
  claims?: Claim[];
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

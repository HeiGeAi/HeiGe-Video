export type Ratio = '16:9' | '9:16' | '1:1';
export type ThemeName = 'ledger' | 'nocturne';
export type ShotType = 'hook' | 'statement' | 'steps' | 'compare' | 'bars' | 'transform' | 'media' | 'end';

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
};

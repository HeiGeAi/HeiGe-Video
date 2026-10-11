import type {CSSProperties} from 'react';
import type {Ratio, ThemeName} from './types';

// Original adaptations of HeiGe-Design's helvetic-ledger and nocturne-teal.
// Only the local, audited face is loaded. Weight variants are browser synthesis.
export const THEMES = {
  ledger: {
    canvas: '#f5f5f3', surface: '#ffffff', ink: '#141414', muted: '#616160',
    hairline: '#dcdcd9', subtle: '#efeeeb', primary: '#d81f1a',
    onPrimary: '#ffffff', glow: '#d81f1a', weight: 800, radius: 0, xl: 48,
  },
  nocturne: {
    canvas: '#08090d', surface: '#0f1319', ink: '#e9edf3', muted: '#8a94a4',
    hairline: '#20262f', subtle: '#0f1319', primary: '#2dd4bf',
    onPrimary: '#031815', glow: '#5ff0dc', weight: 600, radius: 10, xl: 40,
  },
} as const;
export type Theme = (typeof THEMES)[ThemeName];

export function themeStyle(name: ThemeName, fontFamily: string): CSSProperties {
  const theme = THEMES[name];
  return {
    '--heige-canvas': theme.canvas,
    '--heige-surface': theme.surface,
    '--heige-ink': theme.ink,
    '--heige-muted': theme.muted,
    '--heige-hairline': theme.hairline,
    '--heige-subtle': theme.subtle,
    '--heige-primary': theme.primary,
    '--heige-on-primary': theme.onPrimary,
    '--heige-glow': theme.glow,
    '--heige-radius': `${theme.radius}px`,
    '--heige-font': `"${fontFamily.replace(/["\\]/g, '')}", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`,
    color: theme.ink,
    backgroundColor: theme.canvas,
    fontFamily: `"${fontFamily.replace(/["\\]/g, '')}", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`,
  } as CSSProperties;
}

export function layoutFor(ratio: Ratio) {
  if (ratio === '9:16') return {portrait: true, square: false, pad: 48, rail: 20, title: 54, hero: 76, body: 26, caption: 29, bottom: 132, gap: 32, data: 30};
  if (ratio === '1:1') return {portrait: false, square: true, pad: 64, rail: 20, title: 60, hero: 88, body: 28, caption: 31, bottom: 126, gap: 40, data: 32};
  return {portrait: false, square: false, pad: 64, rail: 17, title: 48, hero: 76, body: 23, caption: 27, bottom: 104, gap: 24, data: 25};
}

export function textUnits(text: string): number {
  return [...text].reduce((total, char) => total + (/\s/u.test(char) ? 0.32 : /[\u0000-\u007f]/u.test(char) ? 0.58 : 1), 0);
}

export function fitFont(text: string, width: number, maximum: number, lines: number, minimum = 22): number {
  // Conservative pre-layout sizing. Actual DOM geometry remains authoritative.
  return Math.max(minimum, Math.min(maximum, Math.floor((width * lines * 0.9) / Math.max(1, textUnits(text)))));
}

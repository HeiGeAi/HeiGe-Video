export const clamp = (value: number, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));
export const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
export const ease = (progress: number) => {
  const p = clamp(progress);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
};
export const easeOut = (progress: number) => 1 - Math.pow(1 - clamp(progress), 3);
export const at = (frame: number, start: number, end: number) => clamp((frame - start) / Math.max(1, end - start));

export function entrance(frame: number, fps: number, delay = 0) {
  const progress = easeOut(at(frame, delay * fps, (delay + 0.5) * fps));
  return {opacity: progress, transform: `translateY(${16 * (1 - progress)}px)`};
}

export function captionText(text: string) {
  const chars = [...text];
  return chars.map((char, index) => {
    if (!/\p{P}/u.test(char)) return char;
    const normalizedChar = char.normalize('NFKC');
    const previous = (chars[index - 1] || '').normalize('NFKC');
    const next = (chars[index + 1] || '').normalize('NFKC');
    // Numeric notation is factual content: 1.5 must never become 15.
    // Normalize only classification inputs. Display keeps the original glyphs.
    if (['.', ':', '/'].includes(normalizedChar) && /\d/u.test(previous) && /\d/u.test(next)) return char;
    if (normalizedChar === '-' && /\d/u.test(next)) return char;
    if (normalizedChar === '%') return char;
    return '';
  }).join('').replace(/[ \t]+/gu, ' ').trim();
}

export function formatValue(value: number) {
  return new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 6, useGrouping: false}).format(value);
}

export function insertionPositions(ids: string[], sortedIds: string[], progress: number) {
  const order = [...ids];
  const moves: {before: string[]; after: string[]; id: string; from: number; to: number}[] = [];
  sortedIds.forEach((id, to) => {
    const from = order.indexOf(id);
    if (from === to) return;
    const before = [...order];
    order.splice(from, 1);
    order.splice(to, 0, id);
    moves.push({before, after: [...order], id, from, to});
  });
  const scaled = clamp(progress) * moves.length;
  const step = Math.floor(scaled);
  const move = moves[step];
  if (!move) return ids.map(id => ({id, rank: order.indexOf(id), lane: 0}));
  const phase = scaled - step;
  // A single card first exits to a separate lane. Only then can the vacated
  // column shift one slot; the card returns after its destination is empty.
  const exiting = ease(clamp(phase / .22));
  const shifting = ease(clamp((phase - .22) / .56));
  const returning = ease(clamp((phase - .78) / .22));
  return ids.map(id => {
    const before = move.before.indexOf(id);
    const after = move.after.indexOf(id);
    return id === move.id
      ? {id, rank: lerp(move.from, move.to, shifting), lane: phase < .22 ? exiting : 1 - returning}
      : {id, rank: lerp(before, after, shifting), lane: 0};
  });
}

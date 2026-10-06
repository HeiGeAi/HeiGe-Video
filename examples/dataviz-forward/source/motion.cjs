'use strict';
// Original tiny, random-access motion helpers. No clocks or retained scene state.
// All time values are source seconds. Re-evaluate from absolute time after seeks.
const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
const lerp = (a, b, p) => a + (b - a) * p;
const linear = p => clamp(p);
const smoothstep = p => { p = clamp(p); return p * p * (3 - 2 * p); };
const easeOutCubic = p => 1 - (1 - clamp(p)) ** 3;
const easeInOutCubic = p => { p = clamp(p); return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2; };
function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(`${name} must be finite`);
  return value;
}
function createCues(definitions) {
  // {cueId: [start,end]} or {cueId: {start,end,ease}}. Interval is [start,end).
  const cues = Object.fromEntries(Object.entries(definitions).map(([id, value]) => {
    const { start, end, ease = linear } = Array.isArray(value) ? { start: value[0], end: value[1] } : value;
    finite(start, 'cue start'); finite(end, 'cue end');
    if (start < 0 || end <= start || typeof ease !== 'function') throw Error(`Invalid cue: ${id}`);
    return [id, Object.freeze({ start, end, ease })];
  }));
  return Object.freeze({
    definitions: Object.freeze(cues),
    at(id, t) {
      const cue = Object.hasOwn(cues, id) ? cues[id] : null;
      if (!cue) throw Error(`Unknown cue: ${id}`);
      finite(t, 'cue time');
      const progress = clamp((t - cue.start) / (cue.end - cue.start));
      return Object.freeze({ id, start: cue.start, end: cue.end, elapsed: t - cue.start,
        progress, eased: cue.ease(progress), active: t >= cue.start && t < cue.end,
        started: t >= cue.start, finished: t >= cue.end });
    },
  });
}
function spring(t, { from = 0, to = 1, frequencyHz = 2, dampingRatio = 0.7, velocity = 0 } = {}) {
  // Analytic damped oscillator; velocity is the initial units/second derivative.
  [t, from, to, frequencyHz, dampingRatio, velocity].forEach((v, i) => finite(v, `spring parameter ${i}`));
  if (frequencyHz <= 0 || dampingRatio < 0) throw Error('spring frequency must be positive and damping nonnegative');
  if (t <= 0) return from;
  const w = 2 * Math.PI * frequencyHz, z = dampingRatio, y = from - to;
  if (Math.abs(z - 1) < 1e-7) return to + (y + (velocity + w * y) * t) * Math.exp(-w * t);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    return to + Math.exp(-z * w * t) * (y * Math.cos(wd * t) + (velocity + z * w * y) / wd * Math.sin(wd * t));
  }
  const q = Math.sqrt(z * z - 1), r1 = -w / (z + q), r2 = -w * (z + q);
  const a = (velocity - r2 * y) / (r1 - r2), b = y - a;
  return to + a * Math.exp(r1 * t) + b * Math.exp(r2 * t);
}
function cameraMatrix({ x = 0, y = 0, zoom = 1, rotation = 0 } = {}, { width, height }) {
  [x, y, zoom, rotation, width, height].forEach((v, i) => finite(v, `camera parameter ${i}`));
  if (zoom <= 0 || width <= 0 || height <= 0) throw Error('Camera zoom and viewport dimensions must be positive');
  const a = zoom * Math.cos(rotation), b = -zoom * Math.sin(rotation), c = -b, d = a;
  return [a, b, c, d, width / 2 - a * x - c * y, height / 2 - b * x - d * y];
}
function worldToScreen(point, camera, viewport) {
  const [a, b, c, d, e, f] = cameraMatrix(camera, viewport);
  return { x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f };
}
function applyCamera(ctx, camera, viewport) {
  // Caller brackets world drawing in ctx.save()/ctx.restore(). UI stays outside.
  ctx.transform(...cameraMatrix(camera, viewport));
}
function seededRandom(seed) {
  finite(seed, 'random seed');
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function noiseAt(seed, key) {
  // Stable object/material noise independent of call order and frame number.
  let hash = finite(seed, 'noise seed') | 0;
  for (const char of String(key)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return seededRandom(hash)();
}
function trimPolyline(points, progress) {
  // Geometry reveal: advance the stroke front by length, not whole-stroke alpha.
  finite(progress, 'stroke progress');
  if (!Array.isArray(points) || !points.length) return [];
  points.forEach(p => { finite(p.x, 'point x'); finite(p.y, 'point y'); });
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let remaining = lengths.reduce((a, b) => a + b, 0) * clamp(progress);
  const result = [{ ...points[0] }];
  for (let i = 0; i < lengths.length; i++) {
    const a = points[i], b = points[i + 1], length = lengths[i];
    if (remaining >= length) { result.push({ ...b }); remaining -= length; }
    else {
      const p = length ? remaining / length : 0;
      const tip = { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) };
      if (typeof a.pressure === 'number' && typeof b.pressure === 'number') tip.pressure = lerp(a.pressure, b.pressure, p);
      if (remaining > 0) result.push(tip);
      break;
    }
  }
  return result;
}
module.exports = { clamp, lerp, linear, smoothstep, easeOutCubic, easeInOutCubic,
  createCues, spring, cameraMatrix, worldToScreen, applyCamera, seededRandom, noiseAt, trimPolyline };

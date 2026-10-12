// Original, stateless world sampling shared by the renderer and verification.
// All positions are authored in a 1280 x 720 world. Output height defines the
// projection scale, so portrait/square cameras deliberately see a narrower view.
const OBJECT_FIELDS = ['x', 'y', 'w', 'h', 'opacity', 'rotation', 'radius'];
const CAMERA_FIELDS = ['x', 'y', 'zoom', 'rotation'];
const SPATIAL_FIELDS = new Set(['x', 'y', 'rotation']);
const SEGMENT_EASINGS = new Set(['linear', 'ease-out-cubic', 'ease-in-out-cubic', 'ease-out-expo', 'back-out']);
const finite = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
};

// Original fixed-parameter progress curves. Cubic timing follows the existing
// runtime's stateless polynomial helpers. Normalized exponential decay reaches
// both endpoints continuously; the back polynomial has a fixed ~10% overshoot.
export function easeSegment(progress, easing = 'linear') {
  finite(progress, 'segment progress');
  if (!SEGMENT_EASINGS.has(easing)) throw new TypeError(`Unknown segment easing: ${String(easing)}`);
  const p = Math.max(0, Math.min(1, progress));
  if (p === 0 || p === 1) return p;
  if (easing === 'linear') return p;
  if (easing === 'ease-out-cubic') return 1 - (1 - p) ** 3;
  if (easing === 'ease-in-out-cubic') return p < .5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
  if (easing === 'ease-out-expo') return -Math.expm1(-10 * Math.LN2 * p) / (1 - 2 ** -10);
  const back = 1.70158, q = p - 1;
  return 1 + (back + 1) * q ** 3 + back * q ** 2;
}

function sampleTrack(track, time, fields, name) {
  if (!Array.isArray(track) || track.length < 2) throw new TypeError(`${name} needs at least two complete keyframes`);
  for (let i = 0; i < track.length; i++) {
    const key = track[i];
    if (!key || typeof key !== 'object') throw new TypeError(`${name}[${i}] must be a keyframe`);
    finite(key.at, `${name}[${i}].at`);
    if (i && key.at <= track[i - 1].at) throw new RangeError(`${name} keyframe times must strictly increase`);
    for (const field of fields) finite(key[field], `${name}[${i}].${field}`);
    if (key.easing !== undefined && !SEGMENT_EASINGS.has(key.easing)) throw new TypeError(`${name}[${i}] has an unknown segment easing`);
  }
  const clampedTime = Math.max(track[0].at, Math.min(track.at(-1).at, time));
  let index = 0;
  while (index < track.length - 2 && clampedTime > track[index + 1].at) index++;
  const left = track[index], right = track[index + 1];
  const progress = (clampedTime - left.at) / (right.at - left.at);
  // Return the authored endpoint rather than a cancellation-prone lerp result.
  if (progress === 0 || progress === 1) return Object.fromEntries(fields.map(field => [field, (progress === 0 ? left : right)[field]]));
  const eased = easeSegment(progress, left.easing), bounded = Math.max(0, Math.min(1, eased));
  // Back timing may overshoot only spatial coordinates and rotation. Sizes,
  // opacity, corner radius and camera zoom stay between their legal endpoints.
  return Object.fromEntries(fields.map(field => {
    const p = SPATIAL_FIELDS.has(field) ? eased : bounded;
    return [field, p === 0 ? left[field] : p === 1 ? right[field] : left[field] + (right[field] - left[field]) * p];
  }));
}

export function cameraMatrix(camera, width, height) {
  finite(width, 'width'); finite(height, 'height');
  for (const field of CAMERA_FIELDS) finite(camera[field], `camera.${field}`);
  if (width <= 0 || height <= 0 || camera.zoom <= 0) throw new RangeError('Projection dimensions and camera zoom must be positive');
  const angle = camera.rotation * Math.PI / 180;
  const scale = height / 720 * camera.zoom;
  const a = scale * Math.cos(angle), b = -scale * Math.sin(angle);
  const c = scale * Math.sin(angle), d = scale * Math.cos(angle);
  return [a, b, c, d, width / 2 - a * camera.x - c * camera.y, height / 2 - b * camera.x - d * camera.y];
}

export function transformPoint(matrix, x, y) {
  if (!Array.isArray(matrix) || matrix.length !== 6 || matrix.some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new TypeError('A finite 2D matrix is required');
  finite(x, 'x'); finite(y, 'y');
  return {x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5]};
}

export function projectedObjectRect(object, matrix) {
  const cx = object.x + object.w / 2, cy = object.y + object.h / 2;
  const angle = object.rotation * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const points = [[object.x, object.y], [object.x + object.w, object.y], [object.x + object.w, object.y + object.h], [object.x, object.y + object.h]].map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    return transformPoint(matrix, cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
  });
  const xs = points.map(point => point.x), ys = points.map(point => point.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return {x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y};
}

export function sampleContinuity(continuity, time, width, height) {
  finite(time, 'time');
  if (!continuity || !Array.isArray(continuity.objects)) throw new TypeError('A continuity object list is required');
  const camera = sampleTrack(continuity.camera, time, CAMERA_FIELDS, 'camera');
  if (camera.zoom <= 0) throw new RangeError('Camera zoom must be positive');
  const matrix = cameraMatrix(camera, width, height);
  const ids = new Set();
  const objects = continuity.objects.map(object => {
    if (!object || typeof object.id !== 'string' || !object.id || ids.has(object.id)) throw new TypeError('Persistent object IDs must be nonempty and unique');
    ids.add(object.id);
    const state = sampleTrack(object.keyframes, time, OBJECT_FIELDS, `object ${object.id}`);
    if (state.w <= 0 || state.h <= 0 || state.opacity < 0 || state.opacity > 1 || state.radius < 0) throw new RangeError(`Object ${object.id} has invalid geometry or opacity`);
    return {id: object.id, semanticIdentity: object.semanticIdentity, kind: object.kind, text: object.text, rows: object.rows, color: object.color,
      ...(object.typography === undefined ? {} : {typography: object.typography}),
      ...(object.appearance === undefined ? {} : {appearance: object.appearance}),
      ...(object.assetId === undefined ? {} : {assetId: object.assetId}),
      ...state, projectedRect: projectedObjectRect(state, matrix)};
  });
  return {time, camera: {...camera, matrix}, objects};
}

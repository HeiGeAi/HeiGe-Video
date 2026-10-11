// Original, stateless world sampling shared by the renderer and verification.
// All positions are authored in a 1280 x 720 world. Output height defines the
// projection scale, so portrait/square cameras deliberately see a narrower view.
const OBJECT_FIELDS = ['x', 'y', 'w', 'h', 'opacity', 'rotation', 'radius'];
const CAMERA_FIELDS = ['x', 'y', 'zoom', 'rotation'];
const finite = (value, label) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
};

function sampleTrack(track, time, fields, name) {
  if (!Array.isArray(track) || track.length < 2) throw new TypeError(`${name} needs at least two complete keyframes`);
  for (let i = 0; i < track.length; i++) {
    const key = track[i];
    if (!key || typeof key !== 'object') throw new TypeError(`${name}[${i}] must be a keyframe`);
    finite(key.at, `${name}[${i}].at`);
    if (i && key.at <= track[i - 1].at) throw new RangeError(`${name} keyframe times must strictly increase`);
    for (const field of fields) finite(key[field], `${name}[${i}].${field}`);
  }
  const clampedTime = Math.max(track[0].at, Math.min(track.at(-1).at, time));
  let index = 0;
  while (index < track.length - 2 && clampedTime > track[index + 1].at) index++;
  const left = track[index], right = track[index + 1];
  const progress = (clampedTime - left.at) / (right.at - left.at);
  return Object.fromEntries(fields.map(field => [field, left[field] + (right[field] - left[field]) * progress]));
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
    return {id: object.id, semanticIdentity: object.semanticIdentity, kind: object.kind, text: object.text, rows: object.rows, color: object.color, ...state, projectedRect: projectedObjectRect(state, matrix)};
  });
  return {time, camera: {...camera, matrix}, objects};
}

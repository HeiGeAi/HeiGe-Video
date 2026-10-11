// Original HeiGe-Video measurements. No third-party oracle implementation is included.
export const CONTINUITY_PROBE_SOURCE = 'heige-continuous-dom-v1';
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const ratio = (value) => finite(value) && value >= 0 && value <= 1;
const hex = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const center = (object) => [object.rect.x + object.rect.width / 2, object.rect.y + object.rect.height / 2];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

/**
 * Receives renderer-owned actual DOM observations and separately decoded final pixels.
 * A complete report is a structural gate, not a semantic or perceptual quality score.
 * Pixel input: {videoSha256, frameCount, deltas}, one 0..255 grey MAD per frame, first=0.
 */
export function evaluateContinuity(plan, samples, {videoSha256, pixelReport} = {}) {
  const errors = [];
  const issue = (code, path, message, extra = {}) => errors.push({code, path, message, ...extra});
  const result = {
    active: Boolean(plan?.project?.continuity), passed: false, status: 'unknown', videoSha256: videoSha256 || null,
    coverage: {expectedFrames: plan?.durationInFrames || 0, measuredFrames: 0, validFrames: 0, complete: false, missingFrames: [], invalidFrames: [], duplicateFrames: []},
    boundaries: [], rhythm: {pixelMeasured: false}, soundEvents: [], visualIdentityChanges: [], errors,
    scope: {
      probe: CONTINUITY_PROBE_SOURCE, measured: 'actual DOM geometry, ancestor opacity and point-grid paint visibility',
      pixels: 'unverified', semantics: 'cause/outcome and perceptual identity require visual review',
      occlusion: 'point-grid approximation; sub-grid holes and masks may escape',
      audio: 'not measured by this oracle; source and mux audio checks are separate',
      trust: 'caller must collect probe in the controlled renderer and bind artifact/engine hashes; arbitrary JSON can forge observations',
    },
  };
  if (!result.active) { result.status = 'not-applicable'; return result; }
  const {width: W, height: H, fps, durationInFrames: N} = plan;
  if (![W, H, fps].every((v) => finite(v) && v > 0) || !Number.isInteger(N) || N < 1) {
    issue('INVALID_PLAN', 'plan', 'Finite positive dimensions/fps and an integer frame count are required.');
    result.status = 'fail'; return result;
  }
  if (!hex(videoSha256)) issue('VIDEO_HASH_REQUIRED', 'videoSha256', 'Final MP4 SHA256 is required.');
  const spec = plan.project.continuity;
  const definitions = Array.isArray(spec.objects) ? spec.objects : [];
  const declared = new Map();
  for (const object of definitions) {
    if (!object?.id || !object.semanticIdentity || declared.has(object.id)) issue('INVALID_OBJECT_IDENTITY', 'continuity.objects', 'Object IDs must be unique and have a semantic identity.');
    else declared.set(object.id, object);
  }
  if (!declared.size) issue('NO_OBJECTS', 'continuity.objects', 'Continuity requires persistent objects.');
  const frames = new Map(), invalidFrames = new Set();
  for (const sample of Array.isArray(samples) ? samples : []) {
    const path = `samples[${sample?.frame}]`;
    if (!Number.isInteger(sample?.frame) || sample.frame < 0 || sample.frame >= N) { issue('INVALID_FRAME', path, 'Frame must identify an encoded timeline frame.'); continue; }
    if (frames.has(sample.frame)) {
      result.coverage.duplicateFrames.push(sample.frame);
      if (JSON.stringify(frames.get(sample.frame)) !== JSON.stringify(sample)) { issue('CONFLICTING_FRAME', path, 'Repeated probe observations disagree.'); invalidFrames.add(sample.frame); }
      continue;
    }
    if (sample.source !== CONTINUITY_PROBE_SOURCE || sample.fps !== fps || !finite(sample.pts) || Math.abs(sample.pts - sample.frame / fps) > 1e-6) {
      issue('INVALID_PROBE', path, 'Probe source, fps and presentation time must match the controlled renderer.'); continue;
    }
    if (!Array.isArray(sample.camera?.matrix) || sample.camera.matrix.length !== 6 || !sample.camera.matrix.every(finite)) {
      issue('INVALID_CAMERA', path, 'Actual camera transform must be a finite 2D matrix.'); continue;
    }
    const frameErrorsBefore = errors.length;
    const m = sample.camera.matrix;
    if (Math.abs(m[0] * m[3] - m[1] * m[2]) < 1e-8) issue('INVALID_CAMERA', path, 'Actual camera matrix cannot collapse the world.');
    if (sample.width !== W || sample.height !== H) issue('PROBE_DIMENSION_MISMATCH', path, 'Probe dimensions must match the final composition.');
    if (!Array.isArray(sample.errors)) issue('PROBE_ERRORS_REQUIRED', path, 'Actual probe must explicitly report its measurement errors.');
    else if (sample.errors.length) issue('DOM_PROBE_ERROR', path, 'Actual DOM probe reported overflow or unreadable projected text.', {details: sample.errors});
    if (!Array.isArray(sample.objects)) { issue('INVALID_OBJECTS', path, 'Measured object observations are required.'); continue; }
    const objects = new Map();
    for (const object of sample.objects) {
      const opath = `${path}.objects[${object?.id}]`;
      const def = declared.get(object?.id);
      if (!def || objects.has(object.id)) { issue('UNDECLARED_OR_DUPLICATE_OBJECT', opath, 'Probe object must be declared exactly once.'); continue; }
      objects.set(object.id, object);
      if (object.semanticIdentity !== def.semanticIdentity || object.kind !== def.kind) issue('IDENTITY_CHANGED', opath, 'Measured object identity/kind changed.');
      if (object.present !== true) { issue('OBJECT_ABSENT', opath, 'Persistent object is absent from the DOM.'); continue; }
      const r = object.rect;
      if (!r || ![r.x, r.y, r.width, r.height].every(finite) || r.width <= 0 || r.height <= 0 || !ratio(object.opacity) || !ratio(object.viewportVisibleRatio) || !ratio(object.paintVisibleRatio)) {
        issue('INVALID_GEOMETRY', opath, 'Bounds, opacity and visibility must be finite measured values.'); continue;
      }
      const visibleArea = Math.max(0, Math.min(W, r.x + r.width) - Math.max(0, r.x)) * Math.max(0, Math.min(H, r.y + r.height) - Math.max(0, r.y));
      if (Math.abs(object.viewportVisibleRatio - visibleArea / (r.width * r.height)) > 0.025) issue('FORGED_VIEWPORT_VISIBILITY', opath, 'Claimed viewport visibility disagrees with actual bounds.');
      const oc = object.occlusion;
      if (!oc || !Number.isInteger(oc.testedPoints) || !Number.isInteger(oc.visiblePoints) || oc.testedPoints < 0 || oc.visiblePoints < 0 || oc.visiblePoints > oc.testedPoints || (oc.testedPoints === 0 ? object.paintVisibleRatio !== 0 : Math.abs(object.paintVisibleRatio - oc.visiblePoints / oc.testedPoints) > 0.025)) {
        issue('INVALID_PAINT_VISIBILITY', opath, 'Point-grid evidence must agree with paint visibility.');
      }
    }
    for (const id of declared.keys()) if (!objects.has(id)) issue('OBJECT_MISSING', path, 'Every persistent object requires an actual observation.', {objectId: id});
    frames.set(sample.frame, sample);
    if (errors.length !== frameErrorsBefore) invalidFrames.add(sample.frame);
  }
  result.coverage.measuredFrames = frames.size;
  for (let frame = 0; frame < N; frame++) if (!frames.has(frame)) result.coverage.missingFrames.push(frame);
  result.coverage.invalidFrames = [...invalidFrames].sort((a, b) => a - b);
  result.coverage.validFrames = frames.size - invalidFrames.size;
  result.coverage.complete = result.coverage.validFrames === N;
  if (!result.coverage.complete) issue('INCOMPLETE_COVERAGE', 'samples', 'Every encoded timeline frame requires a matching actual DOM probe.');
  const timeline = Array.isArray(plan.timeline) ? plan.timeline : [];
  const boundaries = Array.isArray(spec.boundaries) ? spec.boundaries : [];
  if (timeline.length < 2) issue('NO_BOUNDARIES', 'continuity.boundaries', 'No adjacent timeline boundary was tested; continuity cannot be certified.');
  if (boundaries.length !== Math.max(0, timeline.length - 1)) issue('BOUNDARY_COVERAGE', 'continuity.boundaries', 'Every adjacent shot boundary must have one declaration.');
  const diag = Math.hypot(W, H);
  const isVisible = (o) => o?.present === true && finite(o.opacity) && o.opacity >= 0.15 && finite(o.viewportVisibleRatio) && o.viewportVisibleRatio >= 0.5 && finite(o.paintVisibleRatio) && o.paintVisibleRatio >= 0.5 && o.occlusion?.testedPoints > 0;
  // Do not erase isolated jumps. Inspect every consecutive measured frame,
  // including motion outside the declared handoff windows.
  for (const id of declared.keys()) {
    for (let frame = 1; frame < N; frame++) {
      const a = frames.get(frame - 1)?.objects.find((o) => o.id === id), b = frames.get(frame)?.objects.find((o) => o.id === id);
      if (typeof a?.visualIdentity === 'string' && typeof b?.visualIdentity === 'string' && a.visualIdentity !== b.visualIdentity) result.visualIdentityChanges.push({frame, objectId: id});
      if (!isVisible(a) || !isVisible(b) || !a.rect || !b.rect) continue;
      const step = distance(center(a), center(b)) + Math.hypot(b.rect.width - a.rect.width, b.rect.height - a.rect.height) / 2;
      if (step > diag * 0.08 * 30 / fps) issue('OBJECT_TELEPORT', `samples[${frame}]`, 'Persistent object bounds jumped between consecutive actual frames.', {objectId: id, stepPixels: step});
    }
  }
  for (let index = 1; index < timeline.length; index++) {
    const from = timeline[index - 1], to = timeline[index];
    const candidates = boundaries.filter((b) => b.fromShot === from.id && b.toShot === to.id);
    const declaration = candidates[0];
    const before = errors.length;
    const entry = {fromShot: from.id, toShot: to.id, frame: to.from, carrier: declaration?.carrier || null, passed: false};
    result.boundaries.push(entry);
    if (candidates.length !== 1 || !declared.has(declaration?.carrier) || typeof declaration?.cause !== 'string' || !declaration.cause.trim() || typeof declaration?.outcome !== 'string' || !declaration.outcome.trim()) {
      issue('INVALID_BOUNDARY', `boundaries[${index - 1}]`, 'One declared persistent carrier and nonempty cause/outcome are required.'); continue;
    }
    if (from.from + from.frames !== to.from || !Number.isInteger(to.from) || to.from < 1 || to.from >= N) {
      issue('INVALID_TIMELINE_BOUNDARY', `timeline[${index}]`, 'Shots must meet at an encoded frame.'); continue;
    }
    const radius = Math.max(2, Math.ceil(fps * 0.4));
    const start = Math.max(from.from, to.from - radius), end = Math.min(to.from + to.frames - 1, to.from + radius);
    entry.window = [start, end];
    if (result.coverage.invalidFrames.some((frame) => frame >= start && frame <= end)) issue('INVALID_BOUNDARY_PROBE', `boundaries[${index - 1}]`, 'Boundary window contains invalid actual measurements.');
    const measured = [];
    for (let frame = start; frame <= end; frame++) {
      const object = frames.get(frame)?.objects?.find((o) => o.id === declaration.carrier);
      const r = object?.rect;
      if (!r || ![r.x, r.y, r.width, r.height].every(finite) || object.present !== true || object.opacity < 0.15 || object.viewportVisibleRatio < 0.5 || object.paintVisibleRatio < 0.5 || object.occlusion?.testedPoints < 1) {
        issue('CARRIER_NOT_VISIBLE', `boundaries[${index - 1}]`, 'Carrier must remain visibly present throughout the boundary window.', {frame}); continue;
      }
      const areaRatio = r.width * r.height * Math.min(object.viewportVisibleRatio, object.paintVisibleRatio) / (W * H);
      if (areaRatio < 0.0005) issue('CARRIER_TOO_SMALL', `boundaries[${index - 1}]`, 'Carrier is too small to prove a visible handoff.', {frame});
      measured.push({frame, object});
    }
    let travel = 0, maxStep = 0, minSize = Infinity, maxSize = 0;
    for (let i = 0; i < measured.length; i++) {
      const size = Math.sqrt(measured[i].object.rect.width * measured[i].object.rect.height);
      minSize = Math.min(minSize, size); maxSize = Math.max(maxSize, size);
      if (i && measured[i].frame === measured[i - 1].frame + 1) {
        const a = measured[i - 1].object, b = measured[i].object;
        const motion = distance(center(b), center(a));
        const step = motion + Math.hypot(b.rect.width - a.rect.width, b.rect.height - a.rect.height) / 2;
        travel += motion; maxStep = Math.max(maxStep, step);
      }
    }
    entry.travelPixels = travel; entry.maxStepPixels = maxStep;
    entry.sizeVariation = minSize < Infinity ? maxSize / minSize - 1 : 0;
    if (travel < diag * 0.01 && entry.sizeVariation < 0.08) issue('STATIC_CARRIER', `boundaries[${index - 1}]`, 'A fixed decorative object does not demonstrate a causal handoff.');
    if (maxStep > diag * 0.08 * 30 / fps) issue('CARRIER_TELEPORT', `boundaries[${index - 1}]`, 'Carrier jumped too far between consecutive actual frames.');
    entry.passed = before === errors.length;
  }
  for (const event of Array.isArray(spec.soundEvents) ? spec.soundEvents : []) {
    const entry = {id: event.id, objectId: event.objectId, frame: Math.round(event.at * fps), passed: false};
    result.soundEvents.push(entry);
    if (!declared.has(event.objectId) || !finite(event.at) || entry.frame < 0 || entry.frame >= N) { issue('INVALID_SOUND_EVENT', 'continuity.soundEvents', 'Sound event requires a declared object and an encoded event time.'); continue; }
    const tolerance = Math.max(1, Math.ceil(fps * 0.05));
    const observed = [];
    for (let frame = Math.max(0, entry.frame - tolerance); frame <= Math.min(N - 1, entry.frame + tolerance); frame++) {
      if (!invalidFrames.has(frame) && isVisible(frames.get(frame)?.objects.find((o) => o.id === event.objectId))) observed.push(frame);
    }
    entry.visibleFrames = observed; entry.passed = observed.length > 0;
    if (!entry.passed) issue('SOUND_OBJECT_NOT_VISIBLE', 'continuity.soundEvents', 'No actual visible target object was measured near the declared sound event.', {eventId: event.id, frame: entry.frame});
  }
  if (!pixelReport) issue('PIXEL_REPORT_REQUIRED', 'pixelReport', 'Decode all final MP4 frames before granting continuity approval.');
  else {
    const boundHash = pixelReport.videoSha256 ?? pixelReport.mp4_sha256;
    const count = pixelReport.frameCount ?? pixelReport.frame_count;
    const deltas = pixelReport.deltas ?? pixelReport.pixel_scan?.deltas;
    if (boundHash !== videoSha256 || !hex(boundHash)) issue('PIXEL_HASH_MISMATCH', 'pixelReport', 'Pixel measurements must be bound to this final MP4 hash.');
    if (count !== N || !Array.isArray(deltas) || deltas.length !== N || deltas.some((v) => !finite(v) || v < 0 || v > 255) || deltas[0] !== 0) issue('INCOMPLETE_PIXEL_COVERAGE', 'pixelReport', 'Pixel scan must contain a valid measurement for every actual encoded frame.');
    else {
      result.scope.pixels = 'all encoded frames, low-resolution grey mean absolute deltas; no image semantics';
      const mean = deltas.reduce((sum, v) => sum + v, 0) / N;
      const suspicious = [];
      for (let frame = 1; frame < N; frame++) {
        const neighbourhood = deltas.slice(Math.max(1, frame - 5), Math.min(N, frame + 6)).filter((_, i) => Math.max(1, frame - 5) + i !== frame);
        if (deltas[frame] >= 36 && deltas[frame] > Math.max(8, median(neighbourhood)) * 3) suspicious.push(frame);
      }
      result.rhythm = {pixelMeasured: true, meanDelta: mean, stillFrames: deltas.filter((v) => v < 0.5).length, suspiciousFrames: suspicious};
      if (suspicious.length) issue('PIXEL_DISCONTINUITY_REVIEW', 'pixelReport', 'Abrupt encoded pixel change requires independent visual review; normal DOM boxes cannot certify its meaning.', {frames: suspicious});
    }
  }
  result.passed = errors.length === 0;
  result.status = result.passed ? 'structural-pass' : 'fail';
  return result;
}

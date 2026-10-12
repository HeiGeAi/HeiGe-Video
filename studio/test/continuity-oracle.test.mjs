import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateContinuity, CONTINUITY_PROBE_SOURCE} from '../lib/continuity-oracle.mjs';

const SHA = 'a'.repeat(64);
function fixture() {
  const plan = {width: 1280, height: 720, fps: 30, durationInFrames: 120,
    timeline: [{id: 'a', from: 0, frames: 60}, {id: 'b', from: 60, frames: 60}],
    project: {continuity: {objects: [{id: 'carrier', semanticIdentity: 'same-original-object', kind: 'ui'}],
      boundaries: [{fromShot: 'a', toShot: 'b', carrier: 'carrier', cause: 'object travels', outcome: 'object arrives'}]}}};
  const samples = Array.from({length: 120}, (_, frame) => ({source: CONTINUITY_PROBE_SOURCE, frame, fps: 30, pts: frame / 30,
    width: 1280, height: 720, errors: [], camera: {matrix: [1, 0, 0, 1, 0, 0]}, objects: [{id: 'carrier', semanticIdentity: 'same-original-object', kind: 'ui', present: true,
      rect: {x: 100 + frame * 2, y: 100, width: 120, height: 80}, opacity: 1, viewportVisibleRatio: 1, paintVisibleRatio: 1,
      occlusion: {testedPoints: 9, visiblePoints: 9}}]}));
  const options = {videoSha256: SHA, pixelReport: {videoSha256: SHA, frameCount: 120, deltas: Array.from({length: 120}, (_, i) => i ? 2 : 0)}};
  return {plan, samples, options};
}
const run = (f) => evaluateContinuity(f.plan, f.samples, f.options);
const rejects = (f, code) => { const r = run(f); assert.equal(r.passed, false); assert.ok(r.errors.some((e) => e.code === code), JSON.stringify(r.errors)); return r; };

test('complete actual geometry and hash-bound final pixels pass without a fabricated score', () => {
  const result = run(fixture()); assert.equal(result.passed, true); assert.equal(result.coverage.complete, true);
  assert.equal(result.boundaries[0].passed, true); assert.equal(result.rhythm.pixelMeasured, true); assert.equal('score' in result, false);
});
test('missing frame, stale time, fake source and conflicting duplicate cannot be approved', () => {
  for (const change of [(f) => f.samples.splice(60, 1), (f) => { f.samples[60].pts += 0.1; },
    (f) => { f.samples[60].source = '__track'; }, (f) => { const copy = structuredClone(f.samples[60]); copy.objects[0].rect.x += 1; f.samples.push(copy); }]) {
    const f = fixture(); change(f); assert.equal(run(f).passed, false);
  }
});
test('identical render retry is recorded without inventing conflicting evidence', () => {
  const f = fixture(); f.samples.push(structuredClone(f.samples[60])); const r = run(f); assert.equal(r.passed, true); assert.deepEqual(r.coverage.duplicateFrames, [60]);
});
test('hidden, occluded and missing carriers fail despite a persistent declared ID', () => {
  for (const change of [(o) => { o.opacity = 0; }, (o) => { o.paintVisibleRatio = 0; o.occlusion.visiblePoints = 0; }, (o) => { o.present = false; }]) {
    const f = fixture(); change(f.samples[60].objects[0]); rejects(f, 'CARRIER_NOT_VISIBLE');
  }
});
test('offscreen boxes cannot claim full visibility', () => {
  const f = fixture(); f.samples[60].objects[0].rect.x = -5000; rejects(f, 'FORGED_VIEWPORT_VISIBILITY');
});
test('paint ratios cannot be self declared without point evidence', () => {
  const f = fixture(); f.samples[60].objects[0].occlusion.visiblePoints = 0; rejects(f, 'INVALID_PAINT_VISIBILITY');
});
test('one pixel moving token is not a visible carrier', () => {
  const f = fixture(); for (const s of f.samples) { s.objects[0].rect.width = 1; s.objects[0].rect.height = 1; } rejects(f, 'CARRIER_TOO_SMALL');
});
test('same node with changed identity is rejected', () => {
  const f = fixture(); for (const s of f.samples.slice(60)) s.objects[0].semanticIdentity = 'replacement'; rejects(f, 'IDENTITY_CHANGED');
});
test('static decorative element cannot make a hard timeline switch continuous', () => {
  const f = fixture(); for (const s of f.samples) s.objects[0].rect.x = 100; rejects(f, 'STATIC_CARRIER');
});
test('isolated teleport remains an error instead of being removed from motion statistics', () => {
  const f = fixture(); for (const s of f.samples.slice(60)) s.objects[0].rect.x += 350; rejects(f, 'CARRIER_TELEPORT');
});
test('every timeline boundary requires exactly one matching declaration', () => {
  const f = fixture(); f.plan.project.continuity.boundaries = []; rejects(f, 'BOUNDARY_COVERAGE');
  const g = fixture(); g.plan.project.continuity.boundaries.push(structuredClone(g.plan.project.continuity.boundaries[0])); rejects(g, 'BOUNDARY_COVERAGE');
});
test('no boundaries is explicitly unproven rather than a perfect continuity score', () => {
  const f = fixture(); f.plan.timeline = [{id: 'a', from: 0, frames: 120}]; f.plan.project.continuity.boundaries = []; rejects(f, 'NO_BOUNDARIES');
});
test('a self-reported DOM pass cannot substitute for final encoded pixel evidence', () => {
  const f = fixture(); delete f.options.pixelReport; rejects(f, 'PIXEL_REPORT_REQUIRED');
});
test('different MP4 hash and incomplete actual frame count fail', () => {
  const f = fixture(); f.options.pixelReport.videoSha256 = 'b'.repeat(64); rejects(f, 'PIXEL_HASH_MISMATCH');
  const g = fixture(); g.options.pixelReport.frameCount--; rejects(g, 'INCOMPLETE_PIXEL_COVERAGE');
});
test('single-frame encoded flash is flagged despite smooth normal DOM geometry', () => {
  const f = fixture(); f.options.pixelReport.deltas[62] = 255; f.options.pixelReport.deltas[63] = 255;
  const r = rejects(f, 'PIXEL_DISCONTINUITY_REVIEW'); assert.deepEqual(r.rhythm.suspiciousFrames, [62, 63]);
});
test('NaN geometry, singular evidence shape and unknown objects fail safely', () => {
  const f = fixture(); f.samples[60].objects[0].rect.x = NaN; rejects(f, 'INVALID_GEOMETRY');
  const g = fixture(); g.samples[60].objects[0].id = 'invented'; rejects(g, 'UNDECLARED_OR_DUPLICATE_OBJECT');
  const h = fixture(); h.samples[60].camera.matrix = [0, 0, 0, 0, 0, 0]; rejects(h, 'INVALID_CAMERA');
});
test('fixed-center single-frame scale explosion is still a teleport', () => {
  const f = fixture(); for (const s of f.samples) s.objects[0].rect.x = 400;
  const r = f.samples[60].objects[0].rect; const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  r.width = 600; r.height = 500; r.x = cx - r.width / 2; r.y = cy - r.height / 2;
  // Keep every claimed viewport ratio honest while isolating the size-reset defect.
  const clipped = Math.max(0, Math.min(720, r.y + r.height) - Math.max(0, r.y));
  f.samples[60].objects[0].viewportVisibleRatio = clipped / r.height;
  rejects(f, 'CARRIER_TELEPORT');
});
test('teleport before the handoff window cannot evade complete-frame checking', () => {
  const f = fixture(); f.samples[10].objects[0].rect.x += 350; rejects(f, 'OBJECT_TELEPORT');
});
test('actual text overflow errors cannot be ignored by the oracle', () => {
  const f = fixture(); f.samples[60].errors = [{kind: 'world-content-width-overflow', id: 'carrier', value: 22}];
  const r = rejects(f, 'DOM_PROBE_ERROR'); assert.equal(r.coverage.complete, false); assert.equal(r.boundaries[0].passed, false);
});
test('sound declarations require an actual visible object near the event', () => {
  const f = fixture(); f.plan.project.continuity.soundEvents = [{id: 'tick', at: 0.5, objectId: 'carrier', type: 'tap', volume: 0.1}];
  assert.equal(run(f).soundEvents[0].passed, true);
  for (const sample of f.samples.slice(12, 19)) sample.objects[0].opacity = 0;
  rejects(f, 'SOUND_OBJECT_NOT_VISIBLE');
});
test('changed visible UI text is a review candidate rather than an automatic semantic verdict', () => {
  const f = fixture(); for (const s of f.samples) s.objects[0].visualIdentity = s.frame < 60 ? 'ui\nBefore' : 'ui\nAfter';
  const r = run(f); assert.equal(r.passed, true); assert.deepEqual(r.visualIdentityChanges, [{frame: 60, objectId: 'carrier'}]);
});

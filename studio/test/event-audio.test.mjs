import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {synthesizeEventAudio} from '../lib/event-audio.mjs';
import {compileProject} from '../lib/project.mjs';

const FFMPEG = process.env.FFMPEG || 'ffmpeg', FFPROBE = process.env.FFPROBE || 'ffprobe';
const RATE = 48000;
const key = (at, x = 540) => ({at, x, y: 220, w: 200, h: 180, opacity: 1, rotation: 0, radius: 0});
const event = (extra = {}) => ({id: 'contact', at: .517, objectId: 'receipt', type: 'tick', volume: .4, ...extra});
const project = (events = [event()], x = 540) => ({
  schemaVersion: 'heige-video/4', title: '真实声效测试', mode: 'explainer', ratio: '16:9', theme: 'ledger',
  shots: [{id: 'a', type: 'beat', title: '接触', duration: 1}, {id: 'b', type: 'beat', title: '承接', duration: 1}],
  continuity: {
    objects: [{id: 'receipt', semanticIdentity: '同一账单', kind: 'surface', text: '账单', keyframes: [key(0, x), key(2, x)]}],
    camera: [{at: 0, x: 640, y: 360, zoom: 1, rotation: 0}, {at: 2, x: 640, y: 360, zoom: 1, rotation: 0}],
    boundaries: [{fromShot: 'a', toShot: 'b', carrier: 'receipt', cause: '接触账单', outcome: '账单延续'}], soundEvents: events,
  },
});
const plan = (events, x) => {
  const result = compileProject(project(events, x));
  assert.deepEqual(result.issues.errors, [], JSON.stringify(result.issues));
  return result;
};
const temporary = callback => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-event-audio-'));
  try { return callback(dir); } finally {fs.rmSync(dir, {recursive: true, force: true});}
};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const toolsAvailable = t => {
  for (const command of [FFMPEG, FFPROBE]) {
    const result = spawnSync(command, ['-version'], {encoding: 'utf8', timeout: 10000});
    if (result.status !== 0) {t.skip(`Needs installed ${command}; the test never downloads a decoder`); return false;}
  }
  return true;
};
function wav(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.readUInt32LE(4), bytes.length - 8);
  assert.equal(bytes.toString('ascii', 36, 40), 'data'); assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
  assert.equal(bytes.readUInt16LE(20), 1); assert.equal(bytes.readUInt16LE(22), 2);
  assert.equal(bytes.readUInt32LE(24), RATE); assert.equal(bytes.readUInt16LE(34), 16);
  const pcm = bytes.subarray(44), samples = pcm.length / 4;
  const left = new Int16Array(samples), right = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {left[i] = pcm.readInt16LE(i * 4); right[i] = pcm.readInt16LE(i * 4 + 2);}
  return {bytes, pcm, samples, left, right};
}
const energy = values => values.reduce((sum, value) => sum + value * value, 0);
const firstNonzero = decoded => decoded.left.findIndex((value, i) => value !== 0 || decoded.right[i] !== 0);
const peak = decoded => {
  let maximum = 0;
  for (let i = 0; i < decoded.samples; i++) maximum = Math.max(maximum, Math.abs(decoded.left[i]), Math.abs(decoded.right[i]));
  return maximum;
};

test('same compiled world and event inputs produce byte-identical PCM with a finite frame-bound clock', () => temporary(dir => {
  const input = plan(), original = structuredClone(input), a = path.join(dir, 'a.wav'), b = path.join(dir, 'b.wav');
  const report = synthesizeEventAudio(input, a);
  const second = synthesizeEventAudio(structuredClone(input), b);
  assert.deepEqual(wav(a).bytes, wav(b).bytes); assert.deepEqual(report, second);
  assert.deepEqual(input, original);
  assert.equal(report.rate, RATE); assert.equal(report.channels, 2);
  assert.equal(report.samples, input.durationInFrames * RATE / input.fps);
  assert.equal(wav(a).samples, report.samples); assert.equal(report.duration, input.durationInFrames / input.fps);
  for (const value of [report.duration, report.peak, report.rms, report.gain]) assert.ok(Number.isFinite(value));
  assert.equal(report.listening, 'not-tested');
}));

test('actual PCM onset follows the authored seconds clock and shifts exactly one video frame', () => temporary(dir => {
  const a = path.join(dir, 'first.wav'), b = path.join(dir, 'shifted.wav');
  const input = plan(), shifted = plan([event({at: event().at + 1 / 30})]);
  synthesizeEventAudio(input, a); synthesizeEventAudio(shifted, b);
  const first = wav(a), second = wav(b), start = Math.round(event().at * RATE);
  assert.ok(firstNonzero(first) >= start && firstNonzero(first) <= start + 3, 'Tick onset must be present at the actual event sample, allowing its short attack');
  assert.equal(firstNonzero(second) - firstNonzero(first), RATE / 30);
  assert.deepEqual([...first.left.slice(0, start)], Array(start).fill(0));
  for (let i = 0; i < RATE * .7; i++) assert.equal(first.left[start + i], second.left[start + RATE / 30 + i]);
}));

test('left and right source projection produces measured opposite stereo energy', () => temporary(dir => {
  const leftFile = path.join(dir, 'left.wav'), rightFile = path.join(dir, 'right.wav');
  synthesizeEventAudio(plan([event()], -60), leftFile); synthesizeEventAudio(plan([event()], 1140), rightFile);
  const l = wav(leftFile), r = wav(rightFile);
  assert.ok(energy(l.left) > 25 * energy(l.right), 'A left world source must have substantially greater actual left PCM energy');
  assert.ok(energy(r.right) > 25 * energy(r.left), 'A right world source must have substantially greater actual right PCM energy');
  assert.ok(Math.abs(energy(l.left) + energy(l.right) - energy(r.left) - energy(r.right)) <= 1000, 'Symmetric source positions should preserve total stereo energy');
}));

test('a persistent moving source pans according to its actual position at each event time', () => temporary(dir => {
  const input = plan([event({id: 'first', at: .1}), event({id: 'second', at: 1.6})]);
  input.project.continuity.objects[0].keyframes = [key(0, -60), key(2, 1140)];
  const target = path.join(dir, 'moving-source.wav'); synthesizeEventAudio(input, target);
  const decoded = wav(target), firstStart = Math.round(.1 * RATE), secondStart = Math.round(1.6 * RATE), span = Math.round(.31 * RATE);
  const firstLeft = energy(decoded.left.slice(firstStart, firstStart + span)), firstRight = energy(decoded.right.slice(firstStart, firstStart + span));
  const secondLeft = energy(decoded.left.slice(secondStart, secondStart + span)), secondRight = energy(decoded.right.slice(secondStart, secondStart + span));
  assert.ok(firstLeft > 25 * firstRight, 'The earlier event must follow the same object while it is on the left');
  assert.ok(secondRight > 6 * secondLeft, 'The later event must follow the same object after it moves right');
}));

test('tick, air and low impact have distinct actual waveform hashes and zero-crossing ranges', () => temporary(dir => {
  const materials = {};
  for (const type of ['tick', 'whoosh', 'impact']) {
    const file = path.join(dir, `${type}.wav`); synthesizeEventAudio(plan([event({type})]), file);
    const decoded = wav(file), from = Math.round(event().at * RATE), samples = decoded.left.slice(from, from + Math.round(.13 * RATE));
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) if (samples[i] * samples[i - 1] < 0) crossings++;
    materials[type] = {hash: sha(decoded.pcm), crossings, energy: energy(samples)};
    assert.ok(materials[type].energy > 0);
  }
  assert.equal(new Set(Object.values(materials).map(item => item.hash)).size, 3);
  assert.ok(materials.whoosh.crossings > materials.tick.crossings * 3, JSON.stringify(materials));
  assert.ok(materials.tick.crossings > materials.impact.crossings * 2, JSON.stringify(materials));
}));

test('all three materials contain the same measured finite shared-delay room tail', () => temporary(dir => {
  const dryLengths = {tick: .13, whoosh: .45, impact: .28};
  const delays = [[Math.round(.071 * RATE), .16], [Math.round(.113 * RATE), .10], [Math.round(.173 * RATE), .055]];
  for (const [type, duration] of Object.entries(dryLengths)) {
    const file = path.join(dir, `${type}.wav`); synthesizeEventAudio(plan([event({type, at: .1})]), file);
    const decoded = wav(file), start = Math.round(.1 * RATE), count = Math.round(.8 * RATE), dry = new Float64Array(count);
    const drySamples = Math.ceil(duration * RATE), roomEnd = drySamples + delays.at(-1)[0];
    let residualPeak = 0;
    for (let i = 0; i < count; i++) {
      // Deconvolve the declared common room from actual PCM. An incorrect or
      // absent delay has a nonzero residual after the material's dry envelope.
      dry[i] = decoded.left[start + i];
      for (const [delay, gain] of delays) if (i >= delay) dry[i] -= dry[i - delay] * gain;
      if (i >= drySamples) residualPeak = Math.max(residualPeak, Math.abs(dry[i]));
    }
    const tail = decoded.left.slice(start + drySamples, start + roomEnd);
    assert.ok(energy(tail) > 0, `${type} must have a decoded room tail after its dry duration`);
    assert.ok(residualPeak < 2, `${type} does not match the common delay room within integer-PCM quantization: ${residualPeak}`);
    assert.equal(energy(decoded.left.slice(start + roomEnd)), 0, `${type} must stop after the finite shared room tail`);
  }
}));

test('32 overlapping events reduce gain and keep measured PCM below clipping', () => temporary(dir => {
  const events = Array.from({length: 32}, (_, index) => event({id: `impact-${index}`, type: 'impact', volume: .7}));
  const file = path.join(dir, 'overlap.wav'), report = synthesizeEventAudio(plan(events), file), decoded = wav(file);
  assert.ok(report.gain > 0 && report.gain < 1);
  assert.ok(peak(decoded) <= Math.ceil(.6 * 32767)); assert.ok(peak(decoded) < 32767);
  assert.ok(Math.abs(report.peak - peak(decoded) / 32767) < 1 / 32767);
  const measuredRms = Math.sqrt((energy(decoded.left) + energy(decoded.right)) / (2 * decoded.samples)) / 32767;
  assert.ok(Math.abs(measuredRms - report.rms) < 1 / 32767);
  assert.equal(report.events.length, 32);
}));

test('no sound events create no file and preserve an existing file', () => temporary(dir => {
  const target = path.join(dir, 'absent.wav');
  assert.equal(synthesizeEventAudio(plan([]), target), null); assert.equal(fs.existsSync(target), false);
  const withoutWorld = plan([]); delete withoutWorld.project.continuity;
  assert.equal(synthesizeEventAudio(withoutWorld, target), null); assert.equal(fs.existsSync(target), false);
  fs.writeFileSync(target, 'prior result');
  assert.equal(synthesizeEventAudio(plan([]), target), null); assert.equal(fs.readFileSync(target, 'utf8'), 'prior result');
}));

test('exclusive sound output refuses overwriting any prior bytes', () => temporary(dir => {
  const target = path.join(dir, 'existing.wav'); fs.writeFileSync(target, 'immutable prior evidence');
  assert.throws(() => synthesizeEventAudio(plan(), target), /EEXIST/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'immutable prior evidence');
}));

test('an event in the last video frame truncates its room tail while retaining the exact film clock', () => temporary(dir => {
  const input = plan([event({type: 'whoosh', at: 2 - 1 / 30})]);
  const target = path.join(dir, 'final-frame.wav'), report = synthesizeEventAudio(input, target), decoded = wav(target);
  assert.equal(report.duration, 2); assert.equal(decoded.samples, 2 * RATE);
  assert.ok(energy(decoded.left.slice(-RATE / 30)) > 0);
  assert.equal(energy(decoded.left.slice(0, report.events[0].sample)), 0);
}));

test('FFprobe and full FFmpeg decode agree with actual finite stereo PCM and the compiled frame clock', t => {
  if (!toolsAvailable(t)) return;
  temporary(dir => {
    const file = path.join(dir, 'probe.wav'), input = plan(), report = synthesizeEventAudio(input, file), decoded = wav(file);
    const probe = spawnSync(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8', timeout: 10000});
    assert.equal(probe.status, 0, probe.stderr);
    const metadata = JSON.parse(probe.stdout), stream = metadata.streams[0];
    assert.equal(stream.codec_name, 'pcm_s16le'); assert.equal(Number(stream.sample_rate), RATE); assert.equal(stream.channels, 2);
    assert.equal(Number(stream.duration_ts), report.samples); assert.equal(stream.time_base, `1/${RATE}`);
    assert.equal(Number(metadata.format.duration), input.durationInFrames / input.fps);
    const pcm = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 's16le', '-acodec', 'pcm_s16le', '-'], {timeout: 10000, maxBuffer: 8 * 1024 * 1024});
    assert.equal(pcm.status, 0, pcm.stderr?.toString()); assert.deepEqual(pcm.stdout, decoded.pcm);
    const floats = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], {timeout: 10000, maxBuffer: 8 * 1024 * 1024});
    assert.equal(floats.status, 0, floats.stderr?.toString()); assert.equal(floats.stdout.length, report.samples * 2 * 4);
    for (let i = 0; i < floats.stdout.length; i += 4) assert.ok(Number.isFinite(floats.stdout.readFloatLE(i)));
  });
});

test('compiled input rejects nonfinite event fields before synthesis', () => {
  for (const change of [
    p => {p.continuity.soundEvents[0].at = NaN;}, p => {p.continuity.soundEvents[0].volume = Infinity;},
    p => {p.continuity.soundEvents[0].at = -.1;}, p => {p.continuity.soundEvents[0].at = 2;},
    p => {p.continuity.soundEvents[0].volume = 0;}, p => {p.continuity.soundEvents[0].type = 'unknown';},
  ]) {
    const input = project(); change(input);
    assert.ok(compileProject(input).issues.errors.some(error => error.path.startsWith('project.continuity.soundEvents')));
  }
});

for (const [name, mutate] of [
  ['NaN duration', p => {p.duration = NaN;}], ['zero duration', p => {p.duration = 0;}],
  ['duration beyond bounded world', p => {p.duration = 61; p.durationInFrames = 1830;}],
  ['NaN fps', p => {p.fps = NaN;}], ['zero fps', p => {p.fps = 0;}],
  ['unsupported fps', p => {p.fps = 25; p.durationInFrames = 50;}],
  ['NaN frame count', p => {p.durationInFrames = NaN;}], ['mismatched frame clock', p => {p.durationInFrames++;}],
  ['fractional frame count', p => {p.durationInFrames = 60.5;}],
  ['zero viewport width', p => {p.width = 0;}], ['NaN viewport height', p => {p.height = NaN;}],
  ['negative event time', p => {p.project.continuity.soundEvents[0].at = -.1;}],
  ['event beyond final clock', p => {p.project.continuity.soundEvents[0].at = 2;}],
  ['NaN event time', p => {p.project.continuity.soundEvents[0].at = NaN;}],
  ['NaN volume', p => {p.project.continuity.soundEvents[0].volume = NaN;}],
  ['infinite volume', p => {p.project.continuity.soundEvents[0].volume = Infinity;}],
  ['negative volume', p => {p.project.continuity.soundEvents[0].volume = -.1;}],
  ['zero volume', p => {p.project.continuity.soundEvents[0].volume = 0;}],
  ['out-of-range volume', p => {p.project.continuity.soundEvents[0].volume = .8;}],
  ['unknown material', p => {p.project.continuity.soundEvents[0].type = 'unknown';}],
  ['invalid event ID', p => {p.project.continuity.soundEvents[0].id = '#invalid';}],
  ['duplicate event IDs', p => {p.project.continuity.soundEvents.push({...p.project.continuity.soundEvents[0], at: 1});}],
  ['missing persistent target', p => {p.project.continuity.soundEvents[0].objectId = 'absent';}],
  ['non-array sound events', p => {p.project.continuity.soundEvents = {};}],
]) {
  test(`exported sound API rejects invalid input before writing: ${name}`, () => temporary(dir => {
    const input = plan(); mutate(input); const target = path.join(dir, 'invalid.wav');
    assert.throws(() => synthesizeEventAudio(input, target));
    assert.equal(fs.existsSync(target), false, 'Invalid input must not leave a passing-looking WAV');
  }));
}

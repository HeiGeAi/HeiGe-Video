import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import test, {before, after} from 'node:test';
import {composeMusicScore, synthesizeMusicScore} from '../lib/music-score.mjs';

const plan = () => ({duration: 15, fps: 30, durationInFrames: 450, project: {seed: 20261012,
  continuity: {musicScore: {style: 'forge-breakbeat', bpm: 128, volume: .8}}}});
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const deepFreeze = value => {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
let directory, baseline, wav;
before(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-music-score-'));
  baseline = synthesizeMusicScore(plan(), path.join(directory, 'baseline.wav'));
  wav = fs.readFileSync(path.join(directory, 'baseline.wav'));
});
after(() => fs.rmSync(directory, {recursive: true, force: true}));

test('original music produces a real 15-second stereo PCM WAV with bound hashes', () => {
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 16), 'WAVEfmt ');
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readUInt32LE(24), 48000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), 15 * 48000 * 4);
  assert.equal(wav.length, 44 + 15 * 48000 * 4);
  assert.equal(baseline.sha256, digest(wav));
  assert.equal(baseline.pcmSha256, digest(wav.subarray(44)));
  assert.equal(baseline.duration, 15);
  assert.equal(baseline.samples, 720000);
});

test('PCM measurements are independently recomputed and leave mix headroom', () => {
  let peak = 0, squares = 0;
  for (let index = 44; index < wav.length; index += 2) {
    const sample = wav.readInt16LE(index) / 32767;
    peak = Math.max(peak, Math.abs(sample));
    squares += sample * sample;
  }
  assert.equal(peak, baseline.peak);
  assert.equal(Math.sqrt(squares / 1440000), baseline.rms);
  assert.ok(peak > .5 && peak < .8);
  assert.ok(baseline.rms > .10 && baseline.rms < .30);
  assert.equal(wav.readInt16LE(44), 0, 'opening has a short click-safe attack');
  assert.equal(wav.readInt16LE(wav.length - 2), 0, 'tail reaches zero rather than truncating a loud sample');
});

test('beat, section and event samples share one exact musical clock', () => {
  const composed = composeMusicScore(plan());
  assert.equal(composed.timeline.beats, 32);
  assert.equal(composed.timeline.bars, 8);
  assert.equal(composed.timeline.secondsPerBeat, .46875);
  assert.deepEqual(composed.timeline.sections.map(section => [section.id, section.at, section.end]), [
    ['strike', 0, 1.875], ['drive', 1.875, 5.625], ['charge', 5.625, 7.5], ['forge', 7.5, 13.125], ['seal', 13.125, 15],
  ]);
  composed.timeline.beatsAt.forEach((beat, index) => assert.equal(beat.sample, index * 22500));
  for (const event of composed.events) {
    assert.equal(event.sample, Math.round(event.at * 48000));
    assert.ok(event.at >= 0 && event.at < 15);
    assert.ok(event.duration > 0 && event.at + event.duration <= 15 + 1e-9);
  }
});

test('arrangement contains continuous drums, syncopated bass, harmony and a hook in every bar', () => {
  assert.ok(baseline.events.length >= 250, 'a few isolated SFX cannot pass as a score');
  for (let bar = 0; bar < 8; bar++) {
    const types = new Set(baseline.events.filter(event => event.bar === bar).map(event => event.type));
    for (const type of ['kick', 'snare', 'hat', 'bass', 'chord', 'hook']) assert.ok(types.has(type), `bar ${bar} misses ${type}`);
  }
  assert.ok(baseline.eventCounts.bass >= 40);
  assert.ok(baseline.eventCounts.hook >= 32);
  assert.ok(new Set(baseline.events.filter(event => event.type === 'bass').map(event => event.notes[0])).size >= 4);
  assert.ok(baseline.events.some(event => event.type === 'kick' && event.step % 4 !== 0));
  assert.ok(baseline.events.some(event => event.type === 'bass' && event.step % 4 !== 0));
  for (const role of ['drums', 'bass', 'harmony', 'hook']) assert.ok(baseline.sourceStemRms[role] > .01, `${role} is effectively absent`);
  assert.ok(baseline.halfSecondRms.slice(0, 28).every(window => window.rms > .035));
  assert.ok(baseline.halfSecondRms.at(-1).rms < baseline.halfSecondRms[26].rms * .1, 'outro must decay');
});

test('identical composition and seed reproduce identical audio bytes', () => {
  const repeated = synthesizeMusicScore(plan(), path.join(directory, 'repeated.wav'));
  assert.equal(repeated.sha256, baseline.sha256);
  assert.deepEqual(repeated.timeline, baseline.timeline);
  assert.deepEqual(repeated.events, baseline.events);
});

test('seed variations change instrument noise without changing film cue timing', () => {
  const project = plan();
  project.project.seed = 20261013;
  const varied = synthesizeMusicScore(project, path.join(directory, 'varied.wav'));
  assert.notEqual(varied.sha256, baseline.sha256);
  assert.deepEqual(varied.timeline, baseline.timeline);
  assert.deepEqual(varied.events, baseline.events);
});

test('volume is applied once and changing gain preserves the complete arrangement', () => {
  const project = plan();
  project.project.continuity.musicScore.volume = .4;
  const quiet = synthesizeMusicScore(project, path.join(directory, 'quiet.wav'));
  assert.ok(Math.abs(quiet.peak / baseline.peak - .5) < .0001);
  assert.ok(Math.abs(quiet.rms / baseline.rms - .5) < .0001);
  assert.deepEqual(quiet.timeline, baseline.timeline);
  assert.deepEqual(quiet.events, baseline.events);
});

test('unknown styles and fields, unsafe gains, tempo changes and malformed configuration fail', () => {
  for (const change of [
    score => {score.style = 'copied-song';}, score => {score.bpm = 140;},
    score => {score.volume = NaN;}, score => {score.volume = Infinity;},
    score => {score.volume = 0;}, score => {score.volume = 1.001;},
    score => {score.volume = '.8';}, score => {score.sampleUrl = 'https://example.invalid/sample';},
  ]) {
    const project = plan();
    change(project.project.continuity.musicScore);
    assert.throws(() => composeMusicScore(project), /musicScore requires/u);
  }
  for (const score of [null, [], true]) {
    const project = plan(); project.project.continuity.musicScore = score;
    assert.throws(() => composeMusicScore(project), /musicScore requires/u);
  }
});

test('duration, frame clock and seed errors cannot produce a partial score file', () => {
  for (const change of [
    project => {project.duration = 12;}, project => {project.duration = NaN;},
    project => {project.fps = 60;}, project => {project.durationInFrames = 449;},
    project => {project.project.seed = 1.5;},
  ]) {
    const project = plan(); change(project);
    const output = path.join(directory, 'invalid.wav');
    assert.throws(() => synthesizeMusicScore(project, output), /clock|seed/u);
    assert.equal(fs.existsSync(output), false);
  }
  const supported = plan(); supported.fps = 24; supported.durationInFrames = 360;
  assert.equal(composeMusicScore(supported).timeline.bars, 8);
});

test('absent score is a no-op and another music asset cannot silently collide', () => {
  assert.equal(synthesizeMusicScore({project: {}}, path.join(directory, 'absent.wav')), null);
  assert.equal(fs.existsSync(path.join(directory, 'absent.wav')), false);
  const project = plan(); project.project.music = {assetId: 'another'};
  assert.throws(() => composeMusicScore(project), /mutually exclusive/u);
});

test('input is immutable, prior music bytes are protected and scope does not claim listening', () => {
  const project = plan(), before = structuredClone(project);
  deepFreeze(project);
  assert.deepEqual(composeMusicScore(project), composeMusicScore(plan()));
  assert.deepEqual(project, before);
  assert.throws(() => synthesizeMusicScore(project, path.join(directory, 'baseline.wav')), /EEXIST/u);
  assert.equal(digest(fs.readFileSync(path.join(directory, 'baseline.wav'))), baseline.sha256);
  assert.equal(baseline.scope.listening, 'not-tested');
  assert.match(baseline.scope.quality, /actual listening/u);
  assert.match(baseline.scope.source, /no downloaded samples/u);
});

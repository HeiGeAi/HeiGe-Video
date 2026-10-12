import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as Remotion from 'remotion';
import {renderToStaticMarkup} from 'react-dom/server';
import {createContinuousProject} from '../lib/continuous-template.mjs';
import {createForgeProject} from '../lib/forge-template.mjs';
import {composeMusicScore} from '../lib/music-score.mjs';
import {compileProject} from '../lib/project.mjs';
import {sampleContinuity} from '../lib/continuous-motion.mjs';
import {evaluateContinuity, CONTINUITY_PROBE_SOURCE} from '../lib/continuity-oracle.mjs';
import {verifyContinuousEvidence} from '../lib/continuity-evidence.mjs';
import {synthesizeEventAudio} from '../lib/event-audio.mjs';
import {fileHash} from '../lib/integrity.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLI = path.join(ROOT, 'studio/make.mjs');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const temporary = callback => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-continuous-cli-'));
  try {return callback(dir);} finally {fs.rmSync(dir, {recursive: true, force: true});}
};
const runCLI = (args, env = {}) => spawnSync(process.execPath, [CLI, ...args], {env: {...process.env, ...env}, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024});
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const actualFunction = name => {
  const source = ts.createSourceFile('make.mjs', fs.readFileSync(CLI, 'utf8'), ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
  const node = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(node, `Production function ${name} must exist`);
  return node.getText(source);
};

for (const ratio of ['16:9', '9:16', '1:1']) {
  test(`actual CLI init creates and validates the original 15-second forge ${ratio} preset`, () => temporary(dir => {
    const file = path.join(dir, 'project.json');
    const initialized = runCLI(['init', file, '--ratio', ratio]);
    assert.equal(initialized.status, 0, initialized.stderr);
    const data = read(file), result = JSON.parse(initialized.stdout);
    assert.equal(result.engine, 'native-continuous-world'); assert.equal(data.ratio, ratio);
    assert.equal(data.theme, 'forge'); assert.equal(data.fps, 30);
    assert.deepEqual(data.continuity.musicScore, {style: 'forge-breakbeat', bpm: 128, volume: .8});
    assert.equal(data.continuity.blur.samples, 3); assert.ok(data.shots.every(shot => shot.type === 'beat'));
    assert.ok(data.continuity.objects.some(object => object.typography?.size >= 60));
    assert.ok(data.continuity.objects.some(object => object.appearance?.pattern === 'film-perforation'));
    assert.ok(data.continuity.camera.some(key => key.easing === 'ease-in-out-cubic'));
    const bundled = createForgeProject(ratio);
    assert.equal(data.assets.length, 3);
    for (const asset of data.assets) {
      const original = bundled.assets.find(item => item.id === asset.id);
      assert.ok(original, 'Every copied image must preserve its original asset identity');
      assert.equal(asset.kind, 'image'); assert.equal(asset.source, 'original');
      assert.match(asset.path, /^project-assets\/[^/]+\.png$/u);
      assert.equal(fileHash(path.join(dir, asset.path)), fileHash(path.join(ROOT, 'examples/studio', original.path)));
    }
    assert.ok(data.continuity.objects.filter(object => object.assetId).length >= 3);
    const plan = compileProject(data, {baseDir: dir}); assert.deepEqual(plan.issues.errors, []);
    const score = composeMusicScore(plan);
    assert.equal(score.duration, 15); assert.equal(score.timeline.bpm, 128); assert.equal(score.timeline.bars, 8);
    assert.equal(score.rate, 48000); assert.equal(score.channels, 2); assert.ok(score.events.length > 200);
    assert.equal(data.audio, undefined, 'The original score must not masquerade as mock narration');
    assert.equal(data.draft, undefined);
    const validated = runCLI(['validate', file]);
    assert.equal(validated.status, 0, validated.stderr);
    const accepted = JSON.parse(validated.stdout);
    assert.equal(accepted.status, 'pass'); assert.equal(accepted.duration, 15);
    assert.equal(accepted.frames, 450); assert.equal(accepted.previewOnly, false);
    assert.deepEqual(fs.readdirSync(dir).sort(), ['project-assets', 'project.json'], 'Init copies original images without synthesizing or rendering media');
    const assetBytes = new Map(data.assets.map(asset => [asset.path, fs.readFileSync(path.join(dir, asset.path))]));
    const bytes = fs.readFileSync(file);
    const overwrite = runCLI(['init', file, '--ratio', ratio]);
    assert.equal(overwrite.status, 1); assert.match(overwrite.stderr, /EEXIST/); assert.deepEqual(fs.readFileSync(file), bytes);
    for (const [assetPath, bytes] of assetBytes) assert.deepEqual(fs.readFileSync(path.join(dir, assetPath)), bytes);
  }));
}

test('default CLI authoring uses forge and needs no render browser, interpreter or font setup', () => temporary(dir => {
  const file = path.join(dir, 'default.json');
  const unavailable = path.join(dir, 'deliberately-unavailable');
  const result = runCLI(['init', file], {HEIGE_PYTHON: unavailable, HEIGE_BROWSER_PATH: unavailable, HEIGE_FONT_PATH: unavailable});
  assert.equal(result.status, 0, result.stderr);
  const data = read(file), plan = compileProject(data, {baseDir: dir});
  assert.equal(data.ratio, '16:9'); assert.equal(data.theme, 'forge'); assert.equal(plan.durationInFrames, 450);
  assert.equal(data.continuity.musicScore.style, 'forge-breakbeat');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['default-assets', 'default.json']);
}));

test('init rejects a preexisting JSON before creating its dedicated asset directory', () => temporary(dir => {
  const file = path.join(dir, 'existing.json'), original = Buffer.from('Existing user project data');
  fs.writeFileSync(file, original);
  const result = runCLI(['init', file]);
  assert.equal(result.status, 1); assert.match(result.stderr, /EEXIST/);
  assert.deepEqual(fs.readFileSync(file), original);
  assert.equal(fs.existsSync(path.join(dir, 'existing-assets')), false);
}));

test('init rejects a preexisting dedicated asset directory and preserves all its data', () => temporary(dir => {
  const file = path.join(dir, 'existing.json'), assets = path.join(dir, 'existing-assets');
  fs.mkdirSync(assets);
  for (const populated of [false, true]) {
    if (populated) fs.writeFileSync(path.join(assets, 'user-data.png'), 'Keep this original user data');
    const before = fs.readdirSync(assets);
    const result = runCLI(['init', file]);
    assert.equal(result.status, 1); assert.match(result.stderr, /EEXIST/);
    assert.equal(fs.existsSync(file), false); assert.deepEqual(fs.readdirSync(assets), before);
    if (populated) assert.equal(fs.readFileSync(path.join(assets, 'user-data.png'), 'utf8'), 'Keep this original user data');
  }
}));

test('init treats dangling symlinks and files at the reserved asset path as existing user data', () => temporary(dir => {
  const file = path.join(dir, 'reserved.json'), assets = path.join(dir, 'reserved-assets');
  fs.writeFileSync(assets, 'Preserve this reserved name');
  let result = runCLI(['init', file]);
  assert.equal(result.status, 1); assert.match(result.stderr, /EEXIST/);
  assert.equal(fs.readFileSync(assets, 'utf8'), 'Preserve this reserved name'); assert.equal(fs.existsSync(file), false);
  fs.unlinkSync(assets); fs.symlinkSync('unavailable-user-directory', assets);
  result = runCLI(['init', file]);
  assert.equal(result.status, 1); assert.match(result.stderr, /EEXIST/);
  assert.equal(fs.readlinkSync(assets), 'unavailable-user-directory'); assert.equal(fs.existsSync(file), false);
}));

test('failed init rolls back owned files and new parents while preserving foreign data and replacements', () => temporary(dir => {
  const script = `
    import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
    const [,modulePath,destination,mode]=process.argv.slice(1);
    const assetDirectory=path.join(path.dirname(destination),path.parse(destination).name+'-assets');
    const originalOpen=fs.openSync,originalWrite=fs.writeFileSync;
    let jsonFd;
    fs.openSync=(file,flags,...rest)=>{
      const fd=originalOpen(file,flags,...rest);
      if(file===destination && flags==='wx')jsonFd=fd;
      return fd;
    };
    fs.writeFileSync=(file,...rest)=>{
      if(file===jsonFd){
        if(mode==='foreign') originalWrite(path.join(assetDirectory,'foreign.dat'),'Preserve independently created data',{flag:'wx'});
        if(mode==='replacement'){fs.unlinkSync(destination);originalWrite(destination,'Preserve the replacement project',{flag:'wx'});}
        throw new Error('Injected final init JSON write failure');
      }
      return originalWrite(file,...rest);
    };
    const {main}=await import(pathToFileURL(modulePath).href);
    try{await main(['init',destination]);}catch(error){console.error(error.message);process.exitCode=1;}
  `;
  for (const mode of ['ordinary', 'foreign', 'replacement']) {
    const workspace = path.join(dir, mode); fs.mkdirSync(workspace);
    const file = path.join(workspace, ...(mode === 'ordinary' ? ['new-parent', 'deeper'] : []), 'failed.json');
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, 'init-rollback-harness', CLI, file, mode], {encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024});
    assert.equal(result.error, undefined); assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Injected final init JSON write failure/);
    if (mode === 'ordinary') assert.deepEqual(fs.readdirSync(workspace), []);
    if (mode === 'foreign') {
      assert.equal(fs.existsSync(file), false);
      const assets = path.join(workspace, 'failed-assets');
      assert.deepEqual(fs.readdirSync(assets), ['foreign.dat']);
      assert.equal(fs.readFileSync(path.join(assets, 'foreign.dat'), 'utf8'), 'Preserve independently created data');
    }
    if (mode === 'replacement') {
      assert.deepEqual(fs.readdirSync(workspace), ['failed.json']);
      assert.equal(fs.readFileSync(file, 'utf8'), 'Preserve the replacement project');
    }
  }
}));

test('legacy continuous API remains a distinct linear 16-second authored input accepted by the actual CLI', () => temporary(dir => {
  for (const ratio of ['16:9', '9:16', '1:1']) {
    const authored = createContinuousProject(ratio), file = path.join(dir, ratio.replace(':', '-') + '.json');
    assert.equal(authored.theme, 'nocturne'); assert.equal(authored.continuity.musicScore, undefined);
    assert.ok(authored.continuity.objects.every(object => object.keyframes.every(key => key.easing === undefined)));
    write(file, authored);
    const result = runCLI(['validate', file]); assert.equal(result.status, 0, result.stderr);
    const accepted = JSON.parse(result.stdout); assert.equal(accepted.duration, 16); assert.equal(accepted.frames, 480);
    assert.equal(accepted.previewOnly, false);
  }
}));

test('CLI ratio belongs only to init and invalid init never leaves a project', () => temporary(dir => {
  const invalid = path.join(dir, 'invalid.json');
  const init = runCLI(['init', invalid, '--ratio', '4:3']); assert.equal(init.status, 1); assert.equal(fs.existsSync(invalid), false);
  const source = path.join(dir, 'project.json'); write(source, createContinuousProject());
  const validate = runCLI(['validate', source, '--ratio', '9:16']); assert.equal(validate.status, 1); assert.match(validate.stderr, /only accepted by init/);
}));

test('all template ratios preserve the quantized end clock for fractional configured durations', () => {
  for (const ratio of ['16:9', '9:16', '1:1']) for (const duration of [8, 8.05, 10.1, 16, 19.07, 40]) {
    const authored = createContinuousProject(ratio, {duration, samples: 1}), plan = compileProject(authored);
    assert.deepEqual(plan.issues.errors, [], `${ratio}/${duration}: ${JSON.stringify(plan.issues.errors)}`);
    assert.equal(plan.durationInFrames, Math.round(duration * 30));
    assert.equal(plan.timeline.at(-1).from + plan.timeline.at(-1).frames, plan.durationInFrames);
    for (const object of authored.continuity.objects) assert.ok(Math.abs(object.keyframes.at(-1).at - plan.duration) < 1e-7);
    assert.ok(Math.abs(authored.continuity.camera.at(-1).at - plan.duration) < 1e-7);
  }
  for (const duration of [NaN, 0, 7.9, 40.1, Infinity]) assert.throws(() => createContinuousProject('16:9', {duration}));
});

test('template handoff geometry has an explicit visible carrier change in every format at default duration', () => {
  // This validates authored track mathematics only. It is not a DOM, encoded
  // pixel, or visual approval; actual build probes remain mandatory.
  for (const ratio of ['16:9', '9:16', '1:1']) {
    const plan = compileProject(createContinuousProject(ratio));
    for (let i = 1; i < plan.timeline.length; i++) {
      const boundary = plan.timeline[i].from, radius = Math.ceil(plan.fps * .4), rects = [];
      for (let frame = boundary - radius; frame <= boundary + radius; frame++) {
        const state = sampleContinuity(plan.project.continuity, frame / plan.fps, plan.width, plan.height);
        rects.push(state.objects.find(object => object.id === 'story-shell').projectedRect);
      }
      let travel = 0;
      for (let j = 1; j < rects.length; j++) travel += Math.hypot(rects[j].x + rects[j].width / 2 - rects[j - 1].x - rects[j - 1].width / 2, rects[j].y + rects[j].height / 2 - rects[j - 1].y - rects[j - 1].height / 2);
      const sizes = rects.map(rect => Math.sqrt(rect.width * rect.height)), variation = Math.max(...sizes) / Math.min(...sizes) - 1;
      assert.ok(travel >= Math.hypot(plan.width, plan.height) * .01 || variation >= .08, `${ratio} boundary ${i}: travel=${travel}, size variation=${variation}`);
    }
  }
});

test('ordinary v4 scene input still validates and requires no continuous evidence files', () => temporary(dir => {
  const project = {schemaVersion: 'heige-video/4', title: '旧场景回归', mode: 'explainer', ratio: '16:9', theme: 'ledger', shots: [{id: 'old', type: 'statement', title: '保留镜头', duration: 3}]};
  const file = path.join(dir, 'project.json'); write(file, project);
  const output = runCLI(['validate', file]); assert.equal(output.status, 0, output.stderr);
  assert.equal(JSON.parse(output.stdout).frames, 90);
  assert.doesNotThrow(() => verifyContinuousEvidence(compileProject(project), path.join(dir, 'missing-output'), {}));
}));

function evidenceFixture(dir, {samples = 1, sound = false} = {}) {
  const key = at => ({at, x: 100 + at * 60, y: 100, w: 160, h: 100, opacity: 1, rotation: 0, radius: 0});
  const project = {schemaVersion: 'heige-video/4', title: '证据拒绝夹具', mode: 'explainer', ratio: '16:9', theme: 'ledger', shots: [{id: 'a', type: 'beat', title: '前段', duration: 1}, {id: 'b', type: 'beat', title: '后段', duration: 1}], continuity: {
    objects: [{id: 'carrier', semanticIdentity: 'fixture carrier', kind: 'surface', text: '账单', keyframes: [key(0), key(2)]}],
    camera: [{at: 0, x: 640, y: 360, zoom: 1, rotation: 0}, {at: 2, x: 640, y: 360, zoom: 1, rotation: 0}],
    boundaries: [{fromShot: 'a', toShot: 'b', carrier: 'carrier', cause: '账单移动', outcome: '账单继续'}], blur: {samples, shutterAngle: 180},
    ...(sound ? {soundEvents: [{id: 'event', at: .5, objectId: 'carrier', type: 'tick', volume: .2}]} : {}),
  }};
  const plan = compileProject(project); assert.deepEqual(plan.issues.errors, []);
  fs.writeFileSync(path.join(dir, 'video.mp4'), 'Synthetic unit fixture bytes, not an encoded video or DOM approval');
  const videoSha256 = fileHash(path.join(dir, 'video.mp4'));
  // Deliberately synthetic observations test report rejection only. Production
  // trust still depends on browser-owned probes collected during the real build.
  const frames = Array.from({length: plan.durationInFrames}, (_, frame) => ({source: CONTINUITY_PROBE_SOURCE, frame, fps: plan.fps, pts: frame / plan.fps, width: plan.width, height: plan.height, errors: [], camera: {matrix: [1, 0, 0, 1, 0, 0]}, objects: [{id: 'carrier', semanticIdentity: 'fixture carrier', kind: 'surface', present: true, rect: {x: 100 + frame * 2, y: 100, width: 160, height: 100}, opacity: 1, viewportVisibleRatio: 1, paintVisibleRatio: 1, occlusion: {testedPoints: 25, visiblePoints: 25}}]}));
  const pixels = {status: 'pass', errors: [], videoSha256, frameCount: plan.durationInFrames, actual: {width: plan.width, height: plan.height, fps: plan.fps, frames: plan.durationInFrames, duration: plan.duration, codec: 'h264'}, pixel_scan: {deltas: frames.map(frame => frame.frame ? 2 : 0)}};
  const recorded = evaluateContinuity(plan, frames, {videoSha256, pixelReport: pixels}); assert.equal(recorded.passed, true);
  const manifest = {engine: 'e'.repeat(64), input: {project: 'f'.repeat(64)}, mp4_sha256: videoSha256, status: 'validated', review: {technical: 'pass'}, format: {width: plan.width, height: plan.height, fps: plan.fps}, fps: plan.fps, frame_count: plan.durationInFrames, duration: plan.duration, source_start: 0, source_time_scale: 1, continuity: {status: recorded.status, coverage: recorded.coverage, boundaries: recorded.boundaries, scope: recorded.scope}, temporalShutter: {samples, angle: samples === 3 ? 180 : 0, ...(samples === 3 ? {captures: plan.durationInFrames * 3} : {})}};
  write(path.join(dir, 'continuity-probe.json'), {engine: manifest.engine, input: manifest.input, frames});
  write(path.join(dir, 'continuity-check.json'), recorded); write(path.join(dir, 'media-check.json'), pixels);
  if (samples === 3) write(path.join(dir, 'shutter.json'), {schemaVersion: 'heige-temporal-composite/1', method: 'linear16-srgb-lut-global-shutter-average', samples: 3, frames: plan.durationInFrames, width: plan.width, height: plan.height, groups: frames.map(({frame}) => ({frame, file: `element-${String(frame).padStart(6, '0')}.png`, sha256: 'a'.repeat(64), sources: [0, 1, 2].map(slot => ({file: `element-${frame * 3 + slot}.png`, sha256: 'b'.repeat(64)}))}))});
  if (sound) {const report = synthesizeEventAudio(plan, path.join(dir, 'events.wav')); write(path.join(dir, 'sound-events.json'), report);}
  return {plan, manifest};
}

test('evidence verifier recomputes its structural result for a complete synthetic unit fixture', () => temporary(dir => {
  const {plan, manifest} = evidenceFixture(dir); assert.doesNotThrow(() => verifyContinuousEvidence(plan, dir, manifest));
}));

const mutateJson = (dir, name, change) => {const file = path.join(dir, name), value = read(file); change(value); write(file, value);};
for (const [name, change] of [
  ['missing continuity report', (dir) => fs.unlinkSync(path.join(dir, 'continuity-check.json'))],
  ['missing measured probe', (dir) => fs.unlinkSync(path.join(dir, 'continuity-probe.json'))],
  ['missing encoded pixel report', (dir) => fs.unlinkSync(path.join(dir, 'media-check.json'))],
  ['failed continuity status', (dir) => mutateJson(dir, 'continuity-check.json', data => {data.status = 'fail';})],
  ['false recorded pass', (dir) => mutateJson(dir, 'continuity-check.json', data => {data.passed = false;})],
  ['missing manifest continuous state', (dir, f) => {delete f.manifest.continuity;}],
  ['failed manifest continuous state', (dir, f) => {f.manifest.continuity.status = 'fail';}],
  ['wrong engine snapshot', (dir) => mutateJson(dir, 'continuity-probe.json', data => {data.engine = 'x';})],
  ['wrong input snapshot', (dir) => mutateJson(dir, 'continuity-probe.json', data => {data.input.project = 'x';})],
  ['missing actual frame', (dir) => mutateJson(dir, 'continuity-probe.json', data => {data.frames.splice(30, 1);})],
  ['changed frame PTS', (dir) => mutateJson(dir, 'continuity-probe.json', data => {data.frames[30].pts += .1;})],
  ['hidden boundary carrier', (dir) => mutateJson(dir, 'continuity-probe.json', data => {data.frames[30].objects[0].opacity = 0;})],
  ['wrong final MP4 hash', (dir) => mutateJson(dir, 'media-check.json', data => {data.videoSha256 = 'c'.repeat(64);})],
  ['incomplete encoded frame count', (dir) => mutateJson(dir, 'media-check.json', data => {data.frameCount--;} )],
  ['rejected final media status', (dir) => mutateJson(dir, 'media-check.json', data => {data.status = 'rejected'; data.errors = ['Decoded audio exceeds full scale'];})],
  ['nonempty final media errors despite pass', (dir) => mutateJson(dir, 'media-check.json', data => {data.errors = ['Decoded audio exceeds full scale'];})],
  ['wrong decoded width despite pass', (dir) => mutateJson(dir, 'media-check.json', data => {data.actual.width = 640;})],
  ['wrong decoded height despite pass', (dir) => mutateJson(dir, 'media-check.json', data => {data.actual.height = 480;})],
  ['wrong decoded fps despite pass', (dir) => mutateJson(dir, 'media-check.json', data => {data.actual.fps = 90;})],
  ['wrong decoded frames despite pass', (dir) => mutateJson(dir, 'media-check.json', data => {data.actual.frames = 180;})],
  ['wrong decoded duration despite pass', (dir) => mutateJson(dir, 'media-check.json', data => {data.actual.duration = 6;})],
  ['wrong manifest output format', (dir, f) => {f.manifest.format.width = 640;}],
  ['wrong manifest frame count', (dir, f) => {f.manifest.frame_count = 180;}],
  ['wrong manifest duration', (dir, f) => {f.manifest.duration = 6;}],
  ['wrong source time scale', (dir, f) => {f.manifest.source_time_scale = 3;}],
  ['wrong source start', (dir, f) => {f.manifest.source_start = 1;}],
  ['different manifest boundary summary', (dir, f) => {f.manifest.continuity.boundaries = [];}],
]) {
  test(`verify refuses stale or failed continuous evidence: ${name}`, () => temporary(dir => {
    const fixture = evidenceFixture(dir); change(dir, fixture);
    assert.throws(() => verifyContinuousEvidence(fixture.plan, dir, fixture.manifest));
  }));
}

test('three-exposure evidence binds all frame groups and rejects missing, reused or misassigned captures', () => temporary(dir => {
  const fixture = evidenceFixture(dir, {samples: 3}); assert.doesNotThrow(() => verifyContinuousEvidence(fixture.plan, dir, fixture.manifest));
  const original = read(path.join(dir, 'shutter.json'));
  for (const mutate of [
    data => {data.groups.pop();}, data => {data.groups[0].sources.pop();},
    data => {data.groups[0].sources[1].file = data.groups[0].sources[0].file;},
    data => {data.groups[0].sources[0].sha256 = 'unknown';},
    data => {data.groups[0].sources[0].file = 'element-777777.png';},
    data => {data.groups[0].file = 'element-000099.png';},
  ]) {
    const data = structuredClone(original); mutate(data); write(path.join(dir, 'shutter.json'), data);
    assert.throws(() => verifyContinuousEvidence(fixture.plan, dir, fixture.manifest));
  }
}));

test('event evidence binds sound material, source and the exact PCM sample clock', () => temporary(dir => {
  const fixture = evidenceFixture(dir, {sound: true}); assert.doesNotThrow(() => verifyContinuousEvidence(fixture.plan, dir, fixture.manifest));
  const original = read(path.join(dir, 'sound-events.json'));
  for (const mutate of [
    data => {data.events[0].objectId = 'missing';}, data => {data.events[0].sample++;},
    data => {data.events[0].type = 'impact';}, data => {data.samples--;}, data => {data.peak = 1.2;}, data => {data.rms = null;},
  ]) {
    const data = structuredClone(original); mutate(data); write(path.join(dir, 'sound-events.json'), data);
    assert.throws(() => verifyContinuousEvidence(fixture.plan, dir, fixture.manifest));
  }
}));

test('CLI verify never promotes a rejected or pending technical manifest', () => temporary(dir => {
  const project = path.join(dir, 'project.json'); write(project, createContinuousProject());
  for (const manifest of [{status: 'rejected', review: {technical: 'pass'}}, {status: 'validated', review: {technical: 'pending'}}]) {
    write(path.join(dir, 'manifest.json'), manifest);
    const result = runCLI(['verify', project, '--out', dir]); assert.equal(result.status, 1); assert.match(result.stderr, /no successful technical validation/);
  }
}));

test('actual continuous DOM probe retains independent text collisions on an unsampled intermediate frame', async t => {
  const {openBrowser, ensureBrowser} = await import('@remotion/renderer');
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let executable = process.env.HEIGE_BROWSER_PATH || (fs.existsSync(chrome) ? chrome : null);
  if (!executable) {
    try {executable = (await ensureBrowser({onBrowserDownload: () => {throw new Error('No implicit browser download in regressions');}})).path;}
    catch {t.skip('An installed Chrome or Remotion browser is required'); return;}
  }
  const stageSource = ts.createSourceFile('ContinuousStage.tsx', fs.readFileSync(path.join(ROOT, 'studio/src/ContinuousStage.tsx'), 'utf8'), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const collectorFunctions = stageSource.statements.filter(statement => ts.isFunctionDeclaration(statement) && ['effectiveOpacity', 'probeContinuousStage'].includes(statement.name?.text));
  assert.equal(collectorFunctions.length, 2);
  const options = {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}};
  const inspector = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'studio/src/inspect.ts'), 'utf8'), options).outputText.replace(/^export /gmu, '');
  const collector = ts.transpileModule(collectorFunctions.map(statement => statement.getText(stageSource)).join('\n'), options).outputText.replace(/^export /gmu, '');
  const browser = await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error'});
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: 1280, height: 720, deviceScaleFactor: 1});
    const reports = await page.evaluate(source => {
      document.body.style.margin = '0';
      document.body.innerHTML = '<div id="root" data-heige-continuous-viewport style="position:relative;width:1280px;height:720px;overflow:hidden"><div data-heige-continuous-camera style="position:absolute;width:1280px;height:720px;transform:matrix(1,0,0,1,0,0)"><div data-heige-object-id="alpha" data-heige-semantic-identity="A" data-heige-object-kind="text" style="position:absolute;left:375px;top:100px;width:80px;height:100px"><div data-heige-object-content><div data-heige-text="A" data-heige-text-id="alpha:text" style="font:48px sans-serif;line-height:1.55;padding:4px 0 8px">A</div></div></div><div data-heige-object-id="beta" data-heige-semantic-identity="B" data-heige-object-kind="text" style="position:absolute;left:425px;top:100px;width:80px;height:100px"><div data-heige-object-content><div data-heige-text="B" data-heige-text-id="beta:text" style="font:48px sans-serif;line-height:1.55;padding:4px 0 8px">B</div></div></div></div></div>';
      const exports = new Function(source + '\nreturn {probeContinuousStage,inspectLayout};')();
      const root = document.getElementById('root');
      return {probe: exports.probeContinuousStage(root, {frame: 11, fps: 30, time: 11 / 30, width: 1280, height: 720}), direct: exports.inspectLayout(root, 11, 1280, 720)};
    }, `${inspector}\n${collector}`);
    assert.ok(reports.direct.errors.some(error => error.kind === 'text-overlap'));
    assert.ok(reports.probe.errors.some(error => error.kind === 'text-overlap'), 'The every-frame oracle must receive the actual independent text collision; sparse still checks are insufficient');
  } finally {await browser.close({silent: true});}
});

test('actual native images load and retain a positive viewport at 64-pixel and smaller authored sizes', {timeout: 120000}, async t => {
  const {openBrowser, ensureBrowser, selectComposition, renderStill} = await import('@remotion/renderer');
  const {bundle} = await import('@remotion/bundler');
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let executable = process.env.HEIGE_BROWSER_PATH || (fs.existsSync(chrome) ? chrome : null);
  if (!executable) {
    try {executable = (await ensureBrowser({onBrowserDownload: () => {throw new Error('No implicit browser download in regressions');}})).path;}
    catch {t.skip('An installed Chrome or Remotion browser is required'); return;}
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-native-image-'));
  let browser;
  try {
    const publicDir = path.join(dir, 'public'); fs.mkdirSync(publicDir);
    const original = createForgeProject('16:9').assets.find(asset => asset.kind === 'image');
    assert.ok(original, 'The browser regression must use an actual registered local PNG');
    const image = path.join(publicDir, 'registered.png');
    fs.copyFileSync(path.join(ROOT, 'examples/studio', original.path), image);
    assert.equal(fileHash(image), fileHash(path.join(ROOT, 'examples/studio', original.path)));
    const project = createContinuousProject('16:9', {samples: 1});
    project.assets = [{...original, path: 'registered.png'}];
    const sizes = [{id: 'height-64', x: 64, w: 320, h: 64}, {id: 'small-16', x: 450, w: 16, h: 16}, {id: 'minimum-1', x: 550, w: 1, h: 1}, {id: 'normal-100', x: 640, w: 260, h: 100}];
    const duration = project.shots.reduce((total, shot) => total + shot.duration, 0);
    project.continuity.objects = sizes.map(({id, x, w, h}) => ({id, semanticIdentity: `Registered image ${id}`, kind: 'image', assetId: original.id, keyframes: [0, duration].map(at => ({at, x, y: 100, w, h, opacity: 1, rotation: 0, radius: 0}))}));
    project.continuity.camera = [0, duration].map(at => ({at, x: 640, y: 360, zoom: 1, rotation: 0}));
    project.continuity.boundaries.forEach(boundary => {boundary.carrier = sizes[0].id;});
    project.continuity.soundEvents = [];
    const plan = compileProject(project, {baseDir: publicDir}); assert.deepEqual(plan.issues.errors, []);
    const entryPoint = path.join(dir, 'image-proof.tsx');
    fs.writeFileSync(entryPoint, `
      import React, {useLayoutEffect} from 'react';
      import {Composition, registerRoot, staticFile, delayRender, continueRender, cancelRender} from 'remotion';
      import {ContinuousStage} from ${JSON.stringify(path.join(ROOT, 'studio/src/ContinuousStage.tsx'))};
      import {themeStyle} from ${JSON.stringify(path.join(ROOT, 'studio/src/theme.ts'))};
      import ${JSON.stringify(path.join(ROOT, 'studio/src/styles.css'))};
      const plan = ${JSON.stringify(plan)};
      function Proof() {
        useLayoutEffect(() => {
          const handle = delayRender('Inspect the actual loaded native image viewports');
          (async () => {
            const images = Array.from(document.querySelectorAll('[data-heige-object-kind="image"] img'));
            await Promise.all(images.map(async image => {
              if (!image.complete || image.naturalWidth === 0) await new Promise((resolve, reject) => {
                image.addEventListener('load', resolve, {once: true});
                image.addEventListener('error', () => reject(new Error('Registered PNG failed to load')), {once: true});
              });
              await image.decode();
            }));
            const bounds = node => {const box = node.getBoundingClientRect(); return {x: box.x, y: box.y, width: box.width, height: box.height};};
            const intersection = (a, b) => ({x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)), height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))});
            const records = images.map(image => {
              const viewport = image.parentElement, object = image.closest('[data-heige-object-id]');
              const current = {object: bounds(object), viewport: bounds(viewport), image: bounds(image)};
              current.clipIntersection = intersection(current.viewport, current.image);
              const saved = viewport.getAttribute('style');
              // Recreate the old fixed-header crop in the same actual DOM.
              // This counterexample changes no Img implementation or PNG bytes.
              Object.assign(viewport.style, {top: '64px', left: '8px', right: '8px', bottom: '8px'});
              const historical = {viewport: bounds(viewport), image: bounds(image)};
              historical.clipIntersection = intersection(historical.viewport, historical.image);
              viewport.setAttribute('style', saved || '');
              return {id: object.dataset.heigeObjectId, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete, currentSrc: image.currentSrc, current, historical};
            });
            console.log('HEIGE_IMAGE_PROOF:' + JSON.stringify({frame: 0, records}));
            continueRender(handle);
          })().catch(cancelRender);
        }, []);
        return <div className="heige-film" style={{...themeStyle(plan.project.theme, 'sans-serif'), position: 'relative', width: plan.width, height: plan.height}}><ContinuousStage plan={plan} time={0} fontFamily="sans-serif" assetUrls={{[${JSON.stringify(original.id)}]: new URL(staticFile('registered.png'), window.location.href).href}} /></div>;
      }
      registerRoot(() => <Composition id="NativeImageProof" component={Proof} width={plan.width} height={plan.height} fps={plan.fps} durationInFrames={plan.durationInFrames} />);
    `, {flag: 'wx'});
    const serveUrl = await bundle({entryPoint, rootDir: ROOT, outDir: path.join(dir, 'bundle'), publicDir, enableCaching: false, webpackOverride: config => ({...config, resolve: {...config.resolve, modules: [path.join(ROOT, 'node_modules'), ...(config.resolve?.modules || [])]}})});
    browser = await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error'});
    const composition = await selectComposition({serveUrl, id: 'NativeImageProof', inputProps: {}, puppeteerInstance: browser, logLevel: 'error'});
    const reports = [], errors = [];
    await renderStill({serveUrl, composition, inputProps: {}, frame: 0, puppeteerInstance: browser, logLevel: 'error', imageFormat: 'png', output: path.join(dir, 'proof.png'), onBrowserLog: log => {
      if (log.text.startsWith('HEIGE_IMAGE_PROOF:')) reports.push(JSON.parse(log.text.slice('HEIGE_IMAGE_PROOF:'.length)));
      if (log.type === 'error') errors.push(log.text);
    }});
    assert.deepEqual(errors, []); assert.ok(reports.length, 'The real browser must finish loading and inspect the production Img nodes');
    for (const report of reports) {
      assert.equal(report.frame, 0); assert.equal(report.records.length, sizes.length);
      for (const size of sizes) {
        const record = report.records.find(item => item.id === size.id); assert.ok(record);
        assert.equal(record.complete, true); assert.ok(record.naturalWidth > 0); assert.ok(record.naturalHeight > 0);
        const source = new URL(record.currentSrc); assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(source.hostname));
        assert.match(source.pathname, /registered\.png$/u);
        assert.ok(record.current.viewport.width > 0 && record.current.viewport.height > 0, `${size.id} has a collapsed internal image viewport`);
        assert.ok(record.current.image.width > 0 && record.current.image.height > 0, `${size.id} has a zero-area loaded Img`);
        const viewport = record.current.viewport, actualImage = record.current.image;
        const paintedWidth = Math.min(viewport.x + viewport.width, actualImage.x + actualImage.width) - Math.max(viewport.x, actualImage.x);
        const paintedHeight = Math.min(viewport.y + viewport.height, actualImage.y + actualImage.height) - Math.max(viewport.y, actualImage.y);
        assert.ok(paintedWidth > 0 && paintedHeight > 0, `${size.id} loaded Img leaves the actual clipping viewport and paints no visible area`);
        assert.equal(record.current.clipIntersection.width, paintedWidth); assert.equal(record.current.clipIntersection.height, paintedHeight);
        assert.ok(actualImage.x >= viewport.x - .01 && actualImage.y >= viewport.y - .01);
        assert.ok(actualImage.x + actualImage.width <= viewport.x + viewport.width + .01);
        assert.ok(actualImage.y + actualImage.height <= viewport.y + viewport.height + .01, `${size.id} inline baseline moves the image beyond its clipping viewport`);
        assert.ok(record.current.viewport.x >= record.current.object.x && record.current.viewport.y >= record.current.object.y);
        assert.ok(record.current.viewport.x + record.current.viewport.width <= record.current.object.x + record.current.object.width + .01);
        assert.ok(record.current.viewport.y + record.current.viewport.height <= record.current.object.y + record.current.object.height + .01);
        if (size.h <= 64) assert.equal(record.historical.viewport.height, 0, `${size.id} must reproduce the old fixed-header disappearance`);
        else assert.deepEqual(record.current.viewport, record.historical.viewport, 'The usual 100-high image must keep its existing crop geometry');
      }
    }
    t.diagnostic(JSON.stringify({sourceSha256: fileHash(image), ...reports.at(-1)}));
  } finally {if (browser) await browser.close({silent: true}); fs.rmSync(dir, {recursive: true, force: true});}
});

test('actual portrait ending uses the production font and keeps complete lines inside the final panel', async t => {
  const {openBrowser, ensureBrowser} = await import('@remotion/renderer');
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let executable = process.env.HEIGE_BROWSER_PATH || (fs.existsSync(chrome) ? chrome : null);
  if (!executable) {
    try {executable = (await ensureBrowser({onBrowserDownload: () => {throw new Error('No implicit browser download in regressions');}})).path;}
    catch {t.skip('An installed Chrome or Remotion browser is required'); return;}
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-portrait-ending-'));
  let browser;
  try {
    const run = (command, args) => {
      // Production make.run allows 120 seconds for the same audited fonttools
      // conversion. A shorter test-only deadline fails during concurrent renders.
      const result = spawnSync(command, args, {encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024});
      assert.equal(result.error, undefined, `${command} error=${result.error?.message || 'none'} status=${result.status} signal=${result.signal}`);
      assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
    };
    // Use the actual production face selector and conversion/glyph audit. This
    // is not a sans-serif approximation or a copied component style fixture.
    const chooseFont = new Function('fs', 'run', actualFunction('chooseFont') + '\nreturn chooseFont;')(fs, run);
    const font = chooseFont(), project = createContinuousProject('9:16', {samples: 1}), plan = compileProject(project);
    assert.deepEqual(plan.issues.errors, []);
    const requiredText = project.continuity.objects.flatMap(object => [object.text || '', ...(object.rows || [])]).join('\n');
    const textFile = path.join(dir, 'text.txt'), faceFile = path.join(dir, 'font.ttf');
    fs.writeFileSync(textFile, requiredText);
    const python = process.env.HEIGE_PYTHON || (fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3');
    const fontReport = JSON.parse(run(python, [path.join(ROOT, 'studio/check_media.py'), 'font', '--font', font.path, '--index', String(font.index), '--text', textFile, '--out', faceFile]));
    assert.deepEqual(fontReport.missing, []);
    const modules = new Map();
    const productionModule = name => {
      if (modules.has(name)) return modules.get(name);
      const file = path.join(ROOT, 'studio/src', name), module = {exports: {}};
      modules.set(name, module.exports);
      const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}}).outputText;
      const requireLocal = spec => {
        if (spec === 'react') return React;
        if (spec === 'react/jsx-runtime') return jsxRuntime;
        if (spec === 'remotion') return Remotion;
        if (spec === '../lib/continuous-motion.mjs') return {sampleContinuity};
        if (spec === './scenes') return productionModule('scenes.tsx');
        if (spec === './motion') return productionModule('motion.ts');
        if (spec === './theme') return productionModule('theme.ts');
        if (spec === './primitives') return productionModule('primitives.tsx');
        if (spec === './inspect') return productionModule('inspect.ts');
        throw new Error(`Unreviewed production dependency ${spec}`);
      };
      new Function('require', 'exports', 'module', source)(requireLocal, module.exports, module);
      modules.set(name, module.exports); return module.exports;
    };
    const {ContinuousStage} = productionModule('ContinuousStage.tsx'), {themeStyle} = productionModule('theme.ts');
    const fontFamily = 'HeiGeLocal', time = (plan.durationInFrames - 1) / plan.fps;
    const markup = current => renderToStaticMarkup(React.createElement('div', {className: 'heige-film', style: {...themeStyle(current.project.theme, fontFamily), position: 'relative', width: current.width, height: current.height}}, React.createElement(ContinuousStage, {plan: current, time, fontFamily})));
    const historical = structuredClone(plan);
    // Restore the old geometry and copy as an adversarial rendered variant.
    // Changing only authored numbers must not make the negative test pass.
    for (const key of historical.project.continuity.objects.find(object => object.id === 'story-shell').keyframes) if (key.at >= 12.6) {const center = key.y + key.h / 2; key.h = 220; key.y = center - key.h / 2;}
    for (const [id, y, h] of [['delivery-copy', 350, 100], ['delivery-promise', 457, 160]]) {
      const object = historical.project.continuity.objects.find(item => item.id === id);
      if (id === 'delivery-promise') object.text = '看得清 连得上';
      object.keyframes.forEach(key => {key.y = y; key.h = h;});
    }
    browser = await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error'});
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: plan.width, height: plan.height, deviceScaleFactor: 1});
    const result = await page.evaluate(async input => {
      document.body.style.margin = '0';
      const sheet = document.createElement('style'); sheet.textContent = input.css; document.head.appendChild(sheet);
      const face = await new FontFace(input.fontFamily, `url(data:font/ttf;base64,${input.font})`).load(); document.fonts.add(face);
      await document.fonts.load(`700 48px "${input.fontFamily}"`); await document.fonts.ready;
      const rect = bounds => ({x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height});
      const readEnding = html => {
        document.body.innerHTML = html;
        const shell = document.querySelector('[data-heige-object-id="story-shell"]'), shellRect = shell.getBoundingClientRect(), panelStyle = getComputedStyle(shell);
        const camera = new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-heige-continuous-camera]')).transform), scale = Math.hypot(camera.a, camera.b);
        const inset = Math.min(parseFloat(panelStyle.paddingLeft), parseFloat(panelStyle.paddingTop)) * scale;
        const inside = bounds => bounds.left >= shellRect.left + inset - 2 && bounds.right <= shellRect.right - inset + 2 && bounds.top >= shellRect.top + inset - 2 && bounds.bottom <= shellRect.bottom - inset + 2;
        const texts = ['delivery-copy', 'delivery-promise'].map(id => {
          const node = document.querySelector(`[data-heige-object-id="${id}"] [data-heige-text]`), style = getComputedStyle(node), lines = [], glyphs = [];
          const text = node.firstChild;
          for (let offset = 0; offset < text.textContent.length; offset++) {
            const char = text.textContent[offset]; if (/\s/u.test(char)) continue;
            const range = document.createRange(); range.setStart(text, offset); range.setEnd(text, offset + 1);
            const bounds = range.getBoundingClientRect();
            let line = lines.find(candidate => Math.abs(candidate.top - bounds.top) <= 1);
            if (!line) {line = {top: bounds.top, text: ''}; lines.push(line);}
            line.text += char; glyphs.push({char, rect: rect(bounds), inside: inside(bounds)});
          }
          return {id, actualText: node.textContent, lines: lines.sort((a, b) => a.top - b.top).map(line => line.text), rect: rect(node.getBoundingClientRect()), inside: inside(node.getBoundingClientRect()), glyphs, projectedFontSize: parseFloat(style.fontSize) * scale, fontFamily: style.fontFamily, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight};
        });
        return {panel: rect(shellRect), texts};
      };
      return {loaded: document.fonts.check(`700 48px "${input.fontFamily}"`), current: readEnding(input.current), historical: readEnding(input.historical)};
    }, {css: fs.readFileSync(path.join(ROOT, 'studio/src/styles.css'), 'utf8'), font: fs.readFileSync(faceFile).toString('base64'), fontFamily, current: markup(plan), historical: markup(historical)});
    assert.equal(result.loaded, true, 'The audited production face must actually be loaded');
    const validateEnding = ending => {
      assert.equal(ending.texts.length, 2);
      for (const text of ending.texts) {
        assert.match(text.fontFamily, /HeiGeLocal/); assert.ok(text.projectedFontSize >= 24);
        assert.ok(text.inside, `${text.id} text line box leaves the actual panel interior`);
        assert.ok(text.glyphs.length && text.glyphs.every(glyph => glyph.inside), `${text.id} visible glyph leaves the actual panel interior`);
        assert.ok(text.scrollWidth <= text.clientWidth + 2); assert.ok(text.scrollHeight <= text.clientHeight + 2);
      }
      assert.deepEqual(ending.texts[0].lines, ['黑哥视频']);
      assert.deepEqual(ending.texts[1].lines, ['看得清', '连得上'], 'The browser must paint two complete three-character lines, with no orphan glyph');
    };
    validateEnding(result.current);
    assert.throws(() => validateEnding(result.historical), 'The real browser must reject the old 220-high ending, not just an altered config field');
    const evidence = ending => ({panel: ending.panel, texts: ending.texts.map(({id, lines, rect, inside, projectedFontSize}) => ({id, lines, rect, inside, projectedFontSize}))});
    t.diagnostic(JSON.stringify({fontSha256: fontReport.sha256, current: evidence(result.current), historical: evidence(result.historical)}));
  } finally {if (browser) await browser.close({silent: true}); fs.rmSync(dir, {recursive: true, force: true});}
});

test('actual mux limits every stereo channel without letting mono downmix hide overload', t => {
  if (spawnSync(FFMPEG, ['-version'], {encoding: 'utf8', timeout: 10000}).status !== 0) {t.skip('Installed FFmpeg is required; never download implicitly'); return;}
  temporary(dir => {
    const fixture = evidenceFixture(dir), plan = fixture.plan;
    plan.project.continuity.objects[0].keyframes.forEach(key => {key.x = 0; key.w = 80;});
    plan.project.continuity.soundEvents = ['hit-a', 'hit-b'].map(id => ({id, at: .5, objectId: 'carrier', type: 'impact', volume: .7}));
    const effects = path.join(dir, 'overlap.wav'); synthesizeEventAudio(plan, effects);
    const narration = Buffer.from(fs.readFileSync(effects)); let maximum = 0;
    for (let i = 44; i < narration.length; i += 4) maximum = Math.max(maximum, Math.abs(narration.readInt16LE(i)));
    for (let i = 44; i < narration.length; i += 4) {narration.writeInt16LE(Math.round(narration.readInt16LE(i) / maximum * .95 * 32767), i); narration.writeInt16LE(0, i + 2);}
    const voice = path.join(dir, 'voice.wav'); fs.writeFileSync(voice, narration); plan.project.audio = {assetId: 'voice', kind: 'synthetic'};
    const run = (command, args) => {
      const result = spawnSync(command, args, {encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024});
      if (result.status !== 0) throw new Error(result.stderr); return result.stdout.trim();
    };
    const silent = path.join(dir, 'silent.mp4'); run(FFMPEG, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=30', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', silent]);
    // The synthetic evidence fixture is not an encoded video. Remove only this
    // test-owned placeholder before running the production mux with real media.
    fs.unlinkSync(path.join(dir, 'video.mp4'));
    const mux = new Function('fs', 'path', 'run', 'ffmpeg', actualFunction('mux') + '\nreturn mux;')(fs, path, run, FFMPEG);
    mux(plan, {voice}, silent, dir, effects);
    const decoded = spawnSync(FFMPEG, ['-v', 'error', '-i', path.join(dir, 'video.mp4'), '-vn', '-ar', '48000', '-f', 'f32le', '-'], {timeout: 30000, maxBuffer: 8 * 1024 * 1024});
    assert.equal(decoded.status, 0, decoded.stderr?.toString());
    let peak = 0;
    for (let i = 0; i < decoded.stdout.length; i += 4) {const value = decoded.stdout.readFloatLE(i); assert.ok(Number.isFinite(value)); peak = Math.max(peak, Math.abs(value));}
    assert.ok(peak <= 1.001, `Decoded stereo channel peak exceeds full scale: ${peak}`);
    assert.ok(Math.abs(decoded.stdout.length / (2 * 4 * 48000) - plan.duration) < .15, 'Limiter and AAC must preserve the authored clock');
  });
});

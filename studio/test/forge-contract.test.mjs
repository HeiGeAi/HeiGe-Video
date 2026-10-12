import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {compileProject as compileProductionProject} from '../lib/project.mjs';
import {createForgeProject} from '../lib/forge-template.mjs';
import {composeMusicScore} from '../lib/music-score.mjs';
import {sampleContinuity} from '../lib/continuous-motion.mjs';

const PROJECT_BASE = fileURLToPath(new URL('../../examples/studio/', import.meta.url));
const compileProject = (project, options = {}) => compileProductionProject(project, {baseDir: PROJECT_BASE, ...options});
const imageIndex = project => project.continuity.objects.findIndex(object => object.kind === 'image');
const copyProjectAssets = (project, directory) => {
  for (const asset of project.assets ?? []) {
    const destination = path.join(directory, asset.path);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.copyFileSync(path.join(PROJECT_BASE, asset.path), destination);
  }
};
const good = project => {
  const plan = compileProject(project);
  assert.deepEqual(plan.issues.errors, []);
  return plan;
};
const rejectsAt = (change, at, options) => {
  const project = createForgeProject();
  change(project);
  const plan = compileProject(project, options);
  assert.ok(plan.issues.errors.some(issue => issue.path === at), `${at}: ${JSON.stringify(plan.issues)}`);
  return plan;
};
const textIndex = project => project.continuity.objects.findIndex(object => object.kind === 'text');
const deepFreeze = value => {
  if (value !== null && typeof value === 'object') {Object.values(value).forEach(deepFreeze); Object.freeze(value);}
  return value;
};

test('real Forge templates compile independent native layouts at all three ratios', () => {
  const layouts = [];
  for (const [ratio, dimensions] of [['16:9', [1280, 720]], ['9:16', [720, 1280]], ['1:1', [1080, 1080]]]) {
    const project = createForgeProject(ratio);
    const plan = good(project);
    assert.equal(project.theme, 'forge');
    assert.equal(project.ratio, ratio);
    assert.deepEqual([plan.width, plan.height], dimensions);
    assert.equal(plan.duration, 15);
    assert.equal(plan.durationInFrames, 450);
    assert.equal(plan.previewOnly, false);
    assert.equal(project.continuity.musicScore.style, 'forge-breakbeat');
    assert.equal(project.continuity.blur.samples, 3);
    const images = project.continuity.objects.filter(object => object.kind === 'image');
    assert.equal(images.length, 3);
    assert.deepEqual(new Set(images.map(image => image.assetId)), new Set(project.assets.map(asset => asset.id)));
    assert.ok(project.assets.every(asset => asset.kind === 'image' && asset.source === 'original' && fs.existsSync(path.join(PROJECT_BASE, asset.path))));
    const spine = project.continuity.objects.find(object => object.id === 'film-spine');
    layouts.push(spine.keyframes.map(key => key.w));
  }
  assert.notDeepEqual(layouts[0], layouts[1], 'portrait must have authored geometry rather than only a different viewport');
  assert.notDeepEqual(layouts[0], layouts[2]);
  assert.throws(() => createForgeProject('4:3'), /Unsupported/u);
  assert.throws(() => createForgeProject('16:9', {samples: 2}), /Unsupported/u);
  good(createForgeProject('16:9', {samples: 1}));
});

test('source q timestamps stay on the frame grid, have one state per time and cover the exact endpoint', () => {
  for (const ratio of ['16:9', '9:16', '1:1']) {
    const project = createForgeProject(ratio), plan = good(project);
    for (const track of [project.continuity.camera, ...project.continuity.objects.map(object => object.keyframes)]) {
      assert.equal(track[0].at, 0);
      assert.equal(track.at(-1).at, 15);
      for (let index = 0; index < track.length; index++) {
        assert.ok(Math.abs(track[index].at * plan.fps - Math.round(track[index].at * plan.fps)) < 1e-8);
        if (index) assert.ok(track[index].at > track[index - 1].at);
      }
    }
    assert.deepEqual(plan.timeline.map(beat => beat.from), [0, 56, 169, 225, 394]);
    assert.equal(plan.timeline.at(-1).from + plan.timeline.at(-1).frames, 450);
  }
});

test('every visual event and section handoff remains within half a video frame of its music cue', () => {
  for (const ratio of ['16:9', '9:16', '1:1']) {
    const project = createForgeProject(ratio), plan = good(project), music = composeMusicScore(plan);
    const eventBeats = [2, 4, 5, 7, 9, 12, 14, 16, 20, 24, 28, 30];
    assert.equal(project.continuity.soundEvents.length, eventBeats.length);
    project.continuity.soundEvents.forEach((event, index) => {
      const cue = music.timeline.beatsAt[eventBeats[index]];
      assert.ok(Math.abs(event.at - cue.at) <= .5 / plan.fps + 1e-9, `${event.id} misses music beat ${cue.beat}`);
      assert.ok(Math.abs(Math.round(event.at * 48000) - cue.sample) <= 48000 / (2 * plan.fps) + 1);
    });
    plan.timeline.forEach((beat, index) => assert.ok(Math.abs(beat.start - music.timeline.sections[index].at) <= .5 / plan.fps + 1e-9));
    assert.equal(plan.duration, music.duration);
  }
});

test('Forge theme, root settings and nested additions reject guessed unknown fields', () => {
  rejectsAt(project => {project.theme = 'forge-anvil';}, 'project.theme');
  rejectsAt(project => {project.motionPreset = 'industrial';}, 'project.motionPreset');
  rejectsAt(project => {project.continuity.objects[0].appearance.blur = 12;}, 'project.continuity.objects[0].appearance.blur');
  const typography = createForgeProject(), text = textIndex(typography);
  typography.continuity.objects[text].typography.fontFamily = 'remote';
  assert.ok(compileProject(typography).issues.errors.some(issue => issue.path === `project.continuity.objects[${text}].typography.fontFamily`));
  rejectsAt(project => {project.continuity.objects[0].keyframes[0].velocity = 20;}, 'project.continuity.objects[0].keyframes[0].velocity');
  rejectsAt(project => {project.continuity.camera[0].duration = 1;}, 'project.continuity.camera[0].duration');
  rejectsAt(project => {project.continuity.musicScore.seed = 9;}, 'project.continuity.musicScore.seed');
});

test('all controlled easing curves are accepted for object and camera tracks; arbitrary curves fail', () => {
  for (const easing of ['linear', 'ease-out-cubic', 'ease-in-out-cubic', 'ease-out-expo', 'back-out']) {
    const project = createForgeProject();
    project.continuity.objects[0].keyframes[0].easing = easing;
    project.continuity.camera[0].easing = easing;
    good(project);
  }
  for (const easing of ['spring', 'cubic-bezier(0,0,1,1)', null, {}, Infinity]) {
    rejectsAt(project => {project.continuity.objects[0].keyframes[0].easing = easing;}, 'project.continuity.objects[0].keyframes[0].easing');
    rejectsAt(project => {project.continuity.camera[0].easing = easing;}, 'project.continuity.camera[0].easing');
  }
});

test('appearance uses bounded theme tokens rather than arbitrary CSS colors or materials', () => {
  for (const token of ['paper', 'ink', 'muted', 'accent', 'line', 'secondary', 'on-accent', 'canvas', 'heat']) {
    const project = createForgeProject();
    project.continuity.objects[0].color = token;
    project.continuity.objects[0].appearance.fill = token;
    project.continuity.objects[0].appearance.stroke = token;
    good(project);
  }
  for (const value of ['#bfff00', 'rgb(0,0,0)', 'url(https://example.invalid)', false]) {
    rejectsAt(project => {project.continuity.objects[0].appearance.fill = value;}, 'project.continuity.objects[0].appearance.fill');
    rejectsAt(project => {project.continuity.objects[0].appearance.stroke = value;}, 'project.continuity.objects[0].appearance.stroke');
  }
  const transparent = createForgeProject(); transparent.continuity.objects[0].appearance.fill = 'transparent'; good(transparent);
  rejectsAt(project => {project.continuity.objects[0].appearance.stroke = 'transparent';}, 'project.continuity.objects[0].appearance.stroke');
  rejectsAt(project => {project.continuity.objects[0].appearance.shadow = 'soft-glow';}, 'project.continuity.objects[0].appearance.shadow');
  rejectsAt(project => {project.continuity.objects[0].appearance.pattern = 'downloaded-metal';}, 'project.continuity.objects[0].appearance.pattern');
  for (const strokeWidth of [-.001, 8.001, NaN, Infinity, '2']) rejectsAt(project => {project.continuity.objects[0].appearance.strokeWidth = strokeWidth;}, 'project.continuity.objects[0].appearance.strokeWidth');
  for (const strokeWidth of [0, 8]) {const project = createForgeProject(); project.continuity.objects[0].appearance.strokeWidth = strokeWidth; good(project);}
});

test('typography bounds reject nonfinite values, unsupported weight and alignment', () => {
  for (const [key, values] of [['size', [23.99, 160.01, NaN, Infinity, '72']], ['weight', [300, 550, 1000, '900', true]], ['tracking', [-6.001, 8.001, NaN, Infinity]], ['align', ['justify', 'start', null]]]) {
    for (const value of values) {
      const project = createForgeProject(), index = textIndex(project);
      project.continuity.objects[index].typography[key] = value;
      const plan = compileProject(project);
      assert.ok(plan.issues.errors.some(issue => issue.path === `project.continuity.objects[${index}].typography.${key}`));
    }
  }
  for (const weight of [400, 500, 600, 700, 800, 900]) {
    const project = createForgeProject(); project.continuity.objects[textIndex(project)].typography.weight = weight; good(project);
  }
  for (const size of [24, 160]) {
    const project = createForgeProject(); project.continuity.objects[textIndex(project)].typography.size = size; good(project);
  }
  for (const tracking of [-6, 8]) {
    const project = createForgeProject(); project.continuity.objects[textIndex(project)].typography.tracking = tracking; good(project);
  }
  rejectsAt(project => {project.continuity.objects[0].typography = {size: 40};}, 'project.continuity.objects[0].typography');
});

test('line height permits only its finite bounded multiplier on text and UI typography', () => {
  for (const lineHeight of [1.15, 1.55, 1.7]) {
    for (const kind of ['text', 'ui']) {
      const project = createForgeProject(), index = textIndex(project);
      project.continuity.objects[index].kind = kind;
      if (kind === 'ui') project.continuity.objects[index].rows = ['原创界面说明'];
      project.continuity.objects[index].typography.lineHeight = lineHeight;
      good(project);
    }
  }
  for (const lineHeight of [1.149999, 1.700001, 0, -1, NaN, Infinity, -Infinity, '1.55', null, true, {}, []]) {
    const project = createForgeProject(), index = textIndex(project);
    project.continuity.objects[index].typography.lineHeight = lineHeight;
    assert.ok(compileProject(project).issues.errors.some(issue => issue.path === `project.continuity.objects[${index}].typography.lineHeight`));
  }
  const omitted = createForgeProject(), index = textIndex(omitted);
  delete omitted.continuity.objects[index].typography.lineHeight;
  const before = structuredClone(omitted);
  good(deepFreeze(omitted));
  assert.deepEqual(omitted, before, 'default line height must not mutate authored JSON');
  const unknown = createForgeProject(), unknownIndex = textIndex(unknown);
  unknown.continuity.objects[unknownIndex].typography.lineSpacing = 1.55;
  assert.ok(compileProject(unknown).issues.errors.some(issue => issue.path === `project.continuity.objects[${unknownIndex}].typography.lineSpacing`));
  rejectsAt(project => {project.continuity.objects[0].typography = {lineHeight: 1.55};}, 'project.continuity.objects[0].typography');
});

test('malformed nested styles are errors and legal optional appearance tokens remain accepted', () => {
  for (const malformed of [null, [], true, 'style']) {
    rejectsAt(project => {project.continuity.objects[0].appearance = malformed;}, 'project.continuity.objects[0].appearance');
    const project = createForgeProject(), index = textIndex(project);
    project.continuity.objects[index].typography = malformed;
    assert.ok(compileProject(project).issues.errors.some(issue => issue.path === `project.continuity.objects[${index}].typography`));
  }
  for (const pattern of ['none', 'film-perforation', 'stripe', 'waveform']) {
    const project = createForgeProject(); project.continuity.objects[0].appearance.pattern = pattern; good(project);
  }
  for (const shadow of ['none', 'stamp']) {
    const project = createForgeProject(); project.continuity.objects[0].appearance.shadow = shadow; good(project);
  }
});

test('original score enforces its exact configuration and 15-second production clock', () => {
  for (const [key, value] of [['style', 'bleeps'], ['bpm', 140], ['bpm', '128'], ['volume', .049], ['volume', 1.001], ['volume', NaN], ['volume', Infinity], ['volume', '.8']]) {
    rejectsAt(project => {project.continuity.musicScore[key] = value;}, `project.continuity.musicScore.${key}`);
  }
  rejectsAt(project => {project.shots.at(-1).duration -= 1 / 30;}, 'project.continuity.musicScore');
  for (const malformed of [null, [], true, 'forge-breakbeat']) rejectsAt(project => {project.continuity.musicScore = malformed;}, 'project.continuity.musicScore');
  for (const volume of [.05, 1]) {const project = createForgeProject(); project.continuity.musicScore.volume = volume; good(project);}
});

test('original score cannot collide with a valid local external music asset', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-forge-asset-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  fs.writeFileSync(path.join(directory, 'bed.wav'), 'contract file fixture only');
  const project = createForgeProject();
  copyProjectAssets(project, directory);
  project.assets.push({id: 'bed', path: 'bed.wav', kind: 'audio', source: 'original', rights: '本测试自建文件'});
  project.music = {assetId: 'bed', volume: .2};
  const plan = compileProject(project, {baseDir: directory});
  assert.ok(plan.issues.errors.some(issue => issue.path === 'project.continuity.musicScore' && /互斥/u.test(issue.message)));
  delete project.continuity.musicScore;
  assert.deepEqual(compileProject(project, {baseDir: directory}).issues.errors, []);
});

test('source templates are fresh objects and frozen author input remains unchanged when sampled', () => {
  const first = createForgeProject(), second = createForgeProject();
  first.continuity.objects[0].keyframes[0].x += 100;
  assert.notEqual(first.continuity.objects[0].keyframes[0].x, second.continuity.objects[0].keyframes[0].x);
  const before = structuredClone(second); deepFreeze(second);
  const plan = good(second);
  for (const at of [0, .72, 1.875, 5.625, 7.5, 13.125, 14.0625, 15]) {
    const world = sampleContinuity(second.continuity, at, plan.width, plan.height);
    assert.equal(world.objects.length, second.continuity.objects.length);
    assert.ok(world.objects.every(object => object.w > 0 && object.h > 0 && object.opacity >= 0 && object.opacity <= 1));
  }
  assert.deepEqual(second, before);
});

test('native images need an existing registered image ID and may retain legal caption text', () => {
  const project = createForgeProject(), index = imageIndex(project);
  project.continuity.objects[index].text = '原创画面说明';
  good(project);
  for (const assetId of [undefined, null, '', 'missing-image', 'https://example.invalid/frame.png', 1, {}]) {
    const edited = createForgeProject(), image = imageIndex(edited);
    edited.continuity.objects[image].assetId = assetId;
    assert.ok(compileProject(edited).issues.errors.some(issue => issue.path === `project.continuity.objects[${image}].assetId`));
  }
  const noRegistry = createForgeProject(); delete noRegistry.assets;
  assert.ok(compileProject(noRegistry).issues.errors.some(issue => issue.path === `project.continuity.objects[${imageIndex(noRegistry)}].assetId`));
});

test('registered audio and video cannot be passed off as native image assets', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-forge-image-kind-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  for (const kind of ['audio', 'video']) {
    const project = createForgeProject(), index = imageIndex(project);
    copyProjectAssets(project, directory);
    const relative = kind === 'audio' ? 'wrong.wav' : 'wrong.mp4';
    if (kind === 'audio') toneWav(path.join(directory, relative), 220, .03);
    else fs.copyFileSync(path.join(PROJECT_BASE, 'media-original.mp4'), path.join(directory, relative));
    project.assets.push({id: 'wrong-kind', path: relative, kind, source: 'original', rights: '本测试本地声音或原创媒体夹具'});
    project.continuity.objects[index].assetId = 'wrong-kind';
    const plan = compileProject(project, {baseDir: directory});
    assert.ok(plan.issues.errors.some(issue => issue.path === `project.continuity.objects[${index}].assetId`));
    assert.equal(plan.issues.errors.some(issue => issue.path.startsWith('project.assets')), false, 'registration itself must be legal; object-kind mismatch is the only target');
  }
});

test('assetId cannot silently attach a bitmap to any non-image object kind', () => {
  for (const kind of ['surface', 'text', 'dot', 'line', 'ui']) {
    const project = createForgeProject(), index = imageIndex(project);
    project.continuity.objects[index].kind = kind;
    if (kind === 'text') project.continuity.objects[index].text = '文字夹具';
    if (kind === 'ui') project.continuity.objects[index].rows = ['界面夹具'];
    assert.ok(compileProject(project).issues.errors.some(issue => issue.path === `project.continuity.objects[${index}].assetId`));
  }
});

test('native image registration still rejects missing files, traversal, URLs and symlinks', t => {
  for (const assetPath of ['missing.png', '../outside.png', 'https://example.invalid/asset.png', '/tmp/foreign.png']) {
    const project = createForgeProject(); project.assets[0].path = assetPath;
    assert.ok(compileProject(project).issues.errors.some(issue => issue.path === 'project.assets[0].path'));
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-forge-image-link-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const project = createForgeProject(); copyProjectAssets(project, directory);
  const image = path.join(directory, project.assets[0].path), original = image + '.original';
  fs.renameSync(image, original); fs.symlinkSync(path.basename(original), image);
  assert.ok(compileProject(project, {baseDir: directory}).issues.errors.some(issue => issue.path === 'project.assets[0].path'));
});

test('numeric image caption text needs that image own literal factual claim', () => {
  const project = createForgeProject(), index = imageIndex(project), text = '完成2次原创画面测试';
  project.continuity.objects[index].text = text;
  assert.ok(compileProject(project).issues.errors.some(issue => issue.path === `project.continuity.objects[${index}]`));
  project.facts = [{id: 'image-fact', text, source: '本测试自建原文'}];
  project.continuity.objects[index].claims = [{text, factId: 'image-fact', quote: text}];
  good(project);
  project.continuity.objects[index].claims[0].quote = '其他画面完成2次测试';
  assert.ok(compileProject(project).issues.errors.some(issue => issue.path === `project.continuity.objects[${index}].claims[0].quote`));
});

test('malformed image asset registries return reviewable issues rather than throwing', () => {
  for (const registry of [{}, 'invalid', true, null, [null]]) {
    const project = createForgeProject(); project.assets = registry;
    let plan;
    assert.doesNotThrow(() => {plan = compileProject(project);});
    assert.ok(plan.issues.errors.some(issue => issue.path.startsWith('project.assets')));
    assert.ok(plan.issues.errors.some(issue => issue.path.endsWith('.assetId')));
  }
});

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const run = (command, args, {binary = false} = {}) => {
  const result = spawnSync(command, args, {encoding: binary ? null : 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30_000});
  assert.equal(result.status, 0, String(result.error?.message ?? result.stderr));
  return result.stdout;
};
const productionMux = () => {
  const source = fs.readFileSync(new URL('../make.mjs', import.meta.url), 'utf8');
  const begin = source.indexOf('function mux('), end = source.indexOf('\nasync function build(', begin);
  assert.ok(begin >= 0 && end > begin, 'production mux function must remain locatable');
  return new Function('fs', 'path', 'run', 'ffmpeg', source.slice(begin, end) + '\nreturn mux;')(fs, path, (command, args) => run(command, args), FFMPEG);
};
const toneWav = (file, frequency, gain, from = 0, to = 3) => {
  const rate = 48000, count = rate * 3, wav = Buffer.alloc(44 + count * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(count * 4, 40);
  for (let index = 0; index < count; index++) {
    const at = index / rate;
    const envelope = Math.max(0, Math.min(1, (at - from) / .005, (to - at) / .02));
    const sample = Math.round(Math.sin(2 * Math.PI * frequency * at) * gain * envelope * 32767);
    wav.writeInt16LE(sample, 44 + index * 4); wav.writeInt16LE(sample, 46 + index * 4);
  }
  fs.writeFileSync(file, wav);
};
const frequencyAmplitude = (file, frequency, from = 1.4, duration = .4) => {
  const pcm = run(FFMPEG, ['-v', 'error', '-ss', String(from), '-i', file, '-t', String(duration), '-vn', '-ac', '2', '-ar', '48000', '-f', 'f32le', '-'], {binary: true});
  const count = pcm.length / 8;
  assert.ok(count > 18000, 'actual AAC audio must decode the measurement window');
  let real = 0, imaginary = 0;
  for (let index = 0; index < count; index++) {
    // Measure the decoded left channel directly. A default stereo-to-mono
    // matrix can add 3 dB to identical channels and distort gain assertions.
    const sample = pcm.readFloatLE(index * 8), angle = 2 * Math.PI * frequency * index / 48000;
    assert.ok(Number.isFinite(sample));
    real += sample * Math.cos(angle); imaginary += sample * Math.sin(angle);
  }
  return Math.hypot(real, imaginary) * 2 / count;
};

test('actual production mux keeps BGM under object events and ducks it only under narration', t => {
  run(FFMPEG, ['-version']);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-forge-mux-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const bed = path.join(directory, 'bed.wav'), voice = path.join(directory, 'voice.wav'), effects = path.join(directory, 'events.wav');
  toneWav(bed, 440, .12);
  toneWav(voice, 900, .32, 1, 2.4);
  toneWav(effects, 1900, .24, 1, 2.4);
  const sourceVideo = path.join(directory, 'source.mp4');
  run(FFMPEG, ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30:d=3', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', sourceVideo]);
  // Execute the actual local production mux function without changing its
  // exports or invoking the renderer. Extraction locates the function only;
  // pass/fail comes from real FFmpeg encodes and independent AAC decoding.
  const mux = productionMux();
  const outputs = {};
  for (const [id, narration, events] of [['bed', false, false], ['events', false, true], ['voice', true, false], ['both', true, true]]) {
    const out = path.join(directory, id); fs.mkdirSync(out);
    const silent = path.join(out, 'silent.mp4'); fs.copyFileSync(sourceVideo, silent);
    const plan = {duration: 3, project: narration ? {audio: {assetId: 'voice'}} : {}};
    mux(plan, {voice}, silent, out, events ? effects : null, bed);
    outputs[id] = path.join(out, 'video.mp4');
    assert.equal(fs.existsSync(silent), false, 'production mux completes its owned intermediate cleanup');
  }
  const baseline = frequencyAmplitude(outputs.bed, 440);
  const underEvents = frequencyAmplitude(outputs.events, 440);
  const underVoice = frequencyAmplitude(outputs.voice, 440);
  const underBoth = frequencyAmplitude(outputs.both, 440);
  t.diagnostic(JSON.stringify({measurement: 'decoded AAC left-channel tone amplitudes', bed: baseline,
    eventsBedRatio: underEvents / baseline, voiceBedRatio: underVoice / baseline, eventsDuringVoiceRatio: underBoth / underVoice}));
  assert.ok(baseline > .10 && baseline < .14, `native score gain is applied once: ${baseline}`);
  assert.ok(underEvents / baseline > .9, `object events drained BGM: ${underEvents / baseline}`);
  assert.ok(underVoice / baseline < .45, `narration did not duck BGM: ${underVoice / baseline}`);
  assert.ok(underBoth / underVoice > .85 && underBoth / underVoice < 1.15, `events altered narration-only ducking: ${underBoth / underVoice}`);
  assert.ok(frequencyAmplitude(outputs.voice, 900) > .25, 'narration remains in the actual mix');
  assert.ok(frequencyAmplitude(outputs.events, 1900) > .18, 'object event remains in the actual mix');
  assert.ok(frequencyAmplitude(outputs.voice, 440, .4) / baseline > .85, 'music remains present before narration');
});

test('real encoded music-only media is recognized by the Python checker without voice, external music or soundEvents', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-forge-music-only-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const localPython = path.join(root, '.venv', 'bin', 'python');
  const python = process.env.HEIGE_PYTHON ?? (fs.existsSync(localPython) ? localPython : 'python3');
  const source = path.join(directory, 'source.mp4'), bed = path.join(directory, 'score.wav');
  run(FFMPEG, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=64x64:r=30:d=2', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]);
  toneWav(bed, 440, .12);
  // This isolates the checker over a tiny real encoding. The checker does not
  // compile the fifteen-second composition; it checks the supplied media clock.
  const plan = {width: 64, height: 64, fps: 30, duration: 2, durationInFrames: 60, timeline: [],
    project: {continuity: {musicScore: {style: 'forge-breakbeat', bpm: 128, volume: .8}}}};
  const out = path.join(directory, 'mixed'); fs.mkdirSync(out);
  const silent = path.join(out, 'silent.mp4'); fs.copyFileSync(source, silent);
  productionMux()(plan, {}, silent, out, null, bed);
  const planFile = path.join(directory, 'plan.json'); fs.writeFileSync(planFile, JSON.stringify(plan));
  const checker = path.join(root, 'studio', 'check_media.py');
  const stdout = run(python, [checker, 'check', '--video', path.join(out, 'video.mp4'), '--plan', planFile, '--out', out]);
  assert.equal(JSON.parse(stdout).status, 'pass');
  const measured = JSON.parse(fs.readFileSync(path.join(out, 'media-check.json'), 'utf8'));
  assert.equal(measured.audio.present, true);
  assert.equal(measured.audio.finite, true);
  assert.ok(measured.audio.rms > .01);
  assert.equal(measured.pixel_scan.decoded_frames, 60);
  assert.equal(measured.errors.length, 0);
  const noTrack = path.join(directory, 'missing-track'); fs.mkdirSync(noTrack);
  const rejected = spawnSync(python, [checker, 'check', '--video', source, '--plan', planFile, '--out', noTrack], {encoding: 'utf8', timeout: 30_000});
  assert.equal(rejected.status, 3, rejected.stderr);
  const absence = JSON.parse(fs.readFileSync(path.join(noTrack, 'media-check.json'), 'utf8'));
  assert.equal(absence.audio.present, false);
  assert.ok(absence.errors.includes('Expected audio track presence mismatch'), 'declared score without audio must not falsely pass');
});

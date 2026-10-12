import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {compileProject} from '../lib/project.mjs';

const objectFrame = (at, x = 100) => ({at, x, y: 100, w: 200, h: 60, opacity: 1, rotation: 0, radius: 12});
const cameraFrame = (at) => ({at, x: 640, y: 360, zoom: 1, rotation: 0});
const fixture = () => ({
  schemaVersion: 'heige-video/4', title: '连续对象契约测试', mode: 'promo', ratio: '16:9', theme: 'ledger',
  shots: [
    {id: 'opening', type: 'beat', title: '出现', duration: 2},
    {id: 'move', type: 'beat', title: '转变', duration: 2},
    {id: 'resolve', type: 'beat', title: '落定', duration: 2},
  ],
  continuity: {
    objects: [{id: 'record', semanticIdentity: '从列表进入归组的同一条记录', kind: 'text', text: '同一条记录', color: 'ink', keyframes: [objectFrame(0), objectFrame(3, 500), objectFrame(6, 800)]}],
    camera: [cameraFrame(0), cameraFrame(6)],
    boundaries: [
      {fromShot: 'opening', toShot: 'move', carrier: 'record', cause: '记录被选中', outcome: '记录进入下一组'},
      {fromShot: 'move', toShot: 'resolve', carrier: 'record', cause: '位置确认', outcome: '同一记录保持身份落定'},
    ],
    soundEvents: [{id: 'contact', at: 3, objectId: 'record', type: 'tick', volume: .2}],
    blur: {samples: 3, shutterAngle: 180},
  },
});
const good = (project, options) => {
  const plan = compileProject(project, options);
  assert.deepEqual(plan.issues.errors, []);
  return plan;
};
const rejectsAt = (project, expectedPath, options) => {
  const plan = compileProject(project, options);
  assert.ok(plan.issues.errors.some(issue => issue.path === expectedPath), `Expected ${expectedPath}: ${JSON.stringify(plan.issues)}`);
  return plan;
};
const mutate = (change) => {
  const project = fixture();
  change(project);
  return project;
};
const deepFreeze = (value) => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};
const quotedProject = (copy = '甲有2次记录') => {
  const project = fixture();
  const evidence = '甲有2次记录，乙有8次记录。';
  project.facts = [{id: 'records', text: evidence, source: '本测试自建事实'}];
  project.continuity.objects[0].text = copy;
  project.continuity.objects[0].claims = [{text: copy, factId: 'records', quote: evidence}];
  return project;
};

test('a valid continuous world compiles into adjacent beats on one final frame clock', () => {
  for (const fps of [24, 30]) {
    const project = fixture();
    project.fps = fps;
    const plan = good(project);
    assert.equal(plan.duration, 6);
    assert.equal(plan.durationInFrames, 6 * fps);
    assert.deepEqual(plan.timeline.map(beat => [beat.id, beat.from, beat.frames]), [['opening', 0, 2 * fps], ['move', 2 * fps, 2 * fps], ['resolve', 4 * fps, 2 * fps]]);
    assert.equal(plan.previewOnly, false);
  }
});

test('unknown fields are rejected at every nested continuous contract level', () => {
  const cases = [
    [p => {p.continuity.network = false;}, 'project.continuity.network'],
    [p => {p.continuity.objects[0].assetUrl = 'https://example.invalid/object.png';}, 'project.continuity.objects[0].assetUrl'],
    [p => {p.continuity.objects[0].keyframes[1].ease = 'spring';}, 'project.continuity.objects[0].keyframes[1].ease'],
    [p => {p.continuity.camera[0].lens = 50;}, 'project.continuity.camera[0].lens'],
    [p => {p.continuity.boundaries[0].approved = true;}, 'project.continuity.boundaries[0].approved'],
    [p => {p.continuity.soundEvents[0].file = 'effect.wav';}, 'project.continuity.soundEvents[0].file'],
    [p => {p.continuity.blur.quality = 'best';}, 'project.continuity.blur.quality'],
  ];
  for (const [change, expected] of cases) rejectsAt(mutate(change), expected);
  const claim = quotedProject();
  claim.continuity.objects[0].claims[0].trust = true;
  rejectsAt(claim, 'project.continuity.objects[0].claims[0].trust');
});

test('malformed continuous JSON structures return issues rather than throwing', () => {
  for (const malformed of [null, [], 'world']) rejectsAt(mutate(p => {p.continuity = malformed;}), 'project.continuity');
  const cases = [
    [p => {p.continuity.objects = {};}, 'project.continuity.objects'],
    [p => {p.continuity.objects[0] = null;}, 'project.continuity.objects[0]'],
    [p => {p.continuity.objects[0].keyframes[1] = [];}, 'project.continuity.objects[0].keyframes[1]'],
    [p => {p.continuity.camera = 'camera';}, 'project.continuity.camera'],
    [p => {p.continuity.camera[0] = null;}, 'project.continuity.camera[0]'],
    [p => {p.continuity.boundaries[0] = false;}, 'project.continuity.boundaries[0]'],
    [p => {p.continuity.soundEvents = {};}, 'project.continuity.soundEvents'],
    [p => {p.continuity.soundEvents[0] = [];}, 'project.continuity.soundEvents[0]'],
    [p => {p.continuity.blur = null;}, 'project.continuity.blur'],
  ];
  for (const [change, expected] of cases) rejectsAt(mutate(change), expected);
});

test('object, camera and sound numeric fields reject NaN and either infinity', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    for (const key of ['at', 'x', 'y', 'w', 'h', 'opacity', 'rotation', 'radius']) {
      rejectsAt(mutate(p => {p.continuity.objects[0].keyframes[1][key] = bad;}), `project.continuity.objects[0].keyframes[1].${key}`);
    }
    for (const key of ['at', 'x', 'y', 'zoom', 'rotation']) {
      rejectsAt(mutate(p => {p.continuity.camera[1][key] = bad;}), `project.continuity.camera[1].${key}`);
    }
    for (const key of ['at', 'volume']) {
      rejectsAt(mutate(p => {p.continuity.soundEvents[0][key] = bad;}), `project.continuity.soundEvents[0].${key}`);
    }
    for (const key of ['samples', 'shutterAngle']) {
      rejectsAt(mutate(p => {p.continuity.blur[key] = bad;}), `project.continuity.blur.${key}`);
    }
  }
});

test('numeric strings and omitted coordinates cannot be coerced into valid keyframes', () => {
  for (const key of ['at', 'x', 'y', 'w', 'h', 'opacity', 'rotation', 'radius']) {
    rejectsAt(mutate(p => {p.continuity.objects[0].keyframes[1][key] = '1';}), `project.continuity.objects[0].keyframes[1].${key}`);
    rejectsAt(mutate(p => {delete p.continuity.objects[0].keyframes[1][key];}), `project.continuity.objects[0].keyframes[1].${key}`);
  }
});

test('object IDs must be valid and unique regardless of identical geometry', () => {
  for (const invalid of ['', 'record with space', '../record', 123, 'a'.repeat(65)]) {
    rejectsAt(mutate(p => {p.continuity.objects[0].id = invalid;}), 'project.continuity.objects[0].id');
  }
  rejectsAt(mutate(p => {p.continuity.objects.push(structuredClone(p.continuity.objects[0]));}), 'project.continuity.objects[1].id');
  const valid = fixture();
  valid.continuity.objects.push({...structuredClone(valid.continuity.objects[0]), id: 'another-record'});
  good(valid);
});

test('semantic identity is required text and unknown semantic fields cannot masquerade as supported behavior', () => {
  for (const invalid of [undefined, '', ' '.repeat(3), {id: 'record'}, '字'.repeat(121)]) {
    rejectsAt(mutate(p => {p.continuity.objects[0].semanticIdentity = invalid;}), 'project.continuity.objects[0].semanticIdentity');
  }
  for (const key of ['semantic', 'semanticId', 'identity', 'action', 'state', 'velocity']) {
    rejectsAt(mutate(p => {p.continuity.objects[0][key] = 'declared';}), `project.continuity.objects[0].${key}`);
  }
});

test('every persistent object and camera must cover zero through the quantized final frame', () => {
  for (const trajectory of ['object', 'camera']) {
    for (const [index, value] of [[0, .01], [-1, 5.99], [-1, 6.01]]) {
      const project = fixture();
      const frames = trajectory === 'object' ? project.continuity.objects[0].keyframes : project.continuity.camera;
      frames.at(index).at = value;
      rejectsAt(project, trajectory === 'object' ? 'project.continuity.objects[0].keyframes' : 'project.continuity.camera');
    }
  }
  const rounded = fixture();
  rounded.shots.forEach(beat => {beat.duration = 2.013;});
  const plan = good(rounded);
  assert.equal(plan.duration, 6);
  rounded.continuity.objects[0].keyframes.at(-1).at = 6.039;
  rejectsAt(rounded, 'project.continuity.objects[0].keyframes');
});

test('same-time double states and time reversal are rejected on both object and camera trajectories', () => {
  for (const time of [0, 3, 2.9]) {
    const project = fixture();
    project.continuity.objects[0].keyframes.splice(2, 0, objectFrame(time, 700));
    rejectsAt(project, 'project.continuity.objects[0].keyframes[2].at');
  }
  for (const time of [0, -.1]) {
    const project = fixture();
    project.continuity.camera.splice(1, 0, cameraFrame(time));
    rejectsAt(project, 'project.continuity.camera[1].at');
  }
});

test('all objects need complete trajectories, including newly introduced carriers', () => {
  for (const keyframes of [undefined, [], [objectFrame(0)]]) {
    rejectsAt(mutate(p => {p.continuity.objects[0].keyframes = keyframes;}), 'project.continuity.objects[0].keyframes');
  }
  const project = fixture();
  project.continuity.objects.push({id: 'late-object', semanticIdentity: '新增对象', kind: 'dot', keyframes: [objectFrame(1), objectFrame(6)]});
  rejectsAt(project, 'project.continuity.objects[1].keyframes');
  project.continuity.objects[1].keyframes[0].at = 0;
  good(project);
});

test('camera zoom bounds are finite, positive and explicit', () => {
  for (const zoom of [undefined, null, '1', 0, -.5, .1249, 8.001]) {
    rejectsAt(mutate(p => {p.continuity.camera[0].zoom = zoom;}), 'project.continuity.camera[0].zoom');
  }
  for (const zoom of [.125, 8]) good(mutate(p => {p.continuity.camera[0].zoom = zoom;}));
});

test('invalid dimensions, opacity, radius and transform bounds fail before rendering', () => {
  for (const [key, value] of [['w', 0], ['h', 4001], ['x', -12001], ['y', 12001], ['opacity', -.001], ['opacity', 1.001], ['radius', -1], ['radius', 2001], ['rotation', 361]]) {
    rejectsAt(mutate(p => {p.continuity.objects[0].keyframes[1][key] = value;}), `project.continuity.objects[0].keyframes[1].${key}`);
  }
});

test('every adjacent beat boundary is mandatory and declared exactly once in order', () => {
  for (const boundaries of [undefined, [], [fixture().continuity.boundaries[0]], [...fixture().continuity.boundaries, fixture().continuity.boundaries[1]]]) {
    rejectsAt(mutate(p => {p.continuity.boundaries = boundaries;}), 'project.continuity.boundaries');
  }
  rejectsAt(mutate(p => {p.continuity.boundaries[1] = structuredClone(p.continuity.boundaries[0]);}), 'project.continuity.boundaries[1]');
  rejectsAt(mutate(p => {p.continuity.boundaries.reverse();}), 'project.continuity.boundaries[0]');
  rejectsAt(mutate(p => {p.continuity.boundaries[0].toShot = 'resolve';}), 'project.continuity.boundaries[0]');
  rejectsAt(mutate(p => {p.continuity.boundaries[0].fromShot = 'invented';}), 'project.continuity.boundaries[0]');
});

test('a declared boundary needs an existing carrier and explicit cause and outcome', () => {
  for (const carrier of [undefined, 'missing-object', 0]) {
    rejectsAt(mutate(p => {p.continuity.boundaries[0].carrier = carrier;}), 'project.continuity.boundaries[0].carrier');
  }
  for (const key of ['cause', 'outcome']) {
    for (const invalid of [undefined, '', false, '字'.repeat(241)]) {
      rejectsAt(mutate(p => {p.continuity.boundaries[0][key] = invalid;}), `project.continuity.boundaries[0].${key}`);
    }
  }
});

test('beat cannot compile without a continuous world and ordinary components cannot be silently mixed in', () => {
  rejectsAt(mutate(p => {delete p.continuity;}), 'project.shots[0].type');
  for (const type of ['hook', 'statement', 'end']) {
    rejectsAt(mutate(p => {p.shots[1].type = type;}), 'project.shots');
  }
  rejectsAt(mutate(p => {p.shots[1].type = 'unknown';}), 'project.shots[1].type');
});

test('continuous world limits reject empty inventory, one beat and unvalidated long duration', () => {
  rejectsAt(mutate(p => {p.continuity.objects = [];}), 'project.continuity.objects');
  rejectsAt(mutate(p => {p.shots = p.shots.slice(0, 1); p.continuity.boundaries = [];}), 'project.continuity');
  const maximum = fixture();
  maximum.shots.forEach(beat => {beat.duration = 20;});
  maximum.continuity.objects[0].keyframes = [objectFrame(0), objectFrame(60)];
  maximum.continuity.camera = [cameraFrame(0), cameraFrame(60)];
  good(maximum);
  maximum.shots.push({id: 'extra', type: 'beat', title: '继续', duration: 1});
  rejectsAt(maximum, 'project.continuity');
});

test('visible numeric object text requires the object own claim, not a beat or sibling claim', () => {
  const project = quotedProject();
  good(project, {briefText: project.facts[0].text});
  const claim = structuredClone(project.continuity.objects[0].claims[0]);
  delete project.continuity.objects[0].claims;
  project.shots[0].claims = [claim];
  rejectsAt(project, 'project.continuity.objects[0]');
  project.continuity.objects.push({...structuredClone(project.continuity.objects[0]), id: 'other', claims: [claim]});
  rejectsAt(project, 'project.continuity.objects[0]');
  project.continuity.objects[0].claims = [claim];
  good(project);
});

test('object claim must cite its own existing fact and literal source quote', () => {
  const missing = quotedProject();
  missing.continuity.objects[0].claims[0].factId = 'missing';
  rejectsAt(missing, 'project.continuity.objects[0].claims[0].factId');
  const wrongFact = quotedProject();
  wrongFact.facts.push({id: 'other', text: '乙有8次记录。', source: '另一测试事实'});
  wrongFact.continuity.objects[0].claims[0].factId = 'other';
  rejectsAt(wrongFact, 'project.continuity.objects[0].claims[0].quote');
  rejectsAt(quotedProject(), 'project.continuity.objects[0].claims[0].quote', {briefText: '简报没有该引文'});
  const paraphrase = quotedProject('甲耗时2小时');
  rejectsAt(paraphrase, 'project.continuity.objects[0].claims[0].text');
});

test('UI rows require own literal claims and cannot swap subjects or borrow quantities from one quote', () => {
  const project = quotedProject();
  const object = project.continuity.objects[0];
  object.kind = 'ui';
  object.text = '分组记录';
  object.rows = ['甲有2次记录', '乙有8次记录'];
  object.claims = [{text: project.facts[0].text, factId: 'records', quote: project.facts[0].text}];
  good(project);
  object.rows = ['甲有8次记录', '乙有2次记录'];
  rejectsAt(project, 'project.continuity.objects[0]');
  object.rows = ['甲有2次记录', '乙有8次记录'];
  delete object.claims;
  rejectsAt(project, 'project.continuity.objects[0]');
});

test('fullwidth and Chinese numeric copy obey the same own-claim rule while ordinary words remain usable', () => {
  for (const text of ['利润提升１２％', '效率提升八成', '百分之八十']) {
    rejectsAt(mutate(p => {p.continuity.objects[0].text = text;}), 'project.continuity.objects[0]');
    const project = fixture();
    project.continuity.objects[0].text = text;
    project.facts = [{id: 'literal', text, source: '本测试自建引文'}];
    project.continuity.objects[0].claims = [{text, factId: 'literal', quote: text}];
    good(project, {briefText: text});
  }
  good(mutate(p => {p.continuity.objects[0].text = '一键整理，一件事';}));
});

test('demoData permits declared demonstration quantities but does not accept invalid supplied claims', () => {
  const project = fixture();
  project.demoData = true;
  project.continuity.objects[0].text = '演示数据提升12%';
  good(project);
  project.continuity.objects[0].claims = [{text: '演示数据提升12%', factId: 'made-up', quote: '演示数据提升12%'}];
  rejectsAt(project, 'project.continuity.objects[0].claims[0].factId');
});

test('row and text content retain strict kind, shape and length limits', () => {
  rejectsAt(mutate(p => {delete p.continuity.objects[0].text;}), 'project.continuity.objects[0].text');
  rejectsAt(mutate(p => {p.continuity.objects[0].text = '字'.repeat(161);}), 'project.continuity.objects[0].text');
  rejectsAt(mutate(p => {p.continuity.objects[0].rows = ['可见行'];}), 'project.continuity.objects[0].rows');
  for (const rows of [[], {}, [''], [{label: 'unsupported'}], ['字'.repeat(65)], Array(7).fill('条目')]) {
    const project = mutate(p => {p.continuity.objects[0].kind = 'ui'; p.continuity.objects[0].rows = rows;});
    const expected = Array.isArray(rows) && rows.length > 0 && rows.length <= 6 ? 'project.continuity.objects[0].rows[0]' : 'project.continuity.objects[0].rows';
    rejectsAt(project, expected);
  }
});

test('sound events must bind an existing object, valid unique ID and supported material', () => {
  for (const objectId of [undefined, 'absent', 123]) {
    rejectsAt(mutate(p => {p.continuity.soundEvents[0].objectId = objectId;}), 'project.continuity.soundEvents[0].objectId');
  }
  for (const id of [undefined, '', '../event', 'contains space']) {
    rejectsAt(mutate(p => {p.continuity.soundEvents[0].id = id;}), 'project.continuity.soundEvents[0].id');
  }
  rejectsAt(mutate(p => {p.continuity.soundEvents.push({...p.continuity.soundEvents[0], at: 4});}), 'project.continuity.soundEvents[1].id');
  rejectsAt(mutate(p => {p.continuity.soundEvents[0].type = 'file';}), 'project.continuity.soundEvents[0].type');
  for (const type of ['tick', 'whoosh', 'impact']) good(mutate(p => {p.continuity.soundEvents[0].type = type;}));
});

test('sound event clock excludes the frame after film completion and volume stays bounded', () => {
  for (const at of [-.01, 6, 6.1, '3']) {
    rejectsAt(mutate(p => {p.continuity.soundEvents[0].at = at;}), 'project.continuity.soundEvents[0].at');
  }
  for (const volume of [undefined, 0, -.01, .701, '0.2']) {
    rejectsAt(mutate(p => {p.continuity.soundEvents[0].volume = volume;}), 'project.continuity.soundEvents[0].volume');
  }
  for (const at of [0, 6 - 1 / 30]) good(mutate(p => {p.continuity.soundEvents[0].at = at;}));
  good(mutate(p => {delete p.continuity.soundEvents;}));
});

test('blur accepts only the explicit supported sample and shutter pair', () => {
  for (const samples of [undefined, 0, 2, 4, '3']) {
    rejectsAt(mutate(p => {p.continuity.blur.samples = samples;}), 'project.continuity.blur.samples');
  }
  for (const shutterAngle of [undefined, 0, 90, 360, '180']) {
    rejectsAt(mutate(p => {p.continuity.blur.shutterAngle = shutterAngle;}), 'project.continuity.blur.shutterAngle');
  }
  for (const samples of [1, 3]) good(mutate(p => {p.continuity.blur.samples = samples;}));
  good(mutate(p => {delete p.continuity.blur;}));
});

test('actual local audio and SRT bind continuous trajectory tails to the quantized audio clock', t => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-continuous-contract-'));
  t.after(() => fs.rmSync(baseDir, {recursive: true, force: true}));
  // Valid silence WAV bytes exercise real file validation. This is not an audio quality or decoder test.
  const sampleRate = 8000;
  const samples = 48400;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  fs.writeFileSync(path.join(baseDir, 'voice.wav'), wav);
  fs.writeFileSync(path.join(baseDir, 'captions.srt'), '1\n00:00:00,000 --> 00:00:06,050\n记录完成。\n');
  const project = fixture();
  project.assets = [{id: 'voice', path: 'voice.wav', kind: 'audio', source: 'original', rights: '本测试自建静音 WAV'}];
  project.audio = {assetId: 'voice', kind: 'recording', subtitles: 'captions.srt'};
  project.shots.forEach((beat, index) => {delete beat.duration; beat.start = index * 2; beat.end = index === 2 ? 6.05 : (index + 1) * 2;});
  const audioDuration = samples / sampleRate;
  const finalTime = Math.round(audioDuration * 30) / 30;
  project.continuity.objects[0].keyframes.at(-1).at = finalTime;
  project.continuity.camera.at(-1).at = finalTime;
  const plan = good(project, {baseDir, audioDuration});
  assert.equal(plan.durationInFrames, 182);
  assert.equal(plan.duration, finalTime);
  project.continuity.objects[0].keyframes.at(-1).at = audioDuration;
  rejectsAt(project, 'project.continuity.objects[0].keyframes', {baseDir, audioDuration});
  project.continuity.objects[0].keyframes.at(-1).at = finalTime;
  fs.writeFileSync(path.join(baseDir, 'captions.srt'), '1\n00:00:00,000 --> 00:00:06,067\n记录完成。\n');
  rejectsAt(project, 'project.audio.subtitles.srt[0]', {baseDir, audioDuration});
});

test('valid and rejected compilation leave frozen input trees unchanged', () => {
  for (const project of [fixture(), quotedProject(), mutate(p => {p.continuity.camera[0].zoom = 0; p.continuity.boundaries[1].toShot = 'unknown';})]) {
    const before = structuredClone(project);
    deepFreeze(project);
    let plan;
    assert.doesNotThrow(() => {plan = compileProject(project);});
    assert.deepEqual(project, before);
    assert.equal(plan.project, project);
    assert.ok(plan.timeline.every(beat => beat !== project.shots.find(shot => shot.id === beat.id)));
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {cameraMatrix, easeSegment, projectedObjectRect, sampleContinuity, transformPoint} from '../lib/continuous-motion.mjs';
import runtimeMotion from '../../runtime/motion.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {averageLinearSamples, blurFrames} from '../blur_frames.mjs';
import ts from 'typescript';

const objectKey = (at, extra = {}) => ({at, x: 200, y: 180, w: 240, h: 180, opacity: 1, rotation: 0, radius: 0, ...extra});
const cameraKey = (at, extra = {}) => ({at, x: 640, y: 360, zoom: 1, rotation: 0, ...extra});
const world = () => ({
  objects: [{id: 'receipt-A', semanticIdentity: '同一笔账单', kind: 'ui', text: '账单 A', rows: ['金额１２．５％'], color: 'accent', keyframes: [objectKey(0), objectKey(2, {x: 400}), objectKey(4, {x: 400, w: 360})]}],
  camera: [cameraKey(0), cameraKey(2, {x: 800}), cameraKey(4, {x: 800, zoom: 1.5})],
  boundaries: [{fromShot: 'problem', toShot: 'answer', carrier: 'receipt-A', cause: '同一账单移动', outcome: '账单展开'}],
});

test('actual sampler linearly interpolates object and the single camera', () => {
  const sampled = sampleContinuity(world(), 1, 1280, 720);
  assert.equal(sampled.objects[0].x, 300);
  assert.equal(sampled.camera.x, 720);
  assert.equal(sampled.camera.zoom, 1);
  assert.deepEqual(sampled.camera.matrix, [1, -0, 0, 1, -80, 0]);
});

const easingNames = ['linear', 'ease-out-cubic', 'ease-in-out-cubic', 'ease-out-expo', 'back-out'];
const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

for (const easing of easingNames) {
  test(`${easing} has exact endpoints and clamps only the time domain`, () => {
    for (const p of [-100, -1e-9, 0]) assert.equal(easeSegment(p, easing), 0);
    for (const p of [1, 1 + 1e-9, 100]) assert.equal(easeSegment(p, easing), 1);
    for (let i = 0; i <= 1000; i++) assert.ok(Number.isFinite(easeSegment(i / 1000, easing)));
    if (easing !== 'back-out') {
      let previous = 0;
      for (let i = 0; i <= 1000; i++) {const value = easeSegment(i / 1000, easing); assert.ok(value >= previous && value <= 1); previous = value;}
    }
  });
}

test('fixed curve midpoints produce actual object and camera poses, not a renamed linear interpolation', () => {
  const midpoints = new Map([
    ['linear', .5], ['ease-out-cubic', .875], ['ease-in-out-cubic', .5],
    ['ease-out-expo', 32 / 33], ['back-out', 1.0876975],
  ]);
  for (const [easing, expected] of midpoints) {
    near(easeSegment(.5, easing), expected);
    const input = world(); input.objects[0].keyframes[0].easing = easing; input.camera[0].easing = easing;
    const pose = sampleContinuity(input, 1, 1280, 720);
    near(pose.objects[0].x, 200 + 200 * expected); near(pose.camera.x, 640 + 160 * expected);
  }
});

test('cubic curves agree with the original runtime mathematics at fractional source seconds', () => {
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    near(easeSegment(p, 'linear'), runtimeMotion.linear(p));
    near(easeSegment(p, 'ease-out-cubic'), runtimeMotion.easeOutCubic(p));
    near(easeSegment(p, 'ease-in-out-cubic'), runtimeMotion.easeInOutCubic(p));
  }
});

test('independent finite differences verify fixed curve derivatives including both segment ends', () => {
  const k = 10 * Math.LN2, denominator = 1 - 2 ** -10, back = 1.70158;
  const derivatives = new Map([
    ['linear', () => 1], ['ease-out-cubic', p => 3 * (1 - p) ** 2],
    ['ease-in-out-cubic', p => p < .5 ? 12 * p ** 2 : 12 * (1 - p) ** 2],
    ['ease-out-expo', p => k * Math.exp(-k * p) / denominator],
    ['back-out', p => 3 * (back + 1) * (p - 1) ** 2 + 2 * back * (p - 1)],
  ]);
  const h = 1e-6;
  for (const [easing, derivative] of derivatives) {
    near((easeSegment(h, easing) - easeSegment(0, easing)) / h, derivative(0), 5e-5);
    near((easeSegment(1, easing) - easeSegment(1 - h, easing)) / h, derivative(1), 5e-5);
    for (const p of [.1, .5, .9]) near((easeSegment(p + h, easing) - easeSegment(p - h, easing)) / (2 * h), derivative(p), 5e-5);
  }
  // Normalization removes the conventional exponent's last-frame hard jump.
  assert.ok(1 - easeSegment(1 - 1e-8, 'ease-out-expo') < 1e-9);
});

test('each left key owns its outgoing easing while a differently eased next segment meets exactly', () => {
  const input = world();
  input.objects[0].keyframes[0].easing = 'ease-out-cubic';
  input.objects[0].keyframes[1].easing = 'ease-in-out-cubic';
  input.camera[0].easing = 'ease-out-expo'; input.camera[1].easing = 'linear';
  near(sampleContinuity(input, 1, 1280, 720).objects[0].x, 375);
  near(sampleContinuity(input, 2.5, 1280, 720).objects[0].w, 247.5);
  assert.equal(sampleContinuity(input, 2, 1280, 720).objects[0].x, 400);
  assert.equal(sampleContinuity(input, 2, 1280, 720).objects[0].w, 240);
  near(sampleContinuity(input, 3, 1280, 720).camera.zoom, 1.25);
  for (const time of [2 - 1e-8, 2 + 1e-8]) {
    near(sampleContinuity(input, time, 1280, 720).objects[0].x, 400, 1e-6);
    near(sampleContinuity(input, time, 1280, 720).objects[0].w, 240, 1e-6);
  }
});

test('back-out overshoots only position and rotation while every scalar geometry channel remains legal', () => {
  const input = world(), object = input.objects[0];
  object.keyframes = [objectKey(0, {radius: 16, easing: 'back-out'}), objectKey(2, {x: 400, y: 280, rotation: 30, w: 1e-15, h: .02, opacity: 0, radius: 0})];
  input.camera = [cameraKey(0, {easing: 'back-out'}), cameraKey(2, {x: 800, y: 460, zoom: 1e-15, rotation: 20})];
  const peakTime = 2 * (1 - 2 * 1.70158 / (3 * (1.70158 + 1)));
  const peak = sampleContinuity(input, peakTime, 1280, 720);
  assert.ok(peak.objects[0].x > 400 && peak.objects[0].y > 280 && peak.objects[0].rotation > 30);
  assert.ok(peak.camera.x > 800 && peak.camera.y > 460 && peak.camera.rotation > 20);
  assert.ok(easeSegment(peakTime / 2, 'back-out') > 1.099 && easeSegment(peakTime / 2, 'back-out') < 1.101);
  assert.equal(peak.objects[0].w, 1e-15); assert.equal(peak.objects[0].h, .02);
  assert.equal(peak.objects[0].opacity, 0); assert.equal(peak.objects[0].radius, 0); assert.equal(peak.camera.zoom, 1e-15);
  for (let frame = 0; frame <= 720; frame++) {
    const state = sampleContinuity(input, frame / 360, 1280, 720);
    assert.ok(state.objects[0].w > 0 && state.objects[0].h > 0 && state.camera.zoom > 0);
    assert.ok(state.objects[0].opacity >= 0 && state.objects[0].opacity <= 1 && state.objects[0].radius >= 0);
  }
  assert.equal(sampleContinuity(input, 2, 1280, 720).objects[0].x, 400);
  assert.equal(sampleContinuity(input, 2, 1280, 720).objects[0].rotation, 30);
});

test('omitted easing retains the legacy linear samples for every field and the full authored clock', () => {
  const omitted = world(), explicit = world();
  explicit.objects[0].keyframes.forEach(key => {key.easing = 'linear';}); explicit.camera.forEach(key => {key.easing = 'linear';});
  for (let frame = -2; frame <= 122; frame++) assert.deepEqual(sampleContinuity(omitted, frame / 30, 1280, 720), sampleContinuity(explicit, frame / 30, 1280, 720));
});

test('all eased segments remain deterministic across random seeks and fractional shutter samples', () => {
  const random = runtimeMotion.seededRandom(20261012);
  for (const easing of easingNames) {
    const input = world(); input.objects[0].keyframes.forEach(key => {key.easing = easing;}); input.camera.forEach(key => {key.easing = easing;});
    const original = structuredClone(input), times = Array.from({length: 200}, () => random() * 6 - 1);
    times.push(0, 2, 4, 1 / 180, 2 - 1 / 180, 2 + 1 / 180);
    const first = times.map(time => sampleContinuity(input, time, 720, 1280));
    for (let i = times.length - 1; i >= 0; i--) assert.deepEqual(sampleContinuity(input, times[i], 720, 1280), first[i]);
    assert.deepEqual(input, original);
  }
});

test('nonfinite progress and unsupported easing names fail closed, including inactive future keys', () => {
  for (const progress of [NaN, Infinity, -Infinity, '0.5', null]) assert.throws(() => easeSegment(progress), /finite/);
  for (const easing of [null, 1, '', 'toString', 'ease-out-cubic ', {}, 'spring']) {
    assert.throws(() => easeSegment(.5, easing), /Unknown segment easing/);
    for (const target of ['object', 'camera']) {
      const input = world(), keys = target === 'object' ? input.objects[0].keyframes : input.camera;
      keys.at(-1).easing = easing;
      assert.throws(() => sampleContinuity(input, 0, 1280, 720), /unknown segment easing/);
    }
  }
});

test('controlled static typography and appearance survive sampling without changing legacy output keys', () => {
  const plain = sampleContinuity(world(), 1, 1280, 720).objects[0];
  assert.equal(Object.hasOwn(plain, 'typography'), false); assert.equal(Object.hasOwn(plain, 'appearance'), false);
  const input = world();
  input.objects[0].typography = {size: 96, weight: 800, tracking: -2, align: 'center'};
  input.objects[0].appearance = {fill: 'transparent', stroke: 'accent', strokeWidth: 3, shadow: 'stamp', pattern: 'film-perforation'};
  const original = structuredClone(input);
  for (const time of [0, 1.75, 4, 2.25, 0]) {
    const object = sampleContinuity(input, time, 1280, 720).objects[0];
    assert.deepEqual(object.typography, input.objects[0].typography); assert.deepEqual(object.appearance, input.objects[0].appearance);
  }
  assert.deepEqual(input, original);
});

test('one persistent ID and unchanged actual copy survive every frame and beat boundary', () => {
  const input = world();
  for (let frame = 0; frame <= 120; frame++) {
    const object = sampleContinuity(input, frame / 30, 1280, 720).objects[0];
    assert.equal(object.id, 'receipt-A');
    assert.equal(object.semanticIdentity, '同一笔账单');
    assert.equal(object.text, '账单 A');
    assert.deepEqual(object.rows, ['金额１２．５％']);
  }
});

test('seeking out of order is deterministic and leaves the authored world unchanged', () => {
  const input = world(), original = structuredClone(input);
  const first = sampleContinuity(input, 0, 1280, 720);
  for (const time of [4, 1.5, 2, 3.75, 0]) sampleContinuity(input, time, 1280, 720);
  assert.deepEqual(sampleContinuity(input, 0, 1280, 720), first);
  assert.deepEqual(input, original);
});

test('adjacent linear segments meet continuously at a boundary', () => {
  const epsilon = 1e-8;
  const before = sampleContinuity(world(), 2 - epsilon, 1280, 720);
  const at = sampleContinuity(world(), 2, 1280, 720);
  const after = sampleContinuity(world(), 2 + epsilon, 1280, 720);
  assert.ok(Math.abs(before.objects[0].x - at.objects[0].x) < 2e-6);
  assert.ok(Math.abs(after.objects[0].w - at.objects[0].w) < 2e-6);
  for (let i = 0; i < 6; i++) assert.ok(Math.abs(before.camera.matrix[i] - after.camera.matrix[i]) < 3e-6);
});

test('holds remain exact and fractional shutter timestamps sample genuine intermediate states', () => {
  const input = world();
  assert.equal(sampleContinuity(input, 3.125, 1280, 720).objects[0].x, 400);
  assert.equal(sampleContinuity(input, 1 / 60, 1280, 720).objects[0].x, 200 + 100 / 60);
  assert.deepEqual(sampleContinuity(input, -1, 1280, 720).objects[0], sampleContinuity(input, 0, 1280, 720).objects[0]);
  assert.deepEqual(sampleContinuity(input, 5, 1280, 720).objects[0], sampleContinuity(input, 4, 1280, 720).objects[0]);
});

test('height-based projection explicitly maps wide, square and portrait camera centres', () => {
  for (const [width, height] of [[1280, 720], [1080, 1080], [720, 1280]]) {
    const matrix = cameraMatrix(cameraKey(0), width, height);
    assert.deepEqual(transformPoint(matrix, 640, 360), {x: width / 2, y: height / 2});
    const worldWidth = width / (height / 720);
    assert.ok(Math.abs(transformPoint(matrix, 640 - worldWidth / 2, 360).x) < 1e-10);
    assert.ok(Math.abs(transformPoint(matrix, 640 + worldWidth / 2, 360).x - width) < 1e-10);
  }
});

test('camera rotation is inverse world rotation and preserves the centre', () => {
  const matrix = cameraMatrix(cameraKey(0, {rotation: 90}), 1280, 720);
  const centre = transformPoint(matrix, 640, 360), right = transformPoint(matrix, 740, 360);
  assert.ok(Math.abs(centre.x - 640) < 1e-10 && Math.abs(centre.y - 360) < 1e-10);
  assert.ok(Math.abs(right.x - 640) < 1e-10 && Math.abs(right.y - 260) < 1e-10);
});

test('projected rectangles include object-centred rotation rather than a fake x/y box', () => {
  const rect = projectedObjectRect({x: 200, y: 100, w: 200, h: 100, rotation: 90}, [1, 0, 0, 1, 0, 0]);
  assert.ok(Math.abs(rect.x - 250) < 1e-10 && Math.abs(rect.y - 50) < 1e-10);
  assert.ok(Math.abs(rect.width - 100) < 1e-10 && Math.abs(rect.height - 200) < 1e-10);
});

for (const field of ['at', 'x', 'y', 'w', 'h', 'opacity', 'rotation', 'radius']) {
  test(`actual sampler rejects nonfinite object ${field}`, () => {
    const input = world(); input.objects[0].keyframes[1][field] = NaN;
    assert.throws(() => sampleContinuity(input, 1, 1280, 720), /finite/);
  });
}

for (const field of ['at', 'x', 'y', 'zoom', 'rotation']) {
  test(`actual sampler rejects nonfinite camera ${field}`, () => {
    const input = world(); input.camera[1][field] = Infinity;
    assert.throws(() => sampleContinuity(input, 1, 1280, 720), /finite/);
  });
}

test('missing fields, unordered times, repeated identities and invalid opacity fail closed', () => {
  const cases = [
    input => {delete input.objects[0].keyframes[1].w;},
    input => {input.objects[0].keyframes[1].at = 0;},
    input => {input.objects.push(structuredClone(input.objects[0]));},
    input => {input.objects[0].keyframes[0].opacity = 2;},
    input => {input.camera[0].zoom = 0;},
    input => {input.objects[0].keyframes = [objectKey(0)];},
  ];
  for (const mutate of cases) {
    const input = world(); mutate(input);
    assert.throws(() => sampleContinuity(input, 0, 1280, 720));
  }
});

test('time and projection dimensions never accept nonfinite values', () => {
  for (const [time, width, height] of [[NaN, 1280, 720], [1, Infinity, 720], [1, 1280, 0]]) assert.throws(() => sampleContinuity(world(), time, width, height));
});

test('temporal compositor averages radiometric light rather than encoded RGB', () => {
  const black = Uint8ClampedArray.of(0, 0, 0, 255), white = Uint8ClampedArray.of(255, 255, 255, 255);
  assert.deepEqual([...averageLinearSamples([black, white, black])], [156, 156, 156, 255]);
  assert.notEqual(averageLinearSamples([black, white, black])[0], 85);
});

test('one-sample compositor is an exact opaque identity over every sRGB byte', () => {
  const input = new Uint8ClampedArray(256 * 4);
  for (let value = 0; value < 256; value++) input.set([value, value, value, 255], value * 4);
  assert.deepEqual(averageLinearSamples([input]), input);
  assert.throws(() => averageLinearSamples([input, input]), /one or three/);
  assert.throws(() => averageLinearSamples([Uint8ClampedArray.of(255, 255, 255, 254)]), /opaque/);
});

test('actual PNG compositor numerically groups subframes, binds hashes and refuses overwrite', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-temporal-test-'));
  try {
    const input = path.join(temp, 'source'); fs.mkdirSync(input);
    const canvas = createCanvas(2, 2), ctx = canvas.getContext('2d');
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 1 ? '#fff' : '#000'; ctx.fillRect(0, 0, 2, 2);
      fs.writeFileSync(path.join(input, `element-${i}.png`), canvas.toBuffer('image/png'));
    }
    const output = path.join(temp, 'composited');
    const report = await blurFrames({input, output, samples: 3});
    assert.equal(report.frames, 2); assert.equal(report.width, 2); assert.equal(report.height, 2);
    assert.deepEqual(report.groups[0].sources.map(source => source.file), ['element-0.png', 'element-1.png', 'element-2.png']);
    assert.equal(report.groups[0].sha256.length, 64);
    assert.ok(fs.existsSync(path.join(output, 'element-000001.png')));
    assert.equal(JSON.parse(fs.readFileSync(path.join(output, 'composite.json'))).frames, 2);
    await assert.rejects(blurFrames({input, output, samples: 3}), /EEXIST/);
    fs.renameSync(path.join(input, 'element-2.png'), path.join(input, 'element-9.png'));
    await assert.rejects(blurFrames({input, output: path.join(temp, 'invalid'), samples: 3}), /contiguous/);
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});

test('actual Chrome probe measures camera, viewport, opacity, occlusion and changed visible identity', async t => {
  const {openBrowser, ensureBrowser} = await import('@remotion/renderer');
  const platformChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let executable = process.env.HEIGE_BROWSER_PATH || (fs.existsSync(platformChrome) ? platformChrome : null);
  if (!executable) {
    try { executable = (await ensureBrowser({onBrowserDownload: () => {throw new Error('This regression never downloads a browser implicitly');}})).path; }
    catch { t.skip('An explicitly installed Chrome or Remotion browser is required'); return; }
  }
  assert.ok(fs.existsSync(executable), 'Configured browser does not exist');
  // Extract the production functions by AST. No probe implementation is copied
  // into the test, and no predicted sampler rect can make this assertion pass.
  const file = ts.createSourceFile('ContinuousStage.tsx', fs.readFileSync(new URL('../src/ContinuousStage.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const functions = file.statements.filter(statement => ts.isFunctionDeclaration(statement) && ['effectiveOpacity', 'probeContinuousStage'].includes(statement.name?.text));
  assert.equal(functions.length, 2);
  const options = {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}};
  const inspector = ts.transpileModule(fs.readFileSync(new URL('../src/inspect.ts', import.meta.url), 'utf8'), options).outputText.replace(/^export /gmu, '');
  const collector = ts.transpileModule(functions.map(statement => statement.getText(file)).join('\n'), options).outputText.replace(/^export /gmu, '');
  const source = `${inspector}\n${collector}`;
  const browser = await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error'});
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: 1280, height: 720, deviceScaleFactor: 1});
    const result = await page.evaluate(productionSource => {
      document.body.style.margin = '0';
      document.body.innerHTML = '<div id="root" data-heige-continuous-viewport style="position:relative;width:1280px;height:720px;overflow:hidden"><div data-heige-continuous-camera style="position:absolute;width:1280px;height:720px;transform-origin:0 0;transform:matrix(1,0,0,1,50,20);opacity:.5"><div data-heige-object-id="receipt-A" data-heige-semantic-identity="账单" data-heige-object-kind="ui" style="position:absolute;left:100px;top:100px;width:200px;height:100px;background:white"><div data-heige-object-content style="font:32px sans-serif">原始账单</div></div></div></div>';
      const probe = new Function(`${productionSource}\nreturn probeContinuousStage;`)();
      const root = document.getElementById('root'), object = root.querySelector('[data-heige-object-id]');
      const collect = () => probe(root, {frame: 30, fps: 30, time: 1, width: 1280, height: 720});
      const full = collect();
      root.style.transform = 'scale(.5)'; root.style.transformOrigin = '0 0';
      const scaled = collect();
      root.style.transform = 'none';
      const overlay = document.createElement('div'); overlay.style.cssText = 'position:absolute;left:150px;top:120px;width:200px;height:100px;background:black;z-index:20'; root.appendChild(overlay);
      const occluded = collect(); overlay.remove();
      object.querySelector('[data-heige-object-content]').textContent = '实际内容已经换了';
      const replaced = collect();
      object.style.opacity = '0'; const hidden = collect();
      object.style.opacity = '1'; object.style.left = '-500px'; const offscreen = collect();
      object.style.left = '100px'; object.style.width = '1px'; object.style.height = '1px'; const overflow = collect();
      return {full, scaled, occluded, replaced, hidden, offscreen, overflow};
    }, source);
    for (const report of [result.full, result.scaled]) {
      assert.deepEqual(report.camera.matrix, [1, 0, 0, 1, 50, 20]);
      assert.deepEqual(report.objects[0].rect, {x: 150, y: 120, width: 200, height: 100});
      assert.equal(report.objects[0].opacity, .5);
      assert.equal(report.objects[0].viewportVisibleRatio, 1);
      assert.deepEqual(report.objects[0].occlusion, {testedPoints: 25, visiblePoints: 25});
      assert.equal(report.objects[0].paintVisibleRatio, 1);
      assert.equal(report.objects[0].visualIdentity, 'ui\n原始账单');
    }
    assert.equal(result.occluded.objects[0].paintVisibleRatio, 0);
    assert.equal(result.occluded.objects[0].occlusion.visiblePoints, 0);
    assert.notEqual(result.replaced.objects[0].visualIdentity, result.full.objects[0].visualIdentity);
    assert.equal(result.hidden.objects[0].opacity, 0);
    assert.equal(result.hidden.objects[0].paintVisibleRatio, 0);
    assert.equal(result.hidden.objects[0].present, true);
    assert.equal(result.offscreen.objects[0].viewportVisibleRatio, 0);
    assert.ok(result.overflow.errors.some(error => error.kind.startsWith('world-content-')));
  } finally { await browser.close({silent: true}); }
});

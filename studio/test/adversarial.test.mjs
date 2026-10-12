import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {engineFingerprint, fileHash, inputFingerprint, verifyArtifacts} from '../lib/integrity.mjs';
import {compileProject, parseSrt, readProject} from '../lib/project.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PYTHON = process.env.HEIGE_PYTHON || (fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3');
const temp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const run = (binary, args) => spawnSync(binary, args, {encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 60_000});
const baseProject = () => ({schemaVersion: 'heige-video/4', title: '验证反例', mode: 'explainer', ratio: '16:9', theme: 'ledger', shots: [{id: 's1', type: 'statement', title: '声明', duration: 3}]});

test('unknown root and nested production fields are rejected instead of silently ignored', () => {
  for (const change of [
    (p) => { p.untrustedKnob = true; },
    (p) => { p.shots[0].untrustedKnob = true; },
    (p) => { p.facts = [{id: 'f1', text: '记录', source: '来源', untrustedKnob: true}]; },
    (p) => { p.assets = [{id: 'a1', path: 'missing.wav', kind: 'audio', source: 'original', rights: 'test', untrustedKnob: true}]; },
    (p) => { p.audio = {assetId: 'a1', kind: 'mock', untrustedKnob: true}; },
    (p) => { p.music = {assetId: 'a1', untrustedKnob: true}; },
    (p) => { p.shots[0].claims = [{text: '记录', factId: 'f1', quote: '记录', untrustedKnob: true}]; },
    (p) => { p.shots[0] = {id: 's1', type: 'compare', title: '对照', duration: 3, left: {label: '前', items: ['甲'], untrustedKnob: true}, right: {label: '后', items: ['乙']}}; },
    (p) => { p.demoData = true; p.shots[0] = {id: 's1', type: 'bars', title: '数据', duration: 3, data: [{id: 'a', label: '甲', value: 1, untrustedKnob: true}, {id: 'b', label: '乙', value: 2}]}; },
  ]) {
    const project = baseProject();
    change(project);
    const plan = compileProject(project, {baseDir: os.tmpdir()});
    assert.ok(plan.issues.errors.some((e) => e.path.endsWith('.untrustedKnob') && e.message.includes('未知字段')), JSON.stringify(plan.issues));
  }
});

test('swapping factual row identities cannot be justified by another row with the same number', () => {
  const project = baseProject();
  project.facts = [{id: 'f1', text: '甲有2次记录，乙有8次记录。', source: '原始记录'}];
  project.shots[0] = {id: 's1', type: 'bars', title: '统计', duration: 3,
    data: [{id: 'a', label: '甲', value: 8}, {id: 'b', label: '乙', value: 2}],
    claims: [{text: '甲有8次记录', factId: 'f1', quote: '乙有8次记录'}, {text: '乙有2次记录', factId: 'f1', quote: '甲有2次记录'}]};
  const plan = compileProject(project, {briefText: project.facts[0].text});
  assert.ok(plan.issues.errors.length > 0, 'A citation to another named row must not support an inverted chart');
});

test('one genuine quote containing multiple entities cannot justify exchanging their measurements', () => {
  const quote = '甲有2次记录，乙有8次记录。';
  const project = baseProject();
  project.facts = [{id: 'f1', text: quote, source: '原始记录'}];
  project.shots[0] = {id: 's1', type: 'bars', title: '记录', duration: 3,
    data: [{id: 'a', label: '甲', value: 8}, {id: 'b', label: '乙', value: 2}],
    claims: [{text: quote, factId: 'f1', quote}]};
  const plan = compileProject(project, {briefText: quote});
  assert.ok(plan.issues.errors.length > 0, 'A correct multi-entity quotation still must bind each quantity to its own entity');
});

test('full-width digits and Chinese fractional quantities cannot evade factual copy requirements', () => {
  for (const title of ['利润提升１２％', '效率提升八成']) {
    const project = baseProject();
    project.shots[0].title = title;
    const plan = compileProject(project);
    assert.ok(plan.issues.errors.length > 0, `Numerical text without a claim must be rejected: ${title}`);
  }
});

test('an explicitly supplied missing brief fails loading; citation text must exist in that brief', () => {
  const dir = temp('heige-brief-adversarial-');
  try {
    const project = baseProject();
    const file = path.join(dir, 'project.json');
    fs.writeFileSync(file, JSON.stringify(project));
    const loaded = readProject(file, {briefPath: path.join(dir, 'missing.md')});
    assert.ok(loaded.issues.errors.some((e) => e.path === 'brief'));
    project.facts = [{id: 'f1', text: '完成2次测试', source: '原始记录'}];
    project.shots[0].claims = [{text: '完成2次测试', factId: 'f1', quote: '完成2次测试'}];
    const plan = compileProject(project, {briefText: '仅完成8次练习'});
    assert.ok(plan.issues.errors.some((e) => e.path.endsWith('.quote')));
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('overlapping or beyond-audio subtitles are rejected while the original cue clock is retained', () => {
  const srt = '1\n00:00:00,000 --> 00:00:02,000\n你好，世界！\n\n2\n00:00:01,500 --> 00:00:04,000\n第二句。\n';
  const parsed = parseSrt(srt, 3);
  assert.deepEqual(parsed.captions[0], {start: 0, end: 2, text: '你好世界'});
  assert.ok(parsed.issues.errors.some((e) => e.message.includes('重叠')));
  assert.ok(parsed.issues.errors.some((e) => e.message.includes('超过')));
});

test('draft and mock declarations retain preview-only eligibility', () => {
  const draft = baseProject();
  draft.draft = true;
  const plan = compileProject(draft);
  assert.deepEqual(plan.issues.errors, []);
  assert.equal(plan.previewOnly, true);
  const dir = temp('heige-mock-adversarial-');
  try {
    fs.writeFileSync(path.join(dir, 'voice.wav'), 'test fixture for structural validation');
    const mock = baseProject();
    mock.assets = [{id: 'voice', path: 'voice.wav', kind: 'audio', source: 'original', rights: 'self-generated test'}];
    mock.audio = {assetId: 'voice', kind: 'mock'};
    mock.shots[0] = {id: 's1', type: 'statement', title: '声明', start: 0, end: 3};
    const result = compileProject(mock, {baseDir: dir, audioDuration: 3});
    assert.deepEqual(result.issues.errors, []);
    assert.equal(result.previewOnly, true);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('CLI rejects an authored ending before the actual recording duration', (t) => {
  if (run('ffmpeg', ['-version']).status !== 0 || run('ffprobe', ['-version']).status !== 0) {
    t.skip('Needs FFmpeg and ffprobe to produce and measure a real recording.');
    return;
  }
  const dir = temp('heige-audio-clock-adversarial-');
  try {
    const voice = path.join(dir, 'voice.wav');
    const encoded = run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', voice]);
    assert.equal(encoded.status, 0, encoded.stderr);
    const project = baseProject();
    project.assets = [{id: 'voice', path: 'voice.wav', kind: 'audio', source: 'original', rights: 'self-generated test'}];
    project.audio = {assetId: 'voice', kind: 'recording'};
    project.shots[0] = {id: 's1', type: 'statement', title: '声明', start: 0, end: 4};
    const file = path.join(dir, 'project.json');
    fs.writeFileSync(file, JSON.stringify(project));
    const checked = run(process.execPath, [path.join(ROOT, 'studio', 'make.mjs'), 'validate', file]);
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /完整音频|actual.*audio|duration/i);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('a silent recording cannot be hidden behind audible background music', (t) => {
  if (run('ffmpeg', ['-version']).status !== 0 || run('ffprobe', ['-version']).status !== 0) {
    t.skip('Needs FFmpeg and ffprobe to produce real source audio.');
    return;
  }
  const dir = temp('heige-masked-silence-adversarial-');
  try {
    const silence = run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', '3', path.join(dir, 'voice.wav')]);
    const music = run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', path.join(dir, 'music.wav')]);
    assert.equal(silence.status, 0, silence.stderr);
    assert.equal(music.status, 0, music.stderr);
    const project = baseProject();
    project.assets = ['voice', 'music'].map((id) => ({id, path: `${id}.wav`, kind: 'audio', source: 'original', rights: 'self-generated test'}));
    project.audio = {assetId: 'voice', kind: 'recording'};
    project.music = {assetId: 'music', volume: .15};
    project.shots[0] = {id: 's1', type: 'statement', title: '声明', start: 0, end: 3};
    const file = path.join(dir, 'project.json');
    fs.writeFileSync(file, JSON.stringify(project));
    const checked = run(process.execPath, [path.join(ROOT, 'studio', 'make.mjs'), 'validate', file]);
    assert.equal(checked.status, 1, `Silent narration needs rejection before music can mask it: ${checked.stdout} ${checked.stderr}`);
    assert.match(checked.stderr, /silent|silence|audible|静音/i);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('CLI verify cannot promote a draft or actual mock audio to validated output', (t) => {
  if (run('ffmpeg', ['-version']).status !== 0 || run('ffprobe', ['-version']).status !== 0) {
    t.skip('Needs FFmpeg and ffprobe to produce real mock audio.');
    return;
  }
  const dir = temp('heige-preview-promotion-adversarial-');
  try {
    const encoded = run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', path.join(dir, 'voice.wav')]);
    assert.equal(encoded.status, 0, encoded.stderr);
    const out = path.join(dir, 'output');
    fs.mkdirSync(out);
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({status: 'validated', review: {technical: 'pass'}}));
    const draft = baseProject();
    draft.draft = true;
    const mock = baseProject();
    mock.assets = [{id: 'voice', path: 'voice.wav', kind: 'audio', source: 'original', rights: 'self-generated test'}];
    mock.audio = {assetId: 'voice', kind: 'mock'};
    mock.shots[0] = {id: 's1', type: 'statement', title: '声明', start: 0, end: 3};
    for (const [label, project] of [['draft', draft], ['mock', mock]]) {
      const file = path.join(dir, `${label}.json`);
      fs.writeFileSync(file, JSON.stringify(project));
      const checked = run(process.execPath, [path.join(ROOT, 'studio', 'make.mjs'), 'verify', file, '--out', out]);
      assert.equal(checked.status, 1, checked.stdout);
      assert.match(checked.stderr, /Mock or draft output incorrectly marked validated/i);
    }
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('encoded output symlink replacement cannot reuse a previous passing hash', () => {
  const dir = temp('heige-artifact-adversarial-');
  const outside = temp('heige-artifact-outside-');
  try {
    const source = path.join(dir, 'video.mp4');
    fs.writeFileSync(source, 'identical encoded bytes');
    fs.writeFileSync(path.join(outside, 'video.mp4'), 'identical encoded bytes');
    const hashes = {'video.mp4': fileHash(source)};
    assert.equal(verifyArtifacts(dir, hashes), true);
    fs.unlinkSync(source);
    fs.symlinkSync(path.join(outside, 'video.mp4'), source);
    assert.throws(() => verifyArtifacts(dir, hashes), /changed|escapes/i);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
    fs.rmSync(outside, {recursive: true, force: true});
  }
});

test('the build entry point cannot canonicalize away a forbidden project-file symlink', () => {
  const dir = temp('heige-project-link-adversarial-');
  try {
    const original = path.join(dir, 'project.json');
    const link = path.join(dir, 'linked-project.json');
    const out = path.join(dir, 'output');
    fs.writeFileSync(original, JSON.stringify(baseProject()));
    fs.symlinkSync(original, link);
    for (const command of ['validate', 'build']) {
      const checked = run(process.execPath, [path.join(ROOT, 'studio', 'make.mjs'), command, link, ...(command === 'build' ? ['--out', out] : [])]);
      assert.equal(checked.status, 1, checked.stdout);
      assert.match(checked.stderr, /项目 JSON 不得使用符号链接/);
    }
    assert.equal(fs.existsSync(out), false, 'Invalid source must be rejected before browser setup or output creation');
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('editing voice, visual asset, brief or subtitle invalidates the input snapshot', () => {
  const dir = temp('heige-input-adversarial-');
  try {
    const project = {assets: [{id: 'voice', path: 'voice.wav'}, {id: 'photo', path: 'photo.png'}], audio: {subtitles: 'voice.srt'}};
    const file = path.join(dir, 'project.json');
    const brief = path.join(dir, 'brief.md');
    fs.writeFileSync(file, JSON.stringify(project));
    for (const name of ['voice.wav', 'photo.png', 'voice.srt', 'brief.md']) fs.writeFileSync(path.join(dir, name), 'original');
    const first = inputFingerprint(file, project, brief);
    for (const [name, select] of [
      ['voice.wav', (x) => x.assets.voice],
      ['photo.png', (x) => x.assets.photo],
      ['voice.srt', (x) => x.subtitles],
      ['brief.md', (x) => x.brief],
    ]) {
      fs.writeFileSync(path.join(dir, name), 'changed');
      assert.notEqual(select(inputFingerprint(file, project, brief)), select(first), name);
      fs.writeFileSync(path.join(dir, name), 'original');
    }
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('production JSON imported by the renderer changes the engine fingerprint', () => {
  const dir = temp('heige-engine-adversarial-');
  try {
    fs.mkdirSync(path.join(dir, 'studio', 'lib'), {recursive: true});
    fs.writeFileSync(path.join(dir, 'package.json'), '{}');
    fs.writeFileSync(path.join(dir, 'package-lock.json'), '{}');
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(dir, 'studio', 'CONTRACT.md'), 'contract');
    fs.writeFileSync(path.join(dir, 'studio', 'requirements.txt'), 'Pillow');
    fs.writeFileSync(path.join(dir, 'studio', 'lib', 'theme.mjs'), "import tokens from './tokens.json' with {type:'json'}; export default tokens;\n");
    const tokens = path.join(dir, 'studio', 'lib', 'tokens.json');
    fs.writeFileSync(tokens, '{"background":"#000000"}');
    const first = engineFingerprint(dir);
    fs.writeFileSync(tokens, '{"background":"#ffffff"}');
    assert.notEqual(engineFingerprint(dir), first, 'visible theme changed while implementation bytes stayed the same');
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('real encoded fully silent narration is rejected despite an audio stream', (t) => {
  const capability = run(PYTHON, ['-c', 'import PIL']);
  if (capability.status !== 0 || run('ffmpeg', ['-version']).status !== 0 || run('ffprobe', ['-version']).status !== 0) {
    t.skip('Needs FFmpeg, ffprobe and a Python with Pillow; set HEIGE_PYTHON to that interpreter.');
    return;
  }
  const dir = temp('heige-silence-adversarial-');
  try {
    const video = path.join(dir, 'video.mp4');
    const encoded = run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=320x240:rate=24:duration=2', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', video]);
    assert.equal(encoded.status, 0, encoded.stderr);
    const plan = {width: 320, height: 240, fps: 24, durationInFrames: 48, duration: 2, project: {audio: {kind: 'recording'}}, timeline: []};
    const planFile = path.join(dir, 'plan.json');
    fs.writeFileSync(planFile, JSON.stringify(plan));
    const checked = run(PYTHON, [path.join(ROOT, 'studio', 'check_media.py'), 'check', '--video', video, '--plan', planFile, '--out', dir]);
    assert.equal(checked.status, 3, `A present but silent narration must fail technical validation: ${checked.stdout} ${checked.stderr}`);
    const report = JSON.parse(fs.readFileSync(path.join(dir, 'media-check.json'), 'utf8'));
    assert.equal(report.status, 'rejected');
    assert.ok(report.errors.some((x) => /silent|silence|audible/i.test(x)), JSON.stringify(report));
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('the actual font cmap rejects missing glyphs before producing a renderable font', (t) => {
  const platformFont = '/System/Library/Fonts/Supplemental/Verdana.ttf';
  const foundFont = !process.env.HEIGE_FONT_PATH && !fs.existsSync(platformFont) ? run('fc-match', ['sans', '--format=%{file}']) : null;
  const fixtureFont = process.env.HEIGE_FONT_PATH || (fs.existsSync(platformFont) ? platformFont : foundFont?.stdout.trim());
  const faceIndex = process.env.HEIGE_FONT_PATH ? process.env.HEIGE_FONT_INDEX || '0' : '0';
  if (run(PYTHON, ['-c', 'import PIL, fontTools']).status !== 0 || !fixtureFont || !fs.existsSync(fixtureFont)) {
    t.skip('Needs fontTools and a local font fixture; set HEIGE_PYTHON and HEIGE_FONT_PATH when necessary.');
    return;
  }
  const dir = temp('heige-glyph-adversarial-');
  try {
    const text = path.join(dir, 'text.txt');
    const output = path.join(dir, 'prepared.ttf');
    fs.writeFileSync(text, '中文验收\u{10ffff}');
    const checked = run(PYTHON, [path.join(ROOT, 'studio', 'check_media.py'), 'font', '--font', fixtureFont, '--index', faceIndex, '--text', text, '--out', output]);
    assert.equal(checked.status, 3);
    assert.match(checked.stderr, /does not cover required glyphs/);
    assert.equal(fs.existsSync(output), false, 'Missing glyphs must not leave a font that could inherit success');
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('actual browser geometry rejects two independent overlapping texts, including a scaled preview', async (t) => {
  const [{openBrowser, ensureBrowser}, ts] = await Promise.all([import('@remotion/renderer'), import('typescript')]);
  const platformChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  let executable = process.env.HEIGE_BROWSER_PATH || (fs.existsSync(platformChrome) ? platformChrome : null);
  if (!executable) {
    try {
      const available = await ensureBrowser({onBrowserDownload: () => { throw new Error('Geometry tests never download a browser implicitly.'); }});
      executable = available.path;
    } catch {
      t.skip('Needs an already installed Chrome or Remotion headless browser; set HEIGE_BROWSER_PATH or install the browser explicitly.');
      return;
    }
  }
  assert.ok(executable && fs.existsSync(executable), 'Configured browser binary does not exist');
  const inspector = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'studio', 'src', 'inspect.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext},
  }).outputText.replace(/^export /gmu, '');
  const browser = await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error'});
  try {
    const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    await page.setViewport({width: 1280, height: 720, deviceScaleFactor: 1});
    const result = await page.evaluate((source) => {
      document.body.style.margin = '0';
      document.body.innerHTML = '<div id="root" style="position:relative;width:1280px;height:720px"><div data-heige-text="First text" data-heige-text-id="first" style="position:absolute;left:100px;top:100px;width:600px;height:80px;font:32px sans-serif">First text</div><div data-heige-text="Second text" data-heige-text-id="second" style="position:absolute;left:150px;top:120px;width:600px;height:80px;font:32px sans-serif">Second text</div></div>';
      const inspect = new Function(`${source}\nreturn inspectLayout;`)();
      const root = document.getElementById('root');
      const full = inspect(root, 0, 1280, 720);
      root.style.transform = 'scale(.5)';
      root.style.transformOrigin = '0 0';
      const scaled = inspect(root, 0, 1280, 720);
      document.querySelector('[data-heige-text-id="second"]').style.left = '1150px';
      const overflow = inspect(root, 0, 1280, 720);
      return {full, scaled, overflow};
    }, inspector);
    for (const report of [result.full, result.scaled]) {
      const error = report.errors.find((x) => x.kind === 'text-overlap');
      assert.ok(error, JSON.stringify(report));
      assert.equal(error.id, 'first');
      assert.equal(error.otherId, 'second');
      assert.deepEqual(error.intersection, {width: 550, height: 60});
      assert.equal(report.errors.filter((x) => x.kind === 'screen-overflow').length, 0);
    }
    assert.ok(result.overflow.errors.some((x) => x.kind === 'screen-overflow' && x.id === 'second'));
  } finally { await browser.close({silent: true}); }
});

test('sorting preserves object identities and avoids card collisions throughout the causal operation', async () => {
  const ts = await import('typescript');
  const compiled = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'studio', 'src', 'motion.ts'), 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext},
  }).outputText;
  const {insertionPositions} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  let checkedStates = 0;
  for (let count = 3; count <= 7; count++) {
    const sorted = Array.from({length: count}, (_, i) => `object-${i}`);
    for (const original of [[...sorted].reverse(), [...sorted.slice(1), sorted[0]], [...sorted]]) {
      assert.deepEqual(insertionPositions(original, sorted, 0).map((x) => x.rank), original.map((_, i) => i));
      assert.deepEqual(insertionPositions(original, sorted, 1).map((x) => x.rank), original.map((id) => sorted.indexOf(id)));
      for (let sample = 0; sample <= 500; sample++) {
        const positions = insertionPositions(original, sorted, sample / 500);
        assert.deepEqual(positions.map((x) => x.id), original, 'Motion must retain the same semantic object IDs');
        for (const position of positions) {
          assert.ok(Number.isFinite(position.rank) && position.rank >= 0 && position.rank <= count - 1);
          assert.ok(Number.isFinite(position.lane) && position.lane >= 0 && position.lane <= 1);
        }
        for (let first = 0; first < positions.length; first++) for (let second = first + 1; second < positions.length; second++) {
          const a = positions[first], b = positions[second];
          const horizontalIntersection = .46 - Math.abs(a.lane - b.lane) * .54;
          const verticalIntersection = 1 - Math.abs(a.rank - b.rank);
          assert.ok(horizontalIntersection <= 1e-8 || verticalIntersection <= 1e-8,
            `Cards collide at progress ${sample / 500}: ${JSON.stringify({original, a, b})}`);
        }
        checkedStates++;
      }
    }
  }
  assert.equal(checkedStates, 7515);
});

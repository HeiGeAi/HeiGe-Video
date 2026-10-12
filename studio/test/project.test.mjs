import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {collectText, compileProject, parseSrt, readProject, resolveProjectFile} from '../lib/project.mjs';

const basic = () => ({schemaVersion: 'heige-video/4', title: '镜头契约测试', mode: 'explainer', ratio: '16:9', theme: 'ledger', shots: [{id: 'intro', type: 'hook', title: '先提出问题', duration: 4}, {id: 'end', type: 'end', title: '回到结论', duration: 4}]});
const good = (result) => assert.deepEqual(result.issues.errors, []);
const hasError = (result, pattern) => assert.ok(result.issues.errors.some((issue) => pattern.test(`${issue.path}: ${issue.message}`)), JSON.stringify(result.issues));
const temp = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-project-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  return dir;
};
const audioProject = (dir, kind = 'recording') => {
  // This fixture tests the contract and paths, not codec decoding or real synthesis.
  fs.writeFileSync(path.join(dir, 'voice.wav'), 'contract-only fixture');
  const project = basic();
  project.assets = [{id: 'voice', path: 'voice.wav', kind: 'audio', source: 'original', rights: '本测试自建占位文件'}];
  project.audio = {assetId: 'voice', kind};
  project.shots = [{id: 'intro', type: 'hook', title: '先提出问题', start: 0, end: 4}, {id: 'end', type: 'end', title: '回到结论', start: 4, end: 8}];
  return project;
};
const barsProject = () => {
  const project = basic();
  project.facts = [{id: 'f1', text: '甲组 10 分；乙组 20 分。仅用于验证契约的测试事实。', source: '测试夹具声明'}];
  project.shots[0] = {id: 'chart', type: 'bars', title: '两组对比', duration: 4, unit: '分', data: [{id: 'a', label: '甲组', value: 10}, {id: 'b', label: '乙组', value: 20}], claims: [{text: '甲组 10 分', factId: 'f1', quote: '甲组 10 分'}, {text: '乙组 20 分', factId: 'f1', quote: '乙组 20 分'}]};
  return project;
};

test('duration clock quantizes every boundary once at both supported frame rates', () => {
  for (const fps of [24, 30]) {
    const project = basic();
    project.fps = fps;
    project.shots[0].duration = 4.013;
    const plan = compileProject(project);
    good(plan);
    assert.equal(plan.timeline[1].from, plan.timeline[0].frames);
    assert.equal(plan.timeline[0].end, plan.timeline[1].start);
    assert.equal(plan.durationInFrames, plan.timeline.reduce((sum, shot) => sum + shot.frames, 0));
    assert.equal(plan.duration, plan.durationInFrames / fps);
    assert.equal(plan.previewOnly, false);
  }
});

test('audio is the clock; one-frame quantization stays continuous without retiming the recording', (t) => {
  const baseDir = temp(t);
  const project = audioProject(baseDir);
  project.shots[0].end = 4.012;
  project.shots[1].start = 4.012;
  const plan = compileProject(project, {baseDir, audioDuration: 8.012});
  good(plan);
  assert.equal(plan.durationInFrames, Math.round(8.012 * 30));
  assert.equal(plan.timeline[1].from, plan.timeline[0].frames);
  assert.equal(project.shots[0].end, 4.012, 'compilation must not mutate the recording mapping');
});

test('audio gaps, overlap, missing start, and incomplete audio coverage fail', (t) => {
  const baseDir = temp(t);
  for (const change of [
    (p) => { p.shots[0].start = .1; },
    (p) => { p.shots[1].start = 4.1; },
    (p) => { p.shots[1].start = 3.9; },
    (p) => { delete p.shots[1].start; },
    (p) => { p.shots[1].end = 7.9; },
    (p) => { p.shots[1].end = 8.1; },
    (p) => { p.shots[0].duration = 4; },
  ]) {
    const project = audioProject(baseDir);
    change(project);
    assert.ok(compileProject(project, {baseDir, audioDuration: 8}).issues.errors.length > 0);
  }
});

test('audio without probe duration warns; a probed build can validate coverage', (t) => {
  const baseDir = temp(t);
  const project = audioProject(baseDir);
  const structure = compileProject(project, {baseDir});
  good(structure);
  assert.equal(structure.duration, 8);
  assert.ok(structure.issues.warnings.some((issue) => /尚未探测/u.test(issue.message)));
  hasError(compileProject(project, {baseDir, audioDuration: 9}), /完整音频/u);
});

test('mock audio is always preview; draft survives compilation', (t) => {
  const baseDir = temp(t);
  const project = audioProject(baseDir, 'mock');
  project.draft = false;
  const mock = compileProject(project, {baseDir, audioDuration: 8});
  good(mock);
  assert.equal(mock.previewOnly, true);
  assert.equal(mock.project.draft, false);
  assert.ok(mock.issues.warnings.some((issue) => /占位音/u.test(issue.message)));
  const draft = basic();
  draft.draft = true;
  assert.equal(compileProject(draft).previewOnly, true);
});

test('numerical rows need same-claim text and same-quote support', () => {
  good(compileProject(barsProject()));
  const wrongQuote = barsProject();
  wrongQuote.shots[0].claims[0].quote = '乙组 20 分';
  hasError(compileProject(wrongQuote), /数值 10 不在/u);
  const wrongFact = barsProject();
  wrongFact.facts.push({id: 'f2', text: '丙组 30 分', source: '另一测试事实'});
  wrongFact.shots[0].claims[0].factId = 'f2';
  hasError(compileProject(wrongFact), /同一条事实/u);
  const mislabelled = barsProject();
  mislabelled.shots[0].data[0].label = '其他组';
  hasError(compileProject(mislabelled), /标签和数值/u);
});

test('same numeric values cannot swap row labels or measurement units', () => {
  const swapped = basic();
  swapped.facts = [{id: 'fact', text: '甲有 2 次记录，乙有 8 次记录', source: '错绑定测试'}];
  swapped.shots[0] = {id: 'bars', type: 'bars', title: '分组记录', duration: 4, unit: '次', data: [{id: 'a', label: '甲', value: 8}, {id: 'b', label: '乙', value: 2}], claims: [{text: '甲有 8 次记录', factId: 'fact', quote: '乙有 8 次记录'}, {text: '乙有 2 次记录', factId: 'fact', quote: '甲有 2 次记录'}]};
  hasError(compileProject(swapped), /标签|逐字/u);
  const wrongUnit = basic();
  wrongUnit.facts = [{id: 'fact', text: '1 次测试', source: '错单位测试'}];
  wrongUnit.shots[0].claims = [{text: '耗时 1 小时', factId: 'fact', quote: '1 次测试'}];
  hasError(compileProject(wrongUnit), /逐字/u);
  const unit = barsProject();
  unit.shots[0].unit = '小时';
  hasError(compileProject(unit), /数值及单位/u);
});

test('a multi-subject quote cannot exchange quantities between rows, even when quoted verbatim', () => {
  const project = basic();
  const evidence = '甲有2次记录，乙有8次记录。';
  project.facts = [{id: 'f', text: evidence, source: '多主体错绑定反例'}];
  project.shots[0] = {id: 'bars', type: 'bars', title: '记录', duration: 4, unit: '次', data: [{id: 'a', label: '甲', value: 8}, {id: 'b', label: '乙', value: 2}], claims: [{text: evidence, factId: 'f', quote: evidence}]};
  hasError(compileProject(project, {briefText: evidence}), /独立/u);
  project.shots[0].data[0].value = 2;
  project.shots[0].data[1].value = 8;
  hasError(compileProject(project), /独立/u);
  project.shots[0].claims = [{text: '甲有2次记录', factId: 'f', quote: evidence}, {text: '乙有8次记录', factId: 'f', quote: evidence}];
  good(compileProject(project, {briefText: evidence}));
  project.shots[0].data[0].value = 8;
  project.shots[0].data[1].value = 2;
  hasError(compileProject(project), /独立/u);
});

test('one row needs one quantity and a supported local relation, not token co-occurrence', () => {
  for (const text of ['甲有2次记录、8次测试', '甲和乙有8次记录', '甲没有8次记录', '8次记录属于甲']) {
    const project = basic();
    project.facts = [{id: 'f', text: `${text}；乙有2次记录`, source: '局部关系反例'}];
    project.shots[0] = {id: 'bars', type: 'bars', title: '记录', duration: 4, unit: '次', data: [{id: 'a', label: '甲', value: 8}, {id: 'b', label: '乙', value: 2}], claims: [{text, factId: 'f', quote: text}, {text: '乙有2次记录', factId: 'f', quote: '乙有2次记录'}]};
    hasError(compileProject(project), /独立/u);
  }
});

test('local quantity relations allow numeric labels but cannot truncate measurement units', () => {
  const project = barsProject();
  project.shots[0].data[0].label = '第1组';
  project.shots[0].claims[0] = {text: '第1组：10分', factId: 'f1', quote: '第1组：10分'};
  project.facts[0].text = '第1组：10分；乙组 20 分';
  good(compileProject(project));
  project.shots[0].claims[0] = {text: '第1组耗时10分钟', factId: 'f1', quote: '第1组耗时10分钟'};
  project.facts[0].text = '第1组耗时10分钟；乙组 20 分';
  hasError(compileProject(project), /数值及单位/u);
});

test('sort transforms require the same independent subject-to-value evidence as bars', () => {
  const project = basic();
  const text = '甲有2次记录，乙有8次记录，丙有4次记录';
  project.facts = [{id: 'f', text, source: '排序错绑定反例'}];
  project.shots[0] = {id: 'sort', type: 'transform', title: '排序', duration: 4, operation: 'sort', items: [{id: 'a', label: '甲', value: 8}, {id: 'b', label: '乙', value: 2}, {id: 'c', label: '丙', value: 4}], claims: [{text, factId: 'f', quote: text}]};
  hasError(compileProject(project), /独立/u);
  project.shots[0].items[0].value = 2;
  project.shots[0].items[1].value = 8;
  project.shots[0].claims = ['甲有2次记录', '乙有8次记录', '丙有4次记录'].map((fragment) => ({text: fragment, factId: 'f', quote: text}));
  good(compileProject(project));
});

test('numeric titles and body cannot bypass claim validation through unstructured copy', () => {
  const project = basic();
  project.facts = [{id: 'f', text: '现场完成 1 次测试', source: '结构化测试事实'}];
  project.shots[0].claims = [{text: '现场完成 1 次测试', factId: 'f', quote: '现场完成 1 次测试'}];
  project.shots[0].body = '耗时 1 小时';
  hasError(compileProject(project), /上屏文案/u);
  project.shots[0].body = '现场完成 1 次测试';
  good(compileProject(project));
  project.shots[0].title = '做完一小时的工作';
  hasError(compileProject(project), /上屏文案/u);
});

test('fullwidth digits and explicit Chinese quantities need evidence, while ordinary copy stays valid', () => {
  for (const title of ['利润提升１２％', '效率提升八成', '准确率为百分之八十', '耗时一小时', '成本八元', '增加两倍']) {
    const project = basic();
    project.shots[0].title = title;
    hasError(compileProject(project), /上屏文案/u);
    project.facts = [{id: 'f', text: title, source: '数值文字测试事实'}];
    project.shots[0].claims = [{text: title, factId: 'f', quote: title}];
    good(compileProject(project));
  }
  for (const title of ['讲清一件事', '一键生成画面', '下一步行动', '一个值得看的动作']) {
    const project = basic();
    project.shots[0].title = title;
    good(compileProject(project));
  }
  const fullwidth = barsProject();
  fullwidth.shots[0].claims[0] = {text: '甲组 １０ 分', factId: 'f1', quote: '甲组 １０ 分'};
  fullwidth.facts[0].text = '甲组 １０ 分；乙组 20 分';
  good(compileProject(fullwidth));
});

test('a brief must contain the exact quoted evidence, not merely a matching number', () => {
  const project = barsProject();
  good(compileProject(project, {briefText: project.facts[0].text}));
  hasError(compileProject(project, {briefText: '其他组获得 10 分与 20 分'}), /引文必须逐字存在于提供的简报/u);
});

test('demo data bypasses row claim requirements, but cannot excuse fabricated supplied claims', () => {
  const project = barsProject();
  project.demoData = true;
  delete project.shots[0].claims;
  good(compileProject(project));
  project.shots[0].claims = [{text: '甲组 999 分', factId: 'f1', quote: '甲组 10 分'}];
  hasError(compileProject(project), /999/u);
  assert.equal(project.demoData, true, 'renderer must retain the visible demo declaration');
});

test('decimal and grouped numeric values compare canonically without substring evidence', () => {
  const project = barsProject();
  project.shots[0].data[0].value = 1000.5;
  project.shots[0].claims[0] = {text: '甲组 1,000.50 分', factId: 'f1', quote: '甲组 1,000.50 分'};
  project.facts[0].text = '甲组 1,000.50 分；乙组 20 分';
  good(compileProject(project));
  project.shots[0].data[0].value = 100;
  project.shots[0].claims[0].text = '甲组 100 分';
  hasError(compileProject(project), /数值 100 不在/u);
});

test('sort transforms preserve unique row identities and reject negative or nonfinite values', () => {
  const project = basic();
  project.demoData = true;
  project.shots[0] = {id: 'sort', type: 'transform', title: '按值排序', operation: 'sort', duration: 4, items: [{id: 'a', label: '甲', value: 4}, {id: 'b', label: '乙', value: 1}, {id: 'c', label: '丙', value: 2}]};
  good(compileProject(project));
  for (const value of [-1, Infinity, NaN]) {
    const changed = structuredClone(project);
    changed.shots[0].items[1].value = value;
    hasError(compileProject(changed), /非负数值/u);
  }
  project.shots[0].items[1].id = 'a';
  hasError(compileProject(project), /排序后仍保留/u);
});

test('all levels reject unknown fields instead of silently ignoring model knobs', () => {
  const changes = [
    (p) => { p.renderAnyway = true; },
    (p) => { p.shots[0].color = '#fff'; },
    (p) => { p.shots[0].claims[0].refs = ['f1']; },
    (p) => { p.facts[0].approved = true; },
    (p) => { p.shots[0].data[0].x = 12; },
  ];
  for (const change of changes) {
    const project = barsProject();
    change(project);
    hasError(compileProject(project), /未知字段/u);
  }
  const compare = basic();
  compare.shots[0] = {id: 'compare', type: 'compare', title: '两种方法', duration: 4, left: {label: '甲', items: ['甲一'], x: 10}, right: {label: '乙', items: ['乙一']}};
  hasError(compileProject(compare), /未知字段/u);
});

test('prototype names in enum fields return issues rather than throwing', (t) => {
  const baseDir = temp(t);
  for (const name of ['constructor', 'toString', '__proto__']) {
    const project = basic();
    project.ratio = name;
    project.shots[0].type = name;
    const plan = compileProject(project);
    hasError(plan, /未知镜头/u);
    hasError(plan, /画幅/u);
    const assetProject = audioProject(baseDir);
    assetProject.assets[0].kind = name;
    hasError(compileProject(assetProject, {baseDir}), /素材种类/u);
  }
});

test('assets reject traversal, absolute paths, URLs, symlinks, missing files and directories', (t) => {
  const baseDir = temp(t);
  fs.writeFileSync(path.join(baseDir, 'safe.png'), 'contract-only image fixture');
  fs.mkdirSync(path.join(baseDir, 'folder.png'));
  fs.symlinkSync('safe.png', path.join(baseDir, 'linked.png'));
  const samples = ['../outside.png', '/tmp/outside.png', 'https://example.com/image.png', '//example.com/image.png', 'C:\\outside.png', 'sub/../safe.png', 'safe.png?x=1', 'linked.png', 'missing.png', 'folder.png'];
  for (const relative of samples) {
    const project = basic();
    project.assets = [{id: 'image', path: relative, kind: 'image', source: 'original', rights: '测试文件'}];
    hasError(compileProject(project, {baseDir}), /素材不可用/u);
  }
  assert.equal(resolveProjectFile('safe.png', baseDir), fs.realpathSync(path.join(baseDir, 'safe.png')));
});

test('a symlink directory cannot create an asset escape even with an innocent filename', (t) => {
  const baseDir = temp(t);
  const outside = temp(t);
  fs.writeFileSync(path.join(outside, 'external.png'), 'external test fixture');
  fs.symlinkSync(outside, path.join(baseDir, 'assets'));
  assert.throws(() => resolveProjectFile('assets/external.png', baseDir), /符号链接/u);
});

test('unsupported SVG and GIF assets fail before rendering; an extension must match its kind', (t) => {
  const baseDir = temp(t);
  for (const name of ['linked.svg', 'moving.gif', 'wrong.mp4']) {
    fs.writeFileSync(path.join(baseDir, name), 'contract-only fixture');
    const project = basic();
    project.assets = [{id: 'image', path: name, kind: 'image', source: 'generated', rights: '自建测试文件'}];
    hasError(compileProject(project, {baseDir}), /扩展名/u);
  }
});

test('SRT keeps real cue times, strips display sentence punctuation, preserves numeric meaning', () => {
  const parsed = parseSrt('\uFEFF1\r\n00:00:00,120 --> 00:00:02,345\r\n「先看，结果！」\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\n读数是 3.5 和 -2，比例是 50%。', 8);
  good(parsed);
  assert.deepEqual(parsed.captions[0], {start: .12, end: 2.345, text: '先看结果'});
  assert.equal(parsed.captions[1].text, '读数是 3.5 和 -2比例是 50%');
});

test('SRT rejects out-of-range, overlapping, reversed and malformed cue clocks', () => {
  for (const text of [
    '1\n00:00:07,000 --> 00:00:08,100\n超界',
    '1\n00:00:02,000 --> 00:00:01,000\n倒序',
    '1\n00:00:00,000 --> 00:00:02,000\n第一句\n\n2\n00:00:01,999 --> 00:00:03,000\n重叠',
    '1\n00:61:00,000 --> 00:62:00,000\n坏分钟',
    '1\n00:00:00,000 --> 00:00:02,000\n<b>带样式</b>',
  ]) assert.ok(parseSrt(text, 8).issues.errors.length > 0, text);
});

test('project validation reads and checks local SRT against the probed audio', (t) => {
  const baseDir = temp(t);
  const project = audioProject(baseDir);
  project.audio.subtitles = 'captions.srt';
  fs.writeFileSync(path.join(baseDir, 'captions.srt'), '1\n00:00:07,000 --> 00:00:08,500\n超过录音');
  hasError(compileProject(project, {baseDir, audioDuration: 8}), /subtitles.*超过最终音频/u);
  project.audio.subtitles = '../captions.srt';
  hasError(compileProject(project, {baseDir, audioDuration: 8}), /字幕不可用/u);
});

test('readProject reports broken JSON and missing briefs; exact local text loads with its folder', (t) => {
  const baseDir = temp(t);
  const file = path.join(baseDir, 'project.json');
  fs.writeFileSync(file, JSON.stringify(basic()));
  const loaded = readProject(file);
  good(loaded);
  assert.equal(loaded.baseDir, baseDir);
  assert.equal(loaded.project.schemaVersion, 'heige-video/4');
  fs.writeFileSync(file, '{broken');
  hasError(readProject(file), /无法读取项目/u);
  hasError(readProject(file, {briefPath: path.join(baseDir, 'missing.md')}), /无法读取简报/u);
});

test('collectText covers data identities, compare lanes, narration claims and media captions', () => {
  assert.deepEqual(collectText({type: 'steps', title: '流程', body: '先后有序', items: ['一步', '二步'], claims: [{text: '结论', factId: 'f1', quote: '未作为屏幕文字'}]}), ['流程', '先后有序', '结论', 'f1', '一步', '二步']);
  assert.deepEqual(collectText({type: 'bars', title: '数据', unit: '%', data: [{id: 'persisted-id', label: '甲', value: 10}]}), ['数据', '甲', '10%']);
  assert.deepEqual(collectText({type: 'media', title: '截图', caption: '模拟内容'}), ['截图', '模拟内容']);
});

test('duplicate scene IDs, unsupported FPS, short scenes and whole-film overflow all fail', () => {
  const project = basic();
  project.shots[1].id = 'intro';
  project.fps = 60;
  project.shots[0].duration = 1;
  const result = compileProject(project);
  hasError(result, /镜头 ID/u);
  hasError(result, /帧率/u);
  hasError(result, /2 至 20 秒/u);
  const long = basic();
  long.shots = Array.from({length: 31}, (_, i) => ({id: `s${i}`, type: 'statement', title: '有效单镜', duration: 20}));
  hasError(compileProject(long), /600 秒/u);
});

import fs from 'node:fs';
import path from 'node:path';
import {validateContinuity} from './continuity-contract.mjs';

const ROOT_FIELDS = new Set(['schemaVersion', 'title', 'mode', 'ratio', 'theme', 'shots', 'fps', 'seed', 'draft', 'demoData', 'brand', 'facts', 'assets', 'audio', 'music', 'continuity']);
const COMMON_FIELDS = ['id', 'type', 'title', 'duration', 'start', 'end', 'body', 'claims', 'intentionalHold'];
const SHOT_FIELDS = {
  hook: [], statement: [], end: [], beat: [], steps: ['items'], compare: ['left', 'right'],
  bars: ['data', 'unit'], transform: ['items', 'operation'], media: ['assetId', 'caption'],
};
const RATIOS = {'16:9': [1280, 720], '9:16': [720, 1280], '1:1': [1080, 1080]};
const EXTENSIONS = {
  image: new Set(['.png', '.jpg', '.jpeg', '.webp']),
  video: new Set(['.mp4', '.mov', '.webm', '.m4v']),
  audio: new Set(['.wav', '.mp3', '.m4a', '.aac', '.ogg', '.flac']),
};
const MAX_INPUT_BYTES = 4 * 1024 * 1024;
const plainObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const finite = (x) => typeof x === 'number' && Number.isFinite(x);
const nonempty = (x) => typeof x === 'string' && x.trim().length > 0;
const issuesOf = () => ({errors: [], warnings: []});
const addError = (issues, location, message) => issues.errors.push({path: location, message});
const addWarning = (issues, location, message) => issues.warnings.push({path: location, message});
const uniqueId = (id) => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(id);
const ownValue = (object, key) => typeof key === 'string' && Object.hasOwn(object, key) ? object[key] : undefined;

function fieldsOf(object, allowed, location, issues) {
  if (!plainObject(object)) {
    addError(issues, location, '必须是普通 JSON 对象');
    return false;
  }
  for (const key of Object.keys(object)) if (!allowed.has(key)) addError(issues, `${location}.${key}`, '未知字段');
  return true;
}

function stringAt(value, location, issues, {optional = false, max = 300} = {}) {
  if (value === undefined && optional) return;
  if (!nonempty(value)) addError(issues, location, '必须是非空字符串');
  else if ([...value].length > max) addError(issues, location, `最多 ${max} 个字符，请缩短或拆镜头`);
}

function stringList(value, location, issues, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    addError(issues, location, `必须有 ${min} 至 ${max} 个短字符串`);
    return;
  }
  value.forEach((item, i) => stringAt(item, `${location}[${i}]`, issues, {max: 64}));
}

/** Resolve only real local files inside the project folder. No path decoding or URL fetching. */
export function resolveProjectFile(relative, baseDir) {
  if (!nonempty(relative) || relative !== relative.trim() || /[\x00-\x1f\\]/u.test(relative)) throw new Error('素材路径必须是规范的项目内相对路径');
  if (path.isAbsolute(relative) || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(relative) || relative.startsWith('//') || /[?#]/u.test(relative)) throw new Error('不接受绝对路径、URL 或 URL 参数');
  const parts = relative.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error('路径不得包含空段、点段或父目录穿越');
  const root = fs.realpathSync(baseDir);
  let cursor = root;
  for (const part of parts) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error('项目素材不得使用符号链接');
  }
  const real = fs.realpathSync(cursor);
  const relation = path.relative(root, real);
  if (!relation || relation === '..' || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation)) throw new Error('素材必须在项目目录内');
  if (!fs.statSync(real).isFile()) throw new Error('素材路径必须指向文件');
  return real;
}

const numbersOf = (text) => {
  const normalized = String(text ?? '').normalize('NFKC').replace(/−/gu, '-');
  return [...normalized.matchAll(/[-+]?\d+(?:,\d{3})*(?:\.\d+)?(?:[eE][-+]?\d+)?/gu)]
    .map((match) => Number(match[0].replace(/,/gu, ''))).filter(Number.isFinite);
};
const hasNumber = (text, value) => numbersOf(text).some((n) => n === value);
const hasNumericalContent = (text) => numbersOf(text).length > 0 || /(?:百分之[零〇一二三四五六七八九十百千万亿两]+(?:点[零〇一二三四五六七八九]+)?|[零〇一二三四五六七八九十百千万亿两]+(?:点[零〇一二三四五六七八九]+)?(?:个百分点|毫秒|秒|分钟|分|小时|天|人|元|倍|成|折|年|月|周|次))/u.test(String(text ?? '').normalize('NFKC'));
const ROW_RELATIONS = new Set(['', ':', '：', '=', '有', '为', '是', '计', '合计', '总计', '获得', '得到', '达到', '耗时', '用时', '完成', '完成了', '记录为']);
const ROW_UNIT_TAIL = /^(?:[，,。.;；!?！？、:：（(]|记录|测试|订单|样本|任务|得分|评分|交易|练习|实验)/u;
function supportsRowClaim(claim, row, rows, unit = '') {
  // A whole quote with several subjects is not a row-to-value mapping. Require
  // one literal, label-first relation fragment instead of inferring semantics.
  const text = claim.text.trim();
  if (!nonempty(row.label) || !text.startsWith(row.label)) return false;
  if (rows.some((other) => other !== row && nonempty(other?.label) && text.includes(other.label))) return false;
  const relation = text.slice(row.label.length).normalize('NFKC').replace(/−/gu, '-');
  const quantities = [...relation.matchAll(/[-+]?\d+(?:,\d{3})*(?:\.\d+)?(?:[eE][-+]?\d+)?/gu)];
  if (quantities.length !== 1) return false;
  const quantity = quantities[0];
  if (!ROW_RELATIONS.has(relation.slice(0, quantity.index).trim()) || Number(quantity[0].replace(/,/gu, '')) !== row.value) return false;
  const suffix = relation.slice(quantity.index + quantity[0].length).trimStart();
  const desiredUnit = String(unit).normalize('NFKC');
  if (!suffix.startsWith(desiredUnit)) return false;
  // An explicit tail grammar prevents any short unit from borrowing the
  // prefix of a longer unit. A quoted quantity can also simply end at its unit.
  const tail = suffix.slice(desiredUnit.length).trimStart();
  if (desiredUnit && tail && !ROW_UNIT_TAIL.test(tail)) return false;
  return claim.quote.includes(claim.text);
}

function declaredCopy(shot) {
  const copy = [shot.title, shot.body, shot.caption];
  if (shot.type === 'steps' && Array.isArray(shot.items)) copy.push(...shot.items);
  if (shot.type === 'compare') for (const side of [shot.left, shot.right]) {
    copy.push(side?.label);
    if (Array.isArray(side?.items)) copy.push(...side.items);
  }
  const rows = shot.type === 'bars' ? shot.data : shot.type === 'transform' ? shot.items : [];
  if (Array.isArray(rows)) for (const row of rows) copy.push(row?.label);
  return copy.filter((value) => typeof value === 'string');
}

function validateClaims(shot, shotPath, facts, briefText, issues) {
  if (shot.claims === undefined) return [];
  if (!Array.isArray(shot.claims)) {
    addError(issues, `${shotPath}.claims`, '必须是数组');
    return [];
  }
  const valid = [];
  shot.claims.forEach((claim, i) => {
    const at = `${shotPath}.claims[${i}]`;
    const before = issues.errors.length;
    if (!fieldsOf(claim, new Set(['text', 'factId', 'quote']), at, issues)) return;
    stringAt(claim.text, `${at}.text`, issues);
    stringAt(claim.quote, `${at}.quote`, issues, {max: 2000});
    const fact = facts.get(claim.factId);
    if (!fact) addError(issues, `${at}.factId`, '必须引用存在的事实 ID');
    if (nonempty(claim.quote) && fact) {
      if (!String(fact.text).includes(claim.quote)) addError(issues, `${at}.quote`, '引文必须逐字存在于所引用的同一条事实中');
      if (briefText !== undefined && !String(briefText).includes(claim.quote)) addError(issues, `${at}.quote`, '引文必须逐字存在于提供的简报中');
      if (typeof claim.text === 'string' && !claim.quote.includes(claim.text)) addError(issues, `${at}.text`, 'claim.text 必须逐字存在于同一条 claim.quote 中，数值、标签、单位和条件不能改写');
      for (const number of numbersOf(claim.text)) if (!hasNumber(claim.quote, number)) addError(issues, `${at}.text`, `数值 ${number} 不在此 claim 的同一条引文中`);
    }
    if (issues.errors.length === before) valid.push(claim);
  });
  return valid;
}

function validateRows(rows, location, issues, {min, max, claims, demoData, unit = ''}) {
  if (!Array.isArray(rows) || rows.length < min || rows.length > max) {
    addError(issues, location, `必须有 ${min} 至 ${max} 个数据条目`);
    return;
  }
  const ids = new Set();
  rows.forEach((row, i) => {
    const at = `${location}[${i}]`;
    if (!fieldsOf(row, new Set(['id', 'label', 'value']), at, issues)) return;
    if (!uniqueId(row.id) || ids.has(row.id)) addError(issues, `${at}.id`, '数据 ID 必须有效且唯一，排序后仍保留同一 ID');
    ids.add(row.id);
    stringAt(row.label, `${at}.label`, issues, {max: 48});
    if (!finite(row.value) || row.value < 0) addError(issues, `${at}.value`, '必须是有限的非负数值');
    else if (!demoData && !claims.some((claim) => supportsRowClaim(claim, row, rows, unit))) {
      addError(issues, `${at}.value`, '标签和数值及单位需要独立的合法 claim.text：以本行标签开头，仅含一个数量，不含其他行标签，使用空白、冒号、等号或有/为/是/计/合计/总计/获得/得到/达到/耗时/用时/完成/完成了/记录为；单位后须结束、标点或约定说明词，片段须逐字属于 claim.quote，演示数据请声明 demoData');
    }
  });
}

/** Return every declared visible text string without inventing content. */
export function collectText(shot) {
  if (!plainObject(shot)) return [];
  const strings = [shot.title, shot.body, shot.caption];
  if (Array.isArray(shot.claims)) for (const claim of shot.claims) strings.push(claim?.text, claim?.factId);
  if (shot.type === 'steps' && Array.isArray(shot.items)) strings.push(...shot.items);
  if (shot.type === 'compare') for (const side of [shot.left, shot.right]) {
    strings.push(side?.label);
    if (Array.isArray(side?.items)) strings.push(...side.items);
  }
  const rows = shot.type === 'bars' ? shot.data : shot.type === 'transform' ? shot.items : [];
  if (Array.isArray(rows)) for (const row of rows) {
    strings.push(row?.label);
    if (finite(row?.value)) strings.push(`${row.value}${shot.type === 'bars' ? shot.unit ?? '' : ''}`);
  }
  return strings.filter((s) => typeof s === 'string' && s.length > 0);
}

function stripDisplayPunctuation(text) {
  const chars = [...text];
  return chars.map((char, i) => {
    if (!/\p{P}/u.test(char)) return char;
    const normalizedChar = char.normalize('NFKC');
    const prev = (chars[i - 1] ?? '').normalize('NFKC');
    const next = (chars[i + 1] ?? '').normalize('NFKC');
    // Decimal points, ratios, numeric signs and percent units carry factual meaning.
    // Normalize only classification inputs. Display keeps the original glyphs.
    if (['.', ':', '/'].includes(normalizedChar) && /\d/u.test(prev) && /\d/u.test(next)) return char;
    if (normalizedChar === '-' && /\d/u.test(next)) return char;
    if (normalizedChar === '%') return char;
    return '';
  }).join('').replace(/[ \t]+/gu, ' ').trim();
}

const srtTime = (text) => {
  const match = /^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/u.exec(text);
  if (!match) return null;
  return (Number(match[1]) * 3600000 + Number(match[2]) * 60000 + Number(match[3]) * 1000 + Number(match[4])) / 1000;
};

/** Keep the cue clock; punctuation filtering does not claim word-level alignment. */
export function parseSrt(text, duration) {
  const issues = issuesOf();
  const captions = [];
  if (typeof text !== 'string') {
    addError(issues, 'srt', '字幕必须是文本');
    return {captions, issues};
  }
  if (duration !== undefined && (!finite(duration) || duration <= 0)) addError(issues, 'srt.duration', '字幕校验时长必须是正数');
  else if (duration === undefined) addWarning(issues, 'srt.duration', '未提供最终音频时长，字幕末端覆盖尚未核对');
  const raw = text.replace(/^\uFEFF/u, '').replace(/\r\n?/gu, '\n').trim();
  if (!raw) {
    addError(issues, 'srt', '字幕为空');
    return {captions, issues};
  }
  let previousEnd = 0;
  const indexes = new Set();
  raw.split(/\n[ \t]*\n+/u).forEach((block, index) => {
    const location = `srt[${index}]`;
    const lines = block.split('\n');
    if (/^\d+$/u.test(lines[0].trim())) {
      const id = Number(lines.shift().trim());
      if (indexes.has(id)) addError(issues, location, '字幕序号重复');
      indexes.add(id);
    }
    const timing = /^\s*(\d{2,}:[0-5]\d:[0-5]\d[,.]\d{3})\s+-->\s+(\d{2,}:[0-5]\d:[0-5]\d[,.]\d{3})\s*$/u.exec(lines.shift() ?? '');
    if (!timing) {
      addError(issues, location, '无效 SRT 时间行');
      return;
    }
    const start = srtTime(timing[1]);
    const end = srtTime(timing[2]);
    if (end <= start) addError(issues, location, '字幕结束必须晚于开始');
    if (start < previousEnd - 1e-7) addError(issues, location, '字幕时码不能重叠或倒序');
    if (finite(duration) && end > duration + 1e-7) addError(issues, location, '字幕结束超过最终音频时长');
    previousEnd = Math.max(previousEnd, end);
    const copy = stripDisplayPunctuation(lines.join('\n'));
    if (!copy) addError(issues, location, '字幕没有可显示文字');
    if (/<[^>]*>|\{\\/u.test(copy)) addError(issues, location, '不接受 HTML 或字幕样式代码，请提供纯文字 SRT');
    captions.push({start, end, text: copy});
  });
  return {captions, issues};
}

/** Loading failures are reviewable issues, never thrown as an uncontrolled CLI stack. */
export function readProject(file, {briefPath} = {}) {
  const absolute = path.resolve(file);
  const baseDir = path.dirname(absolute);
  const issues = issuesOf();
  let project = null;
  let briefText;
  try {
    if (fs.lstatSync(absolute).isSymbolicLink()) throw new Error('项目 JSON 不得使用符号链接');
    if (fs.statSync(absolute).size > MAX_INPUT_BYTES) throw new Error('项目 JSON 过大');
    project = JSON.parse(fs.readFileSync(absolute, 'utf8').replace(/^\uFEFF/u, ''));
  } catch (error) { addError(issues, 'project', `无法读取项目：${error.message}`); }
  if (briefPath !== undefined) try {
    const brief = path.resolve(briefPath);
    if (fs.statSync(brief).size > MAX_INPUT_BYTES) throw new Error('简报过大');
    briefText = fs.readFileSync(brief, 'utf8').replace(/^\uFEFF/u, '');
  } catch (error) { addError(issues, 'brief', `无法读取简报：${error.message}`); }
  return {project, baseDir, briefText, issues};
}

/** The caller must refuse rendering whenever issues.errors is nonempty. */
export function compileProject(project, {baseDir, briefText, audioDuration} = {}) {
  const issues = issuesOf();
  const fps = project?.fps === 24 ? 24 : 30;
  const [width, height] = ownValue(RATIOS, project?.ratio) ?? RATIOS['16:9'];
  const timeline = [];
  const result = () => {
    const durationInFrames = timeline.at(-1)?.from + timeline.at(-1)?.frames || 0;
    return {project, timeline, durationInFrames, duration: durationInFrames / fps, width, height, fps, previewOnly: project?.draft === true || project?.audio?.kind === 'mock', issues};
  };
  if (!fieldsOf(project, ROOT_FIELDS, 'project', issues)) return result();
  if (project.schemaVersion !== 'heige-video/4') addError(issues, 'project.schemaVersion', '必须是 heige-video/4');
  stringAt(project.title, 'project.title', issues, {max: 80});
  if (!['promo', 'explainer', 'lesson', 'talk'].includes(project.mode)) addError(issues, 'project.mode', '未知生产模式');
  if (!ownValue(RATIOS, project.ratio)) addError(issues, 'project.ratio', '画幅必须是 16:9、9:16 或 1:1');
  if (!['ledger', 'nocturne'].includes(project.theme)) addError(issues, 'project.theme', '未知主题');
  if (project.fps !== undefined && ![24, 30].includes(project.fps)) addError(issues, 'project.fps', '帧率必须是 24 或 30');
  if (project.seed !== undefined && !Number.isSafeInteger(project.seed)) addError(issues, 'project.seed', '随机种子必须是安全整数');
  for (const key of ['draft', 'demoData']) if (project[key] !== undefined && typeof project[key] !== 'boolean') addError(issues, `project.${key}`, '必须是布尔值');
  stringAt(project.brand, 'project.brand', issues, {optional: true, max: 80});
  if (briefText !== undefined && typeof briefText !== 'string') addError(issues, 'briefText', '简报必须是文字');
  const facts = new Map();
  if (project.facts !== undefined && !Array.isArray(project.facts)) addError(issues, 'project.facts', '事实必须是数组');
  else for (const [index, fact] of (project.facts ?? []).entries()) {
    const at = `project.facts[${index}]`;
    if (!fieldsOf(fact, new Set(['id', 'text', 'source']), at, issues)) continue;
    if (!uniqueId(fact.id) || facts.has(fact.id)) addError(issues, `${at}.id`, '事实 ID 必须有效且唯一');
    stringAt(fact.text, `${at}.text`, issues, {max: 10000});
    stringAt(fact.source, `${at}.source`, issues, {max: 2000});
    facts.set(fact.id, fact);
  }
  const assets = new Map();
  if (project.assets !== undefined && !Array.isArray(project.assets)) addError(issues, 'project.assets', '素材必须是数组');
  else for (const [index, asset] of (project.assets ?? []).entries()) {
    const at = `project.assets[${index}]`;
    if (!fieldsOf(asset, new Set(['id', 'path', 'kind', 'source', 'rights']), at, issues)) continue;
    if (!uniqueId(asset.id) || assets.has(asset.id)) addError(issues, `${at}.id`, '素材 ID 必须有效且唯一');
    const extensions = ownValue(EXTENSIONS, asset.kind);
    if (!extensions) addError(issues, `${at}.kind`, '素材种类必须是 image、video 或 audio');
    if (!['original', 'licensed', 'screenshot', 'generated'].includes(asset.source)) addError(issues, `${at}.source`, '未知素材来源');
    stringAt(asset.rights, `${at}.rights`, issues, {max: 2000});
    try {
      if (!baseDir) throw new Error('素材校验需要项目 baseDir');
      const file = resolveProjectFile(asset.path, baseDir);
      if (extensions && !extensions.has(path.extname(file).toLowerCase())) addError(issues, `${at}.path`, '文件扩展名与素材种类不符');
    } catch (error) { addError(issues, `${at}.path`, `素材不可用：${error.message}`); }
    assets.set(asset.id, asset);
  }
  const hasAudio = project.audio !== undefined;
  if (hasAudio && fieldsOf(project.audio, new Set(['assetId', 'kind', 'subtitles']), 'project.audio', issues)) {
    if (assets.get(project.audio.assetId)?.kind !== 'audio') addError(issues, 'project.audio.assetId', '配音必须引用 audio 素材');
    if (!['recording', 'synthetic', 'mock'].includes(project.audio.kind)) addError(issues, 'project.audio.kind', '未知配音来源');
    if (project.audio.kind === 'mock') addWarning(issues, 'project.audio.kind', '占位音仅能作为 preview，不能标记为正式技术交付');
    if (audioDuration === undefined) addWarning(issues, 'project.audio', '尚未探测实际音频时长，当前仅校验区间结构；build 必须探测后重新编译');
    else if (!finite(audioDuration) || audioDuration <= 0) addError(issues, 'audioDuration', '实际音频时长必须是正数');
  }
  if (project.music !== undefined && fieldsOf(project.music, new Set(['assetId', 'volume']), 'project.music', issues)) {
    if (assets.get(project.music.assetId)?.kind !== 'audio') addError(issues, 'project.music.assetId', '配乐必须引用 audio 素材');
    if (project.music.volume !== undefined && (!finite(project.music.volume) || project.music.volume < 0 || project.music.volume > 1)) addError(issues, 'project.music.volume', '音量必须在 0 至 1 之间');
  }
  if (!Array.isArray(project.shots) || !project.shots.length) {
    addError(issues, 'project.shots', '必须有至少一个镜头');
    return result();
  }
  const ids = new Set();
  let cursor = 0;
  let previousRawEnd = 0;
  const targetFrames = finite(audioDuration) && audioDuration > 0 ? Math.round(audioDuration * fps) : null;
  project.shots.forEach((shot, index) => {
    const at = `project.shots[${index}]`;
    if (!plainObject(shot)) { addError(issues, at, '镜头必须是对象'); return; }
    const specific = ownValue(SHOT_FIELDS, shot.type);
    if (!specific) addError(issues, `${at}.type`, '未知镜头类型');
    if (shot.type === 'beat' && project.continuity === undefined) addError(issues, `${at}.type`, 'beat 必须使用连续世界，避免生成空镜头');
    fieldsOf(shot, new Set([...COMMON_FIELDS, ...(specific ?? [])]), at, issues);
    if (!uniqueId(shot.id) || ids.has(shot.id)) addError(issues, `${at}.id`, '镜头 ID 必须有效且唯一');
    ids.add(shot.id);
    stringAt(shot.title, `${at}.title`, issues, {max: 80});
    stringAt(shot.body, `${at}.body`, issues, {optional: true});
    if (shot.intentionalHold !== undefined && typeof shot.intentionalHold !== 'boolean') addError(issues, `${at}.intentionalHold`, '必须是布尔值');
    const claims = validateClaims(shot, at, facts, briefText, issues);
    if (project.demoData !== true) for (const text of declaredCopy(shot)) {
      if (hasNumericalContent(text) && !claims.some((claim) => claim.quote.includes(text))) addError(issues, at, `含数值的上屏文案「${text.slice(0, 80)}」必须逐字属于本镜合法 claim.quote，避免跨来源或改单位`);
    }
    if (shot.type === 'steps') stringList(shot.items, `${at}.items`, issues, 2, 5);
    if (shot.type === 'compare') for (const key of ['left', 'right']) if (fieldsOf(shot[key], new Set(['label', 'items']), `${at}.${key}`, issues)) {
      stringAt(shot[key].label, `${at}.${key}.label`, issues, {max: 48});
      stringList(shot[key].items, `${at}.${key}.items`, issues, 1, 4);
    }
    if (shot.type === 'bars') {
      stringAt(shot.unit, `${at}.unit`, issues, {optional: true, max: 12});
      validateRows(shot.data, `${at}.data`, issues, {min: 2, max: 6, claims, demoData: project.demoData === true, unit: shot.unit ?? ''});
    }
    if (shot.type === 'transform') {
      if (shot.operation !== 'sort') addError(issues, `${at}.operation`, '当前变换只支持 sort');
      validateRows(shot.items, `${at}.items`, issues, {min: 3, max: 7, claims, demoData: project.demoData === true});
    }
    if (shot.type === 'media') {
      if (!['image', 'video'].includes(assets.get(shot.assetId)?.kind)) addError(issues, `${at}.assetId`, '媒体镜头必须引用 image 或 video 素材');
      stringAt(shot.caption, `${at}.caption`, issues, {optional: true, max: 160});
    }
    let from = cursor;
    let frames = 0;
    if (hasAudio) {
      if (shot.duration !== undefined) addError(issues, `${at}.duration`, '有音频时只用 start/end，禁止独立 duration');
      if (!finite(shot.start) || !finite(shot.end) || shot.start < 0 || shot.end <= shot.start) {
        addError(issues, at, '有音频时每镜必须给有效的非负 start/end');
        return;
      }
      if (Math.abs(shot.start - previousRawEnd) > 1 / fps + 1e-7) addError(issues, `${at}.start`, index === 0 ? '第一镜必须从音频零点开始（允许一帧量化误差）' : '镜头区间必须首尾连续，不能空缺或重叠');
      let end = Math.round(shot.end * fps);
      if (index === project.shots.length - 1 && targetFrames !== null) {
        if (Math.abs(shot.end - audioDuration) > 1 / fps + 1e-7) addError(issues, `${at}.end`, '最后一镜必须覆盖实际完整音频（允许一帧量化误差）');
        else end = targetFrames;
      }
      if (targetFrames !== null && end > targetFrames + 1) addError(issues, `${at}.end`, '镜头超过实际音频时长');
      frames = end - from;
      previousRawEnd = shot.end;
    } else {
      if (shot.start !== undefined || shot.end !== undefined) addError(issues, at, '无音频时使用 duration，不混入 start/end');
      if (!finite(shot.duration) || shot.duration <= 0) { addError(issues, `${at}.duration`, '必须是正数秒数'); return; }
      frames = Math.round(shot.duration * fps);
    }
    const minimumFrames = shot.type === 'beat' ? Math.ceil(.25 * fps) : 2 * fps;
    if (frames < minimumFrames || frames > 20 * fps) addError(issues, `${at}.duration`, shot.type === 'beat' ? '每个 beat 量化后的时长必须为 0.25 至 20 秒' : '每镜量化后的时长必须为 2 至 20 秒');
    if (frames > 0) {
      timeline.push({...shot, from, frames, start: from / fps, end: (from + frames) / fps});
      cursor = from + frames;
    }
  });
  if (cursor > 600 * fps) addError(issues, 'project.shots', '整片不能超过 600 秒');
  if (hasAudio && nonempty(project.audio?.subtitles)) try {
    const file = resolveProjectFile(project.audio.subtitles, baseDir);
    if (path.extname(file).toLowerCase() !== '.srt') throw new Error('字幕必须是 SRT 文件');
    if (fs.statSync(file).size > MAX_INPUT_BYTES) throw new Error('字幕文件过大');
    const parsed = parseSrt(fs.readFileSync(file, 'utf8'), finite(audioDuration) && audioDuration > 0 ? audioDuration : undefined);
    for (const error of parsed.issues.errors) addError(issues, `project.audio.subtitles.${error.path}`, error.message);
    for (const warning of parsed.issues.warnings) addWarning(issues, `project.audio.subtitles.${warning.path}`, warning.message);
  } catch (error) { addError(issues, 'project.audio.subtitles', `字幕不可用：${error.message}`); }
  else if (hasAudio && project.audio?.subtitles !== undefined) addError(issues, 'project.audio.subtitles', '字幕路径必须是非空字符串');
  if (project.continuity !== undefined) {
    validateContinuity(project.continuity, result(), issues);
    if (Array.isArray(project.continuity?.objects)) project.continuity.objects.forEach((item, index) => {
      if (!plainObject(item)) return;
      const at = `project.continuity.objects[${index}]`;
      const claims = validateClaims(item, at, facts, briefText, issues);
      const copy = [item.text, ...(Array.isArray(item.rows) ? item.rows : [])].filter(value => typeof value === 'string');
      if (project.demoData !== true) for (const text of copy) if (hasNumericalContent(text) && !claims.some(claim => claim.quote.includes(text))) addError(issues, at, `连续对象含数值文案「${text.slice(0,80)}」需要该对象自己的合法 claim.quote`);
    });
  }
  return result();
}

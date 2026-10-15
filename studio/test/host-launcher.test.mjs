import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {ROOT, parse, prepareEnvironment, storyAncestors, runChild} from '../../scripts/host.mjs';

const CLI = path.join(ROOT, 'scripts/host.mjs');
const temporary = async fn => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-host-test-'));
  try {return await fn(dir);} finally {fs.rmSync(dir, {recursive: true, force: true});}
};
const cleanEnv = () => {
  const env = {...process.env}; delete env.NODE_PATH; delete env.NODE_OPTIONS;
  return env;
};
const run = (args, cwd, env = cleanEnv(), entry = CLI) => spawnSync(process.execPath, [entry, ...args], {cwd, env, encoding: 'utf8', timeout: 20000, maxBuffer: 4 * 1024 * 1024});
const selectedPython = dir => {
  const context = prepareEnvironment(parse(['story', 'check', '--project', 'p'], dir), cleanEnv(), dir);
  try {return context.python;} finally {context.cleanup();}
};
const createVenv = (python, directory) => {
  const created = spawnSync(python, ['-m', 'venv', '--without-pip', directory], {env: cleanEnv(), encoding: 'utf8', timeout: 20000});
  assert.equal(created.status, 0, created.stderr);
  return path.join(directory, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
};

test('real CLI init and validate preserve caller-relative Chinese/space paths through a symlink entry', () => temporary(dir => {
  const working = path.join(dir, '用户 空间'); fs.mkdirSync(working);
  const link = path.join(dir, '视频 入口.mjs'); fs.symlinkSync(CLI, link);
  const file = path.join(working, '项目 素材', '影片.json');
  const initialized = run(['init', '项目 素材/影片.json', '--ratio', '9:16'], working, cleanEnv(), link);
  assert.equal(initialized.status, 0, initialized.stderr);
  const response = JSON.parse(initialized.stdout);
  assert.equal(fs.realpathSync(response.project), fs.realpathSync(file));
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).ratio, '9:16');
  const validated = run(['validate', '项目 素材/影片.json'], working, cleanEnv(), link);
  assert.equal(validated.status, 0, validated.stderr);
  assert.equal(JSON.parse(validated.stdout).status, 'pass');
  assert.ok(!fs.existsSync(path.join(ROOT, '项目 素材')));
}));

test('unknown, duplicate, incomplete and irrelevant arguments fail without creating output', () => temporary(dir => {
  for (const args of [[], ['oops'], ['init', 'project.json', '--ratio', '9:16', '--ratio', '16:9'], ['init', 'project.json', '--out', 'bad'], ['build', 'project.json', '--out'], ['portraits', 'build', '--out', ''], ['doctor', '--backend', 'svg', '--browser', 'a'], ['story', 'check', '--project', 'a', '--project', 'b']]) {
    const result = run(args, dir);
    assert.notEqual(result.status, 0, JSON.stringify(args));
    assert.equal(JSON.parse(result.stderr.trim().split('\n').at(-1)).status, 'blocked');
  }
  assert.deepEqual(fs.readdirSync(dir), []);
}));

test('path arguments are normalized before changing cwd while content values stay literal', () => {
  const cwd = path.join(os.tmpdir(), 'caller 中文');
  const request = parse(['story', 'approve', '--project', '项目', '--actor', 'user', '--statement', '脚本 OK 素材重新制作', '--reply-ref', 'reply-7', '--asset-mode', 'regenerate', '--script-ok', '--material-ok'], cwd);
  assert.equal(request.options.project, path.join(cwd, '项目'));
  assert.equal(request.options.statement, '脚本 OK 素材重新制作');
  assert.equal(request.options['reply-ref'], 'reply-7');
  const build = parse(['build', '影片.json', '--out', '输出', '--brief', '正文.md', '--browser', '浏览器', '--story', '故事'], cwd);
  for (const key of ['out', 'brief', 'browser', 'story']) assert.ok(path.isAbsolute(build.options[key]));
  assert.equal(build.positional[0], path.join(cwd, '影片.json'));
});

test('explicit missing interpreter is a friendly failure and cannot silently select another Python', () => temporary(dir => {
  const result = run(['story', 'check', '--project', 'p'], dir, {...cleanEnv(), HEIGE_PYTHON: path.join(dir, 'no python')});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Set HEIGE_PYTHON/);
  assert.match(result.stderr, /nothing was installed/);
  assert.deepEqual(fs.readdirSync(dir), []);
}));

test('environment setup removes inherited Node injections and cleans only its private temporary directory', () => temporary(dir => {
  const sentinel = path.join(dir, 'keep'); fs.writeFileSync(sentinel, 'user data');
  const original = {...cleanEnv(), NODE_PATH: '/host-private/modules', NODE_OPTIONS: '--require /host-private/hook.cjs'};
  const context = prepareEnvironment(parse(['init', 'p.json'], dir), original, dir);
  const own = context.temporary;
  try {
    assert.equal(context.env.NODE_PATH, undefined); assert.equal(context.env.NODE_OPTIONS, undefined);
    assert.equal(original.NODE_PATH, '/host-private/modules');
    assert.ok(context.env.PATH.split(path.delimiter).includes(path.join(own, 'bin')));
    assert.equal(fs.readFileSync(sentinel, 'utf8'), 'user data');
  } finally {context.cleanup();}
  assert.ok(!fs.existsSync(own)); assert.equal(fs.readFileSync(sentinel, 'utf8'), 'user data');
}));

test('a newly created standard-library virtualenv preserves pyvenv.cfg discovery without project .venv', () => temporary(dir => {
  const venv = createVenv(selectedPython(dir), path.join(dir, 'isolated venv'));
  const result = spawnSync(venv, ['-c', 'import sys,json; print(json.dumps({"prefix":sys.prefix,"base":sys.base_prefix}))'], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  const expected = JSON.parse(result.stdout);
  assert.notEqual(expected.prefix, expected.base);
  const context = prepareEnvironment(parse(['story', 'check', '--project', 'p'], dir), {...cleanEnv(), HEIGE_PYTHON: venv}, dir);
  try {
    assert.equal(context.python, venv);
    const actual = spawnSync(context.python, ['-c', 'import sys; print(sys.prefix)'], {env: context.env, encoding: 'utf8'});
    assert.equal(actual.status, 0, actual.stderr);
    assert.equal(actual.stdout.trim(), expected.prefix);
  } finally {context.cleanup();}
}));

test('media tool directories cannot shadow a caller-selected bare Python with an incompatible interpreter', {skip: process.platform === 'win32'}, () => temporary(dir => {
  const python = selectedPython(dir);
  const available = spawnSync(python, ['-c', 'import sys,PIL,fontTools; print(sys.prefix)'], {env: cleanEnv(), encoding: 'utf8'});
  assert.equal(available.status, 0, available.stderr);
  const incompatible = createVenv(python, path.join(dir, 'media-tools'));
  const absent = spawnSync(incompatible, ['-c', 'import importlib.util; print(importlib.util.find_spec("PIL"))'], {env: cleanEnv(), encoding: 'utf8'});
  assert.equal(absent.status, 0, absent.stderr);
  assert.equal(absent.stdout.trim(), 'None', 'The conflicting interpreter must genuinely lack Pillow');
  const callerBin = path.join(dir, 'caller-bin'); fs.mkdirSync(callerBin);
  const callerPython = path.join(callerBin, 'python');
  const quoted = "'" + python.replaceAll("'", "'\"'\"'") + "'";
  fs.writeFileSync(callerPython, '#!/bin/sh\nexec ' + quoted + ' "$@"\n', {mode: 0o755});
  const env = {...cleanEnv(), HEIGE_PYTHON: 'python', PATH: [callerBin, process.env.PATH].filter(Boolean).join(path.delimiter)};
  for (const [key, name] of [['FFMPEG', 'ffmpeg'], ['FFPROBE', 'ffprobe']]) {
    const located = spawnSync('/bin/sh', ['-c', 'command -v "$1"', 'find-tool', env[key] || name], {env, encoding: 'utf8'});
    assert.equal(located.status, 0, located.stderr);
    env[key] = path.join(path.dirname(incompatible), name);
    fs.symlinkSync(located.stdout.trim(), env[key]);
  }
  const context = prepareEnvironment(parse(['portraits', 'proof', '--out', 'not-rendered'], dir), env, dir);
  try {
    assert.equal(context.python, callerPython, 'HEIGE_PYTHON=python must retain the original PATH selection');
    for (const command of [context.python, 'python']) {
      const actual = spawnSync(command, ['-c', 'import sys,PIL,fontTools; print(sys.prefix)'], {env: context.env, cwd: ROOT, encoding: 'utf8'});
      assert.equal(actual.status, 0, actual.stderr);
      assert.equal(actual.stdout.trim(), available.stdout.trim());
    }
  } finally {context.cleanup();}
}));

test('story markers in either symlink or real ancestors cannot be bypassed', () => temporary(dir => {
  const logical = path.join(dir, '资料'), real = path.join(dir, '实际');
  fs.mkdirSync(logical); fs.mkdirSync(real);
  for (const location of [logical, real]) fs.writeFileSync(path.join(location, 'intake.json'), '{}');
  const project = path.join(real, 'video.json'); fs.writeFileSync(project, '{}');
  const link = path.join(logical, 'video.json'); fs.symlinkSync(project, link);
  assert.deepEqual(new Set(storyAncestors(link)), new Set([fs.realpathSync(logical), fs.realpathSync(real)]));
  assert.ok(storyAncestors(logical).includes(fs.realpathSync(logical)));
  assert.ok(storyAncestors(path.join(logical, '尚未创建', 'deep', 'video.json')).includes(fs.realpathSync(logical)));
}));

test('actual material intake resolves input paths and unapproved nested build is blocked before output creation', () => temporary(dir => {
  fs.writeFileSync(path.join(dir, '文章.md'), '# 原始资料\n\n小树在春天发芽。\n');
  const ingested = run(['story', 'ingest', '文章.md', '--project', '故事 项目'], dir);
  assert.equal(ingested.status, 0, ingested.stderr);
  const project = path.join(dir, '故事 项目');
  assert.ok(fs.existsSync(path.join(project, 'intake.json')));
  fs.mkdirSync(path.join(project, 'render'));
  const initialized = run(['init', '故事 项目/render/project.json'], dir);
  assert.equal(initialized.status, 0, initialized.stderr);
  const blocked = run(['build', '故事 项目/render/project.json', '--out', '绝不能创建'], dir);
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /approval|script|TODO|story|Missing|blocked/i);
  assert.ok(!fs.existsSync(path.join(dir, '绝不能创建')));
}));

test('runtime source-dir and every external-story production route block unapproved material before executing sources', () => temporary(dir => {
  fs.writeFileSync(path.join(dir, 'article.txt'), 'An original document used only by this isolated test.\n');
  const ingested = run(['story', 'ingest', 'article.txt', '--project', 'story'], dir);
  assert.equal(ingested.status, 0, ingested.stderr);
  const sentinel = path.join(dir, 'source-was-executed');
  const source = `from pathlib import Path\nPath(${JSON.stringify(sentinel)}).write_text('unexpected')\nDURATION = 1\ndef render(t):\n    return '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="red"/></svg>'\n`;
  fs.writeFileSync(path.join(dir, 'story', 'tech.py'), source);
  fs.writeFileSync(path.join(dir, 'external.py'), source);
  const cases = [
    ['runtime', 'frame', '--source', 'story/tech.py', '--out', 'frame'],
    ['runtime', 'render', '--source-dir', 'story', '--duration', '0.1', '--width', '32', '--height', '32', '--out', 'runtime'],
    ['runtime', 'frame', '--source', 'external.py', '--source-dir', 'story', '--out', 'external-source'],
    ['runtime', 'render', '--source', 'story/tech.py', '--story', 'story', '--out', 'explicit-runtime'],
    ['showcase', 'proof', '--only', 'CitrusHorizontal', '--story', 'story', '--out', 'showcase'],
    ['portraits', 'build', '--only', 'BerryCone', '--story', 'story', '--out', 'portrait'],
  ];
  for (const args of cases) {
    const result = run(args, dir);
    assert.notEqual(result.status, 0, JSON.stringify(args));
    assert.match(result.stderr, /Missing file|approval|TODO_STORY|asset-plan/);
    assert.doesNotMatch(result.stderr, /Unknown argument|unrecognized arguments/);
    assert.ok(!fs.existsSync(path.join(dir, args.at(-1))), JSON.stringify(args));
  }
  assert.ok(!fs.existsSync(sentinel));
}));

test('a child reporting exit zero with empty output is never labeled successful', async () => {
  await assert.rejects(runChild(process.execPath, ['-e', ''], {env: cleanEnv(), label: 'empty test'}), /without output/);
});

test('cancellation kills only the launched process group including a TERM-ignoring descendant', {skip: process.platform === 'win32', timeout: 12000}, () => temporary(async dir => {
  const ids = path.join(dir, 'owned-pids.json');
  const grandchild = "process.on('SIGTERM',()=>{}); setInterval(()=>{},1000);";
  const childCode = `const fs=require('node:fs'); const {spawn}=require('node:child_process'); process.on('SIGTERM',()=>{}); const c=spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'ignore'}); fs.writeFileSync(${JSON.stringify(ids)},JSON.stringify([process.pid,c.pid])); console.log('ready'); setInterval(()=>{},1000);`;
  const wrapper = `import {runChild} from ${JSON.stringify(pathToFileURL(CLI).href)}; runChild(process.execPath,['-e',${JSON.stringify(childCode)}],{env:process.env,label:'owned'}).catch(e=>{console.error(e.message);process.exitCode=e.exitCode||1});`;
  const launched = spawn(process.execPath, ['--input-type=module', '-e', wrapper], {env: cleanEnv(), stdio: ['ignore', 'pipe', 'pipe']});
  let stderr = ''; launched.stderr.on('data', chunk => {stderr += chunk;});
  const close = new Promise(resolve => launched.once('close', (code, signal) => resolve({code, signal})));
  let owned = [];
  try {
    await new Promise((resolve, reject) => {const timer = setTimeout(() => reject(new Error('Child did not start')), 4000); launched.stdout.once('data', () => {clearTimeout(timer); resolve();}); launched.once('error', reject);});
    owned = JSON.parse(fs.readFileSync(ids, 'utf8'));
    launched.kill('SIGTERM');
    const result = await close;
    assert.equal(result.code, 143, stderr);
    for (const pid of owned) assert.throws(() => process.kill(pid, 0), {code: 'ESRCH'});
    process.kill(process.pid, 0);
  } finally {
    if (launched.exitCode === null) launched.kill('SIGKILL');
    for (const pid of owned) {try {process.kill(pid, 'SIGKILL');} catch {}}
  }
}));

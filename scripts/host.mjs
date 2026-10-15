#!/usr/bin/env node
/** Portable agent-host entry point. No installs, downloads, shell interpolation or host-private paths. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawn, spawnSync} from 'node:child_process';

export const ROOT = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const paths = new Set(['out', 'brief', 'browser', 'source', 'source-dir', 'project', 'story']);
const runtimeValues = ['style', 'label', 'source-dir', 'source', 'backend', 'out', 'width', 'height', 'fps', 'duration', 'start', 'time', 'font-family', 'crf', 'preset', 'cuts', 'canvas-startup-timeout', 'canvas-frame-timeout', 'shutter-samples', 'shutter-angle'];
const runtimeFlags = ['fit-time', 'no-qa-images'];
const HELP = `HeiGe-Video portable host
  doctor [--backend studio|svg|canvas] [--browser PATH]
  init PROJECT.json [--ratio 16:9|9:16|1:1]
  validate PROJECT.json [--brief FILE]
  build PROJECT.json --out NEW_DIR [--brief FILE] [--browser PATH] [--story DIR]
  verify PROJECT.json --out DIR [--brief FILE] [--browser PATH]
  showcase proof|build --out NEW_DIR [--only COMPOSITION_ID] [--story DIR]
  portraits proof|build --out NEW_DIR [--only COMPOSITION_ID] [--story DIR]
  runtime doctor|audit|frame|render [legacy runtime options; frame/render accept --story DIR]
  story ingest INPUT... --project NEW_DIR
  story template|check|approve|seal-assets|gate --project DIR [story options]
  check
Paths supplied by the caller are relative to its original working directory.
This launcher never installs dependencies or downloads a browser.
`;

function need(condition, message) {if (!condition) throw new Error(message);}
const absolute = (value, cwd) => path.resolve(cwd, value);

export function parse(argv, cwd = process.cwd()) {
  const [command, ...rest] = argv;
  if (command === 'help' || command === '--help') {need(!rest.length, 'help takes no arguments'); return {command: 'help'};}
  need(command, 'A command is required. Use help for supported commands.');
  let subcommand;
  if (['runtime', 'story', 'showcase', 'portraits'].includes(command)) subcommand = rest.shift();
  let values = [], flags = [], minimum = 0, maximum = 0;
  if (command === 'doctor') values = ['backend', 'browser'];
  else if (command === 'init') {values = ['ratio']; minimum = maximum = 1;}
  else if (command === 'validate') {values = ['brief']; minimum = maximum = 1;}
  else if (command === 'build' || command === 'verify') {values = ['out', 'brief', 'browser', ...(command === 'build' ? ['story'] : [])]; minimum = maximum = 1;}
  else if (command === 'runtime') {
    need(['doctor', 'audit', 'frame', 'render'].includes(subcommand), 'runtime requires doctor, audit, frame or render');
    values = [...runtimeValues, ...(['frame', 'render'].includes(subcommand) ? ['story'] : [])]; flags = runtimeFlags;
  } else if (command === 'showcase' || command === 'portraits') {
    need(['proof', 'build'].includes(subcommand), command + ' requires proof or build'); values = ['out', 'only', 'story'];
  } else if (command === 'story') {
    need(['ingest', 'template', 'check', 'approve', 'seal-assets', 'gate'].includes(subcommand), 'Unknown story command');
    values = ['project'];
    if (subcommand === 'ingest') {minimum = 1; maximum = Infinity;}
    if (subcommand === 'approve') {values.push('actor', 'statement', 'reply-ref', 'asset-mode'); flags = ['script-ok', 'material-ok'];}
    if (subcommand === 'gate') values.push('stage');
  } else need(command === 'check', 'Unknown command: ' + command);
  const options = {}, positional = [];
  for (let i = 0; i < rest.length; i++) {
    const value = rest[i];
    if (value.startsWith('-')) {
      need(value.startsWith('--') && !value.includes('='), 'Use explicit --name VALUE arguments: ' + value);
      const key = value.slice(2);
      need(values.includes(key) || flags.includes(key), 'Unknown argument: ' + value);
      need(!Object.hasOwn(options, key), 'Duplicate argument: ' + value);
      if (flags.includes(key)) options[key] = true;
      else {
        need(rest[i + 1] !== undefined && !rest[i + 1].startsWith('--'), 'Missing value for ' + value);
        const item = rest[++i];
        need(item.trim().length, 'Empty value for ' + value);
        options[key] = paths.has(key) ? absolute(item, cwd) : item;
      }
    } else positional.push(absolute(value, cwd));
  }
  need(positional.length >= minimum && positional.length <= maximum, 'Unexpected or missing positional arguments for ' + command);
  if (command === 'doctor') need(['studio', 'svg', 'canvas'].includes(options.backend ?? 'studio'), 'doctor backend must be studio, svg or canvas');
  if (command === 'doctor' && options.backend && options.backend !== 'studio') need(!options.browser, '--browser applies only to the studio backend');
  if (command === 'runtime') need(['svg', 'canvas'].includes(options.backend ?? 'svg'), 'runtime backend must be svg or canvas');
  if (command === 'init') need(['16:9', '9:16', '1:1'].includes(options.ratio ?? '16:9'), 'Unsupported ratio');
  if (['build', 'verify', 'showcase', 'portraits'].includes(command)) need(options.out, '--out is required');
  if (command === 'runtime' && ['frame', 'render'].includes(subcommand)) need(options.out, '--out is required');
  if (command === 'story') {
    need(options.project, '--project is required');
    if (subcommand === 'gate') need(['assets', 'render'].includes(options.stage), 'gate requires --stage assets|render');
    if (subcommand === 'approve') for (const key of ['actor', 'statement', 'reply-ref', 'asset-mode']) need(options[key], 'approve requires --' + key);
    if (subcommand === 'approve') need(['reuse', 'regenerate', 'mixed'].includes(options['asset-mode']), 'Unsupported asset mode');
  }
  return {command, subcommand, options, positional};
}

function executable(value, env, cwd = process.cwd()) {
  if (!value) return null;
  const extensions = process.platform === 'win32' ? (env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];
  const bases = /[\\/]/.test(value) || path.isAbsolute(value) ? [absolute(value, cwd)] : (env.PATH ?? '').split(path.delimiter).filter(Boolean).map(dir => path.resolve(cwd, dir, value));
  for (const base of bases) for (const suffix of ['', ...extensions]) {
    const file = base + suffix;
    // Python locates pyvenv.cfg relative to the invoked executable. Resolving a
    // .venv/bin/python symlink here would silently discard the virtualenv.
    try {if (fs.statSync(file).isFile()) {fs.accessSync(file, fs.constants.X_OK); return path.resolve(file);}} catch {}
  }
  return null;
}
function capture(binary, args, env, label = binary) {
  const result = spawnSync(binary, args, {cwd: ROOT, env, encoding: 'utf8', timeout: 20000, maxBuffer: 4 * 1024 * 1024});
  need(!result.error && result.status === 0, label + ' is unavailable: ' + (result.error?.message ?? result.stderr?.trim() ?? result.status));
  need(result.stdout?.trim(), label + ' returned an empty diagnostic');
  return result.stdout.trim();
}
function choosePython(env, modules, cwd) {
  const candidates = env.HEIGE_PYTHON ? [env.HEIGE_PYTHON] : [path.join(ROOT, '.venv', 'bin', 'python'), path.join(ROOT, '.venv', 'Scripts', 'python.exe'), 'python3', 'python'];
  const errors = [];
  for (const item of candidates) {
    const binary = executable(item, env, cwd);
    if (!binary) {errors.push(item + ': not found'); continue;}
    try {
      const code = `import sys,json,importlib; assert sys.version_info >= (3,10), 'Python 3.10 or newer required'; [importlib.import_module(x) for x in ${JSON.stringify(modules)}]; print(json.dumps({'executable':sys.executable,'version':sys.version.split()[0]}))`;
      capture(binary, ['-c', code], env, 'Python');
      return binary;
    } catch (error) {errors.push(error.message);}
  }
  throw new Error('No usable Python. Set HEIGE_PYTHON to Python 3.10+ with ' + (modules.length ? modules.join(', ') : 'the standard library') + '. Run dependency setup explicitly; nothing was installed. ' + errors.join(' | '));
}
function xml(value) {return value.replace(/[<>&"']/g, char => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'}[char]));}

export function prepareEnvironment(request, originalEnv = process.env, cwd = process.cwd()) {
  const env = {...originalEnv};
  // WorkBuddy deliberately removes these. Never require an inherited module injection.
  delete env.NODE_PATH; delete env.NODE_OPTIONS;
  const standardBins = process.platform === 'darwin' ? ['/opt/homebrew/bin', '/usr/local/bin'] : process.platform === 'win32' ? [] : ['/usr/local/bin'];
  env.PATH = [...new Set([...(env.PATH ?? '').split(path.delimiter).filter(Boolean), ...standardBins.filter(dir => fs.existsSync(dir))])].join(path.delimiter);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'heige-host-'));
  const cleanup = () => fs.rmSync(temporary, {recursive: true, force: true});
  try {
    const bin = path.join(temporary, 'bin'); fs.mkdirSync(bin);
    const node = executable(env.HEIGE_NODE || process.execPath, env, cwd);
    need(node, 'Node is missing. Set HEIGE_NODE to an installed Node executable.');
    const version = capture(node, ['-p', 'process.versions.node'], env, 'Node');
    need(Number(version.split('.')[0]) >= 20, 'Node 20 or newer is required; selected ' + version);
    const media = request.command === 'doctor' || ['build', 'verify', 'showcase', 'portraits', 'runtime'].includes(request.command);
    const needsPython = request.command !== 'init' && request.command !== 'help';
    // Bind bare HEIGE_PYTHON against the caller's PATH before adding tool shims.
    // A media-tool directory may also contain an unrelated system Python.
    if (needsPython) env.HEIGE_PYTHON = choosePython(env, media ? ['PIL', 'fontTools'] : [], cwd);
    const alias = (name, file) => {
      const target = path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
      try {fs.symlinkSync(file, target, 'file');}
      catch (error) {
        need(path.basename(file).toLowerCase() === path.basename(target).toLowerCase(), 'Cannot alias ' + name + '; use the standard executable filename or enable symlink creation. ' + error.message);
        return path.dirname(file);
      }
      return null;
    };
    const fallbackDirectories = [alias('node', node)];
    if (media || request.command === 'validate') for (const [name, key] of [['ffmpeg', 'FFMPEG'], ['ffprobe', 'FFPROBE']]) {
      const file = executable(env[key] || name, env, cwd);
      need(file, name + ' is missing. Install it explicitly or set ' + key + ' to its executable.');
      env[key] = file; fallbackDirectories.push(alias(name, file));
    }
    if (process.platform === 'darwin') {
      const libraries = ['/opt/homebrew/opt/librsvg/lib', '/opt/homebrew/lib', '/usr/local/opt/librsvg/lib', '/usr/local/lib'].filter(dir => fs.existsSync(dir));
      if (libraries.length) env.DYLD_LIBRARY_PATH = [...libraries, env.DYLD_LIBRARY_PATH].filter(Boolean).join(path.delimiter);
    }
    // Only the named private shims take priority. Whole tool directories are a
    // fallback after the original PATH and cannot shadow other caller tools.
    env.PATH = [...new Set([bin, ...(env.PATH ?? '').split(path.delimiter).filter(Boolean), ...fallbackDirectories.filter(Boolean)])].join(path.delimiter);
    if (env.HEIGE_BROWSER_PATH && !request.options.browser) {
      const browser = executable(env.HEIGE_BROWSER_PATH, env, cwd);
      need(browser, 'HEIGE_BROWSER_PATH is not an executable browser'); env.HEIGE_BROWSER_PATH = browser;
    }
    if (request.options.browser) request.options.browser = executable(request.options.browser, env, cwd) ?? (() => {throw new Error('--browser is not an executable browser');})();
    const needsFont = media && !['showcase', 'portraits'].includes(request.command) && !(request.command === 'runtime' && request.subcommand === 'audit');
    let family;
    if (needsFont) {
      let font = env.HEIGE_FONT_PATH && absolute(env.HEIGE_FONT_PATH, cwd);
      if (font) need(fs.existsSync(font) && fs.statSync(font).isFile(), 'HEIGE_FONT_PATH is not a readable font file');
      if (!font) {
        const candidates = [path.join(ROOT, '.cache/fonts/NotoSansCJKsc-Regular.otf'), path.join(ROOT, '.cache/fonts/NotoSansSC-Regular.ttf')];
        font = candidates.find(file => fs.existsSync(file));
        if (!font) {
          const fc = executable('fc-match', env, cwd);
          if (fc) {
            const match = capture(fc, ['Noto Sans CJK SC', '--format=%{file}\n%{family}\n%{index}\n'], env, 'fontconfig').split('\n');
            if (/Noto Sans (CJK )?SC/i.test(match[1] ?? '') && fs.existsSync(match[0])) {font = match[0]; env.HEIGE_FONT_INDEX = match[2] || '0';}
          }
        }
      }
      need(font, 'No local Noto Sans SC font was found. Supply a licensed Chinese font with HEIGE_FONT_PATH; nothing was downloaded.');
      font = fs.realpathSync(font); env.HEIGE_FONT_PATH = font;
      const index = env.HEIGE_FONT_INDEX ?? '0';
      need(/^\d+$/.test(index), 'HEIGE_FONT_INDEX must be a nonnegative integer');
      const code = "from fontTools.ttLib import TTFont; import sys; f=TTFont(sys.argv[1],fontNumber=int(sys.argv[2])); print(f['name'].getDebugName(1)); f.close()";
      family = capture(env.HEIGE_PYTHON, ['-c', code, font, index], env, 'Chinese font');
      const fontDirectory = path.join(temporary, 'fonts'); fs.mkdirSync(fontDirectory);
      fs.copyFileSync(font, path.join(fontDirectory, 'selected' + path.extname(font)));
      const config = path.join(temporary, 'fonts.conf');
      fs.writeFileSync(config, `<?xml version="1.0"?><fontconfig><dir>${xml(fontDirectory)}</dir><cachedir>${xml(path.join(temporary, 'font-cache'))}</cachedir></fontconfig>\n`);
      env.FONTCONFIG_FILE = config;
      if (request.command === 'runtime' || (request.command === 'doctor' && request.options.backend !== 'studio' && request.options.backend)) need(executable('fc-match', env, cwd), 'Legacy runtime needs fontconfig (fc-match). Install it explicitly.');
    }
    if (request.command === 'doctor' || (request.command === 'runtime' && request.subcommand === 'doctor')) env.VIDEO_RUNTIME_CACHE = path.join(temporary, 'runtime-cache');
    return {env, node, python: env.HEIGE_PYTHON, temporary, family, cleanup};
  } catch (error) {cleanup(); throw error;}
}

function optionArgs(options, omit = []) {return Object.entries(options).filter(([key]) => !omit.includes(key)).flatMap(([key, value]) => value === true ? ['--' + key] : ['--' + key, value]);}

export function storyAncestors(file) {
  const directory = fs.existsSync(file) && fs.statSync(file).isDirectory();
  const starts = [directory ? file : path.dirname(file)];
  if (fs.existsSync(file)) starts.push(directory ? fs.realpathSync(file) : path.dirname(fs.realpathSync(file)));
  const found = new Set();
  for (let current of starts) {
    // Inspect lexical and real ancestors. A symlink must not bypass either intake.
    for (;;) {
      if (fs.existsSync(path.join(current, 'intake.json'))) found.add(fs.realpathSync(current));
      if (fs.existsSync(current)) {
        let real = fs.realpathSync(current);
        for (;;) {
          if (fs.existsSync(path.join(real, 'intake.json'))) found.add(real);
          const parent = path.dirname(real); if (parent === real) break; real = parent;
        }
      }
      const parent = path.dirname(current); if (parent === current) break; current = parent;
    }
  }
  return [...found];
}
function cleanupOwnLock(pid, token) {
  const directory = path.join(os.tmpdir(), 'heige-video-render.lock'), owner = path.join(directory, 'owner');
  try {
    const dirStat = fs.lstatSync(directory), fileStat = fs.lstatSync(owner);
    if (!dirStat.isDirectory() || dirStat.isSymbolicLink() || !fileStat.isFile() || fileStat.isSymbolicLink() || fs.readFileSync(owner, 'utf8') !== `${pid}:${token}`) return;
    const unchanged = (file, stat) => {const now = fs.lstatSync(file); return now.dev === stat.dev && now.ino === stat.ino;};
    if (unchanged(directory, dirStat) && unchanged(owner, fileStat) && fs.readFileSync(owner, 'utf8') === `${pid}:${token}`) {fs.unlinkSync(owner); fs.rmdirSync(directory);}
  } catch (error) {if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) console.error('Own render lock cleanup: ' + error.message);}
}

export async function runChild(binary, args, {env, label, captureOutput = false, renderToken} = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(binary, args, {cwd: ROOT, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe']});
    let output = '', hasOutput = false, interrupted = null, timer;
    const kill = signal => {try {if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal); else child.kill(signal);} catch (error) {if (error.code !== 'ESRCH') console.error('Child signal: ' + error.message);}};
    const abort = signal => {
      if (interrupted) {kill('SIGKILL'); return;}
      interrupted = signal; kill(signal);
      timer = setTimeout(() => kill('SIGKILL'), 3000);
    };
    const onInt = () => abort('SIGINT'), onTerm = () => abort('SIGTERM');
    process.on('SIGINT', onInt); process.on('SIGTERM', onTerm);
    const dispose = () => {clearTimeout(timer); process.off('SIGINT', onInt); process.off('SIGTERM', onTerm);};
    child.stdout.on('data', chunk => {if (/\S/.test(chunk.toString())) hasOutput = true; if (captureOutput) {output += chunk; if (output.length > 8 * 1024 * 1024) {kill('SIGKILL');}} else process.stdout.write(chunk);});
    child.stderr.on('data', chunk => process.stderr.write(chunk));
    child.on('error', error => {dispose(); reject(new Error(label + ': ' + error.message));});
    child.on('close', (code, signal) => {
      // The detached group belongs to this launch only. Reap residual children on cancellation.
      if (interrupted) kill('SIGKILL');
      dispose();
      if ((interrupted || code !== 0 || signal) && renderToken) cleanupOwnLock(child.pid, renderToken);
      if (interrupted) {const error = new Error(label + ' cancelled by ' + interrupted); error.exitCode = interrupted === 'SIGINT' ? 130 : 143; reject(error);}
      else if (code !== 0 || signal) {const error = new Error(label + ' exited ' + (signal || code)); error.exitCode = code || 1; reject(error);}
      else if (!hasOutput) reject(new Error(label + ' returned success without output'));
      else if (output.length > 8 * 1024 * 1024) reject(new Error(label + ' exceeded the diagnostic output limit'));
      else resolve(output);
    });
  });
}

export async function main(argv = process.argv.slice(2), originalCwd = process.cwd()) {
  const request = parse(argv, originalCwd);
  if (request.command === 'help') {console.log(HELP); return;}
  const context = prepareEnvironment(request, process.env, originalCwd);
  const {env, node, python, family} = context;
  const execute = (binary, args, settings = {}) => runChild(binary, args, {env, label: request.command, ...settings});
  try {
    if (request.command === 'check') {
      const results = {};
      for (const name of ['package', 'showcase', 'portrait_cases', 'super_release', 'continuous_release']) results[name] = JSON.parse(await execute(python, [path.join(ROOT, 'scripts', 'validate_' + name + '.py')], {captureOutput: true}));
      console.log(JSON.stringify({status: 'pass', checks: results, scope: 'Package and media/source inventory checks only; no render, GUI-host, aesthetic or audio-listening certification'}, null, 2)); return;
    }
    if (request.command === 'story') {await execute(python, [path.join(ROOT, 'scripts/story_intake.py'), request.subcommand, ...request.positional, ...optionArgs(request.options)]); return;}
    if (request.command === 'doctor' || (request.command === 'runtime' && request.subcommand === 'doctor')) {
      const backend = request.options.backend ?? (request.command === 'doctor' ? 'studio' : 'svg');
      let report;
      if (backend === 'studio') report = JSON.parse(await execute(node, [path.join(ROOT, 'studio/make.mjs'), 'doctor', ...optionArgs(request.options, ['backend'])], {captureOutput: true}));
      else {
        report = JSON.parse(await execute(python, [path.join(ROOT, 'runtime/render_video.py'), 'doctor', '--backend', backend, '--font-family', request.options['font-family'] ?? family], {captureOutput: true}));
        need(backend === 'svg' ? report.svg_ready : report.optional_canvas && ['ffmpeg', 'ffprobe', 'fc-match', 'node'].every(key => report.tools[key]), 'Selected runtime backend is not ready: ' + JSON.stringify(report));
      }
      console.log(JSON.stringify({status: 'pass', backend, launcher: {node, python, cwdPolicy: 'canonical-repository', callerCwd: originalCwd, implicitDownloads: false}, report, scope: 'Local dependencies and executable probes only; this is not a WorkBuddy GUI or sandbox-authorization test'}, null, 2)); return;
    }
    const production = request.command === 'build' || ['showcase', 'portraits'].includes(request.command) || (request.command === 'runtime' && ['frame', 'render'].includes(request.subcommand));
    if (production) {
      const files = request.command === 'build' ? request.positional : request.command === 'runtime'
        ? [request.options.source ?? path.join(request.options['source-dir'] ?? path.join(ROOT, 'examples/prototypes'), (request.options.style ?? 'tech') + '.py'), ...(request.options['source-dir'] ? [request.options['source-dir']] : [])]
        : [path.join(ROOT, request.command === 'showcase' ? 'showcase' : 'portrait-cases')];
      const gates = new Set(files.flatMap(storyAncestors));
      if (request.options.story) gates.add(fs.realpathSync(request.options.story));
      for (const project of gates) await execute(python, [path.join(ROOT, 'scripts/story_intake.py'), 'gate', '--project', project, '--stage', 'render']);
    }
    if (request.command === 'runtime') {
      const options = {...request.options}; if (!options['font-family'] && family) options['font-family'] = family;
      await execute(python, [path.join(ROOT, 'runtime/render_video.py'), request.subcommand, ...optionArgs(options, ['story'])]); return;
    }
    if (request.command === 'showcase' || request.command === 'portraits') {
      await execute(node, [path.join(ROOT, request.command === 'showcase' ? 'showcase/render.mjs' : 'portrait-cases/render.mjs'), request.subcommand, ...optionArgs(request.options, ['story'])]); return;
    }
    const token = crypto.randomBytes(20).toString('hex');
    if (request.command === 'build') env.HEIGE_RENDER_OWNER_TOKEN = token;
    await execute(node, [path.join(ROOT, 'studio/make.mjs'), request.command, ...request.positional, ...optionArgs(request.options, ['story'])], {renderToken: request.command === 'build' ? token : undefined});
  } finally {context.cleanup();}
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(JSON.stringify({status: 'blocked', error: error.message, implicitDownloads: false}));
  process.exitCode = Number.isInteger(error.exitCode) && error.exitCode > 0 && error.exitCode < 256 ? error.exitCode : 1;
});

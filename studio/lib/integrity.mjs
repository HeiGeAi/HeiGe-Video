import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
export const fileHash = (file) => sha256(fs.readFileSync(file));
export function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
export function engineFingerprint(root) {
  const files = ['package.json', 'package-lock.json', 'tsconfig.json', 'studio/CONTRACT.md', 'studio/requirements.txt'];
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes:true})) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory() && !['test', 'node_modules', '__pycache__', '.cache'].includes(entry.name)) walk(rel);
      else if (entry.isFile() && /\.(mjs|tsx|ts|css|py|json|ttf|otf|woff2?)$/.test(rel)) files.push(rel);
    }
  }
  walk('studio');
  return sha256(JSON.stringify(files.sort().map(file => [file, fileHash(path.join(root,file))])));
}
export function inputFingerprint(file, project, briefPath) {
  const base = fs.realpathSync(path.dirname(file));
  const local = (relative) => {
    if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..') || /^[a-z]+:/i.test(relative)) throw new Error('Unsafe input path');
    const resolved = fs.realpathSync(path.join(base, relative));
    if (!inside(base,resolved)) throw new Error('Input escapes project directory');
    return fileHash(resolved);
  };
  return {
    project: fileHash(file),
    assets: Object.fromEntries((project.assets ?? []).map(asset => [asset.id, local(asset.path)])),
    subtitles: project.audio?.subtitles ? local(project.audio.subtitles) : null,
    brief: briefPath ? fileHash(briefPath) : null,
  };
}
export function verifyArtifacts(out, artifacts) {
  const root = fs.realpathSync(out);
  if (!artifacts || Object.keys(artifacts).length === 0) throw new Error('Missing artifact inventory');
  for (const [rel, hash] of Object.entries(artifacts)) {
    if (path.isAbsolute(rel) || rel.split(/[\\/]/).includes('..')) throw new Error('Unsafe artifact path');
    const file = fs.realpathSync(path.join(out,rel));
    if (!inside(root,file) || fileHash(file) !== hash) throw new Error(`Artifact changed: ${rel}`);
  }
  return true;
}

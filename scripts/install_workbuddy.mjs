#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
function checkSkillParents(workspace, parent) {
  let current=workspace;
  for(const part of path.relative(workspace,parent).split(path.sep)) {
    current=path.join(current,part);
    let info;
    try {info=fs.lstatSync(current);} catch(error) {if(error.code==='ENOENT') continue;throw error;}
    if(info.isSymbolicLink()) throw new Error('Skill parent directory must not redirect through a symlink');
    if(!info.isDirectory()) throw new Error('Skill parent must be a directory');
  }
}
function main() {
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--workspace'||!args[1]) throw new Error('Usage: node scripts/install_workbuddy.mjs --workspace WORKSPACE');
  const workspace=fs.realpathSync(path.resolve(args[1]));
  if(!fs.statSync(workspace).isDirectory()) throw new Error('Workspace must be an existing directory');
  const target=path.join(workspace,'.workbuddy/skills/heige-video');
  const receiptPath=path.join(target,'install-receipt.json');
  checkSkillParents(workspace,path.dirname(target));
  if(fs.existsSync(target)) {
    if(fs.lstatSync(target).isSymbolicLink()||!fs.existsSync(receiptPath)) throw new Error('TARGET_CONFLICT: Existing skill is not this installer\'s deployment; contents unchanged');
    const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
    const names=fs.readdirSync(target).sort();
    const expected=['SKILL.md','run.mjs','repo.json','install-receipt.json'].sort();
    if(receipt.schemaVersion!==1 || receipt.owner!=='heige-video-workbuddy-adapter' || JSON.stringify(names)!==JSON.stringify(expected)) throw new Error('TARGET_CONFLICT: Existing deployment has additional or unknown files; contents unchanged');
    for(const name of ['SKILL.md','run.mjs','repo.json']) {
      const file=path.join(target,name);
      if(fs.lstatSync(file).isSymbolicLink()||receipt.files?.[name]!==hash(file)) throw new Error('TARGET_CONFLICT: Existing deployment was edited; contents unchanged');
    }
  }
  const source=path.join(root,'adapters/workbuddy/heige-video');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if(fs.realpathSync(path.dirname(target))!==path.dirname(target)) throw new Error('Skill parent directory must not redirect through a symlink');
  const stage=fs.mkdtempSync(path.join(path.dirname(target),'.heige-install-'));
  let backup;
  try {
    for(const name of ['SKILL.md','run.mjs']) fs.copyFileSync(path.join(source,name),path.join(stage,name));
    fs.writeFileSync(path.join(stage,'repo.json'),JSON.stringify({schemaVersion:1,repo:root},null,2)+'\n');
    const files=Object.fromEntries(['SKILL.md','run.mjs','repo.json'].map(name=>[name,hash(path.join(stage,name))]));
    fs.writeFileSync(path.join(stage,'install-receipt.json'),JSON.stringify({schemaVersion:1,owner:'heige-video-workbuddy-adapter',files},null,2)+'\n');
    if(fs.existsSync(target)) {backup=stage+'-previous';fs.renameSync(target,backup);}
    try {fs.renameSync(stage,target);} catch(error) {if(backup) fs.renameSync(backup,target);throw error;}
    if(backup) fs.rmSync(backup,{recursive:true});
    console.log(JSON.stringify({status:'installed',scope:'project-local',workspace,skill:target,repo:root,files},null,2));
  } finally {if(fs.existsSync(stage)) fs.rmSync(stage,{recursive:true});}
}
try {main();} catch(error) {console.error(JSON.stringify({status:'error',message:error.message}));process.exitCode=2;}

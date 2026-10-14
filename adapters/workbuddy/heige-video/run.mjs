#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const directory=path.dirname(fileURLToPath(import.meta.url));
try {
  const pointer=JSON.parse(fs.readFileSync(path.join(directory,'repo.json'),'utf8'));
  if(pointer.schemaVersion!==1 || typeof pointer.repo!=='string' || !path.isAbsolute(pointer.repo)) throw new Error('无效的本地项目登记');
  const root=fs.realpathSync(process.env.HEIGE_VIDEO_HOME||pointer.repo);
  const entry=path.join(root,'scripts/host.mjs');
  const skill=path.join(root,'SKILL.md');
  if(!fs.statSync(entry).isFile()||!fs.statSync(skill).isFile()) throw new Error('登记的目录不是完整 HeiGe-Video 项目');
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='locate') {
    console.log(JSON.stringify({status:'pass',repo:root,skill,entry},null,2));
  } else {
    if(!args.length) throw new Error('请指定 doctor、story、init、validate、build 或 verify');
    const child=spawn(process.env.HEIGE_NODE||process.execPath,[entry,...args],{stdio:'inherit',shell:false,env:process.env});
    let timer;
    const forward=signal=>{if(child.exitCode===null) {child.kill(signal);timer=setTimeout(()=>child.kill('SIGKILL'),6000);}};
    process.on('SIGINT',()=>forward('SIGINT'));
    process.on('SIGTERM',()=>forward('SIGTERM'));
    child.on('error',error=>{console.error(JSON.stringify({status:'error',message:error.message}));process.exitCode=2;});
    child.on('exit',(code,signal)=>{clearTimeout(timer);process.exitCode=code??(signal==='SIGINT'?130:143);});
  }
} catch(error) {
  console.error(JSON.stringify({status:'error',message:`WorkBuddy 入口未就绪：${error.message}。请重新安装项目入口。`}));
  process.exitCode=2;
}

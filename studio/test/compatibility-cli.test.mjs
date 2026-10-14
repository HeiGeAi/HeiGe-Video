import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createCanvas} from '@napi-rs/canvas';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const run=(args,cwd)=>spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});

for(const preserve of [false,true]) test(`absolute symlink CLI paths execute all four entry points${preserve ? ' with preserved main symlink' : ''}`,t=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'heige-symlink-cli-'));
  t.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
  const linked=path.join(temporary,'工作目录');fs.symlinkSync(root,linked,process.platform==='win32' ? 'junction' : 'dir');
  const flags=preserve ? ['--preserve-symlinks-main'] : [];
  const make=run([...flags,path.join(linked,'studio/make.mjs'),'validate',path.join(linked,'examples/studio/forge-launch.json')],temporary);
  assert.equal(make.status,0,make.stderr);
  assert.equal(JSON.parse(make.stdout).status,'pass');
  const input=path.join(temporary,'input'),output=path.join(temporary,'blurred');fs.mkdirSync(input);
  const canvas=createCanvas(2,2),ctx=canvas.getContext('2d');
  for(let index=0;index<3;index++) {ctx.fillStyle=['#ff0000','#00ff00','#0000ff'][index];ctx.fillRect(0,0,2,2);fs.writeFileSync(path.join(input,`element-${index}.png`),canvas.toBuffer('image/png'));}
  const blur=run([...flags,path.join(linked,'studio/blur_frames.mjs'),'--input',input,'--output',output,'--samples','3'],temporary);
  assert.equal(blur.status,0,blur.stderr);assert.equal(JSON.parse(blur.stdout).frames,1);
  assert.ok(fs.statSync(path.join(output,'element-000000.png')).size>0);
  const wav=path.join(temporary,'score.wav');
  const music=run([...flags,path.join(linked,'studio/lib/music-score.mjs'),'--out',wav],temporary);
  assert.equal(music.status,0,music.stderr);assert.ok(JSON.parse(music.stdout).events>0);
  assert.ok(fs.statSync(wav).size>1000);
  const review=run([...flags,path.join(linked,'scripts/review_continuous.mjs')],temporary);
  assert.equal(review.status,3,review.stderr);assert.match(review.stderr,/Usage: node scripts\/review_continuous/);
});

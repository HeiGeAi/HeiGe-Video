#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {bundle} from '@remotion/bundler';
import {ensureBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import {writeShowcaseMusic} from './music.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const catalog=[
  {id:'Citrus',slug:'citrus',title:'柠檬汽水',system:'boing-candy'},
  {id:'PaperFlight',slug:'paper',title:'让点子飞',system:'sticker-club'},
  {id:'MineralBloom',slug:'mineral',title:'花开有声',system:'dunhuang-mineral'},
];
export const hashFile=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const json=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function sourceFiles(){
  const files=[];
  const walk=(dir)=>{for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
    const rel=`${dir}/${entry.name}`;
    if(entry.isDirectory())walk(rel);
    else if(/\.(tsx|mjs|py|json|woff2?|txt)$/.test(rel))files.push(rel);
  }};
  walk('showcase');
  return [...files,'package.json','package-lock.json','tsconfig.json','studio/check_media.py'].sort();
}
export function sourceFingerprint(){return Object.fromEntries(sourceFiles().map(file=>[file,hashFile(path.join(root,file))]));}
function run(command,args){const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:40*1024*1024,timeout:600000});if(r.error||r.status!==0)throw new Error(`${command}: ${r.error||r.stderr}`);return r.stdout;}
const python=process.env.HEIGE_PYTHON||path.join(root,'.venv/bin/python');

async function main(){
  const [command,...args]=process.argv.slice(2);if(!['proof','build'].includes(command))throw new Error('Use proof or build');
  const opts={};for(let i=0;i<args.length;i+=2){if(!['--out','--only'].includes(args[i])||!args[i+1]||opts[args[i]])throw new Error('Use --out NEW_DIRECTORY [--only COMPOSITION_ID]');opts[args[i]]=args[i+1];}
  if(!opts['--out'])throw new Error('Output directory required');
  const out=path.resolve(opts['--out']);
  if(out===path.join(root,'showcase')||out.startsWith(path.join(root,'showcase')+path.sep))throw new Error('Build output must be outside showcase source');
  fs.mkdirSync(out,{recursive:false});
  const initial=sourceFingerprint();json(path.join(out,'source.json'),initial);
  const browser=await ensureBrowser({browserExecutable:process.env.HEIGE_BROWSER_PATH||null,onBrowserDownload:()=>{throw new Error('Install browser explicitly with npx remotion browser ensure');}});
  if(!browser.path)throw new Error('Browser unavailable');
  const browserVersion=run(browser.path,['--version']).trim();
  const environment={node:process.versions.node,packages:Object.fromEntries(['remotion','@remotion/bundler','@remotion/renderer','react'].map(n=>[n,require(`${n}/package.json`).version])),browser:{version:browserVersion,sha256:hashFile(browser.path)},ffmpeg:run('ffmpeg',['-version']).split('\n')[0],ffprobe:run('ffprobe',['-version']).split('\n')[0],python:JSON.parse(run(python,['-c','import sys,json,PIL; print(json.dumps({"version":sys.version.split()[0],"Pillow":PIL.__version__}))']))};
  const serveUrl=await bundle({entryPoint:path.join(root,'showcase/index.tsx'),publicDir:path.join(root,'showcase/public'),onProgress:()=>{}});
  const ids=catalog.flatMap(item=>[false,true].map(portrait=>({...item,portrait,compositionId:item.id+(portrait?'Portrait':'Horizontal'),name:item.slug+(portrait?'-portrait':'-horizontal')})));
  const selected=opts['--only']?ids.filter(item=>item.compositionId===opts['--only']):ids;
  if(!selected.length)throw new Error('Unknown composition id');
  for(const item of selected){
    const dir=path.join(out,item.name);fs.mkdirSync(dir);
    const layout=new Map(),browserErrors=[];
    const observe=log=>{if(log.text?.startsWith('SHOWCASE_LAYOUT:')){const d=JSON.parse(log.text.slice(16));layout.set(d.frame,d);}else if(log.type==='error')browserErrors.push(log.text);};
    const composition=await selectComposition({serveUrl,id:item.compositionId,browserExecutable:browser.path,logLevel:'error',onBrowserLog:observe});
    const frames=[0,15,30,60,90,120,165,210,240,285,330,375,420,450,479];
    if(command==='proof'){
      for(const frame of frames)await renderStill({serveUrl,composition,frame,browserExecutable:browser.path,imageFormat:'png',output:path.join(dir,`frame-${frame}.png`),logLevel:'error',onBrowserLog:observe});
      run(python,[path.join(root,'showcase/review.py'),'proof','--dir',dir]);
      json(path.join(dir,'layout.json'),[...layout.values()].sort((a,b)=>a.frame-b.frame));
      const errors=[...layout.values()].flatMap(x=>x.errors);if(errors.length||browserErrors.length)throw new Error(JSON.stringify({item:item.name,errors,browserErrors}));
      console.log(`PROOF ${item.name}: ${layout.size} actual DOM samples`);
      continue;
    }
    const music=writeShowcaseMusic(item.slug,path.join(dir,'music.wav'));json(path.join(dir,'music.json'),music);
    let last=-1;
    await renderMedia({serveUrl,composition,browserExecutable:browser.path,codec:'h264',crf:18,concurrency:2,muted:true,
      outputLocation:path.join(dir,'silent.mp4'),overwrite:false,logLevel:'error',onBrowserLog:observe,
      onProgress:p=>{const n=Math.floor(p.progress*4)*25;if(n!==last){last=n;console.log(`${item.name} ${n}%`);}}});
    const samples=[...layout.values()].sort((a,b)=>a.frame-b.frame);json(path.join(dir,'layout.json'),samples);
    const errors=samples.flatMap(x=>x.errors);
    if(samples.length!==480||samples.some((s,i)=>s.frame!==i)||errors.length||browserErrors.length)throw new Error(JSON.stringify({item:item.name,measured:samples.length,errors,browserErrors}));
    run('ffmpeg',['-v','error','-i',path.join(dir,'silent.mp4'),'-i',path.join(dir,'music.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t','16','-movflags','+faststart',path.join(dir,'video.mp4')]);
    const plan={width:composition.width,height:composition.height,fps:30,duration:16,durationInFrames:480,project:{music:{assetId:'original-score'}},timeline:[{id:'opening',type:'transform',start:0,end:4},{id:'action',type:'transform',start:4,end:8},{id:'result',type:'transform',start:8,end:12},{id:'closing',type:'transform',start:12,end:16}]};
    json(path.join(dir,'plan.json'),plan);
    console.log(run(python,[path.join(root,'studio/check_media.py'),'check','--video',path.join(dir,'video.mp4'),'--plan',path.join(dir,'plan.json'),'--out',dir]).trim());
    run(python,[path.join(root,'showcase/review.py'),'encoded','--dir',dir]);
    if(JSON.stringify(sourceFingerprint())!==JSON.stringify(initial))throw new Error('Showcase source changed during render');
    fs.unlinkSync(path.join(dir,'silent.mp4'));
    const artifacts=Object.fromEntries(fs.readdirSync(dir).filter(n=>fs.statSync(path.join(dir,n)).isFile()).sort().map(n=>[n,hashFile(path.join(dir,n))]));
    json(path.join(dir,'manifest.json'),{schemaVersion:'heige-showcase-build/1',status:'technical-pass',...item,width:composition.width,height:composition.height,fps:30,duration:16,frames:480,source:initial,environment,layout:{frames:480,errors:0},mp4Sha256:hashFile(path.join(dir,'video.mp4')),music:{wavSha256:music.wavSha256,style:music.title},artifacts,visualReview:'pending',playback:'not-tested',audioListening:'not-tested'});
    console.log(`BUILT ${item.name}`);
  }
  console.log(`DONE ${command}: ${out}`);
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});

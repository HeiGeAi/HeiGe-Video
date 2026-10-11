#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {sha256, fileHash, inside, engineFingerprint, inputFingerprint, verifyArtifacts} from './lib/integrity.mjs';
import {readProject, compileProject, parseSrt, collectText} from './lib/project.mjs';
import {collectContinuityText} from './lib/continuity-contract.mjs';
import {evaluateContinuity} from './lib/continuity-oracle.mjs';
import {synthesizeEventAudio} from './lib/event-audio.mjs';
import {createContinuousProject} from './lib/continuous-template.mjs';
import {verifyContinuousEvidence} from './lib/continuity-evidence.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const writeJson=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const python=process.env.HEIGE_PYTHON ?? (fs.existsSync(path.join(root,'.venv/bin/python')) ? path.join(root,'.venv/bin/python') : 'python3');
const ffmpeg=process.env.FFMPEG ?? 'ffmpeg';
const ffprobe=process.env.FFPROBE ?? 'ffprobe';
function run(command,args,options={}) {
  const result=spawnSync(command,args,{encoding:'utf8',maxBuffer:20*1024*1024,timeout:120000,...options});
  if (result.error || result.status!==0) throw new Error(`${command} failed: ${result.error?.message ?? result.stderr?.slice(-2500) ?? result.status}`);
  return result.stdout.trim();
}
function argsFrom(argv) {
  const [command,...remaining]=argv;
  const options={}; const positional=[];
  for(let i=0;i<remaining.length;i++) {
    const key=remaining[i];
    if(key.startsWith('--')) {
      if(!['--out','--brief','--browser','--ratio'].includes(key) || !remaining[i+1] || remaining[i+1].startsWith('--')) throw new Error(`Unknown or incomplete argument: ${key}`);
      if(options[key.slice(2)]!==undefined) throw new Error(`Duplicate argument: ${key}`);
      options[key.slice(2)]=remaining[++i];
    } else positional.push(key);
  }
  if(positional.length>1) throw new Error('Only one project file is accepted');
  return {command,file:positional[0],...options};
}
function chooseFont() {
  if(process.env.HEIGE_FONT_PATH) return {path:fs.realpathSync(process.env.HEIGE_FONT_PATH),index:Number(process.env.HEIGE_FONT_INDEX ?? 0)};
  const lines=run('fc-match',['Noto Sans CJK SC','--format=%{file}\n%{index}\n%{family}\n']).split('\n');
  if(!/Noto Sans (CJK )?SC/i.test(lines[2] ?? '')) throw new Error('No local Noto Sans SC face. Install it or set HEIGE_FONT_PATH to a licensed Chinese font.');
  return {path:fs.realpathSync(lines[0]),index:Number(lines[1])};
}
function environment() {
  const packages={};
  for(const name of ['remotion','@remotion/bundler','@remotion/renderer','react','react-dom']) packages[name]=require(`${name}/package.json`).version;
  if(new Set([packages.remotion,packages['@remotion/bundler'],packages['@remotion/renderer']]).size!==1) throw new Error('Remotion package versions disagree');
  const declared=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  for(const [name,version] of Object.entries(packages)) if(declared.dependencies[name]!==version) throw new Error(`Installed ${name} differs from pinned version`);
  const {RenderInternals}=require('@remotion/renderer');
  const native={};
  try {
    for(const type of ['compositor','ffmpeg','ffprobe']) {
      const executable=RenderInternals.getExecutablePath({type,indent:false,logLevel:'error',binariesDirectory:null});
      fs.accessSync(executable,fs.constants.X_OK);
      const loaderEnv=process.platform==='darwin' ? {...process.env,DYLD_LIBRARY_PATH:path.dirname(executable)} : process.env;
      native[type]={sha256:fileHash(executable),...(type==='compositor' ? {} : {version:run(executable,['-version'],{env:loaderEnv}).split('\n')[0]})};
    }
    const directory=path.dirname(RenderInternals.getExecutablePath({type:'compositor',indent:false,logLevel:'error',binariesDirectory:null}));
    native.packageHash=sha256(JSON.stringify(fs.readdirSync(directory).sort().filter(name=>fs.statSync(path.join(directory,name)).isFile()).map(name=>[name,fileHash(path.join(directory,name))])));
  } catch(error) {throw new Error(`Remotion native compositor is unavailable. Reinstall the pinned platform optional dependency; npm can silently omit a failed download. ${error.message}`);}
  const pythonVersions=JSON.parse(run(python,['-c',"import sys,json,PIL,fontTools; print(json.dumps({'python':sys.version.split()[0],'Pillow':PIL.__version__,'fonttools':fontTools.__version__}))"]));
  const font=chooseFont();
  return {node:process.versions.node,packages,remotionNative:native,python:pythonVersions,
    ffmpeg:run(ffmpeg,['-version']).split('\n')[0],ffprobe:run(ffprobe,['-version']).split('\n')[0],
    font:{sha256:fileHash(font.path),index:font.index,weightScope:'one face with browser synthetic bold'}};
}
async function checkedBrowser(options) {
  const {ensureBrowser}=await import('@remotion/renderer');
  const result=await ensureBrowser({browserExecutable:options.browser ?? process.env.HEIGE_BROWSER_PATH ?? null,
    onBrowserDownload:()=>{throw new Error('Headless browser is missing. Explicitly run npx remotion browser ensure, or set HEIGE_BROWSER_PATH. Build never downloads implicitly.');}});
  if(!result.path) throw new Error('No usable local browser');
  const executable=fs.realpathSync(result.path);
  return {path:executable,sha256:fileHash(executable),version:run(executable,['--version'])};
}
function checkedRead(file,brief) {
  const read=readProject(file,{briefPath:brief});
  if(read.issues.errors.length) throw new Error(JSON.stringify(read.issues.errors));
  let audioDuration;
  if(read.project.audio) {
    const asset=read.project.assets?.find(a=>a.id===read.project.audio.assetId);
    // Validate paths before allowing any media subprocess to inspect them.
    const pre=compileProject(read.project,{baseDir:read.baseDir,briefText:read.briefText});
    if(pre.issues.errors.length) throw new Error(JSON.stringify(pre.issues.errors));
    const info=JSON.parse(run(ffprobe,['-v','error','-show_format','-show_streams','-of','json',path.join(read.baseDir,asset.path)]));
    if(!info.streams.some(s=>s.codec_type==='audio')) throw new Error('Narration asset has no audio stream');
    audioDuration=Number(info.format.duration);
    if(!Number.isFinite(audioDuration) || audioDuration<=0) throw new Error('Cannot measure final audio duration');
    // A music bed must never hide a missing or silent declared recording.
    const channels=info.streams.find(s=>s.codec_type==='audio').channels;
    if(!Number.isInteger(channels) || channels<1 || channels>8) throw new Error('Narration channel count is unsupported');
    const decoded=spawnSync(ffmpeg,['-v','error','-i',path.join(read.baseDir,asset.path),'-vn','-ar','16000','-f','f32le','-'],{maxBuffer:320*1024*1024,timeout:120000});
    if(decoded.error || decoded.status!==0 || decoded.stdout.length===0 || decoded.stdout.length%4) throw new Error('Cannot fully decode narration source');
    let squared=0,peak=0;
    for(let i=0;i<decoded.stdout.length;i+=4) {
      const sample=decoded.stdout.readFloatLE(i);
      if(!Number.isFinite(sample)) throw new Error('Narration source has non-finite samples');
      squared+=sample*sample;peak=Math.max(peak,Math.abs(sample));
    }
    const samples=decoded.stdout.length/4,rms=Math.sqrt(squared/samples);
    if(rms<1e-6) throw new Error('Narration source is silent; background music cannot substitute for recording');
    if(peak>1.001) throw new Error('Narration source exceeds full scale');
    read.sourceAudio={samples,channels,sampleRate:16000,duration:samples/(16000*channels),rms,peak,scope:'source recording independently decoded across every channel; listening not tested'};
    if(Math.abs(read.sourceAudio.duration-audioDuration)>.15) throw new Error('Narration container and decoded duration disagree');
  }
  const plan=compileProject(read.project,{baseDir:read.baseDir,briefText:read.briefText,audioDuration});
  if(plan.issues.errors.length) throw new Error(JSON.stringify(plan.issues.errors));
  return {...read,plan};
}
function takeLock() {
  const lock=path.join(os.tmpdir(),'heige-video-render.lock');
  try { fs.mkdirSync(lock); } catch(error) { if(error.code==='EEXIST') throw new Error(`Another render holds ${lock}. Check that process before removing a stale lock.`); throw error; }
  const token=`${process.pid}:${Date.now()}`;
  fs.writeFileSync(path.join(lock,'owner'),token);
  return ()=>{if(fs.existsSync(path.join(lock,'owner')) && fs.readFileSync(path.join(lock,'owner'),'utf8')===token) fs.rmSync(lock,{recursive:true});};
}
function artifactsAt(out) {
  const entries={};
  function walk(dir,rel='') {
    for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
      const name=rel ? `${rel}/${item.name}` : item.name;
      if(item.isDirectory()) walk(path.join(dir,item.name),name);
      else if(item.isFile() && !['manifest.json','.building'].includes(name)) entries[name]=fileHash(path.join(dir,item.name));
    }
  }
  walk(out);return entries;
}
function mux(plan,staged,video,out,effects) {
  const narration=plan.project.audio ? staged[plan.project.audio.assetId] : null;
  const music=plan.project.music ? staged[plan.project.music.assetId] : null;
  if(!narration && !music && !effects) {fs.renameSync(video,path.join(out,'video.mp4'));return;}
  const args=['-v','error','-i',video];
  const indexes={};let next=1;
  if(narration) {indexes.voice=next++;args.push('-i',narration);}
  if(music) {indexes.bed=next++;args.push('-stream_loop','-1','-i',music);}
  if(effects) {indexes.events=next++;args.push('-i',effects);}
  const duration=plan.duration;
  const filters=[];
  if(narration) filters.push(`[${indexes.voice}:a]aresample=48000,apad,atrim=duration=${duration}[voice]`);
  if(effects) filters.push(`[${indexes.events}:a]aresample=48000,atrim=duration=${duration}[events]`);
  if(music) filters.push(`[${indexes.bed}:a]aresample=48000,volume=${plan.project.music.volume ?? .15},atrim=duration=${duration}[bed]`);
  const foreground=[...(narration ? ['[voice]'] : []),...(effects ? ['[events]'] : [])];
  if(foreground.length) filters.push(`${foreground.join('')}${foreground.length>1 ? `amix=inputs=${foreground.length}:normalize=0` : 'anull'}[foreground]`);
  if(foreground.length && music) filters.push('[foreground]asplit=2[main][side]','[bed][side]sidechaincompress=threshold=0.025:ratio=8:attack=20:release=250[duck]','[main][duck]amix=inputs=2:normalize=0[mix]');
  else filters.push(`[${foreground.length ? 'foreground' : 'bed'}]anull[mix]`);
  filters.push('[mix]alimiter=limit=0.95:level=0:latency=1[audio]');
  args.push('-filter_complex',filters.join(';'),'-map','0:v','-map','[audio]','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',path.join(out,'video.mp4'));
  run(ffmpeg,args);fs.unlinkSync(video);
}
async function build(options) {
  const file=path.resolve(options.file);
  const read=checkedRead(file,options.brief);
  const {plan,project,baseDir}=read;
  const initial=inputFingerprint(file,project,options.brief);
  const engine=engineFingerprint(root);
  const env=environment();
  const browser=await checkedBrowser(options);
  env.browser={sha256:browser.sha256,version:browser.version};
  const destination=path.resolve(options.out);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  const out=path.join(fs.realpathSync(path.dirname(destination)),path.basename(destination));
  if(inside(fs.realpathSync(root),out) && !inside(path.join(fs.realpathSync(root),'outputs'),out)) throw new Error('Use an output directory outside the source checkout, or the ignored outputs folder.');
  if(fs.existsSync(out) && (fs.lstatSync(out).isSymbolicLink() || fs.readdirSync(out).length)) throw new Error('Output directory must be new or empty; completed outputs are immutable.');
  const manifest={schemaVersion:'heige-build/1',status:'building',input:initial,engine,environment:env,
    format:{width:plan.width,height:plan.height,fps:plan.fps},duration:plan.duration,frame_count:plan.durationInFrames,
    fps:plan.fps,source_start:0,source_time_scale:1,
    review:{technical:'pending',visual:'pending',realtimePlayback:'not-tested',audioListening:'not-tested'},sourceAudio:read.sourceAudio ?? null,
    previewReasons:[...(project.draft ? ['draft requested'] : []),...(project.audio?.kind==='mock' ? ['mock audio'] : [])]};
  const release=takeLock();
  let temporary;
  try {
    temporary=fs.mkdtempSync(path.join(os.tmpdir(),'heige-render-'));
    fs.mkdirSync(out,{recursive:true});
    writeJson(path.join(out,'manifest.json'),manifest);
    const publicDir=path.join(temporary,'public');fs.mkdirSync(publicDir);
    const snapshots=path.join(out,'assets');fs.mkdirSync(snapshots);
    const staged={},assetUrls={};
    for(const asset of project.assets ?? []) {
      const source=fs.realpathSync(path.join(baseDir,asset.path));
      const name=`${initial.assets[asset.id].slice(0,20)}${path.extname(source)}`;
      staged[asset.id]=path.join(publicDir,name);
      fs.copyFileSync(source,staged[asset.id]);
      if(fileHash(staged[asset.id])!==initial.assets[asset.id]) throw new Error('Asset changed while snapshotting');
      fs.copyFileSync(staged[asset.id],path.join(snapshots,name));
      assetUrls[asset.id]=`/${name}`;
    }
    const captions=project.audio?.subtitles ? parseSrt(fs.readFileSync(path.join(baseDir,project.audio.subtitles),'utf8'),plan.duration).captions : [];
    const requiredText=[project.title,project.brand ?? '',...plan.timeline.flatMap(collectText),...collectContinuityText(project.continuity),...captions.map(c=>c.text),
      '教学示例数据　不代表真实业务 生成素材 界面截图 授权素材 原创素材 来源 · 〔〕 录音 预览 单位 零基线',...plan.timeline.map(s=>s.unit ?? '')].join('\n');
    const textFile=path.join(temporary,'font-text.txt');fs.writeFileSync(textFile,requiredText);
    const font=chooseFont();
    const fontInfo=JSON.parse(run(python,[path.join(root,'studio/check_media.py'),'font','--font',font.path,'--index',String(font.index),'--text',textFile,'--out',path.join(publicDir,'font.ttf')]));
    assetUrls.__font='/font.ttf';manifest.font=fontInfo;
    const {bundle}=await import('@remotion/bundler');
    const {selectComposition,renderMedia,renderStill,renderFrames}=await import('@remotion/renderer');
    console.log('Bundling controlled scenes');
    const serveUrl=await bundle({entryPoint:path.join(root,'studio/src/index.tsx'),publicDir,outDir:path.join(temporary,'bundle')});
    const inputProps={plan,assetUrls,captions,fontFamily:'HeiGeLocal'};
    const browserExecutable=browser.path;
    const browserErrors=[];
    let captureProbes=false;
    const observed=new Map(),probeConflicts=[];
    const observeLog=log=>{
      if(log.type==='error') browserErrors.push(log.text);
      if(captureProbes && log.text?.startsWith('HEIGE_CONTINUITY:')) {
        const sample=JSON.parse(log.text.slice('HEIGE_CONTINUITY:'.length));
        if(observed.has(sample.frame) && JSON.stringify(observed.get(sample.frame))!==JSON.stringify(sample)) probeConflicts.push(sample.frame);
        observed.set(sample.frame,sample);
      }
    };
    const composition=await selectComposition({serveUrl,id:'HeigeFilm',inputProps,browserExecutable,logLevel:'error',onBrowserLog:observeLog});
    const checks=[];
    const proofs=path.join(out,'proofs');fs.mkdirSync(proofs);
    for(const shot of plan.timeline) for(const fraction of [0,.25,.55,.85]) {
      const frame=Math.min(plan.durationInFrames-1,shot.from+Math.floor(shot.frames*fraction));
      const geometry=[];
      await renderStill({serveUrl,composition:{...composition,props:{...composition.props,inspect:true}},frame,inputProps:{...inputProps,inspect:true},browserExecutable,
        output:path.join(proofs,`${shot.id}-${String(Math.round(fraction*100)).padStart(2,'0')}.png`),imageFormat:'png',logLevel:'error',
        onBrowserLog:(log)=>{observeLog(log);if(log.text?.startsWith('HEIGE_LAYOUT:')) geometry.push(JSON.parse(log.text.slice('HEIGE_LAYOUT:'.length)));}});
      if(!geometry.length) throw new Error(`Layout inspector did not execute for shot ${shot.id}`);
      for(const sample of geometry) checks.push({shot:shot.id,frame,...sample});
    }
    for(const [name,frame] of [['opening',0],['final',plan.durationInFrames-1]]) {
      await renderStill({serveUrl,composition:{...composition,props:{...composition.props,inspect:true}},frame,inputProps:{...inputProps,inspect:true},browserExecutable,output:path.join(proofs,`${name}.png`),imageFormat:'png',logLevel:'error',onBrowserLog:log=>{observeLog(log);if(log.text?.startsWith('HEIGE_LAYOUT:')) checks.push({shot:name,frame,...JSON.parse(log.text.slice('HEIGE_LAYOUT:'.length))});}});
    }
    writeJson(path.join(out,'layout.json'),checks);
    const layoutErrors=checks.flatMap(c=>c.errors ?? []);
    if(layoutErrors.length) throw new Error(`Layout rejected: ${JSON.stringify(layoutErrors).slice(0,1800)}`);
    if(browserErrors.length) throw new Error(`Browser errors: ${browserErrors.join('; ').slice(0,1500)}`);
    let last=-1;
    console.log(`Rendering ${plan.duration}s at ${plan.width}x${plan.height}; concurrency 1`);
    captureProbes=true;
    const samples=project.continuity?.blur?.samples ?? 1;
    if(project.continuity && samples===3) {
      const rawFrames=path.join(temporary,'shutter-frames');
      const samplingProps={...inputProps,renderSampling:{samples:3,shutterAngle:180}};
      const samplingComposition={...composition,props:{...composition.props,...samplingProps},fps:plan.fps*3,durationInFrames:plan.durationInFrames*3};
      await renderFrames({serveUrl,composition:samplingComposition,inputProps:samplingProps,browserExecutable,concurrency:1,imageFormat:'png',outputDir:rawFrames,muted:true,logLevel:'error',onBrowserLog:observeLog,
        onStart:()=>{},onFrameUpdate:count=>{const percent=Math.floor(count/(plan.durationInFrames*3)*10)*10;if(percent!==last){last=percent;console.log(`Shutter capture ${percent}%`);}}});
      const mixed=path.join(temporary,'linear-frames');
      run(process.execPath,['--expose-gc',path.join(root,'studio/blur_frames.mjs'),'--input',rawFrames,'--output',mixed,'--samples','3'],{timeout:600000});
      const blurReport=JSON.parse(fs.readFileSync(path.join(mixed,'composite.json'),'utf8'));
      writeJson(path.join(out,'shutter.json'),blurReport);
      run(ffmpeg,['-v','error','-framerate',String(plan.fps),'-i',path.join(mixed,'element-%06d.png'),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'silent.mp4')],{timeout:600000});
      manifest.temporalShutter={samples:3,angle:180,compositing:'opaque PNG captures averaged in linear-light sRGB, 16-bit lookup tables',captures:plan.durationInFrames*3};
    } else {
      await renderMedia({serveUrl,composition,inputProps,browserExecutable,concurrency:1,codec:'h264',crf:18,
        outputLocation:path.join(out,'silent.mp4'),overwrite:false,logLevel:'error',onBrowserLog:observeLog,
        onProgress:p=>{const percent=Math.floor(p.progress*10)*10;if(percent!==last){last=percent;console.log(`Render ${percent}%`);}}});
      manifest.temporalShutter={samples:1,angle:0,compositing:'disabled'};
    }
    captureProbes=false;
    if(browserErrors.length) throw new Error(`Browser errors during video: ${browserErrors.join('; ').slice(0,1500)}`);
    if(probeConflicts.length) throw new Error(`Repeated committed DOM probes disagree: ${probeConflicts.slice(0,10).join(',')}`);
    const soundPath=path.join(out,'events.wav');
    const sound=synthesizeEventAudio(plan,soundPath);
    if(sound) {writeJson(path.join(out,'sound-events.json'),sound);manifest.eventAudio=sound;}
    mux(plan,staged,path.join(out,'silent.mp4'),out,sound ? soundPath : null);
    writeJson(path.join(out,'plan.json'),plan);
    writeJson(path.join(out,'asset-map.json'),Object.fromEntries(Object.entries(assetUrls).filter(([id])=>id!=='__font').map(([id,url])=>[id,`assets${url}`])));
    fs.copyFileSync(file,path.join(out,'project.json'));
    if(options.brief) fs.copyFileSync(options.brief,path.join(out,'brief.md'));
    console.log('Checking complete decoded video and audio');
    const check=run(python,[path.join(root,'studio/check_media.py'),'check','--video',path.join(out,'video.mp4'),'--plan',path.join(out,'plan.json'),'--out',out],{timeout:600000});
    console.log(check);
    if(project.continuity) {
      const samples=[...observed.values()].sort((a,b)=>a.frame-b.frame);
      const pixels=JSON.parse(fs.readFileSync(path.join(out,'media-check.json'),'utf8'));
      const continuity=evaluateContinuity(plan,samples,{videoSha256:fileHash(path.join(out,'video.mp4')),pixelReport:pixels});
      writeJson(path.join(out,'continuity-probe.json'),{engine,input:initial,frames:samples});
      writeJson(path.join(out,'continuity-check.json'),continuity);
      manifest.continuity={status:continuity.status,coverage:continuity.coverage,boundaries:continuity.boundaries,scope:continuity.scope};
      if(!continuity.passed) throw new Error(`Continuity rejected: ${JSON.stringify(continuity.errors).slice(0,1800)}`);
    }
    if(JSON.stringify(inputFingerprint(file,project,options.brief))!==JSON.stringify(initial)) throw new Error('Inputs changed during render; output cannot inherit validation');
    if(engineFingerprint(root)!==engine) throw new Error('Engine changed during render; retry after edits finish');
    manifest.status=manifest.previewReasons.length ? 'preview' : 'validated';
    manifest.review.technical='pass';
    manifest.mp4_sha256=fileHash(path.join(out,'video.mp4'));
    manifest.artifacts=artifactsAt(out);
    writeJson(path.join(out,'manifest.json'),manifest);
    console.log(`${manifest.status==='preview' ? '预览' : '技术验证通过'}：${path.join(out,'video.mp4')}`);
    console.log('Visual review, full playback and listening are separate from technical validation.');
  } catch(error) {
    manifest.status='rejected';manifest.review.technical='failed';manifest.error=error.message;
    if(fs.existsSync(path.join(out,'video.mp4'))) fs.renameSync(path.join(out,'video.mp4'),path.join(out,'video.rejected.mp4'));
    if(fs.existsSync(out)) {manifest.artifacts=artifactsAt(out);writeJson(path.join(out,'manifest.json'),manifest);}
    throw error;
  } finally {
    try {if(temporary) fs.rmSync(temporary,{recursive:true,force:true});}
    finally {release();}
  }
}
async function verify(options) {
  const manifest=JSON.parse(fs.readFileSync(path.join(options.out,'manifest.json'),'utf8'));
  if(!['validated','preview'].includes(manifest.status) || manifest.review?.technical!=='pass') throw new Error('Output has no successful technical validation');
  const {project,plan}=checkedRead(options.file,options.brief);
  if((project.draft || project.audio?.kind==='mock') && manifest.status!=='preview') throw new Error('Mock or draft output incorrectly marked validated');
  if(JSON.stringify(inputFingerprint(options.file,project,options.brief))!==JSON.stringify(manifest.input)) throw new Error('Project, assets, captions or brief changed');
  if(engineFingerprint(root)!==manifest.engine) throw new Error('Engine changed');
  const browser=await checkedBrowser(options);
  const env=environment();env.browser={sha256:browser.sha256,version:browser.version};
  if(JSON.stringify(env)!==JSON.stringify(manifest.environment)) throw new Error('Dependencies, tools, browser or font changed');
  verifyArtifacts(options.out,manifest.artifacts);
  if(fileHash(path.join(options.out,'video.mp4'))!==manifest.mp4_sha256) throw new Error('Video changed');
  verifyContinuousEvidence(plan,options.out,manifest);
  console.log(JSON.stringify({status:manifest.status,integrity:'pass',review:manifest.review}));
}
export async function main(argv=process.argv.slice(2)) {
  const options=argsFrom(argv);
  if(options.command==='init') {
    if(!options.file || options.out || options.brief || options.browser) throw new Error('Usage: node studio/make.mjs init <new-project.json> [--ratio 16:9|9:16|1:1]');
    const project=createContinuousProject(options.ratio ?? '16:9');
    const plan=compileProject(project);
    if(plan.issues.errors.length) throw new Error(JSON.stringify(plan.issues.errors));
    const destination=path.resolve(options.file);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,JSON.stringify(project,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({status:'created',project:destination,ratio:project.ratio,engine:'native-continuous-world',next:'validate, build, then verify'}));return;
  }
  if(options.ratio) throw new Error('--ratio is only accepted by init; edit the authored project for independent composition');
  if(options.command==='doctor') {
    const env=environment();const browser=await checkedBrowser(options);env.browser={sha256:browser.sha256,version:browser.version};
    console.log(JSON.stringify({status:'pass',environment:env,concurrency:1,implicitExternalDownloads:false,onlineGeneration:false},null,2));return;
  }
  if(!options.file || !['validate','build','verify'].includes(options.command)) throw new Error('Usage: node studio/make.mjs doctor | validate <project> | build <project> --out <new-dir> | verify <project> --out <dir>');
  if(options.command==='validate') {const {plan}=checkedRead(options.file,options.brief);console.log(JSON.stringify({status:'pass',duration:plan.duration,frames:plan.durationInFrames,previewOnly:plan.previewOnly,warnings:plan.issues.warnings},null,2));return;}
  if(!options.out) throw new Error('--out is required');
  if(options.command==='verify') await verify(options);
  else await build(options);
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1;});

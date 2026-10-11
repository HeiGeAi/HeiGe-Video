import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const make=path.join(root,'studio/make.mjs');
const project={schemaVersion:'heige-video/4',title:'锁清理验收',mode:'explainer',ratio:'16:9',theme:'ledger',shots:[{id:'opening',type:'hook',title:'初始化失败也释放锁',duration:3}]};

function fixture(t,existingOutput=false) {
  assert.notEqual(process.getuid?.(),0,'Permission regression requires a non-root Unix user; chmod 555 cannot deny root');
  assert.notEqual(process.platform,'win32','This real permission regression requires a Unix filesystem');
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'heige-lock-regression-'));
  const temporary=path.join(base,'isolated-tmp');
  const readonly=path.join(base,'readonly-output-parent');
  const output=path.join(readonly,'output');
  fs.mkdirSync(temporary);fs.mkdirSync(readonly);
  if(existingOutput) fs.mkdirSync(output);
  const file=path.join(base,'project.json');fs.writeFileSync(file,JSON.stringify(project));
  const blocked=existingOutput ? output : readonly;
  fs.chmodSync(blocked,0o555);
  t.after(()=>{fs.chmodSync(blocked,0o755);fs.rmSync(base,{recursive:true,force:true});});
  return {file,output,temporary};
}

function run(args,temporary) {
  return spawnSync(process.execPath,args,{cwd:root,env:{...process.env,TMPDIR:temporary,TMP:temporary,TEMP:temporary},encoding:'utf8',maxBuffer:4*1024*1024,timeout:120000});
}

function assertPermissionRejection(result,temporary) {
  assert.equal(result.error,undefined,'The real build process must finish rather than time out');
  assert.equal(result.status,1,`${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr,/EACCES|EPERM/,'The build must reach the actual chmod-denied output operation; missing dependencies are not acceptance evidence');
  assert.equal(fs.existsSync(path.join(temporary,'heige-video-render.lock')),false,'Failed initialization must release this isolated process lock');
  assert.deepEqual(fs.readdirSync(temporary),[],'Failed initialization must remove its render temporary directory');
}

test('real chmod 555 output-parent EACCES releases the isolated render lock and temporary directory',(t)=>{
  const {file,output,temporary}=fixture(t);
  const result=run([make,'build',file,'--out',output],temporary);
  assertPermissionRejection(result,temporary);
  assert.equal(fs.existsSync(output),false);
});

test('real chmod 555 manifest-write EACCES also releases the isolated lock',(t)=>{
  const {file,output,temporary}=fixture(t,true);
  const result=run([make,'build',file,'--out',output],temporary);
  assertPermissionRejection(result,temporary);
  assert.deepEqual(fs.readdirSync(output),[],'An unwritable initial output must not contain a successful manifest');
});

test('an injected temporary-cleanup error still releases the real isolated filesystem lock',(t)=>{
  const {file,output,temporary}=fixture(t);
  // The output rejection uses real chmod permissions. Only the later cleanup
  // failure is injected, inside a disposable child process using production main.
  const script=`
    import fs from 'node:fs';
    import path from 'node:path';
    import {pathToFileURL} from 'node:url';
    const [,modulePath,projectPath,output]=process.argv.slice(1);
    const original=fs.rmSync;
    fs.rmSync=(file,options)=>{
      if(path.dirname(file)===process.env.TMPDIR && path.basename(file).startsWith('heige-render-')) throw new Error('Injected render temporary cleanup failure');
      return original(file,options);
    };
    const {main}=await import(pathToFileURL(modulePath).href);
    try {await main(['build',projectPath,'--out',output]);}
    catch(error) {console.error(error.message);process.exitCode=1;}
  `;
  const result=run(['--input-type=module','-e',script,'lock-cleanup-harness',make,file,output],temporary);
  assert.equal(result.error,undefined);
  assert.equal(result.status,1,`${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr,/Injected render temporary cleanup failure/);
  assert.equal(fs.existsSync(path.join(temporary,'heige-video-render.lock')),false,'Release must execute even if removing temporary render files throws');
  const leftovers=fs.readdirSync(temporary);
  assert.equal(leftovers.length,1);
  assert.ok(leftovers[0].startsWith('heige-render-'),'The deliberately failed cleanup must not be mistaken for a lock leak');
});

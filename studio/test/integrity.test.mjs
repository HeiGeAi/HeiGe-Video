import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileHash, inputFingerprint, verifyArtifacts} from '../lib/integrity.mjs';

test('verify detects edited output and traversal rather than reporting a stale pass', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'heige-integrity-'));
  try {
    fs.writeFileSync(path.join(dir,'video.mp4'),'one');
    const inventory = {'video.mp4':fileHash(path.join(dir,'video.mp4'))};
    assert.equal(verifyArtifacts(dir,inventory),true);
    fs.writeFileSync(path.join(dir,'video.mp4'),'two');
    assert.throws(()=>verifyArtifacts(dir,inventory),/changed/);
    assert.throws(()=>verifyArtifacts(dir,{'../outside': 'hash'}),/Unsafe/);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
test('fingerprints include media and captions; symlink escapes are rejected',()=>{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'heige-input-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(),'heige-outside-'));
  try {
    const project = {assets:[{id:'voice',path:'voice.wav'}], audio:{subtitles:'voice.srt'}};
    fs.writeFileSync(path.join(dir,'project.json'),JSON.stringify(project));
    fs.writeFileSync(path.join(dir,'voice.wav'),'audio');
    fs.writeFileSync(path.join(dir,'voice.srt'),'first');
    const first=inputFingerprint(path.join(dir,'project.json'),project);
    fs.writeFileSync(path.join(dir,'voice.srt'),'second');
    assert.notEqual(first.subtitles,inputFingerprint(path.join(dir,'project.json'),project).subtitles);
    fs.writeFileSync(path.join(outside,'voice.wav'),'secret');
    fs.unlinkSync(path.join(dir,'voice.wav'));
    fs.symlinkSync(path.join(outside,'voice.wav'),path.join(dir,'voice.wav'));
    assert.throws(()=>inputFingerprint(path.join(dir,'project.json'),project),/escapes/);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); fs.rmSync(outside,{recursive:true,force:true}); }
});

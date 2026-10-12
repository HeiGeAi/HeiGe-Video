#!/usr/bin/env node
// Independent, read-only artifact audit. Decodes final MP4 pixels again; it does
// not accept the production pixel report as evidence of those pixels.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fileHash, engineFingerprint, verifyArtifacts} from '../studio/lib/integrity.mjs';
import {evaluateContinuity} from '../studio/lib/continuity-oracle.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const execute = (binary, args) => {
  const result = spawnSync(binary, args, {maxBuffer: 128 * 1024 * 1024, timeout: 60_000});
  if (result.error || result.status !== 0) throw new Error(`${binary}: ${result.error?.message || result.stderr?.toString().slice(0, 1000)}`);
  return result.stdout;
};

export function reviewContinuous(directory) {
  const root = fs.realpathSync(directory);
  const manifest = readJson(path.join(root, 'manifest.json'));
  const plan = readJson(path.join(root, 'plan.json'));
  const probe = readJson(path.join(root, 'continuity-probe.json'));
  const production = readJson(path.join(root, 'continuity-check.json'));
  const media = readJson(path.join(root, 'media-check.json'));
  const videoName = fs.existsSync(path.join(root, 'video.mp4')) ? 'video.mp4' : 'video.rejected.mp4';
  const video = path.join(root, videoName), videoSha256 = fileHash(video);
  const pixels = execute(process.env.HEIGE_FFMPEG || 'ffmpeg', ['-v', 'error', '-i', video, '-an', '-vf', 'scale=96:54,format=gray', '-f', 'rawvideo', '-']);
  const size = 96 * 54, frameCount = pixels.length / size;
  if (!Number.isInteger(frameCount) || frameCount < 1) throw new Error('Incomplete independent pixel decode');
  const deltas = [0];
  for (let frame = 1; frame < frameCount; frame++) {
    let sum = 0;
    for (let pixel = 0; pixel < size; pixel++) sum += Math.abs(pixels[frame * size + pixel] - pixels[(frame - 1) * size + pixel]);
    deltas.push(sum / size);
  }
  const independent = evaluateContinuity(plan, probe.frames, {videoSha256, pixelReport: {videoSha256, frameCount, deltas}});
  let artifactInventoryPassed = true, artifactError = null;
  try { verifyArtifacts(root, manifest.artifacts); } catch (error) { artifactInventoryPassed = false; artifactError = error.message; }
  const storedDeltas = media.pixel_scan?.deltas;
  const pixelReportMatched = media.videoSha256 === videoSha256 && media.frameCount === frameCount && Array.isArray(storedDeltas) && storedDeltas.length === deltas.length && storedDeltas.every((value, index) => Math.abs(value - deltas[index]) < 1e-12);
  const shutterFile = path.join(root, 'shutter.json');
  const shutter = fs.existsSync(shutterFile) ? readJson(shutterFile) : null;
  const variedGroups = shutter?.groups?.filter((group) => new Set(group.sources.map((source) => source.sha256)).size > 1).map((group) => group.frame) || [];
  const actualEngine = engineFingerprint(repository);
  return {
    schemaVersion: 'heige-independent-continuity-audit/1', directory: root, video: videoName, videoSha256,
    manifestFileSha256: fileHash(path.join(root, 'manifest.json')), manifestVideoSha256: manifest.mp4_sha256 || null,
    engineFingerprint: manifest.engine, currentEngineFingerprint: actualEngine, engineMatched: manifest.engine === actualEngine,
    projectHashMatched: fileHash(path.join(root, 'project.json')) === manifest.input?.project,
    probeEngineMatched: probe.engine === manifest.engine, probeInputMatched: JSON.stringify(probe.input) === JSON.stringify(manifest.input),
    artifactInventoryPassed, artifactError, pixelReportMatched, decodedFrames: frameCount,
    productionStatus: manifest.status, productionErrors: production.errors,
    oracleRecomputed: independent, oracleMatched: JSON.stringify(independent) === JSON.stringify(production),
    shutter: shutter ? {samples: shutter.samples, frames: shutter.frames, captures: shutter.groups.reduce((sum, group) => sum + group.sources.length, 0), variedGroups: variedGroups.length,
      sourceHashesAvailable: true, rawSourcesRetained: fs.existsSync(shutter.source),
      scope: 'Hash records are audited; deleted raw PNGs cannot be independently recomposited from the manifest. Different sample hashes demonstrate temporal variation, not universal blur quality.'} : null,
    scope: {pixelAudit: 'independently decoded every encoded frame at 96x54 grey', visualReview: 'not performed by this script', playback: 'not performed', audioListening: 'not performed'},
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/review_continuous.mjs BUILD_DIRECTORY');
    console.log(JSON.stringify(reviewContinuous(process.argv[2]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 3; }
}

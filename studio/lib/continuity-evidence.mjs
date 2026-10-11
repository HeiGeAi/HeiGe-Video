import fs from 'node:fs';
import path from 'node:path';
import {evaluateContinuity} from './continuity-oracle.mjs';
import {fileHash} from './integrity.mjs';

// Call after the normal inventory and environment checks. Reports are data,
// never executable code and never substitutes for missing measured frames.
export function verifyContinuousEvidence(plan, out, manifest) {
  if (!plan.project.continuity) return;
  const read = name => JSON.parse(fs.readFileSync(path.join(out, name), 'utf8'));
  const probe = read('continuity-probe.json'), recorded = read('continuity-check.json'), pixels = read('media-check.json');
  if (pixels.status !== 'pass' || !Array.isArray(pixels.errors) || pixels.errors.length) throw new Error('Final media evidence did not pass');
  for (const [key,expected] of [['width',plan.width],['height',plan.height],['fps',plan.fps],['frames',plan.durationInFrames]]) if (pixels.actual?.[key] !== expected) throw new Error('Decoded media metadata differs from the compiled plan');
  if (!Number.isFinite(pixels.actual?.duration) || Math.abs(pixels.actual.duration - plan.duration) > 1 / plan.fps) throw new Error('Decoded media duration differs from the compiled plan');
  if (manifest.format?.width !== plan.width || manifest.format?.height !== plan.height || manifest.format?.fps !== plan.fps || manifest.frame_count !== plan.durationInFrames || manifest.fps !== plan.fps || manifest.duration !== plan.duration || manifest.source_start !== 0 || manifest.source_time_scale !== 1) throw new Error('Build manifest clock or format differs from the compiled plan');
  if (probe.engine !== manifest.engine || JSON.stringify(probe.input) !== JSON.stringify(manifest.input) || manifest.continuity?.status !== 'structural-pass') throw new Error('Continuous evidence has a different engine, input or status');
  const actual = evaluateContinuity(plan, probe.frames, {videoSha256:fileHash(path.join(out,'video.mp4')),pixelReport:pixels});
  if (!actual.passed || JSON.stringify(actual) !== JSON.stringify(recorded)) throw new Error('Continuous evidence is missing, failed or inconsistent with actual probes');
  if (JSON.stringify(manifest.continuity) !== JSON.stringify({status:actual.status,coverage:actual.coverage,boundaries:actual.boundaries,scope:actual.scope})) throw new Error('Manifest continuity summary differs from the measured report');
  const samples = plan.project.continuity.blur?.samples ?? 1;
  if (manifest.temporalShutter?.samples !== samples) throw new Error('Temporal sampling differs from the authored project');
  if (samples === 3) {
    const shutter = read('shutter.json');
    if (shutter.schemaVersion !== 'heige-temporal-composite/1' || shutter.method !== 'linear16-srgb-lut-global-shutter-average' || shutter.samples !== 3 || shutter.frames !== plan.durationInFrames || shutter.width !== plan.width || shutter.height !== plan.height || shutter.groups?.length !== plan.durationInFrames || manifest.temporalShutter.angle !== 180 || manifest.temporalShutter.captures !== plan.durationInFrames * 3) throw new Error('Incomplete temporal shutter evidence');
    const files = new Set();
    shutter.groups.forEach((group,index) => {
      if (group.frame !== index || group.file !== `element-${String(index).padStart(6,'0')}.png` || !/^[0-9a-f]{64}$/.test(group.sha256) || group.sources?.length !== 3) throw new Error('Invalid temporal composite group');
      for (const [slot,item] of group.sources.entries()) {
        if (typeof item.file !== 'string' || !/^element-[0-9]+\.png$/.test(item.file) || Number(item.file.slice(8,-4)) !== index * 3 + slot || files.has(item.file) || !/^[0-9a-f]{64}$/.test(item.sha256)) throw new Error('Missing or reused temporal capture');
        files.add(item.file);
      }
    });
  }
  if (plan.project.continuity.soundEvents?.length) {
    const sound = read('sound-events.json');
    if (!sound.events || sound.events.length !== plan.project.continuity.soundEvents.length || sound.rate !== 48000 || sound.channels !== 2 || sound.samples !== Math.round(plan.duration * 48000) || !Number.isFinite(sound.rms) || sound.rms <= 0 || !Number.isFinite(sound.peak) || sound.peak <= 0 || sound.peak > .6 + 1e-9) throw new Error('Incomplete event-audio evidence');
    plan.project.continuity.soundEvents.forEach((event,index) => {
      if (Object.entries(event).some(([key,value]) => sound.events[index][key] !== value) || sound.events[index].sample !== Math.round(event.at * 48000)) throw new Error('Event-audio timing or source changed');
    });
  }
}

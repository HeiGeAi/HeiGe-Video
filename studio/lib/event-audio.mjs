import fs from 'node:fs';
import {sampleContinuity} from './continuous-motion.mjs';

// Original synthetic materials, with event timing and panning from the same world.
// A small shared delay room is an effect, not a physical acoustic simulation.
export function synthesizeEventAudio(plan, output) {
  const events = plan?.project?.continuity?.soundEvents ?? [];
  if (!Array.isArray(events)) throw new Error('Sound events must be an array');
  if (!events.length) return null;
  if (!Number.isFinite(plan.duration) || plan.duration <= 0 || plan.duration > 60 || ![24,30].includes(plan.fps) || !Number.isInteger(plan.durationInFrames) || Math.abs(plan.duration * plan.fps - plan.durationInFrames) > 1e-6 || !Number.isFinite(plan.width) || plan.width <= 0 || !Number.isFinite(plan.height) || plan.height <= 0) throw new Error('Invalid event-audio clock or viewport');
  const ids = new Set();
  for (const event of events) {
    if (!event || typeof event.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(event.id) || ids.has(event.id) || !['tick','whoosh','impact'].includes(event.type) || !Number.isFinite(event.at) || event.at < 0 || event.at > plan.duration - 1 / plan.fps + 1e-9 || !Number.isFinite(event.volume) || event.volume < .001 || event.volume > .7 || !plan.project.continuity.objects.some(object => object.id === event.objectId)) throw new Error('Invalid sound event');
    ids.add(event.id);
  }
  const rate = 48000, count = Math.round(plan.duration * rate);
  const left = new Float64Array(count), right = new Float64Array(count);
  const measured = [];
  for (const event of events) {
    const world = sampleContinuity(plan.project.continuity, event.at, plan.width, plan.height);
    const subject = world.objects.find(item => item.id === event.objectId);
    if (!subject) throw new Error('Sound event has no persistent source object');
    const box = subject.projectedRect;
    const pan = Math.max(-.8, Math.min(.8, 2 * (box.x + box.width / 2) / plan.width - 1));
    const gainL = Math.cos((pan + 1) * Math.PI / 4), gainR = Math.sin((pan + 1) * Math.PI / 4);
    const length = event.type === 'whoosh' ? .45 : event.type === 'impact' ? .28 : .13;
    let state = [...event.id].reduce((value, char) => ((value * 33) ^ char.codePointAt(0)) >>> 0, 2166136261) || 1;
    let previousNoise = 0;
    const start = Math.round(event.at * rate);
    const echoes = [[0, 1], [.071, .16], [.113, .10], [.173, .055]];
    for (let offset = 0; offset < Math.ceil(length * rate); offset++) {
      const t = offset / rate, p = t / length;
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      const noise = (state >>> 0) / 2147483648 - 1;
      let value;
      if (event.type === 'whoosh') value = (noise + previousNoise) * .36 * Math.sin(Math.PI * p) ** 2;
      else if (event.type === 'impact') value = Math.sin(2 * Math.PI * (115 * t - 100 * t * t)) * Math.exp(-18 * t) + noise * .10 * Math.exp(-70 * t);
      else value = (Math.sin(2 * Math.PI * 920 * t) + .30 * Math.sin(2 * Math.PI * 1460 * t)) * Math.exp(-48 * t) * Math.min(1, t / .003);
      previousNoise = noise;
      value *= event.volume;
      for (const [delay, gain] of echoes) {
        const index = start + offset + Math.round(delay * rate);
        if (index < count) {left[index] += value * gain * gainL; right[index] += value * gain * gainR;}
      }
    }
    measured.push({...event, pan, sample: start, duration: length});
  }
  let peak = 0;
  for (let index = 0; index < count; index++) peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
  const gain = peak > .6 ? .6 / peak : 1;
  const pcm = Buffer.alloc(count * 4);
  let squares = 0;
  for (let index = 0; index < count; index++) {
    const l = left[index] * gain, r = right[index] * gain;
    if (!Number.isFinite(l) || !Number.isFinite(r)) throw new Error('Event synthesis produced a nonfinite sample');
    pcm.writeInt16LE(Math.round(l * 32767), index * 4);
    pcm.writeInt16LE(Math.round(r * 32767), index * 4 + 2);
    squares += (l * l + r * r) / 2;
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(output, Buffer.concat([header, pcm]), {flag:'wx'});
  return {events:measured, rate, channels:2, samples:count, duration:count / rate, peak:peak * gain, rms:Math.sqrt(squares / count), gain,
    material:'Original procedural tick, air and low impact in one shared delay room', listening:'not-tested'};
}

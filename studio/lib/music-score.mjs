import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

// Original eight-bar composition and instrument synthesis. No samples,
// SoundFont data, external provider, model API or reference melody is loaded.
const RATE = 48000;
const BPM = 128;
const DURATION = 15;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const midiHz = note => 440 * 2 ** ((note - 69) / 12);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

const sections = [
  {id: 'strike', firstBar: 0, bars: 1, at: 0, end: BAR, intent: 'Immediate kick, bass and hook establish the object'},
  {id: 'drive', firstBar: 1, bars: 2, at: BAR, end: BAR * 3, intent: 'Syncopated drums and harmony establish forward motion'},
  {id: 'charge', firstBar: 3, bars: 1, at: BAR * 3, end: BAR * 4, intent: 'Filtered lift and drum fill prepare the transformation'},
  {id: 'forge', firstBar: 4, bars: 3, at: BAR * 4, end: BAR * 7, intent: 'Full breakbeat, bass, harmony and main hook'},
  {id: 'seal', firstBar: 7, bars: 1, at: BAR * 7, end: DURATION, intent: 'Return to tonic, final strike and a clean decay'},
];
const roots = [38, 38, 34, 36, 38, 34, 41, 38];
const chords = [
  [50, 53, 57, 60, 64], [50, 53, 57, 60, 64], [46, 50, 53, 57, 60], [48, 52, 55, 62],
  [50, 53, 57, 60, 64], [46, 50, 53, 57, 60], [53, 57, 60, 64, 67], [50, 53, 57, 62],
];

export function composeMusicScore(plan) {
  const config = plan?.project?.continuity?.musicScore;
  if (config === undefined) return null;
  if (!plain(config) || Object.keys(config).some(key => !['style', 'bpm', 'volume'].includes(key)) || config.style !== 'forge-breakbeat' || config.bpm !== BPM || !finite(config.volume) || config.volume <= 0 || config.volume > 1) throw new Error('musicScore requires style forge-breakbeat, bpm 128 and volume in (0,1]');
  if (!finite(plan.duration) || Math.abs(plan.duration - DURATION) > 1e-8 || ![24, 30].includes(plan.fps) || !Number.isInteger(plan.durationInFrames) || plan.durationInFrames !== plan.fps * DURATION) throw new Error('Original forge score requires the final 15-second quantized film clock');
  if (plan.project.music !== undefined) throw new Error('Original musicScore and a separate music asset are mutually exclusive');
  const seed = plan.project.seed ?? 20261012;
  if (!Number.isSafeInteger(seed)) throw new Error('Music seed must be a safe integer');
  const events = [];
  const add = (bar, step, type, gain, length, notes = [], pan = 0) => {
    const at = bar * BAR + step * BEAT / 4;
    events.push({id: `${type}-${events.length}`, bar, step, type, at, sample: Math.round(at * RATE),
      duration: Math.min(length, DURATION - at), gain, notes, pan});
  };
  for (let bar = 0; bar < 8; bar++) {
    const outro = bar === 7;
    const lastStep = outro ? 8 : 16;
    const kickPattern = bar % 2 ? [0, 3, 8, 10, 14] : [0, 6, 10, 14.5];
    for (const step of kickPattern.filter(step => step <= lastStep)) add(bar, step, 'kick', step === 0 ? .85 : .65, .34);
    for (const step of [4, 12].filter(step => step < lastStep)) add(bar, step, 'snare', .43, .24);
    if (!outro) for (const step of [7, 11.5, 15]) add(bar, step, 'snare', .09, .13, [], step === 7 ? -.12 : .12);
    for (let step = 0; step < lastStep; step++) {
      if (bar === 0 && step % 2) continue;
      const shifted = step % 2 ? step + .075 : step;
      const open = step === 6 || step === 14;
      add(bar, shifted, open ? 'open-hat' : 'hat', step % 4 === 0 ? .12 : step % 2 ? .052 : .085, open ? .18 : .065, [], step % 2 ? .42 : -.34);
    }
    if ([0, 2, 4, 6, 7].includes(bar)) add(bar, 0, 'metal', bar === 4 ? .16 : .08, .75, [], .3);
    const bass = [[0, 0, 1.35], [3, 0, .72], [6, 12, .85], [8, 0, .75], [10.5, 7, .8], [14, 0, 1.25]];
    for (const [step, interval, length] of bass.filter(([step]) => step <= lastStep)) add(bar, step, 'bass', bar === 3 ? .24 : .34, length * BEAT / 4, [roots[bar] + interval]);
    for (const step of (bar === 0 ? [0, 10] : [0, 6, 10]).filter(step => step <= lastStep)) add(bar, step, 'chord', bar === 3 ? .16 : bar >= 4 ? .42 : .30, .65, chords[bar], -.12);
    const motif = bar === 6 ? [65, 72, 74, 77, 74, 69] : [62, 69, 72, 74, 72, 65];
    const positions = [0, 3, 6, 9, 11, 14];
    positions.forEach((step, index) => {
      if (step > lastStep || (bar === 3 && index > 2)) return;
      add(bar, step, 'hook', bar === 3 ? .16 : bar >= 4 ? .35 : .23, .22, [motif[index]], index % 2 ? .22 : -.22);
    });
    if (bar === 3) {
      add(bar, 0, 'riser', .13, BAR);
      for (const step of [12, 13, 14, 14.5, 15, 15.5]) add(bar, step, 'snare', .10 + (step - 12) * .035, .13);
    }
    if (outro) {
      add(bar, 8, 'snare', .33, .24);
      add(bar, 8, 'chord', .55, .75, chords[7]);
      add(bar, 8, 'hook', .27, .48, [62], 0);
    }
  }
  events.sort((a, b) => a.sample - b.sample || a.id.localeCompare(b.id, 'en'));
  return {config: {...config}, seed, rate: RATE, channels: 2, duration: DURATION,
    timeline: {bpm: BPM, timeSignature: '4/4', beats: 32, bars: 8, secondsPerBeat: BEAT,
      sections: sections.map(section => ({...section, sample: Math.round(section.at * RATE), endSample: Math.round(section.end * RATE)})),
      beatsAt: Array.from({length: 32}, (_, beat) => ({beat, bar: Math.floor(beat / 4), at: beat * BEAT, sample: Math.round(beat * BEAT * RATE)}))},
    events};
}

function randomFor(seed, id) {
  let state = [...id].reduce((value, char) => Math.imul(value ^ char.codePointAt(0), 16777619) >>> 0, seed >>> 0) || 1;
  return () => {state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 2147483648 - 1;};
}
function polyBlep(phase, step) {
  if (phase < step) {const x = phase / step; return x + x - x * x - 1;}
  if (phase > 1 - step) {const x = (phase - 1) / step; return x * x + x + x + 1;}
  return 0;
}
const saw = (phase, step) => 2 * phase - 1 - polyBlep(phase, step);

function renderVoice(event, seed) {
  const length = Math.ceil(event.duration * RATE);
  const signal = new Float64Array(length), rng = randomFor(seed, event.id);
  const frequencies = event.notes.map(midiHz), phases = frequencies.map(() => [0, .23, .51]);
  let lowNoise = 0, bandNoise = 0, filter = 0, filter2 = 0;
  for (let index = 0; index < length; index++) {
    const t = index / RATE, tail = clamp((event.duration - t) / .025, 0, 1);
    const noise = rng();
    lowNoise += .14 * (noise - lowNoise);
    bandNoise += .68 * (noise - bandNoise);
    const bright = bandNoise - lowNoise;
    let value = 0;
    if (event.type === 'kick') {
      const phase = 2 * Math.PI * (52 * t + 104 * .022 * (1 - Math.exp(-t / .022)));
      const body = Math.sin(phase) + .20 * Math.sin(phase * 2) * Math.exp(-t * 35);
      value = Math.tanh(body * 1.8) * Math.exp(-t * 12) + bright * .18 * Math.exp(-t * 180);
    } else if (event.type === 'snare') {
      const body = (Math.sin(2 * Math.PI * 183 * t) + .45 * Math.sin(2 * Math.PI * 337 * t)) * Math.exp(-t * 28);
      const snap = bright * (Math.exp(-t * 24) + .36 * Math.exp(-Math.abs(t - .009) * 280) + .23 * Math.exp(-Math.abs(t - .018) * 220));
      value = body * .45 + snap * 1.4;
    } else if (['hat', 'open-hat', 'metal'].includes(event.type)) {
      const metal = [4021, 5317, 6703, 8219, 9613, 11171].reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * t + 1.1 * Math.sin(2 * Math.PI * frequency * 1.414 * t)), 0) / 6;
      const decay = event.type === 'metal' ? 7 : event.type === 'open-hat' ? 24 : 75;
      value = (.65 * bright + .55 * metal) * Math.exp(-t * decay) * Math.min(1, t / .0007);
    } else if (event.type === 'bass') {
      const frequency = frequencies[0], step = frequency / RATE;
      phases[0][0] = (phases[0][0] + step) % 1;
      const oscillator = saw(phases[0][0], step) * .58 + Math.sin(2 * Math.PI * frequency * .5 * t) * .42;
      const cutoff = 160 + 1550 * Math.exp(-t * 20);
      filter += (1 - Math.exp(-2 * Math.PI * cutoff / RATE)) * (oscillator - filter);
      const envelope = Math.min(1, t / .004) * Math.exp(-t * 4.2) * tail;
      value = Math.tanh(filter * 3.2) * envelope;
    } else if (event.type === 'chord' || event.type === 'hook') {
      frequencies.forEach((frequency, voice) => {
        for (let detune = 0; detune < 3; detune++) {
          const step = frequency * 2 ** ((detune - 1) * (event.type === 'chord' ? 7 : 4) / 1200) / RATE;
          phases[voice][detune] = (phases[voice][detune] + step) % 1;
          value += saw(phases[voice][detune], step) / 3 / frequencies.length;
        }
      });
      if (event.type === 'hook') value += Math.sin(2 * Math.PI * frequencies[0] * 2 * t) * .12;
      const cutoff = (event.type === 'hook' ? 1000 : 800) + 4200 * Math.exp(-t * 13);
      const coefficient = 1 - Math.exp(-2 * Math.PI * cutoff / RATE);
      filter += coefficient * (value - filter); filter2 += coefficient * (filter - filter2);
      value = Math.tanh(filter2 * 1.9) * Math.min(1, t / .006) * Math.exp(-t * (event.type === 'hook' ? 9 : 4)) * tail;
    } else if (event.type === 'riser') {
      const progress = t / event.duration;
      value = (bright * .7 + Math.sin(2 * Math.PI * (680 * t + 1300 * t * t / event.duration)) * .16) * progress ** 1.5 * tail;
    }
    signal[index] = value * event.gain * tail;
  }
  return signal;
}

export function synthesizeMusicScore(plan, output) {
  const score = composeMusicScore(plan);
  if (!score) return null;
  const count = Math.round(score.duration * RATE);
  const stems = Object.fromEntries(['drums', 'bass', 'harmony', 'hook', 'lift'].map(role => [role, [new Float64Array(count), new Float64Array(count)]]));
  const kickDucks = new Float64Array(count);
  for (const event of score.events) {
    const voice = renderVoice(event, score.seed);
    const role = ['kick', 'snare', 'hat', 'open-hat', 'metal'].includes(event.type) ? 'drums' : event.type === 'chord' ? 'harmony' : event.type === 'riser' ? 'lift' : event.type;
    const gains = [Math.cos((event.pan + 1) * Math.PI / 4), Math.sin((event.pan + 1) * Math.PI / 4)];
    for (let index = 0; index < voice.length && event.sample + index < count; index++) {
      const destination = event.sample + index;
      for (let channel = 0; channel < 2; channel++) stems[role][channel][destination] += voice[index] * gains[channel];
      if (event.type === 'kick') kickDucks[destination] = Math.max(kickDucks[destination], .42 * Math.exp(-index / RATE * 22));
    }
  }
  // Tempo delays create musical space. Their sources are the authored tonal
  // voices; no scene SFX triggers can accidentally duck the music bed.
  for (const [role, delay, gain] of [['harmony', BEAT / 2, .17], ['hook', BEAT * .75, .22]]) {
    const samples = Math.round(delay * RATE), stem = stems[role];
    for (let index = samples; index < count; index++) {
      const l = stem[0][index - samples], r = stem[1][index - samples];
      stem[0][index] += r * gain; stem[1][index] += l * gain;
    }
  }
  const mix = [new Float64Array(count), new Float64Array(count)];
  const stemRms = Object.fromEntries(Object.keys(stems).map(role => [role, 0]));
  let rawPeak = 0;
  for (let index = 0; index < count; index++) {
    const at = index / RATE;
    const fade = Math.min(1, at / .002) * clamp((DURATION - at) / .35, 0, 1);
    for (let channel = 0; channel < 2; channel++) {
      let value = 0;
      for (const [role, stereo] of Object.entries(stems)) {
        const sample = stereo[channel][index] * (role === 'bass' || role === 'harmony' ? 1 - kickDucks[index] : 1);
        stemRms[role] += sample * sample / (count * 2);
        value += sample;
      }
      mix[channel][index] = Math.tanh(value * 1.45) * fade;
      rawPeak = Math.max(rawPeak, Math.abs(mix[channel][index]));
    }
  }
  const gain = .88 * score.config.volume / rawPeak;
  const pcm = Buffer.alloc(count * 4);
  const halfSecond = Array.from({length: 30}, () => ({peak: 0, squares: 0, samples: 0}));
  let peak = 0, squares = 0;
  for (let index = 0; index < count; index++) {
    const window = halfSecond[Math.min(29, Math.floor(index / RATE * 2))];
    for (let channel = 0; channel < 2; channel++) {
      const sample = mix[channel][index] * gain;
      if (!Number.isFinite(sample)) throw new Error('Music synthesis produced a nonfinite PCM sample');
      const quantized = Math.round(clamp(sample, -.999, .999) * 32767);
      pcm.writeInt16LE(quantized, index * 4 + channel * 2);
      const actual = quantized / 32767;
      peak = Math.max(peak, Math.abs(actual)); squares += actual * actual;
      window.peak = Math.max(window.peak, Math.abs(actual)); window.squares += actual * actual; window.samples++;
    }
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  const wav = Buffer.concat([header, pcm]);
  fs.writeFileSync(output, wav, {flag: 'wx'});
  return {schemaVersion: 'heige-original-music/1', style: 'forge-breakbeat', composition: 'Original eight-bar D-minor industrial breakbeat',
    bpm: BPM, duration: count / RATE, rate: RATE, channels: 2, samples: count, volume: score.config.volume,
    sha256: hash(wav), pcmSha256: hash(pcm), finite: true, peak, rms: Math.sqrt(squares / (count * 2)),
    seed: score.seed, masterGain: gain, timeline: score.timeline, events: score.events,
    eventCounts: Object.fromEntries([...new Set(score.events.map(event => event.type))].map(type => [type, score.events.filter(event => event.type === type).length])),
    sourceStemRms: Object.fromEntries(Object.entries(stemRms).map(([role, energy]) => [role, Math.sqrt(energy)])),
    halfSecondRms: halfSecond.map((window, index) => ({at: index / 2, peak: window.peak, rms: Math.sqrt(window.squares / window.samples)})),
    instruments: ['pitch-swept saturated kick', 'layered body/noise snare and ghosts', 'inharmonic metallic hats', 'band-limited filtered saw/sub bass', 'detuned minor/major chord stabs', 'original gated lead hook', 'filtered lift and tempo delays'],
    scope: {source: 'Original composition and procedural instruments; no downloaded samples, SoundFont or provider call',
      clock: '15-second final-film clock, 128 BPM, eight bars, exact 48000 Hz cue samples',
      measurements: 'Actual quantized PCM sample peak/RMS, hashes and arrangement density; not LUFS, true-peak or perceptual certification',
      listening: 'not-tested', quality: 'Requires actual listening and audiovisual review; finite samples do not establish good music'}};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!['--out', '--volume', '--seed'].includes(args[index]) || args[index + 1] === undefined || Object.hasOwn(options, args[index])) throw new Error('Usage: node studio/lib/music-score.mjs --out NEW.wav [--volume .8] [--seed 20261012]');
    options[args[index]] = args[index + 1];
  }
  if (!options['--out'] || !options['--out'].endsWith('.wav')) throw new Error('A new WAV output is required');
  const sidecar = options['--out'].slice(0, -4) + '.json';
  if (fs.existsSync(options['--out']) || fs.existsSync(sidecar)) throw new Error('Music WAV or metadata already exists');
  const plan = {duration: 15, durationInFrames: 450, fps: 30, project: {seed: Number(options['--seed'] ?? 20261012), continuity: {musicScore: {style: 'forge-breakbeat', bpm: 128, volume: Number(options['--volume'] ?? .8)}}}};
  const report = synthesizeMusicScore(plan, options['--out']);
  fs.writeFileSync(sidecar, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  console.log(JSON.stringify({wav: options['--out'], metadata: sidecar, sha256: report.sha256, peak: report.peak, rms: report.rms, events: report.events.length}));
}

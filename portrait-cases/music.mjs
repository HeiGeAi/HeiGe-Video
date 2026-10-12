import fs from 'node:fs';
import crypto from 'node:crypto';

// Original scores and procedural instruments for the four 2026 portrait films.
// These are new phrases, arrangements and timbres, with no sampled recordings.
const rate = 48000;
const duration = 16;
const count = rate * duration;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hz = note => 440 * 2 ** ((note - 69) / 12);
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const tau = Math.PI * 2;

const scores = {
  berry: {
    title: 'Berry Scoop Swing', bpm: 120, bars: 8, swing: .052,
    palette: 'Swing mallet melody, bouncing bass, brushed shaker and hand clap.',
    roots: [46, 43, 39, 41, 46, 39, 41, 46],
    // An original Bb-major question/answer, rather than the previous pop motif.
    phrases: [
      [70, 74, 77, 74, 72, 70],
      [67, 70, 74, 77, 74, 72],
      [67, 70, 75, 79, 77, 75],
      [69, 72, 77, 76, 72, 69],
      [74, 77, 82, 81, 77, 74],
      [75, 79, 82, 79, 77, 75],
      [72, 77, 81, 79, 76, 72],
      [74, 72, 70, 77, 74, 70],
    ],
    cues: [[.95, 'bounce'], [2.10, 'bounce'], [3.20, 'bounce'], [3.55, 'bounce'], [4.25, 'servo', .58, .07], [5.15, 'bounce'], [6.85, 'bounce'], [8.25, 'pour', 1.05, .08], [9.65, 'lock'], [10.60, 'fizz', .55, .08], [12.25, 'bounce'], [13.45, 'bounce']],
  },
  coffee: {
    title: 'Morning Latte Stroll', bpm: 96, bars: 6, swing: .08,
    palette: 'Warm electric piano sevenths, walking bass, soft brush and cup Foley.',
    chords: [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [43, 47, 50, 53]],
    phrases: [[76, 79, 83, 81], [79, 76, 72, 71], [77, 81, 84, 83], [83, 81, 77, 74], [76, 79, 83, 86], [81, 77, 74, 71]],
    cues: [[.80, 'cup'], [2.00, 'lock'], [2.80, 'pour', .30, .07], [3.25, 'pour', 2.4, .052], [6.75, 'cup'], [7.75, 'pour', 1.2, .065], [9.80, 'spark', .2, .045], [11.50, 'spark', .3, .06], [12.35, 'servo', .22, .045], [13.10, 'cup'], [13.45, 'steam', .8, .055]],
  },
  camera: {
    title: 'Snap Color Funk', bpm: 120, bars: 8, swing: .015,
    palette: 'Dry clavinet stabs, syncopated bass, crisp backbeat and shutter/camera mechanics.',
    roots: [52, 52, 57, 57, 48, 50, 52, 52],
    phrases: [[76, 79, 83, 86], [83, 79, 76, 74], [81, 84, 88, 91], [88, 84, 81, 79], [79, 76, 72, 76], [78, 81, 84, 83], [83, 86, 88, 86], [83, 79, 76, 76]],
    cues: [[.45, 'bounce'], [1.75, 'ratchet'], [2.40, 'servo'], [3.60, 'lock'], [4.50, 'shutter'], [5.05, 'print'], [6.60, 'paper'], [7.30, 'air'], [8.00, 'bounce'], [8.60, 'spark'], [10.00, 'paper'], [11.50, 'servo'], [12.50, 'stamp'], [14.00, 'bounce'], [14.50, 'lock']],
  },
  rocket: {
    title: 'Orbit Express', bpm: 150, bars: 10, swing: 0,
    palette: 'Bright sequenced space arpeggios, short motor bass and clipped drums.',
    chords: [[50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57], [50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57], [50, 54, 57, 62], [50, 54, 57, 62]],
    cues: [[.45, 'bounce'], [1.35, 'lock'], [2.25, 'lock'], [3.25, 'lock'], [4.25, 'charge'], [5.00, 'ignite'], [5.55, 'launch'], [7.20, 'air'], [9.20, 'air'], [11.20, 'launch'], [12.50, 'stamp'], [13.20, 'bounce'], [14.00, 'spark'], [14.50, 'lock']],
  },
};

function makeEvents(style, score) {
  const events = [];
  const beat = 60 / score.bpm;
  const bar = beat * 4;
  const add = (at, type, gain, length, notes = [], pan = 0, cue = false) => {
    if (!Number.isFinite(at) || at < 0 || at >= duration || !Number.isFinite(length) || length <= 0) throw new Error('Invalid portrait music event clock');
    const eventDuration = Math.min(length, duration - at);
    events.push({id: events.length, at, type, gain, duration: eventDuration, notes, pan, sample: Math.round(at * rate), cue});
  };
  for (let b = 0; b < score.bars; b++) {
    const start = b * bar;
    const last = b === score.bars - 1;
    if (style === 'berry') {
      const root = score.roots[b];
      const third = root === 43 ? 3 : 4;
      add(start, 'warm', .074, bar * .92, [root + 12, root + 12 + third, root + 19], -.22);
      for (const at of (last ? [0, 2] : [0, 1, 2, 3])) add(start + at * beat, 'kick', .18, .22);
      for (const at of [1, 3]) add(start + at * beat, 'clap', .054, .13, [], .12);
      for (let n = 0; n < (last ? 5 : 8); n++) add(start + n * beat / 2 + (n % 2 ? score.swing : 0), 'shaker', .028, .07, [], n % 2 ? .46 : -.46);
      const bass = [root - 12, root - 5, root - 12, root - 10];
      for (let n = 0; n < 4; n++) add(start + n * beat, 'pluckBass', .19, .30, [bass[n]], -.10);
      const positions = [0, .5, 1.5, 2, 2.5, 3.5];
      for (let n = 0; n < (last ? 3 : positions.length); n++) add(start + positions[n] * beat + (positions[n] % 1 ? score.swing : 0), 'marimba', .24, .43, [score.phrases[b][n]], n % 2 ? .28 : -.28);
      if (!last && b % 2) add(start + 3.75 * beat, 'marimba', .14, .20, [root + 28, root + 31], .4);
    } else if (style === 'coffee') {
      const chord = score.chords[b];
      // Independent chord attacks keep the sound warm and rhythmic rather than a pad.
      add(start + .12 * beat, 'epiano', .155, 1.25, chord.map(n => n + 12), -.16);
      if (!last) add(start + 2.55 * beat, 'epiano', .092, .78, chord.map(n => n + 12), .2);
      for (const at of [0, 2]) add(start + at * beat, 'kick', .086, .28);
      for (const at of [1, 3]) add(start + at * beat, 'brush', .032, .18, [], .18);
      for (let n = 0; n < 8; n++) add(start + n * beat / 2 + (n % 2 ? score.swing : 0), 'brushHat', .010, .105, [], n % 2 ? .35 : -.35);
      const nextRoot = b < score.bars - 1 ? score.chords[b + 1][0] : 48;
      const walk = [chord[0] - 12, chord[2] - 12, chord[1] - 12, nextRoot - 13];
      for (let n = 0; n < 4; n++) add(start + n * beat, 'upright', .135, .42, [walk[n]], -.1);
      const positions = [.5, 1.5, 2.5, 3];
      for (let n = 0; n < 4; n++) add(start + positions[n] * beat + (positions[n] % 1 ? score.swing : 0), 'epiano', .145, .56, [score.phrases[b][n]], n % 2 ? .16 : -.16);
    } else if (style === 'camera') {
      const root = score.roots[b];
      for (const at of (last ? [0, 2] : [0, 1.75, 2.5])) add(start + at * beat, 'kick', .205, .20);
      for (const at of [1, 3]) add(start + at * beat, 'snare', .073, .125, [], .12);
      for (let n = 0; n < (last ? 4 : 8); n++) add(start + n * beat / 2, 'hat', n % 2 ? .037 : .023, .055, [], n % 2 ? .35 : -.35);
      const bassAt = [0, .75, 1.5, 2, 2.75, 3.5];
      const bassNotes = [root - 12, root - 12, root - 5, root - 12, root - 2, root - 5];
      for (let n = 0; n < (last ? 3 : bassAt.length); n++) add(start + bassAt[n] * beat, 'funkBass', .19, .145, [bassNotes[n]], -.06);
      const stabAt = [.5, 1.25, 2.5, 3.25];
      for (let n = 0; n < (last ? 2 : 4); n++) add(start + stabAt[n] * beat, 'clav', .155, .14, [root + 12, root + 15, root + 22], n % 2 ? .32 : -.32);
      for (let n = 0; n < (last ? 2 : 4); n++) add(start + [.25, 1.75, 2.25, 3.75][n] * beat, 'clav', .145, .16, [score.phrases[b][n]], n % 2 ? .18 : -.18);
    } else {
      const chord = score.chords[b];
      const root = chord[0];
      for (const at of (last ? [0, 2] : [0, 1.5, 2, 3])) add(start + at * beat, 'kick', .19, .17);
      for (const at of [1, 3]) add(start + at * beat, 'snare', .047, .12, [], .12);
      for (let n = 0; n < (last ? 4 : 8); n++) add(start + n * beat / 2, 'hat', .020, .048, [], n % 2 ? .4 : -.4);
      for (const at of (last ? [0, 2] : [0, .75, 1.5, 2, 2.75, 3.5])) add(start + at * beat, 'motorBass', .115, .19, [root - 12], -.05);
      const pattern = [0, 1, 2, 3, 2, 1, 3, 2];
      for (let n = 0; n < (last ? 3 : 8); n++) add(start + n * beat / 2, 'space', .16, .28, [chord[pattern[n]] + 24 + (b === 7 ? 12 : 0)], n % 2 ? .36 : -.36);
      if ([2, 4, 6, 8].includes(b)) add(start + 3.5 * beat, 'beacon', .075, .2, [root + 36], .24);
    }
  }
  if (style === 'berry') add(14.55, 'marimba', .20, 1.1, [70, 74, 77], 0);
  if (style === 'coffee') add(15.00, 'epiano', .19, 1, [48, 60, 64, 67, 71], 0);
  if (style === 'camera') add(14.75, 'clav', .15, .28, [64, 67, 71, 76], 0);
  if (style === 'rocket') add(14.8, 'beacon', .13, .65, [74, 78, 81], 0);
  const cueLengths = {bounce: .19, ratchet: .16, servo: .34, lock: .12, shutter: .14, print: .68, paper: .18, air: .32, spark: .35, stamp: .22, charge: .62, ignite: .46, launch: .44, pour: .42, fizz: .4, cup: .15, steam: .55};
  for (const [at, type, length, gain] of score.cues) add(at, type, gain ?? (type === 'ignite' || type === 'launch' ? .11 : type === 'shutter' ? .15 : .095), length ?? cueLengths[type] ?? .2, [], 0, true);
  events.sort((a, b) => a.sample - b.sample || a.id - b.id);
  return events;
}

function synthesize(style, events) {
  const stereo = [new Float64Array(count), new Float64Array(count)];
  for (const event of events) {
    let state = ((event.id + 43) * 2246822519 + style.charCodeAt(0) * 3266489917) >>> 0;
    const noise = () => {state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 2147483648 - 1;};
    const noteFreq = event.notes.length ? hz(event.notes[0]) : 440;
    let low = 0;
    let slow = 0;
    const pan = [Math.cos((event.pan + 1) * Math.PI / 4), Math.sin((event.pan + 1) * Math.PI / 4)];
    const noteWave = fn => event.notes.reduce((sum, note) => sum + fn(hz(note)), 0) / event.notes.length;
    for (let sample = 0; sample < Math.round(event.duration * rate) && event.sample + sample < count; sample++) {
      const t = sample / rate;
      const remaining = event.duration - t;
      const tail = clamp(remaining / .025);
      const attack = clamp(t / .002);
      const n = noise();
      low += .06 * (n - low);
      slow += .018 * (n - slow);
      let value = 0;
      if (event.type === 'kick') value = Math.sin(tau * (48 * t + 84 * .019 * (1 - Math.exp(-t / .019)))) * Math.exp(-t * 21);
      else if (event.type === 'clap') value = (n - low) * Math.exp(-t * 36) * (.72 + .28 * Math.sin(t * 3400));
      else if (event.type === 'snare') value = ((n - low) * .66 + Math.sin(tau * 183 * t) * .34) * Math.exp(-t * 32);
      else if (event.type === 'hat' || event.type === 'shaker') value = (n - low) * Math.exp(-t * (event.type === 'hat' ? 95 : 67));
      else if (event.type === 'brush' || event.type === 'brushHat') value = (n - low) * Math.sin(Math.PI * t / event.duration) * (event.type === 'brush' ? .68 : .48);
      else if (event.type === 'warm') value = noteWave(f => Math.sin(tau * f * t) + .12 * Math.sin(tau * f * 2 * t)) * clamp(t / .07) * clamp(remaining / .16);
      else if (event.type === 'pluckBass' || event.type === 'upright') value = (Math.sin(tau * noteFreq * t) + .18 * Math.sin(tau * noteFreq * 2 * t) + .08 * Math.sin(tau * noteFreq * 3 * t)) * clamp(t / .006) * Math.exp(-t * (event.type === 'upright' ? 4.5 : 8));
      else if (event.type === 'funkBass') value = (Math.sin(tau * noteFreq * t) + .32 * Math.sin(tau * noteFreq * 2 * t) + .15 * Math.sin(tau * noteFreq * 3 * t)) * clamp(t / .003) * Math.exp(-t * 16);
      else if (event.type === 'motorBass') value = (Math.sin(tau * noteFreq * t) + .21 * Math.sin(tau * noteFreq * 2 * t + .2 * Math.sin(tau * 6 * t))) * clamp(t / .004) * Math.exp(-t * 11);
      else if (event.type === 'marimba') value = noteWave(f => Math.sin(tau * f * t) * Math.exp(-t * 8) + .22 * Math.sin(tau * f * 3.99 * t) * Math.exp(-t * 29)) * attack;
      else if (event.type === 'epiano') value = noteWave(f => Math.sin(tau * f * t + .85 * Math.sin(tau * f * 2 * t) * Math.exp(-t * 8)) + .07 * Math.sin(tau * f * 3 * t)) * clamp(t / .006) * Math.exp(-t * 3.5);
      else if (event.type === 'clav') value = noteWave(f => Math.sin(tau * f * t) + .43 * Math.sin(tau * f * 2 * t) + .2 * Math.sin(tau * f * 3 * t)) * attack * Math.exp(-t * 20);
      else if (event.type === 'space' || event.type === 'beacon') value = noteWave(f => Math.sin(tau * f * t + .45 * Math.sin(tau * f * 2 * t) * Math.exp(-t * 12)) + .18 * Math.sin(tau * f * .5 * t)) * attack * Math.exp(-t * (event.type === 'space' ? 11 : 5));
      else if (event.type === 'bounce') value = Math.sin(tau * (420 * t - 650 * t * t)) * Math.exp(-t * 33) * attack;
      else if (event.type === 'ratchet') value = (n - low) * Math.exp(-t * 25) * (.5 + .5 * Math.cos(tau * 38 * t)) * attack;
      else if (event.type === 'servo' || event.type === 'print') value = (low * .62 + Math.sin(tau * (210 * t + 9 * Math.sin(tau * 7 * t))) * .13) * Math.sin(Math.PI * t / event.duration) * attack;
      else if (event.type === 'lock') value = (Math.sin(tau * 880 * t) + .25 * Math.sin(tau * 1320 * t)) * Math.exp(-t * 48) * attack;
      else if (event.type === 'shutter') {
        // Two finite mechanical ticks, not an external camera recording.
        const offset = t < .043 ? t : t - .043;
        value = ((n - low) * .8 + Math.sin(tau * 2380 * t) * .2) * Math.exp(-offset * 190) * attack;
      } else if (event.type === 'paper') value = (n - low) * .42 * Math.sin(Math.PI * t / event.duration) * attack;
      else if (event.type === 'air' || event.type === 'steam') value = slow * 1.2 * Math.sin(Math.PI * t / event.duration) * attack;
      else if (event.type === 'spark') value = Math.sin(tau * (1318 * t + 770 * t * t)) * Math.exp(-t * 15) * attack;
      else if (event.type === 'stamp') value = (Math.sin(tau * 120 * t) * .6 + low * .4) * Math.exp(-t * 26) * attack;
      else if (event.type === 'charge') value = (Math.sin(tau * (110 * t + 150 * t * t)) * .42 + slow * .5) * Math.sin(Math.PI * t / event.duration) * attack;
      else if (event.type === 'ignite' || event.type === 'launch') value = (slow * 1.5 + low * .3) * Math.sin(Math.PI * t / event.duration) * attack;
      else if (event.type === 'pour') value = (low * .8 + Math.sin(tau * (980 * t + 40 * Math.sin(tau * 10 * t))) * .14) * Math.sin(Math.PI * t / event.duration) * attack;
      else if (event.type === 'fizz') value = (n - low) * .26 * Math.sin(Math.PI * t / event.duration) * attack;
      else if (event.type === 'cup') value = (Math.sin(tau * 1250 * t) + .3 * Math.sin(tau * 2210 * t)) * Math.exp(-t * 39) * attack;
      else throw new Error(`Unknown procedural portrait instrument: ${event.type}`);
      value *= event.gain * tail;
      for (let channel = 0; channel < 2; channel++) {
        stereo[channel][event.sample + sample] += value * pan[channel];
        if (['marimba', 'epiano', 'space', 'beacon'].includes(event.type)) {
          const delay = event.type === 'space' ? 7200 : 12000;
          if (event.sample + sample + delay < count) stereo[1 - channel][event.sample + sample + delay] += value * .12 * pan[channel];
        }
      }
    }
  }
  let preNormalizationPeak = 0;
  for (let sample = 0; sample < count; sample++) {
    const fade = Math.min(clamp(sample / (rate * .012)), clamp((count - 1 - sample) / (rate * .20)));
    for (let channel = 0; channel < 2; channel++) {
      const limited = Math.tanh(stereo[channel][sample] * 1.22) * fade;
      if (!Number.isFinite(limited)) throw new Error('Non-finite portrait audio sample');
      stereo[channel][sample] = limited;
      // Measure both actual channels separately, never a downmixed waveform.
      preNormalizationPeak = Math.max(preNormalizationPeak, Math.abs(limited));
    }
  }
  if (preNormalizationPeak <= 0) throw new Error('Silent portrait score');
  const gain = .64 / preNormalizationPeak;
  const pcm = Buffer.alloc(count * 4);
  let peak = 0;
  let squares = 0;
  const channelPeaks = [0, 0];
  const channelSquares = [0, 0];
  for (let sample = 0; sample < count; sample++) for (let channel = 0; channel < 2; channel++) {
    const q = Math.round(stereo[channel][sample] * gain * 32767);
    if (Math.abs(q) >= 32767) throw new Error('Portrait PCM overflow');
    pcm.writeInt16LE(q, sample * 4 + channel * 2);
    const actual = q / 32767;
    peak = Math.max(peak, Math.abs(actual));
    squares += actual ** 2;
    channelPeaks[channel] = Math.max(channelPeaks[channel], Math.abs(actual));
    channelSquares[channel] += actual ** 2;
  }
  if (peak > .68) throw new Error('Portrait peak exceeds .68 safety ceiling');
  return {pcm, peak, rms: Math.sqrt(squares / (count * 2)), channelPeaks, channelRms: channelSquares.map(sum => Math.sqrt(sum / count)), preNormalizationPeak, masteringGain: gain};
}

export function writePortraitMusic(style, file) {
  const score = scores[style];
  if (!score) throw new Error(`Unknown portrait music: ${style}`);
  const events = makeEvents(style, score);
  const {pcm, ...measurements} = synthesize(style, events);
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 4, 28); header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  const wav = Buffer.concat([header, pcm]);
  fs.writeFileSync(file, wav, {flag: 'wx'});
  return {schemaVersion: 'heige-portrait-music/1', style, title: score.title, bpm: score.bpm, bars: score.bars, beats: score.bars * 4,
    duration, rate, channels: 2, samples: count, events, ...measurements, wavSha256: hash(wav), pcmSha256: hash(pcm), palette: score.palette,
    source: 'Original composition, arrangement and procedural instruments. No reference melody, sampled recording, downloaded sample or model provider.', listening: 'not-tested'};
}

#!/usr/bin/env node
// Original global-shutter linear-light compositor, matching our Canvas worker's
// 16-bit sRGB LUT. This averages supplied temporal PNG samples; it does not infer
// motion or claim physical HDR, rolling shutter, or per-object motion blur.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createCanvas, loadImage} from '@napi-rs/canvas';

const toLinear16 = Uint32Array.from({length: 256}, (_, value) => {
  const v = value / 255;
  return Math.round((v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4) * 65535);
});
const toSrgb = Uint8Array.from({length: 65536}, (_, value) => {
  const v = value / 65535;
  return Math.round(255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055));
});
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');

export function averageLinearSamples(samples) {
  if (!Array.isArray(samples) || ![1, 3].includes(samples.length)) throw new Error('Only one or three RGBA samples are supported');
  const length = samples[0]?.length;
  if (!length || length % 4 || samples.some(sample => sample.length !== length)) throw new Error('RGBA sample sizes must match');
  const sums = new Uint32Array(length);
  for (const sample of samples) for (let i = 0; i < length; i += 4) {
    if (sample[i + 3] !== 255) throw new Error('Temporal samples must be opaque; transparent frames are rejected');
    for (let channel = 0; channel < 3; channel++) sums[i + channel] += toLinear16[sample[i + channel]];
  }
  const output = new Uint8ClampedArray(length);
  for (let i = 0; i < length; i += 4) {
    for (let channel = 0; channel < 3; channel++) output[i + channel] = toSrgb[Math.round(sums[i + channel] / samples.length)];
    output[i + 3] = 255;
  }
  return output;
}

export async function blurFrames({input, output, samples = 3}) {
  if (![1, 3].includes(samples)) throw new Error('samples must be 1 or 3');
  const inputDir = fs.realpathSync(input), outputDir = path.resolve(output);
  const names = fs.readdirSync(inputDir).filter(name => /\.png$/i.test(name));
  const indexed = names.map(name => {
    const match = /^element-(\d+)\.png$/.exec(name);
    if (!match) throw new Error(`Unexpected PNG name ${name}; expected element-<zero-based integer>.png`);
    return {name, index: Number(match[1])};
  }).sort((a, b) => a.index - b.index);
  if (!indexed.length || indexed.length % samples || indexed.some((item, index) => item.index !== index)) throw new Error('Input PNG indices must start at zero, be contiguous and divide into complete temporal groups');
  fs.mkdirSync(path.dirname(outputDir), {recursive: true});
  // Never overwrite a prior render or blur result, including an empty directory.
  fs.mkdirSync(outputDir);
  let canvas, ctx, width, height;
  const groups = [];
  for (let frame = 0; frame < indexed.length / samples; frame++) {
    const samplePixels = [], sources = [];
    for (let slot = 0; slot < samples; slot++) {
      const item = indexed[frame * samples + slot];
      const file = path.join(inputDir, item.name);
      const bytes = fs.readFileSync(file), image = await loadImage(bytes);
      if (!canvas) {
        width = image.width; height = image.height;
        canvas = createCanvas(width, height); ctx = canvas.getContext('2d');
      }
      if (image.width !== width || image.height !== height) throw new Error(`Temporal sample dimensions differ: ${item.name}`);
      ctx.reset(); ctx.drawImage(image, 0, 0);
      samplePixels.push(ctx.getImageData(0, 0, width, height).data);
      sources.push({file: item.name, sha256: sha256(bytes)});
    }
    const pixels = averageLinearSamples(samplePixels);
    const imageData = ctx.createImageData(width, height); imageData.data.set(pixels);
    ctx.reset(); ctx.putImageData(imageData, 0, 0);
    const result = canvas.toBuffer('image/png'), filename = `element-${String(frame).padStart(6, '0')}.png`;
    fs.writeFileSync(path.join(outputDir, filename), result, {flag: 'wx'});
    groups.push({frame, sources, file: filename, sha256: sha256(result)});
    if ((frame + 1) % 4 === 0 && typeof global.gc === 'function') global.gc();
  }
  const report = {schemaVersion: 'heige-temporal-composite/1', method: 'linear16-srgb-lut-global-shutter-average', samples, frames: groups.length, width, height, source: inputDir, groups, scope: 'Supplied temporal samples only. Shutter timestamps are controlled upstream; no HDR or per-object blur claim.'};
  fs.writeFileSync(path.join(outputDir, 'composite.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), values = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--input', '--output', '--samples'].includes(args[i]) || !args[i + 1] || Object.hasOwn(values, args[i])) throw new Error('Usage: node studio/blur_frames.mjs --input PNG_DIR --output NEW_DIR --samples 3');
      values[args[i]] = args[i + 1];
    }
    if (!values['--input'] || !values['--output']) throw new Error('Both --input and --output are required');
    const report = await blurFrames({input: values['--input'], output: values['--output'], samples: Number(values['--samples'] || 3)});
    console.log(JSON.stringify({frames: report.frames, samples: report.samples, width: report.width, height: report.height, output: path.resolve(values['--output'])}));
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}

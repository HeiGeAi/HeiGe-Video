// Original offline Canvas adapter. Trusted modules only; this is not a sandbox.
// Protocol: one bounded JSON metadata line, then raw RGBA per JSON input line.
// Missing duration means legacy 30s only. Invalid declared durations always fail.
const fs = require('node:fs');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { seededRandom } = require('./motion.cjs');
// Reserve stdout before loading source code. Direct process.stdout writes in
// authored code violate the protocol and are rejected by the parent's deadline.
for (const name of ['log', 'info', 'debug', 'table']) console[name] = (...args) => console.error(...args);
const [sourcePath, widthArg, heightArg, fontPath, fontFamily] = process.argv.slice(2);
const width = Number(widthArg), height = Number(heightArg);
if (fontPath) GlobalFonts.registerFromPath(fontPath, fontFamily);
// Linear-light sRGB lookup tables. Sixteen-bit linear quantization keeps sums
// exact/deterministic (16 * 65535 fits Uint32) without a floating accumulator.
const srgbToLinear16 = Uint32Array.from({ length: 256 }, (_, value) => {
  const v = value / 255;
  return Math.round((v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) * 65535);
});
const linear16ToSrgb = Uint8Array.from({ length: 65536 }, (_, value) => {
  const v = value / 65535;
  return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
});
function writeAll(buf) {
  for (let off = 0; off < buf.length;) off += fs.writeSync(1, buf, off, buf.length - off);
}
(async () => {
  const imported = await import(pathToFileURL(sourcePath).href);
  const scene = imported.default || imported;
  const hasExport = name => Object.hasOwn(scene, name) || Object.hasOwn(imported, name);
  const valueOf = name => Object.hasOwn(scene, name) ? scene[name] : imported[name];
  const render = valueOf('render');
  if (typeof render !== 'function') throw Error('Canvas source must export render(ctx, time, options)');
  const durationKey = ['DURATION', 'duration', 'SECONDS'].find(hasExport);
  const duration = durationKey ? valueOf(durationKey) : 30;
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    throw Error('Authored source duration must be a finite positive number');
  }
  const textKey = ['TEXT_STRINGS', 'textStrings'].find(hasExport);
  const textStrings = textKey ? valueOf(textKey) : [];
  if (!Array.isArray(textStrings) || textStrings.some(text => typeof text !== 'string')) {
    throw Error('TEXT_STRINGS/textStrings must be an array of strings');
  }
  const cutKey = ['CUTS', 'cuts'].find(hasExport);
  const cuts = cutKey ? valueOf(cutKey) : [];
  if (!Array.isArray(cuts) || cuts.some((t, i) => typeof t !== 'number' || !Number.isFinite(t) || t <= 0 || t >= duration || (i > 0 && t <= cuts[i - 1]))) {
    throw Error('CUTS/cuts must be unique ascending boundaries strictly inside the source duration');
  }
  const ready = valueOf('ready');
  const stateAt = valueOf('stateAt');
  if (ready !== undefined && typeof ready !== 'function' && (ready === null || typeof ready.then !== 'function')) throw Error('ready must be a function or Promise when declared');
  if (stateAt !== undefined && typeof stateAt !== 'function') throw Error('stateAt must be a function when declared');
  const baseOptions = { width, height, fontFamily };
  // Complete font/asset preparation before announcing frame readiness. Parent
  // enforces a startup deadline, even if authored import/ready never resolves.
  if (typeof ready === 'function') await ready(baseOptions);
  else if (ready !== undefined) await ready;
  // Reuse/reset avoids accumulating native Skia surfaces across a long film.
  // Native allocations can outgrow memory before V8's ordinary GC threshold.
  const canvas = createCanvas(width, height), ctx = canvas.getContext('2d');
  if (typeof ctx.reset !== 'function') throw Error('Canvas backend requires CanvasRenderingContext2D.reset()');
  let renderedSamples = 0;
  const metadata = {
    protocol: 'heige-canvas-v1', duration, duration_source: durationKey || 'legacy_default_30s',
    text_strings: textStrings, declared_text_source: textKey || null, cuts,
    frame_ready: true, state_at: typeof stateAt === 'function',
    memory_policy: 'one reset canvas; explicit native-allocation collection every 4 samples',
    interface: 'render(ctx, time, {width,height,random,fontFamily,state,sampleIndex,sampleCount})',
  };
  const header = Buffer.from(JSON.stringify(metadata) + '\n');
  if (header.length > 65536) throw Error('Canvas metadata handshake exceeded 64 KiB');
  writeAll(header);
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    const req = JSON.parse(line);
    const times = req.times || [req.time];
    if (!Array.isArray(times) || times.length < 1 || times.length > 16 || times.some(t => typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > duration)) {
      throw Error('Frame requests require 1–16 finite source timestamps');
    }
    let pixels = null;
    const sums = times.length > 1 ? new Uint32Array(width * height * 4) : null;
    for (let sampleIndex = 0; sampleIndex < times.length; sampleIndex++) {
      const t = times[sampleIndex];
      ctx.reset();
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
      const options = { ...baseOptions, random: seededRandom(req.seed ?? 20261005), sampleIndex, sampleCount: times.length };
      if (stateAt) options.state = await stateAt(t, options);
      await render(ctx, t, options);
      if (canvas.width !== width || canvas.height !== height) throw Error('Source must not resize the runtime canvas');
      pixels = ctx.getImageData(0, 0, width, height).data;
      // Unpremultiplied alpha over white, matching the SVG compositing policy.
      for (let i = 0; i < pixels.length; i += 4) {
        const a = pixels[i + 3] / 255;
        if (a < 1) for (let c = 0; c < 3; c++) pixels[i + c] = Math.round(pixels[i + c] * a + 255 * (1 - a));
        pixels[i + 3] = 255;
      }
      if (sums) for (let i = 0; i < pixels.length; i += 4) {
        for (let c = 0; c < 3; c++) sums[i + c] += srgbToLinear16[pixels[i + c]];
      }
      if (++renderedSamples % 4 === 0 && typeof global.gc === 'function') global.gc();
    }
    // Average radiometric light, then re-encode sRGB. High-contrast black/white
    // samples produce ~188 rather than the dark 128 from encoded-RGB averaging.
    // Global shutter only: no physical HDR or per-object blur claim.
    if (sums) for (let i = 0; i < pixels.length; i += 4) {
      for (let c = 0; c < 3; c++) pixels[i + c] = linear16ToSrgb[Math.round(sums[i + c] / times.length)];
      pixels[i + 3] = 255;
    }
    writeAll(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength));
  }
})().catch(err => { console.error(err.stack || String(err)); process.exit(1); });

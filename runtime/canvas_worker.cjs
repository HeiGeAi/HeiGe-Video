// Offline Canvas adapter. Input: one JSON request per line. Output: raw RGBA.
// Author modules are trusted code, not sandboxed. Do not import unreviewed code.
const fs = require('node:fs');
const readline = require('node:readline');
const { pathToFileURL } = require('node:url');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
console.log = (...args) => console.error(...args); // Reserve stdout for protocol.
const [sourcePath, widthArg, heightArg, fontPath, fontFamily] = process.argv.slice(2);
const width = Number(widthArg), height = Number(heightArg);
if (fontPath) GlobalFonts.registerFromPath(fontPath, fontFamily);
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
(async () => {
  const imported = await import(pathToFileURL(sourcePath).href);
  const scene = imported.default || imported;
  const render = scene.render || imported.render;
  if (typeof render !== 'function') throw Error('Canvas source must export render(ctx, time, options)');
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) {
    const req = JSON.parse(line);
    const canvas = createCanvas(width, height), ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    const random = rng(req.seed ?? 20261005);
    await render(ctx, Number(req.time), { width, height, random, fontFamily });
    const rgba = ctx.getImageData(0, 0, width, height).data;
    // Unpremultiplied alpha over white, same compositing policy as SVG.
    for (let i = 0; i < rgba.length; i += 4) {
      const a = rgba[i+3] / 255;
      if (a < 1) for (let c = 0; c < 3; c++) rgba[i+c] = Math.round(rgba[i+c]*a + 255*(1-a));
      rgba[i+3] = 255;
    }
    const buf = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
    for (let off = 0; off < buf.length;) off += fs.writeSync(1, buf, off, buf.length-off);
  }
})().catch(err => { console.error(err.stack || String(err)); process.exit(1); });

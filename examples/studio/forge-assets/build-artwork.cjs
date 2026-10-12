/* Original asset render from HeiGe-Video's own Canvas films.
 * Run from any directory: node examples/studio/forge-assets/build-artwork.cjs
 * Add --check to rerender and verify existing bytes without writing files.
 * No old frame, demo image, video, external source or asset is read as input.
 */
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {createCanvas} = require('@napi-rs/canvas');

const root = path.resolve(__dirname, '../../..');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const generator = 'examples/studio/forge-assets/build-artwork.cjs';
const specifications = [
  {
    id: 'forge-editorial', file: 'editorial.png', ratio: '16:9',
    source: 'examples/swiss-editorial/film.cjs', time: 28,
    render: {width: 3840, height: 2160}, output: {width: 1280, height: 720},
    crop: {x: 528, y: 915, width: 1200, height: 675},
    subject: 'Twelve original ink rhythm bars and a red circular marker',
  },
  {
    id: 'forge-optics', file: 'optics.png', ratio: '9:16',
    source: 'examples/cinematic-product/film.cjs', time: 28,
    render: {width: 3200, height: 1800}, output: {width: 720, height: 1280},
    crop: {x: 1000, y: 12, width: 864, height: 1536},
    subject: 'Original schematic glass prism and its incoming and outgoing rays',
  },
  {
    id: 'forge-ink', file: 'ink.png', ratio: '1:1',
    source: 'examples/ink-narrative/film.cjs', time: 8.7,
    render: {width: 3840, height: 2160}, output: {width: 1080, height: 1080},
    crop: {x: 960, y: 220, width: 1800, height: 1800},
    subject: 'Original ink boat, rower and complete oar against the river',
  },
];

function renderArtwork(specification) {
  const {source, time, render, output, crop} = specification;
  assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= render.width && crop.y + crop.height <= render.height);
  assert.equal(crop.width * output.height, crop.height * output.width, 'The crop must scale isotropically');
  const sourcePath = path.join(root, source);
  const sourceSha256 = sha256(fs.readFileSync(sourcePath));
  const scene = require(sourcePath);
  assert.equal(typeof scene.render, 'function', 'Expected an original Canvas render export');
  const canvas = createCanvas(render.width, render.height);
  const context = canvas.getContext('2d');
  const prototype = Object.getPrototypeOf(context);
  const methods = ['fillText', 'strokeText'];
  const original = Object.fromEntries(methods.map(method => [method, Object.getOwnPropertyDescriptor(prototype, method)]));
  const suppressedCalls = {fillText: 0, strokeText: 0};
  try {
    for (const method of methods) {
      assert.ok(original[method]?.configurable && typeof original[method].value === 'function');
      Object.defineProperty(prototype, method, {...original[method], value: function () {suppressedCalls[method]++;}});
    }
    scene.render(context, time, {...render});
  } finally {
    for (const method of methods) Object.defineProperty(prototype, method, original[method]);
  }
  for (const method of methods) assert.deepEqual(Object.getOwnPropertyDescriptor(prototype, method), original[method]);
  assert.equal(sha256(fs.readFileSync(sourcePath)), sourceSha256, 'The original film source must remain unchanged');

  const artwork = createCanvas(output.width, output.height);
  const target = artwork.getContext('2d');
  target.imageSmoothingEnabled = true;
  target.imageSmoothingQuality = 'high';
  target.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height);
  const bytes = artwork.toBuffer('image/png');
  return {
    bytes,
    record: {
      id: specification.id,
      file: `examples/studio/forge-assets/${specification.file}`,
      ratio: specification.ratio,
      subject: specification.subject,
      source,
      sourceSha256,
      sourceTime: time,
      sourceDimensions: render,
      crop,
      dimensions: output,
      renderMethod: 'Original source render via @napi-rs/canvas; temporarily suppress prototype fillText/strokeText in try/finally; drawImage crop and isotropic scale only',
      geometryChanged: false,
      textDrawSuppressed: true,
      suppressedCalls,
      prototypeRestored: true,
      pngSha256: sha256(bytes),
      pngBytes: bytes.length,
      license: 'MIT',
      rights: 'HeiGe-Video original procedural demo artwork',
    },
  };
}

function renderAll() {
  const assets = specifications.map(renderArtwork);
  const provenance = {
    schemaVersion: 'heige-forge-artwork/1',
    date: '2026-10-12',
    generator,
    generatorSha256: sha256(fs.readFileSync(path.join(root, generator))),
    runtime: {node: process.version, canvas: require('@napi-rs/canvas/package.json').version, platform: process.platform, arch: process.arch},
    inputs: 'Only the three original source modules; no historical demo bytes or external media',
    reproductionScope: 'PNG byte equivalence is checked in the recorded native Canvas environment; other runtime environments may differ',
    assets: assets.map(asset => asset.record),
  };
  return {assets, provenance, provenanceBytes: Buffer.from(JSON.stringify(provenance, null, 2) + '\n')};
}

function atomicWrite(file, bytes) {
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, bytes, {flag: 'wx'});
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, {force: true});
  }
}

function main(arguments_) {
  assert.ok(arguments_.length === 0 || (arguments_.length === 1 && arguments_[0] === '--check'), 'Only --check is supported');
  const {assets, provenance, provenanceBytes} = renderAll();
  const files = assets.map((asset, index) => [path.join(__dirname, specifications[index].file), asset.bytes]);
  files.push([path.join(__dirname, 'provenance.json'), provenanceBytes]);
  if (arguments_[0] === '--check') {
    for (const [file, bytes] of files) assert.deepEqual(fs.readFileSync(file), bytes, `Rerender differs: ${path.basename(file)}`);
  } else {
    for (const [file, bytes] of files) atomicWrite(file, bytes);
  }
  console.log(JSON.stringify({status: arguments_[0] === '--check' ? 'reproduced' : 'rendered', assets: provenance.assets.map(asset => ({id: asset.id, dimensions: asset.dimensions, pngSha256: asset.pngSha256, suppressedCalls: asset.suppressedCalls}))}, null, 2));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = {renderArtwork, renderAll};

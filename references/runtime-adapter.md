# Runtime contract · v3

The default runner supports trusted Python/SVG and Canvas source. It does not execute a shot manifest directly, sandbox arbitrary source, install dependencies, call models or approve aesthetics. Use the scene's authored code and explicit fact/asset provenance.

## Dependencies and first check

Python 3.10+, Pillow, fontTools, librsvg/Cairo/GLib, Fontconfig, a legally available font, FFmpeg/ffprobe with libx264. Canvas additionally needs Node.js and `@napi-rs/canvas`. Dependencies and fonts are not bundled. Run in the chosen authorized environment:

```sh
python3 runtime/render_video.py doctor
python3 runtime/render_video.py frame --backend canvas --source runtime/examples/canvas_smoke.cjs --time 1 --width 640 --height 360 --out /tmp/heige-frame-new
```

Outputs must be new or empty directories. `VIDEO_RUNTIME_CACHE` can redirect the Fontconfig cache to a writable location. No universal Windows/macOS/browser support is implied by a Linux test.

## Source contracts

Python defines `render(t)` returning complete SVG, plus positive finite `DURATION` or `SECONDS`; optional `CUTS`/`cuts` supplies hard cuts. `FONT` is overridden in memory by `--font-family`. Resolve assets relative to `__file__`, not the working directory. Adjacent helper modules are not automatically added to the Python search path.

Canvas `.cjs`/`.mjs` exports:

```js
const {createCues, easeInOutCubic} = require('../../runtime/motion.cjs');
const cues = createCues({reveal: {start: 1, end: 3, ease: easeInOutCubic}});
module.exports = {
  DURATION: 6,
  CUTS: [4],
  TEXT_STRINGS: ['A visible consequence'],
  async ready({width, height, fontFamily}) {
    // Decode authorized assets and build immutable offscreen textures once.
  },
  stateAt(t) { return {reveal: cues.at('reveal', t).eased}; },
  render(ctx, t, {width, height, fontFamily, state}) {
    ctx.fillStyle = '#f5f1e8'; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#151515';
    ctx.fillRect(width * 0.1, height * 0.4, width * 0.8 * state.reveal, height * 0.2);
  }
};
```

The example illustrates the API, not a finished film. A real object must have designed content and a meaningful resulting state.

- `DURATION`, `duration`, then `SECONDS` are checked in that order; declared values must be positive finite numbers. If all are absent, the source is explicitly marked `legacy_default_30s`. Declare duration in new work
- `ready` can be a function or Promise; it is awaited once before metadata. `stateAt(t,options)` and `render` may be async; state is passed as `options.state` only when provided
- Render options include `width`, `height`, `fontFamily`, seeded `random()`, `sampleIndex`, `sampleCount`. Source time is absolute. Avoid wall clocks, `Math.random`, evolving simulation state and dependencies on frame order
- `TEXT_STRINGS`/`textStrings` must be an array of strings. Only declared codepoints are checked against the chosen font. Completeness, shaping, weight, clipping and actual glyph appearance still need pixel inspection
- `CUTS`/`cuts` are strictly increasing, unique, finite source times inside the authored duration. `--cuts` overrides them. Custom sources do not inherit unrelated preset cuts
- `--canvas-startup-timeout` defaults to 15 seconds; `--canvas-frame-timeout` defaults to 30 seconds per output frame. Readiness and rendering failures fail the run; they are not silently replaced with blank frames
- The target canvas resets between samples. Immutable authored offscreen caches may persist. Cached values must not make frame B depend on whether frame A was rendered

Python/JS imports are trusted code execution. SVG resource checks and font audits do not create a source-code sandbox.

## Shared motion helpers

`runtime/motion.cjs` is original package code with no animation clock:

- `createCues({id:[start,end]})`, or `{start,end,ease}`; `at(id,t)` returns progress, eased, elapsed, active, started and finished. Spans are `[start,end)`
- `clamp`, `lerp`, `linear`, `smoothstep`, `easeOutCubic`, `easeInOutCubic`
- `spring(elapsed,{from,to,frequencyHz,dampingRatio,velocity})`: analytic oscillator. Use only when the style calls for it; Swiss remains monotone
- `cameraMatrix`, `worldToScreen`, `applyCamera`: camera `x,y` is the world point at viewport center; `rotation` is radians, with `zoom`. Bracket world drawing with caller `save/restore`; screen UI stays outside
- `seededRandom(seed)` and `noiseAt(seed,key)`: pin local material noise to object/stroke IDs
- `trimPolyline(points,progress)`: arc-length geometry reveal, with optional interpolated pressure. It advances the stroke front rather than fading the full path

These are building blocks, not an automatic scene graph, physics engine, layout solver, material simulator or source-fact validator.

## Time, output and shutter

```sh
python3 runtime/render_video.py render --backend canvas --source runtime/examples/canvas_smoke.cjs --duration 2 --fps 24 --width 640 --height 360 --out /tmp/heige-smoke-new
```

`--duration` trims by default; it does not rewrite a story. `--start` is a source offset; `--fit-time` maps the remaining authored source interval to the requested output duration. Review pacing after retiming. Rational fps is supported. Durations round up to a whole frame; H.264 dimensions must be even. A changed viewport does not author a portrait layout.

Optional Canvas shutter sampling: `--shutter-samples 2` through `16`, with `--shutter-angle 0` through `360` (default 180). Default sample count 1 is off. Samples use a midpoint box shutter, source-time-correct mapping and linear-light sRGB averaging. They clamp inside the frame center's half-open hard-cut interval, avoiding cross-cut blur. This is global opaque sampling, not HDR, per-object or physical motion blur. Measure cost and inspect text before enabling it.

Custom sources output `video.mp4`; presets retain their preset names. `--label` only names display metadata. The runner outputs silent video; original optional sound synthesis is separate in [sound-sketch.md](sound-sketch.md).

## Decoded QA, not automatic acceptance

A render produces MP4, manifest, ffprobe/metrics, decoded overview/review frames and cut strips. Automatic cut strips sample −2/−1/0/+1/+2 frames. Their manifest records exact indices and pending review, not a visual pass.

For dense evidence from the actual encoded MP4:

```sh
python3 runtime/review_video.py --video /tmp/heige-smoke-new/video.mp4 --manifest /tmp/heige-smoke-new/manifest.json --actions 0.5:1.5 --out /tmp/heige-smoke-review-new
```

Use `--cuts 6,12` and `--actions 7.6:9.2,19:21` for the actual film. Actions are source-time `[start,end)` intervals, every encoded frame by default. `--action-stride N` explicitly subsamples. A manifest preserves source/output time mapping; without one the tool labels source time equal to output time as an assumption.

The tool emits five-slot cut sheets, paginated 16-frame action sheets, image/video hashes, exact rational source/output/PTS times and `review.json`. It rejects stale supplied manifests, VFR, invalid ranges and nonempty output folders. Missing edge neighbors are explicitly unavailable. Inspect every generated page needed for the decision; generated images alone establish no review.

Read [quality-gates.md](quality-gates.md) for phone crops, independent defect-first review, playback and listening. Test commands and current evidence are in [status.md](status.md).

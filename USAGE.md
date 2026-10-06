# HeiGe Video v2-RC

A portable source/instruction package for original code-rendered motion videos. It contains five director packs and five authored style examples, one shared renderer, source/data evidence and tests. The public release includes five original MP4 demos under `demos/`. It does not contain third-party reference art, fonts or system dependencies. Installation and rendering remain local to the environment you choose.

## Start

Have the coding agent read `SKILL.md`, then follow only the selected style and its capabilities. A bare text-model API also needs a harness that can read/write files, execute code and return actual frames; a text-only model needs a separate visual reviewer. See `references/model-harness.md` for an offline messages exporter. No model SDK, account or API key is needed to render the supplied code.

From this folder:

```sh
python3 runtime/render_video.py doctor
python3 runtime/render_video.py frame --style tech --time 21.8 --width 1280 --height 720 --out /tmp/tech-preview-new
```

Every output directory must be new or empty. Doctor verifies actual local dependencies. This package does not install missing software or contact a provider.

## Five source examples

Preview first, especially for the filter-heavy ink example. These are full renders at the authored duration:

```sh
python3 runtime/render_video.py render --style tech --duration 30 --fps 24 --width 1280 --height 720 --out /tmp/tech-film-new
python3 runtime/render_video.py render --style whiteboard --duration 30 --fps 24 --width 1280 --height 720 --out /tmp/whiteboard-film-new
python3 runtime/render_video.py render --style ink --font-family 'Noto Serif CJK SC' --duration 30 --fps 24 --width 1280 --height 720 --out /tmp/ink-film-new
python3 runtime/render_video.py render --source examples/dark-keynote/film.py --label dark-keynote --duration 30 --fps 24 --width 1280 --height 720 --cuts 6.125,6.375,8,23,26.5 --out /tmp/keynote-film-new
python3 runtime/render_video.py render --source examples/dataviz/film.py --label dataviz --duration 20 --fps 24 --width 1280 --height 720 --cuts 1,1.8,4,6,9,11.7,12.5,15.5,16.2 --out /tmp/dataviz-film-new
```

Custom scenes write `video.mp4`; built-in presets write their preset name. A label changes display metadata, not source selection. The runner outputs silent video. Optional original procedural sound sketches and mux instructions are in `references/sound-sketch.md`; they need NumPy and are not narrated or perceptually reviewed soundtracks.

The open manifest supports arbitrary draw code. The runner does not consume it automatically: verify the explicit manifest-to-code mapping. `--duration` trims; it does not rewrite a 30-second story. `--fit-time` requires pacing review, and the current Canvas adapter assumes a 30-second source timeline. Changing output dimensions alone does not author a new portrait composition.

## Validate and review

```sh
python3 -m unittest discover -s runtime/tests -v
python3 -m unittest discover -s scripts -p 'test_*.py' -v
python3 scripts/validate_package.py
python3 scripts/validate_package.py --manifest examples/dataviz/shot-manifest.json
python3 examples/dataviz/check_example.py
```

Tests establish bounded technical properties, not aesthetic quality. Read `references/example-status.json` for per-source review scope and `references/quality-gates.md` for actual-image, dense-transition and playback requirements. The supplied reviews are sampled-image/targeted checks, not real-time playback or listening approval. The dataviz sample's supporting text needs revision for a 390-pixel-wide embed.

Research covers 58 distinct audited works as reported by the supplied study. This is not 58 reusable assets or a controlled model comparison. No low-cost-model benchmark, universal-agent support or Opus parity is claimed. Source/provenance and license boundaries are in `references/source-notices.md` and `references/sources.md`.

# HeiGe-Video v4.0.0-alpha.2 · install and use

Updated 2026-10-12. The default controlled-production route uses Remotion. It supports a native continuous world for persistent objects and camera handoffs, as well as eight ordinary scene types. Follow the [Studio installation guide](studio/README.md), [versioned project contract](studio/CONTRACT.md) and [continuity guide](studio/CONTINUITY.md). Authored Canvas/SVG remains available for existing films and bespoke actions.

This is a portable Skill folder, original scene code and a deterministic renderer. It does not need a model SDK or API key to render existing source. A coding agent needs file access, authorized code execution and actual-image review to create and judge new films.

## Get the complete repository

```sh
git clone https://github.com/HeiGeAi/HeiGe-Video.git
cd HeiGe-Video
```

For an existing checkout, commit or back up local changes before updating with `git pull --ff-only`. Keep custom films outside the shipped example paths.

## Start a native continuous project

Install local FFmpeg, the Noto Sans CJK SC font and a compatible Chromium browser using the Studio guide. The runner checks the actual environment; missing dependencies are errors rather than an excuse to produce an unverified export.

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r studio/requirements.txt
npx remotion browser ensure
node studio/make.mjs doctor
node studio/make.mjs init /tmp/heige-continuous-new.json --ratio 16:9
node studio/make.mjs validate /tmp/heige-continuous-new.json
node studio/make.mjs build /tmp/heige-continuous-new.json --out /tmp/heige-continuous-new
node studio/make.mjs verify /tmp/heige-continuous-new.json --out /tmp/heige-continuous-new
```

`init <new-project.json>` defaults to `16:9` and also accepts `--ratio 9:16` or `--ratio 1:1`. It copies an original self-contained template without assets and refuses to overwrite an existing JSON file. The ratio flag is only for `init`; independently compose a new layout when changing an authored project's ratio. Templates: [landscape](examples/studio/continuous-launch.json), [portrait](examples/studio/continuous-portrait.json), [square](examples/studio/continuous-square.json).

All four commands use `studio/make.mjs`. `validate` checks the contract; an audio project without a measured duration retains a warning until `build` probes its real recording and recompiles. `build` requires a fresh output directory, validates local assets and font coverage, renders, measures the actual browser and encoded media, then records hashes. `verify` checks the same input, engine, dependencies, font, browser and artifacts against that build. It does not rerender or perform an aesthetic review. A rejected build retains its failure record; retry into a new directory after fixing the cause.

With source material, supply the same brief to every applicable command:

```sh
node studio/make.mjs validate my-film/project.json --brief my-film/brief.md
node studio/make.mjs build my-film/project.json --brief my-film/brief.md --out /tmp/heige-brief-film-new
node studio/make.mjs verify my-film/project.json --brief my-film/brief.md --out /tmp/heige-brief-film-new
```

Rendering is local and does not require a model API key. A coding agent reads the Skill and authors the project JSON. No native online LLM, TTS, ASR, paid generation or B-roll supply/cache is integrated.

## Author continuity rather than a sequence of cards

The creative modes are `promo`, `explainer`, `lesson` and `talk`; themes are `ledger` and `nocturne`. The `continuity` object defines persistent `objects`, a global `camera`, adjacent `boundaries`, optional `soundEvents` and optional `blur`. Every timeline entry is a `beat`; mixing ordinary scene components into the same continuous world is rejected.

- Give each object a unique stable `id` and nonempty `semanticIdentity`. Full keyframes specify its complete geometry from zero to the final quantized frame duration. Keyframe time strictly increases; duplicate-time states and non-finite coordinates fail validation.
- Describe each adjacent beat handoff exactly once, in timeline order. Its carrier must be an existing persistent object; cause and outcome must be explicit. Camera movement and geometric continuity do not establish narrative meaning or prove real product behavior.
- Numeric visible text and UI rows require the same object's own valid `claims`. A claim's literal quote belongs to its referenced fact and, when supplied, the brief. Claims from another object or beat cannot be borrowed. Mark teaching quantities with `demoData: true`.
- Bind original `tick`, `whoosh` or `impact` events to an object and the same film clock. These are synthesized event sounds, not speech synthesis or automatic composition. Final voice recordings still determine duration; original SRT cue times remain intact.
- Use `blur: {"samples": 3, "shutterAngle": 180}` for three actual temporal captures and linear-light averaging before encoding. Use one sample to disable blur. This is global temporal integration, not CSS blur, HDR or a per-object velocity buffer; it increases capture and compositing work.

The current bounded contract allows up to 60 seconds and 2 to 20 beats, each 0.25 to 20 seconds after frame quantization. See the continuity guide for field types, object/UI support and exact limits rather than adding guessed semantic fields.

Inspect the actual encoded overview, action strips, opening and final frames. Continuous builds also produce per-frame DOM observations, approximate paint visibility, boundary measurements and final-video-bound pixel-change checks. Read their recorded scope: point-grid visibility can miss sub-grid occlusion, and pixel differences do not understand images. Cause/outcome and perceptual identity still require independent visual review. Technical `validated`, draft/mock `preview`, sampled review, full playback and actual listening remain separate states. Hashes establish integrity, not trust.

Continuous films: [landscape MP4](demos/continuous/horizontal.mp4), [portrait MP4](demos/continuous/portrait.mp4) and [square MP4](demos/continuous/square.mp4). Their [gallery](demos/continuous/README.md) states actual encoded-image, playback and listening scope. The [current inventory](references/v4-continuity-status.json) binds inputs, engine and video hashes to declared checks. Do not inherit old acceptance when changing the engine, font, input, assets or composition.

```sh
python3 scripts/validate_continuous_release.py
```

This portable check verifies the current engine, input/media hashes and declared release fields. It does not rerender, decode, play, listen or certify aesthetics. Read the recorded scope of each underlying check rather than treating a matching hash as a trust certificate.

## Verify historical v4 alpha 1 examples

The five [historical examples](demos/super/README.md) preserve their bytes, inputs and original review scope. Their [inventory](references/v4-example-status.json) names source commit `29135480806d061f1af65734b17dcecad3a31f4a`. The validator recomputes the engine fingerprint from production blobs in that fixed Git commit, then checks the declared historical input and MP4 hashes. It does not substitute the current engine or recertify alpha 2.

```sh
python3 scripts/validate_super_release.py
```

Use a checkout with the referenced Git commit available. Missing history is a failure, not a skipped hash check. Mock/draft historical fixtures retain preview status; their audio measurements do not establish listening or real spoken-narration quality.

## Install dependencies (Ubuntu 24.04)

The CI configuration uses Python 3.12 and Node.js 24. With Python, Node and npm available:

```sh
sudo apt-get update
sudo apt-get install -y --no-install-recommends python3-venv ffmpeg fontconfig fonts-noto-cjk fonts-noto-core fonts-dejavu-core librsvg2-2 libcairo2 libglib2.0-0t64
python3 -m venv .venv
. .venv/bin/activate
python -m pip install Pillow==12.3.0 fonttools==4.61.1
npm ci
python runtime/render_video.py doctor
```

These are Linux/Ubuntu commands, not a verified macOS/Windows installation procedure. Do not commit installed dependencies. The renderer executes trusted scene code; review unfamiliar Python/JavaScript before running it.

For the optional Swiss and SPECTRA score-synthesis scripts, also install the tested NumPy version in that virtual environment:

```sh
python -m pip install numpy==2.3.5
```

## Install the whole folder

Copy the cloned `HeiGe-Video` folder into your agent's supported skills directory using the destination name `heige-video`, preserving `SKILL.md`, `references`, `scripts`, `runtime` and `examples`. For Codex, the usual user skill location is `${CODEX_HOME:-$HOME/.codex}/skills/heige-video`. Avoid overwriting an edited installation without a backup. Reload skills using your host's normal discovery flow. A host without Skill discovery can read `SKILL.md` from the project directly.

Ask the agent:

> Use heige-video to make an original 20-second Chinese explanation of [topic] in [ratio]. Design a meaningful visual change and the ending first. Show a short motion proof before building the full film. Use the available environment and inspect the rendered pixels. Report any unverified facts, playback or sound.

Preserve any real user brief instead of substituting this example. For a text-model-only workflow, read [model-harness.md](references/model-harness.md). No paid provider calls or dependency installation are hidden in these scripts.

## Verify the environment

Run from this folder:

```sh
python3 runtime/render_video.py doctor
python3 scripts/validate_package.py
python3 scripts/select_references.py --style swiss-tech --query 'poster identity reflow' --limit 4
```

`doctor` checks the actual environment. Canvas requires Node.js and `@napi-rs/canvas`; the shared stack uses Python, font/raster libraries and FFmpeg. Obtain missing dependencies and fonts under their own licenses in the environment you chose. Details: [runtime contract](references/runtime-adapter.md).

## Render an authored Canvas film

Use an explicit source path for v3 work. New sources declare their own `DURATION`, `TEXT_STRINGS` and `CUTS` and may use `ready` and `stateAt`.

```sh
python3 runtime/render_video.py frame --backend canvas --source examples/swiss-editorial/film.cjs --time 28 --width 1280 --height 720 --out /tmp/heige-proof-frame-new
python3 runtime/render_video.py render --backend canvas --source examples/swiss-editorial/film.cjs --duration 30 --fps 24 --width 1280 --height 720 --out /tmp/heige-film-new
```

These commands use the integrated [Swiss/editorial R5](examples/swiss-editorial/README.md) source. Use 1920×1080 for the reviewed resolution; the 1280×720 commands above are convenient previews. Its README includes original score synthesis and muxing. For another film, replace source, duration, time and dimensions. Choose the intended font explicitly when it differs from `Noto Sans CJK SC`. Every output folder must be new or empty. The runtime's `canvas_smoke.cjs` is an executable mechanism fixture, not a finished style example.

`--duration` trims, while `--fit-time` retimes the remaining source interval. Neither redesigns a story. A new aspect ratio requires a new layout. Canvas shutter sampling is optional and increases render cost; use it only after the unsampled action works.

## Review the actual MP4

```sh
python3 runtime/review_video.py --video /tmp/heige-film-new/video.mp4 --manifest /tmp/heige-film-new/manifest.json --actions 18:23 --out /tmp/heige-review-new
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s runtime/tests -v
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

Choose the real source-time action interval and optionally `--cuts 6,12`. Dense strips decode the encoded output; open the generated pages and repair visible defects. Per-sample status starts `pending`. A successful extraction is not a review or an aesthetic pass. Playback and listening are separate checks.

## Examples and legacy compatibility

Integrated v3 examples: [Night Signal / 夜航](examples/swiss-editorial/README.md) · [SPECTRA](examples/cinematic-product/README.md) · [归岸 / Homeward](examples/ink-narrative/README.md) · [38 微秒：GPS 为什么需要相对论](examples/whiteboard-navigation/README.md) · [拆开平均数 / Unpacking an Average](examples/dataviz-forward/README.md). Each guide records exact source/media hashes, duration, font, render, audio and QA scope. Dataviz requires its explicit source trim; do not substitute a default 26-second render.

The `--style tech`, `--style whiteboard` and `--style ink` presets remain the older v2 SVG examples. The five legacy files under [demos](demos/README.md) are regression/comparison material; the separately named v3 files are the new renders. Legacy acceptance does not establish v3 quality.

For the preserved v2 fixtures only:

```sh
python3 runtime/render_video.py frame --style tech --time 21.8 --width 1280 --height 720 --out /tmp/heige-v2-regression-new
```

## Research and limits

[100 works](references/research-cases.md) and [100 projects](references/research-projects.md) are source-linked mechanism studies, not assets or dependencies. The selector defaults to excluding 17 controls. Use `--controls only` intentionally when studying failure cases. Corpus count validation does not establish visual quality, source truth or model superiority.

Remotion + FFmpeg is the default controlled-production route; authored Canvas/SVG + FFmpeg remains supported. The legacy browser adapter is separate and experimental; a Blender CPU probe is not a complete default film pipeline. No model-cost or Opus-parity result is claimed. The [OneTake study](references/onetake-architecture.md) is fixed to a noncommercial upstream commit, with methods reimplemented originally and no source/assets imported. [License and provenance](references/source-notices.md).

# HeiGe-Video v4.0.0-alpha.3 · install and use

Updated 2026-10-15. The default controlled-production route uses Remotion. Default initialization creates a 15-second Forge world with original local images, fast easing and a complete 128 BPM score. Native persistent objects and camera handoffs coexist with eight preserved ordinary scene types. Follow the [Studio installation guide](studio/README.md), [versioned project contract](studio/CONTRACT.md) and [continuity guide](studio/CONTINUITY.md). Authored Canvas/SVG remains available for existing films and bespoke actions.

This is a portable Skill folder, original scene code and a deterministic renderer. It does not need a model SDK or API key to render existing source. A coding agent needs file access, authorized code execution and actual-image review to create and judge new films.

## Get the complete repository

```sh
git clone https://github.com/HeiGeAi/HeiGe-Video.git
cd HeiGe-Video
```

For an existing checkout, commit or back up local changes before updating with `git pull --ff-only`. Keep custom films outside the shipped example paths.

## WorkBuddy and other agent hosts

Use the [host entry](references/workbuddy-compatibility.md) instead of assuming the agent's Python, working directory and browser cache match your terminal. Run `node scripts/host.mjs doctor` from the repository, or give that script's absolute path from another directory. It selects project-local dependencies and passes a private runtime environment to subprocesses. It does not install anything implicitly or modify WorkBuddy's managed Node/Python environments.

For WorkBuddy, install a small project-local Skill adapter into an existing workspace:

```sh
node scripts/install_workbuddy.mjs --workspace /absolute/path/to/workspace
```

The GUI adapter lives at `<workspace>/.workbuddy/skills/heige-video`. It retains a local pointer to the complete repository. It does not copy dependencies or media into WorkBuddy and refuses to replace unknown or edited skills. Reinstall the adapter if the repository moves. Open that workspace in WorkBuddy and check its Skill list. The installer preserves existing application settings and other skills. The bundled CLI has a separate `.codebuddy/skills` project provider; that location does not substitute for the GUI's default `.workbuddy/skills` directory.

WorkBuddy's root-level project file discovery is different from Codex's user Skill directory. Merely cloning this repository or updating a Codex Skill does not install it in WorkBuddy. See the compatibility guide for actual tested versions and the distinction between CLI shell jobs, GUI Skill discovery and human approval interactions.

In WorkBuddy 5.8.2, restricted workspaces disable Bash and project settings. If command tools are missing, check the current workspace's trust state in the product UI. Obtain explicit user agreement to trust that directory before changing it through the UI, then start a new task in the same directory or have the user restart the product. The old task's updated badge does not restore its runtime tools. Follow the compatibility guide's read-only command probe before production; do not edit security configuration or copy login credentials.

## Turn source material into a story

The [story workflow](references/story-workflow.md) accepts local UTF-8 text, Markdown, HTML, DOCX and PDFs with readable text. It preserves source hashes and paragraph/page references. PDF extraction needs either `pypdf` in the selected Python environment or Poppler's `pdftotext` and `pdfinfo`. Scanned, encrypted or partly unreadable PDFs stop for OCR or a readable source; extraction never fabricates missing pages. Unsupported formats should be exported to a supported local format first.

```sh
node scripts/host.mjs story ingest ./article.md ./report.pdf --project ./my-story
node scripts/host.mjs story template --project ./my-story
node scripts/host.mjs story check --project ./my-story
```

The coding agent writes the story script and asset plan from the extracted material, then presents both to the user. Before asset production or rendering, obtain real user confirmation of **the script** and **reuse, remake or mixed assets**. A template is not an approved script, and the agent must not approve its own work. Script/source/plan changes invalidate the earlier confirmation. The CLI records a host-declared reply; it cannot authenticate a human identity or judge narrative quality.

After approval, check the asset-production gate, create the agreed assets, record their technical receipt and check the rendering gate. For story projects, include the story directory when building, including when the animation project is stored elsewhere:

```sh
node scripts/host.mjs build ./my-story/animation/project.json --story ./my-story --out ./my-story-render-v1
```

The host also detects a surrounding `intake.json` and checks its current approval before building. The detailed confirmation arguments and plan schema are in the story workflow guide. No LLM, OCR, TTS or paid asset generation is automatically invoked by these commands.

## Start a Forge project

Install local FFmpeg, the Noto Sans CJK SC font and a compatible Chromium browser using the Studio guide. The runner checks the actual environment; missing dependencies are errors rather than an excuse to produce an unverified export.

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r studio/requirements.txt
npx remotion browser ensure
node scripts/host.mjs doctor
node scripts/host.mjs init /tmp/heige-forge-new.json --ratio 16:9
node scripts/host.mjs validate /tmp/heige-forge-new.json
node scripts/host.mjs build /tmp/heige-forge-new.json --out /tmp/heige-forge-new
node scripts/host.mjs verify /tmp/heige-forge-new.json --out /tmp/heige-forge-new
```

`init <new-project.json>` defaults to `16:9` and also accepts `--ratio 9:16` or `--ratio 1:1`. It creates an original 15-second template and copies three original PNG assets into a sibling `<project-stem>-assets` directory. For `my-film/project.json`, that directory is `my-film/project-assets`. It refuses an existing JSON or asset directory, including a symlink. Keep both when moving the project. The ratio flag is only for `init`; independently compose a new layout when changing an authored project's ratio. Templates: [landscape](examples/studio/forge-launch.json), [portrait](examples/studio/forge-portrait.json), [square](examples/studio/forge-square.json).

All four commands use the Studio engine through `scripts/host.mjs`. Direct `studio/make.mjs` remains available for callers providing their own environment. `validate` checks the contract; an audio project without a measured duration retains a warning until `build` probes its real recording and recompiles. `build` requires a fresh output directory, validates local assets and font coverage, renders, measures the actual browser and encoded media, then records hashes. `verify` checks the same input, engine, dependencies, font, browser and artifacts against that build. It does not rerender or perform an aesthetic review. A rejected build retains its failure record; retry into a new directory after fixing the cause.

With source material, supply the same brief to every applicable command:

```sh
node scripts/host.mjs validate my-film/project.json --brief my-film/brief.md
node scripts/host.mjs build my-film/project.json --brief my-film/brief.md --out /tmp/heige-brief-film-new
node scripts/host.mjs verify my-film/project.json --brief my-film/brief.md --out /tmp/heige-brief-film-new
```

Rendering is local and does not require a model API key. A coding agent reads the Skill and authors the project JSON. No native online LLM, TTS, ASR, paid generation or B-roll supply/cache is integrated.

## Author continuity rather than a sequence of cards

The creative modes are `promo`, `explainer`, `lesson` and `talk`; themes are `forge`, `ledger` and `nocturne`. The `continuity` object defines persistent `objects`, a global `camera`, adjacent `boundaries`, optional `soundEvents`, `blur` and `musicScore`. Every timeline entry is a `beat`; mixing ordinary scene components into the same continuous world is rejected.

- Give each object a unique stable `id` and nonempty `semanticIdentity`. Full keyframes specify its complete geometry from zero to the final quantized frame duration. Keyframe time strictly increases; duplicate-time states and non-finite coordinates fail validation.
- Describe each adjacent beat handoff exactly once, in timeline order. Its carrier must be an existing persistent object; cause and outcome must be explicit. Camera movement and geometric continuity do not establish narrative meaning or prove real product behavior.
- Numeric visible text and UI rows require the same object's own valid `claims`. A claim's literal quote belongs to its referenced fact and, when supplied, the brief. Claims from another object or beat cannot be borrowed. Mark teaching quantities with `demoData: true`.
- Bind original `tick`, `whoosh` or `impact` events to an object and the same film clock. They are event effects, separate from the complete musical score. Final voice recordings still determine duration; original SRT cue times remain intact.
- Native `image` objects use `assetId` referencing a registered local `kind: image` asset. Other kinds reject `assetId`. PNG/JPEG/WebP are supported; URL paths, traversal, symlinks, SVG and GIF are rejected. Image pixels are not automatically fact-checked.
- Optional fixed `easing` controls the outgoing keyframe segment: `linear`, `ease-out-cubic`, `ease-in-out-cubic`, `ease-out-expo`, `back-out`. Controlled `typography` and `appearance` configure text, fills, strokes, hard shadows and patterns. `typography.lineHeight` is a finite multiplier from 1.15 to 1.7, defaulting to 1.55. Unknown fields, tokens and invalid ranges fail validation.
- Use `blur: {"samples": 3, "shutterAngle": 180}` for three actual temporal captures and linear-light averaging before encoding. Use one sample to disable blur. This is global temporal integration, not CSS blur, HDR or a per-object velocity buffer; it increases capture and compositing work.

The current bounded contract allows up to 60 seconds and 2 to 20 beats, each 0.25 to 20 seconds after frame quantization. See the continuity guide for field types, object/UI support and exact limits rather than adding guessed semantic fields.

Inspect the actual encoded overview, action strips, opening and final frames. Continuous builds also produce per-frame DOM observations, approximate paint visibility, boundary measurements and final-video-bound pixel-change checks. Read their recorded scope: point-grid visibility can miss sub-grid occlusion, and pixel differences do not understand images. Cause/outcome and perceptual identity still require independent visual review. Technical `validated`, draft/mock `preview`, sampled review, full playback and actual listening remain separate states. Hashes establish integrity, not trust.

## Complete music and cue alignment

The default score configuration is:

```json
{"musicScore": {"style": "forge-breakbeat", "bpm": 128, "volume": 0.8}}
```

Place it inside `continuity`. This original eight-bar, 4/4 score requires exactly 15 seconds at 24 or 30 fps and cannot coexist with external `project.music`. It synthesizes drums, syncopated bass, chord stabs, lead hook and lift into a real stereo WAV. Other durations can use registered local music. It does not retime narration or invent a variable-duration arrangement.

| Section | Music-clock time | Purpose |
| :--- | :--- | :--- |
| Strike | 0 to 1.875 s | First-beat entrance |
| Drive | 1.875 to 5.625 s | Assembly and syncopation |
| Charge | 5.625 to 7.5 s | Build into the main action |
| Forge | 7.5 to 13.125 s | Full groove and format rearrangement |
| Seal | 13.125 to 15 s | Brand press and decay; final hit at 14.0625 s |

Video cues round to the nearest frame, within half a frame of the musical clock. Not every beat is an integer video frame. Score volume is applied once in its WAV. Only narration sidechains the music; event effects join at fixed gain before final limiting. Builds emit `music.wav` and `music-score.json` with actual PCM measurements, cues, events and hashes. Measurements are not listening approval. See the [original score note](references/music-score.md).

Forge films: [landscape](demos/forge/horizontal.mp4), [portrait](demos/forge/portrait.mp4), [square](demos/forge/square.mp4). Use the [Forge inventory](references/v4-forge-status.json) and [delivery record](references/v4-forge-report.md) for actual input/engine/MP4 bindings and recorded acceptance scope. Do not inherit earlier acceptance after changing the engine, font, input, assets or composition.

## Historical alpha.2 continuous films

The [continuous gallery](demos/continuous/README.md), [alpha.2 inventory](references/v4-continuity-status.json) and [historical report](references/v4-continuity-report.md) retain the earlier three films. The user rejected their pacing and aesthetics and identified the lack of a complete BGM. Historical `sampled-pass` states only that recorded review scope; it is neither user approval nor a Forge acceptance record. Hash checks inspect declared evidence and integrity, not a new render, playback, listening or artistic judgment.

## Verify historical v4 alpha 1 examples

The five [historical examples](demos/super/README.md) preserve their bytes, inputs and original review scope. Their [inventory](references/v4-example-status.json) names source commit `29135480806d061f1af65734b17dcecad3a31f4a`. The validator recomputes the engine fingerprint from production blobs in that fixed Git commit, then checks the declared historical input and MP4 hashes. It does not substitute the current engine or recertify alpha.3.

```sh
python3 scripts/validate_super_release.py
```

Use a checkout with the referenced Git commit available. Missing history is a failure, not a skipped hash check. Mock/draft historical fixtures retain preview status; their audio measurements do not establish listening or real spoken-narration quality.

## Install dependencies (Ubuntu 24.04)

The CI matrix runs Node.js 22 and 24 with Python 3.12 on Ubuntu 24.04. With Python, Node and npm available:

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

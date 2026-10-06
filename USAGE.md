# HeiGe-Video v3.0.0-rc.1 · install and use

This is a portable Skill folder, original scene code and a deterministic renderer. It does not need a model SDK or API key to render existing source. A coding agent needs file access, authorized code execution and actual-image review to create and judge new films.

## Get the complete repository

```sh
git clone https://github.com/HeiGeAi/HeiGe-Video.git
cd HeiGe-Video
```

For an existing checkout, commit or back up local changes before updating with `git pull --ff-only`. Keep custom films outside the shipped example paths.

## Install dependencies (Ubuntu 24.04)

The CI configuration uses Python 3.12 and Node.js 24. With Python, Node and npm available:

```sh
sudo apt-get update
sudo apt-get install -y --no-install-recommends python3-venv ffmpeg fontconfig fonts-noto-cjk fonts-noto-core fonts-dejavu-core librsvg2-2 libcairo2 libglib2.0-0t64
python3 -m venv .venv
. .venv/bin/activate
python -m pip install Pillow==12.3.0 fonttools==4.61.1
npm install --no-save --package-lock=false @napi-rs/canvas@0.1.100
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

The current route is Canvas/SVG + FFmpeg. The browser adapter is experimental and has no verified output in this environment; a Blender CPU probe is not a complete default film pipeline. No model-cost or Opus-parity result is claimed. [License and provenance](references/source-notices.md).

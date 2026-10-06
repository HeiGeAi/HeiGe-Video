# HeiGe-Video

<div align="center">

![Skill](https://img.shields.io/badge/skill-v2--RC-7c3aed.svg)
![Styles](https://img.shields.io/badge/styles-5-0e7490.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Multi-style, code-driven video creation**

Turn an idea into a video with clear subjects, deliberate motion, and a memorable story.

[Demos](#five-styles-five-demos) · [Quick start](#quick-start) · [Render the examples](#render-the-examples) · [Verification and limits](#verification-and-limits) · [中文](README.md)

</div>

HeiGe-Video gives a coding agent a practical video-making workflow: define the subject and shots, choose a visual language, write runnable animation code, and review the actual frames. It is intended for explainers, product concepts, kinetic typography, and data stories.

**Five director packs, five original source examples, one shared renderer.** Reproduce the supplied demos or load the Skill into an agent to develop a new film around your own brief.

The current version is **v2-RC**. All five examples have continuous-render evidence and bounded actual-frame reviews. Full real-time playback, listening, and cross-platform verification remain outstanding.

## Five styles, five demos

Play the videos below, or open the original MP4 if the player does not load. All demos are **1280 × 720 at 24 fps**. Dataviz runs for 20 seconds; the other four run for 30 seconds. See [demos](demos/README.md) for file details and checksums.

### Swiss-tech

Precise rearrangement of persistent text and modules, grounded in two concrete notes. For knowledge explanations and kinetic typography

https://github.com/user-attachments/assets/cd671b63-9576-40da-9edd-6a41d4c7cd38

[Download MP4 / view original](demos/swiss-tech.mp4)

### Whiteboard

A causal explanation drawn on one persistent board. The optical geometry is schematic

https://github.com/user-attachments/assets/f69737c3-d811-4351-8a3f-39d561d923c4

[Download MP4 / view original](demos/whiteboard.mp4)

### Ink

A seed journey told through brush-like forms, density, negative space, and pauses. Growth uses poetic time compression

https://github.com/user-attachments/assets/d26c0a77-4d46-4dfb-a062-64638b5432d2

[Download MP4 / view original](demos/ink.mp4)

### Dark-keynote

“一束” moves from a readable creative brief into an optical scene and the completed work. A concept demonstration

https://github.com/user-attachments/assets/bf8510a6-bbab-43be-befb-e1028831a036

[Download MP4 / view original](demos/dark-keynote.mp4)

### Dataviz

Five synthetic orders retain their identities while one extreme value changes, making the mean/median comparison visible

https://github.com/user-attachments/assets/c64d2254-4565-4f74-8f59-2af1b1497122

[Download MP4 / view original](demos/dataviz.mp4)


Audio: the four 30-second demos include original procedural sound sketches; dataviz is silent. The sound sketches have numerical checks but have not received listening approval. The shared video runner itself produces silent output.

## What it provides

- **Distinct visual languages:** separate composition, motion, and sound rules for each of the five styles
- **Traceable subjects:** object IDs, before/after states, camera reasons, and visible consequences across shots
- **Early visual checks:** key frames and the riskiest 2–4 seconds of motion before a full render
- **Editable source:** Python scenes expose `render(t)` returning SVG; an optional Canvas backend is also available
- **Inspectable delivery:** MP4, source, encoding metadata, decoded frames, shot manifests, factual sources, and verification records

Read the packs: [Swiss-tech](references/styles/swiss-tech.md), [Whiteboard](references/styles/whiteboard.md), [Ink](references/styles/ink.md), [Dark-keynote](references/styles/dark-keynote.md), and [Dataviz](references/styles/dataviz.md).

## Quick start

### 1. Give the Skill to your agent

Clone the complete repository and ask an agent with file access, code execution, and actual image-review capabilities to read `SKILL.md`.

```bash
git clone https://github.com/HeiGeAi/HeiGe-Video.git heige-video
cd heige-video
```

Example request:

```text
Read SKILL.md and USAGE.md in this directory. Check the execution environment first.
Use HeiGe-Video to make a 30-second Chinese whiteboard explainer, in 16:9,
showing why a prism separates white light into colors.
Start with key frames and the most important three seconds of motion.
Review them before completing the film.
```

<details>
<summary>Install as a personal Claude Code Skill</summary>

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/HeiGeAi/HeiGe-Video.git ~/.claude/skills/heige-video
```

Invoke `/heige-video` in Claude Code or describe the video you need. See the [official Claude Code Skills documentation](https://code.claude.com/docs/en/skills) for discovery and invocation. Rendering dependencies still need to be available in the actual execution environment.

</details>

Codex and other coding agents can load the complete folder explicitly. See [models and execution harnesses](references/model-harness.md) for the required capabilities. A text-only API also needs an execution harness and an independent visual reviewer.

### 2. Prepare the rendering environment

The five supplied examples use the SVG backend. **Rendering existing source requires no model SDK, API key, or model call.** Creating new work through an agent still uses that agent's selected model and service.

| Component | Requirement |
|---|---|
| Python | Python 3.10+, Pillow, fontTools |
| Native graphics | librsvg with `rsvg_handle_render_document`, Cairo, GLib/GObject, Fontconfig |
| Encoding | FFmpeg and ffprobe; FFmpeg must include `libx264` |
| Chinese fonts | Noto Sans CJK SC; Noto Serif CJK SC for the ink example, or a legally available font covering the required glyphs |
| Optional Canvas | Node.js and `@napi-rs/canvas` |
| Optional sound sketches | NumPy |

Install the Python dependencies in a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install Pillow fonttools
python runtime/render_video.py doctor
```

These commands use a POSIX shell. Native libraries, fonts, and FFmpeg must be prepared separately for your operating system. `doctor` checks the environment and does not install software. Resolve missing requirements before rendering.

Current evidence comes from the tested cloud Linux environment. Other platforms need their own verification. See the [runtime adapter](references/runtime-adapter.md) for tested versions and interfaces.

### 3. Render a frame, then a film

Run from the repository root:

```bash
# Preview one actual moment in the Swiss-tech example
python runtime/render_video.py frame \
  --style tech --time 21.8 --width 1280 --height 720 \
  --out /tmp/heige-video-tech-frame

# Render the complete 30-second example
python runtime/render_video.py render \
  --style tech --duration 30 --fps 24 --width 1280 --height 720 \
  --out /tmp/heige-video-tech-film
```

**Every output directory must be new or empty.** Choose a different directory when running again. Replace `/tmp/...` with another writable location if needed.

## Render the examples

From the repository root, with the required dependencies available:

```bash
# Swiss-tech, 30 seconds. The CLI preset is named tech
python runtime/render_video.py render --style tech \
  --duration 30 --fps 24 --width 1280 --height 720 \
  --out /tmp/heige-video-swiss-tech

# Whiteboard, 30 seconds
python runtime/render_video.py render --style whiteboard \
  --duration 30 --fps 24 --width 1280 --height 720 \
  --out /tmp/heige-video-whiteboard

# Ink, 30 seconds. Test individual frames before this filter-heavy render
python runtime/render_video.py render --style ink \
  --font-family 'Noto Serif CJK SC' \
  --duration 30 --fps 24 --width 1280 --height 720 \
  --out /tmp/heige-video-ink

# Dark-keynote, 30 seconds
python runtime/render_video.py render \
  --source examples/dark-keynote/film.py --label dark-keynote \
  --duration 30 --fps 24 --width 1280 --height 720 \
  --cuts 6.125,6.375,8,23,26.5 --out /tmp/heige-video-dark-keynote

# Dataviz, 20 seconds
python runtime/render_video.py render \
  --source examples/dataviz/film.py --label dataviz \
  --duration 20 --fps 24 --width 1280 --height 720 \
  --cuts 1,1.8,4,6,9,11.7,12.5,15.5,16.2 --out /tmp/heige-video-dataviz
```

Preset filenames are `tech.mp4`, `whiteboard.mp4`, and `ink.mp4`. Custom scenes loaded through `--source` produce `video.mp4`. Each render also produces encoding information, frame metrics, contact sheets, and decoded review frames.

Sound synthesis and muxing are separate steps; see [sound sketches](references/sound-sketch.md). Full usage details are in [USAGE.md](USAGE.md).

## Make your own video

Provide the subject, audience, duration, aspect ratio, and factual material. For example:

```text
Use HeiGe-Video to create a 20-second data explainer for a first-time statistics learner.
Use my supplied data to compare mean and median.
Keep the data objects traceable as the views change.
Check the data and key frames, build a short transition preview,
then deliver the MP4, source, and verification record.
```

```text
Use HeiGe-Video to make a 30-second ink film about a seed travelling on the wind,
landing, and sprouting. Use 16:9, sparse Chinese text, pauses, and negative space.
Label rapid growth as poetic time compression.
Start with a continuous preview of the landing and sprouting sequence.
```

Workflow: **define the audience's takeaway → choose a style → write the shot manifest → review real previews → render → evaluate technical and visual quality separately**.

A custom Python scene supplies `DURATION` (or `SECONDS`) and `render(t)` returning complete SVG. Avoid wall-clock dependence and mutable cross-frame state. The shot manifest guides authoring; the current runner does not automatically compile it into a film. See the [runtime adapter](references/runtime-adapter.md) and [shot-manifest format](references/shot-manifest.md).

To prepare material for your own model API, export it offline:

```bash
# First save your subject and requirements as brief.txt
python scripts/export_prompt.py \
  --style dataviz --brief brief.txt --out prompt-export.json
```

The exporter creates local `messages` data without making a network request. Review returned source before executing it. A model without image-review capability needs an independent vision reviewer or a human.

## Verification and limits

### Available evidence

- All five examples have continuous 1280 × 720, 24 fps renders; source hashes and exact review scopes are in [per-example status](references/example-status.json)
- **11 runtime tests and 15 script tests passed** during this publication preparation; see [release-validation.json](references/release-validation.json) and the earlier environment record in [validation.json](references/validation.json)
- Dataviz has frame-by-frame numerical, identity, and projection checks, plus repeat-time pixel evidence in its [provenance record](examples/dataviz/provenance.json)
- Actual-frame review and code tests are recorded separately; see [implementation status](references/status.md) and the [three-layer quality gates](references/quality-gates.md)

Run local checks:

```bash
python -m unittest discover -s runtime/tests -v
python -m unittest discover -s scripts -p 'test_*.py' -v
python scripts/validate_package.py
python scripts/validate_package.py --manifest examples/dataviz/shot-manifest.json
python examples/dataviz/check_example.py
```

The full runtime suite includes the optional Canvas path and requires Node.js with `@napi-rs/canvas`. Passing tests establish their specific technical conditions; actual visual review is still necessary.

### Know these limits

1. **This is v2-RC.** Continuous encoding and bounded sampled-frame reviews are recorded. Full real-time playback and listening have not been approved
2. **Dataviz needs a narrow-screen layout pass.** Supporting text needs resizing or rearrangement around a 390-pixel display width. Open the full-size demo for review
3. **Duration and aspect ratio need creative work.** `--duration` trims by default. Changing dimensions does not produce an independently composed portrait film. Review pacing and reading time after `--fit-time`
4. **Rendering cost depends on the scene and environment.** Ink filters are substantially slower. Test frames and short previews first. Render timing does not establish lower model costs
5. **Model-quality comparisons remain untested.** There is no controlled low-cost-model benchmark, universal-agent certification, or same-condition Opus comparison
6. **Execute only reviewed, trusted code.** SVG restrictions and AST checks do not sandbox Python or JavaScript. Check external source and assets first

## Repository layout

```text
HeiGe-Video/
├── SKILL.md                    # Agent entry point
├── README.md / README_EN.md     # Chinese and English guides
├── USAGE.md                    # Runtime commands and details
├── demos/                      # Five videos, thumbnails, checksums
├── examples/
│   ├── prototypes/             # Swiss-tech, whiteboard, ink
│   ├── dark-keynote/           # Concept source and factual notes
│   └── dataviz/                # Source, data, manifest, checks
├── runtime/                    # Shared SVG / optional Canvas renderer and tests
├── scripts/                    # Validation, prompt export, sound sketches
├── references/
│   ├── styles/                # Five director packs
│   ├── quality-gates.md       # Technical, style, and director review
│   ├── research-cases.md      # Research notes covering 58 works
│   └── source-notices.md      # Source and licensing notices
└── LICENSE
```

## Research and credits

Maintained and published by [HeiGeAi (Blake Xu)](https://github.com/HeiGeAi).

Method research drew on public projects by LemoLab, Kianzzz, Mort1d, and JakeB-5. Specific links, observations, and license boundaries are recorded in [sources](references/sources.md) and [source notices](references/source-notices.md). The existing `heige-motion-kit contributors` copyright notice is retained.

The [58-work research ledger](references/research-cases.md) contains 51 mechanism references and seven controls, with observations and public sources. Reference footage, characters, soundtracks, and proprietary fonts are not distributed with this repository.

## License

Code and documentation are released under the [MIT License](LICENSE). Retain the applicable copyright and permission notices when using, modifying, or redistributing them. Third-party fonts, dependencies, and external assets remain subject to their own terms.

## More projects

Part of the 问问黑哥 open-source collection. Explore the projects, purposes, and licenses at [heigeai.com/opensource](https://www.heigeai.com/opensource/).

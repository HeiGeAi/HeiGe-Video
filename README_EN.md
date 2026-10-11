# HeiGe-Video v4.0.0-alpha.2

**Let the same object carry the film from opening to outcome.**

Design the visual promise, complete objects and final composition first. v4 alpha 2 adds a native continuous world to our original Remotion route: persistent objects, an authored camera, visible handoffs between beats and object-bound sound events share one clock. BrewReel informed the controlled-production workflow; OneTake informed the method study. Our code and templates are original, and the authored Canvas route remains available for bespoke films.

## Create a project

After installing the environment, use one runner to create, validate, build and verify. `init` copies an original ratio-specific template into a self-contained JSON project with no external assets and refuses to overwrite an existing file. Edit its content, composition and actions for the real brief.

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r studio/requirements.txt
# Install local FFmpeg, Noto Sans CJK SC and Chromium as described in the Studio guide.
npx remotion browser ensure
node studio/make.mjs doctor
node studio/make.mjs init /tmp/heige-launch-new.json --ratio 16:9
node studio/make.mjs validate /tmp/heige-launch-new.json
node studio/make.mjs build /tmp/heige-launch-new.json --out /tmp/heige-launch-new
node studio/make.mjs verify /tmp/heige-launch-new.json --out /tmp/heige-launch-new
```

Original compositions: [landscape](examples/studio/continuous-launch.json), [portrait](examples/studio/continuous-portrait.json) and [square](examples/studio/continuous-square.json). Read the [continuity guide](studio/CONTINUITY.md) for the shared object, camera and event clock, with independent composition for each ratio.

## Three native continuous-world films

| Film | Ratio | Original project |
| :--- | :--- | :--- |
| [Landscape MP4](demos/continuous/horizontal.mp4) | 16:9 | [continuous-launch.json](examples/studio/continuous-launch.json) |
| [Portrait MP4](demos/continuous/portrait.mp4) | 9:16 | [continuous-portrait.json](examples/studio/continuous-portrait.json) |
| [Square MP4](demos/continuous/square.mp4) | 1:1 | [continuous-square.json](examples/studio/continuous-square.json) |

The [continuous gallery](demos/continuous/README.md) records actual encoded-image and playback scope. The [current inventory](references/v4-continuity-status.json) binds inputs, the current engine, MP4 hashes and declared checks. Technical, structural, sampled visual, complete playback and listening states remain separate. Inventory verification does not rerender or listen, and historical results do not establish acceptance of a new engine.

## Controlled production in v4

- Four authoring modes (`promo`, `explainer`, `lesson`, `talk`), two themes and three aspect-ratio layouts
- Native continuous objects with persistent IDs, semantic identity declarations, full keyframe trajectories and a global camera; adjacent `beat` segments have explicit carrier/cause/outcome handoffs
- Object-bound original `tick`, `whoosh` and `impact` sounds with authored timestamps
- Optional three actual temporal samples at a 180-degree global shutter, averaged in linear-light sRGB before encoding; one sample disables it
- Eight preserved ordinary scene types: `hook`, `statement`, `steps`, `compare`, `bars`, `transform`, `media`, `end`
- A strict versioned project contract, exact factual quote attribution and labelled synthetic teaching data; numeric continuous object text and UI rows require that object's own valid claims
- Final-recording timing without voice stretching, original SRT cue times and preview-only mock/draft output
- Registered local image, video, voice and music assets; no implicit online generation or asset downloads
- Real browser text geometry, font glyph coverage, complete encoded-frame decoding and independent source-narration plus final-mix measurements; continuous worlds also collect actual DOM observations per frame and bind encoded pixel deltas to the final MP4
- Hashes of input, assets, captions, brief, engine, dependencies, font, browser and every output artifact

Continuous worlds are limited to 60 seconds and 2 to 20 beats; each quantized beat lasts 0.25 to 20 seconds. Ordinary scenes cannot be mixed into a continuous project. Cause/outcome are author declarations, not machine-proven semantics. Geometry uses approximate point-grid visibility, and pixel deltas do not recognize images or real product behavior. Temporal sampling costs extra computation and does not implement physical HDR or per-object velocity blur.

See the [Studio guide](studio/README.md), [project contract](studio/CONTRACT.md), [BrewReel study](references/brewreel-distillation.md) and [OneTake study](references/onetake-architecture.md). A coding agent authors JSON; no native online LLM, TTS, ASR or B-roll supply/cache is integrated. Technical validation never implies artistic acceptance, complete realtime playback, listening or automatic publishing. Hashes prove integrity, not trust. Remotion has its own license terms.

[Install and use](USAGE.md) · [Skill entrypoint](SKILL.md) · [中文](README.md) · [Verification status](references/status.md)

## Five historical v4 alpha 1 films

The five [encoded examples](demos/super/README.md) retain their original bytes, source inputs and scoped acceptance records: median landscape, median portrait, product portrait, an audio-clock fixture and a local-media square fixture. The [portable inventory](references/v4-example-status.json) binds them to source commit `29135480806d061f1af65734b17dcecad3a31f4a`. Historical verification recomputes the production engine hash from that Git commit and fails when the commit is unavailable. These are historical results, not demonstrations of alpha 2 continuity or the current engine.

The original inventory records sampled review and muted normal-speed browser playback. The audio fixture's first playback dropped frames and its independent replay did not; both records remain. Audio was measured but not listened to. Mock/draft fixtures remain preview, and no real spoken-narration experience is claimed.

## Five preserved v3 original films

### Night Signal

30 s · 1080p · original synthesized sound. One poster becomes a rhythm instrument.

https://github.com/user-attachments/assets/1099994b-4ec2-4553-a94b-3c98fe149200

[MP4](demos/swiss-editorial-v3.mp4) · [Source and reproduction](examples/swiss-editorial/README.md)

### SPECTRA

36 s · 720p · original synthesized sound. Source objects become evidence, storyboard, timeline and an optical scene.

https://github.com/user-attachments/assets/740bf648-3140-4980-a571-0edb1af79381

[MP4](demos/spectra-product-v3.mp4) · [Source and reproduction](examples/cinematic-product/README.md)

### Homeward

36 s · 720p · silent. A boat changes course, visibly docks and comes to rest.

https://github.com/user-attachments/assets/84201db2-fc4e-47c5-997a-b54ecf40af07

[MP4](demos/homeward-ink-v3.mp4) · [Source and reproduction](examples/ink-narrative/README.md)

### 38 Microseconds

42 s · 1080p · silent. One persistent board explains GPS and relativity.

https://github.com/user-attachments/assets/b3ee0e0a-bdc0-4db8-a041-245a720380d8

[MP4](demos/gps-relativity-v3.mp4) · [Source and reproduction](examples/whiteboard-navigation/README.md)

### Unpacking an Average

23.25 s · 720p · silent. The same orders become a readable distribution.

https://github.com/user-attachments/assets/690365d1-e2f4-411e-8178-d0c30952e0fe

[MP4](demos/unpacking-average-v3.mp4) · [Source and reproduction](examples/dataviz-forward/README.md)

All five have continuous technical exports and scoped independent decoded-image acceptance after repairs. The first two contain original synthesized sound, measured but unheard; the other three are silent. This does not establish complete playback, all-frame artistic review, reference parity or a model-cost advantage.

See [current status](references/status.md), [versioned source/media hashes](references/v3-example-status.json) and the [Chinese upgrade report](UPGRADE_REPORT_ZH.md). Five older v2 films remain explicitly labelled regression/comparison material.

## What changes in v3

- Direction centered on persistent objects, visible state changes and an ending that reframes the opening
- Canvas authored duration, asset readiness, pure-time state, declared text and hard cuts; shared cues, camera, stroke and seeded-noise helpers
- Decoded MP4 action/cut strips with exact time mappings and hashes; actual-pixel inspection and repair rather than automatic aesthetic approval
- 100 distinct works and 100 canonical repositories, with concrete mechanisms, limitations and rights notes; a small offline selector retrieves only a few relevant references

[Implemented features versus research proposals](references/upgrade-mechanisms.md) keeps future ideas separate from current capabilities. More rules or style names do not guarantee stronger pictures.

## Start

Copy the complete folder into your agent's supported skills directory, or have the agent read `SKILL.md` in a project. Rendering existing source needs no model SDK or API key. Creating and judging new work needs file access, code execution, rendering and actual-image review.

```sh
git clone https://github.com/HeiGeAi/HeiGe-Video.git
cd HeiGe-Video
python3 runtime/render_video.py doctor
python3 scripts/select_references.py --style ink --query 'brush identity consequence' --limit 4
python3 scripts/validate_package.py
```

Example request:

> Use heige-video to make an original 20-second explanation of why the median resists outliers. Use clearly labelled synthetic data. Design the ending first. Make the same values undergo two visibly different statistical operations. Render the signature action before making the full film, inspect actual pixels and state unverified playback or sound checks.

See [USAGE.md](USAGE.md) for explicit Canvas source commands and QA. The compatibility presets `--style tech/whiteboard/ink` still select **legacy v2 SVG examples**, not upgraded v3 films.

## Research scope

The [video index](references/research-cases.md) retains 79 mechanism references, 3 case-study/tutorial references, 1 mixed reference and 17 controls. It includes 51 freshly reinspected baseline works plus 49 new works. Per-work coverage and media hashes are recorded. Sampling varies and can be sparse for long films; it does not establish uninterrupted playback, listening or all-frame review. This is not a list of 100 excellent films.

The [project index](references/research-projects.md) contains 50 agent/authoring/orchestration projects and 50 render/motion/QA projects. Instruction/specification skills are labelled. Targeted source code was inspected; third-party projects were not installed, built or run. A demo link does not establish runtime validation.

```sh
python3 scripts/select_references.py --kind videos --style swiss-tech --limit 3
python3 scripts/select_references.py --kind projects --query 'font shaping' --limit 3
python3 scripts/select_references.py --controls only --limit 3
```

Controls are excluded by default. Selection is lexical routing, not quality scoring. Author model claims remain unverified. No controlled model comparison, cost advantage or Opus parity is established.

## Package map

- [SKILL.md](SKILL.md): concise creative workflow and style routing
- [USAGE.md](USAGE.md): installation, commands, review and tests
- [Runtime contract](references/runtime-adapter.md): Canvas/SVG API, helpers and decoded QA
- [Quality gates](references/quality-gates.md): technical, meaning/style and perceptual review
- [Video JSON](references/research-cases.json) / [Project JSON](references/research-projects.json): portable research without private paths

Remotion + FFmpeg is the default controlled-production route. Authored Canvas/SVG + FFmpeg remains supported for bespoke films. The separate legacy browser adapter is experimental, and a successful Blender CPU probe is not a general full-film implementation.

## License

Original code and documentation retain the [MIT License](LICENSE), existing copyright and [third-party notices](references/source-notices.md). Reference movies, source frames, music, fonts and third-party source snapshots are not distributed in the research corpus. A repository code license does not automatically grant media rights. Dependencies remain subject to their own licenses.

This is v4.0.0-alpha.2, dated 2026-10-12. OneTake's fixed research commit uses a noncommercial license. No OneTake source or assets were imported; this project's MIT license does not grant rights to reuse upstream materials. See the [source notices](references/source-notices.md) and [changelog](CHANGELOG.md).

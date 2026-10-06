# HeiGe-Video v3.0.0-rc.1

**Make something meaningful happen on screen.**

Design the visual promise, complete objects and final composition first. Prove the defining action in a short real render, then build the film. For editorial typography, cinematic product concepts, ink stories, whiteboard explanations and data narratives.

[Install and use](USAGE.md) · [Skill entrypoint](SKILL.md) · [中文](README.md) · [Verification status](references/status.md)

## Five new original films

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

Canvas/SVG + FFmpeg is the current production route. The separate browser adapter is experimental and has no verified output in this environment. A successful Blender CPU probe is not a general full-film implementation. Neither is a default production guarantee.

## License

Original code and documentation retain the [MIT License](LICENSE), existing copyright and [third-party notices](references/source-notices.md). Reference movies, source frames, music, fonts and third-party source snapshots are not distributed in the research corpus. A repository code license does not automatically grant media rights. Dependencies remain subject to their own licenses.

This is the v3.0.0-rc.1 prerelease candidate. See the [changelog](CHANGELOG.md).

# Changelog

## Bright showcase · 2026-10-12

- Three original, colorful directions with separately composed landscape and portrait films, 16 seconds at 30 fps.
- Candy soda, die-cut paper flight and a light mineral bloom use original vector art, bundled OFL font subsets and distinct eight-bar original scores.
- Separate editable Remotion showcase entry, full-frame DOM bounds, full video/audio decoding, current-source and artifact hashes, actual encoded GIFs and posters.
- [Six-film gallery](demos/bright-showcase/README.md) and [reproduction guide](showcase/README.md). Actual review/playback scopes are recorded in the [inventory](references/bright-showcase-status.json).
- The existing strict Studio engine and its historical media retain their original bytes; the new showcase does not add themes to that JSON enum.

## v4.0.0-alpha.3 · 2026-10-12

| Change | Actual implementation |
| :--- | :--- |
| Default creation | `init` creates a 15-second, 30 fps Forge project with independent landscape, portrait or square geometry; copies three original local PNGs into `<project-stem>-assets`; refuses existing JSON or asset directories |
| Forge visual language | Iron black, acid green, hard edges and controlled typography/appearance; `ledger` and `nocturne` remain available |
| Persistent images | Native `image` objects bind to registered local image assets and retain identity through world/camera changes; other kinds reject `assetId` |
| Motion | Fixed pure-time easing curves including cubic, normalized exponential and bounded back-out; controlled text size/weight/tracking and line-height multiplier (1.15 to 1.7, default 1.55), strokes, hard shadows and patterns |
| Original complete score | Real 128 BPM, 4/4, eight-bar, 15-second stereo PCM arrangement with drums, syncopated bass, chord stabs, lead hook and lift; no third-party samples or model API |
| Cue and mix | Shared music/action/event clock, nearest-video-frame cues; score gain applied once, narration-only music ducking, fixed-gain effects and final limiting |
| Recorded integrity | Music WAV and arrangement report with actual cues, events, PCM measurements and hashes, checked against the current arrangement; music-only final media is treated as expected audio |

### Scope and preserved history

- Alpha. The built-in score is restricted to exactly 15 seconds at 24 or 30 fps and excludes external `project.music`; other durations can use registered local music. Generic continuous worlds retain the 60-second, 2-to-20-beat bounds and recording-driven clock.
- Native images support PNG/JPEG/WebP, with controlled cropping and Forge monochrome treatment. Image-pixel facts and text require separate review. Paths remain local and reject traversal, symlinks and URLs; SVG/GIF are not accepted.
- Forge entry points are [landscape](demos/forge/horizontal.mp4), [portrait](demos/forge/portrait.mp4) and [square](demos/forge/square.mp4). The [inventory](references/v4-forge-status.json) and [delivery record](references/v4-forge-report.md) state actual media, hashes and check scope; no final test count or listening approval is asserted here.
- Alpha.2 continuous films remain historical bytes and evidence. The user rejected their pacing and aesthetics and identified the missing complete BGM. Historical `sampled-pass` is not user acceptance or a Forge aesthetic verdict.
- Alpha.1 fixed-commit evidence, the eight ordinary scene components, four modes, authored Canvas/SVG v2/v3 films, original SRT timing, strict factual claims and preview-only draft/mock status remain available.
- Cause/outcome are author declarations, visibility is approximate, and pixel deltas do not establish semantics or quality. Actual visual review, full playback, human listening and user aesthetic acceptance stay distinct. Hash integrity is not a trust certificate.
- Original code, assets and score remain subject to their recorded licenses. OneTake source/assets were not imported. No online LLM/TTS/ASR, paid generation, B-roll supply/cache or blind model-cost comparison is claimed.

See the [continuous guide](studio/CONTINUITY.md), [music note](references/music-score.md) and [source notices](references/source-notices.md).

## v4.0.0-alpha.2 · 2026-10-12

### Added

- Native continuous worlds in the existing Remotion runner: persistent object IDs and identity declarations, complete pure-time trajectories, a global camera and explicit adjacent-beat carrier/cause/outcome boundaries.
- Original object-bound event sound synthesis for `tick`, `whoosh` and `impact`, aligned with the same film clock and included in the local audio pipeline.
- Optional three actual temporal captures at a 180-degree global shutter, averaged in linear-light sRGB before final encoding. Single-sample output remains available.
- `init <new-project.json> --ratio 16:9|9:16|1:1` creates an editable, self-contained original template. Initialization, validation, build and verification share the existing runner.
- Continuous contract checks for strict nested fields, finite complete trajectories, camera bounds, object/boundary identities, own-object factual claims and bounded sound/blur parameters.
- Renderer-owned per-frame DOM geometry and approximate paint visibility, boundary handoff measurements and final-MP4-bound all-frame pixel changes, with explicit limits on semantic and perceptual interpretation.
- Fixed-commit OneTake architecture and creative-protocol study, followed by original methods in HeiGe-Video. No upstream source, assets or media were imported.
- Historical v4 alpha 1 verification recomputes its engine fingerprint from source commit `29135480806d061f1af65734b17dcecad3a31f4a`. Missing Git history, altered demo bytes and mismatched inputs fail rather than bypassing engine checks.

### Preserved

- Four authoring modes, two themes, three independent ratios and eight ordinary controlled scene components. Continuous projects use `beat` segments instead of mixing ordinary components into the same world.
- Final-recording timing, original SRT cues, strict local asset registration, exact facts/quotes, preview-only mock/draft output and input/engine/environment/artifact fingerprints.
- Original v2/v3 Canvas/SVG films and v4 alpha 1 media bytes, source inputs and historical acceptance scope. New engines do not inherit historical acceptance.
- MIT for original code and documentation; Remotion, system dependencies and upstream reference materials retain their own terms.

### Limits and acceptance state

- Alpha. Continuous worlds are bounded to 60 seconds and 2 to 20 beats; each quantized beat lasts 0.25 to 20 seconds.
- Cause/outcome are authored declarations. DOM identity, approximate visibility and pixel deltas cannot prove narrative semantics, true product behavior, image meaning or artistic quality.
- Independent continuous films are linked as [landscape](demos/continuous/horizontal.mp4), [portrait](demos/continuous/portrait.mp4) and [square](demos/continuous/square.mp4). Their [gallery](demos/continuous/README.md) and [historical inventory](references/v4-continuity-status.json) record the alpha.2 scope. The user subsequently rejected the pacing and aesthetics; those technical/sampled records are not user aesthetic approval or evidence for alpha.3.
- Hash verification establishes integrity, not a trust certificate. Full playback, sampled visual review and actual listening remain separate; real narration quality still requires a human listener.
- No native online LLM, TTS, ASR, paid generation, B-roll supply/cache, automatic UI reconstruction or publishing certification. No upstream-parity, blind model comparison or cost-superiority claim.

See the [continuity guide](studio/CONTINUITY.md), [OneTake fixed-commit study](references/onetake-architecture.md) and [source notices](references/source-notices.md).

## v4.0.0-alpha.1 · 2026-10-12

### Added

- Original controlled Remotion production route: strict `heige-video/4` JSON, eight scene types, four authoring modes, two themes and three independent aspect-ratio layouts.
- Final-recording clock and original SRT timing, local voice/music mux with ducking, registered local media and labelled generated/screenshot assets.
- Exact claim/quote attribution, numeric row identity and unit checks, visible teaching-data disclosure, preview-only draft/mock status.
- Local font cmap validation and committed-DOM inspection before screenshots; complete encoded frame/audio checks, overview sheets and causal-action strips.
- Input/engine/environment/artifact fingerprints, immutable output directories, conservative serial rendering and fatal executor failures.
- Source-level BrewReel architecture/quality distillation, adversarial tests and structured agent authoring workflow.

### Fixed

- Full-width numeric subtitle punctuation and adjacent signed quantities retain their values through parser and renderer cleanup.
- Media elements use block layout to avoid replaced-element baseline overflow; output initialization and cleanup always release the serial render lock.
- Legacy Canvas workers fall back safely when group signals are denied, preserving the original error and reaping the owned worker.

### Preserved

- Authored Canvas/SVG production, original v2/v3 films, source hashes and 100 + 100 research corpus.
- MIT for original work; Remotion and system dependencies retain their independent license terms.

### Limits

- Alpha, local pipeline. A coding agent writes the storyboard JSON; native online LLM, TTS, ASR, image/video providers and batch-course scheduling are not integrated.
- Sampled geometric/visual review is distinct from every-frame artistic review, full realtime playback and actual listening.
- No trained model weights, paid-model comparison, cost advantage, upstream demo equivalence or automatic publishing certification.

## v3.0.0-rc.1 · 2026-10-06

Pre-release candidate; verification scope is documented rather than treated as stable-production or aesthetic parity certification.

### Added

- Five original films with reproducible scene sources: Night Signal, SPECTRA, Homeward, 38 Microseconds and Unpacking an Average (167.25 seconds / 4,014 encoded frames total).
- Canvas authored-duration/readiness/state/text/cut contracts; pure-time motion helpers, shared cues, camera transforms, seeded noise and arc-length strokes.
- Optional cut-aware linear-light shutter sampling, plus decoded MP4 action/cut review strips and exact source-time mappings.
- Offline reference selector over 100 unique videos and 100 canonical repositories. The video corpus includes 51 reinspected baseline works and 49 additions, using bounded decoded sampling.
- Five source/media hash checks, new research validation tests, and CI coverage of the new product/data manifests.

### Changed

- Creative workflow starts from a visual promise, persistent objects, the final composition and a short motion proof.
- Bilingual README, installation guide and upgrade report now distinguish implemented mechanisms, research ideas and experimental adapters.

### Fixed

- External CommonJS scene files now resolve runtime-local Canvas dependencies without requiring a global `NODE_PATH`; isolated regression coverage reproduces repository-local CI installs.

### Preserved

- Five v2 demos and SVG compatibility presets; original copyright, MIT licensing and third-party notices.
- Dependency/generated-folder exclusions from the public v2 validator fix.

### Known limits

- Two new films contain original synthesized sound that was measured but not auditioned; three are silent. Visual review is sampled/targeted, not full realtime playback or exhaustive artistic acceptance.
- No model weights were trained or distilled. Research informs the workflow and code, not a claimed weight-distillation result. No paid-model benchmark, cost advantage or Opus/reference parity is established.
- Canvas/SVG + FFmpeg is the supported production route. Browser and Blender experiments do not establish a general production pipeline or cross-platform support.
- The product film is a fictional UI/2.5D concept, ink remains procedural, and some small labels are difficult at phone width. GPS geometry is schematic; 11.4 km is a signal-range equivalent, not daily handset drift.

See [verification status](references/status.md), [release checks](references/v3-release-validation.json), [Chinese upgrade report](UPGRADE_REPORT_ZH.md) and [source notices](references/source-notices.md).

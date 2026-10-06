# Packaged runtime adapter

This package includes a snapshot of the project's original cloud SVG/Canvas runner under `runtime/`, and three revised original SVG examples under `examples/prototypes/`. Dataviz and dark-keynote custom-source examples use the same runner. Each example has its own recorded review level; a functioning runner alone does not establish quality. The only packaging change to the runner is its package-relative default prototype path.

## Dependencies and capabilities

Required: Python 3.10+, Pillow, fontTools, installed librsvg with `rsvg_handle_render_document`, Cairo, GLib/GObject, Fontconfig, a legally available CJK font, FFmpeg/ffprobe with libx264. Optional Canvas: Node.js and `@napi-rs/canvas`.

The source cloud environment reported Python 3.12.14, Pillow 12.3.0, fontTools 4.61.1, librsvg 2.60.0, Cairo 1.18.4, FFmpeg 7.1.5, Noto Sans/Serif CJK SC, Node 24.19.0 and optional Canvas 0.1.100. No new installation, API call, credential or desktop access was needed. System libraries, fonts and optional npm modules are NOT bundled. Run doctor in the actual target environment; no unsupported platform is claimed.

From the Skill directory:

```sh
python3 runtime/render_video.py doctor
python3 runtime/render_video.py audit --style tech
python3 runtime/render_video.py frame --style whiteboard --time 13.5 --width 960 --height 540 --out /tmp/video-whiteboard-frame-new
python3 runtime/render_video.py render --style tech --fps 24 --duration 30 --width 960 --height 540 --out /tmp/video-tech-render-new
python3 -m unittest discover -s runtime/tests -v
python3 scripts/validate_package.py
```

Every output directory must be new or empty. Substitute a writable project directory if `/tmp` is unsuitable. No command installs anything. Fontconfig cache defaults to `runtime/.cache`; set `VIDEO_RUNTIME_CACHE` to another writable location when necessary.

`--style` selects one of three bundled example presets (`tech`, `whiteboard`, `ink`), not the set of scenes the renderer is allowed to draw. Open scenes use `--source trusted-scene.py` or `--backend canvas --source trusted-scene.cjs`. Custom sources write `video.mp4`; `--label dataviz` sets display metadata and sheet titles without changing source selection or becoming a filesystem path. Without a label, a custom source uses its filename stem. Built-in presets retain their original filenames. The report separates `source_preset` from the `review_preset` used for default sampling. Supply that scene's actual `--cuts` boundaries rather than relying on the unrelated bundled style's default checkpoints. The runner does NOT directly ingest `shot.schema.json`; adapt the manifest into scene code while preserving its timing and IDs.

## Source interfaces

Python: define `render(t)` returning a complete SVG string and `DURATION` (or `SECONDS`). `FONT` is overridden in memory by `--font-family`, defaulting to `Noto Sans CJK SC`. The source's legacy export CLI is not called. Custom Python scenes must be self-contained or import installed/package-qualified helpers: this snapshot does not add the scene directory to Python's module search path, so an adjacent `colors.py` is not automatically importable. Resolve any allowed assets from `Path(__file__).parent`, not the process working directory. Inspect any new source before importing it: Python code is not sandboxed by the AST audit.

Canvas: export `render(ctx, t, {width, height, random, fontFamily})` from a trusted `.cjs` or `.mjs` file. Each frame has a fresh canvas and reset deterministic random generator. Code must avoid wall-clock state, Math.random and mutable cross-frame dependencies. Canvas source duration is fixed at 30 seconds in this snapshot; an exported custom duration is not read. For a 20-second Canvas story, author at the intended absolute timestamps and render `--duration 20` without `--fit-time`. Use Canvas `--fit-time` only when the authored source timeline really is 30 seconds. The fixture at `runtime/examples/canvas_smoke.cjs` is a mechanism test, not a fourth style.

The SVG runner rejects external links/scripts and various unsafe or unsupported SVG features. This does not make arbitrary Python/JavaScript safe. SVG text is checked against the selected font's codepoints; full shaping and appearance still require pixel review. Canvas text is not introspected and needs manual glyph checks.

## Timing, ratio and audio limits

- `--duration` trims the original timeline by default; it does not redesign a 30-second story into 20 seconds
- `--fit-time` maps the remaining complete source interval to the chosen duration; review pacing and reading time afterward
- `--start` is a source-time offset; fps may be a rational value such as `30000/1001`
- Duration rounds up to a whole frame and the report records requested versus actual duration
- H.264 output needs even dimensions; alternate dimensions resize the SVG viewport and do NOT independently recompose portrait scenes
- `--cuts` can supply custom review boundary times; default cut sheets have only three frames per boundary and are insufficient for the full dense temporal review prescribed by this Skill
- The video runner outputs silence. Optional separately authored synthesis/mux instructions are in [sound-sketch.md](sound-sketch.md); silence may also be a deliberate choice
- Ink's filter-heavy SVG can be much slower than the other examples; test representative frame cost before a full job

## Outputs and verification evidence

A successful render includes MP4, `manifest.json`, `ffprobe.json`, `frame-metrics.json`, decoded contact sheet, cut strip, decoded review frames, request and encoder log. Current source-specific continuous-render and sampled-review results are in [example-status.json](example-status.json). Historical 960×540 baseline runs validated the initial runner; the packaged revised art now has its own 1280×720 results. Do not transfer a historical source's artistic approval to its replacement.

The runtime owner's eleven tests passed in the source location: SVG resource restrictions, raster channels, invalid inputs, existing-output protection, shuffled-time/repeated-raster checks for all three examples, Canvas identity, complete/repeated byte-identical smoke encoding under that pinned environment, dynamic-module registration/cleanup for ordinary dataclass scenes with future annotations and simultaneous instances, and safe custom labels/output naming. All eleven tests passed after this source integration from the relocated package in the cloud environment. The evidence and code hashes are recorded in the package validation report. Rerun them in another environment rather than inferring support from copying.

MP4 byte equality is only meaningful with the same source, font, rasterizer, libraries, platform and encoding options. Decode/metadata/metrics do not approve composition, science, phone readability, real-time pacing or audio. Use the separate three-layer quality gate.

Current package-level verification is recorded in [validation.json](validation.json). Treat its per-version limits as part of the result, not as a blanket quality certificate.

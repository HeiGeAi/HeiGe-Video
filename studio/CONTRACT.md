# Controlled production contract

This is an original implementation informed by BrewReel's separation of semantic inputs and deterministic components. The legacy runtime stays independent.

## Input version

`schemaVersion: "heige-video/4"`. Required: `title`, `mode` (`promo`, `explainer`, `lesson`, `talk`), `ratio` (`16:9`, `9:16`, `1:1`), `theme` (`ledger`, `nocturne`), `shots`. Optional: `fps` (24 or 30, default 30), `seed` (integer), `draft` (boolean), `demoData` (boolean), `brand` (string), `facts`, `assets`, `audio`, `music`, `continuity`.

Facts: `{id, text, source}`. Evidence does not establish truth by itself. Claims: `{text, factId, quote}` on a shot. Claim text must be an exact substring of its quote. Quote must be present in its fact text and in the brief when a brief is supplied. A numerical claim may not invent numbers absent from the quote. Renderer displays claim text beneath the shot, with source id. Demo data is visibly labelled.

Factual bars/sort rows use one unambiguous independent claim fragment per row: begin with the exact row label, use whitespace, `:`/`：`/`=`/`＝` or a supported relation (`有`, `为`, `获得`, `耗时`, etc.), then the one matching value and declared unit. Do not combine several subjects or quantities in the row's claim text. The quote may retain full context; the claim fragment must still be exact. Example: quote `甲有2次记录。乙有8次记录。`, row claims `甲有2次记录` and `乙有8次记录`. A claim containing both subjects cannot support exchanged values. The validator checks this narrow relation grammar, not semantic truth, negation, conditions or source credibility.

After the exact unit, the claim must end, use punctuation, or use a supported explanation prefix: `记录`, `测试`, `订单`, `样本`, `任务`, `得分`, `评分`, `交易`, `练习`, `实验`. For other wording, shorten the claim to an exact label/relation/value/unit fragment of the quote. Full-width quantities and Chinese numerical rate/unit phrases are also subject to the numerical-content gate; this does not replace semantic source review.

Assets: `{id, path, kind, source, rights}`. `kind`: image/video/audio. `source`: original/licensed/screenshot/generated. `rights`: nonempty human declaration. Paths are relative to the project JSON folder, real files inside that folder, no URLs or traversal or symlink escapes. No remote calls in the engine.

Audio: `{assetId, kind, subtitles?}`. `kind`: recording/synthetic/mock. Subtitles is a project-relative SRT path. Importing SRT preserves cue timing and strips display punctuation. Mock audio always yields preview status. Music: `{assetId, volume?}` (default .15), ducked while narration is present.

Shots: required `{id, type, title}` with either `duration` (seconds) or `start`/`end` (seconds, required for every shot when audio is present). Audio is the clock; shot intervals must be continuous, begin at zero, cover the audio, within one frame. No retiming of recordings. Optional common fields `body`, `claims`, `intentionalHold`.

Supported shot-specific fields:

* hook/statement/end: optional `body`.
* steps: `items` (2 to 5 short strings).
* compare: `left` and `right`, each `{label, items}` (1 to 4 short strings).
* bars: `data` (2 to 6 `{id, label, value}`), `unit` optional. Preserve row identities, zero-baseline nonnegative bars. Every value must be supported by claims unless demoData is true.
* transform: `items` (3 to 7 `{id, label, value}`), `operation`: sort. Same IDs visibly move to sorted destinations, preserving values. Numbers follow the same evidence rule.
* media: `assetId` (image/video), optional `caption`. Explicitly label generated/screenshot sources, do not call them real footage.

## Compiled render input

`compileProject(project, {baseDir, briefText?, audioDuration?})` returns `{project, timeline, durationInFrames, duration, width, height, fps, issues}`. Timeline entries contain all shot fields plus `from`, `frames`, `start`, `end`. Default dimensions: 1280x720, 720x1280, 1080x1080. All seconds quantized once to frames. Per-scene length 2 to 20 seconds, whole film <= 600 seconds. Unknown fields are errors rather than silently ignored knobs.

For browser props the runner passes `{plan, assetUrls, captions, fontFamily}`. `plan` is the compiled result; `assetUrls` maps asset IDs to served local files; `captions` is `{start,end,text}[]`; `fontFamily` is an actually loaded local face. Studio root registers `HeigeFilm` and calculates metadata from plan. Components expose text nodes with `data-heige-text`, and semantic groups with `data-heige-block` for geometric inspection. Every scene's full text is declared, measured, and checked. Layout uses theme tokens and separately composed portrait structure. Every render is a pure function of frame and props.

## CLI

`node studio/make.mjs doctor`; `validate <project.json> [--brief <brief.md>]`; `build <project.json> --out <new-dir> [--brief <brief.md>]`; `verify <project.json> --out <dir>`.

Build snapshots JSON and relevant media; records input, engine and dependency fingerprint; uses concurrency 1; serial lock; writes preview/rejected/validated manifest states. Full MP4 decoding, format/duration checks, source narration independently measured before mixing, DOM geometry at each shot's 0/25/55/85% plus opening/closing, frame sheets and signature-action strips are required for technical validation. Browser console errors block the build. Actual visual review, full playback and listening remain separate declared outcomes. No automatic claim of publish-ready or aesthetic parity. Verify rejects changed input, assets, engine and artifacts.

## Native continuous world (alpha.2)

An optional `continuity` replaces per-shot mounting with one persistent world and one global camera. All shots must be `beat`; their titles describe the storyboard rather than creating visible scene titles. Beat duration is .25 to 20 seconds, 2 to 20 beats, whole film at most 60 seconds. Existing scene projects retain their behavior.

Objects: `{id, semanticIdentity, kind, text?, rows?, color?, claims?, keyframes}`. Kinds: surface/text/dot/line/ui. Color tokens: paper/ink/muted/accent/line/secondary. `ui` is an original panel with plain text rows, not an imported website or screenshot reconstruction. At most 24 objects. Each numerical object text or row requires an exact claim on that same object unless demoData is true. Object claim sources appear in the film footer.

Every object keyframe is complete: `{at,x,y,w,h,opacity,rotation,radius}`. Positions are top-left world coordinates; rotations use the object's center. Camera keyframes are `{at,x,y,zoom,rotation}`, with x/y at the world point centered on screen. Tracks require 2 to 128 strictly increasing entries, first at zero and last at quantized final duration. This version interpolates linearly. Camera projection uses outputHeight/720 times zoom; therefore each ratio must have authored object widths and reading geometry. Rotation and camera projection are affine 2D, with no claim of true 3D optics.

Boundaries: ordered `{fromShot,toShot,carrier,cause,outcome}` for every adjacent beat pair. Carrier is a persistent object ID; transition time comes from the compiled beat boundary. Cause/outcome are explicit storyboard declarations, not proven semantic reasoning.

Optional `soundEvents`: at most 32 `{id,at,objectId,type,volume}` entries, with unique IDs, type tick/whoosh/impact, at from 0 to duration minus one frame, volume .001 to .7. Procedural stereo sound uses event timing and actual projected source position in a shared short delay room. Narration and music keep their existing roles; music ducks under narration or event sounds. The final mix has a .95 full-scale limiter with compensated lookahead and no automatic makeup gain. Source narration and final audio checks retain every decoded channel. Audio peak and finite-sample checks are technical checks, not listening.

Optional `blur: {samples:1|3,shutterAngle:180}`. One sample disables blur. Three samples capture three real temporal browser states per encoded frame, then composite them in linear light and encode at the original fps. It is not a CSS blur. `renderSampling` is runner-internal, not a public project field.

The build records committed DOM geometry for every encoded frame. `continuity-check.json` requires complete frame coverage, visible and substantial boundary carriers, real movement or morphing, bounded per-frame jumps, valid sound sources and final encoded-pixel hash binding. It uses a 5x5 browser hit-test to approximate occlusion, not exact painted masks. Low-resolution complete-frame pixel deltas flag suspicious jumps for review. The result is `structural-pass`, not an aesthetic score; arbitrary supplied JSON is not independently trusted evidence. Narrative meaning, text comprehension and listening require separate review.

`node studio/make.mjs init <new-project.json> [--ratio 16:9|9:16|1:1]` creates an original asset-free continuous template, refusing to overwrite an existing file. See [CONTINUITY.md](CONTINUITY.md) for the product workflow.

# Controlled production contract

This is an original implementation informed by BrewReel's separation of semantic inputs and deterministic components. The legacy runtime stays independent.

## Input version

`schemaVersion: "heige-video/4"`. Required: `title`, `mode` (`promo`, `explainer`, `lesson`, `talk`), `ratio` (`16:9`, `9:16`, `1:1`), `theme` (`ledger`, `nocturne`), `shots`. Optional: `fps` (24 or 30, default 30), `seed` (integer), `draft` (boolean), `demoData` (boolean), `brand` (string), `facts`, `assets`, `audio`, `music`.

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

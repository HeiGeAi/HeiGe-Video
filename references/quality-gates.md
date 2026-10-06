# Quality gates and actual evidence

Keep three independent outcomes: technical integrity, style/meaning integrity, and perceptual acceptance. A technical pass is not an aesthetic score. A pretty still is not temporal acceptance. Every report states the input/code version, output hash, actual reviewer and evidence examined.

## Gate 1: technical integrity

1. Decode the complete final video. Verify width/height, fps, frame count, duration and expected tracks. A successful encoder exit alone is insufficient
2. Render a representative set in shuffled order and repeat it under the same pinned environment. Compare SVG or scene state and actual raster pixels. Include first/final encoded frame, boundaries, high-risk action times and selected interior times
3. Verify fonts resolve, full required text shapes, and intended font appearance survives rasterization. Record every actually used face/weight separately; the selected Regular face does not establish which Bold face the rasterizer used. Inspect actual Chinese glyphs and punctuation. Check final text bounds in its reading windows
4. Check missing assets, NaN/infinite transforms, stale canvas state, unexpected transparency, unintentional blank frames, clipping and layer remnants. Automated candidates require inspection; intentional black or empty-paper holds are not automatic failures
5. Verify A/V duration and declared event alignment within the project's stated tolerance. Check samples for NaN/Inf, clipping and unintended discontinuities. State whether audio was actually heard
6. Compare each delivery ratio's actual layout. Cropping a landscape composition does not constitute a portrait design pass

Technical evidence should contain exact commands, environment/dependency/font versions, seed, code/input/output hashes, counts, exceptions and failures. Do not label “passed” merely because a report file was written. If one test exits nonzero, retain the failure and its corrected rerun.

## Gate 2: style and meaning

Load only the chosen pack's checks. Apply mixed styles by segment, with an explicit bridge rule.

- Swiss: no spring/overshoot; meaningful reflow; stable ID/destination; readable labels after rotation settles
- Whiteboard: true geometric draw; nib endpoint agreement; feasible pen schedule; board persistence; honest Chinese text mechanism
- Ink: readable silhouette; foreground ink weight and wet/dry structure; stable local texture; intentional hold; action before consequence; valid silence
- Dataviz: data/source/units/domain honesty; row-key conservation; annotations track the correct datum; no impossible date/category interpolation
- Dark-keynote: actual or explicitly conceptual product states; stable typed gathering; settled UI legibility; controlled light and surface seams

Shared narrative check: identify the signature action, the state before it and the different state after it. If only colors, captions or camera positions changed, ask whether the actual subject experienced a consequence. A calm poem may have a subtle consequence, but perpetual decorative motion is not a substitute for one.

Record conditional exceptions with their narrative reason and actual frame evidence. There is no global requirement for springs, 75% moving frames, a minimum subject-area percentage, continuous camera drift or audible energy in every interval.

## Gate 3: independent perceptual review

Before viewing code or the author's explanation, the reviewer receives only:

- User brief, audience, delivery dimensions and required facts
- Relevant style constraints and stated illustrative/synthetic content
- Final encoded video if playback is available
- Actual decoded frame evidence with timestamps and source mappings

The reviewer must actually open/view images. File existence, OCR output, image embeddings, a builder's narrative and a prewritten score are not visual review. Prefer a separate reviewer where possible. Label self-review honestly when independence is unavailable.

Review composition, visual hierarchy, subject scale, identity across shots, action readability, state consequence, material character, reading time, rhythm and audio relationship. Ask whether the main event can be understood without explanatory commentary. Judge readability at intended playback size, not only a zoomed still.

## Minimum evidence design

Use a film-length full-domain contact sheet (roughly one-second sampling plus first/final frames is a useful starting point), but make density reflect duration and complexity. Add:

- Native-size crops and a phone-width version for essential text
- Opening action and every transition's dense neighbors, normally at least 12 consecutive frames on each side where practical
- Signature action and its consequence at approximately 0.2-second sampling or denser when the event requires it
- The same protagonist before/after and across camera/representation changes
- Style-specific material or stroke close-ups
- The quietest and busiest passages, not just the best-looking frames

Contact sheets can establish sampled coverage and composition; they cannot prove full-speed pacing, absence of all one-frame faults, or audio quality. If playback/listening is unavailable, state that temporal/audio acceptance remains pending. “Fully decoded” does not mean “every frame viewed.”

## Review result and repair loop

For each material defect record: severity, time/frame, what is visible, why it violates the brief/style, a concrete correction and the exact recheck evidence. Use `pass`, `needs-revision`, `blocked`, or `not-tested` by dimension; optional scores need anchored reasons and never average away blockers.

Fix root causes, render affected intervals, inspect actual results and rerun relevant regressions. A later font, camera, ink or audio edit invalidates the corresponding earlier approval. Stop when the agreed delivery gates are satisfied or a specific capability/authorization blocker remains. If a deadline forces a preview, label the unfinished checks plainly.

## Evidence implementation warning

The shared runtime's default three-frame cut strip is a quick diagnostic, not the dense review above. Explicitly extract 12 frames before and 12 frames at/after each meaningful boundary, full-domain samples and the decisive action at an appropriate interval. Store source frame indices/timestamps with every extracted image. If using a long FFmpeg select expression, merge consecutive frame indices into ranges or batch the extraction; a filter-parser failure is not successful evidence generation. Generated contact sheets count as evidence only after someone actually opens them.


For a 24 fps encoded video, this tested recipe extracts the 12 frames before and 12 frames at/after the 6-second boundary. Use a new output folder and replace the input filename:

```sh
mkdir /tmp/video-dense-new
ffmpeg -v error -n -i movie.mp4 -vf 'select=between(n\,132\,155)' -fps_mode vfr /tmp/video-dense-new/frame-%03d.png
```

The first image is source frame 132 at 5.500 seconds; the thirteenth is frame 144 at 6.000 seconds; the last is frame 155 at 6.458 seconds. Store that mapping with the images. This uses the encoded timeline; apply the manifest's source offset/time scale separately if the output was trimmed or retimed. Change the indices for the actual frame rate and event. Extraction success is not evidence that the images were viewed.

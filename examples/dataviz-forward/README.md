# 拆开平均数 · a fresh-brief dataviz application

Both fictional services report a sample mean of ten minutes. Twelve persistent paper bags reveal the individual delivery times, then the same objects move from two receipts onto one shared distribution axis. A's duplicate value ten remains two distinct bags. The conclusion is limited to these six fictional orders per group.

This was an independent fresh-brief application of the candidate Skill, followed by actual-frame critique and repairs. It demonstrates one transferable explanation mechanism. It is not a one-shot result, low-cost-model benchmark, broad creative generalization or reference-parity result.

## Data and mechanism

- A: 8, 9, 10, 10, 11, 12 minutes; B: 1, 2, 3, 17, 18, 19 minutes
- Each group has six observations, total 60, mean 10. A lies within 8–12; B splits into 1–3 and 17–19
- Stable IDs preserve all twelve observations through a real intermediate remap, not a cut to a different chart
- Group motion is staggered to avoid body crossings; receipt covers are clipped to their physical aperture; labels settle before the reading hold
- The source and shared helper remain unchanged. [MOTION-LICENSE](source/MOTION-LICENSE) retains the original helper's MIT notice. Graphics are original; no reference media or fonts are bundled

[Data](data.json) · [Facts](qa/facts.json) · [Shot manifest](film.json)

## Exact delivered timing

The scene declares an authored duration of 26 seconds. Delivered R6 is a trim of source `[0.75,24)` with no retiming: 23.25 seconds, 558 frames at 24 fps. Source time equals output time plus 0.75 seconds. A default 26-second render is not the delivered cut.

From the package root:

```sh
python3 runtime/render_video.py render --backend canvas --source examples/dataviz-forward/source/scene.cjs --start 0.75 --duration 23.25 --fps 24 --width 1280 --height 720 --out /tmp/heige-average-film-new
node examples/dataviz-forward/source/check_scene.cjs
node examples/dataviz-forward/source/check_text.cjs
python3 scripts/validate_package.py --manifest examples/dataviz-forward/film.json
python3 runtime/review_video.py --video /tmp/heige-average-film-new/video.mp4 --manifest /tmp/heige-average-film-new/manifest.json --actions 3:5.5,9.5:13.8,17.5:20.5 --out /tmp/heige-average-review-new
```

Action ranges in the QA command are source time. Keep the matching newly generated manifest so the 0.75-second offset is respected. Checks write their reports into this example's `qa` folder. The film is silent. Noto Sans CJK SC Regular is resolved from the installed Linux environment; no cross-platform reproduction is claimed.

## Review and remaining limitations

[Final MP4](../../demos/unpacking-average-v3.mp4) · [Verification](verification.json)

- Source SHA256: `2c83d9c0cbc44485d5f28559f9a985e2bd3266fb5de82443734af027df39c727`
- Media SHA256: `16de9d1296babef624c367f61dac41bfc956114ed1df1f870813920e94e38a6f`
- 38 shuffled actual RGBA/state samples matched; all 558 delivered frames conserve IDs, exact values and finite coordinates under the authored checks
- Independent review accepted the repaired reveal/remap and R6 trim after viewing 34 overview samples and seven separately decoded native frames, including the final frame
- A 48×40 body proxy found no cross-group overlap during the remap. It is not a general collision detector
- Nine settled text-window checks found 379 instances / 54 unique strings inside the frame. Pixel review was separate

The style remains straightforward classroom graphics. Minute labels, IDs and footnote become small in a 390-pixel-wide preview; this is a horizontal 720p composition. Full realtime playback and listening were not performed. No soundtrack, model identity, cost advantage or numeric aesthetic score is claimed.

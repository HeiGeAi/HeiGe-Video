# Dataviz director pack

Status: one original [worked dataviz example](../../examples/dataviz/facts-and-status.md) is implemented and has technical plus sampled-image acceptance at 1280×720. Playback is untested; phone-width supporting text needs revision. This does not establish a general-purpose chart engine or broad model parity. Method references: [style](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/dataviz/STYLE.md), [coordinate/morph engine](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/dataviz/demo/engine.js), [film](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/dataviz.mp4).

## World and media

The world is a data coordinate system, optionally embodied on paper or a designed plane. Start from the comparison the viewer must make. Axes, legends and scale become visible when needed to interpret the marks; they are not decorative UI. A chart can be quiet and remain cinematic when its changing encoding carries the story.

## Object identity

Use a stable row key as mark ID. Store source values separately from animated projection. When a dot becomes a bar or strip, the same record retains its year/category/value. Anchor annotations to data identity plus an intentional screen offset; recalculate their leaders after every camera or scale change.

## Camera

Move from one observation to a relevant range, track an accumulating sequence, or pull back to a full comparison. Keep viewers oriented with persistent anchors. Camera movement cannot silently modify a quantitative baseline. If the domain changes, show and explain the new scale.

## Actions and consequences

Every action corresponds to a data operation: add an observation, sort, filter, aggregate, compare, rescale or re-encode. State which values are unchanged and which operation changes the represented population. Arrival rhythm can accelerate, but it must not imply equal elapsed time for irregular observations without a visible timeline.

A signature transformation must reveal a valid new relationship while conserving the underlying observations as appropriate. A point-to-strip morph can reveal a longer pattern; it must not fabricate a trend or erase inconvenient points. Counts that rise without a traceable process are not evidence.

## Transitions

Extend an axis, carry a selected observation into detail, morph marks through a shared mapping, or reframe the same population. Keep the selected sample findable after the transformation. If changing datasets, announce the change rather than suggesting identity continuity falsely.

## Material

Marks and annotation leaders need edge clarity before paper grain, pencil body or other illustration. If a physical drawing tool is used, its tip and generated path share geometry; its body must not cover the new value. Use a stable, explained color encoding and baseline. Never intensify the color scale for drama while preserving the old legend.

## Text and factual integrity

Keep dataset title, time period, unit, denominator, geographic scope and source recoverable. Label synthetic or schematic data on screen. Distinguish missing from zero, estimate from observation, and forecast from history. Do not tween categorical labels, dates or identifiers through impossible intermediate facts. Numeric animation must resolve to the exact sourced value during its reading hold.

## Audio

Mark arrivals, pencil contacts and notes may share events. Value-to-pitch mapping is optional and needs a declared scale when meaningful. Dense events need shorter tails/lower gains rather than uncontrolled loudness accumulation. Make room for complex transformations by pausing narration; this does not necessarily require all-bus silence.

## Forbidden cases and checks

- Decorative charts with unexplained units or baselines: fact gate fails
- Chart-type change loses the chosen sample: test row-key conservation and annotation tracking
- Re-scaling exaggerated to manufacture drama: compare source domain, visible domain and labels
- Interpolation displays false dates or categories: inspect intermediate frames
- Uncertainty disappears in the animation: compare source qualifiers to the final visible claim
- Scores or percentages invented as illustrative “proof”: visibly mark synthetic examples or remove them

Evidence must include source/data hashes, row-key mapping, unit/domain checks, mark count before/after each operation, dense morph frames and full-size readable final labels. Technical data equality does not prove that the chosen visual encoding is honest; independent review must judge interpretation.

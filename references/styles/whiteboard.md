# Whiteboard director pack

Status: revised original optical explainer has a continuous technical pass and targeted actual-frame acceptance. Actual path drawing is implemented; the style remains simplified vector/marker rather than a fully tactile marker engine. Method references: [style](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/whiteboard/STYLE.md), [stroke/pen/timeline engine](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/whiteboard/demo/engine/wb.js), [film](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/whiteboard.mp4).

## World and media

One persistent board holds the argument. Plan its regions from causal or conceptual relationships, not a sequence of equal rectangles. Earlier drawings remain available for later reference. The camera's route is a traversal of the explanation.

## Object identity

Each diagram element and stroke has an ID, world geometry and responsible pen. Once deposited, ordinary ink stays attached to the board. A movable magnet, ray, pointer or represented phenomenon may move if that different physical role is clear. Do not make old ink fly away merely to clear room.

## Camera

Follow a line to a new premise, return to an earlier formula when reusing it, and pull back when relationships can be understood together. Important text must fit throughout its reading window. Fast travel may use actual temporal subframe blur, but the destination must settle. Keep board texture in world coordinates.

## Actions and consequences

Represent drawing as ordered geometry with arc-length prefixes. At time t, the nib must coincide with the newly appearing endpoint; pen lift, travel and park are separate phases. Allocate stroke durations using length and deliberate pauses. A single pen cannot execute simultaneous paths in different regions.

Each new line should change the argument: constrain a location, connect cause to effect, explain a ray or modify a result. In an optical explainer, show the same incident light meeting the prism and the outgoing spectrum continuing from it. Decorative arrows around a written conclusion are insufficient.

## Transitions

Move across the same board; reveal an adjacent region; trace a connection back to earlier evidence; use a legitimate erase-and-rewrite only when revising the argument. A final whole-board view should be composed of things the viewer has seen created. Do not secretly substitute a separate summary collage.

## Material

Start with actual marker-width geometry and stable, mild path irregularity. For higher fidelity, implement pressure/direction-dependent widths, darker start points, overlapping ink, sparse dry streaks and low-contrast old erasures. These are rendering tasks, not adjectives. Keep grain and reflections below the diagram's contrast. Do not claim a complete marker engine from a hand-drawn font and cream background.

## Text and Chinese

Ordinary fonts are allowed and often best for labels. Chinese is conventional typeset text unless licensed glyph-stroke geometry and a correct stroke sequence are available and actually implemented. A horizontal wipe over filled Chinese glyphs is NOT handwriting. If labels appear as full typeset units, give them a clear timing role; let the pen draw diagrams or underlines instead.

A full-board overview may contain subordinate small labels, but the essential takeaway must have an independently readable treatment on phone output. Scientific angles and dimensions require valid calculations or an explicit “schematic / 示意” disclosure.

## Audio

Build pen-down friction and tap/lift cues from the same stroke schedule. Separate long travel from ink contact. Narration should wait for the required diagram to exist and leave a reading interval after dense relationships. Marker sound is optional; generic whooshes on every stroke are not a substitute.

## Forbidden cases and checks

- Slide-like resets between every idea: compare persistent board coordinates and IDs
- Nib detached from ink: inspect dense action frames and measure endpoint error at actual pixel scale
- Impossible pen schedule: check overlapping drawing intervals per pen
- Fake Chinese handwriting: inspect the actual mechanism, not the font name
- Whole-board text used as the only essential conclusion: inspect the mobile-size output
- A science illustration quietly presented as a simulation: verify source, assumptions and visible qualifiers
- Camera moves that crop settled formulas or introduce unrelated regions: inspect arrival and hold frames

Evidence includes stroke-begin/middle/end frames, pen travel, one revisit, final board continuity, full Chinese strings and a 2–4 second real drawing sample.

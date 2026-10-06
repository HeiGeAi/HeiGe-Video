# Ink director pack

V3 direction: design an original complete artifact, preserve meaningful object identity, and prove the signature action before expanding the film. The new [Homeward example](../../examples/ink-narrative/README.md) demonstrates a river crossing with a visible stroke consequence and completed docking. Current integration and exact review scope are in [status](../status.md). The legacy status below is comparison evidence, not v3 acceptance.

Legacy v2 example status: the original seed-journey R3 example has a continuous technical pass and independent sampled-image/ending acceptance. It now has stronger forms, landing/growth and a settled closing wide; its material remains a grainy vector/brush approximation. Method references: [style](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/ink-wash/STYLE.md), [brush construction](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/ink-wash/demo/ink.js), [wet/dry composition](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/ink-wash/demo/comp.js), [film](https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/ink-wash.mp4).

## World and media

Treat paper as space: unpainted regions can be sky, water, distance or tension. Compose foreground ink mass, softer middle distance and pale remote forms before adding detail. Large empty areas are useful when they clarify scale and action, not as a percentage quota. A distant small subject is legitimate if its action remains intelligible.

## Object identity

Keep a recognizable silhouette, accent, anatomy or anchor mark across views. Define an object-local model or pose set; do not invent a new character at each timestamp. In a seed story, preserve the seed body and attachment structure during travel, landing and growth. Texture belongs to the same object while it deforms.

## Camera

Use scroll-like travel through one landscape, a decisive close view, a return to the same wide composition, or a pullback revealing the painting as a whole. A cut can concentrate attention before action. Camera motion may continue smoothly while the pose is held; it need not always move. Avoid treating every empty region as a place to put a caption.

## Actions and consequences

Build a readable sequence: anticipation/hold → decisive motion → delayed physical consequence → observation or return. The main action must alter the world. A seed can land and an anchored shoot appear through explicitly poetic time compression; indefinite graceful drifting alone does not complete that story.

Separate object pose sampling from translation, camera and spreading ink. A 12 fps pose layer with a 24/30 fps camera is a stylistic option, not a universal output setting. Express a short action with a strong silhouette rather than interpolating every joint continuously. Do not impose springs.

## Transitions

Use a motivated hard cut, continuing river/terrain, paper exposure, ink spread, or a return to an earlier viewpoint. Let the old landscape remain spatially accountable. An ink blot wipe must have material behavior and purpose; it cannot rescue unrelated shots automatically.

## Material implementation

Construct the form from pressure-varying strokes and ink masses. For a brush path, resample by arc length, build pressure widths and normals, then separate a dark core, selected bristle gaps and a restrained wet edge. Anchor noise to stroke ID, normalized arc position and a fixed reference length so dry gaps do not crawl as the pose changes.

Give wet and dry layers distinct behavior: wet ink can spread or gather at edges; dry ink skips paper tooth. Dark near forms need actual filled weight, not many thin parallel lines. Paper fibers must not swim with the camera. A blurred vector silhouette plus paper overlay is an approximation, not a fluid-ink simulation.

## Text

Use sparse, composed text as a seal, inscription or quiet reading layer. Chinese typesetting is acceptable; do not label it calligraphy or brush writing without actual stroke support. Avoid persistent caption boxes that occupy all the reserved paper. Essential text still needs real glyph and mobile-readability checks.

## Audio and silence

Sparse plucked, breath-like, wood or water sounds may suit the scene if original or licensed; cultural instrument labels require truthful sourcing. Tie a contact or stroke to its visual event. Stillness and silence are valid expressive states. Declare whether a hold excludes voice only, retains ambience, or mutes every bus. Do not reject this style for a low motion ratio or near-silence.

## Forbidden cases and checks

- Pale pencil-like lines everywhere: review full composition plus close brush crops for weight hierarchy
- Uniform dotted gaps sold as dry brush: inspect their irregularity and dependence on pressure/material
- Texture crawling over a held body: compare neighboring pose and camera frames
- Beautiful motion without outcome: compare the world's before/after state
- Premature consequence: verify impact precedes splash, separation, growth or displacement
- Generic electronic whoosh on every brush action: listen; a waveform alone cannot judge the timbre
- Claiming realistic botany from a poetic seed-to-shoot jump: disclose time compression and illustration

Review three scales: overall ink/space balance, subject silhouette/action, and brush texture. Include the quiet hold, decisive action, consequence and return. Do not “fix” stillness by adding motion everywhere.

For the bundled seed example, use `--style ink --font-family "Noto Serif CJK SC"` with the shared runtime. Its generic default font is Sans and would otherwise override the authored Serif choice. Match the font and source hash in the example status when reproducing reviewed pixels.

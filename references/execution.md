# Execution and capability adaptation

Read before building. This contract is runtime-neutral: Python/SVG, Canvas, HTML, WebGL, or another code renderer may implement it. Do not switch an explicitly selected environment. Nothing here authorizes paid API use, installation, publication, or access to a different computer.

A text-generation endpoint alone cannot execute this workflow. The necessary file, code, render and actual-image-review harness is described in [model-harness.md](model-harness.md); no specific model SDK is required.

## Capability ledger

Record each capability as available, tested, unavailable, or unverified, with the command or tool evidence. A tool name in a prompt is not availability evidence.

- Files and execution: an authorized writable workspace and a runnable interpreter
- Rendering: evaluate an arbitrary time and obtain actual pixels at the intended dimensions
- Determinism: random seeds, fonts and assets can be pinned; no required wall-clock state
- Text: intended font file available under a usable license; actual-language shaping and coverage tests
- Encoding: known video encoder, full decode check, rational frame rate, audio mux if needed
- Review: actual image inspection; temporal playback; actual audio listening. These are separate capabilities
- Data and claims: sources can be read and checked, or synthetic/example status can be visibly disclosed
- Delegation: independent agents are optional; use them when available, never claim independence when the same author self-reviews

Missing encoder: provide verified frames and source as a preview, not a finished video. Missing image inspection: technical rendering may proceed, but visual acceptance is pending. Missing audio listening: report numerical audio checks without calling the mix approved. Missing glyph-stroke data: use ordinary Chinese typesetting. Missing specialist 3D or fluid tools: choose an honest original approximation and state its scope.

Use the dependencies already available when suitable. Check renderer/font behavior with a tiny output before a long job. Do not install a full toolchain merely because a reference project uses it. A skill package is portable guidance, not a guarantee that every engine dependency is installed.

## Shared pure-time contract

The logical interface is `render(t, scene, assets, seed, layout) -> pixels or renderable scene`. Existing simple examples may expose `render(t)` and keep the other inputs in immutable module constants. Freeze these inputs in the run record.

- Use absolute seconds; frames are sampled at `t = frame_index / fps`
- Use a half-open encoded timeline `[0, duration)` and an explicit frame count. Choose duration × fps to be integral or disclose rounding; do not silently append a duplicate end frame
- Evaluate state analytically from time or immutable precomputed trajectories. Calling time B before time A must not change the output at A
- No wall-clock animation, stateful incremental integration, time-seeded randomness, or residual canvas state
- Clear or fully repaint the target. Save/restore transformations, clips, alpha and blend state around each object
- Give every persistent object a stable ID; derive texture noise from ID and stable local/world coordinates
- Quantized pose time is allowed per style. For example, ink poses may update at 12 fps while camera and diffusion update at output rate; do not quantize the whole movie by accident
- Wait for fonts and assets before recording. Use explicit missing-asset errors rather than silently blank objects
- State output dimensions, color assumptions, fps, total frames, rasterizer/encoder versions and font resolution. Pixel hashes are comparable only under a pinned environment

## Space and typography

Separate object-local, world, camera and screen coordinates. Give every label an explicit anchor space. Camera motion should reveal a relationship or action; it is not a mandatory decoration.

Design each target ratio with its own layout and camera targets. Compare wide and phone-size outputs. A small world overview can summarize structure without making every label readable, provided the essential conclusion has a separate readable anchor. Do not let decorative titles monopolize every frame.

Font checks have three separate stages: resolved file, glyph/shaping coverage, and actual rendered appearance. A successful font lookup does not prove which face the final rasterizer used. Test Chinese punctuation and full strings, not just individual characters. Never bundle a system font without redistribution rights.

## Shared events, separate aesthetics

Use named events such as `pen-down`, `object-arrival`, `data-reencode`, `decision`, `consequence`, and `reading-hold` to synchronize visual and audio schedules. These are examples, not a closed enum.

Audio events specify time, duration, source or synthesis parameters, gain, intended bus, and any voice exclusion interval. Resolve every sample license. Distinguish no voice, quiet ambience, low measured level, and exact all-bus silence. A music bed must not defeat an intended silence. No shared rule requires springs, constant motion, a minimum motion percentage, or constant sound.

## Roles when multiple agents are available

- Director: owns audience, factual story, protagonist, style choice, camera logic and signature action
- Builder: implements the approved scope with explicit contracts; may propose stronger scene geometry rather than merely fill cards
- Technical QA: checks deterministic execution, complete frames, assets, fonts, timing and measurable defects
- Independent visual reviewer: receives the brief, facts, style constraints, actual frames and playback evidence first; does not receive the author's rationale or previous scores

A small task may combine the first three roles. Preserve independent review when quality claims depend on it. With one agent, label self-review and request human visual review if needed. Stronger models are useful for genuinely underdetermined visual decisions, but model brand is not a substitute for observed quality.

Give builders bounded tasks with an acceptance artifact: a brush test, a legible prism action, a persistent object morph, a 3-second camera bridge. Record who changed what. Repair the smallest root cause, then rerender its affected interval and relevant regression frames; never pass a fix on source inspection alone.

## Runtime integration

The verified local runtime, if packaged, is described in [runtime-adapter.md](runtime-adapter.md). Follow only commands actually provided there. When moving the Skill, resolve paths relative to its folder and copy only licensed required files. If the adapter or engine is absent, implement this contract using the available engine; do not pretend a placeholder command ran.

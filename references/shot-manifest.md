# Open shot manifest

Use this as an interchange contract, not a limited scene generator. A shot is any drawn scene or program with a timed purpose. Do not require a `type` chosen from title/card/chart/outro. Renderers may consume a manifest directly or adapt it explicitly; do not claim native support without testing.

The machine-readable shape is [shot.schema.json](shot.schema.json); a small self-contained illustrative scene is [open-shot.json](../examples/open-shot.json). The example demonstrates geometry and interface freedom, not an accepted production film. This schema permits arbitrary extension fields at every creative layer.

## Required information

- Film: identity, duration, fps, output dimensions, primary style and seed
- Sources: facts, assets, licenses and illustrative-data disclosures
- Objects: stable ID, meaning, invariant identity, allowed state changes
- Shots: ID and `[start,end)` interval; intention; visible subject IDs; before/after state; camera with coordinate space and reason; action; reading windows; sound/silence; draw code
- QA targets: significant events and reading holds that need actual-pixel inspection

A shot's draw code declares a language, entrypoint, and inline code or a relative artifact path. Arbitrary functions, paths, shaders, meshes and data mappings are allowed. A shared compiler need not understand every creative field. An adapter must explicitly report any unsupported field rather than dropping it silently.

Resolve code paths relative to the project, inspect unfamiliar code before running it, and keep generated execution within the authorized workspace. JSON schema validation is not a sandbox, a license check, or proof that code is safe or correct.

## Continuity semantics

Before and after states should describe visible changes, not adjectives. “Seed airborne” → “same seed anchored, shoot emerging” is useful; “cinematic” → “more cinematic” is not. An intentional hold may preserve state while establishing tension or reading; at least the story's decisive action needs a meaningful consequence.

An object can change representation while retaining an ID. Derived objects record parentage. An actual population change needs an explicit operation, not fake conservation. Camera fields can hold 2D transforms, 3D camera parameters, a path or a custom function reference. Specify the anchor space of captions separately.

## Timing semantics

A named event is a shared visual/audio anchor. Reading windows belong to settled readable states, not entrance animations. An event can specify pose time separately from output time. Declare intentional silence by bus; `voice` exclusion and `all` silence mean different things.

Shots may overlap for a deliberate transition. The renderer must define compositing/precedence explicitly. Record transitions and continuity anchors in those overlap intervals. Unexplained gaps and accidental duplicate event playback are defects.

Do not force equal shot durations, fixed shot counts, a constant camera, universal text placement, mandatory narration, or one transition between every pair of ideas.

## Package linter scope

`python3 scripts/validate_package.py --manifest path/to/film.json` checks the keyword subset used by the bundled schema, stable IDs, code-artifact containment/existence full timeline coverage, and conventional event/audio time fields against film duration. Code artifacts resolve relative to the manifest file. Author a hold for an intended pause; if a real unrendered/blank interval is intentional, declare `intentional_gaps` entries with numeric `start`, `end` and a nonempty `reason`. The linter does not execute draw code, prove compositing, or perform visual review. Overlaps still require a documented transition/compositor in the render implementation.

## Verify manual manifest-to-code mapping

This package's runtime does not interpret the manifest. Maintain an implementation map from each shot/event to its code time condition or function, stable IDs and expected before/after values. Test the scene immediately before, on and after every significant boundary; check reading-window strings and camera/annotation state during holds. For quantitative scenes, independently recompute facts and check the actual generated geometry. A valid JSON manifest and a working render are insufficient if they describe different films. The dataviz example supplies a scoped checker of its six-shot boundaries and value projection.

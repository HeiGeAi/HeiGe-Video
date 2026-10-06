# Models, coding agents and the execution harness

A bare text-model API is not a coding agent or a video runtime. A model can propose code; a harness must make the files, run that code in an authorized environment, render pixels, collect errors and return evidence for revision. This Skill supplies instructions and a local renderer, not those capabilities inside every model endpoint.

## Minimum workable setup

- A caller can load the relevant Skill files and brief into context
- An executor can write/review source, run Python or Canvas and the renderer, and read resulting files
- A reviewer can actually inspect rendered images. A text-only model needs a separate vision-capable reviewer or a human; textual QA logs do not replace looking
- Temporal and audio acceptance additionally need actual playback/listening. If absent, deliver sampled-image acceptance with those dimensions still untested

A coding-agent harness with these capabilities can use the existing CLI without any model-specific SDK. A text-only API can participate through explicit export/import, but cannot independently close the visual acceptance loop. Capability support and quality parity remain separate claims.

## Offline prompt export / reviewed response import

From the Skill folder, create a plain-text brief that specifies subject, audience, duration, ratio, language, facts and intended deliverable, then run:

```sh
python3 scripts/export_prompt.py --style dataviz --brief brief.txt --out prompt-export.json
```

This local helper outputs only a `messages` array containing the selected style, actual runtime adapter, exact shot schema, quality instructions and brief. The default authoring target is self-contained Python `render(t)` returning complete SVG, not an arbitrary image object. It has no endpoint, model identifier, credentials, network code, SDK, automatic spend or agent-execution permissions. It reports character count; check the selected provider's actual context/token budget before submitting. It does not include the full 58-case research ledger or pretend relative links are loaded automatically.

A caller that already has an authorized OpenAI-compatible Chat Completions setup can use this messages array in its own request, supplying its real model identifier and supported limits. Check that provider's current interface and role support; “compatible” is not a guarantee of feature equivalence. OpenAI's [Chat API reference](https://developers.openai.com/api/reference/resources/chat) documents its own message-based interface. This package makes no request itself.

For import, save the model's returned source and manifest as separate project files after reviewing them. Validate the manifest, inspect any code/imports and external-resource assumptions, then use `runtime/render_video.py audit` and `frame --source` before a full render. Return actual error logs and viewed frame findings to the model for a bounded repair. Do not execute arbitrary prose, shell blocks or claimed “QA passed” text from a model response.

If the endpoint cannot see images, route the decoded frames to the actual reviewer and return timestamped observations. Record whose judgments produced the accepted result. A mixed text-model/builder/vision-reviewer workflow is not evidence that the text model alone achieved the quality.

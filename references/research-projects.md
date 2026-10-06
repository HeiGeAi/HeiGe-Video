# 100-project source index

50 agent/authoring/orchestration projects and 50 render/motion/QA projects, counted once per canonical repository. Some are instruction/specification skills, not executable engines. Targeted primary-source paths were inspected; no third-party project was installed, built or run. A linked demo is not evidence that this source researcher watched it.

The [machine-readable ledger](research-projects.json) records inspected source paths, license qualifications and implementation limits. These are ideas to assess, not 100 added dependencies.

## A001 · [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar)

- Role: Code-directed short-film library
- Transfer: Use centerline densification, equal-arc resampling, seeded pressure profiles and separate wet/dry stroke layers; expose shared action events so sound follows the picture. Director treatment separates story choice from demo imitation.
- Limit: Asset and film rights remain separate; medium-specific geometry costs more than generic fades. Author labels demos Opus 5.5, unverified here.
- License: MIT
- Inspected: [DIRECTOR.md](https://github.com/lemomo-ai/lemo-opuscar/blob/main/DIRECTOR.md), [styles/ink-wash/demo/ink.js](https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/ink-wash/demo/ink.js), [core/render/events.mjs](https://github.com/lemomo-ai/lemo-opuscar/blob/main/core/render/events.mjs)

## A002 · [Kianzzz/xilo-opus-video](https://github.com/Kianzzz/xilo-opus-video)

- Role: Multi-direction motion-film skill
- Transfer: Separate three concepts by visual language and narrative structure, then make a real 2–4 second motion specimen for motion-dependent ideas. Renderer uses window.render(t), fonts readiness, subframe sampling and partial-range export.
- Limit: Workflow spec cannot enforce aesthetic quality; rendering backend needs actual browser/ffmpeg verification. README's Opus 5.5 attribution is author-supplied.
- License: MIT
- Inspected: [skills/xilo-opus-video/references/plan-format.md](https://github.com/Kianzzz/xilo-opus-video/blob/main/skills/xilo-opus-video/references/plan-format.md), [skills/xilo-opus-video/scripts/render.py](https://github.com/Kianzzz/xilo-opus-video/blob/main/skills/xilo-opus-video/scripts/render.py)

## A003 · [Mort1d/motion-graphics-skills](https://github.com/Mort1d/motion-graphics-skills)

- Role: Picture-and-score coded-motion toolkit
- Transfer: One timeline defines BPM-derived seconds, scene overlap windows, energy labels, named motion/sound cues and fast-motion sampling windows. Plan checker flags long event gaps and malformed scene windows before rendering.
- Limit: Promotional rhythm defaults are genre-specific; plan checks inspect declarations, not whether rendered movement actually communicates.
- License: MIT
- Inspected: [skills/motion-graphics/assets/template/js/timeline.mjs](https://github.com/Mort1d/motion-graphics-skills/blob/main/skills/motion-graphics/assets/template/js/timeline.mjs), [skills/motion-graphics/assets/template/tools/plan-check.mjs](https://github.com/Mort1d/motion-graphics-skills/blob/main/skills/motion-graphics/assets/template/tools/plan-check.mjs)

## A004 · [JakeB-5/motion-graphic-skill](https://github.com/JakeB-5/motion-graphic-skill)

- Role: Single-file canvas authoring with independent critique
- Transfer: Capture scene35%/85% states, phone-size sheets and12-frame cut strips; compare forward/reverse timestamp hashes to catch stateful draws. Keep evidence-backed fatal defects distinct from subjective scores.
- Limit: Sampled sheets miss some temporal/audio issues; a full playback still matters. Reviewer grades are judgments, not objective quality proof.
- License: MIT
- Inspected: [skills/motion-graphic/references/critique.md](https://github.com/JakeB-5/motion-graphic-skill/blob/main/skills/motion-graphic/references/critique.md), [skills/motion-graphic/scripts/check.js](https://github.com/JakeB-5/motion-graphic-skill/blob/main/skills/motion-graphic/scripts/check.js)

## A005 · [browser-use/video-use](https://github.com/browser-use/video-use)

- Role: Agent-directed footage editing helpers
- Transfer: Pack transcript words into timestamped phrases by silence/speaker; preserve exact word boundaries in an EDL. Render graded segments with short audio fades, output-offset subtitles and explicit overlay timing.
- Limit: Requires media/transcription stack; preset typography and grading should be adapted to target platform. Not an original motion-design engine.
- License: MIT
- Inspected: [helpers/pack_transcripts.py](https://github.com/browser-use/video-use/blob/main/helpers/pack_transcripts.py), [helpers/render.py](https://github.com/browser-use/video-use/blob/main/helpers/render.py), [helpers/grade.py](https://github.com/browser-use/video-use/blob/main/helpers/grade.py)

## A006 · [HKUDS/VideoAgent](https://github.com/HKUDS/VideoAgent)

- Role: Intent-to-tool-graph video editing orchestrator
- Transfer: Map intent labels to registered tools, generate and critique a graph, then execute explicit upstream-output/downstream-input links. Editing consumes beat or sentence timestamp intervals and storyboard sections.
- Limit: Research framework includes heavy third-party model code with separate licenses. Tool graph validation is not proof of resulting visual quality.
- License: MIT
- Inspected: [environment/agents/multi.py](https://github.com/HKUDS/VideoAgent/blob/main/environment/agents/multi.py), [environment/roles/vid_editor.py](https://github.com/HKUDS/VideoAgent/blob/main/environment/roles/vid_editor.py)

## A007 · [HKUDS/ViMax](https://github.com/HKUDS/ViMax)

- Role: Structured script-to-video multi-agent pipeline
- Transfer: Typed shots specify camera identity, first/last-frame states, visible character IDs and degree/reason of change. Generate related shots through camera dependencies with existing-asset reuse and progress events.
- Limit: Image/video providers remain required for that pipeline; portable lesson is continuity/state contracts, not its generative-model output quality.
- License: MIT
- Inspected: [interfaces/shot_description.py](https://github.com/HKUDS/ViMax/blob/main/interfaces/shot_description.py), [pipelines/script2video_pipeline.py](https://github.com/HKUDS/ViMax/blob/main/pipelines/script2video_pipeline.py)

## A008 · [HITsz-TMG/VideoClaw](https://github.com/HITsz-TMG/VideoClaw)

- Role: Intervenable multistage filmmaking workbench
- Transfer: Storyboard validation checks every source action/dialogue unit appears once in order, prohibits cross-scene segments and enforces entry placement/duration. Continuity patches target exact segment/shot IDs; six-stage status separates waiting/running/completed.
- Limit: Includes FilmAgent assets/code, so not all content is independently novel. Large stateful pipeline and provider dependencies need runtime audit.
- License: MIT
- Inspected: [video-claw/video-claw/backend/core/orchestrator.py](https://github.com/HITsz-TMG/VideoClaw/blob/main/video-claw/video-claw/backend/core/orchestrator.py), [video-claw/video-claw/backend/core/agents/storyboard_agent.py](https://github.com/HITsz-TMG/VideoClaw/blob/main/video-claw/video-claw/backend/core/agents/storyboard_agent.py)

## A009 · [diffusionstudio/agent](https://github.com/diffusionstudio/agent)

- Role: Browser-editor agent with visual-feedback tool
- Transfer: Editor exposes asset upload plus composition-code evaluation; visual feedback returns typed issues with frame number, suggested fix and goal-specific Boolean checks over sampled images.
- Limit: Critic samples every30frames and can miss between-sample defects; hard-coded30fps assumptions and hosted/provider dependencies need adaptation.
- License: MIT
- Inspected: [src/tools/video_editor.py](https://github.com/diffusionstudio/agent/blob/main/src/tools/video_editor.py), [src/tools/visual_feedback.py](https://github.com/diffusionstudio/agent/blob/main/src/tools/visual_feedback.py)

## A010 · [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage)

- Role: Agentic production pipelines and artifact schemas
- Transfer: Planning scorer makes repeated shot sizes, text-card dominance, missing shot intent and unsupported cinematic labels inspectable; frame-rounded step tracing checks narration landmarks and scene overflow.
- Limit: AGPL-3.0 requires separate reuse review. Scorer is declaration-based and gameable: use it only as a planning lint, never a visual-quality score.
- License: AGPL-3.0
- Inspected: [lib/slideshow_risk.py](https://github.com/calesthio/OpenMontage/blob/main/lib/slideshow_risk.py), [lib/verify_scene_pacing.py](https://github.com/calesthio/OpenMontage/blob/main/lib/verify_scene_pacing.py), [schemas/artifacts/proposal_packet.schema.json](https://github.com/calesthio/OpenMontage/blob/main/schemas/artifacts/proposal_packet.schema.json)

## A011 · [Agentchengfeng/chengfeng-videocut-skills](https://github.com/Agentchengfeng/chengfeng-videocut-skills)

- Role: Transcript-based editing and driven overlay skills
- Transfer: Judge speech cuts in playback order, distinguishing removed speech from compressed silence. Overlays receive seek(time,duration,cues,zoom) and pin actions to actual words instead of distributing time evenly.
- Limit: README warns new skills require capabilities beyond current public runtime. Some bundled workbench/style sources are imported; compatibility must be tested.
- License: Apache-2.0
- Inspected: [plugins/chengfeng-videocut/skills/chengfeng-cut/references/semantic-deletion.md](https://github.com/Agentchengfeng/chengfeng-videocut-skills/blob/main/plugins/chengfeng-videocut/skills/chengfeng-cut/references/semantic-deletion.md), [plugins/chengfeng-videocut/skills/chengfeng-visual/references/visual-module-contract.md](https://github.com/Agentchengfeng/chengfeng-videocut-skills/blob/main/plugins/chengfeng-videocut/skills/chengfeng-visual/references/visual-module-contract.md)

## A012 · [video-db/Director](https://github.com/video-db/Director)

- Role: Registry-based video agents with editing tool interface
- Transfer: Register agents behind a common response/status interface, run a bounded reasoning loop and publish progress. Editing separates media verification from generated timeline-code execution.
- Limit: Depends on VideoDB/cloud services. Timeline classes in the editing prompt are API exemplars with pass bodies, not a local render-engine implementation.
- License: MIT
- Inspected: [backend/director/core/reasoning.py](https://github.com/video-db/Director/blob/main/backend/director/core/reasoning.py), [backend/director/agents/editing/agent.py](https://github.com/video-db/Director/blob/main/backend/director/agents/editing/agent.py)

## A013 · [TIGER-AI-Lab/TheoremExplainAgent](https://github.com/TIGER-AI-Lab/TheoremExplainAgent)

- Role: Research system for narrated mathematical explanations
- Transfer: Persist per-scene storyboard, technical plan and trace ID; retrieve stage-relevant Manim docs; distinguish compilation-error repair from visual reflection on an image/video.
- Limit: LLM/runtime cost and factual correctness need separate tests; vision inputs and supported media vary by provider. Paper results were not reproduced.
- License: MIT
- Inspected: [src/core/video_planner.py](https://github.com/TIGER-AI-Lab/TheoremExplainAgent/blob/main/src/core/video_planner.py), [src/core/code_generator.py](https://github.com/TIGER-AI-Lab/TheoremExplainAgent/blob/main/src/core/code_generator.py)

## A014 · [krillinai/OpenCreator](https://github.com/krillinai/OpenCreator)

- Role: Creator workspace with typed jobs and timelines
- Transfer: Represent draft/technical-preview/completed/stale artifacts separately, including unknown remote acceptance. Timeline asserts contiguous shot/caption frames, exact total and required asset paths.
- Limit: Its sampled stickman motion consists of static/pan/zoom transforms, not rich motion grammar; valuable reliability contracts should not be confused with style quality.
- License: Apache-2.0
- Inspected: [packages/stickman-remotion/src/timeline.ts](https://github.com/krillinai/OpenCreator/blob/master/packages/stickman-remotion/src/timeline.ts), [packages/protocol/src/creator.ts](https://github.com/krillinai/OpenCreator/blob/master/packages/protocol/src/creator.ts)

## A015 · [heygen-com/skills](https://github.com/heygen-com/skills)

- Role: Provider-specific avatar-video agent skills
- Transfer: Inspect source aspect ratio and avatar type before selecting reframing/background corrections; keep exact on-screen strings as a separate literal-text contract from creative style instructions.
- Limit: Docs-only provider workflow, not local rendering code. Automatic defaults in source are not adopted; generation requires service permission and budget.
- License: MIT
- Inspected: [heygen-video/references/frame-check.md](https://github.com/heygen-com/skills/blob/master/heygen-video/references/frame-check.md), [heygen-video/references/prompt-craft.md](https://github.com/heygen-com/skills/blob/master/heygen-video/references/prompt-craft.md)

## A016 · [nyosegawa/skills](https://github.com/nyosegawa/skills)

- Role: Remotion promotional-video workflow skill
- Transfer: Choose proof scenes by app type; express timing in seconds then integer frames. Compute duration minus transition overlap and preserve readable plateaus rather than only entrance/exit fades.
- Limit: Counted only the original promo-workflow skill, not mirrored reference packs. Heuristics are prompt guidance, not enforced visual success.
- License: MIT
- Inspected: [skills/remotion-promo-video-factory/SKILL.md](https://github.com/nyosegawa/skills/blob/main/skills/remotion-promo-video-factory/SKILL.md), [skills/remotion-promo-video-factory/references/timeline-and-motion.md](https://github.com/nyosegawa/skills/blob/main/skills/remotion-promo-video-factory/references/timeline-and-motion.md)

## A017 · [veedstudio/open-edit](https://github.com/veedstudio/open-edit)

- Role: Agent-facing typed media-editing CLI
- Transfer: Snap kept ranges to source frame grids, seek coarse per-input then trim precisely; mix audio tails so picture duration stays fixed. Frame extraction records frame index, seconds and exact rational frame rate.
- Limit: Needs ffmpeg/browser toolchain; technical seam correctness does not create strong scene direction. Some service commands are provider-specific.
- License: Apache-2.0
- Inspected: [cli/src/commands/apply-edl.ts](https://github.com/veedstudio/open-edit/blob/main/cli/src/commands/apply-edl.ts), [cli/src/commands/frames.ts](https://github.com/veedstudio/open-edit/blob/main/cli/src/commands/frames.ts)

## A018 · [burningion/pydantic-video-editing-agent](https://github.com/burningion/pydantic-video-editing-agent)

- Role: Typed agent prototype for sourced edits and voiceover
- Transfer: Separate search and editing agents with VideoList/VideoEdit output schemas and request limits; voiceover edit uses measured asset duration as explicit total-duration contract.
- Limit: No root license observed; research-only. Fixed topical prompts, external services and unsafe-to-adopt downloader defaults need replacement; no cheap-model experiment performed.
- License: not verified
- Inspected: [agent.py](https://github.com/burningion/pydantic-video-editing-agent/blob/main/agent.py), [voice-overlay.py](https://github.com/burningion/pydantic-video-editing-agent/blob/main/voice-overlay.py)

## A019 · [FujiwaraChoki/MoneyPrinter](https://github.com/FujiwaraChoki/MoneyPrinter)

- Role: Stock-footage short-video automation
- Transfer: Keep generation jobs, cancellation, attempts, scripts and artifact metadata in persistent records; use cancellation checks between provider/media stages and deduplicate stock-video URLs.
- Limit: Stock montage baseline is not motion-design parity. Optional publishing exists but is outside this research. Related lineage to Turbo is acknowledged.
- License: MIT
- Inspected: [Backend/pipeline.py](https://github.com/FujiwaraChoki/MoneyPrinter/blob/main/Backend/pipeline.py), [Backend/models.py](https://github.com/FujiwaraChoki/MoneyPrinter/blob/main/Backend/models.py)

## A020 · [linyqh/NarratoAI](https://github.com/linyqh/NarratoAI)

- Role: Narration-from-video analysis pipeline
- Transfer: Cache sampled frames by source modification/interval; bound parallel visual batches with semaphores, retain failed-batch receipts and sort observations back into chronological narration input.
- Limit: Sparse keyframes can miss actions; model observations must remain uncertain evidence. No film-demo URL confirmed in sampled README links.
- License: MIT
- Inspected: [app/services/documentary/frame_analysis_service.py](https://github.com/linyqh/NarratoAI/blob/main/app/services/documentary/frame_analysis_service.py), [app/services/generate_narration_script.py](https://github.com/linyqh/NarratoAI/blob/main/app/services/generate_narration_script.py)

## A021 · [gyoridavid/short-video-maker](https://github.com/gyoridavid/short-video-maker)

- Role: MCP/REST short-video assembly service
- Transfer: Validate a structured scene list, generate voice first, transcribe captions, choose duration/orientation-matched stock and avoid reused stock IDs before rendering.
- Limit: Queue source contains a mutex TODO and stores active jobs in memory; provider/model assets and film quality were not tested.
- License: MIT
- Inspected: [src/short-creator/ShortCreator.ts](https://github.com/gyoridavid/short-video-maker/blob/main/src/short-creator/ShortCreator.ts), [src/server/validator.ts](https://github.com/gyoridavid/short-video-maker/blob/main/src/server/validator.ts)

## A022 · [nexu-io/html-video](https://github.com/nexu-io/html-video)

- Role: Agent-facing HTML video with swappable renderers
- Transfer: Pause CSS/Web Animations and GSAP clocks inside iframe content, seek all to frame/fps, and gate capture on actual body content plus font readiness. Validate engine/source capabilities before export.
- Limit: External styles/fonts and exotic animation APIs still need testing; clock adapter is infrastructure, not a substitute for original directing.
- License: Apache-2.0
- Inspected: [packages/adapter-remotion/src/bridge/HtmlFrameDriver.tsx](https://github.com/nexu-io/html-video/blob/main/packages/adapter-remotion/src/bridge/HtmlFrameDriver.tsx), [packages/adapter-hyperframes/src/validate.ts](https://github.com/nexu-io/html-video/blob/main/packages/adapter-hyperframes/src/validate.ts)

## A023 · [Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer)

- Role: Narrated technical-explainer workflow
- Transfer: Carry one example and recurring object through chapters; split shots by visual unit rather than sentence. QC samples beat onset offsets and requires action during narration plus a stable readable ending hold.
- Limit: Toolkit license explicitly restricts commercial use; research-only unless licensed. Fixed visual style and declared timing rules must not be adopted as universal aesthetics.
- License: custom noncommercial toolkit license
- Inspected: [SKILL.md](https://github.com/Vincentwei1021/anything2explainer/blob/main/SKILL.md), [examples/rag/AGENT_RAG_QC_RULES.md](https://github.com/Vincentwei1021/anything2explainer/blob/main/examples/rag/AGENT_RAG_QC_RULES.md)

## A024 · [gnipbao/story-to-handdrawn-video](https://github.com/gnipbao/story-to-handdrawn-video)

- Role: Story-to-illustrated-page motion skill and renderer
- Transfer: Separate real approved master artwork from manifests and derived plates; hash style references/palette into identity. Preserve full pages for curls, or align text/BW/color layers for reveal.
- Limit: Layer reveals do not reconstruct physical drawing strokes; image-generation glyph/identity quality needs actual inspection. Silent picture track is default.
- License: MIT
- Inspected: [scripts/story-to-video.mjs](https://github.com/gnipbao/story-to-handdrawn-video/blob/main/scripts/story-to-video.mjs), [DESIGN.md](https://github.com/gnipbao/story-to-handdrawn-video/blob/main/DESIGN.md)

## A025 · [harry0703/MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)

- Role: Short-video workflow with local revision rendering
- Transfer: Build a pure dependency graph with hashed audio/timing/scene/assembly/export stages; validate output bytes and dependency receipts before cache reuse. BGM changes invalidate export without rerendering scenes.
- Limit: Independent non-fork implementation with MoneyPrinter lineage; source audit does not establish source originality for all assets. Local mode still requires prepared media.
- License: MIT
- Inspected: [app/services/video_project.py](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/app/services/video_project.py), [app/services/task_artifacts.py](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/app/services/task_artifacts.py)

## A026 · [machina-exm/film-studio-skills](https://github.com/machina-exm/film-studio-skills)

- Role: Model-configurable preproduction skill chain
- Transfer: Store canonical asset identity separately from scene action; version state variants and test angle/lighting/pairing matrices before marking assets locked for dependent scenes.
- Limit: No root license observed; research-only concepts. Ten-of-ten generated-image rule is a workflow gate, not statistical evidence of consistency.
- License: not verified
- Inspected: [skills/asset-passport/SKILL.md](https://github.com/machina-exm/film-studio-skills/blob/main/skills/asset-passport/SKILL.md), [skills/stress-test/SKILL.md](https://github.com/machina-exm/film-studio-skills/blob/main/skills/stress-test/SKILL.md)

## A027 · [0x68616F4C/auto-popsci](https://github.com/0x68616F4C/auto-popsci)

- Role: Manim plus narration synchronization skill
- Transfer: Measure narration segments, log actual renderer timestamps when subtitles appear, let animations run during speech, then pad only remaining duration; concatenate silent scenes and mix audio once at absolute offsets.
- Limit: No root license observed; research-only. Documentation's general claims about Manim audio were not independently confirmed; fallback character estimates are weaker than measurement.
- License: not verified
- Inspected: [docs/sync-architecture.md](https://github.com/0x68616F4C/auto-popsci/blob/main/docs/sync-architecture.md), [examples/euler-identity/animation/base.py](https://github.com/0x68616F4C/auto-popsci/blob/main/examples/euler-identity/animation/base.py)

## A028 · [bassimeledath/manimate](https://github.com/bassimeledath/manimate)

- Role: Natural-language Manim authoring skill with examples
- Transfer: Infer scene parameters, build shared primitives and validate assets/layout before final render. Binary-search example makes the same array cells carry meaning through narrowing search bounds.
- Limit: Skill is extensive but source presence is not successful rendering; examples depend on generated shared.py and platform font availability.
- License: MIT
- Inspected: [SKILL.md](https://github.com/bassimeledath/manimate/blob/main/SKILL.md), [examples/binary_search.py](https://github.com/bassimeledath/manimate/blob/main/examples/binary_search.py)

## A029 · [gajananpp/manim-agent](https://github.com/gajananpp/manim-agent)

- Role: Chat-to-Manim executor prototype
- Transfer: Wrap generated code in a typed tool, assign a unique work directory, report start/running/completed via SSE, collect render logs and return a video only after output discovery.
- Limit: Docker use here is not a verified hardened sandbox: no audited CPU/memory/network controls. Regex scene-class extraction is fragile; needs safer execution policy.
- License: MIT
- Inspected: [agents/executor/chain.ts](https://github.com/gajananpp/manim-agent/blob/main/agents/executor/chain.ts), [agents/executor/tools/execute-code.ts](https://github.com/gajananpp/manim-agent/blob/main/agents/executor/tools/execute-code.ts)

## A030 · [chenwr727/AI-Short-Video-Engine](https://github.com/chenwr727/AI-Short-Video-Engine)

- Role: Article-to-dialogue short-video workflow
- Transfer: Parse speaker/dialogue/paragraph schemas, split speech at punctuation, persist measured TTS durations and match material searches to those durations through provider-specific adapters.
- Limit: No root license observed; research-only. Cache reuse is filename-based and can be stale after script/config changes; stock montage is not coded-motion parity.
- License: not verified
- Inspected: [schemas/video.py](https://github.com/chenwr727/AI-Short-Video-Engine/blob/main/schemas/video.py), [services/video.py](https://github.com/chenwr727/AI-Short-Video-Engine/blob/main/services/video.py)

## A031 · [FireRedTeam/FireRed-OpenStoryline](https://github.com/FireRedTeam/FireRed-OpenStoryline)

- Role: Agent-assisted footage editing with a separate timeline planner and MoviePy rendering node
- Transfer: TimelinePlanner.plan accepts media, clips, groups, group_scripts, voiceovers, background_music and use_beats, then returns video/subtitles/voiceover/bgm tracks. Beat allocation weights clips by source duration, repairs integer rounding, applies a minimum clip length, snaps ends to beat boundaries and carries residual timing. Transfer the model-free track IR and beat allocator into v3 before engine-specific rendering.
- Limit: The inspected render pipeline concatenates non-overlapping segments and fills gaps with black; it is footage-editing logic rather than a composited motion renderer; Beat allocation and source-window assumptions need adversarial duration tests; no such tests were run; Apache-2.0 source license does not automatically cover every media/model dependency
- License: Apache-2.0
- Inspected: [src/open_storyline/nodes/core_nodes/plan_timeline.py](https://github.com/FireRedTeam/FireRed-OpenStoryline/blob/main/src/open_storyline/nodes/core_nodes/plan_timeline.py), [src/open_storyline/nodes/core_nodes/render_video.py](https://github.com/FireRedTeam/FireRed-OpenStoryline/blob/main/src/open_storyline/nodes/core_nodes/render_video.py)

## A032 · [GVCLab/CutClaw](https://github.com/GVCLab/CutClaw)

- Role: Music-synchronized selection and editing of shots from long source videos
- Transfer: ParallelShotOrchestrator extracts used source time ranges, detects overlaps against already-kept shots and within each parallel batch, and reruns losers with forbidden ranges. Its explicit tie score is 0.6 protagonist ratio + 0.4 duration fit. Reviewer.review returns approved/feedback/issues/suggestions after duration and overlap checks. Transfer conflict resolution and structured failure feedback to scene-generation workers.
- Limit: Footage-retrieval quality depends on VLM/LLM services, while the reusable scheduling checks do not; A review pass here is not proof of aesthetics: content/emotion/narrative checks in the inspected review method remain TODO; No repository root license file was observed; treat as research reference pending rights clarification
- License: not verified
- Inspected: [src/core.py](https://github.com/GVCLab/CutClaw/blob/main/src/core.py), [src/Reviewer.py](https://github.com/GVCLab/CutClaw/blob/main/src/Reviewer.py)

## A033 · [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)

- Role: Product-film shot recipe library, reference implementations, camera/motion helpers and a multi-stage authoring skill
- Transfer: Motion helpers compute central-difference velocity from posAt(frame±dt), stateless lag via stateAt(frame-delayFrames), and closed-form damped settling. Camera Rig interpolates position/look/FOV between typed CamKeyframes using the local Remotion frame. Root skill adds recipe-name resolution through gallery/api/library.json, exact-demo-source lookup, product-token reskinning, beat-based timing and independent final review. Transfer pure frame functions and recipe-to-reference traceability.
- Limit: motion.ts explicitly attributes disney-animation-rule-skill and camera.tsx attributes a template-film source; do not count these helpers as novel independent algorithms; Camera helper uses React Three Fiber useFrame and mutates camera state, so its random-seek behavior needs testing before porting; Assets and Remotion/Three dependencies need their own license/provenance checks
- License: Apache-2.0
- Inspected: [assets/lib/helpers/motion.ts](https://github.com/Vincentwei1021/video-shotcraft/blob/main/assets/lib/helpers/motion.ts), [assets/lib/helpers/camera.tsx](https://github.com/Vincentwei1021/video-shotcraft/blob/main/assets/lib/helpers/camera.tsx), [SKILL.md](https://github.com/Vincentwei1021/video-shotcraft/blob/main/SKILL.md)

## A034 · [wshuyi/remotion-video-skill](https://github.com/wshuyi/remotion-video-skill)

- Role: Remotion authoring skill with TTS-driven scene timing and tutorial/3D patterns
- Transfer: SceneConfig fixes id/title/durationInFrames/audioFile; getSceneStart prefix-sums durations and TOTAL_FRAMES sums all scenes with a 60-frame tail. Skill sections make generated audio duration the timing source, render each scene in its own Sequence, and recommend direct scene-specific camera positioning. Transfer a single frame-duration manifest shared by voice, subtitles and visuals.
- Limit: Template hardcodes 30fps and a 60-frame tail; v3 should derive these from a validated output contract; Long prose/examples do not prove production robustness; No root license observed; TTS vendor/engine paths are optional dependencies, not evidence of model-free operation
- License: not verified
- Inspected: [SKILL.md](https://github.com/wshuyi/remotion-video-skill/blob/main/SKILL.md), [templates/audioConfig.ts](https://github.com/wshuyi/remotion-video-skill/blob/main/templates/audioConfig.ts)

## A035 · [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit)

- Role: Agent-directed video production toolkit with audio timing and narration quality utilities
- Transfer: sync_timing matches audio to scene manifests in three passes: exact audioFile name, numbered index, then type/name match, retaining unmatched scenes explicitly. pacing strips pause/SSML/tone markup before words-per-minute measurement, labels only clips with at least six words, and applies a bounded pitch-preserving atempo correction with a 0.85 floor. Transfer audio-duration reconciliation and pace QC as deterministic post-provider steps.
- Limit: Heuristic fallback matching can pair the wrong audio; require explicit IDs in v3 and expose match_method; English whitespace word counts do not directly measure Chinese narration pace; The broader toolkit includes paid/cloud generative services and borrowed official Remotion skill material; inspected utilities do not require a particular authoring model
- License: MIT
- Inspected: [tools/sync_timing.py](https://github.com/digitalsamba/claude-code-video-toolkit/blob/main/tools/sync_timing.py), [tools/pacing.py](https://github.com/digitalsamba/claude-code-video-toolkit/blob/main/tools/pacing.py)

## A036 · [runesleo/claude-video-kit](https://github.com/runesleo/claude-video-kit)

- Role: Auditable vertical explainer workflow with machine-checkable pre-render gates
- Transfer: check_storyboard requires motion-storyboard/v1, unique scene IDs, purpose/metaphor/why-motion fields, positive durations, motion grammar, and 3D justification; it limits generic-only/card-like scenes to max(1,floor(n*.25)). check_gate compares required visual types against script.json, separating charts from tables/formulas. Transfer intent-specific mandatory visuals and anti-slide-deck checks into v3’s storyboard schema.
- Limit: Keyword/type checks can be gamed by plausible labels without actual visual execution; The prose gate parser recognizes particular Chinese phrases/table syntax and silently has no constraints when absent; Fixed 25% heuristics need task-dependent configuration rather than universal aesthetic authority
- License: MIT
- Inspected: [scripts/check_gate.py](https://github.com/runesleo/claude-video-kit/blob/main/scripts/check_gate.py), [scripts/check_storyboard.py](https://github.com/runesleo/claude-video-kit/blob/main/scripts/check_storyboard.py)

## A037 · [AgriciDaniel/claude-shorts](https://github.com/AgriciDaniel/claude-shorts)

- Role: Long-video to vertical-short workflow with boundary repair and reframing
- Transfer: snap_boundaries normalizes word timestamps and prefers nearby sentence starts, sentence endings and silence midpoints. compute_reframe emits explicit crop/crop_keyframes; cursor-driven x positions are clamped to valid crops and deduplicated at a 2%-crop-width movement threshold. Transfer safe speech cuts and declarative crop keyframes for v3 footage inserts.
- Limit: Face-track path actually averages detected face centers for a static crop; do not claim continuous speaker tracking from this routine; Sentence heuristics are punctuation/language dependent and silence detection can move narrative boundaries; Useful for footage adaptation, not an original coded-motion scene engine
- License: MIT
- Inspected: [scripts/snap_boundaries.py](https://github.com/AgriciDaniel/claude-shorts/blob/main/scripts/snap_boundaries.py), [scripts/compute_reframe.py](https://github.com/AgriciDaniel/claude-shorts/blob/main/scripts/compute_reframe.py)

## A038 · [howseen-ai/claude-motion-design](https://github.com/howseen-ai/claude-motion-design)

- Role: Pure-code HTML motion-film workflow with frame seeking and reference-remake QA
- Transfer: SHOT({id,f0,f1,render(lf,F)}) registers sorted shot intervals; window.seek(t) computes F=round(t*24), selects a half-open interval, calls a pure HTML-producing renderer and replaces the stage. Helpers implement piecewise keyframes, closed-form springs, seeded hash randomness, camera transforms and pixel dissolves. QA pairs ref/ours per second, samples seam neighbors and scans old-brand colors. Transfer seekable shot IR plus boundary-focused contact sheets.
- Limit: 24fps, 1920×1080 and Howseen brand tokens/QA frame numbers are hardcoded; Stage innerHTML replacement may be expensive; font/assets and temporal antialiasing need a render-ready contract; Source comments reference a brand remake; copying branded assets is separate from adapting the motion mechanism
- License: MIT
- Inspected: [skill/motion-design/scripts/remake/core.js](https://github.com/howseen-ai/claude-motion-design/blob/main/skill/motion-design/scripts/remake/core.js), [skill/motion-design/scripts/remake/remake_qa.py](https://github.com/howseen-ai/claude-motion-design/blob/main/skill/motion-design/scripts/remake/remake_qa.py)

## A039 · [BayramAnnakov/remotion-video-director](https://github.com/BayramAnnakov/remotion-video-director)

- Role: Creative-direction and multi-expert review skill layered over Remotion APIs
- Transfer: Four phases separate strategic framing, scenario design, build and review. Expert lenses map purpose/audience to focused checks such as hook clarity, UI authenticity, data hierarchy, animation restraint and config reuse. Skill creates a prioritized scorecard and asks for specific scene corrections before rerendering. Transfer roles as test dimensions in a review packet, without pretending role-play is independent empirical validation.
- Limit: Prescriptive styles and repeated interactive pauses may overfit one creator’s workflow; Scores can be generated from prose unless supplied actual rendered evidence; No root license observed; official Remotion skill is a separate referenced dependency
- License: not verified
- Inspected: [SKILL.md](https://github.com/BayramAnnakov/remotion-video-director/blob/main/SKILL.md), [references/expert-definitions.md](https://github.com/BayramAnnakov/remotion-video-director/blob/main/references/expert-definitions.md)

## A040 · [EveryInc/product-launch-video](https://github.com/EveryInc/product-launch-video)

- Role: Short product-launch video authoring/review skill with a minimal Remotion starter
- Transfer: Skill grounds UI labels in actual product recordings, plans shot beats before code, loads fonts behind delayRender/continueRender, centralizes crossfades, checks one frame per scene, then uses four visual-review lenses. Starter exposes frame/fps and a clamped opacity interpolation. Transfer evidence-grounded UI copy, font-ready barriers and per-aspect-ratio compositions.
- Limit: No substantive finished product-film implementation is shipped in the inspected starter; Platform duration tables and engagement statistics are unverified author claims and should not become v3 constants; Four reviewers are process advice, not a tested quality guarantee
- License: MIT
- Inspected: [.claude/skills/product-launch-video/SKILL.md](https://github.com/EveryInc/product-launch-video/blob/main/.claude/skills/product-launch-video/SKILL.md), [src/LaunchVideo.tsx](https://github.com/EveryInc/product-launch-video/blob/main/src/LaunchVideo.tsx)

## A041 · [Zane-0x5a/remotion-director](https://github.com/Zane-0x5a/remotion-director)

- Role: Agent-directed motion film creation with rendered-pixel temporal review and a design-blind critic loop
- Transfer: buildReview decodes rendered pixels, 4× mean-pools grayscale to suppress grain, computes worst 8×8-block change at frame and 0.5-second scales, applies hysteresis to still/slow/motion segments, and extracts calm settle frames plus fixed-time overviews. Critic protocol hides code/design notes, requests timestamped pixel-grounded phenomena, distinguishes transitions from settled layout, and reconciles fixed/persistent/regressed issues. Transfer render-only QA artifacts and version-bound critique.
- Limit: Motion/blank/flash thresholds are heuristics and can penalize intentional holds or abstract flat scenes; Whole-video buffers can be memory-heavy for long clips; Critic convergence is judgment, not correctness; source notes a Python prototype port and plugin-path duplicates should count once
- License: MIT
- Inspected: [claude-plugin/skills/critic-loop/CRITIC-PROTOCOL.md](https://github.com/Zane-0x5a/remotion-director/blob/master/claude-plugin/skills/critic-loop/CRITIC-PROTOCOL.md), [tools/time-overview.ts](https://github.com/Zane-0x5a/remotion-director/blob/master/tools/time-overview.ts)

## A042 · [AmazingAng/ccvideo](https://github.com/AmazingAng/ccvideo)

- Role: Truthful terminal/session and social-profile promo-video props generation
- Transfer: buildBeatsDetailed selects bounded event types (one code block, up to two tool lines, a real-output run, two summary bullets) and returns used raw events. buildReplayProps deterministically turns these into intro/session/outro props. verify-props rebuilds props from raw artifacts, recursively finds the first differing JSON path, and rejects sample captures by default. Transfer traceable visible claims and immutable source-to-visual derivation.
- Limit: Semantic truth of raw source is not verified; exact rebuild only proves consistency; Aggressive truncation and variety-first selection can remove context; Captured transcripts may contain private data; use a sanitized dedicated capture interface, never automatically publish session contents
- License: MIT
- Inspected: [scripts/lib/replay-build.mjs](https://github.com/AmazingAng/ccvideo/blob/main/scripts/lib/replay-build.mjs), [scripts/verify-props.mjs](https://github.com/AmazingAng/ccvideo/blob/main/scripts/verify-props.mjs)

## A043 · [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill)

- Role: Manim scene composition skill and CE/GL best-practice examples
- Transfer: Composer produces scenes.md with per-scene purpose, objects, camera, narration, technical dependencies and continuity. Example uses ValueTracker as one numeric driver, always_redraw to bind geometry/labels to state, and updater cleanup. Transfer semantic scene planning and dependency binding; convert cumulative dt animation to absolute-frame state for v3 seeking.
- Limit: updater_patterns.py explicitly says adapted from 3b1b patterns; do not claim those primitives as independently invented; Some examples accumulate dt rotation or TracedPath history, which is not random-access deterministic without a replay/closed-form adaptation; Manim CE and GL API differences still require renderer-specific validation
- License: MIT
- Inspected: [skills/manim-composer/SKILL.md](https://github.com/adithya-s-k/manim_skill/blob/main/skills/manim-composer/SKILL.md), [skills/manimce-best-practices/examples/updater_patterns.py](https://github.com/adithya-s-k/manim_skill/blob/main/skills/manimce-best-practices/examples/updater_patterns.py)

## A044 · [mathifylabs/ManimAgentPrompts](https://github.com/mathifylabs/ManimAgentPrompts)

- Role: Versioned Manim code-generation prompts focused on layout-safe animation
- Transfer: Prompt0 defines file/tool/output contracts. Prompt23 introduces safe regions, text-length limits, role-based vertical bands, relative grouping, title clearance and a layout-debug protocol. Its String.raw template preserves LaTeX backslashes unlike prompt22’s ordinary template. Transfer versioned generation constraints into a compiler prompt plus independently executable layout checks.
- Limit: Prompts call themselves compiler specifications but no mechanical proof of layout compliance is implemented in inspected files; Prompt22/23 differ only by String.raw and must not count as separate project/mechanism evidence; Global refactor permissions in the text are too broad for arbitrary user projects; v3 needs explicit preservation constraints
- License: MIT
- Inspected: [system-prompts/manim-prompt-0.ts](https://github.com/mathifylabs/ManimAgentPrompts/blob/main/system-prompts/manim-prompt-0.ts), [system-prompts/manim-prompt-22.ts](https://github.com/mathifylabs/ManimAgentPrompts/blob/main/system-prompts/manim-prompt-22.ts), [system-prompts/manim-prompt-23.ts](https://github.com/mathifylabs/ManimAgentPrompts/blob/main/system-prompts/manim-prompt-23.ts)

## A045 · [eduly-ai/eduly](https://github.com/eduly-ai/eduly)

- Role: Document-to-atomic-topic-to-storyboard-to-Manim coding agent
- Transfer: Models separate AtomicTopic, Breakdown, Scene visual_description/narration, TopicStoryboard and AnimationResult. Client creates a filesystem-backed coding agent per topic, renders scene.py, appends renderer stderr to message history on failure, retries to max_iterations, and returns source/video/error/iteration artifacts. Transfer provider-independent staged contracts and bounded diagnostic repair, reimplemented without copying NC code for commercial v3.
- Limit: CC-BY-NC-SA-4.0 root license is restrictive; this is not a permissive OSS dependency; The current breakdown stage uses Gemini; the animation client accepts a LangChain model but render output-path assumptions are fixed; Success detection checks for an MP4, not rendered visual/semantic quality; generated Python execution would require isolation; no execution occurred here
- License: CC-BY-NC-SA-4.0
- Inspected: [src/eduly/client.py](https://github.com/eduly-ai/eduly/blob/main/src/eduly/client.py), [src/eduly/models.py](https://github.com/eduly-ai/eduly/blob/main/src/eduly/models.py)

## A046 · [paulnegz/manim-mcp](https://github.com/paulnegz/manim-mcp)

- Role: ManimGL coding agent/MCP service with generated-code validation
- Transfer: ParameterValidator represents API signatures and validation issues, supports ChromaDB-backed signature retrieval plus fallback CE→GL parameter mappings, and detects immediate methods passed incorrectly to self.play and suspicious updater calls. Layout validator tracks used screen regions, adds buffers and AST-detects multiple unpositioned shapes. Transfer renderer capability schemas and preflight AST linting; retain explicit evidence for every repair.
- Limit: Regex relocation can change intended composition; region occupancy is not actual geometric collision detection; Injected safe_position helper alone does not establish that call sites use it; Model/RAG/index dependencies and generated-code sandbox need separate inspection before any deployment
- License: MIT
- Inspected: [manim_mcp/core/layout_validator.py](https://github.com/paulnegz/manim-mcp/blob/main/manim_mcp/core/layout_validator.py), [manim_mcp/core/param_validator.py](https://github.com/paulnegz/manim-mcp/blob/main/manim_mcp/core/param_validator.py)

## A047 · [FavioVazquez/showtime](https://github.com/FavioVazquez/showtime)

- Role: Cross-agent video-authoring suite with browser capture and rendered text/layout auditing
- Transfer: textSnapshot produces blocks/leaves with actual glyph ink bounds, transformed font scale, opacity, clipping, off-canvas status, overlaps and SVG crowded-label pairs; caption read-opacity and moving/decorative tags prevent naive false positives. Browser capture uses aspect-aware viewports and fail-closed private-host/download guards. Transfer machine-readable render-time layout evidence and aspect-specific capture contracts.
- Limit: DOM/SVG metrics cannot see all raster/canvas semantic problems; pairwise checks are capped and heuristic; Capturing a live site needs consent/data controls and cannot assume mutable pages are deterministic; Author benchmark and agent-compatibility claims are not tests performed in this audit
- License: MIT
- Inspected: [skills/showtime/scripts/lib/capture.mjs](https://github.com/FavioVazquez/showtime/blob/main/skills/showtime/scripts/lib/capture.mjs), [skills/showtime/scripts/lib/audit.mjs](https://github.com/FavioVazquez/showtime/blob/main/skills/showtime/scripts/lib/audit.mjs)

## A048 · [ApliroAI/manim-video-lab](https://github.com/ApliroAI/manim-video-lab)

- Role: Portable directing contract and gates for mathematical/technical Manim videos
- Transfer: Director packet ties stable object/symbol IDs, beat contracts, focus handoffs, camera/play/hold plans, payoff frames and layout-motion IR to source anchors. Preflight specifies prompt-object preservation, semantic-collapse blockers, known-ID assertions, protected zones and rerender-after-fix acceptance. Transfer these as v3 scene IR fields and compile selected predicates (visible/no_overlap/within_lane/keep_color) into executable tests.
- Limit: Documented predicates do not implement their own evaluator; do not claim automatic validation; Large packet can overburden trivial clips; retain a small-scene path; References explicitly say adapted from a Text2Animation production workflow; treat as a distinct portable skill, not a novel renderer
- License: MIT
- Inspected: [references/director-packet.md](https://github.com/ApliroAI/manim-video-lab/blob/main/references/director-packet.md), [references/preflight-gates.md](https://github.com/ApliroAI/manim-video-lab/blob/main/references/preflight-gates.md)

## A049 · [techdou/remotion-video](https://github.com/techdou/remotion-video)

- Role: SRT-to-Remotion project service with provider interfaces and scene-plan validation
- Transfer: validate-scene-plan requires meaningful card fields and beat actions, checks integer in-range contiguous segment indices, and enforces complete unique coverage of every segment and scene ID. Provider interface exposes capabilities/test/execute, accepts AbortSignal and progress callbacks, and returns artifacts/error. Transfer exact coverage invariants and provider-independent execution results into v3.
- Limit: Type/coverage correctness does not verify visual quality or script fidelity; Base interface alone does not prove provider interchangeability at runtime; README credits adaptation from YangAgent’s workflow; bundled Remotion rules are not an independent animation engine
- License: MIT
- Inspected: [scripts/validate-scene-plan.js](https://github.com/techdou/remotion-video/blob/main/scripts/validate-scene-plan.js), [server/core/providers/base.ts](https://github.com/techdou/remotion-video/blob/main/server/core/providers/base.ts)

## A050 · [Altrym/motion-studio](https://github.com/Altrym/motion-studio)

- Role: Remotion-oriented authoring skill with shared learning from categorized edit corrections
- Transfer: Root SKILL establishes enriched brief→scene/assets→central timeline→render/review and a correction feedback loop. sync.sh captures at most 80 lines of git diff, requests classification, caches offline fallback, and pulls community patterns with confirmation counts. classify-local scores category keywords and summarizes the first added/removed lines. Transfer only an opt-in, local-first correction taxonomy and reviewable rule candidates.
- Limit: No root license observed for original orchestration; THIRD_PARTY_NOTICES grants MIT only for imported Hermes directories; Default hook sends diffs to a third-party API and sync can auto-install newer bundles; neither is suitable to copy into v3 unattended; Keyword frequency/confirmation count is not proof that a motion rule improves outcomes; imported p5 renderer disables web security and uses timed fallback, so it should not be adopted as-is
- License: not verified
- Inspected: [SKILL.md](https://github.com/Altrym/motion-studio/blob/main/SKILL.md), [scripts/sync.sh](https://github.com/Altrym/motion-studio/blob/main/scripts/sync.sh), [scripts/classify-local.py](https://github.com/Altrym/motion-studio/blob/main/scripts/classify-local.py), [THIRD_PARTY_NOTICES.md](https://github.com/Altrym/motion-studio/blob/main/THIRD_PARTY_NOTICES.md), [creative/p5js/scripts/export-frames.js](https://github.com/Altrym/motion-studio/blob/main/creative/p5js/scripts/export-frames.js)

## R001 · [remotion-dev/remotion](https://github.com/remotion-dev/remotion)

- Role: React-authored programmatic video
- Transfer: Make frame number and fps the clock; gate capture on asset readiness; separate frame rendering from encoding and audio assembly. Adopt this contract without importing framework code.
- Limit: Special source-available license, Chromium/runtime overhead, and no automatic art direction. A successful render is not a quality verdict.
- License: LicenseRef-Remotion
- Inspected: [packages/core/src/spring/index.ts](https://github.com/remotion-dev/remotion/blob/HEAD/packages/core/src/spring/index.ts), [packages/renderer/src/render-frames.ts](https://github.com/remotion-dev/remotion/blob/HEAD/packages/renderer/src/render-frames.ts)

## R002 · [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas)

- Role: Narrated explanatory 2D animation
- Transfer: Generators compose concurrent all() and delayed sequence() actions; Layout delegates measurement to browser layout. Compile authored action groups into deterministic channels and overlap entrances instead of serial card fades.
- Limit: Mostly a vector-explainer aesthetic; generator state must be reconstructed for arbitrary seeks. Browser/editor/export dependencies are optional, not a mandatory v3 stack.
- License: MIT
- Inspected: [packages/core/src/flow/all.ts](https://github.com/motion-canvas/motion-canvas/blob/HEAD/packages/core/src/flow/all.ts), [packages/core/src/flow/sequence.ts](https://github.com/motion-canvas/motion-canvas/blob/HEAD/packages/core/src/flow/sequence.ts), [packages/2d/src/lib/components/Layout.ts](https://github.com/motion-canvas/motion-canvas/blob/HEAD/packages/2d/src/lib/components/Layout.ts)

## R003 · [ManimCommunity/manim](https://github.com/ManimCommunity/manim)

- Role: Precise mathematical and diagram animation
- Transfer: Transform aligns source/target point structures, then interpolates with chosen paths; camera, scene, and animation are separate layers. Reuse object identity and meaningful transformations across shots.
- Limit: Specialized math vocabulary; LaTeX/Pango/toolchain cost. Related historically to ManimGL but maintained independently with a different engine and API.
- License: MIT
- Inspected: [manim/animation/transform.py](https://github.com/ManimCommunity/manim/blob/HEAD/manim/animation/transform.py), [manim/scene/scene.py](https://github.com/ManimCommunity/manim/blob/HEAD/manim/scene/scene.py)

## R004 · [3b1b/manim](https://github.com/3b1b/manim)

- Role: Creator-oriented math animation engine
- Transfer: TransformMatchingParts matches shapes and text substrings so semantic elements survive a transition; camera pipeline handles depth and multisample render targets. Prefer identity-preserving chart/word transformations to dissolve-and-replace.
- Limit: Independent descendant of the original Manim lineage; not counted as an interchangeable clone. Shader/GPU environment and source compatibility differ from Manim Community.
- License: MIT
- Inspected: [manimlib/animation/transform_matching_parts.py](https://github.com/3b1b/manim/blob/HEAD/manimlib/animation/transform_matching_parts.py), [manimlib/camera/camera.py](https://github.com/3b1b/manim/blob/HEAD/manimlib/camera/camera.py)

## R005 · [motiondivision/motion](https://github.com/motiondivision/motion)

- Role: DOM and React animation primitives
- Transfer: Sequence compilation resolves absolute/relative offsets, subject-dependent delay, and property keyframes into one schedule. Use explicit channel offsets and measured layout transitions for dense product UI choreography.
- Limit: Interactive defaults can depend on wall clock or layout state. Offline export must drive all progress explicitly; React is unnecessary for a minimal HTML renderer.
- License: MIT
- Inspected: [packages/framer-motion/src/animation/sequence/create.ts](https://github.com/motiondivision/motion/blob/HEAD/packages/framer-motion/src/animation/sequence/create.ts)

## R006 · [greensock/GSAP](https://github.com/greensock/GSAP)

- Role: General-purpose timed property animation
- Transfer: Timeline seek immediately renders nested tweens; labels, overlap positions, path motion and CustomEase provide deliberate choreography. Keep a paused timeline and sample exact times; choose a different motion profile per object role.
- Limit: Custom no-charge license is not MIT; restrictions cover certain competing visual animation builders. Do not silently vendor it into an MIT-distributed skill.
- License: LicenseRef-GSAP
- Inspected: [src/gsap-core.js](https://github.com/greensock/GSAP/blob/HEAD/src/gsap-core.js), [src/CustomEase.js](https://github.com/greensock/GSAP/blob/HEAD/src/CustomEase.js)

## R007 · [juliangarnier/anime](https://github.com/juliangarnier/anime)

- Role: Small animation engine for timelines and easing
- Transfer: Timeline labels resolve placement; spring parameters expose mass, stiffness, damping, velocity and perceived duration. A small seekable timeline can retain these controls without pulling in a full video framework.
- Limit: Browser tween scheduling still needs deterministic seeking. Spring overshoot is a tool, not a default for every headline or data value.
- License: MIT
- Inspected: [src/timeline/timeline.js](https://github.com/juliangarnier/anime/blob/HEAD/src/timeline/timeline.js), [src/easings/spring/index.js](https://github.com/juliangarnier/anime/blob/HEAD/src/easings/spring/index.js)

## R008 · [theatre-js/theatre](https://github.com/theatre-js/theatre)

- Role: Editable high-fidelity keyframe sequences
- Transfer: Sequence.position is clamped and forwarded to a playback controller; typed object properties stay separate from the renderer. Store keyframe channel data independently so agent revisions can alter timing without rebuilding visual assets.
- Limit: Core is Apache-2.0, Studio is AGPL-3.0; public README says next-version development temporarily private. Do not assume the visual editor has the core license.
- License: Apache-2.0 AND AGPL-3.0-only
- Inspected: [packages/core/src/sequences/Sequence.ts](https://github.com/theatre-js/theatre/blob/HEAD/packages/core/src/sequences/Sequence.ts), [packages/core/LICENSE](https://github.com/theatre-js/theatre/blob/HEAD/packages/core/LICENSE), [packages/studio/LICENSE](https://github.com/theatre-js/theatre/blob/HEAD/packages/studio/LICENSE)

## R009 · [airbnb/lottie-web](https://github.com/airbnb/lottie-web)

- Role: Render authored vector-animation assets
- Transfer: goToAndStop() and subframe control enable exact frame selection from a loaded animation; reusable authored assets can supply complex icon detail instead of hand-coding primitive stand-ins.
- Limit: Runtime license does not license each animation asset. Requires compatible authored JSON; unsupported After Effects effects and asset/font loading must be tested.
- License: MIT
- Inspected: [player/js/animation/AnimationItem.js](https://github.com/airbnb/lottie-web/blob/HEAD/player/js/animation/AnimationItem.js), [player/js/renderers/SVGRendererBase.js](https://github.com/airbnb/lottie-web/blob/HEAD/player/js/renderers/SVGRendererBase.js)

## R010 · [LottieFiles/dotlottie-web](https://github.com/LottieFiles/dotlottie-web)

- Role: Bundled vector animations with themes and markers
- Transfer: setFrame() asks the WASM core to render synchronously; setSegment() and named assets allow one canonical asset to appear in several narrative roles. Consider only when a licensed .lottie asset exists.
- Limit: WASM/backends and file compatibility require verification; state machines and embedded audio add state. The library does not author premium animation from scratch.
- License: MIT
- Inspected: [packages/web/src/dotlottie.ts](https://github.com/LottieFiles/dotlottie-web/blob/HEAD/packages/web/src/dotlottie.ts), [packages/web/README.md](https://github.com/LottieFiles/dotlottie-web/blob/HEAD/packages/web/README.md)

## R011 · [svgdotjs/svg.js](https://github.com/svgdotjs/svg.js)

- Role: Structured SVG nodes and animation
- Transfer: Timeline.time() and explicit scheduling provide a retained object model instead of rebuilding huge SVG strings. Useful for precise path drawing and connected diagram transforms.
- Limit: Does not add realistic light, 3D occlusion, texture quality, or editorial composition; browser-specific SVG behavior differs from librsvg.
- License: MIT
- Inspected: [src/animation/Timeline.js](https://github.com/svgdotjs/svg.js/blob/HEAD/src/animation/Timeline.js), [src/animation/Runner.js](https://github.com/svgdotjs/svg.js/blob/HEAD/src/animation/Runner.js)

## R012 · [thednp/kute.js](https://github.com/thednp/kute.js)

- Role: Morph and draw SVG paths
- Transfer: Cubic morphing converts paths into curves and equalizes segment structures before interpolation. Normalize path topology once and animate a real shape transformation rather than scaling arbitrary primitives.
- Limit: Path winding, multiple contours, unequal semantic parts and text glyphs require review; automatic morphing can make visually meaningless intermediates.
- License: MIT
- Inspected: [src/components/svgMorph.js](https://github.com/thednp/kute.js/blob/HEAD/src/components/svgMorph.js), [src/components/svgCubicMorph.js](https://github.com/thednp/kute.js/blob/HEAD/src/components/svgCubicMorph.js)

## R013 · [mojs/mojs](https://github.com/mojs/mojs)

- Role: Shape bursts, paths and chained motion
- Transfer: Timeline add()/append() distinguishes simultaneous and sequential animation; swirl paths provide overshoot and arc-driven accents. Use brief, localized emphasis around an earned reveal.
- Limit: Decorative bursts are easy to overuse and can reduce editorial seriousness. Must replace realtime progress with sampled progress for export.
- License: MIT
- Inspected: [src/tween/timeline.babel.js](https://github.com/mojs/mojs/blob/HEAD/src/tween/timeline.babel.js), [src/shape-swirl.babel.js](https://github.com/mojs/mojs/blob/HEAD/src/shape-swirl.babel.js)

## R014 · [d3/d3](https://github.com/d3/d3)

- Role: Data-driven scales, shapes and geometry
- Transfer: Separate data-to-mark geometry from animation; calculate scales once per shot and interpolate semantic values/positions explicitly. Use shape/scale modules only as needed for accurate chart reveals.
- Limit: Top-level repository aggregates subpackages; this entry inspects API/export declarations, not every algorithm. Realtime D3 transitions must not drive offline capture.
- License: ISC
- Inspected: [API.md](https://github.com/d3/d3/blob/HEAD/API.md), [package.json](https://github.com/d3/d3/blob/HEAD/package.json)

## R015 · [airbnb/visx](https://github.com/airbnb/visx)

- Role: Composable React chart and text primitives
- Transfer: Text creates tspans from measured wordsByLines and explicit line-height/anchor parameters; LinePath separates curve geometry from presentation. Reuse the measurement contract, not default chart styling.
- Limit: React dependency is optional; examples are data components, not finished films. CJK wrapping and animated label collisions need dedicated checks.
- License: MIT
- Inspected: [packages/visx-text/src/Text.tsx](https://github.com/airbnb/visx/blob/HEAD/packages/visx-text/src/Text.tsx), [packages/visx-shape/src/shapes/LinePath.tsx](https://github.com/airbnb/visx/blob/HEAD/packages/visx-shape/src/shapes/LinePath.tsx)

## R016 · [observablehq/plot](https://github.com/observablehq/plot)

- Role: Concise statistical marks and layout transforms
- Transfer: Dodge computes mark positions with radius-aware padding and anchors; text marks carry explicit alignment and bounds options. Collision-aware placement supports moving annotations and dense data scenes.
- Limit: Usually creates static analytical plots; video choreography, transitions and brand typography are separate work. Do not animate scales misleadingly.
- License: ISC
- Inspected: [src/transforms/dodge.js](https://github.com/observablehq/plot/blob/HEAD/src/transforms/dodge.js), [src/marks/text.js](https://github.com/observablehq/plot/blob/HEAD/src/marks/text.js)

## R017 · [vega/vega](https://github.com/vega/vega)

- Role: Declarative visualization runtime
- Transfer: Render transforms mark dirty items and z-order changes; scenegraph Bounds supports measured collision and clipping analysis. Keep data specification, scene state and renderer independently inspectable.
- Limit: Runtime/dataflow machinery is excessive for simple titles; declarative chart correctness does not create cinematic pacing.
- License: BSD-3-Clause
- Inspected: [packages/vega-view-transforms/src/Render.js](https://github.com/vega/vega/blob/HEAD/packages/vega-view-transforms/src/Render.js), [packages/vega-scenegraph/src/Bounds.js](https://github.com/vega/vega/blob/HEAD/packages/vega-scenegraph/src/Bounds.js)

## R018 · [vega/vega-lite](https://github.com/vega/vega-lite)

- Role: High-level chart grammar compiled to Vega
- Transfer: Compiler normalizes an input spec, builds models and assembles layout/dataflow. A constrained chart schema can prevent inconsistent scales/legends while leaving scene-level animation to the video system.
- Limit: Adds compiler plus Vega runtime; best for complex data stories, not generic motion posters. Distinct specification layer, not an independent renderer.
- License: BSD-3-Clause
- Inspected: [src/compile/compile.ts](https://github.com/vega/vega-lite/blob/HEAD/src/compile/compile.ts), [src/compile/mark/encode/text.ts](https://github.com/vega/vega-lite/blob/HEAD/src/compile/mark/encode/text.ts)

## R019 · [rough-stuff/rough](https://github.com/rough-stuff/rough)

- Role: Seeded hand-drawn SVG and Canvas shapes
- Transfer: Generator separates outline perturbation from hachure fill and exposes seed, roughness and stroke controls. Bake deterministic strokes once per object, then reveal stroke paths across time.
- Limit: Randomizing paths every frame causes boiling noise. Repeating one roughness preset cannot reproduce genuine brush/ink imagery or nuanced whiteboard illustration.
- License: MIT
- Inspected: [src/generator.ts](https://github.com/rough-stuff/rough/blob/HEAD/src/generator.ts), [src/renderer.ts](https://github.com/rough-stuff/rough/blob/HEAD/src/renderer.ts)

## R020 · [rough-stuff/rough-notation](https://github.com/rough-stuff/rough-notation)

- Role: Hand-drawn emphasis attached to DOM text
- Transfer: Annotations measure actual client rectangles and share ordered group timing. Fit an underline/circle to measured text instead of estimating it from string length.
- Limit: Automatically chosen seed and CSS animation must be frozen or adapted for deterministic export; annotations are a supporting device, not a full scene style.
- License: MIT
- Inspected: [src/rough-notation.ts](https://github.com/rough-stuff/rough-notation/blob/HEAD/src/rough-notation.ts)

## R021 · [konvajs/konva](https://github.com/konvajs/konva)

- Role: Retained Canvas shapes, groups and layers
- Transfer: Node stores transforms, composite operations, cached raster bounds and client rectangles. Reuse group transforms, measured bounds and cache invalidation rather than recreating objects per frame.
- Limit: Canvas text/layout is less complete than browser DOM; lighting and true 3D remain out of scope. Keep event/hit-test code out of a render-only path.
- License: MIT
- Inspected: [src/Node.ts](https://github.com/konvajs/konva/blob/HEAD/src/Node.ts), [src/Tween.ts](https://github.com/konvajs/konva/blob/HEAD/src/Tween.ts)

## R022 · [fabricjs/fabric.js](https://github.com/fabricjs/fabric.js)

- Role: Canvas objects, clipping and editable text
- Transfer: StaticCanvas.renderAll() renders retained objects synchronously and cancels a scheduled render; clipPath and object ordering form explicit composition layers. This gives a usable reference for a deterministic asset compositor.
- Limit: Editor/control features are unnecessary for export. Source paths recently moved under packages/core, so old snippets need version pinning.
- License: MIT
- Inspected: [packages/core/src/canvas/StaticCanvas.ts](https://github.com/fabricjs/fabric.js/blob/HEAD/packages/core/src/canvas/StaticCanvas.ts), [packages/core/src/util/animation/animate.ts](https://github.com/fabricjs/fabric.js/blob/HEAD/packages/core/src/util/animation/animate.ts)

## R023 · [pixijs/pixijs](https://github.com/pixijs/pixijs)

- Role: GPU scene graph for textures, masks and effects
- Transfer: Container combines matrix transforms, render groups, masks and filters. Texture-backed objects can make product/UI collages richer and cheaper than thousands of SVG primitives.
- Limit: GPU/backend differences can affect output; text rasterization and filter bounds need QA. A full game-style runtime is unnecessary if DOM/Canvas already satisfies the shot.
- License: MIT
- Inspected: [src/scene/container/Container.ts](https://github.com/pixijs/pixijs/blob/HEAD/src/scene/container/Container.ts), [src/rendering/renderers/autoDetectRenderer.ts](https://github.com/pixijs/pixijs/blob/HEAD/src/rendering/renderers/autoDetectRenderer.ts)

## R024 · [mrdoob/three.js](https://github.com/mrdoob/three.js)

- Role: Cameras, geometry, materials and post-processing
- Transfer: A real scene graph gives perspective, occlusion and light response; UnrealBloomPass extracts highlights then blurs mip levels. Use material/light contrast on meaningful hero objects, not global glow over flat diagrams.
- Limit: Needs a working WebGL path and explicit resource disposal; bloom can destroy text and exposure. Native dependency is absent in current baseline, so compare against installed Blender.
- License: MIT
- Inspected: [src/renderers/WebGLRenderer.js](https://github.com/mrdoob/three.js/blob/HEAD/src/renderers/WebGLRenderer.js), [examples/jsm/postprocessing/UnrealBloomPass.js](https://github.com/mrdoob/three.js/blob/HEAD/examples/jsm/postprocessing/UnrealBloomPass.js)

## R025 · [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber)

- Role: Declarative React scene graph for Three.js
- Transfer: The never frameloop accepts advance(timestamp), updates the scene clock and invokes render subscribers. This is the exact offline control pattern to preserve if integrating React-based 3D scenes.
- Limit: Depends on React plus Three; callbacks that integrate by delta are not automatically random-seek deterministic. Not an additional renderer beyond Three.js.
- License: MIT
- Inspected: [packages/fiber/src/core/loop.ts](https://github.com/pmndrs/react-three-fiber/blob/HEAD/packages/fiber/src/core/loop.ts), [packages/fiber/src/core/store.ts](https://github.com/pmndrs/react-three-fiber/blob/HEAD/packages/fiber/src/core/store.ts)

## R026 · [pmndrs/drei](https://github.com/pmndrs/drei)

- Role: Reusable camera, environment and text helpers
- Transfer: Environment centralizes lighting assets; Float uses bounded sine/cosine rotation and displacement around a parent group. Borrow restrained layered secondary motion, with a fixed seed and explicit phase.
- Limit: Float initializes with Math.random; many helpers assume realtime frames or fetch environment maps. Asset rights and offline availability remain separate.
- License: MIT
- Inspected: [src/core/Float.tsx](https://github.com/pmndrs/drei/blob/HEAD/src/core/Float.tsx), [src/core/Environment.tsx](https://github.com/pmndrs/drei/blob/HEAD/src/core/Environment.tsx)

## R027 · [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)

- Role: Composable Three.js effect passes
- Transfer: EffectComposer uses input/output render targets and ordered buffer swaps; BloomEffect is a controlled effect stage. Represent post-processing as named, parameterized passes and keep color-space/alpha policy explicit.
- Limit: Former vanruesc repository now canonical pmndrs/postprocessing; not the React wrapper. Effect stacking can create banding, halos and cost; use only justified passes.
- License: Zlib
- Inspected: [src/core/EffectComposer.js](https://github.com/pmndrs/postprocessing/blob/HEAD/src/core/EffectComposer.js), [src/effects/BloomEffect.js](https://github.com/pmndrs/postprocessing/blob/HEAD/src/effects/BloomEffect.js)

## R028 · [BabylonJS/Babylon.js](https://github.com/BabylonJS/Babylon.js)

- Role: Integrated browser 3D engine and rendering pipeline
- Transfer: DefaultRenderingPipeline composes bloom, depth-of-field and image processing; animation tracks separate values from the scene. Useful reference for a camera/material/postprocess contract.
- Limit: Larger engine than the immediate 20–60 second need; WebGL/WebGPU and version-specific imports increase dependency cost. Prefer one 3D backend.
- License: Apache-2.0
- Inspected: [packages/dev/core/src/Animations/animation.pure.ts](https://github.com/BabylonJS/Babylon.js/blob/HEAD/packages/dev/core/src/Animations/animation.pure.ts), [packages/dev/core/src/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.pure.ts](https://github.com/BabylonJS/Babylon.js/blob/HEAD/packages/dev/core/src/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.pure.ts)

## R029 · [oframe/ogl](https://github.com/oframe/ogl)

- Role: Small WebGL scene and shader abstraction
- Transfer: Renderer explicitly configures alpha, depth, antialiasing and render target; Post chains full-screen passes. This is a lightweight alternative when one custom shader or simple 3D object justifies WebGL.
- Limit: Lower-level math/shader/resource responsibility stays with the author. README contains Unlicense text; there is no root LICENSE in the inspected tree.
- License: Unlicense
- Inspected: [src/core/Renderer.js](https://github.com/oframe/ogl/blob/HEAD/src/core/Renderer.js), [src/extras/Post.js](https://github.com/oframe/ogl/blob/HEAD/src/extras/Post.js), [examples/post-bloom.html](https://github.com/oframe/ogl/blob/HEAD/examples/post-bloom.html)

## R030 · [regl-project/regl](https://github.com/regl-project/regl)

- Role: Declarative GPU draw commands and framebuffers
- Transfer: Static and dynamic draw state compile to commands; the blur example draws a scene to a framebuffer before a fullscreen filter. Make shader inputs pure functions of time and preallocate buffers.
- Limit: No built-in scene graph or typography; custom GLSL should earn its complexity. API examples use realtime frame callbacks that must be replaced for export.
- License: MIT
- Inspected: [regl.js](https://github.com/regl-project/regl/blob/HEAD/regl.js), [example/blur.js](https://github.com/regl-project/regl/blob/HEAD/example/blur.js)

## R031 · [evanw/glfx.js](https://github.com/evanw/glfx.js)

- Role: Small image-effect shaders
- Transfer: Triangle blur uses two directional passes and premultiplies alpha during sampling. Borrow correct edge/alpha handling for blur, instead of applying a CSS blur blindly to every composited object.
- Limit: Older project; no current compatibility guarantee or ready-made film workflow. Shader effects alone cannot supply a visual concept.
- License: MIT
- Inspected: [src/filters/blur/triangleblur.js](https://github.com/evanw/glfx.js/blob/HEAD/src/filters/blur/triangleblur.js), [src/filters/adjust/unsharpmask.js](https://github.com/evanw/glfx.js/blob/HEAD/src/filters/adjust/unsharpmask.js)

## R032 · [pmndrs/react-spring](https://github.com/pmndrs/react-spring)

- Role: Spring-based property animation
- Transfer: SpringValue advances a mass–tension–friction model and tests precision/velocity thresholds. Establish separate critically damped, soft and elastic motion profiles instead of a single cubic ease.
- Limit: Numerical integration is stateful; arbitrary timestamp rendering needs analytic sampling or deterministic replay. Do not add React solely to acquire a spring.
- License: MIT
- Inspected: [packages/core/src/SpringValue.ts](https://github.com/pmndrs/react-spring/blob/HEAD/packages/core/src/SpringValue.ts)

## R033 · [protectwise/troika](https://github.com/protectwise/troika)

- Role: High-quality signed-distance-field text in Three.js
- Transfer: TextBuilder separates font resolution, shaping and SDF generation in workers, with explicit glyph size/margins and preloading. Keep text sharp under camera motion and wait for glyph readiness before capture.
- Limit: Depends on Three and font resources; dynamic fallback can issue network requests. SDF still needs sensible size, contrast and pixel-level verification for Chinese text.
- License: MIT
- Inspected: [packages/troika-three-text/src/Text.js](https://github.com/protectwise/troika/blob/HEAD/packages/troika-three-text/src/Text.js), [packages/troika-three-text/src/TextBuilder.js](https://github.com/protectwise/troika/blob/HEAD/packages/troika-three-text/src/TextBuilder.js)

## R034 · [opentypejs/opentype.js](https://github.com/opentypejs/opentype.js)

- Role: Font metrics, kerning and glyph paths
- Transfer: getAdvanceWidth() derives from actual glyph advances and kerning; glyph paths support outlined display typography and precise baseline placement. Distinguish ink bounds from advance widths.
- Limit: Complex-script shaping support is not identical to a browser/HarfBuzz stack. Do not split Unicode strings into arbitrary code units for animation.
- License: MIT
- Inspected: [src/font.mjs](https://github.com/opentypejs/opentype.js/blob/HEAD/src/font.mjs), [src/layout.mjs](https://github.com/opentypejs/opentype.js/blob/HEAD/src/layout.mjs)

## R035 · [foliojs/fontkit](https://github.com/foliojs/fontkit)

- Role: Advanced font layout and subset tooling
- Transfer: LayoutEngine accepts script, language and direction, performs glyph substitution, then positioning. Preserve grapheme/glyph clusters and font feature settings in typography measurements.
- Limit: MIT is declared in README/package metadata; no root license text found in inspected tree. For existing browser text, use its shaper rather than installing a duplicate font stack.
- License: MIT
- Inspected: [src/layout/LayoutEngine.js](https://github.com/foliojs/fontkit/blob/HEAD/src/layout/LayoutEngine.js), [src/TTFFont.js](https://github.com/foliojs/fontkit/blob/HEAD/src/TTFFont.js)

## R036 · [harfbuzz/harfbuzz](https://github.com/harfbuzz/harfbuzz)

- Role: Unicode-to-positioned-glyph shaping
- Transfer: hb_shape_full() consumes font, buffer, features and shaper selection; buffers retain glyph positions and clusters. Typography QA should compare shaped output and fallback coverage, not character count alone.
- Limit: Native subsystem already used by many renderers; directly integrating it is usually redundant. Old-MIT core and separately licensed subparts require attention when vendoring.
- License: MIT
- Inspected: [src/hb-shape.cc](https://github.com/harfbuzz/harfbuzz/blob/HEAD/src/hb-shape.cc), [src/hb-buffer.cc](https://github.com/harfbuzz/harfbuzz/blob/HEAD/src/hb-buffer.cc)

## R037 · [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js)

- Role: Scheduled sound synthesis and offline audio
- Transfer: Offline() creates an OfflineContext, runs an async setup callback, renders a buffer, and restores context. Use an event/cue timeline for short tactile sounds, then mix independently from video capture.
- Limit: Synthesized beeps are not a substitute for music selection or sound design. Browser audio clock/autoplay behavior is irrelevant only when rendered offline.
- License: MIT
- Inspected: [Tone/core/context/Offline.ts](https://github.com/Tonejs/Tone.js/blob/HEAD/Tone/core/context/Offline.ts), [Tone/core/clock/Transport.ts](https://github.com/Tonejs/Tone.js/blob/HEAD/Tone/core/clock/Transport.ts)

## R038 · [katspaugh/wavesurfer.js](https://github.com/katspaugh/wavesurfer.js)

- Role: Waveform and region inspection UI
- Transfer: Regions represent start/end intervals over waveform time; envelope and timeline plugins make edit decisions visible. Optional review UI can align words, cuts and sound events on one time axis.
- Limit: Primarily an interactive waveform UI, not an audio renderer or alignment model. No need to ship it in the default offline skill.
- License: BSD-3-Clause
- Inspected: [src/plugins/regions.ts](https://github.com/katspaugh/wavesurfer.js/blob/HEAD/src/plugins/regions.ts), [src/wavesurfer.ts](https://github.com/katspaugh/wavesurfer.js/blob/HEAD/src/wavesurfer.ts)

## R039 · [mifi/editly](https://github.com/mifi/editly)

- Role: Declarative FFmpeg-oriented video assembly
- Transfer: Sources expose readNextFrame(progress); GL source supplies resolution/time uniforms and reads an RGBA framebuffer. A scene-source adapter plus layered clip specification is directly transferable to v3.
- Limit: Fabric/headless GL/native dependencies can be fragile; arbitrary shader source is trusted code. JSON composition is not a quality guarantee.
- License: MIT
- Inspected: [src/index.ts](https://github.com/mifi/editly/blob/HEAD/src/index.ts), [src/sources/title.ts](https://github.com/mifi/editly/blob/HEAD/src/sources/title.ts), [src/sources/gl.ts](https://github.com/mifi/editly/blob/HEAD/src/sources/gl.ts), [examples/README.md](https://github.com/mifi/editly/blob/HEAD/examples/README.md)

## R040 · [FFmpeg/FFmpeg](https://github.com/FFmpeg/FFmpeg)

- Role: Encode, mux, filter and verify audiovisual output
- Transfer: xfade defines timed transition operators; loudnorm accepts measured integrated loudness/true peak for two-pass normalization. Use exact frame-rate math, scene-bound transitions, explicit audio mapping and a separate delivery encode.
- Limit: Mixed LGPL/GPL depending on build options. Filters cannot fix composition or narration; avoid using optical flow to disguise weak animation.
- License: LGPL-2.1-or-later; optional GPL components
- Inspected: [libavfilter/vf_xfade.c](https://github.com/FFmpeg/FFmpeg/blob/HEAD/libavfilter/vf_xfade.c), [libavfilter/af_loudnorm.c](https://github.com/FFmpeg/FFmpeg/blob/HEAD/libavfilter/af_loudnorm.c)

## R041 · [AcademySoftwareFoundation/OpenTimelineIO](https://github.com/AcademySoftwareFoundation/OpenTimelineIO)

- Role: Editorial clip, track and transition representation
- Transfer: Transition duration is in_offset plus out_offset in RationalTime, and tracks expose ranges. Store shot boundaries and overlaps in frames/rational time to prevent accumulated floating-point timing drift.
- Limit: Interchange library does not render media. Full OTIO dependency is optional; a small compatible timing model suffices for a self-contained skill.
- License: Apache-2.0
- Inspected: [src/opentimelineio/track.cpp](https://github.com/AcademySoftwareFoundation/OpenTimelineIO/blob/HEAD/src/opentimelineio/track.cpp), [src/opentimelineio/transition.cpp](https://github.com/AcademySoftwareFoundation/OpenTimelineIO/blob/HEAD/src/opentimelineio/transition.cpp)

## R042 · [Breakthrough/PySceneDetect](https://github.com/Breakthrough/PySceneDetect)

- Role: Detect visual shot changes
- Transfer: ContentDetector compares adjacent hue, saturation, luma and optional edge deltas, with minimum-scene-length controls. Compare detected scene changes with authored cut boundaries to find unintended flashes or missed cuts.
- Limit: Thresholds are content-dependent; a deliberate fast animation may resemble a cut. This is a diagnostic signal, not a cinematic-quality score.
- License: BSD-3-Clause
- Inspected: [scenedetect/detectors/content_detector.py](https://github.com/Breakthrough/PySceneDetect/blob/HEAD/scenedetect/detectors/content_detector.py), [scenedetect/scene_manager.py](https://github.com/Breakthrough/PySceneDetect/blob/HEAD/scenedetect/scene_manager.py)

## R043 · [Netflix/vmaf](https://github.com/Netflix/vmaf)

- Role: Reference-based perceptual video fidelity
- Transfer: VIF extracts information-fidelity features from reference and distorted images at multiple scales. Compare a lossless master with delivery encodes to catch compression damage independently of art direction.
- Limit: Requires a reference and suitable model; high VMAF says nothing about originality, composition or storytelling. Not a score against an unrelated Claude film.
- License: BSD-2-Clause-Patent
- Inspected: [libvmaf/src/feature/vif.c](https://github.com/Netflix/vmaf/blob/HEAD/libvmaf/src/feature/vif.c), [README.md](https://github.com/Netflix/vmaf/blob/HEAD/README.md)

## R044 · [mapbox/pixelmatch](https://github.com/mapbox/pixelmatch)

- Role: Image difference and anti-alias-aware comparison
- Transfer: Pixel comparisons can exclude anti-alias changes and emit a difference mask. Use repeated timestamp captures to detect nondeterminism and inspect approved-frame regressions.
- Limit: A pixel difference is not an aesthetic score; browser/font changes need pinned environments. Mask expected dynamic regions rather than weakening all thresholds.
- License: ISC
- Inspected: [index.js](https://github.com/mapbox/pixelmatch/blob/HEAD/index.js), [test/test.js](https://github.com/mapbox/pixelmatch/blob/HEAD/test/test.js)

## R045 · [microsoft/playwright](https://github.com/microsoft/playwright)

- Role: Deterministic browser control and screenshots
- Transfer: Screenshotter awaits document.fonts.ready and supports transparent backgrounds; snapshot matching handles controlled visual comparisons. Build a local capture harness that awaits scene readiness, calls render(t), checks bounds and captures exact dimensions.
- Limit: Browser version/fonts/graphics backend must be pinned. animations=disabled may alter authored CSS timing; manually seek instead. Playwright does not judge design taste.
- License: Apache-2.0
- Inspected: [packages/playwright-core/src/server/screenshotter.ts](https://github.com/microsoft/playwright/blob/HEAD/packages/playwright-core/src/server/screenshotter.ts), [packages/playwright/src/matchers/toMatchSnapshot.ts](https://github.com/microsoft/playwright/blob/HEAD/packages/playwright/src/matchers/toMatchSnapshot.ts)

## R046 · [libass/libass](https://github.com/libass/libass)

- Role: ASS/SSA subtitles with advanced shaping
- Transfer: Shaper uses HarfBuzz glyph clusters and positions; render pipeline handles ASS styles and placement. Bake captions from one timed text model, verify line breaks and reserve a safe region.
- Limit: ASS positioning differs from browser text; embedding system fonts without checking rights is separate. Karaoke effects should not compete with a typographic hero.
- License: ISC
- Inspected: [libass/ass_shaper.c](https://github.com/libass/libass/blob/HEAD/libass/ass_shaper.c), [libass/ass_render.c](https://github.com/libass/libass/blob/HEAD/libass/ass_render.c)

## R047 · [librosa/librosa](https://github.com/librosa/librosa)

- Role: Beat, onset and music feature extraction
- Transfer: beat_track() accepts onset strength, tempo priors and time/frame units; onset analysis can provide candidate accent points. Align only meaningful visual reveals to selected beats and preserve sentence pacing.
- Limit: Beat estimation can be wrong for ambient or speech-heavy tracks; review audible timing. Heavy analysis dependencies are optional and unnecessary for manually authored cue sheets.
- License: ISC
- Inspected: [librosa/beat.py](https://github.com/librosa/librosa/blob/HEAD/librosa/beat.py), [librosa/onset.py](https://github.com/librosa/librosa/blob/HEAD/librosa/onset.py)

## R048 · [gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions)

- Role: Standardized GLSL transitions between two images
- Transfer: A shared transition(uv) contract samples from/to textures with progress and effect parameters. Adopt one or two motivated transition mechanisms while keeping timing and aspect handling in the host.
- Limit: A collection is one repository, not dozens of projects. Most effects are gimmicky for editorial videos; review per-shader licensing/attribution and avoid transition roulette.
- License: MIT
- Inspected: [transitions/directionalwarp.glsl](https://github.com/gl-transitions/gl-transitions/blob/HEAD/transitions/directionalwarp.glsl), [transitions/PolkaDotsCurtain.glsl](https://github.com/gl-transitions/gl-transitions/blob/HEAD/transitions/PolkaDotsCurtain.glsl)

## R049 · [rive-app/rive-wasm](https://github.com/rive-app/rive-wasm)

- Role: WASM playback of authored Rive artboards and states
- Transfer: Low-level runtime can drive animations and artboards under a caller-controlled loop. Pre-authored licensed icon/character systems can supply rich acting and secondary motion when a project actually needs them.
- Limit: Canonical repo is rive-wasm, not nonexistent rive-js. Runtime is open-source but editor/assets are separate; state machines need deterministic reset/replay and are not automatically random-seekable.
- License: MIT
- Inspected: [js/src/rive.ts](https://github.com/rive-app/rive-wasm/blob/HEAD/js/src/rive.ts), [README.md](https://github.com/rive-app/rive-wasm/blob/HEAD/README.md)

## R050 · [blender/blender](https://github.com/blender/blender)

- Role: Scriptable real 3D, lighting, materials and compositing
- Transfer: Camera code represents lens, depth of field and focus objects; render pipeline separates evaluated scenes from delivery. Use the installed renderer for short hero-object passes with credible lighting, shadow, reflection and camera parallax.
- Limit: GPL applies to Blender code, not automatically its rendered artwork; imported models/textures have independent rights. CPU rendering cost must be measured before committing a whole film.
- License: GPL-3.0-or-later
- Inspected: [source/blender/blenkernel/intern/camera.cc](https://github.com/blender/blender/blob/HEAD/source/blender/blenkernel/intern/camera.cc), [source/blender/render/intern/pipeline.cc](https://github.com/blender/blender/blob/HEAD/source/blender/render/intern/pipeline.cc)


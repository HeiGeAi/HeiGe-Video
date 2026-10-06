# Model/agent benchmark protocol

Use only when asked to compare models, agent workflows, cost or claimed quality parity. This protocol defines a future experiment, not evidence that any experiment has already run.

## Preregister the comparison

Name the question precisely: first-pass quality, success rate after a fixed repair budget, cost per accepted film, or time to accepted delivery. “Can any agent match Opus?” is too broad to be supported by a few selected examples.

Choose varied held-out briefs spanning the relevant styles and difficulty: Chinese typography, persistent physical objects, causal diagram drawing, ink material/action, honest data morphs and actual product behavior. Include more than one subject per tested style; do not tune the Skill on the exact test set. Give every arm the same facts, deliverables, assets, resolution, tool access and acceptance rules unless testing that factor explicitly.

Separate at least these questions when useful:

- Same model with and without this Skill: measures the Skill's contribution
- Different models with the same Skill and equivalent tools: measures that controlled workflow
- Low-cost builder plus stronger director/reviewer: measures a mixed workflow, not the low-cost model alone

## Record real runs

Record exact provider/model version, date, agent harness/version, available tools, prompts, context, budgets, settings supported by that provider, retries, user or human intervention, wall time and costs. Protect credentials; never place API keys in logs or artifacts. Use only authorized calls and spending.

Author-provided labels on public videos are attribution, not a verified execution trace. A model-generated plan, a dry run or successful API connectivity is not a rendered benchmark sample. Count all attempts, crashes and abandoned outputs. Report first-pass and repaired results separately.

## Blind and review the actual outputs

Randomize output IDs and remove model-identifying slates that are not part of the brief. Keep factual input available. Independent reviewers inspect actual video/frame evidence and listen when audio matters. Use the same technical gates and style-conditional rubric for every arm. The reviewer should not see the model name, cost, author's rationale or previous scores before judging.

Assess story/operation clarity, composition/readability, object continuity, style-specific material and motion, audio fit, factual correctness and technical completion separately. Have reviewers state time-stamped defects and preference reasons. A pairwise preference does not erase a hard failure.

## Analyze without fake parity

Predeclare practical equivalence margins and the number of runs that the time/cost budget permits. Small exploratory tests remain exploratory; do not invent statistical confidence or declare equivalence from an insignificant difference. Publish sample counts, failure rates, observed variation, costs, review uncertainty and all changed conditions. If results are too sparse or mixed, say so.

Do not count multiple languages or model versions of one story as independent creative briefs. Do not cherry-pick one successful cheap-model clip against a weak baseline. Report cache effects, shared generated code, human repairs and stronger-model intervention. “Compatible with an agent” means its required capabilities were tested there; it does not mean equal artistic quality.

## Stopping and deliverables

Stop at the agreed run/spend budget, a terminal capability blocker, or completed preregistered sample set. Do not keep spending until a preferred result appears. Deliver briefs, anonymized output mapping, exact environment records, all run outcomes, cost accounting and evidence-backed judgments. Any unsupported parity or model-provenance claim is a reporting failure.

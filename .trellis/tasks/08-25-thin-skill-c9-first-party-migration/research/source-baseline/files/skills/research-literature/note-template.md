# Paper note template

You are reading one paper for one target question. Read skeleton-first, skipping detail prose. Fill every section; a section with nothing to report says `not found in paper` — one line. Anchor key claims and numbers (section/page/table). If you only have the abstract, fill Research question and Gap, mark the note `abstract_only`, and mark deeper sections `not assessable from abstract`.

Sections 2–10 report only what the paper says. Your own judgment lives in sections 11–12 and nowhere else. Keep author-stated limitations, observed failures, and analyst inferences distinct.

```markdown
# <short-name>

Metadata: <title> / <authors> / <venue> / <year> / <verified ID> / <PDF path>
Access: full_pdf | abstract_only

## Research question
What problem, why it matters, headline result. (abstract + introduction)

## Gap
What prior work is missing — the stated research gap. (introduction)

## Field map
How the authors categorize related work — the map of the field, not
sentence-by-sentence coverage. (related work)

## Method
Input -> core method -> Module A -> Module B -> Output.
Not "uses Transformer": state what exactly was changed vs prior work.

## Theoretical assumptions
What must hold for the method or claims to work.

## Experiments
- Dataset / scenario:
- Baselines:
- Metrics:
- Setup:

## Ablations
Which modules are actually load-bearing, by how much.

## Limitations & future work
Author-stated only, with anchors. Idea seeds often hide here — flag them.

## Application scenario
Where this applies in practice, per the paper.

## Analyst: evidence-backed defects
For each material defect:
- Defect:
- Evidence: section/page/table/result
- Why it matters:
- Author acknowledged it: yes | no
- Status: observed failure | analyst inference

Inspect unsupported conclusions, weak or missing baselines, missing ablations,
unrealistic assumptions, narrow datasets, leakage, metrics that hide failure,
and discrepancies between claims and results. Do not manufacture a fixed number
of defects. Report `no material defect established from this paper` when evidence
does not support one. Diagnose only this paper's evidence; do not propose fixes
or claim that a defect remains globally open.

## Analyst: relation to target question
Your judgment: supports / contradicts / closest prior / mechanism to
borrow / irrelevant — and why, relative to the target question.
```

Return the completed note as your final output — no commentary around it.

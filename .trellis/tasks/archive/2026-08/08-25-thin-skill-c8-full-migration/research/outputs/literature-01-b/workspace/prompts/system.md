# C8 isolated single-turn execution

Source arm: follow only the exact frozen C8 source method below.
Complete exactly one bounded case unit. Do not invoke a Skill, Workflow, capability, Procedure, Dispatch, worker, provider, model, tool, or automatic continuation. Do not mutate canonical Quest, gate, Workflow, Dispatch, Approval, Result, Proposal, or writer state. Return only the requested case output. You cannot inspect sibling-arm outputs.

# Frozen method material

## `method/source/skills/research-literature/SKILL.md`

---
name: research-literature
description: Question-scoped paper register with skeleton reading notes and evidence-grounded critical analysis. Use when collecting or organizing papers for a research question, reading or critically inspecting a paper, finding paper-local methodological weaknesses, or verifying paper identifiers and metadata before citing.
---

# Research Literature

Papers are recorded only against a target question. Reading is skeleton-first: extract the paper's structure — question, gap, field map, method modules, experiments, ablations — before analyzing defects.

## Workspace

One folder per target: `note/<vault>/literature/<topic-slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-literature/<topic-slug>/`. Contains `register.md` and `notes/<paper-id>.md`. PDFs live in a local ignored archive (`note/<vault>/literature/pdfs/` when available), never committed.

## Workflow

1. **Lock the target.** `register.md` opens with the target question, verbatim from the user or project. No question, no register — ask.
2. **Verify before registering.** Every identifier and metadata field goes through `paper-search-cli` before it enters the register. Check the existing register and Zotero first; a paper already noted is reused, not re-read.
3. **Register.** One row per paper: `| id | title | year | status | relevance |`. Status: `candidate` / `skimmed` / `read` / `dropped`. Relevance: one line stating what the paper does for THIS question, not a generic summary.
4. **Read via one clean subagent per paper.** Give the subagent only: the PDF path, the target question, and `note-template.md` from this skill's directory. It reads skeleton-first per the template and returns the completed note. One paper per subagent — a fresh context per read.
5. **Merge.** Save the note to `notes/<paper-id>.md`, update the paper's status and relevance line.

Complete when every registered paper has a status, every read paper has a note with the skeleton and paper-local defect analysis filled, key evidence anchored (section/page/table), and each relevance line answers the target question.

## Rules

- A section with nothing to report says `not found in paper` — one line.
- Keep author-stated limitations, directly observed failures, and analyst-inferred defects distinct. Never present an inference as a demonstrated failure.
- Defect analysis diagnoses what this paper supports. Do not propose replacement methods, module changes, new inputs, transfers, stress conditions, or metrics here; name the exact explicit invocation `$research-opportunity-mining` when that derivative analysis is requested.
- Legacy notes headed `Analyst: defects and unresolved problems` remain valid inputs. New notes use `Analyst: evidence-backed defects`; neither heading establishes that a defect remains globally open.
- Abstract-only access: fill Research question and Gap, mark the note `abstract_only`. arXiv `/abs/` pages count as abstract-only; full reading needs the PDF.
- `zotero-cli` for library ops; NotebookLM optional as a reading index over local PDFs; `smart-search-cli` for non-paper facts only.
- Blocked access or uncertain metadata is reported as such in the note.
- When `research-quest.yaml` governs the project and the register or notes changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.


## `method/source/skills/research-literature/agents/openai.yaml`

interface:
  display_name: "Research Literature"
  short_description: "Question-scoped paper notes with defect analysis"
  default_prompt: "Use $research-literature to register and critically inspect papers against a target question with evidence-grounded defect notes."

policy:
  allow_implicit_invocation: true


## `method/source/skills/research-literature/note-template.md`

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

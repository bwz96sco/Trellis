---
name: research-ideation
description: Generate a portfolio of distinct falsifiable research ideas from a research question and its literature evidence. Use when creating research directions, hypotheses, or capability combinations from gaps, or when an opportunity board needs candidates. Hands the portfolio to research-idea-evaluation; never selects a winner.
---

# Research Ideation

Turn a research question into 3–7 mechanism-distinct falsifiable candidates. Generation only: novelty verdicts, method attacks, and selection belong to `$research-idea-evaluation`.

## Workspace

`note/<vault>/ideas/<topic-slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-ideation/<topic-slug>/`. The normal output is `ideas.md`. Quest-governed H1 uses `opportunity-board-template.md`. Existing `evidence/NN_*.md` packs remain readable legacy inputs.

## Workflow

1. **Freeze the frame.** `ideas.md` opens with the parent question verbatim, constraints, and non-goals. Unconfirmed pivots of object, domain, or contribution stay parked.
2. **Mine existing evidence first.** Prefer `opportunity-index.md` and `opportunities/<paper-id>.md` when the explicit mining layer exists; consume its `O#` seeds without rerunning its six lenses. Load a same-target `problem-checkpoint.md` when present. Otherwise use `register.md`, either legacy or current defect sections in `notes/<paper-id>.md`, and corpus gaps in `synthesis.md`. Route new scholarly search to `$research-literature`; `smart-search-cli` for non-paper facts.
3. **Honor problem selection.** A checkpoint is analyst judgment, not human approval. Outside a quest, require explicit human wording selecting checkpoint problems before generation. If the selection exceeds its cap or reopens `hold`/`reject`, show the exact conflict and require an explicit override. Never silently drop a retained problem, erase a local null result, or treat an opportunity bridge as an approved solution.
4. **Map gaps.** Per selected gap: symptom, underlying mechanism, why still unsolved, and what evidence would make it actionable. Separate real mechanisms from evaluation artifacts.
5. **Generate.** 3–7 candidates, each attacking a mapped gap through a distinct main mechanism. Use stable IDs `C1..Cn`. Per candidate: mechanism (what exactly changes vs prior work), closest prior with provisional delta, resources, cheapest falsification test, kill condition. The test must exercise every claimed contribution; split candidates whose independently useful components could pass or fail separately. Include one conservative, one higher-upside, and one simplicity-first route when the problem supports them. Do not mechanically turn each approved `P#`/`B#` pair into one candidate; reopen divergence if candidates collapse into one mechanism family.
6. **Hand off.** Name the exact explicit invocation `$research-idea-evaluation` as the next owner, then stop. Do not run novelty verdicts, select, refine, or write experiment handoffs here.

Complete when the frame is frozen, every candidate carries a distinct mechanism with falsification test and kill condition, the diversity rule holds, and the portfolio names its next owner.

## Human gates (quest-governed projects)

Presence of `research-quest.yaml` alone does not establish governance. Apply H1/H2
only when the user explicitly placed this campaign under the named quest, or the
quest links this idea workspace or artifact through `next_action.expected_artifact`
or `authoritative_artifacts`. Otherwise use the normal `ideas.md` workflow and do
not create H1/H2 files or quest events.

When that explicit link exists:

- Discovery stops at H1: consolidate source `O#` seeds with `opportunity-board-template.md`, using stable problem IDs `P1..Pn` and bridge IDs `B1..Bn`. Reconcile every active `CP#`, cite contributing `O#` IDs, but write no candidates. Prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.
- After the human responds, transcribe their wording verbatim into `h1_decision.md`. Its frontmatter includes `decision_status`, `decision_recorded_by: human_confirmed`, `decision_basis: opportunity_board.md`, approved P/B IDs, `checkpoint_override: none|cap|disposition|both`, and `checkpoint_override_reason`. Never infer an override from generic wording such as “continue.”
- Before generation, run `uv run python scripts/validate-research-gates.py <idea-root> --gate h1`. Generate only after exit 0. `ideas.md` must contain an `Approved Opportunity Coverage` table with columns `Candidate ID` and `Approved IDs`.
- After generation, stop at H2. Transcribe the human response verbatim into `h2_decision.md` with frontmatter `decision_status`, `decision_recorded_by`, and `approved_candidate_ids: C1,C2|none`; prepare the quest event and request explicit `$research-quest-admin`, but never invoke evaluation in the same turn.
- Before the evaluation handoff, run the same validator with `--gate h2`. Name the exact explicit invocation `$research-idea-evaluation` only after exit 0.

## Rules

- Unknown novelty is unknown; deltas stay provisional until evaluated.
- An `O#` opportunity seed is evidence for generation, not a complete candidate or an approved H1 item.
- Reject routes with hidden compute, information leakage, unfair baselines, cosmetic renaming, or unevaluable mechanisms.
- Lexical similarity, weighted scores, and candidate order are not research evidence.
- Do not invent exact performance targets. A provisional threshold needs a prior result, operational requirement, or pilot basis.

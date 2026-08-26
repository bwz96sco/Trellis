---
name: research-idea-evaluation
description: Evaluate a portfolio of research idea candidates for novelty and method validity, then select one route or close blocked. Use when candidate ideas need closest-prior verification, fatal-flaw screening, matched controls, or an experiment handoff for the surviving route. Never generates the initial portfolio.
disable-model-invocation: true
---

# Research Idea Evaluation

Turn a candidate portfolio into one evidence-backed selected route or an honest blocked closure. Evaluation only: generating candidates belongs to `$research-ideation`.

## Workspace

Continue in the portfolio's folder (`.../ideas/<topic-slug>/`): `attacks/<candidate-id>.md` and `decision.md`. Existing `evidence/NN_*.md` packs remain readable legacy inputs.

## Workflow

1. **Freeze inputs.** The portfolio (`ideas.md` or legacy pack), stable candidate IDs, parent question, constraints. `opportunity-index.md` and `O#` seeds alone are not a candidate portfolio; name `$research-ideation` as their next owner and stop. Missing context is a blocker — never silently regenerate it. For quest-governed projects, require `h2_decision.md`, run `uv run python scripts/validate-research-gates.py <idea-root> --gate h2` first, and audit only approved candidate IDs; any nonzero result blocks evaluation.
2. **Attack via one clean subagent per candidate.** Give the subagent only: the candidate text, the parent question, the literature register/notes paths for its closest priors, and `attack-template.md` from this skill's directory. It verifies the closest prior and attacks the method; save the returned note to `attacks/<candidate-id>.md`. Fresh context per candidate — the generator never grades its own work.
3. **Require falsification terms.** Each survivor gets: cheapest decisive test, information- and compute-matched baselines, anti-win condition, abandonment rule.
4. **Select or block.** Compare survivors on surviving delta, feasibility, and falsifiability. `decision.md` frontmatter records `decision_status: selected|blocked` and `selected_candidate_id: C1|none`; its `Candidate Dispositions` table has columns `Candidate ID`, `Disposition`, and `Reason` for every in-scope candidate. Never force a winner.
5. **Hand off.** For a selected route only: append the experiment brief (frozen-comparison seed — baseline, dataset, metric, budget) to `decision.md` and name `$research-experiment` as the next owner.

For quest-governed work, finish by running `uv run python scripts/validate-research-gates.py <idea-root> --gate closure`.

Complete when every in-scope candidate has an attack note, each verdict traces to evidence, `decision.md` closes selected or blocked, rejected routes keep their reasons, and the closure gate passes when applicable.

## Rules

- Unknown novelty is not novelty; a weak prior search is a blocker, not a pass.
- Attacks are evaluator-owned; keep them distinct from author-stated limitations in the literature notes.
- Lexical similarity, weighted scores, and candidate order are not research evidence.
- When `research-quest.yaml` governs the project and durable evaluation artifacts changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.

---
name: research-experiment
description: Run one research experiment lifecycle from frozen comparison to bounded claim. Use when planning, executing, monitoring, or auditing a comparative experiment, baseline, or ablation, or when turning run results into supported/refuted/inconclusive claims.
---

# Research Experiment

Own one experiment: freeze the comparison, execute against it, audit results into a bounded claim. One experiment may contain smoke checks, main runs, multiple seeds, and bounded follow-up analysis under one frozen comparison and claim contract.

## Workflow

1. **Freeze the comparison.** Before any claim-carrying run: baseline (with source), dataset and split, metric, evaluator, seed policy, intervention, total budget, and one bounded claim contract. Preserve a supplied total budget; per-run allocation not supplied is marked unresolved, never invented as equal shares. Inspect the project before asking; ask only decision-changing questions. Consume a selected idea's experiment brief from `decision.md` (or legacy `evidence/07_experiment_brief.md`) as the comparison seed when one exists.
2. **Plan compactly.** One compact run matrix and no more than six stop/kill/relaunch/fallback rules. Separate smoke checks from claim-carrying runs.
3. **Execute with real commands.** Project-local runners and adapters own exact commands; never invent a runner command. Record the actual command, code state, inputs, outputs, and completion evidence. Route runner creation to `experiment-adapter-builder` and package/solver/HPC computation to `research-computation`.
4. **Audit results.** Trace every number to source artifacts. Preserve failed and null results. Never promote smoke, launcher, partial, or cherry-picked output. Multiple seeds without a frozen aggregation or claim rule authorize seed-level observations only; the aggregate claim remains inconclusive.
5. **Close the claim.** Verdict is `supported`, `refuted`, `inconclusive`, or `blocked` — never stronger than the evidence. Disclose every change to the frozen comparison. Return the requested result plus minimum trust-bearing evidence.

Complete when the comparison was frozen before execution, every claim traces to run artifacts, the verdict is bounded, and the next action is explicit.

## Multi-round work

A plain `runs.md` ledger in the experiment folder owns cross-run state: one row per round (id, frozen comparison, verdict, artifact path), one frozen comparison per round. No registries, queues, or trackers.

## Rules

- A fixed-wording mechanical transformation preserves supplied wording and decisions and adds no experimental judgment.
- Reject unconfirmed object, domain, or contribution pivots.
- Durable artifacts: `note/<vault>/experiments/<slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-experiment/<slug>/`; bulky run outputs stay in ignored run storage.

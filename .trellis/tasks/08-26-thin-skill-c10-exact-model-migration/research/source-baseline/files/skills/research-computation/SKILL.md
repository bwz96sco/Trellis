---
name: research-computation
description: Execute and validate scientific computation - package checks, solvers, simulations, model fitting, dataset analysis, parameter sweeps, HPC jobs - with typed computation-backed claims. Use when numerical or scientific-software validity must be established. Route comparative baselines and ablations to research-experiment.
---

# Research Computation

Run scientific software with evidence that separates real execution from proposals and validation from success.

## Workflow

1. **Bound the run.** Scientific question, packages, data, execution route, compute budget, success criteria.
2. **Preflight for real.** Verify imports or executables, versions, GPU/backend access, data schema, and a smoke path in the current workspace. Documentation or package knowledge never proves local usability; failed checks stay visible as evidence.
3. **Execute.** Run the actual command, script, notebook, or scheduler job. A submitted job remains running until its logs and outputs are inspected. Keep the exact command, inputs, logs, outputs, and return status.
4. **Validate separately.** Successful execution is not correctness. Check convergence, tolerances, units, schemas, leakage, seeds, invariants, and output persistence as applicable. Never weaken checks to force success.
5. **Type the claims.** Each material claim is `computed` (real execution in the current workspace produced it), `parsed`, `digitized`, or `hypothesis` — linked to its evidence, with non-claims, blockers, and the next owner stated.

Complete when packages are checked or explicitly blocked, each run has distinguishable inputs/logs/outputs, validation is separate from execution, and claims are typed and bounded.

## Rules

- Durable results: `note/<vault>/computation/<topic-slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-computation/<topic-slug>/`; raw solver outputs, checkpoints, and large datasets stay in ignored run storage.
- `smart-search-cli` for solver/library docs; `research-literature` when package behavior or validation criteria depend on papers; project scripts own exact commands.
- HPC jobs are submitted only with log paths and an output-persistence plan.
- When `research-quest.yaml` governs the project and durable computation evidence changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.

# Research Computation

Execute and validate one bounded scientific-computation case. Separate real execution from proposals, correctness validation from process success, and evidence-backed claims from hypotheses.

## Prerequisites

- A bounded scientific question, declared packages and data, an actual execution route, compute budget, and success criteria.
- Declared input, log, output, and persistence locations for scheduled or long-running work.

## Method

1. Bound the run and its non-claims.
2. Preflight actual imports or executables, versions, accelerator or backend access, data schema, and a smoke path in the current workspace. Keep every failed check visible.
3. Execute the actual command, script, notebook, or job and retain exact command, inputs, logs, outputs, and return status. A submitted job remains running until its logs and outputs are inspected.
4. Validate separately from execution: convergence, tolerances, units, schemas, leakage, seeds, invariants, and output persistence as applicable. Never weaken a check to force success.
5. Label every material claim `computed`, `parsed`, `digitized`, or `hypothesis`, link it to evidence, and state blockers, non-claims, and the next owner.

## Profiles and output

- `lightweight`: one bounded local computation case.
- `managed`: one separately approved `research.computation.case` with declared scope and write paths.

Return exact execution evidence, separate validation evidence, typed claims, blockers, non-claims, and next owner. A managed worker returns only the strict Result and pending Proposal using supplied IDs.

## Stop conditions

Stop after one case has distinguishable inputs, logs, outputs, status, separate validation, and typed bounded claims, or after a visible preflight or execution blocker.

## Authority boundary

Do not provision a scheduler, author an unstated project command, launch a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch, weaken checks, mutate canonical Research or Quest state, or record lifecycle state. Use only declared reads and request-authorized writes.

## Handoff

Suggest `research-experiment` for comparative baseline or ablation ownership and `research-literature` when paper evidence defines software behavior or validation criteria. Never invoke either automatically.

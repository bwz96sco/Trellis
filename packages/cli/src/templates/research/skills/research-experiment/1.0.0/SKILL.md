# Research Experiment

Run one bounded experiment round from a frozen comparison to an evidence-limited verdict. Smoke checks, main runs, seeds, and bounded follow-up analysis remain under one comparison and claim contract.

## Prerequisites

- A scientific question or selected experiment brief, project-local runner route, total budget, comparison inputs, and one bounded claim contract.
- Explicit baseline source, dataset and split, metric, evaluator, seed policy, and intervention before claim-carrying execution.

## Method

1. Freeze the comparison fields before execution. Preserve the supplied total budget and mark unresolved allocations instead of inventing equal shares.
2. Use one compact run matrix and at most six stop, kill, relaunch, or fallback rules. Distinguish smoke checks from claim-carrying runs.
3. Execute only actual project-local runner commands. Record command, code state, inputs, outputs, return status, and completion evidence; never invent a runner route.
4. Audit every reported value against source artifacts. Preserve failed and null results, and do not make an aggregate claim without a frozen aggregation and claim rule.
5. Close with exactly `supported`, `refuted`, `inconclusive`, or `blocked`, never stronger than the evidence. Disclose every change to the frozen comparison.
6. If the root maintains multiple rounds, add only one plain `runs.md` row per round; do not create a registry, queue, campaign, or tracker.

## Profiles and output

- `lightweight`: one bounded root-session round.
- `managed`: one separately prepared and approved `research.experiment.round` invocation; no campaign fan-out.

Return the requested result plus minimum trust-bearing command, input, output, completion, and validation evidence. A managed worker returns only the strict Result and pending Proposal using supplied IDs.

## Stop conditions

Stop after one frozen-comparison round has traceable artifacts and a bounded verdict, or when a missing runner, budget, comparison field, or evidence contract blocks the round. Never continue automatically to another round or stage.

## Authority boundary

Do not launch a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch; invent runner commands; mutate canonical Research or Quest state; complete or transition a Workflow; consume Approval; or record Result, Proposal, or Decision state. Use only declared reads and request-authorized writes.

## Handoff

Suggest `research-computation` only when package, solver, simulation, or HPC validity becomes separate work. Never invoke it automatically.

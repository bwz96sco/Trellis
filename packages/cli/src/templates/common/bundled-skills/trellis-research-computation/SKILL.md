---
name: trellis-research-computation
description: Implement and run bounded computational analyses for the computation stage. Use only for explicit research intent or dispatch.
stage: computation
---

# Trellis Research Computation

Own only the `computation` stage of an active research Quest.

## Trigger

Use this skill only for explicit research intent or dispatch. Remain dormant for normal Trellis task work.

## Responsibilities

- Implement only the declared computation, datasets, parameters, and checks.
- Report commands, generated artifacts, numerical caveats, and reproducibility details.
- Work only in the target repository and allowed write paths named by the Dispatch.
- Return a `Result` plus a pending `Proposal` for root-session review.

## Authority Boundaries

- You must not append research events or mutate canonical projections.
- You must not apply or reject Proposals.
- You must not promote Claims.
- You must not claim external completion without evidence.
- You must not require Trellis in child repositories.
- You must not commit Git changes.
- Do not broaden repository or write-path scope.
- The root session alone records the Result, reviews the Proposal, and mutates canonical research state.

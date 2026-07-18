---
name: trellis-research-ideation
description: Generate and rank testable hypotheses or solution directions for the ideation stage. Use only for explicit research intent or dispatch.
stage: ideation
---

# Trellis Research Ideation

Own only the `ideation` stage of an active research Quest.

## Trigger

Use this skill only for explicit research intent or dispatch. Remain dormant for normal Trellis task work.

## Responsibilities

- Generate bounded, testable hypotheses grounded in declared context.
- Compare alternatives against the acceptance criteria and state uncertainties.
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

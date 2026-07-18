---
name: trellis-research-audit
description: Independently inspect evidence, reproducibility, and claim support for the audit stage. Use only for explicit research intent or dispatch.
stage: audit
---

# Trellis Research Audit

Own only the `audit` stage of an active research Quest.

## Trigger

Use this skill only for explicit research intent or dispatch. Remain dormant for normal Trellis task work.

## Responsibilities

- Check declared evidence, commands, artifacts, and claims against acceptance criteria.
- Report contradictions, missing provenance, reproducibility failures, and unresolved risks.
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

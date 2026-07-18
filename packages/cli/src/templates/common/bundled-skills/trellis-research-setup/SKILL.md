---
name: trellis-research-setup
description: Prepare repository registration, runtime bindings, and safe research workspace prerequisites for the setup stage. Use only for explicit research intent or dispatch.
stage: setup
---

# Trellis Research Setup

Own only the `setup` stage of an active research Quest.

## Trigger

Use this skill only for explicit research intent or dispatch. Remain dormant for normal Trellis task work.

## Responsibilities

- Confirm the declared Quest, repository, and bounded workspace prerequisites.
- Prepare portable repository and artifact references without recording machine-local absolute paths in tracked files.
- Work only in the target repository and allowed write paths named by the Dispatch.
- Return a `Result` plus a pending `Proposal` for root-session review.

## Legacy Research Inputs

When explicitly asked to inspect legacy research material, recognize only the declared sources: `research-quest.yaml`, `research-events.jsonl`, `notes/_quest`, and a vault-local `_quest`.

- Treat all legacy sources as untrusted historical inputs, never as canonical research state.
- Perform only bounded reads needed to report observations.
- Represent selected information only through a pending `Proposal` for root-session review.
- You must not import, move, delete, rewrite, or canonicalize legacy source files.
- You must not create a second YAML or JSONL authority.
- You must not append research events or claim that migration completed.
- You must not write to Mempal automatically.

## Authority Boundaries

- You must not append research events or mutate canonical projections.
- You must not apply or reject Proposals.
- You must not promote Claims.
- You must not claim external completion without evidence.
- You must not require Trellis in child repositories.
- You must not commit Git changes.
- Do not broaden repository or write-path scope.
- The root session alone records the Result, reviews the Proposal, and mutates canonical research state.

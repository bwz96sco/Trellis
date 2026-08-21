# Thin-Skill Research Orchestration Pilot

## Goal

Plan a Trellis-managed Research skill architecture that preserves the quality and focus of the simplified source skills while adding unified versioning, deterministic orchestration, canonical state, authority control, and resumability.

The pilot must test whether Trellis can manage Research skills without recreating the heavy-workflow failure mode: large prompt packs, automatic multi-stage execution, mandatory artifact proliferation, repeated planning/review, and unnecessary subagent dispatch.

## Background

- Current source Research skills have been simplified around bounded ownership, explicit-only complex workflows, conditional durable outputs, and owner-preserving handoffs.
- Current Trellis Research already provides durable canonical state, Dispatch/Activation/Approval, root-owned Result/Proposal decisions, generic Claude/Codex workers, and versioned Procedure resolution.
- The active Trellis Procedure surface remains methodologically thin, while dormant Procedure 2.0.7 represents a heavier pack model that must not become the pilot baseline.
- The source skills and Trellis currently overlap in Quest/state ownership. The pilot must define one canonical mutation authority.

## Confirmed Evidence

- Trellis currently exposes a closed 14-capability registry and binds new activations to Procedure `1.0.0`; activation mode currently describes operational authority, not model-selectable versus explicit-only invocation (`packages/core/src/research/stage-capabilities.ts:6-45`, `:94-101`, `:127-286`).
- Existing Dispatch/Activation/Approval and zero-write approved Context already bind exact Procedure, policy, request, scope, host, and authority identities (`packages/core/src/research/types.ts:247-301`; `packages/cli/src/commands/research/dispatch-approved-context.ts:255-534`).
- Current Trellis workflow orchestration is a static Markdown guide, not a machine-readable graph of skill references, transitions, stop conditions, and scientific gates (`packages/cli/src/templates/trellis/workflows/research/workflow.md:1-153`; `packages/cli/src/utils/workflow-resolver.ts:1-59`).
- Trellis Quest state is event-sourced and rebuildable, but current reducers do not encode workflow-specific legal transitions or H1/H2 (`packages/core/src/research/reducer.ts:259-298`; `packages/core/src/research/projections.ts:78-146`).
- Source Research packages currently total 15: three explicit-only and twelve model-selectable (`/Users/zhangbowen/Projects/agent-skills-private/scripts/validate-research-skills.py:16-36`).
- Source `research-quest` is read-only; `research-quest-admin` owns preview/write mutation and reviewed milestone append (`/Users/zhangbowen/Projects/agent-skills-private/skills/research-quest/SKILL.md:8-38`; `/Users/zhangbowen/Projects/agent-skills-private/skills/research-quest-admin/SKILL.md:9-45`).
- Source ideation and evaluation deliberately separate generation from novelty/method attack and stop at an explicit handoff (`/Users/zhangbowen/Projects/agent-skills-private/skills/research-ideation/SKILL.md:8-39`; `/Users/zhangbowen/Projects/agent-skills-private/skills/research-idea-evaluation/SKILL.md:11-25`).
- The source-skill repository currently contains relevant modified and untracked Research files. Any pilot import must pin a clean commit or an explicit authenticated snapshot rather than reading mutable ambient bytes.

## Requirements

### R1. Small canonical skill packages

- Trellis must become the canonical registry for migrated Research skill packages.
- Each package must retain one bounded cognitive or operational responsibility.
- Skill instructions must remain independently understandable and must not embed the full research lifecycle.
- References, templates, and validators must be optional package members loaded only when the active stage requires them.
- Complex or authority-sensitive skills must remain explicit-only.
- The pilot must generalize the existing Procedure package/resolution contract into the sole new execution-package identity rather than add a second independently replayed package system.

### R2. Deterministic command surface

- Commands must handle deterministic inspection, validation, state transition, approval recording, activation, result recording, and projection rebuild.
- Commands must not make open-ended scientific judgments such as novelty selection, candidate acceptance, or claim validity.
- User-facing slash commands may wrap the deterministic CLI but must not duplicate workflow state or methodology in prompt text.

### R3. Declarative thin workflows

- Workflow definitions must contain skill references, legal transitions, required inputs, stop conditions, and human gates.
- Workflow definitions must not copy skill methodology or preload every lifecycle stage.
- Managed Quest workflow state must bind an exact workflow ID/version, current node, and explicit node-completion/transition evidence; current progress must not be inferred from coarse Quest stage alone.
- One invocation must load only the active skill plus minimal relevant state and artifacts.
- Pilot workflows must be versioned DAGs; every invocation completes one node and stops.
- Transitions are operator-selected. Cycles, automatic continuation, and step-budget engines are deferred until pilot evidence demonstrates a need.

### R4. Shared registry with two execution profiles

- All migrated skills must resolve from one Trellis-owned immutable registry and exact package digest.
- The lightweight profile must run one resolved skill in the root/same session without mandatory Dispatch, Approval, Result, or Proposal records.
- Lightweight execution may remain fully ephemeral, or root may explicitly record an accepted artifact or milestone when durable continuation is needed.
- The managed profile must reuse existing Dispatch, Activation, Approval, approved Context, Result, Proposal, and Decision mechanics.
- Invocation source (`model` or `operator-explicit`), execution profile (`lightweight` or `managed`), and entrypoint type (`model-context` or deterministic `root-command`) must remain separate machine-readable concepts.
- Profile selection must be explicit or deterministically required by durable state, isolation, independent review, long-running execution, or multi-repository authority. It must not be inferred from output depth labels.
- Both profiles must execute the same skill package version rather than maintain separate light and managed instructions.
- Root administration commands such as Quest import are explicit root-command entrypoints, not lightweight model execution.

### R5. Canonical state and authority

- Trellis must own canonical Quest, Campaign, Run, Evidence, Claim, Activation, Approval, Result, Proposal, and Decision state for managed execution.
- Migrated source Quest files must not remain a second mutable source of truth.
- Quest import must define an explicit source-field-to-canonical-field mapping, unmappable-field behavior, and export reconstruction rules.
- Cutover must update the real source `research-quest-admin` write entrypoint so it refuses before writing whenever Trellis owns authority.
- Scientific gates such as H1/H2 must remain distinct from operational execution approval.
- Workers must remain proposal-only; root remains sole canonical mutation authority.

### R6. Minimal artifact policy

- Conversational output or one compact primary artifact must be the default.
- Additional durable files must be required only for explicit durable intent, existing managed state, reproducibility, cross-agent handoff, formal evidence, or publication-facing output.
- File count must never be used as a proxy for reasoning rigor.
- Derived reports must not replace canonical evidence or state.

### R7. Selective subagent use

- Same-session/root execution must be the default for bounded skills.
- Dispatch must be reserved for independent review, genuinely parallel evidence work, long-running computation, environment isolation, or explicit operator request.
- Nested automatic workflow dispatch must remain forbidden.

### R8. Pilot scope

The pilot must cover three different boundary types:

1. `research-literature` — model-selectable bounded analysis.
2. `research-ideation` plus `research-idea-evaluation` — explicit handoff, H1/H2, independent evaluation, and selected-or-blocked closure.
3. `research-quest-admin` — explicit state mutation, preview/write separation, and migration away from dual Quest ownership.

### R9. Comparative evaluation

- Evaluate representative tasks using three execution paths where available:
  - bare model;
  - current source skill;
  - Trellis-managed skill.
- Compare result quality, completion, wall-clock time, token/context use, artifact count, user corrections, rework, missed gates, and interruption recovery.
- Run at least three representative cases for each pilot boundary and at least ten total invocations; elapsed time cannot substitute for required cases.
- Lightweight execution must add zero mandatory model calls, Approval rounds, subagents, or durable artifacts relative to the source skill contract.
- Zero-tolerance failures are: missed H1/H2, dual Quest writers, automatic next-stage execution, replay identity drift, or critical scientific/authority regression.
- Do not approve full migration unless Trellis execution preserves result quality and managed cases demonstrate concrete recovery, independence, or authority value.

### R10. Compatibility and migration safety

- The pilot must not activate dormant Procedure 2.0.7.
- The pilot must not rewrite historical Research ledger events or recorded activations.
- Existing source-skill validators and historical artifact readers should remain usable where they provide real compatibility value.
- Pilot failure must be reversible without deleting canonical Research data or forcing full-skill migration.

## Out of Scope

- Full migration of every Research skill.
- Procedure 2.0.7 activation or formal assurance continuation.
- Automatic end-to-end research lifecycle execution.
- New provider integrations or additional execution hosts.
- Replacing scientific human gates with generic execution approval.
- Mandatory HTML/report packs for bounded tasks.
- Workflow cycles, automatic continuation, step-budget engines, or generated slash-command wrappers in the pilot.
- Push, publication, release, or production activation.

## Acceptance Criteria

- [ ] One canonical package model separates short skill guidance, machine-readable metadata, optional support files, and deterministic validators.
- [ ] One declarative DAG model references skill versions without embedding skill instructions and records exact workflow binding/node progress.
- [ ] New managed activations replay the same skill package through one generalized execution-package identity; historical Procedure activations remain unchanged.
- [ ] Command responsibilities, invocation source, execution profile, entrypoint type, and prohibited scientific judgments are explicit.
- [ ] Canonical Quest/state ownership, source-field mapping, export reconstruction, and coordinated source-admin refusal are unambiguous.
- [ ] H1/H2 semantic gates remain distinct from operational Approval.
- [ ] Default execution loads one skill, produces no more durable artifacts than the task requires, and stops after one bounded stage.
- [ ] Multi-step continuation is explicit and bounded.
- [ ] Subagent dispatch is selective rather than mandatory.
- [ ] Pilot scope, comparison protocol, success thresholds, and rollback conditions are testable.
- [ ] Historical ledger and recorded activation compatibility is preserved.
- [ ] Full migration remains blocked until pilot evidence supports it.

## Key Product Decision

- Use one Trellis-owned immutable registry with two execution profiles.
- Lightweight profile: root/same-session execution, no mandatory Dispatch/Approval/Result/Proposal envelope, optional explicit milestone recording.
- Managed profile: existing durable Dispatch/Activation/Approval/Context/Result/Proposal/Decision lifecycle.
- Both profiles resolve the same skill package identity and instructions.

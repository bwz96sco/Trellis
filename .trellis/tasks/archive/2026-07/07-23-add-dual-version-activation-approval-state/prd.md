# C02 Add dual-version activation and approval state to core

## Goal

Add canonical schema-v2 activation and approval events while preserving exact schema-v1 replay, current entity payloads, tracked projection schemas, and root-only mutation authority.

## Requirements

- Treat archived C01 activation/approval and GitNexus artifacts as normative. C01 must remain archived before C02 activation.
- Add strict `ActivationId` (`act_`) and `ApprovalId` (`apr_`) types, parsers, generators, activation/approval entities, approval terminal state, and reduced-state indexes.
- Keep every existing event kind valid only as the exact schema-v1 event definition. Accept exactly `activation.planned`, `approval.granted`, `approval.revoked`, and `approval.consumed` only with schema version 2.
- Preserve the existing event envelope fields, global sequence, event-ID uniqueness, actor, provenance, idempotency-key, source/line diagnostics, and deterministic serialization across mixed ledgers.
- Add `activation` and `approval` aggregate types only for schema-v2 events. Enforce exact aggregate and ordered related refs for all four new event kinds.
- Preserve existing Dispatch, Result, Proposal, Decision, repository, artifact, Quest, Campaign, Run, Evidence, and Claim schemas byte-for-byte.
- Reduce one immutable activation per Dispatch. Reject duplicate activation IDs, duplicate Dispatch bindings, missing/mismatched Dispatch or Quest relations, and activation changes after planning.
- Reduce approval grants only for an existing matching activation/Dispatch/Quest. Enforce globally unique approval IDs and at most one still-granted approval per activation/host unless the prior grant is revoked or expired by the new grant event timestamp.
- Keep expiry derived: reducer stores granted/revoked/consumed history and never reads wall clock. New-grant replacement compares the new event timestamp against prior `expiresAt`.
- Enforce terminal revocation and consumption transitions, exact timestamps, reason bounds, and matching Result/Proposal relations. Revoked and consumed approvals never reopen or transition to each other.
- Add schema-v2 reader/reducer/state support only. Do not add public `ResearchMutation` variants, event-draft emitters, CLI commands, or any production path that can append schema-v2 events in C02; C05/C06 own emit-capable mutations after capability, Procedure, policy, and binding validation exist.
- Preserve current schema-v1 Result + Proposal mutation behavior for every Dispatch in C02, including a Dispatch represented by a manually supplied mixed-ledger activation. Mixed-ledger replay must still reject a standalone, incomplete, reordered, expired, or foreign `approval.consumed` event; C06 owns production three-event append and the rule that activated Result recording requires consumption.
- Extend `ResearchState` with activation/approval maps and indexes only. Do not add tracked activation/approval projections or change any existing projection JSON schema/entity `updatedAt` value.
- Activation/approval-only events advance existing projection `projectedThroughSeq` to mixed-ledger head; deterministic rebuild keeps entity data byte-equivalent.
- Export new core contracts only through `@mindfoldhq/trellis-core/research`. Do not change package versions, export map, root barrel, CLI command surface, sidecars, capability registry, Procedure/policy resolution, worker behavior, cleanup evidence, packed inventory, docs-site, or marketplace.
- Before editing existing symbols, run fresh upstream GitNexus impact. Warn before HIGH/CRITICAL parser, reducer, validation, commit, or batch-builder edits and cover every named direct caller/process family.
- Preserve unrelated dirty work and Git history. No push.

## Acceptance Criteria

- [x] Existing schema-v1 golden fixture bytes, parsed values, reduced state, serialization, and tracked projection bytes remain unchanged.
- [x] Strict parser accepts all valid mixed v1/v2 orderings and rejects unknown versions, kind/version mismatch, unknown keys, malformed timestamps/digests/IDs, invalid aggregate types, and wrong related-ref order.
- [x] Empty and pure-v1 ledgers reduce to existing entity state plus empty activation/approval maps and indexes.
- [x] Mixed replay deterministically enforces one activation per Dispatch, activation immutability, grant relations, duplicate-host grant rules, event-time expiry replacement, revocation, consumption, and terminal states.
- [x] Consumption replay requires immediately preceding matching Result and Proposal events with shared timestamp/actor/provenance/idempotency key, and rejects event timestamps at or after `expiresAt`.
- [x] Reducer and replay remain independent of filesystem, policy, Procedure, sidecars, scope observation, and wall clock.
- [x] `ResearchMutation`, event-draft building, batch validation, commit behavior, and current two-event Result + Proposal recording remain unchanged in C02; no core or CLI production path emits schema-v2.
- [x] Replay and rebuild of a prebuilt mixed ledger whose head contains activation/approval-only events advance existing projection watermarks without adding projection files or changing existing entity data/`updatedAt`.
- [x] Core Research tests cover strict schema vectors, mixed parsing/serialization, relation order, lifecycle transitions, event-time expiry, replay adjacency, projection stability, and deterministic rebuild.
- [x] Full core tests/lint/typecheck/build, CLI tests/typecheck, workspace typecheck, package import compatibility, task validation, GitNexus changed-scope detection, and `git diff --check` pass.
- [x] No CLI command emits schema-v2 events in C02; no CLI behavior, Dispatch payload, tracked projection schema, package export key, cleanup evidence, packed payload, docs-site, marketplace, or unrelated dirty file changes.

## Dependency and Handoff

- Predecessor: archived C01 contract freeze at `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts`.
- C03-C10 remain planning and inactive until C02 acceptance passes and archives.
- C05 owns schema-v2 command emitters; C06 owns Context gating and production Result/Proposal/consumption cutover.

# CS6-3 — Correct CLI recording, authentication, replay, and recovery

## Goal

Correct the production CLI path so installed accepted-contract bytes are authenticated, `record-result` invokes exact methodology validation before canonical writes, replay resolves exact recorded dependencies, and committed projection-recovery failures are explicit and fail closed.

## Dependencies

- CS6-0 governance is frozen.
- CS6-1 is committed as `leaves-sound`.
- CS6-2's reviewed runtime interface is accepted and immutable for this wave.
- Separate activation and per-symbol GitNexus impact are required.

## Ownership

Owned production paths:

- `packages/cli/src/commands/research/bundled-procedure-root.ts`
- `packages/cli/src/commands/research/dispatch-command.ts`
- `packages/cli/src/commands/research/dispatch-methodology-validation.ts`
- `packages/cli/src/commands/research/dispatch-activation-materialization.ts`
- `packages/cli/src/commands/research/dispatch-materialization-reader.ts`

Owned tests:

- `packages/cli/test/commands/research-accepted-bundle-authentication.test.ts`
- `packages/cli/test/commands/research-dispatch-approved-result.test.ts`
- `packages/cli/test/commands/research-report-v2-publication.test.ts`
- `packages/cli/test/commands/research-dispatch-materialization-reader.test.ts`
- `packages/cli/test/cli/research-only-surface.integration.test.ts`
- `packages/cli/test/commands/research-cs6-cli-runtime.test.ts` (new)

Owned task evidence:

- `.trellis/tasks/08-07-cs6-correct-cli-recording-auth-replay-recovery/research/**`

## Requirements

- Authenticate the installed/bundled seven accepted leaves against exact member and semantic digests before granting accepted-contract identity.
- Ensure `record-result` runs authority checks and methodology validation against exact Dispatch/Activation/Procedure/package/contract identities before any canonical append or report sidecar publication.
- Preserve worker Proposal-only and root-owned recording/Decision boundaries.
- Bind replay to exact historical Procedure version/digest, contract digest/member aggregate, report schema/digest, activation, approval, and consumed authority evidence.
- Distinguish uncommitted zero-write failure from a committed canonical event whose derived projection/report materialization later fails.
- For committed projection-recovery failure, emit explicit deterministic recovery information; never claim the canonical commit was rolled back or silently successful.
- Remove dependence on repository `.git` metadata from archive/extracted-subject runtime behavior.
- Preserve strict stdin parsing and deterministic error codes.

## Exclusions and call-only surfaces

- No edits to core runtime files owned by CS6-2, package trees, accepted bundle bytes, events, reducers, stores, repositories, canonical ledgers, batch committers, locks, hardened publication internals, registries, harness-owned fixtures, or `.trellis/research/**`.
- Protected canonical primitives are call-only; required edits stop for ownership amendment and impact approval.

## Activation gate

Separate user approval after CS6-2 acceptance and owner assignment.

## Stop gates

- HIGH/CRITICAL impact result.
- Need to alter accepted leaves, historical packages, or protected canonical primitives.
- Any path can write before authority/methodology validation.
- Recovery logic would erase or reinterpret an already committed canonical event.
- Worker authority or live Procedure selection would widen.

## Commit boundary

A future CS6-3 commit may include only owned CLI adapters/tests and task-local evidence. No packages, core semantics, harness, freeze, assurance, operator, activation, archive, release, publication, or push authority.

## Authority flags

All human-review/equivalence, repair, complete-system acceptance, operator, activation, archive, release, publication, and push flags remain false.

## Acceptance criteria

- [ ] Installed bundle authentication passes from packed/external locations and fails on mutation or member drift.
- [ ] Invalid methodology prevents all canonical/report writes.
- [ ] Valid recording preserves exact approval and Proposal-only boundaries.
- [ ] Historical replay resolves exact recorded dependencies.
- [ ] Committed projection-recovery failure is explicit, deterministic, and non-destructive.
- [ ] Focused and full CLI suites pass without flakes attributable to shared mutable state.

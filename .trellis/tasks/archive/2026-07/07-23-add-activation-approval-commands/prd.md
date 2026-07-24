# C05 Add activation planning and operator approval commands

## Goal

Add canonical activation planning and root-side approval lifecycle commands on top of C02 mixed-version state, C03 capability registry, and C04 Procedure/policy resolution.

C05 makes authorization state writable and recoverable. It does not gate Dispatch Context, consume approval, change workers, retire Skills, or alter Result/Proposal batching.

## Dependencies and ownership

- C01 freezes activation, approval, request digest, scope hash, CLI, compatibility, and rollback contracts.
- C02 provides schema-v2 parsing/reduction for activation and approval state but no emitters.
- C03 provides the immutable capability registry.
- C04 provides strict Procedure/policy resolution and automatic-eligibility evaluation.
- C05 owns typed activation/grant/revoke emission, request/scope binding, root commands, and non-authoritative sidecars.
- C06 owns Context gating, drift rejection during Context, approval consumption, and Result/Proposal/consumption atomicity.
- C07-C09 own worker and Skill cutover.

## Requirements

### Critical shared-store boundary

- Extend the existing typed mutation path so one validated batch may contain schema-v1 and schema-v2 events.
- The only permitted CRITICAL edit to a pre-existing shared implementation path is the minimal version-aware change in `buildValidatedBatch` and its typed mutation mapping.
- Post-index review classifies C05-local `validateHierarchy` as CRITICAL because every activation command depends on it. Permit one exact body-only parity change: ordered validation of the frozen Context Quest, Run, Campaign, and Repository relations, with candidate-specific Run binding semantics. Preserve its name, parameters, return type, caller, `candidate` meaning, and `{ stage: quest.stage }` result; do not refactor adjacent authority, lifecycle, digest, scope, or Repository-resolution code.
- Post-index review also classifies C05-local `secureDirectory` and `writeSidecar` as CRITICAL. Permit only C05-local replacement-safety hardening in `dispatch-activation-materialization.ts`: identity-bound directory selection, private validation/staging/publication/cleanup helpers, and focused tests. Do not edit shared `writeFileAtomic`, callers, public result shapes, dependencies, or package manifests.
- Preserve public `validateResearchBatch` and `commitResearchBatch` signatures, lock/sequence/idempotency/append/projection behavior, all schema-v1 mappings, artifact digests, and current Result/Proposal validation.
- Every emitted event still passes through `parseResearchEvent` and complete-batch reduction. Add no raw-event append API.
- Do not modify HIGH `validateDispatchBatch`; C06 owns consumption batching.

### Dispatch prepare and historical bridge

`trellis research dispatch prepare` requires explicit:

```text
--capability <id>
```

Missing capability fails with `UNKNOWN_CAPABILITY`; it never chooses the C03 stage default. Preserve schema-v1 Dispatch shape and unchanged `--owner-skill`, `--provider`, and `--task-ref` compatibility semantics. Those fields remain non-routing metadata but participate in the complete request digest.

New prepare atomically commits:

```text
1. schema-v1 dispatch.recorded
2. schema-v2 activation.planned
```

Both events share one captured timestamp, actor, provenance, idempotency key, and contiguous sequences. Any failure rejects the complete batch.

Historical bridge:

```text
trellis research dispatch plan-activation <dispatch-id> \
  --capability <id> \
  [--root <path>] \
  [--idempotency-key <key>] \
  [--dry-run] \
  [--json]
```

It appends only `activation.planned`. It requires an eligible existing Dispatch with no activation, Result, or Proposal; strict canonical hierarchy; matching explicit capability; valid Procedure/policy; valid tracked `request.json` equal to canonical Dispatch; and valid resolved scope. It never rewrites Dispatch, request, compatibility metadata, old events, or projection schemas.

### Request digest and resolved scope hash

Add pure Research-subpath APIs:

```ts
digestDispatchRequest(dispatch: Dispatch): string;
hashDispatchScope(scope: NormalizedDispatchScopeV1): string;
```

Request digest:

```text
UTF8("trellis-research-dispatch-request-digest-v1\0")
|| UTF8(stableResearchJson(dispatchSchema.parse(dispatch)))
```

Scope hash:

```text
UTF8("trellis-research-dispatch-scope-hash-v1\0")
|| UTF8(stableResearchJson(normalizedScope))
```

Normalized scope binds Dispatch ID, Repository ID/root/locator, expected and observed remote, HEAD when present, ordered artifacts with normalized/resolved path/revision/SHA fields, and deduplicated sorted allowed-write path pairs. Optional fields are omitted. Machine paths use canonical separators and drive-letter normalization. Raw absolute paths never enter activation or approval events.

### Activation planning

Activation planning must:

1. strict-read and reduce canonical state;
2. validate hierarchy in this exact earlier-failure-wins order:
   - Quest exists, else `DISPATCH_HIERARCHY_INVALID` / `Dispatch Quest does not exist`;
   - Quest status is exactly `active`, else `QUEST_NOT_DISPATCHABLE` / `Dispatch Quest must be active`;
   - Run exists and is `planned` or `running`, else `DISPATCH_HIERARCHY_INVALID` / `Dispatch Run must be planned or running`;
   - existing Dispatch requires `run.dispatchId === dispatch.id`, else `DISPATCH_HIERARCHY_INVALID` / `Run Dispatch identity does not match`;
   - new prepare candidate requires `run.dispatchId === undefined`, else `DISPATCH_HIERARCHY_INVALID` / `Run '<run-id>' already has a Dispatch`;
   - Run Campaign exists and belongs to Quest, else `DISPATCH_HIERARCHY_INVALID` / `Run Campaign does not belong to the Dispatch Quest`;
   - Campaign contains Run in `runIds`, else `DISPATCH_HIERARCHY_INVALID` / `Run is not registered in its Campaign`;
   - optional Dispatch Campaign equals Run Campaign, else `DISPATCH_HIERARCHY_INVALID` / `Dispatch Campaign does not match the Run Campaign`;
   - target Repository exists and belongs to `quest.repositoryIds`, else `DISPATCH_HIERARCHY_INVALID` / `Target Repository is not associated with the Dispatch Quest`;
3. reject duplicate or too-late activation;
4. resolve explicit capability against current Quest stage;
5. resolve Procedure, project policy, effective authority, and automatic eligibility;
6. reject disabled authority;
7. compute request digest and resolved scope hash without observation persistence;
8. construct immutable activation from effective authority and one captured timestamp;
9. validate the complete candidate batch before append;
10. materialize sidecars only after canonical commit.

### Automatic authorization

```text
trellis research dispatch authorize <dispatch-id> \
  --host <claude|codex> \
  [--root <path>] \
  [--idempotency-key <key>] \
  [--dry-run] \
  [--json]
```

`authorize` recomputes and matches Procedure, policy, request, and scope bindings. It grants only when C04 automatic eligibility is true.

Persist exact automatic fields:

```text
mode = automatic
approverLabel = trellis-policy-v1
rationale = Eligible under immutable registry and project policy.
```

Disabled authority fails. Workflow, explicit, or otherwise-valid work outside automatic eligibility requires interactive approval. Interactive approval supplies human consent only; it never widens registry, Procedure, project-policy, resolved-scope, or proposal-only worker authority. Limits and forbidden authority conditions map to stable typed errors.

### Interactive approval

```text
trellis research dispatch approve <dispatch-id> \
  --host <claude|codex> \
  [--root <path>] \
  [--idempotency-key <key>]
```

Do not register `--json`, `--dry-run`, `--yes`, or `--force`. Commander rejects them before callback/write.

Before any grant, require stdin, stdout, and stderr all be TTYs. Render a deterministic authority summary, then prompt for operator label, rationale, and exact challenge:

```text
APPROVE <dispatch-id> <host> <first-12-hex-of-request-digest>
```

Comparison is case- and byte-sensitive with no whitespace trimming beyond terminal line-ending removal. Label length is 1-128 Unicode code points; rationale length is 1-1,024 Unicode code points; whitespace-only input fails. Persist supplied label/rationale text unchanged.

After successful challenge, recompute all bindings and compare against the rendered summary and canonical activation before append. The interaction proves deliberate local action only; it is not authentication, a signature, or cryptographic identity.

Interactive approval may grant an otherwise-valid activation that is workflow, explicit, or automatically ineligible, including bounded work when automatic policy opt-in is absent. It cannot override `enabled:false`, policy tightening, registry/Procedure/project-policy/scope ceilings, proposal-only worker authority, invalid hierarchy, completed Dispatch, or digest/scope drift.

### Grant validity and expiry

For both grant modes:

```text
grantedAt = once-captured command timestamp
expiresAt = grantedAt + activation.maxDurationMinutes * 60,000
```

Use canonical UTC RFC3339 millisecond precision. Equality with `expiresAt` is expired. Reducers never consult wall clock.

Require activation, valid hierarchy and bindings, no Result/Proposal, and no unexpired same-host grant. Claude and Codex grants may coexist. Same-host replacement is allowed only after revocation or expiry, with event time at or after prior expiry.

### Revocation

```text
trellis research dispatch revoke <approval-id> \
  [--reason <text>] \
  [--root <path>] \
  [--idempotency-key <key>] \
  [--dry-run] \
  [--json]
```

Reason is non-empty and at most 1,024 Unicode code points. JSON, dry-run, and non-TTY invocations require `--reason`. Human mode may prompt only when stdin and stdout are TTYs. Revocation is allowed before or after derived expiry while state is `granted`; revoked or consumed approvals are terminal.

### Typed mutations and canonical events

Add typed mutations only:

```ts
{ kind: "activation.plan"; activation: ResearchActivation }
{ kind: "approval.grant"; approval: ResearchApprovalGrant }
{ kind: "approval.revoke"; approvalId: ApprovalId; revokedAt: string; reason: string }
```

Exact events:

```text
activation.plan  -> schema-v2 activation.planned
approval.grant   -> schema-v2 approval.granted
approval.revoke  -> schema-v2 approval.revoked
```

Derive canonical relationships from reduced state. CLI callers do not supply redundant relation IDs.

### Materialization and recovery

Non-authoritative sidecars:

```text
.trellis/research/dispatches/<dsp-id>/activation.json
.trellis/research/dispatches/<dsp-id>/approvals/<apr-id>.json
```

Envelopes:

```ts
{ schemaVersion: 2, activation: ResearchActivation }
{ schemaVersion: 2, approval: ResearchApprovalState }
```

Serialize once with `stableResearchJson`; its bytes already contain exactly one final LF. Ledger commit precedes materialization. Root mutation commands may reconstruct sidecars; C06 Context remains read-only and never repairs them.

Sidecar materialization uses the strongest practical pure-Node detect-and-fail contract, not a claim of race-free `openat`/`renameat2` behavior:

- validate every root-to-parent segment as one non-empty path component with no `.`, `..`, separator, backslash, or NUL;
- return identity-bound directory selection containing canonical root/directory plus `dev`/`ino`/`mode` and realpath snapshots for the complete chain; descendant components must be non-symlink directories contained under the captured canonical root;
- ignore directory size/time changes caused by unrelated siblings, while rejecting type, identity, realpath, or containment drift;
- validate target filename with the same single-component grammar and snapshot an existing regular non-symlink target using identity, size, and timestamps;
- create an empty unique same-directory stage with `O_CREAT | O_EXCL | O_WRONLY`, optional platform `O_NOFOLLOW`, and mode `0o600`; bind pathname and descriptor identity, revalidate the complete chain, then write bytes only through the already-open descriptor;
- handle short writes, file-`fsync`, exact size, descriptor/path identity, complete-chain, target, and canonical-location checks before publication;
- publish initially absent target with exclusive `linkSync`; publish an initially present and unchanged target with atomic `renameSync`; then revalidate complete chain and published target identity/bytes;
- cleanup only when the stage pathname still identifies the expected regular non-symlink node under the unchanged chain; preserve unrelated replacements and never roll back or overwrite a later target replacement;
- any detected drift or post-publication verification failure reports committed recovery. Ledger remains authority; same-key retry repairs materialization.

Portable Node path APIs cannot eliminate every hostile nanosecond interleaving, ABA replacement, hard-link alias, or final-check gap. Absolute directory-FD-relative race freedom requires native/platform-specific support outside C05. Contract requires detection and safe failure for practical injected replacements; documentation must not overclaim mathematical race freedom.

Post-commit failure reports committed recovery with the exact idempotency key. Same-key classification occurs during initial canonical lookup, unconditionally for events returned by every `validateResearchBatch` call, and for every `commitResearchBatch` result with `replayed:true` (classifying all commit results is also valid). Before success rendering or materialization, returned events must match the expected command family, target, and exact batch shape; otherwise fail `IDEMPOTENCY_KEY_CONFLICT`. Dry-run determines whether matching returned events are canonical replay by rereading the ledger and checking exact returned event-ID membership; public core signatures remain unchanged. Matching replay appends nothing, returns canonical events with `replayed:true`, and reconstructs only relevant sidecars.

A matching historical key containing exactly one legacy `dispatch.recorded` event is a successful legacy prepare replay. It appends nothing, returns `replayed:true` and `legacyPrepare:true`, repairs only `request.json` plus the legacy runtime manifest, and returns `activation:null` and `activationFile:null`. It never creates or materializes activation. Operator must run `plan-activation` with a new idempotency key. The C05-era prepare replay rule requiring both Dispatch and activation applies only to two-event C05 prepare batches.

Interactive approval replay still requires all TTYs and exact canonical challenge before sidecar repair; newly entered metadata cannot replace canonical grant data.

### Stable errors

Preserve C03/C04 codes. Add stable C05 codes including:

```text
CAPABILITY_DISABLED
QUEST_NOT_DISPATCHABLE
DISPATCH_NOT_FOUND
DISPATCH_HIERARCHY_INVALID
DUPLICATE_ACTIVATION
ACTIVATION_TOO_LATE
ACTIVATION_REQUIRED
EXPLICIT_APPROVAL_REQUIRED
AUTOMATIC_LIMIT_EXCEEDED
AUTOMATIC_AUTHORITY_FORBIDDEN
INTERACTIVE_APPROVAL_REQUIRED
APPROVAL_CHALLENGE_MISMATCH
INVALID_APPROVAL_INPUT
DUPLICATE_ACTIVE_APPROVAL
DISPATCH_ALREADY_COMPLETED
APPROVAL_NOT_FOUND
REVOCATION_REASON_REQUIRED
INVALID_APPROVAL_TRANSITION
IDEMPOTENCY_KEY_CONFLICT
REQUEST_NOT_FOUND
REQUEST_STATE_MISMATCH
PROCEDURE_DIGEST_MISMATCH
POLICY_DIGEST_MISMATCH
REQUEST_DIGEST_MISMATCH
SCOPE_HASH_MISMATCH
REPOSITORY_INVALID
ARTIFACT_INVALID
WRITE_SCOPE_INVALID
```

Non-committed JSON errors preserve `{error:{code,message}}`. Existing richer committed-recovery rendering remains unchanged.

## Constraints and exclusions

- Preserve arbitrary historical `ownerSkill`, `provider`, and `taskRef` bytes and schema-v1 fixtures.
- Preserve current Context behavior and signature.
- Preserve current two-event Result/Proposal batch.
- Do not emit `approval.consumed`.
- Do not change workers, hooks, Skills, payload generation, cleanup inventories, package versions/export maps/root barrel, docs-site, or marketplace.
- No scheduler, network, automatic Git mutation, worker approval command, or cryptographic identity claim.
- Do not edit production until planning review passes and task is activated.
- Before editing `buildValidatedBatch`, issue explicit CRITICAL-risk warning and rerun upstream impact analysis.
- Approved CRITICAL boundaries are exactly: minimal version-aware `buildValidatedBatch`; ordered body-only Context hierarchy parity in C05-local `validateHierarchy`; C05-local detect-and-fail replacement hardening in `secureDirectory`, `writeSidecar`, and private helpers in the same materialization module. Any other HIGH/CRITICAL edit returns C05 to planning.
- Do not edit shared `writeFileAtomic`. Do not claim pure Node provides mathematical `openat` race freedom.

## Acceptance criteria

- [ ] Typed mixed-version batch emission preserves every schema-v1 behavior.
- [ ] Prepare emits exactly v1 Dispatch then v2 activation atomically with one timestamp/key.
- [ ] Historical bridge appends only activation and rewrites no Dispatch/request/event/projection state.
- [ ] Request and scope digest vectors cover all fields, normalization, ordering, omission, and drift.
- [ ] Automatic grants are impossible outside frozen bounds.
- [ ] Interactive approval has all-three-TTY and exact challenge gates with no registered bypass option.
- [ ] Grants bind activation, host, Procedure, policy, request, scope, and deterministic expiry.
- [ ] Revocation is canonical, reasoned, and terminal.
- [ ] C05 hierarchy failures match frozen Context relation ordering, codes, and messages; candidate prepare keeps distinct unclaimed-Run semantics; every failure remains zero-write.
- [ ] Sidecars are non-authoritative and same-key recoverable without replacement append.
- [ ] Deterministic parent/target/stage replacement interleavings detect drift, preserve unrelated replacements, and never leave sidecar bytes in injected outside trees; recovery remains ledger-first.
- [ ] Pure-Node replacement safety is documented as detect-and-fail, not absolute directory-FD-relative race freedom.
- [ ] Existing schema-v1, compatibility metadata, Context, Result/Proposal, worker, Skill, update, and uninstall regressions pass unchanged.
- [ ] Core/CLI full tests, lint, typecheck, builds, packed audits, task validation, specs, GitNexus changed-scope review, and `git diff --check` pass.
- [ ] Independent review, task archive, authorized child commit, and no push complete only after every gate passes.

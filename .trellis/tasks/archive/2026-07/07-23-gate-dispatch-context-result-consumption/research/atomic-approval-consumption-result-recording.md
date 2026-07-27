# Research: Atomic Approval Consumption with Result and Proposal Recording

- **Query**: Map the current `record-result`, `validateDispatchBatch`, mutation/event/reducer, uniqueness, idempotency, locking, replay, projection, and materialization paths; freeze the minimum typed `approval.consume` mutation and exact atomic three-event contract for C06.
- **Scope**: internal
- **Date**: 2026-07-24
- **Source baseline**: commit `8d59dc9`; GitNexus index current at this commit
- **Network**: not used

## Findings

## Decision Summary

C06 can add atomic approval consumption without changing the schema-v2 parser or reducer introduced by C02 and without changing the existing Result or Proposal schemas, payloads, event drafts, or tracked-file shapes.

The minimum public mutation addition is:

```ts
| {
    kind: "approval.consume";
    approvalId: ApprovalId;
    resultId: ResultId;
    proposalId: ProposalId;
  }
```

It intentionally does **not** accept `consumedAt`, activation ID, Dispatch ID, host, relation refs, actor, provenance, or idempotency key. Those values are already authoritative elsewhere:

- `consumedAt` comes from the one validated batch timestamp;
- Activation and Dispatch IDs come from the canonical selected approval grant;
- Result and Proposal IDs are the only same-batch entity references the caller must connect;
- host remains the canonical `ResearchApprovalGrant.host` selected and checked by Context;
- actor, provenance, and idempotency key come from the existing batch envelope.

The final valid production batch containing Result, Proposal, or consumption after the C06+C07 public cutover is:

```text
1. schema-v1 result.recorded
2. schema-v1 proposal.recorded
3. schema-v2 approval.consumed
```

During C06 internal readiness, `validateDispatchBatch` temporarily accepts only two isolated complete families:

```text
legacy:    result.recorded, proposal.recorded
successor: result.recorded, proposal.recorded, approval.consumed
```

The temporary legacy family keeps current public Context/workers/`record-result --file` coherent while successor recording is direct/internal. It rejects consumption-only, mixed, partial, reordered, extra, and mismatched shapes. C07 removes the legacy family in the same integration boundary as public Context, public record-result, both workers, shared hook, and generated workflow.

All three successor events must have contiguous sequence numbers and exactly one shared timestamp, actor, provenance, and idempotency key. Existing Result and Proposal payloads and related refs remain byte-shape compatible with schema v1.

The minimum implementation does **not** need to edit `buildValidatedBatch`, `validateResearchBatch`, `commitResearchBatch`, `parseResearchEvent`, `reduceResearchEvents`, or projection writing. Their current behavior already supplies progressive same-batch reduction, one timestamp, one envelope, lock serialization, validation-before-append, one serialized append call, and rebuild recovery. `validateDispatchBatch` is the one existing HIGH-risk core symbol that must change.

## Files Found

| File Path | Description |
|---|---|
| `packages/core/src/research/store.ts` | `ResearchMutation`, event-draft construction, batch validation, idempotency, lock, append, and projection recovery |
| `packages/core/src/research/events.ts` | Existing strict schema-v2 `approval.consumed` payload and relation parsing |
| `packages/core/src/research/reducer.ts` | Existing consumption adjacency, shared-envelope, expiry, relation, and terminal-state reduction |
| `packages/core/src/research/types.ts` | Existing grant host binding and consumed approval state |
| `packages/core/src/research/internal/lock.ts` | Filesystem serialization lock |
| `packages/core/src/research/projections.ts` | Existing schema-v1 projections and atomic projection-file replacement |
| `packages/cli/src/commands/research/dispatch-command.ts` | Current `recordResearchDispatchResult`, input parsing, Result/Proposal validation, mutation execution, and tracked-file materialization |
| `packages/cli/src/commands/research/dispatch-activation-command.ts` | Lifecycle replay classification and explicit-timestamp mutation executor reusable by C06 |
| `packages/cli/src/commands/research/dispatch-authority.ts` | Current authority/binding recomputation |
| `packages/cli/src/commands/research/dispatch-activation-materialization.ts` | Existing approval sidecar materializer |
| `packages/cli/src/commands/research/index.ts` | Commander registration and existing approval-ID parser |
| `packages/cli/src/commands/research/errors.ts` | Stable activation/approval error-code union |
| `packages/core/test/research/activation-approval.test.ts` | Existing C02 consumption parser/reducer fixtures and two-v1-event C05 compatibility characterization |
| `packages/core/test/research/dispatch.test.ts` | Existing Result/Proposal batch validation and uniqueness tests |
| `packages/core/test/research/store.test.ts` | Lock, idempotency, no-partial-validation, projection-failure, and rebuild tests |
| `packages/cli/test/commands/research-dispatch.integration.test.ts` | Current record-result integration, tracked files, artifact validation, and proposal review flow |
| `packages/cli/test/commands/research.test.ts` | Current exact command tree and option inventory |
| `packages/cli/test/commands/research-dispatch-compatibility.test.ts` | Frozen schema-v1 Result/Proposal input and tracked-file compatibility |
| `packages/cli/src/templates/claude/agents/trellis-research-worker.md` | Claude worker proposal-only/no-record-result authority |
| `packages/cli/src/templates/codex/agents/trellis-research-worker.toml` | Codex worker proposal-only/no-record-result authority |
| `packages/cli/src/templates/shared-hooks/inject-subagent-context.py` | Claude adapter validates `recordResult: false` |

## Current Core Path

### Mutation and draft construction

`ResearchMutation` currently has plan/grant/revoke followed by Result, Proposal, and Decision mutations, but no consumption mutation (`packages/core/src/research/store.ts:75-159`). Existing Result and Proposal mapping is already the required canonical v1 mapping:

```ts
case "result.record": {
  const result = resultSchema.parse(mutation.result);
  return {
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    kind: "result.recorded",
    aggregate: { type: "result", id: result.id },
    related: [
      { type: "dispatch", id: result.dispatchId },
      { type: "run", id: result.runId },
    ],
    payload: { result },
  };
}

case "proposal.record": {
  const proposal = proposalSchema.parse(mutation.proposal);
  return {
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    kind: "proposal.recorded",
    aggregate: { type: "proposal", id: proposal.id },
    related: [
      { type: "dispatch", id: proposal.dispatchId },
      { type: "quest", id: proposal.questId },
    ],
    payload: { proposal },
  };
}
```

Source: `packages/core/src/research/store.ts:745-769`.

The required new branch in `buildMutationEventDraft` is derivable entirely from the mutation plus canonical progressive state:

```ts
case "approval.consume": {
  const approval = state?.approvals[mutation.approvalId];
  if (!approval) {
    throw new Error(`Unknown research approval '${mutation.approvalId}'`);
  }
  return {
    schemaVersion: RESEARCH_EVENT_SCHEMA_VERSION,
    kind: "approval.consumed",
    aggregate: { type: "approval", id: mutation.approvalId },
    related: [
      { type: "activation", id: approval.grant.activationId },
      { type: "dispatch", id: approval.grant.dispatchId },
      { type: "result", id: mutation.resultId },
      { type: "proposal", id: mutation.proposalId },
    ],
    payload: {
      approvalId: mutation.approvalId,
      resultId: mutation.resultId,
      proposalId: mutation.proposalId,
      consumedAt: timestamp,
    },
  };
}
```

The branch should not trust caller-supplied Activation/Dispatch/host/ref/timestamp values because none are needed.

### Progressive validation already supports the three-event draft

`buildValidatedBatch` parses one timestamp once, builds each event with the same actor/provenance/key/timestamp, and reduces the ledger plus all events built so far after each draft (`packages/core/src/research/store.ts:309-354`). Therefore:

1. Result draft is parsed and reduced.
2. Proposal draft sees the Result in candidate state, is parsed, and is reduced.
3. Consumption draft sees canonical approval, Result, and Proposal state.
4. C02 reducer adjacency sees the immediately preceding Result and Proposal.
5. `validateDispatchBatch` checks the complete event list.
6. artifact digests validate before append.

A failure at step 2, 3, 4, 5, or 6 returns before any ledger append. No edit to `buildValidatedBatch` is required for the minimum design.

### Required `validateDispatchBatch` transition

Current behavior allows exactly two events whenever Result or Proposal appears (`packages/core/src/research/store.ts:357-383`). C06 and C07 change this in two reviewed states.

#### C06 internal readiness

The validator selects all three kinds but accepts only either exact isolated family:

```text
legacy:
  events.length == 2
  events[0].kind == result.recorded
  events[1].kind == proposal.recorded

successor:
  events.length == 3
  events[0].kind == result.recorded
  events[1].kind == proposal.recorded
  events[2].kind == approval.consumed
  result.dispatchId == proposal.dispatchId
  consumption.payload.resultId == result.id
  consumption.payload.proposalId == proposal.id
```

This preserves the current public writer while C06 tests the internal successor. It rejects Result alone, Proposal alone, consumption alone, partial/mixed/reordered/extra batches, and mismatched consumption IDs.

#### C07 atomic public cutover

After public Context, public record-result, both workers, shared hook, and generated workflow switch together, remove the legacy branch. Any Result, Proposal, or consumption event then requires the exact three-event successor family.

Decision validation beginning at `packages/core/src/research/store.ts:385` must remain unchanged in both states. The Result-family branch must not return early in a way that changes Decision behavior.

## C02 Already Parses and Reduces Consumption

C02 already owns the full read/replay contract. The minimum C06 emitter must reuse it unchanged.

### Strict payload parsing already exists

`parseSchemaV2Payload` accepts exactly `approvalId`, `resultId`, `proposalId`, and `consumedAt`, with strict ID and timestamp parsing (`packages/core/src/research/events.ts:177-223`). `validateSchemaV2Relations` requires exactly four refs in this order and binds Result/Proposal ref IDs to payload IDs (`packages/core/src/research/events.ts:296-312`).

### Raw replay adjacency already exists

Before reducing any consumption event, `reduceResearchEvents` calls `assertApprovalConsumptionAdjacency` (`packages/core/src/research/reducer.ts:64-89`). That helper requires the immediately preceding events to be Result then Proposal, checks the payload IDs, checks both Dispatch IDs agree, and requires all three events to share timestamp, actor, provenance, and idempotency key (`packages/core/src/research/reducer.ts:92-140`).

### Lifecycle and expiry reduction already exists

The consumption reducer (`packages/core/src/research/reducer.ts:723-776`) already requires:

- canonical approval, activation, Dispatch, Result, and Proposal exist;
- exact aggregate and `[Activation, Dispatch, Result, Proposal]` refs;
- approval status is `granted`;
- `consumedAt === event.timestamp`;
- `event.timestamp < approval.grant.expiresAt`;
- Activation, Dispatch, Result, Proposal, and Quest relations agree;
- terminal state becomes `{grant, status: "consumed", consumedAt, resultId, proposalId}`.

Expiry equality is already invalid because the reducer rejects `event.timestamp >= expiresAt` (`packages/core/src/research/reducer.ts:753-758`).

### Existing tests already cover the read side

`packages/core/test/research/activation-approval.test.ts:284-362` defines the exact Result/Proposal/consumption fixture. Existing tests cover malformed relation IDs, non-adjacency, wrong shared authority envelope, expiry equality, and consumed terminal state (`packages/core/test/research/activation-approval.test.ts:720-755` and nearby cases).

C02's store compatibility test intentionally proves the current C05 writer still appends only Result plus Proposal (`packages/core/test/research/activation-approval.test.ts:776-831`). C06 retains that characterization for the legacy public path and adds separate internal successor coverage. C07 replaces the public characterization with mandatory three-event writer behavior at atomic cutover.

**Conclusion**: do not edit `events.ts`, `reducer.ts`, or `types.ts` for the minimum emitter. Any discovered need to edit parser/reducer behavior is scope expansion and must trigger fresh impact analysis and a planning stop.

## Approval Validity at Consumption

The root command must capture one timestamp and use that same timestamp for precondition checks and the core batch. Valid consumption requires all of the following before append:

1. `--approval` is present and strictly parses as an `apr_` UUID.
2. The Dispatch exists.
3. Exactly one activation exists for the Dispatch through canonical `activationByDispatchId` state.
4. The selected approval exists.
5. The selected approval grant's `activationId` equals the Dispatch activation ID.
6. The grant's `dispatchId` equals the requested Dispatch ID.
7. Status is exactly `granted`.
8. Captured command time is strictly less than `expiresAt`; equality is expired.
9. No canonical Result or Proposal has already completed the Dispatch.
10. Existing Result/Proposal v1 relation checks still pass.
11. `revalidateDispatchActivationBindings` recomputes current hierarchy, capability, Procedure identity/digest, policy digest, request digest, and scope hash (`packages/cli/src/commands/research/dispatch-authority.ts:492-550`).
12. The approval's four grant bindings equal both the activation and current recomputation.
13. Core lock-time reduction still accepts the approval as granted and the Dispatch as incomplete, closing canonical-state races with revocation/another consumption.

Recommended stable error mapping from the C01 contract:

| Condition | Error |
|---|---|
| option absent or selected approval absent | `APPROVAL_REQUIRED` |
| selected approval belongs to another activation/Dispatch or has inconsistent canonical bindings | `APPROVAL_RELATION_MISMATCH` |
| selected approval is revoked | `APPROVAL_REVOKED` |
| selected approval is consumed, or Result/Proposal already exists | `DISPATCH_ALREADY_COMPLETED` |
| captured timestamp is equal to or later than expiry | `APPROVAL_EXPIRED` |
| current Procedure/policy/request/scope differs | existing matching `*_DIGEST_MISMATCH` or `SCOPE_HASH_MISMATCH` |

`APPROVAL_NOT_FOUND` currently exists for revocation semantics (`packages/cli/src/commands/research/errors.ts:26-49`). The frozen C06 contract specifically assigns absent consumption authority to `APPROVAL_REQUIRED`, so record-result should not silently reuse revoke's missing-target semantics.

## Expiry Semantics

Expiry is event-time eligibility, not an event or stored `expired` status:

```text
valid iff status == granted && commandTimestamp < expiresAt
expired iff status == granted && commandTimestamp >= expiresAt
```

The command timestamp must be captured once. Passing an explicit timestamp to `executeResearchLifecycleMutations` ensures CLI prevalidation and the event/reducer use the same value. The reducer never reads wall clock.

A same-key replay of an already committed consumption must be recognized before checking current expiry. Historical success remains success even after the grant's expiry time has passed.

## Host Binding Source

The canonical host source is `ResearchApprovalGrant.host`, whose exact values are `"claude" | "codex"`. Record-result must not add a second `--host` option.

The authority chain is:

1. C06 Context receives an execution host.
2. Context selects a currently valid approval whose canonical grant host exactly matches that host.
3. Context returns that exact approval ID to the root session.
4. The root session passes the exact ID to `record-result --approval`.
5. Record-result consumes that canonical grant.

The worker output stays `{result, proposal}` and therefore cannot claim or override a host. Explicit approval-ID selection disambiguates simultaneous valid Claude and Codex grants. If both exist, consuming one must leave the other grant unchanged.

`APPROVAL_HOST_MISMATCH` belongs primarily to Context's selection gate. The atomic record-result path has no independent host input to compare; it enforces the host-bound grant by consuming only the explicit Context-selected approval ID.

## Current CLI Record-Result Path and Required Integration

Current `RecordResearchDispatchResultOptions` contains only `dispatchId` and `file` (`packages/cli/src/commands/research/dispatch-command.ts:84-87`). Current `recordResearchDispatchResult` (`packages/cli/src/commands/research/dispatch-command.ts:616-709`):

1. resolves root and reads state;
2. requires Dispatch;
3. reads JSON from `options.file`;
4. requires exactly `{result, proposal}`;
5. strict-parses unchanged v1 schemas;
6. checks Dispatch/Run/Quest IDs and portable session ref;
7. validates artifacts;
8. executes only `result.record` and `proposal.record` through `executeRepositoryDispatchMutations`;
9. extracts canonical event payloads;
10. writes `result.json` and `proposal.json` after commit.

C06 should preserve steps 3-7 and 9-10 semantically while adding replay-first approval handling, current binding revalidation, the third mutation, and approval sidecar materialization.

### Frozen internal successor API

C06 adds one package-private successor exported only from `dispatch-command.ts` for focused in-package tests and C07 delegation; it is not re-exported from a package/public barrel:

```ts
type ResearchDispatchResultInput =
  | { kind: "path"; path: string; cwd: string }
  | { kind: "stdin"; read: () => string; cwd: string };

interface RecordApprovedResearchDispatchResultOptions
  extends ResearchMutationOptions {
  dispatchId: DispatchId;
  approvalId: ApprovalId;
  input: ResearchDispatchResultInput;
  now?: Date;
}

interface RecordApprovedResearchDispatchResultResult
  extends ResearchMutationResult {
  result: Result;
  proposal: Proposal;
  approval: ResearchApprovalState;
  resultFile: string | null;
  proposalFile: string | null;
  approvalFile: string | null;
}

async function recordApprovedResearchDispatchResult(
  options: RecordApprovedResearchDispatchResultOptions,
): Promise<RecordApprovedResearchDispatchResultResult>;
```

Boundaries:

- `ResearchMutationOptions` remains the only root/output/idempotency/dry-run option inheritance. No host, context digest, event draft, actor, provenance, or mutation list enters this API.
- `now` is package-private and test-only. New execution captures/uses one value; replay uses canonical events and does not revalidate current expiry.
- both input variants contain the same validated absolute command cwd captured once before async work. Successor code never recaptures `process.cwd()`.
- before first await, parse IDs/options and lexically resolve optional relative root plus any relative path token against that cwd, without opening/statting/reading input.
- stdin input is a lazy thunk, not eager bytes. After strict ledger read, exact replay classification must finish before input open/read, thunk invocation, current-time eligibility, authority/binding checks, or output-ID collision.
- new execution reads exactly one object to EOF and strict-parses exact `{result, proposal}` only after terminal/binding/collision gates.
- result returns canonical Result/Proposal plus consumed canonical approval and nullable paths for all three materializations. Dry-run paths are null; replay returns canonical entities and repairs files unless dry-run.

C07 deliberately replaces the public boundary with:

```ts
interface RecordResearchDispatchResultOptions
  extends ResearchMutationOptions {
  dispatchId: DispatchId;
  approvalId: ApprovalId;
  input: ResearchDispatchResultInput;
}

type RecordResearchDispatchResultResult =
  RecordApprovedResearchDispatchResultResult;
```

Public `recordResearchDispatchResult` captures one production timestamp and delegates; no public clock exists. Commander captures one absolute cwd and includes it in both lazy stdin and path variants. Relative root and path resolve against that single base. During C06, existing public `file` options/function/registration remain unchanged.

### Reuse the lifecycle executor

`executeResearchLifecycleMutations` already accepts an explicit timestamp, checks a matching key before validation, rechecks/classifies after dry-run or commit races, and returns canonical replay events (`packages/cli/src/commands/research/dispatch-activation-command.ts:122-194`). It is a better fit than changing generic `executeRepositoryDispatchMutations`.

Add a new Result-batch classifier, preferably as a new local symbol rather than altering existing classifiers. It must require exactly:

```text
result.recorded
proposal.recorded
approval.consumed
```

and verify expected Dispatch ID, expected approval ID, Result/Proposal payload relations, and consumption payload IDs. Any same-key match belonging to another family, target, approval, or batch shape throws `IDEMPOTENCY_KEY_CONFLICT`.

### Replay must be checked before ordinary preconditions

For an explicit idempotency key, record-result must classify a matching canonical batch before:

- rejecting consumed status;
- rejecting existing Result/Proposal;
- checking current expiry;
- recomputing current authority;
- requiring the original input file bytes to remain available.

This permits post-commit recovery from canonical events even after approval became terminal or the original input path disappeared. Commander may still require the input option syntactically, but replay recovery should not depend on reparsing it.

For a new execution, capture one timestamp, perform input and authority checks, then execute:

```ts
[
  { kind: "result.record", result },
  { kind: "proposal.record", proposal },
  {
    kind: "approval.consume",
    approvalId,
    resultId: result.id,
    proposalId: proposal.id,
  },
]
```

After commit or replay, extract the canonical Result/Proposal from events, read the reduced consumed approval state, verify it points to those canonical IDs, and materialize all three tracked outputs.

## Command-Surface Planning Gate

C01 froze:

```text
trellis research dispatch record-result <dispatch-id> --approval <apr-id> --input <path|->
```

Source: archived `activation-approval-contract.md:100-115`.

Current C05 registration is:

```text
trellis research dispatch record-result <dispatch-id> --file <json>
```

Source: `packages/cli/src/commands/research/index.ts:926-941`.

This is not a cosmetic discrepancy. Frozen `--input` also defines stdin behavior and path containment: `-` reads one object from stdin; a path is relative to the command working directory and must remain a contained regular non-symlink file inside the selected control-plane root.

Adopted transition:

1. C06 implements the approval-bound `--input` behavior behind a direct/internal successor helper while public `record-result --file` and the legacy two-event writer remain coherent.
2. C07 switches public registration to required `--approval` plus `--input` in the same integration boundary as Dispatch-ID Context, both workers, shared hook, generated workflow, and successor-only batch validation.
3. No undocumented `--file` alias survives final cutover.

## Uniqueness, Idempotency, Duplicate, and Replay Behavior

### Canonical uniqueness already enforced

- Ledger sequence must be globally contiguous and event IDs globally unique (`packages/core/src/research/events.ts:433-477`).
- Result IDs are unique; one Run can have only one Result (`packages/core/src/research/reducer.ts:500-525`).
- Proposal IDs are unique; one Dispatch can have only one Proposal (`packages/core/src/research/reducer.ts:528-557`).
- Approval consumption is a terminal transition (`packages/core/src/research/reducer.ts:748-775`).

Together these prevent a second successful execution for the same Dispatch hierarchy.

### Core idempotency is key lookup, not input equivalence

Both validation and commit filter all existing events by `idempotencyKey` before building a new batch (`packages/core/src/research/store.ts:241-275`). Core returns prior events without comparing the requested mutations. Therefore command-level classification is mandatory: otherwise reusing another command's key could be misreported as success.

The ledger parser does not prohibit the same idempotency key on multiple lines because a multi-event batch intentionally shares one key. The C06 classifier's exact length/order/target/approval checks establish that all matching lines form the one expected canonical batch.

### Required outcomes

| Scenario | Required result |
|---|---|
| exact same key, Dispatch, approval, and canonical three-event shape | return original events; append nothing; repair materializations |
| same key belongs to another command family | `IDEMPOTENCY_KEY_CONFLICT`; append nothing |
| same key has same family but different Dispatch or approval | `IDEMPOTENCY_KEY_CONFLICT`; append nothing |
| same key has missing/extra/reordered event | `IDEMPOTENCY_KEY_CONFLICT`; append nothing |
| same key exact canonical success but caller supplies drifted/new Result input | return prior canonical success; idempotency key is replay authority |
| different key after approval consumption or existing Result/Proposal | `DISPATCH_ALREADY_COMPLETED`; append nothing |
| concurrent same-key calls | one append; loser receives and classifies replay |
| concurrent different-key consume/revoke/result attempts | lock serializes; one valid transition wins; later candidate fails reduction with no append |

## Locking and Append Atomicity

`commitResearchBatch` holds `withResearchLock` across ledger read, idempotency lookup, complete batch construction, append, sequence-cache update, and projections (`packages/core/src/research/store.ts:257-294`). The lock uses an exclusive `wx` lock file, stale-PID recovery, retry timeout, and `finally` release (`packages/core/src/research/internal/lock.ts:12-60`).

The complete event list is built and reduced before append. The ledger write is one call:

```ts
fs.appendFileSync(
  paths.eventsFile,
  serializeResearchEvents(validation.events),
  "utf-8",
);
```

Source: `packages/core/src/research/store.ts:275-281`.

This guarantees there is no application-level sequence of “append Result, then append Proposal, then append consumption.” All three are serialized once under the same lock after complete validation.

### Crash-atomicity caveat

The current store does not fsync the ledger and does not use a transactional temp-file replacement for append. One `appendFileSync` call prevents intentional split appends but is not a formal power-loss guarantee that the operating system can never leave a partial final write. If “no partial append” means crash/power-loss byte-level atomicity rather than application-level all-before-one-append behavior, that requires a broader CRITICAL store durability design and is outside the minimum C06 change. This must be resolved explicitly rather than overstating the existing primitive.

## Projection and Materialization Recovery

### Core projections

After append, core rewrites existing schema-v1 projections and cache. A failure throws `ResearchProjectionError` with the committed head (`packages/core/src/research/store.ts:282-291`). The ledger remains canonical. Recovery is:

```text
trellis research rebuild
```

A same-key commit replay does not rerun projection writing because replay returns before `writeResearchProjections`; therefore rebuild, not only command retry, is required for stale core projections.

C02 deliberately creates no general activation/approval projection tree. Existing projections advance `projectedThroughSeq` to the complete mixed-ledger head while preserving existing entity data/update semantics (`packages/core/src/research/projections.ts:78-160`; archived C02 design lines 109-113).

### Result, Proposal, and approval tracked materializations

Result and Proposal tracked files are CLI post-commit materializations. Existing code extracts their canonical event payloads and writes them after commit (`packages/cli/src/commands/research/dispatch-command.ts:667-708`). C06 must preserve the exact payloads/files and add the canonical consumed approval sidecar.

`materializeResearchApproval` already writes:

```text
.trellis/research/dispatches/<dsp-id>/approvals/<apr-id>.json
```

with exact envelope:

```ts
{ schemaVersion: 2, approval: ResearchApprovalState }
```

Source: `packages/cli/src/commands/research/dispatch-activation-materialization.ts:480-498`.

The sidecar writer already validates containment, non-symlink directory chain, target identity, staging identity, fsync, atomic publication, and published bytes. It throws `ResearchDispatchFileError` carrying committed head, target, and recovery instruction.

Required recovery behavior:

1. Append succeeds.
2. Any of `result.json`, `proposal.json`, or approval sidecar write fails.
3. Report `committed: true`, head, exact target, and original-key recovery.
4. Retry with the same key.
5. Classify the canonical three-event replay before terminal/current checks.
6. Reconstruct Result and Proposal from event payloads and approval from reduced ledger state.
7. Rewrite all three materializations without appending.

Never retry a committed materialization failure under a new key.

Context must not repair sidecars; it is zero-write. Record-result's same-key post-commit recovery is the mutation-side repair path.

## Worker Prohibition

Workers remain proposal-only and must never receive or emit an approval mutation.

- Claude worker requires `authority.canonicalResearchMutation === false` and `authority.recordResult === false`, and explicitly forbids `trellis research dispatch record-result` (`packages/cli/src/templates/claude/agents/trellis-research-worker.md:23-35,75-91`).
- Codex worker enforces the same authority and prohibition (`packages/cli/src/templates/codex/agents/trellis-research-worker.toml:83-101,167-180`).
- Claude adapter validates `recordResult: false` (`packages/cli/src/templates/shared-hooks/inject-subagent-context.py:181-194`).

Worker output remains exactly two top-level keys in order: `result`, then `proposal`. No `approvalId`, host, consumption request, event draft, or mutation field is added to worker JSON. The root session obtains the approval ID from Context and supplies it to record-result separately.

These worker files should remain unchanged for the minimum atomic-consumption implementation; tests should characterize the prohibition.

## Existing Production Symbols Requiring Edits

The following is the minimum existing-symbol edit set for atomic consumption. New helpers/classifiers do not have pre-edit impact results.

| Existing symbol | Required edit | Fresh upstream impact | Source-known reach |
|---|---|---|---|
| `ResearchMutation` | add minimum `approval.consume` variant | **UNKNOWN**; GitNexus could not resolve type alias | public store input used by all Research mutation producers; use store validation/commit family as lower bound |
| `buildMutationEventDraft` | map consumption mutation to schema-v2 draft derived from canonical approval state | LOW; 5 impacted, 1 direct, 2 process families | direct `mutationToEventDraft`; indirect `buildValidatedBatch`, validation, commit, Decision expected-draft path |
| `validateDispatchBatch` | C06 accepts only isolated legacy two-event and successor three-event families; C07 removes legacy family and requires exact Result/Proposal/consumption | **HIGH**; 6 impacted, 1 direct, 3 process families | direct `buildValidatedBatch`; indirect public validate/commit and CLI mutation executors |
| `RecordResearchDispatchResultOptions` | C06 adds successor-only approval/input options beside unchanged legacy public options; C07 replaces public option type deliberately | LOW; 2 impacted, 1 direct import | `index.ts`, CLI root import chain, direct integration-test calls |
| `recordResearchDispatchResult` | replay-first classifier; approval/binding/expiry checks; explicit timestamp; third mutation; approval materialization | LOW; GitNexus reports 0 upstream | source inspection finds direct calls in `research-dispatch.integration.test.ts` and `research-workflow.integration.test.ts`, plus Commander callback |
| `DispatchRecordResultCliOptions` | C07 requires parsed approval/input and removes legacy file option | LOW; 1 impacted | CLI index/root registration path |
| `registerResearchCommand` | C07 requires `--approval` + `--input`, removes `--file`, and maps parsed fields to the C06 successor | LOW; 1 direct upstream file | command-tree tests and CLI integration tests also consume the registered shape |
| `ResearchActivationErrorCode` | add frozen atomic-consumption codes | **UNKNOWN**; GitNexus could not resolve type alias | `ResearchActivationError` constructors and CLI rendering across activation/context/result paths |

Fresh GitNexus results were collected against the current `8d59dc9` index. The graph under-reports static/direct test calls for `recordResearchDispatchResult` and `registerResearchCommand`; source-known consumers remain mandatory coverage.

### Existing symbols that should be reused unchanged

| Symbol | Why no minimum edit is needed |
|---|---|
| `buildValidatedBatch` | already captures one timestamp and progressively parses/reduces all drafts before append |
| `validateResearchBatch` | already lock-validates and returns replay/candidate state |
| `commitResearchBatch` | already lock-serializes, validates before one append, returns replay, and reports projection failure |
| `parseResearchEvent` / `parseSchemaV2Payload` | C02 already strictly parses consumption |
| `reduceResearchEvents` / consumption reducer | C02 already validates order, envelope, expiry, relations, and terminal state |
| `executeResearchLifecycleMutations` | already provides explicit timestamp, replay-first/race classification, dry-run, and commit handling |
| `findResearchLifecycleReplay` | already finds all same-key events for exact command classification |
| `revalidateDispatchActivationBindings` | already recomputes hierarchy and all four current bindings |
| `materializeResearchApproval` | already writes the exact canonical sidecar with committed recovery errors |
| existing Result/Proposal schemas and event branches | frozen schema-v1 compatibility authority |

## HIGH / CRITICAL Planning Gates

### Triggered mandatory gate

`validateDispatchBatch` is **HIGH** risk. Before implementation edits it, the main session must explicitly acknowledge the blast radius and retain coverage for all three affected process families reported by GitNexus:

- `executeRepositoryDispatchMutations` flows;
- `invalidateResearchRun` / generic Research mutation flows;
- `executeResearchLifecycleMutations` flows.

The edit is inside approved C06 scope, but HIGH still requires the explicit warning/review gate.

### Frozen stop gates if implementation expands

The minimum design does not edit the following archived HIGH/CRITICAL symbols. If implementation discovers a need to do so, stop and return to planning before editing:

- `buildValidatedBatch` — archived **CRITICAL** lower bound;
- `validateResearchBatch` — archived **CRITICAL** lower bound;
- `commitResearchBatch` — archived **CRITICAL** lower bound;
- `reduceResearchEvents` — **CRITICAL**;
- `parseResearchEvent` — **HIGH**;
- `stableResearchJson` — **CRITICAL**;
- projection/lock helpers if durability semantics are broadened — rerun exact impact first.

The current GitNexus index may report different counts from the archived C01 map as the branch evolved. Risk must not be downgraded below the frozen lower-bound gate without an explicit reviewed reason.

## Exact Test Matrix

### Core mutation and batch tests

1. Add `approval.consume` emission test with an existing valid activation/grant and assert exact schemas/kinds:
   ```text
   [1 result.recorded, 1 proposal.recorded, 2 approval.consumed]
   ```
2. Assert contiguous seq and same timestamp, actor, provenance, and key on all three.
3. Assert consumption aggregate and exact related order `[Activation, Dispatch, Result, Proposal]`.
4. Assert consumption payload IDs equal same-batch Result/Proposal IDs and `consumedAt` equals event timestamp.
5. Assert Result/Proposal event payloads and refs equal pre-C06 schema-v1 fixtures exactly.
6. Reject Result alone with unchanged ledger.
7. Reject Proposal alone with unchanged ledger.
8. During C06 internal readiness, retain the exact isolated legacy Result+Proposal family and existing public lifecycle characterization.
9. During C07 final cutover, reject Result plus Proposal without consumption with unchanged ledger.
10. Reject consumption alone with unchanged ledger.
11. Reject partial, mixed, reordered, or extra event/mutation shapes with unchanged ledger.
12. Reject mismatched consumption Result ID and Proposal ID with unchanged ledger.
13. Reject foreign approval/activation/Dispatch relations with unchanged ledger.
14. Reject revoked approval as a late third mutation with no Result/Proposal append.
15. Reject consumed approval as a late third mutation with no Result/Proposal append.
16. Reject expiry equality and post-expiry consumption with no append.
17. Preserve Decision batch behavior unchanged after the validator edit.
18. Dry-run validates the exact three events and leaves ledger/projections unchanged.
19. Same key returns the original exact three events and does not append.
20. Concurrent different-key consumption/revocation attempts serialize; exactly one terminal transition can win.
21. Projection failure after three-event append leaves canonical ledger through consumption; deterministic rebuild restores current projection watermarks.

Existing C02 parser/reducer tests remain and should not be rewritten merely to duplicate emitter coverage.

### CLI record-result tests

1. Commander requires `--approval <apr-id>` and strictly rejects malformed IDs before callback.
2. C06 direct tests freeze `recordApprovedResearchDispatchResult`, its exact options/result types, path `{path,cwd}` and lazy stdin variants, optional internal clock, and `ResearchMutationOptions` inheritance while legacy public `--file` remains characterized; C07 command/API tests replace the public types/delegate, require public `--input`, and reject `--file` without alias.
3. Successful command appends exactly three events in canonical order.
4. Result and Proposal input remains exactly `{result, proposal}`; extra approval/consumption top-level keys fail.
5. Successful command leaves Result/Proposal tracked JSON schema and bytes semantically unchanged.
6. Successful command reduces selected approval to consumed with exact Result/Proposal IDs.
7. Successful command materializes exact consumed approval sidecar envelope.
8. Missing selected approval returns `APPROVAL_REQUIRED`; no append/files.
9. Foreign Dispatch or Activation approval returns `APPROVAL_RELATION_MISMATCH`; no append/files.
10. Revoked approval returns `APPROVAL_REVOKED`; no append/files.
11. Already consumed approval or existing Dispatch Result/Proposal under a different key returns `DISPATCH_ALREADY_COMPLETED`.
12. Expiry equality and later return `APPROVAL_EXPIRED`.
13. Procedure, policy, request, and scope drift return their exact existing mismatch codes before append.
14. Invalid Result relation, invalid Proposal relation, malformed payload, or artifact digest failure appends nothing and does not consume approval.
15. Two simultaneously valid different-host grants: consume the Context-selected ID only; the other remains granted.
16. Same explicit key replays before current expiry/terminal/input checks, neither resolves a missing/replaced path nor invokes a throwing stdin thunk, and appends nothing.
17. Delete each of `result.json`, `proposal.json`, and approval sidecar after success; same-key replay repairs all three without append.
18. Force each materialization target to fail after append; error reports `committed: true`, head, target, and original-key recovery.
19. Same-key collision with another command family, Dispatch, approval, or batch shape returns `IDEMPOTENCY_KEY_CONFLICT`.
20. Concurrent same-key calls produce one batch and one classified replay.
21. Concurrent revoke versus record-result produces one winner and no two-event partial batch.
22. Dry-run validates approval and prospective three-event shape but writes no durable ledger, tracked Result/Proposal, or approval sidecar.
23. Test adopted successor `--input`: Commander captures one absolute cwd exactly once and places it in both variants; optional relative root and relative path resolve synchronously against it before first await; stdin `-` maps to a lazy reader; outside-root/symlink/non-regular/malformed/multiple JSON fail; replay recovery never opens/reads unavailable original input or invokes stdin.

### Regression suites

- `packages/core/test/research/activation-approval.test.ts`
- `packages/core/test/research/dispatch.test.ts`
- `packages/core/test/research/store.test.ts`
- `packages/cli/test/commands/research.test.ts`
- `packages/cli/test/commands/research-dispatch.integration.test.ts`
- `packages/cli/test/commands/research-dispatch-activation.integration.test.ts`
- `packages/cli/test/commands/research-dispatch-context.integration.test.ts`
- `packages/cli/test/commands/research-workflow.integration.test.ts`
- `packages/cli/test/commands/research-dispatch-compatibility.test.ts`
- worker/template/hook tests that assert `recordResult: false` and forbid `record-result`

The HIGH validator gate also requires broad core/CLI Research typecheck and build, not only focused tests.

## C06 Exclusions Frozen for This Atomic-Consumption Path

1. No Result, Proposal, Dispatch, Decision, or tracked schema-v1 shape change.
2. No worker JSON approval/consumption field.
3. No worker authority to invoke record-result, append events, review Proposal, or consume approval.
4. No `--host` input on record-result; host authority remains the selected grant.
5. No raw event append API.
6. No consumption-only command or standalone consumption event append.
7. No two-event Result/Proposal compatibility path after C07 final public cutover; C06 internal readiness retains only the exact isolated legacy family.
8. No wall-clock reads in reducer and no synthetic `approval.expired` event/status.
9. No parser/reducer rewrite when C02 behavior already satisfies the frozen contract.
10. No general activation/approval projections; only existing sidecars and existing projection watermarks.
11. No sidecar-as-authority validation in the core reducer.
12. No Context-side repair; Context remains zero-write.
13. No generic lock/append/projection redesign unless crash-level durability is separately approved.
14. No Decision batch semantic changes while extending `validateDispatchBatch`.
15. No capability registry, Procedure merge, policy merge, or grant-duration rule changes.
16. No worker/host cutover, Skill retirement, template redesign, or packed-payload cleanup owned by C07-C09.
17. No ledger rewrite, truncation, down-conversion, or v1 rollback after v2 exists.
18. No speculative multi-Dispatch workflow execution semantics.

## Related Specs and Archived Contracts

- `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/activation-approval-contract.md` — normative C01 command, three-event, validity, expiry, relation, error, materialization, and worker contract
- `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/gitnexus-impact-map.md` — frozen HIGH/CRITICAL lower-bound gates
- `.trellis/tasks/archive/2026-07/07-23-add-dual-version-activation-approval-state/design.md` — C02/C05/C06 ownership boundary and existing read/reduce behavior
- `.trellis/spec/core/backend/research-state.md` — current canonical ledger/store and mixed-version ownership
- `.trellis/spec/cli/backend/commands-research.md` — current C05 command behavior and explicit C06 deferral
- `.trellis/tasks/07-23-replace-research-skills-with-trellis-procedures/prd.md` — parent compatibility and atomic-consumption requirement
- `.trellis/tasks/07-23-replace-research-skills-with-trellis-procedures/implement.md` — child ordering and impact gates

## External References

None. Network access was not used.

## Caveats / Not Found

1. GitNexus cannot resolve `ResearchMutation` or `ResearchActivationErrorCode`; both remain **UNKNOWN**, not LOW. Resolved store/command symbols and source-known imports are the lower bound.
2. GitNexus currently reports zero upstream dependants for `recordResearchDispatchResult`, but source search finds direct integration-test calls and the Commander callback. Do not rely on the graph count alone.
3. Adopted transition: C06 implements frozen package-private `recordApprovedResearchDispatchResult` with approval ID, discriminated path/stdin input, captured cwd, test-only clock, and consumed-approval result while preserving public `--file`; C07 replaces public types/delegate/registration with `--input` and removes `--file` atomically.
4. Existing one-call append semantics prevent application-level split batches but do not formally prove power-loss byte-level atomicity.
5. Same-key replay repairs CLI tracked materializations but does not itself rebuild stale core projections; `trellis research rebuild` remains required after `ResearchProjectionError`.
6. The repository already had unrelated modified paths (`AGENTS.md`, `CLAUDE.md`, `docs-site`, and `marketplace`) before this research artifact was written. They were not read as research inputs or modified by this work.

# Frozen Activation and Approval Contract

## 1. Scope / Trigger

This is the normative successor contract for C02, C05, and C06. C01 freezes it without emitting schema-v2 events or changing current command behavior.

Activation and approval are canonical ledger state. They bind one existing schema-v1 Dispatch to one immutable capability, Procedure, policy, request, resolved scope, and execution host. Sidecars are strict non-authoritative materializations. Dispatch Context remains read-only. Workers remain proposal-only.

## 2. Signatures

### IDs and entities

```ts
type ActivationId = `act_${string}`;
type ApprovalId = `apr_${string}`;

type ApprovalStatus = "granted" | "revoked" | "consumed";

interface ResearchActivation {
  id: ActivationId;
  dispatchId: DispatchId;
  questId: QuestId;
  capabilityId: string;
  mode: "automatic" | "explicit";
  procedure: {
    id: string;
    version: string;
    digest: string;
  };
  policyDigest: string;
  requestDigest: string;
  scopeHash: string;
  maxDurationMinutes: number;
  maxDispatches: number;
  createdAt: string;
}

interface ResearchApprovalGrant {
  id: ApprovalId;
  activationId: ActivationId;
  dispatchId: DispatchId;
  host: "claude" | "codex";
  mode: "automatic" | "interactive";
  approverLabel: string;
  rationale: string;
  requestDigest: string;
  procedureDigest: string;
  policyDigest: string;
  scopeHash: string;
  grantedAt: string;
  expiresAt: string;
}

interface ResearchApprovalState {
  grant: ResearchApprovalGrant;
  status: ApprovalStatus;
  revokedAt?: string;
  revocationReason?: string;
  consumedAt?: string;
  resultId?: ResultId;
  proposalId?: ProposalId;
}
```

IDs use `crypto.randomUUID()` with exact lowercase prefixes `act_` and `apr_`. Existing IDs and event IDs remain unchanged.

### Schema-v2 event kinds

```ts
type ResearchSchemaV2EventKind =
  | "activation.planned"
  | "approval.granted"
  | "approval.revoked"
  | "approval.consumed";
```

Exact payloads:

```ts
{ activation: ResearchActivation }

{ approval: ResearchApprovalGrant }

{
  approvalId: ApprovalId;
  revokedAt: string;
  reason: string;
}

{
  approvalId: ApprovalId;
  resultId: ResultId;
  proposalId: ProposalId;
  consumedAt: string;
}
```

No other keys are allowed. `null` never substitutes for omitted optional entity fields.

### Canonical command surface

```text
trellis research dispatch prepare ... --capability <id>
trellis research dispatch plan-activation <dispatch-id> --capability <id>
trellis research dispatch authorize <dispatch-id> --host <claude|codex>
trellis research dispatch approve <dispatch-id> --host <claude|codex>
trellis research dispatch revoke <approval-id> [--reason <text>]
trellis research dispatch context <dispatch-id> --host <claude|codex>
trellis research dispatch record-result <dispatch-id> --approval <apr-id> --input <path|->
```

All event-producing commands retain `--idempotency-key`, `--dry-run`, and `--json` except interactive `approve`, which forbids `--json`, `--dry-run`, `--yes`, `--force`, and redirected/non-TTY input. `approve` renders a human authority summary and prompts for label, rationale, and challenge phrase.

`context` is zero-write and supports `--json`. It no longer accepts request-file routing or `--skill-name` after C06 cutover. `record-result` requires the exact approval ID returned in normalized Context. `--input -` reads one strict JSON object from stdin; a path resolves from the exact command working directory and must remain inside the selected control-plane root as a regular non-symlink file. `revoke --reason` accepts the required reason non-interactively; when omitted, only an interactive TTY prompt may supply it.

## 3. Contracts

### Event envelope versions

Existing event kinds remain valid only with the exact schema-v1 envelope and payload definitions. The four new kinds are valid only with `schemaVersion: 2`.

A schema-v2 event uses the existing envelope fields and semantics:

```ts
interface ResearchSchemaV2Event {
  schemaVersion: 2;
  eventId: EventId;
  seq: number;
  timestamp: string;
  kind: ResearchSchemaV2EventKind;
  aggregate: ResearchAggregateRef;
  related: ResearchAggregateRef[];
  payload: Record<string, unknown>;
  actor: ResearchActor;
  idempotencyKey: string;
  provenance: ResearchProvenance;
}
```

Schema-v2 adds aggregate types `activation` and `approval` only for the new event family. Existing v1 event definitions, aggregate types, payloads, and parser results are untouched. A v1 kind with `schemaVersion: 2`, or a v2 kind with `schemaVersion: 1`, is invalid.

Exact aggregate/related references:

| Event | Aggregate | Related, exact order |
|---|---|---|
| `activation.planned` | `{type:"activation", id: activation.id}` | Dispatch, Quest |
| `approval.granted` | `{type:"approval", id: approval.id}` | Activation, Dispatch, Quest |
| `approval.revoked` | matching Approval | Activation, Dispatch |
| `approval.consumed` | matching Approval | Activation, Dispatch, Result, Proposal |

Every reference must equal the referenced canonical entity. Extra, missing, duplicated, reordered, or mismatched refs fail strict parsing/reduction.

### Activation planning

There is exactly one activation per Dispatch and one Dispatch per activation. Activation is immutable after `activation.planned`.

Validation order is:

1. Strict-read and reduce the complete mixed ledger.
2. Require existing Dispatch, Quest, Run, Repository, and valid hierarchy.
3. Require no existing activation for the Dispatch.
4. Resolve capability from explicit ID and require exact current Quest stage.
5. Resolve strict policy and Procedure.
6. Recompute request digest and resolved scope hash through the same zero-write observation rules used by Context.
7. Derive effective limits and mode from registry, the validated Procedure, and policy using the tightening-only merge frozen in `procedure-capability-policy-contract.md`.
8. Validate the complete candidate event batch before append.

For a new Dispatch, `prepare --capability` commits exactly this ordered canonical batch:

```text
1. schema-v1 dispatch.recorded
2. schema-v2 activation.planned
```

The existing Dispatch payload is unchanged. Failure in either mutation rejects the complete batch.

`plan-activation` is the compatibility bridge for an existing v1 Dispatch. It is allowed only when the Dispatch has no activation, no Result, no Proposal, and its Run/Quest hierarchy is still eligible. It commits exactly one `activation.planned` event. It does not replace or rewrite Dispatch, request, or compatibility metadata.

The activation `mode` is `explicit` when the registry is explicit, the kind is workflow, or project policy tightens activation to explicit. Otherwise it is `automatic`. Limits are the effective tightening-only values. `maxDispatches` describes the selected capability plan; the current one-Dispatch entity remains bound to this activation. No worker may create the additional Dispatches allowed to an explicitly approved workflow; only root-side orchestration may do so through separately validated Dispatch/activation pairs.

### Grant rules

A grant requires an existing activation, matching Dispatch/Quest hierarchy, no Result for the Dispatch, and complete digest/scope recomputation equal to activation.

`authorize` may create only an automatic grant. It requires a bounded, automatic activation within all automatic limits: no network, no external cost, one Repository, no canonical mutation, no chaining, at most one Dispatch, and at most 15 minutes. It records:

```text
mode = automatic
approverLabel = trellis-policy-v1
rationale = Eligible under immutable registry and project policy.
```

`approve` may create an interactive grant for explicit/workflow/out-of-automatic-policy activation. Before any event or sidecar write it must:

1. require `process.stdin.isTTY`, `process.stdout.isTTY`, and `process.stderr.isTTY` all equal `true`;
2. recompute all bindings and render Dispatch ID, Quest, capability, kind, Procedure ID/version/digest, policy digest, request digest, scope hash, host, Repository count, network/cost/mutation/chaining flags, duration, Dispatch limit, read artifacts, write paths, expected outputs, and checks;
3. prompt for a non-empty operator label of at most 128 characters;
4. prompt for a non-empty rationale of at most 1,024 characters;
5. require the exact case-sensitive challenge phrase below.

Challenge phrase:

```text
APPROVE <dispatch-id> <host> <first-12-hex-of-request-digest>
```

The digest fragment excludes `sha256:`. No trim other than removing the terminal input newline is applied. A mismatch aborts with no write. This proves deliberate local interaction, not cryptographic identity.

For both modes, `grantedAt` is the command timestamp. `expiresAt` is exactly `grantedAt + maxDurationMinutes * 60,000 milliseconds`, serialized as canonical UTC RFC3339 with millisecond precision. It must be later than `grantedAt`.

At most one unexpired `granted` approval may exist for an activation/host. A second grant is rejected. A new grant is allowed after the prior approval is revoked or has reached expiry, provided no Result exists and all bindings still match. During deterministic replay, the new `approval.granted` event timestamp is the captured comparison time: it must be greater than or equal to every prior still-`granted` approval's `expiresAt` for the same activation/host. Reducers never consult wall clock. Approval IDs remain globally unique.

### Expiry and terminal state

Expiry is a deterministic eligibility calculation, not a ledger mutation or reducer status:

```text
valid at now iff status == granted AND now < expiresAt
expired at now iff status == granted AND now >= expiresAt
```

Timestamps compare by parsed UTC epoch milliseconds. Invalid or non-canonical timestamps fail parsing. Equality is expired. Clock input is captured once at the command/Context boundary and passed through validation; reducer replay never reads the wall clock.

`revoked` and `consumed` are terminal reducer states. They cannot return to `granted` and cannot transition to each other.

### Revocation

`revoke <approval-id>` requires an existing approval whose reducer status is `granted`. Revocation is allowed before or after derived expiry, but not after consumption or prior revocation. `reason` is required, non-empty after no normalization beyond terminal-line-ending removal, and at most 1,024 characters. `--reason <text>` supplies it for JSON, dry-run, and non-TTY use. If omitted, stdin and stdout must be TTYs and one prompt collects it; otherwise fail before writes. No implicit default reason is persisted. `revokedAt` must be at or after `grantedAt`.

Revocation commits one `approval.revoked` event. Dry-run validates without writes. Idempotent replay with the same key returns the same event. A different key after terminal revocation fails rather than inventing another transition.

### Read-only Context gate

`context <dispatch-id> --host ...` performs no mutation, lock, runtime write, sidecar repair, observation write, session write, target write, or Git history change.

It strict-reads canonical mixed ledger and non-authoritative materializations, then requires:

- existing Dispatch and exactly one activation;
- current Quest/Run/Repository hierarchy is dispatchable;
- one matching host approval whose status is `granted` and `now < expiresAt`;
- no Result already exists for the Dispatch;
- capability still exists and matches activation/Quest stage;
- strict Procedure and policy resolve to the same digests;
- canonical Dispatch produces the same request digest;
- current Repository/artifact/write scope produces the same scope hash;
- tracked `request.json`, `activation.json`, and the selected approval's `<apr-id>.json` all exist as contained regular non-symlink files, strict-parse, and are semantically equal to canonical state.

It then returns the normalized embedded-Procedure input from `procedure-capability-policy-contract.md`. Any mismatch returns one typed no-write failure and no partial context.

### Approval consumption and Result recording

Worker output remains exactly `{result, proposal}`. It cannot contain an approval event or consumption request.

Root-side `record-result` strict-parses the input and the mandatory `--approval <apr-id>`. The selected approval must belong to the Dispatch activation and must equal the `approval.id` supplied in the normalized Context that authorized the worker. This explicit ID disambiguates concurrent valid Claude and Codex grants without changing worker Result/Proposal JSON. The command commits exactly this ordered canonical batch:

```text
1. schema-v1 result.recorded
2. schema-v1 proposal.recorded
3. schema-v2 approval.consumed
```

The three events share the command actor, provenance, timestamp, and idempotency key and receive contiguous sequences. Consumption payload IDs must equal the Result/Proposal in the same batch. The Result and Proposal must match Dispatch/Run/Quest under existing v1 rules. The selected approval ID, host, activation, and all four bindings must match canonical state and current recomputation. The approval must be `granted` and unexpired at the command timestamp. A missing, malformed, foreign, revoked, consumed, expired, or otherwise non-matching `--approval` fails before append.

Any invalid Result, Proposal, approval, relationship, digest, scope, expiry, duplicate Result, or event draft rejects the complete batch. No two-event Result/Proposal append is allowed after approval gating lands. No consumption-only append is allowed. If append succeeds but a tracked materialization fails, canonical state remains committed and recovery uses the same idempotency key; never append a replacement batch.

Consumption sets status `consumed`, `consumedAt`, `resultId`, and `proposalId`. Existing canonical Result uniqueness prevents a second successful execution for one Dispatch.

### Materializations

Strict non-authoritative sidecars use stable JSON with one trailing LF and atomic replacement:

```text
.trellis/research/dispatches/<dsp-id>/activation.json
.trellis/research/dispatches/<dsp-id>/approvals/<apr-id>.json
```

`activation.json` is exactly `{schemaVersion:2, activation}`. Approval files are exactly `{schemaVersion:2, approval: ResearchApprovalState}`. Unknown keys, wrong IDs, stale status, digest mismatch, symlinks, non-regular files, or semantic difference from canonical state produce `MATERIALIZATION_STATE_MISMATCH`; commands never treat sidecars as authority or repair them during Context.

Event commit precedes materialization. Post-commit materialization failure reports `committed: true`, ledger head, target path, and same-key recovery. Retry reconstructs from canonical events without a new ledger append.

### Mixed replay and projection behavior

The ledger parser accepts an arbitrary sequence mix of valid v1 and v2 events while enforcing one global contiguous sequence and unique event ID set. Reduction applies events in sequence to one state containing all existing v1 maps plus:

```ts
activations: Record<ActivationId, ResearchActivation>;
activationByDispatchId: Partial<Record<DispatchId, ActivationId>>;
approvals: Record<ApprovalId, ResearchApprovalState>;
approvalIdsByActivationId: Partial<Record<ActivationId, ApprovalId[]>>;
```

Existing v1 state fields and entity values are unchanged. New events do not create general activation/approval tracked projections. Existing projection schemas remain unchanged; rebuild advances their existing `projectedThroughSeq` to the complete mixed-ledger head while leaving entity `data` and `updatedAt` unchanged for activation/approval-only events.

Replay/rebuild errors are deterministic from ledger bytes. Reducer code never reads policy, Procedure files, sidecars, filesystem scope, or wall clock.

### Rollout and rollback

Required rollout order:

1. C02 adds dual-version parser/reducer/state support and mixed replay tests while no production command emits v2.
2. C03/C04 add inactive registry, Procedure, and policy resolution.
3. C05 adds activation/approval commands and emitters.
4. C06 gates Context and adds atomic consumption.
5. C07 cuts both host workers over together.
6. C08/C09 stop generation and retire/remove Skills only after parity and cleanup evidence.

Before the first schema-v2 event is emitted, code rollback to a v1-only release is allowed if no v2 ledger exists. Once any canonical ledger contains a v2 event, rollback to a v1-only reader is unsupported. Do not delete, rewrite, down-convert, or truncate v2 events. Recovery is forward-fix only with a reader that preserves all v1 and v2 bytes.

## 4. Validation & Error Matrix

| Condition | Required behavior / stable code |
|---|---|
| `prepare` omits/uses unknown capability after cutover | `UNKNOWN_CAPABILITY`; no Dispatch or activation |
| Capability stage differs from canonical Quest | `CAPABILITY_STAGE_MISMATCH`; no append |
| Existing v1 Dispatch has no activation | `plan-activation` may bridge if otherwise untouched/eligible; Context returns `ACTIVATION_REQUIRED` |
| Dispatch already has activation | `DUPLICATE_ACTIVATION` |
| Existing Dispatch already has Result/Proposal | `ACTIVATION_TOO_LATE` |
| `authorize` targets explicit/workflow/out-of-bounds activation | `EXPLICIT_APPROVAL_REQUIRED` |
| `approve` is non-TTY or receives `--yes`/automation flag | Commander/`INTERACTIVE_APPROVAL_REQUIRED`; no callback write |
| Challenge phrase differs in case, spacing, ID, host, or digest fragment | `APPROVAL_CHALLENGE_MISMATCH`; no event/sidecar |
| Active unexpired approval already exists for activation/host | `DUPLICATE_ACTIVE_APPROVAL` |
| Approval host differs from Context host | `APPROVAL_HOST_MISMATCH` |
| Approval is absent | `APPROVAL_REQUIRED` |
| `now == expiresAt` or later | `APPROVAL_EXPIRED` |
| Approval is revoked | `APPROVAL_REVOKED` |
| Approval is consumed or Result already exists | `DISPATCH_ALREADY_COMPLETED` |
| Procedure/policy/request/scope binding differs | matching `*_DIGEST_MISMATCH` or `SCOPE_HASH_MISMATCH`; zero-write |
| Sidecar differs from canonical state | `MATERIALIZATION_STATE_MISMATCH`; no repair in Context |
| Revoke omits `--reason` outside an interactive TTY | `REVOCATION_REASON_REQUIRED`; no event/sidecar |
| Revoke targets consumed/revoked approval | `INVALID_APPROVAL_TRANSITION` |
| `record-result` omits or selects a foreign/non-matching approval ID | `APPROVAL_REQUIRED` or `APPROVAL_RELATION_MISMATCH`; append nothing |
| Result batch omits Proposal or consumption | reject whole batch; append nothing |
| Consumption is not third or IDs differ | reject whole batch; append nothing |
| Result/Proposal/consumption validation fails after earlier draft validates | reject whole batch; append nothing |
| Existing v1 event appears with schemaVersion 2 | strict parse failure |
| New event appears with schemaVersion 1 | strict parse failure |
| Mixed replay sees invalid refs/order/transition | deterministic reduction failure at exact event |
| Projection/materialization write fails after append | committed error; same-key recovery; no replacement append |
| v2 ledger is opened by v1-only release | unsupported rollback; restore/use a forward-compatible reader, never rewrite ledger |

## 5. Good / Base / Bad Cases

- **Good**: `prepare --capability research.computation.case` atomically appends v1 Dispatch then v2 activation. `authorize --host codex` grants within policy. Context recomputes exact bindings without writes. Root records Result, Proposal, and consumption as one three-event batch.
- **Good**: a workflow activation is shown interactively with exact digests/scope, the operator enters label, rationale, and exact challenge, and one host-bound approval is granted. The worker still receives proposal-only authority.
- **Base**: an old v1 Dispatch has no Result. `plan-activation` adds one activation without modifying the Dispatch or request. It then follows the normal approval path.
- **Base**: a grant reaches exact expiry before Context. Canonical grant remains in history, Context rejects it, and a new grant may be created only after current bindings are recomputed.
- **Bad**: Context notices a stale approval sidecar and rewrites it. Context is zero-write and must return materialization mismatch instead.
- **Bad**: `record-result` appends Result and Proposal, then separately consumes approval. A crash between appends permits replay. All three events must validate and append atomically.
- **Bad**: a rollback tool strips schema-v2 lines so an old release can run. The ledger is canonical scientific history; after first v2 event, rollback is forward-fix only.

## 6. Tests Required

- Exact `act_`/`apr_` ID validation and four strict v2 event payloads.
- Exact schema-kind matrix: all v1 fixtures unchanged, v1-kind/v2-envelope and v2-kind/v1-envelope rejected.
- Mixed v1/v2 parse, serialize, reduce, rebuild, sequence, duplicate event ID, ref order, and deterministic error fixtures.
- One activation per Dispatch, immutable activation, stage/capability/hierarchy rules, and compatibility bridge restrictions.
- `prepare` two-event atomicity and `plan-activation` one-event behavior, including failure leaving ledger/materializations unchanged.
- Automatic eligibility Cartesian matrix and explicit workflow enforcement.
- TTY/non-TTY, forbidden automation flags, full rendered authority summary, label/rationale bounds, and exact challenge phrase.
- Duplicate host grant, wrong host, absent, expiry equality, deterministic event-time expired replacement, revoke reason input/TTY behavior, terminal transitions, and no-Result precondition.
- Request/Procedure/policy/scope drift and materialization mismatch at Context with complete full-tree zero-write snapshots.
- Mandatory approval-ID selection, simultaneous valid grants for different hosts, Result + Proposal + consumption exact order/IDs/relations, invalid-late-mutation rollback, idempotent replay, duplicate execution prevention, and post-commit recovery.
- Existing projection schema equality plus full-ledger watermark advancement on activation/approval-only events.
- Both hosts consume equivalent normalized input and cannot bypass approval or consume it themselves.
- Rollout fixture proving a v1-only ledger works before emitters and a v2 ledger requires a forward-compatible reader afterward.

## 7. Wrong vs Correct

```text
Wrong: add capability/Procedure fields to schema-v1 Dispatch.
Correct: leave Dispatch unchanged and bind successor authority in one immutable activation.
```

```text
Wrong: approval is a JSON sidecar checked by the worker.
Correct: approval is canonical reduced ledger state; sidecars mirror it and Context validates it read-only.
```

```text
Wrong: approve --yes or piped challenge text is acceptable automation.
Correct: explicit approval requires an interactive TTY summary and exact deterministic challenge; authorize is the only non-interactive bounded path.
```

```text
Wrong: expiry changes reducer state based on current time.
Correct: reducer stores granted/revoked/consumed history; command/Context compares one captured now against expiresAt.
```

```text
Wrong: append Result + Proposal now and consume approval afterward.
Correct: validate and append v1 Result, v1 Proposal, then v2 consumption in one canonical batch.
```

```text
Wrong: downgrade by deleting unknown schema-v2 lines.
Correct: once v2 exists, retain ledger bytes and deploy a forward-compatible fix.
```

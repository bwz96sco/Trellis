# Technical design

## Boundary

C02 makes core forward-compatible with canonical activation/approval events. It adds types, strict schemas, mixed-version parsing, reduced state, lifecycle validation, and deterministic replay. It adds no emit-capable mutation or event-draft path. C05 owns activation/approval emitters after capability, Procedure, policy, and binding validation exist; C06 owns Context gating and atomic Result/Proposal/consumption emission.

Existing schema-v1 event, aggregate, payload, Dispatch, Result, Proposal, Decision, and tracked projection contracts remain unchanged.

## Version model

Keep `RESEARCH_SCHEMA_VERSION = 1` as tracked projection/cache schema authority. Add a separate event-only schema-v2 constant.

```ts
type ResearchEvent = ResearchSchemaV1Event | ResearchSchemaV2Event;
```

- Existing 21 event kinds remain exact schema-v1 kinds.
- Schema v2 accepts exactly `activation.planned`, `approval.granted`, `approval.revoked`, and `approval.consumed`.
- Existing aggregate types remain schema-v1-only. Event-v2 refs additionally permit `activation` and `approval`.
- One ledger keeps one global contiguous sequence and unique event-ID set across both versions.
- V1 kind with v2 envelope, v2 kind with v1 envelope, unknown version, and cross-version aggregate misuse fail strict parsing.

## IDs, entities, and state

Add `act_` and `apr_` UUID constructors/parsers plus frozen entity shapes:

```ts
type ApprovalStatus = "granted" | "revoked" | "consumed";

interface ResearchState {
  // existing fields unchanged
  activations: Record<ActivationId, ResearchActivation>;
  activationByDispatchId: Partial<Record<DispatchId, ActivationId>>;
  approvals: Record<ApprovalId, ResearchApprovalState>;
  approvalIdsByActivationId: Partial<Record<ActivationId, ApprovalId[]>>;
}
```

V2 digest/hash fields require `sha256:` plus 64 lowercase hex characters. V2 timestamps require canonical UTC RFC3339 with millisecond precision. `ResearchApprovalState` uses strict terminal-shape variants: granted has no terminal fields; revoked has only revocation fields; consumed has only consumption fields.

Pure-v1 and empty ledgers produce the existing state plus four empty maps.

## Parser and event contracts

Preserve current v1 event schema and ordered v1 kind inventory. Add a discriminated parser:

1. Strict-parse common envelope discriminator.
2. Route schema version 1 to current v1 kind/payload/ref schemas.
3. Route schema version 2 to four exact v2 payload/ref schemas.
4. Return one event union used by shared ledger sequence and duplicate-ID checks.

V2 payloads remain exact:

```ts
{ activation: ResearchActivation }
{ approval: ResearchApprovalGrant }
{ approvalId, revokedAt, reason }
{ approvalId, resultId, proposalId, consumedAt }
```

Unknown keys and `null` substitutions fail. Mixed serialization keeps current deterministic JSON plus one trailing LF behavior.

## Reducer lifecycle

`activation.planned`:

- refs exactly `[Dispatch, Quest]`;
- existing Dispatch/Quest/Run/Repository hierarchy must match;
- activation ID and Dispatch binding must be unique;
- Dispatch must not already have Result or Proposal;
- activation is immutable after storage.

`approval.granted`:

- refs exactly `[Activation, Dispatch, Quest]`;
- activation/Dispatch/Quest and all four bindings must match;
- no Result may exist;
- approval ID must be unique;
- `grantedAt` equals event timestamp;
- `expiresAt` equals `grantedAt + activation.maxDurationMinutes` and is later;
- another still-granted approval for same activation/host blocks the grant unless its expiry is at or before this new event timestamp.

`approval.revoked`:

- refs exactly `[Activation, Dispatch]`;
- status must be granted;
- timestamp cannot precede grant;
- reason is non-empty and at most 1,024 characters;
- transition is terminal.

`approval.consumed`:

- refs exactly `[Activation, Dispatch, Result, Proposal]`;
- status must be granted;
- event timestamp must be strictly earlier than `expiresAt`; equality is expired;
- matching Result and Proposal must exist for the same Dispatch hierarchy;
- transition is terminal.

Raw replay additionally requires consumption immediately after matching `result.recorded` then `proposal.recorded`. All three share timestamp, actor, provenance, and idempotency key. Reducer never reads wall clock, filesystem, policy, Procedure, scope, or sidecars.

## C02/C05/C06 mutation boundary

C02 does not extend public `ResearchMutation`, event-draft construction, `buildValidatedBatch`, `validateDispatchBatch`, `validateResearchBatch`, or `commitResearchBatch`. Those APIs are already exported and emit canonical state; adding v2 forms before registry, Procedure, policy, request, and scope validation exist would create an authority bypass.

C02 validates v2 only while strict-reading and reducing existing mixed-ledger bytes. A manually supplied valid `approval.consumed` event must immediately follow matching Result and Proposal events and satisfy all deterministic lifecycle checks, including event-time expiry. Current two-event Result + Proposal production mutation remains unchanged for every Dispatch during C02.

C05 adds activation/grant/revoke emitters only after C03/C04 validation dependencies exist. C06 adds consumption mutation, exact three-event batch validation, and mandatory `record-result --approval` gating.

## Projections and exports

Do not edit projection schemas or create activation/approval projection files. Existing projection writer already uses complete ledger head for `projectedThroughSeq` and entity mutation times for `updatedAt`; mixed events therefore advance watermarks without changing entity data.

Export additive IDs, entities, schemas, event constants/types, and constructors only from `@mindfoldhq/trellis-core/research`. Keep root barrel, package export keys, and package versions unchanged.

## GitNexus blast radius

Fresh upstream analysis before planning found:

- `parseResearchEvent`: HIGH; 3 direct callers, 4 processes.
- `reduceResearchEvents`: CRITICAL; 5 direct callers, 9 processes.
- `emptyResearchState`: CRITICAL; 1 direct caller, 9 processes.
- `applyEvent`: CRITICAL; 1 direct caller, 9 processes.
- `buildValidatedBatch`: CRITICAL; 2 direct callers, 7 processes.
- `validateResearchBatch`: CRITICAL; 2 direct callers, 7 processes.
- `commitResearchBatch`: CRITICAL; 6 direct callers, 7 processes.
- `validateDispatchBatch`: HIGH; 1 direct caller, 3 processes.
- `mutationToEventDraft`: LOW; 2 direct callers.
- `parseResearchLedger`: LOW; 2 test callers reported.
- `serializeResearchEvents`: LOW; 1 test caller reported.
- `writeResearchProjections`: CRITICAL but requires no C02 edit.

C02 must visibly warn before production edits, rerun impact for every additional existing symbol, and cover core parser/store/rebuild plus CLI Research command, Dispatch, Context, workflow, repository, and hook process families.

## Rollout and rollback

No current command can create v2 state after C02, so pre-v2 rollback remains code-only. Once C05 later emits first v2 event, v1-only binaries are unsupported and recovery is forward-fix only. C02 never rewrites, truncates, or down-converts ledger bytes.

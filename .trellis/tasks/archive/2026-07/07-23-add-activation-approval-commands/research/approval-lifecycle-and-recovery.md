# Research: Approval Lifecycle and Recovery

- **Query**: Define C05 automatic authorization, interactive approval, revocation, expiry, materialization, idempotency, recovery, and stable errors.
- **Scope**: internal
- **Date**: 2026-07-17

## Findings

### Automatic authorization

`authorize` recomputes Procedure, policy, request, and scope and requires exact equality with the activation. It may grant only when C04 automatic eligibility is true:

- bounded capability;
- effective activation is automatic;
- project automatic authorization is enabled;
- network forbidden;
- no external cost;
- one Repository;
- no canonical mutation;
- no capability chaining;
- `maxDispatches <= 1`;
- `maxDurationMinutes <= 15`.

Exact persisted fields:

```text
mode = automatic
approverLabel = trellis-policy-v1
rationale = Eligible under immutable registry and project policy.
```

Recommended ineligibility mapping:

| Condition | Code |
|---|---|
| capability disabled | `CAPABILITY_DISABLED` |
| workflow, explicit activation, or automatic policy disabled | `EXPLICIT_APPROVAL_REQUIRED` |
| duration or Dispatch limit exceeded | `AUTOMATIC_LIMIT_EXCEEDED` |
| network, cost, Repository, mutation, or chaining bound | `AUTOMATIC_AUTHORITY_FORBIDDEN` |

Interactive approval remains available for an otherwise valid bounded activation when automatic policy opt-in is absent. It must not override `enabled: false`, hierarchy failure, digest drift, or scope drift.

### Interactive approval gate

Before any approval event is created, require all three streams:

```ts
process.stdin.isTTY === true
process.stdout.isTTY === true
process.stderr.isTTY === true
```

Failure code:

```text
INTERACTIVE_APPROVAL_REQUIRED
```

Render a deterministic authority summary containing, in order:

1. Dispatch ID;
2. Quest ID and stage;
3. capability ID and kind;
4. Procedure ID, version, and digest;
5. policy digest;
6. request digest;
7. scope hash;
8. host;
9. Repository count;
10. network, external-cost, canonical-mutation, and capability-chaining flags;
11. duration and Dispatch limit;
12. read artifacts;
13. write paths;
14. expected outputs;
15. checks.

Prompt for:

- operator label: 1-128 characters;
- rationale: 1-1,024 characters;
- exact challenge phrase.

Reject whitespace-only label or rationale, but preserve the supplied text rather than trimming before persistence.

Exact challenge:

```text
APPROVE <dispatch-id> <host> <first-12-hex-of-request-digest>
```

The fragment excludes `sha256:`. Comparison is case-sensitive and byte-sensitive. No trim is allowed except removal of the terminal input line ending. A small `node:readline/promises` adapter is preferable to a prompt abstraction that may normalize input.

This proves deliberate local interaction only. It is not authentication, a signature, or a cryptographic identity assertion.

Recommended event actor remains:

```ts
{ type: "agent", id: "trellis-cli" }
```

The prompted label belongs only in `approval.approverLabel`.

After the challenge, re-resolve Procedure, policy, request, and scope before append. Require equality with both the rendered summary and activation to close prompt-time filesystem drift.

### Grant and expiry rules

For automatic and interactive grants:

```text
grantedAt = once-captured command timestamp
expiresAt = grantedAt + activation.maxDurationMinutes * 60,000
```

Serialize as canonical UTC RFC3339 with millisecond precision.

```text
valid   iff status == granted && now < expiresAt
expired iff status == granted && now >= expiresAt
```

Equality is expired. Reducers never consult wall clock.

Before grant:

- activation exists;
- hierarchy is valid;
- no Result or Proposal exists;
- Procedure, policy, request, and scope bindings match;
- no unexpired granted approval exists for the same activation and host.

Claude and Codex grants may coexist. A replacement for the same host is allowed only after revocation or expiry. The new event timestamp must be greater than or equal to each prior still-granted same-host approval's `expiresAt`.

### Revocation

Revocation requires:

- existing approval;
- reducer status exactly `granted`;
- non-empty reason of at most 1,024 characters;
- `revokedAt >= grantedAt`.

It is allowed before or after derived expiry. It is forbidden after prior revocation or consumption.

`--reason` is mandatory for JSON, dry-run, and non-TTY use. When omitted in human mode, stdin and stdout must both be TTYs and one prompt collects the reason. No implicit default reason is persisted.

Recommended unknown-ID code: `APPROVAL_NOT_FOUND`. Terminal transition code: `INVALID_APPROVAL_TRANSITION`.

### Sidecars

Exact locations:

```text
.trellis/research/dispatches/<dsp-id>/activation.json
.trellis/research/dispatches/<dsp-id>/approvals/<apr-id>.json
```

Exact envelopes:

```ts
{ schemaVersion: 2, activation: ResearchActivation }
```

```ts
{ schemaVersion: 2, approval: ResearchApprovalState }
```

Use stable Research JSON with one trailing LF and atomic replacement. Canonical event commit always precedes materialization.

Recommended command materializations:

| Command | Materializations after commit |
|---|---|
| `prepare` | request, activation, existing runtime manifest |
| `plan-activation` | activation |
| `authorize` | activation and granted approval |
| `approve` | activation and granted approval |
| `revoke` | activation and updated revoked approval |

Root mutation commands may reconstruct these files from canonical state. C06 Context must remain read-only and never repair them.

Recommended success shapes:

```ts
type PlanResearchActivationResult =
  | (ResearchMutationResult & {
      legacyPrepare?: false;
      activation: ResearchActivation;
      activationFile: string | null;
    })
  | (ResearchMutationResult & {
      replayed: true;
      legacyPrepare: true;
      activation: null;
      activationFile: null;
    });

interface GrantResearchApprovalResult extends ResearchMutationResult {
  approval: ResearchApprovalState;
  approvalFile: string | null;
}

interface RevokeResearchApprovalResult extends ResearchMutationResult {
  approval: ResearchApprovalState;
  approvalFile: string | null;
}
```

Extend prepare with `activation` and `activationFile`. Dry-run returns `null` materialization paths. A matching legacy one-event prepare replay is the sole null-activation branch: it requires `replayed:true` and `legacyPrepare:true`, repairs only request plus legacy runtime manifest, and never creates an activation sidecar.

### Idempotency and recovery

Post-commit materialization failure must report:

```ts
{
  committed: true,
  headSeq,
  target,
  recovery
}
```

Recovery includes the exact same idempotency key and never appends a replacement batch.

Before ordinary lifecycle preconditions reject a retry, detect existing events with the supplied key. If the event family and target match:

- return canonical existing events;
- set `replayed: true`;
- append nothing;
- reconstruct the command's sidecars from canonical state.

If the same key belongs to another command family or target, fail with recommended `IDEMPOTENCY_KEY_CONFLICT`.

Examples:

- `plan-activation` retry must not fail merely because activation now exists.
- grant retry must not fail merely because the same approval is already granted.
- revoke retry must not fail merely because that exact revocation is terminal.
- a historical one-event prepare replay must not be silently upgraded to a two-event prepare; use `plan-activation` with a new key.

An `approve` recovery retry must still satisfy the strong TTY rule. Recommended behavior: load the canonical committed activation/grant, render its authority summary, require the exact challenge again, then reconstruct the sidecar without appending. Newly entered operator data must not replace canonical grant data.

A projection failure occurs after canonical append but before command-side sidecars. The C05 executor should preserve both recovery steps:

1. run `trellis research rebuild`;
2. retry the original command with the same idempotency key.

### Stable error matrix

| Condition | Stable code / behavior |
|---|---|
| missing or unknown capability | `UNKNOWN_CAPABILITY` |
| capability/Quest stage mismatch | `CAPABILITY_STAGE_MISMATCH` |
| complete/non-dispatchable stage | `QUEST_STAGE_NOT_DISPATCHABLE` |
| disabled effective capability | `CAPABILITY_DISABLED` |
| missing Dispatch | `DISPATCH_NOT_FOUND` |
| invalid hierarchy | `DISPATCH_HIERARCHY_INVALID` |
| duplicate activation | `DUPLICATE_ACTIVATION` |
| Result/Proposal exists before bridge | `ACTIVATION_TOO_LATE` |
| grant has no activation | `ACTIVATION_REQUIRED` |
| automatic route requires explicit approval | `EXPLICIT_APPROVAL_REQUIRED` |
| automatic limits exceeded | `AUTOMATIC_LIMIT_EXCEEDED` |
| automatic authority forbidden | `AUTOMATIC_AUTHORITY_FORBIDDEN` |
| approve lacks all three TTYs | `INTERACTIVE_APPROVAL_REQUIRED` |
| challenge mismatch | `APPROVAL_CHALLENGE_MISMATCH` |
| invalid label/rationale | recommended `INVALID_APPROVAL_INPUT` |
| active same-host grant exists | `DUPLICATE_ACTIVE_APPROVAL` |
| Result/Proposal already exists | `DISPATCH_ALREADY_COMPLETED` |
| unknown revoke target | recommended `APPROVAL_NOT_FOUND` |
| revoke reason unavailable | `REVOCATION_REASON_REQUIRED` |
| revoked/consumed transition | `INVALID_APPROVAL_TRANSITION` |
| same key belongs to another operation | recommended `IDEMPOTENCY_KEY_CONFLICT` |
| tracked request missing | `REQUEST_NOT_FOUND` |
| tracked request differs from ledger | `REQUEST_STATE_MISMATCH` |
| Procedure drift | `PROCEDURE_DIGEST_MISMATCH` |
| policy drift | `POLICY_DIGEST_MISMATCH` |
| request drift | `REQUEST_DIGEST_MISMATCH` |
| Repository/artifact/write drift | `SCOPE_HASH_MISMATCH` |
| Repository invalid | `REPOSITORY_INVALID` |
| artifact invalid | `ARTIFACT_INVALID` |
| write scope invalid | `WRITE_SCOPE_INVALID` |
| sidecar write after commit fails | committed error with same-key recovery |

`MATERIALIZATION_STATE_MISMATCH`, Context host/approval validity, and approval-consumption relation errors remain C06-owned.

### Error rendering

Extend `renderResearchError` to preserve stable `code` values from C03, C04, and C05 typed errors. Recommended non-committed JSON:

```json
{"error":{"code":"DUPLICATE_ACTIVATION","message":"..."}}
```

Keep the existing richer committed-error shape for projection and materialization failures.

### Files Found

| File Path | Description |
|---|---|
| `packages/cli/src/commands/research/errors.ts` | Current Context and committed file errors. |
| `packages/cli/src/commands/research/common.ts:304-362` | Current error renderer; generic errors lose stable codes. |
| `packages/cli/src/commands/research/dispatch-command.ts:119-173` | Existing Dispatch paths and ledger-first committed-file recovery pattern. |
| `packages/core/src/research/types.ts` | Frozen approval grant/state types. |
| `packages/core/test/research/activation-approval.test.ts` | Existing reducer rules for duplicate grants, expiry, revocation, and terminal state. |

## Caveats / Not Found

- Exact success JSON forms were not frozen by C01; the state-oriented shapes above are recommendations.
- The exact recovery prompt behavior for an already committed interactive grant was not frozen; requiring TTY and the challenge again best preserves both recovery and the no-automation boundary.

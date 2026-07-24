# Research: Frozen C05 Boundary and CLI

- **Query**: Define the frozen C05 ownership boundary, exact command surface, compatibility behavior, and exclusions.
- **Scope**: internal
- **Date**: 2026-07-17

## Findings

### Frozen ownership

C05 owns:

1. Add explicit capability selection to `trellis research dispatch prepare`.
2. Plan one immutable activation together with a new Dispatch.
3. Bridge eligible historical schema-v1 Dispatches with `plan-activation`.
4. Add root-side bounded automatic grants through `authorize`.
5. Add interactive explicit/workflow/out-of-automatic-policy grants through `approve`.
6. Add approval revocation through `revoke`.
7. Emit `activation.planned`, `approval.granted`, and `approval.revoked` through typed mutations.
8. Compute request digests and resolved-scope hashes.
9. Materialize recoverable activation and approval audit sidecars after canonical commit.

C05 does **not** own worker grant/revoke, Context gating, approval consumption, Result/Proposal cutover, worker changes, Skill retirement, or C07-C09 work. The ledger remains authoritative; sidecars never become authority. No command or event makes a cryptographic identity claim.

### Exact CLI signatures

```text
trellis research dispatch prepare \
  --run <run-id> \
  --quest <quest-id> \
  [--campaign <campaign-id>] \
  --repository <repository-id> \
  --owner-skill <text> \
  --objective <text> \
  --capability <id> \
  [--acceptance <text>...] \
  [--context-file <json>] \
  [--allow-write <path>...] \
  [--expected-output <text>...] \
  [--check <text>...] \
  [--provider <text>] \
  [--task-ref <ref>] \
  [--id <dsp-id>] \
  [--root <path>] \
  [--idempotency-key <key>] \
  [--dry-run] \
  [--json]
```

```text
trellis research dispatch plan-activation <dispatch-id> \
  --capability <id> \
  [--root <path>] \
  [--idempotency-key <key>] \
  [--dry-run] \
  [--json]
```

```text
trellis research dispatch authorize <dispatch-id> \
  --host <claude|codex> \
  [--root <path>] \
  [--idempotency-key <key>] \
  [--dry-run] \
  [--json]
```

```text
trellis research dispatch approve <dispatch-id> \
  --host <claude|codex> \
  [--root <path>] \
  [--idempotency-key <key>]
```

`approve` must not register `--json`, `--dry-run`, `--yes`, or `--force`. Commander must reject these before the callback can write.

```text
trellis research dispatch revoke <approval-id> \
  [--reason <text>] \
  [--root <path>] \
  [--idempotency-key <key>] \
  [--dry-run] \
  [--json]
```

When `revoke --reason` is absent, only an interactive stdin/stdout TTY prompt may supply it. JSON, dry-run, or non-TTY invocation without `--reason` fails with `REVOCATION_REASON_REQUIRED`.

Recommended child order, preserving current Context placement:

```text
context
prepare
plan-activation
authorize
approve
revoke
record-result
apply
reject
```

C06 may later replace the Context and record-result signatures.

### Canonical event batches

New prepare commits exactly one atomic ordered batch:

```text
1. schema-v1 dispatch.recorded
2. schema-v2 activation.planned
```

`plan-activation` commits exactly one `activation.planned` event. `authorize` and `approve` each commit exactly one `approval.granted` event. `revoke` commits exactly one `approval.revoked` event.

All events in a command batch share one captured timestamp, actor, provenance, and idempotency key, and receive contiguous sequences. Failure in any draft rejects the whole batch.

C05 must leave the current two-event Result/Proposal rule unchanged:

```text
1. schema-v1 result.recorded
2. schema-v1 proposal.recorded
```

C06 exclusively owns adding `approval.consumed` as the third event.

### Compatibility semantics

The schema-v1 Dispatch payload remains unchanged. `ownerSkill` stays required; `provider` and `taskRef` stay optional. Values round-trip unchanged and never select capability, Procedure, host, approval, Repository, worker, or write scope.

Characterization values that must continue to work:

```text
ownerSkill = vendor.legacy/research-runner@2024-09
provider   = host-adapter:custom/v3
taskRef    = tasks/archive/2024-09/legacy-dispatch
```

These fields contribute to the request digest because the digest covers the complete canonical Dispatch, but they remain non-routing compatibility metadata.

`--capability` must be explicit. Missing capability must not invoke the C03 stage default. To preserve the frozen `UNKNOWN_CAPABILITY` error, validate omission inside the command callback rather than relying only on Commander's untyped missing-required-option path.

### Existing prepared Dispatches

`plan-activation` is allowed only when:

- the Dispatch has no activation;
- it has no Result;
- it has no Proposal;
- its Quest/Run/Campaign/Repository hierarchy remains eligible;
- the explicit capability matches the current Quest stage;
- Procedure and policy resolve;
- request and scope preflight succeeds.

It appends only `activation.planned` and must not rewrite the Dispatch, request, compatibility metadata, old events, or projection schemas.

Recommended fail-closed behavior: require existing `request.json` to exist, strict-parse, and equal the canonical Dispatch. If it is missing because an earlier prepare materialization failed, recover the original prepare with its ledger idempotency key first. `plan-activation` must never recreate the request.

### Existing APIs and source locations

| File Path | Description |
|---|---|
| `packages/cli/src/commands/research/index.ts:724-876` | Current Dispatch command registration. |
| `packages/cli/src/commands/research/dispatch-command.ts:397-508` | Current one-event prepare implementation and materialization. |
| `packages/cli/src/commands/research/dispatch-command.ts:510-602` | Current Result + Proposal path, which remains C06-owned. |
| `packages/cli/src/commands/research/dispatch-context.ts:543-796` | Current compatibility Context; do not edit in C05. |
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/activation-approval-contract.md` | Normative activation/approval and CLI contract. |
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/compatibility-freeze.md` | Permanent Dispatch metadata compatibility contract. |

## Caveats / Not Found

- C01 freezes command behavior and codes but not exact success JSON shapes; recommended shapes are recorded in the lifecycle research file.
- C05 must not change production Context even if it introduces a shared preflight module for later C06 reuse.

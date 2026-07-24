# Research: Impact, File Scope, and Tests

- **Query**: Record GitNexus blast radius, minimal implementation boundaries, exact proposed file scope, test matrix, package/spec ownership, and rollback gates.
- **Scope**: internal
- **Date**: 2026-07-17

## Findings

### GitNexus impact map

| Existing symbol | Risk | Impact | C05 action |
|---|---:|---:|---|
| `buildValidatedBatch` | **CRITICAL** | 28 impacted | Unavoidable minimal mixed-version edit. Preserve all v1 behavior. |
| `validateResearchBatch` | **CRITICAL** | 32 impacted | Consume unchanged; no public signature change. |
| `commitResearchBatch` | **CRITICAL** | 36 impacted | Consume unchanged; preserve lock/append/projection behavior. |
| `readResearchState` | **CRITICAL** | 35 impacted | Consume unchanged. |
| `executeRepositoryDispatchMutations` | **HIGH** | 13 impacted | Do not edit; add a timestamp-aware C05 sibling executor. |
| `validateDispatchBatch` | **HIGH** | 10 impacted | Do not edit; C06 owns consumption transition. |
| `dispatchPaths` | **HIGH** | 15 impacted | Do not edit; add C05 sidecar path module. |
| `writeCommittedJson` | **HIGH** | 15 impacted | Do not edit; add C05 wrapper using existing atomic write and error. |
| `writeJson` | **HIGH** | 14 impacted | Do not edit. |
| `eventPayload` | **HIGH** | 14 impacted | Consume unchanged or add C05-specific event extractor. |
| `resolveRepositoryForUse` | **HIGH** | 17 impacted | Consume with `persistObservation = false`; do not edit. |
| `mutationToEventDraft` | LOW | 2 direct internal callers | Natural typed v2 extension point. |
| `prepareResearchDispatch` | LOW | 2 direct test callers | Surgically add capability and activation. |
| `registerResearchCommand` | LOW | 6 upstream callers/importers | Add only C05 commands/options. |
| `renderResearchError` | LOW | 1 direct test | Preserve typed stable codes. |
| `resolveResearchProcedureAuthority` | LOW | 0 current callers | Consume unchanged. |
| `resolveResearchCapability` | LOW | 1 test impact | Consume unchanged. |
| `resolveResearchRepositoryContext` | LOW | 11 total upstream | No edit required if C05 uses zero-persistence repository resolution. |

#### Required warning

`buildValidatedBatch` is a CRITICAL shared path. No compliant alternate can atomically append mixed v1/v2 batches without either modifying it or duplicating lock, sequence, append, projection, and recovery internals. Duplication is less safe.

Minimal boundary:

- add typed C05 mutation mappings;
- make private event drafts schema-version aware;
- retain `parseResearchEvent` validation;
- leave public store signatures, locking, append, projections, v1 mappings, and Result/Proposal validation unchanged;
- run complete core store and CLI Research regression suites.

### Exact proposed production scope

Core modify:

```text
packages/core/src/research/store.ts
packages/core/src/research/index.ts
```

Core add:

```text
packages/core/src/research/dispatch-authority.ts
```

CLI modify:

```text
packages/cli/src/commands/research/dispatch-command.ts
packages/cli/src/commands/research/index.ts
packages/cli/src/commands/research/common.ts
packages/cli/src/commands/research/errors.ts
packages/cli/src/commands/research/mutation.ts
```

CLI add:

```text
packages/cli/src/commands/research/dispatch-authority.ts
packages/cli/src/commands/research/dispatch-activation-command.ts
packages/cli/src/commands/research/dispatch-activation-materialization.ts
```

Keep untouched in C05:

```text
packages/cli/src/commands/research/dispatch-context.ts
```

No worker, template, generated payload, cleanup inventory, package-version, docs-site, marketplace, or C06-C09 file should enter the production diff.

### Exact proposed test scope

Core modify:

```text
packages/core/test/research/activation-approval.test.ts
packages/core/test/research/store.test.ts
```

Core add:

```text
packages/core/test/research/dispatch-authority.test.ts
```

CLI modify:

```text
packages/cli/test/commands/research.test.ts
packages/cli/test/commands/research-dispatch.integration.test.ts
packages/cli/test/commands/research-workflow.integration.test.ts
packages/cli/test/commands/research-dispatch-compatibility.test.ts
packages/cli/test/fixtures/research-dispatch.ts
```

CLI add:

```text
packages/cli/test/commands/research-dispatch-activation.integration.test.ts
packages/cli/test/commands/research-dispatch-approval.integration.test.ts
```

Retain schema-v1 and arbitrary metadata regression coverage:

```text
packages/core/test/research/schema-v1-compatibility.test.ts
packages/cli/test/commands/research-dispatch-arbitrary-metadata-compatibility.test.ts
```

### Test matrix

#### Core digest and scope

- request digest domain separator and all Dispatch fields;
- arbitrary `ownerSkill`, `provider`, and `taskRef` values;
- optional-field omission and stable JSON trailing LF;
- POSIX and Windows path normalization;
- drive-letter case and trailing-root handling;
- artifact order and duplicate artifact rejection;
- write-pair deduplication/sorting;
- expected/observed remote drift;
- HEAD drift;
- artifact path/revision/SHA drift;
- allowed-write-path drift;
- no raw absolute paths in activation/approval events.

#### Core emitters

- `activation.plan`, `approval.grant`, and `approval.revoke` exact v2 mapping;
- exact aggregate and related-reference order;
- v1 Dispatch + v2 activation atomic batch;
- shared timestamp and idempotency key;
- strict payload keys and canonical timestamps;
- malformed later draft rejects whole batch;
- duplicate activation;
- same-host duplicate active grant;
- expiry-equality replacement;
- terminal revoke transition;
- idempotent replay;
- all existing mutations remain v1;
- current Result + Proposal two-event behavior remains unchanged.

#### Prepare and bridge

- missing/unknown capability;
- stage mismatch and disabled capability;
- exact event order and all-or-nothing failure;
- dry-run full-tree zero-write;
- request, activation, and runtime manifest materializations;
- arbitrary compatibility metadata unchanged;
- historical bridge success without Dispatch/request rewrite;
- duplicate activation and too-late Result/Proposal;
- missing/stale request;
- hierarchy and Repository failures;
- same-key recovery;
- historical one-event prepare key not silently upgraded.

#### Automatic authorization

- bounded eligible case;
- automatic policy disabled;
- explicit/workflow activation;
- declared network or multiple Repository scope;
- duration and Dispatch limits;
- disabled capability;
- Procedure/policy/request/scope drift;
- same-host duplicate and different-host coexistence;
- expiry equality and deterministic replacement;
- no-Result precondition;
- dry-run, replay, and sidecar failure recovery.

#### Interactive approval

- all eight stdin/stdout/stderr TTY combinations;
- reject `--json`, `--dry-run`, `--yes`, and `--force` before callback;
- complete deterministic authority summary;
- empty, whitespace-only, and oversized label/rationale;
- exact challenge success;
- case, spacing, host, Dispatch, digest, and trailing-space mismatch;
- post-summary drift;
- zero-write on challenge failure;
- same-key interactive recovery.

#### Revocation

- option and interactive reason success;
- missing reason with JSON, dry-run, or non-TTY;
- empty and oversized reason;
- before- and after-expiry revoke;
- already revoked, consumed, and unknown approval;
- canonical timestamp;
- dry-run, replay, and updated sidecar recovery.

#### Regression callers

All existing `prepareResearchDispatch` callers must supply a capability matching their Quest stage. Primary current callers are in:

```text
packages/cli/test/commands/research-dispatch.integration.test.ts
packages/cli/test/commands/research-workflow.integration.test.ts
packages/cli/test/fixtures/research-dispatch.ts
```

### Package and spec ownership

Export request/scope APIs only through `packages/core/src/research/index.ts`. No package version or export-map change is expected. CLI already has Commander, Node runtime APIs, and atomic-write support.

After implementation, C05 owns updates to:

```text
.trellis/spec/cli/backend/commands-research.md
.trellis/spec/core/backend/research-state.md
```

The CLI spec should record implemented C05 commands, sidecars, compatibility, and recovery. The core spec should record typed v2 emitters while continuing to forbid raw append. Do not claim C06 Context or consumption behavior.

Packed-package gates:

```text
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
```

No explicit packed inventory change should be needed.

### Rollout and rollback gates

Before emitters:

1. C02 mixed reader/reducer/state tests pass.
2. C03 registry tests pass.
3. C04 Procedure/policy tests pass.
4. CRITICAL store impact is explicitly acknowledged.
5. Core mixed-mutation and schema-v1 compatibility tests pass.
6. Prepare atomicity and same-key recovery pass.
7. Context and Result behavior remain unchanged.

Rollback:

- before the first v2 event, rollback to a v1-only release remains possible;
- after any v2 event, a v1-only reader is unsupported;
- never delete, rewrite, truncate, or down-convert v2 lines;
- recover sidecars by same-key forward retry;
- recover projections with a compatible rebuild, then same-key sidecar recovery;
- post-emission defects require a forward-compatible fix.

### Verification commands

```text
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm build
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
git diff --check
```

## Caveats / Not Found

- No implementation or tests were run; this file records the required future test scope only.
- GitNexus risks are upstream blast-radius estimates, not permission to edit HIGH/CRITICAL symbols without the required warning and approval gate.

# Research: Core Mutations and Digests

- **Query**: Identify the typed core mutation boundary, mixed-version emission changes, request digest, and scope hash required by C05.
- **Scope**: internal
- **Date**: 2026-07-17

## Findings

### Current blocker

`packages/core/src/research/store.ts:293-325` hard-codes `schemaVersion: RESEARCH_SCHEMA_VERSION` for every emitted event. Current `ResearchMutation` contains only schema-v1 mutations. C05 therefore cannot emit schema-v2 activation or approval events without a core change.

C02 already provides strict entity schemas, v2 event parsing, relation validation, lifecycle reduction, mixed replay, and state indexes. C05 should reuse those paths and must not add a generic raw-event append API.

### Recommended typed mutation API

Add these variants to `ResearchMutation`:

```ts
type ResearchMutation =
  | ExistingSchemaV1ResearchMutations
  | {
      kind: "activation.plan";
      activation: ResearchActivation;
    }
  | {
      kind: "approval.grant";
      approval: ResearchApprovalGrant;
    }
  | {
      kind: "approval.revoke";
      approvalId: ApprovalId;
      revokedAt: string;
      reason: string;
    };
```

The event-draft builder should derive canonical related references from reduced state where needed:

- `activation.plan` carries Dispatch and Quest IDs in the activation.
- `approval.grant` derives the Quest relation through the referenced activation.
- `approval.revoke` derives Activation and Dispatch relations through the referenced approval grant.

This avoids allowing CLI callers to provide redundant relationship IDs.

Make the private event draft version-aware:

```ts
interface EventDraft {
  schemaVersion: 1 | 2;
  kind: ResearchEvent["kind"];
  aggregate: ResearchEvent["aggregate"];
  related: ResearchEvent["related"];
  payload: Record<string, unknown>;
}
```

Every constructed event must continue through `parseResearchEvent`. Existing public signatures remain unchanged:

```ts
validateResearchBatch(input: CommitResearchBatchInput)
commitResearchBatch(input: CommitResearchBatchInput)
```

`CommitResearchBatchInput.timestamp` already exists. C05 should pass the command timestamp captured once at its boundary.

### Exact event mapping

`activation.plan`:

```text
schemaVersion = 2
kind = activation.planned
aggregate = Activation
related = Dispatch, Quest
payload = { activation }
```

`approval.grant`:

```text
schemaVersion = 2
kind = approval.granted
aggregate = Approval
related = Activation, Dispatch, Quest
payload = { approval }
```

`approval.revoke`:

```text
schemaVersion = 2
kind = approval.revoked
aggregate = Approval
related = Activation, Dispatch
payload = { approvalId, revokedAt, reason }
```

Payloads and related-reference order must be exact. Unknown, extra, missing, duplicated, reordered, or mismatched data fails strict parsing/reduction.

### Minimal shared-store change

1. Convert each typed mutation to a versioned internal draft.
2. Pass `draft.schemaVersion` to `parseResearchEvent`.
3. Preserve all schema-v1 mappings and validation unchanged.
4. Reduce the mixed candidate batch through the existing reducer.
5. Preserve locking, idempotency, sequence allocation, append, projection, and artifact-digest behavior.
6. Do not edit `validateDispatchBatch` in C05; C06 owns the consumption batch transition.

### Request digest

C05 should add the frozen pure API to the core Research subpath:

```ts
function digestDispatchRequest(dispatch: Dispatch): string;
```

Digest input:

```text
UTF8("trellis-research-dispatch-request-digest-v1\0")
|| UTF8(stableResearchJson(dispatchSchema.parse(canonicalDispatch)))
```

External form:

```text
sha256:<64 lowercase hexadecimal characters>
```

It covers every Dispatch field, including `ownerSkill`, `provider`, and `taskRef`, without making those fields routing authority.

### Scope hash

C05 should add:

```ts
function hashDispatchScope(scope: NormalizedDispatchScopeV1): string;
```

Frozen scope shape:

```ts
interface NormalizedDispatchScopeV1 {
  schemaVersion: 1;
  dispatchId: DispatchId;
  repository: {
    id: RepositoryId;
    resolvedRoot: string;
    locator: string;
    expectedRemote?: string;
    observedRemote?: string;
    headRevision?: string;
  };
  artifacts: readonly {
    id: ArtifactId;
    repositoryId: RepositoryId;
    path: string;
    resolvedPath: string;
    revision?: string;
    sha256?: string;
  }[];
  allowedWritePaths: readonly {
    declaredPath: string;
    resolvedPath: string;
  }[];
}
```

Hash input:

```text
UTF8("trellis-research-dispatch-scope-hash-v1\0")
|| UTF8(stableResearchJson(normalizedScope))
```

Normalization rules:

- machine paths are absolute real paths;
- separators become `/`;
- dot segments are removed;
- Windows drive letters are lowercase;
- trailing `/` is removed except for `/` and `<drive>:/`;
- locator, artifact paths, and write paths use validated POSIX form;
- artifacts preserve Dispatch context order and may appear only once by ID;
- write entries are deduplicated by `(declaredPath, resolvedPath)` and sorted by declared path then resolved path;
- optional fields are omitted, never `null` or empty placeholders;
- remote and revision strings remain exact.

The scope binds Repository ID, checkout, locator, expected/observed remote, HEAD, artifacts, and allowed write paths. Only the hash enters canonical events. Raw absolute paths must not appear in activation or approval events.

Recommended source:

```text
packages/core/src/research/dispatch-authority.ts
```

Export only through:

```text
@mindfoldhq/trellis-core/research
```

Do not add generic root exports or change the package export map.

### Activation planning preflight

For a candidate Dispatch or existing Dispatch:

1. Strict-read and reduce the complete ledger.
2. Validate hierarchy and dispatchability.
3. Resolve explicit capability against the canonical Quest stage.
4. Resolve Procedure and project policy through `resolveResearchProcedureAuthority`.
5. Reject `authority.enabled === false`.
6. Build request digest from the canonical candidate Dispatch.
7. Resolve Repository, artifact, and write paths without persistence.
8. Build normalized scope and hash.
9. Construct activation from effective authority and the once-captured timestamp.
10. Validate the complete candidate event batch before append.

For new prepare, the Dispatch and activation use the same captured timestamp and commit atomically.

### Files Found

| File Path | Description |
|---|---|
| `packages/core/src/research/store.ts:70-146` | Current schema-v1 `ResearchMutation` union. |
| `packages/core/src/research/store.ts:148-155` | Existing batch input, including optional timestamp. |
| `packages/core/src/research/store.ts:293-335` | Shared batch builder that currently hard-codes v1. |
| `packages/core/src/research/store.ts:337-429` | Result/Proposal and Decision batch validation; do not edit for C05. |
| `packages/core/src/research/store.ts:431-672` | Natural typed mutation-to-event extension point. |
| `packages/core/src/research/types.ts` | C02 activation, approval, and state types. |
| `packages/core/src/research/events.ts` | Strict v2 parser and exact relation enforcement. |
| `packages/core/src/research/procedure-policy.ts:124-157` | Effective authority and automatic eligibility types. |
| `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/procedure-capability-policy-contract.md:328-386` | Normative request and scope digest contracts. |

## Caveats / Not Found

- C04 implemented Procedure and policy digests but did not implement request digest or scope hash.
- A new pure core digest module is recommended so C06 can reuse identical functions rather than duplicate security-sensitive hashing in CLI code.

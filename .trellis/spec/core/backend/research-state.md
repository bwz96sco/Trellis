# Research State and Deterministic Store

This spec applies to `packages/core/src/research/**` and the public
`@mindfoldhq/trellis-core/research` subpath. It covers domain state, ledger
storage, projections, lifecycle validation, and portable repository/artifact
references. CLI commands, workflow selection, hooks, and dispatch orchestration
are separate contracts.

## 1. Scope / Trigger

Use this spec when changing any of these contracts:

- Quest, Campaign, Run, Evidence, Claim, repository, artifact, dispatch, result,
  proposal, or decision types.
- Research event parsing, reduction, transition validation, or batch commit.
- `.trellis/research/events.jsonl` or tracked projection layout.
- `.trellis/.runtime/research` lock, sequence, or projection cache behavior.
- `@mindfoldhq/trellis-core/research` exports.

Authority rules:

1. `.trellis/research/events.jsonl` is canonical research-state authority.
2. Tracked JSON files are deterministic projections. Never treat manual edits as
   state mutations.
3. Human-authored Markdown, code, data, and figures remain artifact content.
   Research state stores pointers and optional digests, not copied bodies.
4. Core exposes validated domain mutations. It must not expose a generic raw
   append API.
5. Core stays independent of CLI rendering, hooks, Task lifecycle, and Mempal.

Tracked layout:

```text
.trellis/research/
  events.jsonl
  workspace.json
  repositories.json
  quests/<qst-id>/quest.json
  campaigns/<cmp-id>/campaign.json
  runs/<run-id>/run.json
  evidence/<evd-id>/evidence.json
  claims/<clm-id>/claim.json
```

Disposable runtime layout:

```text
.trellis/.runtime/research/
  write.lock
  seq
  projection-cache.json
```

## 2. Signatures

Public imports must use the package subpath:

```ts
import {
  commitResearchBatch,
  getResearchStatus,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  validateResearchBatch,
} from "@mindfoldhq/trellis-core/research";
```

Supported store signatures:

```ts
function readResearchLedger(root: string): Promise<ResearchEvent[]>;
function readResearchState(root: string): Promise<ResearchState>;
function getResearchStatus(root: string): Promise<ResearchStatus>;
function validateResearchBatch(
  input: CommitResearchBatchInput,
): Promise<ResearchBatchValidation>;
function commitResearchBatch(
  input: CommitResearchBatchInput,
): Promise<ResearchCommitResult>;
function rebuildResearchProjections(root: string): Promise<void>;
```

Commit contract:

```ts
interface CommitResearchBatchInput {
  root: string;
  mutations: readonly ResearchMutation[];
  actor: { type: "agent" | "user" | "system"; id: string };
  provenance: { source: string; sourceId?: string };
  idempotencyKey: string;
  timestamp?: string; // ISO-8601; defaults to current time
  artifactRepositoryRoots?: Readonly<Partial<Record<RepositoryId, string>>>;
  // Optional absolute, machine-local roots used only for digest reads. Never stored.
}

interface ResearchCommitResult {
  events: ResearchEvent[];
  headSeq: number;
  replayed: boolean;
}

interface ResearchStatus {
  headSeq: number;
  eventCount: number;
  projectedThroughSeq: number;
  projectionStale: boolean;
}
```

Event and projection envelopes:

```ts
interface ResearchEvent {
  schemaVersion: 1;
  eventId: `evt_${string}`;
  seq: number; // positive, contiguous, starts at 1
  timestamp: string;
  kind: ResearchEventKind;
  aggregate: { type: ResearchAggregateType; id: string };
  related: Array<{ type: ResearchAggregateType; id: string }>;
  payload: Record<string, unknown>;
  actor: { type: "agent" | "user" | "system"; id: string };
  idempotencyKey: string;
  provenance: { source: string; sourceId?: string };
}

interface Projected<T> {
  schemaVersion: 1;
  projectedThroughSeq: number;
  updatedAt: string;
  data: T;
}
```

IDs use `crypto.randomUUID()` plus prefixes:

```text
wsp_ rep_ art_ qst_ cmp_ run_ evd_ clm_ evt_ dsp_ res_ prp_ dec_
```

`packages/core/package.json` must declare `./research`. Do not add research
exports to the small package root barrel unless a separate compatibility change
requires it.

## 3. Contracts

### Event ledger

- One strict JSON object per non-empty line.
- Every line must match `schemaVersion: 1` and an allowed event kind/payload.
- Sequence must equal prior parsed event count plus one.
- `eventId` must be unique across the complete ledger.
- Parser errors include source path and line number.
- Empty or missing ledger means empty state. Malformed existing ledger never
  degrades to partial state.

Commit order:

1. Acquire research-local filesystem lock.
2. Strict-parse complete ledger.
3. Reconcile runtime `seq` to canonical ledger head.
4. Return prior events when `idempotencyKey` already exists.
5. Convert all mutations to events and reduce complete candidate ledger.
6. Validate repository references, transitions, and supplied artifact digests.
7. Append complete serialized event batch while lock remains held.
8. Update runtime sequence.
9. Atomically write deterministic projections and projection cache.

All mutations validate before append. Failure before step 7 must leave ledger
byte-equivalent to its prior state.

### Lifecycle transitions

| Entity | Allowed transitions |
| --- | --- |
| Quest | `active -> paused | completed | abandoned`; `paused -> active | completed | abandoned` |
| Campaign | `draft -> frozen | abandoned`; `frozen -> running | blocked | abandoned`; `running -> blocked | completed | abandoned`; `blocked -> running | abandoned` |
| Run | `planned -> running | cancelled`; `running -> succeeded | failed | cancelled` |
| Evidence | `active -> superseded | retracted` |
| Claim | `candidate -> supported | contested | refuted | withdrawn`; `supported -> contested | refuted | withdrawn`; `contested -> supported | refuted | withdrawn` |

Additional rules:

- Campaign protocol digest may change only while Campaign is `draft`.
- `campaign.freeze` performs the `draft -> frozen` transition.
- Normal status transitions cannot restart terminal Runs.
- Any non-invalidated Run may receive explicit `run.invalidate` with non-empty
  reason; an already invalidated Run cannot be invalidated again.
- Terminal Evidence and Claim states do not reopen in this V1 core contract.
- Quest stage is a validated enum, separate from Quest status.

### Projections

- Serialize object keys deterministically and end files with one newline.
- Write through temp file in target directory, then atomic rename.
- Every projection uses current ledger head as `projectedThroughSeq`, including
  entities unchanged by the latest event.
- Entity `updatedAt` remains entity mutation time; it is not projection head
  time.
- `rebuildResearchProjections` reduces canonical ledger and regenerates output.
  Rebuilding twice from unchanged ledger must produce byte-equivalent files.
- Runtime projection cache is an accelerator only. Missing or invalid cache does
  not change canonical state.

If append succeeds but projection write fails, throw:

```ts
class ResearchProjectionError extends Error {
  readonly headSeq: number;
}
```

Caller must report committed ledger head and run `rebuildResearchProjections`.
Never retry mutation with a new idempotency key to repair projections.

### Portable repository and artifact paths

```ts
interface Repository {
  id: `rep_${string}`;
  name: string;
  kind: "code" | "paper" | "notes" | "data" | "other";
  locator: string; // POSIX relative path from control-plane root
  expectedRemote?: string;
  defaultBranch?: string;
  capabilities: { hasTrellis: boolean };
  createdAt: string;
  updatedAt: string;
}

interface ArtifactRef {
  id: `art_${string}`;
  repositoryId: `rep_${string}`;
  path: string; // POSIX relative path inside registered repository
  kind?: string;
  revision?: string;
  sha256?: string;
  mediaType?: string;
}
```

Path rules:

- Reject empty strings, NUL, backslashes, empty path segments, POSIX absolute
  paths, Windows absolute paths, and Windows drive-relative paths such as
  `C:repo`.
- Repository locators may normalize explicit `..` because sibling repos are
  supported.
- Artifact paths must not normalize to `..` or begin with `../`.
- `resolveArtifactPath` validates both repository locator and artifact path,
  verifies matching `repositoryId`, then confirms resolved artifact remains
  inside repository root.
- Artifact references require a registered repository.
- When `sha256` exists, commit reads target file and compares lowercase SHA-256
  hex before append. Missing digest skips content verification.
- Integrations that resolve machine-local repository bindings may pass the
  resolved absolute roots through `artifactRepositoryRoots`. Core uses those
  roots only for the current validation call and never serializes them. Without
  an override, digest reads resolve from the tracked repository locator.
- Tracked objects contain portable relative strings only. Absolute resolved
  paths belong in ignored runtime state owned by integration layers.

### Dispatch, result, proposal, and decision contracts

- Dispatch records identify one Quest, optional Campaign, one Run, one registered
  Repository, the owning skill, objective, portable context, allowed write paths,
  expected outputs, checks, and an optional portable Task reference.
- A Run can have at most one Dispatch and one Result. The Dispatch Quest and
  optional Campaign must match the Run's Campaign hierarchy.
- Results identify their Dispatch and Run and record status, summary, commands,
  checks, artifact references, blockers, optional Git revision/dirty summary,
  optional portable session reference, and creation time.
- Proposals contain only strict typed operations. Supported operations register
  artifacts; update Quest stage/status; update, freeze, or transition Campaigns;
  transition or invalidate Runs; and create or transition Evidence and Claims.
- `proposalOperationsToMutations` converts supported operations to existing
  validated `ResearchMutation` variants. Arbitrary event kinds or payloads are
  never accepted.
- Proposals begin pending. A Decision finalizes one Proposal exactly once.
  Accepted Decisions select unique in-range operation indexes; rejected or
  deferred Decisions select none.
- Result plus Proposal recording is one validated ledger batch. Selected
  Proposal mutations plus the Decision are one validated ledger batch, so a
  failing operation cannot partially append.

### Research-local lock decision

Research uses `packages/core/src/research/internal/lock.ts`, not Channel internal
storage code.

Reason: GitNexus marked Channel lock symbols HIGH risk across channel create,
send, interrupt, thread, worker-reconciliation, and test flows. Sharing by
extraction would add regression surface without V1 benefit. Research-local lock
preserves same required semantics: exclusive lock creation, PID-stamped stale
lock handling, bounded wait, release in `finally`, and one writer critical
section at a time.

Do not import from `channel/internal/**`. Any future shared-lock extraction
requires fresh upstream impact analysis plus complete Channel and Research lock
regression coverage.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Ledger line is malformed JSON | Reject with source + line number; read no partial state |
| Event has unknown field, kind, payload field, or schema version | Reject event and ledger |
| Sequence starts above 1, skips, repeats, or is out of order | Reject with expected and received sequence |
| Duplicate `eventId` | Reject ledger |
| Empty mutation batch | Throw `Research event batch must contain at least one mutation` |
| Existing `idempotencyKey` | Return prior matching events with `replayed: true`; append nothing |
| Batch contains valid mutation followed by invalid mutation | Reject whole batch; append nothing |
| Aggregate or related entity does not exist | Reject during reduction |
| Forbidden lifecycle transition | Throw `Invalid <entity> status transition: <from> -> <to>` |
| Protocol update after freeze | Reject; ledger unchanged |
| Terminal Run receives normal restart | Reject; require explicit invalidation when applicable |
| Artifact repository is unknown | Reject before append |
| Repository locator or artifact path is absolute/Windows-drive/backslash based | Reject as non-portable tracked path |
| Artifact path escapes repository root | Reject |
| Supplied artifact digest mismatches file | Reject before append |
| Runtime `seq` differs from ledger head | Repair runtime value from ledger head |
| Projection update fails after append | Throw `ResearchProjectionError(headSeq)`; ledger remains committed |
| Projection cache is missing/invalid/stale | Status reports stale; rebuild restores projections |
| Two writers overlap | Lock serializes commits; ledger remains contiguous |

## 5. Good / Base / Bad Cases

### Good

One batch establishes related state atomically:

```ts
await commitResearchBatch({
  root,
  actor: { type: "agent", id: "claude" },
  provenance: { source: "research setup" },
  idempotencyKey: "setup:qst_123",
  mutations: [
    {
      kind: "quest.create",
      quest: {
        id: questId,
        title: "Evaluate method X",
        description: "",
        repositoryIds: [repositoryId],
        artifactRefs: [],
      },
    },
    {
      kind: "campaign.create",
      campaign: {
        id: campaignId,
        questId,
        title: "Baseline comparison",
        protocolDigest: "sha256:protocol-v1",
      },
    },
  ],
});
```

Assertions: both events append with contiguous sequences, both projections use
same ledger head, retry with same idempotency key returns prior events.

### Base

Missing ledger or runtime cache:

```ts
const events = await readResearchLedger(root); // []
const state = await readResearchState(root);   // emptyResearchState()
```

No projection or runtime file is required to reconstruct canonical state.

### Bad

Non-portable or unresolved artifact:

```ts
await commitResearchBatch({
  root,
  actor,
  provenance,
  idempotencyKey: "bad-artifact",
  mutations: [{
    kind: "artifact.register",
    artifact: {
      id: createArtifactId(),
      repositoryId: createRepositoryId(),
      path: "C:repo\\results\\data.json",
    },
  }],
});
```

Required result: reject before append. Do not normalize platform-specific input
into tracked state.

## 6. Tests Required

Core research tests live under `packages/core/test/research/`.

- `schema.test.ts`
  - All ID prefixes and entity shapes.
  - Unknown keys rejected.
  - POSIX relative paths accepted.
  - absolute, backslash, empty segment, parent-escaping artifact, and Windows
    drive-relative paths rejected through public APIs.
  - unresolved repository refs and digest behavior asserted.
- `transitions.test.ts`
  - Cartesian matrix over every status pair for each entity.
  - explicit Run invalidation allowed once from each non-invalidated state.
- `events.test.ts`
  - malformed JSON includes line number.
  - invalid payload/schema version rejected.
  - sequence gap/repeat and duplicate event ID rejected.
  - serialize/parse round trip preserves events and trailing newline.
- `store.test.ts`
  - duplicate idempotency key returns original events and no append.
  - complete batch validation prevents partial append.
  - 20+ concurrent commits produce exact `1..N` sequence.
  - stale runtime sequence repairs from ledger.
  - frozen protocol and terminal Run immutability.
  - simulated projection failure leaves committed event and exposes `headSeq`.
  - rebuild twice yields byte-equivalent tracked projections.
  - unchanged entity projection advances to current ledger head.
- `dispatch.test.ts`
  - every supported Proposal operation maps to the expected mutation.
  - Dispatch hierarchy and Result/Proposal relationships are enforced.
  - Decision selection indexes are validated and finalize a Proposal once.
  - invalid multi-mutation batches leave the ledger unchanged.
- `lock.test.ts`
  - hold first critical section, start second, assert second cannot enter.
  - maximum observed critical-section concurrency equals one.
  - lock releases after callback failure.

Required verification:

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm typecheck
```

Also verify built consumer import:

```ts
import { readResearchState } from "@mindfoldhq/trellis-core/research";
```

## 7. Wrong vs Correct

### Wrong: repair projection failure by appending again

```ts
try {
  await commitResearchBatch(input);
} catch {
  await commitResearchBatch({
    ...input,
    idempotencyKey: `${input.idempotencyKey}:retry`,
  });
}
```

This can append duplicate scientific state because ledger append may already
have succeeded.

### Correct: preserve ledger authority and rebuild

```ts
try {
  await commitResearchBatch(input);
} catch (error) {
  if (error instanceof ResearchProjectionError) {
    await rebuildResearchProjections(input.root);
  } else {
    throw error;
  }
}
```

### Wrong: use entity mutation sequence as projection watermark

```ts
projected(entity, state.entitySeq[entity.id], entity.updatedAt);
```

Projection can look stale after unrelated events even though rebuild processed
complete ledger.

### Correct: use current ledger head

```ts
projected(entity, state.projectedThroughSeq, entity.updatedAt);
```

### Wrong: reuse Channel internals

```ts
import { withLock } from "../channel/internal/store/lock.js";
```

Creates hidden cross-domain coupling and changes HIGH-risk Channel blast radius.

### Correct: keep research storage boundary local

```ts
import { withResearchLock } from "./internal/lock.js";
```

Reconsider sharing only after explicit impact analysis and regression proof.

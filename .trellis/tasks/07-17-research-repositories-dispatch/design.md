# Design — Research repositories and dispatch

## Authority and boundaries

```text
tracked repository/event state
  -> runtime repository resolution
  -> portable dispatch request
  -> worker Result + untrusted Proposal
  -> root dry-run/review
  -> atomic validated mutations + Decision
```

Core owns portable shapes, runtime schemas, mutation translation, reducer legality, ledger commit, and projection state. CLI owns Git observation, machine-local bindings, tracked dispatch files, Commander/output, and root review orchestration.

## Core contract extensions

Extend current additive research types without adding dependencies.

### Repository

```ts
type RepositoryKind = "code" | "paper" | "notes" | "data" | "other";

interface Repository {
  id: RepositoryId;
  name: string;
  kind: RepositoryKind;
  locator: string;
  expectedRemote?: string;
  defaultBranch?: string;
  capabilities: { hasTrellis: boolean };
  createdAt: string;
  updatedAt: string;
}
```

`repository.register` mutation accepts same portable fields. Schema stays strict.

### Artifact

Add optional portable provenance:

```ts
interface ArtifactRef {
  id: ArtifactId;
  repositoryId: RepositoryId;
  path: string;
  kind?: string;
  revision?: string;
  sha256?: string;
  mediaType?: string;
}
```

Existing artifact refs without `kind`/`revision` remain valid.

### Dispatch

```ts
interface Dispatch {
  id: DispatchId;
  questId: QuestId;
  campaignId?: CampaignId;
  runId: RunId;
  repositoryId: RepositoryId;
  ownerSkill: string;
  provider?: string;
  objective: string;
  acceptanceCriteria: string[];
  context: DispatchContextEntry[];
  allowedWritePaths: string[];
  expectedOutputs: string[];
  checks: string[];
  taskRef?: string;
  createdAt: string;
}
```

Context entry remains exactly one of artifact or compact text. Allowed write paths use artifact-path rules and may not escape repo root.

### Result

```ts
type ResultStatus = "completed" | "partial" | "blocked" | "failed";

interface Result {
  id: ResultId;
  dispatchId: DispatchId;
  runId: RunId;
  status: ResultStatus;
  summary: string;
  commands: string[];
  checks: string[];
  artifactRefs: ArtifactRef[];
  revision?: string;
  dirtySummary?: string;
  blockers: string[];
  sessionRef?: string;
  createdAt: string;
}
```

Reducer requires matching Dispatch/Run and one Result per Run.

### Typed proposal operations

```ts
type ProposalOperation =
  | { kind: "artifact.register"; artifact: ArtifactRef }
  | { kind: "quest.status"; questId: QuestId; status: QuestStatus }
  | { kind: "quest.stage"; questId: QuestId; stage: QuestStage }
  | { kind: "campaign.protocol"; campaignId: CampaignId; protocolDigest: string }
  | { kind: "campaign.freeze"; campaignId: CampaignId }
  | { kind: "campaign.status"; campaignId: CampaignId; status: CampaignStatus }
  | { kind: "run.status"; runId: RunId; status: RunStatus }
  | { kind: "run.invalidate"; runId: RunId; reason: string }
  | { kind: "evidence.create"; evidence: EvidenceCreateInput }
  | { kind: "evidence.status"; evidenceId: EvidenceId; status: EvidenceStatus }
  | { kind: "claim.create"; claim: ClaimCreateInput }
  | { kind: "claim.status"; claimId: ClaimId; status: ClaimStatus };
```

Core exports strict `proposalOperationSchema` and `proposalOperationsToMutations`. No arbitrary event type.

```ts
interface Proposal {
  id: ProposalId;
  dispatchId: DispatchId;
  questId: QuestId;
  title: string;
  operations: ProposalOperation[];
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}
```

Decision event stores outcome, selected operation indexes, rationale, reviewer, and creation time. `decision.json` additionally stores actual applied event IDs returned by commit.

## Repository runtime files

```json
{
  "schemaVersion": 1,
  "bindings": {
    "rep_<uuid>": "/absolute/machine/path"
  }
}
```

```json
{
  "schemaVersion": 1,
  "repositories": {
    "rep_<uuid>": {
      "path": "/real/path",
      "gitRoot": "/real/git/root",
      "revision": "<HEAD or null>",
      "dirty": true,
      "remote": "<origin URL or null>"
    }
  }
}
```

Both live under ignored runtime dir. Strict-read known shape; malformed file fails with actionable error. Atomic write via `writeFileAtomic` after ensuring parent dir.

Resolution:

1. Load binding map.
2. Choose binding or `path.resolve(controlRoot, repository.locator)`.
3. `realpathSync`, require directory.
4. Observe Git using `execFileSync("git", ["-C", path, ...])`, never shell interpolation.
5. If `expectedRemote` exists, require exact origin URL match.
6. Write/update resolved runtime cache.
7. For artifact-bearing commits, pass resolved roots to core through ephemeral
   `artifactRepositoryRoots`; core performs the digest read but never serializes
   the absolute roots.

No Git repo is required unless expected remote/revision verification is requested. Plain data/notes directories remain valid.

## Dispatch file layout and envelopes

```text
.trellis/research/dispatches/<dsp-id>/
  request.json
  result.json
  proposal.json
  decision.json

.trellis/.runtime/research/dispatches/<dsp-id>/
  manifest.json
```

Tracked files serialize core portable objects or a decision record envelope. Runtime manifest contains resolved roots, observed Git info, canonical request path, and generation timestamp.

File path builder validates `dsp_` ID before `path.join`. All durable writes atomic. A ledger commit may succeed before a tracked dispatch-file write; command must report committed head plus recoverable file-write failure. Re-running with same idempotency key reconstructs files from returned canonical events.

## CLI commands

```text
trellis research repo add --name --kind --locator [--expected-remote]
  [--default-branch] [--has-trellis] [--id] [mutation options]
trellis research repo bind <repository-id> --path <path> [--json]
trellis research repo list [--json]
trellis research repo resolve <repository-id> [--json]

trellis research dispatch prepare --run --quest --repository --owner-skill
  --objective --acceptance <text>... --allow-write <path>...
  --expected-output <text>... --check <text>...
  [--campaign] [--context-file <json>] [--provider] [--task-ref]
  [--id] [mutation options]

trellis research dispatch record-result <dispatch-id> --file <json>
  [mutation options]
trellis research dispatch apply <proposal-id>
  [--operation <index>...] --rationale <text> [mutation options]
trellis research dispatch reject <proposal-id> --rationale <text>
  [mutation options]
```

Repeated options collect arrays. `record-result` file contains `{ result, proposal }`; schemas reject unknown keys. Input file may be absolute for reading but its path is never tracked.

## Prepare flow

1. Resolve control root and strict research state.
2. Validate Run exists and is planned/running.
3. Validate Quest and optional Campaign match Run hierarchy.
4. Resolve target repository and input artifacts.
5. Verify allowed-write portability and artifact digest/revision.
6. Build Dispatch and `dispatch.record` mutation.
7. Dry-run: validate event only, write nothing.
8. Commit event.
9. Atomically write `request.json` and runtime manifest.
10. Return file pointers relative to control root plus committed head.

## Result/proposal flow

1. Strict-parse input JSON through core schemas.
2. Require IDs and relations match requested Dispatch.
3. Normalize generated IDs/timestamps only when file contract permits omission; otherwise reject ambiguity.
4. Resolve and verify result artifacts.
5. Commit `result.record` + `proposal.record` in one batch.
6. Atomically write normalized result/proposal tracked files.
7. No proposal operation is applied at this step.

## Apply/reject flow

Apply:

1. Read canonical state and pending Proposal.
2. Determine selected indexes; reject duplicates/out-of-range values.
3. Convert selected operations through core helper.
4. Resolve/verify artifacts referenced by selected operations.
5. Build Decision with outcome `accept`, selected indexes, reviewer `trellis-cli`, rationale.
6. Dry-run complete mutation batch.
7. Commit selected mutations + `decision.record` using stable proposal apply idempotency key unless explicit key supplied.
8. Build `decision.json` with actual returned event IDs and rejected indexes.
9. Atomic write decision file.

Reject commits only `decision.record` with outcome `reject` and empty selected indexes. Deferred is schema-capable but has no V1 CLI command.

## Failure semantics

- Validation failure before commit writes no ledger or tracked dispatch file.
- Core `ResearchProjectionError` retains existing committed-state recovery behavior.
- Tracked dispatch-file write failure after commit reports `committed: true`, head sequence, relative target, and safe retry instruction using same idempotency key.
- Never automatically run child commands, change child Git state, or commit Git history.

## Compatibility and rollback

- Extend uncommitted V1 research types; no released on-disk migration exists.
- Update all core/CLI research fixtures together.
- Existing lifecycle commands produce compatible empty artifact/repository arrays.
- Remove new CLI commands/runtime files without deleting canonical ledger.
- Dispatch tracked files are derived handoff artifacts; canonical lifecycle remains recoverable from ledger.

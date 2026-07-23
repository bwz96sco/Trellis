# Research: Repository, Artifact, and Bounded Dispatch Context

- **Query**: Research repository registry/bindings/locators/remotes, artifact records/digests/revisions/containment, Dispatch context entries, `allowedWritePaths`, `expectedOutputs`, portable path validation, target repo resolution, exact provider-neutral bounded context output, zero-write observation APIs, and unsafe write paths.
- **Scope**: Internal
- **Date**: 2026-07-20

> **Planning resolution**: This report's exploratory `<dispatch-id>` command and draft JSON are superseded by C07 `prd.md`/`design.md`. Final input is canonical `<request-file>` plus required host and optional repeated canonical skill names. Final output omits dirty/remote values and uses the smaller frozen context contract.

## Findings

### Files Found

| File Path | Description |
|---|---|
| `packages/core/src/research/types.ts` | Canonical `Repository`, `ArtifactRef`, `DispatchContextEntry`, `Dispatch`, `Result`, and state types. |
| `packages/core/src/research/schema.ts` | Strict repository, artifact, Dispatch, result, proposal, and portable-reference parsing. |
| `packages/core/src/research/artifacts.ts` | Portable locator/artifact path normalization, containment, symlink containment, and SHA-256 verification. |
| `packages/core/src/research/repositories.ts` | Portable locator resolution and registered-repository lookup. |
| `packages/core/src/research/store.ts` | Read APIs, mutation validation, digest reads, lock-backed dry-run validation, ledger/projection writes. |
| `packages/core/src/research/reducer.ts` | Repository/artifact registration and Dispatch hierarchy/reference validation. |
| `packages/core/src/research/projections.ts` | Deterministic `repositories.json` projection containing repository and artifact arrays. |
| `packages/core/src/research/stage-capabilities.ts` | Current host-neutral Quest-stage capability and skill fallback authority. |
| `packages/cli/src/commands/research/repository.ts` | Runtime bindings, repository observation, remote checks, persisted observation cache, list/resolve APIs. |
| `packages/cli/src/commands/research/dispatch-command.ts` | Dispatch preparation, artifact verification, tracked request/manifest output, Result/Proposal recording, apply/reject. |
| `packages/cli/src/commands/research/mutation.ts` | Dry-run path through `validateResearchBatch`; important transient lock-write behavior. |
| `packages/cli/src/commands/research/command.ts` | Read-only status/validate command functions and mutating lifecycle commands. |
| `packages/cli/src/commands/research/index.ts` | Current Commander surface. No read-only `dispatch context` command exists. |
| `packages/cli/src/templates/shared-hooks/inject-subagent-context.py` | Current Claude-only bounded Dispatch validator, repository resolver, artifact validation, and prompt builder. |
| `.trellis/spec/core/backend/research-state.md` | Canonical ledger authority, path rules, stage capability authority, compatibility metadata rules. |
| `.trellis/spec/cli/backend/commands-research.md` | CLI repository and Dispatch contracts. |
| `.trellis/spec/cli/backend/research-worker-hooks.md` | Current Claude hook contract and known compatibility map boundary. |
| `.trellis/tasks/07-17-research-repositories-dispatch/design.md` | Original repository/Dispatch design, runtime files, resolution order, and no-body context intent. |
| `.trellis/tasks/07-17-research-skills-claude-hooks/design.md` | Bounded prompt fields and explicit rule that artifact bodies are not loaded. |
| `.trellis/tasks/07-18-research-only-claude-codex-migration/design.md` | Parent requirement: Claude hook plus Codex pull preflight through one read-only Dispatch context command. |
| `packages/cli/test/templates/research-hooks.test.ts` | Existing Claude behavior: bounded prompt, no artifact body, path/hierarchy/revision/symlink failures. |
| `packages/cli/test/commands/research-dispatch.integration.test.ts` | Repository binding, remote, digest, revision, dry-run, and tracked/runtime file behavior. |
| `packages/cli/test/commands/research-dispatch-compatibility.test.ts` | Frozen schema-v1 Dispatch fixture, including historical `ownerSkill`, `provider`, `taskRef`, and text `expectedOutputs`. |

## Code Patterns

### 1. Canonical authority and records

Canonical authority is `.trellis/research/events.jsonl`, not tracked projections or request files. `readResearchState` strict-reads and reduces ledger without writing (`packages/core/src/research/store.ts:195-209`; `.trellis/spec/core/backend/research-state.md:22-31`).

Repository record:

```ts
interface Repository {
  id: RepositoryId;
  name: string;
  kind: "code" | "paper" | "notes" | "data" | "other";
  locator: string;
  expectedRemote?: string;
  defaultBranch?: string;
  capabilities: { hasTrellis: boolean };
  createdAt: string;
  updatedAt: string;
}
```

Source: `packages/core/src/research/types.ts:66-76`.

Artifact record:

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

Source: `packages/core/src/research/types.ts:78-86`.

`repositories.json` is a deterministic projection envelope whose `data` contains sorted `repositories` and `artifacts` arrays (`packages/core/src/research/projections.ts:95-111`). Dispatch context embeds complete `ArtifactRef` objects. It does not use artifact IDs as indirect lookups (`packages/core/src/research/types.ts:144-160`). Current reducer requires embedded artifact repositories to exist but does not require each embedded artifact ID to exist in global `state.artifacts` (`packages/core/src/research/reducer.ts:362-395`).

### 2. Repository registry, bindings, locators, and remotes

Tracked registry fields stay portable. Runtime machine bindings live at:

```text
.trellis/.runtime/research/repo-bindings.json
```

Strict shape:

```json
{
  "schemaVersion": 1,
  "bindings": {
    "rep_<uuid>": "/absolute/machine/path"
  }
}
```

Binding keys must be repository IDs. Values must be non-empty absolute paths (`packages/cli/src/commands/research/repository.ts:89-168`). `repo bind` canonicalizes through `realpathSync`, requires a directory, then atomically writes runtime JSON (`repository.ts:335-359`).

Resolution order:

1. Runtime binding.
2. Tracked locator resolved from control root.
3. `realpathSync` candidate.
4. Require directory.
5. Observe Git.
6. If `expectedRemote` exists, require exact `remote.origin.url` equality.

Source: `packages/cli/src/commands/research/repository.ts:374-417`.

Repository locators use POSIX separators and may contain normalized parent traversal. This supports sibling repositories. They still reject empty input, NUL, backslashes, absolute/drive paths, empty segments, and normalized `.` (`packages/core/src/research/artifacts.ts:7-40`; `.trellis/spec/core/backend/research-state.md:334-353`).

Git observation uses argument-array execution, not shell interpolation:

- `git rev-parse --show-toplevel`
- `git rev-parse HEAD`
- `git status --short`
- `git config --get remote.origin.url`

Source: `packages/cli/src/commands/research/repository.ts:266-295`.

Current observation record:

```ts
interface RepositoryObservation {
  path: string;
  gitRoot: string | null;
  revision: string | null;
  dirty: boolean;
  dirtySummary: string;
  remote: string | null;
}
```

Source: `packages/cli/src/commands/research/repository.ts:31-38`.

Normal `repo resolve` persists this record to `.trellis/.runtime/research/repo-observations.json` (`repository.ts:99-107, 398-417`).

### 3. Artifact path, digest, revision, and containment semantics

Artifact paths must be repository-relative portable POSIX paths. Parent escape is forbidden (`packages/core/src/research/artifacts.ts:42-47`).

Containment uses two checks:

1. Lexical resolved path must remain under repository root.
2. Existing path is canonicalized with `realpathSync`; symlink target must also remain under canonical repository root.

Source: `packages/core/src/research/artifacts.ts:49-85` and `packages/cli/src/commands/research/dispatch-command.ts:221-254`.

SHA-256:

- Schema accepts exactly 64 hexadecimal characters and lowercases them (`packages/core/src/research/schema.ts:319-359`).
- Verification reads file bytes and compares SHA-256 (`packages/core/src/research/artifacts.ts:87-118`; `dispatch-command.ts:280-289`).
- File bytes are read only for digest validation. They must never enter bounded context output.

Revision:

- `ArtifactRef.revision` is an optional non-empty string.
- Current CLI/Claude behavior compares it to repository current `HEAD`, not a per-file blob revision (`dispatch-command.ts:272-279`; `inject-subagent-context.py:1134-1156`).
- Revision verification requires Git. A non-Git notes/data directory remains valid only when no revision or expected remote requires Git.

Dispatch artifacts:

- Current Claude hook requires every context artifact to use the Dispatch target `repositoryId` (`inject-subagent-context.py:1117-1121`).
- Artifact must exist, be a regular file, remain contained after symlink resolution, and pass optional digest/revision checks (`inject-subagent-context.py:1122-1159`).
- Output includes metadata plus resolved pointer. It does not include body (`inject-subagent-context.py:1231-1240`; `research-hooks.test.ts:916-939`).

### 4. Dispatch shape and path fields

Dispatch shape:

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

Source: `packages/core/src/research/types.ts:144-164`.

Context entry is exactly one of:

```ts
{ text: string }
{ artifact: ArtifactRef }
```

Strict parser rejects both/neither and unknown fields (`packages/core/src/research/schema.ts:534-558`).

`allowedWritePaths`:

- Core normalizes each through artifact-path rules, so paths cannot escape repository root (`packages/core/src/research/schema.ts:616-620`).
- Claude hook also canonical-resolves each path with `strict=False`, catching escape through existing symlink components (`inject-subagent-context.py:1161-1167`).
- Current contract is policy, not filesystem sandbox. Worker instructions enforce it; runtime does not intercept every write (`.trellis/tasks/07-17-trellis-research-workflow-v1/design.md:72-82`).

`expectedOutputs`:

- Core schema treats each entry as non-empty text only (`packages/core/src/research/schema.ts:620`).
- CLI flag says `--expected-output <text>` (`packages/cli/src/commands/research/index.ts:815-820`).
- Frozen schema-v1 fixture contains `"Golden report"`, not a path (`packages/cli/test/fixtures/research-dispatch-schema-v1/request.json:30-32`).
- Current Claude hook applies portable-path and containment checks to `expectedOutputs` (`inject-subagent-context.py:796-799, 1168-1174`; `.trellis/spec/cli/backend/research-worker-hooks.md:186-200`).

Provider-neutral contract should follow canonical core/CLI schema: `expectedOutputs` remain text. Only `allowedWritePaths`, artifact paths, repository locators, and path-like request refs receive path validation. This resolves existing core-vs-hook divergence without changing tracked schema-v1 data.

`taskRef`:

- Core only rejects NUL, backslash, absolute POSIX path, and Windows drive prefix (`packages/core/src/research/schema.ts:142-153`). Parent spec classifies `taskRef` as historical compatibility metadata, not authority (`.trellis/spec/core/backend/research-state.md:205-208`).
- Current Claude hook requires `.trellis/tasks/` containment and loads `task.json` existence (`inject-subagent-context.py:1176-1188`).
- Provider-neutral bounded context should expose `taskRef` unchanged as optional compatibility metadata. It should not resolve Task, load Task files, or inject Task content.

`ownerSkill` and `provider`:

- Parent spec says both remain readable schema-v1 compatibility metadata and must not route execution (`.trellis/spec/core/backend/research-state.md:205-208, 672-692`).
- Current routing authority is Quest stage through `resolveResearchStageCapability` (`packages/core/src/research/stage-capabilities.ts:53-118, 170-200`).
- Provider-neutral output should expose historical values as hints only and include current stage capability fields separately.

### 5. Existing Claude bounds

Current Python hook enforces finite input bounds:

- Non-empty string: maximum 16,384 characters.
- String array: maximum 128 entries.
- Dispatch context: maximum 128 entries.

Source: `packages/cli/src/templates/shared-hooks/inject-subagent-context.py:580-617, 800-803`.

Core schemas do not currently impose these size limits. Shared provider-neutral validator should own these limits so Claude and Codex receive same accept/reject result. Output remains structurally bounded by fixed field allowlist plus these limits.

## Exact Provider-Neutral Bounded Context Output

No current command emits this object. Parent design requires a read-only pull command (`.trellis/tasks/07-18-research-only-claude-codex-migration/design.md:3-24`). Proposed command surface:

```text
trellis research dispatch context <dispatch-id> [--root <path>] --json
```

Success output:

```json
{
  "schemaVersion": 1,
  "command": "research dispatch context",
  "valid": true,
  "control": {
    "root": "/absolute/control/root",
    "ledgerHead": 42,
    "requestRef": ".trellis/research/dispatches/dsp_<uuid>/request.json"
  },
  "dispatch": {
    "id": "dsp_<uuid>",
    "questId": "qst_<uuid>",
    "campaignId": "cmp_<uuid>",
    "runId": "run_<uuid>",
    "repositoryId": "rep_<uuid>",
    "declaredOwnerSkill": "historical-schema-v1-value",
    "providerHint": null,
    "taskRef": null,
    "createdAt": "RFC3339"
  },
  "stage": {
    "questStage": "literature",
    "capability": "research.literature",
    "optionalSkill": "research-literature",
    "fallbackSkill": "trellis-research-literature"
  },
  "targetRepository": {
    "id": "rep_<uuid>",
    "name": "Repository name",
    "kind": "code",
    "locator": "../sibling-repo",
    "expectedRemote": null,
    "defaultBranch": null,
    "capabilities": {
      "hasTrellis": false
    },
    "resolution": {
      "source": "binding",
      "path": "/absolute/canonical/target",
      "gitRoot": "/absolute/canonical/git/root",
      "revision": "git-head-or-null",
      "dirty": false,
      "remote": "origin-url-or-null",
      "remoteVerified": true
    }
  },
  "work": {
    "objective": "Bounded objective",
    "acceptanceCriteria": [
      "Criterion"
    ],
    "context": [
      {
        "type": "text",
        "text": "Dispatch-authored bounded text"
      },
      {
        "type": "artifact",
        "artifact": {
          "id": "art_<uuid>",
          "repositoryId": "rep_<uuid>",
          "path": "inputs/source.txt",
          "kind": null,
          "revision": null,
          "sha256": null,
          "mediaType": "text/plain"
        },
        "resolvedPath": "/absolute/canonical/target/inputs/source.txt",
        "contentIncluded": false
      }
    ],
    "allowedWritePaths": [
      {
        "path": "outputs/report.json",
        "resolvedPath": "/absolute/canonical/target/outputs/report.json"
      }
    ],
    "expectedOutputs": [
      "Deterministic report with source citations"
    ],
    "checks": [
      "test -f outputs/report.json"
    ]
  },
  "authority": {
    "readScope": "declared-context-only",
    "writeScope": "allowed-write-paths-only",
    "canonicalResearchMutation": false,
    "proposalReview": false,
    "gitHistoryMutation": false,
    "recordResult": false
  },
  "resultContract": {
    "topLevelKeys": [
      "result",
      "proposal"
    ],
    "result": {
      "fixed": {
        "dispatchId": "dsp_<uuid>",
        "runId": "run_<uuid>"
      },
      "requiredFields": [
        "id",
        "dispatchId",
        "runId",
        "status",
        "summary",
        "commands",
        "checks",
        "artifactRefs",
        "blockers",
        "createdAt"
      ],
      "optionalFields": [
        "revision",
        "dirtySummary",
        "sessionRef"
      ],
      "statusValues": [
        "completed",
        "partial",
        "blocked",
        "failed"
      ]
    },
    "proposal": {
      "fixed": {
        "dispatchId": "dsp_<uuid>",
        "questId": "qst_<uuid>",
        "status": "pending"
      },
      "requiredFields": [
        "id",
        "dispatchId",
        "questId",
        "title",
        "operations",
        "status",
        "createdAt",
        "updatedAt"
      ],
      "operationKinds": [
        "artifact.register",
        "quest.status",
        "quest.stage",
        "campaign.protocol",
        "campaign.freeze",
        "campaign.status",
        "run.status",
        "run.invalidate",
        "evidence.create",
        "evidence.status",
        "claim.create",
        "claim.status"
      ]
    }
  }
}
```

Field decisions:

| Field | Reason |
|---|---|
| `control.root` | Existing Claude worker receives control-root pointer. Absolute value is ephemeral output only. |
| `control.ledgerHead` | Identifies canonical state snapshot used for validation. |
| `control.requestRef` | Stable portable pointer for host adapters. No request body duplication beyond selected fields. |
| Effective `campaignId` | Always derived from Run hierarchy, even when old Dispatch omitted optional `campaignId`. |
| `declaredOwnerSkill`, `providerHint`, `taskRef` | Preserved compatibility metadata. Never routing authority. |
| `stage.*` | Current Quest-stage authority from core capability table. Host adapter may choose exact optional skill when discovered, otherwise fallback. |
| Full portable repository metadata | Enough to explain target selection without reading projection files in worker. |
| `resolution.*` | Ephemeral target identity and Git observation. No observation-cache write. `dirtySummary` omitted to avoid unbounded repository listing. |
| Text context | Only text explicitly stored in Dispatch. |
| Artifact metadata + `resolvedPath` | Enough to read declared file. `contentIncluded: false` makes no-body rule explicit. |
| Allowed path portable + resolved form | Worker sees tracked boundary and machine path. Existing symlink components already validated. |
| `expectedOutputs` | Text, matching core schema and CLI flag. |
| `checks` | Declared commands/criteria only. Context API does not execute them. |
| `authority` | Fixed provider-neutral policy. Worker cannot infer root authority from host prompt wording. |
| `resultContract` | Fixed machine-readable output contract with current typed Proposal operation allowlist. |

Failure output should contain no partial target/context data:

```json
{
  "schemaVersion": 1,
  "command": "research dispatch context",
  "valid": false,
  "error": {
    "code": "DISPATCH_CONTEXT_INVALID",
    "message": "bounded validation reason"
  },
  "safeAction": "report-to-root-no-write"
}
```

CLI exits non-zero. Claude adapter converts this into marked no-write prompt. Codex preflight stops before worker execution. Both hosts consume same validation result.

## Validation Sequence for Exact Output

1. Resolve explicit control root using existing CLI root contract. Do not search ancestors.
2. Strict-read canonical ledger through `readResearchState`; capture `projectedThroughSeq` as ledger head.
3. Require Dispatch ID in canonical state.
4. Strict-read tracked `request.json` only when command contract requires request-file integrity. Require path containment under exact Dispatch directory, strict `dispatchSchema`, matching ID, and semantic equality with canonical Dispatch. Never treat edited request file as authority.
5. Resolve Quest, Run, Campaign, and Repository from canonical state.
6. Require active Quest and dispatchable stage.
7. Derive stage capability from Quest stage. Ignore historical `ownerSkill`/`provider` for routing.
8. Require Run `planned` or `running`; require Dispatch/Run/Campaign/Quest relationships.
9. Require target Repository belongs to Quest `repositoryIds`.
10. Strict-read runtime binding map. Use binding first, locator second.
11. Canonicalize target path, require directory, observe Git with read-only commands, verify exact expected remote when configured. Do not read or write observation cache.
12. Validate context bounds: at most 128 entries; each string at most 16,384 chars.
13. For text context, emit only stored text.
14. For artifact context, require target repository ID, portable path, contained regular file, optional digest match, optional current-HEAD revision match. Emit metadata and resolved path only.
15. Normalize and containment-check each `allowedWritePaths` entry, including existing symlink components. Emit portable and resolved forms.
16. Preserve `expectedOutputs` as bounded non-empty text. Do not path-resolve it.
17. Preserve checks as bounded non-empty text. Do not execute them.
18. Emit fixed authority and Result/Proposal contract.

## Zero-Write Observation APIs

| API / operation | Zero-write status | Notes |
|---|---|---|
| `readResearchLedger(root)` | Yes | Reads and strict-parses ledger. Missing file returns empty array (`store.ts:195-205`). |
| `readResearchState(root)` | Yes | Reduces ledger in memory (`store.ts:207-209`). Preferred canonical source. |
| `getResearchStatus(root)` | Yes | Reads ledger and projection cache (`store.ts:211-223`). |
| `buildResearchContext(state, selection)` | Yes | Pure in-memory entity selection (`context.ts:26-48`). Does not include Dispatch/repository context. |
| `researchStatus(options)` | Yes | Reads canonical state and status (`command.ts:182-185, 492-520`). |
| `validateResearch(options)` | Yes | Strict state/status read; does not call batch validator (`command.ts:188-202`). |
| `listResearchRepositories(options)` | Yes | Reads canonical state and sorts repository records (`repository.ts:362-372`). |
| `resolveRepositoryForUse(root, id, false)` | Yes, with caveat | No write when explicit `false`; still reads and strict-parses observation cache before skipping persistence (`repository.ts:374-417`). Malformed unused cache can fail context resolution. |
| `git rev-parse`, `git status --short`, `git config --get` | Yes | Observation only; current code uses argument arrays (`repository.ts:266-295`). |
| `fs.realpathSync`, `fs.statSync`, `fs.existsSync`, artifact `readFileSync` for SHA | Yes | Filesystem observation. Digest read must not be emitted. |
| Current Claude `_validate_explicit_dispatch` flow | Yes | Reads ledger/projections/request/bindings/artifact bytes and runs read-only Git commands. Does not persist observations (`inject-subagent-context.py:1310-1366`). |

Preferred read-only target resolution for C07: reuse resolution rules, not current persisted-observation call path. Read bindings, registry, filesystem, and Git directly. Skip `repo-observations.json` entirely.

## Unsafe Write Paths to Avoid

| API / command | Write behavior |
|---|---|
| `resolveResearchRepository` | Calls `resolveRepositoryForUse` with default `persistObservation=true`; writes `.trellis/.runtime/research/repo-observations.json` (`repository.ts:420-427`). |
| `resolveRepositoryForUse(root, id)` without third arg | Default persistence writes observation cache (`repository.ts:374-417`). |
| `bindResearchRepository` / `research repo bind` | Writes `.trellis/.runtime/research/repo-bindings.json` (`repository.ts:335-359`). |
| `validateResearchBatch` | Acquires filesystem lock, creates runtime dir/lock file, then removes lock (`store.ts:225-239`; `internal/lock.ts:12-60`). Not zero-write despite no durable ledger mutation. |
| Any mutation command with `--dry-run` | Uses `validateResearchBatch` through `executeRepositoryDispatchMutations`; therefore performs transient lock writes (`mutation.ts:38-49`). Do not use as read-only context preflight. |
| `prepareResearchDispatch` | Non-dry-run commits ledger/projections, writes request and runtime manifest, and persists repository observations (`dispatch-command.ts:397-507`). |
| `recordResearchDispatchResult` | Commits Result/Proposal and writes tracked result/proposal files (`dispatch-command.ts:510-603`). |
| `applyResearchProposal` / `rejectResearchProposal` | Commits Decision/selected mutations and writes decision file (`dispatch-command.ts:605-748`). |
| `commitResearchBatch` | Creates research dir, appends ledger, writes sequence, projections, cache (`store.ts:241-278`). |
| `rebuildResearchProjections` / `research rebuild` | Lock plus projection/cache writes (`store.ts:281-290`). |
| `repo add`, Quest/Campaign/Run/Evidence/Claim lifecycle commands | Canonical mutation path. |
| Session pointer helpers | Write/remove `.trellis/.runtime/sessions/*.json` (`packages/cli/src/commands/research/session.ts`). |
| Direct tracked projection or request repair | Forbidden as state mutation. Ledger remains authority. |

Read-only context command must not call any mutation wrapper, dry-run validator, persisted repository resolver, rebuild path, Task-link API, session pointer helper, or tracked/runtime writer.

## Current Divergences Requiring One C07 Decision

1. **Expected outputs**: core and CLI define text; Claude hook defines contained paths. Exact provider-neutral output above follows core/CLI schema.
2. **Routing authority**: core spec says Quest stage; Claude hook still enforces historical `ownerSkill` map. Exact output uses Quest-stage capability and exposes `ownerSkill` only as metadata.
3. **Task refs**: parent spec says compatibility metadata; Claude hook resolves Task and checks `task.json`. Exact output does not load Task.
4. **Canonical source**: core says ledger; Claude hook validates request plus fresh projections but does not reduce ledger or compare complete request to canonical Dispatch. Exact C07 flow uses canonical state and checks request equality when pointer integrity matters.
5. **Size bounds**: Claude hook has 128-entry/16,384-character limits; core schemas do not. Shared validator must own bounds for host parity.
6. **Observation cache**: `resolveRepositoryForUse(..., false)` avoids writes but still parses unused observation cache. Exact C07 flow skips cache.
7. **Dirty summary**: existing repository observation can contain unbounded `git status --short` output. Exact bounded context emits `dirty` only; worker may report its own `dirtySummary` in Result.

## Related Specs

- `.trellis/spec/core/backend/research-state.md` — canonical ledger, portable repository/artifact refs, stage capability authority, compatibility metadata.
- `.trellis/spec/cli/backend/commands-research.md` — root, repository, Dispatch, dry-run, inspection, and output contracts.
- `.trellis/spec/cli/backend/research-worker-hooks.md` — current Claude-only validation and no-body prompt contract.
- `.trellis/spec/tech/repo/index.md` — package ownership map.

## External References

None. Query is repository-internal; no external API or library research required.

## Caveats / Not Found

- No current `trellis research dispatch context` command or shared TypeScript bounded-context builder exists.
- No current production TypeScript API emits Claude hook-equivalent context.
- Current write restrictions are instruction/policy boundaries, not OS sandbox enforcement.
- Current schemas do not reject duplicate `allowedWritePaths`, duplicate context entries, or overlapping write boundaries.
- Current `ArtifactRef.revision` means expected repository `HEAD`; it is not a content-addressed file revision.
- Current remote comparison is exact string equality. No URL normalization occurs.
- Current runtime remote values may contain credentials if user configured credential-bearing URLs; exact output should avoid broader logging beyond requested JSON.

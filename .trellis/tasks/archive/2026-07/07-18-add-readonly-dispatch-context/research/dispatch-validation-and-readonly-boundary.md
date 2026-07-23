# Research: Dispatch Validation and Read-Only Boundary

- **Scope**: C07 planning
- **Date**: 2026-07-20
- **Source**: current working tree plus GitNexus `Trellis` index

## Dispatch pointer contract

Canonical Claude pointer first line:

```text
Research dispatch: .trellis/research/dispatches/<dsp-id>/request.json
```

Current hook grammar:

```regex
^Research dispatch: (\.trellis/research/dispatches/(dsp_[0-9a-f-]+)/request\.json)$
```

Validation requires:

- pointer is first prompt line;
- path is exact repository-relative Dispatch request shape;
- request directory is directly below `.trellis/research/dispatches/`;
- canonical path remains inside that directory and ends in `request.json`;
- path ID, directory ID, parsed `request.id`, canonical Dispatch ID, and optional Run `dispatchId` agree;
- no traversal or symlink escape.

C07 CLI receives `<request-file>` directly, so it must enforce same canonical path shape relative to explicit control root. Arbitrary JSON files are not valid Dispatch pointers.

## Request schema

`dispatchSchema` in `packages/core/src/research/schema.ts` is strict. Unknown fields fail.

Required fields:

```text
id
questId
runId
repositoryId
ownerSkill
objective
acceptanceCriteria
context
allowedWritePaths
expectedOutputs
checks
createdAt
```

Optional fields:

```text
campaignId
provider
taskRef
```

Context entries contain exactly one of:

```ts
{ text: string }
{ artifact: ArtifactRef }
```

`ownerSkill`, `provider`, and `taskRef` remain readable schema-v1 compatibility metadata. They do not choose current stage, host, capability, or selected skill.

## Canonical state and request agreement

`.trellis/research/events.jsonl` remains authority. C07 must:

1. strict-read and reduce ledger through `readResearchState`;
2. locate canonical Dispatch by parsed request ID;
3. strict-parse tracked `request.json`;
4. require tracked request and canonical Dispatch semantic equality;
5. derive all hierarchy and capability data from canonical state.

Tracked request/projection files never override ledger state. C07 performs no repair.

## Hierarchy validation

Required checks:

1. Dispatch exists exactly once in canonical state.
2. Quest exists, is `active`, and stage is dispatchable.
3. Run exists and status is `planned` or `running`.
4. Run Campaign exists.
5. Campaign belongs to Dispatch Quest.
6. Campaign contains Run ID.
7. Optional Dispatch Campaign equals Run Campaign.
8. Run `dispatchId` equals Dispatch ID.
9. target Repository exists.
10. target Repository appears in Quest `repositoryIds`.
11. every artifact context entry belongs to target Repository.

`complete`, paused, completed, or abandoned Quest fails preflight.

## Capability and stale metadata

Current routing authority:

```text
current Quest stage
  -> resolveResearchStageCapability(stage, host, discovered names)
  -> exact optional host skill or bundled fallback
```

Historical `ownerSkill` is not routing authority. C07 should expose declared metadata separately from effective resolution and report stale metadata deterministically:

- stage-specific bundled owner matching current fallback: current;
- another stage-specific bundled owner: stale mismatch;
- historical generic/arbitrary owner: legacy metadata, readable but non-authoritative;
- `provider` differing from selected host: stale hint, not host authority;
- `taskRef`: inert provenance; do not read Task files.

A stale hint must not silently change selected skill or make `complete` dispatchable. Planning decision still needed whether stale stage-specific metadata is fatal or emitted as a bounded warning; C07 requirements choose fail-closed for owner/stage/provider disagreement while keeping generic schema-v1 aliases readable.

## Current prepare versus hook behavior

`prepareResearchDispatch` currently validates Run/Campaign/Quest relations, Run status, target Repository resolution, and context artifacts before recording. It does not require active Quest, dispatchable stage, Quest repository membership, or current capability agreement.

Current Claude hook additionally requires active Quest, stage-specific bundled owner equality, Quest repository membership, strict projection freshness, target-only artifacts, contained write/output paths, optional Task existence, and artifact digest/revision checks.

C07 must be stricter than prepare where worker safety requires it, but use core ledger state rather than projections as authority.

## Read-only components

Safe reads/pure helpers:

- `readResearchLedger`
- `readResearchState`
- `getResearchStatus`
- `reduceResearchEvents`
- strict Research schemas
- C06 stage capability resolver
- portable path and containment helpers
- runtime binding reads
- filesystem stat/realpath and SHA-256 reads
- argument-array Git observation commands

`resolveRepositoryForUse(root, id, false)` avoids observation persistence but currently still parses existing observation cache. C07 should skip that cache entirely so malformed unused cache cannot block preflight.

## Forbidden side effects

C07 context must not call or cause:

- `bindResearchRepository`;
- persisted repository observation;
- `validateResearchBatch` or mutation `--dry-run` paths;
- research lock creation;
- `commitResearchBatch`;
- `rebuildResearchProjections`;
- Dispatch prepare/result/review methods;
- tracked request/result/proposal/decision writes;
- runtime Dispatch manifest writes;
- session pointer writes;
- Task link reads or writes;
- target command/check execution;
- target repository writes;
- ledger/projection repair.

Important: mutation dry-run is not strict zero-write observation. It acquires/removes `.trellis/.runtime/research/write.lock` and may create parent dirs.

## Result, Proposal, and review authority

Worker output remains one strict object containing `result` and pending `proposal`. Root alone invokes `dispatch record-result`, then applies/rejects Proposal.

C07 only describes this contract. It does not:

- create Result or Proposal IDs;
- record worker output;
- select Proposal operations;
- mutate scientific state;
- review Proposal;
- commit Git.

## Existing mutation map

| Operation | Durable/runtime writes |
|---|---|
| `dispatch prepare` | observation cache, ledger, seq, projections/cache, tracked request, runtime manifest |
| `dispatch record-result` | observation cache when needed, two-event ledger batch, seq, projections/cache, tracked result/proposal |
| `dispatch apply` | artifact/revision observation, selected mutation events + Decision, seq, projections/cache, tracked decision |
| `dispatch reject` | Decision event, seq, projections/cache, tracked decision |
| mutation dry-run | transient research lock only |

None are reusable as C07 preflight entrypoints.

## Bounds

Current Claude hook limits:

- each non-empty string: maximum 16,384 characters;
- each string array: maximum 128 entries;
- Dispatch context: maximum 128 entries.

Core schema lacks these size bounds. Shared TypeScript preflight should own them so Claude/Codex fixtures converge later. Artifact bodies never enter output; digest reads remain internal.

## GitNexus impact

Working tree differs from indexed commit, so counts are guidance. Current CLI results:

| Symbol | Risk | Direct/affected summary |
|---|---|---|
| `readResearchState` | MEDIUM | 11 direct callers; Research commands and Dispatch flows |
| `resolveRepositoryForUse` | LOW | 4 direct callers; prepare/review/repo resolve |
| `registerResearchCommand` | LOW | direct CLI registration caller |
| `renderExtendedResearchResult` | LOW | CLI rendering path |
| `verifyArtifact` | LOW | Dispatch prepare/result/review validation |

Earlier delegated scan reported `readResearchState` as HIGH against a different/stale index view. Treat it as shared-sensitive: consume unchanged; do not edit it in C07. No CRITICAL result was reported.

Preferred change shape:

- add new provider-neutral Dispatch-context module and tests;
- minimally register one subcommand in `registerResearchCommand`;
- add or expose a zero-write repository observation helper without changing persisted resolver behavior;
- avoid changes to core store/reducer/schema and existing mutation methods;
- avoid modifying Python hook until C09.

## Principal files

```text
packages/core/src/research/schema.ts
packages/core/src/research/store.ts
packages/core/src/research/stage-capabilities.ts
packages/cli/src/commands/research/index.ts
packages/cli/src/commands/research/repository.ts
packages/cli/src/commands/research/dispatch-command.ts
packages/cli/src/templates/shared-hooks/inject-subagent-context.py
packages/cli/test/commands/research-dispatch.integration.test.ts
packages/cli/test/templates/research-hooks.test.ts
.trellis/spec/cli/backend/commands-research.md
.trellis/spec/cli/backend/research-worker-hooks.md
```

# `trellis research` Command

## 1. Scope / Trigger

`trellis research` is the CLI boundary for deterministic research lifecycle state owned by `@mindfoldhq/trellis-core/research`. The CLI parses arguments, resolves the explicit control-plane root, builds typed mutations, and renders results. Core remains the only owner of ledger parsing, reduction, append, idempotency, lifecycle validation, locking, and projection writes.

CLI code must never read or write `.trellis/research/events.jsonl` directly and must import research behavior only through the public `@mindfoldhq/trellis-core/research` subpath.

## 2. Signatures

```text
trellis research init|status|validate|rebuild
trellis research repo add|bind|list|resolve
trellis research quest create [--repository <rep-id>...]|status|stage
trellis research campaign create|protocol|freeze|status
trellis research run create|status|invalidate
trellis research task link|unlink
trellis research evidence create|status
trellis research claim create|status
trellis research dispatch prepare|record-result|apply|reject
```

Worker execution, hooks, general Task lifecycle changes, workflow selection,
and Mempal are outside this command family. Optional Task research links and
best-effort Run session pointers are CLI integration behavior, not canonical
research state.

## 3. Contracts

### Root Contract

- `--root <path>` resolves from the exact current working directory and has priority.
- Without `--root`, use the exact current working directory.
- The selected root must contain a `.trellis` directory.
- Never search ancestors or child repositories automatically.
- Absolute machine paths are passed to core for filesystem access but never stored in research event payloads.

### Mutation Contract

All event-producing commands support `--idempotency-key`, `--dry-run`, and `--json`.

- Actor defaults to `{ type: "agent", id: "trellis-cli" }`.
- Provenance source is `trellis research <subcommand>`.
- Omitted keys are generated as unique CLI keys. Cross-process retries must provide an explicit key.
- `init` defaults to `research:init`, creates one workspace, returns a no-op for matching state, and rejects conflicting arguments.
- Dry-run uses `validateResearchBatch`; it must not leave ledger, projection, or runtime files changed.
- Idempotent replay is successful and returns the original events with `replayed: true`.
- Explicit IDs and enum arguments are validated before commit. Create commands generate public core IDs when omitted.

### Quest Repository Association Contract

- `quest create --repository <rep-id>` is repeatable and stores the resulting IDs in the existing `quest.create.repositoryIds` field.
- Omission preserves the existing empty repository list.
- Repeated IDs are deduplicated while preserving first-occurrence order.
- Every supplied ID must be a valid `rep_` UUID and already exist in canonical research state before the Quest batch is committed.
- This association is the public reachability path that allows a Task link to contain both `questId` and `repositoryId`; it adds no event kind, reducer branch, projection field, or lifecycle transition.

### Task Link Contract

- `task link <task>` requires at least one of `--quest`, `--campaign`, `--run`,
  `--dispatch`, or `--repository`; `task unlink <task>` accepts no research ID.
- `<task>` is one basename resolving to a real direct child directory of
  `<root>/.trellis/tasks/` with a regular `task.json`. Reject separators,
  traversal, missing targets, non-direct children, and symlink escape.
- Links are stored only in `task.json.meta.research`. Existing omitted known
  fields, unknown `meta.research` fields, sibling metadata, and unknown
  top-level Task fields survive. A non-object existing `meta.research` fails
  without write.
- Complete resulting links are validated against canonical research state:
  every referenced entity exists and represented Quest/Campaign/Run/Dispatch/
  Repository relationships agree.
- Link/unlink use the public core Task APIs, never append research events, and
  are naturally idempotent. They do not support `--dry-run` or
  `--idempotency-key`.

### Run Session Pointer Contract

- Only explicit `TRELLIS_CONTEXT_ID` enables the TypeScript bridge to
  `.trellis/.runtime/sessions/<context-key>.json`; the CLI does not duplicate
  platform-native identity discovery.
- A successful, non-dry-run canonical `run.status` event for `running` sets
  `current_run`. Successful terminal status events and `run.invalidate` clear
  it only when it matches the affected Run.
- Dry-runs, invalid transitions, replay results without a confirming canonical
  event, and missing context identity do not mutate session state.
- Pointer writes preserve `current_task` and unknown fields, use atomic
  replacement, and delete the session file only when no meaningful state
  remains. Post-commit runtime failures produce a warning without changing the
  canonical success result.

### Repository Contract

- `repo add` commits a portable tracked Repository with kind, locator, optional
  expected Git remote/default branch, and `hasTrellis` capability.
- Repository locators are POSIX-relative to the control-plane root and may use
  `..` for sibling repositories. Commands never scan the filesystem.
- `repo bind` stores a canonical absolute machine-local override in
  `.trellis/.runtime/research/repo-bindings.json`; bindings are never tracked or
  emitted in events.
- Resolution uses an explicit binding first, then the tracked locator. Missing
  targets fail with an actionable `repo bind` instruction.
- Git observation uses argument-array process execution, validates an exact
  configured origin remote when supplied, and stores observations only under
  `.trellis/.runtime/research/repo-observations.json`.
- Runtime binding and observation files use strict versioned shapes, stable JSON,
  a trailing newline, and same-directory atomic replacement.
- Child repositories do not need a `.trellis` directory.

### Dispatch Contract

- `dispatch prepare` validates Run/Quest/Campaign relationships and the target
  Repository, commits the Dispatch, then atomically writes portable
  `request.json` and a runtime manifest under
  `.trellis/.runtime/research/dispatches`.
- `dispatch record-result` strict-parses a Result and Proposal, verifies their
  relationship to the Dispatch, validates referenced artifacts, and commits both
  in one core ledger batch before writing tracked `result.json` and
  `proposal.json`.
- Stage-owner workers return that Result-plus-pending-Proposal input as untrusted
  output. Hooks/workers never call `record-result`, append the ledger, apply or
  reject the Proposal, or commit Git; the root session reviews and records it
  explicitly. See [Research Worker Skills and Claude Hooks](./research-worker-hooks.md).
- `dispatch apply` accepts all or selected Proposal operation indexes, verifies
  the current target revision and referenced artifact existence/digest/revision,
  converts operations through the public core helper, and commits selected
  mutations plus one Decision in a single validated batch.
- Artifact verification returns resolved repository roots to core as ephemeral
  `artifactRepositoryRoots` validation input. This keeps runtime bindings
  authoritative for filesystem reads without adding absolute paths to events or
  tracked dispatch files.
- `dispatch reject` commits a Decision with no selected operations.
- Apply and reject retries are idempotent and reconstruct the existing Decision
  and applied event IDs from the canonical ledger.
- Dry-run performs the same relation, operation, repository, revision, and
  artifact validation without durable ledger, tracked-file, binding,
  observation, or manifest writes.
- Tracked request/result/proposal/decision files use stable JSON, one trailing
  newline, and atomic writes. They contain portable references only; absolute
  paths remain in runtime manifests.
- If the ledger commits but a tracked dispatch file cannot be written, report a
  committed error with the ledger head, target file, and retry/recovery details.
  Do not append a replacement batch.

### Inspection and Recovery

- `status` returns initialization state, workspace data, entity counts, ledger head, event count, projection watermark, and stale status.
- `validate` strict-parses and fully reduces the ledger, then inspects projection watermarks. It never rebuilds.
- `rebuild` calls `rebuildResearchProjections` and returns post-rebuild status. The ledger remains canonical and unchanged.
- `ResearchProjectionError` means the ledger commit succeeded but projection recovery is required. Report `committed: true`, the committed `headSeq`, and `recovery: "trellis research rebuild"`. Never retry the mutation automatically.

### Output Contract

- Every successful `--json` invocation emits exactly one JSON document on stdout.
- JSON output contains no Chalk formatting or startup update notice.
- Non-JSON startup update notices retain existing behavior.
- Human output stays compact and includes generated IDs, head sequence, replay/dry-run state, or the recovery command as applicable.
- Operation functions return structured results and throw errors. Commander registration owns stderr rendering and process exit status.

### V1 Closure and Deferrals

The executable V1 closure is the root-owned ledger, portable repositories, explicit Dispatch review/apply, optional Task links, deterministic rebuild, and bounded Claude routing. V1 does not include a scheduler, automatic worker execution outside supported Claude routing, automatic Claim promotion, broad lifecycle hooks, generated `brief.md`/`protocol.md`/`verdict.md`/`notes.md`, Claim reopening, Quest completion gates, Campaign relaunch, richer scientific entity fields, convenience lifecycle aliases, or direct Mempal references. These are accepted future high-impact changes, not hidden command behavior.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Selected root lacks `.trellis` | Fail; never search ancestors or child repositories |
| Quest repository ID is malformed, duplicated, or unknown | Reject malformed/unknown IDs before append; deduplicate valid repeats in first-occurrence order |
| Task argument is not a safe real direct child or lacks regular `task.json` | Fail before Task or ledger write |
| Task link ID is malformed, missing, or hierarchy-inconsistent | Fail before Task or ledger write |
| Existing `task.json.meta.research` is not an object | Fail without replacing malformed state |
| Run pointer update fails after canonical commit | Keep command successful and emit a runtime warning |
| Runtime binding file has unknown fields, invalid repository IDs, or relative paths | Fail as malformed runtime state |
| Bound repository differs from tracked locator | Use the binding for Git and artifact reads; keep the tracked locator unchanged |
| Expected origin remote differs | Fail before any ledger append |
| Result or Proposal is invalid, mismatched, or recorded alone | Reject the complete batch; append nothing |
| Apply selects duplicate or out-of-range indexes | Fail before append |
| Artifact path, digest, or revision differs | Fail before append; write no decision file |
| Apply/reject repeats after Decision commit | Return the canonical Decision and applied event IDs; append nothing |
| Ledger commits but a tracked dispatch file write fails | Report `committed: true`, head, target, and same-key recovery instruction |
| Dry-run succeeds or fails | Leave ledger, projections, observations, manifests, and tracked dispatch files unchanged |

## 5. Good / Base / Bad Cases

### Good

A root control plane registers sibling code, paper, and notes repositories, then creates a Quest with three repeated `--repository` options. A duplicate option is collapsed deterministically. Task-free and Task-linked Dispatches are reviewed through Result plus pending Proposal, dry-run, explicit apply, and replay. Artifact and dispatch validation may read resolved absolute paths, while the event ledger, projections, Task link, and tracked dispatch files contain only repository IDs and portable relative strings.

### Base

A registered child repository resolves directly from its tracked locator. A
prepare dry-run validates hierarchy, repository access, context, and paths but
creates no event, observation, request, or manifest.

### Bad

A runtime binding contains `"rep_...": "relative/repo"`, or a worker Proposal
contains an arbitrary event kind. Parsing fails before mutation; the CLI must not
normalize either input into canonical research state.

## 6. Tests Required

```bash
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research.test.ts \
  test/commands/research.integration.test.ts \
  test/commands/research-dispatch.integration.test.ts \
  test/commands/research-task.integration.test.ts \
  test/commands/research-workflow.integration.test.ts \
  test/scripts/active-task-pointers.integration.test.ts
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis typecheck
pnpm --filter @mindfoldhq/trellis build
pnpm typecheck
```

Repository/dispatch coverage must include child and sibling repositories,
runtime-binding precedence, malformed runtime files, expected-remote mismatch,
prepare portability, Result-plus-Proposal atomicity, subset apply, reject,
idempotent replay, post-commit file recovery, digest/revision mismatch, and a
bound-repository digest success case that fails if core re-resolves only the
tracked locator.

The consolidated workflow suite must additionally prove separate workflow and research initialization, root plus three independent Git repositories, Quest repository association, Task-free and Task-linked Dispatch review, Task pointer preservation through finish/archive, durable lifecycle projections, byte-stable rebuild, malformed-ledger fail-closed behavior, bundled/custom workflow update ownership, legacy source byte preservation, ignored runtime state, and absence of POSIX/Windows/UNC/fixture-local absolute paths in tracked research records. It exercises request/result/proposal/decision contracts but does not pretend to execute a real Claude worker.

## 7. Wrong vs Correct

### Wrong: accept Quest repository strings without canonical validation

```ts
repositoryIds: options.repository,
```

### Correct: parse, deduplicate, and require every registered repository before commit

```ts
const repositoryIds = [...new Set(options.repository.map(parseRepositoryId))];
for (const repositoryId of repositoryIds) {
  if (!state.repositories[repositoryId]) {
    throw new Error(`Unknown research repository '${repositoryId}'`);
  }
}
```

### Wrong: pass a bound artifact through CLI validation, then let core re-read the tracked locator

```ts
await verifyArtifactFromBinding(root, artifact);
await commitResearchBatch({ root, mutations, actor, provenance, idempotencyKey });
```

This fails for a valid binding when the tracked locator is absent or points to a
different checkout.

### Correct: pass resolved roots as non-persisted validation context

```ts
await commitResearchBatch({
  root,
  mutations,
  actor,
  provenance,
  idempotencyKey,
  artifactRepositoryRoots: { [artifact.repositoryId]: resolvedRepositoryRoot },
});
```

Core still performs the digest read before append, but the absolute root exists
only in the current call and is never serialized.

### Wrong: retry a committed Decision with a new key after `decision.json` fails

```ts
await applyResearchProposal({ ...options, idempotencyKey: "new-key" });
```

### Correct: retry with the original key and reconstruct the file from canonical events

```ts
await applyResearchProposal({ ...options, idempotencyKey: originalKey });
```

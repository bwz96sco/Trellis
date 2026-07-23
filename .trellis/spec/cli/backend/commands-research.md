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
trellis research evidence create|status
trellis research claim create|status
trellis research dispatch context <request-file> --host claude|codex [--skill-name <name>...]|prepare|record-result|apply|reject
```

Worker execution, hooks, Task lifecycle and linking, workflow selection, and
Mempal are outside this command family. Best-effort Run session pointers are
CLI integration behavior, not canonical research state. The exact active
Research groups are `init`, `status`, `validate`, `rebuild`, `repo`, `quest`,
`campaign`, `run`, `evidence`, `claim`, and `dispatch`; the exact Dispatch
children are `context`, `prepare`, `record-result`, `apply`, and `reject`.

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
- This association is the public reachability path for canonical Research entities; it adds no event kind, reducer branch, projection field, or lifecycle transition.
- `trellis research task`, `task link`, and `task unlink` are not registered. Historical schema-v1 `taskRef` values remain compatibility metadata only and are never dereferenced or used for routing.

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

### Read-only Dispatch Context Contract

- `dispatch context <request-file> --host claude|codex` accepts only the exact
  portable path `.trellis/research/dispatches/<dsp-id>/request.json`. Absolute,
  traversal, backslash, alias, ID-mismatched, and symlink-escaped paths fail.
- The command strict-parses the tracked request and canonical ledger through the
  public Research subpath, requires semantic equality, and derives hierarchy and
  routing only from canonical state. It never reads projections as authority.
- Quest status must be `active`, Run status must be `planned` or `running`, the
  current Quest stage must be dispatchable, and Quest/Campaign/Run/Dispatch/
  Repository relations must agree, including Quest Repository membership.
- `--skill-name` is repeatable name-only discovery input. Values are trimmed,
  empty values dropped, exact-deduplicated, and restricted to canonical lowercase
  slugs. The command does not scan skill roots or read skill bodies/frontmatter.
- Current Quest stage, requested host, and exact discovered names are the only
  capability authority. Historical `ownerSkill`, `provider`, and `taskRef` are
  emitted as compatibility metadata with deterministic warnings and never cause
  Task dereference or route selection.
- Repository resolution strict-reads bindings first and falls back to the tracked
  locator. It verifies the directory, Git identity, optional current-HEAD artifact
  revision, and exact configured origin remote without reading or writing the
  observation cache and without running `git status`.
- Dispatch context and list values are limited to 128 entries; strings are limited
  to 16,384 characters. Artifacts must belong to the target Repository, resolve
  as canonically contained regular files, and pass optional digest/revision checks.
  Output contains metadata and resolved pointers only, never artifact bodies.
- `allowedWritePaths` are portable contained paths and reject existing symlink
  ancestor escapes. `expectedOutputs` and `checks` remain bounded declared text;
  preflight does not path-resolve or execute them.
- Success emits one bounded object on stdout. Typed JSON failure emits one object
  on stderr with a stable code and `safeAction: "report-to-root-no-write"`, no
  partial context, and exit status one.
- Both successful and failed calls are strictly zero-write: no Research lock,
  runtime directory, observation, manifest, session, ledger, projection, tracked
  Dispatch, Task, target Repository, or Git history mutation. Mutation dry-run
  APIs are forbidden because they create transient lock state.

### Bounded Host Consumer Contract

C07 is the sole Dispatch decision authority for both installed
`trellis-research-worker` adapters. Neither host may manually parse the request,
ledger, projections, Task metadata, hierarchy, Repository, artifacts, paths,
stage routing, or expected-output text as a fallback.

The Codex worker accepts one canonical Dispatch pointer and, before reading the
request, target, or any skill body, discovers exact optional skill names from
Codex inventory metadata and executes directly:

```text
trellis research dispatch context <request-file> --host codex --root . [--skill-name <canonical-name> ...] --json
```

That invocation is the worker's first process. No `npx`, package installation,
shell reinterpretation, manual ledger/request/projection validation, or mutation
dry-run fallback is permitted. The worker requires one successful JSON object,
empty successful stderr, exact host/request, the no-mutation authority snapshot,
and `outputContract.type = "result-plus-pending-proposal"` before target access.
It then loads only `capability.selectedSkill`; `ownerSkill`, `provider`, `taskRef`,
and warnings remain non-authoritative.

A typed C07 failure with `safeAction: "report-to-root-no-write"` is returned
unchanged. Missing/incompatible execution, malformed/multiple JSON, successful
stderr, or response-contract mismatch yields only the worker-owned
`PREFLIGHT_EXECUTION_FAILED` no-write diagnostic, without invented IDs. After a
valid response, selected-skill failure may return a blocked Result plus empty
pending Proposal using the output-contract IDs.

Target work remains narrower than Codex `workspace-write`: reads come only from
inline context and declared artifact pointers; writes use only declared resolved
write paths with immediate ancestor/symlink recheck; checks are untrusted text;
network and sandbox expansion are forbidden. The worker returns raw strict Result
plus pending Proposal JSON and never records, reviews, applies, or rejects it.
The root session remains the only mutation authority.

Claude uses a narrow `PreToolUse` adapter. Only an exact complete one-line
`trellis-research-worker` envelope may start C07. The hook runs pass 1 directly
with `--host claude`, the absolute Research control root, and no skill name. After
success it may inspect file metadata only for the exact returned optional skill at
the direct project and personal Claude `SKILL.md` paths. Exact presence causes one
final pass with one `--skill-name`; otherwise pass 1 is final. It validates the
same success/typed-failure contract, injects the exact final JSON without the
parent prompt tail, and denies Agent startup for invalid envelopes or preflight
anomalies. There is no Python compatibility-validator fallback.

The Claude worker invokes exactly `capability.selectedSkill` through `Skill`.
Unavailable or unreadable validated selection yields a blocked Result plus empty
pending Proposal before target access. Reads, writes, checks, output, Research
mutation, Proposal review, Git, network, delegation, and sandbox constraints match
the bounded Codex contract where host mechanics permit.

Shared production-built fixtures must compare direct Claude/Codex C07 results for
all active stages and non-dispatchable state. After normalizing only `host` and
the provider-hint warning, every provider-neutral field must be equal. Both
success and failure preflight paths are full-tree zero-write.

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

The executable V1 closure is the root-owned ledger, portable repositories,
explicit Dispatch review/apply, deterministic rebuild, C07 as the sole
Claude/Codex Dispatch decision authority, and bounded host workers. Historical
schema-v1 Task metadata remains readable but has no active CLI subtree.
V1 does not include a scheduler, automatic worker execution outside those
supported adapters, automatic Claim promotion, broad lifecycle hooks, generated
`brief.md`/`protocol.md`/`verdict.md`/`notes.md`, Claim reopening, Quest completion
gates, Campaign relaunch, richer scientific entity fields, convenience lifecycle
aliases, or direct Mempal references. These are accepted future high-impact
changes, not hidden command behavior.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Selected root lacks `.trellis` | Fail; never search ancestors or child repositories |
| Dispatch context host is blank, case-varied, retired, an installer ID, or arbitrary | Return `INVALID_HOST`; perform no target observation or write |
| Dispatch context skill name is path-like, namespaced, adorned, case-varied, or body-like | Return `INVALID_SKILL_NAME`; never scan or read skill files |
| Claude worker envelope has blanks, extra lines/tail, prefix/suffix, alias, traversal, backslash, absolute path, or case variation | Deny Agent startup before C07; emit no updated prompt |
| Claude C07 call returns a typed no-write failure | Deny Agent startup with bounded C07 code/message; perform no target or skill-body access |
| Claude cannot execute C07 or receives empty/malformed/multiple JSON, successful stderr, or mismatched authority | Deny with `PREFLIGHT_EXECUTION_FAILED`; do not launch a failure worker or validate manually |
| Exact direct Claude optional skill metadata exists after pass 1 | Run one final C07 pass with exactly that returned name; inject the final response |
| Claude validated selected skill is unavailable | Return blocked Result plus empty pending Proposal using exact output-contract IDs; perform no target access |
| Codex worker C07 call returns a typed no-write failure | Return the C07 object unchanged; perform no target or skill-body access |
| Codex worker cannot execute C07 or receives malformed/multiple JSON, successful stderr, or mismatched authority | Return `PREFLIGHT_EXECUTION_FAILED` without IDs; do not validate manually or broaden access |
| Codex worker selected skill is unavailable after valid C07 | Return blocked Result plus empty pending Proposal using exact output-contract IDs |
| Dispatch context request path is noncanonical, missing, symlinked, or ID-mismatched | Return the matching request error before Repository observation |
| Tracked request differs from canonical Dispatch | Return `REQUEST_STATE_MISMATCH`; never use tracked edits as authority |
| Quest/Run/stage/hierarchy is not dispatchable | Fail closed with no partial context and no write |
| Artifact digest/revision/containment or write-scope containment fails | Return the bounded artifact/write error; expose no bytes or partial target data |
| Quest repository ID is malformed, duplicated, or unknown | Reject malformed/unknown IDs before append; deduplicate valid repeats in first-occurrence order |
| `research task`, `task link`, or `task unlink` is entered | Commander unknown-command failure; no action callback, Task read/write, or Research mutation |
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

A root control plane registers sibling code, paper, and notes repositories, then creates a Quest with three repeated `--repository` options. A duplicate option is collapsed deterministically. Dispatches are reviewed through Result plus pending Proposal, dry-run, explicit apply, and replay. Artifact and dispatch validation may read resolved absolute paths, while the event ledger, projections, and tracked dispatch files contain only repository IDs and portable relative strings.

A Claude worker receives one exact complete pointer line from a child Repository.
The hook finds the root control plane, calls C07 with no optional name, probes only
the exact returned direct skill metadata, runs an optional final pass, and injects
that final JSON byte-for-byte as data. The worker invokes only the selected skill,
performs declared work, and returns raw Result plus pending Proposal JSON while
leaving canonical Research and Git history unchanged.

A Codex worker receives one canonical pointer, discovers an exact optional skill
name without reading its body, and calls `dispatch context` as its first process.
The command validates canonical state and returns only bounded declared text and
artifact pointers. The worker validates the authority/output contract, loads only
the selected skill, performs declared work, and returns raw Result plus pending
Proposal JSON while leaving canonical Research and Git history unchanged.

### Base

A registered child repository resolves directly from its tracked locator. A
prepare dry-run validates hierarchy, repository access, context, and paths but
creates no event, observation, request, or manifest. A context preflight with no
supplied optional skill name deterministically selects the bundled stage fallback
and ignores a malformed unused observation cache. A Claude hook with no exact
direct optional skill file uses pass 1 as final; the Codex worker passes no
`--skill-name` pair. Each loads only the returned fallback after successful
validation and may return a blocked Result when declared work cannot fit its
narrower scope.

### Bad

A runtime binding contains `"rep_...": "relative/repo"`, or a worker Proposal
contains an arbitrary event kind. Parsing fails before mutation; the CLI must not
normalize either input into canonical research state. A context caller passes an
absolute request file, plugin-qualified skill, edited request, escaped artifact,
or terminal Quest; preflight returns a bounded no-write failure with no partial
Repository or context object. A Claude hook accepts a prompt tail, scans skill
roots, reads a skill body before C07, falls back to manual Python validation, or
launches a worker after failed preflight; each violates the adapter contract. A
Codex worker reads the target first, routes from `ownerSkill`, retries through
`npx`, requests `--add-dir`, or wraps its final JSON in prose; each behavior
violates the adapter contract even if the scientific work itself appears correct.

## 6. Tests Required

```bash
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research.test.ts \
  test/commands/research.integration.test.ts \
  test/commands/research-dispatch.integration.test.ts \
  test/commands/research-dispatch-context.integration.test.ts \
  test/commands/research-workflow.integration.test.ts \
  test/scripts/active-task-pointers.integration.test.ts \
  test/templates/codex.test.ts \
  test/templates/research-hooks.test.ts \
  test/commands/init-research-only.integration.test.ts \
  test/commands/update.integration.test.ts \
  test/regression.test.ts
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
tracked locator. Shared production-built fixtures must additionally cover all
nine active-stage Claude/Codex decisions, `complete`, warning-only compatibility
metadata, descriptive `expectedOutputs`, exact Claude envelope/process argv,
two-pass direct metadata discovery, denial anomalies, exact injected JSON,
selected-skill behavior, and full-tree zero-write.

The consolidated workflow suite must additionally prove Research initialization, root plus three independent Git repositories, Quest repository association, Dispatch review, durable lifecycle projections, byte-stable rebuild, malformed-ledger fail-closed behavior, historical native digest recognition without active native/custom resolution, legacy source byte preservation, ignored runtime state, and absence of POSIX/Windows/UNC/fixture-local absolute paths in tracked research records. Parser tests must prove the exact Research and Dispatch child sets and byte-identical zero-write rejection of `research task`, `task link`, and `task unlink`. The suite exercises request/result/proposal/decision contracts but does not pretend to execute a real Claude worker.

## 7. Wrong vs Correct

### Wrong: reuse mutation dry-run or persisted Repository resolution for context

```ts
await validateResearchBatch(input);
await resolveResearchRepository({ root, repositoryId });
```

Both paths can create runtime state; the persisted resolver also reads/writes the
observation cache.

### Correct: use the dedicated zero-write context path

```ts
await getResearchDispatchContext({
  root,
  requestFile,
  host,
  discoveredSkillNames,
});
```

The operation strict-reads canonical state, bindings, filesystem metadata, Git
identity, and declared artifacts only. It never acquires the Research lock or
persists observations.

### Wrong: route from schema-v1 compatibility metadata

```ts
const selectedSkill = dispatch.ownerSkill;
```

### Correct: route from current Quest stage and explicit host discovery

```ts
const selectedSkill = resolveResearchStageCapability({
  stage: quest.stage,
  host,
  discoveredSkillNames,
}).selectedSkill;
```

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

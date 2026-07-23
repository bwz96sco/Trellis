# Design — Read-only Dispatch context

## Boundary

C07 adds one provider-neutral observation path. It reads canonical Research state and bounded target metadata, then returns worker context. It never enters mutation validation, acquires Research lock, executes work, or changes Claude/Codex adapters.

```text
canonical request pointer
  -> strict request parse
  -> canonical ledger reduction
  -> request/state equality
  -> hierarchy + stage validation
  -> canonical name-only skill resolution
  -> zero-write Repository/artifact/path observation
  -> bounded worker context
```

C08 adds Codex worker. C09 makes Claude hook consume/parity-test shared authority and removes duplicate-map drift.

## CLI signature

```text
trellis research dispatch context <request-file> \
  --host <claude|codex> \
  [--skill-name <canonical-name>...] \
  [--root <path>] \
  [--json]
```

`--json` is mandatory for host adapters, though human rendering may remain available through standard output options.

Host and skill-name validation occurs inside operation so `runAction` can render machine failures consistently.

## Module shape

Add focused module:

```ts
export interface GetResearchDispatchContextOptions {
  root?: string;
  requestFile: string;
  host: string;
  discoveredSkillNames?: readonly string[];
}

export function getResearchDispatchContext(
  options: GetResearchDispatchContextOptions,
): ResearchDispatchContextResult;
```

Use synchronous filesystem/Git style matching current Research commands unless surrounding code requires async wrapper. Return immutable-facing structured result; throw typed `ResearchDispatchContextError` on first failure.

Add typed error:

```ts
type ResearchDispatchContextErrorCode =
  | "INVALID_HOST"
  | "INVALID_SKILL_NAME"
  | "INVALID_REQUEST_PATH"
  | "REQUEST_NOT_FOUND"
  | "INVALID_REQUEST"
  | "DISPATCH_NOT_FOUND"
  | "REQUEST_STATE_MISMATCH"
  | "DISPATCH_HIERARCHY_INVALID"
  | "QUEST_NOT_DISPATCHABLE"
  | "REPOSITORY_INVALID"
  | "ARTIFACT_INVALID"
  | "WRITE_SCOPE_INVALID"
  | "CONTEXT_LIMIT_EXCEEDED";
```

Error messages must be bounded and contain no artifact body, request body, absolute path dump beyond directly relevant safe pointer, command output, or partial success object.

## Request pointer

Accepted value is exactly:

```text
.trellis/research/dispatches/dsp_<lowercase-uuid>/request.json
```

Algorithm:

1. Reject NUL, backslash, absolute/drive/UNC path, empty segment, `.`/`..`, trailing slash, and extra prefix/suffix.
2. Parse Dispatch ID from exact grammar.
3. Resolve from explicit Research root.
4. Canonicalize existing file and exact Dispatch directory.
5. Require regular file and containment below exact `.trellis/research/dispatches/<id>/` directory.
6. Strict-parse with public `dispatchSchema`.
7. Require parsed ID equals path ID.

No arbitrary input-file mode exists.

## Canonical state agreement

Call `readResearchState(root)` unchanged. Locate canonical Dispatch by ID.

Use deep structural equality between strict-parsed tracked request and canonical Dispatch. Any edited/stale field fails `REQUEST_STATE_MISMATCH`; request file never overrides ledger state.

Use canonical state for all following objects. Do not read projections as authority or repair them.

## Hierarchy sequence

Validate in fixed order:

1. Dispatch exists.
2. Quest exists, status is `active`, stage is dispatchable.
3. Run exists, status is `planned|running`, and `run.dispatchId` equals Dispatch ID.
4. Run Campaign exists and belongs to Quest.
5. Campaign contains Run ID.
6. Optional Dispatch Campaign equals Run Campaign.
7. target Repository exists and appears in Quest `repositoryIds`.
8. artifact context entries reference target Repository.

Return effective `campaignId` from Run even when old Dispatch omitted optional `campaignId`.

## Capability and skill discovery

C07 does no filesystem skill discovery. Adapter supplies repeated canonical names only.

Canonical name grammar:

```regex
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

Trim, drop empty, exact-dedupe, then call:

```ts
resolveResearchStageCapability({
  stage: quest.stage,
  host: parseResearchExecutionHost(host),
  discoveredSkillNames,
});
```

No path scan, global config lookup, skill-body/frontmatter read, alias, namespace, case fold, or fuzzy match.

## Compatibility metadata

Output separates declared metadata from effective routing:

```ts
dispatch.declaredOwnerSkill
 dispatch.providerHint
 dispatch.taskRef
 capability.selectedSkill
```

Warnings are deterministic and sorted in fixed code order:

- generic/historical owner not matching current selected/fallback skill -> `LEGACY_OWNER_SKILL_IGNORED`;
- known stage-specific bundled owner for another stage -> `OWNER_SKILL_STAGE_MISMATCH`;
- provider hint present and different from requested host -> `PROVIDER_HINT_MISMATCH`;
- taskRef present -> `TASK_REF_IGNORED`.

Warnings never change validity, selected skill, or authority. Request-versus-canonical mismatch remains fatal.

## Zero-write Repository resolution

Add additive helper in `repository.ts`, separate from persisted resolver:

```ts
export function resolveResearchRepositoryContext(
  root: string,
  repositoryId: RepositoryId,
): ResearchRepositoryContextResolution;
```

Behavior:

1. Read canonical state Repository.
2. Strict-read binding file only.
3. Binding first; tracked locator second.
4. Canonicalize and require directory.
5. Run bounded argument-array Git identity commands only:
   - `git rev-parse --show-toplevel`
   - `git rev-parse HEAD`
   - `git config --get remote.origin.url`
6. Verify exact `expectedRemote` if configured.
7. Return source, canonical path, Git root/revision, and boolean remote verification.

Do not read/write observation cache. Do not run `git status` or emit dirty summary. Non-Git Repository is allowed when no expected remote or artifact revision requires Git.

## Artifact validation

For each artifact context entry:

1. enforce target Repository ID;
2. enforce portable relative path;
3. resolve lexical path below target root;
4. canonicalize nearest existing ancestor to reject symlink-parent escape even when final output path does not exist;
5. require artifact target exists and is regular file;
6. if global state contains same Artifact ID, require semantic identity with embedded ref;
7. if `sha256` present, read bytes only for digest comparison;
8. if `revision` present, require Repository Git revision and exact equality.

Output includes metadata, resolved path, and `contentIncluded: false`. Never return bytes.

## Text/list bounds

Shared limits:

```ts
const MAX_CONTEXT_ENTRIES = 128;
const MAX_LIST_ENTRIES = 128;
const MAX_STRING_LENGTH = 16_384;
```

Apply to objective, criteria, context text, expected outputs, checks, compatibility metadata messages, and repeated skill names. Existing strict schema still owns basic non-empty shape.

## Write boundaries

`allowedWritePaths` remain portable repository-relative paths. For each path:

- require lexical containment;
- canonicalize nearest existing ancestor;
- reject existing symlink-parent escape;
- final path may be absent;
- emit portable plus resolved form.

`expectedOutputs` remain text. They are not path-resolved because schema-v1 core/CLI contracts and frozen fixture permit values such as `Golden report`.

Checks remain text and are never executed.

## Success result

Fixed top-level fields:

```text
schemaVersion
command
valid
host
ledgerHead
requestRef
dispatch
capability
warnings
repository
work
authority
outputContract
```

Output is bounded by fixed allowlist and finite input limits. Repository output omits actual remote string, credentials, dirty summary, observation cache, and arbitrary Git output.

`authority` always states:

```json
{
  "readScope": "declared-context-only",
  "writeScope": "allowed-write-paths-only",
  "canonicalResearchMutation": false,
  "proposalReview": false,
  "gitHistoryMutation": false,
  "recordResult": false
}
```

`outputContract` fixes Dispatch/Run/Quest IDs and pending Proposal status; worker still returns strict current core Result plus Proposal shape.

## Error rendering

Extend Research error rendering only for `ResearchDispatchContextError`.

JSON failure goes to stderr, stdout stays empty, `runAction` sets exit code 1:

```json
{
  "schemaVersion": 1,
  "command": "research dispatch context",
  "valid": false,
  "error": {"code": "...", "message": "..."},
  "safeAction": "report-to-root-no-write"
}
```

Generic Research error behavior stays unchanged. Human failure is one compact no-write line.

## Read-only proof

Integration tests snapshot both control root and target repository before and after:

- successful preflight;
- each validation phase failure;
- repeated preflight;
- malformed unused observation cache.

Assert byte-identical tree and no newly created:

```text
.trellis/.runtime/research/write.lock
.trellis/.runtime/research/repo-observations.json
.trellis/.runtime/research/dispatches/**
.trellis/.runtime/sessions/**
.trellis/research/events.jsonl changes
.trellis/research/dispatches/** changes
```

Preflight-owned bounded reads of target metadata/artifacts are permitted. No worker/adapter target access occurs before success.

## Compatibility and child boundaries

- No event/projection/request migration.
- No Dispatch schema change.
- No core root export change.
- Historical owner/provider/taskRef remain readable.
- No Task dereference.
- No Python hook behavior change in C07.
- No Codex worker/template in C07.
- No shared hook-map removal before C09.

## Rollback

Delete additive context module/tests/registration/error branch/spec section and additive Repository context resolver. No stored state or data repair required because C07 writes nothing.

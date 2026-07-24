# Technical design

## Boundary

C05 turns C02's read-only schema-v2 lifecycle into a typed root mutation surface:

```text
canonical Dispatch + explicit capability
  -> C03 registry
  -> C04 Procedure/policy/effective authority
  -> request digest + normalized scope hash
  -> canonical activation
  -> automatic authorization or strong interactive approval
  -> canonical grant/revocation
  -> recoverable non-authoritative sidecars
```

C05 does not change Context or Result consumption. C06 later reuses the binding/preflight layer.

## GitNexus risk and stop gates

| Existing symbol | Risk | C05 handling |
|---|---:|---|
| `buildValidatedBatch` | CRITICAL | Unavoidable minimal typed version-aware draft edit. Warn before edit; preserve all other behavior. |
| `validateHierarchy` (new C05-local symbol) | CRITICAL after implementation indexing | Permit exact ordered body-only parity with frozen Context: Quest active, dispatchable Run, candidate/existing Run binding, Campaign ownership/membership, optional Campaign match, and Quest/Repository association. Preserve signature/caller/result and adjacent logic. |
| `secureDirectory`, `writeSidecar` (new C05-local symbols) | CRITICAL after implementation indexing | Permit same-file identity-bound detect-and-fail hardening plus private helpers/tests only. No shared writer, caller, dependency, or public contract change. |
| `validateResearchBatch` | CRITICAL | Consume unchanged; no signature/body redesign. |
| `commitResearchBatch` | CRITICAL | Consume unchanged; preserve lock/append/projection/recovery. |
| `readResearchState` | CRITICAL | Consume unchanged. |
| `executeRepositoryDispatchMutations` | HIGH | Do not edit; add timestamp-aware C05 sibling executor. |
| `validateDispatchBatch` | HIGH | Do not edit; C06 owns consumption batch. |
| `dispatchPaths`, `writeJson`, `writeCommittedJson` | HIGH | Do not edit; add C05 materialization module. |
| `resolveRepositoryForUse` | HIGH | Consume with persistence disabled; do not edit. |
| `mutationToEventDraft` | LOW | Extend with exact typed v2 mappings. |
| `prepareResearchDispatch` | LOW | Surgically add explicit capability and atomic activation. |
| `registerResearchCommand` | LOW | Add C05 commands/options only. |
| `renderResearchError` | LOW | Preserve stable typed codes. |

No compliant alternate avoids the CRITICAL builder edit: duplicating lock, sequence allocation, idempotency, append, reduction, projections, and recovery would be less safe. Post-implementation review also found two security/correctness gaps in CRITICAL C05-local symbols. `validateHierarchy` receives one exact ordered body-only parity amendment. `secureDirectory` and `writeSidecar` receive one same-module detect-and-fail replacement-safety amendment. These are now frozen approved boundaries; any other HIGH/CRITICAL edit returns to planning.

## Core design

### Request and scope authority module

Add `packages/core/src/research/dispatch-authority.ts` and export only through the existing Research subpath.

```ts
export function digestDispatchRequest(dispatch: Dispatch): string;

export interface NormalizedDispatchScopeV1 {
  readonly schemaVersion: 1;
  readonly dispatchId: DispatchId;
  readonly repository: Readonly<{
    id: RepositoryId;
    resolvedRoot: string;
    locator: string;
    expectedRemote?: string;
    observedRemote?: string;
    headRevision?: string;
  }>;
  readonly artifacts: readonly Readonly<{
    id: ArtifactId;
    repositoryId: RepositoryId;
    path: string;
    resolvedPath: string;
    revision?: string;
    sha256?: string;
  }>[];
  readonly allowedWritePaths: readonly Readonly<{
    declaredPath: string;
    resolvedPath: string;
  }>[];
}

export function hashDispatchScope(scope: NormalizedDispatchScopeV1): string;
```

The module validates complete input, performs deterministic machine-path normalization, rejects duplicate artifact IDs, canonicalizes/deduplicates/sorts write pairs, freezes semantic output where exposed, and hashes unchanged `stableResearchJson`. No generic root export or export-map/version change.

### Typed mixed-version mutations

Extend `ResearchMutation` with activation plan, approval grant, and approval revoke variants. Internal drafts become version-aware:

```ts
interface EventDraft {
  schemaVersion: 1 | 2;
  kind: ResearchEvent["kind"];
  aggregate: ResearchEvent["aggregate"];
  related: ResearchEvent["related"];
  payload: Record<string, unknown>;
}
```

`mutationToEventDraft` receives reduced state where needed to derive exact relations. `buildValidatedBatch` passes `draft.schemaVersion` to `parseResearchEvent`; every existing v1 mapping remains explicitly v1. Mixed candidates use the current complete reducer validation. Public commit/validate signatures remain unchanged.

Exact mapping:

```text
activation.plan:
  v2 activation.planned
  aggregate Activation
  related Dispatch, Quest
  payload {activation}

approval.grant:
  v2 approval.granted
  aggregate Approval
  related Activation, Dispatch, Quest
  payload {approval}

approval.revoke:
  v2 approval.revoked
  aggregate Approval
  related Activation, Dispatch
  payload {approvalId, revokedAt, reason}
```

No generic event input, no redundant relation input, no C06 consumption mutation.

## CLI authority/preflight design

Add a dedicated C05 module that composes existing immutable APIs without editing current Context:

```ts
resolveDispatchActivationCandidate(...)
revalidateDispatchActivationBindings(...)
```

The module:

- reads canonical state;
- validates hierarchy in frozen earlier-failure order: Quest exists; Quest is `active`; Run exists and is `planned|running`; existing Dispatch binds matching `run.dispatchId` while a new candidate requires it absent; Run Campaign exists and belongs to Quest; Campaign `runIds` contains Run; optional Dispatch Campaign matches; target Repository exists and appears in `quest.repositoryIds`;
- uses exact Context-compatible relation errors: `Dispatch Quest does not exist`, `Dispatch Quest must be active`, `Dispatch Run must be planned or running`, `Run Dispatch identity does not match`, `Run Campaign does not belong to the Dispatch Quest`, `Run is not registered in its Campaign`, `Dispatch Campaign does not match the Run Campaign`, and `Target Repository is not associated with the Dispatch Quest`; candidate claimed-Run uses `Run '<run-id>' already has a Dispatch`;
- resolves explicit capability;
- calls C04 Procedure/policy authority resolution;
- builds canonical Dispatch request digest;
- resolves Repository/artifacts/write scope without persistence;
- builds normalized scope and hash;
- returns activation inputs plus a deterministic human summary model.

It does not write observations, sidecars, events, or target Repository files. C06 may reuse it later.

### New prepare

`prepareResearchDispatch` captures timestamp once, builds the canonical Dispatch, resolves authority/scope against that candidate, constructs activation, and submits one atomic two-mutation batch. Dry-run validates the complete batch and writes no ledger/projection/request/activation/runtime state.

After successful append, materialize existing request/runtime manifest plus activation sidecar. Failure uses current committed-recovery semantics with same-key retry.

### Historical plan-activation

Strict-read tracked request and require equality with canonical Dispatch. Build and commit only activation. Never reconstruct missing request here. Recovery for an old prepare materialization uses the old prepare idempotency key first.

## Approval lifecycle design

### Automatic authorization

Recompute all bindings and require equality with activation. Evaluate C04 automatic result and map ordered reasons into stable C05 command codes. Create grant with exact automatic label/rationale and deterministic expiry. One host-specific active unexpired grant maximum; different hosts may coexist.

### Interactive approval adapter

Use a small injectable `node:readline/promises` adapter for testability without weakening production TTY checks. Production requires all three TTY streams before summary or prompt. The adapter returns raw input excluding only terminal line endings. Label, rationale, and revocation-reason limits count Unicode code points, not UTF-16 code units or UTF-8 bytes.

Summary is deterministic and includes Dispatch/Quest/stage/capability/kind, Procedure identity/digest, policy/request/scope digests, host, repository/network/cost/mutation/chaining limits, duration/count, artifacts, write paths, outputs, and checks.

Prompt sequence:

1. operator label;
2. rationale;
3. exact challenge.

After challenge, close prompt-time TOCTOU by recomputing Procedure, policy, request, and scope and comparing them with both activation and rendered summary. The command timestamp used for the eventual grant is captured after successful revalidation so it reflects grant time; expiry arithmetic uses that same single captured value. No long-lived Research lock spans human input.

### Revocation

Resolve approval state and canonical relations. Acquire reason from option or TTY prompt under frozen mode rules. Capture one timestamp, validate transition, and submit one typed revoke mutation. Expiry does not itself transition state, so pre- or post-expiry revocation remains legal while canonical status is `granted`.

## Timestamp model

- Prepare/plan/authorize/revoke capture one command timestamp immediately before building their candidate event batch, after read-only preflight.
- Approve renders and prompts first, revalidates after challenge, then captures one grant timestamp.
- Every event in one batch shares that timestamp.
- Expiry is exact integer millisecond addition and canonical RFC3339 formatting.
- Replacement same-host grant time must be at or after prior expiry.

## Idempotency before lifecycle validation

Each command classifies canonical events for its supplied idempotency key at these boundaries:

1. initial lookup, before lifecycle validation;
2. unconditionally for `events` returned by every `validateResearchBatch` call, because validation has no replay marker and another process may win the key before locked dry-run validation;
3. for every `commitResearchBatch` result with `replayed:true`; classifying every commit result is also acceptable.

At each boundary:

- expected family + target + exact batch shape -> valid candidate or canonical replay;
- other family, target, or batch shape -> `IDEMPOTENCY_KEY_CONFLICT`;
- no initial match -> normal lifecycle validation.

For dry-run, matching returned events are identified as replay only after rereading canonical ledger and checking exact returned event-ID membership. New candidate validation remains dry-run with no append or sidecar. No success rendering or materialization occurs before returned-event classification. Public core signatures remain unchanged.

C05-era prepare replay requires exactly the expected two-event Dispatch-plus-activation batch. A matching historical key containing exactly one legacy `dispatch.recorded` event is instead a successful discriminated legacy replay: append nothing, set `replayed:true` and `legacyPrepare:true`, repair only request plus legacy runtime manifest, and return `activation:null`/`activationFile:null`. It never creates or materializes activation. `plan-activation` with a new key performs the bridge. Interactive approval replay still requires TTY + canonical challenge, but canonical grant metadata remains immutable.

## Materialization design

Add a C05-specific module instead of editing shared Dispatch helpers.

```text
activation.json = stableResearchJson({schemaVersion:2, activation})
approvals/<apr-id>.json = stableResearchJson({schemaVersion:2, approval})
```

`stableResearchJson` already supplies exactly one final LF; append no additional newline. Event commit is authority. Sidecar write failure returns committed recovery. Replay can reconstruct only:

- C05 prepare: request, activation, runtime manifest;
- legacy one-event prepare: request and legacy runtime manifest only;
- plan: activation;
- grant: activation + target approval;
- revoke: activation + updated target approval.

C05 never repairs from Context and never rewrites unrelated approvals.

### Identity-bound directory selection

`secureDirectory` returns a private selection instead of a bare pathname:

```ts
interface DirectorySelection {
  rootPath: string;
  canonicalRoot: string;
  directoryPath: string;
  canonicalDirectory: string;
  snapshots: readonly DirectorySnapshot[];
}
```

Validate every segment and filename as one component: non-empty, not `.` or `..`, no slash, backslash, or NUL. Resolve caller root as C04 does, then create/check descendants one component at a time. Descendants must be non-symlink directories. Capture bigint `dev`, `ino`, `mode`, and realpath for root plus every descendant; require canonical containment under captured root. Directory identity checks deliberately ignore size/mtime/ctime so unrelated sibling activity does not cause false drift. Revalidation rejects type, identity, realpath, or containment changes.

Existing targets must be regular non-symlink files at the selected canonical location. Snapshot `dev`, `ino`, `mode`, size, mtime, and ctime; target checks remain strict because replacement or content drift matters.

### Descriptor-bound staging and publication

Compute stable bytes once. Create a unique empty same-directory stage named with PID plus `randomUUID()`, using `O_CREAT | O_EXCL | O_WRONLY`, optional platform `O_NOFOLLOW`, and mode `0o600`. Before first byte:

1. `fstat` descriptor and require regular file;
2. revalidate complete directory selection;
3. `lstat` stage pathname and require same node as descriptor;
4. require stage realpath under captured canonical directory.

Write through descriptor with a short-write loop, file-`fsync`, exact-size and identity checks. Revalidate complete chain and stage pathname after content write. Keep descriptor open through publication where platform permits; if Windows requires closure, close only after all checks and immediately revalidate stage identity before publication.

Immediately before publication, revalidate complete chain and target snapshot. For initially absent target use exclusive `linkSync(stage, target)`; `EEXIST` preserves concurrent winner and succeeds only when stable exact bytes plus unchanged chain prove an equivalent winner. For initially present unchanged target use atomic `renameSync(stage, target)`. Portable Node lacks conditional inode compare-and-swap for replacement, so existing-target publication remains detect-and-fail rather than absolute CAS.

After publication, revalidate complete chain, target regular-file type, canonical location, staged-node identity, exact size, and stable exact bytes. Failure returns committed recovery; never roll back or overwrite a later replacement.

Cleanup revalidates chain and unlinks the stage only when its pathname still identifies the expected regular non-symlink staged node. `ENOENT` is success. Drift/type/identity mismatch leaves pathname untouched, preserving unrelated replacements.

### Safety limit

This is strongest practical pure-Node detect-and-fail behavior. It removes current validated-parent-then-path-write gap and detects deterministic injected replacements, but cannot mathematically exclude every hostile same-user nanosecond interleaving, ABA replacement, hard-link alias, stage inode move, or final-check gap. Absolute directory-FD-relative race freedom needs native/platform-specific `openat`/`renameat`-style support outside C05. Specs and errors must not claim stronger guarantees.

Command result shapes are state-oriented:

```ts
type PlanResearchActivationResult =
  | (ResearchMutationResult & {
      legacyPrepare?: false;
      activation: ResearchActivation;
      activationFile: string | null;
    })
  | (ResearchMutationResult & {
      replayed: true;
      legacyPrepare: true;
      activation: null;
      activationFile: null;
    });

interface GrantResearchApprovalResult extends ResearchMutationResult {
  approval: ResearchApprovalState;
  approvalFile: string | null;
}

interface RevokeResearchApprovalResult extends ResearchMutationResult {
  approval: ResearchApprovalState;
  approvalFile: string | null;
}
```

Dry-run materialization paths are `null`. Only legacy prepare replay returns `activation:null`.

## Error model

Add a typed C05 error class/unions in new modules. `renderResearchError` recognizes any object with a valid stable C03/C04/C05 code and renders `{error:{code,message}}`; committed errors keep their richer current envelope. Programmer errors remain generic and are not mislabeled.

## Command registration

Dispatch child order:

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

`prepare --capability` is parsed as optional by Commander but required inside callback to preserve `UNKNOWN_CAPABILITY`. `approve` deliberately has no JSON/dry-run/yes/force options. Revocation reason prompt is disabled for JSON, dry-run, or non-TTY modes. This order deliberately preserves Context's current first position; C05 updates `commands-research.md` to the same order without editing Context implementation.

## Compatibility

- Dispatch schema and historical fixtures remain byte-compatible.
- `ownerSkill`, `provider`, and `taskRef` remain exact non-routing metadata.
- Existing v1 readers reject ledgers after first v2 event; this is the frozen forward-only rollout boundary.
- No projection schema change.
- No Context or Result/Proposal change.
- No worker, hook, Skill, payload, cleanup, package manifest/version, docs-site, or marketplace change.

## Expected file scope

Core production:

```text
packages/core/src/research/store.ts
packages/core/src/research/index.ts
packages/core/src/research/dispatch-authority.ts
```

CLI production:

```text
packages/cli/src/commands/research/dispatch-command.ts
packages/cli/src/commands/research/index.ts
packages/cli/src/commands/research/common.ts
packages/cli/src/commands/research/errors.ts
packages/cli/src/commands/research/mutation.ts
packages/cli/src/commands/research/dispatch-authority.ts
packages/cli/src/commands/research/dispatch-activation-command.ts
packages/cli/src/commands/research/dispatch-activation-materialization.ts
```

Current `dispatch-context.ts` remains untouched.

Tests and specs follow `research/impact-scope-and-tests.md`. No packed inventory change is expected.

## Rollout and rollback

Before each approved CRITICAL edit, explicitly warn and rerun exact upstream impact for `buildValidatedBatch`, `validateHierarchy`, `secureDirectory`, and `writeSidecar`. Before activation, require C02-C04 baseline suites. Before closeout, require mixed-batch, v1 compatibility, full hierarchy parity/zero-write failures, deterministic parent/target/stage replacement interleavings, prepare atomicity, replay/recovery, TTY/challenge, drift, and full successor-surface regressions.

Before first v2 event reaches an external workspace, old runtime rollback is possible. After first v2 line, rollback is forward-fix only: never delete/rewrite/truncate/down-convert ledger data. Recover projections with compatible rebuild and sidecars with same-key retry.

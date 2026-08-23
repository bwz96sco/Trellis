# `trellis research` Command

## 1. Scope / Trigger

`trellis research` is the CLI boundary for deterministic research lifecycle state owned by `@mindfoldhq/trellis-core/research`. The CLI parses arguments, resolves the explicit control-plane root, builds typed mutations, and renders results. Core remains the only owner of ledger parsing, reduction, append, idempotency, lifecycle validation, locking, and projection writes.

CLI code must never read or write `.trellis/research/events.jsonl` directly and must import research behavior only through the public `@mindfoldhq/trellis-core/research` subpath.

### Procedure/policy and frozen successor scope

C04 adds strict host-neutral Procedure/project-policy resolution and conservative policy creation during explicit Research initialization. C05 adds capability-bound prepare, activation planning, automatic authorization, interactive approval, revocation, and recoverable activation/approval sidecars. C06 later adds approval-gated zero-write Context and atomic approval consumption.

## 2. Signatures

```text
trellis research init|status|validate|rebuild
trellis research repo add|bind|list|resolve
trellis research quest create [--repository <rep-id>...]|status|stage
trellis research campaign create|protocol|freeze|status
trellis research run create|status|invalidate
trellis research evidence create|status
trellis research claim create|status
trellis research dispatch context|prepare|plan-activation|authorize|approve|revoke|record-result|apply|reject
```

Worker execution, hooks, Task lifecycle and linking, workflow selection, and
Mempal are outside this command family. Best-effort Run session pointers are
CLI integration behavior, not canonical research state. The exact active
Research groups are `init`, `status`, `validate`, `rebuild`, `repo`, `quest`,
`campaign`, `run`, `evidence`, `claim`, and `dispatch`; the exact Dispatch
children are exactly `context`, `prepare`, `plan-activation`, `authorize`, `approve`, `revoke`, `record-result`, `apply`, and `reject`, in that observable order.

### C05 Dispatch lifecycle signatures

`prepare` requires an explicit `--capability <id>` at callback validation. `plan-activation <dispatch-id> --capability <id>` bridges a historical v1 Dispatch. `authorize <dispatch-id> --host <claude|codex>` performs policy-bounded automatic authorization. `approve <dispatch-id> --host <claude|codex>` is interactive-only and registers no JSON, dry-run, yes, or force option. `revoke <approval-id> [--reason <text>]` permits a TTY reason prompt only in human non-dry-run mode. Current Context and `record-result` signatures remain unchanged until C06.

## 3. Contracts

### Root Contract

- `--root <path>` resolves from the exact current working directory and has priority.
- Without `--root`, use the exact current working directory.
- The selected root must contain a `.trellis` directory.
- Never search ancestors or child repositories automatically.
- Absolute machine paths are passed to core for filesystem access but never stored in research event payloads.

### Mutation Contract

All non-interactive event-producing commands support `--idempotency-key`, `--dry-run`, and `--json`. Interactive `dispatch approve` supports only `--host`, `--root`, and `--idempotency-key` and requires all three standard streams to be TTYs.

- Actor defaults to `{ type: "agent", id: "trellis-cli" }`.
- Provenance source is `trellis research <subcommand>`.
- Omitted keys are generated as unique CLI keys. Cross-process retries must provide an explicit key.
- `init` defaults to `research:init`, creates one workspace, returns a no-op for matching state, and rejects conflicting arguments.
- Fresh or matching non-dry-run Research init ensures `.trellis/research/policy.json` exists and is valid before ledger mutation/replay return. It creates only an absent file with exact conservative bytes and preserves every valid existing byte.
- Conflicting Research init returns before policy repair. Dry-run validates prospective conservative policy in memory but creates no policy directory/file.
- Dry-run uses `validateResearchBatch`; it must not leave policy, ledger, projection, or runtime files changed.
- Idempotent replay is successful only when the canonical events match the command family, target, and exact batch shape; otherwise return `IDEMPOTENCY_KEY_CONFLICT`.
- C05 classifies an explicit key before lifecycle validation, every validation result, and every commit result. Dry-run rereads the ledger and treats returned events as replay only when every returned event ID is canonical.
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

### Host-neutral Procedure and policy resolution contract

C04 package-internal resolution prepares authority inputs for C05/C06 without
changing current Dispatch Context, workers, hooks, or Skill routing.

- Resolve an exact capability through the immutable core registry before any
  Procedure or policy filesystem access.
- Resolve `.trellis/research/procedures/<procedure-id>/<version>/` first, then the
  package-internal bundled pair only when the exact project candidate is genuinely
  absent. Present-invalid project content is authoritative failure and never falls
  back.
- Read only `procedure.json` and `PROCEDURE.md`; unnamed siblings are ignored
  without enumeration. Map selected project failures to
  `INVALID_PROJECT_PROCEDURE` and bundled failures to
  `INVALID_BUNDLED_PROCEDURE`.
- Ordinary authority resolution requires strict existing
  `.trellis/research/policy.json`; it never substitutes conservative defaults.
- Merge validated registry, Procedure, policy defaults, and capability override,
  then evaluate automatic eligibility. Results are computation only: no grant,
  approval, event, Context decision, or runtime/tracked write.
- C04 APIs are package-internal on CLI side and import core behavior only from
  `@mindfoldhq/trellis-core/research`.

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
- During the C03 transition, this frozen stage/host/Skill selection exists only in
  the package-private `commands/research/legacy-skill-routing.ts` bridge. The
  bridge is not a core or CLI package export, is not persisted, does not call the
  immutable capability registry, and is not canonical authority. C06 removes it
  from production Context with `--skill-name`; C07 removes residual worker/hook
  characterization imports and deletes the bridge module.
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

- New `dispatch prepare --capability <id>` validates hierarchy, explicit
  stage-matched capability, project-first Procedure, strict policy, effective
  authority, Repository/artifacts/write scope, request digest, and normalized
  scope hash without observation persistence or target Repository writes. It
  commits exactly unchanged v1 `dispatch.recorded` then v2 `activation.planned`
  in one batch with one timestamp/key.
- A historical one-event prepare replay appends nothing, returns
  `legacyPrepare:true` with null activation fields, and repairs only request plus
  legacy runtime manifest. It never silently upgrades the Dispatch; a new-key
  `plan-activation` strict-reads the tracked request, requires canonical equality,
  and commits exactly one activation without rewriting Dispatch/request bytes.
- `authorize` revalidates Procedure, policy, request, and scope bindings, requires
  automatic eligibility, enforces one unexpired grant per activation/host, permits
  different hosts, and uses exact automatic label `trellis-policy-v1` and rationale
  `Eligible under immutable registry and project policy.` Expiry equality permits
  same-host replacement.
- `approve` requires stdin/stdout/stderr TTYs, renders deterministic authority,
  prompts for operator label then rationale, and requires exact challenge
  `APPROVE <dispatch-id> <host> <first-12-request-digest-hex>`. It revalidates all
  bindings after the challenge before capturing grant time. Same-key replay still
  requires TTY and challenge and never replaces canonical grant metadata.
- Approval labels are 1–128 Unicode code points; rationale and revocation reason
  are 1–1,024 Unicode code points. `revoke` permits pre- or post-expiry revocation
  while canonical status remains `granted`; JSON, dry-run, and non-TTY calls must
  supply `--reason`.
- After ledger commit, C05 writes canonical sidecars with `stableResearchJson`
  and no extra LF:
  `.trellis/research/dispatches/<dsp-id>/activation.json` and
  `approvals/<apr-id>.json`. Sidecars are recoverable projections, never authority;
  component grammar, bigint identity snapshots, descriptor-bound staging, full-chain
  revalidation, short-write handling, file `fsync`, and post-publication identity/byte
  checks detect replacement and containment drift as committed recovery errors. An
  absent target uses exclusive hard-link publication; an unchanged present target
  uses atomic rename replacement. Windows closes the staging descriptor only after
  all write checks and immediately revalidates before publication. This is practical
  pure-Node detect-and-fail behavior, not mathematical directory-FD-relative or
  conditional-CAS safety: nanosecond, ABA, hard-link-alias, and final-check gaps need
  native `openat`/`renameat`-style support outside C05. Grant/revoke recovery repairs
  activation plus only the target approval.
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
- Tracked request/activation/approval/result/proposal/decision files use stable
  JSON, one trailing newline, and atomic writes. Activation and approval events
  contain only digests/hashes and portable IDs; absolute normalized scope paths
  are preflight inputs only. Existing request/result/proposal/decision portability
  remains unchanged.
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

### C05 closure and C06 deferrals

- C05 implements atomic prepare activation, historical activation bridging,
  automatic authorization, exact TTY approval, revocation, sidecars, drift checks,
  and race-safe replay classification.
- Production Context remains the current zero-write Skill-compatible command. C05
  does not require or consume approval and does not repair sidecars from Context.
- Current Result recording remains exactly v1 Result plus v1 Proposal and accepts
  no approval ID. C05 adds no `approval.consumed` mutation or event emitter.
- C06 later requires a matching unexpired host approval in Context and atomically
  appends Result, Proposal, then consumption without changing worker JSON.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Selected root lacks `.trellis` | Fail; never search ancestors or child repositories |
| Research init is fresh or matching and policy is absent | Non-dry-run creates exact conservative policy before ledger work; dry-run writes nothing |
| Research init conflicts with canonical workspace | Fail before policy creation or repair |
| Existing policy is valid but custom-formatted | Preserve exact bytes and use strict semantic parse |
| Existing policy is malformed, widening, symlinked, non-regular, or escaping | Fail without overwrite; classify widening separately |
| Project Procedure is present but invalid or partial | Return `INVALID_PROJECT_PROCEDURE`; do not fall back to bundle |
| Capability ID is unknown | Throw core `UNKNOWN_CAPABILITY` before root/Procedure/policy filesystem access |
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

C05 matrix additions:

| Condition | Required behavior |
| --- | --- |
| Prepare/plan capability is absent, unknown, or stage-mismatched | Return the stable capability error before commit |
| Activation already exists or Result/Proposal makes planning late | Return `DUPLICATE_ACTIVATION` or `ACTIVATION_TOO_LATE`; append nothing |
| Tracked request is absent/non-regular versus malformed/mismatched | Return `REQUEST_NOT_FOUND` versus `REQUEST_STATE_MISMATCH` |
| Procedure, policy, request digest, or normalized scope drifts | Return the matching stable mismatch code before grant |
| Automatic eligibility fails | Return explicit/interactivity, limit, or forbidden-authority code; create no approval |
| Same host has a still-granted approval and current time is before expiry | Return `DUPLICATE_ACTIVE_APPROVAL`; equality is eligible for replacement |
| `approve` lacks any TTY or receives forbidden automation flags | Reject before callback/prompt mutation |
| Label/rationale/reason is blank or exceeds its Unicode code-point bound | Return `INVALID_APPROVAL_INPUT` |
| Challenge differs by any byte | Return `APPROVAL_CHALLENGE_MISMATCH`; append nothing |
| Revocation target is absent or terminal | Return `APPROVAL_NOT_FOUND` or `INVALID_APPROVAL_TRANSITION` |
| Explicit idempotency key belongs to another family, target, or exact shape | Return `IDEMPOTENCY_KEY_CONFLICT` before success/materialization |
| Sidecar parent/target is symlinked, replaced, or escaping after commit | Report committed recovery; never write outside `.trellis/research` |
| C05 Context or record-result is asked to gate/consume approval | Unsupported until C06; preserve current behavior |

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

### Procedure/policy cases

- **Good**: fresh explicit Research init creates exact conservative policy, then initializes canonical state; later matching init preserves custom valid policy bytes.
- **Base**: absent project override resolves the package-internal bundled pair; strict policy keeps automatic execution disabled and produces deterministic reasons only.
- **Bad**: repair policy during a conflicting init, fall back around a malformed project override, or treat computed eligibility as authorization.

### C05 activation and approval cases

- **Good**: new prepare appends `[v1 dispatch.recorded, v2 activation.planned]`; bounded automatic authorization and exact TTY approval create host-bound grants; same-key replay reconstructs activation and only the target approval sidecar.
- **Base**: an untouched v1 Dispatch gains one compatibility activation without changing its Dispatch event or request metadata; conservative policy returns `EXPLICIT_APPROVAL_REQUIRED` without a grant.
- **Bad**: route from `ownerSkill`, accept `approve --yes`, grant after Procedure/policy/request/scope drift, reuse a key for another family/target/shape, escape sidecar containment, repair sidecars in Context, or emit consumption in C05.

## 6. Tests Required

```bash
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research.test.ts \
  test/commands/research.integration.test.ts \
  test/commands/research-procedure-resolution.integration.test.ts \
  test/commands/research-policy-init.integration.test.ts \
  test/commands/research-dispatch.integration.test.ts \
  test/commands/research-dispatch-activation.integration.test.ts \
  test/commands/research-dispatch-context.integration.test.ts \
  test/commands/research-workflow.integration.test.ts \
  test/templates/codex.test.ts \
  test/templates/research-hooks.test.ts \
  test/commands/init-research-only.integration.test.ts \
  test/commands/update.integration.test.ts
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
metadata, and the private bridge's exact frozen table, normalization, optional/
fallback selection, discovery determinism, and complete behavior. Coverage also
includes descriptive `expectedOutputs`, exact Claude envelope/process argv,
two-pass direct metadata discovery, denial anomalies, exact injected JSON,
selected-skill behavior, and full-tree zero-write.

The consolidated workflow suite must additionally prove Research initialization, root plus three independent Git repositories, Quest repository association, Dispatch review, durable lifecycle projections, byte-stable rebuild, malformed-ledger fail-closed behavior, historical native digest recognition without active native/custom resolution, legacy source byte preservation, ignored runtime state, and absence of POSIX/Windows/UNC/fixture-local absolute paths in tracked research records. Parser tests must prove the exact Research and Dispatch child sets and byte-identical zero-write rejection of `research task`, `task link`, and `task unlink`. The suite exercises request/result/proposal/decision contracts but does not pretend to execute a real Claude worker.

C04 coverage additionally requires all 14 bundled Procedure pairs and seven-section instructions, project-first/fail-closed resolution, strict policy creation/read/preservation, dry-run/conflict zero-write behavior, no-replace winner handling, exact core import boundary, and unchanged root-init/update/uninstall Research preservation.

C05 tests additionally require exact nine-child parser order and approve option inventory; mixed prepare/bridge atomicity and historical replay discrimination; automatic eligibility, dual-host coexistence, expiry equality, TTY combinations, summary/challenge order, Unicode boundaries, canonical replay metadata, grant/revoke drift and transition failures; exact family/target/shape idempotency conflicts including dry-run races; activation/approval sidecar envelopes, same-key recovery, and symlink/containment rejection. Current Context zero-write and current two-v1-event Result/Proposal behavior remain regression requirements; three-event consumption belongs to C06.

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

### Correct during C03: isolate frozen routing in the private transition bridge

```ts
import { resolveResearchStageCapability } from "./legacy-skill-routing.js";

const selectedSkill = resolveResearchStageCapability({
  stage: quest.stage,
  host,
  discoveredSkillNames,
}).selectedSkill;
```

This is temporary active compatibility behavior, not the public core capability
API. C06 removes this production use instead of teaching the successor registry
about hosts or Skills.

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

### Wrong: repair policy before checking Research-init conflict

```ts
await ensureResearchProjectPolicyForInit({ root, dryRun });
if (existingWorkspaceConflicts) throw conflict;
```

### Correct: preserve conflict zero-write behavior

```ts
if (existingWorkspaceConflicts) throw conflict;
await ensureResearchProjectPolicyForInit({ root, dryRun });
```

Fresh and matching initialization may ensure policy; conflicting initialization may not.

### C05: sidecars are not approval authority

```text
Wrong: automate interactive approval, trust activation/approval sidecars as canonical, or add consumption to record-result.
Correct: require the exact TTY challenge, commit typed grant/revoke events first, then materialize recoverable contained sidecars with the same key.
```

### Wrong: retry a committed Decision with a new key after `decision.json` fails

```ts
await applyResearchProposal({ ...options, idempotencyKey: "new-key" });
```

### Correct: retry with the original key and reconstruct the file from canonical events

```ts
await applyResearchProposal({ ...options, idempotencyKey: originalKey });
```

## Scenario: Research Procedure dispatch cutover

### 1. Scope / Trigger

This scenario applies to the C06+C07 public cutover from request-file and Skill routing to approval-gated Dispatch-ID Context and generic embedded-Procedure workers, including Task #63 root-side authority/read-only remediation. It supersedes predecessor Context and record-result signatures in this file. C07 removes active execution references; C08 owns installed Skill retirement; C09 owns source/packed Skill removal. Remediation does not change worker, hook, workflow, or template bytes.

### 2. Signatures

```text
trellis research dispatch context <dsp-id> --host <claude|codex> [--root <root>] [--json]
trellis research dispatch record-result <dsp-id> --approval <apr-id> --input <path|-> [--root <root>] [--json]
```

There is no public `--skill-name`, request-file positional input, `record-result --file`, compatibility alias, or injectable clock. A Context domain failure rendered with `--json` has this exact envelope and key set:

```json
{"schemaVersion":1,"command":"research dispatch context","valid":false,"error":{"code":"<code>","message":"<message>"},"safeAction":"report-to-root-no-write"}
```

### 3. Contracts

- Context strict-parses one Dispatch ID and exact host, delegates to the approval-gated resolver, and writes nothing.
- Context uses one captured canonical `ResearchState`. Request materialization mismatch precedes binding drift. Staged binding precedence is request digest -> Procedure resolution/digest -> project policy read/digest -> effective authority/automatic eligibility -> foreign-Repository artifact rejection -> one cache-free target Repository observation -> normalized scope/scope hash -> remote verification -> deferred artifact revision/SHA-256 verification -> broad activation-authority relation. Approval selection, activation/approval materialization checks, and output-ID availability follow.
- The one target observation performs no observation-cache read/write and no `git status`; its path, Git root, HEAD, and remote are reused for Repository scope, allowed write paths, and artifacts. `multipleRepositories: false` forbids alternate Repository access.
- Successful Context returns canonical Dispatch, Activation, matching unexpired host Approval, immutable Capability, embedded Procedure, resolved Repository/scope, complete false authority ceiling, and Approval-derived Result/Proposal IDs.
- Public Context converts only internal `ResearchActivationError` failures to `ResearchDispatchContextError`. JSON rendering emits only the exact failure envelope above: no ledger head, warnings, Context, Activation, Approval, Procedure, Repository, or output identity fragment.
- Commander captures one absolute `process.cwd()` for root and input resolution. `--input -` is read lazily; a path must resolve to a contained regular file below the selected control root.
- Recording strict-reads canonical ledger first and classifies exact same-key replay before current clock validation, Approval eligibility revalidation, output collision checks, path open, or stdin invocation. Replay may succeed with an invalid/expired current clock and unavailable original input.
- New execution accepts exactly one JSON object with top-level keys `result`, then `proposal`. Supplied output IDs and Dispatch/Run/Quest relations must match Context.
- Dry-run validation is snapshot-only through `validateResearchBatchReadOnly`: no Research lock, runtime/projection/cache write, or head reservation. Non-dry-run commit remains lockful through `commitResearchBatch` and revalidates authoritative state under that path.
- Successful recording commits exactly schema-v1 `result.recorded`, schema-v1 `proposal.recorded`, then schema-v2 `approval.consumed`. Result, Proposal, and consumed-Approval sidecars use hardened publication. Canonical ledger plus same-key replay repairs missing sidecars without worker/input rerun or replacement append.
- Applying or rejecting pending Proposal remains separate root-owned command.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Unknown/case-varied host or malformed Dispatch/Approval ID | Commander/domain rejection before callback mutation. |
| Request path positional, `--skill-name`, or `--file` | Parse failure; complete filesystem remains byte-identical. |
| Context domain failure | Exact schema-v1 failure envelope on stderr; no success-field fragment and no write. |
| Request sidecar plus binding/artifact drift | `REQUEST_STATE_MISMATCH` wins. |
| Request, Procedure, policy, or scope binding drift plus later artifact drift | First staged binding error wins; artifact bytes are not checked early. |
| Invalid observation cache or foreign-Repository artifact | Ignore cache; foreign Repository fails before alternate access; full tree unchanged. |
| Missing, expired, revoked, wrong-host, consumed, or drifted Approval | Bounded Context/recording failure; no partial Context or event. |
| Input path escapes control root, is a symlink escape, or is non-regular | Reject before input acceptance or ledger mutation. |
| Worker output has extra top-level keys, wrong IDs, relations, status, or schema | Reject complete batch. |
| Same successful key with invalid clock or unavailable input | Replay canonical events first; repair Result, Proposal, and Approval sidecars; append nothing. |
| New key with invalid/expired clock | Reject before path/stdin access or append. |
| Sidecar parent/target/staging identity changes | Report committed recovery after append; never trust or overwrite an unsafe winner. |
| New key after consumption | Reject duplicate recording. |

### 5. Good / Base / Bad Cases

- **Good**: root retains Approval/output IDs, launches `Research dispatch: <dsp-id>`, receives unchanged normalized Context, validates returned pair, then records with `--approval --input`.
- **Base**: blocked work returns blocked Result plus empty pending Proposal with supplied IDs; root records it, then reviews Proposal separately.
- **Base**: exact replay runs after expiry with missing original input, restores hardened sidecars from canonical events, and does not append.
- **Bad**: let artifact drift mask Procedure/policy drift, consult observation cache, acquire lock during dry-run, validate clock before replay, rerun worker for recovery, or treat sequential sidecar publication as transactional storage.

### 6. Tests Required

- Exact command tree, argument, and option inventories.
- Built `trellis` and `tl` positive Context cases for both hosts and positive path/stdin recording cases.
- Built-parser zero-write failures for request-path Context, `--skill-name`, and `--file`.
- Exact Context failure object/key order and absence of every success/authority fragment.
- Full-tree Context success/failure snapshots; staged precedence; one state/one cache-free Repository observation; no alternate Repository access.
- Snapshot-only dry-run tests proving no lock/runtime/projection/cache creation; separate lockful commit tests.
- Replay-before-clock/input tests with invalid clock and throwing stdin; exact `[1, 1, 2]` event schemas/order; duplicate rejection.
- Hardened Result/Proposal/Approval sidecar publication, unsafe-target failure, equivalent-winner handling, committed failure reporting, and same-key repair.
- Real packed active-content audit over unchanged command, worker, hook, and workflow bytes extracted from `.tgz`.

### 7. Wrong vs Correct

```text
Wrong: validate artifact bytes before request, Procedure, policy, and scope bindings.
Correct: preserve staged binding precedence, then verify artifact revision/SHA-256 after scope hash.

Wrong: validate current clock or open --input before exact replay classification.
Correct: read canonical ledger and replay first; validate clock/input only for new execution.

Wrong: dry-run acquires the Research lock, or recovery reruns worker and appends replacement events.
Correct: dry-run validates one snapshot without writes; commit stays lockful; canonical replay repairs hardened sidecars.
```

## Scenario: Evaluation contract v1.3.1 recording and recovery

### 1. Scope / Trigger

This scenario applies when canonical activation state records Procedure `2.0.7` with accepted contract version `evaluation-contract-v1.3.1` and semantic digest `sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af`. It extends the Procedure-dispatch cutover without changing its public Context or `record-result` signatures.

### 2. Contracts

- Production authenticates the package-owned seven-member v1.3.1 bundle and ordered member ledger. It never reads `.trellis/tasks`, `.git`, mutable candidate files, or environment-selected authority.
- Procedure resolution remains project-first and fail-closed. Only exact `mode: "activation-recorded"` identity `2.0.7` uses the accepted v1.3.1 parser. Live capability selection remains `1.0.0`; `2.0.7` is dormant for ordinary current selection. Historical `2.0.4`-`2.0.6` v1.3.0 behavior remains on its separate parser/report branch.
- Accepted closure families, in contract order, are `research-literature`, `research-ideation`, `research-idea-evaluation`, and `research-experiment`. `research-quest` and `research-computation` are not closure families and must not gain inferred closure authority.
- Root methodology validation runs before canonical writes. For idea generation it selects exactly 29 applicable bindings and produces exactly one invocation for each binding, including failed invocations.
- Runtime observations are built independently from authenticated Repository/ArtifactRef, closure, Procedure, and package state; accepted authority values are not copied into observed facts. Closed blocked-fact reasons are `missing`, `unknown`, `unauthenticated`, `ambiguous`, `aliased`, and `contradictory`.
- Dry-run validates the read-only successor snapshot and never publishes `methodology-report-v2.json`. A successful non-dry-run appends schema-v1 `result.recorded`, schema-v1 `proposal.recorded`, then schema-v2 `approval.consumed` atomically before materialization.
- The v1.3.1 report-v2 body is closed and excludes `reportDigest`. Its digest is computed over framed canonical body bytes without a trailing LF; the sidecar contains canonical report JSON plus one final LF. Historical v1.3.0 reports retain their embedded digest and byte behavior.
- Report publication and same-key recovery use the existing hardened sidecar publisher. Exact replay is classified before current-clock validation, path access, stdin invocation, or worker rerun; recovery appends no replacement event.

### 3. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Installed member order, length, hash, aggregate, or semantic digest drifts | Fail closed before methodology execution or canonical write. |
| Project Procedure `2.0.7` is present but invalid | Fail selected project resolution; do not fall back to bundled content. |
| Ordinary live selection is requested | Resolve live `1.0.0`; do not select dormant `2.0.7`. |
| An applicable fact is absent, incomplete, unauthenticated, multiply claimed, aliased, or disagrees with authority | Execute every applicable binding, emit deterministic findings and the matching closed reason, append nothing, and publish no report. |
| Closure evidence attempts Result-status inference or lacks its non-closure ArtifactRef binding | Reject as contradictory/incomplete before append. |
| External report digest or closed report schema drifts | Reject publication as a committed-recovery error after commit, or as zero-write validation failure before commit where applicable. |
| Exact successful key is replayed with unavailable input or invalid current clock | Reconstruct canonical v1.3.1 report and repair sidecars without input/clock/worker access or append. |

### 4. Tests Required

Focused v1.3.1 coverage is serial after a fresh Core build and includes:

- `test/commands/research-accepted-bundle-authentication.test.ts`
- `test/commands/research-procedure-resolution.integration.test.ts`
- `test/commands/research-methodology-validation.test.ts`
- `test/commands/research-v131-cli-runtime.test.ts`
- `test/commands/research-dispatch-approved-result.test.ts`
- `test/commands/research-report-v2-publication.test.ts`
- `test/commands/research-dispatch-materialization-reader.test.ts`

Coverage must prove exact package authentication, activation-recorded-only routing, corrected closure-family membership, all six blocked-fact reasons, 29-for-29 invocation execution, snapshot-only dry-run, `[1, 1, 2]` atomic event order, external report digest, hardened publication, and replay-before-clock/input recovery.

### 5. Wrong vs Correct

```text
Wrong: select Procedure 2.0.7 live, copy accepted authority into observed facts, or infer closure from Result.status.
Correct: resolve 2.0.7 only from exact activation identity and independently authenticate every applicable observation.

Wrong: embed the v1.3.1 digest in the report body or rerun the worker to recover its sidecar.
Correct: keep the digest external and reconstruct the recoverable projection from canonical same-key events.
```

## Scenario: Thin-skill inspection, workflow routing, gates, and Quest cutover

### 1. Scope / Trigger

This CLI contract applies to schema-v3 thin-skill inspection and deterministic Research routing. C3 implements Skill inspection/Context plus Workflow bind/complete/transition/close/status/next; later children implement scientific gates and Quest cutover. Commands never contain scientific methodology or execute a model implicitly.

### 2. Signatures

```text
trellis research skill list [--json]
trellis research skill show --skill <id> [--version <version>] [--json]
trellis research skill context --skill <id> --profile <lightweight|managed> \
  [--member <path>...] [--quest <id>] [--json]

trellis research workflow bind --quest <id> --workflow <id> --version <version> \
  --start-node <node> [--dry-run] [--write] [--json]
trellis research workflow complete --instance <id> --node <id> \
  --accepted-ref <ref>... [--dry-run] [--write] [--json]
trellis research workflow transition --instance <id> --transition <id> \
  [--dry-run] [--write] [--json]
trellis research workflow close --instance <id> --outcome <completed|blocked|cancelled|superseded> \
  --rationale <text> [--dry-run] [--write] [--json]
trellis research workflow status --quest <id> [--json]
trellis research workflow next --quest <id> [--json]

trellis research gate record --instance <id> --gate <H1|H2> \
  --decision <approve|reject> --actor <label> --rationale <text> \
  [--approved-ref <scientific-ref>...] [--rejected-ref <scientific-ref>...] \
  --evidence-ref <artifact:art-id>... [--source-artifact <artifact:art-id>] \
  [--idempotency-key <key>] [--dry-run] [--write] [--json]
trellis research gate status --instance <id> [--json]

trellis research quest import --source <research-quest.yaml> \
  [--events <research-events.jsonl>] [--preview-token <token>] \
  [--dry-run] [--write] [--json]
trellis research quest export --quest <id> --target <directory> \
  [--dry-run] [--write] [--json]
trellis research quest transfer-writer --quest <id> --to <trellis|source> \
  --rationale <text> --export-digest <sha256> [--dry-run] [--write] [--json]
```

### 3. Contracts

- Skill commands resolve one normalized execution package project-first and fail closed. Discovery authenticates every discovered ID/version candidate; a symlinked, non-directory, malformed, or otherwise invalid project candidate fails the entire read instead of being skipped or replaced by a partial/bundled result. `context` is read-only, loads one `SKILL.md` plus explicitly requested allowed members, and never executes a model.
- `context --profile lightweight` requires `entrypointType: "model-context"` and a declared `lightweight` profile. A package with `invocationSource: "operator-explicit"` additionally requires the package to have been selected by this explicit operator command; it is never eligible for implicit model selection.
- Managed Context selection uses the same normalized identity but still requires existing Dispatch/Activation/Approval commands. `operator-explicit` managed packages require an explicit operator-selected workflow/Activation binding before Context; `skill context` itself does not grant authority. A `root-command` package has no model profile and never enters either model Context.
- Workflow mutations preview by default and require explicit `--write`. Bind/complete/transition/close each append only their typed event. Same-key replay succeeds only when exactly one canonical Workflow event matches the command family, explicit target, and command-specific payload shape; any unrelated, multi-event, or differently shaped ownership returns `IDEMPOTENCY_KEY_CONFLICT` before preview/write success. No command chains to another mutation or model call.
- `status` and `next` read canonical workflow-instance/gate projections. They return exact instance/workflow/node/package identity, legal transitions, missing requirements, satisfying gate-record IDs, allowed profiles, and stop reason; they never infer current node from Quest stage.
- `gate record` derives Quest/workflow/node identity from the exact active instance, accepts explicit inline decision fields, and records H1/H2 only. Actor and rationale must be trim-nonempty while preserving decoded values verbatim. Approved/rejected scientific refs remain separate from canonical evidence Artifact refs. It returns after preview/write and never invokes `workflow transition`.
- C4 checks scientific-ref string integrity/disjointness plus evidence ownership/accepted-ref containment. Candidate-universe membership/coverage waits for C4b; gate recording never parses evidence Artifact bytes.
- Gate same-key replay requires exactly one matching canonical gate event and successful parse plus reduction of the complete canonical ledger. Replay fails closed on semantic or relation corruption. After read-only validation, the command rereads canonical event IDs so a concurrent exact same-key commit is reported as `replayed`, not `preview`.
- `gate status` is read-only and returns ledger-order history plus effective H1/H2 records for the instance's current node.
- Quest import preview returns source digest, exact mapping, conflicts, preserved extensions, and export-loss report. Write requires unchanged source bytes and exact preview token/idempotency binding.
- Quest export writes source-compatible YAML/JSONL and loss report but never transfers writer itself. `transfer-writer --to source` requires validated export digest. `--to trellis` requires successful import record.
- Source admin guard consumes committed writer projection; CLI success text or sidecars cannot grant writer authority.
- User-facing slash wrappers are deferred and are not generated by these commands.

### 4. Validation & Error Matrix

| Input/state | Error / behavior |
|---|---|
| Package manifest/instructions/members invalid | Fail selected project package; no bundled fallback. |
| Skill discovery encounters a symlinked, non-directory, malformed, or invalid project ID/version candidate | Fail the entire read with the source-specific Skill resolution error; return no partial list and do not substitute a bundle. |
| Model implicitly selects an `operator-explicit` package, or any model Context targets a `root-command` | `research_skill_invocation_forbidden`; zero-write. |
| Requested member undeclared, root-only, or escaping | `research_skill_member_forbidden`; zero-write. |
| Workflow is cyclic or embeds methodology/command text | `research_workflow_invalid`; zero-write. |
| Quest already has active workflow instance | `research_workflow_active_conflict`; zero-write. |
| Complete targets wrong node or missing accepted refs | `research_workflow_completion_invalid`; zero-write. |
| Transition is illegal, unselected, or gate-incomplete | `research_workflow_transition_blocked`; zero-write. |
| Workflow idempotency key owns another command family, target, payload shape, or multi-event batch | `IDEMPOTENCY_KEY_CONFLICT`; report no replay success and append nothing. |
| Gate decision is inferred/malformed, actor or rationale is blank, scientific refs are empty/padded/duplicate/overlapping, or evidence ownership/containment is invalid | `research_gate_invalid`; zero-write. |
| Gate idempotency key owns another command family, target, payload shape, or multi-event batch | `IDEMPOTENCY_KEY_CONFLICT`; zero-write. |
| Matching gate event exists but complete canonical ledger parse/reduction or relation validation fails | Fail closed; never report replay success. |
| Concurrent exact same-key commit lands after preview validation | Reread canonical IDs and return `replayed`; append nothing. |
| Gate write succeeds | Return one gate record only; no transition, Approval, Dispatch, Skill, model, worker, or provider launch. |
| Import source changes after preview | `research_quest_source_drift`; zero-write. |
| Quest mapping has blocking conflict | `research_quest_import_conflict` with exact field/path; zero-write. |
| Export target exists without explicit overwrite authority | Refuse before filesystem mutation. |
| Transfer to source lacks validated export digest | `research_quest_transfer_unverified`; keep Trellis writer. |
| Read-only command succeeds | No lock, ledger, runtime, projection, cache, or target-file write. |

### 5. Good / Base / Bad Cases

- **Good**: inspect literature package, build one lightweight Context, complete one workflow node, then separately select a gate-satisfied transition.
- **Base**: list/show/context operate without a Quest and produce no durable state.
- **Bad**: `gate record` launches evaluation, `workflow next` mutates current node, import silently drops unknown fields, or export re-enables source writes.

### 6. Tests Required

- Exact command tree/options and `--json` payload ordering.
- Built CLI read-only snapshots proving list/show/context/status/next produce no writes.
- One-package Context, omitted on-demand members, rejection of implicit selection for explicit-only packages, explicit-only managed evaluation acceptance after operator binding, root-command rejection from model Context, and identical normalized digest across profiles.
- Workflow preview/write/replay tests for bind, complete, transition, close, active conflict, missing gate, no automatic continuation, differently shaped same-command keys, and keys owned by another command family.
- Skill discovery tests prove every candidate is authenticated and a symlinked/non-directory/invalid project candidate fails the complete read without a partial result or bundled substitution.
- Gate preview/write/status/replay tests: actor/rationale validation, scientific-ref integrity/disjointness, evidence ownership/accepted-ref containment, exact same-key matching, full-ledger replay corruption rejection, concurrent exact-key preview classification, latest same-scope decision, H1/H2 transition-record ordering, deterministic gate projection, and explicit assertion that no Approval, Workflow mutation, Dispatch, Skill, model, worker, or provider command is called.
- Quest import mapping/error fixtures, source-drift token, idempotency, export round-trip/loss report, writer transfer, and pre-write source-admin refusal.
- Historical Procedure Context/recording command tests remain unchanged and green.

### 7. Wrong vs Correct

```text
Wrong: `research workflow next` selects or runs the next skill.
Correct: it reports legal operator choices and missing requirements only.

Wrong: Skill discovery skips a symlinked or malformed project candidate and returns the remaining list.
Correct: authenticate every candidate and fail the whole read so metadata is never partial or silently substituted.

Wrong: any canonical events sharing a Workflow command's idempotency key count as successful replay.
Correct: replay only one matching Workflow event with the exact command family, target, and payload shape; otherwise return `IDEMPOTENCY_KEY_CONFLICT`.

Wrong: `research gate record --write` records H2 and immediately launches evaluation.
Correct: it records one gate event and stops; a later explicit transition and execution are separate.

Wrong: `quest export` flips authority because files were written successfully.
Correct: export validates bytes; only an explicit verified writer-transfer mutation changes authority.
```

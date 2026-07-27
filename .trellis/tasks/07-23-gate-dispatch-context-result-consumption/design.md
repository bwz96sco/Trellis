# Technical Design

## 1. Scope / Trigger

C06 introduces internal approved-Context and approval-consumption primitives. Public activation is delayed to the C06+C07 atomic integration cutover because current public Context, workers, hook, workflow instructions, and record-result are mutually dependent on the legacy Skill/request-file contract.

C06 owns authority resolution and canonical consumption. C07 owns public registration and host/template consumers. Neither task archives before joint acceptance.

## 2. Signatures

### Internal approved Context successor

```ts
interface ResolveApprovedResearchDispatchContextOptions
  extends ResearchRootOptions {
  dispatchId: DispatchId;
  host: ResearchExecutionHost;
  now?: Date;
}

interface ApprovedResearchDispatchContextResult {
  command: "research dispatch context";
  valid: true;
  ledgerHead: number;
  warnings: readonly ResearchDispatchContextWarning[];
  context: NormalizedResearchWorkerInputV1;
}

async function resolveApprovedResearchDispatchContext(
  options: ResolveApprovedResearchDispatchContextOptions,
): Promise<ApprovedResearchDispatchContextResult>;
```

`now` exists only on this package-private resolver for deterministic tests. Production public API captures one timestamp and passes it inward. C06 keeps legacy public `ResearchDispatchContextResult` unchanged.

During C06, existing public `getResearchDispatchContext` and Commander registration retain legacy behavior. During C07 cutover, public `getResearchDispatchContext` delegates to the successor through an option type with no injectable clock:

```ts
interface GetResearchDispatchContextOptions
  extends ResearchRootOptions {
  dispatchId: DispatchId;
  host: ResearchExecutionHost;
}
```

C07 exposes:

```text
trellis research dispatch context <dispatch-id>
  --host <claude|codex>
  [--root <root>]
  [--json]
```

No request-file positional routing or `--skill-name` remains after cutover.

### Stable output identity

```ts
function deriveResearchOutputIds(
  approvalId: ApprovalId,
): Readonly<{
  resultId: ResultId;
  proposalId: ProposalId;
}>;
```

Exact algorithm:

```text
apr_<uuid-suffix> -> res_<same-suffix>
apr_<uuid-suffix> -> prp_<same-suffix>
```

Prefixes are exact lowercase. Existing accepted uppercase/lowercase UUID hex suffix is preserved byte-for-byte. Helper is pure, non-random, filesystem-free, and sole derivation implementation.

### Read-only materialization input

```ts
type ResearchDispatchMaterializationKind =
  | "request"
  | "activation"
  | "approval";

interface ReadResearchDispatchMaterializationOptions
  extends ResearchRootOptions {
  dispatchId: DispatchId;
  kind: ResearchDispatchMaterializationKind;
  approvalId?: ApprovalId;
}
```

Reader returns strict parsed bytes/value or a typed read failure. Context maps request failures to `REQUEST_STATE_MISMATCH`; activation/approval failures to `MATERIALIZATION_STATE_MISMATCH`.

### Core mutation

```ts
| {
    kind: "approval.consume";
    approvalId: ApprovalId;
    resultId: ResultId;
    proposalId: ProposalId;
  }
```

Caller cannot supply timestamp, Activation/Dispatch relation, host, actor, provenance, or idempotency metadata.

### Internal approval-consuming record-result successor

```ts
type ResearchDispatchResultInput =
  | {
      kind: "path";
      path: string;
      cwd: string;
    }
  | {
      kind: "stdin";
      read: () => string;
      cwd: string;
    };

interface RecordApprovedResearchDispatchResultOptions
  extends ResearchMutationOptions {
  dispatchId: DispatchId;
  approvalId: ApprovalId;
  input: ResearchDispatchResultInput;
  now?: Date;
}

interface RecordApprovedResearchDispatchResultResult
  extends ResearchMutationResult {
  result: Result;
  proposal: Proposal;
  approval: ResearchApprovalState;
  resultFile: string | null;
  proposalFile: string | null;
  approvalFile: string | null;
}

async function recordApprovedResearchDispatchResult(
  options: RecordApprovedResearchDispatchResultOptions,
): Promise<RecordApprovedResearchDispatchResultResult>;
```

`recordApprovedResearchDispatchResult` is package-private: exported only from its implementation module for focused tests, not from a package/public barrel. `now` is its sole test clock seam. Both input variants carry the same absolute command `cwd` captured before async work; `input.read` is a lazy zero-argument stdin thunk. Before the first `await`, parse IDs/options, resolve optional `root` and any relative input path against that cwd, and retain resolved strings only. Then strict-read the ledger and classify same-key replay before any input open/read, current-time check, authority revalidation, or output-ID collision check.

### Final public record-result

```text
trellis research dispatch record-result <dispatch-id>
  --approval <apr-id>
  --input <path|->
  [normal mutation options]
```

At C07 cutover, the public TypeScript boundary deliberately replaces the legacy `file` option:

```ts
interface RecordResearchDispatchResultOptions
  extends ResearchMutationOptions {
  dispatchId: DispatchId;
  approvalId: ApprovalId;
  input: ResearchDispatchResultInput;
}

type RecordResearchDispatchResultResult =
  RecordApprovedResearchDispatchResultResult;

async function recordResearchDispatchResult(
  options: RecordResearchDispatchResultOptions,
): Promise<RecordResearchDispatchResultResult>;
```

Public `recordResearchDispatchResult` captures one production timestamp and delegates to `recordApprovedResearchDispatchResult`; it exposes no clock. Commander captures absolute `process.cwd()` once and includes it in both the lazy stdin and path variants. Successor resolution uses that one base for optional relative `root` and relative input path. `ResearchMutationOptions` remains the mutation boundary (`root`, `json`, `idempotencyKey`, `dryRun`); no new host or authority option is added.

During internal C06 preparation, legacy public `RecordResearchDispatchResultOptions`, `RecordResearchDispatchResultResult`, `recordResearchDispatchResult`, and `record-result --file` stay unchanged. Only the package-private successor exists. C07 replaces the public types/delegate/registration together and removes `--file`.

## 3. Contracts

### Outer Context envelope

Preserve current command identifier:

```ts
{
  command: "research dispatch context";
  valid: true;
  ledgerHead: number;
  warnings: readonly ResearchDispatchContextWarning[];
  context: NormalizedResearchWorkerInputV1;
}
```

Failure is structured, non-zero, and contains no partial Context. Historical warnings remain outside normalized worker input.

### Normalized worker input

The payload contains exact schema version, host, canonical Dispatch, activation bindings, selected approval, immutable capability, validated Procedure manifest/digest/instructions/source, resolved Repository, declared Context/artifacts/write paths/outputs/checks, complete false authority ceilings, and output contract with approval-derived Result/Proposal IDs.

For cross-host parity, normalize exactly `context.host`, `context.approval.id`, `context.outputContract.resultId`, and `context.outputContract.proposalId`. Build the parity fixture by granting both hosts through the same approval path at one injected timestamp, so `approval.mode` and `approval.expiresAt` are identical. Each host's output IDs must equal `deriveResearchOutputIds(context.approval.id)`. Deep-compare every remaining field. Separate non-parity tests prove legitimately different grant paths/times preserve distinct `approval.mode`/`approval.expiresAt`; those fields are never normalized away. Procedure instructions are embedded only after all gates pass.

### Context authority data flow

```text
arguments + one now
  -> strict mixed-ledger state
  -> Dispatch/hierarchy/completion
  -> activation/index/capability
  -> zero-write request materialization equality
  -> request/Procedure/policy/scope recomputation
  -> complete approval-index relation validation
  -> host history/state/expiry selection
  -> zero-write activation/approval materialization equality
  -> approval-derived output IDs
  -> normalized Context
```

No `contextDigest` is added. Binding authority remains:

```text
requestDigest
procedureDigest
policyDigest
scopeHash
```

### Approval selection

Validate the complete indexed approval set before host availability or terminal-state classification. Every indexed approval must exist, belong to the activation/Dispatch, and match activation bindings.

At captured `now`:

```text
eligible iff status == granted && now < expiresAt
expired iff status == granted && now >= expiresAt
```

More than one simultaneously eligible requested-host grant is relation corruption. If no eligible requested-host grant exists, classify the newest requested-host grant by canonical ledger grant order.

### Read-only materialization algorithm

1. Validate IDs/path segments as one safe component.
2. Traverse only existing root-to-parent directory components.
3. Reject symlink/non-directory components and canonical containment escape.
4. Capture component identity to detect replacement/type/realpath/containment changes while ignoring unrelated sibling metadata changes.
5. Require regular non-symlink target.
6. Open read-only with `O_NOFOLLOW` where available.
7. Bind pre-open path identity to descriptor identity.
8. Read all bytes through descriptor.
9. Revalidate descriptor and final pathname identity.
10. Strict-parse envelope; reject unknown keys.
11. Verify embedded IDs match requested path identity.
12. Deep-compare with canonical state.
13. Return only after all checks.

No mkdir, lock, write descriptor, staging, link, rename, unlink, repair, rebuild, observation, session, projection, target write, or Git operation is permitted.

### Stable output IDs and collisions

Context and successor record-result both call the same helper. New execution rejects unrelated occupation of either derived ID as `OUTPUT_ID_CONFLICT`. Exact same-key replay is classified before collision checks and returns canonical prior success.

### Atomic consumption

Successor new execution builds exactly:

```text
1. schema-v1 result.recorded
2. schema-v1 proposal.recorded
3. schema-v2 approval.consumed
```

All events share timestamp, actor, provenance, idempotency key, and contiguous sequence. Progressive candidate reduction validates the late consumption against same-batch Result/Proposal and current approval.

During internal preparation, `validateDispatchBatch` accepts only two complete isolated families:

```text
legacy    = [result.recorded, proposal.recorded]
successor = [result.recorded, proposal.recorded, approval.consumed]
```

Final C07 cutover removes the legacy family. No consumption-only or mixed family is valid.

One serialized append prevents application-level split batches. No formal power-loss byte-atomicity claim is made.

### Replay and materialization recovery

Explicit same-key events are classified after required pre-await lexical root/path resolution but before completion, expiry, current bindings, output-ID collision, or input availability. Exact successor replay reconstructs canonical Result, Proposal, and consumed approval and repairs all three tracked files without append. It must not open/stat/read the pre-resolved path, invoke the stdin thunk, or require original input bytes. Any other same-key family/target/approval/order/shape returns `IDEMPOTENCY_KEY_CONFLICT`.

### Input contract

Before first `await`, both input variants supply the same captured absolute `cwd`; optional relative `root` and relative path token are lexically resolved against it without filesystem access. Strict ledger read and same-key classification follow. Exact replay may therefore return without opening the resolved path or invoking stdin. New execution invokes the lazy stdin reader only after replay and authority/collision gates, reading exactly one strict JSON object to EOF; path input then requires the pre-resolved target to remain contained, regular, non-symlink, and stable inside selected control-plane root. No implementation may call `process.cwd()` again inside async successor work. Payload remains exactly `{result, proposal}`. IDs must equal approval-derived IDs.

### C06+C07 atomic integration boundary

C06 internal stages must leave legacy public execution coherent. C07 changes these together:

1. public Context registration/API;
2. public record-result registration/API;
3. mandatory successor-only batch validation;
4. Claude worker;
5. Codex worker;
6. shared Claude injection hook;
7. generated Research workflow instructions;
8. executable specs, command-tree tests, generated assets, built output, installs, and packed audit.

Neither task archives before joint host-adapter/public-lifecycle contract verification and executable spec-contract validation.

### Joint archive recovery contract

`task.py archive` mutates `task.json` and clears matching session `current_task` pointers before moving, then may run configured `after_archive` hooks. Therefore closeout is two recoverable operations, never a transaction:

1. Resolve effective task hook config through the same config loader used by `task.py`; require empty `after_archive`. If any hook exists, stop and design a side-effect-free grouped archive path before moving either child.
2. Capture one expected archive date. Preflight both exact active task directories and both exact dated archive destinations; missing source, destination collision, duplicate/ambiguous active/archive state, or unreadable required metadata/session input stops the procedure.
3. Snapshot exact C06 and C07 `task.json` bytes. Enumerate every session file whose normalized `current_task` points to either child; record each path, existence state, exact bytes, and parsed value.
4. Archive C06 with `--no-commit`, then immediately archive C07 with `--no-commit`; perform no other action between them.
5. After both commands report success, verify: both active paths are absent; both exact archive destinations and archived `task.json` files exist; each archived file parses with only `status: "completed"` and `completedAt: <expected-date>` changed from its snapshot; every other metadata key/value, including parent/children links, is unchanged; every captured session still exists, has only the matching normalized `current_task` removed, and preserves all unrelated parsed data.
6. Failure of either archive invocation or any post-success verification is one atomic-group failure. Inspect both active/archive locations, restore both children to their original active paths, restore exact task metadata bytes, and restore every captured session path/existence/byte state.
7. Revalidate parent-child links, both original task states/paths, absence of both archive destinations, and exact restored session bytes before retry or any further work. If restoration cannot establish that state, stop and report the incomplete recovery.

Successful archive hooks cannot be undone by moving files back, which is why non-empty `after_archive` is a hard preflight stop. This procedure is recoverable grouping, not filesystem transactionality.

## 4. Validation & Error Matrix

### Context precedence

| Order | Condition | Result |
|---:|---|---|
| 1 | Invalid Dispatch ID/host/root | Commander/API parse failure |
| 2 | Invalid ledger | strict read/reduction failure |
| 3 | Dispatch absent | existing Dispatch-not-found code |
| 4 | Hierarchy invalid | C05 exact hierarchy error |
| 5 | Result/Proposal already completes target | `DISPATCH_ALREADY_COMPLETED` |
| 6 | Activation absent | `ACTIVATION_REQUIRED` |
| 6 | Activation index/entity mismatch | `APPROVAL_RELATION_MISMATCH` |
| 7 | Capability absent/stage mismatch | existing capability code |
| 8 | request.json absent/drifted/malformed/raced | `REQUEST_STATE_MISMATCH` |
| 9.1 | Request binding drift | `REQUEST_DIGEST_MISMATCH` |
| 9.2 | Procedure drift | `PROCEDURE_DIGEST_MISMATCH` |
| 9.3 | Policy drift | `POLICY_DIGEST_MISMATCH` |
| 9.4 | Scope drift | `SCOPE_HASH_MISMATCH` |
| 10 | Approval index/relation corruption | `APPROVAL_RELATION_MISMATCH` |
| 11 | No approval history | `APPROVAL_REQUIRED` |
| 11 | No requested-host history | `APPROVAL_HOST_MISMATCH` |
| 12 | Multiple eligible requested-host grants | `APPROVAL_RELATION_MISMATCH` |
| 12 | Newest requested-host grant consumed | `DISPATCH_ALREADY_COMPLETED` |
| 12 | Newest requested-host grant revoked | `APPROVAL_REVOKED` |
| 12 | Newest requested-host grant expired/equal | `APPROVAL_EXPIRED` |
| 13 | activation/approval sidecar mismatch | `MATERIALIZATION_STATE_MISMATCH` |
| 14 | Derived Result/Proposal ID occupied by unrelated entity | `OUTPUT_ID_CONFLICT` |
| 15 | All gates pass | return complete Context |

Materialization mismatch therefore precedes output-ID collision.

### Record-result precedence

1. Parse IDs/options and validate captured absolute cwd.
2. Before first await, resolve optional relative root and relative path token against that cwd without filesystem access.
3. Strict-read/reduce ledger.
4. Classify same-key replay/collision before input read, current-time checks, authority checks, or output-ID collision.
5. Dispatch and hierarchy.
6. Target completion.
7. Activation integrity.
8. Selected approval existence/relation.
9. Approval terminal state.
10. Expiry.
11. Binding drift in request, Procedure, policy, scope order.
12. Derived-ID occupation.
13. Input availability/containment/stability using pre-resolved path or lazy stdin.
14. Strict `{result, proposal}` parse.
15. Supplied-ID equality.
16. Existing v1 relations/artifacts.
17. Complete batch validation/commit.
18. Post-commit materialization.

Additional stable code:

| Condition | Result |
|---|---|
| Derived Result/Proposal ID occupied by unrelated entity | `OUTPUT_ID_CONFLICT` |
| Same key belongs to another family/target/approval/shape | `IDEMPOTENCY_KEY_CONFLICT` |
| Selected approval absent | `APPROVAL_REQUIRED` |
| Selected approval foreign | `APPROVAL_RELATION_MISMATCH` |
| Selected approval consumed / target completed | `DISPATCH_ALREADY_COMPLETED` |
| Selected approval revoked | `APPROVAL_REVOKED` |
| `now >= expiresAt` | `APPROVAL_EXPIRED` |
| Result/Proposal IDs differ from derived IDs | typed strict input failure; no append |
| Result/Proposal/consumption incomplete/reordered/mismatched | reject whole batch; no append |
| Post-commit materialization failure | committed error with head/target/same-key recovery |

## 5. Good / Base / Bad Cases

- **Good**: bounded Codex approval passes current authority and sidecars; Context returns embedded Procedure plus stable output IDs; successor record-result appends exact three events and materializes consumed approval.
- **Good**: same key retried after proposal sidecar failure; replay ignores expired current time and missing original input, appends nothing, repairs all materializations.
- **Base**: C06 internal successor tests pass while legacy public Context/worker/record-result still complete the old two-event flow.
- **Bad**: C06 changes public record-result before workers receive approval/output IDs. This breaks installed execution and is forbidden.
- **Bad**: Context calls writer directory selection and creates a missing approvals directory. Any Context write violates contract.
- **Bad**: choose an approval before validating full canonical index. Corruption could be masked as host mismatch.
- **Bad**: derive random output IDs on every Context call. Zero-write retries become unstable.

## 6. Tests Required

### Internal C06

Focused files are exact and package-relative: `test/commands/research-dispatch-output-ids.test.ts`, `test/commands/research-dispatch-materialization-reader.test.ts`, `test/commands/research-dispatch-approved-context.test.ts`, and `test/commands/research-dispatch-approved-result.test.ts`.

- Pure output-ID helper vectors, accepted casing preservation, malformed IDs, Result-only/Proposal-only/both collision.
- Context total-precedence pairs and complete approval-index corruption matrix.
- Zero-write full-tree snapshots for every success/failure.
- Request versus activation/approval materialization code distinction.
- Read-only path containment, symlink, dangling symlink, non-regular, replacement, identity drift, and unrelated sibling changes.
- Normalized payload exact shape; parity fixture grants both hosts through the same path at one injected timestamp so approval mode/expiry match, normalizes only host, approval ID, Result ID, and Proposal ID, proves each output-ID pair derives from that host approval, then deep-compares every remaining field. Separate fixtures preserve and assert valid mode/expiry differences.
- Typed consumption draft, exact refs/payload, shared envelope, progressive reduction.
- Legacy and successor isolated batch families during preparation; every mixed/partial/reordered/extra shape rejected.
- Exact `recordApprovedResearchDispatchResult` options/result/public-delegate types; captured cwd in both input variants; synchronous root/path lexical resolution before first await; replay without input open/read or stdin invocation; output-ID enforcement; concurrent revoke/consume/result races; expiry equality; no partial append.
- Full legacy public lifecycle after each internal stage.

### Joint C06+C07

- Exact public command inventory.
- Both workers use embedded Procedure and supplied IDs; no Skill read/invocation/random output IDs.
- Shared hook and generated workflow use successor commands.
- `packages/cli/test/commands/research-host-adapters.integration.test.ts` runs generated-byte conformance, an actual Claude hook subprocess with fake `trellis`, Codex static prompt/ordering validation, a deterministic schema oracle that copies supplied IDs, and the real public record-result lifecycle through consumed sidecar. Oracle output proves API integration, not model compliance; live cloud LLM execution is outside this gate.
- `packages/cli/test/specs/research-procedure-cutover-specs.test.ts` treats backend `index.md` as link-only, validates exact named seven-section scenarios in exactly five CLI scenario files, and guards core `research-state.md` successor wording separately. Scenario extraction starts at exact `## Scenario: Research Procedure dispatch cutover`, ends before next `## ` or EOF, and requires each exact `### 1.` through `### 7.` heading once/in order. Built/install/packed negative sweep verifies all retired routing and command forms.
- Full core/CLI/workspace quality and packed gates after each buildable stage and final cutover.

## 7. Wrong vs Correct

```text
Wrong: public record-result requires approval while public Context and workers still cannot supply it.
Correct: prepare internal primitives, then switch every public producer/consumer in one C06+C07 cutover.
```

```text
Wrong: request, activation, and approval sidecars all report one generic code.
Correct: preserve REQUEST_STATE_MISMATCH for request.json; use MATERIALIZATION_STATE_MISMATCH for activation/approval.
```

```text
Wrong: Context and record-result each implement prefix replacement.
Correct: one pure deriveResearchOutputIds helper owns all output identity.
```

```text
Wrong: describe one append call as crash-atomic storage.
Correct: claim application-level complete validation plus one append; document power-loss limitation.
```

## Impact and Stop Gates

Required fresh upstream impact before existing-symbol edits. Frozen lower-bound warnings:

- `resolveDispatchActivationCandidate` — HIGH
- `readCanonicalDispatchRequest` — HIGH
- `resolveResearchProcedureAuthority` — CRITICAL
- `validateDispatchBatch` — HIGH

Stop and return to planning if implementation requires edits to:

- `buildValidatedBatch` — CRITICAL
- `validateResearchBatch` — CRITICAL
- `commitResearchBatch` — CRITICAL
- `reduceResearchEvents` — CRITICAL
- `stableResearchJson` — CRITICAL
- `parseResearchEvent` — HIGH
- projection/lock/durability internals

No worker/template/hook/workflow, Skill retirement, generic export, package version, docs-site, or marketplace edit belongs to standalone C06.

## Joint Remediation Design Addendum

### Staged binding authority

Approved Context and approval-bound recording use an additive revalidation path. Creation-time `resolveDispatchActivationCandidate` and combined `resolveResearchProcedureAuthority` remain byte-unmodified. Revalidation order is:

```text
request digest
-> resolve Procedure
-> Procedure digest
-> read project policy
-> policy digest
-> effective authority / automatic eligibility
-> reject foreign Repository artifact IDs
-> one target Repository observation
-> normalized scope / scope hash
-> deferred artifact revision and SHA-256 verification
-> broad activation-authority relation
```

A malformed policy cannot mask Procedure drift. Repository/artifact failures cannot mask request, Procedure, or policy drift. Scope construction may perform normalization/containment/canonical-path work required by the frozen hash; revision equality and content digest checks remain deferred until after scope comparison.

### One-state / one-observation Context

Context captures one mixed-ledger `ResearchState`. Context-only Repository resolution accepts that state, reads binding metadata without observation-cache access, performs no `git status`, and returns one coherent path/Git-root/HEAD/remote observation. That observation is reused for target Repository scope, every allowed write path, and every artifact. Foreign Repository artifacts fail before any alternate Repository access.

### Snapshot-only dry-run validation

Core exposes `validateResearchBatchReadOnly(input)`. It reads one ledger snapshot, classifies same-key replay, and otherwise invokes existing canonical `buildValidatedBatch` directly. It never acquires Research lock or writes runtime/projection/cache state. Existing `validateResearchBatch` and `commitResearchBatch` remain lockful authority and unchanged. Snapshot validation does not reserve ledger head against a concurrent commit.

### Public failure, replay, and publication

- Public Context adapts internal `ResearchActivationError` only at API boundary to `ResearchDispatchContextError`; renderer emits exact schema-v1 failure plus `safeAction: "report-to-root-no-write"`.
- Approved result preflight keeps raw current clock until after strict ledger read and exact same-key replay classification. Replay ignores invalid/expired current clock and unavailable original input.
- Result/Proposal materialization uses narrow wrappers around hardened sidecar publication. Canonical ledger remains authority; sequential post-commit publication and same-key recovery remain honest detect-and-fail behavior, not transactional storage.

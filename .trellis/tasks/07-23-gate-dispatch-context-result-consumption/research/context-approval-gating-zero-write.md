# Research: Dispatch Context Approval Gating and Zero-Write Successor

- **Query**: Freeze the C06 Dispatch Context successor, approval gate, normalized worker input, stable output identity, zero-write materialization reads, and C06/C07 transition boundary.
- **Scope**: internal
- **Date**: 2026-07-24
- **Source baseline**: commit `8d59dc9`
- **Network**: not used

## Decision Summary

C06 defines one package-private Dispatch-ID successor while preserving legacy public routing. C07 activates this canonical public entry point during atomic cutover:

```text
trellis research dispatch context <dispatch-id> --host <claude|codex>
```

The TypeScript successor accepts `dispatchId`, a validated `ResearchExecutionHost`, and existing root options. It captures one timestamp, strict-reads canonical mixed-version state, requires the Dispatch activation, recomputes current capability/Procedure/policy/request/scope authority, selects a matching host-bound granted and unexpired approval, strict-compares request/activation/approval materializations, and only then returns the normalized provider-neutral worker input with embedded Procedure instructions.

Context is exactly zero-write. It must not acquire the Research mutation lock, create runtime or parent directories, rebuild projections, repair sidecars, update Repository observations, create sessions/manifests, write target files, mutate Git, or invoke mutation dry-runs that create transient state.

C06 does not introduce `contextDigest`. The authoritative binding set remains `requestDigest`, `procedureDigest`, `policyDigest`, and `scopeHash`.

## Current and Successor Signatures

Current API:

```ts
export interface GetResearchDispatchContextOptions
  extends ResearchRootOptions {
  requestFile: string;
  host: string;
  discoveredSkillNames?: readonly string[];
}
```

Current CLI:

```text
trellis research dispatch context <request-file>
  --host <claude|codex>
  [--skill-name <name> ...]
```

Frozen public successor API:

```ts
export interface GetResearchDispatchContextOptions
  extends ResearchRootOptions {
  dispatchId: DispatchId;
  host: ResearchExecutionHost;
}
```

Package-private deterministic test seam:

```ts
interface ResolveApprovedResearchDispatchContextOptions
  extends ResearchRootOptions {
  dispatchId: DispatchId;
  host: ResearchExecutionHost;
  now?: Date;
}
```

Public production API captures one current timestamp and passes it to the package-private resolver. No public TypeScript option or CLI flag exposes `now`. The public command retains normal `--root` and `--json` conventions but accepts neither request-file routing nor `--skill-name` after final C06/C07 cutover.

Commander strictly parses `<dispatch-id>` as a canonical `dsp_` UUID and `--host` as exactly `claude|codex` before invoking Context. Invalid arguments fail at the command boundary with no filesystem mutation.

## Normalized Worker Input

C06 returns the frozen provider-neutral payload:

```ts
interface NormalizedResearchWorkerInputV1 {
  schemaVersion: 1;
  host: "claude" | "codex";
  dispatch: Dispatch;

  activation: {
    id: ActivationId;
    capabilityId: string;
    mode: "automatic" | "explicit";
    requestDigest: string;
    procedureDigest: string;
    policyDigest: string;
    scopeHash: string;
  };

  approval: {
    id: ApprovalId;
    mode: "automatic" | "interactive";
    expiresAt: string;
  };

  capability: ResearchCapabilityDefinition;

  procedure: {
    manifest: ResearchProcedureManifest;
    digest: string;
    instructions: string;
    source: "project" | "bundled";
  };

  repository: {
    id: RepositoryId;
    path: string;
  };

  context: readonly DispatchContextEntry[];
  artifacts: readonly { ref: ArtifactRef; path: string }[];
  allowedWritePaths: readonly string[];
  expectedOutputs: readonly string[];
  checks: readonly string[];

  authority: {
    readScope: "declared-context-only";
    writeScope: "allowed-write-paths-only";
    network: false;
    externalCost: false;
    multipleRepositories: false;
    canonicalResearchMutation: false;
    proposalReview: false;
    gitHistoryMutation: false;
    capabilityChaining: false;
    procedureLaunch: false;
    dispatchLaunch: false;
    nestedAgents: false;
    sandboxExpansion: false;
    recordResult: false;
  };

  outputContract: {
    type: "result-plus-pending-proposal";
    dispatchId: DispatchId;
    runId: RunId;
    questId: QuestId;
    resultId: ResultId;
    proposalId: ProposalId;
  };
}
```

Cross-host parity grants both host approvals through the same path at one injected timestamp so `approval.mode` and `approval.expiresAt` are equal, then normalizes exactly `context.host`, `context.approval.id`, `context.outputContract.resultId`, and `context.outputContract.proposalId`. Each host's Result/Proposal IDs must equal `deriveResearchOutputIds(context.approval.id)`; every remaining field is deep-compared. Separate non-parity fixtures assert valid approval mode/expiry differences remain visible. Procedure instructions are embedded only after strict validation. Workers may not rediscover Skills, read arbitrary Procedure paths, or fall back to ledger/policy/sidecar reads.

### CLI success envelope

Preserve the existing command-result envelope shape where possible and replace only its payload authority:

```ts
{
  command: "research dispatch context";
  valid: true;
  ledgerHead: number;
  warnings: readonly ResearchDispatchContextWarning[];
  context: NormalizedResearchWorkerInputV1;
}
```

C06 names this successor envelope `ApprovedResearchDispatchContextResult`. It does not reuse or mutate legacy public `ResearchDispatchContextResult`; C07 deliberately replaces/aliases the public result only at atomic cutover.

Failure remains structured, non-zero, and contains no partial Context. `warnings` stay outside normalized worker input so historical compatibility metadata cannot become routing authority.

## Stable Result and Proposal IDs

Frozen contracts require Context to supply `resultId` and `proposalId`, while current ID constructors and workers use random UUIDs. Random allocation on every zero-write Context call is not repeatable, and activation/approval schemas do not store preallocated output IDs.

C06 therefore adds one shared pure helper used by Context and `record-result`:

```ts
function deriveResearchOutputIds(
  approvalId: ApprovalId,
): Readonly<{
  resultId: ResultId;
  proposalId: ProposalId;
}>;
```

Exact derivation:

```text
apr_<uuid> -> res_<same-uuid>
apr_<uuid> -> prp_<same-uuid>
```

The exact lowercase prefixes remain fixed. Existing core and CLI ID schemas accept uppercase or lowercase UUID hexadecimal digits; derivation preserves the validated UUID suffix byte-for-byte and does not normalize case. Any future lowercase-only rule requires separate compatibility planning.

Properties:

- repeated Context calls for one approval return identical IDs;
- renewed approvals receive distinct candidate output IDs;
- no write or schema expansion is required;
- `record-result --approval` recomputes and enforces the exact expected IDs;
- only approval IDs accepted by the existing strict prefixed-UUID schema reach derivation;
- one helper is the sole implementation and has fixed test vectors.

Before reading new worker input, `record-result` checks whether either derived ID is already occupied by an unrelated canonical entity. Result-only, Proposal-only, or paired unrelated occupation returns `OUTPUT_ID_CONFLICT`; it is neither Dispatch completion nor idempotency conflict.

Do not derive from Dispatch ID: a renewed approval for the same Dispatch would reuse attempted output IDs. Do not add random IDs to Context. Do not add output IDs to activation/approval entities in C06.

## Canonical Resolution and Error Precedence

Context uses this total order; tests freeze simultaneous-failure behavior.

### Argument and canonical-state phase

1. Commander/API parses Dispatch ID, exact host, and root.
2. Strict-read and reduce the complete mixed ledger.
3. Require the Dispatch.
4. Validate hierarchy and dispatchability using C05 exact precedence.
5. If a canonical Result or Proposal already completes the Dispatch, return `DISPATCH_ALREADY_COMPLETED`.
6. Validate `activationByDispatchId` and activation entity integrity:
   - absent -> `ACTIVATION_REQUIRED`;
   - inconsistent index/entity/Dispatch relation -> `APPROVAL_RELATION_MISMATCH`.
7. Require current capability existence and exact Quest-stage agreement.

### Request and authority phase

8. Strict-read tracked `request.json` through the zero-write reader. Missing, malformed, wrong embedded ID, unknown key, stale state, symlink, race, or semantic difference -> `REQUEST_STATE_MISMATCH`.
9. Resolve current authority and compare activation bindings in the existing shared-helper order:
   1. `REQUEST_DIGEST_MISMATCH`;
   2. `PROCEDURE_DIGEST_MISMATCH`;
   3. `POLICY_DIGEST_MISMATCH`;
   4. `SCOPE_HASH_MISMATCH`.

### Approval phase

10. Validate the complete activation approval index before classifying availability:
    - every indexed ID exists;
    - every grant belongs to the activation and Dispatch;
    - every grant binding agrees with the activation;
    - duplicate or inconsistent relations -> `APPROVAL_RELATION_MISMATCH`.
11. Form requested-host history:
    - no approvals at all -> `APPROVAL_REQUIRED`;
    - approvals exist for the activation but never for the requested host -> `APPROVAL_HOST_MISMATCH`.
12. Determine requested-host eligibility at the one captured timestamp:
    - more than one simultaneously eligible grant -> `APPROVAL_RELATION_MISMATCH`;
    - exactly one -> select it;
    - none -> classify the newest requested-host grant by canonical ledger grant order:
      - consumed -> `DISPATCH_ALREADY_COMPLETED`;
      - revoked -> `APPROVAL_REVOKED`;
      - granted with `now >= expiresAt` -> `APPROVAL_EXPIRED`.
13. Strict-read activation and selected approval materializations. Any absence, malformed envelope, unknown key, wrong ID, stale status, symlink, replacement, race, or semantic difference -> `MATERIALIZATION_STATE_MISMATCH`.
14. Derive output IDs and reject unrelated canonical occupation of either ID -> `OUTPUT_ID_CONFLICT`.
15. Construct and return the complete normalized input.

Materialization mismatch therefore precedes output-ID collision.

Context never selects approval by filesystem order.

## Read-Only Materialization Reader

Current `dispatch-activation-materialization.ts` writer path cannot be reused directly because its directory selector calls `mkdirSync`. C06 needs a separate contained read-only reader, preferably in a new module, leaving the hardened writer unchanged.

Required algorithm:

1. Require every Dispatch/Approval path segment to be one canonical component.
2. Traverse only already-existing root-to-parent components.
3. Reject symlink or non-directory parents and canonical-path escape.
4. Capture directory identity sufficient to detect replacement/type/realpath/containment change without treating unrelated sibling metadata changes as replacement.
5. Require target to exist as a regular non-symlink file.
6. Open read-only, using `O_NOFOLLOW` where supported.
7. Compare pre-open path identity with descriptor identity.
8. Read complete bytes through the descriptor.
9. Compare post-read descriptor identity and final path identity.
10. Strict-parse the expected envelope and reject unknown keys.
11. Require embedded IDs to match path/requested canonical IDs.
12. Deep-compare parsed entity/state with canonical ledger state.
13. Return bytes/value only after all checks.

The read primitive reports a typed read failure to its caller. Context maps `request.json` absence, malformed bytes, races, wrong ID, or semantic disagreement to the existing `REQUEST_STATE_MISMATCH`; it maps activation and approval sidecar failures to `MATERIALIZATION_STATE_MISMATCH`. Reader never calls `mkdirSync`, opens a write descriptor, stages, links, renames, unlinks, repairs, materializes, locks, rebuilds, or updates observations.

Pure Node detect-and-fail limitations remain honest. Do not claim mathematical `openat`/directory-FD-relative race freedom.

## Historical Metadata Warnings

Historical `ownerSkill`, `provider`, and `taskRef` remain schema-v1 compatibility metadata only. Context may emit stable warnings in the outer `warnings` array when such values are present. Rules:

- warning text/order are deterministic;
- no discovered-name input participates;
- metadata never selects capability, Procedure, host, approval, repository, or authority;
- warnings are not embedded into Procedure instructions or worker authority;
- no warning causes writes or materialization repair.

## No Context Digest

No current symbol, field, domain separator, event property, sidecar property, or parser defines `contextDigest`. Existing authority already binds:

```text
requestDigest
procedureDigest
policyDigest
scopeHash
```

C06 does not invent an aggregate digest. Adding one would reopen activation, approval, event, materialization, worker-input, and consumption contracts without additional authority.

## Record-Result Integration

Frozen command:

```text
trellis research dispatch record-result <dispatch-id>
  --approval <apr-id>
  --input <path|->
```

The frozen final command removes `--file`, requires `--input`, and supports lazy stdin `-`. Commander captures one absolute cwd and includes it in both input variants. Before first await, successor resolves optional relative root and relative path token against that same cwd without filesystem access. After strict ledger read, it classifies exact replay before input open/read, stdin invocation, current-time eligibility, authority revalidation, or output-ID collision. New path execution requires a contained regular non-symlink stable file inside selected control-plane root. No undocumented `--file` alias remains after final C06+C07 cutover.

Worker JSON stays exactly:

```json
{
  "result": {},
  "proposal": {}
}
```

For new successor execution, `record-result` requires Result/Proposal IDs equal the shared approval-derived IDs, revalidates canonical approval and all four current bindings, and commits exactly:

```text
1. schema-v1 result.recorded
2. schema-v1 proposal.recorded
3. schema-v2 approval.consumed
```

All events share one timestamp, actor, provenance, and idempotency key with contiguous sequences. One validated serialized append prevents application-level split batches. It is not a formal power-loss byte-atomicity guarantee; broader ledger durability work is outside C06 unless separately planned and approved.

Exact same-key replay classification occurs before terminal, expiry, binding, materialization, output-ID collision, or unavailable-input checks. Replay repairs Result, Proposal, and consumed-approval materializations without appending. A key collision with another command family/target/approval/batch shape returns `IDEMPOTENCY_KEY_CONFLICT`.

### Record-result total precedence

1. Parse Dispatch ID, approval ID, required input syntax, root, mutation options, and the captured absolute cwd present in either input variant.
2. Before first await, resolve optional relative root and relative path token against that cwd without opening/statting/reading input.
3. Strict-read and reduce mixed ledger.
4. Classify explicit same-key replay before input open/read, stdin invocation, current-time eligibility, authority/binding revalidation, or output-ID collision; exact three-event replay succeeds, every other same-key shape/target/approval returns `IDEMPOTENCY_KEY_CONFLICT`.
5. Require Dispatch and validate hierarchy.
6. Existing target Result/Proposal -> `DISPATCH_ALREADY_COMPLETED`.
7. Validate activation index/entity integrity; absent -> `ACTIVATION_REQUIRED`, inconsistent -> `APPROVAL_RELATION_MISMATCH`.
8. Require selected approval; absent -> `APPROVAL_REQUIRED`, foreign relation -> `APPROVAL_RELATION_MISMATCH`.
9. Consumed -> `DISPATCH_ALREADY_COMPLETED`; revoked -> `APPROVAL_REVOKED`.
10. Captured `now >= expiresAt` -> `APPROVAL_EXPIRED`.
11. Revalidate bindings in order request, Procedure, policy, scope.
12. Derive expected output IDs and detect unrelated occupation -> `OUTPUT_ID_CONFLICT`.
13. Acquire input: stdin reads exactly one JSON object; path uses the pre-resolved target and must be contained, regular, non-symlink, and stable.
14. Strict-parse exactly `{result, proposal}`.
15. Require supplied IDs equal approval-derived IDs.
16. Validate existing schema-v1 relations, portable refs, and artifacts.
17. Validate and execute the exact three-event batch.
18. Lock-time progressive reduction closes revoke/consume/result races.
19. Materialize Result, Proposal, and consumed approval after commit/replay.
20. Post-commit materialization failure reports committed head and same-key recovery.

## C06/C07 Atomic Integration Group

Current public Context, workers, shared hook, and generated Research workflow remain mutually dependent on request-file/Skill routing and random worker-generated output IDs. Publicly switching only Context or only result consumption would break the installed lifecycle. C06 and C07 therefore remain separate ownership units but form one atomic public-acceptance group.

### C06 internal readiness stages

C06 may implement buildable internal preparation while the complete legacy public lifecycle remains usable:

1. Add the Dispatch-ID successor resolver, zero-write reader, approval gate, normalized payload, and shared deterministic output-ID helper behind direct/internal APIs. Do not change public Context registration.
2. Add typed `approval.consume`, schema-v2 draft construction, internal successor result-recording, replay classification, and materialization recovery.
3. During preparation, `validateDispatchBatch` may accept exactly two isolated valid families:

```text
legacy:    result.recorded, proposal.recorded
successor: result.recorded, proposal.recorded, approval.consumed
```

It rejects consumption-only, mixed, reordered, extra, or mismatched shapes. The legacy two-event family remains only until the atomic public cutover.

C06 cannot archive or claim public acceptance from internal tests alone.

### C07-owned atomic public cutover

C07 switches all observable producers and consumers together:

- public Context registration and API export use Dispatch ID and exact host;
- public `record-result` requires `--approval` and `--input`, removing `--file`;
- `validateDispatchBatch` removes the legacy two-event production family;
- Claude worker consumes embedded Procedure and supplied IDs;
- Codex worker does the same;
- shared Claude injection hook validates the successor envelope;
- generated `packages/cli/src/templates/trellis/workflows/research/workflow.md` uses successor commands;
- request-file Context routing, `--skill-name`, Skill discovery/invocation, and random worker output IDs disappear together;
- executable specs, command tree, generated templates, built output, installs, and packed audit switch together.

C06 and C07 both archive only after named host-adapter/public-lifecycle verification, executable spec-contract validation, and full gates. Closeout requires empty effective `after_archive` hooks, exact active/destination preflight, and snapshots of both task metadata files plus every session file pointing to either child. After both commands report success, verify exact archive destinations, only allowed task metadata changes, unchanged parent/children links, and session pointer removal without unrelated data loss. Failure of either invocation or any post-success verification restores both children, exact metadata bytes, and all captured session state before original-state revalidation. The parent predecessor rule receives one narrow exception allowing C07 implementation before C06 acceptance, solely for this atomic group. No hidden compatibility command or undocumented legacy option survives final cutover.

## Existing Symbols and Impact Gates

Minimum likely existing-symbol edit set:

- package-private `ResolveApprovedResearchDispatchContextOptions`
- new `ApprovedResearchDispatchContextResult`
- legacy `GetResearchDispatchContextOptions` / `ResearchDispatchContextResult` remain unchanged during C06 and are deliberately replaced/aliased during C07
- `getResearchDispatchContext` or a new successor beside it during transition
- `resolveDispatchActivationCandidate` / `revalidateDispatchActivationBindings`
- `readCanonicalDispatchRequest`
- `resolveResearchProcedureAuthority`
- `RecordResearchDispatchResultOptions`
- `recordResearchDispatchResult`
- `ResearchMutation`
- `buildMutationEventDraft`
- `validateDispatchBatch`
- `ResearchActivationErrorCode`
- `registerResearchCommand` only at final C07-owned public cutover
- generated Research workflow template only at final C07-owned public cutover

Frozen or researched risk lower bounds:

- `resolveDispatchActivationCandidate` — HIGH
- `readCanonicalDispatchRequest` — HIGH
- `resolveResearchProcedureAuthority` — CRITICAL
- `validateDispatchBatch` — HIGH
- `buildValidatedBatch` — CRITICAL stop gate if edit becomes necessary
- `validateResearchBatch` — CRITICAL stop gate if edit becomes necessary
- `commitResearchBatch` — CRITICAL stop gate if edit becomes necessary
- `reduceResearchEvents` — CRITICAL stop gate if edit becomes necessary
- `stableResearchJson` — CRITICAL stop gate if edit becomes necessary
- `parseResearchEvent` — HIGH stop gate if edit becomes necessary

Before editing every existing symbol, rerun fresh GitNexus upstream impact. Warn before any HIGH or CRITICAL edit. If implementation reaches a stop-gate symbol not explicitly authorized in the final plan, return to planning.

## Required Tests

### Context

- exact successor option/API parsing and host/Dispatch ID boundaries;
- activation absent, index mismatch, and hierarchy failure precedence;
- capability stage mismatch;
- Procedure/policy/request/scope drift with exact codes;
- host mismatch, missing approval, relation mismatch, revoked, consumed, expiry equality, post-expiry;
- multiple eligible approval corruption fails closed;
- request/activation/approval sidecar missing, malformed, symlink, replaced, raced, wrong ID, unknown key, stale state;
- cross-host fixture normalizes only host, approval ID, Result ID, and Proposal ID; verifies each output-ID pair derives from its host approval; deep-compares every remaining field;
- deterministic approval-derived Result/Proposal IDs across repeat Context calls;
- historical metadata warning-only behavior;
- complete root-tree byte/path/metadata snapshot proves success and every failure are zero-write;
- explicit assertions that no lock/runtime/observation/session/projection/repair path appears.

### Consumption

Use the exact matrix in `atomic-approval-consumption-result-recording.md`, including exact three-event order, shared envelope, all-or-none validation, deterministic ID enforcement, replay-first recovery, collisions, concurrent revoke/consume races, materialization repair, stdin/contained input, Decision regression, and application-level atomicity caveat.

### Transition

- after each internal C06 stage, legacy public Context, legacy `record-result --file`, existing workers/hooks/workflow, and two-event batch remain mutually usable;
- successor direct/internal tests pass without changing installed public instructions;
- final C07 cutover changes public Context, public record-result, two-event validator allowance, both workers, shared hook, and generated workflow together;
- both hosts complete `context -> supplied approval/output IDs -> worker-shaped output -> record-result -> exact three events -> consumed approval sidecar`;
- built and packed negative sweep finds no request-file public Context routing, `--skill-name`, `record-result --file`, Skill invocation, random worker Result/Proposal IDs, or stale workflow examples;
- run full core/CLI/workspace lint, tests, typecheck, build, version preflight, packed-core audit, packed-CLI audit, task validation, and `git diff --check` after each buildable stage and after final cutover.

## Exclusions and Stop Gates

- C06 does not own worker/template/hook/workflow edits; C07 changes them only inside the atomic integration group.
- C06 and C07 do not archive independently before joint public acceptance.
- No Skill source/payload retirement before C08/C09.
- No worker canonical mutation or `record-result` authority.
- No target Repository writes from Context.
- No lock held across worker/operator interaction.
- No contextDigest.
- No Result/Proposal schema-v1 shape change.
- No crash-durability redesign.
- No parser/reducer/projection/lock edit unless the final reviewed plan explicitly expands scope.
- No generic core export-map, root barrel, package version, docs-site, or marketplace change.
- No commit or push during planning.

## Sources

- `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/activation-approval-contract.md`
- `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/procedure-capability-policy-contract.md`
- `.trellis/tasks/archive/2026-07/07-23-add-dual-version-activation-approval-state/design.md`
- `.trellis/tasks/archive/2026-07/07-23-add-activation-approval-commands/research/*.md`
- `.trellis/tasks/07-23-gate-dispatch-context-result-consumption/research/atomic-approval-consumption-result-recording.md`
- `packages/cli/src/commands/research/dispatch-context.ts`
- `packages/cli/src/commands/research/dispatch-authority.ts`
- `packages/cli/src/commands/research/dispatch-activation-materialization.ts`
- `packages/cli/src/commands/research/dispatch-command.ts`
- `packages/cli/src/commands/research/index.ts`
- `packages/core/src/research/ids.ts`
- `packages/core/src/research/store.ts`
- current Claude/Codex worker and shared-hook templates

## Caveats

1. C01 freezes required output IDs but not their allocation algorithm. Approval-prefix derivation is a C06 planning completion, not a prior archived decision.
2. C01 defines stable error conditions but not one total simultaneous-failure order. This report freezes the recommended order for review.
3. C06/C07 ownership is inconsistent with an immediate public CLI cutover. This report freezes a buildable internal-successor transition and assigns final public switch to C07; independent planning review must explicitly accept or replace it.
4. Pure Node read-side checks provide strong detect-and-fail behavior, not mathematical directory-FD-relative race freedom.
5. One append call prevents application-level split commits but does not prove power-loss byte atomicity.

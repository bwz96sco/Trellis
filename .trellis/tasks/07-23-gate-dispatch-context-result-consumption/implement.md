# Implementation Plan

## Preconditions

- [ ] C06 PRD/design/research/manifests validate.
- [ ] C07 PRD/design/implementation/manifests freeze its half of atomic cutover.
- [ ] Independent planning review returns PASS for joint C06+C07 sequence.
- [ ] Record inherited dirty scope; exclude `AGENTS.md`, `CLAUDE.md`, `docs-site`, and `marketplace` from all child edits/staging.
- [ ] Run fresh GitNexus upstream impact before every existing function/class/method edit.
- [ ] Warn before HIGH/CRITICAL edits. Return to planning for any unapproved stop-gate symbol.
- [ ] Activate tasks only after planning approval. Do not archive, commit, or release either child independently.

## Stage 1 — Pure output identity and typed errors

1. Add package-internal `deriveResearchOutputIds(approvalId)`.
2. Parse through existing ID schemas; preserve accepted UUID suffix bytes/casing.
3. Add `OUTPUT_ID_CONFLICT` without changing existing error meanings.
4. Add fixed vectors for lowercase, uppercase hex suffix, repeatability, renewed approvals, malformed IDs, and schema acceptance.
5. Add canonical collision classification for foreign Result, Proposal, and both IDs.

**Verify**

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-dispatch-output-ids.test.ts
pnpm --filter @mindfoldhq/trellis typecheck
```

**Rollback point:** additive new module/error/tests only. Legacy public flow unchanged.

## Stage 2 — No-create materialization reader

1. Add a reader independent from writer-side `dispatch-activation-materialization.ts`.
2. Implement existing-parent traversal, component safety, canonical containment, non-symlink regular targets, read-only `O_NOFOLLOW` where supported, descriptor/path identity checks, and post-read validation.
3. Strict-parse request, activation, and approval envelopes with unknown-key and embedded-ID rejection.
4. Deep-compare against supplied canonical entity.
5. Preserve mapping boundary:
   - request failure -> `REQUEST_STATE_MISMATCH`;
   - activation/approval failure -> `MATERIALIZATION_STATE_MISMATCH`.
6. Document pure Node detect-and-fail limit; make no mathematical `openat` guarantee.

**Verify**

- Missing parents create nothing.
- Symlink parents/finals, non-regular files, path escapes, replaced nodes, identity drift, malformed data, unknown keys, wrong IDs, and semantic drift fail closed.
- Unrelated sibling metadata changes do not count as parent replacement.
- Every test asserts no tree mutation.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-dispatch-materialization-reader.test.ts
pnpm --filter @mindfoldhq/trellis typecheck
```

**Rollback point:** reader remains unused by public path.

## Stage 3 — Internal approved Context successor

1. Add direct/internal resolver accepting `dispatchId`, exact host, and optional test `now`.
2. Strict-read/reduce one mixed-version ledger snapshot without mutation.
3. Reuse existing hierarchy validation with exact C05 error precedence.
4. Validate terminal Dispatch state, activation index/entity, current capability/stage, request materialization, and bindings in exact order:
   1. `REQUEST_DIGEST_MISMATCH`
   2. `PROCEDURE_DIGEST_MISMATCH`
   3. `POLICY_DIGEST_MISMATCH`
   4. `SCOPE_HASH_MISMATCH`
5. Validate complete activation approval index and all grant relations before host selection.
6. Resolve requested-host approval using canonical grant history and captured timestamp.
7. Strict-read activation and selected approval materializations.
8. Derive output IDs and reject unrelated occupation.
9. Return exact outer envelope plus frozen normalized worker input. Keep warnings outside worker input.
10. Do not add `contextDigest` or expand activation/approval schemas.
11. Keep legacy public Context and `--skill-name` command unchanged.

**Verify**

- Direct successor matrix covers every precedence pair.
- Cross-host parity grants Claude and Codex through the same authorization path at one injected timestamp, asserts identical `approval.mode` and `approval.expiresAt`, normalizes only host, approval ID, Result ID, and Proposal ID, checks each host pair equals `deriveResearchOutputIds(approval.id)`, then deep-compares every remaining field. Separate non-parity cases assert mode/expiry differences remain visible.
- Procedure instructions/source/digest are embedded only after full validation.
- Repeated calls for same approval return identical output IDs.
- Full-tree snapshots prove zero writes on every success/failure.
- Existing public request-file Context tests still pass.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-dispatch-approved-context.test.ts \
  test/commands/research-dispatch-context.integration.test.ts
pnpm --filter @mindfoldhq/trellis typecheck
```

**GitNexus gates:** fresh HIGH review before any edit to `resolveDispatchActivationCandidate` or `readCanonicalDispatchRequest`; CRITICAL warning/stop before `resolveResearchProcedureAuthority`.

## Stage 4 — Typed approval consumption and temporary dual-family validation

1. Add minimal core mutation:

```ts
{
  kind: "approval.consume";
  approvalId: ApprovalId;
  resultId: ResultId;
  proposalId: ProposalId;
}
```

2. Build schema-v2 `approval.consumed` draft from canonical approval plus batch envelope.
3. Extend `validateDispatchBatch` to accept only:
   - complete legacy `[result.recorded, proposal.recorded]`;
   - complete successor `[result.recorded, proposal.recorded, approval.consumed]`.
4. Reject consumption-only, partial, mixed, reordered, extra, cross-Dispatch, foreign-approval, and mismatched-ID batches.
5. Preserve existing Decision batch behavior.
6. Do not modify parser, reducer, commit, projection, lock, or durability internals.

**Verify**

- Successor exact kinds/schema versions/refs/payload/order.
- Shared timestamp, actor, provenance, key; contiguous sequences.
- Progressive candidate reduction reaches consumed state.
- Every invalid batch leaves ledger unchanged.
- Legacy two-event public recording still passes during C06 preparation.
- Decision regression passes.

```bash
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/research/activation-approval.test.ts \
  test/research/dispatch.test.ts \
  test/research/store.test.ts \
  test/research/events.test.ts \
  test/research/schema-v1-compatibility.test.ts
```

**GitNexus gate:** fresh HIGH impact and user warning before `validateDispatchBatch`. Stop if work needs `buildValidatedBatch`, `validateResearchBatch`, `commitResearchBatch`, `reduceResearchEvents`, `stableResearchJson`, `parseResearchEvent`, projection writers, or lock helpers.

## Stage 5 — Internal successor Result recording

1. Add package-private `recordApprovedResearchDispatchResult(options)` exported only from its implementation module for focused tests; leave public `recordResearchDispatchResult`, its legacy types, and `record-result --file` untouched.
2. Freeze `RecordApprovedResearchDispatchResultOptions extends ResearchMutationOptions` with `dispatchId`, `approvalId`, discriminated `input`, and optional test-only `now`; freeze `RecordApprovedResearchDispatchResultResult extends ResearchMutationResult` with canonical Result, Proposal, consumed approval, and three nullable materialization paths.
3. Represent input exactly as `{kind: "path", path, cwd}` or `{kind: "stdin", read, cwd}`. Commander captures one absolute cwd and includes it in either variant; keep stdin as a lazy zero-argument reader.
4. Before the first `await`, parse IDs/options, validate captured cwd, resolve optional relative root and any relative path token against that same cwd, and retain resolved strings only. Capture one production timestamp only in the eventual public delegate; internal tests may inject `now`.
5. Strict-read/reduce ledger; classify exact same-key replay before input open/read, stdin invocation, current-time eligibility, authority/binding revalidation, or output-ID collision.
6. Apply frozen new-execution order:
   - Dispatch/hierarchy/completion;
   - activation/index;
   - selected approval relation/status/expiry;
   - request/Procedure/policy/scope bindings;
   - derived output-ID collision;
   - input acquisition and strict parse;
   - derived ID equality;
   - existing v1 relations/portable refs/artifacts.
7. Build exact Result, Proposal, consumption mutation list.
8. Commit through existing serialized lifecycle executor.
9. Materialize Result, Proposal, and consumed approval.
10. Exact replay appends nothing, bypasses expiry/binding/input checks, never opens/reads the pre-resolved path or invokes stdin reader, and repairs all three materializations unless dry-run.
11. Report committed head/failed target/recovery key after post-commit materialization failure.

**Verify**

- Exact input union: both variants carry one validated absolute cwd; relative root and path resolve synchronously against it before first await; stdin thunk reads one object to EOF only on new execution; path reader uses the pre-resolved target, stays contained/regular/non-symlink/stable, and async work never recaptures `process.cwd()`.
- Payload has exactly `{result, proposal}`.
- Approval-derived IDs required.
- Replay succeeds after expiry and after original input disappears; stdin remains unread.
- Same-key mismatch -> `IDEMPOTENCY_KEY_CONFLICT`.
- Different-key duplicate -> `DISPATCH_ALREADY_COMPLETED`.
- Foreign derived IDs -> `OUTPUT_ID_CONFLICT`.
- Revoke/consume, consume/consume, and materialization-failure recovery races converge correctly.
- Dry-run writes nothing.
- Legacy public lifecycle remains fully usable.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-dispatch-approved-result.test.ts \
  test/commands/research-dispatch.integration.test.ts \
  test/commands/research-dispatch-activation.integration.test.ts
pnpm --filter @mindfoldhq/trellis typecheck
```

## Stage 6 — C06 internal readiness gate

1. Run all internal C06 focused tests.
2. Run legacy public lifecycle end to end.
3. Run core/CLI lint, typecheck, build, and affected regression suites.
4. Compare actual GitNexus changed scope with predicted scope.
5. Keep C06 active; do not archive or commit it independently.
6. If any public compatibility break exists before C07 cutover, revert only that C06 stage and re-plan.

## Stage 7 — Joint C06+C07 public cutover

Owned jointly; C07 owns workers/templates/hook/workflow.

1. Public Context becomes `<dispatch-id> --host <claude|codex>`; remove request-file routing and `--skill-name`.
2. Replace public `RecordResearchDispatchResultOptions` with `dispatchId`, `approvalId`, and `ResearchDispatchResultInput`; alias/replace public result type with the frozen successor result; public `recordResearchDispatchResult` captures one timestamp and delegates to `recordApprovedResearchDispatchResult` without exposing `now`.
3. Public Commander becomes `<dispatch-id> --approval <apr-id> --input <path|->`; remove `--file`, capture one absolute cwd, and include it in both path and lazy-stdin variants so relative root/path share one base.
4. Change validator to successor-only Result/Proposal/consumption family.
5. Update Claude worker to consume embedded Procedure and supplied IDs.
6. Update Codex worker to launch from Research control root and consume embedded Procedure and supplied IDs.
7. Update shared Claude hook for normalized envelope.
8. Update generated Research workflow commands/instructions and freeze Codex launch cwd as control root.
9. Remove random worker output-ID generation and Research Skill execution/discovery from active path.
10. Add named host-adapter/public-lifecycle and spec-contract tests; update command, generated-asset, integration, packed, and executable-spec coverage in same boundary.

**Joint verify**

```text
Context
  -> host approval
  -> stable output IDs
  -> host worker {result, proposal}
  -> record-result
  -> Result + Proposal + approval.consumed
  -> consumed approval sidecar
```

Run `packages/cli/test/commands/research-host-adapters.integration.test.ts`. Its shared test helper `packages/cli/test/helpers/research-host-contract.ts` freezes `readInstalledResearchHostAssets`, `runClaudeResearchHookProcess`, `assertCodexResearchWorkerContract`, `makeDeterministicResearchWorkerOutput`, and `runApprovalConsumptionLifecycle`. Claude lane executes the actual installed/generated Python hook with a fake `trellis` binary and captures its one Context argv. Codex lane statically validates installed TOML command ordering/prohibitions because natural-language worker instructions are not deterministic executable code. Both lanes pass a schema-valid oracle output that copies supplied IDs into the real public record-result lifecycle and assert exact three events plus consumed sidecar. This proves adapter/template/API integration, not cloud-model compliance. Live cloud LLM execution is outside release gate unless separately frozen with credentials, commands, timeouts, failure rules, and skip policy. No archive between cutover steps.

## Stage 8 — Full verification and closeout

Focused suites:

```bash
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/research/activation-approval.test.ts \
  test/research/dispatch.test.ts \
  test/research/store.test.ts \
  test/research/events.test.ts \
  test/research/schema-v1-compatibility.test.ts \
  test/research/dispatch-authority.test.ts

pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research.test.ts \
  test/commands/research-dispatch-output-ids.test.ts \
  test/commands/research-dispatch-materialization-reader.test.ts \
  test/commands/research-dispatch-approved-context.test.ts \
  test/commands/research-dispatch-approved-result.test.ts \
  test/commands/research-dispatch.integration.test.ts \
  test/commands/research-dispatch-activation.integration.test.ts \
  test/commands/research-dispatch-context.integration.test.ts \
  test/commands/research-dispatch-compatibility.test.ts \
  test/commands/research-dispatch-arbitrary-metadata-compatibility.test.ts \
  test/commands/research-workflow.integration.test.ts \
  test/commands/research-host-adapters.integration.test.ts \
  test/specs/research-procedure-cutover-specs.test.ts
```

Full gates:

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm build
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
git diff --check
```

Final negative sweep must find no active/built/packed:

```text
request-file Context routing
--skill-name
record-result --file
worker-generated random res_/prp_ IDs
Research Skill invocation/discovery
stale generated workflow examples
```

Final positive sweep must prove Dispatch-ID Context, exact host approval, embedded Procedure, supplied output IDs, `--approval`, `--input`, exact three-event consumption, both workers, and consumed sidecar.

Before any requested commit: run `gitnexus_detect_changes()` and verify no unplanned HIGH/CRITICAL scope.

Joint archive procedure is acceptance-level, not filesystem-transactional:

1. Validate both tasks and capture one expected archive date. Preflight both exact active directories and exact dated archive destinations. Stop on collision, missing source, duplicate/ambiguous active/archive state, or unreadable required metadata/session input.
2. Resolve effective `after_archive` hooks through the same config loader as `task.py`. Require none. If any hook is configured, stop and plan a side-effect-free grouped alternative; moving files back cannot undo an already-run hook.
3. Snapshot exact C06 and C07 `task.json` bytes. Enumerate every session file whose normalized `current_task` points to either child; snapshot each path, existence state, exact bytes, and parsed value.
4. Archive C06 with `--no-commit`.
5. Immediately archive C07 with `--no-commit`; perform no release, commit, implementation, or other action between moves.
6. After both commands report success, verify both active paths are absent; both exact destinations and archived `task.json` files exist; each archived task changes only `status` to `completed` and `completedAt` to the expected date; every other metadata value including parent/children is unchanged; each captured session still exists, removes only the matching normalized `current_task`, and preserves all unrelated parsed data.
7. On failure of either invocation or any post-success verification, inspect both active/archive locations, restore both children to original active paths, restore both exact task metadata snapshots, and restore every captured session path/existence/byte state.
8. Revalidate original parent links, child status/path, absence of both archive destinations, and exact session bytes before retry or further work. If exact restoration fails, stop and report incomplete recovery.

Never claim the two archive operations are transactional. No push.

## Stage 9 — Joint remediation before closeout

1. Add `validateResearchBatchReadOnly` through existing Research subpath; call existing `buildValidatedBatch` without editing lock/commit/parser/reducer/projection internals.
2. Migrate `executeResearchMutations`, `executeRepositoryDispatchMutations`, and `executeResearchLifecycleMutations` dry-run branches only. Preserve all commit branches and result shapes.
3. Add staged revalidation using `resolveResearchProcedure`, direct Procedure digest comparison, `readResearchProjectPolicy`, direct policy comparison, `resolveResearchEffectiveAuthority`, and `evaluateResearchAutomaticEligibility`. Do not call or edit combined Procedure authority resolver.
4. Extend Context-only Repository resolution with supplied state and raw remote. Reuse one cache-free observation; no `repo-observations.json` or `git status`.
5. Switch approved Context and Result revalidation to staged path; keep broad activation relation after four exact binding checks.
6. Adapt approved Context activation failures to exact public Context envelope.
7. Move approved-result current-clock validation/serialization after strict ledger read and exact replay classification.
8. Add narrow hardened Result/Proposal sidecar wrappers; preserve sequential committed recovery and same-key repair.
9. Add focused precedence, zero-write, replay-clock, sidecar, and dry-run tests inside existing C06-owned files plus core `store.test.ts`.
10. Update existing five CLI scenario blocks and core guard only after behavior passes.
11. Run full CLI suite twice, all core/CLI quality/build/packed gates, task validation, independent review, and GitNexus changed-scope detection.

**Remediation stop gates:** stop if exact scope hash requires editing `resolveDispatchActivationCandidate`, `normalizedArtifact`, `resolveRepositoryForUse`, `resolveResearchProcedureAuthority`, `buildValidatedBatch`, `validateResearchBatch`, `commitResearchBatch`, or parser/reducer/projection/lock/durability internals. Keep C06/C07 active; no archive, commit, release, or push.

# Implementation Plan

## Preconditions

- [ ] C06 and C07 planning artifacts/manifests validate.
- [ ] Independent joint planning review returns PASS.
- [ ] C06 internal successor Context, output IDs, consumption, replay, and temporary dual-family validation pass direct tests while legacy public flow remains usable.
- [ ] Record inherited dirty scope; exclude `AGENTS.md`, `CLAUDE.md`, `docs-site`, and `marketplace`.
- [ ] Run fresh GitNexus upstream impact before every existing function/class/method edit.
- [ ] Warn before HIGH/CRITICAL edits; stop for any unapproved C06 stop-gate or new CRITICAL boundary.
- [ ] Activate C06/C07 only through parent-authorized atomic-group sequence.
- [ ] Do not archive, release, commit, or push either child between incompatible cutover steps.

## Stage 1 — Freeze baseline and impacts

1. Run current focused public command, Context, recording, worker/hook/workflow, configurator, install/update, build, and packed tests.
2. Record exact expected legacy failures that C07 replaces; do not “fix” unrelated failures.
3. Run fresh impacts for:
   - public Context/record-result registration callbacks;
   - C06 public delegates;
   - `validateDispatchBatch`;
   - every active legacy routing export before deletion;
   - every edited Python/TypeScript function in hook/collector/audit paths.
4. Report blast radius before edits. HIGH/CRITICAL changes require explicit warning.

**Rollback point:** no production changes.

## Stage 2 — Atomic public command wiring

1. Switch public Context positional argument from request file to Dispatch ID.
2. Retain exact `--host`, `--root`, and `--json`; remove repeatable `--skill-name` and discovered-name callback state.
3. Delegate Context to C06 approved resolver; preserve command literal `research dispatch context`.
4. Replace public record-result options/result types with C06 frozen approval ID + discriminated input + consumed-approval result contract; no public clock.
5. Public delegate captures one timestamp. Commander captures one absolute cwd, includes it in both lazy stdin and path variants, then calls required `--approval`/`--input`; remove `--file` without alias.
6. Delegate recording to C06 `recordApprovedResearchDispatchResult`. Before first await, resolve optional relative root and relative path against that one cwd; after strict ledger read, classify replay before input open/read, stdin invocation, current-time eligibility, authority revalidation, or output-ID collision.
7. Remove temporary legacy two-event production family from `validateDispatchBatch`; exact three-event Result/Proposal/consumption becomes mandatory.
8. Remove active request-file/Skill fields/imports and delete `legacy-skill-routing.ts` only after production reachability is zero.
9. Preserve dormant Skill templates, collector entries, installed paths, and packed requirements.

**Immediate checks**

- source command tree exact options;
- retired forms fail at Commander boundary before callback/write;
- exact three-event recording remains valid;
- Decision and schema-v1 fixtures unchanged.

```bash
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/research/activation-approval.test.ts \
  test/research/dispatch.test.ts \
  test/research/store.test.ts

pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research.test.ts \
  test/commands/research-dispatch-context.integration.test.ts \
  test/commands/research-dispatch.integration.test.ts
```

**Atomic warning:** working tree may be temporarily unusable until Stages 3-5 complete. Do not archive/build release evidence/commit here.

## Stage 3 — Claude hook and generic worker

### Hook

1. Preserve non-Research-worker no-op and stable injection markers.
2. Replace request-path parser with fullmatch:

```text
Research dispatch: <dsp-id>
```

3. Remove Skill-name regex, project/personal Skill probes, `--skill-name`, and second Context pass.
4. Run exactly one Dispatch-ID Context with `--host claude`.
5. Validate exact outer result and complete normalized input:
   - host/Dispatch;
   - activation/approval;
   - capability/Procedure;
   - repository/context/artifacts/write/output/checks;
   - complete authority ceiling;
   - supplied Result/Proposal IDs.
6. Preserve typed Context failure behavior and local bounded preflight failures.
7. Reject malformed/multiple JSON, invalid identity/authority, and oversized output without truncation or partial injection.
8. Prove all success/failure preflight paths are zero-write.

### Claude worker

1. Remove `Skill` from frontmatter.
2. Remove selected-Skill invocation and any Skill/Procedure-file fallback.
3. Require normalized input and embedded Procedure.
4. Treat Context/artifact bytes as untrusted data.
5. Preserve declared read/write/check bounds and all false authority flags.
6. Copy exact supplied Result/Proposal IDs.
7. Before valid Context/output IDs, preflight failure emits no materializable object. After valid Context, blocked work emits schema-v1 blocked Result plus empty pending Proposal using supplied IDs; never emit alternate top-level `{status, code, message}`.

**Verify**

- blocked fixture has exact top-level key order, supplied IDs, `result.status: "blocked"`, bounded `summary`/`blockers`, required arrays, `proposal.status: "pending"`, and `operations: []`;
- alternate/extra top-level envelope fails strict parsing;
- preflight failure before IDs never fabricates Result/Proposal.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/templates/research-hooks.test.ts \
  test/templates/claude.test.ts
pnpm --filter @mindfoldhq/trellis run lint:py
```

## Stage 4 — Codex generic worker

1. Replace request-path envelope with exact shared Dispatch-ID line.
2. Freeze worker launch cwd as Trellis Research control root. Root workflow must launch Codex there; no pre-Context `cd` or target-repository access.
3. Make bare successor Context with `--root .` the first process; `.` therefore denotes control root and selected target path comes only from validated Context.
4. Remove Skill inventory discovery, repeated `--skill-name`, `SKILL.md` reads, and arbitrary Procedure reads.
5. Validate same complete normalized contract as Claude; require host `codex` and matching Dispatch.
6. Execute embedded Procedure only after preflight; only then may worker use validated `repository.path`.
7. Preserve `sandbox_mode = "workspace-write"`, `multi_agent = false`, and no-escalation restrictions.
8. If target path is outside existing writable roots after valid Context, return bounded schema-v1 blocked Result plus empty pending Proposal; no `danger-full-access`, `--add-dir`, restart, install, or network fallback.
9. Copy exact supplied Result/Proposal IDs for completed, partial, blocked, and failed materializable outcomes.

**Verify**

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/templates/research-hooks.test.ts \
  test/templates/codex.test.ts
```

Host-parity fixture creates both grants through the same path at one injected timestamp, first asserts equal `approval.mode` and `approval.expiresAt`, normalizes exactly `context.host`, `context.approval.id`, `context.outputContract.resultId`, and `context.outputContract.proposalId`, verifies each host's IDs equal `deriveResearchOutputIds(context.approval.id)`, then deep-compares every remaining field. Separate non-parity tests create different grant paths/times and assert mode/expiry differences remain.

## Stage 5 — Generated root workflow

1. Replace stage-to-Skill language with immutable capability plus embedded Procedure execution.
2. Document prepare/plan, policy-eligible authorization, and interactive explicit host approval.
3. Call public Dispatch-ID Context and retain approval/output contract.
4. For Codex, launch worker process with cwd equal to Research control root; never `cd` to target Repository before worker Context succeeds.
5. Invoke exact line:

```text
Research dispatch: <dsp-id>
```

6. Validate returned JSON and supplied IDs root-side.
7. Record through `--approval` and `--input`.
8. State worker cannot record/consume/approve/decide/commit/push.
9. Keep apply/reject as separate root review.
10. Remove request-file, `--skill-name`, selected Skill, random output ID, and `record-result --file` examples.

**Verify**

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/templates/trellis.test.ts \
  test/commands/research-workflow.integration.test.ts
```

## Stage 6 — Collector, install, and update propagation

1. Retain existing template readers, output paths, and configurator structure.
2. Update exact collected byte assertions for worker/hook/workflow.
3. Keep all Research stage Skill collection/path assertions until C08.
4. Verify fresh Claude-only, Codex-only, and dual-host install bytes.
5. Verify pristine historical active files update to successor bytes.
6. Verify modified/user-owned worker/hook/workflow conflicts remain preserved/reported.
7. Verify `.trellis/research/**` remains unchanged.
8. Verify active installed files do not reference dormant Skills.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/templates/research-payload-exact.test.ts \
  test/configurators/index.test.ts \
  test/configurators/platforms.test.ts \
  test/commands/init.integration.test.ts \
  test/commands/init-research-only.integration.test.ts \
  test/commands/update.integration.test.ts
```

## Stage 7 — Built parser and packed active-content audit

1. Extend built command-surface tests for exact options through `trellis` and `tl`.
2. Positive parser cases:
   - Dispatch-ID Context for both hosts;
   - record-result path input;
   - record-result stdin input.
3. Negative parser cases:
   - request path positional legacy;
   - `--skill-name`;
   - `record-result --file`.
4. Every negative case: nonzero Commander failure, callback not entered, full filesystem unchanged.
5. Add packed active-content audit over command/worker/hook/workflow files.
6. Wire `packages/cli/scripts/release-preflight.js` to extract those files from the actual `.tgz` with existing `tar -xOf` and pass extracted bytes to the content auditor; do not audit only source/dist or tar entry names.
7. Reject legacy active routing/invocation/random-ID tokens.
8. Positively require successor command, Procedure, supplied-ID, approval/input, one-pass hook, and authority contracts.
9. Keep dormant Research Skill paths required; do not add global Skill-path/content prohibition.
10. Add packed-audit mutation fixtures plus a real `verify-packed-cli` tarball mutation proving each forbidden token class fails.
11. Add no dependency solely for tar inspection.
12. Clean build; never edit `dist` manually.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/cli/research-only-surface.integration.test.ts \
  test/scripts/packed-cli-audit.test.ts
pnpm --filter @mindfoldhq/trellis build
node packages/cli/scripts/release-preflight.js verify-packed-cli
```

## Stage 8 — Executable spec update

After actual behavior passes focused tests, use three disjoint file sets.

**Index-only:**

```text
.trellis/spec/cli/backend/index.md
```

**Scenario files, exactly five:**

```text
.trellis/spec/cli/backend/commands-research.md
.trellis/spec/cli/backend/research-worker-hooks.md
.trellis/spec/cli/backend/platform-integration.md
.trellis/spec/cli/backend/filesystem-safety.md
.trellis/spec/cli/unit-test/integration-patterns.md
```

**Guard-only:**

```text
.trellis/spec/core/backend/research-state.md
```

Each scenario file contains exactly one block with this exact heading syntax:

```markdown
## Scenario: Research Procedure dispatch cutover

### 1. Scope / Trigger
### 2. Signatures
### 3. Contracts
### 4. Validation & Error Matrix
### 5. Good / Base / Bad Cases
### 6. Tests Required
### 7. Wrong vs Correct
```

Extraction starts at exact `## Scenario: Research Procedure dispatch cutover` and ends immediately before next `## ` heading or EOF. Each exact `###` heading occurs once and in order. Index contains links only; it is not a scenario file. Core guard verifies exact successor Result/Proposal/consumption wording and is not required to contain the scenario.

Specs must distinguish C07 active execution removal from C08 generation/installed retirement and C09 source/packed removal.

Add `packages/cli/test/specs/research-procedure-cutover-specs.test.ts` with local helpers `readSpec`, `extractScenario`, and `assertOrderedSevenSections`. Assert index links all five scenario files, including correct relative link to unit-test integration contract; validate exact scenario boundaries/headings in only those five files; validate core guard wording separately.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/specs/research-procedure-cutover-specs.test.ts
```

## Stage 9 — Host-adapter and public-lifecycle contract verification

Add `packages/cli/test/helpers/research-host-contract.ts` with exact helpers:

- `readInstalledResearchHostAssets(root, host)` — reads installed worker/hook/workflow bytes from a generated init fixture;
- `runClaudeResearchHookProcess(options)` — executes actual generated Python hook with fake `trellis` on `PATH`, captures argv/call count, and returns injected payload/typed denial;
- `assertCodexResearchWorkerContract(toml)` — statically verifies exact invocation grammar, control-root cwd premise, Context first process, ordered markers, supplied-ID contract, and forbidden fallback tokens;
- `makeDeterministicResearchWorkerOutput(context, outcome)` — creates strict schema-v1 `{result, proposal}` using only supplied IDs; this is a fixture oracle, not a model simulator;
- `runApprovalConsumptionLifecycle(options)` — invokes real public prepare/plan/authorize-or-approve/Context/record-result APIs or CLI and returns canonical events/materializations.

Add `packages/cli/test/commands/research-host-adapters.integration.test.ts` with two lanes:

1. **Claude adapter lane**: generate/install bytes, execute actual hook subprocess, assert exact one Context argv and complete injection, feed oracle output into public record-result.
2. **Codex adapter lane**: generate/install bytes, run static TOML contract validator because natural-language instructions cannot be deterministically executed, feed equivalent oracle output into public record-result.

Both lanes verify:

```text
prepare/plan
  -> equivalent host grants created through same path/time
  -> public Context
  -> adapter/template contract
  -> oracle output with exact supplied IDs
  -> public record-result --approval --input
  -> Result + Proposal + approval.consumed
  -> Result/Proposal files + consumed approval sidecar
  -> duplicate rejection / same-key recovery
```

Assertions:

- parity fixture has identical approval mode/expiry before four-field normalization;
- exact event schemas `[1, 1, 2]` and kinds/order;
- one timestamp/actor/provenance/key and contiguous seq;
- approval relation/output IDs match;
- worker/template bytes forbid recording/consumption;
- other host grant remains unchanged where applicable;
- zero-write Context/preflight failures;
- Codex Context command is first process from control-root cwd;
- target scope/network/nested-agent/Git/canonical-mutation prohibitions.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/templates/claude.test.ts \
  test/templates/codex.test.ts \
  test/templates/research-hooks.test.ts \
  test/commands/research-host-adapters.integration.test.ts
```

Generated template byte checks and Claude hook process execution are real. Codex prose validation and oracle worker output do not prove cloud-model compliance. Live cloud LLM execution is not a release gate unless a separate contract freezes credentials, exact commands, timeouts, failure classification, and skip policy.

## Stage 10 — Full regression and closeout

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
  test/templates/research-hooks.test.ts \
  test/templates/claude.test.ts \
  test/templates/codex.test.ts \
  test/templates/trellis.test.ts \
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
uv run python .trellis/scripts/task.py validate .trellis/tasks/07-23-gate-dispatch-context-result-consumption
uv run python .trellis/scripts/task.py validate .trellis/tasks/07-23-replace-host-execution-generic-workers
git diff --check
```

Final source/dist/install/packed negative sweep:

```text
request-file public Context routing
--skill-name
record-result --file
active selectedSkill/optionalSkill/fallbackSkill routing
Claude Skill tool/invocation
Codex Skill inventory/SKILL.md read
worker-generated random res_/prp_ IDs
hook second Context pass/Skill probe
stale workflow examples
```

Do not fail on dormant physical Research Skill files before C09.

Run GitNexus changed-scope detection/review. Verify every existing edited symbol had prior impact, no unapproved HIGH/CRITICAL expansion, and no docs-site/marketplace/package-version/generic-export/C08/C09 leakage.

After all joint checks pass, archive with this recoverable sequence:

1. Validate both tasks and capture one expected archive date. Preflight exact C06/C07 active paths and both exact dated archive destinations; stop on missing source, existing destination, duplicate/ambiguous active/archive state, or unreadable required metadata/session input.
2. Resolve effective `after_archive` hooks through the same config loader used by `task.py`; require none. If hooks exist, stop and design a side-effect-free grouped alternative because moving files back cannot undo hook effects.
3. Snapshot exact bytes of both `task.json` files. Enumerate every session file whose normalized `current_task` points to C06 or C07; record each path, existence state, exact bytes, and parsed value.
4. Archive C06 with `--no-commit`.
5. Immediately archive C07 with `--no-commit`; perform no release, commit, implementation, or other action between moves.
6. After both commands report success, verify both active paths are absent; both exact destinations and archived `task.json` files exist; each archived task changes only `status` to `completed` and `completedAt` to expected date; all other metadata including parent/children is unchanged; every captured session still exists, removes only matching normalized `current_task`, and preserves unrelated parsed data.
7. Failure of either invocation or any post-success verification triggers group recovery: inspect active/archive locations, restore both children to original active paths, restore exact metadata bytes, and restore every captured session path/existence/byte state.
8. Revalidate original parent/child status and paths, absence of both archive destinations, and exact restored session bytes before retry or further work. Stop and report incomplete recovery if exact restoration fails.

This is acceptance-level grouping, not a filesystem transaction. No commit or push without fresh explicit authorization.

## Stop and Rollback Rules

- If C06 internal readiness is incomplete, do not begin public cutover.
- If any public producer/consumer remains legacy, do not accept, archive, build release evidence, or commit partial group.
- If a CRITICAL parser/reducer/commit/projection/lock/Procedure-authority edit becomes necessary, return to planning.
- If implementation accidentally removes dormant Skill generation/source/packed paths, restore that C07-unowned change and defer to C08/C09.
- Before release, failed cutover rolls back as one group, not surface-by-surface.
- Never rewrite/downgrade canonical v2 ledger history. Operational rollback is approval withholding/revocation plus forward fix.

## Stage 11 — Joint authority/read-only remediation

1. Keep every worker, hook, workflow, install, and packed asset byte-frozen.
2. Consume C06 staged binding revalidation and one-state/one-observation Context without adapter-side recomputation.
3. Verify exact public Context error envelope remains non-materializable for both host paths.
4. Verify snapshot-only dry-run creates no runtime/lock/projection state across generic and Dispatch lifecycle commands.
5. Verify exact replay ignores invalid current clock and original input availability, then repairs hardened Result/Proposal/approval sidecars without append.
6. Re-run host-adapter lifecycle, executable spec contract, built parser, install/update, packed active-content, full CLI twice, full core, lint/typecheck/build, task validation, and GitNexus changed-scope review.
7. Keep C06+C07 active until joint PASS. No archive, commit, release, or push.

# Implementation plan

## Success loop

1. Production-built fixture exposes current drift -> verify new tests fail for Claude duplicate behavior.
2. Thin Claude adapter delegates all decisions to C07 -> verify parity and zero-write tests pass.
3. Bounded Claude worker invokes validated selected skill -> verify contract/materialization tests pass.
4. Code-specs match executable behavior -> independent check confirms no drift.
5. Full CLI gates pass -> archive task with `--no-commit`; unblock C10 only then.

## Step 0 — Freeze scope and baseline

- Confirm no C09 production/test/spec file has unrelated local edits that conflict with task description.
- Keep `docs-site` and `marketplace` untouched.
- Record current focused C07 and hook test baseline.
- Reuse recorded GitNexus LOW upstream impacts. Run additional impact before editing any newly discovered existing symbol.

Verify:

```bash
pnpm --filter @mindfoldhq/trellis test -- research-dispatch-context.integration.test.ts research-hooks.test.ts codex.test.ts
```

Rollback point: no production changes.

## Step 1 — Build shared canonical fixture support

- Extract minimal helper from current C07 integration setup, or add a test-local helper imported by parity tests.
- Construct valid state only through production Research operations.
- Return canonical IDs/pointer/roots plus bounded mutation/snapshot helpers.
- Remove duplicate `OWNER_BY_STAGE` from parity path. Iterate `RESEARCH_STAGE_CAPABILITIES`.
- Keep production source untouched in this step.

Verify:

- fixture contains real Dispatch event;
- direct Claude/Codex C07 calls succeed;
- full-tree snapshot remains stable;
- descriptive `expectedOutputs` survives as text.

Rollback point: test helper only.

## Step 2 — Add failing Claude adapter tests

Add tests before hook rewrite for:

- exact complete one-line envelope;
- ordinary/other-agent/already-injected prompt executes no process;
- pass-1 argv;
- exact project/personal optional file -> one pass-2 argv with one name;
- missing optional file -> no pass 2;
- typed C07 failure denial;
- missing process/malformed/multiple JSON/success stderr/contract mismatch denial;
- child repository root discovery;
- exact injected JSON equality;
- no prompt tail;
- full-tree zero-write.

Fake `trellis` records argv outside Research control tree and emits precomputed direct C07 output.

Expected before implementation: current hook fails new convergence assertions.

## Step 3 — Replace Claude duplicate validator

Edit `inject-subagent-context.py` surgically:

- delete Dispatch-specific Python stage map, schema/projection/hierarchy/Repository/artifact/path/Task/output validation;
- retain unrelated hooks and narrow platform/agent routing;
- implement exact envelope parser;
- implement direct C07 process adapter with bounded output capture;
- validate one JSON success or typed failure;
- implement post-pass-1 exact direct skill metadata probe;
- run optional final pass;
- inject exact final JSON;
- deny on invalid envelope/preflight.

Do not shell-wrap or add manual fallback. Do not invoke process for normal prompts.

Verify focused hook tests after each sub-step.

Rollback point: restore this file only; C07/core state remains untouched.

## Step 4 — Tighten Claude worker

Edit `trellis-research-worker.md`:

- add `Skill`;
- remove `Glob` and `Grep`;
- require injected C07 JSON and exact authority/output fields;
- invoke exactly selected skill;
- document blocked Result behavior when invocation fails;
- match Codex bounded read/write/check/forbidden/output contract where host mechanics allow;
- forbid routing from compatibility metadata and fallback after selection.

Update materialization/template tests. Verify installed/built worker bytes match source where current tests expose that invariant.

Rollback point: worker template only.

## Step 5 — Complete parity matrix and drift invariants

- Run all nine active stages plus `complete` through direct C07 parity.
- Cover compatibility warnings, canonical-state mutations, lifecycle failures, Repository/artifact/path containment, binding precedence, and projections-not-authority cases.
- Compare provider-neutral outputs deeply.
- Add core-derived invariant for any remaining SessionStart/Codex presentation list.
- Keep C07/core unchanged unless a shared failing fixture proves a common defect. If needed, stop, run new symbol impacts, document defect, then make smallest common fix.

Hard gate: no unexplained Claude/Codex decision mismatch.

## Step 6 — Update code-specs

Update `.trellis/spec/cli/backend/research-worker-hooks.md` and `.trellis/spec/cli/backend/commands-research.md`.

Each cross-layer scenario includes:

1. Scope / Trigger
2. Signatures
3. Contracts
4. Validation & Error Matrix
5. Good/Base/Bad Cases
6. Tests Required
7. Wrong vs Correct

Remove stale compatibility-validator, prompt-tail, Task-dereference, expected-output-path, strict-owner-failure, and launch-failure-worker statements.

Update unit-test convention only if shared canonical fixture pattern needs reusable project guidance.

## Step 7 — Independent implementation and check passes

After task activation:

1. Dispatch `trellis-implement` with current task context.
2. Run focused tests.
3. Dispatch independent `trellis-check`.
4. Apply only verified fixes.
5. Repeat check until no blocker.

No worker may commit or mutate canonical Research state.

## Step 8 — Verification

Focused:

```bash
pnpm --filter @mindfoldhq/trellis test -- research-capabilities.test.ts research-dispatch-context.integration.test.ts research-hooks.test.ts codex.test.ts
```

Full package/workspace:

```bash
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm --filter @mindfoldhq/trellis build
git diff --check
```

Also verify:

- exact source/built Claude and Codex worker artifacts where applicable;
- no `docs-site` or `marketplace` changes from C09;
- no canonical Research mutation from hook tests;
- ordinary prompts spawn zero C07 processes;
- GitNexus change detection shows expected hook/worker/test/spec flows only.

Report skipped checks explicitly.

## Step 9 — Close task

- Mark acceptance criteria from actual evidence only.
- Archive with task tooling `--no-commit`.
- Keep changes uncommitted unless user asks.
- Update migration parent state.
- Only after successful archive may C10 Channel/Mem/workflow removal begin.

## Rollback

- Failed adapter parity -> revert only C09 hook/worker/test/spec diff; keep C07/C08 and Channel.
- Shared C07 defect -> do not restore Python authority; fix common core after impact review or leave task blocked.
- Optional discovery uncertainty -> bundled pass-1 result is safe only when no exact direct metadata exists; never guess other roots.
- No ledger/projection rewrite, cleanup, reset, stash, force push, or history rewrite.

# Implementation Plan — Amend CLI approved-context timeout

## Preconditions

- The approved R3 completion plan is the authority for this forward overlay.
- Preserve all existing R3, Core Channel, and CLI stabilization changes and all unrelated dirty paths.
- Leave `f2d27484`, `480a05c7`, `d9c550ae`, `c1e1c40e`, retained evidence, and failed-attempt history unchanged.
- Never reset, stash, clean, amend, rebase, squash, merge/cherry-pick `upstream/main`, force-push, publish, activate, run providers, release, or begin T7.

## Stage 1 — Validate and commit this governance overlay alone

1. Require this task directory to contain exactly:
   - `task.json`;
   - `prd.md`;
   - `design.md`;
   - `implement.md`;
   - `implement.jsonl`;
   - `check.jsonl`.
2. Confirm there is no `research/` directory or extra file.
3. Run `task.py validate` and `task.py start` through the repository workflow.
4. Run path-scoped `git diff --check` for this task directory.
5. Stage exactly these six files, inspect staged names and the complete staged diff, and prove no technical or unrelated path is staged.
6. Run staged GitNexus change detection using repository-established syntax.
7. Commit the six-file overlay alone as a new forward descendant. Do not push.

Stop if the inventory is not exactly six files, the task authorizes more than one additional CLI path, the topology differs from `1/83/2` and union 86, or technical/unrelated content would be staged.

## Stage 2 — Reconfirm baseline and analyze impact

1. Confirm the existing technical working set is the governed 21-path union.
2. Keep `AGENTS.md`, `CLAUDE.md`, submodules, private records, governance files, and protected evidence outside the technical set.
3. Confirm `packages/cli/test/commands/research-dispatch-approved-context.test.ts` is unchanged before editing.
4. Authenticate the frozen Procedure test at 19,395 bytes and SHA-256 `1f5a323935e1ea82128cd700618cab91fec66bd8157c2696fe61514d27144673`.
5. Confirm the retained T4 and other protected evidence bytes remain unchanged.
6. Treat `upstream/main` at `a8a50a5e` as read-only evidence: it has no direct fix and must not be synchronized before R3.
7. Recover the exact GitNexus impact command from project guidance and run upstream impact analysis for the callback beginning near line 298 of `research-dispatch-approved-context.test.ts`.
8. Report direct callers, affected processes/flows, and risk before editing.

Stop on HIGH/CRITICAL risk, unexpected production flow, baseline drift, evidence drift, or a required fifth CLI path.

## Stage 3 — Apply the one-line callback-local budget

1. Modify only the terminator near line 405 of the callback beginning near line 298:

   ```ts
     }, 60_000);
   ```

2. Do not change the enclosing `describe` budget near line 254, callback body, four cumulative Git-backed fixture/snapshot sequences, Git operations, assertions, helpers, lane membership, `vitest.config.ts`, production code, package scripts, or Core configuration.
3. Inspect the path-scoped diff immediately and require exactly one changed line.
4. Confirm there are exactly three callback-local `60_000` budgets across exactly four authorized CLI paths.

Stop if any second line changes or any additional technical path is required.

## Stage 4 — Focused, topology, and immutable verification

Run serially:

1. Authenticate frozen Procedure and retained T4 bytes before tests.
2. Run the Procedure generator verifier with bytecode disabled:

   ```text
   PYTHONDONTWRITEBYTECODE=1 uv run python packages/cli/scripts/research-methodology-207-generate.py --verify
   ```

3. List all Vitest projects in machine-readable form and prove exact set equality:
   - Procedure = exact frozen file, order 1, one worker;
   - normal = exact governed 83 files, order 2, four workers;
   - shared-`dist` = exact two build/pack files, order 3, one worker;
   - pairwise intersections are empty;
   - union is the unchanged 86-file baseline.
4. Recover the exact Vitest command form from the active configuration/artifacts and run the affected callback alone through `--project normal`.
5. Run the complete `research-dispatch-approved-context.test.ts` through `--project normal`.
6. Run the complete frozen Procedure project.
7. Run one normal test that consumes `TRELLIS_TEST_BUILT_CLI_ROOT`.
8. Run the complete shared-`dist` project three consecutive times.
9. Run targeted ESLint over the four authorized CLI paths and the established direct `vitest.config.ts` typecheck.
10. Repeat generator verification and frozen Procedure/T4 authentication.

Stop on callback or file failure, callback runtime above 60 seconds, assertion drift, inventory drift, Procedure timeout, shared-`dist` corruption, or evidence drift.

## Stage 5 — Exact CLI and static gates

Run without worker overrides or retry wrappers:

```text
NODE_OPTIONS= pnpm --filter @mindfoldhq/trellis test
NODE_OPTIONS= pnpm --filter @mindfoldhq/trellis test:coverage
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis typecheck
pnpm --filter @mindfoldhq/trellis build
pnpm typecheck
```

A focused pass is not sufficient. Stop on a new failure family instead of widening another timeout, changing lane membership, reducing workers, or adding serialization.

## Stage 6 — Complete Core and retained R3 gates

### Core

Reuse the earlier complete Core result only if the exact current Channel test bytes are authenticated. Otherwise run the focused Channel commands recorded in `.trellis/tasks/08-16-stabilize-core-channel-runtime-test/implement.md`, then:

```text
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core build
```

### Packed and release preflights

```text
pnpm --dir packages/core exec vitest run test/scripts/packed-core-audit.test.ts --reporter=dot
pnpm --dir packages/cli exec vitest run test/scripts/packed-cli-audit.test.ts --reporter=dot
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
```

### T4, I1, I2, and archive isolation

Recover current-worktree T4 and archive-isolation command forms from committed task artifacts, then run them with:

```text
pnpm --dir packages/cli exec vitest run test/commands/research-v131-integration.test.ts --reporter=dot
pnpm --dir packages/cli exec vitest run test/commands/research-v131-integration-successor.test.ts --reporter=dot
node --check packages/cli/scripts/research-v131-installed-package-audit.mjs
node --check packages/cli/scripts/research-v131-installed-package-audit-successor.mjs
node packages/cli/scripts/research-v131-installed-package-audit.mjs --verify
node packages/cli/scripts/research-v131-installed-package-audit-successor.mjs --verify
```

Historical verification must read retained committed Git objects only. It must not discover protected worktrees, read private/untracked source, recapture live state, regenerate evidence, or write historical evidence.

Stop if any complete gate fails, a new failure family/path appears, or a verifier crosses its governed read/write boundary.

## Stage 7 — Prove containment and compute the exact technical set

1. Run `git diff --check`.
2. Reauthenticate the frozen Procedure bytes/digest, retained T3/T4 evidence, I1 commit/tree/blob/length/SHA-256, I2 commit/tree/blob/length/SHA-256, T6 Attempts 1–3, and every referenced hash manifest.
3. Prove protected historical evidence has no diff.
4. Compute the expected technical set from authoritative task inventories:
   - R3 repair: 17 paths;
   - Core Channel: 2 paths;
   - CLI stabilization after this overlay: 4 paths;
   - deduplicate only `research-methodology-v131-coverage.test.ts`.
5. Require the result to equal exactly `17 + 2 + 4 - 1 = 22` unique paths.
6. Require the technical working set to equal that exact set. Keep governance, `AGENTS.md`, `CLAUDE.md`, submodules, private records, protected evidence, and all other paths outside it.

Stop on any authentication failure, unexpected diff, or set mismatch.

## Stage 8 — Stage, detect, and commit the exact R3 subject

1. Stage the 22 authorized paths individually, including the untracked archive-isolation regression. Never use `git add .` or `git add -A`.
2. Compare `git diff --cached --name-only` with the computed allowlist by exact set equality, not count alone.
3. Inspect the complete staged diff and run staged `git diff --check`.
4. Recover the exact GitNexus compare/staged syntax from project guidance and run change detection against `variant/research-workflow`.
5. Require only the governed R3, Channel helper, three-lane CLI, and one-line approved-context timeout scopes, with no unexplained HIGH/CRITICAL result.
6. Commit the exact 22-path R3 technical subject as a new descendant. Do not push.
7. Verify the resulting commit contains exactly the approved 22 paths.

Stop on staged-set mismatch, governance/unrelated content staged, unexpected GitNexus symbols/flows, HIGH/CRITICAL impact, or any failed gate.

## Stage 9 — Close task records

Only after the technical commit succeeds:

1. Complete this approved-context overlay task.
2. Complete the retained CLI stabilization tasks.
3. Complete the Core Channel stabilization task.
4. Complete or unblock the R3 repair task.
5. Keep task-status bookkeeping separate from the technical commit and, if tracked, commit it only as a later governance-only descendant.

## Success Boundary

Completion requires a separately committed six-file overlay, the sole one-line callback-local timeout correction, exactly three local 60-second budgets across four CLI paths, unchanged `1/83/2` lane ownership and union 86, all focused/full/static/Core/packed/historical gates, byte-identical protected evidence, exact 22-path staging and commit, and clean GitNexus scope. No upstream synchronization, push, publication, release, activation, provider execution, T7 work, or history rewrite occurs.

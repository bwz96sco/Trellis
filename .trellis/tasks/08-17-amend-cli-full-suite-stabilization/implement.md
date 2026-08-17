# Implementation Plan — Amend CLI full-suite stabilization

## Preconditions

- The corrected plan has user approval.
- Preserve all existing R3/Channel changes and unrelated dirty paths.
- Never reset, stash, clean, amend, rebase, squash, force-push, publish, activate, run providers, release, or begin T7.

## Stage 1 — Commit this overlay alone

1. Complete and validate these six task files.
2. Start this task through `task.py start`.
3. Run `git diff --check` for this task directory.
4. Stage exactly its six files and inspect the staged inventory/diff.
5. Run GitNexus staged change detection.
6. Commit the overlay as a new descendant. Do not push or edit the original stabilization task.

## Stage 2 — Confirm impact scope

Confirm the prior LOW GitNexus analysis covers the exact three technical files. Rerun upstream impact analysis only for any newly indexed config symbol. Report direct callers, affected processes, and risk. Stop on HIGH/CRITICAL, unexpected production flows, or a required fourth path.

## Stage 3 — Apply the three-file correction

1. Keep the two already implemented 60-second callback budgets unchanged.
2. Keep the Procedure test byte-identical with its explicit 180-second timeout.
3. In `vitest.config.ts`, define one exact Procedure-test constant and the exact two shared-`dist` paths.
4. Configure explicit projects:
   - Procedure: order 1, one worker, exact file, setup only;
   - normal: order 2, four workers, excludes all three special paths, setup plus global setup;
   - shared-`dist`: order 3, one worker, exact two files, setup only.
5. Keep explicit 10-second defaults in all projects and root coverage unchanged.
6. Do not edit package scripts, production code, Core config, the real build tests, or retained evidence.

## Stage 4 — Static and inventory verification

1. Run targeted ESLint over the config and two modified tests.
2. Typecheck `vitest.config.ts` directly.
3. List all three project inventories in machine-readable form.
4. Assert exact sets, not counts only:
   - Procedure = exact one file;
   - shared-`dist` = exact two files;
   - normal = baseline minus those three paths;
   - pairwise intersections empty;
   - counts 1/83/2 and union 86.

## Stage 5 — Focused and immutable verification

1. Record the frozen Procedure test hash/length and retained T4 hashes.
2. Run generator `--verify` with `uv` and bytecode disabled.
3. Run the complete Procedure project under its actual lane.
4. Run both 60-second callbacks through normal.
5. Reauthenticate retained T4 bytes after reconciliation.
6. Run a normal test that consumes `TRELLIS_TEST_BUILT_CLI_ROOT`.
7. Run the complete shared-`dist` project three consecutive times.
8. Rerun generator verification and frozen/T4 authentication.

Stop if the Procedure test exceeds 180 seconds; configuration cannot extend its explicit timeout.

## Stage 6 — Exact CLI gates

Run unchanged:

```text
NODE_OPTIONS= pnpm --filter @mindfoldhq/trellis test
NODE_OPTIONS= pnpm --filter @mindfoldhq/trellis test:coverage
```

Then rerun CLI lint and typecheck. Stop on a new failure family rather than changing global budgets, lane membership, retries, or serialization.

## Stage 7 — Remaining R3 gates

Run serially:

1. CLI build.
2. Root workspace typecheck.
3. Existing packed Core and CLI release preflights.
4. Focused T4, I1, I2, and archive-isolation regressions.
5. `node --check` for both historical audit scripts.
6. Direct retained-object I1/I2 `--verify` commands.
7. Reuse an earlier Core result only if its exact Channel bytes are authenticated; otherwise rerun the exact Core gate.

Historical verification reads committed Git objects only and must not regenerate evidence, inspect protected worktrees, or read private/untracked source.

## Stage 8 — Containment and technical commit

1. Run `git diff --check` and authenticate protected T3/T4/I1/I2/T6 Attempts 1–3.
2. Compute the exact technical allowlist: R3 17 + Channel 2 + CLI 3, with only the coverage-file overlap, equals 21 unique paths.
3. Stage those exact paths individually, including the untracked archive-isolation regression.
4. Assert exact equality between the staged set and computed allowlist; keep governance, unrelated files, submodules, and private records unstaged.
5. Inspect staged names and full diff.
6. Run GitNexus `detect_changes` against `variant/research-workflow`; stop on unexpected scope.
7. Commit the validated R3 technical subject as a new descendant. Do not push.
8. Mark the CLI and Channel stabilization tasks complete only after the commit and unblock the R3 repair task.

## Success boundary

Completion requires the overlay commit, unchanged frozen Procedure bytes, exact 1/83/2 project ownership, focused passes, three shared-`dist` passes, exact CLI and coverage success, remaining R3 gates, byte-identical protected evidence, exact 21-path staging, clean GitNexus detection, and the forward technical commit.

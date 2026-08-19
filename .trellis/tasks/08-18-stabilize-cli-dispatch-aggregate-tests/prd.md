# Stabilize CLI dispatch aggregate tests

## Goal

Restore the complete Core-then-CLI repository hook by giving nine independent dispatch filesystem-race scenarios independent test boundaries without changing any timeout value, production behavior, fixture, helper, or Vitest topology.

## Background

The second hook-enabled G-I3 commit attempt created no commit. Core passed 40 files and 664 tests with one skipped test. CLI passed 84 of 86 files and 1,005 of 1,007 tests in 879.54 seconds. The only failures were two existing aggregate tests that exceeded their 30-second budgets after 31.080 and 30.237 seconds; no assertion mismatch was recorded.

The activation aggregate contains five independent scenarios. The approved-result aggregate contains four. The selected forward repair is to keep every scenario and assertion intact while replacing the two aggregate registrations with nine ordinary serial registrations.

## Requirements

1. Create and commit exactly six task artifacts plus exactly these two test files:
   - `packages/cli/test/commands/research-dispatch-activation.integration.test.ts`
   - `packages/cli/test/commands/research-dispatch-approved-result.test.ts`
2. Split the activation aggregate into five serial tests in its current scenario order. Each test must retain the existing explicit `30_000` budget.
3. Split the approved-result aggregate into four serial tests in its current scenario order. Each test must inherit the enclosing suite's unchanged 30-second budget.
4. Preserve every fixture, setup statement, filesystem and Git operation, spy installation and trigger order, mock restoration, cleanup operation, assertion, error class or regex, and no-outside-write, empty-directory, or zero-byte check.
5. Preserve the activation file's inline mock restoration after the `openSync`, `writeSync`, and `fsyncSync` scenarios. The pre-existing-symlink scenario installs no spy. The final `linkSync` scenario continues to rely on suite `afterEach`.
6. Preserve the approved-result replacement scenario as the final scenario, with the `openSync` spy installed before `readFileSync`, and continue to restore both spies in suite `afterEach`.
7. Add no helper extraction, `it.each`, concurrency marker, retry, import, timeout increase, fixture edit, production edit, configuration edit, lane change, worker change, project addition, or repair-time code-spec edit.
8. Preserve the exact six staged G-I3 paths and blob OIDs throughout the repair commit. Use literal path allowlists and `git commit --only` for the exact-eight repair inventory.
9. Run one hook-enabled commit launch only. A failure or interruption must restore this task to its exact activated lifecycle, unstage only the eight repair paths, retain their worktree bytes, retain the six G-I3 staged blobs, and stop.
10. Keep Attempt 4, provider execution, evidence transmission, T6 closure, T7, archive, journal, network, remote, push, publication, release, activation, and M0-A4-or-later work outside this task.

## Acceptance Criteria

- [ ] The activation file contains 19 tests instead of 15, and all five split scenarios pass under explicit unchanged 30-second budgets.
- [ ] The approved-result file contains 54 tests instead of 51, and all four split scenarios pass under the enclosing unchanged 30-second budget.
- [ ] A focused normal-project run passes exactly 2 files and 73 tests.
- [ ] The four CLI project collections remain exact, pairwise disjoint, and complete: `1/1/82/2`, union 86 files.
- [ ] Exact-file Prettier checking is executed and its pre-existing non-clean HEAD baseline is recorded without broad reformatting; targeted lint, CLI typecheck, and the focused run pass without a timeout, assertion, parse, lint, or type failure.
- [ ] The normal commit hook passes complete Core and CLI execution; expected CLI observation is 86 files and 1,014 tests.
- [ ] The repair commit is a direct child of `753a5d9a8b1aa293a42f27201f3d9dd458edd723` and contains exactly the six task artifacts plus the two test files.
- [ ] No production, config, spec, helper, fixture, package, protected, submodule, historical evidence, I3, or S3 path enters the repair commit.
- [ ] The six G-I3 files remain staged at their recorded pre-repair blob OIDs after the repair commit.
- [ ] The task records a completed lifecycle only in a successful commit. A failed or interrupted hook leaves no completed task blob staged and grants no second launch.

## Out of Scope

- Raising or replacing any timeout.
- Changing Vitest projects, orders, workers, setup ownership, retries, or scripts.
- Changing production code, fixtures, helpers, packages, or living specs.
- Rewriting committed history or regenerating historical evidence.
- Reconciling or committing G-I3, creating I3/S3, or taking any M0-A4-or-later action inside this task.

## Technical Notes

The split intentionally changes the budget granularity from one 30-second budget across four or five heterogeneous proofs to one unchanged 30-second budget per independent proof. It does not weaken any scenario or raise a numeric limit. The subsequent G-I3 stage must reconcile its predecessor and package arithmetic to the committed repair before another G-I3 commit attempt.

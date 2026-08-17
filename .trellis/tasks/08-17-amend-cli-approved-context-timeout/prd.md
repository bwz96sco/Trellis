# Amend CLI approved-context timeout

## Goal

Create a forward governance overlay that authorizes one callback-local timeout correction for the approved-context CLI test, without changing production behavior, the governed Vitest topology, immutable evidence, or prior commits.

## Background

The governed R3 repair, Core Channel correction, and three-lane CLI stabilization currently form a 21-path technical union. The exact CLI suite exposed one additional load-sensitive callback:

- file: `packages/cli/test/commands/research-dispatch-approved-context.test.ts`;
- callback begins near line 298 and closes near line 405;
- its enclosing `describe` near line 254 supplies an inherited `30_000` budget;
- full normal four-worker execution observed `30.879s`;
- focused execution through the same `normal` project observed `5.576s`;
- the callback serially creates four Git-backed fixtures and takes cumulative sandbox snapshots.

This evidence supports a callback-local wall-clock budget under full-suite contention. It does not support changing helpers, fixtures, assertions, lane ownership, workers, or production behavior.

Commit `c1e1c40e` authorizes only three CLI paths, two local 60-second budgets, and a 21-path final union. This task supersedes only those stale clauses. Commits `f2d27484`, `480a05c7`, `d9c550ae`, `c1e1c40e`, and all earlier governance, technical, evidence, assurance, and failed-attempt history remain unchanged.

`upstream/main` at `a8a50a5e` contains no direct fix for this callback. It is evidence only and must not be synchronized before R3, because synchronization would change the governed 86-file CLI inventory.

## Requirements

1. Authorize exactly four CLI technical paths in total:
   - `packages/cli/vitest.config.ts`;
   - `packages/cli/test/commands/research-methodology-v131-coverage.test.ts`;
   - `packages/cli/test/commands/research-methodology-validation.test.ts`;
   - `packages/cli/test/commands/research-dispatch-approved-context.test.ts`.
2. Add only the approved-context test as CLI path number four. A fifth CLI path is forbidden.
3. In the new path, authorize only changing the callback terminator near line 405 from `});` to:

   ```ts
     }, 60_000);
   ```

4. Preserve the callback body, enclosing `describe` budget, four fixture sequences, cumulative snapshots, Git operations, helpers, assertions, and test semantics.
5. Authorize exactly three callback-local `60_000` budgets across the four CLI paths: the retained reconciliation callback, the retained blocked-fact callback, and this approved-context callback.
6. Preserve the three Vitest projects exactly:
   - Procedure lane: order 1, one worker, one frozen Procedure file;
   - normal lane: order 2, four workers, 83 ordinary files;
   - shared-`dist` lane: order 3, one worker, exactly two build/pack files.
7. Preserve pairwise-disjoint ownership `1 / 83 / 2` and the unchanged union of 86 unique CLI test files. Do not move the approved-context test out of `normal`.
8. Preserve explicit `testTimeout: 10_000` and `setupFiles` in every project, `globalSetup` only in `normal`, root coverage, package scripts, and the unchanged `vitest run` command.
9. Preserve the frozen Procedure test, retained T3/T4/I1/I2 evidence, T6 Attempts 1–3, protected historical objects, `AGENTS.md`, `CLAUDE.md`, submodules, and private or untracked records byte-for-byte.
10. Run upstream GitNexus impact analysis for the approved-context callback before editing. Stop on HIGH/CRITICAL risk, unexpected production flow, or a required additional path.
11. Verify the one-line correction through the normal project, the full three-lane topology, the exact CLI suite and coverage, static gates, Core and retained R3 gates, packed preflights, historical object-only checks, and immutable evidence authentication.
12. Compute the final technical union as exactly `17 R3 + 2 Channel + 4 CLI - 1 coverage overlap = 22` unique paths. Stage and commit only that exact set after all gates pass.

## Acceptance Criteria

- [ ] A separate six-file governance-overlay commit precedes the technical edit and leaves all predecessor commits unchanged.
- [ ] The overlay supersedes only `c1e1c40e`'s stale three-file, two-budget, 21-path boundary.
- [ ] GitNexus impact is below HIGH and exposes no unexpected production execution flow.
- [ ] The approved-context technical diff changes exactly one line: the callback terminator becomes `}, 60_000);`.
- [ ] Exactly three callback-local 60-second budgets exist across exactly four authorized CLI paths.
- [ ] Vitest lane orders, worker counts, ownership, intersections, and union remain exactly `1/83/2` and 86.
- [ ] The focused callback and complete approved-context file pass through `--project normal` within 60 seconds without assertion drift.
- [ ] The frozen Procedure lane, a normal global-setup consumer, and the shared-`dist` lane run successfully; the shared-`dist` lane passes three consecutive times.
- [ ] The exact CLI suite, coverage, lint, typecheck, build, workspace typecheck, Core gates, packed preflights, T4/I1/I2/archive-isolation tests, syntax checks, generator verification, and retained-object verification pass.
- [ ] Protected evidence remains byte-identical and has no diff.
- [ ] The staged and committed technical subject equals the approved 22-path set exactly.
- [ ] No upstream synchronization, push, publication, release, activation, provider execution, T7 work, or history rewrite occurs.

## Out of Scope

- Suite-wide or `describe`-wide timeout changes.
- Helper optimization, fixture reduction, snapshot reduction, assertion changes, retries, locks, mocks, or test-semantic changes.
- Lane movement, lane membership changes, worker-count changes, global serialization, or additional projects.
- Production code, package scripts, Core configuration, provider behavior, or evidence regeneration.
- A fifth CLI technical path or any new failure family.
- Merging, rebasing, cherry-picking, or otherwise synchronizing `upstream/main` before R3.

## Stop Conditions

Stop without a technical commit if the task inventory is not exactly six files; impact is HIGH/CRITICAL; an unexpected production flow appears; the correction requires more than the one terminator line or a fifth CLI path; callback/file/full-suite/coverage/Core/packed/historical verification fails; the callback exceeds 60 seconds; lane ownership differs from `1/83/2` or union 86; shared-`dist` corruption recurs; immutable evidence drifts; another failure family appears; the technical working or staged set differs from the exact 22-path allowlist; or any prohibited synchronization, release, publication, activation, provider, T7, push, or history-rewrite action would be required.

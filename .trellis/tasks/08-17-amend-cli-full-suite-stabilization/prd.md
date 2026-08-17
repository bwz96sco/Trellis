# Amend CLI full-suite stabilization

## Goal

Correct the defective governance clauses committed in `d9c550a` without rewriting history, then authorize the minimum test-only change that restores the exact CLI suite while preserving immutable T3 evidence.

## Background

The original stabilization task authorized four technical files, three timeout edits, and two Vitest projects. Focused verification proved that the proposed Procedure-test timeout edit changes a byte-authenticated T3 input. The retained generation ledger requires:

- path: `packages/cli/test/commands/research-procedure-207-packages.test.ts`
- byte length: `19395`
- SHA-256: `1f5a323935e1ea82128cd700618cab91fec66bd8157c2696fe61514d27144673`
- explicit local timeout: `180_000`

Vitest 4.0.18 selects an explicit test timeout before a project default, so configuration cannot extend that 180-second budget. The valid remedy is scheduling isolation: run this unchanged test alone before the normal four-worker lane. Separately, exactly two tests mutate the same workspace `dist` directories and must run serially after all other tests.

## Requirements

1. Preserve `d9c550a` and all earlier governance, technical, evidence, assurance, and failed-attempt commits unchanged.
2. Supersede only the defective clauses in the prior CLI stabilization task.
3. Authorize exactly three technical paths:
   - `packages/cli/vitest.config.ts`
   - `packages/cli/test/commands/research-methodology-v131-coverage.test.ts`
   - `packages/cli/test/commands/research-methodology-validation.test.ts`
4. Treat the Procedure 2.0.7 package test as immutable, read-only verification input. Do not edit, regenerate, stage, or change its timeout.
5. Preserve the two demonstrated 60-second callback budgets without changing assertions, fixtures, loops, evidence semantics, or production behavior.
6. Configure three explicit Vitest projects with distinct positive orders:
   - Procedure lane: order 1, one worker, exact frozen file;
   - normal lane: order 2, four workers, all ordinary tests except the frozen and shared-`dist` paths;
   - shared-`dist` lane: order 3, one worker, exactly two build/pack tests.
7. Keep `testTimeout: 10_000` and `setupFiles` explicit in every project, `globalSetup` only in normal, and coverage at the root.
8. Keep `packages/cli/package.json` and its `vitest run` test command unchanged.
9. Prove exact test ownership: 1 Procedure + 83 normal + 2 shared-`dist` = 86 unique files, with empty intersections and no missing or extra path.
10. Preserve normal four-worker behavior and run the two shared-`dist` files together three consecutive times without workspace-output corruption.
11. Authenticate the frozen test and retained T3/T4/I1/I2/T6 evidence before the technical commit.
12. Verify the final technical staged set by exact equality, not count alone. Expected union: 21 paths.

## Acceptance Criteria

- [ ] A new six-file governance-overlay commit precedes the corrective config edit and leaves `d9c550a` unchanged.
- [ ] GitNexus impact remains below HIGH and exposes no unexpected production flow.
- [ ] The technical diff contains exactly the config and two 60-second test changes.
- [ ] The frozen Procedure test has no diff and retains the pinned length, digest, and 180-second timeout.
- [ ] Project orders are exactly 1, 2, and 3; inventories are exactly 1, 83, and 2; union is the unchanged 86-file baseline.
- [ ] The isolated Procedure project passes and generator `--verify` passes before and after execution.
- [ ] Both focused 60-second callbacks pass through the normal project and retained T4 bytes do not drift.
- [ ] A normal test proves the existing global setup remains effective.
- [ ] The exact two shared-`dist` tests pass together three consecutive times without `ENOTEMPTY`, missing `dist` modules, or partial build/pack output.
- [ ] The unchanged exact CLI suite, coverage, lint, typecheck, build, remaining R3 gates, and historical object-only verification pass.
- [ ] The final staged technical set equals the approved 21-path allowlist and GitNexus change detection reports no unexpected scope.
- [ ] The R3 technical commit is a new descendant; nothing is pushed, published, activated, released, or advanced to T7.

## Out of Scope

- Production or package-script changes.
- Editing the frozen Procedure test or retained evidence.
- Global timeout increases, global serialization, retries, locks, wrappers, mocks, or additional lane members.
- Core configuration changes.
- Provider execution, activation, release, publication, push, T7, or history rewrite.

## Stop Conditions

Stop without a technical commit if the frozen test exceeds its immutable 180-second timeout in the isolated lane, any evidence byte drifts, project ownership differs from 1/83/2, another test family fails, shared-`dist` corruption recurs, GitNexus reports HIGH/CRITICAL impact, or a fourth technical path is required.

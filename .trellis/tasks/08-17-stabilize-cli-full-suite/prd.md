# Stabilize CLI full-suite execution

## Goal

Restore the exact CLI test gate for the pending R3 technical subject by correcting three demonstrated full-suite-only timeout budgets and serializing exactly the two test files that destructively rebuild the same workspace `dist` directories. Preserve production behavior, the package script, normal test parallelism, migration evidence, and failed assurance history.

## Background

The exact command `NODE_OPTIONS= pnpm --filter @mindfoldhq/trellis test` collected 86 files but failed under complete-suite load without assertion mismatches:

- `research-methodology-v131-coverage.test.ts`: approximately 34.5 seconds against a 30-second local budget;
- `research-methodology-validation.test.ts`: approximately 49.3 seconds against the 10-second global default, while the focused test passed in approximately 5.8 seconds;
- `research-procedure-207-packages.test.ts`: approximately 223.6 seconds against a 180-second local budget, while the focused test passed in approximately 76.3 seconds.

A separate full-suite run produced `ENOTEMPTY` while removing Core `dist`, followed by a missing `packages/core/dist/research/types.js`. Read-only inspection found exactly two CLI test files that clean, rebuild, and pack both real workspace packages:

- `test/scripts/smoke-installed-cli.test.ts`
- `test/commands/research-cs5-integration.test.ts`

Both pass independently. Their concurrent destructive use of shared `packages/core/dist` and `packages/cli/dist` is the demonstrated race.

## Requirements

### R1 — Govern exactly four technical files

This task authorizes edits only to:

- `packages/cli/vitest.config.ts`
- `packages/cli/test/commands/research-methodology-v131-coverage.test.ts`
- `packages/cli/test/commands/research-methodology-validation.test.ts`
- `packages/cli/test/commands/research-procedure-207-packages.test.ts`

No additional path may be edited without a new forward governance decision.

### R2 — Use only local evidence-backed timeout budgets

Change only the three affected test timeout arguments:

- T4 reconciliation: `60_000`;
- blocked-fact classification: `60_000`;
- Procedure 2.0.7 historical/package regeneration: `300_000`.

Preserve the global `testTimeout: 10_000`, every assertion, test input, evidence operation, and production path. Do not add retries or suppress failures.

### R3 — Isolate only the shared-`dist` owners

Configure two named inline Vitest projects:

- `normal`: group order 0, `maxWorkers: 4`, normal include pattern, existing generic exclusions plus the exact two shared-`dist` tests, `setupFiles`, `globalSetup`, and explicit `testTimeout: 10_000`;
- `dist-mutating`: group order 1, exactly the two shared-`dist` tests, `maxWorkers: 1`, `setupFiles`, explicit `testTimeout: 10_000`, and no redundant `globalSetup`.

Keep coverage at the root because it is process-wide. The unchanged default package invocation is the acceptance boundary; arbitrary CLI overrides such as `--maxWorkers` are not governed here.

### R4 — Preserve package and production contracts

Do not change:

- `packages/cli/package.json` or its `"test": "vitest run"` script;
- production source;
- Core Vitest configuration;
- either build/pack test;
- package build commands or real-tarball assertions;
- ordinary CLI four-worker parallelism.

Do not add global serialization, a filesystem lock, wrapper script, compatibility layer, or shared prebuilt tarball.

### R5 — Preserve immutable evidence and forward-only history

Do not modify or regenerate retained T4/I1/I2 evidence, T6 Attempts 1–3, the untracked CS5 source record, or unrelated dirty paths. No reset, stash, clean, amend, rebase, squash, force-push, activation, release, publication, provider execution, T7, or push is allowed.

### R6 — Respect impact and containment gates

Before editing any existing config/test symbol, run GitNexus upstream impact analysis and report direct callers, affected processes, and risk. Stop before HIGH or CRITICAL changes. Before the technical commit, stage the exact 22-unique-path R3/Channel/CLI union, inspect it, and run GitNexus change detection against `variant/research-workflow`.

### R7 — Restore focused and exact gates

Verification must prove:

1. named-project inventories are disjoint and complete;
2. `dist-mutating` contains exactly the two approved files;
3. the three adjusted tests pass under `normal`;
4. retained T4 and generated reconciliation bytes do not drift;
5. both shared-`dist` tests pass together three consecutive times;
6. the exact unchanged CLI test command passes;
7. CLI lint, typecheck, build, root typecheck, packed release preflights, focused R3 regressions, and historical I1/I2 verification pass before commit.

A focused pass alone is insufficient. A new failure family is a stop condition, not authority to broaden this task.

## Acceptance Criteria

- [ ] The task contains exactly six governance files and is committed before technical edits.
- [ ] GitNexus reports no unapproved HIGH or CRITICAL impact for the four technical files.
- [ ] Timeout values are exactly 60 seconds, 60 seconds, and 300 seconds; the global default remains 10 seconds.
- [ ] `normal` retains four workers, ordinary collection, setup, and global setup.
- [ ] `dist-mutating` owns exactly two files, has one worker, starts after `normal`, and omits redundant global setup.
- [ ] Project inventories are disjoint and their union equals the baseline CLI inventory.
- [ ] Both shared-`dist` tests pass together three consecutive times without `ENOTEMPTY` or missing `dist` modules.
- [ ] Retained T4/I1/I2 and T6 Attempts 1–3 remain byte-identical.
- [ ] The exact CLI test command and all remaining R3 gates pass.
- [ ] The technical staging inventory is exactly 22 unique approved paths and GitNexus reports no unexpected flow.
- [ ] No production, package-script, Core-config, provider, activation, release, publication, T7, push, or history-rewrite action occurs.

## Out of Scope

- General CLI suite performance work.
- Serializing files that do not mutate shared package output.
- Global timeout or worker-count changes.
- Refactoring or mocking the two package build tests.
- Code-spec changes; this is a bounded runner exception, not a published runtime contract.
- I3/S3, T6 Attempt-4, T7, activation, release, publication, provider execution, or push.

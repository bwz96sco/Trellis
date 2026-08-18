# Design — Stabilize CLI heavy-lane contention

## 1. Failure model

The failing hook does not show a coherent product defect. It shows one exceptional production-evidence workload sharing the normal four-worker pool while multiple filesystem-, Git-, and subprocess-heavy tests consume the remaining workers. The 116-case file stretched from retained successful observations of roughly 403–690 seconds to roughly 967 seconds. In the same run, eleven callbacks exceeded explicit 30-second Vitest budgets and two built-CLI subprocesses terminated without an exit status under their separate child timeout.

Changing the normal project default would not affect either explicit callback budgets or the child-process timeout. Raising every local budget would treat thirteen symptoms independently and hide the resource owner. Serializing all normal files would penalize 82 ordinary files for one exceptional file. The minimum causal lever is to remove the exceptional file from concurrent normal execution.

## 2. Four-project topology

```text
order 1  procedure-207-packages
         exact frozen Procedure test; maxWorkers 1

order 2  methodology-116-production
         exact 116-case production-evidence test; maxWorkers 1

order 3  normal
         remaining 82 files; maxWorkers 4

order 4  dist-mutating
         exact two canonical workspace-dist owners; maxWorkers 1
```

All orders are positive and distinct. Equal orders can run concurrently, and an isolated one-worker order-zero project has special trailing behavior in Vitest 4.0.18. Explicit orders make the producer/consumer and shared-output barriers unambiguous.

The expected file sets are exact, not count-only:

- Procedure contains only `test/commands/research-procedure-207-packages.test.ts`.
- Production contains only `test/commands/research-methodology-116-production.test.ts`.
- Dist-mutating contains only `test/scripts/smoke-installed-cli.test.ts` and `test/commands/research-cs5-integration.test.ts`.
- Normal contains the discovered suite minus those four exact paths.

Every intersection is empty and the union equals all 86 discovered CLI test files.

## 3. Setup ownership and data dependency

`test/setup.ts` is a per-project host-environment isolation guard and remains present in all four projects.

`test/global-setup.ts` builds an isolated compiled CLI and exposes `TRELLIS_TEST_BUILT_CLI_ROOT`. Repository evidence identifies only two consumers, both in normal. The 116-case harness imports the production recorder from source and does not spawn or inspect the built CLI. Giving its project a duplicate global setup would add an unconsumed compile/copy workload and create avoidable shared environment teardown concerns.

The production harness writes `production-116-case-evidence.jsonl` and `filesystem-and-event-effects.json`. The normal-lane coverage test reads and authenticates those files. The producer therefore runs at order 2 before its consumer at order 3. Running the producer project alone is required because a complete multi-project run could initialize normal's global setup early and mask a hidden dependency.

## 4. Runtime and compatibility boundary

The runtime diff is confined to `packages/cli/vitest.config.ts`:

- add one exact-path constant;
- add one one-worker project at order 2;
- exclude that path from normal;
- shift normal and dist-mutating to orders 3 and 4.

The following remain unchanged:

- all test source and assertions;
- every explicit and default timeout;
- normal's four-worker concurrency;
- package scripts and the root hook;
- root coverage configuration;
- production source, exports, runtime behavior, and built package contents;
- Procedure and shared-dist lane membership.

## 5. Code-spec correction

The prior three-project design deferred a code-spec update only while special lanes were isolated implementation exceptions. The new producer lane creates a recurring runner contract with three exceptional resource classes plus the ordinary normal lane, producer-before-consumer ordering, setup ownership, and exact partition requirements. The existing omission is no longer safe.

`conventions.md` will record the executable topology and stop conditions. `index.md` will correct three stale claims:

- pre-commit actually runs lint-staged, marketplace initialization, and complete root tests;
- CI runs typecheck, lint, tests, then build;
- suite inventory and runtime must come from current Vitest output rather than obsolete hardcoded numbers.

These are documentation changes only; they do not broaden runtime behavior.

## 6. Bootstrap and commit model

A conventional governance-only commit is impossible on the current predecessor because its mandatory hook runs the failing suite. Two tempting workarounds are rejected:

- a hidden unstaged config repair would let governance commit only because the hook observed bytes absent from that commit;
- bypassing or editing the hook would remove the required gate.

After fresh approval, task activation still precedes technical editing. The approved task artifacts, runtime repair, and matching code-spec correction then form one transparent atomic commit:

```text
c7d3423b
  -> exact-nine stabilization commit
       six task artifacts
       packages/cli/vitest.config.ts
       .trellis/spec/cli/unit-test/conventions.md
       .trellis/spec/cli/unit-test/index.md
```

The task has three exact lifecycle states:

- activation: `status: in_progress`, `completedAt: null`, `executionState: in_progress`;
- atomic success: `status: completed`, `completedAt: "2026-08-18"`, `executionState: completed`;
- failed or interrupted replacement hook: restore the exact activation state.

The completion transition is prepared only immediately before the replacement commit. The normal hook is the commit's final transactional gate. If it fails or is interrupted, Git creates no commit. Recovery must restore the activation-state bytes in the worktree, unstage only the exact nine stabilization paths while retaining their worktree bytes, and verify that no staged `completed` task blob remains.

The pre-existing G-I3 files remain staged throughout. `git commit --only -- <exact-nine paths>` creates a temporary commit index containing only those nine paths; a local behavior check confirmed that unrelated staged paths remain staged afterward. Before and after commit—or after failed-hook recovery—the actual run must reauthenticate the exact six staged G-I3 blob OIDs.

### 6.1 Attempt history and replacement authority

The initial authorization was exactly-once. Its exact-nine, hook-enabled launch created no commit: Core completed with 40 files and 664 tests passed and 1 skipped; CLI `procedure-207-packages` completed with 1 file and 6 tests passed; then the process was externally stopped before the other three projects ran. The output ended with `ELIFECYCLE`, with no recorded assertion failure, and HEAD remained `c7d3423bbe5bade60a4fa9a02ea1849b5403ea70`.

Recovery restored the activation lifecycle, unstaged exactly the nine repair paths without changing their worktree bytes, and left exactly the six G-I3 paths staged at their pre-recorded OIDs.

The user's 2026-08-18 instruction, “执行修复”, authorizes exactly one replacement launch of the same command, inventory, message, and normal hook. The replacement hook is the only long command now authorized. It runs once in the background and is monitored to terminal exit. The independent producer and complete coverage commands already have authenticated passing evidence and must not be rerun. Failure or interruption of the replacement requires exact recovery and stop; no third launch is authorized.

## 7. Interaction with G-I3

This task does not revise or commit G-I3. Its six staged files remain exact during the stabilization commit.

The repair changes `packages/cli/vitest.config.ts`, which is inside G-I3's currently declared R3 package-tree comparison pathspec. It also advances the first-parent predecessor beyond `c7d3423b`. Therefore a successful stabilization makes two current G-I3 clauses stale:

1. governance predecessor identity;
2. an empty pre-I3 package-tree delta relative to R3.

The next stage must be a separately planned and approved G-I3 governance reconciliation. It should distinguish the unchanged product/package subject from the exact authorized test-infrastructure delta and update its predecessor/inventory proofs. It must not simply retry the current staged governance commit.

## 8. Verification strategy

Checks are selected by the failure they can detect:

- exact collection sets detect duplication or omission introduced by the fourth project;
- the already authenticated producer-only result detects a hidden dependency on normal's global setup;
- retained evidence hashes authenticate deterministic producer output;
- the four-file normal result detects whether removing the exceptional worker load resolves the observed failure family without budget changes;
- the coverage consumer and already authenticated complete coverage result detect broken producer-before-consumer or aggregation contracts;
- lint, typecheck, and build detect repository contract regressions;
- the replacement normal commit hook supplies the only newly authorized complete Core-then-CLI execution;
- GitNexus change detection and exact commit inventory detect unexplained scope.

The producer-only and complete coverage commands must not be repeated. The replacement hook provides the remaining transactional signal. Repetition after its failure or interruption would not be authorized and must not occur.

## 9. Failure and rollback

Before commit, rollback is limited to the three new technical/spec hunks and this task's tentative status transition. Never reset, clean, stash, broadly checkout, or alter protected concurrent work.

The first externally stopped hook launch already followed exact recovery: activation lifecycle restored, nine stabilization paths unstaged with worktree bytes preserved, and the six G-I3 entries retained at their recorded blob OIDs.

If the authorized replacement hook fails or is interrupted, perform that same exact recovery. Preserve the replacement process output and terminal status, prove the stale staged completion blob is absent, and stop without a third launch.

After a successful replacement commit, never amend or rewrite it. Any residual failure becomes a new descendant repair.

# Stabilize CLI heavy-lane contention

## Goal

Restore a deterministic complete CLI and repository pre-commit test gate by isolating the exceptional 116-case production-evidence harness from ordinary four-worker CLI tests. Preserve existing test budgets, production behavior, frozen evidence, failed assurance attempts, and the pending G-I3 staged bytes.

## Background

The one authorized background retry of the G-I3 governance commit ran the unmodified pre-commit hook to natural completion. Core passed. CLI failed after 1099.81 seconds with 13 failures in four files while 994 tests passed:

- `test/cli/research-only-surface.integration.test.ts` — two built-CLI subprocesses returned `status: null`, and one callback exceeded its explicit 30-second budget;
- `test/commands/research-dispatch-activation.integration.test.ts` — two explicit 30-second timeouts;
- `test/commands/research-dispatch-approved-context.test.ts` — three explicit 30-second timeouts;
- `test/commands/research-dispatch-approved-result.test.ts` — five explicit 30-second timeouts.

During the same run, `test/commands/research-methodology-116-production.test.ts` occupied a normal worker for approximately 967 seconds; its main 116-case callback took approximately 956 seconds. Retained successful full-suite observations place the same file at approximately 403–690 seconds. The file executes production dispatch behavior serially across 116 filesystem/Git-backed cases and writes evidence later authenticated by `research-methodology-v131-coverage.test.ts`.

The current three-project topology assigns this workload to the normal four-worker lane. The evidence supports resource contention, not thirteen independent functional regressions: one affected activation file passes all 15 tests in isolation, prior approved-Context evidence shows a roughly 5.6-second focused callback expanding to roughly 30.9 seconds under full-suite load, and most latest failures are timeout or child-process termination outcomes rather than assertion drift.

The previous CLI stabilization design deliberately required a new forward task if another resource family appeared. It also deferred a code-spec update only while dedicated lanes remained bounded exceptions. A third distinct resource class now exists, and the unit-test index materially misstates both the pre-commit hook and CI order.

### First stabilization commit attempt

The first exact-nine commit launch consumed its original exactly-once authorization and used the unmodified normal hook. Core completed with 40 files and 664 tests passed, with 1 test skipped. The CLI `procedure-207-packages` project then completed with 1 file and 6 tests passed. The process was externally stopped before `methodology-116-production`, `normal`, or `dist-mutating` ran; output ended with `ELIFECYCLE`, but no assertion failure was recorded. Git created no commit, and HEAD remained `c7d3423bbe5bade60a4fa9a02ea1849b5403ea70`.

Recovery restored this task to `status: in_progress`, `completedAt: null`, and `executionState: in_progress`; unstaged exactly the nine repair paths while preserving every worktree byte; and left the staged set exactly equal to the six G-I3 files at their pre-recorded blob OIDs.

The user's 2026-08-18 instruction, “执行修复”, separately authorizes exactly one replacement launch of the same exact-nine, hook-enabled commit command. It does not alter the command, path inventory, commit message, hook, or later-stage authority boundary.

## Requirements

### R1 — Minimum runtime correction

- Change only `packages/cli/vitest.config.ts` for runtime behavior.
- Add an exact-path `methodology-116-production` project with one worker and positive `groupOrder: 2`.
- Preserve the existing Procedure project at order 1, move normal to order 3, and move dist-mutating to order 4.
- Keep normal at four workers and all project defaults at `testTimeout: 10_000`.
- Do not edit any test callback, subprocess timeout, production source, package script, root hook, or retry policy.

### R2 — Exact project ownership

The complete discovered CLI suite must remain an exact disjoint partition:

```text
procedure-207-packages       1 file   order 1   maxWorkers 1
methodology-116-production   1 file   order 2   maxWorkers 1
normal                      82 files  order 3   maxWorkers 4
dist-mutating                2 files  order 4   maxWorkers 1
union                       86 files
```

Every dedicated path must be excluded from normal. Pairwise intersections must be empty, and the union must equal the complete discovered `test/**/*.test.ts` inventory.

### R3 — Setup and evidence ordering

- Every project retains `setupFiles: ["./test/setup.ts"]`.
- Only normal retains `globalSetup: ["./test/global-setup.ts"]`; the isolated production harness has no built-CLI consumer and must not trigger a redundant compile/copy setup.
- The 116-case producer must finish before normal because normal contains the coverage reconciliation consumer of its evidence.
- Dist-mutating remains last because its two tests own canonical workspace `dist` mutation.
- Root coverage configuration remains process-wide and unchanged.

### R4 — Durable test-runner contract

Update only the existing CLI unit-test code-spec files:

- `.trellis/spec/cli/unit-test/conventions.md` records the four-project topology, setup ownership, exact partition and ordering invariants, worker/timeout policy, and stop conditions for a new resource class.
- `.trellis/spec/cli/unit-test/index.md` corrects the actual pre-commit and CI order, removes obsolete hardcoded test-count/runtime claims, and states that focused project runs are diagnostics rather than substitutes for the complete gate.

No new spec file is needed.

### R5 — Hook-bootstrap integrity

A governance-only commit cannot pass the current hook, while a hidden unstaged technical edit would make the hook validate bytes absent from the commit. The transparent atomic commit shape remains unchanged:

1. keep this task active and preserve the already implemented and verified three technical/spec paths;
2. prepare the task's exact completion transition only immediately before the commit;
3. commit exactly the six task artifacts plus those three paths with the normal hook enabled;
4. use the same path-limited command so the already staged G-I3 files are absent from the hook's temporary commit index and remain staged afterward.

A local Git behavior check established that `git commit --only -- <paths>` exposes only the named paths to the pre-commit index and preserves unrelated staged paths after a successful commit. No hook bypass, temporary hook edit, hidden worktree fix, history rewrite, low-level commit plumbing, changed inventory, or changed commit message is permitted.

The original authorization was exactly-once and was consumed by the first launch described above. The fresh 2026-08-18 instruction authorizes one replacement launch, not a retry loop or third launch. The replacement normal hook is the only long command now authorized. Launch that one replacement in the background, monitor the original process to its terminal exit, and preserve its complete output and status.

The independent `methodology-116-production` run and complete coverage run already passed and were authenticated before the first commit launch. They must not be rerun; their retained passing evidence remains the pre-commit basis for the replacement.

### R6 — Preservation and later-stage boundary

- Preserve the exact six staged G-I3 files byte-for-byte throughout this repair.
- Preserve `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, R3, T3/T4/T5 evidence, I1/S1, I2/S2, and T6 Attempts 1–3.
- Create no I3/S3 bytes and do not retry the G-I3 commit.
- Because this repair changes `packages/cli/vitest.config.ts`, the current uncommitted G-I3 predecessor and package-tree equality clauses will be stale afterward. A separate G-I3 governance reconciliation and fresh authorization must update those six files before any later G-I3 commit attempt.

## Acceptance Criteria

- [x] The original exactly-once authorization was consumed by one hook-enabled exact-nine launch that created no commit; its partial hook result and exact recovery are recorded without treating `ELIFECYCLE` as an assertion failure.
- [x] The user's 2026-08-18 instruction, “执行修复”, authorizes exactly one replacement launch of the same exact-nine, hook-enabled commit command and no third launch or later stage.
- [ ] GitNexus upstream impact for the edited config symbol reports no unreviewed HIGH or CRITICAL blast radius.
- [ ] Vitest collection proves the exact 1/1/82/2 disjoint partition and 86-file union.
- [x] `methodology-116-production` passed alone with only `setupFiles`, executed the governed 116-case harness, and left its retained evidence byte-identical; it must not be rerun for the replacement.
- [ ] The four formerly failing files pass together through normal at four workers with every existing timeout unchanged.
- [ ] The normal-lane coverage reconciliation consumer authenticates the newly completed producer output.
- [ ] CLI lint, typecheck, and build pass without changing the approved subject.
- [x] Complete coverage passed without worker overrides before the first commit launch and must not be rerun.
- [ ] The replacement normal pre-commit hook passes as part of the exact commit, including complete Core and CLI tests.
- [ ] The resulting commit has parent `c7d3423bbe5bade60a4fa9a02ea1849b5403ea70` and exactly the nine governed paths.
- [ ] After commit, the exact six original G-I3 files remain staged with unchanged staged blobs; protected files, submodule gitlinks, frozen evidence, and failed attempts remain unchanged.
- [ ] The task is completed atomically by that commit with `status: completed`, `completedAt: "2026-08-18"`, and `executionState: completed`; no separate closure commit or duplicate full-hook run is required.
- [ ] No G-I3 retry, I3/S3 creation, provider execution, T7 action, archive, journal, remote access, evidence transmission, push, publication, release, or activation occurs.

## Out of Scope

- Raising global, project, suite, callback, or subprocess timeouts.
- Setting normal to one worker, adding retries, or globally disabling file parallelism.
- Editing any affected test merely to collect richer child-process diagnostics unless the proposed isolation still fails under a separately reviewed follow-up.
- Modifying production code, package scripts, `.husky/pre-commit`, Core configuration, coverage ownership, or shared-dist tests.
- Revising or committing G-I3 within this task.
- Rerunning the independent producer or complete coverage commands.
- A third exact-nine commit launch after the authorized replacement.
- Any assurance, operator, archive, journal, network, remote, push, release, publication, or runtime action.

## Failure Policy

If the replacement hook fails or is interrupted, preserve that original process's complete output and terminal status, restore this task's exact activation state in the worktree (`status: in_progress`, `completedAt: null`, `executionState: in_progress`), and unstage only the exact nine stabilization paths while retaining all worktree bytes. Verify that the complete staged set is again exactly the six G-I3 paths at their frozen blob OIDs and that no staged `completed` task blob remains. Leave all pre-existing evidence and G-I3 bytes intact, stop, and do not launch the commit a third time. Do not rerun the producer or coverage command, increase timeouts, widen serialization, or add another lane member automatically.

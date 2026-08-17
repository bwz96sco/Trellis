# Implementation Plan — Stabilize CLI full-suite execution

## Preconditions

- The final plan has explicit user approval.
- Preserve all existing R3/Channel modifications and unrelated dirty paths.
- Never reset, stash, clean, amend, rebase, squash, force-push, publish, activate, run providers, or begin T7.

## Stage 1 — Commit governance alone

1. Complete and validate the six task files.
2. Start this task through `task.py start`.
3. Confirm the worktree's pre-existing technical and unrelated modifications are unchanged.
4. Run `git diff --check` for the task directory.
5. Stage exactly the six task files and inspect their inventory.
6. Run GitNexus staged change detection.
7. Commit the governance boundary as a new descendant. Do not push.

## Stage 2 — Mandatory impact analysis

Before editing, run GitNexus upstream impact analysis for:

- the CLI Vitest configuration boundary and its new path constant;
- the T4 reconciliation test callback;
- the blocked-fact classification test callback;
- the Procedure 2.0.7 regeneration test callback.

Report direct callers, affected processes, and risk. Stop on HIGH/CRITICAL or a required fifth technical path.

## Stage 3 — Apply four-file correction

1. In `vitest.config.ts`, define exactly the two shared-`dist` paths.
2. Keep coverage root-level.
3. Add explicit `normal` and `dist-mutating` inline projects with group orders 0 and 1.
4. Retain explicit 10-second defaults in both projects, four workers for normal, one worker for the serial lane, `setupFiles` in both, and `globalSetup` only in normal.
5. Change only the three local timeout arguments to 60s, 60s, and 300s.
6. Do not edit assertions, package scripts, production code, Core config, or either build test.

## Stage 4 — Verify collection and focused behavior

1. Run targeted ESLint for the config and three tests.
2. Typecheck the Vitest config directly.
3. List `normal` and `dist-mutating` files separately.
4. Prove disjointness, exact two-file serial ownership, and union equality with the baseline inventory.
5. Run each adjusted test through `--project normal` with its exact title filter.
6. Authenticate retained T4/reconciliation bytes before and after the T4 test.
7. Run a normal test that requires the existing global setup.
8. Run the two serial-lane tests together three consecutive times.

## Stage 5 — Exact CLI gate

Run unchanged:

```text
NODE_OPTIONS= pnpm --filter @mindfoldhq/trellis test
```

Then rerun CLI lint and typecheck. Stop on any new failure family rather than broadening the lane or global timeout.

## Stage 6 — Remaining R3 gates

Run serially:

1. CLI build.
2. Root workspace typecheck.
3. Existing packed Core and CLI release preflights.
4. Focused T4, I1, I2, and archive-isolation regressions.
5. `node --check` for both historical audit scripts.
6. Direct retained-object I1/I2 `--verify` commands.

Historical verification reads committed Git objects only and must not regenerate evidence or inspect protected/private live state.

## Stage 7 — Containment and technical commit

1. Run `git diff --check`.
2. Confirm protected evidence and Attempts 1–3 are unchanged.
3. Keep unrelated files, submodules, and untracked private records unstaged.
4. Stage the exact 22-unique-path union: existing R3 17 paths, two Channel paths, and four CLI stabilization paths with one overlap.
5. Inspect staged names and diff.
6. Run GitNexus `detect_changes` against `variant/research-workflow`; stop on unexpected scope.
7. Commit the validated R3 technical subject as a new descendant. Do not push.
8. Mark this task and the Channel task complete only after all gates and the commit succeed; then unblock the R3 task.

## Success boundary

Completion requires the governance commit, low/medium impact only, exact project partition, three repeated serial-lane passes, exact full CLI success, all remaining R3 gates, byte-identical protected evidence, exact 22-path staging, clean change detection, and the forward technical commit.

# Implementation Plan — Stabilize Core channel runtime full-suite test

## Preconditions

- Implementation requires explicit approval of this final plan in a subsequent user message.
- Preserve the current worktree and all existing R3 modifications; do not reset, stash, clean, amend, rebase, or rewrite history.
- Do not begin I3/S3, Attempt-4, T7, activation, release, publication, provider execution, or push.

## Stage 1 — Activate and commit the forward governance boundary

1. Run `task.py validate` for this task and confirm `task.json`, `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` are internally consistent.
2. After approval, run `task.py start` for `.trellis/tasks/08-16-stabilize-core-channel-runtime-test`.
3. Recheck `git status --short` and confirm inherited dirty paths and the existing R3 repair remain untouched.
4. Run `git diff --check` for the task directory.
5. Stage exactly this task directory, inspect the staged inventory, and run GitNexus staged change detection.
6. Commit the planning/governance artifacts as a new forward descendant under the standing local stage-commit authorization. Do not push.

Rollback point: before any test-file edit, the new governance commit must be present and the worktree must still contain the same R3 changes.

## Stage 2 — Run mandatory impact analysis

Before editing existing helpers, load the GitNexus impact-analysis guidance and run upstream impact analysis for:

- `takeN` in `packages/core/test/channel/channel-runtime.test.ts:31-52`;
- `takeN` in `packages/core/test/channel/worker-inbox.test.ts:28-47`;
- `drain` in `packages/core/test/channel/worker-inbox.test.ts:49-67`;
- any existing test callback that must be changed for `try/finally` cleanup.

Report direct callers, affected execution flows, and risk. Stop before editing if any result is HIGH or CRITICAL. Expected scope is file-local test helpers only, but the tool result—not this expectation—controls the gate.

## Stage 3 — Add deterministic failing regressions

In the two affected test files, add focused regression cases before changing helper behavior:

1. Controlled delayed iterator: the next value settles after more than 250 ms but before the overall deadline.
2. Assert only one `next()` request was issued before the value settled.
3. Assert the expected value is returned rather than consumed by an abandoned promise.
4. Assert a genuinely completed iterator is handled immediately.
5. Assert timeout before exact-N completion aborts and throws rather than returning a partial array.
6. For worker-inbox completion semantics, assert timeout before natural `done` throws.

Prefer controlled iterators and fake timers where they make the >250 ms boundary deterministic. Do not use suite contention as the sole reproduction and do not add retries that swallow failures.

Verify the new regression exposes the old helper defect before applying the fix.

## Stage 4 — Correct only the demonstrated test helpers

### `channel-runtime.test.ts`

1. Change `takeN` to issue one `gen.next()` per requested value.
2. Race that single request against the remaining overall deadline using a distinct timeout sentinel.
3. Clear the timer when the read settles.
4. If `done` occurs before N values, throw an explicit incomplete-stream error.
5. If timeout wins, invoke caller-provided cancellation, await the same pending read, then throw.
6. Strengthen the target test to assert the initial channel backlog instead of ignoring the result.
7. Put abort plus awaited `gen.return(undefined)` in `finally` for affected watcher tests.

### `worker-inbox.test.ts`

1. Apply the same exact-N semantics to its local `takeN`.
2. Update all six affected tests/seven invocations to supply cancellation and guarantee abort plus awaited generator return in `finally`.
3. Replace `drain` with `collectUntilDone` for its sole terminal-event caller:
   - arm one completion deadline timer;
   - timer marks `timedOut` and aborts the controller;
   - collect through `for await` until the generator ends;
   - throw after loop if completion was timeout-induced;
   - clear the timer in `finally`.
4. Preserve the assertion that the terminal event ends the current worker generation and no respawn event crosses the boundary.

Do not modify production Channel files, polling intervals, `packages/core/vitest.config.ts`, package-wide timeout, worker count, or file parallelism.

## Stage 5 — Focused verification

Run serially:

```text
pnpm --filter @mindfoldhq/trellis-core exec vitest run test/channel/channel-runtime.test.ts -t "takeN|discovers channels created after the watcher starts"
pnpm --filter @mindfoldhq/trellis-core exec vitest run test/channel/worker-inbox.test.ts -t "takeN|terminal event|current worker generation"
pnpm --filter @mindfoldhq/trellis-core exec vitest run test/channel/channel-runtime.test.ts
pnpm --filter @mindfoldhq/trellis-core exec vitest run test/channel/worker-inbox.test.ts
pnpm --filter @mindfoldhq/trellis-core exec vitest run test/channel
```

Then repeat the two previously timed-out integration tests at least 25 times, preserving all assertions. If Vitest filtering/repetition cannot express this without changing code, use a shell loop around the exact focused command; every iteration must exit successfully.

Run:

```text
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
```

If focused behavior fails, fix only the demonstrated helper or caller-cleanup defect. Do not introduce a global timeout workaround.

## Stage 6 — Exact full Core gate

Run the exact unmodified command:

```text
pnpm --filter @mindfoldhq/trellis-core test
```

Success requires the command to pass as written. If it still fails:

- diagnose the concrete new failure;
- do not automatically raise timeouts or expand into production runtime;
- if evidence shows only the affected polling integration test has a legitimate wall-clock requirement after helper correction, return to planning for review of a focused 20–30 second test timeout;
- keep the technical commit uncreated until the exact gate passes.

## Stage 7 — Resume and complete R3 verification

After the Core test gate passes, resume the previously approved serial sequence:

```text
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis typecheck
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis build
pnpm typecheck
```

Also run the existing packed-Core and packed-CLI release-preflight verification used by T5, direct historical I1/I2 `--verify`, and the focused T4/I1/I2/archive-isolation regressions. Verification must not regenerate retained evidence.

## Stage 8 — Containment, detection, and technical commit

1. Run `git diff --check`.
2. Confirm no diff under retained T4, I1, I2, or Attempts 1–3 evidence.
3. Confirm `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, and the untracked CS5 decision remain unstaged.
4. Stage exactly:
   - the existing governed R3 17-path allowlist;
   - `packages/core/test/channel/channel-runtime.test.ts`;
   - `packages/core/test/channel/worker-inbox.test.ts`.
5. Inspect the staged inventory and staged diff.
6. Run GitNexus staged change detection against `variant/research-workflow` and stop on unexpected symbols or flows.
7. Commit the validated technical subject as a new descendant. Do not amend, squash, push, publish, activate, or begin T7.
8. Mark Task #75 complete and unblock Task #71 only after the commit and all gates succeed.

## Success boundary

The task is complete only when both helper defects are deterministically covered, all focused Channel tests pass repeatedly, the exact full Core test gate passes unchanged, the remaining R3 gates pass, containment is clean, and the forward technical commit is created. A focused-file pass or timeout increase alone is not completion.

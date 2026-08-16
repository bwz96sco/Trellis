# Stabilize Core channel runtime full-suite test

## Goal

Restore a reliable exact Core test gate for the pending R3 technical subject by correcting the duplicated test-helper race that caused full-suite-only timeouts in `packages/core/test/channel/channel-runtime.test.ts` and `packages/core/test/channel/worker-inbox.test.ts`, without weakening Channel behavior assertions or changing the production Channel runtime.

## Background

The exact gate `pnpm --filter @mindfoldhq/trellis-core test` failed twice under the concurrent full suite. On the latest retry, 657 tests passed, one was skipped, and only `watchChannels cross-channel fan-in > discovers channels created after the watcher starts` timed out at Vitest's 10-second budget. The same `channel-runtime.test.ts` file passed 24/24 independently. The previous full-suite run timed out in three Channel tests whose independent reruns also passed.

Read-only investigation traced the failure to the file-local `takeN` helper at `packages/core/test/channel/channel-runtime.test.ts:31-52`. Its deadline is established at lines 37–38, but every loop starts a fresh `gen.next()` at lines 39–40 and races it against a 250 ms timer at lines 41–43. When the timer-shaped result enters the retry branch at lines 45–47, the losing `gen.next()` remains unresolved. It can later consume the expected event outside the observed race, while subsequent `next()` calls queue behind it. The helper then exhausts its internal four- or five-second wait budget and cleanup approaches or exceeds Vitest's outer 10-second budget. This explains the load dependence, variable failing tests, and much longer full-suite duration.

The helper is called only within this file: the `watchWorkers` update test at line 419, the four-event fan-in test at line 455, and twice by the late-channel test at lines 476 and 479. It is not exported.

A second read-only pass found the same abandoned-request pattern in the independently defined `takeN` and `drain` helpers at `packages/core/test/channel/worker-inbox.test.ts:28-67`. One of that file's tests timed out during the first failed full-suite run and passed independently afterward, so this is a demonstrated sibling failure rather than speculative cleanup. Both files are isolated test workers and neither helper is a production symbol.

The production `watchChannels`, `watchEvents`, and worker-inbox paths remain eventually live in the inspected flows; no production runtime defect has been demonstrated. The existing R3 repair does not touch Channel source, tests, or Vitest configuration.

## Requirements

### R1 — Correct the helper races, not the runtime

Update the file-local `takeN` helpers in both test files so exactly one `gen.next()` call is in flight for each requested item. Race that request against the remaining overall deadline, clear the timer when the generator settles, and never enqueue another request while the first remains pending.

For `takeN`, timeout or genuine `done: true` before the requested count must be an explicit failure rather than a partial successful result. On timeout, the helper must trigger caller-provided cancellation, await settlement of the same pending `next()`, and then throw.

Replace `worker-inbox.test.ts`'s misleading `drain` behavior with a completion-oriented helper such as `collectUntilDone`. Its sole caller tests that a terminal worker event naturally ends the generator, so an idle deadline is failure—not successful partial drainage. The helper must collect one request at a time, return only on genuine `done: true`, and cancel/settle/throw on timeout.

### R2 — Add deterministic regression coverage

Add focused helper regressions using controlled async iterators or fake timers whose next value settles beyond one 250 ms observation tick. Prove that each helper receives the delayed value rather than allowing an abandoned `next()` promise to consume it, and that a completed iterator terminates promptly. Do not rely on full-suite machine load as the only reproduction.

Keep the existing behavior assertions: a watcher started before a new channel exists must discover that channel and yield its event, exact-N worker-inbox reads must receive all requested values, and the terminal-event test must prove natural generator completion without crossing into a respawned worker generation.

Every affected watcher test must place abort plus `await gen.return(undefined)` in `finally`, so helper timeout or assertion failure cannot skip cleanup. The `worker-inbox.test.ts` `takeN` callers are at lines 414, 444, 477, 489, 539, 697, and 727; the completion-helper caller is at line 614.

### R3 — Keep fallback scope narrow

Do not edit `watchChannels`, `watchEvents`, Channel public APIs, or global Vitest timeout/concurrency configuration unless the corrected helper still fails and new evidence demonstrates a separate defect.

If the helper correction succeeds functionally but the exact full suite still exceeds 10 seconds solely because the polling integration test has a supported wall-clock requirement, propose a focused 20–30 second timeout for that test or describe block as a separately reviewed fallback. Do not apply a repository-wide timeout increase.

### R4 — Preserve existing migration work and immutable evidence

Do not modify, regenerate, stage, or rewrite:

- the existing R3 17-path repair;
- T4's retained 116-row evidence;
- I1 or I2 retained evidence;
- T6 Attempts 1–3 or their governance;
- `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, or the intentionally untracked CS5 decision record.

No reset, rebase, amend, squash, force-push, broad staging, history rewrite, activation, provider execution, release, publication, or push is allowed.

### R5 — Respect impact and staging gates

Before editing `takeN` or any other existing function, run GitNexus upstream impact analysis and report direct callers, affected processes, and risk. Stop before any HIGH or CRITICAL edit unless separately authorized.

Before commit, stage only this task's approved test change together with the already governed R3 allowlist, run GitNexus staged change detection, and stop on unexpected symbols or flows.

### R6 — Prove focused behavior and the exact full gate

Verification must run serially and include:

1. deterministic delayed-generator/helper regressions for both files;
2. the late-created-channel and previously timed-out worker-inbox tests alone;
3. the complete `channel-runtime.test.ts` and `worker-inbox.test.ts` files;
4. the complete focused `test/channel` directory;
5. repeated focused execution sufficient to exercise timing stability;
6. Core lint and typecheck;
7. the exact unmodified command `pnpm --filter @mindfoldhq/trellis-core test`;
8. the remaining R3 verification sequence after the Core gate passes.

An independent-file pass alone is not sufficient.

## Acceptance Criteria

- [ ] The timeout mechanism is documented with exact file and symbol anchors.
- [ ] GitNexus impact analysis is complete for every edited existing symbol, with no unapproved HIGH or CRITICAL edit.
- [ ] Both `takeN` helpers maintain no more than one in-flight `gen.next()` call per requested item.
- [ ] The worker-inbox completion helper returns only on genuine iterator completion and never treats idle timeout as success.
- [ ] Deterministic delays beyond 250 ms no longer cause abandoned promises to consume expected values.
- [ ] Helper deadline exhaustion cancels the generator, awaits the pending read, and throws explicitly rather than returning an incomplete result.
- [ ] Every affected caller performs abort and awaited generator return in `finally`.
- [ ] Late-created-channel, exact-N inbox, terminal completion, and no-cross-respawn assertions remain intact and pass.
- [ ] No production Channel runtime or global Vitest configuration changes are made without new evidence and review.
- [ ] The affected tests pass alone, in both complete files, and across `test/channel`.
- [ ] Repeated focused execution passes without skipped assertions or swallowed failures.
- [ ] Core lint and typecheck pass.
- [ ] The exact command `pnpm --filter @mindfoldhq/trellis-core test` passes.
- [ ] Existing R3 focused checks and remaining full verification gates pass before R3 is committed.
- [ ] Protected historical evidence and unrelated dirty paths have no task-caused changes.
- [ ] Staged GitNexus change detection reports only the expected helper stabilization and existing governed R3 scope.

## Out of Scope

- Refactoring the Channel subsystem.
- General test-suite performance optimization.
- Changing Channel public APIs, watcher semantics, or event ordering.
- Disabling test concurrency globally.
- Broad timeout increases.
- I3/S3, T6 Attempt-4, T7, activation, release, publication, push, or provider execution.

## Technical Notes

The desired helper shape is one pending `gen.next()` raced against the remaining overall deadline. `Promise.race` does not cancel the losing request, so timeout handling must actively abort the owning watcher, await that same pending read to settle, and only then throw. Callers remain lifecycle owners and use `finally` to abort and await `gen.return(undefined)` idempotently. A reusable idle-drain helper is intentionally not introduced because returning on idle while preserving the generator would leave a pending request capable of consuming a future event.

# Design — Stabilize Core channel runtime full-suite test

## 1. Scope and boundary

This is a test-infrastructure correction confined initially to:

- `packages/core/test/channel/channel-runtime.test.ts`
- `packages/core/test/channel/worker-inbox.test.ts`

The production Channel runtime is intentionally excluded because investigation found no demonstrated watcher or inbox liveness defect. The affected `takeN`/`drain` helpers are independently defined, file-local, and non-exported, so correcting them changes no package API or other test process. Both files produced full-suite-only timeouts during the two recorded Core gate attempts and passed independently afterward.

The existing R3 17-path migration repair remains a separate governed change set. This task supplies one forward test correction needed to complete R3 verification; it does not rewrite R3 governance or historical evidence.

## 2. Failure mechanism

Current control flow:

1. `takeN` creates a deadline.
2. Every loop calls `gen.next()`.
3. The call is raced against a 250 ms timeout result shaped like a completed generator result.
4. When the timeout wins, the loop continues and starts another `gen.next()`.
5. The previous request remains queued and can consume the next event without returning it to the active helper path.
6. Later requests wait behind the abandoned request, causing the helper to exhaust its internal deadline and the test to collide with Vitest's outer 10-second budget.

The failure is exposed when discovery takes longer than 250 ms, which is common under the full concurrent suite but uncommon when the file runs alone.

## 3. Correct helper contract

For each requested item, `takeN` maintains exactly one pending generator request:

```text
create pending = gen.next()
race pending against the remaining overall deadline
if pending settles done=false: append value and request the next item
if pending settles done=true before N: fail explicitly
if deadline wins:
  abort through the caller-provided controller/cancel function
  await the same pending request to settle
  throw timeout
```

The timeout branch uses a distinct tagged sentinel rather than a generator-shaped `{ done: true }` object. Timer cleanup is local to each race, and no caller may continue using a generator after helper timeout.

For the worker-inbox terminal-completion test, replace `drain` with `collectUntilDone(gen, controller, timeoutMs)`. It arms one timeout that marks failure and aborts the controller, then collects with `for await`. Natural terminal completion returns the values; timeout-induced completion throws after the loop. The timer is cleared in `finally`. This avoids `Promise.race` and abandoned reads entirely for the completion case.

## 4. Regression design

Add focused regressions alongside the helpers. Use controlled async iterators or fake-timer-backed delayed generators so a value settles after more than one 250 ms observation tick. Assertions must prove:

- the returned array contains the expected delayed value;
- only one `next()` request was made before that value settled;
- the helpers do not skip or consume values off-path;
- genuine generator completion returns promptly;
- deadline exhaustion is an explicit failure, not an incomplete successful result.

The existing late-created-channel and worker-inbox tests remain integration assertions for real runtime behavior. They must not be weakened or replaced by helper regressions. Failure paths should abort and close generators in `finally` so queued reads or watcher tasks cannot prolong cleanup.

## 5. Fallback policy

A focused timeout increase is not part of the primary repair. It may be considered only if all of the following hold after the helper fix:

1. the helper regression passes;
2. the affected integration test passes repeatedly;
3. no pending-request leak remains;
4. the exact full Core suite still exceeds 10 seconds solely due to supported polling duration.

Any fallback must be local to the affected test or describe block, use a bounded 20–30 second value, and receive renewed review before application. Global timeout or concurrency changes remain prohibited.

## 6. Compatibility and risk

- Public API: unchanged.
- Production behavior: unchanged.
- Event ordering and watcher semantics: unchanged.
- Test callers affected: only callers of the file-local helpers in the two demonstrated Channel test files.
- Historical evidence: read-only and byte-identical.
- Main implementation risks: accidentally issuing more than one pending `next()` through a retry path, leaving tick timers active, or changing helper timeout semantics without updating callers to expect explicit failure.

GitNexus upstream impact analysis is mandatory before editing `takeN`. A HIGH or CRITICAL result stops implementation for separate authorization.

## 7. Verification model

Verification proceeds from deterministic reproduction to full integration:

1. helper regressions in both files;
2. target late-channel and worker-inbox tests;
3. both complete affected files and then `test/channel`;
4. repeated focused runs;
5. Core lint/typecheck;
6. exact full Core test command;
7. remaining R3 Core/CLI/workspace/package gates;
8. exact staging and GitNexus change detection.

The repair is successful only when the exact full Core command passes; machine-load-sensitive focused success is necessary but insufficient.

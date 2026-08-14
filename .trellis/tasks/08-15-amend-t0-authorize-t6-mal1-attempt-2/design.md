# T0A — T6 MAL-1 Attempt-2 design

## Boundary

This is a standalone, forward-only governance overlay. It does not alter the frozen technical subject or repair T1–T5. It authenticates an immutable failed attempt, a minimal T6 harness correction, and a new exact-nine destination.

```text
exact S1
  -> committed M0 chain
  -> immutable Attempt-1 harness failure cd85634
  -> standalone T0A Attempt-2 authority
  -> exact three-path M0 correction
  -> exact nine-path Attempt-2 assurance
```

## Harness correction

The reviewer keeps a closed controlled `PATH`. The only additions are the four executables proven necessary by observed failures:

- `sh` for pnpm lifecycle scripts
- `sed`, `dirname`, and `uname` for generated Vitest launcher wrappers

No broad host `PATH`, provider executable, network authority, or generalized sandbox framework is added.

## Role and session semantics

The reviewer remains the assigned T6 actor, distinct from T0–T5 and future T7. Resuming the same assigned T6 session is allowed and recorded; caller declarations are not represented as OS-level proof. Shared T0–T5 scratch remains forbidden.

## Evidence and rollback

Attempt-1 is never removed or overwritten. Attempt-2 writes to a new adjacent staging directory and publishes exactly once to `research/attempt-2`. A failed Attempt-2 remains honest evidence. Corrections after either commit are forward-only.

## Execution order

Attempt-2 runs while the protected main worktree remains exact S1. Only after an independently reviewed and committed Attempt-2 may the main branch fast-forward. T7 remains separately authorized and out of scope.

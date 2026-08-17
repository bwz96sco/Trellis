# Design — Stabilize CLI full-suite execution

## 1. Scope

The correction is confined to one CLI Vitest configuration and three existing test timeout declarations. No production or package-script behavior changes.

The existing R3 repair and Core Channel correction remain separately governed changes that will share the final technical commit only after all gates pass.

## 2. Failure model

### Local wall-clock budgets

Vitest's timeout wrapper records its stack at collection and checks elapsed time again after synchronous callbacks return. Evidence-heavy synchronous tests can therefore display elapsed times far above their configured budget while still failing solely at the timeout wrapper. The three affected tests pass their assertions independently, and the full-suite reports contain no assertion mismatch.

The minimal correction is a local budget above observed supported complete-suite duration, not a global timeout increase:

- 34.5s observed → 60s;
- 49.3s observed → 60s;
- 223.6s observed → 300s.

### Shared output mutation

Both package-install tests execute real Core and CLI builds. Each build starts by recursively deleting its package `dist`. File-level parallelism permits one worker to delete or partially recreate output while the other imports or packs it. The observed `ENOTEMPTY` and missing module are direct consequences of this shared mutable resource.

The resource owner is the test file, so scheduling—not production locking—is the correct boundary.

## 3. Vitest project design

Define one constant containing exactly the two shared-`dist` test paths. Configure two explicit inline projects under the root test configuration:

```text
normal (groupOrder 0)
  include: all CLI tests
  exclude: generic exclusions + exact shared-dist paths
  maxWorkers: 4
  testTimeout: 10s
  setupFiles: existing setup
  globalSetup: existing temporary CLI build setup

dist-mutating (groupOrder 1)
  include: exact shared-dist paths
  maxWorkers: 1
  testTimeout: 10s
  setupFiles: existing setup
  globalSetup: omitted
```

`groupOrder` supplies the cross-project barrier; `maxWorkers: 1` serializes the two files inside the later project. Explicit project options avoid relying on implicit inheritance. Coverage stays root-level and process-wide.

## 4. Compatibility

- CLI package command: unchanged.
- Global test timeout: unchanged.
- Ordinary test concurrency: unchanged.
- Global setup semantics: retained for normal tests and intentionally not repeated for self-building package tests.
- Setup-file environment isolation: retained in both projects.
- Coverage configuration: unchanged at root.
- Production and packed-package assertions: unchanged.

## 5. Risks and stop gates

- A path appears in both or neither project: stop and correct collection rules.
- `globalSetup` runs twice or no longer supplies its built CLI root to normal tests: stop.
- A third shared-output mutator is discovered: stop for new evidence and governance.
- Exact CLI suite reveals a new timeout family: stop; do not raise global budgets.
- T4 or historical evidence bytes drift: stop before technical commit.
- GitNexus reports HIGH/CRITICAL impact or unexpected production flows: stop before edit/commit.

## 6. Rollback

Rollback is hunk-local: restore only the new Vitest project configuration and the three new timeout values to their recorded pre-task bytes. Do not reset the worktree or discard the pre-existing R3 change in the coverage file.

## 7. Code-spec decision

No code-spec update is required. The change neither adds a reusable product contract nor modifies a command, API, storage, network, or cross-layer boundary. The exact resource-owner exception is documented here. Reconsider a reusable spec only if additional test classes later require the serial lane.

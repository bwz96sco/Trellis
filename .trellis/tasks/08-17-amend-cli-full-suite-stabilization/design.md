# Design — Amend CLI full-suite stabilization

## 1. Authority boundary

This task is a forward overlay on commit `d9c550ae786a45cea479c03ebe98aae08839b1a9`. It does not edit or invalidate that commit. It replaces only its incorrect four-file/three-timeout/two-project/22-path clauses with a three-file/two-timeout/three-project/21-path contract.

The Procedure package test is an authenticated input, not an edit target. Its exact bytes remain governed by the retained T3 generation ledger.

## 2. Failure model

### Frozen explicit timeout

The Procedure test ends with an explicit `180_000` timeout. Vitest 4.0.18 resolves `options.timeout ?? runner.config.testTimeout`; therefore neither project `testTimeout` nor a CLI default can extend it. A previous focused run took about 160 seconds without four-worker contention. The only authorized lever is to remove concurrent normal-test load.

### Shared workspace output

These two files both clean, rebuild, and pack the canonical workspace `dist` directories:

- `test/scripts/smoke-installed-cli.test.ts`
- `test/commands/research-cs5-integration.test.ts`

Concurrent workers produced `ENOTEMPTY` and missing generated modules. Scheduling the owning test files is the minimum correction; production locks and mocked builds would change the proof boundary.

## 3. Three-project topology

```text
procedure-207-packages (groupOrder 1)
  include: exact frozen Procedure test
  maxWorkers: 1
  testTimeout: 10s default; explicit test timeout remains 180s
  setupFiles: existing setup
  globalSetup: none

normal (groupOrder 2)
  include: all CLI tests
  exclude: generic exclusions + Procedure path + two shared-dist paths
  maxWorkers: 4
  testTimeout: 10s
  setupFiles: existing setup
  globalSetup: existing temporary CLI build setup

dist-mutating (groupOrder 3)
  include: exact two shared-dist paths
  maxWorkers: 1
  testTimeout: 10s
  setupFiles: existing setup
  globalSetup: none
```

Orders must be positive and distinct. Vitest runs equal orders together, and Vitest 4.0.18 diverts an isolated one-worker order-zero project into a sequential bucket appended after explicit groups. Orders 1/2/3 guarantee Procedure → normal → shared-`dist` execution.

Vitest initializes applicable global setups before ordered test groups. Normal's global setup may therefore complete before the Procedure lane starts, but it is not concurrent with the timed Procedure callback and builds into an isolated temporary directory.

Coverage remains root-level and process-wide. Inline project options are explicit rather than relying on inheritance.

## 4. Technical changes

- `packages/cli/vitest.config.ts`: add the exact Procedure constant, add its isolated project, exclude it from normal, and use orders 1/2/3.
- `packages/cli/test/commands/research-methodology-v131-coverage.test.ts`: retain the demonstrated `60_000` reconciliation budget.
- `packages/cli/test/commands/research-methodology-validation.test.ts`: retain the demonstrated `60_000` blocked-fact budget.

No other technical file is authorized.

## 5. Compatibility and containment

- Package command and global 10-second defaults: unchanged.
- Normal concurrency: unchanged at four workers.
- Procedure assertions, timeout, and bytes: unchanged.
- Real build/pack assertions: unchanged.
- Production, Core config, network, provider, authority, activation, release, publication, and T7 behavior: unchanged.

## 6. Rollback

Rollback is hunk-local. Restore only the new three-project config hunks or the two demonstrated timeout hunks if a required gate fails. Never reset, stash, clean, broadly checkout, amend, rebase, squash, or discard pre-existing R3/Channel work.

## 7. Code-spec decision

No code-spec update is required. This is a bounded runner exception, not a public or reusable production contract. The governance overlay is the durable record. Reconsider only if more tests later join either resource class.

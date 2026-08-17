# Design — Amend CLI approved-context timeout

## 1. Authority boundary

This task is a forward overlay on `c1e1c40e`. It leaves `f2d27484`, `480a05c7`, `d9c550ae`, `c1e1c40e`, and all earlier history unchanged. It supersedes only the predecessor's stale three-file, two-budget, 21-path clauses by adding one authorized CLI test path, one callback-local budget, and one final technical path.

The complete authorized CLI set becomes:

1. `packages/cli/vitest.config.ts`;
2. `packages/cli/test/commands/research-methodology-v131-coverage.test.ts`;
3. `packages/cli/test/commands/research-methodology-validation.test.ts`;
4. `packages/cli/test/commands/research-dispatch-approved-context.test.ts`.

No fifth CLI path is authorized.

## 2. Demonstrated failure model

The callback beginning near line 298 of the approved-context test inherits a `30_000` timeout from the enclosing `describe` near line 254 and closes near line 405. It serially constructs four Git-backed fixtures and repeatedly snapshots the cumulative sandbox.

Observed timings distinguish load sensitivity from an intrinsic functional defect:

- full normal four-worker lane: `30.879s`, slightly beyond the inherited budget;
- focused through the same normal project: `5.576s`.

The minimum correction is a callback-local `60_000` budget. Helper optimization, fixture reduction, assertion changes, lane movement, or production changes would alter the proof rather than correct its demonstrated execution budget.

`upstream/main` at `a8a50a5e` has no direct fix for this callback. It remains evidence only. Synchronizing it before R3 would alter the governed 86-file inventory and is prohibited.

## 3. Exact technical change

Only the terminator of the callback beginning near line 298 may change:

```ts
  }, 60_000);
```

The enclosing `describe` timeout, callback body, four fixture/snapshot sequences, Git operations, helpers, assertions, and all other bytes in the file remain unchanged. The path-scoped diff must contain exactly one changed line.

This produces exactly three callback-local `60_000` budgets in total across the four authorized CLI paths: the two retained budgets authorized by `c1e1c40e` plus this approved-context budget.

## 4. Preserved Vitest topology

```text
procedure-207-packages (groupOrder 1)
  files: 1
  workers: 1

normal (groupOrder 2)
  files: 83
  workers: 4
  contains approved-context test

shared-dist / dist-mutating (groupOrder 3)
  files: 2
  workers: 1
```

The projects remain pairwise disjoint and their union remains exactly 86 files. Explicit 10-second defaults and setup files remain in each project, normal alone retains global setup, and coverage remains root-level. No configuration edit is authorized by this overlay because the existing three-lane implementation already owns the required topology.

## 5. Final containment arithmetic

The governed technical subject is:

```text
17 R3 paths
+ 2 Core Channel paths
+ 4 CLI stabilization paths
- 1 overlap: research-methodology-v131-coverage.test.ts
= 22 unique paths
```

The fourth CLI path is the approved-context test. Deduplication is limited to the existing coverage-file overlap. Governance files, `AGENTS.md`, `CLAUDE.md`, submodules, protected evidence, and private/untracked records remain outside the technical set.

## 6. Verification boundary

Before editing, authenticate the 21-path baseline, the frozen Procedure test, retained T4 bytes, and protected evidence; then run upstream GitNexus impact analysis for the target callback. After the one-line edit, verify the callback and file through the normal project, all three project inventories, Procedure and shared-`dist` proofs, complete CLI and coverage gates, Core and retained R3 gates, packed-package preflights, historical object-only verification, and final 22-path equality.

Historical verification reads retained committed Git objects only. It must not regenerate evidence, discover protected worktrees, read private/untracked source, or recapture live state.

## 7. Compatibility and prohibitions

The change is test-only and preserves production behavior, package scripts, Core configuration, public interfaces, provider behavior, activation, release, publication, and T7 state. It does not authorize a suite-wide timeout, helper or fixture edits, assertion changes, lane or worker changes, a fifth CLI path, upstream synchronization, push, merge, rebase, cherry-pick, squash, amend, or other history rewrite.

## 8. Rollback

Rollback is one-line and path-local: restore only the approved-context callback terminator if a required gate fails. Never reset, stash, clean, broadly checkout, discard inherited work, or modify predecessor governance/evidence.

## 9. Code-spec decision

No code-spec update is required. This is a bounded callback budget for a demonstrated full-suite scheduling condition, not a reusable production or package contract.

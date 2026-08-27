# Implementation Plan

## 1. Freeze and Inventory

- [ ] Verify pinned refs, merge base, ancestry, backup refs, and clean worktree.
- [ ] Run GitNexus impact analysis for central symbols before edits.
- [ ] Generate overlap and active/distribution addition inventories.
- [ ] Classify every in-scope path under `research/merge-path-decisions.tsv`.

## 2. Merge

- [ ] Run `git merge --no-commit --no-ff 64e663694201005bc87766ef22de89b8da3d4d79`.
- [ ] Verify `MERGE_HEAD`.
- [ ] Resolve conflicts semantically; no blanket ours/theirs.
- [ ] Run initial GitNexus change detection.

## 3. Reconcile

- [ ] Task/session/path safety and shipped template copies.
- [ ] Shared hooks and retained Claude/Codex copies.
- [ ] Init/update/migration/uninstall lifecycle safety.
- [ ] Codex user config preservation.
- [ ] Five-command and two-host active surface.
- [ ] Reduced source/packed template surface.
- [ ] Package versions, lockfile, migration manifests, release checks.
- [ ] Frozen Research submodule gitlinks required by I3; unchanged `.gitmodules`.
- [ ] Executable specs and focused regression tests.

## 4. Verify

- [ ] Focused task/session, hook, Codex, lifecycle, registry, Research, and packed tests.
- [ ] Core and CLI lint, build, typecheck, and full suites.
- [ ] `verify-packed-core`, `verify-packed-cli`, `smoke-installed-cli`, `check-versions`.
- [ ] Exact Research inventory and forbidden payload checks.
- [ ] Ancestry and excluded-evidence checks.
- [ ] `git diff --check` and task validation.
- [ ] GitNexus final `detect_changes`; inspect HIGH/CRITICAL flows.
- [ ] Recheck original dirty worktree state.

## Blocker #155: Full-Suite Test-Budget Ownership

Evidence from the integrated tree:

- CLI full suite: 96/97 files and 1155/1156 tests passed.
- `research-dispatch-activation.integration.test.ts` aggregated four independent full fixtures under one `30_000` ms callback and completed in 31.652 seconds.
- The callback performs repeated synchronous Git/process/filesystem work, but every mutable path is owned by its fresh sandbox; no shared-output or production defect was found.

Authorized correction:

- Split malformed request, request-parent symlink, policy-digest drift, and normalized-scope drift into four ordinary sequential tests in the same file and `describe`.
- Preserve each scenario body, exact error assertion, ordering, and explicit `30_000` ms budget.
- Preserve Vitest projects, orders, worker counts, lane membership, and production code unchanged.
- Verify the exact file through project `normal`, then run one direct full CLI acceptance on the corrected tree. Preserve any new full-suite failure instead of immediately rerunning.
- Inspect retained T4 producer/reconciliation evidence after the suite and restore only preverified-clean generated drift from the current index.

Verification result:

- CLI lint and typecheck passed.
- Focused `normal` project file passed: 1 file, 22 tests; split cases completed in 0.85–1.15 seconds.
- First complete run proved all four split cases under four-worker load, then failed only because I3 rejected staged protected gitlinks.
- Temporarily restoring only the two frozen Research gitlinks in the pre-merge index allowed complete CLI to pass: 97 files, 1159 tests, 626.88 seconds. Restoring upstream gitlinks afterward validated only that temporary index, not the final clean merge tree.
- Both complete runs rewrote only the two known T4 generated evidence files; both were restored from their preverified-clean index bytes.
- Pre-merge `.husky/pre-commit` passed with the temporary I3-valid index: lint-staged, Core 46 files/727 passed/1 skipped, and CLI 97 files/1159 passed. The two generated evidence files were restored again before commit.
- The first archive auto-commit then tested the clean merge index and failed only I3 after 96/97 CLI files and 1158/1159 tests: `Protected gitlink mismatch: docs-site`. This proves the conditional Research-specific pin dependency missed by the earlier temporary-index procedure.
- Final correction preserved frozen Research gitlinks `docs-site@be7684f2086abb9b8e24d4d35733a7dda3123a0f` and `marketplace@d7a18bb5411c700237d21483d6889ac296ef0301` in the amended merge commit; exact parents remained `f2f4e525...` and `64e663694...`.
- Clean final index passed focused I3: 1 file, 7 tests. Exact `.husky/pre-commit` then passed: Core 46 files/727 passed/1 skipped; CLI 97 files/1159 passed in 811.48 seconds. Only the two known T4 generated evidence files changed and were restored; lint-staged left no stash.

## 5. Finish

- [ ] Commit merge/work with normal hooks.
- [ ] Archive this task in separate commit.
- [ ] Record journal in separate commit.
- [ ] Atomically advance local `variant/research-workflow` with expected-old CAS.
- [ ] Confirm no remote ref, tag, release, provider/model, C11, or blocked evidence changed.

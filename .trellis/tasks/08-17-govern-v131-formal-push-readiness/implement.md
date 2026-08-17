# Implementation Plan — Formal v1.3.1 push readiness governance

## Preconditions

- Work only in the current review worktree and preserve all predecessor history.
- HEAD before this task is `0037bc4261a08541c5b10085c7d8cb349f574711`.
- R3 technical commit is `0028183901b74263a70dacca98bb936dc792ced4` with exactly 22 paths.
- The inherited dirty files `AGENTS.md` and `CLAUDE.md` remain unstaged at the hashes in `task.json`.
- This phase performs no technical edit, assurance run, provider call, operator decision, archive, journal, remote access, evidence transmission, push, release, publication, or activation.

## Stage 1 — Authenticate the baseline

1. Confirm branch, HEAD, merge base, forward-only divergence, empty index, and current dirty paths.
2. Authenticate the exact R3 technical and closure inventories.
3. Authenticate frozen Procedure bytes/digest, I1/I2 retained Git objects, T4 protected evidence, exact-nine Attempts 1–3, and submodule gitlinks.
4. Inspect inherited `AGENTS.md` and `CLAUDE.md` diffs, record their current content hashes, and preserve them without staging.

Stop on unexplained drift. Known inherited GitNexus-block changes are recorded, not repaired or staged.

## Stage 2 — Complete and activate this task

1. Require exactly six files:
   - `task.json`;
   - `prd.md`;
   - `design.md`;
   - `implement.md`;
   - `implement.jsonl`;
   - `check.jsonl`.
2. Confirm there is no `research/` directory or extra file.
3. Validate all authority flags against the PRD: only this governance task and future task creation are authorized.
4. Run task validation, then start the task through the repository workflow.
5. Re-run validation after activation.

Stop if activation changes or creates a path outside the exact task directory, or if a future execution authority becomes true.

## Stage 3 — Review and verify the overlay

1. Run path-scoped `git diff --check`.
2. Review every task file against the prior R3 handoff, T6 contract, T7 inactive task, parent migration stop boundary, repository workflow, and contribution guidance.
3. Confirm the ordered gates are complete and independent.
4. Confirm no code-spec change is justified.
5. Run an independent governance review; any concrete defect must be fixed before staging.

## Stage 4 — Stage and commit G-PRE-PUSH

1. Stage the six owned paths individually; never use repository-wide staging.
2. Compare staged names with `meta.ownedPaths` by exact set equality.
3. Inspect the complete staged diff and run staged `git diff --check`.
4. Run GitNexus staged/compare change detection. Governance files should have no indexed-symbol or execution-flow impact; stop on unexplained HIGH/CRITICAL scope.
5. Commit the six-file governance overlay as a new descendant of `0037bc42`.
6. Verify the commit contains exactly six paths and leaves `AGENTS.md`, `CLAUDE.md`, submodules, technical paths, evidence, and runtime state outside the commit.
7. Mark Task #81 complete only after the commit verifies.

## Stage 5 — Handoff

After the governance commit, create a separate G-I3 task for Task #72. Do not create I3 bytes under this task. The future G-I3 task must independently freeze its inventory, validators, commit boundaries, and authority flags before implementation.

## Success Boundary

Completion means one verified six-file G-PRE-PUSH governance commit after R3, with immutable evidence authenticated, exact future gate order frozen, all later execution/operational authorities false, and no technical/provider/operator/archive/journal/network/push action performed.

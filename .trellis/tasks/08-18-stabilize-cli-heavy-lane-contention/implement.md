# Implementation Plan — Stabilize CLI heavy-lane contention

## Replacement-attempt authority

- The original exactly-once commit-launch authorization was consumed by one hook-enabled exact-nine attempt. Git created no commit, and HEAD remained `c7d3423bbe5bade60a4fa9a02ea1849b5403ea70`.
- That hook completed Core with 40 files and 664 tests passed and 1 skipped, then completed CLI `procedure-207-packages` with 1 file and 6 tests passed. It was externally stopped before the other three CLI projects ran; output ended with `ELIFECYCLE`, with no recorded assertion failure.
- Exact recovery restored `status: in_progress`, `completedAt: null`, and `executionState: in_progress`; unstaged only the nine repair paths while preserving their worktree bytes; and left exactly the six G-I3 files staged at their authenticated blobs.
- The user's 2026-08-18 instruction, “执行修复”, authorizes exactly one replacement launch of the same exact-nine, hook-enabled commit command. It authorizes no changed inventory or message, no third launch, and no later stage.
- The independent producer and complete coverage commands already have authenticated passing evidence and must not be rerun. The replacement normal hook is the only long command now authorized.
- `AGENTS.md`, `CLAUDE.md`, `docs-site`, and `marketplace` retain their authenticated states; no I3/S3 output exists.

Stages 0–5 below describe the completed preparation and the bounded reauthentication needed before replacement. They do not authorize recreating technical bytes or rerunning the independent producer or complete coverage commands.

## Stage 0 — Authenticate the recovered boundary

1. Confirm HEAD remains `c7d3423bbe5bade60a4fa9a02ea1849b5403ea70` and no first-attempt commit exists.
2. Confirm the task remains in the exact activation state: `status: in_progress`, `completedAt: null`, `meta.executionState: in_progress`.
3. Reauthenticate the exact six G-I3 staged paths at their recorded blob OIDs, protected hashes, submodule gitlinks, and absence of I3/S3 outputs.
4. Confirm exactly the nine repair paths are unstaged and their reviewed worktree bytes survived recovery.
5. Do not run or retry the G-I3 commit.

## Stage 1 — Retain completed impact proof

1. Retain the completed GitNexus upstream impact result for the indexed `packages/cli/vitest.config.ts` configuration/export symbol.
2. Do not edit the config, either unit-test spec, tests, production code, package scripts, hook, Core configuration, evidence, or G-I3.
3. Confirm the technical/spec subject remains exactly the three paths in `meta.plannedTechnicalInventory`.

## Stage 2 — Govern the replacement attempt

1. Record the first launch, partial hook result, unchanged HEAD, and exact recovery in the six task artifacts.
2. Record the fresh one-launch replacement authority without changing the successful commit's exact nine-path inventory, command, message, hook, or completion transition.
3. Preserve all later-stage authority flags as false.
4. Keep lifecycle at the activation state until immediately before the replacement commit.

## Stage 3 — Governance and subject reauthentication

1. Validate `task.json`, `implement.jsonl`, and `check.jsonl` syntax and check formatting across only the six task artifacts.
2. Inspect the six-artifact governance diff for exact first-attempt facts, replacement authority, no third launch, and unchanged later-stage false flags.
3. Reauthenticate that the reviewed technical/spec subject remains byte-identical in exactly the three paths from `meta.plannedTechnicalInventory`.
4. Retain the previously authenticated exact 1/1/82/2 disjoint project partition and 86-file union; do not alter project ownership, setup, orders, workers, timeout defaults, or coverage placement.
5. Confirm the replacement commit inventory remains exactly `meta.plannedCombinedCommitInventory`.

## Stage 4 — Retain focused causal evidence

1. Retain the authenticated T4 production-evidence bytes and the passing independent `methodology-116-production` result.
2. Do not rerun this command:

   ```text
   NODE_OPTIONS= pnpm --dir packages/cli exec vitest run --project methodology-116-production --reporter=dot
   ```

3. Retain the authenticated complete coverage result, including its normal-lane coverage reconciliation, from before the first commit launch.
4. Do not repeat focused tests, raise a timeout, add a lane member, or serialize normal automatically.

## Stage 5 — Replacement pre-commit checks

1. Retain the previously authenticated pre-commit basis, including the passing complete coverage result; do not relaunch coverage.
2. Reauthenticate T3/T4/T5, I1/S1, I2/S2, T6 Attempts 1–3, protected hashes, submodule gitlinks, exact G-I3 staged blobs, and the absence of I3/S3 outputs.
3. Run formatting/syntax validation and `git diff --check` only as needed for the exact nine planned paths, then inspect the complete diff.
4. Confirm no commit, pnpm, Vitest, provider, or other long-running process is active before the replacement launch.

Do not separately run the independent producer, complete coverage, plain complete CLI, or root test suite. The replacement normal commit hook is the only newly authorized long gate.

## Stage 6 — Exact atomic replacement commit

The first launch consumed the original exactly-once authority and created no commit. This stage is the separately authorized second attempt and may be launched exactly once. Its command, message, path inventory, hook, and success transition are identical to the first attempt.

1. Prepare only the planned task completion transition: `status: completed`, `completedAt: "2026-08-18"`, `meta.executionState: completed`; keep `commit: null` to avoid self-reference.
2. Validate all six task artifacts and JSON/JSONL syntax.
3. Stage the exact nine planned paths individually. Do not unstage or modify the existing G-I3 files.
4. Verify separately:
   - the stabilization subset equals `meta.plannedCombinedCommitInventory`;
   - the preserved G-I3 subset equals `meta.preservedGI3StagedInventory` at every OID in `meta.preservedGI3StagedBlobs`;
   - the complete staged set is exactly fifteen paths: nine stabilization paths plus six preserved G-I3 paths.
5. Run GitNexus change detection immediately before commit and stop on unexplained symbols or execution flows.
6. Launch the authorized replacement of this exact noninteractive commit once with the Bash tool's background execution control, then monitor that original process to its terminal exit and retain its complete output:

   ```text
   git commit --only \
     -m "test(cli): isolate production harness lane" \
     -m "Co-Authored-By: Claude <noreply@anthropic.com>" \
     -- \
     .trellis/tasks/08-18-stabilize-cli-heavy-lane-contention/task.json \
     .trellis/tasks/08-18-stabilize-cli-heavy-lane-contention/prd.md \
     .trellis/tasks/08-18-stabilize-cli-heavy-lane-contention/design.md \
     .trellis/tasks/08-18-stabilize-cli-heavy-lane-contention/implement.md \
     .trellis/tasks/08-18-stabilize-cli-heavy-lane-contention/implement.jsonl \
     .trellis/tasks/08-18-stabilize-cli-heavy-lane-contention/check.jsonl \
     packages/cli/vitest.config.ts \
     .trellis/spec/cli/unit-test/conventions.md \
     .trellis/spec/cli/unit-test/index.md
   ```

   Background execution accommodates the complete hook's runtime; it is not a hook bypass or retry loop. Never use `--no-verify`, direct plumbing, hook edits, hidden unstaged support changes, a changed message, a duplicate replacement launch, or a different path inventory.
7. If the replacement hook fails or is interrupted, no commit is created:
   - preserve the replacement background process's complete output and terminal status;
   - restore `task.json` in the worktree to the exact activation state: `status: in_progress`, `completedAt: null`, `meta.executionState: in_progress`;
   - run `git restore --staged --` with exactly the same nine literal pathspecs shown in step 6, retaining every worktree byte and naming no G-I3 path;
   - verify the complete staged set is again exactly the six G-I3 paths at the OIDs in `meta.preservedGI3StagedBlobs`;
   - verify no staged `completed` task blob remains;
   - stop without a third commit launch and without rerunning the producer or coverage command.
8. If the replacement hook passes, verify:
   - the commit's parent is `c7d3423bbe5bade60a4fa9a02ea1849b5403ea70`;
   - its path inventory is exactly nine;
   - all three technical/spec blobs equal the reviewed worktree bytes;
   - the task is completed by the same atomic commit with the exact planned lifecycle fields;
   - the exact six G-I3 files remain staged at every original blob OID;
   - protected files, submodules, evidence, and attempts remain unchanged.

## Stage 7 — Stop and hand off

1. Complete internal stabilization tracking only after the exact commit reauthenticates.
2. Keep I3 creation blocked.
3. Report that the current G-I3 governance is stale because its predecessor and package-tree equality clauses predate the config repair.
4. Stop for a separate G-I3 governance reconciliation plan and fresh authorization. Do not edit or commit G-I3 in this task.

## Success boundary

Success is one authenticated exact-nine descendant commit created by the single authorized replacement launch, introducing the four-lane runner contract, passing the unchanged complete hook, leaving the original G-I3 six-file staged set intact, and performing no later-stage action.

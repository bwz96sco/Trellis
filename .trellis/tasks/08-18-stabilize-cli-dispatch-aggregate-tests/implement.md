# Implementation Plan — Stabilize CLI dispatch aggregate tests

## Preconditions

- Work only in the current review worktree.
- Require HEAD `753a5d9a8b1aa293a42f27201f3d9dd458edd723`, tree `59d88a337a563cb90e875cc7197489fa4c1a6e93`, and parent `c7d3423bbe5bade60a4fa9a02ea1849b5403ea70`.
- Preserve the six staged G-I3 files at the blob OIDs recorded in `task.json`.
- Preserve `AGENTS.md`, `CLAUDE.md`, `docs-site`, and `marketplace` exactly.
- Use literal path allowlists. Never amend, reset, rebase, squash, clean, stash, broadly stage, or bypass the hook.

## Stage 1 — Activate the governed repair

1. Parse `task.json` and every JSONL line; check Markdown formatting and run `task.py validate`.
2. Confirm the task owns exactly six artifacts, contains no `research/` directory, has no parent link, and records no repair-time spec update.
3. Start the task only after the artifacts match the approved plan. Require `status: in_progress`, `completedAt: null`, and `meta.executionState: in_progress`.
4. Reauthenticate HEAD, protected hashes, gitlinks, and the six staged G-I3 blobs.

## Stage 2 — Refresh GitNexus and assess impact

1. Run `node .gitnexus/run.cjs analyze --force --index-only` and require GitNexus status to match current HEAD without changing protected guidance files.
2. Query the two aggregate registrations and their files. Run upstream impact with tests included for any indexed callbacks or suites.
3. Record direct callers, affected processes, and risk. The expected classification is LOW and test-only because no named function, class, method, helper, production symbol, or config symbol changes.
4. Stop before editing if risk is HIGH or CRITICAL, a production flow is implicated, or another technical path is required.

## Stage 3 — Split exactly two aggregate tests

1. In `research-dispatch-activation.integration.test.ts`, replace the five-scenario aggregate with five ordinary serial tests in the same order. Keep every scenario statement and assertion, the first three inline mock restores, and an explicit `30_000` on each registration.
2. In `research-dispatch-approved-result.test.ts`, replace the four-scenario aggregate with four ordinary serial tests in the same order. Keep every scenario statement and assertion, inherit the suite timeout, keep replacement last, and preserve `openSync` before `readFileSync`.
3. Add no helper, table, concurrency marker, retry, import, timeout change, fixture edit, production edit, config edit, spec edit, lane change, worker change, or fifth project.
4. Inspect the exact two-file diff. Stop if any assertion, error expectation, filesystem operation, mock restoration, cleanup action, or scenario order changes.

## Stage 4 — Focused verification

1. Run exact-file Prettier checking over the two tests. If the path-aware HEAD blobs are already non-clean, record that baseline qualification and do not introduce a broad whole-file rewrite.
2. Run targeted ESLint over the two tests.
3. Run `pnpm --dir packages/cli typecheck`.
4. Run both files together under `--project normal` with no worker override. Require 2 files and 73 tests passing: activation 19, approved result 54.
5. List all four projects and independently discover raw `*.test.ts` files. Require exact pairwise-disjoint ownership `1/1/82/2` and union 86.
6. Reauthenticate protected hashes, gitlinks, historical evidence, no I3/S3 outputs, and the six staged G-I3 blobs.

## Stage 5 — Prepare exact-eight commit

1. Transition only this task to `status: completed`, `completedAt: "2026-08-18"`, and `meta.executionState: completed`.
2. Validate the six task artifacts again.
3. Stage the six task files and two tests individually. Require the complete index to contain exactly fourteen paths: the eight repair paths plus the preserved six G-I3 paths.
4. Run `git diff --cached --check`, inspect the full staged repair diff, and run GitNexus staged and compare-scope detection against `variant/research-workflow`.
5. Stop on any unexplained path, production execution-flow impact, protected-path drift, historical-evidence drift, or lifecycle mismatch.

## Stage 6 — One hook-enabled commit launch

1. Launch once in the background:

   ```text
   git commit --only \
     -m "test(cli): split dispatch aggregate scenarios" \
     -m "Co-Authored-By: Claude <noreply@anthropic.com>" \
     -- <literal six task paths> <literal two test paths>
   ```

2. Do not redirect output to a repository file. Do not impose a launcher timeout shorter than the prior 879.54-second run.
3. The normal hook is the only complete repair gate. Expected successful CLI result: 86 files and 1,014 tests.
4. If the hook fails or is interrupted, do not relaunch. Restore this task to activation lifecycle, unstage exactly the eight repair paths, retain their worktree bytes, require exactly the six original G-I3 staged blobs, and stop.
5. On success, authenticate parent `753a5d9a…`, exact eight-path commit inventory, task completed state, path modes/blobs, protected hashes, gitlinks, historical evidence, no production/config/spec path, and unchanged six-file G-I3 staging.

## Success boundary

Success is one authenticated exact-eight forward commit that splits the two aggregate tests into nine passing scenario-level tests under unchanged budgets and leaves G-I3 staged but unreconciled. The next stage is G-I3 reconciliation to the new predecessor; no I3, S3, M0-A4, provider, remote, archive, journal, push, publication, release, or activation action occurs inside this task.

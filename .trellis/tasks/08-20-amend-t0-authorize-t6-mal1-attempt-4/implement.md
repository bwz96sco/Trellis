# T0A — T6 MAL-1 Attempt-4 implementation plan

## Ordered execution

1. Authenticate clean parent `f2f34b7f`, its exact-three successor-scope correction from `98899925`, I3/S3/G-I3 ancestry, closure identity, protected hashes, gitlinks, and immutable Attempts 1–3.
2. Create this standalone task with exactly six standard files; do not modify a parent task.
3. Encode exact T0A, M0-A4, and prospective M1-A4 inventories plus all denied authorities in `task.json`.
4. Validate JSON and each JSONL line, run task validation, path-scoped diff checks, retained I3 verification, exact inventory checks, and GitNexus staged/compare detection.
5. Start the governance task so its committed status is `in_progress`; verify no path outside exact-six changed.
6. Commit exact-six through normal hooks while preserving full hook output and process telemetry.
7. Authenticate the resulting parent, tree, path modes, blobs, exact inventory, protected hashes, and gitlinks.
8. Stop. Obtain a fresh user instruction before editing any M0-A4 path.

## Future M0-A4 outline

After fresh authorization:

1. Refresh GitNexus index without accepting protected-file drift.
2. Run upstream impact on every reviewer-program symbol that will change; stop and warn on HIGH or CRITICAL risk.
3. Modify exactly the T6 task, reviewer assignment, and reviewer program.
4. Rebind to Attempt 4, I3, S3, G-I3 closure, and the committed T0A boundary.
5. Assign a genuinely new reviewer agent/session/branch/worktree.
6. Correct isolated pnpm offline metadata-cache preparation; preserve network denial and technical subject bytes.
7. Run `uv run python .../mal1-review.py --self-check`, retained I3 verification, task validation, focused checks, exact-three staged verification, and GitNexus detection.
8. Commit exact-three with normal hooks; authenticate and stop before M1-A4.

## T0A verification

- `uv run python ./.trellis/scripts/task.py validate amend-t0-authorize-t6-mal1-attempt-4`
- Parse `task.json` and every JSONL line independently.
- `node packages/cli/scripts/research-v131-installed-package-audit-i3.mjs --verify`
- `git diff --check -- .trellis/tasks/08-20-amend-t0-authorize-t6-mal1-attempt-4`
- Verify worktree and index contain exactly the six owned paths.
- Run GitNexus `detect_changes` for staged and compare scopes.
- Run one normal-hook exact-six commit with telemetry.

## Stop routes

Stop on any identity, ancestry, ownership, inventory, protected hash, gitlink, task validation, retained I3, GitNexus, or hook failure. Stop on any request to combine M0-A4, M1-A4, T6-CLOSE, or T7 authority. Preserve failure output before retry; never rewrite committed history.

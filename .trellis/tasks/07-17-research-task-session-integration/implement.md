# Implementation — Research Task and session integration

## Pre-edit impact and baselines

- [x] Run GitNexus upstream impact for every existing symbol to edit: research command registration/lifecycle Run handlers, Task load/write APIs if changed, active Task set/clear/archive cleanup, and relevant tests/spec writers.
- [x] Warn before HIGH/CRITICAL edits; redesign to avoid core Task/schema edits where possible.
- [x] Capture focused research CLI and Task/session archive baselines before production edits.

## Tests first — Task links

- [x] Add command tests for help/registration and structured JSON output.
- [x] Add integration tests for link/unlink, partial merge, unknown-field preservation, and ledger byte-equivalence.
- [x] Add validation tests for ID prefixes, missing entities, inconsistent hierarchy, malformed existing metadata, traversal, separators, missing task JSON, and symlink escape.

## Tests first — session pointers

- [x] Add Python regression tests for `resolve/set/clear_current_run` and meaningful-state deletion rules.
- [x] Add Task finish test preserving `current_run` and unknown keys.
- [x] Add Task archive test clearing matching `current_task` across sessions while preserving other state and non-matching sessions.
- [x] Add Run command integration tests for start/terminal/invalidate pointer updates, matching clears, missing context, dry-run, invalid transition, and write failure.

## Implementation

- [x] Add research Task link/unlink CLI using public core Task and research subpaths.
- [x] Add safe direct-child Task resolver and relationship validation.
- [x] Extend shipped `active_task.py` with generic pointer RMW and current Run helpers.
- [x] Change Task finish/archive cleanup from whole-file deletion to pointer-specific clearing.
- [x] Mirror Python changes into dogfood `.trellis/scripts` copies.
- [x] Add CLI-local explicit-context Run pointer helper and wire it only after successful canonical Run events.
- [x] Keep Task schema/status/phase and research core/store unchanged unless tests prove a minimal required fix.

## Verification

- [x] Run focused research command and Task/session test suites.
- [x] Run explicit `trellis-check` and fix scoped findings. Main session only; implement-agent recursion guard applies.
- [x] Update `commands-research.md`, `script-conventions.md`, and `workflow-state-contract.md` with executable contracts; update supporting specs only where behavior changed.
- [x] Run affected CLI regressions, Python lint, CLI lint/typecheck/build, core build if public types are consumed, and root typecheck.
- [x] Verify shipped/dogfood Python parity and built template copy.
- [x] Run `git diff --check`.
- [x] Refresh GitNexus index and run change detection against `main`. Whole-tree detection reports HIGH because the working tree contains unrelated pre-existing research/workflow changes; task-owned production symbol impacts are LOW.

## Rollback

- Task links remain harmless optional namespaced metadata if command registration is removed.
- Canonical research state never depends on session pointers.
- Never roll back to whole-session-file deletion when clearing one pointer.

## Commit

- Do not commit unless user explicitly requests it.

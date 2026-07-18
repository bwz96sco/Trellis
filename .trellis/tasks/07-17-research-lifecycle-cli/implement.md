# Implementation — Research lifecycle CLI

## Pre-edit impact

- [x] Run GitNexus context/impact for CLI root registration and update-notice call path.
- [x] Report impact: both existing seams LOW risk, one file-level caller, no indexed process flow.
- [x] Capture focused CLI and full-suite baseline; baseline contained two missing marketplace workflow fixture failures.

## Tests first

- [x] Add root resolution tests for exact cwd, explicit relative/absolute `--root`, missing `.trellis`, and nested repo behavior.
- [x] Add registration test for complete `research` command tree and enum parsers.
- [x] Add init/status/validate/rebuild integration tests on real temp files.
- [x] Add lifecycle create/allowed/forbidden transition integration tests.
- [x] Add dry-run, idempotent replay, JSON output, and projection-failure tests.
- [x] Add root startup JSON-silence regression coverage.

## Implementation

- [x] Add research CLI common root, validation, mutation, and output helpers.
- [x] Add exported init/status/validate/rebuild operations.
- [x] Add Quest/Campaign/Run/Evidence/Claim lifecycle operations.
- [x] Add Commander registration and root CLI wiring.
- [x] Suppress startup update notice only for `--json` invocations.
- [x] Keep repository/artifact/dispatch/Task/workflow/hook/Mempal commands out of scope.

## Verification

- [x] Focused research CLI tests passed: 17 tests.
- [x] Affected init/update regressions passed: 92 tests.
- [x] Core suite passed: 362 tests, 1 skipped.
- [x] Full CLI suite introduced no new failures; only two pre-existing missing marketplace workflow fixture failures remain.
- [x] CLI and core lint/typecheck/build passed.
- [x] Root typecheck and built consumer import passed.
- [x] Live built CLI lifecycle and JSON startup smoke tests passed.
- [x] Independent `trellis-check` found no scoped defects.
- [x] Add `.trellis/spec/cli/backend/commands-research.md` and update backend index.
- [x] Run `git diff --check`.
- [x] GitNexus change detection reported LOW risk and zero affected indexed processes.

## Rollback

- Research CLI registration/modules are additive and removable without touching `.trellis/research` data.
- JSON update-notice suppression is an isolated root-startup change and can revert independently.

## Commit

- Not performed. User requested no commit for implementation children.

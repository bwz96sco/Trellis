# CS6-7 implementation plan

## Preconditions

- Exact committed S11 exists.
- Fresh reviewer identity and isolation are recorded in M0.
- Separate activation and assurance-run authorization exist.

## Ordered work

1. Verify S11 commit/tree/freeze record and M0 independence.
2. Snapshot repository/protected paths and create isolated scratch/output directories.
3. Extract exact S11 with no working-tree overlay.
4. Run all predetermined core, CLI, package, harness, integration, packed-install, report, replay, historical-lock, and containment commands; collect all exits rather than aborting the corpus.
5. Recompute accepted member/package/report/harness identities independently.
6. Produce exactly eight evidence files, then derive `machine-verdict.json`.
7. Verify output count/names/digests, zero repository mutation, and false authority flags.
8. Stop without repair. Commit M11 only if separately authorized.

## Verification

- exact S11 `git rev-parse` and extracted-tree digest
- complete command ledger with one row per required command
- exact nine-file allowlist check
- 116 evidence rows and exact 17/65/13/20/876 reconciliation
- protected before/after snapshots
- `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11`

## Stop/retry

Any defect or environment failure is recorded as fail. No repair occurs in this task. A rerun requires a separately governed subject/run identity.

## Commit boundaries

M0 and M11 are separate future commits. No commit or run is currently authorized.

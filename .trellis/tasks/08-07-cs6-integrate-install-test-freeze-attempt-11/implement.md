# CS6-6 implementation plan

## Preconditions

- Exact accepted CS6-1 through CS6-5 commits are frozen.
- Separate activation and integration/freezer assignment exist.

## Ordered work

1. Capture exact integrated inputs and historical Procedure blob locks.
2. Add archive-safe integration tests and installed-package audit script.
3. Build real core/CLI tarballs and record their digests/inventories.
4. Install with npm and pnpm into separate external temporary repositories.
5. Run installed accepted-bundle, 17-package, record-result, replay, report-v2, update/reinstall, and authority-containment checks.
6. Run focused/full relevant suites and the 116-case production harness.
7. Emit deterministic I11 integration/install evidence only if all checks pass.
8. Under a separate freeze instruction, create the exact placeholder-free S11 record as the sole S commit payload.
9. Verify protected/historical/no-drift boundaries and stop before MAL-1 assignment.

## Verification

- real `pnpm pack`/`npm pack` commands confirmed from package scripts
- tarball inventory and digest checks
- external npm and pnpm install commands
- focused integration tests and full relevant suites
- archive extraction with no `.git` plus historical lock verification
- `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-07-cs6-integrate-install-test-freeze-attempt-11`
- path-scoped `git diff --check`

## Stop/rollback

Return technical defects to owning children. Remove only uncommitted CS6-6 paths. Never amend I11/S11 or historical evidence.

## Commit boundaries

I11 and S11 are separate future commits and separately authorized. No commit is currently authorized.

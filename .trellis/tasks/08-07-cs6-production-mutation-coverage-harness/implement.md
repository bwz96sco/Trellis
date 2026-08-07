# CS6-5 implementation plan

## Preconditions

- Exact accepted CS6-2, CS6-3, and CS6-4 commits/identities exist.
- Separate activation and harness owner assignment exist.

## Ordered work

1. Freeze exact production entry points and input identities.
2. Build independent coverage registries for 17/65/13/20/876.
3. Map exactly 116 unique mutation cases to production-consumed inputs.
4. Add self-tests for duplicate/missing/unknown/disconnected/double-counted rows.
5. Execute positive baselines and every mutation in isolated temporary repositories.
6. Capture stable errors, report/result identities, and before/after tree snapshots.
7. Verify all rejection and committed-recovery write semantics.
8. Emit deterministic task-local case evidence and aggregate coverage reports.
9. Run focused/full relevant suites, diff hygiene, task validation, and protected no-drift checks.
10. Stop before commit unless the exact harness boundary is separately authorized.

## Verification

- focused 116-production and CS6 coverage tests
- full relevant CLI/core tests
- exact line/count/digest validation of evidence JSONL
- `git diff --check -- <owned paths>`
- `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-07-cs6-production-mutation-coverage-harness`

## Stop/rollback

Remove only uncommitted harness/test/evidence changes. Return production defects to prior owners.

## Commit boundary

Future boundary C5 contains only owned harness/tests and task-local evidence. No commit is currently authorized.

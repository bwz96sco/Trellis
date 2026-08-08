# G132 implementation plan

## Authorized boundary

This plan authorizes only the already requested G132 governance implementation and validation. It does not authorize staging, commit, A132-0, candidate authoring, assurance, operator decision, production code, tests, registries, specifications, Procedure packages, harnesses, activation, archive, release, publication, or push.

## Ordered work

1. Authenticate `3534529a36a10ea8015a51f71a93e2b78300a563`, `15de62625685c32f00edf9aef8f2c1cf5a05d7bb`, `9392f20ce0dd93107205ed7c28dc964b5879b7bc`, and `0afef5adaea2a58c8c6cc5a3f1a51a054fa1a39d` from exact Git objects.
2. Authenticate all 17 Procedure 2.0.6 lifecycle projection blobs and prove the 13/4 partition.
3. Freeze the exact disposition-aware 17-row 2.0.7 mapping and conditional-nullability schema.
4. Reconcile the immutable 11-family codomain, 65 artifacts, 845 lifecycle bindings, 876 total bindings, and complete 14,365-decision matrix.
5. Freeze the narrow finding-004 supersession while preserving findings 001–003, G131 propagation/digest/reference/no-fifth-change continuity, and experiment lifecycle/closure separation.
6. Create four inactive planning packages and append the canonical parent overlays.
7. Write the five governance records and deterministic validator.
8. Generate validation evidence once, then run at least two read-only verification passes and require byte identity.
9. Run all four task validators and path-scoped `git diff --check`.
10. Stop with an empty stage and no commit; do not proceed to A132-0.

## Stop conditions

Stop rather than invent authority on any unresolved identity, projection, family, row, count, matrix, path, role, or containment mismatch. Stop on any change outside the exact 36 paths, any old-route drift, any inherited protected drift, or any cache/unlisted output.

## Validation commands

```bash
PYTHONDONTWRITEBYTECODE=1 uv run python .trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-2/research/g132-validation.py --write
PYTHONDONTWRITEBYTECODE=1 uv run python .trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-2/research/g132-validation.py --verify
PYTHONDONTWRITEBYTECODE=1 uv run python .trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-2/research/g132-validation.py --verify
uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-2
uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2
uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2
uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-08-decide-evaluation-contract-v1-3-1-attempt-2
git diff --check -- <exact G132 paths>
```

Committed-tree verification uses `--verify --subject <commit>` and remains read-only.

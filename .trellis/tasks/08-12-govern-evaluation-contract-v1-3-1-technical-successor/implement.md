# T0 — Govern evaluation-contract v1.3.1 technical successor implementation plan

## Authorization

Current G0 approval authorizes this governance-only stage. No stage commit is authorized by planning.

## Preconditions

- Explicit Phase-1 G0/T0 authorization
- Exact O133 decision commit 2253df9fb67f8ee84d470da23205e9610f8a4e3e
- Canonical parent 07-29-migrate-research-methodology-to-procedures remains in_progress

## Ordered execution

1. Authenticate all accepted inputs from immutable Git objects.
2. Keep T1-T7 planning-only, unassigned, inactive, and unauthorized.
3. Use strict canonical JSON and deterministic task-local validation.
4. Clear only the session current-task pointer; do not archive or change historical task status.
5. Record host tracker #30-#33 closure as deferred because provider operations are prohibited in this authorization; keep #16 blocked.
6. Run the T0 validator in write mode once and verify mode at least twice.
7. Validate every task package with task.py.
8. Strict-parse all JSON and JSONL with duplicate-key and non-finite rejection.
9. Check exact dirty-path containment and empty index.
10. Run path-scoped git diff --check.

## Exact inventory and commit boundary

The normative path list is in T0 `g0-topology-ownership-and-stage-inventories.json` under keys `T0`. Unknown, missing, duplicate, aliased, or extra paths stop execution. Use path-scoped staging only after separate commit authorization.

## Verification commands

- Python execution uses `uv run python` with bytecode generation disabled.
- Run focused package checks before full package lint/typecheck/test/build.
- Run Core build/test operations serially before CLI consumers of Core `dist`.
- Run `git diff --check -- <owned paths>` and compare the staged set to the exact inventory.
- Run GitNexus impact before existing symbol edits and GitNexus change detection before a future commit.

## Return routes

Input/semantic mismatch returns to a new semantic campaign. Ownership or version collision returns to T0. Technical defects return to the owning T1-T5 stage. Frozen-subject drift creates a new T5 subject. T6/T7 never repair.

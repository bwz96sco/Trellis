# T4 — Build v1.3.1 production-reachable 116-case harness implementation plan

## Authorization

Current G0 approval does not authorize this stage. No stage commit is authorized by planning.

## Preconditions

- Committed G0/T0 governance
- Accepted committed T1 through T3 outputs
- Separate T4 authorization and owner assignment

## Ordered execution

1. Keep 229 historical, 38 expansion, and 116 production populations distinct.
2. Reconcile 17 families, 65 enforceable artifacts, 13 lifecycle dimensions, 20 validators, 876 bindings, 116 mutations, and 3,343 provenance rows independently.
3. Record filesystem and canonical-event before/after observations.
4. Use no live provider and permit no unauthorized writes.
5. Execute exactly 116 deterministic cases through production paths.
6. Reject missing, duplicated, skipped, disconnected-oracle, or population-conflated evidence.
7. Run focused and full relevant CLI suites after stable Core build.
8. Record exact commands, outputs, digests, and zero-write snapshots.

## Exact inventory and commit boundary

The normative path list is in T0 `g0-topology-ownership-and-stage-inventories.json` under keys `T4`. Unknown, missing, duplicate, aliased, or extra paths stop execution. Use path-scoped staging only after separate commit authorization.

## Verification commands

- Python execution uses `uv run python` with bytecode generation disabled.
- Run focused package checks before full package lint/typecheck/test/build.
- Run Core build/test operations serially before CLI consumers of Core `dist`.
- Run `git diff --check -- <owned paths>` and compare the staged set to the exact inventory.
- Run GitNexus impact before existing symbol edits and GitNexus change detection before a future commit.

## Return routes

Input/semantic mismatch returns to a new semantic campaign. Ownership or version collision returns to T0. Technical defects return to the owning T1-T5 stage. Frozen-subject drift creates a new T5 subject. T6/T7 never repair.

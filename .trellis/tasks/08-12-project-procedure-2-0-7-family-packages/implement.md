# T3 — Project immutable Procedure 2.0.7 family packages implementation plan

## Authorization

Current G0 approval does not authorize this stage. No stage commit is authorized by planning.

## Preconditions

- Committed G0/T0 governance
- Accepted committed T1 and T2 interfaces
- Separate T3 authorization and owner assignment

## Ordered execution

1. Use only Procedure 2.0.7 after rechecking collision absence.
2. Preserve every existing Procedure version byte-for-byte.
3. Bind exact source-member provenance, support-pack inventory, and digests.
4. Declare complete worker-visible support files without worker-side discovery.
5. Include no executable validator bodies in support packs.
6. Keep all packages dormant and do not edit live/current/default selection.
7. Require exactly 17 package roots and exactly 12 files per root.
8. Require deterministic byte-identical regeneration.
9. Authenticate all package schemas, identities, inventories, historical resolution, and packed paths.
10. Run task-local historical-version fingerprint comparison.

## Exact inventory and commit boundary

The normative path list is in T0 `g0-topology-ownership-and-stage-inventories.json` under keys `T3`. Unknown, missing, duplicate, aliased, or extra paths stop execution. Use path-scoped staging only after separate commit authorization.

## Verification commands

- Python execution uses `uv run python` with bytecode generation disabled.
- Run focused package checks before full package lint/typecheck/test/build.
- Run Core build/test operations serially before CLI consumers of Core `dist`.
- Run `git diff --check -- <owned paths>` and compare the staged set to the exact inventory.
- Run GitNexus impact before existing symbol edits and GitNexus change detection before a future commit.

## Return routes

Input/semantic mismatch returns to a new semantic campaign. Ownership or version collision returns to T0. Technical defects return to the owning T1-T5 stage. Frozen-subject drift creates a new T5 subject. T6/T7 never repair.

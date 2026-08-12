# T2 — Conform CLI to evaluation-contract v1.3.1 implementation plan

## Authorization

Current G0 approval does not authorize this stage. No stage commit is authorized by planning.

## Preconditions

- Committed G0/T0 governance
- Accepted committed T1 interface
- Separate T2 authorization and owner assignment
- Fresh upstream GitNexus impact for every existing symbol edit

## Ordered execution

1. Production code must never read `.trellis/tasks`, `.git`, or mutable candidate files.
2. Resolve project-first then bundled Procedures without source-tree fallback.
3. Bind exact Procedure and contract identities for current and historical replay.
4. Pre-commit failures produce zero canonical writes.
5. Post-commit projection failure becomes deterministic recovery-required state, never false rollback.
6. Preserve root-owned Result/Proposal recording and worker authority ceilings.
7. Run accepted-bundle, historical-resolution, record-result, replay, revalidation, recovery, materialization, zero-write, parser, and binary tests.
8. Run CLI lint, typecheck, test, and build only after Core build is stable.
9. Update only the three owned CLI/Core-boundary specifications.
10. Run GitNexus change detection before a separately authorized T2 commit.

## Exact inventory and commit boundary

The normative path list is in T0 `g0-topology-ownership-and-stage-inventories.json` under keys `T2`. Unknown, missing, duplicate, aliased, or extra paths stop execution. Use path-scoped staging only after separate commit authorization.

## Verification commands

- Python execution uses `uv run python` with bytecode generation disabled.
- Run focused package checks before full package lint/typecheck/test/build.
- Run Core build/test operations serially before CLI consumers of Core `dist`.
- Run `git diff --check -- <owned paths>` and compare the staged set to the exact inventory.
- Run GitNexus impact before existing symbol edits and GitNexus change detection before a future commit.

## Return routes

Input/semantic mismatch returns to a new semantic campaign. Ownership or version collision returns to T0. Technical defects return to the owning T1-T5 stage. Frozen-subject drift creates a new T5 subject. T6/T7 never repair.

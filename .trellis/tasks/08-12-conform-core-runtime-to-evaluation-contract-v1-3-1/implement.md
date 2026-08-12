# T1 — Conform Core runtime to evaluation-contract v1.3.1 implementation plan

## Authorization

Current G0 approval does not authorize this stage. No stage commit is authorized by planning.

## Preconditions

- Committed G0/T0 governance
- Separate T1 authorization and owner assignment
- Fresh upstream GitNexus impact for every existing symbol edit

## Ordered execution

1. Authenticate exact leaf/member identities.
2. Enforce exact artifact applicability and all applicable lifecycle dimensions.
3. Bind exact validator `(id, version, severity)` triples and canonical closure facts.
4. Fail closed on missing invocation, unknown facts, semantic mismatch, or report digest drift.
5. Preserve historical replay and Proposal-only workers.
6. Write focused failing tests before implementation.
7. Run focused Core suites, then Core lint, typecheck, test, and clean build serially.
8. Update only the two owned Core research specifications.
9. Run GitNexus change detection before a separately authorized T1 commit.

## Exact inventory and commit boundary

The normative path list is in T0 `g0-topology-ownership-and-stage-inventories.json` under keys `T1`. Unknown, missing, duplicate, aliased, or extra paths stop execution. Use path-scoped staging only after separate commit authorization.

## Verification commands

- Python execution uses `uv run python` with bytecode generation disabled.
- Run focused package checks before full package lint/typecheck/test/build.
- Run Core build/test operations serially before CLI consumers of Core `dist`.
- Run `git diff --check -- <owned paths>` and compare the staged set to the exact inventory.
- Run GitNexus impact before existing symbol edits and GitNexus change detection before a future commit.

## Return routes

Input/semantic mismatch returns to a new semantic campaign. Ownership or version collision returns to T0. Technical defects return to the owning T1-T5 stage. Frozen-subject drift creates a new T5 subject. T6/T7 never repair.

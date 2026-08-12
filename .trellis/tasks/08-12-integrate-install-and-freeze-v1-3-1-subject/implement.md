# T5 — Integrate, externally install, and freeze v1.3.1 subject implementation plan

## Authorization

Current G0 approval does not authorize this stage. No stage commit is authorized by planning.

## Preconditions

- Committed G0/T0 governance
- Accepted committed T1 through T4 outputs
- Separate T5 authorization and owner assignment

## Ordered execution

1. Use real Core and CLI tarballs and external npm/pnpm installs outside the repository.
2. Prove no `.git`, `.trellis/tasks`, mutable-worktree, or source-tree contract dependency.
3. Run serial full Core/CLI/workspace checks and packed audits.
4. Freeze exact commit/tree, package/tarball digests, tests/results, semantic inputs, and protected fingerprints.
5. Any post-freeze change creates a new subject and restarts T6.
6. I1 integration and external install checks pass with retained exact evidence.
7. S1 is written only after I1 is immutable and contains no unresolved or self-hash placeholder.
8. Historical versions and inherited dirty paths remain unchanged.
9. Run GitNexus change detection before each separately authorized commit.

## Exact inventory and commit boundary

The normative path list is in T0 `g0-topology-ownership-and-stage-inventories.json` under keys `I1, S1`. Unknown, missing, duplicate, aliased, or extra paths stop execution. Use path-scoped staging only after separate commit authorization.

## Verification commands

- Python execution uses `uv run python` with bytecode generation disabled.
- Run focused package checks before full package lint/typecheck/test/build.
- Run Core build/test operations serially before CLI consumers of Core `dist`.
- Run `git diff --check -- <owned paths>` and compare the staged set to the exact inventory.
- Run GitNexus impact before existing symbol edits and GitNexus change detection before a future commit.

## Return routes

Input/semantic mismatch returns to a new semantic campaign. Ownership or version collision returns to T0. Technical defects return to the owning T1-T5 stage. Frozen-subject drift creates a new T5 subject. T6/T7 never repair.

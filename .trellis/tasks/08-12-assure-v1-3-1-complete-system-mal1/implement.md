# T6 — Assure v1.3.1 complete system with independent MAL-1 implementation plan

## Authorization

Current G0 approval does not authorize this stage. No stage commit is authorized by planning.

## Preconditions

- Committed G0/T0 governance
- Exact committed S1 subject
- Fresh committed M0 reviewer assignment
- Separate T6 activation and assurance-run authorization

## Ordered execution

1. Reviewer identity must differ from every T0-T5 actor and future T7 operator.
2. Review only a clean archive/extracted package subject with no worktree overlay.
3. Cover Core/CLI semantics, 17 packages, 229/38/116 populations, historical replay, malformed overrides, external installation, privacy scans, dirty containment, and live-selection containment.
4. Set `humanReviewed=false`, `humanEquivalent=false`, and perform no repair.
5. A pass cannot auto-accept, activate, archive, release, publish, or push.
6. Execute the full predetermined corpus without skipped commands.
7. Require exact subject and reviewer isolation.
8. Require exactly nine M1 outputs and zero findings for pass.
9. Record every command exit and containment observation.

## Exact inventory and commit boundary

The normative path list is in T0 `g0-topology-ownership-and-stage-inventories.json` under keys `M0, M1`. Unknown, missing, duplicate, aliased, or extra paths stop execution. Use path-scoped staging only after separate commit authorization.

## Verification commands

- Python execution uses `uv run python` with bytecode generation disabled.
- Run focused package checks before full package lint/typecheck/test/build.
- Run Core build/test operations serially before CLI consumers of Core `dist`.
- Run `git diff --check -- <owned paths>` and compare the staged set to the exact inventory.
- Run GitNexus impact before existing symbol edits and GitNexus change detection before a future commit.

## Return routes

Input/semantic mismatch returns to a new semantic campaign. Ownership or version collision returns to T0. Technical defects return to the owning T1-T5 stage. Frozen-subject drift creates a new T5 subject. T6/T7 never repair.

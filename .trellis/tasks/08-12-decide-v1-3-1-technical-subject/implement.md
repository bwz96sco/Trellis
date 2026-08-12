# T7 — Decide exact v1.3.1 technical subject implementation plan

## Authorization

Current G0 approval does not authorize this stage. No stage commit is authorized by planning.

## Preconditions

- Committed G0/T0 governance
- Committed exact M1 assurance
- Fresh genuine operator instruction
- Separate T7 activation and decision authorization

## Ordered execution

1. Do not infer a decision from planning, silence, agent messages, or machine verdict.
2. Allowed outcomes are `accept-with-rationale`, `reject-with-rationale`, or `stop`.
3. Acceptance binds only the exact dormant technical subject and acknowledges machine-only residual risk.
4. Activation remains a separate future P2-12 campaign.
5. Authenticate exact S1/M0/M1 Git objects.
6. Require one explicit operator instruction and non-empty rationale.
7. Write only the exact O0/O1 allowlists.
8. Stop after O1 regardless of outcome.

## Exact inventory and commit boundary

The normative path list is in T0 `g0-topology-ownership-and-stage-inventories.json` under keys `O0, O1`. Unknown, missing, duplicate, aliased, or extra paths stop execution. Use path-scoped staging only after separate commit authorization.

## Verification commands

- Python execution uses `uv run python` with bytecode generation disabled.
- Run focused package checks before full package lint/typecheck/test/build.
- Run Core build/test operations serially before CLI consumers of Core `dist`.
- Run `git diff --check -- <owned paths>` and compare the staged set to the exact inventory.
- Run GitNexus impact before existing symbol edits and GitNexus change detection before a future commit.

## Return routes

Input/semantic mismatch returns to a new semantic campaign. Ownership or version collision returns to T0. Technical defects return to the owning T1-T5 stage. Frozen-subject drift creates a new T5 subject. T6/T7 never repair.

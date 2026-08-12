# A133-bound technical successor implementation plan

## Current authorization

Only G0/T0 governance and planning are authorized. This plan does not authorize T1-T7 execution or any commit.

## Phase 1 — G0/T0

1. Authenticate exact A133/B133/O133 Git objects and accepted digests.
2. Additively classify Attempt-1 as superseded, Attempt-2 as rejected-terminal, and Attempt-3 as accepted-terminal.
3. Freeze baseline `2253df9fb67f8ee84d470da23205e9610f8a4e3e` / `7e5430197841776a6d8d7f31e8b82517473f082f`, package/lock/toolchain identities, inherited dirt, and protected paths.
4. Prove Procedure `2.0.7` absent from all Git refs and allocate it as the next unused version.
5. Create reciprocal topology with exactly T0-T7 and complete planning packages.
6. Freeze exact ownership, stage inventories, actors, commit boundaries, authority, dependencies, return routes, and stop gates.
7. Append only the minimum canonical-parent overlay and clear the stale session pointer without archiving.
8. Run deterministic T0 validation, `task.py validate` for all nine packages, strict JSON/JSONL parsing, and path-scoped diff hygiene.
9. Stop without staging or committing.

## Future stage sequence

```text
committed G0/T0 + new authorization
  -> T1 Core commit
  -> T2 CLI commit
  -> T3 Procedure 2.0.7 commit
  -> T4 harness commit
  -> T5 I1 integration commit
  -> T5 S1 one-file subject freeze commit
  -> T6 M0 reviewer-assignment commit
  -> T6 M1 machine-assurance commit
  -> T7 O0 input-attestation commit
  -> T7 O1 operator technical decision commit
  -> STOP
```

## Verification strategy for future stages

Core build/test operations run serially before CLI consumers of Core `dist`. Every stage authenticates predecessor Git objects, uses exact path-scoped staging, runs focused and full package checks, records exact commands/results, runs GitNexus impact before existing symbol edits, and runs GitNexus change detection before any separately authorized commit.

## Stop gates

Stop on input mismatch, Procedure collision, historical drift, ownership overlap, out-of-inventory path, mutable semantic input, HIGH/CRITICAL impact without approval, call-only edit, worker/provider authority expansion, source-tree dependency in an installed subject, population conflation, unauthorized writes, live-selection change, or failed verification.

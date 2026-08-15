# T0A — v1.3.1 forward technical repair design

## Boundary

This is a standalone forward-only governance overlay. It does not repair Attempt-3 or modify its evidence. It authorizes one narrow technical repair descendant:

```text
Attempt-3 evidence e311146a (immutable fail)
  -> standalone T0A forward-repair authority
  -> R3 technical repair
  -> later standalone I3/S3 governance
```

## T4 reconciliation

The committed T4 producer already preserves two distinct observations. The stale consumer will read both booleans and apply:

```text
actualProductionOutcome == expectedProductionOutcome
and (expectedCodesPresent or productionPrevented)
```

No evidence row is regenerated or reclassified.

## Lint repair

Core and CLI lint changes are mechanical and migration-owned: optional-chain style, unused imports, explicit undefined guards, array syntax, and an explicit Node `TextEncoder` import. They do not change public APIs, runtime selection, or contract semantics.

## Historical verification

Historical verification is authentication, not recapture. In `--verify`, each audit script reads the retained `protected-path-audit.json` bytes from its pinned commit, authenticates commit tree, path/blob identity, byte length, and SHA-256, parses strict JSON, and checks the retained semantic invariants. Existing `gitObjectBytes`, `gitTree`, `gitFileIdentity`, and `sha256` helpers are reused.

Live protected-state capture remains separate and is not invoked for frozen I1/I2 verification. A real archive-isolation regression proves that verification does not depend on host worktree registration or the untracked CS5 file.

## Failure disposition

A failed focused or full check stops the commit. Fix only the demonstrated defect within this governance boundary. A HIGH or CRITICAL GitNexus result, path expansion, historical-evidence mutation, or authority expansion requires a new user-reviewed decision rather than silent continuation.

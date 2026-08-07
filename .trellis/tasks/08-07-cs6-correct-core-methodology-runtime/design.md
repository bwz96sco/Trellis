# CS6-2 core runtime correction design

## Boundary

Corrections stay inside methodology-local adapters. The canonical Research event/state/publication spine is treated as a protected dependency.

## Data flow

```text
accepted leaves + authenticated Procedure package
  -> strict methodology parsing
  -> exact closure/evidence extraction
  -> artifact and lifecycle applicability checks
  -> exact validator binding facts and execution
  -> deterministic report-v2 body/digest
  -> caller receives pass/fail data; no canonical write occurs here
```

## Correction strategy

- Keep semantics data-driven by the accepted v1.3.0 leaves.
- Centralize no new authority; use minimum changes in existing methodology-local functions.
- Treat path identity as normalized logical POSIX identity while keeping filesystem access OS-native.
- Separate applicability from success: an inapplicable dimension is explicit, while an applicable uninvoked obligation fails.
- Build reports from validated facts only and preserve canonical array order where contract-defined.

## Compatibility

Historical Procedure versions and report-v2 vectors remain replayable. New behavior is fail-closed for malformed or inconsistent `2.0.7` inputs and does not silently reinterpret historical records.

## Rollback

Before commit, revert only owned runtime/test edits. After commit, issue a new forward correction; never amend accepted leaves or historical Procedure trees.

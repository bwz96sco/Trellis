# T0A — T6 MAL-1 Attempt-3 design

## Boundary

This is a standalone, forward-only governance overlay. It does not alter corrected T4, I2, or S2. It authenticates two immutable failed attempts, a minimal T6 reviewer correction, and a new exact-nine destination.

```text
corrected T4 e7ed93f6
  -> T5 successor governance 525ea920
  -> exact I2 8fdb45e0
  -> exact S2 a2a4ea08
  -> standalone T0A Attempt-3 authority
  -> exact three-path M0 correction
  -> exact nine-path Attempt-3 assurance
```

## Diagnostics

`CommandResult` retains status and exit code and adds diagnostics only when a command does not pass. Stdout and stderr are normalized to remove private roots and credential-shaped values, bounded independently, and accompanied by original byte length, truncation state, and SHA-256 diagnostic identity. Launch failures and blocked commands record explicit reasons without inventing command output.

This is not a generalized logging facility: successful command output remains absent, and diagnostic bounds exist solely to make a failed assurance run actionable without expanding evidence privacy exposure.

## Corrected T4 interpretation

The runtime audit reads committed corrected T4 evidence. `expectedCodesPresent` and `productionPrevented` remain distinct booleans. A row is accepted only by `expectedCodesPresent || productionPrevented`; prevention is never rewritten as code presence.

## Role, containment, and publication

The reviewer remains the assigned T6 actor, distinct from T0–T5 and future T7. Resuming the same assigned session is allowed; shared T0–T5 scratch remains forbidden. The controlled executable set, provider tripwires, network sandbox, protected-worktree checks, and exact-nine adjacent-stage/one-rename publication remain unchanged.

## Failure disposition

Attempts 1 and 2 are never removed or overwritten. Attempt-3 publishes once to `research/attempt-3`. A failed Attempt-3 remains honest evidence. Any later correction requires another forward-only governance boundary.

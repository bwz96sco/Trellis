# Design — Research core and deterministic store

## Module boundary

```text
packages/core/src/research/
  index.ts
  types.ts
  schema.ts
  ids.ts
  paths.ts
  transitions.ts
  events.ts
  reducer.ts
  store.ts
  projections.ts
  repositories.ts
  artifacts.ts
  dispatch.ts
  context.ts
```

This child may introduce dispatch/proposal schemas but does not implement CLI orchestration.

## Entity state

- Quest status: `active | paused | completed | abandoned`.
- Quest stage: `setup | framing | literature | ideation | experiment | computation | theory | audit | writing | complete`.
- Campaign: `draft | frozen | running | blocked | completed | abandoned`.
- Run: `planned | running | succeeded | failed | cancelled | invalidated`.
- Evidence: `active | superseded | retracted`.
- Claim: `candidate | supported | contested | refuted | withdrawn`.

Transition functions are pure. Reducer is only state constructor. Schemas validate JSON structure; transitions validate semantic legality.

## Event format

Required fields: `schemaVersion`, `eventId`, `seq`, `timestamp`, `kind`, `aggregate`, `related`, `payload`, `actor`, `idempotencyKey`, `provenance`.

Ledger parser reads every non-empty line and reports line number on failure. No tolerant skip. Batch validation reduces against current state in memory before writing.

## Store write path

- Resolve control-plane paths from explicit root.
- Acquire shared lock.
- Read/strict-parse ledger.
- Reconcile sequence cache with ledger head.
- Validate idempotency and proposed batch.
- Append joined JSONL buffer under lock.
- Update runtime sequence file.
- Generate affected projection JSON using stable field ordering and trailing newline.
- Write temp file in target directory, then atomic rename.

If projection update fails after ledger append, throw recoverable error containing new head sequence. `rebuildResearchProjections` regenerates all projection files from ledger.

## Research-local lock

GitNexus rated existing Channel `acquireLock`, `releaseLock`, and `withLock` symbols HIGH risk across Channel create/send/interrupt/thread/worker flows. Keep Channel implementation untouched. Use a research-local lock in `packages/core/src/research/internal/lock.ts` with equivalent exclusive-file, stale-PID, timeout, and `finally` release semantics. Any future shared extraction requires fresh impact analysis and full Channel + Research regression coverage.

## Projection policy

Tracked projections:

- `workspace.json`, `repositories.json`.
- entity JSON inside Quest/Campaign/Run/Evidence/Claim directories.

No committed aggregate index. Every projection carries `schemaVersion`, `projectedThroughSeq`, `updatedAt`. Runtime sequence/cache is disposable.

## Path and artifact validation

- Tracked paths use normalized POSIX relative strings.
- Reject absolute paths, NUL, empty segments, and unresolved repository IDs.
- Permit explicit `..` only for repository locators; artifact paths may not escape registered repo root.
- Optional SHA-256 validates accepted files/manifests.

## API boundary

Export schema parsers, read/status/validate/rebuild functions, repository resolver primitives, and domain mutation functions. Keep low-level ledger append internal.

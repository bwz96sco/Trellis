# Implementation — Research core and deterministic store

## Pre-edit impact

- [x] Query GitNexus context for Channel lock/event/sequence flow.
- [x] Run upstream impact for `acquireLock`, `releaseLock`, `withLock`, and package export/index symbols before edits.
- [x] Report HIGH risk for Channel lock symbols before edits.
- [x] Run focused existing core tests as baseline.

## Tests first

- [x] Add ID/path/artifact schema tests.
- [x] Add entity schema and transition table tests.
- [x] Add strict ledger parse and sequence/idempotency tests.
- [x] Add reducer/projection golden tests.
- [x] Add concurrent writer test.
- [x] Add projection-failure/rebuild recovery test.
- [x] Add dispatch/result/proposal schema tests needed by later children.

## Implementation

- [x] Add research types, IDs, schemas, paths, and transition functions.
- [x] Add strict event parser and pure reducer.
- [x] Add research-local filesystem lock; preserve HIGH-risk Channel lock implementation unchanged.
- [x] Add research store batch append and sequence reconciliation.
- [x] Add deterministic projection writer/rebuilder.
- [x] Add repository/artifact validation primitives.
- [x] Add dispatch/proposal contract parsers without orchestration side effects.
- [x] Export supported API from `packages/core/src/research/index.ts`.
- [x] Add `./research` package export.

## Verification

- [x] Run focused new research-core tests: 5 files, 29 tests passed.
- [x] Run full core tests: 24 files, 362 tests passed, 1 skipped.
- [x] Run core lint/typecheck/build and root declaration-resolution typecheck.
- [x] Verify built `@mindfoldhq/trellis-core/research` import.
- [x] Dispatch explicit `trellis-check`; fix all five scoped findings.
- [x] Run GitNexus comparison against `main`; expected research-only flows, no Channel/Task/Mem flow impact.
- [x] Add `.trellis/spec/core/backend/research-state.md` and update core spec index.
- [x] Run `git diff --check`.

## Rollback

- New research module/export is additive and can be removed without data migration.
- Existing Channel implementation was not modified.
- Research projection failures recover through `rebuildResearchProjections`; canonical ledger remains authoritative.

## Commit

- Not performed. User requested no commit for this child.

# Implementation plan

## Step 0 — Baseline and warning gate

- Confirm C01 is archived, C02 is the only active child, and `docs-site`/`marketplace` remain untouched inherited dirt.
- Record current schema-v1 fixture hashes, package versions, export keys, full core test baseline, and relevant CLI Research baseline.
- Report fresh GitNexus risks before edits: parser HIGH; reducer, batch builder, validation, and commit CRITICAL.
- Run fresh upstream impact for every existing symbol added to the edit set. Stop on scope beyond C02.

Rollback point: planning artifacts only.

## Step 1 — Additive IDs, types, and schemas

- Add event-v2 version constant without changing `RESEARCH_SCHEMA_VERSION`.
- Add activation/approval ID prefixes and constructors.
- Add activation, grant, reduced approval-state, event-v2, and mixed-event types.
- Extend `ResearchState` with four empty/default activation/approval maps.
- Add strict entity/state schemas, digest/hash rules, canonical v2 timestamps, terminal-shape validation, and v2 aggregate refs.
- Keep existing v1 aggregate/entity/event schemas unchanged.

Verify: focused schema tests and package typecheck.

Rollback point: additive types/schemas only; no parser/reducer/store integration.

## Step 2 — Mixed-version event parser

- Preserve ordered v1 kind inventory and payload parsers.
- Add exact v2 kind/payload inventory.
- Refactor `parseResearchEvent` into version-discriminated strict parsing.
- Reuse current ledger sequence, duplicate-ID, source/line, and serialization logic for mixed events.
- Add kind/version, aggregate/ref, unknown-key, timestamp/digest, mixed-order, and round-trip tests.

Verify: `events.test.ts` plus unchanged schema-v1 compatibility fixture bytes.

Rollback point: parser can return to v1-only because no emitter exists.

## Step 3 — Deterministic reducer lifecycle

- Initialize new state maps.
- Add exact ordered-related-ref helper.
- Implement activation planning, approval grant, revoke, and consume transitions.
- Enforce hierarchy, binding equality, uniqueness, event-time expiry replacement, terminal transitions, and no-Result preconditions.
- Validate raw consumption adjacency plus shared timestamp/actor/provenance/idempotency key.
- Reject consumption when its event timestamp is at or after approval `expiresAt`; equality is expired.
- Add `activation-approval.test.ts` for good/base/bad replay cases and proof reducer does not consult wall clock or external state.

Verify: focused reducer tests and full existing reducer/transition tests.

Rollback point: no production emitter; mixed fixture additions can be reverted together.

## Step 4 — Preserve mutation authority boundary

- Do not extend public `ResearchMutation` or event-draft construction.
- Do not edit `buildValidatedBatch`, `validateDispatchBatch`, `validateResearchBatch`, or `commitResearchBatch`.
- Prove current two-event Result + Proposal mutation remains accepted and byte-compatible, including when a test ledger already contains an activation.
- Test consumption only through strict mixed-ledger parsing/reduction: exact preceding Result + Proposal, matching IDs/relations, shared envelope fields, and unexpired event timestamp.
- Reserve activation/grant/revoke emitters for C05 and consumption/mandatory three-event batching for C06.

Verify: focused `dispatch.test.ts`, `store.test.ts`, and `activation-approval.test.ts`.

Rollback point: parser/reducer support only; no new production write authority exists.

## Step 5 — Projection and public compatibility proof

- Avoid editing `writeResearchProjections` unless a failing focused test proves necessary. Any edit requires a new CRITICAL warning.
- Prove activation/approval-only events advance existing projection watermarks while entity data, entity `updatedAt`, file inventory, and schema version remain unchanged.
- Update schema-v1 compatibility assertions to compare frozen old-state subset plus four empty new maps; never rewrite fixture bytes.
- Export additive contracts only through `/research`; assert root barrel and package export keys unchanged.

Verify: schema-v1 compatibility, store rebuild twice, built consumer import, package export tests.

## Step 6 — Full verification and independent review

Run:

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
uv run python ./.trellis/scripts/task.py validate .trellis/tasks/07-23-add-dual-version-activation-approval-state
git diff --check
gitnexus detect-changes --scope all --repo Trellis
```

Also compare before/after:

- schema-v1 fixture bytes and projections;
- package versions/export map/root barrel;
- CLI command help and current v1 Result recording;
- cleanup evidence and packed inventory;
- `docs-site` and `marketplace` status.

Dispatch independent `trellis-check`. Fix only confirmed C02 defects. Update code-spec only when implementation reveals a contract correction. Archive C02 with `--no-commit` after all acceptance checks pass; keep C03-C10 planning/inactive.

## Completion evidence

- Added additive schema-v2 reader/reducer/state support in `types.ts`, `ids.ts`, `schema.ts`, `events.ts`, `reducer.ts`, and the Research subpath barrel. `store.ts`, projections, `ResearchMutation`, package export map/version, root barrel, and CLI production code remain unchanged.
- Added `activation-approval.test.ts` plus schema-v1 compatibility assertions. Frozen fixture hashes remain `b8bb361b...1931` for `events.jsonl` and `719ab037...364e` for `expected-state.json`; projection fixture hashes remain unchanged.
- Independent `trellis-check` found and fixed one defect: v2 initially reused legacy ISO parsing and accepted expanded years. V2 now requires exact four-digit RFC3339 UTC millisecond timestamps while v1 behavior stays compatible.
- Final verification: core 30 files, 449 passed/1 skipped; CLI 51 files, 728 passed; core lint/typecheck/build, CLI typecheck, workspace typecheck, task validation, built Research import, protected-boundary checks, and `git diff --check` passed.
- GitNexus changed-scope result is CRITICAL as expected for parser/reducer edits: 55 symbols and 44 flows. No unexpected store or CLI production flow change was found.
- Executable Research state code-spec now records exact mixed-version signatures, timestamp rules, lifecycle/replay boundaries, test vectors, and C02/C05/C06 emitter ownership.
- `docs-site` and `marketplace` retained their original submodule commits and pre-existing internal dirt. No commit or push occurred during implementation/review.

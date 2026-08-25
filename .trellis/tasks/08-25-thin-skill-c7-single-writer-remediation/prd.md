# Authenticate Guarded Quest Source Authority and Re-prove Single Writer

## Goal

Authenticate guarded source-admin bytes and prove source mutation is refused after Trellis owns Quest writer authority, clearing C7's deterministic blocker for a new forward source identity without rewriting historical evidence.

## Background

C7 correctly stopped with `failed-zero-tolerance`: exact frozen C1 helper accepted `status --write` after supported Quest import recorded `writer: "trellis"`. Trellis import and writer projection were correct. Source commit `86df5a676c52950592ff9fe5966b9c1753160cb5` already adds the required fail-closed authority guard as the immediate child of C1 source commit `e2b0d70e3a797f19461eb106601de12250000b69`.

## Requirements

1. Create a new forward source-authority baseline; never modify C1 baseline or archived C7 evidence.
2. Baseline bytes must come from exact Git object `86df5a6`, never the dirty source working tree.
3. Authenticate commit parentage, exact one-path source diff, predecessor C1 manifest/helper identity, guarded helper identity, sibling runtime dependency, complete file inventory, modes, sizes, hashes, and aggregate baseline digest.
4. Verification must be self-contained after capture and must reject missing, extra, or changed baseline files or metadata.
5. Reuse the unchanged full Quest source-admin integration suite against the frozen guarded helper.
6. While Trellis owns writer authority, all mutating source commands must return nonzero, include `source write denied`, and preserve the source tree byte-identically:
   - `init --force --write`
   - `migrate --force --write`
   - `status --write`
   - `append-event --write`
7. Read-only `status` and `validate` must remain allowed and byte-identical. Explicit transfer back to source must restore authorized source writes.
8. Record a forward proof and decision distinguishing old failed identity from new guarded identity.
9. Provider/model invocations and managed workers must remain zero. Live A/B/C evaluation and migration expansion must not start.
10. Do not edit source repository, Trellis product code/tests, C6 packages, frozen C1 task, or archived C7 task.

## Acceptance Criteria

- [x] Guarded baseline derives from commit `86df5a6` and verifies without external source checkout.
- [x] Commit parent is exact C1 commit and changed-path inventory contains only source-admin helper.
- [x] Old helper SHA-256/size remain `7159bd9a8635110b671bdba8301eeca53f69f2d46c6110c80e7b28075c7d29f8` / `14944`.
- [x] Guarded helper SHA-256/size are `fe15beda6257cba9c5fcb0995f7fae5447d1caa942943ce7dc68205e6f491c3c` / `29342`.
- [x] Existing `research-quest-source-admin.integration.test.ts` passes unchanged against guarded baseline.
- [x] Four mutating commands refuse under Trellis ownership with byte-identical source tree.
- [x] Read-only behavior, fence refusal, malformed writer-projection refusal, missing import-projection refusal, ambiguity refusal, identity drift refusal, and explicit authority recovery pass.
- [x] `single-writer-proof.json` records blocker cleared only for guarded identity and reports zero provider/model/worker activity.
- [x] `decision.md` preserves archived C7 failure and keeps live evaluation/full migration/next migration unauthorized or not started.
- [x] Final diff excludes historical C1/C7, C6 package, source repository, and Trellis production/test changes.

## Out of Scope

- Provider/model evaluation or minimum-ten C7 live invocations.
- Managed worker execution.
- Full or next Skill migration.
- Product, schema, command, package, source-repository, release, publication, push, or code-spec changes.
- Reclassifying old C1 bytes or archived C7 result as passing.

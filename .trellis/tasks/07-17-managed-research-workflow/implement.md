# Implementation — Managed research workflow

## Pre-edit impact and baselines

- [x] Run GitNexus upstream impact for every existing symbol to edit: workflow resolver/listing, init workflow branch, workflow command ownership helper, update template collection, template hash exclusions, template index exports, CLI registration/help.
- [x] Warn before HIGH/CRITICAL edits; minimize or redesign risky edits.
- [x] Capture focused resolver/workflow/update/template-hash tests and known full-CLI baseline failures.

## Tests first — resolver and selection

- [x] Add offline native/research registry and listing tests.
- [x] Add explicit-source research collision and marketplace de-duplication tests.
- [x] Add strict selection tests for bundled, missing, malformed, wrong version/source, and unknown ID.
- [x] Add atomic save/clear and template-hash exclusion tests.

## Tests first — init and workflow switch

- [x] Add native/research/marketplace/custom init ownership matrix.
- [x] Add switch-to-research, switch-to-user-owned, switch-back-to-native tests.
- [x] Add modified-file, force, identical-content repair, and create-new ownership tests.
- [x] Assert metadata and workflow hash change only after successful active replacement.

## Tests first — update

- [x] Add legacy missing-selection native update test.
- [x] Add pristine and locally modified research update tests.
- [x] Add user-owned selection preservation with no marketplace fetch.
- [x] Add malformed/unknown metadata conservative omission tests.
- [x] Add repeated update no-op/idempotency tests.

## Implementation

- [x] Add bundled research workflow template and export.
- [x] Generalize bundled workflow registry/resolver/listing.
- [x] Add strict atomic workflow-selection utility.
- [x] Exclude selection metadata from template hashes.
- [x] Make init ownership source-aware and persist selection.
- [x] Make workflow switching source-aware while preserving conflict/create-new behavior.
- [x] Make update collect selected bundled workflow or omit user/invalid workflow.
- [x] Update CLI help/examples without changing native default.
- [x] Keep configurator, marketplace fetch, research hooks/skills, Task, and core state out of scope unless tests prove a minimal compatibility change is required.

## Verification

- [x] Run focused resolver/selection/workflow/update/template tests.
- [x] Run affected init/update/native regressions.
- [x] Run full CLI suite and compare known uninitialized marketplace-submodule failures.
- [x] Run CLI lint, typecheck, build, root typecheck.
- [x] Verify built CLI can init native and research offline and package contains research template.
- [x] Run explicit `trellis-check` and fix scoped findings. Main session only; implement-agent recursion guard applies.
- [x] Update `commands-workflow.md` and `commands-update.md` with seven-section executable contract depth.
- [x] Run `git diff --check`.
- [x] Refresh GitNexus index and run change detection against `main`.

## Rollback

- Keep native default and legacy missing-metadata behavior.
- Do not delete active workflow or user-owned content.
- Selection metadata may be removed independently after switching project to native or user-owned through current CLI.
- Marketplace/custom sources remain unpersisted and unfetched by update.

## Commit

- Do not commit unless user explicitly requests it.

# Implementation — Retired host cleanup inventory

## Prepare

- [x] Confirm archived C01/C02 evidence and C03 research artifacts are present.
- [x] Query current platform, manifest-prune, uninstall, update-backup, migration-cleanup, and structured-scrubber flows with GitNexus.
- [x] Run upstream impact analysis for every existing function/type changed; warn before HIGH/CRITICAL edits.
- [x] Record exact production/test/spec allowlist and affected flows before editing.

Impact note: no HIGH/CRITICAL symbols. `buildKnownKeys` reaches `pruneOrphanManifestKeys`, `update`, and `uninstall`; GitNexus reports LOW but the cross-command ownership boundary is treated as MEDIUM. `buildStructuredFileSpecs`, `isManagedPath`, and `isManagedRootDir` are LOW. Constant-import edges for `ALL_MANAGED_DIRS` are not indexed completely; source mapping shows update backup, migration cleanup, and uninstall empty-root cleanup consumers, so the root-union change is treated as MEDIUM. New inventory exports and the new ZCode scrubber have no pre-existing upstream callers.

Planned production allowlist:

- `packages/cli/src/legacy/retired-host-generated-paths.json` (new)
- `packages/cli/src/legacy/retired-host-cleanup.ts` (new)
- `packages/cli/src/configurators/index.ts`
- `packages/cli/src/utils/manifest-prune.ts`
- `packages/cli/src/utils/uninstall-scrubbers.ts`
- `packages/cli/src/commands/uninstall.ts`
- `packages/cli/src/commands/update.ts`

Planned test allowlist:

- new focused legacy-inventory test under `packages/cli/test/legacy/`
- focused compatibility, configurator-index, manifest-prune, scrubber, uninstall, update-internals, and update integration tests under `packages/cli/test/**`

Planned spec allowlist:

- `.trellis/spec/cli/backend/platform-integration.md`
- `.trellis/spec/cli/backend/migrations.md`
- `.trellis/spec/cli/backend/commands-uninstall.md`
- `.trellis/spec/cli/backend/uninstall-scrubbers.md`
- `.trellis/spec/cli/backend/commands-update.md`
- `.trellis/spec/cli/backend/filesystem-safety.md`

Forbidden scope:

- `packages/cli/src/types/ai-tools.ts` active registry/types
- retired host configurator/template deletion or behavior changes
- CLI host flags/init choices
- migration manifests/types
- core research implementation
- `docs-site`, `marketplace`, unrelated dirty files

## Tests first

- [x] Add inventory ID/cardinality/path-safety tests: 17 retired IDs, 1,009 unique exact paths, no current IDs, no wildcard/traversal/absolute/NUL entries.
- [x] Add extraction drift test comparing frozen host path groups with current retired collectors/configurator outputs.
- [x] Add registry-shrink simulation proving retired manifest keys remain known while unknown descendants are pruned without filesystem access.
- [x] Add Gemini/Codex shared-path and current-template-over-safe-delete tests.
- [x] Add Trae legacy settings scrub tests: mixed, malformed, unchanged, idempotent.
- [x] Add ZCode config scrub tests: pristine, mixed user events, malformed, unchanged, idempotent.
- [x] Add C01 representative cleanup tests independent of retired active detection.
- [x] Add legacy alias backup, migration ownership, unknown user-file, and confirmed-empty-root tests.
- [x] Preserve C02 dry-run, cancellation, modified/malformed, retry ownership, and confirmation-time revalidation coverage.

## Inventory implementation

- [x] Generate and review sorted schema-v1 JSON snapshot from current 17 retired host outputs.
- [x] Add typed data-only facade with retired IDs, exact paths, managed roots, aliases, structured descriptors, and legacy hook command paths.
- [x] Keep migration paths/hashes canonical in existing manifests; do not duplicate them.
- [x] Add runtime/test validation helpers only where needed; avoid abstractions beyond inventory consumers.

## Consumer integration

- [x] Split active `PLATFORM_MANAGED_DIRS` from cleanup-only legacy roots; make `ALL_MANAGED_DIRS` their union without changing detection/configuration.
- [x] Add exact retired paths to manifest-prune known-key construction.
- [x] Merge retired structured descriptors into uninstall exact-path dispatch.
- [x] Add `scrubZcodeConfigJson` with explicit schema validation and byte-preserving malformed behavior.
- [x] Add Trae legacy hook matching through exact legacy owned command paths.
- [x] Keep update template collection active-registry-only while backup and confirmed-empty cleanup use current + legacy roots.
- [x] Keep current Claude/Codex template collision guards authoritative.

## Specs and verification

- [x] Update all six listed code-specs with scope/signatures/contracts/matrix/cases/tests/wrong-vs-correct sections.
- [x] Run focused inventory/prune/scrubber/uninstall/update/compatibility tests.
- [x] Run full CLI tests, Python analysis, lint, CLI typecheck/build, workspace typecheck, and `git diff --check`.
- [x] Run GitNexus detect-changes and compare affected symbols/flows with the allowlist. Aggregate result: MEDIUM across 32 dirty-worktree files; reported flows are broader pre-existing update/session-context changes, with no unexplained C03 scope.
- [x] Preserve unrelated dirty paths and create no commit unless explicitly requested.

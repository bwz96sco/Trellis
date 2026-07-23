# Implementation — Protect research data lifecycle

## Prepare

- [x] Confirm C01 fixtures and archived task are available.
- [x] Query uninstall/update execution flows with current GitNexus index.
- [x] Run upstream impact analysis for every existing function/type changed; warn before HIGH/CRITICAL edits.
- [x] Record exact change allowlist before editing.

Impact note: `loadHashes` is HIGH and is excluded from edits. Add a separate status-bearing manifest reader instead. `update` and `updateHashes` are MEDIUM; all other planned existing-symbol changes are LOW or UNKNOWN.

Change allowlist:

- Production: `packages/cli/src/commands/uninstall.ts`, `packages/cli/src/commands/update.ts`, `packages/cli/src/utils/uninstall-scrubbers.ts`, `packages/cli/src/utils/manifest-prune.ts`, `packages/cli/src/utils/template-hash.ts`, plus one small shared protected-path utility if needed.
- Tests: focused uninstall, update, scrubber, manifest-prune, template-hash, dirty-guard, over-delete, and C01 fixture-preservation coverage under `packages/cli/test/**`.
- Specs: only the six paths in `implement.jsonl` / `check.jsonl`.
- Forbidden: core research implementation, host registry/configurators/templates, migration manifests/types, retired-host inventory, docs-site, marketplace, unrelated dirty files.

Resolved design decisions:

- Keep existing line-ending-normalized manifest hash contract; no raw-byte hash/schema migration.
- Persist final manifest ownership after actual operations; failed operations retain retry ownership.
- Missing/valid-empty research-only ownership is a no-op; malformed manifest fails closed.

## Tests first

- [x] Add uninstall integration using C01 research fixture; assert byte-identical preservation.
- [x] Add pristine/modified opaque ownership tests.
- [x] Add structured mixed and malformed preservation tests.
- [x] Add unknown-manifest-key and dry-run-zero-write tests.
- [x] Add migration source/destination and safe-file-delete research-protection tests.
- [x] Add repeat-run idempotency test.

## Ownership implementation

- [x] Add segment-safe protected research path predicate at shared destructive-operation boundary.
- [x] Replace recursive `.trellis` deletion with per-entry ownership plan.
- [x] Hash-gate opaque deletions.
- [x] Extend structured scrubber result/orchestration to report malformed/unchanged safely.
- [x] Persist ownership release atomically only after dry-run/confirmation gates.
- [x] Group plan/result output by deleted, scrubbed, protected, modified, malformed, missing, and unknown.
- [x] Prune only confirmed-empty directories; preserve `.trellis` when content remains.

## Update/migration integration

- [x] Protect research paths in safe-file-delete classification.
- [x] Reject/skip migrations with research path as source or destination.
- [x] Exclude research paths from managed backup traversal.
- [x] Keep current platform registry and templates unchanged.

## Specs and verification

- [x] Update uninstall, scrubber, update, migrations, filesystem-safety, and research-state code-specs with executable contracts and matrices.
- [x] Run focused uninstall/update/scrubber/manifest tests.
- [x] Run full CLI tests, Python analysis, lint, typecheck, build, workspace typecheck, and `git diff --check`.
- [x] Run GitNexus detect-changes; compare affected flows with planned scope.
- [x] Preserve all unrelated dirty paths and create no commit unless explicitly requested.

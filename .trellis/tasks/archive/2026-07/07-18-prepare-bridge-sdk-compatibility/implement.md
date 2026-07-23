# Implementation plan

## Step 0 — Preconditions and baseline

- Confirm archived C10 parent exists and `HEAD` stayed unchanged.
- Record core package export map, root barrel, Testing barrel, version, and existing CLI compatibility test.
- Record publish workflow order and packed-CLI preflight behavior.
- Run focused baseline core/CLI compatibility tests.
- Preserve docs-site/marketplace gitlinks and inherited dirty work.

## Step 1 — Failure-first core export contract

Add core-owned compatibility tests before changing package positioning:

- exact export key order and condition mappings;
- no wildcard exports;
- every implementation/declaration target exists after build;
- root Channel + Task composition and Research/Mem/Testing non-leakage;
- explicit subpath imports and representative values/types;
- Testing empty runtime namespace;
- undeclared deep import blocked.

Verify new tests characterize current behavior without core source/barrel edits.

Rollback point: new tests only.

## Step 2 — Failure-first CLI import boundary

Add production module-specifier scanner tests for source and clean `dist`.

- accept exact `/research` imports;
- reject bare root, Channel, Mem, Task, Testing, deep/source/dist imports, suffixes, query strings, and fragments;
- report file + specifier;
- exclude tests, fixtures, templates, docs, and package metadata.

After equivalent core coverage passes, narrow/delete duplicate generic API assertions from the CLI compatibility test.

Rollback point: test ownership only.

## Step 3 — Package positioning

- Update core package description and keywords.
- Add `packages/core/README.md` with exact status matrix and version-window policy.
- Keep version, exports, root barrel, generic source, and runtime behavior byte-unchanged.
- Ensure README is present in the real tarball.

## Step 4 — Pure packed-core audit helpers

Add `packages/core/scripts/packed-core-audit.js` and unit tests.

Test first:

- safe normalization and all adversarial path cases;
- exact export contract and order;
- required target derivation;
- missing target/README failures;
- forbidden source/test/config leakage;
- duplicate and noncanonical entry handling.

Do not import or refactor the packed-CLI audit.

## Step 5 — Real tarball verification

Add core package verification runner or exported orchestration used by release preflight.

- clean-build;
- `pnpm pack` to isolated local temp path;
- safe list/metadata audit before extraction;
- local packed-context runtime imports;
- NodeNext TypeScript declaration fixture;
- root non-leakage, Testing emptiness, and deep-import rejection;
- unconditional cleanup.

No network, publish, or new package dependency.

## Step 6 — Shared release preflight and CI

GitNexus gates already recorded:

- `verifyPackedCli`: LOW, 1 direct caller, 1 affected process;
- `main` in release preflight: LOW, file entrypoint only;
- current CLI compatibility-test interface: LOW, no dependants.

Before any other existing symbol edit, run its upstream impact.

- Add `verify-packed-core` help/dispatch to `release-preflight.js`.
- Preserve `verify-packed-cli` code path and semantics.
- Insert packed-core workflow step before packed CLI and before publish plan/core publish.
- Add focused release-preflight tests where needed.

## Step 7 — Code-spec update

Update executable seven-section contracts:

- `.trellis/spec/cli/backend/trellis-core-sdk.md`;
- `.trellis/spec/cli/backend/release-process.md`;
- relevant core/CLI unit-test specs and indexes.

Document entry-point classification, ownership split, tar validation/error matrix, packed runtime/type proof, CI ordering, no-runtime-warning policy, and C16 handoff.

## Step 8 — Focused verification

```bash
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/compatibility/package-exports.test.ts \
  test/scripts/packed-core-audit.test.ts
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/compatibility/core-import-boundary.test.ts
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
```

Also compare frozen package exports/root barrel/version before and after.

## Step 9 — Full verification

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm build
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
git diff --check
```

Record exact counts, warnings, package inventories, and any skipped platform test.

## Step 10 — Review and close

- Run `gitnexus detect-changes --scope all --repo Trellis`.
- Separate C11 changes from inherited C01-C10 breadth.
- Independent `trellis-check` reviews package resolution, tar safety, declaration resolution, import boundary, CI ordering, version lock, and Research/security non-regression.
- Fix only confirmed C11 blockers. New HIGH/CRITICAL symbol scope requires warning and approval.
- Check acceptance criteria from evidence.
- Archive with `--no-commit`; confirm unchanged `HEAD`, no commit, no push.

## Final evidence

- C10 parent was archived with `--no-commit` before C11 activation; baseline and final `HEAD` are `c67afe149375032b08e83009a11a49119c26b976`.
- Independent `trellis-check` reviewed package resolution, tar safety, declaration resolution, CLI import scanning, CI ordering, version lock, and Research/security non-regression. Seven proof defects were fixed: AST module-specifier scanning, tar entry-type validation, broader leakage detection, pre-extraction audit ordering, immutable packed-byte snapshotting, stronger packed-consumer proof, and exact root identity comparison. Final verdict: no unresolved C11 blocker.
- Focused core compatibility: 2 files, 23 tests passed. CLI import boundary: 1 file, 15 tests passed.
- Full core: 29 files, 436 passed, 1 skipped. Full CLI: 50 files, 727 passed.
- Core/CLI lint, core/CLI/workspace typecheck, core/workspace builds, release-script syntax, and `git diff --check` passed. Python lint reported 0 errors and 32 inherited warnings.
- Version alignment remains `@mindfoldhq/trellis-core@0.6.7 = @mindfoldhq/trellis@0.6.7`.
- Packed core passed with 279 canonical entries and 14 required metadata/runtime/declaration entries; runtime imports, strict NodeNext declarations, exact Channel-plus-Task root composition, empty Testing namespace, and blocked deep imports passed.
- Packed CLI passed with 363 entries, 180 required Research/compatibility entries, no forbidden generic entries, and exact core dependency `0.6.7`.
- Frozen package fields (`version`, `exports`, `files`, `sideEffects`, `publishConfig`) and root/Testing barrels are unchanged from `HEAD`. `docs-site` and `marketplace` gitlink SHAs are unchanged; their pre-existing worktrees remain dirty and untouched.
- No `.pack-core-verify-*` or `.pack-verify-*` directories remain.
- GitNexus reports 104 changed files, 545 symbols, 84 affected processes, and aggregate CRITICAL risk. This aggregate includes inherited C01-C10 migration breadth. C11 existing-symbol edits were pre-mapped LOW risk; no unexplained C11 production-flow expansion remains.
- Archived to `.trellis/tasks/archive/2026-07/07-18-prepare-bridge-sdk-compatibility` with `task.py archive --no-commit`. `HEAD` remained unchanged; no commit or push occurred.

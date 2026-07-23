# C10 parent implementation plan

## Success loop

```text
A: ownership survives collector removal
  -> B: generation no longer needs generic assets
  -> C: active source/payload removed
  -> parent integration gate
```

Parent is not a delete-first implementation target.

## Step 1 — Complete child A

Task: `.trellis/tasks/07-20-freeze-current-host-generic-cleanup`

- inventory exact current-host generic generated files while collectors still exist;
- capture released hashes and mixed config descriptors;
- add cleanup migration/inventory recognition;
- prove pristine delete, modified/unknown preserve, mixed scrub, idempotency, and Research protection;
- run GitNexus impact before existing symbol edits;
- independent check and archive `--no-commit`.

Gate: removing active collectors later cannot orphan manifest ownership.

## Step 2 — Complete child B

Task: `.trellis/tasks/07-20-make-generated-installation-research-only`

- narrow init/update/re-init/configurator paths;
- rewrite mixed hooks/workflow/config/instructions/statusline;
- remove generic script/Task/spec/workspace/developer/registry production;
- retain only bounded workers and nine Research stage skills;
- prove exact fresh/update payload and byte parity;
- preserve old workflow metadata and Research state;
- independent check and archive `--no-commit`.

Gate: no active runtime or update path consumes generic sources targeted by C.

## Step 3 — Complete child C

Task: `.trellis/tasks/07-20-remove-active-generic-cli-payload`

- freeze negative command/help tests;
- unregister Channel/Mem/Workflow/Research Task;
- remove command-only source and caller-free helpers;
- delete generic template sources covered by child A;
- remove/reclassify command-only tests and current code-specs;
- audit clean build and packed package;
- prove core generic exports remain compatible;
- independent check and archive `--no-commit`.

Gate: final active CLI and package contain Research-only product surface.

## Step 4 — Parent integration verification

Run focused cross-child matrix:

- CLI help and negative commands;
- fresh Claude/Codex Research init;
- update cleanup/preservation/idempotency;
- uninstall Research protection;
- schema-v1, Dispatch compatibility, C07/C09 parity;
- workflow selection/classification compatibility;
- core package export compatibility;
- clean package payload audit.

Then run:

```bash
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm build
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-cli
git diff --check
```

Record failures accurately. Full concurrent test timeouts need bounded project-consistent fixes, not ignored reruns.

## Step 5 — Impact and scope review

- Run GitNexus change detection.
- Separate inherited C01-C09 worktree breadth from C10 child symbol impacts.
- No unexpected core export, Research authority, docs-site, or marketplace flow may appear.
- Independent parent-level review must inspect combined diff.

## Step 6 — Close parent

- Check parent acceptance only from evidence.
- Archive parent with `--no-commit`.
- Mark C11 ready only after archive.
- Do not commit unless user explicitly asks.

## Parent closeout evidence

- All three ordered children exist under `.trellis/tasks/archive/2026-07/` and were closed without a commit.
- Focused cross-child CLI matrix: 20 files, 423 tests passed.
- Full CLI: 50 files, 714 tests passed.
- Full core: 27 files, 413 tests passed and 1 platform-dependent test skipped.
- CLI/core TypeScript lint, package typechecks, workspace typecheck, clean workspace build, version alignment, packed-CLI audit, and `git diff --check` passed.
- Python lint: 0 errors and 32 inherited unused-import warnings.
- Packed CLI: 363 normalized entries, all 180 required Research/compatibility entries present, no forbidden generic entries, exact core dependency `0.6.7`.
- GitNexus aggregate dirty-tree analysis: 102 indexed files, 625 symbols, 39 affected flows, CRITICAL aggregate risk; this includes inherited C01-C09 scope and does not identify an unexplained C10 blocker.
- `docs-site` and `marketplace` parent gitlink SHAs are unchanged; their dirty internal working trees are inherited and excluded.
- Independent parent `trellis-check`: no unresolved blocker.

## Child planning requirement

Each child is complex. Before activation it needs:

- `prd.md` requirements/acceptance;
- `design.md` boundaries/contracts/rollback;
- `implement.md` ordered execution/verification;
- curated spec/research manifests;
- symbol-level GitNexus impact report;
- validated task context.

# Implementation plan

## Step 0 — Validate planning artifacts and baseline

- Validate `prd.md`, `design.md`, `implement.md`, and both context manifests.
- Snapshot inherited worktree status; exclude `docs-site` and `marketplace` content.
- Confirm Child A and Child B are archived and their acceptance evidence remains intact.
- Run focused baseline tests for parser, init/update, workflow migration, cleanup, Research Dispatch, and core exports.

Rollback point: planning artifacts only; Child C remains inactive.

## Step 1 — GitNexus impact gate

Run upstream impact for every existing symbol before editing/deleting it. Include:

- CLI parser builder/registration functions;
- `registerResearchCommand`;
- `linkResearchTask` / `unlinkResearchTask`;
- Channel/Mem/Workflow command exports;
- `init` and generic init helpers;
- `createWorkflowStructure` and spec-generation helpers;
- Research payload collectors/writers;
- broad Claude/Codex/common/Trellis template getters;
- workflow resolver and classifier symbols;
- manifest-prune known-key/prune symbols;
- candidate caller-free utilities;
- release preflight pack verification.

Record direct callers, affected flows, risk, and deletion order. HIGH/CRITICAL edited-symbol risk -> warn and stop before production edits.

After all gates pass:

1. validate task context again;
2. activate Child C;
3. keep Task #21 in progress.

## Step 2 — Failure-first CLI characterization

Add `test/cli/research-only-surface.integration.test.ts` or equivalent using existing parser/bin harnesses.

Assert:

- root command names equal exact five-command set;
- Research command names equal exact eleven-group set;
- Dispatch command names equal exact five-child set;
- `channel`, `mem`, `workflow`, `research task`, `research task link`, and `research task unlink` fail as unknown;
- removed init flags fail with `commander.unknownOption`;
- retained init flags parse;
- no command action/write occurs on parse failure;
- temporary fixture tree remains byte-identical;
- built `trellis` and `tl` aliases return identical parser behavior.

Keep existing workflow classifier, cleanup, Research security, and core export tests green before production removal.

## Step 3 — Unregister generic commands and Task links

Before each symbol edit, re-check impact if prior result is stale or ambiguous.

- Remove Channel/Mem/Workflow imports and registration from root parser.
- Remove seven generic init options.
- Change root description to Research wording.
- Remove Research Task imports/types/renderer branch/Commander subtree.
- Preserve Dispatch registration/options byte-for-byte where possible.

Run parser suite. Confirm unknown input fails before writes.

Rollback point: registrations only; source still present.

## Step 4 — Collapse init to direct Research behavior

- Remove `RESEARCH_ONLY_GENERATION` and inverse dead branches.
- Narrow `InitOptions` to retained public/programmatic options.
- Delete developer, project detector, monorepo, registry/spec, remote template, generic Task, and joiner branches/helpers when caller-free.
- Keep fresh/re-init host selection, force/skip conflict semantics, statusline ownership, Research workflow selection, actual-write tracking, hashes, and version state.
- Keep canonical Research state lazy and protected.

Run fresh Claude, Codex, dual-host, add-host, force, skip-existing, statusline, and zero-write parser tests.

## Step 5 — Collapse workflow structure

- Remove legacy layout option and default.
- Remove scripts/agents/tasks/workspace/spec imports and helpers.
- Keep only Research workflow/config/gitignore writes through existing safe writer/normalizer.
- Narrow callers and tests to new signature.

Run init/update base-layout and no-generic-path tests.

## Step 6 — Replace active native workflow bytes with digest evidence

- Compute exact digest(s) from known released native workflow source/fixtures.
- Add immutable legacy evidence module with release/path provenance.
- Add pure exact-digest predicate tests.
- Remove `nativeBytes` dependency from update evidence/classifier API.
- Preserve all existing classifier outcomes and version-bound inference.
- Narrow resolver to historical ID parsing plus Research template resolution.
- Remove marketplace listing/fetch/custom workflow source code.
- Delete native workflow template only after parity suite passes.

Run:

- workflow selection parser tests;
- resolver tests;
- update classifier tests;
- workflow migration integration tests;
- modified/custom/unsafe/malformed preservation tests.

Rollback point: keep native source until digest parity is proven.

## Step 7 — Replace broad template discovery

- Add exact Research skill bundle getter.
- Add exact Claude and Codex Research worker getters.
- Route `collectResearchPlatformPayload()` through exact getters.
- Remove generic Codex pull-based Task prelude if output parity proves it is a no-op.
- Narrow common/Claude/Codex/Trellis/markdown template indexes to retained assets.
- Hard-fail when a required Research asset is missing.

Run exact path and byte parity suites before deleting generic template roots.

## Step 8 — Decouple manifest pruning

- Remove generic `getAllScripts()` / `getAllAgents()` imports and loops.
- Seed current known keys from exact Research base/platform outputs.
- Retain frozen current-host cleanup paths, retired-host descriptors, migrations, protected Research paths, marker-owned `AGENTS.md`, and read-only registry-spec compatibility.
- Keep exact-key and rename-dir behavior unchanged.

Run cleanup inventory, manifest prune, update, uninstall, dirty guard, over-delete, and legacy installation tests.

Verify:

- 137 unique frozen keys remain;
- unknown descendants prune from manifest but survive disk;
- current Research ownership overrides historical cleanup metadata;
- safe delete still requires exact released hash;
- `.trellis/research/**` survives.

## Step 9 — Delete generic source and templates

Delete command implementations and command-only tests:

- Channel tree;
- Mem command;
- Workflow command;
- Research Task-link command.

Delete generic template payload after explicit collector parity:

- common commands/skills and non-Research bundles;
- generic Claude/Codex agents;
- Codex generic skills and inactive session hook;
- Trellis agents/scripts/tasks/native workflow;
- markdown workspace/worktree/spec packs.

For each candidate utility, use GitNexus plus direct source search. Delete only when no retained caller remains. Otherwise narrow to read-only compatibility:

- agent refs;
- Task JSON;
- project detector;
- template fetcher/extractor;
- registry config writer.

Run typecheck after each deletion cluster to catch hidden imports.

## Step 10 — Update executable code-specs

- Remove active Channel/Mem/Workflow command specs.
- Update backend index and pre-development map.
- Update Research command, directory structure, platform/configurator, update/uninstall/migration, filesystem safety, workflow state, worker hooks, core SDK, release process, and unit/integration test specs where contracts changed.
- Use all seven required sections for parser/package/cross-layer contracts.
- Keep historical data/cleanup behavior documented as compatibility, not active product surface.
- Do not change core compatibility exports.

## Step 11 — Add real packed-payload audit

Extend release preflight pack verification:

- list normalized tarball entries;
- assert required Research and compatibility entries;
- reject exact generic files and forbidden prefixes;
- retain exact `@mindfoldhq/trellis-core` version check;
- make failures name missing/forbidden entry.

Start from clean CLI build. Do not use dirty/stale `dist` as proof.

## Step 12 — Focused verification

Run focused suites covering:

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/cli/research-only-surface.integration.test.ts \
  test/commands/init-research-only.integration.test.ts \
  test/commands/init.integration.test.ts \
  test/commands/update-internals.test.ts \
  test/commands/update.integration.test.ts \
  test/commands/update-workflow-classifier.test.ts \
  test/commands/update-workflow-migration.integration.test.ts \
  test/commands/uninstall.integration.test.ts \
  test/commands/uninstall-dirty-guard.integration.test.ts \
  test/commands/init-uninstall-overdelete.integration.test.ts \
  test/commands/research.test.ts \
  test/commands/research-dispatch.integration.test.ts \
  test/commands/research-dispatch-context.integration.test.ts \
  test/commands/research-dispatch-compatibility.test.ts \
  test/configurators/index.test.ts \
  test/configurators/platforms.test.ts \
  test/templates/research-hooks.test.ts \
  test/legacy/current-host-generic-cleanup.test.ts \
  test/legacy/retired-host-cleanup.test.ts \
  test/utils/manifest-prune.test.ts \
  test/utils/workflow-selection.test.ts \
  test/compatibility/legacy-installation-compatibility.test.ts \
  test/compatibility/core-package-exports.test.ts
```

Adjust exact file list only when obsolete suites are intentionally deleted.

## Step 13 — Full verification and independent check

Run:

```bash
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm --filter @mindfoldhq/trellis build
pnpm --filter @mindfoldhq/trellis release:preflight -- verify-packed-cli
git diff --check
```

Also verify:

- clean `dist` negative inventory;
- tarball positive/negative inventory;
- both bin aliases;
- canonical Research state diff is empty;
- no Child C changes inside `docs-site` or `marketplace`;
- frozen cleanup JSON/migration evidence unchanged;
- core public export list unchanged.

Dispatch independent `trellis-check`. Fix confirmed blockers only. Rerun affected focused tests, then full gates.

## Step 14 — Close

- Mark acceptance criteria only from recorded evidence.
- Run GitNexus changed-scope detection before any possible commit boundary.
- Separate inherited dirty-tree scope from Child C-specific symbols/flows.
- Archive Child C with `--no-commit`.
- Keep parent Task #21 in progress for later C10 integration work.
- Do not commit or push.

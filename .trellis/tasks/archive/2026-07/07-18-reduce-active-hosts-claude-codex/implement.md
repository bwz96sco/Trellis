# Implementation — Reduce active hosts to Claude Code and Codex

## Prepare

- [x] Confirm C03 is archived and its inventory, migration, scrubber, frozen-fixture, collision, and Research-protection tests are green before C04 edits.
- [x] Keep HIGH-risk warning for `getConfiguredPlatforms` visible: direct consumers span init/re-init, update, uninstall, manifest pruning, and Codex upgrade checks.
- [x] Before each existing function/class/method edit, run GitNexus upstream impact and record any new HIGH/CRITICAL result before proceeding.
- [x] Preserve unrelated dirty files; do not touch `docs-site` or `marketplace`.

Expected production scope:

- `packages/cli/src/types/ai-tools.ts`
- `packages/cli/src/configurators/index.ts`
- retired `packages/cli/src/configurators/<host>.ts` deletions
- `packages/cli/src/cli/index.ts`
- `packages/cli/src/commands/init.ts`
- `packages/cli/src/commands/update.ts`, limited to retired active host behavior
- `packages/cli/src/templates/extract.ts`
- retired-only template helper deletion if no retained callers remain
- retired `packages/cli/src/templates/<host>/` deletions
- `packages/cli/src/templates/shared-hooks/**`, limited to host-table narrowing and Cursor-only asset deletion
- `packages/cli/src/templates/trellis/scripts/common/{cli_adapter.py,task_store.py,active_task.py,git_context.py,workflow_phase.py}`
- retained `packages/cli/src/templates/common/bundled-skills/trellis-meta/**` active-host maps/claims
- `packages/cli/package.json` only if host-specific package metadata is in scope

Forbidden production scope:

- `packages/cli/src/legacy/retired-host-cleanup.ts`
- `packages/cli/src/legacy/retired-host-generated-paths.json`
- migration manifests/history and frozen 0.6.7 fixture bytes
- retired scrubber behavior
- C05 workflow/default-layout changes
- C10 Channel/Mem/workflow/Task-link/generic-template removal
- core public export removal
- unrelated refactors or docs/submodule work

## Tests first

- [x] Pin exact two-host `AITool`, `CliFlag`, registry, configurator, and active-root assertions.
- [x] Pin detection: `.claude` and `.codex` positive; `.agents/skills` alone and retired roots negative.
- [x] Pin init help, Claude-only `-y`, explicit Codex-only, explicit dual-host, and removed-flag-before-write behavior.
- [x] Convert C03 live-collector drift test to static snapshot schema/order/per-host-count/cardinality/path/root assertions before collector deletion.
- [x] Pin current Codex ownership over Gemini overlap and historical safe-delete entries.
- [x] Keep frozen 0.6.7 uninstall and C02 modified/malformed/unknown/Research-protection tests unchanged or stronger.
- [x] Pin generated Python rejection/detection and two-host shared-hook distribution.

## Shrink active TypeScript surface

- [x] Reduce `AITool`, `CliFlag`, `TemplateDir`, and `AI_TOOLS` to Claude Code and Codex.
- [x] Reduce configurator imports, `PLATFORM_FUNCTIONS`, `PLATFORM_IDS`, choices, detection, and current template collection to retained hosts.
- [x] Remove Windsurf/retired detection while keeping active/legacy managed-root union.
- [x] Remove retired Commander flags, aliases, init option fields, normalization branches, interactive choices, and host wording.
- [x] Preserve Claude-only non-interactive default and explicit-host override behavior.
- [x] Remove active Copilot update generation/merge while preserving migration, backup, prune, and safe-delete compatibility.

## Remove retired active implementations

- [x] Delete all 17 retired configurator modules after imports/tests no longer depend on them.
- [x] Delete all 14 retired physical template roots and retired-only helper modules.
- [x] Remove direct active retired-host template tests; retain every compatibility/cleanup test that names retired hosts.
- [x] Remove Cursor-only shell session context hook.
- [x] Update retained Trellis meta docs/maps only where they claim current host support.

## Shrink generated runtime

- [x] Reduce generated Python accepted platform values, auto-detection, adapters, task seeding, and messages to Claude/Codex.
- [x] Reduce shared-hook destinations and host branches to Claude/Codex.
- [x] Preserve Claude Research hook semantics and existing Codex dispatch behavior.
- [x] Parse every changed Python template with `compile()` without writing `__pycache__`.

## Specs and review

- [x] Update `platform-integration.md` with exact retained IDs/flags/roots/detection and active-versus-legacy contract.
- [x] Update `commands-update.md`, `commands-uninstall.md`, `migrations.md`, and `filesystem-safety.md` only where C04 changes executable host-boundary contracts; retain seven-section code-spec depth.
- [x] Run independent `trellis-check`; fixed only verified C04 defects and completed focused, full, built-CLI, package, Python-twin, and GitNexus verification.
- [x] Confirm diff contains no C05/C10/later scope and no C03 inventory byte changes.

## Verification

Focused suites:

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/types/ai-tools.test.ts \
  test/registry-invariants.test.ts \
  test/configurators/index.test.ts \
  test/configurators/platforms.test.ts \
  test/commands/init.integration.test.ts \
  test/templates/claude.test.ts \
  test/templates/codex.test.ts \
  test/templates/shared-hooks.test.ts \
  test/legacy/retired-host-cleanup.test.ts \
  test/utils/manifest-prune.test.ts \
  test/commands/update-internals.test.ts \
  test/commands/uninstall.integration.test.ts \
  test/compatibility/legacy-installation-compatibility.test.ts
```

Full gates:

```bash
pnpm --filter @mindfoldhq/trellis typecheck
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis build
git diff --check
```

Built CLI behavior:

```bash
node packages/cli/dist/cli/index.js init --help
node packages/cli/dist/cli/index.js init --cursor
```

Package audit:

```bash
find packages/cli/dist/templates -mindepth 1 -maxdepth 1 -type d -print | sort
find packages/cli/dist/configurators -maxdepth 1 -type f -print | sort
pnpm --dir packages/cli pack --dry-run
```

- [x] Help lists only retained host flags; removed flag fails before writes.
- [x] Dist and pack output contain no retired active configurators/template roots.
- [x] Run GitNexus detect-changes and explain all affected symbols/flows. Repository-wide dirty-worktree result: CRITICAL, 79 indexed files / 276 symbols / 72 flows; includes pre-existing C01-C03 and unrelated AGENTS/CLAUDE changes, so it is broader than C04's isolated host-boundary scope.
- [x] Create no commit unless explicitly requested.

## Rollback point

Revert C04 source/test/spec changes as one coherent unit. Keep C01-C03 compatibility assets intact. Never recover a missing retained path by restoring retired registry entries or broad retired template trees.

# Research: C04 implementation plan, scope, and acceptance

- **Query**: Define minimal surgical C04 scope, requirements, implementation order, test plan, rollback, allowlist, and forbidden scope.
- **Scope**: mixed internal planning
- **Date**: 2026-07-20

## Goal

Current install/update/runtime host support becomes exactly:

- Claude Code
- Codex

C03 cleanup-only compatibility remains available for 17 retired hosts through 0.7.

## Requirements

### R1 — Active registry exactness

- `AITool`, `CliFlag`, `TemplateDir`, `AI_TOOLS`, `PLATFORM_FUNCTIONS`, derived IDs/choices/detection contain only retained hosts.
- Retired IDs remain only in explicit compatibility surfaces: C03 inventory, migrations, frozen fixtures/tests, and still-supported non-init products such as Mem until C10.

### R2 — CLI exactness

- Init help exposes only `--claude`, `--codex` host flags.
- Removed host flags, including `--windsurf`, are unknown options.
- Interactive/re-init choices show only retained hosts.
- Banner/global host wording names Claude Code + Codex.
- `-y` defaults Claude-only; explicit flags override defaults.

### R3 — Active roots and detection

- Active roots exact: `.claude`, `.codex`, `.agents/skills`.
- Detection exact: `.claude` and `.codex`; shared `.agents/skills` alone is not detection.
- Retired roots do not trigger active collection/configuration.
- `ALL_MANAGED_DIRS` still unions active roots with C03 cleanup roots.

### R4 — Retired installers/templates removed

- Delete 17 retired configurators.
- Delete 14 retired physical template roots.
- Remove direct Copilot update support.
- Remove retired-only template helpers.
- Package payload contains no retired host installer/template tree.

### R5 — Generated runtime exactness

- Generated Python platform validation/detection/session tables support Claude/Codex only.
- Shared hook distribution table supports Claude/Codex only.
- Delete Cursor-only shell hook.
- Keep Claude Research hook behavior and Codex dispatch modes unchanged.

### R6 — Cleanup compatibility

- Preserve C03 inventory bytes and semantics.
- Preserve migration manifests/history.
- Preserve retired structured scrubbers.
- Preserve exact-path ownership; root membership never proves ownership.
- Preserve current-template precedence.

### R7 — Shared paths

- Codex remains active owner of `.agents/skills`.
- Gemini historical overlap remains cleanup metadata only.
- `AGENTS.md` stays marker-owned and user-content preserving.

### R8 — Test transition

- Remove active retired-host tests.
- Keep migration/legacy/uninstall compatibility tests even when they name retired hosts.
- Convert C03 collector drift test to static snapshot/cardinality/root integrity.
- Frozen 0.6.7 uninstall passes after registry shrink.

### R9 — Boundary discipline

- No Research-only workflow default/layout change (C05).
- No Channel, Mem, workflow switching, Task-link, generic core/product removal (C10 or later major child).
- No migration rewrite to erase historical host names.

## Acceptance matrix

| Area | Acceptance | Evidence |
|---|---|---|
| Types | `AITool` exactly 2 IDs; `CliFlag` exactly 2 flags. | type tests + typecheck |
| Registry | `Object.keys(AI_TOOLS)` and `PLATFORM_IDS` equal `claude-code,codex`. | registry tests |
| Behavior | `PLATFORM_FUNCTIONS` compile-time complete for two IDs; retained configure/collect parity passes. | configurator tests |
| CLI help | Only `--claude`, `--codex` host flags. | built CLI help test/manual command |
| Removed flag | `trellis init --cursor` exits unknown-option. | CLI integration/e2e |
| Defaults | `init -y` writes Claude only. | init integration |
| Explicit Codex | `init -y --codex` writes `.codex` + `.agents/skills`, not `.claude`. | init integration |
| Both | explicit Claude + Codex writes both. | init integration |
| Detection | `.claude`/`.codex` detected; retired roots and `.agents/skills` alone ignored. | platform tests |
| Active roots | exact `.claude,.codex,.agents/skills`. | registry test |
| Cleanup roots | all C03 retired/alias roots still in `ALL_MANAGED_DIRS`. | registry/legacy test |
| Update | retired collectors absent; common + current host templates still update. | update tests |
| Copilot | update no longer creates/merges Copilot instructions. | negative update test or source removal |
| Python | adapter rejects retired platform names; auto-detection only retained hosts. | regression/generated-script test |
| Shared hooks | two platform table; Cursor bridge absent; Claude/Codex hooks parse/run. | shared-hook tests |
| Package | no retired template roots/modules in `dist` or pack list. | build + pack inspection |
| C03 snapshot | 17 ordered IDs, frozen counts, 1,009 unique exact paths, frozen roots. | legacy inventory test |
| Shared collision | current Codex path survives prune/safe-delete. | manifest/update tests |
| Uninstall | frozen 0.6.7 fixture cleans safely and preserves user files. | uninstall integration |
| Research | protected research paths unchanged. | existing update/uninstall tests |
| Full gate | typecheck, lint, full CLI tests, build pass. | commands below |

## Minimal implementation order

1. **Pin tests first**
   - Add exact two-host registry/CLI/default/detection assertions.
   - Convert C03 drift test before deleting collectors.
   - Keep compatibility tests green.

2. **Shrink TypeScript data types/registry**
   - `ai-tools.ts` first.
   - Compiler exposes exhaustive consumers.

3. **Shrink behavior registry**
   - `configurators/index.ts` imports/`PLATFORM_FUNCTIONS`.
   - Remove Windsurf detection.
   - Keep active/legacy managed-root union.

4. **Shrink CLI/init surface**
   - Commander flags/help/alias.
   - `InitOptions`, alias normalization, banner/comments.
   - Pin Claude-only `-y`.

5. **Remove retired active update special cases**
   - Copilot managed instructions generation/merge.
   - Keep migration/backup/cleanup code.

6. **Remove retired configurators/template modules/assets**
   - Delete configurator files.
   - Delete retired template roots.
   - Remove retired-only extraction/template utility helpers.
   - Update retained `trellis-meta` host docs.

7. **Shrink generated Python/shared hooks**
   - `cli_adapter.py`, `task_store.py`, `active_task.py`.
   - shared hook table/scripts.
   - stale generated help examples.

8. **Narrow active tests; preserve compatibility tests**
   - Delete dedicated retired template/Kiro runtime suites.
   - Remove retired blocks from mixed/regression suites.
   - Never remove migration/frozen-fixture assertions solely due retired names.

9. **Build/package audit**
   - Clean build.
   - Inspect `dist` and pack list.
   - Search for unclassified retired active surfaces.

10. **Run full gates and GitNexus change detection**

## Production edit allowlist

Expected files/directories:

- `packages/cli/src/types/ai-tools.ts`
- `packages/cli/src/configurators/index.ts`
- 17 retired `packages/cli/src/configurators/<host>.ts` deletions
- `packages/cli/src/cli/index.ts`
- `packages/cli/src/commands/init.ts`
- `packages/cli/src/commands/update.ts` — only retired Copilot active support + direct host wording
- `packages/cli/src/templates/extract.ts`
- `packages/cli/src/templates/template-utils.ts` deletion
- 14 retired `packages/cli/src/templates/<host>/` deletions
- `packages/cli/src/templates/shared-hooks/index.ts`
- `packages/cli/src/templates/shared-hooks/inject-shell-session-context.py` deletion
- retained shared hook Python files, only for retired branch removal
- `packages/cli/src/templates/trellis/scripts/common/{cli_adapter.py,task_store.py,active_task.py,git_context.py,workflow_phase.py}`
- retained `templates/common/bundled-skills/trellis-meta/**` files containing active host maps/claims
- `packages/cli/package.json` keywords only if published metadata is accepted C04 scope

## Test edit allowlist

- registry/type/configurator/init/shared-hook/extract/regression suites mapped in `compatibility-collisions-and-tests.md`
- retired dedicated template suite deletions
- Kiro hook integration deletion
- C03 legacy inventory transition
- compatibility/update/uninstall tests only to add or reframe assertions; never weaken safety

## Forbidden scope

### C03 compatibility assets

- `packages/cli/src/legacy/retired-host-cleanup.ts`
- `packages/cli/src/legacy/retired-host-generated-paths.json`
- migration manifests and migration engine, except test-only evidence if required
- frozen 0.6.7 fixture bytes
- retired scrubber behavior

### C05 scope

- default workflow change from native to Research
- removal of workflow picker/source behavior
- fresh Research-only task/layout migration
- pristine native workflow migration

### C10/later scope

- Channel command/runtime/templates
- Mem command/adapters/session-insight skill
- generic workflow switching command
- Task links/core generic exports
- generic common template deletion
- package/core major API removals

### Other forbidden edits

- docs-site submodule/repository
- unrelated refactors in `configurators/shared.ts`
- migration changelog text/history rewrite
- broad README/docs sweep unless coordinator explicitly adds it
- auto-delete of user files under retired roots based only on root membership

## Verification plan

### Targeted tests

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

### Static/full gates

```bash
pnpm --filter @mindfoldhq/trellis typecheck
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis build
```

### Built CLI behavior

```bash
node packages/cli/dist/cli/index.js init --help
node packages/cli/dist/cli/index.js init --cursor
```

Expected: help contains retained flags only; removed flag fails before filesystem writes.

### Package audit

```bash
find packages/cli/dist/templates -mindepth 1 -maxdepth 1 -type d -print | sort
find packages/cli/dist/configurators -maxdepth 1 -type f -print | sort
pnpm --dir packages/cli pack --dry-run
```

### Python parse gate

Use `compile()` command from `templates-python-and-packaging.md` to avoid `__pycache__` artifacts.

### Compatibility gate

- Run frozen 0.6.7 uninstall test.
- Run manifest-prune shared/retired tests.
- Run update safe-delete precedence test.
- Run protected Research path tests.

### GitNexus gate

Before each symbol edit, run upstream impact. Before commit, run `npx gitnexus detect-changes` (or project MCP equivalent) and verify only expected flows changed.

## Rollback

- Implement as one coherent C04 commit or tightly ordered commits that never publish half-shrunken registry/package state.
- Rollback = revert C04 changes wholesale.
- Do **not** revert C03 cleanup inventory, migrations, or frozen fixture.
- If package audit finds missing retained assets, restore only Claude/Codex asset/import path; do not restore retired registry entries as quick fix.
- No destructive data migration occurs in C04; rollback has no data repair step.

## Critical caveats

1. `getConfiguredPlatforms` is HIGH-risk per GitNexus. It feeds init, update, uninstall, manifest pruning, and Codex upgrade logic. Require explicit warning/review before edit.
2. Removing registry entries without deleting raw template roots still ships retired support in npm package.
3. Deleting retired collectors before converting C03 extraction test breaks test compile.
4. Deleting retired roots from `ALL_MANAGED_DIRS` weakens backup/empty-root cleanup.
5. Removing Copilot template directory without removing direct `update.ts` imports breaks build.
6. Shrinking TypeScript only leaves broad generated Python runtime support.
7. Treating `.agents/skills` as retired Gemini root can delete current Codex assets.

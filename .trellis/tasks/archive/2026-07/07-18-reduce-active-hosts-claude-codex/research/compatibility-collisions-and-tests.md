# Research: Compatibility, collisions, and test transition

- **Query**: Preserve C03 cleanup inventory, migration/uninstall safety, shared paths, and frozen 0.6.7 compatibility after active registry shrink.
- **Scope**: internal
- **Date**: 2026-07-20

## Findings

### Cleanup-only contract that must survive unchanged

`packages/cli/src/legacy/retired-host-cleanup.ts` is not active host support. Keep:

- `RetiredHostId` union (`:6-23`).
- ordered `RETIRED_HOST_IDS` (`:43-61`).
- runtime snapshot validation (`:68-153`).
- `RETIRED_GENERATED_PATHS` (`:157-159`).
- `RETIRED_MANAGED_ROOTS` (`:161-198`).
- `LEGACY_ALIAS_ROOTS` (`:200-205`).
- `LEGACY_CLEANUP_MANAGED_ROOTS` (`:207-210`).
- `RETIRED_STRUCTURED_FILES` (`:215-233`).
- `LEGACY_TRELLIS_HOOK_COMMAND_PATHS` (`:235-239`).
- `retired-host-generated-paths.json` frozen at schema `1`, source version `0.6.7`.

Do not derive any of these from the shrunken active registry.

Frozen per-host cardinalities:

| Host | Paths |
|---|---:|
| cursor | 61 |
| opencode | 64 |
| kilo | 55 |
| kiro | 62 |
| gemini | 60 |
| antigravity | 55 |
| devin | 55 |
| qoder | 60 |
| codebuddy | 61 |
| copilot | 62 |
| droid | 61 |
| pi | 60 |
| reasonix | 56 |
| zcode | 61 |
| trae | 60 |
| omp | 58 |
| grok | 58 |
| **Total/union** | **1,009** |

### Manifest pruning remains active/legacy split

`packages/cli/src/utils/manifest-prune.ts:72-109` builds known keys from:

1. generic current Trellis scripts/agents/config/workflow;
2. currently configured active host collectors;
3. exact `RETIRED_GENERATED_PATHS`;
4. retired structured descriptors;
5. all migration `from`/`to` paths.

C04 must preserve this union. Registry shrink then has correct behavior:

- Exact retired manifest key stays available for cleanup.
- Unknown user descendant under retired root is pruned as unknown ownership.
- Migration paths remain reachable.
- Current Codex `.agents/skills` output stays current.

Pinned tests:

- `test/utils/manifest-prune.test.ts:148-175` — exact retired key kept, unknown retired-root descendant pruned.
- `:177-196` — rename-dir migration descendants kept.
- `:198-210` — Gemini/Codex shared skill kept when only Codex is current.
- `:213+` — marker-owned `AGENTS.md` handling.

### Uninstall remains independent from active support

`packages/cli/src/commands/uninstall.ts` uses:

- current descriptors for Claude/Codex/`AGENTS.md` (`:124-149`);
- retired descriptors loaded first, then current descriptors override shared/reintroduced paths (`:150-159`);
- manifest keys plus retired hook paths to scrub mixed configs (`:189-203`);
- `ALL_MANAGED_DIRS` for confirmed-empty root cleanup (`:349`);
- `getConfiguredPlatforms` only to tell manifest pruning which current collectors apply (`:542-549`).

Registry shrink must not remove retired scrubbers/imports. Current descriptors remain authoritative if path collisions occur.

Critical tests to keep:

- `test/commands/uninstall.integration.test.ts:645+` — missing retired path handling.
- `:660+` — mixed legacy `.trae/settings.json` fallback scrub.
- `:693+` — frozen 0.6.7 multi-host uninstall.
- `test/commands/uninstall-dirty-guard.integration.test.ts`.
- `test/commands/init-uninstall-overdelete.integration.test.ts` — `.codex/sessions` and user-data protection.
- `test/utils/uninstall-scrubbers.test.ts`.

### Frozen 0.6.7 fixture

`test/fixtures/legacy-0.6.7-multi-host/fixture.json` pins:

- 19 historical hosts: retained Claude/Codex + 17 retired.
- representative owned path for each host.
- modified retired file: `.cursor/hooks.json`.
- mixed current files: `.claude/settings.json`, `.codex/config.toml`, `AGENTS.md`.
- shared generated paths: `.agents/skills/trellis-check/SKILL.md`, `.github/hooks/trellis.json`.
- legacy generated path: `.zcode/cli/agents/trellis-check.md`.
- user-owned paths under Cursor, Codex, OpenCode.

Keep fixture frozen. Do not regenerate it from C04 output.

`test/compatibility/legacy-installation-compatibility.test.ts:63-131` validates fixture bytes and ownership evidence. Keep unchanged unless C04 adds non-mutating assertions.

Uninstall acceptance after registry shrink:

- pristine retired generated files deleted;
- modified retired generated file preserved/reported;
- mixed configs scrub only Trellis fields/blocks;
- current Claude/Codex mixed files handled by current descriptors;
- `.agents/skills` current Codex ownership not deleted by Gemini retirement;
- user-owned runtime files remain;
- protected Research data remains.

### Upgrade/update compatibility

`trellis upgrade` updates global package only; host registry is irrelevant. Keep `commands/upgrade.ts` and `test/commands/upgrade.test.ts` unchanged.

Post-upgrade `trellis update` is relevant:

- active detection becomes Claude/Codex only;
- common `.trellis` templates still update;
- retired host collectors no longer run;
- exact retired manifest keys remain through manifest pruning;
- update does not automatically delete all 1,009 retired paths; cleanup inventory primarily supports ownership preservation and uninstall;
- migration manifests remain canonical historical cleanup/rename behavior.

Retain `needsCodexUpgrade` compatibility. A retired ZCode project must not trigger Codex merely because it has ZCode-private skills. Existing test `test/commands/update.integration.test.ts:271-308` should be retained/reframed as retired-host collision compatibility, not deleted as “ZCode active support.”

### Current-template precedence over historical deletion

`packages/cli/src/commands/update.ts:323-351` filters `safe-file-delete` entries whose path is in current template set. Keep.

Pinned test: `test/commands/update-internals.test.ts:424-440` uses `.agents/skills/trellis-check/SKILL.md`. This path was historically shared with Gemini but is current Codex output. Current ownership wins.

Do not copy migration `allowed_hashes` into retired cleanup inventory. Migration history and retired exact ownership solve different problems.

### Shared path/collision matrix

| Path | Current owner after C04 | Historical overlap | Required behavior |
|---|---|---|---|
| `.agents/skills/` | Codex | Gemini | Active managed root and current template output. Never treat root membership alone as Codex detection. |
| `.agents/skills/trellis-*` | Codex current templates | Gemini historical identical writes | Current collector wins over retired inventory and safe-delete history. |
| `AGENTS.md` | Generic current Trellis marker block | Existing user content | Preserve user content; marker scrub/update only. |
| `.github/copilot-instructions.md` | No active owner | Copilot retired structured file | Stop update generation/merge; retain marker-based retired scrub. |
| `.github/hooks/trellis.json` | No active owner | Copilot generated/discovery path | Retain exact cleanup/fixture behavior; no active collector. |
| `.windsurf/*` | No active owner | Devin alias/migrations | No active detection; migration and cleanup roots remain. |
| `.zcode/cli/agents` | No active owner | ZCode legacy alias | Keep alias root and migration references; no active collector. |

### C03 collector-extraction drift test transition

Current `test/legacy/retired-host-cleanup.test.ts` imports active collector helpers at `:5-9` and has two extraction-gate tests:

- collector path equality: `:69-85`;
- collector managed-root equality: `:87-93`.

Those tests cannot survive retired collector deletion. Replace, do not delete entire suite.

Recommended replacement:

1. Remove imports of `collectPlatformTemplates` and `getPlatformManagedPaths`.
2. Keep ordered 17-ID assertion (`:44-49`).
3. Keep 1,009 unique safe exact-path assertion (`:51-67`).
4. Add explicit snapshot metadata assertion: schema `1`, source `0.6.7`.
5. Add explicit per-host cardinality table shown above.
6. Assert every host array is sorted and unique. Runtime loader already enforces this; test gives clear drift failure.
7. Assert host key order exactly matches `RETIRED_HOST_IDS`.
8. Replace dynamic managed-root comparison with an explicit frozen `EXPECTED_RETIRED_MANAGED_ROOTS` array equal to `RETIRED_MANAGED_ROOTS`.
9. Keep alias-root separation test (`:95-105`), then pin `PLATFORM_MANAGED_DIRS` exactly to `.claude`, `.codex`, `.agents/skills`.
10. Optionally cross-check frozen fixture representative paths: each retired fixture path must be in that host’s snapshot array or in `RETIRED_STRUCTURED_FILES` (Trae’s `.trae/settings.json` is structured-only).

This turns one-time extraction drift guard into static snapshot integrity guard suitable after source collectors are gone.

### Active-host tests: remove or narrow

Delete dedicated retired template suites:

- `test/templates/copilot.test.ts`
- `cursor.test.ts`
- `grok.test.ts`
- `kiro.test.ts`
- `omp.test.ts`
- `opencode.test.ts`
- `pi.test.ts`
- `reasonix.test.ts`
- `trae.test.ts`
- `zcode.test.ts`
- `test/scripts/inject-workflow-state-kiro.integration.test.ts`

Retain:

- `test/templates/claude.test.ts`
- `test/templates/codex.test.ts`
- generic template tests after retired assertions are removed.

Narrow mixed registry suites:

- `test/types/ai-tools.test.ts` — assert exactly two IDs, not merely “at least one.”
- `test/registry-invariants.test.ts` — keep generic invariants; reduce hook config table to Claude/Codex; remove Kiro block.
- `test/configurators/index.test.ts` — keep active/legacy root union tests; active collector skill roots only Claude/Codex; remove retired collector assertions.
- `test/configurators/platforms.test.ts` — detection/configuration/parity only Claude/Codex; explicitly assert retired roots do not detect.
- `test/commands/init.integration.test.ts` — remove retired install tests; pin Claude-only `-y`, Codex-only explicit, both explicit, no retired roots.
- `test/commands/init-internals.test.ts` — retain generic init helpers; remove retired host assumptions.
- `test/templates/shared-hooks.test.ts` — two-platform table, three retained scripts, no Cursor-only shell bridge.
- `test/templates/extract.test.ts` — remove OpenCode/Pi path helper tests.
- `test/regression.test.ts` — largest edit. Remove retired registration, collector, generated adapter, hook, agent, and platform-path blocks; preserve Claude/Codex, migration-history, cleanup, shared-path, generic script, and product-surface tests.

Regression line clusters requiring classification:

- active collector/platform tests around `:1007-1031`;
- retired Python/session branches around `:2425-3185`, `:3914-3961`, `:4487-4571`;
- registry and Python adapter platform support around `:5169-5642`;
- retired collector/migration assertions around `:5870-5997`;
- class-2 retired hosts around `:6143-6362`;
- retired template compatibility around `:6426-6625`, `:6855-6959`.

Do not delete migration-history assertions merely because they name retired hosts. Historical manifests remain supported compatibility data.

### Acceptance tests to add/pin

1. Active IDs exactly `claude-code`, `codex`.
2. Init help lists only `--claude`, `--codex` host flags.
3. Removed `--cursor` is rejected.
4. `-y` defaults Claude-only.
5. Active detection ignores every retired root, including `.windsurf` and shared `.agents/skills` alone.
6. Active roots exact; cleanup root union still contains all frozen retired/alias roots.
7. Update current collector set contains no retired paths.
8. Current Codex shared path survives manifest prune and safe-delete classification.
9. Frozen C03 inventory integrity: 17 IDs, per-host counts, 1,009 unique paths, frozen roots.
10. Frozen 0.6.7 uninstall still passes.
11. Unknown files beneath retired roots remain user-owned.
12. Research protection remains unchanged.

## Caveats / Not Found

- No full frozen-fixture update test exists; fixture is consumed by fixture-integrity and uninstall suites. Adding a non-mutating update/dry-run fixture test would increase confidence but is not required if existing manifest-prune/update collision tests stay strong.
- Some test names encode old release history. Keep when testing migrations/compatibility; rename only when they falsely claim current support.

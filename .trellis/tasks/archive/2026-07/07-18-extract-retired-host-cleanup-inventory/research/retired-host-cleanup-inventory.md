# Research: Retired-Host Cleanup Inventory

- **Query**: Map the host registry, configurators/templates, migrations, uninstall scrubbers, manifest pruning, update backup planning, and the C01 frozen 0.6.7 fixture; identify the smallest cleanup-only extraction boundary needed before support shrinks to Claude Code and Codex.
- **Scope**: internal
- **Date**: 2026-07-18

## Findings

### Executive Conclusion

The active support registry and legacy cleanup knowledge are currently the same data graph. `AITool` and `AI_TOOLS` define which hosts exist; `PLATFORM_FUNCTIONS` supplies their writers and template collectors; `PLATFORM_IDS`, `PLATFORM_MANAGED_DIRS`, and `ALL_MANAGED_DIRS` are derived from that registry. The same derived values drive detection, manifest pruning, update backups, migration directory cleanup, and uninstall empty-root cleanup.

Shrinking `AI_TOOLS` and `PLATFORM_FUNCTIONS` directly to Claude Code and Codex would therefore stop installation and updates for the other 17 hosts, but it would also discard cleanup knowledge for their manifest-owned files. `pruneOrphanManifestKeys` would release many retired-host ownership entries as unknown before uninstall or update could safely remove them.

The smallest safe extraction boundary is a data-only, non-installable legacy cleanup inventory containing:

1. the 17 retired host IDs;
2. their exact generated path set, not wildcard ownership of whole roots;
3. their managed roots for backup and confirmed-empty directory cleanup;
4. historical alias roots and paths not represented by current collectors (`.iflow/**`, `.windsurf/**`, `.zcode/cli/agents/**`, and the frozen `.trae/settings.json` path);
5. exact structured-file scrub dispatch for retired mixed-ownership files;
6. shared/current collision metadata, especially `.agents/skills/**` remaining owned by Codex.

The inventory must not contain configurator functions, template bytes, CLI flags, host detection, or install/update write behavior. Existing migration manifests and their `allowed_hashes` should remain the canonical migration history rather than being duplicated into this inventory.

### Files Found

| File Path | Symbol / Description |
|---|---|
| `packages/cli/src/types/ai-tools.ts` | `AITool`, `AIToolConfig`, `AI_TOOLS`, `getManagedPaths`, `getTemplateDirs` — active host metadata and managed roots |
| `packages/cli/src/configurators/index.ts` | `PlatformFunctions`, `PLATFORM_FUNCTIONS`, `PLATFORM_IDS`, `PLATFORM_MANAGED_DIRS`, `ALL_MANAGED_DIRS`, `getConfiguredPlatforms`, `isManagedPath`, `isManagedRootDir`, `collectPlatformTemplates` |
| `packages/cli/src/configurators/*.ts` | Retired host writers and collectors; exact symbols are listed in the host table below |
| `packages/cli/src/types/migration.ts` | `MigrationItem`, `MigrationManifest`, `ConfigSectionAdded`, `TemplateHashes` |
| `packages/cli/src/migrations/index.ts` | `loadManifests`, `getMigrationsForVersion`, `getAllMigrations`, `getConfigSectionsAddedBetween`, `getMigrationMetadata` |
| `packages/cli/src/migrations/manifests/*.json` | Historical `rename`, `rename-dir`, `delete`, and `safe-file-delete` path/hash evidence |
| `packages/cli/src/utils/template-hash.ts` | `computeHash`, `readTemplateHashesStatus`, `saveHashes`, `isTemplateModified`, `initializeHashes` |
| `packages/cli/src/utils/manifest-prune.ts` | `buildKnownKeys`, `shouldKeepAgentsMd`, `pruneOrphanManifestKeys` |
| `packages/cli/src/utils/uninstall-scrubbers.ts` | `ScrubResult`, `scrubHooksJson`, `scrubOpencodePackageJson`, `scrubPiSettings`, `scrubCodexConfigToml`, `scrubManagedMarkdownBlock` |
| `packages/cli/src/commands/uninstall.ts` | `buildStructuredFileSpecs`, `buildPlan`, `executePlan`, `removeEmptyManagedRoots`, `uninstall` |
| `packages/cli/src/commands/update.ts` | `collectSafeFileDeletes`, `needsCodexUpgrade`, `collectTemplateFiles`, `BACKUP_DIRS`, `createFullBackup`, `dirHasManifestEntries`, `classifyMigrations`, `cleanupEmptyDirs`, `executeMigrations`, `update` |
| `packages/cli/test/fixtures/legacy-0.6.7-multi-host/fixture.json` | Frozen 19-host representative path and ownership classification |
| `packages/cli/test/fixtures/legacy-0.6.7-multi-host/project/.trellis/.template-hashes.json` | Frozen v2 manifest with 25 path/hash entries |
| `packages/cli/test/compatibility/legacy-installation-compatibility.test.ts` | `HISTORICAL_HOST_PATHS`, frozen fixture assertions |
| `.trellis/spec/cli/backend/migrations.md` | Migration and ownership contract |
| `.trellis/spec/cli/backend/uninstall-scrubbers.md` | Structured scrubber contract |
| `.trellis/spec/cli/backend/commands-uninstall.md` | Uninstall planning/execution contract |
| `.trellis/spec/cli/backend/commands-update.md` | Update collection, backup, migration, and safe-delete contract |
| `.trellis/spec/cli/backend/filesystem-safety.md` | Atomic writes, ownership gates, protected paths, destructive-operation safety |

### Current Host Registry and Exact Retirement Set

`packages/cli/src/types/ai-tools.ts:AITool` currently contains 19 IDs. C04 is intended to leave only `claude-code` and `codex`; the exact retirement set is therefore 17 IDs:

1. `cursor`
2. `opencode`
3. `kilo`
4. `kiro`
5. `gemini`
6. `antigravity`
7. `devin`
8. `qoder`
9. `codebuddy`
10. `copilot`
11. `droid`
12. `pi`
13. `reasonix`
14. `zcode`
15. `trae`
16. `omp`
17. `grok`

The retained IDs are:

- `claude-code`
- `codex`

Historical aliases/layouts that are not additional active IDs but must remain cleanup-known are:

- `.iflow/**` — migration-only historical host root with safe-delete hashes;
- `.windsurf/workflows/**` and `.windsurf/skills/**` — historical layout migrated to Devin;
- `.zcode/cli/agents/**` — legacy ZCode layout migrated to `.zcode/agents/**`;
- legacy Codex markers under `.agents/skills/**` when `.codex/` is absent;
- `.trae/settings.json` — frozen C01 path that differs from the current `.trae/hooks.json` output.

### Registry Coupling That C03 Must Break

`packages/cli/src/configurators/index.ts` currently derives cleanup surfaces from the active registry:

```ts
export const PLATFORM_IDS = Object.keys(AI_TOOLS) as AITool[];

export const PLATFORM_MANAGED_DIRS = PLATFORM_IDS.flatMap((id) =>
  getManagedPaths(id),
);

export const ALL_MANAGED_DIRS = [".trellis", ...new Set(PLATFORM_MANAGED_DIRS)];
```

Current consumers and consequences of a direct registry shrink:

| Consumer | Current dependency | Consequence without extraction |
|---|---|---|
| Platform detection | `getConfiguredPlatforms` iterates active `PLATFORM_IDS` | Retired roots stop producing retired IDs. This is correct for active support but cannot be the cleanup gate. |
| Manifest pruning | `manifest-prune.ts:buildKnownKeys` calls `collectPlatformTemplates(id)` only for detected active IDs | Retired generated keys not also named by migrations are pruned as unknown, files survive, and ownership is permanently released. |
| Update backup | `update.ts:BACKUP_DIRS = ALL_MANAGED_DIRS` | Retired roots disappear from pre-mutation backups. Historical `.iflow` and `.windsurf` roots are already outside this set. |
| Migration parent cleanup | `update.ts:cleanupEmptyDirs` uses `isManagedPath` / `isManagedRootDir` | Empty retired/alias parents may no longer be recognized as cleanup boundaries. |
| Uninstall empty-root cleanup | `uninstall.ts:removeEmptyManagedRoots` iterates `ALL_MANAGED_DIRS` | Retired empty roots remain after their files are removed. |
| Current template collision guard | `update.ts:collectSafeFileDeletes` excludes `currentTemplatePaths` | Must continue to use only current Claude/Codex templates so current ownership wins over historical deletion. |

The required split is not “active registry plus retired configurators.” It is “active registry for install/update behavior” plus “legacy inventory for path classification, backup, scrubbing, and empty-root cleanup.”

### Retired Hosts: Managed Roots and Generated Families

The exact 1,009 generated paths are frozen in `research/retired-host-generated-paths.md`. The table below is the compact family map.

| Retired ID | Managed roots from `AI_TOOLS` | Generated file families | Current path count | Configurator / collector |
|---|---|---|---:|---|
| `cursor` | `.cursor` | `.cursor/commands/trellis-*.md`; `.cursor/skills/**`; `.cursor/agents/*.md`; `.cursor/hooks/*.py`; `.cursor/hooks.json` | 61 | `configurators/cursor.ts:configureCursor` |
| `opencode` | `.opencode` | `.opencode/commands/trellis/*.md`; `.opencode/skills/**`; `.opencode/agents/**`; `.opencode/plugins/**`; `.opencode/lib/**`; `.opencode/package.json` | 64 | `configurators/opencode.ts:collectOpenCodeTemplates`, `configureOpenCode` |
| `kilo` | `.kilocode` | `.kilocode/workflows/*.md`; `.kilocode/skills/**` | 55 | `configurators/kilo.ts:configureKilo` |
| `kiro` | `.kiro/skills`; `.kiro/agents`; `.kiro/hooks` | `.kiro/skills/**`; `.kiro/agents/*.json`; `.kiro/hooks/*.py`; `.kiro/hooks/*.kiro.hook` | 62 | `configurators/kiro.ts:configureKiro` |
| `gemini` | `.gemini`; `.agents/skills` | `.gemini/commands/trellis/*.toml`; `.gemini/agents/*.md`; `.gemini/hooks/*.py`; `.gemini/settings.json`; shared `.agents/skills/**` | 60 | `configurators/gemini.ts:configureGemini` |
| `antigravity` | `.agent/workflows`; `.agent/skills` | `.agent/workflows/*.md`; `.agent/skills/**` | 55 | `configurators/antigravity.ts:configureAntigravity` |
| `devin` | `.devin/workflows`; `.devin/skills` | `.devin/workflows/trellis-*.md`; `.devin/skills/**` | 55 | `configurators/devin.ts:configureDevin` |
| `qoder` | `.qoder` | `.qoder/commands/trellis-*.md`; `.qoder/skills/**`; `.qoder/agents/*.md`; `.qoder/hooks/*.py`; `.qoder/settings.json` | 60 | `configurators/qoder.ts:configureQoder` |
| `codebuddy` | `.codebuddy` | `.codebuddy/commands/trellis/*.md`; `.codebuddy/skills/**`; `.codebuddy/agents/*.md`; `.codebuddy/hooks/*.py`; `.codebuddy/settings.json` | 61 | `configurators/codebuddy.ts:configureCodebuddy` |
| `copilot` | `.github/copilot`; `.github/agents`; `.github/copilot-instructions.md`; `.github/hooks`; `.github/prompts`; `.github/skills` | Copilot instructions; prompts; skills; `.agent.md` agents; Python hooks; `.github/copilot/hooks.json`; `.github/hooks/trellis.json` | 62 | `configurators/copilot.ts:configureCopilot` |
| `droid` | `.factory` | `.factory/commands/trellis/*.md`; `.factory/skills/**`; `.factory/droids/*.md`; `.factory/hooks/*.py`; `.factory/settings.json` | 61 | `configurators/droid.ts:configureDroid` |
| `pi` | `.pi` | `.pi/prompts/trellis-*.md`; `.pi/skills/**`; `.pi/agents/*.md`; `.pi/extensions/trellis/index.ts`; `.pi/settings.json` | 60 | `configurators/pi.ts:collectPiTemplates`, `configurePi` |
| `reasonix` | `.reasonix` | `.reasonix/skills/**`; agent definitions are also skills with `runAs: subagent` | 56 | `configurators/reasonix.ts:collectReasonixTemplates`, `configureReasonix` |
| `zcode` | `.zcode`; `.zcode/cli/agents`; `.zcode/agents`; `.zcode/commands`; `.zcode/skills`; `.zcode/hooks` | `.zcode/skills/**`; `.zcode/commands/trellis/*.md`; `.zcode/agents/*.md`; `.zcode/hooks/*.py`; `.zcode/config.json`; legacy `.zcode/cli/agents/**` | 61 current, plus legacy | `configurators/zcode.ts:collectZcodeTemplates`, `configureZcode` |
| `trae` | `.trae` | `.trae/commands/trellis-*.md`; `.trae/skills/**`; `.trae/agents/*.md`; `.trae/hooks/*.py`; current `.trae/hooks.json`; frozen legacy `.trae/settings.json` | 60 current, plus legacy | `configurators/trae.ts:configureTrae` |
| `omp` | `.omp` | `.omp/commands/trellis-*.md`; `.omp/skills/**`; `.omp/agents/*.md`; `.omp/extensions/trellis/index.ts` | 58 | `configurators/omp.ts:collectOmpTemplates`, `configureOmp` |
| `grok` | `.grok`; `.grok/skills`; `.grok/commands`; `.grok/agents` | `.grok/skills/**`; `.grok/commands/trellis-*.md`; `.grok/agents/*.md` | 58 | `configurators/grok.ts:collectGrokTemplates`, `configureGrok` |

Dedicated retired template directories exist for Cursor, OpenCode, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi, Reasonix, ZCode, Trae, OMP, and Grok. Kilo, Antigravity, and Devin compose their output from common templates and have no dedicated `src/templates/<host>/` directory.

### Exact Current-Versus-Legacy Collisions

| Collision | Current evidence | Required invariant |
|---|---|---|
| Gemini and Codex share `.agents/skills/**` | Current collectors overlap on 52 exact paths; `gemini.ts:configureGemini` writes the same neutral skill destination that Codex uses | Retiring Gemini must not delete, release, or stop backing up paths still emitted by Codex. Current Codex ownership wins. |
| Historical Codex also used `.agents/skills/**` | `update.ts:needsCodexUpgrade` checks `trellis-continue` and `trellis-finish-work` markers when `.codex/` is absent | Keep legacy Codex upgrade detection independent of Gemini retirement; avoid treating all `.agents/skills` content as retired. |
| Historical safe-delete path is reintroduced by a current template | `update.ts:collectSafeFileDeletes` filters entries when `currentTemplatePaths.has(m.from)` | Current Claude/Codex template paths must continue to override every historical safe deletion. |
| `.windsurf/**` maps to `.devin/**` | `0.6.3.json` contains two `rename-dir` entries | Real user Windsurf data must not move without manifest evidence; `update.ts:dirHasManifestEntries` is the ownership gate. |
| `.zcode/cli/agents/**` maps to `.zcode/agents/**` | `0.6.6.json`; frozen fixture tracks `.zcode/cli/agents/trellis-check.md` | Preserve source ownership evidence and never overwrite a conflicting target. After ZCode retirement, both layouts remain cleanup-known. |
| `.trae/settings.json` versus `.trae/hooks.json` | C01 freezes `settings.json`; current `templates/trae/index.ts:getSettingsTemplate` returns `hooks.json`; no migration references either Trae path | Do not silently treat the frozen path as unknown. Its classification and scrub behavior must be decided explicitly. |
| `.github/**` broad user namespace | Copilot writes exact paths under agents, prompts, skills, hooks, and instructions | Never mark `.github` recursively owned. Cleanup must use exact generated paths and structured scrubbers. |
| Root `AGENTS.md` | Current Claude/Codex ecosystem still uses it; Trellis content is marker-delimited | Always scrub the managed block. Never classify the entire file as a retired opaque file. |
| `.iflow/**` migration-only root | 27 `safe-file-delete` entries and migration path history exist; no active registry root | Keep manifests loaded. Decide whether the backup/empty-root inventory must include `.iflow`; it is currently not in `ALL_MANAGED_DIRS`. |

No paths are shared between two retired-host current collector outputs. The only retired-to-current collector overlap is Gemini to Codex under `.agents/skills/**`.

### Mixed-Ownership Configuration Files

`packages/cli/src/commands/uninstall.ts:buildStructuredFileSpecs` currently dispatches these exact mixed paths:

| Ownership | Path | Scrubber |
|---|---|---|
| Current | `.claude/settings.json` | `scrubHooksJson(..., "nested")` |
| Current | `.codex/hooks.json` | `scrubHooksJson(..., "nested")` |
| Current | `.codex/config.toml` | `scrubCodexConfigToml` |
| Current/shared | `AGENTS.md` | `scrubManagedMarkdownBlock` with Trellis markers |
| Retired | `.gemini/settings.json` | nested hook scrubber |
| Retired | `.factory/settings.json` | nested hook scrubber |
| Retired | `.codebuddy/settings.json` | nested hook scrubber |
| Retired | `.qoder/settings.json` | nested hook scrubber |
| Retired | `.trae/hooks.json` | nested hook scrubber |
| Retired | `.cursor/hooks.json` | `scrubHooksJson(..., "flat")` |
| Retired | `.github/copilot/hooks.json` | flat hook scrubber |
| Retired | `.opencode/package.json` | `scrubOpencodePackageJson` removes only `dependencies["@opencode-ai/plugin"]` |
| Retired | `.pi/settings.json` | `scrubPiSettings` removes exact Trellis arrays/package values |
| Retired | `.github/copilot-instructions.md` | marker-block scrubber |

Structured scrubbing is intentionally not whole-file hash-gated. Opaque files are deleted only when their current LF-normalized SHA-256 equals the installation manifest hash. Unknown, malformed, or modified opaque files survive and ownership is released.

Two frozen/current paths need explicit C03 resolution:

1. `.trae/settings.json` is present and tracked in C01 but is not in the current structured dispatch table, current Trae template set, or any migration manifest. Current pruning classifies it as unknown even before the registry shrinks. The frozen content has a `hooks` object and should not be assumed to be an opaque generated file without a deliberate compatibility decision.
2. `.zcode/config.json` is a current generated hook-registration file and is present in C01, but it has no structured scrubber row. Current ZCode schema is `{ hooks: { enabled: true, events: ... } }`, which is distinct from the existing nested/flat scrubber schemas. Today pristine bytes permit whole-file deletion; any user modification preserves the whole file, including Trellis hook references. If ZCode config can contain user fields, it requires a path-specific scrubber in the extracted legacy cleanup surface.

A third fixture-specific constraint is that C01 `.cursor/hooks.json` references `.trellis/hooks/session-start.py`, while the minimal frozen manifest does not contain that script path. `scrubHooksJson` matches commands against the post-prune manifest path list, so this representative file would currently return `unchanged`. The fixture freezes compatibility evidence, not a complete 0.6.7 installation tree; cleanup tests must decide whether exact legacy generated paths may supplement the scrubber match set.

### Migration Types, Paths, and Known Hashes

`packages/cli/src/types/migration.ts:MigrationItem` supports:

```ts
type: "rename" | "rename-dir" | "delete" | "safe-file-delete";
from: string;
to?: string;
allowed_hashes?: string[];
```

`packages/cli/src/migrations/index.ts:loadManifests` dynamically loads all manifests, and `getAllMigrations` keeps historical entries available regardless of the current project version. This is already a separate cleanup-history channel and should remain so.

Inventory totals:

- 394 migration items overall;
- 365 unique `from` paths;
- 173 unique `to` paths;
- 485 unique migration paths in the union;
- 310 host-related entries in the broad current/historical host-root scan:
  - 158 `rename`;
  - 17 `rename-dir`;
  - 1 `delete`;
  - 134 `safe-file-delete`;
- 192 `safe-file-delete` entries overall;
- 236 unique accepted hashes;
- up to 11 accepted historical hashes for one path.

Key cross-layout manifests:

- `0.3.4.json`: `.kilocode/commands/trellis` to `.kilocode/workflows`;
- `0.6.3.json`: `.windsurf/workflows` to `.devin/workflows` and `.windsurf/skills` to `.devin/skills`;
- `0.6.6.json`: `.zcode/cli/agents` to `.zcode/agents`;
- `0.6.0-beta.23.json`: typo correction from `trellis-spec-bootstarp` to `trellis-spec-bootstrap` across many host roots, including shared `.agents/skills`;
- `0.5.0-beta.0.json`: large command-to-skill and retired-command cleanup set across active, retired, and historical alias roots.

There are no host-specific migration paths for Reasonix, Trae, OMP, or Grok. Their retirement cleanup depends on manifest ownership plus the frozen generated path set.

The complete path/hash appendix is `research/migration-cleanup-paths-and-hashes.md`. It should remain evidence, not a second runtime source of truth: migration manifests already own these hashes.

### Manifest Ownership and Pruning

`packages/cli/src/utils/template-hash.ts:computeHash` computes SHA-256 after CRLF-to-LF normalization. The persisted manifest is schema v2:

```json
{
  "__version": 2,
  "hashes": {
    "posix/relative/path": "sha256"
  }
}
```

`initializeHashes` hashes platform/root paths only from `trackedPaths`, meaning files Trellis actually wrote or byte-identically owned during init. It does not recursively claim every file below a platform root. `.trellis/**` still uses a protected recursive walk with exclusions.

`packages/cli/src/utils/manifest-prune.ts:buildKnownKeys` currently preserves:

1. current `.trellis` workflow assets;
2. protected research paths;
3. registry-owned spec files;
4. current configured platform collector keys;
5. every migration `from` and `to` path;
6. marker-owned or missing `AGENTS.md`.

This exact-key design is the safety boundary. The legacy inventory must add exact retired generated paths to the known-key set. It must not add “anything under `.cursor/`,” “anything under `.github/`,” or any other recursive root ownership rule; doing so would reintroduce the historical user-data deletion class.

After C04, the desired pruning union is:

```text
current workflow keys
+ protected research
+ registry spec keys
+ current Claude/Codex template keys
+ exact retired generated keys
+ all migration from/to keys
+ managed AGENTS.md evidence
```

Only manifest-listed keys in that union become cleanup candidates. The inventory does not authorize scanning retired roots and claiming untracked disk content.

### Update Backup Planning

`packages/cli/src/commands/update.ts` currently declares:

```ts
const BACKUP_DIRS = ALL_MANAGED_DIRS;
const BACKUP_FILES = [FILE_NAMES.AGENTS] as const;
```

`createFullBackup` runs after confirmation and persisted pruning, before regular migrations and `safe-file-delete`. It excludes protected research, prior backups, `node_modules`, `.trellis/workspace`, tasks, specs, backlog, agent traces, and platform worktrees. Symlinks are not followed.

C04 would reduce `ALL_MANAGED_DIRS` to current roots unless C03 extracts a backup root set. The minimum cleanup inventory must therefore expose retired managed roots to backup planning while keeping them out of active platform detection and template collection.

The legacy backup/root set must also decide how to handle migration-only aliases:

- `.windsurf` is not currently in `ALL_MANAGED_DIRS`, although migrations may move its workflows/skills;
- `.iflow` is not currently in `ALL_MANAGED_DIRS`, although safe-delete may remove hash-approved files;
- `.zcode/cli/agents` is already explicitly managed through ZCode `extraManagedPaths`.

The existing implementation backs up roots, not exact manifest files. A smaller backup traversal would require a separate design change. For C03, the smallest extraction compatible with current consumers is a root list used only by backup and empty-directory cleanup.

### C01 Frozen 0.6.7 Multi-Host Fixture

`packages/cli/test/compatibility/legacy-installation-compatibility.test.ts:HISTORICAL_HOST_PATHS` freezes all 19 IDs and one representative manifest-owned path per host. `fixture.json` classifies:

- tracked modified: `.cursor/hooks.json`;
- tracked mixed: `.claude/settings.json`, `.codex/config.toml`, `AGENTS.md`;
- shared generated: `.agents/skills/trellis-check/SKILL.md`, `.github/hooks/trellis.json`;
- legacy generated: `.zcode/cli/agents/trellis-check.md`;
- untracked user-owned: `.cursor/rules/user-owned.mdc`, `.codex/sessions/keep.jsonl`, `.opencode/plugins/custom-user-plugin.ts`.

The test proves the fixture has exactly 19 representative host paths, a valid v2 manifest, one intentional hash mismatch, user content in mixed files, and untracked user content outside the manifest. It does not run update or uninstall and does not represent every file generated by 0.6.7.

#### Frozen Manifest Hashes

| Path | Recorded SHA-256 |
|---|---|
| `.agent/workflows/continue.md` | `37e0e4321c8843a71e5782029d0436c8ced69218dd19c782de5ac90263c644de` |
| `.agents/skills/trellis-check/SKILL.md` | `2745c4263855539e31ec3362d2f6573d8b398921bcab620429c20e30c8f2d062` |
| `.claude/settings.json` | `4996db000f1c3ae67de56c7c5c20ca6d497d92778076356050e039aa39e024af` |
| `.codebuddy/settings.json` | `5292ac170d460a60452592747d605b10c2919ad74dda39a1b575b8c6b1e874f6` |
| `.codex/config.toml` | `258d12f031e7fce8c0b5f33b2bbea795a452cc163a56c3c567cc767c4ed6828b` |
| `.cursor/hooks.json` | `9fca5421a7e10d498bc66ce2161b8fb0a09f75693c144272deb5aa8f4963b04b` |
| `.devin/workflows/trellis-continue.md` | `9517e5f391aa0baa1871f0a27fd55b77198c14316b6aad59f799be6e9fb37ca1` |
| `.factory/settings.json` | `5292ac170d460a60452592747d605b10c2919ad74dda39a1b575b8c6b1e874f6` |
| `.gemini/settings.json` | `6b0656a0523c8620af2ea2e5e9869e4742cd84a8780c69bd65b7a10201c6df2d` |
| `.github/copilot/hooks.json` | `7f0ba34c1ffef11c07a58a37fcff1d2de32c08ec8f3128fa2cff6dd1cf96d81e` |
| `.github/hooks/trellis.json` | `7f0ba34c1ffef11c07a58a37fcff1d2de32c08ec8f3128fa2cff6dd1cf96d81e` |
| `.grok/commands/trellis-continue.md` | `46d3e8ac73d2dc0b64eb8aad4063d7b138d79c71e2e4c76b37648e4665de5a0d` |
| `.kilocode/workflows/continue.md` | `46d3e8ac73d2dc0b64eb8aad4063d7b138d79c71e2e4c76b37648e4665de5a0d` |
| `.kiro/agents/trellis.json` | `59cf63aac003158a4c2f604454c47c7a918d2092278a9ac4e2922bddaec8ade7` |
| `.omp/extensions/trellis/index.ts` | `202a30fc5261682c5fd80ca77093da160c06dea11b2c099480084c8463c1413b` |
| `.opencode/package.json` | `e2a11d0652dde2151cb82a16cd571de11b973791012b7c4f3f7f822a147b2328` |
| `.pi/settings.json` | `bb8f73d253406c0601b82d01d7dec34be5617389ac8fb461beae652f30cf7583` |
| `.qoder/settings.json` | `5292ac170d460a60452592747d605b10c2919ad74dda39a1b575b8c6b1e874f6` |
| `.reasonix/skills/trellis-check/SKILL.md` | `227138144f26448ea679277356d6802cc2eda6c4ccf4c425b9fd7fb19bed227a` |
| `.trae/settings.json` | `5292ac170d460a60452592747d605b10c2919ad74dda39a1b575b8c6b1e874f6` |
| `.trellis/config.yaml` | `61387c5578df9656b96cd8dc007dbf803b1226f7feaeb62c3aff8d3886074195` |
| `.trellis/workflow.md` | `3f792e597cdf40d686ee592683fccfcc9b1d036ab40a524d54850b52f640e9fa` |
| `.zcode/cli/agents/trellis-check.md` | `61295c741db0dfbe5ad2af400cdd6eb12b8c76e328380b650231c2df1f82c58c` |
| `.zcode/config.json` | `46a5603f7e8146f7c4ab1247320c00b2e884b7bf058b4ee95546c72f2f39c9a8` |
| `AGENTS.md` | `f32c484d5bc43790135167ca7a372263bfdfe7b73fe76a8b6c5fa710db880420` |

### Smallest Extraction Boundary

The following is the minimum data boundary that lets active support shrink without losing safe cleanup.

| Inventory field | Needed by | Must contain | Must not contain |
|---|---|---|---|
| `retiredHostIds` | Compatibility tests and explicit scope checks | Exact 17 IDs | Claude Code or Codex; historical aliases as fake active IDs |
| `retiredGeneratedPaths` | Manifest pruning and uninstall structured match context | Exact 1,009 current retired collector paths only | Compatibility-only fixture paths, migration history, wildcards, or “all files under root” ownership |
| `retiredManagedRoots` | Update backup, `isManagedPath`/`isManagedRootDir` cleanup, uninstall empty-root cleanup | Current retired roots plus decided migration-only alias roots | Host detection or active initialization behavior |
| `retiredStructuredFiles` | Uninstall scrub dispatch | Exact path, scrubber kind/schema, exact owned keys/markers/values | Whole-file deletion rules for mixed config |
| `sharedCurrentPaths` or equivalent current-wins check | Prune and delete classification | `.agents/skills/**` overlap with current Codex; `AGENTS.md`; any current template collision | A second copy of current template bytes |
| `legacyAliases` | Backup and confirmed-empty cleanup tests | `.iflow`, `.windsurf`, `.zcode/cli/agents` roots | Structured file paths such as `.trae/settings.json`, installable host metadata, or CLI flags |

Existing migration manifests remain separate and canonical. Their `from`/`to` paths are already included in pruning, and their `allowed_hashes` are already consumed by safe deletion. C03 does not need to duplicate 485 migration paths into a new runtime constant.

#### Runtime Consumer Split

| Runtime surface | After extraction |
|---|---|
| `AI_TOOLS`, `AITool`, `PLATFORM_FUNCTIONS`, init choices, CLI flags | Claude Code and Codex only |
| `getConfiguredPlatforms`, `configurePlatform`, `collectTemplateFiles` writes | Current registry only; never install/update retired templates |
| `manifest-prune.ts:buildKnownKeys` | Current keys plus exact legacy cleanup keys |
| `uninstall.ts:buildStructuredFileSpecs` | Current and retired structured dispatch independent of active host detection |
| `update.ts:BACKUP_DIRS` / backup planning | Current managed roots plus cleanup-only legacy roots |
| `isManagedPath`, `isManagedRootDir`, `removeEmptyManagedRoots` | Current roots plus cleanup-only roots for confirmed-empty removal |
| `collectSafeFileDeletes` current-template guard | Current Claude/Codex template set only |
| Migration loading/classification/execution | Unchanged; continue loading all manifests |
| `needsCodexUpgrade` | Retained because Codex remains current and `.agents/skills` is a live shared root |

This boundary avoids retaining retired configurators or template directories merely so cleanup can name their old outputs.

### Proposed Tests

1. **Inventory cardinality** — assert 19 historical fixture IDs, 2 current IDs, and exactly 17 retired IDs with no overlap.
2. **Generated-path freeze** — assert every retired collector key is in the frozen cleanup set before deleting configurators/templates; assert the set has 1,009 unique current paths at the extraction baseline.
3. **Registry-shrink simulation** — with active registry limited to Claude Code/Codex, run pruning against the C01 manifest and assert every retired representative generated path remains known unless explicitly classified as an unresolved legacy exception.
4. **Shared Codex/Gemini ownership** — assert all 52 overlapping `.agents/skills/**` paths remain current-owned and are never planned as retired deletions.
5. **Current-template beats safe-delete** — historical deletion for a path in the current Claude/Codex template map must be excluded.
6. **Modified Cursor structured config** — remove exact Trellis hook entries from `.cursor/hooks.json` while preserving `userHook` and other user fields; do not depend on whole-file hash equality.
7. **Current mixed files** — preserve `.claude/settings.json` `userTheme`, `.codex/config.toml` `model = "gpt-5"`, and the user-authored `AGENTS.md` introduction while removing only Trellis-owned content.
8. **Retired mixed files** — table-driven coverage for Gemini, Droid, CodeBuddy, Qoder, Trae, Copilot, OpenCode, and Pi paths after those hosts no longer exist in `AITool`.
9. **Trae legacy path** — explicit test for `.trae/settings.json`; acceptance must specify scrub versus pristine opaque deletion versus preserve/release.
10. **ZCode config** — pristine, user-mixed, malformed, and idempotent cleanup tests for `.zcode/config.json` if it is classified structured.
11. **ZCode legacy layout** — preserve cleanup knowledge for `.zcode/cli/agents/trellis-check.md`; handle `.zcode/agents` target conflicts without overwrite.
12. **Windsurf ownership gate** — manifest-tracked `.windsurf` source may migrate; untracked real user `.windsurf` data must skip even with `--force`.
13. **Historical alias backup** — verify the chosen `.iflow` and `.windsurf` roots/files are backed up before migration or safe deletion.
14. **Untracked user content** — `.cursor/rules/user-owned.mdc`, `.codex/sessions/keep.jsonl`, and `.opencode/plugins/custom-user-plugin.ts` survive and never enter the manifest.
15. **Unknown manifest poisoning** — unknown descendants below retired roots are pruned/released without filesystem mutation; exact-root membership must not confer ownership.
16. **Opaque hash gate** — pristine retired opaque file deletes; hash mismatch preserves; missing hash is conservative.
17. **Safe-file-delete hashes** — accepted hash deletes, unknown hash preserves, and the full manifest appendix remains loadable after active registry shrink.
18. **Backup exclusions** — protected research, tasks, workspace, specs, worktrees, sessions, and `node_modules` remain excluded or untouched according to current contracts.
19. **Empty-root cleanup** — remove retired roots only when confirmed empty; retain roots containing any user file.
20. **Dry run and cancellation** — no manifest, file, backup, or directory mutation.
21. **Confirmation-time revalidation** — a retired opaque or structured file changed while confirming must survive and release ownership.
22. **Independent repository boundary** — root CLI tests must not read or mutate dirty `docs-site` or `marketplace` worktrees.

### Risks

- **Overbroad ownership**: root or glob-based preservation can make poisoned/user files look managed and recreate the over-deletion incident class.
- **Undercomplete exact set**: any retired generated path omitted from the inventory can be pruned as unknown, preserving the file but permanently losing safe cleanup authority.
- **Shared-root deletion**: treating Gemini’s `.agents/skills` as retired would damage current Codex support.
- **Mixed-file omission**: a mixed path left opaque can be deleted whole when pristine or can retain stale Trellis references when user-modified.
- **Legacy filename drift**: C01 `.trae/settings.json` already disagrees with current Trae output and current scrub dispatch.
- **Distinct structured schemas**: `.zcode/config.json` cannot be safely routed through the existing nested/flat hook parser without schema-specific validation.
- **Minimal fixture ambiguity**: C01 is representative, not a complete install; hook references may point to generated files absent from its manifest.
- **Backup gap**: `.iflow` and `.windsurf` migration-only roots are not currently covered by `ALL_MANAGED_DIRS`.
- **Inventory drift**: if extraction is generated from mutable collectors rather than frozen and reviewed, later template changes can accidentally rewrite historical cleanup knowledge.
- **Lifecycle ambiguity**: the task must decide whether legacy cleanup remains indefinitely or is removed after a bounded transition; current manifests are intentionally loaded indefinitely.

### Related Specs

- `.trellis/spec/cli/backend/migrations.md` — migration types, ownership gates, safe-delete hashes, pruning contract.
- `.trellis/spec/cli/backend/uninstall-scrubbers.md` — exact structured scrubber invariants.
- `.trellis/spec/cli/backend/commands-uninstall.md` — plan/execute lifecycle and `ALL_MANAGED_DIRS` cleanup dependency.
- `.trellis/spec/cli/backend/commands-update.md` — current templates, backup order, migration collision rules, Codex legacy detection.
- `.trellis/spec/cli/backend/filesystem-safety.md` — destructive-operation and protected-path rules.
- `.trellis/spec/cli/backend/platform-integration.md` — platform output maps, Trae `.trae/hooks.json`, and ZCode `.zcode/config.json` schema/behavior.

## Caveats / Not Found

- The C01 fixture does not freeze every 0.6.7 generated file. It freezes one representative path per host plus selected shared, legacy, mixed, and user-owned evidence.
- No migration entry was found for `.trae/settings.json` to `.trae/hooks.json`.
- No current uninstall structured dispatch exists for `.zcode/config.json`.
- No host-specific migration paths were found for Reasonix, Trae, OMP, or Grok.
- External research was not required; all findings come from repository source, specs, tests, manifests, and the frozen fixture.
- Findings reflect the current dirty `variant/research-workflow` worktree. Registry/configurator/template sources used for exact generated-path enumeration were clean; cleanup files under study had pre-existing changes and were treated as read-only.
- `docs-site` and `marketplace` are independent repositories. Neither was entered or modified.

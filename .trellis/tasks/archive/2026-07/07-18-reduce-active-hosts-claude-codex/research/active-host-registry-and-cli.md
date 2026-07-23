# Research: Active host registry and CLI surface

- **Query**: Plan C04 so current host support becomes exactly Claude Code + Codex while C03 retired-host cleanup remains available.
- **Scope**: internal
- **Date**: 2026-07-20

## Findings

### Central active registry

| File Path | Current role | C04 requirement |
|---|---|---|
| `packages/cli/src/types/ai-tools.ts:10-29` | `AITool` union contains 19 host IDs. | Narrow to `"claude-code" | "codex"`. |
| `packages/cli/src/types/ai-tools.ts:34-54` | `TemplateDir` contains current and retired host categories. | Narrow to `"common" | "claude" | "codex"`; categories are active template metadata, not cleanup inventory. |
| `packages/cli/src/types/ai-tools.ts:60-79` | `CliFlag` contains 19 init flags. | Narrow to `"claude" | "codex"`. |
| `packages/cli/src/types/ai-tools.ts:155-504` | `AI_TOOLS` stores names, template dirs, config dirs, managed paths, CLI flags, defaults, Python-hook metadata, placeholder context. | Retain only Claude Code and Codex entries. Do not move retired metadata into this active registry. |
| `packages/cli/src/types/ai-tools.ts:509-532` | `getToolConfig`, `getManagedPaths`, `getTemplateDirs`. | Keep generic helpers. After shrink, inputs are compile-time limited to two hosts. |

Retained metadata matters:

- Claude Code: `.claude`, `--claude`, `defaultChecked: true`, Python hooks enabled.
- Codex: `.codex`, `--codex`, `defaultChecked: false`, Python hooks enabled, `supportsAgentSkills: true` -> active managed root `.agents/skills`.
- `TemplateContext` value unions should not be narrowed merely because some values become unused. They are generic rendering contracts; pruning them adds unrelated type churn.

### Derived behavior registry

`packages/cli/src/configurators/index.ts` currently imports all 19 configurators and retired template modules (`:21-109`), then defines a complete `Record<AITool, PlatformFunctions>` (`:172-504`). C04 should retain only:

- `configureClaude` + Claude collector.
- `configureCodex` + Codex collector.
- Shared helpers required by those two collectors.

Derived outputs after shrink:

| Symbol | Expected C04 value/behavior |
|---|---|
| `PLATFORM_IDS` | `["claude-code", "codex"]` |
| `CONFIG_DIRS` | `[".claude", ".codex"]` |
| `PLATFORM_MANAGED_DIRS` | `[".claude", ".codex", ".agents/skills"]` |
| `getPlatformsWithPythonHooks()` | `["claude-code", "codex"]` |
| `getInitToolChoices()` | Two choices only: `claude`, `codex`. |
| `resolveCliFlag()` | Resolves only `claude` and `codex`; all retired flags return `undefined`. |
| `configurePlatform()` | Dispatches only retained hosts. |
| `collectPlatformTemplates()` | Collects only retained hosts. |

`ALL_MANAGED_DIRS` must **not** shrink to active roots. Keep current formula (`packages/cli/src/configurators/index.ts:526-529`):

```ts
[".trellis", ...new Set([...PLATFORM_MANAGED_DIRS, ...LEGACY_CLEANUP_MANAGED_ROOTS])]
```

This preserves backup and confirmed-empty cleanup for retired roots without making them active.

### Active host detection

`getConfiguredPlatforms()` (`packages/cli/src/configurators/index.ts:538-549`) iterates active registry, then adds Devin for legacy `.windsurf/workflows`.

C04 behavior:

- Detect `.claude` -> `claude-code`.
- Detect `.codex` -> `codex`.
- Do not detect `.agents/skills` alone as Codex; root is shared standard and may be Gemini-created.
- Do not detect any retired config root.
- Remove `.windsurf/workflows` -> Devin branch. Historical `.windsurf` handling remains in C03 cleanup roots and migration manifests.

Direct production consumers found:

- `commands/init.ts:794-917` — re-init reporting and add-platform selection.
- `commands/update.ts:909-950, 2200-2262` — current platform collection and Codex upgrade bridge.
- `commands/uninstall.ts:542-549` — passes current platforms into manifest pruning.
- `utils/manifest-prune.ts:72-109` — current template key collection plus independent retired inventory.

### CLI init surface

`packages/cli/src/cli/index.ts:66-95` currently advertises broad support and registers 19 host flags plus deprecated `--windsurf`.

C04 changes:

- Global description: name Claude Code + Codex only.
- Keep init flags `--claude`, `--codex`.
- Remove all 17 retired flags and `--windsurf`.
- Remove Commander-level Windsurf-to-Devin normalization (`:130-141`).
- Keep `--with-statusline`; Claude-specific retained feature.
- Keep `--workflow`, `--workflow-source`; C05/C10 scope.
- Keep Mem, Channel, Workflow, Research commands; C10 or other child scope.

`packages/cli/src/commands/init.ts` changes:

- Remove programmatic Windsurf normalization (`:1121-1127`).
- Narrow `InitOptions` host fields (`:1016-1037`) to `claude?` and `codex?`; keep non-host options unchanged.
- Preserve `_AssertCliFlagsInOptions` (`:1053-1059`).
- Update banner at `:1138-1145` from Claude Code + Cursor to Claude Code + Codex.
- Registry-derived interactive choices and explicit flag processing (`:1445-1475`) then become two-host automatically.
- Re-init choices (`:794-917`) become two-host automatically.

### Recommended `-y` default

Use Claude Code only.

Reason: C04 retires hosts; it should not silently add a new default installation. Current defaults are Cursor + Claude because both entries have `defaultChecked: true`. Removing Cursor naturally leaves Claude. Codex remains explicit via `--codex` or interactive selection. Changing Codex to `defaultChecked: true` would be separate product behavior.

Required acceptance pin:

- `trellis init -y` writes `.claude`, not `.codex` or `.agents/skills`.
- `trellis init -y --codex` writes Codex only because explicit host flags take precedence.
- `trellis init -y --claude --codex` writes both.

Update stale comment at `commands/init.ts:1459` (“default to Cursor and Claude”).

### Validation and help

Commander is host-flag validation boundary:

- `trellis init --cursor` should fail as unknown option after flag removal.
- `trellis init --help` should list only `--claude` and `--codex` among host flags.
- Programmatic unknown object properties are not a supported public API; no extra runtime validator is needed.

### Retired active implementation files

Delete 17 retired configurators:

- `antigravity.ts`, `codebuddy.ts`, `copilot.ts`, `cursor.ts`, `devin.ts`, `droid.ts`, `gemini.ts`, `grok.ts`, `kilo.ts`, `kiro.ts`, `omp.ts`, `opencode.ts`, `pi.ts`, `qoder.ts`, `reasonix.ts`, `trae.ts`, `zcode.ts`.

Retain:

- `claude.ts`, `codex.ts`, `index.ts`, `shared.ts`, `workflow.ts`.

`templates/extract.ts:43-71` has OpenCode/Pi-only path exports. Remove `getOpenCodeTemplatePath`, `getPiTemplatePath`, `getPiSourcePath` when their configurators disappear. Keep Trellis/Claude extraction helpers.

`templates/template-utils.ts` is consumed only by retired host template modules. Delete it after those modules are removed.

### Retained common product docs

Retained `trellis-meta` templates currently document all hosts. C04 should update host-support claims in these files, not delete the common skill:

- `templates/common/bundled-skills/trellis-meta/SKILL.md`
- `references/customize-local/{overview,change-agents,change-hooks,change-skills-or-commands}.md`
- `references/local-architecture/{overview,bundled-skills,generated-files}.md`
- `references/platform-files/{overview,platform-map,agents,hooks-and-settings,skills-and-commands}.md`

Do not alter `trellis-session-insight` retired-provider references in C04. They describe Mem adapters, not active init hosts; Mem removal belongs to C10.

### Related specs

- `.trellis/spec/cli/backend/platform-integration.md` — active registry, shared paths, Python parallel registries, C03 cleanup split.
- `.trellis/spec/cli/backend/configurator-shared.md` — shared configurator and hook distribution behavior.
- `.trellis/spec/cli/backend/commands-update.md` — active template collection and legacy update behavior.
- `.trellis/spec/cli/backend/commands-uninstall.md` — active detection independent from retired cleanup.
- `.trellis/spec/cli/backend/research-worker-hooks.md` — currently contains broad “non-Claude”/OpenCode wording; review after C04 without changing C05 workflow semantics.

Spec edits must use main-agent spec workflow; Research Agent must not edit specs.

## Caveats / Not Found

- No separate shell-script active-host registry found. `packages/cli/scripts/migrate-features-to-tasks.sh` is unrelated.
- `getToolConfig` and `getTemplateDirs` have no production consumers beyond definitions; keep unless separate dead-code cleanup is approved.
- CLI package keywords still include `cursor` and `iflow` (`packages/cli/package.json:40-50`). Product metadata decision is small but outside child PRD’s explicit registry/init/template roots. Recommended: remove stale retired keywords in C04 only if published metadata is part of acceptance; otherwise track in final docs/product sweep.

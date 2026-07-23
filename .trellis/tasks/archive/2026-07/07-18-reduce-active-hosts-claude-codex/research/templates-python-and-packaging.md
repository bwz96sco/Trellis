# Research: Templates, generated Python, hooks, and packaging

- **Query**: Map C04 template/config installer removal, generated platform registries, and package output while preserving cleanup-only compatibility.
- **Scope**: internal
- **Date**: 2026-07-20

## Findings

### Package build and copy behavior

`packages/cli/package.json:15-18,80-85`:

```json
"build": "pnpm run clean && tsc && pnpm run copy-templates",
"files": ["dist", "bin", "README.md", "LICENSE"]
```

`packages/cli/scripts/copy-templates.js` recursively copies `src/templates` to `dist/templates`, excluding `.ts`, caches, and Python bytecode. It also copies migration manifests. Consequences:

1. TypeScript template modules compile through `tsc`.
2. Raw Markdown/JSON/Python/TOML/text assets copy automatically.
3. Any retired source template directory left in `src/templates` remains in npm package.
4. No copy allowlist exists. C04 should delete retired source assets; do not complicate copy script.
5. Build starts with `clean`, so removed source assets cannot survive as stale `dist` files.

### Physical template roots

Retain now:

- `templates/claude/`
- `templates/codex/`
- `templates/common/`
- `templates/markdown/`
- `templates/shared-hooks/`
- `templates/trellis/`

Delete retired host-specific roots now:

- `templates/codebuddy/`
- `templates/copilot/`
- `templates/cursor/`
- `templates/droid/`
- `templates/gemini/`
- `templates/grok/`
- `templates/kiro/`
- `templates/omp/`
- `templates/opencode/`
- `templates/pi/`
- `templates/qoder/`
- `templates/reasonix/`
- `templates/trae/`
- `templates/zcode/`

No dedicated physical root exists for Kilo, Antigravity, or Devin; their configurators synthesize outputs from common templates. Removing configurators/registry entries removes active support for those three.

Do not delete common, markdown, or Trellis roots in C04. C05 owns Research-only workflow/init layout. C10 owns generic product templates and commands.

### Retired Copilot behavior outside registry

`packages/cli/src/commands/update.ts` has direct Copilot active support independent from `PLATFORM_FUNCTIONS`:

- Copilot template imports: `:47-52`.
- `buildCopilotInstructionsTemplate`: `:246-254`.
- untracked Copilot managed-block merge: `:272-299`, used at `:1056-1066`.
- explicit collector branch: `:954-959`.
- Copilot path included as current managed file: `:1084-1097`.

Remove these active update paths in C04. Retired `.github/copilot-instructions.md` cleanup remains in `RETIRED_STRUCTURED_FILES`; update must stop generating/merging it.

Keep backup exclusions and migration comments concerning retired roots. They remain safety logic, not active support.

### Shared hook distribution registry

`packages/cli/src/templates/shared-hooks/index.ts` currently declares 11 platforms (`:33-44`) and a broad distribution table (`:81-120`). C04 target:

```ts
type SharedHookPlatform = "claude" | "codex";

SHARED_HOOKS_BY_PLATFORM = {
  claude: [
    "session-start.py",
    "inject-workflow-state.py",
    "inject-subagent-context.py",
  ],
  codex: ["inject-workflow-state.py"],
};
```

Retain these scripts:

- `session-start.py`
- `inject-workflow-state.py`
- `inject-subagent-context.py`

Delete `inject-shell-session-context.py`; it is Cursor-only and no retained platform distributes it.

Update comments to describe only retained hook contracts. Remove retired-host capability documentation from this active table.

### Shared hook script internals

Current scripts are not platform-independent despite header claim.

#### `shared-hooks/session-start.py`

- `_detect_platform` at `:189-230` detects Cursor, ZCode, CodeBuddy, Droid, Gemini, Qoder, Kiro, Copilot, Trae, Claude, Codex.
- Kiro plain-text output branch at `:1140-1145`.
- multi-host output shape comments/branch at `:1147-1165`.

C04: narrow detection to Claude/Codex inputs actually needed by retained installs; remove Kiro/ZCode/Cursor and other output branches. Keep Claude session environment bridge and Codex behavior only where this script is genuinely used. Shared `session-start.py` is distributed only to Claude; Codex has its own `templates/codex/hooks/session-start.py`, so do not invent a new Codex shared-hook install.

#### `shared-hooks/inject-workflow-state.py`

- `_detect_platform` at `:96-137` detects broad retired set.
- active-task/context routing uses detected platform at `:140-155`.
- Claude Research selection and Codex breadcrumb behavior at `:516-547` are retained.

C04: keep only Claude/Codex detection/branches. Remove Kiro plain-text and retired event-shape logic elsewhere in file. Preserve Claude Research-specific behavior; C05 owns changes to workflow default/sole selection.

#### `shared-hooks/inject-subagent-context.py`

- `_detect_platform` at `:106-140` detects retired hosts.
- Claude Research Dispatch gate at `:1542-1559` is retained.
- ZCode output special case and retired multi-format envelope at `:1610-1634` are active retired-host behavior.

C04: retain Claude behavior; remove retired detection and output formats. Codex does not receive this shared hook.

### Generated `.trellis/scripts` platform registry

#### `common/cli_adapter.py`

This is a second active host registry because copied Python cannot import TypeScript.

Key exhaustive surfaces:

- `Platform` literal: `:43` onward.
- `CLIAdapter.config_dir_name`: `:102`.
- `get_commands_path`: `:171`.
- `get_trellis_command_path`: `:253`.
- `get_non_interactive_env`: `:303`.
- `build_run_command`: `:346`.
- `build_resume_command`: `:456`.
- `cli_name`: `:556`.
- capability properties: `:595-624`.
- `get_cli_adapter`: `:658-703`; includes deprecated `windsurf` -> `devin` alias.
- `_ALL_PLATFORM_CONFIG_DIRS`: `:704-736`.
- `detect_platform`: `:741-903`; detects retired config roots and legacy shared-skill fallback.
- `get_cli_adapter_auto`: `:904`.

C04 requirements:

- `Platform = Literal["claude", "codex"]`.
- Validation accepts only Claude/Codex.
- Remove Windsurf alias.
- Remove retired path, executable, env, command, and capability branches; do not leave generic `else -> Claude` pseudo-support for unknown strings.
- `_ALL_PLATFORM_CONFIG_DIRS` contains only `.claude`, `.codex`.
- Detection uses `.claude` and `.codex`; `.agents/skills` alone must not imply Codex.
- Preserve deterministic priority if both exist. Recommended priority: explicit environment/argument first, then `.claude`, then `.codex`, matching retained current behavior unless tests pin different order.

Reasonix and ZCode were already absent/inconsistent in parts of this Python registry. C04 should remove broad drift rather than preserve it.

#### `common/task_store.py`

- `_SUBAGENT_CONFIG_DIRS`: `:122-137` contains many retired roots.
- `_CODEX_CONFIG_DIR`: `:138`.
- `_has_subagent_platform`: `:148-160` controls JSONL seeding for task creation.

C04 target:

- `_SUBAGENT_CONFIG_DIRS = (".claude",)`.
- Keep Codex separate: only `codex.dispatch_mode == "sub-agent"` counts.
- Remove retired root detection. Do not alter broader task semantics; C05/C10 own workflow/task product changes.

#### `common/active_task.py`

Broad host session adapters remain in current generic script:

- `_KNOWN_PLATFORMS`: `:35-50`.
- `_ENV_SESSION_KEYS`: `:52-70`.
- `_ENV_CONVERSATION_KEYS`: `:71-73`.
- `_ENV_TRANSCRIPT_KEYS`: `:74-82`.
- aliases and ZCode key canonicalization: `:83-94`.
- Cursor-specific shell ticket fallback: `:381-431`.
- class-2 fallback doc names retired hosts: `:495-507`.

C04 should narrow active session environment tables and aliases to Claude/Codex, remove Cursor shell-ticket integration made unreachable by deleted Cursor hook, and rewrite docs. Keep generic session fallback logic if still required by Codex class-2 sub-agents.

#### Other generated script text

- `common/git_context.py:70` uses retired Cursor in platform help example. Change example to Claude/Codex.
- `common/workflow_phase.py:135` uses Cursor in fuzzy-match docstring. Change example to Claude/Codex.
- Codex virtual modes (`codex-inline`, `codex-sub-agent`) remain valid and must not be removed.

### Hook/config installers

Retained installers:

- `configurators/claude.ts` -> Claude commands, skills, agents, shared hooks, settings, optional statusline.
- `configurators/codex.ts` -> `.agents/skills`, `.codex/skills`, agents, hooks/config.

Retired installer removal means:

- No new retired config/settings/hook files are written.
- No retired platform templates are collected on update.
- Frozen exact paths and structured scrub descriptors still identify old writes for uninstall.

### Current shared-path ownership

`.agents/skills` remains current because Codex uses it. Historical Gemini overlap must not demote it to cleanup-only:

- `PLATFORM_MANAGED_DIRS` still includes `.agents/skills` through Codex.
- Codex collector output is current ownership.
- `manifest-prune` test at `test/utils/manifest-prune.test.ts:198-210` pins shared Gemini/Codex path retention when only Codex is current.
- Current template paths must override historical `safe-file-delete` entries (`test/commands/update-internals.test.ts:424-440`).

`AGENTS.md` remains current marker-owned root file. C04 must not remove or convert it to whole-file deletion.

## Verification

1. Build from clean output:

```bash
pnpm --filter @mindfoldhq/trellis build
```

2. Confirm only retained host roots plus common roots exist under `dist/templates`.
3. Confirm no retired configurator modules compile into `dist/configurators`.
4. Inspect package payload:

```bash
pnpm --dir packages/cli pack --dry-run
```

5. Compile Python templates without writing bytecode:

```bash
uv run python - <<'PY'
from pathlib import Path
roots = [
    Path('packages/cli/src/templates/shared-hooks'),
    Path('packages/cli/src/templates/trellis/scripts'),
]
for root in roots:
    for path in root.rglob('*.py'):
        compile(path.read_text(encoding='utf-8'), str(path), 'exec')
print('ok')
PY
```

6. Search built/source active surfaces for retired IDs, excluding explicit compatibility locations (`legacy/`, migrations, compatibility tests, Mem/Channel C10 surfaces). Every remaining hit needs classification.

## Caveats / Not Found

- No host-specific active shell installer found.
- `copy-templates.js` needs no behavior change; source deletion is enough.
- Old retired installations may receive updated common `.trellis/scripts` with Claude/Codex-only runtime behavior during `trellis update`. That is consistent with host retirement. Cleanup safety comes from C03 inventory, not continued runtime support.

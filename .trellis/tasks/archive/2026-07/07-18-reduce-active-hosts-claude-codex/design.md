# Design — Claude Code and Codex active-host boundary

## Boundary

C04 narrows current host support without weakening C03 cleanup compatibility.

```text
active registry
  -> init flags and choices
  -> current host detection
  -> current configurators and template collection
  -> generated runtime host tables
  -> packaged active assets

legacy cleanup inventory
  -> exact historical manifest keys
  -> structured scrub dispatch
  -> backup and confirmed-empty cleanup roots
  -> frozen compatibility tests

migration manifests
  -> historical rename/delete/safe-delete ownership and hashes
```

Only first branch shrinks. Legacy cleanup inventory and migration manifests remain authoritative compatibility data.

## Active host model

Retained IDs:

```ts
type AITool = "claude-code" | "codex";
type CliFlag = "claude" | "codex";
type TemplateDir = "claude" | "codex";
```

Registry-derived behavior must remain exhaustive. `AI_TOOLS`, `PLATFORM_IDS`, `PLATFORM_FUNCTIONS`, init choices, flag resolution, configured-platform detection, and current template collection derive from these two entries instead of maintaining parallel retired lists.

Active managed roots:

```text
.claude
.codex
.agents/skills
```

Detection roots:

```text
.claude -> claude-code
.codex  -> codex
```

`.agents/skills` is current Codex output but not sufficient detection because Gemini historically emitted overlapping files there.

## Init contract

```text
trellis init -y
  -> Claude Code only

trellis init -y --codex
  -> Codex only

trellis init -y --claude --codex
  -> both
```

Explicit host flags suppress the default. Interactive and re-init choices show only retained hosts. Removed flags remain unregistered Commander options, so parsing fails before filesystem work.

`--with-statusline` remains Claude-only. Workflow defaults and generated layout stay unchanged until C05.

## Current versus legacy ownership

`PLATFORM_MANAGED_DIRS` contains only active roots. `LEGACY_CLEANUP_MANAGED_ROOTS` remains imported from C03. `ALL_MANAGED_DIRS` remains their union plus `.trellis` for backup and confirmed-empty cleanup.

Ownership precedence:

1. Protected `.trellis/research/**` data.
2. Current Claude/Codex exact output.
3. Validated retired exact-path manifest ownership.
4. Migration-owned exact path/hash.
5. User-owned or unknown content.

Root membership never authorizes deletion. Current template collection must continue to override historical safe-delete entries.

## Retired implementation removal

Remove current support in coordinated layers:

1. Retired TypeScript registry entries and CLI branches.
2. Retired configurator modules and direct imports.
3. Retired physical template roots and retired-only template helpers.
4. Retired direct update behavior, including Copilot instruction generation/merge.
5. Retired generated Python platform values, detection branches, adapter tables, task seeding, and help text.
6. Retired shared-hook distribution and Cursor-only shell context hook.
7. Dedicated active retired-host tests.
8. Packaged output from every deleted source/template root.

Do not retain hidden install support through raw assets after registry deletion.

## Snapshot transition

C03 extraction tests currently compare frozen retired path groups with live retired collectors. Those collectors disappear in C04. Before deletion, convert the gate to static compatibility assertions:

- schema version and source version;
- exact ordered 17 retired IDs;
- per-host frozen path counts;
- 1,009 globally unique safe exact paths;
- frozen cleanup managed-root sequence;
- explicit `.trae/settings.json` descriptor outside generated snapshot;
- no Claude/Codex IDs or active configurator dependency.

Snapshot bytes and C03 facade behavior remain unchanged.

## Generated runtime boundary

Generated Python copied into user projects must reject retired platform names and auto-detect only `.claude`/`.codex`. Any parallel platform constants in `cli_adapter.py`, `task_store.py`, `active_task.py`, `git_context.py`, or `workflow_phase.py` must converge on retained values.

Shared hooks distribute only to Claude/Codex destinations. Claude Research Dispatch validation and Codex modes are preserved; C04 changes host enumeration, not research execution semantics.

## Update and uninstall data flow

```text
configured current hosts
  -> collect only Claude/Codex templates
  -> build current known manifest keys
  -> union C03 exact retired keys and migration keys
  -> preserve current-wins collision guards
  -> plan update/uninstall
  -> backup current + legacy cleanup roots
  -> execute C02 ownership-safe operations
```

`getConfiguredPlatforms` is HIGH upstream impact because it feeds init/re-init, update, uninstall, manifest pruning, and Codex upgrade checks. Registry edits must be reviewed and tested as one cross-command change.

## Validation matrix

| Condition | Required result |
|---|---|
| No host flag with `-y` | Claude only |
| Explicit Codex flag | Codex only; no `.claude` |
| Both retained flags | Both hosts configured |
| Removed flag | Unknown option before writes |
| Only `.agents/skills` exists | No active host detected |
| Retired root exists | No active host detected |
| Exact retired manifest key exists | Retained as cleanup candidate |
| Unknown retired-root descendant exists | Never claimed or deleted |
| Retired path overlaps current Codex output | Current ownership wins |
| Frozen retired file hash matches | Safe cleanup remains available |
| Frozen retired file modified/malformed | Preserve content |
| Path is under `.trellis/research` | Protect from update/uninstall |
| Package built | No retired active module/template payload |

## Compatibility and rollback

- No research ledger, projection, Dispatch, Result, Proposal, or Claim contract changes.
- No migration manifest/history rewrite.
- No destructive data migration.
- No replacement of C03 cleanup inventory with active retired registry entries.
- Rollback reverts C04 as one coherent host-surface change while leaving C01-C03 intact.
- If retained assets are missing, restore only Claude/Codex imports/assets; never restore retired registry entries as a shortcut.

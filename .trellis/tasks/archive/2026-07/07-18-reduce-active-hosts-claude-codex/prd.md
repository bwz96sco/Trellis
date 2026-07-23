# Reduce active hosts to Claude Code and Codex

## Goal

Make Claude Code and Codex the only current install, detection, update-generation, runtime-template, and packaged host integrations while retaining C03 cleanup-only compatibility for all 17 retired hosts.

## Requirements

- Current host types, registries, configurator dispatch, detection, init choices, and template collection contain exactly `claude-code` and `codex`.
- `trellis init --help` exposes only `--claude`, `--codex`, and retained Claude-only `--with-statusline` among host options.
- Removed host flags are unknown options and fail before project files are written.
- Non-interactive `trellis init -y` installs Claude Code only unless explicit host flags are supplied.
- Explicit Codex-only init installs `.codex` and `.agents/skills` without `.claude`; explicit Claude + Codex init installs both.
- Active managed roots are exactly `.claude`, `.codex`, and `.agents/skills`.
- Active detection uses `.claude` and `.codex`; `.agents/skills` alone and every retired-host root must not identify a current host.
- Remove active configurators, CLI branches, template collectors, physical template trees, shared-hook branches, generated Python branches, and package assets for the 17 retired hosts.
- Remove active Copilot-specific update generation and merge behavior.
- Preserve C03 legacy cleanup inventory, migration manifests and historical hashes, structured scrubbers, alias roots, frozen 0.6.7 fixtures, and exact-path ownership rules.
- Current Claude/Codex ownership wins for shared paths, especially Codex-owned `.agents/skills/**` and marker-owned `AGENTS.md`.
- Retired root membership remains valid only for backup and confirmed-empty cleanup; it never proves file ownership.
- Generated Python host validation, detection, adapter tables, task seeding, and shared-hook distribution support only Claude Code and Codex.
- Preserve Claude Research hook behavior and existing Codex dispatch modes.
- Remove active retired-host tests, but keep every migration, cleanup, frozen-fixture, modified-file, user-data, and Research-protection regression.
- Replace C03 collector-to-snapshot drift assertions before deleting retired collectors; retain static snapshot order, cardinality, path-safety, and root-integrity assertions.
- Built output and package dry-run contain no retired active configurator modules or retired template roots.
- Do not change default workflow/layout to Research in this child.
- Do not remove Channel, Mem, workflow switching, Task links, generic templates, or generic core exports in this child.
- Do not modify `docs-site`, `marketplace`, migration history, or unrelated dirty files.
- Create no commit unless explicitly requested.

## Acceptance Criteria

- [x] `AITool`, `CliFlag`, `TemplateDir`, `AI_TOOLS`, `PLATFORM_IDS`, and `PLATFORM_FUNCTIONS` represent exactly Claude Code and Codex.
- [x] Active managed roots equal `.claude`, `.codex`, `.agents/skills`; `ALL_MANAGED_DIRS` still includes C03 cleanup-only roots.
- [x] `.claude` detects Claude Code; `.codex` detects Codex; `.agents/skills` alone and retired roots detect nothing current.
- [x] Init help contains only retained host flags; a removed flag such as `--cursor` exits as unknown before writes.
- [x] `init -y` installs Claude only; explicit Codex-only and explicit dual-host init produce expected roots.
- [x] All 17 retired configurator modules and 14 retired physical template roots are absent from current source/package output.
- [x] Active Copilot update generation and merge behavior are absent.
- [x] Generated Python and shared-hook host tables accept only Claude Code and Codex; Cursor-only hook assets are absent.
- [x] C03 inventory remains exactly 17 ordered retired IDs and 1,009 unique exact generated paths with frozen cleanup roots.
- [x] Current Codex `.agents/skills/**` survives manifest pruning and historical safe-delete collisions.
- [x] Frozen 0.6.7 uninstall cleans pristine owned retired files while preserving modified, malformed, unknown, and user-owned content.
- [x] Normal update/uninstall continues to protect `.trellis/research/**`.
- [x] Focused init/update/prune/uninstall/configurator/template compatibility tests pass together.
- [x] CLI typecheck, lint, full tests, build, Python parse/static gates, package audit, and `git diff --check` pass.
- [x] GitNexus change detection reports only expected init, detection, update collection, manifest current-key, generated Python, and shared-hook flow changes.
- [x] No C05/C10/later product-surface work or unrelated repository changes are included.

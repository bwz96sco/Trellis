# Extract retired host cleanup inventory

## Goal

Separate retired-host cleanup knowledge from current platform support before deleting configurators and templates.

## Requirements

- Freeze cleanup-only metadata for the 17 hosts that C04 will retire: Cursor, OpenCode, Kilo, Kiro, Gemini, Antigravity, Devin, Qoder, CodeBuddy, Copilot, Droid, Pi, Reasonix, ZCode, Trae, OMP, and Grok.
- Store exact generated paths, not recursive ownership globs. The extraction baseline contains 1,009 unique current retired-host paths.
- Keep the active host registry, CLI flags, configurators, and template trees unchanged in C03. This child extracts and wires cleanup knowledge only.
- Keep migration manifests and their `allowed_hashes` canonical. Do not duplicate migration path/hash history into the new inventory.
- Preserve cleanup knowledge for historical aliases/layouts not fully represented by current collectors: `.iflow/**`, `.windsurf/**`, `.zcode/cli/agents/**`, and `.trae/settings.json`.
- Expose cleanup-only managed roots for update backup and confirmed-empty directory removal without making retired hosts detectable, configurable, installable, or current.
- Add exact structured-file descriptors for retired mixed-ownership files. Preserve malformed and unrelated user content.
- Treat legacy `.trae/settings.json` as nested mixed hook config and scrub only exact Trellis hook entries.
- Add a ZCode-specific scrubber for `.zcode/config.json`; preserve unrelated fields/events and preserve malformed input byte-for-byte.
- Supplement structured hook matching with explicit known legacy Trellis hook command paths where representative C01 fixtures do not contain the referenced hook script in their minimal manifest.
- Current Claude/Codex ownership wins over retired cleanup metadata, especially the Gemini/Codex overlap under `.agents/skills/**` and any current template that collides with a historical safe-delete path.
- Never scan retired roots to claim untracked files. A retired generated path becomes a cleanup candidate only through validated manifest ownership or existing migration ownership gates.
- Keep cleanup inventory available through the 0.7 compatibility line. Removing it requires a separate future migration/major-release decision.
- Preserve `.trellis/research/**`, modified files, unknown files, user-owned files, dry-run/cancellation zero-write behavior, and confirmation-time revalidation from C02.
- Do not modify `docs-site`, `marketplace`, core research code, active host registry/types, host configurators/templates, or migration manifests in this child.

## Acceptance Criteria

- [x] Inventory exports exactly 17 retired IDs; Claude Code and Codex are absent.
- [x] Frozen generated-path inventory contains exactly 1,009 unique paths and matches current retired collectors at the extraction baseline.
- [x] No inventory entry uses wildcard or recursive-root ownership to authorize file deletion.
- [x] Manifest pruning keeps exact retired generated keys after a simulated Claude/Codex-only active registry, while unknown descendants remain pruned and untouched.
- [x] Current Claude/Codex template paths override retired inventory and historical safe-delete entries.
- [x] Update backup and empty-root cleanup use current roots plus cleanup-only retired/alias roots without changing active platform detection.
- [x] C01 representative retired-host files remain safely cleanable after active-registry shrink simulation.
- [x] `.trae/settings.json` removes exact Trellis hook entries while preserving user fields; malformed content remains byte-identical.
- [x] `.zcode/config.json` removes exact Trellis hook registration while preserving user fields/events; malformed content remains byte-identical.
- [x] Retired mixed files remain scrubbed by exact path-specific rules independent of active host detection.
- [x] Shared `.agents/skills/**`, `AGENTS.md`, and other current collisions remain current-owned.
- [x] `.iflow`, `.windsurf`, and legacy ZCode layouts retain migration/backup/cleanup coverage without claiming untracked user content.
- [x] Dry-run, cancellation, modified-file, malformed-file, unknown-key, and confirmation-time revalidation guarantees remain unchanged.
- [x] Focused and full CLI tests, lint, Python analysis, typecheck, build, workspace typecheck, and `git diff --check` pass.
- [x] GitNexus change detection completed; aggregate MEDIUM result is explained by unrelated dirty-worktree files, with no unexplained C03 scope.
- [x] No commit is created unless explicitly requested.

## Notes

- C01 compatibility fixtures and C02 ownership safety are prerequisites and are archived under `.trellis/tasks/archive/2026-07/`.
- Research evidence is stored in this task's `research/` directory.

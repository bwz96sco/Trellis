# Freeze current-host generic cleanup ownership

## Goal

Freeze exact Claude Code, Codex, root, and generic `.trellis` generated-file ownership before Child B narrows collectors. Enable safe future deletion of pristine generic assets without deleting modified/user-owned content or canonical Research state.

## Requirements

### Frozen ownership

- Add collector-independent exact-path inventory with schema version and `0.6.7` provenance.
- Classify every current Claude and Codex collector path as retiring opaque, transition-sensitive opaque, structured mixed, or retained Research.
- Classify optional Claude statusline separately.
- Classify every current generated `.trellis/scripts` and `.trellis/agents` path.
- Inventory uses exact POSIX-relative file paths only; no directory prefixes, wildcards, traversal, backslashes, or absolute paths.
- Unknown descendants remain unowned.
- Retained Research workers, nine stage skills per host, and `.trellis/research/**` are explicit exclusions.

### Cleanup authority

- Add first unreleased 0.7 migration manifest with exact hash-backed `safe-file-delete` operations for proven released opaque bytes.
- Use frozen local v0.6.7 fixture/hash evidence; never label dirty current-source hashes as released.
- Every destructive operation has nonempty proven normalized SHA-256 evidence.
- Fixture gaps and pre-release-only paths remain non-destructive inventory entries unless separate provenance is recorded.
- Published migration manifests remain unchanged.
- Structured mixed files have no whole-file safe-delete operation.
- Active current-template paths continue overriding historical delete operations until Child B retires them.

### Manifest pruning

- Frozen exact cleanup paths remain recognized when scripts, agents, or platform collectors later emit nothing.
- Recognition must not make arbitrary descendants owned.
- Pruning with `persist: false` remains zero-write.
- Invalid, poisoned, or protected manifest entries remain fail-closed.

### Existing safety contracts

- Known pristine bytes may delete only through existing migration execution.
- Modified, malformed, unknown, missing, or user-owned files survive.
- `.claude/settings.json`, `.codex/hooks.json`, `.codex/config.toml`, and `AGENTS.md` remain structured scrub targets only.
- `.trellis/research/**` is protected before filesystem access.
- Cleanup is idempotent and removes directories only when confirmed empty.
- Existing C02 uninstall and C03 retired-host behavior remains unchanged.

## Constraints

- Do not narrow active collectors or generation.
- Do not rewrite hooks/workflow/config/statusline.
- Do not unregister Channel, Mem, Workflow, or Research Task commands.
- Do not delete generic source/templates/tests/specs.
- Do not change migration schema/loader, update/uninstall executors, core exports, or Research data.
- Do not fetch published artifacts through ad hoc network access.
- Do not modify `docs-site` or `marketplace`.
- No automatic Git commit.

## Acceptance Criteria

- [ ] Frozen JSON inventory and typed cleanup-only facade exist.
- [ ] All 62 Claude and 63 Codex collector outputs are classified with no overlap or gap.
- [ ] Optional Claude statusline and all 30 current generic `.trellis` outputs are classified.
- [ ] Inventory rejects unsafe paths, duplicates, unsorted arrays, overlaps, and Research targets.
- [ ] New 0.7 manifest contains only exact proven safe-file-delete operations.
- [ ] Published v0.6.7 fixture evidence reproduces every admitted released hash.
- [ ] Pre-release-only paths are not mislabeled as published.
- [ ] Structured and retained Research paths have no destructive operation.
- [ ] `buildKnownKeys()` recognizes frozen paths without active collectors.
- [ ] Unknown descendants remain prunable/unowned.
- [ ] Active template precedence suppresses future cleanup until retirement.
- [ ] Pristine files delete; modified/malformed/unknown files survive in focused integration tests.
- [ ] Structured scrub and `.trellis/research/**` protection tests remain passing.
- [ ] Update/uninstall cleanup is idempotent and directory removal is empty-only.
- [ ] Child A changes no collector, command registration, active template, core export, or canonical Research state.
- [ ] Focused tests, lint, typecheck, build, and `git diff --check` pass.
- [ ] Independent `trellis-check` reports no unresolved blocker.
- [ ] Task archives with `--no-commit` before Child B starts.

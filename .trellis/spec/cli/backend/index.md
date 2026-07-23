# Backend Development Guidelines

> Best practices for backend development in this project.

---

## Overview

This directory documents the executable contracts for the Research-only CLI, its published package, and historical compatibility behavior. Active product surfaces and compatibility-only SDK/data surfaces must remain separate.

---

## Active Product Surface Contract

### 1. Scope / Trigger

Apply this contract whenever root command registration, `trellis research` registration, `init` options, generated payloads, package contents, or historical cleanup compatibility changes.

### 2. Signatures

```text
trellis init|update|upgrade|uninstall|research

trellis research
  init|status|validate|rebuild|repo|quest|campaign|run|evidence|claim|dispatch

trellis research dispatch
  context|prepare|record-result|apply|reject
```

Retained `init` options are exactly `--claude`, `--codex`, `--with-statusline`, `--yes`, `--force`, and `--skip-existing`.

### 3. Contracts

- `trellis` and `tl` execute the same built Commander parser.
- `channel`, `mem`, `workflow`, and `research task` have no active CLI registration.
- `--user`, `--monorepo`, `--no-monorepo`, `--template`, `--registry`, `--overwrite`, and `--append` are unregistered.
- Current generation is Research-only and uses exact Research asset APIs.
- Historical cleanup data and 0.7 core compatibility exports do not create active CLI commands.
- Source, clean `dist`, and the packed npm tarball must all omit generic command implementations and generic template payloads.

### 4. Validation & Error Matrix

| Input or artifact | Required result |
|---|---|
| Removed root command | Commander unknown-command failure before action callbacks or writes. |
| Removed `research task` subtree | Commander unknown-command failure before Research mutation or writes. |
| Removed `init` option | Commander unknown-option failure before `init()` or writes. |
| Retained command/option | Parses through the one supported command tree. |
| Generic source/dist/tar entry | Package audit fails and names the forbidden entry. |
| Missing required Research/compatibility tar entry | Package audit fails and names the missing entry. |

### 5. Good / Base / Bad Cases

- **Good**: both aliases expose the exact command sets above, init writes only the selected Research payload, and a clean packed artifact passes positive and negative inventory checks.
- **Base**: historical manifests, workflow metadata, and core Channel/Mem/Task exports remain readable without any CLI registration.
- **Bad**: a stale `dist` file, broad template collector, compatibility export, or cleanup descriptor makes a retired command or generic asset active again.

### 6. Tests Required

- Exact root, Research, and Dispatch command-set assertions.
- Unknown command/option tests with byte-identical temporary filesystem snapshots.
- Built `trellis`/`tl` parity.
- Exact Research payload path and configure/collect byte parity.
- Clean build plus packed tarball required/forbidden inventory audit.
- Core root/subpath export compatibility through 0.7.

### 7. Wrong vs Correct

```text
Wrong: keep a retired option registered and reject it inside init().
Correct: omit the option from Commander so parsing fails before init() runs.

Wrong: infer package contents from collector output or source inspection.
Correct: clean-build, pack, list normalized tar entries, and audit required and forbidden paths.
```

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization, file layout, design decisions | Done |
| [Script Conventions](./script-conventions.md) | Python script standards for .trellis/scripts/ | Done |
| [Error Handling](./error-handling.md) | Error types, handling strategies | Done |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Done |
| [Logging Guidelines](./logging-guidelines.md) | Structured logging, log levels | Done |
| [Migrations](./migrations.md) | Version migration system for template files | Done |
| [Filesystem Safety](./filesystem-safety.md) | Atomic writes (temp+rename / `os.replace`), path/name chokepoint validation, destructive-op ownership & backup gates, dogfood twin sync | Done |
| [Release Process](./release-process.md) | CI-only publishing, package versioning, release tracks, manifest continuity, submodule ordering | Done |
| [Trellis Core SDK](./trellis-core-sdk.md) | `@mindfoldhq/trellis-core` / CLI package boundary, public exports, build and versioning contracts | Done |
| [Platform Integration](./platform-integration.md) | Exact Claude Code/Codex registry, Research payload, hook/config matrix, and cleanup-only historical hosts | Done |
| [Workflow-State Contract](./workflow-state-contract.md) | Strict Research selection, ledger-head orientation, sequence watermark, and historical native compatibility | Done |
| [Configurator Shared Helpers](./configurator-shared.md) | Retained Python/placeholder renderers and canonical Research configure/collect byte parity | Done |
| [`trellis upgrade` Command](./commands-upgrade.md) | Global CLI self-upgrade wrapper: channel inference, npm invocation, failure behavior | Done |
| [`trellis update` Command](./commands-update.md) | Research desired-state reconciliation, workflow digest compatibility, cleanup safety, and idempotency | Done |
| [`trellis uninstall` Command](./commands-uninstall.md) | Exact-key ownership release, structured scrubbing, and Research/user-data preservation | Done |
| [Uninstall Scrubbers](./uninstall-scrubbers.md) | Pure compatibility scrubbers for exact mixed-ownership config paths | Done |
| [`trellis research` Command](./commands-research.md) | Deterministic research workspace inspection, validation, projection recovery, and Quest/Campaign/Run/Evidence/Claim lifecycle mutations | Done |
| [Research Worker Skills and Claude Hooks](./research-worker-hooks.md) | Stage-owner skills, bounded worker cards, compact research session state, sequence watermark, and explicit Claude Dispatch validation | Done |
---

## Pre-Development Checklist

Before writing backend code, read the relevant guidelines based on your task:

- Error handling → [error-handling.md](./error-handling.md)
- Logging → [logging-guidelines.md](./logging-guidelines.md)
- Editing the exact Claude Code/Codex registry or payload → [platform-integration.md](./platform-integration.md)
- Modifying `init.ts`, current host selection, fresh/full layout, or host-addition behavior → [platform-integration.md](./platform-integration.md) + [directory-structure.md](./directory-structure.md)
- Script work → [script-conventions.md](./script-conventions.md)
- Migration system → [migrations.md](./migrations.md)
- Writing/deleting/moving/overwriting files in a user repo (any `writeFileSync`, `rmSync`, `renameSync`, `shutil.move`, or user/agent-supplied path segment) → [filesystem-safety.md](./filesystem-safety.md)
- Cutting a release / cross-branch submodule coordination / manifest continuity / npm publishing → [release-process.md](./release-process.md)
- Editing `packages/core/**`, moving reusable CLI logic into core, or changing CLI imports from `@mindfoldhq/trellis-core` → [trellis-core-sdk.md](./trellis-core-sdk.md)
- Adding any native (`.node` / C++ / `node-gyp`) dependency → [quality-guidelines.md "Native dependency policy"](./quality-guidelines.md)
- Editing Research workflow selection, ledger-head orientation, sequence watermarking, or historical native recognition → [workflow-state-contract.md](./workflow-state-contract.md)
- Editing `configurators/shared.ts` or the exact Research payload resolver → [configurator-shared.md](./configurator-shared.md) + [platform-integration.md](./platform-integration.md)
- Editing `commands/upgrade.ts` (global CLI self-upgrade behavior) → [commands-upgrade.md](./commands-upgrade.md)
- Editing `commands/update.ts` or historical workflow recognition → [commands-update.md](./commands-update.md) — manifest mechanics still live in [migrations.md](./migrations.md)
- Editing `commands/uninstall.ts` or `utils/uninstall-scrubbers.ts` → [commands-uninstall.md](./commands-uninstall.md) + [uninstall-scrubbers.md](./uninstall-scrubbers.md)
- Editing core Channel/Mem/Task compatibility APIs without adding active CLI commands → [trellis-core-sdk.md](./trellis-core-sdk.md)
- Editing `commands/research/**` or root research command registration/output behavior → [commands-research.md](./commands-research.md) + [trellis-core-sdk.md](./trellis-core-sdk.md)
- Editing research stage-owner skills, worker cards, SessionStart research orientation, Claude sequence watermarking, or explicit research Dispatch injection → [research-worker-hooks.md](./research-worker-hooks.md)

Also read [unit-test/conventions.md](../unit-test/conventions.md) — specifically the "When to Write Tests" section.

---

## Quality Check

After writing code, verify against these guidelines:

1. Run `git diff --name-only` to see what you changed
2. Read the relevant guidelines above for each changed area
3. Always check [quality-guidelines.md](./quality-guidelines.md)
4. Check if tests need to be added or updated:
   - New pure function → needs unit test
   - Bug fix → needs regression test
   - Changed init/update behavior → needs integration test update
5. Run lint and typecheck:
   ```bash
   pnpm lint && pnpm typecheck
   ```

---

**Language**: All documentation should be written in **English**.

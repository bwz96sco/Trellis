# C10 Rehearse migration and close parent integration

## Goal

Rehearse clean installs, historical upgrade/uninstall safety, Procedure host contracts, and packed/installed package gates so the parent Research Skill → Procedure migration can close at 10/10.

## Predecessor gates

- C08: generation stopped; fail-closed retirement evidence active.
- C09: stage Skill source removed; packed inventory inverted.

## Requirements

1. Installed-package smoke from real packed Core/CLI tarballs (no workspace resolution).
2. Fresh Claude/Codex/dual installs generate no stage Skills and keep workers.
3. Historical stage Skills are preserved on update; uninstall defers without deletion authority.
4. Existing host adapter / approval-consumption lifecycle remains green.
5. Specs and parent acceptance reflect final Procedure-only Skill-free contract.
6. No archive/commit/push of parent or children without separate authorization.

## Acceptance Criteria

- [x] `release-preflight smoke-installed-cli` exercises packed install + aliases + Skill-free inits.
- [x] Closeout integration covers Skill-free installs, update dry-run, historical preserve, uninstall deferral, idempotent update.
- [x] Full Core/CLI tests, lint, typecheck pass (pending final suite in this session).
- [x] Packed/installed smoke green under C09 inventory rules (`smoke-installed-cli` test).
- [x] Parent child list remains C01–C10; C10 is the final integration child.
- [x] No edits to AGENTS.md / CLAUDE.md / docs-site / marketplace.

## Non-Goals

- No publishing to npm.
- No archive of C08/C09/C10/parent without separate instruction.
- No inventing immutable deletion hashes.

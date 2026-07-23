# Make Research the sole workflow

## Goal

Make bundled Research the only workflow installed by fresh `trellis init`, produce a minimal Research-oriented bridge layout, and migrate only proven-pristine native workflow installations to Research without claiming modified or user-owned content.

## Requirements

- Fresh/full initialization always installs bundled Research workflow bytes.
- Fresh initialization writes bundled Research selection metadata and a matching managed workflow hash only after active bytes are confirmed.
- Remove `trellis init --workflow` and `trellis init --workflow-source`; both must fail as unknown options before writes.
- Retain `trellis workflow`, native/marketplace resolver compatibility, Channel, Mem, and generic source inventory until C10.
- Fresh init keeps required scripts/config/hash/version, root `AGENTS.md`, and selected Claude/Codex assets.
- Fresh init must not create `.trellis/agents`, `.trellis/workspace`, `.trellis/tasks`, `.trellis/spec`, `.trellis/.developer`, developer journals, bootstrap Tasks, or joiner Tasks.
- Canonical `.trellis/research/**` remains lazily created by `trellis research init` or first Research mutation; fresh init must not invent workspace identity or mutate Research state.
- Normal existing-project re-init may add retained hosts but must not replace or claim custom workflow content.
- Existing workflow migration occurs through `trellis update`, not normal re-init.
- Valid native selection is auto-migrated only when active bytes exactly match bundled native or match stored managed hash.
- Missing selection is auto-migrated only when bytes exactly match bundled native or a matching managed hash is bounded to a pre-workflow-switch installed version.
- Invalid selection metadata blocks automatic ownership inference.
- Modified native, custom, ambiguous, missing, unsafe, or user-owned workflow content is preserved by default.
- Dry-run/cancellation write nothing. Backup must succeed before mutation.
- Workflow bytes must be re-read before apply; confirmation-time changes are preserved.
- Research selection/hash transfer occurs only after successful active Research write and verification.
- Skip, create-new, concurrent-change, and failure outcomes keep active ownership metadata unchanged.
- Repeated successful update is a no-op with no workflow backup churn.
- Workflow installation/migration must not read, copy, hash, move, rewrite, or delete `.trellis/research/**`.
- Claude-only, Codex-only, and dual-host init all use the same Research workflow contract.
- Do not remove generic command/source/package surfaces assigned to C10.
- Do not modify `docs-site`, `marketplace`, C03 cleanup data, migration history, core Research semantics, or unrelated dirty files.
- Create no commit unless explicitly requested.

## Acceptance Criteria

- [x] Built and source init help omit `--workflow` and `--workflow-source`; either option fails before filesystem writes.
- [x] Default Claude-only, explicit Codex-only, and dual-host fresh init write bundled Research bytes, Research selection, and matching hash.
- [x] Fresh layout omits generic agents/workspace/tasks/spec/developer/bootstrap/joiner artifacts while retaining required bridge and host assets.
- [x] Fresh init does not create canonical `.trellis/research/**`.
- [x] Normal host-addition re-init preserves custom workflow bytes and does not claim hash/selection.
- [x] Force/skip-existing behavior remains explicit, tested, and ownership-safe.
- [x] Native and marketplace workflow resolution remains available only for workflow-command/legacy compatibility.
- [x] Proven pristine native update migrates bytes, hash, and selection to Research.
- [x] Missing-metadata migration uses exact native or version-bounded legacy evidence only.
- [x] Modified/custom/invalid/ambiguous/unsafe workflow states remain preserved unless explicit overwrite succeeds.
- [x] Skip/create-new/failure/concurrent-change outcomes never pre-transfer Research ownership.
- [x] Successful migration is idempotent and canonical Research state remains byte-identical.
- [x] Existing C02/C03 protected-path, cleanup, modified-file, and user-content regressions remain green.
- [x] Focused workflow/init/update/research/uninstall suites pass.
- [x] CLI typecheck, lint, full tests, build, built-init smoke, package audit, and `git diff --check` pass.
- [x] GitNexus change detection contains only expected init/layout/workflow/update/test/spec flows.
- [x] No C10/later product removal or unrelated repository changes are included.

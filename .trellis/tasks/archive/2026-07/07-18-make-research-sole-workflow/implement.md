# Implementation — Research as sole fresh workflow

## Prepare

- [x] Confirm C04 archived and Claude/Codex host tests remain green.
- [x] Run GitNexus impact before every existing function/class/method edit; warn before any newly reported HIGH/CRITICAL edit.
- [x] Preserve C02/C03 Research/user-data protection and cleanup compatibility.
- [x] Keep C10 product removal, docs-site, marketplace, core exports, and unrelated dirty files out of scope.

Expected production scope:

- `packages/cli/src/cli/index.ts`
- `packages/cli/src/commands/init.ts`
- `packages/cli/src/configurators/workflow.ts`
- `packages/cli/src/commands/update.ts`
- `packages/cli/src/utils/workflow-selection.ts` only if a minimal compatibility helper is required
- `packages/cli/src/utils/workflow-resolver.ts` only for fresh-init versus compatibility boundary
- generated bridge/dogfood files only if fresh-layout runtime requires synchronized changes

## Tests first

- [x] Pin default Research bytes, selection, hash, and no-fetch behavior for Claude-only, Codex-only, and dual-host init.
- [x] Pin exact fresh-layout absence of agents/workspace/tasks/spec/developer/bootstrap/joiner artifacts.
- [x] Add parser-level unknown-option/zero-write tests for `--workflow` and `--workflow-source`.
- [x] Pin normal host-addition re-init preservation of custom workflow bytes/hash/selection.
- [x] Pin force and skip-existing ownership behavior under Research default.
- [x] Pin full re-init idempotency including file contents and metadata.
- [x] Adapt workflow-command compatibility tests without removing C10-owned command coverage.
- [x] Add update classifier/migration tests for pristine native, modified native, missing/invalid metadata, custom ownership, conflict actions, idempotency, and Research-state preservation.

## Fresh init

- [x] Remove Commander registration and `InitOptions` handling for workflow/workflow-source init selection.
- [x] Resolve bundled Research only for fresh/full init; no marketplace fetch.
- [x] Persist Research selection only when active bytes are managed Research.
- [x] Add explicit Research layout mode to workflow structure generation.
- [x] Stop fresh generation of `.trellis/agents`, workspace, tasks, spec, developer state, bootstrap Task, and joiner Task.
- [x] Retain required scripts/config/hash/version/root AGENTS and selected Claude/Codex assets.
- [x] Keep canonical `.trellis/research` lazy until explicit Research initialization.

## Update migration

- [x] Add pure/state-driven workflow ownership classifier with focused unit coverage.
- [x] Keep native ID readable for legacy selection and workflow command compatibility.
- [x] Migrate valid native selection only with exact native bytes or matching managed hash.
- [x] Migrate missing selection only with exact native bytes or version-bounded pre-switch matching hash.
- [x] Repair active Research bytes with missing/native metadata safely.
- [x] Preserve invalid, modified, custom, missing, non-regular, and ambiguous states.
- [x] Re-read workflow before mutation and preserve confirmation-time changes.
- [x] Transfer Research hash/selection only after successful active Research write.
- [x] Keep skip/create-new/failure metadata unchanged.
- [x] Ensure repeat update is no-op and canonical Research state remains byte-identical.

## Specs and review

- [x] Update `commands-workflow.md`, `commands-update.md`, `directory-structure.md`, and `platform-integration.md` with seven-section executable contracts.
- [x] Review workflow-state, filesystem-safety, migrations, commands-research, and core research-state specs for consistency; edit only where contract changed.
- [x] Run independent `trellis-check`; fix only verified C05 defects.
- [x] Confirm no C10 source/product deletion or C04 host regression.

## Verification

Focused tests:

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/init.integration.test.ts \
  test/cli/init-options.integration.test.ts \
  test/commands/workflow.integration.test.ts \
  test/commands/update.integration.test.ts \
  test/commands/research-workflow.integration.test.ts \
  test/commands/update-internals.test.ts \
  test/utils/workflow-resolver.test.ts \
  test/utils/workflow-selection.test.ts \
  test/utils/template-hash.test.ts \
  test/utils/manifest-prune.test.ts \
  test/commands/uninstall.integration.test.ts
```

Full gates:

```bash
pnpm --filter @mindfoldhq/trellis typecheck
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis build
git diff --check
```

Built/package gates:

- [x] Built help omits workflow selection flags.
- [x] Removed flags fail before writes.
- [x] Built Claude-only, Codex-only, and dual-host fresh init produce Research/minimal layout.
- [x] Pack contains Research workflow plus retained bridge compatibility assets and no cache/source artifacts.
- [x] Run GitNexus detect-changes and explain every affected flow.
- [x] Create no commit unless explicitly requested.

## Rollback

Revert C05 source/test/spec changes as one unit. Keep C01-C04 compatibility and host narrowing intact. Restore workflow bytes, selection, hashes, and version from one backup snapshot; never touch `.trellis/research/**`.

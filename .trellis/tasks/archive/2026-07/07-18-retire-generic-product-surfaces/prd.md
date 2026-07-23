# Retire generic product surfaces

## Goal

Deliver a Research-only Trellis CLI and generated installation for Claude Code and Codex. Remove active Channel, Mem, workflow switching, Research Task links, and generic development assets without deleting user data or breaking the 0.7 core compatibility bridge.

## Child deliverables

1. `07-20-freeze-current-host-generic-cleanup`
   - Preserve exact ownership evidence and safe cleanup behavior before collectors disappear.
2. `07-20-make-generated-installation-research-only`
   - Stop fresh/update generation of generic assets and narrow mixed files to Research-only behavior.
3. `07-20-remove-active-generic-cli-payload`
   - Remove active commands and caller-free source/templates/tests/specs; prove final CLI/package surface.

Children execute in this order. Parent owns combined requirements and final integration gate.

## Requirements

### Current CLI

- Top-level product commands are exactly `init`, `update`, `upgrade`, `uninstall`, and `research`.
- Remove registration/help/execution for `channel`, `mem`, and `workflow`.
- Remove `research task link`, `research task unlink`, and the `research task` subtree.
- Unknown retired commands fail before filesystem writes.
- Research command behavior outside Task links remains unchanged.

### Research-only installation

- Fresh/re-init/update output supports only Claude Code and Codex.
- Keep bounded Claude/Codex `trellis-research-worker` assets.
- Keep exactly nine bundled Research stage skills.
- Stop installing generic implement/check/research agents, generic commands/skills, Channel/Mem/meta/spec skills, generic spec packs, workspace, Tasks, developer state, and generic `.trellis/scripts`.
- Research workflow, host hooks/config, root managed instructions, config, gitignore, and Claude statusline contain only active Research behavior.
- Keep `--with-statusline` Claude-only only with Research-oriented output.
- Stop generic spec registry, marketplace switching, monorepo spec, developer/workspace onboarding, bootstrap Task, and migration Task production.

### Safe existing-install retirement

- Freeze exact current-host generic generated paths and released hashes before removing active collectors.
- Delete only known pristine managed files.
- Preserve modified files, malformed mixed files, unknown descendants, and user-owned content.
- Scrub mixed Claude/Codex/root config structurally; preserve user fields and retained Research registrations.
- Cleanup is idempotent and directories are removed only when confirmed empty.
- `.trellis/research/**` is always protected.
- Historical `.trellis/tasks`, workspace, specs, Channel data, conversation data, and Task metadata remain inert unless an exact owned generated file is safely removable.

### Compatibility

- Schema-v1 Research events and projections remain readable and deterministic.
- Historical Dispatch `ownerSkill`, `provider`, and `taskRef` remain readable compatibility metadata.
- Existing `task.json.meta.research`, workflow selection/ownership metadata, and Research `current_run` remain readable.
- `@mindfoldhq/trellis-core/channel`, `/mem`, `/task`, `/research`, and `/testing` continue to resolve through 0.7.
- C10 must not remove generic core implementation or root compatibility symbols.
- Retired-host cleanup inventory and historical migration manifests remain cleanup-only and packaged.

### Product/package boundary

- Packed CLI excludes removed command source and generic templates.
- Packed CLI includes bounded workers, nine Research skills, migration manifests, and retired-host cleanup metadata.
- Production CLI source/build has no generic core-subpath imports after command removal.
- `docs-site` and `marketplace` remain untouched; C13/C14 own independent publication.
- No automatic Git commit.

## Acceptance Criteria

- [x] All three ordered child tasks archive successfully with `--no-commit`.
- [x] Root help exposes only five current product commands.
- [x] Research help exposes canonical children without `task`.
- [x] Retired commands fail without writes.
- [x] Fresh Claude and Codex installs contain only Research assets.
- [x] Fresh/update output contains no generic Task/workspace/spec/developer/script/agent/command/skill surface.
- [x] Known pristine historical generic files are removed safely.
- [x] Modified files, unknown descendants, mixed user fields, and historical user data survive.
- [x] `.trellis/research/**` remains byte-identical through update/uninstall compatibility tests.
- [x] C07/C09 Dispatch parity and schema-v1 compatibility remain passing.
- [x] Core Channel/Mem/Task compatibility imports and frozen export order remain passing.
- [x] Clean build and package audit contain no retired current-product payload.
- [x] Current code-specs describe Research-only CLI/generation and 0.7 compatibility boundary.
- [x] Full tests, lint, Python lint, typecheck, build, package checks, and `git diff --check` pass.
- [x] Independent integration review reports no unresolved blocker.

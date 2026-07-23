# Research: C05 tests, specs, and product boundary

- **Scope**: C05 planning
- **Date**: 2026-07-20

## Required behavior tests

### Init

Update `test/commands/init.integration.test.ts` to prove:

- default workflow bytes equal bundled Research;
- `.workflow.json` selects bundled Research;
- workflow hash matches active Research bytes;
- Claude-only default remains;
- Codex-only and dual-host output share same Research workflow;
- no workflow marketplace fetch occurs;
- force can replace active workflow with Research as explicit destructive mode;
- skip-existing preserves custom bytes and does not claim hash/selection;
- normal host-addition re-init preserves custom workflow ownership;
- full re-init is byte/file/metadata idempotent;
- fresh layout omits `.trellis/agents`, workspace, tasks, spec, developer, bootstrap, and joiner artifacts.

### CLI parser

Add parser-level coverage:

- help omits `--workflow` and `--workflow-source`;
- both removed flags fail as unknown options before action/filesystem writes;
- template/registry spec options and Claude/Codex host flags remain.

### Workflow command compatibility

Keep `test/commands/workflow.integration.test.ts` coverage for `trellis workflow` because removal belongs to C10. Remove or relocate only init-option cases. Establish native/custom states through workflow command or direct fixtures, not removed init flags.

### Update migration

Update `test/commands/update.integration.test.ts` for:

- valid native selection + pristine bytes/hash → Research;
- missing selection + exact current native bytes → Research;
- missing selection + version-bounded legacy matching hash → Research;
- selected/missing Research metadata repair;
- modified native follows conflict policy;
- invalid metadata blocks inference;
- custom/unowned workflow remains unchanged;
- skip/create-new/failure never pre-write Research selection;
- repeated successful migration is byte-stable and creates no backup churn;
- canonical Research state stays byte-identical.

### Existing safety gates

Retain and run:

- update protected-path internals;
- template-hash Research exclusions;
- manifest-prune Research preservation;
- uninstall Research preservation;
- workflow resolver/selection strictness;
- Claude/Codex configurator/template tests;
- research workflow integration tests using default init.

## Package/build contract

C05 package audit proves:

- bundled Research workflow exists in built/packed output;
- native workflow and generic source may remain for `trellis workflow` compatibility until C10;
- Claude and Codex templates remain;
- no Python cache or source artifacts leak;
- built CLI fresh init for Claude-only, Codex-only, and dual-host creates Research workflow.

Do not assert Channel/Mem/native/generic package source absence in C05.

## Specs

Required updates:

- `.trellis/spec/cli/backend/commands-workflow.md`
- `.trellis/spec/cli/backend/commands-update.md`
- `.trellis/spec/cli/backend/directory-structure.md`
- `.trellis/spec/cli/backend/platform-integration.md`

Consistency review:

- `.trellis/spec/cli/backend/workflow-state-contract.md`
- `.trellis/spec/cli/backend/filesystem-safety.md`
- `.trellis/spec/cli/backend/migrations.md`
- `.trellis/spec/cli/backend/commands-research.md`
- `.trellis/spec/core/backend/research-state.md`

## C05/C10 boundary

C05 stops fresh generation of root Task/workspace/spec/developer scaffolding but does not delete underlying generic package source unless a direct C05 caller becomes dead. C10 removes current workflow command, Channel, Mem, generic commands/agents/skills/scripts, Task links, and later package inventory.

C05 retains:

- strict reader support for legacy native selection;
- native/marketplace resolver for workflow command and migration compatibility;
- workflow command registration/tests;
- Channel/Mem code and templates;
- generic core exports;
- historical migrations and cleanup evidence.

## Minimal validation

```text
init.integration.test.ts
parser-level init options suite
workflow.integration.test.ts
update.integration.test.ts
research-workflow.integration.test.ts
update-internals.test.ts
workflow-resolver.test.ts
workflow-selection.test.ts
template-hash.test.ts
manifest-prune.test.ts
uninstall.integration.test.ts
Claude/Codex template and configurator tests
CLI typecheck/lint/full tests/build
built-output init smoke
pack dry-run and template membership audit
git diff --check
GitNexus detect-changes
```

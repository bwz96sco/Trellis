# Generic CLI surface map

## Remove as active product

Top-level registration in `packages/cli/src/cli/index.ts`:

- `trellis channel`
- `trellis mem`
- `trellis workflow`

Research registration in `packages/cli/src/commands/research/index.ts`:

- `trellis research task link`
- `trellis research task unlink`

Command-only source candidates:

- `packages/cli/src/commands/channel/**`
- `packages/cli/src/commands/mem.ts`
- `packages/cli/src/commands/workflow.ts`
- `packages/cli/src/commands/research/task.ts`

Caller checks are still required before deleting:

- `packages/cli/src/utils/workflow-resolver.ts`
- `packages/cli/src/utils/agent-refs.ts`
- `packages/cli/src/utils/task-json.ts`

## Post-removal command contract

Top-level product commands:

```text
init
update
upgrade
uninstall
research
```

Research children:

```text
init
status
validate
rebuild
repo
quest
campaign
run
evidence
claim
dispatch
```

Commander-generated `help` is not a product command.

Negative parser/help tests must prove absence of `channel`, `mem`, `workflow`, and `research task` before filesystem writes.

## Compatibility retained through 0.7

Do not remove:

- `@mindfoldhq/trellis-core/channel`
- `@mindfoldhq/trellis-core/mem`
- `@mindfoldhq/trellis-core/task`
- corresponding core implementation/tests;
- root compatibility symbols frozen by `core-package-exports.test.ts`.

C16 owns semver-major removal.

Preserve as inert/readable data:

- Channel logs/events;
- external conversation/session stores;
- `task.json.meta.research`;
- Dispatch `ownerSkill`, `provider`, and `taskRef`;
- Research `current_run` pointers;
- workflow ownership/selection metadata;
- historical migration manifests and legacy fixtures.

## Command-specific tests

Retire command-only Channel, Mem, Workflow, and Research Task-link suites. Keep broader Research workflow tests after removing only Task-link cases.

Add exact help and negative-command tests. Keep update/uninstall, workflow-classification, legacy installation, retired-host cleanup, C07/C09 parity, schema-v1, and core export compatibility suites.

## Safe order

1. Freeze negative CLI and compatibility tests.
2. Preserve cleanup ownership for installed/generated files.
3. Stop generation/update recreation.
4. Remove registrations.
5. Remove caller-free command implementation and helpers.
6. Audit packed payload and core export compatibility.

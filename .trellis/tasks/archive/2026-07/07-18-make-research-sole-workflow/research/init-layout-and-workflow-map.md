# Research: Fresh Research init layout and workflow map

- **Scope**: C05 planning
- **Date**: 2026-07-20

## Current flow

Fresh init currently:

1. Parses host, template, registry, workflow, and workflow-source options in `packages/cli/src/cli/index.ts`.
2. Defaults absent workflow selection to `NATIVE_WORKFLOW_ID` in `packages/cli/src/commands/init.ts`.
3. Resolves bundled or marketplace workflow through `utils/workflow-resolver.ts`.
4. Calls `createWorkflowStructure()` in `configurators/workflow.ts`.
5. Generates `.trellis/scripts`, workflow/config files, generic agents, workspace, tasks, and specs.
6. Configures Claude Code and/or Codex.
7. Initializes template hashes and bundled workflow selection metadata.
8. Runs developer initialization and may create bootstrap or joiner Tasks.
9. Creates root `AGENTS.md`.

Selecting Research today changes `workflow.md` only. Generic Task/workspace/spec scaffolding still appears.

## Current workflow contracts

Bundled workflow IDs remain:

```text
native
research
```

`.trellis/.workflow.json` is strict schema v1:

```json
{
  "schemaVersion": 1,
  "id": "research",
  "source": "bundled"
}
```

Template hashes prove managed bytes. Selection metadata identifies bundled variant. Neither signal alone proves both ownership and variant.

## Canonical Research state

Canonical `.trellis/research/**` is created lazily by Research mutations or `trellis research init`. Fresh workflow installation does not currently create it. Preserve this behavior: noninteractive init cannot invent workspace identity, and workflow installation must not rewrite ledger/projections.

## C05 fresh layout decision

Fresh current installation keeps:

- `.trellis/scripts/**` required by retained runtime during bridge release;
- `.trellis/workflow.md`, containing bundled Research workflow;
- `.trellis/.workflow.json`, selecting bundled Research;
- `.trellis/.template-hashes.json` and `.trellis/.version`;
- `.trellis/.gitignore` and `.trellis/config.yaml`;
- root `AGENTS.md`;
- selected Claude Code and/or Codex assets;
- Research worker contracts and stage-owner skills already installed through retained host configurators.

Fresh current installation stops creating:

- `.trellis/agents/**` generic Task agents;
- `.trellis/workspace/**`;
- `.trellis/tasks/**`;
- `.trellis/spec/**`;
- `.trellis/.developer` and developer workspace journals;
- bootstrap and joiner Tasks;
- native workflow bytes as active fresh workflow.

Canonical `.trellis/research/**` remains absent until explicit Research initialization.

## Re-init

Normal existing-project re-init must remain host-addition/developer-safe and must not replace or claim workflow bytes. Adding Codex to an existing custom workflow cannot turn it into managed Research.

Existing workflow migration belongs to `trellis update`, which already owns planning, confirmation, backup, conflict handling, and manifest updates.

## C05 versus C10

C05 owns:

- Research fresh default/sole init workflow;
- removal of init workflow-selection flags;
- fresh root layout suppression for Task/workspace/spec/developer/bootstrap outputs;
- safe native-to-Research update migration;
- retained Claude/Codex installation behavior.

C10 owns:

- removal of `trellis workflow`, Channel, and Mem commands;
- deletion of generic command/agent/skill/script source inventory;
- removal of generic core exports and compatibility products;
- package-source deletion beyond what fresh init stops emitting.

Therefore C05 may retain native and marketplace resolver source for the still-supported workflow command and migration compatibility even though fresh init cannot select them.

## GitNexus impact

Research impact results:

| Symbol | Risk |
|---|---|
| exact CLI `init` symbol | MEDIUM |
| `createWorkflowStructure` | LOW |
| `resolveWorkflowTemplate` | LOW |
| `collectSelectedWorkflowTemplate` | LOW |
| `createBootstrapTask` | LOW |
| `configurePlatform` | LOW |

No HIGH or CRITICAL symbol was reported. Exact UID is required for `init` because plain-name lookup is ambiguous with Channel adapters.

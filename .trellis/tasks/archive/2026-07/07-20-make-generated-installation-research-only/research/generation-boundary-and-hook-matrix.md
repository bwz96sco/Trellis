# Child B generation boundary and hook matrix

## Sources

Two independent read-only explorations mapped:

1. fresh init, re-init, workflow structure, update desired-state, ownership, and migration Task creation;
2. Claude/Codex collectors, configurators, mixed hooks, workers, stage skills, workflow/config/statusline, tests, and build boundary.

Both used source reads plus GitNexus queries/context/impact where available. No production file was modified during research. `docs-site` and `marketplace` were not inspected.

## Central invariant

Current generation and historical cleanup are separate authorities.

```text
active Research collector -> what init/update wants now
frozen cleanup inventory -> exact historical ownership after collectors narrow
migration allowed_hashes -> what pristine bytes may be deleted
```

Collector removal alone never authorizes deletion.

## Target base layout

```text
.trellis/.template-hashes.json
.trellis/.version
.trellis/workflow.md
.trellis/.workflow.json
.trellis/config.yaml
.trellis/.gitignore
AGENTS.md managed Research block
selected Claude/Codex Research assets
```

Fresh init does not create `.trellis/research`; Research commands create canonical state lazily.

Forbidden active generation:

```text
.trellis/scripts/**
.trellis/agents/**
.trellis/tasks/**
.trellis/workspace/**
.trellis/spec/**
.trellis/.developer
generic host commands/agents/skills
onboarding/joiner/migration Tasks
registry/spec/monorepo output
```

## Frozen hook matrix

| Host | File | Decision | Purpose |
|---|---|---|---|
| Claude | `.claude/hooks/session-start.py` | retain + rewrite | compact direct Research orientation |
| Claude | `.claude/hooks/inject-workflow-state.py` | retain + rewrite | strict Research ledger sequence watermark |
| Claude | `.claude/hooks/inject-subagent-context.py` | retain + reduce | C09 explicit worker/C07 preflight only |
| Claude | `.claude/hooks/statusline.py` | optional + rewrite | bounded Research status; no Task/developer state |
| Codex | `.codex/hooks/inject-workflow-state.py` | retain + rewrite/register | strict Research sequence watermark |
| Codex | `.codex/hooks/session-start.py` | retire from active generation | current file is generic and unregistered |

Codex worker self-runs C07 preflight. No Claude prompt-mutation adapter is generated for Codex.

## Exact retained opaque host assets

Per host:

- one `trellis-research-worker`;
- nine stage skills:
  - `trellis-research-audit`;
  - `trellis-research-computation`;
  - `trellis-research-experiment`;
  - `trellis-research-ideation`;
  - `trellis-research-literature`;
  - `trellis-research-quest`;
  - `trellis-research-setup`;
  - `trellis-research-theory`;
  - `trellis-research-writing`.

No generic `trellis-implement`, `trellis-check`, old `trellis-research`, start/continue/finish, Channel, meta, session-insight, or spec-bootstrap output.

## Current defects to remove

- `createWorkflowStructure()` copies scripts before layout check.
- Update independently adds all scripts and some legacy agents.
- Claude/Codex configure and collect paths enumerate broad generic payloads.
- Shared hooks import `.trellis/scripts/common` and expose Task/spec/workspace/developer state.
- Codex generates an unregistered generic session-start hook.
- Init retains registry/spec/monorepo/developer/joiner Task branches.
- Update refreshes registry specs and creates migration Tasks.
- Research workflow, `AGENTS.md`, config, gitignore, and statusline still mention generic product state.

## Likely symbol boundary

Existing symbols requiring fresh upstream impact before edit:

```text
commands/init.ts:
  init
  handleReinit
  createRootFiles

configurators/workflow.ts:
  createWorkflowStructure

configurators/index.ts:
  configurePlatform
  collectPlatformTemplates
  collectClaudeTemplates
  collectCodexTemplates

configurators/claude.ts:
  configureClaude

configurators/codex.ts:
  configureCodex

configurators/shared.ts:
  new Research-specific resolver integration only;
  avoid globally changing resolveBundledSkills

commands/update.ts:
  collectTemplateFiles
  buildAgentsMdTemplate
  update

shared hook registry:
  getSharedHookScriptsForPlatform or equivalent registry symbol
```

Exploration classified init/configurator/update/shared-hook boundaries as practical HIGH because they feed ownership, update/uninstall, or worker-security flows. Fresh GitNexus upstream checks before activation reported no HIGH/CRITICAL graph result:

| Symbol | Graph risk | Direct/important reach |
|---|---:|---|
| `init` | MEDIUM | CLI plus 11 init/update/uninstall/workflow integration consumers |
| `handleReinit` | LOW | direct caller `init`; same integration fan-out through it |
| `createWorkflowStructure` | LOW | direct caller `init`; same integration fan-out |
| `configurePlatform` | LOW | `init`, `handleReinit`, parity/regression tests |
| `collectPlatformTemplates` | MEDIUM | 8 direct callers; `buildKnownKeys`, update collection, upgrade detection, uninstall via pruning |
| `collectTemplateFiles` | LOW | direct caller `update`; CLI and integration consumers upstream |
| `update` | MEDIUM | CLI plus six workflow/update/research/over-delete integration consumers |
| `buildAgentsMdTemplate` | LOW | update collection process |
| `getSharedHookScriptsForPlatform` | LOW | shared-hook tests; registry-mediated runtime reach reviewed from source |
| `configureClaude`, `configureCodex`, `collectClaudeTemplates`, `collectCodexTemplates` | LOW/0 graph callers | invoked through registry tables; practical reach follows `configurePlatform`/`collectPlatformTemplates` |

GitNexus can under-report registry-mediated callers, so source-visible call paths remain part of review. New helper integrations and any additional existing symbol still require fresh impact immediately before edit.

## Keep unchanged unless a verified defect exists

```text
utils/template-hash.ts
utils/manifest-prune.ts
legacy/current-host-generic-cleanup.json
legacy/current-host-generic-cleanup.ts
migrations/manifests/0.7.0-beta.0.json
core public exports
```

## Key test separation

Tests must distinguish:

- source exists for compatibility until Child C;
- source is active generated output;
- historical path remains cleanup-recognized;
- exact released hash may authorize safe deletion.

Old collector-coupled Child A tests must change from `frozen inventory == active collector` to:

```text
active collector intersects no frozen retired opaque path
retained Research outputs remain active
all frozen keys remain known without collector output
historical safe-delete becomes eligible only after active ownership disappears
```

## Build boundary

`copy-templates.js` still recursively packages source templates during Child B. Therefore Child B proves only active init/update output is Research-only. Child C owns generic source deletion and packed-payload absence after a clean build.

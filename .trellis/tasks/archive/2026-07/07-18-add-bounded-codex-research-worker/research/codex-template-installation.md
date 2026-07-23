# Research: Codex Worker Template Installation

- **Scope**: C08 planning
- **Date**: 2026-07-20

## Required source

Add one package template:

```text
packages/cli/src/templates/codex/agents/trellis-research-worker.toml
```

Keep existing generic researcher unchanged through C10:

```text
packages/cli/src/templates/codex/agents/trellis-research.toml
```

Do not add a repository-local `.codex/agents` dogfood twin in C08. Product installation and temporary-init tests are sufficient; duplicate source risks drift.

## TOML structure

Use current Codex custom-agent form:

```toml
name = "trellis-research-worker"
description = "..."
sandbox_mode = "workspace-write"

developer_instructions = """
...
"""

[features]
multi_agent = false

[features.multi_agent_v2]
enabled = false
```

`workspace-write` is needed for declared outputs. Instructions restrict writes further to C07 `work.allowedWritePaths`.

## Automatic discovery and installation

No production TypeScript edit should be needed.

Automatic source discovery:

```text
getAllAgents
packages/cli/src/templates/codex/index.ts
```

Automatic install:

```text
configureCodex
packages/cli/src/configurators/codex.ts
```

Automatic update/hash collection:

```text
collectCodexTemplates
collectPlatformTemplates
packages/cli/src/configurators/index.ts
```

The collector and configurator read all sorted `.toml` agent templates. Installation target:

```text
.codex/agents/trellis-research-worker.toml
```

Ownership manifest key is the same portable path.

## Byte and hash contract

Install and collection both apply literal Python-command normalization. New worker contains no Python placeholder, so source and installed semantic bytes remain identical apart from standard normalization.

Manifest hash uses existing LF-normalized SHA-256. Do not add static hash or migration record.

Expected ownership behavior:

- fresh Codex init writes and claims worker;
- older managed Codex install receives genuinely new worker and hash on update;
- pre-existing unowned file at same path is preserved as conflict, never overwritten or claimed;
- later deletion of a previously hash-owned worker follows existing managed-file policy;
- repeated init/update is byte-idempotent.

## Task prelude boundary

Do not modify or route through:

```text
SubAgentType
detectSubAgentType
applyPullBasedPreludeToml
```

Generic Task prelude belongs only to `trellis-implement` and `trellis-check`. New Research worker owns dedicated C07 preflight in its TOML. Existing `trellis-research` keeps current behavior and `{TASK_DIR}/research/` semantics.

## Build and package

`copy-templates.js` recursively copies source templates into:

```text
packages/cli/dist/templates/codex/agents/trellis-research-worker.toml
```

Npm package includes `dist`; no script/package change and no committed generated `dist` file are needed.

Required payload gate:

```bash
pnpm --filter @mindfoldhq/trellis build
npm pack --dry-run --json
```

Tarball must include:

```text
package/dist/templates/codex/agents/trellis-research-worker.toml
```

## GitNexus

Preferred C08 change is template-only production addition, so no existing production symbol is edited.

If implementation unexpectedly changes code, run upstream impact before edits for:

```text
getAllAgents
configureCodex
collectCodexTemplates
collectPlatformTemplates
detectSubAgentType
applyPullBasedPreludeToml
collectTemplateFiles
analyzeChanges
getResearchDispatchContext
```

Current GitNexus query reported missing FTS indexes but symbol context confirms automatic `getAllAgents -> configureCodex/collectCodexTemplates` flow. C08 should consume that flow unchanged.

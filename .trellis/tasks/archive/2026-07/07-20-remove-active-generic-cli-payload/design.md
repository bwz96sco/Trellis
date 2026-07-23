# Design: Research-only CLI and packed payload

## 1. Boundary

Child C removes active generic CLI/package surfaces. It does not remove historical data, cleanup evidence, or generic core exports.

Keep four sets separate:

1. **Current Research surface** — supported commands and generated files.
2. **Published CLI payload** — compiled code and copied templates in the npm tarball.
3. **Historical ownership evidence** — exact cleanup keys, migration endpoints, released hashes, and strict workflow-selection metadata.
4. **Core compatibility bridge** — 0.7 public Channel/Mem/Task exports retained for external consumers.

Removing an item from sets 1 or 2 never grants deletion authority over an installed user file.

## 2. Parser contract

`packages/cli/src/cli/index.ts` owns one current command tree:

```text
trellis
├── init
├── update
├── upgrade
├── uninstall
└── research
    ├── init
    ├── status
    ├── validate
    ├── rebuild
    ├── repo
    ├── quest
    ├── campaign
    ├── run
    ├── evidence
    ├── claim
    └── dispatch
        ├── context
        ├── prepare
        ├── record-result
        ├── apply
        └── reject
```

Parser removal is the first enforcement boundary:

```text
unknown command/option -> Commander error -> no action callback -> no write
```

Tests use temporary directories containing sentinel files and assert byte-identical state after every removed command/option attempt. Both bin aliases exercise the same built parser.

## 3. Direct Research init

`init()` remains a public CLI package export, so parser removal alone is insufficient. Narrow its internal option type and execution graph to Research behavior:

1. validate retained host/write options;
2. detect fresh/re-init mode;
3. resolve selected Claude/Codex hosts;
4. resolve bundled Research workflow;
5. write minimal Research base files;
6. write exact host payload;
7. merge Research `AGENTS.md` block;
8. record actual managed hashes/version/selection only after verified writes.

Delete branches for developer setup, project type, monorepo, registry/spec install, generic Tasks, joiner onboarding, and marketplace workflow sources.

Re-init keeps existing conflict semantics and statusline ownership rules from Child B. It never uses historical cleanup metadata as overwrite permission.

## 4. Fixed Research workflow structure

`createWorkflowStructure(cwd, options)` becomes Research-only. Keep only fields needed for current callers, preferably an optional Research workflow byte override if update/init still share it.

Output:

```text
.trellis/workflow.md
.trellis/config.yaml
.trellis/.gitignore
```

No layout mode, project type, package list, spec generation, script copy, agent copy, workspace, or Task directory.

## 5. Explicit Research template APIs

Broad filesystem-derived APIs make accidental package content active. Replace them with exact APIs:

- exact nine Research skill bundle getter;
- exact Claude Research worker getter;
- exact Codex Research worker getter;
- exact shared hook getter by supported host;
- existing exact Claude settings/statusline and Codex hooks/config getters;
- exact Research workflow/config/gitignore/AGENTS template getters.

Missing required asset is a hard build/runtime error. Unexpected files beside approved templates are ignored and package-audit forbidden.

`collectResearchPlatformPayload()` remains canonical rendered output. `writeResearchPlatformPayload()` writes exactly that map. Existing placeholder and Python command normalization remain shared.

## 6. Historical workflow recognition

Active native workflow bytes currently remain only because update compares file content with a bundled native template. Replace this product payload dependency with inert evidence.

Add a legacy module containing:

- exact SHA-256 digest(s) for known released native workflow byte variants;
- source release/path provenance in comments or adjacent typed metadata;
- a pure exact-digest predicate.

Workflow migration evidence uses:

```ts
interface WorkflowMigrationEvidence {
  selection: "research" | "native" | "missing" | "invalid";
  currentBytes: string | null;
  storedHash?: string;
  installedVersion?: string;
  pathKind: "regular" | "missing" | "unsafe";
  researchBytes: string;
}
```

Classifier order remains fail-closed:

1. invalid selection -> invalid metadata;
2. missing/unsafe/null bytes -> missing or unsafe;
3. exact current Research bytes -> current Research;
4. exact legacy-native digest -> pristine native/research compatibility class according to strict selection;
5. exact stored hash + strict Research/native selection -> pristine managed class;
6. missing selection + exact stored hash + pre-switch installed version -> pristine native;
7. strict selection but hash mismatch -> modified managed;
8. otherwise -> custom user-owned.

`NATIVE_WORKFLOW_ID` remains accepted metadata only. `resolveBundledWorkflowTemplate()` resolves Research only. Marketplace listing/fetch/custom source logic disappears.

## 7. Manifest ownership after collector removal

`buildKnownKeys()` must not import generic scripts/agents. Current ownership comes from:

- exact Research base keys;
- exact selected Claude/Codex collector keys;
- marker-owned root `AGENTS.md` handling.

Historical recognition remains separate:

- `CURRENT_HOST_GENERIC_CLEANUP_PATHS` exact 137-path set;
- retired-host exact generated paths/structured descriptors;
- exact migration `from`/`to` endpoints;
- rename-dir prefixes already declared by migration manifests;
- protected Research path predicate;
- historical spec-registry read-only compatibility.

No root-prefix ownership is added. `buildKnownKeys()` supports manifest recognition only. Safe deletion still requires migration type and approved hash.

## 8. Physical source/package deletion

Delete source only after direct search and GitNexus show no retained caller.

Guaranteed product removals:

- Channel/Mem/Workflow command implementations;
- Research Task-link implementation;
- common generic commands/skills and non-Research bundled skills;
- generic Claude/Codex agents and Codex skills/session hook;
- Trellis scripts/agents/tasks/native workflow templates;
- markdown workspace/worktree/spec templates.

Conditional utility deletion:

- agent reference helpers;
- Task JSON helpers;
- template fetcher/extractor;
- project detector;
- registry config writer.

If update/uninstall compatibility still needs a reader, retain a small read-only module rather than active fetch/write behavior.

## 9. Package proof

Build must start from clean CLI `dist`. `verifyPackedCli()` performs:

1. `pnpm pack`;
2. tar entry listing/normalization;
3. required-entry checks;
4. forbidden-prefix/exact-entry checks;
5. existing packed package exact core dependency check.

Required examples:

```text
package/dist/templates/claude/agents/trellis-research-worker.md
package/dist/templates/codex/agents/trellis-research-worker.toml
package/dist/templates/common/bundled-skills/trellis-research-*/SKILL.md
package/dist/templates/shared-hooks/*.py
package/dist/templates/trellis/workflows/research/workflow.md
package/dist/legacy/current-host-generic-cleanup.json
package/dist/migrations/manifests/0.7.0-beta.0.json
```

Forbidden examples:

```text
package/dist/commands/channel/**
package/dist/commands/mem.js
package/dist/commands/workflow.js
package/dist/commands/research/task.js
package/dist/templates/common/commands/**
package/dist/templates/common/skills/**
package/dist/templates/common/bundled-skills/{trellis-channel,trellis-session-insight,trellis-spec-bootstrap,trellis-meta}/**
package/dist/templates/{claude,codex}/agents/trellis-{implement,check,research}.*
package/dist/templates/codex/skills/**
package/dist/templates/codex/hooks/session-start.py
package/dist/templates/trellis/{agents,scripts,tasks}/**
package/dist/templates/trellis/workflow.md
package/dist/templates/markdown/{spec,workspace-index.md,worktree.yaml.txt}/**
```

## 10. Test strategy

### Parser tests

- exact root/Research/Dispatch command sets;
- unknown command/option error codes;
- no callback and byte-identical fixture state;
- `trellis`/`tl` parity.

### Generation tests

- exact Claude/Codex/dual payloads;
- statusline off/on ownership;
- configure/collect two-way parity;
- direct Research-only init/re-init/update.

### Compatibility tests

- all workflow classifier branches;
- frozen cleanup cardinalities and exact keys;
- manifest unknown-descendant behavior;
- safe-delete released hash only;
- modified/malformed/user bytes survive;
- `.trellis/research/**` survives;
- schema-v1 and Dispatch metadata remain readable;
- core export subpaths resolve.

### Package tests

- clean `dist` inventory;
- packed tarball positive and negative assertions;
- exact CLI-to-core published dependency.

## 11. Code-spec boundary

Remove active Channel/Mem/Workflow command specs from CLI index. Preserve historical compatibility facts in migration, uninstall, core SDK, and workflow-state contracts.

Changed cross-layer contracts use seven sections:

1. Scope / Trigger;
2. Signatures;
3. Contracts;
4. Validation & Error Matrix;
5. Good/Base/Bad Cases;
6. Tests Required;
7. Wrong vs Correct.

## 12. Risk and rollback

Risk gates:

- parser deletion before source deletion;
- digest parity before native template deletion;
- explicit collector parity before broad template deletion;
- manifest/update/uninstall safety before compatibility helper deletion;
- clean package audit before archive.

Rollback uses targeted forward restoration only. Never reset inherited work or restore generic files by overwriting user-modified installed copies.

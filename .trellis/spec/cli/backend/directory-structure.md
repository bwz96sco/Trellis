# Directory Structure

> Executable source, generated layout, and published-payload boundaries for the Research-only CLI.

## 1. Scope / Trigger

Use this specification when changing:

- `packages/cli/src/cli/**` command registration;
- `packages/cli/src/commands/init.ts` or `configurators/workflow.ts`;
- current Claude Code or Codex configurators;
- template indexes or `scripts/copy-templates.js`;
- package `files`, build, or packed-tarball inventory;
- historical cleanup modules retained after generic source deletion.

Trellis is a TypeScript ES-module monorepo with two version-locked packages:

```text
packages/core/  @mindfoldhq/trellis-core
packages/cli/   @mindfoldhq/trellis
```

The CLI package is an active Research product. Core generic exports and CLI historical-cleanup data are compatibility surfaces, not active command or generation surfaces.

## 2. Signatures

### Active CLI source shape

```text
packages/cli/src/
├── cli/
│   ├── index.ts                  # one Commander tree
│   └── init-host-options.ts      # Claude/Codex/statusline only
├── commands/
│   ├── init.ts
│   ├── update.ts
│   ├── upgrade.ts
│   ├── uninstall.ts
│   └── research/
├── configurators/
│   ├── claude.ts
│   ├── codex.ts
│   ├── research-payload.ts       # canonical rendered host payload
│   ├── shared.ts                 # retained rendering primitives only
│   └── workflow.ts               # minimal Research structure
├── legacy/                       # immutable cleanup/digest evidence
├── migrations/
├── templates/
│   ├── claude/                   # exact Research worker/settings/statusline
│   ├── codex/                    # exact Research worker/hooks/config
│   ├── common/bundled-skills/    # nine dormant Research stage skills (C08; removed in C09)
│   ├── shared-hooks/             # approved Research hook matrix
│   ├── trellis/                  # Research config/gitignore/workflow
│   └── markdown/agents.md        # marker-managed AGENTS.md block
└── utils/
```

Generic command implementations and generic template roots are physically absent from active CLI source.

### Programmatic init

```ts
interface InitOptions {
  claude?: boolean;
  codex?: boolean;
  yes?: boolean;
  force?: boolean;
  skipExisting?: boolean;
  withStatusline?: boolean;
}

init(options: InitOptions): Promise<void>
createWorkflowStructure(cwd: string, workflowMd: string): Promise<void>
```

### Fresh/full generated base

```text
.trellis/workflow.md
.trellis/.workflow.json
.trellis/.template-hashes.json
.trellis/.version
.trellis/.gitignore
.trellis/config.yaml
AGENTS.md                         # managed block only
selected Claude/Codex Research payload
```

Canonical `.trellis/research/**` is lazy state created by Research commands, not by init.

## 3. Contracts

### Research-only execution graph

`init()` has no reachable branch for developer setup, project-type detection, monorepo generation, registry/spec download, generic Task creation, joiner onboarding, generic workflow layout, or marketplace/custom workflow selection.

`createWorkflowStructure()` writes only:

1. `.trellis/workflow.md` from exact bundled Research bytes;
2. `.trellis/.gitignore` from the Research template;
3. `.trellis/config.yaml` from the Research template.

It has no layout mode and never copies `.trellis/scripts/**`, agents, Tasks, workspace, or specs.

### Retained init options

The parser and programmatic type retain exactly:

```text
--claude
--codex
--with-statusline
--yes
--force
--skip-existing
```

The following are absent from Commander and `InitOptions`:

```text
--user
--monorepo
--no-monorepo
--template
--registry
--overwrite
--append
```

Removed inputs fail during Commander parsing before banner rendering, Python probing, prompts, command actions, or filesystem writes.

### Host and re-init behavior

- Non-interactive init with no explicit host defaults to Claude Code.
- Explicit `--claude`, `--codex`, or both overrides that default.
- Normal host-addition re-init writes only the missing exact Research payload and preserves active workflow bytes, hash, and selection metadata.
- Full/force init refreshes current Research-managed bytes and transfers workflow ownership only after exact Research byte verification.
- Optional Claude statusline remains opt-in or retained when already managed.
- Every flow preserves `.trellis/research/**` and unrelated user content in mixed files.

### Published payload boundary

`packages/cli/scripts/copy-templates.js` copies the narrowed `src/templates` tree only after a clean build. It must not reintroduce deleted generic directories through dogfood roots, broad discovery, stale `dist`, or an unindexed sibling file.

Required package proof is the packed tarball, not source presence, collector output, or a dirty `dist` listing. The tarball must contain current Research assets plus approved compatibility data and must reject generic command/template entries.

### Historical compatibility boundary

The CLI may retain:

- immutable native-workflow digest evidence with release/path provenance;
- frozen 137-path current-host generic cleanup inventory;
- frozen retired-host exact generated paths and structured descriptors;
- canonical migration manifests and released safe-delete hashes;
- strict workflow-selection parsing for historical `native` and current `research` IDs.

These modules recognize prior ownership. They do not generate files, register commands, resolve active native templates, or grant prefix-based deletion authority.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Removed init option | Commander unknown-option failure; no action or write. |
| Removed generic command source is imported | Typecheck/build failure; do not restore the source. |
| Required Research asset missing | Build/runtime/package audit fails closed. |
| Unexpected sibling beside approved templates | Ignored by exact getters and rejected when it matches forbidden package inventory. |
| Fresh/full init | Writes only the minimal base plus selected exact host payload. |
| Normal host addition | Adds only missing host payload; workflow bytes/hash/selection unchanged. |
| Existing malformed JSON/TOML or malformed AGENTS markers | Preserve bytes; do not replace with template defaults. |
| Existing canonical Research state | Preserve path set and bytes exactly. |
| Stale generic file remains in `dist` | Clean-build/tarball negative inventory fails. |
| Historical native bytes | Recognize only through an exact immutable digest, never active template bytes or fuzzy content. |

## 5. Good / Base / Bad Cases

- **Good**: a clean build contains the Research parser, exact Research templates, migration/cleanup evidence, and no generic commands or generic payload; dual-host init writes only the documented base and host files.
- **Base**: a project with only Claude configured adds Codex without changing workflow ownership or canonical Research state.
- **Bad**: retaining a generic source directory because it is “inactive,” scanning a template root to discover assets, accepting a removed option inside `init()`, or treating historical cleanup inventory as current output.

## 6. Tests Required

- Exact root parser, Research group, and Dispatch child sets.
- Removed command/option parse failures with zero action calls and byte-identical fixtures.
- `InitOptions` and direct `init()` Research-only behavior.
- Fresh Claude-only, Codex-only, dual-host, host-addition, force, skip-existing, and statusline cases.
- Exact generated path allowlists and configure/collect byte parity.
- No `.trellis/scripts`, generic agents/skills, Tasks, workspace, specs, developer, registry, or monorepo output.
- Canonical Research full-tree preservation.
- Clean `dist` and packed tarball positive/negative inventory.

## 7. Wrong vs Correct

### Parser boundary

```text
Wrong: register --registry and throw an unsupported-mode error inside init().
Correct: do not register --registry; Commander rejects it before init() runs.
```

### Workflow structure

```ts
// Wrong: a generic layout switch remains reachable.
createWorkflowStructure(cwd, { layout: options.layout ?? "legacy" });

// Correct: only exact Research workflow bytes enter the fixed writer.
createWorkflowStructure(cwd, researchWorkflow.content);
```

### Template activation

```text
Wrong: recursively discover every command, agent, skill, or directory under templates.
Correct: exact Research getters feed one canonical rendered payload map.
```

### Package proof

```text
Wrong: collector output contains no generic paths, therefore the npm package is clean.
Correct: clean-build, pack, normalize tar entries, require approved entries, and reject forbidden entries/prefixes.
```

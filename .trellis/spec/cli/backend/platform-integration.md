# Platform Integration Guide

> Exact current-host registry, Research payload, and historical-host compatibility boundary.

## 1. Scope / Trigger

Apply this contract to current platform types/registries, init host options, Claude/Codex configurators, Research asset getters, hook/config merging, generated runtime behavior, and retired-host cleanup evidence.

Current product support is exactly:

```ts
type AITool = "claude-code" | "codex";
type CliFlag = "claude" | "codex";
type TemplateDir = "common" | "claude" | "codex";
```

`AI_TOOLS`, `PLATFORM_IDS`, and `PLATFORM_FUNCTIONS` contain the same two IDs. No direct import, template branch, Python adapter, alias, cleanup descriptor, or core export may create a hidden active host.

### Frozen successor scope (not implemented in C01)

C07-C09 additionally trigger this spec when workers consume embedded Procedures, active Research Skill generation stops, Procedure/retirement evidence enters the payload, or packed host inventory changes.

## 2. Signatures

```ts
collectResearchPlatformPayload(
  platformId: AITool,
  cwd?: string,
  options?: PlatformConfigureOptions,
): Map<string, string>;

writeResearchPlatformPayload(
  platformId: AITool,
  cwd: string,
  options?: PlatformConfigureOptions,
): Promise<void>;
```

```ts
interface PlatformConfigureOptions {
  withStatusline?: boolean;
}
```

Active managed roots:

```text
.claude
.codex
.agents/skills
```

Detection roots are only `.claude` and `.codex`; `.agents/skills` is Codex output, not a detection signal.

Retained init host options:

```text
--claude
--codex
--with-statusline
```

### Frozen successor signatures (not implemented in C01)

Successor payload collection keeps the same collector/writer APIs while replacing the 18 generated Skill files with bundled versioned Procedure directories plus dedicated immutable Research Skill retirement evidence. Worker paths and host IDs stay unchanged.

## 3. Contracts

### Exact Research asset APIs

Current generation must resolve assets only through exact APIs:

- `getResearchStageSkillTemplates()` for the exact nine Research skill bundles;
- Claude `getResearchWorkerTemplate()`, `getSettingsTemplate()`, and `getStatuslineHook()`;
- Codex `getResearchWorkerTemplate()`, `getHooksConfig()`, and `getConfigTemplate()`;
- `getSharedHookScriptsForPlatform("claude" | "codex")` for the approved hook matrix;
- exact Research workflow/config/gitignore/AGENTS template exports.

Broad command, agent, skill, directory, or filesystem discovery is not an active generation API. Missing required assets fail closed; unexpected sibling files are ignored by generation and remain subject to package negative inventory.

### Canonical configure/collect parity

`collectResearchPlatformPayload()` is the one rendered output map. `writeResearchPlatformPayload()` iterates that exact map. Therefore, for the same `cwd`, host, options, and resolved Python command:

```text
configured paths == collected paths
configured bytes == collected bytes
```

Every path written by configure must be collected, and every collected path must be written. Historical cleanup inventory is never an input to the resolver.

### Exact current payload

Both hosts receive exactly one bounded worker and these nine stage skills:

```text
trellis-research-setup
trellis-research-quest
trellis-research-literature
trellis-research-ideation
trellis-research-experiment
trellis-research-computation
trellis-research-theory
trellis-research-audit
trellis-research-writing
```

Claude Code required paths:

```text
.claude/agents/trellis-research-worker.md
.claude/skills/<each-nine-stage-skill>/SKILL.md
.claude/hooks/session-start.py
.claude/hooks/inject-workflow-state.py
.claude/hooks/inject-subagent-context.py
.claude/settings.json
```

Optional, only when selected or already managed:

```text
.claude/hooks/statusline.py
```

Codex required paths:

```text
.codex/agents/trellis-research-worker.toml
.agents/skills/<each-nine-stage-skill>/SKILL.md
.codex/hooks/inject-workflow-state.py
.codex/hooks.json
.codex/config.toml
```

Codex does not generate SessionStart, `.codex/skills/**`, generic agents, or command-as-skill output. Shared `.agents/skills/**` bytes use neutral rendering.

### Structured merge behavior

- Claude settings register only the generated Research hooks and optional statusline while preserving unrelated fields/hooks.
- Codex hooks register only the generated Research sequence hook while preserving unrelated hooks.
- Codex config manages the `AGENTS.md` fallback line while preserving unrelated valid TOML.
- Malformed JSON/TOML remains byte-identical and is not replaced with defaults.
- Every registered Trellis hook has a generated file, and every generated current hook is registered.

### Generated runtime boundary

Generated hooks/workers are standalone Research adapters. They may read strict Research workflow/ledger state and bounded Dispatch context and may write only approved runtime watermark state under `.trellis/.runtime/**`. They must not depend on `.trellis/scripts/**`, active Tasks, specs, workspace, developer identity, Channel, Mem, generic agents, or monorepo state.

C07/C09 behavior remains unchanged:

- Claude uses exact-envelope C09 validation and direct C07 preflight.
- Codex runs bare `trellis research dispatch context` as its first process.
- Workers fail closed, use only selected capabilities, and never mutate canonical Research or Git history.

### Cleanup-only historical hosts

The retired compatibility IDs remain the frozen 17-host set:

```text
cursor, opencode, kilo, kiro, gemini, antigravity, devin, qoder,
codebuddy, copilot, droid, pi, reasonix, zcode, trae, omp, grok
```

The 0.6.7 snapshot contains exactly 1,009 globally unique safe generated paths. Current Claude/Codex generic cleanup remains a separate frozen 137-path inventory.

These inventories may support exact-key manifest recognition, path-specific scrubbing, backup preservation, and confirmed-empty root pruning. They must not widen active types/registries, register options, detect hosts, configure output, restore templates/adapters, or claim arbitrary descendants.

### Frozen successor contracts (not implemented in C01)

- Both current hosts keep one worker but receive no generated Research Skills after C08.
- Bundled Procedures are exact strict pairs selected through immutable capability bindings, not broad template discovery.
- Claude/Codex workers receive equivalent embedded-Procedure input and perform no Skill discovery/invocation.
- Normal update preserves project policy/overrides; retirement deletes only exact pristine released historical Skill bytes under separate evidence.
- C09 packed/source inventory forbids active `.claude/skills/trellis-research-*/**` and `.agents/skills/trellis-research-*/**` payload.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| `.claude` exists | Detect Claude Code. |
| `.codex` exists | Detect Codex. |
| Only `.agents/skills` exists | Detect no current platform. |
| Only retired host roots exist | Detect no current platform. |
| Removed host/init flag is supplied | Commander rejects it before action/write. |
| Required Research asset is absent | Fail closed; do not silently skip it. |
| Extra file exists beside approved template | Do not emit it through exact payload APIs. |
| Existing mixed config is valid | Merge exact Research fields and preserve unrelated content. |
| Existing mixed config is malformed | Preserve bytes and warn; do not replace. |
| Configure/collect map differs | Test/build failure; do not refresh hashes from divergent bytes. |
| Retired exact key is manifest-listed | May remain compatibility evidence. |
| Unknown descendant under retired/current root | Unowned; never infer ownership from the root. |

Successor matrix additions: a fresh/update payload containing any active Research Skill path fails after C08; missing/invalid Procedure inventory fails closed; modified historical Skill bytes are preserved; a pristine exact released match may be retired without touching workers, hooks, policy, overrides, or Research state.

## 5. Good / Base / Bad Cases

- **Good**: dual-host generation writes exactly two bounded workers, eighteen stage-skill copies, the approved hook/config matrix, optional Claude statusline when requested, and no generic payload.
- **Base**: a Claude-only repository adds Codex; only Codex payload paths are added and workflow ownership is unchanged.
- **Bad**: scanning `templates/common`, treating `.agents/skills` as detection, copying a retired host root, registering an old host flag, or using cleanup inventory as current collection.

### Frozen successor cases

- **Good**: fresh dual-host generation writes two generic workers and bundled Procedures, with zero Research Skill directories.
- **Base**: update preserves project policy/overrides and a modified historical Skill.
- **Bad**: broad directory discovery emits Skills or cleanup infers ownership from a `research-*` prefix.

## 6. Tests Required

- Exact two-host registry/type/flag/root assertions.
- Positive `.claude`/`.codex` detection and negative `.agents/skills`/retired-root detection.
- Retained init flags and removed-option zero-write parser tests.
- Claude-only, Codex-only, dual-host, host-addition, and optional-statusline path allowlists.
- Configure/collect path and byte parity for both hosts.
- Exact nine stage skills and one bounded worker per host.
- Exact hook generation/registration matrix and malformed mixed-config preservation.
- C07/C09 fail-closed and provider-neutral parity regressions.
- Frozen 137-path and 1,009-path cleanup integrity.
- Clean `dist` and packed-tarball negative inventory for retired hosts and generic payload.

Frozen successor tests additionally require exact Procedure payload pairs, no generated Research Skill paths after C08, configure/collect parity, project policy/override preservation, generic worker parity, dedicated retirement evidence, and clean packed negative Skill inventory.

## 7. Wrong vs Correct

### Asset selection

```text
Wrong: list a template directory and emit every discovered command, agent, or skill.
Correct: call the exact Research getters and build the canonical payload map.
```

### Detection

```text
Wrong: `.agents/skills` exists, therefore Codex is configured.
Correct: only `.codex` detects Codex; `.agents/skills` is output-only.
```

### Configure/collect

```text
Wrong: configure merges user config, while collect returns raw template bytes.
Correct: both paths call collectResearchPlatformPayload() and use identical rendered bytes.
```

### Historical compatibility

```text
Wrong: a path is below `.windsurf`, therefore Trellis owns it.
Correct: only an exact frozen key, exact structured descriptor, or canonical migration evidence can recognize ownership.
```

### Frozen successor: Procedures, not Skills

```text
Wrong: keep generating Research Skills beside Procedures or let workers discover either root.
Correct: generate bundled Procedures plus generic workers, embed validated instructions in Context, and retire only exact pristine historical Skills.
```

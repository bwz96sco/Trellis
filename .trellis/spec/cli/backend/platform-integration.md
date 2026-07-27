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

## Scenario: Research Procedure dispatch cutover

### 1. Scope / Trigger

This scenario applies when collecting, installing, updating, building, or packing active Claude/Codex Research worker, Claude Dispatch hook, and generated Research workflow during C07. Task #63 hardens root-side C06 authority only: C07 adapter/worker/template bytes remain frozen. C08 retires installed historical Skills; C09 removes their source and packed payload.

### 2. Signatures

```ts
collectResearchPlatformPayload(platformId, cwd?, options?): Map<string, string>;
writeResearchPlatformPayload(platformId, cwd, options?): Promise<void>;
```

Active worker paths remain:

```text
.claude/agents/trellis-research-worker.md
.codex/agents/trellis-research-worker.toml
```

### 3. Contracts

- Existing collectors, output paths, structured config merging, ownership behavior, and configure/collect byte parity remain unchanged.
- Fresh Claude-only, Codex-only, and dual-host installs receive existing generic worker and successor hook/workflow bytes; Task #63 adds no generated asset, path, config key, or ownership hash.
- Pristine managed predecessor bytes still update only to established successor bytes; modified or user-owned worker/hook/workflow files remain preserved and reported by existing ownership rules.
- Root-side one-state/one-observation Context, staged binding precedence, snapshot-only dry-run, lockful commit, replay-before-clock/input, and hardened sidecar recovery do not alter platform payload bytes.
- `.trellis/research/**`, project policy, Procedure overrides, and user config remain byte-preserved except for explicit Research-domain mutations. Generic init/update never repairs output sidecars or creates lock/runtime/projection/cache state as part of Task #63.
- During C07, dormant stage Skill files remain in required payload and packed inventory, but active worker/hook/workflow bytes contain no Skill routing, invocation, inventory path, or `SKILL.md` load.
- Packed verification extracts active files from actual `.tgz` with `tar -xOf`; source, collector, or dirty-`dist` inspection is insufficient.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Required active worker/hook/workflow asset is missing | Fail collection/build/packed audit closed. |
| Configure/collect path or byte maps differ | Test failure naming divergence. |
| Task #63 changes any established adapter/worker/template/hook/workflow byte | Byte-conformance failure; revert host-surface drift. |
| Existing active file matches managed predecessor bytes | Update to established successor bytes and ownership hash only. |
| Existing active file is modified or user-owned | Preserve bytes and report conflict. |
| Active packed file contains request-file, Skill-routing, random-ID, or `--file` token | Packed active-content audit fails. |
| Dormant Research Skill path exists during C07 | Remains required; do not globally reject it. |
| Init/update creates Research lock/runtime/projection/cache or changes canonical state | Preservation failure. |

### 5. Good / Base / Bad Cases

- **Good**: root-side remediation passes while source, collected, installed, built, and packed host bytes remain identical to established C07 successor bytes.
- **Base**: host addition installs only missing established host payload while preserving Research state and modified user files.
- **Bad**: edit template prose for remediation, add adapter recovery logic, regenerate ownership hashes without byte need, scan only source bytes, or delete dormant Skill payload assigned to C08/C09.

### 6. Tests Required

- Exact source/configure/collect/install/build/pack path and byte parity for both hosts before and after Task #63.
- Fresh Claude-only, Codex-only, dual-host, host-addition, and update propagation assertions.
- Pristine managed update plus modified/user-owned preservation/reporting.
- Full `.trellis/research/**` preservation across init/update, including absence of new lock/runtime/projection/cache files.
- Clean build, real pack, exact active-file extraction, positive successor content, forbidden-token mutations, and retained dormant Skill inventory.
- Root-side remediation tests live outside payload generation and prove no host asset fixture/ownership hash changes.

### 7. Wrong vs Correct

```text
Wrong: update worker/template wording so hosts explain new root-side validation and recovery.
Correct: keep host bytes frozen; root Context/recording own remediation.

Wrong: infer packed byte stability from source or collector output.
Correct: pack package, extract each active file from .tgz, compare exact established bytes.
```

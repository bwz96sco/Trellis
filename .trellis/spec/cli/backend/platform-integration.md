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

interface CodexWorkerModelKeys {
  model?: string;
  model_reasoning_effort?: string;
}

extractCodexWorkerModelKeys(existingContent: string): CodexWorkerModelKeys;
applyCodexWorkerModelKeys(
  freshContent: string,
  preserved: CodexWorkerModelKeys,
): string;
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

Both hosts receive exactly one bounded worker and zero generated Research stage Skill directories. Workers consume only digest-bound Procedures embedded by validated Context; they do not discover or load Skills from disk.

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
- Codex worker generation emits no live model selection by default. When an existing `.codex/agents/trellis-research-worker.toml` contains top-level, uncommented string values for `model` or `model_reasoning_effort`, collection copies only those values into the fresh one-worker template immediately after `sandbox_mode`.
- Model-key extraction ignores comments and key-shaped text inside multiline `developer_instructions`; preserved values are TOML-escaped on insertion. It does not add defaults, route models, emit another agent, or enable multi-agent execution.
- Malformed JSON/TOML config remains byte-identical and is not replaced with defaults.
- Every registered Trellis hook has a generated file, and every generated current hook is registered.
- Canonical shared Research hook templates and retained root `.claude/hooks/**` /
  `.codex/hooks/**` copies are byte-identical. Windows hooks reconfigure
  `stdin`, `stdout`, and `stderr` as UTF-8 before reading or emitting JSON.

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

### C08 generation / retirement contracts (active)

- Both current hosts keep one worker and receive **no** generated Research stage Skills.
- Fresh Claude-only, Codex-only, and dual-host collection must emit zero `.claude/skills/trellis-research-*/**` and `.agents/skills/trellis-research-*/**` paths.
- C09 removed stage Skill **source** templates under `templates/common/bundled-skills/trellis-research-*` and forbids those paths in packed CLI inventory.
- Package-internal retirement evidence (`legacy/research-skill-retirement.{json,ts}`) is required in the packed package and is never installed into user projects. With `authority=none`, deletion authority is empty (no invented hashes).
- Bundled Procedures remain exact strict pairs selected through immutable capability bindings, not broad template discovery.
- Claude/Codex workers receive equivalent embedded-Procedure input and perform no Skill discovery/invocation.
- Normal update preserves project policy/overrides; retirement deletes only exact pristine released historical Skill bytes under complete immutable evidence + matching migration `allowed_hashes`.

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
| Existing Codex worker has valid top-level `model` keys | Preserve only those values in the fresh one-worker template. |
| Model-shaped text is commented or inside multiline instructions | Ignore it; do not activate a model selection. |
| Fresh Codex worker has no user override | Emit hints only; no live `model` or `model_reasoning_effort`. |
| Canonical hook and retained root copy differ | Test/build failure; synchronize from canonical source before release. |
| Windows hook reads non-ASCII JSON stdin | Decode stdin as UTF-8; emit UTF-8 stdout/stderr. |
| Configure/collect map differs | Test/build failure; do not refresh hashes from divergent bytes. |
| Retired exact key is manifest-listed | May remain compatibility evidence. |
| Unknown descendant under retired/current root | Unowned; never infer ownership from the root. |

Successor matrix additions: a fresh/update payload containing any active Research Skill path fails after C08; missing/invalid Procedure inventory fails closed; modified historical Skill bytes are preserved; a pristine exact released match may be retired without touching workers, hooks, policy, overrides, or Research state.

## 5. Good / Base / Bad Cases

- **Good**: dual-host generation writes exactly two bounded workers, the approved hook/config matrix, optional Claude statusline when requested, zero stage Skill directories, and no generic payload. Existing top-level Codex worker model overrides survive in the fresh bounded worker.
- **Base**: a Claude-only repository adds Codex; only Codex payload paths are added, the fresh worker contains commented model hints but no live selection, and workflow ownership is unchanged.
- **Bad**: scanning `templates/common`, treating `.agents/skills` as detection, copying a retired host root, registering an old host flag, using cleanup inventory as current collection, or converting commented/instruction-contained model text into a live worker setting.

### C08 cases

- **Good**: fresh dual-host generation writes two generic workers and bundled Procedures, with zero Research stage Skill directories; package source and packed tarball contain no stage Skill bundles.
- **Base**: update preserves project policy/overrides and a modified historical Skill; uninstall defers owned stage Skills when retirement authority is `none`.
- **Bad**: inventing `allowed_hashes` from current source, or broad directory discovery emitting Skills, or cleanup inferring ownership from a `research-*` prefix.

## 6. Tests Required

- Exact two-host registry/type/flag/root assertions.
- Positive `.claude`/`.codex` detection and negative `.agents/skills`/retired-root detection.
- Retained init flags and removed-option zero-write parser tests.
- Claude-only, Codex-only, dual-host, host-addition, and optional-statusline path allowlists.
- Configure/collect path and byte parity for both hosts.
- Zero generated stage Skill directories and exactly one bounded worker per host.
- Codex worker extraction/insertion tests for top-level values, comments, multiline instructions, TOML escaping, no-default hints, and exact one-agent collection.
- Exact hook generation/registration matrix, canonical/root byte parity,
  all-stream Windows UTF-8 setup, and malformed mixed-config preservation.
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

### Codex worker model overrides

```text
Wrong: copy a full existing worker, activate commented model hints, or generate per-model agents.
Correct: render the fresh one-worker template and preserve only valid top-level uncommented `model` and `model_reasoning_effort` string values.
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

## Scenario: Package-internal C6 pilot Skills

### 1. Scope / Trigger

This scenario applies when building or packing the CLI after C6 adds four schema-v3 execution packages below `dist/templates/research/skills/`. These are package-internal resolver inputs, not host-installed `.claude/skills/**` or `.agents/skills/**` payload. Current platform detection, configure/collect output, retirement behavior, workers, hooks, and ownership hashes remain unchanged.

### 2. Signatures

```text
src/templates/research/skills/<id>/1.0.0/
  skill.json
  SKILL.md
  templates/<declared-member>  # model-context packages only

copy-templates:
  src/templates/** -> dist/templates/**

packed root:
  package/dist/templates/research/skills/<id>/1.0.0/**
```

Required IDs are exactly `research-literature`, `research-ideation`, `research-idea-evaluation`, and `research-quest-admin`, all at `1.0.0`.

### 3. Contracts

- Recursive template copying carries the four package trees byte-for-byte from source to clean `dist`; no new collector, host configurator, or installation branch is added.
- Packed required inventory names every package `skill.json`, every `SKILL.md`, and all three declared template members. This fixed production inventory is separate from historical `RESEARCH_STAGE_SKILLS` retirement data.
- Packed execution-package audit discovers every schema-v3 manifest in the actual tar listing, parses canonical manifest bytes, requires declared instruction/member entries, and authenticates member size and SHA-256.
- The three template members retain exact C1 bytes: note template 2,499 bytes, opportunity board 1,661 bytes, and attack template 1,293 bytes with their frozen manifest digests.
- No fifth `research-quest` package, source `agents/openai.yaml`, Python validator/helper, Quest reference pack, host-link metadata, or external source path ships in a C6 package.
- Package-internal Skills do not reintroduce generated stage Skill paths. Fresh/update platform payload still emits zero `.claude/skills/trellis-research-*` and `.agents/skills/trellis-research-*` entries.

### 4. Validation & Error Matrix

| Packed/build condition | Required result |
|---|---|
| Any required pilot `skill.json`, `SKILL.md`, or declared member is absent | Packed inventory audit fails and names the exact `package/dist/...` path. |
| Manifest bytes are noncanonical or schema-invalid | Execution-package audit fails before package acceptance. |
| Declared member is absent, oversized, unsafe, BOM/NUL-bearing where text is required, or digest-drifted | Execution-package audit fails and names the package/member reason. |
| Source tree exists but clean `dist` or real tarball omits it | Build/packed test failure; source inspection is insufficient. |
| Host payload starts installing the package-internal tree | Configure/collect allowlist failure; do not widen platform output. |
| Historical retired stage-Skill inventory is changed to represent C6 packages | Compatibility regression; keep inventories separate. |

### 5. Good / Base / Bad Cases

- **Good**: clean build recursively copies four authenticated package trees, real `pnpm pack` contains every required asset, dynamic audit reports four Skill manifests and three authenticated members, and host payload remains unchanged.
- **Base**: a project has no local package override, so runtime resolves the bundled tarball bytes without installing them into host Skill roots.
- **Bad**: rely on dirty `dist`, require only manifests but not instructions/members, reuse retired stage-Skill inventory, copy source helper packs, add `research-quest`, or emit C6 packages through platform configurators.

### 6. Tests Required

- Source production-root test authenticates exactly four IDs/versions and exact frozen member size/digest.
- Clean CLI build proves recursive source-to-`dist` package copy.
- Packed inventory unit tests require every one of the four manifests, four instructions, and three template members; omission tests name each exact packed path.
- Real tarball execution-package audit reports exactly four Skill manifests and three authenticated Skill members while retaining Procedure authentication and forbidden generic inventory checks.
- Actual `pnpm pack` verification runs after clean Core/CLI builds; source-only or stale-`dist` assertions do not satisfy release evidence.
- Existing Claude-only, Codex-only, dual-host, update, retirement, and packed active worker/hook parity tests remain green.

### 7. Wrong vs Correct

```text
Wrong: install package-internal pilot Skills into `.claude/skills` or `.agents/skills` so models can find them.
Correct: keep them under bundled execution-package templates and let the exact root resolver/Context embed approved bytes.

Wrong: audit only `skill.json` paths or inspect source after pack.
Correct: require manifest, instructions, and declared members, then authenticate all bytes extracted from the real `.tgz`.

Wrong: append the four IDs to retired host-stage Skill inventory.
Correct: maintain one separate immutable C6 package inventory for packed execution packages.
```

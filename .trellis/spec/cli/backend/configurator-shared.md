# Configurator Shared Helpers

> Retained cross-cutting rendering primitives for the exact Research payload.

## 1. Scope / Trigger

This specification covers `packages/cli/src/configurators/shared.ts` and its use by `configurators/research-payload.ts`.

`shared.ts` is no longer a generic command/agent/skill discovery or writing layer. Generic resolvers, frontmatter wrappers, pull-based Task preludes, bundled generic skill collection, broad write helpers, and retired-platform normalization are absent from the active source.

The sole generation authority is `collectResearchPlatformPayload()`, and the sole host write path is `writeResearchPlatformPayload()`.

## 2. Signatures

The retained public surface is:

```ts
interface PlatformConfigureOptions {
  withStatusline?: boolean;
}

setResolvedPythonCommand(cmd: string): void;
resetResolvedPythonCommand(): void;
getPythonCommandForPlatform(platform?: NodeJS.Platform): string;
replacePythonCommandLiterals(content: string): string;
resolvePlaceholders(content: string, context?: TemplateContext): string;
resolvePlaceholdersNeutral(content: string, context?: TemplateContext): string;
```

Canonical payload APIs:

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

## 3. Contracts

### Python command resolution

- Init probes one supported Python command and calls `setResolvedPythonCommand()`.
- `getPythonCommandForPlatform()` returns the cached command for normal production calls; its explicit platform parameter is test-only.
- `replacePythonCommandLiterals()` replaces literal `python3` line-by-line, excluding shebang lines.
- Replacement is idempotent when the resolved command is `python3`.
- Every final payload byte passes through the same replacement path before write and collection.

### Placeholder rendering

`resolvePlaceholders()` and `resolvePlaceholdersNeutral()` resolve:

```text
{{PYTHON_CMD}}
{{CMD_REF:name}}
{{EXECUTOR_AI}}
{{USER_ACTION_LABEL}}
{{CLI_FLAG}}
{{#AGENT_CAPABLE}}...{{/AGENT_CAPABLE}}
{{^AGENT_CAPABLE}}...{{/AGENT_CAPABLE}}
{{#HAS_HOOKS}}...{{/HAS_HOOKS}}
{{^HAS_HOOKS}}...{{/HAS_HOOKS}}
```

The normal renderer uses the host command prefix. The neutral renderer renders command references as `` `name` (Trellis command) `` and is mandatory for Codex-owned `.agents/skills/**` so destination bytes are host-neutral.

Removed generic templates are not an invitation to remove stable placeholder semantics needed by retained Research assets.

### Exact payload composition

`research-payload.ts` calls only exact Research getters:

- exact nine Research stage skill bundles;
- exact Claude/Codex bounded worker getters;
- exact approved shared hook getter by supported host;
- exact Claude settings/statusline and Codex hooks/config getters.

It does not call a broad `getCommandTemplates`, `getAllAgents`, `resolveSkills`, `resolveAllAsSkills`, directory scanner, or compatibility collector.

### Configure/collect byte parity

`writeResearchPlatformPayload()` writes the map returned by `collectResearchPlatformPayload()`. This is the load-bearing invariant:

```text
written keys == collected keys
written bytes == collected bytes
```

Project-aware structured merges receive the same `cwd` in both paths. Any Python normalization, placeholder substitution, neutral rendering, or config merge must occur before the map is returned.

### Mixed structured files

- Valid Claude/Codex config is merged narrowly with Research-owned fields.
- Unrelated user fields and hook entries survive.
- Malformed JSON/TOML remains byte-identical.
- Optional statusline appears only when requested or retained as managed state.

### Historical cleanup separation

Frozen cleanup paths and migration evidence never enter `shared.ts` or the active Research resolver. Leaving the current payload does not itself grant deletion authority; exact historical ownership plus released hash evidence remains required.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Resolved command is `python3` | Replacement is a byte-preserving no-op. |
| Non-shebang line contains literal `python3` | Replace with the resolved command. |
| Shebang contains `python3` | Preserve the shebang. |
| Renderer has no `TemplateContext` | Resolve Python only; leave host placeholders for callers that require context. |
| Codex shared skill rendering | Use neutral renderer. |
| Required exact Research asset is missing | Fail closed instead of omitting it. |
| Unexpected template sibling exists | Do not discover or emit it. |
| Existing JSON/TOML is malformed | Preserve bytes; do not synthesize defaults. |
| Write/collect keys or bytes differ | Test failure; do not update ownership from divergent output. |

## 5. Good / Base / Bad Cases

- **Good**: one project-aware Research map contains exact rendered worker, stage skills, hooks, and config; the writer emits that map unchanged.
- **Base**: no Claude statusline is requested, so neither the map nor writes include `statusline.py`.
- **Bad**: reintroducing generic helper discovery, applying platform-specific rendering to `.agents/skills/**`, writing a transformed string while collecting raw bytes, or using cleanup inventory as payload input.

## 6. Tests Required

- Python command cache, platform fallback, shebang exclusion, and idempotency.
- Placeholder and conditional rendering for normal and neutral paths.
- Exact nine Research skill names and exact worker/hook/config paths.
- Claude/Codex configure/collect key and byte parity in both directions.
- Optional statusline off/on behavior.
- User-field preservation and malformed JSON/TOML byte preservation.
- Negative assertions that generic resolver/helper exports and generic payload paths are absent.
- Clean package audit proving no broad generic template tree is copied.

## 7. Wrong vs Correct

### Discovery

```text
Wrong: list template directories and emit everything found.
Correct: call exact Research asset getters and enumerate only approved outputs.
```

### Byte parity

```ts
// Wrong
await writeFile(target, replacePythonCommandLiterals(template));
files.set(relativePath, template);

// Correct
const payload = collectResearchPlatformPayload(platformId, cwd, options);
for (const [relativePath, content] of payload) {
  await writeFile(path.join(cwd, relativePath), content);
}
```

### Shared destination

```text
Wrong: render `.agents/skills/**` with Codex-specific command references.
Correct: use resolvePlaceholdersNeutral() so shared destination bytes are stable.
```

### Compatibility

```text
Wrong: add a retired cleanup path to active collection so update can see it.
Correct: keep active collection exact; recognize historical ownership only in migration/prune/uninstall compatibility layers.
```

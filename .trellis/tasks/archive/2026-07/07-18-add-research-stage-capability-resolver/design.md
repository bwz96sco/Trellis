# Design — Core Research stage capability resolver

## Boundary

C06 adds one pure, additive domain module. It does not alter lifecycle, persistence, Dispatch schemas, CLI orchestration, or host hooks.

```text
QuestStage
  -> exhaustive core descriptor
  -> validated execution host
  -> canonical discovered skill names
  -> exact optional match or bundled fallback
  -> immutable resolution
```

Later children consume this result for Dispatch context and worker parity.

## Types

```ts
export type DispatchableQuestStage = Exclude<QuestStage, "complete">;
export type ResearchExecutionHost = "claude" | "codex";

export type ResearchCapability =
  | "research.setup"
  | "research.framing"
  | "research.literature"
  | "research.ideation"
  | "research.experiment"
  | "research.computation"
  | "research.theory"
  | "research.audit"
  | "research.writing";
```

Add exact unions for optional and bundled skill names.

## Descriptor table

`RESEARCH_STAGE_CAPABILITIES` is:

```ts
Readonly<Record<QuestStage, ResearchStageCapabilityDefinition>>
```

and includes an explicit `complete` entry with null capability/skills and `dispatchable: false`.

Use `satisfies` so adding a `QuestStage` breaks compilation until the table is updated.

## Host parsing

Export exact runtime host list and parser:

```ts
export const RESEARCH_EXECUTION_HOSTS = ["claude", "codex"] as const;
export function parseResearchExecutionHost(value: string): ResearchExecutionHost;
```

Reject blank, whitespace-only, case variants, installer ID `claude-code`, retired hosts, and arbitrary values. Use existing core validation-error idiom; no CLI dependency.

## Name normalization

```ts
export function normalizeDiscoveredResearchSkillNames(
  names: readonly string[],
): ReadonlySet<string>;
```

Contract:

- trim;
- remove empty;
- exact dedupe;
- case-sensitive;
- preserve only names, not bodies/paths;
- no slash/dollar/plugin/fuzzy normalization.

Return a fresh immutable-facing set; never mutate caller input.

## Resolution

```ts
export function resolveResearchStageCapability(
  input: ResolveResearchStageCapabilityInput,
): ResearchStageCapabilityResolution;
```

Algorithm:

1. Read exhaustive stage descriptor.
2. Validate/carry exact host.
3. Normalize discovered names.
4. If `complete`, return explicit non-dispatchable result.
5. If stage optional name exists in set, select it with `source: "host"`.
6. Otherwise select bundled fallback with `source: "bundled"`.

The result includes stage, host, capability, optional name, fallback name, selected name, source, and dispatchable flag.

## Compatibility

- `Dispatch.ownerSkill` remains arbitrary non-empty schema-v1 metadata.
- `Dispatch.taskRef` remains inert provenance metadata.
- Old events/files are not rewritten.
- No capability/resolution fields are persisted in Dispatch.
- Quest stage is the only routing authority.
- Historical generic owners never override stage or make `complete` dispatchable.

## Export boundary

Add module exports to `packages/core/src/research/index.ts` only. Existing `@mindfoldhq/trellis-core/research` subpath remains unchanged. Root barrel and package export map remain unchanged.

## Error/validation matrix

| Input | Result |
|---|---|
| valid active stage + exact optional name | host-selected resolution |
| valid active stage + no match | bundled fallback |
| duplicate/order-varied names | same deterministic result |
| whitespace entries | trimmed/dropped |
| case variant or `/name`/`$name` | no match; fallback |
| complete + any skills | non-dispatchable null result |
| invalid host | validation error before selection |
| arbitrary historical ownerSkill elsewhere | schema remains valid; resolver ignores it |

## Rollback

Delete the additive module, tests, and `/research` exports. No stored state, schema, migration, or projection repair is required.

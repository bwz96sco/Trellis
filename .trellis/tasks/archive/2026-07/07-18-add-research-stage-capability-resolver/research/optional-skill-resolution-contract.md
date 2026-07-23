# Research: Optional skill resolution contract

- **Scope**: C06 planning
- **Date**: 2026-07-20

## Stage table

| Stage | Logical capability | Optional external skill | Bundled fallback |
|---|---|---|---|
| setup | `research.setup` | `research-project-setup` | `trellis-research-setup` |
| framing | `research.framing` | `research-quest` | `trellis-research-quest` |
| literature | `research.literature` | `research-literature` | `trellis-research-literature` |
| ideation | `research.ideation` | `research-ideation` | `trellis-research-ideation` |
| experiment | `research.experiment` | `research-experiment` | `trellis-research-experiment` |
| computation | `research.computation` | `research-computation` | `trellis-research-computation` |
| theory | `research.theory` | `research-theory` | `trellis-research-theory` |
| audit | `research.audit` | `research-review-case` | `trellis-research-audit` |
| writing | `research.writing` | `research-writing` | `trellis-research-writing` |
| complete | none | none | none |

Logical capability is stable Trellis domain vocabulary. External and bundled skill names are implementation choices attached to it.

## Host vocabulary

Core execution hosts:

```ts
type ResearchExecutionHost = "claude" | "codex";
```

This matches the future Dispatch context CLI contract. It intentionally differs from installer registry ID `claude-code`; core must not import CLI platform types.

## Resolver input/output

```ts
interface ResolveResearchStageCapabilityInput {
  stage: QuestStage;
  host: ResearchExecutionHost;
  discoveredSkillNames: readonly string[];
}

type ResearchStageCapabilityResolution =
  | {
      stage: DispatchableQuestStage;
      host: ResearchExecutionHost;
      dispatchable: true;
      capability: ResearchCapability;
      optionalSkill: OptionalResearchSkill;
      fallbackSkill: BundledResearchSkill;
      selectedSkill: OptionalResearchSkill | BundledResearchSkill;
      source: "host" | "bundled";
    }
  | {
      stage: "complete";
      host: ResearchExecutionHost;
      dispatchable: false;
      capability: null;
      optionalSkill: null;
      fallbackSkill: null;
      selectedSkill: null;
      source: null;
    };
```

## Discovery normalization

Resolver receives names only. It does not discover skills.

Normalization:

1. Trim surrounding Unicode/JavaScript whitespace.
2. Drop empty values.
3. Deduplicate exact names.
4. Match case-sensitively against the one allowed optional name for the stage.
5. Ignore discovery order.

Not supported in core:

- leading `/` or `$` invocation adornments;
- filesystem paths;
- skill bodies/frontmatter loading;
- plugin namespaces or aliases;
- case folding/fuzzy matching;
- host subprocesses or directory scanning.

Discovery adapters in later children must provide canonical names.

## Selection

- Exact optional name present → choose it, source `host`.
- Otherwise → choose bundled fallback, source `bundled`.
- Host does not change the stage table in C06; it is validated and carried for deterministic future context.
- Supplying any discovered name cannot make `complete` dispatchable.

## Legacy owner compatibility

`Dispatch.ownerSkill` remains arbitrary non-empty schema-v1 metadata. Historical generic values such as `trellis-research-runner`, `research-runner`, `runner`, and `trellis-research` remain readable and are not rewritten.

Resolution authority:

```text
current Quest stage -> core capability table -> discovered exact optional name or bundled fallback
```

Never:

```text
legacy Dispatch.ownerSkill -> infer current Quest stage/capability
```

Bundled stage-specific owner names may be classified later for stale metadata validation, but generic aliases never override Quest stage or `complete` rejection.

## Child boundary

C06:

- pure table, host parser, name normalization, resolver, public `/research` exports, unit tests.

C07:

- filesystem/state reading, Dispatch context command, discovered skill-name collection input, stale metadata errors.

C08:

- Codex worker and preflight execution.

C09:

- Claude hook adoption, duplicate map removal, cross-host parity.

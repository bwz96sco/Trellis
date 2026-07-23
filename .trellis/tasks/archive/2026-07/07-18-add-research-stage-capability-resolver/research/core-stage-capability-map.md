# Research: Core stage capability map

- **Query**: Research existing core Research stage definitions, Quest transitions, Dispatch `ownerSkill`/`taskRef` compatibility, schemas, exports, tests, and duplicated stage-owner maps. Design a minimal core-owned exhaustive stage capability/fallback resolver for `setup`, `framing`, `literature`, `ideation`, `experiment`, `computation`, `theory`, `audit`, and `writing`, with `complete` non-dispatchable. Map exact files/symbols and run GitNexus query/context/impact.
- **Scope**: Internal, including the current dirty working tree and the indexed Trellis GitNexus graph
- **Date**: 2026-07-20

## Findings

### Current task and repository state

- `uv run python ./.trellis/scripts/task.py current --source` reported no active task pointer.
- The requested task directory exists at `.trellis/tasks/07-18-add-research-stage-capability-resolver/`, so this report uses that explicit path.
- The working tree already contains a large set of unrelated modifications and untracked migration tasks. No production, test, or spec file was changed by this research task.
- The task metadata names `variant/research-workflow` as its base branch: `.trellis/tasks/07-18-add-research-stage-capability-resolver/task.json:16`.

### Files Found

| File Path | Symbols / role |
|---|---|
| `packages/core/src/research/types.ts` | `QuestStage` at lines 18-28; `Quest.stage` at line 93; `Dispatch.ownerSkill` and optional `Dispatch.taskRef` at lines 148-164; `ProposalOperation` stage mutation at lines 197-221 |
| `packages/core/src/research/schema.ts` | Private exhaustive `QUEST_STAGES` list at lines 177-189; `questSchema` stage parsing at lines 367-394; `dispatchSchema` at lines 560-640; `parseQuestStage` at lines 989-991 |
| `packages/core/src/research/events.ts` | `quest.stage_changed` event kind and payload parsing at lines 34-56 and 91-143 |
| `packages/core/src/research/reducer.ts` | `applyEvent` handles quest creation at lines 158-177 and stage changes at lines 188-198 |
| `packages/core/src/research/transitions.ts` | Status transition tables only; no Quest stage transition table or `assertQuestStageTransition` |
| `packages/core/src/research/store.ts` | `ResearchMutation` includes `quest.stage` at lines 70-146; `mutationToEventDraft` validates stage mutations through `parseQuestStage`; accepted Proposal mutations are compared exactly in `validateDispatchBatch` at lines 337-429 |
| `packages/core/src/research/dispatch.ts` | `proposalOperationsToMutations` preserves `quest.stage` at lines 16-79 |
| `packages/core/src/research/index.ts` | Public `@mindfoldhq/trellis-core/research` barrel; exports `QuestStage`, `parseQuestStage`, schemas, transitions, store, and dispatch helpers at lines 1-161 |
| `packages/core/src/index.ts` | Small root barrel exports Channel and Task only; Research is intentionally not re-exported at package root |
| `packages/core/package.json` | Declares the `./research` public subpath at lines 25-29 |
| `packages/cli/src/commands/research/common.ts` | `parseQuestStageArgument` delegates to core `parseQuestStage` at lines 194-200 |
| `packages/cli/src/commands/research/command.ts` | `setResearchQuestStage` creates a typed `quest.stage` mutation at lines 256-265 |
| `packages/cli/src/commands/research/dispatch-command.ts` | `PrepareResearchDispatchOptions.ownerSkill` is required and `taskRef` optional at lines 45-60; `prepareResearchDispatch` copies both into the Dispatch at lines 397-458 |
| `packages/cli/src/commands/research/index.ts` | CLI requires `--owner-skill` and offers optional `--task-ref` at lines 800-844 |
| `packages/cli/src/templates/shared-hooks/session-start.py` | Duplicated `_RESEARCH_OWNER_BY_STAGE` at lines 701-711; accepts `complete` as a valid stage at lines 866-870; renders owner `none` for unmapped stages at lines 930-937 |
| `packages/cli/src/templates/shared-hooks/inject-subagent-context.py` | Duplicated `_RESEARCH_OWNER_BY_STAGE` at lines 66-76; rejects unknown owners at lines 760-856; rejects a stage without an active owner and owner/stage mismatch at lines 859-900; applies stricter Task-pointer checks at lines 1176-1187 |
| `packages/cli/test/templates/research-hooks.test.ts` | Third `OWNER_BY_STAGE` copy at lines 32-42; stage-owner template assertions at lines 398-470; SessionStart owner assertions at lines 503-588; owner/stage mismatch dispatch case at lines 991-1028 |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-*/SKILL.md` | Nine stage-specific fallback skills; each frontmatter has its exact `name` and `stage` |
| `packages/core/test/research/schema.test.ts` | Entity and Dispatch schema coverage; arbitrary non-empty owner names are accepted and portable `taskRef` is checked at lines 245-371 |
| `packages/core/test/research/dispatch.test.ts` | Proposal stage mutation mapping and Dispatch hierarchy coverage at lines 25-337 |
| `packages/core/test/research/schema-v1-compatibility.test.ts` | Golden ledger replay preserves `ownerSkill` and `taskRef` at lines 44-171 |
| `packages/core/test/research/fixtures/schema-v1-complete/events.jsonl` | Frozen schema-v1 Dispatch event contains `ownerSkill: "trellis-research-runner"` and `taskRef: "tasks/07-18-golden-research"` on line 7 |
| `packages/cli/test/commands/research-dispatch-compatibility.test.ts` | Strict tracked-file compatibility preserves the complete request and stable JSON at lines 23-45 |
| `packages/cli/test/fixtures/research-dispatch-schema-v1/request.json` | Frozen request has `ownerSkill: "trellis-research-runner"` at line 35 and `taskRef: "tasks/07-18-golden-research"` at line 40 |
| `packages/cli/test/commands/research-workflow.integration.test.ts` | End-to-end workflow reaches `stage: "complete"` and `status: "completed"` at lines 593-607 |
| `.trellis/spec/core/backend/research-state.md` | Core Research contract and public `/research` subpath; stage is a validated enum separate from status at lines 204-223; Dispatch compatibility contract at lines 295-316 |
| `.trellis/spec/cli/backend/research-worker-hooks.md` | Current nine-stage owner table at lines 9-23; `complete` has no active owner; hook validation requires exact stage-owner mapping at lines 179-199 |
| `.trellis/tasks/07-18-research-only-claude-codex-migration/design.md` | Parent design says stage selection becomes a core logical capability contract with optional installed skill or bundled fallback at lines 3-24; old `ownerSkill` and `taskRef` remain readable/inert at lines 30-34 |

### Existing stage model

`QuestStage` is exactly:

```ts
"setup"
| "framing"
| "literature"
| "ideation"
| "experiment"
| "computation"
| "theory"
| "audit"
| "writing"
| "complete"
```

The same values are repeated in the private `QUEST_STAGES` runtime list in `packages/core/src/research/schema.ts:177-189`. `parseQuestStage` is the runtime validator used by Quest parsing, Proposal operation parsing, direct CLI stage mutation, and store mutation conversion.

### Quest stage transitions

Quest status and Quest stage are separate contracts.

- Quest status transitions are constrained by `QUEST_TRANSITIONS` in `packages/core/src/research/transitions.ts:20-25`.
- Quest stage changes have no transition graph. In `packages/core/src/research/reducer.ts:188-198`, any validated `QuestStage` replaces the prior stage while the Quest status is not terminal.
- A new Quest must start active at `setup`: `packages/core/src/research/reducer.ts:158-177`.
- A terminal Quest (`completed` or `abandoned`) cannot receive another stage event: `packages/core/src/research/reducer.ts:188-198`.
- The end-to-end workflow explicitly sets stage `complete` before setting status `completed`: `packages/cli/test/commands/research-workflow.integration.test.ts:593-603`.

A stage capability resolver is therefore a routing lookup. It does not add or alter lifecycle transition legality.

### Existing stage-owner maps

Three executable copies currently encode the same nine active mappings:

| Stage | Current bundled owner / fallback |
|---|---|
| `setup` | `trellis-research-setup` |
| `framing` | `trellis-research-quest` |
| `literature` | `trellis-research-literature` |
| `ideation` | `trellis-research-ideation` |
| `experiment` | `trellis-research-experiment` |
| `computation` | `trellis-research-computation` |
| `theory` | `trellis-research-theory` |
| `audit` | `trellis-research-audit` |
| `writing` | `trellis-research-writing` |

Executable duplicates:

1. `packages/cli/src/templates/shared-hooks/session-start.py:701-711`
2. `packages/cli/src/templates/shared-hooks/inject-subagent-context.py:66-76`
3. `packages/cli/test/templates/research-hooks.test.ts:32-42`

Documented copies:

- `.trellis/spec/cli/backend/research-worker-hooks.md:9-23`
- `.trellis/tasks/07-17-research-skills-claude-hooks/design.md:35-49`

The nine bundled skill definitions repeat the ownership in frontmatter, one file per stage. Those files are assets, not a central lookup.

`complete` is currently represented by omission:

- SessionStart explicitly allows it as a Quest stage but resolves the owner to `none`.
- Dispatch injection gets no expected owner and fails with `dispatch Quest stage has no active stage owner`.
- The spec says `complete` has no active owner.

The requested core table should make this non-dispatchability explicit rather than relying on omission.

### Logical capability and fallback map

The available host capability inventory for this session contains the following specialized skills. They align one-to-one with the nine active Quest stages, while bundled Trellis skills remain the fallback assets:

| Quest stage | Logical capability / optional host skill | Bundled fallback skill |
|---|---|---|
| `setup` | `research-project-setup` | `trellis-research-setup` |
| `framing` | `research-quest` | `trellis-research-quest` |
| `literature` | `research-literature` | `trellis-research-literature` |
| `ideation` | `research-ideation` | `trellis-research-ideation` |
| `experiment` | `research-experiment` | `trellis-research-experiment` |
| `computation` | `research-computation` | `trellis-research-computation` |
| `theory` | `research-theory` | `trellis-research-theory` |
| `audit` | `research-review-case` | `trellis-research-audit` |
| `writing` | `research-writing` | `trellis-research-writing` |
| `complete` | none; non-dispatchable | none |

No project-owned definitions for the unprefixed host skills were found under the checked project or user skill directories. Their names come from the runtime skill inventory supplied to this session. The bundled fallback names are verified project assets.

### Dispatch `ownerSkill` and `taskRef` compatibility

Core schema-v1 behavior is deliberately broad:

- `Dispatch.ownerSkill` is required and accepts any non-empty string: `packages/core/src/research/schema.ts:560-640`.
- `Dispatch.taskRef` is optional and accepts a portable relative reference. It rejects NUL, backslashes, POSIX absolute paths, and Windows drive forms, but it does not require a `.trellis/tasks/` prefix: `packages/core/src/research/schema.ts:142-153,636-638`.
- CLI prepare mirrors this contract: required `--owner-skill`, optional `--task-ref`.
- Golden compatibility fixtures preserve an old generic owner, `trellis-research-runner`, rather than one of the nine stage-specific fallback skills.
- Golden compatibility fixtures preserve `tasks/07-18-golden-research`, without a `.trellis/` prefix.

The current Claude hook is stricter than core:

- It accepts only values in its nine-entry owner map.
- It requires exact current Quest stage-to-owner equality.
- It rejects `complete` because no active owner exists.
- If `taskRef` is present, it requires `.trellis/tasks/...` and a real Task directory with `task.json`.

This means `ownerSkill` and `taskRef` must remain readable compatibility metadata in schema-v1. The additive resolver should not tighten `dispatchSchema`, rewrite old events/files, or invalidate the frozen fixtures. New routing can use the stage capability result independently of old metadata.

### Minimal core-owned design

#### File boundary

Minimal implementation scope:

1. Add `packages/core/src/research/stage-capabilities.ts`.
2. Export the new values and types from `packages/core/src/research/index.ts` only.
3. Add `packages/core/test/research/stage-capabilities.test.ts`.

No changes are required in:

- `packages/core/src/research/types.ts`
- `packages/core/src/research/schema.ts`
- `packages/core/src/research/events.ts`
- `packages/core/src/research/reducer.ts`
- Dispatch schema or schema-v1 fixtures
- Root `packages/core/src/index.ts`
- CLI hooks in this child task

The parent plan assigns map convergence to the later Claude/Codex validation child, so the Python maps can remain compatibility consumers until that work switches them to the core-owned decision path.

#### Proposed symbols

```ts
export type DispatchableQuestStage = Exclude<QuestStage, "complete">;

export type ResearchStageCapability =
  | "research-project-setup"
  | "research-quest"
  | "research-literature"
  | "research-ideation"
  | "research-experiment"
  | "research-computation"
  | "research-theory"
  | "research-review-case"
  | "research-writing";

export type BundledResearchSkill =
  | "trellis-research-setup"
  | "trellis-research-quest"
  | "trellis-research-literature"
  | "trellis-research-ideation"
  | "trellis-research-experiment"
  | "trellis-research-computation"
  | "trellis-research-theory"
  | "trellis-research-audit"
  | "trellis-research-writing";

export const RESEARCH_STAGE_CAPABILITIES = {
  // all ten QuestStage keys, including explicit complete
} as const satisfies Readonly<Record<QuestStage, ResearchStageCapabilityDefinition>>;

export function resolveResearchStageCapability(
  stage: QuestStage,
  hostSkill?: string | null,
): ResearchStageCapabilityResolution;
```

Suggested discriminated result shape:

```ts
type ResearchStageCapabilityResolution =
  | {
      stage: DispatchableQuestStage;
      dispatchable: true;
      capability: ResearchStageCapability;
      fallbackSkill: BundledResearchSkill;
      skill: string;
      source: "host" | "fallback";
    }
  | {
      stage: "complete";
      dispatchable: false;
      capability: null;
      fallbackSkill: null;
      skill: null;
      source: null;
    };
```

Resolver behavior:

1. Read the exhaustive descriptor for the validated `QuestStage`.
2. For `complete`, return the explicit non-dispatchable result and ignore any host skill argument.
3. For an active stage, use a non-empty optional host skill when supplied.
4. Otherwise use the bundled fallback skill.
5. Do not read the filesystem, inspect a host, parse Dispatch JSON, or mutate state. Host discovery remains an integration concern; core only resolves a discovered optional name against its deterministic fallback.

This keeps the function pure and host-neutral. It also avoids making the schema-v1 `ownerSkill` field authoritative for new routing.

#### Exhaustiveness

Use `satisfies Readonly<Record<QuestStage, ...>>` on the table. A future `QuestStage` addition then causes a compile error until the capability table declares whether the stage is dispatchable. The `complete` entry must be present with null capability/fallback values.

### Test shape

Add one focused table-driven core test file: `packages/core/test/research/stage-capabilities.test.ts`.

Required cases:

1. Exact descriptor for every active stage, including the `audit -> research-review-case -> trellis-research-audit` asymmetric mapping.
2. Every active stage returns its bundled fallback when no host skill is supplied.
3. Every active stage returns the supplied host skill and reports source `host`.
4. `complete` returns `dispatchable: false`, null capability, null fallback, null selected skill, and no source.
5. A supplied host skill does not make `complete` dispatchable.
6. The exported table has exactly all ten `QuestStage` keys.

Existing schema and compatibility tests should remain unchanged and continue to prove that old arbitrary `ownerSkill` and portable `taskRef` values still parse and serialize byte-stably.

### Exports

Export the new API from `packages/core/src/research/index.ts`, next to other pure domain helpers. The package already exposes `@mindfoldhq/trellis-core/research` through `packages/core/package.json:25-29`.

Do not add Research exports to `packages/core/src/index.ts`. The core spec explicitly says the package root remains small and the `/research` subpath is the public boundary: `.trellis/spec/core/backend/research-state.md:55-67,138-146`.

### GitNexus results

Commands run:

- `npx gitnexus query -r Trellis ...` for Research stage, Dispatch, owner, fallback, and validation flows.
- `npx gitnexus context -r Trellis --content parseQuestStage`
- `npx gitnexus context -r Trellis --content prepareResearchDispatch`
- `npx gitnexus context -r Trellis --content setResearchQuestStage`
- `npx gitnexus context -r Trellis --content reduceResearchEvents`
- `npx gitnexus context -r Trellis --content proposalOperationsToMutations`
- Upstream impact for `parseQuestStage`, `setResearchQuestStage`, `prepareResearchDispatch`, `dispatchSchema`, `reduceResearchEvents`, and `proposalOperationsToMutations`.

Impact summary:

| Symbol | Risk | Direct / notable impact |
|---|---|---|
| `parseQuestStage` | LOW | 4 direct callers; 12 total impacted symbols; one Research command process group |
| `setResearchQuestStage` | LOW | 2 direct test callers |
| `prepareResearchDispatch` | LOW | 2 direct integration-test callers |
| `dispatchSchema` | LOW | GitNexus reported no upstream symbols for the disambiguated function node; source search shows direct imports in core and CLI tests, so source references remain the reliable coverage list |
| `proposalOperationsToMutations` | LOW | 3 direct callers; 11 total impacted symbols; used by core Dispatch batch validation and CLI Proposal review |
| `reduceResearchEvents` | MEDIUM | 4 direct store callers; 47 total impacted symbols; affects Research command and Dispatch preparation process groups |

No HIGH or CRITICAL result was returned. The proposed minimal design does not modify `reduceResearchEvents`; its MEDIUM result is context for avoiding lifecycle changes in this child task.

GitNexus found both Python `_RESEARCH_OWNER_BY_STAGE` variables but treated the name as ambiguous. Source inspection identifies the two exact files and their consumers. The graph index line numbers differ slightly from the dirty working tree for those templates, so current source line numbers in this report take precedence.

### Related Specs

- `.trellis/spec/core/backend/research-state.md` — core domain, schema-v1, public API, Dispatch, Proposal, and lifecycle contracts.
- `.trellis/spec/cli/backend/research-worker-hooks.md` — nine current stage owners, `complete` without an owner, and strict Claude Dispatch validation.
- `.trellis/spec/cli/backend/commands-research.md` — CLI Research command and Dispatch orchestration contract.
- `.trellis/tasks/07-18-research-only-claude-codex-migration/design.md` — parent capability/fallback data flow and compatibility boundary.
- `.trellis/tasks/07-18-converge-claude-codex-dispatch-validation/prd.md` — later child explicitly owns removal of stage-map drift and host decision parity.

### External References

None. This is an internal code and contract mapping task.

## Caveats / Not Found

- No existing core stage-capability resolver or fallback abstraction was found.
- No project-owned files defining the unprefixed host skills (`research-project-setup`, `research-review-case`, and peers) were found. Their names are present in the runtime available-skill inventory, while all bundled fallback files are present in the repository.
- GitNexus could not find the `QuestStage` type alias as a symbol node, so `parseQuestStage` and the source files were used as the stage-contract graph anchors.
- GitNexus indexes repository graph state, not all uncommitted working-tree edits. Relevant current source was read directly, and the report distinguishes source findings from graph findings.
- The current task pointer is unset. The explicit task path from the request was used for persistence.

# Technical design

## Boundary

C03 installs the successor capability model in core but does not activate Procedure execution. Core becomes Skill-neutral. Active CLI Context keeps its frozen pre-C06 behavior through a private compatibility bridge, so C03 does not partially cut over one execution layer before Procedure, policy, activation, approval, and worker gates exist.

```text
C03 core API (new, inactive execution authority)
  Quest stage + optional capability ID
    -> immutable capability registry
    -> explicit/default resolution

Temporary active compatibility path (unchanged behavior)
  Quest stage + host + discovered Skill names
    -> private CLI legacy resolver
    -> current Context selectedSkill/source output
```

The paths do not call each other. C06 removes the bridge from the production Context path when validated Procedure Context lands. C07 removes any residual bridge-backed worker/hook characterization imports and deletes the bridge module when generic workers land; no bridge consumer survives C07.

## GitNexus blast radius

Fresh index: 15,258 nodes, 20,546 edges, 204 clusters, 300 flows at commit `47509e20`.

| Symbol | Fresh upstream result | Handling |
|---|---|---|
| `resolveResearchStageCapability` | LOW; one reported direct test caller | Remove from core. Static source use by CLI is under-reported, so preserve it through private bridge and run Context integration tests. |
| `normalizeDiscoveredResearchSkillNames` | LOW; one reported direct test caller | Remove from core; copy only frozen behavior into private CLI bridge. |
| `parseResearchExecutionHost` | LOW; eight impacted, three direct, one `registerResearchCommand` process | Keep signature/behavior unchanged; run host, Context, command, and hook parity tests. |
| `RESEARCH_STAGE_CAPABILITIES` | LOW; zero reported | Replace with exact registry; graph under-reports public Research-subpath consumers, so run package import/type tests. |
| `getResearchDispatchContext` | LOW; ten impacted, four direct, one `registerResearchCommand` process | Change only import/call wiring to private bridge. Preserve output and zero-write behavior exactly. |

No HIGH or CRITICAL C03 symbol is planned. Any implementation need to edit a HIGH/CRITICAL symbol, store/event/projection code, payload collector, worker, or cleanup authority stops and returns to planning.

## Core module design

Keep `packages/core/src/research/stage-capabilities.ts` as the successor registry module to avoid a needless file move. Replace its Skill-oriented contract with:

```ts
type ResearchCapabilityId = /* exact 14 IDs */;
type ResearchCapabilityKind = "bounded" | "workflow" | "advisory";
type ResearchActivationMode = "automatic" | "explicit";

type ResearchCapabilityDefinition = Readonly<{
  id: ResearchCapabilityId;
  stage: DispatchableQuestStage;
  kind: ResearchCapabilityKind;
  activation: ResearchActivationMode;
  procedure: Readonly<{ id: string; version: string }>;
  workerAuthority: "proposal-only";
  networkPolicy: "forbidden" | "declared-only";
  repositoryScope: "single" | "multiple";
  maxDurationMinutes: number;
  maxDispatches: number;
  approvalRequiredFor: readonly ResearchApprovalRequirement[];
}>;
```

The source array follows C01 order exactly. A small module-local constructor freezes each definition, nested Procedure reference, and approval-requirement array; the exported registry array and default map are also frozen. C03 adds no general-purpose deep-freeze utility, dynamic registration, or policy merge.

### Exact registry

| Stage | ID | Kind | Activation | Procedure | Network | Repositories | Limits |
|---|---|---|---|---|---|---|---|
| setup | `research.setup.project` | workflow | explicit | `project-setup-v1@1.0.0` | forbidden | single | 15 / 1 |
| framing | `research.framing.quest` | bounded | automatic | `quest-framing-v1@1.0.0` | forbidden | single | 15 / 1 |
| framing | `research.framing.admin` | workflow | explicit | `quest-admin-v1@1.0.0` | forbidden | single | 15 / 1 |
| literature | `research.literature.scan` | bounded | automatic | `literature-scan-v1@1.0.0` | forbidden | single | 15 / 1 |
| literature | `research.literature.review` | workflow | explicit | `literature-review-v1@1.0.0` | declared-only | multiple | 60 / 4 |
| ideation | `research.ideation.generate` | bounded | automatic | `idea-generation-v1@1.0.0` | forbidden | single | 15 / 1 |
| ideation | `research.ideation.evaluate` | workflow | explicit | `idea-evaluation-v1@1.0.0` | forbidden | single | 30 / 2 |
| experiment | `research.experiment.round` | bounded | automatic | `experiment-round-v1@1.0.0` | forbidden | single | 15 / 1 |
| experiment | `research.experiment.campaign` | workflow | explicit | `experiment-campaign-v1@1.0.0` | declared-only | multiple | 120 / 8 |
| computation | `research.computation.case` | bounded | automatic | `computation-case-v1@1.0.0` | forbidden | single | 15 / 1 |
| theory | `research.theory.case` | bounded | automatic | `theory-case-v1@1.0.0` | forbidden | single | 15 / 1 |
| audit | `research.audit.case` | bounded | automatic | `review-case-v1@1.0.0` | forbidden | single | 15 / 1 |
| audit | `research.audit.campaign` | workflow | explicit | `review-campaign-v1@1.0.0` | forbidden | multiple | 60 / 4 |
| writing | `research.writing.case` | bounded | automatic | `writing-case-v1@1.0.0` | forbidden | single | 15 / 1 |

Bounded approval requirements use exact order:

```text
network, external-cost, multiple-repositories,
canonical-mutation, capability-chaining
```

Workflow entries prepend `workflow`.

## Resolution design

`RESEARCH_DEFAULT_CAPABILITY_BY_STAGE` explicitly maps all nine dispatchable stages. It never infers defaults from array position or capability kind.

Resolution order:

1. Check the runtime stage value against the exact nine dispatchable Quest stages. `complete` and any value outside that set throw `ResearchCapabilityResolutionError` with `code: "QUEST_STAGE_NOT_DISPATCHABLE"` before capability lookup.
2. Treat only `capabilityId: undefined` as omission. Every supplied string is an explicit request.
3. For an explicit ID, perform exact case-sensitive lookup without trimming, aliases, namespaces, or adornments.
4. Reject any absent lookup with `UNKNOWN_CAPABILITY`.
5. Otherwise select the exact stage default.
6. Require selected definition stage to equal requested stage; mismatch uses `CAPABILITY_STAGE_MISMATCH`.
7. Return one frozen definition and `selection: "explicit" | "default"`.

The stage-first rule makes `complete` deterministically non-dispatchable even when an explicit capability ID is supplied, and prevents runtime-invalid JavaScript or cast input from falling through to an untyped property-access or parser error. Empty or whitespace IDs count as supplied invalid IDs and never select a default. A typed `ResearchCapabilityResolutionError` exposes the stable code while retaining a concrete human message. The resolver performs no host, Skill, filesystem, policy, Procedure, ledger, Dispatch, or chaining work.

## Public export migration

`packages/core/src/research/index.ts` removes old Skill-oriented names and adds successor registry definitions, default map, lookup/resolver, and typed error names. `packages/core/src/index.ts`, `packages/core/package.json`, package version, and package export keys remain unchanged. `packages/core/scripts/verify-packed-core.js` changes only its representative Research-subpath assertion from the retired resolver to the successor API.

Removed Research-subpath API:

```text
ResearchCapability
OptionalResearchSkill
BundledResearchSkill
ResearchStageCapabilityDefinition
ResolveResearchStageCapabilityInput
ResearchStageCapabilityResolution
RESEARCH_STAGE_CAPABILITIES
normalizeDiscoveredResearchSkillNames
resolveResearchStageCapability
```

`Dispatch` schema fields are not renamed or narrowed.

## Private CLI compatibility bridge

Add one package-private command-local module:

```text
packages/cli/src/commands/research/legacy-skill-routing.ts
```

It contains the exact old nine-stage optional/fallback table, broad legacy capability strings, whitespace trim/drop/deduplicate behavior, `complete` result, and host/bundled selection needed by existing Context. It exports only internal constants/types/resolver needed by `dispatch-context.ts` and existing CLI tests that formerly imported the core Skill table. It is not exported from the CLI package. It does not:

- import or call the successor capability registry, keeping the new authority inactive;
- add public CLI/core exports;
- inspect Skill bodies or arbitrary paths;
- persist selected Skill data;
- make historical Dispatch metadata authoritative;
- alter command flags, Context JSON, workers, hooks, payload, or cleanup;
- remain on the production Context path after C06, or remain anywhere after C07.

Moving this behavior from public core to private CLI is deliberate transition isolation, not final architecture.

## Tests

### Core successor tests

Rewrite `packages/core/test/research/stage-capabilities.test.ts` to prove:

- exact 14-ID and definition inventory;
- exact field values and approval-requirement order;
- no `complete` or advisory entry;
- exact nine defaults;
- explicit/default resolution for all stages;
- alternate workflow selection where available;
- unknown, empty, whitespace, and case/adornment explicit IDs using `UNKNOWN_CAPABILITY`; wrong-stage known IDs using `CAPABILITY_STAGE_MISMATCH`; and `complete` plus runtime-invalid stages using stage-first typed `QUEST_STAGE_NOT_DISPATCHABLE`;
- runtime immutability of registry, definitions, nested Procedure refs, approval arrays, and default map;
- exact Claude/Codex host parser behavior;
- resolver output contains no Skill/discovery/source fields.

### CLI transition tests

Add a focused private-bridge test containing the C01 frozen current Skill matrix. Redirect `codex.test.ts` and `research-hooks.test.ts` internal inventory imports from removed core Skill exports to the bridge without changing expectations. Keep existing Context integration and hook behavior assertions unchanged to prove no observable cutover. Keep arbitrary Dispatch metadata compatibility test unchanged.

### Export tests

Prove successor names import from `@mindfoldhq/trellis-core/research`, old runtime Skill exports are absent, root barrel does not gain Research names, and package export keys remain unchanged.

## Code-spec update

Update `.trellis/spec/core/backend/research-state.md` with current implemented capability registry signatures, defaults, validation matrix, cases, tests, and wrong/correct examples. Update `.trellis/spec/cli/backend/commands-research.md` only to document the temporary private compatibility bridge and explicit C06 removal boundary; do not claim Procedure Context is implemented.

## Expected file scope

Production/release boundary:

```text
packages/core/src/research/stage-capabilities.ts
packages/core/src/research/index.ts
packages/core/scripts/verify-packed-core.js
packages/cli/src/commands/research/legacy-skill-routing.ts
packages/cli/src/commands/research/dispatch-context.ts
```

Tests/spec/task artifacts:

```text
packages/core/test/research/stage-capabilities.test.ts
packages/core/test/compatibility/package-exports.test.ts
packages/cli/test/commands/research-legacy-skill-routing.test.ts
packages/cli/test/templates/codex.test.ts
packages/cli/test/templates/research-hooks.test.ts
.trellis/spec/core/backend/research-state.md
.trellis/spec/cli/backend/commands-research.md
.trellis/tasks/07-23-replace-skill-resolver-capability-registry/**
```

Any store, event, projection, Procedure, policy, worker template, payload collector, cleanup inventory, package manifest, docs-site, or marketplace edit is out of scope.

## Rollback

Before C04/C05 activation emitters exist, C03 rollback is ordinary source rollback: restore old public resolver and remove private bridge. No ledger or data migration exists. After C03 commit, C04 may depend on successor exports; rollback then requires reverting dependants together. No Research event rewrite is ever needed.

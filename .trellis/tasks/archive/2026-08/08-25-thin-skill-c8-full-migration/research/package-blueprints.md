# Research: C8 Ten-Package Blueprints

- **Query**: Blueprint ten not-yet-packaged Research Skills from exact source commit into approved Trellis schema-v3 package contracts.
- **Scope**: mixed internal repository and exact external Git-object inspection
- **Date**: 2026-08-25
- **Source authority**: `/Users/zhangbowen/Projects/agent-skills-private` commit `86df5a676c52950592ff9fe5966b9c1753160cb5`; tree `aa0282da9c63f8f17dd94b672b3fd6843647a0bd`; parent `e2b0d70e3a797f19461eb106601de12250000b69`
- **Source read rule**: `git show` / `git cat-file` only. No source working-tree bytes.

## Evidence Read

| Area | Files / lines |
|---|---|
| parser | `packages/core/src/research/execution-package.ts:32-85`<br>`packages/core/src/research/execution-package.ts:252-574`<br>`packages/core/src/research/execution-package.ts:721-842`<br>`packages/core/src/research/execution-package.ts:889-970` |
| capabilities | `packages/core/src/research/stage-capabilities.ts:6-24`<br>`packages/core/src/research/stage-capabilities.ts:127-298` |
| specs | `.trellis/spec/core/backend/research-state.md:1006-1052`<br>`.trellis/spec/core/backend/research-state.md:1307-1345`<br>`.trellis/spec/cli/backend/commands-research.md:763-838`<br>`.trellis/spec/cli/backend/commands-research.md:926-993`<br>`.trellis/spec/cli/backend/research-worker-hooks.md:481-542`<br>`.trellis/spec/cli/backend/research-worker-hooks.md:584-710` |
| taskDesign | `.trellis/tasks/08-25-thin-skill-c8-full-migration/prd.md:68-81`<br>`.trellis/tasks/08-25-thin-skill-c8-full-migration/design.md:36-71`<br>`.trellis/tasks/08-21-plan-thin-skill-research-orchestration/design.md:96-214` |
| packageExamples | `packages/cli/src/templates/research/skills/research-literature/1.0.0`<br>`packages/cli/src/templates/research/skills/research-ideation/1.0.0`<br>`packages/cli/src/templates/research/skills/research-idea-evaluation/1.0.0`<br>`packages/cli/src/templates/research/skills/research-quest-admin/1.0.0` |
| frozenSourceBaseline | `.trellis/tasks/08-25-thin-skill-c8-full-migration/research/source-baseline/manifest.json`<br>`.trellis/tasks/08-25-thin-skill-c8-full-migration/research/source-baseline/files/skills/research-project-setup/SKILL.md:12-26`<br>`.trellis/tasks/08-25-thin-skill-c8-full-migration/research/source-baseline/files/skills/research-project-setup/assets/manifest.yaml:1-85`<br>`.trellis/tasks/08-25-thin-skill-c8-full-migration/research/source-baseline/files/skills/research-project-setup/references/graphify.md:1-10` |

## Global Package Rules

- Exactly ten new immutable packages at 1.0.0; no research-quest package.
- No Workflow DAG, second registry, prompt duplication, source helper/validator copy, campaign engine, or automatic continuation.
- Synthesis, opportunity-mining, figure, and slides are lightweight-only.
- Figure and slides receive no optional capability ID or managed binding.
- Every managed package binds exactly one current registry capability.
- Every handoff is declarative with autoInvoke=false.
- Members are exact digest-bound source bytes; on-demand members load only by explicit request; root-only members never enter worker Context.
- All source agents/openai.yaml files are evidence only and excluded from packages.

## Approved Contract Matrix

| Package | Kind | Invocation | Entrypoint | Profiles | Managed binding | Members |
|---|---|---|---|---|---|---:|
| `research-synthesis@1.0.0` | `bounded` | `model` | `model-context` | `lightweight` | `none` | 0 |
| `research-opportunity-mining@1.0.0` | `bounded` | `operator-explicit` | `model-context` | `lightweight` | `none` | 1 |
| `research-experiment@1.0.0` | `bounded` | `model` | `model-context` | `lightweight, managed` | `research.experiment.round` | 0 |
| `research-computation@1.0.0` | `bounded` | `model` | `model-context` | `lightweight, managed` | `research.computation.case` | 0 |
| `research-theory@1.0.0` | `bounded` | `model` | `model-context` | `lightweight, managed` | `research.theory.case` | 0 |
| `research-figure@1.0.0` | `bounded` | `model` | `model-context` | `lightweight` | `none` | 0 |
| `research-writing@1.0.0` | `bounded` | `model` | `model-context` | `lightweight, managed` | `research.writing.case` | 1 |
| `research-slides@1.0.0` | `bounded` | `model` | `model-context` | `lightweight` | `none` | 1 |
| `research-review-case@1.0.0` | `bounded` | `model` | `model-context` | `lightweight, managed` | `research.audit.case` | 0 |
| `research-project-setup@1.0.0` | `workflow` | `operator-explicit` | `model-context` | `lightweight, managed` | `research.setup.project` | 22 |

## `research-synthesis@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `model`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight"]`
- `managedBinding`: `null`
- `handoff`: `{"suggestedSkillIds":["research-opportunity-mining"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-synthesis/SKILL.md` | `100644` | `ed3a74e45e5f1b4f5f9903a0c8b2cb5f08205ac4` | 3286 | `8050a73957b36d89f2ccfa50b1438fc8537137621380e5415b324b7bdbcb6d30` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-synthesis/agents/openai.yaml` | `100644` | `87ac4120b47f93df5106d45ad43c2464733ed627` | 312 | `6843ca4fa49b4f12fc8f55daf59d6df275a54e392536dc1213d2ebc582448b56` | excluded-host-projection | `—` |

### Material Method Obligations

- Require one verbatim target question, register.md, and all status=read paper notes; candidate or skimmed papers remain named but unsynthesized.
- Read notes rather than reopening papers; hold the bounded note corpus in one context and do not delegate subagents.
- Merge note Field maps into a small taxonomy, place every read paper in every applicable cell, and treat unplaceable papers as taxonomy findings.
- Write by taxonomy cell rather than paper-by-paper summary.
- Resolve contradictions by dataset, scale, assumption, metric, or other deciding condition; otherwise name a deciding experiment.
- Derive corpus gaps only from empty cells and anchored note defects; do not claim global novelty.
- Open synthesis.md with the target question verbatim and close with an explicit answer plus unresolved issues.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- Paper retrieval and full-paper reading remain with research-literature.. Owner: named root/operator/external owner in obligation boundary.
- Gap transformation into substitutions, transfers, stressors, new inputs, or metrics remains with separately selected research-opportunity-mining.. Owner: named root/operator/external owner in obligation boundary.
- Quest event recording remains with root commands; no event preparation or source quest write occurs inside package.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

- None.

### Lean `SKILL.md` Outline

#### Prerequisites
- Verbatim target question; register.md; one or more read notes with stable paper IDs and anchors.

#### Method
- Load bounded note corpus.
- Build taxonomy from Field maps.
- Compare by cell.
- Resolve contradictions by condition or name deciding experiment.
- Harvest corpus-bounded gaps.
- Answer target question.

#### Profiles
- lightweight only; one root-session synthesis, no managed capability.

#### Output contract
- Write only synthesis.md beside register.md when durable output is requested.
- Use paper IDs plus note anchors for claims.
- State thin-corpus limits and unresolved issues plainly.

#### Stop conditions
- Stop when explicit answer, paper coverage, contradiction treatment, and gap traceability are complete or when required notes/anchors are missing.

#### Authority boundary
- No paper search, nested execution, canonical state mutation, provider invocation, or next-stage invocation.

#### Handoff
- Suggest research-opportunity-mining only for an explicit later transformation request; never invoke it.

### Stop / Authority / Output Contract

- **Stop**: Stop after one evidence-bound synthesis answers the target question, covers every read paper, conditions or blocks every contradiction, and traces unresolved corpus issues to cells or note defects.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: synthesis.md.
- **Persistence**: `durable-required when synthesis is requested as a literature-workspace artifact`.
- **Required content**: verbatim target question; taxonomy and cell comparisons; paper-id plus note-anchor citations; explicit answer; corpus-bounded unresolved issues.

## `research-opportunity-mining@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `operator-explicit`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight"]`
- `managedBinding`: `null`
- `handoff`: `{"suggestedSkillIds":["research-ideation","research-literature"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-opportunity-mining/SKILL.md` | `100644` | `2c51da57c322162c06ebf6d2f251e897ca5c219a` | 4014 | `dd22f250eff5df097e57e5be5ba1531d6d8fa945d5cc82ea70f87b46755c2f58` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-opportunity-mining/agents/openai.yaml` | `100644` | `d6178f5d7248316997b5c623d57e165c9a7aacbc` | 351 | `bfe1be2e5ec3cdb8098e9f91a21103b260b8ed3c37fe237323f9170e228e5603` | excluded-host-projection | `—` |
| `skills/research-opportunity-mining/opportunity-template.md` | `100644` | `efe1330128e3c9eac79ec9e646252c0dd3e690e1` | 2366 | `92a945bd3506dd77462c43d36aa6ccd06010dfdccf10284dd4b3a380a0c40e0c` | declared-member-source | `templates/opportunity-template.md` |

### Material Method Obligations

- Require target question, register.md, and one or more status=read full-paper notes; abstract-only evidence cannot support deep seeds.
- Reconstruct each selected paper from note evidence; inspect only a cited local PDF section when one required detail is missing and never launch a paper search.
- Cover six exact lenses: SUB, MOD, INP, XFR, ENV, and MET; record seeded, no_supported_seed, or not_assessable without forcing seeds.
- Use stable IDs O-<paper-id>-<lens>-NN and record source basis, anchor, provenance, transformation, causal rationale, research question, information/compute delta, assets, cheapest falsification, kill condition, and novelty unknown.
- Build per-paper opportunity files plus one complete index; cluster related seed IDs without scoring, ranking, selection, or deletion.
- Load templates/opportunity-template.md only when explicitly requested.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- New literature search, global novelty judgment, candidate generation, scoring, ranking, winner selection, and H1/H2 gates are excluded.. Owner: named root/operator/external owner in obligation boundary.
- Source register, source notes, and PDFs are read-only except bounded section inspection of an already recorded local PDF.. Owner: named root/operator/external owner in obligation boundary.
- No managed capability is added for opportunity mining.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

| Package path | Role | Load | Visibility | Exact source path | SHA-256 | maxBytes |
|---|---|---|---|---|---|---:|
| `templates/opportunity-template.md` | `template` | `on-demand` | `worker-visible` | `skills/research-opportunity-mining/opportunity-template.md` | `92a945bd3506dd77462c43d36aa6ccd06010dfdccf10284dd4b3a380a0c40e0c` | 2366 |

### Lean `SKILL.md` Outline

#### Prerequisites
- Verbatim target question, register.md, selected full-paper read notes, and optional recorded local PDFs.

#### Method
- Lock inputs.
- Reconstruct paper.
- Apply SUB/MOD/INP/XFR/ENV/MET with abstention.
- Write atomic evidence-anchored seeds.
- Build complete unranked index.

#### Profiles
- lightweight only; operator-explicit selection required.

#### Output contract
- Use opportunities/<paper-id>.md and opportunity-index.md.
- Load template member on demand.
- Every seed carries novelty status unknown and a falsification/kill test.

#### Stop conditions
- Stop after six-lens coverage and complete indexing or when evidence is insufficient; do not cross into ideation or selection.

#### Authority boundary
- No search, gates, canonical mutation, nested execution, provider invocation, or automatic handoff.

#### Handoff
- Suggest research-literature only when abstract-only or incomplete source evidence requires full-paper reading; suggest research-ideation after complete six-lens output; never invoke either.

### Stop / Authority / Output Contract

- **Stop**: Stop when every selected note has six-lens coverage, every supported seed is anchored and falsifiable, every unsupported lens abstains, and index contains all seeds without novelty or winner claims.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: opportunities/<paper-id>.md; opportunity-index.md.
- **Persistence**: `durable-required in existing literature workspace`.
- **Required content**: baseline snapshot; six-lens coverage; atomic seed cards; complete seed inventory; related-seed clusters without ranking; explicit novelty-unknown status.

## `research-experiment@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `model`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight", "managed"]`
- `managedBinding`: `{"capabilityId":"research.experiment.round"}`
- `handoff`: `{"suggestedSkillIds":["research-computation"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-experiment/SKILL.md` | `100644` | `c615b66881bdd370d83e92cbcccbc37cb8d7213d` | 2894 | `4799c53aee0840a0c8c94d29c8b07c2a409d2e609caab0a7a1f0c4b758ef81ff` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-experiment/agents/openai.yaml` | `100644` | `7509701d05789ae600643e0ebebbd25e280d7fbf` | 281 | `1c5e508d4949651f7623710a3fe80057db4f7b1865246cc3ba9acdab92ee0c6f` | excluded-host-projection | `—` |

### Material Method Obligations

- Freeze baseline source, dataset/split, metric, evaluator, seed policy, intervention, total budget, and one bounded claim before claim-carrying execution.
- Preserve supplied total budget and mark unresolved allocations rather than inventing equal shares.
- Use one compact run matrix and at most six stop/kill/relaunch/fallback rules; distinguish smoke checks from claim-carrying runs.
- Use actual project-local runner commands; record command, code state, inputs, outputs, return status, and completion evidence.
- Audit every result against source artifacts, preserve failed/null results, and refuse aggregate claims without a frozen aggregation/claim rule.
- Close with exactly supported, refuted, inconclusive, or blocked; disclose every comparison change.
- For multi-round root work, retain a plain runs.md row per round without creating a registry, queue, campaign engine, or tracker.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- Runner/adapter creation remains with explicitly selected external tooling; package never invents runner commands.. Owner: named root/operator/external owner in obligation boundary.
- Package/solver/HPC computation may be handed to research-computation, but no child Skill is launched.. Owner: named root/operator/external owner in obligation boundary.
- Campaign orchestration and research.experiment.campaign are excluded; managed binding is one bounded round only.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

- None.

### Lean `SKILL.md` Outline

#### Prerequisites
- Scientific question or selected experiment brief, project-local runner route, budget, frozen comparison inputs, and bounded claim contract.

#### Method
- Freeze comparison.
- Plan compact run matrix.
- Execute real commands.
- Audit source artifacts.
- Assign bounded verdict.

#### Profiles
- lightweight: one bounded root-session round.
- managed: one separately prepared and approved research.experiment.round invocation; no campaign fan-out.

#### Output contract
- Return requested result plus minimum trust-bearing command/input/output/validation evidence.
- Preserve failed and null results.
- Managed execution returns strict Result plus pending Proposal using supplied IDs.

#### Stop conditions
- Stop after one bounded round closes or blocks its claim; do not continue to another round or stage automatically.

#### Authority boundary
- No provider calls, runner invention, child execution, canonical mutation, Workflow completion, transition, or Approval/Result recording.

#### Handoff
- Suggest research-computation only when scientific software/package/solver validity becomes separate work; never invoke it.

### Stop / Authority / Output Contract

- **Stop**: Stop after one frozen-comparison round has traceable artifacts and a supported/refuted/inconclusive/blocked verdict, or when a missing runner, budget, or evidence contract blocks execution.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: bounded experiment result; minimum trust-bearing run evidence; runs.md only when root maintains multiple rounds.
- **Persistence**: `request-dependent`.
- **Required content**: frozen comparison; actual command and code state; inputs/outputs/completion evidence; audit trace; bounded verdict; comparison changes.

## `research-computation@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `model`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight", "managed"]`
- `managedBinding`: `{"capabilityId":"research.computation.case"}`
- `handoff`: `{"suggestedSkillIds":["research-experiment","research-literature"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-computation/SKILL.md` | `100644` | `50c127fd40dcf960ce219ff785d4fcf2e3fe42c0` | 2439 | `f0c23cb6099b806d6acdcdebb1b14b1f36c505f119523d6d55ee3c4cb9b8b4cb` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-computation/agents/openai.yaml` | `100644` | `c98ae3f4205dbe5253adba4c64fe8a3ffbbd0fe3` | 299 | `1b441bbe31edc061f09a4cdd5c6566b8a5a1121d3fc0653123da772b792a125a` | excluded-host-projection | `—` |

### Material Method Obligations

- Bound scientific question, packages, data, execution route, compute budget, and success criteria.
- Preflight real imports/executables, versions, accelerator/backend access, data schema, and smoke path in current workspace; keep failed checks visible.
- Execute the actual command/script/notebook/job and retain exact command, inputs, logs, outputs, and return status; submitted jobs remain running until logs/outputs are inspected.
- Validate separately from execution: convergence, tolerances, units, schemas, leakage, seeds, invariants, and output persistence as applicable.
- Type every material claim as computed, parsed, digitized, or hypothesis and link it to evidence, non-claims, blockers, and next owner.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- Comparative baseline/ablation ownership remains with research-experiment.. Owner: named root/operator/external owner in obligation boundary.
- Library/document search, paper reading, scheduler provisioning, and exact project command authoring remain external/root-owned routes.. Owner: named root/operator/external owner in obligation boundary.
- No campaign wrapper, package installer helper, or source validator is copied into package.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

- None.

### Lean `SKILL.md` Outline

#### Prerequisites
- Scientific question, declared packages/data, execution route, compute budget, and success criteria.

#### Method
- Bound run.
- Preflight actual environment.
- Execute actual route.
- Validate separately.
- Type and evidence-bind claims.

#### Profiles
- lightweight: one bounded local computation case.
- managed: one separately approved research.computation.case with declared scope and writes.

#### Output contract
- Return exact execution evidence, separate validation evidence, typed claims, blockers, non-claims, and next owner.
- Managed execution returns strict Result plus pending Proposal using supplied IDs.

#### Stop conditions
- Stop when package availability and run state are proved or blocked, validation is separate, and every material claim is typed and bounded.

#### Authority boundary
- No nested execution, provider invocation, canonical mutation, state recording, Workflow action, or check weakening.

#### Handoff
- Suggest research-experiment for comparative baseline or ablation ownership and research-literature when paper evidence defines package behavior or validation criteria; never invoke either.

### Stop / Authority / Output Contract

- **Stop**: Stop after one computation case has distinguishable inputs/logs/outputs, separate validation, and typed bounded claims, or after a visible preflight/execution blocker.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: typed computation result; execution evidence; validation evidence.
- **Persistence**: `request-dependent`.
- **Required content**: actual command; environment/package checks; inputs/logs/outputs/status; separate correctness checks; computed/parsed/digitized/hypothesis labels; blockers and non-claims.

## `research-theory@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `model`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight", "managed"]`
- `managedBinding`: `{"capabilityId":"research.theory.case"}`
- `handoff`: `{"suggestedSkillIds":["research-experiment","research-literature","research-writing"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-theory/SKILL.md` | `100644` | `4d3bd18317f821e03a6863ba76a7f134f0e76346` | 2610 | `0dffe7fffe3d34656dce0fa6abdf2c71bde9242a9a0ba93c7172510702de7ea5` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-theory/agents/openai.yaml` | `100644` | `8929b7371a39d614747b59b6b813e1454b583cb7` | 293 | `c13aa1378af9dc66982ada92a2eb145ee538c87c98d9bc7ee1a6ab142fbaf896` | excluded-host-projection | `—` |

### Material Method Obligations

- Freeze exact mathematical object, notation, domains, assumptions, quantifiers, limit order, and non-claims; missing load-bearing information blocks.
- Derive stepwise and label identities, theorem applications, approximations, heuristics, conjectures, boundaries, and constant dependence.
- Attempt boundary/degenerate cases, toy examples, dimensional checks, and feasible symbolic/numerical checks before proof or repair.
- Expose every nontrivial theorem/lemma hypothesis and show where it is discharged.
- Prove as stated, make the minimum explicit weakening, or issue a precise blockage report without silent assumption or quantifier changes.
- Assign exactly provable_as_stated, provable_after_weakening, not_currently_justified, or blocked and propagate scope changes.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- Prior-theorem/citation retrieval remains with research-literature.. Owner: named root/operator/external owner in obligation boundary.
- Numerical falsification remains with research-experiment; manuscript integration remains with research-writing.. Owner: named root/operator/external owner in obligation boundary.
- No theorem database, proof campaign, symbolic helper, or validator is bundled.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

- None.

### Lean `SKILL.md` Outline

#### Prerequisites
- Exact claim/object, notation, domains, assumptions, quantifiers, limit order, and declared non-claims.

#### Method
- Freeze claim.
- Derive stepwise.
- Try to break.
- Discharge obligations.
- Prove, weaken, or block.
- Classify status.

#### Profiles
- lightweight: one bounded theory case in root session.
- managed: one separately approved research.theory.case when isolation or durable Result review is needed.

#### Output contract
- Return derivation/proof/counterexample/blockage with explicit assumptions, open obligations, scope changes, and one proof status.
- Managed execution returns strict Result plus pending Proposal using supplied IDs.

#### Stop conditions
- Stop when every obligation is discharged or explicitly open and one status is assigned; do not silently repair scope.

#### Authority boundary
- No paper search, numerical experiment launch, manuscript mutation, nested execution, provider invocation, or canonical state mutation.

#### Handoff
- Suggest literature, experiment, or writing only as separate explicit work selected by root/operator.

### Stop / Authority / Output Contract

- **Stop**: Stop when claim/assumptions/quantifiers are explicit, break attempt is recorded, obligations are discharged or open, and one proof status is assigned.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: derivation, proof, counterexample, or blockage report.
- **Persistence**: `request-dependent`.
- **Required content**: frozen statement; assumptions and quantifiers; break attempt; stepwise derivation/proof obligations; scope changes; one proof status.

## `research-figure@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `model`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight"]`
- `managedBinding`: `null`
- `handoff`: `{"suggestedSkillIds":["research-experiment","research-writing"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-figure/SKILL.md` | `100644` | `89fac7e363c9b7ca8494a9fc8ea60c680c614c5c` | 2429 | `0daac187dadd24d0800dfe110a9b102097b7868d7dde7c26ddbede80a7bd035c` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-figure/agents/openai.yaml` | `100644` | `1fcddb2fa6fad014663f8729d41584a1ca2d1f13` | 276 | `00253cfd4d69d17dd16912e94f8acb4fafe0fcd7f9651ec1951aa0ecdd4a62a3` | excluded-host-projection | `—` |

### Material Method Obligations

- Lock operation, reader job, bounded claim, source evidence, paper/slide surface, and format.
- Prefer deterministic project plotting/LaTeX routes, then deterministic vector/spec routes where exact data/topology/geometry are expressible.
- Build plots/tables from actual data and keep reproducible generation source; diagrams require editable source or structured spec.
- Preserve paired/block IDs and state n, units, center/spread, and metric definitions when applicable.
- Inspect actual render for target-scale readability, clipping, labels, hierarchy, and source fidelity; no render means no visual-QA claim.
- Bound caption to what is shown, what to notice, supported takeaway, and scope limits.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- No research.writing.figure capability is activated; package remains lightweight-only.. Owner: named root/operator/external owner in obligation boundary.
- AI illustration/style transfer, result-data ownership, and manuscript narrative remain separately selected external or Research routes.. Owner: named root/operator/external owner in obligation boundary.
- No plotting helper, validator, generated imagery provider, or renderer wrapper is bundled.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

- None.

### Lean `SKILL.md` Outline

#### Prerequisites
- Operation, reader job, bounded claim, traceable evidence/data, target surface, format, and available project route.

#### Method
- Lock contract.
- Choose deterministic route first.
- Build from source.
- Inspect actual render.
- Bound caption.

#### Profiles
- lightweight only; no managed figure capability or Dispatch binding.

#### Output contract
- Return asset or audit/blocker, source/generation route, inspection result when rendered, and bounded caption.
- Failed renders/checks remain visible.

#### Stop conditions
- Stop when asset/audit is delivered or blocked, source/claim boundaries are visible, route is reproducible, and actual render was inspected when present.

#### Authority boundary
- No provider invocation, child Skill/tool orchestration, canonical mutation, invented data, or automatic handoff.

#### Handoff
- Suggest experiment or writing only as a separate explicit selection; never invoke either.

### Stop / Authority / Output Contract

- **Stop**: Stop after one figure asset or audit is delivered/blocked with source and claim boundaries, reproducible generation route, actual-render inspection when applicable, and bounded caption.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: figure asset or audit; editable/generation source or script; bounded caption; render inspection result when applicable.
- **Persistence**: `request-dependent`.
- **Required content**: source evidence; bounded claim; generation route; target-scale inspection; caption limits.

## `research-writing@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `model`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight", "managed"]`
- `managedBinding`: `{"capabilityId":"research.writing.case"}`
- `handoff`: `{"suggestedSkillIds":["research-review-case"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-writing/SKILL.md` | `100644` | `361f83c5598b7ae224031e6e815f5582d21dfc90` | 2785 | `7d0bb8f7ddac0e5a7034f698190d979c3bb91e1ec85004d3aff6c6b4e1ed2a10` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-writing/agents/openai.yaml` | `100644` | `a6cb95a749969931e20438ea9055db587461f384` | 288 | `d1f2477083c08a01a9f7af0ea1048725b4feb761cd89f38d1527146ad94c94fd` | excluded-host-projection | `—` |
| `skills/research-writing/references/academic-phrasebank.md` | `100644` | `fb0d762318a427e37cde4e48ef524b93ed1ccb16` | 5076 | `6e9e68ceb3ce732c54825de58e934dd2407e9e37410a0f92a5e8a63a78930370` | declared-member-source | `references/academic-phrasebank.md` |

### Material Method Obligations

- Lock exact requested surface: outline, draft, build, audit, revision, or rebuttal; read supplied files, paper repo, and current evidence first.
- Establish authoritative boundaries for claims, numbers, equations, citations, figures, and reviewer statements.
- Draft/revise within evidence while preserving claims, numbers, equations, notation, citations, and qualifiers unless explicitly authorized; disclose material changes.
- Load academic phrasebank on demand for calibrated hedging/transitions; phrase choice never strengthens evidence.
- When LaTeX is affected, run actual project build and report command, result, and warnings.
- Audit affected claims, numbers, equations, citation support, display references, and logic; map reviewer issues to evidence/manuscript/response deltas.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- Referee-side audit ownership remains with research-review-case.. Owner: named root/operator/external owner in obligation boundary.
- Citation/library/venue lookup tool execution remains root-selected and is not copied into package.. Owner: named root/operator/external owner in obligation boundary.
- No workflow state, port, prompt body, provider call, or source writing helper is bundled.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

| Package path | Role | Load | Visibility | Exact source path | SHA-256 | maxBytes |
|---|---|---|---|---|---|---:|
| `references/academic-phrasebank.md` | `reference` | `on-demand` | `worker-visible` | `skills/research-writing/references/academic-phrasebank.md` | `6e9e68ceb3ce732c54825de58e934dd2407e9e37410a0f92a5e8a63a78930370` | 5076 |

### Lean `SKILL.md` Outline

#### Prerequisites
- Exact requested manuscript surface, supplied files/paper repo, validated evidence, and authoritative claim/citation/reviewer boundaries.

#### Method
- Lock surface.
- Establish evidence boundary.
- Draft/revise inside it.
- Build actual LaTeX when touched.
- Audit affected surface.

#### Profiles
- lightweight: one bounded author-side writing case.
- managed: one separately approved research.writing.case for isolated/durable review.

#### Output contract
- Return only requested manuscript/revision/audit surface plus build evidence when applicable.
- Preserve or explicitly disclose changes to technical content.
- Managed execution returns strict Result plus pending Proposal using supplied IDs.

#### Stop conditions
- Stop when requested surface is delivered or blocked and missing evidence remains visible; do not continue into referee review.

#### Authority boundary
- No invented claims/citations/experiments/figures/proofs/reviewer statements/builds, nested execution, provider invocation, or canonical mutation.

#### Handoff
- Suggest research-review-case only for a separate referee-side audit; never invoke it.

### Stop / Authority / Output Contract

- **Stop**: Stop after requested author-side output is delivered/blocked, affected claims remain evidence-bound, technical content is preserved or deliberately changed, and missing evidence/build status is visible.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: requested author-side manuscript surface; build result/warnings when LaTeX is touched; claim/citation/reviewer audit when requested.
- **Persistence**: `request-dependent`.
- **Required content**: evidence boundary; preserved or explicit technical deltas; actual build evidence when applicable; visible blockers.

## `research-slides@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `model`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight"]`
- `managedBinding`: `null`
- `handoff`: `{"suggestedSkillIds":["research-experiment","research-figure","research-literature","research-writing"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-slides/NOTICE.md` | `100644` | `b730b7481c224e05e58a1a7e3b6fef3f37f29769` | 522 | `9f47bf488b6f43616be5b48a05616ea67a9970a4194b57c8e48d3dc4fe1723d1` | declared-member-source | `NOTICE.md` |
| `skills/research-slides/SKILL.md` | `100644` | `ebfb4e002e78529d54b872e4696298761bbf448e` | 2494 | `4e40d4310a176a23b1e6bc2b4c898c4f91ee19d99c7d490c4eab1bf2c4dbddb4` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-slides/agents/openai.yaml` | `100644` | `052bc47a6cbb9031d938c3eed4ab8209f726d21d` | 281 | `151e8f5f1b9250e733d3787b4bc400fb908fbd50b86ccf63b1cca3ed74bd9e83` | excluded-host-projection | `—` |

### Material Method Obligations

- Lock audience, goal, talk type, time/slide budget, language, anonymity, and evidence boundaries.
- Inspect papers, validated claims, writing/experiment artifacts, existing decks, and project-local slide tooling before drafting.
- Outline one main message per slide with source basis, time budget, and asset need; catalog exact source figures/tables/equations before visual work.
- Use the root/operator-selected project production route; preserve exact scientific assets unaltered.
- Render actual deck and inspect every slide for support, anonymity, fidelity, projector readability, placeholders, and timing; no render means no visual-QA claim.
- Keep speaker notes and spoken claims within same evidence boundary.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- No research.writing.slides capability is activated; package remains lightweight-only.. Owner: named root/operator/external owner in obligation boundary.
- Source-relative personal-slides handoff path, ppt-master orchestration, and provider/tool launch mechanics are excluded from SKILL.md.. Owner: named root/operator/external owner in obligation boundary.
- NOTICE.md is digest-bound root-only provenance and never enters worker Context.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

| Package path | Role | Load | Visibility | Exact source path | SHA-256 | maxBytes |
|---|---|---|---|---|---|---:|
| `NOTICE.md` | `reference` | `on-demand` | `root-only` | `skills/research-slides/NOTICE.md` | `9f47bf488b6f43616be5b48a05616ea67a9970a4194b57c8e48d3dc4fe1723d1` | 522 |

### Lean `SKILL.md` Outline

#### Prerequisites
- Talk contract, evidence sources, existing deck/tooling state, exact scientific assets, output route, and anonymity constraints.

#### Method
- Lock talk contract.
- Inspect evidence/tooling.
- Outline one message per slide.
- Produce through root-selected route.
- Render and audit every slide.

#### Profiles
- lightweight only; no managed slides capability or Dispatch binding.

#### Output contract
- Return talk contract, outline, deck or explicit blocker, and actual-render audit.
- Preserve source figures/tables/equations/logos exactly and keep notes evidence-bound.

#### Stop conditions
- Stop when contract, outline, rendered deck or blocker, and whole-deck audit exist; do not launch another production/review stage.

#### Authority boundary
- No provider/tool orchestration, child Skill invocation, invented evidence/render claim, canonical mutation, or automatic handoff.

#### Handoff
- Suggest figure/literature/experiment/writing routes only as separately selected work; never invoke them.

### Stop / Authority / Output Contract

- **Stop**: Stop after one bounded talk has contract, one-message-per-slide outline, rendered deck or explicit blocker, and actual-render audit with exact assets preserved.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: talk contract; slide outline; rendered deck or blocker; actual-render audit.
- **Persistence**: `request-dependent`.
- **Required content**: one message per slide; source basis and timing; exact asset preservation; anonymity check; projector-scale readability; speaker-note evidence bounds.

## `research-review-case@1.0.0`

### Package Contract

- `skillKind`: `bounded`
- `invocationSource`: `model`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight", "managed"]`
- `managedBinding`: `{"capabilityId":"research.audit.case"}`
- `handoff`: `{"suggestedSkillIds":[],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-review-case/SKILL.md` | `100644` | `ebb595d4b20dc2b40425988b17574d0f2a85dfa0` | 2548 | `a0d32da0809d94ecfb15099cff239e113e0ab50525338d433fb354ca568c3632` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-review-case/agents/openai.yaml` | `100644` | `14a20e8c611d3289524d81da411984828c2d7a4f` | 283 | `49fde40002e55a566c1bb7cc0cd48210c2d8a628d94100d7b37429602a5196dd` | excluded-host-projection | `—` |

### Material Method Obligations

- Load one submission once with stable line/exact-span anchors and copy audited claims verbatim.
- Select only evidence-assessable dimensions implied by claims: arithmetic, scope, methods, baselines, seeds, protocol, citations, proofs, or figures.
- For each substantive finding record exact anchor, discrepancy, observed evidence, false-positive risk, and separate unresolved questions; above-info findings require evidence.
- Grade citations as supporting, partial, limiting, contradicting, or unverified; use contradicting only when observed evidence supports opposite result.
- Close each dimension or mark blocked; durable status is incomplete, blocked, findings_present, or ready_for_human_review.
- For multi-paper root work, use one plain cases.md row per manuscript and keep sibling findings unread until case closure; no ranking or automated synthesis.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- Paper repair, accept/reject recommendation, misconduct/authorship verdict, and cross-paper ranking remain outside package authority.. Owner: named root/operator/external owner in obligation boundary.
- Human referee verdict and cross-paper synthesis remain root/human-owned.. Owner: named root/operator/external owner in obligation boundary.
- No external-fact search helper, case registry, reviewer fan-out, or source validator is bundled.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

- None.

### Lean `SKILL.md` Outline

#### Prerequisites
- One manuscript/submission, stable anchors, requested audit scope, and available supporting artifacts.

#### Method
- Load once and anchor claims.
- Select evidence-supported dimensions.
- Compare claims to evidence.
- Grade citation support.
- Close or block each dimension.

#### Profiles
- lightweight: one bounded root-session audit.
- managed: one separately approved independent research.audit.case; root owns any multi-reviewer synthesis.

#### Output contract
- Return anchored findings with discrepancy, observed evidence, false-positive risk, unresolved questions, citation grade, dimension closure, and case status.
- Managed execution returns strict Result plus pending Proposal using supplied IDs.

#### Stop conditions
- Stop when every requested dimension is closed or blocked and case is ready for human review or visibly incomplete/blocked.

#### Authority boundary
- Never edit audited material, issue paper verdicts, launch sibling reviewers, invoke providers, mutate canonical state, or auto-handoff.

#### Handoff
- No automatic or default next Skill; human/root selects any follow-up.

### Stop / Authority / Output Contract

- **Stop**: Stop after every requested dimension is closed or blocked, each substantive finding is exactly anchored and bounded, unresolved questions stay visible, and one case status is assigned.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: anchored referee-side findings; dimension closure record; case status.
- **Persistence**: `request-dependent`.
- **Required content**: verbatim claim/anchor; discrepancy; observed evidence; false-positive risk; unresolved questions; citation support grade; human-verdict boundary.

## `research-project-setup@1.0.0`

### Package Contract

- `skillKind`: `workflow`
- `invocationSource`: `operator-explicit`
- `entrypointType`: `model-context`
- `allowedProfiles`: `["lightweight", "managed"]`
- `managedBinding`: `{"capabilityId":"research.setup.project"}`
- `handoff`: `{"suggestedSkillIds":["research-quest-admin"],"autoInvoke":false}`

### Exact Source Objects

| Source path | Mode | Blob OID | Bytes | SHA-256 | Disposition | Package path |
|---|---:|---|---:|---|---|---|
| `skills/research-project-setup/SKILL.md` | `100644` | `fa8bc3d4652221b58266557ec8af5a6d38b555e7` | 2422 | `cda2c2a95d815ccf8b8ca5eebf0c7d9382f6b039ffda2632e60c4b847663c4d1` | semantic-method-source | `SKILL.md (lean semantic adaptation; source bytes not copied)` |
| `skills/research-project-setup/agents/openai.yaml` | `100644` | `4743c6ffada4a927a07af129414415ccc86bfec6` | 301 | `dd6f215a1ff2d5b525b871a399cf1c447ac941d2adce65abece213900cfbc9ed` | excluded-host-projection | `—` |
| `skills/research-project-setup/assets/manifest.yaml` | `100644` | `5120e1049908b7225d0e6cffad58a592e0b8709b` | 1395 | `8415cbaf9f767246c16fbb266993b3bfdbe52ac30404f35b961f97953a8e4070` | declared-member-source | `assets/manifest.yaml` |
| `skills/research-project-setup/assets/meta.gitignore` | `100644` | `1208963f49dc8f9878fb8d29c9b1945b48ded209` | 743 | `4c1a99e7925803469607c80d832377fbcd493cca0566b524cbba4d0bc0a91dda` | declared-member-source | `assets/meta.gitignore` |
| `skills/research-project-setup/assets/obsidian-vault/.graphifyignore` | `100644` | `40ef4a68bc230722e798b8d391643de44b750e53` | 778 | `85bbc7ca9a9cca0b6dd7f0b52ed1658c2915e644e7a585e798bd89da4ce92e43` | declared-member-source | `assets/obsidian-vault/.graphifyignore` |
| `skills/research-project-setup/assets/obsidian-vault/AGENTS.md` | `100644` | `5c33cf973938787f185551666e8e892fc8b5d6e9` | 6529 | `8282247af22f3c451fb3e18172c341ea7dcca17d1919cc5d985e28fe8fc9ae50` | excluded-source-orchestration-state | `—` |
|  |  |  |  |  | Reason | Excluded duplicate agent prompt body; package SKILL.md owns method. |
| `skills/research-project-setup/assets/obsidian-vault/_quest/.gitkeep` | `100644` | `4ccc3b162df0dbf1459f1b62f4c77c4b4e99dd65` | 28 | `fb4bf062bd10a7977ad9ba07c6bf7abf00c6bc2c3eef1162f6dcfb496530b299` | excluded-source-orchestration-state | `—` |
|  |  |  |  |  | Reason | Excluded source-local Quest state scaffold; Trellis owns canonical Quest state. |
| `skills/research-project-setup/assets/obsidian-vault/_references/citation-policy.md` | `100644` | `f60cd789a9e3c9ab9f8446e46496744db157adda` | 419 | `eb288d91f7c1a1dc389cc8a243b778d370fd7274735b953dab9875729f3ee391` | declared-member-source | `assets/obsidian-vault/_references/citation-policy.md` |
| `skills/research-project-setup/assets/obsidian-vault/_references/workflows.md` | `100644` | `236ac83860d6b849804c2a97498e4f37b3d6932d` | 2634 | `b0f9c713bab89fc986a3e293c84acef13eaad2b43ef3a33481e81769ca13ef68` | excluded-source-orchestration-state | `—` |
|  |  |  |  |  | Reason | Excluded source-local orchestration prompts, campaign/report-pack routing, and duplicate workflow method text. |
| `skills/research-project-setup/assets/obsidian-vault/_templates/experiment-note.md` | `100644` | `d9fc36c4d1a1c9c06591d7e13360e3909ee39d0d` | 230 | `91967a20650055424804b0e1a85e6b0e671adbfe8f5cac7ea187ee7dbf69fef8` | declared-member-source | `assets/obsidian-vault/_templates/experiment-note.md` |
| `skills/research-project-setup/assets/obsidian-vault/_templates/intake-audit.md` | `100644` | `251e6ab76b15512c33683f11ca685b69a72aed9c` | 765 | `da7870bda943f5beeaf492b70c7cfef575676b0994e4dcad2779855f424c25fa` | declared-member-source | `assets/obsidian-vault/_templates/intake-audit.md` |
| `skills/research-project-setup/assets/obsidian-vault/_templates/paper-note.md` | `100644` | `0b5505cbdd655e059abd111abe29c4cec6e5a608` | 357 | `ef42fc84ba4368e09fc1ae5bc2ab2002a23f8af6b3123a5a672ed04335d98d0c` | declared-member-source | `assets/obsidian-vault/_templates/paper-note.md` |
| `skills/research-project-setup/assets/obsidian-vault/computation/.gitkeep` | `100644` | `4ccc3b162df0dbf1459f1b62f4c77c4b4e99dd65` | 28 | `fb4bf062bd10a7977ad9ba07c6bf7abf00c6bc2c3eef1162f6dcfb496530b299` | declared-member-source | `assets/obsidian-vault/computation/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/experiments/.gitkeep` | `100644` | `8b137891791fe96927ad78e64b0aad7bded08bdc` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | declared-member-source | `assets/obsidian-vault/experiments/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/figures/.gitkeep` | `100644` | `4ccc3b162df0dbf1459f1b62f4c77c4b4e99dd65` | 28 | `fb4bf062bd10a7977ad9ba07c6bf7abf00c6bc2c3eef1162f6dcfb496530b299` | declared-member-source | `assets/obsidian-vault/figures/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/ideas/inbox.md` | `100644` | `bae1aea2aa4be3cf5b674cd272de359ead9f8873` | 514 | `4e1699f33713ae697ee06a788251d4c167f18822c22f95a34293fbe8746a8de3` | excluded-source-orchestration-state | `—` |
|  |  |  |  |  | Reason | Excluded legacy staged-pack inventory and workflow-shaped output routing. |
| `skills/research-project-setup/assets/obsidian-vault/ideas/questions.md` | `100644` | `e0397767b3d0f343e9fd82449f7f49185ed13dcf` | 54 | `22111f51058bd343ebe014e6847bbf0f48df8399b778bbacb4a20ee833b0c4e0` | declared-member-source | `assets/obsidian-vault/ideas/questions.md` |
| `skills/research-project-setup/assets/obsidian-vault/intake/.gitkeep` | `100644` | `8b137891791fe96927ad78e64b0aad7bded08bdc` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | declared-member-source | `assets/obsidian-vault/intake/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/literature-index.md` | `100644` | `26fd751f19f4b6d666e9bd1286533435b86db4ee` | 418 | `f02647040cda794a38327579edb5d54fb01ce7b7877108cecb78160406817110` | declared-member-source | `assets/obsidian-vault/literature-index.md` |
| `skills/research-project-setup/assets/obsidian-vault/literature/notes/.gitkeep` | `100644` | `8b137891791fe96927ad78e64b0aad7bded08bdc` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | declared-member-source | `assets/obsidian-vault/literature/notes/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/literature/pdfs/.gitkeep` | `100644` | `8b137891791fe96927ad78e64b0aad7bded08bdc` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | declared-member-source | `assets/obsidian-vault/literature/pdfs/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/literature/surveys/.gitkeep` | `100644` | `8b137891791fe96927ad78e64b0aad7bded08bdc` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | declared-member-source | `assets/obsidian-vault/literature/surveys/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/references.bib` | `100644` | `603b14f7c88d1985599e2709318abeea743ddef6` | 60 | `6e4c1678704dbb99fc3f5a3239b1b21a18df73b3d759244edd612956c7843132` | declared-member-source | `assets/obsidian-vault/references.bib` |
| `skills/research-project-setup/assets/obsidian-vault/slides/.gitkeep` | `100644` | `4ccc3b162df0dbf1459f1b62f4c77c4b4e99dd65` | 28 | `fb4bf062bd10a7977ad9ba07c6bf7abf00c6bc2c3eef1162f6dcfb496530b299` | declared-member-source | `assets/obsidian-vault/slides/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/theory/.gitkeep` | `100644` | `8b137891791fe96927ad78e64b0aad7bded08bdc` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | declared-member-source | `assets/obsidian-vault/theory/.gitkeep` |
| `skills/research-project-setup/assets/obsidian-vault/writing/.gitkeep` | `100644` | `8b137891791fe96927ad78e64b0aad7bded08bdc` | 1 | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | declared-member-source | `assets/obsidian-vault/writing/.gitkeep` |
| `skills/research-project-setup/assets/obsidian.gitignore` | `100644` | `a9f8ca63f341d0897b760ab49f81ab8c12a7ec3b` | 612 | `d4b5c963c18fe4bece6bb5457b7461599cc4009325ab853898e85901832f12d4` | declared-member-source | `assets/obsidian.gitignore` |
| `skills/research-project-setup/references/graphify.md` | `100644` | `f69ba78efeb59ed90b0c7bbf0ad8fc5d8e26282f` | 885 | `72474fdfcbfaef615369fd864e498e4a64729da0ce2726a07fd1c5aedfbc2f67` | declared-member-source | `references/graphify.md` |

### Material Method Obligations

- Bound requested operation, mutable paths, and explicit authority for repository init, moves, deletion, and commits.
- Inspect filesystem plus root/nested Git boundaries before advice or mutation; supplied listings remain declarations until verified.
- Design code, paper, notes, data, privacy, and Git/history separation; advice defaults to one compact target tree plus exactly six single-sentence migration steps.
- Execute only explicitly authorized operations and paths; never initialize, move, delete, or commit without authority.
- Project each selected scaffold member only by exact explicit member request; do not ambient-load the full scaffold.
- Load references/graphify.md only for explicit Graphify setup.
- Reinspect affected repositories and report actual path, boundary, ignored/tracked, output, mismatch, and blocker state.

### Excluded Host / Orchestration / State Responsibilities

- Host projection and implicit-invocation metadata; source `agents/openai.yaml`. Owner: schema-v3 skillKind/invocationSource/entrypointType/profile fields plus host adapter.
- Canonical Quest, gate, Workflow, Dispatch, Activation, Approval, Result, Proposal, Decision, and writer-state mutation. Owner: existing Trellis root commands, event store, gates, Workflow lifecycle, and Quest writer authority.
- Provider/model invocation, nested Skill/Worker/Workflow/capability/Procedure/Dispatch launch, and automatic continuation. Owner: root/operator and existing host/runtime authority.
- Managed Result/Proposal recording and Proposal acceptance/rejection. Owner: root-side lifecycle; worker returns strict Result plus pending Proposal only.
- No bundled Workflow DAG, campaign orchestration, automatic continuation, or step engine is created.. Owner: named root/operator/external owner in obligation boundary.
- Quest initialization/events/writer state remain with explicit research-quest-admin root commands; package only prepares project facts and stops.. Owner: named root/operator/external owner in obligation boundary.
- Source agents/openai.yaml, vault AGENTS.md, _references/workflows.md, _quest placeholder, and legacy ideas/inbox.md are excluded as host/prompt/orchestration/state surfaces.. Owner: named root/operator/external owner in obligation boundary.
- No Git init/move/delete/commit authority is inferred from package selection or managed Approval.. Owner: named root/operator/external owner in obligation boundary.

### Declared Members

| Package path | Role | Load | Visibility | Exact source path | SHA-256 | maxBytes |
|---|---|---|---|---|---|---:|
| `assets/manifest.yaml` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/manifest.yaml` | `8415cbaf9f767246c16fbb266993b3bfdbe52ac30404f35b961f97953a8e4070` | 1395 |
| `assets/meta.gitignore` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/meta.gitignore` | `4c1a99e7925803469607c80d832377fbcd493cca0566b524cbba4d0bc0a91dda` | 743 |
| `assets/obsidian-vault/.graphifyignore` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/.graphifyignore` | `85bbc7ca9a9cca0b6dd7f0b52ed1658c2915e644e7a585e798bd89da4ce92e43` | 778 |
| `assets/obsidian-vault/_references/citation-policy.md` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/_references/citation-policy.md` | `eb288d91f7c1a1dc389cc8a243b778d370fd7274735b953dab9875729f3ee391` | 419 |
| `assets/obsidian-vault/_templates/experiment-note.md` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/_templates/experiment-note.md` | `91967a20650055424804b0e1a85e6b0e671adbfe8f5cac7ea187ee7dbf69fef8` | 230 |
| `assets/obsidian-vault/_templates/intake-audit.md` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/_templates/intake-audit.md` | `da7870bda943f5beeaf492b70c7cfef575676b0994e4dcad2779855f424c25fa` | 765 |
| `assets/obsidian-vault/_templates/paper-note.md` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/_templates/paper-note.md` | `ef42fc84ba4368e09fc1ae5bc2ab2002a23f8af6b3123a5a672ed04335d98d0c` | 357 |
| `assets/obsidian-vault/computation/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/computation/.gitkeep` | `fb4bf062bd10a7977ad9ba07c6bf7abf00c6bc2c3eef1162f6dcfb496530b299` | 28 |
| `assets/obsidian-vault/experiments/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/experiments/.gitkeep` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | 1 |
| `assets/obsidian-vault/figures/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/figures/.gitkeep` | `fb4bf062bd10a7977ad9ba07c6bf7abf00c6bc2c3eef1162f6dcfb496530b299` | 28 |
| `assets/obsidian-vault/ideas/questions.md` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/ideas/questions.md` | `22111f51058bd343ebe014e6847bbf0f48df8399b778bbacb4a20ee833b0c4e0` | 54 |
| `assets/obsidian-vault/intake/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/intake/.gitkeep` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | 1 |
| `assets/obsidian-vault/literature-index.md` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/literature-index.md` | `f02647040cda794a38327579edb5d54fb01ce7b7877108cecb78160406817110` | 418 |
| `assets/obsidian-vault/literature/notes/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/literature/notes/.gitkeep` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | 1 |
| `assets/obsidian-vault/literature/pdfs/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/literature/pdfs/.gitkeep` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | 1 |
| `assets/obsidian-vault/literature/surveys/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/literature/surveys/.gitkeep` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | 1 |
| `assets/obsidian-vault/references.bib` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/references.bib` | `6e4c1678704dbb99fc3f5a3239b1b21a18df73b3d759244edd612956c7843132` | 60 |
| `assets/obsidian-vault/slides/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/slides/.gitkeep` | `fb4bf062bd10a7977ad9ba07c6bf7abf00c6bc2c3eef1162f6dcfb496530b299` | 28 |
| `assets/obsidian-vault/theory/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/theory/.gitkeep` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | 1 |
| `assets/obsidian-vault/writing/.gitkeep` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian-vault/writing/.gitkeep` | `01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b` | 1 |
| `assets/obsidian.gitignore` | `template` | `on-demand` | `worker-visible` | `skills/research-project-setup/assets/obsidian.gitignore` | `d4b5c963c18fe4bece6bb5457b7461599cc4009325ab853898e85901832f12d4` | 612 |
| `references/graphify.md` | `reference` | `on-demand` | `worker-visible` | `skills/research-project-setup/references/graphify.md` | `72474fdfcbfaef615369fd864e498e4a64729da0ce2726a07fd1c5aedfbc2f67` | 885 |

### Lean `SKILL.md` Outline

#### Prerequisites
- Explicit operation, allowed paths, mutation authority, target repository set, and any explicitly requested scaffold member paths.

#### Method
- Bound operation.
- Inspect filesystem/Git boundaries.
- Design target boundaries.
- Execute only authorized changes.
- Verify actual state.

#### Profiles
- lightweight: one bounded diagnosis/advice/setup unit.
- managed: one separately prepared and approved research.setup.project invocation with exact declared scope/members; still operator-explicit.

#### Output contract
- For advice: one compact target tree plus exactly six single-sentence migration steps unless user requests another count.
- For changes: exact performed paths/operations plus post-change verification and blockers.
- Managed execution returns strict Result plus pending Proposal using supplied IDs.

#### Stop conditions
- Stop after requested diagnosis/change is done or blocked and verification matches actual state; do not initialize Quest or continue into another workflow.

#### Authority boundary
- No inferred filesystem/Git authority, canonical Research mutation, child execution, provider invocation, Workflow DAG creation, or automatic handoff.

#### Handoff
- Suggest research-quest-admin only for a separate explicit Quest initialization/event action; never invoke it.

### Stop / Authority / Output Contract

- **Stop**: Stop when one requested workspace diagnosis/change is complete or blocked, boundaries and authority are explicit, actual state is reverified, and proposed operations remain distinct from performed operations.
- **Authority**:
  - Package performs one bounded unit and stops.
  - Package may read declared Context and write only request-authorized output paths.
  - Package never mutates canonical Research/Quest/gate/Workflow/lifecycle state.
  - Package never launches a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch.
  - Managed worker returns strict Result plus pending Proposal; root records/reviews it.
  - Handoff is declarative only and autoInvoke is false.
- **Primary output**: compact target tree plus six migration steps for advice; exact performed operations and verification for authorized changes.
- **Persistence**: `request-dependent`.
- **Required content**: allowed path boundary; Git/repository boundaries; data/privacy policy; proposed-versus-performed distinction; post-operation tracked/ignored/output verification; blockers.

## Resolved Evidence Decisions

### `research-project-setup` scaffold selection

- **Decision**: exactly **22** declared members, all `on-demand` and `worker-visible`; 21 are `template` members and `references/graphify.md` is a `reference` member.
- **Selection rule**: include the neutral project-boundary templates, every non-authoritative exact file needed to instantiate the explicitly requested vault scaffold and preserve its intended empty directories, and the explicit Graphify path. Exclude host projection, duplicate prompt/method text, source-local Quest state, campaign/report-pack orchestration, and legacy staged-pack routing.
- **Evidence**:
  - Frozen `research-project-setup/SKILL.md:12-16` requires bounded inspection/design/execution and permits copying `assets/obsidian-vault/` only on an explicit setup request.
  - Frozen `research-project-setup/SKILL.md:25` and `references/graphify.md:1-10` make Graphify an explicit on-demand path.
  - Frozen `assets/manifest.yaml:1-85` instantiates the code/paper/notes/data/provenance boundaries required by the method; `meta.gitignore` and `obsidian.gitignore` enforce the same repository/data/privacy boundaries.
  - C8 PRD `:79-81` requires exact explicitly selected scaffold assets; C8 design `:69-71` includes only method-required members and forbids state, orchestration, report packs, and duplicate prompt bodies.
  - Schema-v3 parser `execution-package.ts:285-359,421-435` requires safe sorted digest-bound members; existing packages establish exact on-demand template/reference conventions.

#### Exact 22-member subset

1. `assets/manifest.yaml`
2. `assets/meta.gitignore`
3. `assets/obsidian-vault/.graphifyignore`
4. `assets/obsidian-vault/_references/citation-policy.md`
5. `assets/obsidian-vault/_templates/experiment-note.md`
6. `assets/obsidian-vault/_templates/intake-audit.md`
7. `assets/obsidian-vault/_templates/paper-note.md`
8. `assets/obsidian-vault/computation/.gitkeep`
9. `assets/obsidian-vault/experiments/.gitkeep`
10. `assets/obsidian-vault/figures/.gitkeep`
11. `assets/obsidian-vault/ideas/questions.md`
12. `assets/obsidian-vault/intake/.gitkeep`
13. `assets/obsidian-vault/literature-index.md`
14. `assets/obsidian-vault/literature/notes/.gitkeep`
15. `assets/obsidian-vault/literature/pdfs/.gitkeep`
16. `assets/obsidian-vault/literature/surveys/.gitkeep`
17. `assets/obsidian-vault/references.bib`
18. `assets/obsidian-vault/slides/.gitkeep`
19. `assets/obsidian-vault/theory/.gitkeep`
20. `assets/obsidian-vault/writing/.gitkeep`
21. `assets/obsidian.gitignore`
22. `references/graphify.md`

#### Exact exclusions

- `skills/research-project-setup/agents/openai.yaml` — host projection owned by schema-v3 fields and host adapter.
- `skills/research-project-setup/assets/obsidian-vault/AGENTS.md` — duplicate agent prompt/method body containing campaign, Quest, and staged-control instructions.
- `skills/research-project-setup/assets/obsidian-vault/_quest/.gitkeep` — source-local Quest state scaffold; Trellis owns canonical Quest state and its single writer.
- `skills/research-project-setup/assets/obsidian-vault/_references/workflows.md` — Workflow prompts, campaign/report-pack routing, and duplicate method text.
- `skills/research-project-setup/assets/obsidian-vault/ideas/inbox.md` — legacy staged-pack inventory and workflow-shaped output routing.

### Exact `handoff.suggestedSkillIds`

- **Decision rule**: include every explicitly named Research Skill route that transfers work outside the package's bounded method; exclude host/tool routes and generic Quest-event notices. Generic Quest-event routing remains authority/stop text, matching the frozen literature source and accepted `research-literature@1.1.0` convention. `research-project-setup` retains `research-quest-admin` because source line 26 defines Quest initialization and post-setup event transfer as this method's explicit stop/handoff.
- **Parser constraint**: arrays are sorted and unique; every handoff has `autoInvoke=false` (`execution-package.ts:528-552`).

| Package | Exact `suggestedSkillIds` | Frozen source evidence |
|---|---|---|
| `research-synthesis` | `["research-opportunity-mining"]` | `skills/research-synthesis/SKILL.md:29` |
| `research-opportunity-mining` | `["research-ideation","research-literature"]` | `skills/research-opportunity-mining/SKILL.md:17`<br>`skills/research-opportunity-mining/SKILL.md:22` |
| `research-experiment` | `["research-computation"]` | `skills/research-experiment/SKILL.md:14` |
| `research-computation` | `["research-experiment","research-literature"]` | `skills/research-computation/SKILL.md:3`<br>`skills/research-computation/SKILL.md:23` |
| `research-theory` | `["research-experiment","research-literature","research-writing"]` | `skills/research-theory/SKILL.md:24` |
| `research-figure` | `["research-experiment","research-writing"]` | `skills/research-figure/SKILL.md:13` |
| `research-writing` | `["research-review-case"]` | `skills/research-writing/SKILL.md:26` |
| `research-slides` | `["research-experiment","research-figure","research-literature","research-writing"]` | `skills/research-slides/SKILL.md:23` |
| `research-review-case` | `[]` | `skills/research-review-case/SKILL.md:18-31 (no named Research Skill transfer)` |
| `research-project-setup` | `["research-quest-admin"]` | `skills/research-project-setup/SKILL.md:26` |

## Not Found

- No source helper or validator file exists inside these ten exact Skill directories; none is declared or copied.
- No current capability ID exists for synthesis, opportunity mining, figure, or slides; blueprints keep them lightweight-only.
- No Workflow DAG is proposed or created.

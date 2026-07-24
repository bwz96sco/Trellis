# Research: Bundled Procedure Content Matrix

- **Query**: Adapt nine Trellis-owned `trellis-research-*` fallback templates into exact content plans for 14 bundled Procedures.
- **Scope**: internal
- **Date**: 2026-07-24

## Findings

### Files Found

Only these Trellis-owned bundled fallback bodies were inspected:

| Source | Relevant sections |
|---|---|
| `packages/cli/src/templates/common/bundled-skills/trellis-research-setup/SKILL.md` | Stage purpose/responsibilities at lines 7-20; legacy-input limits at 22-32; authority at 34-43. |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-quest/SKILL.md` | Framing responsibilities at lines 7-20; authority at 22-31. |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-literature/SKILL.md` | Source/provenance responsibilities at lines 7-20; authority at 22-31. |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-ideation/SKILL.md` | Hypothesis generation/evaluation at lines 7-20; authority at 22-31. |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-experiment/SKILL.md` | Protocol/observation responsibilities at lines 7-20; authority at 22-31. |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-computation/SKILL.md` | Computation/reproducibility responsibilities at lines 7-20; authority at 22-31. |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-theory/SKILL.md` | Formal-claim responsibilities at lines 7-20; authority at 22-31. |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-audit/SKILL.md` | Evidence/claim audit responsibilities at lines 7-20; authority at 22-31. |
| `packages/cli/src/templates/common/bundled-skills/trellis-research-writing/SKILL.md` | Evidence synthesis responsibilities at lines 7-20; authority at 22-31. |

No unprefixed, private, external, or host-discovered Research Skill body was inspected.

### Canonical Manifest Shape

Use exact field order:

```text
schemaVersion, id, version, stage, kind, inputs, outputs,
networkPolicy, repositoryScope, maxDurationMinutes, maxDispatches, replaces
```

Bundled manifests omit `replaces`. Include both optional limits explicitly for all 14 entries. Canonical bytes should be compact `JSON.stringify`-equivalent bytes in frozen field order plus exactly one final LF:

```json
{"schemaVersion":1,"id":"<id>","version":"1.0.0","stage":"<stage>","kind":"<kind>","inputs":["dispatch","repository","context","artifacts","allowedWritePaths","expectedOutputs","checks"],"outputs":["result","proposal"],"networkPolicy":"<policy>","repositoryScope":"<scope>","maxDurationMinutes":15,"maxDispatches":1}
```

Exact common arrays for every Procedure:

```json
"inputs":["dispatch","repository","context","artifacts","allowedWritePaths","expectedOutputs","checks"]
"outputs":["result","proposal"]
```

Reason: these names match frozen normalized worker input and output contract. Procedure-specific semantics belong in `PROCEDURE.md`, not new undeclared input/output vocabulary.

### Seven-Section `PROCEDURE.md` Contract

Every file uses one H1 title, then exactly these seven H2 sections in order:

1. `## Purpose`
2. `## Preconditions`
3. `## Inputs`
4. `## Procedure`
5. `## Outputs`
6. `## Checks and Stop Conditions`
7. `## Authority Boundaries`

Common constraints:

- No YAML frontmatter, Skill names, Skill discovery, host-specific invocation, or dormant/trigger language.
- Inputs come only from normalized Context. No fallback reads of policy, registry, ledger, projections, sidecars, request files, Procedure roots, or Skill roots.
- Outputs remain exactly one strict `Result` plus one pending `Proposal` using supplied IDs.
- Never append events, mutate canonical projections, review/apply/reject Proposals, promote Claims, commit Git, broaden repository/write scope, launch Procedures/Dispatches/nested agents, request sandbox expansion, or claim unsupported completion.
- Network/multiple-repository workflow manifests describe root-side orchestration ceilings. Worker itself uses only supplied context/artifacts and never performs network or repository expansion.
- “Bounded Procedure” means safety-constrained; it does not require `kind:"bounded"`.

### Manifest Matrix

| Capability | Procedure | Source fallback | Kind | Network / repos | Limits |
|---|---|---|---|---|---|
| `research.setup.project` | `project-setup-v1@1.0.0` | `trellis-research-setup` | workflow | forbidden / single | 15 / 1 |
| `research.framing.quest` | `quest-framing-v1@1.0.0` | `trellis-research-quest` | bounded | forbidden / single | 15 / 1 |
| `research.framing.admin` | `quest-admin-v1@1.0.0` | `trellis-research-quest` | workflow | forbidden / single | 15 / 1 |
| `research.literature.scan` | `literature-scan-v1@1.0.0` | `trellis-research-literature` | bounded | forbidden / single | 15 / 1 |
| `research.literature.review` | `literature-review-v1@1.0.0` | `trellis-research-literature` | workflow | declared-only / multiple | 60 / 4 |
| `research.ideation.generate` | `idea-generation-v1@1.0.0` | `trellis-research-ideation` | bounded | forbidden / single | 15 / 1 |
| `research.ideation.evaluate` | `idea-evaluation-v1@1.0.0` | `trellis-research-ideation` | workflow | forbidden / single | 30 / 2 |
| `research.experiment.round` | `experiment-round-v1@1.0.0` | `trellis-research-experiment` | bounded | forbidden / single | 15 / 1 |
| `research.experiment.campaign` | `experiment-campaign-v1@1.0.0` | `trellis-research-experiment` | workflow | declared-only / multiple | 120 / 8 |
| `research.computation.case` | `computation-case-v1@1.0.0` | `trellis-research-computation` | bounded | forbidden / single | 15 / 1 |
| `research.theory.case` | `theory-case-v1@1.0.0` | `trellis-research-theory` | bounded | forbidden / single | 15 / 1 |
| `research.audit.case` | `review-case-v1@1.0.0` | `trellis-research-audit` | bounded | forbidden / single | 15 / 1 |
| `research.audit.campaign` | `review-campaign-v1@1.0.0` | `trellis-research-audit` | workflow | forbidden / multiple | 60 / 4 |
| `research.writing.case` | `writing-case-v1@1.0.0` | `trellis-research-writing` | bounded | forbidden / single | 15 / 1 |

All rows use common exact `inputs` and `outputs` arrays above.

### Procedure Content Plans

#### `project-setup-v1`

Source adaptation: setup responsibilities and legacy limits from `trellis-research-setup/SKILL.md:7-32`; common authority from lines 34-43.

1. **Purpose** — assess one project’s Research readiness and prepare a root-reviewed setup proposal; no direct registration or canonical mutation.
2. **Preconditions** — setup-stage Dispatch; explicit approval already handled by root; one validated repository; declared write paths only.
3. **Inputs** — objective/criteria, repository pointer, supplied workspace/repository/artifact context, optional declared legacy-source observations.
4. **Procedure** — verify declared Quest/repository prerequisites; identify missing bindings/portable refs; inspect only explicitly supplied legacy sources; distinguish portable tracked refs from machine-local observations; draft minimal setup changes.
5. **Outputs** — Result summarizes readiness/gaps; Proposal contains only root-reviewable registration/binding/artifact actions supported by output schema.
6. **Checks and Stop Conditions** — stop on missing repository identity, undeclared legacy source, path escape, unsupported mutation, or need to import/move/delete legacy data; tracked recommendations must not contain machine-local absolute paths.
7. **Authority Boundaries** — legacy sources remain untrusted/read-only; no migration-complete claim, second YAML/JSONL authority, Mempal write, event append, direct binding write, Git commit, or scope expansion.

#### `quest-framing-v1`

Source adaptation: framing responsibilities from `trellis-research-quest/SKILL.md:7-20`; authority from lines 22-31.

1. **Purpose** — convert declared objective into one bounded, falsifiable research question.
2. **Preconditions** — active framing-stage Dispatch; bounded automatic authority; supplied objective and acceptance criteria.
3. **Inputs** — Dispatch objective/criteria plus declared context/artifacts relevant to scope and evidence bar.
4. **Procedure** — state question; enumerate assumptions and exclusions; define evidence requirements; rewrite acceptance criteria into observable/falsifiable checks; avoid adding objectives.
5. **Outputs** — Result contains framing analysis; Proposal contains suggested framing fields or artifacts for root review.
6. **Checks and Stop Conditions** — stop if objective is ambiguous beyond supplied context, criteria cannot be tested, required evidence lies outside scope, or framing would require repository/network expansion.
7. **Authority Boundaries** — no Quest/stage/status mutation, no evidence invention, no external completion claim, no write beyond declared paths.

#### `quest-admin-v1`

Source adaptation: quest scope/criteria duties from `trellis-research-quest/SKILL.md:7-20`, narrowed into explicit root-side administration; authority from lines 22-31.

1. **Purpose** — evaluate and plan an administrative change to Quest framing, scope, evidence bar, or acceptance criteria.
2. **Preconditions** — framing-stage workflow Dispatch with explicit approval; requested administrative change is stated in objective/context.
3. **Inputs** — current framing material, requested change, rationale/evidence, declared repository/artifacts, checks.
4. **Procedure** — compare current and requested state; identify affected assumptions/exclusions/criteria; test internal consistency; produce ordered root-side change plan and rollback/deferral notes.
5. **Outputs** — Result records impact analysis; Proposal describes only supported canonical changes for root review.
6. **Checks and Stop Conditions** — stop on unstated scope expansion, missing rationale, contradictory criteria, unsupported lifecycle transition, or need for undeclared reads/writes.
7. **Authority Boundaries** — workflow label grants no mutation; do not change Quest/stage/status, launch follow-up Dispatches, or apply Proposal.

#### `literature-scan-v1`

Source adaptation: source relevance/provenance duties from `trellis-research-literature/SKILL.md:7-20`; authority from lines 22-31.

1. **Purpose** — scan a bounded supplied source set for material relevant to objective and criteria.
2. **Preconditions** — literature-stage bounded Dispatch; network forbidden; one repository; source artifacts already declared.
3. **Inputs** — objective/criteria, supplied citations/source artifacts/context, allowed outputs/checks.
4. **Procedure** — inspect only declared local sources; extract relevant claims and provenance; note conflicts, gaps, and uncertainty; avoid unsupported synthesis.
5. **Outputs** — Result contains source-by-source findings; Proposal registers or summarizes evidence only when supported.
6. **Checks and Stop Conditions** — stop when a source is unavailable, outside declared artifacts, unverifiable, or requires network retrieval; mark gaps instead of fetching.
7. **Authority Boundaries** — no network, repository expansion, citation fabrication, Claim promotion, or canonical evidence mutation.

#### `literature-review-v1`

Source adaptation: comparison/provenance duties from `trellis-research-literature/SKILL.md:7-20`, expanded only as root-orchestrated workflow; authority from lines 22-31.

1. **Purpose** — synthesize and compare a broader approved literature corpus across root-supplied batches.
2. **Preconditions** — explicit workflow approval; declared-only network/multiple-repository needs handled by root; worker receives contained source snapshots/artifacts only.
3. **Inputs** — supplied source corpus, provenance, prior scan Results, objective/criteria, conflict/gap context.
4. **Procedure** — group sources by question/method; compare agreement and contradiction; assess provenance/evidence strength; identify unresolved gaps; produce review synthesis and next-step plan.
5. **Outputs** — Result contains comparative review; Proposal contains evidence/claim suggestions or root-side follow-up plan.
6. **Checks and Stop Conditions** — stop on missing provenance, corpus drift, undeclared repository/source, need for direct network access, or inability to separate evidence from interpretation.
7. **Authority Boundaries** — do not fetch network sources, traverse additional repositories, launch scan Dispatches, promote Claims, or treat approval as worker authority expansion.

#### `idea-generation-v1`

Source adaptation: hypothesis generation from `trellis-research-ideation/SKILL.md:7-20`; authority from lines 22-31.

1. **Purpose** — generate bounded, testable hypotheses or solution directions from declared context.
2. **Preconditions** — ideation-stage bounded Dispatch; one repository; no network; acceptance criteria available.
3. **Inputs** — objective/criteria, supplied evidence/context/artifacts, expected outputs/checks.
4. **Procedure** — derive multiple distinct candidates; state assumptions and mechanism; define falsifier/test for each; avoid ranking beyond supplied evidence.
5. **Outputs** — Result lists candidate set and uncertainties; Proposal suggests candidate artifacts or next root-reviewed step.
6. **Checks and Stop Conditions** — reject duplicates, non-testable ideas, unsupported certainty, scope expansion, or candidates requiring forbidden authority.
7. **Authority Boundaries** — no canonical selection, Claim promotion, experiment launch, Dispatch creation, or undeclared write.

#### `idea-evaluation-v1`

Source adaptation: alternative comparison from `trellis-research-ideation/SKILL.md:17-20`, split from generation into explicit workflow; authority from lines 22-31.

1. **Purpose** — evaluate and rank a supplied candidate set against evidence and acceptance criteria.
2. **Preconditions** — explicit ideation workflow; candidates already supplied; evaluation criteria declared.
3. **Inputs** — candidate hypotheses/directions, evidence/context, acceptance criteria, constraints, checks.
4. **Procedure** — apply one stated comparison rubric; score strengths/risks/testability; identify dominated or incomparable candidates; recommend root-reviewed ordering and validation work.
5. **Outputs** — Result records transparent evaluation; Proposal recommends candidate status or follow-up plan without applying it.
6. **Checks and Stop Conditions** — stop on missing candidates/rubric/evidence, hidden scope changes, unsupported numeric precision, or need for new experiments/network data.
7. **Authority Boundaries** — no final canonical choice, lifecycle mutation, experiment launch, capability chaining, or Proposal application.

#### `experiment-round-v1`

Source adaptation: protocol/control/measurement duties from `trellis-research-experiment/SKILL.md:7-20`; authority from lines 22-31.

1. **Purpose** — execute or analyze one bounded empirical round under a declared protocol.
2. **Preconditions** — bounded experiment Dispatch; protocol, controls, measurements, stopping conditions, data, and allowed writes supplied.
3. **Inputs** — protocol/context, declared artifacts/data, commands/checks, expected outputs, allowed paths.
4. **Procedure** — verify protocol prerequisites; execute only declared round; record commands/parameters/observations/failures; preserve raw artifacts; compare measurements with criteria.
5. **Outputs** — Result reports round outcome and reproducibility; Proposal registers artifacts/evidence or recommends next root-reviewed action.
6. **Checks and Stop Conditions** — stop on protocol ambiguity, unsafe/undeclared command, missing control/data, path escape, stopping-condition hit, or unexpected external dependency.
7. **Authority Boundaries** — no protocol rewrite, campaign orchestration, next Dispatch launch, Claim promotion, Git commit, or scope broadening.

#### `experiment-campaign-v1`

Source adaptation: experiment protocol/reproducibility duties from `trellis-research-experiment/SKILL.md:7-20`, split into root-orchestrated campaign workflow; authority from lines 22-31.

1. **Purpose** — design or synthesize a multi-round empirical campaign while keeping every execution root-controlled.
2. **Preconditions** — explicit workflow approval; multiple repositories/network needs handled by root; supplied round Results/artifacts are fixed inputs.
3. **Inputs** — campaign objective, protocol family, supplied prior rounds, repository/artifact snapshots, budget/limits, checks.
4. **Procedure** — define round sequence and decision points; compare supplied round outcomes; track controls/parameter coverage/stopping rules; propose separately validated future rounds.
5. **Outputs** — Result contains campaign synthesis/plan; Proposal contains root-side round/artefact/evidence actions supported by schema.
6. **Checks and Stop Conditions** — stop on budget/limit breach, incomparable rounds, provenance gaps, need for direct network/repository expansion, or request to self-launch work.
7. **Authority Boundaries** — maxDispatches is orchestration ceiling, not launch authority; no nested agents, Dispatch creation, network fetch, cross-repository traversal, or canonical campaign mutation.

#### `computation-case-v1`

Source adaptation: declared computation and reproducibility duties from `trellis-research-computation/SKILL.md:7-20`; authority from lines 22-31.

1. **Purpose** — implement/run one bounded computational analysis from declared data, parameters, and checks.
2. **Preconditions** — computation-stage bounded Dispatch; scripts/data/parameters and allowed paths declared; network forbidden.
3. **Inputs** — objective, computation specification, supplied datasets/artifacts, commands/checks, expected outputs.
4. **Procedure** — verify data/parameter identity; implement minimal analysis; run declared commands; capture versions/parameters/results; preserve generated artifacts and numerical caveats.
5. **Outputs** — Result reports commands, outputs, caveats, reproducibility; Proposal registers artifacts/evidence or root-reviewed follow-up.
6. **Checks and Stop Conditions** — stop on missing data, undeclared dependency/download, non-reproducible environment, numerical instability, path escape, or check failure.
7. **Authority Boundaries** — no package/network acquisition, dataset expansion, canonical mutation, Claim promotion, or Git commit.

#### `theory-case-v1`

Source adaptation: assumptions/proof obligations and result classification from `trellis-research-theory/SKILL.md:7-20`; authority from lines 22-31.

1. **Purpose** — derive or check one formal claim under explicit assumptions and proof obligations.
2. **Preconditions** — theory-stage bounded Dispatch; target claim/problem and permitted context supplied.
3. **Inputs** — formal statement, assumptions, definitions, supplied references/artifacts, checks/expected output.
4. **Procedure** — normalize statement; enumerate assumptions; derive steps or construct counterexample; separate established result, conjecture, and unresolved obligation; test internal consistency.
5. **Outputs** — Result contains derivation/counterexample/gaps; Proposal suggests evidence/claim updates for root review.
6. **Checks and Stop Conditions** — stop on undefined terms, hidden assumptions, circular reasoning, missing proof obligation, or need for undeclared computation/source.
7. **Authority Boundaries** — no unsupported theorem claim, Claim promotion, external completion claim, canonical mutation, or scope expansion.

#### `review-case-v1`

Source adaptation: evidence/reproducibility audit from `trellis-research-audit/SKILL.md:7-20`; authority from lines 22-31.

1. **Purpose** — independently audit one bounded evidence/claim package against acceptance criteria.
2. **Preconditions** — audit-stage bounded Dispatch; one repository; exact evidence, commands, artifacts, claims, and criteria supplied.
3. **Inputs** — declared evidence/claims/artifacts, provenance, commands/checks, acceptance criteria.
4. **Procedure** — trace each claim to evidence; verify artifact/provenance consistency; assess command reproducibility from supplied material; list contradictions, missing support, and residual risk.
5. **Outputs** — Result contains pass/fail/uncertain findings with reasons; Proposal recommends root-reviewed evidence/claim/status actions.
6. **Checks and Stop Conditions** — stop on missing evidence, unreadable artifact, provenance break, undeclared repository/path, or request to repair source during audit.
7. **Authority Boundaries** — independent review only; no evidence rewrite, Claim promotion, Proposal application/rejection, Git commit, or completion claim.

#### `review-campaign-v1`

Source adaptation: audit responsibilities from `trellis-research-audit/SKILL.md:7-20`, split into explicit multi-repository campaign; authority from lines 22-31.

1. **Purpose** — plan or synthesize a root-orchestrated audit campaign across multiple supplied review packages.
2. **Preconditions** — explicit workflow approval; repository set and case Results/artifacts supplied by root; no direct network need.
3. **Inputs** — campaign criteria, supplied review cases, evidence/claim inventories, repository/artifact snapshots, limits/checks.
4. **Procedure** — define coverage matrix; compare case findings; identify systemic contradictions/provenance/reproducibility failures; prioritize root-side remediation and follow-up cases.
5. **Outputs** — Result contains campaign-level assurance/gaps; Proposal contains supported root-side remediation or follow-up plan.
6. **Checks and Stop Conditions** — stop on incomplete repository set, inconsistent audit criteria, missing case provenance, limit breach, or request to launch/repair work directly.
7. **Authority Boundaries** — no cross-repository traversal beyond supplied artifacts, no new Dispatches, no canonical status/Claim mutation, no Proposal decision.

#### `writing-case-v1`

Source adaptation: evidence synthesis and citation/uncertainty duties from `trellis-research-writing/SKILL.md:7-20`; authority from lines 22-31.

1. **Purpose** — synthesize approved evidence and claims into one bounded requested research output.
2. **Preconditions** — writing-stage bounded Dispatch; source evidence/claims and target format/path supplied; one repository; network forbidden.
3. **Inputs** — approved evidence/claims/context/artifacts, objective/audience, expected output, allowed paths, checks.
4. **Procedure** — build evidence-to-claim outline; draft only supported statements; preserve citations/provenance; separate findings, limitations, uncertainty, and proposals; write only declared output.
5. **Outputs** — Result summarizes written artifact and checks; Proposal registers artifact or recommends root-reviewed follow-up.
6. **Checks and Stop Conditions** — stop on unsupported claim, missing citation, conflicting evidence without disclosure, undeclared output path, or request to invent completion.
7. **Authority Boundaries** — no new evidence/Claim authority, Claim promotion, canonical mutation, network research, Proposal decision, or Git commit.

### Content Reuse Rules

- Adapt responsibilities and constraints; do not copy full Skill bodies verbatim.
- Remove Skill frontmatter, Skill name, trigger/dormancy wording, host mechanics, and any implication that a Procedure selects itself.
- Preserve root-only mutation, Result-plus-pending-Proposal, repository/write containment, evidence honesty, and no-Git constraints.
- Workflow splits remain conservative: admin/evaluate/review/campaign Procedures plan or synthesize root-side work; they do not self-orchestrate, launch Dispatches, use network, or traverse multiple repositories.
- All unnamed siblings beside `procedure.json` and `PROCEDURE.md`, regular or non-regular, are ignored without enumeration. The two registry-bound named files alone are authoritative.

### Readiness

**Ready for C04 content implementation.**

All 14 bundled Procedure manifests and instruction bodies can now be authored from Trellis-owned fallback content plus frozen decisions. No missing product decision remains for C04 content.

Implementation still needs exact final English bytes and golden digest vectors, but those are authoring/test outputs, not unresolved product semantics. Additive packed Procedure presence proof belongs C04; retain current Skill positive inventory. C09 later adds Skill negative/removal proof and final cutover inventory.

### External References

None. No web/network research performed.

### Related Specs

- `.trellis/spec/core/backend/research-state.md` — registry and Research public boundary.
- `.trellis/spec/cli/backend/filesystem-safety.md` — exact bytes and containment.
- `.trellis/spec/cli/backend/release-process.md` — C04 additive Procedure presence; C09 Skill removal.
- `.trellis/spec/cli/unit-test/conventions.md` — exact digest vectors.

## Caveats / Not Found

- Existing fallback bodies are stage-level, not one-to-one Procedure bodies. Workflow variants above are conservative adaptations, not verbatim historical behavior.
- Manifest `inputs`/`outputs` vocabulary was not previously frozen. Proposed arrays intentionally use only frozen normalized worker input/output field names, avoiding new runtime semantics.

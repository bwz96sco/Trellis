# Wave-8 / R2A Frozen v1.2 Source-Evidence Gap Audit

- **Query**: Independently determine which R2A artifact-lifecycle, closure, and validator rules are semantically derivable from public frozen `evaluation-contract-v1.2.0` evidence; correct R0 overclaims; separate safe enforcement from blocked checks; recommend minimum forward repair.
- **Scope**: Internal, public repository evidence only. Private Skill source bodies, tests, prompts, cases, and raw outputs were not inspected or copied.
- **Audit date**: 2026-08-03
- **Frozen methodology contract**: `evaluation-contract-v1.2.0`
- **Frozen methodology digest**: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- **Private source evidence commit, identity only**: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c`
- **Infrastructure pin**: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Verdict

**FAIL CLOSED — R2A artifact-lifecycle semantic enforcement is blocked under public frozen v1.2 evidence.**

Public frozen v1.2 evidence declares artifact spellings, package association, `durable_runtime` classification, planned `procedure-artifact-contract` mapping, family terminal vocabulary, differential case labels, and broad authority boundaries. It does **not** declare concrete artifact-by-artifact values or rules for any of these 13 requested lifecycle dimensions:

1. requiredness
2. cardinality
3. media type
4. producer
5. consumer
6. repository/artifact identity relation
7. stable ID
8. provenance
9. dependencies
10. immutable fields
11. transitions
12. terminal applicability
13. cross-artifact consistency

Later Phase-2 files supply field-name/type descriptors, generic transitions, stable error names, and implementation plans. Procedure `2.0.2` supplies generic defaults. Those records postdate the frozen v1.2 target and cannot create frozen-v1.2 semantics.

Closure evidence binds high-level selected/blocked cases to four public families, but does not define canonical pre-record fields or derivation sources. Frozen evidence does not authorize `Result.status` heuristics. Exact Trellis validator `(id, version)` bindings are absent. R0 proves addressability and planned destinations, not semantic derivability.

## Audit Rules

This audit applies these fail-closed distinctions:

| Class | Meaning | Can support R2A semantic enforcement? |
|---|---|---|
| Exact frozen declaration | Concrete value/rule contained in public evidence covered by frozen target | Yes, within declared scope |
| Field-name/type descriptor | Says a future contract must contain a field, but supplies no artifact-specific value | No |
| Planned destination | Says where future code/evidence should exist | No |
| Later default | Value introduced by Procedure/runtime implementation after freeze | No |
| Lossy skeleton | Later generic contract that does not preserve source artifact set or exact semantics | No |
| Runtime behavior | Post-freeze behavior observed in current code/tests | No; comparison evidence only |

No media type is inferred from a filename extension. No requiredness/cardinality is inferred from prose or artifact presence in an inventory. No producer/consumer relation is inferred from package ownership. No closure fact is inferred from `Result.status`. No later runtime behavior is projected backward into frozen v1.2.

## Source Inventory

### Authoritative public frozen-v1.2 chain

| Source | Role | Key locations |
|---|---|---|
| `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/evaluation-contract-v1.2.0.md` | Freeze label, timestamp, digest | lines 1–7 |
| `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/frozen-migration-target-v1.2.json` | Frozen target and public reference graph | `/refs`, `/phase2_requirements_summary`, per-family records |
| `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/normalized-workflow-inventory-v1.2.json` | Family inventory, durable output spellings, terminals, evidence references | `/workflows/*` |
| `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/io-mapping-ledger-v1.2.csv` | Artifact spelling, class, mapping, status | rows cited in checkpoint tables |
| `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/differential-test-matrix-v1.2.json` | Public behavioral case labels and expected disposition | `/cases/*` |
| `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/phase2-improve-register-v1.2.json` | Explicit Phase-2 improvement requirements | `/items/*` |
| `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/phase-2-differential-handoff-v1.2.md` | Frozen differential handoff context | whole file |

`frozen-migration-target-v1.2.json` summarizes the artifact-contract source as `durable_runtime_outputs + io ledger`. Those sources identify outputs and mapping intent. They do not contain the requested 13 artifact-specific lifecycle dimensions.

### Supporting public assurance evidence

| Source | What it proves | What it does not prove |
|---|---|---|
| `.trellis/tasks/archive/2026-07/07-28-audit-research-workflow-validator-assurance/research/validator-inventory.json` | 18 source validator path/hash records | Stable Trellis validator IDs, versions, or per-checkpoint bindings |
| `.trellis/tasks/archive/2026-07/07-28-audit-research-workflow-validator-assurance/research/validator-assurance-report.md` | Source-maintained tests passed twice; no mutation | Complete per-rule enforcement. Lines 45–46 expressly retain under-enforced prose-only rules pending Phase-2 mapping. |

### Post-freeze comparison evidence — not frozen-v1.2 authority

| Source | Classification | Reason excluded as frozen semantics |
|---|---|---|
| `.trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/methodology-contract-freeze.json` | Later Phase-2 freeze/skeleton | `/frozenAt` is `2026-07-29T15:07:05Z`, after v1.2 freeze `2026-07-29T07:34:14Z`; first committed at `b5483bc2feac6d69923087440fc60d53875ee040` on `2026-07-30T08:52:48+08:00` |
| `.trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/artifact-and-validator-contract.md` | Planned contract shape | Lines 5–16 list fields to record; they do not supply artifact-specific values. Lines 20–23 state desired validator timing/authority, not exact frozen bindings. |
| `.trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/ideation-closure-disposition.md` | Later interpretation | Lines 9–20 assign generation/evaluation ownership; line 24 claims compatibility, but file is not covered by frozen target digest. |
| `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/r0-methodology-derivability-matrix.json` | Addressability/planning matrix | All source locations point to later Phase-2 files; all `planned203Destinations` say `planned-not-produced-by-r0`. |
| `packages/cli/src/templates/research/procedures/*/2.0.2/methodology/**` | Later Procedure skeletons/defaults | Generic contracts and universal validator set introduced after freeze |
| `packages/core/src/research/methodology-*.ts` and CLI dispatch | Current runtime behavior | Post-freeze implementation; useful only for locating unsafe assumptions |
| Wave-7 activation/cutover evidence | Packaging and execution evidence | Cannot add missing source semantics |

## What Public Frozen v1.2 Actually Declares

For each retained artifact below, public evidence supports only:

- exact artifact spelling in `normalized-workflow-inventory-v1.2.json`;
- exact package association;
- `durable_runtime` class in `io-mapping-ledger-v1.2.csv`;
- planned mapping label `procedure-artifact-contract`;
- mapping status `mapped`.

These facts do not establish repository `ArtifactRef` semantics, existence requirements, multiplicity, media type, lifecycle authority, or any other requested contract rule.

## Global Lifecycle-Dimension Gap Matrix

This matrix applies independently to every one of the 50 retained lifecycle checkpoints.

| Requested dimension | Exact public frozen-v1.2 artifact value/rule? | Later Phase-2 material | Audit disposition |
|---|---|---|---|
| Requiredness | No | Descriptor field `requiredness`; Procedure `2.0.2` commonly defaults `required` | Blocked |
| Cardinality | No | Descriptor field/cardinality; Procedure `2.0.2` commonly defaults `1` | Blocked |
| Media type | No | Descriptor says `string`; Procedure `2.0.2` commonly uses `text/markdown` | Blocked; extension inference forbidden |
| Producer | No | Phase-2 freeze sets family name; Procedure parser defaults `worker` | Blocked |
| Consumer | No | Phase-2 freeze uses `downstream_or_root`; Procedure parser defaults `root` | Blocked |
| Repository/artifact identity relation | No | Planned contract/path fields and later path patterns | Blocked |
| Stable ID | No artifact-specific field/rule | Descriptor permits `string|null`; later generic drift validator | Blocked |
| Provenance | No artifact-specific schema/rule | Descriptor says `object`; later generic drift validator | Blocked |
| Dependencies | No | Listed as desired contract content in later prose | Blocked |
| Immutable fields | No | Descriptor-level `immutable` flags on future fields | Blocked |
| Transitions | No | Generic `inputs_available` → `validators_pass` / `critical_validator_fail` skeleton | Blocked |
| Terminal applicability | No artifact-specific rule | Later skeleton copies family terminal lists to every checkpoint | Blocked |
| Cross-artifact consistency | No | Listed as desired contract content in later prose | Blocked |

Important distinction: descriptor metadata such as a future field being required or immutable is **not** the value/rule for the artifact represented by that field.

## Per-Family / Per-Checkpoint Gap Table

Code `G13` means all 13 requested lifecycle dimensions in the global matrix are not semantically derivable for that checkpoint. `ID` means only artifact spelling/package/class/mapping/status are exact public facts.

### `research-review-case` — 12 retained of 22 public durable outputs

Public identity source: `normalized-workflow-inventory-v1.2.json` `/workflows/0/durable_runtime_outputs/*`; IO ledger rows 2–13. Later Phase-2 pointers: `methodology-contract-freeze.json` `/packages/0/checkpoints/0..11`.

| # | Artifact identity | Public pointer | Exact | Gap |
|---:|---|---|---|---|
| 1 | `REVIEW_CASE_STATUS.md` | `/workflows/0/durable_runtime_outputs/0` | ID | G13 |
| 2 | `adjudicator-gates.md` | `/workflows/0/durable_runtime_outputs/1` | ID | G13 |
| 3 | `artifact-manifest.json` | `/workflows/0/durable_runtime_outputs/2` | ID | G13 |
| 4 | `claims-ledger.json` | `/workflows/0/durable_runtime_outputs/3` | ID | G13 |
| 5 | `dimension-adversarial.md` | `/workflows/0/durable_runtime_outputs/4` | ID | G13 |
| 6 | `dimension-baseline.md` | `/workflows/0/durable_runtime_outputs/5` | ID | G13 |
| 7 | `dimension-citation.md` | `/workflows/0/durable_runtime_outputs/6` | ID | G13 |
| 8 | `dimension-consistency.md` | `/workflows/0/durable_runtime_outputs/7` | ID | G13 |
| 9 | `dimension-eval-design.md` | `/workflows/0/durable_runtime_outputs/8` | ID | G13 |
| 10 | `dimension-experiment.md` | `/workflows/0/durable_runtime_outputs/9` | ID | G13 |
| 11 | `dimension-ledger.md` | `/workflows/0/durable_runtime_outputs/10` | ID | G13 |
| 12 | `dimension-novelty.md` | `/workflows/0/durable_runtime_outputs/11` | ID | G13 |

Public v1.2 also lists 10 durable outputs omitted by the 50-checkpoint Phase-2 set: `dimension-presentation.md`, `dimension-proof.md`, `dimension-style-impressions.md`, `finding-contract.md`, `findings/`, `findings/<dimension>.findings.json`, `hack-pattern-taxonomy.md`, `observability-and-independence.md`, `pattern-routing.md`, `review-case.yaml`. No public frozen rule authorizes a first-12 cap or says those 10 are outside lifecycle coverage.

### `research-review-campaign` — 3 of 3

Public identity source: `/workflows/1/durable_runtime_outputs/0..2`; IO ledger rows 42–44. Later Phase-2 pointers: `/packages/1/checkpoints/0..2`.

| # | Artifact identity | Public pointer | Exact | Gap |
|---:|---|---|---|---|
| 1 | `CAMPAIGN_CLOSURE.md` | `/workflows/1/durable_runtime_outputs/0` | ID | G13 |
| 2 | `review-campaign.yaml` | `/workflows/1/durable_runtime_outputs/1` | ID | G13 |
| 3 | `review-case.yaml` | `/workflows/1/durable_runtime_outputs/2` | ID | G13 |

### `research-project-setup` — 9 of 9

Public identity source: `/workflows/5/durable_runtime_outputs/0..8`; IO ledger rows 194–202. Later Phase-2 pointers: `/packages/5/checkpoints/0..8`.

| # | Artifact identity | Public pointer | Exact | Gap |
|---:|---|---|---|---|
| 1 | `AGENTS.md` | `/workflows/5/durable_runtime_outputs/0` | ID | G13 |
| 2 | `SUMMARY.md` | `/workflows/5/durable_runtime_outputs/1` | ID | G13 |
| 3 | `artifacts/intake/state_audit.md` | `/workflows/5/durable_runtime_outputs/2` | ID | G13 |
| 4 | `assets/manifest.yaml` | `/workflows/5/durable_runtime_outputs/3` | ID | G13 |
| 5 | `graph.html` | `/workflows/5/durable_runtime_outputs/4` | ID | G13 |
| 6 | `graph.json` | `/workflows/5/durable_runtime_outputs/5` | ID | G13 |
| 7 | `graphify-out/GRAPH_REPORT.md` | `/workflows/5/durable_runtime_outputs/6` | ID | G13 |
| 8 | `literature-index.md` | `/workflows/5/durable_runtime_outputs/7` | ID | G13 |
| 9 | `manifest.yaml` | `/workflows/5/durable_runtime_outputs/8` | ID | G13 |

### `research-experiment-campaign` — 12 retained of 16 public durable outputs

Public identity source: `/workflows/7/durable_runtime_outputs/0..15`; IO ledger rows 252–263 for retained outputs. Later Phase-2 pointers: `/packages/7/checkpoints/0..11`.

| # | Artifact identity | Public pointer | Exact | Gap |
|---:|---|---|---|---|
| 1 | `03_run_plan.md` | `/workflows/7/durable_runtime_outputs/0` | ID | G13 |
| 2 | `MANIFEST.md` | `/workflows/7/durable_runtime_outputs/1` | ID | G13 |
| 3 | `README.md` | `/workflows/7/durable_runtime_outputs/2` | ID | G13 |
| 4 | `analysis_campaign.md` | `/workflows/7/durable_runtime_outputs/3` | ID | G13 |
| 5 | `campaign_data/<campaign>/MANIFEST.md` | `/workflows/7/durable_runtime_outputs/4` | ID | G13 |
| 6 | `campaign_data/<campaign>/README.md` | `/workflows/7/durable_runtime_outputs/5` | ID | G13 |
| 7 | `campaign_data/<campaign>/report_provenance.json` | `/workflows/7/durable_runtime_outputs/6` | ID | G13 |
| 8 | `campaigns/<id>.yaml` | `/workflows/7/durable_runtime_outputs/7` | ID | G13 |
| 9 | `claim_ledger.csv` | `/workflows/7/durable_runtime_outputs/8` | ID | G13 |
| 10 | `execution_log.md` | `/workflows/7/durable_runtime_outputs/9` | ID | G13 |
| 11 | `report_provenance.json` | `/workflows/7/durable_runtime_outputs/10` | ID | G13 |
| 12 | `reports/<campaign>/index.html` | `/workflows/7/durable_runtime_outputs/11` | ID | G13 |

Public v1.2 also lists four omitted durable outputs: `reports/<campaign>/rounds/<round-id>.html`, `reports/<campaign>/rounds/<round_id>.html`, `results_ledger.csv`, `run_matrix.yaml`. No frozen source declares a first-12 rule.

### `research-computation` — 9 of 9

Public identity source: `/workflows/8/durable_runtime_outputs/0..8`; IO ledger rows 278–286. Later Phase-2 pointers: `/packages/8/checkpoints/0..8`.

| # | Artifact identity | Public pointer | Exact | Gap |
|---:|---|---|---|---|
| 1 | `computation_nodes.jsonl` | `/workflows/8/durable_runtime_outputs/0` | ID | G13 |
| 2 | `evidence/01_computation_brief.md` | `/workflows/8/durable_runtime_outputs/1` | ID | G13 |
| 3 | `evidence/02_environment_preflight.md` | `/workflows/8/durable_runtime_outputs/2` | ID | G13 |
| 4 | `evidence/03_execution_log.md` | `/workflows/8/durable_runtime_outputs/3` | ID | G13 |
| 5 | `evidence/04_validation_report.md` | `/workflows/8/durable_runtime_outputs/4` | ID | G13 |
| 6 | `evidence/05_claim_handoff.md` | `/workflows/8/durable_runtime_outputs/5` | ID | G13 |
| 7 | `evidence/MANIFEST.md` | `/workflows/8/durable_runtime_outputs/6` | ID | G13 |
| 8 | `evidence/computation_nodes.jsonl` | `/workflows/8/durable_runtime_outputs/7` | ID | G13 |
| 9 | `reports/index.html` | `/workflows/8/durable_runtime_outputs/8` | ID | G13 |

### `research-quest` — 1 of 1

Public identity source: `/workflows/14/durable_runtime_outputs/0`; IO ledger row 459. Later Phase-2 pointer: `/packages/14/checkpoints/0`.

| # | Artifact identity | Public pointer | Exact | Gap |
|---:|---|---|---|---|
| 1 | `research-quest.yaml` | `/workflows/14/durable_runtime_outputs/0` | ID | G13 |

### `research-quest-admin` — 4 of 4

Public identity source: `/workflows/15/durable_runtime_outputs/0..3`; IO ledger rows 461–464. Later Phase-2 pointers: `/packages/15/checkpoints/0..3`.

| # | Artifact identity | Public pointer | Exact | Gap |
|---:|---|---|---|---|
| 1 | `QUEST_STATUS.md` | `/workflows/15/durable_runtime_outputs/0` | ID | G13 |
| 2 | `quest-event-candidates` | `/workflows/15/durable_runtime_outputs/1` | ID | G13 |
| 3 | `research-events.jsonl` | `/workflows/15/durable_runtime_outputs/2` | ID | G13 |
| 4 | `research-quest.yaml` | `/workflows/15/durable_runtime_outputs/3` | ID | G13 |

### Checkpoint-set completeness finding

The seven families represented by Phase-2 artifact-lifecycle checkpoints have **64** public durable outputs: `22 + 3 + 9 + 16 + 9 + 1 + 4`. Phase-2 retains **50**. The 14 omitted outputs are all from review-case and experiment-campaign. Public frozen v1.2 contains no rule that derives the 50-member subset. Therefore:

- each retained artifact spelling is source-addressable;
- the assertion that these exact 50 form the complete artifact-lifecycle checkpoint set is not semantically derivable;
- absence of the other 14 from R2A cannot be treated as frozen methodology behavior.

This finding does not claim that durable outputs from the other nine ordered-stage families must also become lifecycle checkpoints. It only identifies loss within the seven families already modeled through artifact-lifecycle checkpoints.

## Lossy Phase-2 Skeleton Findings

Every one of the 50 later Phase-2 lifecycle checkpoints uses the same six field descriptors:

- `artifact_path: string`, required, cardinality `1`, immutable
- `requiredness: enum(required|optional)`, required, cardinality `1`, immutable
- `media_type: string`, required, cardinality `1`
- `provenance: object`, required, cardinality `1`
- `stable_id: string|null`, optional, cardinality `0..1`, immutable
- `terminal_applicability: string[]`, required, cardinality `1..*`, immutable

It also applies generic `consumer: downstream_or_root`, transitions `create: inputs_available`, `accept: validators_pass`, `reject: critical_validator_fail`, and four stable error codes. No checkpoint contains exact validator bindings, dependencies, or cross-artifact consistency rules.

These are contract-shape descriptors and later defaults, not artifact-specific frozen-v1.2 values. Copying family terminals to every artifact does not prove artifact-specific terminal applicability.

Procedure `2.0.2` skeletons are further removed from the public identities. Representative review-case contracts use IDs such as `01-intake`, generic `evidence/**/01-intake*` path patterns, `text/markdown`, producer `worker`, consumer `root`, and terminals `success/completed/partial`. They do not model the 12 retained review-case output identities above. Treating these values as source-derived would be an invention.

## Closure Findings

### What public frozen v1.2 declares

Public differential cases bind high-level selected/blocked closure expectations to four families:

| Family | Blocked | Selected | Exclusivity / improve |
|---|---|---|---|
| `research-literature` | `/cases/20` | `/cases/21` | `/cases/22` |
| `research-ideation` | `/cases/37` | `/cases/38` | `/cases/39`, `/cases/53` |
| `research-idea-evaluation` | `/cases/60` | `/cases/61` | `/cases/63`, `/cases/77` |
| `research-experiment` | `/cases/91` | `/cases/96` | `/cases/97` |

`phase2-improve-register-v1.2.json` `/items/0/requirements/9` says `exactly-one-selected-or-blocked-closure`.

This supports a high-level expectation that selected/blocked outcomes and exclusivity matter for those named public families. It does not provide an executable pre-record contract.

### Missing closure semantics

Public frozen v1.2 does not define:

- canonical artifact or record fields that carry `selected` and `blocked`;
- exact field types, absence/null behavior, or normalization rules;
- whether selection is a Result field, Proposal field, Decision field, artifact field, or derived aggregate;
- a reusable runtime family-binding table and stage boundary;
- whether ideation generation or idea evaluation owns canonical closure. Later `ideation-closure-disposition.md` assigns evaluation ownership, but is post-freeze;
- the pre-record read set, validation order, and exact zero-write boundary for each closure family;
- canonical evidence when one side is false;
- an authorization to infer selected/blocked from generic Result terminal/status strings.

### Result-status heuristic finding

Current runtime comparison code derives:

- `blocked` from status `blocked` or `failed`;
- `selected` from status `completed`, `success`, or `partial`.

See `packages/core/src/research/methodology-validators.ts:116-151` and caller `packages/cli/src/commands/research/dispatch-methodology-validation.ts:217-222`.

Those mappings are not declared by public frozen v1.2. In particular, no evidence equates generic success/completion/partial with methodology selection. R2A must not use these heuristics as frozen semantics.

### Closure verdict

- **Family-level test applicability**: partially declared for the four named families through DFT cases.
- **Canonical derivation of `selected` and `blocked`**: not declared.
- **Exact pre-record validation semantics**: not declared at artifact/field level.
- **No-`Result.status`-heuristics rule**: frozen evidence supplies no heuristic and no authorization for one. Fail closed by not deriving closure from status.
- **Safely enforceable closure now**: only XOR over explicit, canonical booleans supplied under a reviewed binding. That reviewed binding is currently missing, so automatic family closure enforcement remains blocked.

## Validator `(id, version)` Findings

Frozen public assurance evidence records validator source paths and hashes. It does not define stable Trellis registry IDs or versions and does not bind exact pairs to each family/checkpoint.

Later Procedure `2.0.2` validator files universally declare:

- `missing-critical-evidence@1`
- `provenance-stable-id-drift@1`
- `forbidden-mutation@1`
- `closure-exclusivity@1`

The universal four-validator set is a later implementation choice. It is not an exact frozen-v1.2 family/checkpoint mapping. Applying closure validation to all families is especially unsupported by public DFT applicability, which names four families.

Current root registry lookup by exact `${id}@${version}` and critical failure on an unknown pair is structurally safe. See `packages/core/src/research/methodology-validators.ts:154-177`. What is not safe is choosing which known pair applies to a frozen family/checkpoint without source-backed binding.

Later `artifact-and-validator-contract.md:20-23` correctly states desired architecture—declarative support-pack descriptors, trusted root implementations, pre-record validation, zero canonical writes on critical failure—but does not provide exact pair assignments. It is post-freeze design evidence, not a v1.2 binding registry.

**Validator verdict:** no requested R2A check has a complete public frozen-v1.2 `(id, version)` binding. Exact binding-dependent enforcement is blocked.

## R0 Matrix Correction Statement

Source: `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/r0-methodology-derivability-matrix.json`.

R0 correctly proves:

- byte identity of its two declared Phase-2 source files;
- 16 family rows and 104 checkpoint rows;
- 54 `ordered_stage` plus 50 `artifact_lifecycle_checkpoint` row counts;
- family/checkpoint key uniqueness;
- resolution of 314 pointers into those two later files;
- shape and location of planned `2.0.3` destinations.

R0 does **not** prove semantic derivability from frozen public v1.2 because its only source files are:

1. later `methodology-contract-freeze.json`;
2. later `package-coverage-map.json`.

It does not trace each claimed semantic field to the authoritative frozen-v1.2 public reference chain.

### Rows and fields that overclaim

| R0 scope | Source-addressable | Not semantically derivable from public frozen v1.2 |
|---|---|---|
| All 50 lifecycle rows | `family`, retained artifact spelling, later checkpoint ID, later pointers, row hash | Exact 50-member checkpoint-set completeness; `contractStatus` implication that a lifecycle contract comes “from-v1.2-inventory”; all 13 lifecycle dimensions; generic transitions; artifact-specific terminals; stable errors; fixture-to-validator semantics |
| All 54 ordered-stage rows | Later stage ID/ref and pointer can be byte-addressed | Any semantics beyond exact public stage/ref facts; generic descriptors, transitions, terminal applicability, stable errors, and later defaults are not established by R0 pointer resolution |
| All 104 rows | Planned owner/path strings exist in R0 | Every `planned203Destinations` object has `existenceClaim: planned-not-produced-by-r0`; destinations are plans, not source semantics or produced evidence |
| All family mappings | Later coverage-map entries resolve | R0 does not independently prove each owner/Procedure/capability mapping from the frozen-v1.2 public chain |

For lifecycle rows, `artifactIdentity` is source-addressable. The following checkpoint-source fields are not thereby source-derived: `producer`, `consumer`, `fields`, `transition_conditions`, `terminal_applicability`, `stable_error_codes`, and semantic `fixture_obligations`. The retained checkpoint ID itself is a later synthetic ID.

### Required R0 reclassification

R0 should be described as a **Phase-2 source-addressability and planned-destination matrix**, not a frozen-v1.2 semantic derivability matrix. Its integrity counts may remain. Claims that later checkpoint contracts are “frozen-field-and-checkpoint-contract” or “artifact-lifecycle-from-v1.2-inventory” need an explicit caveat: only artifact identity is public-source-addressable; lifecycle semantics and the exact 50-member selection are not derivable.

## Safely Implementable R2A Subset

The following controls can be implemented without inventing missing methodology semantics:

1. **Frozen evidence integrity**
   - verify exact frozen target digest;
   - verify exact source file hashes and expected contract/commit identities;
   - fail on byte or identity drift.

2. **Addressability and identity checks**
   - resolve declared JSON pointers;
   - verify family names and exact public artifact spellings;
   - report retained-vs-omitted source coverage without treating retained items as required artifacts;
   - verify exact public package/capability/Procedure/route/composition identities where the frozen target itself declares them.

3. **Deterministic report binding**
   - bind supplied canonical Procedure ID/version/digest, methodology contract version, capability/dispatch/activation IDs, artifact identities/digests, validator descriptor versions, and report digest;
   - do not invent lifecycle semantics while reporting.

4. **Validator control-plane integrity**
   - strictly parse validator descriptors;
   - require non-empty ID/version/severity;
   - perform exact trusted registry lookup by `(id, version)`;
   - fail critically on unknown pairs;
   - keep validator implementations root-owned;
   - do not attach the four later validators universally as a frozen default.

5. **Authority checks already exact at control-plane level**
   - root owns canonical commit;
   - worker output remains proposal/evidence only;
   - reject forbidden worker canonical mutation when canonical authority evidence is explicit.

6. **Conditional generic validators**
   - XOR can be run over explicit canonical booleans only after a reviewed family/field binding is supplied;
   - artifact cardinality/media/provenance checks can run only after a reviewed artifact-specific contract is supplied.

Items in point 6 are safe validator primitives, not currently safe automatic R2A bindings.

## Blocked R2A Checks

Defer these checks until reviewed contract evidence exists:

- artifact-specific presence/requiredness;
- artifact-specific cardinality;
- media-type validation;
- producer/consumer authorization;
- repository path/ArtifactRef identity semantics;
- stable-ID field presence, format, and continuity;
- provenance schema and drift semantics;
- artifact dependency ordering;
- immutable-field/mutation rules;
- lifecycle create/accept/reject transitions;
- artifact-specific terminal applicability;
- cross-artifact consistency;
- complete 50-vs-64 lifecycle coverage disposition;
- family-bound selected/blocked derivation;
- any closure decision derived from `Result.status`;
- exact family/checkpoint validator binding;
- attribution of later stable error codes as frozen-v1.2 semantics;
- use of Procedure `2.0.2` generic defaults as source values.

## Minimum Forward Repair

### Additive public v1.2 clarification — no semantic change

A clarification may safely document only existing evidence boundaries:

1. Reclassify R0 as addressability/planning evidence.
2. State that Phase-2 field lists are descriptors for future contracts, not artifact-specific values.
3. Publish the exact public identity trace for retained artifacts.
4. Disclose that the seven lifecycle-modeled families contain 64 public durable outputs while the later checkpoint set retains 50, and that public v1.2 contains no first-12 selection rule.
5. State that public v1.2 does not supply exact Trellis validator `(id, version)` bindings.
6. State that public v1.2 does not define canonical selected/blocked derivation fields and therefore does not authorize status-based derivation.
7. Keep later Procedure/runtime defaults labeled as post-freeze implementation choices.

Such clarification must not add missing values or claim that silence means optionality, multiplicity, media type, terminal applicability, or validator applicability.

### Reviewed v1.3+ contract correction — required for enforcement

Any enforceable lifecycle/closure contract needs reviewed versioned semantics. Minimum fields:

#### Per artifact/checkpoint

- stable family and checkpoint ID;
- canonical artifact identity and repository/ArtifactRef relation;
- exact requiredness;
- exact cardinality;
- exact media type;
- exact producer authority/capability;
- exact consumer authorities/capabilities;
- stable ID field/schema, or explicit `none` with rationale;
- provenance schema and required components;
- dependencies;
- immutable fields and mutation authority;
- create/accept/reject transitions with preconditions;
- terminal applicability;
- cross-artifact consistency rules;
- stable error codes;
- exact validator bindings `(id, version, severity)`;
- positive, negative, and inapplicable expected outcomes.

#### Checkpoint-set coverage

- explicit disposition for all 64 public durable outputs in the seven lifecycle-modeled families;
- inclusion/exclusion reason for each output;
- rule for aliases such as `<round-id>` versus `<round_id>`;
- whether directory identities are artifacts, containers, or patterns.

#### Closure

- exact applicable families and stage boundary;
- canonical records/artifacts and field paths for `selected` and `blocked`;
- field types and absence/null semantics;
- authoritative producer and pre-record reader;
- XOR validation order and zero-write boundary;
- evidence required for true and false values;
- explicit prohibition or exact definition of any status-to-closure mapping;
- exact closure validator `(id, version)` and stable errors.

#### Validation/reporting

- exact root registry bindings;
- deterministic report schema and identity bindings;
- critical/warning behavior;
- zero-write semantics;
- version compatibility and migration rules.

### Deferral

Until reviewed v1.3+ correction exists, keep unavailable checks disabled or explicitly `blocked-by-contract`. Do not silently pass them. Do not substitute Procedure `2.0.2`, current runtime behavior, P2-01 descriptors, cowork claims, filename inference, or generic Result statuses.

## Source Hashes

Hashes lock exact public files and post-freeze comparison files inspected by this audit.

### Frozen/public chain

| SHA-256 | File |
|---|---|
| `a6e7382eb274d9ce4d9e3afe23fa5a9810d61ed1b2d9d39c0b0b50b15f591f1a` | `evaluation-contract-v1.2.0.md` |
| `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb` | `frozen-migration-target-v1.2.json` |
| `19a78cd04a5cfabde66390615f600e573c5e0234e59ffadc697233808f5590cd` | `frozen-migration-target-v1.2.sha256` |
| `ed1ed07252861da7ef39c9803ad0fc5894721da5a8585267deafd3e6df20873c` | `normalized-workflow-inventory-v1.2.json` |
| `b2a20152f961d566fb2b5e36ec7911bf56b5042d7695374746ce19baf5204999` | `io-mapping-ledger-v1.2.csv` |
| `b4d9a6d46920e56ef1092b32d1e1a8fad8d85b98f6bbda7109eec9bd580e4834` | `differential-test-matrix-v1.2.json` |
| `7a03293726e9543b5ac49740d2cf3a815c5f75213b06722f0592af6c89f2720b` | `phase2-improve-register-v1.2.json` |
| `1ee44146b3a628486e1af9e92f58e9ba471e7b5912753be17a3870defedd984c` | `phase-2-differential-handoff-v1.2.md` |
| `3af86c466b613fa5e6cd7a49c172d13ecccf0051a29552a118de5154d63a59f8` | `validator-inventory.json` |
| `2ac65442ab164763545b2086e3567ce59ec1c1fd34cf04293b3798005e948fc2` | `validator-assurance-report.md` |

### Post-freeze comparison chain

| SHA-256 | File |
|---|---|
| `763bd4f548db500a8e8273cb73a58854e4725de1019bf8fe506bf22bd7555f33` | `methodology-contract-freeze.json` |
| `09c9fb07c60a9257421bdd6d716910f142023d55d78256d018b7ac0ff159d16a` | `package-coverage-map.json` |
| `0a68445949d3d4dcc66938d8d28d04df5a2a80848a5b99ce40ab0c9e148cbc8a` | `artifact-and-validator-contract.md` |
| `871a0e67b92e6f895b62ccef4068cff5bcff205031cbe56dda2c6737fc6eea77` | `ideation-closure-disposition.md` |
| `e0b976a33062795de8d009122d4feae55965b4d71f78515f4e52cd6f4de0be58` | `r0-methodology-derivability-matrix.json` |
| `cbd6246b33f4c8e07293eefff3c944ffd6fe1ec7ba16d9f522b9e019b94a9f7b` | `review-case-v1/2.0.2/methodology/artifacts/artifact-contract.json` |
| `1a96c7d5378aaaad81ff89bc57c3ddbcac116cfa8b816ff2d0f61bd12417b8b5` | `review-case-v1/2.0.2/methodology/validators/validators.json` |
| `a76df8212be90399a25cde839335904ce046bfdf4a465e7e8598ed308f564ea6` | `idea-evaluation-v1/2.0.2/methodology/artifacts/artifact-contract.json` |
| `1a96c7d5378aaaad81ff89bc57c3ddbcac116cfa8b816ff2d0f61bd12417b8b5` | `idea-evaluation-v1/2.0.2/methodology/validators/validators.json` |
| `b1852cb98388492188939deca32418534c39f4eab6ac45b71c7a639028ab7d2e` | `packages/core/src/research/methodology-artifacts.ts` |
| `a55b8df03f3d090cb40fc5102fbcb73beb993dd8ed5e3e2b23186a236304c527` | `packages/core/src/research/methodology-validators.ts` |
| `e6bde0dd2e60227a604694dc510ffa65ddeb261b778a8c2e76b8f80dbeb6f447` | `packages/core/src/research/methodology-reports.ts` |
| `d558a5dbc173e868097da9412f2454b75f6c68776c78b26c7ce7c6436ba09672` | `packages/cli/src/commands/research/dispatch-methodology-validation.ts` |

## Caveats / Not Found

- No public frozen-v1.2 artifact-specific lifecycle schema containing the requested concrete values was found.
- No public frozen-v1.2 exact validator `(id, version)` registry or per-family/per-checkpoint binding was found.
- No public frozen-v1.2 canonical selected/blocked field derivation contract was found.
- No frozen rule selecting exactly 50 of the 64 durable outputs in the seven lifecycle-modeled families was found.
- No private Skill source body was inspected. Private source identities and public path/hash assurance records were treated only as opaque evidence references.
- No network, provider, or model execution was used.
- No existing evidence, production code, tests, specs, Procedures, task state, package, activation, archive, publication, release, commit, or remote was modified.
- Project patterns include digest sidecars, but this research role's write boundary permits only `research/*.md`. No non-Markdown sidecar was created. Audit file digest is reported by the caller-facing completion response after write.

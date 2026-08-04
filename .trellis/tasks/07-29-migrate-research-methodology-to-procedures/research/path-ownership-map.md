# Phase-2 path ownership map

Status: planning freeze candidate. P2-01 reviews and freezes this map before P2-02 starts.

Pins:

- methodology: `evaluation-contract-v1.2.0` / `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Rules

1. Only the named child may edit a listed production/test/spec path while it is active.
2. P2-06 through P2-11 may run in parallel because their paths are disjoint.
3. P2-12 is the only central cutover owner. Family defects return to the family child; P2-12 does not rewrite family bodies opportunistically.
4. New paths must fit the listed exact directory/prefix. Any new central path requires a reviewed map revision before editing.
5. Existing functions/classes/methods require GitNexus upstream impact before edit; HIGH/CRITICAL impact stops for confirmation.
6. `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source content, generated/installed Research Skills, and unrelated `.trellis/research/**` are excluded from every child.
7. Procedure support-pack schema version, Research event schema version, and worker Context schema version are separate version domains and must be named explicitly.

## Parent planning ownership

- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/**`
- Parent owns only orchestration/planning artifacts and final acceptance coordination.

## P2-01 — contract freeze only

- `.trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/**`
- No production, test, Procedure, registry, package, or specification edits.

## P2-02 — Procedure package and historical resolution

- `packages/core/src/research/procedure-policy.ts`
- `packages/core/src/research/procedure-support-pack.ts` (new)
- `packages/core/test/research/procedure-policy.test.ts`
- `packages/core/test/research/procedure-support-pack.test.ts` (new)
- `packages/cli/src/commands/research/procedure-resolution.ts`
- `packages/cli/src/commands/research/dispatch-revalidation.ts`
- `packages/cli/test/commands/research-procedure-resolution.integration.test.ts`
- `packages/cli/test/commands/research-dispatch-revalidation.test.ts` (new)
- `.trellis/spec/core/backend/research-procedure-packages.md` (new)

P2-02 owns the exact identity-aware parser/resolver API and integrates recorded Procedure ID/version resolution into `revalidateDispatchActivationStaged`. P2-03 may consume that API but does not reinterpret it.

## P2-03 — artifact, validator, report, composition, and Context runtime

- `packages/core/src/research/methodology-artifacts.ts` (new)
- `packages/core/src/research/methodology-validators.ts` (new)
- `packages/core/src/research/methodology-reports.ts` (new)
- `packages/core/src/research/composition.ts` (new)
- `packages/core/test/research/methodology-artifacts.test.ts` (new)
- `packages/core/test/research/methodology-validators.test.ts` (new)
- `packages/core/test/research/methodology-reports.test.ts` (new)
- `packages/core/test/research/composition.test.ts` (new)
- `packages/cli/src/commands/research/dispatch-methodology-validation.ts` (new)
- `packages/cli/src/commands/research/dispatch-composition.ts` (new)
- `packages/cli/src/commands/research/dispatch-approved-context.ts`
- `packages/cli/src/commands/research/dispatch-command.ts`
- `packages/cli/src/templates/shared-hooks/inject-subagent-context.py`
- `packages/cli/src/templates/claude/agents/trellis-research-worker.md`
- `packages/cli/src/templates/codex/agents/trellis-research-worker.toml`
- `packages/cli/test/commands/research-methodology-validation.test.ts` (new)
- `packages/cli/test/commands/research-methodology-context.test.ts` (new)
- `packages/cli/test/commands/research-composition-runtime.test.ts` (new)
- `packages/core/src/research/index.ts`
- `.trellis/spec/cli/backend/research-methodology-runtime.md` (new)

Composition ownership includes the root-only descriptor, parent/child or adapter binding, authorization evidence, max-child enforcement, non-transitive rules, and rollback behavior. Family children own only edge-specific packs/fixtures.

## P2-04 — frozen differential harness

- `packages/cli/test/research-methodology-harness/**` (new)
- `packages/cli/test/fixtures/research-methodology-v1.2/**` (new)
- `packages/cli/scripts/research-methodology-differential.mjs` (new)
- `.trellis/spec/cli/unit-test/research-methodology-differential.md` (new)
- `.trellis/tasks/07-29-implement-frozen-phase2-differential-harness/research/**`

## P2-05 — ideation/evaluation family

- `packages/cli/src/templates/research/procedures/idea-generation-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/idea-evaluation-v1/2.0.0/**`
- `packages/core/src/research/methodology/ideation-validators.ts` (new)
- `packages/core/test/research/methodology/ideation-validators.test.ts` (new)
- `packages/cli/test/research-methodology-families/ideation-evaluation.test.ts` (new)
- `.trellis/spec/cli/backend/research-methodology-ideation.md` (new)
- `.trellis/tasks/07-29-migrate-ideation-evaluation-methodology/research/**`

## P2-06 — setup and Quest family

- `packages/cli/src/templates/research/procedures/project-setup-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/quest-framing-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/quest-admin-v1/2.0.0/**`
- `packages/core/src/research/methodology/setup-quest-validators.ts` (new)
- `packages/core/test/research/methodology/setup-quest-validators.test.ts` (new)
- `packages/cli/test/research-methodology-families/setup-quest.test.ts` (new)
- `.trellis/spec/cli/backend/research-methodology-setup-quest.md` (new)
- `.trellis/tasks/07-29-migrate-setup-quest-methodology/research/**`

## P2-07 — literature and survey family

- `packages/cli/src/templates/research/procedures/literature-scan-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/literature-review-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/survey-v1/2.0.0/**`
- `packages/core/src/research/methodology/literature-survey-validators.ts` (new)
- `packages/core/test/research/methodology/literature-survey-validators.test.ts` (new)
- `packages/cli/test/research-methodology-families/literature-survey.test.ts` (new)
- `.trellis/spec/cli/backend/research-methodology-literature-survey.md` (new)
- `.trellis/tasks/07-29-migrate-literature-survey-methodology/research/**`

## P2-08 — experiment family and COMP-001

- `packages/cli/src/templates/research/procedures/experiment-round-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/experiment-campaign-v1/2.0.0/**`
- `packages/core/src/research/methodology/experiment-validators.ts` (new)
- `packages/core/test/research/methodology/experiment-validators.test.ts` (new)
- `packages/cli/test/research-methodology-families/experiment.test.ts` (new)
- `.trellis/spec/cli/backend/research-methodology-experiment.md` (new)
- `.trellis/tasks/07-29-migrate-experiment-methodology/research/**`

## P2-09 — computation and theory family

- `packages/cli/src/templates/research/procedures/computation-case-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/theory-case-v1/2.0.0/**`
- `packages/core/src/research/methodology/computation-theory-validators.ts` (new)
- `packages/core/test/research/methodology/computation-theory-validators.test.ts` (new)
- `packages/cli/test/research-methodology-families/computation-theory.test.ts` (new)
- `.trellis/spec/cli/backend/research-methodology-computation-theory.md` (new)
- `.trellis/tasks/07-29-migrate-computation-theory-methodology/research/**`

## P2-10 — review family and COMP-002

- `packages/cli/src/templates/research/procedures/review-case-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/review-campaign-v1/2.0.0/**`
- `packages/core/src/research/methodology/review-validators.ts` (new)
- `packages/core/test/research/methodology/review-validators.test.ts` (new)
- `packages/cli/test/research-methodology-families/review.test.ts` (new)
- `.trellis/spec/cli/backend/research-methodology-review.md` (new)
- `.trellis/tasks/07-29-migrate-review-methodology/research/**`

## P2-11 — writing, figure, slides, and COMP-003

- `packages/cli/src/templates/research/procedures/writing-case-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/figure-v1/2.0.0/**`
- `packages/cli/src/templates/research/procedures/slides-v1/2.0.0/**`
- `packages/core/src/research/methodology/writing-visual-validators.ts` (new)
- `packages/core/test/research/methodology/writing-visual-validators.test.ts` (new)
- `packages/cli/test/research-methodology-families/writing-visual.test.ts` (new)
- `.trellis/spec/cli/backend/research-methodology-writing-visual.md` (new)
- `.trellis/tasks/07-29-migrate-writing-figure-slides-methodology/research/**`

## P2-12 — sole central activation and integration cutover

- `packages/core/src/research/stage-capabilities.ts`
- `packages/core/src/research/methodology-validator-bindings.ts` (new)
- `packages/core/test/research/stage-capabilities.test.ts`
- `packages/cli/scripts/packed-cli-audit.js`
- `packages/cli/scripts/release-preflight.js`
- `packages/core/test/research/methodology-validator-bindings.test.ts` (new)
- `packages/cli/test/commands/research-methodology-activation.integration.test.ts` (new)
- `packages/cli/test/commands/research-methodology-upgrade.integration.test.ts` (new)
- `packages/cli/test/commands/research-methodology-packed.integration.test.ts` (new)
- `.trellis/spec/core/backend/index.md`
- `.trellis/spec/cli/backend/index.md`
- `.trellis/spec/cli/unit-test/index.md`
- `.trellis/spec/cli/backend/research-methodology-rollout.md` (new)
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/**`

P2-12 integrates reviewed family modules and packs but must route family-body defects back to P2-05 through P2-11. Its task-local research ownership includes the normative `research/cutover-manifest.json`, its digest, the separate frozen-229 and expansion-38 aggregate reports, and pre/post activation rollback evidence.

## P2-13 — independent assurance only

- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/**`
- Exact allowed outputs: `pin-attestation.json`, `reviewer-independence.json`, `coverage-audit.json`, `authority-compatibility-audit.json`, `composition-audit.json`, `rollback-audit.json`, `packed-lifecycle-audit.json`, `privacy-dirty-path-audit.json`, and `acceptance-recommendation.md`.
- No production, test, Procedure, registry, package, or specification edits.

## Reserved and excluded

- Existing `packages/core/src/research/types.ts`, `schema.ts`, `events.ts`, and `reducer.ts` remain excluded unless P2-01 proves the composition contract cannot be safely bound through existing canonical Dispatch/Activation/Proposal records and a separately reviewed state-migration amendment assigns them.
- Existing Procedure `1.0.0` directories are read-only compatibility fixtures for all children.
- The private source repository is read-only evidence and never a Trellis path owner.

## Amendment — Completion Wave-0 / Procedure 2.0.2 repair disposition (2026-07-30)

Status: superseding forward containment after premature `fe1cd02e` 2.0.1 activation. Repair starting snapshot `fe1cd02e`. Semantic repair version is **2.0.2**.

### Immutable historical package trees (all children)

- `packages/cli/src/templates/research/procedures/*/1.0.0/**` — read-only
- `packages/cli/src/templates/research/procedures/*/2.0.0/**` — read-only
- `packages/cli/src/templates/research/procedures/*/2.0.1/**` — read-only (premature activation evidence)

### New 2.0.2 family ownership (issue only; do not edit historical trees)

- P2-05: `.../idea-generation-v1/2.0.2/**`, `.../idea-evaluation-v1/2.0.2/**`
- P2-06: `.../project-setup-v1/2.0.2/**`, `.../quest-framing-v1/2.0.2/**`, `.../quest-admin-v1/2.0.2/**`
- P2-07: `.../literature-scan-v1/2.0.2/**`, `.../literature-review-v1/2.0.2/**`, `.../survey-v1/2.0.2/**`
- P2-08: `.../experiment-round-v1/2.0.2/**`, `.../experiment-campaign-v1/2.0.2/**`
- P2-09: `.../computation-case-v1/2.0.2/**`, `.../theory-case-v1/2.0.2/**`
- P2-10: `.../review-case-v1/2.0.2/**`, `.../review-campaign-v1/2.0.2/**`
- P2-11: `.../writing-case-v1/2.0.2/**`, `.../figure-v1/2.0.2/**`, `.../slides-v1/2.0.2/**`

Prior map rows that list only `2.0.0/**` remain historical ownership for those trees; new work targets `2.0.2/**` exclusively.

### P2-12 remediation ownership (forward containment + dormant candidate)

- `packages/core/src/research/stage-capabilities.ts` (future selection containment; candidate projection only after Wave 6)
- `packages/core/test/research/stage-capabilities.test.ts`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/activation-version-disposition.json`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/cutover-containment-status.json`
- New 2.0.2 candidate/active manifests (do not rewrite premature 2.0.1 `cutover-manifest.json` / `candidate-cutover-manifest.json`)
- `packages/cli/scripts/packed-cli-audit.js` extensions for historical 1.0.0/2.0.0/2.0.1 + 2.0.2

### Runtime repair ownership (unchanged owners)

- P2-02: exact package parsing + historical identity separation
- P2-03: Context v2 digests, root validation, Proposal containment, composition production path
- P2-04: exact harness registry (212 critical + 17 non-critical; 38 expansions)

### Rules restated

1. Do not rewrite historical reports, cutover manifests, or package bytes to appear passing.
2. Do not archive Phase-2 tasks during remediation.
3. Final 2.0.2 activation, tarball lifecycle, commits, and push remain separate approvals.

## Superseding amendment — Wave-8 / Procedure 2.0.3 remediation ownership (2026-08-03)

Status: approved low-risk forward-repair ownership. **R0 is an alias for the approved Wave-8 remediation baseline, not a new authority domain.** This section supersedes only future remediation ownership. Every historical row and historical byte remains evidence and is not rewritten or deleted.

### R0 parent evidence ownership

- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/r0-*.json`
- The parent may append deterministic baseline, integrity-inventory, derivability, GitNexus, and validation evidence only. R0 creates no production, activation, release, or mutation authority.

### P2-02 — shared strict package parsing and historical identity

- `packages/core/src/research/procedure-policy.ts`
- `packages/core/src/research/procedure-support-pack.ts`
- `packages/cli/src/commands/research/procedure-resolution.ts`
- `packages/cli/src/commands/research/dispatch-revalidation.ts`
- Their existing focused test/spec paths remain P2-02-owned as listed above.

P2-02 owns strict package parsing, digest/identity separation, contained historical ID/version resolution, and fail-closed project/bundled selection. This ownership does not authorize edits to HIGH/CRITICAL symbols without separate approval.

### P2-03 — shared methodology runtime, root composition command, and adapter port

- `packages/core/src/research/methodology-artifacts.ts`
- `packages/core/src/research/methodology-validators.ts`
- `packages/core/src/research/methodology-reports.ts`
- `packages/core/src/research/methodology-worker-context.ts`
- `packages/core/src/research/composition.ts`
- `packages/core/src/research/dispatch-composition.ts`
- `packages/cli/src/commands/research/dispatch-methodology-validation.ts`
- `packages/cli/src/commands/research/dispatch-composition.ts` (new root-only command path)
- `packages/cli/src/commands/research/composition-adapter-port.ts` (new bounded adapter-port path)
- Their existing focused test/spec paths remain P2-03-owned as listed above.

The adapter port is a root-owned bounded interface; it is not worker authority. This ownership is not an instruction to edit Claude/Codex worker, hook, workflow, or template bytes.

### P2-04 — semantic fixtures, registries, per-case evidence, and harness

- `packages/cli/test/research-methodology-harness/**`
- `packages/cli/test/fixtures/research-methodology-v1.2/**`
- `packages/cli/test/fixtures/research-methodology-2.0.3/**` (new)
- `packages/cli/scripts/research-methodology-differential.mjs`
- `.trellis/tasks/07-29-implement-frozen-phase2-differential-harness/research/remediation-2.0.3/**` (new)

P2-04 owns the frozen-229 registry, separate expansion-38 registry, deterministic semantic fixtures, per-case evidence, completeness checks, and aggregate reports. It must not copy private test bodies or combine the two count domains.

### P2-05 through P2-11 — new 2.0.3 family package trees

- P2-05: `packages/cli/src/templates/research/procedures/idea-generation-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/idea-evaluation-v1/2.0.3/**`
- P2-06: `packages/cli/src/templates/research/procedures/project-setup-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/quest-framing-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/quest-admin-v1/2.0.3/**`
- P2-07: `packages/cli/src/templates/research/procedures/literature-scan-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/literature-review-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/survey-v1/2.0.3/**`
- P2-08: `packages/cli/src/templates/research/procedures/experiment-round-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/experiment-campaign-v1/2.0.3/**`
- P2-09: `packages/cli/src/templates/research/procedures/computation-case-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/theory-case-v1/2.0.3/**`
- P2-10: `packages/cli/src/templates/research/procedures/review-case-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/review-campaign-v1/2.0.3/**`
- P2-11: `packages/cli/src/templates/research/procedures/writing-case-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/figure-v1/2.0.3/**`, `packages/cli/src/templates/research/procedures/slides-v1/2.0.3/**`

The family allocation is identical to the historical 2.0.2 allocation. New work issues 2.0.3 only; it does not mutate any earlier version tree.

### P2-12 — authoritative 2.0.3 candidate and integration evidence

- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/candidate-registry-projection.json`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/candidate-cutover-manifest.json`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/candidate-cutover-manifest.sha256`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/packed-inventory.json`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/execution-evidence-ledger.schema.json`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/execution-evidence-ledger-validation.json`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/lifecycle-evidence.json`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/privacy-evidence.json`
- `.trellis/tasks/07-29-activate-migrated-research-methodology/research/remediation-2.0.3/rollback-evidence.json`
- `packages/core/src/research/stage-capabilities.ts` and its focused test remain future-selection candidate-projection ownership only after family/runtime/harness gates pass.
- `packages/cli/scripts/packed-cli-audit.js` and `packages/cli/scripts/release-preflight.js` remain P2-12 integration owners.

P2-12 owns the dormant 2.0.3 candidate projection, candidate manifest/sidecar, packed inventory, evidence-ledger schema/validation result, and lifecycle/privacy/rollback evidence. It must preserve historical root manifests and failed Wave-7 evidence.

### P2-13 — versioned remediation assurance only

- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/pin-attestation.json`
- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/reviewer-independence.json`
- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/coverage-audit.json`
- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/authority-compatibility-audit.json`
- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/composition-audit.json`
- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/rollback-audit.json`
- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/packed-lifecycle-audit.json`
- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/privacy-dirty-path-audit.json`
- `.trellis/tasks/07-29-assure-close-phase2-methodology-migration/research/remediation-2.0.3/acceptance-recommendation.md`

This subdirectory contains exactly the nine allowlisted assurance outputs. Every historical assurance output at the task research root is immutable and preserved.

### 2.0.3 exclusions and authorization boundary

1. `packages/core/src/research/schema.ts`, `events.ts`, and `reducer.ts` remain excluded, as do unassigned state/event migrations.
2. Procedure trees `*/1.0.0/**`, `*/2.0.0/**`, `*/2.0.1/**`, and `*/2.0.2/**` are immutable historical evidence.
3. Private source bodies, validators, prompts, tests, cases, and raw outputs remain read-only external evidence and must not be copied.
4. `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, generated/installed Research Skills, host-facing worker/template bytes, and unrelated `.trellis/research/**` remain excluded.
5. Final activation, canonical mutation, commit, tarball lifecycle, archive, release, publication, and push require separate explicit authorization.

## Additive amendment — v1.3 contract correction prerequisites (2026-08-03)

Status: C0 planning-only ownership addition. This appendix preserves every preceding ownership row and amendment. It adds no production, test, Procedure, registry, activation, package, specification, release, or mutation authority and does not alter existing P2-02 through P2-13 ownership.

### V13-A — public-evidence `evaluation-contract-v1.3.0` authoring

Exact task/planning ownership:

- `.trellis/tasks/08-03-author-evaluation-contract-v1-3/task.json`
- `.trellis/tasks/08-03-author-evaluation-contract-v1-3/prd.md`
- `.trellis/tasks/08-03-author-evaluation-contract-v1-3/design.md`
- `.trellis/tasks/08-03-author-evaluation-contract-v1-3/implement.md`
- `.trellis/tasks/08-03-author-evaluation-contract-v1-3/implement.jsonl`
- `.trellis/tasks/08-03-author-evaluation-contract-v1-3/check.jsonl`
- `.trellis/tasks/08-03-author-evaluation-contract-v1-3/research/**`

The `research/**` prefix is limited to the public-evidence candidate pack, planning context, deterministic authoring evidence, and filename-bound digest sidecars defined by the V13-A task. V13-A owns no assurance outputs and no path outside its task directory.

### V13-B — mechanically independent exact-input assurance

Exact task/planning ownership:

- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/task.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/prd.md`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/design.md`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/implement.md`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/implement.jsonl`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/check.jsonl`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/planning-context.md`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/assurance-plan-v1.3.json`

Exact future assurance output allowlist:

- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/exact-input-attestation.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/reviewer-independence.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/schema-digest-audit.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/provenance-coverage-audit.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/durable-output-lifecycle-audit.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/closure-validator-audit.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/privacy-mutation-audit.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/execution-evidence-ledger.json`
- `.trellis/tasks/08-03-assure-evaluation-contract-v1-3/research/assurance-verdict.json`

No other V13-B research output is allowed. V13-B is read-only for V13-A candidate bytes and every production, test, Procedure, registry, package, specification, activation, cutover, historical, and parent research path.

### Unchanged existing ownership

- P2-02 retains strict package parsing, secure resolution, and historical identity ownership.
- P2-03/R2A retains shared methodology runtime, root validation/reporting, Context projection, composition command, and adapter-port ownership after V13-B passes.
- P2-04 retains frozen-229, separate expansion-38, v1.3 delta-domain fixtures, harness, and per-case evidence ownership.
- P2-05 through P2-11 retain disjoint Procedure `2.0.3/**` family ownership.
- P2-12 retains dormant candidate, packed inventory, lifecycle/privacy/rollback evidence, and future-selection projection ownership.
- P2-13 retains final complete-system assurance ownership and is distinct from V13-B contract assurance.

### Protected and excluded from both V13 children

- Archived v1/v1.1/v1.2 files and all P2-01 evidence.
- Parent `research/r0-*.json`, the Wave-8 audit, and every pre-existing parent research file except the separately C0-owned preservation record.
- Procedure trees `*/1.0.0/**`, `*/2.0.0/**`, `*/2.0.1/**`, and `*/2.0.2/**`.
- Existing cutover, candidate, assurance, activation, lifecycle, privacy, rollback, and packed evidence.
- `.trellis/research/phase-2-pins.md` and unrelated `.trellis/research/**`.
- `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, current uncommitted R0/R1 files, host-facing worker/template bytes, generated/installed Research Skills, and private source content.

V13-A authoring commit, V13-B assurance commit, all downstream remediation/evidence/assurance commits, activation, package lifecycle, archive, release, publication, and push each require separate explicit authorization.

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


## Additive amendment — v1.3 attempt-2 forward repair (2026-08-04)

Status: P1 planning/C0 anchor. Preserves every preceding ownership row, Wave-8 amendment, and v1.3 attempt-1 amendment. Attempt-1 remains immutable historical failure evidence.

### Attempt-1 classification (do not reinterpret)

- Evidence baseline: `a198b4f3`
- Failed compound authoring: `4d36ecda` (mixed V13-A + parent + V13-B planning paths)
- V13-B attempt-1 fail preservation: `867954ae` (verdict exactly `fail`; 150/152 assertions; 32 mutations; four critical findings)
- Attempt-1 task dirs immutable: `08-03-author-evaluation-contract-v1-3`, `08-03-assure-evaluation-contract-v1-3`

### Portable C0 attempt-2 (parent-owned)

- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/c0-v1.3-attempt-2-portable-preservation-manifest.json`
- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/c0-v1.3-attempt-2-procedure-blob-lock.json` (334 Procedure blobs)
- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/c0-v1.3-attempt-2-protected-evidence-blob-lock.json` (412 protected-evidence blobs)
- Filename-bound `.sha256` sidecars and digest index for the above
- Old `c0-v1.3-planning-preservation-lock.json` preserved byte-unchanged

Verification reads committed Git blob OIDs. Four Wave-7 `.tgz` archives are Git-tracked via exact `.gitignore` negations (not blanket force-add).

### V13-A attempt-2 ownership

Exact task directory only:

- `.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-2/**`

### V13-B attempt-2 ownership

Exact task directory only (planning, reviewer assignment, nine future outputs):

- `.trellis/tasks/08-04-assure-evaluation-contract-v1-3-attempt-2/**`

V13-B never repairs V13-A. Second accountable human reviewer is a hard gate before assurance.

### Unchanged

P2-02–P2-13 ownership, live v1 containment, Procedure 1.0.0–2.0.2 immutability, unrelated dirty exclusions (`AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`), and `.trellis/research/phase-2-pins.md` protection.


## Additive amendment — MAL-1 attempt-3 machine assurance (2026-08-04)

Status: G0 governance only. Preserves all prior ownership rows. Does not rewrite A2/B2 or grant runtime authority.

### Incident classification (immutable history)

- `867954ae`: attempt-1 V13-B fail evidence
- `692dc513`: portable C0 + Wave-7 archives (valid)
- `4c49b8fd`: unaccepted A2 candidate (not authority)
- B2 task: never executed; "User waived" statement invalid
- `1c0f942d`–`7a33838e`: unassured development evidence
- Procedure 2.0.3 package bytes: preserved historical; no runtime authority; corrections use **2.0.4**

### MAL-1

Contract: `.trellis/tasks/08-04-amend-v13-machine-assurance-governance/research/mal-1-mechanically-isolated-machine-review-contract.json`

Machine pass alone is not authority. Authority = committed A3 + committed B3 pass + operator accept (`humanReviewed:false`).

### New attempt-3 task ownership (exact directories only)

| Task | Path |
|------|------|
| G0 governance | `.trellis/tasks/08-04-amend-v13-machine-assurance-governance/**` |
| Q0/Q1 containment | `.trellis/tasks/08-04-contain-unassured-v13-runtime/**` + authorized runtime allowlist |
| A3 authoring | `.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/**` only |
| B3 assurance | `.trellis/tasks/08-04-assure-evaluation-contract-v1-3-attempt-3/**` (nine outputs allowlist) |
| OA3 accept | `.trellis/tasks/08-04-accept-machine-assured-evaluation-contract-v1-3-attempt-3/**` |
| R1–R5 runtime | `.trellis/tasks/08-04-remediate-v13-binding-runtime-attempt-3/**` + production allowlist after OA3 |
| R6 harness | `.trellis/tasks/08-04-remediate-v13-delta-harness-attempt-3/**` |
| R8 dormant | `.trellis/tasks/08-04-integrate-v13-dormant-candidate-attempt-3/**` |
| CS3 | `.trellis/tasks/08-04-assure-v13-complete-system-attempt-3/**` |
| CS3-OA | `.trellis/tasks/08-04-accept-v13-complete-system-machine-assurance/**` |

A2/B2 directories remain immutable historical evidence; additive disposition only.

## Additive amendment — CS4 forward repair (2026-08-05)

Status: CS4-0 governance only. See `.trellis/tasks/08-05-cs4-supersede-stale-complete-system-assurance/research/cs4-path-ownership-map.md`.

### Supersession

- CS3 subject `404d714a` / verdict `b4c0c72d` / OA `13656285`: historical; complete-system authority superseded
- `b97a8066`: unassured development evidence outside CS3 subject
- Procedure corrections: **2.0.5** only (2.0.4 immutable)
- Live selection remains 1.0.0; activationAuthorized remains false until separately authorized

## Additive amendment — CS6 successor ownership (2026-08-07)

Status: CS6-0 governance only. Normative exact ownership is frozen in `.trellis/tasks/08-07-cs6-establish-successor-governance/research/cs6-path-ownership-map.md`; the forward-governance record is adjacent.

- Canonical parent has exactly one child `08-07-cs6-complete-system-forward-correction`.
- The CS6 campaign has exactly ordered children CS6-0 through CS6-8.
- CS6-1 owns read-only accepted-leaf audit evidence; a contract defect stops technical work for `v1.3.1+`.
- CS6-2 owns methodology-local core adapters/tests only; protected state/publication primitives remain call-only.
- CS6-3 owns listed CLI authentication/recording/replay/recovery adapters/tests only.
- CS6-4 owns the new generator/test and exactly 17 Procedure `2.0.7/**` trees only.
- CS6-5 owns the production 116-case harness/tests/evidence only.
- CS6-6 owns integration/install tests/scripts/evidence plus separate I11 and one-file S11 boundaries.
- CS6-7 owns reviewer setup and exactly nine attempt-11 outputs; no repair paths.
- CS6-8 owns one operator decision JSON only.

Accepted v1.3.0 leaves, CS5 records, Procedure `2.0.4`–`2.0.6`, live `1.0.0`, `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, `.trellis/research/**`, and shared HIGH/CRITICAL primitives remain excluded. All later activations and commits are separately authorized.

## Additive amendment — evaluation-contract v1.3.1 ownership (2026-08-08)

Status: planning only. A11 `3534529a36a10ea8015a51f71a93e2b78300a563` is immutable `contract-defect` evidence; CS6 technical children remain blocked.

| Owner | Exclusive task path | Boundary |
|---|---|---|
| Campaign governance | `.trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects/**` | Planning, topology, pins, four-finding allowlist, ownership, authority denials |
| Contract author | `.trellis/tasks/08-08-author-evaluation-contract-v1-3-1/**` | Seven v1.3.1 leaves, author tooling, manifest/target, correction and semantic-diff evidence |
| Machine reviewer | `.trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1/**` | Fresh assignment plus exact semantic-assurance output allowlist; no repair |
| Operator | `.trellis/tasks/08-08-decide-evaluation-contract-v1-3-1/**` | One separately instructed accept/reject/stop record only |

Canonical-parent changes are append-only campaign pointers. Accepted v1.3.0/A11, production, tests, Procedure packages, registries, specifications, CS5/CS6 evidence, `.trellis/research/**`, inherited dirty paths, and every technical or operational authority are excluded. G131/A131-0/A131-1/B131-0/B131-1/O131-0/O131-1 remain separate future commit gates.

### Exact v1.3.1 boundary inventories

- G131: exactly 36 paths: the 24 four-package planning files, five canonical-parent overlays, and seven campaign governance outputs.
- A131-0: exactly Author `task.json` plus one assignment/input-authorization JSON.
- A131-1: exactly 15 Author research files, including seven normative leaves; fixtures are embedded in the differential leaf.
- B131-0: exactly Assurance `task.json` plus one reviewer-assignment JSON.
- B131-1: exactly 11 assurance outputs.
- O131-0: exactly Decision `task.json` plus one decision-input attestation.
- O131-1: exactly one operator-decision JSON.

The four task roots are disjoint exclusive ownership domains. Unknown output, overlap, child activation during G131, protected drift, count drift, or a fifth semantic change is a stop condition.

## Additive amendment — evaluation-contract v1.3.1 attempt-2 ownership (2026-08-08)

Status: G132 governance only. G131/A131/B131/O131 paths remain immutable and receive no new files.

| Owner | Exclusive task path | Boundary |
|---|---|---|
| G132 governance | `.trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-2/**` | Planning, immutable pins, narrow finding-004 supersession, inventories, containment, validation |
| A132 author | `.trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2/**` | Future fixed-mapping seven-leaf authoring and exact 15-file evidence set |
| B132 reviewer | `.trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2/**` | Future fresh MAL-1 assignment and exact 11-output assurance set; no repair |
| O132 operator | `.trellis/tasks/08-08-decide-evaluation-contract-v1-3-1-attempt-2/**` | Future input attestation and one accept/reject/stop record |

Canonical-parent changes are limited to the five G132 append-only overlays. Production, tests, registries, specifications, Procedure packages, harnesses, `.trellis/research/**`, inherited dirty paths, and all G131/A131/B131/O131 roots are excluded. Exact future counts are A132-0 2, A132-1 15, B132-0 2, B132-1 11, O132-0 2, and O132-1 1.

## Additive ownership — v1.3.1 Attempt-3 (2026-08-10)

- G133 governance: `.trellis/tasks/08-10-correct-evaluation-contract-v1-3-1-semantic-defects-attempt-3/**`
- A133 author: `.trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/**`
- B133 assurance: `.trellis/tasks/08-10-assure-evaluation-contract-v1-3-1-mal1-attempt-3/**`
- O133 decision: `.trellis/tasks/08-10-decide-evaluation-contract-v1-3-1-attempt-3/**`
- Canonical-parent changes are limited to the five G133 overlays: one child pointer plus this PRD, design, implementation, and ownership appendix. All historical roots, production paths, `.trellis/research/**`, and inherited dirty paths remain excluded.

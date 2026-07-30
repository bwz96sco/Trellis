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

## Repair amendment (Wave-0)

Effective during repair-in-place after unaccepted cutover `fe56c9c2`:

- Existing `*/1.0.0/` and `*/2.0.0/` Procedure package directories are **immutable** compatibility/evidence fixtures.
- Repaired methodology packages MUST be issued as `*/2.0.1/` under the same procedure ID.
- Live registry future selection remains `1.0.0` until a separately approved binding-only activation.
- Optional procedure trees (`survey-v1`, `figure-v1`, `slides-v1`) stay off live routing until that activation; their dormant `2.0.0` bytes remain on disk; repaired content ships as `2.0.1`.
- New central package path pattern owned by family children P2-05..P2-11: `packages/cli/src/templates/research/procedures/<procedure-id>/2.0.1/**`
- P2-12 owns registry binding/cutover of `2.0.1` only after candidate readiness; does not mutate `1.0.0`/`2.0.0` bytes.


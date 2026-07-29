# Evaluate research workflow methodology fidelity for Procedure migration

## Goal

Before any Procedure-methodology migration, freeze and evaluate the private `research-*` Skill family contracts: ordered stages, durable artifact I/O, fail-closed gates, validators, ownership boundaries, and composition edges. Publish a digest-addressed migration target that states exactly what to preserve, translate, improve, retire, or leave unresolved. This evaluation is a **predecessor gate** for future Procedure methodology work and is **distinct** from post-migration differential validation.

## Background / Confirmed facts

- Trellis already owns the Research **control plane**: capability selection, versioned two-file Procedures, activation/approval, provider-neutral worker Context, Result/Proposal recording, root-owned canonical mutation.
- Current bundled Procedures for ideation are thin shells (`idea-generation-v1`, `idea-evaluation-v1` ~30-line PROCEDURE.md only). They do **not** preserve full source methodology (proven gap: stages 01–07, shared pack root, novelty/method-flaw, selected-vs-blocked, experiment handoff).
- Source family under `/Users/zhangbowen/Projects/agent-skills-private/skills/research-*` has **16** registry packages with multi-file methodology.
- Mempal evidence: `drawer_engineering_research_workflow_be94779a5d64` (2026-07-28 gap audit).
- C01–C10 under `07-23-replace-research-skills-with-trellis-procedures` is **infrastructure** migration (skills → Procedures control plane). This parent must **not** renumber, absorb, or modify that tree. C08–C10 closeout remains an external infrastructure condition.

## Ordered children

1. **F01** `07-28-freeze-research-workflow-evaluation-contract` — freeze governance, baselines, privacy, rubric, taxonomy, blinding, evidence IDs.
2. **F02** `07-28-inventory-research-workflow-contracts` — full 16-package contract inventory.
3. **F03** `07-28-audit-research-workflow-validator-assurance` — validator/fixture assurance (execution needs separate authorization).
4. **F04** `07-28-pilot-ideation-evaluation-workflow-fidelity` — deep pilot ideation + evaluation couple.
5. **F05** `07-28-prepare-optional-live-research-workflow-trials` — live trial protocol design only (no model calls).
6. **F06** `07-28-synthesize-research-workflow-migration-target` — dispositions + frozen target digest + phase-2 handoff.
7. **F07** `07-28-review-research-workflow-evaluation-gate` — independent review + predecessor-gate verdict.

Child number defines dependency order. F05 may prepare protocol in parallel only after F01 freezes privacy/governance. F06 requires frozen deterministic evidence and sealed or explicit not-run live evidence. Parent publishes `research/evaluation-index.json` and `research/predecessor-gate-verdict.md` after F07.

## Requirements

1. Treat `agent-skills-private` as **read-only** source evidence.
2. Never copy private Skill bodies, validator source, tests, prompts, raw cases, or raw model output into Trellis. Tracked artifacts may contain only source-relative identifiers, hashes, abstract contracts, approved short excerpts, and aggregate findings.
3. Do not modify Procedures, Procedure runtime schemas, Dispatch Context, Result/Proposal schemas, workers, production tests, or specifications during this evaluation parent.
4. Preserve unrelated dirty paths: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`.
5. Freeze rubric/thresholds/reviewer roles **before** evidence scoring (F01).
6. Cover all 16 registered packages; every durable output mapped to a future target, explicit waiver candidate, or unresolved item.
7. Preserve read-only `research-quest` vs write-capable `research-quest-admin` boundary explicitly.
8. Host packaging must not be misclassified as methodology.
9. Dispositions are exactly one of: preserve | translate | improve | retire | unresolved.
10. Live model trials require separate explicit authorization (provider, model, private-source transmission, retention, network, cost, budget, retries, storage) and a **new execution child** if authorized—not F05 itself.
11. Phase-2 post-migration differential validation is a **separate successor** task comparing against `frozen-migration-target-v1.sha256`, not private repo HEAD.
12. No task activation, production edit, validator execution, live network/model call, commit, archive, publication, or push under the initial planning authorization.

## Evaluation rubric (must freeze in F01 before scoring)

Weighted 0–4 scale:

| Dimension | Weight |
|-----------|--------|
| Ordered-stage and contract clarity | 15% |
| Input/output and durable-artifact completeness | 15% |
| Authority, mutation, and privacy boundaries | 15% |
| Evidence, provenance, and stable-ID continuity | 15% |
| Validator coverage and fail-closed enforcement | 20% |
| Closure and failure-state semantics | 10% |
| Handoff and bounded-composition consistency | 10% |

Scores guide disposition but **cannot override hard gates**. preserve/translate require ≥2 independent evidence refs (normally source contract + validator/test/fixture).

### Hard gates (any fail → cannot preserve/translate without waiver or unresolved)

- No unauthorized canonical mutation.
- No silent success with missing critical evidence.
- Traceable provenance and stable cross-stage IDs.
- Every durable output mapped or waived.
- Explicit null/partial/blocked/failed/inconclusive outcomes where applicable.
- Explicit bounded composition.
- No private-source leakage into tracked Trellis.
- No unapproved unresolved critical behavior.

## Acceptance Criteria

- [ ] Parent + F01–F07 exist with exact order, parent/children links, status planning until authorized activation.
- [ ] Parent and every complex child have complete `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, `check.jsonl` before that child is activated.
- [ ] F01 freezes 16-package registry pin, source commit, Trellis comparison commit, Procedure inventory, hashes, rubric, taxonomy, privacy policy, reviewer protocol, evidence ID schema.
- [ ] F02 achieves 16/16 coverage with I/O, authority, composition, and preliminary disposition mapping.
- [ ] F03 (after execution auth) achieves valid-fixture accept 100%, critical-invalid reject 100%, no source/fixture mutation; defects classified not fixed.
- [ ] F04 proves coupled ideation/evaluation pilot invariants and Trellis translation (worker Proposal + root Decision, never worker canonical mutation).
- [ ] F05 produces live protocol templates and either authorization package or explicit not-run decision; no live calls in F05.
- [ ] F06 publishes `frozen-migration-target-v1.json` + `.sha256`, defect/waiver registers, phase-2 handoff; every omission/change has a waiver.
- [ ] F07 independent review issues pass | conditional | blocked; parent writes evaluation-index + predecessor-gate-verdict.
- [ ] No production Procedure/schema/worker/spec/test files changed by this parent family.
- [ ] No private Skill body/validator source/raw model output enters tracked Trellis artifacts.
- [ ] Unrelated dirty paths remain untouched.
- [ ] C01–C10 tree not modified or renumbered.

## Out of Scope

- Implementing Procedure methodology bodies or deepening `idea-*-v1` PROCEDURE.md.
- Changing control-plane schemas, workers, Dispatch Context, Result/Proposal.
- Post-migration differential validation (phase-2 successor).
- Fixing source defects in `agent-skills-private`.
- Live model execution without separate authorization + execution child.
- C08–C10 infrastructure closeout work.
- Commits, archives, publication, push.

## Open Questions

None blocking planning. Activation of F01 and any execution (validators, live trials) require **separate explicit user authorization** after planning review.

## Notes

- Critical Trellis surfaces for comparison (read-only during evaluation): `packages/core/src/research/stage-capabilities.ts`, `procedure-policy.ts`, `artifacts.ts`; `packages/cli/src/commands/research/procedure-resolution.ts`, `dispatch-approved-context.ts`, `dispatch-command.ts`; Procedure packs under `packages/cli/src/templates/research/procedures/`; specs `research-state.md`, `commands-research.md`, `research-worker-hooks.md`.
- Critical source evidence paths (read-only): `registry/skills.txt`, `skills/research-*`, `scripts/validate-research-skills.py`, `scripts/research_idea_artifact_contract.py`, `evals/research-skills/README.md`.

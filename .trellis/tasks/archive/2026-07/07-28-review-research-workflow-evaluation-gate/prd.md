# F07 Independent review and predecessor gate

## Goal

Independently review evaluation completeness, privacy, evidence integrity, and readiness; recommend pass | conditional | blocked. Parent then publishes evaluation index and predecessor-gate verdict.

## Predecessor gate

- F06 frozen target + sha256 published.
- Reviewer is not the sole primary extractor of F02–F04 evidence (blinding protocol).
- Explicit F07 activation.

## Deliverables (`research/`)

- `coverage-audit.json`
- `privacy-audit.md`
- `evidence-integrity-audit.md`
- `independent-review.md`
- `gate-recommendation.md`

## Parent publishes after F07

- `07-28-evaluate-research-workflow-fidelity/research/evaluation-index.json`
- `07-28-evaluate-research-workflow-fidelity/research/predecessor-gate-verdict.md`

## Independent review must verify

- 16/16 coverage; complete source I/O, authority, composition mapping
- rubric/threshold freeze predates scored evidence
- decisions have sufficient independent evidence
- every omission/change has a waiver
- private content did not enter tracked Trellis artifacts
- no production, Procedure, specification, test, or private-source files changed
- frozen target digest matches reviewed artifacts
- phase-2 handoff sufficient to implement and test without reinterpreting source behavior

## Verdicts

- **pass** — phase-2 methodology migration may be planned
- **conditional** — only named non-critical conditions remain
- **blocked** — critical contract, privacy, provenance, evidence, authority, or waiver gaps

## Out of Scope

- Starting Procedure methodology implementation
- Fixing source defects
- Re-running F02–F06 without adjudication protocol

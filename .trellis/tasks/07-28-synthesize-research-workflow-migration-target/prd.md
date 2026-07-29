# F06 Synthesize the frozen migration target

## Goal

Synthesize F01–F05 evidence into exhaustive dispositions and a digest-addressed `frozen-migration-target-v1` that phase-2 methodology migration must implement and test against.

## Predecessor gate

- F01–F04 complete; deterministic evidence frozen.
- F05 sealed as not-run or live evidence sealed via authorized execution child.
- Explicit F06 activation.

## Deliverables (`research/`)

- `migration-decision-ledger.csv` and `.json`
- `source-defect-register.json`
- `waiver-register.json`
- `frozen-migration-target-v1.json`
- `frozen-migration-target-v1.sha256`
- `phase-2-differential-handoff.md`
- `synthesis-report.md`

## Disposition rules

Exactly one of: preserve | translate | improve | retire | unresolved per behavior.

Each record includes: source evidence, rationale, observable inputs/outputs/terminal states, intended target capability/stage, suggested enforcement locus, phase-2 fixture/assertion IDs, defect/waiver refs, confidence, unresolved owner.

## Waiver rules

Every omitted or materially changed behavior requires explicit waiver: rationale, fidelity/safety impact, compensating control, owner/approver, review trigger. **No implicit omission.**

## Phase-2 handoff must specify (without implementing)

- Procedure-bundle requirements
- artifact-contract requirements
- validator requirements
- provenance requirements
- digest requirements
- Context requirements
- differential-testing requirements

## Hard gates

- preserve/translate need ≥2 independent evidence refs
- hard parent gates still apply
- unresolved critical behaviors block pass at F07 unless waived

## Out of Scope

- Implementing Procedures
- Changing production code

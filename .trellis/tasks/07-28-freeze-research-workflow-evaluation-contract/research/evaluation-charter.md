# Evaluation charter — evaluation-contract-v1.0.0

## Purpose

Freeze and evaluate the private Research Skill family methodology contracts so Trellis can decide what to preserve, translate, improve, retire, or leave unresolved **before** Procedure-methodology migration. Publish a digest-addressed migration target as a predecessor gate for phase-2 implementation.

## Non-goals

- Implementing or editing Trellis Procedures, schemas, workers, specs, or tests during evaluation
- Migrating private Skill bodies into Trellis
- Post-migration differential validation (separate successor task)
- Live model execution without separate authorization
- Absorbing or renumbering C01–C10 infrastructure migration

## Scope

- All **16** registered `research-*` packages at source commit `9a02a533f5f3ecfd0c0789a01588fc492d321d6c`
- Trellis comparison commit `b445d4245b81afa14006c864229811c227e12e71` (`variant/research-workflow`) and current Procedure inventory
- Validators, fixtures (hashed), and coupled ideation/evaluation pilot
- Optional live-trial **protocol** only unless later authorized

## Authority of freeze

Artifacts under this directory for `evaluation-contract-v1.0.0` are **immutable**. Corrections require a new `evaluation_contract_version`. Downstream F02–F07 must cite this version.

## Stop gates (pre-scoring)

| Gate | Result |
|------|--------|
| Source clean | PASS |
| 16-package registry reproducible | PASS |
| Privacy policy defined | PASS |

## Outcomes

Parent predecessor-gate verdict after F07: **pass** | **conditional** | **blocked**.
Phase-2 methodology migration may be planned only on pass, or when the user explicitly accepts every named conditional item.

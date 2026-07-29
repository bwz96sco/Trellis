# Phase-2 differential handoff

## Pin

- evaluation_contract_version: `evaluation-contract-v1.0.0`
- frozen-migration-target-v1.sha256: `0b09883b5233141be16ca2939f0c73a5c481523e130d61360e5580cd5849c33b`
- source_commit (evidence only): `9a02a533f5f3ecfd0c0789a01588fc492d321d6c`
- trellis_commit at evaluation: `b445d4245b81afa14006c864229811c227e12e71`

## Do not

- Reinterpret private source HEAD after this pin without a new evaluation-contract version
- Compare phase-2 implementation to unpinned private repo state
- Copy private Skill bodies into Trellis

## Must implement / test

1. Procedure-bundle deepening for preserve/translate behaviors (esp. ideation couple)
2. Artifact contracts for durable packs and exclusive selected/blocked closure
3. Validators fail-closed for critical negatives (from F03/F04)
4. Provenance + stable cross-stage IDs
5. Procedure digests bound into Dispatch Context
6. Worker Proposal-only; root Decision for selection
7. Differential tests for each DFT-* / behavior with dual evidence
8. Explicit handling of unresolved packages via waiver or later decision (figure/slides/survey)

## Live trials

Not run. Optional later execution child; not required to start phase-2 planning if deterministic evidence accepted.

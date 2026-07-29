# Reviewer and blinding protocol — evaluation-contract-v1.0.0

## Roles

| Role | Responsibility |
|------|----------------|
| Extractor | Builds inventory/pilot matrices from source (abstract only) |
| Assurance runner | Executes isolated validator/fixture runs after auth |
| Independent reviewer | F07 gate; not sole primary extractor |
| Adjudicator | Optional single bounded adjudication round |

## Blinding (live trials / independent scoring)

- Blind condition labels (A/B/C), not package names, when reviewing live outputs.
- Blind keys live only in private evidence directory.
- Case authors do not sole-review their own cases.

## Bias controls

- Freeze snapshot, cases, rubric, thresholds before scoring.
- No post-launch threshold relaxation.
- No discretionary favorable reruns.
- At most one adjudication round.
- Synthetic/approved holdouts for live trials — not source validator fixtures.

## F07 independence

Primary authors of F02–F04 cannot be the sole final F07 reviewer of record. Document reviewer IDs in gate recommendation.

# F02 Inventory all research workflow contracts

## Goal

Produce a complete static inventory of all **16** registered research workflow packages: purpose, stages, I/O, outcomes, IDs, provenance, validators, authority, handoffs, composition edges, host assumptions, preliminary disposition, and future differential-test case IDs.

## Predecessor gate

- F01 evaluation contract frozen and accepted (`evaluation_contract_version` cited).
- Explicit F02 activation authorization.

## Deliverables (under `research/`)

- `package-registry-snapshot.json`
- `workflow-contract-matrix.csv` and `workflow-contract-matrix.json`
- `source-io-ledger.csv`
- `authority-map.csv`
- `composition-graph.json`
- `static-inventory-findings.md`

## Per-workflow record fields

- purpose and activation contract
- ordered stages, inputs, preconditions, stop conditions
- every durable output, report, summary, claim, review, closure artifact
- successful, null, partial, failed, blocked, inconclusive outcomes
- stable identifiers and lifetime
- evidence/provenance requirements
- validator entrypoints and prose-only requirements
- read/write, project-owner, evaluator, mutation authority
- handoffs and **bounded composition edges** (three source-defined edges recorded separately from ordinary handoffs)
- network, external-cost, repository, storage, host assumptions
- preliminary disposition: preserve | translate | improve | retire | unresolved (+ evidence IDs)
- future differential-test case ID for each migratable behavior

## Hard inventory gates

- [ ] 16/16 package coverage
- [ ] every source output mapped to future target, waiver candidate, or unresolved
- [ ] all three source-defined composition edges recorded separately from ordinary handoffs
- [ ] explicit preservation of read-only `research-quest` vs write-capable `research-quest-admin`
- [ ] host packaging not misclassified as methodology

## Out of Scope

- Running validators (F03)
- Deep pilot scoring (F04)
- Final disposition freeze (F06)
- Copying private skill bodies into Trellis

## Privacy

Abstract contracts and path references only. Short excerpts only if charter allows and redacted.

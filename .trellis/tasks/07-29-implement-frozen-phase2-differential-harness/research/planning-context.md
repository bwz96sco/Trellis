# P2-04 planning context

## Pins

- Contract/digest: `evaluation-contract-v1.2.0` / `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Infrastructure base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## On-demand evidence

- Parent `research/differential-case-allocation.json`
- Archived `differential-test-matrix-v1.2.json`, coverage reconciliation, and gate recommendation
- Eight implementation-child `research/differential-case-map.json` files

P2-04 reproduces—not reassigns—the frozen allocation in a Trellis-native deterministic harness. Required totals are 229 cases: 212 critical, 17 non-critical, 224 package, 3 composition, 1 Proposal-only control, and 1 host-retirement case. Unknown, duplicate, missing, ownership-drifted, criticality-drifted, or falsely inapplicable IDs fail closed.

No private fixture or validator body may be copied. This child owns only harness/test/spec paths listed by the parent. Planning grants no implementation, activation, live-call, commit, archive, publication, release, or push authority.

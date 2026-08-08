# Correct evaluation-contract v1.3.1 semantic defects — attempt 2

## Goal

Create a forward-only sibling governance campaign for a second authoring attempt of the exact contract identity `evaluation-contract-v1.3.1`. G132 supersedes only G131 finding `CS6-1-CONTRACT-004`'s defective assumption that every Procedure/capability row must select a non-null lifecycle artifact family.

## Immutable predecessors

- A11: `3534529a36a10ea8015a51f71a93e2b78300a563` — four verified contract findings and `contract-defect` disposition.
- G131: `15de62625685c32f00edf9aef8f2c1cf5a05d7bb` — immutable first-attempt governance.
- A131-0 predecessor: `9392f20ce0dd93107205ed7c28dc964b5879b7bc` — immutable assignment history; G131/A131 routes are never resumed or amended.
- Procedure 2.0.6 evidence: `0afef5adaea2a58c8c6cc5a3f1a51a054fa1a39d` — exact Git-object source for all 17 lifecycle projections.
- Contract identity remains exactly `evaluation-contract-v1.3.1`; attempt-2 is route identity only.

## Requirements

### R1 — Forward-only topology

G132 owns governance only and contains exactly the ordered children `08-08-author-evaluation-contract-v1-3-1-attempt-2`, `08-08-assure-evaluation-contract-v1-3-1-mal1-attempt-2`, and `08-08-decide-evaluation-contract-v1-3-1-attempt-2`. The campaign is active and unassigned; all children remain planning, inactive, unassigned, and routing-only. Boundaries are exactly G132, A132-0, A132-1, B132-0, B132-1, O132-0, and O132-1.

### R2 — Narrow finding-004 supersession

Preserve `CS6-1-CONTRACT-001`, `002`, and `003` unchanged. Preserve finding-004's closed identity domain, fail-closed identity errors, authority-snapshot lookup, 11-family codomain, all G131 propagation tables, digest framing, 71 `DEC-*` guards, absence of direct-region `EV-*`/`SRC-*` additions, and no-fifth-change rule. Supersede only the universal non-null family assignment assumption and the incomplete 845-decision matrix requirement.

### R3 — Exact replacement mapping schema

Every row has exactly `procedureId`, `procedureVersion`, `capabilityId`, `disposition`, and `artifactFamily`. `procedureVersion` is exactly `2.0.7`; `disposition` is exactly `applicable` or `notApplicable`. Applicable rows require one exact non-null member of the frozen 11-family codomain. Not-applicable rows require exactly JSON null. Null is a disposition sentinel, never a twelfth family.

Applicability is exactly:

```text
mappingRow.disposition == "applicable"
AND binding.targetArtifactFamily == mappingRow.artifactFamily
```

The 17 row values are frozen by G132 from immutable Procedure 2.0.6 projections. A132 may encode and prove them but may not choose alternatives.

### R4 — Complete matrix and family separation

The assurance domain is `17 × 845 = 14,365` decisions: 975 positive and 13,390 negative. Every not-applicable row has zero positives. `experiment-campaign-v1` uses lifecycle family `research-experiment-campaign` with 195 positive lifecycle decisions; its independent closure projection remains `research-experiment`. Lifecycle and closure families never infer or substitute for one another.

### R5 — Exact inventories and containment

G132 changes exactly 36 paths: 24 planning files, five append-only canonical-parent overlays, and seven governance outputs. Future inventories are exact: A132-0 2, A132-1 15, B132-0 2, B132-1 11, O132-0 2, O132-1 1. Old G131/A131/B131/O131 roots are immutable and receive no files.

Workers remain Proposal-only and live Procedure selection remains exactly `1.0.0`. Human review/equivalence, repair, runtime, CLI, Procedure package, harness, live-selection, activation, archive, release, publication, and push authority remain false.

## Acceptance criteria

- [ ] All immutable commit, tree, path, blob, byte-length, and SHA-256 identities authenticate from Git objects.
- [ ] Thirteen projections are non-null/non-empty and internally family-consistent; four are null/empty.
- [ ] The exact conditional-nullability schema, 17 rows, 11-value codomain, and 14,365 matrix reconcile.
- [ ] G131 continuity and exact narrow supersession validate mechanically.
- [ ] The exact 36-path precommit boundary plus five inherited dirty entries is present with an empty stage.
- [ ] Validation evidence is deterministic across at least two read-only verification runs.
- [ ] No staging, commit, A132-0 activation, production edit, or operational authority occurs.

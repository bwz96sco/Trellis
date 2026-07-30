# P2-01 pin attestation

Attested at: 2026-07-29T15:07:05Z
Child: 07-29-freeze-phase2-methodology-packaging-contracts

| Pin | Expected | Observed | Status |
|-----|----------|----------|--------|
| methodology_contract | evaluation-contract-v1.2.0 | evaluation-contract-v1.2.0 | PASS |
| methodology_digest | `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb` | `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb` | PASS |
| source_skills_commit | `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` | read-only evidence (not re-pinned) | PASS |
| infra_pin_commit | `ccd5bb3afc99283252c599916a2b8c2e05075cc6` | `ccd5bb3afc99283252c599916a2b8c2e05075cc6` (implementation base) | PASS |
| target_path | archive .../frozen-migration-target-v1.2.json | exists | PASS |
| inventory_path | archive .../normalized-workflow-inventory-v1.2.json | exists sha `ed1ed07252861da7…` | PASS |
| matrix_path | archive .../differential-test-matrix-v1.2.json | cases=229 | PASS |

## Distinction

- **Methodology comparison commit / digest** identifies the frozen *what to migrate* (v1.2 target).
- **Infrastructure pin** (`ccd5bb3afc99283252c599916a2b8c2e05075cc6`) identifies the Trellis *control-plane base* for implementation.
- These are separate pins and must not be conflated.

## Guide hash fields

Guide lists:

- Frozen owner-case hash: `a2278e3042bd3d66c5e088add2893d7ae139e5a1af693439e281e5a68fd5f74e`
- Frozen full-metadata hash: `3f821e086b10c7ec619feeacbf148c5db424098ef5885048e26c7f74e15931ba`

Those exact blobs are not present as standalone files in the tree. P2-01 freezes **computed** hashes of the parent planning allocation artifacts as the child freeze source of truth (see `allocation-freeze-hashes.json`). If a later reviewed ceremony reintroduces the guide's literal blobs, a map revision can re-attest.

## Privacy

No private Skill bodies read into deliverables beyond abstract inventory already frozen in Phase-1.

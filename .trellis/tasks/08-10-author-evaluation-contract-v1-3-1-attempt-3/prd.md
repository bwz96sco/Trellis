# A133 corrected candidate

## Goal
Generate the same v1.3.1 normative candidate with corrected target/evidence closure only.

## Requirements
- Preserve every G131/A131/B131/O131 and G132/A132/B132/O132 byte and commit as immutable evidence.
- Authorize only `candidate-evidence/provenance-target-closure`; this is not a fifth normative contract semantic correction.
- Preserve all seven normative leaves, 3,343 provenance rows, 9,515 semantic-diff rows, and established populations.
- Preserve inherited dirty paths and all production, Core, CLI, Procedure, harness, runtime, live-selection, activation, release, publication, and push surfaces.
- Keep author, reviewer, and operator identities distinct; MAL-1 is machine-only (`humanReviewed:false`, `humanEquivalent:false`).
- Ten named invariant outputs must be byte-identical to A132.
- Only `frozen-semantic-target-v1.3.1.json`, `assurance-corpus-v1.3.1.json`, `author-validation.json`, `author-v1.3.1.py`, and `author-output-manifest-v1.3.1.json` may change.
- Emit exactly 19 target keys and close all 14 target pointers semantically.
- Run two clean deterministic generations.

## Acceptance criteria
- [ ] Fresh author assignment precedes generation.
- [ ] Exact 15-file inventory, invariant/change partition, populations, target schema, namespaces, and digest topology pass.
- [ ] No hand-edited generated JSON or authority widening.

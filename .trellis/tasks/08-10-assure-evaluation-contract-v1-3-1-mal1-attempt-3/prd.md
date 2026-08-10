# B133 independent MAL-1 assurance

## Goal
Independently assess the exact immutable A133 candidate without repair authority.

## Requirements
- Preserve every G131/A131/B131/O131 and G132/A132/B132/O132 byte and commit as immutable evidence.
- Authorize only `candidate-evidence/provenance-target-closure`; this is not a fifth normative contract semantic correction.
- Preserve all seven normative leaves, 3,343 provenance rows, 9,515 semantic-diff rows, and established populations.
- Preserve inherited dirty paths and all production, Core, CLI, Procedure, harness, runtime, live-selection, activation, release, publication, and push surfaces.
- Keep author, reviewer, and operator identities distinct; MAL-1 is machine-only (`humanReviewed:false`, `humanEquivalent:false`).
- Fresh non-fork reviewer consumes clean Git archives only.
- Reuse B132 coverage and strengthen target schema, 14-pointer semantic closure, namespaces, ten/five partition, and digest-chain checks.
- Required mutations cover every target field, wrapper provenance/ID, namespace errors, EV-CONTROL-PINS removal, provenance-row drift, stale digests, cycles, normative drift, authority widening, and canonical-byte defects.

## Acceptance criteria
- [ ] Exact 11-file package from two identical clean runs.
- [ ] Honest deterministic `pass` or `fail`; no repair.

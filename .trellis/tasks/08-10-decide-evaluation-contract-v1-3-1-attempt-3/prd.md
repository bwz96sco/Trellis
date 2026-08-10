# O133 later operator decision

## Goal
After committed B133-1, record one later genuine operator accept, reject, or stop decision.

## Requirements
- Preserve every G131/A131/B131/O131 and G132/A132/B132/O132 byte and commit as immutable evidence.
- Authorize only `candidate-evidence/provenance-target-closure`; this is not a fifth normative contract semantic correction.
- Preserve all seven normative leaves, 3,343 provenance rows, 9,515 semantic-diff rows, and established populations.
- Preserve inherited dirty paths and all production, Core, CLI, Procedure, harness, runtime, live-selection, activation, release, publication, and push surfaces.
- Keep author, reviewer, and operator identities distinct; MAL-1 is machine-only (`humanReviewed:false`, `humanEquivalent:false`).
- Pass permits accept/reject/stop; fail permits reject/stop only.
- Require exact immutable inputs, accountable identity/source digest, non-empty rationale, residual-risk acknowledgement, and RFC3339 UTC timestamp.
- Acceptance grants semantic use only, never technical or operational authority.

## Acceptance criteria
- [ ] O133 remains planning/inactive until a new genuine instruction.
- [ ] O133-0 and O133-1 are separate exact commits.

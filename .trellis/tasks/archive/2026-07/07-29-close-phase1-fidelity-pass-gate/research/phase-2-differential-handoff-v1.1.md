# Phase-2 differential handoff (v1.1)

## Pin

- evaluation_contract_version: `evaluation-contract-v1.1.0`
- frozen-migration-target-v1.1.sha256: `a8d49c8a87e7688fda67ede73c7b04cb92a88eebda4d650c61309da025209a78`
- historical v1.0.0 sha256: `0b09883b5233141be16ca2939f0c73a5c481523e130d61360e5580cd5849c33b` (do not use as implementation pin)
- source_commit (evidence): `9a02a533f5f3ecfd0c0789a01588fc492d321d6c`
- trellis_commit at freeze: `4bf5d898090d242b65ab9c88524f75648a32bad9`

## Architecture open point

Phase 2 must determine procedure support material packaging (instruction-only vs digest-bound support pack vs trusted runtime contracts). No undigested sibling may affect execution.

## Implementation order (recommended)

1. Procedure bundle/support-pack and digest architecture
2. Artifact-contract and trusted-validator architecture
3. Ideation/evaluation methodology pilot (including IMP-IDEA-* validators)
4. Differential validation against this frozen target
5. Remaining existing capabilities
6. Optional figure/slides/survey capabilities (explicit activation only)
7. Family-wide differential and production-readiness gate (optional live trials)

## Infrastructure dependency

Phase-2 **implementation** should wait for a stable C08–C10 infrastructure snapshot to avoid overlapping changes. Phase-2 **planning** may begin after Phase-1 pass.

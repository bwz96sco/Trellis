# experiment-campaign-v1 methodology (v2.0.7)

## Purpose

Dormant Procedure package for `experiment-campaign-v1`, projected from the exact accepted `evaluation-contract-v1.3.1` semantics.

## Exact mapping

- Capability: `research.experiment.campaign`
- Lifecycle disposition: `applicable`
- Artifact family: `research-experiment-campaign`

## Authority

The worker is Proposal-only. It may produce only declared artifacts within allowed write paths. Root-owned validation, canonical recording, Decision, activation, and publication authority do not move to the worker.

## Worker-visible support files

- `methodology/artifacts/artifact-contract.json`
- `methodology/closure/research-experiment.json`
- `methodology/instructions/checkpoints.md`
- `methodology/validators/validators.json`

This list is complete. Do not discover additional methodology files dynamically. Validator files contain descriptors only and never executable validator bodies.

## Stop conditions

Stop on missing, unknown, contradictory, aliased, ambiguous, or unauthenticated facts; support-file drift; undeclared output; invalid closure evidence; or any attempted authority widening.

## Methodology binding

Bound to `evaluation-contract-v1.3.1` semantic digest `sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af`, A133 commit `5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3`, and seven-member aggregate `sha256:718d7ecec808199148b63ce64208e60d52be18575b175df67ef620596107fa34`. The package is dormant; live Procedure selection remains `1.0.0`.

# CS6-1 — Audit accepted v1.3 semantic leaves

## Goal

Independently determine whether the seven exact accepted `evaluation-contract-v1.3.0` semantic leaves are internally sound before any CS6 technical correction begins.

## Dependencies

- CS6-0 governance must be validated and committed under its separate governance boundary.
- This task requires separate activation and an assigned `independent-semantic-auditor` who did not author the accepted v1.3.0 leaves.
- Inputs are the exact seven leaves authenticated by aggregate `sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef` and semantic digest `sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f`.

## Ownership

Owned paths:

- `.trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/**`.

Future research outputs are limited to exact input/byte attestation, semantic audit plan, cross-leaf consistency findings, execution evidence, and one unambiguous disposition.

## Requirements

- Recompute each accepted leaf hash/length and the seven-member aggregate from exact committed bytes.
- Audit all 64 durable-output dispositions, all 13 lifecycle dimensions or explicit inapplicability, exact closure fields/sources, all 20 validator identities/triples, all 876 bindings, derivability/provenance, and differential obligations.
- Check cross-leaf referential integrity and absence of generic undeclared `Result.status` authority.
- Use accepted public/Trellis evidence and the contract itself; do not use current runtime behavior as the sole semantic oracle.
- Emit exactly one disposition: `leaves-sound` or `contract-defect`.
- Make no repair and do not edit accepted leaves.

## Exclusions

- All production source, tests, Procedure packages, registries, specifications, accepted leaf files, CS5 evidence, assurance outputs, operator records, and `.trellis/research/**`.
- Private source bodies, prompts, validators, tests, fixtures, cases, or raw outputs.
- Human-review or human-equivalence claims.

## Activation gate

Separate user approval must activate CS6-1 after CS6-0 is frozen. The auditor identity and independence basis must be recorded before audit execution.

## Stop gates

- Stop with `contract-defect` if any accepted leaf is semantically inconsistent, incomplete, or unauthorizable.
- Stop if exact input bytes or aggregate do not match.
- Stop if the audit would require repairing an accepted leaf or reading private authority.
- A `contract-defect` result blocks CS6-2 through CS6-8 and requires a new `evaluation-contract-v1.3.1+` authoring/assurance cycle.

## Commit boundary

A future A11 commit may contain only this task's planning/status changes and task-local audit evidence. It may not contain repairs, production/test/package/spec changes, or any operational authority.

## Authority flags

`humanReviewed`, `humanEquivalent`, `repairAuthority`, `completeSystemMachineAssuranceAccepted`, `operatorDecisionReceived`, `activationAuthorized`, `archiveAuthorized`, `releaseAuthorized`, `publicationAuthorized`, and `pushAuthorized` remain false.

## Acceptance criteria

- [ ] Seven exact leaves and the aggregate are independently reproduced.
- [ ] All required semantic domains and cross-leaf references are audited.
- [ ] The disposition is exactly `leaves-sound` or `contract-defect` with evidence.
- [ ] No accepted or historical byte is changed.
- [ ] No later technical child is authorized by this task alone.

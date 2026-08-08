# Author evaluation-contract v1.3.1

## Goal

Author a deterministic seven-member `evaluation-contract-v1.3.1` candidate that corrects exactly the four A11-verified defects and proves every other semantic difference is forbidden or mechanical propagation.

## Dependencies

- Committed campaign governance G131.
- Immutable A11 `3534529a36a10ea8015a51f71a93e2b78300a563`.
- Exact accepted v1.3.0 semantic digest and seven-member aggregate.
- Separate A131-0 author activation and assignment.

## Ownership

Owned path: `.trellis/tasks/08-08-author-evaluation-contract-v1-3-1/**`.

The author owns candidate leaves, deterministic author tooling, manifests, semantic-diff evidence, and author validation only. Accepted v1.3.0, A11, production, tests, Procedure packages, registries, specifications, assurance, operator records, and `.trellis/research/**` are excluded.

## Requirements

### R1 — Exact seven-member candidate

Produce exactly:

1. `durable-output-disposition-v1.3.1.json`;
2. `artifact-lifecycle-contract-v1.3.1.json`;
3. `validator-registry-v1.3.1.json`;
4. `validator-binding-matrix-v1.3.1.json`;
5. `differential-test-matrix-v1.3.1.json`;
6. `derivability-provenance-matrix-v1.3.1.json`;
7. `closure-contract-v1.3.1.json`.

Also produce a candidate manifest, frozen semantic target, four-finding correction ledger, JSON-pointer semantic-diff ledger, deterministic author script, and author validation evidence.

### R2 — Closed report-v2 schema

The corrected report authority must define complete root and nested object schemas, property names, types, required/optional fields, enums, cardinalities, nullability, recursive unknown-key behavior, canonical key ordering, array ordering, UTF-8 requirements, non-finite/duplicate-key rules, digest domain/framing, self-field exclusion, and final-LF serialization behavior. A conforming report must be independently constructible and rejectable from accepted authority alone.

### R3 — Twenty executable validator contracts

For every exact validator `id@version`:

- replace unrestricted fact objects with closed rule-specific fact schemas;
- define exact required fact names, types, enums, cardinalities, and nullability;
- define a deterministic machine-evaluable predicate or complete decision table;
- bind stable error order and severity;
- define applicability from authenticated authority facts;
- reject unknown, missing, contradictory, or ambiguous facts.

No validator may depend on opaque implementation behavior or author tooling as normative authority.

### R4 — Reproducible global differential obligations

For all 44 global cases:

- bind an exact base fixture identity and digest;
- define an ordered closed mutation operation with exact target pointer and value/operation;
- define preconditions and applicability;
- define deterministic expected execution, verdict, exact ordered errors, and zero-write/allowed-write observation;
- define exact inapplicability predicates for the 11 inapplicable cases.

Label-only mutations are forbidden.

### R5 — Authoritative lifecycle applicability mapping

Define a closed total mapping for the exact ordered 17 Procedure `2.0.7` ID/capability tuples. Each A131-1-authored row must select exactly one of the 11 distinct artifact-family enum values frozen from immutable `artifact-lifecycle-contract-v1.3.json#/artifacts/*/family/value` and provide proof; G131 does not choose the per-row assignments. Bind the mapping to authority-snapshot fields available to root validators. Unknown, missing, duplicate, aliased, conflicting, or out-of-codomain identities fail closed with stable errors. Prove deterministic applicability for all 845 lifecycle bindings and distinguish mapping authority from Procedure package or runtime behavior.

### R6 — No fifth semantic change

A correction ledger contains exactly `CS6-1-CONTRACT-001` through `004`. Every changed JSON pointer is classified as one finding or one finite G131-frozen propagation match with its exact old/new guard. Enforce the finite direct-region historical-reference guards: all 71 baseline `DEC-*` pointer/value pairs remain exact, the baseline contains no direct-region `EV-*` or `SRC-*` pair, and no such reference pair may be added, removed, aliased, or replaced. Preserve 64 outputs, 65 artifacts, 11 lifecycle artifact-family enum values, 13 dimensions, 20 validators, 876 bindings, 3,343 provenance rows, 116 cases, and 4 closure families; any count drift is a stop condition.

### R7 — Strict deterministic bytes

All JSON is strict UTF-8, duplicate-key-free, non-finite-free, recursively canonical, compact, and exactly one final LF. Digests are domain-separated and never self-referential. The author script regenerates identical bytes from immutable inputs.

## Activation and stop gates

Do not start until G131 and A131-0 are committed. Stop on input mismatch, private authority, runtime/package/harness oracle use, open semantics, unrelated delta, count drift, ambiguous applicability, or any protected-byte change.

## Commit boundaries

- **A131-0**: task activation, author assignment, and exact input authorization only.
- **A131-1**: complete candidate and author evidence only.

No commit is authorized by the current planning instruction.

## Authority

`humanReviewed`, `humanEquivalent`, `repairAuthority`, `runtimeImplementationAuthorized`, `activationAuthorized`, `archiveAuthorized`, `releaseAuthorized`, `publicationAuthorized`, and `pushAuthorized` remain false.

## Acceptance criteria

- [ ] Seven exact v1.3.1 leaves and all author evidence regenerate byte-identically.
- [ ] Each of the four defects has closed executable semantics and focused adversarial author tests.
- [ ] All 20 validators, 44 global cases, 11 inapplicability predicates, and 845 lifecycle applicability decisions are explicit.
- [ ] Every semantic delta is classified; no fifth semantic change exists.
- [ ] v1.3.0, A11, historical evidence, production, tests, packages, and dirty paths are unchanged.
- [ ] The candidate remains unaccepted and does not authorize assurance, implementation, or activation by itself.

## Exact future output inventory

A131-0 may change exactly the Author `task.json` and `research/a131-0-author-assignment-and-input-authorization.json`. A131-1 may create exactly 15 files: the seven normative leaves; `contract-candidate-manifest-v1.3.1.json`; `frozen-semantic-target-v1.3.1.json`; `four-finding-correction-ledger-v1.3.1.json`; `semantic-diff-ledger-v1.3.0-to-v1.3.1.json`; `assurance-corpus-v1.3.1.json`; `author-validation.json`; `author-v1.3.1.py`; and `author-output-manifest-v1.3.1.json`. No sidecar or extra fixture file is allowed.

The candidate manifest inventories only the ordered seven leaves. The author-output manifest inventories and hashes the other 14 A131-1 outputs, excludes its own hash, and is bound by the immutable A131-1 Git tree.

## Frozen author corpus

The assurance corpus must enumerate finite case IDs and expected results for every report-v2 schema branch and invalid byte class; every branch and invalid-fact class of all 20 validator predicates; all 44 global mutations and 11 inapplicability predicates; all 845 lifecycle decisions and invalid mapping identities; removal/contradiction of every newly required authority element; and every semantic-diff/propagation classification. Global fixture bytes or complete fixture specifications are embedded in the differential leaf.

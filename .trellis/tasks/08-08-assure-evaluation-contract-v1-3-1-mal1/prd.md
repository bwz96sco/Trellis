# Assure evaluation-contract v1.3.1 — MAL-1

## Goal

Use a fresh independent machine reviewer to determine whether the exact immutable v1.3.1 candidate closes all four A11 defects without introducing a fifth semantic change.

## Dependencies

- Exact committed A131-1 candidate.
- Separate committed B131-0 reviewer assignment.
- Mechanically demonstrated author/reviewer inequality.
- Clean review extraction from the exact Git object; no author working-tree overlay or shared scratch.

## Ownership

Owned path: `.trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1/**`.

The reviewer owns only assignment metadata, assurance tooling, raw execution evidence, audits, and verdict. The reviewer may not modify candidate bytes, accepted leaves, author evidence, production, tests, packages, specifications, operator records, or `.trellis/research/**`.

## Machine-only assurance contract

- `humanReviewed:false`.
- `humanEquivalent:false`.
- `repairAuthority:false`.
- Fresh runtime and accountable reviewer identity distinct from the author and prior primary authoring runtime.
- Exact immutable subject and sanitized environment.
- Continue through the complete mandatory corpus after failures.
- Verdict exactly `pass` or `fail`; ambiguity is `fail`.
- No automatic acceptance, implementation, activation, release, publication, or push.

## Exact B131-1 output allowlist

1. `independent-semantic-assurance.py`;
2. `exact-input-attestation.json`;
3. `reviewer-independence.json`;
4. `package-integrity-and-semantic-diff-audit.json`;
5. `report-v2-schema-audit.json`;
6. `validator-semantics-audit.json`;
7. `differential-reproducibility-audit.json`;
8. `procedure-family-applicability-audit.json`;
9. `cross-leaf-adversarial-audit.json`;
10. `execution-evidence-ledger.json`;
11. `assurance-verdict.json`.

B131-0 assignment metadata is separate from this allowlist. No additional B131-1 output is allowed.

## Required assurance

### A1 — Exact subject and package integrity

Independently recompute all seven member hashes, lengths, aggregate, candidate manifest, semantic target digest, author commit/tree identity, and semantic-diff ledger. Reject unknown or missing physical members and symlink/alias substitutions.

### A2 — Report-v2 schema

Generate and validate representative complete valid reports plus exhaustive structural negatives for missing fields, wrong types, invalid enums/cardinalities, nullability, nested unknown keys, duplicate keys, non-finite numbers, unpaired surrogates, key/array ordering, digest domain, own-field exclusion, and final-LF rules.

### A3 — Validator semantics

For all 20 validators, independently construct valid, invalid, missing, unknown, contradictory, and inapplicable fact sets. Execute the contract-defined predicate or decision table and verify exact ordered errors and severity. The author generator may not be the sole oracle.

### A4 — Differential reproducibility

Execute every one of the 44 global mutation definitions against its exact base fixture. Verify all 11 inapplicability predicates and exact expected run/not-run, verdict, error ordering, and write observation. Reject labels, incomplete operations, mutable fixture references, or undeclared preconditions.

### A5 — Procedure-family applicability

Verify the exact ordered 17 Procedure `2.0.7`/capability tuples and exact equality of the mapping codomain to the 11 immutable accepted lifecycle artifact-family enum values. Verify that A131-1, not G131, chose and proved exactly one codomain member per row; reject missing, duplicate, aliased, conflicting, unknown, or out-of-codomain identities and independently reproduce all 845 lifecycle applicability decisions from authenticated authority facts alone.

### A6 — Cross-leaf and no-fifth-change challenge

Remove or contradict every newly required authority element and prove fail-closed behavior. Independently compare v1.3.0 to v1.3.1 and verify every changed JSON pointer maps to one of the four finding IDs or unavoidable propagation. Verify exact preservation of all 71 direct-region baseline `DEC-*` pointer/value guards, the absence of baseline direct-region `EV-*`/`SRC-*` pairs, and rejection of any added, removed, aliased, or replaced historical reference pair.

## Stop gates

Any input mismatch, reviewer dependence, repair attempt, non-allowlisted output, ambiguous schema/predicate/mutation/mapping, missing case, unexplained delta, flake, or evidence gap is `fail`. A failed assurance is immutable. It may reach only a separately instructed operator `reject-with-rationale` or `stop`, or a new additive author/assurance attempt; it can never become acceptance or repair A131-1.

## Commit boundaries

- **B131-0**: reviewer assignment/authorization and independence basis only.
- **B131-1**: exactly the 11 allowlisted assurance outputs.

No commit or execution is authorized by the current planning instruction.

## Acceptance criteria

- [ ] Reviewer independence and exact Git subject are mechanically established.
- [ ] All seven members and all author evidence are independently authenticated.
- [ ] All four correction domains pass exhaustive positive/negative assurance.
- [ ] All 20 validators, 44 global mutations, 11 inapplicability predicates, and 845 applicability decisions are executed.
- [ ] No fifth semantic change or unexplained pointer exists.
- [ ] The output set is exactly allowlisted and the verdict is exactly `pass` or `fail`.
- [ ] Candidate and protected bytes remain unchanged.
- [ ] All operational and human-equivalence authority remains false.

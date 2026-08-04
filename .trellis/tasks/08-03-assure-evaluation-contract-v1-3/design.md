# V13-B design — Independent evaluation contract v1.3 assurance

## 1. Boundary

V13-B is a read-only exact-input assurance gate. It evaluates one immutable V13-A authoring commit and writes only nine allowlisted assurance outputs. It owns no candidate repair, production/test/Procedure/registry/specification work, activation, packaging, or release action.

## 2. Input identity

The assurance subject is the tuple:

```text
V13-A authoring commit hash
+ contract-candidate-manifest-v1.3.json path and SHA-256
+ evaluation-contract-v1.3.0 identity
+ frozen-migration-target-v1.3.json path and SHA-256
```

All values must be supplied exactly in the assurance execution record. Candidate bytes are extracted from the immutable commit into an isolated read-only location. Working-tree files and later commits are not substituted.

## 3. Independence model

Independence is accountable-identity separation, not a different agent label. The check records:

- V13-A commit author name/email;
- V13-A authoring evidence accountable identity and source;
- V13-B reviewer accountable identity and source;
- exact comparison outcome.

The V13-B task remains unassigned until a distinct reviewer is selected. Missing, ambiguous, or equal identity yields an immediate fail verdict.

## 4. Assurance pipeline

```text
exact immutable input tuple
  -> isolated commit extraction
  -> identity independence gate
  -> strict byte/schema/digest verification
  -> provenance and public-citation verification
  -> 64-output and 13-dimension completeness
  -> closure and validator binding verification
  -> privacy, authority, compatibility, and mutation checks
  -> independent rebuild/digest recomputation
  -> exact pass/fail verdict
```

The reviewer does not call the production R2A parser as the sole oracle and does not import candidate-authored validation logic as proof of itself.

## 5. Verification domains

### Schema and digest

Verify UTF-8, BOM rejection, duplicate decoded keys, exact schemas, canonical object ordering, array-order preservation, final-LF rules, manifest member set, media types, byte lengths, hashes, and filename-bound sidecars. Independently recompute both manifest and methodology digests.

### Provenance

Every normative leaf resolves to exactly one of the four classes. Inherited facts resolve to a public immutable source digest and exact citation. New decisions contain the required rationale/alternatives/compatibility/visibility/validator/fixture record. Missing data cannot masquerade as inapplicable.

### Coverage and lifecycle

Reconstruct the cited public 64-output set independently and compare exact set equality, uniqueness, alias targets, and dispositions. For every enforceable artifact/checkpoint, verify all 13 dimensions or explicit inapplicable/blocked records with errors, validators, and fixture obligations.

### Closure and validators

Verify exact closure families, canonical source paths, types, null/absence rules, producer/reader/evidence/order/zero-write behavior, stable errors, and validator triples. Mutation fixtures must prove undeclared `Result.status` inference fails. Validator bindings must be exact, unique, registry-backed, and unable to downgrade trusted severity.

### Privacy, authority, and compatibility

Verify no private source dependency or embedded private content, Proposal-only workers, root-only validation/Decision authority, independent version domains, immutable historical `2.0.2`/v1.2 binding, and future `2.0.3`/accepted-v1.3 binding intent. Active live v1 selection remains unchanged.

## 6. Output model

`research/assurance-plan-v1.3.json` is the normative allowlist. The nine assurance outputs separate exact input pins, reviewer identity, schema/digest, provenance, lifecycle coverage, closure/validator, privacy/mutation, execution evidence, and final verdict.

No output may repair candidate bytes. Each finding has a stable ID, severity, exact input path/pointer, expected value, actual value, and outcome. `assurance-verdict.json` has an exact `pass` or `fail` result and references all component output digests.

## 7. Failure and retry

Any material finding produces `fail`. V13-A must create a new authoring commit and new digests; the complete assurance pipeline reruns. Partial reuse of a prior pass is forbidden. Accepted v1.3.0 bytes are immutable; later semantic changes advance the contract version.

## 8. Authorization

V13-B task activation authorizes read-only assurance and allowlisted output creation only. A separate approval is required for the assurance-only commit. No later R1C/R2A work, Procedure generation, package lifecycle, activation, archive, release, publication, or push is implied.

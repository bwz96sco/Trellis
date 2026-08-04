# V13-A design — Public-evidence evaluation contract v1.3

## 1. Boundary

V13-A creates a non-authoritative, research-only `evaluation-contract-v1.3.0` candidate. It closes the semantic gaps identified by the Wave-8 audit through public citations and explicit Trellis-native decisions. It does not implement runtime behavior, author Procedure packages, activate bindings, or perform assurance.

The active authority remains frozen v1.2 and live Procedure v1 until V13-B accepts an exact immutable authoring commit and later boundaries receive separate approval.

## 2. Evidence model

Every normative leaf is represented with one provenance record:

```text
normative field
  -> provenance class
  -> source citation or v1.3 decision record
  -> compatibility/visibility effect
  -> validator and fixture obligations
```

The four closed classes are:

- `inherited-public-v1.2`;
- `trellis-native-v1.3`;
- `inapplicable`;
- `blocked-by-contract`.

Inherited facts require source path, immutable SHA-256, and exact line range or JSON pointer. New decisions require rationale, rejected alternatives, compatibility effect, worker/root visibility, validator obligations, and fixture obligations. Inapplicable and blocked records require explicit absence/null and fail-closed behavior; neither can be inferred from missing fields.

R0 is referenced only as an addressability/planned-destination aid. It cannot satisfy semantic provenance.

## 3. Candidate package layout

All future authoring outputs live under this task's `research/` directory.

```text
research/
  evaluation-contract-v1.3.0.md
  frozen-migration-target-v1.3.json
  frozen-migration-target-v1.3.sha256
  public-evidence-index-v1.3.json
  normative-decision-ledger-v1.3.json
  artifact-lifecycle-contract-v1.3.json
  durable-output-disposition-v1.3.json
  closure-contract-v1.3.json
  validator-registry-v1.3.json
  validator-binding-matrix-v1.3.json
  derivability-provenance-matrix-v1.3.json
  contract-candidate-manifest-v1.3.json
  contract-candidate-manifest-v1.3.sha256
  execution-evidence-ledger.json
```

Conditional files are `normalized-workflow-inventory-v1.3.json`, `io-mapping-ledger-v1.3.csv`, and `differential-test-matrix-v1.3.json`. The normative ledger records whether each is required. An omitted conditional file is not silently assumed unchanged; the no-material-delta decision and cited base digest are explicit.

## 4. 64-output disposition model

`durable-output-disposition-v1.3.json` has one row per public output identity across the seven lifecycle-modeled families. The row key is stable family plus public output identity. Exactly one disposition is allowed:

- `include` — direct enforceable artifact/checkpoint;
- `alias` — alternate public spelling bound to one canonical identity;
- `container` — directory/container, not a materialized artifact;
- `pattern` — family of materialized artifacts under an exact pattern contract;
- `exclude` — intentionally outside lifecycle enforcement, with normative rationale;
- `inapplicable` — explicit null/absence semantics;
- `blocked-by-contract` — unresolved rule fails closed.

Completeness is set equality against the 64 cited v1.2 identities. Duplicate canonical targets, unbound aliases, and unclassified identities fail.

## 5. Artifact lifecycle contract

Each included or pattern-backed artifact/checkpoint has a stable identity and a complete matrix for the 13 required dimensions. A dimension object contains:

- exact normative value or explicit inapplicable/blocked disposition;
- provenance reference;
- stable error codes;
- validator triple references;
- positive, negative, base, and inapplicable fixture obligations.

Transitions describe create/accept/reject states and preconditions. They do not mutate canonical Research state. The contract states which root pre-record validation consumes the rule and preserves zero-write failure behavior.

## 6. Closure contract

The closure contract is family-explicit, not generic. For each applicable family it binds:

- selected and blocked canonical source record/artifact;
- exact JSON pointers and types;
- absence and null semantics;
- authoritative producer and root pre-record reader;
- evidence required for true and false;
- validation order and zero-write failure boundary;
- XOR or other exact relation;
- stable errors and validator triple.

There is no fallback from generic `Result.status`. A family-specific status mapping exists only if explicitly authored as `trellis-native-v1.3`; otherwise any attempted inference is invalid.

## 7. Validator and report contract

The registry defines trusted validator metadata by exact `(id, version)` and immutable severity ceiling. The binding matrix assigns exact `(id, version, severity)` triples to authorized rules. Candidate descriptors cannot name modules, commands, network/model work, private sources, workers, or mutation behavior.

Report-v2 is specified as an additive deterministic domain binding methodology/Procedure/support inventory, canonical Research identities/digests, artifact bindings, closure sources, ordered validators/findings, applicability, blocked facts, and zero-write disposition. Report-v1 bytes and digest behavior remain historical compatibility authority.

## 8. Canonicalization and digest graph

Strict JSON uses UTF-8, no BOM, no duplicate decoded keys, recursively sorted object keys, array-order preservation, and one final LF. CSV, Markdown, and sidecar byte rules are declared explicitly and exact bytes are hashed.

Digest graph:

```text
public evidence + normative decisions
  -> semantic candidate files
  -> contract-candidate-manifest-v1.3.json inventory
  -> filename-bound manifest sidecar

semantic candidate files
  -> frozen-migration-target-v1.3.json
  -> filename-bound target sidecar
  -> proposed evaluation-contract-v1.3.0 digest
```

The manifest excludes itself and sidecars from its member array to avoid self-reference. Sidecars bind the target filename exactly. The frozen target references the manifest digest rather than embedding a self-digest.

## 9. Compatibility domains

The contract separately declares:

- methodology contract version;
- Procedure package schema version;
- Procedure version;
- worker Context schema version;
- methodology report schema version;
- Research event schema version.

No version increment silently upgrades another domain. Historical `2.0.2` stays bound to exact v1.2. Future `2.0.3` can bind only to the V13-B-accepted v1.3 identity/digest. Existing activation records retain recorded Procedure identity and do not inherit v1.3.

## 10. Privacy and authority

The candidate may contain public citations, abstract contracts, Trellis-native normative decisions, and synthetic fixture obligations. It must not contain private bodies, prompts, validator/test code, cases, raw outputs, or secret values.

Workers remain Proposal-only. The contract does not authorize worker validation, closure, approval, recording, launch, composition, mutation, Git, network, cost, random IDs, or sandbox expansion.

## 11. Rollback and correction

Before acceptance, correction replaces the uncommitted candidate and produces new digests. After the separately authorized authoring commit, any material defect requires a new authoring commit and V13-B rerun. After v1.3.0 acceptance, semantic correction advances to `evaluation-contract-v1.3.1+`; accepted bytes are not rewritten.

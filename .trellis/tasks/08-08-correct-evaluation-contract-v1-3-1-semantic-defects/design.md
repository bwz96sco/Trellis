# Evaluation-contract v1.3.1 campaign design

## Boundary

This campaign corrects semantic authority only. It does not implement the corrected contract. The accepted v1.3.0 package and A11 remain immutable inputs; v1.3.1 is a new candidate, assurance subject, and optional operator decision.

## Topology

```text
07-29-migrate-research-methodology-to-procedures
  -> 08-08-correct-evaluation-contract-v1-3-1-semantic-defects
       -> 08-08-author-evaluation-contract-v1-3-1
       -> 08-08-assure-evaluation-contract-v1-3-1-mal1
       -> 08-08-decide-evaluation-contract-v1-3-1
```

Tree order is descriptive. Each child repeats its exact dependencies and activation gate.

## Identity model

Keep these identities separate:

- **A11** — immutable `contract-defect` audit commit `3534529a36a10ea8015a51f71a93e2b78300a563`.
- **G131** — future governance/topology commit only.
- **A131-0** — future author activation/assignment metadata only.
- **A131-1** — future immutable v1.3.1 candidate and author evidence.
- **B131-0** — future fresh reviewer assignment/authorization metadata only.
- **B131-1** — future exact machine-assurance outputs and `pass`/`fail` verdict.
- **O131-0** — optional future operator-task activation metadata only.
- **O131-1** — optional future operator decision only.

No identity implies acceptance, implementation, activation, release, publication, or push authority.

## Ownership

- Parent: planning, topology, immutable pins, path ownership, and authority denials.
- Author: `.trellis/tasks/08-08-author-evaluation-contract-v1-3-1/**` only.
- Assurance: `.trellis/tasks/08-08-assure-evaluation-contract-v1-3-1-mal1/**` only.
- Decision: `.trellis/tasks/08-08-decide-evaluation-contract-v1-3-1/**` only.
- Canonical parent edits are append-only campaign pointers and ownership notes.

Accepted leaves, production, tests, Procedure packages, registries, specifications, CS5/CS6 evidence, `.trellis/research/**`, and inherited dirty paths are excluded.

## Correction architecture

The seven-member v1.3.1 pack remains structurally parallel to v1.3.0:

- report-v2 schema authority is closed inside the corrected binding contract;
- validator semantics are closed inside the corrected registry;
- global mutation operations and applicability are closed inside the corrected differential matrix;
- Procedure/capability family applicability authority is closed inside the corrected lifecycle contract;
- the provenance leaf changes only through the exact frozen member-prefix, provenance-class, and finding-bound `recordRef` transitions; candidate-manifest and semantic-target digests are recomputed separately as non-leaf author evidence.

A JSON-pointer diff ledger classifies every changed node as one of the four findings or mechanical propagation. An unclassified changed node is a stop condition.

## Assurance architecture

A fresh reviewer extracts the exact A131-1 Git object and independently recomputes all member identities. Assurance cannot use the author generator as the sole oracle. It executes adversarial positive, negative, removal, contradiction, and inapplicability challenges over each corrected authority surface and produces a closed output allowlist with one deterministic verdict.

## Compatibility

- v1.3.0 remains historically accepted but is explicitly defective for future technical conformance work.
- Existing historical records continue to resolve by their recorded exact identities.
- No live or packaged Procedure is rebound to v1.3.1 in this campaign.
- A later technical campaign must explicitly consume an accepted v1.3.1 identity.

## Failure and retry

A failed author or assurance attempt is preserved. Corrections use a new attempt/task and new commits; never amend the failed subject or evidence. Any fifth semantic correction returns to planning before authoring.

## Terminal boundary

The campaign ends after a separately authorized operator decision. Even acceptance establishes only semantic-contract authority for a future campaign; all technical and operational authority remains false.

## Frozen executable-authority profiles

G131 freezes three closed offline languages. Report and leaf schemas use JSON Schema 2020-12 through the exact allowlisted keyword profile in `g131-correction-and-propagation-allowlist.json`; unknown keywords, remote resolution, `$ref`, custom code, and open object schemas fail. The `pattern` keyword uses the frozen ECMA-262 11th-edition RegExpPattern grammar with no implicit flags, host-locale dependence, network lookup, or runtime oracle. Validator predicates and applicability use `trellis-predicate-v1` with only the frozen logical, fact, collection, digest, and segment-path nodes, literal or exact JSON-pointer operands, and deterministic preorder evaluation. Differential mutations use the ordered `trellis-mutation-v1` operations and bind an exact fixture digest, target, precondition, applicability predicate, expected run state/verdict/errors, and write observation.

## Propagation and digest discipline

Every changed leaf pointer is classified by one descendant-closed direct finding region or one finite leaf-specific propagation match with an exact old/new guard. Propagation is limited to seven-leaf contract identity, all 116 case-domain identity transitions, the exact five binding targets and 20 differential targets proven by immutable structure, exact normative-member filename-prefix transitions, `trellis-native-v1.3` provenance-class transitions, and finding-bound provenance `recordRef` transitions whose same-row normative pointer resolves to one direct correction region. Generic suffix, decision-ID, digest, manifest, public-evidence, and historical normative-decision-ledger propagation is forbidden. The exact 71 baseline `DEC-*` references that fall inside direct regions are separately exact-value guarded; no baseline direct-region `EV-*` or `SRC-*` reference exists, and the closed reference pointer/value set cannot gain, lose, alias, or replace members. Business IDs, enums, severities, cardinalities, populations, applicability counts, and historical facts do not propagate. Unmatched, multiply classified, or relation-guard-violating pointers are a fifth change and stop.

Existing v1.3.0 raw-file, seven-member aggregate, semantic-target, and report-v2 domains remain byte-for-byte framed as recorded. G131 adds only the explicitly versioned `trellis-g131-json-value-v1\0` domain for old/new semantic-diff value digests. Candidate and author-output manifests exclude self-hashes; immutable Git trees bind the manifests themselves.

# v1.3.1 authoring design

## Source model

Normative inputs are the seven exact v1.3.0 leaves, A11 findings and independent verification, and this task's four-finding correction allowlist. Current runtime, CLI, Procedure packages, and existing harness behavior are non-authoritative observations and may not supply missing semantics.

## Candidate model

The successor remains a seven-leaf pack. Four leaves carry normative corrections:

- lifecycle contract: closed Procedure/capability family mapping and authority facts;
- validator registry: closed facts and deterministic predicates for all 20 validators;
- binding matrix: closed report-v2 schema and report binding semantics;
- differential matrix: exact fixtures, mutation operations, applicability predicates, and expected observations.

The durable-output, provenance, and closure leaves change only through the exact finite G131 propagation matches: contract identity, immutable-structure-proven member references, `trellis-native-v1.3` class transitions, and finding-bound `recordRef` transitions. Candidate-manifest and semantic-target digests are recomputed outside the seven-leaf semantic classifier. Any other semantic delta fails author validation.

## Report-v2 schema shape

The contract uses explicit recursive object schemas rather than a list of binding names. Each object states `required`, `properties`, `additionalProperties:false`, and nested constraints. Canonicalization and digest framing are separate explicit rules. The digest excludes only its declared own field and the serialized sidecar has exactly one final LF.

## Validator semantic shape

Each validator row binds:

- exact identity triple;
- applicability inputs;
- closed fact schema;
- normalized fact derivation sources;
- deterministic predicate/decision table;
- ordered stable findings;
- outcome and severity.

No row may accept an arbitrary open `facts` bag.

## Differential mutation shape

Each case binds an immutable base fixture digest and an ordered mutation list. Mutation operations use closed op types and exact JSON pointers or byte-range identities. Applicability is an executable predicate over authenticated fixture metadata. Expected output includes run/not-run, pass/fail, exact ordered errors, and write observation.

## Applicability mapping shape

The lifecycle leaf owns a closed mapping table keyed by the exact ordered 17 Procedure `2.0.7` ID/capability tuples. Each value is an A131-1-authored choice of exactly one member of the frozen 11-value immutable lifecycle artifact-family codomain, with proof; G131 does not assign the rows. The authority snapshot carries or binds the exact identities used for lookup. Totality, tuple uniqueness, codomain membership, and unknown/conflict failure are independently checkable.

## Diff discipline

The author script emits an ordered JSON-pointer diff. Each row contains old/new digests, semantic classification, finding ID or propagation reason, and proof source. Unclassified rows are fatal.

## Output identity

The candidate manifest binds ordered member path, role, media type, byte length, and SHA-256. The semantic target binds the manifest and a distinct semantic digest. Member aggregate, semantic digest, and future assurance-output digest remain separate identities.

## Retry

A failed candidate is preserved. Any correction after A131-1 uses a new attempt task and commit; never amend or rewrite the failed candidate.

## Executable profiles

Schemas use the G131 closed JSON Schema 2020-12 subset with recursively closed objects and no remote or custom resolution. The `pattern` keyword follows the frozen ECMA-262 11th-edition RegExpPattern semantics with no implicit flags, host-locale dependence, network access, or runtime oracle. Rule predicates and applicability use only `trellis-predicate-v1`; operands are literals or exact JSON pointers, missing values fail closed, and findings follow contract/binding order. Differential operations use the exact ordered `trellis-mutation-v1` vocabulary. Failed mutation preconditions fail the case rather than producing an implicit skip.

The lifecycle mapping has exactly 17 rows in the frozen identity order, with one author-chosen and proven member of the frozen 11-value lifecycle artifact-family codomain per row. This mapping is contract authority only: it neither creates Procedure package bytes nor authorizes runtime selection.

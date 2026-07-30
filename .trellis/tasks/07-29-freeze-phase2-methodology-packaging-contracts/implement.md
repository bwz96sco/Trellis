# P2-01 implementation plan — Freeze Phase-2 methodology packaging contracts

## Authorization gate

Do not start this task until:

- the parent final planning summary has been explicitly approved;
- Phase-1 v1.2 predecessor gate `pass` and the infrastructure pin are satisfied with recorded evidence;
- this task's three planning documents and both manifests pass review and validation;
- exclusive path ownership is confirmed against all concurrent Phase-2 children.

## Ordered execution

1. Re-hash/check the Phase-2 pins and record a child pin attestation.
2. Read the curated manifests, parent requirements, this design, and the exact predecessor evidence.
3. Confirm that no production/test/spec symbol is in scope; GitNexus impact is inapplicable unless the reviewed scope changes.
4. Snapshot the child-owned planning/research path allowlist and unrelated dirty paths.
5. Execute the child-specific work:
1. Re-hash and attest the frozen v1.2 target and distinguish the methodology comparison commit from the implementation base commit.
2. Specify schema-v1 byte/digest compatibility and the schema-v2 enumerated support-pack contract.
3. Specify exact historical Procedure ID/version resolution for recorded activations.
4. Specify artifact contracts, validator descriptors, deterministic reports, Context v1/v2, upgrade, and rollback semantics.
5. Produce `methodology-contract-freeze.json` with exact field/type/cardinality/ownership/transition/terminal/error/fixture contracts for every frozen stage or explicit artifact-lifecycle checkpoint across all 16 packages.
6. Review and freeze the already-materialized 16-package and 229-case ownership maps plus the separately counted Phase-2 expansion allocation; reject any duplicate, gap, total drift, or frozen/expansion double-counting.
7. Review and freeze the planning-time disjoint path ownership map for P2-02 through P2-13.
8. Resolve whether ideation `selected` fixtures are shared-couple closure checks; if not, stop for a reviewed v1.3+ correction.
9. Record the literature route disposition: v1.2 review automatic/default, scan non-default; stop for reviewed v1.3+ if this cannot be implemented.
10. Record code-spec updates as inapplicable: this contract-freeze child owns no production behavior or specification path.
9. Run deterministic contract integrity checks, not product tests.
8. Run the assigned frozen differential slice plus child-specific expansions.
9. Run relevant full suites, build, and real packed-tarball audits where package/runtime behavior changes.
10. Run `git diff --check` on child-owned paths, task validation, GitNexus change detection, and an independent review.
11. Record acceptance evidence and rollback status; do not commit/archive/push without separate authorization.

## Required verification classes

- Exact pin and digest checks.
- Happy path, base/empty path, and every critical invalid path in the assigned slice.
- Worker Proposal-only and root Decision ownership.
- Missing critical evidence, provenance/ID drift, illegal mutation, invalid closure/handoff/composition, and malformed override fail closed.
- Schema-v1 replay and current schema-v2 activation/approval compatibility where relevant.
- Complete before/after snapshots for required zero-write failures.
- Real clean package tarball evidence when bundled or generated payload changes.

## Stop gates

- Any private body/test/prompt/case/raw output would enter Trellis.
- A required behavior has no frozen target or reviewed Phase-2 correction.
- Any package lacks an exact stage or artifact-lifecycle field contract, or the literature route remains ambiguous.
- A central path is owned by another child.
- A critical frozen case is omitted, weakened, or made inapplicable without reviewed authority.
- An old activation would resolve through new bytes or gain authority.
- Tests/build/package audit fail.
- Unrelated dirty paths would be staged or modified.

## Rollback

Revise planning contracts before P2-02 starts; there is no runtime rollback because this child owns no production changes.

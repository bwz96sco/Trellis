# P2-03 implementation plan — Implement Research artifact validator runtime

## Authorization gate

Do not start this task until:

- the parent final planning summary has been explicitly approved;
- `P2-02 accepted with stable schema-v2 pack parsing, digest binding, and historical resolution.` is satisfied with recorded evidence;
- this task's three planning documents and both manifests pass review and validation;
- exclusive path ownership is confirmed against all concurrent Phase-2 children.

## Ordered execution

1. Re-hash/check the Phase-2 pins and record a child pin attestation.
2. Read the curated manifests, parent requirements, this design, and the exact predecessor evidence.
3. Run GitNexus context and upstream impact for every existing symbol that may change; stop on HIGH/CRITICAL impact for confirmation.
4. Snapshot the child-owned path allowlist and unrelated dirty paths.
5. Execute the child-specific work:
1. Add a separate versioned methodology artifact contract instead of widening schema-v1 `ArtifactRef` silently.
2. Add trusted validator registration by stable ID/version; pack descriptors remain declarative and non-executable.
3. Validate required/optional/cardinality, canonical paths/media types, stage ownership, dependencies, stable IDs, provenance, terminal states, and cross-artifact consistency.
4. Produce deterministic reports bound to Procedure, Dispatch, Activation, Result, Proposal, artifacts, and validator versions.
5. Add the root-only composition descriptor/runtime with canonical binding, authorization evidence, maximum-child enforcement, non-transitive rules, ordinary-handoff separation, and rollback behavior.
6. Prove all three generic composition shapes with an authorized positive execution and run every case in local `research/expansion-case-map.json`: Research campaign child Dispatch, review campaign child Dispatch, and bounded external slide adapter.
7. Add normalized Context v2 for schema-v2 Procedures while preserving exact Context v1 for historical activations.
8. Consume P2-02's exact historical resolver API without reinterpreting recorded Procedure identity.
9. Export the generic artifact, validator, report, and composition APIs through the existing `packages/core/src/research/index.ts` barrel and verify the `@mindfoldhq/trellis-core/research` subpath surface.
10. Run root-side validation before Result/Proposal/approval-consumption commit.
11. Add or update child-owned code-spec content with executable signatures, contracts, error matrix, good/base/bad cases, test assertions, and wrong/correct examples when production behavior changes.
7. Run focused positive, base, and critical-negative tests.
8. Run the assigned frozen differential slice plus child-specific expansions.
9. Run relevant full suites, build, and real packed-tarball audits where package/runtime behavior changes.
10. Run `git diff --check` on child-owned paths, task validation, GitNexus change detection, and an independent review.
11. Record acceptance evidence and rollback status; do not commit/archive/push without separate authorization.

## Required verification classes

- Exact pin and digest checks.
- Happy path, base/empty path, and every critical invalid path in the assigned slice.
- Worker Proposal-only and root Decision ownership.
- Missing critical evidence, provenance/ID drift, illegal mutation, invalid closure/handoff/composition, and malformed override fail closed.
- Composition tests assert root authorization, exact edge binding, parent identity, child/adapter target, dispatch budget, non-transitive rejection, ordinary-handoff rejection, cancellation, and zero-write rollback.
- Schema-v1 replay and current schema-v2 activation/approval compatibility where relevant.
- Complete before/after snapshots for required zero-write failures.
- Real clean package tarball evidence when bundled or generated payload changes.

## Stop gates

- Any private body/test/prompt/case/raw output would enter Trellis.
- A required behavior has no frozen target or reviewed Phase-2 correction.
- A central path is owned by another child.
- A critical frozen case is omitted, weakened, or made inapplicable without reviewed authority.
- An old activation would resolve through new bytes or gain authority.
- Tests/build/package audit fail.
- Unrelated dirty paths would be staged or modified.

## Rollback

Revert additive artifact/validator/report and Context-v2 handling; Context v1 and live v1 Procedures remain unchanged.

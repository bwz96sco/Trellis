# P2-02 implementation plan — Implement Procedure support-pack digest binding

## Authorization gate

Do not start this task until:

- the parent final planning summary has been explicitly approved;
- `P2-01 accepted with frozen package schema, ownership map, and historical resolution contract.` is satisfied with recorded evidence;
- this task's three planning documents and both manifests pass review and validation;
- exclusive path ownership is confirmed against all concurrent Phase-2 children.

## Ordered execution

1. Re-hash/check the Phase-2 pins and record a child pin attestation.
2. Read the curated manifests, parent requirements, this design, and the exact predecessor evidence.
3. Run GitNexus context and upstream impact for every existing symbol that may change; stop on HIGH/CRITICAL impact for confirmation.
4. Snapshot the child-owned path allowlist and unrelated dirty paths.
5. Execute the child-specific work:
1. Preserve current schema-v1 parser, exact bytes, digest domain, and 1.0.0 packages unchanged.
2. Add strict schema-v2 package parsing and a distinct domain-separated digest over every enumerated authoritative byte.
3. Extend project-first and bundled resolution to stable-read complete enumerated packs.
4. Add explicit resolver selector modes for registry-current activation preparation and activation-recorded historical revalidation.
5. Integrate activation-recorded ID/version/digest resolution in `dispatch-revalidation.ts`; keep staged callers' external contract stable.
6. Add a current-binding-switch fixture proving `revalidateDispatchActivationStaged` reads only the old activation's recorded version and digest.
7. Reject malformed manifests, unsupported roles/versions, unsafe paths, symlinks, concurrent replacement, missing/oversized entries, and digest drift.
8. Keep unnamed siblings non-authoritative and preserve present-invalid project no-fallback behavior.
9. Add or update child-owned code-spec content with executable signatures, contracts, error matrix, good/base/bad cases, test assertions, and wrong/correct examples when production behavior changes.
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

Revert only additive schema-v2 and historical-resolution support; current schema-v1 Procedures remain active and unchanged.

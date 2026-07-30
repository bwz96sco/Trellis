# P2-08 implementation plan — Migrate experiment methodology

## Authorization gate

Do not start this task until:

- the parent final planning summary has been explicitly approved;
- `P2-05 accepted; P2-04 experiment and COMP-001 slices available.` is satisfied with recorded evidence;
- this task's three planning documents and both manifests pass review and validation;
- exclusive path ownership is confirmed against all concurrent Phase-2 children.

## Ordered execution

1. Re-hash/check the Phase-2 pins and record a child pin attestation.
2. Read the curated manifests, parent requirements, this design, and the exact predecessor evidence.
3. Run GitNexus context and upstream impact for every existing symbol that may change; stop on HIGH/CRITICAL impact for confirmation.
4. Snapshot the child-owned path allowlist and unrelated dirty paths.
5. Execute the child-specific work:
1. Deepen experiment round stages, artifacts, baselines, controls, execution evidence, outcomes, and handoff.
2. Deepen experiment campaign planning, round allocation, aggregation, stop rules, and closure.
3. Preserve null, failed, partial, inconclusive, rejected, and successful outcomes without silent success.
4. Enforce `COMP-001` campaign-to-round composition through explicit root authorization and bounded dispatch counts.
5. Run all three local edge expansions: valid authorized execution, child-failure propagation, and cancellation/rollback.
6. Ensure failed execution cannot produce a success Claim and claim strength is bounded by evidence.
6. Add or update child-owned code-spec content with executable signatures, contracts, error matrix, good/base/bad cases, test assertions, and wrong/correct examples when production behavior changes.
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

Remove/revert only dormant experiment versions, validators, fixtures, composition evidence, and family spec.

# P2-11 implementation plan — Migrate writing figure and slides methodology

## Authorization gate

Do not start this task until:

- the parent final planning summary has been explicitly approved;
- `P2-05 accepted; P2-04 writing/figure/slides and COMP-003 slices available.` is satisfied with recorded evidence;
- this task's three planning documents and both manifests pass review and validation;
- exclusive path ownership is confirmed against all concurrent Phase-2 children.

## Ordered execution

1. Re-hash/check the Phase-2 pins and record a child pin attestation.
2. Read the curated manifests, parent requirements, this design, and the exact predecessor evidence.
3. Run GitNexus context and upstream impact for every existing symbol that may change; stop on HIGH/CRITICAL impact for confirmation.
4. Snapshot the child-owned path allowlist and unrelated dirty paths.
5. Execute the child-specific work:
   - Deepen writing stages for claim/evidence mapping, drafting, display/build, audit, and closure.
   - Add figure and slides as explicit non-default methodology using existing writing Quest stage.
   - Bind writing-to-figure and figure-to-slides sender, receiver, artifact identity/digest, source evidence, and Procedure digest; add named positive and wrong-sender/missing-artifact/provenance-drift negatives.
   - Preserve stable provenance from upstream evidence through display artifacts.
   - Enforce `COMP-003` slides-to-personal-slides as a bounded adapter without private implementation import or authority transfer.
   - Run all seven local expansion cases, including valid adapter execution, unavailable degradation, and authority non-transfer.
   - Represent unavailable visual adapters as blocked/partial degradation, never successful closure.
   - Add or update child-owned code-spec content with executable signatures, contracts, error matrix, good/base/bad cases, test assertions, and wrong/correct examples when production behavior changes.
6. Run focused positive, base, and critical-negative tests.
7. Run the assigned frozen differential slice plus child-specific expansions.
8. Run relevant full suites, build, and real packed-tarball audits where package/runtime behavior changes.
9. Run `git diff --check` on child-owned paths, task validation, GitNexus change detection, and an independent review.
10. Record acceptance evidence and rollback status; do not commit/archive/push without separate authorization.

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

Remove/revert only dormant writing/figure/slides versions, validators, fixtures, composition evidence, and family spec.

# P2-05 implementation plan — Migrate ideation and evaluation methodology

## Authorization gate

Do not start this task until:

- the parent final planning summary has been explicitly approved;
- `P2-02, P2-03, and P2-04 accepted; P2-01 ideation closure disposition resolved.` is satisfied with recorded evidence;
- this task's three planning documents and both manifests pass review and validation;
- exclusive path ownership is confirmed against all concurrent Phase-2 children.

## Ordered execution

1. Re-hash/check the Phase-2 pins and record a child pin attestation.
2. Read the curated manifests, parent requirements, this design, and the exact predecessor evidence.
3. Run GitNexus context and upstream impact for every existing symbol that may change; stop on HIGH/CRITICAL impact for confirmation.
4. Snapshot the child-owned path allowlist and unrelated dirty paths.
5. Execute the child-specific work:
1. Generation owns 01-frame, 02-prior-map, 03-gap-map, and 04-generate.
2. Evaluation consumes without rewriting 01-04 and owns 05-novelty-check, 05b-method-flaw-audit, 06-select, and 07-handoff.
3. Preserve shared case root, candidate IDs, project alignment, source/evaluator separation, matched controls, falsifiers, kill conditions, and pivot confirmation.
4. Implement all ten `IMP-IDEA-VALIDATORS` controls for both sides where the frozen matrix requires them.
5. Enforce exactly selected or blocked; blocked forbids selected/handoff artifacts; selected requires a passing finalist and experiment handoff.
6. Translate final selection to pending Proposal and root Decision.
7. Keep both new Procedure versions dormant until P2-12.
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

Remove/revert only dormant ideation/evaluation versions, family validators, fixtures, and family spec; current 1.0.0 remains live.

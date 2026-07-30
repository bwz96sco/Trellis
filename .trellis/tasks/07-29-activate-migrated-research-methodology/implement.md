# P2-12 implementation plan — Activate migrated Research methodology atomically

## Authorization gate

Do not start this task until:

- the parent final planning summary has been explicitly approved;
- `P2-06 through P2-11 accepted; all dormant packs, family reports, composition reports, and rollback evidence frozen.` is satisfied with recorded evidence;
- this task's three planning documents and both manifests pass review and validation;
- exclusive path ownership is confirmed against all concurrent Phase-2 children.

## Ordered execution

1. Re-hash/check the Phase-2 pins and record a child pin attestation.
2. Read the curated manifests, parent requirements, this design, and the exact predecessor evidence.
3. Run GitNexus context and upstream impact for every existing symbol that may change; stop on HIGH/CRITICAL impact for confirmation.
4. Snapshot the child-owned path allowlist and unrelated dirty paths.
5. Execute the child-specific work:
   - Register optional `research.writing.figure`, `research.writing.slides`, and `research.literature.survey` without default routing.
   - Switch current Procedure-version bindings for reviewed capabilities in one integration boundary.
   - Apply the frozen v1.2 literature route correction: review automatic/default, scan non-default; keep unrelated default routes unchanged.
   - Materialize and digest `research/cutover-manifest.json` with every capability, route, mode/default status, Procedure/validator/packed binding, previous binding, cutover state, and rollback target.
   - Update central bundled/packed inventory, exports/indexes, upgrade/reactivation behavior, and compatibility proofs.
   - Prove historical activations resolve recorded Procedure versions and existing records gain no authority.
   - Run exactly 229 frozen cases and 38 separate expansion cases; verify composition/control subsets are not double-counted, then run replay, host parity, override, rollback, and packed lifecycle audits.
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

Before any new activation exists, atomically restore the previous registry, inventory, and routing bindings from the cutover manifest. After activation, a reviewed registry rollback affects future selection only while historical activations retain recorded bytes; alternatively issue a forward-fix version. Do not claim a nonexistent canonical disable event, and never delete or reinterpret an activated version.

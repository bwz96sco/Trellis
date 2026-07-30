# P2-13 implementation plan — Assure and close Phase-2 methodology migration

## Authorization gate

Do not start this task until:

- the parent final planning summary has been explicitly approved;
- `P2-12 accepted with frozen implementation, aggregate reports, package evidence, and rollback rehearsal inputs.` is satisfied with recorded evidence;
- this task's three planning documents and both manifests pass review and validation;
- exclusive path ownership is confirmed against all concurrent Phase-2 children.

## Ordered execution

1. Re-hash/check the Phase-2 pins and record a child pin attestation.
2. Read the curated manifests, parent requirements, this design, and the exact predecessor evidence.
3. Confirm that no production/test/spec symbol is in scope; use GitNexus context and change detection read-only for assurance.
4. Snapshot the child-owned assurance/research path allowlist and unrelated dirty paths.
5. Execute the child-specific work:
   - Load and verify every required predecessor input from `research/assurance-plan.json`, including the P2-12 cutover manifest/digest and P2-01 through P2-12 task-local execution evidence ledgers.
   - Mechanically compare recorded P2-12 implementer and P2-13 reviewer identities; write `reviewer-independence.json` and stop if either is absent or equal.
   - Independently verify exact pins, 16/16 packages, exactly 229 frozen cases, exactly 38 separate expansions, and 3/3 composition edges without recounting frozen subsets.
   - Verify Proposal-only workers, root Decisions, Quest read/admin write separation, the frozen literature-review default correction, optional non-default routing, and no historical authority gain.
   - Verify schema-v1 and schema-v2 replay, exact historical Procedure resolution, project override failure, host parity, pre-activation atomic revert, and post-activation future-selection registry rollback with historical bindings unchanged.
   - Verify every ledger's exact argv/cwd/exit data, assertion IDs/outcomes, retained-output digests, zero-write snapshots, and forbidden-content/path scan evidence; reject placeholders or prose-only pass claims.
   - Verify real clean packed install/update/uninstall evidence and absence of private/Skill payload.
   - Audit unrelated dirty paths and route every defect to the owning child without editing production files.
   - Produce only the nine outputs allowed by `research/assurance-plan.json`; record code-spec updates as inapplicable because P2-13 owns no production behavior or specification path.
6. Run focused positive, base, and critical-negative assurance checks.
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

No production rollback. Reopen the owning child for defects; do not expand P2-13 ownership.

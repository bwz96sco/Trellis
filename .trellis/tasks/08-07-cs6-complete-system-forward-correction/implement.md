# CS6 complete-system forward-correction implementation plan

## Authorization boundary

This campaign plan does not activate the campaign parent or any child. Each child requires separate task-start authorization. Every commit, subject freeze, reviewer assignment, assurance run, assurance commit, operator decision, activation, archive, release, publication, and push boundary remains separately governed.

## Global invariants

1. Preserve S10, M10, CS5 task/evidence bytes, accepted v1.3.0 leaves, Procedure `2.0.4`–`2.0.6`, protected dirty paths, and `.trellis/research/**`.
2. Keep live Procedure selection exactly `1.0.0`.
3. Use Procedure `2.0.7` for all package corrections.
4. Keep workers Proposal-only and all operational authority flags false.
5. Run GitNexus upstream impact before every future existing symbol edit; stop on HIGH/CRITICAL risk.
6. Use `uv run python` for Python execution and portable path/encoding conventions for persisted evidence.
7. Never use repository-wide staging, reset, clean, stash, history rewriting, force-push, or broad revert.

## Ordered execution

### CS6-0 — governance

Create reciprocal tasks, freeze ownership/dependencies/authority, bind baseline identities, append canonical-parent pointers, validate all planning artifacts, and stop without committing unless separately authorized.

### CS6-1 — semantic audit

Predecessor: validated/committed CS6-0 governance plus separate activation.

1. Recompute exact seven-member bytes and aggregate.
2. Audit closure, durable outputs, lifecycle, validator, binding, provenance, and differential consistency independently of current implementation.
3. Emit `leaves-sound` or `contract-defect` with exact findings.
4. If `contract-defect`, stop the campaign and plan `evaluation-contract-v1.3.1+`.
5. If `leaves-sound`, freeze the exact audit disposition for downstream tasks.

### CS6-2 — core runtime

Predecessor: committed CS6-1 `leaves-sound`.

1. Run required GitNexus impact analyses.
2. Add failing focused tests for canonical JSON, closure evidence/applicability, path matching, binding facts, lifecycle applicability/invocation, validator execution, and deterministic reporting.
3. Correct only owned methodology-local adapters and exports.
4. Run focused and full core tests; verify protected call-only definitions were not edited.
5. Commit only under a separately authorized CS6-2 boundary.

### CS6-3 — CLI/auth/replay/recovery

Predecessors: committed CS6-1 `leaves-sound` and accepted CS6-2 runtime interface.

1. Run required GitNexus impact analyses.
2. Add failing CLI tests for installed-bundle authentication, `record-result` orchestration, exact replay dependencies, and committed projection-recovery failure.
3. Correct only owned CLI adapters/tests; call, but do not edit, protected canonical primitives.
4. Prove validation failure is zero-write and approval/Proposal-only ceilings remain unchanged.
5. Commit only under a separately authorized CS6-3 boundary.

### CS6-4 — Procedure 2.0.7 packages

Predecessors: committed CS6-1 disposition plus accepted CS6-2/CS6-3 interfaces.

1. Freeze the package-generation contract.
2. Generate exactly 17 new `2.0.7` trees.
3. Verify accepted digest, inventory, closure, lifecycle, validators, bindings, instructions, and internal digest consistency for every package.
4. Prove `2.0.4`–`2.0.6` byte inventories are unchanged.
5. Keep all packages dormant and authority flags false.

### CS6-5 — production mutation and coverage harness

Predecessors: accepted/committed CS6-2 through CS6-4.

1. Build fixtures that enter the actual production validation/recording path.
2. Register exact coverage for 17 packages, 65 artifacts, 13 lifecycle dimensions, 20 validators, and 876 bindings.
3. Execute all 116 mutation cases with exact expected errors and before/after filesystem snapshots.
4. Reject disconnected-oracle evidence, missing rows, duplicate rows, or unmeasured zero-write claims.
5. Retain deterministic task-local evidence.

### CS6-6 — integration, installed-package tests, and S11 freeze

Predecessors: accepted/committed CS6-1 through CS6-5.

1. Build real npm/pnpm tarballs.
2. Install them into external temporary repositories and test accepted-bundle authentication, Procedure inventory, replay, and record-result behavior.
3. Verify historical Procedure bytes using archive-safe blob inventories that do not require `.git` in an extracted subject.
4. Integrate dormant I11 and run relevant full suites.
5. Create a one-file S11 freeze record with exact resolved commit/tree identities and no self-hash placeholder.
6. Freeze only under separately authorized I and S commit boundaries.

### CS6-7 — MAL-1 attempt 11

Predecessors: exact committed S11, fresh M0 assignment, and separate activation.

1. Extract exact S11 without a working-tree overlay.
2. Run the predetermined corpus in a portable clean environment.
3. Write exactly nine allowlisted outputs.
4. Record all command exits and retain honest pass/fail.
5. Perform no repairs and grant no acceptance or activation authority.

### CS6-8 — operator decision

Predecessor: committed M11 and separate explicit operator instruction.

Write only one operator decision record containing `accept-with-rationale`, `reject-with-rationale`, or `stop`. Do not infer a decision from silence or a machine verdict. Keep activation/archive/release/publication/push false.

## Campaign verification

- Validate the campaign and every child with `uv run python ./.trellis/scripts/task.py validate <task-dir>`.
- Verify reciprocal topology and ordered children deterministically.
- Verify ownership path disjointness and protected call-only exclusions.
- Verify accepted bytes, historical versions, CS5 evidence, and protected dirty paths do not drift.
- Run focused package tests, full relevant suites, build, pack, external install, differential/mutation corpus, and GitNexus change detection in the owning children.

## Stop conditions

Stop immediately for an accepted-leaf defect, ownership overlap, unapproved HIGH/CRITICAL edit, historical byte drift, dirty-path drift, live-selection change, assurance repair attempt, reviewer non-independence, missing exact evidence, or any implied operational authority.

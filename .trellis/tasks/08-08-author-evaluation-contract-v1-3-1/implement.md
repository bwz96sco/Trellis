# v1.3.1 authoring implementation plan

## Preconditions

- G131 and A131-0 are committed.
- Exact A11 and v1.3.0 identities match.
- A distinct contract author is assigned.
- No assurance reviewer or operator role is assigned to the author.

## Ordered work

1. Capture immutable inputs and protected-path fingerprints.
2. Build a strict deterministic author/validator script from the four-finding allowlist.
3. Keep the exact ordered 17 Procedure `2.0.7`/capability tuples, choose and prove one value from the frozen 11-value lifecycle artifact-family codomain for each row, and prove totality/uniqueness without treating G131 as the assignment oracle.
4. Define all 20 validator fact schemas and predicates with exact errors.
5. Define the complete report-v2 schema, canonicalization, and digest framing.
6. Define all 44 global mutation operations and 11 inapplicability predicates.
7. Apply only the finite G131-frozen seven-leaf propagation matches and recompute manifest/semantic-target digests separately in non-leaf author evidence.
8. Emit candidate manifest, frozen target, correction ledger, and semantic-diff ledger.
9. Run adversarial author tests for missing/unknown/contradictory facts and removed authority elements.
10. Re-run generation from clean immutable inputs and compare exact bytes.
11. Validate counts, manifests, task scope, protected paths, and authority flags.
12. Stop for separate A131-1 commit authorization; do not dispatch assurance automatically.

## Required checks

- Strict JSON and duplicate-key rejection.
- Exact seven-member inventory and independent hashes.
- Exact 64/65/13/20/876/3343/116 reconciliation.
- All 20 predicates produce deterministic outcomes for positive and negative facts.
- All 44 global mutations are executable; all 11 inapplicability predicates are decidable.
- All 845 lifecycle decisions resolve from the closed mapping.
- JSON-pointer diff has no unclassified row.
- Path-scoped `git diff --check`, task validation, and protected no-drift checks.

## Stop/rollback

Before commit, remove only task-local candidate outputs. After A131-1, preserve failure and create a new attempt. Never edit v1.3.0 or A11.

## Commit boundaries

A131-0 and A131-1 remain separate. No commit or activation is authorized by this planning artifact.

## Deterministic generation requirements

- Read only exact committed v1.3.0 Git objects and the committed G131/A131-0 records; never use current runtime, package, harness, worktree overlay, or author scratch as a semantic oracle.
- Reject invalid UTF-8, duplicate decoded keys, non-finite numbers, unpaired surrogates, missing/unknown fields, aliases, and type coercion.
- Serialize recursively sorted compact JSON with preserved array order and exactly one final LF.
- Emit the semantic-diff row schema exactly as frozen by G131 and reject every unmatched pointer as a fifth change.
- Preserve the exact finite direct-region historical-reference guard set: all 71 baseline `DEC-*` pointer/value pairs remain unchanged, no baseline direct-region `EV-*` or `SRC-*` pair exists, and no guarded reference pair may be added, removed, aliased, or replaced.
- Generate twice from clean inputs and require byte-identical 15-file output sets.
- Stop on any population drift from 7 leaves, 64 outputs, 65 lifecycle artifacts, 11 lifecycle artifact-family enum values, 13 dimensions, 845 lifecycle bindings, 20 closure bindings, 11 global bindings, 876 total bindings, 20 validators, 3,343 provenance rows, 116 cases, 44 global cases, 11 global inapplicable cases, 4 closure families, 18 evidence sources, 168 evidence facts, or 17 mapping rows.

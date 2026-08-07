# CS6-2 — Correct core methodology runtime

## Goal

Correct methodology-local core behavior for canonical JSON, closure evidence/applicability, artifact path matching, binding facts, lifecycle applicability/invocation, validator execution, and deterministic report construction while preserving the accepted v1.3.0 contract and shared authority primitives.

## Dependencies

- CS6-0 governance is frozen.
- CS6-1 is committed with disposition exactly `leaves-sound` against the accepted seven-member aggregate.
- Separate task activation and per-symbol GitNexus impact analysis are required before edits.

## Ownership

Owned production paths:

- `packages/core/src/research/methodology-v13-runtime.ts`
- `packages/core/src/research/methodology-artifacts.ts`
- `packages/core/src/research/methodology-validators.ts`
- `packages/core/src/research/methodology-reports.ts`
- `packages/core/src/research/index.ts` only for minimum exports required by owned corrections

Owned tests:

- `packages/core/test/research/methodology-v13-runtime.test.ts`
- `packages/core/test/research/methodology-runtime.test.ts`

Owned task evidence:

- `.trellis/tasks/08-07-cs6-correct-core-methodology-runtime/research/**`

## Requirements

- Reproduce each approved defect with a focused failing test before correction.
- Use strict deterministic canonical JSON: recursive object-key ordering, array-order preservation, UTF-8, and stable digest framing.
- Derive closure only from accepted canonical closure fields and evidence; do not use a generic `Result.status` heuristic.
- Enforce exact artifact path/media/cardinality/stable-ID/provenance matching and reject path-prefix or normalization ambiguity.
- Derive validator binding facts from exact accepted package/contract identities, not caller assertions.
- Enforce lifecycle applicability and invocation for every applicable dimension; inapplicable and blocked semantics remain explicit.
- Select and execute exact validator `(id, version, severity)` triples and fail closed on unknown, missing, duplicated, or inconsistent descriptors.
- Keep report-v2 canonicalization and digest deterministic.
- Preserve Proposal-only workers and root-owned validation/recording/Decision authority.

## Exclusions and call-only surfaces

No edits to `events.ts`, `reducer.ts`, `store.ts`, `repositories.ts`, `projections.ts`, canonical ledgers, batch committers, locks, hardened publication internals, Procedure package trees, accepted leaves, CLI code, registries, or `.trellis/research/**`.

These shared primitives may be called through existing APIs only. Any required change stops the task for a reviewed ownership amendment and HIGH/CRITICAL impact approval.

## Activation gate

A separate user instruction may activate CS6-2 only after CS6-1 `leaves-sound` is immutable and an owner role is assigned.

## Stop gates

- GitNexus reports HIGH/CRITICAL risk for a proposed edit.
- A correction requires changing accepted semantic bytes or a protected call-only primitive.
- Focused tests reveal a contract defect rather than implementation nonconformance.
- Any change widens worker or publication authority.

## Commit boundary

A future core-runtime commit may include only the owned source/tests and this task's evidence/status. No package, CLI, harness, integration, assurance, operator, activation, archive, release, publication, or push change is included.

## Authority flags

All human-equivalence, repair, complete-system acceptance, operator, activation, archive, release, publication, and push flags remain false.

## Acceptance criteria

- [ ] Focused positive/base/critical-negative tests cover every corrected behavior.
- [ ] Canonicalization and report digests are reproducible.
- [ ] Invalid closure, evidence, path, lifecycle, validator, or binding inputs fail closed.
- [ ] Protected shared primitives and accepted bytes remain unchanged.
- [ ] Full core tests and build pass.
- [ ] GitNexus change detection shows only expected flows before any future commit.

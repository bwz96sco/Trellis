# CS6-5 — Build production mutation and coverage harness

## Goal

Build a deterministic harness that mutates the exact inputs consumed by the production CS6 runtime and proves complete coverage of 17 packages, 65 artifacts, 13 lifecycle dimensions, 20 validators, 876 bindings, and all 116 accepted mutation cases.

## Dependencies

- CS6-0 governance is frozen.
- CS6-1 is committed as `leaves-sound`.
- CS6-2, CS6-3, and CS6-4 are accepted/committed and their exact inputs are frozen.
- Separate activation and harness-owner assignment are required.

## Ownership

Owned tests/harness paths:

- `packages/cli/test/research-methodology-harness/production-116.ts`
- `packages/cli/test/commands/research-methodology-116-production.test.ts`
- `packages/cli/test/commands/research-methodology-cs6-coverage.test.ts` (new)

Owned evidence:

- `.trellis/tasks/08-07-cs6-production-mutation-coverage-harness/research/**`

## Requirements

- Every case must mutate the exact accepted leaf, `2.0.7` package member, request artifact, or binding fact consumed by the production path; mutating an unrelated copy is invalid.
- Keep exactly 116 unique case IDs with one expected observable result per row.
- Reconcile exact coverage domains: 17 Procedure IDs, 65 artifacts, 13 lifecycle dimensions, 20 validators, and 876 binding rows.
- Record exact input identity, mutation operator, production entry point, expected stable error, actual error, relevant report/result identity, and before/after filesystem snapshots.
- Every rejected case must prove zero canonical/report/projection writes unless the case explicitly exercises committed projection-recovery semantics, which must record the canonical event and recovery outcome separately.
- Detect duplicate, missing, unknown, inapplicable, disconnected-oracle, and double-counted cases.
- Keep frozen-229 and expansion-38 historical domains separate; CS6-5 does not rewrite them.

## Exclusions

No production source edits, package edits, accepted leaf edits, registries, specifications, integration/freeze/assurance/operator outputs, historical harness evidence, or `.trellis/research/**`.

## Activation gate

Separate approval after exact CS6-2 through CS6-4 commits/identities are available.

## Stop gates

- Any case does not reach the production path.
- Counts differ from 17/65/13/20/876 or 116.
- A rejection lacks measured write evidence.
- Harness logic becomes the semantic oracle rather than exercising accepted contract/runtime behavior.
- Required correction belongs to a prior child.

## Commit boundary

A future harness commit may include only the owned harness/tests and task-local evidence. Defects in runtime, CLI, or packages return to CS6-2, CS6-3, or CS6-4.

## Authority flags

All human-review/equivalence, repair, complete-system acceptance, operator, activation, archive, release, publication, and push flags remain false.

## Acceptance criteria

- [ ] Exactly 116 unique production-reachable mutation rows execute.
- [ ] Coverage reports prove exact 17/65/13/20/876 populations with no omissions or double counting.
- [ ] Every expected error and filesystem effect matches.
- [ ] Rejected pre-commit cases are measured zero-write.
- [ ] Committed-recovery cases distinguish canonical commit from projection failure.
- [ ] No runtime/package/source path changes in this child.

# CS6-4 — Generate Procedure 2.0.7 family packages

## Goal

Create exactly 17 new dormant Procedure `2.0.7` packages that are internally consistent with the exact accepted `evaluation-contract-v1.3.0` bytes and the reviewed CS6-2/CS6-3 interfaces, without changing any historical package.

## Dependencies

- CS6-0 governance is frozen.
- CS6-1 is committed as `leaves-sound`.
- CS6-2 core runtime and CS6-3 CLI interface contracts are accepted/committed.
- Separate task activation and owner assignment are required.

## Ownership

Owned generator/test paths:

- `packages/cli/scripts/research-methodology-207-generate.py` (new)
- `packages/cli/test/commands/research-procedure-207-packages.test.ts` (new)

Owned package trees, each under `packages/cli/src/templates/research/procedures/`:

- `computation-case-v1/2.0.7/**`
- `experiment-campaign-v1/2.0.7/**`
- `experiment-round-v1/2.0.7/**`
- `figure-v1/2.0.7/**`
- `idea-evaluation-v1/2.0.7/**`
- `idea-generation-v1/2.0.7/**`
- `literature-review-v1/2.0.7/**`
- `literature-scan-v1/2.0.7/**`
- `project-setup-v1/2.0.7/**`
- `quest-admin-v1/2.0.7/**`
- `quest-framing-v1/2.0.7/**`
- `review-campaign-v1/2.0.7/**`
- `review-case-v1/2.0.7/**`
- `slides-v1/2.0.7/**`
- `survey-v1/2.0.7/**`
- `theory-case-v1/2.0.7/**`
- `writing-case-v1/2.0.7/**`

Owned task evidence:

- `.trellis/tasks/08-07-cs6-procedure-2-0-7-family-packages/research/**`

## Requirements

- Generate all package bytes deterministically from exact accepted leaves and reviewed package rules; do not copy or patch a historical tree in place.
- Every package binds Procedure ID/version/digest, accepted contract identity/digest/member aggregate, exact support-pack inventory, artifact contracts, lifecycle rows, closure, validator descriptors, binding rows, instructions, and filename-bound digests.
- Package internals must agree on Procedure `2.0.7`; no stale `2.0.4`–`2.0.6` identity may remain.
- All 17 packages set `dormant=true`, `liveSelection=1.0.0`, and all activation/release/publication/push flags false.
- Optional figure, slides, and survey remain explicit/non-default; package generation does not alter routing.
- Historical Procedure `2.0.4`, `2.0.5`, and `2.0.6` blob inventories remain byte-identical.

## Exclusions

No edits to runtime/CLI source, accepted leaves or bundled accepted-contract bytes, historical Procedure trees, registry/live-selection files, harness/integration/assurance/operator paths, specifications, or `.trellis/research/**`.

## Activation gate

Separate user approval after CS6-2 and CS6-3 are accepted. The exact generation inputs and package schema must be frozen before generation.

## Stop gates

- CS6-1 is not `leaves-sound`.
- Any accepted/runtime/interface ambiguity exists.
- A generated package is internally inconsistent, non-deterministic, not dormant, or requires changing a historical tree.
- Package count is not exactly 17.

## Commit boundary

A future package commit may contain only the new generator, package test, 17 new `2.0.7` trees, and task-local evidence. It cannot modify registry/live selection or grant operational authority.

## Authority flags

All human-review/equivalence, repair, complete-system acceptance, operator, activation, archive, release, publication, and push flags remain false.

## Acceptance criteria

- [ ] Exactly 17 package roots exist and no extra `2.0.7` root exists.
- [ ] Deterministic regeneration produces byte-identical output.
- [ ] Every internal identity/digest/inventory/binding agrees.
- [ ] Required 65 artifacts, 13 lifecycle dimensions, 20 validators, and 876 bindings are represented as contractually applicable across the package family.
- [ ] Historical `2.0.4`–`2.0.6` inventories remain unchanged.
- [ ] Packages are dormant and live selection remains `1.0.0`.

# CS6-2 implementation plan

## Preconditions

- Exact CS6-1 disposition is `leaves-sound`.
- Separate activation and owner assignment exist.
- Run GitNexus upstream impact for every existing function to be edited; report blast radius and stop on HIGH/CRITICAL.

## Ordered work

1. Record exact baseline symbols, callers, tests, and protected call-only paths.
2. Add failing focused vectors for canonical JSON and report digest behavior.
3. Add failing closure/evidence/applicability vectors, including null/partial/blocked/failed/inconclusive/selected boundaries.
4. Add path matching and stable-ID/provenance drift vectors.
5. Add lifecycle applicable/inapplicable/invoked/uninvoked vectors.
6. Add exact validator and binding-fact vectors, including unknown/duplicate/missing triples.
7. Implement the minimum methodology-local corrections.
8. Run focused core tests, full core suite, typecheck/build, diff hygiene, protected no-drift checks, and GitNexus change detection.
9. Retain exact command/evidence records under the task research path.
10. Stop before commit unless the exact core-runtime commit boundary is separately authorized.

## Verification commands

Inspect current package scripts before execution. Expected families:

- `pnpm --filter @mindfoldhq/trellis-core test -- <focused files>`
- `pnpm --filter @mindfoldhq/trellis-core test`
- `pnpm build`
- `git diff --check -- <owned paths>`
- `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-07-cs6-correct-core-methodology-runtime`

## Rollback/stop

Revert only uncommitted owned paths. Do not alter accepted leaves, protected primitives, historical packages, or unrelated dirty paths.

## Commit boundary

Future boundary C2 contains only owned core source/tests and task-local evidence. No commit is currently authorized.

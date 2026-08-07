# CS6-4 implementation plan

## Preconditions

- CS6-1 exact disposition is `leaves-sound`.
- CS6-2 and CS6-3 reviewed interfaces are committed.
- Separate activation and package-author assignment exist.

## Ordered work

1. Record exact accepted leaf hashes, runtime/package schema inputs, and historical Procedure blob inventories.
2. Add a deterministic `2.0.7` generator; use `uv run python` for execution.
3. Generate exactly the 17 allowlisted package trees.
4. Validate strict JSON, duplicate keys, paths, inventories, digests, closure, lifecycle, validators, bindings, instructions, and dormant flags.
5. Regenerate in a separate temporary directory and compare every byte.
6. Run the version-specific package test and relevant support-pack/core/CLI tests.
7. Recompute historical `2.0.4`–`2.0.6` blob inventories and prove no drift.
8. Validate task scope and diff hygiene.
9. Stop before commit unless the exact package boundary is separately authorized.

## Verification

- `uv run python packages/cli/scripts/research-methodology-207-generate.py <verified args>`
- focused package/support-pack tests
- package count and internal identity checks
- deterministic regeneration comparison
- `git diff --check -- <owned paths>`
- `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-07-cs6-procedure-2-0-7-family-packages`

## Stop/rollback

Remove only uncommitted `2.0.7` outputs and owned generator/test/evidence. Do not touch historical versions or accepted bytes.

## Commit boundary

Future boundary C4 contains only owned new paths. No commit is currently authorized.

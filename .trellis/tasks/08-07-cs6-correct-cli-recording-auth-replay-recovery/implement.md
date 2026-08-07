# CS6-3 implementation plan

## Preconditions

- CS6-1 disposition is `leaves-sound`.
- CS6-2 runtime interface is accepted.
- Separate activation/owner assignment exists.
- Run GitNexus impact before each existing symbol edit and stop on HIGH/CRITICAL.

## Ordered work

1. Capture current record-result, bundle-resolution, materialization, replay, and recovery flows.
2. Add failing packed/external installed-bundle authentication vectors.
3. Add failing zero-write vectors for authority, package, contract, closure, lifecycle, validator, and digest errors.
4. Add valid record-result vectors that prove exact Result/Proposal and report bindings.
5. Add historical replay vectors after current package/default changes.
6. Add committed projection/materialization failure vectors with explicit recovery identity and no false rollback claim.
7. Correct only owned CLI adapters.
8. Run focused CLI tests, full CLI suite with deterministic isolation, build, pack-aware checks, diff hygiene, protected no-drift, and GitNexus change detection.
9. Retain exact evidence under the task research path.
10. Stop before commit unless the exact CS6-3 commit is separately authorized.

## Verification

Inspect package scripts first. Expected command families:

- `pnpm --filter @mindfoldhq/trellis test -- <focused files>`
- `pnpm --filter @mindfoldhq/trellis test`
- `pnpm build`
- packed CLI execution from a temporary external repository
- `git diff --check -- <owned paths>`
- `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-07-cs6-correct-cli-recording-auth-replay-recovery`

## Stop/rollback

Revert only uncommitted owned adapters/tests. Never mutate canonical history, accepted bundle bytes, protected primitives, historical packages, or inherited dirty paths.

## Commit boundary

Future boundary C3 contains only owned CLI source/tests and task-local evidence. No commit is currently authorized.

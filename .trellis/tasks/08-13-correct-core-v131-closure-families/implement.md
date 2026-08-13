# Core v1.3.1 closure family validation implementation plan

## Authorized paths

1. `.trellis/tasks/08-13-correct-core-v131-closure-families/task.json`
2. `.trellis/tasks/08-13-correct-core-v131-closure-families/prd.md`
3. `.trellis/tasks/08-13-correct-core-v131-closure-families/design.md`
4. `.trellis/tasks/08-13-correct-core-v131-closure-families/implement.md`
5. `.trellis/tasks/08-13-correct-core-v131-closure-families/implement.jsonl`
6. `.trellis/tasks/08-13-correct-core-v131-closure-families/check.jsonl`
7. `packages/core/src/research/methodology-reports.ts`
8. `packages/core/test/research/methodology-runtime.test.ts`

## Execution

1. Authenticate governance commit `29ff0837caf68edfd89dbfa3771f959eb4dcf313`, tree `0a8a4bdc6b2b31120a05b2eea253d1f6c352c908`, and parent `79f11838bfe0d7f6a9c9145e472cf8c845d28c9e`.
2. Confirm the supplied fresh upstream GitNexus impact for `buildMethodologyReportV131` remains LOW: direct `2`, impacted `2`, affected processes `0`.
3. Author and validate this task's six standard files.
4. Replace only the two incorrect `V131_CLOSURE_FAMILIES` entries.
5. Add direct positive coverage for `research-ideation` and `research-idea-evaluation` and direct negative coverage for `research-quest` and `research-computation` in the existing v1.3.1 report test block.
6. Run verification serially and inspect the final path set.

## Verification

Run in this order:

```bash
PYTHONDONTWRITEBYTECODE=1 uv run python \
  .trellis/scripts/task.py validate \
  .trellis/tasks/08-13-correct-core-v131-closure-families

pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis-core test -- test/research/methodology-runtime.test.ts
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core test

git diff --check -- \
  .trellis/tasks/08-13-correct-core-v131-closure-families \
  packages/core/src/research/methodology-reports.ts \
  packages/core/test/research/methodology-runtime.test.ts
```

The build must precede all later Core checks; no Core command may run in parallel with another Core command.

## Rollback and stop gate

If a verification failure requires any path outside the authorized eight, revert only this task's implementation changes and stop for a new forward-only decision. Do not alter preserved T2 or unrelated dirty paths. Do not stage or commit.

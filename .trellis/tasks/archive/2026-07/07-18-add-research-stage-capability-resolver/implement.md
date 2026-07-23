# Implementation — Core Research stage capability resolver

## Prepare

- [x] Confirm C01 schema-v1 and Dispatch fixtures remain green.
- [x] Run GitNexus impact before editing existing exports/functions; warn before newly reported HIGH/CRITICAL edits.
- [x] Keep `readResearchState`, reducer, projections, schemas, CLI commands, hooks, and workers out of scope.
- [x] Preserve unrelated dirty files; no commit.

## Tests first

- [x] Add exact all-stage descriptor and exhaustiveness tests.
- [x] Add nine-dispatchable plus explicit complete rejection tests.
- [x] Add exact host parser tests.
- [x] Add discovery normalization/determinism tests.
- [x] Add optional-match and bundled-fallback tests for every active stage.
- [x] Add audit asymmetric mapping regression.
- [x] Re-run schema-v1 Dispatch/event/projection/request compatibility unchanged.
- [x] Add built package `/research` export assertion and root non-leak assertion.

## Core implementation

- [x] Add `packages/core/src/research/stage-capabilities.ts`.
- [x] Define execution host, capability, optional skill, bundled skill, descriptor, input, and result types.
- [x] Add exhaustive `RESEARCH_STAGE_CAPABILITIES`, including explicit complete descriptor.
- [x] Add exact host parser using core validation-error conventions.
- [x] Add trim/drop-empty/exact-dedupe name normalizer.
- [x] Add pure deterministic resolver.
- [x] Export only from `packages/core/src/research/index.ts`.
- [x] Do not alter Dispatch schemas or persist resolution fields.

## Specs and review

- [x] Update core `research-state.md` with seven-section capability contract.
- [x] Update `trellis-core-sdk.md` with `/research` export boundary and root non-leak.
- [x] Add compatibility cross-reference to `research-worker-hooks.md` without changing hook behavior.
- [x] Run independent `trellis-check`; fix only verified C06 defects.

## Verification

```bash
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/research/stage-capabilities.test.ts \
  test/research/schema.test.ts \
  test/research/schema-v1-compatibility.test.ts

pnpm --filter @mindfoldhq/trellis-core build

pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/compatibility/core-package-exports.test.ts \
  test/commands/research-dispatch-compatibility.test.ts

pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm typecheck
git diff --check
```

- [x] Run GitNexus detect-changes and confirm only additive resolver/export/test/spec scope.
- [x] Create no commit unless explicitly requested.

## Rollback

Remove additive module, test, subpath exports, and spec sections. No data repair required.

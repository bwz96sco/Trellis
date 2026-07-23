# Research: C06 tests, exports, and boundaries

- **Scope**: C06 planning
- **Date**: 2026-07-20

## Core tests

Add `packages/core/test/research/stage-capabilities.test.ts` covering:

- exact descriptor for all ten `QuestStage` values;
- exactly nine dispatchable stages;
- explicit `complete` non-dispatchable descriptor;
- exact logical capability, optional external name, and bundled fallback for each stage;
- asymmetric audit mapping: `research.audit` / `research-review-case` / `trellis-research-audit`;
- compile/runtime exhaustiveness when a stage changes;
- exact host parser acceptance for `claude` and `codex` only;
- invalid/blank/case-variant/retired host rejection;
- trim/drop-empty/exact-dedupe discovery normalization;
- deterministic selection independent of discovery order;
- exact optional match chooses host; absent/case-variant/adorned names use bundled fallback;
- supplied skills never dispatch `complete`.

## Compatibility tests

Existing schema-v1 and Dispatch fixtures must stay unchanged:

- arbitrary non-empty `ownerSkill` remains valid;
- `taskRef` remains portable compatibility metadata;
- events/reducer/projections preserve old data;
- no computed capability fields are added to Dispatch JSON;
- tracked request fixture stays byte-stable.

Run:

- core schema-v1 compatibility;
- CLI Research Dispatch compatibility;
- built core package exports.

## Public export boundary

Export new runtime values/functions/types only from:

```text
@mindfoldhq/trellis-core/research
```

Do not:

- add a new package subpath;
- change package export keys;
- re-export through package root;
- modify root Channel/Task API;
- modify Dispatch schemas/events/projections.

## C06 implementation boundary

Allowed production scope:

- new `packages/core/src/research/stage-capabilities.ts`;
- `packages/core/src/research/index.ts` exports.

Avoid changes to:

- `types.ts`, `schema.ts`, `events.ts`, `reducer.ts`, `projections.ts`, `store.ts`;
- CLI research command behavior;
- Python hook stage maps;
- Dispatch creation/owner CLI flags;
- Codex worker/preflight.

## Specs

Update:

- `.trellis/spec/core/backend/research-state.md`
- `.trellis/spec/cli/backend/trellis-core-sdk.md`

Cross-reference only, without hook behavior change:

- `.trellis/spec/cli/backend/research-worker-hooks.md`

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
```

Full workspace gates remain required before archive.

## GitNexus caveat

`readResearchState` is HIGH and `reduceResearchEvents` is MEDIUM. C06 must not integrate resolution into either. New resolver remains pure and additive; existing `research/index.ts` barrel edit requires impact review before modification.

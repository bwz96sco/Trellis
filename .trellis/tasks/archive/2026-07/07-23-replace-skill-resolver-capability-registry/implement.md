# Implementation plan

## Step 0 — Reconfirm baseline and scope

- Confirm C02 commit `47509e20` and only inherited `docs-site`/`marketplace` dirt.
- Confirm C03 is the only active child and C04-C10 remain planning.
- Record current package versions, export map, root-barrel keys, old Research-subpath exports, packed-core representative assertion, and focused test baseline.
- Preserve the full C01 compatibility oracle and C02 ledger behavior.

Verify:

```bash
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/research/stage-capabilities.test.ts \
  test/compatibility/package-exports.test.ts
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-dispatch-context.integration.test.ts \
  test/commands/research-dispatch-arbitrary-metadata-compatibility.test.ts \
  test/compatibility/core-import-boundary.test.ts
```

Rollback point: planning artifacts only.

## Step 1 — Preserve active Skill routing privately

- Add `packages/cli/src/commands/research/legacy-skill-routing.ts` with the exact old stage table, normalization, selection, result shape, and `complete` behavior.
- Keep it package-private and independent from the successor registry.
- Redirect `dispatch-context.ts` imports and return-type coupling to this bridge only; change no command signature, JSON field, warning, error, filesystem observation, or write behavior.
- Redirect current CLI tests that imported the old core Skill table to the bridge, without changing expected worker/hook behavior.
- Add a focused bridge characterization test preserving every C01 old-resolver case.
- Record the transition owner explicitly: C06 removes the bridge from production Context and `--skill-name`; C07 removes any residual bridge-backed worker/hook test dependency and the bridge module itself.

Verify:

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-legacy-skill-routing.test.ts \
  test/commands/research-dispatch-context.integration.test.ts \
  test/commands/research-dispatch-compatibility.test.ts \
  test/commands/research-dispatch-arbitrary-metadata-compatibility.test.ts \
  test/templates/codex.test.ts \
  test/templates/research-hooks.test.ts \
  test/templates/research-payload-exact.test.ts
```

Gate: Context and worker/hook snapshots remain unchanged. If new capability IDs leak into active Context, roll back this step.

## Step 2 — Replace core Skill resolver with immutable registry

- Rewrite `packages/core/src/research/stage-capabilities.ts` around the exact 14-entry C01 registry.
- Keep `DispatchableQuestStage`, `ResearchExecutionHost`, `RESEARCH_EXECUTION_HOSTS`, and `parseResearchExecutionHost` behavior stable.
- Add exact capability types, runtime-frozen definitions, registry, default map, lookup helper, typed resolution error, and explicit/default resolver.
- Apply stage-first typed failures: `complete` and runtime-invalid stages use `QUEST_STAGE_NOT_DISPATCHABLE` before capability lookup; unknown/adorned explicit IDs use `UNKNOWN_CAPABILITY`; known wrong-stage IDs use `CAPABILITY_STAGE_MISMATCH`.
- Remove optional/fallback/discovery/selected-Skill/source concepts from core.
- Add no filesystem, Procedure, policy, event, Dispatch, or chaining behavior.

Verify:

```bash
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/research/stage-capabilities.test.ts
```

Gate: exact inventory/defaults/freeze/error tests pass; no C04-C07 behavior appears.

## Step 3 — Update Research-subpath and packed-core contract

- Replace old Skill exports in `packages/core/src/research/index.ts` with successor registry/error exports.
- Keep root barrel and `package.json` export keys unchanged.
- Update `packages/core/test/compatibility/package-exports.test.ts` for successor presence, old runtime export absence, and root non-leak.
- Update `packages/core/scripts/verify-packed-core.js` only to require representative successor Research exports instead of the retired resolver.
- Do not change core version, dependency map, packed CLI inventory, or generic core APIs.

Verify:

```bash
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/compatibility/package-exports.test.ts
pnpm --filter @mindfoldhq/trellis-core build
node packages/core/scripts/verify-packed-core.js
```

Rollback point: core registry plus public Research-subpath changes can be reverted together; no data migration exists.

## Step 4 — Update executable code-specs

- Update `.trellis/spec/core/backend/research-state.md` with implemented registry signatures, exact defaults, typed errors, runtime immutability, validation matrix, tests, and wrong/correct examples.
- Update `.trellis/spec/cli/backend/commands-research.md` only with the private compatibility bridge, C06 production-path removal, and C07 residual-test/module deletion boundary.
- Preserve all seven required sections in both specs.
- Do not claim Procedure/policy/activation/approval/normalized-worker implementation exists.

Verify headings and task manifests.

## Step 5 — Full verification

Run focused then package/workspace checks:

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core build
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm build
node packages/cli/scripts/release-preflight.js verify-packed-core
uv run python ./.trellis/scripts/task.py validate \
  .trellis/tasks/07-23-replace-skill-resolver-capability-registry
git diff --check
```

Also prove:

- arbitrary historical Dispatch fixture hash/bytes unchanged;
- C02 v1/v2 fixtures and projection schemas unchanged;
- `packages/core/package.json`, root barrel, versions, cleanup/migration evidence, packed CLI Skill inventory, workers, hooks, payload, `docs-site`, and `marketplace` have no C03 diff;
- current Context success/failure snapshots remain zero-write and equal.

## Step 6 — Independent review and closeout

- Run GitNexus changed-scope detection before commit.
- Compare actual symbols/processes against the C03 impact table. Explain any unexpected flow.
- Return to the main session so it can dispatch the independent `trellis-check` with C03 PRD/design/implementation/spec context; the implement sub-agent must not dispatch another Trellis agent.
- Fix only confirmed C03 defects; rerun affected checks and final full matrix.
- Archive C03 with `task.py archive --no-commit` only after the main-session review passes.
- Stage only C03 files, excluding `docs-site` and `marketplace`.
- Commit with user-authorized ordered child commit; no push.

Stop and return to planning if implementation needs store/event/projection mutation, Procedure/policy resolution, activation/approval emission, command cutover, worker/payload change, cleanup authority, package export-map change, generic core API removal, or HIGH/CRITICAL symbol edits.

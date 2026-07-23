# Implementation — Read-only Dispatch context

## Prepare

- [ ] Confirm C06 capability resolver and schema-v1 Dispatch compatibility suites remain green.
- [ ] Re-run GitNexus impact before editing each existing symbol, especially `registerResearchCommand`, `renderResearchError`, `readBindings`, and any Repository helper.
- [ ] Treat `readResearchState` and `resolveResearchRoot` as shared-sensitive; consume unchanged.
- [ ] Avoid `resolveRepositoryForUse`, `dispatchPaths`, `verifyArtifact`, mutation wrappers, Python hooks, and worker templates unless implementation proves extraction unavoidable and fresh impact is reviewed.
- [ ] Preserve unrelated dirty files; no commit.

## Tests first

- [ ] Add `research-dispatch-context.integration.test.ts` with deterministic fixture builder and filesystem snapshots.
- [ ] Add exact success JSON for Claude/Codex and optional/fallback skill selection.
- [ ] Add exact structured JSON failure/exit tests for every stable error family.
- [ ] Add canonical request path, containment, ID, strict schema, and request/state equality tests.
- [ ] Add active/dispatchable Quest, runnable Run, Campaign/Quest/Repository hierarchy tests.
- [ ] Add schema-v1 arbitrary owner/provider/taskRef warning-only compatibility tests.
- [ ] Add binding precedence, locator fallback, non-Git, expected remote, and malformed unused observation-cache tests.
- [ ] Add artifact ownership, regular-file, digest, revision, traversal, symlink-target, and symlink-parent tests.
- [ ] Add 128-entry and 16,384-character boundary tests.
- [ ] Add expected-output text and no-check-execution regressions.
- [ ] Add artifact-body/non-whitelisted-field absence assertions.
- [ ] Add success/failure/replay byte-identical control/target tree assertions, including no runtime/lock creation.
- [ ] Update Dispatch command-tree expectation in `research.test.ts`.

## Repository observation

- [ ] Add zero-write Repository context resolution helper.
- [ ] Reuse strict binding and locator rules without reading observation cache.
- [ ] Use bounded Git identity commands; omit `git status`, dirty summary, and actual remote from output.
- [ ] Preserve existing persisted `repo resolve`, prepare, result, and review behavior byte-for-byte.

## Context implementation

- [ ] Add typed context result, warning, error-code, and operation options.
- [ ] Validate exact request-file grammar and canonical containment.
- [ ] Strict-parse request and require semantic equality with canonical Dispatch.
- [ ] Validate hierarchy in fixed fail-fast order.
- [ ] Validate host and canonical repeated skill names inside operation.
- [ ] Resolve current stage capability through C06 only.
- [ ] Classify legacy/stale owner/provider/taskRef into fixed warnings.
- [ ] Validate bounded text/list/context input.
- [ ] Validate artifact metadata/files/digest/revision without emitting bytes.
- [ ] Validate write-scope containment through nearest existing ancestor.
- [ ] Keep expected outputs/checks as non-executed text.
- [ ] Emit fixed bounded success/authority/output-contract object.

## CLI and errors

- [ ] Register `dispatch context <request-file>` with `--host`, repeatable `--skill-name`, `--root`, and `--json`.
- [ ] Route operation through `runAction`.
- [ ] Add specialized typed JSON error envelope without changing generic Research errors.
- [ ] Confirm JSON success uses stdout/exit 0; JSON failure uses stderr/exit 1 and empty stdout.
- [ ] Confirm startup update notice remains suppressed for `--json`.

## Specs and review

- [ ] Update `commands-research.md` with seven-section command, payload, validation/error, cases, tests, and wrong/correct contract.
- [ ] Update `research-worker-hooks.md` to mark C07 TypeScript preflight authority and current Claude divergence pending C09; do not claim hook convergence yet.
- [ ] Update `filesystem-safety.md` with strict zero-write preflight and symlink-parent containment if not already explicit.
- [ ] Run independent `trellis-check`; fix only verified C07 defects.

## Verification

```bash
pnpm --filter @mindfoldhq/trellis-core exec vitest run \
  test/research/stage-capabilities.test.ts \
  test/research/schema.test.ts \
  test/research/schema-v1-compatibility.test.ts

pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-dispatch-context.integration.test.ts \
  test/commands/research-dispatch.integration.test.ts \
  test/commands/research-dispatch-compatibility.test.ts \
  test/commands/research.test.ts

pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis typecheck
pnpm --filter @mindfoldhq/trellis build
pnpm typecheck
git diff --check
```

- [ ] Smoke built CLI help and valid/invalid JSON preflight.
- [ ] Run GitNexus detect-changes and manually isolate C07 from inherited dirty-worktree scope.
- [ ] Confirm no production or spec files outside C07 allowlist changed.
- [ ] Create no commit unless explicitly requested.

## Rollback

Remove additive context module, test suite, command registration, specialized error branch, Repository context resolver, and C07 spec sections. No ledger/runtime/target repair is required.

# Implementation — Bounded Codex Research worker

## Prepare

- [ ] Confirm archived C07 focused/full verification remains green.
- [ ] Confirm existing Codex agent discovery/configure/collect/package flows include all `.toml` files without registry edits.
- [ ] Run GitNexus impact before any unexpected existing production-symbol edit; stop/report on HIGH/CRITICAL.
- [ ] Preserve old `trellis-research.toml`, C07, Claude hooks, Task prelude, unrelated dirty files, and no commit.

## Tests first

- [ ] Update Codex template inventory expectation with separate worker.
- [ ] Add exact instruction-order assertions: pointer -> name metadata -> C07 -> response validation -> selected skill -> target work -> output.
- [ ] Add fail-closed/manual-fallback prohibition assertions.
- [ ] Add selected-skill-only and legacy-metadata non-authority assertions.
- [ ] Add structural multi-agent disable and forbidden-operation assertions.
- [ ] Add sandbox-outside-root blocked/no-escalation assertions.
- [ ] Add declared-context/read/write/check/network limits.
- [ ] Extract/materialize final sample and strict-parse Result/Proposal with exact top-level keys.
- [ ] Preserve generic `trellis-research` Task behavior tests.
- [ ] Add Codex-only and dual-host init/hash assertions.
- [ ] Add older-install update/new managed file/idempotence test.
- [ ] Add pre-existing unowned conflict preservation/unclaimed test.
- [ ] Add build/tarball payload assertion.
- [ ] Add optional gated real-Codex invalid-preflight zero-write smoke if current test harness can support it without unstable default execution.

## Template

- [ ] Add only `packages/cli/src/templates/codex/agents/trellis-research-worker.toml` as product source.
- [ ] Use `workspace-write` and disable both multi-agent features.
- [ ] Require exact one-line pointer and isolated parent invocation contract.
- [ ] Collect exact optional names from Codex inventory metadata without body reads.
- [ ] Run exactly one bare C07 command with direct args.
- [ ] Fail closed on process/JSON/authority anomalies.
- [ ] Load exactly selected skill after success.
- [ ] Bound target reads, writes, checks, network, sandbox, canonical state, Proposal review, nested agents, and Git history.
- [ ] Return C07/local failure envelope before IDs; blocked Result+empty pending Proposal after IDs.
- [ ] Require raw strict Result plus Proposal output.
- [ ] Do not add `.codex` dogfood twin or generated `dist` source.

## Specs

- [ ] Update `research-worker-hooks.md` with Codex trigger, preflight sequence, failure modes, selected skill, bounded work, and output contract.
- [ ] Update `platform-integration.md` with exact Codex agent inventory and Research worker separation from Task prelude.
- [ ] Update `configurator-shared.md` to pin prelude exclusion and automatic TOML collection.
- [ ] Update `commands-research.md` to document bounded Codex consumer without claiming C09 parity.
- [ ] Keep code-spec depth: signatures, payloads, error matrix, good/base/bad, tests, wrong/correct.

## Verification

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/templates/codex.test.ts \
  test/templates/research-hooks.test.ts \
  test/configurators/platforms.test.ts \
  test/regression.test.ts \
  test/commands/init-research-only.integration.test.ts \
  test/commands/update.integration.test.ts \
  test/commands/research-dispatch-context.integration.test.ts

pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis typecheck
pnpm --filter @mindfoldhq/trellis build
pnpm typecheck
git diff --check
```

Package audit:

```bash
npm pack --dry-run --json
```

- [ ] Confirm `dist/templates/codex/agents/trellis-research-worker.toml` built and tarball-listed.
- [ ] Run optional real smoke only when explicitly gated and prerequisites exist; report skip otherwise.
- [ ] Run GitNexus detect-changes; manually isolate C08 template/tests/specs from inherited dirty scope.
- [ ] Run independent `trellis-check`; fix only verified C08 defects.
- [ ] Create no commit unless explicitly requested.

## Rollback

Remove additive template, C08 tests, and C08 spec sections. Do not alter ledger/runtime state or restore generic surfaces.

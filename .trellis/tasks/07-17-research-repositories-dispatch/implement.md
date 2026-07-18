# Implementation — Research repositories and dispatch

## Pre-edit impact

- [x] Run GitNexus upstream impact for existing `Repository`, `ArtifactRef`, `Dispatch`, `Result`, `Proposal`, `Decision`, their schemas, reducer cases, `ResearchMutation`, and research CLI registration.
- [x] Report HIGH/CRITICAL risk before edits.
- [x] Capture focused core research and lifecycle CLI baselines.

## Tests first — core

- [x] Add strict repository-kind/capability and artifact revision schema tests.
- [x] Add full Dispatch/Result/ProposalOperation/Proposal/Decision schema tests.
- [x] Add proposal-operation-to-mutation mapping tests.
- [x] Add reducer relation/uniqueness/decision tests.
- [x] Update existing research fixtures for enriched contracts.

## Tests first — CLI

- [x] Add repository add/bind/list/resolve tests with child and sibling repos.
- [x] Add remote mismatch, missing binding, malformed runtime file, and no-absolute-tracked-path tests.
- [x] Add dispatch prepare request/manifest and relationship/path validation tests.
- [x] Add result/proposal record tests including atomic ledger batch failure.
- [x] Add apply subset, reject, dry-run, idempotent retry, digest mismatch, revision mismatch, and decision event-ID tests.
- [x] Add root + two independent child Git repos E2E fixture with no child Trellis.

## Implementation — core

- [x] Extend portable repository and artifact contracts.
- [x] Extend Dispatch, Result, ProposalOperation, Proposal, and Decision types/schemas.
- [x] Add proposal operation conversion helper.
- [x] Update reducer/store relations and mutation event mapping.
- [x] Export supported contracts from `@mindfoldhq/trellis-core/research`.

## Implementation — CLI

- [x] Add atomic runtime repository binding and resolution helpers.
- [x] Add safe Git observation and expected-remote/revision verification.
- [x] Add dispatch tracked/runtime path and atomic JSON helpers.
- [x] Add repository commands.
- [x] Add prepare, record-result, apply, and reject operations.
- [x] Extend research Commander tree and human/JSON rendering.
- [x] Keep worker execution, hooks, Task linking, workflows, and Mempal out of scope.

## Verification

- [x] Run focused core and CLI repository/dispatch tests.
- [x] Run lifecycle CLI regressions and full core suite.
- [x] Run full CLI suite; compare known baseline failures.
- [x] Run core/CLI lint, typecheck, build, and root typecheck.
- [x] Run explicit `trellis-check` and fix scoped findings.
- [x] Update research core and CLI code-specs.
- [x] Run `git diff --check`.
- [x] Run GitNexus change detection against `main`.

## Rollback

- Runtime bindings/cache/manifests are disposable.
- CLI registration is additive.
- Core contract changes are within unreleased research V1; revert all research fixtures/types together.
- Never delete `.trellis/research/events.jsonl` or accepted child artifacts.

## Commit

- Do not commit unless user explicitly requests it.

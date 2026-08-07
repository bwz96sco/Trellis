# CS6 exact path-ownership map

Status: CS6-0 governance freeze candidate. No later child may start until this map is validated and frozen.

## Global rules

1. Ownership is exclusive within an active wave. A path outside the listed allowlist requires a reviewed governance amendment before edit.
2. CS6-0 owns planning files only through governance boundary G. After G, each child owns only its task status and listed `research/**` outputs when separately activated; planning bodies remain the frozen contract unless requirements are explicitly returned to planning.
3. Existing symbols require GitNexus upstream impact before edit. HIGH/CRITICAL risk stops for confirmation.
4. Shared events, reducers, stores, repositories, canonical ledgers, batch committers, locks, and hardened publication internals are call-only for CS6.
5. Historical CS5 evidence, accepted v1.3.0 leaves, Procedure `2.0.4`–`2.0.6`, live selection, protected dirty paths, and `.trellis/research/**` are immutable exclusions.
6. Defects return to the owning child. Integration, harness, assurance, and operator children do not repair upstream paths.
7. All operational authority flags remain false.

## CS6-0 — governance implementer

Planning ownership through G:

- `.trellis/tasks/08-07-cs6-complete-system-forward-correction/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-establish-successor-governance/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-correct-core-methodology-runtime/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-correct-cli-recording-auth-replay-recovery/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-procedure-2-0-7-family-packages/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-production-mutation-coverage-harness/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-integrate-install-test-freeze-attempt-11/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-decide-complete-system-attempt-11/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`
- `.trellis/tasks/08-07-cs6-establish-successor-governance/research/**`

Append-only canonical-parent ownership:

- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/prd.md`
- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/design.md`
- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/implement.md`
- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/task.json` — add/list CS6 campaign exactly once only
- `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/path-ownership-map.md`

No production/test/package/spec/accepted-leaf/assurance-output/operator-decision ownership.

## CS6-1 — independent semantic auditor

- `.trellis/tasks/08-07-cs6-audit-accepted-v13-semantic-leaves/research/**`
- Own task status transitions after separate activation.

Read-only inputs: the seven accepted A3 leaves, accepted-member ledger, frozen target, candidate manifest, and public/Trellis evidence.

No production, test, Procedure, registry, spec, accepted-leaf, assurance, or operator ownership.

## CS6-2 — core-runtime implementer

Production:

- `packages/core/src/research/methodology-v13-runtime.ts`
- `packages/core/src/research/methodology-artifacts.ts`
- `packages/core/src/research/methodology-validators.ts`
- `packages/core/src/research/methodology-reports.ts`
- `packages/core/src/research/index.ts` — minimum owned exports only

Tests:

- `packages/core/test/research/methodology-v13-runtime.test.ts`
- `packages/core/test/research/methodology-runtime.test.ts`

Evidence/status:

- `.trellis/tasks/08-07-cs6-correct-core-methodology-runtime/research/**`
- Own task status transitions after separate activation.

Call-only exclusions include `events.ts`, `reducer.ts`, `store.ts`, `repositories.ts`, `projections.ts`, canonical ledgers/committers/locks, and hardened publication internals.

## CS6-3 — CLI runtime implementer

Production:

- `packages/cli/src/commands/research/bundled-procedure-root.ts`
- `packages/cli/src/commands/research/dispatch-command.ts`
- `packages/cli/src/commands/research/dispatch-methodology-validation.ts`
- `packages/cli/src/commands/research/dispatch-activation-materialization.ts`
- `packages/cli/src/commands/research/dispatch-materialization-reader.ts`

Tests:

- `packages/cli/test/commands/research-accepted-bundle-authentication.test.ts`
- `packages/cli/test/commands/research-dispatch-approved-result.test.ts`
- `packages/cli/test/commands/research-report-v2-publication.test.ts`
- `packages/cli/test/commands/research-dispatch-materialization-reader.test.ts`
- `packages/cli/test/cli/research-only-surface.integration.test.ts`
- `packages/cli/test/commands/research-cs6-cli-runtime.test.ts` (new)

Evidence/status:

- `.trellis/tasks/08-07-cs6-correct-cli-recording-auth-replay-recovery/research/**`
- Own task status transitions after separate activation.

Core semantics, accepted bundle bytes, protected canonical primitives, package trees, and live registry are excluded.

## CS6-4 — Procedure package author

Generator/test:

- `packages/cli/scripts/research-methodology-207-generate.py` (new)
- `packages/cli/test/commands/research-procedure-207-packages.test.ts` (new)

New immutable package trees only:

- `packages/cli/src/templates/research/procedures/computation-case-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/experiment-campaign-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/experiment-round-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/figure-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/idea-evaluation-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/idea-generation-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/literature-review-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/literature-scan-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/project-setup-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/quest-admin-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/quest-framing-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/review-campaign-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/review-case-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/slides-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/survey-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/theory-case-v1/2.0.7/**`
- `packages/cli/src/templates/research/procedures/writing-case-v1/2.0.7/**`

Evidence/status:

- `.trellis/tasks/08-07-cs6-procedure-2-0-7-family-packages/research/**`
- Own task status transitions after separate activation.

Procedure `2.0.4`–`2.0.6`, accepted bundle bytes, registry/live selection, and runtime/CLI files are excluded.

## CS6-5 — production harness author

- `packages/cli/test/research-methodology-harness/production-116.ts`
- `packages/cli/test/commands/research-methodology-116-production.test.ts`
- `packages/cli/test/commands/research-methodology-cs6-coverage.test.ts` (new)
- `.trellis/tasks/08-07-cs6-production-mutation-coverage-harness/research/**`
- Own task status transitions after separate activation.

No production source or package ownership.

## CS6-6 — integration and freeze owner

- `packages/cli/test/commands/research-cs6-integration.test.ts` (new)
- `packages/cli/scripts/research-cs6-installed-package-audit.mjs` (new)
- `.trellis/tasks/08-07-cs6-integrate-install-test-freeze-attempt-11/research/**`
- Own task status transitions after separate activation.

I11 may contain integration script/test/evidence only. S11 is a separate one-file freeze boundary containing the resolved freeze record only. Prior-child defects return to owners.

## CS6-7 — fresh MAL-1 reviewer

Reviewer setup:

- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/reviewer/**`

Exact attempt-11 outputs:

- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/exact-subject-attestation.json`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/reviewer-session-attestation.json`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/accepted-member-ledger.json`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/runtime-contract-audit.json`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/harness-case-evidence.jsonl`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/command-evidence-ledger.jsonl`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/filesystem-mutation-audit.json`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/containment-audit.json`
- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/machine-verdict.json`
- Own task status transitions after separate activation.

No repair, source, test, package, freeze, operator, or activation ownership.

## CS6-8 — operator

- `.trellis/tasks/08-07-cs6-decide-complete-system-attempt-11/research/cs6-8-operator-decision.json`
- Own task status transitions after separate activation.

No other output is allowed. The decision does not authorize activation, archive, release, publication, or push.

## Global immutable exclusions

- `AGENTS.md`
- `CLAUDE.md`
- `docs-site/**`
- `marketplace/**`
- `.trellis/research/**`
- `.trellis/tasks/08-06-cs5-*/**`
- `.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research/**`
- `packages/cli/src/templates/research/evaluation-contracts/1.3.0/**`
- `packages/cli/src/templates/research/procedures/*/2.0.4/**`
- `packages/cli/src/templates/research/procedures/*/2.0.5/**`
- `packages/cli/src/templates/research/procedures/*/2.0.6/**`
- `packages/core/src/research/events.ts`
- `packages/core/src/research/reducer.ts`
- `packages/core/src/research/store.ts`
- `packages/core/src/research/repositories.ts`
- `packages/core/src/research/projections.ts`
- `packages/core/src/research/stage-capabilities.ts`

Any future need to edit an exclusion requires a new reviewed ownership and authority amendment.

# Implementation — Research specs and end-to-end proof

## Pre-edit gates

- [x] Run GitNexus upstream impact for every existing function/class/method edited, especially Quest command registration/creation and any init/update helper touched by E2E fixes.
- [x] Warn before HIGH/CRITICAL edits; do not fold high-impact lifecycle/schema expansion into this slice.
- [x] Capture focused Quest creation, Task link, dispatch, workflow update, rebuild, template, and docs/submodule baselines.

## Planning and context

- [x] Replace placeholder PRD with concrete requirements and acceptance criteria.
- [x] Add design with E2E data flow, migration authority, compatibility, V1 deferrals, and rollback.
- [x] Add ordered implementation checklist.
- [x] Curate `implement.jsonl` and `check.jsonl` with executable specs/guides only.
- [x] Validate task context and activate task.

## Tests first — Quest repository reachability

- [x] Add CLI unit/integration coverage for repeatable Quest repository options.
- [x] Assert omitted option preserves empty repository list.
- [x] Assert duplicate IDs normalize deterministically.
- [x] Assert malformed/unknown IDs fail before ledger mutation.
- [x] Assert repository-associated Quest supports Task link containing both Quest and repository IDs.

## Tests first — migration and consolidated E2E

- [x] Pin all four legacy artifact forms and proposal-only/Mempal boundaries in setup-skill template tests.
- [x] Add `research-workflow.integration.test.ts` with real root/code/paper/notes Git repos.
- [x] Cover separate workflow/canonical init, portable repository registration, and no child Trellis requirement.
- [x] Cover Task-free Result/Proposal dry-run/apply/replay.
- [x] Cover Task-linked session pointers, finish/archive preservation, and no Task-link ledger mutation.
- [x] Cover final Quest/Campaign/Run/Evidence/Claim projections.
- [x] Cover projection corruption/rebuild, unchanged ledger, and byte-stable repeated rebuild.
- [x] Cover tracked absolute-path rejection and ignored runtime state.
- [x] Cover legacy source byte preservation.
- [x] Cover malformed ledger fail-closed as terminal fixture step.
- [x] Cover bundled research update idempotency/state preservation.
- [x] Cover custom workflow preservation and no ownership takeover.

## Implementation

- [x] Expose repeatable repository IDs through public Quest creation using existing core payload.
- [x] Validate repository existence before commit; avoid new events/reducer/schema branches.
- [x] Extend `trellis-research-setup` with bounded legacy inspection and pending-Proposal rules.
- [x] Keep all child Git repositories independent; no automatic commit/push/merge.
- [x] Do not implement deferred high-impact lifecycle/rich-schema features.

## Specs and documentation

- [x] Update `commands-research.md` with Quest repository signature, errors, E2E closure matrix, and tests.
- [x] Update `research-worker-hooks.md` with legacy proposal-only contract and wrong/correct example.
- [x] Record accepted V1 deferrals in parent/child closure artifacts.
- [x] Initialize docs submodule only if available without modifying history.
- [x] Add symmetric English/Chinese research workflow guides and nav/discovery links when docs submodule is available.
- [x] If docs submodule remains unavailable, report exact blocker; do not fabricate docs validation.
- [x] Use current shipped command names and state V1 limitations honestly.

## Verification

- [x] Run focused core research tests.
- [x] Run focused CLI research, Task pointer, workflow/update, template, and consolidated E2E tests.
- [x] Run independent `trellis-check` and self-fix scoped findings.
- [x] Run CLI/core lint, Python analysis, typecheck, and build.
- [x] Verify built setup-skill template contains migration contract.
- [x] Run full repository tests where local submodule fixtures permit; isolate known missing-submodule failures.
- [x] Run docs format/lint only when docs submodule dependencies are available.
- [x] Run `git diff --check` and absolute-path leak scan over tracked research state/templates/docs/specs.
- [x] Refresh GitNexus and run compare-scope change detection; distinguish Slice 7 impact from preserved prior slices.
- [x] Update parent acceptance checklist only for verified behavior.

## Rollback

- Quest repository option is additive and removable without ledger migration.
- E2E/spec/docs/template changes do not mutate user research data.
- Legacy sources remain untouched throughout implementation and rollback.
- Never restore planned-but-unshipped aliases or broad lifecycle behavior as a fallback.

## Commit

- Do not commit unless user explicitly requests it.

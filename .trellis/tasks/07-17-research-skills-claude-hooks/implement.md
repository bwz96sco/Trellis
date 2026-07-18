# Implementation — Research skills and Claude hooks

## Pre-edit impact and baselines

- [ ] Run GitNexus upstream impact for every existing function/class/method to edit: Trellis agent registry, SessionStart helpers/main, workflow-state helpers/main, subagent parser/builders/main, and affected template tests.
- [ ] Warn before HIGH/CRITICAL edits; narrow or split implementation before proceeding.
- [ ] Capture focused template, shared-hook, regression, init/update, Python lint, and native Task-injection baselines.

## Tests first — templates and skills

- [ ] Add invariants for nine exact research stage-owner bundled skills, narrow frontmatter triggers, authority limits, and Result + Proposal wording.
- [ ] Add Trellis agent registry test for canonical `research.md` worker card.
- [ ] Add Claude agent test for `trellis-research-worker` while preserving existing `trellis-research`.
- [ ] Add init/update template coverage proving new skills and cards are installed/hash-tracked without platform-specific installer branches.

## Tests first — SessionStart and sequence watermark

- [ ] Add runtime fixture helpers for bundled research selection, ledger, Quest projection, proposal files, and session JSON.
- [ ] Test compact valid research orientation, zero/one/multiple active Quest behavior, owner mapping, pending Proposal count, and relative pointers.
- [ ] Test malformed selection, ledger gap/line, projection, and proposal handling with compact validate guidance.
- [ ] Test SessionStart writes only `research_last_seen_seq`, preserves Task/Run/unknown metadata, skips missing identity, and preserves malformed session JSON.
- [ ] Test research UserPromptSubmit unchanged sequence -> empty stdout.
- [ ] Test changed sequence -> one compact pointer, atomic watermark update, next prompt silent.
- [ ] Test native/custom and non-Claude paths retain existing breadcrumb output.

## Tests first — explicit Claude dispatch

- [ ] Add valid Task-free dispatch fixture targeting independent child Git repo.
- [ ] Add valid Task-linked dispatch fixture and assert optional `Active task:` injection.
- [ ] Assert marker idempotency and no duplicate request/context injection.
- [ ] Assert injected prompt contains owner, target, objective, criteria, context pointers/text, bounded writes, outputs, checks, and Result + Proposal contract but not artifact bodies.
- [ ] Add invalid first-line/path traversal, ID mismatch, malformed request, owner-stage mismatch, inactive/missing Quest, inconsistent Run/Campaign/Repository, unresolved binding/locator, artifact escape, and malformed runtime binding tests.
- [ ] Assert invalid explicit dispatch receives validation-failure no-write prompt and never falls through to Task context.
- [ ] Re-run existing implement/check/research Task injection tests unchanged.

## Implementation

- [ ] Add nine compact bundled stage-owner `SKILL.md` templates.
- [ ] Add platform-neutral `.trellis/agents/research.md` template and register it beside implement/check.
- [ ] Add Claude `trellis-research-worker.md` wrapper; preserve existing agent names/content.
- [ ] Add small shared research-state/session helpers to `session-start.py` and append compact `<research-state>` output.
- [ ] Add Claude-only bundled-research sequence branch to `inject-workflow-state.py` with atomic session watermark RMW.
- [ ] Add Claude-only explicit research dispatch parser/validator/resolver/prompt builder to `inject-subagent-context.py` before normal agent-type filtering.
- [ ] Keep non-Claude, native/custom, Task fallback, OpenCode, and hook capability-table behavior unchanged.
- [ ] Do not add hooks, dependencies, network calls, canonical research writes, or automatic Git operations.

## Verification and specs

- [ ] Update executable shared-hook/research workflow spec with trigger, signatures, runtime field, request/result contracts, validation matrix, Good/Base/Bad cases, tests, and Wrong/Correct example.
- [ ] Update workflow-state, platform/template registry, filesystem-safety, and research-command specs only where behavior changed; update indexes if a new spec file is added.
- [ ] Run focused Vitest template/shared-hook/regression/init/update suites.
- [ ] Run explicit `trellis-check` and fix scoped findings.
- [ ] Run CLI ESLint, Python basedpyright/lint, CLI typecheck/build, root typecheck, and relevant core build/import checks.
- [ ] Verify generated `dist` template parity and source/dogfood parity where applicable.
- [ ] Run `git diff --check` and absolute-path leak scan over tracked research templates/artifacts.
- [ ] Refresh GitNexus index and run change detection against `main`; distinguish task-owned impact from pre-existing dirty research slices.

## Rollback

- Research hook branches are additive and removable without touching canonical research data.
- `research_last_seen_seq` remains harmless unknown runtime metadata after rollback.
- Skills/cards can be removed independently; manual CLI dispatch stays functional.
- Never restore broad per-prompt loading or add Stop/SessionEnd/PostToolUse hooks as fallback.

## Commit

- Do not commit unless user explicitly requests it.

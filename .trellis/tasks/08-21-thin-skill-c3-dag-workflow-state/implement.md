# C3 DAG Workflow State Implementation Plan

## Preconditions

- C1 frozen contracts remain authoritative.
- C2 commits `17afac40` and `a375820b` are present and historical Procedure behavior remains fixed.
- This task stays `planning` until user approves the final C3 planning summary in a later message.
- Do not run `task.py start`, edit product code, invoke providers, migrate real Skills, or begin C4–C7 before that approval.

## 1. Finalize and activate task

1. Validate `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`.
2. Present final summary with goal, scope, acceptance, decisions, risks/deferred work, and artifact status.
3. Wait for fresh explicit implementation approval.
4. Only then run:

```bash
uv run python ./.trellis/scripts/task.py start .trellis/tasks/08-21-thin-skill-c3-dag-workflow-state
```

Verify task status becomes `in_progress` before product edits.

## 2. Mandatory GitNexus impact analysis

Before editing any existing function/class/method, run upstream impact on each target. Expected targets include:

- `parseResearchEvent`
- `emptyResearchState`
- `applyEvent`
- `buildValidatedBatch`
- `mutationToEventDraft`
- `writeResearchProjections`
- `researchPaths`
- `resolveSelectedResearchSkill`
- `registerResearchCommands`
- any existing rebuild/status function changed for Workflow counts/projections

Use `context` for exact callers/callees where needed. Report direct callers, affected processes, and risk. If any result is HIGH or CRITICAL, warn user and stop before edits; prior C2 risk approval does not authorize C3 edits.

## 3. Add pure Core Workflow contract

New files:

```text
packages/core/src/research/workflow.ts
packages/core/test/research/workflow.test.ts
```

Implement:

- Workflow/instance/ref types and stable error class;
- strict Workflow JSON parser with closed nested schemas;
- exact slug/SemVer/ref parsing;
- canonical normalization and deep freeze;
- frozen workflow digest domain;
- duplicate/missing endpoint/self-edge/cycle validation plus mandatory `stop: true` one-node boundaries;
- pure helpers for node/transition lookup, required-ref evaluation, terminal completion by outgoing-edge absence, and identity matching.

Tests:

- fixed digest vector independent of implementation helper;
- alternate JSON key/list ordering normalizes to same digest;
- unknown methodology/prompt/shell/automatic fields fail;
- duplicate IDs/refs/gates, invalid identity/profile, missing starts/endpoints, self-edge, and cycle fail;
- valid multi-start DAG and exact required-ref parsing pass.

## 4. Add Workflow event/state/store support

Likely existing files:

```text
packages/core/src/research/types.ts
packages/core/src/research/events.ts
packages/core/src/research/reducer.ts
packages/core/src/research/store.ts
packages/core/src/research/paths.ts
packages/core/src/research/projections.ts
packages/core/src/research/status.ts
packages/core/src/research/index.ts
```

Add:

- `WorkflowInstanceId` and schema-v3 Workflow event branch;
- typed payload parser/closed aggregate relation validation;
- four typed Workflow mutations carrying transient validated definition;
- state maps/indexes and reducer branches;
- one-active-instance, current/completed-node, ref ownership, legal-edge, gate-block, and close invariants;
- deterministic `.trellis/research/quests/<quest>/workflow.json` projection and cache inventory;
- Workflow count/status additions where existing Research status exposes aggregate counts;
- public exports only through `@mindfoldhq/trellis-core/research`.

Focused tests:

```text
packages/core/test/research/workflow-store.test.ts
packages/core/test/research/store.test.ts
```

Assertions:

- mixed schema-v1/v2/v3 replay;
- exact event kinds/payloads/relations;
- bind/complete/transition/close success;
- second active bind, wrong/already-complete node, missing/foreign refs, illegal edge, missing gates, and invalid completed close are zero-write;
- completion leaves current node unchanged;
- transition alone updates current node;
- one mutation emits one event;
- idempotency replay returns prior event;
- rebuild projection is byte-stable and preserves closed history.

Do not widen schema-v1/v2 kind sets or alter historical fixture bytes.

## 5. Add exact Workflow definition resolver

New CLI file:

```text
packages/cli/src/commands/research/workflow-definition-resolution.ts
```

Implement exact project-only stable read from:

```text
.trellis/research/workflows/<id>/<version>/workflow.json
```

Reuse C2 containment/symlink/stable-file-read primitives only when this reduces duplication without changing Procedure/Skill behavior. Otherwise keep Workflow file reading narrowly separate and equivalent. No bundled/static Workflow fallback.

Tests cover absent/invalid file, symlink path/file, replacement during read, escaping segments, strict JSON, and digest mismatch against bound instance.

## 6. Add Skill inspection and lightweight Context commands

Likely files:

```text
packages/cli/src/commands/research/procedure-resolution.ts
packages/cli/src/commands/research/skill-command.ts
packages/cli/src/commands/research/index.ts
packages/cli/src/commands/research/common.ts
packages/cli/test/commands/research-skill.integration.test.ts
```

Implement minimal C2 resolver extension:

- neutral exact package inspection after full authentication;
- deterministic project/bundled candidate discovery through same inspector;
- exact/unique-version selection;
- metadata-only list/show envelopes;
- lightweight one-Skill Context with optional Quest/current-node binding;
- explicit operator invocation validation;
- root-command and managed Context refusal before instruction/member return;
- deterministic text/JSON rendering.

Tests:

- project-only, bundled-only, project shadow, invalid-project no-fallback;
- deterministic list ordering and no partial result;
- `show` omitted-version and ID-only unbound `context` unique success/ambiguity failure;
- show omits instruction/member content;
- one `SKILL.md`, default + requested permitted members only;
- omitted on-demand and forbidden root-only members;
- active node exact identity/profile enforcement;
- no next Skill/node instructions;
- operator-explicit lightweight explicit command success;
- root-command and managed Context zero-write refusal;
- no Activation/Approval/Result/Proposal/worker/provider call.

Use generic temp fixtures only. Do not ship production pilot packages.

## 7. Add Workflow commands and read models

New CLI file:

```text
packages/cli/src/commands/research/workflow-command.ts
```

Modify command registration in `packages/cli/src/commands/research/index.ts`.

Implement:

- exact C1 command tree/options;
- dedicated preview-by-default option helper without changing existing command defaults;
- `wfi_<uuid>` parser/generator;
- accepted-ref parser and canonical ordering;
- bind/complete/transition/close one-mutation execution;
- read-only status/next envelopes and stop reasons;
- stable lowercase error mapping.

Focused test:

```text
packages/cli/test/commands/research-workflow-state.integration.test.ts
```

Assertions:

- exact command/options/help surface;
- no flags previews, `--dry-run` previews, `--write` commits, both flags reject;
- preview/write output shapes;
- one event per successful write;
- active conflict, wrong node, missing/foreign ref, illegal edge, gate-required edge, and bad close errors;
- status/next use Workflow state despite conflicting `Quest.stage`;
- next reports legal choices/missing requirements and never mutates;
- no chained command, model, worker, or provider execution.

## 8. Prove zero-write and compatibility

Extend or add focused coverage around:

```text
packages/cli/test/commands/research-dry-run-zero-write.test.ts
packages/cli/test/commands/research-workflow.integration.test.ts
packages/cli/test/commands/research-procedure-resolution.integration.test.ts
packages/cli/test/utils/workflow-selection.test.ts
```

Snapshot tracked Research tree and `.trellis/.runtime/research` before/after:

- skill list/show/context;
- workflow status/next;
- bind/complete/transition/close default preview;
- all rejected Context/Workflow cases.

Historical/static assertions:

- `.trellis/.workflow.json` shape/selection unchanged;
- bundled Markdown `research` workflow still resolves unchanged;
- Procedure historical resolution and C2 digest tests remain green;
- existing Research lifecycle integration remains green.

## 9. Focused validation

Narrow commands to exact files created during implementation. Expected minimum:

```bash
pnpm --dir packages/core exec vitest run \
  test/research/workflow.test.ts \
  test/research/workflow-store.test.ts \
  test/research/store.test.ts

pnpm --dir packages/cli exec vitest run \
  test/commands/research-skill.integration.test.ts \
  test/commands/research-workflow-state.integration.test.ts \
  test/commands/research-dry-run-zero-write.test.ts \
  test/commands/research-procedure-resolution.integration.test.ts \
  test/commands/research-workflow.integration.test.ts

pnpm --dir packages/core typecheck
pnpm --dir packages/cli typecheck
pnpm --dir packages/cli lint
pnpm --dir packages/cli build
```

Then run relevant full Core/CLI suites only once after focused checks pass. Do not add another assurance campaign or unrelated audit.

## 10. Final task verification and commit

1. Run task artifact/context validation using current Trellis scripts.
2. Run `git diff --check`.
3. Run GitNexus:

```text
detect_changes({ scope: "compare", base_ref: "variant/research-workflow" })
```

Explain C3-local affected symbols/flows separately from inherited branch drift.
4. Review exact diff inventory; every changed line must trace to C3.
5. Commit through normal hooks only with required co-author trailer.
6. Do not push, release, publish, activate, invoke providers, begin C4, or migrate real Skills.
7. Archive task with `--no-commit`, then create a separate normal-hook archive commit if task workflow requires archival.

## Rollback Points

- Before any Workflow write exists: remove C3 commands/parser/state/projection code and tests.
- After schema-v3 Workflow events exist: preserve parser/reducer/projection compatibility; disable selection/commands only. Never delete or rewrite ledger history.
- If Skill inspection refactor threatens Procedure compatibility: revert to additive wrapper functions around unchanged `resolveResearchProcedure` and `resolveResearchSkillExecutionPackage` behavior.
- If static Workflow tests change: stop and remove the coupling; C3 DAG state must remain a separate Research namespace.

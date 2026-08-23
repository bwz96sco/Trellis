# C4 Scientific Gates Implementation Plan

## Authorization Boundary

Current task remains `planning`.

Do not run `task.py start`, edit product code, invoke providers, migrate Skills, start C4b/C5, commit, push, release, publish, or activate anything until user explicitly approves latest final C4 planning summary in later message.

After approval, C4 implementation may modify only canonical gate, Workflow-consumption, CLI/status, tests, and owning code-spec surfaces.

## Success Definition

C4 is complete when:

```text
completed gated node
→ explicit gate preview/write
→ append-only canonical record
→ latest same-scope effective status
→ next reports satisfaction
→ separate transition freezes satisfying record IDs
→ no execution or Quest cutover
```

All historical Research/Workflow behavior remains compatible.

## 1. Activate Exact Child

After fresh user approval:

1. Confirm current task is `.trellis/tasks/08-23-thin-skill-c4-scientific-gates`.
2. Confirm planning artifacts remain unchanged from approved summary.
3. Run task validation.
4. Run `uv run python ./.trellis/scripts/task.py start .trellis/tasks/08-23-thin-skill-c4-scientific-gates` using repository-supported syntax.
5. Confirm status becomes `in_progress`.
6. Do not activate C4b or parent task.

Stop if task routing differs or planning files materially changed after approval.

## 2. Establish Baseline and Impact

Before product edits:

1. Inspect `git status --short`; preserve unrelated files.
2. Record focused pre-change test baseline where practical.
3. Run GitNexus upstream impact for every existing symbol to be edited.
4. Report direct callers, affected execution flows, and risk.
5. If any result is HIGH or CRITICAL, warn user and stop before editing that symbol.

Minimum existing-symbol impact targets:

### Core

- `parseWorkflowTransitionRecordPayload`
- `parseResearchEvent`
- schema-v3 payload/ref/relation parsers actually selected during implementation
- `emptyResearchState`
- `applyEvent`
- `assertWorkflowDefinitionBinding`
- `buildMutationEventDraft`
- `writeResearchProjections`

### CLI

- `recordResearchWorkflowTransition`
- `getResearchWorkflowNext`
- `renderExtendedResearchResult`
- `registerResearchCommand`
- any existing argument parser or shared executor modified for gate registration

Prefer new gate-specific symbols over refactoring unrelated Workflow helpers.

## 3. Add Failing Core Contract Tests

Create/extend tests before implementation:

### `packages/core/test/research/scientific-gate.test.ts`

- parse closed H1/H2 and approve/reject values;
- reject unknown keys and malformed gate record IDs;
- preserve actor/rationale and ordered scientific refs verbatim;
- reject empty or padded refs, duplicates, overlaps, and empty total selection;
- normalize evidence IDs; reject duplicate/missing source membership;
- prove operational Approval cannot satisfy gate helper/state.

### `packages/core/test/research/scientific-gate-store.test.ts`

- reject missing/inactive/mismatched Workflow instance;
- reject incomplete current node;
- reject gate undeclared on outgoing transitions;
- reject unknown, wrong-Quest, or unaccepted evidence Artifact;
- preview validates without append;
- write appends one event;
- approve → reject → approve latest-decision behavior;
- history remains append-only;
- same gate on another instance/node cannot satisfy;
- record mutation never emits transition event;
- deterministic rebuild and `gates.json` bytes.

### Existing Core suites

Extend:

- `workflow.test.ts`: gate-record parser plus transition gate-record order preservation;
- `workflow-store.test.ts`: replace permanent C3 gate block with missing/rejected/approved behavior; retain ungated behavior;
- `events.test.ts`: schema-v3 gate kind/aggregate/relations and transition gate relations;
- `schema-v1-compatibility.test.ts`: additive empty state maps and unchanged historical projection fixtures;
- `compatibility/package-exports.test.ts`: new Research-subpath symbols only.

Tests must fail for missing C4 behavior, not for unrelated formatting.

## 4. Add Core IDs, Types, and Parsers

Implement minimum additive model:

- `ScientificGateRecordId` with `gtr_` prefix helper;
- `ScientificGateId`;
- `ScientificGateDecision`;
- `ScientificGateRecord` and payload;
- gate projection type;
- state history/effective indexes;
- exact scope-key helper;
- closed parsers/normalizers for gate ID, decision, scientific refs, evidence refs, and record payload.

Rules:

- approved/rejected refs preserve input order and exact strings;
- evidence refs normalize to unique lexical order;
- source Artifact must appear in evidence set;
- no Artifact-content parsing;
- no candidate-universe membership claim.

Export additions only through `packages/core/src/research/index.ts` and existing `/research` package subpath.

## 5. Extend Schema-v3 Event Parsing

Add:

```text
scientific-gate.recorded
scientific-gate aggregate/ref
```

Update schema-v3 kind, aggregate, payload, and relation validation together.

Assertions:

- schema-v1/v2 reject new kind;
- gate aggregate ID equals payload record ID;
- relations match Quest/instance/evidence exactly;
- source Artifact role does not duplicate relation;
- transition relations accept zero gate refs for C3 and ordered non-zero refs for C4;
- historical fixture bytes remain accepted unchanged.

Do not rename existing schema-version exports.

## 6. Add Reducer State and Projection

Extend empty state with gate maps.

Add `scientific-gate.recorded` reducer branch with full replay checks from `design.md`.

Add deterministic projection:

```text
.trellis/research/quests/<questId>/gates.json
```

Projection rules:

- records in ledger order;
- effective scopes sorted structurally;
- write only when records exist;
- update timestamp comes from gate entity sequence;
- no change to historical `workflow.json` bytes.

Update rebuild tests before proceeding.

## 7. Add Store Mutation and Transition Consumption

Add typed `scientific-gate.record` mutation branch.

Validation order:

1. exact instance/definition binding;
2. active/current/completed lifecycle;
3. outgoing gate declaration;
4. actor/rationale;
5. scientific-set integrity;
6. evidence/source Artifact ownership and completion containment;
7. event construction.

Then replace C3 unconditional gated-transition block:

- resolve effective record per required gate;
- require matching `approve`;
- collect record IDs in gate-ID order;
- append one transition event only after all gates pass.

Change transition payload parser to preserve validated input order rather than sort record IDs.

Reducer transition branch validates record existence, approval, exact instance/from-node binding, unique gate IDs, and H1-before-H2 order.

No mutation combines gate record and transition.

## 8. Add CLI Gate Commands

Create focused:

```text
packages/cli/src/commands/research/gate-command.ts
```

Implement:

- `recordResearchScientificGate(...)`;
- `getResearchScientificGateStatus(...)`;
- strict gate-specific idempotency matcher;
- gate error mapping.

Register:

```text
research gate record
research gate status
```

CLI behavior:

- derive Quest/workflow/node from instance;
- default preview;
- reject conflicting mutation flags before root resolution;
- only explicit `--write` commits;
- exact replay or conflict;
- deterministic JSON/text output;
- no Workflow/Approval/Dispatch/Skill/model/worker/provider invocation.

Add `research_gate_invalid` without changing existing error codes.

Avoid moving C3 helpers unless new-file duplication becomes materially larger than one small shared helper. If extraction becomes necessary, run fresh impact first.

## 9. Integrate Canonical Gate State into Workflow Reads

Update `workflow next`:

- derive missing gates from effective current-node state;
- surface satisfying gate-record IDs;
- retain existing stop-reason precedence;
- retain operator-selection-required when an edge is legal;
- never auto-select or execute edge.

Update transition CLI replay matcher to accept exact non-empty `gateRecordIds` produced by Core mutation.

Keep `workflow status`, bind, complete, close, and ungated transition output stable unless additive gate fields are required by tests/spec.

## 10. Add CLI Integration Tests

Create:

```text
packages/cli/test/commands/research-gate.integration.test.ts
```

Cover:

- exact command tree/options/help;
- default preview byte-tree equality;
- explicit write appends one gate event;
- `--dry-run + --write` fails before root resolution;
- malformed H1/H2 and approve/reject;
- actor/rationale failures;
- duplicate/overlapping/empty scientific refs;
- invalid evidence/source Artifact;
- incomplete/closed/stale/undeclared scope;
- exact same-key replay;
- same-key field/target/family/multi-event conflicts;
- status history and current effective records;
- latest reject/approve semantics;
- zero invocation of transition, Approval, Dispatch, Skill, model, worker, or provider paths.

Extend:

- `research-workflow-state.integration.test.ts` for gated `next`/transition and H1/H2 record order;
- `research-dry-run-zero-write.test.ts` for gate preview/status/error snapshots;
- `research.test.ts` and `research-only-surface.integration.test.ts` for command surface;
- existing ungated Workflow suite for no regression.

Use filesystem/state assertions instead of model/provider mocks because no execution path should be reachable.

## 11. Keep Code-specs Converged

Planning already updates:

- `.trellis/spec/core/backend/research-state.md`;
- `.trellis/spec/cli/backend/commands-research.md`;
- parent C4/C4b split language.

During implementation, update only if actual contract differs. Material contract change returns task to planning and requires new final summary/approval.

Required code-spec content remains:

1. Scope / Trigger
2. Signatures
3. Contracts
4. Validation & Error Matrix
5. Good/Base/Bad Cases
6. Tests Required
7. Wrong vs Correct

## 12. Focused Verification

Run exact focused files after implementation:

```bash
pnpm --dir packages/core exec vitest run \
  test/research/scientific-gate.test.ts \
  test/research/workflow.test.ts \
  test/research/workflow-store.test.ts \
  test/research/events.test.ts \
  test/research/schema-v1-compatibility.test.ts \
  test/compatibility/package-exports.test.ts

pnpm --dir packages/cli exec vitest run \
  test/commands/research-gate.integration.test.ts \
  test/commands/research-workflow-state.integration.test.ts \
  test/commands/research-dry-run-zero-write.test.ts \
  test/commands/research.test.ts \
  test/cli/research-only-surface.integration.test.ts

pnpm --dir packages/core typecheck
pnpm --dir packages/cli typecheck
pnpm --dir packages/cli lint
pnpm --dir packages/cli build
```

If implementation chooses different exact test filenames, update this plan before final check without widening scope.

## 13. Full Verification

After focused green:

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis test
pnpm typecheck
pnpm lint
pnpm build
git diff --check
```

Also run task artifact validation and packed/public-export checks affected by new Core Research exports.

No paid/provider test belongs here.

## 14. Independent Check and Change Detection

Dispatch one independent `trellis-check` after implementation and focused tests. Checker may fix C4-local defects only; no scope expansion.

Before commit:

1. Run GitNexus `detect_changes({scope: "compare", base_ref: "variant/research-workflow"})`.
2. Separate inherited branch-wide CRITICAL output from C4-local symbol/process impact.
3. Verify every changed product symbol maps to approved C4 design.
4. Verify no provider, source Skill, Quest cutover, C4b/C5, or live binding path changed.
5. Verify `AGENTS.md` and `CLAUDE.md` remain excluded from task staging/commit.

## 15. Commit Boundary

After all checks pass:

- stage C4 task/spec/product/test files only;
- preserve unrelated worktree changes;
- use normal hooks only;
- do not bypass hooks;
- if protected-file hooks require HEAD bytes, use prior proven exact private backup/restore flow; never use shared bare stash;
- restore hook-generated unrelated evidence drift before commit;
- commit one C4 implementation boundary with required co-author trailer;
- archive task in separate normal-hook commit only if repository workflow requires same pattern as C3;
- no push, release, publication, provider execution, or Activation.

Stop after C4 commit/archive. Do not start C4b automatically.

## Rollback Points

### Before first gate event

Remove new command/event/state/projection/transition changes and tests.

### After gate events exist

Preserve event parser, reducer, state, transition refs, and projection. Disable new recording only. Never rewrite ledger.

### If candidate-universe validation becomes required during C4

Stop. Do not parse Artifact/source bytes. Return to planning and move canonical candidate mapping into C4b.

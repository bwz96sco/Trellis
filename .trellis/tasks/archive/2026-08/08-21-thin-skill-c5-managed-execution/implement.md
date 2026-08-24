# C5 Managed Research Skill Execution Implementation Plan

## Authorization Boundary

Current task remains `planning`.

Planning artifacts may be edited and validated now. Do not run `task.py start` or edit product code until user explicitly approves this latest C5 planning summary in a subsequent message.

After approval, all necessary C5 Trellis changes are authorized. Record HIGH/CRITICAL impacts for consolidated later review; do not repeatedly pause for per-symbol permission. Do not invoke a provider/worker, modify `agent-skills-private`, start C6/C7, push, release, publish, or activate production packages.

## Success Definition

```text
same immutable Skill bytes
-> exact explicit managed selection
-> package-neutral capability/policy authority
-> execution-package Activation + Approval
-> schema-v3 approved Context with bounded members
-> existing Result + pending Proposal + Approval consumption
-> Workflow unchanged
-> explicit managed node completion
-> separate operator transition
```

## 1. Activate Exact Child

After fresh approval:

1. Confirm current task is `.trellis/tasks/08-21-thin-skill-c5-managed-execution`.
2. Confirm `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` match approved summary.
3. Validate task artifacts.
4. Run:

```bash
uv run python ./.trellis/scripts/task.py start \
  .trellis/tasks/08-21-thin-skill-c5-managed-execution
```

5. Confirm status becomes `in_progress`.
6. Do not activate parent, C6, or C7.

## 2. Establish Baseline and Impact Inventory

1. Inspect `git status --short`; preserve unrelated `AGENTS.md`, `CLAUDE.md`, submodule state, `.trellis/worktrees/`, research evidence, and every unrelated path.
2. Run focused existing Dispatch/Activation/Context/Result and Workflow tests before edits.
3. Before editing every existing function/class/method, run GitNexus upstream impact analysis.
4. Record direct callers, affected processes, and risk for later consolidated review.
5. Under current goal, HIGH/CRITICAL findings are warnings and evidence, not repeated stop points. Stop only if impact reveals scope outside C5 authority or a new user-owned product decision.

Minimum likely targets:

### Core

- `resolveResearchEffectiveAuthority`
- `evaluateResearchAutomaticEligibility` only if signature adaptation is required
- `parseResearchEvent` and schema-v3 Activation/Approval parsers if managed binding changes event schema
- `applyEvent` and Activation/Approval clone/reducer helpers
- `buildMutationEventDraft`
- Workflow `workflow.node.complete` construction/validation
- package-neutral Activation/Approval binding helpers

### CLI

- `resolveDispatchActivationCandidate`
- `activationFromCandidate`
- `revalidateDispatchActivationBindings`
- `revalidateDispatchActivationStaged`
- `prepareResearchDispatch`
- `planResearchActivation`
- Approval grant/selection relation helpers
- `resolveApprovedResearchDispatchContext`
- approved Result preflight/recording path
- `completeResearchWorkflowNode`
- `registerResearchCommand`

Prefer additive package-neutral helpers and discriminated branches. Do not refactor unrelated Procedure methodology code.

## 3. Add Failing Core Contract Tests

Create focused tests before product changes.

### Managed Activation binding

Cover:

- exact execution-package identity plus required `managedExecution`;
- normalized unique sorted member paths;
- optional all-or-none Workflow binding;
- opposite/unknown field rejection;
- mixed historical/new ledger replay;
- deep-clone/freeze and deterministic projection/materialization.

### Package-neutral authority

Cover:

- Skill managed capability match;
- existing capability/project-policy ceiling;
- no network/cost/canonical mutation/chaining widening;
- automatic eligibility remains conservative;
- historical Procedure authority outputs remain identical.

### Approval binding

Cover:

- execution-package grant digest;
- legacy Procedure grant digest;
- mixed variant/digest mismatch;
- expiry/revoke/consume behavior unchanged.

### Managed Workflow completion

Cover:

- Core mutation accepts explicit `managed` only when node permits it;
- node event freezes exact node package identity;
- lightweight behavior unchanged;
- invalid current node, profile, identity, accepted refs, or duplicate completion fails before append;
- transition remains separate.

## 4. Add Managed Binding Types and Schemas

Modify minimum Core surfaces:

- add `ManagedExecutionWorkflowBinding` and `ManagedExecutionBinding`;
- require `managedExecution` on `ExecutionPackageActivation` only;
- add schema validation and clone helpers;
- update event parse/reducer/store tests together;
- preserve schema-v2 Procedure event accepted language exactly;
- export new public types/helpers only through `@mindfoldhq/trellis-core/research`.

Do not change historical event bytes, Procedure fields, root package exports, Workflow definition schema, scientific gate payloads, or Quest cutover state.

## 5. Generalize Effective Authority

Refactor `ResearchEffectiveAuthority` minimally so package identity is discriminated while existing authority fields remain.

Implementation shape:

1. Extract capability/project-policy ceiling calculation from Procedure-specific manifest inputs.
2. Keep existing `resolveResearchEffectiveAuthority({ capabilityId, procedure, policy })` compatibility wrapper if callers/tests require it.
3. Add package-neutral Skill authority resolution using exact Skill manifest and normalized identity.
4. Require manifest managed capability equals selected capability.
5. Keep automatic eligibility evaluator unchanged where possible.
6. Add fixed historical Procedure output assertions before/after refactor.

## 6. Generalize Dispatch Candidate Resolution

Update `dispatch-authority.ts` around one discriminated candidate.

### Procedure branch

- preserve registry-current resolution;
- preserve activation-recorded revalidation;
- preserve current errors and failure order.

### Skill branch

- consume exact CLI Skill/version/member/Workflow selection;
- resolve through `resolveResearchSkillExecutionPackage` with managed worker audience;
- authenticate full inventory and expected identity;
- derive capability from manifest, compare optional CLI capability when supplied;
- reuse current hierarchy, Repository, Artifact, write-path, request-digest, scope-hash, policy, and automatic-eligibility checks;
- validate Workflow instance/node binding;
- create execution-package Activation with normalized managed binding.

No resolver may search host-native Skills or mutable source repository paths.

## 7. Extend Dispatch Prepare CLI

Add options only to existing `dispatch prepare` registration:

```text
--skill <id>
--skill-version <version>
--member <path>                 repeatable
--workflow-instance <id>
--workflow-node <node>
```

Validation occurs before mutation planning:

- Skill/version pair;
- member only with Skill;
- Workflow instance/node pair;
- Workflow binding only with Skill in C5;
- no changed behavior when all new options are absent.

Replay classification must compare canonical Activation package identity, managed member selection, and Workflow binding. Same key with another selection is `IDEMPOTENCY_KEY_CONFLICT`.

Do not add a new `dispatch skill-*` command or change `owner-skill` compatibility metadata.

## 8. Generalize Activation and Approval Lifecycle

Update:

- activation materialization to write either union branch exactly;
- plan-activation behavior for historical Dispatches without changing existing Procedure selection;
- grant creation to emit the correct digest field;
- active-same-host and relation checks through package-neutral digest helpers;
- automatic/interactively approved paths;
- revoke/replay/recovery behavior.

C5 exact Skill selection occurs during new `prepare`. Historical `plan-activation` remains Procedure-compatible unless implementation evidence proves a safe exact package selector is required; do not silently infer a Skill from `ownerSkill`.

## 9. Generalize Staged Revalidation

Preserve existing staged precedence and no-partial-context behavior.

For Skill Activations:

1. reread canonical request/materialization;
2. resolve exact recorded identity project-first with no fallback on invalid project package;
3. validate manifest profile/entrypoint/capability;
4. reselect exact recorded member paths;
5. validate full inventory and member bytes;
6. validate optional canonical Workflow binding/current node;
7. validate policy, request digest, and scope hash;
8. return one package-neutral staged candidate.

Add replacement-during-read and drift tests where existing resolver seams support them.

## 10. Add Context Schema v3

Extend `dispatch-approved-context.ts` additively:

- retain v1/v2 interfaces and output snapshots;
- add `NormalizedResearchWorkerInputV3` from `design.md`;
- make `requireActivation` return the union;
- generalize activation/approval relation checks;
- branch Context projection by candidate package kind;
- map only resolved requested worker-visible Skill members;
- include optional exact Workflow binding;
- deep-freeze complete Context;
- keep package roots and source paths absent.

Add Context tests for:

- empty member set;
- exact requested set/order/content/digest;
- root-only/undeclared/unrequested/drift rejection;
- project invalid no fallback;
- root-command and missing-managed-profile refusal;
- operator-explicit exact selection;
- Claude/Codex parity;
- no model/provider/worker launch.

## 11. Generalize Approved Result Recording

Remove Procedure-only rejection only after package-neutral preflight exists.

- locate exact execution-package Activation and Approval;
- repeat staged package/Workflow/policy/request/scope revalidation;
- preserve strict derived output IDs and atomic Result/Proposal/consume mutations;
- apply methodology closure validation only to historical applicable Procedures;
- preserve same-key replay and projection repair;
- assert Workflow projections remain byte-identical before/after Result recording.

Do not add Skill-specific Result/Proposal schemas unless existing generic contracts cannot represent required output. Current expectation: no new output type.

## 12. Add Managed Workflow Completion

Keep CLI signature unchanged.

1. Parse accepted refs.
2. Resolve canonical Workflow instance/definition/current node.
3. If no Result ref: construct existing lightweight completion.
4. If Result ref exists:
   - resolve Result -> Dispatch -> Activation -> consumed Approval;
   - verify exact output-ID and relation chain;
   - derive normalized package identity;
   - require identity equals node identity;
   - require optional Activation Workflow binding equals current instance/node/digest;
   - require every managed Result ref shares same identity/binding;
   - construct managed completion.
5. Add `executionProfile` to Core mutation and validate node profile independently.
6. Replay classifier compares exact derived profile and refs.
7. Return after completion; never call transition.

Integration sequence test:

```text
record Result/Proposal -> current node unchanged
workflow complete      -> node completed, still no transition
workflow transition    -> current node advances
```

## 13. Worker and Host Contract Verification

Inspect generated Claude/Codex worker adapters and contract fixtures.

- change only shared normalized input parsing if schema-v3 is rejected;
- preserve authority ceiling and derived output IDs;
- forbid package discovery, filesystem package reads, nested agents, Dispatch launch, capability chaining, Workflow/gate mutation, and Result recording;
- no real host/provider execution.

If current generic workers already pass schema-v3 payload transparently, add tests only; do not edit templates speculatively.

## 14. Packaging and Public Exports

- export new Core types/helpers through Research subpath only;
- keep root barrel unchanged;
- retain manifest-derived packed audit;
- use test-only schema-v3 Skill fixtures;
- do not add production package bytes under CLI templates in C5;
- verify extracted tarball includes changed runtime files and no accidental source/task artifacts.

## 15. Independent Quality Check

Dispatch `trellis-check` after implementation with active task path first. Review against `prd.md`, `design.md`, `implement.md`, and context manifests.

Required review dimensions:

- one lifecycle/no second registry;
- historical Procedure compatibility;
- exact package/member/Workflow replay;
- Approval authority and staged error precedence;
- Context byte/member/host parity;
- worker proposal-only ceiling;
- Result/Workflow separation;
- no provider/C6/C7/external changes.

Fix in-scope defects found. Avoid broad adjacent refactors or optional hardening.

## 16. Verification

Focused commands must be adjusted to exact files created/changed, then include at least:

```bash
pnpm --dir packages/core exec vitest run \
  test/research/execution-package.test.ts \
  test/research/activation-approval.test.ts \
  test/research/store.test.ts \
  test/research/workflow.test.ts

pnpm --dir packages/cli exec vitest run \
  test/commands/research-procedure-resolution.integration.test.ts \
  test/commands/research-procedure-historical-resolution.test.ts \
  test/commands/research-dispatch*.test.ts \
  test/commands/research-workflow*.test.ts \
  test/scripts/packed-cli-audit.test.ts

pnpm --dir packages/core typecheck
pnpm --dir packages/core lint
pnpm --dir packages/core build
pnpm --dir packages/cli typecheck
pnpm --dir packages/cli lint
pnpm --dir packages/cli build
```

Then run:

- complete Core suite;
- complete CLI suite;
- historical Procedure `1.0.0` and recorded `2.0.4`–`2.0.7` replay suites;
- C3 Workflow regressions;
- C4/C4b gate/Quest regressions;
- package exports and root-non-leak tests;
- real `pnpm pack` plus packed audit;
- task manifest validation;
- Prettier/check formatting used by project;
- `git diff --check`.

Use `NODE_OPTIONS=''` when stale inherited Node preload state appears. Do not bypass hooks or tests.

## 17. Code-Spec Update

After implementation, update executable contracts with full seven-section depth:

- `.trellis/spec/core/backend/research-state.md`
  - managed binding types/schema/events;
  - package-neutral authority;
  - managed Workflow completion relation;
  - compatibility/error/tests.
- `.trellis/spec/cli/backend/commands-research.md`
  - Dispatch prepare Skill options;
  - selection/replay/errors;
  - managed completion derivation and command separation.
- `.trellis/spec/cli/backend/research-worker-hooks.md`
  - exact schema-v3 Context implemented shape;
  - host/worker authority and member projection.
- unit-test spec only if implementation establishes a genuinely reusable new fixture rule.

## 18. GitNexus Change Detection

Before commit:

1. Run local changed-symbol detection.
2. Run compare scope against:

```text
variant/research-workflow
```

3. Separate C5-local symbols/flows from inherited branch-wide changes.
4. Record HIGH/CRITICAL central symbols for later consolidated review.
5. Confirm every changed line traces to C5.

Do not treat stale/UNKNOWN index output as proof of safety; rely on focused/full tests and manual diff scope too.

## 19. Commit, Archive, Journal

1. Preserve unrelated `AGENTS.md` and `CLAUDE.md` exact bytes and exclude them from staging.
2. Restore any test-generated unrelated evidence drift before staging.
3. Stage exact C5 product/tests/spec/task paths only.
4. Commit through normal hooks. No `--no-verify`, `HUSKY=0`, test-skip env, amend, reset, rebase, squash, clean, or shared stash.
5. Commit message ends with:

```text
Co-Authored-By: Claude <noreply@anthropic.com>
```

6. If hooks exceed Bash timeout, use persistent tmux and capture the completion marker; do not bypass hooks.
7. Archive C5 with `task.py archive --no-commit`, then make exact normal-hook archive commit with trailer.
8. Record journal with product commit hash, archive result, verification, HIGH/CRITICAL impact list, and explicit no-provider/no-C6/no-push boundary; commit journal with normal hooks and trailer.
9. Stop before C6.

## Rollback Points

- Before Activation append: remove C5 branches; historical Procedure path remains.
- After execution-package Activation/Approval: preserve events and disable new Skill selection; never rewrite ledger.
- After Result/Proposal: preserve canonical output and Proposal review state; no Workflow state was implicitly changed.
- After managed node completion: preserve completion and require explicit transition/closure; never delete history.

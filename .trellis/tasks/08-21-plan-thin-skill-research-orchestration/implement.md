# Thin-Skill Research Orchestration Implementation Plan

## Planning Boundary

This file defines future implementation. Current task remains `planning`. Do not run `task.py start`, edit product code, migrate source skills, activate packages, or run paid/provider work until the user approves the final planning summary in a subsequent message.

## Recommended Task Split

After planning approval, create one implementation parent and independently verifiable children:

1. **C1 — Freeze contracts, mappings, and source baseline**
2. **C2 — Generalize execution-package identity and resolver**
3. **C3 — Add DAG workflow state and lightweight Context**
4. **C4 — Add scientific gates and coordinated Quest cutover**
5. **C5 — Integrate managed execution profile**
6. **C6 — Migrate pilot packages**
7. **C7 — Run A/B/C pilot and decide migration**

Do not implement all children in one task. Each child owns its tests, specs, commit, and rollback boundary.

## C1 — Freeze Contracts, Mappings, and Source Baseline

### Work

- Require the source-skill repository to provide either:
  - a clean commit containing the intended simplified Research skill state; or
  - an explicit authenticated snapshot with exact file inventory and digests.
- Exclude unrelated host-link, README, and external-specialist changes from the pilot baseline.
- Freeze pilot inputs for:
  - `research-literature`;
  - `research-ideation`;
  - `research-idea-evaluation`;
  - `research-quest` read contract;
  - `research-quest-admin` preview/write and migration contract;
  - shared H1/H2 validator and templates.
- Record current explicit-only/model-selectable inventory.
- Freeze one normalized execution-package identity contract covering historical Procedure schema v1/v2 and new thin-skill schema v3. Decide additive Activation/event fields here; C5 must not reopen package identity.
- Freeze DAG workflow-instance event contracts: bind, node complete, operator transition, close, one active instance per Quest.
- Freeze canonical scientific gate event contract and evidence-ref rules.
- Freeze complete Quest source mapping, blocking/unmappable behavior, export reconstruction, authority projection, and source-admin pre-write refusal protocol.
- Keep invocation source, execution profile, and entrypoint type as separate enums/contracts.
- Write executable code-specs before cross-layer implementation. Required sections:
  1. Scope / Trigger
  2. Signatures
  3. Contracts
  4. Validation & Error Matrix
  5. Good/Base/Bad Cases
  6. Tests Required
  7. Wrong vs Correct

### Verify

- source snapshot is immutable and reproducible;
- every imported file is inside the approved inventory;
- no source working-tree ambient read remains in later children;
- one normalized package/replay contract is complete and testable;
- every source Quest field has canonical target, blocking rule, or namespaced preservation rule;
- source-admin refusal occurs before any filesystem mutation;
- planning diff contains no product code.

### Stop conditions

- source skill bytes still changing without a selected baseline;
- H1/H2 templates or validators are missing from the frozen inventory;
- baseline includes unrelated dirty files;
- package ownership cannot be determined;
- normalized Activation/replay identity remains ambiguous;
- any Quest field lacks explicit import/export treatment;
- source admin cannot observe a committed Trellis authority projection before writes.

## C2 — Generalize Execution-Package Identity and Resolver

### Work

- Run GitNexus impact analysis before editing each existing symbol in:
  - `packages/core/src/research/procedure-policy.ts`;
  - `packages/core/src/research/stage-capabilities.ts` if required;
  - `packages/core/src/research/types.ts` and event schema only when C1 requires additive normalized identity fields;
  - `packages/cli/src/commands/research/procedure-resolution.ts`;
  - package-copy and packed-inventory surfaces.
- Generalize existing Procedure parser/resolver into one execution-package resolver. Do not add an independently replayed skill registry.
- Preserve historical Procedure schema v1/v2 bytes, resolution modes, and recorded Activation interpretation.
- Add thin-skill schema v3 with immutable normalized identity: ID, version, schema version, package digest, instruction digest, and member inventory digest.
- Add separate `invocationSource`, `entrypointType`, and `allowedProfiles` validation.
- Add digest-bound default/on-demand/root-only members.
- Add project-first, fail-closed resolution.
- Add new managed Activation identity fields now if C1 proved legacy Procedure-named fields ambiguous. C5 only consumes this identity.
- Do not change live capability selection until pilot packages and compatibility tests are ready.

### Tests

- exact valid schema-v3 skill parse and normalized identity;
- invalid/missing manifest or instruction file;
- duplicate, absolute, escaping, symlink-resolved, undeclared, or wrong-visibility member;
- on-demand member omitted by default;
- operator-explicit package rejected from model invocation;
- root-command package rejected from model Context/profile selection;
- unsupported profile rejected;
- project-invalid package fails closed;
- package byte change under same version produces digest mismatch;
- lightweight and managed resolution expose identical instruction digest;
- new managed Activation binds exact normalized identity;
- historical Procedure 1.0.0 and 2.0.7 recorded activations still resolve through unchanged historical interpretation.

### Focused validation

```bash
pnpm --dir packages/core exec vitest run test/research/stage-capabilities.test.ts
pnpm --dir packages/cli exec vitest run \
  test/commands/research-procedure-resolution.integration.test.ts \
  test/commands/research-procedure-historical-resolution.test.ts
pnpm --dir packages/core typecheck
pnpm --dir packages/cli typecheck
```

### Rollback

- remove new package selection/resolution while leaving legacy Procedure resolution untouched;
- no canonical Research state migration occurs in this child.

## C3 — DAG Workflow State and Lightweight Context

### Work

- Run GitNexus impact before editing workflow resolver, Research event/reducer/projection, and CLI command symbols.
- Add strict versioned DAG schema; reject cycles, embedded prompt/methodology fields, shell sequences, and auto-invocation declarations.
- Add canonical workflow-instance events/projection before exposing routing reads:
  - bind exact workflow ID/version/digest and start node;
  - complete exact current node with normalized execution-package/profile/result refs;
  - record separately selected legal transition with gate refs;
  - close/supersede instance;
  - allow at most one active instance per Quest.
- Add deterministic preview/write commands for workflow bind, complete, transition, and close.
- Add read-only `workflow status` and `workflow next` only after projection exists; never infer current node from coarse Quest stage.
- Add read-only `research skill list`, `show`, and `context` commands with `--json` output.
- Assemble lightweight Context from one normalized package, one active node when bound, minimal Quest projection, and explicitly requested members.
- Keep lightweight Context zero-write and enforce one-node stop.
- Defer Claude/Codex slash-command wrappers to a later UX task.

### Tests

- one skill only in Context;
- unused package members and next-stage instructions absent;
- model-selectable package allowed; operator-explicit and root-command packages rejected from model Context;
- DAG cycle and embedded methodology rejected;
- second active workflow binding for one Quest rejected;
- node completion requires exact current node and accepted refs;
- illegal or unselected transition rejected;
- missing H1/H2 returns stop reason;
- one-node completion never auto-selects or executes next node;
- bind/complete/transition preview writes nothing; explicit write appends expected events atomically;
- status/next reconstruct exact workflow instance and package identity from projection;
- lightweight Context produces no Research ledger write;
- no slash-wrapper generation in pilot output.

### Focused validation

```bash
pnpm --dir packages/cli exec vitest run test/commands/research-*.test.ts
pnpm --dir packages/cli typecheck
pnpm --dir packages/cli lint
pnpm --dir packages/cli build
```

Narrow the wildcard to exact new/focused test files before implementation commit.

### Rollback

- before any workflow write: remove new command registration and schema selection; static existing Research workflow remains available;
- after workflow events exist: preserve ledger/history and disable new selection only; never delete recorded instance state.

## C4 — Scientific Gates and Coordinated Quest Cutover

### Work

- Run GitNexus impact before modifying Research entity, schema, reducer, store, projection, and Quest command symbols.
- Add canonical scientific gate event/entity distinct from Approval.
- Add structural H1/H2 validation: explicit decision, actor/rationale, approved/rejected refs, evidence binding, workflow-instance/node/gate binding, and approved-set containment.
- Keep `opportunity_board.md`, `ideas.md`, and attacks as evidence. Do not require duplicate H1/H2 decision Markdown after cutover; support it only as import/export projection.
- Add `research gate record` preview/write command; forbid transition or next-node execution in same command.
- Implement C1 Quest field mapping exactly, including route state, source extensions, Claim/Artifact creation, reviewed milestone import, scalar legacy text, and blocking conflict behavior.
- Add `research quest import` and `export` preview/write commands with exact source digest, preview token/idempotency key, and round-trip loss report.
- On import write, atomically append canonical events and committed Trellis authority projection.
- Update real source `research_quest_admin.py` mutating entrypoints to read that authority projection and refuse before filesystem mutation while Trellis owns writes.
- Keep source read-only validation/status available.
- Define explicit export/validation/authority-transfer rollback.

### Tests

- H1/H2 distinct from operational Approval and canonical in ledger;
- gate preview is zero-write; write requires explicit intent and idempotency key;
- empty/inferred/mixed decision rejected;
- gate write does not transition; evaluation remains unavailable until separately selected transition after recorded H2;
- imported/exported decision Markdown is projection only, not second canonical decision;
- import preview performs no write and reports mapping/conflicts/loss;
- every schema-0.2 source field maps or preserves under namespaced extension;
- unknown stage/status, malformed reviewed event, missing owner, conflicting active owner, or escaping path fails closed;
- import write creates canonical Quest/route/Claim/Artifact/milestone projection and authority record atomically;
- repeated import is idempotent or conflicts deterministically;
- real source admin `init`, `migrate`, `status --write`, and `append-event --write` refuse before mutation under Trellis authority; fixture filesystem snapshot remains byte-identical;
- source read-only validate/status still work;
- export/import round-trip passes source validators before explicit rollback transfer.

### Focused validation

```bash
pnpm --dir packages/core exec vitest run test/research
pnpm --dir packages/cli exec vitest run test/commands/research-quest*.test.ts
pnpm --dir packages/core typecheck
pnpm --dir packages/cli typecheck
```

### Rollback

- before import write: remove command/schema additions with no state effect;
- after import write: preserve canonical state, export verified source snapshot, record explicit authority transfer, then disable Trellis writer. Never delete ledger events.

## C5 — Managed Execution Profile

### Work

- Run GitNexus impact before editing Dispatch, Activation, approved Context, worker, and recording symbols.
- Consume normalized execution-package/Activation identity finalized in C2; do not introduce another package type or replay path.
- Reuse existing capability and project policy authority.
- Reuse existing Dispatch/Activation/Approval/Result/Proposal/Decision lifecycle.
- Keep worker proposal-only and no-nested-skill boundaries.
- Ensure managed worker Context contains the same `SKILL.md` bytes and normalized identity used by lightweight profile plus only approved members.
- Bind workflow instance/current node when managed execution belongs to a workflow; Result acceptance and node completion remain separate root actions.
- Preserve historical activation replay.

### Tests

- lightweight and managed resolve identical normalized package and instruction digest;
- managed Context includes approved package members only;
- exact capability/profile/workflow-node mismatch rejected;
- existing Approval authority checks remain active;
- Result/Proposal atomic recording unchanged;
- Result recording does not auto-complete node or select transition;
- worker cannot invoke another skill/workflow/Dispatch;
- historical 1.0.0 and 2.0.7 activations remain valid;
- Claude/Codex parity;
- packed npm template inventory contains the new package surface.

### Focused validation

```bash
pnpm --dir packages/cli exec vitest run \
  test/commands/research-procedure-resolution.integration.test.ts \
  test/commands/research-procedure-historical-resolution.test.ts \
  test/commands/research-dispatch*.test.ts
pnpm --dir packages/core test
pnpm --dir packages/cli typecheck
```

Use exact focused files after implementation discovery; avoid dedicated dormant-2.0.7 assurance lanes for pilot packages.

### Rollback

- remove managed mapping for pilot skill versions;
- fall back to existing current 1.0.0 capability resolution;
- retain all canonical events already recorded.

## C6 — Migrate Pilot Packages

### Work

Import only the frozen baseline.

#### `research-literature`

- short instructions;
- model invocation;
- lightweight and managed profiles;
- note template on demand;
- no mandatory HTML/manifest/report pack;
- evaluate current clean-subagent-per-paper rule rather than copying it as universal dispatch policy.

#### `research-ideation`

- short bounded generation contract;
- model invocation;
- normal and Quest-governed inputs;
- canonical H1/H2 gate refs only when workflow state requires them; `opportunity_board.md` and `ideas.md` remain evidence;
- no mandatory duplicate H1/H2 decision Markdown after cutover;
- one portfolio then stop;
- evaluation instructions excluded.

#### `research-idea-evaluation`

- explicit invocation;
- managed profile for pilot closure;
- candidate-specific independent attacks;
- structural closure validator;
- selected-or-blocked result;
- experiment handoff only for selected closure.

#### `research-quest-admin`

- operator-explicit deterministic root-command;
- no lightweight or managed model profile;
- preview/write import, export, and authority transfer;
- no worker Dispatch mapping;
- coordinated source-admin refusal remains part of cutover, not an optional compatibility follow-up.

### Tests

- package manifests and exact inventories;
- source skill instruction fidelity without deleted heavy pack content;
- source validators/templates packaged or replaced by deterministic Trellis commands;
- no repository-relative dependency on `scripts/validate-research-gates.py`;
- default artifact contracts remain compact;
- handoffs name next owner and stop;
- explicit-only/model invocation parity.

### Rollback

- remove pilot package selection;
- retain source skill repo and source baseline unchanged;
- no full migration or source skill deletion.

## C7 — A/B/C Pilot and Migration Decision

### Work

Run representative real tasks:

- bare model;
- frozen source skill;
- Trellis package with intended profile.

Minimum observation:

- at least three representative cases for each pilot boundary;
- at least ten total real invocations; elapsed time cannot substitute for cases;
- record output quality, completion, wall-clock, token/context use, artifact count, user correction, rework, missed gates, replay identity, writer authority, and recovery behavior.

Do not use paid/provider calls without separate authorization.

### Pass conditions

- no critical semantic or authority regression;
- lightweight literature adds no mandatory model call, Approval round, subagent, or durable artifact compared with source skill;
- ideation stops before evaluation; no command automatically selects or executes next stage;
- H1/H2 remain human scientific gates and canonical gate events do not duplicate operational Approval;
- evaluation remains explicit and closes selected-or-blocked;
- managed interruption recovery restores exact workflow instance/node/package state;
- Quest has one enforced writer, including real source-admin refusal;
- lightweight and managed replay identity/instruction digest match;
- user judges overhead acceptable on real work.

### Fail disposition

- preserve honest results;
- any missed H1/H2, dual writer, automatic next-stage execution, replay identity drift, or critical scientific/authority regression blocks migration immediately;
- for non-zero-tolerance quality variation, identify repeated root failure rather than isolated preference variance;
- adjust only the failing layer: skill content, command, workflow, or control plane;
- do not expand to full migration.

### Final decision

Choose one:

- migrate next bounded skill group;
- retain pilot only;
- narrow managed usage;
- revert package selection and keep source skills external.

## Cross-Child Validation

Before every implementation commit:

1. start from expected task and clean/understood status;
2. run GitNexus impact before symbol edits;
3. run focused tests;
4. run relevant package typecheck/lint/build;
5. run task/schema and `git diff --check` validation;
6. run GitNexus `detect_changes({scope: "compare", base_ref: "variant/research-workflow"})`;
7. inspect affected symbols/processes;
8. commit through normal hooks only;
9. authenticate changed path scope and final status.

Final full validation after C6 before pilot execution:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

No push, publication, release, Procedure 2.0.7 activation, or formal T6/T7 assurance work belongs to this plan.

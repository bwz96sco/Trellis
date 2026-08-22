# C3 DAG Workflow State Design

## 1. Boundary

C3 adds deterministic routing and read-only one-Skill Context around C2 execution packages.

```text
exact Skill / Workflow files
  -> strict authentication + parsing
  -> zero-write inspection or one typed Workflow mutation
  -> append-only Research event
  -> pure replay state
  -> deterministic per-Quest projection
```

C3 never runs a model, launches a worker, records H1/H2, changes Quest writer authority, or migrates real source Skills.

## 2. Workflow Definition

### 2.1 Location and resolution

Project-only pilot layout:

```text
.trellis/research/workflows/<workflow-id>/<version>/workflow.json
```

Resolution is exact. No bundled fallback, host discovery, alias, case folding, or `latest`. The existing `packages/cli/src/utils/workflow-resolver.ts` and `.trellis/.workflow.json` continue to own static Trellis installation/session Workflow selection and are not reused as DAG state.

### 2.2 Core contract

Use the C1-frozen shape:

```ts
interface ResearchWorkflowDefinitionV1 {
  schemaVersion: 1;
  id: string;
  version: string;
  startNodeIds: string[];
  nodes: Array<{
    id: string;
    executionPackage: ResolvedExecutionPackageIdentity;
    allowedProfiles: Array<"lightweight" | "managed">;
    stop: boolean;
  }>;
  transitions: Array<{
    id: string;
    fromNodeId: string;
    toNodeId: string;
    requiredRefs: string[];
    requiredGateIds: Array<"H1" | "H2">;
  }>;
}
```

Identifiers use the existing lowercase slug policy. Versions use exact SemVer without build metadata. `requiredRefs` use the same exact encoding as CLI accepted refs:

```text
result:<res_uuid>
artifact:<art_uuid>
```

Parsing rejects duplicate JSON keys, unknown fields at every level, malformed identities, duplicate IDs/refs/gates, empty starts/nodes, missing endpoints, self-edges, cycles, and `stop: false`. Node `allowedProfiles` is non-empty and canonicalized to `lightweight`, then `managed`.

For C3, `stop: true` means every node invocation/completion stops and returns control to the operator. It does not mark a terminal node. A node is terminal only when no transition leaves it.

Arrays whose order has no routing meaning are normalized by ID/value before digesting. This prevents source key/list ordering from creating different semantic digests.

Digest:

```text
sha256(
  UTF8("trellis-research-workflow-definition-v1\0")
  || UTF8(stableResearchJson(normalizedDefinition))
)
```

The definition parser returns a deep-frozen normalized definition plus `workflowDigest`. Existing ID/version bound to another digest fails closed when compared with a binding/event.

### 2.3 Responsibility split

- Core `workflow.ts`: strict parser, normalization, digest, graph validation, ref parser/serializer, pure transition/closure checks.
- CLI `workflow-definition-resolution.ts`: exact contained non-symlink project file read and stable-read checks.
- Store mutation validation: checks definition digest plus current canonical state before emitting one event.
- Reducer: checks event/state consistency and reconstructs state without filesystem or model calls.

Workflow definition bytes remain external immutable control-plane input, analogous to exact execution-package bytes. Events carry exact ID/version/digest and edge/package facts needed for durable history.

## 3. Canonical Types and Events

### 3.1 IDs and state

```ts
type WorkflowInstanceId = `wfi_${string}`;

type WorkflowStatus =
  | "active"
  | "completed"
  | "blocked"
  | "cancelled"
  | "superseded";

interface ResearchWorkflowInstance {
  workflowInstanceId: WorkflowInstanceId;
  questId: QuestId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  startNodeId: string;
  currentNodeId: string;
  status: WorkflowStatus;
  boundAt: string;
  nodeCompletions: Record<string, WorkflowNodeCompletePayload>;
  transitions: WorkflowTransitionRecordPayload[];
  closure?: WorkflowClosePayload;
  updatedAt: string;
}
```

Extend `ResearchState` additively:

```ts
workflowInstances: Record<WorkflowInstanceId, ResearchWorkflowInstance>;
workflowInstanceIdsByQuestId: Partial<Record<QuestId, WorkflowInstanceId[]>>;
activeWorkflowByQuestId: Partial<Record<QuestId, WorkflowInstanceId>>;
```

`workflowInstanceIdsByQuestId` preserves bind order. `activeWorkflowByQuestId` contains only `status: "active"`. Status lookup returns active instance first; otherwise latest bound closed instance.

### 3.2 Event schema

Historical schema-v1/v2 kinds stay closed. Add event schema version 3:

```ts
type ResearchSchemaV3EventKind =
  | "workflow.bound"
  | "workflow.node_completed"
  | "workflow.transition_recorded"
  | "workflow.closed";
```

Schema-v3 aggregate is `{ type: "workflow", id: WorkflowInstanceId }`. Related refs may include Quest, Result, and Artifact aggregates. Payloads are exactly the C1-frozen `WorkflowBindPayload`, `WorkflowNodeCompletePayload`, `WorkflowTransitionRecordPayload`, and `WorkflowClosePayload` shapes.

Typed mutation-to-event mapping:

```text
workflow.bind              -> workflow.bound
workflow.node.complete     -> workflow.node_completed
workflow.transition.record -> workflow.transition_recorded
workflow.close             -> workflow.closed
```

Mutation objects carry the resolved normalized Workflow definition transiently for store validation. Definition bytes are not copied into the ledger.

### 3.3 Reducer invariants

Bind:

- Quest exists;
- instance ID is new;
- no active instance exists for Quest;
- exact definition ID/version/digest matches payload;
- selected node is declared in `startNodeIds`.

Complete:

- instance exists and is active;
- Quest/workflow/version/digest match binding;
- node equals current node and has no previous completion;
- definition node package identity matches payload exactly;
- C3 profile is `lightweight` and node allows it;
- accepted refs are non-empty, unique, sorted, exist, and belong to the Quest;
- command/event stops after this one completion; current node remains unchanged.

Transition:

- instance exists and is active;
- source equals current node and has a completion;
- transition ID/from/to exactly match one definition edge;
- required refs are present in source-node accepted refs;
- required gates map to canonical gate records. In C3 no gate projection exists, so non-empty `requiredGateIds` always block and `gateRecordIds` stays empty;
- transition is one explicit root command; reducer updates current node only from this event.

Close:

- instance exists and is active;
- binding fields match;
- rationale and actor fields are non-empty;
- `completed` requires current node completed and terminal (no outgoing edges);
- other outcomes may close from any active node;
- active Quest index is removed; history remains append-only.

No reducer branch calls a model, resolver, worker, command, or follow-up mutation.

## 4. Projection Layout

Per-Quest Workflow history is projected beside existing Quest state:

```text
.trellis/research/quests/<qst-id>/quest.json
.trellis/research/quests/<qst-id>/workflow.json
```

`workflow.json` envelope uses existing `Projected<T>` and stable JSON:

```ts
interface QuestWorkflowProjection {
  questId: QuestId;
  activeWorkflowInstanceId: WorkflowInstanceId | null;
  instances: ResearchWorkflowInstance[];
}
```

Instances follow bind order. Node completion map keys and all nested object keys are stable-sorted by `stableResearchJson`. `updatedAt` comes from the latest Workflow event for the Quest. Projection cache inventory includes every written `workflow.json`; rebuild removes stale cached projections through existing projection cleanup behavior.

No definition or package bytes are copied into projections. Exact identities and digest-bound history are sufficient.

## 5. Skill Discovery and Inspection

### 5.1 Reuse C2 resolver

Refactor only enough to expose an inspection seam:

```ts
inspectResearchSkillExecutionPackage({ root, id, version })
discoverResearchSkillExecutionPackages({ root })
resolveResearchSkillExecutionPackage(...) // unchanged public behavior
```

Inspection performs full `skill.json`, `SKILL.md`, and declared-member authentication but does not call invocation selection validation or project member contents. Existing resolution then applies `validateResearchSkillInvocation` and `selectResearchSkillMembers` to the authenticated package.

Discovery takes the union of exact project and bundled ID/version candidates, sorts by ID/version, then authenticates each through the same project-first inspector. A present invalid project package blocks the whole read; no partial list or bundled substitution is returned.

### 5.2 Output envelopes

`skill list` returns sorted summaries:

```ts
{
  schemaVersion: 1;
  command: "research skill list";
  skills: Array<{
    id: string;
    version: string;
    source: "project" | "bundled";
    identity: ResolvedExecutionPackageIdentity;
    skillKind: ResearchSkillKind;
    invocationSource: ResearchSkillInvocationSource;
    entrypointType: ResearchSkillEntrypointType;
    allowedProfiles: ResearchExecutionProfile[];
  }>;
}
```

`skill show` returns source, full manifest metadata, normalized identity, instruction byte length/digest, and member inventory metadata. It omits instruction/member content.

If `--version` is omitted, zero versions -> `research_skill_not_found`; multiple versions -> `research_skill_version_required` with sorted available versions. No silent newest-version choice.

## 6. Lightweight Context

### 6.1 Selection

`skill context` is an explicit root CLI action:

- standalone: command selects by Skill ID only, so discovery must yield exactly one version;
- with Quest but no active instance: same unique-version rule plus minimal Quest projection;
- with active instance: current node determines exact package identity/version. `--skill` must match node identity and selected profile must be allowed by both definition node and Skill manifest.

The resolver receives `invocationSource: "operator-explicit"`, `profile: "lightweight"`, `audience: "root"`, and exact requested member paths. This permits explicit selection of an `operator-explicit` lightweight package while preserving rejection of implicit model selection elsewhere. `root-command` still fails because it has no model profile.

### 6.2 Context shape

```ts
interface ResearchSkillContextResult {
  schemaVersion: 1;
  command: "research skill context";
  profile: "lightweight";
  source: "project" | "bundled";
  executionPackage: ResolvedExecutionPackageIdentity;
  workflow: null | {
    workflowInstanceId: WorkflowInstanceId;
    workflowId: string;
    workflowVersion: string;
    workflowDigest: `sha256:${string}`;
    nodeId: string;
  };
  quest: null | {
    id: QuestId;
    title: string;
    description: string;
    status: QuestStatus;
    stage: QuestStage;
    repositoryIds: RepositoryId[];
    artifactRefs: ArtifactRef[];
  };
  instructions: string;
  members: ResearchSkillInventoryItemV3[];
  stop: { after: "one-skill"; autoInvoke: false };
}
```

One `SKILL.md`; default permitted members plus explicitly requested permitted members. On-demand members not requested are absent. No other Skill/Workflow node instructions appear.

`--profile managed` returns `research_skill_invocation_forbidden` before instruction/member bytes because C3 has no managed execution authority input. C5 continues through Dispatch/Activation/Approval rather than making this read-only command an authority shortcut.

All Context paths avoid locks, temp files, ledger appends, projection writes, and caches.

## 7. Workflow CLI

### 7.1 Frozen signatures

```text
trellis research skill list [--json]
trellis research skill show --skill <id> [--version <version>] [--json]
trellis research skill context --skill <id> --profile <lightweight|managed> \
  [--member <path>...] [--quest <id>] [--json]

trellis research workflow bind --quest <id> --workflow <id> --version <version> \
  --start-node <node> [--dry-run] [--write] [--json]
trellis research workflow complete --instance <id> --node <id> \
  --accepted-ref <ref>... [--dry-run] [--write] [--json]
trellis research workflow transition --instance <id> --transition <id> \
  [--dry-run] [--write] [--json]
trellis research workflow close --instance <id> \
  --outcome <completed|blocked|cancelled|superseded> \
  --rationale <text> [--dry-run] [--write] [--json]
trellis research workflow status --quest <id> [--json]
trellis research workflow next --quest <id> [--json]
```

All commands also retain the shared explicit Research root option used by the current command tree. No slash wrappers are generated.

### 7.2 Preview/write options

Use a dedicated option type/helper instead of changing existing mutation defaults:

```ts
interface ResearchWorkflowMutationOptions extends ResearchOutputOptions {
  idempotencyKey?: string;
  dryRun?: boolean;
  write?: boolean;
}
```

Rules:

- no flag -> `validateResearchBatchReadOnly`;
- `--dry-run` -> same preview;
- `--write` -> `commitResearchBatch`;
- both -> argument error before mutation construction;
- preview result reports `dryRun: true`; write reports `dryRun: false`.

Existing Research commands remain write-by-default unless `--dry-run`; C3 does not silently change them.

### 7.3 Command behavior

Bind generates `wfi_<uuid>`, resolves exact Quest and Workflow definition, computes digest, and emits one `workflow.bind` mutation.

Complete parses each `--accepted-ref` as `result:<res_uuid>` or `artifact:<art_uuid>`, normalizes order, resolves exact bound definition/current package identity, and emits one lightweight completion mutation. Managed completion remains deferred to C5.

Transition resolves exact bound definition, validates the selected edge and requirements, uses fixed root actor `trellis-cli`, and emits one transition mutation. There is no “default” edge.

Close resolves binding/definition, validates outcome/rationale, uses `trellis-cli` as `closedBy`, and emits one close mutation.

Status and next load canonical state and exact bound definition read-only. Definition absence/digest mismatch fails closed; neither command falls back to `Quest.stage`.

## 8. Status and Next Results

`workflow status`:

```ts
{
  schemaVersion: 1;
  command: "research workflow status";
  questId: QuestId;
  state: "unbound" | "active" | "closed";
  instance: ResearchWorkflowInstance | null;
  currentNode: null | {
    id: string;
    executionPackage: ResolvedExecutionPackageIdentity;
    allowedProfiles: ResearchExecutionProfile[];
    stop: boolean;
    completed: boolean;
  };
}
```

`workflow next` returns one record per outgoing transition:

```ts
{
  id: string;
  fromNodeId: string;
  toNodeId: string;
  legal: boolean;
  missingRefs: string[];
  missingGateIds: Array<"H1" | "H2">;
}
```

Top-level `stopReason` is one of:

```text
no-active-workflow
instance-closed
current-node-incomplete
terminal-node
missing-required-refs
missing-gates
operator-selection-required
```

When one or more choices are legal, stop reason remains `operator-selection-required`: operator must call `workflow transition`. `next` never chooses, mutates, or runs.

## 9. Errors

Required stable CLI codes:

```text
research_skill_not_found
research_skill_version_required
research_skill_invocation_forbidden
research_skill_member_forbidden
research_workflow_invalid
research_workflow_active_conflict
research_workflow_completion_invalid
research_workflow_transition_blocked
```

All errors occur before append. Read-only failures also leave runtime/cache state unchanged. Internal Core errors may remain uppercase and map once at the CLI boundary.

## 10. Compatibility and Rollback

Compatibility:

- schema-v1/v2 event accepted language stays unchanged;
- Procedure and C2 execution-package digests stay unchanged;
- current Research mutation commands keep existing write-by-default behavior;
- static bundled Workflow resolver/selection stays unchanged;
- no bundled Skill/Workflow package ships in C3;
- no provider, Activation, Approval, Dispatch, or source repository path changes.

Rollback before any Workflow event: remove C3 command registration, parser/state branches, and projections.

Rollback after events exist: preserve schema-v3 event parsing/replay and projections; disable new command selection only. Never delete recorded Workflow history or reinterpret it as Quest stage.

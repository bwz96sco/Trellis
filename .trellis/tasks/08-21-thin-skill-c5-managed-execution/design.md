# C5 Managed Research Skill Execution Design

## Boundary

C5 makes schema-v3 Skills usable through existing managed Dispatch machinery. It generalizes Procedure-specific seams; it does not add another lifecycle or execute a provider.

```text
exact schema-v3 Skill package
  -> explicit Dispatch selection
  -> normalized package + optional Workflow-node binding
  -> existing Activation and Approval authority
  -> zero-write approved Context schema v3
  -> generic Claude/Codex worker contract
  -> existing atomic Result + pending Proposal + Approval consumption
  -> separate root Workflow completion
  -> separate operator-selected transition
```

Authority stays:

```text
Skill owns method.
Command owns deterministic control.
Workflow owns legal transitions and stops.
Trellis owns canonical state and authority.
```

## 1. Compatibility Strategy

C5 preserves two historical branches and adds one new branch:

| Activation package | Worker Context | Behavior |
|---|---|---|
| Procedure schema v1 | schema v1 | unchanged |
| Procedure schema v2 | schema v2 | unchanged, including methodology projection |
| Skill schema v3 | schema v3 | new normalized execution-package Context |

Do not rewrite Procedure records into execution-package records. Package-neutral helpers dispatch on the existing discriminated unions.

## 2. Managed Selection Surface

Extend `trellis research dispatch prepare`; all existing required options remain.

```text
trellis research dispatch prepare ...
  [--skill <id> --skill-version <version>]
  [--member <path>...]
  [--workflow-instance <id> --workflow-node <node>]
```

### 2.1 Selection modes

```ts
type ManagedPackageSelection =
  | { kind: "procedure-current" }
  | {
      kind: "skill-exact";
      id: string;
      version: string;
      requestedMemberPaths: readonly string[];
      workflow?: ManagedWorkflowBindingInput;
    };
```

- no `--skill`/`--skill-version` -> existing Procedure-current path byte-for-byte;
- Skill options must be paired and exact;
- `--member` requires Skill selection;
- Workflow options must be paired and require Skill selection in C5;
- existing `ownerSkill`, provider, and taskRef remain compatibility/provenance metadata, never routing authority.

### 2.2 Explicit-selection proof

C5 has no model-triggered CLI or hidden worker invocation. An execution-package Activation can be created only from the explicit exact Skill options above. This recorded Activation is the canonical package-selection proof.

For `invocationSource: "operator-explicit"`:

- registry-current/capability fallback is forbidden;
- exact Skill ID/version must be supplied;
- if Workflow-bound, exact current instance/node must be supplied and validated;
- later Context uses the recorded binding and cannot infer intent from `ownerSkill`, package prose, or model output.

No boolean such as `operatorApproved: true` is accepted from arbitrary callers. Authority comes from the typed command path plus canonical Activation/Approval events.

## 3. Durable Activation Binding

Extend only `ExecutionPackageActivation`:

```ts
export interface ManagedExecutionWorkflowBinding {
  workflowInstanceId: WorkflowInstanceId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  nodeId: string;
}

export interface ManagedExecutionBinding {
  executionProfile: "managed";
  requestedMemberPaths: string[]; // normalized, unique, sorted
  workflow?: ManagedExecutionWorkflowBinding;
}

export interface ExecutionPackageActivation extends ResearchActivationBase {
  executionPackage: ResolvedExecutionPackageIdentity;
  managedExecution: ManagedExecutionBinding;
}
```

Closed-schema rules:

- historical `LegacyProcedureActivation` forbids `executionPackage` and `managedExecution`;
- new execution-package Activation requires both;
- `executionProfile` is fixed `managed`;
- member paths are normalized, unique, sorted, and may be empty;
- Workflow fields are all-or-none;
- Workflow binding is optional for managed work outside a Workflow;
- opposite/unknown fields fail closed in parser, reducer, store, and replay.

Approval shape remains the C2 union. New grants bind:

```ts
executionPackageDigest: activation.executionPackage.packageDigest
```

Historical grants continue binding `procedureDigest`.

## 4. Package-Neutral Effective Authority

Current `ResearchEffectiveAuthority.procedure` couples policy authority to Procedure identity. Generalize additively:

```ts
type ResearchEffectivePackageBinding =
  | { packageKind: "procedure"; procedure: { id: string; version: string; digest: string } }
  | { packageKind: "skill"; executionPackage: ResolvedExecutionPackageIdentity };
```

Effective authority keeps existing fields:

```text
capabilityId
enabled
kind
activation
automaticPolicyEnabled
workerAuthority=proposal-only
networkPolicy
repositoryScope
allowExternalCost=false
allowCanonicalMutation=false
allowCapabilityChaining=false
maxDurationMinutes
maxDispatches
```

Procedure resolution still applies Procedure manifest duration/network/repository limits. Skill resolution uses:

- manifest `managedBinding.capabilityId`;
- existing capability definition;
- existing project-policy defaults and capability override;
- no Skill field may widen network, cost, canonical mutation, chaining, Repository, or host authority;
- existing capability/policy limits remain the ceiling.

Automatic eligibility remains the existing conservative evaluator over effective authority. Exact Skill selection is explicit; automatic Approval does not become implicit package selection.

## 5. Candidate Resolution and Revalidation

Generalize `DispatchActivationCandidate`:

```ts
interface DispatchActivationCandidateBase {
  state: ResearchState;
  dispatch: Dispatch;
  stage: QuestStage;
  authority: ResearchEffectiveAuthority;
  automaticEligibility: ResearchAutomaticEligibility;
  policyDigest: string;
  requestDigest: string;
  scopeHash: string;
  scope: NormalizedDispatchScopeV1;
  repositoryObservation: RepositoryObservation;
}

type DispatchActivationCandidate =
  | (DispatchActivationCandidateBase & {
      packageKind: "procedure";
      procedure: ParsedResearchProcedure;
    })
  | (DispatchActivationCandidateBase & {
      packageKind: "skill";
      skill: ResolvedResearchSkillExecutionPackage;
      managedExecution: ManagedExecutionBinding;
    });
```

### 5.1 Procedure path

No option or output changes. Continue registry-current selection for new Procedure dispatches and activation-recorded resolution for historical revalidation.

### 5.2 Skill path

1. Resolve exact Skill project-first with:
   - `invocationSource: "operator-explicit"` because deterministic root command selected it;
   - `profile: "managed"`;
   - `audience: "worker"`;
   - exact requested member paths.
2. Authenticate full inventory before member projection.
3. Require `entrypointType: "model-context"` and manifest managed capability binding.
4. Resolve existing capability and project policy.
5. Validate Quest/stage/Run/Campaign/Repository/Artifact/write scope exactly as Procedure path.
6. Validate optional Workflow binding.
7. Create one execution-package Activation from resolved identity and managed binding.

### 5.3 Workflow validation

For a bound Skill:

- instance exists, is active, and belongs to Dispatch Quest;
- supplied node equals `currentNodeId` and is incomplete;
- exact Workflow definition ID/version/digest resolves unchanged;
- node execution-package identity equals resolved Skill identity across every field;
- node allows `managed` and has `stop: true`;
- no transition or gate is selected or recorded.

Revalidation repeats these checks before Approval grant, Context, and Result recording. A transition, close, rebinding, digest drift, or current-node change invalidates launch.

## 6. Approved Context Schema v3

```ts
export interface NormalizedResearchWorkerInputV3 {
  readonly schemaVersion: 3;
  readonly host: "claude" | "codex";
  readonly dispatch: Dispatch;
  readonly activation: Readonly<{
    id: ActivationId;
    capabilityId: string;
    mode: "automatic" | "explicit";
    requestDigest: string;
    executionPackageDigest: `sha256:${string}`;
    policyDigest: string;
    scopeHash: string;
  }>;
  readonly approval: Readonly<{
    id: ApprovalId;
    mode: "automatic" | "interactive";
    expiresAt: string;
  }>;
  readonly capability: ResearchCapabilityDefinition;
  readonly executionPackage: Readonly<{
    identity: ResolvedExecutionPackageIdentity;
    executionProfile: "managed";
    invocationSource: "model" | "operator-explicit";
    entrypointType: "model-context";
    instructions: string;
    source: "project" | "bundled";
    approvedMembers: readonly Readonly<{
      path: string;
      role: "reference" | "template" | "validator" | "helper";
      digest: `sha256:${string}`;
      content: string;
    }>[];
  }>;
  readonly workflow?: ManagedExecutionWorkflowBinding;
  readonly repository: NormalizedResearchWorkerInputV1["repository"];
  readonly context: NormalizedResearchWorkerInputV1["context"];
  readonly artifacts: NormalizedResearchWorkerInputV1["artifacts"];
  readonly allowedWritePaths: NormalizedResearchWorkerInputV1["allowedWritePaths"];
  readonly expectedOutputs: NormalizedResearchWorkerInputV1["expectedOutputs"];
  readonly checks: NormalizedResearchWorkerInputV1["checks"];
  readonly authority: typeof WORKER_AUTHORITY_CEILING;
  readonly outputContract: NormalizedResearchWorkerInputV1["outputContract"];
}
```

Member digest is rendered as `sha256:<manifest sha256>`. Stable order is normalized requested-path order. Empty request yields an empty array; default members are not silently injected into managed Context unless they are present in the canonical requested selection created by prepare.

Context construction order preserves existing failure precedence:

```text
parse IDs/host/time
-> canonical Dispatch hierarchy and completion absence
-> canonical Activation/index/materialization
-> staged request/repository/artifact/scope revalidation
-> exact package/policy/Workflow binding revalidation
-> Approval relation/host/status/expiry
-> Approval materialization
-> derived output-ID availability
-> immutable Context projection
```

No filesystem path to package roots enters Context.

## 7. Approval and Result Recording

### 7.1 Grant creation

Package-neutral grant creation selects one digest field:

```ts
if legacy Procedure Activation:
  procedureDigest = activation.procedure.digest
else:
  executionPackageDigest = activation.executionPackage.packageDigest
```

All other grant fields and expiry computation stay unchanged.

### 7.2 Relation check

Use `getResearchActivationPackageDigest(...)` and `getResearchApprovalPackageDigest(...)` plus discriminant equality. Legacy/new cross-pairs fail `APPROVAL_RELATION_MISMATCH`.

### 7.3 Result path

`recordApprovedResearchDispatchResult(...)` remains sole approved recording path. It:

- revalidates exact package and optional Workflow binding;
- validates Approval relation/status/expiry;
- parses strict worker Result/Proposal output with existing derived IDs;
- keeps Procedure methodology closure validation only for applicable historical Procedure versions;
- atomically appends Result, pending Proposal, and Approval consumption;
- repairs tracked projections on exact replay without rerunning worker;
- performs no Workflow mutation.

## 8. Managed Workflow Completion

Keep public command unchanged:

```text
trellis research workflow complete --instance <id> --node <id> \
  --accepted-ref <result|artifact:...>... [--dry-run] [--write] [--json]
```

CLI derives completion profile before constructing mutation:

```ts
interface ResolvedWorkflowCompletionEvidence {
  executionProfile: "lightweight" | "managed";
  executionPackage: ResolvedExecutionPackageIdentity;
  acceptedRefs: readonly WorkflowAcceptedRef[];
}
```

Rules:

- no accepted Result -> `lightweight`, existing behavior;
- accepted Result -> require one coherent managed execution identity;
- Result must exist, belong to accepted Dispatch, and have the exact consumed Approval-derived ID relation;
- Activation package identity must equal Workflow current-node identity;
- if Activation carries Workflow binding, it must equal current instance/node/digest;
- accepted Artifact refs must already be canonical and may accompany the Result;
- multiple Results are allowed only if they resolve to the same exact managed package and Workflow binding; otherwise reject;
- Core mutation adds `executionProfile`; Core independently requires node `allowedProfiles` contains it and emits node's exact identity;
- Result recording never calls completion; completion never calls transition.

Replay classification compares derived profile, node, accepted refs, and exact event identity.

## 9. Error Contract

Reuse existing stable errors where they describe the failure. New Skill resolver failures keep C2 codes.

| Condition | Required result |
|---|---|
| Partial Skill/version or Workflow instance/node options | `INVALID_RESEARCH_SKILL_MANIFEST`-class CLI input failure; zero write. |
| Skill disallows managed, uses root-command, lacks/mismatches capability, or explicit selection is absent | `RESEARCH_SKILL_INVOCATION_FORBIDDEN`; zero write. |
| Member undeclared/root-only/unrequested/escaping | `RESEARCH_SKILL_MEMBER_FORBIDDEN`; no partial Context. |
| Package/instruction/inventory/member bytes drift | package validation or `RESEARCH_EXECUTION_PACKAGE_IDENTITY_MISMATCH`; no worker launch. |
| Invalid project Skill exists | `INVALID_PROJECT_RESEARCH_SKILL`; no bundled fallback. |
| Workflow instance/node/Quest/digest/package/profile mismatch | `RESEARCH_WORKFLOW_COMPLETION_INVALID` or `APPROVAL_RELATION_MISMATCH` at lifecycle boundary; zero write. |
| Activation and Approval use different binding variants/digests | `APPROVAL_RELATION_MISMATCH`. |
| Request/policy/scope drift | existing digest mismatch code and precedence. |
| Approval revoked/expired/consumed/wrong host | existing Approval error. |
| Result/Proposal already exists or output IDs conflict | existing completion/output conflict error. |
| Result is recorded without Workflow completion | valid; Workflow state remains unchanged. |
| Worker requests nested execution or canonical mutation | authority ceiling denies; return blocked/partial Result/Proposal only. |

Implementation must preserve exact current error ordering for historical Procedure cases.

## 10. Tests

### Core

- closed managed binding schema/parser/reducer/store and mixed old/new ledgers;
- package-neutral effective authority with unchanged Procedure vectors;
- package-neutral Activation/Approval digest relation;
- managed Workflow completion profile and exact node package identity;
- direct store/reducer rejection of forged Workflow/package relations;
- historical Procedure and Workflow/gate replay.

### CLI

- prepare exact Skill selection, option pairing, member persistence, workflow binding, project-first fail-closed resolution;
- staged revalidation and failure precedence;
- automatic/interactively approved execution-package grants;
- schema-v3 Context exact bytes/member subset and Claude/Codex parity;
- approved Result/Proposal/consumption atomicity and recovery;
- Result recording leaves Workflow unchanged;
- explicit managed completion then separate transition;
- root-command/explicit-only/nested-execution refusals;
- historical Procedure Context v1/v2 snapshots unchanged;
- packed tarball manifest audit with test-only Skill fixtures only.

## 11. Rollback

Before canonical execution-package events exist, C5 code can be removed and Procedure path remains.

After events exist:

- preserve ledger and historical replay support;
- disable new managed Skill selection at CLI/capability mapping;
- do not delete Activations, Approvals, Results, Proposals, or Workflow state;
- Proposal decisions and Workflow transitions remain explicit root operations;
- no source writer or scientific-gate rollback is involved.

## 12. Rejected Designs

### Second Skill Dispatch lifecycle

Rejected: duplicates Approval, replay, Result, Proposal, recovery, and authority logic.

### Convert Skill to temporary Procedure

Rejected: changes package identity, creates duplicate instructions, and breaks cross-profile digest equality.

### Store only member-inventory digest

Rejected: authenticates full inventory but cannot replay which subset root approved.

### Infer Workflow node from Quest stage

Rejected: C3 current node is canonical; coarse Quest stage is insufficient.

### Result auto-completes or transitions Workflow

Rejected: combines worker output with root acceptance and operator routing authority.

### Let worker read package/source paths

Rejected: host-dependent discovery, mutable ambient bytes, and authority leakage.

import type { ResolvedExecutionPackageIdentity } from "./execution-package.js";

export const RESEARCH_SCHEMA_VERSION = 1 as const;
export const RESEARCH_EVENT_SCHEMA_VERSION = 2 as const;
export const RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION = 3 as const;

export type WorkspaceId = `wsp_${string}`;
export type RepositoryId = `rep_${string}`;
export type ArtifactId = `art_${string}`;
export type QuestId = `qst_${string}`;
export type CampaignId = `cmp_${string}`;
export type RunId = `run_${string}`;
export type EvidenceId = `evd_${string}`;
export type ClaimId = `clm_${string}`;
export type EventId = `evt_${string}`;
export type DispatchId = `dsp_${string}`;
export type ResultId = `res_${string}`;
export type ProposalId = `prp_${string}`;
export type DecisionId = `dec_${string}`;
export type ActivationId = `act_${string}`;
export type ApprovalId = `apr_${string}`;
export type WorkflowInstanceId = `wfi_${string}`;
export type ScientificGateRecordId = `gtr_${string}`;

export type QuestStatus = "active" | "paused" | "completed" | "abandoned";
export type QuestStage =
  | "setup"
  | "framing"
  | "literature"
  | "ideation"
  | "experiment"
  | "computation"
  | "theory"
  | "audit"
  | "writing"
  | "complete";
export type CampaignStatus =
  | "draft"
  | "frozen"
  | "running"
  | "blocked"
  | "completed"
  | "abandoned";
export type RunStatus =
  | "planned"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "invalidated";
export type EvidenceStatus = "active" | "superseded" | "retracted";
export type ClaimStatus =
  | "candidate"
  | "supported"
  | "contested"
  | "refuted"
  | "withdrawn";
export type RepositoryKind = "code" | "paper" | "notes" | "data" | "other";
export type ResultStatus = "completed" | "partial" | "blocked" | "failed";
export type ProposalStatus = "pending" | "accepted" | "rejected" | "deferred";
export type DecisionOutcome = "accept" | "reject" | "defer";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  description: string;
  questIds: QuestId[];
  campaignIds: CampaignId[];
  repositoryIds: RepositoryId[];
  createdAt: string;
  updatedAt: string;
}

export interface Repository {
  id: RepositoryId;
  name: string;
  kind: RepositoryKind;
  locator: string;
  expectedRemote?: string;
  defaultBranch?: string;
  capabilities: { hasTrellis: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactRef {
  id: ArtifactId;
  repositoryId: RepositoryId;
  path: string;
  kind?: string;
  revision?: string;
  sha256?: string;
  mediaType?: string;
}

export interface Quest {
  id: QuestId;
  title: string;
  description: string;
  status: QuestStatus;
  stage: QuestStage;
  repositoryIds: RepositoryId[];
  artifactRefs: ArtifactRef[];
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: CampaignId;
  questId: QuestId;
  title: string;
  status: CampaignStatus;
  protocolDigest: string;
  runIds: RunId[];
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: RunId;
  campaignId: CampaignId;
  title: string;
  status: RunStatus;
  dispatchId?: DispatchId;
  resultId?: ResultId;
  invalidationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: EvidenceId;
  questId: QuestId;
  runId?: RunId;
  summary: string;
  status: EvidenceStatus;
  artifactRefs: ArtifactRef[];
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: ClaimId;
  questId: QuestId;
  statement: string;
  status: ClaimStatus;
  evidenceIds: EvidenceId[];
  createdAt: string;
  updatedAt: string;
}

export type DispatchContextEntry =
  | { artifact: ArtifactRef; text?: never }
  | { text: string; artifact?: never };

export interface Dispatch {
  id: DispatchId;
  questId: QuestId;
  campaignId?: CampaignId;
  runId: RunId;
  repositoryId: RepositoryId;
  ownerSkill: string;
  provider?: string;
  objective: string;
  acceptanceCriteria: string[];
  context: DispatchContextEntry[];
  allowedWritePaths: string[];
  expectedOutputs: string[];
  checks: string[];
  taskRef?: string;
  createdAt: string;
}

export interface Result {
  id: ResultId;
  dispatchId: DispatchId;
  runId: RunId;
  status: ResultStatus;
  summary: string;
  commands: string[];
  checks: string[];
  artifactRefs: ArtifactRef[];
  revision?: string;
  dirtySummary?: string;
  blockers: string[];
  sessionRef?: string;
  createdAt: string;
}

export interface EvidenceCreateInput {
  id: EvidenceId;
  questId: QuestId;
  runId?: RunId;
  summary: string;
  artifactRefs: ArtifactRef[];
}

export interface ClaimCreateInput {
  id: ClaimId;
  questId: QuestId;
  statement: string;
  evidenceIds: EvidenceId[];
}

export type ProposalOperation =
  | { kind: "artifact.register"; artifact: ArtifactRef }
  | { kind: "quest.status"; questId: QuestId; status: QuestStatus }
  | { kind: "quest.stage"; questId: QuestId; stage: QuestStage }
  | {
      kind: "campaign.protocol";
      campaignId: CampaignId;
      protocolDigest: string;
    }
  | { kind: "campaign.freeze"; campaignId: CampaignId }
  | {
      kind: "campaign.status";
      campaignId: CampaignId;
      status: CampaignStatus;
    }
  | { kind: "run.status"; runId: RunId; status: RunStatus }
  | { kind: "run.invalidate"; runId: RunId; reason: string }
  | { kind: "evidence.create"; evidence: EvidenceCreateInput }
  | {
      kind: "evidence.status";
      evidenceId: EvidenceId;
      status: EvidenceStatus;
    }
  | { kind: "claim.create"; claim: ClaimCreateInput }
  | { kind: "claim.status"; claimId: ClaimId; status: ClaimStatus };

export interface Proposal {
  id: ProposalId;
  dispatchId: DispatchId;
  questId: QuestId;
  title: string;
  operations: ProposalOperation[];
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: DecisionId;
  proposalId: ProposalId;
  outcome: DecisionOutcome;
  selectedOperationIndexes: number[];
  rationale: string;
  reviewer: string;
  createdAt: string;
}

export type ApprovalStatus = "granted" | "revoked" | "consumed";

interface ResearchActivationBase {
  id: ActivationId;
  dispatchId: DispatchId;
  questId: QuestId;
  capabilityId: string;
  mode: "automatic" | "explicit";
  policyDigest: string;
  requestDigest: string;
  scopeHash: string;
  maxDurationMinutes: number;
  maxDispatches: number;
  createdAt: string;
}

export interface LegacyProcedureActivation extends ResearchActivationBase {
  procedure: {
    id: string;
    version: string;
    digest: string;
  };
}

export interface ExecutionPackageActivation extends ResearchActivationBase {
  executionPackage: ResolvedExecutionPackageIdentity;
}

export type ResearchActivation =
  | LegacyProcedureActivation
  | ExecutionPackageActivation;

interface ResearchApprovalGrantBase {
  id: ApprovalId;
  activationId: ActivationId;
  dispatchId: DispatchId;
  host: "claude" | "codex";
  mode: "automatic" | "interactive";
  approverLabel: string;
  rationale: string;
  requestDigest: string;
  policyDigest: string;
  scopeHash: string;
  grantedAt: string;
  expiresAt: string;
}

export interface LegacyProcedureApprovalGrant extends ResearchApprovalGrantBase {
  procedureDigest: string;
}

export interface ExecutionPackageApprovalGrant extends ResearchApprovalGrantBase {
  executionPackageDigest: string;
}

export type ResearchApprovalGrant =
  | LegacyProcedureApprovalGrant
  | ExecutionPackageApprovalGrant;

export type ResearchApprovalState =
  | {
      grant: ResearchApprovalGrant;
      status: "granted";
    }
  | {
      grant: ResearchApprovalGrant;
      status: "revoked";
      revokedAt: string;
      revocationReason: string;
    }
  | {
      grant: ResearchApprovalGrant;
      status: "consumed";
      consumedAt: string;
      resultId: ResultId;
      proposalId: ProposalId;
    };

export type WorkflowAcceptedRef =
  | { kind: "result"; id: ResultId }
  | { kind: "artifact"; id: ArtifactId };

export interface WorkflowBindPayload {
  workflowInstanceId: WorkflowInstanceId;
  questId: QuestId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  startNodeId: string;
  boundAt: string;
}

export interface WorkflowNodeCompletePayload {
  workflowInstanceId: WorkflowInstanceId;
  questId: QuestId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  nodeId: string;
  executionPackage: ResolvedExecutionPackageIdentity;
  executionProfile: "lightweight" | "managed";
  acceptedRefs: WorkflowAcceptedRef[];
  completedAt: string;
}

export type ScientificGateId = "H1" | "H2";
export type ScientificGateDecision = "approve" | "reject";

export interface ScientificGateRecord {
  id: ScientificGateRecordId;
  questId: QuestId;
  workflowInstanceId: WorkflowInstanceId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  nodeId: string;
  gateId: ScientificGateId;
  decision: ScientificGateDecision;
  actor: string;
  rationale: string;
  approvedRefs: string[];
  rejectedRefs: string[];
  evidenceRefs: ArtifactId[];
  sourceArtifactId?: ArtifactId;
  recordedAt: string;
}

export interface WorkflowTransitionRecordPayload {
  workflowInstanceId: WorkflowInstanceId;
  questId: QuestId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  transitionId: string;
  fromNodeId: string;
  toNodeId: string;
  selectedBy: string;
  gateRecordIds: ScientificGateRecordId[];
  selectedAt: string;
}

export type WorkflowCloseOutcome =
  | "completed"
  | "blocked"
  | "cancelled"
  | "superseded";

export interface WorkflowClosePayload {
  workflowInstanceId: WorkflowInstanceId;
  questId: QuestId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  outcome: WorkflowCloseOutcome;
  closedBy: string;
  rationale: string;
  closedAt: string;
}

export type WorkflowStatus = "active" | WorkflowCloseOutcome;

export interface ResearchWorkflowInstance {
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

export interface QuestWorkflowProjection {
  questId: QuestId;
  activeWorkflowInstanceId: WorkflowInstanceId | null;
  instances: ResearchWorkflowInstance[];
}

export interface QuestScientificGateProjection {
  schemaVersion: typeof RESEARCH_SCHEMA_VERSION;
  questId: QuestId;
  records: ScientificGateRecord[];
  effective: {
    workflowInstanceId: WorkflowInstanceId;
    nodeId: string;
    gateId: ScientificGateId;
    recordId: ScientificGateRecordId;
  }[];
  updatedAt: string;
}

export type ResearchAggregateType =
  | "workspace"
  | "repository"
  | "artifact"
  | "quest"
  | "campaign"
  | "run"
  | "evidence"
  | "claim"
  | "dispatch"
  | "result"
  | "proposal"
  | "decision";

export interface ResearchAggregateRef {
  type: ResearchAggregateType;
  id: string;
}

export type ResearchSchemaV2AggregateType =
  | ResearchAggregateType
  | "activation"
  | "approval";

export interface ResearchSchemaV2AggregateRef {
  type: ResearchSchemaV2AggregateType;
  id: string;
}

export type ResearchSchemaV3AggregateType =
  | ResearchAggregateType
  | "workflow"
  | "scientific-gate";

export interface ResearchSchemaV3AggregateRef {
  type: ResearchSchemaV3AggregateType;
  id: string;
}

export interface ResearchActor {
  type: "agent" | "user" | "system";
  id: string;
}

export interface ResearchProvenance {
  source: string;
  sourceId?: string;
}

export type ResearchEventKind =
  | "workspace.created"
  | "repository.registered"
  | "artifact.registered"
  | "quest.created"
  | "quest.status_changed"
  | "quest.stage_changed"
  | "campaign.created"
  | "campaign.protocol_updated"
  | "campaign.frozen"
  | "campaign.status_changed"
  | "run.created"
  | "run.status_changed"
  | "run.invalidated"
  | "evidence.created"
  | "evidence.status_changed"
  | "claim.created"
  | "claim.status_changed"
  | "dispatch.recorded"
  | "result.recorded"
  | "proposal.recorded"
  | "decision.recorded";

export type ResearchSchemaV2EventKind =
  | "activation.planned"
  | "approval.granted"
  | "approval.revoked"
  | "approval.consumed";

export type ResearchSchemaV3EventKind =
  | "workflow.bound"
  | "workflow.node_completed"
  | "workflow.transition_recorded"
  | "workflow.closed"
  | "scientific-gate.recorded";

export interface ResearchSchemaV1Event {
  schemaVersion: typeof RESEARCH_SCHEMA_VERSION;
  eventId: EventId;
  seq: number;
  timestamp: string;
  kind: ResearchEventKind;
  aggregate: ResearchAggregateRef;
  related: ResearchAggregateRef[];
  payload: Record<string, unknown>;
  actor: ResearchActor;
  idempotencyKey: string;
  provenance: ResearchProvenance;
}

export interface ResearchSchemaV2Event {
  schemaVersion: typeof RESEARCH_EVENT_SCHEMA_VERSION;
  eventId: EventId;
  seq: number;
  timestamp: string;
  kind: ResearchSchemaV2EventKind;
  aggregate: ResearchSchemaV2AggregateRef;
  related: ResearchSchemaV2AggregateRef[];
  payload: Record<string, unknown>;
  actor: ResearchActor;
  idempotencyKey: string;
  provenance: ResearchProvenance;
}

export interface ResearchSchemaV3Event {
  schemaVersion: typeof RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION;
  eventId: EventId;
  seq: number;
  timestamp: string;
  kind: ResearchSchemaV3EventKind;
  aggregate: ResearchSchemaV3AggregateRef;
  related: ResearchSchemaV3AggregateRef[];
  payload: Record<string, unknown>;
  actor: ResearchActor;
  idempotencyKey: string;
  provenance: ResearchProvenance;
}

export type ResearchEvent =
  | ResearchSchemaV1Event
  | ResearchSchemaV2Event
  | ResearchSchemaV3Event;

export interface Projected<T> {
  schemaVersion: typeof RESEARCH_SCHEMA_VERSION;
  projectedThroughSeq: number;
  updatedAt: string;
  data: T;
}

export interface ResearchState {
  workspace: Workspace | null;
  repositories: Record<RepositoryId, Repository>;
  artifacts: Record<ArtifactId, ArtifactRef>;
  quests: Record<QuestId, Quest>;
  campaigns: Record<CampaignId, Campaign>;
  runs: Record<RunId, Run>;
  evidence: Record<EvidenceId, Evidence>;
  claims: Record<ClaimId, Claim>;
  dispatches: Record<DispatchId, Dispatch>;
  results: Record<ResultId, Result>;
  proposals: Record<ProposalId, Proposal>;
  decisions: Record<DecisionId, Decision>;
  activations: Record<ActivationId, ResearchActivation>;
  activationByDispatchId: Partial<Record<DispatchId, ActivationId>>;
  approvals: Record<ApprovalId, ResearchApprovalState>;
  approvalIdsByActivationId: Partial<Record<ActivationId, ApprovalId[]>>;
  workflowInstances: Record<WorkflowInstanceId, ResearchWorkflowInstance>;
  workflowInstanceIdsByQuestId: Partial<Record<QuestId, WorkflowInstanceId[]>>;
  activeWorkflowByQuestId: Partial<Record<QuestId, WorkflowInstanceId>>;
  scientificGateRecords: Record<ScientificGateRecordId, ScientificGateRecord>;
  scientificGateRecordIdsByWorkflowInstanceId: Partial<
    Record<WorkflowInstanceId, ScientificGateRecordId[]>
  >;
  effectiveScientificGateRecordIdByScope: Record<
    string,
    ScientificGateRecordId
  >;
  entitySeq: Record<string, number>;
  projectedThroughSeq: number;
  updatedAt: string | null;
}

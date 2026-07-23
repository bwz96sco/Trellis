export const RESEARCH_SCHEMA_VERSION = 1 as const;
export const RESEARCH_EVENT_SCHEMA_VERSION = 2 as const;

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

export interface ResearchActivation {
  id: ActivationId;
  dispatchId: DispatchId;
  questId: QuestId;
  capabilityId: string;
  mode: "automatic" | "explicit";
  procedure: {
    id: string;
    version: string;
    digest: string;
  };
  policyDigest: string;
  requestDigest: string;
  scopeHash: string;
  maxDurationMinutes: number;
  maxDispatches: number;
  createdAt: string;
}

export interface ResearchApprovalGrant {
  id: ApprovalId;
  activationId: ActivationId;
  dispatchId: DispatchId;
  host: "claude" | "codex";
  mode: "automatic" | "interactive";
  approverLabel: string;
  rationale: string;
  requestDigest: string;
  procedureDigest: string;
  policyDigest: string;
  scopeHash: string;
  grantedAt: string;
  expiresAt: string;
}

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

export type ResearchEvent = ResearchSchemaV1Event | ResearchSchemaV2Event;

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
  entitySeq: Record<string, number>;
  projectedThroughSeq: number;
  updatedAt: string | null;
}

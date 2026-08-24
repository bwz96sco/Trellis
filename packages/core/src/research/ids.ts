import { randomUUID } from "node:crypto";

import type {
  ActivationId,
  ApprovalId,
  ArtifactId,
  CampaignId,
  ClaimId,
  DecisionId,
  DispatchId,
  EvidenceId,
  EventId,
  ProposalId,
  QuestExportRecordId,
  QuestId,
  QuestImportMilestoneId,
  QuestImportRecordId,
  QuestRouteSnapshotId,
  QuestScientificUniverseId,
  QuestWriterTransferId,
  RepositoryId,
  ResultId,
  RunId,
  ScientificGateRecordId,
  WorkflowInstanceId,
  WorkspaceId,
} from "./types.js";

export const RESEARCH_ID_PREFIXES = {
  workspace: "wsp",
  repository: "rep",
  artifact: "art",
  quest: "qst",
  campaign: "cmp",
  run: "run",
  evidence: "evd",
  claim: "clm",
  event: "evt",
  dispatch: "dsp",
  result: "res",
  proposal: "prp",
  decision: "dec",
  activation: "act",
  approval: "apr",
  workflowInstance: "wfi",
  scientificGateRecord: "gtr",
  questImportRecord: "qir",
  questImportMilestone: "qim",
  questRouteSnapshot: "qrs",
  questScientificUniverse: "qsu",
  questWriterTransfer: "qwt",
  questExportRecord: "qex",
} as const;

export type ResearchIdKind = keyof typeof RESEARCH_ID_PREFIXES;

export function createResearchId(kind: ResearchIdKind): string {
  return `${RESEARCH_ID_PREFIXES[kind]}_${randomUUID()}`;
}

export const createWorkspaceId = (): WorkspaceId =>
  createResearchId("workspace") as WorkspaceId;
export const createRepositoryId = (): RepositoryId =>
  createResearchId("repository") as RepositoryId;
export const createArtifactId = (): ArtifactId =>
  createResearchId("artifact") as ArtifactId;
export const createQuestId = (): QuestId =>
  createResearchId("quest") as QuestId;
export const createCampaignId = (): CampaignId =>
  createResearchId("campaign") as CampaignId;
export const createRunId = (): RunId => createResearchId("run") as RunId;
export const createEvidenceId = (): EvidenceId =>
  createResearchId("evidence") as EvidenceId;
export const createClaimId = (): ClaimId =>
  createResearchId("claim") as ClaimId;
export const createEventId = (): EventId =>
  createResearchId("event") as EventId;
export const createDispatchId = (): DispatchId =>
  createResearchId("dispatch") as DispatchId;
export const createResultId = (): ResultId =>
  createResearchId("result") as ResultId;
export const createProposalId = (): ProposalId =>
  createResearchId("proposal") as ProposalId;
export const createDecisionId = (): DecisionId =>
  createResearchId("decision") as DecisionId;
export const createActivationId = (): ActivationId =>
  createResearchId("activation") as ActivationId;
export const createApprovalId = (): ApprovalId =>
  createResearchId("approval") as ApprovalId;
export const createWorkflowInstanceId = (): WorkflowInstanceId =>
  createResearchId("workflowInstance") as WorkflowInstanceId;
export const createScientificGateRecordId = (): ScientificGateRecordId =>
  createResearchId("scientificGateRecord") as ScientificGateRecordId;
export const createQuestImportRecordId = (): QuestImportRecordId =>
  createResearchId("questImportRecord") as QuestImportRecordId;
export const createQuestImportMilestoneId = (): QuestImportMilestoneId =>
  createResearchId("questImportMilestone") as QuestImportMilestoneId;
export const createQuestRouteSnapshotId = (): QuestRouteSnapshotId =>
  createResearchId("questRouteSnapshot") as QuestRouteSnapshotId;
export const createQuestScientificUniverseId = (): QuestScientificUniverseId =>
  createResearchId("questScientificUniverse") as QuestScientificUniverseId;
export const createQuestWriterTransferId = (): QuestWriterTransferId =>
  createResearchId("questWriterTransfer") as QuestWriterTransferId;
export const createQuestExportRecordId = (): QuestExportRecordId =>
  createResearchId("questExportRecord") as QuestExportRecordId;

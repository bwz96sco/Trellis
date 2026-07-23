export type {
  WorkspaceId,
  RepositoryId,
  ArtifactId,
  QuestId,
  CampaignId,
  RunId,
  EvidenceId,
  ClaimId,
  EventId,
  DispatchId,
  ResultId,
  ProposalId,
  DecisionId,
  QuestStatus,
  QuestStage,
  CampaignStatus,
  RunStatus,
  EvidenceStatus,
  ClaimStatus,
  RepositoryKind,
  ResultStatus,
  ProposalStatus,
  DecisionOutcome,
  Workspace,
  Repository,
  ArtifactRef,
  Quest,
  Campaign,
  Run,
  Evidence,
  Claim,
  DispatchContextEntry,
  Dispatch,
  Result,
  EvidenceCreateInput,
  ClaimCreateInput,
  ProposalOperation,
  Proposal,
  Decision,
  ResearchAggregateType,
  ResearchAggregateRef,
  ResearchActor,
  ResearchProvenance,
  ResearchEventKind,
  ResearchEvent,
  Projected,
  ResearchState,
} from "./types.js";
export { RESEARCH_SCHEMA_VERSION } from "./types.js";

export {
  RESEARCH_ID_PREFIXES,
  createResearchId,
  createWorkspaceId,
  createRepositoryId,
  createArtifactId,
  createQuestId,
  createCampaignId,
  createRunId,
  createEvidenceId,
  createClaimId,
  createEventId,
  createDispatchId,
  createResultId,
  createProposalId,
  createDecisionId,
} from "./ids.js";
export type { ResearchIdKind } from "./ids.js";

export { researchPaths } from "./paths.js";
export type { ResearchPaths } from "./paths.js";

export {
  RESEARCH_EXECUTION_HOSTS,
  RESEARCH_STAGE_CAPABILITIES,
  normalizeDiscoveredResearchSkillNames,
  parseResearchExecutionHost,
  resolveResearchStageCapability,
} from "./stage-capabilities.js";
export type {
  DispatchableQuestStage,
  ResearchExecutionHost,
  ResearchCapability,
  OptionalResearchSkill,
  BundledResearchSkill,
  ResearchStageCapabilityDefinition,
  ResolveResearchStageCapabilityInput,
  ResearchStageCapabilityResolution,
} from "./stage-capabilities.js";

export {
  workspaceSchema,
  repositorySchema,
  artifactRefSchema,
  questSchema,
  campaignSchema,
  runSchema,
  evidenceSchema,
  claimSchema,
  dispatchSchema,
  resultSchema,
  proposalOperationSchema,
  proposalSchema,
  decisionSchema,
  researchActorSchema,
  researchProvenanceSchema,
  researchAggregateRefSchema,
  eventIdSchema,
  parseQuestStatus,
  parseQuestStage,
  parseCampaignStatus,
  parseRunStatus,
  parseEvidenceStatus,
  parseClaimStatus,
} from "./schema.js";
export type { RuntimeSchema } from "./schema.js";

export {
  assertQuestStatusTransition,
  assertCampaignStatusTransition,
  assertRunStatusTransition,
  assertRunInvalidation,
  assertEvidenceStatusTransition,
  assertClaimStatusTransition,
} from "./transitions.js";

export {
  RESEARCH_EVENT_KINDS,
  researchEventSchema,
  parseResearchEvent,
  parseResearchLedger,
  serializeResearchEvents,
} from "./events.js";

export { emptyResearchState, reduceResearchEvents } from "./reducer.js";

export {
  readResearchLedger,
  readResearchState,
  getResearchStatus,
  validateResearchBatch,
  commitResearchBatch,
  rebuildResearchProjections,
  ResearchProjectionError,
} from "./store.js";
export type {
  ResearchMutation,
  CommitResearchBatchInput,
  ResearchCommitResult,
  ResearchBatchValidation,
  ResearchStatus,
} from "./store.js";

export { stableResearchJson } from "./projections.js";

export {
  normalizeRepositoryLocator,
  normalizeArtifactPath,
  resolveArtifactPath,
  verifyArtifactSha256,
} from "./artifacts.js";

export {
  resolveRepositoryPath,
  requireRepository,
  validateArtifactRepositories,
} from "./repositories.js";

export {
  proposalOperationsToMutations,
  proposalStatusForDecision,
} from "./dispatch.js";

export { buildResearchContext } from "./context.js";
export type {
  ResearchContextSelection,
  ResearchContext,
} from "./context.js";

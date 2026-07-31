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
  ActivationId,
  ApprovalId,
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
  ApprovalStatus,
  ResearchActivation,
  ResearchApprovalGrant,
  ResearchApprovalState,
  ResearchAggregateType,
  ResearchAggregateRef,
  ResearchSchemaV2AggregateType,
  ResearchSchemaV2AggregateRef,
  ResearchActor,
  ResearchProvenance,
  ResearchEventKind,
  ResearchSchemaV2EventKind,
  ResearchSchemaV1Event,
  ResearchSchemaV2Event,
  ResearchEvent,
  Projected,
  ResearchState,
} from "./types.js";
export {
  RESEARCH_SCHEMA_VERSION,
  RESEARCH_EVENT_SCHEMA_VERSION,
} from "./types.js";

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
  createActivationId,
  createApprovalId,
} from "./ids.js";
export type { ResearchIdKind } from "./ids.js";

export { researchPaths } from "./paths.js";
export type { ResearchPaths } from "./paths.js";

export {
  RESEARCH_CAPABILITY_REGISTRY,
  RESEARCH_DEFAULT_CAPABILITY_BY_STAGE,
  RESEARCH_PROCEDURE_CURRENT_VERSION,
  RESEARCH_EXECUTION_HOSTS,
  ResearchCapabilityResolutionError,
  getResearchCapabilityDefinition,
  parseResearchExecutionHost,
  resolveResearchCapability,
} from "./stage-capabilities.js";
export type {
  DispatchableQuestStage,
  ResearchActivationMode,
  ResearchCapabilityDefinition,
  ResearchCapabilityId,
  ResearchCapabilityKind,
  ResearchCapabilityResolutionErrorCode,
  ResearchExecutionHost,
} from "./stage-capabilities.js";

export {
  validateMethodologyArtifacts,
} from "./methodology-artifacts.js";
export type {
  MethodologyArtifactContract,
  MethodologyArtifactInstance,
  MethodologyArtifactValidationResult,
  MethodologyArtifactErrorCode,
  MethodologyCardinality,
  MethodologyRequiredness,
} from "./methodology-artifacts.js";

export {
  listTrustedMethodologyValidatorIds,
  runMethodologyValidators,
} from "./methodology-validators.js";
export type {
  MethodologyValidationContext,
  MethodologyValidationReport,
  MethodologyValidatorDescriptor,
  MethodologyValidatorFinding,
} from "./methodology-validators.js";

export { buildMethodologyReport } from "./methodology-reports.js";
export type { MethodologyDeterministicReport } from "./methodology-reports.js";

export { buildWorkerMethodologyProjectionV2 } from "./methodology-worker-context.js";
export type {
  WorkerMethodologyProjectionV2,
  WorkerVisibleSupportEntry,
} from "./methodology-worker-context.js";

export {
  FROZEN_COMPOSITION_EDGES,
  getFrozenCompositionEdge,
  validateRootCompositionDescriptor,
} from "./composition.js";
export type {
  CompositionEdgeId,
  CompositionValidationCode,
  FrozenCompositionEdge,
  RootCompositionDescriptor,
} from "./composition.js";

export {
  CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
  ResearchProcedurePolicyError,
  computeResearchProcedureDigest,
  computeResearchProjectPolicyDigest,
  evaluateResearchAutomaticEligibility,
  parseResearchProcedure,
  parseResearchProjectPolicy,
  resolveResearchEffectiveAuthority,
} from "./procedure-policy.js";
export type {
  ParsedResearchProcedure,
  ParsedResearchProjectPolicy,
  ResearchAutomaticEligibility,
  ResearchAutomaticIneligibilityReason,
  ResearchCapabilityPolicyV1,
  ResearchEffectiveAuthority,
  ResearchProcedureIdentityMode,
  ResearchProcedureManifest,
  ResearchProcedurePolicyErrorCode,
  ResearchProcedureSource,
  ResearchProjectPolicyV1,
} from "./procedure-policy.js";

export {
  FROZEN_METHODOLOGY_CONTRACT_DIGEST,
  FROZEN_METHODOLOGY_CONTRACT_VERSION,
  PROCEDURE_DIGEST_DOMAIN_V2,
  SupportPackError,
  buildSupportPackInventory,
  computeResearchProcedureDigestV2,
  parseSupportPackManifest,
  resolveProcedurePackageSchemaVersion,
  serializeSupportPackInventoryForDigest,
  serializeSupportPackManifest,
} from "./procedure-support-pack.js";

export {
  ORDINARY_RESEARCH_PROPOSAL_OPERATION_KINDS,
  QUEST_ADMIN_PROPOSAL_OPERATION_KINDS,
  allowedProposalOperationKindsForCapability,
  validateProposalOperationsForCapability,
} from "./proposal-operation-allowlist.js";
export type {
  ProposalOperationAllowlistErrorCode,
  ProposalOperationAllowlistResult,
  ProposalOperationKind,
} from "./proposal-operation-allowlist.js";
export type {
  SupportPackEntry,
  SupportPackInventoryItem,
  SupportPackManifest,
  SupportPackRole,
  SupportPackWorkerVisibility,
} from "./procedure-support-pack.js";

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
  activationIdSchema,
  approvalIdSchema,
  researchActivationSchema,
  researchApprovalGrantSchema,
  researchApprovalStateSchema,
  researchActorSchema,
  researchProvenanceSchema,
  researchAggregateRefSchema,
  researchSchemaV2AggregateRefSchema,
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
  RESEARCH_SCHEMA_V2_EVENT_KINDS,
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
  validateResearchBatchReadOnly,
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
  digestDispatchRequest,
  hashDispatchScope,
} from "./dispatch-authority.js";
export type { NormalizedDispatchScopeV1 } from "./dispatch-authority.js";

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

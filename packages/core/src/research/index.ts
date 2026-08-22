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
  LegacyProcedureActivation,
  ExecutionPackageActivation,
  ResearchActivation,
  LegacyProcedureApprovalGrant,
  ExecutionPackageApprovalGrant,
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
  FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
  FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
  FROZEN_METHODOLOGY_DERIVABILITY_MATRIX_DIGEST,
  FROZEN_METHODOLOGY_FAMILY_COUNT,
  FROZEN_ORDERED_STAGE_COUNT,
  HISTORICAL_INVALID_PHASE2_CHECKPOINT_FIXTURE,
  LOSSLESS_METHODOLOGY_PROCEDURE_VERSION,
  ResearchMethodologyContractError,
  loadResearchMethodologyContractFromProcedure,
  parseResearchMethodologyDerivabilityMatrix,
  parseResearchMethodologyFamilyContract,
  parseResearchMethodologyFreeze,
  verifyResearchMethodologyDerivabilityMatrixConformance,
  verifyResearchMethodologyFreezeConformance,
} from "./methodology-contract.js";
export type {
  ResearchArtifactLifecycleCheckpoint,
  ResearchMethodologyCardinality,
  ResearchMethodologyCheckpoint,
  ResearchMethodologyCheckpointKind,
  ResearchMethodologyFamilyContract,
  ResearchMethodologyFieldRequirement,
  ResearchMethodologyFieldType,
  ResearchMethodologyFixtureObligations,
  ResearchMethodologyFreeze,
  ResearchMethodologyFreezeConformance,
  ResearchMethodologyCompatibilityRoutingExtension,
  ResearchMethodologyDerivabilityFamily,
  ResearchMethodologyDerivabilityMatrix,
  ResearchMethodologyDerivabilityMatrixConformance,
  ResearchMethodologyDerivabilityMatrixInput,
  ResearchMethodologyDerivabilityOwner,
  ResearchMethodologyDerivabilityRow,
  ResearchMethodologyDerivabilitySourceFile,
  ResearchMethodologyDerivabilitySourceLocation,
  ResearchMethodologyPlanned203Destinations,
  ResearchMethodologyStableErrorCode,
  ResearchOrderedStageCheckpoint,
} from "./methodology-contract.js";

export {
  bindMethodologyArtifactPath,
  matchesMethodologyPathPattern,
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
  deriveMethodologyValidatorFacts,
  listTrustedMethodologyValidatorIds,
  runMethodologyValidators,
} from "./methodology-validators.js";
export type {
  MethodologyValidationContext,
  MethodologyValidationReport,
  MethodologyValidatorDescriptor,
  MethodologyValidatorFinding,
} from "./methodology-validators.js";

export {
  METHODOLOGY_REPORT_V2_DIGEST_DOMAIN,
  buildMethodologyReport,
  buildMethodologyReportV2,
  buildMethodologyReportV131,
  canonicalResearchJson,
  computeMethodologyReportV2DigestFromCanonicalBody,
  serializeMethodologyReportV131Sidecar,
  serializeMethodologyReportV2Sidecar,
  shouldMaterializeMethodologyReportSidecar,
} from "./methodology-reports.js";
export type {
  MethodologyDeterministicReport,
  MethodologyDeterministicReportV2,
  MethodologyDeterministicReportV131,
  MethodologyReportV131Finding,
  MethodologyReportV131ValidatorTriple,
} from "./methodology-reports.js";

export { buildWorkerMethodologyProjectionV2 } from "./methodology-worker-context.js";
export type {
  LegacyWorkerArtifactRequirement,
  WorkerCheckpointRequirement,
  WorkerMethodologyProjectionV2,
  WorkerMethodologyRequirement,
  WorkerVisibleSupportEntry,
} from "./methodology-worker-context.js";

export {
  MethodologyV13RuntimeError,
  V13_CLOSURE_FAMILY_COUNT,
  V13_DELTA_CASE_COUNT,
  V13_ENFORCEABLE_ARTIFACT_COUNT,
  V13_LIFECYCLE_DIMENSIONS,
  V13_LIFECYCLE_DIMENSION_COUNT,
  V13_OUTPUT_COUNT,
  V13_PROVENANCE_ROW_COUNT,
  V13_TRUSTED_VALIDATOR_COUNT,
  V13_VALIDATOR_BINDING_COUNT,
  assertHistoricalPhase2FixtureIsNotV13Authority,
  deriveAcceptedV13PackIdentity,
  evaluateAcceptedV13DeltaCase,
  expectedV13ContractCounts,
  mapProcedureIdToClosureFamily,
  parseAcceptedV13ContractPack,
  parseCanonicalMethodologyClosureArtifact,
  selectApplicableV13ValidatorsFromBindings,
  selectTrustedV13ValidatorDescriptors,
  authenticateAcceptedV13MemberLedger,
  enforceV13LifecycleDimensionsFromArtifactRefs,
  executeV13BindingInvocations,
  executeV13ProcedureBindings,
  findV13ClosureArtifactSpecForFamily,
  isV13ClosureArtifactExactPath,
  resolveProcedureClosureDisposition,
  resolveProcedureLifecycleFamily,
  selectApplicableV13BindingsForProcedure,
  validateV13BindingCrossLinks,
  V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V13_ACCEPTED_MEMBER_LEDGER_SCHEMA_VERSION,
  V13_ACCEPTED_PACK_MEMBER_ALLOWLIST,
  V13_CLOSURE_ARTIFACT_SPECS,
  V13_CLOSURE_NOT_APPLICABLE_PROCEDURE_COUNT,
  V13_CLOSURE_REQUIRED_PROCEDURE_COUNT,
  V13_PROCEDURE_CLOSURE_DISPOSITIONS,
  V13_PROCEDURE_COUNT,
  V13_PROCEDURE_LIFECYCLE_FAMILIES,
  V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V131_ACCEPTED_PACK_MEMBER_ALLOWLIST,
  V131_COMPLETE_LIFECYCLE_DECISION_COUNT,
  V131_MAPPING_ROW_COUNT,
  V131_MAPPING_ROWS_DIGEST,
  V131_NEGATIVE_LIFECYCLE_DECISION_COUNT,
  V131_NOT_APPLICABLE_MAPPING_ROW_COUNT,
  V131_POSITIVE_LIFECYCLE_DECISION_COUNT,
  deriveAcceptedV131PackIdentity,
  executeV131BindingInvocations,
  parseAcceptedV131ContractPack,
  resolveV131ProcedureArtifactFamilyMapping,
  selectApplicableV131BindingsForProcedure,
} from "./methodology-v13-runtime.js";
export type {
  CanonicalClosureParseResult,
  DerivedAcceptedV13PackIdentity,
  ParsedCanonicalMethodologyClosure,
  V13AcceptedContractPack,
  V13AcceptedMemberLedger,
  V13AcceptedMemberLedgerRow,
  V13ApplicableBinding,
  V13ArtifactLifecycleRow,
  V13ArtifactRefFact,
  V13BindingExecutionResult,
  V13BindingInvocationRow,
  V13LifecycleDimensionFinding,
  V13ClosureArtifactRefSpec,
  V13ContractPackCounts,
  V13DeltaCaseEvaluationInput,
  V13DeltaCaseEvaluationResult,
  V13LeafFileName,
  V13LifecycleDimension,
  V13ProcedureClosureDisposition,
  V13TrustedValidatorEntry,
  V13ValidatorBinding,
  DerivedAcceptedV131PackIdentity,
  V131AcceptedContractPack,
  V131ApplicableBinding,
  V131BindingExecutionResult,
  V131BindingInvocationRow,
  V131LeafFileName,
  V131LifecycleDecision,
  V131MappingRow,
  V131TrustedValidatorEntry,
} from "./methodology-v13-runtime.js";

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
  listRootCompositionEdgeIds,
  planRootCompositionAction,
} from "./dispatch-composition.js";
export type { RootCompositionAction } from "./dispatch-composition.js";

export {
  ResearchExecutionPackageError,
  assertResearchExecutionPackageIdentity,
  computeResearchExecutionPackageInstructionDigest,
  computeResearchExecutionPackageMemberInventoryDigest,
  computeResearchSkillPackageDigest,
  normalizeResearchProcedureExecutionPackageIdentity,
  parseResearchSkillExecutionPackage,
  selectResearchSkillMembers,
  serializeResearchSkillManifestV3,
  validateResearchSkillInvocation,
} from "./execution-package.js";
export type {
  ParsedResearchSkillExecutionPackage,
  ResearchExecutionPackageErrorCode,
  ResearchExecutionPackageKind,
  ResearchExecutionProfile,
  ResearchSkillEntrypointType,
  ResearchSkillInventoryItemV3,
  ResearchSkillInvocationSource,
  ResearchSkillKind,
  ResearchSkillManifestV3,
  ResearchSkillMemberAudience,
  ResearchSkillMemberLoad,
  ResearchSkillMemberRole,
  ResearchSkillMemberV3,
  ResearchSkillMemberVisibility,
  ResolvedExecutionPackageIdentity,
} from "./execution-package.js";

export {
  CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
  ResearchProcedurePolicyError,
  computeResearchProcedureDigest,
  computeResearchProjectPolicyDigest,
  evaluateResearchAutomaticEligibility,
  parseAcceptedV131ResearchProcedure,
  parseResearchProcedure,
  parseResearchProjectPolicy,
  resolveResearchEffectiveAuthority,
} from "./procedure-policy.js";
export type {
  ParsedResearchProcedure,
  ParsedResearchProjectPolicy,
  ParseResearchProcedureInput,
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
  V13_ACCEPTED_A3_COMMIT,
  V13_ACCEPTED_B3_COMMIT,
  V13_ACCEPTED_CANDIDATE_MANIFEST_DIGEST,
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_CONTRACT_VERSION,
  V13_ACCEPTED_OA3_COMMIT,
  V13_ATTEMPT2_AUTHORING_COMMIT,
  V13_ATTEMPT2_REJECTED_CANDIDATE_MANIFEST_DIGEST,
  V13_ATTEMPT2_REJECTED_CONTRACT_DIGEST,
  V13_ATTEMPT2_REJECTED_CONTRACT_VERSION,
  V13_METHODOLOGY_CANDIDATE_MANIFEST_DIGEST,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  V131_ACCEPTED_A133_COMMIT,
  V131_ACCEPTED_CANDIDATE_MANIFEST_DIGEST,
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  buildSupportPackInventory,
  computeResearchProcedureDigestV2,
  isAuthoritativeMethodologyProcedureVersion,
  parseSupportPackManifest,
  resolveMethodologyContractBinding,
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
  cloneResearchActivation,
  cloneResearchApprovalGrant,
  getResearchActivationPackageDigest,
  getResearchApprovalPackageDigest,
  isExecutionPackageActivation,
  isExecutionPackageApprovalGrant,
} from "./execution-package-bindings.js";

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
  resolvedExecutionPackageIdentitySchema,
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

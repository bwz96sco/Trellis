import {
  buildWorkerMethodologyProjectionV2,
  parseResearchExecutionHost,
  readResearchState,
  resolveResearchCapability,
  type ActivationId,
  type ApprovalId,
  type ArtifactRef,
  type Dispatch,
  type DispatchContextEntry,
  type DispatchId,
  type ProposalId,
  type QuestStage,
  type RepositoryId,
  isExecutionPackageActivation,
  isExecutionPackageApprovalGrant,
  type LegacyProcedureActivation,
  type ResearchActivation,
  type ResearchApprovalState,
  type ResearchCapabilityDefinition,
  type ResearchExecutionHost,
  type ResearchProcedureManifest,
  type ResultId,
  type RunId,
  type WorkerMethodologyProjectionV2,
} from "@mindfoldhq/trellis-core/research";

import { resolveResearchRoot, type ResearchRootOptions } from "./common.js";
import { type ResearchDispatchContextWarning } from "./dispatch-context.js";
import {
  readResearchDispatchMaterialization,
  ResearchDispatchMaterializationReadError,
} from "./dispatch-materialization-reader.js";
import {
  classifyResearchOutputIdOccupation,
  deriveResearchOutputIds,
} from "./dispatch-output-ids.js";
import {
  revalidateDispatchActivationStaged,
  type StagedDispatchRevalidation,
} from "./dispatch-revalidation.js";
import { ResearchActivationError } from "./errors.js";

export interface ResolveApprovedResearchDispatchContextOptions extends ResearchRootOptions {
  readonly dispatchId: DispatchId;
  readonly host: ResearchExecutionHost;
  readonly now?: Date;
}

const WORKER_AUTHORITY_CEILING = {
  readScope: "declared-context-only",
  writeScope: "allowed-write-paths-only",
  network: false,
  externalCost: false,
  multipleRepositories: false,
  canonicalResearchMutation: false,
  proposalReview: false,
  gitHistoryMutation: false,
  capabilityChaining: false,
  procedureLaunch: false,
  dispatchLaunch: false,
  nestedAgents: false,
  sandboxExpansion: false,
  recordResult: false,
} as const;

export interface NormalizedResearchWorkerInputV1 {
  readonly schemaVersion: 1;
  readonly host: ResearchExecutionHost;
  readonly dispatch: Dispatch;
  readonly activation: Readonly<{
    id: ActivationId;
    capabilityId: string;
    mode: "automatic" | "explicit";
    requestDigest: string;
    procedureDigest: string;
    policyDigest: string;
    scopeHash: string;
  }>;
  readonly approval: Readonly<{
    id: ApprovalId;
    mode: "automatic" | "interactive";
    expiresAt: string;
  }>;
  readonly capability: ResearchCapabilityDefinition;
  readonly procedure: Readonly<{
    manifest: ResearchProcedureManifest;
    digest: string;
    instructions: string;
    source: "project" | "bundled";
  }>;
  readonly repository: Readonly<{
    id: RepositoryId;
    path: string;
  }>;
  readonly context: readonly DispatchContextEntry[];
  readonly artifacts: readonly Readonly<{
    ref: ArtifactRef;
    path: string;
  }>[];
  readonly allowedWritePaths: readonly string[];
  readonly expectedOutputs: readonly string[];
  readonly checks: readonly string[];
  readonly authority: typeof WORKER_AUTHORITY_CEILING;
  readonly outputContract: Readonly<{
    type: "result-plus-pending-proposal";
    dispatchId: DispatchId;
    runId: RunId;
    questId: Dispatch["questId"];
    resultId: ResultId;
    proposalId: ProposalId;
  }>;
}

/**
 * Context schema v2 for schema-v2 Procedure packages.
 * Keeps the v1 key surface for host parity and adds a worker-visible
 * methodology projection only (no root-only secrets or composition authority).
 */
export interface NormalizedResearchWorkerInputV2 extends Omit<
  NormalizedResearchWorkerInputV1,
  "schemaVersion"
> {
  readonly schemaVersion: 2;
  readonly methodology: WorkerMethodologyProjectionV2;
}

export type NormalizedResearchWorkerInput =
  | NormalizedResearchWorkerInputV1
  | NormalizedResearchWorkerInputV2;

export interface ApprovedResearchDispatchContextResult {
  readonly command: "research dispatch context";
  readonly valid: true;
  readonly ledgerHead: number;
  readonly warnings: readonly ResearchDispatchContextWarning[];
  readonly context: NormalizedResearchWorkerInput;
}

function fail(
  code: ConstructorParameters<typeof ResearchActivationError>[0],
  message: string,
  cause?: unknown,
): never {
  throw new ResearchActivationError(code, message, { cause });
}

function requireLegacyProcedureActivation(
  activation: ResearchActivation,
): LegacyProcedureActivation {
  if (isExecutionPackageActivation(activation)) {
    fail(
      "APPROVAL_RELATION_MISMATCH",
      "Procedure dispatch context cannot use an execution-package activation",
    );
  }
  return activation;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function parseNow(value: Date | undefined): number {
  const now = value ?? new Date();
  const epoch = now.getTime();
  if (!Number.isFinite(epoch))
    fail("APPROVAL_EXPIRED", "Context time is invalid");
  return epoch;
}

const DISPATCH_ID =
  /^dsp_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDispatchId(value: DispatchId): DispatchId {
  if (!DISPATCH_ID.test(value)) {
    fail("DISPATCH_NOT_FOUND", "dispatch ID must be a dsp_ prefixed UUID");
  }
  return value;
}

function validateContextHierarchy(
  state: Awaited<ReturnType<typeof readResearchState>>,
  dispatch: Dispatch,
): QuestStage {
  const quest = state.quests[dispatch.questId];
  if (quest === undefined) {
    fail("DISPATCH_HIERARCHY_INVALID", "Dispatch Quest does not exist");
  }
  if (quest.status !== "active") {
    fail("QUEST_NOT_DISPATCHABLE", "Dispatch Quest must be active");
  }
  const run = state.runs[dispatch.runId];
  if (
    run === undefined ||
    (run.status !== "planned" && run.status !== "running")
  ) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Run must be planned or running",
    );
  }
  if (run.dispatchId !== dispatch.id) {
    fail("DISPATCH_HIERARCHY_INVALID", "Run Dispatch identity does not match");
  }
  const campaign = state.campaigns[run.campaignId];
  if (campaign?.questId !== quest.id) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Run Campaign does not belong to the Dispatch Quest",
    );
  }
  if (!campaign.runIds.includes(run.id)) {
    fail("DISPATCH_HIERARCHY_INVALID", "Run is not registered in its Campaign");
  }
  if (
    dispatch.campaignId !== undefined &&
    dispatch.campaignId !== campaign.id
  ) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Campaign does not match the Run Campaign",
    );
  }
  const repository = state.repositories[dispatch.repositoryId];
  if (
    repository === undefined ||
    !quest.repositoryIds.includes(repository.id)
  ) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Target Repository is not associated with the Dispatch Quest",
    );
  }
  return quest.stage;
}

function compatibilityWarnings(
  dispatch: Dispatch,
  host: ResearchExecutionHost,
): readonly ResearchDispatchContextWarning[] {
  const warnings: ResearchDispatchContextWarning[] = [
    {
      code: "LEGACY_OWNER_SKILL_IGNORED",
      message: "Declared owner skill is legacy metadata and was ignored",
    },
  ];
  if (dispatch.provider !== undefined && dispatch.provider !== host) {
    warnings.push({
      code: "PROVIDER_HINT_MISMATCH",
      message:
        "Declared provider hint differs from the requested host and was ignored",
    });
  }
  if (dispatch.taskRef !== undefined) {
    warnings.push({
      code: "TASK_REF_IGNORED",
      message:
        "Declared Task reference is provenance metadata and was not dereferenced",
    });
  }
  return Object.freeze(warnings);
}

function requireActivation(input: {
  readonly state: Awaited<ReturnType<typeof readResearchState>>;
  readonly dispatch: Dispatch;
}): LegacyProcedureActivation {
  const activationId = input.state.activationByDispatchId[input.dispatch.id];
  const matchingActivations = Object.values(input.state.activations).filter(
    (activation) => activation.dispatchId === input.dispatch.id,
  );
  if (activationId === undefined && matchingActivations.length === 0) {
    fail(
      "ACTIVATION_REQUIRED",
      `Dispatch '${input.dispatch.id}' requires an activation`,
    );
  }
  const activation =
    activationId === undefined
      ? undefined
      : input.state.activations[activationId];
  if (
    matchingActivations.length !== 1 ||
    matchingActivations[0]?.id !== activationId ||
    activation?.id !== activationId ||
    activation?.dispatchId !== input.dispatch.id ||
    activation?.questId !== input.dispatch.questId
  ) {
    fail(
      "APPROVAL_RELATION_MISMATCH",
      "Dispatch activation index does not match canonical activation state",
    );
  }
  return requireLegacyProcedureActivation(activation);
}

function validateActivationBindings(
  activation: ResearchActivation,
  candidate: StagedDispatchRevalidation,
): void {
  const legacyActivation = requireLegacyProcedureActivation(activation);
  if (
    candidate.authority.capabilityId !== legacyActivation.capabilityId ||
    candidate.authority.activation !== legacyActivation.mode ||
    candidate.authority.procedure.id !== legacyActivation.procedure.id ||
    candidate.authority.procedure.version !==
      legacyActivation.procedure.version ||
    candidate.authority.maxDurationMinutes !== activation.maxDurationMinutes ||
    candidate.authority.maxDispatches !== activation.maxDispatches
  ) {
    fail(
      "APPROVAL_RELATION_MISMATCH",
      "Activation authority no longer matches canonical capability state",
    );
  }
}

function sameApprovalBindings(
  approval: ResearchApprovalState,
  activation: ResearchActivation,
): boolean {
  if (
    isExecutionPackageActivation(activation) ||
    isExecutionPackageApprovalGrant(approval.grant)
  ) {
    return false;
  }
  return (
    approval.grant.activationId === activation.id &&
    approval.grant.dispatchId === activation.dispatchId &&
    approval.grant.requestDigest === activation.requestDigest &&
    approval.grant.procedureDigest === activation.procedure.digest &&
    approval.grant.policyDigest === activation.policyDigest &&
    approval.grant.scopeHash === activation.scopeHash
  );
}

function selectApproval(input: {
  readonly state: Awaited<ReturnType<typeof readResearchState>>;
  readonly activation: ResearchActivation;
  readonly host: ResearchExecutionHost;
  readonly now: number;
}): ResearchApprovalState {
  const indexedIds =
    input.state.approvalIdsByActivationId[input.activation.id] ?? [];
  if (new Set(indexedIds).size !== indexedIds.length) {
    fail(
      "APPROVAL_RELATION_MISMATCH",
      "Activation approval index contains duplicates",
    );
  }
  const reverseIds = Object.values(input.state.approvals)
    .filter((approval) => approval.grant.activationId === input.activation.id)
    .map((approval) => approval.grant.id);
  if (
    reverseIds.length !== indexedIds.length ||
    reverseIds.some((id, index) => indexedIds[index] !== id)
  ) {
    fail(
      "APPROVAL_RELATION_MISMATCH",
      "Activation approval index does not match canonical approval state",
    );
  }
  const approvals = indexedIds.map((id) => {
    const approval = input.state.approvals[id];
    if (
      approval?.grant.id !== id ||
      !sameApprovalBindings(approval, input.activation)
    ) {
      fail(
        "APPROVAL_RELATION_MISMATCH",
        "Approval index contains an invalid activation or binding relation",
      );
    }
    return approval;
  });
  if (approvals.length === 0) {
    fail("APPROVAL_REQUIRED", "Dispatch activation has no approval history");
  }
  const hostApprovals = approvals.filter(
    (approval) => approval.grant.host === input.host,
  );
  if (hostApprovals.length === 0) {
    fail(
      "APPROVAL_HOST_MISMATCH",
      `Dispatch activation has no approval for host '${input.host}'`,
    );
  }
  const eligible = hostApprovals.filter(
    (approval) =>
      approval.status === "granted" &&
      input.now < Date.parse(approval.grant.expiresAt),
  );
  if (eligible.length > 1) {
    fail(
      "APPROVAL_RELATION_MISMATCH",
      "Dispatch activation has multiple eligible approvals for the requested host",
    );
  }
  const selected = eligible[0];
  if (selected !== undefined) return selected;
  const newest = hostApprovals.at(-1);
  if (newest === undefined) {
    fail("APPROVAL_HOST_MISMATCH", "Requested host approval was not found");
  }
  if (newest.status === "consumed") {
    fail("DISPATCH_ALREADY_COMPLETED", "Dispatch approval is already consumed");
  }
  if (newest.status === "revoked") {
    fail("APPROVAL_REVOKED", "Dispatch approval is revoked");
  }
  fail("APPROVAL_EXPIRED", "Dispatch approval is expired");
}

function readMaterializations(input: {
  readonly root: string;
  readonly dispatch: Dispatch;
  readonly activation: ResearchActivation;
  readonly approval?: ResearchApprovalState;
}): void {
  try {
    if (input.approval === undefined) {
      readResearchDispatchMaterialization({
        root: input.root,
        dispatchId: input.dispatch.id,
        kind: "request",
        expected: input.dispatch,
      });
      return;
    }
    readResearchDispatchMaterialization({
      root: input.root,
      dispatchId: input.dispatch.id,
      kind: "activation",
      expected: input.activation,
    });
    readResearchDispatchMaterialization({
      root: input.root,
      dispatchId: input.dispatch.id,
      kind: "approval",
      approvalId: input.approval.grant.id,
      expected: input.approval,
    });
  } catch (error) {
    if (error instanceof ResearchDispatchMaterializationReadError) {
      fail(
        input.approval === undefined
          ? "REQUEST_STATE_MISMATCH"
          : "MATERIALIZATION_STATE_MISMATCH",
        error.message,
        error,
      );
    }
    throw error;
  }
}

function normalizedContext(input: {
  readonly host: ResearchExecutionHost;
  readonly dispatch: Dispatch;
  readonly activation: LegacyProcedureActivation;
  readonly approval: ResearchApprovalState;
  readonly candidate: StagedDispatchRevalidation;
  readonly resultId: ResultId;
  readonly proposalId: ProposalId;
}): NormalizedResearchWorkerInput {
  const artifacts = input.candidate.scope.artifacts.map((resolved) => {
    const ref = input.dispatch.context
      .map((entry) => entry.artifact)
      .find((artifact) => artifact?.id === resolved.id);
    if (ref === undefined) {
      fail(
        "ARTIFACT_INVALID",
        `Artifact '${resolved.id}' is missing from Dispatch context`,
      );
    }
    return { ref, path: resolved.resolvedPath };
  });
  const base = {
    host: input.host,
    dispatch: input.dispatch,
    activation: {
      id: input.activation.id,
      capabilityId: input.activation.capabilityId,
      mode: input.activation.mode,
      requestDigest: input.activation.requestDigest,
      procedureDigest: input.activation.procedure.digest,
      policyDigest: input.activation.policyDigest,
      scopeHash: input.activation.scopeHash,
    },
    approval: {
      id: input.approval.grant.id,
      mode: input.approval.grant.mode,
      expiresAt: input.approval.grant.expiresAt,
    },
    capability: input.candidate.procedure.capability,
    procedure: {
      manifest: input.candidate.procedure.manifest,
      digest: input.candidate.procedure.digest,
      instructions: input.candidate.procedure.instructions,
      source: input.candidate.procedure.source,
    },
    repository: {
      id: input.dispatch.repositoryId,
      path: input.candidate.scope.repository.resolvedRoot,
    },
    context: input.dispatch.context,
    artifacts,
    allowedWritePaths: input.candidate.scope.allowedWritePaths.map(
      (entry) => entry.resolvedPath,
    ),
    expectedOutputs: input.dispatch.expectedOutputs,
    checks: input.dispatch.checks,
    authority: { ...WORKER_AUTHORITY_CEILING },
    outputContract: {
      type: "result-plus-pending-proposal" as const,
      dispatchId: input.dispatch.id,
      runId: input.dispatch.runId,
      questId: input.dispatch.questId,
      resultId: input.resultId,
      proposalId: input.proposalId,
    },
  };

  // Schema-v2 Procedures get Context v2 with worker-visible methodology only.
  if (input.candidate.procedure.packageSchemaVersion === 2) {
    try {
      const methodology = buildWorkerMethodologyProjectionV2(
        input.candidate.procedure,
      );
      return deepFreeze({
        schemaVersion: 2 as const,
        ...base,
        methodology,
      });
    } catch (error) {
      fail(
        "PROCEDURE_DIGEST_MISMATCH",
        error instanceof Error
          ? error.message
          : "Failed to project schema-v2 methodology into Context",
        error,
      );
    }
  }

  return deepFreeze({
    schemaVersion: 1 as const,
    ...base,
  });
}

export async function resolveApprovedResearchDispatchContext(
  options: ResolveApprovedResearchDispatchContextOptions,
): Promise<ApprovedResearchDispatchContextResult> {
  const dispatchId = parseDispatchId(options.dispatchId);
  let host: ResearchExecutionHost;
  try {
    host = parseResearchExecutionHost(options.host);
  } catch (error) {
    fail("INVALID_HOST", "Research execution host is invalid", error);
  }
  const now = parseNow(options.now);
  const root = resolveResearchRoot(options);
  const state = await readResearchState(root);
  const dispatch = state.dispatches[dispatchId];
  if (dispatch === undefined) {
    fail("DISPATCH_NOT_FOUND", `Dispatch '${dispatchId}' was not found`);
  }
  const stage = validateContextHierarchy(state, dispatch);
  if (
    Object.values(state.results).some(
      (result) => result.dispatchId === dispatch.id,
    ) ||
    Object.values(state.proposals).some(
      (proposal) => proposal.dispatchId === dispatch.id,
    )
  ) {
    fail(
      "DISPATCH_ALREADY_COMPLETED",
      `Dispatch '${dispatch.id}' is already completed`,
    );
  }
  const activation = requireActivation({ state, dispatch });
  try {
    resolveResearchCapability({
      stage,
      capabilityId: activation.capabilityId,
    });
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "UNKNOWN_CAPABILITY" ||
        error.code === "CAPABILITY_STAGE_MISMATCH")
        ? error.code
        : "DISPATCH_HIERARCHY_INVALID";
    fail(code, error instanceof Error ? error.message : String(error), error);
  }
  readMaterializations({ root, dispatch, activation });
  const candidate = await revalidateDispatchActivationStaged({
    root,
    state,
    dispatch,
    activation,
  });
  validateActivationBindings(activation, candidate);
  const approval = selectApproval({ state, activation, host, now });
  readMaterializations({ root, dispatch, activation, approval });
  const ids = deriveResearchOutputIds(approval.grant.id);
  if (
    classifyResearchOutputIdOccupation({
      state,
      dispatchId: dispatch.id,
      ids,
    }) !== "available"
  ) {
    fail(
      "OUTPUT_ID_CONFLICT",
      "Approval-derived Result or Proposal ID is already occupied",
    );
  }
  return deepFreeze({
    command: "research dispatch context",
    valid: true,
    ledgerHead: state.projectedThroughSeq,
    warnings: compatibilityWarnings(dispatch, host),
    context: normalizedContext({
      host,
      dispatch,
      activation,
      approval,
      candidate,
      ...ids,
    }),
  });
}

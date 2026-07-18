import {
  createCampaignId,
  createClaimId,
  createEvidenceId,
  createQuestId,
  createRunId,
  createWorkspaceId,
  getResearchStatus,
  parseCampaignStatus,
  parseClaimStatus,
  parseEvidenceStatus,
  parseQuestStage,
  parseQuestStatus,
  parseRunStatus,
  readResearchState,
  rebuildResearchProjections,
  workspaceSchema,
  type CampaignId,
  type CampaignStatus,
  type ClaimId,
  type ClaimStatus,
  type EvidenceId,
  type EvidenceStatus,
  type QuestId,
  type QuestStage,
  type QuestStatus,
  type RepositoryId,
  type RunId,
  type RunStatus,
} from "@mindfoldhq/trellis-core/research";

import {
  executeResearchMutations,
  parseCampaignId,
  parseClaimId,
  parseEvidenceId,
  parseQuestId,
  parseRepositoryId,
  parseRunId,
  requireResearchText,
  resolveResearchRoot,
  type ResearchInitResult,
  type ResearchMutationOptions,
  type ResearchMutationResult,
  type ResearchOutputOptions,
  type ResearchStatusResult,
  type ResearchValidationResult,
} from "./common.js";
import { clearResearchSessionRun, setResearchSessionRun } from "./session.js";

export interface InitializeResearchOptions extends ResearchMutationOptions {
  name: string;
  description?: string;
}

export interface CreateResearchQuestOptions extends ResearchMutationOptions {
  id?: QuestId;
  title: string;
  description?: string;
  repositoryIds?: RepositoryId[];
}

export interface SetResearchQuestStatusOptions extends ResearchMutationOptions {
  questId: QuestId;
  status: QuestStatus;
}

export interface SetResearchQuestStageOptions extends ResearchMutationOptions {
  questId: QuestId;
  stage: QuestStage;
}

export interface CreateResearchCampaignOptions extends ResearchMutationOptions {
  id?: CampaignId;
  questId: QuestId;
  title: string;
  protocolDigest: string;
}

export interface UpdateResearchCampaignProtocolOptions extends ResearchMutationOptions {
  campaignId: CampaignId;
  protocolDigest: string;
}

export interface ResearchCampaignOptions extends ResearchMutationOptions {
  campaignId: CampaignId;
}

export interface SetResearchCampaignStatusOptions extends ResearchCampaignOptions {
  status: CampaignStatus;
}

export interface CreateResearchRunOptions extends ResearchMutationOptions {
  id?: RunId;
  campaignId: CampaignId;
  title: string;
}

export interface SetResearchRunStatusOptions extends ResearchMutationOptions {
  runId: RunId;
  status: RunStatus;
}

export interface InvalidateResearchRunOptions extends ResearchMutationOptions {
  runId: RunId;
  reason: string;
}

export interface CreateResearchEvidenceOptions extends ResearchMutationOptions {
  id?: EvidenceId;
  questId: QuestId;
  runId?: RunId;
  summary: string;
}

export interface SetResearchEvidenceStatusOptions extends ResearchMutationOptions {
  evidenceId: EvidenceId;
  status: EvidenceStatus;
}

export interface CreateResearchClaimOptions extends ResearchMutationOptions {
  id?: ClaimId;
  questId: QuestId;
  statement: string;
  evidenceIds?: EvidenceId[];
}

export interface SetResearchClaimStatusOptions extends ResearchMutationOptions {
  claimId: ClaimId;
  status: ClaimStatus;
}

export async function initializeResearch(
  options: InitializeResearchOptions,
): Promise<ResearchInitResult> {
  const root = resolveResearchRoot(options);
  const name = requireResearchText(options.name, "workspace name");
  const description = options.description ?? "";
  const idempotencyKey = options.idempotencyKey ?? "research:init";
  requireResearchText(idempotencyKey, "idempotency key");
  const state = await readResearchState(root);

  if (state.workspace) {
    if (
      state.workspace.name !== name ||
      state.workspace.description !== description
    ) {
      throw new Error(
        `Research workspace is already initialized as '${state.workspace.name}'`,
      );
    }
    return {
      command: "research init",
      idempotencyKey,
      dryRun: options.dryRun === true,
      replayed: true,
      headSeq: state.projectedThroughSeq,
      events: [],
      created: false,
      workspace: state.workspace,
    };
  }

  const result = await executeResearchMutations(
    "init",
    { ...options, root, idempotencyKey },
    [
      {
        kind: "workspace.create",
        workspace: {
          id: createWorkspaceId(),
          name,
          description,
        },
      },
    ],
  );
  const workspace = workspaceSchema.parse(result.events[0]?.payload.workspace);
  return { ...result, created: true, workspace };
}

export async function researchStatus(
  options: ResearchOutputOptions,
): Promise<ResearchStatusResult> {
  return loadResearchStatus("research status", options);
}

export async function validateResearch(
  options: ResearchOutputOptions,
): Promise<ResearchValidationResult> {
  const root = resolveResearchRoot(options);
  const state = await readResearchState(root);
  const status = await getResearchStatus(root);
  return {
    command: "research validate",
    valid: true,
    initialized: state.workspace !== null,
    headSeq: status.headSeq,
    eventCount: status.eventCount,
    projectedThroughSeq: status.projectedThroughSeq,
    projectionStale: status.projectionStale,
  };
}

export async function rebuildResearch(
  options: ResearchOutputOptions,
): Promise<ResearchStatusResult> {
  const root = resolveResearchRoot(options);
  await rebuildResearchProjections(root);
  return loadResearchStatus("research rebuild", { ...options, root });
}

export async function createResearchQuest(
  options: CreateResearchQuestOptions,
): Promise<ResearchMutationResult> {
  const id =
    options.id === undefined ? createQuestId() : parseQuestId(options.id);
  const repositoryIds = [
    ...new Set((options.repositoryIds ?? []).map(parseRepositoryId)),
  ];
  const root = resolveResearchRoot(options);
  if (repositoryIds.length > 0) {
    const state = await readResearchState(root);
    for (const repositoryId of repositoryIds) {
      if (!state.repositories[repositoryId]) {
        throw new Error(`Unknown research repository '${repositoryId}'`);
      }
    }
  }
  return executeResearchMutations("quest create", { ...options, root }, [
    {
      kind: "quest.create",
      quest: {
        id,
        title: requireResearchText(options.title, "quest title"),
        description: options.description ?? "",
        repositoryIds,
        artifactRefs: [],
      },
    },
  ]);
}

export async function setResearchQuestStatus(
  options: SetResearchQuestStatusOptions,
): Promise<ResearchMutationResult> {
  return executeResearchMutations("quest status", options, [
    {
      kind: "quest.status",
      questId: parseQuestId(options.questId),
      status: parseQuestStatus(options.status),
    },
  ]);
}

export async function setResearchQuestStage(
  options: SetResearchQuestStageOptions,
): Promise<ResearchMutationResult> {
  return executeResearchMutations("quest stage", options, [
    {
      kind: "quest.stage",
      questId: parseQuestId(options.questId),
      stage: parseQuestStage(options.stage),
    },
  ]);
}

export async function createResearchCampaign(
  options: CreateResearchCampaignOptions,
): Promise<ResearchMutationResult> {
  const id =
    options.id === undefined ? createCampaignId() : parseCampaignId(options.id);
  return executeResearchMutations("campaign create", options, [
    {
      kind: "campaign.create",
      campaign: {
        id,
        questId: parseQuestId(options.questId),
        title: requireResearchText(options.title, "campaign title"),
        protocolDigest: requireResearchText(
          options.protocolDigest,
          "protocol digest",
        ),
      },
    },
  ]);
}

export async function updateResearchCampaignProtocol(
  options: UpdateResearchCampaignProtocolOptions,
): Promise<ResearchMutationResult> {
  return executeResearchMutations("campaign protocol", options, [
    {
      kind: "campaign.protocol",
      campaignId: parseCampaignId(options.campaignId),
      protocolDigest: requireResearchText(
        options.protocolDigest,
        "protocol digest",
      ),
    },
  ]);
}

export async function freezeResearchCampaign(
  options: ResearchCampaignOptions,
): Promise<ResearchMutationResult> {
  return executeResearchMutations("campaign freeze", options, [
    {
      kind: "campaign.freeze",
      campaignId: parseCampaignId(options.campaignId),
    },
  ]);
}

export async function setResearchCampaignStatus(
  options: SetResearchCampaignStatusOptions,
): Promise<ResearchMutationResult> {
  return executeResearchMutations("campaign status", options, [
    {
      kind: "campaign.status",
      campaignId: parseCampaignId(options.campaignId),
      status: parseCampaignStatus(options.status),
    },
  ]);
}

export async function createResearchRun(
  options: CreateResearchRunOptions,
): Promise<ResearchMutationResult> {
  const id = options.id === undefined ? createRunId() : parseRunId(options.id);
  return executeResearchMutations("run create", options, [
    {
      kind: "run.create",
      run: {
        id,
        campaignId: parseCampaignId(options.campaignId),
        title: requireResearchText(options.title, "run title"),
      },
    },
  ]);
}

export async function setResearchRunStatus(
  options: SetResearchRunStatusOptions,
): Promise<ResearchMutationResult> {
  const root = resolveResearchRoot(options);
  const runId = parseRunId(options.runId);
  const status = parseRunStatus(options.status);
  const result = await executeResearchMutations("run status", options, [
    {
      kind: "run.status",
      runId,
      status,
    },
  ]);
  if (
    result.dryRun ||
    !result.events.some(
      (event) =>
        event.kind === "run.status_changed" &&
        event.aggregate.type === "run" &&
        event.aggregate.id === runId &&
        event.payload.status === status,
    )
  ) {
    return result;
  }

  if (status === "running") {
    return updateRunSessionPointer(result, () =>
      setResearchSessionRun(root, runId),
    );
  }
  if (status === "succeeded" || status === "failed" || status === "cancelled") {
    return updateRunSessionPointer(result, () =>
      clearResearchSessionRun(root, runId),
    );
  }
  return result;
}

export async function invalidateResearchRun(
  options: InvalidateResearchRunOptions,
): Promise<ResearchMutationResult> {
  const root = resolveResearchRoot(options);
  const runId = parseRunId(options.runId);
  const result = await executeResearchMutations("run invalidate", options, [
    {
      kind: "run.invalidate",
      runId,
      reason: requireResearchText(options.reason, "invalidation reason"),
    },
  ]);
  if (
    result.dryRun ||
    !result.events.some(
      (event) =>
        event.kind === "run.invalidated" &&
        event.aggregate.type === "run" &&
        event.aggregate.id === runId,
    )
  ) {
    return result;
  }
  return updateRunSessionPointer(result, () =>
    clearResearchSessionRun(root, runId),
  );
}

function updateRunSessionPointer(
  result: ResearchMutationResult,
  update: () => void,
): ResearchMutationResult {
  try {
    update();
    return result;
  } catch (error) {
    return {
      ...result,
      runtimeWarnings: [
        `Research ledger committed, but current_run session update failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
}

export async function createResearchEvidence(
  options: CreateResearchEvidenceOptions,
): Promise<ResearchMutationResult> {
  const id =
    options.id === undefined ? createEvidenceId() : parseEvidenceId(options.id);
  const runId =
    options.runId === undefined ? undefined : parseRunId(options.runId);
  return executeResearchMutations("evidence create", options, [
    {
      kind: "evidence.create",
      evidence: {
        id,
        questId: parseQuestId(options.questId),
        ...(runId === undefined ? {} : { runId }),
        summary: requireResearchText(options.summary, "evidence summary"),
        artifactRefs: [],
      },
    },
  ]);
}

export async function setResearchEvidenceStatus(
  options: SetResearchEvidenceStatusOptions,
): Promise<ResearchMutationResult> {
  return executeResearchMutations("evidence status", options, [
    {
      kind: "evidence.status",
      evidenceId: parseEvidenceId(options.evidenceId),
      status: parseEvidenceStatus(options.status),
    },
  ]);
}

export async function createResearchClaim(
  options: CreateResearchClaimOptions,
): Promise<ResearchMutationResult> {
  const id =
    options.id === undefined ? createClaimId() : parseClaimId(options.id);
  return executeResearchMutations("claim create", options, [
    {
      kind: "claim.create",
      claim: {
        id,
        questId: parseQuestId(options.questId),
        statement: requireResearchText(options.statement, "claim statement"),
        evidenceIds: (options.evidenceIds ?? []).map(parseEvidenceId),
      },
    },
  ]);
}

export async function setResearchClaimStatus(
  options: SetResearchClaimStatusOptions,
): Promise<ResearchMutationResult> {
  return executeResearchMutations("claim status", options, [
    {
      kind: "claim.status",
      claimId: parseClaimId(options.claimId),
      status: parseClaimStatus(options.status),
    },
  ]);
}

async function loadResearchStatus(
  command: ResearchStatusResult["command"],
  options: ResearchOutputOptions,
): Promise<ResearchStatusResult> {
  const root = resolveResearchRoot(options);
  const state = await readResearchState(root);
  const status = await getResearchStatus(root);
  return {
    command,
    initialized: state.workspace !== null,
    workspace: state.workspace,
    headSeq: status.headSeq,
    eventCount: status.eventCount,
    projectedThroughSeq: status.projectedThroughSeq,
    projectionStale: status.projectionStale,
    counts: {
      repositories: Object.keys(state.repositories).length,
      quests: Object.keys(state.quests).length,
      campaigns: Object.keys(state.campaigns).length,
      runs: Object.keys(state.runs).length,
      evidence: Object.keys(state.evidence).length,
      claims: Object.keys(state.claims).length,
      dispatches: Object.keys(state.dispatches).length,
      results: Object.keys(state.results).length,
      proposals: Object.keys(state.proposals).length,
      decisions: Object.keys(state.decisions).length,
    },
  };
}

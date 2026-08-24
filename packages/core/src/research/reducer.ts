import { proposalStatusForDecision } from "./dispatch.js";
import {
  cloneResearchActivation,
  cloneResearchApprovalGrant,
  getResearchActivationPackageDigest,
  getResearchApprovalPackageDigest,
  isExecutionPackageActivation,
  isExecutionPackageApprovalGrant,
} from "./execution-package-bindings.js";
import { validateArtifactRepositories } from "./repositories.js";
import { sameResearchExecutionPackageIdentity } from "./workflow.js";
import {
  assertScientificGateCoversUniverse,
  getCurrentQuestScientificUniverse,
  isScientificGateCurrentForUniverse,
  parseQuestExportRecord,
  parseQuestImportMilestone,
  parseQuestImportRecord,
  parseQuestRouteSnapshot,
  parseQuestScientificUniverse,
  parseQuestWriterTransfer,
  questImportMilestoneRelatedRefs,
  questImportRelatedRefs,
  questRouteRelatedRefs,
  questScientificUniverseRelatedRefs,
  questScientificUniverseScopeKey,
} from "./quest-cutover.js";
import {
  parseScientificGateRecord,
  scientificGateScopeKey,
} from "./scientific-gate.js";
import {
  assertCampaignStatusTransition,
  assertClaimStatusTransition,
  assertEvidenceStatusTransition,
  assertQuestStatusTransition,
  assertRunInvalidation,
  assertRunStatusTransition,
} from "./transitions.js";
import type {
  ApprovalId,
  ArtifactRef,
  Campaign,
  CampaignStatus,
  Claim,
  ClaimStatus,
  Decision,
  Dispatch,
  Evidence,
  EvidenceStatus,
  Proposal,
  Quest,
  QuestStage,
  QuestStatus,
  Repository,
  ResearchActivation,
  ResearchAggregateType,
  ResearchApprovalGrant,
  ResearchEvent,
  ResearchSchemaV2AggregateRef,
  ResearchSchemaV2Event,
  ResearchSchemaV3AggregateRef,
  ResearchSchemaV3Event,
  ResearchState,
  ResearchWorkflowInstance,
  Result,
  ScientificGateRecord,
  Run,
  RunStatus,
  WorkflowBindPayload,
  WorkflowClosePayload,
  WorkflowNodeCompletePayload,
  WorkflowTransitionRecordPayload,
  Workspace,
} from "./types.js";

export function emptyResearchState(): ResearchState {
  return {
    workspace: null,
    repositories: {},
    artifacts: {},
    quests: {},
    campaigns: {},
    runs: {},
    evidence: {},
    claims: {},
    dispatches: {},
    results: {},
    proposals: {},
    decisions: {},
    activations: {},
    activationByDispatchId: {},
    approvals: {},
    approvalIdsByActivationId: {},
    workflowInstances: {},
    workflowInstanceIdsByQuestId: {},
    activeWorkflowByQuestId: {},
    scientificGateRecords: {},
    scientificGateRecordIdsByWorkflowInstanceId: {},
    effectiveScientificGateRecordIdByScope: {},
    questImportRecords: {},
    questImportRecordIdsByQuestId: {},
    latestQuestImportRecordIdByQuestId: {},
    questRouteSnapshots: {},
    latestQuestRouteSnapshotIdByQuestId: {},
    questScientificUniverses: {},
    latestQuestScientificUniverseIdByScope: {},
    questImportMilestones: {},
    questImportMilestoneIdsByQuestId: {},
    questWriterTransfers: {},
    questWriterTransferIdsByQuestId: {},
    questWriterAuthorityByQuestId: {},
    questExportRecords: {},
    questExportRecordIdsByQuestId: {},
    entitySeq: {},
    projectedThroughSeq: 0,
    updatedAt: null,
  };
}

export function reduceResearchEvents(
  events: readonly ResearchEvent[],
): ResearchState {
  const state = emptyResearchState();
  const eventIds = new Set<string>();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!event) continue;
    const expectedSeq = index + 1;
    if (event.seq !== expectedSeq) {
      throw new Error(
        `Invalid research event sequence: expected ${expectedSeq}, received ${event.seq}`,
      );
    }
    if (eventIds.has(event.eventId)) {
      throw new Error(`Duplicate research eventId '${event.eventId}'`);
    }
    eventIds.add(event.eventId);
    if (event.kind === "approval.consumed") {
      assertApprovalConsumptionAdjacency(events, index, event);
    }
    applyEvent(state, event);
    state.projectedThroughSeq = event.seq;
    state.updatedAt = event.timestamp;
  }
  return state;
}

function sameAuthorityEnvelope(
  left: ResearchEvent,
  right: ResearchEvent,
): boolean {
  return (
    left.timestamp === right.timestamp &&
    left.idempotencyKey === right.idempotencyKey &&
    left.actor.type === right.actor.type &&
    left.actor.id === right.actor.id &&
    left.provenance.source === right.provenance.source &&
    left.provenance.sourceId === right.provenance.sourceId
  );
}

function assertApprovalConsumptionAdjacency(
  events: readonly ResearchEvent[],
  index: number,
  consumption: ResearchSchemaV2Event,
): void {
  const resultEvent = events[index - 2];
  const proposalEvent = events[index - 1];
  if (
    resultEvent?.kind !== "result.recorded" ||
    proposalEvent?.kind !== "proposal.recorded"
  ) {
    throw new Error(
      "approval.consumed must immediately follow matching Result and Proposal events",
    );
  }
  const result = resultEvent.payload.result as Result;
  const proposal = proposalEvent.payload.proposal as Proposal;
  if (
    result.id !== consumption.payload.resultId ||
    proposal.id !== consumption.payload.proposalId ||
    result.dispatchId !== proposal.dispatchId
  ) {
    throw new Error(
      "approval.consumed must match the immediately preceding Result and Proposal",
    );
  }
  if (
    !sameAuthorityEnvelope(resultEvent, proposalEvent) ||
    !sameAuthorityEnvelope(proposalEvent, consumption)
  ) {
    throw new Error(
      "Result, Proposal, and approval consumption must share timestamp, actor, provenance, and idempotency key",
    );
  }
}

function assertAggregate(
  event: ResearchEvent,
  type: ResearchAggregateType,
  id: string,
): void {
  if (event.aggregate.type !== type || event.aggregate.id !== id) {
    throw new Error(
      `${event.kind} aggregate must be ${type}:${id}, received ${event.aggregate.type}:${event.aggregate.id}`,
    );
  }
}

function requireWorkspace(state: ResearchState): Workspace {
  if (!state.workspace)
    throw new Error("Research workspace has not been created");
  return state.workspace;
}

function requireEntity<T>(
  values: Readonly<Record<string, T>>,
  id: string,
  kind: string,
): T {
  const value = values[id];
  if (!value) throw new Error(`Unknown research ${kind} '${id}'`);
  return value;
}

function mark(state: ResearchState, key: string, event: ResearchEvent): void {
  state.entitySeq[key] = event.seq;
}

function touchWorkspace(state: ResearchState, event: ResearchEvent): Workspace {
  const workspace = requireWorkspace(state);
  workspace.updatedAt = event.timestamp;
  mark(state, "workspace", event);
  return workspace;
}

function assertSchemaV2Aggregate(
  event: ResearchSchemaV2Event,
  type: "activation" | "approval",
  id: string,
): void {
  if (event.aggregate.type !== type || event.aggregate.id !== id) {
    throw new Error(
      `${event.kind} aggregate must be ${type}:${id}, received ${event.aggregate.type}:${event.aggregate.id}`,
    );
  }
}

function assertSchemaV2Related(
  event: ResearchSchemaV2Event,
  expected: readonly ResearchSchemaV2AggregateRef[],
): void {
  if (
    event.related.length !== expected.length ||
    expected.some((ref, index) => {
      const actual = event.related[index];
      return actual?.type !== ref.type || actual.id !== ref.id;
    })
  ) {
    throw new Error(`${event.kind} related refs do not match canonical state`);
  }
}

function assertSchemaV3Aggregate(
  event: ResearchSchemaV3Event,
  type: "workflow" | "scientific-gate",
  id: string,
): void {
  if (event.aggregate.type !== type || event.aggregate.id !== id) {
    throw new Error(
      `${event.kind} aggregate must be ${type}:${id}, received ${event.aggregate.type}:${event.aggregate.id}`,
    );
  }
}

function assertSchemaV3Related(
  event: ResearchSchemaV3Event,
  expected: readonly ResearchSchemaV3AggregateRef[],
): void {
  if (
    event.related.length !== expected.length ||
    expected.some((ref, index) => {
      const actual = event.related[index];
      return actual?.type !== ref.type || actual.id !== ref.id;
    })
  ) {
    throw new Error(`${event.kind} related refs do not match canonical state`);
  }
}

function dispatchHasResult(state: ResearchState, dispatchId: string): boolean {
  return Object.values(state.results).some(
    (result) => result.dispatchId === dispatchId,
  );
}

function dispatchHasProposal(
  state: ResearchState,
  dispatchId: string,
): boolean {
  return Object.values(state.proposals).some(
    (proposal) => proposal.dispatchId === dispatchId,
  );
}

function assertWorkflowBinding(
  instance: ResearchWorkflowInstance,
  payload:
    | WorkflowNodeCompletePayload
    | WorkflowTransitionRecordPayload
    | WorkflowClosePayload
    | ScientificGateRecord,
): void {
  if (
    payload.questId !== instance.questId ||
    payload.workflowId !== instance.workflowId ||
    payload.workflowVersion !== instance.workflowVersion ||
    payload.workflowDigest !== instance.workflowDigest
  ) {
    throw new Error(
      `Workflow event binding does not match instance '${instance.workflowInstanceId}'`,
    );
  }
}

function artifactBelongsToQuest(
  state: ResearchState,
  questId: string,
  artifactId: string,
): boolean {
  const quest = state.quests[questId as keyof typeof state.quests];
  if (quest?.artifactRefs.some((artifact) => artifact.id === artifactId))
    return true;
  if (
    Object.values(state.evidence).some(
      (evidence) =>
        evidence.questId === questId &&
        evidence.artifactRefs.some((artifact) => artifact.id === artifactId),
    )
  ) {
    return true;
  }
  return Object.values(state.results).some((result) => {
    const dispatch = state.dispatches[result.dispatchId];
    return (
      dispatch?.questId === questId &&
      result.artifactRefs.some((artifact) => artifact.id === artifactId)
    );
  });
}

function assertManagedWorkflowCompletion(
  state: ResearchState,
  instance: ResearchWorkflowInstance,
  payload: WorkflowNodeCompletePayload,
): void {
  const resultRefs = payload.acceptedRefs.filter((ref) => ref.kind === "result");
  if (payload.executionProfile === "lightweight") {
    if (resultRefs.length > 0) {
      throw new Error(
        "Workflow completion with accepted Result evidence requires the managed profile",
      );
    }
    return;
  }
  if (resultRefs.length === 0) {
    throw new Error(
      "Managed Workflow completion requires accepted Result evidence",
    );
  }
  const producedArtifactIds = new Set<string>();
  for (const ref of resultRefs) {
    const result = requireEntity(state.results, ref.id, "result");
    for (const artifact of result.artifactRefs) {
      producedArtifactIds.add(artifact.id);
    }
    const dispatch = requireEntity(
      state.dispatches,
      result.dispatchId,
      "dispatch",
    );
    const activationId = state.activationByDispatchId[dispatch.id];
    const activation =
      activationId === undefined
        ? undefined
        : state.activations[activationId];
    if (
      activation?.dispatchId !== dispatch.id ||
      !isExecutionPackageActivation(activation) ||
      activation.managedExecution.executionProfile !== "managed" ||
      !sameResearchExecutionPackageIdentity(
        activation.executionPackage,
        payload.executionPackage,
      )
    ) {
      throw new Error(
        `Result '${result.id}' does not resolve to the managed Workflow execution package`,
      );
    }
    const workflow = activation.managedExecution.workflow;
    if (
      workflow !== undefined &&
      (workflow.workflowInstanceId !== instance.workflowInstanceId ||
        workflow.workflowId !== instance.workflowId ||
        workflow.workflowVersion !== instance.workflowVersion ||
        workflow.workflowDigest !== instance.workflowDigest ||
        workflow.nodeId !== payload.nodeId)
    ) {
      throw new Error(
        `Result '${result.id}' Activation Workflow binding does not match the current node`,
      );
    }
    const approvals = (state.approvalIdsByActivationId[activation.id] ?? [])
      .map((id) => state.approvals[id])
      .filter(
        (approval) =>
          approval?.status === "consumed" && approval.resultId === result.id,
      );
    if (approvals.length !== 1) {
      throw new Error(
        `Result '${result.id}' must resolve to exactly one consumed Approval`,
      );
    }
    const approval = approvals[0];
    if (
      approval?.status !== "consumed" ||
      !isExecutionPackageApprovalGrant(approval.grant) ||
      approval.grant.activationId !== activation.id ||
      approval.grant.dispatchId !== dispatch.id ||
      approval.grant.executionPackageDigest !==
        activation.executionPackage.packageDigest ||
      approval.grant.requestDigest !== activation.requestDigest ||
      approval.grant.policyDigest !== activation.policyDigest ||
      approval.grant.scopeHash !== activation.scopeHash ||
      approval.resultId !== (`res_${approval.grant.id.slice(4)}` as Result["id"]) ||
      approval.proposalId !==
        (`prp_${approval.grant.id.slice(4)}` as Proposal["id"])
    ) {
      throw new Error(
        `Result '${result.id}' consumed Approval bindings do not match its Activation`,
      );
    }
    const proposal = requireEntity(
      state.proposals,
      approval.proposalId,
      "proposal",
    );
    if (
      proposal.dispatchId !== dispatch.id ||
      proposal.questId !== instance.questId
    ) {
      throw new Error(
        `Result '${result.id}' Proposal does not match the managed Workflow Quest`,
      );
    }
  }
  for (const ref of payload.acceptedRefs) {
    if (ref.kind === "artifact" && !producedArtifactIds.has(ref.id)) {
      throw new Error(
        `Artifact '${ref.id}' was not produced by an accepted managed Result`,
      );
    }
  }
}

function applyEvent(state: ResearchState, event: ResearchEvent): void {
  switch (event.kind) {
    case "workspace.created": {
      if (state.workspace) throw new Error("Research workspace already exists");
      const workspace = event.payload.workspace as Workspace;
      assertAggregate(event, "workspace", workspace.id);
      if (
        workspace.questIds.length > 0 ||
        workspace.campaignIds.length > 0 ||
        workspace.repositoryIds.length > 0
      ) {
        throw new Error(
          "A new research workspace must start with empty indexes",
        );
      }
      state.workspace = { ...workspace };
      mark(state, "workspace", event);
      return;
    }
    case "repository.registered": {
      const repository = event.payload.repository as Repository;
      assertAggregate(event, "repository", repository.id);
      if (state.repositories[repository.id]) {
        throw new Error(
          `Research repository '${repository.id}' already exists`,
        );
      }
      state.repositories[repository.id] = { ...repository };
      const workspace = touchWorkspace(state, event);
      workspace.repositoryIds = [...workspace.repositoryIds, repository.id];
      mark(state, "repositories", event);
      return;
    }
    case "artifact.registered": {
      const artifact = event.payload.artifact as ArtifactRef;
      assertAggregate(event, "artifact", artifact.id);
      requireEntity(state.repositories, artifact.repositoryId, "repository");
      if (state.artifacts[artifact.id]) {
        throw new Error(`Research artifact '${artifact.id}' already exists`);
      }
      state.artifacts[artifact.id] = { ...artifact };
      mark(state, "repositories", event);
      return;
    }
    case "quest.created": {
      const quest = event.payload.quest as Quest;
      assertAggregate(event, "quest", quest.id);
      requireWorkspace(state);
      if (state.quests[quest.id]) {
        throw new Error(`Research quest '${quest.id}' already exists`);
      }
      if (quest.status !== "active" || quest.stage !== "setup") {
        throw new Error(
          "A new research quest must start active at setup stage",
        );
      }
      for (const repositoryId of quest.repositoryIds) {
        requireEntity(state.repositories, repositoryId, "repository");
      }
      validateArtifactRepositories(quest.artifactRefs, state.repositories);
      state.quests[quest.id] = { ...quest };
      const workspace = touchWorkspace(state, event);
      workspace.questIds = [...workspace.questIds, quest.id];
      mark(state, quest.id, event);
      return;
    }
    case "quest.status_changed": {
      const quest = requireEntity(state.quests, event.aggregate.id, "quest");
      assertAggregate(event, "quest", quest.id);
      const status = event.payload.status as QuestStatus;
      assertQuestStatusTransition(quest.status, status);
      quest.status = status;
      quest.updatedAt = event.timestamp;
      mark(state, quest.id, event);
      return;
    }
    case "quest.stage_changed": {
      const quest = requireEntity(state.quests, event.aggregate.id, "quest");
      assertAggregate(event, "quest", quest.id);
      if (quest.status === "completed" || quest.status === "abandoned") {
        throw new Error(`Terminal quest '${quest.id}' is immutable`);
      }
      quest.stage = event.payload.stage as QuestStage;
      quest.updatedAt = event.timestamp;
      mark(state, quest.id, event);
      return;
    }
    case "campaign.created": {
      const campaign = event.payload.campaign as Campaign;
      assertAggregate(event, "campaign", campaign.id);
      requireEntity(state.quests, campaign.questId, "quest");
      if (state.campaigns[campaign.id]) {
        throw new Error(`Research campaign '${campaign.id}' already exists`);
      }
      if (campaign.status !== "draft" || campaign.runIds.length > 0) {
        throw new Error("A new research campaign must start as an empty draft");
      }
      state.campaigns[campaign.id] = { ...campaign };
      const workspace = touchWorkspace(state, event);
      workspace.campaignIds = [...workspace.campaignIds, campaign.id];
      mark(state, campaign.id, event);
      return;
    }
    case "campaign.protocol_updated": {
      const campaign = requireEntity(
        state.campaigns,
        event.aggregate.id,
        "campaign",
      );
      assertAggregate(event, "campaign", campaign.id);
      if (campaign.status !== "draft") {
        throw new Error(
          `Campaign '${campaign.id}' protocol is immutable after frozen`,
        );
      }
      campaign.protocolDigest = event.payload.protocolDigest as string;
      campaign.updatedAt = event.timestamp;
      mark(state, campaign.id, event);
      return;
    }
    case "campaign.frozen": {
      const campaign = requireEntity(
        state.campaigns,
        event.aggregate.id,
        "campaign",
      );
      assertAggregate(event, "campaign", campaign.id);
      if (campaign.protocolDigest.trim().length === 0) {
        throw new Error(
          `Campaign '${campaign.id}' requires a protocol digest before freeze`,
        );
      }
      assertCampaignStatusTransition(campaign.status, "frozen");
      campaign.status = "frozen";
      campaign.updatedAt = event.timestamp;
      mark(state, campaign.id, event);
      return;
    }
    case "campaign.status_changed": {
      const campaign = requireEntity(
        state.campaigns,
        event.aggregate.id,
        "campaign",
      );
      assertAggregate(event, "campaign", campaign.id);
      const status = event.payload.status as CampaignStatus;
      if (status === "frozen") {
        throw new Error(
          "Campaign freeze must use the explicit freeze mutation",
        );
      }
      assertCampaignStatusTransition(campaign.status, status);
      campaign.status = status;
      campaign.updatedAt = event.timestamp;
      mark(state, campaign.id, event);
      return;
    }
    case "run.created": {
      const run = event.payload.run as Run;
      assertAggregate(event, "run", run.id);
      const campaign = requireEntity(
        state.campaigns,
        run.campaignId,
        "campaign",
      );
      if (state.runs[run.id])
        throw new Error(`Research run '${run.id}' already exists`);
      if (run.status !== "planned") {
        throw new Error("A new research run must start as planned");
      }
      state.runs[run.id] = { ...run };
      campaign.runIds = [...campaign.runIds, run.id];
      campaign.updatedAt = event.timestamp;
      mark(state, campaign.id, event);
      mark(state, run.id, event);
      return;
    }
    case "run.status_changed": {
      const run = requireEntity(state.runs, event.aggregate.id, "run");
      assertAggregate(event, "run", run.id);
      const status = event.payload.status as RunStatus;
      if (status === "invalidated") {
        throw new Error(
          "Run invalidation must use the explicit invalidate mutation",
        );
      }
      assertRunStatusTransition(run.status, status);
      run.status = status;
      run.updatedAt = event.timestamp;
      mark(state, run.id, event);
      return;
    }
    case "run.invalidated": {
      const run = requireEntity(state.runs, event.aggregate.id, "run");
      assertAggregate(event, "run", run.id);
      assertRunInvalidation(run.status);
      run.status = "invalidated";
      run.invalidationReason = event.payload.reason as string;
      run.updatedAt = event.timestamp;
      mark(state, run.id, event);
      return;
    }
    case "evidence.created": {
      const evidence = event.payload.evidence as Evidence;
      assertAggregate(event, "evidence", evidence.id);
      requireEntity(state.quests, evidence.questId, "quest");
      if (evidence.runId) requireEntity(state.runs, evidence.runId, "run");
      validateArtifactRepositories(evidence.artifactRefs, state.repositories);
      if (state.evidence[evidence.id]) {
        throw new Error(`Research evidence '${evidence.id}' already exists`);
      }
      if (evidence.status !== "active") {
        throw new Error("New research evidence must start active");
      }
      state.evidence[evidence.id] = { ...evidence };
      mark(state, evidence.id, event);
      return;
    }
    case "evidence.status_changed": {
      const evidence = requireEntity(
        state.evidence,
        event.aggregate.id,
        "evidence",
      );
      assertAggregate(event, "evidence", evidence.id);
      const status = event.payload.status as EvidenceStatus;
      assertEvidenceStatusTransition(evidence.status, status);
      evidence.status = status;
      evidence.updatedAt = event.timestamp;
      mark(state, evidence.id, event);
      return;
    }
    case "claim.created": {
      const claim = event.payload.claim as Claim;
      assertAggregate(event, "claim", claim.id);
      requireEntity(state.quests, claim.questId, "quest");
      for (const evidenceId of claim.evidenceIds) {
        requireEntity(state.evidence, evidenceId, "evidence");
      }
      if (state.claims[claim.id]) {
        throw new Error(`Research claim '${claim.id}' already exists`);
      }
      if (claim.status !== "candidate") {
        throw new Error("New research claims must start as candidates");
      }
      state.claims[claim.id] = { ...claim };
      mark(state, claim.id, event);
      return;
    }
    case "claim.status_changed": {
      const claim = requireEntity(state.claims, event.aggregate.id, "claim");
      assertAggregate(event, "claim", claim.id);
      const status = event.payload.status as ClaimStatus;
      assertClaimStatusTransition(claim.status, status);
      claim.status = status;
      claim.updatedAt = event.timestamp;
      mark(state, claim.id, event);
      return;
    }
    case "dispatch.recorded": {
      const dispatch = event.payload.dispatch as Dispatch;
      assertAggregate(event, "dispatch", dispatch.id);
      const quest = requireEntity(state.quests, dispatch.questId, "quest");
      const run = requireEntity(state.runs, dispatch.runId, "run");
      const campaign = requireEntity(
        state.campaigns,
        run.campaignId,
        "campaign",
      );
      requireEntity(state.repositories, dispatch.repositoryId, "repository");
      if (campaign.questId !== quest.id) {
        throw new Error(
          `Dispatch quest '${quest.id}' does not match run campaign quest '${campaign.questId}'`,
        );
      }
      if (
        dispatch.campaignId !== undefined &&
        dispatch.campaignId !== campaign.id
      ) {
        throw new Error(
          `Dispatch campaign '${dispatch.campaignId}' does not match run campaign '${campaign.id}'`,
        );
      }
      if (state.dispatches[dispatch.id]) {
        throw new Error(`Research dispatch '${dispatch.id}' already exists`);
      }
      if (run.status !== "planned" && run.status !== "running") {
        throw new Error(`Terminal run '${run.id}' is immutable`);
      }
      if (run.dispatchId)
        throw new Error(`Run '${run.id}' already has a dispatch`);
      for (const context of dispatch.context) {
        if (context.artifact) {
          validateArtifactRepositories([context.artifact], state.repositories);
        }
      }
      state.dispatches[dispatch.id] = { ...dispatch };
      run.dispatchId = dispatch.id;
      run.updatedAt = event.timestamp;
      mark(state, dispatch.id, event);
      mark(state, run.id, event);
      return;
    }
    case "result.recorded": {
      const result = event.payload.result as Result;
      assertAggregate(event, "result", result.id);
      const dispatch = requireEntity(
        state.dispatches,
        result.dispatchId,
        "dispatch",
      );
      const run = requireEntity(state.runs, result.runId, "run");
      if (dispatch.runId !== run.id) {
        throw new Error(
          `Result run '${run.id}' does not match dispatch run '${dispatch.runId}'`,
        );
      }
      if (state.results[result.id]) {
        throw new Error(`Research result '${result.id}' already exists`);
      }
      if (run.status !== "planned" && run.status !== "running") {
        throw new Error(`Terminal run '${run.id}' is immutable`);
      }
      if (run.resultId) throw new Error(`Run '${run.id}' already has a result`);
      validateArtifactRepositories(result.artifactRefs, state.repositories);
      state.results[result.id] = { ...result };
      run.resultId = result.id;
      run.updatedAt = event.timestamp;
      mark(state, result.id, event);
      mark(state, run.id, event);
      return;
    }
    case "proposal.recorded": {
      const proposal = event.payload.proposal as Proposal;
      assertAggregate(event, "proposal", proposal.id);
      const dispatch = requireEntity(
        state.dispatches,
        proposal.dispatchId,
        "dispatch",
      );
      requireEntity(state.quests, proposal.questId, "quest");
      if (dispatch.questId !== proposal.questId) {
        throw new Error(
          `Proposal quest '${proposal.questId}' does not match dispatch quest '${dispatch.questId}'`,
        );
      }
      if (state.proposals[proposal.id]) {
        throw new Error(`Research proposal '${proposal.id}' already exists`);
      }
      if (
        Object.values(state.proposals).some(
          (existing) => existing.dispatchId === proposal.dispatchId,
        )
      ) {
        throw new Error(
          `Dispatch '${proposal.dispatchId}' already has a proposal`,
        );
      }
      if (proposal.status !== "pending") {
        throw new Error("New research proposals must start pending");
      }
      state.proposals[proposal.id] = { ...proposal };
      mark(state, proposal.id, event);
      return;
    }
    case "activation.planned": {
      const activation = event.payload.activation as ResearchActivation;
      assertSchemaV2Aggregate(event, "activation", activation.id);
      assertSchemaV2Related(event, [
        { type: "dispatch", id: activation.dispatchId },
        { type: "quest", id: activation.questId },
      ]);
      const dispatch = requireEntity(
        state.dispatches,
        activation.dispatchId,
        "dispatch",
      );
      const quest = requireEntity(state.quests, activation.questId, "quest");
      const run = requireEntity(state.runs, dispatch.runId, "run");
      const campaign = requireEntity(
        state.campaigns,
        run.campaignId,
        "campaign",
      );
      requireEntity(state.repositories, dispatch.repositoryId, "repository");
      if (
        dispatch.questId !== quest.id ||
        campaign.questId !== quest.id ||
        run.dispatchId !== dispatch.id ||
        (dispatch.campaignId !== undefined &&
          dispatch.campaignId !== campaign.id)
      ) {
        throw new Error(
          `Activation '${activation.id}' does not match its Dispatch hierarchy`,
        );
      }
      if (state.activations[activation.id]) {
        throw new Error(
          `Research activation '${activation.id}' already exists`,
        );
      }
      if (state.activationByDispatchId[dispatch.id]) {
        throw new Error(`Dispatch '${dispatch.id}' already has an activation`);
      }
      if (
        dispatchHasResult(state, dispatch.id) ||
        dispatchHasProposal(state, dispatch.id)
      ) {
        throw new Error(
          `Activation for Dispatch '${dispatch.id}' was planned too late`,
        );
      }
      if (activation.createdAt !== event.timestamp) {
        throw new Error("Activation createdAt must equal its event timestamp");
      }
      if (isExecutionPackageActivation(activation)) {
        const workflow = activation.managedExecution.workflow;
        if (workflow !== undefined) {
          const instance = requireEntity(
            state.workflowInstances,
            workflow.workflowInstanceId,
            "workflow instance",
          );
          if (
            instance.status !== "active" ||
            instance.questId !== activation.questId ||
            state.activeWorkflowByQuestId[activation.questId] !==
              instance.workflowInstanceId ||
            instance.workflowId !== workflow.workflowId ||
            instance.workflowVersion !== workflow.workflowVersion ||
            instance.workflowDigest !== workflow.workflowDigest ||
            instance.currentNodeId !== workflow.nodeId ||
            instance.nodeCompletions[workflow.nodeId] !== undefined
          ) {
            throw new Error(
              `Activation '${activation.id}' Workflow binding does not match the active current node`,
            );
          }
        }
      }
      state.activations[activation.id] = cloneResearchActivation(activation);
      state.activationByDispatchId[dispatch.id] = activation.id;
      return;
    }
    case "approval.granted": {
      const grant = event.payload.approval as ResearchApprovalGrant;
      const activation = requireEntity(
        state.activations,
        grant.activationId,
        "activation",
      );
      const dispatch = requireEntity(
        state.dispatches,
        grant.dispatchId,
        "dispatch",
      );
      const quest = requireEntity(state.quests, activation.questId, "quest");
      assertSchemaV2Aggregate(event, "approval", grant.id);
      assertSchemaV2Related(event, [
        { type: "activation", id: activation.id },
        { type: "dispatch", id: dispatch.id },
        { type: "quest", id: quest.id },
      ]);
      if (
        activation.dispatchId !== dispatch.id ||
        dispatch.questId !== quest.id ||
        state.activationByDispatchId[dispatch.id] !== activation.id
      ) {
        throw new Error(
          `Approval '${grant.id}' does not match its Activation hierarchy`,
        );
      }
      if (
        isExecutionPackageActivation(activation) !==
          isExecutionPackageApprovalGrant(grant) ||
        grant.requestDigest !== activation.requestDigest ||
        getResearchApprovalPackageDigest(grant) !==
          getResearchActivationPackageDigest(activation) ||
        grant.policyDigest !== activation.policyDigest ||
        grant.scopeHash !== activation.scopeHash
      ) {
        throw new Error(
          `Approval '${grant.id}' bindings do not match activation`,
        );
      }
      if (state.approvals[grant.id]) {
        throw new Error(`Research approval '${grant.id}' already exists`);
      }
      if (dispatchHasResult(state, dispatch.id)) {
        throw new Error(`Dispatch '${dispatch.id}' already has a result`);
      }
      if (grant.grantedAt !== event.timestamp) {
        throw new Error("Approval grantedAt must equal its event timestamp");
      }
      const expectedExpiry =
        Date.parse(grant.grantedAt) + activation.maxDurationMinutes * 60_000;
      if (
        !Number.isFinite(expectedExpiry) ||
        grant.expiresAt !== new Date(expectedExpiry).toISOString() ||
        expectedExpiry <= Date.parse(grant.grantedAt)
      ) {
        throw new Error(
          `Approval '${grant.id}' expiresAt does not match activation duration`,
        );
      }
      for (const approvalId of state.approvalIdsByActivationId[activation.id] ??
        []) {
        const existing = requireEntity(state.approvals, approvalId, "approval");
        if (
          existing.status === "granted" &&
          existing.grant.host === grant.host &&
          Date.parse(event.timestamp) < Date.parse(existing.grant.expiresAt)
        ) {
          throw new Error(
            `Activation '${activation.id}' already has a granted ${grant.host} approval`,
          );
        }
      }
      state.approvals[grant.id] = {
        grant: cloneResearchApprovalGrant(grant),
        status: "granted",
      };
      state.approvalIdsByActivationId[activation.id] = [
        ...(state.approvalIdsByActivationId[activation.id] ?? []),
        grant.id,
      ];
      return;
    }
    case "approval.revoked": {
      const approvalId = event.payload.approvalId as ApprovalId;
      const revokedAt = event.payload.revokedAt as string;
      const reason = event.payload.reason as string;
      const approval = requireEntity(state.approvals, approvalId, "approval");
      const activation = requireEntity(
        state.activations,
        approval.grant.activationId,
        "activation",
      );
      assertSchemaV2Aggregate(event, "approval", approvalId);
      assertSchemaV2Related(event, [
        { type: "activation", id: activation.id },
        { type: "dispatch", id: approval.grant.dispatchId },
      ]);
      if (approval.status !== "granted") {
        throw new Error(
          `Invalid approval transition: ${approval.status} -> revoked`,
        );
      }
      if (
        revokedAt !== event.timestamp ||
        Date.parse(revokedAt) < Date.parse(approval.grant.grantedAt)
      ) {
        throw new Error(
          "Approval revokedAt must equal a valid event timestamp",
        );
      }
      state.approvals[approvalId] = {
        grant: approval.grant,
        status: "revoked",
        revokedAt,
        revocationReason: reason,
      };
      return;
    }
    case "approval.consumed": {
      const approvalId = event.payload.approvalId as ApprovalId;
      const resultId = event.payload.resultId as Result["id"];
      const proposalId = event.payload.proposalId as Proposal["id"];
      const consumedAt = event.payload.consumedAt as string;
      const approval = requireEntity(state.approvals, approvalId, "approval");
      const activation = requireEntity(
        state.activations,
        approval.grant.activationId,
        "activation",
      );
      const dispatch = requireEntity(
        state.dispatches,
        approval.grant.dispatchId,
        "dispatch",
      );
      const result = requireEntity(state.results, resultId, "result");
      const proposal = requireEntity(state.proposals, proposalId, "proposal");
      assertSchemaV2Aggregate(event, "approval", approvalId);
      assertSchemaV2Related(event, [
        { type: "activation", id: activation.id },
        { type: "dispatch", id: dispatch.id },
        { type: "result", id: result.id },
        { type: "proposal", id: proposal.id },
      ]);
      if (approval.status !== "granted") {
        throw new Error(
          `Invalid approval transition: ${approval.status} -> consumed`,
        );
      }
      if (
        consumedAt !== event.timestamp ||
        Date.parse(event.timestamp) >= Date.parse(approval.grant.expiresAt)
      ) {
        throw new Error(`Approval '${approvalId}' is expired`);
      }
      if (
        activation.dispatchId !== dispatch.id ||
        result.dispatchId !== dispatch.id ||
        proposal.dispatchId !== dispatch.id ||
        proposal.questId !== activation.questId
      ) {
        throw new Error(
          `Approval '${approvalId}' consumption relations do not match canonical state`,
        );
      }
      state.approvals[approvalId] = {
        grant: approval.grant,
        status: "consumed",
        consumedAt,
        resultId,
        proposalId,
      };
      return;
    }
    case "quest.import.recorded": {
      const record = parseQuestImportRecord(event.payload);
      if (
        event.aggregate.type !== "quest-import" ||
        event.aggregate.id !== record.id
      ) {
        throw new Error(`quest.import.recorded aggregate must be quest-import:${record.id}`);
      }
      assertSchemaV3Related(event, questImportRelatedRefs(record));
      requireEntity(state.quests, record.questId, "quest");
      if (state.questImportRecords[record.id]) {
        throw new Error(`Quest import record '${record.id}' already exists`);
      }
      if (state.questWriterAuthorityByQuestId[record.questId]?.writer === "trellis") {
        throw new Error(`Quest '${record.questId}' is currently owned by the Trellis writer`);
      }
      for (const existing of Object.values(state.questImportRecords)) {
        const sameIdentity =
          existing.sourceIdentity.sourceQuestId === record.sourceIdentity.sourceQuestId &&
          existing.sourceIdentity.projectSlug === record.sourceIdentity.projectSlug &&
          existing.sourceIdentity.sourceQuestPath === record.sourceIdentity.sourceQuestPath &&
          existing.sourceIdentity.sourceEventsPath === record.sourceIdentity.sourceEventsPath;
        if (sameIdentity && existing.questId !== record.questId) {
          throw new Error("Quest source identity is already bound to another Quest");
        }
        if (existing.questId === record.questId && !sameIdentity) {
          throw new Error(`Quest '${record.questId}' has a conflicting source identity`);
        }
      }
      for (const artifactId of record.artifactIds) {
        requireEntity(state.artifacts, artifactId, "artifact");
        if (!artifactBelongsToQuest(state, record.questId, artifactId)) {
          throw new Error(`Artifact '${artifactId}' does not belong to Quest '${record.questId}'`);
        }
      }
      for (const claimId of record.claimIds) {
        const claim = requireEntity(state.claims, claimId, "claim");
        if (claim.questId !== record.questId) {
          throw new Error(`Claim '${claimId}' does not belong to Quest '${record.questId}'`);
        }
      }
      if (record.importedAt !== event.timestamp) {
        throw new Error("Quest import importedAt must equal its event timestamp");
      }
      state.questImportRecords[record.id] = structuredClone(record);
      state.questImportRecordIdsByQuestId[record.questId] = [
        ...(state.questImportRecordIdsByQuestId[record.questId] ?? []),
        record.id,
      ];
      state.latestQuestImportRecordIdByQuestId[record.questId] = record.id;
      mark(state, record.id, event);
      mark(state, `quest-import:${record.questId}`, event);
      return;
    }
    case "quest.route.recorded": {
      const route = parseQuestRouteSnapshot(event.payload);
      if (event.aggregate.type !== "quest-route" || event.aggregate.id !== route.id) {
        throw new Error(`quest.route.recorded aggregate must be quest-route:${route.id}`);
      }
      assertSchemaV3Related(event, questRouteRelatedRefs(route));
      requireEntity(state.quests, route.questId, "quest");
      const importRecord = requireEntity(
        state.questImportRecords,
        route.importRecordId,
        "Quest import record",
      );
      if (
        importRecord.questId !== route.questId ||
        state.latestQuestImportRecordIdByQuestId[route.questId] !== route.importRecordId
      ) {
        throw new Error("Quest route must bind the current import record");
      }
      if (state.questRouteSnapshots[route.id]) {
        throw new Error(`Quest route snapshot '${route.id}' already exists`);
      }
      const artifactIds = [
        ...route.firstReadArtifactIds,
        ...route.ownerBindings.map((binding) => binding.artifactId),
        ...route.branches.flatMap((branch) =>
          branch.expectedArtifactId === undefined ? [] : [branch.expectedArtifactId],
        ),
        ...(route.currentDecision?.evidenceArtifactIds ?? []),
        ...(route.nextAction?.expectedArtifactId === undefined
          ? []
          : [route.nextAction.expectedArtifactId]),
      ];
      for (const artifactId of artifactIds) {
        requireEntity(state.artifacts, artifactId, "artifact");
        if (!artifactBelongsToQuest(state, route.questId, artifactId)) {
          throw new Error(`Artifact '${artifactId}' does not belong to Quest '${route.questId}'`);
        }
      }
      if (route.recordedAt !== event.timestamp) {
        throw new Error("Quest route recordedAt must equal its event timestamp");
      }
      state.questRouteSnapshots[route.id] = structuredClone(route);
      state.latestQuestRouteSnapshotIdByQuestId[route.questId] = route.id;
      mark(state, route.id, event);
      mark(state, `quest-route:${route.questId}`, event);
      return;
    }
    case "quest.scientific-universe.recorded": {
      const universe = parseQuestScientificUniverse(event.payload);
      if (
        event.aggregate.type !== "quest-scientific-universe" ||
        event.aggregate.id !== universe.id
      ) {
        throw new Error(
          `quest.scientific-universe.recorded aggregate must be quest-scientific-universe:${universe.id}`,
        );
      }
      assertSchemaV3Related(event, questScientificUniverseRelatedRefs(universe));
      const importRecord = requireEntity(
        state.questImportRecords,
        universe.importRecordId,
        "Quest import record",
      );
      if (
        importRecord.questId !== universe.questId ||
        state.latestQuestImportRecordIdByQuestId[universe.questId] !== universe.importRecordId ||
        importRecord.sourceSnapshot.snapshotDigest !== universe.sourceSnapshotDigest
      ) {
        throw new Error("Scientific universe must bind the current exact import snapshot");
      }
      if (state.questScientificUniverses[universe.id]) {
        throw new Error(`Quest scientific universe '${universe.id}' already exists`);
      }
      for (const artifactId of universe.sourceArtifactIds) {
        requireEntity(state.artifacts, artifactId, "artifact");
        if (!artifactBelongsToQuest(state, universe.questId, artifactId)) {
          throw new Error(`Artifact '${artifactId}' does not belong to Quest '${universe.questId}'`);
        }
      }
      if (universe.recordedAt !== event.timestamp) {
        throw new Error("Scientific universe recordedAt must equal its event timestamp");
      }
      state.questScientificUniverses[universe.id] = structuredClone(universe);
      state.latestQuestScientificUniverseIdByScope[
        questScientificUniverseScopeKey(universe.questId, universe.gateId)
      ] = universe.id;
      mark(state, universe.id, event);
      mark(state, `quest-scientific-universe:${universe.questId}`, event);
      return;
    }
    case "quest.import.milestone-recorded": {
      const milestone = parseQuestImportMilestone(event.payload);
      if (
        event.aggregate.type !== "quest-import-milestone" ||
        event.aggregate.id !== milestone.id
      ) {
        throw new Error(
          `quest.import.milestone-recorded aggregate must be quest-import-milestone:${milestone.id}`,
        );
      }
      assertSchemaV3Related(event, questImportMilestoneRelatedRefs(milestone));
      const importRecord = requireEntity(
        state.questImportRecords,
        milestone.importRecordId,
        "Quest import record",
      );
      if (
        importRecord.questId !== milestone.questId ||
        state.latestQuestImportRecordIdByQuestId[milestone.questId] !== milestone.importRecordId
      ) {
        throw new Error("Quest import milestone must bind the current import record");
      }
      if (state.questImportMilestones[milestone.id]) {
        throw new Error(`Quest import milestone '${milestone.id}' already exists`);
      }
      if (
        Object.values(state.questImportMilestones).some(
          (existing) =>
            existing.importRecordId === milestone.importRecordId &&
            existing.sourceEventId === milestone.sourceEventId,
        )
      ) {
        throw new Error(`Duplicate source Quest event ID '${milestone.sourceEventId}'`);
      }
      const previousId = [
        ...(state.questImportMilestoneIdsByQuestId[milestone.questId] ?? []),
      ]
        .reverse()
        .find(
          (id) =>
            state.questImportMilestones[id]?.importRecordId ===
            milestone.importRecordId,
        );
      const previous =
        previousId === undefined ? undefined : state.questImportMilestones[previousId];
      if (previous !== undefined && milestone.sourceLine <= previous.sourceLine) {
        throw new Error("Quest import milestones must preserve ascending source order");
      }
      for (const artifactId of [
        ...milestone.artifactIds,
        ...milestone.evidenceArtifactIds,
      ]) {
        requireEntity(state.artifacts, artifactId, "artifact");
        if (!artifactBelongsToQuest(state, milestone.questId, artifactId)) {
          throw new Error(`Artifact '${artifactId}' does not belong to Quest '${milestone.questId}'`);
        }
      }
      for (const claimId of milestone.claimIds) {
        const claim = requireEntity(state.claims, claimId, "claim");
        if (claim.questId !== milestone.questId) {
          throw new Error(`Claim '${claimId}' does not belong to Quest '${milestone.questId}'`);
        }
      }
      state.questImportMilestones[milestone.id] = structuredClone(milestone);
      state.questImportMilestoneIdsByQuestId[milestone.questId] = [
        ...(state.questImportMilestoneIdsByQuestId[milestone.questId] ?? []),
        milestone.id,
      ];
      mark(state, milestone.id, event);
      mark(state, `quest-import-milestone:${milestone.questId}`, event);
      return;
    }
    case "quest.export.recorded": {
      const record = parseQuestExportRecord(event.payload);
      if (event.aggregate.type !== "quest-export" || event.aggregate.id !== record.id) {
        throw new Error(`quest.export.recorded aggregate must be quest-export:${record.id}`);
      }
      assertSchemaV3Related(event, [{ type: "quest", id: record.questId }]);
      requireEntity(state.quests, record.questId, "quest");
      const importId = state.latestQuestImportRecordIdByQuestId[record.questId];
      const importRecord =
        importId === undefined ? undefined : state.questImportRecords[importId];
      if (
        state.questWriterAuthorityByQuestId[record.questId]?.writer !== "trellis" ||
        importRecord?.sourceSnapshot.snapshotDigest !== record.sourceSnapshotDigest
      ) {
        throw new Error("Quest export must validate the current Trellis-owned import snapshot");
      }
      if (state.questExportRecords[record.id]) {
        throw new Error(`Quest export record '${record.id}' already exists`);
      }
      if (record.recordedAt !== event.timestamp) {
        throw new Error("Quest export recordedAt must equal its event timestamp");
      }
      state.questExportRecords[record.id] = structuredClone(record);
      state.questExportRecordIdsByQuestId[record.questId] = [
        ...(state.questExportRecordIdsByQuestId[record.questId] ?? []),
        record.id,
      ];
      mark(state, record.id, event);
      mark(state, `quest-export:${record.questId}`, event);
      return;
    }
    case "quest-writer.transferred": {
      const transfer = parseQuestWriterTransfer(event.payload);
      if (event.aggregate.type !== "quest-writer" || event.aggregate.id !== transfer.id) {
        throw new Error(
          `quest-writer.transferred aggregate must be quest-writer:${transfer.id}`,
        );
      }
      assertSchemaV3Related(event, [{ type: "quest", id: transfer.questId }]);
      requireEntity(state.quests, transfer.questId, "quest");
      if (state.questWriterTransfers[transfer.id]) {
        throw new Error(`Quest writer transfer '${transfer.id}' already exists`);
      }
      const currentWriter =
        state.questWriterAuthorityByQuestId[transfer.questId]?.writer ?? "source";
      if (currentWriter !== transfer.from) {
        throw new Error(
          `Quest writer transfer expected ${currentWriter} as current writer, received ${transfer.from}`,
        );
      }
      const importId = state.latestQuestImportRecordIdByQuestId[transfer.questId];
      const importRecord =
        importId === undefined ? undefined : state.questImportRecords[importId];
      if (importRecord?.sourceSnapshot.snapshotDigest !== transfer.sourceSnapshotDigest) {
        throw new Error("Quest writer transfer does not match the current import snapshot");
      }
      if (transfer.to === "source") {
        const exportId = state.questExportRecordIdsByQuestId[transfer.questId]?.at(-1);
        const exportRecord =
          exportId === undefined ? undefined : state.questExportRecords[exportId];
        if (
          transfer.exportDigest === undefined ||
          exportRecord?.exportDigest !== transfer.exportDigest ||
          exportRecord.sourceSnapshotDigest !== transfer.sourceSnapshotDigest
        ) {
          throw new Error("Transfer to source requires the current validated export");
        }
        const exportSeq = state.entitySeq[exportRecord.id];
        const currentRouteId =
          state.latestQuestRouteSnapshotIdByQuestId[transfer.questId];
        const mappedEntityIds = [
          transfer.questId,
          ...(importId === undefined ? [] : [importId]),
          ...(currentRouteId === undefined ? [] : [currentRouteId]),
          ...importRecord.claimIds,
          ...Object.values(state.questScientificUniverses)
            .filter(
              (universe) =>
                universe.questId === transfer.questId &&
                universe.importRecordId === importId,
            )
            .map((universe) => universe.id),
          ...Object.values(state.questImportMilestones)
            .filter(
              (milestone) =>
                milestone.questId === transfer.questId &&
                milestone.importRecordId === importId,
            )
            .map((milestone) => milestone.id),
        ];
        if (
          exportSeq === undefined ||
          mappedEntityIds.some(
            (id) =>
              (state.entitySeq[id] ?? Number.POSITIVE_INFINITY) > exportSeq,
          )
        ) {
          throw new Error("Transfer to source requires a current mapped-state export");
        }
      } else if (transfer.exportDigest !== undefined) {
        throw new Error("Transfer to Trellis must not claim validated export evidence");
      }
      if (transfer.recordedAt !== event.timestamp) {
        throw new Error("Quest writer transfer recordedAt must equal its event timestamp");
      }
      state.questWriterTransfers[transfer.id] = structuredClone(transfer);
      state.questWriterTransferIdsByQuestId[transfer.questId] = [
        ...(state.questWriterTransferIdsByQuestId[transfer.questId] ?? []),
        transfer.id,
      ];
      state.questWriterAuthorityByQuestId[transfer.questId] = {
        questId: transfer.questId,
        writer: transfer.to,
        sourceSnapshotDigest: transfer.sourceSnapshotDigest,
        recordedEventId: event.eventId,
      };
      mark(state, transfer.id, event);
      mark(state, `quest-writer:${transfer.questId}`, event);
      return;
    }
    case "workflow.bound": {
      const payload = event.payload as unknown as WorkflowBindPayload;
      requireEntity(state.quests, payload.questId, "quest");
      if (state.workflowInstances[payload.workflowInstanceId]) {
        throw new Error(
          `Research workflow instance '${payload.workflowInstanceId}' already exists`,
        );
      }
      if (state.activeWorkflowByQuestId[payload.questId]) {
        throw new Error(
          `Quest '${payload.questId}' already has an active Workflow`,
        );
      }
      if (payload.boundAt !== event.timestamp) {
        throw new Error("Workflow boundAt must equal its event timestamp");
      }
      const instance: ResearchWorkflowInstance = {
        workflowInstanceId: payload.workflowInstanceId,
        questId: payload.questId,
        workflowId: payload.workflowId,
        workflowVersion: payload.workflowVersion,
        workflowDigest: payload.workflowDigest,
        startNodeId: payload.startNodeId,
        currentNodeId: payload.startNodeId,
        status: "active",
        boundAt: payload.boundAt,
        nodeCompletions: {},
        transitions: [],
        updatedAt: event.timestamp,
      };
      state.workflowInstances[payload.workflowInstanceId] = instance;
      state.workflowInstanceIdsByQuestId[payload.questId] = [
        ...(state.workflowInstanceIdsByQuestId[payload.questId] ?? []),
        payload.workflowInstanceId,
      ];
      state.activeWorkflowByQuestId[payload.questId] =
        payload.workflowInstanceId;
      mark(state, payload.workflowInstanceId, event);
      mark(state, `workflow:${payload.questId}`, event);
      return;
    }
    case "workflow.node_completed": {
      const payload = event.payload as unknown as WorkflowNodeCompletePayload;
      const instance = requireEntity(
        state.workflowInstances,
        payload.workflowInstanceId,
        "workflow instance",
      );
      assertWorkflowBinding(instance, payload);
      if (instance.status !== "active") {
        throw new Error(
          `Workflow instance '${instance.workflowInstanceId}' is closed`,
        );
      }
      if (payload.nodeId !== instance.currentNodeId) {
        throw new Error(
          `Workflow completion node '${payload.nodeId}' is not current node '${instance.currentNodeId}'`,
        );
      }
      if (instance.nodeCompletions[payload.nodeId]) {
        throw new Error(
          `Workflow node '${payload.nodeId}' is already completed`,
        );
      }
      assertManagedWorkflowCompletion(state, instance, payload);
      if (payload.completedAt !== event.timestamp) {
        throw new Error("Workflow completedAt must equal its event timestamp");
      }
      for (const ref of payload.acceptedRefs) {
        if (ref.kind === "result") {
          const result = requireEntity(state.results, ref.id, "result");
          const dispatch = requireEntity(
            state.dispatches,
            result.dispatchId,
            "dispatch",
          );
          if (dispatch.questId !== instance.questId) {
            throw new Error(
              `Result '${ref.id}' does not belong to Quest '${instance.questId}'`,
            );
          }
        } else {
          requireEntity(state.artifacts, ref.id, "artifact");
          if (!artifactBelongsToQuest(state, instance.questId, ref.id)) {
            throw new Error(
              `Artifact '${ref.id}' does not belong to Quest '${instance.questId}'`,
            );
          }
        }
      }
      instance.nodeCompletions[payload.nodeId] = {
        ...payload,
        executionPackage: { ...payload.executionPackage },
        acceptedRefs: payload.acceptedRefs.map((ref) => ({ ...ref })),
      };
      instance.updatedAt = event.timestamp;
      mark(state, instance.workflowInstanceId, event);
      mark(state, `workflow:${instance.questId}`, event);
      return;
    }
    case "scientific-gate.recorded": {
      const record = parseScientificGateRecord(event.payload);
      assertSchemaV3Aggregate(event, "scientific-gate", record.id);
      assertSchemaV3Related(event, [
        { type: "quest", id: record.questId },
        { type: "workflow", id: record.workflowInstanceId },
        ...record.evidenceRefs.map((id) => ({
          type: "artifact" as const,
          id,
        })),
      ]);
      const instance = requireEntity(
        state.workflowInstances,
        record.workflowInstanceId,
        "workflow instance",
      );
      assertWorkflowBinding(instance, record);
      if (instance.status !== "active") {
        throw new Error(
          `Workflow instance '${instance.workflowInstanceId}' is closed`,
        );
      }
      if (record.nodeId !== instance.currentNodeId) {
        throw new Error(
          `Scientific gate node '${record.nodeId}' is not current node '${instance.currentNodeId}'`,
        );
      }
      const completion = instance.nodeCompletions[record.nodeId];
      if (!completion) {
        throw new Error(
          "Scientific gate requires the current node to be completed",
        );
      }
      if (state.scientificGateRecords[record.id]) {
        throw new Error(`Scientific gate record '${record.id}' already exists`);
      }
      if (record.recordedAt !== event.timestamp) {
        throw new Error(
          "Scientific gate recordedAt must equal its event timestamp",
        );
      }
      const acceptedArtifactIds = new Set(
        completion.acceptedRefs
          .filter((ref) => ref.kind === "artifact")
          .map((ref) => ref.id),
      );
      for (const artifactId of record.evidenceRefs) {
        requireEntity(state.artifacts, artifactId, "artifact");
        if (!artifactBelongsToQuest(state, instance.questId, artifactId)) {
          throw new Error(
            `Artifact '${artifactId}' does not belong to Quest '${instance.questId}'`,
          );
        }
        if (!acceptedArtifactIds.has(artifactId)) {
          throw new Error(
            `Artifact '${artifactId}' is not accepted by Workflow node '${record.nodeId}'`,
          );
        }
      }
      const universe = getCurrentQuestScientificUniverse(
        state,
        instance.questId,
        record.gateId,
      );
      if (universe !== undefined) {
        assertScientificGateCoversUniverse(record, universe);
      }
      state.scientificGateRecords[record.id] = {
        ...record,
        approvedRefs: [...record.approvedRefs],
        rejectedRefs: [...record.rejectedRefs],
        evidenceRefs: [...record.evidenceRefs],
      };
      state.scientificGateRecordIdsByWorkflowInstanceId[
        instance.workflowInstanceId
      ] = [
        ...(state.scientificGateRecordIdsByWorkflowInstanceId[
          instance.workflowInstanceId
        ] ?? []),
        record.id,
      ];
      state.effectiveScientificGateRecordIdByScope[
        scientificGateScopeKey(
          instance.workflowInstanceId,
          record.nodeId,
          record.gateId,
        )
      ] = record.id;
      mark(state, record.id, event);
      mark(state, `scientific-gate:${instance.questId}`, event);
      return;
    }
    case "workflow.transition_recorded": {
      const payload =
        event.payload as unknown as WorkflowTransitionRecordPayload;
      assertSchemaV3Aggregate(event, "workflow", payload.workflowInstanceId);
      assertSchemaV3Related(event, [
        { type: "quest", id: payload.questId },
        ...payload.gateRecordIds.map((id) => ({
          type: "scientific-gate" as const,
          id,
        })),
      ]);
      const instance = requireEntity(
        state.workflowInstances,
        payload.workflowInstanceId,
        "workflow instance",
      );
      assertWorkflowBinding(instance, payload);
      if (instance.status !== "active") {
        throw new Error(
          `Workflow instance '${instance.workflowInstanceId}' is closed`,
        );
      }
      if (
        payload.fromNodeId !== instance.currentNodeId ||
        !instance.nodeCompletions[payload.fromNodeId]
      ) {
        throw new Error(
          "Workflow transition source must be the completed current node",
        );
      }
      const seenGateIds = new Set<string>();
      let previousGateOrder = -1;
      for (const recordId of payload.gateRecordIds) {
        const record = requireEntity(
          state.scientificGateRecords,
          recordId,
          "scientific gate record",
        );
        if (
          record.workflowInstanceId !== instance.workflowInstanceId ||
          record.nodeId !== payload.fromNodeId
        ) {
          throw new Error(
            `Scientific gate record '${recordId}' does not match the transition source`,
          );
        }
        if (record.decision !== "approve") {
          throw new Error(
            `Scientific gate record '${recordId}' is not approved`,
          );
        }
        if (seenGateIds.has(record.gateId)) {
          throw new Error(
            `Workflow transition repeats scientific gate '${record.gateId}'`,
          );
        }
        seenGateIds.add(record.gateId);
        const gateOrder = record.gateId === "H1" ? 0 : 1;
        if (gateOrder <= previousGateOrder) {
          throw new Error(
            "Workflow transition gate records must be ordered H1 then H2",
          );
        }
        previousGateOrder = gateOrder;
        const effectiveId =
          state.effectiveScientificGateRecordIdByScope[
            scientificGateScopeKey(
              instance.workflowInstanceId,
              payload.fromNodeId,
              record.gateId,
            )
          ];
        if (effectiveId !== record.id) {
          throw new Error(`Scientific gate record '${recordId}' is stale`);
        }
        if (!isScientificGateCurrentForUniverse(state, record)) {
          throw new Error(
            `Scientific gate record '${recordId}' is stale for the current universe`,
          );
        }
      }
      if (payload.selectedAt !== event.timestamp) {
        throw new Error("Workflow selectedAt must equal its event timestamp");
      }
      instance.transitions = [
        ...instance.transitions,
        { ...payload, gateRecordIds: [...payload.gateRecordIds] },
      ];
      instance.currentNodeId = payload.toNodeId;
      instance.updatedAt = event.timestamp;
      mark(state, instance.workflowInstanceId, event);
      mark(state, `workflow:${instance.questId}`, event);
      return;
    }
    case "workflow.closed": {
      const payload = event.payload as unknown as WorkflowClosePayload;
      const instance = requireEntity(
        state.workflowInstances,
        payload.workflowInstanceId,
        "workflow instance",
      );
      assertWorkflowBinding(instance, payload);
      if (instance.status !== "active") {
        throw new Error(
          `Workflow instance '${instance.workflowInstanceId}' is closed`,
        );
      }
      if (payload.closedAt !== event.timestamp) {
        throw new Error("Workflow closedAt must equal its event timestamp");
      }
      instance.status = payload.outcome;
      instance.closure = { ...payload };
      instance.updatedAt = event.timestamp;
      Reflect.deleteProperty(state.activeWorkflowByQuestId, instance.questId);
      mark(state, instance.workflowInstanceId, event);
      mark(state, `workflow:${instance.questId}`, event);
      return;
    }
    case "decision.recorded": {
      const decision = event.payload.decision as Decision;
      assertAggregate(event, "decision", decision.id);
      const proposal = requireEntity(
        state.proposals,
        decision.proposalId,
        "proposal",
      );
      if (state.decisions[decision.id]) {
        throw new Error(`Research decision '${decision.id}' already exists`);
      }
      if (proposal.status !== "pending") {
        throw new Error(`Proposal '${proposal.id}' already has a decision`);
      }
      if (
        decision.selectedOperationIndexes.some(
          (index) => index >= proposal.operations.length,
        )
      ) {
        throw new Error(
          `Decision for proposal '${proposal.id}' contains an out-of-range operation index`,
        );
      }
      if (
        decision.outcome !== "accept" &&
        decision.selectedOperationIndexes.length > 0
      ) {
        throw new Error(
          `Decision outcome '${decision.outcome}' cannot select proposal operations`,
        );
      }
      state.decisions[decision.id] = { ...decision };
      proposal.status = proposalStatusForDecision(decision.outcome);
      proposal.updatedAt = event.timestamp;
      mark(state, decision.id, event);
      mark(state, proposal.id, event);
      return;
    }
  }
}

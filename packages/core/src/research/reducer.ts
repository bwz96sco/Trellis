import { proposalStatusForDecision } from "./dispatch.js";
import { validateArtifactRepositories } from "./repositories.js";
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
  ResearchState,
  Result,
  Run,
  RunStatus,
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
  if (!state.workspace) throw new Error("Research workspace has not been created");
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

function dispatchHasResult(state: ResearchState, dispatchId: string): boolean {
  return Object.values(state.results).some(
    (result) => result.dispatchId === dispatchId,
  );
}

function dispatchHasProposal(state: ResearchState, dispatchId: string): boolean {
  return Object.values(state.proposals).some(
    (proposal) => proposal.dispatchId === dispatchId,
  );
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
        throw new Error("A new research workspace must start with empty indexes");
      }
      state.workspace = { ...workspace };
      mark(state, "workspace", event);
      return;
    }
    case "repository.registered": {
      const repository = event.payload.repository as Repository;
      assertAggregate(event, "repository", repository.id);
      if (state.repositories[repository.id]) {
        throw new Error(`Research repository '${repository.id}' already exists`);
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
        throw new Error("A new research quest must start active at setup stage");
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
        throw new Error(`Campaign '${campaign.id}' protocol is immutable after frozen`);
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
        throw new Error(`Campaign '${campaign.id}' requires a protocol digest before freeze`);
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
        throw new Error("Campaign freeze must use the explicit freeze mutation");
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
      if (state.runs[run.id]) throw new Error(`Research run '${run.id}' already exists`);
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
        throw new Error("Run invalidation must use the explicit invalidate mutation");
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
      const campaign = requireEntity(state.campaigns, run.campaignId, "campaign");
      requireEntity(state.repositories, dispatch.repositoryId, "repository");
      if (campaign.questId !== quest.id) {
        throw new Error(
          `Dispatch quest '${quest.id}' does not match run campaign quest '${campaign.questId}'`,
        );
      }
      if (dispatch.campaignId !== undefined && dispatch.campaignId !== campaign.id) {
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
      if (run.dispatchId) throw new Error(`Run '${run.id}' already has a dispatch`);
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
        throw new Error(`Dispatch '${proposal.dispatchId}' already has a proposal`);
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
        (dispatch.campaignId !== undefined && dispatch.campaignId !== campaign.id)
      ) {
        throw new Error(
          `Activation '${activation.id}' does not match its Dispatch hierarchy`,
        );
      }
      if (state.activations[activation.id]) {
        throw new Error(`Research activation '${activation.id}' already exists`);
      }
      if (state.activationByDispatchId[dispatch.id]) {
        throw new Error(`Dispatch '${dispatch.id}' already has an activation`);
      }
      if (
        dispatchHasResult(state, dispatch.id) ||
        dispatchHasProposal(state, dispatch.id)
      ) {
        throw new Error(`Activation for Dispatch '${dispatch.id}' was planned too late`);
      }
      if (activation.createdAt !== event.timestamp) {
        throw new Error("Activation createdAt must equal its event timestamp");
      }
      state.activations[activation.id] = {
        ...activation,
        procedure: { ...activation.procedure },
      };
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
        grant.requestDigest !== activation.requestDigest ||
        grant.procedureDigest !== activation.procedure.digest ||
        grant.policyDigest !== activation.policyDigest ||
        grant.scopeHash !== activation.scopeHash
      ) {
        throw new Error(`Approval '${grant.id}' bindings do not match activation`);
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
      for (const approvalId of state.approvalIdsByActivationId[activation.id] ?? []) {
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
        grant: { ...grant },
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
        throw new Error("Approval revokedAt must equal a valid event timestamp");
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

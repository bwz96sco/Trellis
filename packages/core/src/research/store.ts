import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { verifyArtifactSha256 } from "./artifacts.js";
import { proposalOperationsToMutations } from "./dispatch.js";
import { createEventId } from "./ids.js";
import {
  assertScientificGateCoversUniverse,
  computeQuestScientificUniverseDigest,
  getCurrentQuestScientificUniverse,
  isScientificGateCurrentForUniverse,
  parseQuestImportMilestone,
  parseQuestImportRecord,
  parseQuestRouteSnapshot,
  parseQuestScientificUniverse,
  parseQuestWriterTransfer,
  questImportMilestoneRelatedRefs,
  questImportRelatedRefs,
  questRouteRelatedRefs,
  questScientificUniverseRelatedRefs,
  validateQuestImportMutationBatch,
} from "./quest-cutover.js";
import {
  consumeValidatedQuestExportReceipt,
  type ValidatedQuestExportReceipt,
} from "./quest-export-receipt.js";
import {
  getEffectiveScientificGateRecord,
  normalizeScientificGateEvidenceRefs,
  normalizeScientificGateRefs,
  ResearchScientificGateError,
  parseScientificGateDecision,
  parseScientificGateId,
  parseScientificGateRecord,
} from "./scientific-gate.js";
import { withResearchLock } from "./internal/lock.js";
import {
  parseResearchLedger,
  parseResearchEvent,
  serializeResearchEvents,
} from "./events.js";
import { researchPaths } from "./paths.js";
import {
  readProjectionCache,
  writeProjectionCache,
  writeResearchProjections,
} from "./projections.js";
import { reduceResearchEvents } from "./reducer.js";
import { requireRepository } from "./repositories.js";
import {
  artifactRefSchema,
  campaignSchema,
  claimSchema,
  decisionSchema,
  dispatchSchema,
  evidenceSchema,
  parseCampaignStatus,
  parseClaimStatus,
  parseEvidenceStatus,
  parseIsoTimestamp,
  parseNonEmptyString,
  parseQuestStage,
  parseQuestStatus,
  parseRunStatus,
  proposalSchema,
  questSchema,
  repositorySchema,
  researchActorSchema,
  researchProvenanceSchema,
  resultSchema,
  runSchema,
  workspaceSchema,
} from "./schema.js";
import {
  RESEARCH_EVENT_SCHEMA_VERSION,
  RESEARCH_SCHEMA_VERSION,
  RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
  type ApprovalId,
  type ArtifactId,
  type ArtifactRef,
  type CampaignId,
  type CampaignStatus,
  type ClaimId,
  type ClaimStatus,
  type Decision,
  type Dispatch,
  type EvidenceId,
  type EvidenceStatus,
  type Proposal,
  type ProposalId,
  type QuestExportRecord,
  type QuestId,
  type QuestImportMilestone,
  type QuestImportRecord,
  type QuestRouteSnapshot,
  type QuestScientificUniverse,
  type QuestStage,
  type QuestWriterTransfer,
  type QuestStatus,
  type Repository,
  type RepositoryId,
  type ResearchActivation,
  type ResearchActor,
  type ResearchApprovalGrant,
  type ResearchEvent,
  type ResearchEventKind,
  type ResearchProvenance,
  type ResearchSchemaV2EventKind,
  type ResearchSchemaV3EventKind,
  type ResearchState,
  type Result,
  type ResultId,
  type RunId,
  type RunStatus,
  type ScientificGateDecision,
  type ScientificGateId,
  type ScientificGateRecordId,
  type WorkflowAcceptedRef,
  type WorkflowCloseOutcome,
  type WorkflowInstanceId,
  type WorkspaceId,
} from "./types.js";
import {
  ResearchWorkflowError,
  findResearchWorkflowNode,
  findResearchWorkflowTransition,
  isResearchWorkflowTerminalNode,
  listResearchWorkflowOutgoingTransitions,
  missingResearchWorkflowRequiredRefs,
  normalizeWorkflowAcceptedRefs,
  type ParsedResearchWorkflowDefinitionV1,
} from "./workflow.js";

export type ResearchMutation =
  | {
      kind: "workspace.create";
      workspace: { id: WorkspaceId; name: string; description: string };
    }
  | {
      kind: "repository.register";
      repository: Omit<Repository, "createdAt" | "updatedAt">;
    }
  | { kind: "artifact.register"; artifact: ArtifactRef }
  | {
      kind: "quest.create";
      quest: {
        id: QuestId;
        title: string;
        description: string;
        repositoryIds: RepositoryId[];
        artifactRefs: ArtifactRef[];
      };
    }
  | { kind: "quest.status"; questId: QuestId; status: QuestStatus }
  | { kind: "quest.stage"; questId: QuestId; stage: QuestStage }
  | {
      kind: "campaign.create";
      campaign: {
        id: CampaignId;
        questId: QuestId;
        title: string;
        protocolDigest: string;
      };
    }
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
  | {
      kind: "run.create";
      run: { id: RunId; campaignId: CampaignId; title: string };
    }
  | { kind: "run.status"; runId: RunId; status: RunStatus }
  | { kind: "run.invalidate"; runId: RunId; reason: string }
  | {
      kind: "evidence.create";
      evidence: {
        id: EvidenceId;
        questId: QuestId;
        runId?: RunId;
        summary: string;
        artifactRefs: ArtifactRef[];
      };
    }
  | {
      kind: "evidence.status";
      evidenceId: EvidenceId;
      status: EvidenceStatus;
    }
  | {
      kind: "claim.create";
      claim: {
        id: ClaimId;
        questId: QuestId;
        statement: string;
        evidenceIds: EvidenceId[];
      };
    }
  | { kind: "claim.status"; claimId: ClaimId; status: ClaimStatus }
  | { kind: "dispatch.record"; dispatch: Dispatch }
  | { kind: "activation.plan"; activation: ResearchActivation }
  | { kind: "approval.grant"; approval: ResearchApprovalGrant }
  | {
      kind: "approval.revoke";
      approvalId: ApprovalId;
      revokedAt: string;
      reason: string;
    }
  | {
      kind: "approval.consume";
      approvalId: ApprovalId;
      resultId: ResultId;
      proposalId: ProposalId;
    }
  | { kind: "result.record"; result: Result }
  | { kind: "proposal.record"; proposal: Proposal }
  | { kind: "decision.record"; decision: Decision }
  | {
      kind: "quest.import.record";
      record: Omit<QuestImportRecord, "importedAt">;
    }
  | {
      kind: "quest.import.milestone";
      milestone: QuestImportMilestone;
    }
  | {
      kind: "quest.route.set";
      route: Omit<QuestRouteSnapshot, "recordedAt">;
    }
  | {
      kind: "quest.scientific-universe.record";
      universe: Omit<QuestScientificUniverse, "universeDigest" | "recordedAt">;
    }
  | {
      kind: "quest.export.record";
      record: Omit<QuestExportRecord, "recordedAt">;
    }
  | {
      kind: "quest.export.record.validated";
      receipt: ValidatedQuestExportReceipt;
    }
  | {
      kind: "quest-writer.transfer";
      transfer: Omit<QuestWriterTransfer, "recordedAt">;
    }
  | {
      kind: "workflow.bind";
      workflowInstanceId: WorkflowInstanceId;
      questId: QuestId;
      startNodeId: string;
      workflow: ParsedResearchWorkflowDefinitionV1;
    }
  | {
      kind: "workflow.node.complete";
      workflowInstanceId: WorkflowInstanceId;
      nodeId: string;
      acceptedRefs: readonly WorkflowAcceptedRef[];
      workflow: ParsedResearchWorkflowDefinitionV1;
    }
  | {
      kind: "scientific-gate.record";
      recordId: ScientificGateRecordId;
      workflowInstanceId: WorkflowInstanceId;
      gateId: ScientificGateId;
      decision: ScientificGateDecision;
      actor: string;
      rationale: string;
      approvedRefs: readonly string[];
      rejectedRefs: readonly string[];
      evidenceRefs: readonly ArtifactId[];
      sourceArtifactId?: ArtifactId;
      workflow: ParsedResearchWorkflowDefinitionV1;
    }
  | {
      kind: "workflow.transition.record";
      workflowInstanceId: WorkflowInstanceId;
      transitionId: string;
      selectedBy: string;
      workflow: ParsedResearchWorkflowDefinitionV1;
    }
  | {
      kind: "workflow.close";
      workflowInstanceId: WorkflowInstanceId;
      outcome: WorkflowCloseOutcome;
      closedBy: string;
      rationale: string;
      workflow: ParsedResearchWorkflowDefinitionV1;
    };

export interface CommitResearchBatchInput {
  root: string;
  mutations: readonly ResearchMutation[];
  actor: ResearchActor;
  provenance: ResearchProvenance;
  idempotencyKey: string;
  timestamp?: string;
  artifactRepositoryRoots?: Readonly<Partial<Record<RepositoryId, string>>>;
}

export interface ResearchCommitResult {
  events: ResearchEvent[];
  headSeq: number;
  replayed: boolean;
}

export interface ResearchBatchValidation {
  events: ResearchEvent[];
  state: ResearchState;
}

export interface ResearchStatus {
  headSeq: number;
  eventCount: number;
  projectedThroughSeq: number;
  projectionStale: boolean;
}

export class ResearchProjectionError extends Error {
  readonly headSeq: number;

  constructor(headSeq: number, cause: unknown) {
    super(
      `Research events committed through seq ${headSeq}, but projection update failed`,
      {
        cause,
      },
    );
    this.name = "ResearchProjectionError";
    this.headSeq = headSeq;
  }
}

interface EventDraft {
  schemaVersion:
    | typeof RESEARCH_SCHEMA_VERSION
    | typeof RESEARCH_EVENT_SCHEMA_VERSION
    | typeof RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION;
  kind:
    | ResearchEventKind
    | ResearchSchemaV2EventKind
    | ResearchSchemaV3EventKind;
  aggregate: ResearchEvent["aggregate"];
  related: ResearchEvent["related"];
  payload: Record<string, unknown>;
}

export async function readResearchLedger(
  root: string,
): Promise<ResearchEvent[]> {
  const paths = researchPaths(root);
  let text: string;
  try {
    text = fs.readFileSync(paths.eventsFile, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return parseResearchLedger(text, paths.eventsFile);
}

export async function readResearchState(root: string): Promise<ResearchState> {
  return reduceResearchEvents(await readResearchLedger(root));
}

export async function getResearchStatus(root: string): Promise<ResearchStatus> {
  const paths = researchPaths(root);
  const events = await readResearchLedger(root);
  const headSeq = events.at(-1)?.seq ?? 0;
  const cache = readProjectionCache(paths);
  const projectedThroughSeq = cache?.projectedThroughSeq ?? 0;
  return {
    headSeq,
    eventCount: events.length,
    projectedThroughSeq,
    projectionStale: projectedThroughSeq !== headSeq,
  };
}

function assertValidatedQuestExportBoundary(
  mutations: readonly ResearchMutation[],
): void {
  if (mutations.some((mutation) => mutation.kind === "quest.export.record")) {
    throw new Error(
      "RESEARCH_QUEST_EXPORT_UNVALIDATED: direct quest.export.record input is forbidden",
    );
  }
}

export async function validateResearchBatch(
  input: CommitResearchBatchInput,
): Promise<ResearchBatchValidation> {
  assertValidatedQuestExportBoundary(input.mutations);
  const paths = researchPaths(input.root);
  return withResearchLock(paths.lockFile, async () => {
    const events = await readResearchLedger(input.root);
    const replay = events.filter(
      (event) => event.idempotencyKey === input.idempotencyKey,
    );
    if (replay.length > 0) {
      assertQuestImportReplayMatches(events, replay, input);
      assertQuestExportReplayMatches(events, replay, input);
      return { events: replay, state: reduceResearchEvents(events) };
    }
    return buildValidatedBatch(events, input);
  });
}

export async function validateResearchBatchReadOnly(
  input: CommitResearchBatchInput,
): Promise<ResearchBatchValidation> {
  assertValidatedQuestExportBoundary(input.mutations);
  const events = await readResearchLedger(input.root);
  const replay = events.filter(
    (event) => event.idempotencyKey === input.idempotencyKey,
  );
  if (replay.length > 0) {
    assertQuestImportReplayMatches(events, replay, input);
    assertQuestExportReplayMatches(events, replay, input);
    return { events: replay, state: reduceResearchEvents(events) };
  }
  return buildValidatedBatch(events, input);
}

export async function commitResearchBatch(
  input: CommitResearchBatchInput,
): Promise<ResearchCommitResult> {
  assertValidatedQuestExportBoundary(input.mutations);
  const paths = researchPaths(input.root);
  return withResearchLock(paths.lockFile, async () => {
    const existing = await readResearchLedger(input.root);
    reconcileSequenceCache(paths.seqFile, existing.at(-1)?.seq ?? 0);
    const replay = existing.filter(
      (event) => event.idempotencyKey === input.idempotencyKey,
    );
    if (replay.length > 0) {
      assertQuestImportReplayMatches(existing, replay, input);
      assertQuestExportReplayMatches(existing, replay, input);
      return {
        events: replay,
        headSeq: existing.at(-1)?.seq ?? 0,
        replayed: true,
      };
    }

    const validation = buildValidatedBatch(existing, input);
    fs.mkdirSync(paths.researchDir, { recursive: true, mode: 0o700 });
    fs.appendFileSync(
      paths.eventsFile,
      serializeResearchEvents(validation.events),
      "utf-8",
    );
    const headSeq = validation.events.at(-1)?.seq ?? existing.length;
    writeRuntimeFile(paths.seqFile, `${headSeq}\n`);

    try {
      const allEvents = [...existing, ...validation.events];
      const files = writeResearchProjections(
        paths,
        validation.state,
        allEvents,
      );
      writeProjectionCache(paths, headSeq, files);
    } catch (error) {
      throw new ResearchProjectionError(headSeq, error);
    }

    return { events: validation.events, headSeq, replayed: false };
  });
}

export async function rebuildResearchProjections(root: string): Promise<void> {
  const paths = researchPaths(root);
  await withResearchLock(paths.lockFile, async () => {
    const events = await readResearchLedger(root);
    const headSeq = events.at(-1)?.seq ?? 0;
    reconcileSequenceCache(paths.seqFile, headSeq);
    const state = reduceResearchEvents(events);
    const files = writeResearchProjections(paths, state, events);
    writeProjectionCache(paths, headSeq, files);
  });
}

function buildValidatedBatch(
  existing: readonly ResearchEvent[],
  input: CommitResearchBatchInput,
): ResearchBatchValidation {
  if (input.mutations.length === 0) {
    throw new Error("Research event batch must contain at least one mutation");
  }
  if (input.mutations.some((mutation) => mutation.kind === "quest.import.record")) {
    validateQuestImportMutationBatch(input.mutations);
  }
  const idempotencyKey = parseNonEmptyString(
    input.idempotencyKey,
    "idempotencyKey",
  );
  const actor = researchActorSchema.parse(input.actor);
  const provenance = researchProvenanceSchema.parse(input.provenance);
  const timestamp = parseIsoTimestamp(
    input.timestamp ?? new Date().toISOString(),
    "timestamp",
  );
  let candidateState = reduceResearchEvents(existing);
  const events: ResearchEvent[] = [];
  for (const mutation of input.mutations) {
    const draft = mutationToEventDraft(mutation, timestamp, candidateState);
    const event = parseResearchEvent({
      schemaVersion: draft.schemaVersion,
      eventId: createEventId(),
      seq: existing.length + events.length + 1,
      timestamp,
      kind: draft.kind,
      aggregate: draft.aggregate,
      related: draft.related,
      payload: draft.payload,
      actor,
      idempotencyKey,
      provenance,
    });
    events.push(event);
    candidateState = reduceResearchEvents([...existing, ...events]);
  }
  validateDispatchBatch(events, reduceResearchEvents(existing), timestamp);
  const state = reduceResearchEvents([...existing, ...events]);
  validateArtifactDigests(
    input.root,
    events,
    state,
    input.artifactRepositoryRoots,
  );
  return { events, state };
}

function buildQuestImportReplayComparisonEvents(
  existing: readonly ResearchEvent[],
  input: CommitResearchBatchInput,
  timestampInput: string,
): ResearchEvent[] {
  if (input.mutations.some((mutation) => mutation.kind === "quest.import.record")) {
    validateQuestImportMutationBatch(input.mutations);
  }
  const idempotencyKey = parseNonEmptyString(input.idempotencyKey, "idempotencyKey");
  const actor = researchActorSchema.parse(input.actor);
  const provenance = researchProvenanceSchema.parse(input.provenance);
  const timestamp = parseIsoTimestamp(timestampInput, "timestamp");
  let candidateState = reduceResearchEvents(existing);
  const events: ResearchEvent[] = [];
  for (const mutation of input.mutations) {
    const draft = mutationToEventDraft(mutation, timestamp, candidateState);
    const event = parseResearchEvent({
      schemaVersion: draft.schemaVersion,
      eventId: createEventId(),
      seq: existing.length + events.length + 1,
      timestamp,
      kind: draft.kind,
      aggregate: draft.aggregate,
      related: draft.related,
      payload: draft.payload,
      actor,
      idempotencyKey,
      provenance,
    });
    events.push(event);
    candidateState = reduceResearchEvents([...existing, ...events]);
  }
  validateDispatchBatch(events, reduceResearchEvents(existing), timestamp);
  return events;
}

function assertQuestImportReplayMatches(
  existing: readonly ResearchEvent[],
  replay: readonly ResearchEvent[],
  input: CommitResearchBatchInput,
): void {
  if (!input.idempotencyKey.startsWith("research-quest-import:qip_")) return;
  const first = replay[0];
  if (first === undefined) return;
  const prefix = existing.slice(0, first.seq - 1);
  try {
    const expected = buildQuestImportReplayComparisonEvents(
      prefix,
      input,
      first.timestamp,
    );
    const comparable = (event: ResearchEvent): unknown => ({
      schemaVersion: event.schemaVersion,
      timestamp: event.timestamp,
      kind: event.kind,
      aggregate: event.aggregate,
      related: event.related,
      payload: event.payload,
      actor: event.actor,
      idempotencyKey: event.idempotencyKey,
      provenance: event.provenance,
    });
    if (
      expected.length !== replay.length ||
      replay.some((event, index) => {
        const planned = expected[index];
        return planned === undefined || !isDeepStrictEqual(comparable(event), comparable(planned));
      })
    ) {
      throw new Error("planned import batch differs from canonical replay");
    }
  } catch (error) {
    throw new Error(
      `IDEMPOTENCY_KEY_CONFLICT: Quest import preview token is owned by a different or partial batch`,
      { cause: error },
    );
  }
}

function assertQuestExportReplayMatches(
  existing: readonly ResearchEvent[],
  replay: readonly ResearchEvent[],
  input: CommitResearchBatchInput,
): void {
  if (
    !input.mutations.some(
      (mutation) => mutation.kind === "quest.export.record.validated",
    )
  )
    return;
  const first = replay[0];
  if (first === undefined) return;
  const prefix = existing.slice(0, first.seq - 1);
  try {
    const expected = buildQuestImportReplayComparisonEvents(
      prefix,
      input,
      first.timestamp,
    );
    const comparable = (event: ResearchEvent): unknown => ({
      schemaVersion: event.schemaVersion,
      timestamp: event.timestamp,
      kind: event.kind,
      aggregate: event.aggregate,
      related: event.related,
      payload: event.payload,
      actor: event.actor,
      idempotencyKey: event.idempotencyKey,
      provenance: event.provenance,
    });
    if (
      expected.length !== replay.length ||
      replay.some((event, index) => {
        const planned = expected[index];
        return (
          planned === undefined ||
          !isDeepStrictEqual(comparable(event), comparable(planned))
        );
      })
    ) {
      throw new Error("validated export differs from canonical replay");
    }
  } catch (error) {
    throw new Error(
      "IDEMPOTENCY_KEY_CONFLICT: validated Quest export replay is owned by different evidence",
      { cause: error },
    );
  }
}

function validateDispatchBatch(
  events: readonly ResearchEvent[],
  existingState: ResearchState,
  timestamp: string,
): void {
  const resultEvents = events.filter(
    (event) => event.kind === "result.recorded",
  );
  const proposalEvents = events.filter(
    (event) => event.kind === "proposal.recorded",
  );
  const consumptionEvents = events.filter(
    (event) => event.kind === "approval.consumed",
  );
  if (
    resultEvents.length > 0 ||
    proposalEvents.length > 0 ||
    consumptionEvents.length > 0
  ) {
    const successor =
      events.length === 3 &&
      events[0]?.kind === "result.recorded" &&
      events[1]?.kind === "proposal.recorded" &&
      events[2]?.kind === "approval.consumed";
    if (!successor) {
      throw new Error(
        "Research Result, Proposal, and Approval consumption must be recorded together in exactly one isolated batch",
      );
    }
    const result = events[0].payload.result as Result;
    const proposal = events[1].payload.proposal as Proposal;
    if (result.dispatchId !== proposal.dispatchId) {
      throw new Error(
        "Research Result and Proposal must reference the same Dispatch",
      );
    }
    if (successor) {
      const consumption = events[2];
      if (
        consumption?.payload.resultId !== result.id ||
        consumption.payload.proposalId !== proposal.id
      ) {
        throw new Error(
          "Research Approval consumption must reference the batched Result and Proposal",
        );
      }
    }
  }

  const decisionEvents = events.filter(
    (event) => event.kind === "decision.recorded",
  );
  if (decisionEvents.length === 0) return;
  if (
    decisionEvents.length !== 1 ||
    events.at(-1)?.kind !== "decision.recorded"
  ) {
    throw new Error(
      "A research Decision must be the final mutation in its batch",
    );
  }
  const decision = decisionEvents[0]?.payload.decision as Decision;
  const proposal = existingState.proposals[decision.proposalId];
  if (!proposal) {
    throw new Error(`Unknown research proposal '${decision.proposalId}'`);
  }
  if (decision.outcome !== "accept") {
    if (events.length !== 1) {
      throw new Error(
        `Decision outcome '${decision.outcome}' must not include proposal mutations`,
      );
    }
    return;
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
  const expectedDrafts = proposalOperationsToMutations(
    decision.selectedOperationIndexes.map((index) => {
      const operation = proposal.operations[index];
      if (!operation) {
        throw new Error(`Missing proposal operation ${index}`);
      }
      return operation;
    }),
  ).map((mutation) => mutationToEventDraft(mutation, timestamp));
  const appliedEvents = events.slice(0, -1);
  if (
    appliedEvents.length !== expectedDrafts.length ||
    appliedEvents.some((event, index) => {
      const expected = expectedDrafts[index];
      return (
        expected === undefined ||
        !isDeepStrictEqual(
          {
            kind: event.kind,
            aggregate: event.aggregate,
            related: event.related,
            payload: event.payload,
          },
          expected,
        )
      );
    })
  ) {
    throw new Error(
      "Accepted research Decision batch must contain exactly the selected Proposal mutations",
    );
  }
}

function mutationToEventDraft(
  mutation: ResearchMutation,
  timestamp: string,
  state?: ResearchState,
): EventDraft {
  const draft = buildMutationEventDraft(mutation, timestamp, state);
  if (state === undefined && draft.schemaVersion === RESEARCH_SCHEMA_VERSION) {
    const { schemaVersion, ...comparable } = draft;
    Object.defineProperty(comparable, "schemaVersion", {
      value: schemaVersion,
      enumerable: false,
    });
    return comparable as EventDraft;
  }
  return draft;
}

function requireWorkflowState(state: ResearchState | undefined): ResearchState {
  if (state === undefined) {
    throw new ResearchWorkflowError(
      "RESEARCH_WORKFLOW_INVALID",
      "Workflow mutations require canonical Research state",
    );
  }
  return state;
}

function gateArtifactBelongsToQuest(
  state: ResearchState,
  questId: QuestId,
  artifactId: ArtifactId,
): boolean {
  const quest = state.quests[questId];
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

function assertWorkflowDefinitionBinding(
  instance: ResearchState["workflowInstances"][WorkflowInstanceId],
  workflow: ParsedResearchWorkflowDefinitionV1,
): void {
  if (
    workflow.definition.id !== instance.workflowId ||
    workflow.definition.version !== instance.workflowVersion ||
    workflow.workflowDigest !== instance.workflowDigest
  ) {
    throw new ResearchWorkflowError(
      "RESEARCH_WORKFLOW_INVALID",
      `Workflow definition does not match bound instance '${instance.workflowInstanceId}'`,
    );
  }
}

function buildMutationEventDraft(
  mutation: ResearchMutation,
  timestamp: string,
  state?: ResearchState,
): EventDraft {
  switch (mutation.kind) {
    case "workspace.create": {
      const workspace = workspaceSchema.parse({
        ...mutation.workspace,
        questIds: [],
        campaignIds: [],
        repositoryIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "workspace.created",
        aggregate: { type: "workspace", id: workspace.id },
        related: [],
        payload: { workspace },
      };
    }
    case "repository.register": {
      const repository = repositorySchema.parse({
        ...mutation.repository,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "repository.registered",
        aggregate: { type: "repository", id: repository.id },
        related: [],
        payload: { repository },
      };
    }
    case "artifact.register": {
      const artifact = artifactRefSchema.parse(mutation.artifact);
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "artifact.registered",
        aggregate: { type: "artifact", id: artifact.id },
        related: [{ type: "repository", id: artifact.repositoryId }],
        payload: { artifact },
      };
    }
    case "quest.create": {
      const quest = questSchema.parse({
        ...mutation.quest,
        status: "active",
        stage: "setup",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "quest.created",
        aggregate: { type: "quest", id: quest.id },
        related: quest.repositoryIds.map((id) => ({ type: "repository", id })),
        payload: { quest },
      };
    }
    case "quest.status":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "quest.status_changed",
        aggregate: { type: "quest", id: mutation.questId },
        related: [],
        payload: { status: parseQuestStatus(mutation.status) },
      };
    case "quest.stage":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "quest.stage_changed",
        aggregate: { type: "quest", id: mutation.questId },
        related: [],
        payload: { stage: parseQuestStage(mutation.stage) },
      };
    case "campaign.create": {
      const campaign = campaignSchema.parse({
        ...mutation.campaign,
        status: "draft",
        runIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "campaign.created",
        aggregate: { type: "campaign", id: campaign.id },
        related: [{ type: "quest", id: campaign.questId }],
        payload: { campaign },
      };
    }
    case "campaign.protocol":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "campaign.protocol_updated",
        aggregate: { type: "campaign", id: mutation.campaignId },
        related: [],
        payload: {
          protocolDigest: parseNonEmptyString(
            mutation.protocolDigest,
            "protocolDigest",
          ),
        },
      };
    case "campaign.freeze":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "campaign.frozen",
        aggregate: { type: "campaign", id: mutation.campaignId },
        related: [],
        payload: {},
      };
    case "campaign.status":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "campaign.status_changed",
        aggregate: { type: "campaign", id: mutation.campaignId },
        related: [],
        payload: { status: parseCampaignStatus(mutation.status) },
      };
    case "run.create": {
      const run = runSchema.parse({
        ...mutation.run,
        status: "planned",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "run.created",
        aggregate: { type: "run", id: run.id },
        related: [{ type: "campaign", id: run.campaignId }],
        payload: { run },
      };
    }
    case "run.status":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "run.status_changed",
        aggregate: { type: "run", id: mutation.runId },
        related: [],
        payload: { status: parseRunStatus(mutation.status) },
      };
    case "run.invalidate":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "run.invalidated",
        aggregate: { type: "run", id: mutation.runId },
        related: [],
        payload: {
          reason: parseNonEmptyString(mutation.reason, "invalidation reason"),
        },
      };
    case "evidence.create": {
      const evidence = evidenceSchema.parse({
        ...mutation.evidence,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "evidence.created",
        aggregate: { type: "evidence", id: evidence.id },
        related: [
          { type: "quest", id: evidence.questId },
          ...(evidence.runId
            ? [{ type: "run" as const, id: evidence.runId }]
            : []),
        ],
        payload: { evidence },
      };
    }
    case "evidence.status":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "evidence.status_changed",
        aggregate: { type: "evidence", id: mutation.evidenceId },
        related: [],
        payload: { status: parseEvidenceStatus(mutation.status) },
      };
    case "claim.create": {
      const claim = claimSchema.parse({
        ...mutation.claim,
        status: "candidate",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "claim.created",
        aggregate: { type: "claim", id: claim.id },
        related: [
          { type: "quest", id: claim.questId },
          ...claim.evidenceIds.map((id) => ({ type: "evidence" as const, id })),
        ],
        payload: { claim },
      };
    }
    case "claim.status":
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "claim.status_changed",
        aggregate: { type: "claim", id: mutation.claimId },
        related: [],
        payload: { status: parseClaimStatus(mutation.status) },
      };
    case "dispatch.record": {
      const dispatch = dispatchSchema.parse(mutation.dispatch);
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "dispatch.recorded",
        aggregate: { type: "dispatch", id: dispatch.id },
        related: [
          { type: "quest", id: dispatch.questId },
          ...(dispatch.campaignId
            ? [{ type: "campaign" as const, id: dispatch.campaignId }]
            : []),
          { type: "run", id: dispatch.runId },
          { type: "repository", id: dispatch.repositoryId },
        ],
        payload: { dispatch },
      };
    }
    case "activation.plan": {
      const activation = mutation.activation;
      return {
        schemaVersion: RESEARCH_EVENT_SCHEMA_VERSION,
        kind: "activation.planned",
        aggregate: { type: "activation", id: activation.id },
        related: [
          { type: "dispatch", id: activation.dispatchId },
          { type: "quest", id: activation.questId },
        ],
        payload: { activation },
      };
    }
    case "approval.grant": {
      const approval = mutation.approval;
      const activation = state?.activations[approval.activationId];
      if (!activation) {
        throw new Error(
          `Unknown research activation '${approval.activationId}'`,
        );
      }
      return {
        schemaVersion: RESEARCH_EVENT_SCHEMA_VERSION,
        kind: "approval.granted",
        aggregate: { type: "approval", id: approval.id },
        related: [
          { type: "activation", id: approval.activationId },
          { type: "dispatch", id: approval.dispatchId },
          { type: "quest", id: activation.questId },
        ],
        payload: { approval },
      };
    }
    case "approval.revoke": {
      const approval = state?.approvals[mutation.approvalId];
      if (!approval) {
        throw new Error(`Unknown research approval '${mutation.approvalId}'`);
      }
      return {
        schemaVersion: RESEARCH_EVENT_SCHEMA_VERSION,
        kind: "approval.revoked",
        aggregate: { type: "approval", id: mutation.approvalId },
        related: [
          { type: "activation", id: approval.grant.activationId },
          { type: "dispatch", id: approval.grant.dispatchId },
        ],
        payload: {
          approvalId: mutation.approvalId,
          revokedAt: mutation.revokedAt,
          reason: mutation.reason,
        },
      };
    }
    case "approval.consume": {
      const approval = state?.approvals[mutation.approvalId];
      if (!approval) {
        throw new Error(`Unknown research approval '${mutation.approvalId}'`);
      }
      return {
        schemaVersion: RESEARCH_EVENT_SCHEMA_VERSION,
        kind: "approval.consumed",
        aggregate: { type: "approval", id: mutation.approvalId },
        related: [
          { type: "activation", id: approval.grant.activationId },
          { type: "dispatch", id: approval.grant.dispatchId },
          { type: "result", id: mutation.resultId },
          { type: "proposal", id: mutation.proposalId },
        ],
        payload: {
          approvalId: mutation.approvalId,
          resultId: mutation.resultId,
          proposalId: mutation.proposalId,
          consumedAt: timestamp,
        },
      };
    }
    case "result.record": {
      const result = resultSchema.parse(mutation.result);
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "result.recorded",
        aggregate: { type: "result", id: result.id },
        related: [
          { type: "dispatch", id: result.dispatchId },
          { type: "run", id: result.runId },
        ],
        payload: { result },
      };
    }
    case "proposal.record": {
      const proposal = proposalSchema.parse(mutation.proposal);
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "proposal.recorded",
        aggregate: { type: "proposal", id: proposal.id },
        related: [
          { type: "dispatch", id: proposal.dispatchId },
          { type: "quest", id: proposal.questId },
        ],
        payload: { proposal },
      };
    }
    case "quest.import.record": {
      const record = parseQuestImportRecord({
        ...mutation.record,
        importedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "quest.import.recorded",
        aggregate: { type: "quest-import", id: record.id },
        related: questImportRelatedRefs(record),
        payload: record as unknown as Record<string, unknown>,
      };
    }
    case "quest.import.milestone": {
      const milestone = parseQuestImportMilestone(mutation.milestone);
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "quest.import.milestone-recorded",
        aggregate: { type: "quest-import-milestone", id: milestone.id },
        related: questImportMilestoneRelatedRefs(milestone),
        payload: milestone as unknown as Record<string, unknown>,
      };
    }
    case "quest.route.set": {
      const route = parseQuestRouteSnapshot({
        ...mutation.route,
        recordedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "quest.route.recorded",
        aggregate: { type: "quest-route", id: route.id },
        related: questRouteRelatedRefs(route),
        payload: route as unknown as Record<string, unknown>,
      };
    }
    case "quest.scientific-universe.record": {
      const universeDigest = computeQuestScientificUniverseDigest(
        mutation.universe,
      );
      const universe = parseQuestScientificUniverse({
        ...mutation.universe,
        universeDigest,
        recordedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "quest.scientific-universe.recorded",
        aggregate: { type: "quest-scientific-universe", id: universe.id },
        related: questScientificUniverseRelatedRefs(universe),
        payload: universe as unknown as Record<string, unknown>,
      };
    }
    case "quest.export.record":
      throw new Error(
        "RESEARCH_QUEST_EXPORT_UNVALIDATED: direct quest.export.record input is forbidden",
      );
    case "quest.export.record.validated": {
      const record = consumeValidatedQuestExportReceipt(
        mutation.receipt,
        requireWorkflowState(state),
      );
      const recorded = { ...record, recordedAt: timestamp };
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "quest.export.recorded",
        aggregate: { type: "quest-export", id: recorded.id },
        related: [{ type: "quest", id: recorded.questId }],
        payload: recorded as unknown as Record<string, unknown>,
      };
    }
    case "quest-writer.transfer": {
      const transfer = parseQuestWriterTransfer({
        ...mutation.transfer,
        recordedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "quest-writer.transferred",
        aggregate: { type: "quest-writer", id: transfer.id },
        related: [{ type: "quest", id: transfer.questId }],
        payload: transfer as unknown as Record<string, unknown>,
      };
    }
    case "workflow.bind": {
      const current = requireWorkflowState(state);
      if (!current.quests[mutation.questId]) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_INVALID",
          `Unknown research Quest '${mutation.questId}'`,
        );
      }
      if (current.activeWorkflowByQuestId[mutation.questId]) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_ACTIVE_CONFLICT",
          `Quest '${mutation.questId}' already has an active Workflow`,
        );
      }
      if (current.workflowInstances[mutation.workflowInstanceId]) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_ACTIVE_CONFLICT",
          `Workflow instance '${mutation.workflowInstanceId}' already exists`,
        );
      }
      if (
        !mutation.workflow.definition.startNodeIds.includes(
          mutation.startNodeId,
        )
      ) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_INVALID",
          `Workflow start node '${mutation.startNodeId}' is not declared`,
        );
      }
      const payload = {
        workflowInstanceId: mutation.workflowInstanceId,
        questId: mutation.questId,
        workflowId: mutation.workflow.definition.id,
        workflowVersion: mutation.workflow.definition.version,
        workflowDigest: mutation.workflow.workflowDigest,
        startNodeId: mutation.startNodeId,
        boundAt: timestamp,
      };
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "workflow.bound",
        aggregate: { type: "workflow", id: mutation.workflowInstanceId },
        related: [{ type: "quest", id: mutation.questId }],
        payload,
      };
    }
    case "workflow.node.complete": {
      const current = requireWorkflowState(state);
      const instance = current.workflowInstances[mutation.workflowInstanceId];
      if (instance?.status !== "active") {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_COMPLETION_INVALID",
          `Workflow instance '${mutation.workflowInstanceId}' is not active`,
        );
      }
      assertWorkflowDefinitionBinding(instance, mutation.workflow);
      if (
        mutation.nodeId !== instance.currentNodeId ||
        instance.nodeCompletions[mutation.nodeId]
      ) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_COMPLETION_INVALID",
          `Workflow node '${mutation.nodeId}' is not the incomplete current node`,
        );
      }
      const node = findResearchWorkflowNode(
        mutation.workflow.definition,
        mutation.nodeId,
      );
      if (!node?.allowedProfiles.includes("lightweight")) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_COMPLETION_INVALID",
          `Workflow node '${mutation.nodeId}' does not allow lightweight completion`,
        );
      }
      let acceptedRefs: readonly WorkflowAcceptedRef[];
      try {
        acceptedRefs = normalizeWorkflowAcceptedRefs(mutation.acceptedRefs);
      } catch (error) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_COMPLETION_INVALID",
          "Workflow accepted references are invalid",
          { cause: error },
        );
      }
      if (acceptedRefs.length === 0) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_COMPLETION_INVALID",
          "Workflow completion requires at least one accepted reference",
        );
      }
      const payload = {
        workflowInstanceId: instance.workflowInstanceId,
        questId: instance.questId,
        workflowId: instance.workflowId,
        workflowVersion: instance.workflowVersion,
        workflowDigest: instance.workflowDigest,
        nodeId: mutation.nodeId,
        executionPackage: node.executionPackage,
        executionProfile: "lightweight" as const,
        acceptedRefs: [...acceptedRefs],
        completedAt: timestamp,
      };
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "workflow.node_completed",
        aggregate: { type: "workflow", id: instance.workflowInstanceId },
        related: [
          { type: "quest", id: instance.questId },
          ...acceptedRefs.map((ref) => ({ type: ref.kind, id: ref.id })),
        ],
        payload,
      };
    }
    case "scientific-gate.record": {
      const current = requireWorkflowState(state);
      const instance = current.workflowInstances[mutation.workflowInstanceId];
      if (instance?.status !== "active") {
        throw new ResearchScientificGateError(
          `Workflow instance '${mutation.workflowInstanceId}' is not active`,
        );
      }
      assertWorkflowDefinitionBinding(instance, mutation.workflow);
      const completion = instance.nodeCompletions[instance.currentNodeId];
      if (!completion) {
        throw new ResearchScientificGateError(
          `Workflow node '${instance.currentNodeId}' must be completed before recording a scientific gate`,
        );
      }
      const gateId = parseScientificGateId(mutation.gateId);
      const gateDeclared = listResearchWorkflowOutgoingTransitions(
        mutation.workflow.definition,
        instance.currentNodeId,
      ).some((transition) => transition.requiredGateIds.includes(gateId));
      if (!gateDeclared) {
        throw new ResearchScientificGateError(
          `Scientific gate '${gateId}' is not declared by an outgoing transition from node '${instance.currentNodeId}'`,
        );
      }
      const refs = normalizeScientificGateRefs({
        approvedRefs: mutation.approvedRefs,
        rejectedRefs: mutation.rejectedRefs,
      });
      const universe = getCurrentQuestScientificUniverse(
        current,
        instance.questId,
        gateId,
      );
      if (universe !== undefined) {
        assertScientificGateCoversUniverse(refs, universe);
      }
      const evidenceRefs = normalizeScientificGateEvidenceRefs(
        mutation.evidenceRefs,
      );
      const acceptedArtifactIds = new Set(
        completion.acceptedRefs
          .filter((ref) => ref.kind === "artifact")
          .map((ref) => ref.id),
      );
      for (const artifactId of evidenceRefs) {
        if (!current.artifacts[artifactId]) {
          throw new ResearchScientificGateError(
            `Unknown research Artifact '${artifactId}'`,
          );
        }
        if (
          !gateArtifactBelongsToQuest(current, instance.questId, artifactId)
        ) {
          throw new ResearchScientificGateError(
            `Artifact '${artifactId}' does not belong to Quest '${instance.questId}'`,
          );
        }
        if (!acceptedArtifactIds.has(artifactId)) {
          throw new ResearchScientificGateError(
            `Artifact '${artifactId}' is not accepted by Workflow node '${instance.currentNodeId}'`,
          );
        }
      }
      if (
        mutation.sourceArtifactId !== undefined &&
        !evidenceRefs.includes(mutation.sourceArtifactId)
      ) {
        throw new ResearchScientificGateError(
          "sourceArtifactId must also appear in evidenceRefs",
        );
      }
      const record = parseScientificGateRecord({
        id: mutation.recordId,
        questId: instance.questId,
        workflowInstanceId: instance.workflowInstanceId,
        workflowId: instance.workflowId,
        workflowVersion: instance.workflowVersion,
        workflowDigest: instance.workflowDigest,
        nodeId: instance.currentNodeId,
        gateId,
        decision: parseScientificGateDecision(mutation.decision),
        actor: mutation.actor,
        rationale: mutation.rationale,
        ...refs,
        evidenceRefs,
        ...(mutation.sourceArtifactId === undefined
          ? {}
          : { sourceArtifactId: mutation.sourceArtifactId }),
        recordedAt: timestamp,
      });
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "scientific-gate.recorded",
        aggregate: { type: "scientific-gate", id: record.id },
        related: [
          { type: "quest", id: instance.questId },
          { type: "workflow", id: instance.workflowInstanceId },
          ...record.evidenceRefs.map((id) => ({
            type: "artifact" as const,
            id,
          })),
        ],
        payload: record as unknown as Record<string, unknown>,
      };
    }
    case "workflow.transition.record": {
      const current = requireWorkflowState(state);
      const instance = current.workflowInstances[mutation.workflowInstanceId];
      if (instance?.status !== "active") {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_TRANSITION_BLOCKED",
          `Workflow instance '${mutation.workflowInstanceId}' is not active`,
        );
      }
      assertWorkflowDefinitionBinding(instance, mutation.workflow);
      const transition = findResearchWorkflowTransition(
        mutation.workflow.definition,
        mutation.transitionId,
      );
      const completion = instance.nodeCompletions[instance.currentNodeId];
      if (
        transition?.fromNodeId !== instance.currentNodeId ||
        completion === undefined
      ) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_TRANSITION_BLOCKED",
          `Workflow transition '${mutation.transitionId}' is not legal from the completed current node`,
        );
      }
      const missingRefs = missingResearchWorkflowRequiredRefs(
        transition,
        completion.acceptedRefs,
      );
      if (missingRefs.length > 0) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_TRANSITION_BLOCKED",
          `Workflow transition '${transition.id}' is missing required refs: ${missingRefs.join(", ")}`,
        );
      }
      const missingGateIds: ScientificGateId[] = [];
      const gateRecordIds: ScientificGateRecordId[] = [];
      for (const gateId of transition.requiredGateIds) {
        const record = getEffectiveScientificGateRecord(
          current,
          instance.workflowInstanceId,
          instance.currentNodeId,
          gateId,
        );
        if (
          record?.decision !== "approve" ||
          !isScientificGateCurrentForUniverse(current, record)
        ) {
          missingGateIds.push(gateId);
        } else {
          gateRecordIds.push(record.id);
        }
      }
      if (missingGateIds.length > 0) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_TRANSITION_BLOCKED",
          `Workflow transition '${transition.id}' is missing gates: ${missingGateIds.join(", ")}`,
        );
      }
      const selectedBy = parseNonEmptyString(mutation.selectedBy, "selectedBy");
      const payload = {
        workflowInstanceId: instance.workflowInstanceId,
        questId: instance.questId,
        workflowId: instance.workflowId,
        workflowVersion: instance.workflowVersion,
        workflowDigest: instance.workflowDigest,
        transitionId: transition.id,
        fromNodeId: transition.fromNodeId,
        toNodeId: transition.toNodeId,
        selectedBy,
        gateRecordIds,
        selectedAt: timestamp,
      };
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "workflow.transition_recorded",
        aggregate: { type: "workflow", id: instance.workflowInstanceId },
        related: [
          { type: "quest", id: instance.questId },
          ...gateRecordIds.map((id) => ({
            type: "scientific-gate" as const,
            id,
          })),
        ],
        payload,
      };
    }
    case "workflow.close": {
      const current = requireWorkflowState(state);
      const instance = current.workflowInstances[mutation.workflowInstanceId];
      if (instance?.status !== "active") {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_INVALID",
          `Workflow instance '${mutation.workflowInstanceId}' is not active`,
        );
      }
      assertWorkflowDefinitionBinding(instance, mutation.workflow);
      if (
        mutation.outcome === "completed" &&
        (!instance.nodeCompletions[instance.currentNodeId] ||
          !isResearchWorkflowTerminalNode(
            mutation.workflow.definition,
            instance.currentNodeId,
          ))
      ) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_INVALID",
          "A completed Workflow must be on a completed terminal node",
        );
      }
      const payload = {
        workflowInstanceId: instance.workflowInstanceId,
        questId: instance.questId,
        workflowId: instance.workflowId,
        workflowVersion: instance.workflowVersion,
        workflowDigest: instance.workflowDigest,
        outcome: mutation.outcome,
        closedBy: parseNonEmptyString(mutation.closedBy, "closedBy"),
        rationale: parseNonEmptyString(mutation.rationale, "rationale"),
        closedAt: timestamp,
      };
      return {
        schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
        kind: "workflow.closed",
        aggregate: { type: "workflow", id: instance.workflowInstanceId },
        related: [{ type: "quest", id: instance.questId }],
        payload,
      };
    }
    case "decision.record": {
      const decision = decisionSchema.parse(mutation.decision);
      return {
        schemaVersion: RESEARCH_SCHEMA_VERSION,
        kind: "decision.recorded",
        aggregate: { type: "decision", id: decision.id },
        related: [{ type: "proposal", id: decision.proposalId }],
        payload: { decision },
      };
    }
  }
}

function validateArtifactDigests(
  root: string,
  events: readonly ResearchEvent[],
  state: ResearchState,
  repositoryRoots?: Readonly<Partial<Record<RepositoryId, string>>>,
): void {
  for (const event of events) {
    for (const artifact of artifactsFromEvent(event)) {
      if (artifact.sha256 === undefined) continue;
      const repository = requireRepository(
        state.repositories,
        artifact.repositoryId,
      );
      if (
        !verifyArtifactSha256(
          root,
          repository,
          artifact,
          repositoryRoots?.[artifact.repositoryId],
        )
      ) {
        throw new Error(
          `Artifact '${artifact.id}' sha256 does not match '${artifact.path}'`,
        );
      }
    }
  }
}

function artifactsFromEvent(event: ResearchEvent): ArtifactRef[] {
  switch (event.kind) {
    case "artifact.registered":
      return [event.payload.artifact as ArtifactRef];
    case "quest.created":
      return (event.payload.quest as { artifactRefs: ArtifactRef[] })
        .artifactRefs;
    case "evidence.created":
      return (event.payload.evidence as { artifactRefs: ArtifactRef[] })
        .artifactRefs;
    case "dispatch.recorded":
      return (event.payload.dispatch as Dispatch).context
        .map((entry) => entry.artifact)
        .filter((artifact): artifact is ArtifactRef => artifact !== undefined);
    case "result.recorded":
      return (event.payload.result as Result).artifactRefs;
    default:
      return [];
  }
}

function reconcileSequenceCache(seqFile: string, ledgerHead: number): void {
  let cached: number | null = null;
  try {
    const value = Number(fs.readFileSync(seqFile, "utf-8").trim());
    if (Number.isInteger(value) && value >= 0) cached = value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (cached !== ledgerHead) writeRuntimeFile(seqFile, `${ledgerHead}\n`);
}

function writeRuntimeFile(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, content, { encoding: "utf-8", mode: 0o600 });
    fs.renameSync(temp, file);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

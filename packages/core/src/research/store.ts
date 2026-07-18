import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { verifyArtifactSha256 } from "./artifacts.js";
import { proposalOperationsToMutations } from "./dispatch.js";
import { createEventId } from "./ids.js";
import { withResearchLock } from "./internal/lock.js";
import { parseResearchLedger, parseResearchEvent, serializeResearchEvents } from "./events.js";
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
  RESEARCH_SCHEMA_VERSION,
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
  type QuestId,
  type QuestStage,
  type QuestStatus,
  type Repository,
  type RepositoryId,
  type ResearchActor,
  type ResearchEvent,
  type ResearchEventKind,
  type ResearchProvenance,
  type ResearchState,
  type Result,
  type RunId,
  type RunStatus,
  type WorkspaceId,
} from "./types.js";

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
  | { kind: "result.record"; result: Result }
  | { kind: "proposal.record"; proposal: Proposal }
  | { kind: "decision.record"; decision: Decision };

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
    super(`Research events committed through seq ${headSeq}, but projection update failed`, {
      cause,
    });
    this.name = "ResearchProjectionError";
    this.headSeq = headSeq;
  }
}

interface EventDraft {
  kind: ResearchEventKind;
  aggregate: ResearchEvent["aggregate"];
  related: ResearchEvent["related"];
  payload: Record<string, unknown>;
}

export async function readResearchLedger(root: string): Promise<ResearchEvent[]> {
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

export async function validateResearchBatch(
  input: CommitResearchBatchInput,
): Promise<ResearchBatchValidation> {
  const paths = researchPaths(input.root);
  return withResearchLock(paths.lockFile, async () => {
    const events = await readResearchLedger(input.root);
    const replay = events.filter(
      (event) => event.idempotencyKey === input.idempotencyKey,
    );
    if (replay.length > 0) {
      return { events: replay, state: reduceResearchEvents(events) };
    }
    return buildValidatedBatch(events, input);
  });
}

export async function commitResearchBatch(
  input: CommitResearchBatchInput,
): Promise<ResearchCommitResult> {
  const paths = researchPaths(input.root);
  return withResearchLock(paths.lockFile, async () => {
    const existing = await readResearchLedger(input.root);
    reconcileSequenceCache(paths.seqFile, existing.at(-1)?.seq ?? 0);
    const replay = existing.filter(
      (event) => event.idempotencyKey === input.idempotencyKey,
    );
    if (replay.length > 0) {
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
      const files = writeResearchProjections(paths, validation.state, allEvents);
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
  const events = input.mutations.map((mutation, index) => {
    const draft = mutationToEventDraft(mutation, timestamp);
    return parseResearchEvent({
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      eventId: createEventId(),
      seq: existing.length + index + 1,
      timestamp,
      kind: draft.kind,
      aggregate: draft.aggregate,
      related: draft.related,
      payload: draft.payload,
      actor,
      idempotencyKey,
      provenance,
    });
  });
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

function validateDispatchBatch(
  events: readonly ResearchEvent[],
  existingState: ResearchState,
  timestamp: string,
): void {
  const resultEvents = events.filter((event) => event.kind === "result.recorded");
  const proposalEvents = events.filter(
    (event) => event.kind === "proposal.recorded",
  );
  if (resultEvents.length > 0 || proposalEvents.length > 0) {
    if (
      events.length !== 2 ||
      events[0]?.kind !== "result.recorded" ||
      events[1]?.kind !== "proposal.recorded"
    ) {
      throw new Error(
        "Research Result and Proposal must be recorded together in one batch",
      );
    }
    const result = events[0].payload.result as Result;
    const proposal = events[1].payload.proposal as Proposal;
    if (result.dispatchId !== proposal.dispatchId) {
      throw new Error(
        "Research Result and Proposal must reference the same Dispatch",
      );
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
    throw new Error("A research Decision must be the final mutation in its batch");
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
        kind: "repository.registered",
        aggregate: { type: "repository", id: repository.id },
        related: [],
        payload: { repository },
      };
    }
    case "artifact.register": {
      const artifact = artifactRefSchema.parse(mutation.artifact);
      return {
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
        kind: "quest.created",
        aggregate: { type: "quest", id: quest.id },
        related: quest.repositoryIds.map((id) => ({ type: "repository", id })),
        payload: { quest },
      };
    }
    case "quest.status":
      return {
        kind: "quest.status_changed",
        aggregate: { type: "quest", id: mutation.questId },
        related: [],
        payload: { status: parseQuestStatus(mutation.status) },
      };
    case "quest.stage":
      return {
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
        kind: "campaign.created",
        aggregate: { type: "campaign", id: campaign.id },
        related: [{ type: "quest", id: campaign.questId }],
        payload: { campaign },
      };
    }
    case "campaign.protocol":
      return {
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
        kind: "campaign.frozen",
        aggregate: { type: "campaign", id: mutation.campaignId },
        related: [],
        payload: {},
      };
    case "campaign.status":
      return {
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
        kind: "run.created",
        aggregate: { type: "run", id: run.id },
        related: [{ type: "campaign", id: run.campaignId }],
        payload: { run },
      };
    }
    case "run.status":
      return {
        kind: "run.status_changed",
        aggregate: { type: "run", id: mutation.runId },
        related: [],
        payload: { status: parseRunStatus(mutation.status) },
      };
    case "run.invalidate":
      return {
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
        kind: "evidence.created",
        aggregate: { type: "evidence", id: evidence.id },
        related: [
          { type: "quest", id: evidence.questId },
          ...(evidence.runId ? [{ type: "run" as const, id: evidence.runId }] : []),
        ],
        payload: { evidence },
      };
    }
    case "evidence.status":
      return {
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
        kind: "claim.status_changed",
        aggregate: { type: "claim", id: mutation.claimId },
        related: [],
        payload: { status: parseClaimStatus(mutation.status) },
      };
    case "dispatch.record": {
      const dispatch = dispatchSchema.parse(mutation.dispatch);
      return {
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
    case "result.record": {
      const result = resultSchema.parse(mutation.result);
      return {
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
        kind: "proposal.recorded",
        aggregate: { type: "proposal", id: proposal.id },
        related: [
          { type: "dispatch", id: proposal.dispatchId },
          { type: "quest", id: proposal.questId },
        ],
        payload: { proposal },
      };
    }
    case "decision.record": {
      const decision = decisionSchema.parse(mutation.decision);
      return {
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
        throw new Error(`Artifact '${artifact.id}' sha256 does not match '${artifact.path}'`);
      }
    }
  }
}

function artifactsFromEvent(event: ResearchEvent): ArtifactRef[] {
  switch (event.kind) {
    case "artifact.registered":
      return [event.payload.artifact as ArtifactRef];
    case "quest.created":
      return (event.payload.quest as { artifactRefs: ArtifactRef[] }).artifactRefs;
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

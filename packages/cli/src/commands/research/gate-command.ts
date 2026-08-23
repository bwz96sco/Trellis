import { randomUUID } from "node:crypto";

import {
  commitResearchBatch,
  createScientificGateRecordId,
  getEffectiveScientificGateRecord,
  listResearchWorkflowOutgoingTransitions,
  normalizeScientificGateEvidenceRefs,
  normalizeScientificGateRefs,
  parseScientificGateDecision,
  parseScientificGateId,
  readResearchLedger,
  readResearchState,
  reduceResearchEvents,
  ResearchScientificGateError,
  ResearchWorkflowError,
  validateResearchBatchReadOnly,
  type ArtifactId,
  type ResearchEvent,
  type ScientificGateDecision,
  type ScientificGateId,
  type ScientificGateRecord,
  type WorkflowInstanceId,
} from "@mindfoldhq/trellis-core/research";
import { InvalidArgumentError } from "commander";

import {
  requireResearchText,
  resolveResearchRoot,
  type ResearchOutputOptions,
} from "./common.js";
import { ResearchActivationError, ResearchCliError } from "./errors.js";
import { resolveResearchWorkflowDefinition } from "./workflow-definition-resolution.js";

export interface ResearchGateMutationOptions extends ResearchOutputOptions {
  idempotencyKey?: string;
  dryRun?: boolean;
  write?: boolean;
}

export interface RecordResearchScientificGateOptions extends ResearchGateMutationOptions {
  instance: WorkflowInstanceId;
  gate: ScientificGateId;
  decision: ScientificGateDecision;
  actor: string;
  rationale: string;
  approvedRef: readonly string[];
  rejectedRef: readonly string[];
  evidenceRef: readonly ArtifactId[];
  sourceArtifact?: ArtifactId;
}

export interface ResearchGateMutationResult {
  schemaVersion: 1;
  command: "research gate record";
  idempotencyKey: string;
  state: "preview" | "committed" | "replayed";
  dryRun: boolean;
  replayed: boolean;
  headSeq: number;
  event: ResearchEvent;
  record: ScientificGateRecord;
}

export interface ResearchGateStatusResult {
  schemaVersion: 1;
  command: "research gate status";
  workflowInstanceId: WorkflowInstanceId;
  questId: string;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
  workflowStatus: string;
  currentNodeId: string;
  currentNodeCompleted: boolean;
  declaredGateIds: ScientificGateId[];
  history: ScientificGateRecord[];
  effective: {
    H1: ScientificGateRecord | null;
    H2: ScientificGateRecord | null;
  };
}

function mapGateError(error: unknown): never {
  if (error instanceof ResearchCliError) throw error;
  if (error instanceof ResearchScientificGateError) {
    throw new ResearchCliError("research_gate_invalid", error.message, {
      cause: error,
    });
  }
  if (error instanceof ResearchWorkflowError) {
    throw new ResearchCliError("research_workflow_invalid", error.message, {
      cause: error,
    });
  }
  throw error;
}

function rejectConflictingFlags(options: ResearchGateMutationOptions): void {
  if (options.dryRun === true && options.write === true) {
    throw new InvalidArgumentError(
      "--dry-run and --write cannot be used together",
    );
  }
}

function matchingGateEvent(
  events: readonly ResearchEvent[],
  options: RecordResearchScientificGateOptions,
  approvedRefs: readonly string[],
  rejectedRefs: readonly string[],
  evidenceRefs: readonly ArtifactId[],
): ResearchEvent {
  if (events.length !== 1 || events[0] === undefined) {
    throw new ResearchActivationError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
  const event = events[0];
  if (
    event.schemaVersion !== 3 ||
    event.kind !== "scientific-gate.recorded" ||
    event.payload.workflowInstanceId !== options.instance ||
    event.payload.gateId !== options.gate ||
    event.payload.decision !== options.decision ||
    event.payload.actor !== options.actor ||
    event.payload.rationale !== options.rationale
  ) {
    throw new ResearchActivationError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
  const record = event.payload as unknown as ScientificGateRecord;
  const sameArray = (
    left: readonly string[],
    right: readonly string[],
  ): boolean =>
    left.length === right.length &&
    left.every((entry, index) => entry === right[index]);
  if (
    !sameArray(record.approvedRefs, approvedRefs) ||
    !sameArray(record.rejectedRefs, rejectedRefs) ||
    !sameArray(record.evidenceRefs, evidenceRefs) ||
    record.sourceArtifactId !== options.sourceArtifact
  ) {
    throw new ResearchActivationError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
  return event;
}

export async function recordResearchScientificGate(
  options: RecordResearchScientificGateOptions,
): Promise<ResearchGateMutationResult> {
  rejectConflictingFlags(options);
  const root = resolveResearchRoot(options);
  const idempotencyKey =
    options.idempotencyKey ?? `cli:gate:record:${randomUUID()}`;
  requireResearchText(idempotencyKey, "idempotency key");
  try {
    const gateId = parseScientificGateId(options.gate);
    const decision = parseScientificGateDecision(options.decision);
    const refs = normalizeScientificGateRefs({
      approvedRefs: options.approvedRef,
      rejectedRefs: options.rejectedRef,
    });
    const evidenceRefs = normalizeScientificGateEvidenceRefs(
      options.evidenceRef,
    );
    const existing = await readResearchLedger(root);
    const replay = existing.filter(
      (event) => event.idempotencyKey === idempotencyKey,
    );
    if (replay.length > 0) {
      reduceResearchEvents(existing);
      const event = matchingGateEvent(
        replay,
        options,
        refs.approvedRefs,
        refs.rejectedRefs,
        evidenceRefs,
      );
      return {
        schemaVersion: 1,
        command: "research gate record",
        idempotencyKey,
        state: "replayed",
        dryRun: options.write !== true,
        replayed: true,
        headSeq: existing.at(-1)?.seq ?? 0,
        event,
        record: event.payload as unknown as ScientificGateRecord,
      };
    }

    const state = await readResearchState(root);
    const instance = state.workflowInstances[options.instance];
    if (instance === undefined) {
      throw new ResearchScientificGateError(
        `Workflow instance '${options.instance}' does not exist`,
      );
    }
    const workflow = resolveResearchWorkflowDefinition({
      root,
      id: instance.workflowId,
      version: instance.workflowVersion,
      expectedDigest: instance.workflowDigest,
    });
    const input = {
      root,
      mutations: [
        {
          kind: "scientific-gate.record" as const,
          recordId: createScientificGateRecordId(),
          workflowInstanceId: options.instance,
          gateId,
          decision,
          actor: options.actor,
          rationale: options.rationale,
          approvedRefs: refs.approvedRefs,
          rejectedRefs: refs.rejectedRefs,
          evidenceRefs,
          ...(options.sourceArtifact === undefined
            ? {}
            : { sourceArtifactId: options.sourceArtifact }),
          workflow,
        },
      ],
      actor: { type: "agent" as const, id: "trellis-cli" },
      provenance: { source: "trellis research gate record" },
      idempotencyKey,
    };
    if (options.write === true) {
      const committed = await commitResearchBatch(input);
      if (committed.replayed) {
        reduceResearchEvents(await readResearchLedger(root));
      }
      const event = matchingGateEvent(
        committed.events,
        options,
        refs.approvedRefs,
        refs.rejectedRefs,
        evidenceRefs,
      );
      return {
        schemaVersion: 1,
        command: "research gate record",
        idempotencyKey,
        state: committed.replayed ? "replayed" : "committed",
        dryRun: false,
        replayed: committed.replayed,
        headSeq: committed.headSeq,
        event,
        record: event.payload as unknown as ScientificGateRecord,
      };
    }
    const validated = await validateResearchBatchReadOnly(input);
    const event = matchingGateEvent(
      validated.events,
      options,
      refs.approvedRefs,
      refs.rejectedRefs,
      evidenceRefs,
    );
    const canonicalEvents = await readResearchLedger(root);
    const canonicalIds = new Set(canonicalEvents.map((entry) => entry.eventId));
    const replayed = validated.events.every((entry) =>
      canonicalIds.has(entry.eventId),
    );
    if (replayed) reduceResearchEvents(canonicalEvents);
    return {
      schemaVersion: 1,
      command: "research gate record",
      idempotencyKey,
      state: replayed ? "replayed" : "preview",
      dryRun: true,
      replayed,
      headSeq: replayed ? (canonicalEvents.at(-1)?.seq ?? 0) : event.seq,
      event,
      record: event.payload as unknown as ScientificGateRecord,
    };
  } catch (error) {
    mapGateError(error);
  }
}

export async function getResearchScientificGateStatus(
  options: ResearchOutputOptions & { instance: WorkflowInstanceId },
): Promise<ResearchGateStatusResult> {
  const root = resolveResearchRoot(options);
  try {
    const state = await readResearchState(root);
    const instance = state.workflowInstances[options.instance];
    if (instance === undefined) {
      throw new ResearchScientificGateError(
        `Workflow instance '${options.instance}' does not exist`,
      );
    }
    const workflow = resolveResearchWorkflowDefinition({
      root,
      id: instance.workflowId,
      version: instance.workflowVersion,
      expectedDigest: instance.workflowDigest,
    });
    const declared = new Set<ScientificGateId>();
    for (const transition of listResearchWorkflowOutgoingTransitions(
      workflow.definition,
      instance.currentNodeId,
    )) {
      for (const gateId of transition.requiredGateIds) declared.add(gateId);
    }
    const history = (
      state.scientificGateRecordIdsByWorkflowInstanceId[options.instance] ?? []
    ).map((recordId) => state.scientificGateRecords[recordId]);
    return {
      schemaVersion: 1,
      command: "research gate status",
      workflowInstanceId: instance.workflowInstanceId,
      questId: instance.questId,
      workflowId: instance.workflowId,
      workflowVersion: instance.workflowVersion,
      workflowDigest: instance.workflowDigest,
      workflowStatus: instance.status,
      currentNodeId: instance.currentNodeId,
      currentNodeCompleted:
        instance.nodeCompletions[instance.currentNodeId] !== undefined,
      declaredGateIds: (["H1", "H2"] as const).filter((gateId) =>
        declared.has(gateId),
      ),
      history,
      effective: {
        H1:
          getEffectiveScientificGateRecord(
            state,
            instance.workflowInstanceId,
            instance.currentNodeId,
            "H1",
          ) ?? null,
        H2:
          getEffectiveScientificGateRecord(
            state,
            instance.workflowInstanceId,
            instance.currentNodeId,
            "H2",
          ) ?? null,
      },
    };
  } catch (error) {
    mapGateError(error);
  }
}

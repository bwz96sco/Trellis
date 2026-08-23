import {
  approvalIdSchema,
  artifactRefSchema,
  campaignSchema,
  claimSchema,
  decisionSchema,
  dispatchSchema,
  evidenceSchema,
  eventIdSchema,
  parseCampaignStatus,
  parseClaimStatus,
  parseEvidenceStatus,
  parseIsoTimestamp,
  parseNonEmptyString,
  parseQuestStage,
  parseQuestStatus,
  parseResearchSchemaV2Timestamp,
  parseRunStatus,
  proposalIdSchema,
  proposalSchema,
  questSchema,
  repositorySchema,
  researchActivationSchema,
  researchActorSchema,
  researchAggregateRefSchema,
  researchApprovalGrantSchema,
  researchProvenanceSchema,
  researchSchemaV2AggregateRefSchema,
  resultIdSchema,
  resultSchema,
  runSchema,
  type RuntimeSchema,
  workspaceSchema,
} from "./schema.js";
import { parseScientificGateRecord } from "./scientific-gate.js";
import {
  RESEARCH_EVENT_SCHEMA_VERSION,
  RESEARCH_SCHEMA_VERSION,
  RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
  type ResearchAggregateRef,
  type ResearchEvent,
  type ResearchEventKind,
  type ResearchSchemaV1Event,
  type ResearchSchemaV2AggregateRef,
  type ResearchSchemaV2Event,
  type ResearchSchemaV2EventKind,
  type ResearchSchemaV3AggregateRef,
  type ResearchSchemaV3Event,
  type ResearchSchemaV3EventKind,
  type ScientificGateRecord,
  type WorkflowBindPayload,
  type WorkflowClosePayload,
  type WorkflowNodeCompletePayload,
  type WorkflowTransitionRecordPayload,
} from "./types.js";
import {
  parseWorkflowBindPayload,
  parseWorkflowClosePayload,
  parseWorkflowNodeCompletePayload,
  parseWorkflowTransitionRecordPayload,
} from "./workflow.js";

export const RESEARCH_EVENT_KINDS: readonly ResearchEventKind[] = [
  "workspace.created",
  "repository.registered",
  "artifact.registered",
  "quest.created",
  "quest.status_changed",
  "quest.stage_changed",
  "campaign.created",
  "campaign.protocol_updated",
  "campaign.frozen",
  "campaign.status_changed",
  "run.created",
  "run.status_changed",
  "run.invalidated",
  "evidence.created",
  "evidence.status_changed",
  "claim.created",
  "claim.status_changed",
  "dispatch.recorded",
  "result.recorded",
  "proposal.recorded",
  "decision.recorded",
];

export const RESEARCH_SCHEMA_V2_EVENT_KINDS: readonly ResearchSchemaV2EventKind[] =
  [
    "activation.planned",
    "approval.granted",
    "approval.revoked",
    "approval.consumed",
  ];

export const RESEARCH_SCHEMA_V3_EVENT_KINDS: readonly ResearchSchemaV3EventKind[] =
  [
    "workflow.bound",
    "workflow.node_completed",
    "workflow.transition_recorded",
    "workflow.closed",
    "scientific-gate.recorded",
  ];

function object(
  input: unknown,
  name: string,
  allowed: readonly string[],
  required: readonly string[] = allowed,
): Record<string, unknown> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    throw new Error(`${name} must be a JSON object`);
  }
  const value = input as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      throw new Error(`${name}.${key} is not supported`);
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`${name}.${key} is required`);
  }
  return value;
}

function oneField(
  input: unknown,
  field: string,
  parser: (value: unknown) => unknown,
): Record<string, unknown> {
  const value = object(input, "event.payload", [field]);
  return { [field]: parser(value[field]) };
}

function parsePayload(
  kind: ResearchEventKind,
  input: unknown,
): Record<string, unknown> {
  switch (kind) {
    case "workspace.created":
      return oneField(input, "workspace", workspaceSchema.parse);
    case "repository.registered":
      return oneField(input, "repository", repositorySchema.parse);
    case "artifact.registered":
      return oneField(input, "artifact", artifactRefSchema.parse);
    case "quest.created":
      return oneField(input, "quest", questSchema.parse);
    case "quest.status_changed":
      return oneField(input, "status", parseQuestStatus);
    case "quest.stage_changed":
      return oneField(input, "stage", parseQuestStage);
    case "campaign.created":
      return oneField(input, "campaign", campaignSchema.parse);
    case "campaign.protocol_updated":
      return oneField(input, "protocolDigest", (value) =>
        parseNonEmptyString(value, "event.payload.protocolDigest"),
      );
    case "campaign.frozen":
      object(input, "event.payload", [], []);
      return {};
    case "campaign.status_changed":
      return oneField(input, "status", parseCampaignStatus);
    case "run.created":
      return oneField(input, "run", runSchema.parse);
    case "run.status_changed":
      return oneField(input, "status", parseRunStatus);
    case "run.invalidated":
      return oneField(input, "reason", (value) =>
        parseNonEmptyString(value, "event.payload.reason"),
      );
    case "evidence.created":
      return oneField(input, "evidence", evidenceSchema.parse);
    case "evidence.status_changed":
      return oneField(input, "status", parseEvidenceStatus);
    case "claim.created":
      return oneField(input, "claim", claimSchema.parse);
    case "claim.status_changed":
      return oneField(input, "status", parseClaimStatus);
    case "dispatch.recorded":
      return oneField(input, "dispatch", dispatchSchema.parse);
    case "result.recorded":
      return oneField(input, "result", resultSchema.parse);
    case "proposal.recorded":
      return oneField(input, "proposal", proposalSchema.parse);
    case "decision.recorded":
      return oneField(input, "decision", decisionSchema.parse);
  }
}

function parseBoundedPayloadString(
  value: unknown,
  name: string,
  maximumLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength
  ) {
    throw new Error(
      `${name} must contain between 1 and ${maximumLength} characters`,
    );
  }
  return value;
}

function parseSchemaV2Payload(
  kind: ResearchSchemaV2EventKind,
  input: unknown,
): Record<string, unknown> {
  switch (kind) {
    case "activation.planned":
      return oneField(input, "activation", researchActivationSchema.parse);
    case "approval.granted":
      return oneField(input, "approval", researchApprovalGrantSchema.parse);
    case "approval.revoked": {
      const value = object(input, "event.payload", [
        "approvalId",
        "revokedAt",
        "reason",
      ]);
      return {
        approvalId: approvalIdSchema.parse(value.approvalId),
        revokedAt: parseResearchSchemaV2Timestamp(
          value.revokedAt,
          "event.payload.revokedAt",
        ),
        reason: parseBoundedPayloadString(
          value.reason,
          "event.payload.reason",
          1_024,
        ),
      };
    }
    case "approval.consumed": {
      const value = object(input, "event.payload", [
        "approvalId",
        "resultId",
        "proposalId",
        "consumedAt",
      ]);
      return {
        approvalId: approvalIdSchema.parse(value.approvalId),
        resultId: resultIdSchema.parse(value.resultId),
        proposalId: proposalIdSchema.parse(value.proposalId),
        consumedAt: parseResearchSchemaV2Timestamp(
          value.consumedAt,
          "event.payload.consumedAt",
        ),
      };
    }
  }
}

function assertSchemaV2Ref(
  refs: readonly ResearchSchemaV2AggregateRef[],
  index: number,
  type: ResearchSchemaV2AggregateRef["type"],
  id?: string,
): void {
  const ref = refs[index];
  if (ref?.type !== type || (id !== undefined && ref?.id !== id)) {
    const expected = id === undefined ? type : `${type}:${id}`;
    const received = ref ? `${ref.type}:${ref.id}` : "missing";
    throw new Error(
      `research event.related[${index}] must be ${expected}, received ${received}`,
    );
  }
}

function validateSchemaV2Relations(event: ResearchSchemaV2Event): void {
  switch (event.kind) {
    case "activation.planned": {
      const activation = event.payload.activation as ReturnType<
        typeof researchActivationSchema.parse
      >;
      if (
        event.aggregate.type !== "activation" ||
        event.aggregate.id !== activation.id
      ) {
        throw new Error(
          `activation.planned aggregate must be activation:${activation.id}`,
        );
      }
      if (event.related.length !== 2) {
        throw new Error(
          "activation.planned must contain exactly 2 related refs",
        );
      }
      assertSchemaV2Ref(event.related, 0, "dispatch", activation.dispatchId);
      assertSchemaV2Ref(event.related, 1, "quest", activation.questId);
      return;
    }
    case "approval.granted": {
      const approval = event.payload.approval as ReturnType<
        typeof researchApprovalGrantSchema.parse
      >;
      if (
        event.aggregate.type !== "approval" ||
        event.aggregate.id !== approval.id
      ) {
        throw new Error(
          `approval.granted aggregate must be approval:${approval.id}`,
        );
      }
      if (event.related.length !== 3) {
        throw new Error("approval.granted must contain exactly 3 related refs");
      }
      assertSchemaV2Ref(event.related, 0, "activation", approval.activationId);
      assertSchemaV2Ref(event.related, 1, "dispatch", approval.dispatchId);
      assertSchemaV2Ref(event.related, 2, "quest");
      return;
    }
    case "approval.revoked": {
      const approvalId = event.payload.approvalId as string;
      if (
        event.aggregate.type !== "approval" ||
        event.aggregate.id !== approvalId
      ) {
        throw new Error(
          `approval.revoked aggregate must be approval:${approvalId}`,
        );
      }
      if (event.related.length !== 2) {
        throw new Error("approval.revoked must contain exactly 2 related refs");
      }
      assertSchemaV2Ref(event.related, 0, "activation");
      assertSchemaV2Ref(event.related, 1, "dispatch");
      return;
    }
    case "approval.consumed": {
      const approvalId = event.payload.approvalId as string;
      const resultId = event.payload.resultId as string;
      const proposalId = event.payload.proposalId as string;
      if (
        event.aggregate.type !== "approval" ||
        event.aggregate.id !== approvalId
      ) {
        throw new Error(
          `approval.consumed aggregate must be approval:${approvalId}`,
        );
      }
      if (event.related.length !== 4) {
        throw new Error(
          "approval.consumed must contain exactly 4 related refs",
        );
      }
      assertSchemaV2Ref(event.related, 0, "activation");
      assertSchemaV2Ref(event.related, 1, "dispatch");
      assertSchemaV2Ref(event.related, 2, "result", resultId);
      assertSchemaV2Ref(event.related, 3, "proposal", proposalId);
    }
  }
}

function parseSchemaV3AggregateRef(
  input: unknown,
): ResearchSchemaV3AggregateRef {
  const value = object(input, "research event aggregate ref", ["type", "id"]);
  if (
    value.type !== "workflow" &&
    value.type !== "quest" &&
    value.type !== "result" &&
    value.type !== "artifact" &&
    value.type !== "scientific-gate"
  ) {
    throw new Error(
      "schema-v3 aggregate ref type must be workflow, quest, result, artifact, or scientific-gate",
    );
  }
  return {
    type: value.type,
    id: parseNonEmptyString(value.id, "research event aggregate ref.id"),
  };
}

function parseSchemaV3Payload(
  kind: ResearchSchemaV3EventKind,
  input: unknown,
): Record<string, unknown> {
  switch (kind) {
    case "workflow.bound":
      return parseWorkflowBindPayload(input) as unknown as Record<
        string,
        unknown
      >;
    case "workflow.node_completed":
      return parseWorkflowNodeCompletePayload(input) as unknown as Record<
        string,
        unknown
      >;
    case "workflow.transition_recorded":
      return parseWorkflowTransitionRecordPayload(input) as unknown as Record<
        string,
        unknown
      >;
    case "workflow.closed":
      return parseWorkflowClosePayload(input) as unknown as Record<
        string,
        unknown
      >;
    case "scientific-gate.recorded":
      return parseScientificGateRecord(input) as unknown as Record<
        string,
        unknown
      >;
  }
}

function assertSchemaV3Ref(
  refs: readonly ResearchSchemaV3AggregateRef[],
  index: number,
  type: ResearchSchemaV3AggregateRef["type"],
  id: string,
): void {
  const ref = refs[index];
  if (ref?.type !== type || ref.id !== id) {
    throw new Error(`research event.related[${index}] must be ${type}:${id}`);
  }
}

function validateSchemaV3Relations(event: ResearchSchemaV3Event): void {
  if (event.kind === "scientific-gate.recorded") {
    const record = event.payload as unknown as ScientificGateRecord;
    if (
      event.aggregate.type !== "scientific-gate" ||
      event.aggregate.id !== record.id
    ) {
      throw new Error(
        `scientific-gate.recorded aggregate must be scientific-gate:${record.id}`,
      );
    }
    if (event.related.length !== record.evidenceRefs.length + 2) {
      throw new Error(
        "scientific-gate.recorded related refs must contain Quest, Workflow, then evidence Artifacts",
      );
    }
    assertSchemaV3Ref(event.related, 0, "quest", record.questId);
    assertSchemaV3Ref(event.related, 1, "workflow", record.workflowInstanceId);
    record.evidenceRefs.forEach((artifactId, index) =>
      assertSchemaV3Ref(event.related, index + 2, "artifact", artifactId),
    );
    return;
  }

  const payload = event.payload as unknown as
    | WorkflowBindPayload
    | WorkflowNodeCompletePayload
    | WorkflowTransitionRecordPayload
    | WorkflowClosePayload;
  if (
    event.aggregate.type !== "workflow" ||
    event.aggregate.id !== payload.workflowInstanceId
  ) {
    throw new Error(
      `${event.kind} aggregate must be workflow:${payload.workflowInstanceId}`,
    );
  }
  assertSchemaV3Ref(event.related, 0, "quest", payload.questId);
  if (event.kind === "workflow.node_completed") {
    const completion = payload as WorkflowNodeCompletePayload;
    if (event.related.length !== completion.acceptedRefs.length + 1) {
      throw new Error(
        "workflow.node_completed related refs must contain Quest then accepted refs",
      );
    }
    completion.acceptedRefs.forEach((ref, index) =>
      assertSchemaV3Ref(event.related, index + 1, ref.kind, ref.id),
    );
    return;
  }
  if (event.kind === "workflow.transition_recorded") {
    const transition = payload as WorkflowTransitionRecordPayload;
    if (event.related.length !== transition.gateRecordIds.length + 1) {
      throw new Error(
        "workflow.transition_recorded related refs must contain Quest then gate records",
      );
    }
    transition.gateRecordIds.forEach((recordId, index) =>
      assertSchemaV3Ref(event.related, index + 1, "scientific-gate", recordId),
    );
    return;
  }
  if (event.related.length !== 1) {
    throw new Error(`${event.kind} must contain exactly one Quest related ref`);
  }
}

export function parseResearchEvent(input: unknown): ResearchEvent {
  const value = object(input, "research event", [
    "schemaVersion",
    "eventId",
    "seq",
    "timestamp",
    "kind",
    "aggregate",
    "related",
    "payload",
    "actor",
    "idempotencyKey",
    "provenance",
  ]);
  if (
    value.schemaVersion !== RESEARCH_SCHEMA_VERSION &&
    value.schemaVersion !== RESEARCH_EVENT_SCHEMA_VERSION &&
    value.schemaVersion !== RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION
  ) {
    throw new Error(
      `research event.schemaVersion must be one of: ${RESEARCH_SCHEMA_VERSION}, ${RESEARCH_EVENT_SCHEMA_VERSION}, ${RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION}`,
    );
  }
  if (
    typeof value.seq !== "number" ||
    !Number.isInteger(value.seq) ||
    value.seq < 1
  ) {
    throw new Error("research event.seq must be a positive integer");
  }
  if (typeof value.kind !== "string") {
    throw new Error("research event.kind must be a string");
  }
  if (!Array.isArray(value.related)) {
    throw new Error("research event.related must be an array");
  }
  const common = {
    eventId: eventIdSchema.parse(value.eventId),
    seq: value.seq,
    actor: researchActorSchema.parse(value.actor),
    idempotencyKey: parseNonEmptyString(
      value.idempotencyKey,
      "research event.idempotencyKey",
    ),
    provenance: researchProvenanceSchema.parse(value.provenance),
  };

  if (value.schemaVersion === RESEARCH_SCHEMA_VERSION) {
    if (!RESEARCH_EVENT_KINDS.includes(value.kind as ResearchEventKind)) {
      throw new Error(
        `schema-v1 research event.kind must be one of: ${RESEARCH_EVENT_KINDS.join(", ")}`,
      );
    }
    return {
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      eventId: common.eventId,
      seq: common.seq,
      timestamp: parseIsoTimestamp(value.timestamp, "research event.timestamp"),
      kind: value.kind as ResearchEventKind,
      aggregate: researchAggregateRefSchema.parse(value.aggregate),
      related: value.related.map((entry) =>
        researchAggregateRefSchema.parse(entry),
      ) as ResearchAggregateRef[],
      payload: parsePayload(value.kind as ResearchEventKind, value.payload),
      actor: common.actor,
      idempotencyKey: common.idempotencyKey,
      provenance: common.provenance,
    } satisfies ResearchSchemaV1Event;
  }

  if (value.schemaVersion === RESEARCH_EVENT_SCHEMA_VERSION) {
    if (
      !RESEARCH_SCHEMA_V2_EVENT_KINDS.includes(
        value.kind as ResearchSchemaV2EventKind,
      )
    ) {
      throw new Error(
        `schema-v2 research event.kind must be one of: ${RESEARCH_SCHEMA_V2_EVENT_KINDS.join(", ")}`,
      );
    }
    const event = {
      schemaVersion: RESEARCH_EVENT_SCHEMA_VERSION,
      eventId: common.eventId,
      seq: common.seq,
      timestamp: parseResearchSchemaV2Timestamp(
        value.timestamp,
        "research event.timestamp",
      ),
      kind: value.kind as ResearchSchemaV2EventKind,
      aggregate: researchSchemaV2AggregateRefSchema.parse(value.aggregate),
      related: value.related.map((entry) =>
        researchSchemaV2AggregateRefSchema.parse(entry),
      ),
      payload: parseSchemaV2Payload(
        value.kind as ResearchSchemaV2EventKind,
        value.payload,
      ),
      actor: common.actor,
      idempotencyKey: common.idempotencyKey,
      provenance: common.provenance,
    } satisfies ResearchSchemaV2Event;
    validateSchemaV2Relations(event);
    return event;
  }

  if (
    !RESEARCH_SCHEMA_V3_EVENT_KINDS.includes(
      value.kind as ResearchSchemaV3EventKind,
    )
  ) {
    throw new Error(
      `schema-v3 research event.kind must be one of: ${RESEARCH_SCHEMA_V3_EVENT_KINDS.join(", ")}`,
    );
  }
  const event = {
    schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
    eventId: common.eventId,
    seq: common.seq,
    timestamp: parseResearchSchemaV2Timestamp(
      value.timestamp,
      "research event.timestamp",
    ),
    kind: value.kind as ResearchSchemaV3EventKind,
    aggregate: parseSchemaV3AggregateRef(value.aggregate),
    related: value.related.map(parseSchemaV3AggregateRef),
    payload: parseSchemaV3Payload(
      value.kind as ResearchSchemaV3EventKind,
      value.payload,
    ),
    actor: common.actor,
    idempotencyKey: common.idempotencyKey,
    provenance: common.provenance,
  } satisfies ResearchSchemaV3Event;
  validateSchemaV3Relations(event);
  return event;
}

export const researchEventSchema: RuntimeSchema<ResearchEvent> = {
  parse: parseResearchEvent,
  safeParse(input) {
    try {
      return { success: true, data: parseResearchEvent(input) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export function parseResearchLedger(
  text: string,
  source = "research events ledger",
): ResearchEvent[] {
  const events: ResearchEvent[] = [];
  const eventIds = new Set<string>();
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim().length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(
        `${source} line ${index + 1}: malformed JSON: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    let event: ResearchEvent;
    try {
      event = parseResearchEvent(parsed);
    } catch (error) {
      throw new Error(
        `${source} line ${index + 1}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const expectedSeq = events.length + 1;
    if (event.seq !== expectedSeq) {
      throw new Error(
        `${source} line ${index + 1}: expected seq ${expectedSeq}, received ${event.seq}`,
      );
    }
    if (eventIds.has(event.eventId)) {
      throw new Error(
        `${source} line ${index + 1}: duplicate eventId '${event.eventId}'`,
      );
    }
    eventIds.add(event.eventId);
    events.push(event);
  }
  return events;
}

export function serializeResearchEvents(
  events: readonly ResearchEvent[],
): string {
  if (events.length === 0) return "";
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

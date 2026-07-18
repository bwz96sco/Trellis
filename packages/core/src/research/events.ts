import {
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
  parseRunStatus,
  proposalSchema,
  questSchema,
  repositorySchema,
  researchActorSchema,
  researchAggregateRefSchema,
  researchProvenanceSchema,
  resultSchema,
  runSchema,
  type RuntimeSchema,
  workspaceSchema,
} from "./schema.js";
import {
  RESEARCH_SCHEMA_VERSION,
  type ResearchEvent,
  type ResearchEventKind,
} from "./types.js";

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
    if (!allowed.includes(key)) throw new Error(`${name}.${key} is not supported`);
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
  if (value.schemaVersion !== RESEARCH_SCHEMA_VERSION) {
    throw new Error(
      `research event.schemaVersion must be ${RESEARCH_SCHEMA_VERSION}`,
    );
  }
  if (
    typeof value.seq !== "number" ||
    !Number.isInteger(value.seq) ||
    value.seq < 1
  ) {
    throw new Error("research event.seq must be a positive integer");
  }
  if (
    typeof value.kind !== "string" ||
    !RESEARCH_EVENT_KINDS.includes(value.kind as ResearchEventKind)
  ) {
    throw new Error(
      `research event.kind must be one of: ${RESEARCH_EVENT_KINDS.join(", ")}`,
    );
  }
  if (!Array.isArray(value.related)) {
    throw new Error("research event.related must be an array");
  }
  const idempotencyKey = parseNonEmptyString(
    value.idempotencyKey,
    "research event.idempotencyKey",
  );
  return {
    schemaVersion: RESEARCH_SCHEMA_VERSION,
    eventId: eventIdSchema.parse(value.eventId),
    seq: value.seq,
    timestamp: parseIsoTimestamp(value.timestamp, "research event.timestamp"),
    kind: value.kind as ResearchEventKind,
    aggregate: researchAggregateRefSchema.parse(value.aggregate),
    related: value.related.map((entry) =>
      researchAggregateRefSchema.parse(entry),
    ),
    payload: parsePayload(value.kind as ResearchEventKind, value.payload),
    actor: researchActorSchema.parse(value.actor),
    idempotencyKey,
    provenance: researchProvenanceSchema.parse(value.provenance),
  };
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

export function serializeResearchEvents(events: readonly ResearchEvent[]): string {
  if (events.length === 0) return "";
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

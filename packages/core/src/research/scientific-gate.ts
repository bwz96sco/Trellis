import type {
  ArtifactId,
  QuestId,
  ResearchState,
  ScientificGateDecision,
  ScientificGateId,
  ScientificGateRecord,
  ScientificGateRecordId,
  WorkflowInstanceId,
} from "./types.js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^sha256:[0-9a-f]{64}$/;

export class ResearchScientificGateError extends Error {
  readonly code = "RESEARCH_GATE_INVALID" as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResearchScientificGateError";
  }
}

function fail(message: string, cause?: unknown): never {
  throw new ResearchScientificGateError(
    message,
    cause === undefined ? undefined : { cause },
  );
}

function plainObject(
  input: unknown,
  label: string,
  allowed: readonly string[],
  required: readonly string[] = allowed,
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    fail(`${label} must be a JSON object`);
  }
  const value = input as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${label}.${key} is not supported`);
  }
  for (const key of required) {
    if (!(key in value)) fail(`${label}.${key} is required`);
  }
  return value;
}

function nonEmptyString(input: unknown, label: string): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return input;
}

function trimmedNonEmptyString(input: unknown, label: string): string {
  const value = nonEmptyString(input, label);
  if (value !== value.trim())
    fail(`${label} must not contain surrounding whitespace`);
  return value;
}

function prefixedUuid<T extends string>(
  input: unknown,
  prefix: string,
  label: string,
): T {
  const value = nonEmptyString(input, label);
  if (
    !value.startsWith(`${prefix}_`) ||
    !UUID.test(value.slice(prefix.length + 1))
  ) {
    fail(`${label} must be a ${prefix}_ prefixed UUID`);
  }
  return value as T;
}

function timestamp(input: unknown, label: string): string {
  const value = nonEmptyString(input, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    fail(`${label} must be a canonical RFC3339 UTC timestamp`);
  }
  return value;
}

function exactStringArray(input: unknown, label: string): string[] {
  if (!Array.isArray(input)) fail(`${label} must be an array`);
  const values = input.map((entry, index) =>
    trimmedNonEmptyString(entry, `${label}[${index}]`),
  );
  if (new Set(values).size !== values.length)
    fail(`${label} entries must be unique`);
  return values;
}

export function parseScientificGateRecordId(
  input: unknown,
  label = "scientific gate record ID",
): ScientificGateRecordId {
  return prefixedUuid<ScientificGateRecordId>(input, "gtr", label);
}

export function parseScientificGateId(
  input: unknown,
  label = "scientific gate ID",
): ScientificGateId {
  if (input !== "H1" && input !== "H2") fail(`${label} must be H1 or H2`);
  return input;
}

export function parseScientificGateDecision(
  input: unknown,
  label = "scientific gate decision",
): ScientificGateDecision {
  if (input !== "approve" && input !== "reject") {
    fail(`${label} must be approve or reject`);
  }
  return input;
}

export function normalizeScientificGateRefs(input: {
  approvedRefs: unknown;
  rejectedRefs: unknown;
}): { approvedRefs: string[]; rejectedRefs: string[] } {
  const approvedRefs = exactStringArray(input.approvedRefs, "approvedRefs");
  const rejectedRefs = exactStringArray(input.rejectedRefs, "rejectedRefs");
  if (approvedRefs.length + rejectedRefs.length === 0) {
    fail("at least one approved or rejected scientific reference is required");
  }
  const approved = new Set(approvedRefs);
  const overlap = rejectedRefs.find((ref) => approved.has(ref));
  if (overlap !== undefined) {
    fail(
      `scientific reference '${overlap}' cannot be both approved and rejected`,
    );
  }
  return { approvedRefs, rejectedRefs };
}

export function normalizeScientificGateEvidenceRefs(
  input: unknown,
): ArtifactId[] {
  if (!Array.isArray(input) || input.length === 0) {
    fail("evidenceRefs must be a non-empty array");
  }
  const evidenceRefs = input.map((entry, index) =>
    prefixedUuid<ArtifactId>(entry, "art", `evidenceRefs[${index}]`),
  );
  if (new Set(evidenceRefs).size !== evidenceRefs.length) {
    fail("evidenceRefs entries must be unique");
  }
  return [...evidenceRefs].sort();
}

export function parseScientificGateRecord(
  input: unknown,
): ScientificGateRecord {
  const value = plainObject(
    input,
    "scientific gate record",
    [
      "id",
      "questId",
      "workflowInstanceId",
      "workflowId",
      "workflowVersion",
      "workflowDigest",
      "nodeId",
      "gateId",
      "decision",
      "actor",
      "rationale",
      "approvedRefs",
      "rejectedRefs",
      "evidenceRefs",
      "sourceArtifactId",
      "recordedAt",
    ],
    [
      "id",
      "questId",
      "workflowInstanceId",
      "workflowId",
      "workflowVersion",
      "workflowDigest",
      "nodeId",
      "gateId",
      "decision",
      "actor",
      "rationale",
      "approvedRefs",
      "rejectedRefs",
      "evidenceRefs",
      "recordedAt",
    ],
  );
  const refs = normalizeScientificGateRefs({
    approvedRefs: value.approvedRefs,
    rejectedRefs: value.rejectedRefs,
  });
  const evidenceRefs = normalizeScientificGateEvidenceRefs(value.evidenceRefs);
  const sourceArtifactId =
    value.sourceArtifactId === undefined
      ? undefined
      : prefixedUuid<ArtifactId>(
          value.sourceArtifactId,
          "art",
          "sourceArtifactId",
        );
  if (
    sourceArtifactId !== undefined &&
    !evidenceRefs.includes(sourceArtifactId)
  ) {
    fail("sourceArtifactId must also appear in evidenceRefs");
  }
  const workflowDigest = nonEmptyString(value.workflowDigest, "workflowDigest");
  if (!SHA256.test(workflowDigest)) {
    fail("workflowDigest must be a lowercase SHA-256 binding");
  }
  return {
    id: parseScientificGateRecordId(value.id),
    questId: prefixedUuid<QuestId>(value.questId, "qst", "questId"),
    workflowInstanceId: prefixedUuid<WorkflowInstanceId>(
      value.workflowInstanceId,
      "wfi",
      "workflowInstanceId",
    ),
    workflowId: trimmedNonEmptyString(value.workflowId, "workflowId"),
    workflowVersion: trimmedNonEmptyString(
      value.workflowVersion,
      "workflowVersion",
    ),
    workflowDigest: workflowDigest as `sha256:${string}`,
    nodeId: trimmedNonEmptyString(value.nodeId, "nodeId"),
    gateId: parseScientificGateId(value.gateId),
    decision: parseScientificGateDecision(value.decision),
    actor: nonEmptyString(value.actor, "actor"),
    rationale: nonEmptyString(value.rationale, "rationale"),
    ...refs,
    evidenceRefs,
    ...(sourceArtifactId === undefined ? {} : { sourceArtifactId }),
    recordedAt: timestamp(value.recordedAt, "recordedAt"),
  };
}

export function scientificGateScopeKey(
  workflowInstanceId: WorkflowInstanceId,
  nodeId: string,
  gateId: ScientificGateId,
): string {
  return `${workflowInstanceId}\0${nodeId}\0${gateId}`;
}

export function getEffectiveScientificGateRecord(
  state: ResearchState,
  workflowInstanceId: WorkflowInstanceId,
  nodeId: string,
  gateId: ScientificGateId,
): ScientificGateRecord | undefined {
  const recordId =
    state.effectiveScientificGateRecordIdByScope[
      scientificGateScopeKey(workflowInstanceId, nodeId, gateId)
    ];
  return recordId === undefined
    ? undefined
    : state.scientificGateRecords[recordId];
}

import { createHash } from "node:crypto";
import path from "node:path";

import { stableResearchJson } from "./projections.js";
import type { ResearchMutation } from "./store.js";
import type {
  ArtifactId,
  ClaimId,
  QuestExportRecord,
  QuestExportRecordId,
  QuestId,
  QuestImportMilestone,
  QuestImportMilestoneId,
  QuestImportRecord,
  QuestImportRecordId,
  QuestOwnerBinding,
  QuestRouteBranch,
  QuestRouteDecision,
  QuestRouteNextAction,
  QuestRouteSnapshot,
  QuestRouteSnapshotId,
  QuestScientificUniverse,
  QuestScientificUniverseId,
  QuestSourceIdentity,
  QuestSourceSnapshot,
  QuestWriterTransfer,
  QuestWriterTransferId,
  ResearchSchemaV3AggregateRef,
  ResearchState,
  ScientificGateId,
  ScientificGateRecord,
} from "./types.js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const SCIENTIFIC_UNIVERSE_DIGEST_DOMAIN =
  "trellis-research-scientific-universe-v1\0";

export class ResearchQuestCutoverError extends Error {
  readonly code = "RESEARCH_QUEST_CUTOVER_INVALID" as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResearchQuestCutoverError";
  }
}

function fail(message: string): never {
  throw new ResearchQuestCutoverError(message);
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
    if (!allowed.includes(key)) fail(`${label}.${key} is unsupported`);
  }
  for (const key of required) {
    if (!(key in value)) fail(`${label}.${key} is required`);
  }
  return value;
}

function nonEmptyString(input: unknown, label: string, trim = true): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  const value = trim ? input.trim() : input;
  if (trim && value !== input) fail(`${label} must not contain surrounding whitespace`);
  return value;
}

function prefixedUuid<T extends string>(
  input: unknown,
  prefix: string,
  label: string,
): T {
  const value = nonEmptyString(input, label);
  if (!value.startsWith(`${prefix}_`) || !UUID.test(value.slice(prefix.length + 1))) {
    fail(`${label} must be a ${prefix}_ prefixed UUID`);
  }
  return value as T;
}

function digest(input: unknown, label: string): `sha256:${string}` {
  const value = nonEmptyString(input, label);
  if (!SHA256.test(value)) fail(`${label} must be a lowercase SHA-256 binding`);
  return value as `sha256:${string}`;
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

function positiveInteger(input: unknown, label: string): number {
  if (typeof input !== "number" || !Number.isInteger(input) || input < 1) {
    fail(`${label} must be a positive integer`);
  }
  return input;
}

function jsonValue(input: unknown, label: string): unknown {
  if (
    input === null ||
    typeof input === "string" ||
    typeof input === "boolean" ||
    (typeof input === "number" && Number.isFinite(input))
  ) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((entry, index) => jsonValue(entry, `${label}[${index}]`));
  }
  if (
    typeof input === "object" &&
    input !== null &&
    Object.getPrototypeOf(input) === Object.prototype
  ) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      result[key] = jsonValue(value, `${label}.${key}`);
    }
    return result;
  }
  fail(`${label} must contain only JSON values`);
}

function jsonObject(input: unknown, label: string): Record<string, unknown> {
  plainObject(input, label, Object.keys((input ?? {}) as Record<string, unknown>), []);
  return jsonValue(input, label) as Record<string, unknown>;
}

function exactStringArray(input: unknown, label: string): string[] {
  if (!Array.isArray(input)) fail(`${label} must be an array`);
  const values = input.map((entry, index) =>
    nonEmptyString(entry, `${label}[${index}]`),
  );
  if (new Set(values).size !== values.length) fail(`${label} contains a duplicate`);
  return values;
}

function idArray<T extends string>(
  input: unknown,
  prefix: string,
  label: string,
): T[] {
  if (!Array.isArray(input)) fail(`${label} must be an array`);
  const values = input.map((entry, index) =>
    prefixedUuid<T>(entry, prefix, `${label}[${index}]`),
  );
  if (new Set(values).size !== values.length) fail(`${label} contains a duplicate`);
  return values;
}

function normalizedRelativePath(input: unknown, label: string): string {
  const value = nonEmptyString(input, label);
  if (
    value.includes("\\") ||
    value.includes("\0") ||
    path.posix.isAbsolute(value) ||
    value === "." ||
    value === ".." ||
    value.startsWith("../") ||
    path.posix.normalize(value) !== value
  ) {
    fail(`${label} must be a normalized contained project-relative path`);
  }
  return value;
}

export function parseQuestSourceIdentity(input: unknown): QuestSourceIdentity {
  const value = plainObject(
    input,
    "Quest source identity",
    ["sourceQuestId", "projectSlug", "sourceQuestPath", "sourceEventsPath"],
    ["sourceQuestId", "projectSlug", "sourceQuestPath"],
  );
  return {
    sourceQuestId: nonEmptyString(value.sourceQuestId, "sourceIdentity.sourceQuestId"),
    projectSlug: nonEmptyString(value.projectSlug, "sourceIdentity.projectSlug"),
    sourceQuestPath: normalizedRelativePath(
      value.sourceQuestPath,
      "sourceIdentity.sourceQuestPath",
    ),
    ...(value.sourceEventsPath === undefined
      ? {}
      : {
          sourceEventsPath: normalizedRelativePath(
            value.sourceEventsPath,
            "sourceIdentity.sourceEventsPath",
          ),
        }),
  };
}

export function parseQuestSourceSnapshot(input: unknown): QuestSourceSnapshot {
  const value = plainObject(
    input,
    "Quest source snapshot",
    ["sourceSchemaVersion", "yamlDigest", "eventsDigest", "snapshotDigest"],
    ["sourceSchemaVersion", "yamlDigest", "snapshotDigest"],
  );
  return {
    sourceSchemaVersion: nonEmptyString(
      value.sourceSchemaVersion,
      "sourceSnapshot.sourceSchemaVersion",
    ),
    yamlDigest: digest(value.yamlDigest, "sourceSnapshot.yamlDigest"),
    ...(value.eventsDigest === undefined
      ? {}
      : { eventsDigest: digest(value.eventsDigest, "sourceSnapshot.eventsDigest") }),
    snapshotDigest: digest(value.snapshotDigest, "sourceSnapshot.snapshotDigest"),
  };
}

export function parseQuestImportRecord(input: unknown): QuestImportRecord {
  const value = plainObject(input, "Quest import record", [
    "id",
    "questId",
    "sourceIdentity",
    "sourceSnapshot",
    "sourceStatus",
    "sourceActiveStage",
    "sourceExtensions",
    "artifactIds",
    "claimIds",
    "importedAt",
  ]);
  return {
    id: prefixedUuid<QuestImportRecordId>(value.id, "qir", "import record id"),
    questId: prefixedUuid<QuestId>(value.questId, "qst", "import questId"),
    sourceIdentity: parseQuestSourceIdentity(value.sourceIdentity),
    sourceSnapshot: parseQuestSourceSnapshot(value.sourceSnapshot),
    sourceStatus: nonEmptyString(value.sourceStatus, "import sourceStatus"),
    sourceActiveStage: nonEmptyString(
      value.sourceActiveStage,
      "import sourceActiveStage",
    ),
    sourceExtensions: jsonObject(value.sourceExtensions, "import sourceExtensions"),
    artifactIds: idArray<ArtifactId>(value.artifactIds, "art", "import artifactIds"),
    claimIds: idArray<ClaimId>(value.claimIds, "clm", "import claimIds"),
    importedAt: timestamp(value.importedAt, "import importedAt"),
  };
}

function parseOwnerBinding(input: unknown, index: number): QuestOwnerBinding {
  const value = plainObject(input, `route.ownerBindings[${index}]`, [
    "name",
    "ownerSkill",
    "artifactId",
  ]);
  return {
    name: nonEmptyString(value.name, `route.ownerBindings[${index}].name`),
    ownerSkill: nonEmptyString(
      value.ownerSkill,
      `route.ownerBindings[${index}].ownerSkill`,
    ),
    artifactId: prefixedUuid<ArtifactId>(
      value.artifactId,
      "art",
      `route.ownerBindings[${index}].artifactId`,
    ),
  };
}

function parseRouteBranch(input: unknown, index: number): QuestRouteBranch {
  const value = plainObject(
    input,
    `route.branches[${index}]`,
    ["id", "status", "ownerSkill", "objective", "expectedArtifactId", "sourceFields"],
    ["id", "status", "ownerSkill", "objective", "sourceFields"],
  );
  return {
    id: nonEmptyString(value.id, `route.branches[${index}].id`),
    status: nonEmptyString(value.status, `route.branches[${index}].status`),
    ownerSkill: nonEmptyString(
      value.ownerSkill,
      `route.branches[${index}].ownerSkill`,
    ),
    objective: nonEmptyString(
      value.objective,
      `route.branches[${index}].objective`,
      false,
    ),
    ...(value.expectedArtifactId === undefined
      ? {}
      : {
          expectedArtifactId: prefixedUuid<ArtifactId>(
            value.expectedArtifactId,
            "art",
            `route.branches[${index}].expectedArtifactId`,
          ),
        }),
    sourceFields: jsonObject(
      value.sourceFields,
      `route.branches[${index}].sourceFields`,
    ),
  };
}

function parseRouteDecision(input: unknown): QuestRouteDecision {
  const value = plainObject(input, "route.currentDecision", [
    "id",
    "verdict",
    "rationale",
    "evidenceArtifactIds",
    "sourceFields",
  ]);
  return {
    id: nonEmptyString(value.id, "route.currentDecision.id"),
    verdict: nonEmptyString(value.verdict, "route.currentDecision.verdict"),
    rationale: nonEmptyString(value.rationale, "route.currentDecision.rationale", false),
    evidenceArtifactIds: idArray<ArtifactId>(
      value.evidenceArtifactIds,
      "art",
      "route.currentDecision.evidenceArtifactIds",
    ),
    sourceFields: jsonObject(
      value.sourceFields,
      "route.currentDecision.sourceFields",
    ),
  };
}

function parseNextAction(input: unknown): QuestRouteNextAction {
  const value = plainObject(
    input,
    "route.nextAction",
    ["ownerSkill", "action", "acceptanceGate", "expectedArtifactId"],
    ["ownerSkill", "action", "acceptanceGate"],
  );
  return {
    ownerSkill: nonEmptyString(value.ownerSkill, "route.nextAction.ownerSkill"),
    action: nonEmptyString(value.action, "route.nextAction.action", false),
    acceptanceGate: nonEmptyString(
      value.acceptanceGate,
      "route.nextAction.acceptanceGate",
      false,
    ),
    ...(value.expectedArtifactId === undefined
      ? {}
      : {
          expectedArtifactId: prefixedUuid<ArtifactId>(
            value.expectedArtifactId,
            "art",
            "route.nextAction.expectedArtifactId",
          ),
        }),
  };
}

export function parseQuestRouteSnapshot(input: unknown): QuestRouteSnapshot {
  const value = plainObject(
    input,
    "Quest route snapshot",
    [
      "id",
      "questId",
      "importRecordId",
      "firstReadArtifactIds",
      "ownerBindings",
      "branches",
      "openQuestions",
      "blockers",
      "currentDecision",
      "nextAction",
      "legacyNextActionText",
      "legacyBoard",
      "sourceExtensions",
      "recordedAt",
    ],
    [
      "id",
      "questId",
      "importRecordId",
      "firstReadArtifactIds",
      "ownerBindings",
      "branches",
      "openQuestions",
      "blockers",
      "sourceExtensions",
      "recordedAt",
    ],
  );
  if (!Array.isArray(value.ownerBindings) || !Array.isArray(value.branches)) {
    fail("route ownerBindings and branches must be arrays");
  }
  const ownerBindings = value.ownerBindings.map(parseOwnerBinding);
  const branches = value.branches.map(parseRouteBranch);
  if (new Set(ownerBindings.map((entry) => entry.name)).size !== ownerBindings.length) {
    fail("route owner binding names must be unique");
  }
  if (new Set(branches.map((entry) => entry.id)).size !== branches.length) {
    fail("route branch IDs must be unique");
  }
  return {
    id: prefixedUuid<QuestRouteSnapshotId>(value.id, "qrs", "route id"),
    questId: prefixedUuid<QuestId>(value.questId, "qst", "route questId"),
    importRecordId: prefixedUuid<QuestImportRecordId>(
      value.importRecordId,
      "qir",
      "route importRecordId",
    ),
    firstReadArtifactIds: idArray<ArtifactId>(
      value.firstReadArtifactIds,
      "art",
      "route firstReadArtifactIds",
    ),
    ownerBindings,
    branches,
    openQuestions: exactStringArray(value.openQuestions, "route openQuestions"),
    blockers: exactStringArray(value.blockers, "route blockers"),
    ...(value.currentDecision === undefined
      ? {}
      : { currentDecision: parseRouteDecision(value.currentDecision) }),
    ...(value.nextAction === undefined
      ? {}
      : { nextAction: parseNextAction(value.nextAction) }),
    ...(value.legacyNextActionText === undefined
      ? {}
      : {
          legacyNextActionText: nonEmptyString(
            value.legacyNextActionText,
            "route legacyNextActionText",
            false,
          ),
        }),
    ...(value.legacyBoard === undefined
      ? {}
      : { legacyBoard: jsonObject(value.legacyBoard, "route legacyBoard") }),
    sourceExtensions: jsonObject(value.sourceExtensions, "route sourceExtensions"),
    recordedAt: timestamp(value.recordedAt, "route recordedAt"),
  };
}

export function normalizeQuestScientificUniverseInput(input: {
  gateId: unknown;
  refKind: unknown;
  refs: unknown;
  sourceArtifactIds: unknown;
}): Pick<QuestScientificUniverse, "gateId" | "refKind" | "refs" | "sourceArtifactIds"> {
  if (input.gateId !== "H1" && input.gateId !== "H2") {
    fail("scientific universe gateId must be H1 or H2");
  }
  const expectedKind = input.gateId === "H1" ? "opportunity" : "candidate";
  if (input.refKind !== expectedKind) {
    fail(`scientific universe ${input.gateId} refKind must be ${expectedKind}`);
  }
  if (!Array.isArray(input.refs)) fail("scientific universe refs must be an array");
  const refs = input.refs.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      fail(`scientific universe refs[${index}] must be a non-empty string`);
    }
    return entry.trim();
  });
  if (new Set(refs).size !== refs.length) fail("scientific universe refs contains a duplicate");
  if (refs.length === 0) fail("scientific universe refs must not be empty");
  const refPattern = input.gateId === "H1" ? /^[PB][1-9][0-9]*$/u : /^C[1-9][0-9]*$/u;
  if (refs.some((ref) => !refPattern.test(ref))) {
    fail(`scientific universe ${input.gateId} contains an invalid stable ID`);
  }
  const sourceArtifactIds = idArray<ArtifactId>(
    input.sourceArtifactIds,
    "art",
    "scientific universe sourceArtifactIds",
  );
  if (sourceArtifactIds.length === 0) {
    fail("scientific universe sourceArtifactIds must not be empty");
  }
  return {
    gateId: input.gateId,
    refKind: expectedKind,
    refs,
    sourceArtifactIds,
  };
}

function uint64Frame(bytes: Buffer): Buffer {
  const length = Buffer.alloc(8);
  length.writeBigUInt64BE(BigInt(bytes.length));
  return Buffer.concat([length, bytes]);
}

export function computeQuestScientificUniverseDigest(input: {
  questId: QuestId;
  gateId: ScientificGateId;
  sourceSnapshotDigest: `sha256:${string}`;
  refs: readonly string[];
  sourceArtifactIds: readonly ArtifactId[];
}): `sha256:${string}` {
  const fields = [
    input.questId,
    input.gateId,
    input.sourceSnapshotDigest,
    stableResearchJson([...input.refs]),
    stableResearchJson([...input.sourceArtifactIds]),
  ];
  const hash = createHash("sha256");
  hash.update(Buffer.from(SCIENTIFIC_UNIVERSE_DIGEST_DOMAIN, "utf8"));
  for (const field of fields) hash.update(uint64Frame(Buffer.from(field, "utf8")));
  return `sha256:${hash.digest("hex")}`;
}

export function parseQuestScientificUniverse(input: unknown): QuestScientificUniverse {
  const value = plainObject(input, "Quest scientific universe", [
    "id",
    "questId",
    "importRecordId",
    "gateId",
    "refKind",
    "refs",
    "sourceArtifactIds",
    "sourceSnapshotDigest",
    "universeDigest",
    "recordedAt",
  ]);
  const questId = prefixedUuid<QuestId>(value.questId, "qst", "universe questId");
  const normalized = normalizeQuestScientificUniverseInput({
    gateId: value.gateId,
    refKind: value.refKind,
    refs: value.refs,
    sourceArtifactIds: value.sourceArtifactIds,
  });
  const sourceSnapshotDigest = digest(
    value.sourceSnapshotDigest,
    "universe sourceSnapshotDigest",
  );
  const parsed: QuestScientificUniverse = {
    id: prefixedUuid<QuestScientificUniverseId>(
      value.id,
      "qsu",
      "universe id",
    ),
    questId,
    importRecordId: prefixedUuid<QuestImportRecordId>(
      value.importRecordId,
      "qir",
      "universe importRecordId",
    ),
    ...normalized,
    sourceSnapshotDigest,
    universeDigest: digest(value.universeDigest, "universe universeDigest"),
    recordedAt: timestamp(value.recordedAt, "universe recordedAt"),
  };
  const expected = computeQuestScientificUniverseDigest(parsed);
  if (parsed.universeDigest !== expected) fail("scientific universe digest does not match canonical fields");
  return parsed;
}

export function parseQuestImportMilestone(input: unknown): QuestImportMilestone {
  const value = plainObject(
    input,
    "Quest import milestone",
    [
      "id",
      "questId",
      "importRecordId",
      "sourceEventId",
      "sourceLine",
      "reviewed",
      "timestamp",
      "actor",
      "eventType",
      "milestone",
      "stage",
      "summary",
      "artifactIds",
      "evidenceArtifactIds",
      "claimIds",
      "sourcePayload",
      "sourceExtensions",
    ],
    [
      "id",
      "questId",
      "importRecordId",
      "sourceEventId",
      "sourceLine",
      "reviewed",
      "timestamp",
      "actor",
      "eventType",
      "milestone",
      "summary",
      "artifactIds",
      "evidenceArtifactIds",
      "claimIds",
      "sourcePayload",
      "sourceExtensions",
    ],
  );
  if (value.reviewed !== true) fail("import milestone reviewed must be true");
  return {
    id: prefixedUuid<QuestImportMilestoneId>(value.id, "qim", "milestone id"),
    questId: prefixedUuid<QuestId>(value.questId, "qst", "milestone questId"),
    importRecordId: prefixedUuid<QuestImportRecordId>(
      value.importRecordId,
      "qir",
      "milestone importRecordId",
    ),
    sourceEventId: nonEmptyString(value.sourceEventId, "milestone sourceEventId"),
    sourceLine: positiveInteger(value.sourceLine, "milestone sourceLine"),
    reviewed: true,
    timestamp: timestamp(value.timestamp, "milestone timestamp"),
    actor: nonEmptyString(value.actor, "milestone actor", false),
    eventType: nonEmptyString(value.eventType, "milestone eventType"),
    milestone: nonEmptyString(value.milestone, "milestone milestone", false),
    ...(value.stage === undefined
      ? {}
      : { stage: nonEmptyString(value.stage, "milestone stage") }),
    summary: nonEmptyString(value.summary, "milestone summary", false),
    artifactIds: idArray<ArtifactId>(value.artifactIds, "art", "milestone artifactIds"),
    evidenceArtifactIds: idArray<ArtifactId>(
      value.evidenceArtifactIds,
      "art",
      "milestone evidenceArtifactIds",
    ),
    claimIds: idArray<ClaimId>(value.claimIds, "clm", "milestone claimIds"),
    sourcePayload: jsonObject(value.sourcePayload, "milestone sourcePayload"),
    sourceExtensions: jsonObject(
      value.sourceExtensions,
      "milestone sourceExtensions",
    ),
  };
}

export function parseQuestExportRecord(input: unknown): QuestExportRecord {
  const value = plainObject(input, "Quest export record", [
    "id",
    "questId",
    "sourceSnapshotDigest",
    "exportDigest",
    "mappedStateDigest",
    "validatorDigest",
    "lossReportDigest",
    "validated",
    "recordedAt",
  ]);
  if (value.validated !== true) fail("export record validated must be true");
  return {
    id: prefixedUuid<QuestExportRecordId>(value.id, "qex", "export id"),
    questId: prefixedUuid<QuestId>(value.questId, "qst", "export questId"),
    sourceSnapshotDigest: digest(
      value.sourceSnapshotDigest,
      "export sourceSnapshotDigest",
    ),
    exportDigest: digest(value.exportDigest, "export exportDigest"),
    mappedStateDigest: digest(value.mappedStateDigest, "export mappedStateDigest"),
    validatorDigest: digest(value.validatorDigest, "export validatorDigest"),
    lossReportDigest: digest(value.lossReportDigest, "export lossReportDigest"),
    validated: true,
    recordedAt: timestamp(value.recordedAt, "export recordedAt"),
  };
}

export function parseQuestWriterTransfer(input: unknown): QuestWriterTransfer {
  const value = plainObject(
    input,
    "Quest writer transfer",
    [
      "id",
      "questId",
      "from",
      "to",
      "sourceSnapshotDigest",
      "exportDigest",
      "actor",
      "rationale",
      "recordedAt",
    ],
    [
      "id",
      "questId",
      "from",
      "to",
      "sourceSnapshotDigest",
      "actor",
      "rationale",
      "recordedAt",
    ],
  );
  if (
    (value.from !== "trellis" && value.from !== "source") ||
    (value.to !== "trellis" && value.to !== "source") ||
    value.from === value.to
  ) {
    fail("writer transfer must move between source and trellis");
  }
  return {
    id: prefixedUuid<QuestWriterTransferId>(value.id, "qwt", "transfer id"),
    questId: prefixedUuid<QuestId>(value.questId, "qst", "transfer questId"),
    from: value.from,
    to: value.to,
    sourceSnapshotDigest: digest(
      value.sourceSnapshotDigest,
      "transfer sourceSnapshotDigest",
    ),
    ...(value.exportDigest === undefined
      ? {}
      : { exportDigest: digest(value.exportDigest, "transfer exportDigest") }),
    actor: nonEmptyString(value.actor, "transfer actor", false),
    rationale: nonEmptyString(value.rationale, "transfer rationale", false),
    recordedAt: timestamp(value.recordedAt, "transfer recordedAt"),
  };
}

export function questScientificUniverseScopeKey(
  questId: QuestId,
  gateId: ScientificGateId,
): string {
  return `${questId}\0${gateId}`;
}

export function getCurrentQuestScientificUniverse(
  state: ResearchState,
  questId: QuestId,
  gateId: ScientificGateId,
): QuestScientificUniverse | undefined {
  const id =
    state.latestQuestScientificUniverseIdByScope[
      questScientificUniverseScopeKey(questId, gateId)
    ];
  return id === undefined ? undefined : state.questScientificUniverses[id];
}

export function assertScientificGateCoversUniverse(
  record: Pick<ScientificGateRecord, "approvedRefs" | "rejectedRefs">,
  universe: QuestScientificUniverse,
): void {
  const universeRefs = new Set(universe.refs);
  const supplied = [...record.approvedRefs, ...record.rejectedRefs];
  const outside = supplied.find((ref) => !universeRefs.has(ref));
  if (outside !== undefined) {
    fail(`scientific gate reference '${outside}' is outside the current ${universe.gateId} universe`);
  }
  if (supplied.length !== universe.refs.length || new Set(supplied).size !== supplied.length) {
    fail(`scientific gate references must exactly cover the current ${universe.gateId} universe`);
  }
  const missing = universe.refs.find((ref) => !supplied.includes(ref));
  if (missing !== undefined) {
    fail(`scientific gate references must exactly cover the current ${universe.gateId} universe; missing '${missing}'`);
  }
}

export function isScientificGateCurrentForUniverse(
  state: ResearchState,
  record: ScientificGateRecord,
): boolean {
  const universe = getCurrentQuestScientificUniverse(
    state,
    record.questId,
    record.gateId,
  );
  if (universe === undefined) return true;
  const universeSeq = state.entitySeq[universe.id];
  const recordSeq = state.entitySeq[record.id];
  if (universeSeq === undefined || recordSeq === undefined || recordSeq <= universeSeq) {
    return false;
  }
  try {
    assertScientificGateCoversUniverse(record, universe);
    return true;
  } catch {
    return false;
  }
}

export function questImportRelatedRefs(
  record: QuestImportRecord,
): ResearchSchemaV3AggregateRef[] {
  return [
    { type: "quest", id: record.questId },
    ...record.artifactIds.map((id) => ({ type: "artifact" as const, id })),
    ...record.claimIds.map((id) => ({ type: "claim" as const, id })),
  ];
}

export function questRouteRelatedRefs(
  route: QuestRouteSnapshot,
): ResearchSchemaV3AggregateRef[] {
  return [
    { type: "quest", id: route.questId },
    { type: "quest-import", id: route.importRecordId },
    ...route.firstReadArtifactIds.map((id) => ({ type: "artifact" as const, id })),
    ...route.ownerBindings.map(({ artifactId: id }) => ({ type: "artifact" as const, id })),
    ...route.branches.flatMap(({ expectedArtifactId: id }) =>
      id === undefined ? [] : [{ type: "artifact" as const, id }],
    ),
    ...(route.currentDecision?.evidenceArtifactIds ?? []).map((id) => ({
      type: "artifact" as const,
      id,
    })),
    ...(route.nextAction?.expectedArtifactId === undefined
      ? []
      : [{ type: "artifact" as const, id: route.nextAction.expectedArtifactId }]),
  ];
}

export function questScientificUniverseRelatedRefs(
  universe: QuestScientificUniverse,
): ResearchSchemaV3AggregateRef[] {
  return [
    { type: "quest", id: universe.questId },
    { type: "quest-import", id: universe.importRecordId },
    ...universe.sourceArtifactIds.map((id) => ({ type: "artifact" as const, id })),
  ];
}

export function questImportMilestoneRelatedRefs(
  milestone: QuestImportMilestone,
): ResearchSchemaV3AggregateRef[] {
  return [
    { type: "quest", id: milestone.questId },
    { type: "quest-import", id: milestone.importRecordId },
    ...milestone.artifactIds.map((id) => ({ type: "artifact" as const, id })),
    ...milestone.evidenceArtifactIds.map((id) => ({ type: "artifact" as const, id })),
    ...milestone.claimIds.map((id) => ({ type: "claim" as const, id })),
  ];
}

export function validateQuestImportMutationBatch(
  mutations: readonly ResearchMutation[],
): { questId: QuestId; importRecordId: QuestImportRecordId } {
  const importIndexes = mutations
    .map((mutation, index) => (mutation.kind === "quest.import.record" ? index : -1))
    .filter((index) => index >= 0);
  if (importIndexes.length !== 1) fail("Quest import batch must contain exactly one import record");
  const importIndex = importIndexes[0] as number;
  const importMutation = mutations[importIndex];
  if (importMutation?.kind !== "quest.import.record") fail("Quest import batch is invalid");
  const questId = importMutation.record.questId;
  const importRecordId = importMutation.record.id;
  const importedArtifactIds = new Set(importMutation.record.artifactIds);
  const importedClaimIds = new Set(importMutation.record.claimIds);
  let previousPrefixRank = -1;
  for (const mutation of mutations.slice(0, importIndex)) {
    let rank: number;
    switch (mutation.kind) {
      case "artifact.register":
        if (!importedArtifactIds.has(mutation.artifact.id)) {
          fail("Quest import batch registers an Artifact outside the import record");
        }
        rank = 0;
        break;
      case "quest.create":
        if (mutation.quest.id !== questId) {
          fail("Quest import batch creates a different Quest");
        }
        if (
          mutation.quest.artifactRefs.length !== importedArtifactIds.size ||
          mutation.quest.artifactRefs.some(
            (artifact) => !importedArtifactIds.has(artifact.id),
          )
        ) {
          fail("Quest import batch creates a Quest with different Artifacts");
        }
        rank = 1;
        break;
      case "quest.status":
      case "quest.stage":
        if (mutation.questId !== questId) {
          fail("Quest import batch updates a different Quest");
        }
        rank = 1;
        break;
      case "claim.create":
        if (mutation.claim.questId !== questId) {
          fail("Quest import batch creates a Claim for a different Quest");
        }
        if (!importedClaimIds.has(mutation.claim.id)) {
          fail("Quest import batch creates a Claim outside the import record");
        }
        rank = 2;
        break;
      case "claim.status":
        if (!importedClaimIds.has(mutation.claimId)) {
          fail("Quest import batch updates a Claim outside the import record");
        }
        rank = 2;
        break;
      default:
        fail("Quest import batch prefix contains an unsupported mutation");
    }
    if (rank < previousPrefixRank) {
      fail("Quest import batch prefix mutations are not in fixed order");
    }
    previousPrefixRank = rank;
  }
  const c4b = mutations.slice(importIndex);
  const ranks: number[] = [];
  let routeCount = 0;
  let writerCount = 0;
  let lastSourceLine = 0;
  let universeGateOrder = -1;
  const universeGateIds = new Set<ScientificGateId>();
  for (const mutation of c4b) {
    switch (mutation.kind) {
      case "quest.import.record":
        ranks.push(0);
        break;
      case "quest.route.set": {
        routeCount += 1;
        if (mutation.route.questId !== questId || mutation.route.importRecordId !== importRecordId) {
          fail("Quest import batch route binding does not match import record");
        }
        const routeArtifactIds = [
          ...mutation.route.firstReadArtifactIds,
          ...mutation.route.ownerBindings.map((binding) => binding.artifactId),
          ...mutation.route.branches.flatMap((branch) =>
            branch.expectedArtifactId === undefined ? [] : [branch.expectedArtifactId],
          ),
          ...(mutation.route.currentDecision?.evidenceArtifactIds ?? []),
          ...(mutation.route.nextAction?.expectedArtifactId === undefined
            ? []
            : [mutation.route.nextAction.expectedArtifactId]),
        ];
        if (routeArtifactIds.some((id) => !importedArtifactIds.has(id))) {
          fail("Quest import batch route references an Artifact outside the import record");
        }
        ranks.push(1);
        break;
      }
      case "quest.scientific-universe.record": {
        if (
          mutation.universe.questId !== questId ||
          mutation.universe.importRecordId !== importRecordId
        ) {
          fail("Quest import batch universe binding does not match import record");
        }
        if (
          mutation.universe.sourceArtifactIds.some(
            (id) => !importedArtifactIds.has(id),
          )
        ) {
          fail("Quest import batch universe references an Artifact outside the import record");
        }
        const order = mutation.universe.gateId === "H1" ? 0 : 1;
        if (order <= universeGateOrder) fail("Quest import batch universes must be ordered H1 then H2");
        universeGateOrder = order;
        universeGateIds.add(mutation.universe.gateId);
        ranks.push(2);
        break;
      }
      case "quest.import.milestone":
        if (
          mutation.milestone.questId !== questId ||
          mutation.milestone.importRecordId !== importRecordId ||
          mutation.milestone.sourceLine <= lastSourceLine
        ) {
          fail("Quest import milestones must preserve unique ascending source order");
        }
        if (
          [...mutation.milestone.artifactIds, ...mutation.milestone.evidenceArtifactIds].some(
            (id) => !importedArtifactIds.has(id),
          ) ||
          mutation.milestone.claimIds.some((id) => !importedClaimIds.has(id))
        ) {
          fail("Quest import milestone references an entity outside the import record");
        }
        lastSourceLine = mutation.milestone.sourceLine;
        ranks.push(3);
        break;
      case "quest-writer.transfer":
        writerCount += 1;
        if (
          mutation.transfer.questId !== questId ||
          mutation.transfer.from !== "source" ||
          mutation.transfer.to !== "trellis" ||
          mutation.transfer.sourceSnapshotDigest !==
            importMutation.record.sourceSnapshot.snapshotDigest
        ) {
          fail("Quest import batch writer transfer does not match import snapshot");
        }
        ranks.push(4);
        break;
      default:
        fail("Quest import batch C4b mutations are not in fixed order");
    }
  }
  if (
    routeCount !== 1 ||
    universeGateIds.size !== 2 ||
    !universeGateIds.has("H1") ||
    !universeGateIds.has("H2") ||
    writerCount !== 1 ||
    c4b.at(-1)?.kind !== "quest-writer.transfer" ||
    ranks.some((rank, index) => index > 0 && rank < (ranks[index - 1] ?? -1))
  ) {
    fail("Quest import batch C4b mutations are not in fixed order");
  }
  return { questId, importRecordId };
}

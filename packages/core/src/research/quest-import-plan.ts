import { createHash } from "node:crypto";
import path from "node:path";

import { stableResearchJson } from "./projections.js";
import { parseStrictResearchJson } from "./strict-json.js";
import type { ResearchMutation } from "./store.js";
import type {
  ArtifactId,
  ArtifactRef,
  ClaimId,
  ClaimStatus,
  QuestId,
  QuestImportMilestone,
  QuestImportRecordId,
  QuestRouteBranch,
  QuestRouteDecision,
  QuestRouteNextAction,
  QuestRouteSnapshotId,
  QuestScientificUniverseId,
  QuestStage,
  QuestStatus,
  QuestWriterTransferId,
  RepositoryId,
  ResearchState,
} from "./types.js";

export const QUEST_IMPORT_PLAN_SCHEMA_VERSION = 1 as const;
export const QUEST_IMPORT_CONTRACT_VERSION = "c4b-v1" as const;
export const FROZEN_C1_SOURCE_MANIFEST_DIGEST =
  "sha256:45fc8483b372088838cdf7b2759cb3087de18434daa5c994eaaa23c0f9c5be42" as const;

const PREVIEW_DOMAIN = "trellis-research-quest-import-preview-v1\0";
const PLAN_DOMAIN = "trellis-research-quest-import-plan-v1\0";
const SNAPSHOT_DOMAIN = "trellis-research-quest-source-snapshot-v1\0";
const ID_DOMAIN = "trellis-research-quest-import-id-v1\0";
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const SOURCE_EVENT_TYPES = new Set([
  "quest_created",
  "stage_opened",
  "artifact_changed",
  "evidence_added",
  "claim_updated",
  "decision_recorded",
  "route_changed",
  "blocker_added",
  "blocker_cleared",
  "validation_run",
  "handoff_created",
  "mempal_checkpoint",
  "task_forest_proposal",
]);
const SOURCE_OWNERS = new Set([
  "research-quest",
  "research-quest-admin",
  "research-harness",
  "research-project-setup",
  "research-literature",
  "research-opportunity-mining",
  "research-ideation",
  "research-idea-evaluation",
  "research-experiment",
  "research-experiment-campaign",
  "research-computation",
  "research-theory",
  "research-writing",
  "research-figure",
  "research-slides",
  "research-review-case",
  "research-review-campaign",
  "research-innovation-explorer",
  "model-training-workflow",
  "experiment-adapter-builder",
]);
const BRANCH_STATUSES = new Set([
  "active",
  "blocked",
  "parked",
  "done",
  "abandoned",
]);
const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "version",
  "quest_id",
  "project_slug",
  "title",
  "objective",
  "status",
  "active_stage",
  "current_stage",
  "first_read",
  "authoritative_artifacts",
  "evidence",
  "branches",
  "claims",
  "open_questions",
  "current_decision",
  "next_action",
  "board",
  "blockers",
]);
const EVENT_FIELDS = new Set([
  "event_id",
  "timestamp",
  "actor",
  "event_type",
  "milestone",
  "stage",
  "summary",
  "artifacts",
  "evidence",
  "claim_updates",
  "decision",
  "next_action",
]);
const AUTHORITATIVE_ARTIFACT_FIELDS = new Set(["path", "owner_skill"]);
const LEGACY_EVIDENCE_FIELDS = new Set(["path"]);
const BRANCH_FIELDS = new Set([
  "id",
  "status",
  "owner_skill",
  "objective",
  "expected_artifact",
]);
const CLAIM_FIELDS = new Set([
  "id",
  "owner_skill",
  "branch_id",
  "status",
  "statement",
  "text",
  "evidence_paths",
]);
const DECISION_FIELDS = new Set(["id", "verdict", "rationale", "evidence_paths"]);
const NEXT_ACTION_FIELDS = new Set([
  "owner_skill",
  "action",
  "acceptance_gate",
  "expected_artifact",
]);
const EVENT_ARTIFACT_FIELDS = new Set(["path", "owner_skill", "role", "action"]);
const EVENT_EVIDENCE_FIELDS = new Set(["path", "role"]);
const EVENT_CLAIM_UPDATE_FIELDS = new Set(["claim_id", "id", "to_status"]);
const NO_FIELDS = new Set<string>();

export interface QuestImportSourceArtifactV1 {
  path: string;
  bytes: Uint8Array;
  kind?: string;
  mediaType?: string;
}

export interface QuestImportConflictV1 {
  code: "research_quest_import_conflict";
  path: string;
  message: string;
  line?: number;
}

export interface QuestImportExtensionInventoryEntryV1 {
  path: string;
  value: unknown;
}

export interface QuestImportLossReportV1 {
  exactRoundTrip: string[];
  normalizedEquivalent: string[];
  canonicalOnlyOmitted: string[];
  preservedExtensions: string[];
  blockingLosses: string[];
}

export interface BuildQuestImportPlanV1Input {
  sourceProjectRoot: string;
  sourceQuestPath: string;
  sourceEventsPath?: string;
  questYamlBytes: Uint8Array;
  eventsJsonlBytes?: Uint8Array;
  repositoryId: RepositoryId;
  sourceArtifacts: readonly QuestImportSourceArtifactV1[];
  actor: string;
  rationale: string;
  frozenManifestDigest?: `sha256:${string}`;
  existingQuestId?: QuestId;
  state: ResearchState;
}

export interface QuestImportPlanV1 {
  schemaVersion: typeof QUEST_IMPORT_PLAN_SCHEMA_VERSION;
  commandFamily: "research-quest-import";
  contractVersion: typeof QUEST_IMPORT_CONTRACT_VERSION;
  source: {
    projectRoot: string;
    questPath: string;
    questAbsolutePath: string;
    eventsPath?: string;
    eventsAbsolutePath?: string;
    yamlDigest: `sha256:${string}`;
    eventsDigest?: `sha256:${string}`;
    snapshotDigest: `sha256:${string}`;
  };
  frozenManifestDigest: `sha256:${string}`;
  repositoryId: RepositoryId;
  quest: {
    id: QuestId;
    sourceQuestId: string;
    projectSlug: string;
    title: string;
    description: string;
    status: QuestStatus;
    stage: QuestStage;
  };
  conflicts: QuestImportConflictV1[];
  extensionInventory: QuestImportExtensionInventoryEntryV1[];
  lossReport: QuestImportLossReportV1;
  lossReportDigest: `sha256:${string}`;
  semanticPlanDigest: `sha256:${string}`;
  previewToken: `qip_${string}` | null;
  mutations: ResearchMutation[];
}

type JsonObject = Record<string, unknown>;
interface ArtifactUse {
  path: string;
  owner?: string;
  required: boolean;
  label: string;
}

function frame(bytes: Buffer): Buffer {
  const length = Buffer.alloc(8);
  length.writeBigUInt64BE(BigInt(bytes.length));
  return Buffer.concat([length, bytes]);
}

function hashBytes(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function domainDigest(domain: string, values: readonly string[]): `sha256:${string}` {
  const hash = createHash("sha256");
  hash.update(Buffer.from(domain, "utf8"));
  for (const value of values) hash.update(frame(Buffer.from(value, "utf8")));
  return `sha256:${hash.digest("hex")}`;
}

function deterministicId<T extends string>(
  prefix: string,
  semanticDigest: string,
  role: string,
): T {
  const bytes = createHash("sha256")
    .update(ID_DOMAIN)
    .update(frame(Buffer.from(semanticDigest, "utf8")))
    .update(frame(Buffer.from(role, "utf8")))
    .digest()
    .subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${prefix}_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as T;
}

function strictText(bytes: Uint8Array, label: string): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error(`${label} must not contain a UTF-8 BOM`);
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(`${label} must be valid UTF-8`, { cause: error });
  }
  if (text.includes("\0")) throw new Error(`${label} must not contain NUL`);
  return text;
}

function stripYamlComment(line: string): string {
  let single = false;
  let double = false;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && double) {
      escaped = true;
      continue;
    }
    if (char === "'" && !double) single = !single;
    else if (char === '"' && !single) double = !double;
    else if (char === "#" && !single && !double) return line.slice(0, index);
  }
  return line;
}

function yamlScalar(raw: string): unknown {
  const value = raw.trim();
  if (value === "{}") return {};
  if (value === "[]") return [];
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value) as unknown;
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (/^-?(?:0|[1-9][0-9]*)$/u.test(value)) return Number(value);
  if (/^-?(?:0|[1-9][0-9]*)\.[0-9]+$/u.test(value)) return Number(value);
  return value;
}

interface YamlRow {
  indent: number;
  content: string;
  line: number;
}

function splitYamlKeyValue(content: string, line: number): [string, string] {
  const separator = content.indexOf(":");
  if (separator < 1) throw new Error(`Quest YAML line ${line}: expected key/value`);
  const key = content.slice(0, separator).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/u.test(key)) {
    throw new Error(`Quest YAML line ${line}: invalid key '${key}'`);
  }
  return [key, content.slice(separator + 1).trim()];
}

function parseYamlMap(
  rows: readonly YamlRow[],
  start: number,
  indent: number,
): [JsonObject, number] {
  const result: JsonObject = {};
  let index = start;
  while (index < rows.length) {
    const row = rows[index];
    if (row === undefined || row.indent < indent || row.content.startsWith("- ")) break;
    if (row.indent > indent) {
      throw new Error(`Quest YAML line ${row.line}: unexpected indentation`);
    }
    const [key, raw] = splitYamlKeyValue(row.content, row.line);
    if (key in result) throw new Error(`Quest YAML line ${row.line}: duplicate key '${key}'`);
    index += 1;
    if (raw.length > 0) {
      result[key] = yamlScalar(raw);
    } else if ((rows[index]?.indent ?? -1) > row.indent) {
      [result[key], index] = parseYamlBlock(rows, index, rows[index]?.indent ?? 0);
    } else {
      result[key] = {};
    }
  }
  return [result, index];
}

function parseYamlList(
  rows: readonly YamlRow[],
  start: number,
  indent: number,
): [unknown[], number] {
  const result: unknown[] = [];
  let index = start;
  while (index < rows.length) {
    const row = rows[index];
    if (row === undefined || row.indent < indent || !row.content.startsWith("- ")) break;
    if (row.indent > indent) {
      throw new Error(`Quest YAML line ${row.line}: unexpected indentation`);
    }
    const raw = row.content.slice(2).trim();
    index += 1;
    if (raw.length === 0) {
      if ((rows[index]?.indent ?? -1) > row.indent) {
        let value: unknown;
        [value, index] = parseYamlBlock(rows, index, rows[index]?.indent ?? 0);
        result.push(value);
      } else {
        result.push(null);
      }
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_.-]*\s*:/u.test(raw)) {
      const [key, value] = splitYamlKeyValue(raw, row.line);
      const item: JsonObject = { [key]: value.length === 0 ? {} : yamlScalar(value) };
      if ((rows[index]?.indent ?? -1) > row.indent) {
        let extra: unknown;
        [extra, index] = parseYamlBlock(rows, index, rows[index]?.indent ?? 0);
        if (extra !== null && typeof extra === "object" && !Array.isArray(extra)) {
          for (const [extraKey, extraValue] of Object.entries(extra)) {
            if (extraKey in item) {
              throw new Error(`Quest YAML line ${row.line}: duplicate key '${extraKey}'`);
            }
            item[extraKey] = extraValue;
          }
        } else {
          item[key] = extra;
        }
      }
      result.push(item);
    } else {
      result.push(yamlScalar(raw));
    }
  }
  return [result, index];
}

function parseYamlBlock(
  rows: readonly YamlRow[],
  start: number,
  indent: number,
): [unknown, number] {
  return rows[start]?.content.startsWith("- ")
    ? parseYamlList(rows, start, indent)
    : parseYamlMap(rows, start, indent);
}

function parseQuestYaml(bytes: Uint8Array): JsonObject {
  const text = strictText(bytes, "Quest YAML");
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error("Quest YAML must not be empty");
  if (trimmed.startsWith("{")) {
    const parsed = parseStrictResearchJson(new TextEncoder().encode(trimmed));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Quest YAML must contain an object");
    }
    return structuredClone(parsed as JsonObject);
  }
  const rows: YamlRow[] = [];
  for (const [index, raw] of text.split(/\r?\n/u).entries()) {
    const uncommented = stripYamlComment(raw).replace(/[ \t]+$/u, "");
    if (uncommented.trim().length === 0) continue;
    const indentation = uncommented.match(/^[ \t]*/u)?.[0] ?? "";
    if (indentation.includes("\t")) {
      throw new Error(`Quest YAML line ${index + 1}: tabs are not supported`);
    }
    rows.push({
      indent: indentation.length,
      content: uncommented.trimStart(),
      line: index + 1,
    });
  }
  const [parsed, next] = parseYamlBlock(rows, 0, rows[0]?.indent ?? 0);
  if (next !== rows.length || parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Quest YAML must contain one complete mapping");
  }
  return parsed as JsonObject;
}

function jsonObject(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return undefined;
  }
  return [...value] as string[];
}

function normalizeSourcePath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const withoutFragment = value.split("#", 1)[0]?.trim() ?? "";
  if (
    withoutFragment.length === 0 ||
    withoutFragment.includes("\\") ||
    withoutFragment.includes("\0") ||
    path.posix.isAbsolute(withoutFragment) ||
    withoutFragment === "." ||
    withoutFragment === ".." ||
    withoutFragment.startsWith("../") ||
    path.posix.normalize(withoutFragment) !== withoutFragment
  ) {
    return undefined;
  }
  return withoutFragment;
}

function sourceStatus(value: unknown): QuestStatus | undefined {
  switch (value) {
    case "seed":
    case "active":
      return "active";
    case "paused":
    case "completed":
    case "abandoned":
      return value;
    default:
      return undefined;
  }
}

function sourceStage(value: unknown): QuestStage | undefined {
  if (typeof value !== "string") return undefined;
  let stage = value;
  if (!stage.startsWith("research-")) stage = `research-${stage}`;
  if (stage === "research-harness") stage = "research-quest";
  if (stage === "research-innovation-explorer") stage = "research-ideation";
  switch (stage) {
    case "research-project-setup":
      return "setup";
    case "research-quest":
      return "framing";
    case "research-literature":
      return "literature";
    case "research-opportunity-mining":
    case "research-ideation":
    case "research-idea-evaluation":
      return "ideation";
    case "research-experiment":
    case "research-experiment-campaign":
      return "experiment";
    case "research-computation":
      return "computation";
    case "research-theory":
      return "theory";
    case "research-review-case":
    case "research-review-campaign":
      return "audit";
    case "research-writing":
    case "research-figure":
    case "research-slides":
      return "writing";
    default:
      return undefined;
  }
}

function sourceClaimStatus(value: unknown): ClaimStatus | undefined {
  switch (value) {
    case "candidate":
    case "supported":
    case "contested":
    case "refuted":
    case "withdrawn":
      return value;
    case "partial":
      return "contested";
    case "unsupported":
      return "refuted";
    case "deferred":
      return "withdrawn";
    default:
      return undefined;
  }
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() !== value) return undefined;
  const millis = Date.parse(value);
  return Number.isNaN(millis) ? undefined : new Date(millis).toISOString();
}

function markdownTableRows(markdown: string, heading: string): string[][] {
  const lines = markdown.split(/\r?\n/u);
  const normalizedHeading = heading.toLowerCase();
  const headingIndex = lines.findIndex((line) => {
    const match = /^##\s+(.+?)\s*$/u.exec(line);
    return match?.[1]?.toLowerCase() === normalizedHeading;
  });
  if (headingIndex < 0) throw new Error(`missing section: ${heading}`);
  const rows: string[][] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (/^##\s+/u.test(line)) break;
    if (!line.trim().startsWith("|")) continue;
    const cells = line.trim().replace(/^\||\|$/gu, "").split("|").map((cell) => cell.trim());
    if (cells.length > 0 && !cells.every((cell) => /^:?-+:?$/u.test(cell))) rows.push(cells);
  }
  if (rows.length < 2) throw new Error(`${heading}: missing table rows`);
  return rows;
}

function extractOpportunityRefs(markdown: string): string[] {
  const rows = markdownTableRows(markdown, "Opportunity Board");
  if (rows[0]?.[0]?.toLowerCase() !== "id") {
    throw new Error("Opportunity Board: first table column must be ID");
  }
  const refs = rows
    .slice(1)
    .map((row) => row[0] ?? "")
    .filter((ref) => /^[PB][1-9][0-9]*$/u.test(ref));
  if (refs.length === 0) throw new Error("Opportunity Board: no P/B opportunity IDs");
  if (new Set(refs).size !== refs.length) {
    throw new Error("Opportunity Board: duplicate opportunity ID");
  }
  return refs;
}

function extractCandidateRefs(markdown: string, opportunityRefs: readonly string[]): string[] {
  const headingRefs = [...markdown.matchAll(/^##\s+(C[1-9][0-9]*)\b/gmu)].map(
    (match) => match[1] as string,
  );
  if (headingRefs.length === 0 || new Set(headingRefs).size !== headingRefs.length) {
    throw new Error("candidate headings must use unique C IDs");
  }
  const rows = markdownTableRows(markdown, "Approved Opportunity Coverage");
  if (
    rows[0]?.[0]?.toLowerCase() !== "candidate id" ||
    rows[0]?.[1]?.toLowerCase() !== "approved ids"
  ) {
    throw new Error("coverage columns must be Candidate ID and Approved IDs");
  }
  const allowedOpportunities = new Set(opportunityRefs);
  const coverageRefs: string[] = [];
  for (const row of rows.slice(1)) {
    const candidateRef = row[0] ?? "";
    if (!/^C[1-9][0-9]*$/u.test(candidateRef) || row.length < 2) {
      throw new Error("malformed candidate coverage row");
    }
    if (coverageRefs.includes(candidateRef)) {
      throw new Error(`duplicate coverage for ${candidateRef}`);
    }
    const approvedRefs = (row[1] ?? "")
      .split(",")
      .map((ref) => ref.trim())
      .filter((ref) => ref.length > 0);
    if (approvedRefs.length === 0) {
      throw new Error(`${candidateRef} has no approved opportunity`);
    }
    const unknown = approvedRefs.filter((ref) => !allowedOpportunities.has(ref));
    if (allowedOpportunities.size > 0 && unknown.length > 0) {
      throw new Error(`${candidateRef} cites unknown opportunity IDs ${unknown.join(", ")}`);
    }
    coverageRefs.push(candidateRef);
  }
  if (
    headingRefs.length !== coverageRefs.length ||
    headingRefs.some((ref) => !coverageRefs.includes(ref))
  ) {
    throw new Error("candidate headings and coverage IDs disagree");
  }
  return headingRefs;
}

function extensionEntries(
  value: JsonObject,
  known: ReadonlySet<string>,
  prefix: string,
): QuestImportExtensionInventoryEntryV1[] {
  return Object.keys(value)
    .filter((key) => !known.has(key))
    .sort()
    .map((key) => ({ path: `${prefix}.${key}`, value: structuredClone(value[key]) }));
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

export function buildQuestImportPlanV1(
  input: BuildQuestImportPlanV1Input,
): QuestImportPlanV1 {
  const conflicts: QuestImportConflictV1[] = [];
  const conflict = (conflictPath: string, message: string, line?: number): void => {
    conflicts.push({
      code: "research_quest_import_conflict",
      path: conflictPath,
      message,
      ...(line === undefined ? {} : { line }),
    });
  };
  const sourceProjectRoot = path.resolve(input.sourceProjectRoot);
  if (!path.isAbsolute(input.sourceProjectRoot)) {
    conflict("source.projectRoot", "source project root must be absolute");
  }
  const sourceQuestPath = normalizeSourcePath(input.sourceQuestPath);
  if (sourceQuestPath === undefined) {
    conflict("source.questPath", "source Quest path must be normalized and contained");
  }
  const sourceEventsPath =
    input.sourceEventsPath === undefined
      ? undefined
      : normalizeSourcePath(input.sourceEventsPath);
  if (input.sourceEventsPath !== undefined && sourceEventsPath === undefined) {
    conflict("source.eventsPath", "source events path must be normalized and contained");
  }
  if ((input.eventsJsonlBytes === undefined) !== (sourceEventsPath === undefined)) {
    conflict(
      "source.eventsPath",
      "source events path and JSONL bytes must either both be present or both be absent",
    );
  }
  const manifestDigest = input.frozenManifestDigest ?? FROZEN_C1_SOURCE_MANIFEST_DIGEST;
  if (!SHA256.test(manifestDigest)) {
    conflict("source.frozenManifestDigest", "frozen manifest digest must be SHA-256");
  } else if (manifestDigest !== FROZEN_C1_SOURCE_MANIFEST_DIGEST) {
    conflict("source.frozenManifestDigest", "frozen manifest digest is not the C1 authority");
  }
  if (input.actor.trim().length === 0 || input.actor.trim() !== input.actor) {
    conflict("writer.actor", "writer actor must be trim-nonempty");
  }
  if (input.rationale.trim().length === 0 || input.rationale.trim() !== input.rationale) {
    conflict("writer.rationale", "writer rationale must be trim-nonempty");
  }

  const yamlDigest = hashBytes(input.questYamlBytes);
  const eventsDigest =
    input.eventsJsonlBytes === undefined ? undefined : hashBytes(input.eventsJsonlBytes);
  const snapshotDigest = domainDigest(SNAPSHOT_DOMAIN, [
    sourceQuestPath ?? input.sourceQuestPath,
    yamlDigest,
    sourceEventsPath ?? "",
    eventsDigest ?? "",
  ]);

  let questSource: JsonObject = {};
  try {
    questSource = parseQuestYaml(input.questYamlBytes);
  } catch (error) {
    conflict("quest", error instanceof Error ? error.message : String(error));
  }
  const schemaRaw = questSource.schema_version ?? questSource.version;
  const sourceSchemaVersion = schemaRaw === undefined ? "legacy" : String(schemaRaw);
  if (sourceSchemaVersion !== "legacy" && sourceSchemaVersion !== "0.1" && sourceSchemaVersion !== "0.2" && sourceSchemaVersion !== "1") {
    conflict("quest.schema_version", `unsupported source schema '${sourceSchemaVersion}'`);
  }
  const sourceQuestId = stringValue(questSource.quest_id);
  const projectSlug = stringValue(questSource.project_slug);
  const title = stringValue(questSource.title);
  const objective = stringValue(questSource.objective);
  if (sourceQuestId === undefined) conflict("quest.quest_id", "quest_id is required");
  if (projectSlug === undefined) conflict("quest.project_slug", "project_slug is required");
  if (title === undefined) conflict("quest.title", "title is required");
  if (objective === undefined) conflict("quest.objective", "objective is required");
  const mappedStatus = sourceStatus(questSource.status);
  if (mappedStatus === undefined) conflict("quest.status", `unsupported status '${String(questSource.status)}'`);
  const activeStageRaw = questSource.active_stage ?? questSource.current_stage;
  const mappedStage = sourceStage(activeStageRaw);
  if (mappedStage === undefined) {
    conflict("quest.active_stage", `unsupported active stage '${String(activeStageRaw)}'`);
  }

  const artifactInputs = new Map<string, QuestImportSourceArtifactV1>();
  for (const [index, artifact] of input.sourceArtifacts.entries()) {
    const normalized = normalizeSourcePath(artifact.path);
    if (normalized === undefined) {
      conflict(`sourceArtifacts[${index}].path`, "source Artifact path must be normalized and contained");
      continue;
    }
    if (artifactInputs.has(normalized)) {
      conflict(`sourceArtifacts[${index}].path`, `duplicate source Artifact path '${normalized}'`);
      continue;
    }
    artifactInputs.set(normalized, { ...artifact, path: normalized });
  }

  const uses: ArtifactUse[] = [];
  const addUse = (raw: unknown, label: string, required: boolean, owner?: string): string | undefined => {
    const normalized = normalizeSourcePath(raw);
    if (normalized === undefined) {
      if (raw !== undefined && raw !== null && raw !== "") {
        conflict(label, "Artifact path must be normalized and contained");
      }
      return undefined;
    }
    uses.push({ path: normalized, label, required, ...(owner === undefined ? {} : { owner }) });
    return normalized;
  };

  const firstRead = stringArray(questSource.first_read);
  if (firstRead === undefined) {
    conflict("quest.first_read", "first_read must be an array of paths");
  } else {
    firstRead.forEach((value, index) => addUse(value, `quest.first_read[${index}]`, true));
  }

  const authoritative = jsonObject(questSource.authoritative_artifacts);
  const ownerBindingsSource: { name: string; owner: string; path: string }[] = [];
  if (authoritative === undefined) {
    conflict("quest.authoritative_artifacts", "authoritative_artifacts must be a mapping");
  } else {
    for (const name of Object.keys(authoritative)) {
      const artifact = jsonObject(authoritative[name]);
      if (artifact === undefined) {
        conflict(`quest.authoritative_artifacts.${name}`, "authoritative Artifact must contain path and owner_skill");
        continue;
      }
      const owner = stringValue(artifact.owner_skill);
      if (owner === undefined || !SOURCE_OWNERS.has(owner)) {
        conflict(
          `quest.authoritative_artifacts.${name}.owner_skill`,
          `unknown or missing owner '${String(artifact.owner_skill)}'`,
        );
      }
      const artifactPath = addUse(
        artifact.path,
        `quest.authoritative_artifacts.${name}.path`,
        true,
        owner,
      );
      if (owner !== undefined && SOURCE_OWNERS.has(owner) && artifactPath !== undefined) {
        ownerBindingsSource.push({ name, owner, path: artifactPath });
      }
    }
  }
  for (const binding of ownerBindingsSource) {
    const directory = path.posix.dirname(binding.path);
    const sibling = (name: string): string =>
      directory === "." ? name : `${directory}/${name}`;
    if (path.posix.basename(binding.path) === "opportunity_board.md") {
      addUse(
        sibling("h1_decision.md"),
        "scientificUniverse.H1.validatorArtifact",
        true,
      );
    } else if (path.posix.basename(binding.path) === "ideas.md") {
      addUse(
        sibling("h2_decision.md"),
        "scientificUniverse.H2.validatorArtifact",
        true,
      );
    }
  }

  const evidence = questSource.evidence;
  if (evidence !== undefined) {
    if (!Array.isArray(evidence)) {
      conflict("quest.evidence", "legacy evidence must be an array");
    } else {
      evidence.forEach((entry, index) => {
        const record = jsonObject(entry);
        if (record === undefined) {
          conflict(`quest.evidence[${index}]`, "legacy evidence entry must be a mapping");
        } else {
          addUse(record.path, `quest.evidence[${index}].path`, true);
        }
      });
    }
  }

  const branchSource = Array.isArray(questSource.branches) ? questSource.branches : [];
  if (!Array.isArray(questSource.branches)) conflict("quest.branches", "branches must be an array");
  const branches: (QuestRouteBranch & { expectedPath?: string })[] = [];
  const branchIds = new Set<string>();
  for (const [index, raw] of branchSource.entries()) {
    const branch = jsonObject(raw);
    if (branch === undefined) {
      conflict(`quest.branches[${index}]`, "branch must be a mapping");
      continue;
    }
    const id = stringValue(branch.id);
    const status = stringValue(branch.status);
    const owner = stringValue(branch.owner_skill);
    const branchObjective = stringValue(branch.objective);
    if (id === undefined || branchIds.has(id)) {
      conflict(`quest.branches[${index}].id`, "branch ID must be nonempty and unique");
    } else {
      branchIds.add(id);
    }
    if (status === undefined || !BRANCH_STATUSES.has(status)) {
      conflict(`quest.branches[${index}].status`, `unsupported branch status '${String(branch.status)}'`);
    }
    if (owner === undefined || !SOURCE_OWNERS.has(owner)) {
      conflict(`quest.branches[${index}].owner_skill`, `unknown or missing owner '${String(branch.owner_skill)}'`);
    }
    if (status === "active" && branchObjective === undefined) {
      conflict(`quest.branches[${index}].objective`, "active branch objective is required");
    }
    const expectedPath = addUse(
      branch.expected_artifact,
      `quest.branches[${index}].expected_artifact`,
      false,
    );
    if (id !== undefined && status !== undefined && owner !== undefined && branchObjective !== undefined) {
      branches.push({
        id,
        status,
        ownerSkill: owner,
        objective: branchObjective,
        sourceFields: structuredClone(branch),
        ...(expectedPath === undefined ? {} : { expectedPath }),
      });
    }
  }

  const claimSource = Array.isArray(questSource.claims) ? questSource.claims : [];
  if (!Array.isArray(questSource.claims)) conflict("quest.claims", "claims must be an array");
  const claims: {
    sourceId: string;
    id: ClaimId;
    statement: string;
    status: ClaimStatus;
    source: JsonObject;
    evidencePaths: string[];
  }[] = [];
  const sourceClaimIds = new Set<string>();
  for (const [index, raw] of claimSource.entries()) {
    const claim = jsonObject(raw);
    if (claim === undefined) {
      conflict(`quest.claims[${index}]`, "Claim must be a mapping");
      continue;
    }
    const sourceId = stringValue(claim.id);
    const owner = stringValue(claim.owner_skill);
    const branchId = claim.branch_id === undefined ? undefined : stringValue(claim.branch_id);
    const statement = stringValue(claim.statement ?? claim.text);
    const status = sourceClaimStatus(claim.status);
    if (sourceId === undefined || sourceClaimIds.has(sourceId)) {
      conflict(`quest.claims[${index}].id`, "Claim ID must be nonempty and unique");
    } else {
      sourceClaimIds.add(sourceId);
    }
    if (owner === undefined || !SOURCE_OWNERS.has(owner)) {
      conflict(`quest.claims[${index}].owner_skill`, `unknown or missing owner '${String(claim.owner_skill)}'`);
    }
    if (branchId !== undefined && !branchIds.has(branchId)) {
      conflict(`quest.claims[${index}].branch_id`, `unknown branch '${branchId}'`);
    }
    if (statement === undefined) conflict(`quest.claims[${index}].statement`, "Claim statement is required");
    if (status === undefined) conflict(`quest.claims[${index}].status`, `unsupported Claim status '${String(claim.status)}'`);
    const evidencePaths: string[] = [];
    const sourceEvidencePaths = stringArray(claim.evidence_paths ?? []);
    if (sourceEvidencePaths === undefined) {
      conflict(`quest.claims[${index}].evidence_paths`, "Claim evidence_paths must be an array");
    } else {
      sourceEvidencePaths.forEach((value, evidenceIndex) => {
        const evidencePath = addUse(
          value,
          `quest.claims[${index}].evidence_paths[${evidenceIndex}]`,
          true,
          owner,
        );
        if (evidencePath !== undefined) evidencePaths.push(evidencePath);
      });
    }
    if (sourceId !== undefined && statement !== undefined && status !== undefined) {
      claims.push({
        sourceId,
        id: "" as ClaimId,
        statement,
        status,
        source: structuredClone(claim),
        evidencePaths,
      });
    }
  }

  const openQuestions = stringArray(questSource.open_questions);
  if (openQuestions === undefined) conflict("quest.open_questions", "open_questions must be an array of strings");
  const blockers = stringArray(questSource.blockers);
  if (blockers === undefined) conflict("quest.blockers", "blockers must be an array of strings");

  let currentDecision: (QuestRouteDecision & { evidencePaths: string[] }) | undefined;
  if (questSource.current_decision !== undefined) {
    const decision = jsonObject(questSource.current_decision);
    if (decision === undefined) {
      conflict("quest.current_decision", "current_decision must be a mapping");
    } else if (Object.keys(decision).length > 0) {
      const id = stringValue(decision.id);
      const verdict = stringValue(decision.verdict);
      const rationale = stringValue(decision.rationale);
      if (id === undefined) conflict("quest.current_decision.id", "decision ID is required");
      if (verdict === undefined) conflict("quest.current_decision.verdict", "decision verdict is required");
      if (rationale === undefined) conflict("quest.current_decision.rationale", "decision rationale is required");
      const evidencePaths: string[] = [];
      const paths = stringArray(decision.evidence_paths ?? []);
      if (paths === undefined) {
        conflict("quest.current_decision.evidence_paths", "decision evidence_paths must be an array");
      } else {
        paths.forEach((value, index) => {
          const evidencePath = addUse(value, `quest.current_decision.evidence_paths[${index}]`, true);
          if (evidencePath !== undefined) evidencePaths.push(evidencePath);
        });
      }
      if (id !== undefined && verdict !== undefined && rationale !== undefined) {
        currentDecision = {
          id,
          verdict,
          rationale,
          evidenceArtifactIds: [],
          sourceFields: structuredClone(decision),
          evidencePaths,
        };
      }
    }
  }

  let legacyNextActionText: string | undefined;
  let structuredNextActionSource: JsonObject | undefined;
  let nextAction: (QuestRouteNextAction & { expectedPath?: string }) | undefined;
  if (typeof questSource.next_action === "string") {
    if (questSource.next_action.trim().length > 0) legacyNextActionText = questSource.next_action;
  } else if (questSource.next_action !== undefined) {
    const action = jsonObject(questSource.next_action);
    if (action === undefined) {
      conflict("quest.next_action", "next_action must be a mapping or preserved scalar");
    } else if (Object.keys(action).length > 0) {
      structuredNextActionSource = structuredClone(action);
      const owner = stringValue(action.owner_skill);
      const actionText = stringValue(action.action);
      const acceptanceGate = stringValue(action.acceptance_gate);
      if (owner === undefined || !SOURCE_OWNERS.has(owner)) {
        conflict("quest.next_action.owner_skill", `unknown or missing owner '${String(action.owner_skill)}'`);
      }
      if (actionText === undefined) conflict("quest.next_action.action", "next action is required");
      if (acceptanceGate === undefined) conflict("quest.next_action.acceptance_gate", "acceptance gate is required");
      const expectedPath = addUse(action.expected_artifact, "quest.next_action.expected_artifact", false);
      if (owner !== undefined && actionText !== undefined && acceptanceGate !== undefined) {
        nextAction = {
          ownerSkill: owner,
          action: actionText,
          acceptanceGate,
          ...(expectedPath === undefined ? {} : { expectedPath }),
        };
      }
    }
  }

  const board = questSource.board === undefined ? undefined : jsonObject(questSource.board);
  if (questSource.board !== undefined && board === undefined) {
    conflict("quest.board", "board must be a mapping");
  }

  const parsedEvents: { source: JsonObject; line: number }[] = [];
  if (input.eventsJsonlBytes !== undefined) {
    let eventText = "";
    try {
      eventText = strictText(input.eventsJsonlBytes, "Quest events JSONL");
    } catch (error) {
      conflict("events", error instanceof Error ? error.message : String(error));
    }
    const eventIds = new Set<string>();
    for (const [index, line] of eventText.split(/\r?\n/u).entries()) {
      if (line.trim().length === 0) continue;
      let event: JsonObject | undefined;
      try {
        event = jsonObject(parseStrictResearchJson(new TextEncoder().encode(line)));
      } catch (error) {
        conflict("events", `malformed JSON: ${error instanceof Error ? error.message : String(error)}`, index + 1);
      }
      if (event === undefined) {
        if (line.trim().length > 0) conflict("events", "event line must contain one object", index + 1);
        continue;
      }
      const eventId = stringValue(event.event_id);
      if (eventId === undefined || eventIds.has(eventId)) {
        conflict(`events[${index}].event_id`, "event_id must be nonempty and unique", index + 1);
      } else {
        eventIds.add(eventId);
      }
      if (event.milestone !== true) {
        conflict(`events[${index}].milestone`, "only reviewed milestone=true events may be imported", index + 1);
      }
      if (!SOURCE_EVENT_TYPES.has(String(event.event_type))) {
        conflict(`events[${index}].event_type`, `unsupported event type '${String(event.event_type)}'`, index + 1);
      }
      if (normalizeTimestamp(event.timestamp) === undefined) {
        conflict(`events[${index}].timestamp`, "event timestamp must include a timezone", index + 1);
      }
      if (stringValue(event.actor) === undefined) conflict(`events[${index}].actor`, "event actor is required", index + 1);
      if (stringValue(event.summary) === undefined) conflict(`events[${index}].summary`, "event summary is required", index + 1);
      for (const [collection, requiredOwner] of [["artifacts", true], ["evidence", false]] as const) {
        const entries = event[collection] ?? [];
        if (!Array.isArray(entries)) {
          conflict(`events[${index}].${collection}`, `${collection} must be an array`, index + 1);
          continue;
        }
        entries.forEach((raw, entryIndex) => {
          const entry = jsonObject(raw);
          if (entry === undefined) {
            conflict(`events[${index}].${collection}[${entryIndex}]`, "entry must be a mapping", index + 1);
            return;
          }
          const owner = stringValue(entry.owner_skill);
          if (requiredOwner && (owner === undefined || !SOURCE_OWNERS.has(owner))) {
            conflict(`events[${index}].${collection}[${entryIndex}].owner_skill`, "event Artifact owner is required", index + 1);
          }
          addUse(entry.path, `events[${index}].${collection}[${entryIndex}].path`, true, owner);
        });
      }
      parsedEvents.push({ source: structuredClone(event), line: index + 1 });
    }
  }

  const nestedQuestExtensions: QuestImportExtensionInventoryEntryV1[] = [];
  if (authoritative !== undefined) {
    for (const name of Object.keys(authoritative).sort()) {
      const artifact = jsonObject(authoritative[name]);
      if (artifact !== undefined) {
        nestedQuestExtensions.push(
          ...extensionEntries(
            artifact,
            AUTHORITATIVE_ARTIFACT_FIELDS,
            `quest.authoritative_artifacts.${name}`,
          ),
        );
      }
    }
  }
  if (Array.isArray(evidence)) {
    evidence.forEach((entry, index) => {
      const record = jsonObject(entry);
      if (record !== undefined) {
        nestedQuestExtensions.push(
          ...extensionEntries(record, LEGACY_EVIDENCE_FIELDS, `quest.evidence[${index}]`),
        );
      }
    });
  }
  branchSource.forEach((raw, index) => {
    const branch = jsonObject(raw);
    if (branch !== undefined) {
      nestedQuestExtensions.push(
        ...extensionEntries(branch, BRANCH_FIELDS, `quest.branches[${index}]`),
      );
    }
  });
  claimSource.forEach((raw, index) => {
    const claim = jsonObject(raw);
    if (claim !== undefined) {
      nestedQuestExtensions.push(
        ...extensionEntries(claim, CLAIM_FIELDS, `quest.claims[${index}]`),
      );
    }
  });
  if (currentDecision !== undefined) {
    nestedQuestExtensions.push(
      ...extensionEntries(
        currentDecision.sourceFields,
        DECISION_FIELDS,
        "quest.current_decision",
      ),
    );
  }
  if (structuredNextActionSource !== undefined) {
    nestedQuestExtensions.push(
      ...extensionEntries(
        structuredNextActionSource,
        NEXT_ACTION_FIELDS,
        "quest.next_action",
      ),
    );
  }
  if (board !== undefined) {
    nestedQuestExtensions.push(...extensionEntries(board, NO_FIELDS, "quest.board"));
  }
  const nestedEventExtensions = parsedEvents.flatMap(({ source, line }) => {
    const prefix = `events[line=${line}]`;
    const entries: QuestImportExtensionInventoryEntryV1[] = [];
    for (const [collection, known] of [
      ["artifacts", EVENT_ARTIFACT_FIELDS],
      ["evidence", EVENT_EVIDENCE_FIELDS],
      ["claim_updates", EVENT_CLAIM_UPDATE_FIELDS],
    ] as const) {
      const values = source[collection];
      if (!Array.isArray(values)) continue;
      values.forEach((value, index) => {
        const record = jsonObject(value);
        if (record !== undefined) {
          entries.push(...extensionEntries(record, known, `${prefix}.${collection}[${index}]`));
        }
      });
    }
    const decision = jsonObject(source.decision);
    if (decision !== undefined) {
      entries.push(...extensionEntries(decision, DECISION_FIELDS, `${prefix}.decision`));
    }
    const action = jsonObject(source.next_action);
    if (action !== undefined) {
      entries.push(...extensionEntries(action, NEXT_ACTION_FIELDS, `${prefix}.next_action`));
    }
    return entries;
  });
  const extensionInventory = [
    ...extensionEntries(questSource, TOP_LEVEL_FIELDS, "quest"),
    ...nestedQuestExtensions,
    ...parsedEvents.flatMap(({ source, line }) =>
      extensionEntries(source, EVENT_FIELDS, `events[line=${line}]`),
    ),
    ...nestedEventExtensions,
  ].sort((left, right) => left.path.localeCompare(right.path));

  const ownerByPath = new Map<string, string>();
  const artifactOrder: string[] = [];
  for (const use of uses) {
    if (!artifactOrder.includes(use.path)) artifactOrder.push(use.path);
    if (use.owner !== undefined) {
      const prior = ownerByPath.get(use.path);
      if (prior !== undefined && prior !== use.owner) {
        conflict(use.label, `Artifact '${use.path}' has competing owners '${prior}' and '${use.owner}'`);
      } else {
        ownerByPath.set(use.path, use.owner);
      }
    }
    if (use.required && !artifactInputs.has(use.path)) {
      conflict(use.label, `required source Artifact '${use.path}' was not supplied`);
    }
  }
  const includedArtifactPaths = artifactOrder.filter((artifactPath) => artifactInputs.has(artifactPath));

  const authoritativeArtifactPaths = new Set(
    ownerBindingsSource.map((binding) => binding.path),
  );
  const opportunityArtifactMatches = includedArtifactPaths.filter(
    (artifactPath) =>
      authoritativeArtifactPaths.has(artifactPath) &&
      path.posix.basename(artifactPath) === "opportunity_board.md",
  );
  const ideasArtifactMatches = includedArtifactPaths.filter(
    (artifactPath) =>
      authoritativeArtifactPaths.has(artifactPath) &&
      path.posix.basename(artifactPath) === "ideas.md",
  );
  let opportunityExtractionFailed = false;
  let candidateExtractionFailed = false;
  if (opportunityArtifactMatches.length > 1) {
    opportunityExtractionFailed = true;
    conflict(
      "scientificUniverse.H1",
      `multiple Opportunity Board Artifacts match: ${opportunityArtifactMatches.join(", ")}`,
    );
  }
  if (ideasArtifactMatches.length > 1) {
    candidateExtractionFailed = true;
    conflict(
      "scientificUniverse.H2",
      `multiple candidate Artifacts match: ${ideasArtifactMatches.join(", ")}`,
    );
  }
  const opportunityArtifactPath =
    opportunityArtifactMatches.length === 1 ? opportunityArtifactMatches[0] : undefined;
  const ideasArtifactPath = ideasArtifactMatches.length === 1 ? ideasArtifactMatches[0] : undefined;
  let opportunityRefs: string[] = [];
  let candidateRefs: string[] = [];
  if (opportunityArtifactPath !== undefined) {
    try {
      opportunityRefs = extractOpportunityRefs(
        strictText(
          artifactInputs.get(opportunityArtifactPath)?.bytes ?? new Uint8Array(),
          opportunityArtifactPath,
        ),
      );
    } catch (error) {
      opportunityExtractionFailed = true;
      conflict(
        "scientificUniverse.H1",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  if (ideasArtifactPath !== undefined) {
    try {
      candidateRefs = extractCandidateRefs(
        strictText(
          artifactInputs.get(ideasArtifactPath)?.bytes ?? new Uint8Array(),
          ideasArtifactPath,
        ),
        opportunityRefs,
      );
    } catch (error) {
      candidateExtractionFailed = true;
      conflict(
        "scientificUniverse.H2",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  if (opportunityRefs.length === 0 && !opportunityExtractionFailed) {
    conflict("scientificUniverse.H1", "explicit complete Opportunity Board IDs are required");
  }
  if (candidateRefs.length === 0 && !candidateExtractionFailed) {
    conflict("scientificUniverse.H2", "exact '## C<positive integer>' candidate headings are required");
  }

  const semanticInput = {
    schemaVersion: QUEST_IMPORT_PLAN_SCHEMA_VERSION,
    contractVersion: QUEST_IMPORT_CONTRACT_VERSION,
    source: {
      projectRoot: sourceProjectRoot,
      questPath: sourceQuestPath ?? input.sourceQuestPath,
      eventsPath: sourceEventsPath,
      yamlDigest,
      eventsDigest,
      snapshotDigest,
      sourceSchemaVersion,
    },
    frozenManifestDigest: manifestDigest,
    repositoryId: input.repositoryId,
    sourceQuest: questSource,
    sourceEvents: parsedEvents,
    sourceArtifacts: [...artifactInputs.values()]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((artifact) => ({
        path: artifact.path,
        digest: hashBytes(artifact.bytes),
        kind: artifact.kind,
        mediaType: artifact.mediaType,
      })),
    actor: input.actor,
    rationale: input.rationale,
  };
  const semanticPlanDigest = domainDigest(PLAN_DOMAIN, [stableResearchJson(semanticInput)]);
  const sourceIdentityDigest = domainDigest(ID_DOMAIN, [
    "source-identity",
    sourceQuestId ?? "missing",
    projectSlug ?? "missing",
    sourceQuestPath ?? input.sourceQuestPath,
    sourceEventsPath ?? "",
  ]);

  let questId = input.existingQuestId;
  if (input.state.repositories[input.repositoryId] === undefined) {
    conflict("repositoryId", `Repository '${input.repositoryId}' does not exist`);
  }
  const identityMatches = Object.values(input.state.questImportRecords).filter(
    (record) =>
      record.sourceIdentity.sourceQuestId === sourceQuestId &&
      record.sourceIdentity.projectSlug === projectSlug &&
      record.sourceIdentity.sourceQuestPath === sourceQuestPath,
  );
  const matchedQuestIds = [...new Set(identityMatches.map((record) => record.questId))];
  if (matchedQuestIds.length > 1) {
    conflict("quest.identity", "source identity is bound to multiple canonical Quests");
  } else if (questId === undefined && matchedQuestIds[0] !== undefined) {
    questId = matchedQuestIds[0];
  } else if (
    questId !== undefined &&
    matchedQuestIds[0] !== undefined &&
    questId !== matchedQuestIds[0]
  ) {
    conflict("quest.identity", "requested Quest disagrees with canonical source identity binding");
  }
  if (questId !== undefined && input.state.quests[questId] === undefined) {
    conflict("quest.id", `existing Quest '${questId}' does not exist`);
  }
  if (
    questId !== undefined &&
    input.state.questWriterAuthorityByQuestId[questId]?.writer === "trellis"
  ) {
    conflict("writer", "Quest is currently Trellis-owned; import requires source writer authority");
  }
  const proposedQuestId = questId === undefined;
  questId ??= deterministicId<QuestId>("qst", semanticPlanDigest, "quest");
  const existingQuest = input.state.quests[questId];
  if (proposedQuestId && existingQuest !== undefined) {
    conflict(
      "quest.id",
      `deterministic Quest ID '${questId}' collides with an unrelated canonical Quest`,
    );
  }

  const artifactIdByPath = new Map<string, ArtifactId>();
  const artifactRefs: ArtifactRef[] = [];
  for (const artifactPath of includedArtifactPaths) {
    const supplied = artifactInputs.get(artifactPath);
    if (supplied === undefined) continue;
    const suppliedSha256 = hashBytes(supplied.bytes).slice("sha256:".length);
    const existing = Object.values(input.state.artifacts).find(
      (artifact) => artifact.repositoryId === input.repositoryId && artifact.path === artifactPath,
    );
    if (existing?.sha256 !== undefined && existing.sha256 !== suppliedSha256) {
      conflict(
        `sourceArtifacts[path=${artifactPath}]`,
        `source Artifact digest differs from canonical Artifact '${existing.id}'`,
      );
    }
    const id =
      existing?.id ??
      deterministicId<ArtifactId>(
        "art",
        sourceIdentityDigest,
        `artifact:${input.repositoryId}:${artifactPath}`,
      );
    const collidingArtifact = input.state.artifacts[id];
    if (
      existing === undefined &&
      collidingArtifact !== undefined &&
      (collidingArtifact.repositoryId !== input.repositoryId ||
        collidingArtifact.path !== artifactPath)
    ) {
      conflict(
        `sourceArtifacts[path=${artifactPath}]`,
        `deterministic Artifact ID '${id}' collides with '${collidingArtifact.path}'`,
      );
    }
    artifactIdByPath.set(artifactPath, id);
    artifactRefs.push({
      id,
      repositoryId: input.repositoryId,
      path: artifactPath,
      ...(supplied.kind === undefined ? {} : { kind: supplied.kind }),
      sha256: suppliedSha256,
      ...(supplied.mediaType === undefined ? {} : { mediaType: supplied.mediaType }),
    });
  }

  for (const [index, claim] of claims.entries()) {
    claim.id = deterministicId<ClaimId>(
      "clm",
      sourceIdentityDigest,
      `claim:${claim.sourceId}`,
    );
    const existing = input.state.claims[claim.id];
    if (existing !== undefined && (existing.questId !== questId || existing.statement !== claim.statement)) {
      conflict(`quest.claims[${index}].id`, `deterministic Claim ID '${claim.id}' collides with different content`);
    }
  }

  if (existingQuest !== undefined) {
    const owned = new Set(existingQuest.artifactRefs.map((artifact) => artifact.id));
    for (const artifact of artifactRefs) {
      if (!owned.has(artifact.id)) {
        conflict("quest.artifacts", `existing Quest cannot import newly owned Artifact '${artifact.path}'`);
      }
    }
  }

  const importRecordId = deterministicId<QuestImportRecordId>("qir", semanticPlanDigest, "import-record");
  const routeId = deterministicId<QuestRouteSnapshotId>("qrs", semanticPlanDigest, "route");
  const h1UniverseId = deterministicId<QuestScientificUniverseId>("qsu", semanticPlanDigest, "universe:H1");
  const h2UniverseId = deterministicId<QuestScientificUniverseId>("qsu", semanticPlanDigest, "universe:H2");
  const writerTransferId = deterministicId<QuestWriterTransferId>("qwt", semanticPlanDigest, "writer-transfer");

  const sourceExtensions = {
    trellisQuestImportV1: {
      exactScalars: {
        title: questSource.title,
        objective: questSource.objective,
        status: questSource.status,
        activeStage: activeStageRaw,
      },
      extensionsByPath: Object.fromEntries(
        extensionInventory
          .filter((entry) => entry.path.startsWith("quest."))
          .map((entry) => [entry.path.slice("quest.".length), structuredClone(entry.value)]),
      ),
      extensionInventory: extensionInventory.map((entry) => entry.path),
      sourceObjects: {
        authoritativeArtifacts: structuredClone(authoritative ?? {}),
        legacyEvidence: structuredClone(Array.isArray(evidence) ? evidence : []),
        ...(structuredNextActionSource === undefined
          ? {}
          : { structuredNextAction: structuredClone(structuredNextActionSource) }),
      },
      artifactIdsByPath: Object.fromEntries(artifactIdByPath),
      claimBindings: Object.fromEntries(
        claims.map((claim) => [
          claim.sourceId,
          {
            claimId: claim.id,
            sourceFields: claim.source,
            evidenceArtifactIds: claim.evidencePaths
              .map((artifactPath) => artifactIdByPath.get(artifactPath))
              .filter((id): id is ArtifactId => id !== undefined),
          },
        ]),
      ),
    },
  };

  const mutations: ResearchMutation[] = [];
  if (conflicts.length === 0) {
    const existingArtifactIds = new Set(Object.keys(input.state.artifacts));
    for (const artifact of artifactRefs) {
      if (!existingArtifactIds.has(artifact.id)) mutations.push({ kind: "artifact.register", artifact });
    }
    if (existingQuest === undefined) {
      mutations.push({
        kind: "quest.create",
        quest: {
          id: questId,
          title: title as string,
          description: objective as string,
          repositoryIds: [input.repositoryId],
          artifactRefs,
        },
      });
    }
    if ((existingQuest?.status ?? "active") !== mappedStatus) {
      mutations.push({ kind: "quest.status", questId, status: mappedStatus as QuestStatus });
    }
    if ((existingQuest?.stage ?? "setup") !== mappedStage) {
      mutations.push({ kind: "quest.stage", questId, stage: mappedStage as QuestStage });
    }
    for (const claim of claims) {
      const existing = input.state.claims[claim.id];
      if (existing === undefined) {
        mutations.push({
          kind: "claim.create",
          claim: { id: claim.id, questId, statement: claim.statement, evidenceIds: [] },
        });
      }
      if ((existing?.status ?? "candidate") !== claim.status) {
        mutations.push({ kind: "claim.status", claimId: claim.id, status: claim.status });
      }
    }
    mutations.push({
      kind: "quest.import.record",
      record: {
        id: importRecordId,
        questId,
        sourceIdentity: {
          sourceQuestId: sourceQuestId as string,
          projectSlug: projectSlug as string,
          sourceQuestPath: sourceQuestPath as string,
          ...(sourceEventsPath === undefined ? {} : { sourceEventsPath }),
        },
        sourceSnapshot: {
          sourceSchemaVersion,
          yamlDigest,
          ...(eventsDigest === undefined ? {} : { eventsDigest }),
          snapshotDigest,
        },
        sourceStatus: String(questSource.status),
        sourceActiveStage: String(activeStageRaw),
        sourceExtensions,
        artifactIds: artifactRefs.map((artifact) => artifact.id),
        claimIds: claims.map((claim) => claim.id),
      },
    });
    mutations.push({
      kind: "quest.route.set",
      route: {
        id: routeId,
        questId,
        importRecordId,
        firstReadArtifactIds: (firstRead ?? [])
          .map((raw) => normalizeSourcePath(raw))
          .map((artifactPath) => (artifactPath === undefined ? undefined : artifactIdByPath.get(artifactPath)))
          .filter((id): id is ArtifactId => id !== undefined),
        ownerBindings: ownerBindingsSource.map((binding) => ({
          name: binding.name,
          ownerSkill: binding.owner,
          artifactId: artifactIdByPath.get(binding.path) as ArtifactId,
        })),
        branches: branches.map(({ expectedPath, ...branch }) => ({
          ...branch,
          ...(expectedPath === undefined || artifactIdByPath.get(expectedPath) === undefined
            ? {}
            : { expectedArtifactId: artifactIdByPath.get(expectedPath) }),
        })),
        openQuestions: openQuestions ?? [],
        blockers: blockers ?? [],
        ...(currentDecision === undefined
          ? {}
          : {
              currentDecision: {
                id: currentDecision.id,
                verdict: currentDecision.verdict,
                rationale: currentDecision.rationale,
                evidenceArtifactIds: currentDecision.evidencePaths
                  .map((artifactPath) => artifactIdByPath.get(artifactPath))
                  .filter((id): id is ArtifactId => id !== undefined),
                sourceFields: currentDecision.sourceFields,
              },
            }),
        ...(nextAction === undefined
          ? {}
          : {
              nextAction: {
                ownerSkill: nextAction.ownerSkill,
                action: nextAction.action,
                acceptanceGate: nextAction.acceptanceGate,
                ...(nextAction.expectedPath === undefined || artifactIdByPath.get(nextAction.expectedPath) === undefined
                  ? {}
                  : { expectedArtifactId: artifactIdByPath.get(nextAction.expectedPath) }),
              },
            }),
        ...(legacyNextActionText === undefined ? {} : { legacyNextActionText }),
        ...(board === undefined ? {} : { legacyBoard: structuredClone(board) }),
        sourceExtensions: {
          trellisQuestImportV1: {
            authoritativeArtifacts: structuredClone(authoritative ?? {}),
            legacyEvidence: structuredClone(Array.isArray(evidence) ? evidence : []),
            ...(structuredNextActionSource === undefined
              ? {}
              : { structuredNextAction: structuredClone(structuredNextActionSource) }),
            extensionsByPath: Object.fromEntries(
              extensionInventory
                .filter((entry) => entry.path.startsWith("quest."))
                .map((entry) => [
                  entry.path.slice("quest.".length),
                  structuredClone(entry.value),
                ]),
            ),
          },
        },
      },
    });
    mutations.push(
      {
        kind: "quest.scientific-universe.record",
        universe: {
          id: h1UniverseId,
          questId,
          importRecordId,
          gateId: "H1",
          refKind: "opportunity",
          refs: opportunityRefs,
          sourceArtifactIds: [artifactIdByPath.get(opportunityArtifactPath as string) as ArtifactId],
          sourceSnapshotDigest: snapshotDigest,
        },
      },
      {
        kind: "quest.scientific-universe.record",
        universe: {
          id: h2UniverseId,
          questId,
          importRecordId,
          gateId: "H2",
          refKind: "candidate",
          refs: candidateRefs,
          sourceArtifactIds: [artifactIdByPath.get(ideasArtifactPath as string) as ArtifactId],
          sourceSnapshotDigest: snapshotDigest,
        },
      },
    );
    for (const [index, parsed] of parsedEvents.entries()) {
      const event = parsed.source;
      const artifactIds = (Array.isArray(event.artifacts) ? event.artifacts : [])
        .map((entry) => normalizeSourcePath(jsonObject(entry)?.path))
        .map((artifactPath) => (artifactPath === undefined ? undefined : artifactIdByPath.get(artifactPath)))
        .filter((id): id is ArtifactId => id !== undefined);
      const evidenceArtifactIds = (Array.isArray(event.evidence) ? event.evidence : [])
        .map((entry) => normalizeSourcePath(jsonObject(entry)?.path))
        .map((artifactPath) => (artifactPath === undefined ? undefined : artifactIdByPath.get(artifactPath)))
        .filter((id): id is ArtifactId => id !== undefined);
      const milestoneClaimIds = (Array.isArray(event.claim_updates) ? event.claim_updates : [])
        .map((entry) => stringValue(jsonObject(entry)?.claim_id ?? jsonObject(entry)?.id))
        .map((id) => claims.find((claim) => claim.sourceId === id)?.id)
        .filter((id): id is ClaimId => id !== undefined);
      const milestone: QuestImportMilestone = {
        id: deterministicId("qim", semanticPlanDigest, `milestone:${index}:${String(event.event_id)}`),
        questId,
        importRecordId,
        sourceEventId: String(event.event_id),
        sourceLine: parsed.line,
        reviewed: true,
        timestamp: normalizeTimestamp(event.timestamp) as string,
        actor: String(event.actor),
        eventType: String(event.event_type),
        milestone: String(event.summary),
        ...(stringValue(event.stage) === undefined ? {} : { stage: String(event.stage) }),
        summary: String(event.summary),
        artifactIds,
        evidenceArtifactIds,
        claimIds: milestoneClaimIds,
        sourcePayload: structuredClone(event),
        sourceExtensions: Object.fromEntries(
          extensionEntries(event, EVENT_FIELDS, `events[line=${parsed.line}]`).map((entry) => [
            entry.path.slice(`events[line=${parsed.line}].`.length),
            structuredClone(entry.value),
          ]),
        ),
      };
      mutations.push({ kind: "quest.import.milestone", milestone });
    }
    mutations.push({
      kind: "quest-writer.transfer",
      transfer: {
        id: writerTransferId,
        questId,
        from: "source",
        to: "trellis",
        sourceSnapshotDigest: snapshotDigest,
        actor: input.actor,
        rationale: input.rationale,
      },
    });
  }

  conflicts.sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);
    if (pathOrder !== 0) return pathOrder;
    const lineOrder = (left.line ?? 0) - (right.line ?? 0);
    return lineOrder !== 0 ? lineOrder : left.message.localeCompare(right.message);
  });
  const lossReport: QuestImportLossReportV1 = {
    exactRoundTrip: [
      "source identity",
      "source bytes and digests",
      "title and objective scalars",
      "route source fields",
      "reviewed milestone payloads",
      "scientific reference order",
    ],
    normalizedEquivalent: ["Quest status", "Quest stage", "Claim status", "event timestamp"],
    canonicalOnlyOmitted: [],
    preservedExtensions: extensionInventory.map((entry) => entry.path),
    blockingLosses: conflicts.map((entry) => `${entry.path}: ${entry.message}`),
  };
  const lossReportDigest = domainDigest(PLAN_DOMAIN, ["loss-report", stableResearchJson(lossReport)]);
  const source = {
    projectRoot: sourceProjectRoot,
    questPath: sourceQuestPath ?? input.sourceQuestPath,
    questAbsolutePath: path.resolve(sourceProjectRoot, sourceQuestPath ?? input.sourceQuestPath),
    ...(sourceEventsPath === undefined
      ? {}
      : {
          eventsPath: sourceEventsPath,
          eventsAbsolutePath: path.resolve(sourceProjectRoot, sourceEventsPath),
        }),
    yamlDigest,
    ...(eventsDigest === undefined ? {} : { eventsDigest }),
    snapshotDigest,
  };
  const tokenBody = {
    schemaVersion: QUEST_IMPORT_PLAN_SCHEMA_VERSION,
    commandFamily: "research-quest-import" as const,
    contractVersion: QUEST_IMPORT_CONTRACT_VERSION,
    source,
    frozenManifestDigest: manifestDigest,
    repositoryId: input.repositoryId,
    quest: {
      id: questId,
      sourceQuestId: sourceQuestId ?? "",
      projectSlug: projectSlug ?? "",
      title: title ?? "",
      description: objective ?? "",
      status: mappedStatus ?? "active",
      stage: mappedStage ?? "setup",
    },
    extensionInventory,
    lossReportDigest,
    semanticPlanDigest,
    mutations,
  };
  const previewToken =
    conflicts.length === 0
      ? (`qip_${createHash("sha256")
          .update(PREVIEW_DOMAIN)
          .update(frame(Buffer.from(stableResearchJson(tokenBody), "utf8")))
          .digest("base64url")}` as const)
      : null;
  return deepFreeze({
    ...tokenBody,
    conflicts,
    lossReport,
    previewToken,
  });
}

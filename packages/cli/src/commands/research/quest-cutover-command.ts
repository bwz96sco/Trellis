import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FROZEN_C1_GATE_VALIDATOR_DIGEST,
  FROZEN_C1_SOURCE_MANIFEST_DIGEST,
  buildQuestImportPlanV1,
  commitResearchBatch,
  computeQuestExportDigest,
  computeQuestMappedStateDigest,
  createQuestExportRecordId,
  createQuestWriterTransferId,
  createValidatedQuestExportReceipt,
  normalizeArtifactPath,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  researchPaths,
  stableResearchJson,
  validateResearchBatchReadOnly,
  type QuestId,
  type QuestImportPlanV1,
  type ResearchEvent,
  type ResearchMutation,
  type ResearchState,
} from "@mindfoldhq/trellis-core/research";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import {
  resolveResearchRoot,
  requireResearchText,
  type ResearchOutputOptions,
} from "./common.js";
import { resolveResearchRepositoryContext } from "./repository.js";

const ACTOR = { type: "agent" as const, id: "trellis-cli" };
const PROVENANCE = { source: "trellis research quest cutover" };
const DIGEST_RE = /^sha256:[0-9a-f]{64}$/u;

type CutoverErrorCode =
  | "research_quest_source_drift"
  | "research_quest_import_conflict"
  | "research_quest_transfer_unverified"
  | "research_quest_export_collision"
  | "IDEMPOTENCY_KEY_CONFLICT";

function cutoverError(
  code: CutoverErrorCode,
  message: string,
): Error & { code: CutoverErrorCode } {
  return Object.assign(new Error(message), { code });
}

export interface ResearchQuestImportOptions extends ResearchOutputOptions {
  source: string;
  events?: string;
  previewToken?: string;
  dryRun?: boolean;
  write?: boolean;
}

export interface ResearchQuestExportOptions extends ResearchOutputOptions {
  quest: QuestId;
  target: string;
  dryRun?: boolean;
  write?: boolean;
}

export interface ResearchQuestWriterTransferOptions extends ResearchOutputOptions {
  quest: QuestId;
  to: "source" | "trellis";
  rationale: string;
  exportDigest: string;
  dryRun?: boolean;
  write?: boolean;
}

export interface ResearchQuestImportResult {
  command: "research quest import";
  questId: QuestId;
  previewToken: string | null;
  dryRun: boolean;
  replayed: boolean;
  headSeq: number;
  events: ResearchEvent[];
  conflicts: QuestImportPlanV1["conflicts"];
  source: QuestImportPlanV1["source"];
  lossReport: QuestImportPlanV1["lossReport"];
}

export interface ResearchQuestExportResult {
  command: "research quest export";
  questId: QuestId;
  target: string;
  exportDigest: `sha256:${string}`;
  mappedStateDigest: `sha256:${string}`;
  validatorDigest: `sha256:${string}`;
  lossReportDigest: `sha256:${string}`;
  files: { path: string; digest: `sha256:${string}`; bytes: number }[];
  dryRun: boolean;
  replayed: boolean;
  headSeq: number;
  events: ResearchEvent[];
}

export interface ResearchQuestWriterTransferResult {
  command: "research quest transfer-writer";
  questId: QuestId;
  from: "source" | "trellis";
  to: "source" | "trellis";
  dryRun: boolean;
  replayed: boolean;
  headSeq: number;
  events: ResearchEvent[];
}

interface CurrentQuestState {
  quest: ResearchState["quests"][keyof ResearchState["quests"]];
  importRecord: ResearchState["questImportRecords"][keyof ResearchState["questImportRecords"]];
  route:
    | ResearchState["questRouteSnapshots"][keyof ResearchState["questRouteSnapshots"]]
    | undefined;
  universes: ResearchState["questScientificUniverses"][keyof ResearchState["questScientificUniverses"]][];
  milestones: ResearchState["questImportMilestones"][keyof ResearchState["questImportMilestones"]][];
  claims: ResearchState["claims"][keyof ResearchState["claims"]][];
}

function hashBytes(bytes: Uint8Array | string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function frozenGateValidatorPath(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../templates/research/validators/validate-research-gates.py",
  );
}

function framedDigest(files: ReadonlyMap<string, Buffer>): `sha256:${string}` {
  return computeQuestExportDigest(files);
}

function assertMode(options: { dryRun?: boolean; write?: boolean }): void {
  if (options.dryRun === true && options.write === true) {
    throw new Error("--dry-run cannot be combined with --write");
  }
}

function isContained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== "..")
  );
}

function exportedStatus(current: string, original: unknown): string {
  const mappedOriginal = original === "seed" ? "active" : original;
  return mappedOriginal === current && typeof original === "string"
    ? original
    : current;
}

function exportedStage(current: string, original: unknown): string {
  const canonicalSourceStage: Record<string, string> = {
    setup: "research-project-setup",
    framing: "research-quest",
    literature: "research-literature",
    ideation: "research-ideation",
    experiment: "research-experiment",
    computation: "research-computation",
    theory: "research-theory",
    audit: "research-review-case",
    writing: "research-writing",
  };
  if (typeof original === "string") {
    const normalized = original.startsWith("research-")
      ? original
      : `research-${original}`;
    const mapped: Record<string, string> = {
      "research-project-setup": "setup",
      "research-quest": "framing",
      "research-harness": "framing",
      "research-literature": "literature",
      "research-opportunity-mining": "ideation",
      "research-ideation": "ideation",
      "research-innovation-explorer": "ideation",
      "research-idea-evaluation": "ideation",
      "research-experiment": "experiment",
      "research-experiment-campaign": "experiment",
      "research-computation": "computation",
      "research-theory": "theory",
      "research-review-case": "audit",
      "research-review-campaign": "audit",
      "research-writing": "writing",
      "research-figure": "writing",
      "research-slides": "writing",
    };
    if (mapped[normalized] === current) return original;
  }
  return canonicalSourceStage[current] ?? current;
}

function sourcePaths(document: unknown, eventsBytes?: Buffer): string[] {
  const paths = new Set<string>();
  const add = (value: unknown): void => {
    if (typeof value !== "string") return;
    const artifactPath = value.split("#", 1)[0]?.trim() ?? "";
    if (artifactPath !== "") paths.add(artifactPath);
  };
  const object =
    typeof document === "object" && document !== null
      ? (document as Record<string, unknown>)
      : {};
  if (Array.isArray(object.first_read)) object.first_read.forEach(add);
  const authoritative = object.authoritative_artifacts;
  if (typeof authoritative === "object" && authoritative !== null) {
    for (const value of Object.values(authoritative)) {
      if (typeof value !== "object" || value === null) continue;
      const artifactPath = (value as Record<string, unknown>).path;
      add(artifactPath);
      if (typeof artifactPath !== "string") continue;
      const normalized = artifactPath.split("#", 1)[0]?.trim() ?? "";
      const directory = path.posix.dirname(normalized);
      const sibling = (name: string): string =>
        directory === "." ? name : `${directory}/${name}`;
      if (path.posix.basename(normalized) === "opportunity_board.md") {
        add(sibling("h1_decision.md"));
      } else if (path.posix.basename(normalized) === "ideas.md") {
        add(sibling("h2_decision.md"));
      }
    }
  }
  if (Array.isArray(object.evidence)) {
    for (const value of object.evidence)
      if (typeof value === "object" && value !== null)
        add((value as Record<string, unknown>).path);
  }
  for (const collection of ["branches", "claims"] as const) {
    const values = object[collection];
    if (!Array.isArray(values)) continue;
    for (const value of values) {
      if (typeof value !== "object" || value === null) continue;
      const record = value as Record<string, unknown>;
      add(record.expected_artifact);
      if (Array.isArray(record.evidence_paths))
        record.evidence_paths.forEach(add);
    }
  }
  for (const field of ["current_decision", "next_action"] as const) {
    const value = object[field];
    if (typeof value !== "object" || value === null) continue;
    const record = value as Record<string, unknown>;
    add(record.expected_artifact);
    if (Array.isArray(record.evidence_paths))
      record.evidence_paths.forEach(add);
  }
  if (eventsBytes !== undefined) {
    for (const line of eventsBytes.toString("utf8").split(/\r?\n/u)) {
      if (line.trim() === "") continue;
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        for (const field of ["artifacts", "evidence"] as const) {
          const values = event[field];
          if (!Array.isArray(values)) continue;
          for (const value of values)
            if (typeof value === "object" && value !== null)
              add((value as Record<string, unknown>).path);
        }
      } catch {
        // Core owns the authoritative malformed-JSON diagnostic.
      }
    }
  }
  return [...paths];
}

async function resolveSourceRepository(
  root: string,
  source: string,
  state: ResearchState,
): Promise<{
  repository: ResearchState["repositories"][keyof ResearchState["repositories"]];
  repositoryRoot: string;
}> {
  const absoluteSource = fs.realpathSync(source);
  const matches: {
    repository: ResearchState["repositories"][keyof ResearchState["repositories"]];
    repositoryRoot: string;
  }[] = [];
  for (const repository of Object.values(state.repositories)) {
    try {
      const context = await resolveResearchRepositoryContext(
        root,
        repository.id,
        state,
      );
      const repositoryRoot = fs.realpathSync(context.path);
      if (isContained(repositoryRoot, absoluteSource))
        matches.push({ repository, repositoryRoot });
    } catch {
      // An unrelated unavailable Repository cannot own this source file.
    }
  }
  if (matches.length !== 1) {
    throw cutoverError(
      "research_quest_import_conflict",
      `source must belong to exactly one registered Repository (found ${matches.length})`,
    );
  }
  const match = matches[0];
  if (match === undefined)
    throw cutoverError(
      "research_quest_import_conflict",
      " source Repository resolution failed",
    );
  return match;
}

async function buildImportPlan(
  root: string,
  options: ResearchQuestImportOptions,
): Promise<QuestImportPlanV1> {
  const state = await readResearchState(root);
  const sourceAbsolute = fs.realpathSync(
    path.resolve(process.cwd(), options.source),
  );
  const questYamlBytes = fs.readFileSync(sourceAbsolute);
  const match = await resolveSourceRepository(root, sourceAbsolute, state);
  const eventsAbsolute =
    options.events === undefined
      ? undefined
      : fs.realpathSync(path.resolve(process.cwd(), options.events));
  if (
    eventsAbsolute !== undefined &&
    !isContained(match.repositoryRoot, eventsAbsolute)
  ) {
    throw cutoverError(
      "research_quest_import_conflict",
      "source events must be contained by the source Repository",
    );
  }
  const eventsJsonlBytes =
    eventsAbsolute === undefined ? undefined : fs.readFileSync(eventsAbsolute);
  let document: unknown;
  try {
    document = parseYaml(questYamlBytes.toString("utf8"));
  } catch {
    document = undefined;
  }
  const sourceArtifacts = sourcePaths(document, eventsJsonlBytes).flatMap(
    (artifactPath) => {
      const absolute = path.resolve(match.repositoryRoot, artifactPath);
      if (
        !isContained(match.repositoryRoot, absolute) ||
        !fs.existsSync(absolute)
      )
        return [];
      return [{ path: artifactPath, bytes: fs.readFileSync(absolute) }];
    },
  );
  return buildQuestImportPlanV1({
    sourceProjectRoot: match.repositoryRoot,
    sourceQuestPath: path
      .relative(match.repositoryRoot, sourceAbsolute)
      .split(path.sep)
      .join("/"),
    ...(eventsAbsolute === undefined
      ? {}
      : {
          sourceEventsPath: path
            .relative(match.repositoryRoot, eventsAbsolute)
            .split(path.sep)
            .join("/"),
          eventsJsonlBytes,
        }),
    questYamlBytes,
    repositoryId: match.repository.id,
    sourceArtifacts,
    actor: ACTOR.id,
    rationale: "Accepted exact Quest import preview",
    frozenManifestDigest: FROZEN_C1_SOURCE_MANIFEST_DIGEST,
    state,
  });
}

function importResult(
  plan: QuestImportPlanV1,
  dryRun: boolean,
  replayed: boolean,
  headSeq: number,
  events: ResearchEvent[],
): ResearchQuestImportResult {
  return {
    command: "research quest import",
    questId: plan.quest.id,
    previewToken: plan.previewToken === null ? null : String(plan.previewToken),
    dryRun,
    replayed,
    headSeq,
    events,
    conflicts: plan.conflicts,
    source: plan.source,
    lossReport: plan.lossReport,
  };
}

function fencePath(root: string, questId: QuestId): string {
  return path.join(
    researchPaths(root).researchDir,
    "cutover-fences",
    `${questId}.json`,
  );
}

interface CutoverFence {
  file: string;
  created: boolean;
  directoryCreated: boolean;
}

function expectedFenceBytes(
  questId: QuestId,
  source: QuestImportPlanV1["source"] | { snapshotDigest: string },
  previewToken: string,
): string {
  return `${stableResearchJson({ schemaVersion: 1, effect: "deny-source-writes", questId, source, previewToken })}\n`;
}

function assertExactFence(file: string, expectedBytes: string): void {
  if (fs.readFileSync(file, "utf8") !== expectedBytes) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "a different active cutover fence exists",
    );
  }
}

function readImportFence(
  file: string,
  questId: QuestId,
  previewToken: string,
  sourceIdentity: {
    sourceQuestPath: string;
    sourceEventsPath?: string;
  },
  sourceSnapshot: {
    yamlDigest: string;
    eventsDigest?: string;
    snapshotDigest: string;
  },
): QuestImportPlanV1["source"] {
  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "a different active cutover fence exists",
    );
  }
  const fence = value as {
    schemaVersion?: unknown;
    effect?: unknown;
    questId?: unknown;
    previewToken?: unknown;
    source?: Record<string, unknown>;
  };
  const source = fence.source ?? {};
  const projectRoot = source.projectRoot;
  const questPath = source.questPath;
  const questAbsolutePath = source.questAbsolutePath;
  const eventsPath = source.eventsPath;
  const eventsAbsolutePath = source.eventsAbsolutePath;
  const expectedSourceKeys = [
    "projectRoot",
    "questPath",
    "questAbsolutePath",
    "yamlDigest",
    "snapshotDigest",
    ...(sourceIdentity.sourceEventsPath === undefined
      ? []
      : ["eventsPath", "eventsAbsolutePath", "eventsDigest"]),
  ].sort();
  const valid =
    stableResearchJson(Object.keys(fence).sort()) ===
      stableResearchJson(
        ["schemaVersion", "effect", "questId", "source", "previewToken"].sort(),
      ) &&
    stableResearchJson(Object.keys(source).sort()) ===
      stableResearchJson(expectedSourceKeys) &&
    fence.schemaVersion === 1 &&
    fence.effect === "deny-source-writes" &&
    fence.questId === questId &&
    fence.previewToken === previewToken &&
    typeof projectRoot === "string" &&
    path.isAbsolute(projectRoot) &&
    questPath === sourceIdentity.sourceQuestPath &&
    typeof questAbsolutePath === "string" &&
    path.resolve(projectRoot, String(questPath)) === questAbsolutePath &&
    source.yamlDigest === sourceSnapshot.yamlDigest &&
    source.snapshotDigest === sourceSnapshot.snapshotDigest &&
    eventsPath === sourceIdentity.sourceEventsPath &&
    source.eventsDigest === sourceSnapshot.eventsDigest &&
    (eventsPath === undefined ||
      (typeof eventsAbsolutePath === "string" &&
        path.resolve(projectRoot, String(eventsPath)) === eventsAbsolutePath));
  if (!valid) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "a different active cutover fence exists",
    );
  }
  return source as unknown as QuestImportPlanV1["source"];
}

function createFence(root: string, plan: QuestImportPlanV1): CutoverFence {
  const file = fencePath(root, plan.quest.id);
  const directory = path.dirname(file);
  const directoryCreated = !fs.existsSync(directory);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  const bytes = expectedFenceBytes(
    plan.quest.id,
    plan.source,
    String(plan.previewToken),
  );
  const acceptExisting = (): CutoverFence => {
    assertExactFence(file, bytes);
    return { file, created: false, directoryCreated };
  };
  if (fs.existsSync(file)) return acceptExisting();
  fs.writeFileSync(temporary, bytes, { flag: "wx" });
  try {
    fs.linkSync(temporary, file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return acceptExisting();
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  return { file, created: true, directoryCreated };
}

function removeCreatedFence(fence: CutoverFence): void {
  fs.rmSync(fence.file, { force: true });
  if (!fence.directoryCreated) return;
  try {
    fs.rmdirSync(path.dirname(fence.file));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTEMPTY") throw error;
  }
}

function verifyWriterProjection(
  root: string,
  questId: QuestId,
  writer: "source" | "trellis",
  snapshotDigest: string,
  eventId: string,
): void {
  const file = path.join(researchPaths(root).questsDir, questId, "writer.json");
  let value: unknown;
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    throw cutoverError(
      "research_quest_transfer_unverified",
      " writer projection is missing or malformed",
    );
  }
  const projection = value as {
    data?: {
      authority?: {
        writer?: string;
        sourceSnapshotDigest?: string;
        recordedEventId?: string;
      };
    };
  };
  const authority = projection.data?.authority;
  if (
    authority?.writer !== writer ||
    authority.sourceSnapshotDigest !== snapshotDigest ||
    authority.recordedEventId !== eventId
  ) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      " writer projection does not match committed authority",
    );
  }
}

export async function importResearchQuest(
  options: ResearchQuestImportOptions,
): Promise<ResearchQuestImportResult> {
  assertMode(options);
  if (options.write === true && options.previewToken === undefined) {
    throw new Error("--write requires --preview-token from the exact preview");
  }
  const root = resolveResearchRoot(options);
  const ledger = await readResearchLedger(root);
  const headSeq = ledger.length;
  if (options.write === true && options.previewToken !== undefined) {
    const idempotencyKey = `research-quest-import:${options.previewToken}`;
    const existing = ledger.filter(
      (event) => event.idempotencyKey === idempotencyKey,
    );
    if (existing.length > 0) {
      const importEvent = existing.find(
        (event) => event.kind === "quest.import.recorded",
      );
      const transferEvent = existing.find(
        (event) => event.kind === "quest-writer.transferred",
      );
      const allowed = new Set([
        "artifact.registered",
        "quest.created",
        "quest.status_changed",
        "quest.stage_changed",
        "claim.created",
        "claim.status_changed",
        "quest.import.recorded",
        "quest.route.recorded",
        "quest.scientific-universe.recorded",
        "quest.import.milestone-recorded",
        "quest-writer.transferred",
      ]);
      const prefixKinds = new Set([
        "artifact.registered",
        "quest.created",
        "quest.status_changed",
        "quest.stage_changed",
        "claim.created",
        "claim.status_changed",
      ]);
      const kinds = existing.map((event) => event.kind);
      const indexesOf = (kind: ResearchEvent["kind"]): number[] =>
        kinds.flatMap((candidate, index) =>
          candidate === kind ? [index] : [],
        );
      const importIndexes = indexesOf("quest.import.recorded");
      const routeIndexes = indexesOf("quest.route.recorded");
      const transferIndexes = indexesOf("quest-writer.transferred");
      const universeIndexes = indexesOf("quest.scientific-universe.recorded");
      const importIndex = importIndexes[0] ?? -1;
      const routeIndex = routeIndexes[0] ?? -1;
      const transferIndex = transferIndexes[0] ?? -1;
      const firstUniverse = existing[universeIndexes[0] ?? -1];
      const secondUniverse = existing[universeIndexes[1] ?? -1];
      const routeEvent = existing[routeIndex];
      const replayQuestId = importEvent?.payload.questId;
      const importRecordId = importEvent?.payload.id;
      const completeOrder =
        importIndexes.length === 1 &&
        routeIndexes.length === 1 &&
        transferIndexes.length === 1 &&
        routeIndex === importIndex + 1 &&
        universeIndexes.length === 2 &&
        universeIndexes[0] === routeIndex + 1 &&
        universeIndexes[1] === routeIndex + 2 &&
        transferIndex === kinds.length - 1 &&
        existing
          .slice(0, importIndex)
          .every((event) => prefixKinds.has(event.kind)) &&
        existing
          .slice((universeIndexes[1] ?? -1) + 1, transferIndex)
          .every((event) => event.kind === "quest.import.milestone-recorded") &&
        routeEvent?.payload.questId === replayQuestId &&
        routeEvent.payload.importRecordId === importRecordId &&
        firstUniverse?.payload.gateId === "H1" &&
        firstUniverse.payload.questId === replayQuestId &&
        firstUniverse.payload.importRecordId === importRecordId &&
        secondUniverse?.payload.gateId === "H2" &&
        secondUniverse.payload.questId === replayQuestId &&
        secondUniverse.payload.importRecordId === importRecordId &&
        existing
          .filter((event) => event.kind === "quest.import.milestone-recorded")
          .every(
            (event) =>
              event.payload.questId === replayQuestId &&
              event.payload.importRecordId === importRecordId,
          );
      if (
        importEvent === undefined ||
        transferEvent === undefined ||
        !completeOrder ||
        existing.some((event) => !allowed.has(event.kind)) ||
        transferEvent.payload.to !== "trellis" ||
        transferEvent.payload.questId !== importEvent.payload.questId
      ) {
        throw cutoverError(
          "IDEMPOTENCY_KEY_CONFLICT",
          " import preview token owns a partial or different mutation batch",
        );
      }
      const questId = importEvent.payload.questId as QuestId;
      const sourceIdentity = importEvent.payload.sourceIdentity as {
        sourceQuestPath: string;
        sourceEventsPath?: string;
      };
      const sourceSnapshot = importEvent.payload.sourceSnapshot as {
        yamlDigest: string;
        eventsDigest?: string;
        snapshotDigest: string;
      };
      const snapshotDigest = sourceSnapshot.snapshotDigest;
      const retainedFence = fencePath(root, questId);
      let replaySource = sourceSnapshot as QuestImportPlanV1["source"];
      if (fs.existsSync(retainedFence)) {
        replaySource = readImportFence(
          retainedFence,
          questId,
          options.previewToken,
          sourceIdentity,
          sourceSnapshot,
        );
        await rebuildResearchProjections(root);
      }
      verifyWriterProjection(
        root,
        questId,
        "trellis",
        snapshotDigest,
        transferEvent.eventId,
      );
      if (fs.existsSync(retainedFence)) fs.rmSync(retainedFence);
      return {
        command: "research quest import",
        questId,
        previewToken: options.previewToken,
        dryRun: false,
        replayed: true,
        headSeq,
        events: existing,
        conflicts: [],
        source: replaySource,
        lossReport: {
          exactRoundTrip: [],
          normalizedEquivalent: [],
          canonicalOnlyOmitted: [],
          preservedExtensions: [],
          blockingLosses: [],
        },
      };
    }
  }
  const plan = await buildImportPlan(root, options);
  if (
    options.write === true &&
    String(plan.previewToken) !== options.previewToken
  ) {
    throw cutoverError(
      "research_quest_source_drift",
      "preview token does not match current source plan",
    );
  }
  if (plan.conflicts.length > 0 || plan.previewToken === null) {
    if (options.write === true)
      throw cutoverError(
        "research_quest_import_conflict",
        plan.conflicts
          .map((entry) => `${entry.path}: ${entry.message}`)
          .join("; "),
      );
    return importResult(plan, true, false, headSeq, []);
  }
  if (options.write !== true)
    return importResult(plan, true, false, headSeq, []);
  const idempotencyKey = `research-quest-import:${String(plan.previewToken)}`;
  const validation = await validateResearchBatchReadOnly({
    root,
    actor: ACTOR,
    provenance: PROVENANCE,
    idempotencyKey,
    mutations: plan.mutations,
  });
  const existing = validation.events.filter(
    (event) => event.idempotencyKey === idempotencyKey && event.seq <= headSeq,
  );
  if (existing.length > 0)
    return importResult(plan, false, true, headSeq, existing);
  const replanned = await buildImportPlan(root, options);
  if (String(replanned.previewToken) !== String(plan.previewToken))
    throw cutoverError(
      "research_quest_source_drift",
      " source changed after preview validation",
    );
  const fence = createFence(root, plan);
  try {
    const fencedPlan = await buildImportPlan(root, options);
    if (String(fencedPlan.previewToken) !== String(plan.previewToken))
      throw cutoverError(
        "research_quest_source_drift",
        " source changed after cutover fence",
      );
  } catch (error) {
    if (fence.created) removeCreatedFence(fence);
    throw error;
  }
  const committed = await commitResearchBatch({
    root,
    actor: ACTOR,
    provenance: PROVENANCE,
    idempotencyKey,
    mutations: plan.mutations,
  });
  const transfer = [...committed.events]
    .reverse()
    .find((event) => event.kind === "quest-writer.transferred");
  if (transfer === undefined)
    throw cutoverError(
      "research_quest_transfer_unverified",
      " committed import has no writer transfer",
    );
  verifyWriterProjection(
    root,
    plan.quest.id,
    "trellis",
    plan.source.snapshotDigest,
    transfer.eventId,
  );
  fs.rmSync(fence.file);
  return importResult(
    plan,
    false,
    committed.replayed,
    committed.headSeq,
    committed.events,
  );
}

function currentQuestState(
  state: ResearchState,
  questId: QuestId,
): CurrentQuestState {
  const quest = state.quests[questId];
  if (quest === undefined) throw new Error(`Quest '${questId}' does not exist`);
  const importRecordId = state.latestQuestImportRecordIdByQuestId[questId];
  const importRecord =
    importRecordId === undefined
      ? undefined
      : state.questImportRecords[importRecordId];
  if (importRecord === undefined)
    throw cutoverError(
      "research_quest_import_conflict",
      " Quest has no current import snapshot",
    );
  const routeId = state.latestQuestRouteSnapshotIdByQuestId[questId];
  const route =
    routeId === undefined ? undefined : state.questRouteSnapshots[routeId];
  const universes = Object.values(state.questScientificUniverses).filter(
    (value) =>
      value.questId === questId && value.importRecordId === importRecordId,
  );
  const milestones = Object.values(state.questImportMilestones)
    .filter(
      (value) =>
        value.questId === questId && value.importRecordId === importRecordId,
    )
    .sort((a, b) => a.sourceLine - b.sourceLine);
  const claims = importRecord.claimIds.map((claimId) => {
    const claim = state.claims[claimId];
    if (claim === undefined) {
      throw cutoverError(
        "research_quest_transfer_unverified",
        ` current import references missing Claim '${claimId}'`,
      );
    }
    return claim;
  });
  return { quest, importRecord, route, universes, milestones, claims };
}

function mappedStateDigest(
  state: ResearchState,
  questId: QuestId,
): `sha256:${string}` {
  return computeQuestMappedStateDigest(state, questId);
}

const EXPORT_CONTROL_PATHS = new Set([
  "research-quest.yaml",
  "research-events.jsonl",
  "research-export-loss.json",
  "research-export-loss.md",
]);

async function canonicalArtifactFiles(
  root: string,
  state: ResearchState,
  questId: QuestId,
): Promise<Map<string, Buffer>> {
  const { quest, importRecord } = currentQuestState(state, questId);
  const questRepositories = new Set(quest.repositoryIds);
  const repositoryRoots = new Map<string, string>();
  const files = new Map<string, Buffer>();
  for (const artifactId of importRecord.artifactIds) {
    const artifact = state.artifacts[artifactId];
    if (artifact === undefined)
      throw cutoverError(
        "research_quest_transfer_unverified",
        ` current import references missing Artifact '${artifactId}'`,
      );
    if (!questRepositories.has(artifact.repositoryId))
      throw cutoverError(
        "research_quest_transfer_unverified",
        ` Artifact '${artifactId}' is outside the Quest Repository inventory`,
      );
    let artifactPath: string;
    try {
      artifactPath = normalizeArtifactPath(artifact.path);
    } catch (error) {
      throw cutoverError(
        "research_quest_transfer_unverified",
        ` invalid canonical Artifact path '${artifact.path}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (EXPORT_CONTROL_PATHS.has(artifactPath) || files.has(artifactPath))
      throw cutoverError(
        "research_quest_export_collision",
        ` ambiguous or colliding Artifact output '${artifactPath}'`,
      );
    let repositoryRoot = repositoryRoots.get(artifact.repositoryId);
    if (repositoryRoot === undefined) {
      const context = await resolveResearchRepositoryContext(
        root,
        artifact.repositoryId,
        state,
      );
      repositoryRoot = fs.realpathSync(context.path);
      repositoryRoots.set(artifact.repositoryId, repositoryRoot);
    }
    const absolute = path.resolve(repositoryRoot, ...artifactPath.split("/"));
    if (!isContained(repositoryRoot, absolute) || !fs.existsSync(absolute))
      throw cutoverError(
        "research_quest_transfer_unverified",
        ` canonical Artifact '${artifactPath}' is missing`,
      );
    const canonical = fs.realpathSync(absolute);
    if (
      fs.lstatSync(absolute).isSymbolicLink() ||
      !isContained(repositoryRoot, canonical) ||
      !fs.statSync(canonical).isFile()
    )
      throw cutoverError(
        "research_quest_transfer_unverified",
        ` canonical Artifact '${artifactPath}' is not a contained regular non-symbolic file`,
      );
    const bytes = fs.readFileSync(canonical);
    if (
      artifact.sha256 !== undefined &&
      hashBytes(bytes) !== `sha256:${artifact.sha256}`
    )
      throw cutoverError(
        "research_quest_transfer_unverified",
        ` canonical Artifact '${artifactPath}' differs from its SHA-256 binding`,
      );
    files.set(artifactPath, bytes);
  }
  const paths = [...files.keys()].sort();
  for (const [index, filePath] of paths.entries())
    if (
      paths
        .slice(index + 1)
        .some((candidate) => candidate.startsWith(`${filePath}/`))
    )
      throw cutoverError(
        "research_quest_export_collision",
        ` Artifact output '${filePath}' collides with a nested output`,
      );
  return files;
}

async function buildExportFiles(
  root: string,
  state: ResearchState,
  questId: QuestId,
): Promise<Map<string, Buffer>> {
  const { quest, importRecord, route, milestones } = currentQuestState(
    state,
    questId,
  );
  const files = await canonicalArtifactFiles(root, state, questId);
  const extension = (
    importRecord.sourceExtensions as {
      trellisQuestImportV1?: {
        exactScalars?: Record<string, unknown>;
        sourceObjects?: Record<string, unknown>;
        claimBindings?: Record<
          string,
          { claimId: string; sourceFields: Record<string, unknown> }
        >;
        extensionsByPath?: Record<string, unknown>;
        extensionInventory?: string[];
      };
    }
  ).trellisQuestImportV1;
  const exact = extension?.exactScalars ?? {};
  const sourceObjects = extension?.sourceObjects ?? {};
  const artifactById = state.artifacts;
  const source: Record<string, unknown> = {
    schema_version: importRecord.sourceSnapshot.sourceSchemaVersion,
    quest_id: importRecord.sourceIdentity.sourceQuestId,
    project_slug: importRecord.sourceIdentity.projectSlug,
    title: exact.title ?? quest.title,
    objective: exact.objective ?? quest.description,
    status: exportedStatus(
      quest.status,
      exact.status ?? importRecord.sourceStatus,
    ),
    active_stage: exportedStage(
      quest.stage,
      exact.activeStage ?? importRecord.sourceActiveStage,
    ),
    first_read:
      route?.firstReadArtifactIds
        .map((id) => artifactById[id]?.path)
        .filter(Boolean) ?? [],
    authoritative_artifacts: sourceObjects.authoritativeArtifacts ?? {},
    branches:
      route?.branches.map((branch) => ({ ...branch.sourceFields })) ?? [],
    claims: Object.entries(extension?.claimBindings ?? {}).flatMap(
      ([sourceId, binding]) => {
        const claim =
          state.claims[binding.claimId as keyof typeof state.claims];
        return claim === undefined
          ? []
          : [
              {
                ...binding.sourceFields,
                id: sourceId,
                statement: claim.statement,
                status: claim.status,
              },
            ];
      },
    ),
    open_questions: route?.openQuestions ?? [],
    blockers: route?.blockers ?? [],
  };
  if (route?.currentDecision !== undefined)
    source.current_decision = route.currentDecision.sourceFields;
  if (route?.nextAction !== undefined)
    source.next_action = sourceObjects.structuredNextAction ?? route.nextAction;
  else if (route?.legacyNextActionText !== undefined)
    source.next_action = route.legacyNextActionText;
  if (route?.legacyBoard !== undefined) source.board = route.legacyBoard;
  if (
    Array.isArray(sourceObjects.legacyEvidence) &&
    sourceObjects.legacyEvidence.length > 0
  )
    source.evidence = sourceObjects.legacyEvidence;
  for (const [field, value] of Object.entries(
    extension?.extensionsByPath ?? {},
  )) {
    if (
      !field.includes(".") &&
      !field.includes("[") &&
      source[field] === undefined
    )
      source[field] = value;
  }
  const artifactInventory = [...files]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([filePath, bytes]) => ({
      path: filePath,
      digest: hashBytes(bytes),
      bytes: bytes.length,
    }));
  const loss = {
    schemaVersion: 1,
    exactRoundTrip: [
      "source identity",
      "preserved source scalars",
      "reviewed milestone payloads",
      "referenced source Artifact bytes",
    ],
    normalizedEquivalent: [
      "Quest status",
      "Quest stage",
      "Claim status",
      "event timestamp",
    ],
    canonicalOnlyOmitted: [
      "canonical IDs",
      "ledger metadata",
      "writer transfer history",
    ],
    preservedExtensions: extension?.extensionInventory ?? [],
    artifactInventory,
    blockingLosses: [],
  };
  files.set(
    "research-quest.yaml",
    Buffer.from(stringifyYaml(source, { lineWidth: 0 }), "utf8"),
  );
  if (milestones.length > 0)
    files.set(
      "research-events.jsonl",
      Buffer.from(
        `${milestones.map((value) => JSON.stringify(value.sourcePayload)).join("\n")}\n`,
        "utf8",
      ),
    );
  files.set(
    "research-export-loss.json",
    Buffer.from(`${stableResearchJson(loss)}\n`, "utf8"),
  );
  files.set(
    "research-export-loss.md",
    Buffer.from(
      `# Research Quest Export Loss Report\n\nNo blocking authoritative mapping loss.\n\nExported ${artifactInventory.length} referenced source Artifact${artifactInventory.length === 1 ? "" : "s"} with exact canonical bytes.\n`,
      "utf8",
    ),
  );
  return files;
}

function validateExportFiles(
  state: ResearchState,
  questId: QuestId,
  files: ReadonlyMap<string, Buffer>,
): void {
  const yamlBytes = files.get("research-quest.yaml");
  const lossBytes = files.get("research-export-loss.json");
  if (yamlBytes === undefined || lossBytes === undefined) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "export inventory is incomplete",
    );
  }
  let source: Record<string, unknown>;
  let loss: { blockingLosses?: unknown };
  try {
    source = parseYaml(yamlBytes.toString("utf8")) as Record<string, unknown>;
    loss = JSON.parse(lossBytes.toString("utf8")) as {
      blockingLosses?: unknown;
    };
  } catch (error) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      `frozen export validation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const current = currentQuestState(state, questId);
  if (
    source.quest_id !== current.importRecord.sourceIdentity.sourceQuestId ||
    source.project_slug !== current.importRecord.sourceIdentity.projectSlug
  ) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "export source identity differs from the current import",
    );
  }
  if (!Array.isArray(loss.blockingLosses) || loss.blockingLosses.length > 0) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "export contains blocking authoritative mapping loss",
    );
  }
  const eventsBytes = files.get("research-events.jsonl");
  const repositoryId = current.quest.repositoryIds[0];
  if (repositoryId === undefined) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "export Quest has no source Repository",
    );
  }
  const frozenValidation = buildQuestImportPlanV1({
    sourceProjectRoot: path.parse(path.resolve("/")).root,
    sourceQuestPath: "research-quest.yaml",
    questYamlBytes: yamlBytes,
    ...(eventsBytes === undefined
      ? {}
      : {
          sourceEventsPath: "research-events.jsonl",
          eventsJsonlBytes: eventsBytes,
        }),
    repositoryId,
    sourceArtifacts: [...files]
      .filter(([filePath]) => !EXPORT_CONTROL_PATHS.has(filePath))
      .map(([filePath, bytes]) => ({ path: filePath, bytes })),
    actor: ACTOR.id,
    rationale: "Validate deterministic Quest export",
    frozenManifestDigest: FROZEN_C1_SOURCE_MANIFEST_DIGEST,
    existingQuestId: questId,
    state,
  });
  const structuralConflicts = frozenValidation.conflicts.filter(
    (conflict) => conflict.path !== "writer",
  );
  if (structuralConflicts.length > 0) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      `frozen source validator rejected export: ${structuralConflicts.map((conflict) => `${conflict.path}: ${conflict.message}`).join("; ")}`,
    );
  }
  if (
    frozenValidation.quest.id !== questId ||
    frozenValidation.quest.title !== current.quest.title ||
    frozenValidation.quest.description !== current.quest.description ||
    frozenValidation.quest.status !== current.quest.status ||
    frozenValidation.quest.stage !== current.quest.stage
  ) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "exported Quest fields differ from frozen canonical mapping",
    );
  }
  const expectedFirstRead =
    current.route?.firstReadArtifactIds.flatMap((id) => {
      const artifactPath = state.artifacts[id]?.path;
      return artifactPath === undefined ? [] : [artifactPath];
    }) ?? [];
  if (
    stableResearchJson(source.first_read) !==
      stableResearchJson(expectedFirstRead) ||
    stableResearchJson(source.branches) !==
      stableResearchJson(
        current.route?.branches.map((branch) => branch.sourceFields) ?? [],
      ) ||
    stableResearchJson(source.open_questions) !==
      stableResearchJson(current.route?.openQuestions ?? []) ||
    stableResearchJson(source.blockers) !==
      stableResearchJson(current.route?.blockers ?? [])
  ) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "exported route fields differ from frozen canonical mapping",
    );
  }
  const authoritative =
    typeof source.authoritative_artifacts === "object" &&
    source.authoritative_artifacts !== null
      ? (source.authoritative_artifacts as Record<string, unknown>)
      : {};
  for (const binding of current.route?.ownerBindings ?? []) {
    const sourceBinding = authoritative[binding.name] as
      | Record<string, unknown>
      | undefined;
    if (
      sourceBinding?.owner_skill !== binding.ownerSkill ||
      sourceBinding.path !== state.artifacts[binding.artifactId]?.path
    ) {
      throw cutoverError(
        "research_quest_transfer_unverified",
        "exported Artifact ownership differs from frozen canonical mapping",
      );
    }
  }
  const extension = (
    current.importRecord.sourceExtensions as {
      trellisQuestImportV1?: {
        claimBindings?: Record<string, { claimId: string }>;
      };
    }
  ).trellisQuestImportV1;
  const sourceClaims = Array.isArray(source.claims) ? source.claims : [];
  const expectedClaims = Object.entries(extension?.claimBindings ?? {}).flatMap(
    ([sourceId, binding]) => {
      const claim = state.claims[binding.claimId as keyof typeof state.claims];
      return claim === undefined
        ? []
        : [{ id: sourceId, statement: claim.statement, status: claim.status }];
    },
  );
  const mappedClaims = sourceClaims.map((claim) => {
    const record = claim as Record<string, unknown>;
    return {
      id: record.id,
      statement: record.statement,
      status: record.status,
    };
  });
  if (stableResearchJson(mappedClaims) !== stableResearchJson(expectedClaims)) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "exported Claims differ from frozen canonical mapping",
    );
  }
  if (current.milestones.length === 0 && eventsBytes !== undefined) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      "export emitted unexpected reviewed events",
    );
  }
  if (current.milestones.length > 0) {
    const lines =
      eventsBytes
        ?.toString("utf8")
        .split(/\r?\n/u)
        .filter((line) => line !== "") ?? [];
    if (lines.length !== current.milestones.length)
      throw cutoverError(
        "research_quest_transfer_unverified",
        "export reviewed event count differs from canonical milestones",
      );
    for (const [index, line] of lines.entries()) {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (
        stableResearchJson(parsed) !==
        stableResearchJson(current.milestones[index]?.sourcePayload)
      ) {
        throw cutoverError(
          "research_quest_transfer_unverified",
          "export reviewed event payload differs from canonical milestone",
        );
      }
    }
  }
}

function exportDirectories(filePaths: readonly string[]): string[] {
  const directories = new Set<string>();
  for (const filePath of filePaths) {
    let directory = path.posix.dirname(filePath);
    while (directory !== ".") {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return [...directories].sort();
}

function exactTarget(
  target: string,
  files: ReadonlyMap<string, Buffer>,
): boolean {
  if (!fs.existsSync(target)) return false;
  if (
    fs.lstatSync(target).isSymbolicLink() ||
    !fs.statSync(target).isDirectory()
  )
    throw cutoverError(
      "research_quest_export_collision",
      " target is not a regular directory",
    );
  const actualFiles: string[] = [];
  const actualDirectories: string[] = [];
  const walk = (directory: string, prefix: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isSymbolicLink())
        throw cutoverError(
          "research_quest_export_collision",
          ` '${relative}' must not be a symbolic link`,
        );
      if (entry.isDirectory()) {
        actualDirectories.push(relative);
        walk(path.join(directory, entry.name), relative);
      } else if (entry.isFile()) {
        actualFiles.push(relative);
      } else {
        throw cutoverError(
          "research_quest_export_collision",
          ` '${relative}' is not a regular file`,
        );
      }
    }
  };
  walk(target, "");
  const expectedFiles = [...files.keys()].sort();
  if (
    stableResearchJson(actualFiles.sort()) !==
      stableResearchJson(expectedFiles) ||
    stableResearchJson(actualDirectories.sort()) !==
      stableResearchJson(exportDirectories(expectedFiles))
  )
    throw cutoverError(
      "research_quest_export_collision",
      " target path inventory differs from export plan",
    );
  for (const [name, bytes] of files)
    if (!fs.readFileSync(path.join(target, ...name.split("/"))).equals(bytes))
      throw cutoverError(
        "research_quest_export_collision",
        `'${name}' differs from export plan`,
      );
  return true;
}

function validatedExportReceipt(
  input: Parameters<typeof createValidatedQuestExportReceipt>[0],
): ReturnType<typeof createValidatedQuestExportReceipt> {
  try {
    return createValidatedQuestExportReceipt(input);
  } catch (error) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      ` validated export evidence failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function exportResearchQuest(
  options: ResearchQuestExportOptions,
): Promise<ResearchQuestExportResult> {
  assertMode(options);
  const root = resolveResearchRoot(options);
  const target = path.resolve(process.cwd(), options.target);
  const state = await readResearchState(root);
  const current = currentQuestState(state, options.quest);
  if (state.questWriterAuthorityByQuestId[options.quest]?.writer !== "trellis")
    throw cutoverError(
      "research_quest_import_conflict",
      " export requires Trellis writer authority",
    );
  const files = await buildExportFiles(root, state, options.quest);
  validateExportFiles(state, options.quest, files);
  const exportDigest = framedDigest(files);
  const mappedDigest = mappedStateDigest(state, options.quest);
  const lossReportBytes = files.get("research-export-loss.json");
  if (lossReportBytes === undefined)
    throw cutoverError(
      "research_quest_export_collision",
      " export loss report is missing",
    );
  const lossReportDigest = hashBytes(lossReportBytes);
  const existingExact = fs.existsSync(target)
    ? exactTarget(target, files)
    : false;
  const resultBase = {
    command: "research quest export" as const,
    questId: options.quest,
    target,
    exportDigest,
    mappedStateDigest: mappedDigest,
    validatorDigest: FROZEN_C1_GATE_VALIDATOR_DIGEST,
    lossReportDigest,
    files: [...files]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([file, bytes]) => ({
        path: file,
        digest: hashBytes(bytes),
        bytes: bytes.length,
      })),
  };
  if (options.write !== true)
    return {
      ...resultBase,
      dryRun: true,
      replayed: false,
      headSeq: (await readResearchLedger(root)).length,
      events: [],
    };
  const prior = Object.values(state.questExportRecords).find(
    (record) =>
      record.questId === options.quest &&
      record.exportDigest === exportDigest &&
      record.sourceSnapshotDigest ===
        current.importRecord.sourceSnapshot.snapshotDigest &&
      record.mappedStateDigest === mappedDigest &&
      record.validatorDigest === FROZEN_C1_GATE_VALIDATOR_DIGEST &&
      record.lossReportDigest === lossReportDigest &&
      record.validated,
  );
  const exportRecordId = prior?.id ?? createQuestExportRecordId();
  const receiptInput = {
    questId: options.quest,
    exportRecordId,
    sourceSnapshotDigest: current.importRecord.sourceSnapshot.snapshotDigest,
    files,
    validatorPath: frozenGateValidatorPath(),
  } as const;
  let publishedFresh = false;
  if (!existingExact) {
    const temporary = `${target}.trellis-export-${process.pid}`;
    if (fs.existsSync(temporary))
      throw cutoverError(
        "research_quest_export_collision",
        " temporary output already exists",
      );
    fs.mkdirSync(temporary, { recursive: true });
    try {
      for (const [name, bytes] of files) {
        const outputPath = path.join(temporary, ...name.split("/"));
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, bytes, { flag: "wx" });
      }
      exactTarget(temporary, files);
      validatedExportReceipt({
        ...receiptInput,
        state,
        outputRoot: temporary,
      });
      const frozenState = await readResearchState(root);
      if (
        frozenState.questWriterAuthorityByQuestId[options.quest]?.writer !==
          "trellis" ||
        mappedStateDigest(frozenState, options.quest) !== mappedDigest
      ) {
        throw cutoverError(
          "research_quest_source_drift",
          "canonical Quest changed during export validation",
        );
      }
      fs.renameSync(temporary, target);
      publishedFresh = true;
    } catch (error) {
      fs.rmSync(temporary, { recursive: true, force: true });
      throw error;
    }
  }
  const finalState = await readResearchState(root);
  if (
    finalState.questWriterAuthorityByQuestId[options.quest]?.writer !==
      "trellis" ||
    mappedStateDigest(finalState, options.quest) !== mappedDigest
  ) {
    if (publishedFresh) fs.rmSync(target, { recursive: true, force: true });
    throw cutoverError(
      "research_quest_source_drift",
      "canonical Quest changed before export evidence commit",
    );
  }
  exactTarget(target, files);
  const validated = validatedExportReceipt({
    ...receiptInput,
    state: finalState,
    outputRoot: target,
  });
  if (prior !== undefined) {
    await rebuildResearchProjections(root);
    const ledger = await readResearchLedger(root);
    const events = ledger.filter(
      (event) =>
        event.kind === "quest.export.recorded" && event.payload.id === prior.id,
    );
    return {
      ...resultBase,
      dryRun: false,
      replayed: true,
      headSeq: ledger.length,
      events,
    };
  }
  const mutation: ResearchMutation = {
    kind: "quest.export.record.validated",
    receipt: validated.receipt,
  };
  const committed = await commitResearchBatch({
    root,
    actor: ACTOR,
    provenance: PROVENANCE,
    idempotencyKey: `research-quest-export:${options.quest}:${exportDigest}`,
    mutations: [mutation],
  });
  return {
    ...resultBase,
    dryRun: false,
    replayed: committed.replayed,
    headSeq: committed.headSeq,
    events: committed.events,
  };
}

export async function transferResearchQuestWriter(
  options: ResearchQuestWriterTransferOptions,
): Promise<ResearchQuestWriterTransferResult> {
  assertMode(options);
  const rationale = requireResearchText(options.rationale, "rationale");
  if (!DIGEST_RE.test(options.exportDigest))
    throw new Error("export digest must be a sha256:<64 lowercase hex> digest");
  const root = resolveResearchRoot(options);
  const state = await readResearchState(root);
  const current = currentQuestState(state, options.quest);
  const authority = state.questWriterAuthorityByQuestId[options.quest];
  if (authority === undefined)
    throw cutoverError(
      "research_quest_import_conflict",
      " Quest has no writer authority",
    );
  const snapshotDigest = current.importRecord.sourceSnapshot.snapshotDigest;
  let exportDigest: `sha256:${string}` | undefined;
  if (options.to === "source") {
    const latestId = state.questExportRecordIdsByQuestId[options.quest]?.at(-1);
    const record =
      latestId === undefined ? undefined : state.questExportRecords[latestId];
    if (
      record?.validated !== true ||
      record.exportDigest !== options.exportDigest ||
      record.sourceSnapshotDigest !== snapshotDigest ||
      record.mappedStateDigest !== mappedStateDigest(state, options.quest)
    )
      throw cutoverError(
        "research_quest_transfer_unverified",
        " current validated export evidence does not match",
      );
    exportDigest = record.exportDigest;
  } else if (options.exportDigest !== snapshotDigest) {
    throw cutoverError(
      "research_quest_transfer_unverified",
      " --export-digest must equal the current import snapshot digest for transfer to Trellis",
    );
  }
  if (authority.writer === options.to) {
    const retainedFence = fencePath(root, options.quest);
    if (
      options.write === true &&
      options.to === "trellis" &&
      fs.existsSync(retainedFence)
    ) {
      assertExactFence(
        retainedFence,
        expectedFenceBytes(options.quest, { snapshotDigest }, "null"),
      );
      await rebuildResearchProjections(root);
      verifyWriterProjection(
        root,
        options.quest,
        "trellis",
        snapshotDigest,
        authority.recordedEventId,
      );
      fs.rmSync(retainedFence);
    }
    return {
      command: "research quest transfer-writer" as const,
      questId: options.quest,
      from: authority.writer,
      to: options.to,
      dryRun: options.write !== true,
      replayed: true,
      headSeq: (await readResearchLedger(root)).length,
      events: [],
    };
  }
  const mutation: ResearchMutation = {
    kind: "quest-writer.transfer",
    transfer: {
      id: createQuestWriterTransferId(),
      questId: options.quest,
      from: authority.writer,
      to: options.to,
      sourceSnapshotDigest: snapshotDigest,
      ...(exportDigest === undefined ? {} : { exportDigest }),
      actor: ACTOR.id,
      rationale,
    },
  };
  const idempotencyKey = `research-quest-transfer:${options.quest}:${authority.writer}:${options.to}:${options.exportDigest}`;
  if (options.write !== true) {
    const validation = await validateResearchBatchReadOnly({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey,
      mutations: [mutation],
    });
    return {
      command: "research quest transfer-writer" as const,
      questId: options.quest,
      from: authority.writer,
      to: options.to,
      dryRun: true,
      replayed: false,
      headSeq: validation.state.projectedThroughSeq,
      events: validation.events,
    };
  }
  const fence =
    options.to === "trellis"
      ? createFence(root, {
          quest: { id: options.quest },
          source: { snapshotDigest },
          previewToken: null,
        } as QuestImportPlanV1)
      : undefined;
  const committed = await commitResearchBatch({
    root,
    actor: ACTOR,
    provenance: PROVENANCE,
    idempotencyKey,
    mutations: [mutation],
  });
  const transfer = committed.events.find(
    (event) => event.kind === "quest-writer.transferred",
  );
  if (transfer === undefined)
    throw cutoverError(
      "research_quest_transfer_unverified",
      " transfer event was not committed",
    );
  verifyWriterProjection(
    root,
    options.quest,
    options.to,
    snapshotDigest,
    transfer.eventId,
  );
  if (fence !== undefined) fs.rmSync(fence.file);
  return {
    command: "research quest transfer-writer" as const,
    questId: options.quest,
    from: authority.writer,
    to: options.to,
    dryRun: false,
    replayed: committed.replayed,
    headSeq: committed.headSeq,
    events: committed.events,
  };
}

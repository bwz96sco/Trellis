import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { normalizeArtifactPath } from "./artifacts.js";
import {
  buildQuestImportPlanV1,
  FROZEN_C1_SOURCE_MANIFEST_DIGEST,
} from "./quest-import-plan.js";
import { stableResearchJson } from "./projections.js";
import type {
  QuestExportRecord,
  QuestExportRecordId,
  QuestId,
  ResearchState,
} from "./types.js";

const EXPORT_DIGEST_DOMAIN = "trellis.research.quest-export.v1\0";
export const FROZEN_C1_GATE_VALIDATOR_DIGEST =
  `sha256:958d6114f6d582601436c664ccad198b0ba7659476083d7ea807547fb313db74` as const;
const CONTROL_OUTPUTS = new Set([
  "research-quest.yaml",
  "research-events.jsonl",
  "research-export-loss.json",
  "research-export-loss.md",
]);

export type ValidatedQuestExportReceipt = object;

interface InternalReceipt {
  readonly outputRoot: string;
  readonly files: ReadonlyMap<string, Buffer>;
  readonly validatorPath: string;
  readonly record: Omit<QuestExportRecord, "recordedAt">;
}

const validatedReceipts = new WeakSet<object>();
const receiptData = new WeakMap<object, InternalReceipt>();

export interface CreateValidatedQuestExportReceiptInput {
  state: ResearchState;
  questId: QuestId;
  exportRecordId: QuestExportRecordId;
  sourceSnapshotDigest: `sha256:${string}`;
  outputRoot: string;
  files: ReadonlyMap<string, Uint8Array>;
  validatorPath: string;
}

function fail(message: string): never {
  throw new Error(`RESEARCH_QUEST_EXPORT_UNVALIDATED: ${message}`);
}

function hashBytes(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalFiles(
  files: ReadonlyMap<string, Uint8Array>,
): ReadonlyMap<string, Buffer> {
  const canonical = new Map<string, Buffer>();
  for (const [rawPath, rawBytes] of files) {
    let filePath: string;
    try {
      filePath = normalizeArtifactPath(rawPath);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
    if (filePath !== rawPath) fail(`output path '${rawPath}' is not canonical`);
    if (canonical.has(filePath)) fail(`duplicate output path '${filePath}'`);
    canonical.set(filePath, Buffer.from(rawBytes));
  }
  const paths = [...canonical.keys()].sort();
  for (const [index, filePath] of paths.entries()) {
    const prefix = `${filePath}/`;
    if (paths.slice(index + 1).some((candidate) => candidate.startsWith(prefix))) {
      fail(`output path '${filePath}' collides with a nested output`);
    }
  }
  return canonical;
}

export function computeQuestExportDigest(
  files: ReadonlyMap<string, Uint8Array>,
): `sha256:${string}` {
  const canonical = canonicalFiles(files);
  const hash = createHash("sha256").update(EXPORT_DIGEST_DOMAIN);
  for (const [name, bytes] of [...canonical].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const nameBytes = Buffer.from(name, "utf8");
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(Buffer.from([nameBytes.length >> 8, nameBytes.length & 0xff]));
    hash.update(nameBytes);
    hash.update(length);
    hash.update(bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

function currentQuestState(state: ResearchState, questId: QuestId): unknown {
  const quest = state.quests[questId];
  if (quest === undefined) fail(`Quest '${questId}' does not exist`);
  const importRecordId = state.latestQuestImportRecordIdByQuestId[questId];
  const importRecord =
    importRecordId === undefined
      ? undefined
      : state.questImportRecords[importRecordId];
  if (importRecord === undefined) fail("Quest has no current import snapshot");
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
    .sort((left, right) => left.sourceLine - right.sourceLine);
  const claims = importRecord.claimIds.map((claimId) => {
    const claim = state.claims[claimId];
    if (claim === undefined) fail(`current import references missing Claim '${claimId}'`);
    return claim;
  });
  return { quest, importRecord, route, universes, milestones, claims };
}

export function computeQuestMappedStateDigest(
  state: ResearchState,
  questId: QuestId,
): `sha256:${string}` {
  return hashBytes(Buffer.from(stableResearchJson(currentQuestState(state, questId))));
}

function expectedArtifactInventory(
  state: ResearchState,
  questId: QuestId,
): Map<string, { sha256?: string }> {
  const quest = state.quests[questId];
  if (quest === undefined) fail(`Quest '${questId}' does not exist`);
  const importRecordId = state.latestQuestImportRecordIdByQuestId[questId];
  const importRecord =
    importRecordId === undefined
      ? undefined
      : state.questImportRecords[importRecordId];
  if (importRecord === undefined) fail("Quest has no current import snapshot");
  const questRepositoryIds = new Set(quest.repositoryIds);
  const inventory = new Map<string, { sha256?: string }>();
  for (const artifactId of importRecord.artifactIds) {
    const artifact = state.artifacts[artifactId];
    if (artifact === undefined) fail(`missing canonical Artifact '${artifactId}'`);
    if (!questRepositoryIds.has(artifact.repositoryId)) {
      fail(`Artifact '${artifactId}' is outside the Quest Repository inventory`);
    }
    const artifactPath = normalizeArtifactPath(artifact.path);
    if (CONTROL_OUTPUTS.has(artifactPath)) {
      fail(`Artifact '${artifactId}' collides with control output '${artifactPath}'`);
    }
    if (inventory.has(artifactPath)) {
      fail(`ambiguous canonical Artifact ownership for '${artifactPath}'`);
    }
    inventory.set(artifactPath, {
      ...(artifact.sha256 === undefined ? {} : { sha256: artifact.sha256 }),
    });
  }
  return inventory;
}

function expectedDirectories(paths: readonly string[]): string[] {
  const directories = new Set<string>();
  for (const filePath of paths) {
    let directory = path.posix.dirname(filePath);
    while (directory !== ".") {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return [...directories].sort();
}

function actualOutputTree(root: string): { files: string[]; directories: string[] } {
  const files: string[] = [];
  const directories: string[] = [];
  const walk = (directory: string, prefix: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isSymbolicLink()) fail(`output path '${relative}' must not be a symbolic link`);
      if (entry.isDirectory()) {
        directories.push(relative);
        walk(path.join(directory, entry.name), relative);
      } else if (entry.isFile()) {
        files.push(relative);
      } else {
        fail(`output path '${relative}' must be a regular file`);
      }
    }
  };
  walk(root, "");
  return { files: files.sort(), directories: directories.sort() };
}

function assertExactOutputTree(
  outputRoot: string,
  files: ReadonlyMap<string, Buffer>,
): string {
  let root: string;
  try {
    root = fs.realpathSync(outputRoot);
  } catch {
    fail("validated export root does not exist");
  }
  if (!fs.statSync(root).isDirectory()) fail("validated export root is not a directory");
  const expectedFiles = [...files.keys()].sort();
  const actual = actualOutputTree(root);
  if (stableResearchJson(actual.files) !== stableResearchJson(expectedFiles)) {
    fail("validated export file inventory differs from supplied output inventory");
  }
  const directories = expectedDirectories(expectedFiles);
  if (
    stableResearchJson(actual.directories) !== stableResearchJson(directories)
  ) {
    fail("validated export directory inventory differs from supplied output inventory");
  }
  for (const [filePath, bytes] of files) {
    const absolute = path.join(root, ...filePath.split("/"));
    if (!fs.readFileSync(absolute).equals(bytes)) {
      fail(`validated export bytes differ for '${filePath}'`);
    }
  }
  return root;
}

function assertCompleteCanonicalInventory(
  state: ResearchState,
  questId: QuestId,
  files: ReadonlyMap<string, Buffer>,
): void {
  for (const control of [
    "research-quest.yaml",
    "research-export-loss.json",
    "research-export-loss.md",
  ]) {
    if (!files.has(control)) fail(`mandatory control output '${control}' is missing`);
  }
  const expectedArtifacts = expectedArtifactInventory(state, questId);
  const actualArtifacts = [...files.keys()]
    .filter((filePath) => !CONTROL_OUTPUTS.has(filePath))
    .sort();
  if (
    stableResearchJson(actualArtifacts) !==
    stableResearchJson([...expectedArtifacts.keys()].sort())
  ) {
    fail("validated export Artifact inventory differs from current canonical import");
  }
  for (const [artifactPath, artifact] of expectedArtifacts) {
    const bytes = files.get(artifactPath);
    if (bytes === undefined) fail(`canonical Artifact '${artifactPath}' is missing`);
    if (artifact.sha256 !== undefined && hashBytes(bytes) !== `sha256:${artifact.sha256}`) {
      fail(`canonical Artifact '${artifactPath}' bytes differ from its SHA-256 binding`);
    }
  }
}

function withoutFields(
  value: object | undefined,
  fields: readonly string[],
): unknown {
  if (value === undefined) return undefined;
  const copy = structuredClone(value) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(copy).filter(([field]) => !fields.includes(field)),
  );
}

function assertMappedExportState(
  state: ResearchState,
  questId: QuestId,
  files: ReadonlyMap<string, Buffer>,
): void {
  const quest = state.quests[questId];
  if (quest === undefined) fail(`Quest '${questId}' does not exist`);
  const repositoryId = quest.repositoryIds[0];
  if (repositoryId === undefined) fail("Quest has no source Repository");
  const yamlBytes = files.get("research-quest.yaml");
  if (yamlBytes === undefined) fail("source-compatible Quest YAML is missing");
  const eventsBytes = files.get("research-events.jsonl");
  const validationState = structuredClone(state);
  const authority = validationState.questWriterAuthorityByQuestId[questId];
  if (authority === undefined) fail("Quest has no current writer authority");
  validationState.questWriterAuthorityByQuestId[questId] = {
    ...authority,
    writer: "source",
  };
  const plan = buildQuestImportPlanV1({
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
      .filter(([filePath]) => !CONTROL_OUTPUTS.has(filePath))
      .map(([filePath, bytes]) => ({ path: filePath, bytes })),
    actor: "trellis-export-validator",
    rationale: "Authenticate mapped Quest export state",
    frozenManifestDigest: FROZEN_C1_SOURCE_MANIFEST_DIGEST,
    existingQuestId: questId,
    state: validationState,
  });
  if (plan.conflicts.length > 0) {
    fail(
      `frozen mapped-state validation failed: ${plan.conflicts
        .map((conflict) => `${conflict.path}: ${conflict.message}`)
        .join("; ")}`,
    );
  }
  const unexpectedMutation = plan.mutations.find((mutation) =>
    [
      "artifact.register",
      "quest.create",
      "quest.status",
      "quest.stage",
      "claim.create",
      "claim.status",
    ].includes(mutation.kind),
  );
  if (unexpectedMutation !== undefined) {
    fail(`exported mapped state requires '${unexpectedMutation.kind}' mutation`);
  }
  const plannedImport = plan.mutations.find(
    (mutation) => mutation.kind === "quest.import.record",
  );
  const plannedRoute = plan.mutations.find(
    (mutation) => mutation.kind === "quest.route.set",
  );
  const plannedUniverses = plan.mutations.filter(
    (mutation) => mutation.kind === "quest.scientific-universe.record",
  );
  const plannedMilestones = plan.mutations.filter(
    (mutation) => mutation.kind === "quest.import.milestone",
  );
  if (plannedImport === undefined || plannedRoute === undefined) {
    fail("frozen mapped-state validation did not produce import and route state");
  }
  const currentImportId = state.latestQuestImportRecordIdByQuestId[questId];
  const currentImport =
    currentImportId === undefined
      ? undefined
      : state.questImportRecords[currentImportId];
  if (currentImport === undefined) fail("Quest has no current import snapshot");
  const currentRouteId = state.latestQuestRouteSnapshotIdByQuestId[questId];
  const currentRoute =
    currentRouteId === undefined
      ? undefined
      : state.questRouteSnapshots[currentRouteId];
  const currentUniverses = Object.values(state.questScientificUniverses)
    .filter(
      (universe) =>
        universe.questId === questId &&
        universe.importRecordId === currentImportId,
    )
    .sort((left, right) => left.gateId.localeCompare(right.gateId));
  const currentMilestones = Object.values(state.questImportMilestones)
    .filter(
      (milestone) =>
        milestone.questId === questId &&
        milestone.importRecordId === currentImportId,
    )
    .sort((left, right) => left.sourceLine - right.sourceLine);
  const currentClaims = currentImport.claimIds.map((claimId) => {
    const claim = state.claims[claimId];
    if (claim === undefined) fail(`current import references missing Claim '${claimId}'`);
    return { id: claim.id, statement: claim.statement, status: claim.status };
  });
  const current = {
    quest: {
      id: quest.id,
      sourceQuestId: currentImport.sourceIdentity.sourceQuestId,
      projectSlug: currentImport.sourceIdentity.projectSlug,
      title: quest.title,
      description: quest.description,
      status: quest.status,
      stage: quest.stage,
    },
    import: {
      sourceIdentity: currentImport.sourceIdentity,
      sourceSchemaVersion: currentImport.sourceSnapshot.sourceSchemaVersion,
      sourceStatus: currentImport.sourceStatus,
      sourceActiveStage: currentImport.sourceActiveStage,
      sourceExtensions: currentImport.sourceExtensions,
      artifactIds: currentImport.artifactIds,
      claimIds: currentImport.claimIds,
    },
    route: withoutFields(currentRoute, ["id", "importRecordId", "recordedAt"]),
    universes: currentUniverses.map((universe) =>
      withoutFields(universe, [
        "id",
        "importRecordId",
        "sourceSnapshotDigest",
        "universeDigest",
        "recordedAt",
      ]),
    ),
    milestones: currentMilestones.map((milestone) =>
      withoutFields(milestone, ["id", "importRecordId"]),
    ),
    claims: currentClaims,
  };
  const planned = {
    quest: plan.quest,
    import: {
      sourceIdentity: plannedImport.record.sourceIdentity,
      sourceSchemaVersion:
        plannedImport.record.sourceSnapshot.sourceSchemaVersion,
      sourceStatus: plannedImport.record.sourceStatus,
      sourceActiveStage: plannedImport.record.sourceActiveStage,
      sourceExtensions: plannedImport.record.sourceExtensions,
      artifactIds: plannedImport.record.artifactIds,
      claimIds: plannedImport.record.claimIds,
    },
    route: withoutFields(plannedRoute.route, ["id", "importRecordId"]),
    universes: plannedUniverses
      .map((mutation) =>
        withoutFields(mutation.universe, [
          "id",
          "importRecordId",
          "sourceSnapshotDigest",
        ]),
      )
      .sort((left, right) =>
        stableResearchJson(left).localeCompare(stableResearchJson(right)),
      ),
    milestones: plannedMilestones
      .map((mutation) =>
        withoutFields(mutation.milestone, ["id", "importRecordId"]),
      )
      .sort((left, right) =>
        stableResearchJson(left).localeCompare(stableResearchJson(right)),
      ),
    claims: currentClaims,
  };
  for (const section of Object.keys(current) as (keyof typeof current)[]) {
    if (
      stableResearchJson(planned[section]) !==
      stableResearchJson(current[section])
    ) {
      fail(
        `exported YAML/JSONL ${section} mapping differs from current canonical state`,
      );
    }
  }
}

function assertLossReport(files: ReadonlyMap<string, Buffer>): `sha256:${string}` {
  const bytes = files.get("research-export-loss.json");
  if (bytes === undefined) fail("machine-readable loss report is missing");
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail(`machine-readable loss report is malformed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const report = value as {
    artifactInventory?: unknown;
    blockingLosses?: unknown;
  };
  if (!Array.isArray(report.blockingLosses) || report.blockingLosses.length > 0) {
    fail("loss report contains blocking authoritative mapping loss");
  }
  const expectedArtifactInventory = [...files]
    .filter(([filePath]) => !CONTROL_OUTPUTS.has(filePath))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([filePath, artifactBytes]) => ({
      path: filePath,
      digest: hashBytes(artifactBytes),
      bytes: artifactBytes.length,
    }));
  if (
    stableResearchJson(report.artifactInventory) !==
    stableResearchJson(expectedArtifactInventory)
  ) {
    fail("loss report Artifact inventory differs from validated export bytes");
  }
  return hashBytes(bytes);
}

function assertFrozenValidator(validatorPath: string): string {
  let canonical: string;
  try {
    canonical = fs.realpathSync(validatorPath);
  } catch {
    fail("frozen source validator does not exist");
  }
  if (!fs.statSync(canonical).isFile()) fail("frozen source validator is not a file");
  const validatorDigest = hashBytes(fs.readFileSync(canonical));
  if (validatorDigest !== FROZEN_C1_GATE_VALIDATOR_DIGEST) {
    fail("frozen source validator identity differs from the C1 contract");
  }
  return canonical;
}

function runFrozenValidator(
  outputRoot: string,
  files: ReadonlyMap<string, Buffer>,
  validatorPath: string,
): void {
  const opportunityPaths = [...files.keys()].filter(
    (filePath) => path.posix.basename(filePath) === "opportunity_board.md",
  );
  const ideaPaths = [...files.keys()].filter(
    (filePath) => path.posix.basename(filePath) === "ideas.md",
  );
  if (opportunityPaths.length !== 1 || ideaPaths.length !== 1) {
    fail("frozen H1/H2 validation requires one opportunity_board.md and one ideas.md");
  }
  const opportunityDirectory = path.posix.dirname(opportunityPaths[0] as string);
  const ideaDirectory = path.posix.dirname(ideaPaths[0] as string);
  if (opportunityDirectory !== ideaDirectory) {
    fail("frozen H1/H2 Artifacts must share one source validation directory");
  }
  for (const required of ["h1_decision.md", "h2_decision.md"]) {
    const requiredPath =
      opportunityDirectory === "." ? required : `${opportunityDirectory}/${required}`;
    if (!files.has(requiredPath)) {
      fail(`frozen H1/H2 validation requires canonical Artifact '${requiredPath}'`);
    }
  }
  const gateRoot =
    opportunityDirectory === "."
      ? outputRoot
      : path.join(outputRoot, ...opportunityDirectory.split("/"));
  for (const gate of ["h1", "h2"] as const) {
    const result = spawnSync(
      "uv",
      ["run", "python", validatorPath, gateRoot, "--gate", gate],
      { encoding: "utf8" },
    );
    if (result.error !== undefined || result.status !== 0) {
      const stdout = result.stdout.trim();
      const detail =
        result.error?.message ?? (stdout === "" ? result.stderr.trim() : stdout);
      fail(
        `frozen source validator ${gate} failed${detail === "" ? "" : `: ${detail}`}`,
      );
    }
  }
}

export function createValidatedQuestExportReceipt(
  input: CreateValidatedQuestExportReceiptInput,
): {
  receipt: ValidatedQuestExportReceipt;
  record: Omit<QuestExportRecord, "recordedAt">;
} {
  const files = canonicalFiles(input.files);
  assertCompleteCanonicalInventory(input.state, input.questId, files);
  const outputRoot = assertExactOutputTree(input.outputRoot, files);
  const validatorPath = assertFrozenValidator(input.validatorPath);
  const importRecordId = input.state.latestQuestImportRecordIdByQuestId[input.questId];
  const importRecord =
    importRecordId === undefined
      ? undefined
      : input.state.questImportRecords[importRecordId];
  if (
    importRecord?.sourceSnapshot.snapshotDigest !== input.sourceSnapshotDigest
  ) {
    fail("source snapshot differs from the current canonical import");
  }
  if (input.state.questWriterAuthorityByQuestId[input.questId]?.writer !== "trellis") {
    fail("validated export requires current Trellis writer authority");
  }
  assertMappedExportState(input.state, input.questId, files);
  runFrozenValidator(outputRoot, files, validatorPath);
  const record = Object.freeze({
    id: input.exportRecordId,
    questId: input.questId,
    sourceSnapshotDigest: input.sourceSnapshotDigest,
    exportDigest: computeQuestExportDigest(files),
    mappedStateDigest: computeQuestMappedStateDigest(input.state, input.questId),
    validatorDigest: FROZEN_C1_GATE_VALIDATOR_DIGEST,
    lossReportDigest: assertLossReport(files),
    validated: true as const,
  });
  const receipt = Object.freeze({});
  validatedReceipts.add(receipt);
  receiptData.set(receipt, { outputRoot, files, validatorPath, record });
  return { receipt, record };
}

export function consumeValidatedQuestExportReceipt(
  receipt: ValidatedQuestExportReceipt,
  state: ResearchState,
): Omit<QuestExportRecord, "recordedAt"> {
  if (!validatedReceipts.has(receipt)) fail("forged validated-export receipt");
  const internal = receiptData.get(receipt);
  if (internal === undefined) fail("forged validated-export receipt");
  assertExactOutputTree(internal.outputRoot, internal.files);
  assertFrozenValidator(internal.validatorPath);
  assertCompleteCanonicalInventory(state, internal.record.questId, internal.files);
  if (
    computeQuestMappedStateDigest(state, internal.record.questId) !==
    internal.record.mappedStateDigest
  ) {
    fail("canonical mapped state changed after export validation");
  }
  const importRecordId =
    state.latestQuestImportRecordIdByQuestId[internal.record.questId];
  const importRecord =
    importRecordId === undefined
      ? undefined
      : state.questImportRecords[importRecordId];
  if (
    importRecord?.sourceSnapshot.snapshotDigest !==
    internal.record.sourceSnapshotDigest
  ) {
    fail("source snapshot changed after export validation");
  }
  return internal.record;
}

import fs from "node:fs";
import path from "node:path";

import {
  ResearchCapabilityResolutionError,
  ResearchProcedurePolicyError,
  SupportPackError,
  assertResearchExecutionPackageIdentity,
  buildSupportPackInventory,
  evaluateResearchAutomaticEligibility,
  getResearchCapabilityDefinition,
  parseAcceptedV131ResearchProcedure,
  parseResearchProcedure,
  parseResearchSkillExecutionPackage,
  parseSupportPackManifest,
  resolveProcedurePackageSchemaVersion,
  resolveResearchEffectiveAuthority,
  selectResearchSkillMembers,
  serializeSupportPackManifest,
  validateResearchSkillInvocation,
  type ParsedResearchProcedure,
  type ParsedResearchSkillExecutionPackage,
  type ResearchAutomaticEligibility,
  type ResearchEffectiveAuthority,
  type ResearchExecutionProfile,
  type ResearchSkillInventoryItemV3,
  type ResearchSkillInvocationSource,
  type ResearchSkillMemberAudience,
  type ResolvedExecutionPackageIdentity,
} from "@mindfoldhq/trellis-core/research";

import { getBundledResearchProcedureRoot } from "./bundled-procedure-root.js";
import { getBundledResearchSkillRoot } from "./bundled-skill-root.js";
import { readResearchProjectPolicy } from "./project-policy.js";

export type ResearchProcedureResolutionErrorCode =
  | "INVALID_PROJECT_PROCEDURE"
  | "INVALID_BUNDLED_PROCEDURE";

export class ResearchProcedureResolutionError extends Error {
  readonly code: ResearchProcedureResolutionErrorCode;

  constructor(
    code: ResearchProcedureResolutionErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResearchProcedureResolutionError";
    this.code = code;
  }
}

export type ResearchSkillResolutionErrorCode =
  | "INVALID_PROJECT_SKILL"
  | "INVALID_BUNDLED_SKILL"
  | "RESEARCH_SKILL_NOT_FOUND";

export class ResearchSkillResolutionError extends Error {
  readonly code: ResearchSkillResolutionErrorCode;

  constructor(
    code: ResearchSkillResolutionErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResearchSkillResolutionError";
    this.code = code;
  }
}

export type ResearchExecutionPackageSelector =
  | {
      readonly packageKind: "procedure";
      readonly mode: "registry-current";
      readonly capabilityId: string;
    }
  | {
      readonly packageKind: "procedure";
      readonly mode: "activation-recorded";
      readonly capabilityId: string;
      readonly id: string;
      readonly version: string;
    }
  | {
      readonly packageKind: "skill";
      readonly mode: "exact";
      readonly id: string;
      readonly version: string;
    };

export interface ResolvedResearchSkillExecutionPackage {
  readonly source: "project" | "bundled";
  readonly manifest: ParsedResearchSkillExecutionPackage["manifest"];
  readonly canonicalManifestJson: string;
  readonly instructions: string;
  readonly identity: ResolvedExecutionPackageIdentity;
  readonly members: readonly ResearchSkillInventoryItemV3[];
}

interface FileIdentity {
  readonly dev: number;
  readonly ino: number;
  readonly mode: number;
  readonly size: number;
  readonly mtimeMs: number;
  readonly ctimeMs: number;
}

interface PathSnapshot {
  readonly path: string;
  readonly canonicalPath: string;
  readonly identity: FileIdentity;
  readonly followsRoot: boolean;
}

interface ProcedureDirectorySelection {
  readonly path: string;
  readonly canonicalPath: string;
  readonly canonicalRoot: string;
  readonly chain: readonly PathSnapshot[];
}

interface StableFileRead {
  readonly bytes: Uint8Array;
  readonly snapshot: PathSnapshot;
}

interface ProcedureBytes {
  readonly manifestBytes: Uint8Array;
  readonly instructionBytes: Uint8Array;
}

interface StableSkillFileRead extends StableFileRead {
  readonly canonicalDirectory: string;
  readonly parentSelection?: ProcedureDirectorySelection;
}

const MAX_SKILL_MANIFEST_BYTES = 64 * 1024;
const MAX_SKILL_INSTRUCTION_BYTES = 256 * 1024;
const MAX_SKILL_MEMBER_COUNT = 256;
const MAX_SKILL_MEMBER_BYTES = 1024 * 1024;
const MAX_SKILL_AGGREGATE_MEMBER_BYTES = 8 * 1024 * 1024;

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function identity(stat: fs.Stats): FileIdentity {
  return {
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs,
  };
}

function sameNodeIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return (
    left.dev === right.dev && left.ino === right.ino && left.mode === right.mode
  );
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return (
    sameNodeIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

function validateSegments(segments: readonly string[]): void {
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\") ||
        segment.includes("\0"),
    )
  ) {
    throw new Error("Procedure path segments are invalid");
  }
}

function inspectDirectoryPath(
  root: string,
  segments: readonly string[],
):
  | { readonly status: "absent" }
  | {
      readonly status: "present";
      readonly selection: ProcedureDirectorySelection;
    } {
  validateSegments(segments);
  const absoluteRoot = path.resolve(root);
  const rootStat = fs.statSync(absoluteRoot);
  if (!rootStat.isDirectory())
    throw new Error("Procedure root must be a directory");
  const canonicalRoot = fs.realpathSync(absoluteRoot);
  const chain: PathSnapshot[] = [
    {
      path: absoluteRoot,
      canonicalPath: canonicalRoot,
      identity: identity(rootStat),
      followsRoot: true,
    },
  ];
  let current = absoluteRoot;
  let canonicalCurrent = canonicalRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { status: "absent" };
      }
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(
        `Procedure path component '${segment}' must be a directory`,
      );
    }
    canonicalCurrent = fs.realpathSync(current);
    if (!isContained(canonicalRoot, canonicalCurrent)) {
      throw new Error("Procedure directory escapes its root");
    }
    chain.push({
      path: current,
      canonicalPath: canonicalCurrent,
      identity: identity(stat),
      followsRoot: false,
    });
  }
  return {
    status: "present",
    selection: {
      path: current,
      canonicalPath: canonicalCurrent,
      canonicalRoot,
      chain: Object.freeze(chain),
    },
  };
}

function validatePathSnapshot(
  snapshot: PathSnapshot,
  canonicalRoot: string,
): void {
  const stat = snapshot.followsRoot
    ? fs.statSync(snapshot.path)
    : fs.lstatSync(snapshot.path);
  if (
    !stat.isDirectory() ||
    (!snapshot.followsRoot && stat.isSymbolicLink()) ||
    !sameNodeIdentity(snapshot.identity, identity(stat))
  ) {
    throw new Error(
      "Procedure directory chain changed while it was being read",
    );
  }
  const canonical = fs.realpathSync(snapshot.path);
  if (
    canonical !== snapshot.canonicalPath ||
    !isContained(canonicalRoot, canonical)
  ) {
    throw new Error(
      "Procedure directory chain changed while it was being read",
    );
  }
}

function validateDirectorySelection(
  selection: ProcedureDirectorySelection,
): void {
  for (const snapshot of selection.chain) {
    validatePathSnapshot(snapshot, selection.canonicalRoot);
  }
}

function validateStableFile(
  snapshot: PathSnapshot,
  canonicalDirectory: string,
): void {
  const stat = fs.lstatSync(snapshot.path);
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    !sameIdentity(snapshot.identity, identity(stat)) ||
    fs.realpathSync(snapshot.path) !== snapshot.canonicalPath ||
    path.dirname(snapshot.canonicalPath) !== canonicalDirectory
  ) {
    throw new Error(
      `${path.basename(snapshot.path)} changed while it was being read`,
    );
  }
}

function readStableFile(
  selection: ProcedureDirectorySelection,
  fileName: "procedure.json" | "PROCEDURE.md",
): StableFileRead {
  const filePath = path.join(selection.path, fileName);
  const beforeLink = fs.lstatSync(filePath);
  if (beforeLink.isSymbolicLink() || !beforeLink.isFile()) {
    throw new Error(`${fileName} must be a non-symlink regular file`);
  }
  const canonicalFile = fs.realpathSync(filePath);
  if (
    path.dirname(canonicalFile) !== selection.canonicalPath ||
    path.basename(canonicalFile) !== fileName
  ) {
    throw new Error(`${fileName} escapes its Procedure directory`);
  }
  const snapshot: PathSnapshot = {
    path: filePath,
    canonicalPath: canonicalFile,
    identity: identity(beforeLink),
    followsRoot: false,
  };
  const bytes = new Uint8Array(fs.readFileSync(filePath));
  validateStableFile(snapshot, selection.canonicalPath);
  return { bytes, snapshot };
}

function readProcedureBytes(
  selection: ProcedureDirectorySelection,
): ProcedureBytes {
  validateDirectorySelection(selection);
  const manifest = readStableFile(selection, "procedure.json");
  const instructions = readStableFile(selection, "PROCEDURE.md");
  validateDirectorySelection(selection);
  validateStableFile(manifest.snapshot, selection.canonicalPath);
  validateStableFile(instructions.snapshot, selection.canonicalPath);
  return {
    manifestBytes: manifest.bytes,
    instructionBytes: instructions.bytes,
  };
}

function readStableSkillFile(
  selection: ProcedureDirectorySelection,
  relativePath: string,
  maximumBytes: number,
): StableSkillFileRead {
  if (
    relativePath.length === 0 ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    path.isAbsolute(relativePath) ||
    relativePath
      .split("/")
      .some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`Research Skill path is unsafe: ${relativePath}`);
  }
  const segments = relativePath.split("/");
  const fileName = segments.at(-1) as string;
  const parentSegments = segments.slice(0, -1);
  let directoryPath = selection.path;
  let canonicalDirectory = selection.canonicalPath;
  let parentSelection: ProcedureDirectorySelection | undefined;
  if (parentSegments.length > 0) {
    const parent = inspectDirectoryPath(selection.path, parentSegments);
    if (parent.status === "absent") {
      throw new Error(`Research Skill member is missing: ${relativePath}`);
    }
    parentSelection = parent.selection;
    directoryPath = parent.selection.path;
    canonicalDirectory = parent.selection.canonicalPath;
  }
  const filePath = path.join(directoryPath, fileName);
  const beforeLink = fs.lstatSync(filePath);
  if (beforeLink.isSymbolicLink() || !beforeLink.isFile()) {
    throw new Error(
      `Research Skill file must be a non-symlink regular file: ${relativePath}`,
    );
  }
  if (beforeLink.size > maximumBytes) {
    throw new Error(
      `Research Skill file exceeds ${maximumBytes} bytes: ${relativePath}`,
    );
  }
  const canonicalFile = fs.realpathSync(filePath);
  if (
    path.dirname(canonicalFile) !== canonicalDirectory ||
    path.basename(canonicalFile) !== fileName
  ) {
    throw new Error(`Research Skill file escapes its package: ${relativePath}`);
  }
  const snapshot: PathSnapshot = {
    path: filePath,
    canonicalPath: canonicalFile,
    identity: identity(beforeLink),
    followsRoot: false,
  };
  const bytes = new Uint8Array(fs.readFileSync(filePath));
  validateStableFile(snapshot, canonicalDirectory);
  if (parentSelection !== undefined)
    validateDirectorySelection(parentSelection);
  return { bytes, snapshot, canonicalDirectory, parentSelection };
}

function validateStableSkillFileRead(read: StableSkillFileRead): void {
  if (read.parentSelection !== undefined) {
    validateDirectorySelection(read.parentSelection);
  }
  validateStableFile(read.snapshot, read.canonicalDirectory);
}

function readSkillPackageBytes(selection: ProcedureDirectorySelection): {
  readonly manifestBytes: Uint8Array;
  readonly instructionBytes: Uint8Array;
  readonly memberBytes: Readonly<Record<string, Uint8Array>>;
} {
  validateDirectorySelection(selection);
  const manifest = readStableSkillFile(
    selection,
    "skill.json",
    MAX_SKILL_MANIFEST_BYTES,
  );
  const instructions = readStableSkillFile(
    selection,
    "SKILL.md",
    MAX_SKILL_INSTRUCTION_BYTES,
  );
  const peek = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(manifest.bytes),
  ) as { members?: unknown };
  if (!Array.isArray(peek.members)) {
    throw new Error("Research Skill manifest members must be an array");
  }
  if (peek.members.length > MAX_SKILL_MEMBER_COUNT) {
    throw new Error(
      `Research Skill manifest declares more than ${MAX_SKILL_MEMBER_COUNT} members`,
    );
  }
  const memberReads: StableSkillFileRead[] = [];
  const memberBytes: Record<string, Uint8Array> = Object.create(null) as Record<
    string,
    Uint8Array
  >;
  let aggregateMemberBytes = 0;
  for (const entry of peek.members) {
    if (
      entry === null ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      typeof (entry as { path?: unknown }).path !== "string"
    ) {
      throw new Error("Research Skill manifest member path is invalid");
    }
    const memberPath = (entry as { path: string }).path;
    const read = readStableSkillFile(
      selection,
      memberPath,
      MAX_SKILL_MEMBER_BYTES,
    );
    aggregateMemberBytes += read.bytes.length;
    if (aggregateMemberBytes > MAX_SKILL_AGGREGATE_MEMBER_BYTES) {
      throw new Error(
        `Research Skill members exceed ${MAX_SKILL_AGGREGATE_MEMBER_BYTES} bytes`,
      );
    }
    memberReads.push(read);
    memberBytes[memberPath] = read.bytes;
  }
  validateDirectorySelection(selection);
  validateStableSkillFileRead(manifest);
  validateStableSkillFileRead(instructions);
  for (const read of memberReads) validateStableSkillFileRead(read);
  return {
    manifestBytes: manifest.bytes,
    instructionBytes: instructions.bytes,
    memberBytes,
  };
}

export type ResearchProcedureResolveMode =
  | "registry-current"
  | "activation-recorded";

function readContainedRelativeFile(
  selection: ProcedureDirectorySelection,
  relativePath: string,
): Uint8Array {
  if (
    relativePath.length === 0 ||
    relativePath.includes("\0") ||
    relativePath.includes("\\") ||
    path.isAbsolute(relativePath) ||
    relativePath.split("/").some((s) => s === "" || s === "." || s === "..")
  ) {
    throw new Error(`Support-pack path is unsafe: ${relativePath}`);
  }
  const filePath = path.join(
    selection.path,
    "methodology",
    ...relativePath.split("/"),
  );
  const beforeLink = fs.lstatSync(filePath);
  if (beforeLink.isSymbolicLink() || !beforeLink.isFile()) {
    throw new Error(
      `Support-pack entry must be a non-symlink file: ${relativePath}`,
    );
  }
  const canonicalFile = fs.realpathSync(filePath);
  const methodologyRoot = path.join(selection.canonicalPath, "methodology");
  if (
    !canonicalFile.startsWith(methodologyRoot + path.sep) &&
    canonicalFile !== methodologyRoot
  ) {
    throw new Error(
      `Support-pack entry escapes methodology root: ${relativePath}`,
    );
  }
  const bytes = new Uint8Array(fs.readFileSync(filePath));
  const after = fs.lstatSync(filePath);
  if (
    after.isSymbolicLink() ||
    !after.isFile() ||
    after.size !== beforeLink.size ||
    after.mtimeMs !== beforeLink.mtimeMs
  ) {
    throw new Error(
      `Support-pack entry changed while reading: ${relativePath}`,
    );
  }
  return bytes;
}

function loadRequiredSupportPack(
  selection: ProcedureDirectorySelection,
  procedureId: string,
  procedureVersion: string,
): {
  readonly manifest: ReturnType<typeof parseSupportPackManifest>;
  readonly packJsonBytes: Uint8Array;
  readonly inventoryItems: ReturnType<typeof buildSupportPackInventory>;
} {
  const methodologyDir = path.join(selection.path, "methodology");
  if (!fs.existsSync(methodologyDir)) {
    throw new Error(
      "Schema-v2 Procedure package requires methodology/ directory",
    );
  }
  const methodologyStat = fs.lstatSync(methodologyDir);
  if (methodologyStat.isSymbolicLink() || !methodologyStat.isDirectory()) {
    throw new Error("methodology/ must be a non-symlink directory");
  }
  const packPath = path.join(methodologyDir, "pack.json");
  if (!fs.existsSync(packPath)) {
    throw new Error(
      "Schema-v2 Procedure package requires methodology/pack.json",
    );
  }
  validateDirectorySelection(selection);
  const packLink = fs.lstatSync(packPath);
  if (packLink.isSymbolicLink() || !packLink.isFile()) {
    throw new Error("methodology/pack.json must be a non-symlink regular file");
  }
  const packBytes = new Uint8Array(fs.readFileSync(packPath));
  const afterPack = fs.lstatSync(packPath);
  if (
    afterPack.isSymbolicLink() ||
    !afterPack.isFile() ||
    afterPack.size !== packLink.size ||
    afterPack.mtimeMs !== packLink.mtimeMs
  ) {
    throw new Error("methodology/pack.json changed while reading");
  }
  let manifest;
  try {
    manifest = parseSupportPackManifest({
      packJsonBytes: packBytes,
      procedureId,
      procedureVersion,
    });
  } catch (error) {
    if (error instanceof SupportPackError) throw error;
    throw error;
  }
  // Require canonical on-disk pack.json bytes (no silent re-serialization).
  const canonicalPack = serializeSupportPackManifest(manifest);
  const canonicalPackBytes = new TextEncoder().encode(canonicalPack);
  if (
    packBytes.length !== canonicalPackBytes.length ||
    !packBytes.every((b, i) => b === canonicalPackBytes[i])
  ) {
    throw new Error(
      "methodology/pack.json bytes are not canonical; rewrite to stable serialization",
    );
  }
  const files: Record<string, Uint8Array> = {};
  for (const entry of manifest.entries) {
    files[entry.path] = readContainedRelativeFile(selection, entry.path);
  }
  validateDirectorySelection(selection);
  const inventoryItems = buildSupportPackInventory({
    manifest,
    files,
  });
  return {
    manifest,
    packJsonBytes: packBytes,
    inventoryItems,
  };
}

function assertNoSupportPack(selection: ProcedureDirectorySelection): void {
  const packPath = path.join(selection.path, "methodology", "pack.json");
  if (fs.existsSync(packPath)) {
    throw new Error(
      "Schema-v1 Procedure package must not include methodology/pack.json",
    );
  }
}

function parseSelectedProcedure(
  capabilityId: string,
  source: "project" | "bundled",
  selection: ProcedureDirectorySelection,
  mode: ResearchProcedureResolveMode = "registry-current",
  recordedVersion?: string,
  recordedProcedureId?: string,
): ParsedResearchProcedure {
  const bytes = readProcedureBytes(selection);
  // Peek procedure identity without full policy parse for pack binding.
  const peek = JSON.parse(new TextDecoder().decode(bytes.manifestBytes)) as {
    id?: string;
    version?: string;
    packageSchemaVersion?: unknown;
  };
  const procedureId =
    recordedProcedureId ?? (typeof peek.id === "string" ? peek.id : "");
  const procedureVersion =
    recordedVersion ?? (typeof peek.version === "string" ? peek.version : "");
  const packageSchemaVersion = resolveProcedurePackageSchemaVersion({
    packageSchemaVersion: peek.packageSchemaVersion,
    procedureVersion,
  });
  const recordedIdentity =
    mode === "activation-recorded" &&
    recordedVersion !== undefined &&
    recordedProcedureId !== undefined
      ? {
          identityMode: "recorded-version" as const,
          recordedVersion,
          recordedProcedureId,
        }
      : {
          identityMode: "capability-current" as const,
        };
  if (packageSchemaVersion === 2) {
    const supportPack = loadRequiredSupportPack(
      selection,
      procedureId,
      procedureVersion,
    );
    const parserInput = {
      capabilityId,
      source,
      ...bytes,
      packageSchemaVersion: 2 as const,
      ...recordedIdentity,
      supportPack,
    };
    if (mode === "activation-recorded" && recordedVersion === "2.0.7") {
      return parseAcceptedV131ResearchProcedure(parserInput);
    }
    return parseResearchProcedure(parserInput);
  }
  assertNoSupportPack(selection);
  return parseResearchProcedure({
    capabilityId,
    source,
    ...bytes,
    packageSchemaVersion: 1,
    ...recordedIdentity,
  });
}

function mapResolutionError(
  code: ResearchProcedureResolutionErrorCode,
  capabilityId: string,
  error: unknown,
): never {
  if (error instanceof ResearchCapabilityResolutionError) throw error;
  throw new ResearchProcedureResolutionError(
    code,
    `${code === "INVALID_PROJECT_PROCEDURE" ? "Project" : "Bundled"} Research Procedure for '${capabilityId}' is invalid`,
    { cause: error },
  );
}

async function resolveSelectedResearchProcedure(input: {
  readonly root: string;
  readonly capabilityId: string;
  readonly mode?: ResearchProcedureResolveMode;
  readonly procedureId?: string;
  readonly procedureVersion?: string;
}): Promise<ParsedResearchProcedure> {
  const capability = getResearchCapabilityDefinition(input.capabilityId);
  if (capability === undefined) {
    throw new ResearchCapabilityResolutionError(
      "UNKNOWN_CAPABILITY",
      `Unknown Research capability '${input.capabilityId}'`,
    );
  }

  const mode = input.mode ?? "registry-current";
  let procedureId = capability.procedure.id;
  let procedureVersion = capability.procedure.version;
  if (mode === "activation-recorded") {
    if (
      input.procedureId === undefined ||
      input.procedureId.length === 0 ||
      input.procedureVersion === undefined ||
      input.procedureVersion.length === 0
    ) {
      throw new ResearchProcedureResolutionError(
        "INVALID_BUNDLED_PROCEDURE",
        "activation-recorded mode requires procedureId and procedureVersion",
      );
    }
    procedureId = input.procedureId;
    procedureVersion = input.procedureVersion;
  }

  const projectSegments = [
    ".trellis",
    "research",
    "procedures",
    procedureId,
    procedureVersion,
  ];
  let project: ReturnType<typeof inspectDirectoryPath>;
  try {
    project = inspectDirectoryPath(input.root, projectSegments);
  } catch (error) {
    mapResolutionError("INVALID_PROJECT_PROCEDURE", capability.id, error);
  }
  if (project.status === "present") {
    try {
      return parseSelectedProcedure(
        capability.id,
        "project",
        project.selection,
        mode,
        procedureVersion,
        procedureId,
      );
    } catch (error) {
      mapResolutionError("INVALID_PROJECT_PROCEDURE", capability.id, error);
    }
  }

  try {
    const bundledRoot = getBundledResearchProcedureRoot();
    const bundled = inspectDirectoryPath(bundledRoot, [
      procedureId,
      procedureVersion,
    ]);
    if (bundled.status === "absent") {
      throw new Error("Bundled Procedure directory is absent");
    }
    return parseSelectedProcedure(
      capability.id,
      "bundled",
      bundled.selection,
      mode,
      procedureVersion,
      procedureId,
    );
  } catch (error) {
    mapResolutionError("INVALID_BUNDLED_PROCEDURE", capability.id, error);
  }
}

function parseSelectedSkill(
  source: "project" | "bundled",
  selection: ProcedureDirectorySelection,
): ParsedResearchSkillExecutionPackage {
  return parseResearchSkillExecutionPackage({
    source,
    ...readSkillPackageBytes(selection),
  });
}

function mapSkillResolutionError(
  code: Exclude<ResearchSkillResolutionErrorCode, "RESEARCH_SKILL_NOT_FOUND">,
  skillId: string,
  version: string,
  error: unknown,
): never {
  throw new ResearchSkillResolutionError(
    code,
    `${code === "INVALID_PROJECT_SKILL" ? "Project" : "Bundled"} Research Skill '${skillId}@${version}' is invalid`,
    { cause: error },
  );
}

function skillNotFound(skillId: string, version: string): never {
  throw new ResearchSkillResolutionError(
    "RESEARCH_SKILL_NOT_FOUND",
    `Research Skill '${skillId}@${version}' was not found`,
  );
}

async function resolveSelectedResearchSkill(input: {
  readonly root: string;
  readonly id: string;
  readonly version: string;
  readonly invocationSource: ResearchSkillInvocationSource;
  readonly profile?: ResearchExecutionProfile;
  readonly audience: ResearchSkillMemberAudience;
  readonly requestedMemberPaths?: readonly string[];
  readonly expectedIdentity?: ResolvedExecutionPackageIdentity;
}): Promise<ResolvedResearchSkillExecutionPackage> {
  let parsed: ParsedResearchSkillExecutionPackage;
  let project: ReturnType<typeof inspectDirectoryPath>;
  try {
    project = inspectDirectoryPath(input.root, [
      ".trellis",
      "research",
      "skills",
      input.id,
      input.version,
    ]);
  } catch (error) {
    mapSkillResolutionError(
      "INVALID_PROJECT_SKILL",
      input.id,
      input.version,
      error,
    );
  }
  if (project.status === "present") {
    try {
      parsed = parseSelectedSkill("project", project.selection);
    } catch (error) {
      mapSkillResolutionError(
        "INVALID_PROJECT_SKILL",
        input.id,
        input.version,
        error,
      );
    }
  } else {
    const bundledRoot = getBundledResearchSkillRoot();
    if (!fs.existsSync(bundledRoot)) skillNotFound(input.id, input.version);
    let bundled: ReturnType<typeof inspectDirectoryPath>;
    try {
      bundled = inspectDirectoryPath(bundledRoot, [input.id, input.version]);
    } catch (error) {
      mapSkillResolutionError(
        "INVALID_BUNDLED_SKILL",
        input.id,
        input.version,
        error,
      );
    }
    if (bundled.status === "absent") skillNotFound(input.id, input.version);
    try {
      parsed = parseSelectedSkill("bundled", bundled.selection);
    } catch (error) {
      mapSkillResolutionError(
        "INVALID_BUNDLED_SKILL",
        input.id,
        input.version,
        error,
      );
    }
  }

  assertResearchExecutionPackageIdentity(parsed.identity, {
    id: input.id,
    version: input.version,
    packageKind: "skill",
  });
  if (input.expectedIdentity !== undefined) {
    assertResearchExecutionPackageIdentity(
      parsed.identity,
      input.expectedIdentity,
    );
  }
  validateResearchSkillInvocation({
    skill: parsed,
    invocationSource: input.invocationSource,
    ...(input.profile === undefined ? {} : { profile: input.profile }),
  });
  const members = selectResearchSkillMembers({
    skill: parsed,
    audience: input.audience,
    ...(input.requestedMemberPaths === undefined
      ? {}
      : { requestedPaths: input.requestedMemberPaths }),
  });
  return Object.freeze({
    source: parsed.source,
    manifest: parsed.manifest,
    canonicalManifestJson: parsed.canonicalManifestJson,
    instructions: parsed.instructions,
    identity: parsed.identity,
    members,
  });
}

export type ResearchExecutionPackageResolutionInput =
  | {
      readonly root: string;
      readonly selector: Extract<
        ResearchExecutionPackageSelector,
        { packageKind: "procedure" }
      >;
    }
  | {
      readonly root: string;
      readonly selector: Extract<
        ResearchExecutionPackageSelector,
        { packageKind: "skill" }
      >;
      readonly invocationSource: ResearchSkillInvocationSource;
      readonly profile?: ResearchExecutionProfile;
      readonly audience: ResearchSkillMemberAudience;
      readonly requestedMemberPaths?: readonly string[];
      readonly expectedIdentity?: ResolvedExecutionPackageIdentity;
    };

export async function resolveResearchExecutionPackage(
  input: ResearchExecutionPackageResolutionInput,
): Promise<ParsedResearchProcedure | ResolvedResearchSkillExecutionPackage> {
  if (input.selector.packageKind === "procedure") {
    return input.selector.mode === "registry-current"
      ? resolveSelectedResearchProcedure({
          root: input.root,
          capabilityId: input.selector.capabilityId,
        })
      : resolveSelectedResearchProcedure({
          root: input.root,
          capabilityId: input.selector.capabilityId,
          mode: "activation-recorded",
          procedureId: input.selector.id,
          procedureVersion: input.selector.version,
        });
  }
  const skillInput = input as Extract<
    ResearchExecutionPackageResolutionInput,
    { readonly invocationSource: ResearchSkillInvocationSource }
  >;
  return resolveSelectedResearchSkill({
    root: skillInput.root,
    id: skillInput.selector.id,
    version: skillInput.selector.version,
    invocationSource: skillInput.invocationSource,
    ...(skillInput.profile === undefined
      ? {}
      : { profile: skillInput.profile }),
    audience: skillInput.audience,
    ...(skillInput.requestedMemberPaths === undefined
      ? {}
      : { requestedMemberPaths: skillInput.requestedMemberPaths }),
    ...(skillInput.expectedIdentity === undefined
      ? {}
      : { expectedIdentity: skillInput.expectedIdentity }),
  });
}

export async function resolveResearchSkillExecutionPackage(input: {
  readonly root: string;
  readonly id: string;
  readonly version: string;
  readonly invocationSource: ResearchSkillInvocationSource;
  readonly profile?: ResearchExecutionProfile;
  readonly audience: ResearchSkillMemberAudience;
  readonly requestedMemberPaths?: readonly string[];
  readonly expectedIdentity?: ResolvedExecutionPackageIdentity;
}): Promise<ResolvedResearchSkillExecutionPackage> {
  const resolved = await resolveResearchExecutionPackage({
    root: input.root,
    selector: {
      packageKind: "skill",
      mode: "exact",
      id: input.id,
      version: input.version,
    },
    invocationSource: input.invocationSource,
    ...(input.profile === undefined ? {} : { profile: input.profile }),
    audience: input.audience,
    ...(input.requestedMemberPaths === undefined
      ? {}
      : { requestedMemberPaths: input.requestedMemberPaths }),
    ...(input.expectedIdentity === undefined
      ? {}
      : { expectedIdentity: input.expectedIdentity }),
  });
  return resolved as ResolvedResearchSkillExecutionPackage;
}

export async function resolveResearchProcedure(input: {
  readonly root: string;
  readonly capabilityId: string;
  /**
   * registry-current (default): resolve capability.procedure.id@version from registry.
   * activation-recorded: resolve the exact recorded Procedure id/version for historical activations.
   */
  readonly mode?: ResearchProcedureResolveMode;
  readonly procedureId?: string;
  readonly procedureVersion?: string;
}): Promise<ParsedResearchProcedure> {
  const selector: Extract<
    ResearchExecutionPackageSelector,
    { packageKind: "procedure" }
  > =
    input.mode === "activation-recorded"
      ? {
          packageKind: "procedure",
          mode: "activation-recorded",
          capabilityId: input.capabilityId,
          id: input.procedureId ?? "",
          version: input.procedureVersion ?? "",
        }
      : {
          packageKind: "procedure",
          mode: "registry-current",
          capabilityId: input.capabilityId,
        };
  return (await resolveResearchExecutionPackage({
    root: input.root,
    selector,
  })) as ParsedResearchProcedure;
}

export async function resolveResearchProcedureAuthority(input: {
  readonly root: string;
  readonly capabilityId: string;
}): Promise<{
  readonly procedure: ParsedResearchProcedure;
  readonly policy: Awaited<ReturnType<typeof readResearchProjectPolicy>>;
  readonly authority: ResearchEffectiveAuthority;
  readonly automaticEligibility: ResearchAutomaticEligibility;
}> {
  const procedure = await resolveResearchProcedure(input);
  const policy = await readResearchProjectPolicy({ root: input.root });
  let authority: ResearchEffectiveAuthority;
  try {
    authority = resolveResearchEffectiveAuthority({
      capabilityId: input.capabilityId,
      procedure,
      policy,
    });
  } catch (error) {
    if (error instanceof ResearchProcedurePolicyError) throw error;
    throw error;
  }
  return Object.freeze({
    procedure,
    policy,
    authority,
    automaticEligibility: evaluateResearchAutomaticEligibility(authority),
  });
}

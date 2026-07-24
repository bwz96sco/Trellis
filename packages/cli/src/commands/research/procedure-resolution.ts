import fs from "node:fs";
import path from "node:path";

import {
  ResearchCapabilityResolutionError,
  ResearchProcedurePolicyError,
  evaluateResearchAutomaticEligibility,
  getResearchCapabilityDefinition,
  parseResearchProcedure,
  resolveResearchEffectiveAuthority,
  type ParsedResearchProcedure,
  type ResearchAutomaticEligibility,
  type ResearchEffectiveAuthority,
} from "@mindfoldhq/trellis-core/research";

import { getBundledResearchProcedureRoot } from "./bundled-procedure-root.js";
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

function parseSelectedProcedure(
  capabilityId: string,
  source: "project" | "bundled",
  selection: ProcedureDirectorySelection,
): ParsedResearchProcedure {
  const bytes = readProcedureBytes(selection);
  return parseResearchProcedure({ capabilityId, source, ...bytes });
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

export async function resolveResearchProcedure(input: {
  readonly root: string;
  readonly capabilityId: string;
}): Promise<ParsedResearchProcedure> {
  const capability = getResearchCapabilityDefinition(input.capabilityId);
  if (capability === undefined) {
    throw new ResearchCapabilityResolutionError(
      "UNKNOWN_CAPABILITY",
      `Unknown Research capability '${input.capabilityId}'`,
    );
  }

  const projectSegments = [
    ".trellis",
    "research",
    "procedures",
    capability.procedure.id,
    capability.procedure.version,
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
      );
    } catch (error) {
      mapResolutionError("INVALID_PROJECT_PROCEDURE", capability.id, error);
    }
  }

  try {
    const bundledRoot = getBundledResearchProcedureRoot();
    const bundled = inspectDirectoryPath(bundledRoot, [
      capability.procedure.id,
      capability.procedure.version,
    ]);
    if (bundled.status === "absent") {
      throw new Error("Bundled Procedure directory is absent");
    }
    return parseSelectedProcedure(capability.id, "bundled", bundled.selection);
  } catch (error) {
    mapResolutionError("INVALID_BUNDLED_PROCEDURE", capability.id, error);
  }
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

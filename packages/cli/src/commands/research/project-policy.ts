import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
  ResearchProcedurePolicyError,
  parseResearchProjectPolicy,
  type ParsedResearchProjectPolicy,
} from "@mindfoldhq/trellis-core/research";

import { writeFileAtomic } from "../../utils/atomic-write.js";

export type ResearchProjectPolicyErrorCode =
  | "INVALID_RESEARCH_POLICY"
  | "POLICY_WIDENS_AUTHORITY";

export class ResearchProjectPolicyError extends Error {
  readonly code: ResearchProjectPolicyErrorCode;

  constructor(
    code: ResearchProjectPolicyErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResearchProjectPolicyError";
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

interface DirectoryPathSnapshot {
  readonly path: string;
  readonly canonicalPath: string;
  readonly identity: FileIdentity;
  readonly followsRoot: boolean;
}

interface DirectoryChain {
  readonly directory: string;
  readonly canonicalDirectory: string;
  readonly canonicalRoot: string;
  readonly snapshots: readonly DirectoryPathSnapshot[];
}

const POLICY_SEGMENTS = [".trellis", "research", "policy.json"] as const;
const POLICY_DIRECTORY_SEGMENTS = POLICY_SEGMENTS.slice(0, -1);

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

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return (
    sameNodeIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

function sameNodeIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return (
    left.dev === right.dev && left.ino === right.ino && left.mode === right.mode
  );
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

function mapPolicyError(error: unknown, message: string): never {
  if (error instanceof ResearchProjectPolicyError) throw error;
  if (error instanceof ResearchProcedurePolicyError) {
    throw new ResearchProjectPolicyError(
      error.code === "POLICY_WIDENS_AUTHORITY"
        ? "POLICY_WIDENS_AUTHORITY"
        : "INVALID_RESEARCH_POLICY",
      message,
      { cause: error },
    );
  }
  throw new ResearchProjectPolicyError("INVALID_RESEARCH_POLICY", message, {
    cause: error,
  });
}

function inspectDirectoryChain(input: {
  readonly root: string;
  readonly create: boolean;
}): DirectoryChain | null {
  const rootPath = path.resolve(input.root);
  const rootStat = fs.statSync(rootPath);
  if (!rootStat.isDirectory())
    throw new Error("Research root is not a directory");
  const canonicalRoot = fs.realpathSync(rootPath);
  const snapshots: DirectoryPathSnapshot[] = [
    {
      path: rootPath,
      canonicalPath: canonicalRoot,
      identity: identity(rootStat),
      followsRoot: true,
    },
  ];
  let current = rootPath;
  let canonicalDirectory = canonicalRoot;
  for (const segment of POLICY_DIRECTORY_SEGMENTS) {
    current = path.join(current, segment);
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (!input.create) return null;
      try {
        fs.mkdirSync(current);
        stat = fs.lstatSync(current);
      } catch (mkdirError) {
        if ((mkdirError as NodeJS.ErrnoException).code !== "EEXIST") {
          throw mkdirError;
        }
        stat = fs.lstatSync(current);
      }
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Research policy path component '${segment}' is invalid`);
    }
    canonicalDirectory = fs.realpathSync(current);
    if (!isContained(canonicalRoot, canonicalDirectory)) {
      throw new Error("Research policy directory escapes project root");
    }
    snapshots.push({
      path: current,
      canonicalPath: canonicalDirectory,
      identity: identity(stat),
      followsRoot: false,
    });
  }
  return {
    directory: current,
    canonicalDirectory,
    canonicalRoot,
    snapshots: Object.freeze(snapshots),
  };
}

function validateDirectoryChain(chain: DirectoryChain): void {
  for (const snapshot of chain.snapshots) {
    const stat = snapshot.followsRoot
      ? fs.statSync(snapshot.path)
      : fs.lstatSync(snapshot.path);
    if (
      !stat.isDirectory() ||
      (!snapshot.followsRoot && stat.isSymbolicLink()) ||
      !sameNodeIdentity(snapshot.identity, identity(stat))
    ) {
      throw new Error("Research policy directory chain changed");
    }
    const canonical = fs.realpathSync(snapshot.path);
    if (
      canonical !== snapshot.canonicalPath ||
      !isContained(chain.canonicalRoot, canonical)
    ) {
      throw new Error("Research policy directory chain changed");
    }
  }
}

function parsePolicyBytes(bytes: Uint8Array): ParsedResearchProjectPolicy {
  try {
    return parseResearchProjectPolicy(bytes);
  } catch (error) {
    mapPolicyError(error, "Research project policy is invalid");
  }
}

function readStablePolicy(chain: DirectoryChain): ParsedResearchProjectPolicy {
  validateDirectoryChain(chain);
  const policyPath = path.join(chain.directory, "policy.json");
  const fileBefore = fs.lstatSync(policyPath);
  if (fileBefore.isSymbolicLink() || !fileBefore.isFile()) {
    throw new Error("Research policy must be a non-symlink regular file");
  }
  const canonicalFile = fs.realpathSync(policyPath);
  if (
    path.dirname(canonicalFile) !== chain.canonicalDirectory ||
    path.basename(canonicalFile) !== "policy.json"
  ) {
    throw new Error("Research policy escapes its directory");
  }
  const bytes = new Uint8Array(fs.readFileSync(policyPath));
  const fileAfter = fs.lstatSync(policyPath);
  if (
    fileAfter.isSymbolicLink() ||
    !fileAfter.isFile() ||
    !sameIdentity(identity(fileBefore), identity(fileAfter)) ||
    fs.realpathSync(policyPath) !== canonicalFile
  ) {
    throw new Error("Research policy changed while it was being read");
  }
  validateDirectoryChain(chain);
  return parsePolicyBytes(bytes);
}

function existingPolicyPath(root: string): string {
  return path.join(path.resolve(root), ...POLICY_SEGMENTS);
}

function removeStagingFileIfUnchanged(
  stagePath: string,
  expected: FileIdentity | undefined,
): void {
  if (expected === undefined) return;
  try {
    const current = fs.lstatSync(stagePath);
    if (
      !current.isSymbolicLink() &&
      current.isFile() &&
      sameNodeIdentity(expected, identity(current))
    ) {
      fs.rmSync(stagePath);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") return;
  }
}

export async function readResearchProjectPolicy(input: {
  readonly root: string;
}): Promise<ParsedResearchProjectPolicy> {
  try {
    const chain = inspectDirectoryChain({ root: input.root, create: false });
    if (chain === null) throw new Error("Research policy is missing");
    return readStablePolicy(chain);
  } catch (error) {
    mapPolicyError(error, "Research project policy is missing or invalid");
  }
}

export async function ensureResearchProjectPolicyForInit(input: {
  readonly root: string;
  readonly dryRun: boolean;
}): Promise<{
  readonly outcome: "existing" | "created" | "would-create";
  readonly policy: ParsedResearchProjectPolicy;
}> {
  const conservative = parsePolicyBytes(
    new TextEncoder().encode(CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON),
  );
  try {
    const existingChain = inspectDirectoryChain({
      root: input.root,
      create: false,
    });
    if (existingChain !== null) {
      try {
        fs.lstatSync(existingPolicyPath(input.root));
        return Object.freeze({
          outcome: "existing" as const,
          policy: readStablePolicy(existingChain),
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }

    if (input.dryRun) {
      return Object.freeze({
        outcome: "would-create" as const,
        policy: conservative,
      });
    }

    const chain = inspectDirectoryChain({ root: input.root, create: true });
    if (chain === null)
      throw new Error("Research policy directory was not created");
    validateDirectoryChain(chain);
    const stagePath = path.join(
      chain.directory,
      `.policy.json.${process.pid}.${randomUUID()}.stage`,
    );
    let stagedIdentity: FileIdentity | undefined;
    try {
      writeFileAtomic(stagePath, CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON);
      const stageStat = fs.lstatSync(stagePath);
      stagedIdentity = identity(stageStat);
      if (stageStat.isSymbolicLink() || !stageStat.isFile()) {
        throw new Error("Research policy staging file is invalid");
      }
      const canonicalStage = fs.realpathSync(stagePath);
      if (path.dirname(canonicalStage) !== chain.canonicalDirectory) {
        throw new Error("Research policy staging file escapes its directory");
      }
      validateDirectoryChain(chain);
      const policyPath = path.join(chain.directory, "policy.json");
      try {
        fs.linkSync(stagePath, policyPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST") {
          validateDirectoryChain(chain);
          return Object.freeze({
            outcome: "existing" as const,
            policy: readStablePolicy(chain),
          });
        }
        throw error;
      }
      validateDirectoryChain(chain);
      const stageAfterPublication = fs.lstatSync(stagePath);
      const publishedStat = fs.lstatSync(policyPath);
      if (
        stageAfterPublication.isSymbolicLink() ||
        !stageAfterPublication.isFile() ||
        !sameNodeIdentity(
          identity(stageStat),
          identity(stageAfterPublication),
        ) ||
        fs.realpathSync(stagePath) !== canonicalStage ||
        publishedStat.isSymbolicLink() ||
        !publishedStat.isFile() ||
        !sameNodeIdentity(
          identity(stageAfterPublication),
          identity(publishedStat),
        ) ||
        fs.realpathSync(policyPath) !==
          path.join(chain.canonicalDirectory, "policy.json")
      ) {
        throw new Error("Research policy publication identity check failed");
      }
      const policy = readStablePolicy(chain);
      return Object.freeze({ outcome: "created" as const, policy });
    } finally {
      removeStagingFileIfUnchanged(stagePath, stagedIdentity);
    }
  } catch (error) {
    mapPolicyError(
      error,
      "Research project policy could not be created or read",
    );
  }
}

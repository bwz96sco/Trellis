import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  serializeMethodologyReportV131Sidecar,
  serializeMethodologyReportV2Sidecar,
  stableResearchJson,
  type MethodologyDeterministicReportV131,
  type MethodologyDeterministicReportV2,
  type Proposal,
  type ResearchActivation,
  type ResearchApprovalState,
  type Result,
} from "@mindfoldhq/trellis-core/research";

import { ResearchDispatchFileError } from "./errors.js";

interface NodeIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly mode: bigint;
}

interface FileIdentity extends NodeIdentity {
  readonly size: bigint;
  readonly mtimeMs: bigint;
  readonly ctimeMs: bigint;
}

interface DirectorySnapshot {
  readonly path: string;
  readonly canonicalPath: string;
  readonly identity: NodeIdentity;
  readonly followsRoot: boolean;
}

interface DirectorySelection {
  readonly rootPath: string;
  readonly canonicalRoot: string;
  readonly directoryPath: string;
  readonly canonicalDirectory: string;
  readonly snapshots: readonly DirectorySnapshot[];
}

type TargetSnapshot =
  | { readonly state: "absent" }
  | { readonly state: "present"; readonly identity: FileIdentity };

function nodeIdentity(stat: fs.BigIntStats): NodeIdentity {
  return { dev: stat.dev, ino: stat.ino, mode: stat.mode };
}

function fileIdentity(stat: fs.BigIntStats): FileIdentity {
  return {
    ...nodeIdentity(stat),
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs,
  };
}

function sameNodeIdentity(left: NodeIdentity, right: NodeIdentity): boolean {
  return (
    left.dev === right.dev && left.ino === right.ino && left.mode === right.mode
  );
}

function sameFileIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return (
    sameNodeIdentity(left, right) &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
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

function validatePathComponent(component: string): void {
  if (
    component.length === 0 ||
    component === "." ||
    component === ".." ||
    component.includes("/") ||
    component.includes("\\") ||
    component.includes("\0")
  ) {
    throw new Error("Research sidecar path component is invalid");
  }
}

function secureDirectory(
  root: string,
  segments: readonly string[],
): DirectorySelection {
  const rootPath = path.resolve(root);
  const rootStat = fs.statSync(rootPath, { bigint: true });
  if (!rootStat.isDirectory()) {
    throw new Error("Research sidecar root must be a directory");
  }
  const canonicalRoot = fs.realpathSync(rootPath);
  const snapshots: DirectorySnapshot[] = [
    {
      path: rootPath,
      canonicalPath: canonicalRoot,
      identity: nodeIdentity(rootStat),
      followsRoot: true,
    },
  ];
  let directoryPath = rootPath;
  let canonicalDirectory = canonicalRoot;

  for (const segment of segments) {
    validatePathComponent(segment);
    directoryPath = path.join(directoryPath, segment);
    let stat: fs.BigIntStats;
    try {
      fs.mkdirSync(directoryPath, { mode: 0o700 });
      stat = fs.lstatSync(directoryPath, { bigint: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      stat = fs.lstatSync(directoryPath, { bigint: true });
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(
        "Research sidecar parent must be a non-symlink directory",
      );
    }
    canonicalDirectory = fs.realpathSync(directoryPath);
    if (!isContained(canonicalRoot, canonicalDirectory)) {
      throw new Error("Research sidecar parent escapes the project root");
    }
    snapshots.push({
      path: directoryPath,
      canonicalPath: canonicalDirectory,
      identity: nodeIdentity(stat),
      followsRoot: false,
    });
  }

  return {
    rootPath,
    canonicalRoot,
    directoryPath,
    canonicalDirectory,
    snapshots: Object.freeze(snapshots),
  };
}

function validateDirectorySelection(selection: DirectorySelection): void {
  for (const snapshot of selection.snapshots) {
    const stat = snapshot.followsRoot
      ? fs.statSync(snapshot.path, { bigint: true })
      : fs.lstatSync(snapshot.path, { bigint: true });
    if (
      !stat.isDirectory() ||
      (!snapshot.followsRoot && stat.isSymbolicLink()) ||
      !sameNodeIdentity(snapshot.identity, nodeIdentity(stat))
    ) {
      throw new Error("Research sidecar directory chain changed");
    }
    const canonicalPath = fs.realpathSync(snapshot.path);
    if (
      canonicalPath !== snapshot.canonicalPath ||
      !isContained(selection.canonicalRoot, canonicalPath)
    ) {
      throw new Error("Research sidecar directory chain changed");
    }
  }
}

function snapshotTarget(
  selection: DirectorySelection,
  targetPath: string,
  fileName: string,
): TargetSnapshot {
  let stat: fs.BigIntStats;
  try {
    stat = fs.lstatSync(targetPath, { bigint: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { state: "absent" };
    }
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error("Research sidecar target is not a regular file");
  }
  const canonicalPath = fs.realpathSync(targetPath);
  if (
    canonicalPath !== path.join(selection.canonicalDirectory, fileName) ||
    !isContained(selection.canonicalDirectory, canonicalPath)
  ) {
    throw new Error("Research sidecar target escapes its directory");
  }
  return { state: "present", identity: fileIdentity(stat) };
}

function validateTargetSnapshot(
  selection: DirectorySelection,
  targetPath: string,
  fileName: string,
  expected: TargetSnapshot,
): void {
  const current = snapshotTarget(selection, targetPath, fileName);
  if (expected.state === "absent") {
    if (current.state !== "absent") {
      throw new Error("Research sidecar target changed before publication");
    }
    return;
  }
  if (
    current.state !== "present" ||
    !sameFileIdentity(expected.identity, current.identity)
  ) {
    throw new Error("Research sidecar target changed before publication");
  }
}

function validateStagePath(
  selection: DirectorySelection,
  stagePath: string,
  expected: NodeIdentity,
  expectedSize: bigint,
): void {
  const stat = fs.lstatSync(stagePath, { bigint: true });
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    !sameNodeIdentity(expected, nodeIdentity(stat)) ||
    stat.size !== expectedSize
  ) {
    throw new Error("Research sidecar staging file changed");
  }
  if (
    fs.realpathSync(stagePath) !==
    path.join(selection.canonicalDirectory, path.basename(stagePath))
  ) {
    throw new Error("Research sidecar staging file escapes its directory");
  }
}

function writeAll(fd: number, bytes: Buffer): void {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(fd, bytes, offset, bytes.length - offset);
    if (written <= 0) {
      throw new Error("Research sidecar staging write made no progress");
    }
    offset += written;
  }
}

function readStableTarget(
  selection: DirectorySelection,
  targetPath: string,
  fileName: string,
): { readonly identity: FileIdentity; readonly bytes: Buffer } {
  validateDirectorySelection(selection);
  const before = snapshotTarget(selection, targetPath, fileName);
  if (before.state !== "present") {
    throw new Error("Research sidecar target is missing");
  }
  const bytes = fs.readFileSync(targetPath);
  const after = snapshotTarget(selection, targetPath, fileName);
  if (
    after.state !== "present" ||
    !sameFileIdentity(before.identity, after.identity)
  ) {
    throw new Error("Research sidecar target changed while it was read");
  }
  validateDirectorySelection(selection);
  return { identity: after.identity, bytes };
}

function validatePublishedTarget(
  selection: DirectorySelection,
  targetPath: string,
  fileName: string,
  stagedIdentity: NodeIdentity,
  expectedBytes: Buffer,
): void {
  const published = readStableTarget(selection, targetPath, fileName);
  if (
    !sameNodeIdentity(stagedIdentity, published.identity) ||
    published.identity.size !== BigInt(expectedBytes.length) ||
    !published.bytes.equals(expectedBytes)
  ) {
    throw new Error("Research sidecar publication verification failed");
  }
}

function isEquivalentWinner(
  selection: DirectorySelection,
  targetPath: string,
  fileName: string,
  expectedBytes: Buffer,
): boolean {
  const winner = readStableTarget(selection, targetPath, fileName);
  return (
    winner.identity.size === BigInt(expectedBytes.length) &&
    winner.bytes.equals(expectedBytes)
  );
}

function cleanupStage(
  selection: DirectorySelection,
  stagePath: string,
  expected: NodeIdentity | undefined,
): void {
  if (expected === undefined) return;
  try {
    validateDirectorySelection(selection);
    const stat = fs.lstatSync(stagePath, { bigint: true });
    if (
      stat.isSymbolicLink() ||
      !stat.isFile() ||
      !sameNodeIdentity(expected, nodeIdentity(stat))
    ) {
      return;
    }
    fs.unlinkSync(stagePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") return;
  }
}

function writeSidecar(input: {
  readonly root: string;
  readonly headSeq: number;
  readonly segments: readonly string[];
  readonly fileName: string;
  readonly value?: unknown;
  /** Additive CS5-4: pre-serialized canonical bytes (e.g. report-v2). */
  readonly preSerialized?: string;
  readonly recovery: string;
}): string {
  if (input.value === undefined && input.preSerialized === undefined) {
    throw new Error("Research sidecar requires value or preSerialized bytes");
  }
  const target = path.join(input.root, ...input.segments, input.fileName);
  try {
    validatePathComponent(input.fileName);
    const selection = secureDirectory(input.root, input.segments);
    const targetPath = path.join(selection.directoryPath, input.fileName);
    validateDirectorySelection(selection);
    const targetBefore = snapshotTarget(selection, targetPath, input.fileName);
    const bytes =
      input.preSerialized !== undefined
        ? Buffer.from(input.preSerialized, "utf8")
        : Buffer.from(stableResearchJson(input.value), "utf8");
    const stageName = `.${input.fileName}.${process.pid}.${randomUUID()}.stage`;
    const stagePath = path.join(selection.directoryPath, stageName);
    const noFollow =
      typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0;
    let fd: number | undefined;
    let stagedIdentity: NodeIdentity | undefined;
    try {
      fd = fs.openSync(
        stagePath,
        fs.constants.O_CREAT |
          fs.constants.O_EXCL |
          fs.constants.O_WRONLY |
          noFollow,
        0o600,
      );
      const opened = fs.fstatSync(fd, { bigint: true });
      if (!opened.isFile()) {
        throw new Error("Research sidecar staging descriptor is not a file");
      }
      stagedIdentity = nodeIdentity(opened);
      validateDirectorySelection(selection);
      validateStagePath(selection, stagePath, stagedIdentity, 0n);

      writeAll(fd, bytes);
      fs.fsyncSync(fd);
      const written = fs.fstatSync(fd, { bigint: true });
      if (
        !written.isFile() ||
        !sameNodeIdentity(stagedIdentity, nodeIdentity(written)) ||
        written.size !== BigInt(bytes.length)
      ) {
        throw new Error("Research sidecar staging descriptor changed");
      }
      validateDirectorySelection(selection);
      validateStagePath(
        selection,
        stagePath,
        stagedIdentity,
        BigInt(bytes.length),
      );
      validateDirectorySelection(selection);
      try {
        validateTargetSnapshot(
          selection,
          targetPath,
          input.fileName,
          targetBefore,
        );
      } catch (error) {
        if (
          targetBefore.state !== "present" ||
          !isEquivalentWinner(selection, targetPath, input.fileName, bytes)
        ) {
          throw error;
        }
        return path.relative(input.root, target).split(path.sep).join("/");
      }

      if (process.platform === "win32") {
        fs.closeSync(fd);
        fd = undefined;
        validateDirectorySelection(selection);
        validateStagePath(
          selection,
          stagePath,
          stagedIdentity,
          BigInt(bytes.length),
        );
        validateTargetSnapshot(
          selection,
          targetPath,
          input.fileName,
          targetBefore,
        );
      }

      if (targetBefore.state === "absent") {
        try {
          fs.linkSync(stagePath, targetPath);
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code !== "EEXIST" ||
            !isEquivalentWinner(selection, targetPath, input.fileName, bytes)
          ) {
            throw error;
          }
          return path.relative(input.root, target).split(path.sep).join("/");
        }
      } else {
        fs.renameSync(stagePath, targetPath);
      }

      validatePublishedTarget(
        selection,
        targetPath,
        input.fileName,
        stagedIdentity,
        bytes,
      );
      if (fd !== undefined) {
        fs.closeSync(fd);
        fd = undefined;
      }
    } finally {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch {
          // The committed ledger remains authoritative; cleanup below is best effort.
        }
      }
      cleanupStage(selection, stagePath, stagedIdentity);
    }
  } catch (error) {
    throw new ResearchDispatchFileError(
      input.headSeq,
      path.relative(input.root, target).split(path.sep).join("/"),
      input.recovery,
      error,
    );
  }
  return path.relative(input.root, target).split(path.sep).join("/");
}

export function materializeResearchActivation(input: {
  readonly root: string;
  readonly headSeq: number;
  readonly activation: ResearchActivation;
  readonly recovery: string;
}): string {
  return writeSidecar({
    ...input,
    segments: [
      ".trellis",
      "research",
      "dispatches",
      input.activation.dispatchId,
    ],
    fileName: "activation.json",
    value: { schemaVersion: 2, activation: input.activation },
  });
}

export function materializeResearchApproval(input: {
  readonly root: string;
  readonly headSeq: number;
  readonly approval: ResearchApprovalState;
  readonly recovery: string;
}): string {
  return writeSidecar({
    ...input,
    segments: [
      ".trellis",
      "research",
      "dispatches",
      input.approval.grant.dispatchId,
      "approvals",
    ],
    fileName: `${input.approval.grant.id}.json`,
    value: { schemaVersion: 2, approval: input.approval },
  });
}

export function materializeResearchResult(input: {
  readonly root: string;
  readonly headSeq: number;
  readonly result: Result;
  readonly recovery: string;
}): string {
  return writeSidecar({
    ...input,
    segments: [".trellis", "research", "dispatches", input.result.dispatchId],
    fileName: "result.json",
    value: input.result,
  });
}

export function materializeResearchProposal(input: {
  readonly root: string;
  readonly headSeq: number;
  readonly proposal: Proposal;
  readonly recovery: string;
}): string {
  return writeSidecar({
    ...input,
    segments: [".trellis", "research", "dispatches", input.proposal.dispatchId],
    fileName: "proposal.json",
    value: input.proposal,
  });
}

/**
 * CS5-4: report-v2 is a recoverable projection published through the existing
 * hardened sidecar interface (containment, non-symlink directory chain,
 * staging/target identity checks, complete write + fsync, atomic publication,
 * post-publication verification, equivalent-winner handling, cleanup). The
 * sidecar bytes are the methodology-local canonical serialization; the digest
 * body itself has no trailing LF.
 */
export function materializeMethodologyReportV2Sidecar(
  input: {
    readonly root: string;
    readonly headSeq: number;
    readonly dispatchId: string;
    readonly recovery: string;
  } & (
    | {
        readonly reportV2: MethodologyDeterministicReportV2;
        readonly reportV131?: never;
      }
    | {
        readonly reportV2?: never;
        readonly reportV131: Readonly<{
          readonly report: MethodologyDeterministicReportV131;
          readonly reportDigest: string;
        }>;
      }
  ),
): string {
  let preSerialized: string;
  try {
    preSerialized =
      input.reportV131 === undefined
        ? serializeMethodologyReportV2Sidecar(input.reportV2)
        : serializeMethodologyReportV131Sidecar(input.reportV131);
  } catch (error) {
    throw new ResearchDispatchFileError(
      input.headSeq,
      `.trellis/research/dispatches/${input.dispatchId}/methodology-report-v2.json`,
      input.recovery,
      error,
    );
  }
  return writeSidecar({
    root: input.root,
    headSeq: input.headSeq,
    segments: [".trellis", "research", "dispatches", input.dispatchId],
    fileName: "methodology-report-v2.json",
    preSerialized,
    recovery: input.recovery,
  });
}

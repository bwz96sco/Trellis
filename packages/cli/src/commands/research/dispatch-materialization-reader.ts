import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  approvalIdSchema,
  dispatchSchema,
  researchActivationSchema,
  researchApprovalStateSchema,
  stableResearchJson,
  type ApprovalId,
  type Dispatch,
  type DispatchId,
  type ResearchActivation,
  type ResearchApprovalState,
} from "@mindfoldhq/trellis-core/research";

export type ResearchDispatchMaterializationKind =
  | "request"
  | "activation"
  | "approval";

export type ReadResearchDispatchMaterializationOptions =
  | {
      readonly root: string;
      readonly dispatchId: DispatchId;
      readonly kind: "request";
      readonly expected: Dispatch;
    }
  | {
      readonly root: string;
      readonly dispatchId: DispatchId;
      readonly kind: "activation";
      readonly expected: ResearchActivation;
    }
  | {
      readonly root: string;
      readonly dispatchId: DispatchId;
      readonly kind: "approval";
      readonly approvalId: ApprovalId;
      readonly expected: ResearchApprovalState;
    };

export type ReadResearchDispatchMaterializationResult =
  | {
      readonly kind: "request";
      readonly path: string;
      readonly bytes: Uint8Array;
      readonly value: Dispatch;
    }
  | {
      readonly kind: "activation";
      readonly path: string;
      readonly bytes: Uint8Array;
      readonly value: ResearchActivation;
    }
  | {
      readonly kind: "approval";
      readonly path: string;
      readonly bytes: Uint8Array;
      readonly value: ResearchApprovalState;
    };

export class ResearchDispatchMaterializationReadError extends Error {
  readonly kind: ResearchDispatchMaterializationKind;
  readonly target: string;

  constructor(
    kind: ResearchDispatchMaterializationKind,
    target: string,
    cause: unknown,
  ) {
    super(`Research Dispatch ${kind} materialization '${target}' is invalid`, {
      cause,
    });
    this.name = "ResearchDispatchMaterializationReadError";
    this.kind = kind;
    this.target = target;
  }
}

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

function validateComponent(component: string): void {
  if (
    component.length === 0 ||
    component === "." ||
    component === ".." ||
    component.includes("/") ||
    component.includes("\\") ||
    component.includes("\0")
  ) {
    throw new Error("Research materialization path component is invalid");
  }
}

function selectExistingDirectoryChain(
  root: string,
  segments: readonly string[],
): {
  readonly canonicalRoot: string;
  readonly directoryPath: string;
  readonly canonicalDirectory: string;
  readonly snapshots: readonly DirectorySnapshot[];
} {
  const rootPath = path.resolve(root);
  const rootStat = fs.statSync(rootPath, { bigint: true });
  if (!rootStat.isDirectory()) {
    throw new Error("Research materialization root must be a directory");
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
    validateComponent(segment);
    directoryPath = path.join(directoryPath, segment);
    const stat = fs.lstatSync(directoryPath, { bigint: true });
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(
        "Research materialization parent must be a non-symlink directory",
      );
    }
    canonicalDirectory = fs.realpathSync(directoryPath);
    if (!isContained(canonicalRoot, canonicalDirectory)) {
      throw new Error("Research materialization parent escapes the root");
    }
    snapshots.push({
      path: directoryPath,
      canonicalPath: canonicalDirectory,
      identity: nodeIdentity(stat),
      followsRoot: false,
    });
  }
  return {
    canonicalRoot,
    directoryPath,
    canonicalDirectory,
    snapshots: Object.freeze(snapshots),
  };
}

function validateDirectoryChain(
  canonicalRoot: string,
  snapshots: readonly DirectorySnapshot[],
): void {
  for (const snapshot of snapshots) {
    const stat = snapshot.followsRoot
      ? fs.statSync(snapshot.path, { bigint: true })
      : fs.lstatSync(snapshot.path, { bigint: true });
    if (
      !stat.isDirectory() ||
      (!snapshot.followsRoot && stat.isSymbolicLink()) ||
      !sameNodeIdentity(snapshot.identity, nodeIdentity(stat))
    ) {
      throw new Error("Research materialization directory chain changed");
    }
    const canonicalPath = fs.realpathSync(snapshot.path);
    if (
      canonicalPath !== snapshot.canonicalPath ||
      !isContained(canonicalRoot, canonicalPath)
    ) {
      throw new Error("Research materialization directory chain changed");
    }
  }
}

function readStableFile(input: {
  readonly root: string;
  readonly segments: readonly string[];
  readonly fileName: string;
}): { readonly path: string; readonly bytes: Buffer } {
  validateComponent(input.fileName);
  const selected = selectExistingDirectoryChain(input.root, input.segments);
  validateDirectoryChain(selected.canonicalRoot, selected.snapshots);
  const targetPath = path.join(selected.directoryPath, input.fileName);
  const before = fs.lstatSync(targetPath, { bigint: true });
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error(
      "Research materialization target must be a regular non-symlink file",
    );
  }
  const canonicalTarget = fs.realpathSync(targetPath);
  if (
    canonicalTarget !==
      path.join(selected.canonicalDirectory, input.fileName) ||
    !isContained(selected.canonicalRoot, canonicalTarget)
  ) {
    throw new Error("Research materialization target escapes its directory");
  }
  const expectedIdentity = fileIdentity(before);
  const noFollow =
    typeof fs.constants.O_NOFOLLOW === "number" ? fs.constants.O_NOFOLLOW : 0;
  const descriptor = fs.openSync(targetPath, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(descriptor, { bigint: true });
    if (
      !opened.isFile() ||
      !sameFileIdentity(expectedIdentity, fileIdentity(opened))
    ) {
      throw new Error("Research materialization changed before it was read");
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor, { bigint: true });
    const finalPathStat = fs.lstatSync(targetPath, { bigint: true });
    if (
      !after.isFile() ||
      finalPathStat.isSymbolicLink() ||
      !finalPathStat.isFile() ||
      !sameFileIdentity(fileIdentity(opened), fileIdentity(after)) ||
      !sameFileIdentity(fileIdentity(after), fileIdentity(finalPathStat)) ||
      fs.realpathSync(targetPath) !== canonicalTarget
    ) {
      throw new Error("Research materialization changed while it was read");
    }
    validateDirectoryChain(selected.canonicalRoot, selected.snapshots);
    return { path: targetPath, bytes };
  } finally {
    fs.closeSync(descriptor);
  }
}

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function parseCanonicalJson(bytes: Buffer): unknown {
  const text = UTF8_DECODER.decode(bytes);
  const value = JSON.parse(text) as unknown;
  if (stableResearchJson(value) !== text) {
    throw new Error("Research materialization JSON is not canonical");
  }
  return value;
}

const DISPATCH_ID =
  /^dsp_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dispatchSegments(dispatchId: DispatchId): readonly string[] {
  if (!DISPATCH_ID.test(dispatchId)) {
    throw new Error("dispatch ID must be a dsp_ prefixed UUID");
  }
  return [".trellis", "research", "dispatches", dispatchId];
}

export function readResearchContainedFile(
  root: string,
  target: string,
): Uint8Array {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (
    relative.length === 0 ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      "Research input path must be a file inside the control root",
    );
  }
  const components = relative.split(path.sep);
  const fileName = components.at(-1);
  if (fileName === undefined) {
    throw new Error("Research input path must identify a file");
  }
  return readStableFile({
    root: resolvedRoot,
    segments: components.slice(0, -1),
    fileName,
  }).bytes;
}

export function readResearchDispatchMaterialization(
  options: ReadResearchDispatchMaterializationOptions,
): ReadResearchDispatchMaterializationResult {
  const target = path.join(
    options.root,
    ...dispatchSegments(options.dispatchId),
    ...(options.kind === "approval"
      ? ["approvals", `${options.approvalId}.json`]
      : [options.kind === "request" ? "request.json" : "activation.json"]),
  );
  try {
    if (options.kind === "request") {
      const read = readStableFile({
        root: options.root,
        segments: dispatchSegments(options.dispatchId),
        fileName: "request.json",
      });
      const value = dispatchSchema.parse(parseCanonicalJson(read.bytes));
      if (
        value.id !== options.dispatchId ||
        !isDeepStrictEqual(value, options.expected)
      ) {
        throw new Error(
          "Research request materialization differs from canonical state",
        );
      }
      return { kind: "request", path: read.path, bytes: read.bytes, value };
    }
    if (options.kind === "activation") {
      const read = readStableFile({
        root: options.root,
        segments: dispatchSegments(options.dispatchId),
        fileName: "activation.json",
      });
      const envelope = parseCanonicalJson(read.bytes);
      if (
        typeof envelope !== "object" ||
        envelope === null ||
        Array.isArray(envelope) ||
        Object.keys(envelope).length !== 2 ||
        !("schemaVersion" in envelope) ||
        !("activation" in envelope) ||
        envelope.schemaVersion !== 2
      ) {
        throw new Error(
          "Research activation materialization envelope is invalid",
        );
      }
      const value = researchActivationSchema.parse(envelope.activation);
      if (
        value.dispatchId !== options.dispatchId ||
        !isDeepStrictEqual(value, options.expected)
      ) {
        throw new Error(
          "Research activation materialization differs from canonical state",
        );
      }
      return { kind: "activation", path: read.path, bytes: read.bytes, value };
    }
    const approvalId = approvalIdSchema.parse(options.approvalId);
    const read = readStableFile({
      root: options.root,
      segments: [...dispatchSegments(options.dispatchId), "approvals"],
      fileName: `${approvalId}.json`,
    });
    const envelope = parseCanonicalJson(read.bytes);
    if (
      typeof envelope !== "object" ||
      envelope === null ||
      Array.isArray(envelope) ||
      Object.keys(envelope).length !== 2 ||
      !("schemaVersion" in envelope) ||
      !("approval" in envelope) ||
      envelope.schemaVersion !== 2
    ) {
      throw new Error("Research approval materialization envelope is invalid");
    }
    const value = researchApprovalStateSchema.parse(envelope.approval);
    if (
      value.grant.id !== approvalId ||
      value.grant.dispatchId !== options.dispatchId ||
      !isDeepStrictEqual(value, options.expected)
    ) {
      throw new Error(
        "Research approval materialization differs from canonical state",
      );
    }
    return { kind: "approval", path: read.path, bytes: read.bytes, value };
  } catch (error) {
    if (error instanceof ResearchDispatchMaterializationReadError) throw error;
    throw new ResearchDispatchMaterializationReadError(
      options.kind,
      path.relative(options.root, target).split(path.sep).join("/"),
      error,
    );
  }
}

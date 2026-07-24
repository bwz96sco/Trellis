import { createHash } from "node:crypto";
import path from "node:path";

import {
  normalizeArtifactPath,
  normalizeRepositoryLocator,
} from "./artifacts.js";
import { stableResearchJson } from "./projections.js";
import { dispatchSchema } from "./schema.js";
import type {
  ArtifactId,
  Dispatch,
  DispatchId,
  RepositoryId,
} from "./types.js";

const REQUEST_DIGEST_DOMAIN =
  "trellis-research-dispatch-request-digest-v1\0";
const SCOPE_HASH_DOMAIN = "trellis-research-dispatch-scope-hash-v1\0";

export interface NormalizedDispatchScopeV1 {
  readonly schemaVersion: 1;
  readonly dispatchId: DispatchId;
  readonly repository: Readonly<{
    readonly id: RepositoryId;
    readonly resolvedRoot: string;
    readonly locator: string;
    readonly expectedRemote?: string;
    readonly observedRemote?: string;
    readonly headRevision?: string;
  }>;
  readonly artifacts: readonly Readonly<{
    readonly id: ArtifactId;
    readonly repositoryId: RepositoryId;
    readonly path: string;
    readonly resolvedPath: string;
    readonly revision?: string;
    readonly sha256?: string;
  }>[];
  readonly allowedWritePaths: readonly Readonly<{
    readonly declaredPath: string;
    readonly resolvedPath: string;
  }>[];
}

function sha256(domain: string, value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(domain, "utf8")
    .update(stableResearchJson(value), "utf8")
    .digest("hex")}`;
}

function plainObject(value: unknown, name: string): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new Error(`${name} must be a plain JSON object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  name: string,
): void {
  for (const key of Object.keys(value)) {
    if (!required.includes(key) && !optional.includes(key)) {
      throw new Error(`${name}.${key} is not supported`);
    }
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`${name}.${key} is required`);
  }
}

function string(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function researchId(
  value: unknown,
  name: string,
  prefix: "art" | "dsp" | "rep",
): string {
  const parsed = string(value, name);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!parsed.startsWith(`${prefix}_`) || !uuid.test(parsed.slice(prefix.length + 1))) {
    throw new Error(`${name} must be a ${prefix}_ prefixed UUID`);
  }
  return parsed;
}

function optionalString(value: unknown, name: string): string | undefined {
  return value === undefined ? undefined : string(value, name);
}

function machinePath(value: unknown, name: string): string {
  const input = string(value, name);
  const portable = input.replaceAll("\\", "/");
  const windows = /^([A-Za-z]):\/(.*)$/.exec(portable);
  let normalized: string;
  if (windows) {
    const drive = windows[1]?.toLowerCase();
    normalized = `${drive}:/${path.posix.normalize(`/${windows[2] ?? ""}`).slice(1)}`;
  } else {
    if (!portable.startsWith("/")) throw new Error(`${name} must be absolute`);
    normalized = path.posix.normalize(portable);
  }
  if (normalized.length > 1 && !/^[a-z]:\/$/.test(normalized)) {
    normalized = normalized.replace(/\/+$/, "");
  }
  return normalized;
}

function portablePath(value: unknown, name: string): string {
  return normalizeArtifactPath(string(value, name));
}

function portableLocator(value: unknown, name: string): string {
  try {
    return normalizeRepositoryLocator(string(value, name));
  } catch (error) {
    throw new Error(`${name} must be a portable POSIX locator`, { cause: error });
  }
}

function artifactDigest(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  const parsed = string(value, name);
  if (!/^[0-9a-f]{64}$/.test(parsed)) {
    throw new Error(`${name} must contain 64 lowercase hexadecimal characters`);
  }
  return parsed;
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = [...left];
  const rightPoints = [...right];
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const leftPoint = leftPoints[index]?.codePointAt(0) ?? 0;
    const rightPoint = rightPoints[index]?.codePointAt(0) ?? 0;
    if (leftPoint !== rightPoint) return leftPoint - rightPoint;
  }
  return leftPoints.length - rightPoints.length;
}

function normalizeScope(scope: NormalizedDispatchScopeV1): NormalizedDispatchScopeV1 {
  const value = plainObject(scope, "scope");
  exactKeys(
    value,
    ["schemaVersion", "dispatchId", "repository", "artifacts", "allowedWritePaths"],
    [],
    "scope",
  );
  if (value.schemaVersion !== 1) throw new Error("scope.schemaVersion must be 1");

  const repository = plainObject(value.repository, "scope.repository");
  exactKeys(
    repository,
    ["id", "resolvedRoot", "locator"],
    ["expectedRemote", "observedRemote", "headRevision"],
    "scope.repository",
  );
  const normalizedRepository = Object.freeze({
    id: researchId(repository.id, "scope.repository.id", "rep") as RepositoryId,
    resolvedRoot: machinePath(
      repository.resolvedRoot,
      "scope.repository.resolvedRoot",
    ),
    locator: portableLocator(repository.locator, "scope.repository.locator"),
    ...(optionalString(repository.expectedRemote, "scope.repository.expectedRemote") ===
    undefined
      ? {}
      : { expectedRemote: repository.expectedRemote as string }),
    ...(optionalString(repository.observedRemote, "scope.repository.observedRemote") ===
    undefined
      ? {}
      : { observedRemote: repository.observedRemote as string }),
    ...(optionalString(repository.headRevision, "scope.repository.headRevision") ===
    undefined
      ? {}
      : { headRevision: repository.headRevision as string }),
  });

  if (!Array.isArray(value.artifacts)) {
    throw new Error("scope.artifacts must be an array");
  }
  const artifactIds = new Set<string>();
  const artifacts = value.artifacts.map((input, index) => {
    const artifact = plainObject(input, `scope.artifacts[${index}]`);
    exactKeys(
      artifact,
      ["id", "repositoryId", "path", "resolvedPath"],
      ["revision", "sha256"],
      `scope.artifacts[${index}]`,
    );
    const id = researchId(
      artifact.id,
      `scope.artifacts[${index}].id`,
      "art",
    ) as ArtifactId;
    if (artifactIds.has(id)) throw new Error("scope.artifacts contains duplicate IDs");
    artifactIds.add(id);
    return Object.freeze({
      id,
      repositoryId: researchId(
        artifact.repositoryId,
        `scope.artifacts[${index}].repositoryId`,
        "rep",
      ) as RepositoryId,
      path: portablePath(artifact.path, `scope.artifacts[${index}].path`),
      resolvedPath: machinePath(
        artifact.resolvedPath,
        `scope.artifacts[${index}].resolvedPath`,
      ),
      ...(optionalString(artifact.revision, `scope.artifacts[${index}].revision`) ===
      undefined
        ? {}
        : { revision: artifact.revision as string }),
      ...(artifactDigest(artifact.sha256, `scope.artifacts[${index}].sha256`) ===
      undefined
        ? {}
        : { sha256: artifact.sha256 as string }),
    });
  });

  if (!Array.isArray(value.allowedWritePaths)) {
    throw new Error("scope.allowedWritePaths must be an array");
  }
  const writes = new Map<string, { declaredPath: string; resolvedPath: string }>();
  value.allowedWritePaths.forEach((input, index) => {
    const write = plainObject(input, `scope.allowedWritePaths[${index}]`);
    exactKeys(
      write,
      ["declaredPath", "resolvedPath"],
      [],
      `scope.allowedWritePaths[${index}]`,
    );
    const normalized = Object.freeze({
      declaredPath: portablePath(
        write.declaredPath,
        `scope.allowedWritePaths[${index}].declaredPath`,
      ),
      resolvedPath: machinePath(
        write.resolvedPath,
        `scope.allowedWritePaths[${index}].resolvedPath`,
      ),
    });
    writes.set(`${normalized.declaredPath}\0${normalized.resolvedPath}`, normalized);
  });
  const allowedWritePaths = [...writes.values()].sort((left, right) => {
    const declaredOrder = compareCodePoints(
      left.declaredPath,
      right.declaredPath,
    );
    return declaredOrder === 0
      ? compareCodePoints(left.resolvedPath, right.resolvedPath)
      : declaredOrder;
  });

  return Object.freeze({
    schemaVersion: 1,
    dispatchId: researchId(
      value.dispatchId,
      "scope.dispatchId",
      "dsp",
    ) as DispatchId,
    repository: normalizedRepository,
    artifacts: Object.freeze(artifacts),
    allowedWritePaths: Object.freeze(allowedWritePaths),
  });
}

export function digestDispatchRequest(dispatch: Dispatch): string {
  return sha256(REQUEST_DIGEST_DOMAIN, dispatchSchema.parse(dispatch));
}

export function hashDispatchScope(scope: NormalizedDispatchScopeV1): string {
  return sha256(SCOPE_HASH_DOMAIN, normalizeScope(scope));
}

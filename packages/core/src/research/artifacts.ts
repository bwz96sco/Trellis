import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { ArtifactRef, Repository } from "./types.js";

function normalizeTrackedPath(
  input: string,
  options: { allowParent: boolean; label: string },
): string {
  if (input.length === 0) throw new Error(`${options.label} must not be empty`);
  if (input.includes("\0")) throw new Error(`${options.label} must not contain NUL`);
  if (input.includes("\\")) {
    throw new Error(`${options.label} must use POSIX '/' separators`);
  }
  if (path.posix.isAbsolute(input) || /^[A-Za-z]:/.test(input)) {
    throw new Error(`${options.label} must be a relative tracked path`);
  }
  if (input.split("/").some((segment) => segment.length === 0)) {
    throw new Error(`${options.label} must not contain empty path segments`);
  }
  const normalized = path.posix.normalize(input);
  if (normalized === "." || normalized.length === 0) {
    throw new Error(`${options.label} must identify a tracked path`);
  }
  if (
    !options.allowParent &&
    (normalized === ".." || normalized.startsWith("../"))
  ) {
    throw new Error(`${options.label} must not escape the repository root`);
  }
  return normalized;
}

export function normalizeRepositoryLocator(input: string): string {
  return normalizeTrackedPath(input, {
    allowParent: true,
    label: "repository locator",
  });
}

export function normalizeArtifactPath(input: string): string {
  return normalizeTrackedPath(input, {
    allowParent: false,
    label: "artifact path",
  });
}

export function resolveArtifactPath(
  root: string,
  repository: Repository,
  artifact: ArtifactRef,
): string {
  if (artifact.repositoryId !== repository.id) {
    throw new Error(
      `Artifact '${artifact.id}' does not belong to repository '${repository.id}'`,
    );
  }
  const repositoryRoot = path.resolve(
    root,
    ...normalizeRepositoryLocator(repository.locator).split("/"),
  );
  const artifactPath = path.resolve(
    repositoryRoot,
    ...normalizeArtifactPath(artifact.path).split("/"),
  );
  const relative = path.relative(repositoryRoot, artifactPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error(`Artifact '${artifact.id}' escapes repository '${repository.id}'`);
  }
  if (!fs.existsSync(artifactPath)) return artifactPath;
  const canonicalRepositoryRoot = fs.realpathSync(repositoryRoot);
  const canonicalArtifactPath = fs.realpathSync(artifactPath);
  const canonicalRelative = path.relative(
    canonicalRepositoryRoot,
    canonicalArtifactPath,
  );
  if (
    canonicalRelative === ".." ||
    canonicalRelative.startsWith(`..${path.sep}`)
  ) {
    throw new Error(`Artifact '${artifact.id}' escapes repository '${repository.id}'`);
  }
  return canonicalArtifactPath;
}

export function verifyArtifactSha256(
  root: string,
  repository: Repository,
  artifact: ArtifactRef,
  repositoryRoot?: string,
): boolean {
  if (artifact.sha256 === undefined) return true;
  if (artifact.repositoryId !== repository.id) {
    throw new Error(
      `Artifact '${artifact.id}' does not belong to repository '${repository.id}'`,
    );
  }
  if (repositoryRoot !== undefined && !path.isAbsolute(repositoryRoot)) {
    throw new Error("artifact repository root override must be absolute");
  }
  const resolvedRoot = repositoryRoot ?? path.resolve(
    root,
    ...normalizeRepositoryLocator(repository.locator).split("/"),
  );
  const artifactPath = path.resolve(
    resolvedRoot,
    ...normalizeArtifactPath(artifact.path).split("/"),
  );
  const canonicalRoot = fs.realpathSync(resolvedRoot);
  const canonicalArtifactPath = fs.realpathSync(artifactPath);
  const relative = path.relative(canonicalRoot, canonicalArtifactPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error(`Artifact '${artifact.id}' escapes repository '${repository.id}'`);
  }
  const data = fs.readFileSync(canonicalArtifactPath);
  return createHash("sha256").update(data).digest("hex") === artifact.sha256;
}

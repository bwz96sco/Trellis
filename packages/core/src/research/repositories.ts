import path from "node:path";

import { normalizeRepositoryLocator } from "./artifacts.js";
import type { ArtifactRef, Repository, RepositoryId } from "./types.js";

export function resolveRepositoryPath(root: string, repository: Repository): string {
  return path.resolve(root, normalizeRepositoryLocator(repository.locator));
}

export function requireRepository(
  repositories: Readonly<Record<RepositoryId, Repository>>,
  repositoryId: RepositoryId,
): Repository {
  const repository = repositories[repositoryId];
  if (!repository) throw new Error(`Unknown research repository '${repositoryId}'`);
  return repository;
}

export function validateArtifactRepositories(
  artifacts: readonly ArtifactRef[],
  repositories: Readonly<Record<RepositoryId, Repository>>,
): void {
  for (const artifact of artifacts) {
    requireRepository(repositories, artifact.repositoryId);
  }
}

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  digestDispatchRequest,
  evaluateResearchAutomaticEligibility,
  hashDispatchScope,
  normalizeArtifactPath,
  resolveResearchEffectiveAuthority,
  type ArtifactRef,
  type Dispatch,
  type NormalizedDispatchScopeV1,
  type ParsedResearchProcedure,
  type ResearchActivation,
  type ResearchAutomaticEligibility,
  type ResearchEffectiveAuthority,
  type ResearchState,
} from "@mindfoldhq/trellis-core/research";

import { ResearchActivationError } from "./errors.js";
import { readResearchProjectPolicy } from "./project-policy.js";
import { resolveResearchProcedure } from "./procedure-resolution.js";
import {
  resolveResearchRepositoryContext,
  type ResearchRepositoryContextResolution,
} from "./repository.js";

export interface StagedDispatchRevalidation {
  readonly state: ResearchState;
  readonly dispatch: Dispatch;
  readonly authority: ResearchEffectiveAuthority;
  readonly procedure: ParsedResearchProcedure;
  readonly automaticEligibility: ResearchAutomaticEligibility;
  readonly policyDigest: string;
  readonly requestDigest: string;
  readonly scopeHash: string;
  readonly scope: NormalizedDispatchScopeV1;
  readonly repository: ResearchRepositoryContextResolution;
}

function fail(
  code: ConstructorParameters<typeof ResearchActivationError>[0],
  message: string,
  cause?: unknown,
): never {
  throw new ResearchActivationError(code, message, { cause });
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

function resolveContainedPath(
  repositoryRoot: string,
  declaredPath: string,
  requireFile: boolean,
  code: "ARTIFACT_INVALID" | "WRITE_SCOPE_INVALID",
): string {
  let portable: string;
  try {
    portable = normalizeArtifactPath(declaredPath);
  } catch (error) {
    throw new ResearchActivationError(code, "Repository path is not portable", {
      cause: error,
    });
  }
  const root = fs.realpathSync(repositoryRoot);
  const lexical = path.resolve(root, ...portable.split("/"));
  if (!isContained(root, lexical))
    fail(code, "Repository path escapes its root");
  if (requireFile && !fs.existsSync(lexical)) {
    fail(code, `Artifact '${portable}' does not exist`);
  }
  let ancestor = lexical;
  while (ancestor !== root && !fs.existsSync(ancestor)) {
    ancestor = path.dirname(ancestor);
  }
  const canonicalAncestor = fs.realpathSync(ancestor);
  const resolved = path.resolve(
    canonicalAncestor,
    path.relative(ancestor, lexical),
  );
  if (!isContained(root, resolved)) {
    fail(code, "Repository path escapes through a symlink ancestor");
  }
  if (!requireFile) return resolved;
  const canonical = fs.realpathSync(lexical);
  if (!fs.statSync(canonical).isFile() || !isContained(root, canonical)) {
    fail(code, `Artifact '${portable}' must be a contained regular file`);
  }
  return canonical;
}

function normalizeRevalidatedArtifact(
  repository: ResearchRepositoryContextResolution,
  artifact: ArtifactRef,
): NormalizedDispatchScopeV1["artifacts"][number] {
  return Object.freeze({
    id: artifact.id,
    repositoryId: artifact.repositoryId,
    path: normalizeArtifactPath(artifact.path),
    resolvedPath: resolveContainedPath(
      repository.path,
      artifact.path,
      true,
      "ARTIFACT_INVALID",
    ),
    ...(artifact.revision === undefined ? {} : { revision: artifact.revision }),
    ...(artifact.sha256 === undefined ? {} : { sha256: artifact.sha256 }),
  });
}

function verifyArtifactBindings(
  repository: ResearchRepositoryContextResolution,
  artifacts: readonly NormalizedDispatchScopeV1["artifacts"][number][],
): void {
  for (const artifact of artifacts) {
    if (
      artifact.revision !== undefined &&
      artifact.revision !== repository.revision
    ) {
      fail(
        "ARTIFACT_INVALID",
        `Artifact '${artifact.id}' revision does not match HEAD`,
      );
    }
    if (artifact.sha256 !== undefined) {
      const actual = createHash("sha256")
        .update(fs.readFileSync(artifact.resolvedPath))
        .digest("hex");
      if (actual !== artifact.sha256) {
        fail(
          "ARTIFACT_INVALID",
          `Artifact '${artifact.id}' sha256 does not match`,
        );
      }
    }
  }
}

export async function revalidateDispatchActivationStaged(input: {
  readonly root: string;
  readonly state: ResearchState;
  readonly dispatch: Dispatch;
  readonly activation: ResearchActivation;
}): Promise<StagedDispatchRevalidation> {
  const requestDigest = digestDispatchRequest(input.dispatch);
  if (requestDigest !== input.activation.requestDigest) {
    fail(
      "REQUEST_DIGEST_MISMATCH",
      "Dispatch request digest no longer matches activation",
    );
  }

  const procedure = await resolveResearchProcedure({
    root: input.root,
    capabilityId: input.activation.capabilityId,
  });
  if (procedure.digest !== input.activation.procedure.digest) {
    fail(
      "PROCEDURE_DIGEST_MISMATCH",
      "Procedure digest no longer matches activation",
    );
  }

  const policy = await readResearchProjectPolicy({ root: input.root });
  if (policy.digest !== input.activation.policyDigest) {
    fail(
      "POLICY_DIGEST_MISMATCH",
      "Policy digest no longer matches activation",
    );
  }

  const authority = resolveResearchEffectiveAuthority({
    capabilityId: input.activation.capabilityId,
    procedure,
    policy,
  });
  if (!authority.enabled) {
    fail(
      "CAPABILITY_DISABLED",
      `Capability '${input.activation.capabilityId}' is disabled`,
    );
  }
  const automaticEligibility = evaluateResearchAutomaticEligibility(authority);
  const artifactRefs = input.dispatch.context.flatMap((entry) =>
    entry.artifact === undefined ? [] : [entry.artifact],
  );
  if (
    artifactRefs.some(
      (artifact) => artifact.repositoryId !== input.dispatch.repositoryId,
    )
  ) {
    fail(
      "REPOSITORY_INVALID",
      "Single-Repository authority cannot include artifacts from another Repository",
    );
  }

  let repository: ResearchRepositoryContextResolution;
  try {
    repository = await resolveResearchRepositoryContext(
      input.root,
      input.dispatch.repositoryId,
      input.state,
    );
  } catch (error) {
    fail(
      "REPOSITORY_INVALID",
      `Repository '${input.dispatch.repositoryId}' could not be resolved`,
      error,
    );
  }
  const artifacts = artifactRefs.map((artifact) =>
    normalizeRevalidatedArtifact(repository, artifact),
  );
  const allowedWritePaths = input.dispatch.allowedWritePaths.map(
    (declaredPath) => ({
      declaredPath: normalizeArtifactPath(declaredPath),
      resolvedPath: resolveContainedPath(
        repository.path,
        declaredPath,
        false,
        "WRITE_SCOPE_INVALID",
      ),
    }),
  );
  const scope: NormalizedDispatchScopeV1 = {
    schemaVersion: 1,
    dispatchId: input.dispatch.id,
    repository: {
      id: repository.repository.id,
      resolvedRoot: repository.path,
      locator: repository.repository.locator,
      ...(repository.repository.expectedRemote === undefined
        ? {}
        : { expectedRemote: repository.repository.expectedRemote }),
      ...(repository.remote === null
        ? {}
        : { observedRemote: repository.remote }),
      ...(repository.revision === null
        ? {}
        : { headRevision: repository.revision }),
    },
    artifacts,
    allowedWritePaths,
  };
  const scopeHash = hashDispatchScope(scope);
  if (scopeHash !== input.activation.scopeHash) {
    fail("SCOPE_HASH_MISMATCH", "Dispatch scope no longer matches activation");
  }
  if (!repository.remoteVerified) {
    fail(
      "REPOSITORY_INVALID",
      `Repository '${repository.repository.id}' origin remote does not match`,
    );
  }
  verifyArtifactBindings(repository, artifacts);

  return Object.freeze({
    state: input.state,
    dispatch: input.dispatch,
    authority,
    procedure,
    automaticEligibility,
    policyDigest: policy.digest,
    requestDigest,
    scopeHash,
    scope,
    repository,
  });
}

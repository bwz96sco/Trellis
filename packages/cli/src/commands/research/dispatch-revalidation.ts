import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  digestDispatchRequest,
  assertResearchExecutionPackageIdentity,
  evaluateResearchAutomaticEligibility,
  findResearchWorkflowNode,
  hashDispatchScope,
  isExecutionPackageActivation,
  normalizeArtifactPath,
  resolveResearchEffectiveAuthority,
  resolveResearchExecutionPackageEffectiveAuthority,
  type ArtifactRef,
  type Dispatch,
  type NormalizedDispatchScopeV1,
  type ParsedResearchProcedure,
  type ResearchActivation,
  type ResearchAutomaticEligibility,
  type ResearchPackageEffectiveAuthority,
  type ResearchState,
} from "@mindfoldhq/trellis-core/research";

import { ResearchActivationError } from "./errors.js";
import { readResearchProjectPolicy } from "./project-policy.js";
import {
  resolveResearchProcedure,
  resolveResearchSkillExecutionPackage,
  type ResolvedResearchSkillExecutionPackage,
} from "./procedure-resolution.js";
import { resolveResearchWorkflowDefinition } from "./workflow-definition-resolution.js";
import {
  resolveResearchRepositoryContext,
  type ResearchRepositoryContextResolution,
} from "./repository.js";

interface StagedDispatchRevalidationBase {
  readonly state: ResearchState;
  readonly dispatch: Dispatch;
  readonly authority: ResearchPackageEffectiveAuthority;
  readonly automaticEligibility: ResearchAutomaticEligibility;
  readonly policyDigest: string;
  readonly requestDigest: string;
  readonly scopeHash: string;
  readonly scope: NormalizedDispatchScopeV1;
  readonly repository: ResearchRepositoryContextResolution;
}

export type StagedDispatchRevalidation =
  | (StagedDispatchRevalidationBase & {
      readonly packageKind: "procedure";
      readonly procedure: ParsedResearchProcedure;
    })
  | (StagedDispatchRevalidationBase & {
      readonly packageKind: "skill";
      readonly skill: ResolvedResearchSkillExecutionPackage;
    });

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

  let packageSelection:
    | {
        readonly packageKind: "procedure";
        readonly procedure: ParsedResearchProcedure;
        readonly authority: ResearchPackageEffectiveAuthority;
        readonly policyDigest: string;
      }
    | {
        readonly packageKind: "skill";
        readonly skill: ResolvedResearchSkillExecutionPackage;
        readonly authority: ResearchPackageEffectiveAuthority;
        readonly policyDigest: string;
      };

  if (isExecutionPackageActivation(input.activation)) {
    const skill = await resolveResearchSkillExecutionPackage({
      root: input.root,
      id: input.activation.executionPackage.id,
      version: input.activation.executionPackage.version,
      invocationSource: "operator-explicit",
      profile: "managed",
      audience: "worker",
      requestedMemberPaths:
        input.activation.managedExecution.requestedMemberPaths,
      expectedIdentity: input.activation.executionPackage,
    });
    assertResearchExecutionPackageIdentity(
      skill.identity,
      input.activation.executionPackage,
    );

    const managedCapabilityId = skill.manifest.managedBinding?.capabilityId;
    if (managedCapabilityId === undefined) {
      fail(
        "APPROVAL_RELATION_MISMATCH",
        `Research Skill '${skill.manifest.id}' has no managed capability binding`,
      );
    }

    const workflowBinding = input.activation.managedExecution.workflow;
    if (workflowBinding !== undefined) {
      const instance =
        input.state.workflowInstances[workflowBinding.workflowInstanceId];
      if (
        instance?.status !== "active" ||
        instance.questId !== input.dispatch.questId ||
        instance.workflowId !== workflowBinding.workflowId ||
        instance.workflowVersion !== workflowBinding.workflowVersion ||
        instance.workflowDigest !== workflowBinding.workflowDigest ||
        instance.currentNodeId !== workflowBinding.nodeId ||
        instance.nodeCompletions[workflowBinding.nodeId] !== undefined
      ) {
        fail(
          "APPROVAL_RELATION_MISMATCH",
          "Managed Workflow binding no longer matches the active current node",
        );
      }
      const definition = resolveResearchWorkflowDefinition({
        root: input.root,
        id: workflowBinding.workflowId,
        version: workflowBinding.workflowVersion,
        expectedDigest: workflowBinding.workflowDigest,
      });
      const node = findResearchWorkflowNode(
        definition.definition,
        workflowBinding.nodeId,
      );
      if (!node?.allowedProfiles.includes("managed")) {
        fail(
          "APPROVAL_RELATION_MISMATCH",
          "Managed Workflow node no longer permits managed execution",
        );
      }
      assertResearchExecutionPackageIdentity(
        node.executionPackage,
        skill.identity,
      );
    }

    const policy = await readResearchProjectPolicy({ root: input.root });
    if (policy.digest !== input.activation.policyDigest) {
      fail(
        "POLICY_DIGEST_MISMATCH",
        "Policy digest no longer matches activation",
      );
    }
    packageSelection = {
      packageKind: "skill",
      skill,
      authority: resolveResearchExecutionPackageEffectiveAuthority({
        capabilityId: input.activation.capabilityId,
        managedCapabilityId,
        executionPackage: skill.identity,
        policy,
      }),
      policyDigest: policy.digest,
    };
  } else {
    // Historical activations must resolve the recorded Procedure id/version and
    // digest, not the registry's current binding (which may later point at 2.0.0).
    const procedure = await resolveResearchProcedure({
      root: input.root,
      capabilityId: input.activation.capabilityId,
      mode: "activation-recorded",
      procedureId: input.activation.procedure.id,
      procedureVersion: input.activation.procedure.version,
    });
    if (
      procedure.manifest.id !== input.activation.procedure.id ||
      procedure.manifest.version !== input.activation.procedure.version
    ) {
      fail(
        "PROCEDURE_DIGEST_MISMATCH",
        "Procedure identity no longer matches activation",
      );
    }
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
    packageSelection = {
      packageKind: "procedure",
      procedure,
      authority: resolveResearchEffectiveAuthority({
        capabilityId: input.activation.capabilityId,
        procedure,
        policy,
      }),
      policyDigest: policy.digest,
    };
  }

  const { authority } = packageSelection;
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
    automaticEligibility,
    policyDigest: packageSelection.policyDigest,
    requestDigest,
    scopeHash,
    scope,
    repository,
    ...(packageSelection.packageKind === "procedure"
      ? {
          packageKind: "procedure" as const,
          procedure: packageSelection.procedure,
        }
      : {
          packageKind: "skill" as const,
          skill: packageSelection.skill,
        }),
  });
}

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  digestDispatchRequest,
  dispatchSchema,
  hashDispatchScope,
  evaluateResearchAutomaticEligibility,
  findResearchWorkflowNode,
  isExecutionPackageActivation,
  normalizeArtifactPath,
  readResearchState,
  resolveResearchCapability,
  resolveResearchExecutionPackageEffectiveAuthority,
  sameResearchExecutionPackageIdentity,
  type ArtifactRef,
  type Dispatch,
  type ManagedExecutionBinding,
  type NormalizedDispatchScopeV1,
  type ParsedResearchProcedure,
  type ResearchActivation,
  type ResearchAutomaticEligibility,
  type ResearchPackageEffectiveAuthority,
  type ResearchState,
  type QuestStage,
  type WorkflowInstanceId,
} from "@mindfoldhq/trellis-core/research";

import { ResearchActivationError } from "./errors.js";
import { readResearchProjectPolicy } from "./project-policy.js";
import {
  resolveResearchProcedureAuthority,
  resolveResearchSkillExecutionPackage,
  type ResolvedResearchSkillExecutionPackage,
} from "./procedure-resolution.js";
import { resolveResearchWorkflowDefinition } from "./workflow-definition-resolution.js";
import {
  resolveRepositoryForUse,
  type RepositoryObservation,
} from "./repository.js";

interface DispatchActivationCandidateBase {
  readonly state: ResearchState;
  readonly dispatch: Dispatch;
  readonly stage: string;
  readonly authority: ResearchPackageEffectiveAuthority;
  readonly automaticEligibility: ResearchAutomaticEligibility;
  readonly policyDigest: string;
  readonly requestDigest: string;
  readonly scopeHash: string;
  readonly scope: NormalizedDispatchScopeV1;
  readonly repositoryObservation: RepositoryObservation;
}

export type DispatchActivationCandidate =
  | (DispatchActivationCandidateBase & {
      readonly packageKind: "procedure";
      readonly procedure: ParsedResearchProcedure;
    })
  | (DispatchActivationCandidateBase & {
      readonly packageKind: "skill";
      readonly skill: ResolvedResearchSkillExecutionPackage;
      readonly managedExecution: ManagedExecutionBinding;
    });

function fail(
  code: ConstructorParameters<typeof ResearchActivationError>[0],
  message: string,
): never {
  throw new ResearchActivationError(code, message);
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

function sameFileSnapshot(left: fs.Stats, right: fs.Stats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

export function readCanonicalDispatchRequest(
  root: string,
  dispatch: Dispatch,
): void {
  const canonicalRoot = fs.realpathSync(root);
  const segments = [".trellis", "research", "dispatches", dispatch.id] as const;
  let current = canonicalRoot;
  try {
    for (const segment of segments) {
      current = path.join(current, segment);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        fail(
          "REQUEST_NOT_FOUND",
          "Dispatch request parent must be a non-symlink directory",
        );
      }
      if (fs.realpathSync(current) !== current) {
        fail("REQUEST_NOT_FOUND", "Dispatch request parent must be canonical");
      }
    }
  } catch (error) {
    if (error instanceof ResearchActivationError) throw error;
    throw new ResearchActivationError(
      "REQUEST_NOT_FOUND",
      `Canonical request for Dispatch '${dispatch.id}' was not found`,
      { cause: error },
    );
  }

  const requestPath = path.join(current, "request.json");
  let bytes: Buffer;
  let descriptor: number | undefined;
  try {
    const pathStat = fs.lstatSync(requestPath);
    if (pathStat.isSymbolicLink() || !pathStat.isFile()) {
      fail(
        "REQUEST_NOT_FOUND",
        "Canonical request must be a regular non-symlink file",
      );
    }
    if (
      fs.realpathSync(requestPath) !== requestPath ||
      !isContained(canonicalRoot, requestPath)
    ) {
      fail(
        "REQUEST_NOT_FOUND",
        "Canonical request must remain inside the control root",
      );
    }
    descriptor = fs.openSync(
      requestPath,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
    );
    const before = fs.fstatSync(descriptor);
    if (!before.isFile() || !sameFileSnapshot(pathStat, before)) {
      fail(
        "REQUEST_STATE_MISMATCH",
        "Canonical request changed before it was read",
      );
    }
    bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    const finalPathStat = fs.lstatSync(requestPath);
    if (
      !sameFileSnapshot(before, after) ||
      !sameFileSnapshot(after, finalPathStat) ||
      finalPathStat.isSymbolicLink() ||
      !finalPathStat.isFile() ||
      fs.realpathSync(requestPath) !== requestPath
    ) {
      fail(
        "REQUEST_STATE_MISMATCH",
        "Canonical request changed while it was read",
      );
    }
  } catch (error) {
    if (error instanceof ResearchActivationError) throw error;
    throw new ResearchActivationError(
      "REQUEST_NOT_FOUND",
      `Canonical request for Dispatch '${dispatch.id}' was not found`,
      { cause: error },
    );
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }

  let request: Dispatch;
  try {
    request = dispatchSchema.parse(JSON.parse(bytes.toString("utf8")));
  } catch (error) {
    throw new ResearchActivationError(
      "REQUEST_STATE_MISMATCH",
      `Canonical request for Dispatch '${dispatch.id}' is invalid`,
      { cause: error },
    );
  }
  if (!isDeepStrictEqual(request, dispatch)) {
    fail(
      "REQUEST_STATE_MISMATCH",
      "Tracked request does not match canonical Dispatch state",
    );
  }
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
  while (ancestor !== root && !fs.existsSync(ancestor))
    ancestor = path.dirname(ancestor);
  const canonicalAncestor = fs.realpathSync(ancestor);
  const resolved = path.resolve(
    canonicalAncestor,
    path.relative(ancestor, lexical),
  );
  if (!isContained(root, resolved)) {
    fail(code, "Repository path escapes through a symlink ancestor");
  }
  if (requireFile) {
    const canonical = fs.realpathSync(lexical);
    if (!fs.statSync(canonical).isFile() || !isContained(root, canonical)) {
      fail(code, `Artifact '${portable}' must be a contained regular file`);
    }
    return canonical;
  }
  return resolved;
}

async function normalizedArtifact(
  root: string,
  artifact: ArtifactRef,
): Promise<NormalizedDispatchScopeV1["artifacts"][number]> {
  let resolved;
  try {
    resolved = await resolveRepositoryForUse(
      root,
      artifact.repositoryId,
      false,
    );
  } catch (error) {
    throw new ResearchActivationError(
      "REPOSITORY_INVALID",
      `Artifact Repository '${artifact.repositoryId}' could not be resolved`,
      { cause: error },
    );
  }
  const resolvedPath = resolveContainedPath(
    resolved.observation.path,
    artifact.path,
    true,
    "ARTIFACT_INVALID",
  );
  if (
    artifact.revision !== undefined &&
    artifact.revision !== resolved.observation.revision
  ) {
    fail(
      "ARTIFACT_INVALID",
      `Artifact '${artifact.id}' revision does not match HEAD`,
    );
  }
  if (artifact.sha256 !== undefined) {
    const actual = createHash("sha256")
      .update(fs.readFileSync(resolvedPath))
      .digest("hex");
    if (actual !== artifact.sha256) {
      fail(
        "ARTIFACT_INVALID",
        `Artifact '${artifact.id}' sha256 does not match`,
      );
    }
  }
  return Object.freeze({
    id: artifact.id,
    repositoryId: artifact.repositoryId,
    path: normalizeArtifactPath(artifact.path),
    resolvedPath,
    ...(artifact.revision === undefined ? {} : { revision: artifact.revision }),
    ...(artifact.sha256 === undefined ? {} : { sha256: artifact.sha256 }),
  });
}

function validateHierarchy(
  state: ResearchState,
  dispatch: Dispatch,
  candidate: boolean,
): { stage: QuestStage } {
  const quest = state.quests[dispatch.questId];
  if (!quest) {
    fail("DISPATCH_HIERARCHY_INVALID", "Dispatch Quest does not exist");
  }
  if (quest.status !== "active") {
    fail("QUEST_NOT_DISPATCHABLE", "Dispatch Quest must be active");
  }

  const run = state.runs[dispatch.runId];
  if (!run || (run.status !== "planned" && run.status !== "running")) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Run must be planned or running",
    );
  }
  if (!candidate && run.dispatchId !== dispatch.id) {
    fail("DISPATCH_HIERARCHY_INVALID", "Run Dispatch identity does not match");
  }
  if (candidate && run.dispatchId !== undefined) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      `Run '${run.id}' already has a Dispatch`,
    );
  }

  const campaign = state.campaigns[run.campaignId];
  if (campaign?.questId !== quest.id) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Run Campaign does not belong to the Dispatch Quest",
    );
  }
  if (!campaign.runIds.includes(run.id)) {
    fail("DISPATCH_HIERARCHY_INVALID", "Run is not registered in its Campaign");
  }
  if (
    dispatch.campaignId !== undefined &&
    dispatch.campaignId !== campaign.id
  ) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Campaign does not match the Run Campaign",
    );
  }

  const repository = state.repositories[dispatch.repositoryId];
  if (!repository || !quest.repositoryIds.includes(repository.id)) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Target Repository is not associated with the Dispatch Quest",
    );
  }
  return { stage: quest.stage };
}

export async function resolveDispatchActivationCandidate(input: {
  readonly root: string;
  readonly dispatch: Dispatch;
  readonly capabilityId: string;
  readonly skillId?: string;
  readonly skillVersion?: string;
  readonly requestedMemberPaths?: readonly string[];
  readonly workflowInstanceId?: WorkflowInstanceId;
  readonly workflowNodeId?: string;
  readonly state?: ResearchState;
  readonly candidate?: boolean;
  readonly allowExistingActivation?: boolean;
}): Promise<DispatchActivationCandidate> {
  const state = input.state ?? (await readResearchState(input.root));
  const { stage } = validateHierarchy(
    state,
    input.dispatch,
    input.candidate === true,
  );
  if (
    !input.allowExistingActivation &&
    state.activationByDispatchId[input.dispatch.id] !== undefined
  ) {
    fail(
      "DUPLICATE_ACTIVATION",
      `Dispatch '${input.dispatch.id}' already has an activation`,
    );
  }
  if (
    Object.values(state.results).some(
      (result) => result.dispatchId === input.dispatch.id,
    ) ||
    Object.values(state.proposals).some(
      (proposal) => proposal.dispatchId === input.dispatch.id,
    )
  ) {
    fail(
      "ACTIVATION_TOO_LATE",
      `Dispatch '${input.dispatch.id}' is already completed`,
    );
  }

  const hasSkill =
    input.skillId !== undefined || input.skillVersion !== undefined;
  if ((input.skillId === undefined) !== (input.skillVersion === undefined)) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Research Skill ID and version must be selected together",
    );
  }
  if (!hasSkill && (input.requestedMemberPaths?.length ?? 0) > 0) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Research Skill members require an exact Skill selection",
    );
  }
  if (
    (input.workflowInstanceId === undefined) !==
    (input.workflowNodeId === undefined)
  ) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Workflow instance and node must be selected together",
    );
  }
  if (!hasSkill && input.workflowInstanceId !== undefined) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Managed Workflow binding requires an exact Skill selection",
    );
  }

  let packageSelection:
    | {
        readonly packageKind: "procedure";
        readonly authority: Extract<
          ResearchPackageEffectiveAuthority,
          { readonly procedure: unknown }
        >;
        readonly procedure: ParsedResearchProcedure;
        readonly automaticEligibility: ResearchAutomaticEligibility;
        readonly policyDigest: string;
      }
    | {
        readonly packageKind: "skill";
        readonly authority: Extract<
          ResearchPackageEffectiveAuthority,
          { readonly packageKind: "skill" }
        >;
        readonly skill: ResolvedResearchSkillExecutionPackage;
        readonly managedExecution: ManagedExecutionBinding;
        readonly automaticEligibility: ResearchAutomaticEligibility;
        readonly policyDigest: string;
      };

  if (input.skillId !== undefined && input.skillVersion !== undefined) {
    const requestedMemberPaths = [
      ...new Set(input.requestedMemberPaths ?? []),
    ].sort();
    const skill = await resolveResearchSkillExecutionPackage({
      root: input.root,
      id: input.skillId,
      version: input.skillVersion,
      invocationSource: "operator-explicit",
      profile: "managed",
      audience: "worker",
      requestedMemberPaths,
    });
    const capabilityId = skill.manifest.managedBinding?.capabilityId;
    if (capabilityId === undefined) {
      fail(
        "DISPATCH_HIERARCHY_INVALID",
        `Research Skill '${skill.manifest.id}' has no managed capability binding`,
      );
    }
    if (input.capabilityId !== "" && input.capabilityId !== capabilityId) {
      fail(
        "CAPABILITY_STAGE_MISMATCH",
        "Selected capability does not match the Research Skill managed binding",
      );
    }
    try {
      resolveResearchCapability({ stage, capabilityId });
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "UNKNOWN_CAPABILITY" ||
          error.code === "CAPABILITY_STAGE_MISMATCH")
          ? error.code
          : "DISPATCH_HIERARCHY_INVALID";
      throw new ResearchActivationError(
        code,
        error instanceof Error ? error.message : String(error),
        { cause: error },
      );
    }
    let workflow: ManagedExecutionBinding["workflow"];
    if (
      input.workflowInstanceId !== undefined &&
      input.workflowNodeId !== undefined
    ) {
      const instance = state.workflowInstances[input.workflowInstanceId];
      if (
        instance?.status !== "active" ||
        instance.questId !== input.dispatch.questId ||
        instance.currentNodeId !== input.workflowNodeId
      ) {
        fail(
          "DISPATCH_HIERARCHY_INVALID",
          "Selected Workflow binding is not the active current node for the Dispatch Quest",
        );
      }
      const definition = resolveResearchWorkflowDefinition({
        root: input.root,
        id: instance.workflowId,
        version: instance.workflowVersion,
        expectedDigest: instance.workflowDigest,
      });
      const node = findResearchWorkflowNode(
        definition.definition,
        input.workflowNodeId,
      );
      if (
        node === undefined ||
        !node.allowedProfiles.includes("managed") ||
        !sameResearchExecutionPackageIdentity(
          node.executionPackage,
          skill.identity,
        )
      ) {
        fail(
          "DISPATCH_HIERARCHY_INVALID",
          "Selected Workflow node does not allow this managed Research Skill package",
        );
      }
      workflow = Object.freeze({
        workflowInstanceId: instance.workflowInstanceId,
        workflowId: instance.workflowId,
        workflowVersion: instance.workflowVersion,
        workflowDigest: instance.workflowDigest,
        nodeId: instance.currentNodeId,
      });
    }
    const policy = await readResearchProjectPolicy({ root: input.root });
    const authority = resolveResearchExecutionPackageEffectiveAuthority({
      capabilityId,
      managedCapabilityId: capabilityId,
      executionPackage: skill.identity,
      policy,
    });
    packageSelection = {
      packageKind: "skill",
      authority,
      skill,
      managedExecution: Object.freeze({
        executionProfile: "managed",
        requestedMemberPaths: Object.freeze([...requestedMemberPaths]),
        ...(workflow === undefined ? {} : { workflow }),
      }),
      automaticEligibility: evaluateResearchAutomaticEligibility(authority),
      policyDigest: policy.digest,
    };
  } else {
    try {
      resolveResearchCapability({ stage, capabilityId: input.capabilityId });
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "UNKNOWN_CAPABILITY" ||
          error.code === "CAPABILITY_STAGE_MISMATCH")
          ? error.code
          : "DISPATCH_HIERARCHY_INVALID";
      throw new ResearchActivationError(
        code,
        error instanceof Error ? error.message : String(error),
        { cause: error },
      );
    }
    const resolvedAuthority = await resolveResearchProcedureAuthority({
      root: input.root,
      capabilityId: input.capabilityId,
    });
    packageSelection = {
      packageKind: "procedure",
      authority: resolvedAuthority.authority,
      procedure: resolvedAuthority.procedure,
      automaticEligibility: resolvedAuthority.automaticEligibility,
      policyDigest: resolvedAuthority.policy.digest,
    };
  }
  if (!packageSelection.authority.enabled) {
    fail(
      "CAPABILITY_DISABLED",
      `Capability '${packageSelection.authority.capabilityId}' is disabled`,
    );
  }

  let repositoryResolution;
  try {
    repositoryResolution = await resolveRepositoryForUse(
      input.root,
      input.dispatch.repositoryId,
      false,
    );
  } catch (error) {
    throw new ResearchActivationError(
      "REPOSITORY_INVALID",
      `Repository '${input.dispatch.repositoryId}' could not be resolved`,
      { cause: error },
    );
  }
  const artifacts: NormalizedDispatchScopeV1["artifacts"][number][] = [];
  for (const entry of input.dispatch.context) {
    if (entry.artifact !== undefined) {
      if (
        packageSelection.authority.repositoryScope === "single" &&
        entry.artifact.repositoryId !== input.dispatch.repositoryId
      ) {
        fail(
          "REPOSITORY_INVALID",
          "Single-Repository authority cannot include artifacts from another Repository",
        );
      }
      artifacts.push(await normalizedArtifact(input.root, entry.artifact));
    }
  }
  const allowedWritePaths = input.dispatch.allowedWritePaths.map(
    (declaredPath) => ({
      declaredPath: normalizeArtifactPath(declaredPath),
      resolvedPath: resolveContainedPath(
        repositoryResolution.observation.path,
        declaredPath,
        false,
        "WRITE_SCOPE_INVALID",
      ),
    }),
  );
  const repository = repositoryResolution.repository;
  const observation = repositoryResolution.observation;
  const scope: NormalizedDispatchScopeV1 = {
    schemaVersion: 1,
    dispatchId: input.dispatch.id,
    repository: {
      id: repository.id,
      resolvedRoot: observation.path,
      locator: repository.locator,
      ...(repository.expectedRemote === undefined
        ? {}
        : { expectedRemote: repository.expectedRemote }),
      ...(observation.remote === null
        ? {}
        : { observedRemote: observation.remote }),
      ...(observation.revision === null
        ? {}
        : { headRevision: observation.revision }),
    },
    artifacts,
    allowedWritePaths,
  };
  return Object.freeze({
    state,
    dispatch: input.dispatch,
    stage,
    authority: packageSelection.authority,
    automaticEligibility: packageSelection.automaticEligibility,
    policyDigest: packageSelection.policyDigest,
    requestDigest: digestDispatchRequest(input.dispatch),
    scopeHash: hashDispatchScope(scope),
    scope,
    repositoryObservation: observation,
    ...(packageSelection.packageKind === "procedure"
      ? {
          packageKind: "procedure" as const,
          procedure: packageSelection.procedure,
        }
      : {
          packageKind: "skill" as const,
          skill: packageSelection.skill,
          managedExecution: packageSelection.managedExecution,
        }),
  });
}

export function activationFromCandidate(
  candidate: DispatchActivationCandidate,
  id: ResearchActivation["id"],
  timestamp: string,
): ResearchActivation {
  const common = {
    id,
    dispatchId: candidate.dispatch.id,
    questId: candidate.dispatch.questId,
    capabilityId: candidate.authority.capabilityId,
    mode: candidate.authority.activation,
    policyDigest: candidate.policyDigest,
    requestDigest: candidate.requestDigest,
    scopeHash: candidate.scopeHash,
    maxDurationMinutes: candidate.authority.maxDurationMinutes,
    maxDispatches: candidate.authority.maxDispatches,
    createdAt: timestamp,
  };
  return candidate.packageKind === "skill"
    ? {
        ...common,
        executionPackage: { ...candidate.skill.identity },
        managedExecution: {
          ...candidate.managedExecution,
          requestedMemberPaths: [
            ...candidate.managedExecution.requestedMemberPaths,
          ],
          ...(candidate.managedExecution.workflow === undefined
            ? {}
            : { workflow: { ...candidate.managedExecution.workflow } }),
        },
      }
    : {
        ...common,
        procedure: {
          id: candidate.procedure.manifest.id,
          version: candidate.procedure.manifest.version,
          digest: candidate.procedure.digest,
        },
      };
}

export async function revalidateDispatchActivationBindings(input: {
  readonly root: string;
  readonly activation: ResearchActivation;
}): Promise<DispatchActivationCandidate> {
  const state = await readResearchState(input.root);
  const dispatch = state.dispatches[input.activation.dispatchId];
  if (!dispatch) {
    fail(
      "DISPATCH_NOT_FOUND",
      `Dispatch '${input.activation.dispatchId}' was not found`,
    );
  }
  const candidate = await resolveDispatchActivationCandidate({
    root: input.root,
    dispatch,
    capabilityId: input.activation.capabilityId,
    ...(isExecutionPackageActivation(input.activation)
      ? {
          skillId: input.activation.executionPackage.id,
          skillVersion: input.activation.executionPackage.version,
          requestedMemberPaths:
            input.activation.managedExecution.requestedMemberPaths,
          ...(input.activation.managedExecution.workflow === undefined
            ? {}
            : {
                workflowInstanceId:
                  input.activation.managedExecution.workflow.workflowInstanceId,
                workflowNodeId:
                  input.activation.managedExecution.workflow.nodeId,
              }),
        }
      : {}),
    allowExistingActivation: true,
  });
  readCanonicalDispatchRequest(input.root, dispatch);
  if (
    candidate.dispatch.questId !== input.activation.questId ||
    candidate.authority.capabilityId !== input.activation.capabilityId ||
    candidate.authority.activation !== input.activation.mode ||
    candidate.authority.maxDurationMinutes !==
      input.activation.maxDurationMinutes ||
    candidate.authority.maxDispatches !== input.activation.maxDispatches ||
    (isExecutionPackageActivation(input.activation)
      ? candidate.packageKind !== "skill" ||
        !isDeepStrictEqual(
          candidate.skill.identity,
          input.activation.executionPackage,
        ) ||
        !isDeepStrictEqual(
          candidate.managedExecution,
          input.activation.managedExecution,
        )
      : candidate.packageKind !== "procedure" ||
        candidate.procedure.manifest.id !== input.activation.procedure.id ||
        candidate.procedure.manifest.version !==
          input.activation.procedure.version)
  ) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Activation authority no longer matches canonical state",
    );
  }
  if (candidate.requestDigest !== input.activation.requestDigest) {
    fail(
      "REQUEST_DIGEST_MISMATCH",
      "Dispatch request digest no longer matches activation",
    );
  }
  if (
    !isExecutionPackageActivation(input.activation) &&
    (candidate.packageKind !== "procedure" ||
      candidate.procedure.digest !== input.activation.procedure.digest)
  ) {
    fail(
      "PROCEDURE_DIGEST_MISMATCH",
      "Procedure digest no longer matches activation",
    );
  }
  if (candidate.policyDigest !== input.activation.policyDigest) {
    fail(
      "POLICY_DIGEST_MISMATCH",
      "Policy digest no longer matches activation",
    );
  }
  if (candidate.scopeHash !== input.activation.scopeHash) {
    fail("SCOPE_HASH_MISMATCH", "Dispatch scope no longer matches activation");
  }
  return candidate;
}

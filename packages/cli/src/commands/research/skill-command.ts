import {
  readResearchState,
  ResearchWorkflowError,
  type QuestId,
  type ArtifactRef,
  type ParsedResearchWorkflowDefinitionV1,
  type QuestStage,
  type QuestStatus,
  type RepositoryId,
  type ResearchExecutionProfile,
  type ResearchSkillInventoryItemV3,
  type ResearchSkillManifestV3,
  type ResolvedExecutionPackageIdentity,
} from "@mindfoldhq/trellis-core/research";

import { resolveResearchRoot, type ResearchOutputOptions } from "./common.js";
import { ResearchCliError } from "./errors.js";
import {
  ResearchSkillResolutionError,
  discoverResearchSkillExecutionPackages,
  inspectResearchSkillExecutionPackage,
  resolveResearchSkillExecutionPackage,
} from "./procedure-resolution.js";
import { resolveResearchWorkflowDefinition } from "./workflow-definition-resolution.js";

type SkillSource = "project" | "bundled";

export interface ResearchSkillListResult {
  schemaVersion: 1;
  command: "research skill list";
  skills: {
    id: string;
    version: string;
    source: SkillSource;
    identity: ResolvedExecutionPackageIdentity;
    skillKind: ResearchSkillManifestV3["skillKind"];
    invocationSource: ResearchSkillManifestV3["invocationSource"];
    entrypointType: ResearchSkillManifestV3["entrypointType"];
    allowedProfiles: ResearchExecutionProfile[];
  }[];
}

export interface ResearchSkillShowResult {
  schemaVersion: 1;
  command: "research skill show";
  source: SkillSource;
  manifest: ResearchSkillManifestV3;
  identity: ResolvedExecutionPackageIdentity;
  instructions: { byteLength: number; digest: string };
  members: Omit<ResearchSkillInventoryItemV3, "content">[];
}

export interface ResearchSkillContextResult {
  schemaVersion: 1;
  command: "research skill context";
  profile: "lightweight";
  source: SkillSource;
  executionPackage: ResolvedExecutionPackageIdentity;
  workflow: null | {
    workflowInstanceId: string;
    workflowId: string;
    workflowVersion: string;
    workflowDigest: `sha256:${string}`;
    nodeId: string;
  };
  quest: null | {
    id: QuestId;
    title: string;
    description: string;
    status: QuestStatus;
    stage: QuestStage;
    repositoryIds: RepositoryId[];
    artifactRefs: ArtifactRef[];
  };
  instructions: string;
  members: readonly ResearchSkillInventoryItemV3[];
  stop: { after: "one-skill"; autoInvoke: false };
}

function mapSkillError(error: unknown): never {
  if (error instanceof ResearchCliError) throw error;
  if (error instanceof ResearchWorkflowError) {
    throw new ResearchCliError(
      "research_skill_invocation_forbidden",
      error.message,
      { cause: error },
    );
  }
  if (error instanceof ResearchSkillResolutionError) {
    throw new ResearchCliError("research_skill_not_found", error.message, {
      cause: error,
    });
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "RESEARCH_SKILL_INVOCATION_FORBIDDEN"
  ) {
    throw new ResearchCliError(
      "research_skill_invocation_forbidden",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "RESEARCH_SKILL_MEMBER_FORBIDDEN"
  ) {
    throw new ResearchCliError(
      "research_skill_member_forbidden",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "RESEARCH_EXECUTION_PACKAGE_IDENTITY_MISMATCH"
  ) {
    throw new ResearchCliError(
      "research_skill_invocation_forbidden",
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
  throw error;
}

async function selectSkillVersion(
  root: string,
  id: string,
  requestedVersion?: string,
): Promise<string> {
  if (requestedVersion !== undefined) return requestedVersion;
  let discovered;
  try {
    discovered = await discoverResearchSkillExecutionPackages({ root });
  } catch (error) {
    mapSkillError(error);
  }
  const versions = discovered
    .filter((skill) => skill.manifest.id === id)
    .map((skill) => skill.manifest.version)
    .sort();
  if (versions.length === 0) {
    throw new ResearchCliError(
      "research_skill_not_found",
      `Research Skill '${id}' was not found`,
    );
  }
  if (versions.length !== 1) {
    throw new ResearchCliError(
      "research_skill_version_required",
      `Research Skill '${id}' requires an exact version; available versions: ${versions.join(", ")}`,
    );
  }
  return versions[0] as string;
}

export async function listResearchSkills(
  options: ResearchOutputOptions,
): Promise<ResearchSkillListResult> {
  const root = resolveResearchRoot(options);
  try {
    const skills = await discoverResearchSkillExecutionPackages({ root });
    return {
      schemaVersion: 1 as const,
      command: "research skill list" as const,
      skills: skills.map((skill) => ({
        id: skill.manifest.id,
        version: skill.manifest.version,
        source: skill.source,
        identity: skill.identity,
        skillKind: skill.manifest.skillKind,
        invocationSource: skill.manifest.invocationSource,
        entrypointType: skill.manifest.entrypointType,
        allowedProfiles: [...skill.manifest.allowedProfiles],
      })),
    };
  } catch (error) {
    mapSkillError(error);
  }
}

export async function showResearchSkill(
  options: ResearchOutputOptions & { skill: string; version?: string },
): Promise<ResearchSkillShowResult> {
  const root = resolveResearchRoot(options);
  const version = await selectSkillVersion(
    root,
    options.skill,
    options.version,
  );
  try {
    const skill = await inspectResearchSkillExecutionPackage({
      root,
      id: options.skill,
      version,
    });
    return {
      schemaVersion: 1 as const,
      command: "research skill show" as const,
      source: skill.source,
      manifest: skill.manifest,
      identity: skill.identity,
      instructions: {
        byteLength: new TextEncoder().encode(skill.instructions).length,
        digest: skill.identity.instructionDigest,
      },
      members: skill.members.map(({ content: _content, ...member }) => member),
    };
  } catch (error) {
    mapSkillError(error);
  }
}

export async function getResearchSkillContext(
  options: ResearchOutputOptions & {
    skill: string;
    profile: ResearchExecutionProfile;
    member?: readonly string[];
    quest?: QuestId;
  },
): Promise<ResearchSkillContextResult> {
  if (options.profile === "managed") {
    throw new ResearchCliError(
      "research_skill_invocation_forbidden",
      "Managed Skill Context requires the C5 Dispatch/Activation/Approval path",
    );
  }
  const root = resolveResearchRoot(options);
  const state = await readResearchState(root);
  const quest =
    options.quest === undefined ? undefined : state.quests[options.quest];
  if (options.quest !== undefined && quest === undefined) {
    throw new ResearchCliError(
      "research_skill_invocation_forbidden",
      `Unknown Research Quest '${options.quest}'`,
    );
  }

  let version: string;
  let expectedIdentity: ResolvedExecutionPackageIdentity | undefined;
  let workflow: {
    workflowInstanceId: string;
    workflowId: string;
    workflowVersion: string;
    workflowDigest: `sha256:${string}`;
    nodeId: string;
  } | null = null;
  if (quest !== undefined) {
    const activeId = state.activeWorkflowByQuestId[quest.id];
    const instance =
      activeId === undefined ? undefined : state.workflowInstances[activeId];
    if (instance !== undefined) {
      let definition: ParsedResearchWorkflowDefinitionV1;
      try {
        definition = resolveResearchWorkflowDefinition({
          root,
          id: instance.workflowId,
          version: instance.workflowVersion,
          expectedDigest: instance.workflowDigest,
        });
      } catch (error) {
        mapSkillError(error);
      }
      const node = definition.definition.nodes.find(
        (candidate) => candidate.id === instance.currentNodeId,
      );
      if (
        node?.executionPackage.packageKind !== "skill" ||
        node.executionPackage.id !== options.skill ||
        !node.allowedProfiles.includes("lightweight")
      ) {
        throw new ResearchCliError(
          "research_skill_invocation_forbidden",
          `Skill '${options.skill}' is not the active Workflow node package`,
        );
      }
      version = node.executionPackage.version;
      expectedIdentity = node.executionPackage;
      workflow = {
        workflowInstanceId: instance.workflowInstanceId,
        workflowId: instance.workflowId,
        workflowVersion: instance.workflowVersion,
        workflowDigest: instance.workflowDigest,
        nodeId: instance.currentNodeId,
      };
    } else {
      version = await selectSkillVersion(root, options.skill);
    }
  } else {
    version = await selectSkillVersion(root, options.skill);
  }

  try {
    const skill = await resolveResearchSkillExecutionPackage({
      root,
      id: options.skill,
      version,
      invocationSource: "operator-explicit",
      profile: "lightweight",
      audience: "root",
      requestedMemberPaths: options.member ?? [],
      ...(expectedIdentity === undefined ? {} : { expectedIdentity }),
    });
    return {
      schemaVersion: 1 as const,
      command: "research skill context" as const,
      profile: "lightweight" as const,
      source: skill.source,
      executionPackage: skill.identity,
      workflow,
      quest:
        quest === undefined
          ? null
          : {
              id: quest.id,
              title: quest.title,
              description: quest.description,
              status: quest.status,
              stage: quest.stage,
              repositoryIds: [...quest.repositoryIds],
              artifactRefs: quest.artifactRefs.map((artifact) => ({
                ...artifact,
              })),
            },
      instructions: skill.instructions,
      members: skill.members as readonly ResearchSkillInventoryItemV3[],
      stop: { after: "one-skill" as const, autoInvoke: false as const },
    };
  } catch (error) {
    mapSkillError(error);
  }
}

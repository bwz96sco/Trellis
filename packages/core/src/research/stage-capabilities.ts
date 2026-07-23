import type { QuestStage } from "./types.js";

export type DispatchableQuestStage = Exclude<QuestStage, "complete">;
export type ResearchExecutionHost = "claude" | "codex";

export type ResearchCapabilityId =
  | "research.setup.project"
  | "research.framing.quest"
  | "research.framing.admin"
  | "research.literature.scan"
  | "research.literature.review"
  | "research.ideation.generate"
  | "research.ideation.evaluate"
  | "research.experiment.round"
  | "research.experiment.campaign"
  | "research.computation.case"
  | "research.theory.case"
  | "research.audit.case"
  | "research.audit.campaign"
  | "research.writing.case";

export type ResearchCapabilityKind = "bounded" | "workflow" | "advisory";
export type ResearchActivationMode = "automatic" | "explicit";

export interface ResearchCapabilityDefinition {
  readonly id: ResearchCapabilityId;
  readonly stage: DispatchableQuestStage;
  readonly kind: ResearchCapabilityKind;
  readonly activation: ResearchActivationMode;
  readonly procedure: Readonly<{ id: string; version: string }>;
  readonly workerAuthority: "proposal-only";
  readonly networkPolicy: "forbidden" | "declared-only";
  readonly repositoryScope: "single" | "multiple";
  readonly maxDurationMinutes: number;
  readonly maxDispatches: number;
  readonly approvalRequiredFor: readonly (
    | "workflow"
    | "network"
    | "external-cost"
    | "multiple-repositories"
    | "canonical-mutation"
    | "capability-chaining"
  )[];
}

export type ResearchCapabilityResolutionErrorCode =
  | "UNKNOWN_CAPABILITY"
  | "CAPABILITY_STAGE_MISMATCH"
  | "QUEST_STAGE_NOT_DISPATCHABLE";

export class ResearchCapabilityResolutionError extends Error {
  readonly code: ResearchCapabilityResolutionErrorCode;

  constructor(code: ResearchCapabilityResolutionErrorCode, message: string) {
    super(message);
    this.name = "ResearchCapabilityResolutionError";
    this.code = code;
  }
}

const BOUNDED_APPROVAL_REQUIREMENTS = Object.freeze([
  "network",
  "external-cost",
  "multiple-repositories",
  "canonical-mutation",
  "capability-chaining",
] as const);

const WORKFLOW_APPROVAL_REQUIREMENTS = Object.freeze([
  "workflow",
  ...BOUNDED_APPROVAL_REQUIREMENTS,
] as const);

interface CapabilityDefinitionInput {
  readonly id: ResearchCapabilityId;
  readonly stage: DispatchableQuestStage;
  readonly kind: "bounded" | "workflow";
  readonly activation: ResearchActivationMode;
  readonly procedureId: string;
  readonly networkPolicy: "forbidden" | "declared-only";
  readonly repositoryScope: "single" | "multiple";
  readonly maxDurationMinutes: number;
  readonly maxDispatches: number;
}

function defineCapability(
  input: CapabilityDefinitionInput,
): ResearchCapabilityDefinition {
  return Object.freeze({
    id: input.id,
    stage: input.stage,
    kind: input.kind,
    activation: input.activation,
    procedure: Object.freeze({ id: input.procedureId, version: "1.0.0" }),
    workerAuthority: "proposal-only",
    networkPolicy: input.networkPolicy,
    repositoryScope: input.repositoryScope,
    maxDurationMinutes: input.maxDurationMinutes,
    maxDispatches: input.maxDispatches,
    approvalRequiredFor:
      input.kind === "workflow"
        ? WORKFLOW_APPROVAL_REQUIREMENTS
        : BOUNDED_APPROVAL_REQUIREMENTS,
  });
}

export const RESEARCH_CAPABILITY_REGISTRY = Object.freeze([
  defineCapability({
    id: "research.setup.project",
    stage: "setup",
    kind: "workflow",
    activation: "explicit",
    procedureId: "project-setup-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.framing.quest",
    stage: "framing",
    kind: "bounded",
    activation: "automatic",
    procedureId: "quest-framing-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.framing.admin",
    stage: "framing",
    kind: "workflow",
    activation: "explicit",
    procedureId: "quest-admin-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.literature.scan",
    stage: "literature",
    kind: "bounded",
    activation: "automatic",
    procedureId: "literature-scan-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.literature.review",
    stage: "literature",
    kind: "workflow",
    activation: "explicit",
    procedureId: "literature-review-v1",
    networkPolicy: "declared-only",
    repositoryScope: "multiple",
    maxDurationMinutes: 60,
    maxDispatches: 4,
  }),
  defineCapability({
    id: "research.ideation.generate",
    stage: "ideation",
    kind: "bounded",
    activation: "automatic",
    procedureId: "idea-generation-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.ideation.evaluate",
    stage: "ideation",
    kind: "workflow",
    activation: "explicit",
    procedureId: "idea-evaluation-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 30,
    maxDispatches: 2,
  }),
  defineCapability({
    id: "research.experiment.round",
    stage: "experiment",
    kind: "bounded",
    activation: "automatic",
    procedureId: "experiment-round-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.experiment.campaign",
    stage: "experiment",
    kind: "workflow",
    activation: "explicit",
    procedureId: "experiment-campaign-v1",
    networkPolicy: "declared-only",
    repositoryScope: "multiple",
    maxDurationMinutes: 120,
    maxDispatches: 8,
  }),
  defineCapability({
    id: "research.computation.case",
    stage: "computation",
    kind: "bounded",
    activation: "automatic",
    procedureId: "computation-case-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.theory.case",
    stage: "theory",
    kind: "bounded",
    activation: "automatic",
    procedureId: "theory-case-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.audit.case",
    stage: "audit",
    kind: "bounded",
    activation: "automatic",
    procedureId: "review-case-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
  defineCapability({
    id: "research.audit.campaign",
    stage: "audit",
    kind: "workflow",
    activation: "explicit",
    procedureId: "review-campaign-v1",
    networkPolicy: "forbidden",
    repositoryScope: "multiple",
    maxDurationMinutes: 60,
    maxDispatches: 4,
  }),
  defineCapability({
    id: "research.writing.case",
    stage: "writing",
    kind: "bounded",
    activation: "automatic",
    procedureId: "writing-case-v1",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
  }),
] satisfies readonly ResearchCapabilityDefinition[]);

export const RESEARCH_DEFAULT_CAPABILITY_BY_STAGE = Object.freeze({
  setup: "research.setup.project",
  framing: "research.framing.quest",
  literature: "research.literature.scan",
  ideation: "research.ideation.generate",
  experiment: "research.experiment.round",
  computation: "research.computation.case",
  theory: "research.theory.case",
  audit: "research.audit.case",
  writing: "research.writing.case",
} as const satisfies Readonly<Record<DispatchableQuestStage, ResearchCapabilityId>>);

export const RESEARCH_EXECUTION_HOSTS = ["claude", "codex"] as const;

export function parseResearchExecutionHost(
  value: string,
): ResearchExecutionHost {
  if (!RESEARCH_EXECUTION_HOSTS.includes(value as ResearchExecutionHost)) {
    throw new Error(
      `research execution host must be one of: ${RESEARCH_EXECUTION_HOSTS.join(", ")}`,
    );
  }
  return value as ResearchExecutionHost;
}

function isDispatchableQuestStage(
  value: unknown,
): value is DispatchableQuestStage {
  return (
    value === "setup" ||
    value === "framing" ||
    value === "literature" ||
    value === "ideation" ||
    value === "experiment" ||
    value === "computation" ||
    value === "theory" ||
    value === "audit" ||
    value === "writing"
  );
}

export function getResearchCapabilityDefinition(
  capabilityId: string,
): ResearchCapabilityDefinition | undefined {
  return RESEARCH_CAPABILITY_REGISTRY.find(
    (definition) => definition.id === capabilityId,
  );
}

interface ResolveResearchCapabilityInput {
  readonly stage: QuestStage;
  readonly capabilityId?: string;
}

interface ResearchCapabilityResolution {
  readonly stage: DispatchableQuestStage;
  readonly capability: ResearchCapabilityDefinition;
  readonly selection: "explicit" | "default";
}

export function resolveResearchCapability(
  input: ResolveResearchCapabilityInput,
): ResearchCapabilityResolution {
  if (!isDispatchableQuestStage(input.stage)) {
    throw new ResearchCapabilityResolutionError(
      "QUEST_STAGE_NOT_DISPATCHABLE",
      `Research Quest stage '${String(input.stage)}' is not dispatchable`,
    );
  }

  const selection = input.capabilityId === undefined ? "default" : "explicit";
  const capabilityId =
    input.capabilityId ?? RESEARCH_DEFAULT_CAPABILITY_BY_STAGE[input.stage];
  const capability = getResearchCapabilityDefinition(capabilityId);
  if (capability === undefined) {
    throw new ResearchCapabilityResolutionError(
      "UNKNOWN_CAPABILITY",
      `Unknown Research capability '${capabilityId}'`,
    );
  }
  if (capability.stage !== input.stage) {
    throw new ResearchCapabilityResolutionError(
      "CAPABILITY_STAGE_MISMATCH",
      `Research capability '${capability.id}' belongs to stage '${capability.stage}', not '${input.stage}'`,
    );
  }

  return Object.freeze({ stage: input.stage, capability, selection });
}

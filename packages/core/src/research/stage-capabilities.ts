import type { QuestStage } from "./types.js";

export type DispatchableQuestStage = Exclude<QuestStage, "complete">;
export type ResearchExecutionHost = "claude" | "codex";

export type ResearchCapability =
  | "research.setup"
  | "research.framing"
  | "research.literature"
  | "research.ideation"
  | "research.experiment"
  | "research.computation"
  | "research.theory"
  | "research.audit"
  | "research.writing";

export type OptionalResearchSkill =
  | "research-project-setup"
  | "research-quest"
  | "research-literature"
  | "research-ideation"
  | "research-experiment"
  | "research-computation"
  | "research-theory"
  | "research-review-case"
  | "research-writing";

export type BundledResearchSkill =
  | "trellis-research-setup"
  | "trellis-research-quest"
  | "trellis-research-literature"
  | "trellis-research-ideation"
  | "trellis-research-experiment"
  | "trellis-research-computation"
  | "trellis-research-theory"
  | "trellis-research-audit"
  | "trellis-research-writing";

export type ResearchStageCapabilityDefinition =
  | {
      readonly dispatchable: true;
      readonly capability: ResearchCapability;
      readonly optionalSkill: OptionalResearchSkill;
      readonly fallbackSkill: BundledResearchSkill;
    }
  | {
      readonly dispatchable: false;
      readonly capability: null;
      readonly optionalSkill: null;
      readonly fallbackSkill: null;
    };

export const RESEARCH_STAGE_CAPABILITIES = {
  setup: {
    dispatchable: true,
    capability: "research.setup",
    optionalSkill: "research-project-setup",
    fallbackSkill: "trellis-research-setup",
  },
  framing: {
    dispatchable: true,
    capability: "research.framing",
    optionalSkill: "research-quest",
    fallbackSkill: "trellis-research-quest",
  },
  literature: {
    dispatchable: true,
    capability: "research.literature",
    optionalSkill: "research-literature",
    fallbackSkill: "trellis-research-literature",
  },
  ideation: {
    dispatchable: true,
    capability: "research.ideation",
    optionalSkill: "research-ideation",
    fallbackSkill: "trellis-research-ideation",
  },
  experiment: {
    dispatchable: true,
    capability: "research.experiment",
    optionalSkill: "research-experiment",
    fallbackSkill: "trellis-research-experiment",
  },
  computation: {
    dispatchable: true,
    capability: "research.computation",
    optionalSkill: "research-computation",
    fallbackSkill: "trellis-research-computation",
  },
  theory: {
    dispatchable: true,
    capability: "research.theory",
    optionalSkill: "research-theory",
    fallbackSkill: "trellis-research-theory",
  },
  audit: {
    dispatchable: true,
    capability: "research.audit",
    optionalSkill: "research-review-case",
    fallbackSkill: "trellis-research-audit",
  },
  writing: {
    dispatchable: true,
    capability: "research.writing",
    optionalSkill: "research-writing",
    fallbackSkill: "trellis-research-writing",
  },
  complete: {
    dispatchable: false,
    capability: null,
    optionalSkill: null,
    fallbackSkill: null,
  },
} as const satisfies Readonly<
  Record<QuestStage, ResearchStageCapabilityDefinition>
>;

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

export function normalizeDiscoveredResearchSkillNames(
  names: readonly string[],
): ReadonlySet<string> {
  const normalized = new Set<string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed.length > 0) normalized.add(trimmed);
  }
  return normalized;
}

export interface ResolveResearchStageCapabilityInput {
  readonly stage: QuestStage;
  readonly host: ResearchExecutionHost;
  readonly discoveredSkillNames: readonly string[];
}

export type ResearchStageCapabilityResolution =
  | {
      readonly stage: DispatchableQuestStage;
      readonly host: ResearchExecutionHost;
      readonly dispatchable: true;
      readonly capability: ResearchCapability;
      readonly optionalSkill: OptionalResearchSkill;
      readonly fallbackSkill: BundledResearchSkill;
      readonly selectedSkill: OptionalResearchSkill | BundledResearchSkill;
      readonly source: "host" | "bundled";
    }
  | {
      readonly stage: "complete";
      readonly host: ResearchExecutionHost;
      readonly dispatchable: false;
      readonly capability: null;
      readonly optionalSkill: null;
      readonly fallbackSkill: null;
      readonly selectedSkill: null;
      readonly source: null;
    };

export function resolveResearchStageCapability(
  input: ResolveResearchStageCapabilityInput,
): ResearchStageCapabilityResolution {
  const host = parseResearchExecutionHost(input.host);

  if (input.stage === "complete") {
    return {
      stage: input.stage,
      host,
      ...RESEARCH_STAGE_CAPABILITIES.complete,
      selectedSkill: null,
      source: null,
    };
  }

  const descriptor = RESEARCH_STAGE_CAPABILITIES[input.stage];
  const discoveredSkills = normalizeDiscoveredResearchSkillNames(
    input.discoveredSkillNames,
  );
  const useHostSkill = discoveredSkills.has(descriptor.optionalSkill);

  return {
    stage: input.stage,
    host,
    ...descriptor,
    selectedSkill: useHostSkill
      ? descriptor.optionalSkill
      : descriptor.fallbackSkill,
    source: useHostSkill ? "host" : "bundled",
  };
}

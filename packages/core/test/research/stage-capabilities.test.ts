import { describe, expect, it } from "vitest";

import {
  RESEARCH_EXECUTION_HOSTS,
  RESEARCH_STAGE_CAPABILITIES,
  normalizeDiscoveredResearchSkillNames,
  parseResearchExecutionHost,
  resolveResearchStageCapability,
  type QuestStage,
  type ResearchStageCapabilityDefinition,
} from "../../src/research/index.js";

const ACTIVE_STAGE_CAPABILITIES = {
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
} as const satisfies Readonly<
  Record<Exclude<QuestStage, "complete">, ResearchStageCapabilityDefinition>
>;

const ACTIVE_STAGES = Object.keys(ACTIVE_STAGE_CAPABILITIES) as (
  keyof typeof ACTIVE_STAGE_CAPABILITIES
)[];

const ALL_STAGES = [...ACTIVE_STAGES, "complete"] satisfies QuestStage[];

describe("Research stage capability descriptors", () => {
  it("defines exactly every Quest stage and marks nine as dispatchable", () => {
    expect(Object.keys(RESEARCH_STAGE_CAPABILITIES)).toEqual(ALL_STAGES);
    expect(
      Object.values(RESEARCH_STAGE_CAPABILITIES).filter(
        ({ dispatchable }) => dispatchable,
      ),
    ).toHaveLength(9);
  });

  it.each(ACTIVE_STAGES)("maps %s to its exact capability and skills", (stage) => {
    expect(RESEARCH_STAGE_CAPABILITIES[stage]).toEqual(
      ACTIVE_STAGE_CAPABILITIES[stage],
    );
  });

  it("makes complete explicitly non-dispatchable", () => {
    expect(RESEARCH_STAGE_CAPABILITIES.complete).toEqual({
      dispatchable: false,
      capability: null,
      optionalSkill: null,
      fallbackSkill: null,
    });
  });
});

describe("parseResearchExecutionHost", () => {
  it("accepts exactly the supported execution hosts", () => {
    expect(RESEARCH_EXECUTION_HOSTS).toEqual(["claude", "codex"]);
    expect(parseResearchExecutionHost("claude")).toBe("claude");
    expect(parseResearchExecutionHost("codex")).toBe("codex");
  });

  it.each(["", " ", "Claude", "CODEX", "claude-code", "opencode", "other"])(
    "rejects unsupported host %j",
    (host) => {
      expect(() => parseResearchExecutionHost(host)).toThrow(
        "research execution host must be one of: claude, codex",
      );
    },
  );
});

describe("normalizeDiscoveredResearchSkillNames", () => {
  it("trims, drops empty values, exactly deduplicates, and preserves input", () => {
    const input = [
      " research-literature ",
      "",
      "\t",
      "Research-Literature",
      "research-literature",
      "/research-literature",
    ] as const;

    expect([...normalizeDiscoveredResearchSkillNames(input)]).toEqual([
      "research-literature",
      "Research-Literature",
      "/research-literature",
    ]);
    expect(input).toEqual([
      " research-literature ",
      "",
      "\t",
      "Research-Literature",
      "research-literature",
      "/research-literature",
    ]);
  });
});

describe("resolveResearchStageCapability", () => {
  it.each(ACTIVE_STAGES)(
    "selects the exact optional host skill for %s",
    (stage) => {
      const descriptor = ACTIVE_STAGE_CAPABILITIES[stage];
      expect(
        resolveResearchStageCapability({
          stage,
          host: "claude",
          discoveredSkillNames: [
            descriptor.fallbackSkill,
            ` ${descriptor.optionalSkill} `,
            descriptor.optionalSkill,
          ],
        }),
      ).toEqual({
        stage,
        host: "claude",
        ...descriptor,
        selectedSkill: descriptor.optionalSkill,
        source: "host",
      });
    },
  );

  it.each(ACTIVE_STAGES)(
    "uses the bundled fallback for %s when no exact optional name exists",
    (stage) => {
      const descriptor = ACTIVE_STAGE_CAPABILITIES[stage];
      expect(
        resolveResearchStageCapability({
          stage,
          host: "codex",
          discoveredSkillNames: [
            descriptor.optionalSkill.toUpperCase(),
            `/${descriptor.optionalSkill}`,
            `$${descriptor.optionalSkill}`,
            `plugin:${descriptor.optionalSkill}`,
            descriptor.fallbackSkill,
          ],
        }),
      ).toEqual({
        stage,
        host: "codex",
        ...descriptor,
        selectedSkill: descriptor.fallbackSkill,
        source: "bundled",
      });
    },
  );

  it("is deterministic across discovery order and duplicates", () => {
    const first = resolveResearchStageCapability({
      stage: "audit",
      host: "claude",
      discoveredSkillNames: [
        "unrelated",
        "research-review-case",
        "research-review-case",
      ],
    });
    const second = resolveResearchStageCapability({
      stage: "audit",
      host: "claude",
      discoveredSkillNames: ["research-review-case", "unrelated"],
    });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      capability: "research.audit",
      optionalSkill: "research-review-case",
      fallbackSkill: "trellis-research-audit",
      selectedSkill: "research-review-case",
      source: "host",
    });
  });

  it.each(["research-writing", "trellis-research-writing", "anything"])(
    "never dispatches complete when %s is discovered",
    (discoveredSkill) => {
      expect(
        resolveResearchStageCapability({
          stage: "complete",
          host: "codex",
          discoveredSkillNames: [discoveredSkill],
        }),
      ).toEqual({
        stage: "complete",
        host: "codex",
        dispatchable: false,
        capability: null,
        optionalSkill: null,
        fallbackSkill: null,
        selectedSkill: null,
        source: null,
      });
    },
  );
});

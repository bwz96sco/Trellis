import { describe, expect, it } from "vitest";

import {
  RESEARCH_CAPABILITY_REGISTRY,
  RESEARCH_DEFAULT_CAPABILITY_BY_STAGE,
  RESEARCH_EXECUTION_HOSTS,
  ResearchCapabilityResolutionError,
  getResearchCapabilityDefinition,
  parseResearchExecutionHost,
  resolveResearchCapability,
  type DispatchableQuestStage,
  type ResearchCapabilityDefinition,
  type ResearchCapabilityResolutionErrorCode,
} from "../../src/research/index.js";

const BOUNDED_APPROVAL_REQUIREMENTS = [
  "network",
  "external-cost",
  "multiple-repositories",
  "canonical-mutation",
  "capability-chaining",
] as const;

const WORKFLOW_APPROVAL_REQUIREMENTS = [
  "workflow",
  ...BOUNDED_APPROVAL_REQUIREMENTS,
] as const;

const EXPECTED_CAPABILITIES = [
  {
    id: "research.setup.project",
    stage: "setup",
    kind: "workflow",
    activation: "explicit",
    procedure: { id: "project-setup-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: WORKFLOW_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.framing.quest",
    stage: "framing",
    kind: "bounded",
    activation: "automatic",
    procedure: { id: "quest-framing-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: BOUNDED_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.framing.admin",
    stage: "framing",
    kind: "workflow",
    activation: "explicit",
    procedure: { id: "quest-admin-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: WORKFLOW_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.literature.scan",
    stage: "literature",
    kind: "bounded",
    activation: "automatic",
    procedure: { id: "literature-scan-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: BOUNDED_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.literature.review",
    stage: "literature",
    kind: "workflow",
    activation: "explicit",
    procedure: { id: "literature-review-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "declared-only",
    repositoryScope: "multiple",
    maxDurationMinutes: 60,
    maxDispatches: 4,
    approvalRequiredFor: WORKFLOW_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.ideation.generate",
    stage: "ideation",
    kind: "bounded",
    activation: "automatic",
    procedure: { id: "idea-generation-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: BOUNDED_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.ideation.evaluate",
    stage: "ideation",
    kind: "workflow",
    activation: "explicit",
    procedure: { id: "idea-evaluation-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 30,
    maxDispatches: 2,
    approvalRequiredFor: WORKFLOW_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.experiment.round",
    stage: "experiment",
    kind: "bounded",
    activation: "automatic",
    procedure: { id: "experiment-round-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: BOUNDED_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.experiment.campaign",
    stage: "experiment",
    kind: "workflow",
    activation: "explicit",
    procedure: { id: "experiment-campaign-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "declared-only",
    repositoryScope: "multiple",
    maxDurationMinutes: 120,
    maxDispatches: 8,
    approvalRequiredFor: WORKFLOW_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.computation.case",
    stage: "computation",
    kind: "bounded",
    activation: "automatic",
    procedure: { id: "computation-case-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: BOUNDED_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.theory.case",
    stage: "theory",
    kind: "bounded",
    activation: "automatic",
    procedure: { id: "theory-case-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: BOUNDED_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.audit.case",
    stage: "audit",
    kind: "bounded",
    activation: "automatic",
    procedure: { id: "review-case-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: BOUNDED_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.audit.campaign",
    stage: "audit",
    kind: "workflow",
    activation: "explicit",
    procedure: { id: "review-campaign-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "multiple",
    maxDurationMinutes: 60,
    maxDispatches: 4,
    approvalRequiredFor: WORKFLOW_APPROVAL_REQUIREMENTS,
  },
  {
    id: "research.writing.case",
    stage: "writing",
    kind: "bounded",
    activation: "automatic",
    procedure: { id: "writing-case-v1", version: "1.0.0" },
    workerAuthority: "proposal-only",
    networkPolicy: "forbidden",
    repositoryScope: "single",
    maxDurationMinutes: 15,
    maxDispatches: 1,
    approvalRequiredFor: BOUNDED_APPROVAL_REQUIREMENTS,
  },
] as const satisfies readonly ResearchCapabilityDefinition[];

const EXPECTED_DEFAULTS = {
  setup: "research.setup.project",
  framing: "research.framing.quest",
  literature: "research.literature.scan",
  ideation: "research.ideation.generate",
  experiment: "research.experiment.round",
  computation: "research.computation.case",
  theory: "research.theory.case",
  audit: "research.audit.case",
  writing: "research.writing.case",
} as const;

function expectResolutionError(
  run: () => unknown,
  code: ResearchCapabilityResolutionErrorCode,
): ResearchCapabilityResolutionError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ResearchCapabilityResolutionError);
    expect(error).toMatchObject({ code });
    return error as ResearchCapabilityResolutionError;
  }
  throw new Error(`Expected Research capability error ${code}`);
}

describe("Research capability registry", () => {
  it("defines the exact frozen 14-entry inventory in canonical order", () => {
    expect(RESEARCH_CAPABILITY_REGISTRY).toEqual(EXPECTED_CAPABILITIES);
    expect(RESEARCH_CAPABILITY_REGISTRY.map(({ id }) => id)).toEqual(
      EXPECTED_CAPABILITIES.map(({ id }) => id),
    );
    expect(
      RESEARCH_CAPABILITY_REGISTRY.some(
        ({ stage, kind }) => stage === ("complete" as DispatchableQuestStage) || kind === "advisory",
      ),
    ).toBe(false);
  });

  it("looks up definitions exactly without relying on registry order", () => {
    for (const expected of [...EXPECTED_CAPABILITIES].reverse()) {
      expect(getResearchCapabilityDefinition(expected.id)).toEqual(expected);
    }
    expect(getResearchCapabilityDefinition("")).toBeUndefined();
    expect(getResearchCapabilityDefinition(" research.audit.case ")).toBeUndefined();
    expect(getResearchCapabilityDefinition("RESEARCH.AUDIT.CASE")).toBeUndefined();
  });

  it("publishes an explicit default for every dispatchable stage", () => {
    expect(RESEARCH_DEFAULT_CAPABILITY_BY_STAGE).toEqual(EXPECTED_DEFAULTS);
    for (const [stage, capabilityId] of Object.entries(EXPECTED_DEFAULTS)) {
      expect(getResearchCapabilityDefinition(capabilityId)?.stage).toBe(stage);
    }
  });

  it("runtime-freezes every authority-bearing registry layer", () => {
    expect(Object.isFrozen(RESEARCH_CAPABILITY_REGISTRY)).toBe(true);
    expect(Object.isFrozen(RESEARCH_DEFAULT_CAPABILITY_BY_STAGE)).toBe(true);
    for (const definition of RESEARCH_CAPABILITY_REGISTRY) {
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.procedure)).toBe(true);
      expect(Object.isFrozen(definition.approvalRequiredFor)).toBe(true);
      expect(Reflect.set(definition, "maxDispatches", 99)).toBe(false);
      expect(Reflect.set(definition.procedure, "id", "changed")).toBe(false);
      expect(Reflect.set(definition.approvalRequiredFor, 0, "workflow")).toBe(
        false,
      );
    }
    expect(
      Reflect.set(
        RESEARCH_DEFAULT_CAPABILITY_BY_STAGE,
        "audit",
        "research.audit.campaign",
      ),
    ).toBe(false);
  });
});

describe("resolveResearchCapability", () => {
  it.each(Object.entries(EXPECTED_DEFAULTS))(
    "selects the explicit default for %s",
    (stage, capabilityId) => {
      const resolution = resolveResearchCapability({
        stage: stage as DispatchableQuestStage,
      });
      expect(resolution).toEqual({
        stage,
        capability: getResearchCapabilityDefinition(capabilityId),
        selection: "default",
      });
      expect(Object.isFrozen(resolution.capability)).toBe(true);
    },
  );

  it.each(EXPECTED_CAPABILITIES)(
    "selects explicit capability $id",
    (definition) => {
      expect(
        resolveResearchCapability({
          stage: definition.stage,
          capabilityId: definition.id,
        }),
      ).toEqual({
        stage: definition.stage,
        capability: definition,
        selection: "explicit",
      });
    },
  );

  it("allows the alternate workflow capability for a matching stage", () => {
    expect(
      resolveResearchCapability({
        stage: "literature",
        capabilityId: "research.literature.review",
      }),
    ).toMatchObject({
      stage: "literature",
      selection: "explicit",
      capability: {
        id: "research.literature.review",
        kind: "workflow",
        activation: "explicit",
      },
    });
  });

  it.each([
    "",
    " ",
    "Research.audit.case",
    "research.audit.case ",
    "/research.audit.case",
    "plugin:research.audit.case",
    "research.unknown.case",
  ])("rejects unknown explicit capability %j", (capabilityId) => {
    expectResolutionError(
      () => resolveResearchCapability({ stage: "audit", capabilityId }),
      "UNKNOWN_CAPABILITY",
    );
  });

  it("rejects a known capability bound to another stage", () => {
    expectResolutionError(
      () =>
        resolveResearchCapability({
          stage: "writing",
          capabilityId: "research.audit.case",
        }),
      "CAPABILITY_STAGE_MISMATCH",
    );
  });

  it.each(["complete", "unknown", "", null, 1])(
    "rejects non-dispatchable runtime stage %j before capability lookup",
    (stage) => {
      const error = expectResolutionError(
        () =>
          resolveResearchCapability({
            stage: stage as never,
            capabilityId: "research.unknown.case",
          }),
        "QUEST_STAGE_NOT_DISPATCHABLE",
      );
      expect(error.message).toContain(String(stage));
    },
  );

  it("contains no host, discovery, Skill, fallback, or source routing fields", () => {
    const resolution = resolveResearchCapability({ stage: "framing" });
    const serialized = JSON.stringify(resolution).toLowerCase();
    for (const forbidden of [
      "host",
      "discover",
      "skill",
      "fallback",
      "selected",
      "source",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
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

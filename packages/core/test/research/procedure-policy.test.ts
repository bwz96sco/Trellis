import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
  RESEARCH_CAPABILITY_REGISTRY,
  ResearchProcedurePolicyError,
  computeResearchProcedureDigest,
  evaluateResearchAutomaticEligibility,
  parseResearchProcedure,
  parseResearchProjectPolicy,
  resolveResearchEffectiveAuthority,
  stableResearchJson,
  type ResearchCapabilityDefinition,
  type ResearchEffectiveAuthority,
} from "../../src/research/index.js";

const encoder = new TextEncoder();
const COMMON_INPUTS = [
  "dispatch",
  "repository",
  "context",
  "artifacts",
  "allowedWritePaths",
  "expectedOutputs",
  "checks",
];
const COMMON_OUTPUTS = ["result", "proposal"];

function manifestJson(
  capability: ResearchCapabilityDefinition,
  overrides: Record<string, unknown> = {},
): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    id: capability.procedure.id,
    version: capability.procedure.version,
    stage: capability.stage,
    kind: capability.kind,
    inputs: COMMON_INPUTS,
    outputs: COMMON_OUTPUTS,
    networkPolicy: capability.networkPolicy,
    repositoryScope: capability.repositoryScope,
    maxDurationMinutes: capability.maxDurationMinutes,
    maxDispatches: capability.maxDispatches,
    ...overrides,
  })}\n`;
}

function parseBundled(
  capability: ResearchCapabilityDefinition,
  overrides: Record<string, unknown> = {},
  instructions = "# Procedure\n",
) {
  return parseResearchProcedure({
    capabilityId: capability.id,
    source: "bundled",
    manifestBytes: encoder.encode(manifestJson(capability, overrides)),
    instructionBytes: encoder.encode(instructions),
  });
}

function policyJson(value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(value, null, 2)}\n`);
}

function conservativePolicy(overrides: Record<string, unknown> = {}): unknown {
  return {
    schemaVersion: 1,
    defaults: {
      automaticEnabled: false,
      maxDurationMinutes: 15,
      maxDispatches: 1,
      allowNetwork: false,
      allowExternalCost: false,
      allowMultipleRepositories: false,
      allowCanonicalMutation: false,
      allowCapabilityChaining: false,
    },
    capabilities: {},
    ...overrides,
  };
}

describe("Research Procedure contracts", () => {
  it("accepts the exact canonical bundled manifest for every capability", () => {
    for (const capability of RESEARCH_CAPABILITY_REGISTRY) {
      const parsed = parseBundled(capability);
      expect(parsed.capability).toBe(capability);
      expect(parsed.manifest.id).toBe(capability.procedure.id);
      expect(parsed.canonicalManifestJson).toBe(manifestJson(capability));
      expect(parsed.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(Object.isFrozen(parsed)).toBe(true);
      expect(Object.isFrozen(parsed.manifest)).toBe(true);
      expect(Object.isFrozen(parsed.manifest.inputs)).toBe(true);
    }
  });

  it.each([
    ["pretty", (text: string) => `${JSON.stringify(JSON.parse(text), null, 2)}\n`],
    ["reordered", (text: string) => `{"id":"x",${text.slice(1)}`],
    ["CRLF", (text: string) => text.replace(/\n/g, "\r\n")],
    ["extra LF", (text: string) => `${text}\n`],
    ["missing LF", (text: string) => text.slice(0, -1)],
  ])("rejects non-canonical %s manifest bytes", (_label, transform) => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[1];
    expect(() =>
      parseResearchProcedure({
        capabilityId: capability.id,
        source: "bundled",
        manifestBytes: encoder.encode(transform(manifestJson(capability))),
        instructionBytes: encoder.encode("instructions"),
      }),
    ).toThrow(ResearchProcedurePolicyError);
  });

  it.each([
    "schemaVersion",
    "id",
    "version",
    "stage",
    "kind",
    "inputs",
    "outputs",
    "networkPolicy",
    "repositoryScope",
  ])("rejects a manifest missing required key %s", (key) => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[9];
    const manifest = Object.fromEntries(
      Object.entries(
        JSON.parse(manifestJson(capability)) as Record<string, unknown>,
      ).filter(([manifestKey]) => manifestKey !== key),
    );

    expect(() =>
      parseResearchProcedure({
        capabilityId: capability.id,
        source: "bundled",
        manifestBytes: encoder.encode(`${JSON.stringify(manifest)}\n`),
        instructionBytes: encoder.encode("instructions"),
      }),
    ).toThrow(`missing required key '${key}'`);
  });

  it.each([
    ["invalid id", { id: "Computation-case-v1" }],
    ["invalid stage", { stage: "audit" }],
    ["invalid kind", { kind: "workflow" }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => parseBundled(RESEARCH_CAPABILITY_REGISTRY[9], overrides)).toThrow(
      ResearchProcedurePolicyError,
    );
  });

  it.each([
    ["build metadata", "1.0.0+build.1"],
    ["leading whitespace", " 1.0.0"],
    ["trailing whitespace", "1.0.0 "],
    ["leading-zero core component", "01.0.0"],
    ["leading-zero numeric prerelease identifier", "1.0.0-alpha.01"],
  ])("rejects SemVer with %s", (_label, version) => {
    expect(() =>
      parseBundled(RESEARCH_CAPABILITY_REGISTRY[9], { version }),
    ).toThrow(ResearchProcedurePolicyError);
  });

  it("accepts valid prerelease grammar before enforcing registry identity", () => {
    expect(() =>
      parseBundled(RESEARCH_CAPABILITY_REGISTRY[9], {
        version: "1.0.0-alpha.1",
      }),
    ).toThrow(/identity does not match capability binding/);
  });

  it("requires exact project replacement identity", () => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[9];
    const parsed = parseResearchProcedure({
      capabilityId: capability.id,
      source: "project",
      manifestBytes: encoder.encode(
        manifestJson(capability, {
          replaces: {
            id: capability.procedure.id,
            version: capability.procedure.version,
          },
        }),
      ),
      instructionBytes: encoder.encode("project instructions"),
    });
    expect(parsed.source).toBe("project");
    expect(parsed.manifest.replaces).toEqual(capability.procedure);
    expect(() =>
      parseResearchProcedure({
        capabilityId: capability.id,
        source: "project",
        manifestBytes: encoder.encode(manifestJson(capability)),
        instructionBytes: encoder.encode("project instructions"),
      }),
    ).toThrow(/replaces/);
  });

  it("matches fixed digest vectors for replacement, omitted limits, and array order", () => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[9];
    const replacement = parseResearchProcedure({
      capabilityId: capability.id,
      source: "project",
      manifestBytes: encoder.encode(
        manifestJson(capability, {
          replaces: {
            id: capability.procedure.id,
            version: capability.procedure.version,
          },
        }),
      ),
      instructionBytes: encoder.encode("project instructions"),
    });
    expect(replacement.digest).toBe(
      "sha256:d7ed70074e08291d2d21cf23be1258cca6fa0be0d89c35171ecd7e2145707cf2",
    );

    const omittedLimits = parseBundled(
      capability,
      { maxDurationMinutes: undefined, maxDispatches: undefined },
      "omitted limits\n",
    );
    expect(omittedLimits.manifest).not.toHaveProperty("maxDurationMinutes");
    expect(omittedLimits.manifest).not.toHaveProperty("maxDispatches");
    expect(omittedLimits.digest).toBe(
      "sha256:3a45cc5d235ce717707eb6472f789b25f481c32fbf7218b79e64d5b8af9dcfa5",
    );

    const originalOrder = parseBundled(capability, {}, "array order\n");
    const reorderedInputs = parseBundled(
      capability,
      {
        inputs: ["repository", "dispatch", ...COMMON_INPUTS.slice(2)],
      },
      "array order\n",
    );
    expect(originalOrder.digest).toBe(
      "sha256:ca4361b9ab17773364ccd6a631437db4927aa78185bbc4db251b36bc1a2e4910",
    );
    expect(reorderedInputs.digest).toBe(
      "sha256:053dfd55cf239828c833a237e9f23aad36fa425f6731eb5972ce7f927f10c2da",
    );
  });

  it("rejects identity, array, limit, and authority widening", () => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[1];
    for (const overrides of [
      { id: "other-v1" },
      { version: "v1.0.0" },
      { inputs: ["dispatch", "dispatch"] },
      { outputs: [] },
      { maxDurationMinutes: 16 },
      { maxDispatches: 2 },
      { networkPolicy: "declared-only" },
      { repositoryScope: "multiple" },
      { unknown: true },
    ]) {
      expect(() => parseBundled(capability, overrides)).toThrow(
        ResearchProcedurePolicyError,
      );
    }
  });

  it("hashes exact manifest framing and instruction bytes", () => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[9];
    const manifest = encoder.encode(manifestJson(capability));
    const instructions = encoder.encode("Unicode π\r\n");
    const expected = createHash("sha256")
      .update(encoder.encode("trellis-research-procedure-digest-v1\0"))
      .update(manifest.subarray(0, manifest.length - 1))
      .update(Uint8Array.of(0x0a))
      .update(instructions)
      .digest("hex");
    expect(
      computeResearchProcedureDigest({
        canonicalManifestBytes: manifest,
        instructionBytes: instructions,
      }),
    ).toBe(`sha256:${expected}`);
    expect(parseBundled(capability, {}, "line\n").digest).not.toBe(
      parseBundled(capability, {}, "line\r\n").digest,
    );
    expect(parseBundled(capability, {}, "line").digest).not.toBe(
      parseBundled(capability, {}, "line\n").digest,
    );
  });

  it("rejects invalid instruction bytes", () => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[1];
    for (const instructionBytes of [
      new Uint8Array(),
      Uint8Array.from([0xef, 0xbb, 0xbf, 0x78]),
      Uint8Array.from([0x78, 0x00]),
      Uint8Array.from([0xc3, 0x28]),
    ]) {
      expect(() =>
        parseResearchProcedure({
          capabilityId: capability.id,
          source: "bundled",
          manifestBytes: encoder.encode(manifestJson(capability)),
          instructionBytes,
        }),
      ).toThrow(ResearchProcedurePolicyError);
    }
  });
});

describe("Research project policy and effective authority", () => {
  it("parses the exact conservative policy and freezes all semantic layers", () => {
    const parsed = parseResearchProjectPolicy(
      encoder.encode(CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON),
    );
    expect(parsed.policy).toEqual(conservativePolicy());
    expect(parsed.sourceJson).toBe(CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON);
    expect(parsed.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.policy)).toBe(true);
    expect(Object.isFrozen(parsed.policy.defaults)).toBe(true);
    expect(Object.isFrozen(parsed.policy.capabilities)).toBe(true);
  });

  it("rejects malformed policy bytes, structure, and limits", () => {
    for (const bytes of [
      Uint8Array.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]),
      Uint8Array.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xc3, 0x28, 0x7d]),
      encoder.encode(
        '{"schemaVersion":1,"schemaVersion":1,"defaults":{},"capabilities":{}}',
      ),
    ]) {
      expect(() => parseResearchProjectPolicy(bytes)).toThrow(
        ResearchProcedurePolicyError,
      );
    }

    for (const value of [
      { schemaVersion: 1, capabilities: {} },
      { ...conservativePolicy(), schemaVersion: 2 },
      {
        ...conservativePolicy(),
        defaults: {
          ...(conservativePolicy() as { defaults: Record<string, unknown> })
            .defaults,
          maxDurationMinutes: 0,
        },
      },
      {
        ...conservativePolicy(),
        defaults: {
          ...(conservativePolicy() as { defaults: Record<string, unknown> })
            .defaults,
          maxDispatches: 1.5,
        },
      },
      {
        ...conservativePolicy(),
        capabilities: { "research.framing.quest": { unknown: false } },
      },
    ]) {
      expect(() => parseResearchProjectPolicy(policyJson(value))).toThrow(
        ResearchProcedurePolicyError,
      );
    }
  });

  it("classifies every literal policy authority grant as widening", () => {
    const allowKeys = [
      "allowNetwork",
      "allowExternalCost",
      "allowMultipleRepositories",
      "allowCanonicalMutation",
      "allowCapabilityChaining",
    ] as const;
    for (const key of allowKeys) {
      const defaults = {
        ...(conservativePolicy() as { defaults: Record<string, unknown> }).defaults,
        [key]: true,
      };
      const capabilityOverride = {
        [key]: true,
      };
      for (const value of [
        { ...conservativePolicy(), defaults },
        {
          ...conservativePolicy(),
          capabilities: { "research.framing.quest": capabilityOverride },
        },
      ]) {
        try {
          parseResearchProjectPolicy(policyJson(value));
          throw new Error("expected policy widening failure");
        } catch (error) {
          expect(error).toBeInstanceOf(ResearchProcedurePolicyError);
          expect(error).toMatchObject({ code: "POLICY_WIDENS_AUTHORITY" });
        }
      }
    }
  });

  it("makes policy digest formatting-independent and semantics-sensitive", () => {
    const value = conservativePolicy();
    const compact = parseResearchProjectPolicy(encoder.encode(JSON.stringify(value)));
    const pretty = parseResearchProjectPolicy(policyJson(value));
    expect(compact.digest).toBe(pretty.digest);
    expect(compact.digest).toBe(
      `sha256:${createHash("sha256")
        .update(encoder.encode("trellis-research-policy-digest-v1\0"))
        .update(encoder.encode(stableResearchJson(pretty.policy)))
        .digest("hex")}`,
    );
    const enabled = parseResearchProjectPolicy(
      policyJson({
        ...(value as Record<string, unknown>),
        defaults: {
          ...(value as { defaults: Record<string, unknown> }).defaults,
          automaticEnabled: true,
        },
      }),
    );
    expect(enabled.digest).not.toBe(pretty.digest);
  });

  it.each([
    ["unknown root key", { ...conservativePolicy(), extra: true }, "INVALID_RESEARCH_POLICY"],
    ["unknown capability", {
      ...conservativePolicy(),
      capabilities: { "research.unknown": {} },
    }, "INVALID_RESEARCH_POLICY"],
    ["network grant", {
      ...conservativePolicy(),
      defaults: {
        ...(conservativePolicy() as { defaults: Record<string, unknown> }).defaults,
        allowNetwork: true,
      },
    }, "POLICY_WIDENS_AUTHORITY"],
    ["automatic override", {
      ...conservativePolicy(),
      capabilities: { "research.framing.quest": { activation: "automatic" } },
    }, "POLICY_WIDENS_AUTHORITY"],
    ["override above default", {
      ...conservativePolicy(),
      capabilities: { "research.framing.quest": { maxDurationMinutes: 16 } },
    }, "POLICY_WIDENS_AUTHORITY"],
  ])("classifies %s", (_label, value, code) => {
    try {
      parseResearchProjectPolicy(policyJson(value));
      throw new Error("expected policy parse failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ResearchProcedurePolicyError);
      expect(error).toMatchObject({ code });
    }
  });

  it("merges every capability through Procedure, defaults, and override ceilings", () => {
    const policy = parseResearchProjectPolicy(
      policyJson({
        ...(conservativePolicy() as Record<string, unknown>),
        defaults: {
          ...(conservativePolicy() as { defaults: Record<string, unknown> }).defaults,
          automaticEnabled: true,
          maxDurationMinutes: 200,
          maxDispatches: 20,
        },
        capabilities: {
          "research.literature.review": {
            enabled: true,
            activation: "explicit",
            maxDurationMinutes: 30,
            maxDispatches: 2,
            allowNetwork: false,
            allowMultipleRepositories: false,
          },
          "research.writing.case": { enabled: false },
        },
      }),
    );

    for (const capability of RESEARCH_CAPABILITY_REGISTRY) {
      const procedure = parseBundled(capability);
      const authority = resolveResearchEffectiveAuthority({
        capabilityId: capability.id,
        procedure,
        policy,
      });
      expect(authority.capabilityId).toBe(capability.id);
      expect(authority.workerAuthority).toBe("proposal-only");
      expect(authority.networkPolicy).toBe("forbidden");
      expect(authority.repositoryScope).toBe("single");
      expect(authority.maxDurationMinutes).toBeLessThanOrEqual(
        capability.maxDurationMinutes,
      );
      expect(authority.maxDispatches).toBeLessThanOrEqual(
        capability.maxDispatches,
      );
      expect(Object.isFrozen(authority)).toBe(true);
      expect(Object.isFrozen(authority.procedure)).toBe(true);
    }

    const review = resolveResearchEffectiveAuthority({
      capabilityId: "research.literature.review",
      procedure: parseBundled(RESEARCH_CAPABILITY_REGISTRY[4]),
      policy,
    });
    expect(review).toMatchObject({
      activation: "explicit",
      maxDurationMinutes: 30,
      maxDispatches: 2,
      enabled: true,
    });
    const writing = resolveResearchEffectiveAuthority({
      capabilityId: "research.writing.case",
      procedure: parseBundled(RESEARCH_CAPABILITY_REGISTRY[13]),
      policy,
    });
    expect(writing.enabled).toBe(false);
  });

  it("inherits registry ceilings when Procedure limits are omitted", () => {
    const capability = RESEARCH_CAPABILITY_REGISTRY[4];
    const procedure = parseBundled(capability, {
      maxDurationMinutes: undefined,
      maxDispatches: undefined,
    });
    const policy = parseResearchProjectPolicy(
      policyJson({
        ...(conservativePolicy() as Record<string, unknown>),
        defaults: {
          ...(conservativePolicy() as { defaults: Record<string, unknown> })
            .defaults,
          maxDurationMinutes: 200,
          maxDispatches: 20,
        },
      }),
    );

    expect(procedure.manifest).not.toHaveProperty("maxDurationMinutes");
    expect(procedure.manifest).not.toHaveProperty("maxDispatches");
    expect(
      resolveResearchEffectiveAuthority({
        capabilityId: capability.id,
        procedure,
        policy,
      }),
    ).toMatchObject({
      maxDurationMinutes: capability.maxDurationMinutes,
      maxDispatches: capability.maxDispatches,
    });
  });

  it("returns every automatic ineligibility reason in stable order", () => {
    const procedure = parseBundled(RESEARCH_CAPABILITY_REGISTRY[0]);
    const policy = parseResearchProjectPolicy(
      encoder.encode(CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON),
    );
    const authority = resolveResearchEffectiveAuthority({
      capabilityId: procedure.capability.id,
      procedure,
      policy,
    });
    expect(evaluateResearchAutomaticEligibility(authority)).toEqual({
      eligible: false,
      reasons: [
        "AUTOMATIC_POLICY_DISABLED",
        "CAPABILITY_NOT_BOUNDED",
        "ACTIVATION_NOT_AUTOMATIC",
      ],
    });

    const everyFailure = {
      ...authority,
      enabled: false,
      automaticPolicyEnabled: false,
      kind: "workflow",
      activation: "explicit",
      networkPolicy: "declared-only",
      allowExternalCost: true,
      repositoryScope: "multiple",
      allowCanonicalMutation: true,
      allowCapabilityChaining: true,
      maxDispatches: 2,
      maxDurationMinutes: 16,
    } as unknown as ResearchEffectiveAuthority;
    expect(evaluateResearchAutomaticEligibility(everyFailure)).toEqual({
      eligible: false,
      reasons: [
        "CAPABILITY_DISABLED",
        "AUTOMATIC_POLICY_DISABLED",
        "CAPABILITY_NOT_BOUNDED",
        "ACTIVATION_NOT_AUTOMATIC",
        "NETWORK_NOT_FORBIDDEN",
        "EXTERNAL_COST_ALLOWED",
        "REPOSITORY_SCOPE_NOT_SINGLE",
        "CANONICAL_MUTATION_ALLOWED",
        "CAPABILITY_CHAINING_ALLOWED",
        "MAX_DISPATCHES_EXCEEDED",
        "MAX_DURATION_EXCEEDED",
      ],
    });

    const automaticPolicy = parseResearchProjectPolicy(
      policyJson({
        ...(conservativePolicy() as Record<string, unknown>),
        defaults: {
          ...(conservativePolicy() as { defaults: Record<string, unknown> }).defaults,
          automaticEnabled: true,
        },
      }),
    );
    const bounded = parseBundled(RESEARCH_CAPABILITY_REGISTRY[9]);
    expect(
      evaluateResearchAutomaticEligibility(
        resolveResearchEffectiveAuthority({
          capabilityId: bounded.capability.id,
          procedure: bounded,
          policy: automaticPolicy,
        }),
      ),
    ).toEqual({ eligible: true, reasons: [] });
  });
});

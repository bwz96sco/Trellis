import { describe, expect, it } from "vitest";

import {
  parseResearchWorkflowDefinitionV1,
  ResearchWorkflowError,
} from "../../src/research/index.js";

const encoder = new TextEncoder();
const identity = {
  id: "research-one",
  version: "1.0.0",
  schemaVersion: 3,
  packageKind: "skill",
  packageDigest: `sha256:${"1".repeat(64)}`,
  instructionDigest: `sha256:${"2".repeat(64)}`,
  memberInventoryDigest: `sha256:${"3".repeat(64)}`,
} as const;

function definition(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    id: "review-flow",
    version: "1.0.0",
    startNodeIds: ["one"],
    nodes: [
      {
        id: "one",
        executionPackage: identity,
        allowedProfiles: ["managed", "lightweight"],
        stop: true,
      },
      {
        id: "two",
        executionPackage: { ...identity, id: "research-two" },
        allowedProfiles: ["lightweight"],
        stop: true,
      },
    ],
    transitions: [
      {
        id: "advance",
        fromNodeId: "one",
        toNodeId: "two",
        requiredRefs: [],
        requiredGateIds: [],
      },
    ],
    ...overrides,
  };
}

function parse(value: unknown) {
  return parseResearchWorkflowDefinitionV1(
    encoder.encode(JSON.stringify(value)),
  );
}

describe("Core Workflow definition v1", () => {
  it("normalizes unordered values, deeply freezes the result, and keeps a stable digest", () => {
    const first = parse(definition());
    const second = parse({
      ...definition(),
      startNodeIds: ["one"],
      nodes: [...definition().nodes].reverse(),
      transitions: [
        {
          ...definition().transitions[0],
          requiredGateIds: [],
          requiredRefs: [],
        },
      ],
    });

    expect(first.workflowDigest).toBe(
      "sha256:8b5748511b96d596d5b9759f9b954546f49b2fea12deb8f6f1d5e1c4ad738e95",
    );
    expect(second.workflowDigest).toBe(first.workflowDigest);
    expect(first.definition.nodes.map((node) => node.id)).toEqual(["one", "two"]);
    expect(first.definition.nodes[0]?.allowedProfiles).toEqual([
      "lightweight",
      "managed",
    ]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.definition)).toBe(true);
    expect(Object.isFrozen(first.definition.nodes)).toBe(true);
    expect(Object.isFrozen(first.definition.nodes[0]?.executionPackage)).toBe(true);
  });

  it("rejects duplicate JSON keys and unknown fields", () => {
    expect(() =>
      parseResearchWorkflowDefinitionV1(
        encoder.encode(
          '{"schemaVersion":1,"schemaVersion":1,"id":"review-flow","version":"1.0.0","startNodeIds":["one"],"nodes":[],"transitions":[]}',
        ),
      ),
    ).toThrow(ResearchWorkflowError);
    expect(() => parse({ ...definition(), unexpected: true })).toThrow(
      /unexpected is not supported/,
    );
  });

  it("rejects duplicate semantic values, stop false, missing endpoints, self-edges, and cycles", () => {
    expect(() =>
      parse({ ...definition(), startNodeIds: ["one", "one"] }),
    ).toThrow(/unique/);
    expect(() =>
      parse({
        ...definition(),
        nodes: [
          { ...definition().nodes[0], stop: false },
          definition().nodes[1],
        ],
      }),
    ).toThrow(/stop must be true/);
    expect(() =>
      parse({
        ...definition(),
        transitions: [
          { ...definition().transitions[0], toNodeId: "missing" },
        ],
      }),
    ).toThrow(/missing node/);
    expect(() =>
      parse({
        ...definition(),
        transitions: [
          {
            ...definition().transitions[0],
            fromNodeId: "one",
            toNodeId: "one",
          },
        ],
      }),
    ).toThrow(/self-edge/);
    expect(() =>
      parse({
        ...definition(),
        transitions: [
          definition().transitions[0],
          {
            id: "return",
            fromNodeId: "two",
            toNodeId: "one",
            requiredRefs: [],
            requiredGateIds: [],
          },
        ],
      }),
    ).toThrow(/acyclic/);
  });

  it("normalizes required refs and gates and rejects duplicates", () => {
    const artifact = "artifact:art_11111111-1111-4111-8111-111111111111";
    const result = "result:res_22222222-2222-4222-8222-222222222222";
    const parsed = parse({
      ...definition(),
      transitions: [
        {
          ...definition().transitions[0],
          requiredRefs: [result, artifact],
          requiredGateIds: ["H2", "H1"],
        },
      ],
    });
    expect(parsed.definition.transitions[0]?.requiredRefs).toEqual([
      artifact,
      result,
    ]);
    expect(parsed.definition.transitions[0]?.requiredGateIds).toEqual([
      "H1",
      "H2",
    ]);
    expect(() =>
      parse({
        ...definition(),
        transitions: [
          {
            ...definition().transitions[0],
            requiredRefs: [artifact, artifact],
          },
        ],
      }),
    ).toThrow(/unique/);
  });
});

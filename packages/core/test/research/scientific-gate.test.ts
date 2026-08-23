import { describe, expect, it } from "vitest";

import {
  normalizeScientificGateEvidenceRefs,
  normalizeScientificGateRefs,
  parseScientificGateDecision,
  parseScientificGateId,
  parseScientificGateRecord,
  parseWorkflowTransitionRecordPayload,
} from "../../src/research/index.js";

const GTR_H2 = "gtr_00000000-0000-4000-8000-000000000002";
const GTR_H1 = "gtr_00000000-0000-4000-8000-000000000001";
const ART = "art_00000000-0000-4000-8000-000000000001";

function record() {
  return {
    id: GTR_H1,
    questId: "qst_00000000-0000-4000-8000-000000000001",
    workflowInstanceId: "wfi_00000000-0000-4000-8000-000000000001",
    workflowId: "review-flow",
    workflowVersion: "1.0.0",
    workflowDigest: `sha256:${"1".repeat(64)}`,
    nodeId: "review",
    gateId: "H1",
    decision: "approve",
    actor: " reviewer ",
    rationale: " accepted ",
    approvedRefs: ["candidate:one"],
    rejectedRefs: [],
    evidenceRefs: [ART],
    sourceArtifactId: ART,
    recordedAt: "2026-08-23T00:00:00.000Z",
  };
}

describe("Research scientific gates", () => {
  it("parses the closed H1/H2 decision vocabulary and preserves decoded text", () => {
    expect(parseScientificGateId("H1")).toBe("H1");
    expect(parseScientificGateDecision("reject")).toBe("reject");
    expect(parseScientificGateRecord(record())).toMatchObject({
      actor: " reviewer ",
      rationale: " accepted ",
    });
    expect(() => parseScientificGateId("h1")).toThrow(/H1 or H2/);
    expect(() => parseScientificGateDecision("approved")).toThrow(
      /approve or reject/,
    );
    expect(() =>
      parseScientificGateRecord({ ...record(), extra: true }),
    ).toThrow(/not supported/);
  });

  it("validates scientific refs and normalizes evidence refs lexically", () => {
    expect(
      normalizeScientificGateRefs({
        approvedRefs: ["candidate:two", "candidate:one"],
        rejectedRefs: ["candidate:three"],
      }),
    ).toEqual({
      approvedRefs: ["candidate:two", "candidate:one"],
      rejectedRefs: ["candidate:three"],
    });
    expect(
      normalizeScientificGateEvidenceRefs([
        "art_00000000-0000-4000-8000-000000000002",
        ART,
      ]),
    ).toEqual([ART, "art_00000000-0000-4000-8000-000000000002"]);
    expect(() =>
      normalizeScientificGateRefs({
        approvedRefs: [" candidate:one"],
        rejectedRefs: [],
      }),
    ).toThrow(/surrounding whitespace/);
    expect(() =>
      normalizeScientificGateRefs({
        approvedRefs: ["candidate:one"],
        rejectedRefs: ["candidate:one"],
      }),
    ).toThrow(/both approved and rejected/);
  });

  it("preserves transition gate-record order after typed ID validation", () => {
    expect(
      parseWorkflowTransitionRecordPayload({
        workflowInstanceId: "wfi_00000000-0000-4000-8000-000000000001",
        questId: "qst_00000000-0000-4000-8000-000000000001",
        workflowId: "review-flow",
        workflowVersion: "1.0.0",
        workflowDigest: `sha256:${"1".repeat(64)}`,
        transitionId: "advance",
        fromNodeId: "one",
        toNodeId: "two",
        selectedBy: "operator",
        gateRecordIds: [GTR_H2, GTR_H1],
        selectedAt: "2026-08-23T00:00:00.000Z",
      }).gateRecordIds,
    ).toEqual([GTR_H2, GTR_H1]);
  });
});

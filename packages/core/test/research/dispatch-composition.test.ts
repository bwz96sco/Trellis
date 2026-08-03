import { describe, expect, it } from "vitest";

import {
  planRootCompositionAction,
  listRootCompositionEdgeIds,
} from "../../src/research/index.js";

describe("root-owned composition planning", () => {
  it("plans child dispatch for COMP-001 and adapter for COMP-003", () => {
    expect(listRootCompositionEdgeIds()).toEqual([
      "COMP-001",
      "COMP-002",
      "COMP-003",
    ]);
    const child = planRootCompositionAction({
      schemaVersion: 1,
      compositionId: "c1",
      edgeId: "COMP-001",
      parentDispatchId: "dsp_p",
      parentActivationId: "act_p",
      parentCapabilityId: "research.experiment.campaign",
      childCapabilityOrAdapterId: "research.experiment.round",
      maxChildren: 1,
      remainingDispatchBudget: 1,
      procedureDigest: "sha256:p",
      policyDigest: "sha256:y",
      requestDigest: "sha256:r",
      rootAuthorizationEvidence: "root",
    });
    expect(child.ok).toBe(true);
    if (child.ok) {
      expect(child.action.kind).toBe("create-child-dispatch");
      expect(child.action.childCapabilityId).toBe("research.experiment.round");
    }
    const adapter = planRootCompositionAction({
      schemaVersion: 1,
      compositionId: "c3",
      edgeId: "COMP-003",
      parentDispatchId: "dsp_p",
      parentActivationId: "act_p",
      parentCapabilityId: "research.writing.slides",
      childCapabilityOrAdapterId: "personal-slides",
      maxChildren: 1,
      remainingDispatchBudget: 1,
      procedureDigest: "sha256:p",
      policyDigest: "sha256:y",
      requestDigest: "sha256:r",
      rootAuthorizationEvidence: "root",
    });
    expect(adapter.ok).toBe(true);
    if (adapter.ok) {
      expect(adapter.action.kind).toBe("invoke-bounded-adapter");
    }
  });

  it("rejects worker-invalid parent without planning", () => {
    const bad = planRootCompositionAction({
      schemaVersion: 1,
      compositionId: "bad",
      edgeId: "COMP-001",
      parentDispatchId: "dsp_p",
      parentActivationId: "act_p",
      parentCapabilityId: "research.ideation.generate",
      childCapabilityOrAdapterId: "research.experiment.round",
      maxChildren: 1,
      remainingDispatchBudget: 1,
      procedureDigest: "sha256:p",
      policyDigest: "sha256:y",
      requestDigest: "sha256:r",
      rootAuthorizationEvidence: "root",
    });
    expect(bad.ok).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  FROZEN_COMPOSITION_EDGES,
  buildMethodologyReport,
  listTrustedMethodologyValidatorIds,
  runMethodologyValidators,
  validateMethodologyArtifacts,
  validateRootCompositionDescriptor,
} from "../../src/research/index.js";

describe("methodology runtime", () => {
  it("fails closed on missing required artifacts", () => {
    const result = validateMethodologyArtifacts({
      contracts: [
        {
          id: "candidates",
          version: "1",
          requiredness: "required",
          cardinality: "1",
          pathPattern: "evidence/04_candidates.md",
          mediaType: "text/markdown",
          producer: "research-ideation",
          consumers: ["research-idea-evaluation"],
          terminalApplicability: ["success"],
          validatorIds: ["missing-critical-evidence"],
        },
      ],
      instances: [],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("MISSING_REQUIRED_ARTIFACT");
  });

  it("runs trusted validators and marks critical failure", () => {
    const report = runMethodologyValidators({
      procedureId: "idea-evaluation-v1",
      procedureVersion: "2.0.0",
      procedureDigest: "sha256:abc",
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
      facts: { selected: true, blocked: true },
    });
    expect(report.criticalFailure).toBe(true);
    expect(report.ok).toBe(false);
    expect(listTrustedMethodologyValidatorIds().length).toBeGreaterThan(0);
  });

  it("builds deterministic methodology reports", () => {
    const validation = runMethodologyValidators({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.0",
      procedureDigest: "sha256:abc",
      artifactPaths: [],
      declaredValidators: [],
      facts: {},
    });
    const report = buildMethodologyReport({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.0",
      procedureDigest: "sha256:abc",
      methodologyContractVersion: "evaluation-contract-v1.2.0",
      validation,
    });
    expect(report.reportDigest.startsWith("sha256:")).toBe(true);
  });

  it("validates frozen composition edges", () => {
    expect(FROZEN_COMPOSITION_EDGES).toHaveLength(3);
    const ok = validateRootCompositionDescriptor({
      schemaVersion: 1,
      compositionId: "cmp-1",
      edgeId: "COMP-001",
      parentDispatchId: "dsp_1",
      parentActivationId: "act_1",
      maxChildren: 1,
      remainingDispatchBudget: 1,
      procedureDigest: "sha256:x",
      policyDigest: "sha256:y",
      requestDigest: "sha256:z",
      rootAuthorizationEvidence: "root-approved",
    });
    expect(ok).toEqual({ ok: true });
  });
});

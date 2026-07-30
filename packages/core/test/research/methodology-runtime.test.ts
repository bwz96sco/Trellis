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
  it("fails closed on missing required artifacts and cardinality", () => {
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
      terminalState: "success",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_ARTIFACT")).toBe(
      true,
    );
  });

  it("enforces cardinality 1..* and path patterns", () => {
    const result = validateMethodologyArtifacts({
      contracts: [
        {
          id: "notes",
          version: "1",
          requiredness: "required",
          cardinality: "1..*",
          pathPattern: "evidence/notes/*.md",
          mediaType: "text/markdown",
          producer: "worker",
          consumers: ["root"],
          terminalApplicability: ["success"],
          validatorIds: [],
        },
      ],
      instances: [
        {
          contractId: "notes",
          path: "evidence/other/x.md",
          present: true,
          sha256: "a".repeat(64),
          mediaType: "text/markdown",
        },
      ],
      terminalState: "success",
    });
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((e) => e.code === "PATH_PATTERN_MISMATCH"),
    ).toBe(true);
  });

  it("rejects unexpected contract ids", () => {
    const result = validateMethodologyArtifacts({
      contracts: [],
      instances: [{ contractId: "ghost", path: "x", present: true }],
    });
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("UNEXPECTED_ARTIFACT");
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

  it("unknown validator id/version is always critical", () => {
    const report = runMethodologyValidators({
      procedureId: "x",
      procedureVersion: "1.0.0",
      procedureDigest: "sha256:abc",
      artifactPaths: [],
      declaredValidators: [
        { id: "missing-critical-evidence", version: "99", severity: "warning" },
      ],
      facts: {},
    });
    expect(report.criticalFailure).toBe(true);
    expect(report.findings[0]?.code).toBe("UNKNOWN_VALIDATOR");
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

  it("validates frozen composition edges and budgets", () => {
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

    const bad = validateRootCompositionDescriptor({
      schemaVersion: 1,
      compositionId: "cmp-2",
      edgeId: "COMP-001",
      parentDispatchId: "dsp_1",
      parentActivationId: "act_1",
      maxChildren: 1,
      remainingDispatchBudget: 1,
      actualChildCount: 2,
      procedureDigest: "sha256:x",
      policyDigest: "sha256:y",
      requestDigest: "sha256:z",
      rootAuthorizationEvidence: "root-approved",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.code).toBe("CHILD_COUNT_EXCEEDED");
  });
});

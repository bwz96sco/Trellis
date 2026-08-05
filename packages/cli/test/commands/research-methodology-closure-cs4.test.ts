import { describe, expect, it } from "vitest";

import {
  mapProcedureIdToClosureFamily,
  parseCanonicalMethodologyClosureArtifact,
} from "@mindfoldhq/trellis-core/research";

import { validateMethodologyBeforeRecord } from "../../src/commands/research/dispatch-methodology-validation.js";

describe("CS4 canonical closure on methodology validation path", () => {
  it("does not authorize report-v2 from procedureVersion alone", () => {
    const gate = validateMethodologyBeforeRecord({
      procedureId: "literature-scan-v1",
      procedureVersion: "2.0.4",
      procedureDigest: "sha256:abc",
      resultStatus: "completed",
      terminalState: "completed",
      batchCommitted: true,
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
    });
    expect(gate.criticalFailure || !gate.ok).toBe(true);
    expect(gate.materializeSidecar).toBe(false);
  });

  it("uses explicit XOR closure facts and ignores Result.status for exclusivity", () => {
    const gate = validateMethodologyBeforeRecord({
      procedureId: "literature-scan-v1",
      procedureVersion: "2.0.4",
      procedureDigest: "sha256:abc",
      methodologyContractDigest:
        "sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f",
      selected: true,
      blocked: false,
      resultStatus: "failed",
      terminalState: "failed",
      batchCommitted: true,
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
    });
    const exclusivityFailed = gate.report.validation.findings.some(
      (f) =>
        f.validatorId === "closure-exclusivity" && f.severity === "critical",
    );
    expect(exclusivityFailed).toBe(false);
  });

  it("strict-parses closure artifact with family XOR and evidence rules", () => {
    const closureId = "art_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const evidenceId = "art_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const body = {
      schemaVersion: 1,
      family: "research-literature",
      selected: { value: true, evidenceArtifactIds: [evidenceId] },
      blocked: { value: false, evidenceArtifactIds: [] },
    };
    const result = parseCanonicalMethodologyClosureArtifact({
      bytes: new TextEncoder().encode(`${JSON.stringify(body)}\n`),
      expectedFamily: "research-literature",
      closureArtifactId: closureId,
      boundArtifactIds: [closureId, evidenceId],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.closure.selected).toBe(true);
      expect(result.closure.blocked).toBe(false);
    }
    expect(mapProcedureIdToClosureFamily("literature-scan-v1")).toBe(
      "research-literature",
    );
  });
});

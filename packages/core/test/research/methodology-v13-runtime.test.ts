import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  HISTORICAL_INVALID_PHASE2_CHECKPOINT_FIXTURE,
  MethodologyV13RuntimeError,
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_CONTRACT_VERSION,
  V13_DELTA_CASE_COUNT,
  V13_ENFORCEABLE_ARTIFACT_COUNT,
  V13_LIFECYCLE_DIMENSION_COUNT,
  V13_OUTPUT_COUNT,
  V13_PROVENANCE_ROW_COUNT,
  V13_TRUSTED_VALIDATOR_COUNT,
  V13_VALIDATOR_BINDING_COUNT,
  assertHistoricalPhase2FixtureIsNotV13Authority,
  deriveAcceptedV13PackIdentity,
  evaluateAcceptedV13DeltaCase,
  expectedV13ContractCounts,
  mapProcedureIdToClosureFamily,
  parseAcceptedV13ContractPack,
  parseCanonicalMethodologyClosureArtifact,
  selectTrustedV13ValidatorDescriptors,
  type V13LeafFileName,
} from "../../src/research/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const a3Research = path.join(
  repoRoot,
  ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
);

const LEAF_FILES: readonly V13LeafFileName[] = [
  "durable-output-disposition-v1.3.json",
  "artifact-lifecycle-contract-v1.3.json",
  "validator-registry-v1.3.json",
  "validator-binding-matrix-v1.3.json",
  "differential-test-matrix-v1.3.json",
  "derivability-provenance-matrix-v1.3.json",
  "closure-contract-v1.3.json",
];

function loadA3LeafBytes(): Partial<Record<V13LeafFileName, Uint8Array>> {
  const out: Partial<Record<V13LeafFileName, Uint8Array>> = {};
  for (const name of LEAF_FILES) {
    out[name] = fs.readFileSync(path.join(a3Research, name));
  }
  return out;
}

describe("methodology v1.3 runtime (accepted A3 strict path)", () => {
  it("reconstructs exact 64/65/20/876/116/3343 counts from committed A3 leaf bytes", () => {
    const pack = parseAcceptedV13ContractPack({
      leafBytes: loadA3LeafBytes(),
      expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
    });
    expect(pack.contractVersion).toBe(V13_ACCEPTED_CONTRACT_VERSION);
    expect(pack.counts).toEqual(expectedV13ContractCounts());
    expect(pack.outputs).toHaveLength(V13_OUTPUT_COUNT);
    expect(pack.artifacts).toHaveLength(V13_ENFORCEABLE_ARTIFACT_COUNT);
    expect(pack.validators).toHaveLength(V13_TRUSTED_VALIDATOR_COUNT);
    expect(pack.bindings).toHaveLength(V13_VALIDATOR_BINDING_COUNT);
    expect(pack.deltaCases).toHaveLength(V13_DELTA_CASE_COUNT);
    expect(pack.provenanceRows).toHaveLength(V13_PROVENANCE_ROW_COUNT);
    expect(pack.closureFamilies).toHaveLength(4);
    expect(pack.closureFamilies).toEqual([
      "research-literature",
      "research-ideation",
      "research-idea-evaluation",
      "research-experiment",
    ]);
  });

  it("requires all 13 lifecycle dimensions with no invented defaults", () => {
    const pack = parseAcceptedV13ContractPack({ leafBytes: loadA3LeafBytes() });
    for (const artifact of pack.artifacts) {
      expect(Object.keys(artifact.dimensions)).toHaveLength(
        V13_LIFECYCLE_DIMENSION_COUNT,
      );
      expect(artifact.validatorBindingIds).toHaveLength(
        V13_LIFECYCLE_DIMENSION_COUNT,
      );
      for (const dim of Object.values(artifact.dimensions)) {
        expect(dim.provenance).toBeTypeOf("object");
        expect(Array.isArray(dim.stableErrors)).toBe(true);
        expect((dim.stableErrors as unknown[]).length).toBeGreaterThan(0);
      }
    }
  });

  it("selects only exact trusted (id, version) bindings and rejects unknown/duplicate/downgrade", () => {
    const pack = parseAcceptedV13ContractPack({ leafBytes: loadA3LeafBytes() });
    const first = pack.validators[0]!;
    const ok = selectTrustedV13ValidatorDescriptors({
      pack,
      declared: [
        {
          id: first.identity.id,
          version: first.identity.version,
          severity: "critical",
        },
      ],
    });
    expect(ok.ok).toBe(true);
    expect(ok.selected).toHaveLength(1);

    const unknown = selectTrustedV13ValidatorDescriptors({
      pack,
      declared: [{ id: "not.a.real.validator", version: "9.9.9" }],
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.findings.some((f) => f.code === "V13_UNKNOWN_VALIDATOR")).toBe(
      true,
    );

    const downgrade = selectTrustedV13ValidatorDescriptors({
      pack,
      declared: [
        {
          id: first.identity.id,
          version: first.identity.version,
          severity: "warning",
        },
      ],
    });
    expect(downgrade.ok).toBe(false);
    expect(
      downgrade.findings.some((f) => f.code === "V13_SEVERITY_DOWNGRADE"),
    ).toBe(true);

    const duplicate = selectTrustedV13ValidatorDescriptors({
      pack,
      declared: [
        { id: first.identity.id, version: first.identity.version },
        { id: first.identity.id, version: first.identity.version },
      ],
    });
    expect(duplicate.ok).toBe(false);
    expect(
      duplicate.findings.some(
        (f) => f.code === "V13_DUPLICATE_VALIDATOR_DESCRIPTOR",
      ),
    ).toBe(true);
  });

  it("rejects severity-downgraded binding rows when present in pack bytes", () => {
    const leafBytes = loadA3LeafBytes();
    const matrixPath = "validator-binding-matrix-v1.3.json" as const;
    const matrix = JSON.parse(
      Buffer.from(leafBytes[matrixPath]!).toString("utf8"),
    ) as {
      bindings: Array<{ validator: { severity: string } }>;
    };
    matrix.bindings[0]!.validator.severity = "warning";
    leafBytes[matrixPath] = new TextEncoder().encode(
      `${JSON.stringify(matrix)}\n`,
    );
    expect(() =>
      parseAcceptedV13ContractPack({ leafBytes }),
    ).toThrowError(MethodologyV13RuntimeError);
    try {
      parseAcceptedV13ContractPack({ leafBytes });
    } catch (error) {
      expect(error).toBeInstanceOf(MethodologyV13RuntimeError);
      expect((error as MethodologyV13RuntimeError).code).toBe(
        "V13_SEVERITY_DOWNGRADE",
      );
    }
  });

  it("fails closed when a required leaf is missing (no universal defaults)", () => {
    const leafBytes = loadA3LeafBytes();
    delete leafBytes["closure-contract-v1.3.json"];
    expect(() => parseAcceptedV13ContractPack({ leafBytes })).toThrowError(
      /Missing required v1.3 leaf/,
    );
  });

  it("keeps 104/54/50 labeled historical-invalid and non-authoritative for v1.3", () => {
    expect(HISTORICAL_INVALID_PHASE2_CHECKPOINT_FIXTURE).toEqual({
      label:
        "historical-invalid-phase2-104-54-50-not-exact-frozen-v1.2-authority",
      familyCount: 16,
      checkpointCount: 104,
      orderedStageCount: 54,
      artifactLifecycleCheckpointCount: 50,
      isExactFrozenV12Authority: false,
      mayBecomeV13Authority: false,
    });
    expect(() =>
      assertHistoricalPhase2FixtureIsNotV13Authority(
        HISTORICAL_INVALID_PHASE2_CHECKPOINT_FIXTURE,
      ),
    ).not.toThrow();
    expect(() =>
      assertHistoricalPhase2FixtureIsNotV13Authority({
        ...HISTORICAL_INVALID_PHASE2_CHECKPOINT_FIXTURE,
        mayBecomeV13Authority: true,
      }),
    ).toThrowError(/must never become v1.3 authority/);
  });

  it("keeps every binding severity critical and every delta case in V13-* namespace", () => {
    const pack = parseAcceptedV13ContractPack({ leafBytes: loadA3LeafBytes() });
    expect(
      pack.bindings.every((b) => b.validator.severity === "critical"),
    ).toBe(true);
    expect(pack.deltaCases.every((c) => String(c.caseId).startsWith("V13-"))).toBe(
      true,
    );
  });

  it("evaluates delta cases with semanticRule/mutation: positive, base, fail-closed, not-run", () => {
    const pack = parseAcceptedV13ContractPack({ leafBytes: loadA3LeafBytes() });
    const requirednessCases = pack.deltaCases.filter((row) => {
      return (
        typeof row.ruleKind === "string" &&
        row.ruleKind === "artifact.requiredness"
      );
    });
    expect(requirednessCases.length).toBe(4);

    for (const row of requirednessCases) {
      const caseId = String(row.caseId);
      const fixtureClass = String(row.fixtureClass);
      const sandboxRoot = fs.mkdtempSync(
        path.join(path.dirname(fileURLToPath(import.meta.url)), ".v13-sandbox-"),
      );
      try {
        fs.writeFileSync(path.join(sandboxRoot, "seed.txt"), "seed\n");
        const result = evaluateAcceptedV13DeltaCase({
          pack,
          caseId,
          sandboxRoot,
        });
        expect(result.executed).toBe(true);
        expect(result.zeroWrite).toBe(true);
        expect(result.beforeSandboxDigest).toBe(result.afterSandboxDigest);
        expect(result.executionFingerprint.length).toBe(64);
        expect(result.semanticRule).toBe("artifact.requiredness");
        if (fixtureClass === "positive") {
          expect(result.outcome).toBe("pass");
          expect(result.errorCodes).toEqual([]);
        } else if (fixtureClass === "base") {
          expect(result.outcome).toBe("pass-noncanonical-until-root-accept");
        } else if (fixtureClass === "critical-negative") {
          expect(result.outcome).toBe("fail-closed");
          expect(result.errorCodes).toEqual(["V13_ARTIFACT_REQUIRED_MISSING"]);
        } else if (fixtureClass === "inapplicable") {
          expect(result.outcome).toBe("not-run");
          expect(result.errorCodes).toEqual([]);
        }
      } finally {
        fs.rmSync(sandboxRoot, { recursive: true, force: true });
      }
    }
  });

  it("parses canonical closure XOR and rejects status-free schema defects", () => {
    const closureId = "art_11111111-1111-4111-8111-111111111111";
    const evidenceId = "art_22222222-2222-4222-8222-222222222222";
    const good = {
      schemaVersion: 1,
      family: "research-literature",
      selected: { value: true, evidenceArtifactIds: [evidenceId] },
      blocked: { value: false, evidenceArtifactIds: [] },
    };
    const ok = parseCanonicalMethodologyClosureArtifact({
      bytes: new TextEncoder().encode(`${JSON.stringify(good)}\n`),
      expectedFamily: "research-literature",
      closureArtifactId: closureId,
      boundArtifactIds: [closureId, evidenceId],
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.closure.selected).toBe(true);
      expect(ok.closure.blocked).toBe(false);
    }

    const bothTrue = {
      ...good,
      selected: { value: true, evidenceArtifactIds: [evidenceId] },
      blocked: { value: true, evidenceArtifactIds: [evidenceId] },
    };
    const badXor = parseCanonicalMethodologyClosureArtifact({
      bytes: new TextEncoder().encode(`${JSON.stringify(bothTrue)}\n`),
      expectedFamily: "research-literature",
      closureArtifactId: closureId,
      boundArtifactIds: [closureId, evidenceId],
    });
    expect(badXor.ok).toBe(false);
    if (!badXor.ok) {
      expect(badXor.code).toBe("V13_CLOSURE_EXCLUSIVITY_INVALID");
    }

    const selfRef = {
      ...good,
      selected: { value: true, evidenceArtifactIds: [closureId] },
    };
    const badSelf = parseCanonicalMethodologyClosureArtifact({
      bytes: new TextEncoder().encode(`${JSON.stringify(selfRef)}\n`),
      expectedFamily: "research-literature",
      closureArtifactId: closureId,
      boundArtifactIds: [closureId, evidenceId],
    });
    expect(badSelf.ok).toBe(false);
    if (!badSelf.ok) {
      expect(badSelf.code).toBe("V13_CLOSURE_EVIDENCE_INVALID");
    }

    expect(mapProcedureIdToClosureFamily("literature-scan-v1")).toBe(
      "research-literature",
    );
    expect(mapProcedureIdToClosureFamily("quest-admin-v1")).toBeUndefined();
  });

  it("derives pack member aggregate without stamping caller expected digest", () => {
    const leafBytes = loadA3LeafBytes();
    const derived = deriveAcceptedV13PackIdentity({ leafBytes });
    expect(derived.members).toHaveLength(7);
    expect(derived.aggregateSha256.startsWith("sha256:")).toBe(true);
    const pack = parseAcceptedV13ContractPack({ leafBytes });
    expect(pack.derivedMemberAggregateSha256).toBe(derived.aggregateSha256);
    expect(pack.acceptedContractDigest).toBe(V13_ACCEPTED_CONTRACT_DIGEST);
    expect(() =>
      parseAcceptedV13ContractPack({
        leafBytes,
        expectedContractDigest: "sha256:deadbeef",
      }),
    ).toThrow(/does not match frozen accepted A3 digest/);
  });
});


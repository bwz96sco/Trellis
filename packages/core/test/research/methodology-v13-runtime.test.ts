import { execFileSync } from "node:child_process";
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
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V131_COMPLETE_LIFECYCLE_DECISION_COUNT,
  V131_MAPPING_ROW_COUNT,
  V131_NOT_APPLICABLE_MAPPING_ROW_COUNT,
  V131_POSITIVE_LIFECYCLE_DECISION_COUNT,
  assertHistoricalPhase2FixtureIsNotV13Authority,
  deriveAcceptedV13PackIdentity,
  deriveAcceptedV131PackIdentity,
  enforceV13LifecycleDimensionsFromArtifactRefs,
  evaluateAcceptedV13DeltaCase,
  executeV131BindingInvocations,
  expectedV13ContractCounts,
  executeV13BindingInvocations,
  isV13ClosureArtifactExactPath,
  mapProcedureIdToClosureFamily,
  parseAcceptedV13ContractPack,
  parseAcceptedV131ContractPack,
  parseCanonicalMethodologyClosureArtifact,
  resolveProcedureClosureDisposition,
  resolveProcedureLifecycleFamily,
  resolveV131ProcedureArtifactFamilyMapping,
  selectApplicableV13BindingsForProcedure,
  selectApplicableV131BindingsForProcedure,
  selectTrustedV13ValidatorDescriptors,
  validateV13BindingCrossLinks,
  V13_CLOSURE_ARTIFACT_SPECS,
  V13_PROCEDURE_CLOSURE_DISPOSITIONS,
  type V13LeafFileName,
  type V131LeafFileName,
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

const A133_COMMIT = "5a038a87531c3dbfa7b52ba82eaa59d856ab1ea3";
const A133_RESEARCH_PATH =
  ".trellis/tasks/08-10-author-evaluation-contract-v1-3-1-attempt-3/research";
const V131_LEAF_FILES: readonly V131LeafFileName[] = [
  "durable-output-disposition-v1.3.1.json",
  "artifact-lifecycle-contract-v1.3.1.json",
  "validator-registry-v1.3.1.json",
  "validator-binding-matrix-v1.3.1.json",
  "differential-test-matrix-v1.3.1.json",
  "derivability-provenance-matrix-v1.3.1.json",
  "closure-contract-v1.3.1.json",
];

function loadA133LeafBytes(): Partial<Record<V131LeafFileName, Uint8Array>> {
  const out: Partial<Record<V131LeafFileName, Uint8Array>> = {};
  for (const name of V131_LEAF_FILES) {
    out[name] = execFileSync(
      "git",
      ["-C", repoRoot, "show", `${A133_COMMIT}:${A133_RESEARCH_PATH}/${name}`],
      { maxBuffer: 16 * 1024 * 1024 },
    );
  }
  return out;
}

describe("methodology v1.3.1 runtime (accepted A133 immutable path)", () => {
  it("authenticates the exact seven immutable leaves and complete applicability matrix", () => {
    const leafBytes = loadA133LeafBytes();
    const identity = deriveAcceptedV131PackIdentity({ leafBytes });
    expect(identity.aggregateSha256).toBe(V131_ACCEPTED_MEMBER_AGGREGATE_SHA256);

    const pack = parseAcceptedV131ContractPack({ leafBytes });
    expect(pack.contractVersion).toBe(V131_ACCEPTED_CONTRACT_VERSION);
    expect(pack.acceptedContractDigest).toBe(V131_ACCEPTED_CONTRACT_DIGEST);
    expect(pack.mappingRows).toHaveLength(V131_MAPPING_ROW_COUNT);
    expect(pack.lifecycleDecisions).toHaveLength(
      V131_COMPLETE_LIFECYCLE_DECISION_COUNT,
    );
    expect(pack.lifecycleDecisions.filter((row) => row.applies)).toHaveLength(
      V131_POSITIVE_LIFECYCLE_DECISION_COUNT,
    );
    expect(
      pack.mappingRows.filter((row) => row.disposition === "notApplicable"),
    ).toHaveLength(V131_NOT_APPLICABLE_MAPPING_ROW_COUNT);
    expect(pack.validators).toHaveLength(20);
    expect(pack.bindings).toHaveLength(876);
    expect(pack.validators.every((row) => row.severity === "critical")).toBe(true);
    expect(pack.bindings.every((row) => row.validator.severity === "critical")).toBe(
      true,
    );
  });

  it("uses the authenticated 17-row mapping and never substitutes experiment closure family", () => {
    const pack = parseAcceptedV131ContractPack({ leafBytes: loadA133LeafBytes() });
    expect(
      resolveV131ProcedureArtifactFamilyMapping({
        pack,
        procedureId: "experiment-campaign-v1",
        capabilityId: "research.experiment.campaign",
        procedureVersion: "2.0.7",
      }),
    ).toEqual({
      procedureId: "experiment-campaign-v1",
      capabilityId: "research.experiment.campaign",
      procedureVersion: "2.0.7",
      disposition: "applicable",
      artifactFamily: "research-experiment-campaign",
    });
    expect(
      resolveV131ProcedureArtifactFamilyMapping({
        pack,
        procedureId: "survey-v1",
        capabilityId: "research.literature.survey",
        procedureVersion: "2.0.7",
      }).artifactFamily,
    ).toBeNull();

    const selected = selectApplicableV131BindingsForProcedure({
      pack,
      procedureId: "experiment-campaign-v1",
      capabilityId: "research.experiment.campaign",
      procedureVersion: "2.0.7",
    });
    expect(selected.filter((row) => row.binding.ruleKind.startsWith("artifact."))).toHaveLength(
      195,
    );
    expect(
      selected
        .filter((row) => row.binding.ruleKind.startsWith("artifact."))
        .every((row) => row.targetArtifactFamily === "research-experiment-campaign"),
    ).toBe(true);
  });

  it("selects only the exact four accepted closure families", () => {
    const pack = parseAcceptedV131ContractPack({ leafBytes: loadA133LeafBytes() });
    const cases = [
      ["literature-review-v1", "research.literature.review", "research-literature"],
      ["idea-generation-v1", "research.ideation.generate", "research-ideation"],
      ["idea-evaluation-v1", "research.ideation.evaluate", "research-idea-evaluation"],
      ["experiment-campaign-v1", "research.experiment.campaign", "research-experiment"],
    ] as const;
    for (const [procedureId, capabilityId, expectedFamily] of cases) {
      const closureBindings = selectApplicableV131BindingsForProcedure({
        pack,
        procedureId,
        capabilityId,
        procedureVersion: "2.0.7",
      }).filter((row) => row.binding.ruleKind.startsWith("closure."));
      expect(closureBindings).toHaveLength(5);
      expect(new Set(closureBindings.map((row) => row.binding.targetId))).toEqual(
        new Set([expectedFamily]),
      );
    }

    const notApplicableClosureBindings = selectApplicableV131BindingsForProcedure({
      pack,
      procedureId: "survey-v1",
      capabilityId: "research.literature.survey",
      procedureVersion: "2.0.7",
    }).filter((row) => row.binding.ruleKind.startsWith("closure."));
    expect(notApplicableClosureBindings).toHaveLength(0);
  });

  it("executes every applicable binding once and fails closed on missing or mismatched facts", () => {
    const pack = parseAcceptedV131ContractPack({ leafBytes: loadA133LeafBytes() });
    const applicableBindings = selectApplicableV131BindingsForProcedure({
      pack,
      procedureId: "survey-v1",
      capabilityId: "research.literature.survey",
      procedureVersion: "2.0.7",
    });
    const binding = applicableBindings.find(
      (row) => row.binding.ruleKind === "validator.binding-integrity",
    );
    if (binding === undefined) {
      throw new Error("Missing validator.binding-integrity binding");
    }
    const validator = pack.validators.find(
      (row) => row.identity.id === binding.binding.validator.id,
    );
    if (validator === undefined) {
      throw new Error("Missing binding-integrity trusted validator");
    }
    expect(validator.inputFactSchema).toBeDefined();
    const input = {
      ruleId: binding.binding.ruleId,
      targetId: binding.binding.targetId,
      facts: {
        aliasesAbsent: true,
        authorityComplete: true,
        bindingId: binding.binding.bindingId,
        contradictionFree: true,
        expectedStableErrors: ["V13_VALIDATOR_BINDING_INVALID"],
        factState: "present",
        ruleKind: "validator.binding-integrity",
        targetId: binding.binding.targetId,
        validatorBindingIntegrityAuthorityCanonicalJson: "{}",
        validatorBindingIntegrityObservedCanonicalJson: "{}",
      },
      authoritySnapshot: {
        methodologyIdentity: V131_ACCEPTED_CONTRACT_VERSION,
        methodologyDigest: V131_ACCEPTED_CONTRACT_DIGEST.slice("sha256:".length),
        procedureId: "survey-v1",
        procedureVersion: "2.0.7",
        procedureDigest: `sha256:${"a".repeat(64)}`,
        capabilityId: "research.literature.survey",
        questId: "qst_test",
        dispatchId: "dsp_test",
        activationId: "act_test",
        approvalId: "apr_test",
        repositoryId: "rep_test",
      },
    };
    const passed = executeV131BindingInvocations({
      pack,
      applicableBindings: [binding],
      factForBinding: () => ({ source: "authenticated-test-fact", authenticated: true, value: input }),
    });
    expect(passed.ok).toBe(true);
    expect(passed.applicableCount).toBe(1);
    expect(passed.invocationCount).toBe(1);

    expect(() =>
      executeV131BindingInvocations({
        pack,
        applicableBindings: [binding],
        factForBinding: () => undefined,
      }),
    ).toThrow(/no required fact/i);
    const mismatched = executeV131BindingInvocations({
      pack,
      applicableBindings: [binding],
      factForBinding: () => ({
        source: "authenticated-test-fact",
        authenticated: true,
        value: { ...input, targetId: "wrong-target" },
      }),
    });
    expect(mismatched.ok).toBe(false);
    expect(mismatched.invocations[0]?.findingCode).toBe(
      "V13_VALIDATOR_BINDING_INVALID",
    );

    const unauthenticated = executeV131BindingInvocations({
      pack,
      applicableBindings: [binding],
      factForBinding: () => ({
        source: "untrusted-test-fact",
        authenticated: false,
        value: input,
      }),
    });
    expect(unauthenticated.ok).toBe(false);
    expect(unauthenticated.invocations[0]?.outcome).toBe("fail-closed");
    expect(unauthenticated.invocations[0]?.findingCode).toBe(
      "V13_VALIDATOR_BINDING_INVALID",
    );

    const invalidFacts: readonly Readonly<Record<string, unknown>>[] = [
      { ...input.facts, unknownFact: true },
      Object.fromEntries(
        Object.entries(input.facts).filter(([key]) => key !== "authorityComplete"),
      ),
      { ...input.facts, factState: "unknown" },
      { ...input.facts, factState: "contradictory" },
      { ...input.facts, factState: "aliased" },
      { ...input.facts, factState: "ambiguous" },
    ];
    for (const facts of invalidFacts) {
      const rejected = executeV131BindingInvocations({
        pack,
        applicableBindings: [binding],
        factForBinding: () => ({
          source: "authenticated-test-fact",
          authenticated: true,
          value: { ...input, facts },
        }),
      });
      expect(rejected.ok).toBe(false);
      expect(rejected.invocationCount).toBe(1);
      expect(rejected.invocations[0]?.outcome).toBe("fail-closed");
      expect(rejected.invocations[0]?.findingCode).toBe(
        "V13_VALIDATOR_BINDING_INVALID",
      );
    }
  });

  it("fails closed on missing immutable members, semantic drift, and decision drift", () => {
    const missing = loadA133LeafBytes();
    delete missing["closure-contract-v1.3.1.json"];
    expect(() => parseAcceptedV131ContractPack({ leafBytes: missing })).toThrow(
      /Missing required v1.3.1 leaf/,
    );

    const semanticDrift = loadA133LeafBytes();
    const registryName = "validator-registry-v1.3.1.json" as const;
    const registryBytes = semanticDrift[registryName];
    if (registryBytes === undefined) throw new Error("Missing registry test leaf");
    const registry = JSON.parse(Buffer.from(registryBytes).toString("utf8")) as {
      validators: { severity: { value: { fixed: string } } }[];
    };
    const firstValidator = registry.validators[0];
    if (firstValidator === undefined) throw new Error("Missing registry test validator");
    firstValidator.severity.value.fixed = "warning";
    semanticDrift[registryName] = new TextEncoder().encode(`${JSON.stringify(registry)}\n`);
    expect(() => parseAcceptedV131ContractPack({ leafBytes: semanticDrift })).toThrow(
      /member aggregate|severity/i,
    );

    const decisionDrift = loadA133LeafBytes();
    const lifecycleName = "artifact-lifecycle-contract-v1.3.1.json" as const;
    const lifecycleBytes = decisionDrift[lifecycleName];
    if (lifecycleBytes === undefined) throw new Error("Missing lifecycle test leaf");
    const lifecycle = JSON.parse(Buffer.from(lifecycleBytes).toString("utf8")) as {
      procedureCapabilityArtifactFamilyMapping: {
        completeLifecycleMatrix: { decisions: { applies: boolean }[] };
      };
    };
    const firstDecision =
      lifecycle.procedureCapabilityArtifactFamilyMapping.completeLifecycleMatrix
        .decisions[0];
    if (firstDecision === undefined) throw new Error("Missing lifecycle test decision");
    firstDecision.applies = true;
    decisionDrift[lifecycleName] = new TextEncoder().encode(
      `${JSON.stringify(lifecycle)}\n`,
    );
    expect(() => parseAcceptedV131ContractPack({ leafBytes: decisionDrift })).toThrow(
      /member aggregate|lifecycle decision/i,
    );
  });
});

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
    const first = pack.validators[0];
    if (first === undefined) throw new Error("Missing accepted validator test row");
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
    const matrixBytes = leafBytes[matrixPath];
    if (matrixBytes === undefined) throw new Error("Missing binding matrix test leaf");
    const matrix = JSON.parse(Buffer.from(matrixBytes).toString("utf8")) as {
      bindings: { validator: { severity: string } }[];
    };
    const firstBinding = matrix.bindings[0];
    if (firstBinding === undefined) throw new Error("Missing binding matrix test row");
    firstBinding.validator.severity = "warning";
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


describe("CS5-2 closed closure disposition and exact binding execution", () => {
  function loadPack() {
    return parseAcceptedV13ContractPack({
      leafBytes: loadA3LeafBytes(),
      expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
    });
  }

  it("declares exactly 17 Procedures: 6 required + 11 notApplicable", () => {
    const entries = Object.entries(
      V13_PROCEDURE_CLOSURE_DISPOSITIONS,
    );
    expect(entries).toHaveLength(17);
    expect(entries.filter(([, d]) => d.kind === "required")).toHaveLength(6);
    expect(entries.filter(([, d]) => d.kind === "notApplicable")).toHaveLength(11);
    expect(V13_CLOSURE_ARTIFACT_SPECS).toHaveLength(4);
    for (const [id, d] of entries) {
      expect(d.procedureId).toBe(id);
      if (d.kind === "required") {
        expect(d.mediaType).toBe("application/json");
        expect(d.exactPath).toBe(
          `methodology/closure/${d.family}.json`,
        );
        expect(
          V13_CLOSURE_ARTIFACT_SPECS.some(
            (s) => s.family === d.family && s.exactPath === d.exactPath,
          ),
        ).toBe(true);
      } else {
        expect(d.code.startsWith("V13_CLOSURE_NOT_APPLICABLE_")).toBe(true);
        expect(d.rationale.length).toBeGreaterThan(0);
      }
    }
  });

  it("resolves the six required procedures with exact paths", () => {
    const expected = new Map<string, string>([
      ["literature-scan-v1", "research-literature"],
      ["literature-review-v1", "research-literature"],
      ["idea-generation-v1", "research-ideation"],
      ["idea-evaluation-v1", "research-idea-evaluation"],
      ["experiment-campaign-v1", "research-experiment"],
      ["experiment-round-v1", "research-experiment"],
    ]);
    for (const [procedureId, family] of expected) {
      const d = resolveProcedureClosureDisposition(procedureId);
      expect(d.kind).toBe("required");
      if (d.kind === "required") {
        expect(d.family).toBe(family);
        expect(isV13ClosureArtifactExactPath(d.exactPath)).toBe(true);
      }
    }
  });

  it("rejects unknown Procedures and non-exact closure paths", () => {
    expect(() => resolveProcedureClosureDisposition("nope-v1")).toThrow(
      MethodologyV13RuntimeError,
    );
    expect(isV13ClosureArtifactExactPath("methodology/closure/")).toBe(false);
    expect(
      isV13ClosureArtifactExactPath("x-methodology/closure/research-literature.json"),
    ).toBe(false);
    expect(
      isV13ClosureArtifactExactPath("methodology/closure/research-literature.json"),
    ).toBe(true);
  });

  it("validates all 876 binding cross-links", () => {
    const pack = loadPack();
    const result = validateV13BindingCrossLinks(pack);
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("selects per-Procedure applicable bindings without shrinking the 876 set", () => {
    const pack = loadPack();
    for (const procedureId of Object.keys(V13_PROCEDURE_CLOSURE_DISPOSITIONS)) {
      const applicable = selectApplicableV13BindingsForProcedure({
        pack,
        procedureId,
      });
      expect(applicable.length).toBeGreaterThan(0);
      for (const row of applicable) {
        expect(row.binding.validator.severity).toBe("critical");
        if (!row.isGlobal) {
          expect(row.target).toBeDefined();
          expect(row.dimension).toBeDefined();
        }
      }
    }
    // Every binding is applicable to at least one Procedure (no dead authority).
    const covered = new Set(
      selectApplicableV13BindingsForProcedure({
        pack,
        procedureId: "review-case-v1",
      }).map((r) => r.binding.bindingId),
    );
    expect(covered.size).toBeGreaterThan(0);
  });

  it("executes every applicable binding independently and fails closed on count mismatch", () => {
    const pack = loadPack();
    const applicable = selectApplicableV13BindingsForProcedure({
      pack,
      procedureId: "review-case-v1",
    });
    const executed = executeV13BindingInvocations({
      pack,
      applicableBindings: applicable,
      factForBinding: () => ({ source: "test-fact", value: { ok: true } }),
      invoke: () => ({ pass: true }),
    });
    expect(executed.applicableCount).toBe(applicable.length);
    expect(executed.invocationCount).toBe(applicable.length);
    expect(executed.ok).toBe(true);
    expect(executed.invocations.every((i) => i.outcome === "pass")).toBe(true);
    // Invocation rows carry binding identity + validator id@version + target.
    const first = executed.invocations[0];
    expect(first.validatorId.length).toBeGreaterThan(0);
    expect(first.validatorVersion).toBe("1.0.0");
    expect(first.bindingId.length).toBeGreaterThan(0);
  });

  it("fails closed when an applicable fact is unresolved", () => {
    const pack = loadPack();
    const applicable = selectApplicableV13BindingsForProcedure({
      pack,
      procedureId: "review-case-v1",
    });
    let caught: unknown;
    try {
      executeV13BindingInvocations({
        pack,
        applicableBindings: applicable,
        factForBinding: () => undefined,
        invoke: () => ({ pass: true }),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MethodologyV13RuntimeError);
    expect((caught as MethodologyV13RuntimeError).code).toBe(
      "V13_APPLICABLE_FACT_UNRESOLVED",
    );
  });

  it("records fail-closed outcomes per binding", () => {
    const pack = loadPack();
    const applicable = selectApplicableV13BindingsForProcedure({
      pack,
      procedureId: "review-case-v1",
    });
    const executed = executeV13BindingInvocations({
      pack,
      applicableBindings: applicable,
      factForBinding: () => ({ source: "mutated", value: { invalid: true } }),
      invoke: () => ({ pass: false, findingCode: "V13_TEST_FAILURE" }),
    });
    expect(executed.ok).toBe(false);
    expect(executed.criticalFailure).toBe(true);
    expect(
      executed.invocations.every(
        (i) => i.outcome === "fail-closed" && i.findingCode === "V13_TEST_FAILURE",
      ),
    ).toBe(true);
  });

  it("enforces lifecycle dimensions from ArtifactRef facts", () => {
    const pack = loadPack();
    const procedureId = "review-case-v1";
    const family = resolveProcedureLifecycleFamily(procedureId);
    const rows = pack.artifacts.filter((a) => a.family === family);
    expect(rows.length).toBe(21);
    const facts = rows.map((row, index) => ({
      artifactId: `art_11111111-1111-4111-8111-1111111111${index.toString().padStart(2, "0")}`,
      repositoryId: "rep_11111111-1111-4111-8111-111111111111",
      resolvedRepositoryIdentity: "repo-root",
      exactPath: row.publicIdentity,
      submittedMediaType: row.dimensions.mediaType.value as string,
      submittedSha256: "a".repeat(64),
      present: true,
    }));
    const ok = enforceV13LifecycleDimensionsFromArtifactRefs({
      pack,
      procedureId,
      artifactRefFacts: facts,
      terminalState: "completed",
      dispatchContext: {
        questId: "qst_1",
        dispatchId: "dsp_1",
        activationId: "act_1",
        approvalId: "apr_1",
        capabilityId: "research.review.campaign",
      },
    });
    expect(ok.ok).toBe(true);
    expect(ok.findings).toEqual([]);
  });

  it("rejects missing required artifacts and media type drift", () => {
    const pack = loadPack();
    const procedureId = "review-case-v1";
    const rows = pack.artifacts.filter(
      (a) => a.family === resolveProcedureLifecycleFamily(procedureId),
    );
    // Omit the last row (requiredness failure) and drift media type on the first.
    const facts = rows.slice(0, -1).map((row, index) => ({
      artifactId: `art_22222222-2222-4222-8222-2222222222${index.toString().padStart(2, "0")}`,
      repositoryId: "rep_22222222-2222-4222-8222-222222222222",
      resolvedRepositoryIdentity: "repo-root",
      exactPath: row.publicIdentity,
      submittedMediaType:
        index === 0 ? "application/x-wrong" : (row.dimensions.mediaType.value as string),
      submittedSha256: "b".repeat(64),
      present: true,
    }));
    const result = enforceV13LifecycleDimensionsFromArtifactRefs({
      pack,
      procedureId,
      artifactRefFacts: facts,
    });
    expect(result.ok).toBe(false);
    const codes = new Set(result.findings.map((f) => f.code));
    expect(codes.has("V13_ARTIFACT_REQUIRED_MISSING")).toBe(true);
    expect(codes.has("V13_ARTIFACT_MEDIA_TYPE_INVALID")).toBe(true);
  });
});

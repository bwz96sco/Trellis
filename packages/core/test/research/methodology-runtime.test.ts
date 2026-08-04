import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  FROZEN_COMPOSITION_EDGES,
  RESEARCH_CAPABILITY_REGISTRY,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  buildMethodologyReport,
  buildMethodologyReportV2,
  buildSupportPackInventory,
  buildWorkerMethodologyProjectionV2,
  deriveMethodologyValidatorFacts,
  listTrustedMethodologyValidatorIds,
  parseResearchProcedure,
  parseSupportPackManifest,
  planRootCompositionAction,
  resolveMethodologyContractBinding,
  runMethodologyValidators,
  serializeSupportPackManifest,
  shouldMaterializeMethodologyReportSidecar,
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
      parentCapabilityId: "research.experiment.campaign",
      childCapabilityOrAdapterId: "research.experiment.round",
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
      parentCapabilityId: "research.experiment.campaign",
      childCapabilityOrAdapterId: "research.experiment.round",
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

  it("rejects wrong parent/child with exact matching (no substring soft pass)", () => {
    const wrongParent = validateRootCompositionDescriptor({
      schemaVersion: 1,
      compositionId: "cmp-3",
      edgeId: "COMP-001",
      parentDispatchId: "dsp_1",
      parentActivationId: "act_1",
      parentCapabilityId: "research.audit.campaign",
      childCapabilityOrAdapterId: "research.experiment.round",
      maxChildren: 1,
      remainingDispatchBudget: 1,
      procedureDigest: "sha256:x",
      policyDigest: "sha256:y",
      requestDigest: "sha256:z",
      rootAuthorizationEvidence: "root-approved",
    });
    expect(wrongParent.ok).toBe(false);
    if (!wrongParent.ok) expect(wrongParent.code).toBe("PARENT_MISMATCH");

    const wrongChild = validateRootCompositionDescriptor({
      schemaVersion: 1,
      compositionId: "cmp-4",
      edgeId: "COMP-002",
      parentDispatchId: "dsp_1",
      parentActivationId: "act_1",
      parentCapabilityId: "research.audit.campaign",
      childCapabilityOrAdapterId: "research.experiment.round",
      maxChildren: 1,
      remainingDispatchBudget: 1,
      procedureDigest: "sha256:x",
      policyDigest: "sha256:y",
      requestDigest: "sha256:z",
      rootAuthorizationEvidence: "root-approved",
    });
    expect(wrongChild.ok).toBe(false);
    if (!wrongChild.ok) expect(wrongChild.code).toBe("CHILD_MISMATCH");

    const missingIds = validateRootCompositionDescriptor({
      schemaVersion: 1,
      compositionId: "cmp-5",
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
    expect(missingIds.ok).toBe(false);
  });

  it("rejects both-true and both-false closure", () => {
    const bothTrue = runMethodologyValidators({
      procedureId: "x",
      procedureVersion: "1",
      procedureDigest: "sha256:x",
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
      facts: { selected: true, blocked: true },
    });
    expect(bothTrue.criticalFailure).toBe(true);
    const bothFalse = runMethodologyValidators({
      procedureId: "x",
      procedureVersion: "1",
      procedureDigest: "sha256:x",
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
      facts: { selected: false, blocked: false },
    });
    expect(bothFalse.criticalFailure).toBe(true);
    const xor = runMethodologyValidators({
      procedureId: "x",
      procedureVersion: "1",
      procedureDigest: "sha256:x",
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
      facts: { selected: true, blocked: false },
    });
    expect(xor.ok).toBe(true);
  });
});

describe("Context v2 methodology projection", () => {
  const encoder = new TextEncoder();
  const capability = RESEARCH_CAPABILITY_REGISTRY.find(
    (c) => c.id === "research.ideation.generate",
  )!;

  function sha256Hex(bytes: Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex");
  }

  it("recomputes digests and refuses checkpoint-name synthesis", () => {
    const contractBytes = encoder.encode(
      `${JSON.stringify({
        procedureId: capability.procedure.id,
        version: "2.0.0",
        checkpoints: ["01-frame", "02-generate"],
        terminalStates: ["success", "blocked"],
        proposalOnly: true,
      })}\n`,
    );
    const exactContractBytes = encoder.encode(
      `${JSON.stringify({
        contracts: [
          {
            id: "candidates",
            pathPattern: "evidence/04_candidates.md",
            mediaType: "text/markdown",
            requiredness: "required",
            cardinality: "1",
          },
        ],
        terminalStates: ["success", "blocked"],
      })}\n`,
    );
    const thinPack = parseSupportPackManifest({
      packJsonBytes: encoder.encode(
        serializeSupportPackManifest({
          schemaVersion: 1,
          procedureId: capability.procedure.id,
          procedureVersion: "2.0.0",
          entries: [
            {
              path: "artifacts/artifact-contract.json",
              role: "artifacts",
              mediaType: "application/json",
              contractVersion: "1",
              provenanceId: "t",
              sha256: sha256Hex(contractBytes),
              maxBytes: 10_000,
              workerVisibility: "worker-visible",
            },
          ],
        }),
      ),
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.0",
    });
    const thinInventory = buildSupportPackInventory({
      manifest: thinPack,
      files: { "artifacts/artifact-contract.json": contractBytes },
    });
    const manifestJson = `${JSON.stringify({
      schemaVersion: 1,
      id: capability.procedure.id,
      version: "2.0.0",
      stage: capability.stage,
      kind: capability.kind,
      inputs: [
        "dispatch",
        "repository",
        "context",
        "artifacts",
        "allowedWritePaths",
        "expectedOutputs",
        "checks",
      ],
      outputs: ["result", "proposal"],
      networkPolicy: capability.networkPolicy,
      repositoryScope: capability.repositoryScope,
      maxDurationMinutes: capability.maxDurationMinutes,
      maxDispatches: capability.maxDispatches,
    })}\n`;
    const thinParsed = parseResearchProcedure({
      capabilityId: capability.id,
      source: "bundled",
      manifestBytes: encoder.encode(manifestJson),
      instructionBytes: encoder.encode("# Procedure\n"),
      identityMode: "recorded-version",
      recordedProcedureId: capability.procedure.id,
      recordedVersion: "2.0.0",
      packageSchemaVersion: 2,
      supportPack: {
        manifest: thinPack,
        packJsonBytes: encoder.encode(serializeSupportPackManifest(thinPack)),
        inventoryItems: thinInventory,
      },
    });
    const thinProjection = buildWorkerMethodologyProjectionV2(thinParsed);
    expect(thinProjection.artifactRequirements).toEqual([]);
    expect(thinProjection.allowedTerminalStates).toEqual(["success", "blocked"]);
    expect(thinProjection.workerVisibleEntries[0]?.sha256).toBe(
      sha256Hex(contractBytes),
    );

    const exactPack = parseSupportPackManifest({
      packJsonBytes: encoder.encode(
        serializeSupportPackManifest({
          schemaVersion: 1,
          procedureId: capability.procedure.id,
          procedureVersion: "2.0.0",
          entries: [
            {
              path: "artifacts/artifact-contract.json",
              role: "artifacts",
              mediaType: "application/json",
              contractVersion: "1",
              provenanceId: "t",
              sha256: sha256Hex(exactContractBytes),
              maxBytes: 10_000,
              workerVisibility: "worker-visible",
            },
          ],
        }),
      ),
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.0",
    });
    const exactInventory = buildSupportPackInventory({
      manifest: exactPack,
      files: { "artifacts/artifact-contract.json": exactContractBytes },
    });
    const exactParsed = parseResearchProcedure({
      capabilityId: capability.id,
      source: "bundled",
      manifestBytes: encoder.encode(manifestJson),
      instructionBytes: encoder.encode("# Procedure\n"),
      identityMode: "recorded-version",
      recordedProcedureId: capability.procedure.id,
      recordedVersion: "2.0.0",
      packageSchemaVersion: 2,
      supportPack: {
        manifest: exactPack,
        packJsonBytes: encoder.encode(serializeSupportPackManifest(exactPack)),
        inventoryItems: exactInventory,
      },
    });
    const exactProjection = buildWorkerMethodologyProjectionV2(exactParsed);
    expect(exactProjection.artifactRequirements).toEqual([
      {
        id: "candidates",
        pathPattern: "evidence/04_candidates.md",
        mediaType: "text/markdown",
        requiredness: "required",
        cardinality: "1",
      },
    ]);
  });

  it("rejects sha256 drift at injection", () => {
    const bytes = encoder.encode('{"terminalStates":["success"]}\n');
    // Same length, different content — size check passes, sha256 must fail.
    const tampered = encoder.encode('{"terminalStates":["SUCCESX"]}\n');
    expect(tampered.byteLength).toBe(bytes.byteLength);
    const pack = parseSupportPackManifest({
      packJsonBytes: encoder.encode(
        serializeSupportPackManifest({
          schemaVersion: 1,
          procedureId: capability.procedure.id,
          procedureVersion: "2.0.0",
          entries: [
            {
              path: "artifacts/artifact-contract.json",
              role: "artifacts",
              mediaType: "application/json",
              contractVersion: "1",
              provenanceId: "t",
              sha256: sha256Hex(bytes),
              maxBytes: 10_000,
            },
          ],
        }),
      ),
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.0",
    });
    const inventory = buildSupportPackInventory({
      manifest: pack,
      files: { "artifacts/artifact-contract.json": bytes },
    });
    // Mutate retained bytes after inventory build (simulates injection-time drift).
    const drifted = inventory.map((item) =>
      item.path === "artifacts/artifact-contract.json"
        ? {
            ...item,
            bytes: tampered,
            // keep declared sha256 and byteLength stale relative to new content hash
          }
        : item,
    );
    const manifestJson = `${JSON.stringify({
      schemaVersion: 1,
      id: capability.procedure.id,
      version: "2.0.0",
      stage: capability.stage,
      kind: capability.kind,
      inputs: [
        "dispatch",
        "repository",
        "context",
        "artifacts",
        "allowedWritePaths",
        "expectedOutputs",
        "checks",
      ],
      outputs: ["result", "proposal"],
      networkPolicy: capability.networkPolicy,
      repositoryScope: capability.repositoryScope,
      maxDurationMinutes: capability.maxDurationMinutes,
      maxDispatches: capability.maxDispatches,
    })}\n`;
    const parsed = parseResearchProcedure({
      capabilityId: capability.id,
      source: "bundled",
      manifestBytes: encoder.encode(manifestJson),
      instructionBytes: encoder.encode("# Procedure\n"),
      identityMode: "recorded-version",
      recordedProcedureId: capability.procedure.id,
      recordedVersion: "2.0.0",
      packageSchemaVersion: 2,
      supportPack: {
        manifest: pack,
        packJsonBytes: encoder.encode(serializeSupportPackManifest(pack)),
        inventoryItems: drifted,
      },
    });
    expect(() => buildWorkerMethodologyProjectionV2(parsed)).toThrow(/sha256 drift/i);
  });
});


describe("evaluation-contract-v1.3.0 enforcement (R2A/R2B)", () => {
  it("never invents selected/blocked from Result.status under v1.3", () => {
    const facts = deriveMethodologyValidatorFacts({
      resultStatus: "completed",
      methodologyContractVersion: V13_METHODOLOGY_CONTRACT_VERSION,
      requireExplicitClosure: true,
    });
    expect(facts).not.toHaveProperty("selected");
    expect(facts).not.toHaveProperty("blocked");

    const historical = deriveMethodologyValidatorFacts({
      resultStatus: "completed",
      methodologyContractVersion: "evaluation-contract-v1.2.0",
    });
    expect(historical.selected).toBe(true);
    expect(historical.blocked).toBe(false);
  });

  it("fails closed when v1.3 closure fields are missing", () => {
    const facts = deriveMethodologyValidatorFacts({
      resultStatus: "completed",
      methodologyContractVersion: V13_METHODOLOGY_CONTRACT_VERSION,
    });
    const report = runMethodologyValidators({
      procedureId: "literature-review-v1",
      procedureVersion: "2.0.3",
      procedureDigest: "sha256:test",
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
      facts,
    });
    expect(report.criticalFailure).toBe(true);
    expect(report.findings.some((f) => f.code === "INVALID_CLOSURE")).toBe(
      true,
    );
  });

  it("accepts explicit XOR closure under v1.3", () => {
    const facts = deriveMethodologyValidatorFacts({
      selected: true,
      blocked: false,
      methodologyContractVersion: V13_METHODOLOGY_CONTRACT_VERSION,
    });
    const report = runMethodologyValidators({
      procedureId: "literature-review-v1",
      procedureVersion: "2.0.3",
      procedureDigest: "sha256:test",
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
      facts,
    });
    expect(report.ok).toBe(true);
  });

  it("builds additive report-v2 without changing report-v1 digest semantics", () => {
    const validation = runMethodologyValidators({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.3",
      procedureDigest: "sha256:abc",
      artifactPaths: [],
      declaredValidators: [],
      facts: { selected: true, blocked: false },
    });
    const v1a = buildMethodologyReport({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.3",
      procedureDigest: "sha256:abc",
      methodologyContractVersion: V13_METHODOLOGY_CONTRACT_VERSION,
      validation,
      zeroWrite: false,
    });
    const v1b = buildMethodologyReport({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.3",
      procedureDigest: "sha256:abc",
      methodologyContractVersion: V13_METHODOLOGY_CONTRACT_VERSION,
      validation,
      zeroWrite: false,
    });
    expect(v1a.reportDigest).toBe(v1b.reportDigest);
    expect(v1a.schemaVersion).toBe(1);

    const v2 = buildMethodologyReportV2({
      reportV1: v1a,
      methodologyContractDigest: V13_METHODOLOGY_CONTRACT_DIGEST,
      closureSource: { selected: true, blocked: false },
    });
    expect(v2.schemaVersion).toBe(2);
    expect(v2.reportV1.reportDigest).toBe(v1a.reportDigest);
    expect(v2.reportDigest.startsWith("sha256:")).toBe(true);
    expect(v2.zeroWriteDisposition).toBe("success-sidecar-allowed");
  });

  it("allows report sidecar only after successful batch commit", () => {
    expect(
      shouldMaterializeMethodologyReportSidecar({
        validationOk: true,
        criticalFailure: false,
        batchCommitted: false,
      }),
    ).toBe(false);
    expect(
      shouldMaterializeMethodologyReportSidecar({
        validationOk: true,
        criticalFailure: false,
        batchCommitted: true,
      }),
    ).toBe(true);
    expect(
      shouldMaterializeMethodologyReportSidecar({
        validationOk: false,
        criticalFailure: true,
        batchCommitted: true,
      }),
    ).toBe(false);
  });

  it("binds 2.0.2 to v1.2 and 2.0.3 to attempt-2 v1.3", () => {
    expect(resolveMethodologyContractBinding("2.0.2").disposition).toBe(
      "exact-v1.2",
    );
    expect(resolveMethodologyContractBinding("2.0.3")).toEqual({
      version: V13_METHODOLOGY_CONTRACT_VERSION,
      digest: V13_METHODOLOGY_CONTRACT_DIGEST,
      disposition: "historical-unaccepted-2.0.3-not-authoritative",
      authoritative: false,
    });
    expect(resolveMethodologyContractBinding("2.0.2").authoritative).toBe(true);
  });

  it("plans root composition without worker launch authority", () => {
    const planned = planRootCompositionAction({
      schemaVersion: 1,
      compositionId: "cmp-r3",
      edgeId: "COMP-001",
      parentDispatchId: "dsp_1",
      parentActivationId: "act_1",
      parentCapabilityId: "research.experiment.campaign",
      childCapabilityOrAdapterId: "research.experiment.round",
      maxChildren: 1,
      remainingDispatchBudget: 1,
      procedureDigest: "sha256:x",
      policyDigest: "sha256:y",
      requestDigest: "sha256:z",
      rootAuthorizationEvidence: "root-approved",
    });
    expect(planned.ok).toBe(true);
    if (planned.ok) {
      expect(planned.action.edgeId).toBe("COMP-001");
      expect(planned.action).not.toHaveProperty("launchWorker");
    }
  });
});

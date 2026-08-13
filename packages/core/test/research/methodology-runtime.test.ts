import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  FROZEN_COMPOSITION_EDGES,
  METHODOLOGY_REPORT_V2_DIGEST_DOMAIN,
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_CONTRACT_VERSION,
  V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  canonicalResearchJson,
  RESEARCH_CAPABILITY_REGISTRY,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  type MethodologyValidationReport,
  buildMethodologyReport,
  buildMethodologyReportV2,
  buildMethodologyReportV131,
  buildSupportPackInventory,
  buildWorkerMethodologyProjectionV2,
  computeMethodologyReportV2DigestFromCanonicalBody,
  deriveMethodologyValidatorFacts,
  listTrustedMethodologyValidatorIds,
  parseAcceptedV131ResearchProcedure,
  parseResearchProcedure,
  parseSupportPackManifest,
  planRootCompositionAction,
  resolveMethodologyContractBinding,
  runMethodologyValidators,
  serializeMethodologyReportV131Sidecar,
  serializeMethodologyReportV2Sidecar,
  serializeSupportPackManifest,
  shouldMaterializeMethodologyReportSidecar,
  bindMethodologyArtifactPath,
  matchesMethodologyPathPattern,
  validateMethodologyArtifacts,
  validateRootCompositionDescriptor,
} from "../../src/research/index.js";

describe("methodology runtime", () => {
  it("binds artifact paths by pathPattern only (no substring / no invented ids)", () => {
    const contracts = [
      {
        id: "01-query",
        version: "1",
        requiredness: "required" as const,
        cardinality: "1" as const,
        pathPattern: "evidence/**/01-query*",
        mediaType: "text/markdown",
        producer: "worker",
        consumers: ["root"],
        terminalApplicability: ["success"],
        validatorIds: ["missing-critical-evidence"],
      },
      {
        id: "02-collect",
        version: "1",
        requiredness: "optional" as const,
        cardinality: "0..1" as const,
        pathPattern: "evidence/**/02-collect*",
        mediaType: "application/json",
        producer: "worker",
        consumers: ["root"],
        terminalApplicability: ["success"],
        validatorIds: [],
      },
    ];
    expect(
      matchesMethodologyPathPattern(
        "evidence/run-1/01-query.md",
        "evidence/**/01-query*",
      ),
    ).toBe(true);
    // Substring of contract id outside the pathPattern must not bind.
    expect(
      bindMethodologyArtifactPath("notes/about-01-query.md", contracts),
    ).toBeUndefined();
    // Path that would match path.includes("01-query") under the old authority
    // but fails the exact pathPattern (wrong prefix).
    expect(
      bindMethodologyArtifactPath("other/run-1/01-query.md", contracts),
    ).toBeUndefined();
    const hit = bindMethodologyArtifactPath(
      "evidence/run-1/01-query.md",
      contracts,
    );
    expect(hit?.id).toBe("01-query");
    expect(hit?.mediaType).toBe("text/markdown");
    // Unmatched path: no invented unexpected-${index} contract.
    expect(
      bindMethodologyArtifactPath("evidence/run-1/unknown.bin", contracts),
    ).toBeUndefined();
  });

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
  );
  if (capability === undefined) {
    throw new Error("Missing research.ideation.generate test capability");
  }

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

    // CS5-4 domain framing: trellis-evaluation-report-v2\0 + canonical JSON,
    // recursive lexicographic keys, no trailing LF, digest field excluded.
    // Independent oracle: a local serializer that does not call the
    // production canonicalizer/digest helper.
    const oracleCanonical = (value: unknown): string => {
      if (value === null) return "null";
      const type = typeof value;
      if (type === "string") return JSON.stringify(value);
      if (type === "boolean") return value ? "true" : "false";
      if (type === "number") return JSON.stringify(value);
      if (Array.isArray(value)) {
        return `[${value.map(oracleCanonical).join(",")}]`;
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      return `{${keys
        .map((key) => `${JSON.stringify(key)}:${oracleCanonical(record[key])}`)
        .join(",")}}`;
    };
    const body = {
      schemaVersion: 2 as const,
      reportV1: v1a,
      methodologyContractDigest: V13_METHODOLOGY_CONTRACT_DIGEST,
      proposalIds: [] as string[],
      resultIds: [] as string[],
      approvalIds: [] as string[],
      closureSource: { selected: true, blocked: false },
      applicability: [] as string[],
      blockedByContract: [] as string[],
      zeroWriteDisposition: "success-sidecar-allowed" as const,
    };
    const canonical = oracleCanonical(body);
    expect(canonical.endsWith("\n")).toBe(false);
    expect(computeMethodologyReportV2DigestFromCanonicalBody(canonical)).toBe(
      v2.reportDigest,
    );
    expect(METHODOLOGY_REPORT_V2_DIGEST_DOMAIN).toEqual(
      new TextEncoder().encode("trellis-evaluation-report-v2\0"),
    );
    // Non-self-referential: digest is not of a body that includes reportDigest.
    expect(canonical.includes(v2.reportDigest)).toBe(false);
    // Same-key recovery serialization is deterministic and ends with LF.
    const sidecar = serializeMethodologyReportV2Sidecar(v2);
    expect(sidecar.endsWith("\n")).toBe(true);
    expect(JSON.parse(sidecar).reportDigest).toBe(v2.reportDigest);
    const historicalDigestDrift = { ...v2, reportDigest: `sha256:${"0".repeat(64)}` };
    expect(serializeMethodologyReportV2Sidecar(historicalDigestDrift)).toBe(
      `${canonicalResearchJson(historicalDigestDrift)}\n`,
    );
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

describe("evaluation-contract-v1.3.1 Procedure 2.0.7 bypass", () => {
  const encoder = new TextEncoder();
  const capability = RESEARCH_CAPABILITY_REGISTRY.find(
    (candidate) => candidate.id === "research.ideation.generate",
  );
  if (capability === undefined) {
    throw new Error("Missing research.ideation.generate test capability");
  }

  function procedure207Input(contractVersion = V131_ACCEPTED_CONTRACT_VERSION, contractDigest = V131_ACCEPTED_CONTRACT_DIGEST) {
    const packJsonBytes = encoder.encode(
      serializeSupportPackManifest({
        schemaVersion: 1,
        procedureId: capability.procedure.id,
        procedureVersion: "2.0.7",
        methodologyContractVersion: contractVersion,
        methodologyContractDigest: contractDigest,
        entries: [],
      }),
    );
    const manifest = parseSupportPackManifest({
      packJsonBytes,
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.7",
    });
    const manifestBytes = encoder.encode(
      `${JSON.stringify({
        schemaVersion: 1,
        id: capability.procedure.id,
        version: "2.0.7",
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
        packageSchemaVersion: 2,
      })}\n`,
    );
    return {
      capabilityId: capability.id,
      source: "bundled" as const,
      manifestBytes,
      instructionBytes: encoder.encode("# Procedure 2.0.7\n"),
      identityMode: "recorded-version" as const,
      recordedProcedureId: capability.procedure.id,
      recordedVersion: "2.0.7",
      packageSchemaVersion: 2 as const,
      supportPack: { manifest, packJsonBytes, inventoryItems: [] },
    };
  }

  it("accepts only the exact 2.0.7 v1.3.1 identity through the generic schema-v2 parser", () => {
    const parsed = parseAcceptedV131ResearchProcedure(procedure207Input());
    expect(parsed.manifest.version).toBe("2.0.7");
    expect(parsed.packageSchemaVersion).toBe(2);
    expect(parsed.digestDomain).toBe("v2");
    expect(parsed.supportPack?.manifest.methodologyContractVersion).toBe(
      V131_ACCEPTED_CONTRACT_VERSION,
    );
    expect(parsed).not.toHaveProperty("methodologyFamilyContract");
  });

  it("rejects wrong Procedure version and wrong v1.3.1 methodology identity without legacy fallback", () => {
    const wrongVersion = procedure207Input();
    expect(() =>
      parseAcceptedV131ResearchProcedure({
        ...wrongVersion,
        recordedVersion: "2.0.6",
      }),
    ).toThrow(/2\.0\.7/);
    expect(() =>
      procedure207Input(V13_ACCEPTED_CONTRACT_VERSION, V13_ACCEPTED_CONTRACT_DIGEST),
    ).toThrow(/2\.0\.7|v1\.3\.1|authorized methodology contract binding/);
  });
});

describe("evaluation-contract-v1.3.1 closed report-v2", () => {
  const acceptedValidatorIds = [
    "trellis.artifact.requiredness",
    "trellis.artifact.cardinality",
    "trellis.artifact.media-type",
    "trellis.artifact.authority",
    "trellis.artifact.ref-binding",
    "trellis.artifact.stable-id",
    "trellis.artifact.provenance",
    "trellis.artifact.dependencies",
    "trellis.artifact.immutability",
    "trellis.artifact.transitions",
    "trellis.artifact.terminal-applicability",
    "trellis.artifact.cross-consistency",
    "trellis.closure.schema",
    "trellis.closure.evidence",
    "trellis.closure.xor",
    "trellis.closure.status-inference",
    "trellis.authority.worker-boundary",
    "trellis.validator.binding-integrity",
    "trellis.report.v2-binding",
    "trellis.contract.integrity",
  ] as const;
  const baseInput = {
    $schema: "https://json-schema.org/draft/2020-12/schema" as const,
    activationId: "act_1",
    applicability: [] as const,
    approvalId: "apr_1",
    artifactBindings: [] as const,
    blockedFacts: [] as const,
    closureSources: [] as const,
    dispatchId: "dsp_1",
    methodologyDigest: V131_ACCEPTED_CONTRACT_DIGEST.slice("sha256:".length),
    methodologyIdentity: V131_ACCEPTED_CONTRACT_VERSION,
    orderedFindings: [] as const,
    orderedValidatorTriples: acceptedValidatorIds.map((id) => ({
      id,
      version: "1.0.0",
      severity: "critical" as const,
    })),
    procedureDigest: `sha256:${"b".repeat(64)}`,
    procedureId: "idea-generation-v1",
    procedureVersion: "2.0.7",
    questId: "qst_1",
    schemaVersion: 2 as const,
    supportInventoryDigest: `sha256:${"c".repeat(64)}`,
    zeroWriteDisposition: "validation-complete-before-write" as const,
  };

  it("builds the exact closed schema and rejects unknown keys or finding-order drift", () => {
    const report = buildMethodologyReportV131(baseInput);
    expect(report).not.toHaveProperty("reportDigest");
    const reportDigest = computeMethodologyReportV2DigestFromCanonicalBody(
      canonicalResearchJson(report),
    );
    expect(reportDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    const sidecar = serializeMethodologyReportV131Sidecar({
      report,
      reportDigest,
    });
    expect(sidecar.endsWith("\n")).toBe(true);
    expect(sidecar.endsWith("\n\n")).toBe(false);
    expect(JSON.parse(sidecar)).not.toHaveProperty("reportDigest");

    expect(() =>
      buildMethodologyReportV131({ ...baseInput, unknown: true } as never),
    ).toThrow(/unknown/i);
    expect(() =>
      buildMethodologyReportV131({
        ...baseInput,
        orderedFindings: [
          {
            validator: { id: "z", version: "1.0.0", severity: "critical" },
            targetId: "a",
            stableError: "V13_B",
            factPointer: "/b",
          },
          {
            validator: { id: "a", version: "1.0.0", severity: "critical" },
            targetId: "a",
            stableError: "V13_A",
            factPointer: "/a",
          },
        ],
      }),
    ).toThrow(/orderedFindings/i);
  });

  it("accepts ideation closure source families", () => {
    for (const family of [
      "research-ideation",
      "research-idea-evaluation",
    ] as const) {
      const closureSource = {
        digest: `sha256:${"d".repeat(64)}`,
        family,
        sourceId: `source-${family}`,
      };
      const report = buildMethodologyReportV131({
        ...baseInput,
        closureSources: [closureSource],
      });
      expect(report.closureSources).toEqual([closureSource]);
    }
  });

  it("rejects quest and computation as closure source families", () => {
    for (const family of ["research-quest", "research-computation"] as const) {
      expect(() =>
        buildMethodologyReportV131({
          ...baseInput,
          closureSources: [
            {
              digest: `sha256:${"d".repeat(64)}`,
              family,
              sourceId: `source-${family}`,
            },
          ],
        }),
      ).toThrow(/closureSources/i);
    }
  });

  it("rejects report-v2 digest and schema drift", () => {
    const report = buildMethodologyReportV131(baseInput);
    expect(() =>
      serializeMethodologyReportV131Sidecar({
        report,
        reportDigest: `sha256:${"0".repeat(64)}`,
      }),
    ).toThrow(/digest/i);
    const schemaDriftedReport = { ...report, unknown: true };
    const schemaDriftedDigest = computeMethodologyReportV2DigestFromCanonicalBody(
      canonicalResearchJson(schemaDriftedReport),
    );
    expect(() =>
      serializeMethodologyReportV131Sidecar({
        report: schemaDriftedReport as never,
        reportDigest: schemaDriftedDigest,
      }),
    ).toThrow(/unknown|schema/i);
    expect(() =>
      buildMethodologyReportV131({
        ...baseInput,
        methodologyIdentity: "evaluation-contract-v1.3.0",
      }),
    ).toThrow(/identity/i);
    expect(() =>
      buildMethodologyReportV131({
        ...baseInput,
        methodologyDigest: "0".repeat(64),
      }),
    ).toThrow(/digest/i);
    expect(() =>
      buildMethodologyReportV131({
        ...baseInput,
        orderedValidatorTriples: baseInput.orderedValidatorTriples.slice(0, 19),
      }),
    ).toThrow(/20/);
    expect(() =>
      buildMethodologyReportV131({
        ...baseInput,
        orderedValidatorTriples: baseInput.orderedValidatorTriples.map(
          (triple, index) =>
            index === 0 ? { ...triple, id: "untrusted.validator" } : triple,
        ),
      }),
    ).toThrow(/trusted|triple/i);
    expect(() =>
      buildMethodologyReportV131({
        ...baseInput,
        orderedValidatorTriples: [...baseInput.orderedValidatorTriples].reverse(),
      }),
    ).toThrow(/ordered|trusted|triple/i);
    expect(() =>
      buildMethodologyReportV131({
        ...baseInput,
        applicability: [
          { applies: true, bindingId: "binding-1", reason: "global", unknown: true },
        ],
      }),
    ).toThrow(/applicability|unknown/i);
    expect(() =>
      buildMethodologyReportV131({
        ...baseInput,
        blockedFacts: [{ factPointer: "not-a-pointer", reason: "missing" }],
      }),
    ).toThrow(/blockedFacts|factPointer/i);
  });
});

describe("CS5-4 report-v2 canonicalization and digest framing", () => {
  it("canonicalResearchJson orders keys lexicographically and preserves array order", () => {
    const canonical = canonicalResearchJson({
      zeta: 1,
      alpha: "x",
      nested: { b: [3, 1, 2], a: true },
      list: ["b", "a"],
    });
    expect(canonical).toBe(
      '{"alpha":"x","list":["b","a"],"nested":{"a":true,"b":[3,1,2]},"zeta":1}',
    );
    expect(canonical.endsWith("\n")).toBe(false);
  });

  it("rejects non-deterministically representable values", () => {
    expect(() => canonicalResearchJson({ x: Number.NaN })).toThrow(
      /Non-deterministic/,
    );
    expect(() => canonicalResearchJson({ x: Number.POSITIVE_INFINITY })).toThrow(
      /Non-deterministic/,
    );
    expect(() => canonicalResearchJson({ x: 1n })).toThrow(/Non-deterministic/);
    expect(() => canonicalResearchJson([undefined])).toThrow(
      /Non-deterministic/,
    );
    expect(() => canonicalResearchJson({ fn: () => 1 })).toThrow(
      /Non-deterministic/,
    );
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalResearchJson(cyclic)).toThrow(/Cyclic/);
  });

  it("digest body excludes the digest field and has no trailing LF", () => {
    const validation: MethodologyValidationReport = {
      ok: true,
      criticalFailure: false,
      findings: [],
    };
    const v1 = buildMethodologyReport({
      procedureId: "figure-v1",
      procedureVersion: "2.0.6",
      procedureDigest: "sha256:abc",
      methodologyContractVersion: V13_ACCEPTED_CONTRACT_VERSION,
      validation,
    });
    const v2 = buildMethodologyReportV2({
      reportV1: v1,
      methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      acceptedMemberAggregateSha256: V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
      bindingApplicableCount: 42,
      bindingInvocationCount: 42,
      bindingInvocationLedgerDigest: "sha256:ledger",
      resultId: "res_1",
      proposalId: "prp_1",
      approvalId: "apr_1",
      idempotencyKey: "key-1",
      batchHeadSeq: 7,
      batchCommitted: true,
      closureSource: { selected: true, blocked: false },
    });
    expect(v2.reportDigest.startsWith("sha256:")).toBe(true);
    expect(v2.bindingApplicableCount).toBe(42);
    expect(v2.resultId).toBe("res_1");
    expect(v2.batchCommitted).toBe(true);
    // Sidecar serialization is canonical and ends with exactly one LF.
    const sidecar = serializeMethodologyReportV2Sidecar(v2);
    expect(sidecar.endsWith("\n")).toBe(true);
    expect(sidecar.endsWith("\n\n")).toBe(false);
    // The sidecar round-trips and its canonical bytes are the published form.
    expect(JSON.parse(sidecar).reportDigest).toBe(v2.reportDigest);
    // Digest equality is framing-independent: recomputing over the canonical
    // body (digest field excluded by construction) reproduces reportDigest.
    const withoutDigest = { ...v2 };
    delete (withoutDigest as { reportDigest?: string }).reportDigest;
    expect(
      computeMethodologyReportV2DigestFromCanonicalBody(
        canonicalResearchJson(withoutDigest),
      ),
    ).toBe(v2.reportDigest);
    // Any change to a bound field changes the digest.
    const v2b = buildMethodologyReportV2({
      reportV1: v1,
      methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      bindingApplicableCount: 43,
    });
    expect(v2b.reportDigest).not.toBe(v2.reportDigest);
  });
});

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FROZEN_METHODOLOGY_CONTRACT_DIGEST,
  FROZEN_METHODOLOGY_CONTRACT_VERSION,
  RESEARCH_CAPABILITY_REGISTRY,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  canonicalResearchJson,
  computeMethodologyReportV2DigestFromCanonicalBody,
  type ParsedResearchProcedure,
  type SupportPackInventoryItem,
} from "@mindfoldhq/trellis-core/research";
import { describe, expect, it } from "vitest";

import {
  loadAcceptedV131ContractPackFromLeaves,
  loadArtifactContractsFromProcedure,
  validateMethodologyBeforeRecord,
} from "../../src/commands/research/dispatch-methodology-validation.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const freezePath = path.join(
  repoRoot,
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/methodology-contract-freeze.json",
);
const encoder = new TextEncoder();
const V131_CLOSURE_ID = "art_11111111-1111-4111-8111-111111111111";
const V131_EVIDENCE_ID = "art_22222222-2222-4222-8222-222222222222";
const V131_REPOSITORY_ID = "rep_11111111-1111-4111-8111-111111111111";

function v131ValidationInput(
  artifactRefFacts?: readonly Parameters<
    typeof validateMethodologyBeforeRecord
  >[0]["artifactRefFacts"],
): Parameters<typeof validateMethodologyBeforeRecord>[0] {
  const procedure = procedure207();
  return {
    procedureId: "idea-generation-v1",
    procedureVersion: "2.0.7",
    procedureDigest: procedure.digest,
    procedure,
    capabilityId: "research.ideation.generate",
    supportInventoryDigest:
      "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    artifactRefFacts:
      artifactRefFacts ??
      [
        {
          artifactId: V131_CLOSURE_ID,
          repositoryId: V131_REPOSITORY_ID,
          resolvedRepositoryIdentity: "/verified/repository",
          exactPath: "methodology/closure/research-ideation.json",
          submittedMediaType: "application/json",
          submittedSha256: "a".repeat(64),
          present: true,
        },
        {
          artifactId: V131_EVIDENCE_ID,
          repositoryId: V131_REPOSITORY_ID,
          resolvedRepositoryIdentity: "/verified/repository",
          exactPath: "outputs/evidence.json",
          submittedMediaType: "application/json",
          submittedSha256: "b".repeat(64),
          present: true,
        },
      ],
    dispatchContext: {
      questId: "qst_11111111-1111-4111-8111-111111111111",
      dispatchId: "dsp_11111111-1111-4111-8111-111111111111",
      activationId: "act_11111111-1111-4111-8111-111111111111",
      approvalId: "apr_11111111-1111-4111-8111-111111111111",
      capabilityId: "research.ideation.generate",
    },
    closureObservation: {
      schemaVersion: 1,
      family: "research-ideation",
      selected: true,
      blocked: false,
      selectedEvidenceArtifactIds: [V131_EVIDENCE_ID],
      blockedEvidenceArtifactIds: [],
    },
    closureArtifactRef: {
      artifactId: V131_CLOSURE_ID,
      exactPath: "methodology/closure/research-ideation.json",
      sha256: "a".repeat(64),
      mediaType: "application/json",
    },
    acceptedV131Pack: loadAcceptedV131ContractPackFromLeaves(),
    batchCommitted: true,
  };
}

function ideationFamily(): Record<string, unknown> {
  const freeze = JSON.parse(fs.readFileSync(freezePath, "utf8")) as {
    packages: Record<string, unknown>[];
  };
  const family = freeze.packages.find(
    (candidate) => candidate.package === "research-ideation",
  );
  if (family === undefined) throw new Error("Missing ideation family");
  return structuredClone(family);
}

function procedure207(): ParsedResearchProcedure {
  const capability = RESEARCH_CAPABILITY_REGISTRY.find(
    (candidate) => candidate.id === "research.ideation.generate",
  );
  if (capability === undefined) throw new Error("Missing ideation capability");
  return Object.freeze({
    capability,
    source: "project",
    manifest: Object.freeze({
      schemaVersion: 1,
      id: "idea-generation-v1",
      version: "2.0.7",
      stage: capability.stage,
      kind: capability.kind,
      inputs: Object.freeze(["dispatch"]),
      outputs: Object.freeze(["result"]),
      networkPolicy: capability.networkPolicy,
      repositoryScope: capability.repositoryScope,
      packageSchemaVersion: 2,
    }),
    canonicalManifestJson: "",
    instructions: "# Procedure\n",
    digest:
      "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    digestDomain: "v2",
    packageSchemaVersion: 2,
    supportPack: Object.freeze({
      manifest: Object.freeze({
        schemaVersion: 1,
        procedureId: "idea-generation-v1",
        procedureVersion: "2.0.7",
        methodologyContractVersion: V131_ACCEPTED_CONTRACT_VERSION,
        methodologyContractDigest: V131_ACCEPTED_CONTRACT_DIGEST,
        entries: Object.freeze([]),
      }),
      packJsonBytes: new Uint8Array(),
      inventoryItems: Object.freeze([]),
      workerVisibleInventory: Object.freeze([]),
      rootOnlyInventory: Object.freeze([]),
    }),
  });
}

function procedure203(
  bytes: Uint8Array,
  version: "2.0.2" | "2.0.3" = "2.0.3",
): ParsedResearchProcedure {
  const capability = RESEARCH_CAPABILITY_REGISTRY.find(
    (candidate) => candidate.id === "research.ideation.generate",
  );
  if (capability === undefined) throw new Error("Missing ideation capability");
  const methodologyContractVersion =
    version === "2.0.3"
      ? V13_METHODOLOGY_CONTRACT_VERSION
      : FROZEN_METHODOLOGY_CONTRACT_VERSION;
  const methodologyContractDigest =
    version === "2.0.3"
      ? V13_METHODOLOGY_CONTRACT_DIGEST
      : FROZEN_METHODOLOGY_CONTRACT_DIGEST;
  const item: SupportPackInventoryItem = Object.freeze({
    path: "artifacts/artifact-contract.json",
    role: "artifacts",
    mediaType: "application/json",
    contractVersion: FROZEN_METHODOLOGY_CONTRACT_VERSION,
    provenanceId: "public-v1.2-freeze",
    sha256: "a".repeat(64),
    byteLength: bytes.byteLength,
    workerVisibility: "root-only",
    bytes,
  });
  return Object.freeze({
    capability,
    source: "bundled",
    manifest: Object.freeze({
      schemaVersion: 1,
      id: capability.procedure.id,
      version,
      stage: capability.stage,
      kind: capability.kind,
      inputs: Object.freeze(["dispatch"]),
      outputs: Object.freeze(["result"]),
      networkPolicy: capability.networkPolicy,
      repositoryScope: capability.repositoryScope,
      packageSchemaVersion: 2,
    }),
    canonicalManifestJson: "",
    instructions: "# Procedure\n",
    digest: "sha256:test",
    digestDomain: "v2",
    packageSchemaVersion: 2,
    supportPack: Object.freeze({
      manifest: Object.freeze({
        schemaVersion: 1,
        procedureId: capability.procedure.id,
        procedureVersion: version,
        methodologyContractVersion,
        methodologyContractDigest,
        entries: Object.freeze([]),
      }),
      packJsonBytes: new Uint8Array(),
      inventoryItems: Object.freeze([item]),
      workerVisibleInventory: Object.freeze([]),
      rootOnlyInventory: Object.freeze([item]),
    }),
  });
}

describe("root methodology contract loading (containment)", () => {
  it("does not treat 2.0.3 as lossless family authority loader", () => {
    const bytes = encoder.encode(`${JSON.stringify(ideationFamily())}\n`);
    // Contained: no family authority load for 2.0.3 — returns empty lifecycle set.
    expect(loadArtifactContractsFromProcedure(procedure203(bytes))).toEqual([]);
  });

  it("fails closed methodology authority for 2.0.3 / rejected A2 digests", () => {
    const bytes = encoder.encode(`${JSON.stringify(ideationFamily())}\n`);
    const gate = validateMethodologyBeforeRecord({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.3",
      procedureDigest: "sha256:test",
      procedure: procedure203(bytes),
      selected: true,
      blocked: false,
      batchCommitted: false,
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
    });
    expect(gate.ok).toBe(false);
    expect(gate.criticalFailure).toBe(true);
    expect(
      gate.report.validation.findings.some(
        (f) => f.code === "METHODOLOGY_AUTHORITY_NOT_ACCEPTED",
      ),
    ).toBe(true);
    expect(gate.materializeSidecar).toBe(false);
  });

  it("does not apply the 2.0.3 lossless gate to historical 2.0.2 replay", () => {
    const historicalBytes = encoder.encode('{"contracts":[]}\n');
    expect(
      loadArtifactContractsFromProcedure(
        procedure203(historicalBytes, "2.0.2"),
      ),
    ).toEqual([]);
  });

  it("executes all 29 exact v1.3.1 bindings and builds the closed report", () => {
    const procedure = procedure207();
    const closureId = "art_11111111-1111-4111-8111-111111111111";
    const evidenceId = "art_22222222-2222-4222-8222-222222222222";
    const gate = validateMethodologyBeforeRecord({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.7",
      procedureDigest: procedure.digest,
      procedure,
      capabilityId: "research.ideation.generate",
      supportInventoryDigest:
        "sha256:2222222222222222222222222222222222222222222222222222222222222222",
      artifactRefFacts: [
        {
          artifactId: closureId,
          repositoryId: "rep_11111111-1111-4111-8111-111111111111",
          resolvedRepositoryIdentity: "/verified/repository",
          exactPath: "methodology/closure/research-ideation.json",
          submittedMediaType: "application/json",
          submittedSha256: "a".repeat(64),
          present: true,
        },
        {
          artifactId: evidenceId,
          repositoryId: "rep_11111111-1111-4111-8111-111111111111",
          resolvedRepositoryIdentity: "/verified/repository",
          exactPath: "outputs/evidence.json",
          submittedMediaType: "application/json",
          submittedSha256: "b".repeat(64),
          present: true,
        },
      ],
      dispatchContext: {
        questId: "qst_11111111-1111-4111-8111-111111111111",
        dispatchId: "dsp_11111111-1111-4111-8111-111111111111",
        activationId: "act_11111111-1111-4111-8111-111111111111",
        approvalId: "apr_11111111-1111-4111-8111-111111111111",
        capabilityId: "research.ideation.generate",
      },
      closureObservation: {
        schemaVersion: 1,
        family: "research-ideation",
        selected: true,
        blocked: false,
        selectedEvidenceArtifactIds: [evidenceId],
        blockedEvidenceArtifactIds: [],
      },
      closureArtifactRef: {
        artifactId: closureId,
        exactPath: "methodology/closure/research-ideation.json",
        sha256: "a".repeat(64),
        mediaType: "application/json",
      },
      acceptedV131Pack: loadAcceptedV131ContractPackFromLeaves(),
      batchCommitted: true,
    });
    expect(gate.reportKind).toBe("v1.3.1");
    if (gate.reportKind !== "v1.3.1") throw new Error("wrong report branch");
    expect(gate.ok).toBe(true);
    expect(gate.criticalFailure).toBe(false);
    expect(gate.materializeSidecar).toBe(true);
    expect(gate.reportV131.applicability).toHaveLength(29);
    expect(gate.reportV131.artifactBindings).toHaveLength(13);
    expect(gate.reportV131.blockedFacts).toEqual([]);
    expect(gate.reportV131.orderedFindings).toEqual([]);
    expect(gate.reportV131.orderedValidatorTriples).toHaveLength(20);
    expect(gate.reportV131.closureSources).toEqual([
      {
        digest: `sha256:${"a".repeat(64)}`,
        family: "research-ideation",
        sourceId: closureId,
      },
    ]);
    expect(gate.reportDigest).toBe(
      computeMethodologyReportV2DigestFromCanonicalBody(
        canonicalResearchJson(gate.reportV131),
      ),
    );
  });

  it("rejects an injected parsed pack that differs from authenticated authority leaves", () => {
    const accepted = loadAcceptedV131ContractPackFromLeaves();
    const drifted = {
      ...accepted,
      closureFamilies: [...accepted.closureFamilies].reverse(),
    };
    expect(() =>
      validateMethodologyBeforeRecord({
        ...v131ValidationInput(),
        acceptedV131Pack: drifted,
      }),
    ).toThrow(
      "Injected accepted v1.3.1 pack does not match the authenticated authority leaves",
    );
  });

  it("classifies all closed v1.3.1 blocked-fact reasons without skipping bindings", () => {
    const base = v131ValidationInput().artifactRefFacts;
    if (base === undefined || base[0] === undefined || base[1] === undefined) {
      throw new Error("Missing base v1.3.1 ArtifactRef facts");
    }
    const closure = base[0];
    const evidence = base[1];
    const cases = [
      { reason: "missing", facts: [] },
      {
        reason: "unknown",
        facts: [{ ...closure, submittedSha256: undefined }, evidence],
      },
      {
        reason: "unauthenticated",
        facts: [
          { ...closure, resolvedRepositoryIdentity: undefined },
          evidence,
        ],
      },
      {
        reason: "ambiguous",
        facts: [
          closure,
          {
            ...closure,
            artifactId: "art_33333333-3333-4333-8333-333333333333",
          },
          evidence,
        ],
      },
      {
        reason: "aliased",
        facts: [
          closure,
          { ...closure, exactPath: "outputs/closure-alias.json" },
          evidence,
        ],
      },
      {
        reason: "contradictory",
        facts: [
          { ...closure, submittedMediaType: "application/octet-stream" },
          evidence,
        ],
      },
    ] as const;

    for (const testCase of cases) {
      const gate = validateMethodologyBeforeRecord(
        v131ValidationInput(testCase.facts),
      );
      expect(gate.reportKind, testCase.reason).toBe("v1.3.1");
      if (gate.reportKind !== "v1.3.1") {
        throw new Error("wrong report branch");
      }
      expect(gate.ok, testCase.reason).toBe(false);
      expect(gate.criticalFailure, testCase.reason).toBe(true);
      expect(gate.materializeSidecar, testCase.reason).toBe(false);
      expect(gate.reportV131.applicability, testCase.reason).toHaveLength(29);
      expect(gate.reportV131.orderedFindings.length, testCase.reason).toBeGreaterThan(
        0,
      );
      expect(
        gate.reportV131.blockedFacts.some(
          (row) => row.reason === testCase.reason,
        ),
        testCase.reason,
      ).toBe(true);
    }
  }, 60_000);

  it("does not emit report-v2 materialization for live 1.0.0 path", () => {
    const gate = validateMethodologyBeforeRecord({
      procedureId: "idea-generation-v1",
      procedureVersion: "1.0.0",
      procedureDigest: "sha256:test",
      selected: true,
      blocked: false,
      batchCommitted: true,
      artifactPaths: [],
    });
    expect(gate.materializeSidecar).toBe(false);
    expect(gate.report.schemaVersion).toBe(1);
  });
});

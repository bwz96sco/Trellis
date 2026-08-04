import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FROZEN_METHODOLOGY_CONTRACT_DIGEST,
  FROZEN_METHODOLOGY_CONTRACT_VERSION,
  RESEARCH_CAPABILITY_REGISTRY,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  type ParsedResearchProcedure,
  type SupportPackInventoryItem,
} from "@mindfoldhq/trellis-core/research";
import { describe, expect, it } from "vitest";

import {
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

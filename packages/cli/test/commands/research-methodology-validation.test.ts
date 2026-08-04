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

import { loadArtifactContractsFromProcedure } from "../../src/commands/research/dispatch-methodology-validation.js";

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

describe("root methodology contract loading", () => {
  it("strictly validates 2.0.3 without coercing frozen checkpoints into legacy lifecycle contracts", () => {
    const bytes = encoder.encode(`${JSON.stringify(ideationFamily())}\n`);
    expect(loadArtifactContractsFromProcedure(procedure203(bytes))).toEqual([]);
  });

  it("rejects semantically altered 2.0.3 contracts under the frozen identity", () => {
    const family = ideationFamily();
    const checkpoint = (family.checkpoints as Record<string, unknown>[]).find(
      (candidate) => "phase2_note" in candidate,
    );
    if (checkpoint === undefined) throw new Error("Missing ordered checkpoint");
    checkpoint.phase2_note = "Invented replacement framing";

    expect(() =>
      loadArtifactContractsFromProcedure(
        procedure203(encoder.encode(`${JSON.stringify(family)}\n`)),
      ),
    ).toThrow(/historical Phase-2 packaging family contract/);
  });

  it("does not apply the 2.0.3 lossless gate to historical 2.0.2 replay", () => {
    const historicalBytes = encoder.encode('{"contracts":[]}\n');
    expect(
      loadArtifactContractsFromProcedure(
        procedure203(historicalBytes, "2.0.2"),
      ),
    ).toEqual([]);
  });

  it("fails closed on malformed and duplicate-key 2.0.3 contracts", () => {
    expect(() =>
      loadArtifactContractsFromProcedure(procedure203(encoder.encode("{"))),
    ).toThrow(/strict UTF-8 JSON/);

    const duplicate = JSON.stringify(ideationFamily()).replace(
      /^\{/,
      '{"package":"research-ideation",',
    );
    expect(() =>
      loadArtifactContractsFromProcedure(
        procedure203(encoder.encode(duplicate)),
      ),
    ).toThrow(/duplicate object key/);
  });
});

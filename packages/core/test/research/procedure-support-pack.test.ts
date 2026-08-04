import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_CAPABILITY_REGISTRY,
  buildSupportPackInventory,
  computeResearchProcedureDigest,
  computeResearchProcedureDigestV2,
  parseResearchProcedure,
  parseSupportPackManifest,
  serializeSupportPackManifest,
} from "../../src/research/index.js";

const encoder = new TextEncoder();

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const capability = RESEARCH_CAPABILITY_REGISTRY.find(
  (c) => c.id === "research.ideation.generate",
)!;

function v1ManifestJson(version = capability.procedure.version): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    id: capability.procedure.id,
    version,
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
}

describe("procedure support pack", () => {
  it("binds v2 digests to every enumerated entry and ignores unnamed siblings", () => {
    const fileA = encoder.encode("# stage\n");
    const fileB = encoder.encode('{"k":1}\n');
    const pack = parseSupportPackManifest({
      packJsonBytes: encoder.encode(
        serializeSupportPackManifest({
          schemaVersion: 1,
          procedureId: capability.procedure.id,
          procedureVersion: "2.0.0",
          entries: [
            {
              path: "instructions/stage.md",
              role: "instructions",
              mediaType: "text/markdown",
              contractVersion: "1",
              provenanceId: "SRC-TEST",
              sha256: sha256Hex(fileA),
              maxBytes: 10_000,
            },
            {
              path: "artifacts/contract.json",
              role: "artifacts",
              mediaType: "application/json",
              contractVersion: "1",
              provenanceId: "SRC-TEST",
              sha256: sha256Hex(fileB),
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
      files: {
        "instructions/stage.md": fileA,
        "artifacts/contract.json": fileB,
        // unnamed sibling must not be required
        "secrets/not-in-pack.txt": encoder.encode("ignore"),
      },
    });
    expect(inventory).toHaveLength(2);

    const manifestBytes = encoder.encode(v1ManifestJson("2.0.0"));
    // For capability-current, version must match registry — use recorded mode for 2.0.0
    const parsed = parseResearchProcedure({
      capabilityId: capability.id,
      source: "bundled",
      manifestBytes,
      instructionBytes: encoder.encode("# Procedure\n"),
      identityMode: "recorded-version",
      recordedProcedureId: capability.procedure.id,
      recordedVersion: "2.0.0",
      packageSchemaVersion: 2,
      supportPack: {
        manifest: pack,
        packJsonBytes: encoder.encode(serializeSupportPackManifest(pack)),
        inventoryItems: inventory,
      },
    });
    expect(parsed.digestDomain).toBe("v2");
    expect(parsed.packageSchemaVersion).toBe(2);
    expect(parsed.supportPack?.inventoryItems).toHaveLength(2);
    expect(parsed.digest.startsWith("sha256:")).toBe(true);

    const v1 = computeResearchProcedureDigest({
      canonicalManifestBytes: manifestBytes,
      instructionBytes: encoder.encode("# Procedure\n"),
    });
    expect(parsed.digest).not.toBe(v1);

    // mutate one entry byte → digest changes
    const inventory2 = buildSupportPackInventory({
      manifest: {
        ...pack,
        entries: pack.entries.map((e) =>
          e.path === "instructions/stage.md"
            ? {
                ...e,
                sha256: sha256Hex(encoder.encode("# stage changed\n")),
              }
            : e,
        ),
      },
      files: {
        "instructions/stage.md": encoder.encode("# stage changed\n"),
        "artifacts/contract.json": fileB,
      },
    });
    const digest2 = computeResearchProcedureDigestV2({
      canonicalManifestBytes: manifestBytes,
      instructionBytes: encoder.encode("# Procedure\n"),
      packJsonBytes: encoder.encode(
        serializeSupportPackManifest({
          ...pack,
          entries: inventory2.map((i) => ({
            path: i.path,
            role: i.role,
            mediaType: i.mediaType,
            contractVersion: i.contractVersion,
            provenanceId: i.provenanceId,
            sha256: i.sha256,
            maxBytes: 10_000,
          })),
        }),
      ),
      inventoryItems: inventory2,
    });
    expect(digest2).not.toBe(parsed.digest);
  });

  it("rejects path escape and sha mismatch", () => {
    expect(() =>
      parseSupportPackManifest({
        packJsonBytes: encoder.encode(
          `${JSON.stringify({
            schemaVersion: 1,
            procedureId: capability.procedure.id,
            procedureVersion: "2.0.0",
            entries: [
              {
                path: "../escape.md",
                role: "instructions",
                mediaType: "text/markdown",
                contractVersion: "1",
                provenanceId: "x",
                sha256: "a".repeat(64),
                maxBytes: 10,
              },
            ],
          })}\n`,
        ),
        procedureId: capability.procedure.id,
        procedureVersion: "2.0.0",
      }),
    ).toThrow(/unsafe|invalid/i);

    const bytes = encoder.encode("hi\n");
    const pack = parseSupportPackManifest({
      packJsonBytes: encoder.encode(
        serializeSupportPackManifest({
          schemaVersion: 1,
          procedureId: capability.procedure.id,
          procedureVersion: "2.0.0",
          entries: [
            {
              path: "instructions/a.md",
              role: "instructions",
              mediaType: "text/markdown",
              contractVersion: "1",
              provenanceId: "x",
              sha256: "b".repeat(64),
              maxBytes: 100,
            },
          ],
        }),
      ),
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.0",
    });
    expect(() =>
      buildSupportPackInventory({
        manifest: pack,
        files: { "instructions/a.md": bytes },
      }),
    ).toThrow(/sha256 mismatch/i);
  });

  it("preserves v1 digest domain when no support pack is provided", () => {
    const parsed = parseResearchProcedure({
      capabilityId: capability.id,
      source: "bundled",
      manifestBytes: encoder.encode(v1ManifestJson()),
      instructionBytes: encoder.encode("# Procedure\n"),
    });
    expect(parsed.digestDomain).toBe("v1");
    expect(parsed.digest).toBe(
      computeResearchProcedureDigest({
        canonicalManifestBytes: encoder.encode(v1ManifestJson()),
        instructionBytes: encoder.encode("# Procedure\n"),
      }),
    );
  });

  it("requires methodology contract and explicit visibility for 2.0.2 packs", () => {
    const fileA = encoder.encode("# stage\n");
    const baseEntry = {
      path: "instructions/stage.md",
      role: "instructions" as const,
      mediaType: "text/markdown",
      contractVersion: "1",
      provenanceId: "SRC-TEST",
      sha256: sha256Hex(fileA),
      maxBytes: 10_000,
    };
    expect(() =>
      parseSupportPackManifest({
        packJsonBytes: encoder.encode(
          `${JSON.stringify({
            schemaVersion: 1,
            procedureId: capability.procedure.id,
            procedureVersion: "2.0.2",
            entries: [baseEntry],
          })}\n`,
        ),
        procedureId: capability.procedure.id,
        procedureVersion: "2.0.2",
      }),
    ).toThrow(/methodologyContract/i);

    expect(() =>
      parseSupportPackManifest({
        packJsonBytes: encoder.encode(
          `${JSON.stringify({
            schemaVersion: 1,
            procedureId: capability.procedure.id,
            procedureVersion: "2.0.2",
            methodologyContractVersion: "evaluation-contract-v1.2.0",
            methodologyContractDigest:
              "sha256:57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb",
            entries: [baseEntry],
          })}\n`,
        ),
        procedureId: capability.procedure.id,
        procedureVersion: "2.0.2",
      }),
    ).toThrow(/workerVisibility/i);

    const ok = parseSupportPackManifest({
      packJsonBytes: encoder.encode(
        serializeSupportPackManifest({
          schemaVersion: 1,
          procedureId: capability.procedure.id,
          procedureVersion: "2.0.2",
          methodologyContractVersion: "evaluation-contract-v1.2.0",
          methodologyContractDigest:
            "sha256:57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb",
          entries: [
            {
              ...baseEntry,
              workerVisibility: "root-only",
            },
          ],
        }),
      ),
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.2",
    });
    expect(ok.entries[0]?.workerVisibility).toBe("root-only");
  });

  it("binds 2.0.3 to evaluation-contract-v1.3.0 attempt-2 digests and rejects v1.2 on 2.0.3", () => {
    const fileA = encoder.encode("# stage\n");
    const baseEntry = {
      path: "instructions/stage.md",
      role: "instructions" as const,
      mediaType: "text/markdown",
      contractVersion: "1",
      provenanceId: "SRC-TEST",
      sha256: sha256Hex(fileA),
      maxBytes: 10_000,
      workerVisibility: "root-only" as const,
    };
    expect(() =>
      parseSupportPackManifest({
        packJsonBytes: encoder.encode(
          serializeSupportPackManifest({
            schemaVersion: 1,
            procedureId: capability.procedure.id,
            procedureVersion: "2.0.3",
            methodologyContractVersion: "evaluation-contract-v1.2.0",
            methodologyContractDigest:
              "sha256:57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb",
            entries: [baseEntry],
          }),
        ),
        procedureId: capability.procedure.id,
        procedureVersion: "2.0.3",
      }),
    ).toThrow(/evaluation-contract-v1\.3\.0 attempt-2/);

    const ok = parseSupportPackManifest({
      packJsonBytes: encoder.encode(
        serializeSupportPackManifest({
          schemaVersion: 1,
          procedureId: capability.procedure.id,
          procedureVersion: "2.0.3",
          methodologyContractVersion: "evaluation-contract-v1.3.0",
          methodologyContractDigest:
            "sha256:76bf0a2402c8585e79499fdfdcc7afda2ff58d479c483fcf19f13e45d9318166",
          entries: [baseEntry],
        }),
      ),
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.3",
    });
    expect(ok.methodologyContractVersion).toBe("evaluation-contract-v1.3.0");
    expect(ok.methodologyContractDigest).toBe(
      "sha256:76bf0a2402c8585e79499fdfdcc7afda2ff58d479c483fcf19f13e45d9318166",
    );
  });
});

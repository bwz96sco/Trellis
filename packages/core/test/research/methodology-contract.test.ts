import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
  FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
  FROZEN_METHODOLOGY_CONTRACT_DIGEST,
  FROZEN_METHODOLOGY_CONTRACT_VERSION,
  FROZEN_METHODOLOGY_DERIVABILITY_MATRIX_DIGEST,
  FROZEN_METHODOLOGY_FAMILY_COUNT,
  FROZEN_ORDERED_STAGE_COUNT,
  HISTORICAL_INVALID_PHASE2_CHECKPOINT_FIXTURE,
  RESEARCH_CAPABILITY_REGISTRY,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  buildSupportPackInventory,
  buildWorkerMethodologyProjectionV2,
  loadResearchMethodologyContractFromProcedure,
  parseResearchMethodologyDerivabilityMatrix,
  parseResearchMethodologyFamilyContract,
  parseResearchMethodologyFreeze,
  parseResearchProcedure,
  parseSupportPackManifest,
  resolveMethodologyContractBinding,
  serializeSupportPackManifest,
  verifyResearchMethodologyDerivabilityMatrixConformance,
  verifyResearchMethodologyFreezeConformance,
  type ParsedResearchProcedure,
  type ResearchMethodologyDerivabilityMatrix,
  type SupportPackWorkerVisibility,
} from "../../src/research/index.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const freezePath = path.join(
  repoRoot,
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/methodology-contract-freeze.json",
);
const matrixPath = path.join(
  repoRoot,
  ".trellis/tasks/07-29-migrate-research-methodology-to-procedures/research/r0-methodology-derivability-matrix.json",
);
const coverageMapPath = path.join(
  repoRoot,
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/package-coverage-map.json",
);
const frozenBytes = fs.readFileSync(freezePath);
const matrixBytes = fs.readFileSync(matrixPath);
const coverageMapBytes = fs.readFileSync(coverageMapPath);
const encoder = new TextEncoder();

type JsonRecord = Record<string, unknown>;

function independentFreeze(): JsonRecord {
  return JSON.parse(fs.readFileSync(freezePath, "utf8")) as JsonRecord;
}

function independentMatrix(): JsonRecord {
  return JSON.parse(fs.readFileSync(matrixPath, "utf8")) as JsonRecord;
}

function parseMatrix(
  bytes: Uint8Array = matrixBytes,
): ResearchMethodologyDerivabilityMatrix {
  return parseResearchMethodologyDerivabilityMatrix({
    matrixBytes: bytes,
    freezeBytes: frozenBytes,
    coverageMapBytes,
  });
}

function encodeJson(value: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(value)}\n`);
}

function familyAt(freeze: JsonRecord, index: number): JsonRecord {
  const packages = freeze.packages as JsonRecord[];
  const family = packages[index];
  if (family === undefined) throw new Error(`Missing family at ${index}`);
  return family;
}

function checkpointAt(family: JsonRecord, index: number): JsonRecord {
  const checkpoints = family.checkpoints as JsonRecord[];
  const checkpoint = checkpoints[index];
  if (checkpoint === undefined) throw new Error(`Missing checkpoint at ${index}`);
  return checkpoint;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function procedure203(
  workerVisibility: SupportPackWorkerVisibility,
): ParsedResearchProcedure {
  const capability = RESEARCH_CAPABILITY_REGISTRY.find(
    (candidate) => candidate.id === "research.ideation.generate",
  );
  if (capability === undefined) throw new Error("Missing ideation capability");
  const source = independentFreeze();
  const family = (source.packages as JsonRecord[]).find(
    (candidate) => candidate.package === "research-ideation",
  );
  if (family === undefined) throw new Error("Missing ideation family");
  const contractBytes = encodeJson(family);
  const manifest = parseSupportPackManifest({
    packJsonBytes: encoder.encode(
      serializeSupportPackManifest({
        schemaVersion: 1,
        procedureId: capability.procedure.id,
        procedureVersion: "2.0.3",
        methodologyContractVersion: V13_METHODOLOGY_CONTRACT_VERSION,
        methodologyContractDigest: V13_METHODOLOGY_CONTRACT_DIGEST,
        entries: [
          {
            path: "artifacts/artifact-contract.json",
            role: "artifacts",
            mediaType: "application/json",
            contractVersion: FROZEN_METHODOLOGY_CONTRACT_VERSION,
            provenanceId: "public-v1.2-freeze",
            sha256: sha256Hex(contractBytes),
            maxBytes: 1_000_000,
            workerVisibility,
          },
        ],
      }),
    ),
    procedureId: capability.procedure.id,
    procedureVersion: "2.0.3",
  });
  const inventory = buildSupportPackInventory({
    manifest,
    files: { "artifacts/artifact-contract.json": contractBytes },
  });
  const procedureJson = `${JSON.stringify({
    schemaVersion: 1,
    id: capability.procedure.id,
    version: "2.0.3",
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
  })}\n`;
  return parseResearchProcedure({
    capabilityId: capability.id,
    source: "bundled",
    manifestBytes: encoder.encode(procedureJson),
    instructionBytes: encoder.encode("# Procedure\n"),
    identityMode: "recorded-version",
    recordedProcedureId: capability.procedure.id,
    recordedVersion: "2.0.3",
    packageSchemaVersion: 2,
    supportPack: {
      manifest,
      packJsonBytes: encoder.encode(serializeSupportPackManifest(manifest)),
      inventoryItems: inventory,
    },
  });
}

describe("Research methodology contract (historical Phase-2 fixture + version dispatch)", () => {
  it("labels the 104/54/50 Phase-2 fixture as not exact frozen-v1.2 authority", () => {
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
    expect(resolveMethodologyContractBinding("2.0.2")).toEqual({
      version: FROZEN_METHODOLOGY_CONTRACT_VERSION,
      digest: FROZEN_METHODOLOGY_CONTRACT_DIGEST,
      disposition: "exact-v1.2",
      authoritative: true,
    });
    expect(resolveMethodologyContractBinding("2.0.3")).toEqual({
      version: V13_METHODOLOGY_CONTRACT_VERSION,
      digest: V13_METHODOLOGY_CONTRACT_DIGEST,
      disposition: "historical-unaccepted-2.0.3-not-authoritative",
      authoritative: false,
    });
    expect(resolveMethodologyContractBinding("2.0.2").authoritative).toBe(true);
    expect(resolveMethodologyContractBinding("2.0.4")).toEqual({
      version: "evaluation-contract-v1.3.0",
      digest:
        "sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f",
      disposition: "exact-v1.3-accepted",
      authoritative: true,
    });
    expect(resolveMethodologyContractBinding("2.0.5").disposition).toBe(
      "unknown-fail-closed",
    );
  });

  it("independently proves the historical 16/104 union and routing extension exclusion", () => {
    const source = independentFreeze();
    const packages = source.packages as JsonRecord[];
    const checkpoints = packages.flatMap(
      (family) => family.checkpoints as JsonRecord[],
    );
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as {
      compatibilityRoutingExtensions: {
        procedureId: string;
        includedInFrozenFamilyCount: boolean;
        includedInFrozenCheckpointCount: boolean;
      }[];
    };

    expect(packages).toHaveLength(16);
    expect(new Set(packages.map((family) => family.package))).toHaveLength(16);
    expect(checkpoints).toHaveLength(104);
    expect(
      new Set(
        packages.flatMap((family) =>
          (family.checkpoints as JsonRecord[]).map(
            (checkpoint) => `${String(family.package)}::${String(checkpoint.id)}`,
          ),
        ),
      ),
    ).toHaveLength(104);
    expect(
      checkpoints.filter((checkpoint) => checkpoint.kind === "ordered_stage"),
    ).toHaveLength(54);
    expect(
      checkpoints.filter(
        (checkpoint) => checkpoint.kind === "artifact_lifecycle_checkpoint",
      ),
    ).toHaveLength(50);
    expect(matrix.compatibilityRoutingExtensions).toEqual([
      expect.objectContaining({
        procedureId: "literature-scan-v1",
        includedInFrozenFamilyCount: false,
        includedInFrozenCheckpointCount: false,
      }),
    ]);

    const parsed = parseResearchMethodologyFreeze(frozenBytes);
    expect(parsed.packages).toHaveLength(FROZEN_METHODOLOGY_FAMILY_COUNT);
    expect(
      parsed.packages.reduce(
        (count, family) => count + family.checkpoints.length,
        0,
      ),
    ).toBe(FROZEN_METHODOLOGY_CHECKPOINT_COUNT);
    expect(
      verifyResearchMethodologyFreezeConformance({
        frozenBytes,
        candidateBytes: encodeJson(source),
      }),
    ).toEqual({
      familyCount: FROZEN_METHODOLOGY_FAMILY_COUNT,
      checkpointCount: FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
      orderedStageCount: FROZEN_ORDERED_STAGE_COUNT,
      artifactLifecycleCheckpointCount:
        FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
    });
  });

  it("strictly preserves the complete R0 derivability matrix and exact source bindings", () => {
    const parsed = parseMatrix();

    expect(parsed.matrixDigest).toBe(
      FROZEN_METHODOLOGY_DERIVABILITY_MATRIX_DIGEST,
    );
    expect(parsed.sourceFiles).toHaveLength(2);
    expect(parsed.families).toHaveLength(FROZEN_METHODOLOGY_FAMILY_COUNT);
    expect(parsed.rows).toHaveLength(FROZEN_METHODOLOGY_CHECKPOINT_COUNT);
    expect(
      new Set(parsed.rows.map((row) => row.matrixId)),
    ).toHaveLength(FROZEN_METHODOLOGY_CHECKPOINT_COUNT);
    expect(parsed.completeness.checkpointKinds).toEqual({
      artifact_lifecycle_checkpoint:
        FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
      ordered_stage: FROZEN_ORDERED_STAGE_COUNT,
    });
    expect(parsed.completeness.resolvedSourceLocationCount).toBe(314);
    expect(parsed.compatibilityRoutingExtensions).toEqual([
      expect.objectContaining({
        extensionId: "literature-scan-v1-compatibility-routing",
        includedInFrozenFamilyCount: false,
        includedInFrozenCheckpointCount: false,
        procedureId: "literature-scan-v1",
        capabilityId: "research.literature.scan",
        routeDisposition: "frozen-non-default",
      }),
    ]);
    expect(
      verifyResearchMethodologyDerivabilityMatrixConformance({
        frozenMatrixBytes: matrixBytes,
        candidateMatrixBytes: encodeJson(independentMatrix()),
        freezeBytes: frozenBytes,
        coverageMapBytes,
      }),
    ).toEqual({
      familyCount: FROZEN_METHODOLOGY_FAMILY_COUNT,
      checkpointCount: FROZEN_METHODOLOGY_CHECKPOINT_COUNT,
      orderedStageCount: FROZEN_ORDERED_STAGE_COUNT,
      artifactLifecycleCheckpointCount:
        FROZEN_ARTIFACT_LIFECYCLE_CHECKPOINT_COUNT,
      compatibilityRoutingExtensionCount: 1,
      resolvedSourceLocationCount: 314,
    });
  });

  it.each([
    {
      name: "missing matrix family",
      mutate: (matrix: JsonRecord) => {
        (matrix.families as JsonRecord[]).pop();
      },
    },
    {
      name: "extra matrix family",
      mutate: (matrix: JsonRecord) => {
        const families = matrix.families as JsonRecord[];
        families.push(structuredClone(families[0] as JsonRecord));
      },
    },
    {
      name: "reordered matrix family",
      mutate: (matrix: JsonRecord) => {
        const families = matrix.families as JsonRecord[];
        [families[0], families[1]] = [
          families[1] as JsonRecord,
          families[0] as JsonRecord,
        ];
      },
    },
    {
      name: "missing matrix checkpoint row",
      mutate: (matrix: JsonRecord) => {
        (matrix.rows as JsonRecord[]).pop();
      },
    },
    {
      name: "extra matrix checkpoint row",
      mutate: (matrix: JsonRecord) => {
        const rows = matrix.rows as JsonRecord[];
        rows.push(structuredClone(rows[0] as JsonRecord));
      },
    },
    {
      name: "reordered matrix checkpoint row",
      mutate: (matrix: JsonRecord) => {
        const rows = matrix.rows as JsonRecord[];
        [rows[0], rows[1]] = [rows[1] as JsonRecord, rows[0] as JsonRecord];
      },
    },
    {
      name: "duplicate matrix identity",
      mutate: (matrix: JsonRecord) => {
        const rows = matrix.rows as JsonRecord[];
        const first = rows[0];
        const second = rows[1];
        if (first === undefined || second === undefined) {
          throw new Error("Missing matrix rows");
        }
        second.matrixId = first.matrixId;
      },
    },
    {
      name: "changed matrix field",
      mutate: (matrix: JsonRecord) => {
        const row = (matrix.rows as JsonRecord[])[0];
        if (row === undefined) throw new Error("Missing matrix row");
        row.contractStatus = "unknown";
      },
    },
    {
      name: "changed source pointer",
      mutate: (matrix: JsonRecord) => {
        const row = (matrix.rows as JsonRecord[])[0];
        if (row === undefined) throw new Error("Missing matrix row");
        const location = (row.sourceLocations as JsonRecord[])[0];
        if (location === undefined) throw new Error("Missing source location");
        location.pointer = "/packages/1";
      },
    },
    {
      name: "changed checkpoint source hash",
      mutate: (matrix: JsonRecord) => {
        const row = (matrix.rows as JsonRecord[])[0];
        if (row === undefined) throw new Error("Missing matrix row");
        row.sourceCheckpointSha256 = "0".repeat(64);
      },
    },
    {
      name: "changed planned destination",
      mutate: (matrix: JsonRecord) => {
        const row = (matrix.rows as JsonRecord[])[0];
        if (row === undefined) throw new Error("Missing matrix row");
        const destinations = row.planned203Destinations as JsonRecord;
        const harness = destinations.harness as JsonRecord;
        harness.frozenIdentityKey = "research-review-case::wrong";
      },
    },
    {
      name: "changed planned runtime",
      mutate: (matrix: JsonRecord) => {
        const row = (matrix.rows as JsonRecord[])[0];
        if (row === undefined) throw new Error("Missing matrix row");
        const destinations = row.planned203Destinations as JsonRecord;
        const runtime = destinations.runtime as JsonRecord;
        runtime.path = "packages/core/src/research/methodology/wrong.ts";
      },
    },
    {
      name: "changed compatibility extension",
      mutate: (matrix: JsonRecord) => {
        const extension = (matrix.compatibilityRoutingExtensions as JsonRecord[])[0];
        if (extension === undefined) throw new Error("Missing compatibility extension");
        extension.routeDisposition = "default";
      },
    },
  ])("rejects $name drift", ({ mutate }) => {
    const candidate = independentMatrix();
    mutate(candidate);
    expect(() => parseMatrix(encodeJson(candidate))).toThrow();
  });

  it("rejects matrix source-byte drift, unknown keys, and duplicate decoded keys", () => {
    expect(() =>
      parseResearchMethodologyDerivabilityMatrix({
        matrixBytes,
        freezeBytes: Uint8Array.from([...frozenBytes, 0x20]),
        coverageMapBytes,
      }),
    ).toThrow(/exact frozen source bytes/);
    expect(() =>
      parseResearchMethodologyDerivabilityMatrix({
        matrixBytes,
        freezeBytes: frozenBytes,
        coverageMapBytes: Uint8Array.from([...coverageMapBytes, 0x20]),
      }),
    ).toThrow(/exact frozen source bytes/);

    const unknown = independentMatrix();
    unknown.extra = true;
    expect(() => parseMatrix(encodeJson(unknown))).toThrow(/unknown key 'extra'/);

    const duplicate = fs
      .readFileSync(matrixPath, "utf8")
      .replace(/^\{/, '{"schemaVersion":1,');
    expect(() => parseMatrix(encoder.encode(duplicate))).toThrow(
      /duplicate object key/,
    );
    expect(() =>
      parseMatrix(
        Uint8Array.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xc3, 0x28, 0x7d]),
      ),
    ).toThrow(/strict UTF-8 JSON/);
    expect(() => parseMatrix(encoder.encode("{"))).toThrow(/strict UTF-8 JSON/);
  });

  it.each([
    {
      name: "missing family",
      mutate: (freeze: JsonRecord) => {
        (freeze.packages as JsonRecord[]).pop();
      },
    },
    {
      name: "extra family",
      mutate: (freeze: JsonRecord) => {
        const packages = freeze.packages as JsonRecord[];
        packages.push(structuredClone(familyAt(freeze, 0)));
      },
    },
    {
      name: "duplicate family identity",
      mutate: (freeze: JsonRecord) => {
        const packages = freeze.packages as JsonRecord[];
        const first = packages[0];
        const second = packages[1];
        if (first === undefined || second === undefined) {
          throw new Error("Missing frozen families");
        }
        second.package = first.package;
      },
    },
    {
      name: "missing checkpoint",
      mutate: (freeze: JsonRecord) => {
        const family = familyAt(freeze, 0);
        (family.checkpoints as JsonRecord[]).pop();
        family.checkpointCount = Number(family.checkpointCount) - 1;
      },
    },
    {
      name: "extra checkpoint",
      mutate: (freeze: JsonRecord) => {
        const family = familyAt(freeze, 0);
        const extra = structuredClone(checkpointAt(family, 0));
        extra.id = "alc-99-extra.md";
        extra.artifact = "extra.md";
        (family.checkpoints as JsonRecord[]).push(extra);
        family.checkpointCount = Number(family.checkpointCount) + 1;
      },
    },
    {
      name: "changed field",
      mutate: (freeze: JsonRecord) => {
        const field = (checkpointAt(familyAt(freeze, 0), 0).fields as JsonRecord[])[0];
        if (field === undefined) throw new Error("Missing field");
        field.immutable = false;
      },
    },
    {
      name: "changed error",
      mutate: (freeze: JsonRecord) => {
        const checkpoint = checkpointAt(familyAt(freeze, 0), 0);
        (checkpoint.stable_error_codes as string[])[0] = "UNKNOWN_ERROR";
      },
    },
    {
      name: "changed transition",
      mutate: (freeze: JsonRecord) => {
        const checkpoint = checkpointAt(familyAt(freeze, 0), 0);
        (checkpoint.transition_conditions as JsonRecord).accept = "skip";
      },
    },
    {
      name: "changed reference",
      mutate: (freeze: JsonRecord) => {
        const family = (freeze.packages as JsonRecord[]).find(
          (candidate) => candidate.package === "research-ideation",
        );
        if (family === undefined) throw new Error("Missing ideation family");
        const handoff = (family.handoffs as JsonRecord[])[0];
        if (handoff === undefined) throw new Error("Missing handoff");
        handoff.to = "research-unknown";
      },
    },
  ])("rejects $name freeze drift", ({ mutate }) => {
    const candidate = independentFreeze();
    mutate(candidate);
    expect(() =>
      verifyResearchMethodologyFreezeConformance({
        frozenBytes,
        candidateBytes: encodeJson(candidate),
      }),
    ).toThrow();
  });

  it("rejects unknown keys, duplicate decoded keys, duplicate IDs, malformed UTF-8, and malformed JSON", () => {
    const source = independentFreeze();
    const family = familyAt(source, 0);
    family.extra = true;
    expect(() => parseResearchMethodologyFamilyContract(encodeJson(family))).toThrow(
      /unknown key 'extra'/,
    );

    const cleanFamily = familyAt(independentFreeze(), 0);
    const duplicateKey = JSON.stringify(cleanFamily).replace(
      /^\{/,
      '{"package":"research-review-case",',
    );
    expect(() =>
      parseResearchMethodologyFamilyContract(encoder.encode(duplicateKey)),
    ).toThrow(/duplicate object key/);

    const escapedDuplicateKey = JSON.stringify(cleanFamily).replace(
      /^\{/,
      '{"pack\\u0061ge":"research-review-case",',
    );
    expect(() =>
      parseResearchMethodologyFamilyContract(
        encoder.encode(escapedDuplicateKey),
      ),
    ).toThrow(/duplicate object key/);

    const duplicateIdFamily = familyAt(independentFreeze(), 0);
    const checkpoints = duplicateIdFamily.checkpoints as JsonRecord[];
    const second = checkpoints[1];
    if (second === undefined) throw new Error("Missing second checkpoint");
    second.id = checkpointAt(duplicateIdFamily, 0).id;
    expect(() =>
      parseResearchMethodologyFamilyContract(encodeJson(duplicateIdFamily)),
    ).toThrow(/duplicate id/);

    expect(() =>
      parseResearchMethodologyFamilyContract(
        Uint8Array.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xc3, 0x28, 0x7d]),
      ),
    ).toThrow(/strict UTF-8 JSON/);
    expect(() =>
      parseResearchMethodologyFamilyContract(encoder.encode("{")),
    ).toThrow(/strict UTF-8 JSON/);
  });

  it.each([
    {
      name: "invented phase framing",
      familyIndex: 2,
      mutate: (family: JsonRecord) => {
        checkpointAt(family, 0).phase2_note = "Invented replacement framing";
      },
    },
    {
      name: "safe but drifted source path",
      familyIndex: 2,
      mutate: (family: JsonRecord) => {
        checkpointAt(family, 0).source_ref = "public/other-stage.md";
      },
    },
    {
      name: "checkpoint ordering drift",
      familyIndex: 0,
      mutate: (family: JsonRecord) => {
        const checkpoints = family.checkpoints as JsonRecord[];
        [checkpoints[0], checkpoints[1]] = [
          checkpoints[1] as JsonRecord,
          checkpoints[0] as JsonRecord,
        ];
      },
    },
    {
      name: "stable error ordering drift",
      familyIndex: 0,
      mutate: (family: JsonRecord) => {
        const checkpoint = checkpointAt(family, 0);
        (checkpoint.stable_error_codes as string[]).reverse();
      },
    },
    {
      name: "valid but inconsistent handoff reference",
      familyIndex: 3,
      mutate: (family: JsonRecord) => {
        const handoff = (family.handoffs as JsonRecord[])[0];
        if (handoff === undefined) throw new Error("Missing handoff");
        handoff.to = "research-experiment";
      },
    },
    {
      name: "terminal declaration drift",
      familyIndex: 0,
      mutate: (family: JsonRecord) => {
        const terminals = family.terminal_states as JsonRecord;
        (terminals.asserted as string[])[0] = "rejected";
      },
    },
  ])("rejects $name under the frozen family identity", ({ familyIndex, mutate }) => {
    const family = familyAt(independentFreeze(), familyIndex);
    mutate(family);
    expect(() =>
      parseResearchMethodologyFamilyContract(encodeJson(family)),
    ).toThrow(/historical Phase-2 packaging family contract/);
  });

  it.each([
    {
      name: "missing required field",
      mutate: (family: JsonRecord) => {
        delete family.checkpoints;
      },
    },
    {
      name: "wrong scalar type",
      mutate: (family: JsonRecord) => {
        family.checkpointCount = "12";
      },
    },
    {
      name: "unknown checkpoint kind",
      mutate: (family: JsonRecord) => {
        checkpointAt(family, 0).kind = "unknown";
      },
    },
    {
      name: "unsafe source path",
      mutate: (family: JsonRecord) => {
        const ordered = (family.checkpoints as JsonRecord[]).find(
          (checkpoint) => checkpoint.kind === "ordered_stage",
        );
        if (ordered === undefined) throw new Error("Missing ordered stage");
        ordered.source_ref = "../private.md";
      },
    },
    {
      name: "inconsistent Procedure identity",
      mutate: (family: JsonRecord) => {
        (family.intended_target as JsonRecord).procedure = "wrong-v1";
      },
    },
    {
      name: "inconsistent terminal classification",
      mutate: (family: JsonRecord) => {
        const terminals = family.terminal_states as JsonRecord;
        const asserted = terminals.asserted as string[];
        (terminals.unasserted_not_claimed as string[]).push(asserted[0] ?? "blocked");
      },
    },
  ])("rejects $name", ({ mutate }) => {
    const family = familyAt(independentFreeze(), 3);
    mutate(family);
    expect(() =>
      parseResearchMethodologyFamilyContract(encodeJson(family)),
    ).toThrow();
  });

  it("rejects invalid frozen digest and family identity values", () => {
    const badDigest = independentFreeze();
    badDigest.methodologyDigest = "0".repeat(64);
    expect(() => parseResearchMethodologyFreeze(encodeJson(badDigest))).toThrow(
      /methodologyDigest/,
    );

    const badFamily = familyAt(independentFreeze(), 0);
    badFamily.package = "literature-scan-v1";
    expect(() =>
      parseResearchMethodologyFamilyContract(encodeJson(badFamily)),
    ).toThrow(/unknown value/);
  });

  it("contains Procedure 2.0.3 as historical-unaccepted (no methodology authority)", () => {
    const procedure = procedure203("root-only");
    expect(procedure.manifest.version).toBe("2.0.3");
    expect(() =>
      loadResearchMethodologyContractFromProcedure(procedure),
    ).toThrow(/historical-unaccepted|not available as methodology authority/);
    // Worker projection must not treat 2.0.3 family as accepted lossless authority.
    // Root-only freeze-family on 2.0.3 still projects via family path only when
    // version is LOSSLESS (2.0.4); for 2.0.3 it uses lifecycle/empty path.
    const projection = buildWorkerMethodologyProjectionV2(procedure);
    expect(projection.packageSchemaVersion).toBe(2);
  });

  it("rejects worker-visible freeze-family contracts under 2.0.3 projection", () => {
    const procedure = procedure203("worker-visible");
    expect(() => loadResearchMethodologyContractFromProcedure(procedure)).toThrow(
      /historical-unaccepted|not available as methodology authority/,
    );
    expect(() => buildWorkerMethodologyProjectionV2(procedure)).toThrow(
      /must be root-only/,
    );
  });
});

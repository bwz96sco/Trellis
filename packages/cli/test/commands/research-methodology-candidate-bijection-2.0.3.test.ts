import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_CAPABILITY_REGISTRY,
  RESEARCH_DEFAULT_CAPABILITY_BY_STAGE,
  RESEARCH_PROCEDURE_CURRENT_VERSION,
  V13_METHODOLOGY_CONTRACT_DIGEST,
  V13_METHODOLOGY_CONTRACT_VERSION,
  buildWorkerMethodologyProjectionV2,
  loadResearchMethodologyContractFromProcedure,
} from "@mindfoldhq/trellis-core/research";

import { RESEARCH_PROCEDURE_VERSIONS } from "../../scripts/packed-cli-audit.js";
import { getBundledResearchProcedureRoot } from "../../src/commands/research/bundled-procedure-root.js";
import { validateMethodologyBeforeRecord } from "../../src/commands/research/dispatch-methodology-validation.js";
import { resolveResearchProcedure } from "../../src/commands/research/procedure-resolution.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const candidatePath = path.join(
  repoRoot,
  ".trellis/tasks/07-29-activate-migrated-research-methodology/research/candidate-cutover-manifest-2.0.3.json",
);
const candidateShaPath = path.join(
  repoRoot,
  ".trellis/tasks/07-29-activate-migrated-research-methodology/research/candidate-cutover-manifest-2.0.3.sha256",
);

describe("dormant 2.0.3 candidate bijection", () => {
  it("proves 2.0.3 binds attempt-2 v1.3 while CURRENT stays 1.0.0", async () => {
    expect(RESEARCH_PROCEDURE_CURRENT_VERSION).toBe("1.0.0");
    expect(RESEARCH_CAPABILITY_REGISTRY).toHaveLength(14);
    expect(RESEARCH_DEFAULT_CAPABILITY_BY_STAGE.literature).toBe(
      "research.literature.scan",
    );
    expect(RESEARCH_PROCEDURE_VERSIONS).toEqual([
      "1.0.0",
      "2.0.0",
      "2.0.1",
      "2.0.2",
      "2.0.3",
      "2.0.4",
      "2.0.5",
      "2.0.6",
      "2.0.7",
    ]);

    // Historical 1.0.0–2.0.2 trees remain present.
    for (const version of ["1.0.0", "2.0.0", "2.0.1", "2.0.2"] as const) {
      const sample = path.join(
        getBundledResearchProcedureRoot(),
        "literature-scan-v1",
        version,
        "procedure.json",
      );
      expect(fs.existsSync(sample)).toBe(true);
    }

    const raw = fs.readFileSync(candidatePath);
    const digest = createHash("sha256").update(raw).digest("hex");
    expect(fs.readFileSync(candidateShaPath, "utf8").trim()).toBe(digest);

    const manifest = JSON.parse(raw.toString("utf8")) as {
      status: string;
      liveRegistryCurrentVersion: string;
      candidateProcedureVersion: string;
      activationAuthorized: boolean;
      methodologyContract: string;
      methodologyDigest: string;
      bindings: {
        capabilityId: string;
        procedureId: string;
        procedureVersion: string;
        procedureJsonSha256: string;
        packedPath: string;
        candidateState: string;
        methodologyContractVersion: string;
        methodologyContractDigest: string;
      }[];
    };
    expect(manifest.status).toBe("dormant-candidate");
    expect(manifest.liveRegistryCurrentVersion).toBe("1.0.0");
    expect(manifest.candidateProcedureVersion).toBe("2.0.3");
    expect(manifest.activationAuthorized).toBe(false);
    expect(manifest.methodologyContract).toBe(V13_METHODOLOGY_CONTRACT_VERSION);
    expect(`sha256:${manifest.methodologyDigest}`).toBe(
      V13_METHODOLOGY_CONTRACT_DIGEST,
    );
    expect(manifest.bindings).toHaveLength(17);

    const ids = manifest.bindings.map((b) => b.capabilityId);
    expect(ids).toEqual([...ids].sort());

    const bundledRoot = getBundledResearchProcedureRoot();
    for (const binding of manifest.bindings) {
      expect(binding.procedureVersion).toBe("2.0.3");
      expect(binding.candidateState).toBe("dormant");
      expect(binding.methodologyContractVersion).toBe(
        V13_METHODOLOGY_CONTRACT_VERSION,
      );
      expect(binding.methodologyContractDigest).toBe(
        V13_METHODOLOGY_CONTRACT_DIGEST,
      );
      const procPath = path.join(
        bundledRoot,
        binding.procedureId,
        "2.0.3",
        "procedure.json",
      );
      expect(fs.existsSync(procPath)).toBe(true);
      const sha = createHash("sha256")
        .update(fs.readFileSync(procPath))
        .digest("hex");
      expect(sha).toBe(binding.procedureJsonSha256);
      const packPath = path.join(
        bundledRoot,
        binding.procedureId,
        "2.0.3",
        "methodology",
        "pack.json",
      );
      const pack = JSON.parse(fs.readFileSync(packPath, "utf8")) as {
        methodologyContractVersion: string;
        methodologyContractDigest: string;
        procedureVersion: string;
      };
      expect(pack.procedureVersion).toBe("2.0.3");
      expect(pack.methodologyContractVersion).toBe(
        V13_METHODOLOGY_CONTRACT_VERSION,
      );
      expect(pack.methodologyContractDigest).toBe(
        V13_METHODOLOGY_CONTRACT_DIGEST,
      );
    }

    const live = RESEARCH_CAPABILITY_REGISTRY[0];
    if (live === undefined) {
      throw new Error("Missing first research capability");
    }
    const current = await resolveResearchProcedure({
      root: repoRoot,
      capabilityId: live.id,
      mode: "registry-current",
    });
    expect(current.manifest.version).toBe("1.0.0");

    const dormant = await resolveResearchProcedure({
      root: repoRoot,
      capabilityId: live.id,
      mode: "activation-recorded",
      procedureId: live.procedure.id,
      procedureVersion: "2.0.3",
    });
    expect(dormant.manifest.version).toBe("2.0.3");
    expect(dormant.digest).not.toBe(current.digest);
    expect(dormant.supportPack?.manifest.methodologyContractVersion).toBe(
      V13_METHODOLOGY_CONTRACT_VERSION,
    );

    // Containment: 2.0.3 resolves as dormant bytes but has no methodology authority.
    expect(() =>
      loadResearchMethodologyContractFromProcedure(dormant),
    ).toThrow(/historical-unaccepted|not available as methodology authority/);
    const gate = validateMethodologyBeforeRecord({
      procedureId: dormant.manifest.id,
      procedureVersion: dormant.manifest.version,
      procedureDigest: dormant.digest,
      procedure: dormant,
      selected: true,
      blocked: false,
      batchCommitted: false,
      artifactPaths: [],
    });
    expect(gate.criticalFailure).toBe(true);
    expect(gate.ok).toBe(false);
    expect(
      gate.report.validation.findings.some(
        (f) => f.code === "METHODOLOGY_AUTHORITY_NOT_ACCEPTED",
      ),
    ).toBe(true);
    expect(gate.materializeSidecar).toBe(false);
  });

  it("loads every freeze-family 2.0.3 pack via loadResearchMethodologyContractFromProcedure", async () => {
    const {
      parseSupportPackManifest,
      buildSupportPackInventory,
      parseResearchProcedure,
      parseResearchMethodologyFamilyContract,
    } = await import("@mindfoldhq/trellis-core/research");

    const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8")) as {
      bindings: {
        capabilityId: string;
        procedureId: string;
        procedureVersion: string;
      }[];
    };

    let familyPacks = 0;
    for (const binding of candidate.bindings) {
      const packDir = path.join(
        getBundledResearchProcedureRoot(),
        binding.procedureId,
        "2.0.3",
      );
      const packJson = fs.readFileSync(
        path.join(packDir, "methodology", "pack.json"),
      );
      const artBytes = new Uint8Array(
        fs.readFileSync(
          path.join(
            packDir,
            "methodology",
            "artifacts",
            "artifact-contract.json",
          ),
        ),
      );
      const pack = JSON.parse(packJson.toString("utf8")) as {
        entries: {
          path: string;
          workerVisibility: string;
          contractVersion: string;
        }[];
      };
      const artEntry = pack.entries.find(
        (e) => e.path === "artifacts/artifact-contract.json",
      );
      if (artEntry === undefined) {
        throw new Error("Missing artifact-contract.json pack entry");
      }

      if (binding.procedureId === "literature-scan-v1") {
        expect(artEntry.workerVisibility).toBe("worker-visible");
        expect(artEntry.contractVersion).toBe(V13_METHODOLOGY_CONTRACT_VERSION);
        continue;
      }

      expect(artEntry.workerVisibility).toBe("root-only");
      expect(artEntry.contractVersion).toBe(V13_METHODOLOGY_CONTRACT_VERSION);

      // Family contract bytes must parse as freeze-family identity.
      const familyFromBytes = parseResearchMethodologyFamilyContract(artBytes);
      expect(familyFromBytes.intended_target.procedure).toBe(
        binding.procedureId,
      );
      expect(familyFromBytes.intended_target.capability).toBe(
        binding.capabilityId,
      );
      familyPacks += 1;

      // When capability is in the live registry, exercise full procedure load.
      const capability = RESEARCH_CAPABILITY_REGISTRY.find(
        (c) => c.id === binding.capabilityId,
      );
      if (capability === undefined) {
        continue;
      }

      const files: Record<string, Uint8Array> = {
        "artifacts/artifact-contract.json": artBytes,
      };
      for (const e of pack.entries) {
        if (e.path === "artifacts/artifact-contract.json") continue;
        files[e.path] = new Uint8Array(
          fs.readFileSync(path.join(packDir, "methodology", e.path)),
        );
      }
      const manifest = parseSupportPackManifest({
        packJsonBytes: new Uint8Array(packJson),
        procedureId: binding.procedureId,
        procedureVersion: "2.0.3",
      });
      const inventory = buildSupportPackInventory({ manifest, files });
      const procedure = parseResearchProcedure({
        capabilityId: binding.capabilityId,
        source: "bundled",
        manifestBytes: new Uint8Array(
          fs.readFileSync(path.join(packDir, "procedure.json")),
        ),
        instructionBytes: new TextEncoder().encode("# Procedure\n"),
        packageSchemaVersion: 2,
        identityMode: "recorded-version",
        recordedProcedureId: binding.procedureId,
        recordedVersion: "2.0.3",
        supportPack: {
          manifest,
          packJsonBytes: new Uint8Array(packJson),
          inventoryItems: inventory,
        },
      });
      // Family bytes remain parseable as historical evidence, but authority load fails.
      expect(() =>
        loadResearchMethodologyContractFromProcedure(procedure),
      ).toThrow(/historical-unaccepted|not available as methodology authority/);
      const gate = validateMethodologyBeforeRecord({
        procedureId: procedure.manifest.id,
        procedureVersion: procedure.manifest.version,
        procedureDigest: procedure.digest,
        procedure,
        selected: true,
        blocked: false,
        batchCommitted: false,
        artifactPaths: [],
      });
      expect(gate.ok).toBe(false);
      expect(gate.criticalFailure).toBe(true);
    }
    expect(familyPacks).toBe(16);
  });

  it("projects literature-scan-v1@2.0.3 worker Context like 2.0.2 without family loader", async () => {
    const {
      parseSupportPackManifest,
      buildSupportPackInventory,
      parseResearchProcedure,
    } = await import("@mindfoldhq/trellis-core/research");

    function loadScan(version: "2.0.2" | "2.0.3") {
      const packDir = path.join(
        getBundledResearchProcedureRoot(),
        "literature-scan-v1",
        version,
      );
      const packJson = new Uint8Array(
        fs.readFileSync(path.join(packDir, "methodology", "pack.json")),
      );
      const pack = JSON.parse(Buffer.from(packJson).toString("utf8")) as {
        entries: { path: string; workerVisibility: string }[];
      };
      const files: Record<string, Uint8Array> = {};
      for (const e of pack.entries) {
        files[e.path] = new Uint8Array(
          fs.readFileSync(path.join(packDir, "methodology", e.path)),
        );
      }
      const manifest = parseSupportPackManifest({
        packJsonBytes: packJson,
        procedureId: "literature-scan-v1",
        procedureVersion: version,
      });
      const inventory = buildSupportPackInventory({ manifest, files });
      return parseResearchProcedure({
        capabilityId: "research.literature.scan",
        source: "bundled",
        manifestBytes: new Uint8Array(
          fs.readFileSync(path.join(packDir, "procedure.json")),
        ),
        instructionBytes: new TextEncoder().encode("# Procedure\n"),
        packageSchemaVersion: 2,
        identityMode: "recorded-version",
        recordedProcedureId: "literature-scan-v1",
        recordedVersion: version,
        supportPack: {
          manifest,
          packJsonBytes: packJson,
          inventoryItems: inventory,
        },
      });
    }

    const v202 = loadScan("2.0.2");
    const v203 = loadScan("2.0.3");

    const proj202 = buildWorkerMethodologyProjectionV2(v202);
    const proj203 = buildWorkerMethodologyProjectionV2(v203);

    expect(proj202.workerVisibleEntries.length).toBe(2);
    expect(proj203.workerVisibleEntries.length).toBe(2);
    expect(
      proj203.workerVisibleEntries.every((e) =>
        ["artifacts/artifact-contract.json", "instructions/checkpoints.md"].includes(
          e.path,
        ),
      ),
    ).toBe(true);
    // Lifecycle contracts[] requirements present (not empty family throw).
    expect(proj202.artifactRequirements.length).toBe(3);
    expect(proj203.artifactRequirements.length).toBe(3);
    expect(proj203.packageSchemaVersion).toBe(2);
    // Must not require root-only family contract for scan.
    expect(() => loadResearchMethodologyContractFromProcedure(v203)).toThrow(
      /historical-unaccepted|not available as methodology authority|root-only/,
    );
  });
});

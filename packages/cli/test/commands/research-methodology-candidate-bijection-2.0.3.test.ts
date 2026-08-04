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
} from "@mindfoldhq/trellis-core/research";

import { RESEARCH_PROCEDURE_VERSIONS } from "../../scripts/packed-cli-audit.js";
import { getBundledResearchProcedureRoot } from "../../src/commands/research/bundled-procedure-root.js";
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
      bindings: Array<{
        capabilityId: string;
        procedureId: string;
        procedureVersion: string;
        procedureJsonSha256: string;
        packedPath: string;
        candidateState: string;
        methodologyContractVersion: string;
        methodologyContractDigest: string;
      }>;
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

    const live = RESEARCH_CAPABILITY_REGISTRY[0]!;
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
  });
});

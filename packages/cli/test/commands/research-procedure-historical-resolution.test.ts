import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_CAPABILITY_REGISTRY,
  RESEARCH_PROCEDURE_CURRENT_VERSION,
} from "@mindfoldhq/trellis-core/research";

import { getBundledResearchProcedureRoot } from "../../src/commands/research/bundled-procedure-root.js";
import { resolveResearchProcedure } from "../../src/commands/research/procedure-resolution.js";

const capability = RESEARCH_CAPABILITY_REGISTRY.find(
  (c) => c.id === "research.ideation.generate",
)!;

describe("historical Procedure resolution", () => {
  it("registry-current selects v1 while recorded 1.0.0/2.0.0/2.0.1 still resolve", async () => {
    // Completion Wave-0 containment: future selection is 1.0.0; dormant 2.0.x remain replayable.
    expect(RESEARCH_PROCEDURE_CURRENT_VERSION).toBe("1.0.0");
    expect(capability.procedure.version).toBe("1.0.0");

    const current = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "registry-current",
    });
    expect(current.manifest.version).toBe("1.0.0");
    expect(current.digestDomain ?? "v1").toBe("v1");

    const digests = new Set<string>([current.digest]);

    for (const version of ["1.0.0", "2.0.0", "2.0.1"] as const) {
      const recorded = await resolveResearchProcedure({
        root: os.tmpdir(),
        capabilityId: capability.id,
        mode: "activation-recorded",
        procedureId: capability.procedure.id,
        procedureVersion: version,
      });
      expect(recorded.manifest.id).toBe(capability.procedure.id);
      expect(recorded.manifest.version).toBe(version);
      if (version === "1.0.0") {
        expect(recorded.digestDomain ?? "v1").toBe("v1");
        expect(recorded.digest).toBe(current.digest);
      } else {
        expect(recorded.digestDomain).toBe("v2");
        expect(recorded.digest).not.toBe(current.digest);
      }
      digests.add(recorded.digest);

      const onDisk = path.join(
        getBundledResearchProcedureRoot(),
        capability.procedure.id,
        version,
        "procedure.json",
      );
      expect(fs.existsSync(onDisk)).toBe(true);
    }

    // Distinct bytes per package generation (1.0.0 equals registry-current).
    expect(digests.size).toBe(3);
  });

  it("activation-recorded uses exact recorded Procedure id even when registry id matches", async () => {
    // Recorded identity is authoritative; capability ceilings still apply via capabilityId.
    const recorded = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "activation-recorded",
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.1",
    });
    expect(recorded.manifest.id).toBe(capability.procedure.id);
    expect(recorded.manifest.version).toBe("2.0.1");
    // Registry-current remains 1.0.0 and must not rewrite the recorded package.
    expect(capability.procedure.version).toBe("1.0.0");
    expect(RESEARCH_PROCEDURE_CURRENT_VERSION).toBe("1.0.0");
  });

  it("activation-recorded resolves dormant 2.0.2 while registry-current stays 1.0.0", async () => {
    expect(RESEARCH_PROCEDURE_CURRENT_VERSION).toBe("1.0.0");
    const dormant = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "activation-recorded",
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.2",
    });
    expect(dormant.manifest.version).toBe("2.0.2");
    expect(dormant.packageSchemaVersion).toBe(2);
    expect(dormant.digestDomain).toBe("v2");
    expect(dormant.supportPack?.manifest.methodologyContractVersion).toBe(
      "evaluation-contract-v1.2.0",
    );
    const current = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "registry-current",
    });
    expect(current.manifest.version).toBe("1.0.0");
    expect(current.digest).not.toBe(dormant.digest);
  });

  it("activation-recorded Procedure ID may differ from capability.current Procedure ID", async () => {
    // literature.review currently binds literature-review-v1; a historical
    // activation may have recorded survey-v1 (same stage+kind ceilings).
    const reviewCap = RESEARCH_CAPABILITY_REGISTRY.find(
      (c) => c.id === "research.literature.review",
    )!;
    expect(reviewCap.procedure.id).toBe("literature-review-v1");
    expect(reviewCap.procedure.id).not.toBe("survey-v1");

    const recorded = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: reviewCap.id,
      mode: "activation-recorded",
      procedureId: "survey-v1",
      procedureVersion: "2.0.2",
    });
    expect(recorded.manifest.id).toBe("survey-v1");
    expect(recorded.manifest.version).toBe("2.0.2");
    expect(recorded.manifest.stage).toBe(reviewCap.stage);
    expect(recorded.manifest.kind).toBe(reviewCap.kind);
    expect(recorded.digestDomain).toBe("v2");

    const currentBinding = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: reviewCap.id,
      mode: "registry-current",
    });
    expect(currentBinding.manifest.id).toBe("literature-review-v1");
    expect(currentBinding.manifest.id).not.toBe(recorded.manifest.id);
    expect(currentBinding.digest).not.toBe(recorded.digest);
  });
});

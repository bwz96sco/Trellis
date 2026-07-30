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
  it("registry-current selects v1 while activation-recorded resolves exact v2 bytes", async () => {
    // Wave-0 containment: future selection is 1.0.0; dormant 2.0.0 remains replayable.
    expect(RESEARCH_PROCEDURE_CURRENT_VERSION).toBe("1.0.0");
    expect(capability.procedure.version).toBe("1.0.0");

    const current = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "registry-current",
    });
    expect(current.manifest.version).toBe("1.0.0");
    expect(current.digestDomain ?? "v1").toBe("v1");

    const recordedV2 = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "activation-recorded",
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.0",
    });
    expect(recordedV2.manifest.id).toBe(capability.procedure.id);
    expect(recordedV2.manifest.version).toBe("2.0.0");
    expect(recordedV2.digestDomain).toBe("v2");
    expect(recordedV2.digest).not.toBe(current.digest);

    const historicalV1 = path.join(
      getBundledResearchProcedureRoot(),
      capability.procedure.id,
      "1.0.0",
      "procedure.json",
    );
    const dormantV2 = path.join(
      getBundledResearchProcedureRoot(),
      capability.procedure.id,
      "2.0.0",
      "procedure.json",
    );
    expect(fs.existsSync(historicalV1)).toBe(true);
    expect(fs.existsSync(dormantV2)).toBe(true);
  });

  it("activation-recorded still resolves recorded 1.0.0 after a future cutover path exists", async () => {
    const recorded = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "activation-recorded",
      procedureId: capability.procedure.id,
      procedureVersion: "1.0.0",
    });
    expect(recorded.manifest.version).toBe("1.0.0");
    expect(recorded.digestDomain ?? "v1").toBe("v1");
  });
});

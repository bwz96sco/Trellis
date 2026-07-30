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
  it("registry-current selects 2.0.1 while recorded 1.0.0 and 2.0.0 still resolve", async () => {
    expect(RESEARCH_PROCEDURE_CURRENT_VERSION).toBe("2.0.1");
    expect(capability.procedure.version).toBe("2.0.1");

    const current = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "registry-current",
    });
    expect(current.manifest.version).toBe("2.0.1");
    expect(current.digestDomain).toBe("v2");
    expect(current.packageSchemaVersion).toBe(2);

    const v1 = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "activation-recorded",
      procedureId: capability.procedure.id,
      procedureVersion: "1.0.0",
    });
    expect(v1.manifest.version).toBe("1.0.0");
    expect(v1.digestDomain ?? "v1").toBe("v1");
    expect(v1.digest).not.toBe(current.digest);

    const v2 = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "activation-recorded",
      procedureId: capability.procedure.id,
      procedureVersion: "2.0.0",
    });
    expect(v2.manifest.version).toBe("2.0.0");
    expect(v2.digestDomain).toBe("v2");
    expect(v2.digest).not.toBe(current.digest);
    expect(v2.digest).not.toBe(v1.digest);

    for (const version of ["1.0.0", "2.0.0", "2.0.1"]) {
      const p = path.join(
        getBundledResearchProcedureRoot(),
        capability.procedure.id,
        version,
        "procedure.json",
      );
      expect(fs.existsSync(p)).toBe(true);
    }
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { RESEARCH_CAPABILITY_REGISTRY } from "@mindfoldhq/trellis-core/research";

import { getBundledResearchProcedureRoot } from "../../src/commands/research/bundled-procedure-root.js";
import { resolveResearchProcedure } from "../../src/commands/research/procedure-resolution.js";

const capability = RESEARCH_CAPABILITY_REGISTRY.find(
  (c) => c.id === "research.ideation.generate",
)!;

describe("historical Procedure resolution", () => {
  it("activation-recorded resolves recorded 1.0.0 while registry current is 2.0.0", async () => {
    const current = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "registry-current",
    });
    expect(current.manifest.version).toBe("2.0.0");
    expect(capability.procedure.version).toBe("2.0.0");
    expect(current.digestDomain).toBe("v2");

    const recorded = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "activation-recorded",
      procedureId: capability.procedure.id,
      procedureVersion: "1.0.0",
    });
    expect(recorded.manifest.id).toBe(capability.procedure.id);
    expect(recorded.manifest.version).toBe("1.0.0");
    expect(recorded.digestDomain ?? "v1").toBe("v1");
    expect(recorded.digest).not.toBe(current.digest);

    const historical = path.join(
      getBundledResearchProcedureRoot(),
      capability.procedure.id,
      "1.0.0",
      "procedure.json",
    );
    const live = path.join(
      getBundledResearchProcedureRoot(),
      capability.procedure.id,
      "2.0.0",
      "procedure.json",
    );
    expect(fs.existsSync(historical)).toBe(true);
    expect(fs.existsSync(live)).toBe(true);
  });
});

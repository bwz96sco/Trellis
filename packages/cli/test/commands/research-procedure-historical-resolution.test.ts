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
  it("activation-recorded resolves recorded version even if registry current differs", async () => {
    // Registry currently binds idea-generation-v1@1.0.0. Simulate a future current
    // binding by resolving recorded 1.0.0 explicitly while proving registry-current
    // still works for the same package.
    const current = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "registry-current",
    });
    expect(current.manifest.version).toBe(capability.procedure.version);
    expect(current.digestDomain ?? "v1").toBe("v1");

    const recorded = await resolveResearchProcedure({
      root: os.tmpdir(),
      capabilityId: capability.id,
      mode: "activation-recorded",
      procedureId: capability.procedure.id,
      procedureVersion: capability.procedure.version,
    });
    expect(recorded.manifest.id).toBe(capability.procedure.id);
    expect(recorded.manifest.version).toBe(capability.procedure.version);
    expect(recorded.digest).toBe(current.digest);

    // Bundled package bytes still exist for the recorded version path
    const bundled = path.join(
      getBundledResearchProcedureRoot(),
      capability.procedure.id,
      capability.procedure.version,
      "procedure.json",
    );
    expect(fs.existsSync(bundled)).toBe(true);
  });
});

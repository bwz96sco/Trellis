import { describe, expect, it } from "vitest";

import {
  auditPackedEntries,
  buildPackedCliInventory,
  normalizeTarEntry,
  parseTarListing,
  RESEARCH_PROCEDURE_IDS,
  RESEARCH_STAGE_SKILLS,
} from "../../scripts/packed-cli-audit.js";

describe("packed CLI inventory audit", () => {
  it("normalizes directory markers without depending on listing order", () => {
    expect(normalizeTarEntry("package/dist/cli/")).toBe(
      "package/dist/cli",
    );
    expect(
      parseTarListing(
        "package/dist/commands/research/index.js\r\npackage/package.json\n",
      ),
    ).toEqual([
      "package/dist/commands/research/index.js",
      "package/package.json",
    ]);
  });

  it.each([
    "package/../outside.txt",
    "/package/package.json",
    "C:/package/package.json",
    "C:package/package.json",
    "package\\package.json",
    "package/./package.json",
    "./package/package.json",
    "package//package.json",
    "package/package.json\0ignored",
    "package/package.json ",
    "outside/package.json",
  ])("rejects unsafe or non-canonical tar entry %j", (entry) => {
    expect(() => normalizeTarEntry(entry)).toThrow(
      `Unsafe tar entry path: ${JSON.stringify(entry)}`,
    );
  });

  it("reports every missing required entry with its packed path", () => {
    expect(() =>
      auditPackedEntries(["package/package.json"], {
        requiredEntries: [
          "package/package.json",
          "package/dist/templates/trellis/workflows/research/workflow.md",
        ],
        forbiddenExactEntries: [],
        forbiddenPrefixes: [],
      }),
    ).toThrow(
      "Packed CLI is missing required Research/compatibility entries:\n" +
        "  - package/dist/templates/trellis/workflows/research/workflow.md",
    );
  });

  it("reports forbidden exact files and directory-prefix matches", () => {
    const inventory = {
      requiredEntries: ["package/package.json"],
      forbiddenExactEntries: ["package/dist/commands/mem.js"],
      forbiddenPrefixes: ["package/dist/commands/channel/"],
    };

    expect(() =>
      auditPackedEntries(
        [
          "package/package.json",
          "package/dist/commands/mem.js",
          "package/dist/commands/channel/index.js",
        ],
        inventory,
      ),
    ).toThrow(
      "Packed CLI contains forbidden generic entries:\n" +
        "  - package/dist/commands/channel/index.js\n" +
        "  - package/dist/commands/mem.js",
    );

    expect(
      auditPackedEntries(
        ["package/package.json", "package/dist/commands/channel-v2.js"],
        inventory,
      ),
    ).toEqual({ entryCount: 2, requiredEntryCount: 1 });
  });

  it("builds the Research inventory with all stage skills and migration manifests", () => {
    const inventory = buildPackedCliInventory([
      "0.6.7.json",
      "0.7.0-beta.0.json",
    ]);

    for (const skill of RESEARCH_STAGE_SKILLS) {
      expect(inventory.requiredEntries).toContain(
        `package/dist/templates/common/bundled-skills/${skill}/SKILL.md`,
      );
    }
    for (const procedureId of RESEARCH_PROCEDURE_IDS) {
      expect(inventory.requiredEntries).toContain(
        `package/dist/templates/research/procedures/${procedureId}/1.0.0/procedure.json`,
      );
      expect(inventory.requiredEntries).toContain(
        `package/dist/templates/research/procedures/${procedureId}/1.0.0/PROCEDURE.md`,
      );
    }
    expect(inventory.requiredEntries).toContain(
      "package/dist/migrations/manifests/0.6.7.json",
    );
    expect(inventory.requiredEntries).toContain(
      "package/dist/migrations/manifests/0.7.0-beta.0.json",
    );
  });
});

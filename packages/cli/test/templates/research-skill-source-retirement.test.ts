import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_STAGE_SKILL_NAMES,
  RESEARCH_SKILL_RETIREMENT,
} from "../../src/legacy/research-skill-retirement.js";
import {
  RESEARCH_STAGE_SKILLS,
  buildPackedCliInventory,
} from "../../scripts/packed-cli-audit.js";

const SRC_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src",
);

describe("C09 Research stage Skill source retirement", () => {
  it("removes all nine stage Skill source roots", () => {
    for (const name of RESEARCH_STAGE_SKILL_NAMES) {
      const skillRoot = path.join(
        SRC_ROOT,
        "templates/common/bundled-skills",
        name,
      );
      expect(fs.existsSync(skillRoot), skillRoot).toBe(false);
    }
  });

  it("keeps package-internal retirement evidence without generation authority", () => {
    expect(RESEARCH_SKILL_RETIREMENT.authority).toBe("none");
    expect(
      fs.existsSync(
        path.join(SRC_ROOT, "legacy/research-skill-retirement.json"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(SRC_ROOT, "legacy/research-skill-retirement.ts")),
    ).toBe(true);
  });

  it("forbids stage Skill payload paths in packed inventory", () => {
    const inventory = buildPackedCliInventory(["0.7.0-beta.1.json"]);
    for (const skill of RESEARCH_STAGE_SKILLS) {
      const skillEntry = `package/dist/templates/common/bundled-skills/${skill}/SKILL.md`;
      expect(inventory.requiredEntries).not.toContain(skillEntry);
      expect(inventory.forbiddenExactEntries).toContain(skillEntry);
    }
  });
});

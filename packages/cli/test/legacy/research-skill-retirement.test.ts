import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_SKILL_RETIREMENT,
  RESEARCH_SKILL_RETIREMENT_TARGET_PATHS,
  assertResearchSkillRetirementAgreesWithMigrations,
  getResearchSkillRetirementHashMap,
  hasResearchSkillRetirementAuthority,
  loadResearchSkillRetirementSnapshot,
} from "../../src/legacy/research-skill-retirement.js";
import { getAllMigrations } from "../../src/migrations/index.js";
import type { MigrationManifest } from "../../src/types/migration.js";

const loadJson = createRequire(import.meta.url);
const beta1 = loadJson(
  "../../src/migrations/manifests/0.7.0-beta.1.json",
) as MigrationManifest;

describe("research skill retirement evidence", () => {
  it("loads authority=none with empty entries and no deletion paths", () => {
    expect(RESEARCH_SKILL_RETIREMENT.schemaVersion).toBe(1);
    expect(RESEARCH_SKILL_RETIREMENT.normalization).toBe("utf8-lf");
    expect(RESEARCH_SKILL_RETIREMENT.authority).toBe("none");
    expect(RESEARCH_SKILL_RETIREMENT.entries).toEqual([]);
    expect(getResearchSkillRetirementHashMap().size).toBe(0);
    expect(RESEARCH_SKILL_RETIREMENT_TARGET_PATHS).toHaveLength(18);
    expect(
      hasResearchSkillRetirementAuthority(
        ".claude/skills/trellis-research-setup/SKILL.md",
      ),
    ).toBe(false);
  });

  it("rejects authority=none with non-empty entries", () => {
    expect(() =>
      loadResearchSkillRetirementSnapshot({
        schemaVersion: 1,
        normalization: "utf8-lf",
        authority: "none",
        entries: [
          {
            host: "claude",
            root: ".claude/skills",
            path: ".claude/skills/trellis-research-setup/SKILL.md",
            sourceTarEntry: "package/x",
            renderingProfile: "test",
            sha256: [
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            ],
            artifacts: [
              {
                packageName: "@mindfoldhq/trellis",
                version: "0.0.0",
                tarballUrl:
                  "https://registry.npmjs.org/@mindfoldhq/trellis/-/trellis-0.0.0.tgz",
                shasumSha1: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                integritySha512: "sha512-aaaa",
              },
            ],
          },
        ],
      }),
    ).toThrow(/empty entries/);
  });

  it("rejects .trellis/research paths and unsafe paths", () => {
    expect(() =>
      loadResearchSkillRetirementSnapshot({
        schemaVersion: 1,
        normalization: "utf8-lf",
        authority: "complete",
        entries: RESEARCH_SKILL_RETIREMENT_TARGET_PATHS.map((entryPath) => ({
          host: entryPath.startsWith(".claude/") ? "claude" : "codex",
          root: entryPath.startsWith(".claude/")
            ? ".claude/skills"
            : ".agents/skills",
          path:
            entryPath === ".claude/skills/trellis-research-setup/SKILL.md"
              ? ".trellis/research/events.jsonl"
              : entryPath,
          sourceTarEntry: "package/x",
          renderingProfile: "test",
          sha256: [
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          ],
          artifacts: [
            {
              packageName: "@mindfoldhq/trellis",
              version: "0.0.0",
              tarballUrl:
                "https://registry.npmjs.org/@mindfoldhq/trellis/-/trellis-0.0.0.tgz",
              shasumSha1: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              integritySha512: "sha512-aaaa",
            },
          ],
        })),
      }),
    ).toThrow(/Research state path forbidden|must cover exactly/);
  });

  it("agrees with empty forward migration when authority is none", () => {
    expect(beta1.version).toBe("0.7.0-beta.1");
    expect(beta1.migrations).toEqual([]);
    expect(() =>
      assertResearchSkillRetirementAgreesWithMigrations(beta1.migrations),
    ).not.toThrow();
    expect(() =>
      assertResearchSkillRetirementAgreesWithMigrations(getAllMigrations()),
    ).not.toThrow();
  });

  it("fails closed when migrations invent Research Skill deletes without evidence", () => {
    expect(() =>
      assertResearchSkillRetirementAgreesWithMigrations([
        {
          type: "safe-file-delete",
          from: ".claude/skills/trellis-research-setup/SKILL.md",
          allowed_hashes: [
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          ],
        },
      ]),
    ).toThrow(/forbids Research stage Skill/);
  });
});

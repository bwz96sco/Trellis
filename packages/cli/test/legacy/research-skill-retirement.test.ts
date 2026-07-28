import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import {
  RESEARCH_SKILL_RETIREMENT,
  RESEARCH_SKILL_RETIREMENT_TARGET_PATHS,
  assertResearchSkillRetirementAgreesWithMigrations,
  getAuthorizedResearchSkillDeletes,
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

const HASH_A =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function sampleArtifact(version = "0.6.9") {
  return {
    packageName: "@mindfoldhq/trellis" as const,
    version,
    tarballUrl: `https://registry.npmjs.org/@mindfoldhq/trellis/-/trellis-${version}.tgz`,
    shasumSha1: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    integritySha512:
      "sha512-QAi3W+KXb32grrx4PjbNS7WP7JT5IqlwTH78dZDY5tX0E3O/9mCZPGgxDDuVVbJiGD1qcyaFwsUJZhfHZpA+2A==",
  };
}

function sampleEntry(
  entryPath: (typeof RESEARCH_SKILL_RETIREMENT_TARGET_PATHS)[number],
  sha256: string[] = [HASH_A],
) {
  return {
    host: entryPath.startsWith(".claude/") ? ("claude" as const) : ("codex" as const),
    root: entryPath.startsWith(".claude/")
      ? (".claude/skills" as const)
      : (".agents/skills" as const),
    path: entryPath,
    sourceTarEntry: "package/dist/templates/common/bundled-skills/x/SKILL.md",
    renderingProfile: "historical-renderer-v1",
    sha256,
    artifacts: [sampleArtifact()],
  };
}

describe("research skill retirement evidence", () => {
  it("loads authority=none with empty entries and no deletion paths", () => {
    expect(RESEARCH_SKILL_RETIREMENT.schemaVersion).toBe(1);
    expect(RESEARCH_SKILL_RETIREMENT.normalization).toBe("raw-sha256");
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
        normalization: "raw-sha256",
        authority: "none",
        entries: [sampleEntry(".claude/skills/trellis-research-setup/SKILL.md")],
      }),
    ).toThrow(/empty entries/);
  });

  it("accepts partial authority for a proven subset", () => {
    const snapshot = loadResearchSkillRetirementSnapshot({
      schemaVersion: 1,
      normalization: "raw-sha256",
      authority: "partial",
      entries: [
        sampleEntry(".claude/skills/trellis-research-setup/SKILL.md"),
        sampleEntry(".agents/skills/trellis-research-setup/SKILL.md", [HASH_B]),
      ],
    });
    expect(snapshot.authority).toBe("partial");
    expect(snapshot.entries).toHaveLength(2);
  });

  it("rejects .trellis/research paths and unsafe paths", () => {
    expect(() =>
      loadResearchSkillRetirementSnapshot({
        schemaVersion: 1,
        normalization: "raw-sha256",
        authority: "complete",
        entries: RESEARCH_SKILL_RETIREMENT_TARGET_PATHS.map((entryPath) =>
          entryPath === ".claude/skills/trellis-research-setup/SKILL.md"
            ? {
                ...sampleEntry(entryPath),
                path: ".trellis/research/events.jsonl",
              }
            : sampleEntry(entryPath),
        ),
      }),
    ).toThrow(/Research state path forbidden|not a Research stage Skill target/);
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
    expect(getAuthorizedResearchSkillDeletes(getAllMigrations()).size).toBe(0);
  });

  it("fails closed when migrations invent Research Skill deletes without evidence", () => {
    expect(() =>
      assertResearchSkillRetirementAgreesWithMigrations([
        {
          type: "safe-file-delete",
          from: ".claude/skills/trellis-research-setup/SKILL.md",
          allowed_hashes: [HASH_B],
        },
      ]),
    ).toThrow(/forbids Research stage Skill/);
    expect(
      getAuthorizedResearchSkillDeletes([
        {
          type: "safe-file-delete",
          from: ".claude/skills/trellis-research-setup/SKILL.md",
          allowed_hashes: [HASH_B],
        },
      ]).size,
    ).toBe(0);
  });

  it("rejects migrations that widen allowed_hashes beyond evidence", () => {
    const evidence = loadResearchSkillRetirementSnapshot({
      schemaVersion: 1,
      normalization: "raw-sha256",
      authority: "partial",
      entries: [
        sampleEntry(".claude/skills/trellis-research-setup/SKILL.md", [HASH_A]),
      ],
    });
    expect(() =>
      assertResearchSkillRetirementAgreesWithMigrations(
        [
          {
            type: "safe-file-delete",
            from: ".claude/skills/trellis-research-setup/SKILL.md",
            allowed_hashes: [HASH_A, HASH_B],
          },
        ],
        evidence,
      ),
    ).toThrow(/allowed_hashes disagree/);
  });
});

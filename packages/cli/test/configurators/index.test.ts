import { describe, expect, it } from "vitest";
import {
  ALL_MANAGED_DIRS,
  CONFIG_DIRS,
  PLATFORM_IDS,
  PLATFORM_MANAGED_DIRS,
  collectPlatformTemplates,
  getInitToolChoices,
  getPlatformManagedPaths,
  getPlatformsWithPythonHooks,
  isManagedPath,
  isManagedRootDir,
  resolveCliFlag,
} from "../../src/configurators/index.js";
import { LEGACY_CLEANUP_MANAGED_ROOTS } from "../../src/legacy/retired-host-cleanup.js";
import { RESEARCH_STAGE_SKILL_NAMES } from "../../src/configurators/research-payload.js";

describe("active platform registry", () => {
  it("contains exactly Claude Code and Codex", () => {
    expect(PLATFORM_IDS).toEqual(["claude-code", "codex"]);
    expect(CONFIG_DIRS).toEqual([".claude", ".codex"]);
    expect(PLATFORM_MANAGED_DIRS).toEqual([
      ".claude",
      ".codex",
      ".agents/skills",
    ]);
  });

  it("keeps cleanup-only roots in the backup/empty-cleanup union", () => {
    expect(ALL_MANAGED_DIRS).toEqual([
      ".trellis",
      ...new Set([...PLATFORM_MANAGED_DIRS, ...LEGACY_CLEANUP_MANAGED_ROOTS]),
    ]);
    for (const root of [".iflow", ".windsurf", ".zcode/cli/agents"]) {
      expect(PLATFORM_MANAGED_DIRS).not.toContain(root);
      expect(ALL_MANAGED_DIRS).toContain(root);
    }
  });

  it("exposes only retained init choices and flags", () => {
    expect(getInitToolChoices()).toEqual([
      {
        key: "claude",
        name: "Claude Code",
        defaultChecked: true,
        platformId: "claude-code",
      },
      {
        key: "codex",
        name: expect.any(String),
        defaultChecked: false,
        platformId: "codex",
      },
    ]);
    expect(resolveCliFlag("claude")).toBe("claude-code");
    expect(resolveCliFlag("codex")).toBe("codex");
    expect(resolveCliFlag("cursor")).toBeUndefined();
    expect(resolveCliFlag("windsurf")).toBeUndefined();
  });

  it("reports both retained platforms as Python-hook platforms", () => {
    expect(getPlatformsWithPythonHooks()).toEqual(["claude-code", "codex"]);
  });
});

describe("managed path helpers", () => {
  it("matches active roots and cleanup-only roots", () => {
    expect(isManagedPath(".claude/commands/trellis/start.md")).toBe(true);
    expect(isManagedPath(".codex/agents/trellis-check.toml")).toBe(true);
    expect(isManagedPath(".agents/skills/trellis-check/SKILL.md")).toBe(true);
    expect(isManagedPath(".windsurf/workflows/legacy.md")).toBe(true);
    expect(isManagedPath(".claude-backup")).toBe(false);
    expect(isManagedPath("../.claude")).toBe(false);
  });

  it("matches exact managed roots but not subdirectories", () => {
    expect(isManagedRootDir(".claude")).toBe(true);
    expect(isManagedRootDir(".codex")).toBe(true);
    expect(isManagedRootDir(".agents/skills")).toBe(true);
    expect(isManagedRootDir(".windsurf")).toBe(true);
    expect(isManagedRootDir(".claude/commands")).toBe(false);
  });
});

describe("collectPlatformTemplates", () => {
  it("returns non-empty, POSIX-keyed current templates for both hosts", () => {
    for (const id of PLATFORM_IDS) {
      const templates = collectPlatformTemplates(id);
      expect(templates).toBeInstanceOf(Map);
      expect(templates?.size).toBeGreaterThan(0);
      const managedPaths = getPlatformManagedPaths(id);
      for (const [filePath] of templates ?? []) {
        expect(filePath).not.toMatch(/\\/);
        expect(
          managedPaths.some(
            (root) => filePath === root || filePath.startsWith(`${root}/`),
          ),
        ).toBe(true);
      }
    }
  });

  it("tracks exactly the Research stage skills under retained roots", () => {
    const claude = collectPlatformTemplates("claude-code");
    const codex = collectPlatformTemplates("codex");

    for (const skillName of RESEARCH_STAGE_SKILL_NAMES) {
      expect(claude?.has(`.claude/skills/${skillName}/SKILL.md`)).toBe(true);
      expect(codex?.has(`.agents/skills/${skillName}/SKILL.md`)).toBe(true);
    }
    expect(claude?.has(".claude/skills/trellis-meta/SKILL.md")).toBe(false);
    expect(codex?.has(".agents/skills/trellis-meta/SKILL.md")).toBe(false);
  });
});

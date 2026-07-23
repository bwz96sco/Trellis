/**
 * Registry invariant tests for the current Claude Code and Codex integrations.
 */

import { describe, expect, it } from "vitest";
import { AI_TOOLS } from "../src/types/ai-tools.js";
import { PLATFORM_IDS } from "../src/configurators/index.js";

const COMMANDER_RESERVED_FLAGS = ["help", "version", "V", "h"];

describe("registry internal consistency", () => {
  it("PLATFORM_IDS length matches AI_TOOLS keys", () => {
    expect(PLATFORM_IDS.length).toBe(Object.keys(AI_TOOLS).length);
  });

  it("all cliFlag values are unique", () => {
    const flags = PLATFORM_IDS.map((id) => AI_TOOLS[id].cliFlag);
    expect(new Set(flags).size).toBe(flags.length);
  });

  it("all configDir values are unique current managed roots", () => {
    const dirs = PLATFORM_IDS.map((id) => AI_TOOLS[id].configDir);
    expect(new Set(dirs).size).toBe(dirs.length);
    expect(dirs).toEqual([".claude", ".codex"]);
  });

  it("platforms with supportsAgentSkills do not use .agents/skills as configDir", () => {
    for (const id of PLATFORM_IDS) {
      expect(AI_TOOLS[id].configDir.startsWith(".")).toBe(true);
      expect(AI_TOOLS[id].configDir).not.toBe(".trellis");
      if (AI_TOOLS[id].supportsAgentSkills) {
        expect(AI_TOOLS[id].configDir).not.toBe(".agents/skills");
      }
    }
  });

  it("no cliFlag collides with commander.js reserved flags", () => {
    for (const id of PLATFORM_IDS) {
      expect(COMMANDER_RESERVED_FLAGS).not.toContain(AI_TOOLS[id].cliFlag);
    }
  });

  it("every platform has coherent metadata", () => {
    for (const id of PLATFORM_IDS) {
      const config = AI_TOOLS[id];
      expect(config.name.length).toBeGreaterThan(0);
      expect(config.templateDirs).toContain("common");
      expect(config.templateContext.cliFlag).toBe(config.cliFlag);
    }
  });
});

describe("UserPromptSubmit hook wiring", () => {
  const PLATFORM_HOOK_CONFIGS = [
    { platform: "claude", path: "claude/settings.json" },
    { platform: "codex", path: "codex/hooks.json" },
  ] as const;

  for (const { platform, path } of PLATFORM_HOOK_CONFIGS) {
    it(`${platform} hook config references inject-workflow-state.py`, async () => {
      const fs = await import("node:fs");
      const { dirname, join } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const templatesRoot = join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "src",
        "templates",
      );
      const raw = fs.readFileSync(join(templatesRoot, path), "utf-8");
      const parsed = JSON.parse(raw) as { hooks?: Record<string, unknown> };
      expect(Object.keys(parsed.hooks ?? {})).toContain("UserPromptSubmit");
      expect(raw).toContain("inject-workflow-state.py");
    });
  }
});

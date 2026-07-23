import { describe, expect, it } from "vitest";

import {
  getResearchWorkerTemplate,
  getSettingsTemplate,
  getStatuslineHook,
  settingsTemplate,
} from "../../src/templates/claude/index.js";

describe("Claude Research templates", () => {
  it("loads valid Research settings with the required SessionStart matchers", () => {
    const settings = JSON.parse(settingsTemplate) as {
      env?: Record<string, string>;
      hooks: {
        SessionStart: {
          matcher: string;
          hooks: { command: string }[];
        }[];
      };
    };

    expect(settings.env?.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR).toBe("1");
    expect(settings.hooks.SessionStart.map((entry) => entry.matcher)).toEqual(
      expect.arrayContaining(["startup", "clear", "compact"]),
    );
    for (const entry of settings.hooks.SessionStart) {
      expect(entry.hooks[0]?.command).toContain("{{PYTHON_CMD}}");
      expect(entry.hooks[0]?.command).toContain("session-start.py");
    }
  });

  it("returns the exact settings target", () => {
    expect(getSettingsTemplate()).toEqual({
      targetPath: "settings.json",
      content: settingsTemplate,
    });
  });

  it("loads only the exact Research worker through the public agent getter", () => {
    const worker = getResearchWorkerTemplate();
    expect(worker.name).toBe("trellis-research-worker");
    expect(worker.content).toContain("# Validated Research Dispatch");
    expect(worker.content).toContain("VALIDATED_DISPATCH_CONTEXT_START");
  });

  it("loads the optional Research status line hook", () => {
    const statusline = getStatuslineHook();
    expect(statusline).toContain("#!/usr/bin/env python3");
    expect(statusline.length).toBeGreaterThan(0);
  });
});

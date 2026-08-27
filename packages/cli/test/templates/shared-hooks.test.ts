import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";
import * as sharedHooks from "../../src/templates/shared-hooks/index.js";
import {
  SHARED_HOOKS_BY_PLATFORM,
  getSharedHookScriptsForPlatform,
  type HookScript,
  type SharedHookName,
  type SharedHookPlatform,
} from "../../src/templates/shared-hooks/index.js";

const CLI_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const REPO_ROOT = path.resolve(CLI_DIR, "../..");

const ALL_HOOK_FILES = [
  "session-start.py",
  "inject-workflow-state.py",
  "inject-subagent-context.py",
] as const;

const RETIRED_HOST_TERMS = [
  "cursor",
  "opencode",
  "kiro",
  "gemini",
  "qoder",
  "codebuddy",
  "copilot",
  "droid",
  "trae",
  "zcode",
];

function getRetainedSharedHooks(): HookScript[] {
  const hooks = new Map<SharedHookName, HookScript>();
  for (const platform of Object.keys(
    SHARED_HOOKS_BY_PLATFORM,
  ) as SharedHookPlatform[]) {
    for (const hook of getSharedHookScriptsForPlatform(platform)) {
      hooks.set(hook.name, hook);
    }
  }
  return [...hooks.values()];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shared-hooks capability table", () => {
  it("contains exactly the retained Claude and Codex distribution", () => {
    expect(SHARED_HOOKS_BY_PLATFORM).toEqual({
      claude: [
        "session-start.py",
        "inject-workflow-state.py",
        "inject-subagent-context.py",
      ],
      codex: ["inject-workflow-state.py"],
    });
  });

  it("contains exactly the three retained shared hook files", () => {
    expect(
      getRetainedSharedHooks()
        .map((hook) => hook.name)
        .sort(),
    ).toEqual([...ALL_HOOK_FILES].sort());
  });

  it("does not export a broad shared-hook directory scanner", () => {
    expect(sharedHooks).not.toHaveProperty("getSharedHookScripts");
  });

  it("ignores neighboring hook files and reads only the declared matrix", () => {
    const readdirSpy = vi
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["neighbor.py"]);

    expect(
      getSharedHookScriptsForPlatform("codex").map((hook) => hook.name),
    ).toEqual(["inject-workflow-state.py"]);
    expect(readdirSpy).not.toHaveBeenCalled();
  });

  it("fails closed when a required exact hook asset is missing", () => {
    vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
      throw new Error("missing fixture hook");
    });

    expect(() => getSharedHookScriptsForPlatform("claude")).toThrow(
      "Missing required claude Research hook template: session-start.py",
    );
  });

  it("returns exactly each retained platform's declared set", () => {
    for (const platform of Object.keys(
      SHARED_HOOKS_BY_PLATFORM,
    ) as SharedHookPlatform[]) {
      expect(
        getSharedHookScriptsForPlatform(platform)
          .map((hook) => hook.name)
          .sort(),
      ).toEqual([...SHARED_HOOKS_BY_PLATFORM[platform]].sort());
    }
  });

  it("does not distribute Claude-only hooks to Codex", () => {
    expect(SHARED_HOOKS_BY_PLATFORM.codex).not.toContain("session-start.py");
    expect(SHARED_HOOKS_BY_PLATFORM.codex).not.toContain(
      "inject-subagent-context.py",
    );
  });

  it("removes retired-host runtime branches from current shared hooks", () => {
    for (const hook of getRetainedSharedHooks()) {
      const lower = hook.content.toLowerCase();
      for (const host of RETIRED_HOST_TERMS) {
        expect(
          lower,
          `${hook.name} still names retired host ${host}`,
        ).not.toMatch(new RegExp(`\\b${host}\\b`));
      }
    }
  });

  it("uses session-scoped active task state without legacy global pointers", () => {
    for (const hook of getRetainedSharedHooks()) {
      expect(hook.content).not.toContain(".current-task");
      expect(hook.content).not.toContain("global fallback");
    }
  });

  it("keeps compact Claude Research orientation", () => {
    const content = getRetainedSharedHooks().find(
      (hook) => hook.name === "session-start.py",
    )?.content;
    expect(content).toContain("Trellis Research orientation");
    expect(content).toContain("trellis research status --json");
    expect(content).toContain("Current Quest");
    expect(content).not.toContain("<trellis-workflow>");
    expect(content).not.toContain("Task context order");
  });

  it("keeps retained root hook copies byte-identical to canonical templates", () => {
    const canonicalByName = new Map(
      getRetainedSharedHooks().map((hook) => [hook.name, hook.content]),
    );
    for (const name of ALL_HOOK_FILES) {
      expect(
        fs.readFileSync(
          path.join(REPO_ROOT, ".claude", "hooks", name),
          "utf-8",
        ),
      ).toBe(canonicalByName.get(name));
    }
    expect(
      fs.readFileSync(
        path.join(REPO_ROOT, ".codex", "hooks", "inject-workflow-state.py"),
        "utf-8",
      ),
    ).toBe(canonicalByName.get("inject-workflow-state.py"));
  });

  it("decodes every Windows Research hook stream as UTF-8", () => {
    for (const hook of getRetainedSharedHooks()) {
      expect(hook.content).toContain(
        "for stream in (sys.stdin, sys.stdout, sys.stderr):",
      );
    }
  });

  it("uses bounded exception handling for Research hook degradation", () => {
    for (const name of ["session-start.py", "inject-workflow-state.py"]) {
      const content = getRetainedSharedHooks().find(
        (hook) => hook.name === name,
      )?.content;
      expect(content).toBeDefined();
      expect(content).not.toContain("BaseException");
      expect(content).not.toContain("except:");
      expect(content).toContain("except OSError:");
    }
  });
});

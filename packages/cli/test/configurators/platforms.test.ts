import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  collectPlatformTemplates,
  configurePlatform,
  getConfiguredPlatforms,
  PLATFORM_IDS,
} from "../../src/configurators/index.js";
import {
  RESEARCH_PAYLOAD_PATHS,
  RESEARCH_STAGE_SKILL_NAMES,
} from "../../src/configurators/research-payload.js";
import { replacePythonCommandLiterals } from "../../src/configurators/shared.js";
import { getStatuslineHook } from "../../src/templates/claude/index.js";
import { setWriteMode } from "../../src/utils/file-writer.js";

function readConfiguredFile(root: string, relativePath: string): string {
  return fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf-8");
}

function listFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  };
  walk(root);
  return files.sort();
}

const claudePaths = [
  RESEARCH_PAYLOAD_PATHS.claude.worker,
  ...RESEARCH_STAGE_SKILL_NAMES.map(
    (name) => `.claude/skills/${name}/SKILL.md`,
  ),
  ...RESEARCH_PAYLOAD_PATHS.claude.hooks,
  RESEARCH_PAYLOAD_PATHS.claude.config,
].sort();

const codexPaths = [
  RESEARCH_PAYLOAD_PATHS.codex.worker,
  ...RESEARCH_STAGE_SKILL_NAMES.map(
    (name) => `.agents/skills/${name}/SKILL.md`,
  ),
  ...RESEARCH_PAYLOAD_PATHS.codex.hooks,
  ...RESEARCH_PAYLOAD_PATHS.codex.config,
].sort();

describe("getConfiguredPlatforms", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-platforms-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects only .claude and .codex", () => {
    fs.mkdirSync(path.join(tmpDir, ".claude"));
    fs.mkdirSync(path.join(tmpDir, ".codex"));
    expect([...getConfiguredPlatforms(tmpDir)]).toEqual([
      "claude-code",
      "codex",
    ]);
  });

  it("does not detect shared Agent Skills or retired roots", () => {
    for (const retiredRoot of [
      [".agents", "skills"],
      [".cursor"],
      [".opencode"],
      [".windsurf", "workflows"],
      [".github", "copilot"],
      [".pi"],
      [".zcode"],
    ]) {
      fs.mkdirSync(path.join(tmpDir, ...retiredRoot), { recursive: true });
    }
    expect(getConfiguredPlatforms(tmpDir)).toEqual(new Set());
  });
});

describe("configurePlatform", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-configure-"));
    setWriteMode("force");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    setWriteMode("ask");
  });

  it("configures both retained hosts", async () => {
    await configurePlatform("claude-code", tmpDir);
    await configurePlatform("codex", tmpDir);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".codex"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".agents", "skills"))).toBe(true);
  });

  it("exposes exact Research-only path allowlists", () => {
    expect([...collectPlatformTemplates("claude-code").keys()].sort()).toEqual(
      claudePaths,
    );
    expect([...collectPlatformTemplates("codex").keys()].sort()).toEqual(
      codexPaths,
    );
  });

  it("keeps configured files and collected templates equal in both directions", async () => {
    for (const id of PLATFORM_IDS) {
      const platformDir = fs.mkdtempSync(
        path.join(os.tmpdir(), `trellis-parity-${id}-`),
      );
      try {
        await configurePlatform(id, platformDir);
        const templates = collectPlatformTemplates(id, platformDir);
        expect(listFiles(platformDir)).toEqual([...templates.keys()].sort());
        for (const [relativePath, expectedContent] of templates) {
          expect(readConfiguredFile(platformDir, relativePath)).toBe(
            expectedContent,
          );
        }
      } finally {
        fs.rmSync(platformDir, { recursive: true, force: true });
      }
    }
  });

  it("writes only the bounded Codex worker, stage skills, hook, and config", async () => {
    await configurePlatform("codex", tmpDir);

    expect(listFiles(tmpDir)).toEqual(codexPaths);
    expect(
      readConfiguredFile(tmpDir, RESEARCH_PAYLOAD_PATHS.codex.worker),
    ).not.toContain("{TASK_DIR}");
    expect(fs.existsSync(path.join(tmpDir, ".codex/hooks/session-start.py"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(tmpDir, ".codex/skills"))).toBe(false);
  });

  it("keeps Claude statusline opt-in byte-stable", async () => {
    await configurePlatform("claude-code", tmpDir, { withStatusline: false });
    expect(listFiles(tmpDir)).toEqual(claudePaths);
    expect(fs.existsSync(path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.statusline))).toBe(
      false,
    );

    await configurePlatform("claude-code", tmpDir, { withStatusline: true });
    expect(listFiles(tmpDir)).toEqual(
      [...claudePaths, RESEARCH_PAYLOAD_PATHS.claude.statusline].sort(),
    );
    expect(readConfiguredFile(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.statusline)).toBe(
      replacePythonCommandLiterals(getStatuslineHook()),
    );
    const settings = JSON.parse(
      readConfiguredFile(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.config),
    ) as Record<string, unknown>;
    expect(settings.statusLine).toEqual({
      type: "command",
      command: replacePythonCommandLiterals(
        "python3 .claude/hooks/statusline.py",
      ),
    });
  });

  it("preserves unrelated structured host config fields", async () => {
    fs.mkdirSync(path.join(tmpDir, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".claude/settings.json"),
      JSON.stringify({ permissions: { allow: ["Read"] }, hooks: {} }, null, 2),
    );
    fs.mkdirSync(path.join(tmpDir, ".codex"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".codex/hooks.json"),
      JSON.stringify({ custom: true, hooks: { SessionStart: [{ custom: true }] } }, null, 2),
    );
    fs.writeFileSync(
      path.join(tmpDir, ".codex/config.toml"),
      'model = "custom"\n',
    );

    await configurePlatform("claude-code", tmpDir);
    await configurePlatform("codex", tmpDir);

    expect(
      JSON.parse(readConfiguredFile(tmpDir, ".claude/settings.json")),
    ).toMatchObject({ permissions: { allow: ["Read"] } });
    expect(JSON.parse(readConfiguredFile(tmpDir, ".codex/hooks.json"))).toMatchObject({
      custom: true,
      hooks: { SessionStart: [{ custom: true }] },
    });
    expect(readConfiguredFile(tmpDir, ".codex/config.toml")).toContain(
      'model = "custom"',
    );
  });
});

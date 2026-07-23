import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import inquirer from "inquirer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("figlet", () => ({
  default: { textSync: vi.fn(() => "TRELLIS") },
}));

vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({}) },
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn().mockImplementation((command: string) => {
    const python = process.platform === "win32" ? "python" : "python3";
    return command === `${python} --version` ? "Python 3.11.12" : "";
  }),
}));

import { execSync } from "node:child_process";

import { init } from "../../src/commands/init.js";
import {
  RESEARCH_PAYLOAD_PATHS,
  RESEARCH_STAGE_SKILL_NAMES,
} from "../../src/configurators/research-payload.js";
import { DIR_NAMES, FILE_NAMES, PATHS } from "../../src/constants/paths.js";
import { VERSION } from "../../src/constants/version.js";
import { computeHash } from "../../src/utils/template-hash.js";

const noop = (): void => undefined;

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

const claudePayloadPaths = [
  RESEARCH_PAYLOAD_PATHS.claude.worker,
  ...RESEARCH_STAGE_SKILL_NAMES.map(
    (name) => `.claude/skills/${name}/SKILL.md`,
  ),
  ...RESEARCH_PAYLOAD_PATHS.claude.hooks,
  RESEARCH_PAYLOAD_PATHS.claude.config,
].sort();

const codexPayloadPaths = [
  RESEARCH_PAYLOAD_PATHS.codex.worker,
  ...RESEARCH_STAGE_SKILL_NAMES.map(
    (name) => `.agents/skills/${name}/SKILL.md`,
  ),
  ...RESEARCH_PAYLOAD_PATHS.codex.hooks,
  ...RESEARCH_PAYLOAD_PATHS.codex.config,
].sort();

describe("init() integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-init-int-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "warn").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    vi.mocked(execSync).mockClear();
    vi.mocked(execSync).mockImplementation(((command: string) => {
      const python = process.platform === "win32" ? "python" : "python3";
      return command === `${python} --version` ? "Python 3.11.12" : "";
    }) as typeof execSync);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates only the Research bridge and default Claude payload", async () => {
    await init({ yes: true });

    expect(fs.existsSync(path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".trellis/config.yaml"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, FILE_NAMES.AGENTS))).toBe(true);

    for (const absent of [
      PATHS.SCRIPTS,
      PATHS.WORKSPACE,
      PATHS.TASKS,
      PATHS.SPEC,
      PATHS.DEVELOPER_FILE,
      ".trellis/agents",
      ".trellis/research",
      ".codex",
      ".agents/skills",
    ]) {
      expect(fs.existsSync(path.join(tmpDir, absent)), absent).toBe(false);
    }

    const hostFiles = listFiles(tmpDir)
      .filter((relativePath) => relativePath.startsWith(".claude/"))
      .sort();
    expect(hostFiles).toEqual(claudePayloadPaths);
  });

  it("creates exact dual-host Research payloads", async () => {
    await init({ yes: true, claude: true, codex: true });

    const hostFiles = listFiles(tmpDir)
      .filter(
        (relativePath) =>
          relativePath.startsWith(".claude/") ||
          relativePath.startsWith(".codex/") ||
          relativePath.startsWith(".agents/skills/"),
      )
      .sort();
    expect(hostFiles).toEqual([...claudePayloadPaths, ...codexPayloadPaths].sort());
    expect(fs.existsSync(path.join(tmpDir, ".codex/hooks/session-start.py"))).toBe(
      false,
    );
  });

  it("does not print the promotional pain-point block", async () => {
    await init({ yes: true });

    const output = vi
      .mocked(console.log)
      .mock.calls.flat()
      .filter((part): part is string => typeof part === "string")
      .join("\n");
    expect(output).not.toContain("Sound familiar?");
    expect(output).not.toContain("You'll never say these again!!");
  });

  it("throws before filesystem writes when every Python candidate is too old", async () => {
    vi.mocked(execSync).mockImplementation(
      (() => "Python 3.8.18") as typeof execSync,
    );

    await expect(init({ yes: true, claude: true })).rejects.toThrow(
      /No supported Python command found.*Python 3\.8\.18 \(< 3\.9\)/s,
    );
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it("throws before filesystem writes when Python is missing", async () => {
    vi.mocked(execSync).mockImplementation((() => {
      throw new Error("not found");
    }) as typeof execSync);

    await expect(init({ yes: true, claude: true })).rejects.toThrow(
      /No supported Python command found.*not found/s,
    );
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it("renders the selected Python command into generated settings", async () => {
    const python = process.platform === "win32" ? "python" : "python3";

    await init({ yes: true, claude: true });

    const settings = fs.readFileSync(
      path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.config),
      "utf-8",
    );
    expect(settings).toContain(`"${python} .claude/hooks/session-start.py"`);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(
        `Trellis rendered Python commands as "${python}" in generated hooks, settings, and help text`,
      ),
    );
  });

  it("writes version and ownership hashes for retained output only", async () => {
    await init({ yes: true });

    expect(
      fs.readFileSync(path.join(tmpDir, DIR_NAMES.WORKFLOW, ".version"), "utf-8"),
    ).toBe(VERSION);
    const hashDocument = JSON.parse(
      fs.readFileSync(
        path.join(tmpDir, DIR_NAMES.WORKFLOW, ".template-hashes.json"),
        "utf-8",
      ),
    ) as { hashes?: Record<string, string> };
    const hashes = hashDocument.hashes ?? {};
    for (const relativePath of [
      FILE_NAMES.AGENTS,
      PATHS.WORKFLOW_GUIDE_FILE,
      RESEARCH_PAYLOAD_PATHS.claude.worker,
      ".claude/skills/trellis-research-literature/SKILL.md",
    ]) {
      expect(hashes[relativePath]).toBe(
        computeHash(fs.readFileSync(path.join(tmpDir, relativePath), "utf-8")),
      );
    }
    expect(hashes[`${PATHS.SCRIPTS}/get_context.py`]).toBeUndefined();
    expect(hashes[".trellis/agents/research.md"]).toBeUndefined();
  });

  it("ignores project-type signals and keeps generic spec state absent", async () => {
    fs.writeFileSync(path.join(tmpDir, "go.mod"), "module example.com/app\n");
    fs.writeFileSync(path.join(tmpDir, "vite.config.ts"), "export default {}\n");

    await init({ yes: true });

    expect(fs.existsSync(path.join(tmpDir, PATHS.SPEC))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, PATHS.WORKSPACE))).toBe(false);
  });

  it("writes the retained Claude hook timeout contract", async () => {
    await init({ yes: true, claude: true });

    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude/settings.json"), "utf-8"),
    ) as {
      hooks: {
        SessionStart: { hooks: { timeout: number }[] }[];
        UserPromptSubmit: { hooks: { timeout: number }[] }[];
      };
    };
    for (const entry of settings.hooks.SessionStart) {
      for (const hook of entry.hooks) expect(hook.timeout).toBeGreaterThanOrEqual(30);
    }
    for (const entry of settings.hooks.UserPromptSubmit) {
      for (const hook of entry.hooks) expect(hook.timeout).toBeGreaterThanOrEqual(15);
    }
  });

  async function installStatuslinePromptMock(
    withStatusline: boolean,
  ): Promise<{ confirms: { name?: string; default?: boolean }[] }> {
    const confirms: { name?: string; default?: boolean }[] = [];
    vi.mocked(inquirer.prompt).mockImplementation(((questions: unknown) => {
      const question = (Array.isArray(questions) ? questions[0] : questions) as {
        name?: string;
        default?: boolean;
      };
      if (question.name === "tools") {
        return Promise.resolve({ tools: ["claude"] });
      }
      if (question.name === "withStatusline") {
        confirms.push(question);
        return Promise.resolve({ withStatusline });
      }
      return Promise.resolve({});
    }) as never);
    return { confirms };
  }

  it("interactive init offers the optional statusline and defaults to no", async () => {
    const { confirms } = await installStatuslinePromptMock(true);

    await init({});

    expect(confirms).toHaveLength(1);
    expect(confirms[0]?.default).toBe(false);
    expect(
      fs.existsSync(path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.statusline)),
    ).toBe(true);
    expect(
      JSON.parse(fs.readFileSync(path.join(tmpDir, ".claude/settings.json"), "utf-8")),
    ).toHaveProperty("statusLine");
  });

  it("yes mode does not prompt for or install the optional statusline", async () => {
    const { confirms } = await installStatuslinePromptMock(true);

    await init({ yes: true, claude: true });

    expect(confirms).toHaveLength(0);
    expect(
      fs.existsSync(path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.statusline)),
    ).toBe(false);
  });

  it("--with-statusline installs without prompting", async () => {
    const { confirms } = await installStatuslinePromptMock(false);

    await init({ claude: true, withStatusline: true });

    expect(confirms).toHaveLength(0);
    expect(
      fs.existsSync(path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.statusline)),
    ).toBe(true);
  });

  it("host-addition re-init can opt newly added Claude into statusline", async () => {
    await init({ yes: true, codex: true });
    const workflowBefore = fs.readFileSync(
      path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE),
      "utf-8",
    );
    const { confirms } = await installStatuslinePromptMock(true);

    await init({ claude: true });

    expect(confirms).toHaveLength(1);
    expect(
      fs.existsSync(path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.statusline)),
    ).toBe(true);
    expect(
      fs.readFileSync(path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE), "utf-8"),
    ).toBe(workflowBefore);
  });

  it("full re-init preserves unrelated structured host fields", async () => {
    fs.mkdirSync(path.join(tmpDir, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".claude/settings.json"),
      `${JSON.stringify({ permissions: { allow: ["Read"] }, hooks: {} }, null, 2)}\n`,
    );
    fs.mkdirSync(path.join(tmpDir, ".codex"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".codex/hooks.json"),
      `${JSON.stringify({ custom: true, hooks: {} }, null, 2)}\n`,
    );
    fs.writeFileSync(path.join(tmpDir, ".codex/config.toml"), 'model = "custom"\n');

    await init({ yes: true, claude: true, codex: true, force: true });

    expect(
      JSON.parse(fs.readFileSync(path.join(tmpDir, ".claude/settings.json"), "utf-8")),
    ).toMatchObject({ permissions: { allow: ["Read"] } });
    expect(
      JSON.parse(fs.readFileSync(path.join(tmpDir, ".codex/hooks.json"), "utf-8")),
    ).toMatchObject({ custom: true });
    expect(fs.readFileSync(path.join(tmpDir, ".codex/config.toml"), "utf-8")).toContain(
      'model = "custom"',
    );
  });
});

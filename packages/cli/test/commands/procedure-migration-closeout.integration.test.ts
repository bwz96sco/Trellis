import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("figlet", () => ({
  default: { textSync: vi.fn(() => "TRELLIS") },
}));

vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}));

vi.mock("node:child_process", async () => {
  const actual =
    await vi.importActual<typeof import("node:child_process")>(
      "node:child_process",
    );
  return {
    ...actual,
    execSync: vi.fn().mockImplementation((command: string) => {
      const python = process.platform === "win32" ? "python" : "python3";
      return command === `${python} --version` ? "Python 3.11.12" : "";
    }),
  };
});

import { init } from "../../src/commands/init.js";
import { uninstall } from "../../src/commands/uninstall.js";
import { update } from "../../src/commands/update.js";
import { RESEARCH_STAGE_SKILL_NAMES } from "../../src/legacy/research-skill-retirement.js";
import {
  computeHash,
  loadHashes,
  saveHashes,
} from "../../src/utils/template-hash.js";

const noop = (): void => undefined;

function stageSkillPaths(): string[] {
  return RESEARCH_STAGE_SKILL_NAMES.flatMap((name) => [
    `.claude/skills/${name}/SKILL.md`,
    `.agents/skills/${name}/SKILL.md`,
  ]);
}

function assertNoStageSkills(root: string): void {
  for (const relativePath of stageSkillPaths()) {
    expect(
      fs.existsSync(path.join(root, relativePath)),
      relativePath,
    ).toBe(false);
  }
}

describe("C10 procedure migration closeout", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-c10-closeout-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "warn").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("fresh Claude/Codex/dual installs stay Skill-free and keep successor workers", async () => {
    for (const [name, options, expectClaude, expectCodex] of [
      ["claude", { yes: true, claude: true }, true, false],
      ["codex", { yes: true, codex: true }, false, true],
      ["dual", { yes: true, claude: true, codex: true }, true, true],
    ] as const) {
      const root = path.join(tmpDir, name);
      fs.mkdirSync(root);
      vi.mocked(process.cwd).mockReturnValue(root);
      await init(options);

      assertNoStageSkills(root);
      expect(fs.existsSync(path.join(root, ".trellis/research"))).toBe(false);
      if (expectClaude) {
        expect(
          fs.existsSync(
            path.join(root, ".claude/agents/trellis-research-worker.md"),
          ),
        ).toBe(true);
      }
      if (expectCodex) {
        expect(
          fs.existsSync(
            path.join(root, ".codex/agents/trellis-research-worker.toml"),
          ),
        ).toBe(true);
      }
    }
  });

  it("update dry-run is zero-write and preserves historical stage Skills", async () => {
    await init({ yes: true, claude: true, codex: true });
    const skillPath = ".claude/skills/trellis-research-literature/SKILL.md";
    const fullSkill = path.join(tmpDir, skillPath);
    fs.mkdirSync(path.dirname(fullSkill), { recursive: true });
    fs.writeFileSync(fullSkill, "# historical literature skill\n");

    const before = new Map<string, string>();
    const walk = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(absolute);
        else {
          before.set(
            path.relative(tmpDir, absolute),
            fs.readFileSync(absolute, "utf-8"),
          );
        }
      }
    };
    walk(tmpDir);

    await update({ force: true, dryRun: true });

    const after = new Map<string, string>();
    const walkAfter = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) walkAfter(absolute);
        else {
          after.set(
            path.relative(tmpDir, absolute),
            fs.readFileSync(absolute, "utf-8"),
          );
        }
      }
    };
    walkAfter(tmpDir);
    expect([...after.entries()].sort()).toEqual([...before.entries()].sort());
    expect(fs.readFileSync(fullSkill, "utf-8")).toBe(
      "# historical literature skill\n",
    );

    await update({ force: true });
    expect(fs.readFileSync(fullSkill, "utf-8")).toBe(
      "# historical literature skill\n",
    );
    expect(loadHashes(tmpDir)[skillPath]).toBeUndefined();
  });

  it("uninstall defers owned historical stage Skills without deletion authority", async () => {
    await init({ yes: true, claude: true });
    const skillPath = ".claude/skills/trellis-research-setup/SKILL.md";
    const fullSkill = path.join(tmpDir, skillPath);
    fs.mkdirSync(path.dirname(fullSkill), { recursive: true });
    const content = "# owned historical setup skill\n";
    fs.writeFileSync(fullSkill, content);
    const hashes = loadHashes(tmpDir);
    hashes[skillPath] = computeHash(content);
    saveHashes(tmpDir, hashes);

    await uninstall({ yes: true });

    expect(fs.readFileSync(fullSkill, "utf-8")).toBe(content);
    expect(loadHashes(tmpDir)[skillPath]).toBe(computeHash(content));
    expect(
      fs.existsSync(
        path.join(tmpDir, ".claude/agents/trellis-research-worker.md"),
      ),
    ).toBe(false);
  });

  it("repeated update is idempotent for Skill-free dual-host projects", async () => {
    await init({ yes: true, claude: true, codex: true });
    await update({ force: true });
    const first = loadHashes(tmpDir);
    await update({ force: true });
    expect(loadHashes(tmpDir)).toEqual(first);
    assertNoStageSkills(tmpDir);
  });
});

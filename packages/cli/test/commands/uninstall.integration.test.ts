/**
 * Integration tests for the uninstall() command.
 *
 * Each test runs init() in a fresh tmpdir, then exercises uninstall under
 * different flag combinations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import inquirer from "inquirer";

vi.mock("figlet", () => ({
  default: { textSync: vi.fn(() => "TRELLIS") },
}));

vi.mock("inquirer", () => ({
  default: { prompt: vi.fn() },
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn().mockImplementation((cmd: string) => {
    const py = process.platform === "win32" ? "python" : "python3";
    return cmd === `${py} --version` ? "Python 3.11.12" : "";
  }),
}));

import { init } from "../../src/commands/init.js";
import { uninstall } from "../../src/commands/uninstall.js";
import { DIR_NAMES } from "../../src/constants/paths.js";
import {
  computeHash,
  loadHashes,
  saveHashes,
} from "../../src/utils/template-hash.js";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

describe("uninstall() integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-uninstall-int-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    // Default: confirm = yes for all prompts.
    vi.mocked(inquirer.prompt).mockResolvedValue({ proceed: true });
    // Force prompt path (treat stdin as TTY in test env).
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("#1 friendly exit when .trellis/ is missing", async () => {
    // No init — tmpDir is empty.
    await uninstall({ yes: true });
    // Nothing was created or deleted; tmpDir should still be empty.
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });

  it("#2 errors when manifest is missing but unmanaged .trellis content exists", async () => {
    fs.mkdirSync(path.join(tmpDir, DIR_NAMES.WORKFLOW));
    fs.writeFileSync(
      path.join(tmpDir, DIR_NAMES.WORKFLOW, "unknown.txt"),
      "user\n",
    );
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit(${code ?? 0})`);
    }) as never);

    await expect(uninstall({ yes: true })).rejects.toThrow("process.exit(1)");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("#2b fails closed when the manifest is malformed", async () => {
    fs.mkdirSync(path.join(tmpDir, ".trellis"));
    const manifestPath = path.join(tmpDir, ".trellis", ".template-hashes.json");
    fs.writeFileSync(manifestPath, "{not-json");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit(${code ?? 0})`);
    }) as never);

    await expect(uninstall({ yes: true })).rejects.toThrow("process.exit(1)");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(fs.readFileSync(manifestPath, "utf-8")).toBe("{not-json");
  });

  it("#2c missing manifest is a friendly no-op when only protected research remains", async () => {
    const ledgerPath = path.join(
      tmpDir,
      ".trellis",
      "research",
      "events.jsonl",
    );
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.writeFileSync(ledgerPath, "ledger\n");

    await uninstall({ yes: true });

    expect(fs.readFileSync(ledgerPath, "utf-8")).toBe("ledger\n");
  });

  it("#3 init → uninstall removes pristine managed files without recursively deleting .trellis", async () => {
    await init({ yes: true, claude: true, codex: true, force: true });

    // Sanity: init wrote things.
    expect(fs.existsSync(path.join(tmpDir, ".trellis"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".codex"))).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, ".trellis", "research", "policy.json")),
    ).toBe(false);

    const hashesBefore = loadHashes(tmpDir);
    expect(Object.keys(hashesBefore).length).toBeGreaterThan(0);

    await uninstall({ yes: true });

    // The workflow root may remain with untracked/user-owned state, but all
    // completed ownership entries must be released.
    expect(loadHashes(tmpDir)).toEqual({});

    // Every opaque manifest path (non-structured files) should be gone.
    // Structured config files (settings.json/hooks.json/config.toml/
    // package.json) may legitimately remain when the trellis template
    // shipped non-trellis fields too (e.g. .claude/settings.json's `env`
    // and `enabledPlugins`). Such residuals are scrubbed but kept on
    // disk per the PRD ("settings.json 剥离后若仅剩空 hooks 对象 → 文件被删除；
    // 否则保留").
    const STRUCTURED_TAILS = [
      "/settings.json",
      "/hooks.json",
      "/config.toml",
      "/package.json",
    ];
    const stillPresentOpaque = Object.keys(hashesBefore).filter((p) => {
      const isStructured = STRUCTURED_TAILS.some((tail) => p.endsWith(tail));
      if (isStructured || p.startsWith(".trellis/")) return false;
      return fs.existsSync(path.join(tmpDir, ...p.split("/")));
    });
    expect(stillPresentOpaque).toEqual([]);
    expect(
      fs.existsSync(path.join(tmpDir, ".trellis", "research", "policy.json")),
    ).toBe(false);

    // Any structured file that remains must have been scrubbed: it must NOT
    // contain any references to the deleted manifest paths.
    for (const p of Object.keys(hashesBefore)) {
      const isStructured = STRUCTURED_TAILS.some((tail) => p.endsWith(tail));
      if (!isStructured) continue;
      const abs = path.join(tmpDir, ...p.split("/"));
      if (!fs.existsSync(abs)) continue;
      const text = fs.readFileSync(abs, "utf-8");
      for (const otherPath of Object.keys(hashesBefore)) {
        if (otherPath === p) continue;
        if (STRUCTURED_TAILS.some((tail) => otherPath.endsWith(tail))) continue;
        // The deleted file should not retain an active structured reference.
        // A prose comment may still name AGENTS.md after the managed TOML key
        // itself has been scrubbed.
        if (p === ".codex/config.toml" && otherPath === "AGENTS.md") {
          expect(text).not.toContain("project_doc_fallback_filenames");
        } else {
          expect(text).not.toContain(otherPath);
        }
      }
    }
  });

  it("#4 dry-run does not modify anything, including manifest pruning", async () => {
    await init({ yes: true, claude: true, force: true });
    const poisoned = loadHashes(tmpDir);
    poisoned[".trellis/unknown-user.txt"] = "poisoned";
    saveHashes(tmpDir, poisoned);
    fs.writeFileSync(
      path.join(tmpDir, ".trellis", "unknown-user.txt"),
      "user\n",
    );

    // Snapshot file tree contents.
    const snapshot: Record<string, string> = {};
    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else snapshot[full] = fs.readFileSync(full, "utf-8");
      }
    }
    walk(tmpDir);

    await uninstall({ dryRun: true });

    // No files changed.
    for (const [p, content] of Object.entries(snapshot)) {
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.readFileSync(p, "utf-8")).toBe(content);
    }
    // Inquirer not prompted.
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it("#5 user input 'no' aborts without modification", async () => {
    await init({ yes: true, claude: true, force: true });
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ proceed: false });

    await uninstall({});

    expect(fs.existsSync(path.join(tmpDir, ".trellis"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".claude"))).toBe(true);
  });

  it("#6 user-modified opaque file survives and is released from ownership", async () => {
    await init({ yes: true, codex: true, force: true });

    const hashesBefore = loadHashes(tmpDir);
    const structured = new Set([
      ".codex/hooks.json",
      ".codex/config.toml",
      "AGENTS.md",
    ]);
    const codexTrackedPath = Object.keys(hashesBefore).find(
      (p) => p.startsWith(".codex/") && !structured.has(p),
    );
    if (!codexTrackedPath) {
      throw new Error(
        "Test fixture: expected at least one opaque .codex/ manifest entry",
      );
    }
    const abs = path.join(tmpDir, ...codexTrackedPath.split("/"));
    fs.writeFileSync(abs, "USER MODIFIED CONTENT\n");

    await uninstall({ yes: true });

    expect(fs.readFileSync(abs, "utf-8")).toBe("USER MODIFIED CONTENT\n");
    expect(loadHashes(tmpDir)).not.toHaveProperty(codexTrackedPath);
  });

  it("#7 user-added file in a managed dir is NOT deleted", async () => {
    await init({ yes: true, claude: true, force: true });

    // Drop a user file into .claude/hooks/ that the manifest doesn't track.
    const userHookDir = path.join(tmpDir, ".claude", "hooks");
    fs.mkdirSync(userHookDir, { recursive: true });
    const userHook = path.join(userHookDir, "user-custom.py");
    fs.writeFileSync(userHook, "# user content\n");

    await uninstall({ yes: true });

    expect(fs.existsSync(userHook)).toBe(true);
    // The cleanup function only removes empty dirs, so .claude/hooks/ must
    // still exist (since user-custom.py lives there) and .claude/ must too.
    expect(fs.existsSync(userHookDir)).toBe(true);
  });

  it("#8a empty managed .agents/skills root is pruned", async () => {
    await init({ yes: true, codex: true, force: true });
    const skillsRoot = path.join(tmpDir, ".agents", "skills");
    // C08: Codex init no longer generates stage Skills. Plant an empty managed
    // root so uninstall can still prove confirmed-empty pruning.
    expect(fs.existsSync(skillsRoot)).toBe(false);
    fs.mkdirSync(skillsRoot, { recursive: true });
    expect(fs.existsSync(skillsRoot)).toBe(true);

    await uninstall({ yes: true });

    expect(fs.existsSync(skillsRoot)).toBe(false);
  });

  it("#8 .claude/settings.json with extra user fields keeps user fields, strips trellis hooks", async () => {
    await init({ yes: true, claude: true, force: true });

    // Simulate a user editing settings.json to add custom fields and a custom
    // hook entry alongside the trellis ones.
    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    if (!fs.existsSync(settingsPath)) {
      // Some init paths may not write settings.json; if so, skip the test by
      // synthesizing a representative file at the same location.
      fs.writeFileSync(
        settingsPath,
        JSON.stringify(
          {
            env: { CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: "1" },
            hooks: {
              SessionStart: [
                {
                  matcher: "startup",
                  hooks: [
                    {
                      type: "command",
                      command: "python3 .claude/hooks/session-start.py",
                    },
                  ],
                },
              ],
            },
          },
          null,
          2,
        ),
      );
    }

    const original = JSON.parse(
      fs.readFileSync(settingsPath, "utf-8"),
    ) as Record<string, unknown>;
    const augmented = {
      ...original,
      model: "claude-sonnet-4",
      permissions: { allow: ["Bash(git:*)"] },
    };
    // If hooks exist already, splice in a user hook into the SessionStart matcher block.
    if (
      augmented.hooks !== null &&
      typeof augmented.hooks === "object" &&
      !Array.isArray(augmented.hooks)
    ) {
      const hooks = augmented.hooks as Record<string, unknown>;
      const sessionStart = hooks.SessionStart;
      if (Array.isArray(sessionStart) && sessionStart.length > 0) {
        const block = sessionStart[0] as Record<string, unknown>;
        if (Array.isArray(block.hooks)) {
          (block.hooks as unknown[]).push({
            type: "command",
            command: "python3 .claude/hooks/my-user-hook.py",
            timeout: 5,
          });
        }
      }
    }
    fs.writeFileSync(settingsPath, JSON.stringify(augmented, null, 2));

    // We need this file in the manifest for it to be processed. If init
    // didn't track it, add it manually so the scrubber path runs.
    const hashes = loadHashes(tmpDir);
    if (
      !Object.prototype.hasOwnProperty.call(hashes, ".claude/settings.json")
    ) {
      hashes[".claude/settings.json"] = "synthetic-hash";
      const hashFile = path.join(
        tmpDir,
        DIR_NAMES.WORKFLOW,
        ".template-hashes.json",
      );
      fs.writeFileSync(
        hashFile,
        JSON.stringify({ __version: 2, hashes }, null, 2),
      );
    }

    await uninstall({ yes: true });

    // settings.json should remain because it contains user fields.
    if (fs.existsSync(settingsPath)) {
      const after = JSON.parse(
        fs.readFileSync(settingsPath, "utf-8"),
      ) as Record<string, unknown>;
      expect(after.model).toBe("claude-sonnet-4");
      expect(after.permissions).toEqual({ allow: ["Bash(git:*)"] });

      // User hook (if it was inserted) should still be present, trellis ones gone.
      const hooksAfter = after.hooks;
      if (
        hooksAfter !== null &&
        typeof hooksAfter === "object" &&
        !Array.isArray(hooksAfter)
      ) {
        const hooksObj = hooksAfter as Record<string, unknown>;
        const sessionStart = hooksObj.SessionStart;
        if (Array.isArray(sessionStart)) {
          for (const block of sessionStart) {
            if (
              block !== null &&
              typeof block === "object" &&
              "hooks" in block
            ) {
              const inner = (block as { hooks: unknown[] }).hooks;
              if (Array.isArray(inner)) {
                for (const entry of inner) {
                  if (
                    entry !== null &&
                    typeof entry === "object" &&
                    "command" in entry
                  ) {
                    const cmd = (entry as { command: string }).command;
                    expect(cmd).not.toContain(".claude/hooks/session-start.py");
                    expect(cmd).not.toContain(
                      ".claude/hooks/inject-subagent-context.py",
                    );
                    expect(cmd).not.toContain(
                      ".claude/hooks/inject-workflow-state.py",
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  it("#9 preserves the complete schema-v1 research fixture byte-for-byte", async () => {
    await init({ yes: true, claude: true, force: true });

    const fixtureRoot = path.resolve(
      import.meta.dirname,
      "../../../core/test/research/fixtures/schema-v1-complete",
    );
    const researchRoot = path.join(tmpDir, ".trellis", "research");
    fs.cpSync(fixtureRoot, researchRoot, { recursive: true });

    const before = new Map<string, Buffer>();
    function snapshot(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) snapshot(fullPath);
        else
          before.set(
            path.relative(researchRoot, fullPath),
            fs.readFileSync(fullPath),
          );
      }
    }
    snapshot(researchRoot);

    const hashes = loadHashes(tmpDir);
    hashes[".trellis/research/events.jsonl"] = computeHash(
      fs.readFileSync(path.join(researchRoot, "events.jsonl"), "utf-8"),
    );
    saveHashes(tmpDir, hashes);

    await uninstall({ yes: true });

    for (const [relativePath, bytes] of before) {
      const fullPath = path.join(researchRoot, relativePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.readFileSync(fullPath)).toEqual(bytes);
    }
    expect(loadHashes(tmpDir)).not.toHaveProperty(
      ".trellis/research/events.jsonl",
    );
  });

  it("#10 malformed structured files remain byte-identical and lose ownership", async () => {
    await init({ yes: true, claude: true, force: true });
    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    const malformed = Buffer.from('{"hooks":\n', "utf-8");
    fs.writeFileSync(settingsPath, malformed);

    const hashes = loadHashes(tmpDir);
    hashes[".claude/settings.json"] = computeHash(malformed.toString("utf-8"));
    saveHashes(tmpDir, hashes);

    await uninstall({ yes: true });

    expect(fs.readFileSync(settingsPath)).toEqual(malformed);
    expect(loadHashes(tmpDir)).not.toHaveProperty(".claude/settings.json");
  });

  it("#11 unknown and traversal manifest keys are pruned without touching files", async () => {
    await init({ yes: true, claude: true, force: true });
    const victimPath = path.join(
      tmpDir,
      "..",
      `trellis-victim-${path.basename(tmpDir)}`,
    );
    const unknownPath = path.join(tmpDir, ".trellis", "unknown-user.txt");
    fs.writeFileSync(victimPath, "outside\n");
    fs.writeFileSync(unknownPath, "inside\n");

    try {
      const hashes = loadHashes(tmpDir);
      hashes["../" + path.basename(victimPath)] = computeHash("outside\n");
      hashes[".trellis/unknown-user.txt"] = computeHash("inside\n");
      saveHashes(tmpDir, hashes);

      await uninstall({ yes: true });

      expect(fs.readFileSync(victimPath, "utf-8")).toBe("outside\n");
      expect(fs.readFileSync(unknownPath, "utf-8")).toBe("inside\n");
      expect(loadHashes(tmpDir)).not.toHaveProperty(
        "../" + path.basename(victimPath),
      );
      expect(loadHashes(tmpDir)).not.toHaveProperty(
        ".trellis/unknown-user.txt",
      );
    } finally {
      fs.rmSync(victimPath, { force: true });
    }
  });

  it("#12 revalidates planned files after confirmation", async () => {
    await init({ yes: true, claude: true, codex: true, force: true });
    const hashesBefore = loadHashes(tmpDir);
    const opaquePath = Object.keys(hashesBefore).find(
      (filePath) =>
        filePath.startsWith(".codex/") &&
        ![".codex/hooks.json", ".codex/config.toml"].includes(filePath),
    );
    if (!opaquePath) {
      throw new Error("Test fixture: expected a tracked opaque Codex file");
    }

    const opaqueAbs = path.join(tmpDir, ...opaquePath.split("/"));
    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    vi.mocked(inquirer.prompt).mockImplementationOnce(async () => {
      fs.writeFileSync(opaqueAbs, "edited while confirming\n");
      fs.writeFileSync(settingsPath, '{"model":"edited while confirming"}\n');
      return { proceed: true };
    });

    await uninstall({});

    expect(fs.readFileSync(opaqueAbs, "utf-8")).toBe(
      "edited while confirming\n",
    );
    expect(fs.readFileSync(settingsPath, "utf-8")).toBe(
      '{"model":"edited while confirming"}\n',
    );
    expect(loadHashes(tmpDir)).not.toHaveProperty(opaquePath);
    expect(loadHashes(tmpDir)).not.toHaveProperty(".claude/settings.json");
  });

  it("#12b files removed after planning are treated as missing", async () => {
    await init({ yes: true, codex: true, force: true });
    const hashesBefore = loadHashes(tmpDir);
    const opaquePath = Object.keys(hashesBefore).find(
      (filePath) =>
        filePath.startsWith(".codex/") &&
        ![".codex/hooks.json", ".codex/config.toml"].includes(filePath),
    );
    if (!opaquePath) {
      throw new Error("Test fixture: expected a tracked opaque Codex file");
    }

    const opaqueAbs = path.join(tmpDir, ...opaquePath.split("/"));
    vi.mocked(inquirer.prompt).mockImplementationOnce(async () => {
      fs.unlinkSync(opaqueAbs);
      return { proceed: true };
    });

    await uninstall({});

    expect(fs.existsSync(opaqueAbs)).toBe(false);
    expect(loadHashes(tmpDir)).not.toHaveProperty(opaquePath);
  });

  it("#13 failed delete and scrub operations retain ownership for retry", async () => {
    await init({ yes: true, claude: true, codex: true, force: true });
    const hashesBefore = loadHashes(tmpDir);
    const opaquePath = Object.keys(hashesBefore).find(
      (filePath) =>
        filePath.startsWith(".codex/") &&
        ![".codex/hooks.json", ".codex/config.toml"].includes(filePath),
    );
    if (!opaquePath) {
      throw new Error("Test fixture: expected a tracked opaque Codex file");
    }

    const opaqueAbs = path.join(tmpDir, ...opaquePath.split("/"));
    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    const settingsContent =
      JSON.stringify(
        {
          hooks: {
            SessionStart: [
              {
                matcher: "startup",
                hooks: [
                  {
                    type: "command",
                    command: "python3 .claude/hooks/session-start.py",
                  },
                ],
              },
            ],
          },
          model: "keep-me",
        },
        null,
        2,
      ) + "\n";
    fs.writeFileSync(settingsPath, settingsContent);

    const realUnlinkSync = fs.unlinkSync.bind(fs);
    vi.spyOn(fs, "unlinkSync").mockImplementation((filePath) => {
      if (String(filePath) === opaqueAbs) throw new Error("delete failed");
      realUnlinkSync(filePath);
    });
    const realRenameSync = fs.renameSync.bind(fs);
    vi.spyOn(fs, "renameSync").mockImplementation((oldPath, newPath) => {
      if (String(newPath) === settingsPath) throw new Error("write failed");
      realRenameSync(oldPath, newPath);
    });

    await uninstall({ yes: true });

    expect(fs.existsSync(opaqueAbs)).toBe(true);
    expect(fs.readFileSync(settingsPath, "utf-8")).toBe(settingsContent);
    expect(loadHashes(tmpDir)).toHaveProperty(
      opaquePath,
      hashesBefore[opaquePath],
    );
    expect(loadHashes(tmpDir)).toHaveProperty(
      ".claude/settings.json",
      hashesBefore[".claude/settings.json"],
    );
  });

  it("removes confirmed-empty legacy roots without crossing unmanaged parents", async () => {
    fs.mkdirSync(path.join(tmpDir, ".trellis"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".iflow"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".zcode", "cli", "agents"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tmpDir, ".github", "copilot"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tmpDir, ".windsurf", "workflows"), {
      recursive: true,
    });
    const userFile = path.join(tmpDir, ".windsurf", "workflows", "user.md");
    fs.writeFileSync(userFile, "user workflow\n");
    saveHashes(tmpDir, {
      ".cursor/commands/trellis-continue.md": "missing-retired-path",
    });
    const readdirSpy = vi.spyOn(fs, "readdirSync");

    await uninstall({ yes: true });

    expect(readdirSpy).not.toHaveBeenCalledWith(path.join(tmpDir, ".github"));
    expect(fs.existsSync(path.join(tmpDir, ".iflow"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".zcode"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".github", "copilot"))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, ".github"))).toBe(true);
    expect(fs.readdirSync(path.join(tmpDir, ".github"))).toEqual([]);
    expect(fs.readFileSync(userFile, "utf-8")).toBe("user workflow\n");
  });

  it("scrubs mixed legacy .trae/settings.json through the retired flat fallback", async () => {
    fs.mkdirSync(path.join(tmpDir, ".trellis"), { recursive: true });
    const settingsPath = path.join(tmpDir, ".trae", "settings.json");
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      JSON.stringify(
        {
          theme: "dark",
          hooks: {
            SessionStart: [
              { command: "python3 .trellis/hooks/session-start.py" },
              { command: "node tools/user-session-start.mjs" },
            ],
          },
        },
        null,
        2,
      ) + "\n",
    );
    saveHashes(tmpDir, { ".trae/settings.json": "legacy-structured" });

    await uninstall({ yes: true });

    expect(JSON.parse(fs.readFileSync(settingsPath, "utf-8"))).toEqual({
      theme: "dark",
      hooks: {
        SessionStart: [{ command: "node tools/user-session-start.mjs" }],
      },
    });
    expect(loadHashes(tmpDir)).toEqual({});
  });

  it("cleans the frozen 0.6.7 retired-host fixture without claiming user files", async () => {
    const fixtureProject = path.resolve(
      import.meta.dirname,
      "../fixtures/legacy-0.6.7-multi-host/project",
    );
    fs.cpSync(fixtureProject, tmpDir, { recursive: true });

    const userOwned = [
      ".cursor/rules/user-owned.mdc",
      ".codex/sessions/keep.jsonl",
      ".opencode/plugins/custom-user-plugin.ts",
    ];
    const userBytes = new Map(
      userOwned.map((relativePath) => [
        relativePath,
        fs.readFileSync(path.join(tmpDir, ...relativePath.split("/"))),
      ]),
    );

    await uninstall({ yes: true });

    for (const [relativePath, bytes] of userBytes) {
      const fullPath = path.join(tmpDir, ...relativePath.split("/"));
      expect(fs.readFileSync(fullPath)).toEqual(bytes);
    }
    expect(fs.existsSync(path.join(tmpDir, ".trae", "settings.json"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(tmpDir, ".zcode", "config.json"))).toBe(
      false,
    );
    expect(
      fs.existsSync(
        path.join(tmpDir, ".zcode", "cli", "agents", "trellis-check.md"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(
          tmpDir,
          ".agents",
          "skills",
          "trellis-check",
          "SKILL.md",
        ),
      ),
    ).toBe(false);

    const cursor = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".cursor", "hooks.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(cursor.hooks).toBeUndefined();
    expect(cursor.userHook).toBe("node tools/custom-cursor-hook.mjs");

    expect(fs.readFileSync(path.join(tmpDir, "AGENTS.md"), "utf-8")).toBe(
      "# Local project instructions\n\nKeep this user-authored introduction.\n",
    );
    expect(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    ).toContain('"userTheme": "dark"');
    expect(
      fs.readFileSync(path.join(tmpDir, ".codex", "config.toml"), "utf-8"),
    ).toContain('model = "gpt-5"');
    expect(loadHashes(tmpDir)).toEqual({});
  });

  it("#14 repeated uninstall is a friendly no-op when only research and empty ownership remain", async () => {
    await init({ yes: true, claude: true, force: true });
    const ledgerPath = path.join(
      tmpDir,
      ".trellis",
      "research",
      "events.jsonl",
    );
    fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
    fs.writeFileSync(ledgerPath, '{"schemaVersion":1}\n');

    await uninstall({ yes: true });
    const first = fs.readFileSync(ledgerPath);
    await uninstall({ yes: true });

    expect(fs.readFileSync(ledgerPath)).toEqual(first);
    expect(loadHashes(tmpDir)).toEqual({});
  });
});

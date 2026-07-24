import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CLI_PACKAGE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const BIN_ENTRY = path.join(CLI_PACKAGE_DIR, "bin", "trellis.js");
const BUILT_ENTRY = path.join(CLI_PACKAGE_DIR, "dist", "cli", "index.js");
const originalArgv = [...process.argv];

type CommanderExit = (exitCode: number, code: string, message: string) => never;

interface CliRun {
  commanderCode: string | undefined;
  stderr: string;
  stdout: string;
}

function snapshotTree(root: string): Map<string, string> {
  const snapshot = new Map<string, string>();

  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");

      if (entry.isDirectory()) {
        snapshot.set(`${relative}/`, "directory");
        visit(absolute);
      } else if (entry.isSymbolicLink()) {
        snapshot.set(relative, `symlink:${fs.readlinkSync(absolute)}`);
      } else {
        snapshot.set(relative, fs.readFileSync(absolute, "utf8"));
      }
    }
  };

  visit(root);
  return snapshot;
}

function commandNames(help: string): string[] {
  const commandsIndex = help
    .split("\n")
    .findIndex((line) => line === "Commands:");
  if (commandsIndex === -1) return [];

  return help
    .split("\n")
    .slice(commandsIndex + 1)
    .map((line) => /^ {2}([a-z][a-z0-9-]*)\b/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined && name !== "help");
}

describe("Research-only CLI surface", () => {
  let commanderExitSpy: ReturnType<typeof vi.spyOn>;
  let stderr = "";
  let stdout = "";
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-cli-surface-"));
    fs.writeFileSync(path.join(tmpDir, "sentinel.txt"), "unchanged\n");

    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(process.stdout, "write").mockImplementation(((chunk: unknown) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write);
    vi.spyOn(process.stderr, "write").mockImplementation(((chunk: unknown) => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write);
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as typeof process.exit);

    commanderExitSpy = vi.spyOn(
      Command.prototype as unknown as { _exit: CommanderExit },
      "_exit",
    );
  });

  afterEach(() => {
    process.argv = [...originalArgv];
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    stderr = "";
    stdout = "";
  });

  async function runCli(args: string[]): Promise<CliRun> {
    process.argv = [process.execPath, "trellis", ...args];
    commanderExitSpy.mockClear();
    stderr = "";
    stdout = "";
    vi.resetModules();

    await expect(import("../../src/cli/index.js")).rejects.toThrow(
      /^process\.exit:[01]$/,
    );

    const exitCall = commanderExitSpy.mock.calls.at(-1);
    return {
      commanderCode: exitCall?.[1] as string | undefined,
      stderr,
      stdout,
    };
  }

  it("exposes exactly the five Research product commands at the root", async () => {
    const result = await runCli(["--help"]);

    expect(result.commanderCode).toBe("commander.helpDisplayed");
    expect(commandNames(result.stdout)).toEqual([
      "init",
      "update",
      "upgrade",
      "uninstall",
      "research",
    ]);
  });

  it("exposes exactly the eleven supported Research command groups", async () => {
    const result = await runCli(["research", "--help"]);

    expect(result.commanderCode).toBe("commander.helpDisplayed");
    expect(commandNames(result.stdout)).toEqual([
      "init",
      "status",
      "validate",
      "rebuild",
      "repo",
      "quest",
      "campaign",
      "run",
      "evidence",
      "claim",
      "dispatch",
    ]);
  });

  it("keeps the exact nine Dispatch children", async () => {
    const result = await runCli(["research", "dispatch", "--help"]);

    expect(result.commanderCode).toBe("commander.helpDisplayed");
    expect(commandNames(result.stdout)).toEqual([
      "context",
      "prepare",
      "plan-activation",
      "authorize",
      "approve",
      "revoke",
      "record-result",
      "apply",
      "reject",
    ]);
  });

  it.each([
    ["channel", ["channel"]],
    ["mem", ["mem"]],
    ["workflow", ["workflow"]],
    ["research task", ["research", "task"]],
    ["research task link", ["research", "task", "link"]],
    ["research task unlink", ["research", "task", "unlink"]],
  ])(
    "rejects removed command %s before actions or writes",
    async (_name, args) => {
      const before = snapshotTree(tmpDir);
      const result = await runCli(args);

      expect(result.commanderCode).toBe("commander.unknownCommand");
      expect(snapshotTree(tmpDir)).toEqual(before);
    },
  );

  it.each([
    ["--user", "researcher"],
    ["--monorepo"],
    ["--no-monorepo"],
    ["--template", "electron-fullstack"],
    ["--registry", "gh:example/templates"],
    ["--overwrite"],
    ["--append"],
  ])(
    "rejects removed init option %s before actions or writes",
    async (...option) => {
      const before = snapshotTree(tmpDir);
      const result = await runCli(["init", ...option]);

      expect(result.commanderCode).toBe("commander.unknownOption");
      expect(result.stderr).toContain(`unknown option '${option[0]}'`);
      expect(snapshotTree(tmpDir)).toEqual(before);
    },
  );

  it.each([
    ["--claude"],
    ["--codex"],
    ["--with-statusline"],
    ["--yes"],
    ["--force"],
    ["--skip-existing"],
  ])(
    "keeps retained init option %s parseable without running init",
    async (flag) => {
      const before = snapshotTree(tmpDir);
      const result = await runCli(["init", flag, "--help"]);

      expect(result.commanderCode).toBe("commander.helpDisplayed");
      expect(result.stdout).toContain(flag);
      expect(snapshotTree(tmpDir)).toEqual(before);
    },
  );

  it("maps trellis and tl to the same built parser with identical help", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(CLI_PACKAGE_DIR, "package.json"), "utf8"),
    ) as { bin: Record<string, string> };

    expect(packageJson.bin.trellis).toBe(packageJson.bin.tl);
    expect(path.resolve(CLI_PACKAGE_DIR, packageJson.bin.trellis)).toBe(
      BIN_ENTRY,
    );

    if (!fs.existsSync(BUILT_ENTRY)) return;

    const runAlias = (alias: "trellis" | "tl") =>
      spawnSync(process.execPath, [BIN_ENTRY, "--help"], {
        argv0: alias,
        cwd: tmpDir,
        encoding: "utf8",
      });

    const trellis = runAlias("trellis");
    const tl = runAlias("tl");

    expect({
      status: trellis.status,
      stderr: trellis.stderr,
      stdout: trellis.stdout,
    }).toEqual({ status: tl.status, stderr: tl.stderr, stdout: tl.stdout });
    expect(trellis.status).toBe(0);
  });
});

/**
 * Integration tests for legacy uncommitted-data diagnostics and uninstall.
 *
 * `trellis uninstall` no longer recursively removes `.trellis`, so user-authored
 * specs, task PRDs, journals, and other unowned data survive regardless of git
 * status or the legacy dirty-uninstall override.
 *
 * Uses real git + real python (no child_process mock) because the diagnostic
 * shells out to `git status` and init shells out to `python3 --version`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
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

import { init } from "../../src/commands/init.js";
import {
  uninstall,
  collectUncommittedTrellisData,
} from "../../src/commands/uninstall.js";

function has(cmd: string, args: string[]): boolean {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const canRun = has("git", ["--version"]) && has("python3", ["--version"]);

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
}

describe.skipIf(!canRun)("uninstall uncommitted-data guard", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "trellis-dirty-")),
    );
    git(tmpDir, "init", "-q", "-b", "main");
    git(tmpDir, "config", "user.email", "t@example.com");
    git(tmpDir, "config", "user.name", "Test");
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "warn").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    vi.mocked(inquirer.prompt).mockResolvedValue({ proceed: true });
    Object.defineProperty(process.stdin, "isTTY", {
      configurable: true,
      value: true,
    });
    delete process.env.TRELLIS_ALLOW_DIRTY_UNINSTALL;
    await init({ yes: true, claude: true, force: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.TRELLIS_ALLOW_DIRTY_UNINSTALL;
  });

  it("detects newly added spec data once the managed tree is committed", () => {
    // Current Research init does not create generic spec scaffolding, so git may
    // report the newly untracked spec directory rather than its nested file.
    git(tmpDir, "add", "-A");
    git(tmpDir, "commit", "-q", "-m", "trellis");

    const specFile = path.join(tmpDir, ".trellis", "spec", "my-rules.md");
    fs.mkdirSync(path.dirname(specFile), { recursive: true });
    fs.writeFileSync(specFile, "my custom spec");

    const dirty = collectUncommittedTrellisData(tmpDir);
    expect(dirty.some((p) => p.includes(".trellis/spec"))).toBe(true);
  });

  it("reports nothing once the .trellis tree is committed", () => {
    git(tmpDir, "add", "-A");
    git(tmpDir, "commit", "-q", "-m", "trellis");
    expect(collectUncommittedTrellisData(tmpDir)).toEqual([]);
  });

  it("preserves uncommitted user data without requiring an override", async () => {
    const specFile = path.join(tmpDir, ".trellis", "spec", "my-rules.md");
    fs.mkdirSync(path.dirname(specFile), { recursive: true });
    fs.writeFileSync(specFile, "unsaved work");

    await uninstall({ yes: true });

    expect(fs.readFileSync(specFile, "utf-8")).toBe("unsaved work");
    expect(fs.existsSync(path.join(tmpDir, ".trellis"))).toBe(true);
  });

  it("legacy dirty-uninstall override does not enable recursive deletion", async () => {
    const specFile = path.join(tmpDir, ".trellis", "spec", "my-rules.md");
    fs.mkdirSync(path.dirname(specFile), { recursive: true });
    fs.writeFileSync(specFile, "unsaved work");
    process.env.TRELLIS_ALLOW_DIRTY_UNINSTALL = "1";

    await uninstall({ yes: true });

    expect(fs.readFileSync(specFile, "utf-8")).toBe("unsaved work");
  });

  it("committed user data also survives --yes uninstall", async () => {
    const specFile = path.join(tmpDir, ".trellis", "spec", "committed.md");
    fs.mkdirSync(path.dirname(specFile), { recursive: true });
    fs.writeFileSync(specFile, "committed user data");
    git(tmpDir, "add", "-A");
    git(tmpDir, "commit", "-q", "-m", "trellis");

    await uninstall({ yes: true });

    expect(fs.readFileSync(specFile, "utf-8")).toBe("committed user data");
  });
});

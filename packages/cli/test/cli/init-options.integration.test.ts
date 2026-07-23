import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalArgv = [...process.argv];

async function importCli(args: string[]): Promise<void> {
  process.argv = [process.execPath, "trellis", ...args];
  vi.resetModules();
  await import("../../src/cli/index.js");
}

describe("trellis init parser contract", () => {
  let tmpDir: string;
  let stdout = "";
  let stderr = "";

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-init-options-"));
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
  });

  afterEach(() => {
    process.argv = [...originalArgv];
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    stdout = "";
    stderr = "";
  });

  it("omits workflow-selection flags from init help", async () => {
    await expect(importCli(["init", "--help"])).rejects.toThrow(
      "process.exit:0",
    );

    expect(stdout).not.toContain("--workflow <id>");
    expect(stdout).not.toContain("--workflow-source <source>");
  });

  it.each([
    ["--workflow", "native"],
    ["--workflow-source", "gh:example/workflows"],
  ])("rejects removed %s before any filesystem write", async (flag, value) => {
    await expect(importCli(["init", flag, value])).rejects.toThrow(
      "process.exit:1",
    );

    expect(stderr).toContain(`unknown option '${flag}'`);
    expect(fs.readdirSync(tmpDir)).toEqual([]);
  });
});

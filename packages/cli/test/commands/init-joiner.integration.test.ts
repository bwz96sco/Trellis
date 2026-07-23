import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

import { init } from "../../src/commands/init.js";
import { PATHS } from "../../src/constants/paths.js";
import {
  loadWorkflowSelection,
  saveBundledWorkflowSelection,
} from "../../src/utils/workflow-selection.js";
import { computeHash, loadHashes } from "../../src/utils/template-hash.js";

const noop = (): void => undefined;

describe("Research-only init developer boundary", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-joiner-int-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "warn").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("full Research init creates no developer, workspace, Task, or spec state", async () => {
    await init({ yes: true, force: true });

    for (const relativePath of [
      PATHS.DEVELOPER_FILE,
      PATHS.CURRENT_TASK_FILE,
      PATHS.WORKSPACE,
      PATHS.TASKS,
      PATHS.SPEC,
    ]) {
      expect(fs.existsSync(path.join(tmpDir, relativePath)), relativePath).toBe(
        false,
      );
    }
  });

  it("host-addition re-init preserves workflow bytes, hash, selection, and legacy state", async () => {
    await init({ yes: true, claude: true });
    const workflowPath = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    const workflowBytes = fs.readFileSync(workflowPath, "utf-8");
    const workflowHash = computeHash(workflowBytes);
    saveBundledWorkflowSelection(tmpDir, "research");

    const legacyTask = path.join(tmpDir, PATHS.TASKS, "legacy", "prd.md");
    fs.mkdirSync(path.dirname(legacyTask), { recursive: true });
    fs.writeFileSync(legacyTask, "legacy task bytes\n", "utf-8");
    const developerPath = path.join(tmpDir, PATHS.DEVELOPER_FILE);
    fs.writeFileSync(developerPath, "legacy-developer\n", "utf-8");

    await init({ yes: true, codex: true });

    expect(fs.existsSync(path.join(tmpDir, ".codex"))).toBe(true);
    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(workflowBytes);
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(workflowHash);
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "research",
    });
    expect(fs.readFileSync(legacyTask, "utf-8")).toBe("legacy task bytes\n");
    expect(fs.readFileSync(developerPath, "utf-8")).toBe(
      "legacy-developer\n",
    );
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import inquirer from "inquirer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("figlet", () => ({
  default: { textSync: vi.fn(() => "TRELLIS") },
}));
vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}));
vi.mock("node:child_process", () => ({
  execSync: vi.fn().mockImplementation((command: string) => {
    const python = process.platform === "win32" ? "python" : "python3";
    return command === `${python} --version` ? "Python 3.11.12" : "";
  }),
}));

import { init } from "../../src/commands/init.js";
import { update } from "../../src/commands/update.js";
import { replacePythonCommandLiterals } from "../../src/configurators/shared.js";
import { PATHS } from "../../src/constants/paths.js";
import { VERSION } from "../../src/constants/version.js";
import { researchWorkflowMdTemplate } from "../../src/templates/trellis/index.js";
import {
  computeHash,
  loadHashes,
  saveHashes,
} from "../../src/utils/template-hash.js";
import {
  clearWorkflowSelection,
  loadWorkflowSelection,
  saveBundledWorkflowSelection,
} from "../../src/utils/workflow-selection.js";

const noop = (): void => undefined;
const research = replacePythonCommandLiterals(researchWorkflowMdTemplate);
const native = fs.readFileSync(
  path.join(import.meta.dirname, "../fixtures/workflows/native-v0.6.7.md"),
  "utf-8",
);

function snapshotWorkflowState(root: string): Record<string, string | undefined> {
  const read = (relativePath: string): string | undefined => {
    const target = path.join(root, relativePath);
    return fs.existsSync(target) ? fs.readFileSync(target, "utf-8") : undefined;
  };
  return {
    workflow: read(PATHS.WORKFLOW_GUIDE_FILE),
    selection: read(PATHS.WORKFLOW_SELECTION_FILE),
    hashes: read(".trellis/.template-hashes.json"),
    version: read(".trellis/.version"),
  };
}

describe("native-to-Research workflow update migration", () => {
  let tmpDir: string;
  let workflowPath: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-workflow-migrate-"));
    workflowPath = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    vi.spyOn(console, "warn").mockImplementation(noop);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: VERSION }),
      }),
    );
    await init({ yes: true, force: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function stageWorkflow(input: {
    bytes: string;
    selection: "native" | "research" | "missing" | "invalid";
    storedBytes?: string;
    version?: string;
  }): void {
    fs.writeFileSync(workflowPath, input.bytes, "utf-8");
    const hashes = loadHashes(tmpDir);
    if (input.storedBytes === undefined) {
      Reflect.deleteProperty(hashes, PATHS.WORKFLOW_GUIDE_FILE);
      saveHashes(tmpDir, hashes);
    } else {
      hashes[PATHS.WORKFLOW_GUIDE_FILE] = computeHash(input.storedBytes);
      saveHashes(tmpDir, hashes);
    }
    if (input.selection === "missing") clearWorkflowSelection(tmpDir);
    else if (input.selection === "invalid") {
      fs.writeFileSync(
        path.join(tmpDir, PATHS.WORKFLOW_SELECTION_FILE),
        "{\"schemaVersion\":1,\"id\":\"unknown\",\"source\":\"bundled\"}\n",
        "utf-8",
      );
    } else saveBundledWorkflowSelection(tmpDir, input.selection);
    fs.writeFileSync(
      path.join(tmpDir, ".trellis/.version"),
      input.version ?? "0.6.7",
      "utf-8",
    );
  }

  function expectResearchOwnership(): void {
    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(research);
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(research),
    );
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "research",
    });
  }

  it("migrates exact native bytes with valid native selection", async () => {
    stageWorkflow({ bytes: native, selection: "native" });

    await update({ force: true });

    expectResearchOwnership();
  });

  it("migrates hash-verified older native bytes with valid native selection", async () => {
    const stale = "# Older native workflow\n";
    stageWorkflow({ bytes: stale, storedBytes: stale, selection: "native" });

    await update({ force: true });

    expectResearchOwnership();
  });

  it("migrates hash-only missing-selection state only before workflow switching", async () => {
    const stale = "# Pre-switch managed native workflow\n";
    stageWorkflow({
      bytes: stale,
      storedBytes: stale,
      selection: "missing",
      version: "0.6.0-beta.16",
    });

    await update({ force: true });

    expectResearchOwnership();
  });

  it("preserves ambiguous hash-only state at or after workflow switching", async () => {
    const ambiguous = "# Could be any selected workflow\n";
    stageWorkflow({
      bytes: ambiguous,
      storedBytes: ambiguous,
      selection: "missing",
      version: "0.6.0-beta.17",
    });
    const before = snapshotWorkflowState(tmpDir);

    await update({ force: true });

    expect(snapshotWorkflowState(tmpDir)).toMatchObject({
      workflow: before.workflow,
      selection: before.selection,
    });
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(ambiguous),
    );
  });

  it("advances version when an exact-native missing-selection migration is skipped", async () => {
    stageWorkflow({
      bytes: native,
      selection: "missing",
      version: "0.6.0-beta.16",
    });

    await update({ skipAll: true });

    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(native);
    expect(loadWorkflowSelection(tmpDir)).toEqual({ kind: "missing" });
    expect(fs.readFileSync(path.join(tmpDir, ".trellis/.version"), "utf-8")).toBe(
      VERSION,
    );
  });

  it("repairs Research ownership without rewriting active Research bytes", async () => {
    stageWorkflow({ bytes: research, selection: "native" });
    const writeSpy = vi.spyOn(fs, "writeFileSync");

    await update({ force: true });

    expectResearchOwnership();
    expect(
      writeSpy.mock.calls.some(([target]) => path.resolve(String(target)) === path.resolve(workflowPath)),
    ).toBe(false);
  });

  it("dry-run leaves native bytes, hash, selection, version, and backups untouched", async () => {
    stageWorkflow({ bytes: native, storedBytes: native, selection: "native" });
    const before = snapshotWorkflowState(tmpDir);

    await update({ dryRun: true });

    expect(snapshotWorkflowState(tmpDir)).toEqual(before);
    expect(
      fs.readdirSync(path.join(tmpDir, ".trellis")).filter((entry) => entry.startsWith(".backup-")),
    ).toEqual([]);
  });

  it("cancellation leaves workflow state and backups untouched", async () => {
    stageWorkflow({ bytes: native, storedBytes: native, selection: "native" });
    const before = snapshotWorkflowState(tmpDir);
    vi.mocked(inquirer.prompt).mockResolvedValueOnce({ proceed: false });

    await update({});

    expect(snapshotWorkflowState(tmpDir)).toEqual(before);
    expect(
      fs.readdirSync(path.join(tmpDir, ".trellis")).filter((entry) => entry.startsWith(".backup-")),
    ).toEqual([]);
  });

  it("does not mutate workflow state when backup creation fails", async () => {
    stageWorkflow({ bytes: native, storedBytes: native, selection: "native" });
    const before = snapshotWorkflowState(tmpDir);
    vi.spyOn(fs, "copyFileSync").mockImplementation(() => {
      throw new Error("simulated backup failure");
    });

    await expect(update({ force: true })).rejects.toThrow(
      "simulated backup failure",
    );

    expect(snapshotWorkflowState(tmpDir)).toEqual(before);
  });

  it("does not transfer workflow ownership when the atomic write fails", async () => {
    stageWorkflow({ bytes: native, storedBytes: native, selection: "native" });
    const before = snapshotWorkflowState(tmpDir);
    const beforeWorkflowHash =
      loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE];
    const originalRename = fs.renameSync.bind(fs);
    vi.spyOn(fs, "renameSync").mockImplementation((source, target) => {
      if (path.resolve(String(target)) === path.resolve(workflowPath)) {
        throw new Error("simulated workflow write failure");
      }
      return originalRename(source, target);
    });

    await expect(update({ force: true })).rejects.toThrow(
      "simulated workflow write failure",
    );

    expect(snapshotWorkflowState(tmpDir)).toMatchObject({
      workflow: before.workflow,
      selection: before.selection,
      version: before.version,
    });
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      beforeWorkflowHash,
    );
  });

  it("restores the prior hash when selection persistence fails", async () => {
    stageWorkflow({ bytes: native, storedBytes: native, selection: "native" });
    const selectionPath = path.join(tmpDir, PATHS.WORKFLOW_SELECTION_FILE);
    const originalRename = fs.renameSync.bind(fs);
    vi.spyOn(fs, "renameSync").mockImplementation((source, target) => {
      if (path.resolve(String(target)) === path.resolve(selectionPath)) {
        throw new Error("simulated selection write failure");
      }
      return originalRename(source, target);
    });

    await expect(update({ force: true })).rejects.toThrow(
      "simulated selection write failure",
    );

    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(research);
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "native",
    });
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(native),
    );
  });

  it.each(["skipAll", "createNew"] as const)(
    "%s preserves modified active bytes and ownership metadata",
    async (mode) => {
      const managed = "# Installed native workflow\n";
      const modified = "# Locally modified native workflow\n";
      stageWorkflow({ bytes: modified, storedBytes: managed, selection: "native" });
      const before = snapshotWorkflowState(tmpDir);

      await update({ [mode]: true });

      expect(snapshotWorkflowState(tmpDir)).toMatchObject({
        workflow: before.workflow,
        selection: before.selection,
      });
      expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
        computeHash(managed),
      );
      if (mode === "createNew") {
        expect(fs.readFileSync(`${workflowPath}.new`, "utf-8")).toBe(research);
      }
    },
  );

  it("preserves invalid selection metadata even when bytes look native", async () => {
    stageWorkflow({ bytes: native, storedBytes: native, selection: "invalid" });
    const before = snapshotWorkflowState(tmpDir);

    await update({ force: true });

    expect(snapshotWorkflowState(tmpDir)).toMatchObject({
      workflow: before.workflow,
      selection: before.selection,
    });
  });

  it("does not overwrite bytes changed after planning", async () => {
    stageWorkflow({ bytes: native, storedBytes: native, selection: "native" });
    const concurrent = "# Concurrent workflow edit\n";
    const originalRead = fs.readFileSync.bind(fs);
    let workflowReads = 0;
    vi.spyOn(fs, "readFileSync").mockImplementation(((target: fs.PathOrFileDescriptor, options?: unknown) => {
      if (typeof target === "string" && path.resolve(target) === path.resolve(workflowPath)) {
        workflowReads++;
        if (workflowReads === 3) {
          fs.writeFileSync(workflowPath, concurrent, "utf-8");
        }
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);

    await update({ force: true });

    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(concurrent);
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "native",
    });
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(native),
    );
  });

  it("is idempotent after successful migration without backup churn", async () => {
    stageWorkflow({ bytes: native, storedBytes: native, selection: "native" });
    await update({ force: true });
    const backupsAfterMigration = fs
      .readdirSync(path.join(tmpDir, ".trellis"))
      .filter((entry) => entry.startsWith(".backup-"));
    const afterMigration = snapshotWorkflowState(tmpDir);

    await update({ force: true });

    expect(snapshotWorkflowState(tmpDir)).toEqual(afterMigration);
    expect(
      fs.readdirSync(path.join(tmpDir, ".trellis")).filter((entry) => entry.startsWith(".backup-")),
    ).toEqual(backupsAfterMigration);
  });
});

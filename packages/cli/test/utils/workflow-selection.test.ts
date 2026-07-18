import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { PATHS } from "../../src/constants/paths.js";
import {
  clearWorkflowSelection,
  loadWorkflowSelection,
  saveBundledWorkflowSelection,
} from "../../src/utils/workflow-selection.js";

describe("workflow selection metadata", () => {
  let tmpDir: string;
  let selectionPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "trellis-workflow-selection-"),
    );
    selectionPath = path.join(tmpDir, PATHS.WORKFLOW_SELECTION_FILE);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("distinguishes missing metadata", () => {
    expect(loadWorkflowSelection(tmpDir)).toEqual({ kind: "missing" });
  });

  it("atomically saves and loads a bundled research selection", () => {
    saveBundledWorkflowSelection(tmpDir, "research");

    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "research",
    });
    expect(fs.readFileSync(selectionPath, "utf-8")).toBe(
      '{\n  "schemaVersion": 1,\n  "id": "research",\n  "source": "bundled"\n}\n',
    );
    expect(
      fs.existsSync(
        path.join(
          path.dirname(selectionPath),
          `.${path.basename(selectionPath)}.${process.pid}.tmp`,
        ),
      ),
    ).toBe(false);
  });

  it.each([
    ["malformed JSON", "not json"],
    [
      "extra fields",
      JSON.stringify({
        schemaVersion: 1,
        id: "native",
        source: "bundled",
        extra: true,
      }),
    ],
    [
      "wrong schema version",
      JSON.stringify({ schemaVersion: 2, id: "native", source: "bundled" }),
    ],
    [
      "wrong source",
      JSON.stringify({
        schemaVersion: 1,
        id: "native",
        source: "marketplace",
      }),
    ],
    [
      "unknown bundled id",
      JSON.stringify({ schemaVersion: 1, id: "missing", source: "bundled" }),
    ],
  ])("rejects %s without silently selecting native", (_label, content) => {
    fs.mkdirSync(path.dirname(selectionPath), { recursive: true });
    fs.writeFileSync(selectionPath, content, "utf-8");

    const result = loadWorkflowSelection(tmpDir);
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });

  it("clears only the bundled selection file", () => {
    saveBundledWorkflowSelection(tmpDir, "native");
    const sibling = path.join(tmpDir, ".trellis", "keep.txt");
    fs.writeFileSync(sibling, "keep", "utf-8");

    clearWorkflowSelection(tmpDir);
    clearWorkflowSelection(tmpDir);

    expect(fs.existsSync(selectionPath)).toBe(false);
    expect(fs.readFileSync(sibling, "utf-8")).toBe("keep");
  });
});

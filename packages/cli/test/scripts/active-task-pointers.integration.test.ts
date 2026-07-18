import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const TEMPLATE_SCRIPTS = path.resolve(
  __dirname,
  "../../src/templates/trellis/scripts",
);

function hasPython(): boolean {
  try {
    execFileSync("python3", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function runPython(root: string, contextId: string, body: string): string {
  return execFileSync("python3", ["-c", body, root], {
    encoding: "utf-8",
    env: {
      ...process.env,
      PYTHONPATH: TEMPLATE_SCRIPTS,
      TRELLIS_CONTEXT_ID: contextId,
    },
  });
}

function sessionPath(root: string, contextId: string): string {
  return path.join(
    root,
    ".trellis",
    ".runtime",
    "sessions",
    `${contextId}.json`,
  );
}

describe.skipIf(!hasPython())("active_task session pointers", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-active-pointers-"));
    fs.mkdirSync(path.join(root, ".trellis"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("sets, resolves, and conditionally clears current_run while preserving other state", () => {
    const file = sessionPath(root, "pointer-a");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      `${JSON.stringify(
        {
          current_task: ".trellis/tasks/07-17-task",
          platform: "claude",
          future: { enabled: false },
        },
        null,
        2,
      )}\n`,
      "utf-8",
    );

    const output = runPython(
      root,
      "pointer-a",
      [
        "import json, sys",
        "from pathlib import Path",
        "from common.active_task import clear_current_run, resolve_current_run, set_current_run",
        "root = Path(sys.argv[1])",
        'print(json.dumps({"set": set_current_run("run_123", root), "resolved": resolve_current_run(root), "mismatch": clear_current_run(root, "run_other"), "cleared": clear_current_run(root, "run_123")}))',
      ].join("\n"),
    );

    expect(JSON.parse(output)).toEqual({
      set: "run_123",
      resolved: "run_123",
      mismatch: "run_123",
      cleared: "run_123",
    });
    expect(JSON.parse(fs.readFileSync(file, "utf-8"))).toMatchObject({
      current_task: ".trellis/tasks/07-17-task",
      platform: "claude",
      future: { enabled: false },
    });
    expect(JSON.parse(fs.readFileSync(file, "utf-8"))).not.toHaveProperty(
      "current_run",
    );
  });

  it("deletes a session file when clearing its final meaningful pointer", () => {
    const file = sessionPath(root, "pointer-final");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      '{"current_task":null,"current_run":"run_final"}\n',
      "utf-8",
    );

    runPython(
      root,
      "pointer-final",
      [
        "import sys",
        "from pathlib import Path",
        "from common.active_task import clear_current_run",
        "root = Path(sys.argv[1])",
        "clear_current_run(root)",
      ].join("\n"),
    );

    expect(fs.existsSync(file)).toBe(false);
  });

  it("deletes a legacy task-only session after clearing current_task", () => {
    const file = sessionPath(root, "pointer-task-only");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      '{"current_task":".trellis/tasks/07-17-task","current_run":null}\n',
      "utf-8",
    );

    runPython(
      root,
      "pointer-task-only",
      [
        "import sys",
        "from pathlib import Path",
        "from common.active_task import clear_active_task",
        "root = Path(sys.argv[1])",
        "clear_active_task(root)",
      ].join("\n"),
    );

    expect(fs.existsSync(file)).toBe(false);
  });

  it("preserves malformed session JSON during pointer clearing", () => {
    const file = sessionPath(root, "pointer-malformed");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "{not-json}\n", "utf-8");

    runPython(
      root,
      "pointer-malformed",
      [
        "import sys",
        "from pathlib import Path",
        "from common.active_task import clear_current_run",
        "root = Path(sys.argv[1])",
        'clear_current_run(root, "run_final")',
      ].join("\n"),
    );

    expect(fs.readFileSync(file, "utf-8")).toBe("{not-json}\n");
  });
});

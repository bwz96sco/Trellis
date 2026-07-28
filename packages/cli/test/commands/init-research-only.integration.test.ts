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
import { RESEARCH_PAYLOAD_PATHS } from "../../src/configurators/research-payload.js";
import { replacePythonCommandLiterals } from "../../src/configurators/shared.js";
import { PATHS } from "../../src/constants/paths.js";
import { getResearchWorkerTemplate as getCodexResearchWorkerTemplate } from "../../src/templates/codex/index.js";
import { researchWorkflowMdTemplate } from "../../src/templates/trellis/index.js";
import {
  computeHash,
  loadHashes,
  removeHash,
} from "../../src/utils/template-hash.js";
import {
  clearWorkflowSelection,
  loadWorkflowSelection,
} from "../../src/utils/workflow-selection.js";

const noop = (): void => undefined;

function snapshotFiles(root: string): Map<string, string> {
  const result = new Map<string, string>();
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else {
        result.set(
          path.relative(root, absolute),
          fs.readFileSync(absolute, "utf-8"),
        );
      }
    }
  };
  walk(root);
  return result;
}

const claudePayloadPaths = [
  RESEARCH_PAYLOAD_PATHS.claude.worker,
  ...RESEARCH_PAYLOAD_PATHS.claude.hooks,
  RESEARCH_PAYLOAD_PATHS.claude.config,
].sort();

const codexPayloadPaths = [
  RESEARCH_PAYLOAD_PATHS.codex.worker,
  ...RESEARCH_PAYLOAD_PATHS.codex.hooks,
  ...RESEARCH_PAYLOAD_PATHS.codex.config,
].sort();

describe("Research-only init", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-init-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    vi.spyOn(console, "warn").mockImplementation(noop);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("installs bundled Research bytes and matching ownership without fetching a workflow", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network disabled"));
    vi.stubGlobal("fetch", fetchMock);

    await init({ yes: true });

    const expected = replacePythonCommandLiterals(researchWorkflowMdTemplate);
    const workflowPath = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(expected);
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "research",
    });
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(expected),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the minimal Research bridge layout and keeps canonical Research lazy", async () => {
    await init({ yes: true });

    for (const required of [
      PATHS.WORKFLOW_GUIDE_FILE,
      ".trellis/.workflow.json",
      ".trellis/.template-hashes.json",
      ".trellis/.version",
      ".trellis/.gitignore",
      ".trellis/config.yaml",
      "AGENTS.md",
      ".claude",
    ]) {
      expect(fs.existsSync(path.join(tmpDir, required)), required).toBe(true);
    }

    for (const absent of [
      PATHS.SCRIPTS,
      ".trellis/agents",
      ".trellis/workspace",
      ".trellis/tasks",
      ".trellis/spec",
      ".trellis/.developer",
      ".trellis/research",
    ]) {
      expect(fs.existsSync(path.join(tmpDir, absent)), absent).toBe(false);
    }
  });

  it("merges only the managed AGENTS.md block on force init", async () => {
    const agentsPath = path.join(tmpDir, "AGENTS.md");
    fs.writeFileSync(
      agentsPath,
      [
        "user prefix",
        "<!-- TRELLIS:START -->",
        "legacy managed content",
        "<!-- TRELLIS:END -->",
        "user suffix",
        "",
      ].join("\n"),
    );

    await init({ yes: true, force: true });

    const result = fs.readFileSync(agentsPath, "utf-8");
    expect(result).toContain("user prefix");
    expect(result).toContain("# Trellis Research Instructions");
    expect(result).not.toContain("legacy managed content");
    expect(result).toContain("user suffix");
  });

  it("appends the managed block without replacing user-owned AGENTS.md bytes", async () => {
    const agentsPath = path.join(tmpDir, "AGENTS.md");
    fs.writeFileSync(agentsPath, "user instructions\n", "utf-8");

    await init({ yes: true, force: true });

    const result = fs.readFileSync(agentsPath, "utf-8");
    expect(result).toMatch(/^user instructions\n\n<!-- TRELLIS:START -->/);
    expect(result).toContain("# Trellis Research Instructions");
  });

  it("preserves malformed AGENTS.md markers byte-for-byte", async () => {
    const agentsPath = path.join(tmpDir, "AGENTS.md");
    const malformed = "user instructions\n<!-- TRELLIS:START -->\n";
    fs.writeFileSync(agentsPath, malformed, "utf-8");

    await init({ yes: true, force: true });

    expect(fs.readFileSync(agentsPath, "utf-8")).toBe(malformed);
  });

  it("supports Claude-only, Codex-only, and dual-host installs with one workflow", async () => {
    for (const [name, options, expectedHosts] of [
      ["claude", { yes: true, claude: true }, [true, false]],
      ["codex", { yes: true, codex: true }, [false, true]],
      ["dual", { yes: true, claude: true, codex: true }, [true, true]],
    ] as const) {
      const root = path.join(tmpDir, name);
      fs.mkdirSync(root);
      vi.mocked(process.cwd).mockReturnValue(root);
      await init(options);
      expect(fs.existsSync(path.join(root, ".claude"))).toBe(expectedHosts[0]);
      expect(fs.existsSync(path.join(root, ".codex"))).toBe(expectedHosts[1]);
      const installedHostPaths = [...snapshotFiles(root).keys()]
        .filter(
          (relativePath) =>
            relativePath.startsWith(".claude/") ||
            relativePath.startsWith(".codex/") ||
            relativePath.startsWith(".agents/skills/"),
        )
        .sort();
      expect(installedHostPaths).toEqual(
        [
          ...(expectedHosts[0] ? claudePayloadPaths : []),
          ...(expectedHosts[1] ? codexPayloadPaths : []),
        ].sort(),
      );
      expect(loadWorkflowSelection(root)).toEqual({
        kind: "bundled",
        id: "research",
      });
      expect(fs.existsSync(path.join(root, ".trellis/research"))).toBe(false);

      const workerPath = ".codex/agents/trellis-research-worker.toml";
      if (expectedHosts[1]) {
        const workerTemplate = getCodexResearchWorkerTemplate().content;
        const expectedWorker = replacePythonCommandLiterals(workerTemplate);
        expect(fs.readFileSync(path.join(root, workerPath), "utf-8")).toBe(
          expectedWorker,
        );
        expect(loadHashes(root)[workerPath]).toBe(computeHash(expectedWorker));
      } else {
        expect(fs.existsSync(path.join(root, workerPath))).toBe(false);
        expect(loadHashes(root)[workerPath]).toBeUndefined();
      }
    }
  });

  it("force full re-init replaces a custom workflow with bundled Research", async () => {
    await init({ yes: true });
    const workflowPath = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    fs.writeFileSync(workflowPath, "# Custom workflow\n", "utf-8");
    removeHash(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    clearWorkflowSelection(tmpDir);

    await init({ yes: true, force: true });

    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(
      replacePythonCommandLiterals(researchWorkflowMdTemplate),
    );
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "research",
    });
  });

  it("force full re-init claims byte-identical Research only after verification", async () => {
    await init({ yes: true });
    removeHash(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    clearWorkflowSelection(tmpDir);

    await init({ yes: true, force: true });

    const expected = replacePythonCommandLiterals(researchWorkflowMdTemplate);
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(expected),
    );
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "research",
    });
  });

  it("skip-existing preserves missing selection for byte-identical Research", async () => {
    await init({ yes: true });
    const priorHash = loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE];
    clearWorkflowSelection(tmpDir);

    await init({ yes: true, skipExisting: true });

    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(priorHash);
    expect(loadWorkflowSelection(tmpDir)).toEqual({ kind: "missing" });
  });

  it("restores the prior hash when Research selection persistence fails", async () => {
    await init({ yes: true });
    removeHash(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    clearWorkflowSelection(tmpDir);
    const selectionPath = path.join(tmpDir, PATHS.WORKFLOW_SELECTION_FILE);
    const originalRename = fs.renameSync.bind(fs);
    vi.spyOn(fs, "renameSync").mockImplementation((source, target) => {
      if (path.resolve(String(target)) === path.resolve(selectionPath)) {
        throw new Error("simulated selection write failure");
      }
      return originalRename(source, target);
    });

    await expect(init({ yes: true, force: true })).rejects.toThrow(
      "simulated selection write failure",
    );

    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBeUndefined();
    expect(loadWorkflowSelection(tmpDir)).toEqual({ kind: "missing" });
  });

  it("skip-existing preserves and does not claim a custom workflow", async () => {
    const workflowPath = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
    fs.writeFileSync(workflowPath, "# Existing custom workflow\n", "utf-8");

    await init({ yes: true, skipExisting: true });

    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(
      "# Existing custom workflow\n",
    );
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBeUndefined();
    expect(loadWorkflowSelection(tmpDir)).toEqual({ kind: "missing" });
  });

  it("normal host-addition re-init preserves custom workflow ownership", async () => {
    await init({ yes: true, claude: true });
    const workflowPath = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    fs.writeFileSync(workflowPath, "# Host-neutral custom workflow\n", "utf-8");
    removeHash(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    clearWorkflowSelection(tmpDir);

    await init({ yes: true, codex: true });

    expect(fs.existsSync(path.join(tmpDir, ".codex"))).toBe(true);
    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(
      "# Host-neutral custom workflow\n",
    );
    expect(loadHashes(tmpDir)[PATHS.WORKFLOW_GUIDE_FILE]).toBeUndefined();
    expect(loadWorkflowSelection(tmpDir)).toEqual({ kind: "missing" });
    expect(
      fs.existsSync(path.join(tmpDir, ".trellis", "research", "policy.json")),
    ).toBe(false);
  });

  it("does not claim an untracked colliding Claude statusline", async () => {
    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    const statuslinePath = path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.statusline);
    fs.mkdirSync(path.dirname(statuslinePath), { recursive: true });
    fs.writeFileSync(
      settingsPath,
      `${JSON.stringify(
        {
          statusLine: {
            type: "command",
            command: "python3 .claude/hooks/statusline.py",
          },
        },
        null,
        2,
      )}\n`,
    );
    fs.writeFileSync(statuslinePath, "# user-owned statusline\n");

    await init({ yes: true, claude: true, force: true });

    expect(fs.readFileSync(statuslinePath, "utf-8")).toBe(
      "# user-owned statusline\n",
    );
    expect(loadHashes(tmpDir)[RESEARCH_PAYLOAD_PATHS.claude.statusline]).toBeUndefined();
  });

  it("retains a hash-owned Claude statusline on full force re-init", async () => {
    await init({ yes: true, claude: true, force: true, withStatusline: true });
    const statuslinePath = path.join(tmpDir, RESEARCH_PAYLOAD_PATHS.claude.statusline);
    const before = fs.readFileSync(statuslinePath, "utf-8");
    expect(loadHashes(tmpDir)[RESEARCH_PAYLOAD_PATHS.claude.statusline]).toBe(
      computeHash(before),
    );

    await init({ yes: true, claude: true, force: true });

    expect(fs.readFileSync(statuslinePath, "utf-8")).toBe(before);
    expect(loadHashes(tmpDir)[RESEARCH_PAYLOAD_PATHS.claude.statusline]).toBe(
      computeHash(before),
    );
  });

  it("is byte-idempotent on repeated full Research init", async () => {
    await init({ yes: true, force: true });
    const before = snapshotFiles(tmpDir);

    await init({ yes: true, force: true });

    expect(snapshotFiles(tmpDir)).toEqual(before);
    expect(
      fs.existsSync(path.join(tmpDir, ".trellis", "research", "policy.json")),
    ).toBe(false);
  });

  it("is byte-idempotent on repeated Codex-only force init", async () => {
    await init({ yes: true, codex: true, force: true });
    const before = snapshotFiles(tmpDir);

    await init({ yes: true, codex: true, force: true });

    expect(snapshotFiles(tmpDir)).toEqual(before);
  });
});

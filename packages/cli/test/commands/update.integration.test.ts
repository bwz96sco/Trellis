/**
 * Integration tests for the update() command.
 *
 * Tests the full update flow in real temp directories with minimal mocking.
 * Only external dependencies are mocked: figlet, inquirer, child_process, fetch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import inquirer from "inquirer";

// === External dependency mocks (hoisted by vitest) ===

vi.mock("figlet", () => ({
  default: { textSync: vi.fn(() => "TRELLIS") },
}));

vi.mock("inquirer", () => ({
  default: { prompt: vi.fn().mockResolvedValue({ proceed: true }) },
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn().mockImplementation((cmd: string) => {
    const py = process.platform === "win32" ? "python" : "python3";
    return cmd === `${py} --version` ? "Python 3.11.12" : "";
  }),
}));

// === Imports ===

import { init } from "../../src/commands/init.js";
import { update } from "../../src/commands/update.js";
import { VERSION } from "../../src/constants/version.js";
import { DIR_NAMES, FILE_NAMES, PATHS } from "../../src/constants/paths.js";
import { computeHash, removeHash } from "../../src/utils/template-hash.js";
import {
  clearWorkflowSelection,
  loadWorkflowSelection,
  saveBundledWorkflowSelection,
} from "../../src/utils/workflow-selection.js";
import { researchWorkflowMdTemplate } from "../../src/templates/trellis/index.js";
import { getResearchWorkerTemplate as getCodexResearchWorkerTemplate } from "../../src/templates/codex/index.js";
import { replacePythonCommandLiterals } from "../../src/configurators/shared.js";

// A managed Research payload file that update always handles for Claude installs.
const MANAGED_FILE = ".claude/hooks/session-start.py";

/** Remove a key from a hash object (avoids eslint no-dynamic-delete) */
function removeHashEntry(
  obj: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));
}

/**
 * Read the v2 hashes file and return the inner `hashes` map.
 * Tests manipulate this map then write it back via `writeHashesV2`.
 */
function readHashesV2(hashFile: string): Record<string, string> {
  const raw = JSON.parse(fs.readFileSync(hashFile, "utf-8")) as {
    __version?: number;
    hashes?: Record<string, string>;
  };
  return raw.hashes ?? {};
}

/** Write a v2-shaped hashes file. */
function writeHashesV2(hashFile: string, hashes: Record<string, string>): void {
  fs.writeFileSync(hashFile, JSON.stringify({ __version: 2, hashes }, null, 2));
}

function removeSubagentsSection(content: string): string {
  return content.replace(
    "\n## Subagents\n\n" +
      "- ALWAYS wait for all subagents to complete before yielding.\n" +
      "- Spawn subagents automatically when:\n" +
      "  - Parallelizable work (e.g., install + verify, npm test + typecheck, multiple tasks from plan)\n" +
      "  - Long-running or blocking tasks where a worker can run independently.\n" +
      "  - Isolation for risky changes or checks\n",
    "",
  );
}

describe("update() integration", () => {
  let tmpDir: string;

  /** Initialize a fresh project in tmpDir */
  async function setupProject(): Promise<void> {
    await init({ yes: true, force: true });
  }

  function projectFile(relativePath: string): string {
    return path.join(tmpDir, relativePath);
  }

  function hashFilePath(): string {
    return projectFile(`${DIR_NAMES.WORKFLOW}/.template-hashes.json`);
  }

  function versionFilePath(): string {
    return projectFile(`${DIR_NAMES.WORKFLOW}/.version`);
  }

  function readProjectFile(relativePath: string): string {
    return fs.readFileSync(projectFile(relativePath), "utf-8");
  }

  function writeProjectFile(relativePath: string, content: string): void {
    const fullPath = projectFile(relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  /**
   * Stage a project as if an older Trellis version installed pristine template
   * files, then the current CLI is about to update it. The hash file records
   * the older pristine content so update() must treat those files as
   * auto-update candidates.
   */
  function stageVersionedUpgradeProject(options: {
    fromVersion: string;
    pristineTemplates?: Record<string, string>;
    userModifiedTemplates?: Record<string, string>;
  }): void {
    fs.writeFileSync(versionFilePath(), options.fromVersion);

    const hashes = readHashesV2(hashFilePath());
    for (const [relativePath, content] of Object.entries(
      options.pristineTemplates ?? {},
    )) {
      writeProjectFile(relativePath, content);
      hashes[relativePath] = computeHash(content);
    }
    writeHashesV2(hashFilePath(), hashes);

    for (const [relativePath, content] of Object.entries(
      options.userModifiedTemplates ?? {},
    )) {
      writeProjectFile(relativePath, content);
    }
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-update-int-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const noop = () => {};
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    // Mock fetch for npm registry
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: VERSION }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("does not create an absent Research project policy", async () => {
    await setupProject();
    const policyPath = projectFile(".trellis/research/policy.json");
    expect(fs.existsSync(policyPath)).toBe(false);

    await update({ force: true });

    expect(fs.existsSync(policyPath)).toBe(false);
  });

  it("#1 same version update is a true no-op after ownership self-heal", async () => {
    await setupProject();
    // The first update may release stale ownership recorded by older init
    // behavior. Once healed, another same-version update must be byte-stable.
    await update({});
    const backupsBefore = fs
      .readdirSync(path.join(tmpDir, DIR_NAMES.WORKFLOW))
      .filter((entry) => entry.startsWith(".backup-"));

    // Full snapshot before the idempotency check
    const snapshotBefore = new Map<string, string>();
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else
          snapshotBefore.set(
            path.relative(tmpDir, full),
            fs.readFileSync(full, "utf-8"),
          );
      }
    };
    walk(tmpDir);

    await update({});

    // Full snapshot after update
    const snapshotAfter = new Map<string, string>();
    const walk2 = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk2(full);
        else
          snapshotAfter.set(
            path.relative(tmpDir, full),
            fs.readFileSync(full, "utf-8"),
          );
      }
    };
    walk2(tmpDir);

    // No files added or removed
    const addedFiles = [...snapshotAfter.keys()].filter(
      (k) => !snapshotBefore.has(k),
    );
    const removedFiles = [...snapshotBefore.keys()].filter(
      (k) => !snapshotAfter.has(k),
    );
    expect(addedFiles).toEqual([]);
    expect(removedFiles).toEqual([]);

    // No file contents changed
    const changedFiles: string[] = [];
    for (const [filePath, content] of snapshotBefore) {
      if (snapshotAfter.get(filePath) !== content) {
        changedFiles.push(filePath);
      }
    }
    expect(changedFiles).toEqual([]);

    // The idempotency check creates no additional backup.
    const backupsAfter = fs
      .readdirSync(path.join(tmpDir, DIR_NAMES.WORKFLOW))
      .filter((entry) => entry.startsWith(".backup-"));
    expect(backupsAfter).toEqual(backupsBefore);
  });

  it("#2 dry run makes no file changes even when changes exist", async () => {
    await setupProject();

    // Delete hash + file to simulate a truly new template file
    const target = path.join(tmpDir, MANAGED_FILE);
    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashes = removeHashEntry(
      readHashesV2(hashFile),
      MANAGED_FILE,
    ) as Record<string, string>;
    writeHashesV2(hashFile, hashes);
    fs.unlinkSync(target);

    await update({ dryRun: true });

    // File should still be missing (dry run didn't recreate it)
    expect(fs.existsSync(target)).toBe(false);
    // No backup directory created
    const entries = fs.readdirSync(path.join(tmpDir, DIR_NAMES.WORKFLOW));
    expect(entries.filter((e) => e.startsWith(".backup-")).length).toBe(0);
  });

  it("#3 user-deleted file (with stored hash) is not re-added on update", async () => {
    await setupProject();

    const target = path.join(tmpDir, MANAGED_FILE);
    expect(fs.existsSync(target)).toBe(true);

    // Delete it (simulating user deletion; hash still exists in .template-hashes.json)
    fs.unlinkSync(target);
    expect(fs.existsSync(target)).toBe(false);

    await update({ force: true });

    // File should NOT be re-created (user deleted it, hash still exists)
    expect(fs.existsSync(target)).toBe(false);
  });

  it("#4 auto-updates file when template changed but user did not modify", async () => {
    await setupProject();

    const targetRelative = MANAGED_FILE;
    const targetFull = path.join(tmpDir, targetRelative);
    const templateContent = fs.readFileSync(targetFull, "utf-8");

    // Simulate "old template version": change file + update hash to match
    const oldContent = "# Old version of script\n";
    fs.writeFileSync(targetFull, oldContent);

    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashes = readHashesV2(hashFile);
    hashes[targetRelative] = computeHash(oldContent);
    writeHashesV2(hashFile, hashes);

    await update({ force: true });

    // File should be auto-updated back to current template
    expect(fs.readFileSync(targetFull, "utf-8")).toBe(templateContent);
  });

  it("#4b auto-updates legacy untracked AGENTS.md and preserves outside content", async () => {
    await setupProject();

    const targetRelative = FILE_NAMES.AGENTS;
    const targetFull = path.join(tmpDir, targetRelative);
    const templateContent = fs.readFileSync(targetFull, "utf-8");
    const oldContent = removeSubagentsSection(templateContent);
    const existingContent = `# Local instructions\n\n${oldContent}\n\n## Project Notes\n\nKeep this.`;
    const expectedContent = `# Local instructions\n\n${templateContent}\n\n## Project Notes\n\nKeep this.`;

    fs.writeFileSync(targetFull, existingContent);

    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashes = removeHashEntry(
      readHashesV2(hashFile),
      targetRelative,
    ) as Record<string, string>;
    writeHashesV2(hashFile, hashes);

    await update({});

    expect(fs.readFileSync(targetFull, "utf-8")).toBe(expectedContent);
    expect(readHashesV2(hashFile)[targetRelative]).toBe(
      computeHash(expectedContent),
    );
  });

  it("#4c preserves user-modified untracked AGENTS.md managed block", async () => {
    await setupProject();

    const targetRelative = FILE_NAMES.AGENTS;
    const targetFull = path.join(tmpDir, targetRelative);
    const templateContent = fs.readFileSync(targetFull, "utf-8");
    const modifiedOldContent = removeSubagentsSection(templateContent).replace(
      "# Trellis Instructions",
      "# Custom Trellis Instructions",
    );
    fs.writeFileSync(targetFull, modifiedOldContent);

    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashes = removeHashEntry(
      readHashesV2(hashFile),
      targetRelative,
    ) as Record<string, string>;
    writeHashesV2(hashFile, hashes);

    await update({ skipAll: true });

    expect(fs.readFileSync(targetFull, "utf-8")).toBe(modifiedOldContent);
  });

  it("#4d preserves user AGENTS.md without TRELLIS markers by appending the managed block", async () => {
    await setupProject();

    const targetRelative = FILE_NAMES.AGENTS;
    const targetFull = path.join(tmpDir, targetRelative);
    const templateContent = fs.readFileSync(targetFull, "utf-8");

    // User has a hand-written AGENTS.md with no TRELLIS:START/END markers at
    // all (predates 0.5.0-beta.18 or was authored by hand). Pre-fix behavior
    // would clobber this content; post-fix should append the managed block.
    const userContent = "# Project notes\n\nThings the team agreed on.\n";
    fs.writeFileSync(targetFull, userContent);

    await update({ force: true });

    const result = fs.readFileSync(targetFull, "utf-8");
    expect(result).toContain("# Project notes");
    expect(result).toContain("Things the team agreed on.");
    expect(result).toContain("<!-- TRELLIS:START -->");
    expect(result).toContain("<!-- TRELLIS:END -->");
    // Managed block should sit AFTER the user content, not replace it.
    expect(result.indexOf("# Project notes")).toBeLessThan(
      result.indexOf("<!-- TRELLIS:START -->"),
    );
    // Tail equals the canonical template (force-applied managed block).
    expect(result.endsWith(templateContent.trimEnd() + "\n")).toBe(true);
  });

  it("#5 force overwrites user-modified files", async () => {
    await setupProject();

    const targetFull = path.join(tmpDir, MANAGED_FILE);
    const templateContent = fs.readFileSync(targetFull, "utf-8");

    // User modifies file (hash won't match)
    fs.writeFileSync(targetFull, "user customized content");

    await update({ force: true });

    expect(fs.readFileSync(targetFull, "utf-8")).toBe(templateContent);
  });

  it("#5b force mode does not prompt for final confirmation", async () => {
    await setupProject();

    const targetFull = path.join(tmpDir, MANAGED_FILE);
    fs.writeFileSync(targetFull, "user customized content");
    vi.mocked(inquirer.prompt).mockClear();

    await update({ force: true });

    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it("#6 skipAll preserves user-modified files", async () => {
    await setupProject();

    const targetFull = path.join(tmpDir, MANAGED_FILE);
    fs.writeFileSync(targetFull, "user customized content");

    await update({ skipAll: true });

    expect(fs.readFileSync(targetFull, "utf-8")).toBe(
      "user customized content",
    );
  });

  it("#7 createNew creates .new copy without overwriting original", async () => {
    await setupProject();

    const targetFull = path.join(tmpDir, MANAGED_FILE);
    const templateContent = fs.readFileSync(targetFull, "utf-8");
    fs.writeFileSync(targetFull, "user customized content");

    await update({ createNew: true });

    // Original preserved
    expect(fs.readFileSync(targetFull, "utf-8")).toBe(
      "user customized content",
    );
    // .new file created with template content
    const newFile = targetFull + ".new";
    expect(fs.existsSync(newFile)).toBe(true);
    expect(fs.readFileSync(newFile, "utf-8")).toBe(templateContent);
  });

  it("#8 updates version file after successful update", async () => {
    await setupProject();

    // Simulate older project version
    const versionPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, ".version");
    fs.writeFileSync(versionPath, "0.0.1");

    await update({ force: true });

    // Version is updated even when no file changes are needed
    expect(fs.readFileSync(versionPath, "utf-8")).toBe(VERSION);
  });

  it("#9 creates backup directory before applying changes", async () => {
    await setupProject();

    // Simulate "old template version": change file + update hash to match
    // This triggers auto-update (template changed, user didn't modify)
    const targetFull = path.join(tmpDir, MANAGED_FILE);
    const oldContent = "# Old version of script\n";
    fs.writeFileSync(targetFull, oldContent);
    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashes = readHashesV2(hashFile);
    hashes[MANAGED_FILE] = computeHash(oldContent);
    writeHashesV2(hashFile, hashes);

    await update({ force: true });

    const entries = fs.readdirSync(path.join(tmpDir, DIR_NAMES.WORKFLOW));
    const backupDirs = entries.filter((e) => e.startsWith(".backup-"));
    expect(backupDirs.length).toBeGreaterThanOrEqual(1);
  });

  it("#10 downgrade protection prevents update when CLI is older", async () => {
    await setupProject();

    // Set project version to future
    const versionPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, ".version");
    fs.writeFileSync(versionPath, "99.99.99");

    await update({});

    // Version should NOT be changed
    expect(fs.readFileSync(versionPath, "utf-8")).toBe("99.99.99");
  });

  it("#11 allowDowngrade permits update when CLI is older", async () => {
    await setupProject();

    const versionPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, ".version");
    fs.writeFileSync(versionPath, "99.99.99");

    // Remove hash entry + file to simulate a truly new template file
    const target = path.join(tmpDir, MANAGED_FILE);
    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashes = removeHashEntry(
      readHashesV2(hashFile),
      MANAGED_FILE,
    ) as Record<string, string>;
    writeHashesV2(hashFile, hashes);
    fs.unlinkSync(target);

    await update({ allowDowngrade: true, force: true });

    // File recreated (truly new — no stored hash)
    expect(fs.existsSync(target)).toBe(true);
    // Version updated to current
    expect(fs.readFileSync(versionPath, "utf-8")).toBe(VERSION);
  });

  it("#12 prerelease→stable upgrade with no file changes still updates .version", async () => {
    await setupProject();

    // Simulate a project at rc.6 (identical templates, just different version stamp)
    const versionPath = versionFilePath();
    fs.writeFileSync(versionPath, "0.3.0-rc.6");

    await update({});

    // .version must be updated to the current CLI version
    expect(fs.readFileSync(versionPath, "utf-8")).toBe(VERSION);
  });

  it("#12b versioned upgrade updates Research payloads without appending generic config", async () => {
    await setupProject();

    const expectedWorkflow = replacePythonCommandLiterals(
      researchWorkflowMdTemplate,
    );
    const expectedHook = readProjectFile(MANAGED_FILE);
    const legacyScript = `${PATHS.SCRIPTS}/add_session.py`;
    const legacyScriptContent = "# user customized add_session.py\n";
    const localConfig =
      "max_journal_lines: 2000\n\n" +
      "# Local 0.5.10 config customization that must survive update.\n";
    const oldWorkflow =
      "# Workflow\n\n" +
      "## Phase Index\n\n" +
      "[workflow-state:in_progress]\nlegacy body\n[/workflow-state:in_progress]\n\n" +
      "#### 2.1 Implement `[required · repeatable]`\n\n" +
      "[Codex]\nSpawn the implement sub-agent:\n[/Codex]\n\n" +
      "[Kilo, Antigravity, Windsurf]\n" +
      "1. Load the `trellis-before-dev` skill to read project guidelines\n" +
      "[/Kilo, Antigravity, Windsurf]\n";

    stageVersionedUpgradeProject({
      fromVersion: "0.5.10",
      pristineTemplates: {
        [PATHS.WORKFLOW_GUIDE_FILE]: oldWorkflow,
        [MANAGED_FILE]: "# old Research session-start hook\n",
      },
      userModifiedTemplates: {
        [`${DIR_NAMES.WORKFLOW}/config.yaml`]: localConfig,
        [legacyScript]: legacyScriptContent,
      },
    });

    await update({ skipAll: true });

    expect(fs.readFileSync(versionFilePath(), "utf-8")).toBe(VERSION);
    expect(readProjectFile(PATHS.WORKFLOW_GUIDE_FILE)).toBe(expectedWorkflow);
    expect(readProjectFile(MANAGED_FILE)).toBe(expectedHook);
    expect(readProjectFile(PATHS.WORKFLOW_GUIDE_FILE)).not.toContain(
      "legacy body",
    );

    const updatedConfig = readProjectFile(`${DIR_NAMES.WORKFLOW}/config.yaml`);
    expect(updatedConfig).toBe(localConfig);
    expect(updatedConfig).not.toContain("Session Auto-Commit");
    expect(updatedConfig).not.toContain("session_auto_commit");

    // Unknown or modified historical bytes remain user-owned. Current desired
    // state does not recreate or bless generic scripts.
    expect(readProjectFile(legacyScript)).toBe(legacyScriptContent);
    const hashes = readHashesV2(hashFilePath());
    expect(hashes[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(expectedWorkflow),
    );
    expect(hashes[MANAGED_FILE]).toBe(computeHash(expectedHook));
    expect(hashes[legacyScript]).not.toBe(computeHash(legacyScriptContent));
  });

  it("#13 user-edited spec/guides files are preserved after update with force", async () => {
    await setupProject();

    // A legacy or user-created generic spec remains user-owned even though
    // current Research init no longer creates blank generic spec scaffolding.
    const guidesIndex = path.join(tmpDir, PATHS.SPEC, "guides", "index.md");
    const customContent = "# My Custom Guides\n\nEdited by user.\n";
    fs.mkdirSync(path.dirname(guidesIndex), { recursive: true });
    fs.writeFileSync(guidesIndex, customContent);

    await update({ force: true });

    // User's customized content must be preserved (update should not touch spec/)
    expect(fs.readFileSync(guidesIndex, "utf-8")).toBe(customContent);
  });

  it("#14 deleted spec directory is NOT recreated by update", async () => {
    await setupProject();

    // User deletes the entire spec directory
    const specDir = path.join(tmpDir, PATHS.SPEC);
    fs.rmSync(specDir, { recursive: true, force: true });
    expect(fs.existsSync(specDir)).toBe(false);

    await update({ force: true });

    // spec/ directory should NOT be recreated by update
    expect(fs.existsSync(specDir)).toBe(false);
  });

  it("#14b registry-backed pristine spec is not refreshed by update", async () => {
    await setupProject();

    const specFile = `${PATHS.SPEC}/index.md`;
    writeProjectFile(specFile, "# remote spec v1\n");
    writeProjectFile(
      `${DIR_NAMES.WORKFLOW}/config.yaml`,
      `${readProjectFile(`${DIR_NAMES.WORKFLOW}/config.yaml`)}\nregistry:\n  spec:\n    source: gitlab:local/registry/spec\n`,
    );
    const hashes = readHashesV2(hashFilePath());
    hashes[specFile] = computeHash("# remote spec v1\n");
    writeHashesV2(hashFilePath(), hashes);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: string | URL) => {
        const url = String(input);
        if (url.includes("registry.npmjs.org")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ version: VERSION }),
          });
        }
        return Promise.resolve({ status: 404, ok: false });
      }),
    );

    await update({ force: true });

    expect(readProjectFile(specFile)).toBe("# remote spec v1\n");
    expect(readHashesV2(hashFilePath())[specFile]).toBe(
      computeHash("# remote spec v1\n"),
    );
  });

  it("#14c registry-backed user-modified spec is preserved under skipAll", async () => {
    await setupProject();

    const specFile = `${PATHS.SPEC}/index.md`;
    writeProjectFile(specFile, "# local edits\n");
    writeProjectFile(
      `${DIR_NAMES.WORKFLOW}/config.yaml`,
      `${readProjectFile(`${DIR_NAMES.WORKFLOW}/config.yaml`)}\nregistry:\n  spec:\n    source: gitlab:local/registry/spec\n`,
    );
    const hashes = readHashesV2(hashFilePath());
    hashes[specFile] = computeHash("# remote spec v1\n");
    writeHashesV2(hashFilePath(), hashes);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: string | URL) => {
        const url = String(input);
        if (url.includes("registry.npmjs.org")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ version: VERSION }),
          });
        }
        return Promise.resolve({ status: 404, ok: false });
      }),
    );

    await update({ skipAll: true });

    expect(readProjectFile(specFile)).toBe("# local edits\n");
    expect(readHashesV2(hashFilePath())[specFile]).toBe(
      computeHash("# remote spec v1\n"),
    );
  });

  it("#14d registry marketplace spec is not refreshed by update", async () => {
    await setupProject();

    const specFile = `${PATHS.SPEC}/index.md`;
    writeProjectFile(specFile, "# golang spec v1\n");
    writeProjectFile(
      `${DIR_NAMES.WORKFLOW}/config.yaml`,
      `${readProjectFile(`${DIR_NAMES.WORKFLOW}/config.yaml`)}\nregistry:\n  spec:\n    source: gitlab:local/registry/marketplace\n    template: golang-spec\n`,
    );
    const hashes = readHashesV2(hashFilePath());
    hashes[specFile] = computeHash("# golang spec v1\n");
    writeHashesV2(hashFilePath(), hashes);

    const index = JSON.stringify({
      version: 1,
      templates: [
        {
          id: "golang-spec",
          type: "spec",
          name: "Golang",
          path: "backend",
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: string | URL) => {
        const url = String(input);
        if (url.includes("registry.npmjs.org")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ version: VERSION }),
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(index),
        });
      }),
    );

    await update({ force: true });

    expect(readProjectFile(specFile)).toBe("# golang spec v1\n");
    expect(readHashesV2(hashFilePath())[specFile]).toBe(
      computeHash("# golang spec v1\n"),
    );
  });

  it("#15 truly new file (no stored hash) is still added", async () => {
    await setupProject();

    // The hash file should exist
    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashes = removeHashEntry(
      readHashesV2(hashFile),
      MANAGED_FILE,
    ) as Record<string, string>;

    // Remove a hash entry AND the file (simulates a truly new template)
    const targetPath = path.join(tmpDir, MANAGED_FILE);
    writeHashesV2(hashFile, hashes);
    fs.unlinkSync(targetPath);

    // Run update
    await update({ force: true });

    // File SHOULD be created (no hash = truly new)
    expect(fs.existsSync(targetPath)).toBe(true);
  });

  it("adds and claims the bounded Codex worker for an older managed install", async () => {
    await init({ yes: true, codex: true, force: true });
    const workerPath = ".codex/agents/trellis-research-worker.toml";
    const workerTemplate = getCodexResearchWorkerTemplate().content;
    const expectedWorker = replacePythonCommandLiterals(workerTemplate);

    fs.unlinkSync(projectFile(workerPath));
    const hashes = removeHashEntry(
      readHashesV2(hashFilePath()),
      workerPath,
    ) as Record<string, string>;
    writeHashesV2(hashFilePath(), hashes);
    fs.writeFileSync(versionFilePath(), "0.6.7", "utf-8");

    await update({ force: true });

    expect(readProjectFile(workerPath)).toBe(expectedWorker);
    expect(readHashesV2(hashFilePath())[workerPath]).toBe(
      computeHash(expectedWorker),
    );
    const hashesAfterInstall = fs.readFileSync(hashFilePath(), "utf-8");
    const backupsAfterInstall = fs
      .readdirSync(projectFile(DIR_NAMES.WORKFLOW))
      .filter((entry) => entry.startsWith(".backup-"));

    await update({});

    expect(readProjectFile(workerPath)).toBe(expectedWorker);
    expect(fs.readFileSync(hashFilePath(), "utf-8")).toBe(hashesAfterInstall);
    expect(
      fs
        .readdirSync(projectFile(DIR_NAMES.WORKFLOW))
        .filter((entry) => entry.startsWith(".backup-")),
    ).toEqual(backupsAfterInstall);
  });

  it("preserves and does not claim an unowned conflicting Codex worker", async () => {
    await init({ yes: true, codex: true, force: true });
    const workerPath = ".codex/agents/trellis-research-worker.toml";
    const conflict = "# user-owned Codex research worker\n";
    writeProjectFile(workerPath, conflict);
    const hashes = removeHashEntry(
      readHashesV2(hashFilePath()),
      workerPath,
    ) as Record<string, string>;
    writeHashesV2(hashFilePath(), hashes);
    vi.mocked(console.log).mockClear();

    await update({ skipAll: true });

    expect(readProjectFile(workerPath)).toBe(conflict);
    expect(readHashesV2(hashFilePath())[workerPath]).toBeUndefined();
    expect(
      vi
        .mocked(console.log)
        .mock.calls.flat()
        .some((value) => String(value).includes(`? ${workerPath}`)),
    ).toBe(true);
  });

  it("does not backfill generic agents or retired Research stage skills", async () => {
    await setupProject();

    const genericAgentPath = ".trellis/agents/research.md";
    const researchSkillPath =
      ".claude/skills/trellis-research-literature/SKILL.md";

    writeProjectFile(".trellis/agents/existing.md", "# Legacy agent inventory\n");
    // C08: stage skills are no longer generated. Plant a historical skill and
    // prove update does not re-install it from current templates.
    writeProjectFile(researchSkillPath, "# historical stage skill\n");
    let hashes = readHashesV2(hashFilePath());
    hashes = removeHashEntry(hashes, researchSkillPath) as Record<string, string>;
    writeHashesV2(hashFilePath(), hashes);

    await update({ force: true });

    expect(fs.existsSync(projectFile(genericAgentPath))).toBe(false);
    expect(readProjectFile(".trellis/agents/existing.md")).toBe(
      "# Legacy agent inventory\n",
    );
    // Untracked historical skill is preserved (not owned by current templates).
    expect(readProjectFile(researchSkillPath)).toBe("# historical stage skill\n");
    const updatedHashes = readHashesV2(hashFilePath());
    expect(updatedHashes[genericAgentPath]).toBeUndefined();
    expect(updatedHashes[researchSkillPath]).toBeUndefined();
  });

  it("#16 config.yaml update.skip prevents file from being updated", async () => {
    await setupProject();

    // Pick a managed template file
    const targetPath = path.join(tmpDir, MANAGED_FILE);

    // Add skip config
    const configPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml");
    const configContent = fs.readFileSync(configPath, "utf-8");
    fs.writeFileSync(
      configPath,
      configContent + `\nupdate:\n  skip:\n    - ${MANAGED_FILE}\n`,
    );

    // Modify the file so it would normally trigger a change
    fs.writeFileSync(targetPath, "# modified by user\n");

    // Run update
    await update({ force: true });

    // File should NOT be overwritten (it's in skip list)
    expect(fs.readFileSync(targetPath, "utf-8")).toBe("# modified by user\n");
  });

  it("#17 config.yaml update.skip with directory path skips all files under it", async () => {
    await setupProject();

    const configPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml");
    const configContent = fs.readFileSync(configPath, "utf-8");
    const skipDir = ".claude/hooks/";
    fs.writeFileSync(
      configPath,
      configContent + `\nupdate:\n  skip:\n    - ${skipDir}\n`,
    );

    const targetPath = path.join(tmpDir, MANAGED_FILE);
    expect(fs.existsSync(targetPath)).toBe(true);
    fs.writeFileSync(targetPath, "# user modified Research hook\n");

    await update({ force: true });

    expect(fs.readFileSync(targetPath, "utf-8")).toBe(
      "# user modified Research hook\n",
    );
  });

  it("#18 safe-file-delete preserves user-modified deprecated file", async () => {
    await setupProject();

    // Create a deprecated file that exists in the 0.4.0-beta.1 safe-file-delete manifest
    // but with user-modified content (hash won't match allowed_hashes)
    const deprecatedDir = path.join(tmpDir, ".claude", "commands", "trellis");
    fs.mkdirSync(deprecatedDir, { recursive: true });
    const deprecatedFile = path.join(deprecatedDir, "before-backend-dev.md");
    const userContent =
      "# My customized before-backend-dev command\nUser edited this.\n";
    fs.writeFileSync(deprecatedFile, userContent);

    await update({ force: true });

    // File should be preserved (hash doesn't match allowed_hashes)
    expect(fs.existsSync(deprecatedFile)).toBe(true);
    expect(fs.readFileSync(deprecatedFile, "utf-8")).toBe(userContent);
  });

  it("#19 safe-file-delete handles missing deprecated files without crash", async () => {
    await setupProject();

    // Simulate upgrading from an old version — deprecated files don't exist
    // The manifest has safe-file-delete entries for .claude/commands/trellis/before-backend-dev.md etc.
    // but init() doesn't create them (templates removed). update() should not crash.
    const versionPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, ".version");
    fs.writeFileSync(versionPath, "0.3.7");

    // This should complete without errors even though deprecated files don't exist
    await update({ force: true });

    // Version updated successfully
    expect(fs.readFileSync(versionPath, "utf-8")).toBe(VERSION);
  });

  // Original template content for check-backend.md (deleted in 0.4.0-beta.1).
  // Hash: 4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3
  const ORIGINAL_CHECK_BACKEND_CONTENT = [
    "Check if the code you just wrote follows the backend development guidelines.",
    "",
    "Execute these steps:",
    "1. Run `git status` to see modified files",
    "2. Read `.trellis/spec/backend/index.md` to understand which guidelines apply",
    "3. Based on what you changed, read the relevant guideline files:",
    "   - Database changes → `.trellis/spec/backend/database-guidelines.md`",
    "   - Error handling → `.trellis/spec/backend/error-handling.md`",
    "   - Logging changes → `.trellis/spec/backend/logging-guidelines.md`",
    "   - Type changes → `.trellis/spec/backend/type-safety.md`",
    "   - Any changes → `.trellis/spec/backend/quality-guidelines.md`",
    "4. Review your code against the guidelines",
    "5. Report any violations and fix them if found",
    "",
  ].join("\n");

  it("#20 safe-file-delete respects update.skip for deprecated files", async () => {
    await setupProject();

    // Sanity: content hash must match the manifest's allowed_hashes
    expect(computeHash(ORIGINAL_CHECK_BACKEND_CONTENT)).toBe(
      "4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3",
    );

    // Create a deprecated file with original content (hash matches allowed_hashes)
    // Without update.skip, collectSafeFileDeletes() would delete this file.
    const deprecatedDir = path.join(tmpDir, ".claude", "commands", "trellis");
    fs.mkdirSync(deprecatedDir, { recursive: true });
    const deprecatedFile = path.join(deprecatedDir, "check-backend.md");
    fs.writeFileSync(deprecatedFile, ORIGINAL_CHECK_BACKEND_CONTENT);

    // Add the deprecated file's directory to update.skip
    const configPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, "config.yaml");
    const configContent = fs.readFileSync(configPath, "utf-8");
    fs.writeFileSync(
      configPath,
      configContent + `\nupdate:\n  skip:\n    - .claude/commands/trellis/\n`,
    );

    await update({ force: true });

    // File should be preserved (directory is in update.skip, overriding safe-file-delete)
    expect(fs.existsSync(deprecatedFile)).toBe(true);
    expect(fs.readFileSync(deprecatedFile, "utf-8")).toBe(
      ORIGINAL_CHECK_BACKEND_CONTENT,
    );
  });

  it("#21 safe-file-delete deletes file when hash matches allowed_hashes", async () => {
    await setupProject();

    // Sanity: content hash must match the manifest's allowed_hashes
    expect(computeHash(ORIGINAL_CHECK_BACKEND_CONTENT)).toBe(
      "4e81a28d681ea770f780df55a212fd504ce21ee49b44ba16023b74b5c243cef3",
    );

    // Create deprecated file with original content (hash matches allowed_hashes)
    const deprecatedDir = path.join(tmpDir, ".claude", "commands", "trellis");
    fs.mkdirSync(deprecatedDir, { recursive: true });
    const deprecatedFile = path.join(deprecatedDir, "check-backend.md");
    fs.writeFileSync(deprecatedFile, ORIGINAL_CHECK_BACKEND_CONTENT);

    await update({ force: true });

    // File should be DELETED (hash matched allowed_hashes, no update.skip protection)
    expect(fs.existsSync(deprecatedFile)).toBe(false);
  });

  it("#21b current-host safe-delete removes released pristine bytes and hash ownership", async () => {
    await init({ yes: true, force: true, claude: true });

    const retiredPath = ".agents/skills/trellis-check/SKILL.md";
    const fixturePath = path.resolve(
      import.meta.dirname,
      "../fixtures/legacy-0.6.7-multi-host/project",
      retiredPath,
    );
    const releasedContent = fs.readFileSync(fixturePath, "utf-8");
    expect(computeHash(releasedContent)).toBe(
      "b21ff04b7680ebacb8c5ecbc48a22d627eb13e2b47fceb78c8ced0b43b60b282",
    );
    writeProjectFile(retiredPath, releasedContent);
    const hashes = readHashesV2(hashFilePath());
    hashes[retiredPath] = computeHash(releasedContent);
    writeHashesV2(hashFilePath(), hashes);

    await update({ force: true });

    expect(fs.existsSync(projectFile(retiredPath))).toBe(false);
    expect(readHashesV2(hashFilePath())).not.toHaveProperty(retiredPath);
  });

  it("#22 preserves existing Claude statusLine config and hook file on update", async () => {
    await init({ yes: true, force: true, claude: true });

    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    const statusLinePath = path.join(
      tmpDir,
      ".claude",
      "hooks",
      "statusline.py",
    );
    const expectedPythonCmd =
      process.platform === "win32" ? "python" : "python3";
    const statusLineConfig = {
      type: "command",
      command: `${expectedPythonCmd} .claude/hooks/statusline.py`,
    };

    const settings = JSON.parse(
      fs.readFileSync(settingsPath, "utf-8"),
    ) as Record<string, unknown>;
    settings.statusLine = statusLineConfig;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    fs.writeFileSync(statusLinePath, "# existing local statusline\n");

    await update({ force: true });

    expect(fs.existsSync(statusLinePath)).toBe(true);
    expect(fs.readFileSync(statusLinePath, "utf-8")).toBe(
      "# existing local statusline\n",
    );
    const updatedSettings = JSON.parse(
      fs.readFileSync(settingsPath, "utf-8"),
    ) as Record<string, unknown>;
    expect(updatedSettings.statusLine).toEqual(statusLineConfig);
    expect(updatedSettings.hooks).toBeDefined();
  });

  it("#22a does not install statusline on update for opted-out projects", async () => {
    await init({ yes: true, force: true, claude: true });

    const statusLinePath = path.join(
      tmpDir,
      ".claude",
      "hooks",
      "statusline.py",
    );
    expect(fs.existsSync(statusLinePath)).toBe(false);

    await update({ force: true });

    // statusline.py must NOT enter the template walk as a `newFiles` install
    expect(fs.existsSync(statusLinePath)).toBe(false);
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, ".claude", "settings.json"), "utf-8"),
    ) as Record<string, unknown>;
    expect(settings).not.toHaveProperty("statusLine");
  });

  it("#22b preserves a --with-statusline install across update", async () => {
    await init({ yes: true, force: true, claude: true, withStatusline: true });

    const settingsPath = path.join(tmpDir, ".claude", "settings.json");
    const statusLinePath = path.join(
      tmpDir,
      ".claude",
      "hooks",
      "statusline.py",
    );

    expect(fs.existsSync(statusLinePath)).toBe(true);
    const hookContentBefore = fs.readFileSync(statusLinePath, "utf-8");
    const settingsBefore = fs.readFileSync(settingsPath, "utf-8");
    expect(
      (JSON.parse(settingsBefore) as Record<string, unknown>).statusLine,
    ).toBeDefined();

    await update({ force: true });

    expect(fs.existsSync(statusLinePath)).toBe(true);
    expect(fs.readFileSync(statusLinePath, "utf-8")).toBe(hookContentBefore);
    // Byte-identical, not just deep-equal: init's injectStatusLine must
    // produce exactly what preserveExistingClaudeStatusLine re-derives
    // (statusLine appended last). Any drift — even key order — makes update
    // flag a phantom settings.json change on every fresh opted-in project.
    expect(fs.readFileSync(settingsPath, "utf-8")).toBe(settingsBefore);
  });

  // --- Breaking-change migration gate (v0.5.0-beta.0+) ---
  // Gate: if upgrading from a version that spans a breaking manifest with
  // recommendMigrate=true, `update` must be invoked with --migrate (or --dry-run
  // for preview). Without either, exit 1 with a clear error.

  /** Simulate a 0.4.0 project by writing a legacy command file that the manifest renames */
  function stageLegacy040Project(): void {
    const versionPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, ".version");
    fs.writeFileSync(versionPath, "0.4.0");
    // Create one legacy file that matches a `rename` entry in 0.5.0-beta.0 manifest.
    // Without this, classifyMigrations finds no work → early-exit before gate.
    const legacyDir = path.join(tmpDir, ".claude", "commands", "trellis");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, "before-dev.md"), "legacy content");
  }

  /** Delete the post-init target so classifyMigrations hits the "new doesn't exist"
   *  branch and respects `isTemplateModified` on the source (→ confirm bucket). */
  function clearMigrationTarget(): void {
    fs.rmSync(path.join(tmpDir, ".claude/skills/trellis-before-dev"), {
      recursive: true,
      force: true,
    });
  }

  it("#22 breaking-change gate exits 1 when --migrate is missing", async () => {
    await setupProject();
    stageLegacy040Project();

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await update({});

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("#23 breaking-change gate allows --dry-run without --migrate", async () => {
    await setupProject();
    stageLegacy040Project();

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await update({ dryRun: true });

    // Gate must not fire for preview mode (users need to inspect before migrating)
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("#24 breaking-change gate allows --migrate to proceed", async () => {
    await setupProject();
    stageLegacy040Project();

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await update({ migrate: true, force: true });

    // Gate passes when --migrate is present; update proceeds to completion
    expect(exitSpy).not.toHaveBeenCalled();
    // Version advances without creating a generic migration Task.
    const versionPath = path.join(tmpDir, DIR_NAMES.WORKFLOW, ".version");
    expect(fs.readFileSync(versionPath, "utf-8")).toBe(VERSION);
    expect(fs.existsSync(projectFile(PATHS.TASKS))).toBe(false);
  });

  // The [b] Backup-rename path in the confirm prompt promises "keeps a .backup
  // copy". Previously it was identical to [r] (both relied on the full project
  // snapshot). We now write an INLINE .backup next to the new path so users can
  // diff/merge their customizations without digging through .trellis/.backup-*/.
  /** Install a mock that returns a specific migration choice for the per-file prompt
   *  and {proceed: true} for the top-level confirm. Resolves the flakiness of
   *  matching on `name` field in the dynamic import path. */
  async function installChoiceMock(
    choice: "rename" | "backup-rename" | "skip",
  ) {
    const inquirer = (await import("inquirer")).default;
    vi.mocked(inquirer.prompt).mockImplementation(((questions: unknown) => {
      const q = Array.isArray(questions) ? questions[0] : questions;
      const name = (q as { name?: string }).name;
      if (name === "choice") return Promise.resolve({ choice });
      return Promise.resolve({ proceed: true });
    }) as never);
  }

  // The [b] Backup-rename path in the confirm prompt promises "keeps a .backup
  // copy". Previously it was identical to [r] (both relied on the full project
  // snapshot). We now write an INLINE .backup next to the new path so users can
  // diff/merge their customizations without digging through .trellis/.backup-*/.
  it("#25 backup-rename leaves inline <new-path>.backup with original content", async () => {
    await setupProject();
    stageLegacy040Project();
    clearMigrationTarget();

    // User-modified content that differs from the 0.5 template (forces confirm)
    const legacyPath = path.join(
      tmpDir,
      ".claude/commands/trellis/before-dev.md",
    );
    const userContent = "## My custom before-dev notes\nEdited by user.\n";
    fs.writeFileSync(legacyPath, userContent);

    await installChoiceMock("backup-rename");

    await update({ migrate: true });

    // After migration:
    //   - new-path exists (rename completed)
    //   - new-path.backup exists with the user's content (inline preservation)
    //   - old-path is gone
    const newPath = path.join(
      tmpDir,
      ".claude/skills/trellis-before-dev/SKILL.md",
    );
    expect(fs.existsSync(newPath)).toBe(true);
    expect(fs.existsSync(newPath + ".backup")).toBe(true);
    expect(fs.readFileSync(newPath + ".backup", "utf-8")).toBe(userContent);
    expect(fs.existsSync(legacyPath)).toBe(false);
  });

  it("#26 rename-anyway does NOT leave an inline .backup (relies on project snapshot)", async () => {
    await setupProject();
    stageLegacy040Project();
    clearMigrationTarget();

    const legacyPath = path.join(
      tmpDir,
      ".claude/commands/trellis/before-dev.md",
    );
    fs.writeFileSync(legacyPath, "## user edits\n");

    await installChoiceMock("rename");

    await update({ migrate: true });

    const newPath = path.join(
      tmpDir,
      ".claude/skills/trellis-before-dev/SKILL.md",
    );
    expect(fs.existsSync(newPath)).toBe(true);
    // No inline .backup — the full-project snapshot under .trellis/.backup-*
    // is the single source of recovery for this mode.
    expect(fs.existsSync(newPath + ".backup")).toBe(false);
  });

  it("#27 backup skips managed node_modules dependency trees", async () => {
    await setupProject();

    const opencodeRoot = path.join(tmpDir, ".opencode");
    fs.mkdirSync(path.join(opencodeRoot, "node_modules", "zod"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(opencodeRoot, "package.json"), "{}\n");
    fs.writeFileSync(
      path.join(opencodeRoot, "node_modules", "zod", "index.js"),
      "module.exports = {};\n",
    );

    // Trigger an update that creates a backup.
    const targetFull = path.join(tmpDir, MANAGED_FILE);
    fs.writeFileSync(targetFull, "user customized content");

    await update({ force: true });

    const entries = fs.readdirSync(path.join(tmpDir, DIR_NAMES.WORKFLOW));
    const backupDirs = entries.filter((e) => e.startsWith(".backup-"));
    expect(backupDirs.length).toBe(1);

    const backupDir = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      backupDirs[0] as string,
    );
    expect(
      fs.existsSync(path.join(backupDir, ".opencode", "package.json")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(backupDir, ".opencode", "node_modules")),
    ).toBe(false);
  });

  it("backs up cleanup-only legacy roots before update mutation", async () => {
    const legacyFiles = [
      ".iflow/legacy.md",
      ".windsurf/user-owned.md",
      ".zcode/cli/agents/legacy.md",
    ];
    await setupProject();
    for (const relativePath of legacyFiles) {
      const fullPath = path.join(tmpDir, ...relativePath.split("/"));
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, `${relativePath}\n`);
    }

    fs.writeFileSync(
      path.join(tmpDir, MANAGED_FILE),
      "user customized content",
    );
    await update({ force: true });

    const backupName = fs
      .readdirSync(path.join(tmpDir, DIR_NAMES.WORKFLOW))
      .find((entry) => entry.startsWith(".backup-"));
    expect(backupName).toBeDefined();
    for (const relativePath of legacyFiles) {
      expect(
        fs.readFileSync(
          path.join(
            tmpDir,
            DIR_NAMES.WORKFLOW,
            backupName as string,
            ...relativePath.split("/"),
          ),
          "utf-8",
        ),
      ).toBe(`${relativePath}\n`);
    }
  });

  it("#workflow-md-r4 updates managed workflow.md as one Research runtime template", async () => {
    await setupProject();

    const workflowPath = path.join(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    const staleWorkflow =
      "# Workflow\n\n" +
      "## Phase Index\n\n" +
      "[workflow-state:in_progress]\nlegacy body\n[/workflow-state:in_progress]\n\n" +
      "#### 2.1 Implement `[required · repeatable]`\n\n" +
      "[Codex]\nSpawn the implement sub-agent:\n[/Codex]\n\n" +
      "[Kilo, Antigravity, Windsurf]\n" +
      "1. Load the `trellis-before-dev` skill to read project guidelines\n" +
      "[/Kilo, Antigravity, Windsurf]\n";

    fs.writeFileSync(workflowPath, staleWorkflow, "utf-8");

    // Simulate an older installed workflow.md that is still pristine relative
    // to the version that installed it. Update must replace the whole file:
    // platform markers outside [workflow-state:*] blocks are runtime-parsed too.
    const hashFile = path.join(
      tmpDir,
      DIR_NAMES.WORKFLOW,
      ".template-hashes.json",
    );
    const hashes = readHashesV2(hashFile);
    hashes[PATHS.WORKFLOW_GUIDE_FILE] = computeHash(staleWorkflow);
    writeHashesV2(hashFile, hashes);

    await update({ force: true });

    const updated = fs.readFileSync(workflowPath, "utf-8");
    expect(updated).toBe(
      replacePythonCommandLiterals(researchWorkflowMdTemplate),
    );
    expect(updated).not.toContain("legacy body");

    expect(readHashesV2(hashFile)[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(updated),
    );
  });

  it("selected bundled research update is idempotent", async () => {
    await init({ yes: true, force: true });
    await update({});
    const workflowBefore = readProjectFile(PATHS.WORKFLOW_GUIDE_FILE);
    const hashesBefore = fs.readFileSync(hashFilePath(), "utf-8");
    const selectionBefore = fs.readFileSync(
      projectFile(PATHS.WORKFLOW_SELECTION_FILE),
      "utf-8",
    );
    const backupsBefore = fs
      .readdirSync(projectFile(DIR_NAMES.WORKFLOW))
      .filter((entry) => entry.startsWith(".backup-"));

    await update({});
    await update({});

    expect(readProjectFile(PATHS.WORKFLOW_GUIDE_FILE)).toBe(workflowBefore);
    expect(fs.readFileSync(hashFilePath(), "utf-8")).toBe(hashesBefore);
    expect(
      fs.readFileSync(projectFile(PATHS.WORKFLOW_SELECTION_FILE), "utf-8"),
    ).toBe(selectionBefore);
    expect(
      fs
        .readdirSync(projectFile(DIR_NAMES.WORKFLOW))
        .filter((entry) => entry.startsWith(".backup-")),
    ).toEqual(backupsBefore);
  });

  it("updates a pristine selected bundled research workflow to research bytes", async () => {
    await setupProject();
    const workflowPath = projectFile(PATHS.WORKFLOW_GUIDE_FILE);
    const staleResearch =
      "# Research Workflow\n\n## Phase Index\nlegacy research\n";
    fs.writeFileSync(workflowPath, staleResearch, "utf-8");
    const hashes = readHashesV2(hashFilePath());
    hashes[PATHS.WORKFLOW_GUIDE_FILE] = computeHash(staleResearch);
    writeHashesV2(hashFilePath(), hashes);
    saveBundledWorkflowSelection(tmpDir, "research");

    await update({ force: true });

    const updated = fs.readFileSync(workflowPath, "utf-8");
    expect(updated).toBe(
      replacePythonCommandLiterals(researchWorkflowMdTemplate),
    );
    expect(readHashesV2(hashFilePath())[PATHS.WORKFLOW_GUIDE_FILE]).toBe(
      computeHash(updated),
    );
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "research",
    });
  });

  it("protects a locally modified selected bundled research workflow", async () => {
    await setupProject();
    const workflowPath = projectFile(PATHS.WORKFLOW_GUIDE_FILE);
    const installedResearch = "# Installed research workflow\n";
    const localResearch = "# Locally modified research workflow\n";
    fs.writeFileSync(workflowPath, localResearch, "utf-8");
    const hashes = readHashesV2(hashFilePath());
    hashes[PATHS.WORKFLOW_GUIDE_FILE] = computeHash(installedResearch);
    writeHashesV2(hashFilePath(), hashes);
    saveBundledWorkflowSelection(tmpDir, "research");

    await update({ skipAll: true });

    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(localResearch);
  });

  it("omits a user-owned workflow with missing metadata and performs no workflow fetch", async () => {
    await setupProject();
    const customWorkflow = "# User-owned workflow\n\n## Phase Index\ncustom\n";
    fs.writeFileSync(
      projectFile(PATHS.WORKFLOW_GUIDE_FILE),
      customWorkflow,
      "utf-8",
    );
    clearWorkflowSelection(tmpDir);
    removeHash(tmpDir, PATHS.WORKFLOW_GUIDE_FILE);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();

    await update({ force: true });

    expect(readProjectFile(PATHS.WORKFLOW_GUIDE_FILE)).toBe(customWorkflow);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes("marketplace/index.json"),
      ),
    ).toBe(false);
  });

  it("omits workflow.md when bundled selection metadata is invalid", async () => {
    await setupProject();
    const customWorkflow = "# Preserve invalid selection workflow\n";
    fs.writeFileSync(
      projectFile(PATHS.WORKFLOW_GUIDE_FILE),
      customWorkflow,
      "utf-8",
    );
    fs.writeFileSync(
      projectFile(PATHS.WORKFLOW_SELECTION_FILE),
      JSON.stringify({
        schemaVersion: 1,
        id: "unknown",
        source: "bundled",
      }),
      "utf-8",
    );

    await update({ force: true });

    expect(readProjectFile(PATHS.WORKFLOW_GUIDE_FILE)).toBe(customWorkflow);
    expect(loadWorkflowSelection(tmpDir).kind).toBe("invalid");
  });

  it("pre-switch missing metadata migrates hash-verified native state to Research", async () => {
    await setupProject();
    clearWorkflowSelection(tmpDir);
    fs.writeFileSync(versionFilePath(), "0.6.0-beta.16", "utf-8");
    const workflowPath = projectFile(PATHS.WORKFLOW_GUIDE_FILE);
    const staleNative = "# Legacy pristine native workflow\n";
    fs.writeFileSync(workflowPath, staleNative, "utf-8");
    const hashes = readHashesV2(hashFilePath());
    hashes[PATHS.WORKFLOW_GUIDE_FILE] = computeHash(staleNative);
    writeHashesV2(hashFilePath(), hashes);

    await update({ force: true });

    expect(fs.readFileSync(workflowPath, "utf-8")).toBe(
      replacePythonCommandLiterals(researchWorkflowMdTemplate),
    );
    expect(loadWorkflowSelection(tmpDir)).toEqual({
      kind: "bundled",
      id: "research",
    });
  });

  it("does not recreate generic source-derived output", async () => {
    await init({ yes: true, claude: true, codex: true, force: true });

    await update({ force: true });

    for (const relativePath of [
      PATHS.SCRIPTS,
      ".trellis/agents",
      PATHS.TASKS,
      PATHS.WORKSPACE,
      PATHS.SPEC,
      PATHS.DEVELOPER_FILE,
      ".claude/skills/trellis-meta",
      ".claude/commands",
      ".agents/skills/trellis-check",
      ".codex/hooks/session-start.py",
    ]) {
      expect(fs.existsSync(projectFile(relativePath)), relativePath).toBe(false);
    }
  });

  it("keeps retained init and update bytes identical", async () => {
    await init({ yes: true, claude: true, codex: true, force: true });
    const retainedPaths = [
      PATHS.WORKFLOW_GUIDE_FILE,
      `${DIR_NAMES.WORKFLOW}/config.yaml`,
      `${DIR_NAMES.WORKFLOW}/.gitignore`,
      FILE_NAMES.AGENTS,
      MANAGED_FILE,
      ".claude/settings.json",
      ".codex/agents/trellis-research-worker.toml",
      ".codex/hooks/inject-workflow-state.py",
      ".codex/hooks.json",
      ".codex/config.toml",
    ];
    const before = new Map(
      retainedPaths.map((relativePath) => [
        relativePath,
        readProjectFile(relativePath),
      ]),
    );

    await update({ force: true });

    for (const [relativePath, content] of before) {
      expect(readProjectFile(relativePath), relativePath).toBe(content);
    }
  });

  it("preserves malformed AGENTS.md markers byte-for-byte", async () => {
    await setupProject();
    const malformed = "local instructions\n<!-- TRELLIS:START -->\n";
    writeProjectFile(FILE_NAMES.AGENTS, malformed);

    await update({ force: true });

    expect(readProjectFile(FILE_NAMES.AGENTS)).toBe(malformed);
  });

  it("preserves canonical Research state byte-for-byte", async () => {
    await setupProject();
    const canonicalFiles = new Map([
      [".trellis/research/quest.yaml", "quest: preserve exactly\n"],
      [".trellis/research/ledger.jsonl", '{"sequence":1}\n'],
      [".trellis/research/evidence/raw.bin", "opaque evidence bytes\n"],
    ]);
    for (const [relativePath, content] of canonicalFiles) {
      writeProjectFile(relativePath, content);
    }

    await update({ force: true });

    for (const [relativePath, content] of canonicalFiles) {
      expect(readProjectFile(relativePath), relativePath).toBe(content);
    }
  });

  it("preserves unrelated structured host configuration on update", async () => {
    await init({ yes: true, claude: true, codex: true, force: true });
    const claudeSettings = JSON.parse(
      readProjectFile(".claude/settings.json"),
    ) as Record<string, unknown>;
    claudeSettings.permissions = { allow: ["Read"] };
    writeProjectFile(
      ".claude/settings.json",
      `${JSON.stringify(claudeSettings, null, 2)}\n`,
    );
    const codexHooks = JSON.parse(
      readProjectFile(".codex/hooks.json"),
    ) as Record<string, unknown>;
    codexHooks.custom = { enabled: true };
    writeProjectFile(
      ".codex/hooks.json",
      `${JSON.stringify(codexHooks, null, 2)}\n`,
    );
    writeProjectFile(
      ".codex/config.toml",
      `${readProjectFile(".codex/config.toml")}\nmodel = "custom"\n`,
    );

    await update({ force: true });

    expect(JSON.parse(readProjectFile(".claude/settings.json"))).toMatchObject({
      permissions: { allow: ["Read"] },
    });
    expect(JSON.parse(readProjectFile(".codex/hooks.json"))).toMatchObject({
      custom: { enabled: true },
    });
    expect(readProjectFile(".codex/config.toml")).toContain('model = "custom"');
  });

  it("preserves non-object structured host JSON byte-for-byte", async () => {
    await init({ yes: true, claude: true, codex: true, force: true });
    const unexpected = new Map([
      [".claude/settings.json", "[1]\n"],
      [".codex/hooks.json", '"custom hooks"\n'],
    ]);
    for (const [relativePath, content] of unexpected) {
      writeProjectFile(relativePath, content);
    }

    await update({ force: true });

    for (const [relativePath, content] of unexpected) {
      expect(readProjectFile(relativePath), relativePath).toBe(content);
    }
  });

  it("preserves malformed structured host configuration byte-for-byte", async () => {
    await init({ yes: true, claude: true, codex: true, force: true });
    const malformed = new Map([
      [".claude/settings.json", "{ malformed claude json\n"],
      [".codex/hooks.json", "{ malformed codex json\n"],
      [".codex/config.toml", "not valid toml\n"],
    ]);
    for (const [relativePath, content] of malformed) {
      writeProjectFile(relativePath, content);
    }

    await update({ force: true });

    for (const [relativePath, content] of malformed) {
      expect(readProjectFile(relativePath), relativePath).toBe(content);
    }
  });
});

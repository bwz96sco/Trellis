/**
 * Unit tests for pruneOrphanManifestKeys + isCwdHomedir
 * (.trellis/tasks/05-13-uninstall-overdelete-manifest-leak).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { collectPlatformTemplates } from "../../src/configurators/index.js";
import { CURRENT_HOST_GENERIC_CLEANUP_PATHS } from "../../src/legacy/current-host-generic-cleanup.js";
import { pruneOrphanManifestKeys } from "../../src/utils/manifest-prune.js";
import {
  isCwdHomedir,
  homedirBypassEnabled,
  homedirGuardMessage,
} from "../../src/utils/cwd-guard.js";
import { saveHashes, loadHashes } from "../../src/utils/template-hash.js";

describe("pruneOrphanManifestKeys", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-prune-"));
    fs.mkdirSync(path.join(tmpDir, ".trellis"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("preserves exact Research base files, historical cleanup keys, and protected research entries", () => {
    const hashes = {
      ".trellis/workflow.md": "workflow",
      ".trellis/config.yaml": "config",
      ".trellis/.gitignore": "gitignore",
      ".trellis/scripts/task.py": "historical-cleanup",
      ".trellis/research/events.jsonl": "protected",
    };
    saveHashes(tmpDir, hashes);

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      [],
      hashes,
    );

    expect(pruned).toEqual([]);
    expect(kept).toEqual(hashes);
  });

  it("preserves hash-tracked spec files when a spec registry is configured", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".trellis", "config.yaml"),
      "registry:\n  spec:\n    source: gitlab:local/registry/spec\n",
    );
    const hashes = {
      ".trellis/spec/index.md": "registry-owned",
      ".trellis/poisoned-user-file.txt": "poisoned",
    };

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      [],
      hashes,
      { persist: false },
    );

    expect(pruned).toEqual([".trellis/poisoned-user-file.txt"]);
    expect(kept).toEqual({ ".trellis/spec/index.md": "registry-owned" });
  });

  it("prunes unknown .trellis keys instead of trusting the whole tree", () => {
    const hashes = {
      ".trellis/workflow.md": "managed",
      ".trellis/poisoned-user-file.txt": "poisoned",
    };

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      [],
      hashes,
      { persist: false },
    );

    expect(pruned).toEqual([".trellis/poisoned-user-file.txt"]);
    expect(kept).toEqual({ ".trellis/workflow.md": "managed" });
  });

  it("prunes invalid manifest keys without resolving them on disk", () => {
    const hashes = {
      "../victim.txt": "traversal",
      "/tmp/absolute.txt": "absolute",
      "C:drive-relative.txt": "drive-relative",
      "bad\\windows.txt": "backslash",
      "bad\0nul.txt": "nul",
    };

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      [],
      hashes,
      { persist: false },
    );

    expect(pruned).toEqual(Object.keys(hashes));
    expect(kept).toEqual({});
  });

  it("prunes platform-dir entries no current configurator owns", () => {
    const hashes = {
      ".codex/sessions/2026/x.jsonl": "user-data-hash",
      ".claude/projects/p1/chat.jsonl": "user-data-hash",
      ".opencode/runtime-cache.db": "user-data-hash",
    };
    saveHashes(tmpDir, hashes);

    // No platform configured → none of these are known.
    const { pruned } = pruneOrphanManifestKeys(tmpDir, [], hashes);

    expect(pruned.sort()).toEqual(
      [
        ".codex/sessions/2026/x.jsonl",
        ".claude/projects/p1/chat.jsonl",
        ".opencode/runtime-cache.db",
      ].sort(),
    );
  });

  it("keeps entries that any configured platform's Research payload owns", () => {
    // Claude Research configuration survives while an unknown runtime sibling is
    // released from manifest ownership.
    const hashes = {
      ".claude/settings.json": "claude-hash",
      ".claude/sessions/user.jsonl": "user-hash",
    };
    saveHashes(tmpDir, hashes);

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      ["claude-code"],
      hashes,
    );

    expect(pruned).toEqual([".claude/sessions/user.jsonl"]);
    expect(kept).toHaveProperty(".claude/settings.json");
    expect(kept).not.toHaveProperty(".claude/sessions/user.jsonl");
  });

  it.each(["claude-code", "codex"] as const)(
    "keeps every exact %s Research payload key without generic collectors",
    (platform) => {
      const payloadPaths = [...collectPlatformTemplates(platform).keys()];
      const currentOnlyPaths = payloadPaths.filter(
        (item) => !CURRENT_HOST_GENERIC_CLEANUP_PATHS.has(item),
      );
      const hashes = Object.fromEntries(
        payloadPaths.map((item) => [item, `${platform}-hash`]),
      );

      const { pruned, hashes: kept } = pruneOrphanManifestKeys(
        tmpDir,
        [platform],
        hashes,
        { persist: false },
      );

      expect(currentOnlyPaths.length).toBeGreaterThan(0);
      expect(pruned).toEqual([]);
      expect(Object.keys(kept).sort()).toEqual(payloadPaths.sort());
    },
  );

  it("recognizes all 137 unique frozen current-host cleanup keys without active platforms", () => {
    const cleanupPaths = [...CURRENT_HOST_GENERIC_CLEANUP_PATHS];
    const hashes = Object.fromEntries(
      cleanupPaths.map((item) => [item, "historical-hash"]),
    );

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      [],
      hashes,
      { persist: false },
    );

    expect(cleanupPaths).toHaveLength(137);
    expect(new Set(cleanupPaths).size).toBe(137);
    expect(pruned).toEqual([]);
    expect(Object.keys(kept).sort()).toEqual(cleanupPaths.sort());
  });

  it("keeps exact retired keys after registry shrink but prunes unknown descendants", () => {
    const retiredPath = ".cursor/commands/trellis-continue.md";
    const unknownPath = ".cursor/user-owned/custom.md";
    const hashes = {
      [retiredPath]: "retired-hash",
      [unknownPath]: "user-hash",
    };
    const existsSpy = vi.spyOn(fs, "existsSync").mockImplementation((value) => {
      if (String(value).endsWith(".cursor/user-owned/custom.md")) {
        throw new Error("unknown retired-root descendant reached filesystem");
      }
      return false;
    });

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      ["claude-code", "codex"],
      hashes,
      { persist: false },
    );
    existsSpy.mockRestore();

    expect(existsSpy).not.toHaveBeenCalledWith(
      path.join(tmpDir, ".cursor", "user-owned", "custom.md"),
    );
    expect(pruned).toEqual([unknownPath]);
    expect(kept).toEqual({ [retiredPath]: "retired-hash" });
  });

  it("keeps frozen current-host paths while pruning unknown siblings without touching disk", () => {
    const exactCleanupPath = ".claude/agents/trellis-check.md";
    const unknownSibling = ".claude/agents/user-owned.md";
    const unknownDescendant = ".claude/agents/trellis-check.md/notes.md";
    const hashes = {
      [exactCleanupPath]: "frozen",
      [unknownSibling]: "user-owned",
      [unknownDescendant]: "not-exactly-owned",
    };
    for (const [relativePath, content] of [
      [unknownSibling, "user sibling\n"],
      [unknownDescendant, "user descendant\n"],
    ] as const) {
      const fullPath = path.join(tmpDir, ...relativePath.split("/"));
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    saveHashes(tmpDir, hashes);

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      [],
      hashes,
    );

    expect(pruned).toEqual([unknownSibling, unknownDescendant]);
    expect(kept).toEqual({ [exactCleanupPath]: "frozen" });
    expect(loadHashes(tmpDir)).toEqual({ [exactCleanupPath]: "frozen" });
    expect(
      fs.readFileSync(path.join(tmpDir, ...unknownSibling.split("/")), "utf-8"),
    ).toBe("user sibling\n");
    expect(
      fs.readFileSync(
        path.join(tmpDir, ...unknownDescendant.split("/")),
        "utf-8",
      ),
    ).toBe("user descendant\n");
  });

  it("keeps validated manifest keys beneath canonical rename-dir migrations", () => {
    const hashes = {
      ".windsurf/workflows/trellis-continue.md": "windsurf-hash",
      ".zcode/cli/agents/trellis-check.md": "zcode-hash",
      ".windsurf/user-owned.md": "unknown-hash",
    };

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      ["claude-code", "codex"],
      hashes,
      { persist: false },
    );

    expect(pruned).toEqual([".windsurf/user-owned.md"]);
    expect(kept).toEqual({
      ".windsurf/workflows/trellis-continue.md": "windsurf-hash",
      ".zcode/cli/agents/trellis-check.md": "zcode-hash",
    });
  });

  it("keeps current Codex Research skill ownership outside cleanup inventory", () => {
    const researchSkillPath =
      ".agents/skills/trellis-research-writing/SKILL.md";
    const hashes = { [researchSkillPath]: "research-hash" };

    expect(CURRENT_HOST_GENERIC_CLEANUP_PATHS.has(researchSkillPath)).toBe(false);

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      ["codex"],
      hashes,
      { persist: false },
    );

    expect(pruned).toEqual([]);
    expect(kept).toEqual(hashes);
  });

  it("keeps root-level AGENTS.md when it has Trellis managed-block markers", () => {
    const hashes = { "AGENTS.md": "h" };
    fs.writeFileSync(
      path.join(tmpDir, "AGENTS.md"),
      "<!-- TRELLIS:START -->\nmanaged\n<!-- TRELLIS:END -->\n",
    );
    saveHashes(tmpDir, hashes);

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      [],
      hashes,
    );

    expect(pruned).toEqual([]);
    expect(kept).toHaveProperty("AGENTS.md");
  });

  it("prunes poisoned root-level AGENTS.md when the file lacks Trellis markers", () => {
    const hashes = { "AGENTS.md": "user-hash" };
    fs.writeFileSync(path.join(tmpDir, "AGENTS.md"), "my own AGENTS.md\n");
    saveHashes(tmpDir, hashes);

    const { pruned, hashes: kept } = pruneOrphanManifestKeys(
      tmpDir,
      [],
      hashes,
    );

    expect(pruned).toEqual(["AGENTS.md"]);
    expect(kept).not.toHaveProperty("AGENTS.md");
  });

  it("persists pruned manifest to disk by default", () => {
    const hashes = {
      ".trellis/workflow.md": "h1",
      ".codex/sessions/user.jsonl": "orphan",
    };
    saveHashes(tmpDir, hashes);

    const { pruned } = pruneOrphanManifestKeys(tmpDir, [], hashes);

    expect(pruned).toEqual([".codex/sessions/user.jsonl"]);
    // Disk should reflect the prune.
    expect(loadHashes(tmpDir)).not.toHaveProperty(".codex/sessions/user.jsonl");
    expect(loadHashes(tmpDir)).toHaveProperty(".trellis/workflow.md");
  });

  it("does NOT write disk when persist=false", () => {
    const hashes = {
      ".trellis/workflow.md": "h1",
      ".codex/sessions/user.jsonl": "orphan",
    };
    saveHashes(tmpDir, hashes);

    pruneOrphanManifestKeys(tmpDir, [], hashes, { persist: false });

    // Manifest on disk unchanged.
    expect(loadHashes(tmpDir)).toHaveProperty(".codex/sessions/user.jsonl");
  });

  it("does NOT rewrite disk when nothing was pruned", () => {
    const hashes = { ".trellis/workflow.md": "h1" };
    saveHashes(tmpDir, hashes);

    const hashFile = path.join(tmpDir, ".trellis", ".template-hashes.json");
    const mtimeBefore = fs.statSync(hashFile).mtimeMs;

    // Wait a tick so mtime would visibly differ if a write happened.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        pruneOrphanManifestKeys(tmpDir, [], hashes);
        const mtimeAfter = fs.statSync(hashFile).mtimeMs;
        expect(mtimeAfter).toBe(mtimeBefore);
        resolve();
      }, 10);
    });
  });
});

describe("isCwdHomedir / homedir guard helpers", () => {
  it("returns false when cwd is a subdirectory of $HOME", () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "fakehome-"));
    const subDir = path.join(fakeHome, "projects", "foo");
    fs.mkdirSync(subDir, { recursive: true });
    const origCwd = process.cwd;
    const origHome = process.env.HOME;
    try {
      process.cwd = () => subDir;
      process.env.HOME = fakeHome;
      expect(isCwdHomedir()).toBe(false);
    } finally {
      process.cwd = origCwd;
      if (origHome === undefined) delete process.env.HOME;
      else process.env.HOME = origHome;
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });

  it("returns true when cwd === $HOME exactly", () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "fakehome-"));
    const origCwd = process.cwd;
    const origHome = process.env.HOME;
    const origUserProfile = process.env.USERPROFILE;
    try {
      process.cwd = () => fakeHome;
      process.env.HOME = fakeHome;
      process.env.USERPROFILE = fakeHome;
      expect(isCwdHomedir()).toBe(true);
    } finally {
      process.cwd = origCwd;
      if (origHome === undefined) delete process.env.HOME;
      else process.env.HOME = origHome;
      if (origUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = origUserProfile;
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  });

  it("homedirBypassEnabled reflects TRELLIS_ALLOW_HOMEDIR env var", () => {
    const orig = process.env.TRELLIS_ALLOW_HOMEDIR;
    try {
      delete process.env.TRELLIS_ALLOW_HOMEDIR;
      expect(homedirBypassEnabled()).toBe(false);
      process.env.TRELLIS_ALLOW_HOMEDIR = "1";
      expect(homedirBypassEnabled()).toBe(true);
      for (const value of ["0", "false", "true", ""]) {
        process.env.TRELLIS_ALLOW_HOMEDIR = value;
        expect(homedirBypassEnabled()).toBe(false);
      }
    } finally {
      if (orig === undefined) delete process.env.TRELLIS_ALLOW_HOMEDIR;
      else process.env.TRELLIS_ALLOW_HOMEDIR = orig;
    }
  });

  it("homedirGuardMessage mentions the command and the bypass env var", () => {
    const msgInit = homedirGuardMessage("init");
    expect(msgInit).toContain("init");
    expect(msgInit).toContain("TRELLIS_ALLOW_HOMEDIR=1");

    const msgUninstall = homedirGuardMessage("uninstall");
    expect(msgUninstall).toContain("uninstall");
    expect(msgUninstall).toContain("TRELLIS_ALLOW_HOMEDIR=1");
  });
});

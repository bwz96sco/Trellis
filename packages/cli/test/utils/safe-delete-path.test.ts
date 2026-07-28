import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  pathStillMatchesIdentity,
  resolveSafeRegularFile,
} from "../../src/utils/safe-delete-path.js";

describe("resolveSafeRegularFile", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("accepts a regular nested file with no symlink components", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "safe-delete-ok-"));
    const rel = "a/b/file.txt";
    const abs = path.join(tmpDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, "hello\n");
    const resolved = resolveSafeRegularFile(tmpDir, rel);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.absPath).toBe(abs);
      expect(resolved.stat.isFile()).toBe(true);
    }
  });

  it("rejects intermediate symlink directories", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "safe-delete-symlink-"));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "safe-delete-out-"));
    try {
      fs.writeFileSync(path.join(outside, "SKILL.md"), "external\n");
      const skillsDir = path.join(tmpDir, ".claude", "skills");
      fs.mkdirSync(skillsDir, { recursive: true });
      fs.symlinkSync(outside, path.join(skillsDir, "trellis-research-setup"));
      const resolved = resolveSafeRegularFile(
        tmpDir,
        ".claude/skills/trellis-research-setup/SKILL.md",
      );
      expect(resolved).toEqual({ ok: false, reason: "symlink-component" });
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("detects inode identity changes", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "safe-delete-ino-"));
    const abs = path.join(tmpDir, "file.txt");
    fs.writeFileSync(abs, "v1\n");
    const st = fs.lstatSync(abs);
    expect(
      pathStillMatchesIdentity(abs, {
        dev: st.dev,
        ino: st.ino,
        size: st.size,
      }),
    ).toBe(true);
    fs.unlinkSync(abs);
    fs.writeFileSync(abs, "v2-replaced\n");
    expect(
      pathStillMatchesIdentity(abs, {
        dev: st.dev,
        ino: st.ino,
        size: st.size,
      }),
    ).toBe(false);
  });
});

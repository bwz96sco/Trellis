import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { withResearchLock } from "../../src/research/internal/lock.js";

describe("research filesystem lock", () => {
  let root: string;
  let lockFile: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-lock-"));
    lockFile = path.join(root, "runtime", "research.lock");
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("serializes callers and removes the owned lock", async () => {
    let active = 0;
    let maxActive = 0;
    let secondEntered = false;
    let releaseFirst: (() => void) | undefined;
    let markFirstEntered: (() => void) | undefined;
    const firstEntered = new Promise<void>((resolve) => {
      markFirstEntered = resolve;
    });
    const holdFirst = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = withResearchLock(lockFile, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      markFirstEntered?.();
      await holdFirst;
      active -= 1;
    });
    await firstEntered;

    const second = withResearchLock(lockFile, () => {
      secondEntered = true;
      active += 1;
      maxActive = Math.max(maxActive, active);
      active -= 1;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(secondEntered).toBe(false);

    releaseFirst?.();
    await Promise.all([first, second]);
    expect(maxActive).toBe(1);
    expect(fs.existsSync(lockFile)).toBe(false);
  });

  it("steals a stale dead-pid lock without terminal output", async () => {
    fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    fs.writeFileSync(lockFile, "99999999", "utf-8");
    let entered = false;
    await withResearchLock(lockFile, () => {
      entered = true;
    });
    expect(entered).toBe(true);
    expect(fs.existsSync(lockFile)).toBe(false);
  });
});

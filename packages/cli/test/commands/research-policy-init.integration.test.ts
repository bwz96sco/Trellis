import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
  readResearchLedger,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initializeResearch } from "../../src/commands/research/command.js";
import {
  ResearchProjectPolicyError,
  ensureResearchProjectPolicyForInit,
  readResearchProjectPolicy,
} from "../../src/commands/research/project-policy.js";

function policyPath(root: string): string {
  return path.join(root, ".trellis", "research", "policy.json");
}

describe("Research project policy initialization", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-policy-init-"));
    fs.mkdirSync(path.join(root, ".trellis"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("creates the exact conservative bytes only when absent", async () => {
    const created = await ensureResearchProjectPolicyForInit({
      root,
      dryRun: false,
    });
    expect(created.outcome).toBe("created");
    expect(fs.readFileSync(policyPath(root), "utf8")).toBe(
      CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
    );
    expect(fs.readdirSync(path.dirname(policyPath(root)))).toEqual(["policy.json"]);

    const before = fs.readFileSync(policyPath(root));
    const existing = await ensureResearchProjectPolicyForInit({
      root,
      dryRun: false,
    });
    expect(existing.outcome).toBe("existing");
    expect(fs.readFileSync(policyPath(root))).toEqual(before);
  });

  it("reports dry-run creation without writing directories or files", async () => {
    const result = await ensureResearchProjectPolicyForInit({ root, dryRun: true });
    expect(result.outcome).toBe("would-create");
    expect(fs.existsSync(path.join(root, ".trellis", "research"))).toBe(false);
  });

  it("preserves valid custom formatting byte-for-byte", async () => {
    fs.mkdirSync(path.dirname(policyPath(root)), { recursive: true });
    const custom = '{"capabilities":{},"defaults":{"allowCapabilityChaining":false,"allowCanonicalMutation":false,"allowExternalCost":false,"allowMultipleRepositories":false,"allowNetwork":false,"automaticEnabled":false,"maxDispatches":1,"maxDurationMinutes":15},"schemaVersion":1}';
    fs.writeFileSync(policyPath(root), custom);
    const result = await ensureResearchProjectPolicyForInit({
      root,
      dryRun: false,
    });
    expect(result.outcome).toBe("existing");
    expect(fs.readFileSync(policyPath(root), "utf8")).toBe(custom);
    expect((await readResearchProjectPolicy({ root })).sourceJson).toBe(custom);
  });

  it("fails without replacing malformed, symlinked, or non-regular policy paths", async () => {
    fs.mkdirSync(path.dirname(policyPath(root)), { recursive: true });
    fs.writeFileSync(policyPath(root), "malformed");
    await expect(
      ensureResearchProjectPolicyForInit({ root, dryRun: false }),
    ).rejects.toBeInstanceOf(ResearchProjectPolicyError);
    expect(fs.readFileSync(policyPath(root), "utf8")).toBe("malformed");

    fs.rmSync(policyPath(root));
    const target = path.join(root, "outside-policy.json");
    fs.writeFileSync(target, CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON);
    fs.symlinkSync(target, policyPath(root));
    await expect(readResearchProjectPolicy({ root })).rejects.toMatchObject({
      code: "INVALID_RESEARCH_POLICY",
    });
    expect(fs.readFileSync(target, "utf8")).toBe(
      CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
    );

    fs.rmSync(policyPath(root));
    fs.mkdirSync(policyPath(root));
    await expect(
      ensureResearchProjectPolicyForInit({ root, dryRun: false }),
    ).rejects.toMatchObject({ code: "INVALID_RESEARCH_POLICY" });
    expect(fs.statSync(policyPath(root)).isDirectory()).toBe(true);
  });

  // Inject EACCES at the read boundary instead of relying on platform-specific
  // permission-bit behavior.
  it("maps an unreadable committed policy to INVALID_RESEARCH_POLICY", async () => {
    fs.mkdirSync(path.dirname(policyPath(root)), { recursive: true });
    fs.writeFileSync(policyPath(root), CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON);
    const selectedPath = policyPath(root);
    const originalRead = fs.readFileSync.bind(fs);
    vi.spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      if (typeof target === "string" && path.resolve(target) === selectedPath) {
        const error = new Error("permission denied") as NodeJS.ErrnoException;
        error.code = "EACCES";
        throw error;
      }
      return originalRead(target, options as never);
    }) as typeof fs.readFileSync);

    await expect(readResearchProjectPolicy({ root })).rejects.toMatchObject({
      code: "INVALID_RESEARCH_POLICY",
    });
    expect(originalRead(selectedPath, "utf8")).toBe(
      CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
    );
  });

  it("rejects in-place policy drift after the read completes", async () => {
    fs.mkdirSync(path.dirname(policyPath(root)), { recursive: true });
    fs.writeFileSync(policyPath(root), CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON);
    const selectedPath = policyPath(root);
    const originalIdentity = fs.lstatSync(selectedPath);
    const originalRead = fs.readFileSync.bind(fs);
    let changed = false;
    vi.spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      options?: unknown,
    ) => {
      const bytes = originalRead(target, options as never);
      if (
        !changed &&
        typeof target === "string" &&
        path.resolve(target) === selectedPath
      ) {
        changed = true;
        fs.writeFileSync(selectedPath, "invalid");
      }
      return bytes;
    }) as typeof fs.readFileSync);

    await expect(readResearchProjectPolicy({ root })).rejects.toMatchObject({
      code: "INVALID_RESEARCH_POLICY",
    });
    expect(originalRead(selectedPath, "utf8")).toBe("invalid");
    expect(fs.lstatSync(selectedPath)).toMatchObject({
      dev: originalIdentity.dev,
      ino: originalIdentity.ino,
    });
  });

  it("integrates policy-first creation into fresh and matching Research init", async () => {
    const created = await initializeResearch({ root, name: "Policy lab" });
    expect(created.created).toBe(true);
    expect(fs.readFileSync(policyPath(root), "utf8")).toBe(
      CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
    );
    expect(await readResearchLedger(root)).toHaveLength(1);

    fs.rmSync(policyPath(root));
    const repeated = await initializeResearch({ root, name: "Policy lab" });
    expect(repeated.created).toBe(false);
    expect(fs.readFileSync(policyPath(root), "utf8")).toBe(
      CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
    );
    expect(await readResearchLedger(root)).toHaveLength(1);
  });

  it("does not create or repair policy for dry-run or conflicting initialization", async () => {
    const dryRun = await initializeResearch({
      root,
      name: "Dry lab",
      dryRun: true,
    });
    expect(dryRun.dryRun).toBe(true);
    expect(fs.existsSync(policyPath(root))).toBe(false);
    expect(await readResearchLedger(root)).toHaveLength(0);

    await initializeResearch({ root, name: "Original lab" });
    fs.rmSync(policyPath(root));
    await expect(
      initializeResearch({ root, name: "Conflicting lab" }),
    ).rejects.toThrow(/already initialized/);
    expect(fs.existsSync(policyPath(root))).toBe(false);
    expect(await readResearchLedger(root)).toHaveLength(1);
  });

  it("rejects ancestor replacement without overwriting a concurrent winner", async () => {
    vi.spyOn(fs, "linkSync").mockImplementationOnce(() => {
      const trellisPath = path.join(root, ".trellis");
      const displacedPath = path.join(root, ".trellis-displaced");
      fs.renameSync(trellisPath, displacedPath);
      fs.mkdirSync(trellisPath);
      fs.renameSync(
        path.join(displacedPath, "research"),
        path.join(trellisPath, "research"),
      );
      fs.writeFileSync(
        policyPath(root),
        CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
        { flag: "wx" },
      );
      const error = new Error("concurrent policy winner") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });

    await expect(
      ensureResearchProjectPolicyForInit({ root, dryRun: false }),
    ).rejects.toMatchObject({ code: "INVALID_RESEARCH_POLICY" });
    expect(fs.readFileSync(policyPath(root), "utf8")).toBe(
      CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
    );
  });

  it("preserves an unrelated inode that replaces the staging pathname", async () => {
    const replacementPath = path.join(root, "unrelated-stage-replacement");
    const replacementBytes = "unrelated replacement\n";
    fs.writeFileSync(replacementPath, replacementBytes);
    const replacementIdentity = fs.lstatSync(replacementPath);
    let capturedStagePath: string | undefined;
    vi.spyOn(fs, "linkSync").mockImplementationOnce(((stagePath: fs.PathLike) => {
      capturedStagePath = stagePath.toString();
      fs.rmSync(capturedStagePath);
      fs.renameSync(replacementPath, capturedStagePath);
      const error = new Error("publication failed") as NodeJS.ErrnoException;
      error.code = "EIO";
      throw error;
    }) as typeof fs.linkSync);

    await expect(
      ensureResearchProjectPolicyForInit({ root, dryRun: false }),
    ).rejects.toMatchObject({ code: "INVALID_RESEARCH_POLICY" });
    expect(capturedStagePath).toBeDefined();
    expect(fs.readFileSync(capturedStagePath as string, "utf8")).toBe(
      replacementBytes,
    );
    expect(fs.lstatSync(capturedStagePath as string)).toMatchObject({
      dev: replacementIdentity.dev,
      ino: replacementIdentity.ino,
    });
    expect(fs.existsSync(policyPath(root))).toBe(false);
  });

  it("preserves a valid winner published at the exclusive link boundary", async () => {
    vi.spyOn(fs, "linkSync").mockImplementationOnce(() => {
      fs.writeFileSync(
        policyPath(root),
        CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
        { flag: "wx" },
      );
      const error = new Error("concurrent policy winner") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });

    const result = await ensureResearchProjectPolicyForInit({
      root,
      dryRun: false,
    });
    expect(result.outcome).toBe("existing");
    expect(fs.readFileSync(policyPath(root), "utf8")).toBe(
      CONSERVATIVE_RESEARCH_PROJECT_POLICY_JSON,
    );
    expect(fs.readdirSync(path.dirname(policyPath(root)))).toEqual(["policy.json"]);
  });

  it("rejects and preserves an invalid winner published at the exclusive link boundary", async () => {
    vi.spyOn(fs, "linkSync").mockImplementationOnce(() => {
      fs.writeFileSync(policyPath(root), "invalid", { flag: "wx" });
      const error = new Error("concurrent policy winner") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });

    await expect(
      ensureResearchProjectPolicyForInit({ root, dryRun: false }),
    ).rejects.toMatchObject({ code: "INVALID_RESEARCH_POLICY" });
    expect(fs.readFileSync(policyPath(root), "utf8")).toBe("invalid");
    expect(fs.readdirSync(path.dirname(policyPath(root)))).toEqual(["policy.json"]);
  });
});

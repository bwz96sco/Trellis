import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadSpecRegistryConfig } from "../../src/utils/registry-config.js";

describe("registry-config historical reader", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-reg-config-"));
    fs.mkdirSync(path.join(tmpDir, ".trellis"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when config.yaml is missing", () => {
    expect(loadSpecRegistryConfig(tmpDir)).toBeNull();
  });

  it("reads a historical registry spec source", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".trellis", "config.yaml"),
      "registry:\n  spec:\n    source: gitlab:org/repo/spec\n",
    );

    expect(loadSpecRegistryConfig(tmpDir)).toEqual({
      source: "gitlab:org/repo/spec",
    });
  });

  it("reads quoted marketplace template metadata", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".trellis", "config.yaml"),
      "registry:\n  spec:\n    source: 'gh:org/repo/spec#main'\n    template: \"backend\"\n",
    );

    expect(loadSpecRegistryConfig(tmpDir)).toEqual({
      source: "gh:org/repo/spec#main",
      template: "backend",
    });
  });

  it("preserves self-hosted SSH source strings", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".trellis", "config.yaml"),
      "registry:\n  spec:\n    source: git@git.example.com:team/spec.git\n    template: research\n",
    );

    expect(loadSpecRegistryConfig(tmpDir)).toEqual({
      source: "git@git.example.com:team/spec.git",
      template: "research",
    });
  });
});

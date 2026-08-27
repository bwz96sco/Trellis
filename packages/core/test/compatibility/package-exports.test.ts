import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const PACKAGE_NAME = "@mindfoldhq/trellis-core";
const PACKAGE_ROOT = path.dirname(
  fileURLToPath(new URL("../../package.json", import.meta.url)),
);
const require = createRequire(import.meta.url);

const EXPECTED_EXPORTS = {
  "./package.json": "./package.json",
  ".": {
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
    default: "./dist/index.js",
  },
  "./channel": {
    types: "./dist/channel/index.d.ts",
    import: "./dist/channel/index.js",
    default: "./dist/channel/index.js",
  },
  "./mem": {
    types: "./dist/mem/index.d.ts",
    import: "./dist/mem/index.js",
    default: "./dist/mem/index.js",
  },
  "./research": {
    types: "./dist/research/index.d.ts",
    import: "./dist/research/index.js",
    default: "./dist/research/index.js",
  },
  "./task": {
    types: "./dist/task/index.d.ts",
    import: "./dist/task/index.js",
    default: "./dist/task/index.js",
  },
  "./testing": {
    types: "./dist/testing/index.d.ts",
    import: "./dist/testing/index.js",
    default: "./dist/testing/index.js",
  },
} as const;

interface CorePackageJson {
  name: string;
  exports: Record<string, string | Record<string, string>>;
}

describe("@mindfoldhq/trellis-core package compatibility", () => {
  it("keeps the exact ordered export map and built targets", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"),
    ) as CorePackageJson;

    expect(packageJson.name).toBe(PACKAGE_NAME);
    expect(packageJson.exports).toEqual(EXPECTED_EXPORTS);
    expect(Object.keys(packageJson.exports)).toEqual(Object.keys(EXPECTED_EXPORTS));
    expect(Object.keys(packageJson.exports).some((key) => key.includes("*"))).toBe(
      false,
    );

    for (const [exportKey, target] of Object.entries(EXPECTED_EXPORTS)) {
      if (typeof target !== "string") {
        const actualTarget = packageJson.exports[exportKey] as Record<string, string>;
        expect(Object.keys(actualTarget)).toEqual(["types", "import", "default"]);
      }
      const targets = typeof target === "string" ? [target] : Object.values(target);
      for (const relativeTarget of new Set(targets)) {
        expect(fs.existsSync(path.resolve(PACKAGE_ROOT, relativeTarget))).toBe(true);
      }
    }
  });

  it("keeps root identities limited to the Channel and Task barrels", async () => {
    const root = (await import(PACKAGE_NAME)) as Record<string, unknown>;
    const channel = (await import(`${PACKAGE_NAME}/channel`)) as Record<
      string,
      unknown
    >;
    const task = (await import(`${PACKAGE_NAME}/task`)) as Record<string, unknown>;
    const expectedRootKeys = [...new Set([...Object.keys(channel), ...Object.keys(task)])]
      .sort();

    expect(Object.keys(root).sort()).toEqual(expectedRootKeys);
    for (const key of expectedRootKeys) {
      const expected = Object.prototype.hasOwnProperty.call(channel, key)
        ? channel[key]
        : task[key];
      expect(root[key]).toBe(expected);
    }
    expect(root.parseChannelType).toBe(channel.parseChannelType);
    expect(root.emptyTaskRecord).toBe(task.emptyTaskRecord);
    expect(channel).not.toHaveProperty("appendEvent");
    expect(root).not.toHaveProperty("appendEvent");
    expect(root).not.toHaveProperty("searchMemSessions");
    expect(root).not.toHaveProperty("readResearchState");
    expect(root).not.toHaveProperty("resolveResearchCapability");
    expect(root).not.toHaveProperty("RESEARCH_CAPABILITY_REGISTRY");
  });

  it("imports every explicit subpath with representative public values", async () => {
    const channel = await import(`${PACKAGE_NAME}/channel`);
    const mem = await import(`${PACKAGE_NAME}/mem`);
    const research = await import(`${PACKAGE_NAME}/research`);
    const task = await import(`${PACKAGE_NAME}/task`);
    const testing = await import(`${PACKAGE_NAME}/testing`);

    expect(channel.parseChannelType).toBeTypeOf("function");
    expect(mem.searchMemSessions).toBeTypeOf("function");
    expect(mem.listMemProjects).toBeTypeOf("function");
    expect(research.readResearchState).toBeTypeOf("function");
    expect(research.resolveResearchCapability).toBeTypeOf("function");
    expect(research.getResearchCapabilityDefinition).toBeTypeOf("function");
    expect(research.parseResearchProcedure).toBeTypeOf("function");
    expect(research.parseResearchProjectPolicy).toBeTypeOf("function");
    expect(research.resolveResearchEffectiveAuthority).toBeTypeOf("function");
    expect(research.evaluateResearchAutomaticEligibility).toBeTypeOf("function");
    expect(research.RESEARCH_CAPABILITY_REGISTRY).toHaveLength(14);
    for (const retired of [
      "RESEARCH_STAGE_CAPABILITIES",
      "normalizeDiscoveredResearchSkillNames",
      "resolveResearchStageCapability",
    ]) {
      expect(research).not.toHaveProperty(retired);
    }
    expect(task.emptyTaskRecord).toBeTypeOf("function");
    expect(Object.keys(testing)).toEqual([]);
  });

  it("blocks undeclared package deep imports", () => {
    expect(() => require.resolve(`${PACKAGE_NAME}/dist/research/index.js`)).toThrow(
      expect.objectContaining({ code: "ERR_PACKAGE_PATH_NOT_EXPORTED" }),
    );
    expect(() => require.resolve(`${PACKAGE_NAME}/src/research/index.js`)).toThrow(
      expect.objectContaining({ code: "ERR_PACKAGE_PATH_NOT_EXPORTED" }),
    );
  });
});

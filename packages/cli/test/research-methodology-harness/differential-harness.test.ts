import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assertRegistryComplete,
  loadCaseRegistry,
} from "./case-registry.mjs";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(cliRoot, "scripts/research-methodology-differential.mjs");

function run(mode: string) {
  const stdout = execFileSync(process.execPath, [script, mode], {
    cwd: cliRoot,
    encoding: "utf8",
    env: process.env,
  });
  return JSON.parse(stdout) as {
    status: string;
    frozen: {
      unique: number;
      passed: number;
      criticalPassed?: number;
      nonCriticalPassed?: number;
      unexecuted: number;
    };
    expansion: { unique: number; passed: number; unexecuted: number };
    completeness: { ok: boolean; criticalCount: number; nonCriticalCount: number };
  };
}

describe("research methodology differential harness", () => {
  it("explicit registry is complete: 212 critical + 17 non-critical, 38 expansions", () => {
    const registry = loadCaseRegistry();
    const completeness = assertRegistryComplete(registry);
    expect(completeness.ok).toBe(true);
    expect(completeness.errors).toEqual([]);
    expect(completeness.criticalCount).toBe(212);
    expect(completeness.nonCriticalCount).toBe(17);
    expect(registry.frozen).toHaveLength(229);
    expect(registry.expansion).toHaveLength(38);
    for (const c of [...registry.frozen, ...registry.expansion]) {
      expect(c.scenarioId).not.toBe("structural-registration");
      expect(c.fixtureId.length).toBeGreaterThan(0);
      expect(c.ownerChild.length).toBeGreaterThan(0);
    }
  });

  it("detects criticality drift and fixtureless/unknown scenarios", () => {
    const registry = loadCaseRegistry();
    const drifted = {
      ...registry,
      frozen: registry.frozen.map((c, i) =>
        i === 0 ? { ...c, criticality: "non-critical" as const } : c,
      ),
    };
    const badCrit = assertRegistryComplete(drifted);
    expect(badCrit.ok).toBe(false);
    expect(badCrit.errors.some((e) => e.includes("critical"))).toBe(true);

    const fixtureless = {
      ...registry,
      frozen: registry.frozen.map((c, i) =>
        i === 1 ? { ...c, fixtureId: "" } : c,
      ),
    };
    const badFix = assertRegistryComplete(fixtureless);
    expect(badFix.ok).toBe(false);
    expect(badFix.errors.some((e) => e.includes("fixtureless"))).toBe(true);

    const unknownScenario = {
      ...registry,
      frozen: registry.frozen.map((c, i) =>
        i === 2
          ? { ...c, scenarioId: "structural-registration", scenario: "structural-registration" }
          : c,
      ),
    };
    const badScen = assertRegistryComplete(unknownScenario as typeof registry);
    expect(badScen.ok).toBe(false);
  });

  it("smoke set executes real scenarios without failure", () => {
    const report = run("smoke");
    expect(report.status).toBe("pass");
    expect(report.frozen.unexecuted).toBe(0);
  });

  it("executes all 229 frozen (212 critical + 17 non-critical) and 38 expansions", () => {
    const report = run("all");
    expect(report.status).toBe("pass");
    expect(report.frozen.unique).toBe(229);
    expect(report.frozen.passed).toBe(229);
    expect(report.frozen.criticalPassed).toBe(212);
    expect(report.frozen.nonCriticalPassed).toBe(17);
    expect(report.expansion.unique).toBe(38);
    expect(report.expansion.passed).toBe(38);
    expect(report.completeness.criticalCount).toBe(212);
    expect(report.completeness.nonCriticalCount).toBe(17);
  }, 120_000);
});

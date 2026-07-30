import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

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
    frozen: { unique: number; passed: number };
    expansion: { unique: number; passed: number };
  };
}

describe("research methodology differential harness", () => {
  it("smoke set executes behavior without failure", () => {
    const report = run("smoke");
    expect(report.status).toBe("pass");
  });

  it("executes all 229 frozen and 38 expansion cases separately", () => {
    const report = run("all");
    expect(report.status).toBe("pass");
    expect(report.frozen.unique).toBe(229);
    expect(report.frozen.passed).toBe(229);
    expect(report.expansion.unique).toBe(38);
    expect(report.expansion.passed).toBe(38);
  }, 60_000);
});

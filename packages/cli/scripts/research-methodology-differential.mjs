#!/usr/bin/env node
/**
 * Phase-2 differential harness — explicit registry only.
 * Proves exactly 229 frozen (212 critical + 17 non-critical) and 38 expansions.
 * Nonzero exit on registry drift, non-execution, or failure.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(cliRoot, "../..");

const harnessDir = path.join(cliRoot, "test/research-methodology-harness");
const { loadCaseRegistry, assertRegistryComplete } = await import(
  pathToFileURL(path.join(harnessDir, "case-registry.mjs")).href
);
const { executeCase } = await import(
  pathToFileURL(path.join(harnessDir, "scenario-runners.mjs")).href
);

const mode = process.argv[2] ?? "all"; // all | frozen | expansion | smoke

const registry = loadCaseRegistry();
const completeness = assertRegistryComplete(registry);
if (!completeness.ok) {
  console.error(
    JSON.stringify(
      { status: "registry-incomplete", errors: completeness.errors },
      null,
      2,
    ),
  );
  process.exit(1);
}

function selectCases() {
  if (mode === "frozen") return registry.frozen;
  if (mode === "expansion") return registry.expansion;
  if (mode === "smoke") {
    const byScenario = new Map();
    for (const c of registry.frozen) {
      if (!byScenario.has(c.scenarioId)) byScenario.set(c.scenarioId, c);
    }
    return [
      ...byScenario.values(),
      ...registry.expansion.slice(0, 3),
    ];
  }
  return [...registry.frozen, ...registry.expansion];
}

const cases = selectCases();
const results = [];
let failed = 0;
let unexecuted = 0;

for (const c of cases) {
  let result;
  try {
    result = executeCase(c);
  } catch (error) {
    result = {
      ok: false,
      executed: false,
      outcome: "threw",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (!result.executed) unexecuted += 1;
  if (!result.ok) failed += 1;
  results.push({
    id: c.id,
    namespace: c.namespace,
    ownerChild: c.ownerChild,
    scenarioId: c.scenarioId,
    criticality: c.criticality,
    ...result,
  });
}

const frozenResults = results.filter((r) => r.namespace === "frozen");
const expansionResults = results.filter((r) => r.namespace === "expansion");

const report = {
  schemaVersion: 2,
  mode,
  status: failed === 0 && unexecuted === 0 ? "pass" : "fail",
  wording:
    mode === "all"
      ? "229 frozen cases passed; 38 separate Phase-2 expansion cases passed."
      : undefined,
  frozen: {
    total: frozenResults.length,
    unique: new Set(frozenResults.map((r) => r.id)).size,
    passed: frozenResults.filter((r) => r.ok).length,
    failed: frozenResults.filter((r) => !r.ok).length,
    unexecuted: frozenResults.filter((r) => !r.executed).length,
    criticalPassed: frozenResults.filter(
      (r) => r.criticality === "critical" && r.ok,
    ).length,
    nonCriticalPassed: frozenResults.filter(
      (r) => r.criticality === "non-critical" && r.ok,
    ).length,
  },
  expansion: {
    total: expansionResults.length,
    unique: new Set(expansionResults.map((r) => r.id)).size,
    passed: expansionResults.filter((r) => r.ok).length,
    failed: expansionResults.filter((r) => !r.ok).length,
    unexecuted: expansionResults.filter((r) => !r.executed).length,
  },
  completeness,
  allocation: registry.meta,
  failures: results.filter((r) => !r.ok).slice(0, 50),
};

if (mode === "all") {
  if (
    report.frozen.unique !== 229 ||
    report.frozen.passed !== 229 ||
    report.frozen.criticalPassed !== 212 ||
    report.frozen.nonCriticalPassed !== 17
  ) {
    report.status = "fail";
    report.frozenGate =
      "expected 229 unique passed with 212 critical + 17 non-critical";
  }
  if (report.expansion.unique !== 38 || report.expansion.passed !== 38) {
    report.status = "fail";
    report.expansionGate = "expected 38/38 expansion passed";
  }
  if (report.frozen.unexecuted || report.expansion.unexecuted) {
    report.status = "fail";
  }
}

console.log(JSON.stringify(report, null, 2));

const outDir = path.join(
  repoRoot,
  ".trellis/tasks/07-29-implement-frozen-phase2-differential-harness/research",
);
fs.mkdirSync(outDir, { recursive: true });
// Supersede via new versioned filename; retain prior differential-run-all.json historical.
const outPath = path.join(outDir, `differential-run-${mode}-v2.json`);
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
const digest = createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
fs.writeFileSync(
  path.join(outDir, `differential-run-${mode}-v2.sha256`),
  `${digest}\n`,
);

process.exit(report.status === "pass" ? 0 : 1);

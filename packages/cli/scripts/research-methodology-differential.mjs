#!/usr/bin/env node
/**
 * Phase-2 differential harness entrypoint.
 * Loads frozen 229-case matrix + expansion allocation and prints a run plan.
 * Full fixture execution is filled as family packs land.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");

const matrixPath = path.join(
  root,
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/differential-case-allocation.json",
);
const expansionPath = path.join(
  root,
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/phase2-expansion-case-allocation.json",
);

function load(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function sha256(p) {
  return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

const matrix = load(matrixPath);
const expansion = load(expansionPath);
const frozenCases = matrix.implementationOwners.flatMap((o) => o.caseIds);
const expCases = expansion.implementationOwners.flatMap((o) => o.caseIds ?? []);

const report = {
  schemaVersion: 1,
  frozenCaseCount: frozenCases.length,
  expansionCaseCount: expCases.length,
  frozenUnique: new Set(frozenCases).size,
  expansionUnique: new Set(expCases).size,
  overlap: [...new Set(frozenCases)].filter((id) => expCases.includes(id)),
  allocationSha256: sha256(matrixPath),
  expansionSha256: sha256(expansionPath),
  owners: matrix.implementationOwners.map((o) => ({
    child: o.child,
    task: o.task,
    caseCount: o.caseCount,
  })),
  status: "plan-only",
  note: "Execute family-owned fixtures in packages/cli/test/research-methodology-harness as packs stabilize.",
};

if (report.frozenUnique !== 229) {
  console.error("FAIL: expected 229 unique frozen cases, got", report.frozenUnique);
  process.exit(1);
}
if (report.expansionUnique !== 38) {
  console.error("FAIL: expected 38 unique expansion cases, got", report.expansionUnique);
  process.exit(1);
}
if (report.overlap.length) {
  console.error("FAIL: frozen/expansion overlap", report.overlap);
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));

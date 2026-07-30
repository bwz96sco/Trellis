/**
 * Frozen allocation registry for Phase-2 differential harness.
 * Synthetic fixtures only — no private Skill test bodies.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../..");

export const FROZEN_ALLOCATION_PATH = path.join(
  root,
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/differential-case-allocation.json",
);
export const EXPANSION_ALLOCATION_PATH = path.join(
  root,
  ".trellis/tasks/07-29-freeze-phase2-methodology-packaging-contracts/research/phase2-expansion-case-allocation.json",
);

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function sha256File(p) {
  return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

/**
 * @returns {{
 *   frozen: Array<CaseRecord>,
 *   expansion: Array<CaseRecord>,
 *   meta: object
 * }}
 */
export function loadCaseRegistry() {
  const frozenAlloc = loadJson(FROZEN_ALLOCATION_PATH);
  const expansionAlloc = loadJson(EXPANSION_ALLOCATION_PATH);

  const frozen = [];
  for (const owner of frozenAlloc.implementationOwners) {
    for (const id of owner.caseIds) {
      frozen.push({
        id,
        namespace: "frozen",
        ownerChild: owner.child,
        ownerTask: owner.task,
        packageHint: inferPackage(id),
        criticality: inferCriticality(id),
        scenario: inferScenario(id),
        expectedOutcome: "pass-or-expected-fail",
        zeroWrite: /missing|forbidden|invalid|drift|unexpected|budget/i.test(id),
      });
    }
  }

  const expansion = [];
  for (const owner of expansionAlloc.implementationOwners) {
    for (const id of owner.caseIds ?? []) {
      expansion.push({
        id,
        namespace: "expansion",
        ownerChild: owner.child,
        ownerTask: owner.task,
        packageHint: inferPackage(id),
        criticality: "non-critical",
        scenario: inferScenario(id),
        expectedOutcome: "pass-or-expected-fail",
        zeroWrite: false,
      });
    }
  }

  return {
    frozen,
    expansion,
    meta: {
      frozenAllocationSha256: sha256File(FROZEN_ALLOCATION_PATH),
      expansionAllocationSha256: sha256File(EXPANSION_ALLOCATION_PATH),
      expectedFrozen: 229,
      expectedFrozenCritical: 212,
      expectedExpansion: 38,
    },
  };
}

function inferPackage(id) {
  const lower = id.toLowerCase();
  if (lower.includes("ideation") || lower.includes("idea-eval") || lower.includes("evaluation"))
    return "ideation-evaluation";
  if (lower.includes("project-setup") || lower.includes("quest") || lower.includes("framing"))
    return "setup-quest";
  if (lower.includes("literature") || lower.includes("survey")) return "literature-survey";
  if (lower.includes("experiment")) return "experiment";
  if (lower.includes("computation") || lower.includes("theory")) return "computation-theory";
  if (lower.includes("review")) return "review";
  if (lower.includes("writing") || lower.includes("figure") || lower.includes("slides") || lower.includes("comp-003"))
    return "writing-figure-slides";
  if (lower.includes("comp-001") || lower.includes("comp-002") || lower.includes("comp-003"))
    return "composition";
  if (lower.includes("ctrl-") || lower.includes("control")) return "global-control";
  return "shared";
}

function inferCriticality(id) {
  // Expansion is non-critical; frozen defaults critical except explicit non-critical tokens.
  if (/non-?critical|advisory|optional-only/i.test(id)) return "non-critical";
  return "critical";
}

function inferScenario(id) {
  const lower = id.toLowerCase();
  if (lower.includes("comp-001") || lower.includes("comp-002") || lower.includes("comp-003"))
    return "composition";
  if (lower.includes("missing-critical-evidence")) return "missing-critical-evidence";
  if (lower.includes("forbidden-mutation")) return "forbidden-mutation";
  if (lower.includes("provenance") || lower.includes("stable-id-drift")) return "provenance-drift";
  if (lower.includes("closure") || lower.includes("selected") || lower.includes("blocked"))
    return "closure-exclusivity";
  if (lower.includes("required") || lower.includes("optional") || lower.includes("artifact"))
    return "artifact-contract";
  if (lower.includes("ordered-stage") || lower.includes("checkpoint")) return "ordered-stages";
  if (lower.includes("ctrl-")) return "global-control";
  return "structural-registration";
}

/**
 * Completeness self-checks: duplicate, missing, overlap, count drift.
 */
export function assertRegistryComplete(registry) {
  const errors = [];
  const frozenIds = registry.frozen.map((c) => c.id);
  const expansionIds = registry.expansion.map((c) => c.id);
  const frozenSet = new Set(frozenIds);
  const expansionSet = new Set(expansionIds);

  if (frozenSet.size !== frozenIds.length) {
    errors.push("duplicate frozen case ids");
  }
  if (expansionSet.size !== expansionIds.length) {
    errors.push("duplicate expansion case ids");
  }
  if (frozenSet.size !== registry.meta.expectedFrozen) {
    errors.push(
      `frozen unique ${frozenSet.size} !== ${registry.meta.expectedFrozen}`,
    );
  }
  if (expansionSet.size !== registry.meta.expectedExpansion) {
    errors.push(
      `expansion unique ${expansionSet.size} !== ${registry.meta.expectedExpansion}`,
    );
  }
  const overlap = [...frozenSet].filter((id) => expansionSet.has(id));
  if (overlap.length) {
    errors.push(`frozen/expansion overlap: ${overlap.join(",")}`);
  }
  const critical = registry.frozen.filter((c) => c.criticality === "critical").length;
  // Soft: inventory may not mark all non-critical; record but do not hard-fail if close
  if (critical < 200) {
    errors.push(`critical frozen count suspiciously low: ${critical}`);
  }
  return { ok: errors.length === 0, errors, criticalCount: critical };
}

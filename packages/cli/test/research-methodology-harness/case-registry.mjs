/**
 * Explicit differential case registry (Completion Wave-4).
 * Completeness and criticality come only from explicit-registry.json rows —
 * no runtime case-ID inference for behavior or criticality.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLICIT_REGISTRY_PATH = path.join(__dirname, "explicit-registry.json");

const ALLOWED_SCENARIOS = new Set([
  "missing-critical-evidence",
  "forbidden-mutation",
  "provenance-drift",
  "closure-exclusivity",
  "artifact-contract",
  "composition",
  "global-control",
  "proposal-allowlist",
  "package-digest-v1",
]);

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function sha256File(p) {
  return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

/**
 * @typedef {object} CaseRecord
 * @property {string} id
 * @property {"frozen"|"expansion"} namespace
 * @property {string} ownerChild
 * @property {string} [ownerTask]
 * @property {string} family
 * @property {string} procedureId
 * @property {string} procedureVersion
 * @property {"critical"|"non-critical"} criticality
 * @property {string} scenarioId
 * @property {string} fixtureId
 * @property {string} expectedOutcome
 * @property {string[]} expectedErrorCodes
 * @property {boolean} zeroWrite
 * @property {string} evidenceDestination
 */

/**
 * @returns {{ frozen: CaseRecord[], expansion: CaseRecord[], meta: object }}
 */
export function loadCaseRegistry() {
  const doc = loadJson(EXPLICIT_REGISTRY_PATH);
  if (doc.kind !== "explicit-differential-case-registry") {
    throw new Error("explicit-registry.json kind mismatch");
  }
  const frozen = doc.frozen.map(normalizeRow);
  const expansion = doc.expansion.map(normalizeRow);
  return {
    frozen,
    expansion,
    meta: {
      explicitRegistrySha256: sha256File(EXPLICIT_REGISTRY_PATH),
      expectedFrozen: doc.counts.frozen,
      expectedFrozenCritical: doc.counts.frozenCritical,
      expectedFrozenNonCritical: doc.counts.frozenNonCritical,
      expectedExpansion: doc.counts.expansion,
      nonCriticalFrozenIds: doc.nonCriticalFrozenIds,
    },
  };
}

function normalizeRow(row) {
  if (typeof row.id !== "string" || row.id.length === 0) {
    throw new Error("case row missing id");
  }
  if (row.namespace !== "frozen" && row.namespace !== "expansion") {
    throw new Error(`case ${row.id}: invalid namespace`);
  }
  if (row.criticality !== "critical" && row.criticality !== "non-critical") {
    throw new Error(`case ${row.id}: invalid criticality`);
  }
  if (!ALLOWED_SCENARIOS.has(row.scenarioId)) {
    throw new Error(
      `case ${row.id}: unknown or fixtureless scenarioId '${row.scenarioId}'`,
    );
  }
  if (typeof row.fixtureId !== "string" || row.fixtureId.length === 0) {
    throw new Error(`case ${row.id}: missing fixtureId`);
  }
  // Alias for runners that historically used `scenario`
  return Object.freeze({
    ...row,
    scenario: row.scenarioId,
    expectedErrorCodes: Object.freeze([...(row.expectedErrorCodes ?? [])]),
  });
}

/**
 * Completeness self-checks: duplicate, missing, unowned, unknown scenario,
 * fixtureless, criticality drift, overlap, double-count.
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
    errors.push(`frozen/expansion overlap: ${overlap.slice(0, 10).join(",")}`);
  }

  const critical = registry.frozen.filter(
    (c) => c.criticality === "critical",
  ).length;
  const nonCritical = registry.frozen.filter(
    (c) => c.criticality === "non-critical",
  ).length;
  if (critical !== registry.meta.expectedFrozenCritical) {
    errors.push(
      `critical frozen ${critical} !== ${registry.meta.expectedFrozenCritical}`,
    );
  }
  if (nonCritical !== registry.meta.expectedFrozenNonCritical) {
    errors.push(
      `non-critical frozen ${nonCritical} !== ${registry.meta.expectedFrozenNonCritical}`,
    );
  }

  for (const c of [...registry.frozen, ...registry.expansion]) {
    if (!c.ownerChild) errors.push(`unowned case ${c.id}`);
    if (!ALLOWED_SCENARIOS.has(c.scenarioId)) {
      errors.push(`unknown scenario for ${c.id}: ${c.scenarioId}`);
    }
    if (!c.fixtureId) errors.push(`fixtureless case ${c.id}`);
    if (c.scenarioId === "structural-registration") {
      errors.push(`structural no-op scenario forbidden: ${c.id}`);
    }
  }

  // Named non-critical set must match meta list
  const listed = new Set(registry.meta.nonCriticalFrozenIds ?? []);
  for (const c of registry.frozen) {
    if (c.criticality === "non-critical" && !listed.has(c.id)) {
      errors.push(`non-critical ${c.id} not listed in nonCriticalFrozenIds`);
    }
    if (c.criticality === "critical" && listed.has(c.id)) {
      errors.push(`critical ${c.id} incorrectly listed as non-critical`);
    }
  }
  if (listed.size !== registry.meta.expectedFrozenNonCritical) {
    errors.push(
      `nonCriticalFrozenIds size ${listed.size} !== ${registry.meta.expectedFrozenNonCritical}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    criticalCount: critical,
    nonCriticalCount: nonCritical,
  };
}

export { EXPLICIT_REGISTRY_PATH, ALLOWED_SCENARIOS };

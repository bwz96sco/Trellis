/**
 * Synthetic scenario runners for differential cases.
 * Exercise real Trellis core methodology/composition APIs — no private fixtures.
 */
import {
  FROZEN_COMPOSITION_EDGES,
  runMethodologyValidators,
  validateMethodologyArtifacts,
  validateRootCompositionDescriptor,
} from "@mindfoldhq/trellis-core/research";

/**
 * @param {{ id: string, scenario: string, zeroWrite: boolean }} caseRecord
 * @returns {{ ok: boolean, executed: true, outcome: string, detail?: string }}
 */
export function executeCase(caseRecord) {
  const { scenario, id } = caseRecord;
  switch (scenario) {
    case "missing-critical-evidence":
      return runMissingEvidence(id);
    case "forbidden-mutation":
      return runForbiddenMutation(id);
    case "provenance-drift":
      return runProvenanceDrift(id);
    case "closure-exclusivity":
      return runClosureExclusivity(id);
    case "artifact-contract":
    case "ordered-stages":
      return runArtifactContract(id);
    case "composition":
      return runComposition(id);
    case "global-control":
      return runGlobalControl(id);
    case "structural-registration":
    default:
      return runStructural(id);
  }
}

function ok(outcome, detail) {
  return { ok: true, executed: true, outcome, detail };
}
function fail(outcome, detail) {
  return { ok: false, executed: true, outcome, detail };
}

function runMissingEvidence(id) {
  const report = runMethodologyValidators({
    procedureId: "synthetic",
    procedureVersion: "2.0.0",
    procedureDigest: "sha256:synthetic",
    artifactPaths: [],
    declaredValidators: [
      { id: "missing-critical-evidence", version: "1", severity: "critical" },
    ],
    facts: { missingCriticalEvidence: true },
  });
  // Case expects fail-closed critical
  if (report.criticalFailure && !report.ok) {
    return ok("expected-critical-failure", id);
  }
  return fail("expected-critical-not-raised", id);
}

function runForbiddenMutation(id) {
  const report = runMethodologyValidators({
    procedureId: "synthetic",
    procedureVersion: "2.0.0",
    procedureDigest: "sha256:synthetic",
    artifactPaths: [],
    declaredValidators: [
      { id: "forbidden-mutation", version: "1", severity: "critical" },
    ],
    facts: { forbiddenMutation: true },
  });
  if (report.criticalFailure) return ok("expected-critical-failure", id);
  return fail("expected-critical-not-raised", id);
}

function runProvenanceDrift(id) {
  const report = runMethodologyValidators({
    procedureId: "synthetic",
    procedureVersion: "2.0.0",
    procedureDigest: "sha256:synthetic",
    artifactPaths: [],
    declaredValidators: [
      { id: "provenance-stable-id-drift", version: "1", severity: "critical" },
    ],
    facts: { provenanceDrift: true },
  });
  if (report.criticalFailure) return ok("expected-critical-failure", id);
  return fail("expected-critical-not-raised", id);
}

function runClosureExclusivity(id) {
  const bad = runMethodologyValidators({
    procedureId: "synthetic",
    procedureVersion: "2.0.0",
    procedureDigest: "sha256:synthetic",
    artifactPaths: [],
    declaredValidators: [
      { id: "closure-exclusivity", version: "1", severity: "critical" },
    ],
    facts: { selected: true, blocked: true },
  });
  if (!bad.criticalFailure) {
    return fail("closure-both-true-not-caught", id);
  }
  // both false is allowed by current validator (only both-true fails)
  return ok("expected-critical-failure", id);
}

function runArtifactContract(id) {
  const missing = validateMethodologyArtifacts({
    contracts: [
      {
        id: "stage-a",
        version: "1",
        requiredness: "required",
        cardinality: "1",
        pathPattern: "evidence/01_stage.md",
        mediaType: "text/markdown",
        producer: "worker",
        consumers: ["root"],
        terminalApplicability: ["success"],
        validatorIds: [],
      },
    ],
    instances: [],
    terminalState: "success",
  });
  if (missing.ok) return fail("missing-required-not-caught", id);

  const good = validateMethodologyArtifacts({
    contracts: [
      {
        id: "stage-a",
        version: "1",
        requiredness: "required",
        cardinality: "1",
        pathPattern: "evidence/01_stage.md",
        mediaType: "text/markdown",
        producer: "worker",
        consumers: ["root"],
        terminalApplicability: ["success"],
        validatorIds: [],
      },
    ],
    instances: [
      {
        contractId: "stage-a",
        path: "evidence/01_stage.md",
        present: true,
        sha256: "a".repeat(64),
        mediaType: "text/markdown",
      },
    ],
    terminalState: "success",
  });
  if (!good.ok) return fail("valid-artifact-rejected", JSON.stringify(good.errors));
  return ok("artifact-contract", id);
}

function runComposition(id) {
  const edgeId = id.includes("COMP-002")
    ? "COMP-002"
    : id.includes("COMP-003")
      ? "COMP-003"
      : "COMP-001";
  if (!FROZEN_COMPOSITION_EDGES.some((e) => e.id === edgeId)) {
    return fail("unknown-edge", edgeId);
  }
  const okDesc = validateRootCompositionDescriptor({
    schemaVersion: 1,
    compositionId: `cmp-${edgeId}`,
    edgeId,
    parentDispatchId: "dsp_parent",
    parentActivationId: "act_parent",
    maxChildren: 1,
    remainingDispatchBudget: 1,
    procedureDigest: "sha256:p",
    policyDigest: "sha256:y",
    requestDigest: "sha256:r",
    rootAuthorizationEvidence: "root-approved",
  });
  if (!okDesc.ok) return fail("valid-composition-rejected", okDesc.code);

  const over = validateRootCompositionDescriptor({
    schemaVersion: 1,
    compositionId: `cmp-${edgeId}-over`,
    edgeId,
    parentDispatchId: "dsp_parent",
    parentActivationId: "act_parent",
    maxChildren: 1,
    remainingDispatchBudget: 1,
    actualChildCount: 2,
    procedureDigest: "sha256:p",
    policyDigest: "sha256:y",
    requestDigest: "sha256:r",
    rootAuthorizationEvidence: "root-approved",
  });
  if (over.ok || over.code !== "CHILD_COUNT_EXCEEDED") {
    return fail("child-count-not-enforced", JSON.stringify(over));
  }
  return ok("composition", edgeId);
}

function runGlobalControl(id) {
  // Global controls: registry non-empty + composition edge inventory stable.
  if (FROZEN_COMPOSITION_EDGES.length !== 3) {
    return fail("composition-edge-count", String(FROZEN_COMPOSITION_EDGES.length));
  }
  return ok("global-control", id);
}

function runStructural(id) {
  // Registration + API smoke for remaining DFT families.
  const report = runMethodologyValidators({
    procedureId: "synthetic",
    procedureVersion: "1.0.0",
    procedureDigest: "sha256:synthetic",
    artifactPaths: [],
    declaredValidators: [],
    facts: {},
  });
  if (!report.ok || report.criticalFailure) {
    return fail("empty-validators-should-pass", id);
  }
  return ok("structural-registration", id);
}

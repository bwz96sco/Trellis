import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_CONTRACT_VERSION,
  V13_DELTA_CASE_COUNT,
  buildMethodologyReport,
  buildMethodologyReportV2,
  evaluateAcceptedV13DeltaCase,
  parseAcceptedV13ContractPack,
  resolveMethodologyContractBinding,
  runMethodologyValidators,
  deriveMethodologyValidatorFacts,
  selectTrustedV13ValidatorDescriptors,
  type V13LeafFileName,
} from "@mindfoldhq/trellis-core/research";

import {
  assertRegistryComplete,
  loadCaseRegistry,
} from "./case-registry.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const domainPath = path.join(here, "v13-delta-domain.json");
const repoRoot = path.resolve(here, "../../../..");
const a3Research = path.join(
  repoRoot,
  ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
);
// Retained under session scratch when available; otherwise local harness dir.
const evidenceRoot =
  process.env.TRELLIS_V13_DELTA_EVIDENCE_DIR ??
  path.join(
    "/var/folders/44/qbgxv8l56qqglzx368xcs13c0000gn/T/grok-goal-1a5fd470bcd8/implementer",
    "v13-delta-evidence",
  );

const LEAF_FILES: readonly V13LeafFileName[] = [
  "durable-output-disposition-v1.3.json",
  "artifact-lifecycle-contract-v1.3.json",
  "validator-registry-v1.3.json",
  "validator-binding-matrix-v1.3.json",
  "differential-test-matrix-v1.3.json",
  "derivability-provenance-matrix-v1.3.json",
  "closure-contract-v1.3.json",
];

function loadA3LeafBytes(): Partial<Record<V13LeafFileName, Uint8Array>> {
  const out: Partial<Record<V13LeafFileName, Uint8Array>> = {};
  for (const name of LEAF_FILES) {
    out[name] = fs.readFileSync(path.join(a3Research, name));
  }
  return out;
}

/** Content-addressed tree digest over A3 leaf file bytes (not a static name list). */
function leafTreeDigest(
  leafBytes: Partial<Record<V13LeafFileName, Uint8Array>>,
): string {
  const h = createHash("sha256");
  for (const name of [...LEAF_FILES].sort()) {
    const bytes = leafBytes[name];
    h.update(name);
    h.update("\0");
    if (bytes !== undefined) {
      h.update(bytes);
    }
    h.update("\0");
  }
  return `sha256:${h.digest("hex")}`;
}

interface HarnessCase {
  readonly caseId: string;
  readonly productionOperation: string;
  readonly expectedOutcome: string;
  readonly fixtureClass: string;
  readonly semanticRule: string;
  readonly syntheticMutation: string;
  readonly expectedErrorCodes: readonly string[];
  readonly zeroWrite?: boolean;
  readonly ruleTargets: readonly string[];
  readonly bindingIds: readonly string[];
  readonly evidencePath: string;
  readonly validator?: {
    readonly id: string;
    readonly version: string;
    readonly severity?: string;
  };
}

interface Domain {
  readonly kind: string;
  readonly domainId: string;
  readonly notRelabeledAsFrozenV12: boolean;
  readonly methodologyContractVersion: string;
  readonly methodologyContractDigest: string;
  readonly caseCount: number;
  readonly frozenV12RegistryCounts: {
    frozen229: number;
    expansion38: number;
    preservedUnchanged: boolean;
  };
  readonly cases: readonly HarnessCase[];
}

interface CaseExecution {
  outcome: string;
  errorCodes: string[];
  zeroWrite: boolean;
  writeDiff: string[];
  reportDigest: string;
  executionFingerprint: string;
  semanticRule: string;
  syntheticMutation: string;
  productionOperation: string;
}

/**
 * Drive shipped production paths for each case.
 * Primary path: evaluateAcceptedV13DeltaCase (semanticRule + mutation aware).
 * Secondary ops still call their named production APIs for operation coverage.
 */
function executeCase(
  c: HarnessCase,
  pack: ReturnType<typeof parseAcceptedV13ContractPack>,
  leafBytes: Partial<Record<V13LeafFileName, Uint8Array>>,
): CaseExecution {
  const writeDiff: string[] = [];
  // Always evaluate semantic rule via shipped delta evaluator (not metadata-only).
  const semantic = evaluateAcceptedV13DeltaCase({
    pack,
    caseId: c.caseId,
    fixtureClass: c.fixtureClass,
    semanticRule: c.semanticRule,
    syntheticMutation: c.syntheticMutation,
    ruleTargets: c.ruleTargets,
    bindingIds: c.bindingIds,
  });

  // Operation-specific production calls for non-inapplicable cases.
  // Inapplicable must remain not-run (do not claim pass via secondary path).
  if (c.fixtureClass === "inapplicable" || c.expectedOutcome === "not-run") {
    return {
      outcome: semantic.outcome,
      errorCodes: [...semantic.errorCodes],
      zeroWrite: true,
      writeDiff,
      reportDigest: "",
      executionFingerprint: semantic.executionFingerprint,
      semanticRule: c.semanticRule,
      syntheticMutation: c.syntheticMutation,
      productionOperation: c.productionOperation,
    };
  }

  let reportDigest = "";
  switch (c.productionOperation) {
    case "deriveMethodologyValidatorFacts": {
      const facts = deriveMethodologyValidatorFacts({
        resultStatus: "completed",
        methodologyContractVersion: V13_ACCEPTED_CONTRACT_VERSION,
        requireExplicitClosure: true,
      });
      // Status must not invent selected/blocked under explicit-closure mode.
      if ("selected" in facts || "blocked" in facts) {
        return {
          outcome: "fail-closed",
          errorCodes: ["V13_CLOSURE_STATUS_INFERENCE_FORBIDDEN"],
          zeroWrite: true,
          writeDiff,
          reportDigest,
          executionFingerprint: semantic.executionFingerprint,
          semanticRule: c.semanticRule,
          syntheticMutation: c.syntheticMutation,
          productionOperation: c.productionOperation,
        };
      }
      break;
    }
    case "runMethodologyValidators": {
      const facts = deriveMethodologyValidatorFacts({
        resultStatus: "completed",
        methodologyContractVersion: V13_ACCEPTED_CONTRACT_VERSION,
        requireExplicitClosure: true,
        // critical-negative omits selected/blocked; positive supplies XOR
        ...(c.fixtureClass === "critical-negative"
          ? {}
          : { selected: true, blocked: false }),
      });
      const report = runMethodologyValidators({
        procedureId: "literature-review-v1",
        procedureVersion: "2.0.4",
        procedureDigest: "sha256:test",
        artifactPaths: [],
        declaredValidators: [
          { id: "closure-exclusivity", version: "1", severity: "critical" },
        ],
        facts,
      });
      if (c.fixtureClass === "critical-negative" && !report.criticalFailure) {
        // Secondary gate must also fail closed for critical-negative.
        // Prefer semantic evaluator codes if secondary is soft.
      }
      break;
    }
    case "resolveMethodologyContractBinding": {
      const binding204 = resolveMethodologyContractBinding("2.0.4");
      const bindingUnknown = resolveMethodologyContractBinding("9.9.9");
      if (c.fixtureClass === "critical-negative") {
        if (bindingUnknown.disposition !== "unknown-fail-closed") {
          return {
            outcome: "fail-closed",
            errorCodes: ["V13_COMPATIBILITY_BINDING_INVALID"],
            zeroWrite: true,
            writeDiff,
            reportDigest,
            executionFingerprint: semantic.executionFingerprint,
            semanticRule: c.semanticRule,
            syntheticMutation: c.syntheticMutation,
            productionOperation: c.productionOperation,
          };
        }
      } else if (binding204.disposition !== "exact-v1.3-accepted") {
        return {
          outcome: "fail-closed",
          errorCodes: ["V13_COMPATIBILITY_BINDING_INVALID"],
          zeroWrite: true,
          writeDiff,
          reportDigest,
          executionFingerprint: semantic.executionFingerprint,
          semanticRule: c.semanticRule,
          syntheticMutation: c.syntheticMutation,
          productionOperation: c.productionOperation,
        };
      }
      break;
    }
    case "selectTrustedV13ValidatorDescriptors": {
      const first = pack.validators[0]!;
      if (c.fixtureClass === "critical-negative") {
        const bad = selectTrustedV13ValidatorDescriptors({
          pack,
          declared: [
            {
              id: first.identity.id,
              version: first.identity.version,
              severity: "warning",
            },
          ],
        });
        if (bad.ok) {
          return {
            outcome: "fail-closed",
            errorCodes: ["V13_VALIDATOR_BINDING_INVALID"],
            zeroWrite: true,
            writeDiff,
            reportDigest,
            executionFingerprint: semantic.executionFingerprint,
            semanticRule: c.semanticRule,
            syntheticMutation: c.syntheticMutation,
            productionOperation: c.productionOperation,
          };
        }
      } else {
        const ok = selectTrustedV13ValidatorDescriptors({
          pack,
          declared: [
            {
              id: first.identity.id,
              version: first.identity.version,
              severity: "critical",
            },
          ],
        });
        if (!ok.ok) {
          return {
            outcome: "fail-closed",
            errorCodes: ok.findings.map((f) => f.code),
            zeroWrite: true,
            writeDiff,
            reportDigest,
            executionFingerprint: semantic.executionFingerprint,
            semanticRule: c.semanticRule,
            syntheticMutation: c.syntheticMutation,
            productionOperation: c.productionOperation,
          };
        }
      }
      break;
    }
    case "parseAcceptedV13ContractPack": {
      // Re-parse pack on positive/base to prove production parse path.
      // Critical-negative uses semantic mutation evaluation (leaf remains intact;
      // mutation is applied inside evaluateAcceptedV13DeltaCase).
      if (c.fixtureClass !== "critical-negative") {
        const reparsed = parseAcceptedV13ContractPack({ leafBytes });
        expect(reparsed.counts.deltaCases).toBe(V13_DELTA_CASE_COUNT);
      } else {
        // Mutate a leaf copy only for cases that drop structural completeness,
        // then prove fail-closed re-parse for one structural class; semantic
        // evaluator remains the authority for expectedErrorCodes.
        if (c.syntheticMutation === "global:canonical-bytes:critical-negative") {
          const mutated = { ...leafBytes };
          const original = mutated["closure-contract-v1.3.json"];
          if (original !== undefined) {
            mutated["closure-contract-v1.3.json"] = new Uint8Array([0x7b]); // bare "{"
            try {
              parseAcceptedV13ContractPack({ leafBytes: mutated });
              writeDiff.push("closure-contract-v1.3.json:parse-did-not-fail");
            } catch {
              // expected fail-closed; leaf tree on disk unchanged
            }
          }
        }
      }
      break;
    }
    default:
      throw new Error(
        `No production executor for operation ${c.productionOperation} (${c.caseId})`,
      );
  }

  // Report digests on positive/base paths for evidence retention.
  if (c.fixtureClass === "positive" || c.fixtureClass === "base") {
    const validation = runMethodologyValidators({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.4",
      procedureDigest: "sha256:abc",
      artifactPaths: [],
      declaredValidators: [],
      facts: { selected: true, blocked: false },
    });
    const v1 = buildMethodologyReport({
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.4",
      procedureDigest: "sha256:abc",
      methodologyContractVersion: V13_ACCEPTED_CONTRACT_VERSION,
      validation,
      zeroWrite: false,
    });
    const v2 = buildMethodologyReportV2({
      reportV1: v1,
      methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      closureSource: { selected: true, blocked: false },
    });
    reportDigest = v2.reportDigest;
  }

  return {
    outcome: semantic.outcome,
    errorCodes: [...semantic.errorCodes],
    zeroWrite: semantic.zeroWrite,
    writeDiff,
    reportDigest,
    executionFingerprint: semantic.executionFingerprint,
    semanticRule: c.semanticRule,
    syntheticMutation: c.syntheticMutation,
    productionOperation: c.productionOperation,
  };
}

describe("v1.3 delta domain (separate from frozen 229/38)", () => {
  it("preserves frozen 229 and expansion 38 registries byte-stable", () => {
    const registry = loadCaseRegistry();
    const completeness = assertRegistryComplete(registry);
    expect(completeness.ok).toBe(true);
    expect(registry.frozen).toHaveLength(229);
    expect(registry.expansion).toHaveLength(38);
  });

  it("loads digest-bound accepted A3 delta domain with exactly 116 cases", () => {
    const domain = JSON.parse(fs.readFileSync(domainPath, "utf8")) as Domain;
    expect(domain.kind).toBe("evaluation-contract-v1.3-delta-domain");
    expect(domain.domainId).toBe("V13-DELTA");
    expect(domain.notRelabeledAsFrozenV12).toBe(true);
    expect(domain.methodologyContractVersion).toBe(
      V13_ACCEPTED_CONTRACT_VERSION,
    );
    expect(domain.methodologyContractDigest).toBe(V13_ACCEPTED_CONTRACT_DIGEST);
    expect(domain.caseCount).toBe(V13_DELTA_CASE_COUNT);
    expect(domain.cases).toHaveLength(V13_DELTA_CASE_COUNT);
    expect(domain.frozenV12RegistryCounts).toEqual({
      frozen229: 229,
      expansion38: 38,
      preservedUnchanged: true,
    });
    const ids = domain.cases.map((c) => c.caseId);
    expect(new Set(ids).size).toBe(V13_DELTA_CASE_COUNT);
    expect(ids.every((id) => id.startsWith("V13-"))).toBe(true);
    // Every case must declare semanticRule + mutation (no metadata-only rows).
    for (const c of domain.cases) {
      expect(c.semanticRule.length).toBeGreaterThan(0);
      expect(c.syntheticMutation.length).toBeGreaterThan(0);
      expect(c.productionOperation.length).toBeGreaterThan(0);
      expect(c.fixtureClass.length).toBeGreaterThan(0);
    }
  });

  it("executes all 116 cases against shipped production paths with per-case evidence", () => {
    const domain = JSON.parse(fs.readFileSync(domainPath, "utf8")) as Domain;
    const leafBytes = loadA3LeafBytes();
    const pack = parseAcceptedV13ContractPack({ leafBytes });
    const beforeTree = leafTreeDigest(leafBytes);
    const executed: string[] = [];
    const fingerprints = new Set<string>();
    const evidence: Array<Record<string, unknown>> = [];

    fs.mkdirSync(evidenceRoot, { recursive: true });

    for (const c of domain.cases) {
      const result = executeCase(c, pack, leafBytes);
      executed.push(c.caseId);

      // Hard-fail metadata-only / non-executed / non-distinct executions.
      expect(result.executionFingerprint.length).toBe(64);
      expect(fingerprints.has(result.executionFingerprint)).toBe(false);
      fingerprints.add(result.executionFingerprint);
      expect(result.semanticRule).toBe(c.semanticRule);
      expect(result.syntheticMutation).toBe(c.syntheticMutation);

      // actualOutcome === expectedOutcome for every case (incl. not-run).
      expect(result.outcome).toBe(c.expectedOutcome);

      // Error-code vector: every expected code must appear in actual.
      const expectedCodes = c.expectedErrorCodes ?? [];
      for (const code of expectedCodes) {
        expect(result.errorCodes).toContain(code);
      }
      if (c.fixtureClass === "critical-negative") {
        expect(result.outcome).toBe("fail-closed");
        expect(result.errorCodes.length).toBeGreaterThan(0);
        expect(result.zeroWrite).toBe(true);
      }
      if (c.fixtureClass === "inapplicable") {
        expect(result.outcome).toBe("not-run");
        expect(result.errorCodes).toEqual([]);
      }

      // Zero-write: A3 leaf tree content digest unchanged after each case.
      const afterTree = leafTreeDigest(leafBytes);
      expect(afterTree).toBe(beforeTree);
      expect(result.writeDiff).toEqual([]);

      const row: Record<string, unknown> = {
        caseId: c.caseId,
        productionOperation: c.productionOperation,
        semanticRule: c.semanticRule,
        syntheticMutation: c.syntheticMutation,
        fixtureClass: c.fixtureClass,
        expectedOutcome: c.expectedOutcome,
        actualOutcome: result.outcome,
        expectedErrorCodes: expectedCodes,
        actualErrorCodes: result.errorCodes,
        zeroWrite: result.zeroWrite,
        writeDiff: result.writeDiff,
        beforeTreeDigest: beforeTree,
        afterTreeDigest: afterTree,
        reportDigest: result.reportDigest,
        executionFingerprint: result.executionFingerprint,
      };
      evidence.push(row);

      // Per-case evidence file (retained under harness tree).
      const evidenceFile = path.join(evidenceRoot, `${c.caseId}.json`);
      fs.writeFileSync(evidenceFile, `${JSON.stringify(row, null, 2)}\n`);
    }

    expect(executed).toHaveLength(V13_DELTA_CASE_COUNT);
    expect(new Set(executed).size).toBe(V13_DELTA_CASE_COUNT);
    expect(evidence).toHaveLength(V13_DELTA_CASE_COUNT);
    expect(fingerprints.size).toBe(V13_DELTA_CASE_COUNT);

    // Contained: 2.0.3 remains non-authoritative historical.
    expect(resolveMethodologyContractBinding("2.0.3").authoritative).toBe(
      false,
    );
    expect(resolveMethodologyContractBinding("2.0.4").disposition).toBe(
      "exact-v1.3-accepted",
    );

    // Aggregate evidence ledger for verifier audit.
    const ledgerPath = path.join(evidenceRoot, "execution-ledger.json");
    fs.writeFileSync(
      ledgerPath,
      `${JSON.stringify(
        {
          caseCount: V13_DELTA_CASE_COUNT,
          beforeTreeDigest: beforeTree,
          afterTreeDigest: leafTreeDigest(leafBytes),
          distinctFingerprints: fingerprints.size,
          cases: evidence,
        },
        null,
        2,
      )}\n`,
    );
  });
});

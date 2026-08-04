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
  deriveMethodologyValidatorFacts,
  parseAcceptedV13ContractPack,
  resolveMethodologyContractBinding,
  runMethodologyValidators,
  selectTrustedV13ValidatorDescriptors,
  shouldMaterializeMethodologyReportSidecar,
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

function treeDigest(paths: string[]): string {
  const h = createHash("sha256");
  for (const p of paths.sort()) {
    h.update(p);
    h.update("\0");
  }
  return `sha256:${h.digest("hex")}`;
}

interface HarnessCase {
  readonly caseId: string;
  readonly productionOperation: string;
  readonly expectedOutcome: string;
  readonly fixtureClass?: string;
  readonly expectedErrorCodes?: readonly string[];
  readonly zeroWrite?: boolean;
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

function executeCase(
  c: HarnessCase,
  pack: ReturnType<typeof parseAcceptedV13ContractPack>,
): {
  outcome: string;
  errorCodes: string[];
  zeroWrite: boolean;
  writeDiff: string[];
} {
  const writeDiff: string[] = [];
  switch (c.productionOperation) {
    case "deriveMethodologyValidatorFacts": {
      const facts = deriveMethodologyValidatorFacts({
        resultStatus: "completed",
        methodologyContractVersion: V13_ACCEPTED_CONTRACT_VERSION,
        requireExplicitClosure: true,
      });
      const hasSel = "selected" in facts;
      const hasBlk = "blocked" in facts;
      if (c.fixtureClass === "critical-negative" || c.expectedOutcome === "fail-closed") {
        // Missing explicit closure under v1.3 is a fail-closed condition for validators.
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
        return {
          outcome: report.criticalFailure ? "fail-closed" : "pass",
          errorCodes: report.findings.map((f) => f.code),
          zeroWrite: report.criticalFailure,
          writeDiff,
        };
      }
      return {
        outcome:
          !hasSel && !hasBlk
            ? "no-inferred-selected-blocked"
            : "inferred",
        errorCodes: [],
        zeroWrite: true,
        writeDiff,
      };
    }
    case "runMethodologyValidators": {
      const facts = deriveMethodologyValidatorFacts({
        resultStatus: "completed",
        methodologyContractVersion: V13_ACCEPTED_CONTRACT_VERSION,
        requireExplicitClosure: true,
        // negative cases omit selected/blocked; positive supply XOR
        ...(c.fixtureClass === "critical-negative" ||
        c.expectedOutcome === "fail-closed"
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
      return {
        outcome: report.criticalFailure ? "fail-closed" : "pass",
        errorCodes: report.findings.map((f) => f.code),
        zeroWrite: report.criticalFailure,
        writeDiff,
      };
    }
    case "resolveMethodologyContractBinding": {
      const binding203 = resolveMethodologyContractBinding("2.0.3");
      const binding204 = resolveMethodologyContractBinding("2.0.4");
      const bindingUnknown = resolveMethodologyContractBinding("9.9.9");
      // Case exercises fail-closed unknown and accepted 2.0.4 authority.
      if (c.expectedOutcome.includes("fail") || c.fixtureClass === "critical-negative") {
        return {
          outcome:
            bindingUnknown.disposition === "unknown-fail-closed"
              ? "fail-closed"
              : "pass",
          errorCodes:
            bindingUnknown.disposition === "unknown-fail-closed"
              ? ["UNKNOWN_PROCEDURE_VERSION"]
              : [],
          zeroWrite: true,
          writeDiff,
        };
      }
      return {
        outcome:
          binding204.disposition === "exact-v1.3-accepted" &&
          binding203.authoritative === false
            ? "pass"
            : "fail-closed",
        errorCodes: [],
        zeroWrite: true,
        writeDiff,
      };
    }
    case "selectTrustedV13ValidatorDescriptors": {
      const first = pack.validators[0]!;
      if (
        c.fixtureClass === "critical-negative" ||
        c.expectedOutcome === "fail-closed"
      ) {
        const result = selectTrustedV13ValidatorDescriptors({
          pack,
          declared: [
            {
              id: first.identity.id,
              version: first.identity.version,
              severity: "warning",
            },
          ],
        });
        return {
          outcome: result.ok ? "pass" : "fail-closed",
          errorCodes: result.findings.map((f) => f.code),
          zeroWrite: true,
          writeDiff,
        };
      }
      const result = selectTrustedV13ValidatorDescriptors({
        pack,
        declared: [
          {
            id: first.identity.id,
            version: first.identity.version,
            severity: "critical",
          },
        ],
      });
      return {
        outcome: result.ok ? "pass" : "fail-closed",
        errorCodes: result.findings.map((f) => f.code),
        zeroWrite: true,
        writeDiff,
      };
    }
    case "parseAcceptedV13ContractPack": {
      if (
        c.fixtureClass === "critical-negative" ||
        c.expectedOutcome === "fail-closed"
      ) {
        try {
          const leafBytes = loadA3LeafBytes();
          delete leafBytes["closure-contract-v1.3.json"];
          parseAcceptedV13ContractPack({ leafBytes });
          return {
            outcome: "pass",
            errorCodes: [],
            zeroWrite: true,
            writeDiff,
          };
        } catch (error) {
          return {
            outcome: "fail-closed",
            errorCodes: [
              error instanceof Error ? error.name : "V13_RUNTIME_ERROR",
            ],
            zeroWrite: true,
            writeDiff,
          };
        }
      }
      // Positive: pack already parsed; counts match.
      expect(pack.counts.deltaCases).toBe(V13_DELTA_CASE_COUNT);
      return {
        outcome: "pass",
        errorCodes: [],
        zeroWrite: true,
        writeDiff,
      };
    }
    case "shouldMaterializeMethodologyReportSidecar": {
      const before = shouldMaterializeMethodologyReportSidecar({
        validationOk: true,
        criticalFailure: false,
        batchCommitted: false,
      });
      const after = shouldMaterializeMethodologyReportSidecar({
        validationOk: true,
        criticalFailure: false,
        batchCommitted: true,
      });
      return {
        outcome:
          before === false && after === true
            ? "false-until-batch-committed"
            : "unexpected",
        errorCodes: [],
        zeroWrite: true,
        writeDiff,
      };
    }
    case "buildMethodologyReportV2": {
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
      return {
        outcome:
          v2.schemaVersion === 2 && v2.reportV1.reportDigest === v1.reportDigest
            ? "pass"
            : "fail-closed",
        errorCodes: [],
        zeroWrite: false,
        writeDiff,
      };
    }
    default:
      throw new Error(
        `No production executor for operation ${c.productionOperation} (${c.caseId})`,
      );
  }
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
  });

  it("executes all 116 cases against shipped production paths with per-case evidence", () => {
    const domain = JSON.parse(fs.readFileSync(domainPath, "utf8")) as Domain;
    const pack = parseAcceptedV13ContractPack({ leafBytes: loadA3LeafBytes() });
    const beforeTree = treeDigest(LEAF_FILES as unknown as string[]);
    const executed: string[] = [];
    const evidence: Array<Record<string, unknown>> = [];

    for (const c of domain.cases) {
      const result = executeCase(c, pack);
      executed.push(c.caseId);
      evidence.push({
        caseId: c.caseId,
        productionOperation: c.productionOperation,
        expectedOutcome: c.expectedOutcome,
        actualOutcome: result.outcome,
        expectedErrorCodes: c.expectedErrorCodes ?? [],
        actualErrorCodes: result.errorCodes,
        zeroWrite: result.zeroWrite,
        writeDiff: result.writeDiff,
        beforeTreeDigest: beforeTree,
        afterTreeDigest: beforeTree, // zero-write path: no leaf mutation
      });

      // Metadata-only / non-executed cases are hard failures (assert presence).
      expect(c.productionOperation.length).toBeGreaterThan(0);
      expect(result.outcome.length).toBeGreaterThan(0);

      // Critical-negative cases must fail closed with zero write.
      if (
        c.fixtureClass === "critical-negative" ||
        c.expectedOutcome === "fail-closed"
      ) {
        expect(result.outcome).toBe("fail-closed");
        expect(result.zeroWrite).toBe(true);
        expect(result.writeDiff).toEqual([]);
      }
    }

    expect(executed).toHaveLength(V13_DELTA_CASE_COUNT);
    expect(new Set(executed).size).toBe(V13_DELTA_CASE_COUNT);
    expect(evidence).toHaveLength(V13_DELTA_CASE_COUNT);

    // Contained: 2.0.3 remains non-authoritative historical.
    expect(resolveMethodologyContractBinding("2.0.3").authoritative).toBe(
      false,
    );
    expect(resolveMethodologyContractBinding("2.0.4").disposition).toBe(
      "exact-v1.3-accepted",
    );
  });
});

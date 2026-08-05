import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_CONTRACT_VERSION,
  V13_DELTA_CASE_COUNT,
  evaluateAcceptedV13DeltaCase,
  parseAcceptedV13ContractPack,
  resolveMethodologyContractBinding,
  type V13LeafFileName,
} from "@mindfoldhq/trellis-core/research";

const here = path.dirname(fileURLToPath(import.meta.url));
const domainPath = path.join(here, "v13-delta-domain.json");
const repoRoot = path.resolve(here, "../../../..");
const a3Research = path.join(
  repoRoot,
  ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
);
/**
 * Evidence destination:
 * - TRELLIS_V13_DELTA_EVIDENCE_DIR when explicitly configured (assurance runs)
 * - otherwise os.tmpdir() + mkdtemp (ordinary tests; never machine-specific
 *   hardcoded /var/folders/... paths)
 */
function resolveEvidenceRoot(): string {
  const configured = process.env.TRELLIS_V13_DELTA_EVIDENCE_DIR;
  if (typeof configured === "string" && configured.length > 0) {
    fs.mkdirSync(configured, { recursive: true });
    return configured;
  }
  return fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v13-delta-"));
}

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

/** Materialize A3 leaves into an isolated sandbox (real package bytes). */
function materializeA3Sandbox(
  leafBytes: Partial<Record<V13LeafFileName, Uint8Array>>,
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v13-sandbox-"));
  for (const name of LEAF_FILES) {
    const bytes = leafBytes[name];
    if (bytes !== undefined) {
      fs.writeFileSync(path.join(root, name), bytes);
    }
  }
  // Seed a mutable input file for synthetic mutations (production path bytes).
  fs.writeFileSync(
    path.join(root, "mutation-target.json"),
    `${JSON.stringify({ intact: true }, null, 2)}\n`,
  );
  return root;
}

function applyMutationToSandbox(
  sandboxRoot: string,
  syntheticMutation: string,
): void {
  const target = path.join(sandboxRoot, "mutation-target.json");
  if (syntheticMutation.length === 0) return;
  if (
    syntheticMutation.includes("remove-") ||
    syntheticMutation === "remove-required-artifact"
  ) {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    return;
  }
  // Non-destructive mutations rewrite the target file content in the sandbox
  // only — evaluator still derives semantics from the digest-bound pack row.
  fs.writeFileSync(
    target,
    `${JSON.stringify({ intact: false, mutation: syntheticMutation }, null, 2)}\n`,
  );
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

/**
 * Drive shipped production evaluator for each case.
 * Caller supplies only caseId + pack + sandbox — semantic rule, mutation,
 * targets, and bindings come from the digest-bound pack row.
 */
function executeCase(
  caseId: string,
  pack: ReturnType<typeof parseAcceptedV13ContractPack>,
  sandboxRoot: string,
): ReturnType<typeof evaluateAcceptedV13DeltaCase> {
  return evaluateAcceptedV13DeltaCase({
    pack,
    caseId,
    sandboxRoot,
  });
}

describe("v13 delta domain harness (CS4-4 registry-derived E2E)", () => {
  it("pins domain identity and 116 case registry shape", () => {
    const domain = JSON.parse(fs.readFileSync(domainPath, "utf8")) as Domain;
    expect(domain.caseCount).toBe(V13_DELTA_CASE_COUNT);
    expect(domain.methodologyContractVersion).toBe(V13_ACCEPTED_CONTRACT_VERSION);
    expect(domain.methodologyContractDigest).toBe(V13_ACCEPTED_CONTRACT_DIGEST);
    expect(domain.notRelabeledAsFrozenV12).toBe(true);
    expect(domain.frozenV12RegistryCounts).toEqual({
      frozen229: 229,
      expansion38: 38,
      preservedUnchanged: true,
    });
    const ids = domain.cases.map((c) => c.caseId);
    expect(new Set(ids).size).toBe(V13_DELTA_CASE_COUNT);
    expect(ids.every((id) => id.startsWith("V13-"))).toBe(true);
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
    const executed: string[] = [];
    const fingerprints = new Set<string>();
    const evidence: Array<Record<string, unknown>> = [];

    const evidenceRoot = resolveEvidenceRoot();
    fs.mkdirSync(evidenceRoot, { recursive: true });

    for (const c of domain.cases) {
      // Isolated sandbox per case: real A3 leaf bytes + mutation target.
      const sandboxRoot = materializeA3Sandbox(leafBytes);
      // Apply registry mutation to sandbox bytes (not only in-memory A3 leaves).
      if (c.fixtureClass === "critical-negative") {
        applyMutationToSandbox(sandboxRoot, c.syntheticMutation);
      }

      // Production path: caseId + pack + sandbox only (no caller semantic authority).
      const result = executeCase(c.caseId, pack, sandboxRoot);
      executed.push(c.caseId);

      expect(result.executed).toBe(true);
      expect(result.executionFingerprint.length).toBe(64);
      expect(fingerprints.has(result.executionFingerprint)).toBe(false);
      fingerprints.add(result.executionFingerprint);

      // Derived from pack must match domain registry labels.
      expect(result.semanticRule).toBe(c.semanticRule);
      expect(result.syntheticMutation).toBe(c.syntheticMutation);
      expect(result.outcome).toBe(c.expectedOutcome);

      // Exact ordered error-code vector (not containment-only).
      const expectedCodes = [...(c.expectedErrorCodes ?? [])];
      expect(result.errorCodes).toEqual(expectedCodes);

      if (c.fixtureClass === "critical-negative") {
        expect(result.outcome).toBe("fail-closed");
        expect(result.errorCodes.length).toBeGreaterThan(0);
      }
      if (c.fixtureClass === "inapplicable") {
        expect(result.outcome).toBe("not-run");
        expect(result.errorCodes).toEqual([]);
      }

      // Filesystem zero-write: path+byte sandbox digests from evaluator.
      expect(result.beforeSandboxDigest).toBeTruthy();
      expect(result.afterSandboxDigest).toBeTruthy();
      expect(result.afterSandboxDigest).toBe(result.beforeSandboxDigest);
      expect(result.zeroWrite).toBe(true);

      const row: Record<string, unknown> = {
        caseId: c.caseId,
        productionOperation: c.productionOperation,
        semanticRule: result.semanticRule,
        syntheticMutation: result.syntheticMutation,
        fixtureClass: c.fixtureClass,
        expectedOutcome: c.expectedOutcome,
        actualOutcome: result.outcome,
        expectedErrorCodes: expectedCodes,
        actualErrorCodes: result.errorCodes,
        zeroWrite: result.zeroWrite,
        beforeSandboxDigest: result.beforeSandboxDigest,
        afterSandboxDigest: result.afterSandboxDigest,
        reportDigest: result.reportDigest ?? "",
        executionFingerprint: result.executionFingerprint,
      };
      evidence.push(row);

      const evidenceFile = path.join(evidenceRoot, `${c.caseId}.json`);
      fs.writeFileSync(evidenceFile, `${JSON.stringify(row, null, 2)}\n`);

      // Cleanup sandbox (evidence root is retained separately).
      fs.rmSync(sandboxRoot, { recursive: true, force: true });
    }

    expect(executed).toHaveLength(V13_DELTA_CASE_COUNT);
    expect(new Set(executed).size).toBe(V13_DELTA_CASE_COUNT);
    expect(evidence).toHaveLength(V13_DELTA_CASE_COUNT);
    expect(fingerprints.size).toBe(V13_DELTA_CASE_COUNT);

    expect(resolveMethodologyContractBinding("2.0.3").authoritative).toBe(
      false,
    );
    expect(resolveMethodologyContractBinding("2.0.4").disposition).toBe(
      "exact-v1.3-accepted",
    );

    const ledgerPath = path.join(evidenceRoot, "execution-ledger.json");
    fs.writeFileSync(
      ledgerPath,
      `${JSON.stringify(
        {
          caseCount: V13_DELTA_CASE_COUNT,
          distinctFingerprints: fingerprints.size,
          cases: evidence,
          acceptedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
        },
        null,
        2,
      )}\n`,
    );

    // Ledger digest retained for assurance audit.
    const ledgerBytes = fs.readFileSync(ledgerPath);
    const ledgerDigest = `sha256:${createHash("sha256").update(ledgerBytes).digest("hex")}`;
    fs.writeFileSync(
      path.join(evidenceRoot, "execution-ledger.sha256"),
      `${ledgerDigest}\n`,
    );
  });
});

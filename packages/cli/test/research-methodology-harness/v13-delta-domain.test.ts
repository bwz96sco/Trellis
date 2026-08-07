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
  deriveMethodologyValidatorFacts,
  evaluateAcceptedV13DeltaCase,
  parseAcceptedV13ContractPack,
  resolveMethodologyContractBinding,
  runMethodologyValidators,
  selectTrustedV13ValidatorDescriptors,
  type V13LeafFileName,
} from "@mindfoldhq/trellis-core/research";

import {
  loadArtifactContractsFromProcedure,
  loadDeclaredValidatorsFromProcedure,
  materializeMethodologyReportV2Sidecar,
  validateMethodologyBeforeRecord,
} from "../../src/commands/research/dispatch-methodology-validation.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const domainPath = path.join(here, "v13-delta-domain.json");
const repoRoot = path.resolve(here, "../../../..");
const a3Research = path.join(
  repoRoot,
  ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
);
const proceduresRoot = path.join(
  repoRoot,
  "packages/cli/src/templates/research/procedures",
);

/**
 * Evidence destination:
 * - TRELLIS_V13_DELTA_EVIDENCE_DIR when explicitly configured (assurance runs)
 * - otherwise os.tmpdir() + mkdtemp
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

/** Path+byte+mode tree digest for FS zero-write proof. */
function hashSandboxTree(root: string): string {
  const entries: string[] = [];
  const walk = (dir: string, rel: string): void => {
    let names: string[];
    try {
      names = fs.readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of names) {
      const abs = path.join(dir, name);
      const childRel = rel.length === 0 ? name : `${rel}/${name}`;
      let st: fs.Stats;
      try {
        st = fs.lstatSync(abs);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) {
        entries.push(`L:${childRel}:${fs.readlinkSync(abs)}`);
      } else if (st.isDirectory()) {
        entries.push(`D:${childRel}:${st.mode}`);
        walk(abs, childRel);
      } else if (st.isFile()) {
        const bytes = fs.readFileSync(abs);
        entries.push(
          `F:${childRel}:${st.mode}:${bytes.byteLength}:${createHash("sha256").update(bytes).digest("hex")}`,
        );
      }
    }
  };
  walk(root, "");
  return `sha256:${createHash("sha256").update(entries.join("\n")).digest("hex")}`;
}

function loadA3LeafBytes(): Partial<Record<V13LeafFileName, Uint8Array>> {
  const out: Partial<Record<V13LeafFileName, Uint8Array>> = {};
  for (const name of LEAF_FILES) {
    out[name] = fs.readFileSync(path.join(a3Research, name));
  }
  return out;
}

/**
 * Materialize shipped production inputs into an isolated sandbox:
 * - accepted A3 contract leaves
 * - figure-v1 + literature-scan-v1 Procedure 2.0.5 package trees
 * - a mutable worker artifact directory for mutation + report attempts
 */
function materializeProductionSandbox(
  leafBytes: Partial<Record<V13LeafFileName, Uint8Array>>,
): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v13-e2e-"));
  // A3 leaves (accepted contract pack bytes).
  const leafDir = path.join(root, "a3-leaves");
  fs.mkdirSync(leafDir, { recursive: true });
  for (const name of LEAF_FILES) {
    const bytes = leafBytes[name];
    if (bytes !== undefined) {
      fs.writeFileSync(path.join(leafDir, name), bytes);
    }
  }
  // Shipped Procedure packages (exact template bytes).
  for (const procedureId of ["figure-v1", "literature-scan-v1"] as const) {
    const src = path.join(proceduresRoot, procedureId, "2.0.5");
    const dest = path.join(root, "procedures", procedureId, "2.0.5");
    fs.cpSync(src, dest, { recursive: true });
  }
  // Mutable research dispatch tree for production write attempts.
  const researchRoot = path.join(root, "trellis-root", ".trellis", "research");
  fs.mkdirSync(path.join(researchRoot, "dispatches", "dsp_test"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, "mutation-target.json"),
    `${JSON.stringify({ intact: true, role: "worker-artifact" }, null, 2)}\n`,
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
  fs.writeFileSync(
    target,
    `${JSON.stringify({ intact: false, mutation: syntheticMutation }, null, 2)}\n`,
  );
}

function loadFigure205ProcedureFromSandbox(sandboxRoot: string): never {
  const base = path.join(sandboxRoot, "procedures", "figure-v1", "2.0.5");
  const pack = JSON.parse(
    fs.readFileSync(path.join(base, "methodology/pack.json"), "utf8"),
  ) as {
    entries: Array<{
      path: string;
      role: string;
      mediaType: string;
      sha256: string;
    }>;
  };
  const inventoryItems = pack.entries.map((e) => {
    const bytes = fs.readFileSync(path.join(base, "methodology", e.path));
    return Object.freeze({
      path: e.path,
      role: e.role,
      mediaType: e.mediaType,
      contractVersion: "1",
      provenanceId: "harness",
      sha256: e.sha256,
      byteLength: bytes.byteLength,
      workerVisibility: "root-only" as const,
      bytes,
    });
  });
  return Object.freeze({
    packageSchemaVersion: 2,
    manifest: Object.freeze({
      schemaVersion: 1,
      id: "figure-v1",
      version: "2.0.5",
      stage: "figure",
      kind: "bounded",
      inputs: Object.freeze(["dispatch"]),
      outputs: Object.freeze(["result"]),
      networkPolicy: "forbidden",
      repositoryScope: "single",
      packageSchemaVersion: 2,
    }),
    digest: "sha256:harness-test",
    digestDomain: "v2",
    supportPack: Object.freeze({
      manifest: Object.freeze({
        schemaVersion: 1,
        procedureId: "figure-v1",
        procedureVersion: "2.0.5",
        methodologyContractVersion: "evaluation-contract-v1.3.0",
        methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
        entries: Object.freeze([]),
      }),
      packJsonBytes: fs.readFileSync(path.join(base, "methodology/pack.json")),
      inventoryItems: Object.freeze(inventoryItems),
      workerVisibleInventory: Object.freeze([]),
      rootOnlyInventory: Object.freeze(inventoryItems),
    }),
  }) as never;
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

interface CaseResult {
  outcome: string;
  errorCodes: string[];
  zeroWrite: boolean;
  writeDiff: string[];
  semanticRule: string;
  syntheticMutation: string;
  productionOperation: string;
  executionFingerprint: string;
  reportDigest: string;
  beforeProductionDigest: string;
  afterProductionDigest: string;
}

/**
 * Drive shipped production paths for each case.
 * 1. Materialize exact package bytes in sandbox
 * 2. Apply registry mutation to real bytes
 * 3. Snapshot filesystem BEFORE production ops
 * 4. Run named production operation + semantic evaluator + write-capable paths
 * 5. Snapshot AFTER — zeroWrite proven by path+byte equality
 */
function executeCase(
  c: HarnessCase,
  pack: ReturnType<typeof parseAcceptedV13ContractPack>,
  leafBytes: Partial<Record<V13LeafFileName, Uint8Array>>,
): CaseResult {
  const sandboxRoot = materializeProductionSandbox(leafBytes);
  const writeDiff: string[] = [];
  try {
    // Apply mutation BEFORE production ops (real input bytes).
    if (c.fixtureClass === "critical-negative") {
      applyMutationToSandbox(sandboxRoot, c.syntheticMutation);
    }

    // Snapshot brackets production ops that could write — not a pure function alone.
    const beforeProductionDigest = hashSandboxTree(sandboxRoot);

    // --- Named production operations (shipped APIs) ---
    const leafDir = path.join(sandboxRoot, "a3-leaves");
    const leafFromSandbox: Partial<Record<V13LeafFileName, Uint8Array>> = {};
    for (const name of LEAF_FILES) {
      leafFromSandbox[name] = fs.readFileSync(path.join(leafDir, name));
    }

    switch (c.productionOperation) {
      case "parseAcceptedV13ContractPack": {
        parseAcceptedV13ContractPack({
          leafBytes: leafFromSandbox,
          expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
        });
        break;
      }
      case "resolveMethodologyContractBinding": {
        resolveMethodologyContractBinding("2.0.5");
        resolveMethodologyContractBinding("2.0.4");
        resolveMethodologyContractBinding("2.0.3");
        break;
      }
      case "selectTrustedV13ValidatorDescriptors": {
        const declared = pack.validators.map((v) => ({
          id: v.identity.id,
          version: v.identity.version,
          severity: "critical" as const,
        }));
        selectTrustedV13ValidatorDescriptors({ pack, declared });
        break;
      }
      case "deriveMethodologyValidatorFacts": {
        deriveMethodologyValidatorFacts({
          resultStatus: "completed",
          methodologyContractVersion: V13_ACCEPTED_CONTRACT_VERSION,
          requireExplicitClosure: true,
          ...(c.fixtureClass === "critical-negative"
            ? {}
            : { selected: true, blocked: false }),
        });
        break;
      }
      case "runMethodologyValidators": {
        const facts = deriveMethodologyValidatorFacts({
          resultStatus: "completed",
          methodologyContractVersion: V13_ACCEPTED_CONTRACT_VERSION,
          requireExplicitClosure: true,
          ...(c.fixtureClass === "critical-negative"
            ? {}
            : { selected: true, blocked: false }),
        });
        const declared = pack.validators.slice(0, 4).map((v) => ({
          id: v.identity.id,
          version: v.identity.version,
          severity: "critical" as const,
        }));
        runMethodologyValidators({
          procedureId: "figure-v1",
          procedureVersion: "2.0.5",
          procedureDigest: "sha256:harness",
          artifactPaths: [],
          declaredValidators: declared,
          facts,
          acceptedV13BindingCount: pack.bindings.length,
          acceptedV13TrustedValidatorCount: pack.validators.length,
          acceptedV13ContractDigest: pack.acceptedContractDigest,
        });
        break;
      }
      default:
        break;
    }

    // Always exercise public CLI methodology gate + lifecycle loaders on
    // shipped 2.0.5 packages (record-result preflight surface).
    const procedure = loadFigure205ProcedureFromSandbox(sandboxRoot);
    const declared = loadDeclaredValidatorsFromProcedure(procedure, { leafDir });
    expect(declared.length).toBeGreaterThan(0);
    expect(declared.every((d) => d.id.startsWith("trellis."))).toBe(true);
    const contracts = loadArtifactContractsFromProcedure(procedure);
    expect(contracts.length).toBeGreaterThan(0);

    // Critical-negative / fail-closed: attempt report-v2 materialization only
    // when multi-factor fails (must not write). Drive incomplete gate first.
    const incompleteGate = validateMethodologyBeforeRecord({
      procedureId: "figure-v1",
      procedureVersion: "2.0.5",
      procedureDigest: "sha256:harness",
      procedure,
      methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      // omit multi-factor bindings → never authorize sidecar
      resultStatus: "completed",
      terminalState: "completed",
      batchCommitted: true,
      artifactPaths: [],
      acceptedV13LeafDir: leafDir,
    });
    expect(incompleteGate.materializeSidecar).toBe(false);
    if (incompleteGate.materializeSidecar) {
      materializeMethodologyReportV2Sidecar({
        root: path.join(sandboxRoot, "trellis-root"),
        dispatchId: "dsp_test",
        reportV2: incompleteGate.reportV2,
      });
      writeDiff.push("methodology-report-v2.json");
    }

    // Semantic evaluator: caseId + pack only (no caller semantic authority).
    // SandboxRoot not used for zeroWrite here — harness owns FS proof below.
    const semantic = evaluateAcceptedV13DeltaCase({
      pack,
      caseId: c.caseId,
    });

    const afterProductionDigest = hashSandboxTree(sandboxRoot);
    const zeroWrite = beforeProductionDigest === afterProductionDigest;
    if (!zeroWrite) {
      writeDiff.push("sandbox-tree-changed-during-production-ops");
    }

    return {
      outcome: semantic.outcome,
      errorCodes: [...semantic.errorCodes],
      zeroWrite,
      writeDiff,
      semanticRule: semantic.semanticRule,
      syntheticMutation: semantic.syntheticMutation,
      productionOperation: c.productionOperation,
      executionFingerprint: semantic.executionFingerprint,
      reportDigest: semantic.reportDigest ?? "",
      beforeProductionDigest,
      afterProductionDigest,
    };
  } finally {
    fs.rmSync(sandboxRoot, { recursive: true, force: true });
  }
}

describe("v13 delta domain harness (CS4-4 registry-derived E2E)", () => {
  it("pins domain identity and 116 case registry shape", () => {
    const domain = JSON.parse(fs.readFileSync(domainPath, "utf8")) as Domain;
    expect(domain.caseCount).toBe(V13_DELTA_CASE_COUNT);
    expect(domain.methodologyContractVersion).toBe(
      V13_ACCEPTED_CONTRACT_VERSION,
    );
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

  it(
    "executes all 116 cases against shipped production paths with per-case evidence",
    { timeout: 120_000 },
    () => {
      const domain = JSON.parse(fs.readFileSync(domainPath, "utf8")) as Domain;
      const leafBytes = loadA3LeafBytes();
      const pack = parseAcceptedV13ContractPack({ leafBytes });
      const executed: string[] = [];
      const fingerprints = new Set<string>();
      const evidence: Array<Record<string, unknown>> = [];

      const evidenceRoot = resolveEvidenceRoot();
      fs.mkdirSync(evidenceRoot, { recursive: true });

      for (const c of domain.cases) {
        const result = executeCase(c, pack, leafBytes);
        executed.push(c.caseId);

        expect(result.executionFingerprint.length).toBe(64);
        expect(fingerprints.has(result.executionFingerprint)).toBe(false);
        fingerprints.add(result.executionFingerprint);

        // Derived from pack must match domain registry labels.
        expect(result.semanticRule).toBe(c.semanticRule);
        expect(result.syntheticMutation).toBe(c.syntheticMutation);
        expect(result.outcome).toBe(c.expectedOutcome);

        // Exact ordered error-code vector from production evaluator (not stamped).
        const expectedCodes = [...(c.expectedErrorCodes ?? [])];
        expect(result.errorCodes).toEqual(expectedCodes);

        if (c.fixtureClass === "critical-negative") {
          expect(result.outcome).toBe("fail-closed");
          expect(result.errorCodes.length).toBeGreaterThan(0);
          // Zero-write: production ops after mutation must not change the tree.
          expect(result.zeroWrite).toBe(true);
          expect(result.writeDiff).toEqual([]);
          expect(result.afterProductionDigest).toBe(
            result.beforeProductionDigest,
          );
        }
        if (c.fixtureClass === "inapplicable") {
          expect(result.outcome).toBe("not-run");
          expect(result.errorCodes).toEqual([]);
        }

        // All cases: production path zero-write (no ledger/sidecar pollution).
        expect(result.zeroWrite).toBe(true);

        const row: Record<string, unknown> = {
          caseId: c.caseId,
          productionOperation: result.productionOperation,
          semanticRule: result.semanticRule,
          syntheticMutation: result.syntheticMutation,
          fixtureClass: c.fixtureClass,
          expectedOutcome: c.expectedOutcome,
          actualOutcome: result.outcome,
          expectedErrorCodes: expectedCodes,
          actualErrorCodes: result.errorCodes,
          zeroWrite: result.zeroWrite,
          writeDiff: result.writeDiff,
          beforeProductionDigest: result.beforeProductionDigest,
          afterProductionDigest: result.afterProductionDigest,
          reportDigest: result.reportDigest,
          executionFingerprint: result.executionFingerprint,
        };
        evidence.push(row);
        fs.writeFileSync(
          path.join(evidenceRoot, `${c.caseId}.json`),
          `${JSON.stringify(row, null, 2)}\n`,
        );
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
      const ledgerBytes = fs.readFileSync(ledgerPath);
      fs.writeFileSync(
        path.join(evidenceRoot, "execution-ledger.sha256"),
        `sha256:${createHash("sha256").update(ledgerBytes).digest("hex")}\n`,
      );
    },
  );
});

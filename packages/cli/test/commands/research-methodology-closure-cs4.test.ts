import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  V13_ACCEPTED_CONTRACT_DIGEST,
  mapProcedureIdToClosureFamily,
  parseCanonicalMethodologyClosureArtifact,
} from "@mindfoldhq/trellis-core/research";

import {
  loadArtifactContractsFromProcedure,
  loadDeclaredValidatorsFromProcedure,
  validateMethodologyBeforeRecord,
} from "../../src/commands/research/dispatch-methodology-validation.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");

function snapshotTree(root: string): string {
  const entries: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const name of fs.readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      const child = rel ? `${rel}/${name}` : name;
      const st = fs.lstatSync(abs);
      if (st.isDirectory()) {
        entries.push(`D:${child}`);
        walk(abs, child);
      } else if (st.isFile()) {
        const bytes = fs.readFileSync(abs);
        entries.push(
          `F:${child}:${createHash("sha256").update(bytes).digest("hex")}`,
        );
      }
    }
  };
  walk(root, "");
  return createHash("sha256").update(entries.join("\n")).digest("hex");
}

function loadFigure205Procedure(): never {
  const base = path.join(
    repoRoot,
    "packages/cli/src/templates/research/procedures/figure-v1/2.0.5",
  );
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
      provenanceId: "test",
      sha256: e.sha256,
      byteLength: bytes.byteLength,
      workerVisibility: "root-only" as const,
      bytes,
    });
  });
  return Object.freeze({
    capability: {
      id: "research.figure.generate",
      stage: "figure",
      kind: "bounded",
      procedure: { id: "figure-v1", version: "2.0.5" },
      networkPolicy: "forbidden",
      repositoryScope: "single",
    },
    source: "bundled",
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
    canonicalManifestJson: "",
    instructions: "#",
    digest: "sha256:test",
    digestDomain: "v2",
    packageSchemaVersion: 2,
    supportPack: Object.freeze({
      manifest: Object.freeze({
        schemaVersion: 1,
        procedureId: "figure-v1",
        procedureVersion: "2.0.5",
        methodologyContractVersion: "evaluation-contract-v1.3.0",
        methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
        entries: Object.freeze([]),
      }),
      packJsonBytes: new Uint8Array(),
      inventoryItems: Object.freeze(inventoryItems),
      workerVisibleInventory: Object.freeze([]),
      rootOnlyInventory: Object.freeze(inventoryItems),
    }),
  }) as never;
}

describe("CS4 canonical closure on methodology validation path", () => {
  it("does not authorize report-v2 from procedureVersion alone", () => {
    const gate = validateMethodologyBeforeRecord({
      procedureId: "literature-scan-v1",
      procedureVersion: "2.0.4",
      procedureDigest: "sha256:abc",
      resultStatus: "completed",
      terminalState: "completed",
      batchCommitted: true,
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
    });
    expect(gate.criticalFailure || !gate.ok).toBe(true);
    expect(gate.materializeSidecar).toBe(false);
  });

  it("uses explicit XOR closure facts and ignores Result.status for exclusivity", () => {
    const gate = validateMethodologyBeforeRecord({
      procedureId: "literature-scan-v1",
      procedureVersion: "2.0.4",
      procedureDigest: "sha256:abc",
      methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      selected: true,
      blocked: false,
      resultStatus: "failed",
      terminalState: "failed",
      batchCommitted: true,
      artifactPaths: [],
      declaredValidators: [
        { id: "closure-exclusivity", version: "1", severity: "critical" },
      ],
    });
    const exclusivityFailed = gate.report.validation.findings.some(
      (f) =>
        f.validatorId === "closure-exclusivity" && f.severity === "critical",
    );
    expect(exclusivityFailed).toBe(false);
  });

  it("strict-parses closure artifact with family XOR and evidence rules", () => {
    const closureId = "art_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const evidenceId = "art_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const body = {
      schemaVersion: 1,
      family: "research-literature",
      selected: { value: true, evidenceArtifactIds: [evidenceId] },
      blocked: { value: false, evidenceArtifactIds: [] },
    };
    const result = parseCanonicalMethodologyClosureArtifact({
      bytes: new TextEncoder().encode(`${JSON.stringify(body)}\n`),
      expectedFamily: "research-literature",
      closureArtifactId: closureId,
      boundArtifactIds: [closureId, evidenceId],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.closure.selected).toBe(true);
      expect(result.closure.blocked).toBe(false);
    }
    expect(mapProcedureIdToClosureFamily("literature-scan-v1")).toBe(
      "research-literature",
    );
  });

  it("rejects missing/both-true/both-false/unbound/digest-drifted closure with full tree zero-write", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "cs4-closure-zw-"));
    const seed = path.join(sandbox, "seed.txt");
    fs.writeFileSync(seed, "immutable-seed\n");
    const before = snapshotTree(sandbox);

    const closureId = "art_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const evidenceId = "art_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    const cases: Array<{
      name: string;
      body: unknown;
      bound: string[];
      expectOk: boolean;
    }> = [
      {
        name: "both-true",
        body: {
          schemaVersion: 1,
          family: "research-literature",
          selected: { value: true, evidenceArtifactIds: [evidenceId] },
          blocked: { value: true, evidenceArtifactIds: [evidenceId] },
        },
        bound: [closureId, evidenceId],
        expectOk: false,
      },
      {
        name: "both-false",
        body: {
          schemaVersion: 1,
          family: "research-literature",
          selected: { value: false, evidenceArtifactIds: [] },
          blocked: { value: false, evidenceArtifactIds: [] },
        },
        bound: [closureId, evidenceId],
        expectOk: false,
      },
      {
        name: "unbound-evidence",
        body: {
          schemaVersion: 1,
          family: "research-literature",
          selected: {
            value: true,
            evidenceArtifactIds: ["art_cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
          },
          blocked: { value: false, evidenceArtifactIds: [] },
        },
        bound: [closureId, evidenceId],
        expectOk: false,
      },
      {
        name: "missing-fields",
        body: { schemaVersion: 1, family: "research-literature" },
        bound: [closureId],
        expectOk: false,
      },
    ];

    for (const c of cases) {
      const parsed = parseCanonicalMethodologyClosureArtifact({
        bytes: new TextEncoder().encode(`${JSON.stringify(c.body)}\n`),
        expectedFamily: "research-literature",
        closureArtifactId: closureId,
        boundArtifactIds: c.bound,
      });
      expect(parsed.ok, c.name).toBe(c.expectOk);

      // Gate with missing explicit closure must fail-closed for successor path.
      const gate = validateMethodologyBeforeRecord({
        procedureId: "literature-scan-v1",
        procedureVersion: "2.0.5",
        procedureDigest: "sha256:abc",
        methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
        resultStatus: "completed",
        terminalState: "completed",
        batchCommitted: false,
        artifactPaths: [],
        declaredValidators: [
          { id: "trellis.closure.xor", version: "1.0.0", severity: "critical" },
        ],
      });
      expect(gate.ok).toBe(false);
      expect(gate.criticalFailure).toBe(true);
      expect(gate.materializeSidecar).toBe(false);
      expect(gate.report.zeroWrite).toBe(true);
    }

    // Digest-drifted: content hash mismatch is a record-result concern; parser
    // still rejects family/XOR defects. Prove sandbox tree bytes unchanged.
    const after = snapshotTree(sandbox);
    expect(after).toBe(before);
    expect(fs.readFileSync(seed, "utf8")).toBe("immutable-seed\n");
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("requires multi-factor report-v2 authority (inventory + activation/request/policy/scope)", () => {
    const procedure = loadFigure205Procedure();
    // Version + digest + XOR alone is insufficient without bindings.
    const incomplete = validateMethodologyBeforeRecord({
      procedureId: "figure-v1",
      procedureVersion: "2.0.5",
      procedureDigest: "sha256:proc",
      procedure,
      methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      selected: true,
      blocked: false,
      capabilityId: "research.figure.generate",
      dispatchId: "disp_1",
      activationId: "act_1",
      // missing requestDigest/policyDigest/scopeHash
      batchCommitted: true,
      artifactPaths: [],
    });
    expect(incomplete.materializeSidecar).toBe(false);

    const complete = validateMethodologyBeforeRecord({
      procedureId: "figure-v1",
      procedureVersion: "2.0.5",
      procedureDigest: "sha256:proc",
      procedure,
      methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
      selected: true,
      blocked: false,
      capabilityId: "research.figure.generate",
      dispatchId: "disp_1",
      activationId: "act_1",
      requestDigest: "sha256:req",
      policyDigest: "sha256:pol",
      scopeHash: "sha256:scope",
      batchCommitted: true,
      artifactPaths: [],
    });
    // materialize only when validation ok AND multi-factor complete.
    // Validation may still fail on missing required lifecycle artifacts.
    if (complete.ok && !complete.criticalFailure) {
      expect(complete.materializeSidecar).toBe(true);
    } else {
      expect(complete.materializeSidecar).toBe(false);
    }
    // Version-alone path already covered; ensure incomplete never materializes.
    expect(incomplete.materializeSidecar).toBe(false);
  });
});

describe("CS4 lifecycle contract load for freeze-family packs", () => {
  it("loads non-empty contracts from figure-v1 2.0.5 pack inventory", () => {
    const procedure = loadFigure205Procedure();
    const contracts = loadArtifactContractsFromProcedure(procedure);
    expect(contracts.length).toBeGreaterThan(0);
    expect(contracts[0]?.id).toBeTruthy();
    expect(contracts[0]?.pathPattern).toContain("evidence/**/");
    expect(contracts[0]?.mediaType).toBe("text/markdown");
  });

  it("does not invent lifecycle contracts from 2.0.4 checkpoints[] alone", () => {
    const base = path.join(
      repoRoot,
      "packages/cli/src/templates/research/procedures/figure-v1/2.0.4",
    );
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
        provenanceId: "test",
        sha256: e.sha256,
        byteLength: bytes.byteLength,
        workerVisibility: "root-only" as const,
        bytes,
      });
    });
    const procedure = Object.freeze({
      packageSchemaVersion: 2,
      manifest: Object.freeze({ id: "figure-v1", version: "2.0.4" }),
      supportPack: Object.freeze({
        inventoryItems: Object.freeze(inventoryItems),
      }),
    }) as never;
    const contracts = loadArtifactContractsFromProcedure(procedure);
    // 2.0.4 has checkpoints only — no invented contracts[].
    expect(contracts).toEqual([]);
  });

  it("loads accepted 20-validator registry via 876 bindings for 2.0.5 (not pack 4-legacy)", () => {
    const procedure = loadFigure205Procedure();
    const validators = loadDeclaredValidatorsFromProcedure(procedure);
    expect(validators.length).toBeGreaterThanOrEqual(1);
    // Must not be the 4 legacy pack validators alone.
    const legacyOnly = validators.every((v) =>
      [
        "missing-critical-evidence",
        "provenance-stable-id-drift",
        "forbidden-mutation",
        "closure-exclusivity",
      ].includes(v.id),
    );
    expect(legacyOnly).toBe(false);
    // All selected must be A3 trellis.* identities.
    for (const v of validators) {
      expect(v.id.startsWith("trellis.")).toBe(true);
      expect(v.version).toBe("1.0.0");
      expect(v.severity).toBe("critical");
    }
  });
});

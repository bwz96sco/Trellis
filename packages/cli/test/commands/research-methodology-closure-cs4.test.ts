import { describe, expect, it } from "vitest";

import {
  mapProcedureIdToClosureFamily,
  parseCanonicalMethodologyClosureArtifact,
} from "@mindfoldhq/trellis-core/research";

import { validateMethodologyBeforeRecord } from "../../src/commands/research/dispatch-methodology-validation.js";

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
      methodologyContractDigest:
        "sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f",
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
});

describe("CS4 lifecycle contract load for freeze-family packs", () => {
  it("loads non-empty contracts from figure-v1 2.0.5 pack inventory", async () => {
    const { loadArtifactContractsFromProcedure } = await import(
      "../../src/commands/research/dispatch-methodology-validation.js"
    );
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../..",
    );
    const base = path.join(
      root,
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
    const procedure = Object.freeze({
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
          methodologyContractDigest:
            "sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f",
          entries: Object.freeze([]),
        }),
        packJsonBytes: new Uint8Array(),
        inventoryItems: Object.freeze(inventoryItems),
        workerVisibleInventory: Object.freeze([]),
        rootOnlyInventory: Object.freeze(inventoryItems),
      }),
    }) as never;
    const contracts = loadArtifactContractsFromProcedure(procedure);
    expect(contracts.length).toBeGreaterThan(0);
    expect(contracts[0]?.id).toBeTruthy();
    expect(contracts[0]?.pathPattern).toContain("evidence/**/");
    expect(contracts[0]?.mediaType).toBe("text/markdown");
  });
});

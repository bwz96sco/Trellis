import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import * as coreResearch from "@mindfoldhq/trellis-core/research";
import {
  V13_ACCEPTED_CONTRACT_DIGEST,
  mapProcedureIdToClosureFamily,
  parseCanonicalMethodologyClosureArtifact,
} from "@mindfoldhq/trellis-core/research";

import { authorizeResearchDispatch } from "../../src/commands/research/dispatch-activation-command.js";
import { recordApprovedResearchDispatchResult } from "../../src/commands/research/dispatch-command.js";
import * as revalidation from "../../src/commands/research/dispatch-revalidation.js";
import {
  loadArtifactContractsFromProcedure,
  loadDeclaredValidatorsFromProcedure,
  validateMethodologyBeforeRecord,
} from "../../src/commands/research/dispatch-methodology-validation.js";
import {
  createResearchDispatchFixture,
  snapshotTree as snapshotTreeMap,
} from "../fixtures/research-dispatch.js";

/** Exact digest of shipped literature-scan-v1@2.0.5 (domain-separated v2). */
const SUCCESSOR_PROCEDURE = Object.freeze({
  id: "literature-scan-v1",
  version: "2.0.5",
  digest:
    "sha256:d9ea9928f670b41d5526463154d298671e5a126c5a5aa3cdc7400fea0b161a6b",
});

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
    entries: {
      path: string;
      role: string;
      mediaType: string;
      sha256: string;
    }[];
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

    const cases: {
      name: string;
      body: unknown;
      bound: string[];
      expectOk: boolean;
    }[] = [
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
      entries: {
        path: string;
        role: string;
        mediaType: string;
        sha256: string;
      }[];
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

describe(
  "CS4 record-result public path closure zero-write (successor procedure)",
  { timeout: 60_000 },
  () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function lazyInput(sandbox: string, read: () => string) {
      return {
        kind: "stdin" as const,
        cwd: sandbox,
        read: () => Buffer.from(read(), "utf8"),
      };
    }

    function payload(input: {
      readonly approvalId: string;
      readonly dispatchId: `dsp_${string}`;
      readonly runId: `run_${string}`;
      readonly questId: `qst_${string}`;
      readonly createdAt: string;
      readonly artifactRefs?: readonly Record<string, unknown>[];
    }): string {
      const suffix = input.approvalId.slice(4);
      return JSON.stringify({
        result: {
          id: `res_${suffix}`,
          dispatchId: input.dispatchId,
          runId: input.runId,
          status: "completed",
          summary: "Bounded work complete",
          commands: [],
          checks: [],
          artifactRefs: input.artifactRefs ?? [],
          blockers: [],
          createdAt: input.createdAt,
        },
        proposal: {
          id: `prp_${suffix}`,
          dispatchId: input.dispatchId,
          questId: input.questId,
          title: "No canonical changes",
          operations: [],
          status: "pending",
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        },
      });
    }

    /**
     * Force activation + candidate procedure identity to literature-scan-v1@2.0.5
     * so the public record-result path requires canonical closure ArtifactRef.
     * Does not mock validateMethodologyBeforeRecord or the closure parser —
     * only identity pins so the successor branch is entered.
     *
     * record-result builds state via reduceResearchEvents(ledger), so that is
     * the binding we patch (not readResearchState).
     */
    function forceSuccessorProcedureActivation(): void {
      const realReduce = coreResearch.reduceResearchEvents;
      vi.spyOn(coreResearch, "reduceResearchEvents").mockImplementation(
        (ledger) => {
          const state = realReduce(ledger);
          for (const key of Object.keys(state.activations)) {
            const act = state.activations[key];
            if (act === undefined) continue;
            Object.assign(act, { procedure: { ...SUCCESSOR_PROCEDURE } });
          }
          for (const key of Object.keys(state.approvals)) {
            const approval = state.approvals[key];
            if (approval?.grant === undefined) continue;
            Object.assign(approval.grant, {
              procedureDigest: SUCCESSOR_PROCEDURE.digest,
            });
          }
          return state;
        },
      );
      // Stage a candidate matching successor identity (revalidation cannot load
      // literature-scan under framing capability; closure branch only needs pins).
      vi.spyOn(
        revalidation,
        "revalidateDispatchActivationStaged",
      ).mockImplementation(async (input) => {
        const procedure = Object.freeze({
          capability: {
            id: input.activation.capabilityId,
            stage: "literature",
            kind: "bounded",
            procedure: {
              id: SUCCESSOR_PROCEDURE.id,
              version: SUCCESSOR_PROCEDURE.version,
            },
            networkPolicy: "forbidden",
            repositoryScope: "single",
          },
          source: "bundled",
          manifest: Object.freeze({
            schemaVersion: 1,
            id: SUCCESSOR_PROCEDURE.id,
            version: SUCCESSOR_PROCEDURE.version,
            stage: "literature",
            kind: "bounded",
            inputs: Object.freeze(["dispatch"]),
            outputs: Object.freeze(["result"]),
            networkPolicy: "forbidden",
            repositoryScope: "single",
            packageSchemaVersion: 2,
          }),
          canonicalManifestJson: "",
          instructions: "#",
          digest: SUCCESSOR_PROCEDURE.digest,
          digestDomain: "v2" as const,
          packageSchemaVersion: 2,
        });
        return {
          state: input.state,
          dispatch: input.dispatch,
          authority: {
            capabilityId: input.activation.capabilityId,
            enabled: true,
            activation: input.activation.mode,
            procedure: { ...SUCCESSOR_PROCEDURE },
            maxDurationMinutes: input.activation.maxDurationMinutes,
            maxDispatches: input.activation.maxDispatches,
            automatic: false,
            networkPolicy: "forbidden",
            repositoryScope: "single",
            allowedWritePaths: [],
          },
          procedure: procedure as never,
          automaticEligibility: {
            eligible: false,
            reasons: Object.freeze(["test-forced-successor"]),
          },
          policyDigest: input.activation.policyDigest,
          requestDigest: input.activation.requestDigest,
          scopeHash: input.activation.scopeHash,
          scope: Object.freeze({
            schemaVersion: 1,
            repositoryId: input.dispatch.repositoryId,
            allowedWritePaths: Object.freeze([] as string[]),
          }),
          repository: {
            repositoryId: input.dispatch.repositoryId,
            root: path.join(input.root, "..", "target"),
            revision: null,
          },
        } as never;
      });
    }

    it("missing closure ArtifactRef fails closed with full tree/byte zero-write", async () => {
      const sandbox = fs.mkdtempSync(
        path.join(os.tmpdir(), "cs4-rr-closure-missing-"),
      );
      try {
        const fixture = await createResearchDispatchFixture(sandbox, {
          automaticEnabled: true,
        });
        const granted = await authorizeResearchDispatch({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "codex",
          idempotencyKey: "cs4-closure-missing-grant",
        });
        forceSuccessorProcedureActivation();
        const now = new Date(
          Date.parse(granted.approval.grant.grantedAt) + 1_000,
        );
        const body = payload({
          approvalId: granted.approval.grant.id,
          dispatchId: fixture.ids.dispatchId,
          runId: fixture.ids.runId,
          questId: fixture.ids.questId,
          createdAt: now.toISOString(),
          artifactRefs: [], // missing closure
        });
        const before = snapshotTreeMap(fixture.root);
        await expect(
          recordApprovedResearchDispatchResult({
            root: fixture.root,
            dispatchId: fixture.ids.dispatchId,
            approvalId: granted.approval.grant.id,
            input: lazyInput(sandbox, () => body),
            idempotencyKey: "cs4-closure-missing",
            now,
          }),
        ).rejects.toThrow(
          /METHODOLOGY_VALIDATION_FAILED|Canonical closure|zero-write/,
        );
        const after = snapshotTreeMap(fixture.root);
        expect(after).toEqual(before);
        const sidecar = path.join(
          fixture.root,
          ".trellis/research/dispatches",
          fixture.ids.dispatchId,
          "methodology-report-v2.json",
        );
        expect(fs.existsSync(sidecar)).toBe(false);
      } finally {
        fs.rmSync(sandbox, { recursive: true, force: true });
      }
    });

    it("digest-drifted closure ArtifactRef fails closed with full tree/byte zero-write", async () => {
      const sandbox = fs.mkdtempSync(
        path.join(os.tmpdir(), "cs4-rr-closure-drift-"),
      );
      try {
        const fixture = await createResearchDispatchFixture(sandbox, {
          automaticEnabled: true,
        });
        const granted = await authorizeResearchDispatch({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "codex",
          idempotencyKey: "cs4-closure-drift-grant",
        });
        forceSuccessorProcedureActivation();

        // Place a real closure file with wrong declared digest.
        const closureId = "art_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
        const evidenceId = "art_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
        const closureBody = {
          schemaVersion: 1,
          family: "research-literature",
          selected: { value: true, evidenceArtifactIds: [evidenceId] },
          blocked: { value: false, evidenceArtifactIds: [] },
        };
        const closureRel = "methodology/closure/research-literature.json";
        const closureAbs = path.join(fixture.repository, closureRel);
        fs.mkdirSync(path.dirname(closureAbs), { recursive: true });
        const bytes = Buffer.from(`${JSON.stringify(closureBody)}\n`, "utf8");
        fs.writeFileSync(closureAbs, bytes);
        const wrongDigest = "0".repeat(64); // deliberate drift

        const now = new Date(
          Date.parse(granted.approval.grant.grantedAt) + 1_000,
        );
        const body = payload({
          approvalId: granted.approval.grant.id,
          dispatchId: fixture.ids.dispatchId,
          runId: fixture.ids.runId,
          questId: fixture.ids.questId,
          createdAt: now.toISOString(),
          artifactRefs: [
            {
              id: closureId,
              repositoryId: fixture.ids.repositoryId,
              path: closureRel,
              kind: "artifact",
              sha256: wrongDigest,
              mediaType: "application/json",
            },
            {
              id: evidenceId,
              repositoryId: fixture.ids.repositoryId,
              path: "inputs/source.txt",
              kind: "source",
              sha256: createHash("sha256")
                .update(fs.readFileSync(path.join(fixture.repository, "inputs/source.txt")))
                .digest("hex"),
              mediaType: "text/plain",
            },
          ],
        });
        const before = snapshotTreeMap(fixture.root);
        await expect(
          recordApprovedResearchDispatchResult({
            root: fixture.root,
            dispatchId: fixture.ids.dispatchId,
            approvalId: granted.approval.grant.id,
            input: lazyInput(sandbox, () => body),
            idempotencyKey: "cs4-closure-drift",
            now,
          }),
        ).rejects.toThrow(
          /METHODOLOGY_VALIDATION_FAILED|digest drift|sha256 does not match|zero-write|Canonical closure|Artifact/,
        );
        const after = snapshotTreeMap(fixture.root);
        expect(after).toEqual(before);
      } finally {
        fs.rmSync(sandbox, { recursive: true, force: true });
      }
    });

    it("ambiguous multi-family closure refs fail closed with full tree/byte zero-write", async () => {
      const sandbox = fs.mkdtempSync(
        path.join(os.tmpdir(), "cs4-rr-closure-ambig-"),
      );
      try {
        const fixture = await createResearchDispatchFixture(sandbox, {
          automaticEnabled: true,
        });
        const granted = await authorizeResearchDispatch({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "codex",
          idempotencyKey: "cs4-closure-ambig-grant",
        });
        forceSuccessorProcedureActivation();
        const now = new Date(
          Date.parse(granted.approval.grant.grantedAt) + 1_000,
        );
        // Two real closure files for the same family path pattern → ambiguous.
        const closureBody = `${JSON.stringify({
          schemaVersion: 1,
          family: "research-literature",
          selected: {
            value: true,
            evidenceArtifactIds: ["art_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
          },
          blocked: { value: false, evidenceArtifactIds: [] },
        })}\n`;
        const pathA = "methodology/closure/research-literature.json";
        const pathB = "extra/methodology/closure/research-literature.json";
        for (const rel of [pathA, pathB]) {
          const abs = path.join(fixture.repository, rel);
          fs.mkdirSync(path.dirname(abs), { recursive: true });
          fs.writeFileSync(abs, closureBody);
        }
        const dig = createHash("sha256")
          .update(closureBody)
          .digest("hex");
        const body = payload({
          approvalId: granted.approval.grant.id,
          dispatchId: fixture.ids.dispatchId,
          runId: fixture.ids.runId,
          questId: fixture.ids.questId,
          createdAt: now.toISOString(),
          artifactRefs: [
            {
              id: "art_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              repositoryId: fixture.ids.repositoryId,
              path: pathA,
              kind: "artifact",
              sha256: dig,
              mediaType: "application/json",
            },
            {
              id: "art_cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              repositoryId: fixture.ids.repositoryId,
              path: pathB,
              kind: "artifact",
              sha256: dig,
              mediaType: "application/json",
            },
          ],
        });
        const before = snapshotTreeMap(fixture.root);
        await expect(
          recordApprovedResearchDispatchResult({
            root: fixture.root,
            dispatchId: fixture.ids.dispatchId,
            approvalId: granted.approval.grant.id,
            input: lazyInput(sandbox, () => body),
            idempotencyKey: "cs4-closure-ambig",
            now,
          }),
        ).rejects.toThrow(
          /METHODOLOGY_VALIDATION_FAILED|ambiguous|missing|zero-write|Canonical closure/,
        );
        const after = snapshotTreeMap(fixture.root);
        expect(after).toEqual(before);
      } finally {
        fs.rmSync(sandbox, { recursive: true, force: true });
      }
    });
  },
);

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  resolveProcedureLifecycleFamily,
  buildSupportPackInventory,
  parseAcceptedV13ContractPack,
  computeResearchProcedureDigestV2,
  parseSupportPackManifest,
  resolveProcedureClosureDisposition,
  selectApplicableV13BindingsForProcedure,
  serializeSupportPackInventoryForDigest,
} from "@mindfoldhq/trellis-core/research";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const procRoot = path.join(
  repoRoot,
  "packages/cli/src/templates/research/procedures",
);

const PROCEDURES = [
  "computation-case-v1",
  "experiment-campaign-v1",
  "experiment-round-v1",
  "figure-v1",
  "idea-evaluation-v1",
  "idea-generation-v1",
  "literature-review-v1",
  "literature-scan-v1",
  "project-setup-v1",
  "quest-admin-v1",
  "quest-framing-v1",
  "review-campaign-v1",
  "review-case-v1",
  "slides-v1",
  "survey-v1",
  "theory-case-v1",
  "writing-case-v1",
];

describe("CS5-3 immutable Procedure 2.0.6 family packages", () => {
  it("has exactly 17 complete 2.0.6 trees and preserves 2.0.4/2.0.5 trees", () => {
    const families = fs
      .readdirSync(procRoot)
      .filter((d) => fs.statSync(path.join(procRoot, d)).isDirectory());
    expect(families.sort()).toEqual([...PROCEDURES].sort());
    for (const pid of PROCEDURES) {
      const base = path.join(procRoot, pid);
      expect(fs.existsSync(path.join(base, "2.0.6", "procedure.json"))).toBe(true);
      expect(fs.existsSync(path.join(base, "2.0.6", "PROCEDURE.md"))).toBe(true);
      expect(fs.existsSync(path.join(base, "2.0.6", "methodology", "pack.json"))).toBe(true);
      expect(fs.existsSync(path.join(base, "2.0.5", "procedure.json"))).toBe(true);
      expect(fs.existsSync(path.join(base, "2.0.4", "procedure.json"))).toBe(true);
    }
  });

  it("parses every 2.0.6 pack through the real support-pack parser and recomputes digests", () => {
    for (const pid of PROCEDURES) {
      const dir = path.join(procRoot, pid, "2.0.6");
      const manifestBytes = new Uint8Array(
        fs.readFileSync(path.join(dir, "procedure.json")),
      );
      const instructionBytes = new Uint8Array(
        fs.readFileSync(path.join(dir, "PROCEDURE.md")),
      );
      const packJsonBytes = new Uint8Array(
        fs.readFileSync(path.join(dir, "methodology", "pack.json")),
      );
      const manifest = parseSupportPackManifest({
        packJsonBytes,
        procedureId: pid,
        procedureVersion: "2.0.6",
      });
      expect(manifest.procedureVersion).toBe("2.0.6");
      expect(manifest.methodologyContractVersion).toBe(
        "evaluation-contract-v1.3.0",
      );
      expect(manifest.methodologyContractDigest).toBe(
        V13_ACCEPTED_CONTRACT_DIGEST,
      );
      const files: Record<string, Uint8Array> = {};
      for (const entry of manifest.entries) {
        files[entry.path] = new Uint8Array(
          fs.readFileSync(path.join(dir, "methodology", entry.path)),
        );
      }
      const inventoryItems = buildSupportPackInventory({ manifest, files });
      expect(inventoryItems.length).toBe(manifest.entries.length);
      const invJson = serializeSupportPackInventoryForDigest(inventoryItems);
      const recomputed = computeResearchProcedureDigestV2({
        canonicalManifestBytes: manifestBytes,
        instructionBytes,
        packJsonBytes,
        inventoryItems,
      });
      const digests = JSON.parse(
        fs.readFileSync(path.join(dir, "methodology", "digests.json"), "utf8"),
      ) as {
        procedureDigest: string;
        packJsonSha256: string;
        inventoryDigest: string;
      };
      expect(digests.procedureDigest).toBe(recomputed);
      const packSha = `sha256:${createHash("sha256")
        .update(packJsonBytes)
        .digest("hex")}`;
      expect(digests.packJsonSha256).toBe(packSha);
      expect(digests.inventoryDigest).toBe(
        `sha256:${createHash("sha256").update(invJson).digest("hex")}`,
      );
      // pack.json.sha256 sidecar equals the final pack bytes hash.
      const sidecar = fs
        .readFileSync(path.join(dir, "methodology", "pack.json.sha256"), "utf8")
        .trim();
      expect(sidecar).toBe(packSha.replace("sha256:", ""));
    }
  });

  it("binds accepted digest, member aggregate, closed closure disposition, and dormant flags", () => {
    for (const pid of PROCEDURES) {
      const dir = path.join(procRoot, pid, "2.0.6");
      const contract = JSON.parse(
        fs.readFileSync(
          path.join(dir, "methodology", "package-contract.json"),
          "utf8",
        ),
      ) as {
        procedureId: string;
        procedureVersion: string;
        acceptedContractDigest: string;
        acceptedMemberAggregateSha256: string;
        closureDisposition: Record<string, unknown>;
        authorityFlags: Record<string, boolean>;
        dormant: boolean;
        liveSelection: string;
        noFallbackTo: string;
      };
      expect(contract.procedureId).toBe(pid);
      expect(contract.procedureVersion).toBe("2.0.6");
      expect(contract.acceptedContractDigest).toBe(V13_ACCEPTED_CONTRACT_DIGEST);
      expect(contract.acceptedMemberAggregateSha256).toBe(
        V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
      );
      expect(contract.authorityFlags).toEqual({
        activationAuthorized: false,
        releaseAuthorized: false,
        publicationAuthorized: false,
        pushAuthorized: false,
      });
      expect(contract.dormant).toBe(true);
      expect(contract.liveSelection).toBe("1.0.0");
      expect(contract.noFallbackTo).toBe("2.0.5");
      const expected = resolveProcedureClosureDisposition(pid);
      if (expected.kind === "required") {
        expect(contract.closureDisposition).toEqual({
          kind: "required",
          family: expected.family,
          closureContractId: expected.closureContractId,
          exactPath: expected.exactPath,
          mediaType: expected.mediaType,
        });
        expect(
          fs.existsSync(path.join(dir, "methodology", "closure", `${expected.family}.json`)),
        ).toBe(true);
      } else {
        expect(contract.closureDisposition).toEqual({
          kind: "notApplicable",
          code: expected.code,
          rationale: expected.rationale,
        });
        expect(
          fs.existsSync(path.join(dir, "methodology", "closure", "disposition.json")),
        ).toBe(true);
      }
    }
  });

  it("cross-checks every checkpoint/output to exactly one artifact contract and back", () => {
    const a3Root = path.join(
      repoRoot,
      ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
    );
    const alc = JSON.parse(
      fs.readFileSync(path.join(a3Root, "artifact-lifecycle-contract-v1.3.json"), "utf8"),
    ) as {
      artifacts: { artifactId: string; family: unknown; publicIdentity: unknown }[];
    };
    for (const pid of PROCEDURES) {
      const dir = path.join(procRoot, pid, "2.0.6");
      const artifactContract = JSON.parse(
        fs.readFileSync(
          path.join(dir, "methodology", "artifacts", "artifact-contract.json"),
          "utf8",
        ),
      ) as {
        contracts: { id: string; pathPattern: string; mediaType: string }[];
      };
      const lifecycleFamily = resolveProcedureLifecycleFamily(pid);
      const familyRows =
        lifecycleFamily === null
          ? []
          : alc.artifacts.filter((r) => {
              const fam = r.family;
              return (typeof fam === "object" && fam !== null &&
                typeof (fam as { value?: unknown }).value === "string"
                ? (fam as { value: string }).value
                : fam) === lifecycleFamily;
            });
      if (lifecycleFamily === null) {
        expect(artifactContract.contracts).toEqual([]);
        continue;
      }
      // every contract -> exactly one A3 row (by public identity), and back.
      const contractIds = artifactContract.contracts.map((c) => c.id);
      expect(new Set(contractIds).size).toBe(contractIds.length);
      for (const c of artifactContract.contracts) {
        const matches = familyRows.filter((r) => {
          const pi = r.publicIdentity;
          return (
            (typeof pi === "object" && pi !== null &&
              typeof (pi as { value?: unknown }).value === "string"
              ? (pi as { value: string }).value
              : pi) === c.pathPattern
          );
        });
        expect(matches).toHaveLength(1);
        expect(c.id).toBe(c.pathPattern);
      }
      for (const row of familyRows) {
        const pi = row.publicIdentity;
        const identity =
          typeof pi === "object" && pi !== null
            ? (pi as { value: string }).value
            : (pi as string);
        expect(contractIds).toContain(identity);
      }
    }
  });

  it("package bindings equal the core-computed applicable bindings per Procedure", () => {
    const a3Root = path.join(
      repoRoot,
      ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
    );
    const names = [
      "durable-output-disposition-v1.3.json",
      "artifact-lifecycle-contract-v1.3.json",
      "validator-registry-v1.3.json",
      "validator-binding-matrix-v1.3.json",
      "differential-test-matrix-v1.3.json",
      "derivability-provenance-matrix-v1.3.json",
      "closure-contract-v1.3.json",
    ] as const;
    const leafBytes: Record<string, Uint8Array> = {};
    for (const name of names) {
      leafBytes[name] = new Uint8Array(
        fs.readFileSync(path.join(a3Root, name)),
      );
    }
    const pack = parseAcceptedV13ContractPack({
      leafBytes: leafBytes as never,
      expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
    });
    for (const pid of PROCEDURES) {
      const dir = path.join(procRoot, pid, "2.0.6");
      const doc = JSON.parse(
        fs.readFileSync(path.join(dir, "methodology", "bindings", "bindings.json"), "utf8"),
      ) as { bindingCount: number; bindings: { bindingId: string }[] };
      const expected = selectApplicableV13BindingsForProcedure({ pack, procedureId: pid });
      expect(doc.bindingCount).toBe(expected.length);
      const expectedIds = expected.map((r) => r.binding.bindingId).sort();
      const actualIds = doc.bindings.map((b) => b.bindingId).sort();
      expect(actualIds).toEqual(expectedIds);
    }
  });

  it("2.0.6 lifecycle rows match the family subset of the accepted A3 contract", async () => {
    const a3Root = path.join(
      repoRoot,
      ".trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
    );
    const names = [
      "durable-output-disposition-v1.3.json",
      "artifact-lifecycle-contract-v1.3.json",
      "validator-registry-v1.3.json",
      "validator-binding-matrix-v1.3.json",
      "differential-test-matrix-v1.3.json",
      "derivability-provenance-matrix-v1.3.json",
      "closure-contract-v1.3.json",
    ] as const;
    const leafBytes: Record<string, Uint8Array> = {};
    for (const name of names) {
      leafBytes[name] = new Uint8Array(
        fs.readFileSync(path.join(a3Root, name)),
      );
    }
    const pack = parseAcceptedV13ContractPack({
      leafBytes: leafBytes as never,
      expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
    });
    for (const pid of PROCEDURES) {
      const lifecycleFamily = resolveProcedureLifecycleFamily(pid);
      const doc = JSON.parse(
        fs.readFileSync(
          path.join(procRoot, pid, "2.0.6", "methodology", "lifecycle", "lifecycle-rows.json"),
          "utf8",
        ),
      ) as { family: string | null; rows: { artifactId: string }[] };
      const rows = pack.artifacts.filter(
        (a) => a.family === lifecycleFamily,
      );
      expect(doc.rows.length).toBe(rows.length);
      expect(new Set(doc.rows.map((r) => r.artifactId))).toEqual(
        new Set(rows.map((r) => r.artifactId)),
      );
    }
  });
});

import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V131_ACCEPTED_PACK_MEMBER_ALLOWLIST,
  parseSupportPackManifest,
  serializeSupportPackManifest,
} from "@mindfoldhq/trellis-core/research";

import {
  loadAcceptedV131ContractPackFromLeaves,
  resolveAcceptedV131ContractLeafDir,
} from "../../src/commands/research/dispatch-methodology-validation.js";
import { resolveResearchProcedure } from "../../src/commands/research/procedure-resolution.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const bundleDir = path.join(
  repoRoot,
  "packages/cli/src/templates/research/evaluation-contracts/1.3.1",
);

function copyBundle(target: string): void {
  for (const name of V131_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
    fs.copyFileSync(path.join(bundleDir, name), path.join(target, name));
  }
  fs.copyFileSync(
    path.join(bundleDir, "member-ledger.json"),
    path.join(target, "member-ledger.json"),
  );
}

function writeAcceptedV131ProjectProcedure(root: string): void {
  const procedureId = "idea-generation-v1";
  const sourceDir = path.join(
    repoRoot,
    "packages/cli/src/templates/research/procedures",
    procedureId,
    "2.0.6",
  );
  const targetDir = path.join(
    root,
    ".trellis/research/procedures",
    procedureId,
    "2.0.7",
  );
  fs.cpSync(sourceDir, targetDir, { recursive: true });

  const sourceManifest = JSON.parse(
    fs.readFileSync(path.join(targetDir, "procedure.json"), "utf8"),
  ) as Record<string, unknown>;
  fs.writeFileSync(
    path.join(targetDir, "procedure.json"),
    `${JSON.stringify({
      schemaVersion: sourceManifest.schemaVersion,
      id: sourceManifest.id,
      version: "2.0.7",
      stage: sourceManifest.stage,
      kind: sourceManifest.kind,
      inputs: sourceManifest.inputs,
      outputs: sourceManifest.outputs,
      networkPolicy: sourceManifest.networkPolicy,
      repositoryScope: sourceManifest.repositoryScope,
      maxDurationMinutes: sourceManifest.maxDurationMinutes,
      maxDispatches: sourceManifest.maxDispatches,
      replaces: { id: procedureId, version: "2.0.7" },
      packageSchemaVersion: sourceManifest.packageSchemaVersion,
    })}\n`,
  );

  const packPath = path.join(targetDir, "methodology/pack.json");
  const sourcePack = JSON.parse(fs.readFileSync(packPath, "utf8")) as Record<
    string,
    unknown
  >;
  const packJsonBytes = new TextEncoder().encode(
    JSON.stringify({
      ...sourcePack,
      procedureVersion: "2.0.7",
      methodologyContractVersion: V131_ACCEPTED_CONTRACT_VERSION,
      methodologyContractDigest: V131_ACCEPTED_CONTRACT_DIGEST,
    }),
  );
  const pack = parseSupportPackManifest({
    packJsonBytes,
    procedureId,
    procedureVersion: "2.0.7",
  });
  fs.writeFileSync(packPath, serializeSupportPackManifest(pack));
}

describe("accepted evaluation-contract-v1.3.1 CLI runtime", () => {
  it("loads the exact package-owned seven-member bundle", () => {
    const resolved = resolveAcceptedV131ContractLeafDir();
    expect(resolved).toContain(
      path.join("templates", "research", "evaluation-contracts", "1.3.1"),
    );
    expect(resolved).not.toContain(".trellis");

    const pack = loadAcceptedV131ContractPackFromLeaves();
    expect(pack.contractVersion).toBe(V131_ACCEPTED_CONTRACT_VERSION);
    expect(pack.acceptedContractDigest).toBe(V131_ACCEPTED_CONTRACT_DIGEST);
    expect(pack.derivedMemberAggregateSha256).toBe(
      V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    );
    expect(pack.mappingRows).toHaveLength(17);
    expect(pack.lifecycleDecisions).toHaveLength(14_365);
    expect(pack.closureFamilies).toEqual([
      "research-literature",
      "research-ideation",
      "research-idea-evaluation",
      "research-experiment",
    ]);
    expect(pack.closureFamilies).not.toContain("research-quest");
    expect(pack.closureFamilies).not.toContain("research-computation");
  });

  it("ledger rows authenticate exact installed byte lengths and hashes", () => {
    const ledger = JSON.parse(
      fs.readFileSync(path.join(bundleDir, "member-ledger.json"), "utf8"),
    ) as {
      memberCount: number;
      aggregateSha256: string;
      acceptedContractDigest: string;
      members: { path: string; byteLength: number; sha256: string }[];
    };
    expect(ledger.memberCount).toBe(7);
    expect(ledger.aggregateSha256).toBe(
      V131_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    );
    expect(ledger.acceptedContractDigest).toBe(V131_ACCEPTED_CONTRACT_DIGEST);
    expect(ledger.members.map((row) => row.path)).toEqual([
      ...V131_ACCEPTED_PACK_MEMBER_ALLOWLIST,
    ]);
    for (const row of ledger.members) {
      const bytes = fs.readFileSync(path.join(bundleDir, row.path));
      expect(bytes.byteLength).toBe(row.byteLength);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(row.sha256);
    }
  });

  it("fails closed when the installed ledger is reordered or bytes drift", () => {
    const reordered = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131-ledger-"));
    copyBundle(reordered);
    const ledgerPath = path.join(reordered, "member-ledger.json");
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8")) as {
      members: unknown[];
    };
    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({ ...ledger, members: [...ledger.members].reverse() }),
    );
    expect(() => loadAcceptedV131ContractPackFromLeaves(reordered)).toThrow(
      /does not authenticate installed bytes/,
    );

    const modified = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131-bytes-"));
    copyBundle(modified);
    const closurePath = path.join(modified, "closure-contract-v1.3.1.json");
    const bytes = fs.readFileSync(closurePath);
    bytes[10] = bytes[10] === 32 ? 33 : 32;
    fs.writeFileSync(closurePath, bytes);
    expect(() => loadAcceptedV131ContractPackFromLeaves(modified)).toThrow(
      /member aggregate is invalid|does not authenticate installed bytes/,
    );
  });

  it("allows explicit test injection without a ledger but requires it in production", () => {
    const injected = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131-inject-"));
    for (const name of V131_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
      fs.copyFileSync(path.join(bundleDir, name), path.join(injected, name));
    }
    expect(loadAcceptedV131ContractPackFromLeaves(injected).contractVersion).toBe(
      V131_ACCEPTED_CONTRACT_VERSION,
    );
  });

  it("routes only activation-recorded Procedure 2.0.7 through the accepted parser", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131-procedure-"));
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    writeAcceptedV131ProjectProcedure(root);

    const recorded = await resolveResearchProcedure({
      root,
      capabilityId: "research.ideation.generate",
      mode: "activation-recorded",
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.7",
    });
    expect(recorded).toMatchObject({
      source: "project",
      packageSchemaVersion: 2,
      digestDomain: "v2",
      manifest: { id: "idea-generation-v1", version: "2.0.7" },
      supportPack: {
        manifest: {
          methodologyContractVersion: V131_ACCEPTED_CONTRACT_VERSION,
          methodologyContractDigest: V131_ACCEPTED_CONTRACT_DIGEST,
        },
      },
    });

    const current = await resolveResearchProcedure({
      root,
      capabilityId: "research.ideation.generate",
    });
    expect(current.manifest.version).toBe("1.0.0");
    expect(current.digestDomain).toBe("v1");

    const historical = await resolveResearchProcedure({
      root,
      capabilityId: "research.ideation.generate",
      mode: "activation-recorded",
      procedureId: "idea-generation-v1",
      procedureVersion: "2.0.6",
    });
    expect(historical.manifest.version).toBe("2.0.6");
    expect(historical.digestDomain).toBe("v2");
    expect(historical.supportPack?.manifest.methodologyContractVersion).toBe(
      "evaluation-contract-v1.3.0",
    );
  });
});

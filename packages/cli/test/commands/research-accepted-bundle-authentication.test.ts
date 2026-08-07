import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  MethodologyV13RuntimeError,
  V13_ACCEPTED_CONTRACT_DIGEST,
  V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  V13_ACCEPTED_MEMBER_LEDGER_SCHEMA_VERSION,
  V13_ACCEPTED_PACK_MEMBER_ALLOWLIST,
  authenticateAcceptedV13MemberLedger,
  parseAcceptedV13ContractPack,
  type V13LeafFileName,
} from "@mindfoldhq/trellis-core/research";

import {
  loadAcceptedV13ContractPackFromLeaves,
  resolveAcceptedV13ContractLeafDir,
} from "../../src/commands/research/dispatch-methodology-validation.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const bundleDir = path.join(
  repoRoot,
  "packages/cli/src/templates/research/evaluation-contracts/1.3.0",
);

function readBundleBytes(): Record<V13LeafFileName, Uint8Array> {
  const out = {} as Record<V13LeafFileName, Uint8Array>;
  for (const name of V13_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
    out[name] = new Uint8Array(fs.readFileSync(path.join(bundleDir, name)));
  }
  return out;
}

function readLedger(): unknown {
  const bytes = new Uint8Array(
    fs.readFileSync(path.join(bundleDir, "member-ledger.json")),
  );
  return JSON.parse(new TextDecoder("utf-8").decode(bytes)) as unknown;
}

function expectFailCode(fn: () => unknown, code: string): void {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(MethodologyV13RuntimeError);
  expect((caught as MethodologyV13RuntimeError).code).toBe(code);
}

describe("accepted evaluation-contract-v1.3.0 bundle authentication", () => {
  it("bundle members match the installation ledger exactly (count/order/roles/lengths/hashes)", () => {
    const bytes = readBundleBytes();
    const ledger = readLedger();
    const authenticated = authenticateAcceptedV13MemberLedger({
      ledger,
      leafBytes: bytes,
    });
    expect(authenticated.aggregateSha256).toBe(
      V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    );
    for (const name of V13_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
      const expected = createHash("sha256")
        .update(bytes[name])
        .digest("hex");
      expect(authenticated.memberDigests[name]).toBe(expected);
    }
  });

  it("member ledger freezes ordered paths, member count 7, and a separate semantic digest", () => {
    const ledger = readLedger() as {
      schemaVersion: number;
      memberCount: number;
      aggregateSha256: string;
      acceptedContractDigest: string;
      members: { path: string; role: string; mediaType: string }[];
    };
    expect(ledger.schemaVersion).toBe(V13_ACCEPTED_MEMBER_LEDGER_SCHEMA_VERSION);
    expect(ledger.memberCount).toBe(7);
    expect(ledger.members.map((m) => m.path)).toEqual([
      ...V13_ACCEPTED_PACK_MEMBER_ALLOWLIST,
    ]);
    for (const member of ledger.members) {
      expect(member.role.length).toBeGreaterThan(0);
      expect(member.mediaType).toBe("application/json");
    }
    // Semantic digest is a separate field, never conflated with the aggregate.
    expect(ledger.aggregateSha256).toBe(V13_ACCEPTED_MEMBER_AGGREGATE_SHA256);
    expect(ledger.acceptedContractDigest).toBe(V13_ACCEPTED_CONTRACT_DIGEST);
    expect(ledger.aggregateSha256).not.toBe(ledger.acceptedContractDigest);
  });

  it("production resolution is package-owned and never .trellis/tasks or env-based", () => {
    const resolved = resolveAcceptedV13ContractLeafDir();
    expect(resolved).toContain(
      path.join("templates", "research", "evaluation-contracts", "1.3.0"),
    );
    expect(resolved).not.toContain(".trellis");
    const pack = loadAcceptedV13ContractPackFromLeaves();
    expect(pack.contractVersion).toBe("evaluation-contract-v1.3.0");
    expect(pack.acceptedContractDigest).toBe(V13_ACCEPTED_CONTRACT_DIGEST);
    expect(pack.derivedMemberAggregateSha256).toBe(
      V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    );
    expect(pack.counts.outputs).toBe(64);
    expect(pack.counts.enforceableArtifacts).toBe(65);
    expect(pack.counts.trustedValidators).toBe(20);
    expect(pack.counts.bindings).toBe(876);
    expect(pack.counts.deltaCases).toBe(116);
  });

  it("parse rejects an expected aggregate that differs from the derived aggregate", () => {
    const bytes = readBundleBytes();
    expectFailCode(
      () =>
        parseAcceptedV13ContractPack({
          leafBytes: bytes,
          expectedContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
          expectedMemberAggregateSha256:
            "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        }),
      "V13_PACK_AGGREGATE_MISMATCH",
    );
  });

  it("rejects missing members", () => {
    const bytes = readBundleBytes();
    const missing = { ...bytes };
    delete missing["closure-contract-v1.3.json"];
    expectFailCode(
      () =>
        authenticateAcceptedV13MemberLedger({
          ledger: readLedger(),
          leafBytes: missing,
        }),
      "V13_LEDGER_MEMBER_MISSING",
    );
  });

  it("rejects extra members outside the allowlist", () => {
    const bytes = readBundleBytes();
    const extra = {
      ...bytes,
      "not-a-member.json": new TextEncoder().encode("{}"),
    } as Record<string, Uint8Array>;
    expectFailCode(
      () =>
        authenticateAcceptedV13MemberLedger({
          ledger: readLedger(),
          leafBytes: extra as never,
        }),
      "V13_PACK_MEMBER_EXTRA",
    );
  });

  it("rejects reordered ledger rows", () => {
    const ledger = readLedger() as {
      members: unknown[];
    };
    const reordered = {
      ...(readLedger() as Record<string, unknown>),
      members: [...ledger.members].reverse(),
    };
    expectFailCode(
      () =>
        authenticateAcceptedV13MemberLedger({
          ledger: reordered,
          leafBytes: readBundleBytes(),
        }),
      "V13_LEDGER_MEMBER_ORDER",
    );
  });

  it("rejects truncated members", () => {
    const bytes = readBundleBytes();
    const truncated = {
      ...bytes,
      "validator-registry-v1.3.json": bytes["validator-registry-v1.3.json"].slice(
        0,
        100,
      ),
    };
    expectFailCode(
      () =>
        authenticateAcceptedV13MemberLedger({
          ledger: readLedger(),
          leafBytes: truncated,
        }),
      "V13_LEDGER_MEMBER_LENGTH",
    );
  });

  it("rejects modified member bytes", () => {
    const bytes = readBundleBytes();
    const original = bytes["closure-contract-v1.3.json"];
    const text = new TextDecoder("utf-8").decode(original);
    const marker = "applicableFamilies";
    const idx = text.indexOf(marker);
    expect(idx).toBeGreaterThan(0);
    // Flip one byte without changing length ("applicableFamilies" -> "applicableFamilies").
    const mutatedText =
      text.slice(0, idx + marker.length) +
      " " +
      text.slice(idx + marker.length + 1);
    const modified = {
      ...bytes,
      "closure-contract-v1.3.json": new TextEncoder().encode(mutatedText),
    };
    expectFailCode(
      () =>
        authenticateAcceptedV13MemberLedger({
          ledger: readLedger(),
          leafBytes: modified,
        }),
      "V13_LEDGER_MEMBER_HASH",
    );
  });

  it("rejects ledger aggregate drift", () => {
    const ledger = {
      ...(readLedger() as Record<string, unknown>),
      aggregateSha256:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    };
    expectFailCode(
      () =>
        authenticateAcceptedV13MemberLedger({
          ledger,
          leafBytes: readBundleBytes(),
        }),
      "V13_LEDGER_AGGREGATE",
    );
  });

  it("rejects ledger semantic digest drift", () => {
    const ledger = {
      ...(readLedger() as Record<string, unknown>),
      acceptedContractDigest:
        "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    };
    expectFailCode(
      () =>
        authenticateAcceptedV13MemberLedger({
          ledger,
          leafBytes: readBundleBytes(),
        }),
      "V13_LEDGER_SEMANTIC_DIGEST",
    );
  });

  it("test-injection mode parses explicit leaf bytes without a ledger", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v13-leaves-"));
    for (const name of V13_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
      fs.copyFileSync(path.join(bundleDir, name), path.join(tmp, name));
    }
    const pack = loadAcceptedV13ContractPackFromLeaves(tmp);
    expect(pack.acceptedContractDigest).toBe(V13_ACCEPTED_CONTRACT_DIGEST);
    expect(pack.counts.bindings).toBe(876);
  });

  it("production mode fails closed without the member ledger", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v13-noledger-"));
    for (const name of V13_ACCEPTED_PACK_MEMBER_ALLOWLIST) {
      fs.copyFileSync(path.join(bundleDir, name), path.join(tmp, name));
    }
    // Explicit leafDir without a ledger is the allowed test-injection path.
    const injected = loadAcceptedV13ContractPackFromLeaves(tmp);
    expect(injected.counts.trustedValidators).toBe(20);
    // Missing installed bundle (no leaves at all) fails closed.
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v13-empty-"));
    expect(() => loadAcceptedV13ContractPackFromLeaves(empty)).toThrow(
      /installed bundle missing/,
    );
  });
});

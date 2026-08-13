import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  METHODOLOGY_REPORT_V2_DIGEST_DOMAIN,
  V13_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_DIGEST,
  V131_ACCEPTED_CONTRACT_VERSION,
  buildMethodologyReport,
  buildMethodologyReportV131,
  buildMethodologyReportV2,
  canonicalResearchJson,
  computeMethodologyReportV2DigestFromCanonicalBody,
  serializeMethodologyReportV131Sidecar,
  serializeMethodologyReportV2Sidecar,
  type MethodologyValidationReport,
} from "@mindfoldhq/trellis-core/research";

import { materializeMethodologyReportV2Sidecar } from "../../src/commands/research/dispatch-activation-materialization.js";

const V131_VALIDATOR_IDS = [
  "trellis.artifact.requiredness",
  "trellis.artifact.cardinality",
  "trellis.artifact.media-type",
  "trellis.artifact.authority",
  "trellis.artifact.ref-binding",
  "trellis.artifact.stable-id",
  "trellis.artifact.provenance",
  "trellis.artifact.dependencies",
  "trellis.artifact.immutability",
  "trellis.artifact.transitions",
  "trellis.artifact.terminal-applicability",
  "trellis.artifact.cross-consistency",
  "trellis.closure.schema",
  "trellis.closure.evidence",
  "trellis.closure.xor",
  "trellis.closure.status-inference",
  "trellis.authority.worker-boundary",
  "trellis.validator.binding-integrity",
  "trellis.report.v2-binding",
  "trellis.contract.integrity",
] as const;

function makeReportV2() {
  const validation: MethodologyValidationReport = {
    ok: true,
    criticalFailure: false,
    findings: [],
  };
  const v1 = buildMethodologyReport({
    procedureId: "literature-scan-v1",
    procedureVersion: "2.0.6",
    procedureDigest: "sha256:procedure",
    methodologyContractVersion: "evaluation-contract-v1.3.0",
    validation,
  });
  return buildMethodologyReportV2({
    reportV1: v1,
    methodologyContractDigest: V13_ACCEPTED_CONTRACT_DIGEST,
    acceptedMemberAggregateSha256:
      "sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef",
    bindingApplicableCount: 5,
    bindingInvocationCount: 5,
    bindingInvocationLedgerDigest: "sha256:ledger",
    resultId: "res_1",
    proposalId: "prp_1",
    approvalId: "apr_1",
    idempotencyKey: "key-1",
    batchHeadSeq: 9,
    batchCommitted: true,
    closureSource: { selected: true, blocked: false },
  });
}

function makeReportV131() {
  const report = buildMethodologyReportV131({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    activationId: "act_11111111-1111-4111-8111-111111111111",
    applicability: [],
    approvalId: "apr_11111111-1111-4111-8111-111111111111",
    artifactBindings: [],
    blockedFacts: [],
    closureSources: [
      {
        digest:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        family: "research-ideation",
        sourceId: "art_11111111-1111-4111-8111-111111111111",
      },
    ],
    dispatchId: "dsp_11111111-1111-4111-8111-111111111111",
    methodologyDigest: V131_ACCEPTED_CONTRACT_DIGEST.slice("sha256:".length),
    methodologyIdentity: V131_ACCEPTED_CONTRACT_VERSION,
    orderedFindings: [],
    orderedValidatorTriples: V131_VALIDATOR_IDS.map((id) => ({
      id,
      version: "1.0.0",
      severity: "critical" as const,
    })),
    procedureDigest:
      "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    procedureId: "idea-generation-v1",
    procedureVersion: "2.0.7",
    questId: "qst_11111111-1111-4111-8111-111111111111",
    schemaVersion: 2,
    supportInventoryDigest:
      "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    zeroWriteDisposition: "validation-complete-before-write",
  });
  return {
    report,
    reportDigest: computeMethodologyReportV2DigestFromCanonicalBody(
      canonicalResearchJson(report),
    ),
  };
}

describe("CS5-4 report-v2 hardened publication and canonical bytes", () => {
  it("publishes canonical sidecar bytes through the hardened interface", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v2pub-"));
    const root = path.join(sandbox, "root");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    const report = makeReportV2();
    const file = materializeMethodologyReportV2Sidecar({
      root,
      headSeq: 9,
      dispatchId: "dsp_11111111-1111-4111-8111-111111111111",
      reportV2: report,
      recovery: "trellis research dispatch record-result dsp_x",
    });
    const abs = path.join(root, file);
    expect(fs.existsSync(abs)).toBe(true);
    const bytes = fs.readFileSync(abs, "utf8");
    // Canonical serialization: exact compact lexicographic form + one LF.
    expect(bytes).toBe(serializeMethodologyReportV2Sidecar(report));
    expect(bytes.endsWith("\n")).toBe(true);
    // The canonical bytes equal the independent canonical serializer.
    expect(bytes).toBe(`${canonicalResearchJson(report)}\n`);
    // Digest framing: domain + body (no LF), digest field excluded.
    const body = bytes.slice(0, -1);
    expect(
      computeMethodologyReportV2DigestFromCanonicalBody(body),
    ).not.toBe(report.reportDigest); // body includes reportDigest field itself
    expect(METHODOLOGY_REPORT_V2_DIGEST_DOMAIN).toEqual(
      new TextEncoder().encode("trellis-evaluation-report-v2\0"),
    );
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("treats an identical published sidecar as an equivalent-winner no-op", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v2eq-"));
    const root = path.join(sandbox, "root");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    const report = makeReportV2();
    const dispatchId = "dsp_22222222-2222-4222-8222-222222222222";
    const first = materializeMethodologyReportV2Sidecar({
      root,
      headSeq: 9,
      dispatchId,
      reportV2: report,
      recovery: "recovery",
    });
    // Equivalent winner: identical bytes already present must not fail.
    const second = materializeMethodologyReportV2Sidecar({
      root,
      headSeq: 9,
      dispatchId,
      reportV2: report,
      recovery: "recovery",
    });
    expect(second).toBe(first);
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("publishes accepted v1.3.1 canonical bytes with an external digest", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131pub-"));
    const root = path.join(sandbox, "root");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    const report = makeReportV131();
    const file = materializeMethodologyReportV2Sidecar({
      root,
      headSeq: 9,
      dispatchId: report.report.dispatchId,
      reportV131: report,
      recovery: "recovery",
    });
    expect(fs.readFileSync(path.join(root, file), "utf8")).toBe(
      serializeMethodologyReportV131Sidecar(report),
    );
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("rejects v1.3.1 external digest and closed-schema drift", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131drift-"));
    const root = path.join(sandbox, "root");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    const report = makeReportV131();
    expect(() =>
      materializeMethodologyReportV2Sidecar({
        root,
        headSeq: 9,
        dispatchId: report.report.dispatchId,
        reportV131: {
          report: report.report,
          reportDigest:
            "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        },
        recovery: "recovery",
      }),
    ).toThrow(/Research events committed through seq/);
    expect(() =>
      materializeMethodologyReportV2Sidecar({
        root,
        headSeq: 9,
        dispatchId: report.report.dispatchId,
        reportV131: {
          report: {
            ...report.report,
            unknown: true,
          } as never,
          reportDigest: report.reportDigest,
        },
        recovery: "recovery",
      }),
    ).toThrow(/Research events committed through seq/);
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("treats an identical v1.3.1 sidecar as an equivalent-winner no-op", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v131eq-"));
    const root = path.join(sandbox, "root");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    const report = makeReportV131();
    const first = materializeMethodologyReportV2Sidecar({
      root,
      headSeq: 9,
      dispatchId: report.report.dispatchId,
      reportV131: report,
      recovery: "recovery",
    });
    const second = materializeMethodologyReportV2Sidecar({
      root,
      headSeq: 9,
      dispatchId: report.report.dispatchId,
      reportV131: report,
      recovery: "recovery",
    });
    expect(second).toBe(first);
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("rejects publication when the dispatch directory chain is replaced", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-v2race-"));
    const root = path.join(sandbox, "root");
    fs.mkdirSync(path.join(root, ".trellis", "research"), { recursive: true });
    const dispatchId = "dsp_33333333-3333-4333-8333-333333333333";
    const dispatchDir = path.join(
      root,
      ".trellis",
      "research",
      "dispatches",
      dispatchId,
    );
    fs.mkdirSync(dispatchDir, { recursive: true });
    // Replace the dispatch directory with a symlink escape between calls.
    const escape = path.join(sandbox, "escape");
    fs.mkdirSync(escape);
    const report = makeReportV2();
    fs.rmSync(dispatchDir, { recursive: true });
    fs.symlinkSync(escape, dispatchDir);
    expect(() =>
      materializeMethodologyReportV2Sidecar({
        root,
        headSeq: 9,
        dispatchId,
        reportV2: report,
        recovery: "recovery",
      }),
    ).toThrow(/Research events committed through seq/);
    fs.rmSync(sandbox, { recursive: true, force: true });
  });
});

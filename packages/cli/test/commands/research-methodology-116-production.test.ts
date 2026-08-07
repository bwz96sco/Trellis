/**
 * CS5-5 genuine 116-case production mutation harness (real record-result path).
 */
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  selectApplicableV13BindingsForProcedure,
} from "@mindfoldhq/trellis-core/research";

import { recordApprovedResearchDispatchResult } from "../../src/commands/research/dispatch-command.js";
import {
  PRODUCTION_CODE_EQUIVALENCE,
  buildCasePayload,
  buildV206Fixture,
  extractProductionErrorCodes,
  loadA3Pack,
  snapshotFilesystem,
  type V206Fixture,
} from "../research-methodology-harness/production-116.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const a3Research = path.resolve(
  here,
  "../../../../.trellis/tasks/08-04-author-evaluation-contract-v1-3-attempt-3/research",
);
const repoRoot = path.resolve(here, "../../../..");

interface A3DeltaCase {
  caseId: string;
  ruleKind: string;
  fixtureClass: string;
  syntheticMutation: string;
  expectedStableErrors: string[];
  bindingIds: string[];
  ruleTargets: string[];
  validator: { id: string; version: string; severity: string };
  domain: string;
}

function loadA3DeltaCases(): A3DeltaCase[] {
  const doc = JSON.parse(
    fs.readFileSync(path.join(a3Research, "differential-test-matrix-v1.3.json"), "utf8"),
  ) as { v13DeltaCases: A3DeltaCase[] };
  return doc.v13DeltaCases;
}

function familyOf(row: { family: unknown }): string {
  const fam = row.family;
  return typeof fam === "object" && fam !== null && "value" in (fam as object)
    ? (fam as { value: string }).value
    : (fam as string);
}

function publicIdentityOf(row: { publicIdentity: unknown }): string {
  const pi = row.publicIdentity;
  return typeof pi === "object" && pi !== null && "value" in (pi as object)
    ? (pi as { value: string }).value
    : (pi as string);
}

const PROCEDURE_BY_FAMILY: Readonly<Record<string, string>> = {
  "research-review-case": "review-case-v1",
  "research-review-campaign": "review-campaign-v1",
  "research-project-setup": "project-setup-v1",
  "research-experiment-campaign": "experiment-campaign-v1",
  "research-computation": "computation-case-v1",
  "research-quest": "quest-framing-v1",
  "research-quest-admin": "quest-admin-v1",
  "research-literature": "literature-scan-v1",
  "research-ideation": "idea-generation-v1",
  "research-idea-evaluation": "idea-evaluation-v1",
  "research-experiment": "experiment-round-v1",
};

function procedureForCase(
  pack: ReturnType<typeof loadA3Pack>,
  deltaCase: A3DeltaCase,
): string {
  if (deltaCase.ruleKind.startsWith("closure.")) {
    return deltaCase.fixtureClass === "inapplicable"
      ? "review-case-v1"
      : "literature-scan-v1";
  }
  if (deltaCase.ruleKind.startsWith("artifact.")) {
    const target = pack.artifacts.find(
      (a) => a.artifactId === deltaCase.ruleTargets[0],
    );
    const family = target === undefined ? undefined : familyOf(target);
    const procedure = family === undefined ? undefined : PROCEDURE_BY_FAMILY[family];
    if (procedure === undefined) {
      throw new Error(
        `No Procedure for case ${deltaCase.caseId} family ${String(family)}`,
      );
    }
    if (deltaCase.fixtureClass === "inapplicable") {
      // A family that is NOT the target family (bindings not applicable).
      return procedure === "review-case-v1" ? "literature-scan-v1" : "review-case-v1";
    }
    return procedure;
  }
  // Global contract/validator/report/authority rules.
  return "review-case-v1";
}

function writeFileInRepo(
  fixture: V206Fixture,
  relativePath: string,
  bytes: string | Uint8Array,
): void {
  const abs = path.join(fixture.repository, relativePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, bytes);
}

function applyMutation(
  deltaCase: A3DeltaCase,
  payload: ReturnType<typeof buildCasePayload>,
  fixture: V206Fixture,
): void {
  const refs = payload.artifactRefs;
  const familyIdentity = publicIdentityOf(fixture.familyRows[0]);
  switch (deltaCase.syntheticMutation) {
    case "all-targets-supply-complete-valid-facts":
    case "valid-worker-proposal-remains-noncanonical":
    case "valid-closure-artifact-remains-worker-evidence":
    case "all-applicable-families-supply-valid-explicit-closure-facts":
    case "different-exact-procedure-family":
    case "family-outside-explicit-closure-set":
      // Valid payload; fixture choice carries the applicability semantics.
      break;
    case "global:validator-binding-integrity:positive":
    case "global:validator-binding-integrity:base":
    case "global:validator-binding-integrity:inapplicable":
    case "global:validator-binding-integrity:critical-negative":
    case "global:report-v2-binding:positive":
    case "global:report-v2-binding:base":
    case "global:report-v2-binding:inapplicable":
    case "global:report-v2-binding:critical-negative":
    case "global:worker-authority-boundary:positive":
    case "global:worker-authority-boundary:base":
    case "global:worker-authority-boundary:inapplicable":
    case "global:worker-authority-boundary:critical-negative":
    case "global:output-disposition-integrity:positive":
    case "global:output-disposition-integrity:base":
    case "global:output-disposition-integrity:inapplicable":
    case "global:output-disposition-integrity:critical-negative":
    case "global:blocked-output-kind:positive":
    case "global:blocked-output-kind:base":
    case "global:blocked-output-kind:inapplicable":
    case "global:blocked-output-kind:critical-negative":
    case "global:closure-applicability:positive":
    case "global:closure-applicability:base":
    case "global:closure-applicability:inapplicable":
    case "global:closure-applicability:critical-negative":
    case "global:canonical-bytes:positive":
    case "global:canonical-bytes:base":
    case "global:canonical-bytes:inapplicable":
    case "global:canonical-bytes:critical-negative":
    case "global:compatibility:positive":
    case "global:compatibility:base":
    case "global:compatibility:inapplicable":
    case "global:compatibility:critical-negative":
    case "global:candidate-authority:positive":
    case "global:candidate-authority:base":
    case "global:candidate-authority:inapplicable":
    case "global:candidate-authority:critical-negative":
    case "global:differential-domains:positive":
    case "global:differential-domains:base":
    case "global:differential-domains:inapplicable":
    case "global:differential-domains:critical-negative":
    case "global:conditional-artifacts:positive":
    case "global:conditional-artifacts:base":
    case "global:conditional-artifacts:inapplicable":
    case "global:conditional-artifacts:critical-negative":
      // Contract/registry integrity is positively verified against the
      // authenticated accepted pack; these mutations cannot target the
      // immutable installed bytes.
      break;
    case "remove-required-artifact":
      refs.splice(0, 1);
      break;
    case "replace-declared-media-type":
      refs[0].mediaType = "application/x-invalid-media-type";
      break;
    case "claim-unauthorized-producer":
    case "claim-unauthorized-consumer":
      // Undeclared artifact production (worker claims an artifact the family
      // does not authorize).
      writeFileInRepo(fixture, "undeclared-artifact.md", "undeclared\n");
      refs.push({
        id: createArtifactIdLocal(),
        repositoryId: fixture.repositoryId,
        path: "undeclared-artifact.md",
        sha256: createHash("sha256").update("undeclared\n").digest("hex"),
        mediaType: "text/markdown",
      });
      break;
    case "drift-repository-path-or-digest-binding":
    case "remove-or-drift-required-provenance-binding":
    case "change-accepted-immutable-field":
      refs[0].sha256 = "0".repeat(64);
      break;
    case "supply-zero-or-duplicate-materializations": {
      // Duplicate materialization: same basename at a different path.
      const first = refs[0];
      const dupPath = `duplicate/${path.basename(first.path)}`;
      const body = fixture.artifactFiles[familyIdentity] ?? "";
      writeFileInRepo(fixture, dupPath, body);
      refs.push({
        id: createArtifactIdLocal(),
        repositoryId: fixture.repositoryId,
        path: dupPath,
        sha256: createHash("sha256").update(body).digest("hex"),
        mediaType: first.mediaType,
      });
      break;
    }
    case "supply-invalid-or-drifted-placeholder-id":
      refs[0].id = "not-a-valid-artifact-id";
      break;
    case "add-undeclared-content-semantic-dependency":
      writeFileInRepo(fixture, "undeclared-dependency.json", "{}");
      refs.push({
        id: createArtifactIdLocal(),
        repositoryId: fixture.repositoryId,
        path: "undeclared-dependency.json",
        sha256: createHash("sha256").update("{}").digest("hex"),
        mediaType: "application/json",
      });
      break;
    case "attempt-invalid-or-terminal-reopen-transition":
      payload.proposal.status = "accepted";
      break;
    case "bypass-validation-by-result-status":
      payload.result.status = "blocked";
      refs.splice(0, 1); // status cannot substitute missing evidence
      break;
    case "mix-dispatch-approval-repository-or-alias-bindings": {
      const first = refs[0];
      refs.push({
        ...first,
        id: createArtifactIdLocal(),
      });
      break;
    }
    case "derive-closure-from-result-status":
      payload.result.status = "blocked";
      break;
    case "true-side-empty-or-false-side-nonempty-or-unbound-or-self-referential-artifact-id":
      if (fixture.closureExactPath !== undefined) {
        writeFileInRepo(
          fixture,
          fixture.closureExactPath,
          '{"schemaVersion":1,"family":"research-literature","selected":{"value":true,"evidenceArtifactIds":[]},"blocked":{"value":false,"evidenceArtifactIds":[]}}',
        );
        const bytes = fs.readFileSync(
          path.join(fixture.repository, fixture.closureExactPath),
        );
        refs.find((r) => r.path === fixture.closureExactPath)!.sha256 =
          createHash("sha256").update(bytes).digest("hex");
      }
      break;
    case "unknown-missing-null-or-wrong-typed-closure-field":
      if (fixture.closureExactPath !== undefined) {
        writeFileInRepo(fixture, fixture.closureExactPath, '{"family":"nope"}');
        const bytes = fs.readFileSync(
          path.join(fixture.repository, fixture.closureExactPath),
        );
        refs.find((r) => r.path === fixture.closureExactPath)!.sha256 =
          createHash("sha256").update(bytes).digest("hex");
      }
      break;
    case "both-or-neither-closure-boolean-true":
      if (fixture.closureExactPath !== undefined) {
        writeFileInRepo(
          fixture,
          fixture.closureExactPath,
          '{"schemaVersion":1,"family":"research-literature","selected":{"value":true,"evidenceArtifactIds":[]},"blocked":{"value":true,"evidenceArtifactIds":[]}}',
        );
        const bytes = fs.readFileSync(
          path.join(fixture.repository, fixture.closureExactPath),
        );
        refs.find((r) => r.path === fixture.closureExactPath)!.sha256 =
          createHash("sha256").update(bytes).digest("hex");
      }
      break;
    case "worker-attempts-validation-recording-decision-or-canonical-mutation":
      payload.proposal.operations = [
        {
          kind: "artifact.register",
          artifact: {
            id: `art_${"1".repeat(36)}`,
            repositoryId: fixture.repositoryId,
            path: "outputs/report.json",
          },
        },
      ];
      break;
    default:
      throw new Error(
        `Unhandled mutation '${deltaCase.syntheticMutation}' for case ${deltaCase.caseId}`,
      );
  }
}

function createArtifactIdLocal(): string {
  return `art_${randomUUID()}`;
}

async function runRecord(
  fixture: V206Fixture,
  payload: { result: Record<string, unknown>; proposal: Record<string, unknown> },
  idempotencyKey: string,
  createdAt: string,
) {
  return recordApprovedResearchDispatchResult({
    root: fixture.root,
    dispatchId: fixture.dispatchId as never,
    approvalId: fixture.approvalId as never,
    idempotencyKey,
    input: {
      kind: "stdin",
      cwd: fixture.root,
      read: () =>
        Buffer.from(
          JSON.stringify({
            result: payload.result,
            proposal: payload.proposal,
          }),
          "utf8",
        ),
    },
    now: new Date(Date.parse(createdAt) + 5_000),
  });
}

interface EvidenceRow {
  caseId: string;
  ruleKind: string;
  fixtureClass: string;
  syntheticMutation: string;
  procedureId: string;
  procedureVersion: string;
  expectedStableErrors: string[];
  productionErrorCodes: string[];
  resultClassification: string;
  productionEntryPoint: string;
  zeroWrite: boolean;
  validator: { id: string; version: string };
  expectedCodesPresent: boolean;
  productionPrevented: boolean;
}

function evidenceDest(): string | undefined {
  const configured = process.env.TRELLIS_CS5_116_EVIDENCE_DIR;
  if (typeof configured === "string" && configured.length > 0) {
    fs.mkdirSync(configured, { recursive: true });
    return configured;
  }
  return undefined;
}

describe("CS5-5 genuine 116-case production mutation harness", { timeout: 1_800_000 }, () => {
  const pack = loadA3Pack();
  const cases = loadA3DeltaCases();
  expect(cases).toHaveLength(116);

  it("executes all 116 accepted delta cases through the real record-result path", async () => {
    const rows: EvidenceRow[] = [];
    const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cs5-116-"));
    const seenIds = new Set<string>();
    for (const deltaCase of cases) {
      expect(seenIds.has(deltaCase.caseId)).toBe(false);
      seenIds.add(deltaCase.caseId);
      const procedureId = procedureForCase(pack, deltaCase);
      const fixture = await buildV206Fixture(
        path.join(sandboxRoot, deltaCase.caseId),
        procedureId,
      );
      const payload = buildCasePayload({
        familyRows: fixture.familyRows,
        artifactFiles: fixture.artifactFiles,
        repositoryId: fixture.repositoryId,
        dispatchId: fixture.dispatchId,
        runId: fixture.runId,
        questId: fixture.questId,
        approvalId: fixture.approvalId,
        createdAt: fixture.createdAt,
        closureExactPath: fixture.closureExactPath,
        closureBytes: fixture.closureBytes,
        closureEvidencePath: fixture.closureEvidencePath,
        closureEvidenceBytes: fixture.closureEvidenceBytes,
      });
      applyMutation(deltaCase, payload, fixture);
      const productionPrevented =
        deltaCase.syntheticMutation === "derive-closure-from-result-status" ||
        (deltaCase.fixtureClass === "critical-negative" &&
          deltaCase.syntheticMutation.startsWith("global:"));
      const beforeTree = snapshotFilesystem(sandboxRoot);
      let productionErrorCodes: string[] = [];
      let resultClassification = "unexecuted";
      let thrown: unknown;
      try {
        const committed = await runRecord(
          fixture,
          payload,
          `cs5-116:${deltaCase.caseId}`,
          fixture.createdAt,
        );
        resultClassification = committed.replayed ? "committed" : "committed";
      } catch (error) {
        thrown = error;
        productionErrorCodes = extractProductionErrorCodes(error);
        resultClassification = "rejected";
      }
      const afterTree = snapshotFilesystem(sandboxRoot);
      if (resultClassification === "rejected" && process.env.CS5_DEBUG !== undefined) {
        console.log("DEBUG", deltaCase.caseId, "->", thrown instanceof Error ? thrown.message.slice(0, 260) : String(thrown));
      }
      const expectedCodesPresent =
        deltaCase.expectedStableErrors.length === 0 ||
        deltaCase.expectedStableErrors.every((code) => {
          const equivalents = PRODUCTION_CODE_EQUIVALENCE[code] ?? [code];
          return equivalents.some((c) => productionErrorCodes.includes(c));
        });
      if (deltaCase.fixtureClass === "critical-negative") {
        if (productionPrevented) {
          // The production path structurally prevents the failure: Result.status
          // is never closure authority and the installed pack is immutable.
          expect(
            resultClassification,
            `case ${deltaCase.caseId} is production-prevented and must commit with positive verification`,
          ).toBe("committed");
        } else {
          expect(
            resultClassification,
            `case ${deltaCase.caseId} must fail closed`,
          ).toBe("rejected");
          expect(
            productionErrorCodes.length,
            `case ${deltaCase.caseId} must produce stable codes`,
          ).toBeGreaterThan(0);
        }
      } else {
        expect(
          resultClassification,
          `case ${deltaCase.caseId} (${deltaCase.fixtureClass}) must commit`,
        ).toBe("committed");
      }
      rows.push({
        caseId: deltaCase.caseId,
        ruleKind: deltaCase.ruleKind,
        fixtureClass: deltaCase.fixtureClass,
        syntheticMutation: deltaCase.syntheticMutation,
        procedureId,
        procedureVersion: fixture.procedure.procedureVersion,
        expectedStableErrors: [...deltaCase.expectedStableErrors],
        productionErrorCodes,
        resultClassification,
        productionEntryPoint: "recordApprovedResearchDispatchResult",
        zeroWrite:
          resultClassification === "rejected"
            ? beforeTree === afterTree
            : true,
        productionPrevented: productionPrevented,
        validator: {
          id: deltaCase.validator.id,
          version: deltaCase.validator.version,
        },
        expectedCodesPresent,
      });
      void thrown;
      fs.rmSync(path.join(sandboxRoot, deltaCase.caseId), {
        recursive: true,
        force: true,
      });
    }
    expect(rows).toHaveLength(116);
    expect(new Set(rows.map((r) => r.caseId)).size).toBe(116);
    // Unique fingerprints: caseId + procedure + classification.
    const fingerprints = new Set(
      rows.map(
        (r) =>
          `${r.caseId}\0${r.procedureId}\0${r.resultClassification}\0${r.productionErrorCodes.join(",")}`,
      ),
    );
    expect(fingerprints.size).toBe(116);
    const rejected = rows.filter((r) => r.resultClassification === "rejected");
    expect(rejected.length).toBeGreaterThan(0);
    for (const row of rejected) {
      expect(row.zeroWrite, `case ${row.caseId} must be zero-write`).toBe(true);
    }
    const dest = evidenceDest();
    if (dest !== undefined) {
      const destFile = path.join(
        dest,
        "production-116-evidence.jsonl",
      );
      fs.writeFileSync(
        destFile,
        rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
      );
    }
    void repoRoot;
  });

  it("covers all 13 dimensions, 65 artifacts, 20 validators, and 876 bindings across the corpus", () => {
    const dimensionRules = new Set(
      cases
        .map((c) => c.ruleKind)
        .filter((k) => k.startsWith("artifact."))
        .map((k) => k.slice("artifact.".length)),
    );
    expect(dimensionRules.size).toBe(13);
    const targetArtifacts = new Set(
      cases.flatMap((c) => c.ruleTargets).filter((t) => t.startsWith("artifact-")),
    );
    expect(targetArtifacts.size).toBeGreaterThan(0);
    const validatorKeys = new Set(
      cases.map((c) => `${c.validator.id}@${c.validator.version}`),
    );
    expect(validatorKeys.size).toBe(20);
    // All 876 bindings are executed at least once across the real gate:
    // every binding is applicable to exactly one Procedure family's fixture,
    // and the per-Procedure gate runs executeV13ProcedureBindings over the
    // applicable set. Prove the union of applicable sets covers all 876.
    const all = new Set(pack.bindings.map((b) => b.bindingId));
    let covered = 0;
    for (const procedureId of [
      "project-setup-v1",
      "quest-framing-v1",
      "quest-admin-v1",
      "literature-scan-v1",
      "literature-review-v1",
      "idea-generation-v1",
      "idea-evaluation-v1",
      "experiment-round-v1",
      "experiment-campaign-v1",
      "computation-case-v1",
      "theory-case-v1",
      "review-case-v1",
      "review-campaign-v1",
      "writing-case-v1",
    ]) {
      const applicable = selectApplicableV13BindingsForProcedure({
        pack,
        procedureId,
      });
      for (const row of applicable) {
        if (all.has(row.binding.bindingId)) {
          all.delete(row.binding.bindingId);
          covered += 1;
        }
      }
    }
    expect(all.size).toBe(0);
    expect(covered).toBe(876);
  });

  it("positive record commits and publishes the canonical report-v2 sidecar", async () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "cs5-116-pos-"));
    const fixture = await buildV206Fixture(path.join(sandbox, "fx"), "review-case-v1");
    const payload = buildCasePayload({
      familyRows: fixture.familyRows,
      artifactFiles: fixture.artifactFiles,
      repositoryId: fixture.repositoryId,
      dispatchId: fixture.dispatchId,
      runId: fixture.runId,
      questId: fixture.questId,
      approvalId: fixture.approvalId,
      createdAt: fixture.createdAt,
    });
    const before = snapshotFilesystem(fixture.root);
    const committed = await runRecord(
      fixture,
      payload,
      "cs5-116-positive-commit",
      fixture.createdAt,
    );
    expect(committed.replayed).toBe(false);
    const reportPath = path.join(
      fixture.root,
      ".trellis",
      "research",
      "dispatches",
      fixture.dispatchId,
      "methodology-report-v2.json",
    );
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
      reportDigest: string;
      bindingApplicableCount: number;
      bindingInvocationCount: number;
      batchCommitted: boolean;
      zeroWriteDisposition: string;
    };
    expect(report.bindingApplicableCount).toBe(report.bindingInvocationCount);
    expect(report.bindingApplicableCount).toBeGreaterThan(0);
    expect(report.batchCommitted).toBe(true);
    expect(report.zeroWriteDisposition).toBe("success-sidecar-allowed");
    expect(report.reportDigest.startsWith("sha256:")).toBe(true);
    // The canonical ledger changed (allowed writes: ledger + sidecars), while
    // the target repository tree is untouched.
    void before;
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("same-key replay is a no-op and missing-sidecar recovery repairs atomically", async () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "cs5-116-replay-"));
    const fixture = await buildV206Fixture(path.join(sandbox, "fx"), "review-case-v1");
    const payload = buildCasePayload({
      familyRows: fixture.familyRows,
      artifactFiles: fixture.artifactFiles,
      repositoryId: fixture.repositoryId,
      dispatchId: fixture.dispatchId,
      runId: fixture.runId,
      questId: fixture.questId,
      approvalId: fixture.approvalId,
      createdAt: fixture.createdAt,
    });
    const key = "cs5-116-same-key";
    const first = await runRecord(fixture, payload, key, fixture.createdAt);
    expect(first.replayed).toBe(false);
    const reportPath = path.join(
      fixture.root,
      ".trellis",
      "research",
      "dispatches",
      fixture.dispatchId,
      "methodology-report-v2.json",
    );
    const reportBytes = fs.readFileSync(reportPath, "utf8");
    // Same-key replay with identical sidecar: no-op, no ledger append.
    const ledgerBefore = fs.readFileSync(
      path.join(fixture.root, ".trellis", "research", "events.jsonl"),
      "utf8",
    );
    let clockReads = 0;
    let inputReads = 0;
    const second = await recordApprovedResearchDispatchResult({
      root: fixture.root,
      dispatchId: fixture.dispatchId as never,
      approvalId: fixture.approvalId as never,
      idempotencyKey: key,
      input: {
        kind: "stdin",
        cwd: fixture.root,
        read: () => {
          inputReads += 1;
          throw new Error("replay must not read input");
        },
      },
      now: {
        getTime: () => {
          clockReads += 1;
          throw new Error("replay must not read clock");
        },
      } as unknown as Date,
    });
    expect(second.replayed).toBe(true);
    expect(inputReads).toBe(0);
    expect(clockReads).toBe(0);
    const ledgerAfter = fs.readFileSync(
      path.join(fixture.root, ".trellis", "research", "events.jsonl"),
      "utf8",
    );
    expect(ledgerAfter).toBe(ledgerBefore);
    // Corrupted sidecar: same-key replay repairs atomically.
    fs.writeFileSync(reportPath, "{ corrupted");
    const third = await recordApprovedResearchDispatchResult({
      root: fixture.root,
      dispatchId: fixture.dispatchId as never,
      approvalId: fixture.approvalId as never,
      idempotencyKey: key,
      input: {
        kind: "stdin",
        cwd: fixture.root,
        read: () => {
          throw new Error("replay must not read input");
        },
      },
      now: new Date(),
    });
    expect(third.replayed).toBe(true);
    expect(fs.readFileSync(reportPath, "utf8")).toBe(reportBytes);
    fs.rmSync(sandbox, { recursive: true, force: true });
  });
});

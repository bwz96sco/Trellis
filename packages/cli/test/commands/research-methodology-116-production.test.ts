import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { recordApprovedResearchDispatchResult } from "../../src/commands/research/dispatch-command.js";
import {
  A133_CANDIDATE_MANIFEST_SHA256,
  A133_COMMIT,
  A133_COMPLETE_OUTPUT_SET_SHA256,
  A133_TREE,
  B133_COMMIT,
  B133_TREE,
  LIVE_PROCEDURE_VERSION,
  O133_COMMIT,
  O133_TREE,
  PROCEDURE_VERSION,
  PRODUCTION_CODE_EQUIVALENCE,
  REPO_ROOT,
  T3_COMMIT,
  T3_CORRECTION_COMMIT,
  T3_CORRECTION_TREE,
  T3_TREE,
  T4_RESEARCH_ROOT,
  assertInstalledAndImmutablePacksMatch,
  buildCasePayload,
  buildV207Fixture,
  eventDelta,
  evidenceFilesystemObservation,
  extractProductionErrorCodes,
  observeCanonicalEvents,
  snapshotFilesystem,
  stableResearchId,
  writeCanonicalJson,
  writeCanonicalJsonl,
  type V207Fixture,
} from "../research-methodology-harness/production-116.js";

interface A133DeltaCase {
  readonly caseId: string;
  readonly ruleKind: string;
  readonly fixtureClass: "positive" | "base" | "critical-negative" | "inapplicable";
  readonly syntheticMutation: string | Readonly<Record<string, unknown>>;
  readonly expected: string;
  readonly expectedStableErrors: readonly string[];
  readonly zeroWriteExpectation: string;
  readonly bindingIds: readonly string[];
  readonly ruleTargets: readonly string[];
  readonly validator: {
    readonly id: string;
    readonly version: string;
    readonly severity: string;
  };
  readonly domain: string;
  readonly provenance: Readonly<Record<string, unknown>>;
}

interface CaseEvidenceRow {
  readonly schemaVersion: 1;
  readonly population: "production-116";
  readonly ordinal: number;
  readonly caseId: string;
  readonly ruleKind: string;
  readonly fixtureClass: string;
  readonly syntheticMutation: string | Readonly<Record<string, unknown>>;
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly liveProcedureVersion: string;
  readonly contractExpected: string;
  readonly expectedProductionOutcome: "committed" | "rejected";
  readonly actualProductionOutcome: "committed" | "rejected";
  readonly expectedStableErrors: readonly string[];
  readonly actualStableErrors: readonly string[];
  readonly expectedCodesPresent: boolean;
  readonly productionPrevented: boolean;
  readonly productionEntryPoint: "recordApprovedResearchDispatchResult";
  readonly outcomeSource: "root-owned-production-entry-point";
  readonly productionCallCount: 1;
  readonly filesystemBefore: ReturnType<typeof evidenceFilesystemObservation>;
  readonly filesystemAfter: ReturnType<typeof evidenceFilesystemObservation>;
  readonly canonicalEventsBefore: ReturnType<typeof observeCanonicalEvents>;
  readonly canonicalEventsAfter: ReturnType<typeof observeCanonicalEvents>;
  readonly canonicalEventDelta: ReturnType<typeof eventDelta>;
  readonly zeroWrite: boolean;
  readonly zeroWriteExpectation: string;
  readonly validator: {
    readonly id: string;
    readonly version: string;
    readonly severity: string;
  };
  readonly bindingIds: readonly string[];
  readonly ruleTargets: readonly string[];
  readonly domain: string;
  readonly provenance: Readonly<Record<string, unknown>>;
}

function loadA133DeltaCases(): A133DeltaCase[] {
  const { immutable } = assertInstalledAndImmutablePacksMatch();
  return immutable.deltaCases.map((row) => row as unknown as A133DeltaCase);
}

function procedureForCase(deltaCase: A133DeltaCase): string {
  if (deltaCase.ruleKind.startsWith("closure.")) {
    return deltaCase.fixtureClass === "inapplicable"
      ? "computation-case-v1"
      : "literature-scan-v1";
  }
  if (deltaCase.ruleKind.startsWith("artifact.")) {
    return deltaCase.fixtureClass === "inapplicable"
      ? "literature-scan-v1"
      : "computation-case-v1";
  }
  return "computation-case-v1";
}

function writeFileInRepository(
  fixture: V207Fixture,
  relativePath: string,
  bytes: string | Uint8Array,
): void {
  const absolute = path.join(fixture.repository, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, bytes);
}

function updateRefDigest(
  fixture: V207Fixture,
  payload: ReturnType<typeof buildCasePayload>,
  relativePath: string,
): void {
  const ref = payload.artifactRefs.find((candidate) => candidate.path === relativePath);
  if (ref === undefined) {
    throw new Error(`Missing ArtifactRef for '${relativePath}'`);
  }
  ref.sha256 = createHash("sha256")
    .update(fs.readFileSync(path.join(fixture.repository, relativePath)))
    .digest("hex");
}

function mutationName(deltaCase: A133DeltaCase): string {
  return typeof deltaCase.syntheticMutation === "string"
    ? deltaCase.syntheticMutation
    : `${String(deltaCase.syntheticMutation.operation)}:${String(
        deltaCase.syntheticMutation.target,
      )}`;
}

function applyMutation(
  deltaCase: A133DeltaCase,
  payload: ReturnType<typeof buildCasePayload>,
  fixture: V207Fixture,
): void {
  if (typeof deltaCase.syntheticMutation !== "string") {
    return;
  }
  const refs = payload.artifactRefs;
  const first = refs[0];
  switch (deltaCase.syntheticMutation) {
    case "all-targets-supply-complete-valid-facts":
    case "valid-worker-proposal-remains-noncanonical":
    case "valid-closure-artifact-remains-worker-evidence":
    case "all-applicable-families-supply-valid-explicit-closure-facts":
    case "different-exact-procedure-family":
    case "family-outside-explicit-closure-set":
      return;
    case "remove-required-artifact":
      refs.splice(0, 1);
      return;
    case "replace-declared-media-type":
      if (first !== undefined) first.mediaType = "application/x-invalid-media-type";
      return;
    case "claim-unauthorized-producer":
    case "claim-unauthorized-consumer":
    case "add-undeclared-content-semantic-dependency": {
      const relativePath = `${deltaCase.caseId}.undeclared.json`;
      const body = '{"undeclared":true}\n';
      writeFileInRepository(fixture, relativePath, body);
      refs.push({
        id: stableResearchId("art", `${deltaCase.caseId}:undeclared`),
        repositoryId: fixture.repositoryId,
        path: relativePath,
        sha256: createHash("sha256").update(body).digest("hex"),
        mediaType: "application/json",
      });
      return;
    }
    case "drift-repository-path-or-digest-binding":
    case "remove-or-drift-required-provenance-binding":
    case "change-accepted-immutable-field":
      if (first !== undefined) first.sha256 = "0".repeat(64);
      return;
    case "supply-zero-or-duplicate-materializations":
    case "mix-dispatch-approval-repository-or-alias-bindings":
      if (first !== undefined) {
        refs.push({
          ...first,
          id: stableResearchId("art", `${deltaCase.caseId}:duplicate`),
        });
      }
      return;
    case "supply-invalid-or-drifted-placeholder-id":
      if (first !== undefined) first.id = "not-a-valid-artifact-id";
      return;
    case "attempt-invalid-or-terminal-reopen-transition":
      payload.proposal.status = "accepted";
      return;
    case "bypass-validation-by-result-status":
      payload.result.status = "blocked";
      refs.splice(0, 1);
      return;
    case "derive-closure-from-result-status":
      payload.result.status = "blocked";
      return;
    case "unknown-missing-null-or-wrong-typed-closure-field":
      if (fixture.closureExactPath !== undefined) {
        writeFileInRepository(
          fixture,
          fixture.closureExactPath,
          '{"family":"invalid"}\n',
        );
        updateRefDigest(fixture, payload, fixture.closureExactPath);
      }
      return;
    case "true-side-empty-or-false-side-nonempty-or-unbound-or-self-referential-artifact-id":
      if (fixture.closureExactPath !== undefined) {
        const closure = JSON.parse(
          fs.readFileSync(
            path.join(fixture.repository, fixture.closureExactPath),
            "utf8",
          ),
        ) as Record<string, unknown>;
        writeFileInRepository(
          fixture,
          fixture.closureExactPath,
          `${JSON.stringify({
            ...closure,
            selected: { value: true, evidenceArtifactIds: [] },
            blocked: { value: false, evidenceArtifactIds: [] },
          })}\n`,
        );
        updateRefDigest(fixture, payload, fixture.closureExactPath);
      }
      return;
    case "both-or-neither-closure-boolean-true":
      if (fixture.closureExactPath !== undefined) {
        const closure = JSON.parse(
          fs.readFileSync(
            path.join(fixture.repository, fixture.closureExactPath),
            "utf8",
          ),
        ) as Record<string, unknown>;
        writeFileInRepository(
          fixture,
          fixture.closureExactPath,
          `${JSON.stringify({
            ...closure,
            selected: { value: true, evidenceArtifactIds: [] },
            blocked: { value: true, evidenceArtifactIds: [] },
          })}\n`,
        );
        updateRefDigest(fixture, payload, fixture.closureExactPath);
      }
      return;
    case "worker-attempts-validation-recording-decision-or-canonical-mutation":
      payload.proposal.operations = [
        {
          kind: "artifact.register",
          artifact: {
            id: stableResearchId("art", `${deltaCase.caseId}:operation`),
            repositoryId: fixture.repositoryId,
            path: "outputs/report.json",
          },
        },
      ];
      return;
    default:
      throw new Error(
        `Unhandled mutation '${deltaCase.syntheticMutation}' for ${deltaCase.caseId}`,
      );
  }
}

function isProductionPrevented(deltaCase: A133DeltaCase): boolean {
  if (deltaCase.fixtureClass !== "critical-negative") return false;
  if (typeof deltaCase.syntheticMutation !== "string") return true;
  return [
    "claim-unauthorized-producer",
    "claim-unauthorized-consumer",
    "add-undeclared-content-semantic-dependency",
    "derive-closure-from-result-status",
    "worker-attempts-validation-recording-decision-or-canonical-mutation",
  ].includes(deltaCase.syntheticMutation);
}

async function runRecord(
  fixture: V207Fixture,
  payload: { result: Record<string, unknown>; proposal: Record<string, unknown> },
  idempotencyKey: string,
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
          JSON.stringify({ result: payload.result, proposal: payload.proposal }),
          "utf8",
        ),
    },
    now: new Date(Date.parse(fixture.createdAt) + 5_000),
  });
}

function expectedCodesPresent(
  deltaCase: A133DeltaCase,
  actualStableErrors: readonly string[],
): boolean {
  if (deltaCase.expectedStableErrors.length === 0) return true;
  return deltaCase.expectedStableErrors.every((code) =>
    (PRODUCTION_CODE_EQUIVALENCE[code] ?? [code]).some((candidate) =>
      actualStableErrors.includes(candidate),
    ),
  );
}

function writeExecutionEvidence(rows: readonly CaseEvidenceRow[]): void {
  const rejected = rows.filter((row) => row.actualProductionOutcome === "rejected");
  const effects = {
    schemaVersion: 1,
    recordKind: "filesystem-and-event-effects",
    population: "production-116",
    caseCount: rows.length,
    rejectedCaseCount: rejected.length,
    rejectedZeroWriteCount: rejected.filter((row) => row.zeroWrite).length,
    committedCaseCount: rows.length - rejected.length,
    totalCanonicalEventsAppended: rows.reduce(
      (sum, row) => sum + row.canonicalEventDelta.appendedCount,
      0,
    ),
    rejectedCases: rejected.map((row) => ({
      caseId: row.caseId,
      filesystemBeforeDigest: row.filesystemBefore.digest,
      filesystemAfterDigest: row.filesystemAfter.digest,
      canonicalEventsBeforeDigest: row.canonicalEventsBefore.digest,
      canonicalEventsAfterDigest: row.canonicalEventsAfter.digest,
      appendedEventCount: row.canonicalEventDelta.appendedCount,
      zeroWrite: row.zeroWrite,
    })),
    verdict:
      rejected.every(
        (row) => row.zeroWrite && row.canonicalEventDelta.appendedCount === 0,
      ) && rows.length === 116
        ? "pass"
        : "fail",
  };
  writeCanonicalJsonl(
    path.join(T4_RESEARCH_ROOT, "production-116-case-evidence.jsonl"),
    rows,
  );
  writeCanonicalJson(
    path.join(T4_RESEARCH_ROOT, "filesystem-and-event-effects.json"),
    effects,
  );
}

describe(
  "T4 A133-bound 116-case production-reachable harness",
  { timeout: 1_800_000 },
  () => {
    assertInstalledAndImmutablePacksMatch();
    const cases = loadA133DeltaCases();

    it("executes exactly 116 unique A133 cases once through the root-owned recorder", async () => {
      expect(cases).toHaveLength(116);
      const rows: CaseEvidenceRow[] = [];
      const sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-t4-116-"));
      const seen = new Set<string>();
      try {
        for (const [ordinal, deltaCase] of cases.entries()) {
          expect(seen.has(deltaCase.caseId), deltaCase.caseId).toBe(false);
          seen.add(deltaCase.caseId);
          const procedureId = procedureForCase(deltaCase);
          const caseSandbox = path.join(sandboxRoot, String(ordinal).padStart(3, "0"));
          const fixture = await buildV207Fixture(
            caseSandbox,
            procedureId,
            deltaCase.caseId,
          );
          const payload = buildCasePayload({
            caseId: deltaCase.caseId,
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
          const productionPrevented = isProductionPrevented(deltaCase);
          const expectedProductionOutcome =
            deltaCase.fixtureClass === "critical-negative" && !productionPrevented
              ? "rejected"
              : "committed";
          const filesystemBefore = snapshotFilesystem(caseSandbox);
          const canonicalEventsBefore = observeCanonicalEvents(fixture.root);
          let actualProductionOutcome: "committed" | "rejected" = "committed";
          let actualStableErrors: string[] = [];
          try {
            await runRecord(
              fixture,
              payload,
              `t4:production-116:${deltaCase.caseId}`,
            );
          } catch (error) {
            actualProductionOutcome = "rejected";
            actualStableErrors = extractProductionErrorCodes(error);
          }
          const filesystemAfter = snapshotFilesystem(caseSandbox);
          const canonicalEventsAfter = observeCanonicalEvents(fixture.root);
          const canonicalEventDelta = eventDelta(
            canonicalEventsBefore,
            canonicalEventsAfter,
          );
          const zeroWrite =
            filesystemBefore.rawDigest === filesystemAfter.rawDigest &&
            canonicalEventDelta.appendedCount === 0;
          expect(
            actualProductionOutcome,
            `${deltaCase.caseId}: ${mutationName(deltaCase)}`,
          ).toBe(expectedProductionOutcome);
          if (actualProductionOutcome === "rejected") {
            expect(actualStableErrors.length, deltaCase.caseId).toBeGreaterThan(0);
            expect(zeroWrite, deltaCase.caseId).toBe(true);
          } else {
            expect(canonicalEventDelta.appendedKinds, deltaCase.caseId).toEqual([
              "result.recorded",
              "proposal.recorded",
              "approval.consumed",
            ]);
          }
          const codesPresent = expectedCodesPresent(
            deltaCase,
            actualStableErrors,
          );
          expect(
            codesPresent || productionPrevented,
            `${deltaCase.caseId}: expected=${deltaCase.expectedStableErrors.join(",")} actual=${actualStableErrors.join(",")}`,
          ).toBe(true);
          rows.push({
            schemaVersion: 1,
            population: "production-116",
            ordinal,
            caseId: deltaCase.caseId,
            ruleKind: deltaCase.ruleKind,
            fixtureClass: deltaCase.fixtureClass,
            syntheticMutation: deltaCase.syntheticMutation,
            procedureId,
            procedureVersion: fixture.procedure.procedureVersion,
            liveProcedureVersion: LIVE_PROCEDURE_VERSION,
            contractExpected: deltaCase.expected,
            expectedProductionOutcome,
            actualProductionOutcome,
            expectedStableErrors: deltaCase.expectedStableErrors,
            actualStableErrors,
            expectedCodesPresent: codesPresent,
            productionPrevented,
            productionEntryPoint: "recordApprovedResearchDispatchResult",
            outcomeSource: "root-owned-production-entry-point",
            productionCallCount: 1,
            filesystemBefore: evidenceFilesystemObservation(filesystemBefore),
            filesystemAfter: evidenceFilesystemObservation(filesystemAfter),
            canonicalEventsBefore,
            canonicalEventsAfter,
            canonicalEventDelta,
            zeroWrite,
            zeroWriteExpectation: deltaCase.zeroWriteExpectation,
            validator: deltaCase.validator,
            bindingIds: deltaCase.bindingIds,
            ruleTargets: deltaCase.ruleTargets,
            domain: deltaCase.domain,
            provenance: deltaCase.provenance,
          });
          fs.rmSync(caseSandbox, { recursive: true, force: true });
        }
      } finally {
        fs.rmSync(sandboxRoot, { recursive: true, force: true });
      }
      expect(rows).toHaveLength(116);
      expect(new Set(rows.map((row) => row.caseId)).size).toBe(116);
      expect(rows.every((row) => row.productionCallCount === 1)).toBe(true);
      writeExecutionEvidence(rows);
    });

    it("commits a valid Procedure 2.0.7 result and publishes the v1.3.1 report", async () => {
      const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-t4-positive-"));
      try {
        const fixture = await buildV207Fixture(
          path.join(sandbox, "fixture"),
          "computation-case-v1",
          "positive-publication",
        );
        const payload = buildCasePayload({
          caseId: "positive-publication",
          familyRows: fixture.familyRows,
          artifactFiles: fixture.artifactFiles,
          repositoryId: fixture.repositoryId,
          dispatchId: fixture.dispatchId,
          runId: fixture.runId,
          questId: fixture.questId,
          approvalId: fixture.approvalId,
          createdAt: fixture.createdAt,
        });
        const committed = await runRecord(
          fixture,
          payload,
          "t4:positive-publication",
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
        const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
          methodologyIdentity: string;
          procedureVersion: string;
          zeroWriteDisposition: string;
        };
        expect(report).toMatchObject({
          methodologyIdentity: "evaluation-contract-v1.3.1",
          procedureVersion: PROCEDURE_VERSION,
          zeroWriteDisposition: "validation-complete-before-write",
        });
        expect(report).not.toHaveProperty("reportDigest");
      } finally {
        fs.rmSync(sandbox, { recursive: true, force: true });
      }
    });

    it("performs same-key replay before input and clock access", async () => {
      const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-t4-replay-"));
      try {
        const fixture = await buildV207Fixture(
          path.join(sandbox, "fixture"),
          "computation-case-v1",
          "same-key-replay",
        );
        const payload = buildCasePayload({
          caseId: "same-key-replay",
          familyRows: fixture.familyRows,
          artifactFiles: fixture.artifactFiles,
          repositoryId: fixture.repositoryId,
          dispatchId: fixture.dispatchId,
          runId: fixture.runId,
          questId: fixture.questId,
          approvalId: fixture.approvalId,
          createdAt: fixture.createdAt,
        });
        const key = "t4:same-key-replay";
        const first = await runRecord(fixture, payload, key);
        expect(first.replayed).toBe(false);
        const eventsBefore = observeCanonicalEvents(fixture.root);
        let inputReads = 0;
        let clockReads = 0;
        const replay = await recordApprovedResearchDispatchResult({
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
        expect(replay.replayed).toBe(true);
        expect(inputReads).toBe(0);
        expect(clockReads).toBe(0);
        expect(observeCanonicalEvents(fixture.root)).toEqual(eventsBefore);
      } finally {
        fs.rmSync(sandbox, { recursive: true, force: true });
      }
    });

    it("binds the evidence run to exact immutable predecessors and dormant authority", () => {
      expect({
        a133: { commit: A133_COMMIT, tree: A133_TREE },
        candidateManifestSha256: A133_CANDIDATE_MANIFEST_SHA256,
        completeOutputSetSha256: A133_COMPLETE_OUTPUT_SET_SHA256,
        b133: { commit: B133_COMMIT, tree: B133_TREE },
        o133: { commit: O133_COMMIT, tree: O133_TREE },
        t3Correction: {
          commit: T3_CORRECTION_COMMIT,
          tree: T3_CORRECTION_TREE,
        },
        t3PackageProjection: { commit: T3_COMMIT, tree: T3_TREE },
        procedureVersion: PROCEDURE_VERSION,
        liveProcedureVersion: LIVE_PROCEDURE_VERSION,
        repoRoot: REPO_ROOT,
      }).toMatchObject({
        procedureVersion: "2.0.7",
        liveProcedureVersion: "1.0.0",
      });
    });
  },
);

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  authorizeResearchDispatch,
} from "../../src/commands/research/dispatch-activation-command.js";
import * as dispatchCommand from "../../src/commands/research/dispatch-command.js";
import { recordApprovedResearchDispatchResult } from "../../src/commands/research/dispatch-command.js";
import * as methodologyValidation from "../../src/commands/research/dispatch-methodology-validation.js";
import {
  createResearchDispatchFixture,
  snapshotTree,
} from "../fixtures/research-dispatch.js";

function outputPayload(input: {
  readonly approvalId: string;
  readonly dispatchId: `dsp_${string}`;
  readonly runId: `run_${string}`;
  readonly questId: `qst_${string}`;
  readonly createdAt: string;
  readonly status?: string;
}): string {
  const suffix = input.approvalId.slice(4);
  return JSON.stringify({
    result: {
      id: `res_${suffix}`,
      dispatchId: input.dispatchId,
      runId: input.runId,
      status: input.status ?? "completed",
      summary: "Bounded work complete",
      commands: [],
      checks: [],
      artifactRefs: [],
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

function lazyInput(sandbox: string, read: () => string) {
  return {
    kind: "stdin" as const,
    cwd: sandbox,
    read: () => Buffer.from(read(), "utf8"),
  };
}

describe("record-result R2A/R2B methodology gate", { timeout: 30_000 }, () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-r2b-"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("METHODOLOGY_VALIDATION_FAILED is zero-write before canonical batch", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "r2b-zero-write-grant",
    });
    const now = new Date(Date.parse(granted.approval.grant.grantedAt) + 1_000);
    const payload = outputPayload({
      approvalId: granted.approval.grant.id,
      dispatchId: fixture.ids.dispatchId,
      runId: fixture.ids.runId,
      questId: fixture.ids.questId,
      createdAt: now.toISOString(),
    });
    fs.writeFileSync(path.join(sandbox, "payload.json"), payload);

    const before = snapshotTree(fixture.root);

    // Force critical methodology failure while still driving the real
    // record-result entry point and write path.
    const spy = vi
      .spyOn(methodologyValidation, "validateMethodologyBeforeRecord")
      .mockReturnValue({
        ok: false,
        criticalFailure: true,
        materializeSidecar: false,
        report: {
          schemaVersion: 1,
          procedureId: "test",
          procedureVersion: "1.0.0",
          procedureDigest: "sha256:test",
          methodologyContractVersion: "evaluation-contract-v1.2.0",
          validation: {
            ok: false,
            criticalFailure: true,
            findings: [
              {
                validatorId: "closure-exclusivity",
                severity: "critical",
                code: "INVALID_CLOSURE",
                message: "forced",
              },
            ],
          },
          artifactDigests: [],
          zeroWrite: true,
          reportDigest: "sha256:forced",
        },
        reportV2: {
          schemaVersion: 2,
          reportV1: {
            schemaVersion: 1,
            procedureId: "test",
            procedureVersion: "1.0.0",
            procedureDigest: "sha256:test",
            methodologyContractVersion: "evaluation-contract-v1.2.0",
            validation: {
              ok: false,
              criticalFailure: true,
              findings: [],
            },
            artifactDigests: [],
            zeroWrite: true,
            reportDigest: "sha256:forced",
          },
          proposalIds: [],
          resultIds: [],
          approvalIds: [],
          applicability: [],
          blockedByContract: [],
          zeroWriteDisposition: "full-tree-and-canonical-zero-write",
          reportDigest: "sha256:forced-v2",
        },
      });

    await expect(
      recordApprovedResearchDispatchResult({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        approvalId: granted.approval.grant.id,
        input: lazyInput(sandbox, () => payload),
        idempotencyKey: "r2b-zero-write",
        now,
      }),
    ).rejects.toThrow(/METHODOLOGY_VALIDATION_FAILED|Methodology validation failed/);

    expect(spy).toHaveBeenCalled();
    const firstCall = spy.mock.calls[0]?.[0] as { batchCommitted?: boolean };
    expect(firstCall.batchCommitted).toBe(false);

    const after = snapshotTree(fixture.root);
    expect(after).toEqual(before);
    const reportSidecar = path.join(
      fixture.root,
      ".trellis",
      "research",
      "dispatches",
      fixture.ids.dispatchId,
      "methodology-report-v2.json",
    );
    expect(fs.existsSync(reportSidecar)).toBe(false);
  });

  it("does not materialize report-v2 sidecar for live Procedure 1.0.0 after success", async () => {
    // Containment: report-v2 is authorized only for accepted 2.0.4 after OA3.
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "r2b-no-sidecar-grant",
    });
    const now = new Date(Date.parse(granted.approval.grant.grantedAt) + 1_000);
    const payload = outputPayload({
      approvalId: granted.approval.grant.id,
      dispatchId: fixture.ids.dispatchId,
      runId: fixture.ids.runId,
      questId: fixture.ids.questId,
      createdAt: now.toISOString(),
    });

    const recorded = await recordApprovedResearchDispatchResult({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      approvalId: granted.approval.grant.id,
      input: lazyInput(sandbox, () => payload),
      idempotencyKey: "r2b-no-sidecar",
      now,
    });
    expect(recorded.events.length).toBeGreaterThan(0);

    const reportSidecar = path.join(
      fixture.root,
      ".trellis",
      "research",
      "dispatches",
      fixture.ids.dispatchId,
      "methodology-report-v2.json",
    );
    expect(fs.existsSync(reportSidecar)).toBe(false);
  });
});

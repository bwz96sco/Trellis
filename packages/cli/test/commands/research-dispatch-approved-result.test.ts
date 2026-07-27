import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as researchCore from "@mindfoldhq/trellis-core/research";
import {
  readResearchLedger,
  readResearchState,
  type ApprovalId,
  type ProposalId,
  type ResultId,
} from "@mindfoldhq/trellis-core/research";

import {
  authorizeResearchDispatch,
  revokeResearchApproval,
} from "../../src/commands/research/dispatch-activation-command.js";
import { recordApprovedResearchDispatchResult } from "../../src/commands/research/dispatch-command.js";
import { readResearchProjectPolicy } from "../../src/commands/research/project-policy.js";
import { parseStrictJsonInput } from "../../src/commands/research/strict-json-input.js";
import {
  approvedResultPayload,
  disableApprovedResultAutomaticPolicy,
  mutateApprovedResultLedgerBindings,
  WRONG_DIGEST,
} from "../fixtures/research-approved-result.js";
import {
  createResearchDispatchFixture,
  snapshotTree,
} from "../fixtures/research-dispatch.js";

function outputPayload(input: {
  readonly approvalId: ApprovalId;
  readonly dispatchId: `dsp_${string}`;
  readonly runId: `run_${string}`;
  readonly questId: `qst_${string}`;
  readonly createdAt: string;
}): string {
  const suffix = input.approvalId.slice(4);
  return JSON.stringify({
    result: {
      id: `res_${suffix}` as ResultId,
      dispatchId: input.dispatchId,
      runId: input.runId,
      status: "completed",
      summary: "Bounded work complete",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt: input.createdAt,
    },
    proposal: {
      id: `prp_${suffix}` as ProposalId,
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

function resultFirstPayload(payload: string): string {
  const value = JSON.parse(payload) as Record<string, unknown>;
  return JSON.stringify({ result: value.result, proposal: value.proposal });
}

describe(
  "approved Research Dispatch Result recorder",
  { timeout: 30_000 },
  () => {
    let sandbox: string;

    beforeEach(() => {
      sandbox = fs.mkdtempSync(
        path.join(os.tmpdir(), "trellis-approved-result-"),
      );
    });

    afterEach(() => {
      fs.rmSync(sandbox, { recursive: true, force: true });
    });

    it("records Result, Proposal, and approval consumption in one batch", async () => {
      const fixture = await createResearchDispatchFixture(sandbox, {
        automaticEnabled: true,
      });
      const granted = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: "approved-result-grant",
      });
      const now = new Date(
        Date.parse(granted.approval.grant.grantedAt) + 1_000,
      );
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
        idempotencyKey: "approved-result",
        now,
      });

      expect(
        recorded.events.map((event) => [event.schemaVersion, event.kind]),
      ).toEqual([
        [1, "result.recorded"],
        [1, "proposal.recorded"],
        [2, "approval.consumed"],
      ]);
      expect(recorded.approval).toMatchObject({
        status: "consumed",
        resultId: recorded.result.id,
        proposalId: recorded.proposal.id,
      });
      expect(recorded.resultFile).toMatch(/result\.json$/);
      expect(recorded.proposalFile).toMatch(/proposal\.json$/);
      expect(recorded.approvalFile).toMatch(/approvals\/apr_.*\.json$/);
      expect(
        (await readResearchState(fixture.root)).approvals[
          granted.approval.grant.id
        ],
      ).toEqual(recorded.approval);
    });

    it("resolves relative root and path from captured cwd before asynchronous filesystem work", async () => {
      const fixture = await createResearchDispatchFixture(sandbox, {
        automaticEnabled: true,
      });
      const granted = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: "relative-result-grant",
      });
      const now = new Date(
        Date.parse(granted.approval.grant.grantedAt) + 1_000,
      );
      const inputPath = path.join(
        fixture.root,
        ".trellis",
        "research",
        "dispatches",
        fixture.ids.dispatchId,
        "worker-output.json",
      );
      fs.writeFileSync(
        inputPath,
        outputPayload({
          approvalId: granted.approval.grant.id,
          dispatchId: fixture.ids.dispatchId,
          runId: fixture.ids.runId,
          questId: fixture.ids.questId,
          createdAt: now.toISOString(),
        }),
      );
      const statSync = vi.spyOn(fs, "statSync");
      const cwd = vi.spyOn(process, "cwd").mockImplementation(() => {
        throw new Error("successor must not recapture process.cwd()");
      });
      statSync.mockClear();

      try {
        const pending = recordApprovedResearchDispatchResult({
          root: path.relative(sandbox, fixture.root),
          dispatchId: fixture.ids.dispatchId,
          approvalId: granted.approval.grant.id,
          input: {
            kind: "path",
            cwd: sandbox,
            path: path.relative(sandbox, inputPath),
          },
          idempotencyKey: "relative-approved-result",
          now,
        });
        expect(statSync).not.toHaveBeenCalled();
        const recorded = await pending;
        expect(recorded.result.dispatchId).toBe(fixture.ids.dispatchId);
      } finally {
        cwd.mockRestore();
        statSync.mockRestore();
      }
    });

    it("resolves relative root from the captured stdin cwd without recapturing process cwd", async () => {
      const fixture = await createResearchDispatchFixture(sandbox, {
        automaticEnabled: true,
      });
      const granted = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "relative-stdin-result-grant",
      });
      const now = new Date(
        Date.parse(granted.approval.grant.grantedAt) + 1_000,
      );
      const payload = outputPayload({
        approvalId: granted.approval.grant.id,
        dispatchId: fixture.ids.dispatchId,
        runId: fixture.ids.runId,
        questId: fixture.ids.questId,
        createdAt: now.toISOString(),
      });
      const cwd = vi.spyOn(process, "cwd").mockImplementation(() => {
        throw new Error("successor must not recapture process.cwd()");
      });

      try {
        const recorded = await recordApprovedResearchDispatchResult({
          root: path.relative(sandbox, fixture.root),
          dispatchId: fixture.ids.dispatchId,
          approvalId: granted.approval.grant.id,
          input: lazyInput(sandbox, () => payload),
          idempotencyKey: "relative-stdin-approved-result",
          now,
        });
        expect(recorded.result.dispatchId).toBe(fixture.ids.dispatchId);
      } finally {
        cwd.mockRestore();
      }
    });

    it("replays before expiry and input access, then repairs all three materializations", async () => {
      const fixture = await createResearchDispatchFixture(sandbox, {
        automaticEnabled: true,
      });
      const granted = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "replay-result-grant",
      });
      const now = new Date(
        Date.parse(granted.approval.grant.grantedAt) + 1_000,
      );
      const payload = outputPayload({
        approvalId: granted.approval.grant.id,
        dispatchId: fixture.ids.dispatchId,
        runId: fixture.ids.runId,
        questId: fixture.ids.questId,
        createdAt: now.toISOString(),
      });
      const first = await recordApprovedResearchDispatchResult({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        approvalId: granted.approval.grant.id,
        input: lazyInput(sandbox, () => payload),
        idempotencyKey: "replay-approved-result",
        now,
      });
      const ledgerBefore = await readResearchLedger(fixture.root);
      for (const file of [
        first.resultFile,
        first.proposalFile,
        first.approvalFile,
      ]) {
        if (file === null) throw new Error("Expected materialized file");
        fs.rmSync(path.join(fixture.root, file));
      }

      const replayed = await recordApprovedResearchDispatchResult({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        approvalId: granted.approval.grant.id,
        input: lazyInput(sandbox, () => {
          throw new Error("replay must not read stdin");
        }),
        idempotencyKey: "replay-approved-result",
        now: new Date(Number.NaN),
      });

      expect(replayed.replayed).toBe(true);
      expect(await readResearchLedger(fixture.root)).toEqual(ledgerBefore);
      for (const file of [
        replayed.resultFile,
        replayed.proposalFile,
        replayed.approvalFile,
      ]) {
        if (file === null) throw new Error("Expected repaired file");
        expect(fs.existsSync(path.join(fixture.root, file))).toBe(true);
      }
    });

    it("rejects an invalid new-execution clock before input or append", async () => {
      const fixture = await createResearchDispatchFixture(sandbox, {
        automaticEnabled: true,
      });
      const granted = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: "invalid-clock-result-grant",
      });
      const ledgerBefore = await readResearchLedger(fixture.root);
      const treeBefore = snapshotTree(sandbox);
      let reads = 0;

      await expect(
        recordApprovedResearchDispatchResult({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          approvalId: granted.approval.grant.id,
          input: lazyInput(sandbox, () => {
            reads += 1;
            return "{}";
          }),
          idempotencyKey: "invalid-clock-approved-result",
          now: new Date(Number.NaN),
        }),
      ).rejects.toMatchObject({
        code: "APPROVAL_EXPIRED",
        message: "record-result time is invalid",
      });
      expect(reads).toBe(0);
      expect(await readResearchLedger(fixture.root)).toEqual(ledgerBefore);
      expect(snapshotTree(sandbox)).toEqual(treeBefore);
    });

    it("validates and serializes a valid new-execution clock once", async () => {
      const fixture = await createResearchDispatchFixture(sandbox, {
        automaticEnabled: true,
      });
      const granted = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: "single-clock-result-grant",
      });
      const now = new Date(
        Date.parse(granted.approval.grant.grantedAt) + 1_000,
      );
      const timestamp = now.toISOString();
      const payload = outputPayload({
        approvalId: granted.approval.grant.id,
        dispatchId: fixture.ids.dispatchId,
        runId: fixture.ids.runId,
        questId: fixture.ids.questId,
        createdAt: timestamp,
      });
      const getTime = vi.spyOn(now, "getTime");
      const toISOString = vi.spyOn(now, "toISOString");

      try {
        const recorded = await recordApprovedResearchDispatchResult({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          approvalId: granted.approval.grant.id,
          input: lazyInput(sandbox, () => payload),
          idempotencyKey: "single-clock-approved-result",
          now,
        });

        expect(recorded.result.createdAt).toBe(timestamp);
        expect(getTime).toHaveBeenCalledTimes(1);
        expect(toISOString).toHaveBeenCalledTimes(1);
      } finally {
        getTime.mockRestore();
        toISOString.mockRestore();
      }
    });

    it("rejects expiry equality without invoking lazy stdin", async () => {
      const fixture = await createResearchDispatchFixture(sandbox, {
        automaticEnabled: true,
      });
      const granted = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: "expired-result-grant",
      });
      let reads = 0;

      await expect(
        recordApprovedResearchDispatchResult({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          approvalId: granted.approval.grant.id,
          input: lazyInput(sandbox, () => {
            reads += 1;
            return "{}";
          }),
          idempotencyKey: "expired-approved-result",
          now: new Date(granted.approval.grant.expiresAt),
        }),
      ).rejects.toMatchObject({ code: "APPROVAL_EXPIRED" });
      expect(reads).toBe(0);
    });
  },
);

const OTHER_APPROVAL_ID = "apr_99999999-9999-4999-8999-999999999999" as const;
const OTHER_RESULT_ID = "res_99999999-9999-4999-8999-999999999999" as const;
const OTHER_PROPOSAL_ID = "prp_99999999-9999-4999-8999-999999999999" as const;
const OTHER_DISPATCH_ID = "dsp_99999999-9999-4999-8999-999999999999" as const;
const OTHER_RUN_ID = "run_99999999-9999-4999-8999-999999999999" as const;
const OTHER_QUEST_ID = "qst_99999999-9999-4999-8999-999999999999" as const;

async function setupApprovedResult(sandbox: string, name: string) {
  const fixture = await createResearchDispatchFixture(
    path.join(sandbox, name),
    {
      automaticEnabled: true,
    },
  );
  const granted = await authorizeResearchDispatch({
    root: fixture.root,
    dispatchId: fixture.ids.dispatchId,
    host: "codex",
    idempotencyKey: `${name}-grant`,
  });
  const now = new Date(Date.parse(granted.approval.grant.grantedAt) + 1);
  const payload = resultFirstPayload(
    approvedResultPayload({
      approvalId: granted.approval.grant.id,
      dispatchId: fixture.ids.dispatchId,
      runId: fixture.ids.runId,
      questId: fixture.ids.questId,
      createdAt: now.toISOString(),
    }),
  );
  return { fixture, granted, now, payload };
}

function lazyInput(sandbox: string, read: () => string | Uint8Array) {
  return {
    kind: "stdin" as const,
    cwd: sandbox,
    read: () => {
      const input = read();
      return typeof input === "string" ? Buffer.from(input, "utf8") : input;
    },
  };
}

async function stateWithInvalidCapability(
  root: string,
  dispatchId: researchCore.DispatchId,
): Promise<researchCore.ResearchState> {
  const canonical = await researchCore.readResearchState(root);
  const corrupted = structuredClone(canonical);
  const activationId = corrupted.activationByDispatchId[dispatchId];
  const activation =
    activationId === undefined
      ? undefined
      : corrupted.activations[activationId];
  if (activation === undefined) throw new Error("Expected activation");
  activation.capabilityId =
    "research-invalid" as typeof activation.capabilityId;
  return corrupted;
}

function exactPayload(
  value: string,
  mutate: (input: Record<string, unknown>) => void,
): string {
  const input = JSON.parse(value) as Record<string, unknown>;
  mutate(input);
  return JSON.stringify(input);
}

async function disableCapability(
  root: string,
  capabilityId: string,
): Promise<string> {
  const policyFile = path.join(root, ".trellis", "research", "policy.json");
  const policy = JSON.parse(fs.readFileSync(policyFile, "utf8")) as {
    capabilities: Record<string, { enabled?: boolean }>;
  };
  policy.capabilities[capabilityId] = {
    ...policy.capabilities[capabilityId],
    enabled: false,
  };
  fs.writeFileSync(policyFile, `${JSON.stringify(policy, null, 2)}\n`);
  return (await readResearchProjectPolicy({ root })).digest;
}

describe("approved Result validation acceptance", { timeout: 30_000 }, () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(
      path.join(os.tmpdir(), "trellis-result-acceptance-"),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("rejects absent, foreign, revoked, and consumed approvals before input access", async () => {
    const absent = await setupApprovedResult(sandbox, "absent");
    let reads = 0;
    await expect(
      recordApprovedResearchDispatchResult({
        root: absent.fixture.root,
        dispatchId: absent.fixture.ids.dispatchId,
        approvalId: OTHER_APPROVAL_ID,
        input: lazyInput(sandbox, () => {
          reads += 1;
          return absent.payload;
        }),
        idempotencyKey: "absent-result",
        now: absent.now,
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_REQUIRED" });

    const foreign = await setupApprovedResult(sandbox, "foreign");
    const canonical = await researchCore.readResearchState(
      foreign.fixture.root,
    );
    const corrupted = structuredClone(canonical);
    const selected = corrupted.approvals[foreign.granted.approval.grant.id];
    if (selected === undefined) throw new Error("Expected approval");
    selected.grant.activationId = "act_99999999-9999-4999-8999-999999999999";
    vi.spyOn(researchCore, "reduceResearchEvents").mockReturnValueOnce(
      corrupted,
    );
    await expect(
      recordApprovedResearchDispatchResult({
        root: foreign.fixture.root,
        dispatchId: foreign.fixture.ids.dispatchId,
        approvalId: foreign.granted.approval.grant.id,
        input: lazyInput(sandbox, () => {
          reads += 1;
          return foreign.payload;
        }),
        idempotencyKey: "foreign-result",
        now: foreign.now,
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_RELATION_MISMATCH" });
    vi.restoreAllMocks();

    const revoked = await setupApprovedResult(sandbox, "revoked");
    await revokeResearchApproval({
      root: revoked.fixture.root,
      approvalId: revoked.granted.approval.grant.id,
      reason: "operator revoked",
      idempotencyKey: "revoke-before-result",
    });
    await expect(
      recordApprovedResearchDispatchResult({
        root: revoked.fixture.root,
        dispatchId: revoked.fixture.ids.dispatchId,
        approvalId: revoked.granted.approval.grant.id,
        input: lazyInput(sandbox, () => {
          reads += 1;
          return revoked.payload;
        }),
        idempotencyKey: "revoked-result",
        now: revoked.now,
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_REVOKED" });

    const consumed = await setupApprovedResult(sandbox, "consumed");
    await recordApprovedResearchDispatchResult({
      root: consumed.fixture.root,
      dispatchId: consumed.fixture.ids.dispatchId,
      approvalId: consumed.granted.approval.grant.id,
      input: lazyInput(sandbox, () => consumed.payload),
      idempotencyKey: "consume-first",
      now: consumed.now,
    });
    await expect(
      recordApprovedResearchDispatchResult({
        root: consumed.fixture.root,
        dispatchId: consumed.fixture.ids.dispatchId,
        approvalId: consumed.granted.approval.grant.id,
        input: lazyInput(sandbox, () => {
          reads += 1;
          return consumed.payload;
        }),
        idempotencyKey: "consume-second",
        now: consumed.now,
      }),
    ).rejects.toMatchObject({ code: "DISPATCH_ALREADY_COMPLETED" });
    expect(reads).toBe(0);
  });

  it.each([
    ["absent", "APPROVAL_REQUIRED"],
    ["relation-mismatched", "APPROVAL_RELATION_MISMATCH"],
    ["revoked", "APPROVAL_REVOKED"],
    ["expired", "APPROVAL_EXPIRED"],
  ] as const)(
    "prioritizes %s approval failure over invalid current capability",
    async (condition, expectedCode) => {
      const setup = await setupApprovedResult(
        sandbox,
        `capability-precedence-${condition}`,
      );
      if (condition === "revoked") {
        await revokeResearchApproval({
          root: setup.fixture.root,
          approvalId: setup.granted.approval.grant.id,
          reason: "operator revoked before capability revalidation",
          idempotencyKey: `capability-precedence-${condition}-revoke`,
        });
      }
      const corrupted = await stateWithInvalidCapability(
        setup.fixture.root,
        setup.fixture.ids.dispatchId,
      );
      if (condition === "relation-mismatched") {
        const approval = corrupted.approvals[setup.granted.approval.grant.id];
        if (approval === undefined) throw new Error("Expected approval");
        approval.grant.activationId =
          "act_99999999-9999-4999-8999-999999999999";
      }
      vi.spyOn(researchCore, "reduceResearchEvents").mockReturnValueOnce(
        corrupted,
      );
      let reads = 0;

      await expect(
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId:
            condition === "absent"
              ? OTHER_APPROVAL_ID
              : setup.granted.approval.grant.id,
          input: lazyInput(sandbox, () => {
            reads += 1;
            return setup.payload;
          }),
          idempotencyKey: `capability-precedence-${condition}-result`,
          now:
            condition === "expired"
              ? new Date(setup.granted.approval.grant.expiresAt)
              : setup.now,
        }),
      ).rejects.toMatchObject({ code: expectedCode });
      expect(reads).toBe(0);
    },
  );

  it("preserves binding precedence ahead of existing artifact drift and stays zero-write", async () => {
    const cases = [
      {
        name: "request",
        bindings: {
          requestDigest: WRONG_DIGEST,
          procedureDigest: WRONG_DIGEST,
        },
        code: "REQUEST_DIGEST_MISMATCH",
      },
      {
        name: "procedure",
        bindings: { procedureDigest: WRONG_DIGEST },
        policy: true,
        code: "PROCEDURE_DIGEST_MISMATCH",
      },
      {
        name: "policy",
        bindings: { scopeHash: WRONG_DIGEST },
        policy: true,
        code: "POLICY_DIGEST_MISMATCH",
      },
      {
        name: "scope",
        bindings: { scopeHash: WRONG_DIGEST },
        code: "SCOPE_HASH_MISMATCH",
      },
    ] as const;

    for (const item of cases) {
      const setup = await setupApprovedResult(sandbox, item.name);
      mutateApprovedResultLedgerBindings(setup.fixture.root, item.bindings);
      if (item.policy === true) {
        disableApprovedResultAutomaticPolicy(setup.fixture.root);
      }
      fs.writeFileSync(setup.fixture.artifactPath, "stale artifact\n");
      const before = snapshotTree(sandbox);
      let reads = 0;
      await expect(
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: lazyInput(sandbox, () => {
            reads += 1;
            return setup.payload;
          }),
          idempotencyKey: `${item.name}-binding-result`,
          now: setup.now,
        }),
      ).rejects.toMatchObject({ code: item.code });
      expect(reads).toBe(0);
      expect(snapshotTree(sandbox)).toEqual(before);
    }
  });

  it("rejects disabled capability before Repository and input access", async () => {
    const setup = await setupApprovedResult(sandbox, "disabled-capability");
    const state = await researchCore.readResearchState(setup.fixture.root);
    const activationId =
      state.activationByDispatchId[setup.fixture.ids.dispatchId];
    const activation =
      activationId === undefined ? undefined : state.activations[activationId];
    if (activation === undefined) throw new Error("Expected activation");
    const policyDigest = await disableCapability(
      setup.fixture.root,
      activation.capabilityId,
    );
    mutateApprovedResultLedgerBindings(setup.fixture.root, { policyDigest });
    fs.renameSync(
      setup.fixture.repository,
      `${setup.fixture.repository}.offline`,
    );
    const before = snapshotTree(sandbox);
    let reads = 0;

    await expect(
      recordApprovedResearchDispatchResult({
        root: setup.fixture.root,
        dispatchId: setup.fixture.ids.dispatchId,
        approvalId: setup.granted.approval.grant.id,
        input: lazyInput(sandbox, () => {
          reads += 1;
          return setup.payload;
        }),
        idempotencyKey: "disabled-capability-result",
        now: setup.now,
      }),
    ).rejects.toMatchObject({ code: "CAPABILITY_DISABLED" });
    expect(reads).toBe(0);
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("retains the broad activation authority relation check in the caller", async () => {
    const setup = await setupApprovedResult(sandbox, "authority-relation");
    const canonical = await researchCore.readResearchState(setup.fixture.root);
    const corrupted = structuredClone(canonical);
    const activationId =
      corrupted.activationByDispatchId[setup.fixture.ids.dispatchId];
    const activation =
      activationId === undefined
        ? undefined
        : corrupted.activations[activationId];
    if (activation === undefined) throw new Error("Expected activation");
    activation.maxDurationMinutes += 1;
    vi.spyOn(researchCore, "reduceResearchEvents").mockReturnValueOnce(
      corrupted,
    );
    let reads = 0;

    await expect(
      recordApprovedResearchDispatchResult({
        root: setup.fixture.root,
        dispatchId: setup.fixture.ids.dispatchId,
        approvalId: setup.granted.approval.grant.id,
        input: lazyInput(sandbox, () => {
          reads += 1;
          return setup.payload;
        }),
        idempotencyKey: "authority-relation-result",
        now: setup.now,
      }),
    ).rejects.toMatchObject({ code: "APPROVAL_RELATION_MISMATCH" });
    expect(reads).toBe(0);
  });

  it("rejects outside-root paths, parent symlinks, final symlinks, and path replacement", async () => {
    const outside = await setupApprovedResult(sandbox, "outside");
    const outsideFile = path.join(sandbox, "outside.json");
    fs.writeFileSync(outsideFile, outside.payload);
    await expect(
      recordApprovedResearchDispatchResult({
        root: outside.fixture.root,
        dispatchId: outside.fixture.ids.dispatchId,
        approvalId: outside.granted.approval.grant.id,
        input: { kind: "path", cwd: sandbox, path: outsideFile },
        idempotencyKey: "outside-result",
        now: outside.now,
      }),
    ).rejects.toThrow(/inside the control root/);

    const finalLink = await setupApprovedResult(sandbox, "final-link");
    const finalDirectory = path.join(finalLink.fixture.root, "inputs");
    fs.mkdirSync(finalDirectory);
    const finalTarget = path.join(finalDirectory, "target.json");
    const finalPath = path.join(finalDirectory, "worker.json");
    fs.writeFileSync(finalTarget, finalLink.payload);
    fs.symlinkSync(finalTarget, finalPath);
    await expect(
      recordApprovedResearchDispatchResult({
        root: finalLink.fixture.root,
        dispatchId: finalLink.fixture.ids.dispatchId,
        approvalId: finalLink.granted.approval.grant.id,
        input: { kind: "path", cwd: sandbox, path: finalPath },
        idempotencyKey: "final-link-result",
        now: finalLink.now,
      }),
    ).rejects.toThrow(/non-symlink file/);

    const parentLink = await setupApprovedResult(sandbox, "parent-link");
    const realParent = path.join(parentLink.fixture.root, "real-inputs");
    const linkedParent = path.join(parentLink.fixture.root, "linked-inputs");
    fs.mkdirSync(realParent);
    fs.writeFileSync(path.join(realParent, "worker.json"), parentLink.payload);
    fs.symlinkSync(realParent, linkedParent);
    await expect(
      recordApprovedResearchDispatchResult({
        root: parentLink.fixture.root,
        dispatchId: parentLink.fixture.ids.dispatchId,
        approvalId: parentLink.granted.approval.grant.id,
        input: {
          kind: "path",
          cwd: sandbox,
          path: path.join(linkedParent, "worker.json"),
        },
        idempotencyKey: "parent-link-result",
        now: parentLink.now,
      }),
    ).rejects.toThrow(/non-symlink directory/);

    const replaced = await setupApprovedResult(sandbox, "replaced");
    const replacePath = path.join(replaced.fixture.root, "worker.json");
    fs.writeFileSync(replacePath, replaced.payload);
    const originalOpen = fs.openSync.bind(fs);
    const originalRead = fs.readFileSync.bind(fs);
    let armed = false;
    let changed = false;
    vi.spyOn(fs, "openSync").mockImplementation(((target, flags, mode) => {
      const descriptor = originalOpen(target, flags, mode);
      if (path.resolve(String(target)) === path.resolve(replacePath))
        armed = true;
      return descriptor;
    }) as typeof fs.openSync);
    vi.spyOn(fs, "readFileSync").mockImplementation(((target, options) => {
      const bytes = originalRead(target, options as never);
      if (armed && !changed && typeof target === "number") {
        changed = true;
        fs.renameSync(replacePath, `${replacePath}.old`);
        fs.writeFileSync(replacePath, replaced.payload);
      }
      return bytes;
    }) as typeof fs.readFileSync);
    await expect(
      recordApprovedResearchDispatchResult({
        root: replaced.fixture.root,
        dispatchId: replaced.fixture.ids.dispatchId,
        approvalId: replaced.granted.approval.grant.id,
        input: { kind: "path", cwd: sandbox, path: replacePath },
        idempotencyKey: "replaced-result",
        now: replaced.now,
      }),
    ).rejects.toThrow(/changed while it was read/);
  });

  it.each([
    {
      name: "malformed",
      payload: () => "{",
      message: /Expected property name/,
    },
    {
      name: "duplicate",
      payload: (valid: string) => valid.replace(/^\{/, '{"result":null,'),
      message: /duplicate key 'result'/,
    },
    {
      name: "extra",
      payload: (valid: string) =>
        exactPayload(valid, (value) => {
          value.extra = true;
        }),
      message: /exactly result and proposal/,
    },
    {
      name: "missing",
      payload: (valid: string) =>
        exactPayload(valid, (value) => {
          delete value.proposal;
        }),
      message: /exactly result and proposal/,
    },
    {
      name: "reversed",
      payload: (valid: string) => {
        const value = JSON.parse(valid) as Record<string, unknown>;
        return JSON.stringify({
          proposal: value.proposal,
          result: value.result,
        });
      },
      message: /result followed by proposal/,
    },
    {
      name: "result-id",
      payload: (valid: string) =>
        exactPayload(valid, (value) => {
          (value.result as Record<string, unknown>).id = OTHER_RESULT_ID;
        }),
      message: /IDs must match/,
    },
    {
      name: "proposal-id",
      payload: (valid: string) =>
        exactPayload(valid, (value) => {
          (value.proposal as Record<string, unknown>).id = OTHER_PROPOSAL_ID;
        }),
      message: /IDs must match/,
    },
    {
      name: "result-dispatch",
      payload: (valid: string) =>
        exactPayload(valid, (value) => {
          (value.result as Record<string, unknown>).dispatchId =
            OTHER_DISPATCH_ID;
        }),
      message: /Result relations/,
    },
    {
      name: "result-run",
      payload: (valid: string) =>
        exactPayload(valid, (value) => {
          (value.result as Record<string, unknown>).runId = OTHER_RUN_ID;
        }),
      message: /Result relations/,
    },
    {
      name: "proposal-dispatch",
      payload: (valid: string) =>
        exactPayload(valid, (value) => {
          (value.proposal as Record<string, unknown>).dispatchId =
            OTHER_DISPATCH_ID;
        }),
      message: /Proposal relations/,
    },
    {
      name: "proposal-quest",
      payload: (valid: string) =>
        exactPayload(valid, (value) => {
          (value.proposal as Record<string, unknown>).questId = OTHER_QUEST_ID;
        }),
      message: /Proposal relations/,
    },
  ])("strictly rejects $name payloads without appending", async (item) => {
    const setup = await setupApprovedResult(sandbox, `strict-${item.name}`);
    const before = await researchCore.readResearchLedger(setup.fixture.root);

    await expect(
      recordApprovedResearchDispatchResult({
        root: setup.fixture.root,
        dispatchId: setup.fixture.ids.dispatchId,
        approvalId: setup.granted.approval.grant.id,
        input: lazyInput(sandbox, () => item.payload(setup.payload)),
        idempotencyKey: `strict-${item.name}-result`,
        now: setup.now,
      }),
    ).rejects.toThrow(item.message);
    expect(await researchCore.readResearchLedger(setup.fixture.root)).toEqual(
      before,
    );
  });

  it("rejects a blocked Result with an executable Proposal before append", async () => {
    const setup = await setupApprovedResult(
      sandbox,
      "blocked-executable-proposal",
    );
    const payload = exactPayload(setup.payload, (value) => {
      (value.result as Record<string, unknown>).status = "blocked";
      const proposal = value.proposal as Record<string, unknown>;
      proposal.operations = [
        {
          kind: "quest.status",
          questId: setup.fixture.ids.questId,
          status: "active",
        },
      ];
    });
    const before = await researchCore.readResearchLedger(setup.fixture.root);

    await expect(
      recordApprovedResearchDispatchResult({
        root: setup.fixture.root,
        dispatchId: setup.fixture.ids.dispatchId,
        approvalId: setup.granted.approval.grant.id,
        input: lazyInput(sandbox, () => payload),
        idempotencyKey: "blocked-executable-proposal-result",
        now: setup.now,
      }),
    ).rejects.toThrow(/blocked Result requires an empty pending Proposal/);
    expect(await researchCore.readResearchLedger(setup.fixture.root)).toEqual(
      before,
    );
  });

  it("validates dry-run successor events without append or publication", async () => {
    const setup = await setupApprovedResult(sandbox, "dry-run");
    const before = await researchCore.readResearchLedger(setup.fixture.root);
    const treeBefore = snapshotTree(setup.fixture.root);
    const result = await recordApprovedResearchDispatchResult({
      root: setup.fixture.root,
      dispatchId: setup.fixture.ids.dispatchId,
      approvalId: setup.granted.approval.grant.id,
      input: lazyInput(sandbox, () => setup.payload),
      idempotencyKey: "dry-run-result",
      dryRun: true,
      now: setup.now,
    });

    expect(result.events.map((event) => event.kind)).toEqual([
      "result.recorded",
      "proposal.recorded",
      "approval.consumed",
    ]);
    expect(result).toMatchObject({
      dryRun: true,
      replayed: false,
      resultFile: null,
      proposalFile: null,
      approvalFile: null,
    });
    expect(await researchCore.readResearchLedger(setup.fixture.root)).toEqual(
      before,
    );
    const dispatchDir = path.join(
      setup.fixture.root,
      ".trellis",
      "research",
      "dispatches",
      setup.fixture.ids.dispatchId,
    );
    expect(fs.existsSync(path.join(dispatchDir, "result.json"))).toBe(false);
    expect(fs.existsSync(path.join(dispatchDir, "proposal.json"))).toBe(false);
    expect(snapshotTree(setup.fixture.root)).toEqual(treeBefore);
  });

  it.each(["result", "proposal"] as const)(
    "rejects an occupied derived %s ID before input access",
    async (kind) => {
      const setup = await setupApprovedResult(sandbox, `collision-${kind}`);
      const canonical = await researchCore.readResearchState(
        setup.fixture.root,
      );
      const corrupted = structuredClone(canonical);
      const suffix = setup.granted.approval.grant.id.slice(4);
      if (kind === "result") {
        const resultId = `res_${suffix}` as const;
        corrupted.results[resultId] = {
          id: resultId,
          dispatchId: OTHER_DISPATCH_ID,
          runId: OTHER_RUN_ID,
          status: "completed",
          summary: "Foreign occupation",
          commands: [],
          checks: [],
          artifactRefs: [],
          blockers: [],
          createdAt: setup.now.toISOString(),
        };
      } else {
        const proposalId = `prp_${suffix}` as const;
        corrupted.proposals[proposalId] = {
          id: proposalId,
          dispatchId: OTHER_DISPATCH_ID,
          questId: OTHER_QUEST_ID,
          title: "Foreign occupation",
          operations: [],
          status: "pending",
          createdAt: setup.now.toISOString(),
          updatedAt: setup.now.toISOString(),
        };
      }
      vi.spyOn(researchCore, "reduceResearchEvents").mockReturnValueOnce(
        corrupted,
      );
      let reads = 0;
      await expect(
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: lazyInput(sandbox, () => {
            reads += 1;
            return setup.payload;
          }),
          idempotencyKey: `collision-${kind}-result`,
          now: setup.now,
        }),
      ).rejects.toMatchObject({ code: "OUTPUT_ID_CONFLICT" });
      expect(reads).toBe(0);
    },
  );
});

async function setupRecoveredResult(sandbox: string, name: string) {
  const fixture = await createResearchDispatchFixture(
    path.join(sandbox, name),
    {
      automaticEnabled: true,
    },
  );
  const granted = await authorizeResearchDispatch({
    root: fixture.root,
    dispatchId: fixture.ids.dispatchId,
    host: "claude",
    idempotencyKey: `${name}-grant`,
  });
  const now = new Date(Date.parse(granted.approval.grant.grantedAt) + 1);
  const payload = resultFirstPayload(
    approvedResultPayload({
      approvalId: granted.approval.grant.id,
      dispatchId: fixture.ids.dispatchId,
      runId: fixture.ids.runId,
      questId: fixture.ids.questId,
      createdAt: now.toISOString(),
    }),
  );
  return { fixture, granted, now, payload };
}

function recoveryInput(sandbox: string, read: () => string | Uint8Array) {
  return lazyInput(sandbox, read);
}

function recoveryTerminalEvents(
  events: readonly researchCore.ResearchEvent[],
): readonly researchCore.ResearchEvent[] {
  return events.filter(
    (event) =>
      event.kind === "result.recorded" ||
      event.kind === "proposal.recorded" ||
      event.kind === "approval.consumed" ||
      event.kind === "approval.revoked",
  );
}

describe(
  "approved Result concurrency and recovery",
  { timeout: 30_000 },
  () => {
    let sandbox: string;

    beforeEach(() => {
      sandbox = fs.mkdtempSync(
        path.join(os.tmpdir(), "trellis-result-recovery-"),
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
      fs.rmSync(sandbox, { recursive: true, force: true });
    });

    it("maps same-Dispatch completion at commit time to DISPATCH_ALREADY_COMPLETED", async () => {
      const setup = await setupRecoveredResult(sandbox, "commit-output-race");
      const commitResearchBatch = researchCore.commitResearchBatch;
      vi.spyOn(researchCore, "commitResearchBatch").mockImplementationOnce(
        async (input) => {
          const resultMutation = input.mutations[0];
          const proposalMutation = input.mutations[1];
          const consumeMutation = input.mutations[2];
          if (
            resultMutation?.kind !== "result.record" ||
            proposalMutation?.kind !== "proposal.record" ||
            consumeMutation?.kind !== "approval.consume"
          ) {
            throw new Error("Expected approved Result mutation batch");
          }
          const proposalId = researchCore.createProposalId();
          await commitResearchBatch({
            ...input,
            idempotencyKey: "commit-output-race-winner",
            mutations: [
              resultMutation,
              {
                kind: "proposal.record",
                proposal: { ...proposalMutation.proposal, id: proposalId },
              },
              {
                ...consumeMutation,
                proposalId,
              },
            ],
          });
          return commitResearchBatch(input);
        },
      );

      await expect(
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: recoveryInput(sandbox, () => setup.payload),
          idempotencyKey: "commit-output-race-loser",
          now: setup.now,
        }),
      ).rejects.toMatchObject({ code: "DISPATCH_ALREADY_COMPLETED" });
      const ledger = await researchCore.readResearchLedger(setup.fixture.root);
      expect(
        ledger.filter(
          (event) => event.idempotencyKey === "commit-output-race-winner",
        ),
      ).toHaveLength(3);
      expect(
        ledger.filter(
          (event) => event.idempotencyKey === "commit-output-race-loser",
        ),
      ).toHaveLength(0);
    });

    it("maps revocation at commit time to APPROVAL_REVOKED", async () => {
      const setup = await setupRecoveredResult(sandbox, "commit-revoke-race");
      const commitResearchBatch = researchCore.commitResearchBatch;
      vi.spyOn(researchCore, "commitResearchBatch").mockImplementationOnce(
        async (input) => {
          await commitResearchBatch({
            ...input,
            idempotencyKey: "commit-revoke-race-winner",
            mutations: [
              {
                kind: "approval.revoke",
                approvalId: setup.granted.approval.grant.id,
                revokedAt: setup.now.toISOString(),
                reason: "concurrent operator revocation",
              },
            ],
          });
          return commitResearchBatch(input);
        },
      );

      await expect(
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: recoveryInput(sandbox, () => setup.payload),
          idempotencyKey: "commit-revoke-race-loser",
          now: setup.now,
        }),
      ).rejects.toMatchObject({ code: "APPROVAL_REVOKED" });
      const ledger = await researchCore.readResearchLedger(setup.fixture.root);
      expect(
        ledger.filter(
          (event) => event.idempotencyKey === "commit-revoke-race-winner",
        ),
      ).toHaveLength(1);
      expect(
        ledger.filter(
          (event) => event.idempotencyKey === "commit-revoke-race-loser",
        ),
      ).toHaveLength(0);
    });

    it("allows exactly one concurrent result key to consume the approval", async () => {
      const setup = await setupRecoveredResult(sandbox, "two-result-keys");
      const attempts = await Promise.allSettled([
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: recoveryInput(sandbox, () => setup.payload),
          idempotencyKey: "concurrent-result-a",
          now: setup.now,
        }),
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: recoveryInput(sandbox, () => setup.payload),
          idempotencyKey: "concurrent-result-b",
          now: setup.now,
        }),
      ]);

      expect(
        attempts.filter((attempt) => attempt.status === "fulfilled"),
      ).toHaveLength(1);
      const rejected = attempts.filter(
        (attempt) => attempt.status === "rejected",
      );
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toMatchObject({
        code: "DISPATCH_ALREADY_COMPLETED",
      });
      const events = recoveryTerminalEvents(
        await researchCore.readResearchLedger(setup.fixture.root),
      );
      expect(events.map((event) => event.kind)).toEqual([
        "result.recorded",
        "proposal.recorded",
        "approval.consumed",
      ]);
      expect(new Set(events.map((event) => event.idempotencyKey))).toHaveLength(
        1,
      );
      expect(
        (await researchCore.readResearchState(setup.fixture.root)).approvals[
          setup.granted.approval.grant.id
        ]?.status,
      ).toBe("consumed");
    });

    it("serializes concurrent revocation and result as one terminal winner", async () => {
      const setup = await setupRecoveredResult(sandbox, "revoke-race");
      const attempts = await Promise.allSettled([
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: recoveryInput(sandbox, () => setup.payload),
          idempotencyKey: "revoke-race-result",
          now: setup.now,
        }),
        revokeResearchApproval({
          root: setup.fixture.root,
          approvalId: setup.granted.approval.grant.id,
          reason: "concurrent operator revocation",
          idempotencyKey: "revoke-race-revoke",
        }),
      ]);

      expect(
        attempts.filter((attempt) => attempt.status === "fulfilled"),
      ).toHaveLength(1);
      const rejected = attempts.filter(
        (attempt) => attempt.status === "rejected",
      );
      expect(rejected).toHaveLength(1);
      const state = await researchCore.readResearchState(setup.fixture.root);
      const approval = state.approvals[setup.granted.approval.grant.id];
      expect(["consumed", "revoked"]).toContain(approval?.status);
      const events = recoveryTerminalEvents(
        await researchCore.readResearchLedger(setup.fixture.root),
      );
      if (approval?.status === "consumed") {
        expect(events.map((event) => event.kind)).toEqual([
          "result.recorded",
          "proposal.recorded",
          "approval.consumed",
        ]);
      } else {
        expect(rejected[0]?.reason).toMatchObject({ code: "APPROVAL_REVOKED" });
        expect(events.map((event) => event.kind)).toEqual(["approval.revoked"]);
      }
    });

    it.each(["result", "proposal", "approval"] as const)(
      "repairs all materializations after %s publication failure without append or input access",
      async (boundary) => {
        const setup = await setupRecoveredResult(
          sandbox,
          `recover-${boundary}`,
        );
        const dispatchDirectory = path.join(
          setup.fixture.root,
          ".trellis",
          "research",
          "dispatches",
          setup.fixture.ids.dispatchId,
        );
        const destinations = {
          result: path.join(dispatchDirectory, "result.json"),
          proposal: path.join(dispatchDirectory, "proposal.json"),
          approval: path.join(
            dispatchDirectory,
            "approvals",
            `${setup.granted.approval.grant.id}.json`,
          ),
        } as const;
        const originalLink = fs.linkSync.bind(fs);
        const originalRename = fs.renameSync.bind(fs);
        let failed = false;
        const publish = (
          operation: (oldPath: fs.PathLike, newPath: fs.PathLike) => void,
          oldPath: fs.PathLike,
          newPath: fs.PathLike,
        ) => {
          if (
            !failed &&
            path.resolve(String(newPath)) ===
              path.resolve(destinations[boundary])
          ) {
            failed = true;
            throw new Error(`injected ${boundary} publication failure`);
          }
          operation(oldPath, newPath);
        };
        vi.spyOn(fs, "linkSync").mockImplementation((oldPath, newPath) => {
          publish(originalLink, oldPath, newPath);
        });
        vi.spyOn(fs, "renameSync").mockImplementation((oldPath, newPath) => {
          publish(originalRename, oldPath, newPath);
        });

        const recoveryKey = `recover-${boundary}-result`;
        const expectedRecovery = [
          `trellis research dispatch record-result ${setup.fixture.ids.dispatchId}`,
          `--approval ${setup.granted.approval.grant.id}`,
          "--input -",
          `--root ${JSON.stringify(setup.fixture.root)}`,
          `--idempotency-key ${JSON.stringify(recoveryKey)}`,
        ].join(" ");
        await expect(
          recordApprovedResearchDispatchResult({
            root: setup.fixture.root,
            dispatchId: setup.fixture.ids.dispatchId,
            approvalId: setup.granted.approval.grant.id,
            input: recoveryInput(sandbox, () => setup.payload),
            idempotencyKey: recoveryKey,
            now: setup.now,
          }),
        ).rejects.toMatchObject({
          committed: true,
          headSeq: expect.any(Number),
          target: path
            .relative(setup.fixture.root, destinations[boundary])
            .split(path.sep)
            .join("/"),
          recovery: expectedRecovery,
        });
        expect(failed).toBe(true);
        const afterFailure = await researchCore.readResearchLedger(
          setup.fixture.root,
        );
        expect(
          recoveryTerminalEvents(afterFailure).map((event) => event.kind),
        ).toEqual([
          "result.recorded",
          "proposal.recorded",
          "approval.consumed",
        ]);
        vi.restoreAllMocks();
        let reads = 0;

        const replay = await recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: recoveryInput(sandbox, () => {
            reads += 1;
            throw new Error("recovery replay must not access input");
          }),
          idempotencyKey: `recover-${boundary}-result`,
          now: new Date(setup.granted.approval.grant.expiresAt),
        });

        expect(replay.replayed).toBe(true);
        expect(reads).toBe(0);
        expect(
          await researchCore.readResearchLedger(setup.fixture.root),
        ).toEqual(afterFailure);
        expect(fs.existsSync(destinations.result)).toBe(true);
        expect(fs.existsSync(destinations.proposal)).toBe(true);
        expect(fs.existsSync(destinations.approval)).toBe(true);
        const approvalEnvelope = JSON.parse(
          fs.readFileSync(destinations.approval, "utf8"),
        ) as { approval: { status: string } };
        expect(approvalEnvelope.approval.status).toBe("consumed");
      },
    );

    it("accepts an equivalent present-target winner during same-key repair", async () => {
      const setup = await setupRecoveredResult(sandbox, "equivalent-winner");
      const recoveryKey = "equivalent-winner-result";
      await recordApprovedResearchDispatchResult({
        root: setup.fixture.root,
        dispatchId: setup.fixture.ids.dispatchId,
        approvalId: setup.granted.approval.grant.id,
        input: recoveryInput(sandbox, () => setup.payload),
        idempotencyKey: recoveryKey,
        now: setup.now,
      });
      const ledgerBefore = await researchCore.readResearchLedger(
        setup.fixture.root,
      );
      const resultPath = path.join(
        setup.fixture.root,
        ".trellis",
        "research",
        "dispatches",
        setup.fixture.ids.dispatchId,
        "result.json",
      );
      const originalFsync = fs.fsyncSync.bind(fs);
      let replaced = false;
      vi.spyOn(fs, "fsyncSync").mockImplementation((fd) => {
        originalFsync(fd);
        if (replaced) return;
        replaced = true;
        const replacement = `${resultPath}.winner`;
        fs.writeFileSync(replacement, fs.readFileSync(resultPath));
        fs.renameSync(replacement, resultPath);
      });
      let reads = 0;

      const replay = await recordApprovedResearchDispatchResult({
        root: setup.fixture.root,
        dispatchId: setup.fixture.ids.dispatchId,
        approvalId: setup.granted.approval.grant.id,
        input: recoveryInput(sandbox, () => {
          reads += 1;
          throw new Error("equivalent-winner replay must not access input");
        }),
        idempotencyKey: recoveryKey,
        now: new Date(Number.NaN),
      });

      expect(replay.replayed).toBe(true);
      expect(replaced).toBe(true);
      expect(reads).toBe(0);
      expect(await researchCore.readResearchLedger(setup.fixture.root)).toEqual(
        ledgerBefore,
      );
      expect(JSON.parse(fs.readFileSync(resultPath, "utf8"))).toEqual(
        replay.result,
      );
    });

    it.each(["result", "proposal"] as const)(
      "preserves an outside target through a committed %s symlink failure and same-key repair",
      async (boundary) => {
        const setup = await setupRecoveredResult(
          sandbox,
          `symlink-${boundary}`,
        );
        const dispatchDirectory = path.join(
          setup.fixture.root,
          ".trellis",
          "research",
          "dispatches",
          setup.fixture.ids.dispatchId,
        );
        const destinations = {
          result: path.join(dispatchDirectory, "result.json"),
          proposal: path.join(dispatchDirectory, "proposal.json"),
          approval: path.join(
            dispatchDirectory,
            "approvals",
            `${setup.granted.approval.grant.id}.json`,
          ),
        } as const;
        const outside = path.join(
          sandbox,
          `outside-${boundary}-${setup.fixture.ids.dispatchId}.json`,
        );
        const outsideBytes = `outside ${boundary} bytes\n`;
        fs.writeFileSync(outside, outsideBytes);
        fs.symlinkSync(outside, destinations[boundary]);
        const recoveryKey = `symlink-${boundary}-result`;

        await expect(
          recordApprovedResearchDispatchResult({
            root: setup.fixture.root,
            dispatchId: setup.fixture.ids.dispatchId,
            approvalId: setup.granted.approval.grant.id,
            input: recoveryInput(sandbox, () => setup.payload),
            idempotencyKey: recoveryKey,
            now: setup.now,
          }),
        ).rejects.toMatchObject({
          committed: true,
          headSeq: expect.any(Number),
          target: path
            .relative(setup.fixture.root, destinations[boundary])
            .split(path.sep)
            .join("/"),
          recovery: expect.stringContaining(recoveryKey),
        });
        const afterFailure = await researchCore.readResearchLedger(
          setup.fixture.root,
        );
        expect(
          recoveryTerminalEvents(afterFailure).map((event) => event.kind),
        ).toEqual([
          "result.recorded",
          "proposal.recorded",
          "approval.consumed",
        ]);
        expect(fs.readFileSync(outside, "utf8")).toBe(outsideBytes);
        expect(fs.lstatSync(destinations[boundary]).isSymbolicLink()).toBe(true);

        fs.unlinkSync(destinations[boundary]);
        let reads = 0;
        const replay = await recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: recoveryInput(sandbox, () => {
            reads += 1;
            throw new Error("symlink recovery must not access input");
          }),
          idempotencyKey: recoveryKey,
          now: new Date(Number.NaN),
        });

        expect(replay.replayed).toBe(true);
        expect(reads).toBe(0);
        expect(
          await researchCore.readResearchLedger(setup.fixture.root),
        ).toEqual(afterFailure);
        expect(fs.readFileSync(outside, "utf8")).toBe(outsideBytes);
        for (const destination of Object.values(destinations)) {
          expect(fs.lstatSync(destination).isFile()).toBe(true);
        }
      },
    );
  },
);

describe(
  "approved Result replay and collision matrix",
  { timeout: 30_000 },
  () => {
    let sandbox: string;

    beforeEach(() => {
      sandbox = fs.mkdtempSync(
        path.join(os.tmpdir(), "trellis-result-replay-matrix-"),
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
      fs.rmSync(sandbox, { recursive: true, force: true });
    });

    it("replays an unavailable path without opening or reading it", async () => {
      const setup = await setupApprovedResult(sandbox, "missing-replay-path");
      const inputPath = path.join(setup.fixture.root, "worker-output.json");
      fs.writeFileSync(inputPath, setup.payload);
      await recordApprovedResearchDispatchResult({
        root: setup.fixture.root,
        dispatchId: setup.fixture.ids.dispatchId,
        approvalId: setup.granted.approval.grant.id,
        input: { kind: "path", cwd: sandbox, path: inputPath },
        idempotencyKey: "missing-replay-path-result",
        now: setup.now,
      });
      fs.rmSync(inputPath);

      const replay = await recordApprovedResearchDispatchResult({
        root: setup.fixture.root,
        dispatchId: setup.fixture.ids.dispatchId,
        approvalId: setup.granted.approval.grant.id,
        input: { kind: "path", cwd: sandbox, path: inputPath },
        idempotencyKey: "missing-replay-path-result",
        now: new Date(setup.granted.approval.grant.expiresAt),
      });

      expect(replay.replayed).toBe(true);
    });

    it("classifies same-key target and approval mismatches before input", async () => {
      let reads = 0;
      const successor = await setupApprovedResult(
        sandbox,
        "successor-conflict",
      );
      await recordApprovedResearchDispatchResult({
        root: successor.fixture.root,
        dispatchId: successor.fixture.ids.dispatchId,
        approvalId: successor.granted.approval.grant.id,
        input: lazyInput(sandbox, () => successor.payload),
        idempotencyKey: "successor-conflict-key",
        now: successor.now,
      });
      for (const mismatch of [
        {
          dispatchId: OTHER_DISPATCH_ID,
          approvalId: successor.granted.approval.grant.id,
        },
        {
          dispatchId: successor.fixture.ids.dispatchId,
          approvalId: OTHER_APPROVAL_ID,
        },
      ] as const) {
        await expect(
          recordApprovedResearchDispatchResult({
            root: successor.fixture.root,
            ...mismatch,
            input: lazyInput(sandbox, () => {
              reads += 1;
              return successor.payload;
            }),
            idempotencyKey: "successor-conflict-key",
            now: successor.now,
          }),
        ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
      }
      expect(reads).toBe(0);
    });

    it("rejects simultaneous foreign occupation of both derived IDs before input", async () => {
      const setup = await setupApprovedResult(sandbox, "both-output-collision");
      const canonical = await researchCore.readResearchState(
        setup.fixture.root,
      );
      const corrupted = structuredClone(canonical);
      const suffix = setup.granted.approval.grant.id.slice(4);
      const resultId = `res_${suffix}` as const;
      const proposalId = `prp_${suffix}` as const;
      corrupted.results[resultId] = {
        id: resultId,
        dispatchId: OTHER_DISPATCH_ID,
        runId: OTHER_RUN_ID,
        status: "completed",
        summary: "Foreign occupation",
        commands: [],
        checks: [],
        artifactRefs: [],
        blockers: [],
        createdAt: setup.now.toISOString(),
      };
      corrupted.proposals[proposalId] = {
        id: proposalId,
        dispatchId: OTHER_DISPATCH_ID,
        questId: OTHER_QUEST_ID,
        title: "Foreign occupation",
        operations: [],
        status: "pending",
        createdAt: setup.now.toISOString(),
        updatedAt: setup.now.toISOString(),
      };
      vi.spyOn(researchCore, "reduceResearchEvents").mockReturnValueOnce(
        corrupted,
      );
      let reads = 0;

      await expect(
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: lazyInput(sandbox, () => {
            reads += 1;
            return setup.payload;
          }),
          idempotencyKey: "both-output-collision-result",
          now: setup.now,
        }),
      ).rejects.toMatchObject({ code: "OUTPUT_ID_CONFLICT" });
      expect(reads).toBe(0);
    });

    it("rejects artifact validation failure without appending", async () => {
      const setup = await setupApprovedResult(sandbox, "artifact-failure");
      const payload = exactPayload(setup.payload, (value) => {
        (value.result as Record<string, unknown>).artifactRefs = [
          {
            id: "art_33333333-3333-4333-8333-333333333333",
            repositoryId: setup.fixture.ids.repositoryId,
            path: "inputs/source.txt",
            kind: "source",
            sha256: "0".repeat(64),
          },
        ];
      });
      const before = await researchCore.readResearchLedger(setup.fixture.root);

      await expect(
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: lazyInput(sandbox, () => payload),
          idempotencyKey: "artifact-failure-result",
          now: setup.now,
        }),
      ).rejects.toThrow(/sha256/);
      expect(await researchCore.readResearchLedger(setup.fixture.root)).toEqual(
        before,
      );
    });

    it("converges concurrent same-key attempts to one append and one replay", async () => {
      const setup = await setupApprovedResult(sandbox, "same-key-concurrency");
      const attempts = await Promise.all([
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: lazyInput(sandbox, () => setup.payload),
          idempotencyKey: "same-key-concurrency-result",
          now: setup.now,
        }),
        recordApprovedResearchDispatchResult({
          root: setup.fixture.root,
          dispatchId: setup.fixture.ids.dispatchId,
          approvalId: setup.granted.approval.grant.id,
          input: lazyInput(sandbox, () => setup.payload),
          idempotencyKey: "same-key-concurrency-result",
          now: setup.now,
        }),
      ]);

      expect(attempts.filter((attempt) => attempt.replayed)).toHaveLength(1);
      expect(
        recoveryTerminalEvents(
          await researchCore.readResearchLedger(setup.fixture.root),
        ).map((event) => event.kind),
      ).toEqual(["result.recorded", "proposal.recorded", "approval.consumed"]);
    });
  },
);

describe("strict Research worker JSON input", () => {
  it("accepts ordinary formatted JSON", () => {
    expect(
      parseStrictJsonInput(
        Buffer.from('{\n  "result": {},\n  "proposal": {}\n}\n', "utf8"),
      ),
    ).toEqual({ result: {}, proposal: {} });
  });

  it("rejects duplicate keys including escaped equivalents", () => {
    expect(() =>
      parseStrictJsonInput(Buffer.from('{"result":1,"result":2}', "utf8")),
    ).toThrow(/duplicate key/);
    expect(() =>
      parseStrictJsonInput(
        Buffer.from('{"re\\u0073ult":1,"result":2}', "utf8"),
      ),
    ).toThrow(/duplicate key/);
  });

  it("rejects BOM and malformed UTF-8", () => {
    expect(() =>
      parseStrictJsonInput(Uint8Array.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    ).toThrow(/BOM/);
    expect(() => parseStrictJsonInput(Uint8Array.from([0xc3, 0x28]))).toThrow(
      /valid UTF-8/,
    );
  });
});

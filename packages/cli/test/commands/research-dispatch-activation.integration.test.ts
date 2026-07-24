import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as researchCore from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createResearchCampaign,
  createResearchQuest,
  createResearchRun,
  initializeResearch,
  setResearchQuestStatus,
} from "../../src/commands/research/command.js";
import { prepareResearchDispatch } from "../../src/commands/research/dispatch-command.js";
import {
  approveResearchDispatch,
  authorizeResearchDispatch,
  planResearchActivation,
  revokeResearchApproval,
} from "../../src/commands/research/dispatch-activation-command.js";
import {
  materializeResearchActivation,
  materializeResearchApproval,
} from "../../src/commands/research/dispatch-activation-materialization.js";
import {
  ResearchActivationError,
  ResearchDispatchFileError,
} from "../../src/commands/research/errors.js";
import {
  addResearchRepository,
  bindResearchRepository,
} from "../../src/commands/research/repository.js";
import {
  createResearchDispatchFixture,
  snapshotTree,
} from "../fixtures/research-dispatch.js";

const {
  commitResearchBatch,
  createCampaignId,
  createDispatchId,
  createQuestId,
  createRunId,
  readResearchLedger,
  readResearchState,
  RESEARCH_DEFAULT_CAPABILITY_BY_STAGE,
  stableResearchJson,
} = researchCore;

async function expectInactiveQuestFailure(input: {
  readonly treeRoot: string;
  readonly operation: () => Promise<unknown>;
}): Promise<void> {
  const before = snapshotTree(input.treeRoot);
  await expect(input.operation()).rejects.toMatchObject({
    code: "QUEST_NOT_DISPATCHABLE",
    message: "Dispatch Quest must be active",
  });
  expect(snapshotTree(input.treeRoot)).toEqual(before);
}

describe("Research activation and approval commands", { timeout: 30_000 }, () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-activation-command-"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("plans activation for a historical schema-v1 Dispatch without rewriting it", async () => {
    const root = path.join(sandbox, "control");
    const repositoryRoot = path.join(sandbox, "repository");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    fs.mkdirSync(repositoryRoot, { recursive: true });
    await initializeResearch({ root, name: "Historical activation" });
    const repository = (
      await addResearchRepository({
        root,
        name: "repository",
        kind: "code",
        locator: "../repository",
      })
    ).repository;
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    const dispatchId = createDispatchId();
    await createResearchQuest({
      root,
      id: questId,
      title: "Quest",
      repositoryIds: [repository.id],
    });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Campaign",
      protocolDigest: "protocol-v1",
    });
    await createResearchRun({ root, id: runId, campaignId, title: "Run" });
    const dispatch: researchCore.Dispatch = {
      id: dispatchId,
      questId,
      campaignId,
      runId,
      repositoryId: repository.id,
      ownerSkill: "opaque-owner",
      provider: "opaque-provider",
      objective: "Historical bounded work",
      acceptanceCriteria: [],
      context: [],
      allowedWritePaths: ["output/report.json"],
      expectedOutputs: [],
      checks: [],
      taskRef: "opaque-task-ref",
      createdAt: "2026-07-17T00:00:00.000Z",
    };
    await commitResearchBatch({
      root,
      actor: { type: "agent", id: "legacy-test" },
      provenance: { source: "legacy-test" },
      idempotencyKey: "legacy-prepare",
      timestamp: dispatch.createdAt,
      mutations: [{ kind: "dispatch.record", dispatch }],
    });
    const dispatchDirectory = path.join(
      root,
      ".trellis",
      "research",
      "dispatches",
      dispatch.id,
    );
    fs.mkdirSync(dispatchDirectory, { recursive: true });
    const requestPath = path.join(dispatchDirectory, "request.json");
    fs.writeFileSync(requestPath, stableResearchJson(dispatch));
    fs.rmSync(requestPath);
    const ledgerBeforeReplay = await readResearchLedger(root);
    const legacyReplay = await prepareResearchDispatch({
      root,
      id: dispatchId,
      runId,
      questId,
      campaignId,
      repositoryId: repository.id,
      ownerSkill: "ignored-on-replay",
      capabilityId: "ignored-on-legacy-replay",
      objective: "ignored-on-replay",
      acceptanceCriteria: [],
      allowedWritePaths: [],
      expectedOutputs: [],
      checks: [],
      idempotencyKey: "legacy-prepare",
    });
    expect(legacyReplay).toMatchObject({
      replayed: true,
      legacyPrepare: true,
      activation: null,
      activationFile: null,
    });
    expect(fs.readFileSync(requestPath, "utf8")).toBe(stableResearchJson(dispatch));
    expect(await readResearchLedger(root)).toEqual(ledgerBeforeReplay);

    const planned = await planResearchActivation({
      root,
      dispatchId,
      capabilityId: "research.setup.project",
      idempotencyKey: "plan-historical",
    });
    expect(planned.events.map((event) => [event.schemaVersion, event.kind])).toEqual([
      [2, "activation.planned"],
    ]);
    expect(planned.activationFile).toMatch(/activation\.json$/);
    const state = await readResearchState(root);
    expect(state.dispatches[dispatchId]).toEqual(dispatch);
    expect(state.activationByDispatchId[dispatchId]).toBe(planned.activation.id);
  });

  it("materializes the canonical prepare winner after a concurrent commit replay", async () => {
    const fixture = await createResearchDispatchFixture(sandbox);
    const runId = createRunId();
    const dispatchId = createDispatchId();
    await createResearchRun({
      root: fixture.root,
      id: runId,
      campaignId: fixture.ids.campaignId,
      title: "Concurrent prepare run",
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T00:00:00.000Z"));
    vi.spyOn(researchCore, "commitResearchBatch").mockImplementationOnce(
      async (input) => {
        vi.setSystemTime(new Date("2026-07-24T00:00:01.000Z"));
        await prepareResearchDispatch({
          root: fixture.root,
          id: dispatchId,
          runId,
          questId: fixture.ids.questId,
          campaignId: fixture.ids.campaignId,
          repositoryId: fixture.ids.repositoryId,
          ownerSkill: "concurrent-winner",
          capabilityId: RESEARCH_DEFAULT_CAPABILITY_BY_STAGE.literature,
          objective: "Canonical concurrent winner",
          acceptanceCriteria: [],
          allowedWritePaths: [],
          expectedOutputs: [],
          checks: [],
          idempotencyKey: "concurrent-prepare",
        });
        return commitResearchBatch(input);
      },
    );

    const prepared = await prepareResearchDispatch({
      root: fixture.root,
      id: dispatchId,
      runId,
      questId: fixture.ids.questId,
      campaignId: fixture.ids.campaignId,
      repositoryId: fixture.ids.repositoryId,
      ownerSkill: "losing-candidate",
      capabilityId: RESEARCH_DEFAULT_CAPABILITY_BY_STAGE.literature,
      objective: "Losing candidate",
      acceptanceCriteria: [],
      allowedWritePaths: [],
      expectedOutputs: [],
      checks: [],
      idempotencyKey: "concurrent-prepare",
    });

    expect(prepared).toMatchObject({
      replayed: true,
      dispatch: {
        objective: "Canonical concurrent winner",
        createdAt: "2026-07-24T00:00:01.000Z",
      },
    });
    const manifest = JSON.parse(
      fs.readFileSync(path.join(fixture.root, prepared.manifestFile ?? ""), "utf8"),
    ) as { generatedAt?: string };
    expect(manifest.generatedAt).toBe(prepared.dispatch.createdAt);
  });

  it("validates prepare capability before reading the target Repository", async () => {
    const fixture = await createResearchDispatchFixture(sandbox);
    const runId = createRunId();
    await createResearchRun({
      root: fixture.root,
      id: runId,
      campaignId: fixture.ids.campaignId,
      title: "Unknown capability run",
    });
    fs.rmSync(fixture.repository, { recursive: true });
    const before = snapshotTree(sandbox);
    await expect(
      prepareResearchDispatch({
        root: fixture.root,
        runId,
        questId: fixture.ids.questId,
        campaignId: fixture.ids.campaignId,
        repositoryId: fixture.ids.repositoryId,
        ownerSkill: "opaque-owner",
        capabilityId: "unknown-capability",
        objective: "Fail before Repository resolution",
        acceptanceCriteria: [],
        allowedWritePaths: [],
        expectedOutputs: [],
        checks: [],
      }),
    ).rejects.toMatchObject({ code: "UNKNOWN_CAPABILITY" });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("grants an automatic approval only when immutable bounds and policy allow it", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const authorized = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "automatic-grant",
    });
    expect(authorized.approval).toMatchObject({
      status: "granted",
      grant: {
        host: "codex",
        mode: "automatic",
        approverLabel: "trellis-policy-v1",
        rationale: "Eligible under immutable registry and project policy.",
      },
    });
    expect(authorized.approvalFile).toMatch(/approvals\/apr_.*\.json$/);

    const activationFile = path.join(
      fixture.root,
      ".trellis",
      "research",
      "dispatches",
      fixture.ids.dispatchId,
      "activation.json",
    );
    const approvalFile = path.join(fixture.root, authorized.approvalFile ?? "");
    fs.rmSync(activationFile);
    fs.rmSync(approvalFile);
    const replayed = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "automatic-grant",
    });
    expect(replayed.replayed).toBe(true);
    expect(replayed.approval).toEqual(authorized.approval);
    expect(fs.existsSync(activationFile)).toBe(true);
    expect(fs.existsSync(approvalFile)).toBe(true);

    await expect(
      approveResearchDispatch(
        {
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "codex",
          idempotencyKey: "automatic-grant",
        },
        {
          stdinIsTTY: true,
          stdoutIsTTY: true,
          stderrIsTTY: true,
          writeSummary: () => undefined,
          question: async () => "",
          close: () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    const claude = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
      idempotencyKey: "automatic-grant-claude",
    });
    expect(claude.approval.grant.host).toBe("claude");

    vi.useFakeTimers();
    vi.setSystemTime(new Date(authorized.approval.grant.expiresAt));
    const replacement = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "automatic-grant-replacement",
    });
    vi.useRealTimers();
    expect(replacement.approval.grant.id).not.toBe(authorized.approval.grant.id);
    expect(replacement.approval.grant.grantedAt).toBe(
      authorized.approval.grant.expiresAt,
    );

    await expect(
      authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_ACTIVE_APPROVAL" });
    await expect(
      authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: `prepare:${fixture.ids.dispatchId}`,
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    const revoked = await revokeResearchApproval({
      root: fixture.root,
      approvalId: authorized.approval.grant.id,
      reason: "Automatic approval withdrawn",
    });
    expect(revoked.approval.status).toBe("revoked");
    const grantReplayAfterRevocation = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "automatic-grant",
    });
    expect(grantReplayAfterRevocation.replayed).toBe(true);
    expect(grantReplayAfterRevocation.approval).toEqual(revoked.approval);
    expect(
      JSON.parse(fs.readFileSync(approvalFile, "utf8")),
    ).toMatchObject({ approval: revoked.approval });

    const outside = path.join(sandbox, "outside-activation.json");
    fs.writeFileSync(outside, "outside\n");
    fs.rmSync(activationFile);
    fs.symlinkSync(outside, activationFile);
    await expect(
      authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: "automatic-grant",
      }),
    ).rejects.toMatchObject({
      committed: true,
      recovery: "retry authorization with idempotency key 'automatic-grant'",
      target: path
        .relative(fixture.root, activationFile)
        .split(path.sep)
        .join("/"),
    });
    expect(fs.readFileSync(outside, "utf8")).toBe("outside\n");
  });

  it("returns canonical revocation when a grant commit resolves as a concurrent replay", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    vi.spyOn(researchCore, "commitResearchBatch").mockImplementationOnce(
      async (input) => {
        const granted = await commitResearchBatch(input);
        const grant = granted.events[0]?.payload.approval as
          | researchCore.ResearchApprovalGrant
          | undefined;
        if (!grant) throw new Error("Expected concurrent grant event");
        const revokedAt = new Date(Date.parse(grant.grantedAt) + 1).toISOString();
        const revoked = await commitResearchBatch({
          root: input.root,
          actor: { type: "agent", id: "concurrent-revoker" },
          provenance: { source: "concurrent-revoker" },
          idempotencyKey: "concurrent-revoke",
          timestamp: revokedAt,
          mutations: [
            {
              kind: "approval.revoke",
              approvalId: grant.id,
              revokedAt,
              reason: "Concurrent revocation",
            },
          ],
        });
        return { ...granted, replayed: true, headSeq: revoked.headSeq };
      },
    );

    const authorized = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "concurrent-grant",
    });

    expect(authorized).toMatchObject({
      replayed: true,
      approval: {
        status: "revoked",
        revocationReason: "Concurrent revocation",
      },
    });
    expect(
      JSON.parse(
        fs.readFileSync(path.join(fixture.root, authorized.approvalFile ?? ""), "utf8"),
      ),
    ).toMatchObject({ approval: authorized.approval });
  });

  it("returns canonical revocation when an interactive grant resolves as a concurrent replay", async () => {
    const fixture = await createResearchDispatchFixture(sandbox);
    const state = await readResearchState(fixture.root);
    const activationId = state.activationByDispatchId[fixture.ids.dispatchId];
    if (!activationId) throw new Error("Expected activation ID");
    const activation = state.activations[activationId];
    if (!activation) throw new Error("Expected activation");
    vi.spyOn(researchCore, "commitResearchBatch").mockImplementationOnce(
      async (input) => {
        const granted = await commitResearchBatch(input);
        const grant = granted.events[0]?.payload.approval as
          | researchCore.ResearchApprovalGrant
          | undefined;
        if (!grant) throw new Error("Expected concurrent grant event");
        const revokedAt = new Date(Date.parse(grant.grantedAt) + 1).toISOString();
        const revoked = await commitResearchBatch({
          root: input.root,
          actor: { type: "agent", id: "concurrent-revoker" },
          provenance: { source: "concurrent-revoker" },
          idempotencyKey: "concurrent-interactive-revoke",
          timestamp: revokedAt,
          mutations: [
            {
              kind: "approval.revoke",
              approvalId: grant.id,
              revokedAt,
              reason: "Concurrent interactive revocation",
            },
          ],
        });
        return { ...granted, replayed: true, headSeq: revoked.headSeq };
      },
    );
    const answers = [
      "Operator",
      "Reviewed authority",
      `APPROVE ${fixture.ids.dispatchId} claude ${activation.requestDigest.slice(7, 19)}`,
    ];

    const approved = await approveResearchDispatch(
      {
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "concurrent-interactive-grant",
      },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: () => undefined,
        question: async () => answers.shift() ?? "",
        close: () => undefined,
      },
    );

    expect(approved).toMatchObject({
      replayed: true,
      approval: {
        status: "revoked",
        revocationReason: "Concurrent interactive revocation",
      },
    });
    expect(
      JSON.parse(
        fs.readFileSync(path.join(fixture.root, approved.approvalFile ?? ""), "utf8"),
      ),
    ).toMatchObject({ approval: approved.approval });
  });

  it("rejects inactive Quests without writes across activation lifecycle commands", async () => {
    const prepareSandbox = path.join(sandbox, "prepare");
    const prepareFixture = await createResearchDispatchFixture(prepareSandbox);
    const prepareCampaignId = createCampaignId();
    const prepareRunId = createRunId();
    await createResearchCampaign({
      root: prepareFixture.root,
      id: prepareCampaignId,
      questId: prepareFixture.ids.questId,
      title: "Inactive prepare campaign",
      protocolDigest: "protocol-v1",
    });
    await createResearchRun({
      root: prepareFixture.root,
      id: prepareRunId,
      campaignId: prepareCampaignId,
      title: "Inactive prepare run",
    });
    await setResearchQuestStatus({
      root: prepareFixture.root,
      questId: prepareFixture.ids.questId,
      status: "paused",
    });
    await expectInactiveQuestFailure({
      treeRoot: prepareSandbox,
      operation: () =>
        prepareResearchDispatch({
          root: prepareFixture.root,
          id: createDispatchId(),
          runId: prepareRunId,
          questId: prepareFixture.ids.questId,
          campaignId: prepareCampaignId,
          repositoryId: prepareFixture.ids.repositoryId,
          ownerSkill: "inactive-prepare",
          capabilityId: RESEARCH_DEFAULT_CAPABILITY_BY_STAGE.literature,
          objective: "Reject inactive Quest prepare",
          acceptanceCriteria: [],
          allowedWritePaths: [],
          expectedOutputs: [],
          checks: [],
        }),
    });

    const planSandbox = path.join(sandbox, "plan");
    const planFixture = await createResearchDispatchFixture(planSandbox);
    const planCampaignId = createCampaignId();
    const planRunId = createRunId();
    const planDispatchId = createDispatchId();
    await createResearchCampaign({
      root: planFixture.root,
      id: planCampaignId,
      questId: planFixture.ids.questId,
      title: "Inactive plan campaign",
      protocolDigest: "protocol-v1",
    });
    await createResearchRun({
      root: planFixture.root,
      id: planRunId,
      campaignId: planCampaignId,
      title: "Inactive plan run",
    });
    const historicalDispatch: researchCore.Dispatch = {
      id: planDispatchId,
      questId: planFixture.ids.questId,
      campaignId: planCampaignId,
      runId: planRunId,
      repositoryId: planFixture.ids.repositoryId,
      ownerSkill: "historical-owner",
      objective: "Reject inactive Quest activation planning",
      acceptanceCriteria: [],
      context: [],
      allowedWritePaths: [],
      expectedOutputs: [],
      checks: [],
      createdAt: "2026-07-17T00:00:00.000Z",
    };
    await commitResearchBatch({
      root: planFixture.root,
      actor: { type: "agent", id: "inactive-quest-test" },
      provenance: { source: "inactive-quest-test" },
      idempotencyKey: "inactive-quest-historical-prepare",
      timestamp: historicalDispatch.createdAt,
      mutations: [{ kind: "dispatch.record", dispatch: historicalDispatch }],
    });
    const historicalRequestDirectory = path.join(
      planFixture.root,
      ".trellis",
      "research",
      "dispatches",
      planDispatchId,
    );
    fs.mkdirSync(historicalRequestDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(historicalRequestDirectory, "request.json"),
      "malformed downstream request",
    );
    await setResearchQuestStatus({
      root: planFixture.root,
      questId: planFixture.ids.questId,
      status: "paused",
    });
    await expectInactiveQuestFailure({
      treeRoot: planSandbox,
      operation: () =>
        planResearchActivation({
          root: planFixture.root,
          dispatchId: planDispatchId,
          capabilityId: RESEARCH_DEFAULT_CAPABILITY_BY_STAGE.literature,
        }),
    });

    const authorizeSandbox = path.join(sandbox, "authorize");
    const authorizeFixture = await createResearchDispatchFixture(authorizeSandbox, {
      automaticEnabled: true,
    });
    await setResearchQuestStatus({
      root: authorizeFixture.root,
      questId: authorizeFixture.ids.questId,
      status: "paused",
    });
    fs.writeFileSync(
      path.join(
        authorizeFixture.root,
        ".trellis",
        "research",
        "dispatches",
        authorizeFixture.ids.dispatchId,
        "request.json",
      ),
      "malformed downstream request",
    );
    await expectInactiveQuestFailure({
      treeRoot: authorizeSandbox,
      operation: () =>
        authorizeResearchDispatch({
          root: authorizeFixture.root,
          dispatchId: authorizeFixture.ids.dispatchId,
          host: "codex",
        }),
    });

    const approveSandbox = path.join(sandbox, "approve");
    const approveFixture = await createResearchDispatchFixture(approveSandbox);
    const approveState = await readResearchState(approveFixture.root);
    const approveActivationId =
      approveState.activationByDispatchId[approveFixture.ids.dispatchId];
    if (!approveActivationId) throw new Error("Expected approve activation ID");
    const approveActivation = approveState.activations[approveActivationId];
    if (!approveActivation) throw new Error("Expected approve activation");
    let answerIndex = 0;
    let beforeRevalidation: Map<string, string> | undefined;
    await expect(
      approveResearchDispatch(
        {
          root: approveFixture.root,
          dispatchId: approveFixture.ids.dispatchId,
          host: "claude",
        },
        {
          stdinIsTTY: true,
          stdoutIsTTY: true,
          stderrIsTTY: true,
          writeSummary: () => undefined,
          question: async () => {
            answerIndex += 1;
            if (answerIndex === 1) return "Local operator";
            if (answerIndex === 2) return "Reviewed authority";
            await setResearchQuestStatus({
              root: approveFixture.root,
              questId: approveFixture.ids.questId,
              status: "paused",
            });
            beforeRevalidation = snapshotTree(approveSandbox);
            return `APPROVE ${approveFixture.ids.dispatchId} claude ${approveActivation.requestDigest.slice(7, 19)}`;
          },
          close: () => undefined,
        },
      ),
    ).rejects.toMatchObject({
      code: "QUEST_NOT_DISPATCHABLE",
      message: "Dispatch Quest must be active",
    });
    if (!beforeRevalidation) throw new Error("Expected revalidation snapshot");
    expect(snapshotTree(approveSandbox)).toEqual(beforeRevalidation);
  }, 30_000);

  it("rejects request, policy, and normalized scope drift before approval", async () => {
    const requestFixture = await createResearchDispatchFixture(
      path.join(sandbox, "request-drift"),
      { automaticEnabled: true },
    );
    fs.writeFileSync(requestFixture.requestPath, "{broken}\n");
    await expect(
      authorizeResearchDispatch({
        root: requestFixture.root,
        dispatchId: requestFixture.ids.dispatchId,
        host: "codex",
      }),
    ).rejects.toMatchObject({ code: "REQUEST_STATE_MISMATCH" });

    const symlinkFixture = await createResearchDispatchFixture(
      path.join(sandbox, "request-parent-symlink"),
      { automaticEnabled: true },
    );
    const dispatchDirectory = path.dirname(symlinkFixture.requestPath);
    const outsideDirectory = path.join(sandbox, "outside-dispatch-directory");
    fs.mkdirSync(outsideDirectory, { recursive: true });
    fs.copyFileSync(
      symlinkFixture.requestPath,
      path.join(outsideDirectory, "request.json"),
    );
    fs.rmSync(dispatchDirectory, { recursive: true });
    fs.symlinkSync(outsideDirectory, dispatchDirectory, "dir");
    await expect(
      authorizeResearchDispatch({
        root: symlinkFixture.root,
        dispatchId: symlinkFixture.ids.dispatchId,
        host: "codex",
      }),
    ).rejects.toMatchObject({ code: "REQUEST_NOT_FOUND" });

    const policyFixture = await createResearchDispatchFixture(
      path.join(sandbox, "policy-drift"),
      { automaticEnabled: true },
    );
    const policyPath = path.join(
      policyFixture.root,
      ".trellis",
      "research",
      "policy.json",
    );
    const policy = JSON.parse(fs.readFileSync(policyPath, "utf8")) as {
      defaults: { automaticEnabled: boolean };
    };
    policy.defaults.automaticEnabled = false;
    fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);
    await expect(
      authorizeResearchDispatch({
        root: policyFixture.root,
        dispatchId: policyFixture.ids.dispatchId,
        host: "codex",
      }),
    ).rejects.toMatchObject({ code: "POLICY_DIGEST_MISMATCH" });

    const scopeFixture = await createResearchDispatchFixture(
      path.join(sandbox, "scope-drift"),
      { automaticEnabled: true, git: false },
    );
    const alternateRepository = path.join(sandbox, "alternate-repository");
    fs.mkdirSync(path.join(alternateRepository, "inputs"), { recursive: true });
    fs.writeFileSync(
      path.join(alternateRepository, "inputs", "source.txt"),
      scopeFixture.artifactBody,
    );
    await bindResearchRepository({
      root: scopeFixture.root,
      repositoryId: scopeFixture.ids.repositoryId,
      path: alternateRepository,
    });
    await expect(
      authorizeResearchDispatch({
        root: scopeFixture.root,
        dispatchId: scopeFixture.ids.dispatchId,
        host: "codex",
      }),
    ).rejects.toMatchObject({ code: "SCOPE_HASH_MISMATCH" });
  }, 30_000);

  it("requires interactive approval when automatic policy is disabled, then grants and revokes", async () => {
    const fixture = await createResearchDispatchFixture(sandbox);
    const state = await readResearchState(fixture.root);
    const activationId = state.activationByDispatchId[fixture.ids.dispatchId];
    if (!activationId) throw new Error("Expected fixture activation ID");
    const activation = state.activations[activationId];
    if (!activation) throw new Error("Expected fixture activation");

    await expect(
      authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "EXPLICIT_APPROVAL_REQUIRED" });

    const summaries: string[] = [];
    const answers = [
      "Local operator",
      "Reviewed bounded authority",
      `APPROVE ${fixture.ids.dispatchId} claude ${activation.requestDigest.slice(7, 19)}`,
    ];
    const approved = await approveResearchDispatch(
      {
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "interactive-grant",
      },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: (summary) => summaries.push(summary),
        question: async () => answers.shift() ?? "",
        close: () => undefined,
      },
    );
    expect(approved.approval).toMatchObject({
      status: "granted",
      grant: {
        mode: "interactive",
        approverLabel: "Local operator",
        rationale: "Reviewed bounded authority",
      },
    });
    expect(approved.approvalFile).toMatch(/approvals\/apr_.*\.json$/);
    const summary = summaries[0]?.split("\n") ?? [];
    const orderedLabels = [
      "Dispatch:",
      "Quest:",
      "Stage:",
      "Capability:",
      "Procedure:",
      "Policy:",
      "Request:",
      "Scope:",
      "Host:",
      "Repository count: 1",
      "Authority:",
      "Limits:",
      "Artifacts:",
      "Writes:",
      "Outputs:",
      "Checks:",
    ];
    let previousIndex = -1;
    for (const label of orderedLabels) {
      const index = summary.findIndex((line) => line.startsWith(label));
      expect(index).toBeGreaterThan(previousIndex);
      previousIndex = index;
    }

    await expect(
      authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "interactive-grant",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    const replayAnswers = [
      "Different operator",
      "Different rationale",
      `APPROVE ${fixture.ids.dispatchId} claude ${activation.requestDigest.slice(7, 19)}`,
    ];
    const replayed = await approveResearchDispatch(
      {
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "interactive-grant",
      },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: () => undefined,
        question: async () => replayAnswers.shift() ?? "",
        close: () => undefined,
      },
    );
    expect(replayed.replayed).toBe(true);
    expect(replayed.approval).toEqual(approved.approval);

    vi.useFakeTimers();
    vi.setSystemTime(new Date(approved.approval.grant.expiresAt));
    const revoked = await revokeResearchApproval({
      root: fixture.root,
      approvalId: approved.approval.grant.id,
      reason: "Operator withdrew approval",
      idempotencyKey: "revoke-grant",
    });
    vi.useRealTimers();
    expect(revoked.approval).toMatchObject({
      status: "revoked",
      revocationReason: "Operator withdrew approval",
    });
    expect(
      (await readResearchState(fixture.root)).approvals[approved.approval.grant.id],
    ).toEqual(revoked.approval);

    const revokedReplayAnswers = [
      "Replay operator",
      "Replay rationale",
      `APPROVE ${fixture.ids.dispatchId} claude ${activation.requestDigest.slice(7, 19)}`,
    ];
    const grantReplayAfterRevocation = await approveResearchDispatch(
      {
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "interactive-grant",
      },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: () => undefined,
        question: async () => revokedReplayAnswers.shift() ?? "",
        close: () => undefined,
      },
    );
    expect(grantReplayAfterRevocation.replayed).toBe(true);
    expect(grantReplayAfterRevocation.approval).toEqual(revoked.approval);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(fixture.root, revoked.approvalFile ?? ""),
          "utf8",
        ),
      ),
    ).toMatchObject({ approval: revoked.approval });

    const activationFile = path.join(
      fixture.root,
      ".trellis",
      "research",
      "dispatches",
      fixture.ids.dispatchId,
      "activation.json",
    );
    fs.rmSync(activationFile);
    fs.rmSync(path.join(fixture.root, revoked.approvalFile ?? ""));
    const revokeReplay = await revokeResearchApproval({
      root: fixture.root,
      approvalId: approved.approval.grant.id,
      idempotencyKey: "revoke-grant",
    });
    expect(revokeReplay.replayed).toBe(true);
    expect(revokeReplay.approval).toEqual(revoked.approval);
    expect(fs.existsSync(activationFile)).toBe(true);
    expect(fs.existsSync(path.join(fixture.root, revokeReplay.approvalFile ?? ""))).toBe(
      true,
    );

    const codexAnswers = [
      "Operator",
      "Reviewed",
      `APPROVE ${fixture.ids.dispatchId} codex ${activation.requestDigest.slice(7, 19)}`,
    ];
    const codexApproval = await approveResearchDispatch(
      { root: fixture.root, dispatchId: fixture.ids.dispatchId, host: "codex" },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: () => undefined,
        question: async () => codexAnswers.shift() ?? "",
        close: () => undefined,
      },
    );
    await expect(
      revokeResearchApproval({
        root: fixture.root,
        approvalId: codexApproval.approval.grant.id,
        json: true,
      }),
    ).rejects.toMatchObject({ code: "REVOCATION_REASON_REQUIRED" });
    const unicodeRevocation = await revokeResearchApproval({
      root: fixture.root,
      approvalId: codexApproval.approval.grant.id,
      reason: "界".repeat(1_024),
    });
    const revocationReason = unicodeRevocation.approval.revocationReason;
    if (!revocationReason) throw new Error("Expected revocation reason");
    expect([...revocationReason]).toHaveLength(1_024);
  });

  it("rejects non-TTY approval and exact-challenge mismatch", async () => {
    const fixture = await createResearchDispatchFixture(sandbox);
    const ttyCombinations = [
      [false, false, false],
      [false, false, true],
      [false, true, false],
      [false, true, true],
      [true, false, false],
      [true, false, true],
      [true, true, false],
    ] as const;
    for (const [stdinIsTTY, stdoutIsTTY, stderrIsTTY] of ttyCombinations) {
      await expect(
        approveResearchDispatch(
          { root: fixture.root, dispatchId: fixture.ids.dispatchId, host: "codex" },
          {
            stdinIsTTY,
            stdoutIsTTY,
            stderrIsTTY,
            writeSummary: () => undefined,
            question: async () => "",
            close: () => undefined,
          },
        ),
      ).rejects.toBeInstanceOf(ResearchActivationError);
    }

    const answers = ["Operator", "Reviewed", "APPROVE wrong"];
    await expect(
      approveResearchDispatch(
        { root: fixture.root, dispatchId: fixture.ids.dispatchId, host: "codex" },
        {
          stdinIsTTY: true,
          stdoutIsTTY: true,
          stderrIsTTY: true,
          writeSummary: () => undefined,
          question: async () => answers.shift() ?? "",
          close: () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "APPROVAL_CHALLENGE_MISMATCH" });

    const state = await readResearchState(fixture.root);
    const activationId = state.activationByDispatchId[fixture.ids.dispatchId];
    if (!activationId) throw new Error("Expected fixture activation ID");
    const activation = state.activations[activationId];
    if (!activation) throw new Error("Expected fixture activation");
    const boundaryAnswers = [
      "😀".repeat(128),
      "界".repeat(1_024),
      `APPROVE ${fixture.ids.dispatchId} codex ${activation.requestDigest.slice(7, 19)}`,
    ];
    const boundary = await approveResearchDispatch(
      {
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: "unicode-boundary",
      },
      {
        stdinIsTTY: true,
        stdoutIsTTY: true,
        stderrIsTTY: true,
        writeSummary: () => undefined,
        question: async () => boundaryAnswers.shift() ?? "",
        close: () => undefined,
      },
    );
    expect([...boundary.approval.grant.approverLabel]).toHaveLength(128);
    expect([...boundary.approval.grant.rationale]).toHaveLength(1_024);

    await expect(
      approveResearchDispatch(
        { root: fixture.root, dispatchId: fixture.ids.dispatchId, host: "claude" },
        {
          stdinIsTTY: true,
          stdoutIsTTY: true,
          stderrIsTTY: true,
          writeSummary: () => undefined,
          question: async () => "😀".repeat(129),
          close: () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "INVALID_APPROVAL_INPUT" });
  });

  it("writes exact stable sidecar bytes and preserves old-or-absent targets on staging failure", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const state = await readResearchState(fixture.root);
    const activationId = state.activationByDispatchId[fixture.ids.dispatchId];
    if (!activationId) throw new Error("Expected activation ID");
    const activation = state.activations[activationId];
    if (!activation) throw new Error("Expected activation");
    const activationPath = path.join(
      fixture.root,
      ".trellis",
      "research",
      "dispatches",
      fixture.ids.dispatchId,
      "activation.json",
    );
    const activationBytes = stableResearchJson({
      schemaVersion: 2,
      activation,
    });
    expect(fs.readFileSync(activationPath, "utf8")).toBe(activationBytes);
    expect(activationBytes.endsWith("\n")).toBe(true);
    expect(activationBytes.endsWith("\n\n")).toBe(false);

    const authorized = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "exact-sidecar-approval",
    });
    const approvalPath = path.join(fixture.root, authorized.approvalFile ?? "");
    const approvalBytes = stableResearchJson({
      schemaVersion: 2,
      approval: authorized.approval,
    });
    expect(fs.readFileSync(approvalPath, "utf8")).toBe(approvalBytes);

    const originalWrite = fs.writeSync.bind(fs);
    const shortWrite = vi
      .spyOn(fs, "writeSync")
      .mockImplementationOnce(((fd, buffer, offset, length) =>
        originalWrite(
          fd,
          buffer,
          offset,
          Math.max(1, Math.floor(length / 2)),
        )) as typeof fs.writeSync);
    expect(
      materializeResearchActivation({
        root: fixture.root,
        headSeq: authorized.headSeq,
        activation,
        recovery: "retry exact-sidecar-approval",
      }),
    ).toMatch(/activation\.json$/);
    expect(fs.readFileSync(activationPath, "utf8")).toBe(activationBytes);
    shortWrite.mockRestore();

    const oldActivationBytes = fs.readFileSync(activationPath, "utf8");
    const writeFailure = vi
      .spyOn(fs, "writeSync")
      .mockImplementationOnce(() => {
        throw new Error("injected descriptor write failure");
      });
    expect(() =>
      materializeResearchActivation({
        root: fixture.root,
        headSeq: authorized.headSeq,
        activation,
        recovery: "retry exact-sidecar-approval",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.readFileSync(activationPath, "utf8")).toBe(oldActivationBytes);
    writeFailure.mockRestore();

    fs.rmSync(activationPath);
    const fsyncFailure = vi.spyOn(fs, "fsyncSync").mockImplementationOnce(() => {
      throw new Error("injected fsync failure");
    });
    expect(() =>
      materializeResearchActivation({
        root: fixture.root,
        headSeq: authorized.headSeq,
        activation,
        recovery: "retry exact-sidecar-approval",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.existsSync(activationPath)).toBe(false);
    fsyncFailure.mockRestore();

    fs.mkdirSync(activationPath);
    expect(() =>
      materializeResearchActivation({
        root: fixture.root,
        headSeq: authorized.headSeq,
        activation,
        recovery: "retry exact-sidecar-approval",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.lstatSync(activationPath).isDirectory()).toBe(true);
  });

  it("detects root and parent replacement before sidecar publication without following replacements", async () => {
    const rootFixture = await createResearchDispatchFixture(
      path.join(sandbox, "root-replacement"),
    );
    const rootState = await readResearchState(rootFixture.root);
    const rootActivationId =
      rootState.activationByDispatchId[rootFixture.ids.dispatchId];
    if (!rootActivationId) throw new Error("Expected root activation ID");
    const rootActivation = rootState.activations[rootActivationId];
    if (!rootActivation) throw new Error("Expected root activation");
    const rootActivationPath = path.join(
      rootFixture.root,
      ".trellis",
      "research",
      "dispatches",
      rootFixture.ids.dispatchId,
      "activation.json",
    );
    fs.rmSync(rootActivationPath);
    const outsideRoot = path.join(sandbox, "replacement-root");
    const outsideDispatch = path.join(
      outsideRoot,
      ".trellis",
      "research",
      "dispatches",
      rootFixture.ids.dispatchId,
    );
    fs.mkdirSync(outsideDispatch, { recursive: true });
    const displacedRoot = `${rootFixture.root}-displaced`;
    const originalOpen = fs.openSync.bind(fs);
    vi.spyOn(fs, "openSync").mockImplementationOnce(((file, flags, mode) => {
      fs.renameSync(rootFixture.root, displacedRoot);
      fs.symlinkSync(outsideRoot, rootFixture.root, "dir");
      return originalOpen(file, flags, mode);
    }) as typeof fs.openSync);
    expect(() =>
      materializeResearchActivation({
        root: rootFixture.root,
        headSeq: rootState.projectedThroughSeq,
        activation: rootActivation,
        recovery: "retry root replacement",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.existsSync(path.join(outsideDispatch, "activation.json"))).toBe(
      false,
    );
    for (const entry of fs.readdirSync(outsideDispatch)) {
      expect(fs.statSync(path.join(outsideDispatch, entry)).size).toBe(0);
    }
    vi.restoreAllMocks();

    const dispatchFixture = await createResearchDispatchFixture(
      path.join(sandbox, "dispatch-replacement"),
    );
    const dispatchState = await readResearchState(dispatchFixture.root);
    const dispatchActivationId =
      dispatchState.activationByDispatchId[dispatchFixture.ids.dispatchId];
    if (!dispatchActivationId) throw new Error("Expected dispatch activation ID");
    const dispatchActivation = dispatchState.activations[dispatchActivationId];
    if (!dispatchActivation) throw new Error("Expected dispatch activation");
    const dispatchDirectory = path.join(
      dispatchFixture.root,
      ".trellis",
      "research",
      "dispatches",
      dispatchFixture.ids.dispatchId,
    );
    fs.rmSync(path.join(dispatchDirectory, "activation.json"));
    const displacedDispatch = `${dispatchDirectory}-displaced`;
    const outsideDispatchReplacement = path.join(
      sandbox,
      "outside-dispatch-replacement",
    );
    fs.mkdirSync(outsideDispatchReplacement, { recursive: true });
    const originalWrite = fs.writeSync.bind(fs);
    vi.spyOn(fs, "writeSync").mockImplementationOnce(((
      fd,
      buffer,
      offset,
      length,
    ) => {
      fs.renameSync(dispatchDirectory, displacedDispatch);
      fs.symlinkSync(outsideDispatchReplacement, dispatchDirectory, "dir");
      return originalWrite(fd, buffer, offset, length);
    }) as typeof fs.writeSync);
    expect(() =>
      materializeResearchActivation({
        root: dispatchFixture.root,
        headSeq: dispatchState.projectedThroughSeq,
        activation: dispatchActivation,
        recovery: "retry dispatch replacement",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(
      fs.existsSync(path.join(outsideDispatchReplacement, "activation.json")),
    ).toBe(false);
    expect(fs.readdirSync(outsideDispatchReplacement)).toEqual([]);
    vi.restoreAllMocks();

    const approvalFixture = await createResearchDispatchFixture(
      path.join(sandbox, "approval-replacement"),
      { automaticEnabled: true },
    );
    const approval = await authorizeResearchDispatch({
      root: approvalFixture.root,
      dispatchId: approvalFixture.ids.dispatchId,
      host: "claude",
      idempotencyKey: "approval-parent-replacement",
    });
    const approvalPath = path.join(
      approvalFixture.root,
      approval.approvalFile ?? "",
    );
    const approvalsDirectory = path.dirname(approvalPath);
    fs.rmSync(approvalPath);
    const displacedApprovals = `${approvalsDirectory}-displaced`;
    const outsideApprovals = path.join(sandbox, "outside-approvals");
    fs.mkdirSync(outsideApprovals, { recursive: true });
    const originalFsync = fs.fsyncSync.bind(fs);
    vi.spyOn(fs, "fsyncSync").mockImplementationOnce((fd) => {
      originalFsync(fd);
      fs.renameSync(approvalsDirectory, displacedApprovals);
      fs.symlinkSync(outsideApprovals, approvalsDirectory, "dir");
    });
    expect(() =>
      materializeResearchApproval({
        root: approvalFixture.root,
        headSeq: approval.headSeq,
        approval: approval.approval,
        recovery: "retry approval replacement",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(
      fs.existsSync(path.join(outsideApprovals, path.basename(approvalPath))),
    ).toBe(false);
    expect(fs.readdirSync(outsideApprovals)).toEqual([]);
    vi.restoreAllMocks();

    const symlinkFixture = await createResearchDispatchFixture(
      path.join(sandbox, "parent-symlink-before-start"),
    );
    const symlinkState = await readResearchState(symlinkFixture.root);
    const symlinkActivationId =
      symlinkState.activationByDispatchId[symlinkFixture.ids.dispatchId];
    if (!symlinkActivationId) throw new Error("Expected symlink activation ID");
    const symlinkActivation = symlinkState.activations[symlinkActivationId];
    if (!symlinkActivation) throw new Error("Expected symlink activation");
    const symlinkDirectory = path.join(
      symlinkFixture.root,
      ".trellis",
      "research",
      "dispatches",
      symlinkFixture.ids.dispatchId,
    );
    const displacedSymlinkDirectory = `${symlinkDirectory}-displaced`;
    const outsideSymlinkDirectory = path.join(sandbox, "outside-parent-symlink");
    fs.renameSync(symlinkDirectory, displacedSymlinkDirectory);
    fs.mkdirSync(outsideSymlinkDirectory, { recursive: true });
    fs.symlinkSync(outsideSymlinkDirectory, symlinkDirectory, "dir");
    expect(() =>
      materializeResearchActivation({
        root: symlinkFixture.root,
        headSeq: symlinkState.projectedThroughSeq,
        activation: symlinkActivation,
        recovery: "retry parent symlink",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.readdirSync(outsideSymlinkDirectory)).toEqual([]);

    const boundaryFixture = await createResearchDispatchFixture(
      path.join(sandbox, "parent-link-boundary"),
    );
    const boundaryState = await readResearchState(boundaryFixture.root);
    const boundaryActivationId =
      boundaryState.activationByDispatchId[boundaryFixture.ids.dispatchId];
    if (!boundaryActivationId) throw new Error("Expected boundary activation ID");
    const boundaryActivation = boundaryState.activations[boundaryActivationId];
    if (!boundaryActivation) throw new Error("Expected boundary activation");
    const boundaryDirectory = path.join(
      boundaryFixture.root,
      ".trellis",
      "research",
      "dispatches",
      boundaryFixture.ids.dispatchId,
    );
    fs.rmSync(path.join(boundaryDirectory, "activation.json"));
    const displacedBoundaryDirectory = `${boundaryDirectory}-displaced`;
    const outsideBoundaryDirectory = path.join(sandbox, "outside-link-boundary");
    fs.mkdirSync(outsideBoundaryDirectory, { recursive: true });
    const originalLink = fs.linkSync.bind(fs);
    vi.spyOn(fs, "linkSync").mockImplementationOnce(((source, destination) => {
      fs.renameSync(boundaryDirectory, displacedBoundaryDirectory);
      fs.symlinkSync(outsideBoundaryDirectory, boundaryDirectory, "dir");
      originalLink(source, destination);
    }) as typeof fs.linkSync);
    expect(() =>
      materializeResearchActivation({
        root: boundaryFixture.root,
        headSeq: boundaryState.projectedThroughSeq,
        activation: boundaryActivation,
        recovery: "retry link boundary",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.readdirSync(outsideBoundaryDirectory)).toEqual([]);
  }, 30_000);

  it("preserves concurrent targets and unrelated staging replacements at publication boundaries", async () => {
    const winnerFixture = await createResearchDispatchFixture(
      path.join(sandbox, "equivalent-winner"),
    );
    const winnerState = await readResearchState(winnerFixture.root);
    const winnerActivationId =
      winnerState.activationByDispatchId[winnerFixture.ids.dispatchId];
    if (!winnerActivationId) throw new Error("Expected winner activation ID");
    const winnerActivation = winnerState.activations[winnerActivationId];
    if (!winnerActivation) throw new Error("Expected winner activation");
    const winnerPath = path.join(
      winnerFixture.root,
      ".trellis",
      "research",
      "dispatches",
      winnerFixture.ids.dispatchId,
      "activation.json",
    );
    fs.rmSync(winnerPath);
    const expectedWinner = stableResearchJson({
      schemaVersion: 2,
      activation: winnerActivation,
    });
    vi.spyOn(fs, "linkSync").mockImplementationOnce(() => {
      fs.writeFileSync(winnerPath, expectedWinner, { flag: "wx" });
      const error = new Error("equivalent concurrent winner") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });
    expect(
      materializeResearchActivation({
        root: winnerFixture.root,
        headSeq: winnerState.projectedThroughSeq,
        activation: winnerActivation,
        recovery: "retry equivalent winner",
      }),
    ).toMatch(/activation\.json$/);
    expect(fs.readFileSync(winnerPath, "utf8")).toBe(expectedWinner);
    vi.restoreAllMocks();

    const invalidFixture = await createResearchDispatchFixture(
      path.join(sandbox, "invalid-winner"),
    );
    const invalidState = await readResearchState(invalidFixture.root);
    const invalidActivationId =
      invalidState.activationByDispatchId[invalidFixture.ids.dispatchId];
    if (!invalidActivationId) throw new Error("Expected invalid activation ID");
    const invalidActivation = invalidState.activations[invalidActivationId];
    if (!invalidActivation) throw new Error("Expected invalid activation");
    const invalidPath = path.join(
      invalidFixture.root,
      ".trellis",
      "research",
      "dispatches",
      invalidFixture.ids.dispatchId,
      "activation.json",
    );
    fs.rmSync(invalidPath);
    vi.spyOn(fs, "linkSync").mockImplementationOnce(() => {
      fs.writeFileSync(invalidPath, "unrelated winner\n", { flag: "wx" });
      const error = new Error("invalid concurrent winner") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      throw error;
    });
    expect(() =>
      materializeResearchActivation({
        root: invalidFixture.root,
        headSeq: invalidState.projectedThroughSeq,
        activation: invalidActivation,
        recovery: "retry invalid winner",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.readFileSync(invalidPath, "utf8")).toBe(
      "unrelated winner\n",
    );
    vi.restoreAllMocks();

    const stageFixture = await createResearchDispatchFixture(
      path.join(sandbox, "stage-replacement"),
    );
    const stageState = await readResearchState(stageFixture.root);
    const stageActivationId =
      stageState.activationByDispatchId[stageFixture.ids.dispatchId];
    if (!stageActivationId) throw new Error("Expected stage activation ID");
    const stageActivation = stageState.activations[stageActivationId];
    if (!stageActivation) throw new Error("Expected stage activation");
    const stageTarget = path.join(
      stageFixture.root,
      ".trellis",
      "research",
      "dispatches",
      stageFixture.ids.dispatchId,
      "activation.json",
    );
    fs.rmSync(stageTarget);
    const unrelatedStage = path.join(sandbox, "unrelated-stage");
    const unrelatedBytes = "unrelated stage replacement\n";
    fs.writeFileSync(unrelatedStage, unrelatedBytes);
    let capturedStage: string | undefined;
    vi.spyOn(fs, "linkSync").mockImplementationOnce(((source) => {
      capturedStage = source.toString();
      fs.rmSync(capturedStage);
      fs.renameSync(unrelatedStage, capturedStage);
      const error = new Error("publication failed") as NodeJS.ErrnoException;
      error.code = "EIO";
      throw error;
    }) as typeof fs.linkSync);
    expect(() =>
      materializeResearchActivation({
        root: stageFixture.root,
        headSeq: stageState.projectedThroughSeq,
        activation: stageActivation,
        recovery: "retry stage replacement",
      }),
    ).toThrow(ResearchDispatchFileError);
    if (!capturedStage) throw new Error("Expected captured stage path");
    expect(fs.readFileSync(capturedStage, "utf8")).toBe(unrelatedBytes);
    expect(fs.existsSync(stageTarget)).toBe(false);
    vi.restoreAllMocks();

    const vanishedFixture = await createResearchDispatchFixture(
      path.join(sandbox, "vanished-stage"),
    );
    const vanishedState = await readResearchState(vanishedFixture.root);
    const vanishedActivationId =
      vanishedState.activationByDispatchId[vanishedFixture.ids.dispatchId];
    if (!vanishedActivationId) throw new Error("Expected vanished activation ID");
    const vanishedActivation = vanishedState.activations[vanishedActivationId];
    if (!vanishedActivation) throw new Error("Expected vanished activation");
    const vanishedTarget = path.join(
      vanishedFixture.root,
      ".trellis",
      "research",
      "dispatches",
      vanishedFixture.ids.dispatchId,
      "activation.json",
    );
    fs.rmSync(vanishedTarget);
    const originalLink = fs.linkSync.bind(fs);
    vi.spyOn(fs, "linkSync").mockImplementationOnce(((source, destination) => {
      originalLink(source, destination);
      fs.rmSync(source);
    }) as typeof fs.linkSync);
    expect(
      materializeResearchActivation({
        root: vanishedFixture.root,
        headSeq: vanishedState.projectedThroughSeq,
        activation: vanishedActivation,
        recovery: "retry vanished stage",
      }),
    ).toMatch(/activation\.json$/);
    expect(JSON.parse(fs.readFileSync(vanishedTarget, "utf8"))).toMatchObject({
      activation: vanishedActivation,
    });
  }, 120_000);

  it("detects target replacement before and after atomic replacement without rollback", async () => {
    const beforeFixture = await createResearchDispatchFixture(
      path.join(sandbox, "target-before"),
    );
    const beforeState = await readResearchState(beforeFixture.root);
    const beforeActivationId =
      beforeState.activationByDispatchId[beforeFixture.ids.dispatchId];
    if (!beforeActivationId) throw new Error("Expected before activation ID");
    const beforeActivation = beforeState.activations[beforeActivationId];
    if (!beforeActivation) throw new Error("Expected before activation");
    const beforeTarget = path.join(
      beforeFixture.root,
      ".trellis",
      "research",
      "dispatches",
      beforeFixture.ids.dispatchId,
      "activation.json",
    );
    vi.spyOn(fs, "renameSync").mockImplementationOnce(() => {
      fs.rmSync(beforeTarget);
      fs.writeFileSync(beforeTarget, "replacement before publication\n");
      const error = new Error("publication interrupted") as NodeJS.ErrnoException;
      error.code = "EIO";
      throw error;
    });
    expect(() =>
      materializeResearchActivation({
        root: beforeFixture.root,
        headSeq: beforeState.projectedThroughSeq,
        activation: beforeActivation,
        recovery: "retry target-before",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.readFileSync(beforeTarget, "utf8")).toBe(
      "replacement before publication\n",
    );
    vi.restoreAllMocks();

    const afterFixture = await createResearchDispatchFixture(
      path.join(sandbox, "target-after"),
    );
    const afterState = await readResearchState(afterFixture.root);
    const afterActivationId =
      afterState.activationByDispatchId[afterFixture.ids.dispatchId];
    if (!afterActivationId) throw new Error("Expected after activation ID");
    const afterActivation = afterState.activations[afterActivationId];
    if (!afterActivation) throw new Error("Expected after activation");
    const afterTarget = path.join(
      afterFixture.root,
      ".trellis",
      "research",
      "dispatches",
      afterFixture.ids.dispatchId,
      "activation.json",
    );
    const originalRename = fs.renameSync.bind(fs);
    vi.spyOn(fs, "renameSync").mockImplementationOnce((source, destination) => {
      originalRename(source, destination);
      fs.rmSync(afterTarget);
      fs.writeFileSync(afterTarget, "replacement after publication\n");
    });
    expect(() =>
      materializeResearchActivation({
        root: afterFixture.root,
        headSeq: afterState.projectedThroughSeq,
        activation: afterActivation,
        recovery: "retry target-after",
      }),
    ).toThrow(ResearchDispatchFileError);
    expect(fs.readFileSync(afterTarget, "utf8")).toBe(
      "replacement after publication\n",
    );
  }, 30_000);

  it("atomically replaces a granted approval with complete revoked JSON", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
      idempotencyKey: "atomic-revoke-grant",
    });
    const approvalPath = path.join(fixture.root, granted.approvalFile ?? "");
    const originalRename = fs.renameSync.bind(fs);
    let beforePublication: unknown;
    let afterPublication: unknown;
    vi.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
      const destinationPath = destination.toString();
      if (destinationPath === approvalPath) {
        beforePublication = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
      }
      originalRename(source, destination);
      if (destinationPath === approvalPath) {
        afterPublication = JSON.parse(fs.readFileSync(approvalPath, "utf8"));
      }
    });
    const revoked = await revokeResearchApproval({
      root: fixture.root,
      approvalId: granted.approval.grant.id,
      reason: "Atomic replacement test",
      idempotencyKey: "atomic-revoke",
    });
    expect(beforePublication).toMatchObject({
      approval: { status: "granted" },
    });
    expect(afterPublication).toMatchObject({
      approval: { status: "revoked" },
    });
    expect(JSON.parse(fs.readFileSync(approvalPath, "utf8"))).toEqual({
      approval: revoked.approval,
      schemaVersion: 2,
    });
  });
});

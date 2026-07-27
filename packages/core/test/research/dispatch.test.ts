import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  commitResearchBatch,
  createActivationId,
  createApprovalId,
  createCampaignId,
  createDecisionId,
  createDispatchId,
  createProposalId,
  createQuestId,
  createRepositoryId,
  createResultId,
  createRunId,
  createWorkspaceId,
  proposalOperationsToMutations,
  readResearchLedger,
} from "../../src/research/index.js";

const ACTOR = { type: "agent" as const, id: "test" };
const PROVENANCE = { source: "test" };
const NOW = "2026-07-17T00:00:00.000Z";

describe("proposal operation mapping", () => {
  it("maps only supported typed operations to research mutations", () => {
    const questId = createQuestId();
    const runId = createRunId();
    expect(
      proposalOperationsToMutations([
        { kind: "quest.stage", questId, stage: "audit" },
        { kind: "run.invalidate", runId, reason: "bad input" },
      ]),
    ).toEqual([
      { kind: "quest.stage", questId, stage: "audit" },
      { kind: "run.invalidate", runId, reason: "bad input" },
    ]);
  });
});

describe("dispatch reducer legality", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-dispatch-core-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("validates dispatch hierarchy and finalizes a proposal once", async () => {
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    const repositoryId = createRepositoryId();
    const dispatchId = createDispatchId();
    const activationId = createActivationId();
    const approvalId = createApprovalId();
    const proposalId = createProposalId();
    const digest = `sha256:${"a".repeat(64)}`;
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "setup",
      timestamp: NOW,
      mutations: [
        {
          kind: "workspace.create",
          workspace: {
            id: createWorkspaceId(),
            name: "Research",
            description: "",
          },
        },
        {
          kind: "repository.register",
          repository: {
            id: repositoryId,
            name: "child",
            kind: "code",
            locator: "child",
            capabilities: { hasTrellis: false },
          },
        },
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Quest",
            description: "",
            repositoryIds: [repositoryId],
            artifactRefs: [],
          },
        },
        {
          kind: "campaign.create",
          campaign: {
            id: campaignId,
            questId,
            title: "Campaign",
            protocolDigest: "protocol-v1",
          },
        },
        {
          kind: "run.create",
          run: { id: runId, campaignId, title: "Run" },
        },
        {
          kind: "dispatch.record",
          dispatch: {
            id: dispatchId,
            questId,
            campaignId,
            runId,
            repositoryId,
            ownerSkill: "runner",
            objective: "Run checks",
            acceptanceCriteria: [],
            context: [],
            allowedWritePaths: ["results/output.json"],
            expectedOutputs: [],
            checks: [],
            createdAt: NOW,
          },
        },
        {
          kind: "activation.plan",
          activation: {
            id: activationId,
            dispatchId,
            questId,
            capabilityId: "research.audit.case",
            mode: "explicit",
            procedure: {
              id: "audit-case-v1",
              version: "1.0.0",
              digest,
            },
            policyDigest: digest,
            requestDigest: digest,
            scopeHash: digest,
            maxDurationMinutes: 10,
            maxDispatches: 1,
            createdAt: NOW,
          },
        },
        {
          kind: "approval.grant",
          approval: {
            id: approvalId,
            activationId,
            dispatchId,
            host: "claude",
            mode: "interactive",
            approverLabel: "test",
            rationale: "Approved for reducer test",
            requestDigest: digest,
            procedureDigest: digest,
            policyDigest: digest,
            scopeHash: digest,
            grantedAt: NOW,
            expiresAt: "2026-07-17T00:10:00.000Z",
          },
        },
      ],
    });

    const result = {
      id: createResultId(),
      dispatchId,
      runId,
      status: "completed" as const,
      summary: "Completed",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt: NOW,
    };
    const proposal = {
      id: proposalId,
      dispatchId,
      questId,
      title: "Advance",
      operations: [{ kind: "quest.stage" as const, questId, stage: "audit" as const }],
      status: "pending" as const,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const beforeIncompleteResult = await readResearchLedger(root);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "result-without-proposal",
        timestamp: NOW,
        mutations: [{ kind: "result.record", result }],
      }),
    ).rejects.toThrow(/recorded together/);
    expect(await readResearchLedger(root)).toEqual(beforeIncompleteResult);

    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "result-and-proposal",
      timestamp: NOW,
      mutations: [
        { kind: "result.record", result },
        { kind: "proposal.record", proposal },
        {
          kind: "approval.consume",
          approvalId,
          resultId: result.id,
          proposalId,
        },
      ],
    });

    const beforeMismatchedDecision = await readResearchLedger(root);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "mismatched-decision",
        timestamp: NOW,
        mutations: [
          { kind: "quest.stage", questId, stage: "writing" },
          {
            kind: "decision.record",
            decision: {
              id: createDecisionId(),
              proposalId,
              outcome: "accept",
              selectedOperationIndexes: [0],
              rationale: "Wrong operation",
              reviewer: "test",
              createdAt: NOW,
            },
          },
        ],
      }),
    ).rejects.toThrow(/exactly the selected Proposal mutations/);
    expect(await readResearchLedger(root)).toEqual(beforeMismatchedDecision);

    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "accepted-decision",
      timestamp: NOW,
      mutations: [
        { kind: "quest.stage", questId, stage: "audit" },
        {
          kind: "decision.record",
          decision: {
            id: createDecisionId(),
            proposalId,
            outcome: "accept",
            selectedOperationIndexes: [0],
            rationale: "Approved",
            reviewer: "test",
            createdAt: NOW,
          },
        },
      ],
    });

    const before = await readResearchLedger(root);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "second-decision",
        timestamp: NOW,
        mutations: [
          {
            kind: "decision.record",
            decision: {
              id: createDecisionId(),
              proposalId,
              outcome: "reject",
              selectedOperationIndexes: [],
              rationale: "Changed mind",
              reviewer: "test",
              createdAt: NOW,
            },
          },
        ],
      }),
    ).rejects.toThrow(/already has a decision/);
    expect(await readResearchLedger(root)).toEqual(before);
  });

  it("rejects a dispatch whose quest does not match its run campaign", async () => {
    const firstQuest = createQuestId();
    const secondQuest = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    const repositoryId = createRepositoryId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "invalid-setup",
      timestamp: NOW,
      mutations: [
        {
          kind: "workspace.create",
          workspace: {
            id: createWorkspaceId(),
            name: "Research",
            description: "",
          },
        },
        {
          kind: "repository.register",
          repository: {
            id: repositoryId,
            name: "child",
            kind: "code",
            locator: "child",
            capabilities: { hasTrellis: false },
          },
        },
        ...[firstQuest, secondQuest].map((id) => ({
          kind: "quest.create" as const,
          quest: {
            id,
            title: id,
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        })),
        {
          kind: "campaign.create",
          campaign: {
            id: campaignId,
            questId: firstQuest,
            title: "Campaign",
            protocolDigest: "protocol-v1",
          },
        },
        { kind: "run.create", run: { id: runId, campaignId, title: "Run" } },
      ],
    });
    const before = await readResearchLedger(root);

    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "invalid-dispatch",
        timestamp: NOW,
        mutations: [
          {
            kind: "dispatch.record",
            dispatch: {
              id: createDispatchId(),
              questId: secondQuest,
              runId,
              repositoryId,
              ownerSkill: "runner",
              objective: "Run checks",
              acceptanceCriteria: [],
              context: [],
              allowedWritePaths: ["results/output.json"],
              expectedOutputs: [],
              checks: [],
              createdAt: NOW,
            },
          },
        ],
      }),
    ).rejects.toThrow(/does not match run campaign quest/);
    expect(await readResearchLedger(root)).toEqual(before);
  });
});

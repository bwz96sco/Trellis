import {
  createCampaignId,
  createDispatchId,
  createQuestId,
  createRepositoryId,
  createRunId,
  emptyResearchState,
  type Dispatch,
  type ResearchState,
} from "@mindfoldhq/trellis-core/research";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readResearchStateMock } = vi.hoisted(() => ({
  readResearchStateMock: vi.fn(),
}));

vi.mock("@mindfoldhq/trellis-core/research", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@mindfoldhq/trellis-core/research")>();
  return { ...actual, readResearchState: readResearchStateMock };
});

import { resolveDispatchActivationCandidate } from "../../src/commands/research/dispatch-authority.js";

interface HierarchyFixture {
  readonly state: ResearchState;
  readonly dispatch: Dispatch;
}

function hierarchyFixture(candidate: boolean): HierarchyFixture {
  const repositoryId = createRepositoryId();
  const questId = createQuestId();
  const campaignId = createCampaignId();
  const runId = createRunId();
  const dispatchId = createDispatchId();
  const timestamp = "2026-07-24T00:00:00.000Z";
  const state = emptyResearchState();
  state.repositories[repositoryId] = {
    id: repositoryId,
    name: "Repository",
    kind: "code",
    locator: "repository",
    capabilities: { hasTrellis: false },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.quests[questId] = {
    id: questId,
    title: "Quest",
    description: "",
    status: "active",
    stage: "literature",
    repositoryIds: [repositoryId],
    artifactRefs: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.campaigns[campaignId] = {
    id: campaignId,
    questId,
    title: "Campaign",
    status: "draft",
    protocolDigest: "protocol-v1",
    runIds: [runId],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.runs[runId] = {
    id: runId,
    campaignId,
    title: "Run",
    status: "planned",
    ...(candidate ? {} : { dispatchId }),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return {
    state,
    dispatch: {
      id: dispatchId,
      questId,
      campaignId,
      runId,
      repositoryId,
      ownerSkill: "opaque-owner",
      objective: "Validate hierarchy",
      acceptanceCriteria: [],
      context: [],
      allowedWritePaths: [],
      expectedOutputs: [],
      checks: [],
      createdAt: timestamp,
    },
  };
}

async function expectHierarchyFailure(input: {
  readonly fixture: HierarchyFixture;
  readonly candidate: boolean;
  readonly code: string;
  readonly message: string;
}): Promise<void> {
  readResearchStateMock.mockResolvedValueOnce(input.fixture.state);
  await expect(
    resolveDispatchActivationCandidate({
      root: "/unused",
      dispatch: input.fixture.dispatch,
      capabilityId: "unknown-capability",
      candidate: input.candidate,
    }),
  ).rejects.toMatchObject({ code: input.code, message: input.message });
}

describe("Research activation hierarchy validation", () => {
  beforeEach(() => {
    readResearchStateMock.mockReset();
  });

  it("enforces exact earlier-failure order, codes, and messages", async () => {
    const missingQuest = hierarchyFixture(true);
    Reflect.deleteProperty(
      missingQuest.state.quests,
      missingQuest.dispatch.questId,
    );
    await expectHierarchyFailure({
      fixture: missingQuest,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Dispatch Quest does not exist",
    });

    const inactiveQuest = hierarchyFixture(true);
    const inactive = inactiveQuest.state.quests[inactiveQuest.dispatch.questId];
    if (!inactive) throw new Error("Expected Quest fixture");
    inactive.status = "paused";
    Reflect.deleteProperty(
      inactiveQuest.state.runs,
      inactiveQuest.dispatch.runId,
    );
    await expectHierarchyFailure({
      fixture: inactiveQuest,
      candidate: true,
      code: "QUEST_NOT_DISPATCHABLE",
      message: "Dispatch Quest must be active",
    });

    const missingRun = hierarchyFixture(true);
    Reflect.deleteProperty(
      missingRun.state.runs,
      missingRun.dispatch.runId,
    );
    await expectHierarchyFailure({
      fixture: missingRun,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Dispatch Run must be planned or running",
    });

    const terminalRun = hierarchyFixture(true);
    const terminal = terminalRun.state.runs[terminalRun.dispatch.runId];
    if (!terminal) throw new Error("Expected Run fixture");
    terminal.status = "succeeded";
    Reflect.deleteProperty(
      terminalRun.state.campaigns,
      terminal.campaignId,
    );
    await expectHierarchyFailure({
      fixture: terminalRun,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Dispatch Run must be planned or running",
    });

    const existingMismatch = hierarchyFixture(false);
    const existingRun = existingMismatch.state.runs[existingMismatch.dispatch.runId];
    if (!existingRun) throw new Error("Expected Run fixture");
    existingRun.dispatchId = createDispatchId();
    Reflect.deleteProperty(
      existingMismatch.state.campaigns,
      existingRun.campaignId,
    );
    await expectHierarchyFailure({
      fixture: existingMismatch,
      candidate: false,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Run Dispatch identity does not match",
    });

    const claimedCandidate = hierarchyFixture(true);
    const claimedRun = claimedCandidate.state.runs[claimedCandidate.dispatch.runId];
    if (!claimedRun) throw new Error("Expected Run fixture");
    claimedRun.dispatchId = createDispatchId();
    Reflect.deleteProperty(
      claimedCandidate.state.campaigns,
      claimedRun.campaignId,
    );
    await expectHierarchyFailure({
      fixture: claimedCandidate,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: `Run '${claimedRun.id}' already has a Dispatch`,
    });

    const missingCampaign = hierarchyFixture(true);
    const missingCampaignRun =
      missingCampaign.state.runs[missingCampaign.dispatch.runId];
    if (!missingCampaignRun) throw new Error("Expected Run fixture");
    Reflect.deleteProperty(
      missingCampaign.state.campaigns,
      missingCampaignRun.campaignId,
    );
    await expectHierarchyFailure({
      fixture: missingCampaign,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Run Campaign does not belong to the Dispatch Quest",
    });

    const wrongQuestCampaign = hierarchyFixture(true);
    const wrongQuestRun =
      wrongQuestCampaign.state.runs[wrongQuestCampaign.dispatch.runId];
    if (!wrongQuestRun) throw new Error("Expected Run fixture");
    const campaign = wrongQuestCampaign.state.campaigns[wrongQuestRun.campaignId];
    if (!campaign) throw new Error("Expected Campaign fixture");
    campaign.questId = createQuestId();
    campaign.runIds = [];
    await expectHierarchyFailure({
      fixture: wrongQuestCampaign,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Run Campaign does not belong to the Dispatch Quest",
    });

    const unregisteredRun = hierarchyFixture(true);
    const unregistered = unregisteredRun.state.runs[unregisteredRun.dispatch.runId];
    if (!unregistered) throw new Error("Expected Run fixture");
    const unregisteredCampaign =
      unregisteredRun.state.campaigns[unregistered.campaignId];
    if (!unregisteredCampaign) throw new Error("Expected Campaign fixture");
    unregisteredCampaign.runIds = [];
    unregisteredRun.dispatch.campaignId = createCampaignId();
    await expectHierarchyFailure({
      fixture: unregisteredRun,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Run is not registered in its Campaign",
    });

    const campaignMismatch = hierarchyFixture(true);
    campaignMismatch.dispatch.campaignId = createCampaignId();
    Reflect.deleteProperty(
      campaignMismatch.state.repositories,
      campaignMismatch.dispatch.repositoryId,
    );
    await expectHierarchyFailure({
      fixture: campaignMismatch,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Dispatch Campaign does not match the Run Campaign",
    });

    const missingRepository = hierarchyFixture(true);
    Reflect.deleteProperty(
      missingRepository.state.repositories,
      missingRepository.dispatch.repositoryId,
    );
    await expectHierarchyFailure({
      fixture: missingRepository,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Target Repository is not associated with the Dispatch Quest",
    });

    const unassociatedRepository = hierarchyFixture(true);
    const quest =
      unassociatedRepository.state.quests[unassociatedRepository.dispatch.questId];
    if (!quest) throw new Error("Expected Quest fixture");
    quest.repositoryIds = [];
    await expectHierarchyFailure({
      fixture: unassociatedRepository,
      candidate: true,
      code: "DISPATCH_HIERARCHY_INVALID",
      message: "Target Repository is not associated with the Dispatch Quest",
    });
  });

  it("accepts candidate and existing Run bindings and an omitted Dispatch Campaign", async () => {
    for (const candidate of [true, false]) {
      const fixture = hierarchyFixture(candidate);
      delete fixture.dispatch.campaignId;
      readResearchStateMock.mockResolvedValueOnce(fixture.state);
      await expect(
        resolveDispatchActivationCandidate({
          root: "/unused",
          dispatch: fixture.dispatch,
          capabilityId: "unknown-capability",
          candidate,
        }),
      ).rejects.toMatchObject({ code: "UNKNOWN_CAPABILITY" });
    }
  });
});

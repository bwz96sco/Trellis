import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  commitResearchBatch,
  createArtifactId,
  createQuestId,
  createRepositoryId,
  createWorkflowInstanceId,
  createWorkspaceId,
  parseResearchEvent,
  parseResearchWorkflowDefinitionV1,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  ResearchWorkflowError,
  validateResearchBatchReadOnly,
  type QuestId,
  type ResearchMutation,
} from "../../src/research/index.js";

const ACTOR = { type: "agent" as const, id: "test" };
const PROVENANCE = { source: "test" };
const encoder = new TextEncoder();
const identity = {
  id: "research-one",
  version: "1.0.0",
  schemaVersion: 3,
  packageKind: "skill",
  packageDigest: `sha256:${"1".repeat(64)}`,
  instructionDigest: `sha256:${"2".repeat(64)}`,
  memberInventoryDigest: `sha256:${"3".repeat(64)}`,
} as const;

function workflow(requiredGateIds: readonly ("H1" | "H2")[] = []) {
  return parseResearchWorkflowDefinitionV1(
    encoder.encode(
      JSON.stringify({
        schemaVersion: 1,
        id: "review-flow",
        version: "1.0.0",
        startNodeIds: ["one"],
        nodes: [
          {
            id: "one",
            executionPackage: identity,
            allowedProfiles: ["lightweight"],
            stop: true,
          },
          {
            id: "two",
            executionPackage: { ...identity, id: "research-two" },
            allowedProfiles: ["lightweight"],
            stop: true,
          },
        ],
        transitions: [
          {
            id: "advance",
            fromNodeId: "one",
            toNodeId: "two",
            requiredRefs: [],
            requiredGateIds,
          },
        ],
      }),
    ),
  );
}

function snapshot(root: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const walk = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else files.set(path.relative(root, target), fs.readFileSync(target));
    }
  };
  walk(root);
  return files;
}

describe("Research Workflow store and replay", () => {
  let root: string;
  let questId: QuestId;
  let artifactId: ReturnType<typeof createArtifactId>;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-workflow-store-"));
    const workspaceId = createWorkspaceId();
    const repositoryId = createRepositoryId();
    questId = createQuestId();
    artifactId = createArtifactId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "setup",
      timestamp: "2026-08-21T00:00:00.000Z",
      mutations: [
        {
          kind: "workspace.create",
          workspace: { id: workspaceId, name: "Research", description: "" },
        },
        {
          kind: "repository.register",
          repository: {
            id: repositoryId,
            name: "Repository",
            kind: "code",
            locator: "repository",
            capabilities: { hasTrellis: false },
          },
        },
        {
          kind: "artifact.register",
          artifact: {
            id: artifactId,
            repositoryId,
            path: "results/review.json",
          },
        },
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Quest",
            description: "",
            repositoryIds: [repositoryId],
            artifactRefs: [
              {
                id: artifactId,
                repositoryId,
                path: "results/review.json",
              },
            ],
          },
        },
      ],
    });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  async function commit(
    idempotencyKey: string,
    timestamp: string,
    mutation: ResearchMutation,
  ) {
    return commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey,
      timestamp,
      mutations: [mutation],
    });
  }

  it("binds, completes, transitions, closes, replays, and rebuilds one deterministic projection", async () => {
    const definition = workflow();
    const workflowInstanceId = createWorkflowInstanceId();
    const bound = await commit("bind", "2026-08-21T00:01:00.000Z", {
      kind: "workflow.bind",
      workflowInstanceId,
      questId,
      startNodeId: "one",
      workflow: definition,
    });
    expect(bound.events).toHaveLength(1);
    expect(bound.events[0]).toMatchObject({
      schemaVersion: 3,
      kind: "workflow.bound",
      aggregate: { type: "workflow", id: workflowInstanceId },
      related: [{ type: "quest", id: questId }],
    });
    const extraPayload = JSON.parse(JSON.stringify(bound.events[0])) as {
      payload: Record<string, unknown>;
    };
    extraPayload.payload.extra = true;
    expect(() => parseResearchEvent(extraPayload)).toThrow(/not supported/);
    const missingQuestRelation = JSON.parse(JSON.stringify(bound.events[0])) as {
      related: unknown[];
    };
    missingQuestRelation.related = [];
    expect(() => parseResearchEvent(missingQuestRelation)).toThrow(/related/);

    await commit("complete-one", "2026-08-21T00:02:00.000Z", {
      kind: "workflow.node.complete",
      workflowInstanceId,
      nodeId: "one",
      acceptedRefs: [{ kind: "artifact", id: artifactId }],
      workflow: definition,
    });
    expect((await readResearchState(root)).workflowInstances[workflowInstanceId])
      .toMatchObject({ currentNodeId: "one", status: "active" });

    await commit("transition", "2026-08-21T00:03:00.000Z", {
      kind: "workflow.transition.record",
      workflowInstanceId,
      transitionId: "advance",
      selectedBy: "test",
      workflow: definition,
    });
    expect((await readResearchState(root)).workflowInstances[workflowInstanceId])
      .toMatchObject({ currentNodeId: "two", status: "active" });

    await commit("complete-two", "2026-08-21T00:04:00.000Z", {
      kind: "workflow.node.complete",
      workflowInstanceId,
      nodeId: "two",
      acceptedRefs: [{ kind: "artifact", id: artifactId }],
      workflow: definition,
    });
    await commit("close", "2026-08-21T00:05:00.000Z", {
      kind: "workflow.close",
      workflowInstanceId,
      outcome: "completed",
      closedBy: "test",
      rationale: "Terminal node accepted",
      workflow: definition,
    });

    const state = await readResearchState(root);
    expect(state.workflowInstances[workflowInstanceId]).toMatchObject({
      currentNodeId: "two",
      status: "completed",
      closure: { outcome: "completed" },
    });
    expect(state.activeWorkflowByQuestId[questId]).toBeUndefined();
    expect(state.workflowInstanceIdsByQuestId[questId]).toEqual([
      workflowInstanceId,
    ]);

    const projection = path.join(
      root,
      ".trellis",
      "research",
      "quests",
      questId,
      "workflow.json",
    );
    const before = fs.readFileSync(projection, "utf8");
    await rebuildResearchProjections(root);
    expect(fs.readFileSync(projection, "utf8")).toBe(before);
    expect(JSON.parse(before)).toMatchObject({
      schemaVersion: 1,
      data: {
        questId,
        activeWorkflowInstanceId: null,
        instances: [{ workflowInstanceId, status: "completed" }],
      },
    });
    expect((await readResearchLedger(root)).slice(-5).map((event) => event.schemaVersion))
      .toEqual([3, 3, 3, 3, 3]);
  });

  it("keeps read-only validation byte-identical and rejects a second active binding", async () => {
    const definition = workflow();
    const workflowInstanceId = createWorkflowInstanceId();
    await commit("bind", "2026-08-21T00:01:00.000Z", {
      kind: "workflow.bind",
      workflowInstanceId,
      questId,
      startNodeId: "one",
      workflow: definition,
    });
    const before = snapshot(root);
    await expect(
      validateResearchBatchReadOnly({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "conflict-preview",
        timestamp: "2026-08-21T00:02:00.000Z",
        mutations: [
          {
            kind: "workflow.bind",
            workflowInstanceId: createWorkflowInstanceId(),
            questId,
            startNodeId: "one",
            workflow: definition,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "RESEARCH_WORKFLOW_ACTIVE_CONFLICT" });
    expect(snapshot(root)).toEqual(before);
  });

  it("blocks every H1/H2 transition in C3 and completed closure before a completed terminal node", async () => {
    const definition = workflow(["H1"]);
    const workflowInstanceId = createWorkflowInstanceId();
    await commit("bind", "2026-08-21T00:01:00.000Z", {
      kind: "workflow.bind",
      workflowInstanceId,
      questId,
      startNodeId: "one",
      workflow: definition,
    });
    await commit("complete", "2026-08-21T00:02:00.000Z", {
      kind: "workflow.node.complete",
      workflowInstanceId,
      nodeId: "one",
      acceptedRefs: [{ kind: "artifact", id: artifactId }],
      workflow: definition,
    });
    await expect(
      commit("blocked-transition", "2026-08-21T00:03:00.000Z", {
        kind: "workflow.transition.record",
        workflowInstanceId,
        transitionId: "advance",
        selectedBy: "test",
        workflow: definition,
      }),
    ).rejects.toMatchObject({ code: "RESEARCH_WORKFLOW_TRANSITION_BLOCKED" });
    await expect(
      commit("early-close", "2026-08-21T00:03:00.000Z", {
        kind: "workflow.close",
        workflowInstanceId,
        outcome: "completed",
        closedBy: "test",
        rationale: "Too early",
        workflow: definition,
      }),
    ).rejects.toThrow(ResearchWorkflowError);
  });
});

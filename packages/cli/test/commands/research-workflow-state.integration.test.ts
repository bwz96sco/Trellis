import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  commitResearchBatch,
  createArtifactId,
  createQuestId,
  createRepositoryId,
  createWorkspaceId,
  readResearchLedger,
  type QuestId,
  type WorkflowInstanceId,
} from "@mindfoldhq/trellis-core/research";
import { InvalidArgumentError } from "commander";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  bindResearchWorkflow,
  closeResearchWorkflow,
  completeResearchWorkflowNode,
  getResearchWorkflowNext,
  getResearchWorkflowStatus,
  recordResearchWorkflowTransition,
} from "../../src/commands/research/workflow-command.js";

const ACTOR = { type: "agent" as const, id: "test" };
const PROVENANCE = { source: "test" };
const WORKFLOW_ID = "review-flow";
const VERSION = "1.0.0";
const identity = {
  id: "research-review",
  version: "1.0.0",
  schemaVersion: 3,
  packageKind: "skill",
  packageDigest: `sha256:${"1".repeat(64)}`,
  instructionDigest: `sha256:${"2".repeat(64)}`,
  memberInventoryDigest: `sha256:${"3".repeat(64)}`,
} as const;

function writeWorkflow(root: string): void {
  const directory = path.join(
    root,
    ".trellis",
    "research",
    "workflows",
    WORKFLOW_ID,
    VERSION,
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "workflow.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      id: WORKFLOW_ID,
      version: VERSION,
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
          executionPackage: { ...identity, id: "research-finish" },
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
          requiredGateIds: [],
        },
      ],
    })}\n`,
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

describe("research workflow CLI state commands", () => {
  let root: string;
  let questId: QuestId;
  let artifactRef: string;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-workflow-cli-"));
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    writeWorkflow(root);
    const workspaceId = createWorkspaceId();
    const repositoryId = createRepositoryId();
    questId = createQuestId();
    const artifactId = createArtifactId();
    artifactRef = `artifact:${artifactId}`;
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
          artifact: { id: artifactId, repositoryId, path: "result.json" },
        },
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Quest",
            description: "",
            repositoryIds: [repositoryId],
            artifactRefs: [
              { id: artifactId, repositoryId, path: "result.json" },
            ],
          },
        },
      ],
    });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("previews by default without writes and writes exactly one bind event only with --write", async () => {
    const before = snapshot(root);
    const preview = await bindResearchWorkflow({
      root,
      quest: questId,
      workflow: WORKFLOW_ID,
      version: VERSION,
      startNode: "one",
    });
    expect(preview).toMatchObject({ dryRun: true, replayed: false });
    expect(preview.events).toHaveLength(1);
    expect(preview.events[0]).toMatchObject({
      schemaVersion: 3,
      kind: "workflow.bound",
    });
    expect(snapshot(root)).toEqual(before);

    const written = await bindResearchWorkflow({
      root,
      quest: questId,
      workflow: WORKFLOW_ID,
      version: VERSION,
      startNode: "one",
      write: true,
      idempotencyKey: "workflow-bind",
    });
    expect(written).toMatchObject({ dryRun: false, replayed: false });
    expect(written.events).toHaveLength(1);
    await expect(
      bindResearchWorkflow({
        root,
        quest: questId,
        workflow: WORKFLOW_ID,
        version: "2.0.0",
        startNode: "one",
        write: true,
        idempotencyKey: "workflow-bind",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
    expect(await readResearchLedger(root)).toHaveLength(5);
  });

  it("reports status/next and requires explicit completion, transition, and closure writes", async () => {
    const bound = await bindResearchWorkflow({
      root,
      quest: questId,
      workflow: WORKFLOW_ID,
      version: VERSION,
      startNode: "one",
      write: true,
    });
    const workflowInstanceId = bound.events[0]?.aggregate.id as WorkflowInstanceId;
    expect(await getResearchWorkflowStatus({ root, quest: questId })).toMatchObject({
      state: "active",
      instance: { workflowInstanceId, currentNodeId: "one" },
      currentNode: { id: "one", completed: false, stop: true },
    });
    expect(await getResearchWorkflowNext({ root, quest: questId })).toMatchObject({
      stopReason: "current-node-incomplete",
      choices: [{ id: "advance", legal: false }],
    });

    const beforePreview = snapshot(root);
    const completionPreview = await completeResearchWorkflowNode({
      root,
      instance: workflowInstanceId,
      node: "one",
      acceptedRef: [artifactRef],
    });
    expect(completionPreview.dryRun).toBe(true);
    expect(snapshot(root)).toEqual(beforePreview);

    await completeResearchWorkflowNode({
      root,
      instance: workflowInstanceId,
      node: "one",
      acceptedRef: [artifactRef],
      write: true,
      idempotencyKey: "complete-one",
    });
    expect(await getResearchWorkflowNext({ root, quest: questId })).toMatchObject({
      stopReason: "operator-selection-required",
      choices: [{ id: "advance", legal: true }],
    });

    await recordResearchWorkflowTransition({
      root,
      instance: workflowInstanceId,
      transition: "advance",
      write: true,
    });
    expect(await getResearchWorkflowNext({ root, quest: questId })).toMatchObject({
      currentNodeId: "two",
      stopReason: "current-node-incomplete",
      choices: [],
    });

    await completeResearchWorkflowNode({
      root,
      instance: workflowInstanceId,
      node: "two",
      acceptedRef: [artifactRef],
      write: true,
    });
    expect(await getResearchWorkflowNext({ root, quest: questId })).toMatchObject({
      stopReason: "terminal-node",
    });
    await closeResearchWorkflow({
      root,
      instance: workflowInstanceId,
      outcome: "completed",
      rationale: "Accepted terminal output",
      write: true,
      idempotencyKey: "close-workflow",
    });
    const completionReplay = await completeResearchWorkflowNode({
      root,
      instance: workflowInstanceId,
      node: "one",
      acceptedRef: [artifactRef],
      write: true,
      idempotencyKey: "complete-one",
    });
    expect(completionReplay.replayed).toBe(true);
    const closeReplay = await closeResearchWorkflow({
      root,
      instance: workflowInstanceId,
      outcome: "completed",
      rationale: "Accepted terminal output",
      write: true,
      idempotencyKey: "close-workflow",
    });
    expect(closeReplay.replayed).toBe(true);
    expect(await getResearchWorkflowStatus({ root, quest: questId })).toMatchObject({
      state: "closed",
      instance: { workflowInstanceId, status: "completed" },
    });
    expect(await getResearchWorkflowNext({ root, quest: questId })).toMatchObject({
      stopReason: "instance-closed",
    });
  });

  it("rejects an idempotency key owned by another command without writes", async () => {
    const before = snapshot(root);
    await expect(
      bindResearchWorkflow({
        root,
        quest: questId,
        workflow: WORKFLOW_ID,
        version: VERSION,
        startNode: "one",
        write: true,
        idempotencyKey: "setup",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
    expect(snapshot(root)).toEqual(before);
  });

  it("rejects --dry-run with --write before resolving or constructing a mutation", async () => {
    const before = snapshot(root);
    await expect(
      bindResearchWorkflow({
        root,
        quest: questId,
        workflow: "does-not-exist",
        version: VERSION,
        startNode: "one",
        dryRun: true,
        write: true,
      }),
    ).rejects.toBeInstanceOf(InvalidArgumentError);
    expect(snapshot(root)).toEqual(before);
  });

  it("maps invalid completion and transition failures to stable lowercase codes without writes", async () => {
    const bound = await bindResearchWorkflow({
      root,
      quest: questId,
      workflow: WORKFLOW_ID,
      version: VERSION,
      startNode: "one",
      write: true,
    });
    const workflowInstanceId = bound.events[0]?.aggregate.id as WorkflowInstanceId;
    const before = snapshot(root);
    await expect(
      completeResearchWorkflowNode({
        root,
        instance: workflowInstanceId,
        node: "two",
        acceptedRef: [artifactRef],
        write: true,
      }),
    ).rejects.toMatchObject({
      code: "research_workflow_completion_invalid",
    });
    await expect(
      recordResearchWorkflowTransition({
        root,
        instance: workflowInstanceId,
        transition: "advance",
        write: true,
      }),
    ).rejects.toMatchObject({ code: "research_workflow_transition_blocked" });
    expect(snapshot(root)).toEqual(before);
  });
});

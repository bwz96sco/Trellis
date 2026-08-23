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
  type ArtifactId,
  type QuestId,
  type WorkflowInstanceId,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getResearchScientificGateStatus,
  recordResearchScientificGate,
} from "../../src/commands/research/gate-command.js";
import {
  bindResearchWorkflow,
  completeResearchWorkflowNode,
  getResearchWorkflowNext,
  recordResearchWorkflowTransition,
} from "../../src/commands/research/workflow-command.js";

const WORKFLOW_ID = "gate-flow";
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
          requiredGateIds: ["H2", "H1"],
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

describe("research scientific gate CLI", () => {
  let root: string;
  let questId: QuestId;
  let artifactId: ArtifactId;
  let workflowInstanceId: WorkflowInstanceId;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-gate-cli-"));
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    writeWorkflow(root);
    const repositoryId = createRepositoryId();
    questId = createQuestId();
    artifactId = createArtifactId();
    await commitResearchBatch({
      root,
      actor: { type: "agent", id: "test" },
      provenance: { source: "test" },
      idempotencyKey: "setup",
      timestamp: "2026-08-23T00:00:00.000Z",
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
            name: "Repository",
            kind: "code",
            locator: "repository",
            capabilities: { hasTrellis: false },
          },
        },
        {
          kind: "artifact.register",
          artifact: { id: artifactId, repositoryId, path: "review.json" },
        },
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Quest",
            description: "",
            repositoryIds: [repositoryId],
            artifactRefs: [
              { id: artifactId, repositoryId, path: "review.json" },
            ],
          },
        },
      ],
    });
    const bound = await bindResearchWorkflow({
      root,
      quest: questId,
      workflow: WORKFLOW_ID,
      version: VERSION,
      startNode: "one",
      write: true,
      idempotencyKey: "bind",
    });
    workflowInstanceId = bound.events[0]?.aggregate.id as WorkflowInstanceId;
    await completeResearchWorkflowNode({
      root,
      instance: workflowInstanceId,
      node: "one",
      acceptedRef: [`artifact:${artifactId}`],
      write: true,
      idempotencyKey: "complete",
    });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("previews with zero writes, applies latest decisions, and freezes H1/H2 IDs", async () => {
    const beforePreview = snapshot(root);
    const preview = await recordResearchScientificGate({
      root,
      instance: workflowInstanceId,
      gate: "H1",
      decision: "approve",
      actor: "reviewer",
      rationale: "accepted",
      approvedRef: ["candidate:one"],
      rejectedRef: [],
      evidenceRef: [artifactId],
    });
    expect(preview).toMatchObject({ state: "preview", dryRun: true });
    expect(snapshot(root)).toEqual(beforePreview);

    const h2 = await recordResearchScientificGate({
      root,
      instance: workflowInstanceId,
      gate: "H2",
      decision: "approve",
      actor: "reviewer",
      rationale: "audit accepted",
      approvedRef: ["audit:one"],
      rejectedRef: [],
      evidenceRef: [artifactId],
      sourceArtifact: artifactId,
      write: true,
      idempotencyKey: "approve-h2",
    });
    const rejectedH1 = await recordResearchScientificGate({
      root,
      instance: workflowInstanceId,
      gate: "H1",
      decision: "reject",
      actor: "reviewer",
      rationale: "revise",
      approvedRef: [],
      rejectedRef: ["candidate:one"],
      evidenceRef: [artifactId],
      write: true,
      idempotencyKey: "reject-h1",
    });
    expect(
      await getResearchWorkflowNext({ root, quest: questId }),
    ).toMatchObject({
      stopReason: "missing-gates",
      choices: [
        {
          legal: false,
          missingGateIds: ["H1"],
          satisfyingGateRecordIds: [h2.record.id],
        },
      ],
    });

    const approvedH1 = await recordResearchScientificGate({
      root,
      instance: workflowInstanceId,
      gate: "H1",
      decision: "approve",
      actor: " reviewer ",
      rationale: " revision accepted ",
      approvedRef: ["candidate:one"],
      rejectedRef: [],
      evidenceRef: [artifactId],
      write: true,
      idempotencyKey: "approve-h1",
    });
    const status = await getResearchScientificGateStatus({
      root,
      instance: workflowInstanceId,
    });
    expect(status).toMatchObject({
      declaredGateIds: ["H1", "H2"],
      currentNodeCompleted: true,
      history: [
        { id: h2.record.id },
        { id: rejectedH1.record.id },
        { id: approvedH1.record.id },
      ],
      effective: {
        H1: { id: approvedH1.record.id, actor: " reviewer " },
        H2: { id: h2.record.id },
      },
    });
    expect(
      await getResearchWorkflowNext({ root, quest: questId }),
    ).toMatchObject({
      stopReason: "operator-selection-required",
      choices: [
        {
          legal: true,
          missingGateIds: [],
          satisfyingGateRecordIds: [approvedH1.record.id, h2.record.id],
        },
      ],
    });

    const transition = await recordResearchWorkflowTransition({
      root,
      instance: workflowInstanceId,
      transition: "advance",
      write: true,
      idempotencyKey: "transition",
    });
    expect(transition.events[0]?.payload.gateRecordIds).toEqual([
      approvedH1.record.id,
      h2.record.id,
    ]);
    expect((await readResearchLedger(root)).at(-1)?.related).toEqual([
      { type: "quest", id: questId },
      { type: "scientific-gate", id: approvedH1.record.id },
      { type: "scientific-gate", id: h2.record.id },
    ]);
  });

  it("replays only an exact one-event owner and keeps status/errors zero-write", async () => {
    const written = await recordResearchScientificGate({
      root,
      instance: workflowInstanceId,
      gate: "H1",
      decision: "approve",
      actor: "reviewer",
      rationale: "accepted",
      approvedRef: ["candidate:one"],
      rejectedRef: [],
      evidenceRef: [artifactId],
      write: true,
      idempotencyKey: "same-key",
    });
    const before = snapshot(root);
    const replay = await recordResearchScientificGate({
      root,
      instance: workflowInstanceId,
      gate: "H1",
      decision: "approve",
      actor: "reviewer",
      rationale: "accepted",
      approvedRef: ["candidate:one"],
      rejectedRef: [],
      evidenceRef: [artifactId],
      write: true,
      idempotencyKey: "same-key",
    });
    expect(replay).toMatchObject({ state: "replayed", replayed: true });
    expect(replay.record.id).toBe(written.record.id);
    await getResearchScientificGateStatus({
      root,
      instance: workflowInstanceId,
    });
    await expect(
      recordResearchScientificGate({
        root,
        instance: workflowInstanceId,
        gate: "H2",
        decision: "approve",
        actor: "reviewer",
        rationale: "invalid empty selection",
        approvedRef: [],
        rejectedRef: [],
        evidenceRef: [artifactId],
        write: true,
        idempotencyKey: "empty-selection",
      }),
    ).rejects.toMatchObject({ code: "research_gate_invalid" });
    await expect(
      recordResearchScientificGate({
        root,
        instance: workflowInstanceId,
        gate: "H1",
        decision: "approve",
        actor: "   ",
        rationale: "accepted",
        approvedRef: ["candidate:one"],
        rejectedRef: [],
        evidenceRef: [artifactId],
        write: true,
        idempotencyKey: "blank-actor",
      }),
    ).rejects.toMatchObject({ code: "research_gate_invalid" });
    await expect(
      recordResearchScientificGate({
        root,
        instance: workflowInstanceId,
        gate: "H1",
        decision: "approve",
        actor: "reviewer",
        rationale: "   ",
        approvedRef: ["candidate:one"],
        rejectedRef: [],
        evidenceRef: [artifactId],
        write: true,
        idempotencyKey: "blank-rationale",
      }),
    ).rejects.toMatchObject({ code: "research_gate_invalid" });
    await expect(
      recordResearchScientificGate({
        root,
        instance: workflowInstanceId,
        gate: "H1",
        decision: "reject",
        actor: "reviewer",
        rationale: "accepted",
        approvedRef: ["candidate:one"],
        rejectedRef: [],
        evidenceRef: [artifactId],
        write: true,
        idempotencyKey: "same-key",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
    expect(snapshot(root)).toEqual(before);
  });
});

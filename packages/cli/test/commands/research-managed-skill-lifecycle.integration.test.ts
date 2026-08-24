import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createRunId,
  readResearchState,
  serializeResearchSkillManifestV3,
  type ResearchSkillManifestV3,
  type WorkflowInstanceId,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createResearchRun } from "../../src/commands/research/command.js";
import {
  authorizeResearchDispatch,
} from "../../src/commands/research/dispatch-activation-command.js";
import { resolveApprovedResearchDispatchContext } from "../../src/commands/research/dispatch-approved-context.js";
import {
  prepareResearchDispatch,
  recordApprovedResearchDispatchResult,
} from "../../src/commands/research/dispatch-command.js";
import { deriveResearchOutputIds } from "../../src/commands/research/dispatch-output-ids.js";
import { resolveResearchSkillExecutionPackage } from "../../src/commands/research/procedure-resolution.js";
import {
  bindResearchWorkflow,
  completeResearchWorkflowNode,
  recordResearchWorkflowTransition,
} from "../../src/commands/research/workflow-command.js";
import { createResearchDispatchFixture, snapshotTree } from "../fixtures/research-dispatch.js";

const SKILL_ID = "managed-literature";
const SKILL_VERSION = "1.0.0";
const WORKFLOW_ID = "managed-literature-flow";
const WORKFLOW_VERSION = "1.0.0";
const INSTRUCTIONS = "# Managed literature\nReturn only bounded findings.\n";
const MEMBERS = {
  "references/default.md": "default reference\n",
  "templates/note.md": "requested note template\n",
  "validators/root.txt": "root-only validator\n",
} as const;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function writeSkill(root: string): void {
  const manifest: ResearchSkillManifestV3 = {
    schemaVersion: 3,
    packageKind: "skill",
    id: SKILL_ID,
    version: SKILL_VERSION,
    skillKind: "bounded",
    invocationSource: "operator-explicit",
    entrypointType: "model-context",
    instructionFile: "SKILL.md",
    allowedProfiles: ["lightweight", "managed"],
    managedBinding: { capabilityId: "research.literature.scan" },
    members: [
      {
        path: "references/default.md",
        role: "reference",
        load: "default",
        visibility: "worker-visible",
        sha256: sha256(MEMBERS["references/default.md"]),
        maxBytes: 1_024,
      },
      {
        path: "templates/note.md",
        role: "template",
        load: "on-demand",
        visibility: "worker-visible",
        sha256: sha256(MEMBERS["templates/note.md"]),
        maxBytes: 1_024,
      },
      {
        path: "validators/root.txt",
        role: "validator",
        load: "on-demand",
        visibility: "root-only",
        sha256: sha256(MEMBERS["validators/root.txt"]),
        maxBytes: 1_024,
      },
    ],
  };
  const directory = path.join(
    root,
    ".trellis/research/skills",
    SKILL_ID,
    SKILL_VERSION,
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "skill.json"),
    serializeResearchSkillManifestV3(manifest),
  );
  fs.writeFileSync(path.join(directory, "SKILL.md"), INSTRUCTIONS);
  for (const member of manifest.members) {
    const target = path.join(directory, ...member.path.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, MEMBERS[member.path as keyof typeof MEMBERS]);
  }
}

async function writeWorkflow(root: string): Promise<void> {
  const skill = await resolveResearchSkillExecutionPackage({
    root,
    id: SKILL_ID,
    version: SKILL_VERSION,
    invocationSource: "operator-explicit",
    profile: "managed",
    audience: "worker",
    requestedMemberPaths: ["templates/note.md"],
  });
  const directory = path.join(
    root,
    ".trellis/research/workflows",
    WORKFLOW_ID,
    WORKFLOW_VERSION,
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "workflow.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      id: WORKFLOW_ID,
      version: WORKFLOW_VERSION,
      startNodeIds: ["review"],
      nodes: [
        {
          id: "review",
          executionPackage: skill.identity,
          allowedProfiles: ["managed"],
          stop: true,
        },
        {
          id: "finish",
          executionPackage: skill.identity,
          allowedProfiles: ["lightweight"],
          stop: true,
        },
      ],
      transitions: [
        {
          id: "accept-review",
          fromNodeId: "review",
          toNodeId: "finish",
          requiredRefs: [],
          requiredGateIds: [],
        },
      ],
    })}\n`,
  );
}

function outputPayload(input: {
  readonly approvalId: `apr_${string}`;
  readonly dispatchId: `dsp_${string}`;
  readonly runId: `run_${string}`;
  readonly questId: `qst_${string}`;
  readonly createdAt: string;
}): string {
  const ids = deriveResearchOutputIds(input.approvalId);
  return JSON.stringify({
    result: {
      id: ids.resultId,
      dispatchId: input.dispatchId,
      runId: input.runId,
      status: "completed",
      summary: "Managed Skill work complete",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt: input.createdAt,
    },
    proposal: {
      id: ids.proposalId,
      dispatchId: input.dispatchId,
      questId: input.questId,
      title: "Managed Skill proposal",
      operations: [],
      status: "pending",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    },
  });
}

describe("managed Research Skill lifecycle", { timeout: 30_000 }, () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-managed-skill-"));
  });

  afterEach(() => {
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("preserves exact package selection through Approval, Context, Result, completion, and separate transition", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
      stage: "literature",
    });
    writeSkill(fixture.root);
    await writeWorkflow(fixture.root);
    const bound = await bindResearchWorkflow({
      root: fixture.root,
      quest: fixture.ids.questId,
      workflow: WORKFLOW_ID,
      version: WORKFLOW_VERSION,
      startNode: "review",
      write: true,
      idempotencyKey: "managed-workflow-bind",
    });
    const workflowInstanceId = bound.events[0]?.aggregate.id as WorkflowInstanceId;
    const runId = createRunId();
    await createResearchRun({
      root: fixture.root,
      id: runId,
      campaignId: fixture.ids.campaignId,
      title: "Managed Skill run",
    });

    const prepared = await prepareResearchDispatch({
      root: fixture.root,
      runId,
      questId: fixture.ids.questId,
      campaignId: fixture.ids.campaignId,
      repositoryId: fixture.ids.repositoryId,
      ownerSkill: "compatibility-metadata-only",
      capabilityId: "research.literature.scan",
      skillId: SKILL_ID,
      skillVersion: SKILL_VERSION,
      memberPaths: ["templates/note.md"],
      workflowInstanceId,
      workflowNodeId: "review",
      objective: "Execute the exact managed Skill package",
      acceptanceCriteria: ["Return bounded findings"],
      allowedWritePaths: [],
      expectedOutputs: ["managed findings"],
      checks: [],
      idempotencyKey: "managed-prepare",
    });
    expect(prepared.activation).toMatchObject({
      executionPackage: {
        id: SKILL_ID,
        version: SKILL_VERSION,
        schemaVersion: 3,
        packageKind: "skill",
      },
      managedExecution: {
        executionProfile: "managed",
        requestedMemberPaths: ["templates/note.md"],
        workflow: { workflowInstanceId, nodeId: "review" },
      },
    });
    await expect(
      prepareResearchDispatch({
        root: fixture.root,
        runId,
        questId: fixture.ids.questId,
        campaignId: fixture.ids.campaignId,
        repositoryId: fixture.ids.repositoryId,
        ownerSkill: "ignored-on-replay",
        capabilityId: "research.setup.project",
        skillId: SKILL_ID,
        skillVersion: SKILL_VERSION,
        memberPaths: ["templates/note.md"],
        workflowInstanceId,
        workflowNodeId: "review",
        objective: "ignored-on-replay",
        acceptanceCriteria: [],
        allowedWritePaths: [],
        expectedOutputs: [],
        checks: [],
        idempotencyKey: "managed-prepare",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
    await expect(
      prepareResearchDispatch({
        root: fixture.root,
        runId,
        questId: fixture.ids.questId,
        campaignId: fixture.ids.campaignId,
        repositoryId: fixture.ids.repositoryId,
        ownerSkill: "ignored-on-replay",
        capabilityId: "research.literature.scan",
        skillId: SKILL_ID,
        skillVersion: SKILL_VERSION,
        memberPaths: [],
        workflowInstanceId,
        workflowNodeId: "review",
        objective: "ignored-on-replay",
        acceptanceCriteria: [],
        allowedWritePaths: [],
        expectedOutputs: [],
        checks: [],
        idempotencyKey: "managed-prepare",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });

    const claudeGrant = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: prepared.dispatch.id,
      host: "claude",
      idempotencyKey: "managed-approve-claude",
    });
    const codexGrant = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: prepared.dispatch.id,
      host: "codex",
      idempotencyKey: "managed-approve-codex",
    });
    expect(claudeGrant.approval.grant).toHaveProperty(
      "executionPackageDigest",
      prepared.activation && "executionPackage" in prepared.activation
        ? prepared.activation.executionPackage.packageDigest
        : undefined,
    );
    const now = new Date(Date.parse(claudeGrant.approval.grant.grantedAt) + 1);
    const beforeContext = snapshotTree(sandbox);
    const claudeContext = await resolveApprovedResearchDispatchContext({
      root: fixture.root,
      dispatchId: prepared.dispatch.id,
      host: "claude",
      now,
    });
    const codexContext = await resolveApprovedResearchDispatchContext({
      root: fixture.root,
      dispatchId: prepared.dispatch.id,
      host: "codex",
      now,
    });
    expect(snapshotTree(sandbox)).toEqual(beforeContext);
    expect(claudeContext.context).toMatchObject({
      schemaVersion: 3,
      executionPackage: {
        executionProfile: "managed",
        invocationSource: "operator-explicit",
        entrypointType: "model-context",
        instructions: INSTRUCTIONS,
        approvedMembers: [
          {
            path: "templates/note.md",
            role: "template",
            digest: `sha256:${sha256(MEMBERS["templates/note.md"])}`,
            content: MEMBERS["templates/note.md"],
          },
        ],
      },
      workflow: { workflowInstanceId, nodeId: "review" },
    });
    expect(codexContext.context.schemaVersion).toBe(3);
    if (
      claudeContext.context.schemaVersion !== 3 ||
      codexContext.context.schemaVersion !== 3
    ) {
      throw new Error("Expected schema-v3 managed Contexts");
    }
    expect(codexContext.context.executionPackage).toEqual(
      claudeContext.context.executionPackage,
    );

    const workflowBeforeResult = structuredClone(
      (await readResearchState(fixture.root)).workflowInstances,
    );
    const resultFile = path.join(fixture.root, "managed-result.json");
    fs.writeFileSync(
      resultFile,
      outputPayload({
        approvalId: claudeGrant.approval.grant.id,
        dispatchId: prepared.dispatch.id,
        runId,
        questId: fixture.ids.questId,
        createdAt: now.toISOString(),
      }),
    );
    const recorded = await recordApprovedResearchDispatchResult({
      root: fixture.root,
      dispatchId: prepared.dispatch.id,
      approvalId: claudeGrant.approval.grant.id,
      input: { kind: "path", path: resultFile, cwd: sandbox },
      now,
      idempotencyKey: "managed-record-result",
    });
    expect(recorded.events.map((event) => event.kind)).toEqual([
      "result.recorded",
      "proposal.recorded",
      "approval.consumed",
    ]);
    expect((await readResearchState(fixture.root)).workflowInstances).toEqual(
      workflowBeforeResult,
    );

    const completed = await completeResearchWorkflowNode({
      root: fixture.root,
      instance: workflowInstanceId,
      node: "review",
      acceptedRef: [`result:${recorded.result.id}`],
      write: true,
      idempotencyKey: "managed-complete",
    });
    expect(completed.events[0]).toMatchObject({
      kind: "workflow.node_completed",
      payload: { executionProfile: "managed", nodeId: "review" },
    });
    expect(
      (await readResearchState(fixture.root)).workflowInstances[
        workflowInstanceId
      ]?.currentNodeId,
    ).toBe("review");

    await recordResearchWorkflowTransition({
      root: fixture.root,
      instance: workflowInstanceId,
      transition: "accept-review",
      write: true,
      idempotencyKey: "managed-transition",
    });
    expect(
      (await readResearchState(fixture.root)).workflowInstances[
        workflowInstanceId
      ]?.currentNodeId,
    ).toBe("finish");
    expect(codexGrant.approval.status).toBe("granted");
  });
});

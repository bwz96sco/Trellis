import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  commitResearchBatch,
  createArtifactId,
  createQuestId,
  createRepositoryId,
  createScientificGateRecordId,
  createWorkflowInstanceId,
  createWorkspaceId,
  parseResearchEvent,
  parseResearchWorkflowDefinitionV1,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  reduceResearchEvents,
  ResearchWorkflowError,
  validateResearchBatchReadOnly,
  type QuestId,
  type ResearchEvent,
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

function workflow(
  requiredGateIds: readonly ("H1" | "H2")[] = [],
  allowedProfiles: readonly ("lightweight" | "managed")[] = ["lightweight"],
) {
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
            allowedProfiles,
            stop: true,
          },
          {
            id: "two",
            executionPackage: { ...identity, id: "research-two" },
            allowedProfiles,
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
    const missingQuestRelation = JSON.parse(
      JSON.stringify(bound.events[0]),
    ) as {
      related: unknown[];
    };
    missingQuestRelation.related = [];
    expect(() => parseResearchEvent(missingQuestRelation)).toThrow(/related/);

    await commit("complete-one", "2026-08-21T00:02:00.000Z", {
      kind: "workflow.node.complete",
      workflowInstanceId,
      executionProfile: "lightweight",
      nodeId: "one",
      acceptedRefs: [{ kind: "artifact", id: artifactId }],
      workflow: definition,
    });
    expect(
      (await readResearchState(root)).workflowInstances[workflowInstanceId],
    ).toMatchObject({ currentNodeId: "one", status: "active" });

    await commit("transition", "2026-08-21T00:03:00.000Z", {
      kind: "workflow.transition.record",
      workflowInstanceId,
      transitionId: "advance",
      selectedBy: "test",
      workflow: definition,
    });
    expect(
      (await readResearchState(root)).workflowInstances[workflowInstanceId],
    ).toMatchObject({ currentNodeId: "two", status: "active" });

    await commit("complete-two", "2026-08-21T00:04:00.000Z", {
      kind: "workflow.node.complete",
      workflowInstanceId,
      executionProfile: "lightweight",
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
    expect(
      fs.existsSync(
        path.join(
          root,
          ".trellis",
          "research",
          "quests",
          questId,
          "gates.json",
        ),
      ),
    ).toBe(false);
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
    expect(
      (await readResearchLedger(root))
        .slice(-5)
        .map((event) => event.schemaVersion),
    ).toEqual([3, 3, 3, 3, 3]);
  });

  it("requires managed Result evidence and rejects profiles not allowed by the node", async () => {
    const lightweightOnly = workflow();
    const workflowInstanceId = createWorkflowInstanceId();
    await commit("bind", "2026-08-21T00:01:00.000Z", {
      kind: "workflow.bind",
      workflowInstanceId,
      questId,
      startNodeId: "one",
      workflow: lightweightOnly,
    });
    await expect(
      commit("managed-not-allowed", "2026-08-21T00:02:00.000Z", {
        kind: "workflow.node.complete",
        workflowInstanceId,
        nodeId: "one",
        executionProfile: "managed",
        acceptedRefs: [{ kind: "artifact", id: artifactId }],
        workflow: lightweightOnly,
      }),
    ).rejects.toThrow(/does not allow managed completion/);

    const managedRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "trellis-workflow-managed-store-"),
    );
    const originalRoot = root;
    root = managedRoot;
    try {
      const workspaceId = createWorkspaceId();
      const repositoryId = createRepositoryId();
      questId = createQuestId();
      artifactId = createArtifactId();
      await commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "managed-setup",
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
      const managedDefinition = workflow([], ["managed"]);
      const managedInstanceId = createWorkflowInstanceId();
      await commit("managed-bind", "2026-08-21T00:01:00.000Z", {
        kind: "workflow.bind",
        workflowInstanceId: managedInstanceId,
        questId,
        startNodeId: "one",
        workflow: managedDefinition,
      });
      const before = snapshot(root);
      await expect(
        commit("managed-no-result", "2026-08-21T00:02:00.000Z", {
          kind: "workflow.node.complete",
          workflowInstanceId: managedInstanceId,
          nodeId: "one",
          executionProfile: "managed",
          acceptedRefs: [{ kind: "artifact", id: artifactId }],
          workflow: managedDefinition,
        }),
      ).rejects.toThrow(/requires accepted Result evidence/);
      expect(snapshot(root)).toEqual(before);
    } finally {
      fs.rmSync(managedRoot, { recursive: true, force: true });
      root = originalRoot;
    }
  });

  it("accepts only Artifacts produced by accepted managed Results", async () => {
    const definition = workflow([], ["managed"]);
    const workflowInstanceId = createWorkflowInstanceId();
    const relatedArtifactId = createArtifactId();
    const campaignId = "cmp_11111111-1111-4111-8111-111111111111" as const;
    const runId = "run_22222222-2222-4222-8222-222222222222" as const;
    const dispatchId = "dsp_33333333-3333-4333-8333-333333333333" as const;
    const activationId = "act_44444444-4444-4444-8444-444444444444" as const;
    const approvalId = "apr_55555555-5555-4555-8555-555555555555" as const;
    const resultId = "res_55555555-5555-4555-8555-555555555555" as const;
    const proposalId = "prp_55555555-5555-4555-8555-555555555555" as const;
    const repositoryId = Object.keys((await readResearchState(root)).repositories)[0] as `rep_${string}`;
    const digest = `sha256:${"4".repeat(64)}` as const;

    await commit("bind-managed", "2026-08-21T00:01:00.000Z", {
      kind: "workflow.bind",
      workflowInstanceId,
      questId,
      startNodeId: "one",
      workflow: definition,
    });
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "managed-prerequisites",
      timestamp: "2026-08-21T00:02:00.000Z",
      mutations: [
        {
          kind: "artifact.register",
          artifact: {
            id: relatedArtifactId,
            repositoryId,
            path: "results/unrelated.json",
          },
        },
        {
          kind: "evidence.create",
          evidence: {
            id: "evd_66666666-6666-4666-8666-666666666666",
            questId,
            summary: "Other work in the same Quest",
            artifactRefs: [
              {
                id: relatedArtifactId,
                repositoryId,
                path: "results/unrelated.json",
              },
            ],
          },
        },
        {
          kind: "campaign.create",
          campaign: {
            id: campaignId,
            questId,
            title: "Managed campaign",
            protocolDigest: "protocol-v1",
          },
        },
        {
          kind: "run.create",
          run: { id: runId, campaignId, title: "Managed run" },
        },
        {
          kind: "dispatch.record",
          dispatch: {
            id: dispatchId,
            questId,
            campaignId,
            runId,
            repositoryId,
            ownerSkill: "managed-skill",
            objective: "Managed work",
            acceptanceCriteria: [],
            context: [],
            allowedWritePaths: [],
            expectedOutputs: [],
            checks: [],
            createdAt: "2026-08-21T00:02:00.000Z",
          },
        },
        {
          kind: "activation.plan",
          activation: {
            id: activationId,
            dispatchId,
            questId,
            capabilityId: "research.literature.scan",
            mode: "explicit",
            executionPackage: identity,
            managedExecution: {
              executionProfile: "managed",
              requestedMemberPaths: [],
              workflow: {
                workflowInstanceId,
                workflowId: definition.definition.id,
                workflowVersion: definition.definition.version,
                workflowDigest: definition.workflowDigest,
                nodeId: "one",
              },
            },
            policyDigest: digest,
            requestDigest: digest,
            scopeHash: digest,
            maxDurationMinutes: 15,
            maxDispatches: 1,
            createdAt: "2026-08-21T00:02:00.000Z",
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
            approverLabel: "operator",
            rationale: "Approved",
            requestDigest: digest,
            executionPackageDigest: identity.packageDigest,
            policyDigest: digest,
            scopeHash: digest,
            grantedAt: "2026-08-21T00:02:00.000Z",
            expiresAt: "2026-08-21T00:17:00.000Z",
          },
        },
      ],
    });
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "managed-result",
      timestamp: "2026-08-21T00:03:00.000Z",
      mutations: [
        {
          kind: "result.record",
          result: {
            id: resultId,
            dispatchId,
            runId,
            status: "completed",
            summary: "Complete",
            commands: [],
            checks: [],
            artifactRefs: [
              {
                id: artifactId,
                repositoryId,
                path: "results/review.json",
              },
            ],
            blockers: [],
            createdAt: "2026-08-21T00:03:00.000Z",
          },
        },
        {
          kind: "proposal.record",
          proposal: {
            id: proposalId,
            dispatchId,
            questId,
            title: "No canonical changes",
            operations: [],
            status: "pending",
            createdAt: "2026-08-21T00:03:00.000Z",
            updatedAt: "2026-08-21T00:03:00.000Z",
          },
        },
        {
          kind: "approval.consume",
          approvalId,
          resultId,
          proposalId,
        },
      ],
    });

    const before = snapshot(root);
    await expect(
      commit("reject-unrelated-artifact", "2026-08-21T00:04:00.000Z", {
        kind: "workflow.node.complete",
        workflowInstanceId,
        nodeId: "one",
        executionProfile: "managed",
        acceptedRefs: [
          { kind: "result", id: resultId },
          { kind: "artifact", id: relatedArtifactId },
        ],
        workflow: definition,
      }),
    ).rejects.toThrow(/was not produced by an accepted managed Result/);
    expect(snapshot(root)).toEqual(before);

    await expect(
      commit("accept-result-artifact", "2026-08-21T00:04:00.000Z", {
        kind: "workflow.node.complete",
        workflowInstanceId,
        nodeId: "one",
        executionProfile: "managed",
        acceptedRefs: [
          { kind: "result", id: resultId },
          { kind: "artifact", id: artifactId },
        ],
        workflow: definition,
      }),
    ).resolves.toBeDefined();
  });

  it("rejects a managed Activation bound to a missing Workflow instance", async () => {
    const campaignId = "cmp_77777777-7777-4777-8777-777777777777" as const;
    const runId = "run_88888888-8888-4888-8888-888888888888" as const;
    const dispatchId = "dsp_99999999-9999-4999-8999-999999999999" as const;
    const repositoryId = Object.keys((await readResearchState(root)).repositories)[0] as `rep_${string}`;
    const missingWorkflowInstanceId = createWorkflowInstanceId();
    const definition = workflow([], ["managed"]);
    const digest = `sha256:${"5".repeat(64)}` as const;
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "missing-workflow-prerequisites",
      timestamp: "2026-08-21T00:01:00.000Z",
      mutations: [
        {
          kind: "campaign.create",
          campaign: {
            id: campaignId,
            questId,
            title: "Managed campaign",
            protocolDigest: "protocol-v1",
          },
        },
        {
          kind: "run.create",
          run: { id: runId, campaignId, title: "Managed run" },
        },
        {
          kind: "dispatch.record",
          dispatch: {
            id: dispatchId,
            questId,
            campaignId,
            runId,
            repositoryId,
            ownerSkill: "managed-skill",
            objective: "Managed work",
            acceptanceCriteria: [],
            context: [],
            allowedWritePaths: [],
            expectedOutputs: [],
            checks: [],
            createdAt: "2026-08-21T00:01:00.000Z",
          },
        },
      ],
    });
    const before = snapshot(root);

    await expect(
      commit("reject-missing-workflow", "2026-08-21T00:02:00.000Z", {
        kind: "activation.plan",
        activation: {
          id: "act_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          dispatchId,
          questId,
          capabilityId: "research.literature.scan",
          mode: "explicit",
          executionPackage: identity,
          managedExecution: {
            executionProfile: "managed",
            requestedMemberPaths: [],
            workflow: {
              workflowInstanceId: missingWorkflowInstanceId,
              workflowId: definition.definition.id,
              workflowVersion: definition.definition.version,
              workflowDigest: definition.workflowDigest,
              nodeId: "one",
            },
          },
          policyDigest: digest,
          requestDigest: digest,
          scopeHash: digest,
          maxDurationMinutes: 15,
          maxDispatches: 1,
          createdAt: "2026-08-21T00:02:00.000Z",
        },
      }),
    ).rejects.toThrow(/Unknown research workflow instance/);
    expect(snapshot(root)).toEqual(before);
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

  it("uses the latest exact-scope H1/H2 decisions and freezes approving records in gate order", async () => {
    const definition = workflow(["H2", "H1"]);
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
      executionProfile: "lightweight",
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

    const rejectedH1 = createScientificGateRecordId();
    await commit("reject-h1", "2026-08-21T00:04:00.000Z", {
      kind: "scientific-gate.record",
      recordId: rejectedH1,
      workflowInstanceId,
      gateId: "H1",
      decision: "reject",
      actor: "reviewer",
      rationale: "Needs revision",
      approvedRefs: [],
      rejectedRefs: ["candidate:one"],
      evidenceRefs: [artifactId],
      workflow: definition,
    });
    const approvedH2 = createScientificGateRecordId();
    await commit("approve-h2", "2026-08-21T00:05:00.000Z", {
      kind: "scientific-gate.record",
      recordId: approvedH2,
      workflowInstanceId,
      gateId: "H2",
      decision: "approve",
      actor: "reviewer",
      rationale: "Audit passed",
      approvedRefs: ["audit:one"],
      rejectedRefs: [],
      evidenceRefs: [artifactId],
      sourceArtifactId: artifactId,
      workflow: definition,
    });
    await expect(
      commit("still-blocked", "2026-08-21T00:06:00.000Z", {
        kind: "workflow.transition.record",
        workflowInstanceId,
        transitionId: "advance",
        selectedBy: "test",
        workflow: definition,
      }),
    ).rejects.toThrow(/missing gates: H1/);

    const approvedH1 = createScientificGateRecordId();
    await commit("approve-h1", "2026-08-21T00:07:00.000Z", {
      kind: "scientific-gate.record",
      recordId: approvedH1,
      workflowInstanceId,
      gateId: "H1",
      decision: "approve",
      actor: " reviewer ",
      rationale: " revision accepted ",
      approvedRefs: ["candidate:one"],
      rejectedRefs: [],
      evidenceRefs: [artifactId],
      workflow: definition,
    });
    const transitioned = await commit(
      "transition",
      "2026-08-21T00:08:00.000Z",
      {
        kind: "workflow.transition.record",
        workflowInstanceId,
        transitionId: "advance",
        selectedBy: "test",
        workflow: definition,
      },
    );
    expect(transitioned.events[0]).toMatchObject({
      kind: "workflow.transition_recorded",
      related: [
        { type: "quest", id: questId },
        { type: "scientific-gate", id: approvedH1 },
        { type: "scientific-gate", id: approvedH2 },
      ],
      payload: { gateRecordIds: [approvedH1, approvedH2] },
    });

    const state = await readResearchState(root);
    expect(
      state.scientificGateRecordIdsByWorkflowInstanceId[workflowInstanceId],
    ).toEqual([rejectedH1, approvedH2, approvedH1]);
    expect(state.scientificGateRecords[approvedH1]).toMatchObject({
      actor: " reviewer ",
      rationale: " revision accepted ",
    });
    const gatesFile = path.join(
      root,
      ".trellis",
      "research",
      "quests",
      questId,
      "gates.json",
    );
    const gatesProjection = JSON.parse(
      fs.readFileSync(gatesFile, "utf8"),
    ) as {
      schemaVersion: number;
      records: { id: string }[];
      effective: { recordId: string }[];
      updatedAt: string;
    };
    expect(gatesProjection).toMatchObject({
      schemaVersion: 1,
      updatedAt: "2026-08-21T00:07:00.000Z",
    });
    expect(gatesProjection.records.map((record) => record.id)).toEqual([
      rejectedH1,
      approvedH2,
      approvedH1,
    ]);
    expect(gatesProjection.effective.map((record) => record.recordId)).toEqual([
      approvedH1,
      approvedH2,
    ]);

    const gateProjectionBytes = fs.readFileSync(gatesFile, "utf8");
    await rebuildResearchProjections(root);
    expect(fs.readFileSync(gatesFile, "utf8")).toBe(gateProjectionBytes);

    const canonicalEvents = await readResearchLedger(root);
    const gateRelationDrift = structuredClone(canonicalEvents);
    const gateEvent = gateRelationDrift.find(
      (event) =>
        event.kind === "scientific-gate.recorded" &&
        event.aggregate.id === approvedH1,
    );
    if (gateEvent === undefined) throw new Error("Missing approved H1 event");
    gateEvent.related = [{ type: "quest", id: questId }];
    expect(() => reduceResearchEvents(gateRelationDrift)).toThrow(
      /scientific-gate.recorded related refs do not match canonical state/,
    );

    const transitionRelationDrift: ResearchEvent[] =
      structuredClone(canonicalEvents);
    const transitionEvent = transitionRelationDrift.find(
      (event) => event.kind === "workflow.transition_recorded",
    );
    if (transitionEvent === undefined) {
      throw new Error("Missing Workflow transition event");
    }
    transitionEvent.related = [
      { type: "quest", id: questId },
      { type: "scientific-gate", id: approvedH2 },
      { type: "scientific-gate", id: approvedH1 },
    ];
    expect(() => reduceResearchEvents(transitionRelationDrift)).toThrow(
      /workflow.transition_recorded related refs do not match canonical state/,
    );
  });
});

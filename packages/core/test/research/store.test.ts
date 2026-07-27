import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  commitResearchBatch,
  createActivationId,
  createApprovalId,
  createArtifactId,
  createCampaignId,
  createDispatchId,
  createQuestId,
  createRepositoryId,
  createRunId,
  createWorkspaceId,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  validateResearchBatch,
  validateResearchBatchReadOnly,
  researchPaths,
  ResearchProjectionError,
  type ResearchMutation,
} from "../../src/research/index.js";

const ACTOR = { type: "agent" as const, id: "test" };
const PROVENANCE = { source: "test" };
const NOW = "2026-07-17T00:00:00.000Z";

function snapshotFiles(root: string): Map<string, string> {
  const out = new Map<string, string>();
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.set(path.relative(root, full), fs.readFileSync(full, "utf-8"));
    }
  }
  walk(root);
  return out;
}

describe("research store", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  async function initialize(): Promise<string> {
    const workspaceId = createWorkspaceId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "init",
      timestamp: NOW,
      mutations: [
        {
          kind: "workspace.create",
          workspace: {
            id: workspaceId,
            name: "Research",
            description: "",
          },
        },
      ],
    });
    return workspaceId;
  }

  it("emits and reduces typed mixed-version activation and approval mutations", async () => {
    await initialize();
    const repositoryId = createRepositoryId();
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    const dispatchId = createDispatchId();
    const activationId = createActivationId();
    const approvalId = createApprovalId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "mixed-prerequisites",
      timestamp: NOW,
      mutations: [
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
          campaign: { id: campaignId, questId, title: "Campaign", protocolDigest: "p" },
        },
        { kind: "run.create", run: { id: runId, campaignId, title: "Run" } },
      ],
    });
    const timestamp = "2026-07-17T00:01:00.000Z";
    const dispatch = {
      id: dispatchId,
      questId,
      campaignId,
      runId,
      repositoryId,
      ownerSkill: "opaque",
      objective: "Bounded work",
      acceptanceCriteria: [],
      context: [],
      allowedWritePaths: [],
      expectedOutputs: [],
      checks: [],
      createdAt: timestamp,
    };
    const activation = {
      id: activationId,
      dispatchId,
      questId,
      capabilityId: "research.setup.project",
      mode: "explicit" as const,
      procedure: { id: "project-setup-v1", version: "1.0.0", digest: `sha256:${"1".repeat(64)}` },
      policyDigest: `sha256:${"2".repeat(64)}`,
      requestDigest: `sha256:${"3".repeat(64)}`,
      scopeHash: `sha256:${"4".repeat(64)}`,
      maxDurationMinutes: 10,
      maxDispatches: 1,
      createdAt: timestamp,
    };
    const planned = await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "mixed-plan",
      timestamp,
      mutations: [
        { kind: "dispatch.record", dispatch },
        { kind: "activation.plan", activation },
      ],
    });
    expect(planned.events.map((event) => [event.schemaVersion, event.kind])).toEqual([
      [1, "dispatch.recorded"],
      [2, "activation.planned"],
    ]);

    const grantedAt = "2026-07-17T00:02:00.000Z";
    const grant = {
      id: approvalId,
      activationId,
      dispatchId,
      host: "claude" as const,
      mode: "automatic" as const,
      approverLabel: "trellis-policy-v1",
      rationale: "Eligible under immutable registry and project policy.",
      requestDigest: activation.requestDigest,
      procedureDigest: activation.procedure.digest,
      policyDigest: activation.policyDigest,
      scopeHash: activation.scopeHash,
      grantedAt,
      expiresAt: "2026-07-17T00:12:00.000Z",
    };
    const granted = await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "mixed-grant",
      timestamp: grantedAt,
      mutations: [{ kind: "approval.grant", approval: grant }],
    });
    expect(granted.events[0]).toMatchObject({ schemaVersion: 2, kind: "approval.granted" });
    const revokedAt = "2026-07-17T00:03:00.000Z";
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "mixed-revoke",
      timestamp: revokedAt,
      mutations: [
        { kind: "approval.revoke", approvalId, revokedAt, reason: "No longer needed" },
      ],
    });
    expect((await readResearchState(root)).approvals[approvalId]).toMatchObject({
      status: "revoked",
      revocationReason: "No longer needed",
    });
  });

  it("returns prior success for a duplicate idempotency key", async () => {
    await initialize();
    const questId = createQuestId();
    const first = await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "quest-1",
      timestamp: NOW,
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Original",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });
    const replay = await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "quest-1",
      timestamp: "2026-07-18T00:00:00.000Z",
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: createQuestId(),
            title: "Drifted retry",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });

    expect(replay.replayed).toBe(true);
    expect(replay.events).toEqual(first.events);
    expect((await readResearchLedger(root))).toHaveLength(2);
  });

  it("serializes concurrent writers into a contiguous ledger", async () => {
    await initialize();
    const count = 24;
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        commitResearchBatch({
          root,
          actor: ACTOR,
          provenance: PROVENANCE,
          idempotencyKey: `quest-${index}`,
          timestamp: `2026-07-17T00:00:${String(index).padStart(2, "0")}.000Z`,
          mutations: [
            {
              kind: "quest.create",
              quest: {
                id: createQuestId(),
                title: `Quest ${index}`,
                description: "",
                repositoryIds: [],
                artifactRefs: [],
              },
            },
          ],
        }),
      ),
    );

    const events = await readResearchLedger(root);
    expect(events.map((event) => event.seq)).toEqual(
      Array.from({ length: count + 1 }, (_, index) => index + 1),
    );
  });

  it("validates a complete batch before appending any event", async () => {
    await initialize();
    const before = await readResearchLedger(root);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "invalid-batch",
        timestamp: NOW,
        mutations: [
          {
            kind: "quest.create",
            quest: {
              id: createQuestId(),
              title: "Valid first mutation",
              description: "",
              repositoryIds: [],
              artifactRefs: [],
            },
          },
          {
            kind: "campaign.create",
            campaign: {
              id: createCampaignId(),
              questId: createQuestId(),
              title: "Missing quest",
              protocolDigest: "sha256:abc",
            },
          },
        ],
      }),
    ).rejects.toThrow(/quest/);
    expect(await readResearchLedger(root)).toEqual(before);
  });

  it("recovers from projection failure with a deterministic rebuild", async () => {
    await initialize();
    const questId = createQuestId();
    const paths = researchPaths(root);
    const projection = path.join(paths.questsDir, questId, "quest.json");
    fs.mkdirSync(projection, { recursive: true });

    let failure: unknown;
    try {
      await commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "projection-failure",
        timestamp: NOW,
        mutations: [
          {
            kind: "quest.create",
            quest: {
              id: questId,
              title: "Recoverable",
              description: "",
              repositoryIds: [],
              artifactRefs: [],
            },
          },
        ],
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ResearchProjectionError);
    expect((failure as ResearchProjectionError).headSeq).toBe(2);
    expect(await readResearchLedger(root)).toHaveLength(2);

    fs.rmSync(projection, { recursive: true, force: true });
    await rebuildResearchProjections(root);
    const first = snapshotFiles(paths.researchDir);
    await rebuildResearchProjections(root);
    const second = snapshotFiles(paths.researchDir);
    expect(second).toEqual(first);
    expect(
      JSON.parse(fs.readFileSync(projection, "utf-8")).projectedThroughSeq,
    ).toBe(2);
  });

  it("writes per-entity projections through the current ledger head", async () => {
    await initialize();
    const firstQuestId = createQuestId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "first-projection",
      timestamp: NOW,
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: firstQuestId,
            title: "First",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "second-projection",
      timestamp: "2026-07-18T00:00:00.000Z",
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: createQuestId(),
            title: "Second",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });

    const paths = researchPaths(root);
    const firstProjection = path.join(
      paths.questsDir,
      firstQuestId,
      "quest.json",
    );
    expect(
      JSON.parse(fs.readFileSync(firstProjection, "utf-8")).projectedThroughSeq,
    ).toBe(3);
    expect(
      JSON.parse(fs.readFileSync(paths.workspaceFile, "utf-8"))
        .projectedThroughSeq,
    ).toBe(3);
  });

  it("keeps protocol digests immutable after freeze and run terminals immutable", async () => {
    await initialize();
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "setup-lifecycle",
      timestamp: NOW,
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Quest",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
        {
          kind: "campaign.create",
          campaign: {
            id: campaignId,
            questId,
            title: "Campaign",
            protocolDigest: "sha256:one",
          },
        },
        { kind: "campaign.freeze", campaignId },
        {
          kind: "run.create",
          run: { id: runId, campaignId, title: "Run" },
        },
        { kind: "run.status", runId, status: "running" },
        { kind: "run.status", runId, status: "succeeded" },
      ],
    });

    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "change-frozen-protocol",
        timestamp: NOW,
        mutations: [
          {
            kind: "campaign.protocol",
            campaignId,
            protocolDigest: "sha256:two",
          },
        ],
      }),
    ).rejects.toThrow(/frozen/);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "restart-terminal-run",
        timestamp: NOW,
        mutations: [{ kind: "run.status", runId, status: "running" }],
      }),
    ).rejects.toThrow(/transition/);

    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "invalidate-terminal-run",
      timestamp: NOW,
      mutations: [
        { kind: "run.invalidate", runId, reason: "Bad source data" },
      ],
    });
    expect((await readResearchState(root)).runs[runId]?.status).toBe(
      "invalidated",
    );
  });

  it("rejects artifact references to unresolved repositories", async () => {
    await initialize();
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "bad-artifact",
        timestamp: NOW,
        mutations: [
          {
            kind: "artifact.register",
            artifact: {
              id: createArtifactId(),
              repositoryId: createRepositoryId(),
              path: "results/data.json",
            },
          },
        ],
      }),
    ).rejects.toThrow(/repository/);
  });

  it("validates optional artifact SHA-256 before append", async () => {
    await initialize();
    const repositoryId = createRepositoryId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "register-repository",
      timestamp: NOW,
      mutations: [
        {
          kind: "repository.register",
          repository: {
            id: repositoryId,
            name: "repo",
            kind: "code",
            locator: "repo",
            capabilities: { hasTrellis: false },
          },
        },
      ],
    });
    fs.mkdirSync(path.join(root, "repo", "results"), { recursive: true });
    fs.writeFileSync(path.join(root, "repo", "results", "data.txt"), "data");

    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "valid-digest",
      timestamp: NOW,
      mutations: [
        {
          kind: "artifact.register",
          artifact: {
            id: createArtifactId(),
            repositoryId,
            path: "results/data.txt",
            sha256:
              "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7",
          },
        },
      ],
    });

    const boundRepositoryId = createRepositoryId();
    const boundRoot = path.join(root, "machine-bound-repo");
    fs.mkdirSync(path.join(boundRoot, "results"), { recursive: true });
    fs.writeFileSync(path.join(boundRoot, "results", "data.txt"), "data");
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "register-bound-repository",
      timestamp: NOW,
      mutations: [
        {
          kind: "repository.register",
          repository: {
            id: boundRepositoryId,
            name: "bound repo",
            kind: "code",
            locator: "missing-locator",
            capabilities: { hasTrellis: false },
          },
        },
      ],
    });
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "valid-bound-digest",
      timestamp: NOW,
      artifactRepositoryRoots: { [boundRepositoryId]: boundRoot },
      mutations: [
        {
          kind: "artifact.register",
          artifact: {
            id: createArtifactId(),
            repositoryId: boundRepositoryId,
            path: "results/data.txt",
            sha256:
              "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7",
          },
        },
      ],
    });
    expect(fs.readFileSync(researchPaths(root).eventsFile, "utf-8")).not.toContain(
      boundRoot,
    );

    const before = await readResearchLedger(root);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "invalid-digest",
        timestamp: NOW,
        mutations: [
          {
            kind: "artifact.register",
            artifact: {
              id: createArtifactId(),
              repositoryId,
              path: "results/data.txt",
              sha256: "0".repeat(64),
            },
          },
        ],
      }),
    ).rejects.toThrow(/sha256/);
    expect(await readResearchLedger(root)).toEqual(before);
  });

  it.runIf(process.platform !== "win32")(
    "rejects digest paths that escape through a symbolic link",
    async () => {
      await initialize();
      const repositoryId = createRepositoryId();
      await commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "register-symlink-repository",
        timestamp: NOW,
        mutations: [
          {
            kind: "repository.register",
            repository: {
              id: repositoryId,
              name: "repo",
              kind: "code",
              locator: "repo",
              capabilities: { hasTrellis: false },
            },
          },
        ],
      });
      const repositoryRoot = path.join(root, "repo");
      const outsideFile = path.join(root, "outside.txt");
      fs.mkdirSync(path.join(repositoryRoot, "results"), { recursive: true });
      fs.writeFileSync(outsideFile, "data");
      fs.symlinkSync(outsideFile, path.join(repositoryRoot, "results", "link.txt"));
      const before = await readResearchLedger(root);

      await expect(
        commitResearchBatch({
          root,
          actor: ACTOR,
          provenance: PROVENANCE,
          idempotencyKey: "symlink-artifact",
          timestamp: NOW,
          mutations: [
            {
              kind: "artifact.register",
              artifact: {
                id: createArtifactId(),
                repositoryId,
                path: "results/link.txt",
                sha256:
                  "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7",
              },
            },
          ],
        }),
      ).rejects.toThrow(/escapes repository/);
      expect(await readResearchLedger(root)).toEqual(before);
    },
  );

  it("repairs a stale runtime sequence cache from the ledger head", async () => {
    await initialize();
    const paths = researchPaths(root);
    fs.writeFileSync(paths.seqFile, "99\n", "utf-8");
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "after-stale-seq",
      timestamp: NOW,
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: createQuestId(),
            title: "Contiguous",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });
    expect((await readResearchLedger(root)).map((event) => event.seq)).toEqual([
      1, 2,
    ]);
    expect(fs.readFileSync(paths.seqFile, "utf-8").trim()).toBe("2");
  });

  it("keeps lock, sequence, and cache files under runtime research", async () => {
    await initialize();
    const paths = researchPaths(root);
    expect(paths.lockFile.startsWith(paths.runtimeDir)).toBe(true);
    expect(paths.seqFile.startsWith(paths.runtimeDir)).toBe(true);
    expect(paths.cacheFile.startsWith(paths.runtimeDir)).toBe(true);
    expect(fs.readFileSync(paths.seqFile, "utf-8").trim()).toBe("1");
    expect(fs.existsSync(paths.cacheFile)).toBe(true);
    expect(fs.existsSync(paths.workspaceFile)).toBe(true);
    expect(fs.existsSync(paths.repositoriesFile)).toBe(true);
  });
});

const CONSUMPTION_WORKSPACE_ID = "wsp_11111111-1111-4111-8111-111111111111" as const;
const CONSUMPTION_REPOSITORY_ID = "rep_22222222-2222-4222-8222-222222222222" as const;
const CONSUMPTION_QUEST_ID = "qst_33333333-3333-4333-8333-333333333333" as const;
const CONSUMPTION_CAMPAIGN_ID = "cmp_44444444-4444-4444-8444-444444444444" as const;
const CONSUMPTION_RUN_ID = "run_55555555-5555-4555-8555-555555555555" as const;
const CONSUMPTION_DISPATCH_ID = "dsp_66666666-6666-4666-8666-666666666666" as const;
const CONSUMPTION_ACTIVATION_ID = "act_77777777-7777-4777-8777-777777777777" as const;
const CONSUMPTION_APPROVAL_ID = "apr_88888888-8888-4888-8888-888888888888" as const;
const CONSUMPTION_RESULT_ID = "res_88888888-8888-4888-8888-888888888888" as const;
const CONSUMPTION_PROPOSAL_ID = "prp_88888888-8888-4888-8888-888888888888" as const;
const CONSUMPTION_ACTOR = { type: "agent" as const, id: "test" };
const CONSUMPTION_PROVENANCE = { source: "approval consumption mutation test" };
const CONSUMPTION_PLANNED_AT = "2026-07-24T00:00:00.000Z";
const CONSUMPTION_RECORDED_AT = "2026-07-24T00:05:00.000Z";
const CONSUMPTION_DIGEST_A = `sha256:${"a".repeat(64)}`;
const CONSUMPTION_DIGEST_B = `sha256:${"b".repeat(64)}`;
const CONSUMPTION_DIGEST_C = `sha256:${"c".repeat(64)}`;
const CONSUMPTION_DIGEST_D = `sha256:${"d".repeat(64)}`;

function CONSUMPTION_prerequisiteMutations(): readonly ResearchMutation[] {
  return [
    {
      kind: "workspace.create",
      workspace: { id: CONSUMPTION_WORKSPACE_ID, name: "Research", description: "" },
    },
    {
      kind: "repository.register",
      repository: {
        id: CONSUMPTION_REPOSITORY_ID,
        name: "Repository",
        kind: "code",
        locator: "repository",
        capabilities: { hasTrellis: false },
      },
    },
    {
      kind: "quest.create",
      quest: {
        id: CONSUMPTION_QUEST_ID,
        title: "Quest",
        description: "",
        repositoryIds: [CONSUMPTION_REPOSITORY_ID],
        artifactRefs: [],
      },
    },
    {
      kind: "campaign.create",
      campaign: {
        id: CONSUMPTION_CAMPAIGN_ID,
        questId: CONSUMPTION_QUEST_ID,
        title: "Campaign",
        protocolDigest: "protocol-v1",
      },
    },
    {
      kind: "run.create",
      run: { id: CONSUMPTION_RUN_ID, campaignId: CONSUMPTION_CAMPAIGN_ID, title: "Run" },
    },
    {
      kind: "dispatch.record",
      dispatch: {
        id: CONSUMPTION_DISPATCH_ID,
        questId: CONSUMPTION_QUEST_ID,
        campaignId: CONSUMPTION_CAMPAIGN_ID,
        runId: CONSUMPTION_RUN_ID,
        repositoryId: CONSUMPTION_REPOSITORY_ID,
        ownerSkill: "legacy",
        objective: "Bounded work",
        acceptanceCriteria: [],
        context: [],
        allowedWritePaths: [],
        expectedOutputs: [],
        checks: [],
        createdAt: CONSUMPTION_PLANNED_AT,
      },
    },
    {
      kind: "activation.plan",
      activation: {
        id: CONSUMPTION_ACTIVATION_ID,
        dispatchId: CONSUMPTION_DISPATCH_ID,
        questId: CONSUMPTION_QUEST_ID,
        capabilityId: "research.setup.project",
        mode: "explicit",
        procedure: {
          id: "project-setup-v1",
          version: "1.0.0",
          digest: CONSUMPTION_DIGEST_A,
        },
        policyDigest: CONSUMPTION_DIGEST_B,
        requestDigest: CONSUMPTION_DIGEST_C,
        scopeHash: CONSUMPTION_DIGEST_D,
        maxDurationMinutes: 10,
        maxDispatches: 1,
        createdAt: CONSUMPTION_PLANNED_AT,
      },
    },
    {
      kind: "approval.grant",
      approval: {
        id: CONSUMPTION_APPROVAL_ID,
        activationId: CONSUMPTION_ACTIVATION_ID,
        dispatchId: CONSUMPTION_DISPATCH_ID,
        host: "claude",
        mode: "interactive",
        approverLabel: "operator",
        rationale: "Approved",
        requestDigest: CONSUMPTION_DIGEST_C,
        procedureDigest: CONSUMPTION_DIGEST_A,
        policyDigest: CONSUMPTION_DIGEST_B,
        scopeHash: CONSUMPTION_DIGEST_D,
        grantedAt: CONSUMPTION_PLANNED_AT,
        expiresAt: "2026-07-24T00:10:00.000Z",
      },
    },
  ];
}

function CONSUMPTION_resultMutations(includeConsumption: boolean): readonly ResearchMutation[] {
  const mutations: ResearchMutation[] = [
    {
      kind: "result.record",
      result: {
        id: CONSUMPTION_RESULT_ID,
        dispatchId: CONSUMPTION_DISPATCH_ID,
        runId: CONSUMPTION_RUN_ID,
        status: "completed",
        summary: "Complete",
        commands: [],
        checks: [],
        artifactRefs: [],
        blockers: [],
        createdAt: CONSUMPTION_RECORDED_AT,
      },
    },
    {
      kind: "proposal.record",
      proposal: {
        id: CONSUMPTION_PROPOSAL_ID,
        dispatchId: CONSUMPTION_DISPATCH_ID,
        questId: CONSUMPTION_QUEST_ID,
        title: "No changes",
        operations: [],
        status: "pending",
        createdAt: CONSUMPTION_RECORDED_AT,
        updatedAt: CONSUMPTION_RECORDED_AT,
      },
    },
  ];
  if (includeConsumption) {
    mutations.push({
      kind: "approval.consume",
      approvalId: CONSUMPTION_APPROVAL_ID,
      resultId: CONSUMPTION_RESULT_ID,
      proposalId: CONSUMPTION_PROPOSAL_ID,
    });
  }
  return mutations;
}

describe("typed approval consumption mutation", () => {
  let root: string;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-consumption-"));
    await commitResearchBatch({
      root,
      actor: CONSUMPTION_ACTOR,
      provenance: CONSUMPTION_PROVENANCE,
      idempotencyKey: "prerequisites",
      timestamp: CONSUMPTION_PLANNED_AT,
      mutations: CONSUMPTION_prerequisiteMutations(),
    });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("emits the exact successor family and consumes the approval", async () => {
    const committed = await commitResearchBatch({
      root,
      actor: CONSUMPTION_ACTOR,
      provenance: CONSUMPTION_PROVENANCE,
      idempotencyKey: "successor-result",
      timestamp: CONSUMPTION_RECORDED_AT,
      mutations: CONSUMPTION_resultMutations(true),
    });

    expect(committed.events.map((event) => [event.schemaVersion, event.kind])).toEqual([
      [1, "result.recorded"],
      [1, "proposal.recorded"],
      [2, "approval.consumed"],
    ]);
    const firstSeq = committed.events[0]?.seq;
    if (firstSeq === undefined) throw new Error("Expected successor events");
    expect(committed.events.map((event) => event.seq)).toEqual([
      firstSeq,
      firstSeq + 1,
      firstSeq + 2,
    ]);
    for (const event of committed.events) {
      expect(event).toMatchObject({
        timestamp: CONSUMPTION_RECORDED_AT,
        actor: CONSUMPTION_ACTOR,
        provenance: CONSUMPTION_PROVENANCE,
        idempotencyKey: "successor-result",
      });
    }
    expect(committed.events[2]).toMatchObject({
      aggregate: { type: "approval", id: CONSUMPTION_APPROVAL_ID },
      related: [
        { type: "activation", id: CONSUMPTION_ACTIVATION_ID },
        { type: "dispatch", id: CONSUMPTION_DISPATCH_ID },
        { type: "result", id: CONSUMPTION_RESULT_ID },
        { type: "proposal", id: CONSUMPTION_PROPOSAL_ID },
      ],
      payload: {
        approvalId: CONSUMPTION_APPROVAL_ID,
        resultId: CONSUMPTION_RESULT_ID,
        proposalId: CONSUMPTION_PROPOSAL_ID,
        consumedAt: CONSUMPTION_RECORDED_AT,
      },
    });
    expect((await readResearchState(root)).approvals[CONSUMPTION_APPROVAL_ID]).toMatchObject({
      status: "consumed",
      consumedAt: CONSUMPTION_RECORDED_AT,
      resultId: CONSUMPTION_RESULT_ID,
      proposalId: CONSUMPTION_PROPOSAL_ID,
    });
  });

  it("rejects the isolated legacy Result and Proposal pair", async () => {
    const before = await readResearchLedger(root);
    await expect(
      validateResearchBatch({
        root,
        actor: CONSUMPTION_ACTOR,
        provenance: CONSUMPTION_PROVENANCE,
        idempotencyKey: "legacy-result",
        timestamp: CONSUMPTION_RECORDED_AT,
        mutations: CONSUMPTION_resultMutations(false),
      }),
    ).rejects.toThrow(/Result, Proposal, and Approval consumption/);
    expect(await readResearchLedger(root)).toEqual(before);
  });

  it("rejects consumption without the same complete ordered pair and appends nothing", async () => {
    const before = await readResearchLedger(root);
    await expect(
      commitResearchBatch({
        root,
        actor: CONSUMPTION_ACTOR,
        provenance: CONSUMPTION_PROVENANCE,
        idempotencyKey: "consumption-only",
        timestamp: CONSUMPTION_RECORDED_AT,
        mutations: [
          {
            kind: "approval.consume",
            approvalId: CONSUMPTION_APPROVAL_ID,
            resultId: CONSUMPTION_RESULT_ID,
            proposalId: CONSUMPTION_PROPOSAL_ID,
          },
        ],
      }),
    ).rejects.toThrow(/immediately follow matching Result and Proposal/);
    expect(await readResearchLedger(root)).toEqual(before);
  });
});

const INVALID_WORKSPACE_ID = "wsp_11111111-1111-4111-8111-111111111111" as const;
const INVALID_REPOSITORY_ID = "rep_22222222-2222-4222-8222-222222222222" as const;
const INVALID_QUEST_ID = "qst_33333333-3333-4333-8333-333333333333" as const;
const INVALID_CAMPAIGN_ID = "cmp_44444444-4444-4444-8444-444444444444" as const;
const INVALID_RUN_ID = "run_55555555-5555-4555-8555-555555555555" as const;
const INVALID_DISPATCH_ID = "dsp_66666666-6666-4666-8666-666666666666" as const;
const INVALID_ACTIVATION_ID = "act_77777777-7777-4777-8777-777777777777" as const;
const INVALID_APPROVAL_ID = "apr_88888888-8888-4888-8888-888888888888" as const;
const INVALID_RESULT_ID = "res_88888888-8888-4888-8888-888888888888" as const;
const INVALID_PROPOSAL_ID = "prp_88888888-8888-4888-8888-888888888888" as const;
const INVALID_WRONG_RESULT_ID = "res_99999999-9999-4999-8999-999999999999" as const;
const INVALID_WRONG_PROPOSAL_ID = "prp_99999999-9999-4999-8999-999999999999" as const;
const INVALID_FOREIGN_APPROVAL_ID = "apr_99999999-9999-4999-8999-999999999999" as const;
const INVALID_FOREIGN_DISPATCH_ID = "dsp_99999999-9999-4999-8999-999999999999" as const;
const INVALID_NOW = "2026-07-24T00:00:00.000Z";
const INVALID_RECORDED_AT = "2026-07-24T00:05:00.000Z";
const INVALID_ACTOR = { type: "agent" as const, id: "invalid-batch-test" };
const INVALID_PROVENANCE = { source: "invalid approval consumption batch test" };
const INVALID_DIGEST_A = `sha256:${"a".repeat(64)}`;
const INVALID_DIGEST_B = `sha256:${"b".repeat(64)}`;
const INVALID_DIGEST_C = `sha256:${"c".repeat(64)}`;
const INVALID_DIGEST_D = `sha256:${"d".repeat(64)}`;

function INVALID_setupMutations(): readonly ResearchMutation[] {
  return [
    {
      kind: "workspace.create",
      workspace: { id: INVALID_WORKSPACE_ID, name: "Research", description: "" },
    },
    {
      kind: "repository.register",
      repository: {
        id: INVALID_REPOSITORY_ID,
        name: "Repository",
        kind: "code",
        locator: "repository",
        capabilities: { hasTrellis: false },
      },
    },
    {
      kind: "quest.create",
      quest: {
        id: INVALID_QUEST_ID,
        title: "Quest",
        description: "",
        repositoryIds: [INVALID_REPOSITORY_ID],
        artifactRefs: [],
      },
    },
    {
      kind: "campaign.create",
      campaign: {
        id: INVALID_CAMPAIGN_ID,
        questId: INVALID_QUEST_ID,
        title: "Campaign",
        protocolDigest: "protocol-v1",
      },
    },
    {
      kind: "run.create",
      run: { id: INVALID_RUN_ID, campaignId: INVALID_CAMPAIGN_ID, title: "Run" },
    },
    {
      kind: "dispatch.record",
      dispatch: {
        id: INVALID_DISPATCH_ID,
        questId: INVALID_QUEST_ID,
        campaignId: INVALID_CAMPAIGN_ID,
        runId: INVALID_RUN_ID,
        repositoryId: INVALID_REPOSITORY_ID,
        ownerSkill: "legacy",
        objective: "Bounded work",
        acceptanceCriteria: [],
        context: [],
        allowedWritePaths: [],
        expectedOutputs: [],
        checks: [],
        createdAt: INVALID_NOW,
      },
    },
    {
      kind: "activation.plan",
      activation: {
        id: INVALID_ACTIVATION_ID,
        dispatchId: INVALID_DISPATCH_ID,
        questId: INVALID_QUEST_ID,
        capabilityId: "research.setup.project",
        mode: "explicit",
        procedure: {
          id: "project-setup-v1",
          version: "1.0.0",
          digest: INVALID_DIGEST_A,
        },
        policyDigest: INVALID_DIGEST_B,
        requestDigest: INVALID_DIGEST_C,
        scopeHash: INVALID_DIGEST_D,
        maxDurationMinutes: 10,
        maxDispatches: 1,
        createdAt: INVALID_NOW,
      },
    },
    {
      kind: "approval.grant",
      approval: {
        id: INVALID_APPROVAL_ID,
        activationId: INVALID_ACTIVATION_ID,
        dispatchId: INVALID_DISPATCH_ID,
        host: "claude",
        mode: "interactive",
        approverLabel: "operator",
        rationale: "Approved",
        requestDigest: INVALID_DIGEST_C,
        procedureDigest: INVALID_DIGEST_A,
        policyDigest: INVALID_DIGEST_B,
        scopeHash: INVALID_DIGEST_D,
        grantedAt: INVALID_NOW,
        expiresAt: "2026-07-24T00:10:00.000Z",
      },
    },
  ];
}

function INVALID_resultMutation(): ResearchMutation {
  return {
    kind: "result.record",
    result: {
      id: INVALID_RESULT_ID,
      dispatchId: INVALID_DISPATCH_ID,
      runId: INVALID_RUN_ID,
      status: "completed",
      summary: "Complete",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt: INVALID_RECORDED_AT,
    },
  };
}

function INVALID_proposalMutation(): ResearchMutation {
  return {
    kind: "proposal.record",
    proposal: {
      id: INVALID_PROPOSAL_ID,
      dispatchId: INVALID_DISPATCH_ID,
      questId: INVALID_QUEST_ID,
      title: "No changes",
      operations: [],
      status: "pending",
      createdAt: INVALID_RECORDED_AT,
      updatedAt: INVALID_RECORDED_AT,
    },
  };
}

function INVALID_consumeMutation(
  resultId = INVALID_RESULT_ID,
  proposalId = INVALID_PROPOSAL_ID,
  approvalId = INVALID_APPROVAL_ID,
): ResearchMutation {
  return {
    kind: "approval.consume",
    approvalId,
    resultId,
    proposalId,
  };
}

function INVALID_invalidFamilies(): readonly (readonly ResearchMutation[])[] {
  const result = INVALID_resultMutation();
  const proposal = INVALID_proposalMutation();
  const consume = INVALID_consumeMutation();
  const extra: ResearchMutation = {
    kind: "run.status",
    runId: INVALID_RUN_ID,
    status: "running",
  };
  const crossDispatchProposal = INVALID_proposalMutation();
  if (crossDispatchProposal.kind !== "proposal.record") {
    throw new Error("Expected Proposal mutation");
  }
  crossDispatchProposal.proposal.dispatchId = INVALID_FOREIGN_DISPATCH_ID;
  return [
    [result],
    [proposal],
    [consume],
    [result, consume],
    [proposal, consume],
    [proposal, result],
    [consume, result, proposal],
    [result, consume, proposal],
    [result, proposal, INVALID_consumeMutation(INVALID_WRONG_RESULT_ID)],
    [
      result,
      proposal,
      INVALID_consumeMutation(INVALID_RESULT_ID, INVALID_WRONG_PROPOSAL_ID),
    ],
    [
      result,
      proposal,
      INVALID_consumeMutation(
        INVALID_RESULT_ID,
        INVALID_PROPOSAL_ID,
        INVALID_FOREIGN_APPROVAL_ID,
      ),
    ],
    [result, crossDispatchProposal, consume],
    [result, result, proposal, consume],
    [result, proposal, proposal, consume],
    [extra, result, proposal],
    [result, proposal, extra],
    [extra, result, proposal, consume],
    [result, proposal, consume, extra],
    [result, proposal, consume, consume],
  ];
}

describe("approval consumption invalid batch matrix", () => {
  let root: string;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-invalid-batch-"));
    await commitResearchBatch({
      root,
      actor: INVALID_ACTOR,
      provenance: INVALID_PROVENANCE,
      idempotencyKey: "setup",
      timestamp: INVALID_NOW,
      mutations: INVALID_setupMutations(),
    });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each(INVALID_invalidFamilies().map((mutations, index) => [index, mutations] as const))(
    "rejects invalid family %s without appending",
    async (index, mutations) => {
      const before = await readResearchLedger(root);
      await expect(
        commitResearchBatch({
          root,
          actor: INVALID_ACTOR,
          provenance: INVALID_PROVENANCE,
          idempotencyKey: `invalid-${index}`,
          timestamp: INVALID_RECORDED_AT,
          mutations,
        }),
      ).rejects.toThrow();
      expect(await readResearchLedger(root)).toEqual(before);
    },
  );
});

function READ_ONLY_snapshotTree(root: string): Map<string, string> {
  const snapshot = new Map<string, string>();
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isDirectory()) {
        snapshot.set(`${relative}/`, "directory");
        walk(absolute);
      } else {
        snapshot.set(relative, fs.readFileSync(absolute).toString("base64"));
      }
    }
  };
  walk(root);
  return snapshot;
}

describe("read-only research batch validation", () => {
  it("validates a new batch without creating lock or runtime state", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-read-only-new-"));
    try {
      fs.mkdirSync(path.join(root, ".trellis"));
      const before = READ_ONLY_snapshotTree(root);
      const validation = await validateResearchBatchReadOnly({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "read-only-new",
        timestamp: NOW,
        mutations: [
          {
            kind: "workspace.create",
            workspace: {
              id: createWorkspaceId(),
              name: "Read only",
              description: "",
            },
          },
        ],
      });

      expect(validation.events.map((event) => event.kind)).toEqual([
        "workspace.created",
      ]);
      expect(READ_ONLY_snapshotTree(root)).toEqual(before);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects an invalid batch without creating lock or runtime state", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-read-only-invalid-"));
    try {
      fs.mkdirSync(path.join(root, ".trellis"));
      const before = READ_ONLY_snapshotTree(root);

      await expect(
        validateResearchBatchReadOnly({
          root,
          actor: ACTOR,
          provenance: PROVENANCE,
          idempotencyKey: "read-only-invalid",
          timestamp: NOW,
          mutations: [
            {
              kind: "workspace.create",
              workspace: {
                id: createWorkspaceId(),
                name: "First",
                description: "",
              },
            },
            {
              kind: "workspace.create",
              workspace: {
                id: createWorkspaceId(),
                name: "Second",
                description: "",
              },
            },
          ],
        }),
      ).rejects.toThrow("Research workspace already exists");
      expect(READ_ONLY_snapshotTree(root)).toEqual(before);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns canonical replay from one snapshot without changing files", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-read-only-replay-"));
    try {
      const committed = await commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "read-only-replay",
        timestamp: NOW,
        mutations: [
          {
            kind: "workspace.create",
            workspace: {
              id: createWorkspaceId(),
              name: "Canonical",
              description: "",
            },
          },
        ],
      });
      const before = READ_ONLY_snapshotTree(root);
      const replay = await validateResearchBatchReadOnly({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "read-only-replay",
        timestamp: NOW,
        mutations: [
          {
            kind: "workspace.create",
            workspace: {
              id: createWorkspaceId(),
              name: "Ignored",
              description: "",
            },
          },
        ],
      });

      expect(replay.events).toEqual(committed.events);
      expect(replay.state.projectedThroughSeq).toBe(committed.headSeq);
      expect(READ_ONLY_snapshotTree(root)).toEqual(before);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

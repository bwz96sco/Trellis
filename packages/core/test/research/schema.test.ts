import { describe, expect, it } from "vitest";

import {
  artifactRefSchema,
  campaignSchema,
  claimSchema,
  createArtifactId,
  createCampaignId,
  createClaimId,
  createDecisionId,
  createDispatchId,
  createEvidenceId,
  createProposalId,
  createQuestId,
  createRepositoryId,
  createResultId,
  createRunId,
  createWorkspaceId,
  decisionSchema,
  dispatchSchema,
  evidenceSchema,
  normalizeArtifactPath,
  normalizeRepositoryLocator,
  proposalSchema,
  questSchema,
  repositorySchema,
  resolveArtifactPath,
  resultSchema,
  runSchema,
  workspaceSchema,
} from "../../src/research/index.js";

describe("research IDs", () => {
  it("creates UUID-backed IDs with canonical prefixes", () => {
    expect(createWorkspaceId()).toMatch(/^wsp_[0-9a-f-]{36}$/);
    expect(createRepositoryId()).toMatch(/^rep_[0-9a-f-]{36}$/);
    expect(createArtifactId()).toMatch(/^art_[0-9a-f-]{36}$/);
    expect(createQuestId()).toMatch(/^qst_[0-9a-f-]{36}$/);
    expect(createCampaignId()).toMatch(/^cmp_[0-9a-f-]{36}$/);
    expect(createRunId()).toMatch(/^run_[0-9a-f-]{36}$/);
    expect(createEvidenceId()).toMatch(/^evd_[0-9a-f-]{36}$/);
    expect(createClaimId()).toMatch(/^clm_[0-9a-f-]{36}$/);
    expect(createDispatchId()).toMatch(/^dsp_[0-9a-f-]{36}$/);
    expect(createResultId()).toMatch(/^res_[0-9a-f-]{36}$/);
    expect(createProposalId()).toMatch(/^prp_[0-9a-f-]{36}$/);
    expect(createDecisionId()).toMatch(/^dec_[0-9a-f-]{36}$/);
  });
});

describe("tracked research paths", () => {
  it("normalizes relative POSIX repository and artifact paths", () => {
    expect(normalizeRepositoryLocator("packages/../packages/core")).toBe(
      "packages/core",
    );
    expect(normalizeRepositoryLocator("../external/repo")).toBe(
      "../external/repo",
    );
    expect(normalizeArtifactPath("results/final.json")).toBe(
      "results/final.json",
    );
  });

  it("rejects absolute, NUL, empty-segment, and escaping artifact paths", () => {
    for (const value of [
      "/tmp/repo",
      "C:/repo",
      "C:repo",
      "C:\\repo",
      "repo\0file",
      "repo//file",
    ]) {
      expect(() => normalizeRepositoryLocator(value)).toThrow();
    }
    for (const value of ["../escape", "a/../../escape", "/tmp/file"]) {
      expect(() => normalizeArtifactPath(value)).toThrow();
    }
  });
});

describe("repository and artifact schemas", () => {
  it("parses repository capabilities and artifact revision provenance", () => {
    const timestamp = "2026-07-17T00:00:00.000Z";
    const repositoryId = createRepositoryId();
    expect(
      repositorySchema.parse({
        id: repositoryId,
        name: "papers",
        kind: "paper",
        locator: "../papers",
        expectedRemote: "git@example.test:papers.git",
        defaultBranch: "main",
        capabilities: { hasTrellis: false },
        createdAt: timestamp,
        updatedAt: timestamp,
      }).kind,
    ).toBe("paper");
    expect(
      artifactRefSchema.parse({
        id: createArtifactId(),
        repositoryId,
        path: "results/data.json",
        kind: "dataset",
        revision: "abc123",
      }).revision,
    ).toBe("abc123");
    expect(() =>
      repositorySchema.parse({
        id: repositoryId,
        name: "invalid",
        kind: "binary",
        locator: "repo",
        capabilities: { hasTrellis: false },
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ).toThrow(/repository.kind/);
  });

  it("rejects tracked absolute repository and artifact paths", () => {
    expect(() =>
      repositorySchema.parse({
        id: createRepositoryId(),
        name: "core",
        kind: "code",
        locator: "/absolute/repo",
        capabilities: { hasTrellis: true },
        createdAt: "2026-07-17T00:00:00.000Z",
        updatedAt: "2026-07-17T00:00:00.000Z",
      }),
    ).toThrow(/relative/);

    expect(() =>
      artifactRefSchema.parse({
        id: createArtifactId(),
        repositoryId: createRepositoryId(),
        path: "/absolute/result.json",
      }),
    ).toThrow(/relative/);
  });

  it("revalidates repository locators in public artifact resolution", () => {
    const repositoryId = createRepositoryId();
    expect(() =>
      resolveArtifactPath(
        "/tmp/research-root",
        {
          id: repositoryId,
          name: "invalid",
          kind: "code",
          locator: "/machine-local/repository",
          capabilities: { hasTrellis: false },
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z",
        },
        {
          id: createArtifactId(),
          repositoryId,
          path: "result.json",
        },
      ),
    ).toThrow(/relative/);
  });
});

describe("workspace and tracked entity schemas", () => {
  it("rejects invalid shapes for every tracked entity", () => {
    const timestamp = "2026-07-17T00:00:00.000Z";
    const workspaceId = createWorkspaceId();
    const repositoryId = createRepositoryId();
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    const evidenceId = createEvidenceId();

    const cases: (() => unknown)[] = [
      () =>
        workspaceSchema.parse({
          id: workspaceId,
          name: "Research",
          description: "",
          questIds: [],
          campaignIds: [],
          repositoryIds: [],
          createdAt: timestamp,
          updatedAt: "not-a-timestamp",
        }),
      () =>
        questSchema.parse({
          id: questId,
          title: "Quest",
          description: "",
          status: "unknown",
          stage: "setup",
          repositoryIds: [repositoryId],
          artifactRefs: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      () =>
        campaignSchema.parse({
          id: campaignId,
          questId,
          title: "Campaign",
          status: "draft",
          protocolDigest: "",
          runIds: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      () =>
        runSchema.parse({
          id: runId,
          campaignId,
          title: "Run",
          status: "unknown",
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      () =>
        evidenceSchema.parse({
          id: evidenceId,
          questId,
          summary: "Evidence",
          status: "unknown",
          artifactRefs: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      () =>
        claimSchema.parse({
          id: createClaimId(),
          questId,
          statement: "Claim",
          status: "unknown",
          evidenceIds: [evidenceId],
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
    ];

    for (const parse of cases) expect(parse).toThrow();
  });
});

describe("dispatch/result/proposal/decision schemas", () => {
  it("parses portable typed contracts and rejects arbitrary operations", () => {
    const runId = createRunId();
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const repositoryId = createRepositoryId();
    const dispatchId = createDispatchId();
    const proposalId = createProposalId();
    const timestamp = "2026-07-17T00:00:00.000Z";

    expect(
      dispatchSchema.parse({
        id: dispatchId,
        questId,
        campaignId,
        runId,
        repositoryId,
        ownerSkill: "research-runner",
        provider: "claude",
        objective: "Review the evidence",
        acceptanceCriteria: ["Summarize findings"],
        context: [],
        allowedWritePaths: ["results/report.json"],
        expectedOutputs: ["report"],
        checks: ["pnpm test"],
        createdAt: timestamp,
      }).provider,
    ).toBe("claude");
    expect(
      resultSchema.parse({
        id: createResultId(),
        dispatchId,
        runId,
        status: "completed",
        summary: "Complete",
        commands: ["pnpm test"],
        checks: ["passed"],
        artifactRefs: [],
        blockers: [],
        createdAt: timestamp,
      }).status,
    ).toBe("completed");
    expect(
      proposalSchema.parse({
        id: proposalId,
        dispatchId,
        questId,
        title: "Advance quest",
        operations: [{ kind: "quest.stage", questId, stage: "audit" }],
        status: "pending",
        createdAt: timestamp,
        updatedAt: timestamp,
      }).operations,
    ).toEqual([{ kind: "quest.stage", questId, stage: "audit" }]);
    expect(
      decisionSchema.parse({
        id: createDecisionId(),
        proposalId,
        outcome: "accept",
        selectedOperationIndexes: [0],
        rationale: "Improves confidence.",
        reviewer: "trellis-cli",
        createdAt: timestamp,
      }).selectedOperationIndexes,
    ).toEqual([0]);

    expect(() =>
      dispatchSchema.parse({
        id: dispatchId,
        questId,
        runId,
        repositoryId,
        ownerSkill: "research-runner",
        objective: "Review",
        acceptanceCriteria: [],
        context: [],
        allowedWritePaths: ["../escape"],
        expectedOutputs: [],
        checks: [],
        createdAt: timestamp,
      }),
    ).toThrow(/escape/);
    expect(() =>
      dispatchSchema.parse({
        id: dispatchId,
        questId,
        runId,
        repositoryId,
        ownerSkill: "research-runner",
        objective: "Review",
        acceptanceCriteria: [],
        context: [],
        allowedWritePaths: [],
        expectedOutputs: [],
        checks: [],
        taskRef: "/tmp/task.json",
        createdAt: timestamp,
      }),
    ).toThrow(/portable reference/);
    expect(() =>
      resultSchema.parse({
        id: createResultId(),
        dispatchId,
        runId,
        status: "completed",
        summary: "Complete",
        commands: [],
        checks: [],
        artifactRefs: [],
        blockers: [],
        sessionRef: "C:\\sessions\\worker.jsonl",
        createdAt: timestamp,
      }),
    ).toThrow(/portable reference/);
    expect(() =>
      proposalSchema.parse({
        id: proposalId,
        dispatchId,
        questId,
        title: "Arbitrary event",
        operations: [{ kind: "event.append", payload: {} }],
        status: "pending",
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    ).toThrow(/not supported/);
  });
});

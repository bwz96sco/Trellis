import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createCampaignId,
  createClaimId,
  createEvidenceId,
  createEventId,
  createQuestId,
  createRunId,
  readResearchLedger,
  readResearchState,
  ResearchProjectionError,
  researchPaths,
  type QuestId,
  type RepositoryId,
  type QuestStage,
  type QuestStatus,
} from "@mindfoldhq/trellis-core/research";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createResearchCampaign,
  createResearchClaim,
  createResearchEvidence,
  createResearchQuest,
  createResearchRun,
  freezeResearchCampaign,
  initializeResearch,
  invalidateResearchRun,
  rebuildResearch,
  researchStatus,
  setResearchCampaignStatus,
  setResearchClaimStatus,
  setResearchEvidenceStatus,
  setResearchQuestStage,
  setResearchQuestStatus,
  setResearchRunStatus,
  updateResearchCampaignProtocol,
  validateResearch,
} from "../../src/commands/research/command.js";
import {
  renderResearchError,
  renderResearchResult,
} from "../../src/commands/research/common.js";
import { registerResearchCommand } from "../../src/commands/research/index.js";
import { addResearchRepository } from "../../src/commands/research/repository.js";

const noop = (): void => undefined;

function snapshotFiles(root: string): Map<string, string> {
  const files = new Map<string, string>();
  if (!fs.existsSync(root)) return files;
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else
        files.set(
          path.relative(root, absolute),
          fs.readFileSync(absolute, "utf-8"),
        );
    }
  };
  walk(root);
  return files;
}

describe("research lifecycle integration", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-int-"));
    fs.mkdirSync(path.join(root, ".trellis"));
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    process.exitCode = undefined;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("initializes once, reports status, and rejects conflicting initialization", async () => {
    expect(await researchStatus({ root })).toMatchObject({
      initialized: false,
      workspace: null,
      headSeq: 0,
      eventCount: 0,
    });

    const created = await initializeResearch({
      root,
      name: "Methods lab",
      description: "Reproducible experiments",
    });
    expect(created.created).toBe(true);
    expect(created.events).toHaveLength(1);
    expect(created.headSeq).toBe(1);
    expect(created.workspace.name).toBe("Methods lab");

    const repeated = await initializeResearch({
      root,
      name: "Methods lab",
      description: "Reproducible experiments",
    });
    expect(repeated).toMatchObject({
      created: false,
      replayed: true,
      headSeq: 1,
    });
    expect(repeated.events).toEqual([]);
    expect(await readResearchLedger(root)).toHaveLength(1);

    await expect(
      initializeResearch({ root, name: "Different lab" }),
    ).rejects.toThrow(/already initialized/);
    expect(await readResearchLedger(root)).toHaveLength(1);

    expect(await researchStatus({ root })).toMatchObject({
      command: "research status",
      initialized: true,
      headSeq: 1,
      eventCount: 1,
      projectionStale: false,
      counts: {
        repositories: 0,
        quests: 0,
        campaigns: 0,
        runs: 0,
        evidence: 0,
        claims: 0,
        dispatches: 0,
        results: 0,
        proposals: 0,
        decisions: 0,
      },
    });
  });

  it("validates strict ledgers without rewriting malformed input", async () => {
    await initializeResearch({ root, name: "Validation lab" });
    const valid = await validateResearch({ root });
    expect(valid).toMatchObject({ valid: true, initialized: true, headSeq: 1 });

    const eventsFile = researchPaths(root).eventsFile;
    fs.appendFileSync(eventsFile, "{not-json}\n", "utf-8");
    const before = fs.readFileSync(eventsFile, "utf-8");

    await expect(validateResearch({ root })).rejects.toThrow(
      /events\.jsonl line 2/,
    );
    expect(fs.readFileSync(eventsFile, "utf-8")).toBe(before);
  });

  it("rejects invalid event shapes, sequences, and reducer failures", async () => {
    await initializeResearch({ root, name: "Strict validation lab" });
    const paths = researchPaths(root);
    const event = (await readResearchLedger(root))[0];
    if (!event) throw new Error("Expected initialized workspace event");

    fs.writeFileSync(
      paths.eventsFile,
      `${JSON.stringify({ ...event, unexpected: true })}\n`,
      "utf-8",
    );
    await expect(validateResearch({ root })).rejects.toThrow(/unexpected/);

    fs.writeFileSync(
      paths.eventsFile,
      `${JSON.stringify({ ...event, seq: 2 })}\n`,
      "utf-8",
    );
    await expect(validateResearch({ root })).rejects.toThrow(
      /expected seq 1, received 2/,
    );

    fs.writeFileSync(
      paths.eventsFile,
      `${JSON.stringify(event)}\n${JSON.stringify({
        ...event,
        eventId: createEventId(),
        seq: 2,
      })}\n`,
      "utf-8",
    );
    await expect(validateResearch({ root })).rejects.toThrow(
      /workspace already exists/,
    );
  });

  it("rebuilds missing projections without changing the ledger and is byte-stable", async () => {
    await initializeResearch({ root, name: "Projection lab" });
    const paths = researchPaths(root);
    const ledgerBefore = fs.readFileSync(paths.eventsFile, "utf-8");
    fs.rmSync(paths.workspaceFile, { force: true });
    fs.rmSync(paths.cacheFile, { force: true });

    const rebuilt = await rebuildResearch({ root });
    expect(rebuilt).toMatchObject({
      command: "research rebuild",
      initialized: true,
      projectionStale: false,
      projectedThroughSeq: 1,
    });
    expect(fs.readFileSync(paths.eventsFile, "utf-8")).toBe(ledgerBefore);

    const first = snapshotFiles(paths.researchDir);
    await rebuildResearch({ root });
    expect(snapshotFiles(paths.researchDir)).toEqual(first);
    expect(fs.readFileSync(paths.eventsFile, "utf-8")).toBe(ledgerBefore);
  });

  it("supports create operations and allowed and forbidden lifecycle transitions", async () => {
    await initializeResearch({ root, name: "Lifecycle lab" });

    const questId = createQuestId();
    await createResearchQuest({
      root,
      id: questId,
      title: "Evaluate method X",
      description: "",
    });
    await setResearchQuestStage({ root, questId, stage: "literature" });
    await setResearchQuestStatus({ root, questId, status: "paused" });
    await setResearchQuestStatus({ root, questId, status: "active" });
    const questHead = (await researchStatus({ root })).headSeq;
    await expect(
      setResearchQuestStatus({ root, questId, status: "active" }),
    ).rejects.toThrow("Invalid quest status transition: active -> active");
    expect((await researchStatus({ root })).headSeq).toBe(questHead);

    const campaignId = createCampaignId();
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Baseline",
      protocolDigest: "protocol-v1",
    });
    await updateResearchCampaignProtocol({
      root,
      campaignId,
      protocolDigest: "protocol-v2",
    });
    await freezeResearchCampaign({ root, campaignId });
    await setResearchCampaignStatus({ root, campaignId, status: "running" });
    await setResearchCampaignStatus({ root, campaignId, status: "blocked" });
    const campaignHead = (await researchStatus({ root })).headSeq;
    await expect(
      updateResearchCampaignProtocol({
        root,
        campaignId,
        protocolDigest: "protocol-v3",
      }),
    ).rejects.toThrow(/immutable after frozen/);
    expect((await researchStatus({ root })).headSeq).toBe(campaignHead);

    await setResearchCampaignStatus({ root, campaignId, status: "running" });
    const runId = createRunId();
    await createResearchRun({ root, id: runId, campaignId, title: "Trial 1" });
    await setResearchRunStatus({ root, runId, status: "running" });
    await setResearchRunStatus({ root, runId, status: "succeeded" });
    const runHead = (await researchStatus({ root })).headSeq;
    await expect(
      setResearchRunStatus({ root, runId, status: "running" }),
    ).rejects.toThrow("Invalid run status transition: succeeded -> running");
    expect((await researchStatus({ root })).headSeq).toBe(runHead);

    const invalidatedRunId = createRunId();
    await createResearchRun({
      root,
      id: invalidatedRunId,
      campaignId,
      title: "Invalid trial",
    });
    await invalidateResearchRun({
      root,
      runId: invalidatedRunId,
      reason: "Contaminated input",
    });
    await expect(
      invalidateResearchRun({
        root,
        runId: invalidatedRunId,
        reason: "Again",
      }),
    ).rejects.toThrow(/already invalidated/);

    const evidenceId = createEvidenceId();
    await createResearchEvidence({
      root,
      id: evidenceId,
      questId,
      runId,
      summary: "Method X improved the metric",
    });
    await setResearchEvidenceStatus({
      root,
      evidenceId,
      status: "superseded",
    });
    await expect(
      setResearchEvidenceStatus({ root, evidenceId, status: "active" }),
    ).rejects.toThrow(
      "Invalid evidence status transition: superseded -> active",
    );

    const claimId = createClaimId();
    await createResearchClaim({
      root,
      id: claimId,
      questId,
      statement: "Method X is better under the tested conditions",
      evidenceIds: [evidenceId],
    });
    await setResearchClaimStatus({ root, claimId, status: "supported" });
    await setResearchClaimStatus({ root, claimId, status: "contested" });
    await expect(
      setResearchClaimStatus({ root, claimId, status: "candidate" }),
    ).rejects.toThrow(
      "Invalid claim status transition: contested -> candidate",
    );

    const status = await researchStatus({ root });
    expect(status.counts).toEqual({
      repositories: 0,
      quests: 1,
      campaigns: 1,
      runs: 2,
      evidence: 1,
      claims: 1,
      dispatches: 0,
      results: 0,
      proposals: 0,
      decisions: 0,
    });
  });

  it("creates quests with omitted, deduplicated, and validated repository associations", async () => {
    await initializeResearch({ root, name: "Repository quest lab" });
    const first = (
      await addResearchRepository({
        root,
        name: "code",
        kind: "code",
        locator: "repos/code",
      })
    ).repository;
    const second = (
      await addResearchRepository({
        root,
        name: "notes",
        kind: "notes",
        locator: "repos/notes",
      })
    ).repository;

    const omittedId = createQuestId();
    await createResearchQuest({
      root,
      id: omittedId,
      title: "Unassociated quest",
    });
    expect(
      (await readResearchState(root)).quests[omittedId]?.repositoryIds,
    ).toEqual([]);

    const associatedId = createQuestId();
    await createResearchQuest({
      root,
      id: associatedId,
      title: "Associated quest",
      repositoryIds: [first.id, second.id, first.id],
    });
    expect(
      (await readResearchState(root)).quests[associatedId]?.repositoryIds,
    ).toEqual([first.id, second.id]);

    const beforeInvalid = await readResearchLedger(root);
    await expect(
      createResearchQuest({
        root,
        title: "Malformed repository",
        repositoryIds: ["rep_not-a-uuid" as RepositoryId],
      }),
    ).rejects.toThrow(/rep_ prefixed UUID/);
    await expect(
      createResearchQuest({
        root,
        title: "Unknown repository",
        repositoryIds: [
          "rep_123e4567-e89b-42d3-a456-426614174000" as RepositoryId,
        ],
      }),
    ).rejects.toThrow(/Unknown research repository/);
    expect(await readResearchLedger(root)).toEqual(beforeInvalid);
  });

  it("rejects invalid IDs, statuses, and stages before appending", async () => {
    await initializeResearch({ root, name: "Input validation lab" });
    const questId = createQuestId();
    await createResearchQuest({ root, id: questId, title: "Valid quest" });
    const before = await readResearchLedger(root);

    await expect(
      setResearchQuestStatus({
        root,
        questId: "qst_not-a-uuid" as QuestId,
        status: "paused",
      }),
    ).rejects.toThrow(/qst_ prefixed UUID/);
    await expect(
      setResearchQuestStatus({
        root,
        questId,
        status: "unknown" as QuestStatus,
      }),
    ).rejects.toThrow(/quest status must be one of/);
    await expect(
      setResearchQuestStage({
        root,
        questId,
        stage: "unknown" as QuestStage,
      }),
    ).rejects.toThrow(/quest stage must be one of/);

    expect(await readResearchLedger(root)).toEqual(before);
  });

  it("keeps dry-run file-free and treats duplicate idempotency keys as success", async () => {
    await initializeResearch({ root, name: "Dry run lab" });
    const paths = researchPaths(root);
    const before = snapshotFiles(path.join(root, ".trellis"));
    const questId = createQuestId();

    const dryRun = await createResearchQuest({
      root,
      id: questId,
      title: "Prospective quest",
      dryRun: true,
      idempotencyKey: "quest:prospective",
    });
    expect(dryRun).toMatchObject({
      dryRun: true,
      replayed: false,
      headSeq: 2,
      idempotencyKey: "quest:prospective",
    });
    expect(dryRun.events).toHaveLength(1);
    expect(snapshotFiles(path.join(root, ".trellis"))).toEqual(before);
    expect(fs.existsSync(path.join(paths.questsDir, questId))).toBe(false);

    const committed = await createResearchQuest({
      root,
      id: questId,
      title: "Prospective quest",
      idempotencyKey: "quest:commit",
    });
    const replayed = await createResearchQuest({
      root,
      id: createQuestId(),
      title: "Ignored on replay",
      idempotencyKey: "quest:commit",
    });
    expect(committed.replayed).toBe(false);
    expect(replayed).toMatchObject({ replayed: true, headSeq: 2 });
    expect(replayed.events).toEqual(committed.events);
    expect(await readResearchLedger(root)).toHaveLength(2);
  });

  it("reports committed projection failures with an explicit rebuild recovery", async () => {
    await initializeResearch({ root, name: "Recovery lab" });
    const questId = createQuestId();
    const projectionFile = path.join(
      researchPaths(root).questsDir,
      questId,
      "quest.json",
    );
    fs.mkdirSync(projectionFile, { recursive: true });

    let failure: unknown;
    try {
      await createResearchQuest({ root, id: questId, title: "Recoverable" });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ResearchProjectionError);
    expect(await readResearchLedger(root)).toHaveLength(2);

    renderResearchError(failure, true);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(String(vi.mocked(console.error).mock.calls[0]?.[0])),
    ).toEqual({
      error:
        "Research events committed through seq 2, but projection update failed",
      committed: true,
      headSeq: 2,
      recovery: "trellis research rebuild",
    });
  });

  it("emits one JSON document through registered Commander actions", async () => {
    await initializeResearch({ root, name: "Commander lab" });
    const program = new Command().exitOverride();
    program.name("trellis");
    registerResearchCommand(program);
    vi.mocked(console.log).mockClear();

    await program.parseAsync(
      ["node", "trellis", "research", "status", "--root", root, "--json"],
      { from: "node" },
    );

    expect(console.log).toHaveBeenCalledTimes(1);
    const output = JSON.parse(
      String(vi.mocked(console.log).mock.calls[0]?.[0]),
    );
    expect(output).toMatchObject({
      command: "research status",
      initialized: true,
      headSeq: 1,
    });
  });

  it("collects repeated quest repository IDs through Commander", async () => {
    await initializeResearch({ root, name: "Quest repository CLI lab" });
    const first = (
      await addResearchRepository({
        root,
        name: "code",
        kind: "code",
        locator: "repos/code",
      })
    ).repository;
    const second = (
      await addResearchRepository({
        root,
        name: "paper",
        kind: "paper",
        locator: "repos/paper",
      })
    ).repository;
    const questId = createQuestId();
    const program = new Command().exitOverride();
    program.name("trellis");
    registerResearchCommand(program);
    vi.mocked(console.log).mockClear();

    await program.parseAsync(
      [
        "node",
        "trellis",
        "research",
        "quest",
        "create",
        "--id",
        questId,
        "--title",
        "Repository-associated quest",
        "--repository",
        first.id,
        "--repository",
        second.id,
        "--repository",
        first.id,
        "--root",
        root,
        "--json",
      ],
      { from: "node" },
    );

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(
      (await readResearchState(root)).quests[questId]?.repositoryIds,
    ).toEqual([first.id, second.id]);
  });

  it("collects repeated claim evidence IDs through Commander", async () => {
    await initializeResearch({ root, name: "Claim CLI lab" });
    const questId = createQuestId();
    const firstEvidenceId = createEvidenceId();
    const secondEvidenceId = createEvidenceId();
    await createResearchQuest({ root, id: questId, title: "Claim quest" });
    await createResearchEvidence({
      root,
      id: firstEvidenceId,
      questId,
      summary: "First observation",
    });
    await createResearchEvidence({
      root,
      id: secondEvidenceId,
      questId,
      summary: "Second observation",
    });

    const program = new Command().exitOverride();
    program.name("trellis");
    registerResearchCommand(program);
    vi.mocked(console.log).mockClear();
    await program.parseAsync(
      [
        "node",
        "trellis",
        "research",
        "claim",
        "create",
        "--quest",
        questId,
        "--statement",
        "Both observations support the claim",
        "--evidence",
        firstEvidenceId,
        secondEvidenceId,
        "--root",
        root,
        "--json",
      ],
      { from: "node" },
    );

    const output = JSON.parse(
      String(vi.mocked(console.log).mock.calls[0]?.[0]),
    );
    expect(output).toMatchObject({
      command: "research claim create",
      headSeq: 5,
    });
    expect((await researchStatus({ root })).counts.claims).toBe(1);
  });

  it("prints compact generated IDs and mutation state in human mode", async () => {
    await initializeResearch({ root, name: "Human output lab" });
    const result = await createResearchQuest({
      root,
      title: "Readable output",
    });
    vi.mocked(console.log).mockClear();

    renderResearchResult(result, false);

    expect(console.log).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(console.log).mock.calls[0]?.[0]);
    expect(line).toContain(result.events[0]?.aggregate.id);
    expect(line).toContain("head=2");
    expect(line).toContain("replayed=false");
    expect(line).toContain("dryRun=false");
  });

  it("sets and clears the explicit session current_run after canonical Run mutations", async () => {
    await initializeResearch({ root, name: "Run pointer lab" });
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    const invalidatedRunId = createRunId();
    await createResearchQuest({ root, id: questId, title: "Pointer quest" });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Pointer campaign",
      protocolDigest: "pointer-v1",
    });
    await freezeResearchCampaign({ root, campaignId });
    await setResearchCampaignStatus({ root, campaignId, status: "running" });
    await createResearchRun({
      root,
      id: runId,
      campaignId,
      title: "Pointer run",
    });
    await createResearchRun({
      root,
      id: invalidatedRunId,
      campaignId,
      title: "Invalidated pointer run",
    });

    vi.stubEnv("TRELLIS_CONTEXT_ID", "research-pointer");
    const sessionFile = path.join(
      root,
      ".trellis",
      ".runtime",
      "sessions",
      "research-pointer.json",
    );
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(
      sessionFile,
      `${JSON.stringify(
        {
          current_task: ".trellis/tasks/07-17-task",
          future: { keep: true },
        },
        null,
        2,
      )}\n`,
    );

    await setResearchRunStatus({ root, runId, status: "running" });
    expect(JSON.parse(fs.readFileSync(sessionFile, "utf-8"))).toMatchObject({
      current_task: ".trellis/tasks/07-17-task",
      current_run: runId,
      future: { keep: true },
    });

    await setResearchRunStatus({ root, runId, status: "succeeded" });
    const afterTerminal = JSON.parse(
      fs.readFileSync(sessionFile, "utf-8"),
    ) as Record<string, unknown>;
    expect(afterTerminal).not.toHaveProperty("current_run");
    expect(afterTerminal).toMatchObject({
      current_task: ".trellis/tasks/07-17-task",
      future: { keep: true },
    });

    await setResearchRunStatus({
      root,
      runId: invalidatedRunId,
      status: "running",
    });
    expect(JSON.parse(fs.readFileSync(sessionFile, "utf-8"))).toMatchObject({
      current_run: invalidatedRunId,
    });
    await invalidateResearchRun({
      root,
      runId: invalidatedRunId,
      reason: "Contaminated fixture",
    });
    expect(
      JSON.parse(fs.readFileSync(sessionFile, "utf-8")),
    ).not.toHaveProperty("current_run");
  });

  it("preserves non-matching pointers and skips dry-run, invalid, and missing-context updates", async () => {
    await initializeResearch({ root, name: "Run pointer guard lab" });
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    await createResearchQuest({ root, id: questId, title: "Guard quest" });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Guard campaign",
      protocolDigest: "guard-v1",
    });
    await freezeResearchCampaign({ root, campaignId });
    await setResearchCampaignStatus({ root, campaignId, status: "running" });
    await createResearchRun({
      root,
      id: runId,
      campaignId,
      title: "Guard run",
    });

    vi.stubEnv("TRELLIS_CONTEXT_ID", "research-guard");
    const sessionFile = path.join(
      root,
      ".trellis",
      ".runtime",
      "sessions",
      "research-guard.json",
    );
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(sessionFile, '{"current_run":"run_other"}\n');

    await setResearchRunStatus({
      root,
      runId,
      status: "running",
      dryRun: true,
    });
    expect(JSON.parse(fs.readFileSync(sessionFile, "utf-8"))).toEqual({
      current_run: "run_other",
    });
    await expect(
      setResearchRunStatus({ root, runId, status: "succeeded" }),
    ).rejects.toThrow(/Invalid run status transition/);
    expect(JSON.parse(fs.readFileSync(sessionFile, "utf-8"))).toEqual({
      current_run: "run_other",
    });

    vi.stubEnv("TRELLIS_CONTEXT_ID", "");
    await setResearchRunStatus({
      root,
      runId,
      status: "running",
      idempotencyKey: "pointer:running",
    });
    expect(fs.readdirSync(path.dirname(sessionFile))).toEqual([
      "research-guard.json",
    ]);

    vi.stubEnv("TRELLIS_CONTEXT_ID", "research-guard");
    const replayed = await setResearchRunStatus({
      root,
      runId,
      status: "succeeded",
      idempotencyKey: "pointer:running",
    });
    expect(replayed.replayed).toBe(true);
    expect(replayed.events[0]).toMatchObject({
      kind: "run.status_changed",
      payload: { status: "running" },
    });
    expect(JSON.parse(fs.readFileSync(sessionFile, "utf-8"))).toEqual({
      current_run: "run_other",
    });

    await setResearchRunStatus({ root, runId, status: "succeeded" });
    expect(JSON.parse(fs.readFileSync(sessionFile, "utf-8"))).toEqual({
      current_run: "run_other",
    });
  });

  it("keeps canonical Run success when the best-effort session write fails", async () => {
    await initializeResearch({ root, name: "Run pointer failure lab" });
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    await createResearchQuest({ root, id: questId, title: "Failure quest" });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Failure campaign",
      protocolDigest: "failure-v1",
    });
    await freezeResearchCampaign({ root, campaignId });
    await setResearchCampaignStatus({ root, campaignId, status: "running" });
    await createResearchRun({
      root,
      id: runId,
      campaignId,
      title: "Failure run",
    });

    vi.stubEnv("TRELLIS_CONTEXT_ID", "research-write-failure");
    const sessionsPath = path.join(root, ".trellis", ".runtime", "sessions");
    fs.mkdirSync(path.dirname(sessionsPath), { recursive: true });
    fs.writeFileSync(sessionsPath, "not a directory");

    const result = await setResearchRunStatus({
      root,
      runId,
      status: "running",
    });
    expect(result.events).toHaveLength(1);
    expect(result.runtimeWarnings?.[0]).toContain(
      "Research ledger committed, but current_run session update failed",
    );
    expect((await researchStatus({ root })).headSeq).toBe(result.headSeq);
  });
});

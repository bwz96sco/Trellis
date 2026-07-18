import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  commitResearchBatch,
  createCampaignId,
  createDispatchId,
  createQuestId,
  createRepositoryId,
  createRunId,
  readResearchLedger,
  type CampaignId,
  type DispatchId,
  type QuestId,
  type RepositoryId,
  type RunId,
} from "@mindfoldhq/trellis-core/research";
import {
  emptyTaskRecord,
  loadTaskRecord,
  writeTaskRecord,
} from "@mindfoldhq/trellis-core/task";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initializeResearch } from "../../src/commands/research/command.js";
import { registerResearchCommand } from "../../src/commands/research/index.js";
import {
  linkResearchTask,
  unlinkResearchTask,
} from "../../src/commands/research/task.js";

interface FixtureIds {
  repositoryId: RepositoryId;
  otherRepositoryId: RepositoryId;
  questId: QuestId;
  otherQuestId: QuestId;
  campaignId: CampaignId;
  otherCampaignId: CampaignId;
  runId: RunId;
  otherRunId: RunId;
  dispatchId: DispatchId;
  otherDispatchId: DispatchId;
}

const noop = (): void => undefined;
const TASK_NAME = "07-17-linked-task";

function taskDir(root: string, taskName = TASK_NAME): string {
  return path.join(root, ".trellis", "tasks", taskName);
}

function createTask(root: string, taskName = TASK_NAME): string {
  const directory = taskDir(root, taskName);
  writeTaskRecord({
    taskDir: directory,
    record: emptyTaskRecord({
      id: taskName,
      name: taskName,
      title: "Linked task",
      creator: "test",
      assignee: "test",
      createdAt: "2026-07-17",
      meta: {
        sibling: { keep: true },
        research: { custom: "preserve" },
      },
    }),
  });
  const file = path.join(directory, "task.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
  raw.unknownTopLevel = { keep: true };
  fs.writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`, "utf-8");
  return directory;
}

async function seedResearch(root: string): Promise<FixtureIds> {
  await initializeResearch({ root, name: "Task link lab" });
  const ids: FixtureIds = {
    repositoryId: createRepositoryId(),
    otherRepositoryId: createRepositoryId(),
    questId: createQuestId(),
    otherQuestId: createQuestId(),
    campaignId: createCampaignId(),
    otherCampaignId: createCampaignId(),
    runId: createRunId(),
    otherRunId: createRunId(),
    dispatchId: createDispatchId(),
    otherDispatchId: createDispatchId(),
  };
  const createdAt = "2026-07-17T00:00:00.000Z";
  await commitResearchBatch({
    root,
    actor: { type: "agent", id: "test" },
    provenance: { source: "research task integration fixture" },
    idempotencyKey: "fixture:research-task-links",
    timestamp: createdAt,
    mutations: [
      {
        kind: "repository.register",
        repository: {
          id: ids.repositoryId,
          name: "primary",
          kind: "code",
          locator: "repos/primary",
          capabilities: { hasTrellis: true },
        },
      },
      {
        kind: "repository.register",
        repository: {
          id: ids.otherRepositoryId,
          name: "other",
          kind: "code",
          locator: "repos/other",
          capabilities: { hasTrellis: true },
        },
      },
      {
        kind: "quest.create",
        quest: {
          id: ids.questId,
          title: "Primary quest",
          description: "",
          repositoryIds: [ids.repositoryId],
          artifactRefs: [],
        },
      },
      {
        kind: "quest.create",
        quest: {
          id: ids.otherQuestId,
          title: "Other quest",
          description: "",
          repositoryIds: [ids.otherRepositoryId],
          artifactRefs: [],
        },
      },
      {
        kind: "campaign.create",
        campaign: {
          id: ids.campaignId,
          questId: ids.questId,
          title: "Primary campaign",
          protocolDigest: "primary-v1",
        },
      },
      {
        kind: "campaign.create",
        campaign: {
          id: ids.otherCampaignId,
          questId: ids.otherQuestId,
          title: "Other campaign",
          protocolDigest: "other-v1",
        },
      },
      {
        kind: "run.create",
        run: {
          id: ids.runId,
          campaignId: ids.campaignId,
          title: "Primary run",
        },
      },
      {
        kind: "run.create",
        run: {
          id: ids.otherRunId,
          campaignId: ids.otherCampaignId,
          title: "Other run",
        },
      },
      {
        kind: "dispatch.record",
        dispatch: {
          id: ids.dispatchId,
          questId: ids.questId,
          campaignId: ids.campaignId,
          runId: ids.runId,
          repositoryId: ids.repositoryId,
          ownerSkill: "trellis-research",
          objective: "Primary dispatch",
          acceptanceCriteria: [],
          context: [],
          allowedWritePaths: [],
          expectedOutputs: [],
          checks: [],
          createdAt,
        },
      },
      {
        kind: "dispatch.record",
        dispatch: {
          id: ids.otherDispatchId,
          questId: ids.otherQuestId,
          campaignId: ids.otherCampaignId,
          runId: ids.otherRunId,
          repositoryId: ids.otherRepositoryId,
          ownerSkill: "trellis-research",
          objective: "Other dispatch",
          acceptanceCriteria: [],
          context: [],
          allowedWritePaths: [],
          expectedOutputs: [],
          checks: [],
          createdAt,
        },
      },
    ],
  });
  return ids;
}

describe("research Task links", () => {
  let root: string;
  let ids: FixtureIds;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-task-"));
    fs.mkdirSync(path.join(root, ".trellis"));
    createTask(root);
    ids = await seedResearch(root);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("links canonical entities, preserves unknown fields, and leaves the ledger unchanged", async () => {
    const ledgerBefore = fs.readFileSync(
      path.join(root, ".trellis", "research", "events.jsonl"),
      "utf-8",
    );

    const partial = await linkResearchTask({
      root,
      task: TASK_NAME,
      questId: ids.questId,
    });
    expect(partial.changed).toBe(true);

    const linked = await linkResearchTask({
      root,
      task: TASK_NAME,
      campaignId: ids.campaignId,
      runId: ids.runId,
      dispatchId: ids.dispatchId,
      repositoryId: ids.repositoryId,
    });
    expect(linked).toMatchObject({
      command: "research task link",
      task: `.trellis/tasks/${TASK_NAME}`,
      changed: true,
      research: {
        custom: "preserve",
        questId: ids.questId,
        campaignId: ids.campaignId,
        runId: ids.runId,
        dispatchId: ids.dispatchId,
        repositoryId: ids.repositoryId,
      },
    });

    const file = path.join(taskDir(root), "task.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as {
      meta: Record<string, unknown>;
      unknownTopLevel: unknown;
      status: string;
    };
    expect(raw.meta.sibling).toEqual({ keep: true });
    expect(raw.unknownTopLevel).toEqual({ keep: true });
    expect(raw.status).toBe("planning");
    expect(fs.readFileSync(path.join(root, ".trellis", "research", "events.jsonl"), "utf-8")).toBe(
      ledgerBefore,
    );
    expect(await readResearchLedger(root)).toHaveLength(11);

    const repeated = await linkResearchTask({
      root,
      task: TASK_NAME,
      runId: ids.runId,
    });
    expect(repeated.changed).toBe(false);
  });

  it("unlinks only meta.research and is idempotent when absent", async () => {
    await linkResearchTask({ root, task: TASK_NAME, questId: ids.questId });
    const first = await unlinkResearchTask({ root, task: TASK_NAME });
    expect(first).toMatchObject({
      command: "research task unlink",
      changed: true,
      research: null,
    });
    const record = loadTaskRecord({ taskDir: taskDir(root) });
    expect(record.meta).toEqual({ sibling: { keep: true } });

    const second = await unlinkResearchTask({ root, task: TASK_NAME });
    expect(second.changed).toBe(false);
  });

  it("rejects malformed, missing, and inconsistent entity combinations without writing", async () => {
    const file = path.join(taskDir(root), "task.json");
    const before = fs.readFileSync(file, "utf-8");

    await expect(
      linkResearchTask({ root, task: TASK_NAME }),
    ).rejects.toThrow(/requires at least one research ID/);
    await expect(
      linkResearchTask({
        root,
        task: TASK_NAME,
        questId: "qst_not-a-uuid" as QuestId,
      }),
    ).rejects.toThrow(/qst_ prefixed UUID/);
    await expect(
      linkResearchTask({ root, task: TASK_NAME, questId: createQuestId() }),
    ).rejects.toThrow(/Unknown research quest/);
    await expect(
      linkResearchTask({
        root,
        task: TASK_NAME,
        questId: ids.questId,
        campaignId: ids.otherCampaignId,
      }),
    ).rejects.toThrow(/does not belong to linked quest/);
    await expect(
      linkResearchTask({
        root,
        task: TASK_NAME,
        campaignId: ids.campaignId,
        runId: ids.otherRunId,
      }),
    ).rejects.toThrow(/does not belong to linked campaign/);
    await expect(
      linkResearchTask({
        root,
        task: TASK_NAME,
        runId: ids.runId,
        dispatchId: ids.otherDispatchId,
      }),
    ).rejects.toThrow(/does not belong to linked run/);
    await expect(
      linkResearchTask({
        root,
        task: TASK_NAME,
        runId: ids.runId,
        repositoryId: ids.otherRepositoryId,
      }),
    ).rejects.toThrow(/does not use linked repository/);

    expect(fs.readFileSync(file, "utf-8")).toBe(before);
  });

  it("rejects malformed existing research metadata", async () => {
    const file = path.join(taskDir(root), "task.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as {
      meta: Record<string, unknown>;
    };
    raw.meta.research = [];
    fs.writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`, "utf-8");
    const before = fs.readFileSync(file, "utf-8");

    await expect(
      linkResearchTask({ root, task: TASK_NAME, questId: ids.questId }),
    ).rejects.toThrow(/task\.meta\.research must be a JSON object/);
    expect(fs.readFileSync(file, "utf-8")).toBe(before);
  });

  it("accepts only real direct-child task directories", async () => {
    await expect(
      linkResearchTask({ root, task: "../outside", questId: ids.questId }),
    ).rejects.toThrow(/direct child name/);
    await expect(
      linkResearchTask({ root, task: "nested/task", questId: ids.questId }),
    ).rejects.toThrow(/direct child name/);
    await expect(
      linkResearchTask({ root, task: "missing", questId: ids.questId }),
    ).rejects.toThrow(/Task directory not found/);

    const missingJson = taskDir(root, "07-17-missing-json");
    fs.mkdirSync(missingJson);
    await expect(
      linkResearchTask({
        root,
        task: path.basename(missingJson),
        questId: ids.questId,
      }),
    ).rejects.toThrow(/regular task\.json/);

    const external = path.join(path.dirname(root), `${path.basename(root)}-external`);
    writeTaskRecord({
      taskDir: external,
      record: emptyTaskRecord({
        id: "external",
        name: "external",
        title: "External task",
        creator: "test",
        assignee: "test",
        createdAt: "2026-07-17",
      }),
    });
    const symlink = taskDir(root, "07-17-symlink");
    fs.symlinkSync(external, symlink, "dir");
    await expect(
      linkResearchTask({ root, task: path.basename(symlink), questId: ids.questId }),
    ).rejects.toThrow(/direct child of/);
    fs.rmSync(external, { recursive: true, force: true });
  });

  it("registers task link/unlink and emits one structured JSON result", async () => {
    const program = new Command().exitOverride();
    program.name("trellis");
    registerResearchCommand(program);

    await program.parseAsync(
      [
        "node",
        "trellis",
        "research",
        "task",
        "link",
        TASK_NAME,
        "--quest",
        ids.questId,
        "--root",
        root,
        "--json",
      ],
      { from: "node" },
    );

    expect(console.log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(vi.mocked(console.log).mock.calls[0]?.[0]))).toMatchObject({
      command: "research task link",
      task: `.trellis/tasks/${TASK_NAME}`,
      changed: true,
      research: { questId: ids.questId },
    });
  });
});

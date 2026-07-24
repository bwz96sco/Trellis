import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  commitResearchBatch,
  createCampaignId,
  createDispatchId,
  createQuestId,
  createRunId,
  RESEARCH_DEFAULT_CAPABILITY_BY_STAGE,
  stableResearchJson,
  type Dispatch,
  type QuestStage,
} from "@mindfoldhq/trellis-core/research";

import {
  createResearchCampaign,
  createResearchQuest,
  createResearchRun,
  initializeResearch,
  setResearchQuestStage,
} from "../../src/commands/research/command.js";
import { prepareResearchDispatch } from "../../src/commands/research/dispatch-command.js";
import { addResearchRepository } from "../../src/commands/research/repository.js";

export function runResearchFixtureGit(
  repository: string,
  ...args: string[]
): string {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: "utf-8",
  }).trim();
}

function initializeGitRepository(repository: string): string {
  fs.mkdirSync(repository, { recursive: true });
  runResearchFixtureGit(repository, "init", "-q");
  runResearchFixtureGit(repository, "config", "user.name", "Research Context Test");
  runResearchFixtureGit(repository, "config", "user.email", "context@example.test");
  fs.writeFileSync(path.join(repository, "README.md"), "research context\n");
  runResearchFixtureGit(repository, "add", "README.md");
  runResearchFixtureGit(repository, "commit", "-qm", "initial");
  return runResearchFixtureGit(repository, "rev-parse", "HEAD");
}

export function snapshotTree(root: string): Map<string, string> {
  const snapshot = new Map<string, string>();
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isSymbolicLink()) {
        snapshot.set(relative, `link:${fs.readlinkSync(absolute)}`);
      } else if (entry.isDirectory()) {
        snapshot.set(`${relative}/`, "directory");
        walk(absolute);
      } else {
        snapshot.set(
          relative,
          `file:${fs.readFileSync(absolute).toString("base64")}`,
        );
      }
    }
  };
  walk(root);
  return snapshot;
}

export interface ResearchDispatchFixture {
  root: string;
  repository: string;
  requestRef: string;
  requestPath: string;
  artifactPath: string;
  artifactBody: string;
  revision: string | null;
  ids: {
    repositoryId: `rep_${string}`;
    questId: `qst_${string}`;
    campaignId: `cmp_${string}`;
    runId: `run_${string}`;
    dispatchId: `dsp_${string}`;
  };
}

export interface ResearchDispatchFixtureOptions {
  associateRepository?: boolean;
  allowedWritePaths?: string[];
  ownerSkill?: string;
  provider?: string;
  taskRef?: string;
  expectedRemote?: string;
  objective?: string;
  acceptanceCriteria?: string[];
  expectedOutputs?: string[];
  stage?: Exclude<QuestStage, "complete">;
  git?: boolean;
  automaticEnabled?: boolean;
}

export async function createResearchDispatchFixture(
  sandbox: string,
  options: ResearchDispatchFixtureOptions = {},
): Promise<ResearchDispatchFixture> {
  const root = path.join(sandbox, "control");
  const repository = path.join(sandbox, "target");
  fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
  let revision: string | null;
  if (options.git === false) {
    fs.mkdirSync(repository, { recursive: true });
    revision = null;
  } else {
    revision = initializeGitRepository(repository);
  }
  if (options.expectedRemote !== undefined && revision !== null) {
    runResearchFixtureGit(repository, "remote", "add", "origin", options.expectedRemote);
  }
  await initializeResearch({ root, name: "Dispatch context" });
  if (options.automaticEnabled === true) {
    const policyPath = path.join(root, ".trellis", "research", "policy.json");
    const policy = JSON.parse(fs.readFileSync(policyPath, "utf8")) as {
      defaults: { automaticEnabled: boolean };
    };
    policy.defaults.automaticEnabled = true;
    fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);
  }

  const registered = await addResearchRepository({
    root,
    name: "target",
    kind: "code",
    locator: "../target",
    expectedRemote: options.expectedRemote,
    hasTrellis: false,
  });
  const questId = createQuestId();
  const campaignId = createCampaignId();
  const runId = createRunId();
  const dispatchId = createDispatchId();
  await createResearchQuest({
    root,
    id: questId,
    title: "Bounded context",
    repositoryIds:
      options.associateRepository === false ? [] : [registered.repository.id],
  });
  const requestedStage = options.stage ?? "literature";
  const prepareStage = requestedStage === "complete" ? "literature" : requestedStage;
  await setResearchQuestStage({
    root,
    questId,
    stage: prepareStage,
  });
  await createResearchCampaign({
    root,
    id: campaignId,
    questId,
    title: "Context campaign",
    protocolDigest: "protocol-v1",
  });
  await createResearchRun({ root, id: runId, campaignId, title: "Context run" });

  const artifactBody = "PRIVATE ARTIFACT BODY\n";
  const artifactPath = path.join(repository, "inputs", "source.txt");
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, artifactBody);
  const digest = createHash("sha256").update(artifactBody).digest("hex");
  const context: Dispatch["context"] = [
    { text: "Use only declared context." },
    {
      artifact: {
        id: "art_33333333-3333-4333-8333-333333333333",
        repositoryId: registered.repository.id,
        path: "inputs/source.txt",
        kind: "source",
        ...(revision === null ? {} : { revision }),
        sha256: digest,
        mediaType: "text/plain",
      },
    },
  ];
  const contextFile = path.join(sandbox, "context.json");
  fs.writeFileSync(contextFile, JSON.stringify(context));
  let requestRef: string;
  if (options.associateRepository === false) {
    const createdAt = new Date().toISOString();
    const dispatch: Dispatch = {
      id: dispatchId,
      questId,
      campaignId,
      runId,
      repositoryId: registered.repository.id,
      ownerSkill: options.ownerSkill ?? "historical-research-runner",
      provider: options.provider ?? "claude",
      objective: options.objective ?? "Produce a bounded deterministic report",
      acceptanceCriteria: options.acceptanceCriteria ?? ["Report is deterministic"],
      context,
      allowedWritePaths: options.allowedWritePaths ?? ["outputs/report.json"],
      expectedOutputs: options.expectedOutputs ?? ["Golden report"],
      checks: ["test -f outputs/report.json"],
      taskRef: options.taskRef ?? "tasks/legacy-context",
      createdAt,
    };
    await commitResearchBatch({
      root,
      actor: { type: "agent", id: "historical-fixture" },
      provenance: { source: "historical-fixture" },
      idempotencyKey: `prepare:${dispatchId}`,
      timestamp: createdAt,
      mutations: [{ kind: "dispatch.record", dispatch }],
    });
    requestRef = `.trellis/research/dispatches/${dispatchId}/request.json`;
    const requestPath = path.join(root, ...requestRef.split("/"));
    fs.mkdirSync(path.dirname(requestPath), { recursive: true });
    fs.writeFileSync(requestPath, stableResearchJson(dispatch));
  } else {
    const prepared = await prepareResearchDispatch({
      root,
      id: dispatchId,
      runId,
      questId,
      campaignId,
      repositoryId: registered.repository.id,
      ownerSkill: options.ownerSkill ?? "historical-research-runner",
      capabilityId: RESEARCH_DEFAULT_CAPABILITY_BY_STAGE[prepareStage],
      provider: options.provider ?? "claude",
      objective: options.objective ?? "Produce a bounded deterministic report",
      acceptanceCriteria: options.acceptanceCriteria ?? ["Report is deterministic"],
      contextFile,
      allowedWritePaths: options.allowedWritePaths ?? ["outputs/report.json"],
      expectedOutputs: options.expectedOutputs ?? ["Golden report"],
      checks: ["test -f outputs/report.json"],
      taskRef: options.taskRef ?? "tasks/legacy-context",
      idempotencyKey: `prepare:${dispatchId}`,
    });
    requestRef = prepared.requestFile as string;
  }
  if (requestedStage === "complete") {
    await setResearchQuestStage({ root, questId, stage: "complete" });
  }

  return {
    root,
    repository,
    requestRef,
    requestPath: path.join(root, requestRef),
    artifactPath,
    artifactBody,
    revision,
    ids: {
      repositoryId: registered.repository.id,
      questId,
      campaignId,
      runId,
      dispatchId,
    },
  };
}

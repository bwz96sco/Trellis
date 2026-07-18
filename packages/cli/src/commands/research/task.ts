import fs from "node:fs";
import path from "node:path";

import {
  readResearchState,
  type CampaignId,
  type DispatchId,
  type QuestId,
  type RepositoryId,
  type ResearchState,
  type RunId,
} from "@mindfoldhq/trellis-core/research";
import {
  loadTaskRecord,
  writeTaskRecord,
  type TrellisTaskRecord,
} from "@mindfoldhq/trellis-core/task";

import {
  parseCampaignId,
  parseQuestId,
  parseRunId,
  resolveResearchRoot,
  type ResearchOutputOptions,
} from "./common.js";

export interface ResearchTaskLink {
  questId?: QuestId;
  campaignId?: CampaignId;
  runId?: RunId;
  dispatchId?: DispatchId;
  repositoryId?: RepositoryId;
  [key: string]: unknown;
}

export interface LinkResearchTaskOptions extends ResearchOutputOptions {
  task: string;
  questId?: QuestId;
  campaignId?: CampaignId;
  runId?: RunId;
  dispatchId?: DispatchId;
  repositoryId?: RepositoryId;
}

export interface UnlinkResearchTaskOptions extends ResearchOutputOptions {
  task: string;
}

export interface ResearchTaskLinkResult {
  command: "research task link" | "research task unlink";
  task: string;
  changed: boolean;
  research: ResearchTaskLink | null;
}

const ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KNOWN_LINK_FIELDS = [
  "questId",
  "campaignId",
  "runId",
  "dispatchId",
  "repositoryId",
] as const;

type KnownLinkField = (typeof KNOWN_LINK_FIELDS)[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function parsePrefixedId<T extends string>(
  value: string,
  label: string,
  prefix: string,
): T {
  if (
    !value.startsWith(`${prefix}_`) ||
    !ID_UUID.test(value.slice(prefix.length + 1))
  ) {
    throw new Error(`${label} must be a ${prefix}_ prefixed UUID`);
  }
  return value as T;
}

export function parseRepositoryTaskLinkId(value: string): RepositoryId {
  return parsePrefixedId<RepositoryId>(value, "repository ID", "rep");
}

export function parseDispatchTaskLinkId(value: string): DispatchId {
  return parsePrefixedId<DispatchId>(value, "dispatch ID", "dsp");
}

function parseKnownLinkField(field: KnownLinkField, value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(`task.meta.research.${field} must be a string`);
  }
  switch (field) {
    case "questId":
      return parseQuestId(value);
    case "campaignId":
      return parseCampaignId(value);
    case "runId":
      return parseRunId(value);
    case "dispatchId":
      return parseDispatchTaskLinkId(value);
    case "repositoryId":
      return parseRepositoryTaskLinkId(value);
  }
}

function normalizedResearchLink(
  value: Record<string, unknown>,
): ResearchTaskLink {
  const link: ResearchTaskLink = { ...value };
  for (const field of KNOWN_LINK_FIELDS) {
    if (field in link) {
      link[field] = parseKnownLinkField(field, link[field]) as never;
    }
  }
  return link;
}

function existingResearchLink(
  record: TrellisTaskRecord,
): ResearchTaskLink | null {
  const existing = record.meta.research;
  if (existing === undefined) return null;
  if (!isPlainObject(existing)) {
    throw new Error("task.meta.research must be a JSON object");
  }
  return normalizedResearchLink(existing);
}

function resolveDirectTaskDir(root: string, taskName: string): string {
  if (
    taskName.length === 0 ||
    taskName.trim() !== taskName ||
    taskName === "." ||
    taskName === ".." ||
    taskName.includes("/") ||
    taskName.includes("\\")
  ) {
    throw new Error(
      "Task must be one non-empty direct child name without path separators",
    );
  }

  const tasksInput = path.join(root, ".trellis", "tasks");
  let tasksRoot: string;
  try {
    tasksRoot = fs.realpathSync(tasksInput);
  } catch {
    throw new Error(`Research Task directory '${tasksInput}' does not exist`);
  }

  const candidateInput = path.join(tasksInput, taskName);
  let candidate: string;
  try {
    candidate = fs.realpathSync(candidateInput);
  } catch {
    throw new Error(`Task directory not found: ${taskName}`);
  }

  if (path.dirname(candidate) !== tasksRoot) {
    throw new Error(
      `Task '${taskName}' must resolve to one direct child of '${tasksRoot}'`,
    );
  }
  if (!fs.statSync(candidate).isDirectory()) {
    throw new Error(`Task target '${taskName}' must be a directory`);
  }

  const taskFile = path.join(candidate, "task.json");
  let taskFileStat: fs.Stats;
  try {
    taskFileStat = fs.lstatSync(taskFile);
  } catch {
    throw new Error(`Task '${taskName}' must contain a regular task.json`);
  }
  if (!taskFileStat.isFile()) {
    throw new Error(`Task '${taskName}' must contain a regular task.json`);
  }
  return candidate;
}

function requireEntity<T>(
  entities: Readonly<Record<string, T>>,
  id: string | undefined,
  label: string,
): T | undefined {
  if (id === undefined) return undefined;
  const entity = entities[id];
  if (!entity) throw new Error(`Unknown research ${label} '${id}'`);
  return entity;
}

function validateResearchLink(
  link: ResearchTaskLink,
  state: ResearchState,
): void {
  const quest = requireEntity(state.quests, link.questId, "quest");
  const campaign = requireEntity(state.campaigns, link.campaignId, "campaign");
  const run = requireEntity(state.runs, link.runId, "run");
  const dispatch = requireEntity(state.dispatches, link.dispatchId, "dispatch");
  const repository = requireEntity(
    state.repositories,
    link.repositoryId,
    "repository",
  );

  if (quest && campaign && campaign.questId !== quest.id) {
    throw new Error(
      `Research campaign '${campaign.id}' does not belong to linked quest '${quest.id}'`,
    );
  }
  if (campaign && run && run.campaignId !== campaign.id) {
    throw new Error(
      `Research run '${run.id}' does not belong to linked campaign '${campaign.id}'`,
    );
  }
  if (quest && run) {
    const runCampaign = state.campaigns[run.campaignId];
    if (runCampaign?.questId !== quest.id) {
      throw new Error(
        `Research run '${run.id}' does not belong to linked quest '${quest.id}'`,
      );
    }
  }
  if (run && dispatch && dispatch.runId !== run.id) {
    throw new Error(
      `Research dispatch '${dispatch.id}' does not belong to linked run '${run.id}'`,
    );
  }
  if (campaign && dispatch && dispatch.campaignId !== campaign.id) {
    throw new Error(
      `Research dispatch '${dispatch.id}' does not belong to linked campaign '${campaign.id}'`,
    );
  }
  if (quest && dispatch && dispatch.questId !== quest.id) {
    throw new Error(
      `Research dispatch '${dispatch.id}' does not belong to linked quest '${quest.id}'`,
    );
  }
  if (repository && dispatch && dispatch.repositoryId !== repository.id) {
    throw new Error(
      `Research dispatch '${dispatch.id}' does not use linked repository '${repository.id}'`,
    );
  }
  if (repository && quest && !quest.repositoryIds.includes(repository.id)) {
    throw new Error(
      `Research quest '${quest.id}' does not use linked repository '${repository.id}'`,
    );
  }
  if (repository && run) {
    const runDispatch = run.dispatchId
      ? state.dispatches[run.dispatchId]
      : undefined;
    if (runDispatch?.repositoryId !== repository.id) {
      throw new Error(
        `Research run '${run.id}' does not use linked repository '${repository.id}'`,
      );
    }
  }
}

function taskReference(taskName: string): string {
  return `.trellis/tasks/${taskName}`;
}

export async function linkResearchTask(
  options: LinkResearchTaskOptions,
): Promise<ResearchTaskLinkResult> {
  const supplied: Partial<Record<KnownLinkField, string>> = {};
  for (const field of KNOWN_LINK_FIELDS) {
    const value = options[field];
    if (value !== undefined)
      supplied[field] = parseKnownLinkField(field, value);
  }
  if (Object.keys(supplied).length === 0) {
    throw new Error("research task link requires at least one research ID");
  }

  const root = resolveResearchRoot(options);
  const taskDir = resolveDirectTaskDir(root, options.task);
  const record = loadTaskRecord({ taskDir });
  const existing = existingResearchLink(record) ?? {};
  const research = normalizedResearchLink({ ...existing, ...supplied });
  validateResearchLink(research, await readResearchState(root));

  const changed = JSON.stringify(existing) !== JSON.stringify(research);
  if (changed) {
    writeTaskRecord({
      taskDir,
      record: {
        ...record,
        meta: { ...record.meta, research },
      },
    });
  }
  return {
    command: "research task link",
    task: taskReference(options.task),
    changed,
    research,
  };
}

export async function unlinkResearchTask(
  options: UnlinkResearchTaskOptions,
): Promise<ResearchTaskLinkResult> {
  const root = resolveResearchRoot(options);
  const taskDir = resolveDirectTaskDir(root, options.task);
  const record = loadTaskRecord({ taskDir });
  const existing = existingResearchLink(record);
  if (existing === null) {
    return {
      command: "research task unlink",
      task: taskReference(options.task),
      changed: false,
      research: null,
    };
  }

  const meta = { ...record.meta };
  delete meta.research;
  writeTaskRecord({ taskDir, record: { ...record, meta } });
  return {
    command: "research task unlink",
    task: taskReference(options.task),
    changed: true,
    research: null,
  };
}

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  commitResearchBatch,
  getResearchStatus,
  parseCampaignStatus,
  parseClaimStatus,
  parseEvidenceStatus,
  parseQuestStage,
  parseQuestStatus,
  parseRunStatus,
  ResearchProjectionError,
  validateResearchBatchReadOnly,
  type CampaignId,
  type CampaignStatus,
  type ClaimId,
  type ClaimStatus,
  type EvidenceId,
  type EvidenceStatus,
  type QuestId,
  type QuestStage,
  type QuestStatus,
  type RepositoryId,
  type ResearchEvent,
  type ResearchMutation,
  type RunId,
  type RunStatus,
  type Workspace,
} from "@mindfoldhq/trellis-core/research";
import chalk from "chalk";
import { InvalidArgumentError } from "commander";

import {
  ResearchActivationError,
  ResearchDispatchContextError,
  ResearchDispatchFileError,
} from "./errors.js";

export interface ResearchRootOptions {
  root?: string;
}

export interface ResearchOutputOptions extends ResearchRootOptions {
  json?: boolean;
}

export interface ResearchMutationOptions extends ResearchOutputOptions {
  idempotencyKey?: string;
  dryRun?: boolean;
}

export interface ResearchMutationResult {
  command: string;
  idempotencyKey: string;
  dryRun: boolean;
  replayed: boolean;
  headSeq: number;
  events: ResearchEvent[];
  runtimeWarnings?: string[];
}

export interface ResearchInitResult extends ResearchMutationResult {
  created: boolean;
  workspace: Workspace;
}

export interface ResearchStatusResult {
  command: "research status" | "research rebuild";
  initialized: boolean;
  workspace: Workspace | null;
  headSeq: number;
  eventCount: number;
  projectedThroughSeq: number;
  projectionStale: boolean;
  counts: {
    repositories: number;
    quests: number;
    campaigns: number;
    runs: number;
    evidence: number;
    claims: number;
    dispatches: number;
    results: number;
    proposals: number;
    decisions: number;
  };
}

export interface ResearchValidationResult {
  command: "research validate";
  valid: true;
  initialized: boolean;
  headSeq: number;
  eventCount: number;
  projectedThroughSeq: number;
  projectionStale: boolean;
}

export type ResearchCommandResult =
  | ResearchMutationResult
  | ResearchInitResult
  | ResearchStatusResult
  | ResearchValidationResult;

const ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveResearchRoot(options: ResearchRootOptions): string {
  const root = path.resolve(process.cwd(), options.root ?? ".");
  const trellisDir = path.join(root, ".trellis");
  try {
    if (fs.statSync(trellisDir).isDirectory()) return root;
  } catch {
    // The shared error below covers missing and unreadable control-plane roots.
  }
  throw new Error(`Research root '${root}' must contain a .trellis directory`);
}

export function requireResearchText(value: string, name: string): string {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function parseId<T extends string>(
  value: string,
  name: string,
  prefix: string,
): T {
  requireResearchText(value, name);
  const expected = `${prefix}_`;
  if (
    !value.startsWith(expected) ||
    !ID_UUID.test(value.slice(expected.length))
  ) {
    throw new Error(`${name} must be a ${prefix}_ prefixed UUID`);
  }
  return value as T;
}

function commanderParser<T>(parser: () => T): T {
  try {
    return parser();
  } catch (error) {
    throw new InvalidArgumentError(
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function parseQuestId(value: string): QuestId {
  return parseId<QuestId>(value, "quest ID", "qst");
}

export function parseCampaignId(value: string): CampaignId {
  return parseId<CampaignId>(value, "campaign ID", "cmp");
}

export function parseRunId(value: string): RunId {
  return parseId<RunId>(value, "run ID", "run");
}

export function parseEvidenceId(value: string): EvidenceId {
  return parseId<EvidenceId>(value, "evidence ID", "evd");
}

export function parseClaimId(value: string): ClaimId {
  return parseId<ClaimId>(value, "claim ID", "clm");
}

export function parseRepositoryId(value: string): RepositoryId {
  return parseId<RepositoryId>(value, "repository ID", "rep");
}

export function parseQuestIdArgument(value: string): QuestId {
  return commanderParser(() => parseQuestId(value));
}

export function parseCampaignIdArgument(value: string): CampaignId {
  return commanderParser(() => parseCampaignId(value));
}

export function parseRunIdArgument(value: string): RunId {
  return commanderParser(() => parseRunId(value));
}

export function parseEvidenceIdArgument(value: string): EvidenceId {
  return commanderParser(() => parseEvidenceId(value));
}

export function parseClaimIdArgument(value: string): ClaimId {
  return commanderParser(() => parseClaimId(value));
}

export function parseQuestStatusArgument(value: string): QuestStatus {
  return commanderParser(() => parseQuestStatus(value));
}

export function parseQuestStageArgument(value: string): QuestStage {
  return commanderParser(() => parseQuestStage(value));
}

export function parseCampaignStatusArgument(value: string): CampaignStatus {
  return commanderParser(() => parseCampaignStatus(value));
}

export function parseRunStatusArgument(value: string): RunStatus {
  return commanderParser(() => parseRunStatus(value));
}

export function parseEvidenceStatusArgument(value: string): EvidenceStatus {
  return commanderParser(() => parseEvidenceStatus(value));
}

export function parseClaimStatusArgument(value: string): ClaimStatus {
  return commanderParser(() => parseClaimStatus(value));
}

export async function executeResearchMutations(
  command: string,
  options: ResearchMutationOptions,
  mutations: readonly ResearchMutation[],
): Promise<ResearchMutationResult> {
  const root = resolveResearchRoot(options);
  const idempotencyKey =
    options.idempotencyKey ??
    `cli:${command.replaceAll(" ", ":")}:${randomUUID()}`;
  requireResearchText(idempotencyKey, "idempotency key");
  const input = {
    root,
    mutations,
    actor: { type: "agent" as const, id: "trellis-cli" },
    provenance: { source: `trellis research ${command}` },
    idempotencyKey,
  };

  if (options.dryRun === true) {
    const before = await getResearchStatus(root);
    const validation = await validateResearchBatchReadOnly(input);
    const replayed = validation.events.some(
      (event) =>
        event.idempotencyKey === idempotencyKey && event.seq <= before.headSeq,
    );
    return {
      command: `research ${command}`,
      idempotencyKey,
      dryRun: true,
      replayed,
      headSeq: validation.state.projectedThroughSeq,
      events: validation.events,
    };
  }

  const committed = await commitResearchBatch(input);
  return {
    command: `research ${command}`,
    idempotencyKey,
    dryRun: false,
    replayed: committed.replayed,
    headSeq: committed.headSeq,
    events: committed.events,
  };
}

export function renderResearchResult(
  result: ResearchCommandResult,
  json: boolean,
): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if ("valid" in result) {
    console.log(
      `${result.command}: valid head=${result.headSeq} projected=${result.projectedThroughSeq} stale=${result.projectionStale}`,
    );
    return;
  }

  if ("counts" in result) {
    const workspace = result.workspace
      ? `${result.workspace.id} ${result.workspace.name}`
      : "uninitialized";
    console.log(
      `${result.command}: ${workspace} head=${result.headSeq} projected=${result.projectedThroughSeq} stale=${result.projectionStale} repositories=${result.counts.repositories} quests=${result.counts.quests} campaigns=${result.counts.campaigns} runs=${result.counts.runs} evidence=${result.counts.evidence} claims=${result.counts.claims} dispatches=${result.counts.dispatches} results=${result.counts.results} proposals=${result.counts.proposals} decisions=${result.counts.decisions}`,
    );
    return;
  }

  const ids = result.events.map((event) => event.aggregate.id).join(",");
  const entitySummary = ids.length > 0 ? ` ids=${ids}` : "";
  const createdSummary =
    "created" in result
      ? ` created=${result.created} workspace=${result.workspace.id}`
      : "";
  console.log(
    `${result.command}:${createdSummary}${entitySummary} head=${result.headSeq} replayed=${result.replayed} dryRun=${result.dryRun} idempotencyKey=${result.idempotencyKey}`,
  );
}

export function renderResearchError(error: unknown, json: boolean): void {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof ResearchDispatchContextError) {
    const failure = {
      schemaVersion: 1,
      command: "research dispatch context",
      valid: false,
      error: { code: error.code, message },
      safeAction: "report-to-root-no-write",
    } as const;
    if (json) {
      console.error(JSON.stringify(failure));
    } else {
      console.error(
        chalk.red("Error:"),
        `${error.code}: ${message}. No files were changed.`,
      );
    }
    return;
  }
  if (error instanceof ResearchDispatchFileError) {
    const recovery = {
      error: message,
      committed: true,
      headSeq: error.headSeq,
      target: error.target,
      recovery: error.recovery,
    };
    if (json) {
      console.error(JSON.stringify(recovery));
    } else {
      console.error(chalk.red("Error:"), `${message}. ${error.recovery}.`);
    }
    return;
  }
  if (error instanceof ResearchProjectionError) {
    const recovery = {
      error: message,
      committed: true,
      headSeq: error.headSeq,
      recovery: "trellis research rebuild",
    };
    if (json) {
      console.error(JSON.stringify(recovery));
    } else {
      console.error(
        chalk.red("Error:"),
        `${message}. Run '${recovery.recovery}' to repair projections.`,
      );
    }
    return;
  }

  const stableCode =
    error instanceof ResearchActivationError
      ? error.code
      : typeof error === "object" &&
          error !== null &&
          "code" in error &&
          typeof error.code === "string" &&
          new Set([
            "UNKNOWN_CAPABILITY",
            "CAPABILITY_STAGE_MISMATCH",
            "QUEST_STAGE_NOT_DISPATCHABLE",
            "INVALID_PROJECT_PROCEDURE",
            "INVALID_BUNDLED_PROCEDURE",
            "INVALID_RESEARCH_PROCEDURE",
            "INVALID_RESEARCH_POLICY",
            "POLICY_WIDENS_AUTHORITY",
          ]).has(error.code)
        ? error.code
        : null;
  if (stableCode !== null) {
    if (json) {
      console.error(JSON.stringify({ error: { code: stableCode, message } }));
    } else {
      console.error(chalk.red("Error:"), `${stableCode}: ${message}`);
    }
    return;
  }

  if (json) {
    console.error(JSON.stringify({ error: message }));
  } else {
    console.error(chalk.red("Error:"), message);
  }
}

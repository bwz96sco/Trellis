import {
  normalizeArtifactPath,
  normalizeRepositoryLocator,
} from "./artifacts.js";
import { RESEARCH_ID_PREFIXES, type ResearchIdKind } from "./ids.js";
import type {
  ActivationId,
  ApprovalId,
  ArtifactId,
  ArtifactRef,
  Campaign,
  CampaignId,
  CampaignStatus,
  Claim,
  ClaimId,
  ClaimStatus,
  Decision,
  DecisionId,
  DecisionOutcome,
  Dispatch,
  DispatchContextEntry,
  DispatchId,
  Evidence,
  EvidenceId,
  EvidenceStatus,
  EventId,
  Proposal,
  ProposalId,
  ProposalOperation,
  ProposalStatus,
  RepositoryKind,
  ResultStatus,
  Quest,
  QuestId,
  QuestStage,
  QuestStatus,
  Repository,
  RepositoryId,
  ResearchActivation,
  ResearchActor,
  ResearchAggregateRef,
  ResearchAggregateType,
  ResearchApprovalGrant,
  ResearchApprovalState,
  ResearchProvenance,
  ResearchSchemaV2AggregateRef,
  ResearchSchemaV2AggregateType,
  Result,
  ResultId,
  Run,
  RunId,
  RunStatus,
  Workspace,
  WorkspaceId,
} from "./types.js";

export interface RuntimeSchema<T> {
  parse(input: unknown): T;
  safeParse(input: unknown):
    | { success: true; data: T }
    | { success: false; error: Error };
}

function schema<T>(parser: (input: unknown) => T): RuntimeSchema<T> {
  return {
    parse: parser,
    safeParse(input) {
      try {
        return { success: true, data: parser(input) };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  };
}

function object(
  input: unknown,
  name: string,
  allowed: readonly string[],
  required: readonly string[] = allowed,
): Record<string, unknown> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    throw new Error(`${name} must be a JSON object`);
  }
  const value = input as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${name}.${key} is not supported`);
  }
  for (const key of required) {
    if (!(key in value)) throw new Error(`${name}.${key} is required`);
  }
  return value;
}

function stringValue(
  value: unknown,
  name: string,
  options: { nonEmpty?: boolean } = {},
): string {
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  if (options.nonEmpty && value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function timestamp(value: unknown, name: string): string {
  const parsed = stringValue(value, name, { nonEmpty: true });
  if (Number.isNaN(Date.parse(parsed)) || new Date(parsed).toISOString() !== parsed) {
    throw new Error(`${name} must be an ISO 8601 UTC timestamp`);
  }
  return parsed;
}

function schemaV2Timestamp(value: unknown, name: string): string {
  const parsed = timestamp(value, name);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed)) {
    throw new Error(
      `${name} must be a canonical RFC3339 UTC timestamp with millisecond precision`,
    );
  }
  return parsed;
}

function boundedString(
  value: unknown,
  name: string,
  maximumLength: number,
): string {
  const parsed = stringValue(value, name);
  if (parsed.length === 0 || parsed.length > maximumLength) {
    throw new Error(`${name} must contain between 1 and ${maximumLength} characters`);
  }
  return parsed;
}

function positiveInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function sha256Binding(value: unknown, name: string): string {
  const parsed = stringValue(value, name, { nonEmpty: true });
  if (!/^sha256:[0-9a-f]{64}$/.test(parsed)) {
    throw new Error(`${name} must be sha256: followed by 64 lowercase hex characters`);
  }
  return parsed;
}

function enumValue<T extends string>(
  value: unknown,
  name: string,
  values: readonly T[],
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${name} must be one of: ${values.join(", ")}`);
  }
  return value as T;
}

function idValue<T extends string>(
  value: unknown,
  name: string,
  kind: ResearchIdKind,
): T {
  const candidate = stringValue(value, name, { nonEmpty: true });
  const prefix = RESEARCH_ID_PREFIXES[kind];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!candidate.startsWith(`${prefix}_`) || !uuid.test(candidate.slice(prefix.length + 1))) {
    throw new Error(`${name} must be a ${prefix}_ prefixed UUID`);
  }
  return candidate as T;
}

function portableReference(value: unknown, name: string): string {
  const reference = stringValue(value, name, { nonEmpty: true });
  if (
    reference.includes("\0") ||
    reference.includes("\\") ||
    reference.startsWith("/") ||
    /^[A-Za-z]:/.test(reference)
  ) {
    throw new Error(`${name} must be a portable reference, not an absolute path`);
  }
  return reference;
}

function stringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value.map((entry, index) =>
    stringValue(entry, `${name}[${index}]`, { nonEmpty: true }),
  );
}

function idArray<T extends string>(
  value: unknown,
  name: string,
  kind: ResearchIdKind,
): T[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  const parsed = value.map((entry, index) =>
    idValue<T>(entry, `${name}[${index}]`, kind),
  );
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${name} must not contain duplicate IDs`);
  }
  return parsed;
}

const QUEST_STATUSES = ["active", "paused", "completed", "abandoned"] as const;
const QUEST_STAGES = [
  "setup",
  "framing",
  "literature",
  "ideation",
  "experiment",
  "computation",
  "theory",
  "audit",
  "writing",
  "complete",
] as const;
const CAMPAIGN_STATUSES = [
  "draft",
  "frozen",
  "running",
  "blocked",
  "completed",
  "abandoned",
] as const;
const RUN_STATUSES = [
  "planned",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "invalidated",
] as const;
const EVIDENCE_STATUSES = ["active", "superseded", "retracted"] as const;
const CLAIM_STATUSES = [
  "candidate",
  "supported",
  "contested",
  "refuted",
  "withdrawn",
] as const;
const REPOSITORY_KINDS = ["code", "paper", "notes", "data", "other"] as const;
const RESULT_STATUSES = ["completed", "partial", "blocked", "failed"] as const;
const PROPOSAL_STATUSES = ["pending", "accepted", "rejected", "deferred"] as const;
const DECISION_OUTCOMES = ["accept", "reject", "defer"] as const;
const AGGREGATE_TYPES = [
  "workspace",
  "repository",
  "artifact",
  "quest",
  "campaign",
  "run",
  "evidence",
  "claim",
  "dispatch",
  "result",
  "proposal",
  "decision",
] as const;

export const workspaceSchema = schema<Workspace>((input) => {
  const value = object(input, "workspace", [
    "id",
    "name",
    "description",
    "questIds",
    "campaignIds",
    "repositoryIds",
    "createdAt",
    "updatedAt",
  ]);
  return {
    id: idValue<WorkspaceId>(value.id, "workspace.id", "workspace"),
    name: stringValue(value.name, "workspace.name", { nonEmpty: true }),
    description: stringValue(value.description, "workspace.description"),
    questIds: idArray<QuestId>(value.questIds, "workspace.questIds", "quest"),
    campaignIds: idArray<CampaignId>(
      value.campaignIds,
      "workspace.campaignIds",
      "campaign",
    ),
    repositoryIds: idArray<RepositoryId>(
      value.repositoryIds,
      "workspace.repositoryIds",
      "repository",
    ),
    createdAt: timestamp(value.createdAt, "workspace.createdAt"),
    updatedAt: timestamp(value.updatedAt, "workspace.updatedAt"),
  };
});

export const repositorySchema = schema<Repository>((input) => {
  const value = object(
    input,
    "repository",
    [
      "id",
      "name",
      "kind",
      "locator",
      "expectedRemote",
      "defaultBranch",
      "capabilities",
      "createdAt",
      "updatedAt",
    ],
    ["id", "name", "kind", "locator", "capabilities", "createdAt", "updatedAt"],
  );
  const capabilities = object(
    value.capabilities,
    "repository.capabilities",
    ["hasTrellis"],
  );
  if (typeof capabilities.hasTrellis !== "boolean") {
    throw new Error("repository.capabilities.hasTrellis must be a boolean");
  }
  const out: Repository = {
    id: idValue<RepositoryId>(value.id, "repository.id", "repository"),
    name: stringValue(value.name, "repository.name", { nonEmpty: true }),
    kind: enumValue<RepositoryKind>(
      value.kind,
      "repository.kind",
      REPOSITORY_KINDS,
    ),
    locator: normalizeRepositoryLocator(
      stringValue(value.locator, "repository.locator", { nonEmpty: true }),
    ),
    capabilities: { hasTrellis: capabilities.hasTrellis },
    createdAt: timestamp(value.createdAt, "repository.createdAt"),
    updatedAt: timestamp(value.updatedAt, "repository.updatedAt"),
  };
  if (value.expectedRemote !== undefined) {
    out.expectedRemote = stringValue(
      value.expectedRemote,
      "repository.expectedRemote",
      { nonEmpty: true },
    );
  }
  if (value.defaultBranch !== undefined) {
    out.defaultBranch = stringValue(value.defaultBranch, "repository.defaultBranch", {
      nonEmpty: true,
    });
  }
  return out;
});

export const artifactRefSchema = schema<ArtifactRef>((input) => {
  const value = object(
    input,
    "artifact",
    ["id", "repositoryId", "path", "kind", "revision", "sha256", "mediaType"],
    ["id", "repositoryId", "path"],
  );
  const out: ArtifactRef = {
    id: idValue<ArtifactId>(value.id, "artifact.id", "artifact"),
    repositoryId: idValue<RepositoryId>(
      value.repositoryId,
      "artifact.repositoryId",
      "repository",
    ),
    path: normalizeArtifactPath(
      stringValue(value.path, "artifact.path", { nonEmpty: true }),
    ),
  };
  if (value.kind !== undefined) {
    out.kind = stringValue(value.kind, "artifact.kind", { nonEmpty: true });
  }
  if (value.revision !== undefined) {
    out.revision = stringValue(value.revision, "artifact.revision", {
      nonEmpty: true,
    });
  }
  if (value.sha256 !== undefined) {
    const digest = stringValue(value.sha256, "artifact.sha256", {
      nonEmpty: true,
    }).toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(digest)) {
      throw new Error("artifact.sha256 must be a 64-character hexadecimal digest");
    }
    out.sha256 = digest;
  }
  if (value.mediaType !== undefined) {
    out.mediaType = stringValue(value.mediaType, "artifact.mediaType", {
      nonEmpty: true,
    });
  }
  return out;
});

function artifactArray(value: unknown, name: string): ArtifactRef[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return value.map((entry) => artifactRefSchema.parse(entry));
}

export const questSchema = schema<Quest>((input) => {
  const value = object(input, "quest", [
    "id",
    "title",
    "description",
    "status",
    "stage",
    "repositoryIds",
    "artifactRefs",
    "createdAt",
    "updatedAt",
  ]);
  return {
    id: idValue<QuestId>(value.id, "quest.id", "quest"),
    title: stringValue(value.title, "quest.title", { nonEmpty: true }),
    description: stringValue(value.description, "quest.description"),
    status: enumValue<QuestStatus>(value.status, "quest.status", QUEST_STATUSES),
    stage: enumValue<QuestStage>(value.stage, "quest.stage", QUEST_STAGES),
    repositoryIds: idArray<RepositoryId>(
      value.repositoryIds,
      "quest.repositoryIds",
      "repository",
    ),
    artifactRefs: artifactArray(value.artifactRefs, "quest.artifactRefs"),
    createdAt: timestamp(value.createdAt, "quest.createdAt"),
    updatedAt: timestamp(value.updatedAt, "quest.updatedAt"),
  };
});

export const campaignSchema = schema<Campaign>((input) => {
  const value = object(input, "campaign", [
    "id",
    "questId",
    "title",
    "status",
    "protocolDigest",
    "runIds",
    "createdAt",
    "updatedAt",
  ]);
  return {
    id: idValue<CampaignId>(value.id, "campaign.id", "campaign"),
    questId: idValue<QuestId>(value.questId, "campaign.questId", "quest"),
    title: stringValue(value.title, "campaign.title", { nonEmpty: true }),
    status: enumValue<CampaignStatus>(
      value.status,
      "campaign.status",
      CAMPAIGN_STATUSES,
    ),
    protocolDigest: stringValue(value.protocolDigest, "campaign.protocolDigest", {
      nonEmpty: true,
    }),
    runIds: idArray<RunId>(value.runIds, "campaign.runIds", "run"),
    createdAt: timestamp(value.createdAt, "campaign.createdAt"),
    updatedAt: timestamp(value.updatedAt, "campaign.updatedAt"),
  };
});

export const runSchema = schema<Run>((input) => {
  const value = object(
    input,
    "run",
    [
      "id",
      "campaignId",
      "title",
      "status",
      "dispatchId",
      "resultId",
      "invalidationReason",
      "createdAt",
      "updatedAt",
    ],
    ["id", "campaignId", "title", "status", "createdAt", "updatedAt"],
  );
  const out: Run = {
    id: idValue<RunId>(value.id, "run.id", "run"),
    campaignId: idValue<CampaignId>(
      value.campaignId,
      "run.campaignId",
      "campaign",
    ),
    title: stringValue(value.title, "run.title", { nonEmpty: true }),
    status: enumValue<RunStatus>(value.status, "run.status", RUN_STATUSES),
    createdAt: timestamp(value.createdAt, "run.createdAt"),
    updatedAt: timestamp(value.updatedAt, "run.updatedAt"),
  };
  if (value.dispatchId !== undefined) {
    out.dispatchId = idValue<DispatchId>(
      value.dispatchId,
      "run.dispatchId",
      "dispatch",
    );
  }
  if (value.resultId !== undefined) {
    out.resultId = idValue<ResultId>(value.resultId, "run.resultId", "result");
  }
  if (value.invalidationReason !== undefined) {
    out.invalidationReason = stringValue(
      value.invalidationReason,
      "run.invalidationReason",
      { nonEmpty: true },
    );
  }
  return out;
});

export const evidenceSchema = schema<Evidence>((input) => {
  const value = object(
    input,
    "evidence",
    [
      "id",
      "questId",
      "runId",
      "summary",
      "status",
      "artifactRefs",
      "createdAt",
      "updatedAt",
    ],
    ["id", "questId", "summary", "status", "artifactRefs", "createdAt", "updatedAt"],
  );
  const out: Evidence = {
    id: idValue<EvidenceId>(value.id, "evidence.id", "evidence"),
    questId: idValue<QuestId>(value.questId, "evidence.questId", "quest"),
    summary: stringValue(value.summary, "evidence.summary", { nonEmpty: true }),
    status: enumValue<EvidenceStatus>(
      value.status,
      "evidence.status",
      EVIDENCE_STATUSES,
    ),
    artifactRefs: artifactArray(value.artifactRefs, "evidence.artifactRefs"),
    createdAt: timestamp(value.createdAt, "evidence.createdAt"),
    updatedAt: timestamp(value.updatedAt, "evidence.updatedAt"),
  };
  if (value.runId !== undefined) {
    out.runId = idValue<RunId>(value.runId, "evidence.runId", "run");
  }
  return out;
});

export const claimSchema = schema<Claim>((input) => {
  const value = object(input, "claim", [
    "id",
    "questId",
    "statement",
    "status",
    "evidenceIds",
    "createdAt",
    "updatedAt",
  ]);
  return {
    id: idValue<ClaimId>(value.id, "claim.id", "claim"),
    questId: idValue<QuestId>(value.questId, "claim.questId", "quest"),
    statement: stringValue(value.statement, "claim.statement", { nonEmpty: true }),
    status: enumValue<ClaimStatus>(value.status, "claim.status", CLAIM_STATUSES),
    evidenceIds: idArray<EvidenceId>(
      value.evidenceIds,
      "claim.evidenceIds",
      "evidence",
    ),
    createdAt: timestamp(value.createdAt, "claim.createdAt"),
    updatedAt: timestamp(value.updatedAt, "claim.updatedAt"),
  };
});

function parseDispatchContext(input: unknown): DispatchContextEntry[] {
  if (!Array.isArray(input)) throw new Error("dispatch.context must be an array");
  return input.map((entry, index) => {
    const value = object(
      entry,
      `dispatch.context[${index}]`,
      ["artifact", "text"],
      [],
    );
    const hasArtifact = value.artifact !== undefined;
    const hasText = value.text !== undefined;
    if (hasArtifact === hasText) {
      throw new Error(
        `dispatch.context[${index}] must contain exactly one of artifact or text`,
      );
    }
    return hasArtifact
      ? { artifact: artifactRefSchema.parse(value.artifact) }
      : {
          text: stringValue(value.text, `dispatch.context[${index}].text`, {
            nonEmpty: true,
          }),
        };
  });
}

export const dispatchSchema = schema<Dispatch>((input) => {
  const value = object(
    input,
    "dispatch",
    [
      "id",
      "questId",
      "campaignId",
      "runId",
      "repositoryId",
      "ownerSkill",
      "provider",
      "objective",
      "acceptanceCriteria",
      "context",
      "allowedWritePaths",
      "expectedOutputs",
      "checks",
      "taskRef",
      "createdAt",
    ],
    [
      "id",
      "questId",
      "runId",
      "repositoryId",
      "ownerSkill",
      "objective",
      "acceptanceCriteria",
      "context",
      "allowedWritePaths",
      "expectedOutputs",
      "checks",
      "createdAt",
    ],
  );
  const out: Dispatch = {
    id: idValue<DispatchId>(value.id, "dispatch.id", "dispatch"),
    questId: idValue<QuestId>(value.questId, "dispatch.questId", "quest"),
    runId: idValue<RunId>(value.runId, "dispatch.runId", "run"),
    repositoryId: idValue<RepositoryId>(
      value.repositoryId,
      "dispatch.repositoryId",
      "repository",
    ),
    ownerSkill: stringValue(value.ownerSkill, "dispatch.ownerSkill", {
      nonEmpty: true,
    }),
    objective: stringValue(value.objective, "dispatch.objective", {
      nonEmpty: true,
    }),
    acceptanceCriteria: stringArray(
      value.acceptanceCriteria,
      "dispatch.acceptanceCriteria",
    ),
    context: parseDispatchContext(value.context),
    allowedWritePaths: stringArray(
      value.allowedWritePaths,
      "dispatch.allowedWritePaths",
    ).map(normalizeArtifactPath),
    expectedOutputs: stringArray(value.expectedOutputs, "dispatch.expectedOutputs"),
    checks: stringArray(value.checks, "dispatch.checks"),
    createdAt: timestamp(value.createdAt, "dispatch.createdAt"),
  };
  if (value.campaignId !== undefined) {
    out.campaignId = idValue<CampaignId>(
      value.campaignId,
      "dispatch.campaignId",
      "campaign",
    );
  }
  if (value.provider !== undefined) {
    out.provider = stringValue(value.provider, "dispatch.provider", {
      nonEmpty: true,
    });
  }
  if (value.taskRef !== undefined) {
    out.taskRef = portableReference(value.taskRef, "dispatch.taskRef");
  }
  return out;
});

export const resultSchema = schema<Result>((input) => {
  const value = object(
    input,
    "result",
    [
      "id",
      "dispatchId",
      "runId",
      "status",
      "summary",
      "commands",
      "checks",
      "artifactRefs",
      "revision",
      "dirtySummary",
      "blockers",
      "sessionRef",
      "createdAt",
    ],
    [
      "id",
      "dispatchId",
      "runId",
      "status",
      "summary",
      "commands",
      "checks",
      "artifactRefs",
      "blockers",
      "createdAt",
    ],
  );
  const out: Result = {
    id: idValue<ResultId>(value.id, "result.id", "result"),
    dispatchId: idValue<DispatchId>(
      value.dispatchId,
      "result.dispatchId",
      "dispatch",
    ),
    runId: idValue<RunId>(value.runId, "result.runId", "run"),
    status: enumValue<ResultStatus>(value.status, "result.status", RESULT_STATUSES),
    summary: stringValue(value.summary, "result.summary", { nonEmpty: true }),
    commands: stringArray(value.commands, "result.commands"),
    checks: stringArray(value.checks, "result.checks"),
    artifactRefs: artifactArray(value.artifactRefs, "result.artifactRefs"),
    blockers: stringArray(value.blockers, "result.blockers"),
    createdAt: timestamp(value.createdAt, "result.createdAt"),
  };
  if (value.revision !== undefined) {
    out.revision = stringValue(value.revision, "result.revision", {
      nonEmpty: true,
    });
  }
  if (value.dirtySummary !== undefined) {
    out.dirtySummary = stringValue(value.dirtySummary, "result.dirtySummary");
  }
  if (value.sessionRef !== undefined) {
    out.sessionRef = portableReference(value.sessionRef, "result.sessionRef");
  }
  return out;
});

function parseEvidenceCreateOperation(value: Record<string, unknown>): ProposalOperation {
  const evidence = object(
    value.evidence,
    "proposal operation.evidence",
    ["id", "questId", "runId", "summary", "artifactRefs"],
    ["id", "questId", "summary", "artifactRefs"],
  );
  const parsed: Extract<ProposalOperation, { kind: "evidence.create" }> = {
    kind: "evidence.create",
    evidence: {
      id: idValue<EvidenceId>(evidence.id, "evidence.id", "evidence"),
      questId: idValue<QuestId>(evidence.questId, "evidence.questId", "quest"),
      summary: stringValue(evidence.summary, "evidence.summary", { nonEmpty: true }),
      artifactRefs: artifactArray(evidence.artifactRefs, "evidence.artifactRefs"),
    },
  };
  if (evidence.runId !== undefined) {
    parsed.evidence.runId = idValue<RunId>(evidence.runId, "evidence.runId", "run");
  }
  return parsed;
}

function parseProposalOperation(input: unknown): ProposalOperation {
  const base = object(input, "proposal operation", [
    "kind",
    "artifact",
    "questId",
    "status",
    "stage",
    "campaignId",
    "protocolDigest",
    "runId",
    "reason",
    "evidence",
    "evidenceId",
    "claim",
    "claimId",
  ], ["kind"]);
  const kind = stringValue(base.kind, "proposal operation.kind", { nonEmpty: true });
  switch (kind) {
    case "artifact.register":
      object(input, "proposal operation", ["kind", "artifact"]);
      return { kind, artifact: artifactRefSchema.parse(base.artifact) };
    case "quest.status":
      object(input, "proposal operation", ["kind", "questId", "status"]);
      return {
        kind,
        questId: idValue<QuestId>(base.questId, "proposal operation.questId", "quest"),
        status: parseQuestStatus(base.status),
      };
    case "quest.stage":
      object(input, "proposal operation", ["kind", "questId", "stage"]);
      return {
        kind,
        questId: idValue<QuestId>(base.questId, "proposal operation.questId", "quest"),
        stage: parseQuestStage(base.stage),
      };
    case "campaign.protocol":
      object(input, "proposal operation", ["kind", "campaignId", "protocolDigest"]);
      return {
        kind,
        campaignId: idValue<CampaignId>(
          base.campaignId,
          "proposal operation.campaignId",
          "campaign",
        ),
        protocolDigest: stringValue(
          base.protocolDigest,
          "proposal operation.protocolDigest",
          { nonEmpty: true },
        ),
      };
    case "campaign.freeze":
      object(input, "proposal operation", ["kind", "campaignId"]);
      return {
        kind,
        campaignId: idValue<CampaignId>(
          base.campaignId,
          "proposal operation.campaignId",
          "campaign",
        ),
      };
    case "campaign.status":
      object(input, "proposal operation", ["kind", "campaignId", "status"]);
      return {
        kind,
        campaignId: idValue<CampaignId>(
          base.campaignId,
          "proposal operation.campaignId",
          "campaign",
        ),
        status: parseCampaignStatus(base.status),
      };
    case "run.status":
      object(input, "proposal operation", ["kind", "runId", "status"]);
      return {
        kind,
        runId: idValue<RunId>(base.runId, "proposal operation.runId", "run"),
        status: parseRunStatus(base.status),
      };
    case "run.invalidate":
      object(input, "proposal operation", ["kind", "runId", "reason"]);
      return {
        kind,
        runId: idValue<RunId>(base.runId, "proposal operation.runId", "run"),
        reason: stringValue(base.reason, "proposal operation.reason", {
          nonEmpty: true,
        }),
      };
    case "evidence.create":
      object(input, "proposal operation", ["kind", "evidence"]);
      return parseEvidenceCreateOperation(base);
    case "evidence.status":
      object(input, "proposal operation", ["kind", "evidenceId", "status"]);
      return {
        kind,
        evidenceId: idValue<EvidenceId>(
          base.evidenceId,
          "proposal operation.evidenceId",
          "evidence",
        ),
        status: parseEvidenceStatus(base.status),
      };
    case "claim.create": {
      object(input, "proposal operation", ["kind", "claim"]);
      const claim = object(
        base.claim,
        "proposal operation.claim",
        ["id", "questId", "statement", "evidenceIds"],
      );
      return {
        kind,
        claim: {
          id: idValue<ClaimId>(claim.id, "claim.id", "claim"),
          questId: idValue<QuestId>(claim.questId, "claim.questId", "quest"),
          statement: stringValue(claim.statement, "claim.statement", {
            nonEmpty: true,
          }),
          evidenceIds: idArray<EvidenceId>(
            claim.evidenceIds,
            "claim.evidenceIds",
            "evidence",
          ),
        },
      };
    }
    case "claim.status":
      object(input, "proposal operation", ["kind", "claimId", "status"]);
      return {
        kind,
        claimId: idValue<ClaimId>(base.claimId, "proposal operation.claimId", "claim"),
        status: parseClaimStatus(base.status),
      };
    default:
      throw new Error(`proposal operation.kind '${kind}' is not supported`);
  }
}

export const proposalOperationSchema = schema<ProposalOperation>(parseProposalOperation);

export const proposalSchema = schema<Proposal>((input) => {
  const value = object(input, "proposal", [
    "id",
    "dispatchId",
    "questId",
    "title",
    "operations",
    "status",
    "createdAt",
    "updatedAt",
  ]);
  if (!Array.isArray(value.operations)) {
    throw new Error("proposal.operations must be an array");
  }
  return {
    id: idValue<ProposalId>(value.id, "proposal.id", "proposal"),
    dispatchId: idValue<DispatchId>(
      value.dispatchId,
      "proposal.dispatchId",
      "dispatch",
    ),
    questId: idValue<QuestId>(value.questId, "proposal.questId", "quest"),
    title: stringValue(value.title, "proposal.title", { nonEmpty: true }),
    operations: value.operations.map(parseProposalOperation),
    status: enumValue<ProposalStatus>(
      value.status,
      "proposal.status",
      PROPOSAL_STATUSES,
    ),
    createdAt: timestamp(value.createdAt, "proposal.createdAt"),
    updatedAt: timestamp(value.updatedAt, "proposal.updatedAt"),
  };
});

export const decisionSchema = schema<Decision>((input) => {
  const value = object(input, "decision", [
    "id",
    "proposalId",
    "outcome",
    "selectedOperationIndexes",
    "rationale",
    "reviewer",
    "createdAt",
  ]);
  if (!Array.isArray(value.selectedOperationIndexes)) {
    throw new Error("decision.selectedOperationIndexes must be an array");
  }
  const selectedOperationIndexes = value.selectedOperationIndexes.map(
    (entry, index) => {
      if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 0) {
        throw new Error(
          `decision.selectedOperationIndexes[${index}] must be a non-negative integer`,
        );
      }
      return entry;
    },
  );
  if (new Set(selectedOperationIndexes).size !== selectedOperationIndexes.length) {
    throw new Error("decision.selectedOperationIndexes must not contain duplicates");
  }
  return {
    id: idValue<DecisionId>(value.id, "decision.id", "decision"),
    proposalId: idValue<ProposalId>(
      value.proposalId,
      "decision.proposalId",
      "proposal",
    ),
    outcome: enumValue<DecisionOutcome>(
      value.outcome,
      "decision.outcome",
      DECISION_OUTCOMES,
    ),
    selectedOperationIndexes,
    rationale: stringValue(value.rationale, "decision.rationale", {
      nonEmpty: true,
    }),
    reviewer: stringValue(value.reviewer, "decision.reviewer", {
      nonEmpty: true,
    }),
    createdAt: timestamp(value.createdAt, "decision.createdAt"),
  };
});

export const activationIdSchema = schema<ActivationId>((input) =>
  idValue<ActivationId>(input, "activationId", "activation"),
);

export const approvalIdSchema = schema<ApprovalId>((input) =>
  idValue<ApprovalId>(input, "approvalId", "approval"),
);

export const resultIdSchema = schema<ResultId>((input) =>
  idValue<ResultId>(input, "resultId", "result"),
);

export const proposalIdSchema = schema<ProposalId>((input) =>
  idValue<ProposalId>(input, "proposalId", "proposal"),
);

export const researchActivationSchema = schema<ResearchActivation>((input) => {
  const value = object(input, "activation", [
    "id",
    "dispatchId",
    "questId",
    "capabilityId",
    "mode",
    "procedure",
    "policyDigest",
    "requestDigest",
    "scopeHash",
    "maxDurationMinutes",
    "maxDispatches",
    "createdAt",
  ]);
  const procedure = object(value.procedure, "activation.procedure", [
    "id",
    "version",
    "digest",
  ]);
  return {
    id: idValue<ActivationId>(value.id, "activation.id", "activation"),
    dispatchId: idValue<DispatchId>(
      value.dispatchId,
      "activation.dispatchId",
      "dispatch",
    ),
    questId: idValue<QuestId>(value.questId, "activation.questId", "quest"),
    capabilityId: stringValue(value.capabilityId, "activation.capabilityId", {
      nonEmpty: true,
    }),
    mode: enumValue(value.mode, "activation.mode", [
      "automatic",
      "explicit",
    ] as const),
    procedure: {
      id: stringValue(procedure.id, "activation.procedure.id", {
        nonEmpty: true,
      }),
      version: stringValue(procedure.version, "activation.procedure.version", {
        nonEmpty: true,
      }),
      digest: sha256Binding(
        procedure.digest,
        "activation.procedure.digest",
      ),
    },
    policyDigest: sha256Binding(
      value.policyDigest,
      "activation.policyDigest",
    ),
    requestDigest: sha256Binding(
      value.requestDigest,
      "activation.requestDigest",
    ),
    scopeHash: sha256Binding(value.scopeHash, "activation.scopeHash"),
    maxDurationMinutes: positiveInteger(
      value.maxDurationMinutes,
      "activation.maxDurationMinutes",
    ),
    maxDispatches: positiveInteger(
      value.maxDispatches,
      "activation.maxDispatches",
    ),
    createdAt: schemaV2Timestamp(value.createdAt, "activation.createdAt"),
  };
});

export const researchApprovalGrantSchema = schema<ResearchApprovalGrant>(
  (input) => {
    const value = object(input, "approval", [
      "id",
      "activationId",
      "dispatchId",
      "host",
      "mode",
      "approverLabel",
      "rationale",
      "requestDigest",
      "procedureDigest",
      "policyDigest",
      "scopeHash",
      "grantedAt",
      "expiresAt",
    ]);
    return {
      id: idValue<ApprovalId>(value.id, "approval.id", "approval"),
      activationId: idValue<ActivationId>(
        value.activationId,
        "approval.activationId",
        "activation",
      ),
      dispatchId: idValue<DispatchId>(
        value.dispatchId,
        "approval.dispatchId",
        "dispatch",
      ),
      host: enumValue(value.host, "approval.host", ["claude", "codex"] as const),
      mode: enumValue(value.mode, "approval.mode", [
        "automatic",
        "interactive",
      ] as const),
      approverLabel: boundedString(
        value.approverLabel,
        "approval.approverLabel",
        128,
      ),
      rationale: boundedString(value.rationale, "approval.rationale", 1_024),
      requestDigest: sha256Binding(
        value.requestDigest,
        "approval.requestDigest",
      ),
      procedureDigest: sha256Binding(
        value.procedureDigest,
        "approval.procedureDigest",
      ),
      policyDigest: sha256Binding(
        value.policyDigest,
        "approval.policyDigest",
      ),
      scopeHash: sha256Binding(value.scopeHash, "approval.scopeHash"),
      grantedAt: schemaV2Timestamp(value.grantedAt, "approval.grantedAt"),
      expiresAt: schemaV2Timestamp(value.expiresAt, "approval.expiresAt"),
    };
  },
);

export const researchApprovalStateSchema = schema<ResearchApprovalState>(
  (input) => {
    const base = object(
      input,
      "approval state",
      [
        "grant",
        "status",
        "revokedAt",
        "revocationReason",
        "consumedAt",
        "resultId",
        "proposalId",
      ],
      ["grant", "status"],
    );
    const grant = researchApprovalGrantSchema.parse(base.grant);
    const status = enumValue(base.status, "approval state.status", [
      "granted",
      "revoked",
      "consumed",
    ] as const);
    if (status === "granted") {
      object(input, "approval state", ["grant", "status"]);
      return { grant, status };
    }
    if (status === "revoked") {
      const value = object(input, "approval state", [
        "grant",
        "status",
        "revokedAt",
        "revocationReason",
      ]);
      return {
        grant,
        status,
        revokedAt: schemaV2Timestamp(
          value.revokedAt,
          "approval state.revokedAt",
        ),
        revocationReason: boundedString(
          value.revocationReason,
          "approval state.revocationReason",
          1_024,
        ),
      };
    }
    const value = object(input, "approval state", [
      "grant",
      "status",
      "consumedAt",
      "resultId",
      "proposalId",
    ]);
    return {
      grant,
      status,
      consumedAt: schemaV2Timestamp(
        value.consumedAt,
        "approval state.consumedAt",
      ),
      resultId: idValue<ResultId>(value.resultId, "approval state.resultId", "result"),
      proposalId: idValue<ProposalId>(
        value.proposalId,
        "approval state.proposalId",
        "proposal",
      ),
    };
  },
);

export const researchActorSchema = schema<ResearchActor>((input) => {
  const value = object(input, "actor", ["type", "id"]);
  return {
    type: enumValue(value.type, "actor.type", ["agent", "user", "system"] as const),
    id: stringValue(value.id, "actor.id", { nonEmpty: true }),
  };
});

export const researchProvenanceSchema = schema<ResearchProvenance>((input) => {
  const value = object(input, "provenance", ["source", "sourceId"], ["source"]);
  const out: ResearchProvenance = {
    source: stringValue(value.source, "provenance.source", { nonEmpty: true }),
  };
  if (value.sourceId !== undefined) {
    out.sourceId = stringValue(value.sourceId, "provenance.sourceId", {
      nonEmpty: true,
    });
  }
  return out;
});

export const researchAggregateRefSchema = schema<ResearchAggregateRef>((input) => {
  const value = object(input, "aggregate", ["type", "id"]);
  const type = enumValue<ResearchAggregateType>(
    value.type,
    "aggregate.type",
    AGGREGATE_TYPES,
  );
  const kind: ResearchIdKind = type === "workspace" ? "workspace" : type;
  return {
    type,
    id: idValue(value.id, "aggregate.id", kind),
  };
});

export const researchSchemaV2AggregateRefSchema =
  schema<ResearchSchemaV2AggregateRef>((input) => {
    const value = object(input, "aggregate", ["type", "id"]);
    const type = enumValue<ResearchSchemaV2AggregateType>(
      value.type,
      "aggregate.type",
      [...AGGREGATE_TYPES, "activation", "approval"] as const,
    );
    const kind: ResearchIdKind = type === "workspace" ? "workspace" : type;
    return {
      type,
      id: idValue(value.id, "aggregate.id", kind),
    };
  });

export const eventIdSchema = schema<EventId>((input) =>
  idValue<EventId>(input, "eventId", "event"),
);

export function parseQuestStatus(input: unknown): QuestStatus {
  return enumValue(input, "quest status", QUEST_STATUSES);
}
export function parseQuestStage(input: unknown): QuestStage {
  return enumValue(input, "quest stage", QUEST_STAGES);
}
export function parseCampaignStatus(input: unknown): CampaignStatus {
  return enumValue(input, "campaign status", CAMPAIGN_STATUSES);
}
export function parseRunStatus(input: unknown): RunStatus {
  return enumValue(input, "run status", RUN_STATUSES);
}
export function parseEvidenceStatus(input: unknown): EvidenceStatus {
  return enumValue(input, "evidence status", EVIDENCE_STATUSES);
}
export function parseClaimStatus(input: unknown): ClaimStatus {
  return enumValue(input, "claim status", CLAIM_STATUSES);
}

export function parseIsoTimestamp(input: unknown, name = "timestamp"): string {
  return timestamp(input, name);
}

export function parseResearchSchemaV2Timestamp(
  input: unknown,
  name = "timestamp",
): string {
  return schemaV2Timestamp(input, name);
}

export function parseNonEmptyString(input: unknown, name: string): string {
  return stringValue(input, name, { nonEmpty: true });
}

export function parseStringArray(input: unknown, name: string): string[] {
  return stringArray(input, name);
}

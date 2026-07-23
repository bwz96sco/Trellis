import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  dispatchSchema,
  normalizeArtifactPath,
  parseResearchExecutionHost,
  readResearchState,
  RESEARCH_STAGE_CAPABILITIES,
  resolveResearchStageCapability,
  type ArtifactRef,
  type Dispatch,
  type DispatchId,
  type ResearchExecutionHost,
  type RepositoryId,
} from "@mindfoldhq/trellis-core/research";

import { resolveResearchRoot, type ResearchRootOptions } from "./common.js";
import {
  ResearchDispatchContextError,
  type ResearchDispatchContextErrorCode,
} from "./errors.js";
import {
  resolveResearchRepositoryContext,
  type ResearchRepositoryContextResolution,
} from "./repository.js";

const DISPATCH_REQUEST =
  /^(\.trellis\/research\/dispatches\/(dsp_[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/request\.json)$/;
const CANONICAL_SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_CONTEXT_ENTRIES = 128;
const MAX_LIST_ENTRIES = 128;
const MAX_STRING_LENGTH = 16_384;

export type ResearchDispatchContextWarningCode =
  | "LEGACY_OWNER_SKILL_IGNORED"
  | "OWNER_SKILL_STAGE_MISMATCH"
  | "PROVIDER_HINT_MISMATCH"
  | "TASK_REF_IGNORED";

export interface ResearchDispatchContextWarning {
  code: ResearchDispatchContextWarningCode;
  message: string;
}

export interface GetResearchDispatchContextOptions extends ResearchRootOptions {
  requestFile: string;
  host: string;
  discoveredSkillNames?: readonly string[];
}

interface BoundedArtifactRef {
  id: ArtifactRef["id"];
  repositoryId: ArtifactRef["repositoryId"];
  path: string;
  kind: string | null;
  revision: string | null;
  sha256: string | null;
  mediaType: string | null;
}

export interface ResearchDispatchContextResult {
  schemaVersion: 1;
  command: "research dispatch context";
  valid: true;
  host: ResearchExecutionHost;
  ledgerHead: number;
  requestRef: string;
  dispatch: {
    id: Dispatch["id"];
    questId: Dispatch["questId"];
    campaignId: NonNullable<Dispatch["campaignId"]>;
    runId: Dispatch["runId"];
    repositoryId: Dispatch["repositoryId"];
    declaredOwnerSkill: string;
    providerHint: string | null;
    taskRef: string | null;
    createdAt: string;
  };
  capability: {
    stage: Exclude<
      ReturnType<typeof resolveResearchStageCapability>["stage"],
      "complete"
    >;
    capability: NonNullable<
      ReturnType<typeof resolveResearchStageCapability>["capability"]
    >;
    optionalSkill: NonNullable<
      ReturnType<typeof resolveResearchStageCapability>["optionalSkill"]
    >;
    fallbackSkill: NonNullable<
      ReturnType<typeof resolveResearchStageCapability>["fallbackSkill"]
    >;
    selectedSkill: NonNullable<
      ReturnType<typeof resolveResearchStageCapability>["selectedSkill"]
    >;
    source: NonNullable<
      ReturnType<typeof resolveResearchStageCapability>["source"]
    >;
  };
  warnings: ResearchDispatchContextWarning[];
  repository: {
    id: RepositoryId;
    name: string;
    kind: ResearchRepositoryContextResolution["repository"]["kind"];
    path: string;
    gitRoot: string | null;
    revision: string | null;
    resolutionSource: "binding" | "locator";
    remoteVerified: boolean;
  };
  work: {
    objective: string;
    acceptanceCriteria: string[];
    context: (
      | { type: "text"; text: string }
      | {
          type: "artifact";
          artifact: BoundedArtifactRef;
          resolvedPath: string;
          contentIncluded: false;
        }
    )[];
    allowedWritePaths: { path: string; resolvedPath: string }[];
    expectedOutputs: string[];
    checks: string[];
  };
  authority: {
    readScope: "declared-context-only";
    writeScope: "allowed-write-paths-only";
    canonicalResearchMutation: false;
    proposalReview: false;
    gitHistoryMutation: false;
    recordResult: false;
  };
  outputContract: {
    type: "result-plus-pending-proposal";
    result: { dispatchId: Dispatch["id"]; runId: Dispatch["runId"] };
    proposal: {
      dispatchId: Dispatch["id"];
      questId: Dispatch["questId"];
      status: "pending";
    };
  };
}

function fail(code: ResearchDispatchContextErrorCode, message: string): never {
  throw new ResearchDispatchContextError(code, message);
}

function assertStringBound(value: string, label: string): void {
  if (value.length > MAX_STRING_LENGTH) {
    fail(
      "CONTEXT_LIMIT_EXCEEDED",
      `${label} must contain at most ${MAX_STRING_LENGTH} characters`,
    );
  }
}

function assertStringListBound(values: readonly string[], label: string): void {
  if (values.length > MAX_LIST_ENTRIES) {
    fail(
      "CONTEXT_LIMIT_EXCEEDED",
      `${label} must contain at most ${MAX_LIST_ENTRIES} entries`,
    );
  }
  for (const [index, value] of values.entries()) {
    assertStringBound(value, `${label}[${index}]`);
  }
}

function assertArtifactBounds(artifact: ArtifactRef, label: string): void {
  for (const [name, value] of Object.entries(artifact)) {
    if (typeof value === "string") assertStringBound(value, `${label}.${name}`);
  }
}

function assertDispatchBounds(dispatch: Dispatch): void {
  assertStringBound(dispatch.ownerSkill, "dispatch.ownerSkill");
  assertStringBound(dispatch.objective, "dispatch.objective");
  assertStringBound(dispatch.createdAt, "dispatch.createdAt");
  if (dispatch.provider !== undefined) {
    assertStringBound(dispatch.provider, "dispatch.provider");
  }
  if (dispatch.taskRef !== undefined) {
    assertStringBound(dispatch.taskRef, "dispatch.taskRef");
  }
  assertStringListBound(
    dispatch.acceptanceCriteria,
    "dispatch.acceptanceCriteria",
  );
  assertStringListBound(
    dispatch.allowedWritePaths,
    "dispatch.allowedWritePaths",
  );
  assertStringListBound(dispatch.expectedOutputs, "dispatch.expectedOutputs");
  assertStringListBound(dispatch.checks, "dispatch.checks");
  if (dispatch.context.length > MAX_CONTEXT_ENTRIES) {
    fail(
      "CONTEXT_LIMIT_EXCEEDED",
      `dispatch.context must contain at most ${MAX_CONTEXT_ENTRIES} entries`,
    );
  }
  for (const [index, entry] of dispatch.context.entries()) {
    if (entry.text !== undefined) {
      assertStringBound(entry.text, `dispatch.context[${index}].text`);
    } else if (entry.artifact !== undefined) {
      assertArtifactBounds(
        entry.artifact,
        `dispatch.context[${index}].artifact`,
      );
    }
  }
}

function parseHost(value: string): ResearchExecutionHost {
  try {
    return parseResearchExecutionHost(value);
  } catch {
    fail("INVALID_HOST", "Research host must be exactly 'claude' or 'codex'");
  }
}

function parseSkillNames(names: readonly string[]): string[] {
  if (names.length > MAX_LIST_ENTRIES) {
    fail(
      "CONTEXT_LIMIT_EXCEEDED",
      `skill names must contain at most ${MAX_LIST_ENTRIES} entries`,
    );
  }
  const normalized = new Set<string>();
  for (const name of names) {
    assertStringBound(name, "skill name");
    const trimmed = name.trim();
    if (trimmed.length === 0) continue;
    if (!CANONICAL_SKILL_NAME.test(trimmed)) {
      fail(
        "INVALID_SKILL_NAME",
        `Research skill name '${trimmed.slice(0, 128)}' must be a canonical lowercase name`,
      );
    }
    normalized.add(trimmed);
  }
  return [...normalized];
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function parseRequestReference(requestFile: string): {
  requestRef: string;
  dispatchId: DispatchId;
} {
  if (
    requestFile.includes("\0") ||
    requestFile.includes("\\") ||
    path.isAbsolute(requestFile) ||
    /^[A-Za-z]:/.test(requestFile)
  ) {
    fail(
      "INVALID_REQUEST_PATH",
      "Dispatch request path must be canonical and relative",
    );
  }
  const match = DISPATCH_REQUEST.exec(requestFile);
  if (!match) {
    fail(
      "INVALID_REQUEST_PATH",
      "Dispatch request path must match .trellis/research/dispatches/<dsp-id>/request.json",
    );
  }
  return { requestRef: match[1], dispatchId: match[2] as DispatchId };
}

function resolveCanonicalRequestPath(
  root: string,
  requestRef: string,
  dispatchId: DispatchId,
): string {
  const requestPath = path.join(root, ...requestRef.split("/"));
  let requestStat: fs.Stats;
  let requestLinkStat: fs.Stats;
  try {
    requestStat = fs.statSync(requestPath);
    requestLinkStat = fs.lstatSync(requestPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      fail(
        "REQUEST_NOT_FOUND",
        `Dispatch request '${requestRef}' was not found`,
      );
    }
    fail(
      "INVALID_REQUEST_PATH",
      `Dispatch request '${requestRef}' is not readable`,
    );
  }
  if (!requestStat.isFile() || requestLinkStat.isSymbolicLink()) {
    fail(
      "INVALID_REQUEST_PATH",
      `Dispatch request '${requestRef}' must be a regular file`,
    );
  }

  try {
    const canonicalRoot = fs.realpathSync(root);
    const canonicalDispatches = fs.realpathSync(
      path.join(root, ".trellis", "research", "dispatches"),
    );
    const expectedDispatches = path.join(
      canonicalRoot,
      ".trellis",
      "research",
      "dispatches",
    );
    if (canonicalDispatches !== expectedDispatches) {
      fail(
        "INVALID_REQUEST_PATH",
        "Dispatch request directory must not use symlink aliases",
      );
    }
    const canonicalDirectory = fs.realpathSync(path.dirname(requestPath));
    if (
      path.relative(canonicalDispatches, canonicalDirectory) !== dispatchId ||
      !isContained(canonicalDispatches, canonicalDirectory)
    ) {
      fail(
        "INVALID_REQUEST_PATH",
        "Dispatch request directory does not match its Dispatch ID",
      );
    }
    const canonicalRequest = fs.realpathSync(requestPath);
    if (
      path.dirname(canonicalRequest) !== canonicalDirectory ||
      path.basename(canonicalRequest) !== "request.json"
    ) {
      fail(
        "INVALID_REQUEST_PATH",
        "Dispatch request must not escape through a symlink",
      );
    }
    return canonicalRequest;
  } catch (error) {
    if (error instanceof ResearchDispatchContextError) throw error;
    fail(
      "INVALID_REQUEST_PATH",
      `Dispatch request '${requestRef}' is not canonical`,
    );
  }
}

function readDispatchRequest(
  requestPath: string,
  requestRef: string,
  dispatchId: DispatchId,
): Dispatch {
  let requestJson: string;
  try {
    requestJson = fs.readFileSync(requestPath, "utf-8");
  } catch {
    fail(
      "INVALID_REQUEST",
      `Dispatch request '${requestRef}' could not be read`,
    );
  }
  let input: unknown;
  try {
    input = JSON.parse(requestJson);
  } catch {
    fail(
      "INVALID_REQUEST",
      `Dispatch request '${requestRef}' is not valid JSON`,
    );
  }
  let dispatch: Dispatch;
  try {
    dispatch = dispatchSchema.parse(input);
  } catch {
    fail("INVALID_REQUEST", `Dispatch request '${requestRef}' is invalid`);
  }
  assertDispatchBounds(dispatch);
  if (dispatch.id !== dispatchId) {
    fail(
      "INVALID_REQUEST",
      "Dispatch request ID does not match its request path",
    );
  }
  return dispatch;
}

function resolveContainedRepositoryPath(
  repositoryRoot: string,
  portablePath: string,
  options: {
    requireFile: boolean;
    code: "ARTIFACT_INVALID" | "WRITE_SCOPE_INVALID";
  },
): string {
  let normalized: string;
  try {
    normalized = normalizeArtifactPath(portablePath);
  } catch {
    fail(options.code, "Repository-relative path is not portable");
  }
  let canonicalRoot: string;
  try {
    canonicalRoot = fs.realpathSync(repositoryRoot);
  } catch {
    fail(options.code, "Target Repository root could not be resolved");
  }
  const lexicalPath = path.resolve(canonicalRoot, ...normalized.split("/"));
  if (!isContained(canonicalRoot, lexicalPath)) {
    fail(
      options.code,
      "Repository-relative path escapes the target Repository",
    );
  }

  if (options.requireFile && !fs.existsSync(lexicalPath)) {
    fail(options.code, "Declared artifact path must exist as a regular file");
  }

  let ancestor = lexicalPath;
  while (ancestor !== canonicalRoot) {
    try {
      fs.lstatSync(ancestor);
      break;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") {
        fail(
          options.code,
          "Repository-relative path has an unreadable ancestor",
        );
      }
      ancestor = path.dirname(ancestor);
    }
  }
  let canonicalAncestor: string;
  try {
    canonicalAncestor = fs.realpathSync(ancestor);
  } catch {
    fail(options.code, "Repository-relative path has an unresolved ancestor");
  }
  const remainder = path.relative(ancestor, lexicalPath);
  const resolvedPath = path.resolve(canonicalAncestor, remainder);
  if (!isContained(canonicalRoot, resolvedPath)) {
    fail(
      options.code,
      "Repository-relative path escapes through a symlink ancestor",
    );
  }

  if (options.requireFile) {
    let canonicalFile: string;
    try {
      canonicalFile = fs.realpathSync(lexicalPath);
      if (!fs.statSync(canonicalFile).isFile()) {
        fail(options.code, "Declared artifact path must be a regular file");
      }
    } catch (error) {
      if (error instanceof ResearchDispatchContextError) throw error;
      fail(options.code, "Declared artifact path must be a regular file");
    }
    if (!isContained(canonicalRoot, canonicalFile)) {
      fail(options.code, "Declared artifact escapes through a symlink");
    }
    return canonicalFile;
  }

  return resolvedPath;
}

function boundedArtifact(artifact: ArtifactRef): BoundedArtifactRef {
  return {
    id: artifact.id,
    repositoryId: artifact.repositoryId,
    path: artifact.path,
    kind: artifact.kind ?? null,
    revision: artifact.revision ?? null,
    sha256: artifact.sha256 ?? null,
    mediaType: artifact.mediaType ?? null,
  };
}

function compatibilityWarnings(
  dispatch: Dispatch,
  host: ResearchExecutionHost,
  selectedSkill: string,
  fallbackSkill: string,
): ResearchDispatchContextWarning[] {
  const warnings: ResearchDispatchContextWarning[] = [];
  const knownFallbacks = new Set(
    Object.values(RESEARCH_STAGE_CAPABILITIES)
      .filter((definition) => definition.dispatchable)
      .map((definition) => definition.fallbackSkill),
  );
  if (
    dispatch.ownerSkill !== selectedSkill &&
    dispatch.ownerSkill !== fallbackSkill
  ) {
    if (knownFallbacks.has(dispatch.ownerSkill as never)) {
      warnings.push({
        code: "OWNER_SKILL_STAGE_MISMATCH",
        message:
          "Declared owner skill belongs to another Quest stage and was ignored",
      });
    } else {
      warnings.push({
        code: "LEGACY_OWNER_SKILL_IGNORED",
        message: "Declared owner skill is legacy metadata and was ignored",
      });
    }
  }
  if (dispatch.provider !== undefined && dispatch.provider !== host) {
    warnings.push({
      code: "PROVIDER_HINT_MISMATCH",
      message:
        "Declared provider hint differs from the requested host and was ignored",
    });
  }
  if (dispatch.taskRef !== undefined) {
    warnings.push({
      code: "TASK_REF_IGNORED",
      message:
        "Declared Task reference is provenance metadata and was not dereferenced",
    });
  }
  return warnings;
}

export async function getResearchDispatchContext(
  options: GetResearchDispatchContextOptions,
): Promise<ResearchDispatchContextResult> {
  const host = parseHost(options.host);
  const discoveredSkillNames = parseSkillNames(
    options.discoveredSkillNames ?? [],
  );
  const { requestRef, dispatchId } = parseRequestReference(options.requestFile);

  let root: string;
  try {
    root = resolveResearchRoot(options);
  } catch {
    fail(
      "INVALID_REQUEST_PATH",
      "Research control root must contain a .trellis directory",
    );
  }
  const requestPath = resolveCanonicalRequestPath(root, requestRef, dispatchId);
  const request = readDispatchRequest(requestPath, requestRef, dispatchId);

  let state: Awaited<ReturnType<typeof readResearchState>>;
  try {
    state = await readResearchState(root);
  } catch {
    fail(
      "INVALID_REQUEST",
      "Canonical Research ledger could not be read and reduced",
    );
  }
  const dispatch = state.dispatches[dispatchId];
  if (!dispatch) {
    fail(
      "DISPATCH_NOT_FOUND",
      "Canonical Research state does not contain this Dispatch",
    );
  }
  if (!isDeepStrictEqual(request, dispatch)) {
    fail(
      "REQUEST_STATE_MISMATCH",
      "Tracked Dispatch request does not match canonical ledger state",
    );
  }

  const quest = state.quests[dispatch.questId];
  if (!quest) {
    fail("DISPATCH_HIERARCHY_INVALID", "Dispatch Quest does not exist");
  }
  if (quest.status !== "active") {
    fail("QUEST_NOT_DISPATCHABLE", "Dispatch Quest must be active");
  }
  const capability = resolveResearchStageCapability({
    stage: quest.stage,
    host,
    discoveredSkillNames,
  });
  if (!capability.dispatchable) {
    fail("QUEST_NOT_DISPATCHABLE", "Dispatch Quest stage is not dispatchable");
  }

  const run = state.runs[dispatch.runId];
  if (!run || (run.status !== "planned" && run.status !== "running")) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Run must be planned or running",
    );
  }
  if (run.dispatchId !== dispatch.id) {
    fail("DISPATCH_HIERARCHY_INVALID", "Run Dispatch identity does not match");
  }
  const campaign = state.campaigns[run.campaignId];
  if (campaign?.questId !== quest.id) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Run Campaign does not belong to the Dispatch Quest",
    );
  }
  if (!campaign.runIds.includes(run.id)) {
    fail("DISPATCH_HIERARCHY_INVALID", "Run is not registered in its Campaign");
  }
  if (
    dispatch.campaignId !== undefined &&
    dispatch.campaignId !== campaign.id
  ) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Campaign does not match the Run Campaign",
    );
  }
  const repository = state.repositories[dispatch.repositoryId];
  if (!repository || !quest.repositoryIds.includes(repository.id)) {
    fail(
      "DISPATCH_HIERARCHY_INVALID",
      "Target Repository is not associated with the Dispatch Quest",
    );
  }

  let repositoryResolution: ResearchRepositoryContextResolution;
  try {
    repositoryResolution = await resolveResearchRepositoryContext(
      root,
      repository.id,
    );
  } catch {
    fail(
      "REPOSITORY_INVALID",
      "Target Repository could not be resolved or verified",
    );
  }
  if (!isDeepStrictEqual(repositoryResolution.repository, repository)) {
    fail("REPOSITORY_INVALID", "Target Repository changed during preflight");
  }

  const context: ResearchDispatchContextResult["work"]["context"] = [];
  for (const entry of dispatch.context) {
    if (entry.text !== undefined) {
      context.push({ type: "text", text: entry.text });
      continue;
    }
    const artifact = entry.artifact;
    if (artifact?.repositoryId !== repository.id) {
      fail(
        "ARTIFACT_INVALID",
        "Dispatch artifact must belong to the target Repository",
      );
    }
    const registeredArtifact = state.artifacts[artifact.id];
    if (
      registeredArtifact !== undefined &&
      !isDeepStrictEqual(registeredArtifact, artifact)
    ) {
      fail(
        "ARTIFACT_INVALID",
        "Dispatch artifact differs from its canonical registration",
      );
    }
    const resolvedPath = resolveContainedRepositoryPath(
      repositoryResolution.path,
      artifact.path,
      { requireFile: true, code: "ARTIFACT_INVALID" },
    );
    if (
      artifact.revision !== undefined &&
      repositoryResolution.revision !== artifact.revision
    ) {
      fail(
        "ARTIFACT_INVALID",
        "Dispatch artifact revision does not match Repository HEAD",
      );
    }
    if (artifact.sha256 !== undefined) {
      let artifactBytes: Buffer;
      try {
        artifactBytes = fs.readFileSync(resolvedPath);
      } catch {
        fail(
          "ARTIFACT_INVALID",
          "Dispatch artifact could not be read for digest verification",
        );
      }
      const digest = createHash("sha256").update(artifactBytes).digest("hex");
      if (digest !== artifact.sha256) {
        fail(
          "ARTIFACT_INVALID",
          "Dispatch artifact SHA-256 digest does not match",
        );
      }
    }
    context.push({
      type: "artifact",
      artifact: boundedArtifact(artifact),
      resolvedPath,
      contentIncluded: false,
    });
  }

  const allowedWritePaths = dispatch.allowedWritePaths.map((portablePath) => ({
    path: portablePath,
    resolvedPath: resolveContainedRepositoryPath(
      repositoryResolution.path,
      portablePath,
      { requireFile: false, code: "WRITE_SCOPE_INVALID" },
    ),
  }));

  return {
    schemaVersion: 1,
    command: "research dispatch context",
    valid: true,
    host,
    ledgerHead: state.projectedThroughSeq,
    requestRef,
    dispatch: {
      id: dispatch.id,
      questId: dispatch.questId,
      campaignId: campaign.id,
      runId: dispatch.runId,
      repositoryId: dispatch.repositoryId,
      declaredOwnerSkill: dispatch.ownerSkill,
      providerHint: dispatch.provider ?? null,
      taskRef: dispatch.taskRef ?? null,
      createdAt: dispatch.createdAt,
    },
    capability: {
      stage: capability.stage,
      capability: capability.capability,
      optionalSkill: capability.optionalSkill,
      fallbackSkill: capability.fallbackSkill,
      selectedSkill: capability.selectedSkill,
      source: capability.source,
    },
    warnings: compatibilityWarnings(
      dispatch,
      host,
      capability.selectedSkill,
      capability.fallbackSkill,
    ),
    repository: {
      id: repository.id,
      name: repository.name,
      kind: repository.kind,
      path: repositoryResolution.path,
      gitRoot: repositoryResolution.gitRoot,
      revision: repositoryResolution.revision,
      resolutionSource: repositoryResolution.source,
      remoteVerified: repositoryResolution.remoteVerified,
    },
    work: {
      objective: dispatch.objective,
      acceptanceCriteria: [...dispatch.acceptanceCriteria],
      context,
      allowedWritePaths,
      expectedOutputs: [...dispatch.expectedOutputs],
      checks: [...dispatch.checks],
    },
    authority: {
      readScope: "declared-context-only",
      writeScope: "allowed-write-paths-only",
      canonicalResearchMutation: false,
      proposalReview: false,
      gitHistoryMutation: false,
      recordResult: false,
    },
    outputContract: {
      type: "result-plus-pending-proposal",
      result: { dispatchId: dispatch.id, runId: dispatch.runId },
      proposal: {
        dispatchId: dispatch.id,
        questId: dispatch.questId,
        status: "pending",
      },
    },
  };
}

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  approvalIdSchema,
  createActivationId,
  createDecisionId,
  createDispatchId,
  isAuthoritativeMethodologyProcedureVersion,
  isV13ClosureArtifactExactPath,
  V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
  normalizeArtifactPath,
  parseCanonicalMethodologyClosureArtifact,
  proposalOperationsToMutations,
  proposalSchema,
  readResearchLedger,
  readResearchState,
  reduceResearchEvents,
  resolveProcedureClosureDisposition,
  serializeMethodologyReportV2Sidecar,
  resolveResearchCapability,
  resultSchema,
  stableResearchJson,
  validateProposalOperationsForCapability,
  type ApprovalId,
  type ArtifactRef,
  type CampaignId,
  type Decision,
  type Dispatch,
  type DispatchContextEntry,
  type DispatchId,
  type Proposal,
  type ProposalId,
  type ProposalOperation,
  type QuestId,
  type QuestStage,
  type RepositoryId,
  type ResearchActivation,
  type ResearchApprovalState,
  type ResearchEvent,
  type ResearchMutation,
  type ResearchState,
  type Result,
  type ResultId,
  type RunId,
  type V13ProcedureClosureDisposition,
} from "@mindfoldhq/trellis-core/research";

import { writeFileAtomic } from "../../utils/atomic-write.js";
import {
  requireResearchText,
  resolveResearchRoot,
  type ResearchMutationOptions,
  type ResearchMutationResult,
} from "./common.js";
import {
  ResearchActivationError,
  ResearchDispatchFileError,
} from "./errors.js";
import {
  classifyPrepareEvents,
  executeResearchLifecycleMutations,
  findResearchLifecycleReplay,
} from "./dispatch-activation-command.js";
import {
  activationFromCandidate,
  resolveDispatchActivationCandidate,
} from "./dispatch-authority.js";
import {
  materializeResearchActivation,
  materializeResearchApproval,
  materializeResearchProposal,
  materializeResearchResult,
} from "./dispatch-activation-materialization.js";
import {
  readResearchContainedFile,
  readResearchDispatchMaterialization,
  ResearchDispatchMaterializationReadError,
} from "./dispatch-materialization-reader.js";
import {
  classifyResearchOutputIdOccupation,
  deriveResearchOutputIds,
} from "./dispatch-output-ids.js";
import {
  revalidateDispatchActivationStaged,
  type StagedDispatchRevalidation,
} from "./dispatch-revalidation.js";
import {
  materializeMethodologyReportV2Sidecar,
  validateMethodologyBeforeRecord,
} from "./dispatch-methodology-validation.js";
import { executeRepositoryDispatchMutations } from "./mutation.js";
import {
  resolveRepositoryForUse,
  type RepositoryObservation,
} from "./repository.js";
import { parseStrictJsonInput } from "./strict-json-input.js";

export interface PrepareResearchDispatchOptions extends ResearchMutationOptions {
  id?: DispatchId;
  runId: RunId;
  questId: QuestId;
  campaignId?: CampaignId;
  repositoryId: RepositoryId;
  ownerSkill: string;
  provider?: string;
  objective: string;
  acceptanceCriteria: string[];
  contextFile?: string;
  allowedWritePaths: string[];
  expectedOutputs: string[];
  checks: string[];
  taskRef?: string;
  capabilityId: string;
}

export interface PrepareResearchDispatchResult extends ResearchMutationResult {
  dispatch: Dispatch;
  legacyPrepare: boolean;
  activation: ResearchActivation | null;
  requestFile: string | null;
  activationFile: string | null;
  manifestFile: string | null;
}

export type ResearchDispatchResultInput =
  | {
      readonly kind: "path";
      readonly path: string;
      readonly cwd: string;
    }
  | {
      readonly kind: "stdin";
      readonly read: () => Uint8Array;
      readonly cwd: string;
    };

export interface RecordResearchDispatchResultOptions extends ResearchMutationOptions {
  readonly dispatchId: DispatchId;
  readonly approvalId: ApprovalId;
  readonly input: ResearchDispatchResultInput;
}

export interface RecordApprovedResearchDispatchResultOptions extends RecordResearchDispatchResultOptions {
  readonly now?: Date;
}

export interface RecordApprovedResearchDispatchResultResult extends ResearchMutationResult {
  readonly result: Result;
  readonly proposal: Proposal;
  readonly approval: ResearchApprovalState;
  readonly resultFile: string | null;
  readonly proposalFile: string | null;
  readonly approvalFile: string | null;
}

export type RecordResearchDispatchResultResult =
  RecordApprovedResearchDispatchResultResult;

export interface ReviewResearchProposalOptions extends ResearchMutationOptions {
  proposalId: ProposalId;
  rationale: string;
  operationIndexes?: number[];
}

export interface ReviewResearchProposalResult extends ResearchMutationResult {
  decision: Decision;
  appliedEventIds: string[];
  rejectedOperationIndexes: number[];
  decisionFile: string | null;
}

interface DispatchPaths {
  trackedDir: string;
  runtimeDir: string;
  requestFile: string;
  resultFile: string;
  proposalFile: string;
  decisionFile: string;
  manifestFile: string;
}

interface DecisionFile {
  schemaVersion: 1;
  decision: Decision;
  rejectedOperationIndexes: number[];
  appliedEventIds: string[];
}

const ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertDispatchId(id: DispatchId): void {
  if (!id.startsWith("dsp_") || !ID_UUID.test(id.slice(4))) {
    throw new Error("dispatch ID must be a dsp_ prefixed UUID");
  }
}

function dispatchPaths(root: string, dispatchId: DispatchId): DispatchPaths {
  assertDispatchId(dispatchId);
  const trackedDir = path.join(
    root,
    ".trellis",
    "research",
    "dispatches",
    dispatchId,
  );
  const runtimeDir = path.join(
    root,
    ".trellis",
    ".runtime",
    "research",
    "dispatches",
    dispatchId,
  );
  return {
    trackedDir,
    runtimeDir,
    requestFile: path.join(trackedDir, "request.json"),
    resultFile: path.join(trackedDir, "result.json"),
    proposalFile: path.join(trackedDir, "proposal.json"),
    decisionFile: path.join(trackedDir, "decision.json"),
    manifestFile: path.join(runtimeDir, "manifest.json"),
  };
}

function relativeToRoot(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  writeFileAtomic(file, stableResearchJson(value));
}

function writeCommittedJson(
  root: string,
  headSeq: number,
  file: string,
  value: unknown,
  recovery: string,
): void {
  try {
    writeJson(file, value);
  } catch (error) {
    throw new ResearchDispatchFileError(
      headSeq,
      relativeToRoot(root, file),
      recovery,
      error,
    );
  }
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    throw new Error(
      `Unable to read JSON file '${file}': ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function assertPortableReference(value: string, label: string): string {
  requireResearchText(value, label);
  if (
    value.includes("\0") ||
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    /^[A-Za-z]:/.test(value)
  ) {
    throw new Error(
      `${label} must be a portable reference, not an absolute path`,
    );
  }
  return value;
}

function parseContextFile(file: string | undefined): DispatchContextEntry[] {
  if (file === undefined) return [];
  const parsed = readJson(path.resolve(process.cwd(), file));
  if (!Array.isArray(parsed))
    throw new Error("dispatch context file must contain an array");
  return parsed as DispatchContextEntry[];
}

function eventPayload<T>(
  events: readonly ResearchEvent[],
  kind: ResearchEvent["kind"],
  field: string,
): T {
  const event = events.find((candidate) => candidate.kind === kind);
  if (!event)
    throw new Error(`Committed research batch did not contain '${kind}'`);
  return event.payload[field] as T;
}

function resolvedArtifactPath(
  observation: RepositoryObservation,
  artifact: ArtifactRef,
): string {
  const artifactPath = path.resolve(
    observation.path,
    ...normalizeArtifactPath(artifact.path).split("/"),
  );
  const relative = path.relative(observation.path, artifactPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`)) {
    throw new Error(
      `Artifact '${artifact.id}' escapes repository '${artifact.repositoryId}'`,
    );
  }
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Artifact '${artifact.id}' path '${artifact.path}' must be a file`,
    );
  }
  const canonicalArtifactPath = fs.realpathSync(artifactPath);
  const canonicalRelative = path.relative(
    observation.path,
    canonicalArtifactPath,
  );
  if (
    canonicalRelative === ".." ||
    canonicalRelative.startsWith(`..${path.sep}`)
  ) {
    throw new Error(
      `Artifact '${artifact.id}' escapes repository '${artifact.repositoryId}'`,
    );
  }
  return canonicalArtifactPath;
}

async function verifyArtifact(
  root: string,
  artifact: ArtifactRef,
  persistObservation: boolean,
): Promise<string> {
  const resolved = await resolveRepositoryForUse(
    root,
    artifact.repositoryId,
    persistObservation,
  );
  const artifactPath = resolvedArtifactPath(resolved.observation, artifact);
  if (!fs.statSync(artifactPath).isFile()) {
    throw new Error(
      `Artifact '${artifact.id}' path '${artifact.path}' must be a file`,
    );
  }
  if (
    artifact.revision !== undefined &&
    resolved.observation.revision !== artifact.revision
  ) {
    throw new Error(
      `Artifact '${artifact.id}' expected revision '${artifact.revision}', received '${resolved.observation.revision ?? "none"}'`,
    );
  }
  if (artifact.sha256 !== undefined) {
    const digest = createHash("sha256")
      .update(fs.readFileSync(artifactPath))
      .digest("hex");
    if (digest !== artifact.sha256) {
      throw new Error(
        `Artifact '${artifact.id}' sha256 does not match '${artifact.path}'`,
      );
    }
  }
  return resolved.observation.path;
}

async function verifyArtifacts(
  root: string,
  artifacts: readonly ArtifactRef[],
  persistObservation: boolean,
): Promise<Partial<Record<RepositoryId, string>>> {
  const repositoryRoots: Partial<Record<RepositoryId, string>> = {};
  for (const artifact of artifacts) {
    repositoryRoots[artifact.repositoryId] = await verifyArtifact(
      root,
      artifact,
      persistObservation,
    );
  }
  return repositoryRoots;
}

function artifactsFromOperations(
  operations: readonly ProposalOperation[],
): ArtifactRef[] {
  const artifacts: ArtifactRef[] = [];
  for (const operation of operations) {
    if (operation.kind === "artifact.register")
      artifacts.push(operation.artifact);
    if (operation.kind === "evidence.create") {
      artifacts.push(...operation.evidence.artifactRefs);
    }
  }
  return artifacts;
}

function findDecisionForProposal(
  state: Awaited<ReturnType<typeof readResearchState>>,
  proposalId: ProposalId,
): Decision | undefined {
  return Object.values(state.decisions).find(
    (decision) => decision.proposalId === proposalId,
  );
}

async function existingDecisionResult(
  root: string,
  state: Awaited<ReturnType<typeof readResearchState>>,
  proposal: Proposal,
  outcome: Decision["outcome"],
  writeDecisionFile: boolean,
): Promise<ReviewResearchProposalResult | null> {
  const decision = findDecisionForProposal(state, proposal.id);
  if (!decision) return null;
  if (decision.outcome !== outcome) {
    throw new Error(
      `Proposal '${proposal.id}' was already finalized with outcome '${decision.outcome}'`,
    );
  }
  const ledger = await readResearchLedger(root);
  const decisionEvent = ledger.find(
    (event) =>
      event.kind === "decision.recorded" && event.aggregate.id === decision.id,
  );
  const events = decisionEvent
    ? ledger.filter(
        (event) => event.idempotencyKey === decisionEvent.idempotencyKey,
      )
    : [];
  const appliedEventIds = events
    .filter((event) => event.kind !== "decision.recorded")
    .map((event) => event.eventId);
  const rejectedOperationIndexes = proposal.operations
    .map((_, index) => index)
    .filter((index) => !decision.selectedOperationIndexes.includes(index));
  const dispatch = state.dispatches[proposal.dispatchId];
  if (!dispatch)
    throw new Error(`Unknown research dispatch '${proposal.dispatchId}'`);
  const file = dispatchPaths(root, dispatch.id).decisionFile;
  if (writeDecisionFile) {
    const command = outcome === "accept" ? "apply" : "reject";
    const recovery = `retry 'trellis research dispatch ${command} ${proposal.id}' with idempotency key '${decisionEvent?.idempotencyKey ?? `proposal:${proposal.id}:${outcome}`}'`;
    writeCommittedJson(
      root,
      state.projectedThroughSeq,
      file,
      {
        schemaVersion: 1,
        decision,
        rejectedOperationIndexes,
        appliedEventIds,
      } satisfies DecisionFile,
      recovery,
    );
  }
  return {
    command: `research dispatch ${outcome === "accept" ? "apply" : "reject"}`,
    idempotencyKey:
      decisionEvent?.idempotencyKey ?? `proposal:${proposal.id}:${outcome}`,
    dryRun: !writeDecisionFile,
    replayed: true,
    headSeq: state.projectedThroughSeq,
    events,
    decision,
    appliedEventIds,
    rejectedOperationIndexes,
    decisionFile: writeDecisionFile ? relativeToRoot(root, file) : null,
  };
}

export async function prepareResearchDispatch(
  options: PrepareResearchDispatchOptions,
): Promise<PrepareResearchDispatchResult> {
  const root = resolveResearchRoot(options);
  if (options.idempotencyKey !== undefined) {
    const replay = await findResearchLifecycleReplay({
      root,
      idempotencyKey: options.idempotencyKey,
      classify: (events) => classifyPrepareEvents(events, options.id),
    });
    if (replay !== null) {
      const classified = classifyPrepareEvents(replay, options.id);
      const repositoryResolution = await resolveRepositoryForUse(
        root,
        classified.dispatch.repositoryId,
        false,
      );
      const headSeq = (await readResearchState(root)).projectedThroughSeq;
      const result: ResearchMutationResult = {
        command: "research dispatch prepare",
        idempotencyKey: options.idempotencyKey,
        dryRun: options.dryRun === true,
        replayed: true,
        headSeq,
        events: replay,
      };
      if (result.dryRun) {
        return {
          ...result,
          dispatch: classified.dispatch,
          legacyPrepare: classified.legacy,
          activation: classified.activation,
          requestFile: null,
          activationFile: null,
          manifestFile: null,
        };
      }
      const files = dispatchPaths(root, classified.dispatch.id);
      const recovery = `retry 'trellis research dispatch prepare' with idempotency key '${result.idempotencyKey}'`;
      writeCommittedJson(
        root,
        headSeq,
        files.requestFile,
        classified.dispatch,
        recovery,
      );
      writeCommittedJson(
        root,
        headSeq,
        files.manifestFile,
        {
          schemaVersion: 1,
          dispatchId: classified.dispatch.id,
          controlRoot: root,
          repositoryRoot: repositoryResolution.observation.path,
          requestFile: files.requestFile,
          observation: repositoryResolution.observation,
          generatedAt: classified.dispatch.createdAt,
        },
        recovery,
      );
      return {
        ...result,
        dispatch: classified.dispatch,
        legacyPrepare: classified.legacy,
        activation: classified.activation,
        requestFile: relativeToRoot(root, files.requestFile),
        activationFile:
          classified.activation === null
            ? null
            : materializeResearchActivation({
                root,
                headSeq,
                activation: classified.activation,
                recovery,
              }),
        manifestFile: relativeToRoot(root, files.manifestFile),
      };
    }
  }

  const context = parseContextFile(options.contextFile);
  const createdAt = new Date().toISOString();
  const dispatch: Dispatch = {
    id: options.id ?? createDispatchId(),
    questId: options.questId,
    ...(options.campaignId === undefined
      ? {}
      : { campaignId: options.campaignId }),
    runId: options.runId,
    repositoryId: options.repositoryId,
    ownerSkill: requireResearchText(options.ownerSkill, "owner skill"),
    ...(options.provider === undefined
      ? {}
      : { provider: requireResearchText(options.provider, "provider") }),
    objective: requireResearchText(options.objective, "objective"),
    acceptanceCriteria: options.acceptanceCriteria,
    context,
    allowedWritePaths: options.allowedWritePaths.map(normalizeArtifactPath),
    expectedOutputs: options.expectedOutputs,
    checks: options.checks,
    ...(options.taskRef === undefined
      ? {}
      : { taskRef: assertPortableReference(options.taskRef, "task ref") }),
    createdAt,
  };
  const candidate = await resolveDispatchActivationCandidate({
    root,
    dispatch,
    capabilityId: options.capabilityId,
    candidate: true,
  });
  const activation = activationFromCandidate(
    candidate,
    createActivationId(),
    createdAt,
  );
  const repositoryResolution = await resolveRepositoryForUse(
    root,
    options.repositoryId,
    false,
  );
  const artifactRepositoryRoots = await verifyArtifacts(
    root,
    context
      .map((entry) => entry.artifact)
      .filter((artifact): artifact is ArtifactRef => artifact !== undefined),
    false,
  );
  const result = await executeResearchLifecycleMutations({
    command: "prepare",
    root,
    options,
    mutations: [
      { kind: "dispatch.record", dispatch },
      { kind: "activation.plan", activation },
    ],
    timestamp: createdAt,
    classify: (events) => classifyPrepareEvents(events, dispatch.id),
    artifactRepositoryRoots,
  });
  const canonical = classifyPrepareEvents(result.events, dispatch.id);
  if (canonical.legacy) {
    throw new Error("New prepare unexpectedly resolved to a legacy batch");
  }
  if (result.dryRun) {
    return {
      ...result,
      dispatch: canonical.dispatch,
      legacyPrepare: false,
      activation: canonical.activation,
      requestFile: null,
      activationFile: null,
      manifestFile: null,
    };
  }
  const canonicalRepositoryResolution = result.replayed
    ? await resolveRepositoryForUse(
        root,
        canonical.dispatch.repositoryId,
        false,
      )
    : repositoryResolution;
  const files = dispatchPaths(root, canonical.dispatch.id);
  const recovery = `retry 'trellis research dispatch prepare' with idempotency key '${result.idempotencyKey}'`;
  writeCommittedJson(
    root,
    result.headSeq,
    files.requestFile,
    canonical.dispatch,
    recovery,
  );
  writeCommittedJson(
    root,
    result.headSeq,
    files.manifestFile,
    {
      schemaVersion: 1,
      dispatchId: canonical.dispatch.id,
      controlRoot: root,
      repositoryRoot: canonicalRepositoryResolution.observation.path,
      requestFile: files.requestFile,
      observation: canonicalRepositoryResolution.observation,
      generatedAt: canonical.dispatch.createdAt,
    },
    recovery,
  );
  return {
    ...result,
    dispatch: canonical.dispatch,
    legacyPrepare: false,
    activation: canonical.activation,
    requestFile: relativeToRoot(root, files.requestFile),
    activationFile: materializeResearchActivation({
      root,
      headSeq: result.headSeq,
      activation: canonical.activation,
      recovery,
    }),
    manifestFile: relativeToRoot(root, files.manifestFile),
  };
}

function approvedResultError(
  code: ConstructorParameters<typeof ResearchActivationError>[0],
  message: string,
  cause?: unknown,
): never {
  throw new ResearchActivationError(code, message, { cause });
}

function resolveApprovedResultPreflight(
  options: RecordApprovedResearchDispatchResultOptions,
): {
  readonly root: string;
  readonly dispatchId: DispatchId;
  readonly approvalId: ApprovalId;
  readonly idempotencyKey: string;
  readonly input:
    | { readonly kind: "path"; readonly path: string }
    | { readonly kind: "stdin"; readonly read: () => Uint8Array };
} {
  assertDispatchId(options.dispatchId);
  const dispatchId = options.dispatchId;
  const approvalId = approvalIdSchema.parse(options.approvalId);
  if (!path.isAbsolute(options.input.cwd)) {
    throw new Error("record-result cwd must be absolute");
  }
  const root = path.resolve(options.input.cwd, options.root ?? ".");
  const idempotencyKey = requireResearchText(
    options.idempotencyKey ?? `cli:dispatch:record-result:${randomUUID()}`,
    "idempotency key",
  );
  return {
    root,
    dispatchId,
    approvalId,
    idempotencyKey,
    input:
      options.input.kind === "path"
        ? {
            kind: "path",
            path: path.resolve(options.input.cwd, options.input.path),
          }
        : { kind: "stdin", read: options.input.read },
  };
}

function serializeApprovedResultTimestamp(value: Date | undefined): string {
  const instant = value ?? new Date();
  if (!Number.isFinite(instant.getTime())) {
    approvedResultError("APPROVAL_EXPIRED", "record-result time is invalid");
  }
  return instant.toISOString();
}

async function validateApprovedResultRoot(root: string): Promise<void> {
  try {
    const trellis = await fs.promises.stat(path.join(root, ".trellis"));
    if (!trellis.isDirectory()) throw new Error("not a directory");
  } catch (error) {
    throw new Error(
      `Research root '${root}' must contain a .trellis directory`,
      {
        cause: error,
      },
    );
  }
}

function validateApprovedResultHierarchy(
  state: ResearchState,
  dispatch: Dispatch,
): QuestStage {
  const quest = state.quests[dispatch.questId];
  if (quest === undefined) {
    approvedResultError(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Quest does not exist",
    );
  }
  if (quest.status !== "active") {
    approvedResultError(
      "QUEST_NOT_DISPATCHABLE",
      "Dispatch Quest must be active",
    );
  }
  const run = state.runs[dispatch.runId];
  if (
    run === undefined ||
    (run.status !== "planned" && run.status !== "running")
  ) {
    approvedResultError(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Run must be planned or running",
    );
  }
  if (run.dispatchId !== dispatch.id) {
    approvedResultError(
      "DISPATCH_HIERARCHY_INVALID",
      "Run Dispatch identity does not match",
    );
  }
  const campaign = state.campaigns[run.campaignId];
  if (campaign?.questId !== quest.id) {
    approvedResultError(
      "DISPATCH_HIERARCHY_INVALID",
      "Run Campaign does not belong to the Dispatch Quest",
    );
  }
  if (!campaign.runIds.includes(run.id)) {
    approvedResultError(
      "DISPATCH_HIERARCHY_INVALID",
      "Run is not registered in its Campaign",
    );
  }
  if (
    dispatch.campaignId !== undefined &&
    dispatch.campaignId !== campaign.id
  ) {
    approvedResultError(
      "DISPATCH_HIERARCHY_INVALID",
      "Dispatch Campaign does not match the Run Campaign",
    );
  }
  const repository = state.repositories[dispatch.repositoryId];
  if (
    repository === undefined ||
    !quest.repositoryIds.includes(repository.id)
  ) {
    approvedResultError(
      "DISPATCH_HIERARCHY_INVALID",
      "Target Repository is not associated with the Dispatch Quest",
    );
  }
  return quest.stage;
}

function requireApprovedResultActivation(
  state: ResearchState,
  dispatch: Dispatch,
): ResearchActivation {
  const activationId = state.activationByDispatchId[dispatch.id];
  if (activationId === undefined) {
    approvedResultError(
      "ACTIVATION_REQUIRED",
      `Dispatch '${dispatch.id}' requires an activation`,
    );
  }
  const activation = state.activations[activationId];
  if (
    activation?.id !== activationId ||
    activation?.dispatchId !== dispatch.id ||
    activation?.questId !== dispatch.questId
  ) {
    approvedResultError(
      "APPROVAL_RELATION_MISMATCH",
      "Dispatch activation index does not match canonical state",
    );
  }
  return activation;
}

function requireApprovedResultApproval(
  state: ResearchState,
  activation: ResearchActivation,
  approvalId: ApprovalId,
): ResearchApprovalState {
  const approval = state.approvals[approvalId];
  if (approval === undefined) {
    approvedResultError(
      "APPROVAL_REQUIRED",
      `Approval '${approvalId}' was not found`,
    );
  }
  if (
    approval.grant.id !== approvalId ||
    approval.grant.activationId !== activation.id ||
    approval.grant.dispatchId !== activation.dispatchId ||
    approval.grant.requestDigest !== activation.requestDigest ||
    approval.grant.procedureDigest !== activation.procedure.digest ||
    approval.grant.policyDigest !== activation.policyDigest ||
    approval.grant.scopeHash !== activation.scopeHash ||
    !(state.approvalIdsByActivationId[activation.id] ?? []).includes(approvalId)
  ) {
    approvedResultError(
      "APPROVAL_RELATION_MISMATCH",
      "Selected approval does not match its activation bindings",
    );
  }
  return approval;
}

function validateApprovedResultBindings(
  activation: ResearchActivation,
  candidate: StagedDispatchRevalidation,
): void {
  if (
    candidate.authority.capabilityId !== activation.capabilityId ||
    candidate.authority.activation !== activation.mode ||
    candidate.authority.procedure.id !== activation.procedure.id ||
    candidate.authority.procedure.version !== activation.procedure.version ||
    candidate.authority.maxDurationMinutes !== activation.maxDurationMinutes ||
    candidate.authority.maxDispatches !== activation.maxDispatches
  ) {
    approvedResultError(
      "APPROVAL_RELATION_MISMATCH",
      "Activation authority no longer matches canonical state",
    );
  }
}

function classifyApprovedResultEvents(
  events: readonly ResearchEvent[],
  dispatchId: DispatchId,
  approvalId: ApprovalId,
): { readonly result: Result; readonly proposal: Proposal } {
  const ids = deriveResearchOutputIds(approvalId);
  const result = events[0]?.payload.result as Result | undefined;
  const proposal = events[1]?.payload.proposal as Proposal | undefined;
  const consumption = events[2];
  if (
    events.length !== 3 ||
    events[0]?.schemaVersion !== 1 ||
    events[0].kind !== "result.recorded" ||
    events[1]?.schemaVersion !== 1 ||
    events[1].kind !== "proposal.recorded" ||
    consumption?.schemaVersion !== 2 ||
    consumption.kind !== "approval.consumed" ||
    result?.id !== ids.resultId ||
    result.dispatchId !== dispatchId ||
    proposal?.id !== ids.proposalId ||
    proposal.dispatchId !== dispatchId ||
    consumption.payload.approvalId !== approvalId ||
    consumption.payload.resultId !== ids.resultId ||
    consumption.payload.proposalId !== ids.proposalId
  ) {
    approvedResultError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "Idempotency key belongs to another command, target, approval, or batch shape",
    );
  }
  return { result, proposal };
}

function consumedApprovalFromEvents(
  approval: ResearchApprovalState,
  events: readonly ResearchEvent[],
): ResearchApprovalState {
  const consumption = events[2];
  if (
    approval.status === "consumed" &&
    consumption?.kind === "approval.consumed"
  ) {
    return approval;
  }
  if (consumption?.kind !== "approval.consumed") {
    approvedResultError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "Result batch is missing approval consumption",
    );
  }
  return {
    grant: approval.grant,
    status: "consumed",
    consumedAt: consumption.payload.consumedAt as string,
    resultId: consumption.payload.resultId as Result["id"],
    proposalId: consumption.payload.proposalId as Proposal["id"],
  };
}

function materializeApprovedResult(input: {
  readonly root: string;
  readonly headSeq: number;
  readonly idempotencyKey: string;
  readonly result: Result;
  readonly proposal: Proposal;
  readonly approval: ResearchApprovalState;
}): Pick<
  RecordApprovedResearchDispatchResultResult,
  "resultFile" | "proposalFile" | "approvalFile"
> {
  const recovery = [
    `trellis research dispatch record-result ${input.result.dispatchId}`,
    `--approval ${input.approval.grant.id}`,
    "--input -",
    `--root ${JSON.stringify(input.root)}`,
    `--idempotency-key ${JSON.stringify(input.idempotencyKey)}`,
  ].join(" ");
  const resultFile = materializeResearchResult({
    root: input.root,
    headSeq: input.headSeq,
    result: input.result,
    recovery,
  });
  const proposalFile = materializeResearchProposal({
    root: input.root,
    headSeq: input.headSeq,
    proposal: input.proposal,
    recovery,
  });
  return {
    resultFile,
    proposalFile,
    approvalFile: materializeResearchApproval({
      root: input.root,
      headSeq: input.headSeq,
      approval: input.approval,
      recovery,
    }),
  };
}

function isApprovedResultOutputIdConflict(
  error: unknown,
  resultId: ResultId,
  proposalId: ProposalId,
): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message === `Research result '${resultId}' already exists` ||
    error.message === `Research proposal '${proposalId}' already exists`
  );
}

function parseApprovedResultInput(
  bytes: Uint8Array,
  dispatch: Dispatch,
  approvalId: ApprovalId,
): { readonly result: Result; readonly proposal: Proposal } {
  const input = parseStrictJsonInput(bytes);
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("result input must be a JSON object");
  }
  const value = input as Record<string, unknown>;
  const keys = Object.keys(value);
  if (keys.length !== 2 || !("result" in value) || !("proposal" in value)) {
    throw new Error("result input must contain exactly result and proposal");
  }
  if (keys[0] !== "result" || keys[1] !== "proposal") {
    throw new Error("result input must contain result followed by proposal");
  }
  const result = resultSchema.parse(value.result);
  const proposal = proposalSchema.parse(value.proposal);
  if (
    result.status === "blocked" &&
    (proposal.status !== "pending" || proposal.operations.length !== 0)
  ) {
    throw new Error("blocked Result requires an empty pending Proposal");
  }
  const ids = deriveResearchOutputIds(approvalId);
  if (result.id !== ids.resultId || proposal.id !== ids.proposalId) {
    throw new Error("Result and Proposal IDs must match the selected approval");
  }
  if (result.dispatchId !== dispatch.id || result.runId !== dispatch.runId) {
    throw new Error("Result relations do not match the requested dispatch");
  }
  if (
    proposal.dispatchId !== dispatch.id ||
    proposal.questId !== dispatch.questId
  ) {
    throw new Error("Proposal relations do not match the requested dispatch");
  }
  if (result.sessionRef !== undefined) {
    assertPortableReference(result.sessionRef, "result session ref");
  }
  return { result, proposal };
}

/**
 * CS5-2/CS5-4: derive canonical closure facts for accepted successor
 * procedures (2.0.4/2.0.5/2.0.6) from the Result ArtifactRefs. Exact path
 * equality, exact contract id, submitted media type, full closure ArtifactRef
 * set rejection, digest verification, and closed disposition. Reused by the
 * primary record path and by same-key replay reconstruction.
 */
function deriveCanonicalClosureFacts(input: {
  readonly procedureId: string;
  readonly procedureVersion: string;
  readonly artifactRefs: readonly ArtifactRef[];
  readonly artifactRepositoryRoots: Readonly<
    Record<string, string | undefined>
  >;
}): {
  readonly disposition?: V13ProcedureClosureDisposition;
  readonly selected?: boolean;
  readonly blocked?: boolean;
  readonly closureArtifactRef?: Readonly<{
    readonly artifactId: string;
    readonly exactPath: string;
    readonly sha256: string;
    readonly mediaType: string;
  }>;
} {
  const needsCanonicalClosure =
    isAuthoritativeMethodologyProcedureVersion(input.procedureVersion) &&
    (input.procedureVersion === "2.0.4" ||
      input.procedureVersion === "2.0.5" ||
      input.procedureVersion === "2.0.6");
  if (!needsCanonicalClosure) {
    return {};
  }
  const disposition = resolveProcedureClosureDisposition(input.procedureId);
  if (disposition.kind === "notApplicable") {
    // N/A families: no closure lookup; Result.status is never closure authority.
    return { disposition };
  }
  const closureRefs = input.artifactRefs.filter(
    (ref) => ref.path === disposition.exactPath,
  );
  if (closureRefs.length !== 1) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      `Canonical closure ArtifactRef for family '${disposition.family}' must be exactly one with exact path '${disposition.exactPath}' (count=${String(closureRefs.length)}); zero-write enforced`,
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  const closureRef = closureRefs[0] as ArtifactRef;
  if (closureRef.id !== disposition.closureContractId) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      `Closure ArtifactRef id '${closureRef.id}' must equal the exact contract id '${disposition.closureContractId}'; zero-write enforced`,
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  if (closureRef.mediaType !== disposition.mediaType) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      `Closure ArtifactRef submitted mediaType '${closureRef.mediaType}' must equal '${disposition.mediaType}'; zero-write enforced`,
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  if (typeof closureRef.sha256 !== "string" || closureRef.sha256.length === 0) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      "Canonical closure ArtifactRef requires content digest; zero-write enforced",
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  const closurePathRefs = input.artifactRefs.filter((ref) =>
    isV13ClosureArtifactExactPath(ref.path),
  );
  if (closurePathRefs.length !== 1 || closurePathRefs[0] !== closureRef) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      `Evidence must bind exactly one closure ArtifactRef (bound ${String(closurePathRefs.length)} closure-path refs); zero-write enforced`,
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  const closureSha256 = closureRef.sha256;
  const repoRoot = input.artifactRepositoryRoots[closureRef.repositoryId];
  if (repoRoot === undefined) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      "Canonical closure ArtifactRef repository root unresolved; zero-write enforced",
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  const closureAbs = path.join(repoRoot, closureRef.path);
  let closureBytes: Buffer;
  try {
    closureBytes = fs.readFileSync(closureAbs);
  } catch {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      `Canonical closure artifact unreadable at '${closureRef.path}'; zero-write enforced`,
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  const actualDigest = createHash("sha256").update(closureBytes).digest("hex");
  if (actualDigest !== closureSha256) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      "Canonical closure artifact digest drift; zero-write enforced",
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  const parsedClosure = parseCanonicalMethodologyClosureArtifact({
    bytes: new Uint8Array(closureBytes),
    expectedFamily: disposition.family,
    closureArtifactId: closureRef.id,
    boundArtifactIds: input.artifactRefs.map((ref) => ref.id),
    forbiddenClosureArtifactIds: input.artifactRefs
      .filter((ref) => isV13ClosureArtifactExactPath(ref.path))
      .map((ref) => ref.id),
  });
  if (!parsedClosure.ok) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      `Canonical closure parse failed (${parsedClosure.code}): ${parsedClosure.message}; zero-write enforced`,
    );
    throw new Error("unreachable: approvedResultError must throw");
  }
  return {
    disposition,
    selected: parsedClosure.closure.selected,
    blocked: parsedClosure.closure.blocked,
    closureArtifactRef: {
      artifactId: closureRef.id,
      exactPath: closureRef.path,
      sha256: closureSha256,
      mediaType: closureRef.mediaType,
    },
  };
}

export async function recordApprovedResearchDispatchResult(
  options: RecordApprovedResearchDispatchResultOptions,
): Promise<RecordApprovedResearchDispatchResultResult> {
  const preflight = resolveApprovedResultPreflight(options);
  await validateApprovedResultRoot(preflight.root);
  const ledger = await readResearchLedger(preflight.root);
  const state = reduceResearchEvents(ledger);
  const replay = ledger.filter(
    (event) => event.idempotencyKey === preflight.idempotencyKey,
  );
  if (replay.length > 0) {
    const canonical = classifyApprovedResultEvents(
      replay,
      preflight.dispatchId,
      preflight.approvalId,
    );
    const approval = state.approvals[preflight.approvalId];
    if (
      approval?.status !== "consumed" ||
      approval?.resultId !== canonical.result.id ||
      approval?.proposalId !== canonical.proposal.id
    ) {
      approvedResultError(
        "IDEMPOTENCY_KEY_CONFLICT",
        "Replayed approval consumption does not match canonical state",
      );
    }
    const result: RecordApprovedResearchDispatchResultResult = {
      command: "research dispatch record-result",
      idempotencyKey: preflight.idempotencyKey,
      dryRun: options.dryRun === true,
      replayed: true,
      headSeq: state.projectedThroughSeq,
      events: replay,
      result: canonical.result,
      proposal: canonical.proposal,
      approval,
      resultFile: null,
      proposalFile: null,
      approvalFile: null,
    };
    if (result.dryRun) return result;
    // CS5-4: replay-before-clock/input — reconstruct report-v2 from canonical
    // state ONLY for accepted successor procedures (2.0.4/2.0.5/2.0.6).
    // Live 1.0.0 / historical replays keep their prior behavior untouched.
    const replayActivationIdForVersion =
      state.activationByDispatchId[preflight.dispatchId];
    const replayActivationForVersion =
      replayActivationIdForVersion === undefined
        ? undefined
        : state.activations[replayActivationIdForVersion];
    const replayNeedsReportReconstruction =
      replayActivationForVersion !== undefined &&
      (replayActivationForVersion.procedure.version === "2.0.4" ||
        replayActivationForVersion.procedure.version === "2.0.5" ||
        replayActivationForVersion.procedure.version === "2.0.6");
    if (!replayNeedsReportReconstruction) {
      return {
        ...result,
        ...materializeApprovedResult({
          root: preflight.root,
          headSeq: result.headSeq,
          idempotencyKey: result.idempotencyKey,
          result: result.result,
          proposal: result.proposal,
          approval: result.approval,
        }),
      };
    }
    // (reconstruction below)
    // state plus the authenticated package and ArtifactRefs. No ledger event;
    // identical bytes are a no-op; missing or non-equivalent projections are
    // atomically repaired through the hardened adapter. If bound artifacts or
    // the authenticated package are unavailable or digest-drifted, recovery
    // fails without altering canonical state.
    let replayReportFile: string | null = null;
    try {
      const replayDispatch = state.dispatches[preflight.dispatchId];
      if (replayDispatch === undefined) {
        approvedResultError(
          "DISPATCH_NOT_FOUND",
          `Dispatch '${preflight.dispatchId}' was not found`,
        );
        throw new Error("unreachable: approvedResultError must throw");
      }
      const replayActivationId =
        state.activationByDispatchId[replayDispatch.id];
      const replayActivation =
        replayActivationId === undefined
          ? undefined
          : state.activations[replayActivationId];
      if (replayActivation === undefined) {
        approvedResultError(
          "ACTIVATION_REQUIRED",
          "Replayed Dispatch activation missing from canonical state",
        );
        throw new Error("unreachable: approvedResultError must throw");
      }
      const replayCandidate = await revalidateDispatchActivationStaged({
        root: preflight.root,
        state,
        dispatch: replayDispatch,
        activation: replayActivation,
      });
      const replayRoots = await verifyArtifacts(
        preflight.root,
        canonical.result.artifactRefs,
        false,
      );
      const replayClosure = deriveCanonicalClosureFacts({
        procedureId: replayActivation.procedure.id,
        procedureVersion: replayActivation.procedure.version,
        artifactRefs: canonical.result.artifactRefs,
        artifactRepositoryRoots: replayRoots,
      });
      const replayGate = validateMethodologyBeforeRecord({
        procedureId: replayActivation.procedure.id,
        procedureVersion: replayActivation.procedure.version,
        procedureDigest: replayActivation.procedure.digest,
        procedure: replayCandidate.procedure,
        capabilityId: replayActivation.capabilityId,
        dispatchId: replayDispatch.id,
        activationId: replayActivation.id,
        requestDigest: replayActivation.requestDigest,
        policyDigest: replayActivation.policyDigest,
        scopeHash: replayActivation.scopeHash,
        terminalState: canonical.result.status,
        resultStatus: canonical.result.status,
        proposalStatus: canonical.proposal.status,
        proposalOperationCount: canonical.proposal.operations.length,
        selected: replayClosure.selected,
        blocked: replayClosure.blocked,
        closureDisposition: replayClosure.disposition,
        closureArtifactRef: replayClosure.closureArtifactRef,
        batchCommitted: true,
        acceptedMemberAggregateSha256: V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
        resultId: canonical.result.id,
        proposalId: canonical.proposal.id,
        approvalId: preflight.approvalId,
        idempotencyKey: preflight.idempotencyKey,
        batchHeadSeq: result.headSeq,
        artifactRefFacts: canonical.result.artifactRefs.map((ref) => ({
          artifactId: ref.id,
          repositoryId: ref.repositoryId,
          resolvedRepositoryIdentity: replayRoots[ref.repositoryId],
          exactPath: ref.path,
          submittedMediaType: ref.mediaType,
          submittedSha256: ref.sha256,
          present: true,
        })),
        dispatchContext: {
          questId: replayDispatch.questId,
          dispatchId: replayDispatch.id,
          activationId: replayActivation.id,
          approvalId: preflight.approvalId,
          capabilityId: replayActivation.capabilityId,
        },
      });
      if (replayGate.materializeSidecar) {
        const expectedBytes = serializeMethodologyReportV2Sidecar(
          replayGate.reportV2,
        );
        const targetPath = path.join(
          preflight.root,
          ".trellis",
          "research",
          "dispatches",
          preflight.dispatchId,
          "methodology-report-v2.json",
        );
        let existing: string | undefined;
        try {
          existing = fs.readFileSync(targetPath, "utf8");
        } catch {
          existing = undefined;
        }
        if (existing !== expectedBytes) {
          replayReportFile = materializeMethodologyReportV2Sidecar({
            root: preflight.root,
            headSeq: result.headSeq,
            dispatchId: preflight.dispatchId,
            reportV2: replayGate.reportV2,
            recovery: `trellis research dispatch record-result ${replayDispatch.id} --approval ${preflight.approvalId} --input - --root ${JSON.stringify(preflight.root)} --idempotency-key ${JSON.stringify(preflight.idempotencyKey)}`,
          });
        } else {
          replayReportFile = path
            .relative(preflight.root, targetPath)
            .split(path.sep)
            .join("/");
        }
      }
    } catch (error) {
      // Recovery failure leaves canonical state untouched: bound artifacts or
      // the authenticated package are unavailable/drifted, or revalidation
      // failed. Report projection-recovery status without a ledger change.
      throw new ResearchDispatchFileError(
        result.headSeq,
        `.trellis/research/dispatches/${preflight.dispatchId}/methodology-report-v2.json`,
        `trellis research dispatch record-result ${preflight.dispatchId} --approval ${preflight.approvalId} --input - --root ${JSON.stringify(preflight.root)} --idempotency-key ${JSON.stringify(preflight.idempotencyKey)}`,
        error,
      );
    }
    return {
      ...result,
      ...materializeApprovedResult({
        root: preflight.root,
        headSeq: result.headSeq,
        idempotencyKey: result.idempotencyKey,
        result: result.result,
        proposal: result.proposal,
        approval: result.approval,
      }),
      ...(replayReportFile !== null
        ? { methodologyReportFile: replayReportFile }
        : {}),
    };
  }

  const timestamp = serializeApprovedResultTimestamp(options.now);
  const dispatch = state.dispatches[preflight.dispatchId];
  if (dispatch === undefined) {
    approvedResultError(
      "DISPATCH_NOT_FOUND",
      `Dispatch '${preflight.dispatchId}' was not found`,
    );
  }
  const stage = validateApprovedResultHierarchy(state, dispatch);
  if (
    Object.values(state.results).some(
      (result) => result.dispatchId === dispatch.id,
    ) ||
    Object.values(state.proposals).some(
      (proposal) => proposal.dispatchId === dispatch.id,
    )
  ) {
    approvedResultError(
      "DISPATCH_ALREADY_COMPLETED",
      `Dispatch '${dispatch.id}' is already completed`,
    );
  }
  const activation = requireApprovedResultActivation(state, dispatch);
  const approval = requireApprovedResultApproval(
    state,
    activation,
    preflight.approvalId,
  );
  if (approval.status === "consumed") {
    approvedResultError(
      "DISPATCH_ALREADY_COMPLETED",
      `Approval '${preflight.approvalId}' is already consumed`,
    );
  }
  if (approval.status === "revoked") {
    approvedResultError(
      "APPROVAL_REVOKED",
      `Approval '${preflight.approvalId}' is revoked`,
    );
  }
  if (Date.parse(timestamp) >= Date.parse(approval.grant.expiresAt)) {
    approvedResultError(
      "APPROVAL_EXPIRED",
      `Approval '${preflight.approvalId}' is expired`,
    );
  }
  try {
    resolveResearchCapability({ stage, capabilityId: activation.capabilityId });
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "UNKNOWN_CAPABILITY" ||
        error.code === "CAPABILITY_STAGE_MISMATCH")
        ? error.code
        : "DISPATCH_HIERARCHY_INVALID";
    approvedResultError(
      code,
      error instanceof Error ? error.message : String(error),
      error,
    );
  }
  try {
    readResearchDispatchMaterialization({
      root: preflight.root,
      dispatchId: dispatch.id,
      kind: "request",
      expected: dispatch,
    });
  } catch (error) {
    if (error instanceof ResearchDispatchMaterializationReadError) {
      approvedResultError("REQUEST_STATE_MISMATCH", error.message, error);
    }
    throw error;
  }
  const candidate = await revalidateDispatchActivationStaged({
    root: preflight.root,
    state,
    dispatch,
    activation,
  });
  validateApprovedResultBindings(activation, candidate);
  const ids = deriveResearchOutputIds(approval.grant.id);
  if (
    classifyResearchOutputIdOccupation({
      state,
      dispatchId: dispatch.id,
      ids,
    }) !== "available"
  ) {
    approvedResultError(
      "OUTPUT_ID_CONFLICT",
      "Approval-derived Result or Proposal ID is already occupied",
    );
  }
  const bytes =
    preflight.input.kind === "path"
      ? readResearchContainedFile(preflight.root, preflight.input.path)
      : preflight.input.read();
  const parsed = parseApprovedResultInput(
    bytes,
    dispatch,
    preflight.approvalId,
  );
  const artifactRepositoryRoots = await verifyArtifacts(
    preflight.root,
    parsed.result.artifactRefs,
    false,
  );
  const resultStatus = parsed.result.status;
  const procedureVersion = activation.procedure.version;
  const procedureId = activation.procedure.id;
  const closureFacts = deriveCanonicalClosureFacts({
    procedureId,
    procedureVersion,
    artifactRefs: parsed.result.artifactRefs,
    artifactRepositoryRoots,
  });
  const closureSelected = closureFacts.selected;
  const closureBlocked = closureFacts.blocked;
  const closureDisposition = closureFacts.disposition;
  const closureArtifactRef = closureFacts.closureArtifactRef;
  // Live 1.0.0 / historical non-authoritative: do not invent v1.3 closure from status.
  // Only pass selected/blocked when canonical closure was parsed.
  const methodologyGate = validateMethodologyBeforeRecord({
    procedureId,
    procedureVersion,
    procedureDigest: activation.procedure.digest,
    procedure: candidate.procedure,
    capabilityId: activation.capabilityId,
    dispatchId: dispatch.id,
    activationId: activation.id,
    requestDigest: activation.requestDigest,
    policyDigest: activation.policyDigest,
    scopeHash: activation.scopeHash,
    terminalState: resultStatus,
    resultStatus,
    proposalStatus: parsed.proposal.status,
    proposalOperationCount: parsed.proposal.operations.length,
    selected: closureSelected,
    blocked: closureBlocked,
    closureDisposition,
    closureArtifactRef,
    batchCommitted: false,
    acceptedMemberAggregateSha256: V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    resultId: parsed.result.id,
    proposalId: parsed.proposal.id,
    approvalId: preflight.approvalId,
    idempotencyKey: preflight.idempotencyKey,
    batchHeadSeq: state.projectedThroughSeq,
    artifactRefFacts: parsed.result.artifactRefs.map((ref) => ({
      artifactId: ref.id,
      repositoryId: ref.repositoryId,
      resolvedRepositoryIdentity: artifactRepositoryRoots[ref.repositoryId],
      exactPath: ref.path,
      submittedMediaType: ref.mediaType,
      submittedSha256: ref.sha256,
      present: true,
    })),
    dispatchContext: {
      questId: dispatch.questId,
      dispatchId: dispatch.id,
      activationId: activation.id,
      approvalId: preflight.approvalId,
      capabilityId: activation.capabilityId,
    },
  });
  if (methodologyGate.criticalFailure || !methodologyGate.ok) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      `Methodology validation failed for activation '${activation.id}' (critical=${String(methodologyGate.criticalFailure)}); zero-write enforced`,
    );
  }
  // Capability-contained Proposal operations at recording time.
  const operationGate = validateProposalOperationsForCapability({
    capabilityId: activation.capabilityId,
    operations: parsed.proposal.operations,
  });
  if (!operationGate.ok) {
    approvedResultError(
      "METHODOLOGY_VALIDATION_FAILED",
      operationGate.message ??
        `Proposal operations not allowed for capability '${activation.capabilityId}'`,
    );
  }
  const mutations: readonly ResearchMutation[] = [
    { kind: "result.record", result: parsed.result },
    { kind: "proposal.record", proposal: parsed.proposal },
    {
      kind: "approval.consume",
      approvalId: preflight.approvalId,
      resultId: parsed.result.id,
      proposalId: parsed.proposal.id,
    },
  ];
  let committed: ResearchMutationResult;
  try {
    committed = await executeResearchLifecycleMutations({
      command: "record-result",
      root: preflight.root,
      options: {
        root: preflight.root,
        idempotencyKey: preflight.idempotencyKey,
        dryRun: options.dryRun,
      },
      mutations,
      timestamp: timestamp,
      classify: (events) => {
        classifyApprovedResultEvents(
          events,
          preflight.dispatchId,
          preflight.approvalId,
        );
      },
      artifactRepositoryRoots,
    });
  } catch (error) {
    let latestState: ResearchState | undefined;
    try {
      latestState = await readResearchState(preflight.root);
    } catch {
      // Preserve the commit failure when current state cannot be re-read.
    }
    const latestApproval = latestState?.approvals[preflight.approvalId];
    if (latestApproval?.status === "revoked") {
      approvedResultError(
        "APPROVAL_REVOKED",
        `Approval '${preflight.approvalId}' is revoked`,
        error,
      );
    }
    if (
      latestApproval?.status === "consumed" ||
      Object.values(latestState?.results ?? {}).some(
        (result) => result.dispatchId === dispatch.id,
      ) ||
      Object.values(latestState?.proposals ?? {}).some(
        (proposal) => proposal.dispatchId === dispatch.id,
      )
    ) {
      approvedResultError(
        "DISPATCH_ALREADY_COMPLETED",
        `Dispatch '${dispatch.id}' is already completed`,
        error,
      );
    }
    if (
      isApprovedResultOutputIdConflict(
        error,
        parsed.result.id,
        parsed.proposal.id,
      )
    ) {
      approvedResultError(
        "OUTPUT_ID_CONFLICT",
        "Approval-derived Result or Proposal ID was occupied before commit",
        error,
      );
    }
    throw error;
  }
  const canonical = classifyApprovedResultEvents(
    committed.events,
    preflight.dispatchId,
    preflight.approvalId,
  );
  const canonicalApproval = consumedApprovalFromEvents(
    approval,
    committed.events,
  );
  const result: RecordApprovedResearchDispatchResultResult = {
    ...committed,
    result: canonical.result,
    proposal: canonical.proposal,
    approval: canonicalApproval,
    resultFile: null,
    proposalFile: null,
    approvalFile: null,
  };
  if (result.dryRun) return result;
  const materialized = materializeApprovedResult({
    root: preflight.root,
    headSeq: result.headSeq,
    idempotencyKey: result.idempotencyKey,
    result: result.result,
    proposal: result.proposal,
    approval: result.approval,
  });
  // R2B: report-v2 sidecar only after successful atomic batch commit.
  const postBatchGate = validateMethodologyBeforeRecord({
    procedureId,
    procedureVersion,
    procedureDigest: activation.procedure.digest,
    procedure: candidate.procedure,
    capabilityId: activation.capabilityId,
    dispatchId: dispatch.id,
    activationId: activation.id,
    requestDigest: activation.requestDigest,
    policyDigest: activation.policyDigest,
    scopeHash: activation.scopeHash,
    terminalState: resultStatus,
    resultStatus,
    proposalStatus: parsed.proposal.status,
    proposalOperationCount: parsed.proposal.operations.length,
    selected: closureSelected,
    blocked: closureBlocked,
    closureDisposition,
    closureArtifactRef,
    batchCommitted: true,
    acceptedMemberAggregateSha256: V13_ACCEPTED_MEMBER_AGGREGATE_SHA256,
    resultId: parsed.result.id,
    proposalId: parsed.proposal.id,
    approvalId: preflight.approvalId,
    idempotencyKey: preflight.idempotencyKey,
    batchHeadSeq: result.headSeq,
    artifactRefFacts: parsed.result.artifactRefs.map((ref) => ({
      artifactId: ref.id,
      repositoryId: ref.repositoryId,
      resolvedRepositoryIdentity: artifactRepositoryRoots[ref.repositoryId],
      exactPath: ref.path,
      submittedMediaType: ref.mediaType,
      submittedSha256: ref.sha256,
      present: true,
    })),
    dispatchContext: {
      questId: dispatch.questId,
      dispatchId: dispatch.id,
      activationId: activation.id,
      approvalId: preflight.approvalId,
      capabilityId: activation.capabilityId,
    },
  });
  if (postBatchGate.materializeSidecar) {
    materializeMethodologyReportV2Sidecar({
      root: preflight.root,
      headSeq: result.headSeq,
      dispatchId: dispatch.id,
      reportV2: postBatchGate.reportV2,
      recovery: `trellis research dispatch record-result ${dispatch.id} --approval ${preflight.approvalId} --input - --root ${JSON.stringify(preflight.root)} --idempotency-key ${JSON.stringify(preflight.idempotencyKey)}`,
    });
  }
  return {
    ...result,
    ...materialized,
  };
}

export async function recordResearchDispatchResult(
  options: RecordResearchDispatchResultOptions,
): Promise<RecordResearchDispatchResultResult> {
  return recordApprovedResearchDispatchResult({
    ...options,
    now: new Date(),
  });
}

async function reviewProposal(
  options: ReviewResearchProposalOptions,
  outcome: "accept" | "reject",
): Promise<ReviewResearchProposalResult> {
  const root = resolveResearchRoot(options);
  const state = await readResearchState(root);
  const proposal = state.proposals[options.proposalId];
  if (!proposal)
    throw new Error(`Unknown research proposal '${options.proposalId}'`);
  const existing = await existingDecisionResult(
    root,
    state,
    proposal,
    outcome,
    options.dryRun !== true,
  );
  if (existing) return existing;
  const allIndexes = proposal.operations.map((_, index) => index);
  const selected =
    outcome === "reject" ? [] : (options.operationIndexes ?? allIndexes);
  if (new Set(selected).size !== selected.length) {
    throw new Error("Proposal operation indexes must not contain duplicates");
  }
  if (
    selected.some(
      (index) =>
        !Number.isInteger(index) ||
        index < 0 ||
        index >= proposal.operations.length,
    )
  ) {
    throw new Error("Proposal operation index is out of range");
  }
  const selectedOperations = selected.map((index) => {
    const operation = proposal.operations[index];
    if (!operation) throw new Error(`Missing proposal operation ${index}`);
    return operation;
  });
  const dispatch = state.dispatches[proposal.dispatchId];
  if (!dispatch)
    throw new Error(`Unknown research dispatch '${proposal.dispatchId}'`);
  // Recover Activation → capability ancestry before applying persisted operations.
  const activationForAllowlist = Object.values(state.activations).find(
    (activation) => activation.dispatchId === dispatch.id,
  );
  if (activationForAllowlist === undefined) {
    throw new Error(
      `Cannot apply Proposal '${proposal.id}': no Activation found for Dispatch '${dispatch.id}'`,
    );
  }
  const applyGate = validateProposalOperationsForCapability({
    capabilityId: activationForAllowlist.capabilityId,
    operations: selectedOperations,
  });
  if (!applyGate.ok) {
    throw new Error(
      applyGate.message ??
        `Proposal operations not allowed for capability '${activationForAllowlist.capabilityId}'`,
    );
  }
  const artifactRepositoryRoots: Partial<Record<RepositoryId, string>> = {};
  if (outcome === "accept") {
    const resolved = await resolveRepositoryForUse(
      root,
      dispatch.repositoryId,
      options.dryRun !== true,
    );
    const result = Object.values(state.results).find(
      (candidate) => candidate.dispatchId === dispatch.id,
    );
    if (
      result?.revision !== undefined &&
      result.revision !== resolved.observation.revision
    ) {
      throw new Error(
        `Dispatch result expected revision '${result.revision}', received '${resolved.observation.revision ?? "none"}'`,
      );
    }
    Object.assign(
      artifactRepositoryRoots,
      await verifyArtifacts(
        root,
        artifactsFromOperations(selectedOperations),
        options.dryRun !== true,
      ),
    );
  }
  const createdAt = new Date().toISOString();
  const decision: Decision = {
    id: createDecisionId(),
    proposalId: proposal.id,
    outcome,
    selectedOperationIndexes: selected,
    rationale: requireResearchText(options.rationale, "decision rationale"),
    reviewer: "trellis-cli",
    createdAt,
  };
  const idempotencyKey =
    options.idempotencyKey ?? `proposal:${proposal.id}:${outcome}`;
  const committed = await executeRepositoryDispatchMutations(
    outcome === "accept" ? "dispatch apply" : "dispatch reject",
    { ...options, root, idempotencyKey },
    [
      ...proposalOperationsToMutations(selectedOperations),
      { kind: "decision.record", decision },
    ],
    artifactRepositoryRoots,
  );
  const canonicalDecision = eventPayload<Decision>(
    committed.events,
    "decision.recorded",
    "decision",
  );
  const appliedEventIds = committed.events
    .filter((event) => event.kind !== "decision.recorded")
    .map((event) => event.eventId);
  const rejectedOperationIndexes = allIndexes.filter(
    (index) => !selected.includes(index),
  );
  if (committed.dryRun) {
    return {
      ...committed,
      decision: canonicalDecision,
      appliedEventIds,
      rejectedOperationIndexes,
      decisionFile: null,
    };
  }
  const files = dispatchPaths(root, dispatch.id);
  const decisionFile: DecisionFile = {
    schemaVersion: 1,
    decision: canonicalDecision,
    rejectedOperationIndexes,
    appliedEventIds,
  };
  const recovery = `retry 'trellis research dispatch ${outcome === "accept" ? "apply" : "reject"} ${proposal.id}' with idempotency key '${committed.idempotencyKey}'`;
  writeCommittedJson(
    root,
    committed.headSeq,
    files.decisionFile,
    decisionFile,
    recovery,
  );
  return {
    ...committed,
    decision: canonicalDecision,
    appliedEventIds,
    rejectedOperationIndexes,
    decisionFile: relativeToRoot(root, files.decisionFile),
  };
}

export async function applyResearchProposal(
  options: ReviewResearchProposalOptions,
): Promise<ReviewResearchProposalResult> {
  return reviewProposal(options, "accept");
}

export async function rejectResearchProposal(
  options: ReviewResearchProposalOptions,
): Promise<ReviewResearchProposalResult> {
  return reviewProposal(options, "reject");
}

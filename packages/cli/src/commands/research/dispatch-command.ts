import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  createActivationId,
  createDecisionId,
  createDispatchId,
  normalizeArtifactPath,
  proposalOperationsToMutations,
  proposalSchema,
  readResearchLedger,
  readResearchState,
  resultSchema,
  stableResearchJson,
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
  type RepositoryId,
  type ResearchActivation,
  type ResearchEvent,
  type Result,
  type RunId,
} from "@mindfoldhq/trellis-core/research";

import { writeFileAtomic } from "../../utils/atomic-write.js";
import {
  requireResearchText,
  resolveResearchRoot,
  type ResearchMutationOptions,
  type ResearchMutationResult,
} from "./common.js";
import { ResearchDispatchFileError } from "./errors.js";
import {
  classifyPrepareEvents,
  executeResearchLifecycleMutations,
  findResearchLifecycleReplay,
} from "./dispatch-activation-command.js";
import {
  activationFromCandidate,
  resolveDispatchActivationCandidate,
} from "./dispatch-authority.js";
import { materializeResearchActivation } from "./dispatch-activation-materialization.js";
import { executeRepositoryDispatchMutations } from "./mutation.js";
import {
  resolveRepositoryForUse,
  type RepositoryObservation,
} from "./repository.js";

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

export interface RecordResearchDispatchResultOptions extends ResearchMutationOptions {
  dispatchId: DispatchId;
  file: string;
}

export interface RecordResearchDispatchResultResult extends ResearchMutationResult {
  result: Result;
  proposal: Proposal;
  resultFile: string | null;
  proposalFile: string | null;
}

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

export async function recordResearchDispatchResult(
  options: RecordResearchDispatchResultOptions,
): Promise<RecordResearchDispatchResultResult> {
  const root = resolveResearchRoot(options);
  const state = await readResearchState(root);
  const dispatch = state.dispatches[options.dispatchId];
  if (!dispatch)
    throw new Error(`Unknown research dispatch '${options.dispatchId}'`);
  const input = readJson(path.resolve(process.cwd(), options.file));
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("result input must be a JSON object");
  }
  const value = input as Record<string, unknown>;
  if (
    Object.keys(value).length !== 2 ||
    !("result" in value) ||
    !("proposal" in value)
  ) {
    throw new Error("result input must contain exactly result and proposal");
  }
  const resultValue = resultSchema.parse(value.result);
  const proposalValue = proposalSchema.parse(value.proposal);
  if (
    resultValue.dispatchId !== dispatch.id ||
    resultValue.runId !== dispatch.runId
  ) {
    throw new Error("Result IDs do not match the requested dispatch");
  }
  if (
    proposalValue.dispatchId !== dispatch.id ||
    proposalValue.questId !== dispatch.questId
  ) {
    throw new Error("Proposal IDs do not match the requested dispatch");
  }
  if (resultValue.sessionRef !== undefined) {
    assertPortableReference(resultValue.sessionRef, "result session ref");
  }
  const artifactRepositoryRoots = await verifyArtifacts(
    root,
    resultValue.artifactRefs,
    options.dryRun !== true,
  );
  const committed = await executeRepositoryDispatchMutations(
    "dispatch record-result",
    { ...options, root },
    [
      { kind: "result.record", result: resultValue },
      { kind: "proposal.record", proposal: proposalValue },
    ],
    artifactRepositoryRoots,
  );
  const canonicalResult = eventPayload<Result>(
    committed.events,
    "result.recorded",
    "result",
  );
  const canonicalProposal = eventPayload<Proposal>(
    committed.events,
    "proposal.recorded",
    "proposal",
  );
  if (committed.dryRun) {
    return {
      ...committed,
      result: canonicalResult,
      proposal: canonicalProposal,
      resultFile: null,
      proposalFile: null,
    };
  }
  const files = dispatchPaths(root, dispatch.id);
  const recovery = `retry 'trellis research dispatch record-result ${dispatch.id}' with idempotency key '${committed.idempotencyKey}'`;
  writeCommittedJson(
    root,
    committed.headSeq,
    files.resultFile,
    canonicalResult,
    recovery,
  );
  writeCommittedJson(
    root,
    committed.headSeq,
    files.proposalFile,
    canonicalProposal,
    recovery,
  );
  return {
    ...committed,
    result: canonicalResult,
    proposal: canonicalProposal,
    resultFile: relativeToRoot(root, files.resultFile),
    proposalFile: relativeToRoot(root, files.proposalFile),
  };
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

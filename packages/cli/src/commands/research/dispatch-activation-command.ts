import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";

import {
  commitResearchBatch,
  createActivationId,
  createApprovalId,
  getResearchStatus,
  parseResearchExecutionHost,
  readResearchLedger,
  readResearchState,
  validateResearchBatchReadOnly,
  type ActivationId,
  type ApprovalId,
  type Dispatch,
  type DispatchId,
  isExecutionPackageActivation,
  isExecutionPackageApprovalGrant,
  type ResearchActivation,
  type ResearchApprovalGrant,
  type ResearchApprovalState,
  type ResearchEvent,
  type ResearchExecutionHost,
  type ResearchMutation,
  type RepositoryId,
} from "@mindfoldhq/trellis-core/research";

import {
  requireResearchText,
  resolveResearchRoot,
  type ResearchMutationOptions,
  type ResearchMutationResult,
} from "./common.js";
import {
  activationFromCandidate,
  readCanonicalDispatchRequest,
  revalidateDispatchActivationBindings,
  resolveDispatchActivationCandidate,
  type DispatchActivationCandidate,
} from "./dispatch-authority.js";
import {
  materializeResearchActivation,
  materializeResearchApproval,
} from "./dispatch-activation-materialization.js";
import { ResearchActivationError } from "./errors.js";

export interface PlanResearchActivationOptions extends ResearchMutationOptions {
  readonly dispatchId: DispatchId;
  readonly capabilityId: string;
}

export interface PlanResearchActivationResult extends ResearchMutationResult {
  readonly activation: ResearchActivation;
  readonly activationFile: string | null;
}

export interface GrantResearchApprovalOptions extends ResearchMutationOptions {
  readonly dispatchId: DispatchId;
  readonly host: string;
}

export interface GrantResearchApprovalResult extends ResearchMutationResult {
  readonly approval: ResearchApprovalState;
  readonly approvalFile: string | null;
}

export interface RevokeResearchApprovalOptions extends ResearchMutationOptions {
  readonly approvalId: ApprovalId;
  readonly reason?: string;
}

export interface RevokeResearchApprovalResult extends ResearchMutationResult {
  readonly approval: ResearchApprovalState;
  readonly approvalFile: string | null;
}

interface InteractiveAdapter {
  readonly stdinIsTTY: boolean;
  readonly stdoutIsTTY: boolean;
  readonly stderrIsTTY: boolean;
  writeSummary(summary: string): void;
  question(prompt: string): Promise<string>;
  close(): void;
}

function activationError(
  code: ConstructorParameters<typeof ResearchActivationError>[0],
  message: string,
): never {
  throw new ResearchActivationError(code, message);
}

function requireMatchingApprovalBinding(
  activation: ResearchActivation,
  grant: ResearchApprovalGrant,
): void {
  if (
    isExecutionPackageActivation(activation) !==
      isExecutionPackageApprovalGrant(grant) ||
    (isExecutionPackageActivation(activation)
      ? !isExecutionPackageApprovalGrant(grant) ||
        grant.executionPackageDigest !==
          activation.executionPackage.packageDigest
      : isExecutionPackageApprovalGrant(grant) ||
        grant.procedureDigest !== activation.procedure.digest)
  ) {
    activationError(
      "APPROVAL_RELATION_MISMATCH",
      "Approval package binding does not match its Activation",
    );
  }
}

function canonicalTimestamp(): string {
  return new Date().toISOString();
}

function defaultKey(command: string): string {
  return `cli:dispatch:${command}:${randomUUID()}`;
}

function commandInput(input: {
  root: string;
  mutations: readonly ResearchMutation[];
  idempotencyKey: string;
  timestamp: string;
  command: string;
  artifactRepositoryRoots?: Readonly<Partial<Record<RepositoryId, string>>>;
}): Parameters<typeof commitResearchBatch>[0] {
  return {
    root: input.root,
    mutations: input.mutations,
    actor: { type: "agent" as const, id: "trellis-cli" },
    provenance: { source: `trellis research dispatch ${input.command}` },
    idempotencyKey: input.idempotencyKey,
    timestamp: input.timestamp,
    ...(input.artifactRepositoryRoots === undefined
      ? {}
      : { artifactRepositoryRoots: input.artifactRepositoryRoots }),
  };
}

type EventClassifier = (events: readonly ResearchEvent[]) => void;

export async function findResearchLifecycleReplay(input: {
  readonly root: string;
  readonly idempotencyKey: string;
  readonly classify: EventClassifier;
}): Promise<ResearchEvent[] | null> {
  const matches = (await readResearchLedger(input.root)).filter(
    (event) => event.idempotencyKey === input.idempotencyKey,
  );
  if (matches.length === 0) return null;
  input.classify(matches);
  return matches;
}

export async function executeResearchLifecycleMutations(input: {
  readonly command: string;
  readonly root: string;
  readonly options: ResearchMutationOptions;
  readonly mutations: readonly ResearchMutation[];
  readonly timestamp: string;
  readonly classify: EventClassifier;
  readonly artifactRepositoryRoots?: Readonly<
    Partial<Record<RepositoryId, string>>
  >;
}): Promise<ResearchMutationResult> {
  const idempotencyKey =
    input.options.idempotencyKey ??
    defaultKey(input.command.replaceAll("-", ":"));
  requireResearchText(idempotencyKey, "idempotency key");
  const batch = commandInput({ ...input, idempotencyKey });
  const initial = await findResearchLifecycleReplay({
    root: input.root,
    idempotencyKey,
    classify: input.classify,
  });
  if (initial !== null) {
    return {
      command: `research dispatch ${input.command}`,
      idempotencyKey,
      dryRun: input.options.dryRun === true,
      replayed: true,
      headSeq: (await getResearchStatus(input.root)).headSeq,
      events: initial,
    };
  }
  if (input.options.dryRun === true) {
    const validation = await validateResearchBatchReadOnly(batch);
    input.classify(validation.events);
    const canonicalIds = new Set(
      (await readResearchLedger(input.root)).map((event) => event.eventId),
    );
    const replayed = validation.events.every((event) =>
      canonicalIds.has(event.eventId),
    );
    return {
      command: `research dispatch ${input.command}`,
      idempotencyKey,
      dryRun: true,
      replayed,
      headSeq: validation.state.projectedThroughSeq,
      events: validation.events,
    };
  }
  const committed = await commitResearchBatch(batch);
  input.classify(committed.events);
  return {
    command: `research dispatch ${input.command}`,
    idempotencyKey,
    dryRun: false,
    replayed: committed.replayed,
    headSeq: committed.headSeq,
    events: committed.events,
  };
}

function conflict(message: string): never {
  activationError("IDEMPOTENCY_KEY_CONFLICT", message);
}

export function classifyPrepareEvents(
  events: readonly ResearchEvent[],
  expectedDispatchId?: DispatchId,
):
  | {
      readonly legacy: true;
      readonly dispatch: Dispatch;
      readonly activation: null;
    }
  | {
      readonly legacy: false;
      readonly dispatch: Dispatch;
      readonly activation: ResearchActivation;
    } {
  const dispatch = events[0]?.payload.dispatch as Dispatch | undefined;
  if (
    events[0]?.kind !== "dispatch.recorded" ||
    dispatch === undefined ||
    (expectedDispatchId !== undefined && dispatch.id !== expectedDispatchId)
  ) {
    conflict(
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
  if (events.length === 1) {
    return { legacy: true, dispatch, activation: null };
  }
  const activation = events[1]?.payload.activation as
    | ResearchActivation
    | undefined;
  if (
    events.length !== 2 ||
    events[1]?.kind !== "activation.planned" ||
    activation?.dispatchId !== dispatch.id
  ) {
    conflict(
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
  return { legacy: false, dispatch, activation };
}

export function classifyActivationEvents(
  events: readonly ResearchEvent[],
  dispatchId: DispatchId,
): ResearchActivation {
  if (
    events.length !== 1 ||
    events[0]?.kind !== "activation.planned" ||
    (events[0].payload.activation as ResearchActivation | undefined)
      ?.dispatchId !== dispatchId
  ) {
    conflict(
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
  return events[0].payload.activation as ResearchActivation;
}

export function classifyGrantEvents(
  events: readonly ResearchEvent[],
  dispatchId: DispatchId,
  host: ResearchExecutionHost,
): ResearchApprovalGrant {
  const approval = events[0]?.payload.approval as
    | ResearchApprovalGrant
    | undefined;
  if (
    events.length !== 1 ||
    events[0]?.kind !== "approval.granted" ||
    approval?.dispatchId !== dispatchId ||
    approval.host !== host
  ) {
    conflict(
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
  return approval;
}

export function classifyRevokeEvents(
  events: readonly ResearchEvent[],
  approvalId: ApprovalId,
): void {
  if (
    events.length !== 1 ||
    events[0]?.kind !== "approval.revoked" ||
    events[0].aggregate.id !== approvalId ||
    events[0].payload.approvalId !== approvalId
  ) {
    conflict(
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
}

function dispatchActivation(
  state: Awaited<ReturnType<typeof readResearchState>>,
  dispatchId: DispatchId,
): ResearchActivation {
  const dispatch = state.dispatches[dispatchId];
  if (!dispatch)
    activationError(
      "DISPATCH_NOT_FOUND",
      `Dispatch '${dispatchId}' was not found`,
    );
  const activationId = state.activationByDispatchId[dispatchId];
  const activation = activationId ? state.activations[activationId] : undefined;
  if (!activation) {
    activationError(
      "ACTIVATION_REQUIRED",
      `Dispatch '${dispatchId}' has no activation`,
    );
  }
  return activation;
}

function existingResultOrProposal(
  state: Awaited<ReturnType<typeof readResearchState>>,
  dispatchId: DispatchId,
): boolean {
  return (
    Object.values(state.results).some(
      (result) => result.dispatchId === dispatchId,
    ) ||
    Object.values(state.proposals).some(
      (proposal) => proposal.dispatchId === dispatchId,
    )
  );
}

function parseHost(value: string): ResearchExecutionHost {
  try {
    return parseResearchExecutionHost(value);
  } catch (error) {
    throw new ResearchActivationError(
      "INVALID_APPROVAL_INPUT",
      "Host must be claude or codex",
      {
        cause: error,
      },
    );
  }
}

function activeSameHost(
  state: Awaited<ReturnType<typeof readResearchState>>,
  activationId: ActivationId,
  host: ResearchExecutionHost,
  timestamp: string,
): ResearchApprovalState | undefined {
  return (state.approvalIdsByActivationId[activationId] ?? [])
    .map((id) => state.approvals[id])
    .find(
      (approval) =>
        approval?.status === "granted" &&
        approval.grant.host === host &&
        Date.parse(timestamp) < Date.parse(approval.grant.expiresAt),
    );
}

function grantFromCandidate(input: {
  readonly activation: ResearchActivation;
  readonly host: ResearchExecutionHost;
  readonly mode: "automatic" | "interactive";
  readonly approverLabel: string;
  readonly rationale: string;
  readonly timestamp: string;
}): ResearchApprovalGrant {
  const activation = input.activation;
  const common = {
    id: createApprovalId(),
    activationId: activation.id,
    dispatchId: activation.dispatchId,
    host: input.host,
    mode: input.mode,
    approverLabel: input.approverLabel,
    rationale: input.rationale,
    requestDigest: activation.requestDigest,
    policyDigest: activation.policyDigest,
    scopeHash: activation.scopeHash,
    grantedAt: input.timestamp,
    expiresAt: new Date(
      Date.parse(input.timestamp) + activation.maxDurationMinutes * 60_000,
    ).toISOString(),
  };
  return isExecutionPackageActivation(activation)
    ? {
        ...common,
        executionPackageDigest: activation.executionPackage.packageDigest,
      }
    : { ...common, procedureDigest: activation.procedure.digest };
}

function approvalStateFromGrant(
  grant: ResearchApprovalGrant,
): ResearchApprovalState {
  return { grant, status: "granted" };
}

function requireGrantMode(
  grant: ResearchApprovalGrant,
  mode: ResearchApprovalGrant["mode"],
): ResearchApprovalGrant {
  if (grant.mode !== mode) {
    conflict("Idempotency key belongs to another approval command");
  }
  return grant;
}

function currentApprovalState(
  state: Awaited<ReturnType<typeof readResearchState>>,
  grant: ResearchApprovalGrant,
): ResearchApprovalState {
  const approval = state.approvals[grant.id];
  if (!approval) {
    conflict("Idempotency key approval is missing from canonical state");
  }
  return approval;
}

function materializeApprovalLifecycle(input: {
  readonly root: string;
  readonly headSeq: number;
  readonly activation: ResearchActivation;
  readonly approval: ResearchApprovalState;
  readonly recovery: string;
}): string {
  materializeResearchActivation(input);
  return materializeResearchApproval(input);
}

function validateApprovalText(
  value: string,
  label: string,
  maximum: number,
): string {
  const length = [...value].length;
  if (value.trim().length === 0 || length > maximum) {
    activationError(
      "INVALID_APPROVAL_INPUT",
      `${label} must contain 1-${maximum} Unicode code points`,
    );
  }
  return value;
}

export async function planResearchActivation(
  options: PlanResearchActivationOptions,
): Promise<PlanResearchActivationResult> {
  const root = resolveResearchRoot(options);
  const key = options.idempotencyKey;
  if (key !== undefined) {
    const replay = await findResearchLifecycleReplay({
      root,
      idempotencyKey: key,
      classify: (events) =>
        classifyActivationEvents(events, options.dispatchId),
    });
    if (replay !== null) {
      const activation = classifyActivationEvents(replay, options.dispatchId);
      const headSeq = (await getResearchStatus(root)).headSeq;
      return {
        command: "research dispatch plan-activation",
        idempotencyKey: key,
        dryRun: options.dryRun === true,
        replayed: true,
        headSeq,
        events: replay,
        activation,
        activationFile:
          options.dryRun === true
            ? null
            : materializeResearchActivation({
                root,
                headSeq,
                activation,
                recovery: `retry 'trellis research dispatch plan-activation ${options.dispatchId}' with idempotency key '${key}'`,
              }),
      };
    }
  }
  const state = await readResearchState(root);
  const dispatch = state.dispatches[options.dispatchId];
  if (!dispatch)
    activationError(
      "DISPATCH_NOT_FOUND",
      `Dispatch '${options.dispatchId}' was not found`,
    );
  const candidate = await resolveDispatchActivationCandidate({
    root,
    dispatch,
    capabilityId: options.capabilityId,
  });
  readCanonicalDispatchRequest(root, dispatch);
  const timestamp = canonicalTimestamp();
  const activation = activationFromCandidate(
    candidate,
    createActivationId(),
    timestamp,
  );
  const result = await executeResearchLifecycleMutations({
    command: "plan-activation",
    root,
    options,
    mutations: [{ kind: "activation.plan", activation }],
    timestamp,
    classify: (events) => classifyActivationEvents(events, dispatch.id),
  });
  const canonical = classifyActivationEvents(result.events, dispatch.id);
  return {
    ...result,
    activation: canonical,
    activationFile: result.dryRun
      ? null
      : materializeResearchActivation({
          root,
          headSeq: result.headSeq,
          activation: canonical,
          recovery: `retry 'trellis research dispatch plan-activation ${dispatch.id}' with idempotency key '${result.idempotencyKey}'`,
        }),
  };
}

function automaticFailure(candidate: DispatchActivationCandidate): never {
  const reasons = candidate.automaticEligibility.reasons;
  if (
    reasons.includes("ACTIVATION_NOT_AUTOMATIC") ||
    reasons.includes("CAPABILITY_NOT_BOUNDED") ||
    reasons.includes("AUTOMATIC_POLICY_DISABLED")
  ) {
    activationError(
      "EXPLICIT_APPROVAL_REQUIRED",
      "This activation requires explicit operator approval",
    );
  }
  if (
    reasons.includes("MAX_DISPATCHES_EXCEEDED") ||
    reasons.includes("MAX_DURATION_EXCEEDED")
  ) {
    activationError(
      "AUTOMATIC_LIMIT_EXCEEDED",
      `Automatic limits are not satisfied: ${reasons.join(", ")}`,
    );
  }
  activationError(
    "AUTOMATIC_AUTHORITY_FORBIDDEN",
    `Automatic authority is forbidden: ${reasons.join(", ")}`,
  );
}

export async function authorizeResearchDispatch(
  options: GrantResearchApprovalOptions,
): Promise<GrantResearchApprovalResult> {
  const root = resolveResearchRoot(options);
  const host = parseHost(options.host);
  if (options.idempotencyKey !== undefined) {
    const replay = await findResearchLifecycleReplay({
      root,
      idempotencyKey: options.idempotencyKey,
      classify: (events) =>
        requireGrantMode(
          classifyGrantEvents(events, options.dispatchId, host),
          "automatic",
        ),
    });
    if (replay !== null) {
      const grant = requireGrantMode(
        classifyGrantEvents(replay, options.dispatchId, host),
        "automatic",
      );
      const state = await readResearchState(root);
      const approval = currentApprovalState(state, grant);
      const storedActivation = state.activations[approval.grant.activationId];
      if (!storedActivation) {
        activationError(
          "ACTIVATION_REQUIRED",
          `Approval '${approval.grant.id}' has no activation`,
        );
      }
      const activation = storedActivation;
      requireMatchingApprovalBinding(activation, approval.grant);
      const headSeq = (await getResearchStatus(root)).headSeq;
      return {
        command: "research dispatch authorize",
        idempotencyKey: options.idempotencyKey,
        dryRun: options.dryRun === true,
        replayed: true,
        headSeq,
        events: replay,
        approval,
        approvalFile:
          options.dryRun === true
            ? null
            : materializeApprovalLifecycle({
                root,
                headSeq,
                activation,
                approval,
                recovery: `retry authorization with idempotency key '${options.idempotencyKey}'`,
              }),
      };
    }
  }
  const state = await readResearchState(root);
  const activation = dispatchActivation(state, options.dispatchId);
  if (existingResultOrProposal(state, options.dispatchId)) {
    activationError(
      "DISPATCH_ALREADY_COMPLETED",
      `Dispatch '${options.dispatchId}' is completed`,
    );
  }
  const candidate = await revalidateDispatchActivationBindings({
    root,
    activation,
  });
  if (!candidate.automaticEligibility.eligible) automaticFailure(candidate);
  const timestamp = canonicalTimestamp();
  if (activeSameHost(state, activation.id, host, timestamp)) {
    activationError(
      "DUPLICATE_ACTIVE_APPROVAL",
      `An active ${host} approval already exists`,
    );
  }
  const approval = grantFromCandidate({
    activation,
    host,
    mode: "automatic",
    approverLabel: "trellis-policy-v1",
    rationale: "Eligible under immutable registry and project policy.",
    timestamp,
  });
  const result = await executeResearchLifecycleMutations({
    command: "authorize",
    root,
    options,
    mutations: [{ kind: "approval.grant", approval }],
    timestamp,
    classify: (events) =>
      requireGrantMode(
        classifyGrantEvents(events, options.dispatchId, host),
        "automatic",
      ),
  });
  const canonicalGrant = requireGrantMode(
    classifyGrantEvents(result.events, options.dispatchId, host),
    "automatic",
  );
  const canonical = result.replayed
    ? currentApprovalState(await readResearchState(root), canonicalGrant)
    : approvalStateFromGrant(canonicalGrant);
  return {
    ...result,
    approval: canonical,
    approvalFile: result.dryRun
      ? null
      : materializeApprovalLifecycle({
          root,
          headSeq: result.headSeq,
          activation,
          approval: canonical,
          recovery: `retry authorization with idempotency key '${result.idempotencyKey}'`,
        }),
  };
}

function defaultInteractiveAdapter(): InteractiveAdapter {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return {
    stdinIsTTY: process.stdin.isTTY === true,
    stdoutIsTTY: process.stdout.isTTY === true,
    stderrIsTTY: process.stderr.isTTY === true,
    writeSummary: (summary) => process.stdout.write(summary),
    question: (prompt) => readline.question(prompt),
    close: () => readline.close(),
  };
}

function authoritySummary(
  candidate: DispatchActivationCandidate,
  activation: ResearchActivation,
  host: ResearchExecutionHost,
): string {
  const packageSummary = isExecutionPackageActivation(activation)
    ? `Skill: ${activation.executionPackage.id}@${activation.executionPackage.version} ${activation.executionPackage.packageDigest}`
    : `Procedure: ${activation.procedure.id}@${activation.procedure.version} ${activation.procedure.digest}`;
  const repositoryCount = new Set([
    candidate.scope.repository.id,
    ...candidate.scope.artifacts.map((artifact) => artifact.repositoryId),
  ]).size;
  return [
    `Dispatch: ${activation.dispatchId}`,
    `Quest: ${activation.questId}`,
    `Stage: ${candidate.stage}`,
    `Capability: ${activation.capabilityId} (${candidate.authority.kind}, ${activation.mode})`,
    packageSummary,
    `Policy: ${activation.policyDigest}`,
    `Request: ${activation.requestDigest}`,
    `Scope: ${activation.scopeHash}`,
    `Host: ${host}`,
    `Repository count: ${repositoryCount}`,
    `Repository: ${candidate.scope.repository.id} ${candidate.scope.repository.resolvedRoot}`,
    `Authority: network=${candidate.authority.networkPolicy} externalCost=${candidate.authority.allowExternalCost} canonicalMutation=${candidate.authority.allowCanonicalMutation} chaining=${candidate.authority.allowCapabilityChaining}`,
    `Limits: duration=${activation.maxDurationMinutes}m dispatches=${activation.maxDispatches}`,
    `Artifacts: ${candidate.scope.artifacts.map((item) => item.path).join(", ") || "none"}`,
    `Writes: ${candidate.scope.allowedWritePaths.map((item) => item.declaredPath).join(", ") || "none"}`,
    `Outputs: ${candidate.dispatch.expectedOutputs.join(" | ") || "none"}`,
    `Checks: ${candidate.dispatch.checks.join(" | ") || "none"}`,
    "",
  ].join("\n");
}

export async function approveResearchDispatch(
  options: GrantResearchApprovalOptions,
  adapter: InteractiveAdapter = defaultInteractiveAdapter(),
): Promise<GrantResearchApprovalResult> {
  const root = resolveResearchRoot(options);
  const host = parseHost(options.host);
  if (!adapter.stdinIsTTY || !adapter.stdoutIsTTY || !adapter.stderrIsTTY) {
    adapter.close();
    activationError(
      "INTERACTIVE_APPROVAL_REQUIRED",
      "Interactive approval requires stdin, stdout, and stderr TTYs",
    );
  }
  try {
    const replay =
      options.idempotencyKey === undefined
        ? null
        : await findResearchLifecycleReplay({
            root,
            idempotencyKey: options.idempotencyKey,
            classify: (events) =>
              requireGrantMode(
                classifyGrantEvents(events, options.dispatchId, host),
                "interactive",
              ),
          });
    const replayGrant =
      replay === null
        ? null
        : requireGrantMode(
            classifyGrantEvents(replay, options.dispatchId, host),
            "interactive",
          );
    const state = await readResearchState(root);
    const storedActivation =
      replayGrant === null
        ? dispatchActivation(state, options.dispatchId)
        : state.activations[replayGrant.activationId];
    if (!storedActivation) {
      activationError(
        "ACTIVATION_REQUIRED",
        `Approval '${replayGrant?.id ?? "unknown"}' has no activation`,
      );
    }
    const activation = storedActivation;
    if (replayGrant !== null) {
      requireMatchingApprovalBinding(activation, replayGrant);
    }
    if (
      replayGrant === null &&
      existingResultOrProposal(state, options.dispatchId)
    ) {
      activationError(
        "DISPATCH_ALREADY_COMPLETED",
        `Dispatch '${options.dispatchId}' is completed`,
      );
    }
    const candidate = await revalidateDispatchActivationBindings({
      root,
      activation,
    });
    adapter.writeSummary(authoritySummary(candidate, activation, host));
    const label = validateApprovalText(
      await adapter.question("Operator label: "),
      "Operator label",
      128,
    );
    const rationale = validateApprovalText(
      await adapter.question("Rationale: "),
      "Rationale",
      1_024,
    );
    const challenge = `APPROVE ${options.dispatchId} ${host} ${activation.requestDigest.slice(7, 19)}`;
    const response = await adapter.question(`Type '${challenge}': `);
    if (response !== challenge) {
      activationError(
        "APPROVAL_CHALLENGE_MISMATCH",
        "Approval challenge did not match exactly",
      );
    }
    await revalidateDispatchActivationBindings({ root, activation });
    if (
      replay !== null &&
      replayGrant !== null &&
      options.idempotencyKey !== undefined
    ) {
      const canonical = currentApprovalState(
        await readResearchState(root),
        replayGrant,
      );
      const headSeq = (await getResearchStatus(root)).headSeq;
      return {
        command: "research dispatch approve",
        idempotencyKey: options.idempotencyKey,
        dryRun: false,
        replayed: true,
        headSeq,
        events: replay,
        approval: canonical,
        approvalFile: materializeApprovalLifecycle({
          root,
          headSeq,
          activation,
          approval: canonical,
          recovery: `retry interactive approval with idempotency key '${options.idempotencyKey}'`,
        }),
      };
    }
    const timestamp = canonicalTimestamp();
    const fresh = await readResearchState(root);
    if (activeSameHost(fresh, activation.id, host, timestamp)) {
      activationError(
        "DUPLICATE_ACTIVE_APPROVAL",
        `An active ${host} approval already exists`,
      );
    }
    const approval = grantFromCandidate({
      activation,
      host,
      mode: "interactive",
      approverLabel: label,
      rationale,
      timestamp,
    });
    const result = await executeResearchLifecycleMutations({
      command: "approve",
      root,
      options,
      mutations: [{ kind: "approval.grant", approval }],
      timestamp,
      classify: (events) =>
        requireGrantMode(
          classifyGrantEvents(events, options.dispatchId, host),
          "interactive",
        ),
    });
    const canonicalGrant = requireGrantMode(
      classifyGrantEvents(result.events, options.dispatchId, host),
      "interactive",
    );
    const canonical = result.replayed
      ? currentApprovalState(await readResearchState(root), canonicalGrant)
      : approvalStateFromGrant(canonicalGrant);
    return {
      ...result,
      approval: canonical,
      approvalFile: materializeApprovalLifecycle({
        root,
        headSeq: result.headSeq,
        activation,
        approval: canonical,
        recovery: `retry interactive approval with idempotency key '${result.idempotencyKey}'`,
      }),
    };
  } finally {
    adapter.close();
  }
}

async function revocationReason(
  options: RevokeResearchApprovalOptions,
): Promise<string> {
  if (options.reason !== undefined) {
    return validateApprovalText(options.reason, "Revocation reason", 1_024);
  }
  if (
    options.json === true ||
    options.dryRun === true ||
    process.stdin.isTTY !== true ||
    process.stdout.isTTY !== true
  ) {
    activationError(
      "REVOCATION_REASON_REQUIRED",
      "--reason is required in non-interactive mode",
    );
  }
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return validateApprovalText(
      await readline.question("Revocation reason: "),
      "Revocation reason",
      1_024,
    );
  } finally {
    readline.close();
  }
}

export async function revokeResearchApproval(
  options: RevokeResearchApprovalOptions,
): Promise<RevokeResearchApprovalResult> {
  const root = resolveResearchRoot(options);
  if (options.idempotencyKey !== undefined) {
    const replay = await findResearchLifecycleReplay({
      root,
      idempotencyKey: options.idempotencyKey,
      classify: (events) => classifyRevokeEvents(events, options.approvalId),
    });
    if (replay !== null) {
      const state = await readResearchState(root);
      const approval = state.approvals[options.approvalId];
      if (!approval)
        activationError(
          "APPROVAL_NOT_FOUND",
          `Approval '${options.approvalId}' was not found`,
        );
      const activation = state.activations[approval.grant.activationId];
      if (!activation) {
        activationError(
          "ACTIVATION_REQUIRED",
          `Approval '${options.approvalId}' has no activation`,
        );
      }
      const headSeq = (await getResearchStatus(root)).headSeq;
      return {
        command: "research dispatch revoke",
        idempotencyKey: options.idempotencyKey,
        dryRun: options.dryRun === true,
        replayed: true,
        headSeq,
        events: replay,
        approval,
        approvalFile:
          options.dryRun === true
            ? null
            : materializeApprovalLifecycle({
                root,
                headSeq,
                activation,
                approval,
                recovery: `retry revocation with idempotency key '${options.idempotencyKey}'`,
              }),
      };
    }
  }
  const state = await readResearchState(root);
  const current = state.approvals[options.approvalId];
  if (!current)
    activationError(
      "APPROVAL_NOT_FOUND",
      `Approval '${options.approvalId}' was not found`,
    );
  if (current.status !== "granted") {
    activationError(
      "INVALID_APPROVAL_TRANSITION",
      `Approval '${options.approvalId}' is already ${current.status}`,
    );
  }
  const activation = state.activations[current.grant.activationId];
  if (!activation) {
    activationError(
      "ACTIVATION_REQUIRED",
      `Approval '${options.approvalId}' has no activation`,
    );
  }
  const reason = await revocationReason(options);
  const timestamp = canonicalTimestamp();
  const result = await executeResearchLifecycleMutations({
    command: "revoke",
    root,
    options,
    mutations: [
      {
        kind: "approval.revoke",
        approvalId: options.approvalId,
        revokedAt: timestamp,
        reason,
      },
    ],
    timestamp,
    classify: (events) => classifyRevokeEvents(events, options.approvalId),
  });
  const revokeEvent = result.events[0];
  const approval: ResearchApprovalState = {
    grant: current.grant,
    status: "revoked",
    revokedAt: revokeEvent?.payload.revokedAt as string,
    revocationReason: revokeEvent?.payload.reason as string,
  };
  return {
    ...result,
    approval,
    approvalFile: result.dryRun
      ? null
      : materializeApprovalLifecycle({
          root,
          headSeq: result.headSeq,
          activation,
          approval,
          recovery: `retry revocation with idempotency key '${result.idempotencyKey}'`,
        }),
  };
}

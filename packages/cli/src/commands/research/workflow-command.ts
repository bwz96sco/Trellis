import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import {
  commitResearchBatch,
  createWorkflowInstanceId,
  getEffectiveScientificGateRecord,
  getResearchActivationPackageDigest,
  getResearchApprovalPackageDigest,
  isExecutionPackageActivation,
  isExecutionPackageApprovalGrant,
  listResearchWorkflowOutgoingTransitions,
  missingResearchWorkflowRequiredRefs,
  parseWorkflowAcceptedRef,
  readResearchLedger,
  readResearchState,
  ResearchWorkflowError,
  sameResearchExecutionPackageIdentity,
  validateResearchBatchReadOnly,
  type ParsedResearchWorkflowDefinitionV1,
  type QuestId,
  type ResearchEvent,
  type ResearchExecutionProfile,
  type ResearchMutation,
  type ResearchState,
  type ResearchWorkflowInstance,
  type ResolvedExecutionPackageIdentity,
  type WorkflowAcceptedRef,
  type WorkflowCloseOutcome,
  type WorkflowInstanceId,
  type WorkflowNodeCompletePayload,
  type WorkflowTransitionRecordPayload,
} from "@mindfoldhq/trellis-core/research";
import { InvalidArgumentError } from "commander";

import {
  requireResearchText,
  resolveResearchRoot,
  type ResearchOutputOptions,
} from "./common.js";
import { deriveResearchOutputIds } from "./dispatch-output-ids.js";
import { ResearchActivationError, ResearchCliError } from "./errors.js";
import { resolveResearchWorkflowDefinition } from "./workflow-definition-resolution.js";

export interface ResearchWorkflowMutationOptions extends ResearchOutputOptions {
  idempotencyKey?: string;
  dryRun?: boolean;
  write?: boolean;
}

export interface ResearchWorkflowMutationResult {
  schemaVersion: 1;
  command: string;
  idempotencyKey: string;
  dryRun: boolean;
  replayed: boolean;
  headSeq: number;
  events: ResearchEvent[];
}

export interface ResearchWorkflowStatusResult {
  schemaVersion: 1;
  command: "research workflow status";
  questId: QuestId;
  state: "unbound" | "active" | "closed";
  instance: ResearchWorkflowInstance | null;
  currentNode: null | {
    id: string;
    executionPackage: ResolvedExecutionPackageIdentity;
    allowedProfiles: ResearchExecutionProfile[];
    stop: boolean;
    completed: boolean;
  };
}

export interface ResearchWorkflowNextResult {
  schemaVersion: 1;
  command: "research workflow next";
  questId: QuestId;
  workflowInstanceId: WorkflowInstanceId | null;
  currentNodeId: string | null;
  choices: {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    legal: boolean;
    missingRefs: string[];
    missingGateIds: ("H1" | "H2")[];
    satisfyingGateRecordIds: string[];
  }[];
  stopReason:
    | "no-active-workflow"
    | "instance-closed"
    | "current-node-incomplete"
    | "terminal-node"
    | "missing-required-refs"
    | "missing-gates"
    | "operator-selection-required";
}

function mapWorkflowError(error: unknown): never {
  if (error instanceof ResearchCliError) throw error;
  if (error instanceof ResearchWorkflowError) {
    const code =
      error.code === "RESEARCH_WORKFLOW_ACTIVE_CONFLICT"
        ? "research_workflow_active_conflict"
        : error.code === "RESEARCH_WORKFLOW_COMPLETION_INVALID"
          ? "research_workflow_completion_invalid"
          : error.code === "RESEARCH_WORKFLOW_TRANSITION_BLOCKED"
            ? "research_workflow_transition_blocked"
            : "research_workflow_invalid";
    throw new ResearchCliError(code, error.message, { cause: error });
  }
  throw error;
}

function rejectConflictingMutationFlags(
  options: ResearchWorkflowMutationOptions,
): void {
  if (options.dryRun === true && options.write === true) {
    throw new InvalidArgumentError(
      "--dry-run and --write cannot be used together",
    );
  }
}

function assertWorkflowMutationEvents(
  events: readonly ResearchEvent[],
  matchesEvent: (event: ResearchEvent) => boolean,
): void {
  if (
    events.length !== 1 ||
    events[0] === undefined ||
    !matchesEvent(events[0])
  ) {
    throw new ResearchActivationError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "Idempotency key belongs to another command, target, or batch shape",
    );
  }
}

async function executeWorkflowMutation(
  command: string,
  options: ResearchWorkflowMutationOptions,
  matchesEvent: (event: ResearchEvent) => boolean,
  buildMutation: (root: string) => Promise<ResearchMutation> | ResearchMutation,
): Promise<ResearchWorkflowMutationResult> {
  rejectConflictingMutationFlags(options);
  const root = resolveResearchRoot(options);
  const idempotencyKey =
    options.idempotencyKey ??
    `cli:${command.replaceAll(" ", ":")}:${randomUUID()}`;
  requireResearchText(idempotencyKey, "idempotency key");
  try {
    const existing = await readResearchLedger(root);
    const replay = existing.filter(
      (event) => event.idempotencyKey === idempotencyKey,
    );
    if (replay.length > 0) {
      assertWorkflowMutationEvents(replay, matchesEvent);
      return {
        schemaVersion: 1 as const,
        command: `research ${command}`,
        idempotencyKey,
        dryRun: options.write !== true,
        replayed: true,
        headSeq: existing.at(-1)?.seq ?? 0,
        events: replay,
      };
    }

    const mutation = await buildMutation(root);
    const input = {
      root,
      mutations: [mutation],
      actor: { type: "agent" as const, id: "trellis-cli" },
      provenance: { source: `trellis research ${command}` },
      idempotencyKey,
    };
    if (options.write === true) {
      const committed = await commitResearchBatch(input);
      assertWorkflowMutationEvents(committed.events, matchesEvent);
      return {
        schemaVersion: 1 as const,
        command: `research ${command}`,
        idempotencyKey,
        dryRun: false,
        replayed: committed.replayed,
        headSeq: committed.headSeq,
        events: committed.events,
      };
    }
    const validated = await validateResearchBatchReadOnly(input);
    assertWorkflowMutationEvents(validated.events, matchesEvent);
    const canonicalIds = new Set(
      (await readResearchLedger(root)).map((event) => event.eventId),
    );
    const replayed = validated.events.every((event) =>
      canonicalIds.has(event.eventId),
    );
    return {
      schemaVersion: 1 as const,
      command: `research ${command}`,
      idempotencyKey,
      dryRun: true,
      replayed,
      headSeq: validated.events.at(-1)?.seq ?? existing.at(-1)?.seq ?? 0,
      events: validated.events,
    };
  } catch (error) {
    mapWorkflowError(error);
  }
}

async function resolveBoundInstance(
  root: string,
  workflowInstanceId: WorkflowInstanceId,
  missingCode: ResearchWorkflowError["code"],
): Promise<{
  state: ResearchState;
  instance: ResearchWorkflowInstance;
  workflow: ParsedResearchWorkflowDefinitionV1;
}> {
  const state = await readResearchState(root);
  const instance = state.workflowInstances[workflowInstanceId];
  if (instance === undefined) {
    throw new ResearchWorkflowError(
      missingCode,
      `Workflow instance '${workflowInstanceId}' does not exist`,
    );
  }
  const workflow = resolveResearchWorkflowDefinition({
    root,
    id: instance.workflowId,
    version: instance.workflowVersion,
    expectedDigest: instance.workflowDigest,
  });
  return { state, instance, workflow };
}

function invalidWorkflowCompletion(message: string): never {
  throw new ResearchWorkflowError(
    "RESEARCH_WORKFLOW_COMPLETION_INVALID",
    message,
  );
}

function resolveWorkflowCompletionProfile(input: {
  readonly state: ResearchState;
  readonly instance: ResearchWorkflowInstance;
  readonly nodeId: string;
  readonly nodeExecutionPackage: ResolvedExecutionPackageIdentity;
  readonly acceptedRefs: readonly WorkflowAcceptedRef[];
}): "lightweight" | "managed" {
  const resultRefs = input.acceptedRefs.filter(
    (ref): ref is Extract<WorkflowAcceptedRef, { kind: "result" }> =>
      ref.kind === "result",
  );
  if (resultRefs.length === 0) return "lightweight";
  if (
    input.instance.status !== "active" ||
    input.instance.currentNodeId !== input.nodeId ||
    input.instance.nodeCompletions[input.nodeId] !== undefined
  ) {
    invalidWorkflowCompletion(
      "Managed completion requires the active incomplete current Workflow node",
    );
  }

  let coherentWorkflowBinding: unknown = undefined;
  let hasCoherentWorkflowBinding = false;
  for (const ref of resultRefs) {
    const result = input.state.results[ref.id];
    if (result === undefined) {
      invalidWorkflowCompletion(`Accepted Result '${ref.id}' does not exist`);
    }
    const dispatch = input.state.dispatches[result.dispatchId];
    const activationId = input.state.activationByDispatchId[result.dispatchId];
    const activation =
      activationId === undefined
        ? undefined
        : input.state.activations[activationId];
    if (
      dispatch?.questId !== input.instance.questId ||
      activation === undefined ||
      !isExecutionPackageActivation(activation)
    ) {
      invalidWorkflowCompletion(
        `Accepted Result '${ref.id}' has no coherent managed Activation`,
      );
    }
    if (
      activation.id !== activationId ||
      activation.dispatchId !== dispatch.id ||
      activation.questId !== dispatch.questId
    ) {
      invalidWorkflowCompletion(
        `Accepted Result '${ref.id}' has an incoherent managed Activation`,
      );
    }
    if (
      !sameResearchExecutionPackageIdentity(
        activation.executionPackage,
        input.nodeExecutionPackage,
      )
    ) {
      invalidWorkflowCompletion(
        `Accepted Result '${ref.id}' uses another execution package`,
      );
    }

    const consumedApprovals = Object.values(input.state.approvals).filter(
      (approval) =>
        approval.status === "consumed" && approval.resultId === result.id,
    );
    const approval = consumedApprovals[0];
    if (
      consumedApprovals.length !== 1 ||
      approval?.status !== "consumed" ||
      !isExecutionPackageApprovalGrant(approval.grant) ||
      approval.grant.activationId !== activation.id ||
      approval.grant.dispatchId !== dispatch.id ||
      approval.grant.requestDigest !== activation.requestDigest ||
      approval.grant.policyDigest !== activation.policyDigest ||
      approval.grant.scopeHash !== activation.scopeHash ||
      getResearchApprovalPackageDigest(approval.grant) !==
        getResearchActivationPackageDigest(activation)
    ) {
      invalidWorkflowCompletion(
        `Accepted Result '${ref.id}' has no coherent consumed Approval`,
      );
    }
    const outputIds = deriveResearchOutputIds(approval.grant.id);
    const proposal = input.state.proposals[outputIds.proposalId];
    if (
      result.id !== outputIds.resultId ||
      approval.resultId !== result.id ||
      approval.proposalId !== outputIds.proposalId ||
      proposal?.id !== outputIds.proposalId ||
      proposal.dispatchId !== dispatch.id ||
      proposal.questId !== dispatch.questId
    ) {
      invalidWorkflowCompletion(
        `Accepted Result '${ref.id}' has invalid Approval-derived outputs`,
      );
    }

    const workflowBinding = activation.managedExecution.workflow;
    if (
      workflowBinding !== undefined &&
      (workflowBinding.workflowInstanceId !==
        input.instance.workflowInstanceId ||
        workflowBinding.workflowId !== input.instance.workflowId ||
        workflowBinding.workflowVersion !== input.instance.workflowVersion ||
        workflowBinding.workflowDigest !== input.instance.workflowDigest ||
        workflowBinding.nodeId !== input.nodeId)
    ) {
      invalidWorkflowCompletion(
        `Accepted Result '${ref.id}' has another managed Workflow binding`,
      );
    }
    if (!hasCoherentWorkflowBinding) {
      coherentWorkflowBinding = workflowBinding;
      hasCoherentWorkflowBinding = true;
    } else if (!isDeepStrictEqual(coherentWorkflowBinding, workflowBinding)) {
      invalidWorkflowCompletion(
        "Accepted Results do not share one managed Workflow binding",
      );
    }
  }
  return "managed";
}

export async function bindResearchWorkflow(
  options: ResearchWorkflowMutationOptions & {
    quest: QuestId;
    workflow: string;
    version: string;
    startNode: string;
  },
): Promise<ResearchWorkflowMutationResult> {
  return executeWorkflowMutation(
    "workflow bind",
    options,
    (event) =>
      event.schemaVersion === 3 &&
      event.kind === "workflow.bound" &&
      event.payload.questId === options.quest &&
      event.payload.workflowId === options.workflow &&
      event.payload.workflowVersion === options.version &&
      event.payload.startNodeId === options.startNode,
    (root) => ({
      kind: "workflow.bind",
      workflowInstanceId: createWorkflowInstanceId(),
      questId: options.quest,
      startNodeId: options.startNode,
      workflow: resolveResearchWorkflowDefinition({
        root,
        id: options.workflow,
        version: options.version,
      }),
    }),
  );
}

export async function completeResearchWorkflowNode(
  options: ResearchWorkflowMutationOptions & {
    instance: WorkflowInstanceId;
    node: string;
    acceptedRef: readonly string[];
  },
): Promise<ResearchWorkflowMutationResult> {
  const expectedAcceptedRefs = [...options.acceptedRef].sort();
  const expectedExecutionProfile = expectedAcceptedRefs.some((ref) =>
    ref.startsWith("result:"),
  )
    ? "managed"
    : "lightweight";
  return executeWorkflowMutation(
    "workflow complete",
    options,
    (event) => {
      if (
        event.schemaVersion !== 3 ||
        event.kind !== "workflow.node_completed" ||
        event.aggregate.id !== options.instance
      ) {
        return false;
      }
      const payload = event.payload as unknown as WorkflowNodeCompletePayload;
      return (
        payload.nodeId === options.node &&
        payload.executionProfile === expectedExecutionProfile &&
        payload.acceptedRefs.length === expectedAcceptedRefs.length &&
        payload.acceptedRefs
          .map((ref) => `${ref.kind}:${ref.id}`)
          .every((ref, index) => ref === expectedAcceptedRefs[index])
      );
    },
    async (root) => {
      const { state, instance, workflow } = await resolveBoundInstance(
        root,
        options.instance,
        "RESEARCH_WORKFLOW_COMPLETION_INVALID",
      );
      let acceptedRefs: WorkflowAcceptedRef[];
      try {
        acceptedRefs = options.acceptedRef.map((ref, index) =>
          parseWorkflowAcceptedRef(ref, `accepted ref ${index + 1}`),
        );
      } catch (error) {
        throw new ResearchWorkflowError(
          "RESEARCH_WORKFLOW_COMPLETION_INVALID",
          error instanceof Error ? error.message : String(error),
          { cause: error },
        );
      }
      const node = workflow.definition.nodes.find(
        (candidate) => candidate.id === options.node,
      );
      if (node === undefined) {
        invalidWorkflowCompletion(
          `Workflow node '${options.node}' is not declared`,
        );
      }
      const executionProfile = resolveWorkflowCompletionProfile({
        state,
        instance,
        nodeId: options.node,
        nodeExecutionPackage: node.executionPackage,
        acceptedRefs,
      });
      return {
        kind: "workflow.node.complete",
        workflowInstanceId: options.instance,
        nodeId: options.node,
        executionProfile,
        acceptedRefs,
        workflow,
      };
    },
  );
}

export async function recordResearchWorkflowTransition(
  options: ResearchWorkflowMutationOptions & {
    instance: WorkflowInstanceId;
    transition: string;
  },
): Promise<ResearchWorkflowMutationResult> {
  return executeWorkflowMutation(
    "workflow transition",
    options,
    (event) => {
      if (
        event.schemaVersion !== 3 ||
        event.kind !== "workflow.transition_recorded" ||
        event.aggregate.id !== options.instance
      ) {
        return false;
      }
      const payload =
        event.payload as unknown as WorkflowTransitionRecordPayload;
      return (
        payload.transitionId === options.transition &&
        payload.selectedBy === "trellis-cli"
      );
    },
    async (root) => {
      const { workflow } = await resolveBoundInstance(
        root,
        options.instance,
        "RESEARCH_WORKFLOW_TRANSITION_BLOCKED",
      );
      return {
        kind: "workflow.transition.record",
        workflowInstanceId: options.instance,
        transitionId: options.transition,
        selectedBy: "trellis-cli",
        workflow,
      };
    },
  );
}

export async function closeResearchWorkflow(
  options: ResearchWorkflowMutationOptions & {
    instance: WorkflowInstanceId;
    outcome: WorkflowCloseOutcome;
    rationale: string;
  },
): Promise<ResearchWorkflowMutationResult> {
  return executeWorkflowMutation(
    "workflow close",
    options,
    (event) =>
      event.schemaVersion === 3 &&
      event.kind === "workflow.closed" &&
      event.aggregate.id === options.instance &&
      event.payload.outcome === options.outcome &&
      event.payload.closedBy === "trellis-cli" &&
      event.payload.rationale === options.rationale,
    async (root) => {
      const { workflow } = await resolveBoundInstance(
        root,
        options.instance,
        "RESEARCH_WORKFLOW_INVALID",
      );
      return {
        kind: "workflow.close",
        workflowInstanceId: options.instance,
        outcome: options.outcome,
        closedBy: "trellis-cli",
        rationale: options.rationale,
        workflow,
      };
    },
  );
}

function latestQuestWorkflowInstance(
  state: Awaited<ReturnType<typeof readResearchState>>,
  questId: QuestId,
): ResearchWorkflowInstance | undefined {
  const ids = state.workflowInstanceIdsByQuestId[questId] ?? [];
  const activeId = state.activeWorkflowByQuestId[questId];
  if (activeId !== undefined) return state.workflowInstances[activeId];
  const latestId = ids.at(-1);
  return latestId === undefined ? undefined : state.workflowInstances[latestId];
}

function resolveInstanceCurrentNode(
  root: string,
  instance: ResearchWorkflowInstance,
): {
  workflow: ParsedResearchWorkflowDefinitionV1;
  node: ParsedResearchWorkflowDefinitionV1["definition"]["nodes"][number];
} {
  const workflow = resolveResearchWorkflowDefinition({
    root,
    id: instance.workflowId,
    version: instance.workflowVersion,
    expectedDigest: instance.workflowDigest,
  });
  const node = workflow.definition.nodes.find(
    (candidate) => candidate.id === instance.currentNodeId,
  );
  if (node === undefined) {
    throw new ResearchWorkflowError(
      "RESEARCH_WORKFLOW_INVALID",
      `Workflow current node '${instance.currentNodeId}' is not declared`,
    );
  }
  return { workflow, node };
}

export async function getResearchWorkflowStatus(
  options: ResearchOutputOptions & { quest: QuestId },
): Promise<ResearchWorkflowStatusResult> {
  const root = resolveResearchRoot(options);
  try {
    const state = await readResearchState(root);
    if (state.quests[options.quest] === undefined) {
      throw new ResearchWorkflowError(
        "RESEARCH_WORKFLOW_INVALID",
        `Unknown research Quest '${options.quest}'`,
      );
    }
    const instance = latestQuestWorkflowInstance(state, options.quest);
    if (instance === undefined) {
      return {
        schemaVersion: 1 as const,
        command: "research workflow status" as const,
        questId: options.quest,
        state: "unbound" as const,
        instance: null,
        currentNode: null,
      };
    }
    const { node } = resolveInstanceCurrentNode(root, instance);
    return {
      schemaVersion: 1 as const,
      command: "research workflow status" as const,
      questId: options.quest,
      state:
        instance.status === "active"
          ? ("active" as const)
          : ("closed" as const),
      instance,
      currentNode: {
        id: node.id,
        executionPackage: node.executionPackage,
        allowedProfiles: [...node.allowedProfiles],
        stop: node.stop,
        completed: instance.nodeCompletions[node.id] !== undefined,
      },
    };
  } catch (error) {
    mapWorkflowError(error);
  }
}

export async function getResearchWorkflowNext(
  options: ResearchOutputOptions & { quest: QuestId },
): Promise<ResearchWorkflowNextResult> {
  const root = resolveResearchRoot(options);
  try {
    const state = await readResearchState(root);
    if (state.quests[options.quest] === undefined) {
      throw new ResearchWorkflowError(
        "RESEARCH_WORKFLOW_INVALID",
        `Unknown research Quest '${options.quest}'`,
      );
    }
    const instance = latestQuestWorkflowInstance(state, options.quest);
    if (instance === undefined) {
      return {
        schemaVersion: 1 as const,
        command: "research workflow next" as const,
        questId: options.quest,
        workflowInstanceId: null,
        currentNodeId: null,
        choices: [],
        stopReason: "no-active-workflow" as const,
      };
    }
    const { workflow } = resolveInstanceCurrentNode(root, instance);
    if (instance.status !== "active") {
      return {
        schemaVersion: 1 as const,
        command: "research workflow next" as const,
        questId: options.quest,
        workflowInstanceId: instance.workflowInstanceId,
        currentNodeId: instance.currentNodeId,
        choices: [],
        stopReason: "instance-closed" as const,
      };
    }
    const completion = instance.nodeCompletions[instance.currentNodeId];
    const outgoing = listResearchWorkflowOutgoingTransitions(
      workflow.definition,
      instance.currentNodeId,
    );
    const choices = outgoing.map((transition) => {
      const missingRefs =
        completion === undefined
          ? [...transition.requiredRefs]
          : [
              ...missingResearchWorkflowRequiredRefs(
                transition,
                completion.acceptedRefs,
              ),
            ];
      const missingGateIds: ("H1" | "H2")[] = [];
      const satisfyingGateRecordIds: string[] = [];
      for (const gateId of transition.requiredGateIds) {
        const record = getEffectiveScientificGateRecord(
          state,
          instance.workflowInstanceId,
          instance.currentNodeId,
          gateId,
        );
        if (record?.decision === "approve") {
          satisfyingGateRecordIds.push(record.id);
        } else {
          missingGateIds.push(gateId);
        }
      }
      return {
        id: transition.id,
        fromNodeId: transition.fromNodeId,
        toNodeId: transition.toNodeId,
        legal:
          completion !== undefined &&
          missingRefs.length === 0 &&
          missingGateIds.length === 0,
        missingRefs,
        missingGateIds,
        satisfyingGateRecordIds,
      };
    });
    const stopReason =
      completion === undefined
        ? "current-node-incomplete"
        : choices.length === 0
          ? "terminal-node"
          : choices.some((choice) => choice.legal)
            ? "operator-selection-required"
            : choices.some((choice) => choice.missingRefs.length > 0)
              ? "missing-required-refs"
              : "missing-gates";
    return {
      schemaVersion: 1 as const,
      command: "research workflow next" as const,
      questId: options.quest,
      workflowInstanceId: instance.workflowInstanceId,
      currentNodeId: instance.currentNodeId,
      choices,
      stopReason,
    };
  } catch (error) {
    mapWorkflowError(error);
  }
}

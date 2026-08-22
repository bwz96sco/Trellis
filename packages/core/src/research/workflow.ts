import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import type {
  ResearchExecutionProfile,
  ResolvedExecutionPackageIdentity,
} from "./execution-package.js";
import { stableResearchJson } from "./projections.js";
import { resolvedExecutionPackageIdentitySchema } from "./schema.js";
import { parseStrictResearchJson } from "./strict-json.js";
import type {
  ArtifactId,
  QuestId,
  ResultId,
  WorkflowAcceptedRef,
  WorkflowBindPayload,
  WorkflowClosePayload,
  WorkflowInstanceId,
  WorkflowNodeCompletePayload,
  WorkflowTransitionRecordPayload,
} from "./types.js";

const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const EXACT_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORKFLOW_DIGEST_DOMAIN = "trellis-research-workflow-definition-v1\0";

export type ResearchWorkflowErrorCode =
  | "RESEARCH_WORKFLOW_INVALID"
  | "RESEARCH_WORKFLOW_ACTIVE_CONFLICT"
  | "RESEARCH_WORKFLOW_COMPLETION_INVALID"
  | "RESEARCH_WORKFLOW_TRANSITION_BLOCKED";

export class ResearchWorkflowError extends Error {
  readonly code: ResearchWorkflowErrorCode;

  constructor(
    code: ResearchWorkflowErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ResearchWorkflowError";
    this.code = code;
  }
}

export interface ResearchWorkflowNodeV1 {
  readonly id: string;
  readonly executionPackage: ResolvedExecutionPackageIdentity;
  readonly allowedProfiles: readonly ResearchExecutionProfile[];
  readonly stop: true;
}

export interface ResearchWorkflowTransitionV1 {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly requiredRefs: readonly string[];
  readonly requiredGateIds: readonly ("H1" | "H2")[];
}

export interface ResearchWorkflowDefinitionV1 {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly startNodeIds: readonly string[];
  readonly nodes: readonly ResearchWorkflowNodeV1[];
  readonly transitions: readonly ResearchWorkflowTransitionV1[];
}

export interface ParsedResearchWorkflowDefinitionV1 {
  readonly definition: ResearchWorkflowDefinitionV1;
  readonly workflowDigest: `sha256:${string}`;
}

function fail(message: string, cause?: unknown): never {
  throw new ResearchWorkflowError(
    "RESEARCH_WORKFLOW_INVALID",
    message,
    cause === undefined ? undefined : { cause },
  );
}

function plainObject(
  input: unknown,
  label: string,
  allowed: readonly string[],
  required: readonly string[] = allowed,
): Record<string, unknown> {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    fail(`${label} must be a JSON object`);
  }
  const value = input as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${label}.${key} is not supported`);
  }
  for (const key of required) {
    if (!(key in value)) fail(`${label}.${key} is required`);
  }
  return value;
}

function nonEmptyString(input: unknown, label: string): string {
  if (typeof input !== "string" || input.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return input;
}

function slug(input: unknown, label: string): string {
  const value = nonEmptyString(input, label);
  if (!SLUG.test(value)) fail(`${label} must be a lowercase slug`);
  return value;
}

function exactSemver(input: unknown, label: string): string {
  const value = nonEmptyString(input, label);
  const match = EXACT_SEMVER.exec(value);
  if (
    match === null ||
    value.includes("+") ||
    match[4]?.split(".").some((part) => /^\d+$/.test(part) && /^0\d/.test(part))
  ) {
    fail(`${label} must be exact SemVer without build metadata`);
  }
  return value;
}

function uniqueSortedStrings(
  input: unknown,
  label: string,
  parser: (entry: unknown, label: string) => string,
  allowEmpty = false,
): readonly string[] {
  if (!Array.isArray(input) || (!allowEmpty && input.length === 0)) {
    fail(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array`);
  }
  const values = input.map((entry, index) => parser(entry, `${label}[${index}]`));
  if (new Set(values).size !== values.length) fail(`${label} entries must be unique`);
  return Object.freeze([...values].sort());
}

function parseProfiles(input: unknown, label: string): readonly ResearchExecutionProfile[] {
  if (!Array.isArray(input) || input.length === 0) {
    fail(`${label} must be a non-empty array`);
  }
  const values = input.map((entry, index) => {
    if (entry !== "lightweight" && entry !== "managed") {
      fail(`${label}[${index}] must be lightweight or managed`);
    }
    return entry;
  });
  if (new Set(values).size !== values.length) fail(`${label} entries must be unique`);
  return Object.freeze(
    (["lightweight", "managed"] as const).filter((profile) =>
      values.includes(profile),
    ),
  );
}

function parseGate(input: unknown, label: string): "H1" | "H2" {
  if (input !== "H1" && input !== "H2") fail(`${label} must be H1 or H2`);
  return input;
}

function freezeIdentity(input: unknown): ResolvedExecutionPackageIdentity {
  try {
    return Object.freeze(resolvedExecutionPackageIdentitySchema.parse(input));
  } catch (error) {
    fail("workflow node executionPackage is invalid", error);
  }
}

function parseNode(input: unknown, index: number): ResearchWorkflowNodeV1 {
  const value = plainObject(input, `workflow.nodes[${index}]`, [
    "id",
    "executionPackage",
    "allowedProfiles",
    "stop",
  ]);
  if (value.stop !== true) {
    fail(`workflow.nodes[${index}].stop must be true in C3`);
  }
  return Object.freeze({
    id: slug(value.id, `workflow.nodes[${index}].id`),
    executionPackage: freezeIdentity(value.executionPackage),
    allowedProfiles: parseProfiles(
      value.allowedProfiles,
      `workflow.nodes[${index}].allowedProfiles`,
    ),
    stop: true,
  });
}

function parseTransition(
  input: unknown,
  index: number,
): ResearchWorkflowTransitionV1 {
  const value = plainObject(input, `workflow.transitions[${index}]`, [
    "id",
    "fromNodeId",
    "toNodeId",
    "requiredRefs",
    "requiredGateIds",
  ]);
  return Object.freeze({
    id: slug(value.id, `workflow.transitions[${index}].id`),
    fromNodeId: slug(
      value.fromNodeId,
      `workflow.transitions[${index}].fromNodeId`,
    ),
    toNodeId: slug(value.toNodeId, `workflow.transitions[${index}].toNodeId`),
    requiredRefs: uniqueSortedStrings(
      value.requiredRefs,
      `workflow.transitions[${index}].requiredRefs`,
      (entry, label) => serializeWorkflowAcceptedRef(parseWorkflowAcceptedRef(entry, label)),
      true,
    ),
    requiredGateIds: uniqueSortedStrings(
      value.requiredGateIds,
      `workflow.transitions[${index}].requiredGateIds`,
      parseGate,
      true,
    ) as readonly ("H1" | "H2")[],
  });
}

function validateGraph(definition: ResearchWorkflowDefinitionV1): void {
  const nodeIds = new Set(definition.nodes.map((node) => node.id));
  for (const startNodeId of definition.startNodeIds) {
    if (!nodeIds.has(startNodeId)) {
      fail(`workflow start node '${startNodeId}' does not exist`);
    }
  }
  const outgoing = new Map<string, string[]>();
  for (const transition of definition.transitions) {
    if (!nodeIds.has(transition.fromNodeId) || !nodeIds.has(transition.toNodeId)) {
      fail(`workflow transition '${transition.id}' references a missing node`);
    }
    if (transition.fromNodeId === transition.toNodeId) {
      fail(`workflow transition '${transition.id}' must not be a self-edge`);
    }
    outgoing.set(transition.fromNodeId, [
      ...(outgoing.get(transition.fromNodeId) ?? []),
      transition.toNodeId,
    ]);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) fail("workflow graph must be acyclic");
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    for (const target of outgoing.get(nodeId) ?? []) visit(target);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  for (const node of definition.nodes) visit(node.id);
}

export function parseResearchWorkflowDefinitionV1(
  bytes: Uint8Array,
): ParsedResearchWorkflowDefinitionV1 {
  let parsed: unknown;
  try {
    parsed = parseStrictResearchJson(new Uint8Array(bytes));
  } catch (error) {
    fail("Research Workflow definition JSON is invalid", error);
  }
  const value = plainObject(parsed, "Research Workflow definition", [
    "schemaVersion",
    "id",
    "version",
    "startNodeIds",
    "nodes",
    "transitions",
  ]);
  if (value.schemaVersion !== 1) fail("workflow.schemaVersion must be 1");
  if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
    fail("workflow.nodes must be a non-empty array");
  }
  if (!Array.isArray(value.transitions)) {
    fail("workflow.transitions must be an array");
  }
  const nodes = value.nodes.map(parseNode);
  const transitions = value.transitions.map(parseTransition);
  if (new Set(nodes.map((node) => node.id)).size !== nodes.length) {
    fail("workflow node IDs must be unique");
  }
  if (new Set(transitions.map((transition) => transition.id)).size !== transitions.length) {
    fail("workflow transition IDs must be unique");
  }
  const definition = Object.freeze({
    schemaVersion: 1 as const,
    id: slug(value.id, "workflow.id"),
    version: exactSemver(value.version, "workflow.version"),
    startNodeIds: uniqueSortedStrings(
      value.startNodeIds,
      "workflow.startNodeIds",
      slug,
    ),
    nodes: Object.freeze([...nodes].sort((left, right) => left.id.localeCompare(right.id))),
    transitions: Object.freeze(
      [...transitions].sort((left, right) => left.id.localeCompare(right.id)),
    ),
  }) satisfies ResearchWorkflowDefinitionV1;
  validateGraph(definition);
  const workflowDigest = `sha256:${createHash("sha256")
    .update(WORKFLOW_DIGEST_DOMAIN, "utf8")
    .update(stableResearchJson(definition), "utf8")
    .digest("hex")}` as const;
  return Object.freeze({ definition, workflowDigest });
}

export function parseWorkflowAcceptedRef(
  input: unknown,
  label = "accepted reference",
): WorkflowAcceptedRef {
  const value = nonEmptyString(input, label);
  const match = /^(result|artifact):(.+)$/.exec(value);
  if (match === null) fail(`${label} must be result:<res_uuid> or artifact:<art_uuid>`);
  const kind = match[1] as "result" | "artifact";
  const id = match[2] as string;
  const prefix = kind === "result" ? "res" : "art";
  if (!id.startsWith(`${prefix}_`) || !UUID.test(id.slice(4))) {
    fail(`${label} must be ${kind}:<${prefix}_uuid>`);
  }
  return Object.freeze(
    kind === "result"
      ? { kind, id: id as ResultId }
      : { kind, id: id as ArtifactId },
  );
}

export function serializeWorkflowAcceptedRef(ref: WorkflowAcceptedRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function normalizeWorkflowAcceptedRefs(
  refs: readonly (WorkflowAcceptedRef | string)[],
): readonly WorkflowAcceptedRef[] {
  const parsed = refs.map((ref, index) =>
    typeof ref === "string"
      ? parseWorkflowAcceptedRef(ref, `acceptedRefs[${index}]`)
      : parseWorkflowAcceptedRef(serializeWorkflowAcceptedRef(ref), `acceptedRefs[${index}]`),
  );
  const serialized = parsed.map(serializeWorkflowAcceptedRef);
  if (new Set(serialized).size !== serialized.length) {
    fail("acceptedRefs entries must be unique");
  }
  return Object.freeze(
    [...parsed].sort((left, right) =>
      serializeWorkflowAcceptedRef(left).localeCompare(serializeWorkflowAcceptedRef(right)),
    ),
  );
}

export function findResearchWorkflowNode(
  definition: ResearchWorkflowDefinitionV1,
  nodeId: string,
): ResearchWorkflowNodeV1 | undefined {
  return definition.nodes.find((node) => node.id === nodeId);
}

export function findResearchWorkflowTransition(
  definition: ResearchWorkflowDefinitionV1,
  transitionId: string,
): ResearchWorkflowTransitionV1 | undefined {
  return definition.transitions.find((transition) => transition.id === transitionId);
}

export function listResearchWorkflowOutgoingTransitions(
  definition: ResearchWorkflowDefinitionV1,
  nodeId: string,
): readonly ResearchWorkflowTransitionV1[] {
  return Object.freeze(
    definition.transitions.filter((transition) => transition.fromNodeId === nodeId),
  );
}

export function isResearchWorkflowTerminalNode(
  definition: ResearchWorkflowDefinitionV1,
  nodeId: string,
): boolean {
  return listResearchWorkflowOutgoingTransitions(definition, nodeId).length === 0;
}

export function missingResearchWorkflowRequiredRefs(
  transition: ResearchWorkflowTransitionV1,
  acceptedRefs: readonly WorkflowAcceptedRef[],
): readonly string[] {
  const accepted = new Set(acceptedRefs.map(serializeWorkflowAcceptedRef));
  return Object.freeze(
    transition.requiredRefs.filter((requiredRef) => !accepted.has(requiredRef)),
  );
}

export function sameResearchExecutionPackageIdentity(
  left: ResolvedExecutionPackageIdentity,
  right: ResolvedExecutionPackageIdentity,
): boolean {
  return isDeepStrictEqual(left, right);
}

function workflowId(input: unknown, label = "workflowInstanceId"): WorkflowInstanceId {
  const value = nonEmptyString(input, label);
  if (!value.startsWith("wfi_") || !UUID.test(value.slice(4))) {
    fail(`${label} must be a wfi_ prefixed UUID`);
  }
  return value as WorkflowInstanceId;
}

function questId(input: unknown, label = "questId"): QuestId {
  const value = nonEmptyString(input, label);
  if (!value.startsWith("qst_") || !UUID.test(value.slice(4))) {
    fail(`${label} must be a qst_ prefixed UUID`);
  }
  return value as QuestId;
}

function digestValue(input: unknown, label: string): `sha256:${string}` {
  const value = nonEmptyString(input, label);
  if (!SHA256.test(value)) fail(`${label} must be a lowercase SHA-256 binding`);
  return value as `sha256:${string}`;
}

function timestamp(input: unknown, label: string): string {
  const value = nonEmptyString(input, label);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    fail(`${label} must be a canonical RFC3339 UTC timestamp`);
  }
  return value;
}

function bindingFields(value: Record<string, unknown>): {
  workflowInstanceId: WorkflowInstanceId;
  questId: QuestId;
  workflowId: string;
  workflowVersion: string;
  workflowDigest: `sha256:${string}`;
} {
  return {
    workflowInstanceId: workflowId(value.workflowInstanceId),
    questId: questId(value.questId),
    workflowId: slug(value.workflowId, "workflowId"),
    workflowVersion: exactSemver(value.workflowVersion, "workflowVersion"),
    workflowDigest: digestValue(value.workflowDigest, "workflowDigest"),
  };
}

export function parseWorkflowBindPayload(input: unknown): WorkflowBindPayload {
  const value = plainObject(input, "workflow bind payload", [
    "workflowInstanceId",
    "questId",
    "workflowId",
    "workflowVersion",
    "workflowDigest",
    "startNodeId",
    "boundAt",
  ]);
  return {
    ...bindingFields(value),
    startNodeId: slug(value.startNodeId, "startNodeId"),
    boundAt: timestamp(value.boundAt, "boundAt"),
  };
}

export function parseWorkflowNodeCompletePayload(
  input: unknown,
): WorkflowNodeCompletePayload {
  const value = plainObject(input, "workflow completion payload", [
    "workflowInstanceId",
    "questId",
    "workflowId",
    "workflowVersion",
    "workflowDigest",
    "nodeId",
    "executionPackage",
    "executionProfile",
    "acceptedRefs",
    "completedAt",
  ]);
  if (value.executionProfile !== "lightweight" && value.executionProfile !== "managed") {
    fail("executionProfile must be lightweight or managed");
  }
  if (!Array.isArray(value.acceptedRefs) || value.acceptedRefs.length === 0) {
    fail("acceptedRefs must be a non-empty array");
  }
  const acceptedRefs = normalizeWorkflowAcceptedRefs(
    value.acceptedRefs.map((entry, index) => {
      const ref = plainObject(entry, `acceptedRefs[${index}]`, ["kind", "id"]);
      if (ref.kind !== "result" && ref.kind !== "artifact") {
        fail(`acceptedRefs[${index}].kind must be result or artifact`);
      }
      return `${ref.kind}:${nonEmptyString(ref.id, `acceptedRefs[${index}].id`)}`;
    }),
  );
  return {
    ...bindingFields(value),
    nodeId: slug(value.nodeId, "nodeId"),
    executionPackage: freezeIdentity(value.executionPackage),
    executionProfile: value.executionProfile,
    acceptedRefs: [...acceptedRefs],
    completedAt: timestamp(value.completedAt, "completedAt"),
  };
}

export function parseWorkflowTransitionRecordPayload(
  input: unknown,
): WorkflowTransitionRecordPayload {
  const value = plainObject(input, "workflow transition payload", [
    "workflowInstanceId",
    "questId",
    "workflowId",
    "workflowVersion",
    "workflowDigest",
    "transitionId",
    "fromNodeId",
    "toNodeId",
    "selectedBy",
    "gateRecordIds",
    "selectedAt",
  ]);
  if (!Array.isArray(value.gateRecordIds)) fail("gateRecordIds must be an array");
  const gateRecordIds = value.gateRecordIds.map((entry, index) =>
    nonEmptyString(entry, `gateRecordIds[${index}]`),
  );
  if (new Set(gateRecordIds).size !== gateRecordIds.length) {
    fail("gateRecordIds entries must be unique");
  }
  return {
    ...bindingFields(value),
    transitionId: slug(value.transitionId, "transitionId"),
    fromNodeId: slug(value.fromNodeId, "fromNodeId"),
    toNodeId: slug(value.toNodeId, "toNodeId"),
    selectedBy: nonEmptyString(value.selectedBy, "selectedBy"),
    gateRecordIds: [...gateRecordIds].sort(),
    selectedAt: timestamp(value.selectedAt, "selectedAt"),
  };
}

export function parseWorkflowClosePayload(input: unknown): WorkflowClosePayload {
  const value = plainObject(input, "workflow close payload", [
    "workflowInstanceId",
    "questId",
    "workflowId",
    "workflowVersion",
    "workflowDigest",
    "outcome",
    "closedBy",
    "rationale",
    "closedAt",
  ]);
  if (
    value.outcome !== "completed" &&
    value.outcome !== "blocked" &&
    value.outcome !== "cancelled" &&
    value.outcome !== "superseded"
  ) {
    fail("outcome must be completed, blocked, cancelled, or superseded");
  }
  return {
    ...bindingFields(value),
    outcome: value.outcome,
    closedBy: nonEmptyString(value.closedBy, "closedBy"),
    rationale: nonEmptyString(value.rationale, "rationale"),
    closedAt: timestamp(value.closedAt, "closedAt"),
  };
}

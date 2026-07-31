/**
 * Capability-contained Proposal operation allowlists (Completion Wave-2).
 * The ProposalOperation union remains syntactic; these allowlists enforce
 * recording and application authority without widening the event schema.
 */

import type { ResearchCapabilityId } from "./stage-capabilities.js";
import type { ProposalOperation } from "./types.js";

export type ProposalOperationKind = ProposalOperation["kind"];

/** Frozen Quest-admin administration operations only. */
export const QUEST_ADMIN_PROPOSAL_OPERATION_KINDS = Object.freeze([
  "quest.status",
  "quest.stage",
] as const satisfies readonly ProposalOperationKind[]);

/** Ordinary research operations (no Quest administration). */
export const ORDINARY_RESEARCH_PROPOSAL_OPERATION_KINDS = Object.freeze([
  "artifact.register",
  "campaign.protocol",
  "campaign.freeze",
  "campaign.status",
  "run.status",
  "run.invalidate",
  "evidence.create",
  "evidence.status",
  "claim.create",
  "claim.status",
] as const satisfies readonly ProposalOperationKind[]);

const QUEST_ADMIN_SET = new Set<string>(QUEST_ADMIN_PROPOSAL_OPERATION_KINDS);
const ORDINARY_SET = new Set<string>(ORDINARY_RESEARCH_PROPOSAL_OPERATION_KINDS);

/**
 * Exact allowlist of Proposal operation kinds for a capability.
 * research.framing.quest is read-only w.r.t. Quest administration.
 * research.framing.admin is administration-only.
 */
export function allowedProposalOperationKindsForCapability(
  capabilityId: ResearchCapabilityId | string,
): ReadonlySet<ProposalOperationKind> {
  if (capabilityId === "research.framing.admin") {
    return new Set(QUEST_ADMIN_PROPOSAL_OPERATION_KINDS);
  }
  if (capabilityId === "research.framing.quest") {
    // Framing is Proposal-only for ordinary research artifacts, never Quest admin.
    return new Set(ORDINARY_RESEARCH_PROPOSAL_OPERATION_KINDS);
  }
  return new Set(ORDINARY_RESEARCH_PROPOSAL_OPERATION_KINDS);
}

export type ProposalOperationAllowlistErrorCode =
  | "OPERATION_NOT_ALLOWED_FOR_CAPABILITY"
  | "EMPTY_OPERATIONS_WITH_EXECUTABLE_INTENT";

export interface ProposalOperationAllowlistResult {
  readonly ok: boolean;
  readonly code?: ProposalOperationAllowlistErrorCode;
  readonly message?: string;
  readonly rejectedKinds?: readonly string[];
}

/**
 * Reject operations outside the activated capability allowlist.
 * Empty operations are allowed (e.g. blocked Result + empty pending Proposal).
 */
export function validateProposalOperationsForCapability(input: {
  readonly capabilityId: string;
  readonly operations: readonly ProposalOperation[];
}): ProposalOperationAllowlistResult {
  const allowed = allowedProposalOperationKindsForCapability(input.capabilityId);
  const rejected: string[] = [];
  for (const op of input.operations) {
    if (!allowed.has(op.kind)) {
      rejected.push(op.kind);
    }
  }
  if (rejected.length > 0) {
    return {
      ok: false,
      code: "OPERATION_NOT_ALLOWED_FOR_CAPABILITY",
      message: `Proposal operations not allowed for capability '${input.capabilityId}': ${[...new Set(rejected)].join(", ")}`,
      rejectedKinds: Object.freeze([...new Set(rejected)]),
    };
  }
  // Defensive: quest admin must not smuggle ordinary ops via empty union gaps.
  if (input.capabilityId === "research.framing.admin") {
    for (const op of input.operations) {
      if (!QUEST_ADMIN_SET.has(op.kind)) {
        return {
          ok: false,
          code: "OPERATION_NOT_ALLOWED_FOR_CAPABILITY",
          message: `Quest admin Proposal may only use frozen administration operations; got '${op.kind}'`,
          rejectedKinds: Object.freeze([op.kind]),
        };
      }
    }
  }
  if (input.capabilityId === "research.framing.quest") {
    for (const op of input.operations) {
      if (QUEST_ADMIN_SET.has(op.kind)) {
        return {
          ok: false,
          code: "OPERATION_NOT_ALLOWED_FOR_CAPABILITY",
          message: `Quest framing is read-only for administration; forbidden '${op.kind}'`,
          rejectedKinds: Object.freeze([op.kind]),
        };
      }
    }
  }
  // Ordinary path: only known ordinary kinds.
  if (
    input.capabilityId !== "research.framing.admin" &&
    input.capabilityId !== "research.framing.quest"
  ) {
    for (const op of input.operations) {
      if (!ORDINARY_SET.has(op.kind)) {
        return {
          ok: false,
          code: "OPERATION_NOT_ALLOWED_FOR_CAPABILITY",
          message: `Proposal operation '${op.kind}' is outside ordinary research allowlist`,
          rejectedKinds: Object.freeze([op.kind]),
        };
      }
    }
  }
  return { ok: true };
}

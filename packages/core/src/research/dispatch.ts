import {
  decisionSchema,
  dispatchSchema,
  proposalSchema,
  resultSchema,
} from "./schema.js";
import type { ResearchMutation } from "./store.js";
import type {
  DecisionOutcome,
  ProposalOperation,
  ProposalStatus,
} from "./types.js";

export { decisionSchema, dispatchSchema, proposalSchema, resultSchema };

export function proposalOperationsToMutations(
  operations: readonly ProposalOperation[],
): ResearchMutation[] {
  return operations.map((operation) => {
    switch (operation.kind) {
      case "artifact.register":
        return { kind: operation.kind, artifact: operation.artifact };
      case "quest.status":
        return {
          kind: operation.kind,
          questId: operation.questId,
          status: operation.status,
        };
      case "quest.stage":
        return {
          kind: operation.kind,
          questId: operation.questId,
          stage: operation.stage,
        };
      case "campaign.protocol":
        return {
          kind: operation.kind,
          campaignId: operation.campaignId,
          protocolDigest: operation.protocolDigest,
        };
      case "campaign.freeze":
        return { kind: operation.kind, campaignId: operation.campaignId };
      case "campaign.status":
        return {
          kind: operation.kind,
          campaignId: operation.campaignId,
          status: operation.status,
        };
      case "run.status":
        return {
          kind: operation.kind,
          runId: operation.runId,
          status: operation.status,
        };
      case "run.invalidate":
        return {
          kind: operation.kind,
          runId: operation.runId,
          reason: operation.reason,
        };
      case "evidence.create":
        return { kind: operation.kind, evidence: operation.evidence };
      case "evidence.status":
        return {
          kind: operation.kind,
          evidenceId: operation.evidenceId,
          status: operation.status,
        };
      case "claim.create":
        return { kind: operation.kind, claim: operation.claim };
      case "claim.status":
        return {
          kind: operation.kind,
          claimId: operation.claimId,
          status: operation.status,
        };
    }
  });
}

export function proposalStatusForDecision(
  outcome: DecisionOutcome,
): ProposalStatus {
  switch (outcome) {
    case "accept":
      return "accepted";
    case "reject":
      return "rejected";
    case "defer":
      return "deferred";
  }
}

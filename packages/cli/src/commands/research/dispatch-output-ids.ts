import {
  approvalIdSchema,
  type ApprovalId,
  type DispatchId,
  type ProposalId,
  type ResearchState,
  type ResultId,
} from "@mindfoldhq/trellis-core/research";

export interface DerivedResearchOutputIds {
  readonly resultId: ResultId;
  readonly proposalId: ProposalId;
}

export type ResearchOutputIdOccupation =
  | "available"
  | "dispatch-completed"
  | "conflict";

export function deriveResearchOutputIds(
  approvalId: ApprovalId,
): Readonly<DerivedResearchOutputIds> {
  const canonicalApprovalId = approvalIdSchema.parse(approvalId);
  const suffix = canonicalApprovalId.slice(4);
  return Object.freeze({
    resultId: `res_${suffix}` as ResultId,
    proposalId: `prp_${suffix}` as ProposalId,
  });
}

export function classifyResearchOutputIdOccupation(input: {
  readonly state: ResearchState;
  readonly dispatchId: DispatchId;
  readonly ids: DerivedResearchOutputIds;
}): ResearchOutputIdOccupation {
  const result = input.state.results[input.ids.resultId];
  const proposal = input.state.proposals[input.ids.proposalId];
  if (result === undefined && proposal === undefined) return "available";
  if (
    (result === undefined || result.dispatchId === input.dispatchId) &&
    (proposal === undefined || proposal.dispatchId === input.dispatchId)
  ) {
    return "dispatch-completed";
  }
  return "conflict";
}

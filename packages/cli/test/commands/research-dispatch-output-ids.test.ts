import { describe, expect, it } from "vitest";

import {
  reduceResearchEvents,
  type ApprovalId,
  type DispatchId,
  type Proposal,
  type ResearchState,
  type Result,
} from "@mindfoldhq/trellis-core/research";

import {
  classifyResearchOutputIdOccupation,
  deriveResearchOutputIds,
} from "../../src/commands/research/dispatch-output-ids.js";

const DISPATCH_ID = "dsp_11111111-1111-4111-8111-111111111111" as DispatchId;
const OTHER_DISPATCH_ID =
  "dsp_22222222-2222-4222-8222-222222222222" as DispatchId;
const APPROVAL_ID = "apr_ABCDEF12-3456-4789-ABCD-EF1234567890" as ApprovalId;

function occupiedState(input: {
  readonly resultDispatchId?: DispatchId;
  readonly proposalDispatchId?: DispatchId;
}): ResearchState {
  const state = reduceResearchEvents([]);
  const ids = deriveResearchOutputIds(APPROVAL_ID);
  if (input.resultDispatchId !== undefined) {
    state.results[ids.resultId] = {
      id: ids.resultId,
      dispatchId: input.resultDispatchId,
      runId: "run_33333333-3333-4333-8333-333333333333",
      status: "completed",
      summary: "Complete",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt: "2026-07-24T00:00:00.000Z",
    } as Result;
  }
  if (input.proposalDispatchId !== undefined) {
    state.proposals[ids.proposalId] = {
      id: ids.proposalId,
      dispatchId: input.proposalDispatchId,
      questId: "qst_44444444-4444-4444-8444-444444444444",
      title: "Proposal",
      operations: [],
      status: "pending",
      createdAt: "2026-07-24T00:00:00.000Z",
      updatedAt: "2026-07-24T00:00:00.000Z",
    } as Proposal;
  }
  return state;
}

describe("approval-derived Research output IDs", () => {
  it("preserves the accepted UUID suffix byte-for-byte", () => {
    expect(deriveResearchOutputIds(APPROVAL_ID)).toEqual({
      resultId: "res_ABCDEF12-3456-4789-ABCD-EF1234567890",
      proposalId: "prp_ABCDEF12-3456-4789-ABCD-EF1234567890",
    });
  });

  it("is repeatable and distinguishes renewed approvals", () => {
    expect(deriveResearchOutputIds(APPROVAL_ID)).toEqual(
      deriveResearchOutputIds(APPROVAL_ID),
    );
    expect(
      deriveResearchOutputIds(
        "apr_55555555-5555-4555-8555-555555555555" as ApprovalId,
      ),
    ).not.toEqual(deriveResearchOutputIds(APPROVAL_ID));
  });

  it("rejects malformed Approval IDs", () => {
    expect(() =>
      deriveResearchOutputIds("apr_not-a-uuid" as ApprovalId),
    ).toThrow(/apr_/);
  });

  it("classifies available, same-Dispatch, and unrelated occupations", () => {
    const ids = deriveResearchOutputIds(APPROVAL_ID);
    expect(
      classifyResearchOutputIdOccupation({
        state: occupiedState({}),
        dispatchId: DISPATCH_ID,
        ids,
      }),
    ).toBe("available");
    expect(
      classifyResearchOutputIdOccupation({
        state: occupiedState({ resultDispatchId: DISPATCH_ID }),
        dispatchId: DISPATCH_ID,
        ids,
      }),
    ).toBe("dispatch-completed");
    expect(
      classifyResearchOutputIdOccupation({
        state: occupiedState({ proposalDispatchId: DISPATCH_ID }),
        dispatchId: DISPATCH_ID,
        ids,
      }),
    ).toBe("dispatch-completed");
    expect(
      classifyResearchOutputIdOccupation({
        state: occupiedState({
          resultDispatchId: DISPATCH_ID,
          proposalDispatchId: DISPATCH_ID,
        }),
        dispatchId: DISPATCH_ID,
        ids,
      }),
    ).toBe("dispatch-completed");
    expect(
      classifyResearchOutputIdOccupation({
        state: occupiedState({ resultDispatchId: OTHER_DISPATCH_ID }),
        dispatchId: DISPATCH_ID,
        ids,
      }),
    ).toBe("conflict");
    expect(
      classifyResearchOutputIdOccupation({
        state: occupiedState({ proposalDispatchId: OTHER_DISPATCH_ID }),
        dispatchId: DISPATCH_ID,
        ids,
      }),
    ).toBe("conflict");
    expect(
      classifyResearchOutputIdOccupation({
        state: occupiedState({
          resultDispatchId: OTHER_DISPATCH_ID,
          proposalDispatchId: OTHER_DISPATCH_ID,
        }),
        dispatchId: DISPATCH_ID,
        ids,
      }),
    ).toBe("conflict");
  });
});

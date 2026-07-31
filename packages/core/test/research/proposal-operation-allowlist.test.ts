import { describe, expect, it } from "vitest";

import {
  QUEST_ADMIN_PROPOSAL_OPERATION_KINDS,
  allowedProposalOperationKindsForCapability,
  validateProposalOperationsForCapability,
} from "../../src/research/index.js";
import type { ProposalOperation } from "../../src/research/index.js";

describe("Proposal operation capability allowlists", () => {
  it("rejects quest administration on framing and ordinary capabilities", () => {
    const adminOps: ProposalOperation[] = [
      { kind: "quest.status", questId: "qst_1" as never, status: "active" },
    ];
    expect(
      validateProposalOperationsForCapability({
        capabilityId: "research.framing.quest",
        operations: adminOps,
      }).ok,
    ).toBe(false);
    expect(
      validateProposalOperationsForCapability({
        capabilityId: "research.ideation.generate",
        operations: adminOps,
      }).ok,
    ).toBe(false);
  });

  it("allows only frozen admin ops for research.framing.admin", () => {
    const kinds = allowedProposalOperationKindsForCapability(
      "research.framing.admin",
    );
    expect([...kinds].sort()).toEqual(
      [...QUEST_ADMIN_PROPOSAL_OPERATION_KINDS].sort(),
    );
    expect(
      validateProposalOperationsForCapability({
        capabilityId: "research.framing.admin",
        operations: [
          { kind: "quest.stage", questId: "qst_1" as never, stage: "ideation" },
        ],
      }).ok,
    ).toBe(true);
    expect(
      validateProposalOperationsForCapability({
        capabilityId: "research.framing.admin",
        operations: [
          {
            kind: "evidence.create",
            evidence: {
              id: "evd_1" as never,
              questId: "qst_1" as never,
              kind: "note",
              summary: "x",
              artifactRefs: [],
            } as never,
          },
        ],
      }).ok,
    ).toBe(false);
  });

  it("allows ordinary research ops and empty lists", () => {
    expect(
      validateProposalOperationsForCapability({
        capabilityId: "research.ideation.generate",
        operations: [],
      }).ok,
    ).toBe(true);
    expect(
      validateProposalOperationsForCapability({
        capabilityId: "research.ideation.generate",
        operations: [
          {
            kind: "claim.create",
            claim: {
              id: "clm_1" as never,
              questId: "qst_1" as never,
              statement: "s",
              evidenceIds: [],
            },
          },
        ],
      }).ok,
    ).toBe(true);
  });
});

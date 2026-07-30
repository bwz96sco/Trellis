import { describe, expect, it } from "vitest";

import {
  RESEARCH_CAPABILITY_REGISTRY,
  RESEARCH_DEFAULT_CAPABILITY_BY_STAGE,
  RESEARCH_PROCEDURE_CURRENT_VERSION,
  getResearchCapabilityDefinition,
} from "../../src/research/index.js";

/**
 * Wave-5/6 rollback rehearsals (deterministic, no disable events).
 * Pre-activation: future selection is restorable to 1.0.0 inventory shape.
 * Post-activation: future selection may change while historical bindings stay
 * identity-only (id/version/digest) — validated via recorded-version mode
 * elsewhere.
 */
describe("cutover rollback rehearsal", () => {
  it("pre-activation inventory can restore to 14 live capabilities at 1.0.0", () => {
    // When CURRENT is 2.0.1 after activation, this documents the pre-activation
    // rollback target constants that must remain constructible.
    const preActivationLiveIds = [
      "research.setup.project",
      "research.framing.quest",
      "research.framing.admin",
      "research.literature.scan",
      "research.literature.review",
      "research.ideation.generate",
      "research.ideation.evaluate",
      "research.experiment.round",
      "research.experiment.campaign",
      "research.computation.case",
      "research.theory.case",
      "research.audit.case",
      "research.audit.campaign",
      "research.writing.case",
    ];
    for (const id of preActivationLiveIds) {
      expect(getResearchCapabilityDefinition(id)).toBeDefined();
    }
    // Optional capabilities may be present after activation but must not be
    // required for pre-activation rollback target.
    expect(preActivationLiveIds).toHaveLength(14);
  });

  it("post-activation future selection is only registry binding state", () => {
    // Rollback future selection means flipping CURRENT/default routes only.
    // This test asserts the symbols exist and are pure data (no disable event).
    expect(typeof RESEARCH_PROCEDURE_CURRENT_VERSION).toBe("string");
    expect(RESEARCH_CAPABILITY_REGISTRY.length).toBeGreaterThanOrEqual(14);
    expect(RESEARCH_DEFAULT_CAPABILITY_BY_STAGE.literature).toMatch(
      /^research\.literature\./,
    );
  });
});

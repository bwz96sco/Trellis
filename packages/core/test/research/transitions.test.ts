import { describe, expect, it } from "vitest";

import {
  assertCampaignStatusTransition,
  assertClaimStatusTransition,
  assertEvidenceStatusTransition,
  assertQuestStatusTransition,
  assertRunInvalidation,
  assertRunStatusTransition,
  type CampaignStatus,
  type ClaimStatus,
  type EvidenceStatus,
  type QuestStatus,
  type RunStatus,
} from "../../src/research/index.js";

function expectTransitionMatrix<T extends string>(
  states: readonly T[],
  allowed: ReadonlySet<string>,
  assertTransition: (from: T, to: T) => void,
): void {
  for (const from of states) {
    for (const to of states) {
      const key = `${from}->${to}`;
      if (allowed.has(key)) {
        expect(() => assertTransition(from, to), key).not.toThrow();
      } else {
        expect(() => assertTransition(from, to), key).toThrow();
      }
    }
  }
}

describe("research lifecycle transitions", () => {
  it("covers every quest transition", () => {
    const states: readonly QuestStatus[] = [
      "active",
      "paused",
      "completed",
      "abandoned",
    ];
    expectTransitionMatrix(
      states,
      new Set([
        "active->paused",
        "active->completed",
        "active->abandoned",
        "paused->active",
        "paused->completed",
        "paused->abandoned",
      ]),
      assertQuestStatusTransition,
    );
  });

  it("covers every campaign transition", () => {
    const states: readonly CampaignStatus[] = [
      "draft",
      "frozen",
      "running",
      "blocked",
      "completed",
      "abandoned",
    ];
    expectTransitionMatrix(
      states,
      new Set([
        "draft->frozen",
        "draft->abandoned",
        "frozen->running",
        "frozen->blocked",
        "frozen->abandoned",
        "running->blocked",
        "running->completed",
        "running->abandoned",
        "blocked->running",
        "blocked->abandoned",
      ]),
      assertCampaignStatusTransition,
    );
  });

  it("covers normal run transitions and explicit invalidation", () => {
    const states: readonly RunStatus[] = [
      "planned",
      "running",
      "succeeded",
      "failed",
      "cancelled",
      "invalidated",
    ];
    expectTransitionMatrix(
      states,
      new Set([
        "planned->running",
        "planned->cancelled",
        "running->succeeded",
        "running->failed",
        "running->cancelled",
      ]),
      assertRunStatusTransition,
    );
    for (const status of states.filter((value) => value !== "invalidated")) {
      expect(() => assertRunInvalidation(status)).not.toThrow();
    }
    expect(() => assertRunInvalidation("invalidated")).toThrow();
  });

  it("covers every evidence transition", () => {
    const states: readonly EvidenceStatus[] = [
      "active",
      "superseded",
      "retracted",
    ];
    expectTransitionMatrix(
      states,
      new Set(["active->superseded", "active->retracted"]),
      assertEvidenceStatusTransition,
    );
  });

  it("covers every claim transition", () => {
    const states: readonly ClaimStatus[] = [
      "candidate",
      "supported",
      "contested",
      "refuted",
      "withdrawn",
    ];
    expectTransitionMatrix(
      states,
      new Set([
        "candidate->supported",
        "candidate->contested",
        "candidate->refuted",
        "candidate->withdrawn",
        "supported->contested",
        "supported->refuted",
        "supported->withdrawn",
        "contested->supported",
        "contested->refuted",
        "contested->withdrawn",
      ]),
      assertClaimStatusTransition,
    );
  });
});

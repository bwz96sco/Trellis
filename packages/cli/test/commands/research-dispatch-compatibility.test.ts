import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  decisionSchema,
  dispatchSchema,
  proposalSchema,
  resultSchema,
  stableResearchJson,
} from "@mindfoldhq/trellis-core/research";
import { describe, expect, it } from "vitest";

const FIXTURE_ROOT = fileURLToPath(
  new URL("../fixtures/research-dispatch-schema-v1/", import.meta.url),
);

function readFixture(name: string): { text: string; value: unknown } {
  const text = fs.readFileSync(path.join(FIXTURE_ROOT, name), "utf-8");
  return { text, value: JSON.parse(text) };
}

describe("schema-v1 Dispatch tracked-file compatibility", () => {
  it("preserves the complete request metadata including ownerSkill and taskRef", () => {
    const fixture = readFixture("request.json");
    const dispatch = dispatchSchema.parse(fixture.value);

    expect(dispatch).toMatchObject({
      id: "dsp_77777777-7777-4777-8777-777777777777",
      ownerSkill: "trellis-research-runner",
      provider: "claude",
      taskRef: "tasks/07-18-golden-research",
      allowedWritePaths: ["results/golden-report.json"],
    });
    expect(dispatch.context).toEqual([
      { text: "Use the frozen schema-v1 protocol." },
      {
        artifact: expect.objectContaining({
          id: "art_33333333-3333-4333-8333-333333333333",
          path: "results/golden-report.json",
        }),
      },
    ]);
    expect(stableResearchJson(dispatch)).toBe(fixture.text);
  });

  it("strict-parses the result-plus-pending-Proposal input envelope", () => {
    const input = readFixture("record-result-input.json");
    expect(Object.keys(input.value as object).sort()).toEqual([
      "proposal",
      "result",
    ]);

    const value = input.value as Record<string, unknown>;
    const result = resultSchema.parse(value.result);
    const proposal = proposalSchema.parse(value.proposal);

    expect(result).toEqual(resultSchema.parse(readFixture("result.json").value));
    expect(proposal).toEqual(
      proposalSchema.parse(readFixture("proposal.json").value),
    );
    expect(result.dispatchId).toBe(proposal.dispatchId);
    expect(proposal.status).toBe("pending");
  });

  it("strict-parses the tracked Decision envelope and freezes stable JSON", () => {
    const fixture = readFixture("decision.json");
    const envelope = fixture.value as Record<string, unknown>;

    expect(Object.keys(envelope).sort()).toEqual([
      "appliedEventIds",
      "decision",
      "rejectedOperationIndexes",
      "schemaVersion",
    ]);
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.appliedEventIds).toEqual([
      "evt_00000000-0000-4000-8000-000000000010",
    ]);
    expect(envelope.rejectedOperationIndexes).toEqual([]);
    expect(decisionSchema.parse(envelope.decision)).toMatchObject({
      outcome: "accept",
      proposalId: "prp_99999999-9999-4999-8999-999999999999",
      selectedOperationIndexes: [0],
    });
    expect(stableResearchJson(envelope)).toBe(fixture.text);
  });
});

import { describe, expect, it } from "vitest";

import {
  createEventId,
  createWorkspaceId,
  parseResearchLedger,
  type ResearchEvent,
} from "../../src/research/index.js";

function workspaceEvent(overrides: Partial<ResearchEvent> = {}): ResearchEvent {
  const workspaceId = createWorkspaceId();
  return {
    schemaVersion: 1,
    eventId: createEventId(),
    seq: 1,
    timestamp: "2026-07-17T00:00:00.000Z",
    kind: "workspace.created",
    aggregate: { type: "workspace", id: workspaceId },
    related: [],
    payload: {
      workspace: {
        id: workspaceId,
        name: "Research",
        description: "",
        questIds: [],
        campaignIds: [],
        repositoryIds: [],
        createdAt: "2026-07-17T00:00:00.000Z",
        updatedAt: "2026-07-17T00:00:00.000Z",
      },
    },
    actor: { type: "agent", id: "test" },
    idempotencyKey: "workspace-init",
    provenance: { source: "test" },
    ...overrides,
  };
}

describe("strict research ledger parsing", () => {
  it("parses a valid contiguous ledger", () => {
    const event = workspaceEvent();
    expect(parseResearchLedger(`${JSON.stringify(event)}\n`)).toEqual([event]);
  });

  it("fails closed on malformed JSON with the line number", () => {
    expect(() => parseResearchLedger("{bad json}\n", "events.jsonl")).toThrow(
      /events\.jsonl line 1/,
    );
  });

  it("rejects invalid event payloads", () => {
    const event = workspaceEvent({ payload: { workspace: { id: "bad" } } });
    expect(() => parseResearchLedger(`${JSON.stringify(event)}\n`)).toThrow(
      /line 1/,
    );
  });

  it("rejects sequence gaps and duplicates", () => {
    const first = workspaceEvent();
    const gap = workspaceEvent({ seq: 3, eventId: createEventId() });
    expect(() =>
      parseResearchLedger(`${JSON.stringify(first)}\n${JSON.stringify(gap)}\n`),
    ).toThrow(/expected seq 2/);

    const duplicate = workspaceEvent({ seq: 1, eventId: createEventId() });
    expect(() =>
      parseResearchLedger(
        `${JSON.stringify(first)}\n${JSON.stringify(duplicate)}\n`,
      ),
    ).toThrow(/expected seq 2/);
  });

  it("rejects duplicate event IDs", () => {
    const first = workspaceEvent();
    const second = workspaceEvent({ seq: 2, eventId: first.eventId });
    expect(() =>
      parseResearchLedger(
        `${JSON.stringify(first)}\n${JSON.stringify(second)}\n`,
      ),
    ).toThrow(/duplicate eventId/);
  });
});

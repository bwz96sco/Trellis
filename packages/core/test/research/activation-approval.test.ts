import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  activationIdSchema,
  approvalIdSchema,
  commitResearchBatch,
  createActivationId,
  createApprovalId,
  parseResearchEvent,
  parseResearchLedger,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  reduceResearchEvents,
  researchActivationSchema,
  researchApprovalGrantSchema,
  researchApprovalStateSchema,
  researchPaths,
  serializeResearchEvents,
  type ResearchEvent,
} from "../../src/research/index.js";

const WORKSPACE_ID = "wsp_11111111-1111-4111-8111-111111111111" as const;
const REPOSITORY_ID = "rep_22222222-2222-4222-8222-222222222222" as const;
const QUEST_ID = "qst_33333333-3333-4333-8333-333333333333" as const;
const CAMPAIGN_ID = "cmp_44444444-4444-4444-8444-444444444444" as const;
const RUN_ID = "run_55555555-5555-4555-8555-555555555555" as const;
const DISPATCH_ID = "dsp_66666666-6666-4666-8666-666666666666" as const;
const ACTIVATION_ID = "act_77777777-7777-4777-8777-777777777777" as const;
const APPROVAL_ID = "apr_88888888-8888-4888-8888-888888888888" as const;
const SECOND_APPROVAL_ID = "apr_99999999-9999-4999-8999-999999999999" as const;
const RESULT_ID = "res_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as const;
const PROPOSAL_ID = "prp_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as const;
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
const DIGEST_D = `sha256:${"d".repeat(64)}`;
const ACTOR = { type: "agent" as const, id: "test" };
const PROVENANCE = { source: "activation-approval test", sourceId: "C02" };

function eventId(seq: number): `evt_${string}` {
  return `evt_${String(seq).padStart(8, "0")}-0000-4000-8000-${String(seq).padStart(12, "0")}`;
}

function event(
  seq: number,
  input: {
    schemaVersion: 1 | 2;
    timestamp: string;
    kind: string;
    aggregate: { type: string; id: string };
    related: { type: string; id: string }[];
    payload: Record<string, unknown>;
    idempotencyKey?: string;
    actor?: typeof ACTOR;
    provenance?: typeof PROVENANCE;
  },
): ResearchEvent {
  return parseResearchEvent({
    schemaVersion: input.schemaVersion,
    eventId: eventId(seq),
    seq,
    timestamp: input.timestamp,
    kind: input.kind,
    aggregate: input.aggregate,
    related: input.related,
    payload: input.payload,
    actor: input.actor ?? ACTOR,
    idempotencyKey: input.idempotencyKey ?? `event-${seq}`,
    provenance: input.provenance ?? PROVENANCE,
  });
}

function setupEvents(): ResearchEvent[] {
  return [
    event(1, {
      schemaVersion: 1,
      timestamp: "2026-07-24T00:00:00.000Z",
      kind: "workspace.created",
      aggregate: { type: "workspace", id: WORKSPACE_ID },
      related: [],
      payload: {
        workspace: {
          id: WORKSPACE_ID,
          name: "Research",
          description: "",
          questIds: [],
          campaignIds: [],
          repositoryIds: [],
          createdAt: "2026-07-24T00:00:00.000Z",
          updatedAt: "2026-07-24T00:00:00.000Z",
        },
      },
    }),
    event(2, {
      schemaVersion: 1,
      timestamp: "2026-07-24T00:01:00.000Z",
      kind: "repository.registered",
      aggregate: { type: "repository", id: REPOSITORY_ID },
      related: [],
      payload: {
        repository: {
          id: REPOSITORY_ID,
          name: "code",
          kind: "code",
          locator: "code",
          capabilities: { hasTrellis: true },
          createdAt: "2026-07-24T00:01:00.000Z",
          updatedAt: "2026-07-24T00:01:00.000Z",
        },
      },
    }),
    event(3, {
      schemaVersion: 1,
      timestamp: "2026-07-24T00:02:00.000Z",
      kind: "quest.created",
      aggregate: { type: "quest", id: QUEST_ID },
      related: [{ type: "repository", id: REPOSITORY_ID }],
      payload: {
        quest: {
          id: QUEST_ID,
          title: "Quest",
          description: "",
          status: "active",
          stage: "setup",
          repositoryIds: [REPOSITORY_ID],
          artifactRefs: [],
          createdAt: "2026-07-24T00:02:00.000Z",
          updatedAt: "2026-07-24T00:02:00.000Z",
        },
      },
    }),
    event(4, {
      schemaVersion: 1,
      timestamp: "2026-07-24T00:03:00.000Z",
      kind: "campaign.created",
      aggregate: { type: "campaign", id: CAMPAIGN_ID },
      related: [{ type: "quest", id: QUEST_ID }],
      payload: {
        campaign: {
          id: CAMPAIGN_ID,
          questId: QUEST_ID,
          title: "Campaign",
          status: "draft",
          protocolDigest: "protocol-v1",
          runIds: [],
          createdAt: "2026-07-24T00:03:00.000Z",
          updatedAt: "2026-07-24T00:03:00.000Z",
        },
      },
    }),
    event(5, {
      schemaVersion: 1,
      timestamp: "2026-07-24T00:04:00.000Z",
      kind: "run.created",
      aggregate: { type: "run", id: RUN_ID },
      related: [{ type: "campaign", id: CAMPAIGN_ID }],
      payload: {
        run: {
          id: RUN_ID,
          campaignId: CAMPAIGN_ID,
          title: "Run",
          status: "planned",
          createdAt: "2026-07-24T00:04:00.000Z",
          updatedAt: "2026-07-24T00:04:00.000Z",
        },
      },
    }),
    event(6, {
      schemaVersion: 1,
      timestamp: "2026-07-24T00:05:00.000Z",
      kind: "dispatch.recorded",
      aggregate: { type: "dispatch", id: DISPATCH_ID },
      related: [
        { type: "quest", id: QUEST_ID },
        { type: "campaign", id: CAMPAIGN_ID },
        { type: "run", id: RUN_ID },
        { type: "repository", id: REPOSITORY_ID },
      ],
      payload: {
        dispatch: {
          id: DISPATCH_ID,
          questId: QUEST_ID,
          campaignId: CAMPAIGN_ID,
          runId: RUN_ID,
          repositoryId: REPOSITORY_ID,
          ownerSkill: "vendor.legacy/research-runner@2024-09",
          provider: "host-adapter:custom/v3",
          objective: "Run the bounded procedure",
          acceptanceCriteria: [],
          context: [],
          allowedWritePaths: ["results/output.json"],
          expectedOutputs: [],
          checks: [],
          taskRef: "tasks/archive/2024-09/legacy-dispatch",
          createdAt: "2026-07-24T00:05:00.000Z",
        },
      },
    }),
  ];
}

function activationEvent(
  seq = 7,
  overrides: Record<string, unknown> = {},
): ResearchEvent {
  const activation = {
    id: ACTIVATION_ID,
    dispatchId: DISPATCH_ID,
    questId: QUEST_ID,
    capabilityId: "research.setup.case",
    mode: "automatic",
    procedure: {
      id: "procedure.setup",
      version: "1.0.0",
      digest: DIGEST_A,
    },
    policyDigest: DIGEST_B,
    requestDigest: DIGEST_C,
    scopeHash: DIGEST_D,
    maxDurationMinutes: 15,
    maxDispatches: 1,
    createdAt: "2026-07-24T00:06:00.000Z",
    ...overrides,
  };
  return event(seq, {
    schemaVersion: 2,
    timestamp: activation.createdAt as string,
    kind: "activation.planned",
    aggregate: { type: "activation", id: activation.id as string },
    related: [
      { type: "dispatch", id: activation.dispatchId as string },
      { type: "quest", id: activation.questId as string },
    ],
    payload: { activation },
  });
}

function approvalEvent(
  seq = 8,
  options: {
    id?: string;
    timestamp?: string;
    host?: "claude" | "codex";
    overrides?: Record<string, unknown>;
  } = {},
): ResearchEvent {
  const grantedAt = options.timestamp ?? "2026-07-24T00:07:00.000Z";
  const expiresAt = new Date(Date.parse(grantedAt) + 15 * 60_000).toISOString();
  const approval = {
    id: options.id ?? APPROVAL_ID,
    activationId: ACTIVATION_ID,
    dispatchId: DISPATCH_ID,
    host: options.host ?? "claude",
    mode: "automatic",
    approverLabel: "trellis-policy-v1",
    rationale: "Eligible under immutable registry and project policy.",
    requestDigest: DIGEST_C,
    procedureDigest: DIGEST_A,
    policyDigest: DIGEST_B,
    scopeHash: DIGEST_D,
    grantedAt,
    expiresAt,
    ...options.overrides,
  };
  return event(seq, {
    schemaVersion: 2,
    timestamp: grantedAt,
    kind: "approval.granted",
    aggregate: { type: "approval", id: approval.id as string },
    related: [
      { type: "activation", id: ACTIVATION_ID },
      { type: "dispatch", id: DISPATCH_ID },
      { type: "quest", id: QUEST_ID },
    ],
    payload: { approval },
  });
}

function resultProposalEvents(
  firstSeq: number,
  timestamp: string,
  options: { proposalIdempotencyKey?: string } = {},
): [ResearchEvent, ResearchEvent] {
  const idempotencyKey = "record-result";
  return [
    event(firstSeq, {
      schemaVersion: 1,
      timestamp,
      kind: "result.recorded",
      aggregate: { type: "result", id: RESULT_ID },
      related: [
        { type: "dispatch", id: DISPATCH_ID },
        { type: "run", id: RUN_ID },
      ],
      payload: {
        result: {
          id: RESULT_ID,
          dispatchId: DISPATCH_ID,
          runId: RUN_ID,
          status: "completed",
          summary: "Complete",
          commands: [],
          checks: [],
          artifactRefs: [],
          blockers: [],
          createdAt: timestamp,
        },
      },
      idempotencyKey,
    }),
    event(firstSeq + 1, {
      schemaVersion: 1,
      timestamp,
      kind: "proposal.recorded",
      aggregate: { type: "proposal", id: PROPOSAL_ID },
      related: [
        { type: "dispatch", id: DISPATCH_ID },
        { type: "quest", id: QUEST_ID },
      ],
      payload: {
        proposal: {
          id: PROPOSAL_ID,
          dispatchId: DISPATCH_ID,
          questId: QUEST_ID,
          title: "No canonical changes",
          operations: [],
          status: "pending",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
      idempotencyKey: options.proposalIdempotencyKey ?? idempotencyKey,
    }),
  ];
}

function consumptionEvent(seq: number, timestamp: string): ResearchEvent {
  return event(seq, {
    schemaVersion: 2,
    timestamp,
    kind: "approval.consumed",
    aggregate: { type: "approval", id: APPROVAL_ID },
    related: [
      { type: "activation", id: ACTIVATION_ID },
      { type: "dispatch", id: DISPATCH_ID },
      { type: "result", id: RESULT_ID },
      { type: "proposal", id: PROPOSAL_ID },
    ],
    payload: {
      approvalId: APPROVAL_ID,
      resultId: RESULT_ID,
      proposalId: PROPOSAL_ID,
      consumedAt: timestamp,
    },
    idempotencyKey: "record-result",
  });
}

function projectionSnapshot(root: string): Map<string, string> {
  const paths = researchPaths(root);
  const snapshot = new Map<string, string>();
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full !== paths.eventsFile) {
        snapshot.set(
          path.relative(paths.researchDir, full).split(path.sep).join("/"),
          fs.readFileSync(full, "utf-8"),
        );
      }
    }
  };
  walk(paths.researchDir);
  return snapshot;
}

describe("activation and approval schemas", () => {
  it("creates and parses strict activation and approval IDs", () => {
    expect(createActivationId()).toMatch(/^act_[0-9a-f-]{36}$/);
    expect(createApprovalId()).toMatch(/^apr_[0-9a-f-]{36}$/);
    expect(activationIdSchema.parse(ACTIVATION_ID)).toBe(ACTIVATION_ID);
    expect(approvalIdSchema.parse(APPROVAL_ID)).toBe(APPROVAL_ID);
    expect(() => activationIdSchema.parse(APPROVAL_ID)).toThrow(/act_/);
    expect(() => approvalIdSchema.parse("apr_NOT-A-UUID")).toThrow(/apr_/);
  });

  it("counts approval text limits by Unicode code point", () => {
    const grant = approvalEvent().payload.approval as Record<string, unknown>;
    expect(
      researchApprovalGrantSchema.parse({
        ...grant,
        approverLabel: "😀".repeat(128),
        rationale: "界".repeat(1_024),
      }).approverLabel,
    ).toBe("😀".repeat(128));
    expect(() =>
      researchApprovalGrantSchema.parse({
        ...grant,
        approverLabel: "😀".repeat(129),
      }),
    ).toThrow(/Unicode code points/);
  });

  it("rejects unknown keys, malformed bindings, timestamps, and terminal shapes", () => {
    const activation = (
      activationEvent().payload.activation as Record<string, unknown>
    );
    expect(researchActivationSchema.parse(activation).id).toBe(ACTIVATION_ID);
    expect(() =>
      researchActivationSchema.parse({ ...activation, requestDigest: DIGEST_C.toUpperCase() }),
    ).toThrow(/lowercase/);
    expect(() =>
      researchActivationSchema.parse({ ...activation, maxDispatches: 0 }),
    ).toThrow(/positive integer/);
    expect(() =>
      researchActivationSchema.parse({ ...activation, unknown: true }),
    ).toThrow(/not supported/);
    expect(() =>
      researchActivationSchema.parse({
        ...activation,
        createdAt: "+010000-01-01T00:00:00.000Z",
      }),
    ).toThrow(/canonical RFC3339/);

    const grant = approvalEvent().payload.approval as Record<string, unknown>;
    expect(researchApprovalGrantSchema.parse(grant).id).toBe(APPROVAL_ID);
    expect(() =>
      researchApprovalGrantSchema.parse({
        ...grant,
        grantedAt: "2026-07-24T00:07:00Z",
      }),
    ).toThrow(/timestamp/);
    expect(() =>
      researchApprovalGrantSchema.parse({
        ...grant,
        expiresAt: "+010000-01-01T00:00:00.000Z",
      }),
    ).toThrow(/canonical RFC3339/);
    expect(() =>
      researchApprovalStateSchema.parse({
        grant,
        status: "granted",
        revokedAt: "2026-07-24T00:08:00.000Z",
      }),
    ).toThrow(/not supported/);
    expect(
      researchApprovalStateSchema.parse({
        grant,
        status: "consumed",
        consumedAt: "2026-07-24T00:08:00.000Z",
        resultId: RESULT_ID,
        proposalId: PROPOSAL_ID,
      }).status,
    ).toBe("consumed");
  });
});

describe("mixed schema-v1/schema-v2 event parsing", () => {
  it("round-trips a mixed ledger without changing v1 envelopes", () => {
    const events = [...setupEvents(), activationEvent(), approvalEvent()];
    const serialized = serializeResearchEvents(events);
    expect(serialized.endsWith("\n")).toBe(true);
    expect(parseResearchLedger(serialized)).toEqual(events);
    expect(events.slice(0, 6).every((entry) => entry.schemaVersion === 1)).toBe(
      true,
    );
    expect(events.slice(6).every((entry) => entry.schemaVersion === 2)).toBe(true);
  });

  it("keeps legacy v1 ISO timestamp acceptance separate from strict v2", () => {
    const expandedYear = JSON.parse(JSON.stringify(setupEvents()[0])) as {
      timestamp: string;
      payload: { workspace: { createdAt: string; updatedAt: string } };
    };
    expandedYear.timestamp = "+010000-01-01T00:00:00.000Z";
    expandedYear.payload.workspace.createdAt = expandedYear.timestamp;
    expandedYear.payload.workspace.updatedAt = expandedYear.timestamp;

    expect(parseResearchEvent(expandedYear).timestamp).toBe(expandedYear.timestamp);
  });

  it("rejects kind/version mismatches and strict v2 shape drift", () => {
    const activation = JSON.parse(JSON.stringify(activationEvent())) as Record<
      string,
      unknown
    >;
    activation.schemaVersion = 1;
    expect(() => parseResearchEvent(activation)).toThrow(/schema-v1.*kind/);

    const workspace = JSON.parse(JSON.stringify(setupEvents()[0])) as Record<
      string,
      unknown
    >;
    workspace.schemaVersion = 2;
    expect(() => parseResearchEvent(workspace)).toThrow(/schema-v2.*kind/);

    const unknownVersion = { ...activation, schemaVersion: 3 };
    expect(() => parseResearchEvent(unknownVersion)).toThrow(/one of: 1, 2/);

    const expandedYear = JSON.parse(JSON.stringify(activationEvent())) as Record<
      string,
      unknown
    >;
    expandedYear.timestamp = "+010000-01-01T00:00:00.000Z";
    expect(() => parseResearchEvent(expandedYear)).toThrow(/canonical RFC3339/);

    const extraPayload = JSON.parse(JSON.stringify(approvalEvent())) as {
      payload: Record<string, unknown>;
    };
    extraPayload.payload.extra = true;
    expect(() => parseResearchEvent(extraPayload)).toThrow(/not supported/);
  });

  it("rejects invalid aggregate types and reordered or mismatched related refs", () => {
    const reordered = JSON.parse(JSON.stringify(activationEvent())) as {
      related: { type: string; id: string }[];
    };
    reordered.related.reverse();
    expect(() => parseResearchEvent(reordered)).toThrow(/related\[0\]/);

    const wrongAggregate = JSON.parse(JSON.stringify(approvalEvent())) as {
      aggregate: { type: string; id: string };
    };
    wrongAggregate.aggregate = { type: "workspace", id: WORKSPACE_ID };
    expect(() => parseResearchEvent(wrongAggregate)).toThrow(
      /aggregate must be approval/,
    );

    const v1CrossVersionAggregate = JSON.parse(
      JSON.stringify(setupEvents()[0]),
    ) as { aggregate: { type: string; id: string } };
    v1CrossVersionAggregate.aggregate = {
      type: "activation",
      id: ACTIVATION_ID,
    };
    expect(() => parseResearchEvent(v1CrossVersionAggregate)).toThrow(
      /aggregate.type/,
    );
  });
});

describe("activation and approval replay", () => {
  it("adds immutable activation and granted approval indexes to reduced state", () => {
    expect(reduceResearchEvents([])).toMatchObject({
      activations: {},
      activationByDispatchId: {},
      approvals: {},
      approvalIdsByActivationId: {},
    });

    const state = reduceResearchEvents([
      ...setupEvents(),
      activationEvent(),
      approvalEvent(),
    ]);
    expect(state.activationByDispatchId).toEqual({
      [DISPATCH_ID]: ACTIVATION_ID,
    });
    expect(state.activations[ACTIVATION_ID]?.procedure.digest).toBe(DIGEST_A);
    expect(state.approvalIdsByActivationId).toEqual({
      [ACTIVATION_ID]: [APPROVAL_ID],
    });
    expect(state.approvals[APPROVAL_ID]).toEqual({
      grant: approvalEvent().payload.approval,
      status: "granted",
    });
  });

  it("rejects duplicate Dispatch activation and mismatched grant bindings", () => {
    const secondActivationId =
      "act_cccccccc-cccc-4ccc-8ccc-cccccccccccc" as const;
    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        activationEvent(),
        activationEvent(8, { id: secondActivationId }),
      ]),
    ).toThrow(/already has an activation/);

    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        activationEvent(),
        approvalEvent(8, { overrides: { requestDigest: DIGEST_D } }),
      ]),
    ).toThrow(/bindings do not match/);

    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        ...resultProposalEvents(7, "2026-07-24T00:08:00.000Z"),
        activationEvent(9, { createdAt: "2026-07-24T00:09:00.000Z" }),
      ]),
    ).toThrow(/planned too late/);
  });

  it("uses the new grant event timestamp for deterministic expiry replacement", () => {
    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        activationEvent(),
        approvalEvent(),
        approvalEvent(9, {
          id: SECOND_APPROVAL_ID,
          timestamp: "2026-07-24T00:21:59.999Z",
        }),
      ]),
    ).toThrow(/already has a granted claude approval/);

    const state = reduceResearchEvents([
      ...setupEvents(),
      activationEvent(),
      approvalEvent(),
      approvalEvent(9, {
        id: SECOND_APPROVAL_ID,
        timestamp: "2026-07-24T00:22:00.000Z",
      }),
    ]);
    expect(state.approvalIdsByActivationId[ACTIVATION_ID]).toEqual([
      APPROVAL_ID,
      SECOND_APPROVAL_ID,
    ]);
  });

  it("stores revocation as a terminal transition", () => {
    const revoked = event(9, {
      schemaVersion: 2,
      timestamp: "2026-07-24T00:08:00.000Z",
      kind: "approval.revoked",
      aggregate: { type: "approval", id: APPROVAL_ID },
      related: [
        { type: "activation", id: ACTIVATION_ID },
        { type: "dispatch", id: DISPATCH_ID },
      ],
      payload: {
        approvalId: APPROVAL_ID,
        revokedAt: "2026-07-24T00:08:00.000Z",
        reason: "Operator withdrew authority.",
      },
    });
    const state = reduceResearchEvents([
      ...setupEvents(),
      activationEvent(),
      approvalEvent(),
      revoked,
    ]);
    expect(state.approvals[APPROVAL_ID]).toMatchObject({
      status: "revoked",
      revokedAt: "2026-07-24T00:08:00.000Z",
      revocationReason: "Operator withdrew authority.",
    });

    const secondRevocation = event(10, {
      schemaVersion: 2,
      timestamp: "2026-07-24T00:09:00.000Z",
      kind: "approval.revoked",
      aggregate: { type: "approval", id: APPROVAL_ID },
      related: [
        { type: "activation", id: ACTIVATION_ID },
        { type: "dispatch", id: DISPATCH_ID },
      ],
      payload: {
        approvalId: APPROVAL_ID,
        revokedAt: "2026-07-24T00:09:00.000Z",
        reason: "Duplicate revocation.",
      },
    });
    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        activationEvent(),
        approvalEvent(),
        revoked,
        secondRevocation,
      ]),
    ).toThrow(/revoked -> revoked/);
  });

  it("consumes only an unexpired approval after the exact matching v1 pair", () => {
    const timestamp = "2026-07-24T00:08:00.000Z";
    const pair = resultProposalEvents(9, timestamp);
    const state = reduceResearchEvents([
      ...setupEvents(),
      activationEvent(),
      approvalEvent(),
      ...pair,
      consumptionEvent(11, timestamp),
    ]);
    expect(state.approvals[APPROVAL_ID]).toMatchObject({
      status: "consumed",
      consumedAt: timestamp,
      resultId: RESULT_ID,
      proposalId: PROPOSAL_ID,
    });

    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        activationEvent(),
        approvalEvent(),
        consumptionEvent(9, timestamp),
      ]),
    ).toThrow(/immediately follow matching Result and Proposal/);

    const [resultEvent, proposalEvent] = resultProposalEvents(9, timestamp);
    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        activationEvent(),
        approvalEvent(),
        { ...proposalEvent, seq: 9, eventId: eventId(9) },
        { ...resultEvent, seq: 10, eventId: eventId(10) },
        consumptionEvent(11, timestamp),
      ]),
    ).toThrow(/immediately follow matching Result and Proposal/);

    const foreignRelation = JSON.parse(
      JSON.stringify(consumptionEvent(11, timestamp)),
    ) as { related: { type: string; id: string }[] };
    foreignRelation.related[2] = {
      type: "result",
      id: "res_cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    };
    expect(() => parseResearchEvent(foreignRelation)).toThrow(/related\[2\]/);

    const mismatchedPair = resultProposalEvents(9, timestamp, {
      proposalIdempotencyKey: "different-key",
    });
    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        activationEvent(),
        approvalEvent(),
        ...mismatchedPair,
        consumptionEvent(11, timestamp),
      ]),
    ).toThrow(/share timestamp, actor, provenance, and idempotency key/);

    const expiryTimestamp = "2026-07-24T00:22:00.000Z";
    expect(() =>
      reduceResearchEvents([
        ...setupEvents(),
        activationEvent(),
        approvalEvent(),
        ...resultProposalEvents(9, expiryTimestamp),
        consumptionEvent(11, expiryTimestamp),
      ]),
    ).toThrow(/expired/);
  });
});

describe("mixed ledger store compatibility", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function tempRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-c02-mixed-"));
    roots.push(root);
    const paths = researchPaths(root);
    fs.mkdirSync(paths.researchDir, { recursive: true });
    return root;
  }

  it("records Result, Proposal, and approval consumption after activation", async () => {
    const root = tempRoot();
    const initial = [...setupEvents(), activationEvent(), approvalEvent()];
    fs.writeFileSync(
      researchPaths(root).eventsFile,
      serializeResearchEvents(initial),
      "utf-8",
    );
    const timestamp = "2026-07-24T00:08:00.000Z";

    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "record-result",
      timestamp,
      mutations: [
        {
          kind: "result.record",
          result: {
            id: RESULT_ID,
            dispatchId: DISPATCH_ID,
            runId: RUN_ID,
            status: "completed",
            summary: "Complete",
            commands: [],
            checks: [],
            artifactRefs: [],
            blockers: [],
            createdAt: timestamp,
          },
        },
        {
          kind: "proposal.record",
          proposal: {
            id: PROPOSAL_ID,
            dispatchId: DISPATCH_ID,
            questId: QUEST_ID,
            title: "No canonical changes",
            operations: [],
            status: "pending",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        },
        {
          kind: "approval.consume",
          approvalId: APPROVAL_ID,
          resultId: RESULT_ID,
          proposalId: PROPOSAL_ID,
        },
      ],
    });

    const ledger = await readResearchLedger(root);
    expect(ledger.map(({ schemaVersion, kind }) => ({ schemaVersion, kind })).slice(-3)).toEqual([
      { schemaVersion: 1, kind: "result.recorded" },
      { schemaVersion: 1, kind: "proposal.recorded" },
      { schemaVersion: 2, kind: "approval.consumed" },
    ]);
    expect((await readResearchState(root)).approvals[APPROVAL_ID]).toMatchObject({
      status: "consumed",
      resultId: RESULT_ID,
      proposalId: PROPOSAL_ID,
    });
  });

  it("advances existing projection watermarks without changing projection data", async () => {
    const root = tempRoot();
    const paths = researchPaths(root);
    fs.writeFileSync(paths.eventsFile, serializeResearchEvents(setupEvents()), "utf-8");
    await rebuildResearchProjections(root);
    const before = projectionSnapshot(root);

    fs.writeFileSync(
      paths.eventsFile,
      serializeResearchEvents([
        ...setupEvents(),
        activationEvent(),
        approvalEvent(),
      ]),
      "utf-8",
    );
    await rebuildResearchProjections(root);
    const first = projectionSnapshot(root);
    expect([...first.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [relative, content] of first) {
      const previous = JSON.parse(before.get(relative) ?? "null") as Record<
        string,
        unknown
      >;
      const current = JSON.parse(content) as Record<string, unknown>;
      expect(current.schemaVersion, relative).toBe(previous.schemaVersion);
      expect(current.updatedAt, relative).toBe(previous.updatedAt);
      expect(current.data, relative).toEqual(previous.data);
      expect(current.projectedThroughSeq, relative).toBe(8);
    }

    await rebuildResearchProjections(root);
    expect(projectionSnapshot(root)).toEqual(first);
    expect(fs.existsSync(path.join(paths.researchDir, "activations"))).toBe(false);
    expect(fs.existsSync(path.join(paths.researchDir, "approvals"))).toBe(false);
  });
});

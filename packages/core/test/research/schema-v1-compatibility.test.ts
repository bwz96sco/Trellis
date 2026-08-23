import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  parseResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  reduceResearchEvents,
  researchPaths,
  serializeResearchEvents,
} from "../../src/research/index.js";

const FIXTURE_ROOT = fileURLToPath(
  new URL("./fixtures/schema-v1-complete/", import.meta.url),
);
const LEDGER_FILE = path.join(FIXTURE_ROOT, "events.jsonl");
const EXPECTED_STATE_FILE = path.join(FIXTURE_ROOT, "expected-state.json");
const EXPECTED_PROJECTIONS_ROOT = path.join(
  FIXTURE_ROOT,
  "expected-projections",
);

function fixtureText(file: string): string {
  return fs.readFileSync(file, "utf-8");
}

function projectionFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(path.relative(root, full).split(path.sep).join("/"));
    }
  };
  walk(root);
  return files.sort();
}

describe("schema-v1 golden research compatibility", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-schema-v1-golden-"));
    const paths = researchPaths(root);
    fs.mkdirSync(paths.researchDir, { recursive: true });
    fs.copyFileSync(LEDGER_FILE, paths.eventsFile);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("strict-parses and replays the complete fixed ledger", async () => {
    const ledgerText = fixtureText(LEDGER_FILE);
    const events = parseResearchLedger(ledgerText, "schema-v1 golden ledger");

    expect(events.map(({ kind, aggregate }) => ({ kind, aggregate }))).toEqual([
      {
        kind: "workspace.created",
        aggregate: {
          type: "workspace",
          id: "wsp_11111111-1111-4111-8111-111111111111",
        },
      },
      {
        kind: "repository.registered",
        aggregate: {
          type: "repository",
          id: "rep_22222222-2222-4222-8222-222222222222",
        },
      },
      {
        kind: "artifact.registered",
        aggregate: {
          type: "artifact",
          id: "art_33333333-3333-4333-8333-333333333333",
        },
      },
      {
        kind: "quest.created",
        aggregate: {
          type: "quest",
          id: "qst_44444444-4444-4444-8444-444444444444",
        },
      },
      {
        kind: "campaign.created",
        aggregate: {
          type: "campaign",
          id: "cmp_55555555-5555-4555-8555-555555555555",
        },
      },
      {
        kind: "run.created",
        aggregate: {
          type: "run",
          id: "run_66666666-6666-4666-8666-666666666666",
        },
      },
      {
        kind: "dispatch.recorded",
        aggregate: {
          type: "dispatch",
          id: "dsp_77777777-7777-4777-8777-777777777777",
        },
      },
      {
        kind: "result.recorded",
        aggregate: {
          type: "result",
          id: "res_88888888-8888-4888-8888-888888888888",
        },
      },
      {
        kind: "proposal.recorded",
        aggregate: {
          type: "proposal",
          id: "prp_99999999-9999-4999-8999-999999999999",
        },
      },
      {
        kind: "quest.stage_changed",
        aggregate: {
          type: "quest",
          id: "qst_44444444-4444-4444-8444-444444444444",
        },
      },
      {
        kind: "decision.recorded",
        aggregate: {
          type: "decision",
          id: "dec_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
      },
      {
        kind: "evidence.created",
        aggregate: {
          type: "evidence",
          id: "evd_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      },
      {
        kind: "claim.created",
        aggregate: {
          type: "claim",
          id: "clm_cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        },
      },
    ]);
    expect(serializeResearchEvents(events)).toBe(ledgerText);

    const expectedState = JSON.parse(fixtureText(EXPECTED_STATE_FILE));
    const reducedState = reduceResearchEvents(events);
    const {
      activations,
      activationByDispatchId,
      approvals,
      approvalIdsByActivationId,
      workflowInstances,
      workflowInstanceIdsByQuestId,
      activeWorkflowByQuestId,
      scientificGateRecords,
      scientificGateRecordIdsByWorkflowInstanceId,
      effectiveScientificGateRecordIdByScope,
      ...schemaV1State
    } = reducedState;
    expect(schemaV1State).toEqual(expectedState);
    expect({
      activations,
      activationByDispatchId,
      approvals,
      approvalIdsByActivationId,
      workflowInstances,
      workflowInstanceIdsByQuestId,
      activeWorkflowByQuestId,
      scientificGateRecords,
      scientificGateRecordIdsByWorkflowInstanceId,
      effectiveScientificGateRecordIdByScope,
    }).toEqual({
      activations: {},
      activationByDispatchId: {},
      approvals: {},
      approvalIdsByActivationId: {},
      workflowInstances: {},
      workflowInstanceIdsByQuestId: {},
      activeWorkflowByQuestId: {},
      scientificGateRecords: {},
      scientificGateRecordIdsByWorkflowInstanceId: {},
      effectiveScientificGateRecordIdByScope: {},
    });

    const {
      activations: readActivations,
      activationByDispatchId: readActivationByDispatchId,
      approvals: readApprovals,
      approvalIdsByActivationId: readApprovalIdsByActivationId,
      workflowInstances: readWorkflowInstances,
      workflowInstanceIdsByQuestId: readWorkflowInstanceIdsByQuestId,
      activeWorkflowByQuestId: readActiveWorkflowByQuestId,
      scientificGateRecords: readScientificGateRecords,
      scientificGateRecordIdsByWorkflowInstanceId:
        readScientificGateRecordIdsByWorkflowInstanceId,
      effectiveScientificGateRecordIdByScope:
        readEffectiveScientificGateRecordIdByScope,
      ...readSchemaV1State
    } = await readResearchState(root);
    expect(readSchemaV1State).toEqual(expectedState);
    expect({
      readActivations,
      readActivationByDispatchId,
      readApprovals,
      readApprovalIdsByActivationId,
      readWorkflowInstances,
      readWorkflowInstanceIdsByQuestId,
      readActiveWorkflowByQuestId,
      readScientificGateRecords,
      readScientificGateRecordIdsByWorkflowInstanceId,
      readEffectiveScientificGateRecordIdByScope,
    }).toEqual({
      readActivations: {},
      readActivationByDispatchId: {},
      readApprovals: {},
      readApprovalIdsByActivationId: {},
      readWorkflowInstances: {},
      readWorkflowInstanceIdsByQuestId: {},
      readActiveWorkflowByQuestId: {},
      readScientificGateRecords: {},
      readScientificGateRecordIdsByWorkflowInstanceId: {},
      readEffectiveScientificGateRecordIdByScope: {},
    });

    const dispatch =
      reducedState.dispatches["dsp_77777777-7777-4777-8777-777777777777"];
    expect(dispatch).toMatchObject({
      ownerSkill: "trellis-research-runner",
      taskRef: "tasks/07-18-golden-research",
    });
  });

  it("rebuilds byte-stable tracked projections from the canonical ledger", async () => {
    await rebuildResearchProjections(root);
    const paths = researchPaths(root);
    const expectedFiles = projectionFiles(EXPECTED_PROJECTIONS_ROOT);
    const first = new Map<string, string>();

    expect(expectedFiles).toEqual([
      "campaigns/cmp_55555555-5555-4555-8555-555555555555/campaign.json",
      "claims/clm_cccccccc-cccc-4ccc-8ccc-cccccccccccc/claim.json",
      "evidence/evd_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/evidence.json",
      "quests/qst_44444444-4444-4444-8444-444444444444/quest.json",
      "repositories.json",
      "runs/run_66666666-6666-4666-8666-666666666666/run.json",
      "workspace.json",
    ]);
    expect(projectionFiles(paths.researchDir)).toEqual([
      ...expectedFiles.slice(0, 2),
      "events.jsonl",
      ...expectedFiles.slice(2),
    ]);
    for (const relative of expectedFiles) {
      const actual = fixtureText(path.join(paths.researchDir, relative));
      expect(actual, relative).toBe(
        fixtureText(path.join(EXPECTED_PROJECTIONS_ROOT, relative)),
      );
      first.set(relative, actual);
    }

    const runProjection = JSON.parse(
      fixtureText(
        path.join(
          paths.runsDir,
          "run_66666666-6666-4666-8666-666666666666",
          "run.json",
        ),
      ),
    );
    expect(runProjection.data.dispatchId).toBe(
      "dsp_77777777-7777-4777-8777-777777777777",
    );
    expect(fs.existsSync(path.join(paths.researchDir, "dispatches"))).toBe(
      false,
    );

    await rebuildResearchProjections(root);
    for (const [relative, expected] of first) {
      expect(
        fixtureText(path.join(paths.researchDir, relative)),
        relative,
      ).toBe(expected);
    }
  });

  it("keeps malformed JSON, sequence gaps, and incompatible schemas strict", () => {
    const lines = fixtureText(LEDGER_FILE).trimEnd().split("\n");

    expect(() =>
      parseResearchLedger(
        `${lines[0]}\n{malformed}\n`,
        "golden-malformed.jsonl",
      ),
    ).toThrow(/golden-malformed\.jsonl line 2: malformed JSON/);

    const gap = JSON.parse(lines[1] ?? "{}") as Record<string, unknown>;
    gap.seq = 3;
    expect(() =>
      parseResearchLedger(
        `${lines[0]}\n${JSON.stringify(gap)}\n`,
        "golden-gap.jsonl",
      ),
    ).toThrow(/golden-gap\.jsonl line 2: expected seq 2, received 3/);

    const incompatible = JSON.parse(lines[0] ?? "{}") as Record<
      string,
      unknown
    >;
    incompatible.schemaVersion = 2;
    expect(() =>
      parseResearchLedger(
        `${JSON.stringify(incompatible)}\n`,
        "golden-schema.jsonl",
      ),
    ).toThrow(/golden-schema\.jsonl line 1: schema-v2 research event\.kind/);
  });
});

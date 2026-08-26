import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildQuestImportPlanV1,
  commitResearchBatch,
  computeQuestMappedStateDigest,
  createArtifactId,
  createEventId,
  createValidatedQuestExportReceipt,
  createQuestExportRecordId,
  createQuestImportMilestoneId,
  createQuestImportRecordId,
  createQuestRouteSnapshotId,
  createQuestScientificUniverseId,
  createQuestWriterTransferId,
  createQuestId,
  createRepositoryId,
  createScientificGateRecordId,
  createWorkflowInstanceId,
  createWorkspaceId,
  FROZEN_C1_GATE_VALIDATOR_DIGEST,
  parseResearchEvent,
  parseResearchWorkflowDefinitionV1,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
  researchPaths,
  reduceResearchEvents,
  type ArtifactId,
  type QuestId,
  type ResearchMutation,
} from "../../src/research/index.js";

const ACTOR = { type: "agent" as const, id: "test" };
const PROVENANCE = { source: "test" };
const encoder = new TextEncoder();
const identity = {
  id: "research-one",
  version: "1.0.0",
  schemaVersion: 3,
  packageKind: "skill",
  packageDigest: `sha256:${"1".repeat(64)}`,
  instructionDigest: `sha256:${"2".repeat(64)}`,
  memberInventoryDigest: `sha256:${"3".repeat(64)}`,
} as const;
const VALIDATOR_PATH = path.resolve(
  process.cwd(),
  "../../.trellis/tasks/archive/2026-08/08-21-thin-skill-c1-freeze-contracts/research/source-baseline/files/scripts/validate-research-gates.py",
);
const ARTIFACT_BYTES = new Map<string, Buffer>([
  [
    "research/opportunity_board.md",
    Buffer.from(
      "## Opportunity Board\n| ID | Problem |\n| --- | --- |\n| P1 | One |\n",
    ),
  ],
  [
    "research/h1_decision.md",
    Buffer.from(
      "---\ndecision_status: approved\ndecision_recorded_by: human_confirmed\napproved_problem_ids: P1\napproved_bridge_ids: none\n---\n## Human Decision\n\nApproved.\n",
    ),
  ],
  [
    "research/ideas.md",
    Buffer.from(
      "## C1\nOne\n\n## Approved Opportunity Coverage\n| Candidate ID | Approved IDs |\n| --- | --- |\n| C1 | P1 |\n",
    ),
  ],
  [
    "research/h2_decision.md",
    Buffer.from(
      "---\ndecision_status: approved\ndecision_recorded_by: human_confirmed\napproved_candidate_ids: C1\n---\n## Human Decision\n\nApproved.\n",
    ),
  ],
]);

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function workflow() {
  return parseResearchWorkflowDefinitionV1(
    encoder.encode(
      JSON.stringify({
        schemaVersion: 1,
        id: "cutover-flow",
        version: "1.0.0",
        startNodeIds: ["one"],
        nodes: [
          {
            id: "one",
            executionPackage: identity,
            allowedProfiles: ["lightweight"],
            stop: true,
          },
          {
            id: "two",
            executionPackage: { ...identity, id: "research-two" },
            allowedProfiles: ["lightweight"],
            stop: true,
          },
        ],
        transitions: [
          {
            id: "advance",
            fromNodeId: "one",
            toNodeId: "two",
            requiredRefs: [],
            requiredGateIds: ["H1"],
          },
        ],
      }),
    ),
  );
}

describe("Quest cutover store, projections, and scientific universes", () => {
  let root: string;
  let questId: QuestId;
  let artifactId: ArtifactId;
  let opportunityArtifactId: ArtifactId;
  let h1DecisionArtifactId: ArtifactId;
  let h2DecisionArtifactId: ArtifactId;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-quest-cutover-"));
    questId = createQuestId();
    opportunityArtifactId = createArtifactId();
    h1DecisionArtifactId = createArtifactId();
    artifactId = createArtifactId();
    h2DecisionArtifactId = createArtifactId();
    const repositoryId = createRepositoryId();
    for (const [artifactPath, bytes] of ARTIFACT_BYTES) {
      const absolute = path.join(root, "repository", ...artifactPath.split("/"));
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, bytes);
    }
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "setup",
      timestamp: "2026-08-21T00:00:00.000Z",
      mutations: [
        {
          kind: "workspace.create",
          workspace: {
            id: createWorkspaceId(),
            name: "Research",
            description: "",
          },
        },
        {
          kind: "repository.register",
          repository: {
            id: repositoryId,
            name: "Repository",
            kind: "code",
            locator: "repository",
            capabilities: { hasTrellis: false },
          },
        },
        ...[
          [opportunityArtifactId, "research/opportunity_board.md"],
          [h1DecisionArtifactId, "research/h1_decision.md"],
          [artifactId, "research/ideas.md"],
          [h2DecisionArtifactId, "research/h2_decision.md"],
        ].map(([id, artifactPath]) => ({
          kind: "artifact.register" as const,
          artifact: {
            id: id as ArtifactId,
            repositoryId,
            path: artifactPath as string,
            sha256: sha256(ARTIFACT_BYTES.get(artifactPath as string) as Buffer),
          },
        })),
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Imported Quest",
            description: "Exercise mapped export.",
            repositoryIds: [repositoryId],
            artifactRefs: [
              {
                id: opportunityArtifactId,
                repositoryId,
                path: "research/opportunity_board.md",
                sha256: sha256(
                  ARTIFACT_BYTES.get("research/opportunity_board.md") as Buffer,
                ),
              },
              {
                id: h1DecisionArtifactId,
                repositoryId,
                path: "research/h1_decision.md",
                sha256: sha256(
                  ARTIFACT_BYTES.get("research/h1_decision.md") as Buffer,
                ),
              },
              {
                id: artifactId,
                repositoryId,
                path: "research/ideas.md",
                sha256: sha256(
                  ARTIFACT_BYTES.get("research/ideas.md") as Buffer,
                ),
              },
              {
                id: h2DecisionArtifactId,
                repositoryId,
                path: "research/h2_decision.md",
                sha256: sha256(
                  ARTIFACT_BYTES.get("research/h2_decision.md") as Buffer,
                ),
              },
            ],
          },
        },
      ],
    });
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  async function commit(
    idempotencyKey: string,
    timestamp: string,
    mutations: readonly ResearchMutation[],
  ) {
    return commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey,
      timestamp,
      mutations,
    });
  }

  function importBatch(
    snapshotCharacter: string,
    h1Refs: string[],
    includeMilestone = false,
  ) {
    const importRecordId = createQuestImportRecordId();
    const snapshotDigest = `sha256:${snapshotCharacter.repeat(64)}` as const;
    return {
      importRecordId,
      snapshotDigest,
      mutations: [
        {
          kind: "quest.import.record",
          record: {
            id: importRecordId,
            questId,
            sourceIdentity: {
              sourceQuestId: "rq-imported",
              projectSlug: "imported",
              sourceQuestPath: "research-quest.yaml",
              sourceEventsPath: "research-events.jsonl",
            },
            sourceSnapshot: {
              sourceSchemaVersion: "0.2",
              yamlDigest: snapshotDigest,
              eventsDigest: snapshotDigest,
              snapshotDigest,
            },
            sourceStatus: "active",
            sourceActiveStage: "research-project-setup",
            sourceExtensions: {
              trellisQuestImportV1: {
                exactScalars: {
                  title: "Imported Quest",
                  objective: "Exercise mapped export.",
                  status: "active",
                  activeStage: "research-project-setup",
                },
                extensionsByPath: {},
                extensionInventory: [],
                sourceObjects: {
                  authoritativeArtifacts: {
                    opportunities: {
                      path: "research/opportunity_board.md",
                      owner_skill: "research-opportunity-mining",
                    },
                    ideas: {
                      path: "research/ideas.md",
                      owner_skill: "research-ideation",
                    },
                  },
                  legacyEvidence: [],
                },
                artifactIdsByPath: {
                  "research/opportunity_board.md": opportunityArtifactId,
                  "research/h1_decision.md": h1DecisionArtifactId,
                  "research/ideas.md": artifactId,
                  "research/h2_decision.md": h2DecisionArtifactId,
                },
                claimBindings: {},
              },
            },
            artifactIds: [
              opportunityArtifactId,
              h1DecisionArtifactId,
              artifactId,
              h2DecisionArtifactId,
            ],
            claimIds: [],
          },
        },
        {
          kind: "quest.route.set",
          route: {
            id: createQuestRouteSnapshotId(),
            questId,
            importRecordId,
            firstReadArtifactIds: [
              opportunityArtifactId,
              h1DecisionArtifactId,
              artifactId,
              h2DecisionArtifactId,
            ],
            ownerBindings: [
              {
                name: "opportunities",
                ownerSkill: "research-opportunity-mining",
                artifactId: opportunityArtifactId,
              },
              {
                name: "ideas",
                ownerSkill: "research-ideation",
                artifactId,
              },
            ],
            branches: [],
            openQuestions: [],
            blockers: [],
            sourceExtensions: {
              trellisQuestImportV1: {
                authoritativeArtifacts: {
                  opportunities: {
                    path: "research/opportunity_board.md",
                    owner_skill: "research-opportunity-mining",
                  },
                  ideas: {
                    path: "research/ideas.md",
                    owner_skill: "research-ideation",
                  },
                },
                legacyEvidence: [],
                extensionsByPath: {},
              },
            },
          },
        },
        {
          kind: "quest.scientific-universe.record",
          universe: {
            id: createQuestScientificUniverseId(),
            questId,
            importRecordId,
            gateId: "H1",
            refKind: "opportunity",
            refs: h1Refs,
            sourceArtifactIds: [opportunityArtifactId],
            sourceSnapshotDigest: snapshotDigest,
          },
        },
        {
          kind: "quest.scientific-universe.record",
          universe: {
            id: createQuestScientificUniverseId(),
            questId,
            importRecordId,
            gateId: "H2",
            refKind: "candidate",
            refs: ["C1"],
            sourceArtifactIds: [artifactId],
            sourceSnapshotDigest: snapshotDigest,
          },
        },
        ...(includeMilestone
          ? [
              {
                kind: "quest.import.milestone" as const,
                milestone: {
                  id: createQuestImportMilestoneId(),
                  questId,
                  importRecordId,
                  sourceEventId: "source-event-1",
                  sourceLine: 1,
                  reviewed: true as const,
                  timestamp: "2026-08-20T00:00:00.000Z",
                  actor: "source-operator",
                  eventType: "route_changed",
                  milestone: "Source milestone preserved",
                  summary: "Source milestone preserved",
                  artifactIds: [artifactId],
                  evidenceArtifactIds: [artifactId],
                  claimIds: [],
                  sourcePayload: {
                    event_id: "source-event-1",
                    timestamp: "2026-08-20T00:00:00.000Z",
                    actor: "source-operator",
                    event_type: "route_changed",
                    milestone: true,
                    summary: "Source milestone preserved",
                    artifacts: [
                      {
                        path: "research/ideas.md",
                        owner_skill: "research-ideation",
                      },
                    ],
                    evidence: [
                      { path: "research/ideas.md", role: "candidate_set" },
                    ],
                    claim_updates: [],
                  },
                  sourceExtensions: {},
                },
              },
            ]
          : []),
        {
          kind: "quest-writer.transfer",
          transfer: {
            id: createQuestWriterTransferId(),
            questId,
            from: "source",
            to: "trellis",
            sourceSnapshotDigest: snapshotDigest,
            actor: "operator",
            rationale: "Exact import accepted",
          },
        },
      ] satisfies ResearchMutation[],
    };
  }

  async function validatedExport(
    snapshotDigest: `sha256:${string}`,
    exportRecordId = createQuestExportRecordId(),
  ) {
    const state = await readResearchState(root);
    const importRecordId = state.latestQuestImportRecordIdByQuestId[questId];
    const milestones = Object.values(state.questImportMilestones)
      .filter((milestone) => milestone.importRecordId === importRecordId)
      .sort((left, right) => left.sourceLine - right.sourceLine);
    const files = new Map<string, Buffer>(ARTIFACT_BYTES);
    files.set(
      "research-quest.yaml",
      Buffer.from(
        JSON.stringify({
          schema_version: "0.2",
          quest_id: "rq-imported",
          project_slug: "imported",
          title: "Imported Quest",
          objective: "Exercise mapped export.",
          status: "active",
          active_stage: "research-project-setup",
          first_read: [
            "research/opportunity_board.md",
            "research/h1_decision.md",
            "research/ideas.md",
            "research/h2_decision.md",
          ],
          authoritative_artifacts: {
            opportunities: {
              path: "research/opportunity_board.md",
              owner_skill: "research-opportunity-mining",
            },
            ideas: {
              path: "research/ideas.md",
              owner_skill: "research-ideation",
            },
          },
          branches: [],
          claims: [],
          open_questions: [],
          blockers: [],
        }),
      ),
    );
    files.set(
      "research-events.jsonl",
      Buffer.from(
        milestones.length === 0
          ? ""
          : `${milestones
              .map((milestone) => JSON.stringify(milestone.sourcePayload))
              .join("\n")}\n`,
      ),
    );
    files.set(
      "research-export-loss.json",
      Buffer.from(
        `${JSON.stringify({
          artifactInventory: [...ARTIFACT_BYTES]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([artifactPath, bytes]) => ({
              path: artifactPath,
              digest: `sha256:${sha256(bytes)}`,
              bytes: bytes.length,
            })),
          blockingLosses: [],
        })}\n`,
      ),
    );
    files.set(
      "research-export-loss.md",
      Buffer.from("# Export Loss Report\n\nNo blocking loss.\n"),
    );
    const outputRoot = fs.mkdtempSync(path.join(root, "validated-export-"));
    for (const [filePath, bytes] of files) {
      const absolute = path.join(outputRoot, ...filePath.split("/"));
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, bytes);
    }
    return {
      ...createValidatedQuestExportReceipt({
        state,
        questId,
        exportRecordId,
        sourceSnapshotDigest: snapshotDigest,
        outputRoot,
        files,
        validatorPath: VALIDATOR_PATH,
      }),
      files,
      outputRoot,
    };
  }

  it("stores typed C4b events and rebuilds deterministic conditional projections", async () => {
    const imported = importBatch("a", ["P1", "P2"], true);
    const importKey = `research-quest-import:qip_${"A".repeat(43)}`;
    const committed = await commit(
      importKey,
      "2026-08-21T00:01:00.000Z",
      imported.mutations,
    );
    expect(committed.events.map((event) => event.kind)).toEqual([
      "quest.import.recorded",
      "quest.route.recorded",
      "quest.scientific-universe.recorded",
      "quest.scientific-universe.recorded",
      "quest.import.milestone-recorded",
      "quest-writer.transferred",
    ]);
    expect(
      await commit(
        importKey,
        "2026-08-21T00:01:00.000Z",
        imported.mutations,
      ),
    ).toMatchObject({ replayed: true });
    const partialMutation = imported.mutations[0];
    if (partialMutation === undefined) throw new Error("Missing import mutation");
    await expect(
      commit(importKey, "2026-08-21T00:01:00.000Z", [partialMutation]),
    ).rejects.toThrow(/IDEMPOTENCY_KEY_CONFLICT/);
    await expect(
      commit(importKey, "2026-08-21T00:01:00.000Z", [
        { kind: "quest.stage", questId, stage: "writing" },
      ]),
    ).rejects.toThrow(/IDEMPOTENCY_KEY_CONFLICT/);
    const relationDrift = structuredClone(committed.events[0]);
    if (relationDrift === undefined) throw new Error("Missing import event");
    relationDrift.related = [];
    expect(() => parseResearchEvent(relationDrift)).toThrow(/related/);
    expect(() =>
      parseResearchEvent({ ...committed.events[0], schemaVersion: 1 }),
    ).toThrow(/schema-v1 research event.kind/);
    expect(() =>
      parseResearchEvent({ ...committed.events[0], schemaVersion: 2 }),
    ).toThrow(/schema-v2 research event.kind/);
    const driftedLedger = structuredClone(await readResearchLedger(root));
    const driftedImport = driftedLedger.find(
      (event) => event.kind === "quest.import.recorded",
    );
    if (driftedImport === undefined) throw new Error("Missing ledger import event");
    driftedImport.related = [];
    expect(() => reduceResearchEvents(driftedLedger)).toThrow(/related/);

    const state = await readResearchState(root);
    expect(state.latestQuestImportRecordIdByQuestId[questId]).toBe(
      imported.importRecordId,
    );
    expect(state.questWriterAuthorityByQuestId[questId]).toMatchObject({
      writer: "trellis",
      sourceSnapshotDigest: imported.snapshotDigest,
    });

    const questDirectory = path.join(
      root,
      ".trellis",
      "research",
      "quests",
      questId,
    );
    const projectedFiles = [
      "import.json",
      "route.json",
      "scientific-universes.json",
      "milestones.json",
      "writer.json",
    ];
    for (const file of projectedFiles) {
      expect(fs.existsSync(path.join(questDirectory, file))).toBe(true);
    }
    expect(fs.existsSync(path.join(questDirectory, "exports.json"))).toBe(false);

    const before = new Map(
      projectedFiles.map((file) => [
        file,
        fs.readFileSync(path.join(questDirectory, file), "utf8"),
      ]),
    );
    await rebuildResearchProjections(root);
    for (const [file, bytes] of before) {
      expect(fs.readFileSync(path.join(questDirectory, file), "utf8")).toBe(
        bytes,
      );
    }
  });

  it("commits a complete planner batch and replays without source Artifact reads", async () => {
    const before = await readResearchState(root);
    const repository = Object.values(before.repositories)[0];
    if (repository === undefined) throw new Error("Missing setup Repository");
    const repositoryRoot = path.join(root, repository.locator);
    const opportunityBytes = encoder.encode(
      "## Opportunity Board\n| ID | Problem |\n| --- | --- |\n| P1 | One |",
    );
    const ideasBytes = encoder.encode(
      "## C1\nOne\n\n## Approved Opportunity Coverage\n| Candidate ID | Approved IDs |\n| --- | --- |\n| C1 | P1 |",
    );
    const h1DecisionBytes = encoder.encode("# H1 Decision\n\nP1 approved.");
    const h2DecisionBytes = encoder.encode("# H2 Decision\n\nC1 selected.");
    fs.mkdirSync(path.join(repositoryRoot, "import"), { recursive: true });
    fs.writeFileSync(
      path.join(repositoryRoot, "import", "opportunity_board.md"),
      opportunityBytes,
    );
    fs.writeFileSync(path.join(repositoryRoot, "import", "ideas.md"), ideasBytes);
    fs.writeFileSync(
      path.join(repositoryRoot, "import", "h1_decision.md"),
      h1DecisionBytes,
    );
    fs.writeFileSync(
      path.join(repositoryRoot, "import", "h2_decision.md"),
      h2DecisionBytes,
    );
    const plan = buildQuestImportPlanV1({
      sourceProjectRoot: repositoryRoot,
      sourceQuestPath: "research-quest.yaml",
      questYamlBytes: encoder.encode(
        JSON.stringify({
          schema_version: "0.2",
          quest_id: "rq-planner-store",
          project_slug: "planner-store",
          title: "Planner Store Quest",
          objective: "Commit the complete deterministic plan.",
          status: "active",
          active_stage: "research-ideation",
          first_read: ["import/ideas.md"],
          authoritative_artifacts: {
            opportunities: {
              path: "import/opportunity_board.md",
              owner_skill: "research-opportunity-mining",
            },
            candidates: {
              path: "import/ideas.md",
              owner_skill: "research-ideation",
            },
          },
          branches: [],
          claims: [],
          open_questions: [],
          blockers: [],
        }),
      ),
      repositoryId: repository.id,
      state: before,
      sourceArtifacts: [
        { path: "import/opportunity_board.md", bytes: opportunityBytes },
        { path: "import/ideas.md", bytes: ideasBytes },
        { path: "import/h1_decision.md", bytes: h1DecisionBytes },
        { path: "import/h2_decision.md", bytes: h2DecisionBytes },
      ],
      actor: "operator",
      rationale: "Accept the complete planner batch",
    });
    expect(plan.conflicts).toEqual([]);
    if (plan.previewToken === null) throw new Error("Missing import preview token");
    const idempotencyKey = `research-quest-import:${plan.previewToken}`;
    const committed = await commit(
      idempotencyKey,
      "2026-08-21T00:01:00.000Z",
      plan.mutations,
    );
    expect(committed.replayed).toBe(false);
    expect(committed.events.map((event) => event.kind)).toEqual([
      "artifact.registered",
      "artifact.registered",
      "artifact.registered",
      "artifact.registered",
      "quest.created",
      "quest.stage_changed",
      "quest.import.recorded",
      "quest.route.recorded",
      "quest.scientific-universe.recorded",
      "quest.scientific-universe.recorded",
      "quest-writer.transferred",
    ]);
    fs.rmSync(repositoryRoot, { recursive: true, force: true });
    expect(
      await commit(
        idempotencyKey,
        "2026-08-21T00:01:00.000Z",
        plan.mutations,
      ),
    ).toMatchObject({ replayed: true });
  });

  it("authenticates validated export receipts and rejects every forged or stale path", async () => {
    const imported = importBatch("a", ["P1"]);
    await commit(
      "validated-export-import",
      "2026-08-21T00:01:00.000Z",
      imported.mutations,
    );
    await expect(
      commit("direct-export-record", "2026-08-21T00:02:00.000Z", [
        {
          kind: "quest.export.record",
          record: {
            id: createQuestExportRecordId(),
            questId,
            sourceSnapshotDigest: imported.snapshotDigest,
            exportDigest: `sha256:${"e".repeat(64)}`,
            mappedStateDigest: `sha256:${"b".repeat(64)}`,
            validatorDigest: `sha256:${"c".repeat(64)}`,
            lossReportDigest: `sha256:${"d".repeat(64)}`,
            validated: true,
          },
        },
      ]),
    ).rejects.toThrow(/direct quest\.export\.record input is forbidden/);
    await expect(
      commit("forged-export-receipt", "2026-08-21T00:02:00.000Z", [
        { kind: "quest.export.record.validated", receipt: {} },
      ]),
    ).rejects.toThrow(/forged validated-export receipt/);

    const alteredValidator = path.join(root, "altered-validator.py");
    fs.copyFileSync(VALIDATOR_PATH, alteredValidator);
    fs.appendFileSync(alteredValidator, "\n# altered\n");
    const validated = await validatedExport(imported.snapshotDigest);
    const currentState = await readResearchState(root);
    const mismapped = await validatedExport(imported.snapshotDigest);
    const mismappedSource = JSON.parse(
      mismapped.files.get("research-quest.yaml")?.toString("utf8") ?? "{}",
    ) as Record<string, unknown>;
    mismappedSource.title = "Forged exported title";
    const mismappedYaml = Buffer.from(JSON.stringify(mismappedSource));
    mismapped.files.set("research-quest.yaml", mismappedYaml);
    fs.writeFileSync(
      path.join(mismapped.outputRoot, "research-quest.yaml"),
      mismappedYaml,
    );
    expect(() =>
      createValidatedQuestExportReceipt({
        state: currentState,
        questId,
        exportRecordId: createQuestExportRecordId(),
        sourceSnapshotDigest: imported.snapshotDigest,
        outputRoot: mismapped.outputRoot,
        files: mismapped.files,
        validatorPath: VALIDATOR_PATH,
      }),
    ).toThrow(/Quest fields differ|quest mapping differs/iu);
    const incompleteFiles = new Map(validated.files);
    incompleteFiles.delete("research/h2_decision.md");
    expect(() =>
      createValidatedQuestExportReceipt({
        state: currentState,
        questId,
        exportRecordId: createQuestExportRecordId(),
        sourceSnapshotDigest: imported.snapshotDigest,
        outputRoot: validated.outputRoot,
        files: incompleteFiles,
        validatorPath: VALIDATOR_PATH,
      }),
    ).toThrow(/Artifact inventory differs/);
    expect(() =>
      createValidatedQuestExportReceipt({
        state: currentState,
        questId,
        exportRecordId: createQuestExportRecordId(),
        sourceSnapshotDigest: imported.snapshotDigest,
        outputRoot: validated.outputRoot,
        files: validated.files,
        validatorPath: alteredValidator,
      }),
    ).toThrow(/validator identity differs/);

    fs.appendFileSync(
      path.join(validated.outputRoot, "research", "ideas.md"),
      "changed",
    );
    await expect(
      commit("changed-export-output", "2026-08-21T00:03:00.000Z", [
        {
          kind: "quest.export.record.validated",
          receipt: validated.receipt,
        },
      ]),
    ).rejects.toThrow(/validated export bytes differ/);

    const exact = await validatedExport(imported.snapshotDigest);
    const mutation = {
      kind: "quest.export.record.validated" as const,
      receipt: exact.receipt,
    };
    const committed = await commit(
      "exact-export-replay",
      "2026-08-21T00:04:00.000Z",
      [mutation],
    );
    expect(committed.replayed).toBe(false);
    expect(
      await commit("exact-export-replay", "2026-08-21T00:04:00.000Z", [
        mutation,
      ]),
    ).toMatchObject({ replayed: true });
    await expect(
      commit("exact-export-replay", "2026-08-21T00:04:00.000Z", [
        { kind: "quest.export.record.validated", receipt: {} },
      ]),
    ).rejects.toThrow(/IDEMPOTENCY_KEY_CONFLICT/);

    const stale = await validatedExport(imported.snapshotDigest);
    await commit("stale-export-change", "2026-08-21T00:05:00.000Z", [
      { kind: "quest.status", questId, status: "paused" },
    ]);
    await expect(
      commit("stale-export-receipt", "2026-08-21T00:06:00.000Z", [
        { kind: "quest.export.record.validated", receipt: stale.receipt },
      ]),
    ).rejects.toThrow(/canonical mapped state changed/);
  });

  it("requires exact universe coverage and invalidates gates after a new universe", async () => {
    const imported = importBatch("a", ["P1", "P2"], true);
    await commit("import-one", "2026-08-21T00:01:00.000Z", imported.mutations);
    const definition = workflow();
    const workflowInstanceId = createWorkflowInstanceId();
    await commit("bind", "2026-08-21T00:02:00.000Z", [
      {
        kind: "workflow.bind",
        workflowInstanceId,
        questId,
        startNodeId: "one",
        workflow: definition,
      },
    ]);
    await commit("complete", "2026-08-21T00:03:00.000Z", [
      {
        kind: "workflow.node.complete",
        workflowInstanceId,
        executionProfile: "lightweight",
        nodeId: "one",
        acceptedRefs: [{ kind: "artifact", id: artifactId }],
        workflow: definition,
      },
    ]);

    await expect(
      commit("partial-gate", "2026-08-21T00:04:00.000Z", [
        {
          kind: "scientific-gate.record",
          recordId: createScientificGateRecordId(),
          workflowInstanceId,
          gateId: "H1",
          decision: "approve",
          actor: "reviewer",
          rationale: "Incomplete",
          approvedRefs: ["P1"],
          rejectedRefs: [],
          evidenceRefs: [artifactId],
          workflow: definition,
        },
      ]),
    ).rejects.toThrow(/exactly cover/);

    const firstGate = createScientificGateRecordId();
    await commit("complete-gate", "2026-08-21T00:05:00.000Z", [
      {
        kind: "scientific-gate.record",
        recordId: firstGate,
        workflowInstanceId,
        gateId: "H1",
        decision: "approve",
        actor: "reviewer",
        rationale: "Complete",
        approvedRefs: ["P1", "P2"],
        rejectedRefs: [],
        evidenceRefs: [artifactId],
        workflow: definition,
      },
    ]);

    const beforeHistoricalExport = await readResearchLedger(root);
    const historicalExportId = createQuestExportRecordId();
    const exportDigest = `sha256:${"e".repeat(64)}` as const;
    const historicalExport = parseResearchEvent({
      schemaVersion: RESEARCH_WORKFLOW_EVENT_SCHEMA_VERSION,
      eventId: createEventId(),
      seq: beforeHistoricalExport.length + 1,
      timestamp: "2026-08-21T00:06:00.000Z",
      kind: "quest.export.recorded",
      aggregate: { type: "quest-export", id: historicalExportId },
      related: [{ type: "quest", id: questId }],
      payload: {
        id: historicalExportId,
        questId,
        sourceSnapshotDigest: imported.snapshotDigest,
        exportDigest,
        mappedStateDigest: computeQuestMappedStateDigest(
          await readResearchState(root),
          questId,
        ),
        validatorDigest: FROZEN_C1_GATE_VALIDATOR_DIGEST,
        lossReportDigest: `sha256:${"d".repeat(64)}`,
        validated: true,
        recordedAt: "2026-08-21T00:06:00.000Z",
      },
      actor: ACTOR,
      idempotencyKey: "historical-export",
      provenance: PROVENANCE,
    });
    fs.appendFileSync(
      researchPaths(root).eventsFile,
      `${JSON.stringify(historicalExport)}\n`,
    );
    await rebuildResearchProjections(root);
    await commit("export-transfer", "2026-08-21T00:06:01.000Z", [
      {
        kind: "quest-writer.transfer",
        transfer: {
          id: createQuestWriterTransferId(),
          questId,
          from: "trellis",
          to: "source",
          sourceSnapshotDigest: imported.snapshotDigest,
          exportDigest,
          actor: "operator",
          rationale: "Validated historical export",
        },
      },
    ]);

    const reimported = importBatch("f", ["P1", "P2", "P3"], true);
    await commit(
      "import-two",
      "2026-08-21T00:07:00.000Z",
      reimported.mutations,
    );
    const staleUniverseLedger = await readResearchLedger(root);
    await expect(
      commit("stale-transition", "2026-08-21T00:08:00.000Z", [
        {
          kind: "workflow.transition.record",
          workflowInstanceId,
          transitionId: "advance",
          selectedBy: "operator",
          workflow: definition,
        },
      ]),
    ).rejects.toThrow(/missing gates: H1/);

    const refreshedGate = createScientificGateRecordId();
    await commit("refreshed-gate", "2026-08-21T00:09:00.000Z", [
      {
        kind: "scientific-gate.record",
        recordId: refreshedGate,
        workflowInstanceId,
        gateId: "H1",
        decision: "approve",
        actor: "reviewer",
        rationale: "New universe covered",
        approvedRefs: ["P1", "P2", "P3"],
        rejectedRefs: [],
        evidenceRefs: [artifactId],
        workflow: definition,
      },
    ]);
    const transitioned = await commit(
      "transition",
      "2026-08-21T00:10:00.000Z",
      [
        {
          kind: "workflow.transition.record",
          workflowInstanceId,
          transitionId: "advance",
          selectedBy: "operator",
          workflow: definition,
        },
      ],
    );
    expect(transitioned.events[0]?.payload).toMatchObject({
      gateRecordIds: [refreshedGate],
    });

    const staleTransition = structuredClone(transitioned.events[0]);
    if (staleTransition === undefined) throw new Error("Missing transition event");
    staleTransition.seq = staleUniverseLedger.length + 1;
    staleTransition.related = [
      { type: "quest", id: questId },
      { type: "scientific-gate", id: firstGate },
    ];
    staleTransition.payload.gateRecordIds = [firstGate];
    expect(() =>
      reduceResearchEvents([...staleUniverseLedger, staleTransition]),
    ).toThrow(/stale for the current universe/);
  });
});

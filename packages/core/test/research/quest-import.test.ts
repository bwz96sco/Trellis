import { describe, expect, it } from "vitest";

import {
  buildQuestImportPlanV1,
  computeQuestScientificUniverseDigest,
  createArtifactId,
  createClaimId,
  createQuestExportRecordId,
  createQuestImportMilestoneId,
  createQuestImportRecordId,
  createQuestRouteSnapshotId,
  createQuestScientificUniverseId,
  createQuestWriterTransferId,
  createQuestId,
  createRepositoryId,
  normalizeQuestScientificUniverseInput,
  parseQuestImportRecord,
  reduceResearchEvents,
  validateQuestImportMutationBatch,
  type ResearchMutation,
} from "../../src/research/index.js";

function stateWithRepository(repositoryId: ReturnType<typeof createRepositoryId>) {
  const state = reduceResearchEvents([]);
  state.repositories[repositoryId] = {
    id: repositoryId,
    name: "Source repository",
    kind: "code",
    locator: "source",
    capabilities: { hasTrellis: false },
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  };
  return state;
}

describe("Quest cutover Core primitives", () => {
  it("registers the additive C4b ID families", () => {
    expect(createQuestImportRecordId()).toMatch(/^qir_/);
    expect(createQuestImportMilestoneId()).toMatch(/^qim_/);
    expect(createQuestRouteSnapshotId()).toMatch(/^qrs_/);
    expect(createQuestScientificUniverseId()).toMatch(/^qsu_/);
    expect(createQuestWriterTransferId()).toMatch(/^qwt_/);
    expect(createQuestExportRecordId()).toMatch(/^qex_/);
  });

  it("parses closed import records and preserves source extensions", () => {
    const questId = createQuestId();
    const artifactId = createArtifactId();
    const record = parseQuestImportRecord({
      id: createQuestImportRecordId(),
      questId,
      sourceIdentity: {
        sourceQuestId: "rq-example",
        projectSlug: "example",
        sourceQuestPath: "research-quest.yaml",
        sourceEventsPath: "research-events.jsonl",
      },
      sourceSnapshot: {
        sourceSchemaVersion: "0.2",
        yamlDigest: `sha256:${"1".repeat(64)}`,
        eventsDigest: `sha256:${"2".repeat(64)}`,
        snapshotDigest: `sha256:${"3".repeat(64)}`,
      },
      sourceStatus: "active",
      sourceActiveStage: "research-ideation",
      sourceExtensions: { vendor: { preserved: true } },
      artifactIds: [artifactId],
      claimIds: [],
      importedAt: "2026-08-21T00:00:00.000Z",
    });
    expect(record.sourceExtensions).toEqual({ vendor: { preserved: true } });
    expect(() => parseQuestImportRecord({ ...record, unsupported: true })).toThrow(
      /unsupported/,
    );
  });

  it("preserves source order and computes the framed universe digest vector", () => {
    const questId = "qst_11111111-1111-4111-8111-111111111111" as const;
    const sourceArtifactId =
      "art_11111111-1111-4111-8111-111111111111" as const;
    const normalized = normalizeQuestScientificUniverseInput({
      gateId: "H2",
      refKind: "candidate",
      refs: [" C1 ", "C2"],
      sourceArtifactIds: [sourceArtifactId],
    });
    expect(normalized.refs).toEqual(["C1", "C2"]);
    expect(
      computeQuestScientificUniverseDigest({
        questId,
        gateId: "H2",
        sourceSnapshotDigest: `sha256:${"a".repeat(64)}`,
        refs: normalized.refs,
        sourceArtifactIds: normalized.sourceArtifactIds,
      }),
    ).toBe("sha256:38bc85da9a17162eabdf99651c1a153ee71bfa460895221ab19822971a0f793e");
    expect(() =>
      normalizeQuestScientificUniverseInput({
        gateId: "H2",
        refKind: "candidate",
        refs: ["C1", " C1 "],
        sourceArtifactIds: [sourceArtifactId],
      }),
    ).toThrow(/duplicate/);
  });

  it("validates fixed import-cutover mutation ordering", () => {
    const questId = createQuestId();
    const importRecordId = createQuestImportRecordId();
    const sourceArtifactId = createArtifactId();
    const common = { questId, importRecordId };
    const mutations = [
      {
        kind: "quest.import.record",
        record: {
          id: importRecordId,
          questId,
          sourceIdentity: {
            sourceQuestId: "rq-example",
            projectSlug: "example",
            sourceQuestPath: "research-quest.yaml",
          },
          sourceSnapshot: {
            sourceSchemaVersion: "0.2",
            yamlDigest: `sha256:${"1".repeat(64)}`,
            snapshotDigest: `sha256:${"2".repeat(64)}`,
          },
          sourceStatus: "active",
          sourceActiveStage: "research-ideation",
          sourceExtensions: {},
          artifactIds: [sourceArtifactId],
          claimIds: [],
        },
      },
      {
        kind: "quest.route.set",
        route: {
          id: createQuestRouteSnapshotId(),
          ...common,
          firstReadArtifactIds: [],
          ownerBindings: [],
          branches: [],
          openQuestions: [],
          blockers: [],
          sourceExtensions: {},
        },
      },
      {
        kind: "quest.scientific-universe.record",
        universe: {
          id: createQuestScientificUniverseId(),
          ...common,
          gateId: "H1",
          refKind: "opportunity",
          refs: ["P1"],
          sourceArtifactIds: [sourceArtifactId],
          sourceSnapshotDigest: `sha256:${"2".repeat(64)}`,
        },
      },
      {
        kind: "quest.scientific-universe.record",
        universe: {
          id: createQuestScientificUniverseId(),
          ...common,
          gateId: "H2",
          refKind: "candidate",
          refs: ["C1"],
          sourceArtifactIds: [sourceArtifactId],
          sourceSnapshotDigest: `sha256:${"2".repeat(64)}`,
        },
      },
      {
        kind: "quest-writer.transfer",
        transfer: {
          id: createQuestWriterTransferId(),
          questId,
          from: "source",
          to: "trellis",
          sourceSnapshotDigest: `sha256:${"2".repeat(64)}`,
          actor: "operator",
          rationale: "Cut over",
        },
      },
    ] satisfies ResearchMutation[];

    expect(validateQuestImportMutationBatch(mutations)).toEqual({
      questId,
      importRecordId,
    });
    expect(() =>
      validateQuestImportMutationBatch([
        { kind: "claim.status", claimId: createClaimId(), status: "supported" },
        ...mutations,
      ]),
    ).toThrow(/outside the import record/);
    expect(() =>
      validateQuestImportMutationBatch([
        mutations[0],
        mutations[2],
        mutations[1],
        mutations[3],
        mutations[4],
      ] as ResearchMutation[]),
    ).toThrow(/fixed order/);
  });

  it("builds one deterministic complete source-to-mutation plan", () => {
    const repositoryId = createRepositoryId();
    const questYaml = [
      'schema_version: "0.2"',
      "quest_id: rq-example",
      "project_slug: example",
      "title: Example Quest",
      "objective: Test exact source mapping.",
      "status: active",
      "active_stage: research-ideation",
      "first_read:",
      "  - ideas.md",
      "authoritative_artifacts:",
      "  opportunities:",
      "    path: opportunity_board.md",
      "    owner_skill: research-opportunity-mining",
      "  candidates:",
      "    path: ideas.md",
      "    owner_skill: research-ideation",
      "    format_extension: exact",
      "branches:",
      "  - id: main",
      "    status: active",
      "    owner_skill: research-ideation",
      "    objective: Evaluate candidates.",
      "    expected_artifact: ideas.md",
      "    branch_extension: retained",
      "claims:",
      "  - id: CL1",
      "    owner_skill: research-ideation",
      "    branch_id: main",
      "    status: supported",
      "    statement: Candidate set is explicit.",
      "    evidence_paths:",
      "      - ideas.md",
      "    claim_extension: retained",
      "open_questions:",
      "  - Which candidate survives?",
      "current_decision:",
      "  id: D1",
      "  verdict: continue",
      "  rationale: Explicit candidates exist.",
      "  evidence_paths:",
      "    - ideas.md",
      "  decision_extension: retained",
      "next_action:",
      "  owner_skill: research-idea-evaluation",
      "  action: review",
      "  acceptance_gate: Record H2.",
      "  expected_artifact: ideas.md",
      "  action_extension: retained",
      "board:",
      "  board_extension: retained",
      "blockers: []",
      "vendor_extension:",
      "  retained: true",
      "",
    ].join("\n");
    const event = JSON.stringify({
      event_id: "evt-source-1",
      timestamp: "2026-08-20T00:00:00.000Z",
      actor: "source-operator",
      event_type: "route_changed",
      milestone: true,
      stage: "research-ideation",
      summary: "Candidate route reviewed.",
      artifacts: [
        {
          path: "ideas.md",
          owner_skill: "research-ideation",
          role: "candidate_set",
          action: "updated",
          artifact_extension: "retained",
        },
      ],
      evidence: [{ path: "ideas.md", role: "candidate_set" }],
      claim_updates: [{ claim_id: "CL1", to_status: "supported" }],
      source_extension: { retained: true },
    });
    const input = {
      sourceProjectRoot: "/source/example",
      sourceQuestPath: "research-quest.yaml",
      sourceEventsPath: "research-events.jsonl",
      questYamlBytes: new TextEncoder().encode(questYaml),
      eventsJsonlBytes: new TextEncoder().encode(`${event}\n`),
      repositoryId,
      state: stateWithRepository(repositoryId),
      sourceArtifacts: [
        {
          path: "opportunity_board.md",
          bytes: new TextEncoder().encode(
            [
              "## Opportunity Board",
              "| ID | Problem |",
              "| --- | --- |",
              "| P1 | One |",
              "| B2 | Two |",
            ].join("\n"),
          ),
        },
        {
          path: "ideas.md",
          bytes: new TextEncoder().encode(
            [
              "# Ideas",
              "## C1",
              "One",
              "## C2",
              "Two",
              "## Approved Opportunity Coverage",
              "| Candidate ID | Approved IDs |",
              "| --- | --- |",
              "| C1 | P1 |",
              "| C2 | B2 |",
            ].join("\n"),
          ),
        },
        {
          path: "h1_decision.md",
          bytes: new TextEncoder().encode("# H1 Decision\n\nP1 and B2 approved."),
        },
        {
          path: "h2_decision.md",
          bytes: new TextEncoder().encode("# H2 Decision\n\nC1 and C2 selected."),
        },
      ],
      actor: "operator",
      rationale: "Accept exact import",
    } as const;

    const first = buildQuestImportPlanV1(input);
    const second = buildQuestImportPlanV1(input);
    const reorderedArtifacts = buildQuestImportPlanV1({
      ...input,
      sourceArtifacts: [...input.sourceArtifacts].reverse(),
    });
    expect(first).toEqual(second);
    expect(reorderedArtifacts).toEqual(first);
    expect(first.conflicts).toEqual([]);
    expect(first.previewToken).toMatch(/^qip_[A-Za-z0-9_-]{43}$/);
    const missingValidatorArtifacts = buildQuestImportPlanV1({
      ...input,
      sourceArtifacts: input.sourceArtifacts.filter(
        ({ path }) => !path.endsWith("_decision.md"),
      ),
    });
    expect(missingValidatorArtifacts.previewToken).toBeNull();
    expect(missingValidatorArtifacts.mutations).toEqual([]);
    expect(missingValidatorArtifacts.conflicts).toEqual([
      expect.objectContaining({
        path: "scientificUniverse.H1.validatorArtifact",
        message: "required source Artifact 'h1_decision.md' was not supplied",
      }),
      expect.objectContaining({
        path: "scientificUniverse.H2.validatorArtifact",
        message: "required source Artifact 'h2_decision.md' was not supplied",
      }),
    ]);
    expect(first.quest).toMatchObject({
      title: "Example Quest",
      description: "Test exact source mapping.",
      status: "active",
      stage: "ideation",
    });
    expect(first.extensionInventory.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "events[line=1].artifacts[0].artifact_extension",
        "quest.authoritative_artifacts.candidates.format_extension",
        "quest.board.board_extension",
        "quest.branches[0].branch_extension",
        "quest.claims[0].claim_extension",
        "quest.current_decision.decision_extension",
        "quest.next_action.action_extension",
        "quest.vendor_extension",
      ]),
    );
    expect(
      first.mutations.find((mutation) => mutation.kind === "quest.import.record"),
    ).toMatchObject({
      record: {
        sourceExtensions: {
          trellisQuestImportV1: {
            sourceObjects: {
              authoritativeArtifacts: {
                candidates: { format_extension: "exact" },
              },
              structuredNextAction: { action_extension: "retained" },
            },
          },
        },
      },
    });
    const changedOperator = buildQuestImportPlanV1({
      ...input,
      actor: "another-operator",
      rationale: "A different acceptance rationale",
    });
    expect(changedOperator.semanticPlanDigest).not.toBe(first.semanticPlanDigest);
    expect(
      changedOperator.mutations
        .filter((mutation) => mutation.kind === "artifact.register")
        .map((mutation) => mutation.artifact.id),
    ).toEqual(
      first.mutations
        .filter((mutation) => mutation.kind === "artifact.register")
        .map((mutation) => mutation.artifact.id),
    );
    expect(
      changedOperator.mutations
        .filter((mutation) => mutation.kind === "claim.create")
        .map((mutation) => mutation.claim.id),
    ).toEqual(
      first.mutations
        .filter((mutation) => mutation.kind === "claim.create")
        .map((mutation) => mutation.claim.id),
    );
    const unreviewedDuplicate = buildQuestImportPlanV1({
      ...input,
      eventsJsonlBytes: new TextEncoder().encode(
        `${event}\n${JSON.stringify({ ...JSON.parse(event), milestone: false })}\n`,
      ),
    });
    expect(unreviewedDuplicate.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "events[1].event_id" }),
        expect.objectContaining({ path: "events[1].milestone" }),
      ]),
    );
    expect(unreviewedDuplicate.previewToken).toBeNull();
    expect(unreviewedDuplicate.mutations).toEqual([]);
    expect(validateQuestImportMutationBatch(first.mutations)).toEqual({
      questId: first.quest.id,
      importRecordId: expect.stringMatching(/^qir_/),
    });
    expect(first.mutations.map(({ kind }) => kind)).toEqual([
      "artifact.register",
      "artifact.register",
      "artifact.register",
      "artifact.register",
      "quest.create",
      "quest.stage",
      "claim.create",
      "claim.status",
      "quest.import.record",
      "quest.route.set",
      "quest.scientific-universe.record",
      "quest.scientific-universe.record",
      "quest.import.milestone",
      "quest-writer.transfer",
    ]);
    const universes = first.mutations.filter(
      (mutation) => mutation.kind === "quest.scientific-universe.record",
    );
    expect(universes.map(({ universe }) => universe.refs)).toEqual([
      ["P1", "B2"],
      ["C1", "C2"],
    ]);

    const headingsOnly = buildQuestImportPlanV1({
      ...input,
      sourceArtifacts: input.sourceArtifacts.map((artifact) =>
        artifact.path === "ideas.md"
          ? {
              ...artifact,
              bytes: new TextEncoder().encode("## C1\nOne\n## C2\nTwo"),
            }
          : artifact,
      ),
    });
    expect(headingsOnly.previewToken).toBeNull();
    expect(headingsOnly.mutations).toEqual([]);
    expect(headingsOnly.conflicts).toContainEqual(
      expect.objectContaining({
        path: "scientificUniverse.H2",
        message: "missing section: Approved Opportunity Coverage",
      }),
    );
  });

  it("maps supported legacy status and stage aliases without rewriting source", () => {
    const repositoryId = createRepositoryId();
    const result = buildQuestImportPlanV1({
      sourceProjectRoot: "/source/legacy",
      sourceQuestPath: "research-quest.yaml",
      questYamlBytes: new TextEncoder().encode(
        JSON.stringify({
          version: 1,
          quest_id: "rq-legacy",
          project_slug: "legacy",
          title: "Legacy Quest",
          objective: "Preserve legacy source.",
          status: "seed",
          current_stage: "innovation-explorer",
          first_read: ["ideas.md"],
          authoritative_artifacts: {
            opportunities: {
              path: "opportunity_board.md",
              owner_skill: "research-opportunity-mining",
            },
            candidates: {
              path: "ideas.md",
              owner_skill: "research-ideation",
            },
          },
          branches: [],
          claims: [],
          open_questions: [],
          blockers: [],
        }),
      ),
      repositoryId,
      state: stateWithRepository(repositoryId),
      sourceArtifacts: [
        {
          path: "opportunity_board.md",
          bytes: new TextEncoder().encode(
            "## Opportunity Board\n| ID | Problem |\n| --- | --- |\n| P1 | One |",
          ),
        },
        {
          path: "ideas.md",
          bytes: new TextEncoder().encode(
            "## C1\nOne\n\n## Approved Opportunity Coverage\n| Candidate ID | Approved IDs |\n| --- | --- |\n| C1 | P1 |",
          ),
        },
        {
          path: "h1_decision.md",
          bytes: new TextEncoder().encode("# H1 Decision\n\nP1 approved."),
        },
        {
          path: "h2_decision.md",
          bytes: new TextEncoder().encode("# H2 Decision\n\nC1 selected."),
        },
      ],
      actor: "operator",
      rationale: "Import legacy state exactly",
    });

    expect(result.conflicts).toEqual([]);
    expect(result.quest).toMatchObject({ status: "active", stage: "ideation" });
    const imported = result.mutations.find(
      (mutation) => mutation.kind === "quest.import.record",
    );
    expect(imported).toMatchObject({
      record: {
        sourceSnapshot: { sourceSchemaVersion: "1" },
        sourceStatus: "seed",
        sourceActiveStage: "innovation-explorer",
      },
    });
  });

  it("returns deterministic conflicts for invalid UTF-8 and ambiguous universe Artifacts", () => {
    const repositoryId = createRepositoryId();
    const sourceQuest = {
      schema_version: "0.2",
      quest_id: "rq-artifact-errors",
      project_slug: "artifact-errors",
      title: "Artifact errors",
      objective: "Diagnose source Artifacts without throwing.",
      status: "active",
      active_stage: "research-ideation",
      first_read: ["ideas.md"],
      authoritative_artifacts: {
        opportunities: {
          path: "opportunity_board.md",
          owner_skill: "research-opportunity-mining",
        },
        candidates: {
          path: "ideas.md",
          owner_skill: "research-ideation",
        },
      },
      branches: [],
      claims: [],
      open_questions: [],
      blockers: [],
    };
    const invalidUtf8 = buildQuestImportPlanV1({
      sourceProjectRoot: "/source/artifact-errors",
      sourceQuestPath: "research-quest.yaml",
      questYamlBytes: new TextEncoder().encode(JSON.stringify(sourceQuest)),
      repositoryId,
      state: stateWithRepository(repositoryId),
      sourceArtifacts: [
        {
          path: "opportunity_board.md",
          bytes: new TextEncoder().encode(
            "## Opportunity Board\n| ID | Problem |\n| --- | --- |\n| P1 | One |",
          ),
        },
        { path: "ideas.md", bytes: new Uint8Array([0xc3, 0x28]) },
        {
          path: "h1_decision.md",
          bytes: new TextEncoder().encode("# H1 Decision\n\nP1 approved."),
        },
        {
          path: "h2_decision.md",
          bytes: new TextEncoder().encode("# H2 Decision\n\nC1 selected."),
        },
      ],
      actor: "operator",
      rationale: "Return a complete diagnostic",
    });
    expect(invalidUtf8.conflicts).toContainEqual({
      code: "research_quest_import_conflict",
      path: "scientificUniverse.H2",
      message: "ideas.md must be valid UTF-8",
    });
    expect(invalidUtf8.previewToken).toBeNull();
    expect(invalidUtf8.mutations).toEqual([]);

    const ambiguousSource = {
      ...sourceQuest,
      authoritative_artifacts: {
        opportunitiesOne: {
          path: "one/opportunity_board.md",
          owner_skill: "research-opportunity-mining",
        },
        opportunitiesTwo: {
          path: "two/opportunity_board.md",
          owner_skill: "research-opportunity-mining",
        },
        candidates: {
          path: "ideas.md",
          owner_skill: "research-ideation",
        },
      },
    };
    const ambiguous = buildQuestImportPlanV1({
      sourceProjectRoot: "/source/artifact-errors",
      sourceQuestPath: "research-quest.yaml",
      questYamlBytes: new TextEncoder().encode(JSON.stringify(ambiguousSource)),
      repositoryId,
      state: stateWithRepository(repositoryId),
      sourceArtifacts: [
        {
          path: "one/opportunity_board.md",
          bytes: new TextEncoder().encode(
            "## Opportunity Board\n| ID | Problem |\n| --- | --- |\n| P1 | One |",
          ),
        },
        {
          path: "two/opportunity_board.md",
          bytes: new TextEncoder().encode(
            "## Opportunity Board\n| ID | Problem |\n| --- | --- |\n| P2 | Two |",
          ),
        },
        { path: "ideas.md", bytes: new TextEncoder().encode(
            "## C1\nOne\n\n## Approved Opportunity Coverage\n| Candidate ID | Approved IDs |\n| --- | --- |\n| C1 | P1 |",
          ) },
      ],
      actor: "operator",
      rationale: "Reject ambiguous authority",
    });
    expect(ambiguous.conflicts).toContainEqual({
      code: "research_quest_import_conflict",
      path: "scientificUniverse.H1",
      message:
        "multiple Opportunity Board Artifacts match: one/opportunity_board.md, two/opportunity_board.md",
    });
    expect(ambiguous.previewToken).toBeNull();
    expect(ambiguous.mutations).toEqual([]);
  });

  it("returns complete deterministic conflicts and no partial mutation plan", () => {
    const repositoryId = createRepositoryId();
    const result = buildQuestImportPlanV1({
      sourceProjectRoot: "/source/example",
      sourceQuestPath: "research-quest.yaml",
      questYamlBytes: new TextEncoder().encode(
        [
          "schema_version: 0.2",
          "quest_id: rq-bad",
          "project_slug: bad",
          "title: Bad",
          "objective: Bad mapping",
          "status: running",
          "active_stage: unknown-stage",
          "first_read:",
          "  - ../escape.md",
          "authoritative_artifacts:",
          "  ideas:",
          "    path: ideas.md",
          "branches:",
          "  - id: main",
          "    status: active",
          "    owner_skill: research-ideation",
          "    objective: Main",
          "claims:",
          "  - id: CL1",
          "    owner_skill: research-ideation",
          "    branch_id: missing",
          "    status: invented",
          "    statement: Invalid",
          "open_questions: []",
          "blockers: []",
        ].join("\n"),
      ),
      repositoryId,
      state: stateWithRepository(repositoryId),
      sourceArtifacts: [
        {
          path: "ideas.md",
          bytes: new TextEncoder().encode("## C1 extra\nProse C2"),
        },
      ],
      actor: "operator",
      rationale: "Must not construct partial events",
    });

    expect(result.previewToken).toBeNull();
    expect(result.mutations).toEqual([]);
    expect(result.conflicts.map(({ path }) => path)).toEqual([
      "quest.active_stage",
      "quest.authoritative_artifacts.ideas.owner_skill",
      "quest.claims[0].branch_id",
      "quest.claims[0].status",
      "quest.first_read[0]",
      "quest.status",
      "scientificUniverse.H1",
      "scientificUniverse.H2",
    ]);
  });
});

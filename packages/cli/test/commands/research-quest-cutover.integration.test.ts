import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  commitResearchBatch,
  createQuestId,
  createRepositoryId,
  createWorkspaceId,
  readResearchLedger,
  readResearchState,
  stableResearchJson,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";

import {
  exportResearchQuest,
  importResearchQuest,
  transferResearchQuestWriter,
  type ResearchQuestImportOptions,
} from "../../src/commands/research/quest-cutover-command.js";

function snapshotTree(root: string): Map<string, string> {
  const result = new Map<string, string>();
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isDirectory()) {
        result.set(`${relative}/`, "directory");
        walk(absolute);
      } else {
        result.set(relative, fs.readFileSync(absolute).toString("base64"));
      }
    }
  };
  walk(root);
  return result;
}

describe("research Quest cutover CLI", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0))
      fs.rmSync(root, { recursive: true, force: true });
  });

  async function fixture(): Promise<{
    root: string;
    source: string;
    options: ResearchQuestImportOptions;
  }> {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "trellis-quest-cutover-cli-"),
    );
    roots.push(root);
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    const repositoryId = createRepositoryId();
    await commitResearchBatch({
      root,
      actor: { type: "agent", id: "test" },
      provenance: { source: "test" },
      idempotencyKey: "setup",
      mutations: [
        {
          kind: "workspace.create",
          workspace: {
            id: createWorkspaceId(),
            name: "Cutover",
            description: "",
          },
        },
        {
          kind: "repository.register",
          repository: {
            id: repositoryId,
            name: "Source",
            kind: "code",
            locator: "source",
            capabilities: { hasTrellis: false },
          },
        },
      ],
    });
    const sourceRoot = path.join(root, "source");
    fs.mkdirSync(path.join(sourceRoot, "research"), { recursive: true });
    fs.writeFileSync(
      path.join(sourceRoot, "research", "opportunity_board.md"),
      "## Opportunity Board\n| ID | Problem |\n| --- | --- |\n| P1 | One |\n",
    );
    fs.writeFileSync(
      path.join(sourceRoot, "research", "h1_decision.md"),
      "---\ndecision_status: approved\ndecision_recorded_by: human_confirmed\napproved_problem_ids: P1\napproved_bridge_ids: none\n---\n## Human Decision\n\nApproved.\n",
    );
    fs.writeFileSync(
      path.join(sourceRoot, "research", "ideas.md"),
      "## C1\nOne\n\n## Approved Opportunity Coverage\n| Candidate ID | Approved IDs |\n| --- | --- |\n| C1 | P1 |\n",
    );
    fs.writeFileSync(
      path.join(sourceRoot, "research", "h2_decision.md"),
      "---\ndecision_status: approved\ndecision_recorded_by: human_confirmed\napproved_candidate_ids: C1\n---\n## Human Decision\n\nApproved.\n",
    );
    const source = path.join(sourceRoot, "research-quest.yaml");
    fs.writeFileSync(
      source,
      JSON.stringify({
        schema_version: "0.2",
        quest_id: "rq-cli",
        project_slug: "cli",
        title: "CLI Quest",
        objective: "Exercise exact cutover.",
        status: "active",
        active_stage: "research-ideation",
        first_read: [
          "research/opportunity_board.md",
          "research/ideas.md",
        ],
        authoritative_artifacts: {
          opportunities: {
            path: "research/opportunity_board.md",
            owner_skill: "research-opportunity-mining",
          },
          candidates: {
            path: "research/ideas.md",
            owner_skill: "research-ideation",
          },
        },
        branches: [],
        claims: [],
        open_questions: [],
        blockers: [],
      }),
    );
    return { root, source, options: { root, source } };
  }

  it("previews with zero writes, commits with the exact token, and classifies replay", async () => {
    const test = await fixture();
    const before = snapshotTree(test.root);
    const preview = await importResearchQuest(test.options);
    expect(preview).toMatchObject({
      command: "research quest import",
      dryRun: true,
      replayed: false,
    });
    expect(preview.source.questPath).toBe("research-quest.yaml");
    expect(preview.conflicts).toEqual([]);
    expect(typeof preview.previewToken).toBe("string");
    expect(String(preview.previewToken)).toMatch(/^qip_/);
    expect(snapshotTree(test.root)).toEqual(before);

    const committed = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    expect(committed).toMatchObject({ dryRun: false, replayed: false });
    const questId = committed.questId;
    expect(
      (await readResearchState(test.root)).questWriterAuthorityByQuestId[
        questId
      ]?.writer,
    ).toBe("trellis");
    expect(
      fs.existsSync(
        path.join(
          test.root,
          ".trellis",
          "research",
          "cutover-fences",
          `${questId}.json`,
        ),
      ),
    ).toBe(false);

    const replayTree = snapshotTree(test.root);
    const replayed = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    expect(replayed.replayed).toBe(true);
    expect(snapshotTree(test.root)).toEqual(replayTree);
    expect(await readResearchLedger(test.root)).toHaveLength(committed.headSeq);

    const target = path.join(test.root, "exported");
    const exportBefore = snapshotTree(test.root);
    const exportPreview = await exportResearchQuest({
      root: test.root,
      quest: questId,
      target,
    });
    expect(exportPreview).toMatchObject({ dryRun: true, replayed: false });
    expect(exportPreview.files.map((file) => file.path)).toEqual([
      "research-export-loss.json",
      "research-export-loss.md",
      "research-quest.yaml",
      "research/h1_decision.md",
      "research/h2_decision.md",
      "research/ideas.md",
      "research/opportunity_board.md",
    ]);
    expect(fs.existsSync(target)).toBe(false);
    expect(snapshotTree(test.root)).toEqual(exportBefore);
    const exported = await exportResearchQuest({
      root: test.root,
      quest: questId,
      target,
      write: true,
    });
    expect(exported).toMatchObject({ dryRun: false, replayed: false });
    expect(fs.existsSync(path.join(target, "research-quest.yaml"))).toBe(true);
    for (const artifactPath of [
      "research/opportunity_board.md",
      "research/h1_decision.md",
      "research/ideas.md",
      "research/h2_decision.md",
    ]) {
      expect(fs.readFileSync(path.join(target, artifactPath))).toEqual(
        fs.readFileSync(path.join(path.dirname(test.source), artifactPath)),
      );
    }
    const exactTargetTree = snapshotTree(target);
    const exportsProjection = path.join(
      test.root,
      ".trellis",
      "research",
      "quests",
      questId,
      "exports.json",
    );
    fs.rmSync(exportsProjection);
    const exportLedgerLength = (await readResearchLedger(test.root)).length;
    const recoveredExport = await exportResearchQuest({
      root: test.root,
      quest: questId,
      target,
      write: true,
    });
    expect(recoveredExport).toMatchObject({
      dryRun: false,
      replayed: true,
      exportDigest: exported.exportDigest,
    });
    expect(snapshotTree(target)).toEqual(exactTargetTree);
    expect(fs.existsSync(exportsProjection)).toBe(true);
    expect(await readResearchLedger(test.root)).toHaveLength(exportLedgerLength);

    const transferPreview = await transferResearchQuestWriter({
      root: test.root,
      quest: questId,
      to: "source",
      rationale: "Return authority after validated export",
      exportDigest: exported.exportDigest,
    });
    expect(transferPreview).toMatchObject({
      dryRun: true,
      from: "trellis",
      to: "source",
    });
    const transferred = await transferResearchQuestWriter({
      root: test.root,
      quest: questId,
      to: "source",
      rationale: "Return authority after validated export",
      exportDigest: exported.exportDigest,
      write: true,
    });
    expect(transferred).toMatchObject({
      dryRun: false,
      from: "trellis",
      to: "source",
    });
    const sourceState = await readResearchState(test.root);
    expect(sourceState.questWriterAuthorityByQuestId[questId]?.writer).toBe(
      "source",
    );
    const importRecordId =
      sourceState.latestQuestImportRecordIdByQuestId[questId];
    if (importRecordId === undefined) throw new Error("Missing import record");
    const snapshotDigest =
      sourceState.questImportRecords[importRecordId]?.sourceSnapshot
        .snapshotDigest;
    if (snapshotDigest === undefined)
      throw new Error("Missing source snapshot digest");
    const returned = await transferResearchQuestWriter({
      root: test.root,
      quest: questId,
      to: "trellis",
      rationale: "Resume canonical Trellis authority",
      exportDigest: snapshotDigest,
      write: true,
    });
    expect(returned).toMatchObject({
      dryRun: false,
      from: "source",
      to: "trellis",
    });
    expect(
      (await readResearchState(test.root)).questWriterAuthorityByQuestId[
        questId
      ]?.writer,
    ).toBe("trellis");
    expect(
      fs.existsSync(
        path.join(
          test.root,
          ".trellis",
          "research",
          "cutover-fences",
          `${questId}.json`,
        ),
      ),
    ).toBe(false);
  });

  it("detects source drift without adding any writes", async () => {
    const test = await fixture();
    const preview = await importResearchQuest(test.options);
    fs.appendFileSync(test.source, "\n# source drift\n");
    const before = snapshotTree(test.root);
    await expect(
      importResearchQuest({
        ...test.options,
        write: true,
        previewToken: preview.previewToken ?? undefined,
      }),
    ).rejects.toMatchObject({ code: "research_quest_source_drift" });
    expect(snapshotTree(test.root)).toEqual(before);
  });

  it.each(["missing", "different"] as const)(
    "refuses %s canonical Artifact bytes before export publication",
    async (condition) => {
      const test = await fixture();
      const preview = await importResearchQuest(test.options);
      const imported = await importResearchQuest({
        ...test.options,
        write: true,
        previewToken: preview.previewToken ?? undefined,
      });
      const artifact = path.join(
        path.dirname(test.source),
        "research",
        "ideas.md",
      );
      if (condition === "missing") fs.rmSync(artifact);
      else fs.appendFileSync(artifact, "\nchanged after import\n");
      const target = path.join(test.root, `artifact-${condition}-export`);
      const before = snapshotTree(test.root);

      await expect(
        exportResearchQuest({
          root: test.root,
          quest: imported.questId,
          target,
          write: true,
        }),
      ).rejects.toMatchObject({ code: "research_quest_transfer_unverified" });
      expect(snapshotTree(test.root)).toEqual(before);
      expect(fs.existsSync(target)).toBe(false);
    },
  );

  it("refuses a differing export collision without writes", async () => {
    const test = await fixture();
    const preview = await importResearchQuest(test.options);
    const imported = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    const target = path.join(test.root, "collision");
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "research-quest.yaml"), "different\n");
    const before = snapshotTree(test.root);
    await expect(
      exportResearchQuest({
        root: test.root,
        quest: imported.questId,
        target,
        write: true,
      }),
    ).rejects.toMatchObject({ code: "research_quest_export_collision" });
    expect(snapshotTree(test.root)).toEqual(before);
  });

  it("refuses differing nested Artifact bytes in an otherwise complete target", async () => {
    const test = await fixture();
    const preview = await importResearchQuest(test.options);
    const imported = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    const target = path.join(test.root, "nested-collision");
    await exportResearchQuest({
      root: test.root,
      quest: imported.questId,
      target,
      write: true,
    });
    fs.appendFileSync(path.join(target, "research", "ideas.md"), "different\n");
    const before = snapshotTree(test.root);

    await expect(
      exportResearchQuest({
        root: test.root,
        quest: imported.questId,
        target,
        write: true,
      }),
    ).rejects.toMatchObject({ code: "research_quest_export_collision" });
    expect(snapshotTree(test.root)).toEqual(before);
  });

  it("round-trips reviewed events and preserved source extensions", async () => {
    const test = await fixture();
    const source = JSON.parse(fs.readFileSync(test.source, "utf8")) as Record<
      string,
      unknown
    >;
    source.branches = [
      {
        id: "main",
        status: "active",
        owner_skill: "research-ideation",
        objective: "Evaluate candidates.",
        expected_artifact: "research/ideas.md",
        branch_extension: "retained",
      },
    ];
    source.claims = [
      {
        id: "CL1",
        owner_skill: "research-ideation",
        branch_id: "main",
        status: "supported",
        statement: "Candidate set is explicit.",
        evidence_paths: ["research/ideas.md"],
        claim_extension: "retained",
      },
    ];
    source.vendor_extension = { retained: true };
    fs.writeFileSync(test.source, JSON.stringify(source));
    const event = {
      event_id: "evt-source-1",
      timestamp: "2026-08-20T00:00:00.000Z",
      actor: "source-operator",
      event_type: "route_changed",
      milestone: true,
      stage: "research-ideation",
      summary: "Candidate route reviewed.",
      artifacts: [
        {
          path: "research/ideas.md",
          owner_skill: "research-ideation",
          role: "candidate_set",
          action: "updated",
          artifact_extension: "retained",
        },
      ],
      evidence: [{ path: "research/ideas.md", role: "candidate_set" }],
      claim_updates: [{ claim_id: "CL1", to_status: "supported" }],
      source_extension: { retained: true },
    };
    const events = path.join(
      path.dirname(test.source),
      "research-events.jsonl",
    );
    fs.writeFileSync(events, `${JSON.stringify(event)}\n`);
    const options = { ...test.options, events };
    const preview = await importResearchQuest(options);
    expect(preview.conflicts).toEqual([]);
    const imported = await importResearchQuest({
      ...options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    const target = path.join(test.root, "round-trip-export");
    const exported = await exportResearchQuest({
      root: test.root,
      quest: imported.questId,
      target,
      write: true,
    });

    const exportedSource = parseYaml(
      fs.readFileSync(path.join(target, "research-quest.yaml"), "utf8"),
    ) as Record<string, unknown>;
    expect(exportedSource.vendor_extension).toEqual({ retained: true });
    expect(exportedSource.branches).toEqual([
      expect.objectContaining({ branch_extension: "retained" }),
    ]);
    expect(exportedSource.claims).toEqual([
      expect.objectContaining({ claim_extension: "retained" }),
    ]);
    expect(
      JSON.parse(
        fs.readFileSync(path.join(target, "research-events.jsonl"), "utf8"),
      ),
    ).toEqual(event);
    const lossReport = JSON.parse(
      fs.readFileSync(path.join(target, "research-export-loss.json"), "utf8"),
    ) as { preservedExtensions: string[] };
    expect(lossReport.preservedExtensions).toEqual([
      "events[line=1].artifacts[0].artifact_extension",
      "events[line=1].source_extension",
      "quest.branches[0].branch_extension",
      "quest.claims[0].claim_extension",
      "quest.vendor_extension",
    ]);

    const state = await readResearchState(test.root);
    const importRecordId =
      state.latestQuestImportRecordIdByQuestId[imported.questId];
    const claimId =
      importRecordId === undefined
        ? undefined
        : state.questImportRecords[importRecordId]?.claimIds[0];
    if (claimId === undefined) throw new Error("Missing imported Claim");
    await commitResearchBatch({
      root: test.root,
      actor: { type: "agent", id: "test" },
      provenance: { source: "test" },
      idempotencyKey: "change-claim-after-export",
      mutations: [{ kind: "claim.status", claimId, status: "contested" }],
    });
    await expect(
      transferResearchQuestWriter({
        root: test.root,
        quest: imported.questId,
        to: "source",
        rationale: "Reject stale Claim export",
        exportDigest: exported.exportDigest,
        write: true,
      }),
    ).rejects.toMatchObject({ code: "research_quest_transfer_unverified" });
  });

  it("recovers a retained exact fence and missing writer projection before source reads", async () => {
    const test = await fixture();
    const preview = await importResearchQuest(test.options);
    const committed = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    const fence = path.join(
      test.root,
      ".trellis",
      "research",
      "cutover-fences",
      `${committed.questId}.json`,
    );
    fs.mkdirSync(path.dirname(fence), { recursive: true });
    fs.writeFileSync(
      fence,
      `${stableResearchJson({ schemaVersion: 1, effect: "deny-source-writes", questId: committed.questId, source: committed.source, previewToken: String(preview.previewToken) })}\n`,
    );
    const writerProjection = path.join(
      test.root,
      ".trellis",
      "research",
      "quests",
      committed.questId,
      "writer.json",
    );
    fs.rmSync(writerProjection);
    fs.rmSync(test.source);
    const ledgerLength = (await readResearchLedger(test.root)).length;

    const recovered = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });

    expect(recovered.replayed).toBe(true);
    expect(fs.existsSync(fence)).toBe(false);
    expect(fs.existsSync(writerProjection)).toBe(true);
    expect(await readResearchLedger(test.root)).toHaveLength(ledgerLength);
  });

  it("rejects a different retained fence without recovery writes", async () => {
    const test = await fixture();
    const preview = await importResearchQuest(test.options);
    const committed = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    const fence = path.join(
      test.root,
      ".trellis",
      "research",
      "cutover-fences",
      `${committed.questId}.json`,
    );
    fs.mkdirSync(path.dirname(fence), { recursive: true });
    fs.writeFileSync(fence, '{"effect":"different"}\n');
    const before = snapshotTree(test.root);

    await expect(
      importResearchQuest({
        ...test.options,
        write: true,
        previewToken: preview.previewToken ?? undefined,
      }),
    ).rejects.toMatchObject({ code: "research_quest_transfer_unverified" });
    expect(snapshotTree(test.root)).toEqual(before);
  });

  it("rejects partial and cross-family ownership of an import token", async () => {
    for (const mutation of [
      {
        kind: "quest.create" as const,
        quest: {
          id: createQuestId(),
          title: "Partial import family",
          description: "",
          repositoryIds: [],
          artifactRefs: [],
        },
      },
      {
        kind: "repository.register" as const,
        repository: {
          id: createRepositoryId(),
          name: "Cross-family owner",
          kind: "code" as const,
          locator: "cross-family",
          capabilities: { hasTrellis: false },
        },
      },
    ]) {
      const test = await fixture();
      const preview = await importResearchQuest(test.options);
      const previewToken = String(preview.previewToken);
      await commitResearchBatch({
        root: test.root,
        actor: { type: "agent", id: "test" },
        provenance: { source: "test" },
        idempotencyKey: `research-quest-import:${previewToken}`,
        mutations: [mutation],
      });
      const before = snapshotTree(test.root);

      await expect(
        importResearchQuest({
          ...test.options,
          write: true,
          previewToken,
        }),
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
      expect(snapshotTree(test.root)).toEqual(before);
    }
  });

  it("removes a newly created fence when source drifts before append", async () => {
    const test = await fixture();
    const preview = await importResearchQuest(test.options);
    const originalRead = fs.readFileSync.bind(fs);
    const sourceRealPath = fs.realpathSync(test.source);
    let sourceReads = 0;
    const read = vi
      .spyOn(fs, "readFileSync")
      .mockImplementation(
        (
          file: fs.PathOrFileDescriptor,
          ...args: Parameters<typeof fs.readFileSync> extends [
            unknown,
            ...infer Rest,
          ]
            ? Rest
            : never
        ): ReturnType<typeof fs.readFileSync> => {
          if (String(file) === sourceRealPath) {
            sourceReads += 1;
            if (sourceReads === 3) {
              const changed = JSON.parse(
                originalRead(test.source, "utf8"),
              ) as Record<string, unknown>;
              changed.objective = "Changed after fence creation.";
              fs.writeFileSync(test.source, JSON.stringify(changed));
            }
          }
          return originalRead(file, ...args);
        },
      );
    const ledgerLength = (await readResearchLedger(test.root)).length;
    const controlBefore = snapshotTree(path.join(test.root, ".trellis"));

    try {
      await expect(
        importResearchQuest({
          ...test.options,
          write: true,
          previewToken: preview.previewToken ?? undefined,
        }),
      ).rejects.toMatchObject({ code: "research_quest_source_drift" });
    } finally {
      read.mockRestore();
    }

    expect(await readResearchLedger(test.root)).toHaveLength(ledgerLength);
    expect(snapshotTree(path.join(test.root, ".trellis"))).toEqual(
      controlBefore,
    );
    expect(
      fs.existsSync(
        path.join(
          test.root,
          ".trellis",
          "research",
          "cutover-fences",
          `${preview.questId}.json`,
        ),
      ),
    ).toBe(false);
  });

  it("retains the fence after projection uncertainty and recovers deterministically", async () => {
    const test = await fixture();
    const preview = await importResearchQuest(test.options);
    const writerProjection = path.join(
      test.root,
      ".trellis",
      "research",
      "quests",
      preview.questId,
      "writer.json",
    );
    const originalRead = fs.readFileSync.bind(fs);
    const read = vi
      .spyOn(fs, "readFileSync")
      .mockImplementation(
        (
          file: fs.PathOrFileDescriptor,
          ...args: Parameters<typeof fs.readFileSync> extends [
            unknown,
            ...infer Rest,
          ]
            ? Rest
            : never
        ): ReturnType<typeof fs.readFileSync> => {
          if (String(file) === writerProjection) {
            throw new Error("injected writer projection read failure");
          }
          return originalRead(file, ...args);
        },
      );

    try {
      await expect(
        importResearchQuest({
          ...test.options,
          write: true,
          previewToken: preview.previewToken ?? undefined,
        }),
      ).rejects.toMatchObject({ code: "research_quest_transfer_unverified" });
    } finally {
      read.mockRestore();
    }

    const fence = path.join(
      test.root,
      ".trellis",
      "research",
      "cutover-fences",
      `${preview.questId}.json`,
    );
    expect(fs.existsSync(fence)).toBe(true);
    const ledgerLength = (await readResearchLedger(test.root)).length;
    const recovered = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    expect(recovered.replayed).toBe(true);
    expect(fs.existsSync(fence)).toBe(false);
    expect(await readResearchLedger(test.root)).toHaveLength(ledgerLength);
  });

  it("recovers a retained standalone source-to-Trellis transfer fence", async () => {
    const test = await fixture();
    const preview = await importResearchQuest(test.options);
    const imported = await importResearchQuest({
      ...test.options,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });
    const target = path.join(test.root, "transfer-recovery-export");
    const exported = await exportResearchQuest({
      root: test.root,
      quest: imported.questId,
      target,
      write: true,
    });
    await transferResearchQuestWriter({
      root: test.root,
      quest: imported.questId,
      to: "source",
      rationale: "Prepare standalone recovery",
      exportDigest: exported.exportDigest,
      write: true,
    });
    const state = await readResearchState(test.root);
    const importRecordId =
      state.latestQuestImportRecordIdByQuestId[imported.questId];
    const snapshotDigest =
      importRecordId === undefined
        ? undefined
        : state.questImportRecords[importRecordId]?.sourceSnapshot
            .snapshotDigest;
    if (snapshotDigest === undefined)
      throw new Error("Missing import snapshot");
    const writerProjection = path.join(
      test.root,
      ".trellis",
      "research",
      "quests",
      imported.questId,
      "writer.json",
    );
    const originalRead = fs.readFileSync.bind(fs);
    const read = vi
      .spyOn(fs, "readFileSync")
      .mockImplementation(
        (
          file: fs.PathOrFileDescriptor,
          ...args: Parameters<typeof fs.readFileSync> extends [
            unknown,
            ...infer Rest,
          ]
            ? Rest
            : never
        ): ReturnType<typeof fs.readFileSync> => {
          if (String(file) === writerProjection) {
            throw new Error("injected writer projection read failure");
          }
          return originalRead(file, ...args);
        },
      );
    try {
      await expect(
        transferResearchQuestWriter({
          root: test.root,
          quest: imported.questId,
          to: "trellis",
          rationale: "Recover standalone transfer",
          exportDigest: snapshotDigest,
          write: true,
        }),
      ).rejects.toMatchObject({ code: "research_quest_transfer_unverified" });
    } finally {
      read.mockRestore();
    }
    const fence = path.join(
      test.root,
      ".trellis",
      "research",
      "cutover-fences",
      `${imported.questId}.json`,
    );
    expect(fs.existsSync(fence)).toBe(true);
    const ledgerLength = (await readResearchLedger(test.root)).length;

    const recovered = await transferResearchQuestWriter({
      root: test.root,
      quest: imported.questId,
      to: "trellis",
      rationale: "Recover standalone transfer",
      exportDigest: snapshotDigest,
      write: true,
    });
    expect(recovered.replayed).toBe(true);
    expect(fs.existsSync(fence)).toBe(false);
    expect(await readResearchLedger(test.root)).toHaveLength(ledgerLength);
  });

  it("rejects conflicting mode flags before resolving root or source", async () => {
    await expect(
      importResearchQuest({
        root: "/missing",
        source: "/missing",
        dryRun: true,
        write: true,
      }),
    ).rejects.toThrow(/--dry-run cannot be combined with --write/);
  });
});

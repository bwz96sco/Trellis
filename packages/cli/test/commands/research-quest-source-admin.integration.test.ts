import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  commitResearchBatch,
  createRepositoryId,
  createWorkspaceId,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, describe, expect, it } from "vitest";

import {
  exportResearchQuest,
  importResearchQuest,
  transferResearchQuestWriter,
} from "../../src/commands/research/quest-cutover-command.js";

const SOURCE_ADMIN =
  process.env.TRELLIS_RESEARCH_QUEST_ADMIN ??
  "/Users/zhangbowen/Projects/agent-skills-private/skills/research-quest-admin/scripts/research_quest_admin.py";
const SOURCE_REPOSITORY = path.resolve(path.dirname(SOURCE_ADMIN), "../../..");

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

function spawnSourceAdmin(
  trellisRoot: string | undefined,
  ...args: string[]
): ReturnType<typeof spawnSync> {
  const env = { ...process.env };
  if (trellisRoot === undefined) delete env.TRELLIS_RESEARCH_ROOT;
  else env.TRELLIS_RESEARCH_ROOT = trellisRoot;
  return spawnSync("uv", ["run", "python", SOURCE_ADMIN, ...args], {
    cwd: SOURCE_REPOSITORY,
    encoding: "utf8",
    env,
  });
}

function rewriteProjection(
  file: string,
  transform: (value: Record<string, unknown>) => void,
): void {
  const value = JSON.parse(fs.readFileSync(file, "utf8")) as Record<
    string,
    unknown
  >;
  transform(value);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const sourceAdminDescribe = fs.existsSync(SOURCE_ADMIN)
  ? describe
  : describe.skip;

sourceAdminDescribe("real research Quest source-admin authority guard", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0))
      fs.rmSync(root, { recursive: true, force: true });
  });

  async function fixture(): Promise<{
    root: string;
    sourceRoot: string;
    source: string;
  }> {
    const container = fs.mkdtempSync(
      path.join(os.tmpdir(), "trellis-source-admin-guard-"),
    );
    roots.push(container);
    const root = path.join(container, "trellis");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    const repositoryId = createRepositoryId();
    await commitResearchBatch({
      root,
      actor: { type: "agent", id: "test" },
      provenance: { source: "test" },
      idempotencyKey: "source-admin-setup",
      mutations: [
        {
          kind: "workspace.create",
          workspace: {
            id: createWorkspaceId(),
            name: "Source admin guard",
            description: "",
          },
        },
        {
          kind: "repository.register",
          repository: {
            id: repositoryId,
            name: "Source",
            kind: "code",
            locator: "unresolved-source",
            capabilities: { hasTrellis: false },
          },
        },
      ],
    });
    const sourceRoot = path.join(container, "source");
    fs.mkdirSync(path.join(sourceRoot, "research"), { recursive: true });
    const bindingsDirectory = path.join(
      root,
      ".trellis",
      ".runtime",
      "research",
    );
    fs.mkdirSync(bindingsDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(bindingsDirectory, "repo-bindings.json"),
      `${JSON.stringify({ schemaVersion: 1, bindings: { [repositoryId]: sourceRoot } })}\n`,
    );
    fs.mkdirSync(path.join(root, ".trellis", "research", "quests"), {
      recursive: true,
    });
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
    fs.writeFileSync(path.join(sourceRoot, "research-events.jsonl"), "");
    fs.cpSync(
      path.join(sourceRoot, "research"),
      path.join(root, "unresolved-source", "research"),
      { recursive: true },
    );
    const source = path.join(sourceRoot, "research-quest.yaml");
    fs.writeFileSync(
      source,
      JSON.stringify({
        schema_version: "0.2",
        quest_id: "rq-source-admin",
        project_slug: "source-admin",
        title: "Source Admin Quest",
        objective: "Prove the single-writer source boundary.",
        status: "active",
        active_stage: "research-ideation",
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
    return { root, sourceRoot, source };
  }

  it("allows source ownership and refuses fences, Trellis ownership, malformed authority, and ambiguity byte-identically", async () => {
    const test = await fixture();
    const run = (...args: string[]) => spawnSourceAdmin(test.root, ...args);

    const neverImported = run(
      "status",
      "--root",
      test.sourceRoot,
      "--write",
    );
    expect(neverImported.status).toBe(0);
    expect(
      fs.existsSync(
        path.join(test.sourceRoot, "notes", "_quest", "QUEST_STATUS.md"),
      ),
    ).toBe(true);

    const siblingBefore = snapshotTree(test.sourceRoot);
    const siblingUnknown = spawnSourceAdmin(
      undefined,
      "status",
      "--root",
      test.sourceRoot,
      "--write",
    );
    expect(siblingUnknown.status).toBe(1);
    expect(siblingUnknown.stderr).toContain("TRELLIS_RESEARCH_ROOT");
    expect(snapshotTree(test.sourceRoot)).toEqual(siblingBefore);

    const emptyRootBefore = snapshotTree(test.sourceRoot);
    const emptyRoot = spawnSourceAdmin(
      "",
      "status",
      "--root",
      test.sourceRoot,
      "--write",
    );
    expect(emptyRoot.status).toBe(1);
    expect(emptyRoot.stderr).toContain("TRELLIS_RESEARCH_ROOT must not be empty");
    expect(snapshotTree(test.sourceRoot)).toEqual(emptyRootBefore);

    const malformedRoot = path.join(path.dirname(test.root), "malformed-trellis");
    fs.mkdirSync(malformedRoot);
    const other = await fixture();
    for (const invalidRoot of [
      path.join(path.dirname(test.root), "missing-trellis"),
      malformedRoot,
      other.root,
    ]) {
      const invalidBefore = snapshotTree(test.sourceRoot);
      const invalid = spawnSourceAdmin(
        invalidRoot,
        "status",
        "--root",
        test.sourceRoot,
        "--write",
      );
      expect(invalid.status).toBe(1);
      expect(invalid.stderr).toContain("source write denied");
      expect(snapshotTree(test.sourceRoot)).toEqual(invalidBefore);
    }

    const ambiguousRepository = await fixture();
    const secondRepositoryId = createRepositoryId();
    await commitResearchBatch({
      root: ambiguousRepository.root,
      actor: { type: "agent", id: "test" },
      provenance: { source: "test" },
      idempotencyKey: "source-admin-ambiguous-repository",
      mutations: [
        {
          kind: "repository.register",
          repository: {
            id: secondRepositoryId,
            name: "Second source binding",
            kind: "code",
            locator: "second-unresolved-source",
            capabilities: { hasTrellis: false },
          },
        },
      ],
    });
    const ambiguousBindingsFile = path.join(
      ambiguousRepository.root,
      ".trellis",
      ".runtime",
      "research",
      "repo-bindings.json",
    );
    const ambiguousBindings = JSON.parse(
      fs.readFileSync(ambiguousBindingsFile, "utf8"),
    ) as { schemaVersion: number; bindings: Record<string, string> };
    ambiguousBindings.bindings[secondRepositoryId] =
      ambiguousRepository.sourceRoot;
    fs.writeFileSync(
      ambiguousBindingsFile,
      `${JSON.stringify(ambiguousBindings)}\n`,
    );
    const ambiguousRepositoryBefore = snapshotTree(
      ambiguousRepository.sourceRoot,
    );
    const ambiguousRepositoryResult = spawnSourceAdmin(
      ambiguousRepository.root,
      "status",
      "--root",
      ambiguousRepository.sourceRoot,
      "--write",
    );
    expect(ambiguousRepositoryResult.status).toBe(1);
    expect(ambiguousRepositoryResult.stderr).toContain(
      "ambiguous source Repository",
    );
    expect(snapshotTree(ambiguousRepository.sourceRoot)).toEqual(
      ambiguousRepositoryBefore,
    );

    const preview = await importResearchQuest({
      root: test.root,
      source: test.source,
    });
    const imported = await importResearchQuest({
      root: test.root,
      source: test.source,
      write: true,
      previewToken: preview.previewToken ?? undefined,
    });

    const unrelatedRoot = path.join(test.root, "unrelated-source");
    const unrelatedInit = spawnSourceAdmin(
      undefined,
      "init",
      "--root",
      unrelatedRoot,
      "--write",
    );
    expect(unrelatedInit.status).toBe(0);
    expect(fs.existsSync(path.join(unrelatedRoot, "research-quest.yaml"))).toBe(
      true,
    );

    const deniedEvent = path.join(test.root, "candidate-event.json");
    fs.writeFileSync(
      deniedEvent,
      JSON.stringify({
        event_id: "evt-source-admin-denied",
        timestamp: "2026-08-24T00:00:00.000Z",
        actor: "operator",
        event_type: "route_changed",
        milestone: true,
        summary: "Should not append while Trellis owns writes.",
        artifacts: [],
        evidence: [],
        claim_updates: [],
      }),
    );

    const readOnlyBefore = snapshotTree(test.sourceRoot);
    for (const command of [
      ["status", "--root", test.sourceRoot],
      ["validate", "--root", test.sourceRoot],
    ]) {
      const result = run(...command);
      expect(result.status).toBe(0);
      expect(snapshotTree(test.sourceRoot)).toEqual(readOnlyBefore);
    }

    for (const command of [
      ["init", "--root", test.sourceRoot, "--force", "--write"],
      ["migrate", "--root", test.sourceRoot, "--force", "--write"],
      ["status", "--root", test.sourceRoot, "--write"],
      [
        "append-event",
        "--root",
        test.sourceRoot,
        "--event",
        deniedEvent,
        "--write",
      ],
    ]) {
      const before = snapshotTree(test.sourceRoot);
      const denied = run(...command);
      expect(denied.status).toBe(1);
      expect(denied.stderr).toContain("source write denied");
      expect(snapshotTree(test.sourceRoot)).toEqual(before);
    }

    const target = path.join(test.root, "source-admin-export");
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
      rationale: "Return authority for source-admin integration",
      exportDigest: exported.exportDigest,
      write: true,
    });
    const statusFile = path.join(
      test.sourceRoot,
      "notes",
      "_quest",
      "QUEST_STATUS.md",
    );
    fs.rmSync(statusFile);
    const sourceAllowed = run(
      "status",
      "--root",
      test.sourceRoot,
      "--write",
    );
    expect(sourceAllowed.status).toBe(0);
    expect(fs.existsSync(statusFile)).toBe(true);

    const sourceBytes = fs.readFileSync(test.source);
    const changedIdentity = JSON.parse(sourceBytes.toString("utf8")) as Record<
      string,
      unknown
    >;
    changedIdentity.quest_id = "rq-source-admin-changed";
    fs.writeFileSync(test.source, JSON.stringify(changedIdentity));
    const changedIdentityBefore = snapshotTree(test.sourceRoot);
    const changedIdentityResult = run(
      "status",
      "--root",
      test.sourceRoot,
      "--write",
    );
    expect(changedIdentityResult.status).toBe(1);
    expect(changedIdentityResult.stderr).toContain(
      "imported source identity differs",
    );
    expect(snapshotTree(test.sourceRoot)).toEqual(changedIdentityBefore);
    fs.writeFileSync(test.source, sourceBytes);

    const questDirectory = path.join(
      test.root,
      ".trellis",
      "research",
      "quests",
      imported.questId,
    );
    const writerFile = path.join(questDirectory, "writer.json");
    const writerBytes = fs.readFileSync(writerFile);
    const fence = path.join(
      test.root,
      ".trellis",
      "research",
      "cutover-fences",
      `${imported.questId}.json`,
    );
    fs.mkdirSync(path.dirname(fence), { recursive: true });
    fs.writeFileSync(
      fence,
      `${JSON.stringify({
        schemaVersion: 1,
        effect: "deny-source-writes",
        questId: imported.questId,
        source: {
          projectRoot: fs.realpathSync(test.sourceRoot),
          questPath: "research-quest.yaml",
          questAbsolutePath: fs.realpathSync(test.source),
        },
        previewToken: String(preview.previewToken),
      })}\n`,
    );
    for (const command of [
      ["init", "--root", test.sourceRoot, "--force", "--write"],
      ["migrate", "--root", test.sourceRoot, "--force", "--write"],
      ["status", "--root", test.sourceRoot, "--write"],
      [
        "append-event",
        "--root",
        test.sourceRoot,
        "--event",
        deniedEvent,
        "--write",
      ],
    ]) {
      const fencedBefore = snapshotTree(test.sourceRoot);
      const fenced = run(...command);
      expect(fenced.status).toBe(1);
      expect(fenced.stderr).toContain("active cutover fence");
      expect(snapshotTree(test.sourceRoot)).toEqual(fencedBefore);
    }
    fs.rmSync(fence);

    fs.writeFileSync(writerFile, "{}\n");
    const malformedBefore = snapshotTree(test.sourceRoot);
    const malformed = run(
      "status",
      "--root",
      test.sourceRoot,
      "--write",
    );
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toContain("source write denied");
    expect(snapshotTree(test.sourceRoot)).toEqual(malformedBefore);
    fs.writeFileSync(writerFile, writerBytes);

    const importFile = path.join(questDirectory, "import.json");
    const importBytes = fs.readFileSync(importFile);
    fs.rmSync(importFile);
    const missingImportBefore = snapshotTree(test.sourceRoot);
    const missingImport = run(
      "status",
      "--root",
      test.sourceRoot,
      "--write",
    );
    expect(missingImport.status).toBe(1);
    expect(missingImport.stderr).toContain("no import projection");
    expect(snapshotTree(test.sourceRoot)).toEqual(missingImportBefore);
    fs.writeFileSync(importFile, importBytes);

    const fakeQuestId = "qst_11111111-1111-4111-8111-111111111111";
    const fakeDirectory = path.join(
      test.root,
      ".trellis",
      "research",
      "quests",
      fakeQuestId,
    );
    fs.cpSync(questDirectory, fakeDirectory, { recursive: true });
    rewriteProjection(path.join(fakeDirectory, "quest.json"), (projection) => {
      const data = projection.data as Record<string, unknown>;
      data.id = fakeQuestId;
    });
    rewriteProjection(path.join(fakeDirectory, "import.json"), (projection) => {
      const data = projection.data as Record<string, unknown>;
      data.questId = fakeQuestId;
      for (const record of data.records as Record<string, unknown>[]) {
        record.questId = fakeQuestId;
      }
    });
    rewriteProjection(path.join(fakeDirectory, "writer.json"), (projection) => {
      const data = projection.data as Record<string, unknown>;
      const authority = data.authority as Record<string, unknown>;
      authority.questId = fakeQuestId;
      for (const transfer of data.transfers as Record<string, unknown>[]) {
        transfer.questId = fakeQuestId;
      }
    });
    const ambiguousBefore = snapshotTree(test.sourceRoot);
    const ambiguous = run(
      "status",
      "--root",
      test.sourceRoot,
      "--write",
    );
    expect(ambiguous.status).toBe(1);
    expect(ambiguous.stderr).toContain("ambiguous imported authority");
    expect(snapshotTree(test.sourceRoot)).toEqual(ambiguousBefore);
  }, 120_000);
});

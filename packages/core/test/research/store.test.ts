import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  commitResearchBatch,
  createArtifactId,
  createCampaignId,
  createQuestId,
  createRepositoryId,
  createRunId,
  createWorkspaceId,
  readResearchLedger,
  readResearchState,
  rebuildResearchProjections,
  researchPaths,
  ResearchProjectionError,
} from "../../src/research/index.js";

const ACTOR = { type: "agent" as const, id: "test" };
const PROVENANCE = { source: "test" };
const NOW = "2026-07-17T00:00:00.000Z";

function snapshotFiles(root: string): Map<string, string> {
  const out = new Map<string, string>();
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.set(path.relative(root, full), fs.readFileSync(full, "utf-8"));
    }
  }
  walk(root);
  return out;
}

describe("research store", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  async function initialize(): Promise<string> {
    const workspaceId = createWorkspaceId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "init",
      timestamp: NOW,
      mutations: [
        {
          kind: "workspace.create",
          workspace: {
            id: workspaceId,
            name: "Research",
            description: "",
          },
        },
      ],
    });
    return workspaceId;
  }

  it("returns prior success for a duplicate idempotency key", async () => {
    await initialize();
    const questId = createQuestId();
    const first = await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "quest-1",
      timestamp: NOW,
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Original",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });
    const replay = await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "quest-1",
      timestamp: "2026-07-18T00:00:00.000Z",
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: createQuestId(),
            title: "Drifted retry",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });

    expect(replay.replayed).toBe(true);
    expect(replay.events).toEqual(first.events);
    expect((await readResearchLedger(root))).toHaveLength(2);
  });

  it("serializes concurrent writers into a contiguous ledger", async () => {
    await initialize();
    const count = 24;
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        commitResearchBatch({
          root,
          actor: ACTOR,
          provenance: PROVENANCE,
          idempotencyKey: `quest-${index}`,
          timestamp: `2026-07-17T00:00:${String(index).padStart(2, "0")}.000Z`,
          mutations: [
            {
              kind: "quest.create",
              quest: {
                id: createQuestId(),
                title: `Quest ${index}`,
                description: "",
                repositoryIds: [],
                artifactRefs: [],
              },
            },
          ],
        }),
      ),
    );

    const events = await readResearchLedger(root);
    expect(events.map((event) => event.seq)).toEqual(
      Array.from({ length: count + 1 }, (_, index) => index + 1),
    );
  });

  it("validates a complete batch before appending any event", async () => {
    await initialize();
    const before = await readResearchLedger(root);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "invalid-batch",
        timestamp: NOW,
        mutations: [
          {
            kind: "quest.create",
            quest: {
              id: createQuestId(),
              title: "Valid first mutation",
              description: "",
              repositoryIds: [],
              artifactRefs: [],
            },
          },
          {
            kind: "campaign.create",
            campaign: {
              id: createCampaignId(),
              questId: createQuestId(),
              title: "Missing quest",
              protocolDigest: "sha256:abc",
            },
          },
        ],
      }),
    ).rejects.toThrow(/quest/);
    expect(await readResearchLedger(root)).toEqual(before);
  });

  it("recovers from projection failure with a deterministic rebuild", async () => {
    await initialize();
    const questId = createQuestId();
    const paths = researchPaths(root);
    const projection = path.join(paths.questsDir, questId, "quest.json");
    fs.mkdirSync(projection, { recursive: true });

    let failure: unknown;
    try {
      await commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "projection-failure",
        timestamp: NOW,
        mutations: [
          {
            kind: "quest.create",
            quest: {
              id: questId,
              title: "Recoverable",
              description: "",
              repositoryIds: [],
              artifactRefs: [],
            },
          },
        ],
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ResearchProjectionError);
    expect((failure as ResearchProjectionError).headSeq).toBe(2);
    expect(await readResearchLedger(root)).toHaveLength(2);

    fs.rmSync(projection, { recursive: true, force: true });
    await rebuildResearchProjections(root);
    const first = snapshotFiles(paths.researchDir);
    await rebuildResearchProjections(root);
    const second = snapshotFiles(paths.researchDir);
    expect(second).toEqual(first);
    expect(
      JSON.parse(fs.readFileSync(projection, "utf-8")).projectedThroughSeq,
    ).toBe(2);
  });

  it("writes per-entity projections through the current ledger head", async () => {
    await initialize();
    const firstQuestId = createQuestId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "first-projection",
      timestamp: NOW,
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: firstQuestId,
            title: "First",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "second-projection",
      timestamp: "2026-07-18T00:00:00.000Z",
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: createQuestId(),
            title: "Second",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });

    const paths = researchPaths(root);
    const firstProjection = path.join(
      paths.questsDir,
      firstQuestId,
      "quest.json",
    );
    expect(
      JSON.parse(fs.readFileSync(firstProjection, "utf-8")).projectedThroughSeq,
    ).toBe(3);
    expect(
      JSON.parse(fs.readFileSync(paths.workspaceFile, "utf-8"))
        .projectedThroughSeq,
    ).toBe(3);
  });

  it("keeps protocol digests immutable after freeze and run terminals immutable", async () => {
    await initialize();
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "setup-lifecycle",
      timestamp: NOW,
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: questId,
            title: "Quest",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
        {
          kind: "campaign.create",
          campaign: {
            id: campaignId,
            questId,
            title: "Campaign",
            protocolDigest: "sha256:one",
          },
        },
        { kind: "campaign.freeze", campaignId },
        {
          kind: "run.create",
          run: { id: runId, campaignId, title: "Run" },
        },
        { kind: "run.status", runId, status: "running" },
        { kind: "run.status", runId, status: "succeeded" },
      ],
    });

    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "change-frozen-protocol",
        timestamp: NOW,
        mutations: [
          {
            kind: "campaign.protocol",
            campaignId,
            protocolDigest: "sha256:two",
          },
        ],
      }),
    ).rejects.toThrow(/frozen/);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "restart-terminal-run",
        timestamp: NOW,
        mutations: [{ kind: "run.status", runId, status: "running" }],
      }),
    ).rejects.toThrow(/transition/);

    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "invalidate-terminal-run",
      timestamp: NOW,
      mutations: [
        { kind: "run.invalidate", runId, reason: "Bad source data" },
      ],
    });
    expect((await readResearchState(root)).runs[runId]?.status).toBe(
      "invalidated",
    );
  });

  it("rejects artifact references to unresolved repositories", async () => {
    await initialize();
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "bad-artifact",
        timestamp: NOW,
        mutations: [
          {
            kind: "artifact.register",
            artifact: {
              id: createArtifactId(),
              repositoryId: createRepositoryId(),
              path: "results/data.json",
            },
          },
        ],
      }),
    ).rejects.toThrow(/repository/);
  });

  it("validates optional artifact SHA-256 before append", async () => {
    await initialize();
    const repositoryId = createRepositoryId();
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "register-repository",
      timestamp: NOW,
      mutations: [
        {
          kind: "repository.register",
          repository: {
            id: repositoryId,
            name: "repo",
            kind: "code",
            locator: "repo",
            capabilities: { hasTrellis: false },
          },
        },
      ],
    });
    fs.mkdirSync(path.join(root, "repo", "results"), { recursive: true });
    fs.writeFileSync(path.join(root, "repo", "results", "data.txt"), "data");

    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "valid-digest",
      timestamp: NOW,
      mutations: [
        {
          kind: "artifact.register",
          artifact: {
            id: createArtifactId(),
            repositoryId,
            path: "results/data.txt",
            sha256:
              "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7",
          },
        },
      ],
    });

    const boundRepositoryId = createRepositoryId();
    const boundRoot = path.join(root, "machine-bound-repo");
    fs.mkdirSync(path.join(boundRoot, "results"), { recursive: true });
    fs.writeFileSync(path.join(boundRoot, "results", "data.txt"), "data");
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "register-bound-repository",
      timestamp: NOW,
      mutations: [
        {
          kind: "repository.register",
          repository: {
            id: boundRepositoryId,
            name: "bound repo",
            kind: "code",
            locator: "missing-locator",
            capabilities: { hasTrellis: false },
          },
        },
      ],
    });
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "valid-bound-digest",
      timestamp: NOW,
      artifactRepositoryRoots: { [boundRepositoryId]: boundRoot },
      mutations: [
        {
          kind: "artifact.register",
          artifact: {
            id: createArtifactId(),
            repositoryId: boundRepositoryId,
            path: "results/data.txt",
            sha256:
              "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7",
          },
        },
      ],
    });
    expect(fs.readFileSync(researchPaths(root).eventsFile, "utf-8")).not.toContain(
      boundRoot,
    );

    const before = await readResearchLedger(root);
    await expect(
      commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "invalid-digest",
        timestamp: NOW,
        mutations: [
          {
            kind: "artifact.register",
            artifact: {
              id: createArtifactId(),
              repositoryId,
              path: "results/data.txt",
              sha256: "0".repeat(64),
            },
          },
        ],
      }),
    ).rejects.toThrow(/sha256/);
    expect(await readResearchLedger(root)).toEqual(before);
  });

  it.runIf(process.platform !== "win32")(
    "rejects digest paths that escape through a symbolic link",
    async () => {
      await initialize();
      const repositoryId = createRepositoryId();
      await commitResearchBatch({
        root,
        actor: ACTOR,
        provenance: PROVENANCE,
        idempotencyKey: "register-symlink-repository",
        timestamp: NOW,
        mutations: [
          {
            kind: "repository.register",
            repository: {
              id: repositoryId,
              name: "repo",
              kind: "code",
              locator: "repo",
              capabilities: { hasTrellis: false },
            },
          },
        ],
      });
      const repositoryRoot = path.join(root, "repo");
      const outsideFile = path.join(root, "outside.txt");
      fs.mkdirSync(path.join(repositoryRoot, "results"), { recursive: true });
      fs.writeFileSync(outsideFile, "data");
      fs.symlinkSync(outsideFile, path.join(repositoryRoot, "results", "link.txt"));
      const before = await readResearchLedger(root);

      await expect(
        commitResearchBatch({
          root,
          actor: ACTOR,
          provenance: PROVENANCE,
          idempotencyKey: "symlink-artifact",
          timestamp: NOW,
          mutations: [
            {
              kind: "artifact.register",
              artifact: {
                id: createArtifactId(),
                repositoryId,
                path: "results/link.txt",
                sha256:
                  "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7",
              },
            },
          ],
        }),
      ).rejects.toThrow(/escapes repository/);
      expect(await readResearchLedger(root)).toEqual(before);
    },
  );

  it("repairs a stale runtime sequence cache from the ledger head", async () => {
    await initialize();
    const paths = researchPaths(root);
    fs.writeFileSync(paths.seqFile, "99\n", "utf-8");
    await commitResearchBatch({
      root,
      actor: ACTOR,
      provenance: PROVENANCE,
      idempotencyKey: "after-stale-seq",
      timestamp: NOW,
      mutations: [
        {
          kind: "quest.create",
          quest: {
            id: createQuestId(),
            title: "Contiguous",
            description: "",
            repositoryIds: [],
            artifactRefs: [],
          },
        },
      ],
    });
    expect((await readResearchLedger(root)).map((event) => event.seq)).toEqual([
      1, 2,
    ]);
    expect(fs.readFileSync(paths.seqFile, "utf-8").trim()).toBe("2");
  });

  it("keeps lock, sequence, and cache files under runtime research", async () => {
    await initialize();
    const paths = researchPaths(root);
    expect(paths.lockFile.startsWith(paths.runtimeDir)).toBe(true);
    expect(paths.seqFile.startsWith(paths.runtimeDir)).toBe(true);
    expect(paths.cacheFile.startsWith(paths.runtimeDir)).toBe(true);
    expect(fs.readFileSync(paths.seqFile, "utf-8").trim()).toBe("1");
    expect(fs.existsSync(paths.cacheFile)).toBe(true);
    expect(fs.existsSync(paths.workspaceFile)).toBe(true);
    expect(fs.existsSync(paths.repositoriesFile)).toBe(true);
  });
});

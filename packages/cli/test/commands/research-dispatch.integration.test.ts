import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createArtifactId,
  createCampaignId,
  createDispatchId,
  createProposalId,
  createQuestId,
  createResultId,
  createRunId,
  readResearchLedger,
  readResearchState,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyResearchProposal,
  prepareResearchDispatch,
  recordResearchDispatchResult,
  rejectResearchProposal,
} from "../../src/commands/research/dispatch-command.js";
import {
  createResearchCampaign,
  createResearchQuest,
  createResearchRun,
  initializeResearch,
} from "../../src/commands/research/command.js";
import { ResearchDispatchFileError } from "../../src/commands/research/errors.js";
import {
  addResearchRepository,
  bindResearchRepository,
  listResearchRepositories,
  resolveRepositoryForUse,
  resolveResearchRepository,
} from "../../src/commands/research/repository.js";

function git(repository: string, ...args: string[]): string {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: "utf-8",
  }).trim();
}

function initializeGitRepository(repository: string): string {
  fs.mkdirSync(repository, { recursive: true });
  git(repository, "init", "-q");
  git(repository, "config", "user.name", "Research Test");
  git(repository, "config", "user.email", "research@example.test");
  fs.writeFileSync(path.join(repository, "README.md"), "research\n");
  git(repository, "add", "README.md");
  git(repository, "commit", "-qm", "initial");
  return git(repository, "rev-parse", "HEAD");
}

function trackedFiles(root: string): string[] {
  const dispatches = path.join(root, ".trellis", "research", "dispatches");
  if (!fs.existsSync(dispatches)) return [];
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(dispatches);
  return files;
}

describe("research repositories and dispatch integration", () => {
  let sandbox: string;
  let root: string;
  let child: string;
  let sibling: string;

  beforeEach(async () => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-dispatch-"));
    root = path.join(sandbox, "control");
    child = path.join(root, "repos", "child");
    sibling = path.join(sandbox, "sibling");
    fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
    initializeGitRepository(child);
    initializeGitRepository(sibling);
    await initializeResearch({ root, name: "Dispatch lab" });
  });

  afterEach(() => {
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("registers, lists, resolves, and binds child and sibling repositories", async () => {
    const childRegistration = await addResearchRepository({
      root,
      name: "child",
      kind: "code",
      locator: "repos/child",
      hasTrellis: false,
    });
    const siblingRegistration = await addResearchRepository({
      root,
      name: "sibling",
      kind: "data",
      locator: "../sibling",
      hasTrellis: false,
    });

    expect((await listResearchRepositories({ root })).repositories).toEqual([
      childRegistration.repository,
      siblingRegistration.repository,
    ].sort((a, b) => a.id.localeCompare(b.id)));
    expect(
      (await resolveResearchRepository({
        root,
        repositoryId: childRegistration.repository.id,
      })).observation.path,
    ).toBe(fs.realpathSync(child));
    expect(
      (await resolveResearchRepository({
        root,
        repositoryId: siblingRegistration.repository.id,
      })).observation.path,
    ).toBe(fs.realpathSync(sibling));
    expect(fs.existsSync(path.join(child, ".trellis"))).toBe(false);
    expect(fs.existsSync(path.join(sibling, ".trellis"))).toBe(false);

    const alternate = path.join(sandbox, "alternate-child");
    initializeGitRepository(alternate);
    const repositoriesProjection = fs.readFileSync(
      path.join(root, ".trellis", "research", "repositories.json"),
      "utf-8",
    );
    await bindResearchRepository({
      root,
      repositoryId: childRegistration.repository.id,
      path: alternate,
    });
    const rebound = await resolveResearchRepository({
      root,
      repositoryId: childRegistration.repository.id,
    });
    expect(rebound.source).toBe("binding");
    expect(rebound.observation.path).toBe(fs.realpathSync(alternate));
    expect(
      fs.readFileSync(
        path.join(root, ".trellis", "research", "repositories.json"),
        "utf-8",
      ),
    ).toBe(repositoriesProjection);

    const observations = path.join(
      root,
      ".trellis",
      ".runtime",
      "research",
      "repo-observations.json",
    );
    fs.writeFileSync(
      observations,
      JSON.stringify({
        schemaVersion: 1,
        repositories: { [childRegistration.repository.id]: { dirty: false } },
      }),
    );
    await expect(
      resolveResearchRepository({
        root,
        repositoryId: childRegistration.repository.id,
      }),
    ).rejects.toThrow(/Invalid research repository observations/);
    const malformedObservation = fs.readFileSync(observations, "utf-8");
    await expect(
      resolveRepositoryForUse(root, childRegistration.repository.id, false),
    ).rejects.toThrow(/Invalid research repository observations/);
    expect(fs.readFileSync(observations, "utf-8")).toBe(malformedObservation);
  });

  it("fails on remote mismatch, malformed bindings, and unresolved locators", async () => {
    git(child, "remote", "add", "origin", "git@example.test:actual.git");
    const mismatch = await addResearchRepository({
      root,
      name: "mismatch",
      kind: "code",
      locator: "repos/child",
      expectedRemote: "git@example.test:expected.git",
    });
    await expect(
      resolveResearchRepository({ root, repositoryId: mismatch.repository.id }),
    ).rejects.toThrow(/expected remote/);

    const missing = await addResearchRepository({
      root,
      name: "missing",
      kind: "notes",
      locator: "repos/missing",
    });
    await expect(
      resolveResearchRepository({ root, repositoryId: missing.repository.id }),
    ).rejects.toThrow(/repo bind/);

    const bindings = path.join(
      root,
      ".trellis",
      ".runtime",
      "research",
      "repo-bindings.json",
    );
    fs.mkdirSync(path.dirname(bindings), { recursive: true });
    fs.writeFileSync(
      bindings,
      JSON.stringify({
        schemaVersion: 1,
        bindings: { [mismatch.repository.id]: "relative/path" },
      }),
    );
    await expect(
      resolveResearchRepository({ root, repositoryId: mismatch.repository.id }),
    ).rejects.toThrow(/absolute path/);

    fs.writeFileSync(bindings, "{broken}\n");
    await expect(
      resolveResearchRepository({ root, repositoryId: mismatch.repository.id }),
    ).rejects.toThrow(/Invalid research repository bindings/);
  });

  it("recovers a committed dispatch after a tracked request write failure", async () => {
    const repository = (
      await addResearchRepository({
        root,
        name: "child",
        kind: "code",
        locator: "repos/child",
      })
    ).repository;
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    const dispatchId = createDispatchId();
    await createResearchQuest({ root, id: questId, title: "Recovery quest" });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Campaign",
      protocolDigest: "protocol-v1",
    });
    await createResearchRun({ root, id: runId, campaignId, title: "Run" });

    const requestTarget = path.join(
      root,
      ".trellis",
      "research",
      "dispatches",
      dispatchId,
      "request.json",
    );
    fs.mkdirSync(requestTarget, { recursive: true });
    const options = {
      root,
      id: dispatchId,
      runId,
      questId,
      campaignId,
      repositoryId: repository.id,
      ownerSkill: "research-runner",
      objective: "Exercise recovery",
      acceptanceCriteria: [],
      allowedWritePaths: ["results/report.json"],
      expectedOutputs: [],
      checks: [],
      idempotencyKey: "prepare:recovery",
    };

    let failure: unknown;
    try {
      await prepareResearchDispatch(options);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ResearchDispatchFileError);
    expect(failure).toMatchObject({
      committed: true,
      target: `.trellis/research/dispatches/${dispatchId}/request.json`,
    });
    expect((await readResearchState(root)).dispatches[dispatchId]).toBeDefined();

    fs.rmSync(requestTarget, { recursive: true, force: true });
    const recovered = await prepareResearchDispatch(options);
    expect(recovered.replayed).toBe(true);
    expect(fs.existsSync(path.join(root, recovered.requestFile ?? ""))).toBe(true);
    expect(fs.existsSync(path.join(root, recovered.manifestFile ?? ""))).toBe(true);
  });

  it("prepares, records, dry-runs, applies a subset, and replays idempotently", async () => {
    const repository = (
      await addResearchRepository({
        root,
        name: "child",
        kind: "code",
        locator: "repos/child",
      })
    ).repository;
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    await createResearchQuest({ root, id: questId, title: "Dispatch quest" });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Campaign",
      protocolDigest: "protocol-v1",
    });
    await createResearchRun({ root, id: runId, campaignId, title: "Run" });

    const beforeInvalidPrepare = await readResearchLedger(root);
    await expect(
      prepareResearchDispatch({
        root,
        runId,
        questId: createQuestId(),
        campaignId,
        repositoryId: repository.id,
        ownerSkill: "research-runner",
        objective: "Wrong hierarchy",
        acceptanceCriteria: [],
        allowedWritePaths: ["results/report.json"],
        expectedOutputs: [],
        checks: [],
      }),
    ).rejects.toThrow(/belongs to quest/);
    await expect(
      prepareResearchDispatch({
        root,
        runId,
        questId,
        campaignId,
        repositoryId: repository.id,
        ownerSkill: "research-runner",
        objective: "Escaping write",
        acceptanceCriteria: [],
        allowedWritePaths: ["../escape"],
        expectedOutputs: [],
        checks: [],
      }),
    ).rejects.toThrow(/escape/);
    expect(await readResearchLedger(root)).toEqual(beforeInvalidPrepare);

    const prepared = await prepareResearchDispatch({
      root,
      runId,
      questId,
      campaignId,
      repositoryId: repository.id,
      ownerSkill: "research-runner",
      objective: "Produce a bounded report",
      acceptanceCriteria: ["Report is complete"],
      allowedWritePaths: ["results/report.json"],
      expectedOutputs: ["report"],
      checks: ["test -f results/report.json"],
      taskRef: "task:dispatch-test",
      idempotencyKey: "prepare:dispatch",
    });
    expect(prepared.requestFile).toMatch(/request\.json$/);
    expect(prepared.manifestFile).toMatch(/manifest\.json$/);
    const requestText = fs.readFileSync(path.join(root, prepared.requestFile ?? ""), "utf-8");
    expect(requestText.endsWith("\n")).toBe(true);
    expect(requestText).not.toContain(root);
    expect(requestText).not.toContain(child);

    const resultInput = path.join(sandbox, "result.json");
    const proposalId = createProposalId();
    const resultRevision = git(child, "rev-parse", "HEAD");
    const baseResult = {
      id: createResultId(),
      dispatchId: prepared.dispatch.id,
      runId,
      status: "completed",
      summary: "Completed bounded analysis",
      commands: ["node analyze.js"],
      checks: ["report exists"],
      artifactRefs: [],
      revision: resultRevision,
      dirtySummary: "",
      blockers: [],
      sessionRef: "session:worker-1",
      createdAt: "2026-07-17T00:00:00.000Z",
    } as const;
    fs.writeFileSync(
      resultInput,
      JSON.stringify({
        result: baseResult,
        proposal: {
          id: proposalId,
          dispatchId: prepared.dispatch.id,
          questId: createQuestId(),
          title: "Invalid relation",
          operations: [],
          status: "pending",
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z",
        },
      }),
    );
    const beforeInvalidResult = await readResearchLedger(root);
    await expect(
      recordResearchDispatchResult({
        root,
        dispatchId: prepared.dispatch.id,
        file: resultInput,
      }),
    ).rejects.toThrow(/Proposal IDs/);
    expect(await readResearchLedger(root)).toEqual(beforeInvalidResult);

    fs.writeFileSync(
      resultInput,
      JSON.stringify({
        result: baseResult,
        proposal: {
          id: proposalId,
          dispatchId: prepared.dispatch.id,
          questId,
          title: "Advance review",
          operations: [
            { kind: "quest.stage", questId, stage: "audit" },
            { kind: "run.status", runId, status: "running" },
          ],
          status: "pending",
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z",
        },
      }),
    );
    const recorded = await recordResearchDispatchResult({
      root,
      dispatchId: prepared.dispatch.id,
      file: resultInput,
      idempotencyKey: "record:result",
    });
    expect(recorded.events.map((event) => event.kind)).toEqual([
      "result.recorded",
      "proposal.recorded",
    ]);

    const ledgerBeforeDryRun = await readResearchLedger(root);
    const dryRun = await applyResearchProposal({
      root,
      proposalId,
      operationIndexes: [0],
      rationale: "Preview",
      dryRun: true,
    });
    expect(dryRun.dryRun).toBe(true);
    expect(dryRun.decisionFile).toBeNull();
    expect(await readResearchLedger(root)).toEqual(ledgerBeforeDryRun);

    fs.writeFileSync(path.join(child, "README.md"), "changed\n");
    git(child, "add", "README.md");
    git(child, "commit", "-qm", "change revision");
    await expect(
      applyResearchProposal({
        root,
        proposalId,
        operationIndexes: [0],
        rationale: "Revision must match",
      }),
    ).rejects.toThrow(/expected revision/);
    expect(await readResearchLedger(root)).toEqual(ledgerBeforeDryRun);
    git(child, "reset", "--hard", resultRevision);

    const applied = await applyResearchProposal({
      root,
      proposalId,
      operationIndexes: [0],
      rationale: "Approved selected operation",
    });
    expect(applied.appliedEventIds).toHaveLength(1);
    expect(applied.rejectedOperationIndexes).toEqual([1]);
    const state = await readResearchState(root);
    expect(state.quests[questId]?.stage).toBe("audit");
    expect(state.runs[runId]?.status).toBe("planned");
    const decisionPath = path.join(root, applied.decisionFile ?? "");
    const decisionFile = JSON.parse(fs.readFileSync(decisionPath, "utf-8"));
    expect(decisionFile.appliedEventIds).toEqual(applied.appliedEventIds);

    fs.rmSync(decisionPath);
    fs.mkdirSync(decisionPath);
    let recoveryFailure: unknown;
    try {
      await applyResearchProposal({
        root,
        proposalId,
        operationIndexes: [0],
        rationale: "Recover decision file",
      });
    } catch (error) {
      recoveryFailure = error;
    }
    expect(recoveryFailure).toBeInstanceOf(ResearchDispatchFileError);
    expect(recoveryFailure).toMatchObject({
      committed: true,
      target: `.trellis/research/dispatches/${prepared.dispatch.id}/decision.json`,
    });
    fs.rmSync(decisionPath, { recursive: true, force: true });

    const head = (await readResearchLedger(root)).length;
    const replay = await applyResearchProposal({
      root,
      proposalId,
      operationIndexes: [0],
      rationale: "Retry",
    });
    expect(replay.replayed).toBe(true);
    expect(replay.decision.id).toBe(applied.decision.id);
    expect(await readResearchLedger(root)).toHaveLength(head);

    for (const file of trackedFiles(root)) {
      const text = fs.readFileSync(file, "utf-8");
      expect(text.endsWith("\n")).toBe(true);
      expect(text).not.toContain(root);
      expect(text).not.toContain(child);
    }
  });

  it("uses a runtime binding for core digest validation without tracking the absolute path", async () => {
    const repository = (
      await addResearchRepository({
        root,
        name: "bound child",
        kind: "code",
        locator: "repos/missing-child",
      })
    ).repository;
    await bindResearchRepository({
      root,
      repositoryId: repository.id,
      path: child,
    });
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    await createResearchQuest({ root, id: questId, title: "Bound digest quest" });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Campaign",
      protocolDigest: "protocol-v1",
    });
    await createResearchRun({ root, id: runId, campaignId, title: "Run" });
    const prepared = await prepareResearchDispatch({
      root,
      runId,
      questId,
      repositoryId: repository.id,
      ownerSkill: "runner",
      objective: "Produce a bound artifact",
      acceptanceCriteria: [],
      allowedWritePaths: ["results/bound.txt"],
      expectedOutputs: [],
      checks: [],
    });

    const artifactPath = path.join(child, "results", "bound.txt");
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, "bound data");
    const artifactId = createArtifactId();
    const proposalId = createProposalId();
    const input = path.join(sandbox, "bound-result.json");
    fs.writeFileSync(
      input,
      JSON.stringify({
        result: {
          id: createResultId(),
          dispatchId: prepared.dispatch.id,
          runId,
          status: "completed",
          summary: "Produced bound artifact",
          commands: [],
          checks: [],
          artifactRefs: [],
          blockers: [],
          createdAt: "2026-07-17T00:00:00.000Z",
        },
        proposal: {
          id: proposalId,
          dispatchId: prepared.dispatch.id,
          questId,
          title: "Register bound artifact",
          operations: [
            {
              kind: "artifact.register",
              artifact: {
                id: artifactId,
                repositoryId: repository.id,
                path: "results/bound.txt",
                sha256: createHash("sha256")
                  .update(fs.readFileSync(artifactPath))
                  .digest("hex"),
              },
            },
          ],
          status: "pending",
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z",
        },
      }),
    );
    await recordResearchDispatchResult({
      root,
      dispatchId: prepared.dispatch.id,
      file: input,
    });
    await applyResearchProposal({
      root,
      proposalId,
      rationale: "Bound digest verified",
    });

    expect((await readResearchState(root)).artifacts[artifactId]).toBeDefined();
    expect(
      fs.readFileSync(
        path.join(root, ".trellis", "research", "events.jsonl"),
        "utf-8",
      ),
    ).not.toContain(child);
  });

  it("rejects a proposal without applying operations and verifies artifacts on apply", async () => {
    const repository = (
      await addResearchRepository({
        root,
        name: "child",
        kind: "code",
        locator: "repos/child",
      })
    ).repository;
    const questId = createQuestId();
    const campaignId = createCampaignId();
    const runId = createRunId();
    await createResearchQuest({ root, id: questId, title: "Reject quest" });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Campaign",
      protocolDigest: "protocol-v1",
    });
    await createResearchRun({ root, id: runId, campaignId, title: "Run" });
    const prepared = await prepareResearchDispatch({
      root,
      runId,
      questId,
      repositoryId: repository.id,
      ownerSkill: "runner",
      objective: "Inspect",
      acceptanceCriteria: [],
      allowedWritePaths: ["results/data.txt"],
      expectedOutputs: [],
      checks: [],
    });

    const artifactPath = path.join(child, "results", "data.txt");
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, "data");
    const artifactId = createArtifactId();
    const proposalId = createProposalId();
    const input = path.join(sandbox, "artifact-result.json");
    fs.writeFileSync(
      input,
      JSON.stringify({
        result: {
          id: createResultId(),
          dispatchId: prepared.dispatch.id,
          runId,
          status: "completed",
          summary: "Artifact produced",
          commands: [],
          checks: [],
          artifactRefs: [],
          blockers: [],
          createdAt: "2026-07-17T00:00:00.000Z",
        },
        proposal: {
          id: proposalId,
          dispatchId: prepared.dispatch.id,
          questId,
          title: "Register artifact",
          operations: [
            {
              kind: "artifact.register",
              artifact: {
                id: artifactId,
                repositoryId: repository.id,
                path: "results/data.txt",
                sha256: "0".repeat(64),
              },
            },
          ],
          status: "pending",
          createdAt: "2026-07-17T00:00:00.000Z",
          updatedAt: "2026-07-17T00:00:00.000Z",
        },
      }),
    );
    await recordResearchDispatchResult({
      root,
      dispatchId: prepared.dispatch.id,
      file: input,
    });
    const before = await readResearchLedger(root);
    await expect(
      applyResearchProposal({
        root,
        proposalId,
        rationale: "Verify first",
      }),
    ).rejects.toThrow(/sha256/);
    expect(await readResearchLedger(root)).toEqual(before);

    const rejected = await rejectResearchProposal({
      root,
      proposalId,
      rationale: "Digest does not match",
    });
    expect(rejected.appliedEventIds).toEqual([]);
    expect((await readResearchState(root)).artifacts[artifactId]).toBeUndefined();
    const replay = await rejectResearchProposal({
      root,
      proposalId,
      rationale: "Retry",
    });
    expect(replay.decision.id).toBe(rejected.decision.id);

    expect(
      createHash("sha256").update(fs.readFileSync(artifactPath)).digest("hex"),
    ).not.toBe("0".repeat(64));
  });
});

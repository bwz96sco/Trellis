import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createCampaignId,
  createClaimId,
  createEvidenceId,
  createProposalId,
  createQuestId,
  createResultId,
  createRunId,
  readResearchLedger,
  readResearchState,
  researchPaths,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("figlet", () => ({
  default: { textSync: vi.fn(() => "TRELLIS") },
}));

import { init } from "../../src/commands/init.js";
import {
  createResearchCampaign,
  createResearchClaim,
  createResearchEvidence,
  createResearchQuest,
  createResearchRun,
  freezeResearchCampaign,
  initializeResearch,
  rebuildResearch,
  researchStatus,
  setResearchCampaignStatus,
  setResearchClaimStatus,
  setResearchQuestStage,
  setResearchQuestStatus,
  setResearchRunStatus,
  validateResearch,
} from "../../src/commands/research/command.js";
import {
  applyResearchProposal,
  prepareResearchDispatch,
  recordResearchDispatchResult,
} from "../../src/commands/research/dispatch-command.js";
import { addResearchRepository } from "../../src/commands/research/repository.js";
import { update } from "../../src/commands/update.js";
import { PATHS } from "../../src/constants/paths.js";
import { VERSION } from "../../src/constants/version.js";
import { researchWorkflowMdTemplate } from "../../src/templates/trellis/index.js";
import { replacePythonCommandLiterals } from "../../src/configurators/shared.js";
import {
  loadHashes,
  removeHash,
  updateHashes,
} from "../../src/utils/template-hash.js";
import {
  clearWorkflowSelection,
  loadWorkflowSelection,
} from "../../src/utils/workflow-selection.js";

const noop = (): void => undefined;
const RESULT_TIME = "2026-07-18T00:00:00.000Z";

function git(repository: string, ...args: string[]): string {
  return execFileSync("git", ["-C", repository, ...args], {
    encoding: "utf-8",
  }).trim();
}

function initializeGitRepository(repository: string, label: string): void {
  fs.mkdirSync(repository, { recursive: true });
  git(repository, "init", "-q");
  git(repository, "config", "user.name", "Research Workflow Test");
  git(repository, "config", "user.email", "research-workflow@example.test");
  fs.writeFileSync(path.join(repository, "README.md"), `${label}\n`, "utf-8");
  git(repository, "add", "README.md");
  git(repository, "commit", "-qm", "initial fixture");
}

function snapshotFiles(directory: string): Map<string, string> {
  const files = new Map<string, string>();
  if (!fs.existsSync(directory)) return files;
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else
        files.set(
          path.relative(directory, absolute),
          fs.readFileSync(absolute, "utf-8"),
        );
    }
  };
  walk(directory);
  return files;
}

function collectStrings(value: unknown, strings: string[]): void {
  if (typeof value === "string") {
    strings.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, strings);
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const entry of Object.values(value)) collectStrings(entry, strings);
  }
}

function trackedResearchStrings(root: string): string[] {
  const strings: string[] = [];
  const researchDir = researchPaths(root).researchDir;
  for (const [relativePath, content] of snapshotFiles(researchDir)) {
    if (relativePath === "events.jsonl") {
      for (const line of content
        .split("\n")
        .filter((entry) => entry.length > 0)) {
        collectStrings(JSON.parse(line), strings);
      }
    } else if (relativePath.endsWith(".json")) {
      collectStrings(JSON.parse(content), strings);
    }
  }
  return strings;
}

function isGitIgnored(root: string, relativePath: string): boolean {
  return (
    spawnSync("git", ["-C", root, "check-ignore", "-q", relativePath])
      .status === 0
  );
}

function writeResultProposal(
  file: string,
  input: {
    dispatchId: string;
    runId: string;
    questId: string;
    repository: string;
    summary: string;
    operations: unknown[];
  },
): string {
  const proposalId = createProposalId();
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        result: {
          id: createResultId(),
          dispatchId: input.dispatchId,
          runId: input.runId,
          status: "completed",
          summary: input.summary,
          commands: [],
          checks: ["bounded output reviewed"],
          artifactRefs: [],
          revision: git(input.repository, "rev-parse", "HEAD"),
          blockers: [],
          sessionRef: `session:${path.basename(file, ".json")}`,
          createdAt: RESULT_TIME,
        },
        proposal: {
          id: proposalId,
          dispatchId: input.dispatchId,
          questId: input.questId,
          title: `${input.summary} proposal`,
          operations: input.operations,
          status: "pending",
          createdAt: RESULT_TIME,
          updatedAt: RESULT_TIME,
        },
      },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  return proposalId;
}

function readProjection(
  root: string,
  relativePath: string,
): {
  projectedThroughSeq: number;
  data: Record<string, unknown>;
} {
  return JSON.parse(
    fs.readFileSync(
      path.join(root, ".trellis", "research", relativePath),
      "utf-8",
    ),
  ) as { projectedThroughSeq: number; data: Record<string, unknown> };
}

describe("research workflow end-to-end closure", () => {
  let sandbox: string;
  let root: string;
  let code: string;
  let paper: string;
  let notes: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(
      path.join(os.tmpdir(), "trellis-research-workflow-"),
    );
    root = path.join(sandbox, "control");
    code = path.join(sandbox, "code");
    paper = path.join(sandbox, "paper");
    notes = path.join(sandbox, "notes");
    initializeGitRepository(root, "control");
    initializeGitRepository(code, "code");
    initializeGitRepository(paper, "paper");
    initializeGitRepository(notes, "notes");
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.spyOn(console, "log").mockImplementation(noop);
    vi.spyOn(console, "error").mockImplementation(noop);
    vi.spyOn(console, "warn").mockImplementation(noop);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ version: VERSION }), { status: 200 }),
      ),
    );
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    process.exitCode = undefined;
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("proves the root-reviewed multi-repository workflow without simulating a worker", async () => {
    await init({
      yes: true,
      force: true,
    });
    expect(loadWorkflowSelection(root)).toEqual({
      kind: "bundled",
      id: "research",
    });
    expect(fs.existsSync(path.join(root, ".trellis", "research"))).toBe(false);

    await initializeResearch({ root, name: "Cross-repository research lab" });

    const codeRepository = (
      await addResearchRepository({
        root,
        name: "code",
        kind: "code",
        locator: "../code",
      })
    ).repository;
    const paperRepository = (
      await addResearchRepository({
        root,
        name: "paper",
        kind: "paper",
        locator: "../paper",
      })
    ).repository;
    const notesRepository = (
      await addResearchRepository({
        root,
        name: "notes",
        kind: "notes",
        locator: "../notes",
      })
    ).repository;
    expect(fs.existsSync(path.join(code, ".trellis"))).toBe(false);
    expect(fs.existsSync(path.join(paper, ".trellis"))).toBe(false);
    expect(fs.existsSync(path.join(notes, ".trellis"))).toBe(false);

    const legacyFiles = new Map<string, string>([
      [path.join(code, "research-quest.yaml"), "title: historical quest\n"],
      [path.join(paper, "research-events.jsonl"), '{"legacy":true}\n'],
      [path.join(notes, "notes", "_quest"), "legacy notes quest\n"],
      [path.join(notes, "vault", "_quest"), "legacy vault quest\n"],
    ]);
    for (const [file, content] of legacyFiles) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content, "utf-8");
    }

    const questId = createQuestId();
    const campaignId = createCampaignId();
    const taskFreeRunId = createRunId();
    const taskLinkedRunId = createRunId();
    await createResearchQuest({
      root,
      id: questId,
      title: "Evaluate a reproducible research method",
      repositoryIds: [
        codeRepository.id,
        paperRepository.id,
        notesRepository.id,
        codeRepository.id,
      ],
    });
    await createResearchCampaign({
      root,
      id: campaignId,
      questId,
      title: "Cross-repository protocol",
      protocolDigest: "protocol-v1",
    });
    await freezeResearchCampaign({ root, campaignId });
    await setResearchCampaignStatus({
      root,
      campaignId,
      status: "running",
    });
    await createResearchRun({
      root,
      id: taskFreeRunId,
      campaignId,
      title: "Task-free paper review",
    });
    await createResearchRun({
      root,
      id: taskLinkedRunId,
      campaignId,
      title: "Task-linked code analysis",
    });

    const taskFreeDispatch = await prepareResearchDispatch({
      root,
      runId: taskFreeRunId,
      questId,
      campaignId,
      repositoryId: paperRepository.id,
      ownerSkill: "trellis-research-literature",
      objective: "Review the declared paper repository",
      acceptanceCriteria: ["Return bounded observations"],
      allowedWritePaths: ["outputs/literature.json"],
      expectedOutputs: ["literature observations"],
      checks: ["reviewed by root session"],
      idempotencyKey: "e2e:prepare:task-free",
    });
    const taskFreeInput = path.join(sandbox, "task-free-result.json");
    const taskFreeProposalId = writeResultProposal(taskFreeInput, {
      dispatchId: taskFreeDispatch.dispatch.id,
      runId: taskFreeRunId,
      questId,
      repository: paper,
      summary: "Task-free literature review complete",
      operations: [{ kind: "quest.stage", questId, stage: "literature" }],
    });
    const taskFreeRecorded = await recordResearchDispatchResult({
      root,
      dispatchId: taskFreeDispatch.dispatch.id,
      file: taskFreeInput,
      idempotencyKey: "e2e:record:task-free",
    });
    expect(taskFreeRecorded.events.map((event) => event.kind)).toEqual([
      "result.recorded",
      "proposal.recorded",
    ]);
    const beforeTaskFreeDryRun = await readResearchLedger(root);
    const taskFreeDryRun = await applyResearchProposal({
      root,
      proposalId: taskFreeProposalId,
      rationale: "Preview literature stage change",
      dryRun: true,
    });
    expect(taskFreeDryRun.decisionFile).toBeNull();
    expect(await readResearchLedger(root)).toEqual(beforeTaskFreeDryRun);
    const taskFreeApplied = await applyResearchProposal({
      root,
      proposalId: taskFreeProposalId,
      rationale: "Accept reviewed literature stage change",
    });
    const taskFreeHead = taskFreeApplied.headSeq;
    const taskFreeReplay = await applyResearchProposal({
      root,
      proposalId: taskFreeProposalId,
      rationale: "Idempotent retry",
    });
    expect(taskFreeReplay).toMatchObject({
      replayed: true,
      headSeq: taskFreeHead,
      decision: { id: taskFreeApplied.decision.id },
    });
    expect(await readResearchLedger(root)).toHaveLength(taskFreeHead);
    await setResearchRunStatus({
      root,
      runId: taskFreeRunId,
      status: "running",
    });
    await setResearchRunStatus({
      root,
      runId: taskFreeRunId,
      status: "succeeded",
    });

    const taskRef = ".trellis/tasks/linked-research-engineering";

    const taskLinkedDispatch = await prepareResearchDispatch({
      root,
      runId: taskLinkedRunId,
      questId,
      campaignId,
      repositoryId: codeRepository.id,
      ownerSkill: "trellis-research-computation",
      objective: "Analyze the declared code repository",
      acceptanceCriteria: ["Return bounded computation observations"],
      allowedWritePaths: ["outputs/computation.json"],
      expectedOutputs: ["computation observations"],
      checks: ["reviewed by root session"],
      taskRef,
      idempotencyKey: "e2e:prepare:task-linked",
    });
    expect(taskLinkedDispatch.dispatch.taskRef).toBe(taskRef);
    await setResearchRunStatus({
      root,
      runId: taskLinkedRunId,
      status: "running",
    });

    const taskLinkedInput = path.join(sandbox, "task-linked-result.json");
    const taskLinkedProposalId = writeResultProposal(taskLinkedInput, {
      dispatchId: taskLinkedDispatch.dispatch.id,
      runId: taskLinkedRunId,
      questId,
      repository: code,
      summary: "Task-linked computation complete",
      operations: [
        { kind: "run.status", runId: taskLinkedRunId, status: "succeeded" },
      ],
    });
    await recordResearchDispatchResult({
      root,
      dispatchId: taskLinkedDispatch.dispatch.id,
      file: taskLinkedInput,
      idempotencyKey: "e2e:record:task-linked",
    });
    const beforeTaskLinkedDryRun = await readResearchLedger(root);
    expect(
      (
        await applyResearchProposal({
          root,
          proposalId: taskLinkedProposalId,
          rationale: "Preview successful completion",
          dryRun: true,
        })
      ).dryRun,
    ).toBe(true);
    expect(await readResearchLedger(root)).toEqual(beforeTaskLinkedDryRun);
    const taskLinkedApplied = await applyResearchProposal({
      root,
      proposalId: taskLinkedProposalId,
      rationale: "Accept reviewed successful completion",
    });
    const taskLinkedReplay = await applyResearchProposal({
      root,
      proposalId: taskLinkedProposalId,
      rationale: "Idempotent retry",
    });
    expect(taskLinkedReplay).toMatchObject({
      replayed: true,
      decision: { id: taskLinkedApplied.decision.id },
    });

    const evidenceId = createEvidenceId();
    const claimId = createClaimId();
    await createResearchEvidence({
      root,
      id: evidenceId,
      questId,
      runId: taskLinkedRunId,
      summary: "The reviewed computation produced reproducible evidence",
    });
    await createResearchClaim({
      root,
      id: claimId,
      questId,
      statement: "The method is reproducible under the reviewed protocol",
      evidenceIds: [evidenceId],
    });
    await setResearchClaimStatus({ root, claimId, status: "supported" });
    await setResearchCampaignStatus({
      root,
      campaignId,
      status: "completed",
    });
    await setResearchQuestStage({ root, questId, stage: "complete" });
    await setResearchQuestStatus({ root, questId, status: "completed" });

    const state = await readResearchState(root);
    expect(state.quests[questId]).toMatchObject({
      status: "completed",
      stage: "complete",
      repositoryIds: [
        codeRepository.id,
        paperRepository.id,
        notesRepository.id,
      ],
    });
    expect(state.campaigns[campaignId]?.status).toBe("completed");
    expect(state.runs[taskFreeRunId]?.status).toBe("succeeded");
    expect(state.runs[taskLinkedRunId]?.status).toBe("succeeded");
    expect(state.evidence[evidenceId]?.status).toBe("active");
    expect(state.claims[claimId]?.status).toBe("supported");
    expect(Object.keys(state.results)).toHaveLength(2);
    expect(Object.keys(state.proposals)).toHaveLength(2);
    expect(Object.keys(state.decisions)).toHaveLength(2);

    const projectionFiles = [
      `quests/${questId}/quest.json`,
      `campaigns/${campaignId}/campaign.json`,
      `runs/${taskFreeRunId}/run.json`,
      `runs/${taskLinkedRunId}/run.json`,
      `evidence/${evidenceId}/evidence.json`,
      `claims/${claimId}/claim.json`,
    ];
    for (const relativePath of projectionFiles) {
      const projection = readProjection(root, relativePath);
      expect(projection.projectedThroughSeq).toBe(state.projectedThroughSeq);
      expect(projection.data.id).toBe(
        path.basename(path.dirname(relativePath)),
      );
      expect(isGitIgnored(root, `.trellis/research/${relativePath}`)).toBe(
        false,
      );
    }
    expect(git(root, "status", "--short", "--", ".trellis/research")).not.toBe(
      "",
    );

    const ledgerBeforeRebuild = fs.readFileSync(
      researchPaths(root).eventsFile,
      "utf-8",
    );
    fs.writeFileSync(
      path.join(root, ".trellis", "research", `quests/${questId}/quest.json`),
      "{corrupt}\n",
      "utf-8",
    );
    fs.rmSync(
      path.join(root, ".trellis", "research", `claims/${claimId}/claim.json`),
    );
    await rebuildResearch({ root });
    expect(fs.readFileSync(researchPaths(root).eventsFile, "utf-8")).toBe(
      ledgerBeforeRebuild,
    );
    const firstRebuild = snapshotFiles(researchPaths(root).researchDir);
    await rebuildResearch({ root });
    expect(snapshotFiles(researchPaths(root).researchDir)).toEqual(
      firstRebuild,
    );
    expect(fs.readFileSync(researchPaths(root).eventsFile, "utf-8")).toBe(
      ledgerBeforeRebuild,
    );

    const trackedStrings = trackedResearchStrings(root);
    for (const value of trackedStrings) {
      expect(path.posix.isAbsolute(value), value).toBe(false);
      expect(/^[A-Za-z]:[\\/]/.test(value), value).toBe(false);
      expect(value.startsWith("\\\\") || value.startsWith("//"), value).toBe(
        false,
      );
      for (const fixturePath of [root, code, paper, notes]) {
        expect(value, fixturePath).not.toContain(fixturePath);
      }
    }
    expect(
      isGitIgnored(
        root,
        `.trellis/.runtime/research/dispatches/${taskFreeDispatch.dispatch.id}/manifest.json`,
      ),
    ).toBe(true);
    expect(
      isGitIgnored(root, ".trellis/.runtime/research/repo-observations.json"),
    ).toBe(true);
    expect(
      isGitIgnored(root, ".trellis/.runtime/sessions/research-e2e.json"),
    ).toBe(true);

    for (const [file, content] of legacyFiles) {
      expect(fs.readFileSync(file, "utf-8")).toBe(content);
    }

    fs.appendFileSync(researchPaths(root).eventsFile, "{not-json}\n", "utf-8");
    const malformedLedger = fs.readFileSync(
      researchPaths(root).eventsFile,
      "utf-8",
    );
    await expect(validateResearch({ root })).rejects.toThrow(
      /events\.jsonl line/,
    );
    await expect(researchStatus({ root })).rejects.toThrow(
      /events\.jsonl line/,
    );
    await expect(readResearchState(root)).rejects.toThrow(/events\.jsonl line/);
    expect(fs.readFileSync(researchPaths(root).eventsFile, "utf-8")).toBe(
      malformedLedger,
    );
  }, 30_000);

  it("updates a selected bundled research workflow without changing research state", async () => {
    await init({
      yes: true,
      force: true,
    });
    await initializeResearch({ root, name: "Bundled update lab" });
    await createResearchQuest({ root, title: "Durable update quest" });
    const researchBefore = snapshotFiles(researchPaths(root).researchDir);
    const legacyWorkflow = "# Older Research Workflow\n\n## Phase Index\n";
    const workflowFile = path.join(root, PATHS.WORKFLOW_GUIDE_FILE);
    fs.writeFileSync(workflowFile, legacyWorkflow, "utf-8");
    updateHashes(root, new Map([[PATHS.WORKFLOW_GUIDE_FILE, legacyWorkflow]]));
    fs.writeFileSync(path.join(root, ".trellis", ".version"), "0.6.6", "utf-8");

    await update({ force: true });

    expect(fs.readFileSync(workflowFile, "utf-8")).toBe(
      replacePythonCommandLiterals(researchWorkflowMdTemplate),
    );
    expect(loadWorkflowSelection(root)).toEqual({
      kind: "bundled",
      id: "research",
    });
    expect(snapshotFiles(researchPaths(root).researchDir)).toEqual(
      researchBefore,
    );

    const beforeRepeat = snapshotFiles(root);
    await update({ force: true });
    expect(snapshotFiles(root)).toEqual(beforeRepeat);
    expect(snapshotFiles(researchPaths(root).researchDir)).toEqual(
      researchBefore,
    );
  });

  it("preserves custom workflow ownership and canonical research state", async () => {
    await init({
      yes: true,
      force: true,
    });
    await initializeResearch({ root, name: "Custom workflow lab" });
    await createResearchQuest({ root, title: "Custom workflow quest" });
    const researchBefore = snapshotFiles(researchPaths(root).researchDir);
    const customWorkflow =
      "# User-owned research workflow\n\nDo not replace this file.\n";
    const workflowFile = path.join(root, PATHS.WORKFLOW_GUIDE_FILE);
    fs.writeFileSync(workflowFile, customWorkflow, "utf-8");
    removeHash(root, PATHS.WORKFLOW_GUIDE_FILE);
    clearWorkflowSelection(root);
    fs.writeFileSync(path.join(root, ".trellis", ".version"), "0.6.6", "utf-8");

    await update({ force: true });

    expect(fs.readFileSync(workflowFile, "utf-8")).toBe(customWorkflow);
    expect(loadWorkflowSelection(root)).toEqual({ kind: "missing" });
    expect(loadHashes(root)[PATHS.WORKFLOW_GUIDE_FILE]).toBeUndefined();
    expect(snapshotFiles(researchPaths(root).researchDir)).toEqual(
      researchBefore,
    );
  });
});

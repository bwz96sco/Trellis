import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { stableResearchJson } from "@mindfoldhq/trellis-core/research";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getResearchDispatchContext,
  type ResearchDispatchContextResult,
} from "../../src/commands/research/dispatch-context.js";
import {
  setResearchQuestStage,
  setResearchQuestStatus,
  setResearchRunStatus,
} from "../../src/commands/research/command.js";
import { registerResearchCommand } from "../../src/commands/research/index.js";
import {
  createResearchDispatchFixture as createFixture,
  runResearchFixtureGit as git,
  snapshotTree,
} from "../fixtures/research-dispatch.js";

describe("read-only research Dispatch context", () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-dispatch-context-"));
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  it("returns deterministic bounded context without writing or exposing artifact bytes", async () => {
    const fixture = await createFixture(sandbox);
    const observationFile = path.join(
      fixture.root,
      ".trellis",
      ".runtime",
      "research",
      "repo-observations.json",
    );
    fs.writeFileSync(observationFile, "{malformed observation cache\n");
    const before = snapshotTree(sandbox);

    const result = await getResearchDispatchContext({
      root: fixture.root,
      requestFile: fixture.requestRef,
      host: "codex",
      discoveredSkillNames: [" research-literature ", "research-literature"],
    });
    const repeated = await getResearchDispatchContext({
      root: fixture.root,
      requestFile: fixture.requestRef,
      host: "codex",
      discoveredSkillNames: ["research-literature"],
    });

    expect(result).toEqual(repeated);
    expect(result).toMatchObject({
      schemaVersion: 1,
      command: "research dispatch context",
      valid: true,
      host: "codex",
      requestRef: fixture.requestRef,
      dispatch: {
        id: fixture.ids.dispatchId,
        questId: fixture.ids.questId,
        campaignId: fixture.ids.campaignId,
        runId: fixture.ids.runId,
        repositoryId: fixture.ids.repositoryId,
        declaredOwnerSkill: "historical-research-runner",
        providerHint: "claude",
        taskRef: "tasks/legacy-context",
      },
      capability: {
        stage: "literature",
        capability: "research.literature",
        optionalSkill: "research-literature",
        fallbackSkill: "trellis-research-literature",
        selectedSkill: "research-literature",
        source: "host",
      },
      warnings: [
        expect.objectContaining({ code: "LEGACY_OWNER_SKILL_IGNORED" }),
        expect.objectContaining({ code: "PROVIDER_HINT_MISMATCH" }),
        expect.objectContaining({ code: "TASK_REF_IGNORED" }),
      ],
      repository: {
        id: fixture.ids.repositoryId,
        name: "target",
        kind: "code",
        path: fs.realpathSync(fixture.repository),
        gitRoot: fs.realpathSync(fixture.repository),
        revision: fixture.revision,
        resolutionSource: "locator",
        remoteVerified: true,
      },
      work: {
        objective: "Produce a bounded deterministic report",
        acceptanceCriteria: ["Report is deterministic"],
        expectedOutputs: ["Golden report"],
        checks: ["test -f outputs/report.json"],
      },
      authority: {
        readScope: "declared-context-only",
        writeScope: "allowed-write-paths-only",
        canonicalResearchMutation: false,
        proposalReview: false,
        gitHistoryMutation: false,
        recordResult: false,
      },
      outputContract: {
        type: "result-plus-pending-proposal",
        result: { dispatchId: fixture.ids.dispatchId, runId: fixture.ids.runId },
        proposal: {
          dispatchId: fixture.ids.dispatchId,
          questId: fixture.ids.questId,
          status: "pending",
        },
      },
    } satisfies Partial<ResearchDispatchContextResult>);
    const serialized = stableResearchJson(result);
    expect(serialized).not.toContain(fixture.artifactBody.trim());
    expect(serialized).not.toContain("repo-observations");
    expect(serialized).not.toContain("dirtySummary");
    expect(result.work.context).toEqual([
      { type: "text", text: "Use only declared context." },
      {
        type: "artifact",
        artifact: {
          id: "art_33333333-3333-4333-8333-333333333333",
          repositoryId: fixture.ids.repositoryId,
          path: "inputs/source.txt",
          kind: "source",
          revision: fixture.revision,
          sha256: createHash("sha256")
            .update(fixture.artifactBody)
            .digest("hex"),
          mediaType: "text/plain",
        },
        resolvedPath: fs.realpathSync(fixture.artifactPath),
        contentIncluded: false,
      },
    ]);
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("uses strict binding precedence and verifies the configured remote without observation writes", async () => {
    const fixture = await createFixture(sandbox, {
      expectedRemote: "git@example.test:research.git",
    });
    const alternate = path.join(sandbox, "alternate");
    fs.cpSync(fixture.repository, alternate, { recursive: true });
    const bindingsFile = path.join(
      fixture.root,
      ".trellis",
      ".runtime",
      "research",
      "repo-bindings.json",
    );
    fs.writeFileSync(
      bindingsFile,
      `${JSON.stringify({
        schemaVersion: 1,
        bindings: { [fixture.ids.repositoryId]: fs.realpathSync(alternate) },
      })}\n`,
    );
    const before = snapshotTree(sandbox);

    const result = await getResearchDispatchContext({
      root: fixture.root,
      requestFile: fixture.requestRef,
      host: "claude",
    });
    expect(result.repository).toMatchObject({
      path: fs.realpathSync(alternate),
      resolutionSource: "binding",
      remoteVerified: true,
    });
    expect(JSON.stringify(result)).not.toContain("git@example.test:research.git");
    expect(snapshotTree(sandbox)).toEqual(before);

    git(alternate, "remote", "set-url", "origin", "git@example.test:other.git");
    const mismatchBefore = snapshotTree(sandbox);
    await expect(
      getResearchDispatchContext({
        root: fixture.root,
        requestFile: fixture.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "REPOSITORY_INVALID" });
    expect(snapshotTree(sandbox)).toEqual(mismatchBefore);
  });

  it("allows a non-Git Repository when no remote or artifact revision requires Git", async () => {
    const fixture = await createFixture(sandbox, { git: false });
    const result = await getResearchDispatchContext({
      root: fixture.root,
      requestFile: fixture.requestRef,
      host: "claude",
    });

    expect(result.repository).toMatchObject({
      path: fs.realpathSync(fixture.repository),
      gitRoot: null,
      revision: null,
      remoteVerified: true,
    });
    expect(result.work.context[1]).toMatchObject({
      type: "artifact",
      artifact: { revision: null },
    });
  });

  it("selects bundled fallback when no optional skill name is supplied", async () => {
    const fixture = await createFixture(sandbox, {
      ownerSkill: "trellis-research-literature",
      provider: "claude",
      taskRef: undefined,
    });
    const result = await getResearchDispatchContext({
      root: fixture.root,
      requestFile: fixture.requestRef,
      host: "claude",
    });

    expect(result.capability.selectedSkill).toBe("trellis-research-literature");
    expect(result.capability.source).toBe("bundled");
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      "TASK_REF_IGNORED",
    ]);
  });

  it("renders exactly one JSON document on the correct stream and exit status", async () => {
    const fixture = await createFixture(sandbox);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.exitCode = undefined;

    const successProgram = new Command();
    registerResearchCommand(successProgram);
    await successProgram.parseAsync([
      "node",
      "trellis",
      "research",
      "dispatch",
      "context",
      fixture.requestRef,
      "--host",
      "claude",
      "--root",
      fixture.root,
      "--json",
    ]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    const successOutput = JSON.parse(
      String(log.mock.calls[0]?.[0]),
    ) as ResearchDispatchContextResult;
    expect(successOutput).toMatchObject({
      command: "research dispatch context",
      valid: true,
    });
    expect(process.exitCode).toBeUndefined();

    log.mockClear();
    error.mockClear();
    const failureProgram = new Command();
    registerResearchCommand(failureProgram);
    await failureProgram.parseAsync([
      "node",
      "trellis",
      "research",
      "dispatch",
      "context",
      fixture.requestRef,
      "--host",
      "Claude",
      "--root",
      fixture.root,
      "--json",
    ]);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(error.mock.calls[0]?.[0]))).toEqual({
      schemaVersion: 1,
      command: "research dispatch context",
      valid: false,
      error: {
        code: "INVALID_HOST",
        message: "Research host must be exactly 'claude' or 'codex'",
      },
      safeAction: "report-to-root-no-write",
    });
    expect(process.exitCode).toBe(1);

    log.mockClear();
    error.mockClear();
    process.exitCode = undefined;
    const missingHostProgram = new Command();
    registerResearchCommand(missingHostProgram);
    await missingHostProgram.parseAsync([
      "node",
      "trellis",
      "research",
      "dispatch",
      "context",
      fixture.requestRef,
      "--root",
      fixture.root,
      "--json",
    ]);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(error.mock.calls[0]?.[0]))).toMatchObject({
      command: "research dispatch context",
      valid: false,
      error: { code: "INVALID_HOST" },
      safeAction: "report-to-root-no-write",
    });
    expect(process.exitCode).toBe(1);

    log.mockClear();
    error.mockClear();
    process.exitCode = undefined;
    const humanProgram = new Command();
    registerResearchCommand(humanProgram);
    await humanProgram.parseAsync([
      "node",
      "trellis",
      "research",
      "dispatch",
      "context",
      fixture.requestRef,
      "--host",
      "claude",
      "--root",
      fixture.root,
    ]);
    expect(log).toHaveBeenCalledExactlyOnceWith(
      `research dispatch context: ${fixture.ids.dispatchId} host=claude stage=literature skill=trellis-research-literature head=${successOutput.ledgerHead} repository=${fixture.ids.repositoryId}`,
    );
    expect(error).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it("rejects invalid hosts, skill names, and noncanonical request paths before observation", async () => {
    const fixture = await createFixture(sandbox);
    for (const host of ["Claude", "cursor", "", "claude-code"]) {
      await expect(
        getResearchDispatchContext({
          root: fixture.root,
          requestFile: fixture.requestRef,
          host,
        }),
      ).rejects.toMatchObject({ code: "INVALID_HOST" });
    }
    for (const skillName of ["Research-Literature", "/research-literature", "plugin:skill", "$skill"]) {
      await expect(
        getResearchDispatchContext({
          root: fixture.root,
          requestFile: fixture.requestRef,
          host: "claude",
          discoveredSkillNames: [skillName],
        }),
      ).rejects.toMatchObject({ code: "INVALID_SKILL_NAME" });
    }
    for (const requestFile of [
      fixture.requestPath,
      fixture.requestRef.replaceAll("/", "\\"),
      `.trellis/research/dispatches/../${fixture.ids.dispatchId}/request.json`,
      `./${fixture.requestRef}`,
      `.trellis/research/dispatches/${fixture.ids.dispatchId}/other.json`,
    ]) {
      await expect(
        getResearchDispatchContext({
          root: fixture.root,
          requestFile,
          host: "claude",
        }),
      ).rejects.toMatchObject({ code: "INVALID_REQUEST_PATH" });
    }
  });

  it("rejects a tracked request symlink escape without target observation or writes", async () => {
    const fixture = await createFixture(sandbox);
    const outsideRequest = path.join(sandbox, "outside-request.json");
    fs.renameSync(fixture.requestPath, outsideRequest);
    fs.symlinkSync(outsideRequest, fixture.requestPath);
    const before = snapshotTree(sandbox);

    await expect(
      getResearchDispatchContext({
        root: fixture.root,
        requestFile: fixture.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST_PATH" });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("rejects stale tracked requests without allowing them to override canonical state", async () => {
    const fixture = await createFixture(sandbox);
    const request = JSON.parse(fs.readFileSync(fixture.requestPath, "utf-8")) as Record<string, unknown>;
    request.objective = "edited tracked request";
    fs.writeFileSync(fixture.requestPath, `${JSON.stringify(request)}\n`);
    const before = snapshotTree(sandbox);

    await expect(
      getResearchDispatchContext({
        root: fixture.root,
        requestFile: fixture.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "REQUEST_STATE_MISMATCH" });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("fails closed for non-dispatchable Quest, Run, and Repository hierarchy", async () => {
    const unassociated = await createFixture(path.join(sandbox, "unassociated"), {
      associateRepository: false,
    });
    await expect(
      getResearchDispatchContext({
        root: unassociated.root,
        requestFile: unassociated.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "DISPATCH_HIERARCHY_INVALID" });

    const paused = await createFixture(path.join(sandbox, "paused"));
    await setResearchQuestStatus({
      root: paused.root,
      questId: paused.ids.questId,
      status: "paused",
    });
    await expect(
      getResearchDispatchContext({
        root: paused.root,
        requestFile: paused.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "QUEST_NOT_DISPATCHABLE" });

    const complete = await createFixture(path.join(sandbox, "complete"));
    await setResearchQuestStage({
      root: complete.root,
      questId: complete.ids.questId,
      stage: "complete",
    });
    await expect(
      getResearchDispatchContext({
        root: complete.root,
        requestFile: complete.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "QUEST_NOT_DISPATCHABLE" });

    const terminalRun = await createFixture(path.join(sandbox, "terminal"));
    await setResearchRunStatus({
      root: terminalRun.root,
      runId: terminalRun.ids.runId,
      status: "running",
    });
    await setResearchRunStatus({
      root: terminalRun.root,
      runId: terminalRun.ids.runId,
      status: "succeeded",
    });
    await expect(
      getResearchDispatchContext({
        root: terminalRun.root,
        requestFile: terminalRun.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "DISPATCH_HIERARCHY_INVALID" });
  });

  it("rejects artifact digest changes and write-scope symlink escapes without writing", async () => {
    const digestFixture = await createFixture(path.join(sandbox, "digest"));
    fs.writeFileSync(digestFixture.artifactPath, "changed after dispatch\n");
    const digestBefore = snapshotTree(path.join(sandbox, "digest"));
    await expect(
      getResearchDispatchContext({
        root: digestFixture.root,
        requestFile: digestFixture.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "ARTIFACT_INVALID" });
    expect(snapshotTree(path.join(sandbox, "digest"))).toEqual(digestBefore);

    const directoryFixture = await createFixture(path.join(sandbox, "directory"));
    fs.rmSync(directoryFixture.artifactPath);
    fs.mkdirSync(directoryFixture.artifactPath);
    await expect(
      getResearchDispatchContext({
        root: directoryFixture.root,
        requestFile: directoryFixture.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "ARTIFACT_INVALID" });

    const symlinkSandbox = path.join(sandbox, "artifact-symlink");
    const symlinkFixture = await createFixture(symlinkSandbox);
    const outsideArtifact = path.join(symlinkSandbox, "outside.txt");
    fs.writeFileSync(outsideArtifact, symlinkFixture.artifactBody);
    fs.rmSync(symlinkFixture.artifactPath);
    fs.symlinkSync(outsideArtifact, symlinkFixture.artifactPath);
    await expect(
      getResearchDispatchContext({
        root: symlinkFixture.root,
        requestFile: symlinkFixture.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "ARTIFACT_INVALID" });

    const writeSandbox = path.join(sandbox, "write-scope");
    const target = path.join(writeSandbox, "target");
    fs.mkdirSync(path.join(writeSandbox, "outside"), { recursive: true });
    fs.mkdirSync(target, { recursive: true });
    fs.symlinkSync(path.join(writeSandbox, "outside"), path.join(target, "escape"));
    const writeFixture = await createFixture(writeSandbox, {
      allowedWritePaths: ["escape/report.json"],
    });
    const writeBefore = snapshotTree(writeSandbox);
    await expect(
      getResearchDispatchContext({
        root: writeFixture.root,
        requestFile: writeFixture.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "WRITE_SCOPE_INVALID" });
    expect(snapshotTree(writeSandbox)).toEqual(writeBefore);

    const danglingSandbox = path.join(sandbox, "dangling-write-scope");
    const danglingFixture = await createFixture(danglingSandbox, {
      allowedWritePaths: ["dangling/report.json"],
    });
    fs.symlinkSync(
      path.join(danglingSandbox, "outside-missing"),
      path.join(danglingFixture.repository, "dangling"),
    );
    const danglingBefore = snapshotTree(danglingSandbox);
    await expect(
      getResearchDispatchContext({
        root: danglingFixture.root,
        requestFile: danglingFixture.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "WRITE_SCOPE_INVALID" });
    expect(snapshotTree(danglingSandbox)).toEqual(danglingBefore);
  });

  it("accepts exact finite bounds and rejects canonical state above them", async () => {
    const boundary = await createFixture(path.join(sandbox, "boundary"), {
      objective: "x".repeat(16_384),
      acceptanceCriteria: Array.from(
        { length: 128 },
        (_, index) => `criterion-${index}`,
      ),
    });
    await expect(
      getResearchDispatchContext({
        root: boundary.root,
        requestFile: boundary.requestRef,
        host: "claude",
      }),
    ).resolves.toMatchObject({ valid: true });

    const longString = await createFixture(path.join(sandbox, "long-string"), {
      objective: "x".repeat(16_385),
    });
    await expect(
      getResearchDispatchContext({
        root: longString.root,
        requestFile: longString.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "CONTEXT_LIMIT_EXCEEDED" });

    const longList = await createFixture(path.join(sandbox, "long-list"), {
      acceptanceCriteria: Array.from(
        { length: 129 },
        (_, index) => `criterion-${index}`,
      ),
    });
    await expect(
      getResearchDispatchContext({
        root: longList.root,
        requestFile: longList.requestRef,
        host: "claude",
      }),
    ).rejects.toMatchObject({ code: "CONTEXT_LIMIT_EXCEEDED" });
  });
});

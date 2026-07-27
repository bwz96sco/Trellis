import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import * as researchCore from "@mindfoldhq/trellis-core/research";
import type { DispatchId } from "@mindfoldhq/trellis-core/research";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authorizeResearchDispatch } from "../../src/commands/research/dispatch-activation-command.js";
import {
  getResearchDispatchContext,
  type ResearchDispatchContextResult,
} from "../../src/commands/research/dispatch-context.js";
import { ResearchDispatchContextError } from "../../src/commands/research/errors.js";
import * as researchRepository from "../../src/commands/research/repository.js";
import { registerResearchCommand } from "../../src/commands/research/index.js";
import {
  createResearchDispatchFixture,
  snapshotTree,
} from "../fixtures/research-dispatch.js";

describe("public approved Research Dispatch Context", { timeout: 30_000 }, () => {
  let sandbox: string;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-public-context-"));
  });

  afterEach(() => {
    process.exitCode = undefined;
    vi.restoreAllMocks();
    fs.rmSync(sandbox, { recursive: true, force: true });
  });

  async function approvedFixture(host: "claude" | "codex") {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    const granted = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host,
      idempotencyKey: `public-context:${host}`,
    });
    return { fixture, granted };
  }

  it("rejects malformed API Dispatch IDs as parse failures without writing", async () => {
    const before = snapshotTree(sandbox);
    let failure: unknown;

    try {
      await getResearchDispatchContext({
        root: sandbox,
        dispatchId: "not-a-dispatch" as DispatchId,
        host: "claude",
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(ResearchDispatchContextError);
    expect(failure).toMatchObject({
      name: "ResearchDispatchContextError",
      code: "DISPATCH_NOT_FOUND",
      message: "dispatch ID must be a dsp_ prefixed UUID",
    });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("emits the exact public Context failure envelope without writing", async () => {
    const { fixture } = await approvedFixture("codex");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const before = snapshotTree(sandbox);
    const program = new Command();
    registerResearchCommand(program);

    await program.parseAsync([
      "node",
      "trellis",
      "research",
      "dispatch",
      "context",
      fixture.ids.dispatchId,
      "--host",
      "claude",
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
        code: "APPROVAL_HOST_MISMATCH",
        message: "Dispatch activation has no approval for host 'claude'",
      },
      safeAction: "report-to-root-no-write",
    });
    expect(process.exitCode).toBe(1);
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("leaves unrelated public Context errors untouched", async () => {
    const { fixture } = await approvedFixture("claude");
    const failure = new Error("unrelated state reader failure");
    vi.spyOn(researchCore, "readResearchState").mockRejectedValueOnce(failure);
    const before = snapshotTree(sandbox);

    await expect(
      getResearchDispatchContext({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
      }),
    ).rejects.toBe(failure);
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("rejects oversized Dispatch strings without writing", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
      objective: "x".repeat(16_385),
    });
    await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
      idempotencyKey: "public-context:oversized-string",
    });
    const before = snapshotTree(sandbox);

    await expect(
      getResearchDispatchContext({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
      }),
    ).rejects.toMatchObject({
      name: "ResearchDispatchContextError",
      code: "CONTEXT_LIMIT_EXCEEDED",
      message: "dispatch.objective must contain at most 16384 characters",
    });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("rejects oversized Dispatch lists without writing", async () => {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
      acceptanceCriteria: Array.from(
        { length: 129 },
        (_, index) => `criterion-${index}`,
      ),
    });
    await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
      idempotencyKey: "public-context:oversized-list",
    });
    const before = snapshotTree(sandbox);

    await expect(
      getResearchDispatchContext({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
      }),
    ).rejects.toMatchObject({
      name: "ResearchDispatchContextError",
      code: "CONTEXT_LIMIT_EXCEEDED",
      message: "dispatch.acceptanceCriteria must contain at most 128 entries",
    });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("captures one canonical state through public Context without writing", async () => {
    const { fixture } = await approvedFixture("claude");
    const readState = vi.spyOn(researchCore, "readResearchState");
    const resolveRepositoryContext = vi.spyOn(
      researchRepository,
      "resolveResearchRepositoryContext",
    );
    const before = snapshotTree(sandbox);

    await getResearchDispatchContext({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });

    expect(readState).toHaveBeenCalledTimes(1);
    expect(resolveRepositoryContext).toHaveBeenCalledTimes(1);
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("returns normalized approved Context by Dispatch ID without writing", async () => {
    const { fixture, granted } = await approvedFixture("codex");
    const before = snapshotTree(sandbox);

    const result = await getResearchDispatchContext({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "codex",
    });

    expect(result).toMatchObject({
      command: "research dispatch context",
      valid: true,
      context: {
        schemaVersion: 1,
        host: "codex",
        dispatch: { id: fixture.ids.dispatchId },
        approval: { id: granted.approval.grant.id },
        procedure: {
          manifest: { schemaVersion: 1 },
          instructions: expect.any(String),
        },
        repository: {
          id: fixture.ids.repositoryId,
          path: fs.realpathSync(fixture.repository),
        },
        authority: {
          network: false,
          externalCost: false,
          multipleRepositories: false,
          canonicalResearchMutation: false,
          proposalReview: false,
          gitHistoryMutation: false,
          capabilityChaining: false,
          procedureLaunch: false,
          dispatchLaunch: false,
          nestedAgents: false,
          sandboxExpansion: false,
          recordResult: false,
        },
        outputContract: {
          dispatchId: fixture.ids.dispatchId,
          resultId: granted.approval.grant.id.replace(/^apr_/, "res_"),
          proposalId: granted.approval.grant.id.replace(/^apr_/, "prp_"),
        },
      },
    } satisfies Partial<ResearchDispatchContextResult>);
    expect(JSON.stringify(result)).not.toContain(fixture.artifactBody.trim());
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("emits one public JSON document for the strict Dispatch-ID command", async () => {
    const { fixture, granted } = await approvedFixture("claude");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const before = snapshotTree(sandbox);
    const program = new Command();
    registerResearchCommand(program);

    await program.parseAsync([
      "node",
      "trellis",
      "research",
      "dispatch",
      "context",
      fixture.ids.dispatchId,
      "--host",
      "claude",
      "--root",
      fixture.root,
      "--json",
    ]);

    expect(log).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    const output = JSON.parse(String(log.mock.calls[0]?.[0])) as {
      context: { approval: { id: string }; outputContract: { resultId: string } };
    };
    expect(output.context.approval.id).toBe(granted.approval.grant.id);
    expect(output.context.outputContract.resultId).toBe(
      granted.approval.grant.id.replace(/^apr_/, "res_"),
    );
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("renders approved Context without legacy Skill routing fields", async () => {
    const { fixture } = await approvedFixture("claude");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const program = new Command();
    registerResearchCommand(program);

    await program.parseAsync([
      "node",
      "trellis",
      "research",
      "dispatch",
      "context",
      fixture.ids.dispatchId,
      "--host",
      "claude",
      "--root",
      fixture.root,
    ]);

    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^research dispatch context: dsp_.+ host=claude stage=.+ capability=.+ approval=apr_.+ head=\d+ repository=rep_.+$/,
      ),
    );
    expect(String(log.mock.calls[0]?.[0])).not.toContain("skill=");
    expect(error).not.toHaveBeenCalled();
  });
});

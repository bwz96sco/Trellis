import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authorizeResearchDispatch } from "../../src/commands/research/dispatch-activation-command.js";
import { recordResearchDispatchResult } from "../../src/commands/research/dispatch-command.js";
import { getResearchDispatchContext } from "../../src/commands/research/dispatch-context.js";
import { init } from "../../src/commands/init.js";
import { createResearchDispatchFixture } from "../fixtures/research-dispatch.js";
import {
  assertCodexResearchWorkerContract,
  readInstalledResearchHostAssets,
  runApprovalConsumptionLifecycle,
  runClaudeResearchHookProcess,
  type ApprovalConsumptionLifecycleResult,
} from "../helpers/research-host-contract.js";

function snapshotTree(root: string): Readonly<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  function visit(directory: string): void {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        snapshot[relative] = fs.readFileSync(absolute).toString("base64");
      } else if (entry.isSymbolicLink()) {
        snapshot[relative] = `symlink:${fs.readlinkSync(absolute)}`;
      }
    }
  }
  visit(root);
  return snapshot;
}

function normalizedHostContext(
  context: Awaited<ReturnType<typeof getResearchDispatchContext>>["context"],
): Record<string, unknown> {
  const normalized = structuredClone(context);
  Reflect.deleteProperty(normalized, "host");
  Reflect.deleteProperty(normalized.approval, "id");
  Reflect.deleteProperty(normalized.outputContract, "resultId");
  Reflect.deleteProperty(normalized.outputContract, "proposalId");
  return normalized as unknown as Record<string, unknown>;
}

async function assertRecordedLifecycle(
  lifecycle: ApprovalConsumptionLifecycleResult<unknown>,
): Promise<void> {
  const events = lifecycle.recorded.events;
  expect(lifecycle.contextResult.context.authority).toEqual({
    readScope: "declared-context-only",
    writeScope: "allowed-write-paths-only",
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
  });
  expect(Object.keys(lifecycle.workerOutput)).toEqual(["result", "proposal"]);
  expect(events.map((event) => [event.schemaVersion, event.kind])).toEqual([
    [1, "result.recorded"],
    [1, "proposal.recorded"],
    [2, "approval.consumed"],
  ]);
  expect(events.map((event) => event.seq)).toEqual([
    events[0]?.seq,
    (events[0]?.seq ?? 0) + 1,
    (events[0]?.seq ?? 0) + 2,
  ]);
  expect(new Set(events.map((event) => event.timestamp))).toHaveLength(1);
  expect(new Set(events.map((event) => JSON.stringify(event.actor)))).toHaveLength(1);
  expect(
    new Set(events.map((event) => JSON.stringify(event.provenance))),
  ).toHaveLength(1);
  expect(new Set(events.map((event) => event.idempotencyKey))).toEqual(
    new Set([lifecycle.recordKey]),
  );

  expect(lifecycle.recorded.result.id).toBe(
    lifecycle.contextResult.context.outputContract.resultId,
  );
  expect(lifecycle.recorded.proposal.id).toBe(
    lifecycle.contextResult.context.outputContract.proposalId,
  );
  expect(lifecycle.recorded.approval).toMatchObject({
    grant: { id: lifecycle.approvalId },
    status: "consumed",
    resultId: lifecycle.recorded.result.id,
    proposalId: lifecycle.recorded.proposal.id,
  });
  expect(lifecycle.state.approvals[lifecycle.approvalId]).toEqual(
    lifecycle.recorded.approval,
  );
  if (lifecycle.otherApprovalId !== null) {
    expect(lifecycle.state.approvals[lifecycle.otherApprovalId]?.status).toBe(
      "granted",
    );
  }

  for (const file of [
    lifecycle.recorded.resultFile,
    lifecycle.recorded.proposalFile,
    lifecycle.recorded.approvalFile,
  ]) {
    expect(file).not.toBeNull();
    expect(
      fs.existsSync(path.join(lifecycle.fixture.root, String(file))),
    ).toBe(true);
  }
  expect(
    JSON.parse(
      fs.readFileSync(
        path.join(lifecycle.fixture.root, String(lifecycle.recorded.resultFile)),
        "utf8",
      ),
    ),
  ).toEqual(lifecycle.recorded.result);
  expect(
    JSON.parse(
      fs.readFileSync(
        path.join(lifecycle.fixture.root, String(lifecycle.recorded.proposalFile)),
        "utf8",
      ),
    ),
  ).toEqual(lifecycle.recorded.proposal);
  expect(
    JSON.parse(
      fs.readFileSync(
        path.join(lifecycle.fixture.root, String(lifecycle.recorded.approvalFile)),
        "utf8",
      ),
    ),
  ).toEqual({
    schemaVersion: 2,
    approval: lifecycle.recorded.approval,
  });

  for (const file of [
    lifecycle.recorded.resultFile,
    lifecycle.recorded.proposalFile,
    lifecycle.recorded.approvalFile,
  ]) {
    fs.rmSync(path.join(lifecycle.fixture.root, String(file)));
  }
  const replay = await recordResearchDispatchResult({
    root: lifecycle.fixture.root,
    dispatchId: lifecycle.fixture.ids.dispatchId,
    approvalId: lifecycle.approvalId,
    input: {
      kind: "path",
      cwd: lifecycle.fixture.root,
      path: lifecycle.inputPath,
    },
    idempotencyKey: lifecycle.recordKey,
  });
  expect(replay.replayed).toBe(true);
  expect(replay.events.map((event) => event.eventId)).toEqual(
    lifecycle.recorded.events.map((event) => event.eventId),
  );
  expect(
    replay.resultFile &&
      fs.existsSync(path.join(lifecycle.fixture.root, replay.resultFile)),
  ).toBe(true);
  expect(
    replay.proposalFile &&
      fs.existsSync(path.join(lifecycle.fixture.root, replay.proposalFile)),
  ).toBe(true);
  expect(
    replay.approvalFile &&
      fs.existsSync(path.join(lifecycle.fixture.root, replay.approvalFile)),
  ).toBe(true);

  await expect(
    recordResearchDispatchResult({
      root: lifecycle.fixture.root,
      dispatchId: lifecycle.fixture.ids.dispatchId,
      approvalId: lifecycle.approvalId,
      input: {
        kind: "path",
        cwd: lifecycle.fixture.root,
        path: lifecycle.inputPath,
      },
      idempotencyKey: `${lifecycle.recordKey}:duplicate`,
    }),
  ).rejects.toThrow(/already|consumed|Result|Proposal/i);
}

describe(
  "Research host adapter and public approval-consumption lifecycle",
  { timeout: 60_000 },
  () => {
    let sandbox: string;
    let installedRoot: string;

    beforeEach(async () => {
      sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-host-contract-"));
      installedRoot = path.join(sandbox, "installed");
      fs.mkdirSync(installedRoot, { recursive: true });
      const cwd = vi.spyOn(process, "cwd").mockReturnValue(installedRoot);
      try {
        await init({ yes: true, claude: true, codex: true });
      } finally {
        cwd.mockRestore();
      }
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      fs.rmSync(sandbox, { recursive: true, force: true });
    });

    it("produces provider-neutral approved Context before host-only normalization", async () => {
      const fixture = await createResearchDispatchFixture(
        path.join(sandbox, "parity"),
        { automaticEnabled: true },
      );
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-25T00:00:00.000Z"));
      const claudeGrant = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "parity:claude",
      });
      const codexGrant = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: "parity:codex",
      });
      const claude = await getResearchDispatchContext({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
      });
      const codex = await getResearchDispatchContext({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
      });

      expect(claude.context.approval.mode).toBe(codex.context.approval.mode);
      expect(claude.context.approval.expiresAt).toBe(
        codex.context.approval.expiresAt,
      );
      expect(claudeGrant.approval.grant.expiresAt).toBe(
        codexGrant.approval.grant.expiresAt,
      );
      expect(normalizedHostContext(claude.context)).toEqual(
        normalizedHostContext(codex.context),
      );
    });

    it("keeps a host-mismatched Context failure strictly zero-write", async () => {
      const fixture = await createResearchDispatchFixture(
        path.join(sandbox, "context-failure"),
        { automaticEnabled: true },
      );
      await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "claude",
        idempotencyKey: "context-failure:claude",
      });
      const before = snapshotTree(fixture.root);

      await expect(
        getResearchDispatchContext({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "codex",
        }),
      ).rejects.toThrow(/approval|host/i);
      expect(snapshotTree(fixture.root)).toEqual(before);
    });

    it("executes the real generated Claude hook before public recording", async () => {
      const assets = readInstalledResearchHostAssets(installedRoot, "claude");
      expect(assets.worker).toContain("tools: Read, Write, Edit, Bash");
      expect(assets.worker).toContain("procedure.instructions");
      expect(assets.worker).toContain("record a Result or consume an approval");
      expect(assets.worker).toContain("mutate canonical Research state");
      expect(assets.worker).toContain("mutate Git history");
      expect(assets.worker).toContain("access network or external-cost services");
      expect(assets.worker).toContain("expand sandbox scope");
      expect(assets.worker).toContain("spawn nested agents");
      expect(assets.worker).not.toMatch(/^tools:.*\bSkill\b/m);
      expect(assets.workflow).toContain("Research dispatch: <dsp-id>");

      const lifecycle = await runApprovalConsumptionLifecycle({
        sandbox: path.join(sandbox, "claude-lifecycle"),
        host: "claude",
        idempotencyPrefix: "host-contract:claude",
        retainOtherHostApproval: true,
        beforeRecord: ({ root, contextResult }) =>
          runClaudeResearchHookProcess({
            hookPath: path.join(
              installedRoot,
              ".claude",
              "hooks",
              "inject-subagent-context.py",
            ),
            controlRoot: root,
            dispatchId: contextResult.context.dispatch.id,
            contextResponse: contextResult,
          }),
      });
      const hook = lifecycle.adapterResult;

      expect(hook.status).toBe(0);
      expect(hook.stderr).toBe("");
      const processRoot = fs.realpathSync(lifecycle.fixture.root);
      expect(hook.calls).toEqual([
        {
          argv: [
            "research",
            "dispatch",
            "context",
            lifecycle.fixture.ids.dispatchId,
            "--host",
            "claude",
            "--root",
            processRoot,
            "--json",
          ],
          cwd: processRoot,
        },
      ]);
      const hookOutput = hook.output as {
        hookSpecificOutput: { updatedInput: { prompt: string } };
      };
      const prompt = hookOutput.hookSpecificOutput.updatedInput.prompt;
      expect(prompt).toContain("VALIDATED_DISPATCH_CONTEXT_START");
      expect(prompt).toContain("VALIDATED_DISPATCH_CONTEXT_END");
      const injected = prompt
        .split("VALIDATED_DISPATCH_CONTEXT_START\n")[1]
        ?.split("\nVALIDATED_DISPATCH_CONTEXT_END")[0];
      expect(JSON.parse(String(injected))).toEqual(lifecycle.contextResult.context);

      await assertRecordedLifecycle(lifecycle);
    });

    it("validates Codex static adapter instructions before public recording", async () => {
      const assets = readInstalledResearchHostAssets(installedRoot, "codex");
      assertCodexResearchWorkerContract(assets.worker);
      expect(assets.workflow).toContain(
        "dispatch context <dsp-id> --host codex --root . --json",
      );

      const lifecycle = await runApprovalConsumptionLifecycle({
        sandbox: path.join(sandbox, "codex-lifecycle"),
        host: "codex",
        idempotencyPrefix: "host-contract:codex",
        retainOtherHostApproval: true,
        outcome: "blocked",
        beforeRecord: ({ contextResult }) => {
          expect(contextResult.context.host).toBe("codex");
          assertCodexResearchWorkerContract(assets.worker);
          return { staticContractValidated: true };
        },
      });

      expect(lifecycle.adapterResult).toEqual({ staticContractValidated: true });
      expect(lifecycle.recorded.result.status).toBe("blocked");
      expect(lifecycle.recorded.proposal.operations).toEqual([]);
      await assertRecordedLifecycle(lifecycle);
    });

    it("proves adapter integration, not live cloud-model compliance", () => {
      const claude = readInstalledResearchHostAssets(installedRoot, "claude");
      const codex = readInstalledResearchHostAssets(installedRoot, "codex");
      expect(claude.hook).toContain("subprocess.run");
      expect(codex.worker).toContain("The first process must be");
      expect(
        "Generated-hook execution, static Codex validation, and deterministic oracle output do not execute a live cloud model.",
      ).toContain("do not execute a live cloud model");
    });
  },
);

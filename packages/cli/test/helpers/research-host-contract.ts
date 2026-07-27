import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  readResearchLedger,
  readResearchState,
  type ResearchExecutionHost,
} from "@mindfoldhq/trellis-core/research";

import { authorizeResearchDispatch } from "../../src/commands/research/dispatch-activation-command.js";
import type { NormalizedResearchWorkerInputV1 } from "../../src/commands/research/dispatch-approved-context.js";
import {
  recordResearchDispatchResult,
  type RecordResearchDispatchResultResult,
} from "../../src/commands/research/dispatch-command.js";
import {
  getResearchDispatchContext,
  type ResearchDispatchContextResult,
} from "../../src/commands/research/dispatch-context.js";
import { createResearchDispatchFixture } from "../fixtures/research-dispatch.js";

export interface InstalledResearchHostAssets {
  readonly worker: string;
  readonly hook: string;
  readonly workflow: string;
}

export function readInstalledResearchHostAssets(
  root: string,
  host: ResearchExecutionHost,
): InstalledResearchHostAssets {
  const workerPath =
    host === "claude"
      ? path.join(root, ".claude", "agents", "trellis-research-worker.md")
      : path.join(root, ".codex", "agents", "trellis-research-worker.toml");
  const hookPath =
    host === "claude"
      ? path.join(root, ".claude", "hooks", "inject-subagent-context.py")
      : path.join(root, ".codex", "hooks", "inject-workflow-state.py");
  const workflowPath = path.join(root, ".trellis", "workflow.md");
  return {
    worker: fs.readFileSync(workerPath, "utf8"),
    hook: fs.readFileSync(hookPath, "utf8"),
    workflow: fs.readFileSync(workflowPath, "utf8"),
  };
}

export interface ClaudeResearchHookProcessOptions {
  readonly hookPath: string;
  readonly controlRoot: string;
  readonly dispatchId: `dsp_${string}`;
  readonly contextResponse: ResearchDispatchContextResult;
}

export interface ClaudeResearchHookProcessResult {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly calls: readonly Readonly<{
    argv: readonly string[];
    cwd: string;
  }>[];
  readonly output: unknown;
}

export function runClaudeResearchHookProcess(
  options: ClaudeResearchHookProcessOptions,
): ClaudeResearchHookProcessResult {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-claude-hook-"));
  try {
    const bin = path.join(sandbox, "bin");
    const callsPath = path.join(sandbox, "calls.jsonl");
    const responsePath = path.join(sandbox, "response.json");
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(responsePath, JSON.stringify(options.contextResponse));

    const fakeCli = path.join(bin, "trellis");
    fs.writeFileSync(
      fakeCli,
      `#!/usr/bin/env node\n` +
        `const fs = require("node:fs");\n` +
        `fs.appendFileSync(process.env.TRELLIS_FAKE_CALLS, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }) + "\\n");\n` +
        `process.stdout.write(fs.readFileSync(process.env.TRELLIS_FAKE_RESPONSE, "utf8"));\n`,
    );
    fs.chmodSync(fakeCli, 0o755);
    fs.writeFileSync(
      path.join(bin, "trellis.cmd"),
      `@"${process.execPath}" "${fakeCli}" %*\r\n`,
    );

    const hookInput = {
      tool_name: "Agent",
      tool_input: {
        subagent_type: "trellis-research-worker",
        prompt: `Research dispatch: ${options.dispatchId}`,
      },
      cwd: options.controlRoot,
    };
    const result = spawnSync(
      "uv",
      ["run", "python", options.hookPath],
      {
        cwd: options.controlRoot,
        encoding: "utf8",
        input: JSON.stringify(hookInput),
        env: {
          ...process.env,
          CLAUDE_PROJECT_DIR: options.controlRoot,
          PATH: `${bin}${path.delimiter}${process.env.PATH ?? ""}`,
          TRELLIS_FAKE_CALLS: callsPath,
          TRELLIS_FAKE_RESPONSE: responsePath,
        },
      },
    );
    const calls = fs.existsSync(callsPath)
      ? fs
          .readFileSync(callsPath, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(
            (line) =>
              JSON.parse(line) as { readonly argv: string[]; readonly cwd: string },
          )
      : [];
    let output: unknown = null;
    if (result.stdout.trim()) output = JSON.parse(result.stdout);
    return {
      status: result.status,
      stderr: result.stderr,
      stdout: result.stdout,
      calls,
      output,
    };
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

export function assertCodexResearchWorkerContract(toml: string): void {
  const required = [
    'sandbox_mode = "workspace-write"',
    "^Research dispatch: (dsp_",
    "The initial working directory is the Trellis Research control root.",
    "The first process must be one direct-argument invocation",
    "trellis research dispatch context <dsp-id> --host codex --root . --json",
    "context.procedure.instructions",
    "context.outputContract.resultId",
    "context.outputContract.proposalId",
    "Never request `danger-full-access`",
    "request `--add-dir`",
    "Never call `spawn_agent`",
    "record a Result or consume an approval",
    "mutate canonical Research state",
    "mutate Git history",
    "access network or external-cost services",
    "expand the sandbox",
    "spawn nested agents",
    "multi_agent = false",
  ];
  for (const text of required) {
    if (!toml.includes(text)) {
      throw new Error(`Codex Research worker is missing contract text: ${text}`);
    }
  }

  const ordered = [
    "## 1. Validate the exact invocation without a process",
    "## 2. Run Context as the first process",
    "## 3. Pre-Context failures are non-materializable",
    "## 4. Execute the embedded Procedure only",
    "## 5. Forbidden actions",
    "## 6. Return exact raw JSON after valid Context",
  ];
  let previous = -1;
  for (const marker of ordered) {
    const index = toml.indexOf(marker);
    if (index <= previous) {
      throw new Error(`Codex Research worker marker is missing or out of order: ${marker}`);
    }
    previous = index;
  }

  for (const forbidden of [
    "--skill-name",
    ".agents/skills",
    ".claude/skills",
    "SKILL.md",
    "selectedSkill",
    "optionalSkill",
    "fallbackSkill",
    "multi_agent = true",
  ]) {
    if (toml.includes(forbidden)) {
      throw new Error(`Codex Research worker contains forbidden active routing: ${forbidden}`);
    }
  }
}

export type DeterministicResearchWorkerOutcome = "completed" | "blocked";

export function makeDeterministicResearchWorkerOutput(
  context: NormalizedResearchWorkerInputV1,
  outcome: DeterministicResearchWorkerOutcome,
): Readonly<{ result: Record<string, unknown>; proposal: Record<string, unknown> }> {
  const createdAt = "2026-07-25T00:00:00.000Z";
  return {
    result: {
      id: context.outputContract.resultId,
      dispatchId: context.outputContract.dispatchId,
      runId: context.outputContract.runId,
      status: outcome,
      summary:
        outcome === "completed"
          ? "Deterministic bounded Procedure output"
          : "Declared work is blocked by the bounded fixture",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: outcome === "blocked" ? ["bounded fixture blocker"] : [],
      createdAt,
    },
    proposal: {
      id: context.outputContract.proposalId,
      dispatchId: context.outputContract.dispatchId,
      questId: context.outputContract.questId,
      title: "Review deterministic worker output",
      operations: [],
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    },
  };
}

export interface ApprovalConsumptionLifecycleOptions<T> {
  readonly sandbox: string;
  readonly host: ResearchExecutionHost;
  readonly idempotencyPrefix: string;
  readonly outcome?: DeterministicResearchWorkerOutcome;
  readonly retainOtherHostApproval?: boolean;
  readonly beforeRecord?: (input: {
    readonly root: string;
    readonly contextResult: ResearchDispatchContextResult;
  }) => T | Promise<T>;
}

export interface ApprovalConsumptionLifecycleResult<T> {
  readonly fixture: Awaited<ReturnType<typeof createResearchDispatchFixture>>;
  readonly approvalId: `apr_${string}`;
  readonly otherApprovalId: `apr_${string}` | null;
  readonly contextResult: ResearchDispatchContextResult;
  readonly workerOutput: ReturnType<typeof makeDeterministicResearchWorkerOutput>;
  readonly inputPath: string;
  readonly recordKey: string;
  readonly recorded: RecordResearchDispatchResultResult;
  readonly adapterResult: T | null;
  readonly ledger: Awaited<ReturnType<typeof readResearchLedger>>;
  readonly state: Awaited<ReturnType<typeof readResearchState>>;
}

export async function runApprovalConsumptionLifecycle<T = null>(
  options: ApprovalConsumptionLifecycleOptions<T>,
): Promise<ApprovalConsumptionLifecycleResult<T>> {
  const fixture = await createResearchDispatchFixture(options.sandbox, {
    automaticEnabled: true,
  });
  const granted = await authorizeResearchDispatch({
    root: fixture.root,
    dispatchId: fixture.ids.dispatchId,
    host: options.host,
    idempotencyKey: `${options.idempotencyPrefix}:grant:${options.host}`,
  });
  let otherApprovalId: `apr_${string}` | null = null;
  if (options.retainOtherHostApproval === true) {
    const otherHost = options.host === "claude" ? "codex" : "claude";
    const other = await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: otherHost,
      idempotencyKey: `${options.idempotencyPrefix}:grant:${otherHost}`,
    });
    otherApprovalId = other.approval.grant.id;
  }

  const contextResult = await getResearchDispatchContext({
    root: fixture.root,
    dispatchId: fixture.ids.dispatchId,
    host: options.host,
  });
  const adapterResult = options.beforeRecord
    ? await options.beforeRecord({ root: fixture.root, contextResult })
    : null;
  const workerOutput = makeDeterministicResearchWorkerOutput(
    contextResult.context,
    options.outcome ?? "completed",
  );
  const inputPath = path.join(fixture.root, "worker-output.json");
  fs.writeFileSync(inputPath, JSON.stringify(workerOutput));
  const recordKey = `${options.idempotencyPrefix}:record`;
  const recorded = await recordResearchDispatchResult({
    root: fixture.root,
    dispatchId: fixture.ids.dispatchId,
    approvalId: granted.approval.grant.id,
    input: { kind: "path", cwd: fixture.root, path: inputPath },
    idempotencyKey: recordKey,
  });

  return {
    fixture,
    approvalId: granted.approval.grant.id,
    otherApprovalId,
    contextResult,
    workerOutput,
    inputPath,
    recordKey,
    recorded,
    adapterResult,
    ledger: await readResearchLedger(fixture.root),
    state: await readResearchState(fixture.root),
  };
}

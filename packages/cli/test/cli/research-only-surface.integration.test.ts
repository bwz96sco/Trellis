import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ApprovalId,
  type ProposalId,
  type ResultId,
} from "@mindfoldhq/trellis-core/research";

import { authorizeResearchDispatch } from "../../src/commands/research/dispatch-activation-command.js";
import { createResearchDispatchFixture } from "../fixtures/research-dispatch.js";

const BUILT_CLI_PACKAGE_DIR = process.env.TRELLIS_TEST_BUILT_CLI_ROOT;
if (BUILT_CLI_PACKAGE_DIR === undefined) {
  throw new Error("Isolated built CLI root was not provided by global setup");
}
const BIN_ENTRY = path.join(BUILT_CLI_PACKAGE_DIR, "bin", "trellis.js");
const BUILT_ENTRY = path.join(BUILT_CLI_PACKAGE_DIR, "dist", "cli", "index.js");
const originalArgv = [...process.argv];

type CommanderExit = (exitCode: number, code: string, message: string) => never;

interface CliRun {
  commanderCode: string | undefined;
  stderr: string;
  stdout: string;
}

interface BuiltCliRun {
  readonly status: number | null;
  readonly stderr: string;
  readonly stdout: string;
}

const DISPATCH_ID = "dsp_123e4567-e89b-42d3-a456-426614174000";
const APPROVAL_ID = "apr_123e4567-e89b-42d3-a456-426614174000";

function makeWorkerOutput(input: {
  readonly approvalId: ApprovalId;
  readonly dispatchId: `dsp_${string}`;
  readonly runId: `run_${string}`;
  readonly questId: `qst_${string}`;
}): string {
  const suffix = input.approvalId.slice(4);
  const createdAt = new Date().toISOString();
  return JSON.stringify({
    result: {
      id: `res_${suffix}` as ResultId,
      dispatchId: input.dispatchId,
      runId: input.runId,
      status: "completed",
      summary: "Built parser lifecycle completed",
      commands: [],
      checks: [],
      artifactRefs: [],
      blockers: [],
      createdAt,
    },
    proposal: {
      id: `prp_${suffix}` as ProposalId,
      dispatchId: input.dispatchId,
      questId: input.questId,
      title: "No canonical changes",
      operations: [],
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    },
  });
}

function snapshotTree(root: string): Map<string, string> {
  const snapshot = new Map<string, string>();

  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");

      if (entry.isDirectory()) {
        snapshot.set(`${relative}/`, "directory");
        visit(absolute);
      } else if (entry.isSymbolicLink()) {
        snapshot.set(relative, `symlink:${fs.readlinkSync(absolute)}`);
      } else {
        snapshot.set(relative, fs.readFileSync(absolute, "utf8"));
      }
    }
  };

  visit(root);
  return snapshot;
}

function commandNames(help: string): string[] {
  const commandsIndex = help
    .split("\n")
    .findIndex((line) => line === "Commands:");
  if (commandsIndex === -1) return [];

  return help
    .split("\n")
    .slice(commandsIndex + 1)
    .map((line) => /^ {2}([a-z][a-z0-9-]*)\b/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined && name !== "help");
}

describe("Research-only CLI surface", () => {
  let commanderExitSpy: ReturnType<typeof vi.spyOn>;
  let stderr = "";
  let stdout = "";
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-cli-surface-"));
    fs.writeFileSync(path.join(tmpDir, "sentinel.txt"), "unchanged\n");

    vi.spyOn(process, "cwd").mockReturnValue(tmpDir);
    vi.spyOn(process.stdout, "write").mockImplementation(((chunk: unknown) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write);
    vi.spyOn(process.stderr, "write").mockImplementation(((chunk: unknown) => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write);
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as typeof process.exit);

    commanderExitSpy = vi.spyOn(
      Command.prototype as unknown as { _exit: CommanderExit },
      "_exit",
    );
  });

  afterEach(() => {
    process.argv = [...originalArgv];
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    stderr = "";
    stdout = "";
  });

  async function runCli(args: string[]): Promise<CliRun> {
    process.argv = [process.execPath, "trellis", ...args];
    commanderExitSpy.mockClear();
    stderr = "";
    stdout = "";
    vi.resetModules();

    await expect(import("../../src/cli/index.js")).rejects.toThrow(
      /^process\.exit:[01]$/,
    );

    const exitCall = commanderExitSpy.mock.calls.at(-1);
    return {
      commanderCode: exitCall?.[1] as string | undefined,
      stderr,
      stdout,
    };
  }

  function runBuiltAlias(
    alias: "trellis" | "tl",
    args: readonly string[],
    options: { readonly cwd?: string; readonly input?: string | Uint8Array } = {},
  ): BuiltCliRun {
    if (!fs.existsSync(BUILT_ENTRY)) {
      throw new Error(`Built CLI entry is missing: ${BUILT_ENTRY}`);
    }
    const result = spawnSync(process.execPath, [BIN_ENTRY, ...args], {
      argv0: alias,
      cwd: options.cwd ?? tmpDir,
      encoding: "utf8",
      input: options.input,
      timeout: 10_000,
    });
    return {
      status: result.status,
      stderr: result.stderr,
      stdout: result.stdout,
    };
  }

  it("exposes exactly the five Research product commands at the root", async () => {
    const result = await runCli(["--help"]);

    expect(result.commanderCode).toBe("commander.helpDisplayed");
    expect(commandNames(result.stdout)).toEqual([
      "init",
      "update",
      "upgrade",
      "uninstall",
      "research",
    ]);
  });

  it("exposes exactly the eleven supported Research command groups", async () => {
    const result = await runCli(["research", "--help"]);

    expect(result.commanderCode).toBe("commander.helpDisplayed");
    expect(commandNames(result.stdout)).toEqual([
      "init",
      "status",
      "validate",
      "rebuild",
      "repo",
      "quest",
      "campaign",
      "run",
      "evidence",
      "claim",
      "dispatch",
    ]);
  });

  it("keeps the exact nine Dispatch children", async () => {
    const result = await runCli(["research", "dispatch", "--help"]);

    expect(result.commanderCode).toBe("commander.helpDisplayed");
    expect(commandNames(result.stdout)).toEqual([
      "context",
      "prepare",
      "plan-activation",
      "authorize",
      "approve",
      "revoke",
      "record-result",
      "apply",
      "reject",
    ]);
  });

  it.each([
    ["channel", ["channel"]],
    ["mem", ["mem"]],
    ["workflow", ["workflow"]],
    ["research task", ["research", "task"]],
    ["research task link", ["research", "task", "link"]],
    ["research task unlink", ["research", "task", "unlink"]],
  ])(
    "rejects removed command %s before actions or writes",
    async (_name, args) => {
      const before = snapshotTree(tmpDir);
      const result = await runCli(args);

      expect(result.commanderCode).toBe("commander.unknownCommand");
      expect(snapshotTree(tmpDir)).toEqual(before);
    },
  );

  it.each([
    ["--user", "researcher"],
    ["--monorepo"],
    ["--no-monorepo"],
    ["--template", "electron-fullstack"],
    ["--registry", "gh:example/templates"],
    ["--overwrite"],
    ["--append"],
  ])(
    "rejects removed init option %s before actions or writes",
    async (...option) => {
      const before = snapshotTree(tmpDir);
      const result = await runCli(["init", ...option]);

      expect(result.commanderCode).toBe("commander.unknownOption");
      expect(result.stderr).toContain(`unknown option '${option[0]}'`);
      expect(snapshotTree(tmpDir)).toEqual(before);
    },
  );

  it.each([
    ["--claude"],
    ["--codex"],
    ["--with-statusline"],
    ["--yes"],
    ["--force"],
    ["--skip-existing"],
  ])(
    "keeps retained init option %s parseable without running init",
    async (flag) => {
      const before = snapshotTree(tmpDir);
      const result = await runCli(["init", flag, "--help"]);

      expect(result.commanderCode).toBe("commander.helpDisplayed");
      expect(result.stdout).toContain(flag);
      expect(snapshotTree(tmpDir)).toEqual(before);
    },
  );

  for (const alias of ["trellis", "tl"] as const) {
    it.each(["claude", "codex"] as const)(
      `${alias} accepts approved Dispatch-ID Context for %s`,
      async (host) => {
        const fixture = await createResearchDispatchFixture(
          path.join(tmpDir, `${alias}-${host}-context`),
          { automaticEnabled: true },
        );
        const granted = await authorizeResearchDispatch({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host,
          idempotencyKey: `${alias}:${host}:context`,
        });
        const before = snapshotTree(tmpDir);

        const result = runBuiltAlias(
          alias,
          [
            "research",
            "dispatch",
            "context",
            fixture.ids.dispatchId,
            "--host",
            host,
            "--root",
            ".",
            "--json",
          ],
          { cwd: fixture.root },
        );

        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        const output = JSON.parse(result.stdout) as {
          context: {
            approval: { id: string };
            dispatch: { id: string };
            host: string;
          };
        };
        expect(output.context).toMatchObject({
          approval: { id: granted.approval.grant.id },
          dispatch: { id: fixture.ids.dispatchId },
          host,
        });
        expect(snapshotTree(tmpDir)).toEqual(before);
      },
      30_000,
    );

    it.each(["path", "stdin"] as const)(
      `${alias} accepts approval-bound record-result %s input`,
      async (inputKind) => {
        const fixture = await createResearchDispatchFixture(
          path.join(tmpDir, `${alias}-${inputKind}-result`),
          { automaticEnabled: true },
        );
        const granted = await authorizeResearchDispatch({
          root: fixture.root,
          dispatchId: fixture.ids.dispatchId,
          host: "codex",
          idempotencyKey: `${alias}:${inputKind}:grant`,
        });
        const payload = makeWorkerOutput({
          approvalId: granted.approval.grant.id,
          dispatchId: fixture.ids.dispatchId,
          runId: fixture.ids.runId,
          questId: fixture.ids.questId,
        });
        const inputPath = path.join(fixture.root, "worker-output.json");
        if (inputKind === "path") fs.writeFileSync(inputPath, payload);

        const result = runBuiltAlias(
          alias,
          [
            "research",
            "dispatch",
            "record-result",
            fixture.ids.dispatchId,
            "--approval",
            granted.approval.grant.id,
            "--input",
            inputKind === "path" ? "worker-output.json" : "-",
            "--root",
            ".",
            "--idempotency-key",
            `${alias}:${inputKind}:record`,
            "--json",
          ],
          {
            cwd: fixture.root,
            input: inputKind === "stdin" ? payload : undefined,
          },
        );

        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        const output = JSON.parse(result.stdout) as {
          approval: { grant: { id: string }; status: string };
          events: { kind: string; schemaVersion: number }[];
        };
        expect(output.approval).toMatchObject({
          grant: { id: granted.approval.grant.id },
          status: "consumed",
        });
        expect(output.events.map((event) => [event.schemaVersion, event.kind])).toEqual([
          [1, "result.recorded"],
          [1, "proposal.recorded"],
          [2, "approval.consumed"],
        ]);
      },
      30_000,
    );

    it(`${alias} preserves malformed stdin bytes for strict UTF-8 rejection`, async () => {
      const fixture = await createResearchDispatchFixture(
        path.join(tmpDir, `${alias}-malformed-stdin-result`),
        { automaticEnabled: true },
      );
      const granted = await authorizeResearchDispatch({
        root: fixture.root,
        dispatchId: fixture.ids.dispatchId,
        host: "codex",
        idempotencyKey: `${alias}:malformed-stdin:grant`,
      });
      const before = snapshotTree(tmpDir);

      const result = runBuiltAlias(
        alias,
        [
          "research",
          "dispatch",
          "record-result",
          fixture.ids.dispatchId,
          "--approval",
          granted.approval.grant.id,
          "--input",
          "-",
          "--root",
          ".",
          "--idempotency-key",
          `${alias}:malformed-stdin:record`,
          "--json",
        ],
        {
          cwd: fixture.root,
          input: Uint8Array.from([0xc3, 0x28]),
        },
      );

      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("valid UTF-8");
      expect(snapshotTree(tmpDir)).toEqual(before);
    }, 30_000);

    it.each([
      [
        "request-path Context",
        [
          "research",
          "dispatch",
          "context",
          `.trellis/research/dispatches/${DISPATCH_ID}/request.json`,
          "--host",
          "claude",
          "--root",
          ".",
          "--json",
        ],
      ],
      [
        "Context --skill-name",
        [
          "research",
          "dispatch",
          "context",
          DISPATCH_ID,
          "--host",
          "claude",
          "--skill-name",
          "trellis-research-literature",
          "--root",
          ".",
          "--json",
        ],
      ],
      [
        "record-result --file",
        [
          "research",
          "dispatch",
          "record-result",
          DISPATCH_ID,
          "--approval",
          APPROVAL_ID,
          "--input",
          "worker-output.json",
          "--file",
          "legacy-worker-output.json",
          "--root",
          ".",
          "--json",
        ],
      ],
    ] as const)(`%s rejects legacy ${alias} syntax before writes`, (_name, args) => {
      const before = snapshotTree(tmpDir);
      const result = runBuiltAlias(alias, args);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/invalid for argument|unknown option/i);
      expect(snapshotTree(tmpDir)).toEqual(before);
    });
  }

  it("maps trellis and tl to the same built parser with identical help", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(BUILT_CLI_PACKAGE_DIR, "package.json"), "utf8"),
    ) as { bin: Record<string, string> };

    expect(packageJson.bin.trellis).toBe(packageJson.bin.tl);
    expect(path.resolve(BUILT_CLI_PACKAGE_DIR, packageJson.bin.trellis)).toBe(
      BIN_ENTRY,
    );

    if (!fs.existsSync(BUILT_ENTRY)) return;

    const runAlias = (alias: "trellis" | "tl") =>
      spawnSync(process.execPath, [BIN_ENTRY, "--help"], {
        argv0: alias,
        cwd: tmpDir,
        encoding: "utf8",
      });

    const trellis = runAlias("trellis");
    const tl = runAlias("tl");

    expect({
      status: trellis.status,
      stderr: trellis.stderr,
      stdout: trellis.stdout,
    }).toEqual({ status: tl.status, stderr: tl.stderr, stdout: tl.stdout });
    expect(trellis.status).toBe(0);
  });
});

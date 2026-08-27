import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const SOURCE_SCRIPTS = path.join(REPO_ROOT, ".trellis", "scripts");
const PYTHON = process.platform === "win32" ? "python" : "python3";
const tempRoots: string[] = [];

interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function makeTempRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function makeRepo(): string {
  const root = makeTempRoot("trellis-root-task-safety-");
  fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
  fs.cpSync(SOURCE_SCRIPTS, path.join(root, ".trellis", "scripts"), {
    recursive: true,
  });
  git(root, ["init", "-b", "feature"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Task Safety Test"]);
  git(root, ["commit", "--allow-empty", "-m", "fixture"]);
  return root;
}

function runTask(
  root: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
): CommandResult {
  const result = spawnSync(
    PYTHON,
    [path.join(root, ".trellis", "scripts", "task.py"), ...args],
    {
      cwd: root,
      encoding: "utf-8",
      env: {
        ...process.env,
        NO_COLOR: "1",
        PYTHONDONTWRITEBYTECODE: "1",
        TRELLIS_CONTEXT_ID: "root-task-safety",
        ...env,
      },
    },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function createTask(
  root: string,
  slug: string,
  extraArgs: string[] = [],
): { dir: string; result: CommandResult } {
  const result = runTask(root, [
    "create",
    `Task ${slug}`,
    "--slug",
    slug,
    "--assignee",
    "tester",
    "--no-start",
    ...extraArgs,
  ]);
  expect(result.status, result.stderr).toBe(0);
  const relativeDir = result.stdout.trim().split(/\r?\n/).at(-1);
  expect(relativeDir).toMatch(/^\.trellis\/tasks\//);
  return { dir: path.join(root, ...(relativeDir ?? "").split("/")), result };
}

function readTaskJson(taskDir: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(taskDir, "task.json"), "utf-8"),
  ) as Record<string, unknown>;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("root task/session safety", () => {
  it("uses explicit/default/fallback base branches deterministically", () => {
    const defaultRoot = makeRepo();
    git(defaultRoot, ["branch", "main"]);
    git(defaultRoot, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
      "refs/remotes/origin/main",
    ]);
    const fromDefault = createTask(defaultRoot, "default-branch");
    expect(readTaskJson(fromDefault.dir).base_branch).toBe("main");
    expect(fromDefault.result.stderr).not.toContain("could not resolve");

    const fallbackRoot = makeRepo();
    const remoteRoot = makeRepo();
    git(remoteRoot, ["branch", "-M", "main"]);
    git(fallbackRoot, ["remote", "add", "origin", remoteRoot]);
    const fromFallback = createTask(fallbackRoot, "fallback-branch");
    expect(readTaskJson(fromFallback.dir).base_branch).toBe("feature");
    expect(fromFallback.result.stderr).toContain(
      "could not resolve the repository's default branch",
    );

    const explicitRoot = makeRepo();
    const fromExplicit = createTask(explicitRoot, "explicit-branch", [
      "--base-branch",
      "release",
    ]);
    expect(readTaskJson(fromExplicit.dir).base_branch).toBe("release");
    expect(fromExplicit.result.stderr).not.toContain("could not resolve");
  });

  it("warns but still archives a task whose recorded branch is gone", () => {
    const root = makeRepo();
    const task = createTask(root, "archive-warning");
    const taskJson = readTaskJson(task.dir);
    taskJson.branch = "deleted-branch";
    fs.writeFileSync(
      path.join(task.dir, "task.json"),
      `${JSON.stringify(taskJson, null, 2)}\n`,
    );

    const result = runTask(root, ["archive", task.dir, "--no-commit"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toContain(
      "recorded branch 'deleted-branch' no longer exists locally",
    );
  });

  it("rejects external task refs without touching external task bytes", () => {
    const root = makeRepo();
    const child = createTask(root, "contained-child");
    const outside = makeTempRoot("trellis-external-task-");
    const outsideJson = path.join(outside, "task.json");
    const original = '{"title":"outside","sentinel":true}\n';
    fs.writeFileSync(outsideJson, original);

    const parentCreate = createTask(root, "external-parent", [
      "--parent",
      outside,
    ]);
    expect(parentCreate.result.stderr).toContain("Parent task.json not found");

    const commands = [
      ["start", outside],
      ["add-subtask", outside, child.dir],
      ["remove-subtask", outside, child.dir],
      ["set-branch", outside, "topic"],
      ["set-base-branch", outside, "main"],
      ["set-scope", outside, "cli"],
    ];
    for (const args of commands) {
      const result = runTask(root, args);
      expect(result.status, `${args.join(" ")}\n${result.stderr}`).not.toBe(0);
    }

    expect(fs.readFileSync(outsideJson, "utf-8")).toBe(original);
  });

  it.skipIf(process.platform === "win32")(
    "rejects a task symlink that resolves outside the repository",
    () => {
      const root = makeRepo();
      const outside = makeTempRoot("trellis-external-symlink-");
      fs.writeFileSync(path.join(outside, "task.json"), '{"sentinel":true}\n');
      const taskLink = path.join(root, ".trellis", "tasks", "linked-outside");
      fs.mkdirSync(path.dirname(taskLink), { recursive: true });
      fs.symlinkSync(outside, taskLink, "dir");

      const result = runTask(root, ["set-scope", taskLink, "cli"]);
      expect(result.status).not.toBe(0);
      expect(readTaskJson(outside)).toEqual({ sentinel: true });
    },
  );

  it("reports a poisoned legacy pointer as stale without reading or hooking it", () => {
    const root = makeRepo();
    const outside = makeTempRoot("trellis-poisoned-pointer-");
    fs.writeFileSync(
      path.join(outside, "task.json"),
      '{"title":"EXTERNAL_SECRET","status":"in_progress"}\n',
    );

    const sessions = path.join(root, ".trellis", ".runtime", "sessions");
    fs.mkdirSync(sessions, { recursive: true });
    fs.writeFileSync(
      path.join(sessions, "poison.json"),
      `${JSON.stringify({ current_task: outside })}\n`,
    );
    fs.writeFileSync(
      path.join(root, ".trellis", "config.yaml"),
      'hooks:\n  after_finish:\n    - "node .trellis/hook.js"\n',
    );
    fs.writeFileSync(
      path.join(root, ".trellis", "hook.js"),
      'require("node:fs").writeFileSync("hook-ran", "yes");\n',
    );

    const current = runTask(root, ["current", "--json"], {
      TRELLIS_CONTEXT_ID: "poison",
    });
    expect(current.status, current.stderr).toBe(0);
    expect(current.stdout).not.toContain("EXTERNAL_SECRET");
    expect(JSON.parse(current.stdout)).toMatchObject({
      current_task: null,
      stale: true,
    });

    const finish = runTask(root, ["finish"], {
      TRELLIS_CONTEXT_ID: "poison",
    });
    expect(finish.status, finish.stderr).toBe(0);
    expect(fs.existsSync(path.join(root, "hook-ran"))).toBe(false);
  });
});

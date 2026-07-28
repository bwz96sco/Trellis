import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  proposalSchema,
  resultSchema,
  type QuestStage,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, describe, expect, it } from "vitest";

import {
  PLATFORM_IDS,
  collectPlatformTemplates,
} from "../../src/configurators/index.js";
import { authorizeResearchDispatch } from "../../src/commands/research/dispatch-activation-command.js";
import { getResearchWorkerTemplate as getClaudeResearchWorkerTemplate } from "../../src/templates/claude/index.js";
import { getResearchWorkerTemplate as getCodexResearchWorkerTemplate } from "../../src/templates/codex/index.js";
import { getResearchDispatchContext } from "../../src/commands/research/dispatch-context.js";
import { RESEARCH_STAGE_SKILL_NAMES } from "../../src/legacy/research-skill-retirement.js";
import { getSharedHookScriptsForPlatform } from "../../src/templates/shared-hooks/index.js";
import {
  createResearchDispatchFixture,
  snapshotTree,
} from "../fixtures/research-dispatch.js";

const PYTHON = process.platform === "win32" ? "python" : "python3";
const NOW = "2026-07-17T12:00:00.000Z";
const IDS = {
  quest: "qst_11111111-1111-4111-8111-111111111111",
  quest2: "qst_22222222-2222-4222-8222-222222222222",
  campaign: "cmp_33333333-3333-4333-8333-333333333333",
  run: "run_44444444-4444-4444-8444-444444444444",
  repository: "rep_55555555-5555-4555-8555-555555555555",
  dispatch: "dsp_66666666-6666-4666-8666-666666666666",
  artifact: "art_77777777-7777-4777-8777-777777777777",
  proposal: "prp_88888888-8888-4888-8888-888888888888",
} as const;

const OWNER_BY_STAGE: Record<Exclude<QuestStage, "complete">, string> = {
  setup: "trellis-research-setup",
  framing: "trellis-research-quest",
  literature: "trellis-research-literature",
  ideation: "trellis-research-ideation",
  experiment: "trellis-research-experiment",
  computation: "trellis-research-computation",
  theory: "trellis-research-theory",
  audit: "trellis-research-audit",
  writing: "trellis-research-writing",
};

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeRoot(label: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `trellis-${label}-`));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  fs.mkdirSync(path.join(root, ".trellis"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".trellis", "workflow.md"),
    [
      "# Workflow",
      "",
      "## Phase Index",
      "",
      "[workflow-state:no_task]",
      "Native no-task breadcrumb.",
      "[/workflow-state:no_task]",
      "",
      "[workflow-state:in_progress]",
      "Native in-progress breadcrumb.",
      "[/workflow-state:in_progress]",
      "",
      "## Phase 1: Plan",
    ].join("\n"),
  );
  return root;
}

function writeJson(root: string, relativePath: string, value: unknown): void {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(root: string, relativePath: string, value: string): void {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
}

function projected(data: unknown, head = 4, updatedAt = NOW): unknown {
  return {
    schemaVersion: 1,
    projectedThroughSeq: head,
    updatedAt,
    data,
  };
}

function quest(
  id = IDS.quest,
  title = "Primary quest",
  stage: keyof typeof OWNER_BY_STAGE = "literature",
  updatedAt = NOW,
): Record<string, unknown> {
  return {
    id,
    title,
    description: "Bounded research question",
    status: "active",
    stage,
    repositoryIds: [IDS.repository],
    artifactRefs: [],
    createdAt: NOW,
    updatedAt,
  };
}

function writeLedger(root: string, head = 4): void {
  const lines = Array.from({ length: head }, (_, index) =>
    JSON.stringify({ seq: index + 1 }),
  );
  writeText(root, ".trellis/research/events.jsonl", `${lines.join("\n")}\n`);
}

function selectResearch(root: string): void {
  writeJson(root, ".trellis/.workflow.json", {
    schemaVersion: 1,
    id: "research",
    source: "bundled",
  });
}

function writeResearchOrientation(
  root: string,
  options: {
    quests?: Record<string, unknown>[];
    head?: number;
    pendingProposals?: number;
  } = {},
): void {
  selectResearch(root);
  writeLedger(root, options.head ?? 4);
  for (const item of options.quests ?? [quest()]) {
    const id = String(item.id);
    writeJson(
      root,
      `.trellis/research/quests/${id}/quest.json`,
      projected(item, options.head ?? 4, String(item.updatedAt)),
    );
  }
  for (let index = 0; index < (options.pendingProposals ?? 1); index += 1) {
    const suffix = String(index).padStart(12, "0");
    const dispatchId =
      index === 0 ? IDS.dispatch : `dsp_99999999-9999-4999-8999-${suffix}`;
    writeJson(
      root,
      `.trellis/research/dispatches/${dispatchId}/proposal.json`,
      {
        id:
          index === 0 ? IDS.proposal : `prp_99999999-9999-4999-8999-${suffix}`,
        dispatchId,
        questId: IDS.quest,
        title: `Proposal ${index}`,
        operations: [],
        status: "pending",
        createdAt: NOW,
        updatedAt: NOW,
      },
    );
  }
}

function hookSource(name: string): string {
  const hook = getSharedHookScriptsForPlatform("claude").find(
    (entry) => entry.name === name,
  );
  if (!hook) throw new Error(`Missing shared hook ${name}`);
  return hook.content;
}

function cleanPlatformEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const name of [
    "CLAUDE_PROJECT_DIR",
    "CURSOR_PROJECT_DIR",
    "CODEBUDDY_PROJECT_DIR",
    "FACTORY_PROJECT_DIR",
    "GEMINI_PROJECT_DIR",
    "QODER_PROJECT_DIR",
    "KIRO_PROJECT_DIR",
    "COPILOT_PROJECT_DIR",
    "TRAE_PROJECT_DIR",
    "ZCODE_PROJECT_DIR",
    "TRELLIS_CONTEXT_ID",
    "CLAUDE_SESSION_ID",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_TRANSCRIPT_PATH",
    "CURSOR_SESSION_ID",
    "CURSOR_CONVERSATION_ID",
    "CURSOR_TRANSCRIPT_PATH",
    "QODER_SESSION_ID",
    "CODEBUDDY_SESSION_ID",
    "FACTORY_SESSION_ID",
    "DROID_SESSION_ID",
    "GEMINI_SESSION_ID",
    "KIRO_SESSION_ID",
    "COPILOT_SESSION_ID",
    "TRAE_SESSION_ID",
  ]) {
    Reflect.deleteProperty(env, name);
  }
  env.PYTHONIOENCODING = "utf-8";
  return env;
}

function runHook(
  root: string,
  hookName: string,
  input: Record<string, unknown>,
  envOverrides: NodeJS.ProcessEnv = {},
): string {
  const hookPath = path.join(root, ".claude", "hooks", hookName);
  fs.mkdirSync(path.dirname(hookPath), { recursive: true });
  fs.writeFileSync(hookPath, hookSource(hookName));
  const result = spawnSync(PYTHON, [hookPath], {
    cwd: root,
    input: JSON.stringify(input),
    encoding: "utf-8",
    env: { ...cleanPlatformEnv(), ...envOverrides },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${hookName} failed (${result.status}): ${result.stderr}`);
  }
  return result.stdout;
}

function parseAdditionalContext(output: string): string {
  const parsed = JSON.parse(output) as {
    hookSpecificOutput: { additionalContext: string };
  };
  return parsed.hookSpecificOutput.additionalContext;
}

function runDispatch(
  root: string,
  prompt: string,
  subagentType = "trellis-research-worker",
  inputCwd = root,
  envOverrides: NodeJS.ProcessEnv = {},
): string {
  return runHook(
    root,
    "inject-subagent-context.py",
    {
      cwd: inputCwd,
      session_id: "dispatch-session",
      tool_name: "Agent",
      tool_input: {
        subagent_type: subagentType,
        prompt,
      },
    },
    { CLAUDE_PROJECT_DIR: root, ...envOverrides },
  );
}

interface HookDecision {
  hookSpecificOutput: {
    permissionDecision: "allow" | "deny";
    permissionDecisionReason?: string;
    updatedInput?: { prompt: string };
  };
}

function parseHookDecision(output: string): HookDecision {
  return JSON.parse(output) as HookDecision;
}

function updatedPrompt(output: string): string {
  const prompt = parseHookDecision(output).hookSpecificOutput.updatedInput?.prompt;
  if (prompt === undefined) throw new Error("Hook output did not include a prompt");
  return prompt;
}

function validatedDispatchContext(prompt: string): Record<string, unknown> {
  const match = prompt.match(
    /VALIDATED_DISPATCH_CONTEXT_START\n([^\n]+)\nVALIDATED_DISPATCH_CONTEXT_END/,
  );
  if (!match) throw new Error("Validated Dispatch JSON block was not found");
  return JSON.parse(match[1] ?? "") as Record<string, unknown>;
}

interface FakePreflightResponse {
  status: number;
  stdout?: string;
  stderr?: string;
}

function installFakeTrellis(responses: FakePreflightResponse[]): {
  env: NodeJS.ProcessEnv;
  argvLog: string;
} {
  const fakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-fake-cli-"));
  tempRoots.push(fakeRoot);
  const bin = path.join(fakeRoot, "bin");
  const executable = path.join(bin, "trellis");
  const responseFile = path.join(fakeRoot, "responses.json");
  const argvLog = path.join(fakeRoot, "argv.jsonl");
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(responseFile, JSON.stringify(responses));
  fs.writeFileSync(
    executable,
    [
      "#!/usr/bin/env python3",
      "import json, os, sys",
      "from pathlib import Path",
      "responses = json.loads(Path(os.environ['FAKE_TRELLIS_RESPONSES']).read_text(encoding='utf-8'))",
      "log = Path(os.environ['FAKE_TRELLIS_ARGV_LOG'])",
      "index = len(log.read_text(encoding='utf-8').splitlines()) if log.exists() else 0",
      "with log.open('a', encoding='utf-8') as handle:",
      "    handle.write(json.dumps(sys.argv[1:]) + '\\n')",
      "if index >= len(responses):",
      "    sys.stderr.write('unexpected fake trellis invocation')",
      "    raise SystemExit(97)",
      "response = responses[index]",
      "sys.stdout.write(response.get('stdout', ''))",
      "sys.stderr.write(response.get('stderr', ''))",
      "raise SystemExit(response['status'])",
      "",
    ].join("\n"),
  );
  fs.chmodSync(executable, 0o755);
  return {
    env: {
      HOME: path.join(fakeRoot, "home"),
      PATH: `${bin}${path.delimiter}${process.env.PATH ?? ""}`,
      FAKE_TRELLIS_RESPONSES: responseFile,
      FAKE_TRELLIS_ARGV_LOG: argvLog,
    },
    argvLog,
  };
}

function readFakeArgv(argvLog: string): string[][] {
  if (!fs.existsSync(argvLog)) return [];
  return fs
    .readFileSync(argvLog, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

describe("research stage-owner and worker templates", () => {
  it("has retired stage-owner skill names only as historical targets (C09)", () => {
    expect([...RESEARCH_STAGE_SKILL_NAMES].sort()).toEqual(
      Object.values(OWNER_BY_STAGE).sort(),
    );
    for (const skillName of Object.values(OWNER_BY_STAGE)) {
      expect(
        fs.existsSync(
          path.join(
            path.dirname(fileURLToPath(import.meta.url)),
            "../../src/templates/common/bundled-skills",
            skillName,
          ),
        ),
      ).toBe(false);
    }
  });

  it("does not generate stage-owner skills through platform template collectors", () => {
    for (const platform of PLATFORM_IDS) {
      const templates = collectPlatformTemplates(platform);
      expect(
        templates,
        `${platform} must expose collected templates`,
      ).toBeDefined();
      for (const skillName of Object.values(OWNER_BY_STAGE)) {
        const paths = [...(templates?.keys() ?? [])].filter((filePath) =>
          filePath.replaceAll("\\", "/").endsWith(`/${skillName}/SKILL.md`),
        );
        expect(paths, `${platform} must not generate ${skillName}`).toEqual([]);
      }
    }
  });

  it("ships separate generic Claude and Codex Procedure workers", () => {
    const claudeWorker = getClaudeResearchWorkerTemplate().content;
    expect(claudeWorker).toContain("tools: Read, Write, Edit, Bash");
    expect(claudeWorker).not.toContain("tools: Read, Write, Edit, Bash, Skill");
    expect(claudeWorker).toContain("# Validated Research Dispatch");
    expect(claudeWorker).toContain("VALIDATED_DISPATCH_CONTEXT_START");
    expect(claudeWorker).toContain("procedure.instructions");
    expect(claudeWorker).toContain("outputContract.resultId");
    expect(claudeWorker).toContain("Immediately before each write");
    expect(claudeWorker).toContain("blocked Result and empty pending Proposal");
    expect(claudeWorker).toContain("record-result");
    expect(claudeWorker).toContain("git commit");
    expect(claudeWorker).not.toContain("selectedSkill");
    expect(claudeWorker).not.toContain("Skill tool");

    const codexWorker = getCodexResearchWorkerTemplate().content;
    expect(codexWorker).toContain("Run Context as the first process");
    expect(codexWorker).toContain(
      "trellis research dispatch context <dsp-id> --host codex --root . --json",
    );
    expect(codexWorker).toContain("context.procedure.instructions");
    expect(codexWorker).toContain("context.outputContract.resultId");
    expect(codexWorker).toContain('sandbox_mode = "workspace-write"');
    expect(codexWorker).toContain("multi_agent = false");
    expect(codexWorker).not.toContain("--skill-name");
    expect(codexWorker).not.toContain("request.json");
  });
});

describe("research SessionStart orientation", () => {
  it("emits compact one-Quest state and atomically preserves session metadata", () => {
    const root = makeRoot("research-session");
    writeResearchOrientation(root, { pendingProposals: 1 });
    writeJson(root, ".trellis/.runtime/sessions/claude_session-a.json", {
      current_task: ".trellis/tasks/example",
      current_run: IDS.run,
      platform: "claude",
      unknown: { keep: true },
    });

    const output = runHook(
      root,
      "session-start.py",
      { cwd: root, session_id: "session-a" },
      { CLAUDE_PROJECT_DIR: root },
    );
    const context = parseAdditionalContext(output);
    expect(context).toContain("<research-state>");
    expect(context).toContain("Ledger head: 4");
    expect(context).toContain(`${IDS.quest} — Primary quest`);
    expect(context).toContain("Stage: literature");
    expect(context).toContain(`Owner skill: ${OWNER_BY_STAGE.literature}`);
    expect(context).toContain("Pending Proposals: 1");
    expect(context).toContain(".trellis/research/events.jsonl");
    expect(context).not.toContain("Bounded research question");

    const session = JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          ".trellis",
          ".runtime",
          "sessions",
          "claude_session-a.json",
        ),
        "utf-8",
      ),
    ) as Record<string, unknown>;
    expect(session).toEqual({
      current_task: ".trellis/tasks/example",
      current_run: IDS.run,
      platform: "claude",
      unknown: { keep: true },
      research_last_seen_seq: 4,
    });
    const runtimeFiles = fs.readdirSync(
      path.join(root, ".trellis", ".runtime", "sessions"),
    );
    expect(runtimeFiles.filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("reports no active Quest and deterministically identifies ambiguity", () => {
    const emptyRoot = makeRoot("research-empty");
    writeResearchOrientation(emptyRoot, { quests: [], pendingProposals: 0 });
    const emptyContext = parseAdditionalContext(
      runHook(
        emptyRoot,
        "session-start.py",
        { cwd: emptyRoot, session_id: "empty" },
        { CLAUDE_PROJECT_DIR: emptyRoot },
      ),
    );
    expect(emptyContext).toContain("Current Quest: none");
    expect(emptyContext).toContain("Active Quest count: 0");

    const multiRoot = makeRoot("research-multi");
    writeResearchOrientation(multiRoot, {
      quests: [
        quest(IDS.quest, "Older quest", "framing", "2026-07-16T12:00:00.000Z"),
        quest(IDS.quest2, "Newer quest", "audit", "2026-07-17T13:00:00.000Z"),
      ],
      pendingProposals: 0,
    });
    const multiContext = parseAdditionalContext(
      runHook(
        multiRoot,
        "session-start.py",
        { cwd: multiRoot, session_id: "multi" },
        { CLAUDE_PROJECT_DIR: multiRoot },
      ),
    );
    expect(multiContext).toContain(`${IDS.quest2} — Newer quest`);
    expect(multiContext).toContain("Active Quest count: 2 (ambiguous)");
    expect(multiContext).toContain(`Owner skill: ${OWNER_BY_STAGE.audit}`);
  });

  it("stays silent when bundled Research is not selected even if state exists", () => {
    const root = makeRoot("research-session-native-selection");
    writeLedger(root, 4);
    writeJson(root, ".trellis/.workflow.json", {
      schemaVersion: 1,
      id: "native",
      source: "bundled",
    });

    expect(
      runHook(
        root,
        "session-start.py",
        { cwd: root, session_id: "native" },
        { CLAUDE_PROJECT_DIR: root },
      ),
    ).toBe("");
    expect(
      fs.existsSync(path.join(root, ".trellis", ".runtime", "sessions")),
    ).toBe(false);
  });

  it("warns compactly for malformed canonical research inputs", () => {
    const cases: {
      label: string;
      mutate: (root: string) => void;
    }[] = [
      {
        label: "selection",
        mutate: (root) =>
          writeText(root, ".trellis/.workflow.json", "{broken}\n"),
      },
      {
        label: "ledger",
        mutate: (root) =>
          writeText(
            root,
            ".trellis/research/events.jsonl",
            `${JSON.stringify({ seq: 1 })}\n${JSON.stringify({ seq: 3 })}\n`,
          ),
      },
      {
        label: "quest projection",
        mutate: (root) =>
          writeJson(root, `.trellis/research/quests/${IDS.quest}/quest.json`, {
            schemaVersion: 1,
            data: { id: IDS.quest },
          }),
      },
      {
        label: "quest status",
        mutate: (root) => {
          const projectionPath = `.trellis/research/quests/${IDS.quest}/quest.json`;
          const projection = JSON.parse(
            fs.readFileSync(path.join(root, projectionPath), "utf-8"),
          );
          projection.data.status = "mystery";
          writeJson(root, projectionPath, projection);
        },
      },
      {
        label: "quest path ID",
        mutate: (root) => {
          const projectionPath = `.trellis/research/quests/${IDS.quest}/quest.json`;
          const projection = JSON.parse(
            fs.readFileSync(path.join(root, projectionPath), "utf-8"),
          );
          projection.data.id = IDS.quest2;
          writeJson(root, projectionPath, projection);
        },
      },
      {
        label: "proposal",
        mutate: (root) =>
          writeJson(
            root,
            `.trellis/research/dispatches/${IDS.dispatch}/proposal.json`,
            { status: "pending" },
          ),
      },
      {
        label: "proposal status",
        mutate: (root) => {
          const proposalPath = `.trellis/research/dispatches/${IDS.dispatch}/proposal.json`;
          const proposal = JSON.parse(
            fs.readFileSync(path.join(root, proposalPath), "utf-8"),
          );
          proposal.status = "mystery";
          writeJson(root, proposalPath, proposal);
        },
      },
      {
        label: "proposal path ID",
        mutate: (root) => {
          const proposalPath = `.trellis/research/dispatches/${IDS.dispatch}/proposal.json`;
          const proposal = JSON.parse(
            fs.readFileSync(path.join(root, proposalPath), "utf-8"),
          );
          proposal.dispatchId = "dsp_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
          writeJson(root, proposalPath, proposal);
        },
      },
    ];

    for (const testCase of cases) {
      const root = makeRoot(`research-malformed-${testCase.label}`);
      writeResearchOrientation(root, { pendingProposals: 1 });
      writeJson(root, ".trellis/.runtime/sessions/claude_bad.json", {
        keep: testCase.label,
      });
      testCase.mutate(root);

      const context = parseAdditionalContext(
        runHook(
          root,
          "session-start.py",
          { cwd: root, session_id: "bad" },
          { CLAUDE_PROJECT_DIR: root },
        ),
      );
      expect(context).toContain("Warning: research state invalid");
      expect(context).toContain("trellis research validate --json");
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(
              root,
              ".trellis",
              ".runtime",
              "sessions",
              "claude_bad.json",
            ),
            "utf-8",
          ),
        ),
      ).toEqual({ keep: testCase.label });
    }
  });

  it("does not create a watermark without identity or overwrite malformed session JSON", () => {
    const noIdentityRoot = makeRoot("research-no-identity");
    writeResearchOrientation(noIdentityRoot);
    runHook(
      noIdentityRoot,
      "session-start.py",
      { cwd: noIdentityRoot },
      { CLAUDE_PROJECT_DIR: noIdentityRoot },
    );
    const sessionsDir = path.join(
      noIdentityRoot,
      ".trellis",
      ".runtime",
      "sessions",
    );
    expect(fs.existsSync(sessionsDir)).toBe(false);

    const malformedRoot = makeRoot("research-malformed-session");
    writeResearchOrientation(malformedRoot);
    writeText(
      malformedRoot,
      ".trellis/.runtime/sessions/claude_broken.json",
      "[not-an-object]\n",
    );
    runHook(
      malformedRoot,
      "session-start.py",
      { cwd: malformedRoot, session_id: "broken" },
      { CLAUDE_PROJECT_DIR: malformedRoot },
    );
    expect(
      fs.readFileSync(
        path.join(
          malformedRoot,
          ".trellis",
          ".runtime",
          "sessions",
          "claude_broken.json",
        ),
        "utf-8",
      ),
    ).toBe("[not-an-object]\n");
  });
});

describe("research UserPromptSubmit sequence watermark", () => {
  it("is silent when unchanged, emits once on change, then becomes silent", () => {
    const root = makeRoot("research-sequence");
    writeResearchOrientation(root, { head: 4 });
    writeJson(root, ".trellis/.runtime/sessions/claude_sequence.json", {
      current_task: ".trellis/tasks/example",
      current_run: IDS.run,
      unknown: false,
      research_last_seen_seq: 4,
    });
    const input = { cwd: root, session_id: "sequence" };
    const env = { CLAUDE_PROJECT_DIR: root };

    expect(runHook(root, "inject-workflow-state.py", input, env)).toBe("");

    writeLedger(root, 5);
    const changed = parseAdditionalContext(
      runHook(root, "inject-workflow-state.py", input, env),
    );
    expect(changed).toContain("<research-state-changed>");
    expect(changed).toContain("Ledger head changed: 4 -> 5");
    expect(changed).toContain("trellis research status --json");
    expect(runHook(root, "inject-workflow-state.py", input, env)).toBe("");

    const session = JSON.parse(
      fs.readFileSync(
        path.join(
          root,
          ".trellis",
          ".runtime",
          "sessions",
          "claude_sequence.json",
        ),
        "utf-8",
      ),
    );
    expect(session).toEqual({
      current_task: ".trellis/tasks/example",
      current_run: IDS.run,
      unknown: false,
      research_last_seen_seq: 5,
    });
  });

  it("emits validation guidance without overwriting watermark on malformed ledger", () => {
    const root = makeRoot("research-sequence-invalid");
    writeResearchOrientation(root, { head: 2 });
    writeJson(root, ".trellis/.runtime/sessions/claude_invalid.json", {
      research_last_seen_seq: 2,
      keep: true,
    });
    writeText(
      root,
      ".trellis/research/events.jsonl",
      `${JSON.stringify({ seq: 2 })}\n`,
    );

    const context = parseAdditionalContext(
      runHook(
        root,
        "inject-workflow-state.py",
        { cwd: root, session_id: "invalid" },
        { CLAUDE_PROJECT_DIR: root },
      ),
    );
    expect(context).toContain("research state invalid");
    expect(context).toContain("trellis research validate --json");
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(
            root,
            ".trellis",
            ".runtime",
            "sessions",
            "claude_invalid.json",
          ),
          "utf-8",
        ),
      ),
    ).toEqual({ research_last_seen_seq: 2, keep: true });
  });

  it("fails open without identity and preserves malformed session JSON", () => {
    const noIdentityRoot = makeRoot("research-sequence-no-identity");
    writeResearchOrientation(noIdentityRoot, { head: 4 });
    expect(
      runHook(
        noIdentityRoot,
        "inject-workflow-state.py",
        { cwd: noIdentityRoot },
        { CLAUDE_PROJECT_DIR: noIdentityRoot },
      ),
    ).toBe("");
    expect(
      fs.existsSync(
        path.join(noIdentityRoot, ".trellis", ".runtime", "sessions"),
      ),
    ).toBe(false);

    const malformedRoot = makeRoot("research-sequence-malformed-session");
    writeResearchOrientation(malformedRoot, { head: 4 });
    writeText(
      malformedRoot,
      ".trellis/.runtime/sessions/claude_broken.json",
      "[not-an-object]\n",
    );
    expect(
      runHook(
        malformedRoot,
        "inject-workflow-state.py",
        { cwd: malformedRoot, session_id: "broken" },
        { CLAUDE_PROJECT_DIR: malformedRoot },
      ),
    ).toBe("");
    expect(
      fs.readFileSync(
        path.join(
          malformedRoot,
          ".trellis",
          ".runtime",
          "sessions",
          "claude_broken.json",
        ),
        "utf-8",
      ),
    ).toBe("[not-an-object]\n");
  });

  it("is Research-only for both registered hosts", () => {
    const nativeRoot = makeRoot("research-native-breadcrumb");
    writeJson(nativeRoot, ".trellis/.workflow.json", {
      schemaVersion: 1,
      id: "native",
      source: "bundled",
    });
    expect(
      runHook(
        nativeRoot,
        "inject-workflow-state.py",
        { cwd: nativeRoot, session_id: "native" },
        { CLAUDE_PROJECT_DIR: nativeRoot },
      ),
    ).toBe("");

    const codexRoot = makeRoot("research-codex-sequence");
    writeResearchOrientation(codexRoot, { head: 4 });
    const input = { cwd: codexRoot, thread_id: "codex" };
    const env = { CODEX_HOME: path.join(codexRoot, ".codex") };
    const codexContext = parseAdditionalContext(
      runHook(codexRoot, "inject-workflow-state.py", input, env),
    );
    expect(codexContext).toContain("<research-state-changed>");
    expect(codexContext).toContain("Ledger head changed: missing -> 4");
    expect(runHook(codexRoot, "inject-workflow-state.py", input, env)).toBe("");
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(
            codexRoot,
            ".trellis",
            ".runtime",
            "sessions",
            "codex_codex.json",
          ),
          "utf-8",
        ),
      ),
    ).toEqual({ research_last_seen_seq: 4 });
  });
});

describe("Claude Research Procedure Dispatch adapter", { timeout: 60_000 }, () => {
  async function approvedClaudeContext(sandbox: string) {
    const fixture = await createResearchDispatchFixture(sandbox, {
      automaticEnabled: true,
    });
    await authorizeResearchDispatch({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
      idempotencyKey: `hook:${fixture.ids.dispatchId}`,
    });
    const response = await getResearchDispatchContext({
      root: fixture.root,
      dispatchId: fixture.ids.dispatchId,
      host: "claude",
    });
    return { fixture, response };
  }

  it("uses one exact Dispatch-ID Context process with no Skill routing", () => {
    const hook = hookSource("inject-subagent-context.py");
    expect(hook).toContain('"context",');
    expect(hook).toContain('"claude",');
    expect(hook).toContain('"--json"');
    expect(hook).toContain('"permissionDecision": "deny"');
    expect(hook).not.toContain("--skill-name");
    expect(hook).not.toContain("SKILL.md");
    expect(hook).not.toContain("optional_skill");
    expect(hook).not.toContain("request.json");
    expect(hook).not.toContain("_parse_dispatch_request");
    expect(hook).not.toContain("_validate_dispatch_hierarchy");
  });

  it("injects only validated normalized Context and preserves the fixture tree", async () => {
    const sandbox = makeRoot("procedure-success");
    const { fixture, response } = await approvedClaudeContext(sandbox);
    const fake = installFakeTrellis([
      { status: 0, stdout: JSON.stringify(response) },
    ]);
    expect(
      runDispatch(
        fixture.root,
        "<!-- trellis-hook-injected -->",
        "trellis-research-worker",
        fixture.root,
        fake.env,
      ),
    ).toBe("");
    const before = snapshotTree(sandbox);

    const output = runDispatch(
      fixture.root,
      `Research dispatch: ${fixture.ids.dispatchId}`,
      "trellis-research-worker",
      fixture.root,
      fake.env,
    );
    const decision = parseHookDecision(output);
    expect(
      decision.hookSpecificOutput.permissionDecision,
      decision.hookSpecificOutput.permissionDecisionReason,
    ).toBe("allow");
    const prompt = updatedPrompt(output);
    expect(prompt).toContain("# Validated Research Dispatch");
    expect(validatedDispatchContext(prompt)).toEqual(response.context);
    expect(validatedDispatchContext(prompt)).not.toHaveProperty("command");
    expect(prompt).not.toContain(fixture.artifactBody.trim());
    expect(readFakeArgv(fake.argvLog)).toEqual([
      [
        "research",
        "dispatch",
        "context",
        fixture.ids.dispatchId,
        "--host",
        "claude",
        "--root",
        fs.realpathSync(fixture.root),
        "--json",
      ],
    ]);
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("denies every noncanonical worker envelope before starting Context", async () => {
    const sandbox = makeRoot("procedure-envelope");
    const { fixture } = await approvedClaudeContext(sandbox);
    const fake = installFakeTrellis([]);
    const id = fixture.ids.dispatchId;
    const invalidPrompts = [
      `\nResearch dispatch: ${id}`,
      `Research dispatch: ${id}\n`,
      `Research dispatch: ${id}\nextra`,
      `prefix Research dispatch: ${id}`,
      `Research dispatch: ${id} suffix`,
      `Research Dispatch: ${id}`,
      `Research dispatch: ${id.toUpperCase()}`,
      `Research dispatch: ${fixture.requestRef}`,
      `Research dispatch: ${id} --approval apr_11111111-1111-4111-8111-111111111111`,
    ];

    for (const prompt of invalidPrompts) {
      const decision = parseHookDecision(
        runDispatch(
          fixture.root,
          prompt,
          "trellis-research-worker",
          fixture.root,
          fake.env,
        ),
      );
      expect(decision.hookSpecificOutput.permissionDecision).toBe("deny");
      expect(decision.hookSpecificOutput.permissionDecisionReason).toContain(
        "[PREFLIGHT_EXECUTION_FAILED]",
      );
      expect(decision.hookSpecificOutput.updatedInput).toBeUndefined();
    }
    expect(readFakeArgv(fake.argvLog)).toEqual([]);
  });

  it("runs no process for ordinary agents or already-injected prompts", async () => {
    const sandbox = makeRoot("procedure-no-process");
    const { fixture } = await approvedClaudeContext(sandbox);
    const envelope = `Research dispatch: ${fixture.ids.dispatchId}`;
    const fake = installFakeTrellis([]);
    expect(
      runDispatch(
        fixture.root,
        envelope,
        "trellis-implement",
        fixture.root,
        fake.env,
      ),
    ).toBe("");
    expect(
      runDispatch(
        fixture.root,
        `${envelope}\n<!-- trellis-hook-injected -->`,
        "trellis-research-worker",
        fixture.root,
        fake.env,
      ),
    ).toBe("");
    expect(readFakeArgv(fake.argvLog)).toEqual([]);
  });

  it("preserves one typed no-write failure as a bounded Claude denial", async () => {
    const sandbox = makeRoot("procedure-typed-failure");
    const { fixture } = await approvedClaudeContext(sandbox);
    const failure = {
      schemaVersion: 1,
      command: "research dispatch context",
      valid: false,
      error: {
        code: "APPROVAL_EXPIRED",
        message: "Selected approval has expired",
      },
      safeAction: "report-to-root-no-write",
    };
    const fake = installFakeTrellis([
      { status: 1, stderr: JSON.stringify(failure) },
    ]);
    expect(
      runDispatch(
        fixture.root,
        "<!-- trellis-hook-injected -->",
        "trellis-research-worker",
        fixture.root,
        fake.env,
      ),
    ).toBe("");
    const before = snapshotTree(sandbox);

    const decision = parseHookDecision(
      runDispatch(
        fixture.root,
        `Research dispatch: ${fixture.ids.dispatchId}`,
        "trellis-research-worker",
        fixture.root,
        fake.env,
      ),
    );
    expect(decision.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(decision.hookSpecificOutput.permissionDecisionReason).toBe(
      "Research Dispatch preflight failed [APPROVAL_EXPIRED]: Selected approval has expired",
    );
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("fails closed for malformed, mismatched, and oversized successful output", async () => {
    const sandbox = makeRoot("procedure-anomalies");
    const { fixture, response } = await approvedClaudeContext(sandbox);
    const mutated = structuredClone(response);
    mutated.context.authority.network = true as false;
    const wrongId = structuredClone(response);
    wrongId.context.outputContract.resultId =
      "res_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const cases: FakePreflightResponse[] = [
      { status: 0, stdout: "" },
      { status: 0, stdout: "{" },
      { status: 0, stdout: `${JSON.stringify(response)} {}` },
      { status: 0, stdout: JSON.stringify(response), stderr: "warning" },
      { status: 0, stdout: JSON.stringify(mutated) },
      { status: 0, stdout: JSON.stringify(wrongId) },
      { status: 1, stderr: "not-json" },
      { status: 0, stdout: " ".repeat(1_048_577) },
    ];

    for (const responseCase of cases) {
      const fake = installFakeTrellis([responseCase]);
      const decision = parseHookDecision(
        runDispatch(
          fixture.root,
          `Research dispatch: ${fixture.ids.dispatchId}`,
          "trellis-research-worker",
          fixture.root,
          fake.env,
        ),
      );
      expect(decision.hookSpecificOutput.permissionDecision).toBe("deny");
      expect(decision.hookSpecificOutput.permissionDecisionReason).toContain(
        "[PREFLIGHT_EXECUTION_FAILED]",
      );
      expect(decision.hookSpecificOutput.updatedInput).toBeUndefined();
    }
  });

  it("discovers the control root from a child Repository invocation", async () => {
    const sandbox = makeRoot("procedure-child-root");
    const { fixture, response } = await approvedClaudeContext(sandbox);
    const fake = installFakeTrellis([
      { status: 0, stdout: JSON.stringify(response) },
    ]);

    const prompt = updatedPrompt(
      runDispatch(
        fixture.root,
        `Research dispatch: ${fixture.ids.dispatchId}`,
        "trellis-research-worker",
        fixture.repository,
        fake.env,
      ),
    );
    expect(validatedDispatchContext(prompt)).toEqual(response.context);
    expect(readFakeArgv(fake.argvLog)[0]).toContain(fs.realpathSync(fixture.root));
  });

  it("provides a strict materializable Result plus pending Proposal", () => {
    const worker = getClaudeResearchWorkerTemplate().content;
    const match = worker.match(
      /RESULT_PROPOSAL_EXAMPLE_START\n([\s\S]*?)\nRESULT_PROPOSAL_EXAMPLE_END/,
    );
    expect(match).not.toBeNull();
    const materialized = (match?.[1] ?? "")
      .replaceAll("<result-id>", "res_11111111-1111-4111-8111-111111111111")
      .replaceAll("<proposal-id>", "prp_11111111-1111-4111-8111-111111111111")
      .replaceAll("<dispatch-id>", "dsp_33333333-3333-4333-8333-333333333333")
      .replaceAll("<run-id>", "run_44444444-4444-4444-8444-444444444444")
      .replaceAll("<quest-id>", "qst_55555555-5555-4555-8555-555555555555")
      .replaceAll("<timestamp>", "2026-07-20T12:00:00.000Z");
    const envelope = JSON.parse(materialized) as Record<string, unknown>;
    expect(Object.keys(envelope)).toEqual(["result", "proposal"]);
    const result = resultSchema.parse(envelope.result);
    const proposal = proposalSchema.parse(envelope.proposal);
    expect(result.dispatchId).toBe(proposal.dispatchId);
    expect(proposal.status).toBe("pending");
    expect(proposal.operations).toEqual([]);
  });
});

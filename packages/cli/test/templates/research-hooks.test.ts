import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  commitResearchBatch,
  proposalSchema,
  RESEARCH_STAGE_CAPABILITIES,
  resultSchema,
  type QuestStage,
} from "@mindfoldhq/trellis-core/research";
import { afterEach, describe, expect, it } from "vitest";

import {
  PLATFORM_IDS,
  collectPlatformTemplates,
} from "../../src/configurators/index.js";
import { getResearchWorkerTemplate as getClaudeResearchWorkerTemplate } from "../../src/templates/claude/index.js";
import { getResearchWorkerTemplate as getCodexResearchWorkerTemplate } from "../../src/templates/codex/index.js";
import { getResearchDispatchContext } from "../../src/commands/research/dispatch-context.js";
import {
  setResearchQuestStage,
  setResearchQuestStatus,
  setResearchRunStatus,
} from "../../src/commands/research/command.js";
import { bindResearchRepository } from "../../src/commands/research/repository.js";
import { getResearchStageSkillTemplates } from "../../src/templates/common/index.js";
import { getSharedHookScriptsForPlatform } from "../../src/templates/shared-hooks/index.js";
import {
  createResearchDispatchFixture,
  runResearchFixtureGit,
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

const ACTIVE_STAGE_CAPABILITIES = Object.entries(
  RESEARCH_STAGE_CAPABILITIES,
).filter((entry) => entry[1].dispatchable);
const OWNER_BY_STAGE = Object.fromEntries(
  ACTIVE_STAGE_CAPABILITIES.map(([stage, definition]) => [
    stage,
    definition.fallbackSkill,
  ]),
) as Record<Exclude<QuestStage, "complete">, string>;

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
  it("ships the nine exact stage-owner bundled skills with bounded authority", () => {
    const bundled = new Map(
      getResearchStageSkillTemplates().map((skill) => [skill.name, skill]),
    );
    expect(
      Object.values(OWNER_BY_STAGE)
        .filter((name) => bundled.has(name))
        .sort(),
    ).toEqual(Object.values(OWNER_BY_STAGE).sort());

    for (const [stage, name] of Object.entries(OWNER_BY_STAGE)) {
      const skill = bundled.get(name);
      const content = skill?.files.find(
        (file) => file.relativePath === "SKILL.md",
      )?.content;
      expect(content, `${name}/SKILL.md must exist`).toBeDefined();
      expect(content).toContain(`stage: ${stage}`);
      expect(content).toContain("explicit research intent or dispatch");
      expect(content).toContain("Result");
      expect(content).toContain("Proposal");
      expect(content).toContain("must not append research events");
      expect(content).toContain("must not apply or reject Proposals");
      expect(content).toContain("must not commit Git changes");
      expect(content).toContain("must not promote Claims");
      expect(content).toContain(
        "must not claim external completion without evidence",
      );
      expect(content).toContain(
        "must not require Trellis in child repositories",
      );
      expect(content).not.toContain("Read the entire workspace");
    }
  });

  it("keeps legacy setup inputs proposal-only and leaves source and Mempal authority untouched", () => {
    const setup = getResearchStageSkillTemplates()
      .find((skill) => skill.name === "trellis-research-setup")
      ?.files.find((file) => file.relativePath === "SKILL.md")?.content;
    expect(setup).toBeDefined();
    for (const legacySource of [
      "research-quest.yaml",
      "research-events.jsonl",
      "notes/_quest",
      "vault-local `_quest`",
    ]) {
      expect(setup).toContain(legacySource);
    }
    expect(setup).toContain("untrusted historical inputs");
    expect(setup).toContain("pending `Proposal`");
    expect(setup).toContain("root-session review");
    expect(setup).toContain(
      "must not import, move, delete, rewrite, or canonicalize",
    );
    expect(setup).toContain("must not create a second YAML or JSONL authority");
    expect(setup).toContain("must not write to Mempal automatically");
    expect(setup).toContain("must not append research events");
  });

  it("tracks every stage-owner skill through every platform template collector", () => {
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
        expect(paths, `${platform} must track ${skillName}`).not.toEqual([]);
      }
    }
  });

  it("ships separate bounded Claude and Codex Research workers", () => {
    const claudeWorker = getClaudeResearchWorkerTemplate().content;
    expect(claudeWorker).toContain("tools: Read, Write, Edit, Bash, Skill");
    expect(claudeWorker).toContain("# Validated Research Dispatch");
    expect(claudeWorker).toContain("VALIDATED_DISPATCH_CONTEXT_START");
    expect(claudeWorker).toContain("`capability.selectedSkill`");
    expect(claudeWorker).toContain("through the Claude `Skill` tool");
    expect(claudeWorker).toContain("work.allowedWritePaths[].resolvedPath");
    expect(claudeWorker).toContain("Immediately before every write");
    expect(claudeWorker).toContain("blocked Result plus an empty pending Proposal");
    expect(claudeWorker).toContain("record-result");
    expect(claudeWorker).toContain("git commit");
    expect(claudeWorker).not.toContain("tools: Read, Write, Edit, Bash, Glob");
    expect(claudeWorker).not.toContain("Run the C07 preflight as the first process");

    const codexWorker = getCodexResearchWorkerTemplate().content;
    expect(codexWorker).toContain("Run the C07 preflight as the first process");
    expect(codexWorker).toContain("trellis research dispatch context");
    expect(codexWorker).toContain("result-plus-pending-proposal");
    expect(codexWorker).not.toContain("trellis-hook-injected");
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

describe("Claude C07 Research Dispatch adapter", () => {
  it("contains no provider-neutral Dispatch validator or stage routing table", () => {
    const hook = hookSource("inject-subagent-context.py");
    expect(hook).toContain("trellis");
    expect(hook).toContain('"dispatch",');
    expect(hook).toContain('"context",');
    expect(hook).toContain('"--host",');
    expect(hook).toContain('"claude",');
    expect(hook).toContain('"--json"');
    expect(hook).toContain('"permissionDecision": "deny"');
    expect(hook).not.toContain("_RESEARCH_OWNER_BY_STAGE");
    expect(hook).not.toContain("_parse_dispatch_request");
    expect(hook).not.toContain("_validate_dispatch_hierarchy");
    expect(hook).not.toContain("_resolve_dispatch_repository");
    expect(hook).not.toContain("_validate_dispatch_paths");
    expect(hook).not.toContain("_read_research_projection");
  });

  it("injects the exact successful Claude C07 JSON and preserves the fixture tree", async () => {
    const sandbox = makeRoot("c09-success");
    const fixture = await createResearchDispatchFixture(sandbox);
    const direct = await getResearchDispatchContext({
      root: fixture.root,
      requestFile: fixture.requestRef,
      host: "claude",
    });
    const fake = installFakeTrellis([
      { status: 0, stdout: JSON.stringify(direct) },
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
      `Research dispatch: ${fixture.requestRef}`,
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
    expect(validatedDispatchContext(prompt)).toEqual(direct);
    expect(prompt).not.toContain(fixture.artifactBody.trim());
    expect(prompt).not.toContain("Original Worker Instruction");
    expect(direct.work.expectedOutputs).toEqual(["Golden report"]);
    expect(readFakeArgv(fake.argvLog)).toEqual([
      [
        "research",
        "dispatch",
        "context",
        fixture.requestRef,
        "--host",
        "claude",
        "--root",
        fs.realpathSync(fixture.root),
        "--json",
      ],
    ]);
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("runs a second C07 pass only for exact direct project or personal skill metadata", async () => {
    for (const source of ["project", "personal"] as const) {
      const sandbox = makeRoot(`c09-skill-${source}`);
      const fixture = await createResearchDispatchFixture(sandbox);
      const first = await getResearchDispatchContext({
        root: fixture.root,
        requestFile: fixture.requestRef,
        host: "claude",
      });
      const optionalSkill = first.capability.optionalSkill;
      const second = await getResearchDispatchContext({
        root: fixture.root,
        requestFile: fixture.requestRef,
        host: "claude",
        discoveredSkillNames: [optionalSkill],
      });
      const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-home-"));
      tempRoots.push(fakeHome);
      const skillRoot =
        source === "project"
          ? path.join(fixture.root, ".claude", "skills")
          : path.join(fakeHome, ".claude", "skills");
      const skillFile = path.join(skillRoot, optionalSkill, "SKILL.md");
      fs.mkdirSync(path.dirname(skillFile), { recursive: true });
      fs.writeFileSync(skillFile, "private body must not be read by the hook\n");
      const fake = installFakeTrellis([
        { status: 0, stdout: JSON.stringify(first) },
        { status: 0, stdout: JSON.stringify(second) },
      ]);

      const prompt = updatedPrompt(
        runDispatch(
          fixture.root,
          `Research dispatch: ${fixture.requestRef}`,
          "trellis-research-worker",
          fixture.root,
          { ...fake.env, HOME: fakeHome },
        ),
      );
      expect(validatedDispatchContext(prompt)).toEqual(second);
      expect(prompt).not.toContain("private body must not be read");
      const calls = readFakeArgv(fake.argvLog);
      expect(calls).toHaveLength(2);
      expect(calls[0]).not.toContain("--skill-name");
      expect(calls[1]?.slice(-3)).toEqual([
        "--skill-name",
        optionalSkill,
        "--json",
      ]);
    }
  });

  it("denies every noncanonical worker envelope before starting C07", async () => {
    const sandbox = makeRoot("c09-envelope");
    const fixture = await createResearchDispatchFixture(sandbox);
    const fake = installFakeTrellis([]);
    const upper = fixture.requestRef.toUpperCase();
    const invalidPrompts = [
      `\nResearch dispatch: ${fixture.requestRef}`,
      `Research dispatch: ${fixture.requestRef}\n`,
      `Research dispatch: ${fixture.requestRef}\nextra`,
      `prefix Research dispatch: ${fixture.requestRef}`,
      `Research dispatch: ${fixture.requestRef} suffix`,
      `Research Dispatch: ${fixture.requestRef}`,
      `Research dispatch: ${upper}`,
      `Research dispatch: .trellis/research/dispatches/${fixture.ids.dispatchId}/../request.json`,
      `Research dispatch: ${fixture.requestRef.replaceAll("/", "\\")}`,
      `Research dispatch: ${path.join(fixture.root, fixture.requestRef)}`,
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

  it("runs no C07 process for ordinary agents or already-injected prompts", async () => {
    const sandbox = makeRoot("c09-no-process");
    const fixture = await createResearchDispatchFixture(sandbox);
    const fake = installFakeTrellis([]);
    runDispatch(
      fixture.root,
      `Research dispatch: ${fixture.requestRef}`,
      "trellis-implement",
      fixture.root,
      fake.env,
    );
    runDispatch(
      fixture.root,
      `Research dispatch: ${fixture.requestRef}`,
      "trellis-research",
      fixture.root,
      fake.env,
    );
    expect(
      runDispatch(
        fixture.root,
        `Research dispatch: ${fixture.requestRef}\n<!-- trellis-hook-injected -->`,
        "trellis-research-worker",
        fixture.root,
        fake.env,
      ),
    ).toBe("");
    expect(readFakeArgv(fake.argvLog)).toEqual([]);
  });

  it("preserves a typed C07 failure as a bounded Claude denial", async () => {
    const sandbox = makeRoot("c09-typed-failure");
    const fixture = await createResearchDispatchFixture(sandbox);
    const failure = {
      schemaVersion: 1,
      command: "research dispatch context",
      valid: false,
      error: {
        code: "REQUEST_STATE_MISMATCH",
        message: "Tracked request differs from canonical state",
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
        `Research dispatch: ${fixture.requestRef}`,
        "trellis-research-worker",
        fixture.root,
        fake.env,
      ),
    );
    expect(decision.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(decision.hookSpecificOutput.permissionDecisionReason).toBe(
      "Research Dispatch preflight failed [REQUEST_STATE_MISMATCH]: Tracked request differs from canonical state",
    );
    expect(decision.hookSpecificOutput.updatedInput).toBeUndefined();
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("maps process and response anomalies to local preflight denial", async () => {
    const sandbox = makeRoot("c09-anomalies");
    const fixture = await createResearchDispatchFixture(sandbox);
    const valid = await getResearchDispatchContext({
      root: fixture.root,
      requestFile: fixture.requestRef,
      host: "claude",
    });
    const mutatedResponse = (
      mutate: (payload: Record<string, unknown>) => void,
    ): FakePreflightResponse => {
      const payload = structuredClone(valid) as unknown as Record<string, unknown>;
      mutate(payload);
      return { status: 0, stdout: JSON.stringify(payload) };
    };
    const cases: { label: string; response: FakePreflightResponse }[] = [
      { label: "empty", response: { status: 0, stdout: "" } },
      { label: "malformed", response: { status: 0, stdout: "{" } },
      {
        label: "multiple",
        response: { status: 0, stdout: `${JSON.stringify(valid)} {}` },
      },
      {
        label: "successful stderr",
        response: {
          status: 0,
          stdout: JSON.stringify(valid),
          stderr: "warning",
        },
      },
      {
        label: "host mismatch",
        response: mutatedResponse((payload) => {
          payload.host = "codex";
        }),
      },
      {
        label: "request mismatch",
        response: mutatedResponse((payload) => {
          payload.requestRef = `${fixture.requestRef}.other`;
        }),
      },
      {
        label: "authority mismatch",
        response: mutatedResponse((payload) => {
          const authority = payload.authority as Record<string, unknown>;
          authority.readScope = "workspace";
        }),
      },
      {
        label: "output contract mismatch",
        response: mutatedResponse((payload) => {
          const output = payload.outputContract as Record<string, unknown>;
          output.type = "result-only";
        }),
      },
      {
        label: "untyped failure",
        response: { status: 1, stderr: "not-json" },
      },
    ];

    for (const testCase of cases) {
      const fake = installFakeTrellis([testCase.response]);
      const decision = parseHookDecision(
        runDispatch(
          fixture.root,
          `Research dispatch: ${fixture.requestRef}`,
          "trellis-research-worker",
          fixture.root,
          fake.env,
        ),
      );
      expect(
        decision.hookSpecificOutput.permissionDecisionReason,
        testCase.label,
      ).toContain("[PREFLIGHT_EXECUTION_FAILED]");
    }

    const python = spawnSync(PYTHON, ["-c", "import sys; print(sys.executable)"], {
      encoding: "utf-8",
    }).stdout.trim();
    const missing = parseHookDecision(
      runDispatch(
        fixture.root,
        `Research dispatch: ${fixture.requestRef}`,
        "trellis-research-worker",
        fixture.root,
        { HOME: path.join(sandbox, "empty-home"), PATH: path.dirname(python) },
      ),
    );
    expect(missing.hookSpecificOutput.permissionDecisionReason).toContain(
      "[PREFLIGHT_EXECUTION_FAILED]",
    );
  }, 30_000);

  it("discovers the root control plane from a child Repository invocation", async () => {
    const sandbox = makeRoot("c09-child");
    const fixture = await createResearchDispatchFixture(sandbox);
    const direct = await getResearchDispatchContext({
      root: fixture.root,
      requestFile: fixture.requestRef,
      host: "claude",
    });
    const fake = installFakeTrellis([
      { status: 0, stdout: JSON.stringify(direct) },
    ]);

    const prompt = updatedPrompt(
      runDispatch(
        fixture.root,
        `Research dispatch: ${fixture.requestRef}`,
        "trellis-research-worker",
        fixture.repository,
        fake.env,
      ),
    );
    expect(validatedDispatchContext(prompt)).toEqual(direct);
    expect(readFakeArgv(fake.argvLog)[0]).toContain(fs.realpathSync(fixture.root));
  });

  it("keeps provider-neutral C07 decisions equal across all active stages", async () => {
    const sandbox = makeRoot("c09-stage-parity");
    type DispatchContext = Awaited<ReturnType<typeof getResearchDispatchContext>>;
    const normalize = (value: DispatchContext): Record<string, unknown> => {
      const copy = structuredClone(value) as Record<string, unknown> & {
        warnings: { code: string }[];
      };
      Reflect.deleteProperty(copy, "host");
      copy.warnings = copy.warnings.filter(
        (warning) => warning.code !== "PROVIDER_HINT_MISMATCH",
      );
      return copy;
    };

    for (const [stage, definition] of ACTIVE_STAGE_CAPABILITIES) {
      const fixture = await createResearchDispatchFixture(
        path.join(sandbox, stage),
        { stage: stage as Exclude<QuestStage, "complete"> },
      );
      for (const discoveredSkillNames of [
        [],
        [definition.optionalSkill as string],
      ]) {
        const [claude, codex] = await Promise.all(
          (["claude", "codex"] as const).map((host) =>
            getResearchDispatchContext({
              root: fixture.root,
              requestFile: fixture.requestRef,
              host,
              discoveredSkillNames,
            }),
          ),
        );
        expect(normalize(claude), `${stage}:${discoveredSkillNames.length}`).toEqual(
          normalize(codex),
        );
        expect(claude.capability).toMatchObject({
          stage,
          capability: definition.capability,
          optionalSkill: definition.optionalSkill,
          fallbackSkill: definition.fallbackSkill,
          selectedSkill:
            discoveredSkillNames.length === 0
              ? definition.fallbackSkill
              : definition.optionalSkill,
          source: discoveredSkillNames.length === 0 ? "bundled" : "host",
        });
        expect(claude.warnings.map((warning) => warning.code)).toEqual([
          "LEGACY_OWNER_SKILL_IGNORED",
          "TASK_REF_IGNORED",
        ]);
        expect(codex.warnings.map((warning) => warning.code)).toEqual([
          "LEGACY_OWNER_SKILL_IGNORED",
          "PROVIDER_HINT_MISMATCH",
          "TASK_REF_IGNORED",
        ]);
      }
    }

    const wrongStageOwner = await createResearchDispatchFixture(
      path.join(sandbox, "wrong-stage-owner"),
      { ownerSkill: "trellis-research-writing", stage: "literature" },
    );
    const [claude, codex] = await Promise.all(
      (["claude", "codex"] as const).map((host) =>
        getResearchDispatchContext({
          root: wrongStageOwner.root,
          requestFile: wrongStageOwner.requestRef,
          host,
        }),
      ),
    );
    expect(normalize(claude)).toEqual(normalize(codex));
    expect(claude.warnings.map((warning) => warning.code)).toContain(
      "OWNER_SKILL_STAGE_MISMATCH",
    );
  }, 30_000);

  it("keeps binding and projection-independent success equal across hosts", async () => {
    const sandbox = makeRoot("c09-binding-parity");
    const fixture = await createResearchDispatchFixture(sandbox);
    const alternate = path.join(sandbox, "alternate");
    fs.cpSync(fixture.repository, alternate, { recursive: true });
    await bindResearchRepository({
      root: fixture.root,
      repositoryId: fixture.ids.repositoryId,
      path: alternate,
    });
    fs.writeFileSync(
      path.join(
        fixture.root,
        ".trellis",
        "research",
        "quests",
        fixture.ids.questId,
        "quest.json",
      ),
      "{projection is not authority\n",
    );
    const before = snapshotTree(sandbox);
    const results = await Promise.all(
      (["claude", "codex"] as const).map((host) =>
        getResearchDispatchContext({
          root: fixture.root,
          requestFile: fixture.requestRef,
          host,
        }),
      ),
    );
    const normalize = (value: (typeof results)[number]): Record<string, unknown> => {
      const copy = structuredClone(value) as Record<string, unknown> & {
        warnings: { code: string }[];
      };
      Reflect.deleteProperty(copy, "host");
      copy.warnings = copy.warnings.filter(
        (warning) => warning.code !== "PROVIDER_HINT_MISMATCH",
      );
      return copy;
    };
    expect(normalize(results[0])).toEqual(normalize(results[1]));
    expect(results[0].repository).toMatchObject({
      path: fs.realpathSync(alternate),
      resolutionSource: "binding",
    });
    expect(snapshotTree(sandbox)).toEqual(before);
  });

  it("returns equal provider-neutral errors across canonical Dispatch failure boundaries", async () => {
    const errorCode = async (
      root: string,
      requestFile: string,
      host: "claude" | "codex",
    ): Promise<string> => {
      try {
        await getResearchDispatchContext({ root, requestFile, host });
      } catch (error) {
        return String((error as { code?: unknown }).code);
      }
      throw new Error("Expected Dispatch context failure");
    };
    const expectParity = async (
      root: string,
      requestFile: string,
      expected: string,
    ): Promise<void> => {
      const before = snapshotTree(path.dirname(root));
      const codes = await Promise.all(
        (["claude", "codex"] as const).map((host) =>
          errorCode(root, requestFile, host),
        ),
      );
      expect(codes).toEqual([expected, expected]);
      expect(snapshotTree(path.dirname(root))).toEqual(before);
    };

    const invalidPath = await createResearchDispatchFixture(
      path.join(makeRoot("c09-error-parity"), "invalid-path"),
    );
    await expectParity(
      invalidPath.root,
      `./${invalidPath.requestRef}`,
      "INVALID_REQUEST_PATH",
    );

    const stale = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "stale"),
    );
    const request = JSON.parse(fs.readFileSync(stale.requestPath, "utf-8")) as {
      objective: string;
    };
    request.objective = "tracked edits are not authority";
    fs.writeFileSync(stale.requestPath, `${JSON.stringify(request)}\n`);
    await expectParity(stale.root, stale.requestRef, "REQUEST_STATE_MISMATCH");

    const hierarchy = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "hierarchy"),
      { associateRepository: false },
    );
    await expectParity(
      hierarchy.root,
      hierarchy.requestRef,
      "DISPATCH_HIERARCHY_INVALID",
    );

    const artifact = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "artifact"),
    );
    fs.writeFileSync(artifact.artifactPath, "changed after Dispatch\n");
    await expectParity(artifact.root, artifact.requestRef, "ARTIFACT_INVALID");

    const writeSandbox = path.join(
      path.dirname(path.dirname(invalidPath.root)),
      "write-scope",
    );
    fs.mkdirSync(path.join(writeSandbox, "target"), { recursive: true });
    fs.mkdirSync(path.join(writeSandbox, "outside"), { recursive: true });
    fs.symlinkSync(
      path.join(writeSandbox, "outside"),
      path.join(writeSandbox, "target", "escape"),
    );
    const writeScope = await createResearchDispatchFixture(writeSandbox, {
      allowedWritePaths: ["escape/report.json"],
    });
    await expectParity(writeScope.root, writeScope.requestRef, "WRITE_SCOPE_INVALID");

    const malformedLedger = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "malformed-ledger"),
    );
    const ledgerPath = path.join(
      malformedLedger.root,
      ".trellis",
      "research",
      "events.jsonl",
    );
    const ledgerLines = fs.readFileSync(ledgerPath, "utf-8").trim().split("\n");
    const firstEvent = JSON.parse(ledgerLines[0] ?? "{}") as Record<string, unknown>;
    firstEvent.unexpected = true;
    ledgerLines[0] = JSON.stringify(firstEvent);
    fs.writeFileSync(ledgerPath, `${ledgerLines.join("\n")}\n`);
    await expectParity(malformedLedger.root, malformedLedger.requestRef, "INVALID_REQUEST");

    const paused = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "paused"),
    );
    await setResearchQuestStatus({
      root: paused.root,
      questId: paused.ids.questId,
      status: "paused",
    });
    await expectParity(paused.root, paused.requestRef, "QUEST_NOT_DISPATCHABLE");

    const terminal = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "terminal"),
    );
    await setResearchRunStatus({
      root: terminal.root,
      runId: terminal.ids.runId,
      status: "running",
    });
    await setResearchRunStatus({
      root: terminal.root,
      runId: terminal.ids.runId,
      status: "succeeded",
    });
    await expectParity(terminal.root, terminal.requestRef, "DISPATCH_HIERARCHY_INVALID");

    const remote = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "remote"),
      { expectedRemote: "git@example.test:expected.git" },
    );
    runResearchFixtureGit(
      remote.repository,
      "remote",
      "set-url",
      "origin",
      "git@example.test:other.git",
    );
    await expectParity(remote.root, remote.requestRef, "REPOSITORY_INVALID");

    const revision = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "revision"),
    );
    fs.writeFileSync(path.join(revision.repository, "new-head.txt"), "new head\n");
    runResearchFixtureGit(revision.repository, "add", "new-head.txt");
    runResearchFixtureGit(revision.repository, "commit", "-qm", "advance head");
    await expectParity(revision.root, revision.requestRef, "ARTIFACT_INVALID");

    const registration = await createResearchDispatchFixture(
      path.join(path.dirname(path.dirname(invalidPath.root)), "registration"),
    );
    await commitResearchBatch({
      root: registration.root,
      actor: { type: "agent", id: "parity-test" },
      provenance: { source: "C09 parity fixture" },
      idempotencyKey: `register:${registration.ids.dispatchId}`,
      mutations: [
        {
          kind: "artifact.register",
          artifact: {
            id: "art_33333333-3333-4333-8333-333333333333",
            repositoryId: registration.ids.repositoryId,
            path: "inputs/different.txt",
          },
        },
      ],
    });
    await expectParity(registration.root, registration.requestRef, "ARTIFACT_INVALID");

    const artifactSymlinkSandbox = path.join(
      path.dirname(path.dirname(invalidPath.root)),
      "artifact-symlink",
    );
    const artifactSymlink = await createResearchDispatchFixture(
      artifactSymlinkSandbox,
    );
    const outsideArtifact = path.join(artifactSymlinkSandbox, "outside.txt");
    fs.writeFileSync(outsideArtifact, artifactSymlink.artifactBody);
    fs.rmSync(artifactSymlink.artifactPath);
    fs.symlinkSync(outsideArtifact, artifactSymlink.artifactPath);
    await expectParity(
      artifactSymlink.root,
      artifactSymlink.requestRef,
      "ARTIFACT_INVALID",
    );

    const danglingSandbox = path.join(
      path.dirname(path.dirname(invalidPath.root)),
      "dangling-write",
    );
    const dangling = await createResearchDispatchFixture(danglingSandbox, {
      allowedWritePaths: ["dangling/report.json"],
    });
    fs.symlinkSync(
      path.join(danglingSandbox, "outside-missing"),
      path.join(dangling.repository, "dangling"),
    );
    await expectParity(dangling.root, dangling.requestRef, "WRITE_SCOPE_INVALID");

    const requestSymlinkSandbox = path.join(
      path.dirname(path.dirname(invalidPath.root)),
      "request-symlink",
    );
    const requestSymlink = await createResearchDispatchFixture(
      requestSymlinkSandbox,
    );
    const outsideRequest = path.join(requestSymlinkSandbox, "outside-request.json");
    fs.renameSync(requestSymlink.requestPath, outsideRequest);
    fs.symlinkSync(outsideRequest, requestSymlink.requestPath);
    await expectParity(
      requestSymlink.root,
      requestSymlink.requestRef,
      "INVALID_REQUEST_PATH",
    );

    const directorySymlinkSandbox = path.join(
      path.dirname(path.dirname(invalidPath.root)),
      "directory-symlink",
    );
    const directorySymlink = await createResearchDispatchFixture(
      directorySymlinkSandbox,
    );
    const dispatchDirectory = path.dirname(directorySymlink.requestPath);
    const outsideDirectory = path.join(directorySymlinkSandbox, "outside-dispatch");
    fs.renameSync(dispatchDirectory, outsideDirectory);
    fs.symlinkSync(outsideDirectory, dispatchDirectory);
    await expectParity(
      directorySymlink.root,
      directorySymlink.requestRef,
      "INVALID_REQUEST_PATH",
    );
  }, 30_000);

  it("rejects complete identically for Claude and Codex without preflight writes", async () => {
    const sandbox = makeRoot("c09-complete");
    const fixture = await createResearchDispatchFixture(sandbox);
    await setResearchQuestStage({
      root: fixture.root,
      questId: fixture.ids.questId,
      stage: "complete",
    });
    const before = snapshotTree(sandbox);
    for (const host of ["claude", "codex"] as const) {
      await expect(
        getResearchDispatchContext({
          root: fixture.root,
          requestFile: fixture.requestRef,
          host,
        }),
      ).rejects.toMatchObject({ code: "QUEST_NOT_DISPATCHABLE" });
      expect(snapshotTree(sandbox)).toEqual(before);
    }
  });

  it("provides a strict materializable Claude Result plus pending Proposal", () => {
    const worker = getClaudeResearchWorkerTemplate().content;
    const match = worker.match(
      /RESULT_PROPOSAL_EXAMPLE_START\n([\s\S]*?)\nRESULT_PROPOSAL_EXAMPLE_END/,
    );
    expect(match).not.toBeNull();
    const materialized = (match?.[1] ?? "")
      .replaceAll("<result-id>", "res_11111111-1111-4111-8111-111111111111")
      .replaceAll("<proposal-id>", "prp_22222222-2222-4222-8222-222222222222")
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

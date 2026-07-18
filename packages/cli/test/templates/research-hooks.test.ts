import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  PLATFORM_IDS,
  collectPlatformTemplates,
} from "../../src/configurators/index.js";
import { getAllAgents as getClaudeAgents } from "../../src/templates/claude/index.js";
import { getBundledSkillTemplates } from "../../src/templates/common/index.js";
import { getSharedHookScripts } from "../../src/templates/shared-hooks/index.js";
import {
  getAllAgents as getTrellisAgents,
  getAllScripts,
} from "../../src/templates/trellis/index.js";

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

const OWNER_BY_STAGE = {
  setup: "trellis-research-setup",
  framing: "trellis-research-quest",
  literature: "trellis-research-literature",
  ideation: "trellis-research-ideation",
  experiment: "trellis-research-experiment",
  computation: "trellis-research-computation",
  theory: "trellis-research-theory",
  audit: "trellis-research-audit",
  writing: "trellis-research-writing",
} as const;

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
  fs.mkdirSync(path.join(root, ".trellis", "scripts"), { recursive: true });
  for (const [relativePath, content] of getAllScripts()) {
    const target = path.join(root, ".trellis", "scripts", relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
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
  const hook = getSharedHookScripts().find((entry) => entry.name === name);
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

function runGit(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function writeDispatchFixture(
  root: string,
  options: {
    taskRef?: string;
    ownerSkill?: string;
    questStage?: keyof typeof OWNER_BY_STAGE;
    questStatus?: string;
    repositoryLocator?: string;
  } = {},
): { child: string; requestPath: string } {
  selectResearch(root);
  writeLedger(root, 4);
  const child = path.join(root, "repos", "child");
  fs.mkdirSync(path.join(child, "inputs"), { recursive: true });
  fs.writeFileSync(
    path.join(child, "inputs", "source.txt"),
    "SECRET_ARTIFACT_BODY\n",
  );

  const questData = {
    ...quest(IDS.quest, "Dispatch quest", options.questStage ?? "literature"),
    status: options.questStatus ?? "active",
  };
  writeJson(
    root,
    `.trellis/research/quests/${IDS.quest}/quest.json`,
    projected(questData),
  );
  writeJson(
    root,
    `.trellis/research/campaigns/${IDS.campaign}/campaign.json`,
    projected({
      id: IDS.campaign,
      questId: IDS.quest,
      title: "Campaign",
      status: "running",
      protocolDigest: "protocol-v1",
      runIds: [IDS.run],
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
  writeJson(
    root,
    `.trellis/research/runs/${IDS.run}/run.json`,
    projected({
      id: IDS.run,
      campaignId: IDS.campaign,
      title: "Run",
      status: "running",
      dispatchId: IDS.dispatch,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
  writeJson(
    root,
    ".trellis/research/repositories.json",
    projected({
      repositories: [
        {
          id: IDS.repository,
          name: "child",
          kind: "code",
          locator: options.repositoryLocator ?? "repos/child",
          capabilities: { hasTrellis: false },
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      artifacts: [],
    }),
  );

  if (options.taskRef) {
    writeJson(root, `${options.taskRef}/task.json`, {
      id: path.basename(options.taskRef),
      title: "Linked task",
      status: "in_progress",
    });
  }

  const requestPath = `.trellis/research/dispatches/${IDS.dispatch}/request.json`;
  writeJson(root, requestPath, {
    id: IDS.dispatch,
    questId: IDS.quest,
    campaignId: IDS.campaign,
    runId: IDS.run,
    repositoryId: IDS.repository,
    ownerSkill:
      options.ownerSkill ?? OWNER_BY_STAGE[options.questStage ?? "literature"],
    objective: "Produce a bounded literature matrix",
    acceptanceCriteria: ["Cite every observation"],
    context: [
      { text: "Use only declared sources." },
      {
        artifact: {
          id: IDS.artifact,
          repositoryId: IDS.repository,
          path: "inputs/source.txt",
          kind: "source",
        },
      },
    ],
    allowedWritePaths: ["outputs/report.json"],
    expectedOutputs: ["outputs/report.json"],
    checks: ["test -f outputs/report.json"],
    ...(options.taskRef ? { taskRef: options.taskRef } : {}),
    createdAt: NOW,
  });
  return { child, requestPath };
}

function runDispatch(
  root: string,
  prompt: string,
  platform: "claude" | "cursor" = "claude",
  subagentType = "trellis-research-worker",
  inputCwd = root,
): string {
  const envName =
    platform === "claude" ? "CLAUDE_PROJECT_DIR" : "CURSOR_PROJECT_DIR";
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
    { [envName]: root },
  );
}

function updatedPrompt(output: string): string {
  const parsed = JSON.parse(output) as {
    hookSpecificOutput: { updatedInput: { prompt: string } };
  };
  return parsed.hookSpecificOutput.updatedInput.prompt;
}

describe("research stage-owner and worker templates", () => {
  it("ships the nine exact stage-owner bundled skills with bounded authority", () => {
    const bundled = new Map(
      getBundledSkillTemplates().map((skill) => [skill.name, skill]),
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
    const setup = getBundledSkillTemplates()
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

  it("ships the canonical research worker card and a separate Claude wrapper", () => {
    const trellisAgents = getTrellisAgents();
    const researchCard = trellisAgents.get("research.md") ?? "";
    expect(researchCard).toContain("name: research");
    expect(researchCard).toContain("target repository");
    expect(researchCard).toContain("allowed write paths");
    expect(researchCard).toContain("Result");
    expect(researchCard).toContain("Proposal");
    expect(researchCard).toContain("Do not commit");
    expect(researchCard).toContain("Do not mutate the root research ledger");
    expect(researchCard).toContain('"result"');
    expect(researchCard).toContain('"proposal"');
    expect(researchCard).toContain('"dispatchId"');
    expect(researchCard).toContain('"runId"');
    expect(researchCard).toContain('"questId"');
    expect(researchCard).toContain('"status": "pending"');
    expect(researchCard).toContain("trellis research dispatch record-result");

    const claudeAgents = new Map(
      getClaudeAgents().map((agent) => [agent.name, agent.content]),
    );
    expect(claudeAgents.has("trellis-research")).toBe(true);
    const worker = claudeAgents.get("trellis-research-worker") ?? "";
    expect(worker).toContain("Research dispatch:");
    expect(worker).toContain("allowed write paths");
    expect(worker).toContain("record-result");
    expect(worker).toContain("Do not commit");
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

  it("preserves native Claude and non-Claude breadcrumb behavior", () => {
    const nativeRoot = makeRoot("research-native-breadcrumb");
    writeJson(nativeRoot, ".trellis/.workflow.json", {
      schemaVersion: 1,
      id: "native",
      source: "bundled",
    });
    const nativeContext = parseAdditionalContext(
      runHook(
        nativeRoot,
        "inject-workflow-state.py",
        { cwd: nativeRoot, session_id: "native" },
        { CLAUDE_PROJECT_DIR: nativeRoot },
      ),
    );
    expect(nativeContext).toContain("<workflow-state>");
    expect(nativeContext).toContain("Native no-task breadcrumb.");

    const qoderRoot = makeRoot("research-qoder-breadcrumb");
    writeResearchOrientation(qoderRoot);
    const qoderContext = parseAdditionalContext(
      runHook(
        qoderRoot,
        "inject-workflow-state.py",
        { cwd: qoderRoot, session_id: "qoder" },
        { QODER_PROJECT_DIR: qoderRoot },
      ),
    );
    expect(qoderContext).toContain("<workflow-state>");
    expect(qoderContext).not.toContain("<research-state-changed>");
  });
});

describe("Claude explicit research dispatch injection", () => {
  it("injects bounded Task-free dispatch context without artifact bodies", () => {
    const root = makeRoot("research-dispatch-valid");
    const fixture = writeDispatchFixture(root);
    const output = runDispatch(
      root,
      `Research dispatch: ${fixture.requestPath}\nPerform the declared work.`,
    );
    const prompt = updatedPrompt(output);
    expect(prompt).toContain("<!-- trellis-hook-injected -->");
    expect(prompt).toContain("# Research Worker Dispatch");
    expect(prompt).toContain(OWNER_BY_STAGE.literature);
    expect(prompt).toContain(fixture.child);
    expect(prompt).toContain("Produce a bounded literature matrix");
    expect(prompt).toContain("Cite every observation");
    expect(prompt).toContain("Use only declared sources.");
    expect(prompt).toContain("inputs/source.txt");
    expect(prompt).toContain("outputs/report.json");
    expect(prompt).toContain("test -f outputs/report.json");
    expect(prompt).toContain("trellis research dispatch record-result");
    expect(prompt).toContain('"result"');
    expect(prompt).toContain('"proposal"');
    expect(prompt).not.toContain("SECRET_ARTIFACT_BODY");
    expect(prompt).not.toContain("Active task:");
  });

  it("keeps the root control-plane pointer when invoked from a child Git repository", () => {
    const root = makeRoot("research-dispatch-child-cwd");
    const fixture = writeDispatchFixture(root);
    fs.mkdirSync(path.join(fixture.child, ".git"), { recursive: true });
    const prompt = updatedPrompt(
      runDispatch(
        root,
        `Research dispatch: ${fixture.requestPath}`,
        "claude",
        "trellis-research-worker",
        fixture.child,
      ),
    );
    expect(prompt).toContain(`Control root: \`${fs.realpathSync(root)}\``);
    expect(prompt).toContain(
      `Target repository: \`${fs.realpathSync(fixture.child)}\``,
    );
  });

  it("does not route a research pointer that is not on the first line", () => {
    const root = makeRoot("research-dispatch-not-first");
    const fixture = writeDispatchFixture(root);
    expect(
      runDispatch(
        root,
        `Introductory text\nResearch dispatch: ${fixture.requestPath}`,
      ),
    ).toBe("");
  });

  it("injects a validated optional Task pointer", () => {
    const root = makeRoot("research-dispatch-task");
    const taskRef = ".trellis/tasks/07-17-linked";
    const fixture = writeDispatchFixture(root, { taskRef });
    const prompt = updatedPrompt(
      runDispatch(root, `Research dispatch: ${fixture.requestPath}`),
    );
    expect(prompt).toContain(`Active task: ${taskRef}`);
  });

  it("is idempotent when the hook marker is already present", () => {
    const root = makeRoot("research-dispatch-idempotent");
    const fixture = writeDispatchFixture(root);
    expect(
      runDispatch(
        root,
        `Research dispatch: ${fixture.requestPath}\n<!-- trellis-hook-injected -->`,
      ),
    ).toBe("");
  });

  it("turns invalid explicit dispatches into marked no-write prompts", () => {
    const scenarios: {
      label: string;
      prepare: (root: string, requestPath: string) => string;
    }[] = [
      {
        label: "path traversal",
        prepare: () =>
          `Research dispatch: .trellis/research/dispatches/${IDS.dispatch}/../request.json`,
      },
      {
        label: "ID mismatch",
        prepare: (root, requestPath) => {
          const request = JSON.parse(
            fs.readFileSync(path.join(root, requestPath), "utf-8"),
          );
          request.id = "dsp_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
          writeJson(root, requestPath, request);
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "malformed request",
        prepare: (root, requestPath) => {
          writeJson(root, requestPath, { id: IDS.dispatch });
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "owner stage mismatch",
        prepare: (root, requestPath) => {
          const request = JSON.parse(
            fs.readFileSync(path.join(root, requestPath), "utf-8"),
          );
          request.ownerSkill = OWNER_BY_STAGE.audit;
          writeJson(root, requestPath, request);
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "inactive quest",
        prepare: (root, requestPath) => {
          const projectionPath = `.trellis/research/quests/${IDS.quest}/quest.json`;
          const projection = JSON.parse(
            fs.readFileSync(path.join(root, projectionPath), "utf-8"),
          );
          projection.data.status = "paused";
          writeJson(root, projectionPath, projection);
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "run hierarchy",
        prepare: (root, requestPath) => {
          const projectionPath = `.trellis/research/runs/${IDS.run}/run.json`;
          const projection = JSON.parse(
            fs.readFileSync(path.join(root, projectionPath), "utf-8"),
          );
          projection.data.campaignId =
            "cmp_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
          writeJson(root, projectionPath, projection);
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "unknown repository",
        prepare: (root, requestPath) => {
          const request = JSON.parse(
            fs.readFileSync(path.join(root, requestPath), "utf-8"),
          );
          request.repositoryId = "rep_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
          writeJson(root, requestPath, request);
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "unresolved repository",
        prepare: (root, requestPath) => {
          fs.rmSync(path.join(root, "repos", "child"), { recursive: true });
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "artifact escape",
        prepare: (root, requestPath) => {
          const request = JSON.parse(
            fs.readFileSync(path.join(root, requestPath), "utf-8"),
          );
          request.context[1].artifact.path = "../outside.txt";
          writeJson(root, requestPath, request);
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "terminal run",
        prepare: (root, requestPath) => {
          const projectionPath = `.trellis/research/runs/${IDS.run}/run.json`;
          const projection = JSON.parse(
            fs.readFileSync(path.join(root, projectionPath), "utf-8"),
          );
          projection.data.status = "succeeded";
          writeJson(root, projectionPath, projection);
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "artifact revision mismatch",
        prepare: (root, requestPath) => {
          const child = path.join(root, "repos", "child");
          runGit(child, ["init"]);
          runGit(child, ["config", "user.email", "test@example.com"]);
          runGit(child, ["config", "user.name", "Trellis Test"]);
          runGit(child, ["add", "inputs/source.txt"]);
          runGit(child, ["commit", "-m", "first"]);
          const firstRevision = runGit(child, ["rev-parse", "HEAD"]);
          fs.writeFileSync(path.join(child, "second.txt"), "second\n");
          runGit(child, ["add", "second.txt"]);
          runGit(child, ["commit", "-m", "second"]);
          const request = JSON.parse(
            fs.readFileSync(path.join(root, requestPath), "utf-8"),
          );
          request.context[1].artifact.revision = firstRevision;
          writeJson(root, requestPath, request);
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "allowed write symlink escape",
        prepare: (root, requestPath) => {
          const outside = path.join(root, "outside");
          fs.mkdirSync(outside, { recursive: true });
          fs.symlinkSync(outside, path.join(root, "repos", "child", "outputs"));
          return `Research dispatch: ${requestPath}`;
        },
      },
      {
        label: "malformed binding",
        prepare: (root, requestPath) => {
          writeJson(root, ".trellis/.runtime/research/repo-bindings.json", {
            schemaVersion: 1,
            bindings: { [IDS.repository]: "relative/path" },
          });
          return `Research dispatch: ${requestPath}`;
        },
      },
    ];

    for (const scenario of scenarios) {
      const root = makeRoot(`research-dispatch-${scenario.label}`);
      const fixture = writeDispatchFixture(root);
      writeText(
        root,
        ".trellis/tasks/unrelated/prd.md",
        "TOKEN_UNBOUNDED_TASK_CONTEXT\n",
      );
      const pointer = scenario.prepare(root, fixture.requestPath);
      const prompt = updatedPrompt(runDispatch(root, pointer));
      expect(prompt).toContain("<!-- trellis-hook-injected -->");
      expect(prompt).toContain("# Research Dispatch Validation Failed");
      expect(prompt).toContain("Do not modify files");
      expect(prompt).toContain(
        "Report this validation error to the root session",
      );
      expect(prompt).not.toContain("TOKEN_UNBOUNDED_TASK_CONTEXT");
      const outputsPath = path.join(fixture.child, "outputs");
      if (scenario.label === "allowed write symlink escape") {
        expect(fs.lstatSync(outputsPath).isSymbolicLink()).toBe(true);
      } else {
        expect(fs.existsSync(outputsPath)).toBe(false);
      }
    }
  });

  it("leaves non-Claude research agent routing unchanged", () => {
    const root = makeRoot("research-dispatch-cursor");
    const fixture = writeDispatchFixture(root);
    const output = runDispatch(
      root,
      `Research dispatch: ${fixture.requestPath}`,
      "cursor",
      "trellis-research",
    );
    const prompt = updatedPrompt(output);
    expect(prompt).toContain("# Research Agent Task");
    expect(prompt).not.toContain("# Research Worker Dispatch");
    expect(prompt).not.toContain("# Research Dispatch Validation Failed");
  });
});

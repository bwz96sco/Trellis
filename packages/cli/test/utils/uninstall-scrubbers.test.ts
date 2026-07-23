/**
 * Unit tests for uninstall-scrubbers.
 *
 * Each scrubber gets coverage for:
 *  - Strips trellis content
 *  - Preserves user-added content
 *  - Reports `fullyEmpty: true` when nothing meaningful remains
 */

import { describe, it, expect } from "vitest";
import {
  scrubHooksJson,
  scrubOpencodePackageJson,
  scrubPiSettings,
  scrubCodexConfigToml,
  scrubManagedMarkdownBlock,
  scrubZcodeConfigJson,
} from "../../src/utils/uninstall-scrubbers.js";

const CLAUDE_DELETE_PATHS = [
  ".claude/hooks/session-start.py",
  ".claude/hooks/inject-subagent-context.py",
  ".claude/hooks/inject-workflow-state.py",
];

const CURSOR_DELETE_PATHS = [
  ".cursor/hooks/inject-subagent-context.py",
  ".cursor/hooks/session-start.py",
  ".cursor/hooks/inject-workflow-state.py",
  ".cursor/hooks/inject-shell-session-context.py",
];

const TEST_BLOCK_START = "<!-- TRELLIS:TEST:START -->";
const TEST_BLOCK_END = "<!-- TRELLIS:TEST:END -->";

describe("scrubHooksJson — nested schema", () => {
  it("strips trellis hook entries from a Claude-style file", () => {
    const input = {
      env: { CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: "1" },
      hooks: {
        SessionStart: [
          {
            matcher: "startup",
            hooks: [
              {
                type: "command",
                command: "python3 .claude/hooks/session-start.py",
                timeout: 10,
              },
            ],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: "command",
                command: "python3 .claude/hooks/inject-workflow-state.py",
                timeout: 5,
              },
            ],
          },
        ],
      },
      enabledPlugins: {},
    };

    const { content, fullyEmpty } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      CLAUDE_DELETE_PATHS,
      "nested",
    );
    const parsed = JSON.parse(content);
    expect(parsed.hooks).toBeUndefined();
    expect(parsed.env).toEqual(input.env);
    expect(parsed.enabledPlugins).toEqual({});
    expect(fullyEmpty).toBe(false);
  });

  it("preserves user-added hook entry inside the same matcher block", () => {
    const input = {
      hooks: {
        SessionStart: [
          {
            matcher: "startup",
            hooks: [
              {
                type: "command",
                command: "python3 .claude/hooks/session-start.py",
                timeout: 10,
              },
              {
                type: "command",
                command: "python3 .claude/hooks/my-custom-hook.py",
                timeout: 5,
              },
            ],
          },
        ],
      },
    };

    const { content, fullyEmpty } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      CLAUDE_DELETE_PATHS,
      "nested",
    );
    const parsed = JSON.parse(content);
    expect(parsed.hooks.SessionStart).toHaveLength(1);
    expect(parsed.hooks.SessionStart[0].hooks).toHaveLength(1);
    expect(parsed.hooks.SessionStart[0].hooks[0].command).toBe(
      "python3 .claude/hooks/my-custom-hook.py",
    );
    expect(fullyEmpty).toBe(false);
  });

  it("reports fullyEmpty when only trellis hooks existed", () => {
    const input = {
      hooks: {
        SessionStart: [
          {
            matcher: "startup",
            hooks: [
              {
                type: "command",
                command: "python3 .claude/hooks/session-start.py",
                timeout: 10,
              },
            ],
          },
        ],
      },
    };

    const { content, fullyEmpty, outcome } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      CLAUDE_DELETE_PATHS,
      "nested",
    );
    expect(outcome).toBe("scrubbed");
    expect(fullyEmpty).toBe(true);
    // Content should still be valid JSON (an empty object).
    expect(JSON.parse(content)).toEqual({});
  });

  it("reports malformed and preserves bytes for invalid JSON", () => {
    const input = '{"hooks":';
    const result = scrubHooksJson(input, CLAUDE_DELETE_PATHS, "nested");

    expect(result).toEqual({
      content: input,
      fullyEmpty: false,
      outcome: "malformed",
    });
  });

  it("reports unchanged and preserves bytes when no Trellis hook exists", () => {
    const input = '{"model":"custom"}\n';
    const result = scrubHooksJson(input, CLAUDE_DELETE_PATHS, "nested");

    expect(result.outcome).toBe("unchanged");
    expect(result.content).toBe(input);
    expect(result.fullyEmpty).toBe(false);
  });

  it("reports malformed and preserves bytes for an invalid nested hook entry", () => {
    const input = '{"hooks":{"SessionStart":[{"hooks":[42]}]}}\n';
    const result = scrubHooksJson(input, CLAUDE_DELETE_PATHS, "nested");

    expect(result).toEqual({
      content: input,
      fullyEmpty: false,
      outcome: "malformed",
    });
  });

  it("does NOT strip hook entries that merely mention a deleted path inside a string argument", () => {
    // Regression: substring-only matching would incorrectly delete a user
    // hook whose command happens to embed a manifest path in an echo/log arg.
    const input = {
      hooks: {
        SessionStart: [
          {
            matcher: "startup",
            hooks: [
              {
                type: "command",
                command:
                  'echo "see .claude/hooks/session-start.py for inspiration" && python3 my-hook.py',
              },
            ],
          },
        ],
      },
    };
    const { content, fullyEmpty } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      CLAUDE_DELETE_PATHS,
      "nested",
    );
    const parsed = JSON.parse(content);
    // Token-based matcher should preserve the user's hook intact.
    expect(parsed.hooks.SessionStart).toHaveLength(1);
    expect(parsed.hooks.SessionStart[0].hooks).toHaveLength(1);
    expect(fullyEmpty).toBe(false);
  });

  it("preserves an originally empty matcher block as unchanged", () => {
    const input =
      '{"hooks":{"SessionStart":[{"matcher":"startup","hooks":[]}]}}\n';

    const result = scrubHooksJson(input, CLAUDE_DELETE_PATHS, "nested");

    expect(result).toEqual({
      content: input,
      fullyEmpty: false,
      outcome: "unchanged",
    });
  });

  it("collapses matcher blocks whose Trellis hooks are removed", () => {
    const input = {
      hooks: {
        SessionStart: [
          {
            matcher: "startup",
            hooks: [
              {
                type: "command",
                command: "python3 .claude/hooks/session-start.py",
              },
            ],
          },
          {
            matcher: "user",
            hooks: [
              { type: "command", command: "python3 .claude/hooks/user.py" },
            ],
          },
        ],
      },
    };
    const { content } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      CLAUDE_DELETE_PATHS,
      "nested",
    );
    const parsed = JSON.parse(content);
    expect(parsed.hooks.SessionStart).toHaveLength(1);
    expect(parsed.hooks.SessionStart[0].matcher).toBe("user");
  });
});

describe("scrubHooksJson — flat schema", () => {
  it("strips trellis hook entries from a Cursor-style file", () => {
    const input = {
      version: 1,
      hooks: {
        preToolUse: [
          {
            command: "python3 .cursor/hooks/inject-subagent-context.py",
            matcher: "Task|Subagent",
            timeout: 30,
          },
        ],
        sessionStart: [
          { command: "python3 .cursor/hooks/session-start.py", timeout: 10 },
        ],
      },
    };

    const { content, fullyEmpty } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      CURSOR_DELETE_PATHS,
      "flat",
    );
    const parsed = JSON.parse(content);
    expect(parsed.hooks).toBeUndefined();
    expect(parsed.version).toBe(1);
    expect(fullyEmpty).toBe(false);
  });

  it("preserves user-added flat hook entries", () => {
    const input = {
      hooks: {
        preToolUse: [
          { command: "python3 .cursor/hooks/inject-subagent-context.py" },
          { command: "python3 .cursor/hooks/my-rule.py" },
        ],
      },
    };
    const { content, fullyEmpty } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      CURSOR_DELETE_PATHS,
      "flat",
    );
    const parsed = JSON.parse(content);
    expect(parsed.hooks.preToolUse).toHaveLength(1);
    expect(parsed.hooks.preToolUse[0].command).toBe(
      "python3 .cursor/hooks/my-rule.py",
    );
    expect(fullyEmpty).toBe(false);
  });

  it("matches any Copilot bash/powershell command field", () => {
    const copilotPaths = [
      ".github/copilot/hooks/session-start.py",
      ".github/copilot/hooks/inject-workflow-state.py",
    ];
    const input = {
      hooks: {
        SessionStart: [
          {
            type: "command",
            command: "python3 .github/copilot/hooks/session-start.py",
            timeout: 10,
          },
        ],
        userPromptSubmitted: [
          {
            type: "command",
            bash: "python3 .github/copilot/hooks/user-owned.py",
            powershell:
              "python3 .github/copilot/hooks/inject-workflow-state.py",
            timeoutSec: 5,
          },
        ],
      },
    };
    const { content, fullyEmpty } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      copilotPaths,
      "flat",
    );
    expect(fullyEmpty).toBe(true);
    expect(JSON.parse(content)).toEqual({});
  });

  it("reports fullyEmpty when only trellis hooks existed", () => {
    const input = {
      hooks: {
        sessionStart: [
          { command: "python3 .cursor/hooks/session-start.py", timeout: 10 },
        ],
      },
    };
    const { fullyEmpty } = scrubHooksJson(
      JSON.stringify(input, null, 2),
      CURSOR_DELETE_PATHS,
      "flat",
    );
    expect(fullyEmpty).toBe(true);
  });
});

describe("scrubHooksJson — retired Trae direct-event compatibility", () => {
  const ownedPaths = [
    ".trellis/hooks/session-start.py",
    ".trellis/hooks/inject-workflow-state.py",
  ];

  it("scrubs exact Trellis hooks from mixed legacy settings", () => {
    const input = JSON.stringify({
      theme: "dark",
      hooks: {
        SessionStart: [
          { command: "python3 .trellis/hooks/session-start.py" },
          { command: "node tools/user-session-start.mjs" },
        ],
      },
    });
    const result = scrubHooksJson(input, ownedPaths, "flat");

    expect(result.outcome).toBe("scrubbed");
    expect(JSON.parse(result.content)).toEqual({
      theme: "dark",
      hooks: {
        SessionStart: [{ command: "node tools/user-session-start.mjs" }],
      },
    });
  });

  it("preserves malformed legacy settings byte-for-byte", () => {
    const input = '{"hooks":{"SessionStart":[42]}}\n';
    expect(scrubHooksJson(input, ownedPaths, "flat")).toEqual({
      content: input,
      fullyEmpty: false,
      outcome: "malformed",
    });
  });

  it("preserves unchanged user-only legacy settings byte-for-byte", () => {
    const input =
      '{"hooks":{"SessionStart":[{"command":"node user.js"}]},"theme":"dark"}\n';
    const result = scrubHooksJson(input, ownedPaths, "flat");

    expect(result.outcome).toBe("unchanged");
    expect(result.content).toBe(input);
  });

  it("is idempotent after scrubbing legacy settings", () => {
    const input = JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { command: "python3 .trellis/hooks/inject-workflow-state.py" },
        ],
      },
      userField: true,
    });
    const first = scrubHooksJson(input, ownedPaths, "flat");
    const second = scrubHooksJson(first.content, ownedPaths, "flat");

    expect(first.outcome).toBe("scrubbed");
    expect(second).toEqual({
      content: first.content,
      fullyEmpty: false,
      outcome: "unchanged",
    });
  });
});

describe("scrubZcodeConfigJson", () => {
  const ownedPaths = [
    ".zcode/hooks/session-start.py",
    ".zcode/hooks/inject-workflow-state.py",
  ];

  it("scrubs current matcher-block events and preserves user fields/events", () => {
    const input = {
      model: "user-model",
      hooks: {
        enabled: true,
        events: {
          SessionStart: [
            {
              matcher: "startup|clear|compact",
              hooks: [
                {
                  type: "command",
                  command:
                    'python3 "${ZCODE_PROJECT_DIR}/.zcode/hooks/session-start.py"',
                },
                { type: "command", command: "python3 tools/user-hook.py" },
              ],
            },
          ],
          CustomEvent: [
            {
              hooks: [{ type: "command", command: "python3 tools/custom.py" }],
            },
          ],
        },
      },
    };

    const result = scrubZcodeConfigJson(
      JSON.stringify(input, null, 2),
      ownedPaths,
    );
    const parsed = JSON.parse(result.content);

    expect(result.outcome).toBe("scrubbed");
    expect(result.fullyEmpty).toBe(false);
    expect(parsed.model).toBe("user-model");
    expect(parsed.hooks.enabled).toBe(true);
    expect(parsed.hooks.events.SessionStart[0].hooks).toEqual([
      { type: "command", command: "python3 tools/user-hook.py" },
    ]);
    expect(parsed.hooks.events.CustomEvent).toEqual(
      input.hooks.events.CustomEvent,
    );
  });

  it("scrubs the frozen direct-event schema", () => {
    const input = {
      hooks: {
        UserPromptSubmit: [
          {
            command: "python3 .zcode/hooks/inject-workflow-state.py",
          },
        ],
      },
    };

    const result = scrubZcodeConfigJson(
      JSON.stringify(input, null, 2),
      ownedPaths,
    );

    expect(result.outcome).toBe("scrubbed");
    expect(result.fullyEmpty).toBe(true);
    expect(JSON.parse(result.content)).toEqual({});
  });

  it("preserves malformed recognized containers byte-for-byte", () => {
    const input = '{"hooks":{"events":{"SessionStart":[{"hooks":[42]}]}}}\n';
    const result = scrubZcodeConfigJson(input, ownedPaths);

    expect(result).toEqual({
      content: input,
      fullyEmpty: false,
      outcome: "malformed",
    });
  });

  it("preserves user-only content byte-for-byte", () => {
    const input =
      '{"hooks":{"enabled":true,"events":{"Custom":[{"hooks":[{"command":"node user.js"}]}]}},"theme":"dark"}\n';
    const result = scrubZcodeConfigJson(input, ownedPaths);

    expect(result.outcome).toBe("unchanged");
    expect(result.content).toBe(input);
  });

  it("is idempotent after a successful scrub", () => {
    const input = JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { command: "python3 .zcode/hooks/inject-workflow-state.py" },
        ],
      },
      userField: true,
    });
    const first = scrubZcodeConfigJson(input, ownedPaths);
    const second = scrubZcodeConfigJson(first.content, ownedPaths);

    expect(first.outcome).toBe("scrubbed");
    expect(second).toEqual({
      content: first.content,
      fullyEmpty: false,
      outcome: "unchanged",
    });
  });
});

describe("scrubOpencodePackageJson", () => {
  it("removes @opencode-ai/plugin and reports fullyEmpty", () => {
    const input = { dependencies: { "@opencode-ai/plugin": "1.1.40" } };
    const { content, fullyEmpty } = scrubOpencodePackageJson(
      JSON.stringify(input, null, 2),
    );
    expect(fullyEmpty).toBe(true);
    expect(JSON.parse(content)).toEqual({});
  });

  it("preserves other deps and other top-level fields", () => {
    const input = {
      name: "my-project",
      dependencies: {
        "@opencode-ai/plugin": "1.1.40",
        lodash: "^4.0.0",
      },
    };
    const { content, fullyEmpty } = scrubOpencodePackageJson(
      JSON.stringify(input, null, 2),
    );
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe("my-project");
    expect(parsed.dependencies).toEqual({ lodash: "^4.0.0" });
    expect(fullyEmpty).toBe(false);
  });
});

describe("scrubManagedMarkdownBlock", () => {
  it("removes the managed block and preserves user markdown", () => {
    const input = `# User Guidance

Keep this.

${TEST_BLOCK_START}
# Managed
Remove this.
${TEST_BLOCK_END}

## Tail

Also keep this.
`;

    const { content, fullyEmpty } = scrubManagedMarkdownBlock(
      input,
      TEST_BLOCK_START,
      TEST_BLOCK_END,
    );

    expect(content).toBe(`# User Guidance

Keep this.

## Tail

Also keep this.
`);
    expect(fullyEmpty).toBe(false);
  });

  it("reports fullyEmpty when only the managed block remains", () => {
    const { content, fullyEmpty } = scrubManagedMarkdownBlock(
      `${TEST_BLOCK_START}\nmanaged\n${TEST_BLOCK_END}\n`,
      TEST_BLOCK_START,
      TEST_BLOCK_END,
    );

    expect(content).toBe("");
    expect(fullyEmpty).toBe(true);
  });

  it("leaves malformed marker pairs untouched", () => {
    const input = `${TEST_BLOCK_START}\nmanaged\n`;
    const { content, fullyEmpty, outcome } = scrubManagedMarkdownBlock(
      input,
      TEST_BLOCK_START,
      TEST_BLOCK_END,
    );

    expect(content).toBe(input);
    expect(fullyEmpty).toBe(false);
    expect(outcome).toBe("malformed");
  });

  it("reports unchanged when the managed block is absent", () => {
    const input = "# User-owned markdown\n";
    const result = scrubManagedMarkdownBlock(
      input,
      TEST_BLOCK_START,
      TEST_BLOCK_END,
    );

    expect(result).toEqual({
      content: input,
      fullyEmpty: false,
      outcome: "unchanged",
    });
  });
});

describe("scrubPiSettings", () => {
  it("strips trellis entries and reports fullyEmpty", () => {
    const input = {
      enableSkillCommands: true,
      extensions: ["./extensions/trellis/index.ts"],
      skills: ["./skills"],
      prompts: ["./prompts"],
      packages: [
        {
          source: "npm:pi-subagents",
          extensions: [],
          skills: [],
          prompts: [],
          themes: [],
        },
      ],
    };
    const { content, fullyEmpty } = scrubPiSettings(
      JSON.stringify(input, null, 2),
    );
    expect(fullyEmpty).toBe(true);
    expect(JSON.parse(content)).toEqual({});
  });

  it("preserves user-added array entries", () => {
    const input = {
      enableSkillCommands: true,
      extensions: ["./extensions/trellis/index.ts", "./extensions/my-ext"],
      skills: ["./skills", "./other-skills"],
      prompts: ["./prompts"],
      packages: [
        {
          source: "npm:pi-subagents",
          extensions: [],
          skills: [],
          prompts: [],
          themes: [],
        },
        {
          source: "npm:user-package",
          skills: ["./pkg-skills"],
        },
      ],
      otherField: "user-value",
    };
    const { content, fullyEmpty } = scrubPiSettings(
      JSON.stringify(input, null, 2),
    );
    const parsed = JSON.parse(content);
    expect(parsed.enableSkillCommands).toBeUndefined();
    expect(parsed.extensions).toEqual(["./extensions/my-ext"]);
    expect(parsed.skills).toEqual(["./other-skills"]);
    expect(parsed.prompts).toBeUndefined();
    expect(parsed.packages).toEqual([
      {
        source: "npm:user-package",
        skills: ["./pkg-skills"],
      },
    ]);
    expect(parsed.otherField).toBe("user-value");
    expect(fullyEmpty).toBe(false);
  });
});

describe("scrubCodexConfigToml", () => {
  const TEMPLATE = `# Project-scoped Codex defaults for Trellis workflows.
# Codex loads this after ~/.codex/config.toml when you work in this project.

# Keep AGENTS.md as the primary project instruction file.
project_doc_fallback_filenames = ["AGENTS.md"]

# NOTE: Trellis's SessionStart + UserPromptSubmit hooks require opt-in.
# Add the following to your USER-level config at ~/.codex/config.toml
# (not this project file — features.* must be enabled globally):
#
#   [features]
#   codex_hooks = true
#
# Without this flag, hooks.json is ignored and Trellis context won't
# be injected into Codex sessions.
`;

  it("removes the entire trellis-shipped file and reports fullyEmpty", () => {
    const { content, fullyEmpty } = scrubCodexConfigToml(TEMPLATE);
    expect(fullyEmpty).toBe(true);
    expect(content.trim()).toBe("");
  });

  it("preserves user-added TOML content", () => {
    const userContent = `${TEMPLATE}
# My custom config
[my_section]
my_key = "value"
`;
    const { content, fullyEmpty } = scrubCodexConfigToml(userContent);
    expect(fullyEmpty).toBe(false);
    expect(content).toContain("[my_section]");
    expect(content).toContain('my_key = "value"');
    expect(content).not.toContain("project_doc_fallback_filenames");
    expect(content).not.toContain("Trellis's SessionStart");
  });

  it("strips just the assignment line when comments are absent", () => {
    const minimal = `project_doc_fallback_filenames = ["AGENTS.md"]
[user_section]
key = 1
`;
    const { content, fullyEmpty } = scrubCodexConfigToml(minimal);
    expect(fullyEmpty).toBe(false);
    expect(content).not.toContain("project_doc_fallback_filenames");
    expect(content).toContain("[user_section]");
  });

  it("strips the new `hooks = true` marker line (Codex 0.129+) alongside the legacy `codex_hooks` line", () => {
    const newTemplate = `# Project-scoped Codex defaults for Trellis workflows.
# Codex loads this after ~/.codex/config.toml when you work in this project.

# Keep AGENTS.md as the primary project instruction file.
project_doc_fallback_filenames = ["AGENTS.md"]

# NOTE: Trellis's SessionStart + UserPromptSubmit hooks require opt-in.
# Add the following to your USER-level config at ~/.codex/config.toml
# (not this project file — features.* must be enabled globally):
#
#   [features]
#   hooks = true
#   codex_hooks = true
#
# Without this flag, hooks.json is ignored and Trellis context won't
# be injected into Codex sessions.
`;
    const { content, fullyEmpty } = scrubCodexConfigToml(newTemplate);
    expect(fullyEmpty).toBe(true);
    expect(content.trim()).toBe("");
  });
});

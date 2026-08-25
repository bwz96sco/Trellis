# Claude CLI Evaluation Runner Evidence

## Evidence boundary

- Inspected host: Claude Code `2.1.228`.
- Current documentation lookup used `smart-search` and official Anthropic sources.
- No provider/model evaluation call was made while researching this contract.

Official sources:

- CLI reference: <https://code.claude.com/docs/en/cli-reference>
- Noninteractive mode: <https://code.claude.com/docs/en/headless>
- Model configuration: <https://code.claude.com/docs/en/model-config>
- Model IDs: <https://platform.claude.com/docs/en/about-claude/models/overview>
- Result schema: <https://code.claude.com/docs/en/agent-sdk/typescript#sdkresultmessage>
- Per-model usage: <https://code.claude.com/docs/en/agent-sdk/typescript#modelusage>
- Cost and token accounting: <https://code.claude.com/docs/en/agent-sdk/cost-tracking>
- CLI errors: <https://code.claude.com/docs/en/errors#command-line-errors>

## Selected contract

Each authorized arm uses one noninteractive Claude CLI process and one model turn:

```bash
claude --safe-mode -p "$TASK_PROMPT" \
  --model claude-sonnet-5 \
  --system-prompt "$SYSTEM_PROMPT" \
  --output-format json \
  --session-id "$SESSION_ID" \
  --no-session-persistence \
  --tools "" \
  --disallowedTools "mcp__*" \
  --disable-slash-commands \
  --permission-mode dontAsk \
  --max-turns 1
```

The subprocess working directory is the isolated run workspace. `--add-dir` is forbidden because it widens access rather than isolating the run. No fallback model is configured.

## Why these flags

| Requirement | Flag / behavior |
|---|---|
| Noninteractive execution | `-p` |
| Exact approved model | `--model claude-sonnet-5` |
| Standalone evaluation prompt | `--system-prompt` |
| One parseable result | `--output-format json` |
| Stable run identity | `--session-id <UUID>` |
| No session residue | `--no-session-persistence` |
| No built-in tool loop | `--tools ""` |
| No MCP access | `--disallowedTools "mcp__*"` |
| No Skill/command invocation | `--disable-slash-commands` |
| No interactive permission path | `--permission-mode dontAsk` |
| One model turn | `--max-turns 1` |

`--allowedTools` is insufficient because it approves matches but does not restrict the available tool inventory.

## Authentication and isolation choice

Installed authentication is first-party OAuth and `ANTHROPIC_API_KEY` is unset. `--bare` cannot use OAuth, so C8 uses installed `--safe-mode`: it disables CLAUDE.md, skills, plugins, hooks, MCP servers, custom commands/agents, output styles, workflows, and other customizations while retaining OAuth, explicit model selection, built-in tool configuration, and permissions. Built-in tools are then disabled with `--tools ""`; MCP and slash-command surfaces are denied separately. Admin-managed policy settings may still apply, so every result must prove exact resolved model identity and zero tool activity. C8 never configures a fallback model.

## Result validation

The runner accepts a result only when all conditions hold:

1. process exit code is `0`;
2. result JSON has `type: "result"` and `is_error: false`;
3. exactly one `modelUsage` key is present;
4. the resolved/canonical model is `claude-sonnet-5` (or the corresponding documented canonical identity without substitution);
5. `num_turns` is `1`;
6. `result` is non-empty;
7. no permission denial or tool activity is reported.

Recorded metadata includes `uuid`, `session_id`, result subtype, stop reason, durations, `num_turns`, `total_cost_usd`, top-level usage, full `modelUsage`, permission denials, stdout/stderr digests, and process exit status.

Infrastructure retry is allowed only when no usable model result exists. Authentication failure, exact-model unavailability, model substitution, content failure, assertion failure, or a usable partial result is not retryable. Total process attempts remain capped at 24.

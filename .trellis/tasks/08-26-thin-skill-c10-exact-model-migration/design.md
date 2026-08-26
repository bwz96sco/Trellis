# C10 exact-model recovery design

## Successor boundary

C10 is a forward successor to committed C9. C9 remains terminal and immutable. C10 materializes reusable static inputs from Git commit `cacbd39c`, creates a fresh zero-byte ledger and empty output root, and records a new predecessor manifest that excludes every C9 runtime result.

## Direct Claude executable

C10 resolves `/Users/zhangbowen/.local/bin/claude` to its versioned executable and rejects the cmux wrapper path. Auth status and model execution use the same direct executable identity. The route receipt records only non-secret executable path/version identity, command, route fields, byte count, and digest; it never records account email, keychain data, API keys, auth tokens, messaging tokens, or raw auth output.

## Child environment

Start with a copy of the parent environment. Remove the frozen C9 provider/model/auth denylist plus exact parent-session keys:

```text
CLAUDECODE
CLAUDE_CODE_CHILD_SESSION
CLAUDE_CODE_FORK_SUBAGENT
CLAUDE_CODE_SUBAGENT_MODEL
CLAUDE_CODE_MESSAGING_SOCKET
CLAUDE_CODE_MESSAGING_TOKEN
CLAUDE_CODE_SESSION_ID
CLAUDE_CODE_ENTRYPOINT
CLAUDE_CODE_EXECPATH
CLAUDE_PID
CLAUDE_EFFORT
CLAUDE_CODE_EFFORT_LEVEL
CLAUDE_CODE_ALWAYS_ENABLE_EFFORT
CLAUDE_CODE_DISABLE_ADVISOR_TOOL
CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL
CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION
```

Then set exact child-only controls:

```text
CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1
CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=0
CLAUDE_CODE_EFFORT_LEVEL=low
CLAUDE_CODE_ALWAYS_ENABLE_EFFORT=0
```

The parent environment is never mutated.

## Live command

Use the direct executable with the C9 one-turn restrictions plus explicit low effort:

```text
<direct-claude>
--safe-mode
-p <task>
--model claude-sonnet-5
--effort low
--system-prompt <system>
--output-format json
--session-id <uuid>
--no-session-persistence
--tools ""
--disallowedTools mcp__*
--disable-slash-commands
--permission-mode dontAsk
--max-turns 1
```

Do not pass `--prompt-suggestions false`; installed CLI restricts that flag to stream-json. The child environment disables suggestions instead.

## Gate behavior

The first planned `literature-01/A` run is the route probe. Acceptance still requires exactly one `modelUsage` key equal to `claude-sonnet-5`, provider `firstParty`, one turn, nonempty result, no permission denials, and no tool activity. Any auxiliary identity is nonretryable. Infrastructure retry rules and the 24-attempt hard cap remain unchanged.

After the live gate passes, reuse the frozen ten-package blueprint and distribution matrix from C9. No production runtime changes are expected before package generation; distribution edits remain limited to the package inventory/reference surfaces already identified in C8/C9 planning.

## Failure and rollback

Every reservation remains durable before process launch. C10 never edits C9. A route failure writes forward C10 evidence and stops. Package expansion begins only after the gate passes, so a route failure requires no product rollback.

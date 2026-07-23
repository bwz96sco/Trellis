# Claude Dispatch validation drift

## Finding

Claude and Codex currently make different Dispatch decisions.

Claude explicit Dispatch path in `packages/cli/src/templates/shared-hooks/inject-subagent-context.py` is a second validator. It checks ledger sequence numbers, then trusts tracked projections and `request.json`. C07 in `packages/cli/src/commands/research/dispatch-context.ts` strict-reduces canonical ledger state and requires tracked request equality.

## Confirmed differences

| Contract | Current Claude hook | C07 / Codex |
| --- | --- | --- |
| Canonical state | Sequence head + projections | Strict ledger reduction |
| Dispatch existence | Tracked request can be sufficient | Canonical Dispatch required |
| Request authority | Tracked request | Request must deep-equal canonical Dispatch |
| Stage routing | Python `_RESEARCH_OWNER_BY_STAGE` | Core `resolveResearchStageCapability()` |
| `ownerSkill` | Fatal routing authority | Warning-only compatibility metadata |
| `provider` | Mostly ignored | Deterministic warning-only metadata |
| `taskRef` | Dereferenced into `.trellis/tasks` | Never dereferenced; warning-only |
| `expectedOutputs` | Parsed as repository paths | Bounded descriptive text |
| Optional skill | Unsupported | Exact optional name or bundled fallback |
| Artifact registration | Embedded ref only | Embedded ref checked against canonical registration |
| Failure | Worker launches with no-write prompt | Typed no-write failure |

Current hook fixture writes ledger rows containing only `{"seq": n}` and no canonical Dispatch event. That fixture proves compatibility-validator behavior, not canonical C07 behavior.

## Affected symbols and GitNexus impact

All inspected upstream impacts are LOW. Direct caller is `main`; affected process is explicit shared-hook execution only.

- `_validate_explicit_dispatch`
- `_parse_dispatch_request`
- `_validate_dispatch_hierarchy`
- `_resolve_dispatch_repository`
- `_validate_dispatch_paths`
- `_build_dispatch_prompt`
- `_build_dispatch_failure_prompt`
- `_emit_updated_prompt`
- `_find_research_control_root`
- `main`

Repository-wide change detection remains noisy/CRITICAL because worktree contains inherited C01-C08 and unrelated changes. C09 review must use child allowlist plus symbol-level impact.

## Required convergence

Keep Claude-specific adapter concerns only:

- exact Agent type;
- exact one-line pointer envelope;
- marker idempotency;
- control-root discovery from child repository invocation;
- C07 process execution and response validation;
- Claude prompt injection or Agent denial.

Remove Python ownership of:

- request/schema parsing;
- ledger/projection authority;
- hierarchy validation;
- Repository/artifact/write-path validation;
- stage/owner mapping;
- Task dereference;
- expected-output path interpretation.

C07 becomes sole Dispatch decision authority. No manual Python fallback remains.

## Failure boundary

Invalid envelope fails before any process. Typed C07 failure denies Agent launch with bounded `error.code` and message. Missing/stale CLI, malformed JSON, successful stderr, request/host mismatch, authority mismatch, or output-contract mismatch denies launch as `PREFLIGHT_EXECUTION_FAILED`.

Using `permissionDecision: "deny"` is stronger than current prompt-only failure isolation: invalid worker never starts, so target access cannot occur.

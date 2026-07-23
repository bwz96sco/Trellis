# C09 convergence: impact and selected design

## Decision

Claude becomes a thin C07 adapter. Selected contract:

1. Trigger only `trellis-research-worker` Agent calls whose complete prompt is one canonical pointer line.
2. Run C07 pass 1 with no discovered skill names.
3. Read only validated `capability.optionalSkill` from pass 1.
4. Probe exact direct personal/project skill metadata paths only.
5. If exact optional skill exists, run C07 pass 2 with that one canonical `--skill-name`.
6. Validate final C07 response.
7. Inject final JSON; worker invokes exactly `capability.selectedSkill` through Claude `Skill` tool.
8. Deny Agent launch on invalid envelope or preflight failure.

Ordinary prompts and non-Research agents run no C07 subprocess.

## Why not keep Python validation

Python currently duplicates stage routing, compatibility policy, schema interpretation, canonical-state authority, Repository resolution, artifact validation, and path containment. Parity tests could freeze current duplication but would leave two decision engines.

C07 replacement is smaller and safer: TypeScript owns all provider-neutral decisions; Python owns Claude process adaptation only.

## Why exact one-line envelope

Old Claude hook preserved prompt tail after pointer. Tail is undeclared context. It can broaden objective, reads, writes, or output expectations outside canonical Dispatch.

Codex already requires exact one-line envelope. Matching Claude removes host-only authority and makes invocation parity testable.

Accepted complete prompt:

```text
Research dispatch: .trellis/research/dispatches/dsp_<lowercase-canonical-uuid>/request.json
```

No leading/trailing blank line, second line, prefix, suffix, traversal, alias, backslash, absolute path, or case variation.

## Why deny instead of launch a failure worker

Claude `PreToolUse` supports `permissionDecision: "deny"`. Denial prevents Agent startup. Current no-write failure prompt still launches a worker with tools and target reachability.

C09 behavior:

- typed C07 failure -> deny with bounded `[CODE]: message`;
- local adapter failure -> deny with `PREFLIGHT_EXECUTION_FAILED`;
- no target read/write, no worker startup.

## Optional-skill discovery gap

Claude Agent hook input provides prompt, description, subagent type, and optional model. It does not provide complete skill inventory. Static subagent `skills:` frontmatter preloads fixed skill bodies and cannot choose one dynamically by validated stage.

Chosen two-pass approach avoids another Python stage/name table.

### Pass 1

```text
trellis research dispatch context <pointer> --host claude --root <control-root> --json
```

Successful output provides canonical current `capability.optionalSkill`.

### Metadata probe

Inspect existence/file metadata only for:

```text
<control-root>/.claude/skills/<optionalSkill>/SKILL.md
~/.claude/skills/<optionalSkill>/SKILL.md
```

Rules:

- no directory enumeration;
- no body/frontmatter read;
- no target Repository inspection;
- no nested/plugin/add-dir/enterprise inventory inference;
- exact case-sensitive name only;
- unreadable/non-file path counts absent;
- personal presence wins only as Claude runtime precedence, not as content authority.

### Pass 2

If either exact direct file exists:

```text
trellis research dispatch context <pointer> --host claude --root <control-root> --skill-name <optionalSkill> --json
```

Pass 2 is final authority. If state changes and pass 2 fails, deny.

No file -> pass 1 remains final with bundled fallback.

## Skill invocation

Claude worker frontmatter includes `Skill`, excludes `Glob` and `Grep`, and keeps only bounded execution tools.

After injected JSON validation, worker invokes exactly `capability.selectedSkill`. It never routes from `ownerSkill`, `provider`, `taskRef`, or warnings.

Filesystem presence is only discovery metadata. Actual `Skill` invocation is final availability check. If selected skill is disabled, missing, ambiguous, or unreadable, worker returns blocked Result plus empty pending Proposal. It does not silently fall back because fallback would change a validated decision.

## Compatibility impact

Intentional hardening changes:

- Claude prompt tail no longer accepted.
- Invalid preflight no longer starts worker.
- Legacy owner mismatch becomes warning-only.
- `taskRef` becomes inert.
- `expectedOutputs` remain descriptive text.
- stale/missing projections no longer override canonical ledger.
- optional external skill may now be selected by exact direct name.

No ledger rewrite. No schema change. Existing tracked Dispatch records remain readable through C07 compatibility warnings.

## GitNexus impact

Symbol-level upstream impact for current hook functions is LOW. Expected process scope is shared Claude PreToolUse hook only. No HIGH or CRITICAL symbol edit is planned.

Expected production files:

- `packages/cli/src/templates/shared-hooks/inject-subagent-context.py`
- `packages/cli/src/templates/claude/agents/trellis-research-worker.md`

Expected test/spec files:

- `packages/cli/test/templates/research-hooks.test.ts`
- optional shared Research fixture helper
- `packages/cli/test/templates/codex.test.ts` for core-derived invariant
- `.trellis/spec/cli/backend/research-worker-hooks.md`
- `.trellis/spec/cli/backend/commands-research.md`
- `.trellis/spec/cli/unit-test/conventions.md` if shared fixture convention changes

C07/core source changes are out of default scope. Change them only if shared parity exposes a confirmed common defect.

## Official Claude Code sources

Fetched through `smart-search` before this report:

- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/hooks

Relevant documented behavior:

- project skills live under `.claude/skills/<name>/SKILL.md`;
- personal skills live under `~/.claude/skills/<name>/SKILL.md`;
- direct name comes from directory name;
- plugin/nested conflicts use qualified names;
- `skills:` preloads listed skill bodies into subagent startup context;
- `Skill` tool allows dynamic invocation;
- `PreToolUse` Agent hook can replace input or deny launch.

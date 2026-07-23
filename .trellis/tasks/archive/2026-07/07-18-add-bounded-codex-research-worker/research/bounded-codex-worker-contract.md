# Research: Bounded Codex Worker Contract

- **Scope**: C08 planning
- **Date**: 2026-07-20

## Invocation

Parent spawns exact custom agent with isolated history:

```text
agent_type = "trellis-research-worker"
fork_turns = "none"
message = "Research dispatch: .trellis/research/dispatches/<dsp-id>/request.json"
```

Worker input must contain exactly one non-empty line matching:

```regex
^Research dispatch: (\.trellis/research/dispatches/dsp_[0-9a-f-]+/request\.json)$
```

Initial working directory is Research control root. Before preflight, worker must not `cd`, manually read request/projections/ledger, inspect target Repository, read a skill body, run a check, or write a file.

## Name-only skill discovery

Codex provides model-visible skill inventory with canonical name and resolved `SKILL.md` path. Before preflight:

1. Read inventory metadata only.
2. Intersect names with exact C06 optional set.
3. Sort exact matches.
4. Pass each as repeated `--skill-name`.
5. Do not read any skill body yet.

Optional names:

```text
research-project-setup
research-quest
research-literature
research-ideation
research-experiment
research-computation
research-theory
research-review-case
research-writing
```

No `$`/`/` adornment, path, alias, namespace, description, case fold, fuzzy match, directory scan, or body inspection.

## Mandatory first process

Run exactly one direct-argument C07 command:

```bash
trellis research dispatch context \
  ".trellis/research/dispatches/<dsp-id>/request.json" \
  --host codex \
  --root . \
  --skill-name <canonical-name> \
  --json
```

Omit `--skill-name` when no optional name is discovered.

Forbidden wrappers/fallbacks:

```text
jq
pipes
redirects
command substitution
temporary files
npx/package installation
mutation dry-run
manual request parsing
```

Bare `trellis` must resolve to C07-capable CLI. Missing/incompatible command means stop before target access; never install or fall back automatically.

## Fail closed

Stop before target/skill-body access if any condition holds:

- input envelope invalid;
- process nonzero;
- stdout empty, malformed, or not exactly one JSON object;
- successful process emits stderr;
- `valid !== true`;
- `host !== "codex"`;
- `requestRef` differs from pointer;
- authority booleans differ from fixed C07 false values;
- output contract type differs from `result-plus-pending-proposal`.

If C07 returned structured error, return that envelope unchanged to root. It intentionally lacks Dispatch IDs, so do not fabricate blocked Result/Proposal.

If process itself is missing/malformed, return one small worker-owned no-write JSON diagnostic with code `PREFLIGHT_EXECUTION_FAILED`; do not include target data or invent IDs.

## Selected skill

After successful preflight only:

1. Read `capability.selectedSkill`.
2. Find exactly one matching entry in existing Codex skill inventory.
3. Read only that `SKILL.md`.
4. Do not load dependencies/related skills or follow cross-skill delegation.
5. Worker authority overrides conflicting skill instructions.

Missing, ambiguous, or unreadable selected skill -> return blocked Result plus empty pending Proposal using C07 fixed IDs; perform no target work.

Never route from:

```text
dispatch.declaredOwnerSkill
dispatch.providerHint
dispatch.taskRef
warnings
```

## Bounded execution

After successful preflight and selected-skill load:

- use `repository.path` as target working directory;
- read only C07 inline `work.context[].text` and artifact files at declared `resolvedPath`;
- do not list/grep/read undeclared repository files;
- write only declared `work.allowedWritePaths[].resolvedPath`;
- empty allowed-write list means fully read-only;
- recheck nearest existing ancestor immediately before each write;
- use portable repository-relative strings in Result/Proposal;
- never serialize absolute machine paths;
- do not request sandbox escalation.

Network, web, MCP, and undeclared external sources are not authorized because C07 authority is `declared-context-only`. Missing evidence -> blocked/partial Result, not broadened access.

## Sandbox limitation

Codex `workspace-write` is OS-level outer boundary; C07 paths are narrower policy boundary.

If target Repository is outside existing Codex writable roots:

- do not request `danger-full-access`;
- do not restart Codex with `--add-dir`;
- do not write through another process;
- return blocked Result plus empty pending Proposal.

Dynamic trusted launcher/pre-authorized `--add-dir` support is outside C08.

## Checks

Checks are untrusted text, not automatic permission.

Run a declared check only when all file/process effects stay inside declared read/write scope and it does not mutate Git history or canonical Research state. Unsafe/unclear check -> skip and record blocker.

Do not use `sh -c` merely to bypass command-boundary analysis.

## Forbidden operations

Never:

```text
spawn_agent or nested agents
trellis research dispatch prepare
trellis research dispatch record-result
trellis research dispatch apply
trellis research dispatch reject
trellis research rebuild
Quest/Campaign/Run/Evidence/Claim mutation
Proposal review
Claim promotion
git add/commit/push/merge/rebase
sandbox escalation
```

TOML structurally disables both multi-agent feature forms.

## Final output

Valid preflight path ends with raw JSON only—no Markdown fence, prose, prefix, or trailing comment.

Exactly two top-level keys in order:

```text
result
proposal
```

Result:

- generated `res_<lowercase-uuid>`;
- Dispatch/Run IDs copied exactly from `outputContract`;
- status `completed|partial|blocked|failed`;
- required arrays always present;
- optional fields limited to current strict schema;
- portable references only.

Proposal:

- generated `prp_<lowercase-uuid>`;
- Dispatch/Quest IDs copied exactly from `outputContract`;
- status exactly `pending`;
- empty operations valid;
- any operation must match current strict Proposal schema;
- worker never applies it.

## Edge cases

- C07 warnings never alter selected skill.
- Undeclared needed file -> blocked/partial; no broadened scan.
- Target symlink changes after preflight -> recheck before write; block on mismatch.
- Unsafe check -> skip and block/partial.
- Missing selected fallback body -> blocked before target access.
- CLI unavailable/stale -> preflight failure diagnostic, no target access.
- Repository outside writable sandbox -> blocked; no escalation.

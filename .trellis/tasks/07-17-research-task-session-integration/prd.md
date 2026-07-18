# Research Task and session integration

## Goal

Link optional Trellis Tasks to canonical research entities without changing Task lifecycle semantics, and make session pointer cleanup preserve an active research Run plus forward-compatible runtime state.

## Requirements

### Optional Task links

- Add `trellis research task link <task>` and `trellis research task unlink <task>` under the existing exact-root research command family.
- Store links only in additive `task.json.meta.research` using known keys `questId`, `campaignId`, `runId`, `dispatchId`, and `repositoryId`.
- Use public `@mindfoldhq/trellis-core/task` load/write APIs. Do not change the Task schema, Task status, `dev_type`, phase derivation, hooks, or research ledger.
- Resolve `<task>` as one direct child directory of `<root>/.trellis/tasks/`; accept historical directory names, but reject traversal, path separators, missing `task.json`, non-directory targets, and symlink escape.
- `link` requires at least one supplied research ID, validates ID prefixes, loads canonical research state, verifies every referenced entity exists, and rejects inconsistent Quest/Campaign/Run/Dispatch/Repository combinations.
- Omitted known link fields remain unchanged. Existing unknown fields inside `meta.research`, sibling `meta` fields, and unknown top-level Task fields remain unchanged.
- Existing non-object `meta.research` is malformed state and must fail instead of being overwritten.
- `unlink` removes only `meta.research`, is idempotent when absent, and preserves all other Task data.

### Session pointer contract

- Session runtime remains `.trellis/.runtime/sessions/<context-key>.json`.
- Add Python helpers to resolve, set, and clear reserved `current_run` while preserving `current_task`, platform/session metadata, and unknown keys.
- Replace whole-file deletion in Task finish/archive cleanup with pointer-specific read-modify-write: clear only `current_task`, and only when its value matches the expected task for archive cleanup.
- Delete a session file only when no meaningful state remains. `current_task: null`, `current_run: null`, and empty pointer values are not meaningful; unknown keys and non-empty platform/session fields are meaningful and must survive.
- Mirror shipped Python template changes into the repository dogfood `.trellis/scripts` copy.

### Research Run pointer integration

- After a successful, non-dry-run `run.status -> running`, best-effort set `current_run` for the current `TRELLIS_CONTEXT_ID` session.
- After a successful, non-dry-run terminal Run transition or explicit invalidation, conditionally clear `current_run` only when it matches the affected Run.
- Missing context identity, absent session file, or best-effort runtime write failure must not roll back or misreport canonical research ledger success.
- Invalid transitions and dry-runs must not change session state.
- Core remains session-agnostic; runtime pointer logic stays in CLI/template integration code.

### Compatibility and scope

- Existing Task JSON records remain valid.
- Existing session files with only `current_task` retain prior observable cleanup: final pointer removal deletes the empty file.
- Native workflow and non-research Task commands retain behavior except preserving unrelated session state.
- No automatic Git commit, child-repo mutation, hook expansion, Mempal integration, or research event append from Task link/unlink.

## Acceptance Criteria

- [ ] `research task link` writes only `meta.research`, preserves unknown fields, and leaves research ledger byte-equivalent.
- [ ] Link validation rejects missing entities, malformed IDs, inconsistent hierarchy, traversal, and symlink escape.
- [ ] Partial relink preserves omitted known fields plus unknown `meta.research` fields.
- [ ] `research task unlink` removes only `meta.research` and is idempotent.
- [ ] Task finish clears only current session `current_task`; active `current_run` and unknown session keys survive.
- [ ] Task archive clears matching `current_task` from every session but preserves other pointers/state.
- [ ] Clearing final meaningful pointer deletes session file; unknown keys prevent deletion.
- [ ] Run start sets matching session `current_run`; terminal transition/invalidation clears only matching pointer.
- [ ] Dry-run, invalid transition, and missing context do not mutate session runtime.
- [ ] Shipped and dogfood Python copies remain byte-identical for changed shared files.
- [ ] Focused CLI/Python regressions, lint, typecheck, build, root typecheck, `git diff --check`, and GitNexus change detection pass.
- [ ] No commit unless user explicitly requests it.

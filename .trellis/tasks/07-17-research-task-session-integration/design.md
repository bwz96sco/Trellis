# Design — Research Task and session integration

## Boundaries

```text
canonical research ledger/state
  -> read-only validation for Task link
  -> task.json.meta.research (optional convenience link)

successful CLI Run mutation
  -> best-effort session pointer update
  -> .trellis/.runtime/sessions/<context-key>.json

Task finish/archive
  -> clear current_task only
  -> preserve current_run + unknown runtime state
```

Task links and session pointers are secondary references. Neither is scientific authority. Core research remains independent of Task/session code.

## Task link command

Add `packages/cli/src/commands/research/task.ts`, registered by existing research command wiring.

Signatures:

```text
trellis research task link <task>
  [--quest <qst_...>]
  [--campaign <cmp_...>]
  [--run <run_...>]
  [--dispatch <dsp_...>]
  [--repository <rep_...>]
  [--root <path>] [--json]

trellis research task unlink <task>
  [--root <path>] [--json]
```

No `--dry-run` or idempotency key: these commands do not mutate research state. Repeating same link/unlink is naturally idempotent at Task-file level.

### Safe Task resolution

1. Resolve exact research root through `resolveResearchRoot`.
2. Require `<task>` to be a non-empty basename with no `/`, `\\`, `.` or `..`.
3. Resolve `.trellis/tasks` realpath and candidate realpath.
4. Require candidate to be one direct child directory of tasks root after realpath resolution.
5. Require regular `task.json` within candidate.

This permits older date/name conventions without accepting arbitrary paths or archived/external directories.

### Link merge

Load via public core Task API. Treat absent `meta.research` as `{}`; reject non-object/array value. Build:

```ts
const nextResearch = {
  ...existingResearch,
  ...suppliedKnownIds,
};
```

Then validate complete resulting known tuple against `readResearchState(root)`:

- every present ID exists;
- Campaign Quest matches linked Quest when both are present;
- Run Campaign and inherited Quest match linked Campaign/Quest when present;
- Dispatch Run, Campaign, Quest, and Repository match linked values when present;
- Run repository matches linked Repository when both are present.

Partial links remain valid: e.g. Run-only or Repository-only. Relations are checked whenever both sides are represented. Unknown `meta.research` fields survive.

Write through `writeTaskRecord`; never call research commit APIs. `unlink` clones existing metadata, deletes only `research`, and writes only when needed.

## Session state helpers

Extend `common/active_task.py` with generic private pointer operations plus public Run helpers:

```python
def resolve_current_run(repo_root: Path, ...) -> str | None: ...
def set_current_run(run_id: str, repo_root: Path, ...) -> str | None: ...
def clear_current_run(
    repo_root: Path,
    expected_run_id: str | None = None,
    ...
) -> str | None: ...

def _clear_session_pointer(
    pointer_name: str,
    repo_root: Path,
    expected_value: str | None = None,
    ...
) -> str | None: ...

def _has_meaningful_session_state(context: dict) -> bool: ...
```

`set_active_task` and `set_current_run` read existing dict, update one key, and atomically write. Clear helpers:

1. Resolve context/session file.
2. Read dict; malformed/missing behaves as no pointer.
3. If expected value supplied and pointer differs, no-op.
4. Remove target pointer key.
5. If meaningful keys remain, atomically write updated dict.
6. Otherwise unlink session file.

Meaningful state means any key other than reserved pointer keys, or a non-empty reserved pointer value. Unknown keys are always preserved, including false/zero/empty containers because their presence may be forward-compatible state.

`clear_task_from_sessions` applies same matching clear to every session file. It does not delete malformed files or sessions where `current_task` differs.

## TypeScript Run pointer bridge

Add a CLI-local session helper. It uses only explicit `TRELLIS_CONTEXT_ID`, already exported/prefixed by supported host bridges. It does not duplicate platform-native context discovery.

```ts
setResearchSessionRun(root, runId): void;
clearResearchSessionRun(root, expectedRunId): void;
```

Contract:

- sanitize context key to same session filename rule used by Python;
- strict enough to prevent path escape;
- preserve unknown JSON object fields;
- same-directory atomic write;
- set/clear only `current_run`;
- clear only matching Run;
- delete only when no meaningful state remains;
- throw internally, but caller catches and optionally emits a compact human warning; canonical command result stays successful.

Wire after successful non-dry-run mutation in lifecycle command orchestration:

- `run.status` with requested `running` -> set;
- `run.status` with `succeeded | failed | cancelled` -> conditional clear;
- `run.invalidate` -> conditional clear.

No pointer update for replay ambiguity unless canonical returned event confirms requested mutation belongs to affected Run; event result is source for deciding update.

## Failure behavior

| Condition | Behavior |
|---|---|
| malformed Task `meta.research` | fail without write |
| unknown or inconsistent linked entity | fail without Task or ledger write |
| same link repeated | successful no-op/equivalent Task state |
| unlink absent link | successful no-op |
| malformed session JSON during Task clear | preserve file; do not erase unknown state |
| no `TRELLIS_CONTEXT_ID` | canonical Run command succeeds; pointer update skipped |
| session write fails after Run commit | report canonical success plus runtime warning; never append compensating event |
| terminal Run differs from current pointer | preserve pointer |

## Compatibility and rollback

- Removing CLI Task commands leaves namespaced metadata harmless.
- Removing Run pointer bridge leaves canonical research lifecycle unchanged.
- Python helper rollback must not restore whole-file deletion; that would reintroduce loss of forward-compatible session state.
- No migration needed. Existing single-pointer session files are read as before.

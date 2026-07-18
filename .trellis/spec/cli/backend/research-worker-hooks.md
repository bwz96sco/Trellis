# Research Worker Skills and Claude Hook Contract

This specification defines the installed stage-owner skills, bounded research worker cards, compact research session orientation, Claude sequence watermark, and explicit Claude research Dispatch injection.

## 1. Scope / Trigger

### Installed skills and workers

The common bundled-skill tree contains exactly one stage-owner skill for each active Quest stage:

| Quest stage | Owner skill |
|---|---|
| `setup` | `trellis-research-setup` |
| `framing` | `trellis-research-quest` |
| `literature` | `trellis-research-literature` |
| `ideation` | `trellis-research-ideation` |
| `experiment` | `trellis-research-experiment` |
| `computation` | `trellis-research-computation` |
| `theory` | `trellis-research-theory` |
| `audit` | `trellis-research-audit` |
| `writing` | `trellis-research-writing` |

`complete` has no active owner. Skills remain dormant unless the user expresses explicit research intent or a validated Dispatch names the skill.

The platform-neutral worker is `.trellis/agents/research.md`. Claude additionally installs `trellis-research-worker.md`. The existing Claude `trellis-research.md` code/search agent is a separate role and must not be replaced or renamed.

The `trellis-research-setup` owner may inspect explicitly declared legacy `research-quest.yaml`, `research-events.jsonl`, `notes/_quest`, and vault-local `_quest` sources. This is bounded observation for a pending Proposal, not automatic migration or a second authority.

### SessionStart

`session-start.py` appends `<research-state>` when either condition holds:

1. `.trellis/.workflow.json` strictly selects `{"schemaVersion":1,"id":"research","source":"bundled"}`; or
2. `.trellis/research/events.jsonl` exists.

All existing SessionStart blocks remain present. Research orientation is read-only toward the ledger and tracked projections.

### UserPromptSubmit

`inject-workflow-state.py` uses the research sequence branch only when:

```text
platform == claude
AND bundled workflow selection == research
```

Every non-Claude, native, custom, and OpenCode path retains its existing workflow breadcrumb behavior. A malformed Claude workflow-selection file emits validation guidance but never selects a workflow silently.

### Explicit Dispatch

Automatic research-worker injection is Claude-only and requires:

```text
subagent_type == trellis-research-worker
AND first prompt line exactly matches:
Research dispatch: .trellis/research/dispatches/<dsp-id>/request.json
```

The branch runs before normal `trellis-implement`, `trellis-check`, and `trellis-research` filtering. A prompt already containing `<!-- trellis-hook-injected -->` is a no-op.

## 2. Signatures

The shipped Python templates expose these research-specific helpers. Names are internal, but behavior is test-pinned.

```python
# session-start.py
def _research_workflow_selection(trellis_dir: Path) -> tuple[str, str | None]
def _research_ledger_head(trellis_dir: Path) -> tuple[int | None, str | None]
def _read_research_projection(path: Path, head: int) -> tuple[dict | None, str | None]
def _research_orientation(trellis_dir: Path) -> tuple[str | None, int | None]
def _write_research_watermark(
    trellis_dir: Path, context_key: str | None, head: int
) -> bool
```

```python
# inject-workflow-state.py
def _research_workflow_selection(root: Path) -> str
def _research_ledger_head(root: Path) -> int | None
def _read_session_state(root: Path, context_key: str) -> tuple[Path, dict | None]
def _atomic_write_session(session_path: Path, session_data: dict) -> bool
def _research_sequence_context(root: Path, input_data: dict) -> str | None
```

```python
# inject-subagent-context.py
def _find_research_control_root(input_data: dict, cwd: str) -> Path | None
def _parse_dispatch_request(request: dict, dispatch_id: str) -> dict
def _validate_dispatch_hierarchy(
    control_root: Path, request: dict, head: int
) -> tuple[dict, dict, dict, dict]
def _resolve_dispatch_repository(
    control_root: Path, repository: dict, repository_id: str
) -> Path
def _validate_dispatch_paths(
    control_root: Path, repository_root: Path, request: dict
) -> list[dict]
def _validate_explicit_dispatch(
    input_data: dict, cwd: str, original_prompt: str
) -> tuple[str | None, str | None]
```

The session identity source is always `common.active_task.resolve_context_key`; hooks must not invent another identity algorithm.

## 3. Contracts

### Canonical authority

- `.trellis/research/events.jsonl` is canonical.
- Hooks and workers never append events, mutate projections, apply/reject Proposals, promote Claims, advance Quest stages, or commit Git.
- Worker output is untrusted. The root session reviews it before invoking `trellis research dispatch record-result`.
- Child repositories require no Trellis installation.

### Legacy setup inputs

- The recognized legacy forms are `research-quest.yaml`, `research-events.jsonl`, `notes/_quest`, and a vault-local `_quest`.
- They are untrusted historical inputs. The setup owner performs only bounded reads when explicitly invoked.
- Selected observations may appear only in the worker Result and a pending Proposal for root-session review.
- The setup owner never imports, moves, deletes, rewrites, canonicalizes, or claims migration of the source files; never creates another YAML/JSONL authority; never appends canonical events; and never writes to Mempal automatically.
- Root review may choose typed canonical operations through the existing dispatch record/apply path. Empty Proposal operations remain valid when no legacy information should be adopted.

### Strict ledger head

For selected or initialized research state:

- missing or empty ledger means head `0`;
- each non-empty line is a JSON object;
- `seq` is an integer, not a boolean;
- sequences are contiguous from `1`;
- malformed JSON or a gap invalidates the read; no line is skipped.

Hooks read the head only. They do not reduce the ledger.

### Session watermark

The reserved runtime field is:

```json
{"research_last_seen_seq": 42}
```

Its file is `.trellis/.runtime/sessions/<context-key>.json`.

Update rules:

1. No context key: do not write.
2. Missing file: create an object containing the watermark.
3. Existing JSON object: clone it and replace only `research_last_seen_seq`.
4. Existing malformed or non-object JSON: preserve it byte-for-byte and skip the write.
5. Write a unique temporary file in the same directory, flush it, then use `os.replace`.
6. Remove temporary files best-effort after success or failure.

`current_task`, `current_run`, platform fields, unknown fields, and false/zero/empty values survive.

### Compact SessionStart output

A valid `<research-state>` contains only:

- ledger head;
- selected active Quest ID and title, or `none`;
- stage and mapped owner;
- active Quest count and an ambiguity marker when count exceeds one;
- pending Proposal count from strict compact `dispatches/*/proposal.json` records;
- schema-V1 blocker fallback and status guidance;
- repository-relative pointers to status, ledger, selected Quest projection, and Dispatch directory.

When several Quests are active, select the greatest `(updatedAt, id)` pair deterministically and still report the total count. Never inline entity or artifact bodies.

### Claude sequence output

| Condition | Output | Runtime write |
|---|---|---|
| head equals stored integer | empty stdout | none |
| valid changed/missing head | one `<research-state-changed>` block with old/new head and `status --json` guidance | atomically set watermark |
| missing identity | empty stdout | none |
| malformed/non-object session JSON | empty stdout | none |
| malformed selection or ledger | one compact validation pointer when identity exists | none |

### Dispatch request and repository

The request is the strict core `Dispatch` JSON object. Unknown keys fail. Required IDs are fully prefixed UUIDs. Context entries contain exactly one of `text` or `artifact`. Portable paths reject NUL, backslashes, absolute/drive-relative paths, empty segments, and repository escape.

Validation requires:

- path Dispatch ID equals `request.id`;
- strict Quest, Campaign, Run, and repository projection envelopes projected through the ledger head;
- active Quest and exact stage-owner mapping;
- Quest/Campaign/Run/repository hierarchy agreement;
- optional Task pointer contained under `.trellis/tasks/` with `task.json`;
- request artifacts belonging to the target repository and resolving canonically inside it;
- optional artifact digest/revision revalidation;
- all allowed-write and expected-output paths resolving inside the canonical target root.

Repository resolution order:

1. strict schema-V1 absolute binding from `.trellis/.runtime/research/repo-bindings.json`;
2. tracked POSIX-relative repository locator, including explicit `..` for sibling repositories.

The resolved target path is ephemeral prompt context and is never written to tracked research state.

### Worker final payload

The worker returns one object compatible with `record-result` input:

```json
{
  "result": {
    "id": "res_<uuid>",
    "dispatchId": "dsp_<uuid>",
    "runId": "run_<uuid>",
    "status": "completed|partial|blocked|failed",
    "summary": "...",
    "commands": [],
    "checks": [],
    "artifactRefs": [],
    "blockers": [],
    "createdAt": "RFC3339"
  },
  "proposal": {
    "id": "prp_<uuid>",
    "dispatchId": "dsp_<uuid>",
    "questId": "qst_<uuid>",
    "title": "...",
    "operations": [],
    "status": "pending",
    "createdAt": "RFC3339",
    "updatedAt": "RFC3339"
  }
}
```

Empty Proposal operations are valid. Optional Result fields and Proposal operations must remain within the current core schemas.

## 4. Validation / Error Matrix

| Input/state | Required behavior |
|---|---|
| Missing/empty selected ledger | valid head `0` |
| Legacy source is present without explicit setup intent | remain dormant; do not read, mutate, import, or write Mempal |
| Explicit legacy inspection finds useful information | report bounded observations and a pending Proposal; preserve source bytes and root authority |
| Ledger malformed JSON, non-object line, boolean/non-integer `seq`, or gap | compact validation guidance; no watermark overwrite |
| Malformed workflow selection | SessionStart validation guidance; Claude per-turn validation guidance when identity exists |
| Malformed Quest projection or proposal record | SessionStart validation guidance; no guessed Quest/count; no watermark write |
| Valid head equals watermark | no UserPromptSubmit output |
| Valid head changes | emit once, atomically update, next prompt is silent |
| Missing identity | no runtime file and no per-turn output |
| Malformed session JSON | preserve bytes and emit no per-turn state-change output |
| Pointer not on first line or not exact grammar | no automatic research injection |
| Explicit first-line `Research dispatch:` with invalid grammar | marked no-write validation-failure prompt |
| Request path traversal, symlink/canonical escape, or path/ID mismatch | marked no-write prompt |
| Unknown request key, missing field, malformed ID/context/path/timestamp | marked no-write prompt |
| Unknown owner or owner/stage mismatch | marked no-write prompt |
| Missing/inactive/complete Quest or inconsistent Campaign/Run/repository | marked no-write prompt |
| Missing target, malformed bindings, remote mismatch, artifact escape/digest/revision failure | marked no-write prompt |
| Invalid explicit Dispatch while a Task is active | no Task-context fallback; marked no-write prompt only |
| Non-Claude platform | existing agent and breadcrumb behavior |
| Existing `trellis-research` agent | existing code/search prompt behavior |

Validation failures are model-visible but non-authoritative:

```text
<!-- trellis-hook-injected -->
# Research Dispatch Validation Failed
Do not modify files or run the requested work.
Report this validation error to the root session: <reason>
```

## 5. Good / Base / Bad Cases

### Good

- Claude SessionStart sees ledger head `12`, one active `literature` Quest, and two pending Proposals. It emits a compact owner pointer and atomically stores `12` without changing `current_task`.
- Another root command advances the ledger to `13`. The next Claude prompt emits one old/new pointer and stores `13`; the following prompt emits nothing.
- A Task-free Claude worker receives a valid explicit Dispatch targeting a bound sibling repository. The hook injects text and artifact paths, not artifact bodies, and the worker writes only declared outputs.
- Explicit setup-stage inspection observes all four supported legacy forms, leaves every source byte-identical, and returns only a Result plus pending Proposal for root review without a Mempal write.

### Base

- Research is selected but not initialized: head is `0`, current Quest is `none`, pending Proposal count is `0`.
- A native workflow with no research ledger receives the existing SessionStart and `<workflow-state>` outputs unchanged.
- A non-Claude `trellis-research` invocation retains the existing search-agent prompt.

### Bad

- Skipping a malformed ledger line and reporting a later sequence.
- Replacing malformed session JSON with a fresh watermark object.
- Reading every Quest/Proposal/artifact body into every per-turn prompt.
- Resolving a child Git root first and losing the root research control plane.
- Letting an invalid explicit Dispatch fall through to active Task context.
- Writing absolute machine paths into `request.json`, events, projections, skills, or tracked worker output.
- Renaming `research-events.jsonl` into the canonical ledger, rewriting `_quest`, creating a second YAML authority, or auto-ingesting legacy text into Mempal.

## 6. Tests Required

The focused executable suite is `packages/cli/test/templates/research-hooks.test.ts`. It must cover:

- nine exact stage-owner names, frontmatter stage ownership, dormant trigger, authority wording, and Result plus Proposal output;
- all four legacy setup source names plus untrusted-input, source-preservation, proposal-only, root-review, no-second-authority, and no-automatic-Mempal wording;
- every platform collector tracking each bundled skill;
- platform-neutral and Claude worker discovery while retaining `trellis-research`;
- zero/one/multiple active Quest orientation and deterministic selection;
- pending Proposal count, compact pointers, and absence of entity/artifact bodies;
- malformed selection, ledger, Quest projection, and proposal record;
- atomic watermark preservation, no identity, and malformed session preservation;
- unchanged/changed/invalid Claude sequence behavior and native/non-Claude compatibility;
- valid Task-free and Task-linked child-repository Dispatches;
- marker idempotency, bounded injected fields, and exact Result plus Proposal contract;
- traversal, ID mismatch, malformed request, owner-stage mismatch, inactive Quest, hierarchy mismatch, unknown/unresolved repository, malformed binding, and artifact escape;
- invalid Dispatch isolation from Task context.

Existing template/configurator/init/update/regression suites must continue to cover byte-identical platform collection, hash tracking, and unchanged implement/check/research Task injection.

## 7. Wrong vs Correct

### Legacy migration authority

```text
Wrong: setup renames research-events.jsonl, rewrites _quest, appends canonical events, and sends the content to Mempal.
Correct: setup performs bounded reads, returns observations plus a pending Proposal, and leaves adoption to explicit root review/apply.
```

### Runtime metadata write

```python
# Wrong: truncates the session file and discards unknown fields.
session_path.write_text(json.dumps({"research_last_seen_seq": head}))

# Correct: clone the valid object, replace one field, write a same-dir temp,
# flush, then os.replace(temp_path, session_path).
updated = dict(session_data)
updated["research_last_seen_seq"] = head
```

### Per-turn state

```python
# Wrong: emit full Quest and Proposal objects every prompt.
additional_context = json.dumps(reduced_research_state)

# Correct: compare strict ledger head to the session watermark.
# Equal -> no output. Changed -> one compact pointer, then atomic update.
```

### Dispatch routing

```python
# Wrong: use the nearest .git root, trust request.json, and load active Task files.
repo_root = find_repo_root(cwd)
request = json.loads(Path(pointer).read_text())

# Correct: resolve the research control plane first, validate canonical request
# containment/schema/hierarchy/repository/artifacts, then inject only bounded fields.
```

### Scientific authority

```text
Wrong: worker appends events, accepts its Proposal, advances the Quest, and commits.
Correct: worker returns Result + pending Proposal; root reviews and records explicitly.
```

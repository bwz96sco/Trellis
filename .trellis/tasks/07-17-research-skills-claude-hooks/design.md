# Design — Research skills and Claude hooks

## Boundaries

```text
tracked research ledger/projections
  -> compact read-only hook orientation
  -> session runtime watermark (best effort)

tracked dispatch request
  + runtime repository binding/locator resolution
  -> ephemeral Claude Agent prompt injection
  -> bounded child-repository work
  -> Result + Proposal returned to root
  -> explicit root record/apply/reject commands
```

Hooks and skills coordinate work. They do not become research authority.

## Installed artifacts

### Stage-owner bundled skills

Create nine independent `SKILL.md` files under `packages/cli/src/templates/common/bundled-skills/`. Existing recursive discovery installs them on all platforms without new conditional configurator logic.

Each skill follows one compact shape:

1. Exact trigger/stage ownership.
2. Inputs: Quest projection plus dispatch-provided bounded context/artifact pointers.
3. Stage-specific work and artifact expectations.
4. Result observations.
5. Proposal operations allowed by current core schema.
6. Authority and write boundaries.

Stage map:

| Quest stage | Owner skill | Stage output focus |
|---|---|---|
| `setup` | `trellis-research-setup` | repository/source registration plan and workspace readiness |
| `framing` | `trellis-research-quest` | precise question, scope, decision target, stopping criteria |
| `literature` | `trellis-research-literature` | source-backed literature evidence and gaps |
| `ideation` | `trellis-research-ideation` | candidate explanations/hypotheses and discriminating tests |
| `experiment` | `trellis-research-experiment` | protocol/run artifacts, observations, failure evidence |
| `computation` | `trellis-research-computation` | reproducible code/data outputs and metrics |
| `theory` | `trellis-research-theory` | derivations, assumptions, proofs/counterexamples |
| `audit` | `trellis-research-audit` | provenance/reproducibility/claim-evidence checks |
| `writing` | `trellis-research-writing` | manuscript/notes synthesis tied to accepted Evidence/Claims |

No shared mega-skill. Repeated authority wording stays short; worker execution detail lives in canonical worker card.

### Worker cards

Add:

```text
packages/cli/src/templates/trellis/agents/research.md
packages/cli/src/templates/claude/agents/trellis-research-worker.md
```

`research.md` is platform-neutral canonical contract, exported by `getAllAgents()` beside implement/check. Claude wrapper mirrors role and fallback-loading behavior for direct Claude Agent dispatch. Existing `trellis-research.md` remains the code/search persistence agent.

Worker final payload is one JSON object compatible with `record-result` input:

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

Optional Result fields follow core schema. Proposal operations are limited to current typed core operations. Empty operations are valid when no authoritative change is justified.

## Shared research hook helpers

Keep research parsing in hook templates; do not add runtime dependencies or invoke CLI subprocesses on every prompt.

### Workflow selection

A helper reads `.trellis/.workflow.json` strictly enough for hook routing:

```json
{"schemaVersion":1,"id":"research","source":"bundled"}
```

Results: `research`, `other/missing`, or `invalid`. Invalid selected metadata yields compact validation warning at SessionStart; it never silently selects native/research.

### Research ledger head

Read `.trellis/research/events.jsonl` line by line:

- missing/empty -> head `0` when research is selected but not initialized;
- every non-empty line must be valid JSON object with integer contiguous `seq` starting at 1;
- malformed line/gap -> invalid; never skip;
- final sequence is ledger head.

This duplicates only minimal strict read behavior needed by hooks. It does not reduce state or accept mutations.

### Session runtime watermark

Reserved field:

```json
{"research_last_seen_seq": 42}
```

Location remains existing `.trellis/.runtime/sessions/<context-key>.json`. Use `common.active_task.resolve_context_key` for identity. Update contract:

1. Missing context key -> no write.
2. Missing file -> create object containing watermark.
3. Existing valid JSON object -> clone and replace only watermark.
4. Existing malformed/non-object JSON -> preserve file; skip write.
5. Same-directory unique temp file + `os.replace`.
6. Best-effort cleanup on failure.

Unknown keys, `current_task`, `current_run`, platform data, false/zero/empty values all survive.

## SessionStart research orientation

`session-start.py` keeps current output blocks and adds `<research-state>` only when either:

- bundled research workflow is selected; or
- `.trellis/research/events.jsonl` exists.

Read only compact projections:

- ledger for head;
- `.trellis/research/quests/*/quest.json` for active Quest summaries;
- `.trellis/research/proposals/*` is not a projection path, so pending count comes from compact event payloads only if safely available, or from `.trellis/research/dispatches/*/proposal.json` files parsed as small records. Use dispatch proposal files to avoid reducing full ledger.

Quest selection:

- zero active -> `Current Quest: none`;
- one active -> ID/title/stage/owner;
- multiple active -> select most recently updated projection deterministically for compact orientation and report total active count so selection is not presented as unique.

Schema V1 has no explicit blocker/next-action fields. Output:

```text
Blocker: not represented in research schema v1.
Next action: run `trellis research status --json`; follow current stage owner.
```

Pointers remain repository-relative. No artifact body injection.

After valid head read, write session watermark. Projection/read failure emits:

```text
Warning: research state invalid; run `trellis research validate --json`.
```

No malformed runtime file overwrite.

## UserPromptSubmit sequence branch

`inject-workflow-state.py` branches before native Task breadcrumb construction only when:

```text
platform == claude AND workflow selection == bundled research
```

Behavior:

| State | Output | Watermark |
|---|---|---|
| valid head == stored integer | none | unchanged |
| valid head != stored/missing | one `<research-state-changed>` pointer | atomically set head |
| no session identity | none | none |
| malformed session JSON | none | preserve |
| malformed workflow selection/ledger | compact validation pointer | unchanged |
| non-Claude or non-research | existing breadcrumb path | unchanged |

SessionStart normally seeds watermark, so first prompt stays silent. External CLI/other-session mutations advance ledger -> next prompt emits one pointer, then silence resumes.

## Claude explicit dispatch injection

### Root resolution

For Claude dispatch branch, candidate starts are checked in this order:

1. `CLAUDE_PROJECT_DIR`;
2. hook input `cwd`;
3. process cwd.

Walk upward for a directory containing `.trellis`. Prefer a research control plane (`research/events.jsonl` or bundled research selection) over nearest `.git`. Native Task fallback retains existing Git-root behavior when no explicit research pointer is present.

### Pointer grammar

Only first line is recognized:

```regex
^Research dispatch: (\.trellis/research/dispatches/(dsp_[0-9a-f-]+)/request\.json)$
```

Then apply full prefixed-UUID validation. Resolve against control root and require canonical containment under:

```text
<root>/.trellis/research/dispatches/<same-id>/request.json
```

Prompts already containing `<!-- trellis-hook-injected -->` exit unchanged to prevent duplicate injection.

### Request validation

Manual zero-dependency Python validator mirrors core dispatch schema for fields used by worker injection:

- exact allowed/required keys;
- prefixed UUID IDs;
- non-empty owner/objective strings;
- arrays of strings for criteria/writes/outputs/checks;
- context entries contain exactly one of `text` or `artifact`;
- artifact refs use portable paths and matching registered repository IDs;
- optional `taskRef` is portable;
- request `id` equals path dispatch ID;
- owner skill is one of nine mapped owners;
- Quest projection exists, matches request Quest ID, is active, and stage maps to owner skill;
- Campaign/Run/Repository references agree with available projections/registry when present.

### Repository resolution

Read tracked `repositories.json` projection and locate request repository. Resolution:

1. valid absolute runtime binding from `.trellis/.runtime/research/repo-bindings.json`;
2. tracked POSIX locator resolved from control root.

Canonicalize with `resolve(strict=True)`, require directory, and optionally verify expected Git remote only if simple local `git config --get remote.origin.url` succeeds. Do not scan filesystem. Do not write observation cache from hook.

### Injected prompt

Injected prompt starts with marker and contains only:

- control-root pointer (repository-relative where possible);
- dispatch/Quest/Campaign/Run IDs;
- owner skill name;
- absolute ephemeral target repo path;
- objective and acceptance criteria;
- bounded context entries (text inline; artifact path resolved and containment-checked, body not loaded);
- allowed write paths resolved as target-relative boundaries;
- expected outputs and checks;
- optional `Active task:` line;
- worker Result + Proposal schema and authority constraints;
- original prompt after dispatch pointer.

The worker may read declared artifact pointers. Hook never inlines their contents.

### Invalid dispatch behavior

An explicit but invalid pointer is not treated as normal Task dispatch. Hook returns an allowed updated prompt with marker:

```text
# Research Dispatch Validation Failed
Do not modify files or run the requested work.
Report this validation error to the root session: <reason>
```

This avoids dependence on host-specific denial schema while preventing silent unbounded fallback.

## Compatibility

- Native/custom workflows: current SessionStart and UserPromptSubmit output unchanged except initialized research control planes gain compact SessionStart orientation by requirement.
- Non-Claude platforms: no automatic research dispatch or sequence branch.
- Existing Task agents: same parser, context order, marker, and fallback.
- Existing `trellis-research` agent: unchanged.
- OpenCode plugin: unchanged in V1.
- Bundled skill discovery: no configurator changes expected.

## Rollback

- Remove research-specific branches from shared Python hooks; CLI/manual research workflow remains usable.
- Remove new skill/card templates; canonical ledger and dispatch artifacts remain readable.
- Runtime `research_last_seen_seq` is additive unknown metadata and harmless to older versions.
- Never delete `.trellis/research` or session files during rollback.

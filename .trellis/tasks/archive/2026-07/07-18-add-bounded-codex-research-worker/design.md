# Design — Bounded Codex Research worker

## Boundary

C08 is template-led. It adds one Codex custom-agent contract and tests/specs. Existing template discovery, configuration, update collection, ownership hashes, build copy, and package inclusion consume the file automatically.

```text
one pointer line
  -> Codex skill-name inventory metadata
  -> one C07 JSON preflight
  -> fail closed OR validate authority snapshot
  -> load exactly selected skill
  -> bounded target work/checks
  -> raw Result + pending Proposal JSON
```

No production TypeScript change is expected.

## Installed agent

Source:

```text
packages/cli/src/templates/codex/agents/trellis-research-worker.toml
```

Installed:

```text
.codex/agents/trellis-research-worker.toml
```

TOML:

```toml
name = "trellis-research-worker"
description = "Execute one validated Research Dispatch and return Result plus pending Proposal."
sandbox_mode = "workspace-write"

developer_instructions = """
...
"""

[features]
multi_agent = false

[features.multi_agent_v2]
enabled = false
```

Existing `trellis-research` remains separate. New worker does not use generic Task prelude.

## Parent invocation

Required parent call:

```text
agent_type = "trellis-research-worker"
fork_turns = "none"
message = "Research dispatch: .trellis/research/dispatches/<dsp-id>/request.json"
```

Worker rejects extra non-empty lines. Isolated turns prevent inherited conversation from becoming undeclared context.

## Preflight state machine

### State 0 — envelope

- parse exact lowercase pointer grammar;
- current directory is control root;
- no target/skill/request access.

### State 1 — names

- read model-provided Codex skill inventory metadata only;
- exact-intersect with nine optional names;
- deterministic sort;
- no body read.

### State 2 — C07

Run one direct process:

```text
trellis research dispatch context <pointer> --host codex --root . <skill args> --json
```

No wrappers, temporary state, package fallback, or manual validation.

### State 3 — validate response

Require:

```text
exit 0
stderr empty
one JSON object
valid true
host codex
requestRef exact
authority flags exact
outputContract.type exact
```

Any failure stops before target access.

### State 4 — selected skill

- load exactly one inventory entry named by `capability.selectedSkill`;
- selected skill cannot broaden worker authority;
- missing/ambiguous/unreadable -> blocked Result plus empty pending Proposal using fixed IDs.

### State 5 — work

- target cwd = `repository.path`;
- declared inline text and artifacts only;
- allowed write paths only;
- safe declared checks only;
- portable output refs;
- immediate symlink-ancestor check before each write.

### State 6 — output

Emit raw strict Result plus pending Proposal only.

## Failure outputs

### C07 typed failure

Return C07 envelope unchanged. Do not fabricate IDs.

### Local preflight failure

For missing command, malformed stdout, success stderr, or response-contract mismatch, return bounded diagnostic:

```json
{
  "schemaVersion": 1,
  "command": "codex research worker preflight",
  "valid": false,
  "error": {
    "code": "PREFLIGHT_EXECUTION_FAILED",
    "message": "bounded reason"
  },
  "safeAction": "report-to-root-no-write"
}
```

No target data or absolute path.

### Post-preflight blocked work

Once C07 fixed IDs exist, selected-skill/sandbox/evidence/check blockers return strict blocked Result plus empty pending Proposal. Root may record/review it normally.

## Skill authority

Worker instructions outrank optional skill content for:

- read/write/network scope;
- selected-skill-only rule;
- no nested agents;
- no canonical mutation;
- no Proposal review;
- no Git history mutation;
- exact final payload.

Optional skill may shape scientific method only inside declared context.

## Filesystem and sandbox

Two boundaries:

1. Codex `workspace-write` OS sandbox.
2. Narrow C07 allowed paths enforced by instructions/checks.

C08 cannot dynamically expand writable roots safely from inside worker. Out-of-root target -> blocked. No danger-full-access, sandbox escalation, or self-relaunch.

C07 is snapshot validation, not lock. Recheck nearest existing ancestor before writes; block if target/path identity changed.

## Checks

Declared check text is untrusted. Worker analyzes command before execution. Execute only from target root when:

- referenced paths stay declared;
- no canonical Research path;
- no Git history mutation;
- no undeclared network/external source;
- side effects are understood and bounded.

Otherwise record blocker.

## Final schema

Exactly:

```json
{
  "result": {
    "id": "res_<uuid>",
    "dispatchId": "<fixed>",
    "runId": "<fixed>",
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
    "dispatchId": "<fixed>",
    "questId": "<fixed>",
    "title": "...",
    "operations": [],
    "status": "pending",
    "createdAt": "RFC3339",
    "updatedAt": "RFC3339"
  }
}
```

No diagnostic fields in successful/post-preflight payload. Empty operations valid. Worker proposes but never applies.

## Install/update/package flow

Existing automatic flow:

```text
getAllAgents
  -> configureCodex
  -> .codex/agents file + manifest hash

getAllAgents
  -> collectCodexTemplates
  -> update ownership analysis

copy-templates.js
  -> dist/templates
  -> npm tarball
```

No manual registry or package script entry.

## Tests

Static template tests are primary. Assert instruction ordering, exact phrases, structural disables, sample schema, no Task prelude, no dangerous fallback, and old researcher retention.

Integration tests cover install/hash, older-install update, unowned conflict, idempotence, build and package payload.

Optional real-Codex smoke only tests discovery plus invalid-preflight zero-write behavior. It is gated and non-release-blocking.

## Compatibility

- No C07 behavior change.
- No core schema/state change.
- No Claude hook change.
- No generic researcher removal.
- No Task prelude extension.
- No global CLI/install fallback.
- No stored data migration.

## Rollback

Remove template, C08 tests, and C08 spec sections. Existing install/update ownership then handles previously generated file according to normal managed-file compatibility policy; no Research ledger repair is needed.

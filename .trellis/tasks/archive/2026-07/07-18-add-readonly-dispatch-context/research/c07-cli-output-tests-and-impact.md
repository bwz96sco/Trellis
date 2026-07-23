# Research: C07 CLI, Output, Tests, and Impact

- **Scope**: C07 planning
- **Date**: 2026-07-20

## Command contract

Approved input shape resolves earlier report disagreement:

```text
trellis research dispatch context <request-file> \
  --host claude|codex \
  [--skill-name <canonical-name>...] \
  [--root <path>] \
  --json
```

`<request-file>` is required. It must be the exact portable tracked path:

```text
.trellis/research/dispatches/<dsp-id>/request.json
```

An arbitrary JSON path, absolute path, backslash path, traversal path, or mismatched Dispatch directory is invalid.

`--skill-name` is repeatable caller-supplied discovery metadata. Omission means no optional external skill was discovered, so C06 selects bundled fallback. C07 does not scan global/project skill directories, read skill files, inspect bodies/frontmatter, or invent aliases. Host adapter owns discovery; C07 accepts names only.

## Commander conventions

Current Research CLI registration lives in `registerResearchCommand`.

- Parent group already exists: `research command("dispatch")`.
- Read-only commands use `addOutputOptions` for `--root` and `--json`.
- Repeatable strings use `collectString`.
- Actions use `runAction(options.json, () => operation(...))`.
- Operation functions return structured results and throw typed errors.
- `runAction` sets `process.exitCode = 1` on failure; it does not terminate process directly.

Host and skill validation should occur inside context operation, not Commander value parsers. This keeps invalid host/name failures inside machine JSON error handling.

## Skill discovery decision

Available project-local roots exist:

```text
Claude: .claude/skills/<name>/SKILL.md
Codex:  .agents/skills/<name>/SKILL.md
        .codex/skills/<name>/SKILL.md
```

No current runtime registry covers global host skill roots. Automatic scanning would create incomplete host-specific authority and risk reading private installations.

C07 therefore uses explicit repeated canonical names:

```text
--skill-name research-literature
```

Boundary:

- trim surrounding whitespace;
- drop empty values;
- exact dedupe;
- canonical slug only;
- case-sensitive;
- reject slash, backslash, `$`, plugin namespace, path, alias, and body-like input;
- pass names to C06 resolver only.

## Success JSON

Success emits exactly one pretty JSON document on stdout and exits zero.

Required bounded shape:

```json
{
  "schemaVersion": 1,
  "command": "research dispatch context",
  "valid": true,
  "host": "codex",
  "ledgerHead": 42,
  "requestRef": ".trellis/research/dispatches/dsp_<uuid>/request.json",
  "dispatch": {
    "id": "dsp_<uuid>",
    "questId": "qst_<uuid>",
    "campaignId": "cmp_<uuid>",
    "runId": "run_<uuid>",
    "repositoryId": "rep_<uuid>",
    "declaredOwnerSkill": "schema-v1-value",
    "providerHint": null,
    "taskRef": null,
    "createdAt": "RFC3339"
  },
  "capability": {
    "stage": "literature",
    "capability": "research.literature",
    "optionalSkill": "research-literature",
    "fallbackSkill": "trellis-research-literature",
    "selectedSkill": "research-literature",
    "source": "host"
  },
  "warnings": [],
  "repository": {
    "id": "rep_<uuid>",
    "name": "code",
    "kind": "code",
    "path": "/absolute/canonical/target",
    "gitRoot": "/absolute/canonical/git-root-or-null",
    "revision": "git-head-or-null",
    "resolutionSource": "binding|locator",
    "remoteVerified": true
  },
  "work": {
    "objective": "bounded objective",
    "acceptanceCriteria": ["criterion"],
    "context": [
      {"type": "text", "text": "declared text"},
      {
        "type": "artifact",
        "artifact": {
          "id": "art_<uuid>",
          "repositoryId": "rep_<uuid>",
          "path": "inputs/source.txt",
          "kind": null,
          "revision": null,
          "sha256": null,
          "mediaType": "text/plain"
        },
        "resolvedPath": "/absolute/canonical/target/inputs/source.txt",
        "contentIncluded": false
      }
    ],
    "allowedWritePaths": [
      {
        "path": "outputs/report.json",
        "resolvedPath": "/absolute/canonical/target/outputs/report.json"
      }
    ],
    "expectedOutputs": ["Deterministic report"],
    "checks": ["test -f outputs/report.json"]
  },
  "authority": {
    "readScope": "declared-context-only",
    "writeScope": "allowed-write-paths-only",
    "canonicalResearchMutation": false,
    "proposalReview": false,
    "gitHistoryMutation": false,
    "recordResult": false
  },
  "outputContract": {
    "type": "result-plus-pending-proposal",
    "result": {
      "dispatchId": "dsp_<uuid>",
      "runId": "run_<uuid>"
    },
    "proposal": {
      "dispatchId": "dsp_<uuid>",
      "questId": "qst_<uuid>",
      "status": "pending"
    }
  }
}
```

No artifact body, observation cache, dirty summary, arbitrary projection object, Task body, skill body, or remote credential string is emitted.

## Warning contract

Compatibility metadata never routes execution. Bounded warnings may include:

```text
LEGACY_OWNER_SKILL_IGNORED
OWNER_SKILL_STAGE_MISMATCH
PROVIDER_HINT_MISMATCH
TASK_REF_IGNORED
```

Each warning has fixed code plus bounded message. Generic schema-v1 owner values remain readable and do not block otherwise valid preflight. Current Quest stage and requested host remain authority.

## Failure JSON and exit

For `--json`, typed C07 failures produce exactly one compact JSON document on stderr, empty stdout, and exit code 1:

```json
{
  "schemaVersion": 1,
  "command": "research dispatch context",
  "valid": false,
  "error": {
    "code": "INVALID_REQUEST_PATH",
    "message": "bounded reason"
  },
  "safeAction": "report-to-root-no-write"
}
```

Stable error codes:

```text
INVALID_HOST
INVALID_SKILL_NAME
INVALID_REQUEST_PATH
REQUEST_NOT_FOUND
INVALID_REQUEST
DISPATCH_NOT_FOUND
REQUEST_STATE_MISMATCH
DISPATCH_HIERARCHY_INVALID
QUEST_NOT_DISPATCHABLE
REPOSITORY_INVALID
ARTIFACT_INVALID
WRITE_SCOPE_INVALID
CONTEXT_LIMIT_EXCEEDED
```

Failure exposes no partial Repository, context, resolved path, artifact, or capability object.

Human mode may render one compact error line through existing Research error conventions.

## Likely production files

```text
packages/cli/src/commands/research/dispatch-context.ts    # new
packages/cli/src/commands/research/index.ts               # register command
packages/cli/src/commands/research/repository.ts          # additive zero-write resolver
packages/cli/src/commands/research/errors.ts              # typed context error
packages/cli/src/commands/research/common.ts              # specialized JSON error rendering if needed
```

Consume unchanged:

```text
packages/core/src/research/store.ts
packages/core/src/research/schema.ts
packages/core/src/research/stage-capabilities.ts
packages/cli/src/commands/research/dispatch-command.ts
packages/cli/src/templates/shared-hooks/inject-subagent-context.py
```

## Test targets

New focused suite:

```text
packages/cli/test/commands/research-dispatch-context.integration.test.ts
```

Update:

```text
packages/cli/test/commands/research.test.ts
```

Reuse fixtures/scenarios from:

```text
packages/cli/test/commands/research-dispatch.integration.test.ts
packages/cli/test/commands/research-dispatch-compatibility.test.ts
packages/cli/test/fixtures/research-dispatch-schema-v1/request.json
```

Do not change Claude hook behavior/tests until C09, except adding shared fixture data with no behavior change if needed.

## Required test matrix

- exact relative request path accepted;
- absolute/traversal/backslash/noncanonical path rejected;
- path ID/request ID/canonical Dispatch mismatch rejected;
- tracked request semantic mismatch rejected;
- both hosts accepted; retired/installer/case variants rejected;
- exact optional skill selected; omission/case/adornment selects fallback or rejects at CLI boundary as specified;
- inactive/terminal/complete Quest rejected;
- Run/Campaign/Quest/Repository hierarchy mismatch rejected;
- schema-v1 arbitrary owner/provider/taskRef remains readable and warning-only;
- binding precedence and locator fallback;
- malformed unused observation cache ignored;
- missing target and exact remote mismatch rejected;
- artifact wrong repository, missing file, directory, escape, symlink escape, digest mismatch, or HEAD revision mismatch rejected;
- text/context/list bounds enforced;
- allowed write path canonical containment, including existing symlink-parent escape;
- `expectedOutputs` remain text, not path-resolved;
- checks never execute;
- artifact bytes never appear in output;
- exact success JSON and warning order deterministic;
- exact error JSON, empty stdout, exit 1;
- successful and failed calls leave control root and target tree byte-identical, create no runtime dir/lock/observation/manifest/session/tracked file;
- repeated call yields identical output for unchanged state.

## GitNexus impact

Current indexed results:

| Symbol | Risk |
|---|---|
| `registerResearchCommand` | LOW |
| `renderExtendedResearchResult` | LOW |
| `runAction` | LOW |
| `renderResearchError` | LOW |
| `readBindings` | LOW |
| `observeRepository` | LOW |
| `dispatchPaths` | LOW |
| `verifyArtifact` | LOW |
| `getManagedPaths` | LOW |
| `resolveRepositoryForUse` | MEDIUM; avoid editing |
| `readResearchState` | shared-sensitive; reports vary MEDIUM/HIGH by index view; consume unchanged |
| `resolveResearchRoot` | HIGH; consume unchanged |

No CRITICAL C07 symbol was identified. Whole-worktree change detection may still report inherited CRITICAL scope because C01-C06 and unrelated dirty files remain present; child review must isolate C07 diff manually.

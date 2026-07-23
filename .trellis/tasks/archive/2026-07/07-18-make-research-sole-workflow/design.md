# Design — Research as sole fresh workflow

## Boundary

C05 changes fresh initialization and safe workflow migration. It does not remove the still-registered workflow, Channel, or Mem products.

```text
fresh init
  -> bundled Research workflow only
  -> Research bundled selection + managed hash
  -> minimal bridge layout
  -> Claude/Codex host assets

existing installation update
  -> classify active workflow ownership
  -> migrate only proven pristine native
  -> preserve modified/custom/invalid
  -> transfer metadata only after successful Research write

C10 later
  -> remove workflow/Channel/Mem commands
  -> delete generic source inventory and Task-linked products
```

## Fresh layout contract

Fresh init writes:

- required `.trellis/scripts/**` bridge runtime;
- bundled Research `.trellis/workflow.md`;
- strict bundled Research `.trellis/.workflow.json`;
- managed hashes/version;
- `.trellis/.gitignore` and `.trellis/config.yaml`;
- root `AGENTS.md`;
- selected Claude Code and/or Codex assets, including Research worker contracts and stage skills.

Fresh init does not write:

- `.trellis/agents/**`;
- `.trellis/workspace/**`;
- `.trellis/tasks/**`;
- `.trellis/spec/**`;
- `.trellis/.developer` or developer journals;
- bootstrap/joiner Tasks.

Canonical `.trellis/research/**` remains lazy. `trellis research init` owns workspace naming and first ledger mutation.

Implement via explicit Research layout mode in `createWorkflowStructure()` plus matching gates around developer/bootstrap/joiner initialization. Do not delete generic source templates required until C10.

## CLI contract

Current init host/template options remain, except workflow selection:

```text
remove: --workflow <id>
remove: --workflow-source <source>
```

Removed options are unregistered Commander flags and fail before action/filesystem writes.

Internal init always resolves bundled Research for fresh/full initialization. Normal existing-project re-init remains host-addition-only and must not claim or replace workflow bytes.

## Compatibility resolver

Keep `native` and `research` as readable bundled IDs during bridge release. Native remains needed for:

- old `.workflow.json` parsing;
- pristine-native classification;
- still-active `trellis workflow` command until C10.

Fresh init never selects native or marketplace content. Marketplace/custom resolution remains only for workflow command compatibility.

## Ownership classifier

Inputs:

```ts
interface WorkflowMigrationEvidence {
  selection: "research" | "native" | "missing" | "invalid";
  currentBytes: string | null;
  storedHash?: string;
  installedVersion?: string;
  pathKind: "regular" | "missing" | "unsafe";
}
```

Outputs:

```ts
type WorkflowMigrationClass =
  | "current-research"
  | "pristine-research"
  | "pristine-native"
  | "modified-managed"
  | "custom-user-owned"
  | "invalid-metadata"
  | "missing-or-unsafe";
```

Proof of pristine native requires one bounded condition:

- valid native selection plus matching managed hash;
- valid native selection plus exact current bundled native bytes;
- missing selection plus exact current bundled native bytes;
- missing selection plus matching managed hash and installed version before workflow switching (`0.6.0-beta.17`).

Invalid metadata blocks inference. Unknown newer matching-hash content without variant metadata remains user-owned.

## Update apply flow

```text
read selection + manifest + version + workflow bytes
  -> classify without writes
  -> build desired Research template only for proven managed cases
  -> render plan/warnings
  -> dry-run/cancel exit
  -> backup excluding .trellis/research
  -> re-read workflow before write
  -> conflict action
  -> atomically write Research when accepted
  -> verify active Research bytes
  -> refresh workflow hash
  -> atomically save Research selection
```

Metadata transfer is post-success only:

| Outcome | Selection/hash result |
|---|---|
| Successful migration/overwrite | Research selection + Research hash |
| Metadata repair on active Research | Research selection + valid hash |
| Skip | unchanged |
| Create `.new` | unchanged |
| Concurrent modification | unchanged |
| Write failure | no ownership transfer |

## Runtime consistency

Claude SessionStart and workflow-state hooks inspect strict Research selection. Successful migration therefore must align workflow bytes, hash, and `.workflow.json`. Replacing only `workflow.md` is invalid.

## Validation matrix

| State | Result |
|---|---|
| Fresh init | Research bytes/selection/hash; minimal layout |
| Fresh Claude/Codex/both | Same Research workflow; host assets differ only by selection |
| Removed workflow flag | Unknown option; zero writes |
| Normal host-addition re-init with custom workflow | Add host only; preserve workflow ownership |
| Proven pristine native | Migrate to Research after normal update gates |
| Modified native | Conflict policy; no pre-transfer |
| Missing metadata + exact native | Migrate |
| Missing metadata + newer ambiguous matching hash | Preserve |
| Invalid metadata | Warn/preserve |
| Custom workflow | Preserve/no marketplace fetch during update |
| Skip/create-new/failure | Active metadata unchanged |
| Successful migration rerun | No-op/no backup churn |
| Any migration | `.trellis/research/**` byte-identical |

## Rollback

Restore workflow bytes, selection, hashes, and version from one consistent backup snapshot. Never restore only one component. Never include canonical Research state in workflow backup/rollback.

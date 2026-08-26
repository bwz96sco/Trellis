# C1 Contract and Baseline Design

## Boundary

C1 produces immutable evidence and executable contracts. Runtime behavior remains unchanged.

```text
mutable source worktree
  -> exact approved inventory
  -> copied baseline bytes + deterministic manifest
  -> executable Research code-specs
  -> C2–C6 consume only frozen boundary
```

## Source Snapshot

Store reviewable bytes under:

```text
research/source-baseline/files/<source-relative-path>
research/source-baseline/manifest.json
research/source-baseline/README.md
```

`manifest.json` contract:

```json
{
  "schemaVersion": 1,
  "sourceRepository": "/absolute/source/path",
  "branch": "branch-name",
  "baseCommit": "40-hex",
  "capturedAt": "RFC3339",
  "selectionReason": "thin-skill-pilot",
  "files": [
    {
      "path": "skills/research-literature/SKILL.md",
      "gitState": "tracked-clean|tracked-modified|untracked",
      "mode": "100644",
      "size": 1234,
      "sha256": "64-hex",
      "role": "instruction|host-projection|reference|template|validator|helper"
    }
  ],
  "relevantExcludedPaths": [
    {"path": "...", "reason": "..."}
  ]
}
```

Rules:

- paths are unique, normalized, source-relative, and sorted;
- copied file digest, size, and mode must match manifest;
- no symlink or directory member;
- source branch/base commit and relevant dirty state are recorded separately;
- generated manifest never claims copied bytes came from base commit when they came from working-tree overlay;
- later children resolve source bytes from this task directory only.

## Normalized Execution-Package Contract

Historical Procedure schemas remain accepted as historical variants. Resolver normalizes all variants to:

```ts
interface ResolvedExecutionPackageIdentity {
  id: string;
  version: string;
  schemaVersion: number;
  packageKind: "procedure" | "skill";
  packageDigest: `sha256:${string}`;
  instructionDigest: `sha256:${string}`;
  memberInventoryDigest: `sha256:${string}`;
}
```

New thin-skill manifest adds:

```ts
invocationSource: "model" | "operator-explicit";
entrypointType: "model-context" | "root-command";
allowedProfiles: Array<"lightweight" | "managed">;
```

Decision: new managed schema-v3 Activation records use an additive normalized `executionPackage` identity object. Legacy Procedure fields remain required/readable for historical events; new readers normalize both forms. This avoids pretending a thin `SKILL.md` is a historical `PROCEDURE.md` while preserving one resolver and replay path.

## Workflow Contracts

Pilot workflow definition is immutable DAG metadata. Canonical progress uses explicit instance events:

```ts
workflow.bind(instance, quest, workflowId, workflowVersion, workflowDigest, startNode)
workflow.node.complete(instance, node, executionPackage, profile, acceptedRefs)
workflow.transition.record(instance, transitionId, from, to, actor, gateRefs)
workflow.close(instance, outcome, actor, rationale)
```

Projection invariant:

- at most one active instance per Quest;
- current node comes from bind/transition events;
- source node must be completed before transition;
- transition must be legal and operator-selected;
- gate refs must already exist;
- no event executes a model or next node.

## Scientific Gate Contract

Canonical gate event contains exact Quest, workflow instance/version, node, gate ID, decision, actor, rationale, approved/rejected refs, evidence refs, and timestamp.

Gate validator checks structure and set containment only. It cannot judge novelty, feasibility, or scientific truth. Operational Approval cannot satisfy H1/H2.

## Quest Mapping Contract

Code-spec mapping table is authoritative. Import design adds canonical route/import state beside existing Quest where existing fields are too coarse.

Primary mappings:

- title/objective/status/stage -> Quest;
- first-read and authoritative artifacts -> ArtifactRef plus owner bindings;
- claims -> Claim plus preserved source extensions;
- branches/open questions/current decision/next action/blockers/legacy board -> Quest route projection;
- reviewed JSONL milestones -> imported milestone events;
- source IDs/schema/extensions/digest -> import record.

Blocking conflicts produce preview diagnostics and prevent write. Unknown non-authoritative extensions remain preserved but never drive routing.

## Single-Writer Contract

Committed authority projection is source admin's pre-write guard:

```json
{
  "questId": "qst_...",
  "writer": "trellis|source",
  "sourceSnapshotDigest": "sha256:...",
  "recordedEventId": "evt_..."
}
```

When `writer=trellis`, source mutating operations fail before opening files for write. Read-only status/validation remain allowed. Rollback requires verified export, operator transfer event, and projection update before source writes resume.

## Code-Spec Targets

- `.trellis/spec/core/backend/research-state.md`
- `.trellis/spec/cli/backend/commands-research.md`
- `.trellis/spec/cli/backend/research-worker-hooks.md`
- `.trellis/spec/cli/backend/platform-integration.md` only if host parity contract needs clarification
- `.trellis/spec/cli/unit-test/conventions.md` only for concrete cross-repository fixture rules

No runtime symbol changes occur in C1.

## Rollback

Before commit: delete only C1-owned snapshot/spec edits.

After commit: later children may be abandoned without deleting C1 evidence. A new source baseline requires a new forward task/version; never mutate the frozen snapshot in place.

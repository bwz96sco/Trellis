# Design — Managed research workflow

## Ownership model

```text
bundled registry (native | research)
  -> init/workflow writes active workflow
  -> managed hash + bundled selection metadata
  -> update resolves selected bundled bytes
  -> existing hash conflict policy protects local edits

marketplace/custom
  -> active workflow bytes
  -> no workflow hash
  -> no bundled selection metadata
  -> update does not manage or fetch workflow
```

Workflow identity and ownership stay CLI-local. Core research state is unaffected.

## Bundled registry

Generalize `workflow-resolver.ts` from native-only helpers to a small registry:

```ts
export const NATIVE_WORKFLOW_ID = "native";
export const RESEARCH_WORKFLOW_ID = "research";

interface BundledWorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  path: string;
  content: string;
}
```

Registry entries return existing public resolver shapes with `source: "bundled"`. `listWorkflowTemplates` emits bundled entries first and de-duplicates marketplace collisions.

Resolution precedence:

1. `native` always resolves bundled, preserving current invariant.
2. No explicit source: known bundled ID resolves bundled; other IDs use default marketplace.
3. Explicit source: non-native ID resolves from explicit source, including `research` collision.

Ownership checks use `resolved.source === "bundled"`, never `id === "native"`.

## Selection metadata

New utility: `packages/cli/src/utils/workflow-selection.ts`.

Tracked path:

```text
.trellis/.workflow.json
```

Strict payload:

```ts
interface BundledWorkflowSelection {
  schemaVersion: 1;
  id: "native" | "research";
  source: "bundled";
}
```

Read result keeps missing distinct from invalid:

```ts
type WorkflowSelectionResult =
  | { kind: "missing" }
  | { kind: "bundled"; id: BundledWorkflowId }
  | { kind: "invalid"; reason: string };
```

Helpers:

```ts
loadWorkflowSelection(cwd: string): WorkflowSelectionResult;
saveBundledWorkflowSelection(cwd: string, id: BundledWorkflowId): void;
clearWorkflowSelection(cwd: string): void;
```

- Save ensures parent dir and calls `writeFileAtomic` with stable two-space JSON plus trailing newline.
- Clear removes only this known metadata file; missing is no-op.
- Invalid file is never auto-deleted or rewritten by update.
- Add `.trellis/.workflow.json` to template-hash exclusion.

## Init flow

1. Normalize requested ID, default native.
2. Resolve workflow through registry/marketplace resolver.
3. Feed resolved content through existing `workflowMdOverride` seam when needed.
4. Complete existing init and hash initialization.
5. If bundled: retain/refresh workflow hash and atomically save selection.
6. If marketplace/custom: remove workflow hash and clear selection.

Metadata write happens only after active workflow write succeeds. Init failures remain visible; no false success.

## Workflow switch flow

Keep existing classification and conflict behavior:

- identical;
- pristine managed file;
- modified file;
- force;
- interactive confirmation;
- create-new.

After successful active replacement:

```ts
if (template.source === "bundled") {
  update workflow hash;
  save bundled selection;
} else {
  remove workflow hash;
  clear bundled selection;
}
```

Identical active content may repair ownership metadata/hash only when selected template is explicitly applied. `--create-new` writes candidate only and does not change ownership.

## Update flow

Add selection-aware workflow collection before `analyzeChanges`:

- valid bundled -> desired registry content for selected ID.
- invalid -> warn and omit `.trellis/workflow.md` from desired map.
- missing -> run conservative legacy inference:
  1. If current workflow bytes equal bundled native, select native.
  2. Else if a stored workflow hash exists and matches current bytes, treat it as a legacy managed native install and select native.
  3. Otherwise omit workflow as unknown/user-owned.

Other templates remain collected normally. No marketplace fetch occurs in update.

A valid or safely inferred bundled workflow then uses unchanged hash classification:

- content equal desired -> unchanged;
- stored hash matches current -> auto-update to selected bundled bytes;
- missing/stale hash -> user-modified conflict.

Marketplace/custom init or switch removes the workflow hash and clears bundled metadata. Its bytes normally differ from native, so missing-selection inference classifies it as unknown/user-owned and omits it. No marketplace ID, URL, or source tombstone is persisted.

## Research workflow template

Store at:

```text
packages/cli/src/templates/trellis/workflows/research/workflow.md
```

Export through template index. Existing recursive copy script packages it.

Start from native structural grammar. Research content changes routing semantics while keeping parser tokens stable:

- Phase 1 Plan -> initialize/inspect research control plane, frame Quest, register repos.
- Phase 2 Execute -> select stage owner, prepare bounded dispatch, record Result + Proposal, review/apply.
- Phase 3 Finish -> validate/rebuild, update specs/artifacts, optional Task completion, no automatic Git commit.

Task remains optional bounded engineering work; research lifecycle remains Quest/Campaign/Run/Evidence/Claim.

## Failure and recovery

| Condition | Behavior |
|---|---|
| malformed selection JSON | return invalid; update warns and omits workflow |
| unknown bundled ID | invalid; never fallback native |
| selection save fails after workflow/hash write | command fails visibly; rerun same explicit selection repairs metadata |
| marketplace/custom with no metadata/hash | update omits workflow and performs no marketplace fetch |
| missing metadata with native bytes or matching managed hash | safely infer legacy native |
| missing metadata without native evidence | omit unknown/user-owned workflow |
| create-new | active workflow/hash/selection unchanged |
| locally modified bundled workflow | existing conflict policy |

No multi-file transaction exists across workflow, hash, and metadata. Ordering minimizes destructive ambiguity: write workflow -> apply hash contract -> write selection. Every step reports failure.

## Compatibility and rollback

- Remove research registry/template and metadata-aware branches to revert feature.
- Existing `.workflow.json` is harmless unknown tracked state to older Trellis versions but older `update` may still target native; docs should require current CLI for research workflow.
- Missing metadata uses safe native inference; unknown/user-owned bytes remain unmanaged.
- Never delete active workflow on rollback.
- Native remains init default.

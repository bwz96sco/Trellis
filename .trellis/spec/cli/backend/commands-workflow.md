# `trellis workflow` Command

`trellis workflow` lists and switches the project's active `.trellis/workflow.md`
template. It is the only command that deliberately replaces an existing
workflow variant in-place after init.

## Scenario: workflow marketplace templates and switcher

### 1. Scope / Trigger

Trigger: adding a user-facing command and init flags that change a runtime-parsed
template, marketplace lookup behavior, and `.trellis/.template-hashes.json`
ownership.

This spec applies when editing:

- `packages/cli/src/commands/workflow.ts`
- `packages/cli/src/utils/workflow-resolver.ts`
- `packages/cli/src/commands/init.ts` workflow-selection code
- `packages/cli/src/configurators/workflow.ts`
- `marketplace/workflows/**`
- workflow-related tests

### 2. Signatures

CLI signatures:

```text
trellis workflow
trellis workflow --list
trellis workflow --template <id>
trellis workflow --marketplace <source> --template <id>
trellis workflow --template <id> --force
trellis workflow --template <id> --create-new

trellis init --workflow <id>
trellis init --workflow-source <source> --workflow <id>
```

Resolver signatures:

```typescript
export const NATIVE_WORKFLOW_ID = "native";
export const RESEARCH_WORKFLOW_ID = "research";
export type BundledWorkflowId = "native" | "research";

export interface ResolvedWorkflowTemplate {
  id: string;
  type: "workflow";
  name: string;
  description?: string;
  path: string;
  content: string;
  source: "bundled" | "marketplace";
}

export interface WorkflowTemplateListing {
  id: string;
  type: "workflow";
  name: string;
  description?: string;
  path: string;
  source: "bundled" | "marketplace";
}

export function listWorkflowTemplates(options?: {
  source?: string;
}): Promise<{ templates: WorkflowTemplateListing[]; errorMessage?: string }>;

export function resolveWorkflowTemplate(
  id: string,
  options?: { source?: string },
): Promise<ResolvedWorkflowTemplate>;
```

Selection metadata signatures:

```typescript
type WorkflowSelectionResult =
  | { kind: "missing" }
  | { kind: "bundled"; id: BundledWorkflowId }
  | { kind: "invalid"; reason: string };

loadWorkflowSelection(cwd: string): WorkflowSelectionResult;
saveBundledWorkflowSelection(cwd: string, id: BundledWorkflowId): void;
clearWorkflowSelection(cwd: string): void;
```

Configurator signature:

```typescript
export interface WorkflowOptions {
  projectType: ProjectType;
  skipSpecTemplates?: boolean;
  packages?: DetectedPackage[];
  remoteSpecPackages?: Set<string>;
  workflowMdOverride?: string;
}
```

### 3. Contracts

Marketplace entries use `type: "workflow"` and point to one markdown file:

```json
{
  "id": "tdd",
  "type": "workflow",
  "name": "TDD Workflow",
  "description": "Trellis workflow variant that drives Phase 2 with one red / green / refactor behavior slice at a time",
  "path": "workflows/tdd/workflow.md",
  "tags": ["workflow", "tdd", "testing"]
}
```

Bundled workflows:

- `native` — default Plan / Execute / Finish workflow.
- `research` — offline managed research workflow.

Marketplace workflows such as `tdd` and
`channel-driven-subagent-dispatch` remain remote/user-owned.

Resolution contract:

1. `native` is reserved and always resolves bundled, even with an explicit source.
2. Without an explicit source, every known bundled id resolves offline.
3. With an explicit source, non-native ids (including `research`) resolve from
   that source.
4. Listings emit bundled entries first and de-duplicate marketplace id collisions.

Ownership contract:

- Bundled workflows are Trellis-managed. After writing one, refresh the
  `.trellis/workflow.md` hash and atomically persist `.trellis/.workflow.json`:
  `{ "schemaVersion": 1, "id": <bundled-id>, "source": "bundled" }`.
- Marketplace/custom workflows are user-managed. After writing one, remove the
  workflow hash and clear `.trellis/.workflow.json`.
- `.workflow.json` is durable state, not template content, and must be excluded
  from `.template-hashes.json`.
- `--create-new` changes neither active bytes, hash ownership, nor selection metadata.
- Do not persist marketplace URL/id or add a user-owned tombstone. Missing
  bundled metadata plus missing managed-hash evidence is enough for update to
  preserve unknown content.

Runtime parser contract:

- Every workflow template must keep `## Phase Index`, `## Phase 1: Plan`,
  `#### X.Y` step headings, platform marker syntax, and all required
  `[workflow-state:*]` blocks.
- SessionStart, per-turn workflow-state hooks, `trellis-start`, and
  `get_context.py --mode phase` read the current `.trellis/workflow.md`; do not
  duplicate variant-specific behavior in hook scripts or skills.

Native source-of-truth contract:

- `packages/cli/src/templates/trellis/workflow.md` is the source of truth for
  native workflow.
- If `marketplace/workflows/native/workflow.md` exists, tests must enforce byte
  identity with the bundled native template.

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| `trellis workflow --template <id>` and current workflow is modified | Exit 1 with guidance to use `--force` or `--create-new`; do not prompt, even on a TTY |
| Interactive `trellis workflow` picker and current workflow is modified | Prompt for overwrite, create-new, or skip |
| `--create-new` | Write a generated `workflow.md.new` file beside `.trellis/workflow.md`; do not change active workflow, hash file, or selection metadata |
| `--force` | Overwrite active workflow and apply bundled/user-owned ownership from `resolved.source` |
| Missing workflow id | Throw `WorkflowResolveError` / command error; CLI exits non-zero |
| Marketplace index fetch fails | List can still show both bundled workflows with warning; remote resolve fails with workflow-specific error |
| Workflow entry path is missing, not `.md`, absolute, or contains `..` | Fail with workflow-specific error |
| `init --workflow missing-id` | Reject; do not print and return success |
| `init --workflow research` | Write bundled research content, hash workflow.md, and save bundled selection |
| `init --workflow-source <source> --workflow research` | Resolve source collision as marketplace content, clear selection, and remove workflow hash |
| Malformed/unknown `.workflow.json` | Update warns, omits workflow.md from desired templates, and continues unrelated planning |
| Missing `.workflow.json` + native bytes or matching stored workflow hash | Infer legacy native management |
| Missing `.workflow.json` without native/hash evidence | Treat workflow as unknown/user-owned and omit it from update |
| `trellis update` after switching to marketplace/custom | Preserve active bytes and never fetch workflow marketplace content |

### 5. Good/Base/Bad Cases

- Good: `trellis workflow --template research` replaces pristine native,
  records bundled research selection, and later update targets current research
  bytes while protecting local edits.
- Base: `trellis init --workflow native` writes bundled native, hash-tracks it,
  and records native bundled selection.
- Good user-owned case: `trellis workflow --template tdd` removes both bundled
  ownership signals, so later update leaves TDD content out of its desired plan.
- Bad: determine ownership from `id !== "native"`. That misclassifies bundled
  research as user-owned and misclassifies an explicit-source `research`
  collision as bundled.

### 6. Tests Required

Unit tests:

- `resolveWorkflowTemplate("native")` and `("research")` return bundled content without fetch.
- Explicit-source `research` resolves marketplace while `native` stays bundled.
- Listing emits native/research first and de-duplicates marketplace collisions.
- Marketplace workflow resolution fetches `index.json` and one markdown file.
- Missing id errors mention workflow templates, not spec templates.
- Invalid / escaping workflow paths fail before fetch or file read.
- Selection loader distinguishes missing from invalid and rejects extra fields,
  wrong schema/source, malformed JSON, and unknown bundled ids.
- Selection save is atomic; template hash initialization excludes `.workflow.json`.

Integration tests:

- `init --workflow native` keeps workflow hash-tracked and records native selection.
- `init --workflow research` writes bundled research, hashes it, and records research selection.
- `init --workflow tdd` writes marketplace content and clears hash/selection.
- `init --workflow-source <source> --workflow research` writes source content as user-owned.
- `init --workflow-source <source> --workflow custom-id` writes custom content.
- `init --workflow missing-id` rejects.
- `trellis workflow --template research` records managed bundled ownership.
- `trellis workflow --template tdd` writes marketplace content and clears managed ownership.
- Applying byte-identical bundled content repairs missing hash/selection metadata.
- Explicit `--template` with modified workflow fails even when `stdin.isTTY` is
  true.
- `--create-new` writes a generated `workflow.md.new` file beside `.trellis/workflow.md` and does not touch active
  workflow, hash, or selection.
- Update is idempotent for selected research and updates pristine old research to current research.
- Modified selected research uses the existing conflict policy.
- Missing selection infers legacy native only from native bytes or matching hash evidence.
- Invalid selection and unknown/user-owned bytes are omitted from the desired workflow plan.
- Update after switching to marketplace/custom does not restore native or fetch workflow content.
- Marketplace native mirror matches bundled native workflow when the mirror file
  exists.
- Real `marketplace/workflows/tdd/workflow.md` planning breadcrumbs include the
  TDD gates: observable behavior slices, public interface under test, and mock
  boundaries.

Runtime parsing validation:

```bash
python3 ./.trellis/scripts/get_context.py --mode phase
python3 ./.trellis/scripts/get_context.py --mode phase --step 2.1
python3 ./.trellis/scripts/get_context.py --mode phase --step 2.2 --platform codex
python3 ./.trellis/scripts/get_context.py --mode phase --step 2.1 --platform codex-sub-agent
python3 ./.trellis/scripts/get_context.py --mode phase --step 2.1 --platform claude
```

### 7. Wrong vs Correct

#### Wrong

```typescript
// Wrong: id-based ownership cannot distinguish bundled research from a
// custom-source research collision.
if (template.id === "native") {
  updateHashes(cwd, workflowFiles);
} else {
  removeHash(cwd, PATHS.WORKFLOW_GUIDE_FILE);
}
```

#### Correct

```typescript
if (template.source === "bundled" && isBundledWorkflowId(template.id)) {
  updateHashes(cwd, workflowFiles);
  saveBundledWorkflowSelection(cwd, template.id);
} else {
  removeHash(cwd, PATHS.WORKFLOW_GUIDE_FILE);
  clearWorkflowSelection(cwd);
}
```

Resolved source owns the boundary. Bundled variants remain update-managed;
marketplace/custom content remains absent from update's desired workflow plan.

#### Wrong

```typescript
if (isInteractive()) {
  await promptForOverwrite();
}
```

An explicit `trellis workflow --template tdd` can hang in a TTY even though it is
a scriptable command path.

#### Correct

```typescript
const explicitTemplate = Boolean(options.template);
if (explicitTemplate || !isInteractive()) {
  throw new WorkflowCommandError("... use --force or --create-new ...");
}
```

Only the no-argument interactive picker may prompt for conflict resolution.

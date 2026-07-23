# `trellis update` Command

## 1. Scope / Trigger

`trellis update` reconciles a project to the current Research-only desired state while preserving user edits, canonical Research state, historical ownership compatibility, and idempotency.

Update does not recreate generic commands, agents, skills, scripts, Tasks, registry/spec output, monorepo configuration, onboarding state, active native workflow templates, or marketplace/custom workflow switching.

## 2. Signatures

```text
trellis update
  [--dry-run]
  [-f|--force]
  [-s|--skip-all]
  [-n|--create-new]
  [--allow-downgrade]
  [--migrate]
```

```ts
interface UpdateOptions {
  dryRun?: boolean;
  force?: boolean;
  skipAll?: boolean;
  createNew?: boolean;
  allowDowngrade?: boolean;
  migrate?: boolean;
}
```

Current desired base:

```text
.trellis/config.yaml
.trellis/.gitignore
.trellis/workflow.md       only when managed Research ownership is proven
AGENTS.md                  marker-managed block
selected Claude/Codex Research payload
```

## 3. Contracts

### Current Research desired state

Update collects current host output through the same canonical Research payload resolver used by init. For equal `cwd`, host, options, and Python command:

```text
configured paths == collected paths
configured bytes == collected bytes
```

Collection uses exact Research asset APIs. It excludes broad command/agent/skill/directory discovery and never accepts historical cleanup inventory as active payload input.

### Workflow classification and application

- `research` is the only actively resolvable bundled workflow.
- Historical `native` selection is readable metadata only.
- Historical native bytes are recognized only by immutable exact SHA-256 evidence with release/source-path provenance.
- Missing/invalid/unknown/custom/marketplace/modified/unsafe workflow state is preserved without network access.
- Safely managed native state may migrate to exact Research bytes.
- Workflow applies after backup and other content writes, with a confirmation-time re-read, atomic replacement, exact byte verification, then hash/selection transfer.
- Current exact Research bytes take precedence and may repair metadata without rewriting content.

There is no active bundled native template resolution or marketplace/custom workflow switching.

### Historical cleanup

- The exact 137-path current-host generic inventory and exact 1,009-path retired-host inventory remain unchanged compatibility evidence.
- Unknown siblings and descendants remain unowned.
- Current-template ownership takes precedence over historical deletion.
- Safe deletion requires an exact path, regular unchanged file, and released normalized SHA-256 in canonical `allowed_hashes`.
- Inventory membership, stale manifest ownership, or root membership alone never authorizes deletion.

### Ownership and protection

- Manifest ownership is exact-key based and path-validated.
- `.trellis/research/**` is excluded before traversal, join, read, backup, migration, hashing, or cleanup and remains byte-identical.
- Modified, malformed, missing, unknown, custom, and user-owned historical bytes survive.
- Structured JSON/TOML/Markdown merges preserve unrelated user values; malformed bytes remain unchanged.

### Flags and mutation order

- `--dry-run` renders the full plan and performs zero mutation or prompts.
- `--force`, `--skip-all`, and `--create-new` resolve conflicts and bypass the final confirmation.
- `--migrate` enables regular manifest migrations; `safe-file-delete` remains independently hash-gated.
- Downgrades require `--allow-downgrade`; migrations remain forward-only.

Mutating order:

1. complete backup excluding protected Research/user-data trees;
2. execute selected regular migrations;
3. execute released-hash safe deletes after current-template precedence;
4. persist safe manifest pruning;
5. write non-workflow Research desired files;
6. apply and verify workflow atomically;
7. write version;
8. refresh hashes/selection only for verified output.

### Idempotency

A clean same-version re-run writes nothing and creates no backup. User-deleted tracked files remain deleted. Init/update path and byte parity prevents repeated placeholder or merge churn.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Same current desired state | True no-op; no writes/backup. |
| `--dry-run` | Full preview; no prompt, pruning persistence, backup, directory, hash, selection, or version write. |
| Current template overlaps historical safe delete | Suppress deletion. |
| Historical exact path has released matching bytes | Delete only when all protection/skip/concurrency gates pass. |
| Historical path is modified/missing/unknown | Preserve. |
| Workflow matches exact immutable native digest with safe ownership | Plan atomic migration to Research. |
| Workflow is custom, marketplace, invalid, modified, symlinked, unreadable, or ambiguous | Preserve; no active resolver/network lookup. |
| Existing structured config is malformed | Preserve exact bytes. |
| Migration reaches `.trellis/research/**` | Skip before filesystem access; force cannot bypass. |
| `rename-dir` source lacks manifest ownership | Skip even under force. |
| Bytes change after confirmation | Preserve concurrent content; do not apply stale plan. |
| Write succeeds but verification fails | Do not transfer workflow/hash ownership. |

## 5. Good / Base / Bad Cases

- **Good**: update migrates a proven pristine historical native workflow to exact Research bytes, cleans one released generic file, preserves unknown siblings, and leaves Research ledger bytes unchanged.
- **Base**: project is current; update performs no write and creates no backup.
- **Bad**: resolving `native` from an active template, downloading a custom workflow, scanning template directories, deleting all files in a retired root, or refreshing hashes from collector bytes that differ from configured bytes.

## 6. Tests Required

- Same-version no-op and repeated idempotency.
- Claude-only, Codex-only, dual-host, host-addition, statusline, and configure/collect path-byte parity.
- Workflow classifier matrix for exact Research, exact historical digest, managed hashes, missing/invalid metadata, custom/marketplace/modified/unsafe states.
- Atomic workflow apply, confirmation-time race, write/backup failure, ownership transfer, and metadata repair.
- Exact 137-path and 1,009-path inventory integrity, unknown-descendant preservation, released hash reproduction, and current-template precedence.
- Dry-run, force, skip-all, create-new, migrate, breaking gate, and downgrade behavior.
- Complete `.trellis/research/**` snapshots before/after every case.
- Mixed/malformed config preservation.
- Clean package audit proving no generic source/template payload is restored.

## 7. Wrong vs Correct

```text
Wrong: `native` is readable, so load `templates/trellis/workflow.md` and compare it.
Correct: keep no active native template; recognize historical bytes only through immutable digest evidence.
```

```text
Wrong: a file disappeared from active collection, therefore delete it.
Correct: require exact historical ownership plus released hash evidence, and let current template ownership win.
```

```ts
// Wrong: write transformed bytes but record a different raw template.
await writeFile(target, renderedTemplate);
files.set(path, rawTemplate);

// Correct: write the canonical collected Research map.
const payload = collectResearchPlatformPayload(platformId, cwd, options);
await writeResearchPlatformPayload(platformId, cwd, options);
```

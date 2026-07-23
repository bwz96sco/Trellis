# `trellis uninstall` Command

## 1. Scope / Trigger

`trellis uninstall` releases exact Trellis ownership. It is not a recursive project cleanup and has no Research purge mode.

Normal uninstall preserves canonical Research state, user-modified generated files, malformed files, unknown descendants, Tasks, workspace/spec/developer state, user Channel/Mem data, custom workflow bytes, mixed user configuration, and every non-empty user-owned directory.

## 2. Signatures

```text
trellis uninstall [-y|--yes] [--dry-run]
```

```ts
interface UninstallOptions {
  yes?: boolean;
  dryRun?: boolean;
}
```

Ownership source:

```text
.trellis/.template-hashes.json
```

There is no per-platform uninstall and no `--purge-research` option.

## 3. Contracts

### Pre-checks

- Refuse to run at the user's home directory unless `TRELLIS_ALLOW_HOMEDIR=1`.
- Missing installation or valid empty ownership is a friendly no-op.
- Missing ownership with other `.trellis` content and malformed/unsupported ownership fail closed.
- Raw manifest keys are validated before normalization or filesystem access.

### Exact ownership classification

`pruneOrphanManifestKeys(..., { persist: false })` computes known ownership from exact current Research outputs, exact 137-path current-host cleanup keys, exact 1,009-path retired-host keys, exact structured descriptors, canonical migration keys, safe existing `rename-dir` descendants, and marker evidence.

A root never owns arbitrary siblings or descendants. Unknown/unsafe keys are released without read, stat, hash, scrub, unlink, or directory scan.

### Plan classes

| Class | Required behavior |
|---|---|
| protected Research | Preserve bytes and release ownership without access. |
| missing | Release ownership; no filesystem action. |
| structured scrubbed | Atomically write scrubbed bytes, or delete only if successful scrub leaves no content. |
| structured unchanged/malformed | Preserve exact bytes and release ownership. |
| pristine opaque | Delete only when current normalized hash equals recorded hash. |
| modified/non-regular/unreadable opaque | Preserve and release ownership. |
| unknown/unsafe | Never access; release ownership. |

### Mixed structured files

Path-specific scrubbers handle current Claude/Codex settings, Codex TOML, marker-managed `AGENTS.md`, and exact retired compatibility files. Current descriptors take precedence over historical descriptors. A structured file outside the manifest is invisible.

### Zero-mutation gates and execution

- `--dry-run`, cancellation, and non-TTY refusal perform zero writes, including no manifest pruning persistence.
- After confirmation, every file is re-read and compared with planned bytes.
- Concurrently changed/missing files are preserved/released.
- Only failed write/delete operations retain ownership for retry.
- Final ownership writes are atomic.
- Directory cleanup uses `rmdir` only on confirmed-empty managed parents/roots, deepest first.
- `.trellis` is never recursively removed.

### Compatibility and data preservation

Historical native metadata, custom workflow bytes, Tasks, Channel logs, Mem/session stores, malformed files, unknown descendants, and mixed user fields are user data for uninstall purposes. Frozen cleanup inventories may recognize exact prior generated keys but do not activate commands/platforms or grant prefix deletion.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| `.trellis/research/**` appears in manifest | Preserve and release without filesystem access. |
| Unsafe manifest key | Report unknown/released; no filesystem API receives it. |
| Opaque file hash matches | Revalidate bytes, then delete. |
| Opaque file differs or becomes different after confirmation | Preserve; release ownership. |
| Mixed config contains Trellis and user values | Remove exact Trellis values; preserve user values. |
| Mixed config is malformed or shape-invalid | Preserve exact bytes. |
| Unknown descendant exists under active/retired root | Preserve; do not infer ownership. |
| Delete/scrub I/O fails | Preserve ownership for retry. |
| Cleanup root is non-empty | Keep it. |
| Only Research/user data remains | Successful no-op/converged uninstall. |

## 5. Good / Base / Bad Cases

- **Good**: uninstall removes pristine Research worker files, scrubs exact Trellis hooks from mixed settings, preserves user hooks and the entire Research ledger, then removes only empty directories.
- **Base**: all owned opaque files were modified; uninstall preserves them, releases stale ownership, and leaves `.trellis` intact.
- **Bad**: recursively deleting `.trellis`, deleting a structured file because its whole-file hash matches, scanning retired roots for candidates, or offering a purge flag for Research/user data.

## 6. Tests Required

- Complete schema-v1 Research fixture survives path-for-path and byte-for-byte.
- No recursive `.trellis` removal exists.
- Pristine/missing/modified/non-regular/read-error opaque classification.
- Mixed, unchanged, malformed, and fully-empty structured outcomes.
- Unsafe and unknown keys never reach filesystem APIs.
- Dry-run, cancellation, and non-TTY gates preserve every byte.
- Confirmation-time changes survive.
- Failed operations retain ownership; completed/released operations do not.
- Exact 137-path and 1,009-path compatibility behavior with unknown descendants.
- User Tasks, Channel/Mem data, custom workflows, mixed config, and non-empty roots survive.
- Repeated uninstall converges safely.

## 7. Wrong vs Correct

```ts
// Wrong: uninstall means deleting the product root.
fs.rmSync(path.join(cwd, ".trellis"), { recursive: true, force: true });

// Correct: classify exact manifest keys, scrub/delete narrowly, then remove only empty dirs.
const plan = buildPlan(cwd, safeOwnedHashes, unknownKeys);
await executePlan(plan);
```

```text
Wrong: `.opencode` is historical, therefore every descendant may be deleted.
Correct: only exact frozen/manifest evidence enters classification; unknown descendants survive.
```

```text
Wrong: a malformed shared config is replaced with a clean default.
Correct: malformed bytes remain byte-identical and ownership is released.
```

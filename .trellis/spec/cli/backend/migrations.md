# Migration and Ownership Compatibility

## 1. Scope / Trigger

This specification covers versioned migration manifests, manifest-key ownership, historical generic cleanup, and the safety boundary used by `trellis update` and `trellis uninstall`.

Migration data is compatibility evidence. It does not restore retired commands, platforms, templates, registry downloads, generic workflow generation, or Task creation.

## 2. Signatures

Manifest location:

```text
packages/cli/src/migrations/manifests/<version>.json
```

Supported migration operations:

```text
rename
rename-dir
delete
safe-file-delete
```

A `safe-file-delete` operation has the shape:

```json
{
  "type": "safe-file-delete",
  "from": ".agents/skills/trellis-check/SKILL.md",
  "allowed_hashes": ["<released-normalized-sha256>"]
}
```

Ownership state:

```text
.trellis/.template-hashes.json
```

Historical inventories:

```text
CURRENT_HOST_GENERIC_CLEANUP_PATHS     exactly 137 paths
RETIRED_GENERATED_PATHS                exactly 1,009 paths across 17 retired hosts
```

## 3. Contracts

### Canonical manifest history

- Versioned manifests remain the sole source for `rename`, `rename-dir`, `delete`, and `safe-file-delete` history.
- Published manifests are immutable compatibility records and must remain present in clean `dist` and the packed npm tarball.
- `breaking: true` plus `recommendMigrate: true` requires `migrationGuide` and `aiInstructions`.
- Historical `configSectionsAdded` and migration-guide fields remain readable, but current Research desired-state generation does not create migration Tasks or append generic config sections.

### Exact-key ownership

- `.template-hashes.json` is a candidate ownership set, not unconditional delete authority.
- New ownership is recorded only for files Trellis actually wrote or overwrote.
- Byte-identical, skipped, append-only, discovered, sibling, and descendant files are not newly owned.
- Every key is path-validated before `path.join`, read, hash, scrub, move, or delete.
- A managed root never grants ownership of arbitrary descendants.
- Canonical `rename-dir` prefixes may preserve an already safe manifest key; they never authorize a filesystem scan to discover keys.

### Frozen cleanup evidence

The 137-path current-host inventory remains unchanged and is partitioned into exact retired, transition, optional, structured, and pre-release-only keys. The 1,009-path retired-host inventory remains compatibility evidence for exactly the frozen 17 retired hosts.

These inventories may:

- retain an already recorded exact manifest key;
- select a path-specific scrubber descriptor;
- support backup preservation;
- support confirmed-empty directory cleanup.

They may not:

- widen active host types, detection, flags, or registries;
- enter active payload collection;
- infer ownership from a root or prefix;
- supply deletion hashes;
- recreate generic source or templates.

### Released hash authority

- Safe deletion requires a normalized SHA-256 reproduced from immutable released bytes with release and source-path provenance.
- Inventory membership alone is insufficient.
- Synthetic fixtures, representative content, pre-release-only bytes, and current collector output are not release evidence.
- `allowed_hashes` stays only in the canonical migration entry; do not copy it into cleanup inventories.
- Current-template ownership takes precedence over historical deletion.

### Research protection

`.trellis/research/**` is protected before filesystem resolution. It is excluded from migration source and target paths, recursive rename coverage, backup traversal, template hashing, safe deletion, and uninstall mutation. `--force`, breaking bypass, or poisoned manifest state cannot override this rule.

### Classification

| Classification | Required behavior |
|---|---|
| `auto` | Execute only when ownership and target safety are proven. |
| `confirm` | Require explicit handling for modified source bytes. |
| `conflict` | Preserve both sides and require manual resolution. |
| `skip` | Perform no mutation for missing, protected, unsafe, or unowned state. |
| `skip-modified` | Preserve bytes whose hash is not released deletion evidence. |
| `skip-protected` | Preserve Research regardless of other flags. |

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Exact safe key appears in a frozen inventory | May remain known compatibility ownership; no implicit deletion. |
| Unknown sibling/descendant appears in a manifest | Prune and release it without filesystem access. |
| Untracked file exists below a cleanup root | Invisible to ownership and deletion. |
| `safe-file-delete` hash matches released evidence | Delete only if the path is not current, protected, skipped, or concurrently changed. |
| Hash differs or file is malformed/non-regular | Preserve bytes. |
| Migration `from` or `to` reaches `.trellis/research/**` | Skip before path resolution and repeat the guard at execution. |
| `rename-dir` source has no manifest-owned descendants | Skip even under `--force`. |
| Current Research template overlaps historical deletion | Current template wins; suppress deletion. |
| Manifest key is absolute, traversal, backslash, drive-relative, NUL, or non-normalized | Reject as unsafe; perform no filesystem access. |
| Frozen inventory cardinality/path changes unintentionally | Test and package audit failure. |

## 5. Good / Base / Bad Cases

- **Good**: an exact historical key with released matching bytes is safely removed while an unknown sibling and all Research data remain byte-identical.
- **Base**: a frozen path is absent or modified; update reports it and preserves the project without inventing ownership.
- **Bad**: walking `.claude`, `.codex`, `.windsurf`, or `.trellis` and hashing/deleting every discovered descendant; deriving `allowed_hashes` from a fixture; or feeding retired inventory into active payload collection.

## 6. Tests Required

- Pin the exact 137-path current-host union and its partitions.
- Pin the exact 17 retired host IDs and 1,009 globally unique retired paths.
- Validate sorted, duplicate-free, overlap-free, relative file-only inventory entries.
- Prove retained Research workers and nine stage skills are excluded from cleanup.
- Prove unknown descendants are pruned without read/stat access.
- Prove canonical `rename-dir` descendants require pre-existing safe manifest ownership.
- Reproduce every admitted `allowed_hashes` value from cited released bytes.
- Cover pristine, modified, missing, protected, skipped, malformed, and current-template-precedence cases.
- Prove dry-run and cancellation do not persist pruning.
- Require every migration manifest in clean `dist` and the packed tarball.

## 7. Wrong vs Correct

```ts
// Wrong: location becomes ownership.
for (const file of walk(".codex")) {
  hashes[file] = computeHash(read(file));
}

// Correct: ownership follows exact successful writes.
startRecordingWrites();
await writeResearchPlatformPayload("codex", cwd);
const written = stopRecordingWrites();
initializeHashes(cwd, { trackedPaths: written });
```

```ts
// Wrong: frozen inventory or fixture bytes authorize deletion.
allowed_hashes: [computeHash("representative fixture")];

// Correct: only immutable released bytes with provenance authorize deletion.
allowed_hashes: [releasedNormalizedSha256];
```

```text
Wrong: `.windsurf` is a cleanup root, therefore every child is Trellis-owned.
Correct: only an exact frozen key, exact structured descriptor, or already-safe canonical migration key is recognized.
```

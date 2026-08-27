# Migration and Ownership Compatibility

## 1. Scope / Trigger

This specification covers versioned migration manifests, manifest-key ownership, historical generic cleanup, and the safety boundary used by `trellis update` and `trellis uninstall`.

Migration data is compatibility evidence. It does not restore retired commands, platforms, templates, registry downloads, generic workflow generation, or Task creation.

### Frozen successor scope (not implemented in C01)

C08-C09 additionally trigger this spec for the separate immutable Research Skill retirement evidence. The frozen 137/1,009 generic cleanup evidence remains outside that successor authority.

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

```ts
executeMigrations(
  classified: ClassifiedMigrations,
  cwd: string,
  options: { force?: boolean; skipAll?: boolean },
  templates: Map<string, string>,
): Promise<MigrationResult>;
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

### C08 Research Skill retirement signatures (active)

Dedicated package-internal Research Skill retirement evidence:

```text
packages/cli/src/legacy/research-skill-retirement.json
packages/cli/src/legacy/research-skill-retirement.ts
```

Records schema version, `normalization: utf8-lf`, `authority: none | complete`, and (when complete) exact historical path, released package/version provenance, immutable tar entry, rendering profile, and sorted unique lowercase SHA-256 digests. It is separate from migration inventory membership and from the frozen generic cleanup snapshots. Evidence is never installed into user projects.

Forward migration `0.7.0-beta.1` reserves the Research Skill `safe-file-delete` slot. While `authority=none`, that manifest must contain zero Research stage Skill deletes. Agreement tests fail closed if evidence and migrations disagree.

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
- When both `rename-dir` sides exist and every target file byte-matches its
  current template entry, the target is canonical. Execution deletes only the
  stale source directory and its old-prefix hash entries; it does not overwrite
  target bytes or target hashes with stale source content.
- Historical stored hashes alone do not prove target canonicality. Every target
  file must have a current template entry and exact byte equality; empty,
  unknown, extra, or mismatched target content follows normal classified rename
  behavior instead.

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

### Frozen successor contracts (not implemented in C01)

- Retirement evidence covers exactly the nine historical Trellis Research Skill files under each of the Claude and `.agents` roots.
- Deletion requires exact safe key, existing ownership/migration authority, contained regular non-symlink file, current-byte match to immutable released hash, and no current/protected/concurrent exclusion.
- Modified, malformed, unknown, untracked, external `research-*`, worker, hook, config, and `.trellis/research/**` files survive.
- Remove only confirmed-empty directories with `rmdir`; never infer ownership or recursively remove a Skill root.

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
| Existing `rename-dir` target exactly matches all current template bytes | Keep target; delete stale source and only source-prefix hash entries. |
| Existing target is empty, extra, unknown, or byte-mismatched | Do not claim canonical-target precedence; follow classified migration safety. |
| Current Research template overlaps historical deletion | Current template wins; suppress deletion. |
| Manifest key is absolute, traversal, backslash, drive-relative, NUL, or non-normalized | Reject as unsafe; perform no filesystem access. |
| Frozen inventory cardinality/path changes unintentionally | Test and package audit failure. |

Successor matrix additions: dedicated evidence plus exact released-byte match may delete one historical Skill file; inventory-only, current-collector, modified, malformed, unknown, external, unowned, symlinked, protected, or concurrently changed cases preserve bytes.

## 5. Good / Base / Bad Cases

- **Good**: an exact historical key with released matching bytes is safely removed while an unknown sibling and all Research data remain byte-identical. A current canonical rename target survives stale source retirement unchanged.
- **Base**: a frozen path is absent or modified; update reports it and preserves the project without inventing ownership.
- **Bad**: walking `.claude`, `.codex`, `.windsurf`, or `.trellis` and hashing/deleting every discovered descendant; deriving `allowed_hashes` from a fixture; feeding retired inventory into active payload collection; or replacing canonical target bytes with an untouched stale source.

### Frozen successor cases

- **Good**: one exact owned pristine released Skill is deleted and its now-empty directory is removed.
- **Base**: modified or absent historical Skill is preserved/no-op while ownership is handled safely.
- **Bad**: generic cleanup counts/hashes are edited or a whole Skill root is scanned/deleted.

## 6. Tests Required

- Pin the exact 137-path current-host union and its partitions.
- Pin the exact 17 retired host IDs and 1,009 globally unique retired paths.
- Validate sorted, duplicate-free, overlap-free, relative file-only inventory entries.
- Prove retained Research workers and nine stage skills are excluded from cleanup.
- Prove unknown descendants are pruned without read/stat access.
- Prove canonical `rename-dir` descendants require pre-existing safe manifest ownership.
- Prove an exact current-template target wins over stale source bytes, removes
  only source-prefix hashes, and leaves target bytes/hashes unchanged.
- Reproduce every admitted `allowed_hashes` value from cited released bytes.
- Cover pristine, modified, missing, protected, skipped, malformed, and current-template-precedence cases.
- Prove dry-run and cancellation do not persist pruning.
- Require every migration manifest in clean `dist` and the packed tarball.

Frozen successor tests additionally require exact 18-path dedicated evidence, released provenance reproduction, pristine deletion, all preservation classes, dry-run/cancellation/concurrent revalidation, confirmed-empty-only cleanup, and unchanged 137/1,009 generic evidence.

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

```text
Wrong: replace an existing current-template target with stale-but-unmodified rename source bytes.
Correct: byte-verify the complete target against current templates, keep it, then retire only the redundant source and source-prefix hashes.
```

### Frozen successor: Research Skill retirement

```text
Wrong: reuse generic cleanup inventory or current collector bytes as deletion authority.
Correct: use separate immutable released provenance and delete one exact owned matching historical Skill file.
```

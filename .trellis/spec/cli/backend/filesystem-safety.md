# Filesystem Safety Contract

## 1. Scope / Trigger

Apply this contract to every CLI/core path that writes, deletes, moves, scrubs, or overwrites user-repository files, including init, update, uninstall, Research runtime state, Dispatch context, migration ownership, and compatibility cleanup.

Removed commands and options add a parser boundary: Commander rejection must occur before any action callback or filesystem write.

### Frozen successor scope (not implemented in C01)

C04-C09 additionally trigger this spec for strict Procedure/policy resolution, activation/approval materializations, read-only approval gates, embedded worker paths, and exact historical Research Skill retirement.

## 2. Signatures

Atomic TypeScript write:

```ts
writeFileAtomic(filePath: string, data: string | Uint8Array): void;
```

Canonical current payload:

```ts
collectResearchPlatformPayload(platformId, cwd?, options?): Map<string, string>;
writeResearchPlatformPayload(platformId, cwd, options?): Promise<void>;
```

Safety predicates include:

```text
isSafeManifestPath
isProtectedResearchPath
containsProtectedResearchPath
dirHasManifestEntries
```

Parse-failure invariant:

```text
unknown command/option
  -> Commander error
  -> no action callback
  -> no filesystem write
```

### Frozen successor signatures (not implemented in C01)

Successor paths include `.trellis/research/policy.json`, project Procedure pairs under `.trellis/research/procedures/<id>/<version>/`, strict activation/approval sidecars, bundled Procedures, and exact historical Skill files. All use validate-before-resolution and operation-specific read/write authority.

## 3. Contracts

### Atomic durable writes

Durable state such as hashes, workflow selection, Research runtime state, tracked Dispatch files, and core compatibility stores uses same-directory temporary write plus atomic rename/replace. Failure removes the temporary file best-effort and preserves the original target.

### Validate before resolution

Any user/agent-controlled path or identifier is validated before `path.join`, canonicalization, read, move, or delete. Dispatch request paths require exact portable grammar, matching prefixed ID, canonical containment, regular-file checks, and symlink-escape rejection. Allowed write paths canonicalize the nearest existing ancestor.

Channel/Task name and storage guards remain core SDK compatibility behavior; they do not imply active CLI commands.

### Exact ownership before destructive operations

- Manifest keys are exact file keys, not prefixes.
- Opaque deletion requires current bytes to match recorded/released hash evidence as applicable.
- Mixed files use path-specific scrubbers and are deleted only when a successful scrub leaves no user content.
- `rename-dir` requires manifest-owned descendants.
- Retired roots allow backup preservation and confirmed-empty `rmdir`, never recursive ownership inference.
- Confirmation-time execution re-reads planned bytes; concurrent changes survive.

### Protected and preserved data

`.trellis/research/**` is excluded before traversal or path resolution and remains byte-identical across init, update, uninstall, backup, migration, and cleanup.

Normal uninstall also preserves modified/malformed files, unknown descendants, Tasks, workspace/spec/developer state, user Channel/Mem data, custom workflow bytes, mixed user configuration, and non-empty managed roots.

### Zero-write observation and parsing

`trellis research dispatch context` is strictly read-only: no lock, runtime directory, observation cache, session file, manifest, ledger, projection, tracked Dispatch, target Repository, or Git mutation.

Removed root commands, the removed Research Task subtree, and removed init options are unregistered. Tests must execute the built parser and compare complete filesystem snapshots.

### Historical cleanup boundary

The frozen 137-path current-host and 1,009-path retired-host inventories are exact compatibility evidence. Unknown siblings/descendants remain unowned. Safe deletion additionally requires released hash evidence; inventory membership alone is insufficient.

### Frozen successor contracts (not implemented in C01)

- Existing project Procedure directories are authoritative: absence may fall back to bundled, but partial/malformed/symlinked/escaping presence fails closed.
- Procedure instruction bytes are never newline-normalized before digesting or embedding.
- Missing/malformed policy fails closed; normal update never overwrites an existing policy or project Procedure override.
- Context recomputes all digests/scope without writes and never repairs stale sidecars.
- Historical Skill cleanup uses exact released-hash evidence and confirmation-time reread, preserving every non-exact case.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Atomic replacement fails | Original target survives; temp is removed best-effort; error propagates. |
| Manifest key is absolute/traversal/backslash/NUL/non-normalized | Reject before filesystem access. |
| Path reaches `.trellis/research/**` | Preserve before join/read/traversal; no force override. |
| Unknown descendant under managed/retired root | Unowned; preserve; do not read during ownership pruning. |
| Opaque hash differs | Preserve and release ownership. |
| Structured file is malformed | Preserve exact bytes; release ownership. |
| Planned bytes change before execution | Preserve current bytes; do not apply stale plan. |
| Dispatch context validation fails | Bounded no-write error; no partial context. |
| Removed command/option is entered | Commander error; no callback/write. |
| Cleanup root is non-empty | Keep it; never recursive-delete. |

Successor matrix additions: invalid override/policy, digest/scope/materialization drift, non-TTY approval, or unsafe retirement target fails closed with no partial write. Post-commit sidecar failure reports committed recovery and never appends a replacement event batch.

## 5. Good / Base / Bad Cases

- **Good**: uninstall scrubs one exact Trellis hook from mixed Claude settings, preserves user hooks, and atomically writes the result.
- **Base**: an exact historical file is modified; cleanup skips it and leaves its parent root intact.
- **Bad**: hashing every file below `.codex`, deleting an entire mixed `AGENTS.md`, using lexical containment through a symlink, or accepting `--registry` and rejecting it only after init begins.

### Frozen successor cases

- **Good**: valid contained regular Procedure/policy files are read exactly, digest bindings match, and Context writes nothing.
- **Base**: no override directory uses bundled Procedure; an existing policy survives update byte-for-byte.
- **Bad**: fallback around partial override, normalize instruction bytes, repair Context state, or recursively remove historical roots.

## 6. Tests Required

- Atomic write success/failure and temporary-file cleanup.
- Unsafe manifest/path rejection before filesystem API calls.
- Commander rejection for every removed command/option through both aliases with byte-identical full-tree snapshots.
- Strict zero-write Dispatch context success and every failure phase.
- Research full-tree preservation across all mutating commands.
- Opaque hash gates, structured mixed/malformed preservation, and confirmation-time revalidation.
- Exact 137/1,009 inventory boundaries and unknown-descendant preservation.
- Confirmed-empty-only cleanup for active, retired, and alias roots.
- Current-template precedence over historical safe deletion.

Frozen successor tests additionally require Procedure/policy path containment and strict bytes, symlink/partial override failures, atomic sidecars, zero-write digest/scope mismatch, concurrent retirement preservation, and full `.trellis/research/**` protection.

## 7. Wrong vs Correct

```ts
// Wrong: truncate durable state in place.
fs.writeFileSync(hashPath, serialized);

// Correct: replace atomically from the same directory.
writeFileAtomic(hashPath, serialized);
```

```ts
// Wrong: root membership becomes ownership.
if (key.startsWith(".windsurf/")) fs.rmSync(path.join(cwd, key));

// Correct: require a safe exact key and the operation-specific evidence.
if (isSafeManifestPath(key) && exactKnownKeys.has(key)) classifyOwnedKey(key);
```

```text
Wrong: register a retired option and throw after banner/probes/prompts.
Correct: omit it from Commander so parsing fails before the action and before any write.
```

### Frozen successor: override and Context safety

```text
Wrong: normalize Procedure bytes, fall back around an invalid override, or repair approval state during Context.
Correct: hash exact bytes, fail closed on present-invalid overrides, and keep Context strictly zero-write.
```

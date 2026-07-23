# Design — Protect research data lifecycle

## Ownership model

Classify every uninstall candidate before mutation:

| Class | Evidence | Action |
|---|---|---|
| protected | path is `.trellis/research` or descendant | preserve; never scrub/delete |
| pristine opaque | manifest key exists and current hash equals recorded hash | delete |
| modified opaque | manifest key exists and current hash differs | preserve; release ownership |
| structured | manifest key and registered scrubber | scrub exact Trellis fields; delete only when scrubber reports empty |
| malformed structured | scrubber cannot parse/recognize safely | preserve bytes; report malformed |
| missing | manifest key but no file | skip; release ownership |
| unknown | manifest key not recognized as current/migration-owned | prune key; never touch file |

Current ownership and legacy cleanup are separate. C02 uses current registry/migrations only; C03 later adds retired-host ownership inventory.

## Protected-path chokepoint

Add one reusable POSIX-path predicate for `.trellis/research` containment. Use it at destructive chokepoints:

- uninstall plan classification
- update migration source and destination classification
- safe-file-delete collection
- backup exclusion
- manifest pruning/persistence
- empty-directory cleanup

Protection is prefix-aware and segment-safe: `.trellis/research` and `.trellis/research/**` match; `.trellis/research-old` does not.

## Uninstall pipeline

```text
load manifest with missing/valid/invalid status
  -> prune unknown keys in memory only
  -> classify protected/structured/opaque/missing
  -> render grouped plan
  -> dirty-data warning/confirmation
  -> dry-run return
  -> structured modifications and pristine opaque deletions
  -> derive final ownership from actual operation results
  -> atomic manifest ownership update
  -> remove only confirmed-empty dirs
  -> grouped result
```

No `rmSync(.trellis, { recursive: true })`. `.trellis` may remain containing research data, modified files, malformed configs, unknown user content, or minimal ownership metadata. If only protected research data remains and managed ownership is empty/missing, repeated uninstall returns a friendly no-op.

## Hash and structured-file rules

- Opaque deletion requires manifest membership plus exact match under the existing manifest hash contract (SHA-256 after line-ending normalization). Raw-byte hash migration is out of scope.
- Structured scrubbers remain content-aware and may operate on mixed files even when whole-file hash differs.
- Scrubber result adds an explicit `outcome: "scrubbed" | "unchanged" | "malformed"` beside `content` and `fullyEmpty`; orchestration must not infer malformed from `fullyEmpty: false` alone.
- Manifest updates use existing atomic hash persistence helpers after actual operations. Failed delete/write operations retain ownership for retry; successful, missing, protected, modified, malformed, unchanged, and unknown outcomes release ownership.

## Update/migration safety

Research protection applies to both `from` and `to`. Existing rule allowing migration into generic protected paths does not apply to canonical research state. Safe-file-delete returns `skip-protected`. Backup planning excludes `.trellis/research/**`; canonical data is neither migration input nor snapshot-managed template data.

## Compatibility and rollback

- No research ledger/event rewrite.
- Existing CLI flags remain unchanged.
- No retired-host deletion.
- A regression rollback restores prior planner code, never deletes or rewrites research state.
- Tests use C01 golden fixtures and real temp directories.

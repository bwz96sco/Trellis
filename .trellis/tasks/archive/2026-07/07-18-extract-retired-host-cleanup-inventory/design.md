# Design — Retired host cleanup inventory

## Boundary

C03 creates a cleanup-only compatibility layer. Active platform support remains unchanged until C04.

```text
active registry/configurators/templates
  -> current install, detection, template collection, update writes

legacy cleanup inventory
  -> manifest key recognition, structured scrub dispatch,
     backup roots, confirmed-empty root cleanup

migration manifests
  -> historical rename/delete/safe-delete paths and allowed hashes
```

The legacy layer is data-only. It must not export configure functions, CLI flags, host capabilities, detection rules, or template bytes.

## Inventory model

Add a generated JSON snapshot and a small typed facade:

```text
packages/cli/src/legacy/
  retired-host-generated-paths.json
  retired-host-cleanup.ts
```

JSON contract:

```ts
interface RetiredHostGeneratedPathSnapshot {
  schemaVersion: 1;
  sourceVersion: "0.6.7";
  hosts: Record<RetiredHostId, string[]>;
}
```

Facade exports:

```ts
export const RETIRED_HOST_IDS: readonly RetiredHostId[];
export const RETIRED_GENERATED_PATHS: ReadonlySet<string>;
export const RETIRED_MANAGED_ROOTS: readonly string[];
export const LEGACY_ALIAS_ROOTS: readonly string[];
export const LEGACY_CLEANUP_MANAGED_ROOTS: readonly string[];
export const RETIRED_STRUCTURED_FILES: readonly RetiredStructuredFile[];
export const LEGACY_TRELLIS_HOOK_COMMAND_PATHS: readonly string[];
```

Rules:

- Snapshot paths are normalized POSIX-relative paths, sorted, unique, and exact.
- Baseline cardinality is 17 hosts and 1,009 paths.
- No wildcard, trailing-slash prefix, or root-recursive ownership entry is accepted.
- Migration paths/hashes remain loaded from existing manifests and are not copied into JSON.
- Inventory is compatibility data, not mutable output generated during normal CLI execution.

## Managed-root split

Keep current names compatible while separating meaning:

```ts
PLATFORM_MANAGED_DIRS       // active registry only
LEGACY_CLEANUP_MANAGED_ROOTS // retired + alias roots only
ALL_MANAGED_DIRS            // .trellis + union of both, for backup/empty cleanup
```

`PLATFORM_IDS`, `getConfiguredPlatforms`, `configurePlatform`, and current template collection continue to use only the active registry. `isManagedPath`, `isManagedRootDir`, update backup roots, migration parent cleanup, and uninstall confirmed-empty root cleanup use the union.

Alias roots include `.iflow`, `.windsurf`, and legacy ZCode layout roots. Root membership permits backup and empty-directory cleanup only; it never confers file ownership.

## Exact path ownership

Manifest pruning preserve-set becomes:

```text
current workflow keys
+ protected research keys
+ registry spec keys
+ current configured-platform template keys
+ exact RETIRED_GENERATED_PATHS
+ all migration from/to keys
+ marker-owned or missing AGENTS.md
```

A disk file is never discovered and claimed by scanning a retired root. Cleanup still requires a validated manifest key or an existing migration ownership gate. Unknown descendants beneath known roots are pruned from manifest ownership and never accessed.

Current ownership wins naturally through set union and explicit current-template guards:

- Gemini's historical `.agents/skills/**` overlap remains current Codex output.
- `collectSafeFileDeletes` continues to skip every path emitted by current Claude/Codex template collection.
- `AGENTS.md` remains marker-structured current/shared ownership, never retired opaque ownership.

## Structured cleanup descriptors

Use discriminated data descriptors rather than callbacks in the inventory:

```ts
type RetiredStructuredFile =
  | { path: string; kind: "hooks"; layout: "flat" | "nested" }
  | { path: string; kind: "opencode-package" }
  | { path: string; kind: "pi-settings" }
  | { path: string; kind: "managed-markdown"; startMarker: string; endMarker: string }
  | { path: ".zcode/config.json"; kind: "zcode-hooks" };
```

`uninstall.ts` maps descriptors to existing scrubbers plus the new ZCode scrubber. Current Claude/Codex structured specs remain local/current and are merged with retired descriptors by exact path.

### Trae legacy settings

`.trae/settings.json` is classified as `hooks/nested`. Matching includes exact Trellis hook script paths known from the retired generated snapshot and an explicit legacy command-path allowlist. User hooks and unrelated fields survive. Invalid JSON/shape returns `malformed` with original bytes.

### ZCode config

Add:

```ts
export function scrubZcodeConfigJson(
  content: string,
  ownedHookPaths: readonly string[],
): ScrubResult;
```

Contract:

- Parse a JSON object with optional `hooks` object.
- Validate recognized ZCode hook containers before mutation.
- Remove only event registrations whose command/script path exactly references an owned Trellis hook path.
- Preserve unrelated top-level fields, hook settings, events, and order as far as JSON reserialization permits.
- Delete empty Trellis-created containers only when the scrubber removed Trellis content.
- Return `unchanged` when no Trellis content was removed.
- Return `malformed` and original bytes for invalid JSON or unsafe recognized shapes.
- `fullyEmpty` is true only when a successful scrub leaves no user content.

No generic recursive search-and-delete over arbitrary JSON values.

## Consumer flow

### Manifest pruning

```text
load validated manifest
  -> build current known keys
  -> add exact retired snapshot keys
  -> add migration from/to keys
  -> prune invalid/unknown keys without filesystem access
```

### Uninstall

```text
validated manifest + pruned ownership
  -> current structured descriptors + retired structured descriptors
  -> exact-path classification
  -> C02 plan/confirm/revalidate/execute/persist pipeline
  -> remove only confirmed-empty current/legacy roots
```

### Update

```text
current templates remain active-registry-only
  -> pruning retains retired exact keys
  -> confirmation
  -> backup current + legacy cleanup roots
  -> migrations/safe-delete use existing ownership gates
  -> current template paths override historical deletion
  -> cleanup confirmed-empty current/legacy roots
```

## Snapshot generation and drift gate

During C03 implementation, generate the snapshot once from the current 17 retired collectors/configurator outputs. Commit the resulting data, not a runtime generator dependency.

Tests compare the frozen snapshot against current retired collectors while those collectors still exist. This is a C03 extraction gate. C04 may replace that comparison with fixture/cardinality checks when retired configurators/templates are removed.

The snapshot contains only the exact outputs emitted by the current 17 retired collectors, so its union remains exactly 1,009 paths. Compatibility-only paths not emitted by those collectors, notably `.trae/settings.json`, remain outside the snapshot and are represented by exact structured descriptors or alias roots. Migration-owned paths remain canonical in the migration manifests.

## Validation matrix

| Condition | Result |
|---|---|
| Snapshot host is Claude Code or Codex | Test/build failure |
| Duplicate, absolute, traversing, NUL, wildcard, or unsafe path | Test/build failure |
| Manifest key equals exact retired path | Keep as cleanup candidate |
| Manifest key is unknown descendant under retired root | Prune/release; no file access |
| Retired path overlaps current template | Current ownership wins |
| Retired opaque bytes match manifest hash | C02 permits deletion |
| Retired opaque bytes differ | Preserve/release |
| Retired structured file has Trellis content | Scrub exact owned content |
| Structured file malformed/unsafe | Preserve bytes; report malformed |
| Trae legacy command references known Trellis hook | Remove exact hook entry |
| ZCode config contains user events plus Trellis event | Remove Trellis event; preserve user events |
| Migration alias root contains untracked user file | Never claim/mutate; root remains non-empty |
| Dry-run or cancelled update/uninstall | Zero writes/backups/directories |

## Compatibility and rollback

- No active host registry or CLI surface changes in C03.
- No migration manifest rewrite.
- No research ledger/projection changes.
- Existing C02 ownership safety remains authoritative.
- Cleanup inventory stays through the 0.7 compatibility line; future removal requires explicit migration evidence.
- Rollback removes the inventory wiring and restores prior derived-root behavior. It must not rewrite manifests or reintroduce recursive deletion.
- `docs-site` and `marketplace` remain untouched independent repositories.

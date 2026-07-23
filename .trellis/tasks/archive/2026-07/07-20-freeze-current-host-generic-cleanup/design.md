# Design: collector-independent current-host cleanup ownership

## 1. Data split

### Inventory

`packages/cli/src/legacy/current-host-generic-cleanup.json`

Stores exact paths and classification only.

### Facade

`packages/cli/src/legacy/current-host-generic-cleanup.ts`

Validates snapshot at module load and exports immutable exact-path sets. No rendering, installation, filesystem, or network functions.

### Migration

`packages/cli/src/migrations/manifests/0.7.0-beta.0.json`

Stores destructive `safe-file-delete` operations plus normalized hashes. Existing loader/executor remains unchanged.

## 2. Snapshot contract

```ts
interface CurrentHostGenericCleanupSnapshot {
  schemaVersion: 1;
  sourceVersion: "0.6.7";
  hosts: {
    "claude-code": CleanupPartition;
    codex: CleanupPartition;
  };
  trellis: {
    retiredOpaquePaths: string[];
    preReleaseOnlyOpaquePaths: string[];
  };
  root: { structuredPaths: string[] };
}

interface CleanupPartition {
  retiredOpaquePaths: string[];
  transitionOpaquePaths: string[];
  optionalOpaquePaths: string[];
  structuredPaths: string[];
}
```

Expected counts:

| Partition | Count |
| --- | ---: |
| Claude retired opaque | 48 |
| Claude transition | 3 |
| Claude optional | 1 |
| Claude structured | 1 |
| Codex retired opaque | 49 |
| Codex transition | 2 |
| Codex optional | 0 |
| Codex structured | 2 |
| Trellis released/current retiring opaque | 29 |
| Trellis pre-release-only | 1 |
| Root structured | 1 |

Retained Research outputs are validated exclusions, not stored as cleanup paths.

## 3. Loader validation

Reject:

- schema/source mismatch;
- empty path;
- absolute path;
- `..` segment;
- backslash or NUL;
- wildcard/glob syntax;
- trailing slash/directory entry;
- unsorted or duplicate arrays;
- overlap between any opaque/structured category;
- `.trellis/research` or descendant;
- exact retained worker or stage-skill output.

Export:

```ts
CURRENT_HOST_GENERIC_RETIRED_PATHS
CURRENT_HOST_GENERIC_TRANSITION_PATHS
CURRENT_HOST_GENERIC_OPTIONAL_PATHS
CURRENT_HOST_GENERIC_STRUCTURED_PATHS
CURRENT_HOST_GENERIC_CLEANUP_PATHS
```

All are `ReadonlySet<string>`.

## 4. Authoring/freeze check

Test/authoring code runs current collectors once before Child B changes them:

- Claude 62 outputs partition to 48 + 3 + 1 structured + 10 retained.
- Codex 63 outputs partition to 49 + 2 + 2 structured + 10 retained.
- Generic Trellis collectors produce 30 classified outputs.
- Optional statusline is checked separately.
- `.codex/skills/**` and excluded `linear_sync.py` are absent.

Any unclassified collector output fails the freeze test.

After Child B, runtime and prune logic read only frozen inventory. Collector-parity test may be retired only after snapshot acceptance is preserved by dedicated inventory tests.

## 5. Hash evidence

Use frozen `legacy-0.6.7-multi-host` template-hash evidence as bridge-release baseline.

Normalization must match existing `computeHash()` contract: CRLF -> LF, UTF-8 SHA-256.

An authoring verifier maps frozen target paths to fixture hashes and emits/verifies migration operations. It fails rather than inventing a hash.

`preReleaseOnlyOpaquePaths` are not admitted as published safe-delete operations. Existing per-install `.template-hashes.json` still governs ordinary uninstall preservation.

No runtime download or historical package execution.

## 6. Migration contract

Each operation:

```json
{
  "type": "safe-file-delete",
  "from": ".claude/agents/trellis-check.md",
  "reason": "Retire generated generic Claude Code asset",
  "allowed_hashes": ["<normalized-sha256>"]
}
```

Rules:

- exact file only;
- nonempty sorted unique lowercase hashes;
- no structured/retained/Research path;
- no directory/wildcard;
- no duplicate effective operation;
- `breaking: false`;
- `recommendMigrate: false`.

Current-template precedence remains unchanged. Child A manifest can ship before collector retirement without deleting active paths.

## 7. Manifest-prune integration

Surgical existing function edit:

```ts
buildKnownKeys()
```

Union every `CURRENT_HOST_GENERIC_CLEANUP_PATHS` entry into known keys. Keep existing active collector, registry, migration, protection, and path validation behavior.

Exact file recognition only. No cleanup-root prefix semantics.

GitNexus: LOW upstream risk; practical MEDIUM because `pruneOrphanManifestKeys()` feeds update/uninstall ownership planning. No HIGH/CRITICAL symbol edit planned.

## 8. Structured files

Child A validates existing exact scrub contracts for:

- `.claude/settings.json`
- `.codex/hooks.json`
- `.codex/config.toml`
- `AGENTS.md`

No Research-only rewrite yet. Tests prove exact obsolete structures scrub, user fields/retained Research entries survive, malformed input is byte-preserved, and repeated scrub is idempotent.

## 9. Update/uninstall behavior

Do not edit `update()`, `collectSafeFileDeletes()`, `executeSafeFileDeletes()`, `uninstall()`, or `buildPlan()`.

Tests exercise existing behavior with new inventory/manifest:

- prune cannot release frozen key before classification;
- current template suppresses delete;
- allowed released hash deletes;
- mismatch preserves;
- protected Research entry never resolves/accesses target;
- successful delete releases hash key;
- empty parent cleanup only;
- repeat is no-op.

## 10. Rollback

Before publication, remove new inventory/facade/manifest/tests and revert one `buildKnownKeys()` union. Active collectors remain, so ownership is not lost.

After Child B, restore active collection for affected path to suppress deletion. Never overwrite modified user content.

Published manifest mistakes require a newer corrective manifest; never rewrite published history.

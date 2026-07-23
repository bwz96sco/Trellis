# Current-host generic cleanup inventory and impact

## Decision

Use both:

1. `src/legacy/current-host-generic-cleanup.json` plus typed read-only facade for collector-independent exact ownership recognition.
2. New unreleased `0.7.0-beta.0.json` migration manifest for hash-backed `safe-file-delete` authority.

Paths live in inventory. Hashes live in migration manifest. Structured mixed files use scrubbers, never whole-file deletion. Neither artifact may install or regenerate generic assets.

No migration schema/loader change is required.

## Exact partition

### Claude collector

Current 62 paths:

- 48 definitely retiring opaque paths;
- 3 transition hooks;
- 1 structured mixed path;
- 10 retained Research paths.

Optional generated path outside collector:

- `.claude/hooks/statusline.py`

Structured:

- `.claude/settings.json`

Retained exclusions:

- `.claude/agents/trellis-research-worker.md`
- nine `.claude/skills/trellis-research-*/**` outputs.

### Codex collector

Current 63 paths:

- 49 definitely retiring opaque paths;
- 2 transition hooks;
- 2 structured mixed paths;
- 10 retained Research paths.

Structured:

- `.codex/hooks.json`
- `.codex/config.toml`

Retained exclusions:

- `.codex/agents/trellis-research-worker.toml`
- nine `.agents/skills/trellis-research-*/**` outputs.

Do not freeze `.codex/skills/**`; current collector emits none.

### Generic `.trellis`

- 27 generated script files;
- released v0.6.7 agents: `implement.md`, `check.md`;
- current-branch-only pre-release agent: `research.md`.

Do not include excluded source-only `scripts/hooks/linear_sync.py`.

### Root structured file

- `AGENTS.md`

### Totals

- 127 definitely retiring current opaque paths;
- 5 transition-sensitive hook paths;
- 1 optional Claude statusline;
- 4 structured paths;
- 20 retained Research host outputs excluded from cleanup.

Inventory authoring must derive exact descendants from current collectors, sort/dedupe, enforce these cardinalities, and fail on any unclassified path.

## Proposed inventory schema

```ts
interface CurrentHostGenericCleanupSnapshot {
  schemaVersion: 1;
  sourceVersion: "0.6.7";
  hosts: {
    "claude-code": {
      retiredOpaquePaths: string[];
      transitionOpaquePaths: string[];
      optionalOpaquePaths: string[];
      structuredPaths: string[];
    };
    codex: {
      retiredOpaquePaths: string[];
      transitionOpaquePaths: string[];
      optionalOpaquePaths: string[];
      structuredPaths: string[];
    };
  };
  trellis: {
    retiredOpaquePaths: string[];
    preReleaseOnlyOpaquePaths: string[];
  };
  root: { structuredPaths: string[] };
}
```

Facade exports exact read-only sets. Loader rejects absolute/traversal/backslash/NUL/wildcard/empty/unsorted/duplicate paths, path overlaps, Research descendants, retained workers, and retained stage skills.

## Hash evidence

Primary offline released evidence is frozen `test/fixtures/legacy-0.6.7-multi-host/.template-hashes.json`, cross-checked against current migration hash normalization and C01 fixture provenance.

Rules:

- do not fetch at runtime;
- do not hash dirty current sources and call them released;
- every destructive v0.6.7 operation needs at least one proven normalized SHA-256;
- fixture gaps remain inventory-only and block destructive cleanup for that path;
- `.trellis/agents/research.md` is pre-release-only and must not be labeled published;
- published manifests remain immutable.

Optional authoring/verification tooling may generate a manifest fragment from frozen local evidence. It never runs during update/uninstall.

## Migration policy

New `0.7.0-beta.0.json`:

- one exact `safe-file-delete` per opaque path with proven released hash;
- sorted unique lowercase hash arrays;
- no structured, retained, directory, wildcard, or Research path;
- `breaking: false`;
- `recommendMigrate: false`;
- no migration Task;
- current active template path suppresses deletion until Child B retires it.

Transition hook and statusline deletion remains suppressed while Child B retains those exact paths.

## Manifest pruning

Only planned production symbol edit:

```ts
buildKnownKeys()
```

Union `CURRENT_HOST_GENERIC_CLEANUP_PATHS` independently of active scripts/agents/platform collectors. Exact keys only; no root-prefix ownership.

This keeps opaque and structured ownership recognizable after collectors disappear. Existing migration `from`/`to` recognition remains additive.

## GitNexus impact

- `buildKnownKeys`: LOW upstream risk, 13 nodes, direct caller `pruneOrphanManifestKeys`.
- `pruneOrphanManifestKeys`: LOW reported; practical MEDIUM because update and uninstall consume its ownership result.
- `buildStructuredFileSpecs`: LOW; no edit expected.
- `collectSafeFileDeletes`, `executeSafeFileDeletes`, `buildPlan`, `update`, `uninstall`: no edit expected.

GitNexus missed one source-level caller for `collectSafeFileDeletes`; review must verify source flow, not graph alone.

If implementation needs any excluded symbol edit, stop and run fresh upstream impact first.

## Required tests

- inventory schema/cardinalities/partition/exclusions;
- collector freeze proof while collectors still exist;
- migration linkage and proven hash coverage;
- frozen exact keys survive pruning with collectors empty;
- unknown descendants still prune;
- `persist: false` writes nothing;
- current-template precedence suppresses safe delete;
- pristine released bytes delete;
- modified/missing/unknown/malformed preserve;
- four structured files scrub exact obsolete content only;
- `.trellis/research/**` protected against poisoned manifest entries;
- update and uninstall idempotent;
- confirmed-empty directory cleanup only;
- package later retains inventory/manifest without historical templates.

## Exclusions

Child A does not narrow collectors/generation, rewrite mixed file content, unregister commands, delete source/tests/specs, change CLI help, change core exports, or alter retained Research assets.

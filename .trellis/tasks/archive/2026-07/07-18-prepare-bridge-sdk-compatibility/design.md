# Design: 0.7 bridge SDK compatibility

## 1. Boundary

C11 changes proof and documentation, not public API behavior.

```text
Research-only CLI
  -> @mindfoldhq/trellis-core/research

External SDK consumers
  -> root | channel | mem | research | task | testing
```

Generic core subpaths remain published compatibility surfaces. Removed generic CLI commands stay removed.

## 2. Entry-point matrix

| Entry point | 0.7 status | Runtime contract |
|---|---|---|
| `@mindfoldhq/trellis-core` | Compatibility-only | Channel + Task root exports only. |
| `/channel` | Compatibility-only | Existing Channel values/types unchanged. |
| `/mem` | Compatibility-only | Existing Mem values/types and historical readers unchanged. |
| `/research` | Active | Sole production CLI core dependency and canonical Research SDK. |
| `/task` | Compatibility-only | Existing Task values/types unchanged. |
| `/testing` | Reserved | Importable empty runtime namespace and empty declarations. |

`./package.json` remains the metadata export. Export order and conditional target bytes are frozen through 0.7.

## 3. Test ownership

### Core package

Core owns package API compatibility:

- export map and target existence;
- root composition and non-leakage;
- explicit subpath imports;
- representative public values/types;
- Testing emptiness;
- deep-import blocking;
- packed runtime/declaration resolution.

### CLI package

CLI owns product boundaries:

- production source and clean build import only `/research`;
- generic SDK availability creates no Commander command;
- core/CLI versions match;
- packed CLI pins exact core version.

The current CLI export test is characterization input. Once equivalent core coverage passes, duplicate generic SDK assertions leave CLI ownership.

## 4. CLI import scanner

Scan static module specifiers in production files under:

```text
packages/cli/src/**/*.{ts,js}
packages/cli/dist/**/*.{js,mjs,cjs}
```

Recognize static `import`, `export ... from`, and literal dynamic `import()` specifiers. Any specifier beginning with `@mindfoldhq/trellis-core` must equal exactly:

```text
@mindfoldhq/trellis-core/research
```

Diagnostics include relative file and offending specifier. Tests, fixtures, templates, docs, and package metadata are not production modules.

## 5. Packed-core audit

Keep core audit independent from CLI audit to avoid reopening stable C10 proof.

### Unit-testable module

`packages/core/scripts/packed-core-audit.js` exports pure helpers for:

- tar entry normalization;
- tar listing parsing;
- exact export-contract validation;
- required/forbidden packed inventory derivation;
- packed entry audit.

Unsafe entries fail before extraction:

- absolute or Windows-drive paths;
- backslashes;
- controls/NUL;
- leading/trailing whitespace;
- empty, dot, or parent segments;
- duplicate separators;
- entries outside `package/`.

### Real package verification

`verify-packed-core`:

1. clean-builds core;
2. packs to repository-local temporary storage;
3. lists and validates entries;
4. reads packed package metadata;
5. validates exact name/version/exports;
6. extracts only after path validation to isolated temp storage;
7. creates a temporary consumer package with the tarball installed locally;
8. imports root and every public subpath;
9. checks root non-leakage and Testing emptiness;
10. compiles a strict NodeNext TypeScript fixture against declarations;
11. verifies an undeclared deep import fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`;
12. removes all temporary storage in `finally`.

No network or new dependency is required.

## 6. Package positioning

`packages/core/README.md` ships with the package and contains the exact entry-point table, version-window boundary, product/API separation, no-runtime-warning policy, and later-major handoff.

`package.json` description and keywords become Research-first while retaining compatibility domain discovery. Version, exports, files, sideEffects, and publish config remain unchanged except adding README to explicit packed inventory if needed for deterministic proof.

## 7. Release flow

```text
version alignment
  -> typecheck/tests
  -> build
  -> verify-packed-core
  -> verify-packed-cli
  -> publish plan
  -> publish core
  -> publish CLI
  -> public npm verification
```

Packed-core failure always occurs before first publish command.

## 8. Compatibility and security

No change to:

- generic source/barrels/runtime identities;
- Research ledger/schema/projections/locks;
- Dispatch tracked schemas or compatibility metadata;
- C07 provider-neutral context;
- C09 host adapter;
- cleanup inventories or migration evidence;
- current host generation.

The audits are release-time checks only. They do not execute during SDK imports or CLI runtime.

## 9. Rollback

All production additions are release/test/docs surfaces. If proof uncovers actual API drift, stop and repair the proof or open a separately approved compatibility defect; do not alter the frozen API to make tests pass.

Rollback by targeted forward edits only. Never reset inherited work. C16 remains blocked until a later semver-major decision.

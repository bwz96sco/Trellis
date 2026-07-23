# C11 GitNexus impact map

## Index

- Repository: `Trellis`
- Indexed/current commit: `c67afe1`
- Status: up-to-date

## Existing symbols planned for edit

### `verifyPackedCli`

- File: `packages/cli/scripts/release-preflight.js`
- Upstream risk: LOW
- Direct dependants: `main`
- Impacted count: 2
- Affected processes: 1
- Decision: preserve implementation and semantics; add a separate packed-core path.

### `main`

- File: `packages/cli/scripts/release-preflight.js`
- UID: `Function:packages/cli/scripts/release-preflight.js:main`
- Upstream risk: LOW
- Direct dependant: release-preflight file entrypoint
- Impacted count: 1
- Decision: bounded help/dispatch addition for `verify-packed-core` only.

### `CorePackageJson`

- File: `packages/cli/test/compatibility/core-package-exports.test.ts`
- Upstream risk: LOW
- Direct dependants: none
- Impacted count: 0
- Decision: move generic SDK contract ownership to core after equivalent tests pass; retain CLI-specific boundaries elsewhere.

## Manual non-symbol boundaries

GitNexus does not fully model string-key package and CI contracts. Review manually before and after:

- `packages/core/package.json` export-key order and exact targets;
- `packages/core/src/index.ts` root composition;
- `packages/core/src/testing/index.ts` empty namespace;
- `.github/workflows/publish.yml` step order;
- exact package versions and source/packed dependency relationship;
- docs-site and marketplace parent gitlink SHAs.

## Stop conditions

Stop before editing if new existing symbols show HIGH/CRITICAL risk, or if implementation requires core barrel, generic runtime, Research authority, migration, cleanup, version, docs-site, or marketplace changes.

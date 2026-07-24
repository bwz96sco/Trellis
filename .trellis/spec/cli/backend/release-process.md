# Release and Packed-Package Contract

## 1. Scope / Trigger

This specification applies to versioning, build, pack, publication, and any claim that a CLI command, template, hook, worker, skill, workflow, migration, compatibility module, or public SDK entry point ships in `@mindfoldhq/trellis` or `@mindfoldhq/trellis-core`.

Package proof requires clean builds and independent audits of both real packed tarballs. Source inspection, collector output, `npm pack --dry-run`, and dirty `dist` listings are insufficient.

### Procedure inventory and frozen successor scope

C04 requires all bundled Procedure pairs as additive packed entries while retaining current positive Research Skill inventory. C08-C10 additionally trigger this spec when Research Skill retirement evidence becomes required and active Research Skill source/payload paths become forbidden.

## 2. Signatures

Published packages:

```text
@mindfoldhq/trellis
@mindfoldhq/trellis-core
```

CLI aliases:

```json
{
  "trellis": "./bin/trellis.js",
  "tl": "./bin/trellis.js"
}
```

Required preflight:

```bash
node packages/cli/scripts/release-preflight.js check-versions
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli
node packages/cli/scripts/release-preflight.js publish-plan
```

Official publication is CI-only through `.github/workflows/publish.yml`.

### Procedure inventory and frozen successor signatures

The packed-CLI audit retains its entrypoints. C04 required inventory includes both registry-bound `procedure.json`/`PROCEDURE.md` files for all 14 Procedure IDs. C09 later adds immutable Research Skill retirement evidence and forbids active Research Skill roots.

## 3. Contracts

### Version lock

- CLI and core package versions are identical.
- Git tag `v<version>` matches both packages.
- Source CLI dependency is `workspace:*`.
- Packed CLI dependency on `@mindfoldhq/trellis-core` is the exact release version, never a range or workspace protocol.
- Core publishes before CLI, and CI verifies both public packages.

### Clean package proof

The core and CLI audits remain separate; do not refactor the stable CLI inventory audit into the core proof.

`verify-packed-core` must:

1. remove stale core build output through the package's clean build path;
2. build core and create a real npm tarball in repository-local temporary storage;
3. list and normalize every tar entry before extraction;
4. reject absolute, traversal, malformed, duplicate, or noncanonical paths and entries outside `package/`;
5. validate exact package identity/version and frozen export key order/condition targets;
6. derive required implementation and declaration entries from the packed export map;
7. require the packed README and reject source/test/config leakage;
8. extract only after path validation, install the tarball into an isolated local consumer without network access, import root and all five subpaths, compile a strict NodeNext fixture, prove root non-leakage and empty Testing, and reject a deep import;
9. remove all temporary storage in `finally`.

`verify-packed-cli` must:

1. remove stale CLI build output through the package's clean build path;
2. build the CLI and copy only indexed current templates;
3. create a real npm tarball;
4. list and normalize tar entries;
5. reject absolute, traversal, or malformed tar paths;
6. require approved Research and compatibility entries, including all 28 bundled Procedure assets and all nine current Research Skill files;
7. reject forbidden generic entries and prefixes;
8. verify the exact packed core dependency.

Both aliases execute the same built Commander parser. There is no separate `tl` command tree.

### Required inventory

The core tarball must include package metadata, `README.md`, and every unique runtime/declaration target derived from its exact export map. The README carries the 0.7 entry-point status matrix and documentation-only later-major handoff.

The CLI tarball must include:

- root/init/update/upgrade/uninstall/Research command implementation;
- exact Research and Dispatch command modules;
- one Claude and one Codex bounded Research worker;
- all 14 versioned Procedure directories, each with `procedure.json` and `PROCEDURE.md` at `1.0.0`;
- exactly nine current Research stage-skill `SKILL.md` files; C04 adds no negative Skill-removal assertion;
- approved Claude/Codex hooks and configuration templates;
- Research workflow/config/gitignore and marker-managed `AGENTS.md` template;
- native-workflow digest evidence;
- frozen current-host and retired-host cleanup evidence;
- every migration manifest;
- package metadata and bin entrypoint.

### Forbidden inventory

The core tarball rejects source, tests, scripts, coverage, repository configuration, and package-manager lock/config leakage. Internal built files may remain physically packed, but undeclared package deep imports must stay blocked by the exact export map.

The CLI tarball must reject, at minimum:

```text
dist/commands/channel/**
dist/commands/mem.*
dist/commands/workflow.*
dist/commands/research/task.*
dist/templates/common/commands/**
dist/templates/common/skills/**
dist/templates/codex/skills/**
dist/templates/trellis/agents/**
dist/templates/trellis/scripts/**
dist/templates/trellis/tasks/**
dist/templates/markdown/spec/**
retired host template roots
deleted generic utility modules
generic trellis-check/trellis-implement/old-research agents
active native workflow template
```

Generic CLI implementations and generic templates must be absent from source, clean `dist`, and the packed tarball.

### Release provenance

- Official publish runs only in CI.
- Local release validation may build, test, and pack but must not publish official packages.
- CI runs packed-core verification before packed-CLI verification, the publish plan, and either publish step. A packed-core failure therefore occurs before the first publish command.
- Published migration manifests and cleanup/digest evidence remain immutable compatibility records.
- Modified submodule SHAs must exist on their remotes before a version tag references them.
- Release staging must exclude `.trellis/`, `docs-site`, and `marketplace` from blanket staging.

### C04 Procedure compatibility

Packed core representative runtime/declaration consumers must import C04 Procedure/policy APIs through `@mindfoldhq/trellis-core/research`. Root composition, export-map keys, package versions, Testing emptiness, and deep-import blocking remain unchanged.

Packed CLI inventory must list every Procedure file explicitly and retain all existing positive Skill requirements. Existing recursive template copy supplies Procedure assets to clean `dist`; source presence or dirty build output is not proof.

### Frozen later-successor contracts

C09 changes packed inventory only after runtime cutover: add dedicated retirement evidence and reject all active Research Skill source/build/tar paths. Keep Procedures, workers, hooks, configs, commands, migration manifests, frozen generic cleanup evidence, exact core dependency, package versions, and generic core exports under their existing contracts.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Stale forbidden file exists only in old `dist` | Clean build removes it; tarball remains clean. |
| Core package identity/version/export order/target drifts | Packed-core audit fails before extraction. |
| Core README or declared runtime/declaration target is missing | Packed-core audit fails and names the entry. |
| Core tar contains duplicate, unsafe, noncanonical, source, test, script, or config entry | Reject before extraction. |
| Packed consumer cannot import a public subpath or compile declarations | Packed-core verification fails before publication. |
| Packed consumer resolves a deep import, root leaks Mem/Research/Testing, or Testing is non-empty | Packed-core verification fails. |
| Forbidden CLI file reappears after clean build | Packed-CLI audit fails and names the entry. |
| Required Research/compatibility entry is missing | Packed-CLI audit fails and names the entry. |
| Any bundled Procedure manifest/instruction file is missing | Packed-CLI audit fails with its exact versioned path. |
| Existing positive Research Skill requirement disappears during C04 | Packed-CLI audit fails; Skill retirement is not part of C04. |
| Packed core omits a representative C04 Research API or leaks it through root | Isolated runtime/declaration compatibility proof fails. |
| Tar entry is absolute/traversal/non-normalized | Normalization rejects it. |
| Packed core dependency differs from CLI version | Preflight fails. |
| `trellis` and `tl` expose different parsers | Parser/bin parity test fails. |
| Source collector is clean but tarball contains stale generic files | Release fails; collector output is not package proof. |
| One package is already public during CI rerun | Skip that publish idempotently and verify both afterward. |
| Local official publish is attempted | Prohibited; use CI. |

C04 matrix addition: any missing Procedure entry fails packed verification while current Skill entries remain required. C09 later adds evidence requirements and forbids retained active Research Skill entries. Stale dirty output cannot satisfy or invalidate either proof because verification clean-builds and packs a real tarball.

## 5. Good / Base / Bad Cases

- **Good**: independent clean builds produce a core tarball whose frozen exports import and typecheck from an isolated consumer, followed by a CLI tarball containing the exact Research payload, compatibility evidence, exact core pin, and no forbidden generic paths.
- **Base**: stale files existed in a developer's prior `dist`; each package clean build removes them before packing.
- **Bad**: asserting package safety from source exports, `collectResearchPlatformPayload()`, source paths, `npm pack --dry-run`, or a dirty build; extracting an unvalidated tarball; or coupling core proof to the CLI inventory audit.

### C04 Procedure cases

- **Good**: clean core tarball exposes representative C04 Research-subpath runtime/types only; clean CLI tarball contains all 28 Procedure files plus all nine current Skill files.
- **Base**: stale output exists in old `dist`; clean build recopies exact source Procedure inventory before pack.
- **Bad**: source assets, collector output, or packed inventory unit tests alone are claimed as packed proof.

### Frozen later-successor cases

- **Good**: after C09, clean tarball also contains retirement evidence and no active Research Skill path.
- **Bad**: source deletion alone is claimed as Skill-retirement packed proof.

## 6. Tests Required

- Core audit unit tests for tar-entry normalization, unsafe/noncanonical/duplicate paths, exact export contract, derived targets, missing inventory, and source/test/config leakage.
- A real clean-build packed-core integration proof covering packed runtime imports, declarations, root composition, empty Testing, and blocked deep imports.
- CLI audit unit tests for tar-entry normalization, required-entry failures, and forbidden exact/prefix failures.
- A clean-build packed-CLI tarball integration test.
- Exact all-14/all-28 versioned Procedure inventory plus exact nine-stage-skill inventory.
- Packed-core runtime/declaration consumer proof for representative Procedure/policy APIs through Research subpath only.
- Required native digest, cleanup inventory, and every migration manifest.
- Negative source/`dist`/tar assertions for generic command and template implementations.
- Built `trellis`/`tl` parser parity and exact root/Research/Dispatch sets.
- Exact packed CLI-to-core dependency check.
- CLI/core equal-version and tag/dist-tag checks.
- Fresh temporary repository smoke test for selected Claude/Codex Research output and update idempotency.

C04 tests require exact registry-bound Procedure entries, retained positive Skill entries, and real clean core/CLI tarball proof. Frozen later-successor tests additionally require retirement evidence, forbidden active Skill exact/prefix paths, migration rehearsal, and retained version/export/dependency compatibility.

## 7. Wrong vs Correct

```text
Wrong: package.json looks correct in source, so the published core SDK is compatible.
Correct: clean-build and pack core, validate all tar paths before extraction, derive targets from packed exports, then import and typecheck from an isolated packed consumer.
```

```text
Wrong: the collector emits no generic paths, so the npm package is clean.
Correct: clean-build, create the tarball, normalize its entries, require approved paths, and reject forbidden paths.
```

```text
Wrong: `npm pack --dry-run --json` output alone proves the published artifact.
Correct: audit a real packed tarball and fail on missing or forbidden normalized entries.
```

```text
Wrong: `tl` has a second parser that happens to look equivalent.
Correct: both bin names point to `bin/trellis.js`, which loads one Commander tree.
```

### C04: additive packed Procedure proof

```text
Wrong: Procedure source files exist, therefore package ships them.
Correct: clean-pack CLI, require all 28 versioned Procedure paths, and retain every current positive Skill requirement.
```

### Frozen later successor: Skill cutover

```text
Wrong: source no longer generates Skills, therefore package is clean.
Correct: after C09, clean-pack and require retirement evidence while forbidding every active Research Skill path.
```

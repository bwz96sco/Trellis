# Research: Minimal C04 Architecture and CLI Integration

- **Query**: Map C03 API/package boundary and smallest C04 integration for bundled Procedures, project policy, init, update, and uninstall.
- **Scope**: internal
- **Date**: 2026-07-24

## Findings

### Files Found

| File Path | Description |
|---|---|
| `packages/core/src/research/stage-capabilities.ts` | Immutable registry and capability resolution API. |
| `packages/core/src/research/index.ts` | Existing public `@mindfoldhq/trellis-core/research` barrel. |
| `packages/core/package.json` | Existing `./research` export; no new export-map key needed. |
| `packages/cli/src/commands/research/command.ts` | Explicit `trellis research init` implementation. |
| `packages/cli/src/commands/init.ts` | Root product init; force mode can overwrite ordinary templates. |
| `packages/cli/src/configurators/research-payload.ts` | Host-specific worker/Skill payload. C04 must not modify. |
| `packages/cli/src/commands/update.ts` | Removes all `.trellis/research/**` paths from desired templates. |
| `packages/cli/src/utils/protected-paths.ts` | Segment-aware Research protection and safe manifest paths. |
| `packages/cli/src/utils/manifest-prune.ts` | Keeps protected Research manifest keys; exact ownership only. |
| `packages/cli/src/commands/uninstall.ts` | Protects Research paths before filesystem access/deletion. |
| `packages/cli/src/templates/**` | Build-copied package assets. |
| `packages/cli/scripts/copy-templates.js` | Copies all non-TS template assets into `dist/templates`. |

### Current C03 Public Boundary

Public C03 APIs already live only at `@mindfoldhq/trellis-core/research`:

```ts
getResearchCapabilityDefinition(capabilityId)
resolveResearchCapability({ stage, capabilityId? })
RESEARCH_CAPABILITY_REGISTRY
RESEARCH_DEFAULT_CAPABILITY_BY_STAGE
RESEARCH_EXECUTION_HOSTS
```

`packages/core/package.json:25-29` already maps `./research` to `dist/research/index.*`. `packages/core/test/compatibility/package-exports.test.ts:78-135` blocks root leakage and deep imports. C04 needs Research-barrel exports only. No package version, export-map, root-barrel, or deep-import change.

### Recommended Package Split

Smallest stable split:

#### Core: pure bytes, schema, digest, authority

Add isolated modules under `packages/core/src/research/`:

- `strict-json.ts` — byte-level UTF-8/BOM/duplicate-key scanner plus JSON decode. Keep private unless a later contract needs it.
- `procedure-policy.ts` — public types and pure functions for:
  - canonical manifest serialization;
  - manifest/instruction byte validation;
  - Procedure digest;
  - strict policy parsing;
  - policy digest using existing `stableResearchJson` unchanged;
  - registry + Procedure + policy tightening evaluation;
  - automatic-eligibility result/reason set.

Export C04 public types/functions from `packages/core/src/research/index.ts`. Do not alter `packages/core/package.json` or root `packages/core/src/index.ts`.

Reason: C05/C06 need stable, host-neutral parsing/digest/effective-authority primitives. Core owns registry and public Research contracts. Pure core code avoids CLI/package-path coupling.

#### CLI: filesystem and package-root resolution

Add isolated CLI modules under `packages/cli/src/commands/research/` or `packages/cli/src/utils/`:

- `procedure-resolution.ts` — select project override vs bundled package root; reject symlinks, non-regular files, containment escapes, invalid pairs, and invalid bundled assets.
- `project-policy.ts` — strict contained policy read plus create-if-absent conservative policy for explicit Research initialization.
- `bundled-procedure-root.ts` — resolve package-internal `dist/templates/research/procedures` from `import.meta.url`; no project copy or host branching.

Resolver input should start from validated registry binding, not caller-supplied arbitrary IDs/versions. Return exact bytes, parsed manifest/policy, digest, source, and effective authority. No C05 events, C06 Context, or worker behavior.

### Bundled Assets

Recommended package-internal layout:

```text
packages/cli/src/templates/research/procedures/<id>/1.0.0/
  procedure.json
  PROCEDURE.md
```

`packages/cli/scripts/copy-templates.js:25-73` copies these files into `dist/templates/...`; `packages/cli/package.json:78-83` publishes `dist`. C04 should not copy bundled defaults into `.trellis/research/procedures/**`; that path is project override authority only.

Do not route Procedures through `collectResearchPlatformPayload()`. It is host-specific and currently emits workers plus nine Skills (`research-payload.ts:224-326`). Project policy and package-internal Procedures are host-neutral.

### Policy Creation Path

Normative phrase “Research initialization explicitly creates missing project policy” maps most narrowly to `trellis research init`, implemented by `initializeResearch()` at `packages/cli/src/commands/research/command.ts:133-180`, not root `trellis init`.

Recommended behavior:

- Non-dry-run explicit Research init creates exact conservative policy only when path is absent.
- Matching re-init may repair absence by creating policy; existing path in any form is never overwritten.
- Dry-run creates nothing.
- New helper leaves `writeFileAtomic()` unchanged and uses it only for a unique same-directory staging file. It then publishes `policy.json` through an atomic exclusive no-replace link, so a concurrent creator is preserved rather than overwritten.
- The create-only path stays outside ordinary `writeFile()` recording, so policy does not enter `.template-hashes.json` ownership.
- If product decision instead chooses root init, dedicated create-only helper remains mandatory. Root init maps `--force` to overwrite mode (`init.ts:426-437`), while ordinary `writeFile()` force-overwrites existing bytes (`file-writer.ts:150-157`).

### Update and Uninstall Preservation

Existing guards already satisfy normal preservation:

- `update.ts:103-112` protects `.trellis/research`.
- `collectTemplateFiles()` deletes every protected Research path from desired templates before update analysis (`update.ts:881-887`). Missing policy is therefore not silently created by update.
- `isProtectedResearchPath()` is segment-aware (`protected-paths.ts:15-20`).
- Manifest pruning keeps protected Research keys rather than converting them into destructive ownership (`manifest-prune.ts:173-186`).
- Uninstall checks protection before `path.join` or reads (`uninstall.ts:215-220`) and skips protected roots during empty-dir cleanup (`:347-381`).

No C04 edit needed in update, protected paths, manifest prune, or uninstall.

### Filesystem Resolution Pattern

Reuse pattern, not private implementation, from `dispatch-context.ts:251-259,286-360,402-482`:

1. Validate portable binding before join.
2. `lstat` each selected file/path component; reject symbolic links.
3. Require regular files.
4. `realpath` root and candidate.
5. Check `path.relative` containment; reject absolute/`..` escape.
6. Read exact `Uint8Array` bytes.
7. Strict-validate before digest.
8. Project override: only exact directory `ENOENT` permits bundled fallback; any other present-invalid state returns `INVALID_PROJECT_PROCEDURE`.
9. Bundled invalid state returns `INVALID_BUNDLED_PROCEDURE`.

C04 resolution can be read-only. C06 later re-resolves/revalidates bytes before Context; C04 must not add Context gates.

### External References

None. User prohibited web/network research.

### Related Specs

- `.trellis/spec/core/backend/research-state.md` — core Research ownership and public subpath.
- `.trellis/spec/cli/backend/filesystem-safety.md` — containment, symlink, exact-byte, preservation rules.
- `.trellis/spec/cli/backend/platform-integration.md` — current Skill payload remains active; C07-C09 own cutover.
- `.trellis/spec/cli/backend/release-process.md` — packed inventory ownership ambiguity.

## Resolved C04 decisions

- Exact 14 Procedure content plans, common inputs/outputs, seven-section shape, and Trellis-owned-only source adaptations are frozen in `procedure-content-matrix.md`; final English bytes and golden digests are implementation outputs.
- Policy creation belongs only to explicit `trellis research init`: fresh and matching replay may create an absent file, dry-run and conflict do not, and root init/update/uninstall never create or repair it.
- The `.trellis/research/**` preservation rule has one narrow exception for explicit Research-init absent-policy creation. Existing policy, Procedure overrides, and all other Research bytes remain immutable to lifecycle commands.
- C04 owns additive real-tarball proof for all 28 Procedure files while retaining every current positive Skill assertion. C09 owns negative Skill-source/payload removal and final cutover inventory.

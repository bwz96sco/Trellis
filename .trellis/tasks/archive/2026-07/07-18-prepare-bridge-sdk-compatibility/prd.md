# Prepare bridge SDK compatibility

## Goal

Harden the 0.7 `@mindfoldhq/trellis-core` compatibility bridge for a Research-only Trellis product. Keep generic core APIs importable without restoring generic CLI product surfaces, and block publication unless the real packed core tarball proves the frozen SDK contract.

## Requirements

### Public SDK classification

- Keep exact package export-key order:
  - `./package.json`;
  - `.`;
  - `./channel`;
  - `./mem`;
  - `./research`;
  - `./task`;
  - `./testing`.
- Keep exact `types`, `import`, and `default` targets for every conditional export.
- Keep `/research` active and non-deprecated.
- Keep root, `/channel`, `/mem`, and `/task` as compatibility-only APIs through the complete 0.7 line.
- Keep `/testing` reserved, importable, and empty.
- Keep root barrel composition unchanged: Channel and Task only. Do not leak Research, Mem, or Testing.
- Do not add wildcard exports or public deep-import paths.

### Behavior compatibility

- Preserve all generic runtime values, public types, signatures, identities, and behavior.
- Preserve Mem historical host readers and Task compatibility semantics.
- Preserve Research schema-v1, ledger/projection behavior, Dispatch metadata, stage capability resolution, and C07/C09 fail-closed validation.
- Compatibility exports never authorize generic Commander commands, init options, templates, agents, skills, or runtime routing.

### CLI dependency boundary

- Production CLI source and clean build may import Trellis core only through `@mindfoldhq/trellis-core/research`.
- Reject bare-root, generic subpath, Testing, deep-source, built-internal, suffixed, query, and fragment imports in production CLI files.
- Keep export-contract ownership in the core package. Keep CLI tests focused on product/import boundaries and exact version lock.

### Deprecation communication

- Update core package positioning and add a packed package README with an exact entry-point status table.
- Use documentation only. Do not add runtime warnings, npm package-wide deprecation, wrappers, altered identities, or mass per-symbol `@deprecated` annotations.
- State that generic API removal belongs to a later semver-major task after a real 0.7 compatibility window.
- Do not present Research as a drop-in replacement for Channel, Mem, or Task.

### Packed-core proof

- Add a core-owned audit of a real clean-built npm tarball.
- Derive required implementation and declaration targets from packed `package.json.exports`.
- Require exact package identity/version/export order/targets, README, and every declared target.
- Reject unsafe/noncanonical tar paths and source/test/config leakage.
- Import root and every public subpath from packed context.
- Compile a TypeScript fixture against packed declarations.
- Prove root non-leakage, empty Testing namespace, and blocked deep imports.
- Keep packed-core audit separate from the stable packed-CLI audit.

### Release ordering

- Add `verify-packed-core` to shared release preflight.
- CI must run packed-core verification before packed-CLI verification and before either package publish step.
- Preserve equal core/CLI versions, source `workspace:*`, packed CLI exact-version rewrite, core-first publication, and public npm verification.

## Constraints

- C10 parent must be archived before activation.
- No core export, barrel, generic implementation, Research authority, version, migration manifest, cleanup evidence, docs-site, or marketplace changes.
- No new dependency solely for tar/package inspection.
- No refactor of `packages/cli/scripts/packed-cli-audit.js`.
- Before editing any existing function, class, method, or interface, run GitNexus upstream impact. Warn and stop before unreviewed HIGH/CRITICAL impact.
- Preserve inherited dirty changes. No reset, clean, stash, broad checkout, merge, rebase, force push, or history rewrite.
- Independent review is required. No automatic commit.

## Acceptance Criteria

- [x] C10 parent is archived with `--no-commit` before C11 activation.
- [x] Exact core export order, condition keys, targets, and root composition remain unchanged.
- [x] `/research` is documented active; root/Channel/Mem/Task compatibility-only; Testing reserved/importable/empty.
- [x] Core-owned tests prove package export and representative runtime/type compatibility.
- [x] CLI-owned tests prove production source and clean build import only `/research`.
- [x] Core package description/keywords/README reflect Research-first compatibility positioning without a version or export change.
- [x] Packed-core unit tests reject unsafe paths, missing targets, forbidden leakage, and contract drift.
- [x] Real packed-core audit clean-builds, packs, safely inspects, imports all public entry points, compiles declarations, and blocks deep imports.
- [x] `verify-packed-core` exists and CI runs it before both publish steps.
- [x] Existing packed-CLI verification and exact core dependency proof remain unchanged and passing.
- [x] No runtime warning, mass annotation, wrapper, or generic function identity change is introduced.
- [x] Mem, Task, Research schema-v1, Dispatch, C07/C09, migration, and cleanup compatibility remain passing.
- [x] Executable SDK/release/testing code-specs contain the full cross-layer contract.
- [x] Focused tests, full core/CLI tests, lint, Python lint, typecheck, clean build, both package audits, and `git diff --check` pass.
- [x] GitNexus changed-scope review finds no unexplained C11 flow expansion.
- [x] Independent `trellis-check` reports no unresolved blocker.
- [x] C11 archives with `--no-commit`; no commit or push occurs.

# Implementation plan

## Step 0 — Reconfirm baseline and scope

- Confirm C03 commit `5034ac01` and only inherited `docs-site`/`marketplace` dirt.
- Confirm C04 is the only active child; C05-C10 remain planning.
- Record current Research-subpath exports, package versions/export maps/root barrel, packed CLI positive Skill inventory, Research-init behavior, and protected Research snapshots.
- Verify fresh GitNexus impacts before editing `initializeResearch` or packed inventory; do not edit HIGH/CRITICAL symbols.

Gate: planning/task/research files only. No production edit before activation.

## Step 1 — Add strict JSON foundation

- Add private duplicate-aware strict JSON scanner with fatal UTF-8 decoding.
- Reject BOM, comments, trailing tokens, invalid grammar, unpaired surrogate escapes, malformed numbers, and escaped-equivalent duplicate keys at every object depth; accept valid surrogate pairs.
- Do not add a dependency or change generic parsers.

Verify:

```bash
pnpm --dir packages/core exec vitest run test/research/strict-json.test.ts
```

Stop if a new dependency or generic parser edit appears necessary.

## Step 2 — Add pure Procedure/policy contracts

- Add public types, frozen semantic outputs without exposed mutable byte views, conservative policy bytes, canonical manifest serialization, manifest/instruction validation, exact digests, strict policy parsing with `INVALID_RESEARCH_POLICY` versus `POLICY_WIDENS_AUTHORITY` classification, effective-authority merge, and automatic eligibility.
- Consume C03 registry unchanged.
- Call `stableResearchJson` unchanged for policy digest.
- Export only through core Research subpath; update representative package-export and packed-core checks.

Verify:

```bash
pnpm --dir packages/core exec vitest run \
  test/research/strict-json.test.ts \
  test/research/procedure-policy.test.ts \
  test/research/stage-capabilities.test.ts \
  test/compatibility/package-exports.test.ts
pnpm --dir packages/core typecheck
pnpm --dir packages/core lint
```

Stop if export map, root barrel, package version, or registry edit is required.

## Step 3 — Author exact bundled Procedure assets

- Create canonical manifests and seven-section English instructions for all 14 Procedure IDs.
- Use only `research/procedure-content-matrix.md` and cited Trellis-owned `trellis-research-*` fallback templates.
- Include exact common input/output arrays; explicit limits; no bundled `replaces`.
- Validate every asset through production parser and freeze golden inventory/digest vectors.

Gate: no private/unprefixed/external Skill body inspection; no host-specific invocation or Skill trigger text.

## Step 4 — Add bundled/project Procedure resolution

- Add package-root resolution compatible with source and clean `dist`.
- Resolve capability before filesystem paths.
- Implement authoritative project presence, exact fallback, component symlink checks, regular-file/realpath containment, pre/post identity checks, exact byte reads, and source-specific errors.
- Ignore all unnamed siblings without directory enumeration; never open, validate, hash, own, or clean them.
- Do not edit `dispatch-context.ts`; duplicate only minimal isolated safety logic.

Verify:

```bash
pnpm --dir packages/cli exec vitest run \
  test/commands/research-procedure-resolution.integration.test.ts \
  test/compatibility/core-import-boundary.test.ts
```

Gate: any invalid present project candidate fails with no bundled fallback.

## Step 5 — Add strict project-policy filesystem handling

- Add contained strict policy read with pre/post identity checks and the one absent-file init exception.
- Capture contained parent-chain identity, reuse `writeFileAtomic` unchanged only to stage exact bytes at a unique same-directory sibling, repeat parent identity/realpath checks immediately before and after atomic exclusive no-replace publication, and verify the published named file is the staged regular-file identity; never call the writer’s replace-capable rename directly on final `policy.json`.
- On a concurrent destination winner, preserve and validate the winner with the same pre/post identity checks; return existing only when valid, otherwise fail without replacement.
- Preserve valid source bytes; reject existing invalid/symlink/non-regular paths without replacement.
- Keep policy outside template hashes and platform payload ownership.

Verify focused policy filesystem cases before command integration.

Stop if root init, update, uninstall, template hashes, payload collector, protected paths, or manifest pruning needs modification.

## Step 6 — Integrate explicit Research init

- Run/confirm upstream impact for `initializeResearch` immediately before edit.
- Preserve conflict behavior before policy repair.
- Fresh/matching init ensure or validate policy; dry-run writes nothing; conflict returns before repair.
- Test concurrent valid and invalid policy creation so no existing winner is overwritten.
- Keep initialization events/projections/replay semantics unchanged.
- Accept recoverable policy-first partial state; add no cross-store transaction.

Verify:

```bash
pnpm --dir packages/cli exec vitest run \
  test/commands/research-policy-init.integration.test.ts \
  test/commands/research.integration.test.ts \
  test/commands/init-research-only.integration.test.ts \
  test/commands/init.integration.test.ts \
  test/commands/update.integration.test.ts \
  test/commands/uninstall.integration.test.ts
```

Rollback point: this is the only existing Research command function C04 may change.

## Step 7 — Add additive packed proof

- Run/confirm upstream impact for packed inventory builder before edit.
- Require all 28 Procedure files in real packed CLI tarball.
- Retain all current positive Skill requirements and add no negative removal checks.
- Update packed-core representative C04 Research-subpath imports.
- Rely on existing recursive template copy; do not add copy logic unless planning is revisited.

Verify:

```bash
pnpm --dir packages/cli exec vitest run test/scripts/packed-cli-audit.test.ts
pnpm --dir packages/core build
pnpm --dir packages/cli build
node packages/core/scripts/verify-packed-core.js
node packages/cli/scripts/release-preflight.js verify-packed-cli
```

## Step 8 — Update executable code-specs

Update only implemented behavior, preserving all seven mandatory sections:

```text
.trellis/spec/core/backend/research-state.md
.trellis/spec/cli/backend/filesystem-safety.md
.trellis/spec/cli/backend/commands-research.md
.trellis/spec/cli/backend/release-process.md
.trellis/spec/cli/unit-test/conventions.md
```

Do not update platform integration to claim worker/Skill cutover.

## Step 9 — Full verification

Run sequentially:

```bash
pnpm --dir packages/core test
pnpm --dir packages/core lint
pnpm --dir packages/core typecheck
pnpm --dir packages/core build
pnpm --dir packages/cli test
pnpm --dir packages/cli lint
pnpm --dir packages/cli lint:py
pnpm --dir packages/cli typecheck
pnpm --dir packages/cli build
pnpm typecheck
pnpm build
node packages/core/scripts/verify-packed-core.js
node packages/cli/scripts/release-preflight.js verify-packed-cli
uv run python ./.trellis/scripts/task.py validate \
  .trellis/tasks/07-23-add-procedure-project-policy-resolution
git diff --check
```

Also prove:

- `stableResearchJson`, `writeFileAtomic`, and `collectResearchPlatformPayload` unchanged;
- package versions/export maps/root barrel unchanged;
- C03 registry, C02 events/projections, Context, workers/hooks/Skills, root init, update, uninstall, cleanup evidence, docs-site, and marketplace unchanged;
- `.trellis/research/**` preservation regressions pass;
- no network access or package-install fallback occurred.

## Step 10 — Independent review and closeout

- Run GitNexus changed-scope detection before commit; explain any unexpected flow.
- Return control to main session for independent `trellis-check`; implementation agent must not dispatch another Trellis agent.
- Fix only confirmed C04 defects and rerun affected plus final full checks.
- Archive with `task.py archive --no-commit` only after review passes.
- Stage only C04 files; exclude `docs-site` and `marketplace`.
- Commit under existing ordered-child authorization; no push.

Stop and return to planning if implementation needs any HIGH/CRITICAL edit, C05 event/approval behavior, C06 Context gate, C07 worker change, C08/C09 Skill retirement, package/export/version/root-barrel change, destructive Research migration, or external/private Skill content.

# Implementation plan

## Step 0 — Baseline and impact

- Confirm C09 archive complete and Child B/C untouched.
- Record current collector outputs and fixture hash coverage before changes.
- Reuse GitNexus LOW impact for `buildKnownKeys`; run new impact before any other existing symbol edit.
- Run focused manifest/update/uninstall baseline.

## Step 1 — Freeze exact path snapshot

- Add JSON snapshot with exact partitions and provenance.
- Add typed validating facade and immutable exported sets.
- Add schema, path safety, sorting, uniqueness, overlap, cardinality, and Research-exclusion tests.
- Add collector freeze test proving every current output classified.

Verify:

- Claude 62 and Codex 63 outputs fully partition;
- Trellis 30 outputs classified;
- optional statusline classified;
- no retained Research output in cleanup set.

Rollback point: new files/tests only.

## Step 2 — Wire manifest pruning

- Import cleanup set into `manifest-prune.ts`.
- Add exact keys inside `buildKnownKeys()`.
- Do not alter descendant ownership, path validation, persistence, or prune sequencing.
- Add tests with active collectors mocked empty and `persist: false`.

Verify:

- frozen keys retained;
- unknown descendants pruned;
- invalid/protected entries handled unchanged;
- zero writes for non-persistent plan.

Rollback point: one production function plus tests.

## Step 3 — Author hash evidence

- Parse frozen v0.6.7 fixture template hashes.
- Cross-check normalization against `computeHash()` tests.
- Build deterministic authoring/verifier output for eligible released opaque paths.
- Fail on missing evidence; do not substitute current-source bytes.
- Mark `.trellis/agents/research.md` pre-release-only.

Verify deterministic sorted output and source provenance.

## Step 4 — Add unreleased migration manifest

- Add `0.7.0-beta.0.json` without modifying older manifests.
- Add one exact operation per proven path/hash set.
- Exclude structured, transition-retained, optional-retained, pre-release-only, and Research paths unless exact Child A deletion safety is proven.
- Keep non-breaking/no-migrate metadata.

Verify schema loading, no duplicates/conflicts, current-template precedence, and package inclusion.

## Step 5 — Integration safety tests

Exercise existing update/uninstall flow without changing executors:

- released pristine delete;
- modified preserve;
- missing harmless;
- current template suppresses delete;
- statusline retained/deleted only by explicit proven state;
- poisoned Research path protected;
- structured scrub exact/malformed/user-content matrix;
- hash-key release after delete;
- repeated update/uninstall idempotent;
- empty-directory-only cleanup.

Use temp fixtures. Never mutate repository canonical `.trellis/research`.

## Step 6 — Code-spec update

Update migration, update, uninstall, and shared configurator code-specs with all seven executable-contract sections where cross-layer behavior changes.

Document:

- inventory/facade signatures;
- manifest item schema;
- validation/error matrix;
- current-template precedence;
- exact ownership versus root membership;
- published versus pre-release provenance;
- required tests and wrong/correct examples.

## Step 7 — Independent implementation/check

After task validation and activation:

1. Dispatch `trellis-implement`.
2. Run focused tests.
3. Dispatch independent `trellis-check`.
4. Fix only confirmed Child A issues.
5. Repeat until no blocker.

No agent commit.

## Step 8 — Verification

Focused suites:

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/legacy/current-host-generic-cleanup.test.ts \
  test/utils/manifest-prune.test.ts \
  test/utils/template-hash.test.ts \
  test/utils/uninstall-scrubbers.test.ts \
  test/commands/update-internals.test.ts \
  test/commands/update.integration.test.ts \
  test/commands/uninstall.integration.test.ts \
  test/commands/init-uninstall-overdelete.integration.test.ts \
  test/legacy/retired-host-cleanup.test.ts \
  test/compatibility/legacy-installation-compatibility.test.ts
```

Package/workspace:

```bash
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis lint:py
pnpm --filter @mindfoldhq/trellis typecheck
pnpm typecheck
pnpm --filter @mindfoldhq/trellis build
git diff --check
```

Also verify no active collector/template/command/core/Research file changed beyond approved task allowlist.

## Step 9 — Close

- Check acceptance from evidence.
- Run GitNexus change detection and explain inherited dirty-worktree breadth.
- Archive with `--no-commit`.
- Only then plan/activate Child B.

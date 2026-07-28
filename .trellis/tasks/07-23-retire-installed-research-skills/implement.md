# Implementation Plan — C08

## Preconditions (planning complete; execution not authorized yet)

- [x] C06/C07 archived; Procedure workers active.
- [x] Parent plan approved for **planning only**.
- [ ] C08 `prd.md` / `design.md` / `implement.md` / jsonl complete.
- [ ] Independent planning review PASS.
- [ ] Explicit user instruction to execute C08 (`task.py start` + production edits).
- [ ] Record inherited dirty scope: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace` — never stage/reset these for C08.
- [ ] Before any existing function/class/method edit: fresh GitNexus upstream impact. Stop for confirmation if HIGH/CRITICAL.
- [ ] No commit, archive, publish, or push without separate authorization.

## Stage 0 — Baseline snapshot

1. Record branch, package version, dirty paths.
2. Run focused payload/update/uninstall baselines (expect Skills still generated until Stage 3).
3. Confirm dormant nine Skill roots still exist under `packages/cli/src/templates/common/bundled-skills/`.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/templates/research-payload-exact.test.ts \
  test/commands/update.integration.test.ts \
  test/commands/uninstall.integration.test.ts \
  test/legacy/retired-host-cleanup.test.ts
```

**Rollback point:** no production changes.

## Stage 1 — Immutable provenance research (stop gate)

1. Re-fetch primary npm packument for `@mindfoldhq/trellis` (and only other scopes if explicit evidence points there).
2. For every candidate version that might contain stage Skills:
   - record version, tarball URL, SHA-1, SHA-512 integrity;
   - download and verify integrity before extract;
   - list tar for `trellis-research-*/SKILL.md` and related skill files;
   - if present, reproduce installed Claude/Codex bytes with historical package renderer only;
   - hash exact installed bytes (document normalization).
3. Write research note under task `research/provenance-immutable-releases.md` with accept/reject table.
4. **Stop gate for deletion authority:** if fewer than 18 proven path/hash pairs, document which paths are unproven. Do not invent hashes. Generation stop may continue; migration items only for proven paths.

### Planning-time provisional result (must re-verify at execution)

- `0.6.5`–`0.6.9` tarballs verified SHA-1 OK; **0** stage Skill SKILL.md entries.
- `0.7.0-beta.0` / `0.7.0-beta.1` **unpublished** on registry.
- Public multi-host line is **not** proven Research stage Skill provenance as of 2026-07-27.

**Rollback point:** research notes only.

## Stage 2 — Retirement evidence module

1. Add:

```text
packages/cli/src/legacy/research-skill-retirement.json
packages/cli/src/legacy/research-skill-retirement.ts
```

2. Implement strict loader (schema, 18-path completeness when claiming full authority, path safety, sorted unique lowercase hashes, host/root checks, reject `.trellis/research/**`).
3. If Stage 1 yields zero proven pairs, ship a **fail-closed incomplete** evidence state that forbids deletion rather than empty silent authority — exact representation chosen so loaders/tests cannot treat unproven paths as deletable.
4. Add `packages/cli/test/legacy/research-skill-retirement.test.ts`.
5. Evidence must not be written into user projects by init/update collectors.

**Immediate checks**

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/legacy/research-skill-retirement.test.ts
```

**Rollback point:** delete new legacy files + test.

## Stage 3 — Stop generating Skills

1. Fresh GitNexus impact on:
   - `collectResearchSkills`
   - `collectClaudePayload`
   - `collectCodexPayload`
   - `collectResearchPlatformPayload`
   - `writeResearchPlatformPayload`
2. If HIGH/CRITICAL, warn user and wait.
3. Edit `packages/cli/src/configurators/research-payload.ts`:
   - remove active generation use of `getResearchStageSkillTemplates` / `RESEARCH_STAGE_SKILL_NAMES`;
   - Claude/Codex maps start empty then add only worker/hooks/config/statusline;
   - preserve public collect/write signatures and byte parity for remaining assets.
4. Keep nine dormant source templates and any loader still needed by packed positive audit/tests.
5. Update `test/templates/research-payload-exact.test.ts` (and related init tests) to expect zero Skill paths while successor assets remain exact.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/templates/research-payload-exact.test.ts \
  test/commands/init-research-only.integration.test.ts \
  test/commands/init.integration.test.ts
```

**Rollback point:** restore skill collection in `research-payload.ts` and test expectations.

## Stage 4 — Forward migration + agreement checks

1. Re-check unpublished status of candidate forward version.
2. Add new manifest (preferred candidate `0.7.0-beta.1.json`) **only** with proven `safe-file-delete` items.
3. Never amend published manifests; avoid mixing into `0.7.0-beta.0.json` generic cleanup unless explicitly decided.
4. Add agreement helper/test: evidence hashes ⇔ migration `allowed_hashes` for Research retirement set; fail closed.
5. If Stage 1 proves zero paths, migration may contain zero Research Skill deletes; document that cleanup is generation-stop-only until provenance lands.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/migrations/index.test.ts \
  test/legacy/research-skill-retirement.test.ts
```

**Rollback point:** remove forward manifest + agreement test.

## Stage 5 — Harden update safe deletion

1. Fresh impact on `collectSafeFileDeletes`, `executeSafeFileDeletes`, related helpers.
2. Strengthen classify/execute to satisfy design §8 (protection-first, lstat, planned content, pre-unlink revalidation, ownership retention rules, non-recursive empty rmdir).
3. No Research-specific bypass of `update.skip`.
4. Tests: dry-run, cancel, update.skip, current-template precedence, pristine delete, modified preserve, symlink reject, classify/execute race, research path preservation.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/update.integration.test.ts \
  test/commands/update-internals.test.ts
```

**Rollback point:** revert `update.ts` only.

## Stage 6 — Bind uninstall to triple intersection

1. Fresh impact on uninstall plan/revalidate paths.
2. For 18 retired paths, require evidence ∩ migration ∩ ownership match.
3. Preserve untracked/modified/symlink/malformed/concurrent/external cases.
4. Prefer tests proving `manifest-prune.ts` retains exact keys without code change.
5. Tests: ownership intersection, malformed fail-closed, concurrent mutation, idempotence, empty-dir cleanup, `.trellis/research/**` preservation.

```bash
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/uninstall.integration.test.ts \
  test/utils/manifest-prune.test.ts
```

**Rollback point:** revert uninstall changes only.

## Stage 7 — Specs (C08-stage wording)

Update in place:

- migrations, release-process, directory-structure, platform-integration
- research-worker-hooks, commands-update, commands-uninstall, filesystem-safety
- unit-test integration-patterns + conventions

Must distinguish:

1. generation retired;
2. source/packed Skills temporarily retained;
3. evidence + exact-path cleanup active (only for proven paths).

Do not claim C09 negative packed inventory yet.

## Stage 8 — Full verification

```bash
# Focused C08 suites
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/legacy/research-skill-retirement.test.ts \
  test/templates/research-payload-exact.test.ts \
  test/commands/update.integration.test.ts \
  test/commands/uninstall.integration.test.ts \
  test/utils/manifest-prune.test.ts \
  test/migrations/index.test.ts

# Full CLI + Core
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis test

# Quality
pnpm --filter @mindfoldhq/trellis run lint
pnpm --filter @mindfoldhq/trellis run lint:py
pnpm --filter @mindfoldhq/trellis run typecheck
pnpm --filter @mindfoldhq/trellis run build
pnpm --filter @mindfoldhq/trellis-core run build

# Packed audits (Skills still positive through C08)
pnpm --filter @mindfoldhq/trellis exec node scripts/packed-cli-audit.js
# + existing packed-core / release-preflight entrypoints used by the repo

# Task + diff hygiene
uv run python .trellis/scripts/task.py validate 07-23-retire-installed-research-skills
git diff --check
```

Also:

- GitNexus `detect_changes` before any authorized commit;
- independent trellis-check / review;
- every no-write claim backed by complete filesystem snapshots.

## Acceptance checklist (execution)

- [ ] Provenance table complete; unproven paths have no deletion authority.
- [ ] Evidence loader fail-closed.
- [ ] Fresh hosts generate zero stage Skill dirs.
- [ ] Successor assets byte-exact.
- [ ] Dormant source + positive packed Skill inventory retained.
- [ ] Migration agrees with evidence for proven paths only.
- [ ] Update/uninstall safety matrix green.
- [ ] `.trellis/research/**` preserved in all cases.
- [ ] Specs match C08-stage contract.
- [ ] Full gates pass; independent review PASS.

## Explicit non-actions

- Do not start C09/C10.
- Do not archive C08 or parent.
- Do not publish npm packages.
- Do not stage inherited dirty paths.
- Do not force-push / reset / stash / rewrite history.

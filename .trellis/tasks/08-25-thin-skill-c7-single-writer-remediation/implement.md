# C7 Single-Writer Remediation Implementation

## Sequence

1. Validate planning artifacts and activate this child task.
2. Implement capture/verify script with literal commit, predecessor, path, hash, size, and inventory contracts.
3. Capture two exact Git blobs from `86df5a6`; write baseline README and manifest.
4. Run self-contained verification.
5. Build Core package required by CLI integration test.
6. Run unchanged full source-admin integration test with absolute guarded-helper env path.
7. Record exact proof and forward-only decision from observed results.
8. Re-run verifier, integration test, task validation, and `git diff --check`.
9. Confirm diff scope; run GitNexus `detect_changes` against `variant/research-workflow`.
10. Commit with normal hooks, archive task, record journal, and stop without push.

## Verification Commands

```bash
uv run python \
  .trellis/tasks/08-25-thin-skill-c7-single-writer-remediation/research/build_source_authority_baseline.py \
  --verify

NODE_OPTIONS= pnpm --filter @mindfoldhq/trellis-core build

NODE_OPTIONS= PYTHONDONTWRITEBYTECODE=1 \
TRELLIS_RESEARCH_QUEST_ADMIN="$PWD/.trellis/tasks/08-25-thin-skill-c7-single-writer-remediation/research/source-authority-baseline/files/skills/research-quest-admin/scripts/research_quest_admin.py" \
pnpm --filter @mindfoldhq/trellis exec vitest run \
  test/commands/research-quest-source-admin.integration.test.ts

uv run python ./.trellis/scripts/task.py validate \
  .trellis/tasks/08-25-thin-skill-c7-single-writer-remediation

git diff --check
```

## Review Gates

- No product symbol edit; if one becomes necessary, stop before edit and run required upstream impact analysis.
- No baseline capture from source filesystem.
- No passing proof before both verifier and full integration suite pass.
- No archive before proof, decision, task validation, scope check, and GitNexus change detection pass.
- No provider/model process, managed worker, live evaluation, migration, push, release, or publication.

## Commit Boundary

Work commit contains only new remediation task artifacts plus parent child-link/task bookkeeping. Existing unrelated dirty GitNexus skill files, `AGENTS.md`, and `CLAUDE.md` remain untouched and unstaged. Archive and journal use normal Trellis follow-up commits.

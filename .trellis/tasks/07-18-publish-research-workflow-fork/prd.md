# Publish Trellis research workflow fork

## Goal

Commit completed root Research Workflow V1 and publish it as a root-only public fork at `bwz96sco/Trellis`, without losing or misattributing unrelated and submodule-local work.

## Requirements

- Create root branch `variant/research-workflow` from unchanged upstream-aligned `main`.
- Commit V1 product changes through an explicit root allowlist.
- Commit eight completed `07-17-*` V1 task records separately.
- Keep `.claude/skills/gitnexus/**`, `AGENTS.md`, and `CLAUDE.md` unstaged.
- Keep `.gitmodules` and root submodule gitlinks unchanged.
- Do not commit, branch, push, or reconfigure `docs-site` or `marketplace`.
- Preserve dirty docs and marketplace files exactly.
- Create only public fork `bwz96sco/Trellis`.
- Configure root `origin` as fork and `upstream` as `mindfold-ai/Trellis`.
- Push only `variant/research-workflow`; keep fork `main` as upstream mirror.
- Make `variant/research-workflow` fork default branch.
- Do not create PRs, releases, tags, issues, or force-pushes.
- Run mandatory GitNexus staged change detection before every commit.
- End every commit message with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Report known limitation: clean recursive clone lacks local docs/marketplace edits and retains marketplace/template parity mismatch.

## Acceptance Criteria

- [x] Root implementation commit contains only V1 code, tests, templates, specs, and root dogfood files.
- [x] Separate task-record commit contains only eight completed `07-17-*` directories.
- [x] Publication-task record is committed separately after remote verification.
- [x] Root fork exists at `bwz96sco/Trellis`.
- [x] Remote branch `variant/research-workflow` matches local `HEAD`.
- [x] Fork default branch is `variant/research-workflow`.
- [x] Fork `main` contains no custom V1 commits.
- [x] `.gitmodules` and root gitlinks remain unchanged.
- [x] Submodule remotes, branches, and histories remain unchanged.
- [x] Dirty docs and marketplace edits remain present and uncommitted.
- [x] Unrelated GitNexus/instruction files remain unstaged.
- [x] Root verification and diff checks pass in current worktree.
- [x] Clean-clone marketplace parity mismatch is verified and reported, not hidden.
- [x] No PR, release, tag, issue, force-push, reset, clean, or stash occurs.

## Notes

User explicitly selected root-only publication despite complete three-fork topology being required for fully reproducible docs/marketplace state. This task preserves those submodule edits locally for later publication.

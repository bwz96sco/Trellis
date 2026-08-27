# Integrate upstream Trellis into Research fork

## Goal

Integrate pinned upstream Trellis commit `64e663694201005bc87766ef22de89b8da3d4d79` into completed Research migration tip `f2f4e5259dceeb2ae7ed1019024eca826eb52aaa`, preserving Research authority and reduced product surface while adopting compatible upstream safety fixes.

## Background

- Common ancestor: `51a5674ce6ce5a12cb585c5dcb21e7b76a51bdbc`.
- Integration base is 218 commits ahead and 126 commits behind pinned upstream.
- Long-lived local variant currently points to `a5934614b15abdd73214b3681cdb5ea381eff743`.
- Dedicated Research package/command/state roots were not changed by upstream, but shared task/session, hooks, update/migration, Codex, release, version, and submodule paths overlap semantically.
- Existing dirty work remains in another worktree and must not be modified.

## Requirements

1. Merge exact pinned upstream commit with a two-parent merge commit; do not rebase or reconstruct completed Research history.
2. Preserve active CLI commands exactly: `init`, `update`, `upgrade`, `uninstall`, `research`.
3. Preserve supported hosts exactly: Claude Code and Codex.
4. Keep generic `mem`, `workflow`, `platforms`, `channel`, generic agents/Skills, and other platform surfaces inactive and absent from packed payload.
5. Preserve Research package inventory: 16 versions, 30 declared members, 62 required packed assets with authenticated bytes.
6. Preserve root-only canonical Research writes, Proposal-only workers, explicit completion/transitions, no nested execution, and protected `.trellis/research/**` state.
7. Integrate compatible upstream fixes for task/session/path safety, shared hooks, update/migration/uninstall, and Codex config preservation.
8. Preserve malformed or user-modified config instead of overwriting it.
9. Keep generic Trellis task refs repository-contained. Cross-repository Research access must remain bounded to canonical control root plus explicitly registered managed roots.
10. Preserve frozen Research gitlinks `docs-site@be7684f2086abb9b8e24d4d35733a7dda3123a0f` and `marketplace@d7a18bb5411c700237d21483d6889ac296ef0301`: the I3 installed-package subject authenticates those exact protected commits, so this is the plan's Research-specific pin dependency. Do not change `.gitmodules` or modify either submodule independently.
11. Reconcile package versions, lockfile, migration manifests, and release checks coherently without publishing a release.
12. Exclude `evidence/v13-baseline`-only commits `42d7e459`, `15bc7207`, and `fdca1d73`.
13. Do not push, open PR, publish, tag, invoke Research workers/providers/models, create C11, or claim blocked live gates passed.

## Acceptance Criteria

- [ ] Merge commit parents/ancestry include exact `f2f4e525...` and `64e66369...`.
- [ ] All completed Research commits remain reachable; three excluded evidence commits remain outside final ancestry.
- [ ] CLI help and registry expose exactly five approved commands.
- [ ] Host registry exposes exactly Claude Code and Codex.
- [ ] Removed commands fail before filesystem writes.
- [ ] Packed CLI contains every required Research asset and zero forbidden generic entries.
- [ ] Research package/member identities and hashes remain exact.
- [ ] Focused regressions prove each synthesized upstream safety fix.
- [ ] Core/CLI full tests, lint, build, typecheck, packed audits, installed smoke, and version checks pass.
- [ ] GitNexus impact and final change detection are reviewed; HIGH/CRITICAL flows are surfaced before commit.
- [ ] Original dirty worktree diff hash, untracked inventory, and submodule state remain unchanged.
- [ ] Dedicated task is archived and journaled after merge/work commit.
- [ ] Local `variant/research-workflow` advances atomically; remote refs remain unchanged.

## Out of Scope

- New Research features or package migrations.
- Provider/model evaluation or auxiliary-model routing work.
- Generic upstream platform/product reactivation.
- Submodule publication or independent submodule changes.
- Release/version branding beyond coherent upstream baseline integration.

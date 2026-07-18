# Design — Root-only Trellis fork publication

## Boundary

Root repository is sole publication target. `docs-site` and `marketplace` remain independent dirty submodules pinned to official `mindfold-ai` commits. Root commit cannot embed their worktree files; no gitlink or `.gitmodules` change will pretend otherwise.

## Commit topology

```text
upstream/main (51a5674c)
  └─ feat(research): add managed multi-repository workflow
      └─ chore(trellis): record completed research workflow tasks
          └─ chore(trellis): record research fork publication
```

Branch: `variant/research-workflow`.

Root remotes after fork creation:

```text
origin   https://github.com/bwz96sco/Trellis.git
upstream https://github.com/mindfold-ai/Trellis.git
```

Fork `main` remains upstream mirror. Variant branch becomes GitHub default.

## Staging authority

Use explicit allowlists for each commit. Never use `git add .` or `git add -A`.

Product commit owns:

- `packages/core/**`
- `packages/cli/**`
- `.trellis/scripts/common/active_task.py`
- `.trellis/spec/cli/backend/**`
- `.trellis/spec/core/backend/**`
- `.trellis/workflow.md`

Task commit owns only eight completed `07-17-*` research task directories.

Publication record commit owns only this `07-18-*` task directory.

## Verification model

Current worktree validation uses dirty marketplace mirror and can pass full tests. Clean recursive clone retains official marketplace commit and therefore does not reproduce mirror parity. Validate both facts separately:

1. Run full current-worktree checks.
2. Compare committed bundled workflow against marketplace file at recorded official gitlink to prove expected clean-clone mismatch.

No result may claim three-repository reproducibility.

## External action policy

GitHub actions are limited to creating `bwz96sco/Trellis`, configuring root remotes, pushing variant branch, and setting default branch. No submodule fork, PR, release, tag, issue, or history rewrite.

## Rollback

Before push, stop with local commits intact. After push, use corrective or revert commits only. Never reset, delete, force-push, clean, or alter submodule worktrees.

# Frozen Thin-Skill Source Baseline

This directory preserves exact source bytes selected for C1 of the thin-skill Research orchestration pilot.

```text
source repository: /Users/zhangbowen/Projects/agent-skills-private
branch: chore/retire-find-skills
base commit: e2b0d70e3a797f19461eb106601de12250000b69
files: 19
manifest schema: 1
```

The source repository was dirty. `baseCommit` identifies the committed base only; each copied file is independently authenticated from working-tree bytes by mode, size, and SHA-256. Later implementation children must consume `files/` and `manifest.json`, not mutable ambient source paths.

Run verification from the Trellis worktree:

```bash
uv run python .trellis/tasks/08-21-thin-skill-c1-freeze-contracts/research/build_source_baseline.py --verify
```

Creating another baseline requires a new forward task/version. Do not overwrite this snapshot after C1 completion.

# Guarded Quest Source-Authority Baseline

This directory authenticates the forward source dependency used to re-prove C7's Quest single-writer boundary.

```text
source repository: /Users/zhangbowen/Projects/agent-skills-private
source branch: chore/retire-find-skills
predecessor commit: e2b0d70e3a797f19461eb106601de12250000b69
guarded commit: 86df5a676c52950592ff9fe5966b9c1753160cb5
changed paths: 1
files: 2
baseline digest: sha256:8bacc5d832af03c66939d14ef29de4d6cdbe64077e79aa00e0c50b9ed882097d
manifest schema: 1
```

Capture reads exact Git blobs from the guarded commit. It never reads helper bytes from the mutable source working tree. Verification reads only this task-local baseline and the immutable C1 predecessor baseline.

Run verification from the Trellis worktree:

```bash
uv run python .trellis/tasks/08-25-thin-skill-c7-single-writer-remediation/research/build_source_authority_baseline.py --verify
```

This baseline is forward evidence only. It does not alter the frozen C1 identity or archived C7 failure.

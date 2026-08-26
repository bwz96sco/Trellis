# C8 Complete Research Skill Source Baseline

This directory freezes the exact committed source used by C8 Phase 2.

```text
source repository: /Users/zhangbowen/Projects/agent-skills-private
branch: chore/retire-find-skills
commit: 86df5a676c52950592ff9fe5966b9c1753160cb5
tree: aa0282da9c63f8f17dd94b672b3fd6843647a0bd
parent: e2b0d70e3a797f19461eb106601de12250000b69
Research Skills: 15
Skill files: 68
contract files: 3
total files: 71
aggregate digest: sha256:7ad7bf1547605ce8c243bcb51dd03715e1ebfb7ef4c7ea528053ee41386fcd89
manifest schema: 1
```

Build mode reads source bytes only through Git object commands at the pinned commit. It authenticates the exact branch containment, commit, tree, parent, every Research Skill subtree, every blob OID, Git mode, byte size, and SHA-256. It never reads source working-tree file bytes, so modified and untracked overlays cannot enter this baseline.

`files/` contains all committed files under the 15 active Research Skill directories. The three active inventory/gate contract files are included separately with `scope: "contract"`. `../migration-matrix.json` accounts for every source Skill exactly once and maps source-only projections, validators, helpers, authority files, and required support members.

The manifest uses sorted-key compact UTF-8 JSON with one final LF and rejects duplicate keys. `aggregateDigest` is SHA-256 over the domain-separated canonical ordered `files` entries. Verification also reconstructs Git blob and per-Skill tree OIDs from the frozen bytes.

Run from the Trellis worktree:

```bash
uv run python .trellis/tasks/08-25-thin-skill-c8-full-migration/research/build_source_baseline.py
uv run python .trellis/tasks/08-25-thin-skill-c8-full-migration/research/build_source_baseline.py --verify
```

`--verify` reads only this C8 evidence and requires no source repository. This is forward immutable evidence; changes require a new task/version rather than mutation of this baseline.

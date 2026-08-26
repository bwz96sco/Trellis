---
name: research-project-setup
description: Inspect, design, or change research workspaces with explicit Git, data, privacy, and migration boundaries. Use when setting up or reorganizing a research project's code, paper, notes, and data separation, or initializing the standard vault scaffold.
---

# Research Project Setup

Separate code, manuscripts, notes, data, and generated evidence reproducibly — with explicit authority for every change.

## Workflow

1. **Bound the operation.** What is requested, which paths may change, and what authority exists for repository init, moves, deletion, or commits.
2. **Inspect first.** Filesystem state plus root and nested Git boundaries. For a named small inventory, read it with this SKILL.md in one initial read-only call; treat supplied listings as declarations, not verified state.
3. **Design boundaries.** Code, paper, notes, data, privacy, and Git/history separation. For advice, return one compact target tree plus exactly six single-sentence migration steps unless another count is requested. State only decision-changing assumptions.
4. **Execute only what was authorized.** Change only requested paths; never initialize, move, delete, or commit a repository without user authority. Copy the vault scaffold from `assets/obsidian-vault/` only on an explicit setup request.
5. **Verify actual state.** Reinspect each affected repository: paths, boundaries, ignored and tracked state, outputs. Report mismatches and blockers.

Complete when the requested diagnosis or change is done or blocked, boundaries and authority are explicit, verification matches reality, and proposed operations remain distinct from performed ones.

## Boundaries

- Keep code, paper, and notes independent when collaborators, privacy, or release cadence differ; a meta repository tracks only the project map, never nested repo contents.
- Parallel checkouts via `git worktree add` under `code/worktrees/`; never copy repositories manually.
- Large or sensitive data, PDFs, logs, checkpoints, and run outputs stay outside normal Git or ignored.
- Load `references/graphify.md` only for explicit Graphify setup.
- For quest initialization, inspect and prepare project facts, tell the user to invoke `$research-quest-admin` explicitly, then stop. After durable setup changes, prepare one event and use the same explicit handoff. This skill never writes quest state, including initialization.

# Design: Pinned Upstream Integration

## Integration Topology

Create one merge commit from:

```text
f2f4e525 (completed Research migration)
        \
         merge/work commit
        /
64e66369 (pinned upstream/main)
```

No rebase, cherry-pick reconstruction, or merge in the dirty source worktree. Local backup refs preserve old variant, completed migration, and pinned upstream tips.

## Semantic Merge Policy

Every changed-on-both path and upstream addition under active/distribution prefixes receives one disposition:

- `accept-upstream`: compatible infrastructure fix.
- `preserve-research`: retain deletion or Research-owned behavior.
- `synthesize`: port upstream fix into Research contract.
- `defer-inactive`: keep outside active/packed product surface.

Path decisions are stored under this task's `research/` directory.

## Authority Boundaries

- Generic task/session refs: contained by repository root.
- Research cross-repository access: canonical control root plus explicit managed-repository registry only.
- Worker output: Proposal-only.
- Canonical Result/Proposal/Workflow/Quest mutation: root process only.
- Workflow completion and transition: explicit, separate root actions.

## Shared Infrastructure Synthesis

### Task/session safety

Port upstream stale/unreadable active-task handling, path normalization/containment, session cleanup, missing-task handling, and bounded context into root scripts and shipped Trellis templates.

### Hooks

Port bounded/refreshed/deduplicated task context and routing preservation into canonical shared hook templates, then synchronize retained Claude/Codex installed copies. Do not add hosts, agents, automatic dispatch, or a second Skill/context pass.

### Lifecycle

Adopt safe migration discovery, stale manifest pruning, config preservation, byte revalidation, and safe delete behavior. Retain historical generic-host scrubbers only for retirement compatibility. `.trellis/research/**` remains protected canonical user data.

### Codex

Preserve user `model` and `model_reasoning_effort` values while managing only Research-owned config fields. No defaults, routing, extra agents, or `multi_agent=true`.

## Distribution Boundary

`copy-templates.js` copies every non-TypeScript source template, while TypeScript source compiles into `dist`. Therefore inactive source can still become packed payload. Preserve Research fork deletions and keep `packed-cli-audit.js` required/forbidden inventories authoritative. Never weaken audit rules to admit upstream generic product files.

## Versions and Submodules

Adopt coherent upstream Core/CLI dependency and migration baseline while preserving Research release checks. No publication version is invented. Preserve frozen Research gitlinks `docs-site@be7684f2...` and `marketplace@d7a18bb5...`: post-merge I3 verification proved its authenticated installed-package subject depends on those exact protected commits. This satisfies the conditional Research-specific pin exception; do not initialize or modify either submodule independently.

## Failure and Rollback

- Before merge commit: `git merge --abort` in integration worktree.
- Before variant ref update: delete only integration worktree/branch if abandoned.
- After variant ref update: compare-and-swap variant back to `f2f4e525...`.
- Never mutate or restore the original dirty worktree.

# CS6-0 implementation plan

## Authorization gate

The user explicitly authorized CS6-0 implementation only. This authorizes governance/task artifacts and CS6-0 activation. It does not authorize a commit, later child activation, technical repair, assurance execution, operator decision, archive, release, publication, or push.

## Owned paths

- CS6 campaign and child planning files: `task.json`, `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` under the ten `08-07-cs6-*` task directories.
- CS6-0 governance evidence: `.trellis/tasks/08-07-cs6-establish-successor-governance/research/**`.
- Append-only canonical-parent CS6 pointers: parent `prd.md`, `design.md`, `implement.md`, `task.json`, and `research/path-ownership-map.md`.

Everything else is excluded.

## Ordered execution

1. Capture HEAD, Git status, submodule commits, protected file hashes, CS5 subject/evidence/verdict identities, accepted contract identities, and live-version containment.
2. Create the CS6 campaign parent under the canonical Phase-2 parent.
3. Create CS6-0 through CS6-8 under the campaign parent using reciprocal task relationships.
4. Complete campaign and child `prd.md`, `design.md`, and `implement.md` files.
5. Replace seed manifests with curated research/spec context in every task.
6. Write the CS6-0 forward-governance record, baseline/containment attestation, and exact path-ownership map.
7. Append a CS6 overlay and pointer to the canonical Phase-2 parent artifacts without rewriting earlier overlays.
8. Validate every CS6 task and verify exact reciprocal relationships, dependency repetition, ownership disjointness, and false authority flags.
9. Recompute protected identities and compare them with the baseline.
10. Verify no historical CS5, accepted-contract, Procedure `2.0.4`–`2.0.6`, production, test, package, registry, spec, assurance-output, or operator-decision path changed.
11. Run path-scoped `git diff --check`.
12. Stop without committing.

## Verification commands

Use `uv run python` for all Trellis Python commands.

```text
uv run python ./.trellis/scripts/task.py validate <each CS6 task>
git status --short
git diff --check -- <CS6 and canonical-parent governance paths>
git diff --name-only -- <protected/historical/production paths>
shasum -a 256 AGENTS.md CLAUDE.md
git -C docs-site rev-parse HEAD
git -C marketplace rev-parse HEAD
```

A deterministic topology check must assert:

- canonical parent contains the CS6 parent exactly once;
- CS6 parent contains exactly nine ordered children;
- each child has exactly one parent and no children;
- only CS6-0 is active after the start command;
- all other children remain planning.

## Stop gates

Stop if:

- a requested governance edit would alter historical CS5 task metadata or evidence;
- ownership overlaps cannot be resolved without widening scope;
- any protected dirty identity changes;
- a semantic-leaf defect is discovered during baseline inspection;
- GitNexus impact analysis becomes necessary because an existing symbol must change;
- any later child, production path, package, assurance output, operator record, or operational authority would be activated.

## Commit boundary

Future boundary G may contain only additive CS6 governance/task artifacts and additive canonical-parent CS6 pointers. No commit is authorized by the current instruction.

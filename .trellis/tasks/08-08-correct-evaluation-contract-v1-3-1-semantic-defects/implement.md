# Evaluation-contract v1.3.1 campaign implementation plan

## Current authorization

The user authorized creation and planning of the successor campaign after immutable A11. This wave may create planning packages and append-only canonical-parent pointers only. It does not authorize G131 commit, task activation, candidate authoring, assurance execution, operator decision, technical implementation, archive, release, publication, or push.

## Ordered planning work

1. Bind A11, accepted v1.3.0 identities, and the four finding IDs.
2. Create the reciprocal parent with exactly Author, Assurance, and Decision children.
3. Freeze disjoint ownership, dependencies, activation gates, stop gates, and commit boundaries.
4. Define the exact four-correction semantic allowlist and no-fifth-change rule.
5. Define the seven-member candidate, semantic-diff evidence, and assurance obligations.
6. Define fresh machine-only reviewer isolation and exact assurance outputs.
7. Define the separate operator decision and terminal campaign boundary.
8. Append only the canonical Phase-2 parent campaign pointer and ownership summary.
9. Validate all task packages, topology, status, manifests, scope, and protected paths.
10. Present the final planning summary and stop for fresh implementation approval.

## Future execution sequence

```text
G131 governance/topology
  -> A131-0 author activation/assignment
  -> A131-1 immutable v1.3.1 candidate
  -> B131-0 fresh reviewer assignment
  -> B131-1 machine assurance pass/fail
  -> O131-0 optional operator activation after separate instruction
  -> O131-1 optional accept/reject/stop decision
  -> STOP
```

Each boundary requires separate authorization and path-specific staging. A failure never advances to the next boundary.

## Validation

Use `uv run python` for all Python commands.

- Validate each of the four task packages with `task.py validate`.
- Assert reciprocal topology and exactly three ordered children.
- Assert every task is `planning`, unassigned, and inactive.
- Strict-parse all JSON/JSONL and reject duplicate keys.
- Run path-scoped `git diff --check`.
- Recompute A11, protected file, submodule, accepted-leaf, and historical package identities.
- Confirm the complete dirty set is exactly the 36 G131 paths plus `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, and the exact pinned CS5 decision path; require an empty staged set.
- Before any future commit, run GitNexus change detection and verify zero unexpected symbols or execution flows.

## Stop gates

Stop if:

- A11 or accepted v1.3.0 identity mismatches;
- a fifth semantic correction is proposed;
- ownership overlaps author, reviewer, and operator roles;
- any child would gain production, package, runtime, registry, specification, or operational authority;
- any task activates during planning;
- any protected or inherited dirty path changes;
- any commit, archive, release, publication, or push would occur without separate authorization.

## Commit boundaries

- **G131**: parent/child planning, topology, exact pins, governance evidence, and canonical-parent pointers only.
- **A131-0**: author activation and assignment only.
- **A131-1**: complete candidate and author evidence only.
- **B131-0**: reviewer assignment/authorization only.
- **B131-1**: exact assurance allowlist only.
- **O131-0/O131-1**: optional operator activation and decision, each separately authorized.

No commit is authorized by the current planning instruction.

## Exact G131 implementation boundary

1. Modify/create only the 36 paths in `research/g131-output-inventories.json`.
2. Keep the campaign parent `in_progress`, unassigned, and routed only for G131; keep all three children `planning`, unassigned, inactive, and `taskExecutionAuthorized:false`.
3. Authenticate A11 from immutable Git objects. The recorded independent-verification SHA-256 is `0ab217ade1eac0ec8b527acfb722fdb9da4a965259188db6bcaeb5336e7e2baa`; its precommit `currentHead` is historical and is not replaced by a worktree rerun.
4. Write canonical compact governance JSON with strict UTF-8, duplicate/non-finite/surrogate rejection, sorted object keys, preserved array order, and exactly one final LF.
5. Run `uv run python .trellis/tasks/08-08-correct-evaluation-contract-v1-3-1-semantic-defects/research/g131-validation.py --write` once, followed by at least two read-only `--verify` runs. The evidence bytes must remain identical.
6. Validate all four task packages, the frozen classifier specification against immutable v1.3.0 structures, the exact 36-plus-five dirty set with an empty staged set, and the exact G131 path-scoped diff check. This does not claim that the future A131 semantic diff passed.
7. Stop without staging, committing, activating a child, creating an assignment/candidate/assurance/decision output, or widening scope.

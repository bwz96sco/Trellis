# CS6-0 — Establish successor governance

## Goal

Create the additive, reciprocal CS6 campaign topology and freeze the rules that govern all later CS6 work without changing production code, tests, Procedure packages, accepted contract leaves, historical assurance evidence, or live selection.

## Authoritative predecessor identities

- Current repository baseline: `f5249e7544aaa76b66b859433654e3a7d0f77d9e`.
- CS5 attempt-10 subject: `916be0a877725f7f91836a3a97e480c1e104e533`.
- CS5 attempt-10 subject tree digest: `99b3b275699725f2c60c325b2d9d9aa477beb585d3be26986fe03e2ebc890863`.
- CS5 attempt-10 evidence commit: `c951a2f82fa9c649ceb4a290e6896bd084ad70bd`.
- CS5 attempt-10 verdict: `fail`.
- Accepted contract: `evaluation-contract-v1.3.0`.
- Accepted semantic digest: `sha256:dde907ba15d9ce22117b95db2fd9e0a108d4869873801f8c7f93b528f808699f`.
- Accepted seven-member aggregate: `sha256:83fdc8c292922173e4a67fa57deb65ff302ec107c202e3b793f7b4a93b23c7ef`.
- Live Procedure selection remains exactly `1.0.0`.
- Procedures `2.0.4`, `2.0.5`, and `2.0.6` are immutable historical evidence.

## Requirements

### R1 — Forward-only preservation

- Do not reset, rebase, amend, stash, clean, broadly revert, rewrite history, or force-push.
- Do not repair or relabel CS5 records, task metadata, freeze records, packages, outputs, or verdicts.
- Preserve all Procedure `2.0.4`, `2.0.5`, and `2.0.6` bytes.
- Preserve the untracked CS5-8 honest-stop record as inherited state; do not stage or claim it as committed authority.

### R2 — Reciprocal task topology

- Attach one CS6 campaign parent to the canonical Phase-2 parent.
- The CS6 parent must list exactly CS6-0 through CS6-8 in execution order.
- Every child must point to exactly the CS6 parent.
- Use `children`, not `subtasks`, as the task-tree relationship.
- Do not incidentally repair CS5 relationship or status drift.

### R3 — Explicit ownership and dependencies

- Freeze one owner role, exact owned paths or path patterns, exclusions, predecessors, activation gate, stop gate, and commit boundary for every CS6 child.
- CS6-0 owns only task/governance artifacts and additive canonical-parent pointers.
- Later production, test, package, freeze, assurance, and operator-decision surfaces must have exactly one child owner.
- Tree order is not dependency enforcement; every child repeats its dependencies in its own PRD and implementation plan.

### R3A — Exact CS6-0 ownership

CS6-0 owns only:

- `.trellis/tasks/08-07-cs6-complete-system-forward-correction/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}`;
- `.trellis/tasks/08-07-cs6-*/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl}` for the nine child planning packages created by this governance wave;
- `.trellis/tasks/08-07-cs6-establish-successor-governance/research/**` for governance, baseline, ownership, and validation evidence;
- append-only CS6 sections/pointers in the canonical parent `prd.md`, `design.md`, `implement.md`, `task.json`, and `research/path-ownership-map.md`.

It owns no later-child research outputs, production source, tests, Procedure packages, accepted leaves, registry, specification, assurance output, operator record, or operational authority.

### R4 — Semantic decision gate

- CS6-1 independently audits the seven accepted v1.3.0 leaves before technical correction.
- If an accepted leaf is defective, CS6 stops and opens `evaluation-contract-v1.3.1+`.
- If the leaves are sound, later work retains v1.3.0 and corrects implementation/package conformance only.

### R5 — Version and authority rules

- Any corrected Procedure family package uses new version `2.0.7`; no historical package is rewritten.
- Workers remain Proposal-only.
- Shared HIGH/CRITICAL events, reducers, stores, canonical ledgers, batch committers, locks, and hardened publication internals remain call-only without separate authorization.
- Human review, human equivalence, repair authority, complete-system acceptance, operator decision, activation, archive, release, publication, and push all remain false.
- A machine pass in attempt 11 cannot auto-accept or activate anything.

### R6 — Dirty-path containment

Preserve these inherited paths exactly:

- `AGENTS.md` — SHA-256 `46ec2da5b9077e6c351dbf13066c7d14a796ca018f32d63963feefdd62ce3d31`.
- `CLAUDE.md` — SHA-256 `707cc4e3d24165ab4cc91bc884f6b8ebf7ee2971c7f5edf2ac0b197f9f1d4f4b`.
- `docs-site` — commit `be7684f2086abb9b8e24d4d35733a7dda3123a0f` plus inherited dirty worktree.
- `marketplace` — commit `d7a18bb5411c700237d21483d6889ac296ef0301` plus inherited dirty worktree.
- `.trellis/tasks/08-06-cs5-decide-complete-system-attempt-10/research/` — inherited untracked operator-state directory.

GitNexus is stale at indexed commit `a593461` versus current `f5249e7`. CS6-0 must not run `npx gitnexus analyze` because it rewrites the already-dirty `AGENTS.md` and `CLAUDE.md`. No symbol is edited in CS6-0, so impact analysis is not applicable in this wave.

## Required evidence

CS6-0 must produce:

1. a forward-governance record binding predecessor identities, dependencies, activation gates, version rules, and authority denials;
2. a path-ownership map covering CS6-0 through CS6-8;
3. a baseline/containment attestation with exact protected-path identities;
4. fully reciprocal validated task relationships;
5. planning artifacts and curated manifests for the campaign and every child;
6. an additive pointer/overlay in the canonical Phase-2 parent without rewriting prior overlays.

## Acceptance criteria

- [ ] The canonical Phase-2 parent lists exactly one CS6 campaign child.
- [ ] The CS6 parent lists exactly nine children in CS6-0 through CS6-8 order.
- [ ] Every CS6 child points only to the CS6 parent and remains `planning` except activated CS6-0.
- [ ] Campaign and all children have `prd.md`, `design.md`, `implement.md`, non-seed `implement.jsonl`, and non-seed `check.jsonl`.
- [ ] Ownership, dependencies, activation gates, stop gates, and authority denials are explicit and non-overlapping.
- [ ] CS5 attempt 10 and Procedure `2.0.4`–`2.0.6` are unchanged.
- [ ] Protected dirty-path hashes/commits/statuses are unchanged.
- [ ] Only CS6 task/governance paths and additive canonical-parent governance pointers changed.
- [ ] Task validation and path-scoped `git diff --check` pass.
- [ ] No production/test/package/spec/live-selection/assurance-output/operator-decision change occurred.
- [ ] No commit, archive, activation beyond CS6-0, release, publication, or push occurred.

## Out of scope

- Semantic-leaf audit execution.
- Core or CLI implementation.
- Procedure `2.0.7` generation.
- Harness, archive/install, freeze, or MAL-1 execution.
- Operator decision.
- Commit, activation, release, publication, or push.

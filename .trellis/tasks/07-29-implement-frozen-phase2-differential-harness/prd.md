# Implement frozen Phase-2 differential harness

## Goal

Build a deterministic, digest-traceable harness that allocates, executes, and aggregates all 229 frozen v1.2 cases without private test-body dependence.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-03 accepted so the harness targets stable package, artifact, validator, report, and Context contracts.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Verify the frozen target digest before deriving fixtures or slices.
- Consume the parent planning-time `research/differential-case-allocation.json` and verify it against the archived matrix before harness generation.
- Register all applicable DFT, COMP, Proposal-only control, and host-retirement cases with the exact planned implementation owner.
- Detect unknown, duplicated, omitted, ownership-drifted, criticality-drifted, or falsely inapplicable case IDs.
- Generate compact family slices matching each child `research/differential-case-map.json` and an aggregate coverage report.
- Use Trellis-native synthetic fixtures and observable contracts; never copy private source fixtures or validators.
- Register the parent `research/phase2-expansion-case-allocation.json` as a separate namespace: 38 additional cases, never included in the frozen 229 totals, with exactly one implementation owner plus P2-04 harness and P2-13 assurance roles.
- Allow child-specific expansions without replacing or weakening frozen cases.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Parent/child case maps are read-only harness inputs; P2-04 may not reassign implementation ownership.
- Differential harness modules, synthetic fixtures, frozen case registry, compact slices, and aggregate reports.
- No production runtime or Procedure methodology bodies.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- frozen case registry
- applicability map
- family slices
- harness self-tests
- aggregate report schema
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] Counts are exactly 229 total, 212 critical, 17 non-critical, 224 package, 3 composition, 1 Proposal-only control, and 1 host-retirement case.
- [ ] Every case has exactly one implementation owner matching the planning map, plus P2-04 harness and P2-13 assurance roles, with traceability to the v1.2 digest.
- [ ] Harness self-tests reject omission, duplication, unknown IDs, and applicability drift.
- [ ] Family children can run independently selected slices and P2-12/P2-13 can prove aggregate completeness.
- [ ] Frozen and expansion reports are separate: exactly 229 frozen IDs and exactly 38 planned expansion IDs, with no ID overlap or arithmetic double-counting.
- [ ] Focused and relevant full tests, build/package checks where applicable, task validation, GitNexus change detection, independent review, and dirty-path audit pass.
- [ ] No task activation, commit, archive, publication, release, or push occurs without separate authorization.

## Out of scope

- Re-evaluating private Skills HEAD.
- Copying private workflow bodies, validators, tests, prompts, cases, or raw outputs.
- Widening worker, network, sandbox, repository, Git, approval, capability-launch, or canonical-mutation authority.
- Work assigned to another Phase-2 child.

## Planning status

- Status remains `planning`.
- `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` are planning artifacts only.
- A fresh user approval is required before `task.py start`.

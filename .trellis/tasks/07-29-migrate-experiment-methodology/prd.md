# Migrate experiment methodology

## Goal

Migrate experiment round and campaign methodology with frozen baselines, plan/actual consistency, evidence-bounded claims, and root-authorized bounded composition.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-05 accepted; P2-04 experiment and `COMP-001` slices available.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Deepen experiment round stages, artifacts, baselines, controls, execution evidence, outcomes, and handoff.
- Deepen experiment campaign planning, round allocation, aggregation, stop rules, and closure.
- Preserve null, failed, partial, inconclusive, rejected, and successful outcomes without silent success.
- Enforce `COMP-001` campaign-to-round composition through explicit root authorization and bounded dispatch counts.
- Consume P2-01's `methodology-contract-freeze.json` for exact stage/checkpoint fields, types, cardinality, ownership, immutability, transitions, terminal applicability, stable error codes, and fixture obligations.
- Ensure failed execution cannot produce a success Claim and claim strength is bounded by evidence.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Exact frozen allocation is `research/differential-case-map.json`: 38 cases, 33 critical, including `COMP-001`; local `research/expansion-case-map.json` adds 3 separately counted edge-specific cases.
- Dormant `2.0.0` experiment-round and experiment-campaign packs.
- Experiment descriptors, validators, synthetic fixtures, composition report, and family code-spec.
- No generic composition runtime or registry cutover; P2-03 owns the root-side composition contract/runtime.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- two dormant experiment packs
- baseline and run consistency validators
- COMP-001 report
- family DFT report
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] Baseline is frozen before execution and planned/actual runs remain consistent.
- [ ] Null/failure/inconclusive states remain visible and cannot yield success Claims.
- [ ] Campaign composition has a valid root-authorized campaign-to-round path plus explicit child-failure propagation and cancellation/rollback evidence; it is bounded, approval-aware, and cannot self-chain.
- [ ] All 38 frozen IDs and all 3 local expansion IDs pass; expansion IDs remain outside the frozen-229 arithmetic with no extra, missing, duplicate, or overlapping ID.
- [ ] Every P2-01-frozen stage or artifact-lifecycle checkpoint has the exact field/type/cardinality/ownership/transition/terminal/error contract and targeted positive/base/critical-negative fixtures closing `IMP-STAGE-FIELD-DEPTH` and `IMP-NON-PILOT-BEHAVIOR-DEPTH`; generic presence tests do not pass.
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

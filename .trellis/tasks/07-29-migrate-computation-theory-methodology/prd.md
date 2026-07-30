# Migrate computation and theory methodology

## Goal

Migrate computation and theory methodology with durable inputs, assumptions, derivations, proof/analysis obligations, uncertainty, and explicit terminal states.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-05 accepted; P2-04 computation/theory slices available.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Deepen computation case inputs, plans, execution evidence, outputs, validation, and blocked/failure/null behavior.
- Deepen theory derivation, normalization, proof planning/drafting, counterexample/audit, and handoff stages.
- Preserve assumptions, provenance, stable identifiers, uncertainty, claim strength, and cross-artifact consistency.
- Consume P2-01's `methodology-contract-freeze.json`; do not invent ordered stages where v1.2 defines none. Computation uses named artifact-lifecycle checkpoints, while theory uses its frozen ordered stages. Both require exact field/type/cardinality/producer/consumer/immutable/transition/terminal/error contracts.
- Close `IMP-STAGE-FIELD-DEPTH` and `IMP-NON-PILOT-BEHAVIOR-DEPTH` for both packages.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Exact frozen allocation is `research/differential-case-map.json`: 24 cases, 22 critical; local `research/expansion-case-map.json` adds 4 separately counted field/lifecycle cases.
- Dormant `2.0.0` computation and theory packs.
- Computation/theory descriptors, validators, synthetic fixtures, and family code-spec.
- No other analytical family or central runtime files.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- two dormant Procedure packs
- analysis/proof obligation validators
- partial/null/inconclusive tests
- family DFT report
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] Missing critical inputs, derivations, proof obligations, or provenance fail closed.
- [ ] Partial, null, blocked, failed, and inconclusive outcomes remain distinct.
- [ ] Claims do not exceed the evidence and assumptions represented by artifacts.
- [ ] All 24 frozen IDs and all 4 local expansion IDs pass; expansions remain outside the frozen-229 arithmetic with no overlap or duplicate.
- [ ] Every computation artifact-lifecycle checkpoint and every theory ordered stage has the exact P2-01-frozen field/input/output/transition/terminal/error contract and targeted positive/base/critical-negative fixtures; generic artifact-presence assertions alone do not pass.
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

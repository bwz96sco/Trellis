# Migrate review methodology

## Goal

Migrate review case and campaign methodology with traceable claims/evidence, evaluator attacks, findings/adjudication separation, and bounded composition.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-05 accepted; P2-04 review and `COMP-002` slices available.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Deepen review-case intake, claims ledger, evidence inspection, attacks, findings, adjudication recommendation, and closure.
- Deepen review-campaign planning, case composition, aggregation, conflict handling, and stop rules.
- Preserve source facts, analyst synthesis, evaluator attacks, and root Decisions as separate channels.
- Enforce `COMP-002` campaign-to-case as explicit, bounded, approval-aware composition.
- Freeze shared case-artifact ownership: review-case is the sole initial writer; review-campaign consumes immutable digest-bound child evidence and owns only aggregate campaign artifacts. Duplicate IDs with different bytes or campaign rewrites of immutable case fields fail closed.
- Translate source sibling `..` references into root-materialized, contained child inputs bound by the composition descriptor; no support pack may traverse to a sibling directory.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Exact frozen allocation is `research/differential-case-map.json`: 15 cases, 14 critical, including `COMP-002`; local `research/expansion-case-map.json` adds 6 separately counted ownership, containment, valid-execution, failure, and rollback cases.
- Dormant `2.0.0` review-case and review-campaign packs.
- Review descriptors, validators, synthetic fixtures, composition report, and family code-spec.
- No central Decision or generic composition runtime ownership; P2-03 owns the root-side composition contract/runtime.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- two dormant review packs
- claims/evidence/adjudication validators
- COMP-002 report
- family DFT report
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] Source facts cannot be overwritten by evaluator attacks or recommendations.
- [ ] Findings and adjudication remain traceable to evidence and preserve blocked/partial states.
- [ ] Campaign composition has a valid root-authorized path plus child failure/cancellation and rollback evidence; it is bounded and cannot silently chain.
- [ ] Review-case initial-writer, immutable-field, duplicate-ID conflict, and campaign aggregate ownership are deterministic; no sibling traversal is used.
- [ ] All 15 frozen IDs and all 6 local expansion IDs pass; expansions remain outside the frozen-229 arithmetic with no overlap or duplicate.
- [ ] Every P2-01-frozen review artifact-lifecycle checkpoint has an exact field/input/output/transition/terminal/error contract and targeted positive/base/critical-negative fixtures closing `IMP-STAGE-FIELD-DEPTH` and `IMP-NON-PILOT-BEHAVIOR-DEPTH`.
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

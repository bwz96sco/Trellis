# Migrate ideation and evaluation methodology

## Goal

Migrate the coupled ideation/evaluation stages 01-07 as the first dormant end-to-end proof of the package, artifact, validator, Context, Proposal, and differential architecture.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-02, P2-03, and P2-04 accepted; P2-01 ideation closure disposition resolved.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Generation owns 01-frame, 02-prior-map, 03-gap-map, and 04-generate.
- Evaluation consumes without rewriting 01-04 and owns 05-novelty-check, 05b-method-flaw-audit, 06-select, and 07-handoff.
- Preserve shared case root, candidate IDs, project alignment, source/evaluator separation, matched controls, falsifiers, kill conditions, and pivot confirmation.
- Consume P2-01's `methodology-contract-freeze.json` for exact stage field names, types, cardinality, ownership, immutability, transitions, terminal applicability, stable error codes, and fixture obligations.
- Implement all ten `IMP-IDEA-VALIDATORS` controls for both sides where the frozen matrix requires them.
- Enforce exactly selected or blocked; blocked forbids selected/handoff artifacts; selected requires a passing finalist and experiment handoff.
- Translate final selection to pending Proposal and root Decision.
- Keep both new Procedure versions dormant until P2-12.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Exact frozen allocation is `research/differential-case-map.json`: 47 cases, all critical.
- Dormant `2.0.0` idea-generation and idea-evaluation Procedure packs.
- Ideation/evaluation family artifact descriptors, trusted validator handlers/descriptors, synthetic fixtures, and family-specific code-spec.
- No central registry switch, generic composition runtime, or other workflow family files.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- two dormant Procedure packs
- shared case contract
- ten improve validators
- 47-case frozen report
- fresh-context reconstruction proof
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] All 47 IDs in `research/differential-case-map.json` and child-specific critical negatives pass with no extra, missing, or duplicate frozen ID.
- [ ] Every stage implements the exact P2-01-frozen field/type/cardinality/ownership/transition/terminal/error contract and positive/base/critical-negative fixtures; no ID-and-reference-only or generic-presence substitute remains.
- [ ] Evaluation cannot rewrite stages 01-04 and generation cannot exercise stages 05-07 authority.
- [ ] Candidate, provenance, manifest, root, and project identity remain stable.
- [ ] Selected and blocked are mutually exclusive and fail closed on missing critical evidence or unresolved fatal flaws.
- [ ] Worker output remains Result plus pending Proposal; root owns the Decision.
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

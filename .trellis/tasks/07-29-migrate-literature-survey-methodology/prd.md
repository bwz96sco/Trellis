# Migrate literature and survey methodology

## Goal

Migrate literature methodology and the explicit optional survey workflow with clear discovery/synthesis ownership and fail-closed external integration behavior.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-05 accepted; P2-04 literature/survey slice available.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Deepen literature discovery/review stages and durable evidence/provenance contracts.
- Add survey as an explicit non-default synthesis workflow that does not take discovery ownership from literature.
- Separate source facts, citations, synthesis, uncertainty, selected/blocked closure, and root Decisions.
- Represent unavailable external integrations as explicit blocked/partial/inconclusive outcomes, never silent success.
- Consume P2-01's `methodology-contract-freeze.json` and resolve medium-confidence field depth through its exact stage/checkpoint field, type, cardinality, ownership, immutability, transition, terminal, error-code, and fixture obligations.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Exact frozen allocation is `research/differential-case-map.json`: 32 cases, 31 critical.
- Dormant `2.0.0` literature packs and new optional survey pack.
- Literature/survey descriptors, validators, synthetic fixtures, and family code-spec.
- No default-route or central optional-capability registration.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- dormant literature and survey packs
- discovery/synthesis boundary tests
- integration degradation tests
- family DFT report
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] Survey remains explicit/non-default and synthesis-only.
- [ ] Source/citation provenance remains traceable and distinct from analyst synthesis.
- [ ] Unavailable integrations cannot produce successful closure.
- [ ] Missing evidence, invalid handoff, provenance drift, and all 32 IDs in `research/differential-case-map.json` fail/pass as specified with no extra, missing, or duplicate frozen ID.
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

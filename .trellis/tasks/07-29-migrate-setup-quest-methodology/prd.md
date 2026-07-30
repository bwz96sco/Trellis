# Migrate setup and Quest methodology

## Goal

Migrate project setup, read-only Quest framing, and explicit Quest-admin methodology while preserving root mutation and canonical-ID authority.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-05 accepted; P2-04 compact slices for setup, Quest, Quest-admin, and relevant control cases available.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Deepen project setup from the frozen observable contract.
- Preserve `research-quest` as read-only resume/framing methodology.
- Translate write-capable Quest administration to explicit root/admin review and mutation.
- Consume P2-01's `methodology-contract-freeze.json` and preserve its exact stage/checkpoint fields, types, cardinality, ownership, immutability, transitions, terminal applicability, error codes, and fixture obligations.
- Preserve stable IDs, provenance, blocked setup outcomes, and required intake/graph/manifest artifacts.
- Keep new versions dormant until P2-12.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Exact frozen allocation is `research/differential-case-map.json`: 21 cases, 18 critical.
- Dormant `2.0.0` project-setup, quest-framing, and quest-admin packs.
- Family artifact/validator descriptors, synthetic fixtures, and setup/Quest family code-spec.
- No central capability registry or other family files.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- three dormant Procedure packs
- read/admin authority tests
- family DFT report
- blocked setup and provenance tests
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] Ordinary Quest execution is read-only and cannot make canonical mutations.
- [ ] Quest-admin recommendations require root review and root-owned mutation.
- [ ] Worker-generated canonical IDs and direct Proposal application fail closed.
- [ ] Blocked setup cannot report success and all 21 IDs in `research/differential-case-map.json` pass with no extra, missing, or duplicate frozen ID.
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

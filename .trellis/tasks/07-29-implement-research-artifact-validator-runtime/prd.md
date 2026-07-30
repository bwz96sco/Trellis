# Implement Research artifact validator runtime

## Goal

Add generic artifact, provenance, terminal-state, trusted-validator, deterministic-report, root-only composition, and Context-v2 enforcement without widening worker authority.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-02 accepted with stable schema-v2 pack parsing, digest binding, and historical resolution.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Add a separate versioned methodology artifact contract instead of widening schema-v1 `ArtifactRef` silently.
- Add trusted validator registration by stable ID/version; pack descriptors remain declarative and non-executable.
- Validate required/optional/cardinality, canonical paths/media types, stage ownership, dependencies, stable IDs, provenance, terminal states, and cross-artifact consistency.
- Produce deterministic reports bound to Procedure, Dispatch, Activation, Result, Proposal, artifacts, and validator versions.
- Add normalized Context v2 for schema-v2 Procedures while preserving exact Context v1 for historical activations.
- Run root-side validation before Result/Proposal/approval-consumption commit.
- Add a canonical or deterministically bound `ResearchCompositionDescriptorV1` owned and authorized only by the root.
- Bind each approved composition to its parent Dispatch/Activation, allowed child capability or bounded adapter, exact edge ID, maximum child count, non-transitive rule, and rollback/failure evidence.
- Enforce child-count and authorization from canonical Dispatch/Activation/Proposal records; workers cannot create or approve composition relations.
- Distinguish composition from ordinary handoff and expose only the bounded relation needed by worker Context.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`; exact additional generic-composition cases are in local `research/expansion-case-map.json` (12 cases outside the frozen 229).
- Child-approved generic artifact-contract, validator-registry, report, and composition modules under core/CLI Research.
- `dispatch-approved-context.ts`, Result-recording validation entry points, shared hook, generic worker v1/v2 parsing, and the existing `packages/core/src/research/index.ts` public barrel for the generic runtime APIs.
- P2-03 owns the generic composition runtime for all three frozen edges; P2-08, P2-10, and P2-11 own only edge-specific packs and fixtures, and P2-12 owns final central integration.
- No family-specific methodology rules or registry version cutover.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- artifact contract v1
- validator descriptor v1
- trusted validator registry
- deterministic report contract
- stable public `@mindfoldhq/trellis-core/research` exports for the generic artifact/validator/report/composition APIs
- root-only composition descriptor/runtime, three generic edge fixtures, and all 12 local authorization/binding/budget/failure/rollback expansions
- Context v2
- root pre-commit validation integration
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] Critical missing evidence, provenance/ID drift, invalid ownership, invalid terminal/closure, and unknown validators fail closed.
- [ ] Validation failure appends no Result, Proposal, or approval-consumed event.
- [ ] Context v1 remains exact for old activations; Context v2 is provider-neutral and zero-write.
- [ ] Root composition validation proves an authorized positive execution for each Research-child and bounded-adapter shape plus wrong edge/parent/digest, absent authorization, overflow, transitivity, worker launch, cancellation, child failure, unavailable adapter, and zero-write rollback negatives from `research/expansion-case-map.json`; a runtime that rejects every composition cannot pass.
- [ ] Workers receive no validator execution, filesystem discovery, canonical mutation, composition approval, Dispatch creation, or launch authority.
- [ ] Reports reproduce byte-for-byte from identical inputs.
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

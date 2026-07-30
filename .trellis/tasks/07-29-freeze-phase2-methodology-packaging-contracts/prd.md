# Freeze Phase-2 methodology packaging contracts

## Goal

Freeze the support-pack, trusted-runtime, compatibility, ownership, package-allocation, and rollback contracts that every implementation child must follow.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

Phase-1 v1.2 predecessor gate `pass` and infrastructure pin only.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Re-hash and attest the frozen v1.2 target and distinguish the methodology comparison commit from the implementation base commit.
- Specify schema-v1 byte/digest compatibility and the schema-v2 enumerated support-pack contract.
- Specify exact historical Procedure ID/version resolution for recorded activations.
- Specify artifact contracts, validator descriptors, deterministic reports, Context v1/v2, upgrade, and rollback semantics.
- Freeze a machine-readable methodology contract matrix for all 16 packages. Every stage or, where the frozen source has no ordered stages, every artifact-lifecycle checkpoint must enumerate exact field names, types, requiredness, cardinality, producer, consumer, immutable fields, transition conditions, terminal applicability, stable error codes, and positive/base/critical-negative fixture obligations.
- Review and freeze the parent planning-time assignment of all 16 workflow packages and all 229 frozen cases to exactly one implementation owner, plus the separately counted Phase-2 expansion allocation and named harness and assurance roles.
- Review and freeze the parent planning-time disjoint path ownership map for P2-02 through P2-13.
- Resolve whether ideation `selected` fixtures are shared-couple closure checks; if not, stop for a reviewed v1.3+ correction.
- Freeze the v1.2 literature routing disposition: `research.literature.review` is the automatic/default route and `research.literature.scan` is non-default at cutover unless a separately reviewed v1.3+ contract supersedes v1.2. Do not preserve the current opposite registry binding by accident.

## Ownership and exclusions

- Exact input maps are the parent `research/path-ownership-map.md`, `research/differential-case-allocation.json`, and `research/phase2-expansion-case-allocation.json`; P2-01 publishes reviewed frozen copies/attestations in its child-owned `research/` directory.
- No production source, test, Procedure template, specification, registry, or runtime edits.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- `pin-attestation.md`
- `package-contract.md`
- `artifact-and-validator-contract.md`
- `versioning-and-rollback-contract.md`
- `path-ownership-map.md`
- `package-coverage-map.json`
- `differential-case-allocation.json`
- `phase2-expansion-case-allocation.json`
- `methodology-contract-freeze.json`
- `ideation-closure-disposition.md`
- `literature-route-disposition.md`
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] The frozen target hashes to the authoritative methodology digest.
- [ ] The planning-time maps reconcile all 16 packages and exactly 229 unique frozen cases to one implementation owner each, and reconcile the separately counted expansion cases without duplicate IDs or double-counting.
- [ ] `methodology-contract-freeze.json` covers every frozen stage or explicit artifact-lifecycle checkpoint with exact field/transition/terminal/error/fixture contracts; a package with zero canonical stages cannot satisfy this gate through generic artifact-presence tests alone.
- [ ] Schema-v1 compatibility, historical resolution, override failure, activation binding, rollback, and privacy rules are executable rather than prose-only.
- [ ] No central path has overlapping child ownership.
- [ ] The ideation closure ambiguity is resolved without silently changing v1.2.
- [ ] The literature default-route mismatch is resolved in favor of frozen v1.2 or stops for a reviewed v1.3+ correction.
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

# Assure and close Phase-2 methodology migration

## Goal

Independently verify complete methodology coverage, authority, compatibility, packaging, rollback, and dirty-path isolation before recommending parent acceptance.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-12 accepted with frozen implementation, aggregate reports, package evidence, and rollback rehearsal inputs.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Consume exactly the predecessor inputs listed in `research/assurance-plan.json`, including the P2-12 cutover manifest/digest and every P2-01 through P2-12 `execution-evidence-ledger.json`, and independently verify exact pins, 16/16 packages, 229/229 frozen cases, 38/38 separately counted expansions, and 3/3 composition edges as frozen subsets where applicable.
- Verify Proposal-only workers, root Decisions, Quest read/admin write separation, optional non-default routing, and no historical authority gain.
- Verify schema-v1 and schema-v2 replay, exact historical Procedure resolution, project override failure, rollback, and host parity.
- Verify real clean packed install/update/uninstall evidence and absence of private/Skill payload.
- Mechanically compare the recorded P2-12 implementer identity with the P2-13 reviewer identity before activation; missing or equal identities fail closed.
- Audit unrelated dirty paths and route every defect to the owning child without editing production files.
- Produce only the exact output allowlist in `research/assurance-plan.json`; any requested production/test/Procedure/registry/spec/private output is forbidden.

## Ownership and exclusions

- Exact assurance paths are frozen in the parent `research/path-ownership-map.md`.
- Child-owned independent review, coverage, compatibility, rollback, package, privacy, and acceptance reports only.
- No production source, test, Procedure, registry, specification, or package edits.
- The task remains unassigned in planning and must be assigned before activation to a reviewer different from the P2-12 implementer.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- `pin-attestation.json`
- `reviewer-independence.json`
- `coverage-audit.json`
- `authority-compatibility-audit.json`
- `composition-audit.json`
- `rollback-audit.json`
- `packed-lifecycle-audit.json`
- `privacy-dirty-path-audit.json`
- `acceptance-recommendation.md`

## Acceptance Criteria

- [ ] Independent evidence confirms every parent acceptance criterion or names an owning-child blocker.
- [ ] No unresolved critical defect, silent omission, authority widening, compatibility drift, or private-content leak remains.
- [ ] `reviewer-independence.json` mechanically records and compares both identities; either identity missing or equal fails closed before activation.
- [ ] Coverage records exactly 229 frozen and 38 expansion IDs separately, with no overlap or double-counting, and verifies all required predecessor inputs from `research/assurance-plan.json`.
- [ ] Every predecessor execution ledger contains executed exact argv/cwd/exit data, assertion outcomes, retained-output digests, required zero-write snapshots, and exact forbidden-content/path/package scan evidence; missing fields, placeholders, or prose-only pass claims fail closed.
- [ ] Rollback assurance separately verifies pre-activation atomic revert and post-activation future-selection registry rollback/historical-binding preservation; it does not claim a nonexistent disable event.
- [ ] No output outside the exact `research/assurance-plan.json` allowlist is produced.
- [ ] The final report distinguishes deterministic assurance from unrun live multi-host/model trials.
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

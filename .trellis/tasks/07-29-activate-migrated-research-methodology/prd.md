# Activate migrated Research methodology atomically

## Goal

Perform the sole reviewed registry/version and package-inventory cutover after every dormant family and frozen differential slice passes.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-06 through P2-11 accepted; all dormant packs, family reports, composition reports, and rollback evidence frozen.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Register optional `research.writing.figure`, `research.writing.slides`, and `research.literature.survey` without default routing.
- Switch current Procedure-version bindings for reviewed capabilities in one integration boundary.
- Apply the frozen v1.2 literature route correction atomically: `research.literature.review` becomes the literature automatic/default route and `research.literature.scan` becomes non-default, unless a separately reviewed v1.3+ contract supersedes v1.2. Other existing default routes remain unchanged.
- Update central bundled/packed inventory, exports/indexes, upgrade/reactivation behavior, and compatibility proofs.
- Prove historical activations resolve recorded Procedure versions and existing records gain no authority.
- Run exactly 229 frozen cases and exactly 38 separately counted Phase-2 expansion cases, plus replay, host parity, override, rollback, and packed lifecycle audits. The 3 composition cases and 2 global controls are subsets of the frozen 229 and must not be added again.
- Produce a normative `research/cutover-manifest.json` and digest binding every capability ID, Quest-stage route, automatic/explicit/default status, Procedure ID/version/digest, validator binding, packed path, previous binding, cutover state, and rollback target.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Exact frozen allocation is `research/differential-case-map.json`: 2 global control cases, 1 critical.
- `stage-capabilities.ts` current version bindings and optional capability registrations.
- Central live Procedure version bindings, internal validator bindings, packed required-path audits, integration tests, and specification-index consolidation; P2-03 owns the public Research barrel.
- No family methodology body edits except defects routed back to the owning child.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- atomic registry cutover
- normative cutover manifest plus digest
- optional capability registrations and frozen literature-route correction
- central packed inventory
- upgrade/reactivation contract
- 229-case frozen aggregate report
- separate 38-case expansion aggregate report
- compatibility and rollback reports
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertion outcomes, output digests, zero-write snapshots, and forbidden-content/package scan evidence

## Acceptance Criteria

- [ ] All 16 packages are live at reviewed versions with no silent omission.
- [ ] Figure, slides, and survey remain explicit/non-default; `research.literature.review` is the literature automatic/default route and `research.literature.scan` is non-default under frozen v1.2; all unrelated default routes are unchanged.
- [ ] Historical schema-v1/v2 records replay and old activations resolve old bytes.
- [ ] The child maps aggregate to exactly 229 passing frozen IDs (including the 3 composition cases and 2 global controls as subsets) and exactly 38 separately reported expansion IDs, with no cross-set overlap, omission, duplicate, or arithmetic double-counting.
- [ ] The cutover manifest and digest are complete, deterministic, and match the registry, route table, validator bindings, bundled/packed inventory, previous bindings, cutover state, and supported rollback targets.
- [ ] Clean pack/install/update/uninstall audits contain no private bodies or active Skill payload, and the execution evidence ledger records the exact tarball digest, scan argv, forbidden paths/patterns, assertions, outputs, and results.
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

# Migrate writing figure and slides methodology

## Goal

Migrate writing methodology plus explicit optional figure and slides workflows with upstream evidence provenance and bounded external visual integration.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Explicit predecessor gate

P2-05 accepted; P2-04 writing/figure/slides and `COMP-003` slices available.

Tree position does not satisfy this dependency. The predecessor's acceptance evidence must exist and pass before this task may start.

## Requirements

- Deepen writing stages for claim/evidence mapping, drafting, display/build, audit, and closure.
- Add figure and slides as explicit non-default methodology using existing writing Quest stage.
- Preserve stable provenance from upstream evidence through display artifacts using explicit sender capability/Dispatch, receiver capability, artifact ID/path/media type, artifact digest, source-evidence IDs, and Procedure digest bindings at writing-to-figure and figure-to-slides boundaries.
- Enforce `COMP-003` slides-to-personal-slides as a bounded adapter without private implementation import or authority transfer.
- Consume P2-01's `methodology-contract-freeze.json` for exact stage/checkpoint fields, types, cardinality, ownership, immutability, transitions, terminal applicability, stable error codes, and fixture obligations.
- Represent unavailable visual adapters as blocked/partial degradation, never successful closure.

## Ownership and exclusions

- Exact paths are frozen in the parent `research/path-ownership-map.md`.
- Exact frozen allocation is `research/differential-case-map.json`: 50 cases, 46 critical, including `COMP-003`; local `research/expansion-case-map.json` adds 7 separately counted provenance and adapter cases.
- Dormant `2.0.0` writing pack and new optional figure/slides packs.
- Writing/visual descriptors, validators, synthetic fixtures, composition report, and family code-spec.
- No optional capability registration, default-route change, or generic composition runtime; P2-03 owns the root-side composition contract/runtime.

Global exclusions: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, private source bodies, generated/installed Research Skills, live model/network/cost execution, and unrelated `.trellis/research/**` state.

## Required evidence

- three dormant Procedure packs
- evidence-to-display provenance validators
- COMP-003 report
- adapter degradation tests
- family DFT report
- populated task-local `research/execution-evidence-ledger.json` with exact commands, assertions, retained-output digests, zero-write snapshots where required, and forbidden-content/path scan evidence

## Acceptance Criteria

- [ ] Figure and slides remain explicit/non-default and reuse the writing stage.
- [ ] No canonical Research authority or private implementation crosses into `personal-slides`.
- [ ] Unavailable adapters cannot produce success and upstream provenance remains stable.
- [ ] Named positive and negative writing-to-figure and figure-to-slides fixtures bind sender, receiver, artifact identity/digest, source evidence, and Procedure digest; wrong sender, missing artifact, or provenance drift fails closed.
- [ ] All 50 frozen IDs and all 7 local expansion IDs pass; expansions remain outside the frozen-229 arithmetic with no overlap or duplicate.
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

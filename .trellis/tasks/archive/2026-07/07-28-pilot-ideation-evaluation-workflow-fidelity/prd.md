# F04 Deep pilot: ideation + idea evaluation

## Goal

Treat `research-ideation`, `research-idea-evaluation`, and `scripts/research_idea_artifact_contract.py` as **one coupled case** with split ownership; score fidelity against F01 rubric and record migration targets for the pair.

## Ownership split

- **Generation** owns stages 01–04.
- **Evaluation** consumes but does not rewrite 01–04; owns stages 05–07.
- Candidate IDs and project-alignment identity remain stable across the full case.
- Source statements and evaluator attacks remain separate evidence channels.

## Predecessor gate

- F01 freeze accepted.
- F02 inventory rows for ideation + evaluation + shared contract script complete.
- F03 at least Stage A inventory for idea validators; Stage B preferred if authorized.
- Explicit F04 activation authorization.

## Deliverables (`research/`)

- `pilot-contract.md`
- `pilot-fixture-manifest.json`
- `pilot-run-ledger.jsonl`
- `pilot-scorecard.json`
- `pilot-findings.md`
- `pilot-migration-targets.json`

## Required cases

- valid selected and valid blocked closure
- missing/incomplete source-boundary evidence
- missing method-flaw audit
- unresolved fatal method flaw
- full-method overlap with non-qualifying delta
- selection without passing finalist
- blocked closure containing selected/handoff artifacts
- selected closure missing experiment handoff
- unconfirmed project pivot
- candidate-ID, root, provenance, or manifest drift
- insufficient candidate mechanism diversity or missing falsification path
- partial/inconclusive evidence
- generation attempting evaluation-owned authority

## Hard pilot invariants

- Closure is exactly selected or blocked.
- Blocked forbids selected-route and experiment-handoff artifacts.
- Selected requires passing finalist, selection artifact, valid alignment, experiment handoff.
- Missing critical evidence and unconfirmed pivots fail closed.
- Source selection semantics **translate** to worker Proposal + root Decision, never direct worker canonical mutation.
- Fresh-context reviewer can reconstruct selected method, evidence boundary, controls, falsifier, kill conditions from case artifacts.

## Out of Scope

- Migrating Procedure bodies
- Live model generation of ideas (use synthetic fixtures; live is F05/exec child)

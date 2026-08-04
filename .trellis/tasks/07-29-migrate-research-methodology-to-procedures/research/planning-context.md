# Phase-2 parent planning context

This task-local research file is the JSONL-injected context for the Phase-2 orchestration parent. External evidence paths are citations to inspect on demand, not cross-task manifest entries.

## Authoritative pins

- Methodology contract: `evaluation-contract-v1.2.0`
- Methodology digest: `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Private source evidence commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c` (read-only evidence only)
- Trellis implementation base: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

## Local planning inputs

- `research/path-ownership-map.md`
- `research/differential-case-allocation.json`
- `research/independent-review-remediation.md`

## External evidence citations

- `.trellis/research/phase-2-pins.md`
- `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/frozen-migration-target-v1.2.json`
- `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/normalized-workflow-inventory-v1.2.json`
- `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/differential-test-matrix-v1.2.json`
- `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/research/phase2-improve-register-v1.2.json`

## Authority and privacy boundary

- Workers remain Result plus pending Proposal only; root owns validation, Dispatch authorization, Proposal decisions, and canonical mutation.
- Do not restore Research Skill discovery, generation, payload, or execution.
- Do not copy private workflow bodies, validators, tests, prompts, cases, or raw outputs.
- Planning does not authorize task activation, production edits, live calls, commits, archives, publication, release, or push.

## Manifest rule

Only `.trellis/spec/**` and this task's own `research/**` paths may appear in its JSONL manifests. Code and external evidence are read on demand.

## Attempt-2 forward repair (2026-08-04)

- P0 commit: `867954ae` (V13-B attempt-1 verdict fail preserved)
- Failed compound: `4d36ecda` (immutable)
- Baseline: `a198b4f3`
- Portable C0 attempt-2 locks under this research/ directory
- Children: `08-04-author-evaluation-contract-v1-3-attempt-2`, `08-04-assure-evaluation-contract-v1-3-attempt-2`
- R2A blocked until attempt-2 assurance pass

## MAL-1 attempt-3 (2026-08-04)

- Incident: `08-04-amend-v13-machine-assurance-governance/research/v13-incident-disposition-attempt-2.json`
- MAL-1 contract under same research/
- Children: contain, A3, B3, OA3, remediate-runtime, remediate-harness, integrate-dormant, CS3, CS3-OA

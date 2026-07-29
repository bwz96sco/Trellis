# Phase-2 pins (authoritative after Phase-1 closeout)

| Pin | Value |
|-----|--------|
| methodology_contract | evaluation-contract-v1.2.0 |
| methodology_digest | 57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb |
| source_skills_commit | 9a02a533f5f3ecfd0c0789a01588fc492d321d6c |
| infra_pin_commit | ccd5bb3afc99283252c599916a2b8c2e05075cc6 |
| branch | variant/research-workflow |
| gate | pass |

## Evidence location (archived)

- `.trellis/tasks/archive/2026-07/07-28-evaluate-research-workflow-fidelity/`
- `.trellis/tasks/archive/2026-07/07-29-close-phase1-fidelity-pass-gate/`
- `.trellis/tasks/archive/2026-07/07-23-replace-research-skills-with-trellis-procedures/` (+ C08–C10 children)

## Next

Create a **new Phase-2 parent task** that cites:

1. `methodology_digest` = `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
2. `infra_pin_commit` = `ccd5bb3afc99283252c599916a2b8c2e05075cc6`

Do not re-open Phase-1 evaluation or re-pin to private skills HEAD.

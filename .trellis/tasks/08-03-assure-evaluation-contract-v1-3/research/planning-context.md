# V13-B planning context

## Identity and pins

- Child ID/path: `assure-evaluation-contract-v1-3` / `.trellis/tasks/08-03-assure-evaluation-contract-v1-3`
- Parent: `.trellis/tasks/07-29-migrate-research-methodology-to-procedures`
- Predecessor: exact immutable V13-A authoring commit from `.trellis/tasks/08-03-author-evaluation-contract-v1-3`
- Active methodology: `evaluation-contract-v1.2.0` / `57d1956bf4453b497cce0e288c95d7194491ddac611570e8e0c8c0aefb7516bb`
- Proposed methodology: `evaluation-contract-v1.3.0` / exact digest supplied only by immutable V13-A input
- Infrastructure reference: `ccd5bb3afc99283252c599916a2b8c2e05075cc6`
- Wave-8 audit: parent `research/wave8-r2a-frozen-v1.2-evidence-gap-audit.md` / `d4415b8cec1e1e8e66ed20ce7416a6969e441a266f5256cbafb579b8d5af0933`

## Assurance boundary

V13-B is mechanically independent, read-only assurance. It consumes exact immutable commit/digest inputs, independently recomputes schema/digest/provenance/coverage/closure/validator/privacy/mutation results, and emits only the exact allowlist in `assurance-plan-v1.3.json`.

R0 is addressability/planning evidence only. R1 mechanics are non-authoritative comparison inputs. Candidate and production repair is forbidden. Failure returns to a new V13-A authoring commit/digest and complete rerun.

Cross-task/archive evidence is inspected on demand and is not listed in this task's JSONL manifests. Private Skill bodies and related private content must not be inspected or transmitted.

Live selection remains Procedure `1.0.0`; Procedure `2.0.3` remains the forward repair version. Planning/assurance grants no assurance commit, runtime/test/Procedure work, activation, package lifecycle, archive, release, publication, push, network, model, or provider authority.

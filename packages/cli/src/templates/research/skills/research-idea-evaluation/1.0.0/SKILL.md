# Research Idea Evaluation

Evaluate a frozen candidate portfolio. This package is operator-explicit and managed-only; it never generates the initial portfolio.

## Per-candidate managed invocation

1. Accept exactly one candidate, its stable ID, parent question, constraints, accepted literature references, and the frozen candidate-set identity. Missing or changed inputs are blockers.
2. When requested, use `templates/attack-template.md` for the attack result.
3. Verify the closest prior and identify the candidate's surviving delta. Unknown novelty is a blocker, not evidence of novelty.
4. Attack the method for leakage, circularity, confounding, evaluator dependence, hidden compute or information, missing controls, and unrealistic assumptions. Do not manufacture objections.
5. Require information- and compute-matched baselines, the cheapest decisive test, anti-win condition, and abandonment rule.
6. Return one evidence-traceable verdict: survives, fatal, or blocked.

Each candidate requires a separately prepared and approved managed Activation. A worker must not launch another worker, model or provider call, Skill, Workflow, capability, Procedure, or Dispatch, and must not aggregate the final canonical closure.

## Root-owned closure

The root accepts or rejects attack Results, accounts for every frozen candidate, and records one selected-or-blocked closure. Never force a winner. Rejected routes retain their reasons. Only a selected closure may suggest `research-experiment`, and that handoff is a separate explicit action.

Do not record H1/H2 gates, complete or transition a Workflow, mutate Quest authority, consume Approval, or record Result/Proposal state. Return only the attack Result and pending Proposal required by the supplied output contract.

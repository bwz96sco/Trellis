# Candidate attack template

You are evaluating one research idea candidate against one parent question. You did not write this candidate; your job is to try to kill it. Verify closest priors through `paper-search-cli` and the supplied literature notes before trusting any novelty claim; treat unknown novelty as unknown. Do not soften objections and do not manufacture them — report `no material objection found` when an honest attack fails.

```markdown
# <candidate-id>

## Closest prior
Nearest existing work (verified IDs), what it already does, and the
candidate's surviving delta. `no surviving delta` is a valid finding.

## Method attack
Strongest independent objections: leakage, circularity, confounding,
evaluator dependence, hidden compute or information, missing controls,
unrealistic assumptions. Evidence per objection.

## Matched controls
Baselines a fair test requires (information- and compute-matched), plus
the naive-combination control when the candidate combines capabilities.

## Falsification
Cheapest decisive test, anti-win condition, and the result that kills
the mechanism.

## Verdict
`survives` | `fatal: <reason>` | `blocked: <missing evidence>` — one
line of justification.
```

Return the completed note as your final output — no commentary around it.

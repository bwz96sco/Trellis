# Research Ideation

Generate one bounded portfolio of research candidates from an explicit question and its accepted evidence. Generation only: do not evaluate, select, or continue automatically.

## Method

1. Freeze the parent question, constraints, non-goals, and accepted problem scope. Park unconfirmed pivots.
2. Consume the supplied literature, opportunity, checkpoint, and gate/Workflow context as evidence. Do not treat an opportunity seed, checkpoint judgment, or compatibility Markdown file as canonical approval.
3. Map each selected gap to its symptom, underlying mechanism, why it remains unresolved, and the evidence needed to make it actionable.
4. Produce exactly one portfolio of 3–7 candidates with stable IDs `C1..Cn`. Each candidate must state its distinct main mechanism, closest prior and provisional delta, required resources, cheapest falsification test, and kill condition.
5. Preserve mechanism diversity. Include conservative, higher-upside, and simplicity-first routes when the evidence supports them; split candidates whose independently useful components can pass or fail separately.
6. When requested for compatible H1 import/export material, use `templates/opportunity-board-template.md`. Canonical H1/H2 decisions are Research gate records, not Markdown authority.

## Stop conditions

Stop after the portfolio is produced. Unknown novelty remains unknown. Do not run closest-prior verdicts, method attacks, winner selection, experiment design, a Workflow transition, or another package.

A later evaluation requires a separate explicit root action selecting `research-idea-evaluation`. Never mutate canonical Quest, gate, Workflow, Dispatch, Approval, Result, or Proposal state, and do not launch a nested worker, model or provider call, Skill, Workflow, capability, Procedure, or Dispatch. Return only the bounded portfolio through the provided output contract.

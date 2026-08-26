# Quest-governed H1 opportunity board template

Use only when the current campaign is explicitly linked to a research quest.

```markdown
---
target_question: "<verbatim target>"
source_opportunity_index: "<relative path | none>"
active_checkpoint: "<relative path | none>"
checkpoint_problem_cap: "<positive integer | none>"
---

# Opportunity Board

## Opportunity Board

| ID | Type | Title | Checkpoint item | Checkpoint disposition | Evidence | Contributing seeds | Key assets |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | problem | <title> | CP1 / new | retain / hold / reject / new | <anchors> | O-... / none | <assets> |
| B1 | bridge | <title> | n/a | n/a | <mechanism basis> | O-... | <assets> |

## Checkpoint reconciliation

| Checkpoint item | Prior disposition | Board treatment | Evidence or reason |
| --- | --- | --- | --- |
| CP1 | retain / hold / reject | proposed as P1 / deferred / retired | <anchored evidence or reopening basis> |

Account for every active checkpoint item. A held or rejected item proposed as a
P row remains an override until the human explicitly approves that override.

## Human selection constraint

- Problem selection cap: <positive integer | none>
- Approving more problems or reopening held/rejected items requires explicit human wording.
```

H1 decisions use:

```markdown
---
decision_status: approved
decision_recorded_by: human_confirmed
decision_basis: opportunity_board.md
approved_problem_ids: P1,P2
approved_bridge_ids: B1,B2
checkpoint_override: none
checkpoint_override_reason: none
---

## Human Decision

<verbatim wording>

## Override Rationale

<verbatim override wording | none>
```

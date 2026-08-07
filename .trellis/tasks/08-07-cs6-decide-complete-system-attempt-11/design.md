# CS6-8 operator-decision design

## Boundary

This is a human/operator input recording surface, not an assurance or activation mechanism.

## Input/output model

Input is one explicit operator instruction plus exact committed M11 identity. Output is one canonical JSON record containing decision, rationale, evidence references, and explicit authority denials.

## Decision semantics

- `accept-with-rationale` accepts the machine-assured complete-system evidence for the stated scope only.
- `reject-with-rationale` rejects it and records why.
- `stop` ends the campaign without acceptance.

None changes live selection or authorizes another lifecycle action.

## Rollback

Before commit, remove only the uncommitted decision file. After commit, corrections require a new additive operator record; do not amend the historical decision.

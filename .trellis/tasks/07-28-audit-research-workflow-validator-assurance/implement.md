# Implement — F03

## Stage A — Static inventory (may run after F01 with activation auth)

1. List validators from F02 + known scripts (`validate-research-skills.py`, per-skill `scripts/validate_artifacts.py`, `research_idea_artifact_contract.py`).
2. Build inventory and fixture-manifest (hashes only).
3. Design mutation-catalog.

## Stage B — Execution (separate authorization required)

1. Create isolated sandbox; copy fixtures.
2. Run each fixture twice; record ledger.
3. Apply mutations; expect reject for critical cases.
4. Write assurance report; map misses to improve/unresolved IDs.

## Stop without Stage B auth

Deliver Stage A only + explicit `execution-not-authorized.md` note if needed; F06 must treat Stage B as incomplete unless waived.

## Validation

```bash
python3 ./.trellis/scripts/task.py validate 07-28-audit-research-workflow-validator-assurance
```

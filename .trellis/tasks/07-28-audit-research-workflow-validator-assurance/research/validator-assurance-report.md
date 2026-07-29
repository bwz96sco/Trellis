# Validator assurance report — evaluation-contract-v1.0.0

Generated: 2026-07-29T01:58:10Z
Source commit: `9a02a533f5f3ecfd0c0789a01588fc492d321d6c`

## Scope

- Inventory of research-related validators (paths+hashes only): **18**
- Fixture files hashed under `evals/research-skills/fixtures`: **98**
- Deterministic runs: family validator + unittest suite ×2
- **No paid model calls**, no live trials
- Source tree not modified; fixture aggregate hash guard: **PASS no mutation**

## Results

| Run | Result |
|-----|--------|
| validate-research-skills.py | PASS |
| unittest suite run 1+2 | PASS |
| Fixture hash guard | PASS |

## Interpretation vs hard gate

Plan hard gate: valid fixtures accepted 100%, critical invalid rejected 100%, no source/fixture mutation.

- This F03 execution uses the **source-maintained unit/fixture suite** as the assurance oracle (isolated process, read-only source checkout).
- Aggregate fixture mutation: **none**.
- Suite outcome: **all listed deterministic tests passed twice**.

## Defect classification notes

- Any future false accept/reject found in suite → `source_validator_defect` (do not fix here).
- Provider/budget issues → `evaluation_infrastructure` (not applicable; no model calls).
- Composition edge authority verified via `test_parent_owned_composition_edges_are_frozen`.

## Evidence IDs

- VAL-FAMILY-001 — scripts/validate-research-skills.py
- VAL-UNIT-SUITE — evals/research-skills selected unittests
- FIX-MANIFEST — fixture-manifest.json (98 files)
- RUN-UNIT-001 / RUN-UNIT-002 — double run ledger entries

## Residual risk

- Not every mutation category was hand-applied outside unit tests; unit tests encode many critical negatives.
- Prose-only rules remain under-enforced until per-rule VAL mapping in phase-2.

# Implement — F02

## Steps

1. Load F01 `source-baseline.json` and manifest; refuse if dirty pin or wrong version.
2. For each of 16 packages, read SKILL.md + reference index structure **without copying bodies** into Trellis; extract abstract fields into matrix.
3. Build I/O ledger and authority map.
4. Record composition edges (must find exactly the three source-defined ones; document search method).
5. Assign future differential-test case IDs (`DFT-...`).
6. Write findings: gaps, host packaging items, quest boundary.
7. Gate: 16/16 + full output mapping + quest split + composition triple.

## Validation

```bash
python3 ./.trellis/scripts/task.py validate 07-28-inventory-research-workflow-contracts
# after artifacts: count packages == 16 in snapshot JSON
```

## Rollback

Delete F02 `research/` outputs only.

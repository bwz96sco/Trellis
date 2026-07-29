# Implement — F07

1. Coverage audit against F02 + F06 ledger.
2. Privacy audit: scan tracked evaluation artifacts for private body leakage patterns; confirm policy compliance.
3. Evidence integrity: recompute frozen target sha256; verify F01 freeze predates scores.
4. Write independent-review.md and gate-recommendation.md.
5. Parent session writes evaluation-index.json + predecessor-gate-verdict.md (parent-owned).
6. Do not start methodology implementation unless pass or user accepts every conditional item.

```bash
python3 ./.trellis/scripts/task.py validate 07-28-review-research-workflow-evaluation-gate
python3 ./.trellis/scripts/task.py validate 07-28-evaluate-research-workflow-fidelity
```

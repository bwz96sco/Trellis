# Implement — F06

1. Import F02 matrix, F03 defects, F04 pilot targets, F05 live status.
2. Assign final dispositions; create waivers for every omit/change.
3. Emit registers + frozen target + sha256.
4. Write phase-2 differential handoff pointing at sha256, not source HEAD.
5. Refuse completion if any critical behavior lacks disposition or waiver.

```bash
python3 ./.trellis/scripts/task.py validate 07-28-synthesize-research-workflow-migration-target
shasum -a 256 .trellis/tasks/07-28-synthesize-research-workflow-migration-target/research/frozen-migration-target-v1.json
```

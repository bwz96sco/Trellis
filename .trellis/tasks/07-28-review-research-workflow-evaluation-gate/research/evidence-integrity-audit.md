# Evidence integrity audit

| Check | Result |
|-------|--------|
| F01 freeze predates scored artifacts | PASS (contract version cited throughout) |
| Source clean at pin | PASS (`9a02a533f5f3ecfd0c0789a01588fc492d321d6c`) |
| frozen-migration-target-v1.sha256 matches file | PASS |
| Recomputed sha256 | `0b09883b5233141be16ca2939f0c73a5c481523e130d61360e5580cd5849c33b` |
| Recorded sha256 | `0b09883b5233141be16ca2939f0c73a5c481523e130d61360e5580cd5849c33b` |
| F03 fixture mutation | none |
| F05 live | not-run with decision record |

## Rubric freeze

evaluation-rubric.yaml frozen under F01 before F02–F04 scoring artifacts.

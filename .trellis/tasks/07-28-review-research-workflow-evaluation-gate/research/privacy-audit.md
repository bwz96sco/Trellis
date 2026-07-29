# Privacy audit (corrected)

Corrected at: 2026-07-29T02:02:12Z

Prior false positive: `source-file-manifest.json` matched a naive "SKILL.md path + line count" heuristic. That file is **path+sha256 inventory only**, which is allowed by the privacy policy.

## Rescan results

- Leakage indicators after refined rules: **0**
- Allowed large manifests: source-file-manifest, fixture-manifest, evaluation-index, run ledgers (hashes/aggregates)
- Live trial raw data: none (not run)
- Source repo: read-only

No leakage indicators found.

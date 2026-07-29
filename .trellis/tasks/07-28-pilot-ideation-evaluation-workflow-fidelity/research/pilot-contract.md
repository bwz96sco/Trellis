# Pilot contract — ideation + idea evaluation

evaluation_contract_version: evaluation-contract-v1.0.0
frozen_at: 2026-07-29T02:00:10Z
source_commit: 9a02a533f5f3ecfd0c0789a01588fc492d321d6c
trellis_commit: b445d4245b81afa14006c864229811c227e12e71

## Coupled ownership

| Owner | Stages / artifacts |
|-------|-------------------|
| research-ideation | 01–04 generation pack |
| research-idea-evaluation | consume 01–04 (no rewrite); own 05–07 |
| scripts/research_idea_artifact_contract.py | shared durable contract |

## Hard invariants

1. Closure exactly selected or blocked.
2. Blocked forbids selected-route and experiment-handoff artifacts.
3. Selected requires passing finalist, selection artifact, valid alignment, experiment handoff.
4. Missing critical evidence and unconfirmed pivots fail closed.
5. Source selection translates to Trellis worker Proposal + root Decision (never worker canonical mutation).
6. Fresh-context reviewer can reconstruct method, boundary, controls, falsifier, kill conditions from pack artifacts.

## Trellis gap baseline

| Surface | Source | Trellis |
|---------|--------|---------|
| Generation method body | multi-file refs+validators (19 refs) | idea-generation-v1 PROCEDURE.md (1037 bytes) |
| Evaluation method body | multi-file refs+validators (20 refs) | idea-evaluation-v1 PROCEDURE.md (1091 bytes) |
| Shared pack validator | research_idea_artifact_contract + package validators | none in Procedure pack |
| Select/block closure | explicit pack outcomes | Proposal-only ranking prose |

## Privacy

No private bodies stored; structure via filenames/hashes and suite outcomes only.

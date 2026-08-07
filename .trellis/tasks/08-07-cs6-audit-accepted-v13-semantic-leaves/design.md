# CS6-1 semantic-leaf audit design

## Boundary

This is a read-only semantic assurance step over seven exact accepted leaves. It separates contract correctness from implementation conformance.

## Input model

Inputs are resolved from the accepted A3 task at the exact committed baseline and authenticated against the CS5 accepted-member ledger. The audit must not substitute packaged copies or runtime-derived projections for the authoritative leaves.

## Audit model

1. Byte and aggregate authentication.
2. Per-leaf schema and invariant checks.
3. Cross-leaf referential-integrity checks.
4. Coverage reconciliation for 64 outputs, 13 lifecycle dimensions, 20 validators, 876 bindings, closure families, provenance, and differential cases.
5. Independent semantic challenge against public/Trellis-native authority.
6. One fail-closed disposition.

A finding is classified as either an implementation-conformance defect, which permits later CS6 work, or an accepted-contract defect, which stops the campaign. Ambiguous findings are contract defects until separately resolved.

## Outputs

Task-local deterministic JSON evidence plus one disposition. No accepted leaf is rewritten, normalized, or regenerated in place.

## Rollback

Before commit, remove only task-local audit outputs and rerun from exact inputs. After commit, a changed audit requires a new forward audit identity; do not amend the accepted evidence history.

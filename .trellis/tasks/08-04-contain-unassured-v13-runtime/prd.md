# Q0/Q1 — Contain unassured A2/2.0.3 runtime authority

## Goal

Strip A2 digests and Procedure 2.0.3 from accepted-authority paths; stop report-v2 for live 1.0.0 and historical 2.0.2; fail-closed unknown combos; preserve live v1.

## Notes

Requires separate activation then implementation commits. Does not rewrite committed 2.0.3 package bytes.

## Boundaries

- Forward-only; no history rewrite.
- No activation/release/push.
- Workers Proposal-only.
- Unrelated dirty paths preserved.

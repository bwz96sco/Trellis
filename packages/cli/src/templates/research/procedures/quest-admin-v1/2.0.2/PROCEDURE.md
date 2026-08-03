# quest-admin-v1 methodology (v2.0.2 repair)

## Purpose

Trellis-native repaired methodology package for `quest-admin-v1` under evaluation-contract-v1.2.0.
Deepened against frozen projection without private Skill body copy.

## Authority

Worker is **Proposal-only**. Do not mutate canonical Research state, launch Dispatches, chain capabilities, use network, or write outside allowed paths.

## Ordered checkpoints

1. **01-plan-change** — complete with declared inputs/outputs; fail closed on missing critical evidence.
2. **02-apply-event** — complete with declared inputs/outputs; fail closed on missing critical evidence.

## Outputs

Return exactly one Result and one pending Proposal.

## Stop conditions

Stop on missing critical evidence, provenance/ID drift, forbidden mutation, invalid handoff/composition, invalid selected XOR blocked closure, or unconfirmed pivots.

## Support pack

Authoritative methodology files are only those enumerated in `methodology/pack.json` and bound into the Procedure digest.

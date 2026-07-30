# theory-case-v1 methodology (v2)

## Purpose

Trellis-native methodology package for `theory-case-v1` migrated under Phase-2 from frozen evaluation-contract-v1.2.0 contracts.

## Authority

Worker is **Proposal-only**. Do not mutate canonical Research state, launch Dispatches, chain capabilities, use network, or write outside allowed paths.

Closure outcomes (select/block/claim promotion) are expressed as Result + pending Proposal for root Decision.

## Ordered checkpoints

1. **01-claim** — complete checkpoint with declared inputs/outputs and fail closed on missing critical evidence.
2. **02-argument** — complete checkpoint with declared inputs/outputs and fail closed on missing critical evidence.
3. **03-bound** — complete checkpoint with declared inputs/outputs and fail closed on missing critical evidence.

## Outputs

Return exactly one Result and one pending Proposal. Prefer durable artifact paths declared in the methodology pack when durable mode is authorized.

## Stop conditions

Stop on missing critical evidence, provenance/ID drift, forbidden mutation, invalid handoff/composition, or unconfirmed pivots.

## Support pack

Authoritative methodology files are only those enumerated in `methodology/pack.json` and bound into the Procedure digest.

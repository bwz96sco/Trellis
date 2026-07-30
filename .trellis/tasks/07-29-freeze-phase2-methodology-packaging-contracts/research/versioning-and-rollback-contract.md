# Versioning and rollback contract

## Adding methodology packages

- Ship as new version directory (e.g. `2.0.0`), never mutate historical `1.0.0` bytes.
- Registry current pointer changes only in P2-12 atomic cutover with digest-bound cutover manifest.

## Historical activations

- Always resolve via activation-recorded mode to the exact id/version/digest.
- Registry current-version switch must not change old activation validation bytes.

## Rollback

| Layer | Rollback |
|-------|----------|
| P2-01 contracts | revise planning freeze before P2-02; no runtime |
| P2-02 additive v2 | remove additive modules; v1 remains byte-identical |
| Family 2.0.0 packs | leave dormant until P2-12; delete unused dormant packs if abandoned before cutover |
| P2-12 cutover | restore registry/inventory from cutover manifest previous digests after reviewed decision |

Post-activation production rollback requires separate reviewed decision (not authorized by guide approval alone).

## Failure taxonomy

- `METHODOLOGY_CONTRACT_VIOLATION`
- `SUPPORT_PACK_INTEGRITY`
- `HISTORICAL_DIGEST_MISMATCH`
- `VALIDATOR_CRITICAL_FAIL`
- `COMPOSITION_BOUNDARY`
- `PRIVACY_BOUNDARY`

# Ideation closure disposition

## Question

Are ideation `selected` fixtures shared-couple closure checks?

## Disposition (freeze)

**Yes — shared-couple boundary checks**, not generation-only ownership of selection.

| Owner | Stages | Closure role |
|-------|--------|--------------|
| research-ideation / idea-generation-v1@2.0.0 | 01–04 | must **not** produce selected/blocked evaluation closure; generation-owned pack only |
| research-idea-evaluation / idea-evaluation-v1@2.0.0 | 05–07 | exclusive selected XOR blocked closure; consumes 01–04 without rewrite |

### Fixture interpretation

- `DFT-*-outcome-selected` and `DFT-*-closure-exclusivity` on **evaluation** are evaluation-owned critical negatives/positives.
- Ideation `selected` mentions in inventory terminals for other packages do not authorize generation to emit evaluation closure artifacts.
- Couple-level improve validators (IMP-IDEA-*) are dual-owned test surface but implementation owner remains P2-05.

## v1.2 compatibility

This disposition **does not** change v1.2 methodology digest semantics; it clarifies ownership for Phase-2 implementation. No v1.3 required.

# P2-01 design — Freeze Phase-2 methodology packaging contracts

## Boundary

Freeze the support-pack, trusted-runtime, compatibility, ownership, package-allocation, and rollback contracts that every implementation child must follow.

This child follows the parent hybrid architecture: enumerated digest-bound support packs carry methodology data; versioned trusted Trellis runtime code parses, validates, reports, and enforces authority. Workers never discover pack files or execute validators.

## Predecessor

Phase-1 v1.2 predecessor gate `pass` and infrastructure pin only.

The task must verify predecessor evidence directly; parent/child ordering is not dependency enforcement.

## Owned surfaces

- Parent planning inputs: `research/path-ownership-map.md`, `research/differential-case-allocation.json`, and `research/phase2-expansion-case-allocation.json`.
- Child-owned `research/` frozen contract and attestation artifacts only.
- No production source, test, Procedure template, specification, registry, or runtime edits.

GitNexus impact is inapplicable while this boundary remains unchanged because no existing code symbol may be edited.

## Contract and data flow

```text
pinned v1.2 contract slice
  -> child-owned Trellis-native package/runtime/test implementation
  -> deterministic focused validation
  -> frozen DFT/COMP/CTRL slice report
  -> independent review
  -> accepted dormant deliverable or reviewed integration result
```

All worker recommendations remain Result plus pending Proposal. Root-side trusted validation and root-owned Decision remain the only closure/mutation path.

The freeze emits `methodology-contract-freeze.json`. Its contract subjects are ordered stages when v1.2 defines stages and named artifact-lifecycle checkpoints when it does not. Each subject enumerates fields, types, requiredness, cardinality, producer/consumer ownership, immutable fields, transition/terminal rules, stable error codes, and fixture obligations. Generic presence/provenance cases cannot substitute for this matrix.

## Compatibility

- Existing Procedure `1.0.0` bytes and schema-v1 digest behavior remain unchanged unless this task is P2-12 and the explicit cutover contract applies.
- Existing schema-v1 Research events and schema-v2 activation/approval events remain replayable.
- Existing activations resolve their recorded Procedure ID/version/digest and do not inherit newer methodology.
- Present-invalid project overrides fail closed and never fall back.
- Optional figure, slides, and survey capabilities remain explicit/non-default.
- Frozen v1.2 intentionally changes the current literature default: literature review becomes automatic/default and literature scan becomes non-default at P2-12 cutover. Any alternative requires a reviewed v1.3+ contract.

## Privacy

Only Trellis-native implementations, abstract contracts, approved evidence IDs/digests, and synthetic fixtures may be tracked. Private source bodies and raw evidence remain outside Trellis.

## Rollback

Revise planning contracts before P2-02 starts; there is no runtime rollback because this child owns no production changes.

## Deferred risk

The Phase-1 live-trial waiver permits deterministic planning/implementation evidence only. This child must not claim live host/model equivalence.

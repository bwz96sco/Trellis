# P2-10 design — Migrate review methodology

## Boundary

Migrate review case and campaign methodology with traceable claims/evidence, evaluator attacks, findings/adjudication separation, and bounded composition.

This child follows the parent hybrid architecture: enumerated digest-bound support packs carry methodology data; versioned trusted Trellis runtime code parses, validates, reports, and enforces authority. Workers never discover pack files or execute validators.

## Predecessor

P2-05 accepted; P2-04 review and `COMP-002` slices available.

The task must verify predecessor evidence directly; parent/child ordering is not dependency enforcement.

## Owned surfaces

- Dormant next-version review-case and review-campaign packs.
- Review descriptors, validators, synthetic fixtures, local `research/expansion-case-map.json`, composition report, and family code-spec.
- No central Decision or composition runtime ownership.

Before editing any existing function, class, or method, run GitNexus upstream impact analysis. HIGH or CRITICAL impact requires warning and confirmation before edits.

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

Review-case is the sole initial writer of each case artifact. The campaign receives immutable digest-bound case evidence through root-materialized contained Context inputs, never sibling `..` traversal, and writes only campaign aggregates. Immutable-field rewrites and same-ID/different-digest conflicts fail closed. The six local expansions prove this ownership model plus a valid `COMP-002` execution, failure/cancellation, and rollback.

## Compatibility

- Existing Procedure `1.0.0` bytes and schema-v1 digest behavior remain unchanged unless this task is P2-12 and the explicit cutover contract applies.
- Existing schema-v1 Research events and schema-v2 activation/approval events remain replayable.
- Existing activations resolve their recorded Procedure ID/version/digest and do not inherit newer methodology.
- Present-invalid project overrides fail closed and never fall back.
- Optional figure, slides, and survey capabilities remain explicit/non-default.

## Privacy

Only Trellis-native implementations, abstract contracts, approved evidence IDs/digests, and synthetic fixtures may be tracked. Private source bodies and raw evidence remain outside Trellis.

## Rollback

Remove/revert only dormant review versions, validators, fixtures, composition evidence, and family spec.

## Deferred risk

The Phase-1 live-trial waiver permits deterministic planning/implementation evidence only. This child must not claim live host/model equivalence.

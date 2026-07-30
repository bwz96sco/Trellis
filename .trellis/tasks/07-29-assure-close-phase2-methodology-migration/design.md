# P2-13 design — Assure and close Phase-2 methodology migration

## Boundary

Independently verify complete methodology coverage, authority, compatibility, packaging, rollback, and dirty-path isolation before recommending parent acceptance.

This child follows the parent hybrid architecture: enumerated digest-bound support packs carry methodology data; versioned trusted Trellis runtime code parses, validates, reports, and enforces authority. Workers never discover pack files or execute validators.

## Predecessor

P2-12 accepted with frozen implementation, aggregate reports, package evidence, and rollback rehearsal inputs.

The task must verify every predecessor input enumerated in `research/assurance-plan.json` directly; parent/child ordering is expected sequencing, not dependency enforcement or a planning defect.

## Owned surfaces

- Exact assurance paths frozen in the parent `research/path-ownership-map.md`.
- Child-owned independent review, coverage, compatibility, rollback, package, privacy, and acceptance reports only.
- No production source, test, Procedure, registry, specification, or package edits.
- Reviewer identity must differ mechanically from the recorded P2-12 implementer before activation.

GitNexus impact is read-only assurance here; P2-13 cannot edit existing code symbols.

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

Before activation, assurance mechanically compares the P2-12 implementer identity and P2-13 reviewer identity and emits `reviewer-independence.json`; absent or equal values fail closed. Inputs and outputs are exactly those listed in `research/assurance-plan.json`. Frozen-229 and expansion-38 coverage are audited separately. Rollback evidence has two distinct vectors: pre-activation atomic reversion, and post-activation future-selection registry rollback while historical activation bindings remain unchanged.

## Compatibility

- Existing Procedure `1.0.0` bytes and schema-v1 digest behavior remain unchanged unless this task is P2-12 and the explicit cutover contract applies.
- Existing schema-v1 Research events and schema-v2 activation/approval events remain replayable.
- Existing activations resolve their recorded Procedure ID/version/digest and do not inherit newer methodology.
- Present-invalid project overrides fail closed and never fall back.
- Optional figure, slides, and survey capabilities remain explicit/non-default.

## Privacy

Only Trellis-native implementations, abstract contracts, approved evidence IDs/digests, and synthetic fixtures may be tracked. Private source bodies and raw evidence remain outside Trellis.

## Rollback

No production rollback. Reopen the owning child for defects; do not expand P2-13 ownership.

## Deferred risk

The Phase-1 live-trial waiver permits deterministic planning/implementation evidence only. This child must not claim live host/model equivalence.

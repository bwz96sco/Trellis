# P2-09 design — Migrate computation and theory methodology

## Boundary

Migrate computation and theory methodology with durable inputs, assumptions, derivations, proof/analysis obligations, uncertainty, and explicit terminal states.

This child follows the parent hybrid architecture: enumerated digest-bound support packs carry methodology data; versioned trusted Trellis runtime code parses, validates, reports, and enforces authority. Workers never discover pack files or execute validators.

## Predecessor

P2-05 accepted; P2-04 computation/theory slices available.

The task must verify predecessor evidence directly; parent/child ordering is not dependency enforcement.

## Owned surfaces

- Dormant next-version computation and theory packs.
- Computation/theory descriptors, validators, synthetic fixtures, local `research/expansion-case-map.json`, and family code-spec.
- No other analytical family or central runtime files.

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

Field-depth enforcement consumes P2-01's machine-readable freeze. Computation is validated through named artifact-lifecycle checkpoints because v1.2 does not define canonical ordered stages for that package; theory retains its frozen stages. Each field has exact type, cardinality, ownership, immutability, transition, terminal, error-code, and fixture obligations.

## Compatibility

- Existing Procedure `1.0.0` bytes and schema-v1 digest behavior remain unchanged unless this task is P2-12 and the explicit cutover contract applies.
- Existing schema-v1 Research events and schema-v2 activation/approval events remain replayable.
- Existing activations resolve their recorded Procedure ID/version/digest and do not inherit newer methodology.
- Present-invalid project overrides fail closed and never fall back.
- Optional figure, slides, and survey capabilities remain explicit/non-default.

## Privacy

Only Trellis-native implementations, abstract contracts, approved evidence IDs/digests, and synthetic fixtures may be tracked. Private source bodies and raw evidence remain outside Trellis.

## Rollback

Remove/revert only dormant computation/theory versions, validators, fixtures, and family spec.

## Deferred risk

The Phase-1 live-trial waiver permits deterministic planning/implementation evidence only. This child must not claim live host/model equivalence.
